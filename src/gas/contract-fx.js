'use strict';

/**
 * Nilai kontrak campuran mata uang (IDR + USD + CNY + CNH), 22 Nov 2026.
 *
 * - Komponen disimpan di tabel contract_fx (src/lib/fx.js, API src/routes/fx.js); kurs bulanan di fx_rates.
 * - Kode lama membaca nilai kontrak lewat contractIdr_(db, pid, 'YYYY-MM'):
 *     tanpa komponen valas → nilai NILAI_KONTRAK di DATA BULANAN (seperti sebelumnya);
 *     dengan valas → IDR + Σ valas × kurs bulan itu (bulan cut-off di laporan bulanan, kurs terbaru di Weekly).
 * - Di Tambah/Edit Proyek dan Addendum ada isian per mata uang; nilai kontrak (Rupiah) dihitung otomatis
 *   dan tetap disimpan ke NILAI_KONTRAK (kurs saat disimpan) supaya data lama/Google Sheet tetap terisi.
 */

const FX_GS = String.raw`
function fxSnap_() { try { return __bridge.fx ? __bridge.fx() : { rates: {}, contracts: {} }; } catch (e) { return { rates: {}, contracts: {} }; } }
function fxRateFor_(S, month) {
  const R = S.rates || {};
  if (month && R[month] && (R[month].usd || R[month].cny)) return Object.assign({ month: month }, R[month]);
  const keys = Object.keys(R).filter(function(k) { return R[k] && (R[k].usd || R[k].cny); }).sort();
  const pick = month ? (keys.filter(function(k) { return k <= month; }).pop() || keys[0]) : keys.pop();
  return pick ? Object.assign({ month: pick }, R[pick]) : null;
}
/** Nilai kontrak dalam Rupiah pada kurs bulan 'YYYY-MM' ('' = kurs terbaru). */
function contractIdr_(db, pid, month) {
  const raw = monthlyValue_(db, pid, 'NILAI_KONTRAK');
  const S = fxSnap_(), c = (S.contracts || {})[pid];
  if (!c || !(c.usd || c.cny || c.cnh)) return raw;
  const r = fxRateFor_(S, month || '');
  if (!r) return raw;
  return (c.idr || 0) + (c.usd || 0) * (r.usd || 0) + (c.cny || 0) * (r.cny || 0) + (c.cnh || 0) * (r.cnh || r.cny || 0);
}
/** Teks rincian untuk tampilan, mis. "USD 8,2 jt + CNY 12 jt + Rp 98,00 M · kurs 21 Nov 2026". */
function contractFxNote_(pid, month) {
  const S = fxSnap_(), c = (S.contracts || {})[pid];
  if (!c || !(c.usd || c.cny || c.cnh)) return '';
  const r = fxRateFor_(S, month || '');
  const f = function(n, cur) {
    if (!n) return '';
    if (cur === 'Rp') return 'Rp ' + (n >= 1e12 ? (n / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' T' : n >= 1e9 ? (n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' M' : (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' jt');
    return cur + ' ' + (n >= 1e6 ? (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' jt' : n.toLocaleString('id-ID', { maximumFractionDigits: 2 }));
  };
  const parts = [f(c.usd, 'USD'), f(c.cny, 'CNY'), f(c.cnh, 'CNH'), f(c.idr, 'Rp')].filter(Boolean);
  let kurs = '';
  if (r) {
    const d = r.date ? new Date(r.date + 'T00:00:00') : null;
    kurs = ' · kurs ' + (d && !isNaN(d) ? d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()] + ' ' + d.getFullYear() : r.month);
  }
  return parts.join(' + ') + kurs;
}
`;

const GS_PATCHES = [
  { file: 'Code', find: "  const contractRaw = monthlyValue_(db, project.id, 'NILAI_KONTRAK');",
    replace: "  const contractRaw = contractIdr_(db, project.id, '');" },
  { file: 'Code', find: "    contract: contractRaw === null ? '' : formatRupiah_(contractRaw),",
    replace: "    contract: contractRaw === null ? '' : formatRupiah_(contractRaw),\n    contractFx: contractFxNote_(project.id, '')," },
  { file: 'Code', find: "  const contract = J(monthlyValue_(db, p.id, 'NILAI_KONTRAK'));",
    replace: "  const contract = J(contractIdr_(db, p.id, m ? monthKey_(m) : ''));" },
  { file: 'Code', find: "  const contract = monthlyValue_(db, p.id, 'NILAI_KONTRAK');\n  return termin === null",
    replace: "  const contract = contractIdr_(db, p.id, '');\n  return termin === null" },
  { file: 'MonthlyApi', find: "  const contract = monthlyValue_(db, p.id, 'NILAI_KONTRAK');\n  const termPaid",
    replace: "  const contract = contractIdr_(db, p.id, monthKey_(m));\n  const termPaid" },
  { file: 'MonthlyDocApi', find: "const kontrak = monthlyValue_(db, p.id, 'NILAI_KONTRAK'),",
    replace: "const kontrak = contractIdr_(db, p.id, '')," },
  { file: 'LifecycleApi', find: "    const contract = monthlyValue_(db, p.id, 'NILAI_KONTRAK');\n    const contractInitial",
    replace: "    const contract = contractIdr_(db, p.id, '');\n    const contractInitial" },
];

/* ---------------- Tambah/Edit Proyek + Addendum (ProjectSetup) ---------------- */
const BLOCK = (pre, title, hint) =>
  '<div class="fxk" id="' + pre + 'Fx">' +
  '<div class="fxk-h"><b>' + title + '</b><span>' + hint + '</span></div>' +
  '<div class="g g4">' +
  ['IDR', 'USD', 'CNY', 'CNH'].map((c) => '<label class="f"><span>' + (c === 'IDR' ? 'Rupiah (IDR)' : c === 'USD' ? 'Dolar AS (USD)' : c === 'CNY' ? 'Yuan daratan (CNY)' : 'Yuan luar daratan (CNH)') +
    '</span><div class="money"><input class="inp" data-fx="' + c.toLowerCase() + '" inputmode="decimal" placeholder="0"></div></label>').join('') +
  '</div><small class="hint fxk-r" data-fxr>Memuat kurs…</small></div>';

const SETUP_JS = String.raw`<style>
.fxk{margin:12px 0 4px;padding:12px 14px;border:1px dashed #c9d6e2;border-radius:12px;background:#f7fafc}
.fxk-h{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:8px}.fxk-h b{font-size:13px;color:var(--navy,#0f2f52)}.fxk-h span{font-size:12px;color:var(--muted,#5b7085)}
.fxk .g{margin:0}.fxk-r{display:block;margin-top:6px}
.fxk-lock{background:#eef3f8!important;cursor:not-allowed}
</style>
<script>
(function(){
  if(window.pmoFx)return;
  var RATE=null,LOADED={};
  function $(id){return document.getElementById(id)}
  function pm(v){try{return typeof pmoney==='function'?pmoney(v):Number(String(v||'').replace(/[^0-9.,]/g,'').replace(/\./g,'').replace(',','.'))||null}catch(e){return null}}
  function mt(n){try{return typeof moneyText==='function'?moneyText(n):Number(n).toLocaleString('id-ID')}catch(e){return String(n)}}
  function api(url,opt){return fetch(url,Object.assign({credentials:'same-origin',headers:{'content-type':'application/json'}},opt||{})).then(function(r){return r.json()}).then(function(j){if(!j.ok)throw new Error(j.error||'Gagal');return j.data})}
  function vals(box){var o={};box.querySelectorAll('[data-fx]').forEach(function(i){o[i.getAttribute('data-fx')]=pm(i.value)||0});return o}
  function hasFx(o){return !!(o.usd||o.cny||o.cnh)}
  function total(o){if(!RATE)return null;return Math.round((o.idr||0)+(o.usd||0)*(RATE.usd||0)+(o.cny||0)*(RATE.cny||0)+(o.cnh||0)*(RATE.cnh||RATE.cny||0))}
  function rateText(){if(!RATE)return 'Kurs belum tersedia (server sedang mengambil kurs). Isian valas tetap disimpan, nilai Rupiah dihitung setelah kurs tersedia.';
    var n=function(v){return v?'Rp '+Number(v).toLocaleString('id-ID',{maximumFractionDigits:2}):'—'};
    var src=RATE.source||{};return 'Kurs '+(RATE.date||RATE.month)+': USD '+n(RATE.usd)+' · CNY '+n(RATE.cny)+' · CNH '+n(RATE.cnh)+' · sumber '+(src.usd||'Frankfurter')+'. Nilai Rupiah di laporan bulanan memakai kurs akhir bulan cut-off.'}
  function wire(box,target,onChange){
    if(!box||box.__fx)return;box.__fx=1;
    box.querySelectorAll('[data-fx]').forEach(function(i){i.addEventListener('input',function(){sync(box,target);if(onChange)onChange()});i.addEventListener('blur',function(){var n=pm(this.value);if(n!=null)this.value=mt(n)})});
  }
  function sync(box,target){
    var o=vals(box),t=$(target);if(!t)return;var r=box.querySelector('[data-fxr]');
    if(hasFx(o)){var tot=total(o);if(tot!=null){t.value=mt(tot);t.dispatchEvent(new Event('input',{bubbles:true}))}t.readOnly=true;t.classList.add('fxk-lock');t.title='Dihitung otomatis dari komponen mata uang di bawah';}
    else{t.readOnly=false;t.classList.remove('fxk-lock');t.title='';if(o.idr&&!t.value){t.value=mt(o.idr);t.dispatchEvent(new Event('input',{bubbles:true}))}}
    if(r)r.textContent=rateText();
  }
  function fill(box,c){box.querySelectorAll('[data-fx]').forEach(function(i){var v=c?c[i.getAttribute('data-fx')]:0;i.value=v?mt(v):''})}
  function used(box){var o=vals(box);return hasFx(o)||!!box.__had}
  function load(pid){
    var box=$('fFx');if(!box)return;fill(box,null);box.__had=false;
    var t=$('fContract');if(t){t.readOnly=false;t.classList.remove('fxk-lock')}
    if(!pid){sync(box,'fContract');return}
    api('/api/contract-fx?project='+encodeURIComponent(pid)).then(function(d){RATE=d.rate||RATE;var c=d.contract;LOADED[pid]=c;if(c&&(c.usd||c.cny||c.cnh)){fill(box,c);box.__had=true}else if(c){fill(box,c)}sync(box,'fContract')}).catch(function(){sync(box,'fContract')});
  }
  function save(pid,kind,box){
    if(!box||!pid)return Promise.resolve();var o=vals(box);
    if(!hasFx(o)&&!box.__had)return Promise.resolve();
    if(!hasFx(o)&&box.__had){var t=$(kind==='ADD'?'adNewContract':'fContract');o.idr=pm(t&&t.value)||o.idr||0}
    return api('/api/contract-fx',{method:'POST',body:JSON.stringify({project:pid,kind:kind,idr:o.idr,usd:o.usd,cny:o.cny,cnh:o.cnh})}).catch(function(e){alert('Nilai kontrak per mata uang belum tersimpan: '+e.message)});
  }
  function init(){
    api('/api/fx/rates').then(function(d){RATE=d.current;['fFx','adFx'].forEach(function(id){var b=$(id);if(b){var r=b.querySelector('[data-fxr]');if(r)r.textContent=rateText();sync(b,id==='fFx'?'fContract':'adNewContract')}})}).catch(function(){});
    wire($('fFx'),'fContract');
    wire($('adFx'),'adNewContract',function(){try{applyAd()}catch(e){}});
    /* simpan komponen setelah server berhasil menyimpan proyek / addendum */
    if(typeof window.run==='function'&&!window.run.__fx){
      var orig=window.run;window.run=function(fn,args,ok,fail){
        if(fn==='saveProjectSetup'){var pid=String(($('fId')||{}).value||'').trim().toUpperCase();var ok0=ok;ok=function(r){save((r&&r.id)||pid,'BASE',$('fFx')).then(function(){ok0&&ok0(r)})}}
        else if(fn==='saveAddendum'&&args&&args[1]&&args[1].cost){var p=args[1];var ok1=ok;ok=function(r){save(p.id,'ADD',$('adFx')).then(function(){ok1&&ok1(r)})}}
        return orig.call(this,fn,args,ok,fail)};window.run.__fx=1;
    }
    /* addendum dibuka: isi komponen dari kontrak berjalan */
    if(typeof window.openAddendum==='function'&&!window.openAddendum.__fx){var oa=window.openAddendum;window.openAddendum=function(){var r=oa.apply(this,arguments);var b=$('adFx');try{var pid=cur&&cur.project&&cur.project.id;fill(b,null);b.__had=false;var t=$('adNewContract');t.readOnly=false;t.classList.remove('fxk-lock');
      if(pid)api('/api/contract-fx?project='+encodeURIComponent(pid)).then(function(d){RATE=d.rate||RATE;var c=d.contract;if(c&&(c.usd||c.cny||c.cnh)){fill(b,c);b.__had=true}var rr=b.querySelector('[data-fxr]');if(rr)rr.textContent=rateText()})}catch(e){}return r};window.openAddendum.__fx=1}
    if(typeof window.setMode==='function'&&!window.setMode.__fx){var sm=window.setMode;window.setMode=function(m){var r=sm.apply(this,arguments);if(m==='new')load('');return r};window.setMode.__fx=1}
  }
  window.pmoFx={load:load,save:save};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
</script>`;

const HTML_PATCHES = [
  { file: 'Dashboard', find: "(profile.contractNote?'<small class=\"prof-note\">'+esc(profile.contractNote)+'</small>':'');document.getElementById('projectEffectiveDate')",
    replace: "(profile.contractNote?'<small class=\"prof-note\">'+esc(profile.contractNote)+'</small>':'')+(profile.contractFx?'<small class=\"prof-note\">'+esc(profile.contractFx)+'</small>':'');document.getElementById('projectEffectiveDate')" },
  { file: 'ProjectSetup', find: '          <div class="sumbar" id="invSum">',
    replace: '          ' + BLOCK('f', 'Nilai kontrak per mata uang', 'Isi bila kontrak memuat valas. Nilai kontrak (Rupiah) di atas dihitung otomatis dengan kurs terbaru.') + '\n          <div class="sumbar" id="invSum">' },
  { file: 'ProjectSetup', find: '        <div class="notice" id="adCostWarn" hidden style="margin:10px 0 0"></div>',
    replace: '        ' + BLOCK('ad', 'Nilai kontrak baru per mata uang', 'Total setelah addendum, per mata uang. Kosongkan bila kontrak hanya Rupiah.') + '\n        <div class="notice" id="adCostWarn" hidden style="margin:10px 0 0"></div>' },
  { file: 'ProjectSetup', find: "  setMoney('fContract',p.contractValue);",
    replace: "  setMoney('fContract',p.contractValue);if(window.pmoFx)pmoFx.load(p.id);" },
  { file: 'ProjectSetup', find: "<script>window.pmoAiPage='setup';</script>",
    replace: SETUP_JS + "\n<script>window.pmoAiPage='setup';</script>" },
];

module.exports = { FX_GS, GS_PATCHES, HTML_PATCHES };

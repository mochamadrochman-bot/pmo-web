'use strict';

/**
 * Nilai FS & realisasi biaya per mata uang + pos "Biaya lain" (22 Nov 2026).
 *
 * FS (Tambah/Edit Proyek)
 *   - Plant / IDC / PM cost FS dan satu pos Biaya lain (nama bebas) bisa diisi Rp, USD, CNY, CNH.
 *   - Kurs FS TETAP: tanggal kurs FS (kurs BI tanggal itu diambil otomatis, boleh diubah manual).
 *   - Nilai Rupiah Plant/IDC/PM tetap ditulis ke DATA BULANAN (PLANT_COST_FS dst.) seperti sebelumnya;
 *     rinciannya + Biaya lain disimpan di tabel fs_fx (src/lib/fx.js).
 *
 * Realisasi (Laporan Bulanan)
 *   - Per pos, isian per mata uang yang dipakai proyek (kontrak / FS): Rp + valas, dikonversi kurs bulan itu.
 *   - Nilai Rupiah Plant/IDC/PM tetap ditulis ke DATA BULANAN; rincian + Biaya lain di tabel cost_fx.
 *
 * Biaya lain tidak punya baris di DATA BULANAN. Supaya semua tampilan lama ikut menghitungnya,
 * pembaca sel cellNumber_ dibungkus: NILAI_INVESTASI_FS, TOTAL_INVESTASI_AKTUAL, dan
 * INVESTASI_AKTUAL_KOMULATIF_MONTHLY ditambah Biaya lain; OTHER_COST_FS / OTHER_COST_ACTUAL menjadi
 * baris virtual (bulan, total tahun, total semua). Tabel keuangan (mrFinanceAt_) mendapat baris tambahan.
 */

const COST_GS = String.raw`
const OC_ITEMS_ = { NILAI_INVESTASI_FS: 1, OTHER_COST_FS: 1, OTHER_COST_ACTUAL: 1, TOTAL_INVESTASI_AKTUAL: 1,
  INVESTASI_AKTUAL_KOMULATIF_MONTHLY: 1, OTHER_COST_AKTUAL_KOMULATIF_MONTHLY: 1 };
let OC_CACHE_ = { fs: null, costs: null, map: {} };
function cellNumber_(sheetData, projectId, item, col) {
  const v = cellNumberRaw_(sheetData, projectId, item, col);
  if (!OC_ITEMS_[item] || !sheetData || !sheetData.months || !sheetData.yearTotals) return v;
  return ocAdjust_(sheetData, projectId, item, col, v);
}
/** Biaya lain proyek: { fs, name, act: {'YYYY-MM': Rupiah}, keys } atau null. */
function ocOf_(pid) {
  const S = fxSnap_();
  if (OC_CACHE_.fs !== S.fs || OC_CACHE_.costs !== S.costs) OC_CACHE_ = { fs: S.fs, costs: S.costs, map: {} };
  if (OC_CACHE_.map[pid] !== undefined) return OC_CACHE_.map[pid];
  const f = (S.fs || {})[pid], c = (S.costs || {})[pid] || {};
  const fs = f && f.items && f.items.other ? f.items.other.total || 0 : 0;
  const act = {};
  Object.keys(c).forEach(function(k) { if (c[k] && c[k].other) act[k] = c[k].other.total || 0; });
  const keys = Object.keys(act).sort();
  const o = fs > 0 || keys.length ? { fs: fs > 0 ? fs : null, name: (f && f.otherName) || '', act: act, keys: keys } : null;
  OC_CACHE_.map[pid] = o;
  return o;
}
function ocCols_(M) {
  if (M.__ocCols) return M.__ocCols;
  const month = {}, year = {};
  M.months.forEach(function(m) { month[m.col] = monthKey_(m); });
  M.yearTotals.forEach(function(t) { year[t.col] = t.year; });
  M.__ocCols = { month: month, year: year };
  return M.__ocCols;
}
function ocSum_(o, pred) { let t = null; o.keys.forEach(function(k) { if (pred(k)) t = (t || 0) + (o.act[k] || 0); }); return t; }
function ocAdjust_(M, pid, item, col, v) {
  const o = ocOf_(pid);
  const virt = item.indexOf('OTHER_') === 0;
  if (!o) return v;
  let add = null;
  if (item === 'NILAI_INVESTASI_FS' || item === 'OTHER_COST_FS') {
    if (col === M.valueCol) add = o.fs;
  } else {
    const cm = ocCols_(M), k = cm.month[col];
    const cum = /KOMULATIF/.test(item);
    if (k) add = cum ? ocSum_(o, function(x) { return x <= k; }) : (o.act[k] === undefined ? null : o.act[k]);
    else if (!cum && cm.year[col] !== undefined) { const y = String(cm.year[col]); add = ocSum_(o, function(x) { return x.slice(0, 4) === y; }); }
    else if (!cum && col >= 0 && col === M.totalAllCol) add = ocSum_(o, function() { return true; });
  }
  if (virt) return add;
  if (!add) return v;
  return (v === null ? 0 : v) + add;
}
function otherCostName_(pid) { const o = ocOf_(pid); return o ? (o.name || 'Biaya lain') : ''; }
function otherCostItems_(pid) { const o = ocOf_(pid); return o ? [['OTHER_COST_ACTUAL', o.name || 'Biaya lain']] : []; }
function fxAmt_(n, cur) {
  if (!n) return '';
  const f = function(x) { return x.toLocaleString('id-ID', { maximumFractionDigits: 2 }); };
  if (cur === 'Rp') return 'Rp ' + (n >= 1e12 ? f(n / 1e12) + ' T' : n >= 1e9 ? f(n / 1e9) + ' M' : f(n / 1e6) + ' jt');
  return cur + ' ' + (n >= 1e6 ? f(n / 1e6) + ' jt' : f(n));
}
function fxDate_(iso) {
  const d = iso ? new Date(String(iso).slice(0, 10) + 'T00:00:00') : null;
  return d && !isNaN(d) ? d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()] + ' ' + d.getFullYear() : '';
}
/** Rincian investasi FS untuk profil, mis. "USD 5 jt + Rp 98 M · kurs FS 1 Jun 2025". */
function fsFxNote_(pid) {
  const f = (fxSnap_().fs || {})[pid];
  if (!f || !f.items) return '';
  const t = { idr: 0, usd: 0, cny: 0, cnh: 0 };
  Object.keys(f.items).forEach(function(k) { const v = f.items[k] || {}; ['idr', 'usd', 'cny', 'cnh'].forEach(function(c) { t[c] += Number(v[c]) || 0; }); });
  if (!(t.usd || t.cny || t.cnh)) return '';
  const parts = [fxAmt_(t.usd, 'USD'), fxAmt_(t.cny, 'CNY'), fxAmt_(t.cnh, 'CNH'), fxAmt_(t.idr, 'Rp')].filter(Boolean);
  return parts.join(' + ') + (f.rateDate ? ' · kurs FS ' + fxDate_(f.rateDate) : '');
}
/** Data isian realisasi per mata uang untuk Laporan Bulanan. */
function costFxForm_(db, p, m) {
  const S = fxSnap_(), pid = p.id, key = monthKey_(m), ALL = ['usd', 'cny', 'cnh'];
  const c = (S.contracts || {})[pid], f = (S.fs || {})[pid], pc = (S.costs || {})[pid] || {};
  const saved = pc[key] || null;
  const used = {};
  ALL.forEach(function(k) { if (c && c[k] > 0) used[k] = 1; });
  if (f && f.items) Object.keys(f.items).forEach(function(i) { ALL.forEach(function(k) { if (f.items[i] && f.items[i][k] > 0) used[k] = 1; }); });
  Object.keys(pc).forEach(function(mo) { Object.keys(pc[mo] || {}).forEach(function(i) { ALL.forEach(function(k) { if (pc[mo][i] && pc[mo][i][k] > 0) used[k] = 1; }); }); });
  const r = fxRateFor_(S, key);
  const o = ocOf_(pid);
  const idx = db.monthly.months.indexOf(m), prev = idx > 0 ? db.monthly.months[idx - 1] : null;
  const pk = prev ? monthKey_(prev) : '';
  return {
    curs: ALL.filter(function(k) { return used[k]; }),
    rate: r ? { usd: r.usd || null, cny: r.cny || null, cnh: r.cnh || null, date: r.date || '', month: r.month || '' } : null,
    saved: saved,
    other: { show: !!o, name: o ? (o.name || 'Biaya lain') : 'Biaya lain', fs: o ? o.fs : null,
      prev: o && pk && o.act[pk] !== undefined ? o.act[pk] : null, prevLabel: prev ? prev.label : '', now: o && o.act[key] !== undefined ? o.act[key] : null }
  };
}
`;

const GS_PATCHES = [
  // Pembaca sel asli diganti nama; cellNumber_ baru (di atas) menambahkan Biaya lain.
  { file: 'Code', find: 'function cellNumber_(sheetData, projectId, item, col) {', replace: 'function cellNumberRaw_(sheetData, projectId, item, col) {' },
  // Tabel keuangan: baris Biaya lain bila proyek memilikinya.
  { file: 'ReportApi', find: "  const items = [['PLANT_COST_ACTUAL', 'BA Proyek'], ['IDC_ACTUAL', 'Bunga KI (IDC)'], ['PM_COST_AKTUAL', 'PM Cost']];",
    replace: "  const items = [['PLANT_COST_ACTUAL', 'BA Proyek'], ['IDC_ACTUAL', 'Bunga KI (IDC)'], ['PM_COST_AKTUAL', 'PM Cost']].concat(otherCostItems_(p.id));" },
  // Kartu Realisasi Keuangan di Weekly.
  { file: 'Code', find: "    const fs = { plant: monthlyValue_(db, p.id, 'PLANT_COST_FS'), pm: monthlyValue_(db, p.id, 'PM_COST_FS'), idc: monthlyValue_(db, p.id, 'IDC_FS') };",
    replace: "    const fs = { plant: monthlyValue_(db, p.id, 'PLANT_COST_FS'), pm: monthlyValue_(db, p.id, 'PM_COST_FS'), idc: monthlyValue_(db, p.id, 'IDC_FS'), other: monthlyValue_(db, p.id, 'OTHER_COST_FS') };" },
  { file: 'Code', find: "    const actual = { plant: pos.plant, pm: pos.pm, idc: pos.idc };\n    let total = null; ['plant', 'pm', 'idc'].forEach(",
    replace: "    const actual = { plant: pos.plant, pm: pos.pm, idc: pos.idc, other: R(f.rows[3] && f.rows[3].pos) };\n    let total = null; ['plant', 'pm', 'idc', 'other'].forEach(" },
  { file: 'Code', find: "    return { month: m.label, monthKey: monthKey_(m), weekMonth: weekMonth, lag: mk(m) < key, actual: actual, fs: fs, total: total, investment: inv };",
    replace: "    return { month: m.label, monthKey: monthKey_(m), weekMonth: weekMonth, lag: mk(m) < key, actual: actual, fs: fs, total: total, investment: inv, otherName: otherCostName_(p.id) };" },
  // Profil proyek: rincian investasi FS valas.
  { file: 'Code', find: "    contractFx: contractFxNote_(project.id, ''),",
    replace: "    contractFx: contractFxNote_(project.id, ''),\n    investmentFx: fsFxNote_(project.id)," },
  // Laporan Bulanan: data isian per mata uang.
  { file: 'MonthlyApi', find: "    costs: costs,\n    prevMonth: prev ? prev.label : '',",
    replace: "    costFx: costFxForm_(db, p, m),\n    costs: costs,\n    prevMonth: prev ? prev.label : ''," },
];

/* ======================= Tambah/Edit Proyek: FS per mata uang ======================= */
const CUR_COLS = [['idr', 'Rupiah'], ['usd', 'USD'], ['cny', 'CNY'], ['cnh', 'CNH']];
const FS_ROWS = [['plant', 'Plant cost FS', 'fPlant'], ['idc', 'IDC FS', 'fIdc'], ['pm', 'PM cost FS', 'fPm'], ['other', '', '']];

const FS_BLOCK = '<div class="fxk fsk" id="fsFx">' +
  '<div class="fxk-h"><b>Nilai FS per mata uang</b><span>Isi bila FS memuat valas atau ada biaya lain. Baris yang diisi menghitung otomatis nilai Rupiah di atas dengan kurs FS (tetap).</span></div>' +
  '<div class="fsk-t"><div class="fsk-r fsk-hd"><span>Pos</span>' + CUR_COLS.map((c) => '<span>' + c[1] + '</span>').join('') + '<span>= Rupiah</span></div>' +
  FS_ROWS.map((r) => '<div class="fsk-r" data-row="' + r[0] + '">' +
    (r[0] === 'other' ? '<span class="fsk-l"><input class="inp" id="fsOtherName" maxlength="80" placeholder="Biaya lain (mis. pembebasan lahan)" aria-label="Nama biaya lain"></span>'
      : '<span class="fsk-l"><b>' + r[1] + '</b></span>') +
    CUR_COLS.map((c) => '<label data-l="' + c[1] + '"><input class="inp" data-fs="' + r[0] + '|' + c[0] + '" inputmode="decimal" placeholder="0" aria-label="' + (r[1] || 'Biaya lain') + ' ' + c[1] + '"></label>').join('') +
    '<span class="fsk-tot" data-l="= Rupiah" data-fst="' + r[0] + '">—</span></div>').join('') +
  '</div>' +
  '<div class="fsk-k"><label class="f"><span>Tanggal kurs FS</span><input class="inp" type="date" id="fsRateDate"></label>' +
  ['usd', 'cny', 'cnh'].map((k) => '<label class="f"><span>Kurs ' + k.toUpperCase() + ' (Rp)</span><input class="inp" data-fsrate="' + k + '" inputmode="decimal" placeholder="' + (k === 'cnh' ? 'ikut kurs CNY' : '—') + '"></label>').join('') +
  '<button type="button" class="btn sm" id="fsRateGet">Ambil kurs BI</button></div>' +
  '<small class="hint fxk-r" id="fsNote"></small></div>';

const FS_JS = String.raw`<style>
.fsk-t{display:grid;gap:6px;margin:4px 0 10px}
.fsk-r{display:grid;grid-template-columns:minmax(150px,1.3fr) repeat(4,minmax(84px,1fr)) minmax(120px,1fr);gap:8px;align-items:center}
.fsk-hd span{font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--muted,#5b7085)}
.fsk-r label{display:block;margin:0}.fsk-r .inp{width:100%;text-align:right}.fsk-l .inp{text-align:left}
.fsk-l b{font-size:13px;color:var(--navy,#0f2f52)}
.fsk-tot{font-weight:700;font-size:13px;text-align:right;color:var(--navy,#0f2f52);font-variant-numeric:tabular-nums}
.fsk-k{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}.fsk-k .f{margin:0;min-width:130px;flex:1}.fsk-k .btn{height:38px}
.fsk-warn{color:#b45309!important}
@media (max-width:720px){
  .fsk-hd{display:none}
  .fsk-r{grid-template-columns:1fr 1fr;padding:10px;border:1px solid #dbe4ee;border-radius:10px;background:#fff}
  .fsk-l,.fsk-r label[data-l="Rupiah"]{grid-column:1/-1}
  .fsk-r label::before,.fsk-tot::before{content:attr(data-l);display:block;font-size:11px;color:var(--muted,#5b7085);margin-bottom:2px;text-align:left;font-weight:600}
  .fsk-tot{grid-column:1/-1;text-align:left}
}
html[data-theme="dark"] .fxk{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.16)}
html[data-theme="dark"] .fxk-h b,html[data-theme="dark"] .fsk-l b,html[data-theme="dark"] .fsk-tot{color:#e3ecf4}
html[data-theme="dark"] .fxk-h span,html[data-theme="dark"] .fsk-hd span,html[data-theme="dark"] .fxk-r{color:#9fb3c8}
html[data-theme="dark"] .fxk-lock{background:rgba(255,255,255,.07)!important;color:#cbd8e6}
html[data-theme="dark"] .fsk-warn{color:#fbbf24!important}
@media (max-width:720px){html[data-theme="dark"] .fsk-r{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.12)}html[data-theme="dark"] .fsk-r label::before,html[data-theme="dark"] .fsk-tot::before{color:#9fb3c8}}
</style>
<script>
(function(){
  if(window.pmoFs)return;
  var ITEMS=['plant','idc','pm','other'],TARGET={plant:'fPlant',idc:'fIdc',pm:'fPm'},LATEST=null,HAD=false,SRC='',PID='',REQ=0;
  function $(id){return document.getElementById(id)}
  function pm(v){try{return typeof pmoney==='function'?pmoney(v):null}catch(e){return null}}
  function mt(n){try{return typeof moneyText==='function'?moneyText(n):Number(n).toLocaleString('id-ID')}catch(e){return String(n)}}
  function rn(v){var s=String(v==null?'':v).trim();if(!s)return null;s=s.replace(/[^0-9.,]/g,'');if(s.indexOf(',')>=0)s=s.replace(/\./g,'').replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');var n=Number(s);return isFinite(n)&&n>0?n:null}
  function rt(n){return n==null?'':Number(n).toLocaleString('id-ID',{maximumFractionDigits:4})}
  function api(url,opt){return fetch(url,Object.assign({credentials:'same-origin',headers:{'content-type':'application/json'}},opt||{})).then(function(r){return r.json()}).then(function(j){if(!j.ok)throw new Error(j.error||'Gagal');return j.data})}
  function routine(){try{return typeof pmoGrpRoutine==='function'&&pmoGrpRoutine()}catch(e){return false}}
  function vals(){var o={};ITEMS.forEach(function(i){o[i]={idr:0,usd:0,cny:0,cnh:0}});document.querySelectorAll('#fsFx [data-fs]').forEach(function(el){var k=el.getAttribute('data-fs').split('|');o[k[0]][k[1]]=pm(el.value)||0});return o}
  function rates(){var o={};document.querySelectorAll('#fsFx [data-fsrate]').forEach(function(el){o[el.getAttribute('data-fsrate')]=rn(el.value)});return o}
  function anyV(v){return !!(v.idr||v.usd||v.cny||v.cnh)}
  function anyFx(v){return !!(v.usd||v.cny||v.cnh)}
  function tot(v,r){r=r||{};return Math.round((v.idr||0)+(v.usd||0)*(r.usd||0)+(v.cny||0)*(r.cny||0)+(v.cnh||0)*(r.cnh||r.cny||0))}
  function missing(v,r){var m=[];['usd','cny','cnh'].forEach(function(k){if(v[k]&&!r[k]&&!(k==='cnh'&&r.cny))m.push(k.toUpperCase())});return m}
  function inUse(){var o=vals();return ITEMS.some(function(i){return anyV(o[i])})||!!String(($('fsOtherName')||{}).value||'').trim()}
  function otherTotal(){if(routine())return 0;var o=vals().other;return anyV(o)?tot(o,rates()):0}
  function otherLabel(){var n=String(($('fsOtherName')||{}).value||'').trim();return n||'biaya lain'}
  function check(){
    if(routine()||!$('fsFx'))return '';var o=vals(),r=rates(),miss={};
    ITEMS.forEach(function(i){missing(o[i],r).forEach(function(k){miss[k]=1})});
    var m=Object.keys(miss);if(m.length)return 'Kurs FS '+m.join(', ')+' belum diisi (Nilai FS per mata uang)';
    if(ITEMS.some(function(i){return anyFx(o[i])})&&!$('fsRateDate').value)return 'Tanggal kurs FS belum diisi';
    if(anyV(o.other)&&!String($('fsOtherName').value||'').trim())return 'Nama biaya lain FS belum diisi';
    return '';
  }
  function sync(){
    var box=$('fsFx');if(!box)return;box.hidden=routine();
    var o=vals(),r=rates();
    ITEMS.forEach(function(i){
      var v=o[i],cell=box.querySelector('[data-fst="'+i+'"]'),has=anyV(v),miss=missing(v,r);
      if(cell){cell.textContent=has?(miss.length?'kurs '+miss.join('/')+' belum ada':'Rp '+mt(tot(v,r))):'—';cell.classList.toggle('fsk-warn',has&&miss.length>0)}
      var t=TARGET[i]&&$(TARGET[i]);if(!t)return;
      if(has&&!routine()){var n=tot(v,r);if(pm(t.value)!==n){t.value=mt(n);t.dispatchEvent(new Event('input',{bubbles:true}))}t.readOnly=true;t.classList.add('fxk-lock');t.title='Dihitung otomatis dari Nilai FS per mata uang'}
      else{t.readOnly=false;t.classList.remove('fxk-lock');t.title=''}
    });
    note(o,r);
    try{if(typeof moneyHints==='function')moneyHints()}catch(e){}
  }
  function note(o,r){
    var el=$('fsNote');if(!el)return;el.classList.remove('fsk-warn');var fx=ITEMS.some(function(i){return anyFx(o[i])});
    if(!fx){el.textContent='Kurs FS hanya diperlukan bila ada nilai valas. Kurs FS tetap: tidak berubah mengikuti kurs bulanan.';return}
    var s='Kurs FS '+($('fsRateDate').value||'(tanggal belum diisi)')+(SRC?' · sumber '+SRC:'')+'. ';
    if(LATEST&&(LATEST.usd||LATEST.cny)){var a=0,b=0;ITEMS.forEach(function(i){if(!anyV(o[i]))return;a+=tot(o[i],r);b+=tot(o[i],LATEST)});
      if(a>0){var d=(b-a)/a*100;s+='Pada kurs terbaru ('+(LATEST.date||LATEST.month)+') FS setara Rp '+mt(b)+' ('+(d>=0?'+':'')+d.toLocaleString('id-ID',{maximumFractionDigits:1})+'%), hanya sebagai informasi risiko kurs.'}}
    el.textContent=s;
  }
  function fetchRate(){
    var d=$('fsRateDate').value;if(!d)return;var el=$('fsNote'),my=++REQ;el.textContent='Mengambil kurs BI '+d+'…';
    api('/api/fx/rate-on?date='+encodeURIComponent(d)).then(function(x){if(my!==REQ)return;
      document.querySelectorAll('#fsFx [data-fsrate]').forEach(function(i){var k=i.getAttribute('data-fsrate');if(x[k])i.value=rt(x[k])});SRC=x.source||'';sync()})
    .catch(function(e){if(my!==REQ)return;el.textContent=e.message;el.classList.add('fsk-warn')});
  }
  function fill(f){
    document.querySelectorAll('#fsFx [data-fs]').forEach(function(el){var k=el.getAttribute('data-fs').split('|'),v=f&&f.items&&f.items[k[0]]?f.items[k[0]][k[1]]:0;el.value=v?mt(v):''});
    document.querySelectorAll('#fsFx [data-fsrate]').forEach(function(el){var v=f&&f.rates?f.rates[el.getAttribute('data-fsrate')]:null;el.value=v?rt(v):''});
    $('fsRateDate').value=f&&f.rateDate?f.rateDate:'';$('fsOtherName').value=f&&f.otherName?f.otherName:'';SRC=f&&f.source||'';
  }
  function load(pid){
    PID=pid||'';HAD=false;fill(null);var n=$('fsNote');if(n)n.classList.remove('fsk-warn');sync();
    if(!pid)return;var my=++REQ;
    api('/api/fs-fx?project='+encodeURIComponent(pid)).then(function(d){if(my!==REQ)return;LATEST=d.rate||LATEST;if(d.fs){fill(d.fs);HAD=true}sync()}).catch(function(){});
  }
  function save(pid){
    if(!pid||routine())return Promise.resolve();
    if(!inUse()&&!HAD)return Promise.resolve();
    var o=vals(),items={};ITEMS.forEach(function(i){if(anyV(o[i]))items[i]=o[i]});
    return api('/api/fs-fx',{method:'POST',body:JSON.stringify({project:pid,rateDate:$('fsRateDate').value||'',rates:rates(),rateSource:SRC||(ITEMS.some(function(i){return anyFx(o[i])})?'manual':''),items:items,otherName:String($('fsOtherName').value||'').trim()})})
      .then(function(){HAD=inUse()}).catch(function(e){alert('Nilai FS per mata uang belum tersimpan: '+e.message)});
  }
  function init(){
    var box=$('fsFx');if(!box)return;
    box.querySelectorAll('[data-fs]').forEach(function(el){el.addEventListener('input',sync);el.addEventListener('blur',function(){var n=pm(el.value);if(n!=null)el.value=n?mt(n):''})});
    box.querySelectorAll('[data-fsrate]').forEach(function(el){el.addEventListener('input',function(){SRC='manual';sync()});el.addEventListener('blur',function(){var n=rn(el.value);el.value=n?rt(n):''})});
    $('fsOtherName').addEventListener('input',function(){try{moneyHints()}catch(e){}});
    $('fsRateDate').addEventListener('change',fetchRate);$('fsRateGet').addEventListener('click',fetchRate);
    var g=$('fGroup');if(g)g.addEventListener('change',function(){setTimeout(sync,0)});
    api('/api/fx/rates').then(function(d){LATEST=d.current||null;sync()}).catch(function(){});
    if(typeof window.run==='function'&&!window.run.__fs){
      var orig=window.run;window.run=function(fn,args,ok,fail){
        if(fn==='saveProjectSetup'){
          var e=check();if(e){if(fail)fail(new Error(e));try{showError(e)}catch(x){}return}
          var pid=String(($('fId')||{}).value||'').trim().toUpperCase(),ok0=ok;ok=function(r){save((r&&r.id)||pid).then(function(){ok0&&ok0(r)})};
        }
        return orig.call(this,fn,args,ok,fail)};window.run.__fs=1;
    }
    if(typeof window.setMode==='function'&&!window.setMode.__fs){var sm=window.setMode;window.setMode=function(m){var r=sm.apply(this,arguments);if(m==='new')load('');return r};window.setMode.__fs=1}
    sync();
  }
  window.pmoFs={load:load,save:save,check:check,otherTotal:otherTotal,otherLabel:otherLabel,sync:sync};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
</script>`;

/* ======================= Laporan Bulanan: realisasi per mata uang ======================= */
const MONTHLY_JS = String.raw`<style>
#cfx{margin-top:12px}
#cfx .cfx-box{padding:12px 14px;border:1px dashed #c9d6e2;border-radius:12px;background:#f7fafc}
#cfx .cfx-h{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:8px}#cfx .cfx-h b{font-size:13px;color:var(--navy,#0f2f52)}#cfx .cfx-h span{font-size:12px;color:var(--muted,#5b7085)}
#cfx .cfx-t{display:grid;gap:6px}
#cfx .cfx-r{display:grid;gap:8px;align-items:center}
#cfx .cfx-hd span{font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--muted,#5b7085)}
#cfx .cfx-r label{display:block;margin:0}#cfx .inp{width:100%;text-align:right}
#cfx .cfx-l b{font-size:13px;color:var(--navy,#0f2f52)}#cfx .cfx-l small{display:block;font-size:11px;color:var(--muted,#5b7085)}
#cfx .cfx-tot{font-weight:700;font-size:13px;text-align:right;color:var(--navy,#0f2f52);font-variant-numeric:tabular-nums}
#cfx .cfx-k{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}#cfx .cfx-k .f{margin:0;min-width:140px;flex:1}
#cfx .cfx-n{display:block;margin-top:6px}#cfx .cfx-warn{color:#b45309}
.cfx-lock{background:#eef3f8!important;cursor:not-allowed}
@media (max-width:720px){
  #cfx .cfx-hd{display:none}
  #cfx .cfx-r{grid-template-columns:1fr 1fr!important;padding:10px;border:1px solid #dbe4ee;border-radius:10px;background:#fff}
  #cfx .cfx-l,#cfx .cfx-tot,#cfx .cfx-r label[data-l="Rupiah"]{grid-column:1/-1}#cfx .cfx-tot{text-align:left}
  #cfx .cfx-r label::before,#cfx .cfx-tot::before{content:attr(data-l);display:block;font-size:11px;color:var(--muted,#5b7085);margin-bottom:2px;text-align:left;font-weight:600}
}
html[data-theme="dark"] #cfx .cfx-box{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.16)}
html[data-theme="dark"] #cfx .cfx-h b,html[data-theme="dark"] #cfx .cfx-l b,html[data-theme="dark"] #cfx .cfx-tot{color:#e3ecf4}
html[data-theme="dark"] #cfx .cfx-h span,html[data-theme="dark"] #cfx .cfx-hd span,html[data-theme="dark"] #cfx .cfx-l small,html[data-theme="dark"] #cfx .cfx-n{color:#9fb3c8}
html[data-theme="dark"] .cfx-lock{background:rgba(255,255,255,.07)!important;color:#cbd8e6}
html[data-theme="dark"] #cfx .cfx-warn{color:#fbbf24}
@media (max-width:720px){html[data-theme="dark"] #cfx .cfx-r{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.12)}html[data-theme="dark"] #cfx .cfx-r label::before,html[data-theme="dark"] #cfx .cfx-tot::before{color:#9fb3c8}}
</style>
<script>
(function(){
  if(window.pmoCfx)return;
  var D=null,ROWS=[],CURS=[],TARGET={plant:'cPlant',idc:'cIdc',pm:'cPm'},LABEL={plant:'Plant cost',idc:'IDC',pm:'PM cost'},OLD=0;
  function $(id){return document.getElementById(id)}
  function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function pm(v){try{return pmoney(v)}catch(e){return null}}
  function mt(n){try{return moneyText(n)}catch(e){return String(n)}}
  function rn(v){var s=String(v==null?'':v).trim();if(!s)return null;s=s.replace(/[^0-9.,]/g,'');if(s.indexOf(',')>=0)s=s.replace(/\./g,'').replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');var n=Number(s);return isFinite(n)&&n>0?n:null}
  function rt(n){return n==null?'':Number(n).toLocaleString('id-ID',{maximumFractionDigits:4})}
  function api(url,opt){return fetch(url,Object.assign({credentials:'same-origin',headers:{'content-type':'application/json'}},opt||{})).then(function(r){return r.json()}).then(function(j){if(!j.ok)throw new Error(j.error||'Gagal');return j.data})}
  function cols(){return ['idr'].concat(CURS)}
  function vals(){var o={};ROWS.forEach(function(i){o[i]={idr:0,usd:0,cny:0,cnh:0}});document.querySelectorAll('#cfx [data-cf]').forEach(function(el){var k=el.getAttribute('data-cf').split('|');var n=pm(el.value);o[k[0]][k[1]]=n==null?0:n});return o}
  function filled(i){return Array.prototype.some.call(document.querySelectorAll('#cfx [data-cf^="'+i+'|"]'),function(el){return String(el.value||'').trim()!==''})}
  function rates(){var o={};document.querySelectorAll('#cfx [data-cfr]').forEach(function(el){o[el.getAttribute('data-cfr')]=rn(el.value)});return o}
  function tot(v,r){r=r||{};return Math.round((v.idr||0)+(v.usd||0)*(r.usd||0)+(v.cny||0)*(r.cny||0)+(v.cnh||0)*(r.cnh||r.cny||0))}
  function missing(v,r){var m=[];CURS.forEach(function(k){if(v[k]&&!r[k]&&!(k==='cnh'&&r.cny))m.push(k.toUpperCase())});return m}
  function render(d){
    D=d;var box=$('cfx');if(!box)return;var x=d.costFx||{};CURS=x.curs||[];ROWS=[];OLD=x.other&&x.other.now||0;
    Object.keys(TARGET).forEach(function(i){var t=$(TARGET[i]);if(t){t.readOnly=false;t.classList.remove('cfx-lock');t.title=''}});
    if(CURS.length)ROWS=['plant','idc','pm'];if(x.other&&x.other.show)ROWS.push('other');
    if(!ROWS.length){box.innerHTML='';return}
    var c=cols(),grid='grid-template-columns:minmax(140px,1.3fr) repeat('+c.length+',minmax(90px,1fr)) minmax(120px,1fr)';
    var saved=x.saved||{},nm=x.other&&x.other.name||'Biaya lain',CN={idr:'Rupiah',usd:'USD',cny:'CNY',cnh:'CNH'};
    var h='<div class="cfx-box"><div class="cfx-h"><b>'+(CURS.length?'Realisasi per mata uang':'Biaya lain')+'</b><span>'+(CURS.length?'Isi sesuai mata uang pembayaran. Baris yang diisi menghitung otomatis nilai Rupiah di atas dengan kurs bulan '+E(d.month.label)+'.':'Pos biaya lain di luar Plant, IDC, dan PM cost (sesuai FS). Isi 0 bila tidak ada.')+'</span></div>';
    h+='<div class="cfx-t"><div class="cfx-r cfx-hd" style="'+grid+'"><span>Pos</span>'+c.map(function(k){return '<span>'+CN[k]+'</span>'}).join('')+'<span>= Rupiah</span></div>';
    ROWS.forEach(function(i){
      var sv=saved[i],base=sv?sv:(i!=='other'&&d.costs&&d.costs[i]!=null&&CURS.length?{idr:d.costs[i]}:(i==='other'&&x.other&&x.other.now!=null?{idr:x.other.now}:null));
      var sub=i==='other'?(x.other.prev!=null?(x.other.prevLabel+': Rp '+mt(x.other.prev)):'')+(x.other.fs?(x.other.prev!=null?' · ':'')+'FS Rp '+mt(x.other.fs):''):'';
      h+='<div class="cfx-r" style="'+grid+'"><span class="cfx-l"><b>'+E(i==='other'?nm:LABEL[i])+'</b>'+(sub?'<small>'+E(sub)+'</small>':'')+'</span>'+
        c.map(function(k){var v=base&&base[k]?base[k]:null;if(k==='idr'&&base&&base.idr===0&&!(base.usd||base.cny||base.cnh))v=0;return '<label data-l="'+CN[k]+'"><input class="inp" data-cf="'+i+'|'+k+'" inputmode="decimal" placeholder="'+(k==='idr'&&i==='other'?'isi 0 bila tidak ada':'0')+'" value="'+(v==null?'':mt(v))+'" aria-label="'+E((i==='other'?nm:LABEL[i])+' '+CN[k])+'"></label>'}).join('')+
        '<span class="cfx-tot" data-l="= Rupiah" data-cft="'+i+'">—</span></div>';
    });
    h+='</div>';
    if(CURS.length){
      var sr=null;ROWS.forEach(function(i){if(!sr&&saved[i]&&saved[i].rates&&(saved[i].rates.usd||saved[i].rates.cny||saved[i].rates.cnh))sr=saved[i].rates});
      var r=sr||x.rate||{};
      h+='<div class="cfx-k">'+CURS.map(function(k){return '<label class="f"><span>Kurs '+k.toUpperCase()+' (Rp)</span><input class="inp" data-cfr="'+k+'" inputmode="decimal" value="'+rt(r[k]||(k==='cnh'?r.cny:null))+'"></label>'}).join('')+'</div>';
      h+='<small class="hint cfx-n" id="cfxNote">'+(sr?'Kurs yang dipakai saat laporan bulan ini disimpan.':(x.rate?'Kurs BI '+E(x.rate.date||x.rate.month)+' (akhir bulan / terbaru). Boleh disesuaikan dengan kurs pembayaran.':'Kurs bulan ini belum tersedia. Isi kurs secara manual.'))+'</small>';
    }
    box.innerHTML=h+'</div>';
    box.querySelectorAll('[data-cf]').forEach(function(el){el.addEventListener('input',sync);el.addEventListener('blur',function(){var n=pm(el.value);if(n!=null)el.value=mt(n)})});
    box.querySelectorAll('[data-cfr]').forEach(function(el){el.addEventListener('input',sync);el.addEventListener('blur',function(){var n=rn(el.value);el.value=n?rt(n):''})});
    sync();
  }
  function sync(){
    if(!D)return;var o=vals(),r=rates();
    ROWS.forEach(function(i){
      var v=o[i],has=filled(i),miss=missing(v,r),cell=document.querySelector('#cfx [data-cft="'+i+'"]');
      if(cell){cell.textContent=has?(miss.length?'kurs '+miss.join('/')+' belum ada':'Rp '+mt(tot(v,r))):'—';cell.classList.toggle('cfx-warn',has&&miss.length>0)}
      var t=TARGET[i]&&$(TARGET[i]);if(!t)return;
      if(has){var n=tot(v,r);t.value=mt(n);t.readOnly=true;t.classList.add('cfx-lock');t.title='Dihitung otomatis dari realisasi per mata uang';t.classList.remove('invalid')}
      else{t.readOnly=false;t.classList.remove('cfx-lock');t.title=''}
    });
    try{recalc()}catch(e){}
  }
  function other(){if(ROWS.indexOf('other')<0)return 0;return tot(vals().other,rates())}
  function check(){
    if(!ROWS.length)return '';var o=vals(),r=rates(),m={};
    ROWS.forEach(function(i){missing(o[i],r).forEach(function(k){m[k]=1})});
    var k=Object.keys(m);return k.length?'Kurs '+k.join(', ')+' bulan ini belum diisi (realisasi per mata uang)':'';
  }
  function rows(){
    if(!ROWS.length)return [];var o=vals(),r=rates(),out=[];
    ROWS.forEach(function(i){var v=o[i];if(i!=='other'&&!(v.usd||v.cny||v.cnh))return;
      var parts=['usd','cny','cnh'].filter(function(k){return v[k]}).map(function(k){return k.toUpperCase()+' '+Number(v[k]).toLocaleString('id-ID',{maximumFractionDigits:2})});if(v.idr)parts.push('Rp '+mt(v.idr));
      out.push([i==='other'?(D.costFx.other.name||'Biaya lain'):LABEL[i]+' (rincian)',(parts.join(' + ')||'Rp 0')+(i==='other'?' = Rp '+mt(tot(v,r)):'')])});
    return out;
  }
  function save(){
    if(!D||!ROWS.length)return Promise.resolve(null);
    var o=vals(),items={};ROWS.forEach(function(i){if(i==='other'||filled(i))items[i]=o[i]});
    return api('/api/cost-fx',{method:'POST',body:JSON.stringify({project:D.project.id,month:D.month.key,rates:rates(),items:items})});
  }
  function init(){
    if(typeof window.run==='function'&&!window.run.__cfx){
      var orig=window.run;window.run=function(fn,args,ok,fail){
        if(fn==='submitMonthlyReport'&&D&&ROWS.length){
          var e=check();if(e){if(fail)fail(new Error(e));try{showError(e)}catch(x){}return}
          var nw=other(),old=OLD,ok0=ok;ok=function(r){save().then(function(){if(r){if(r.monthTotal!=null)r.monthTotal+=nw;if(r.toDate!=null)r.toDate+=nw-old}ok0&&ok0(r)}).catch(function(er){alert('Laporan tersimpan, tetapi rincian mata uang / biaya lain belum tersimpan: '+er.message+'. Simpan ulang laporan bulan ini.');ok0&&ok0(r)})};
        }
        return orig.call(this,fn,args,ok,fail)};window.run.__cfx=1;
    }
  }
  window.pmoCfx={render:render,other:other,check:check,rows:rows};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
</script>`;

const HTML_PATCHES = [
  // ---- Tambah/Edit Proyek
  { file: 'ProjectSetup', find: '          <div class="sumbar" id="invSum">', replace: '          ' + FS_BLOCK + '\n          <div class="sumbar" id="invSum">' },
  { file: 'ProjectSetup', find: "  setMoney('fHistPlant',p.histPlant);",
    replace: "  if(window.pmoFs)pmoFs.load(p.id);\n  setMoney('fHistPlant',p.histPlant);" },
  { file: 'ProjectSetup', find: "  $('invTotal').textContent=pl==null?'—':'Rp '+moneyText(pl+idc+pm)+' ('+fmt((pl+idc+pm)/1e6,2)+' juta)';",
    replace: "  const __ot=window.pmoFs?pmoFs.otherTotal():0;$('invTotal').textContent=pl==null?'—':'Rp '+moneyText(pl+idc+pm+__ot)+' ('+fmt((pl+idc+pm+__ot)/1e6,2)+' juta)'+(__ot?' · termasuk '+pmoFs.otherLabel()+' Rp '+moneyText(__ot):'');" },
  { file: 'ProjectSetup', find: "['Investasi FS','Rp '+moneyText((p.plantFs||0)+(p.idcFs||0)+(p.pmFs||0))]",
    replace: "['Investasi FS','Rp '+moneyText((p.plantFs||0)+(p.idcFs||0)+(p.pmFs||0)+(window.pmoFs?pmoFs.otherTotal():0))]" },
  { file: 'ProjectSetup', find: "add(pmoney($('fContract').value)!=null,'Nilai kontrak');if(!pmoGrpRoutine())",
    replace: "add(pmoney($('fContract').value)!=null,'Nilai kontrak');if(window.pmoFs){var __fe=pmoFs.check();if(__fe)add(false,__fe)}if(!pmoGrpRoutine())" },
  { file: 'ProjectSetup', find: "<script>window.pmoAiPage='setup';</script>", replace: FS_JS + "\n<script>window.pmoAiPage='setup';</script>" },
  // ---- Profil Weekly: rincian investasi valas
  { file: 'Dashboard', find: "document.getElementById('projectInvestment').textContent=profile.investment||'—';",
    replace: "document.getElementById('projectInvestment').innerHTML=esc(profile.investment||'—')+(profile.investmentFx?'<small class=\"prof-note\">'+esc(profile.investmentFx)+'</small>':'');" },
  // ---- Kartu Realisasi Keuangan Weekly: baris Biaya lain
  { file: 'Dashboard', find: "  const rows=[['plant','Plant Cost','termin','#2563eb','#60a5fa'],['pm','PM Cost','','#7c3aed','#a78bfa'],['idc','IDC','bunga KI','#d97706','#fbbf24']];",
    replace: "  const rows=[['plant','Plant Cost','termin','#2563eb','#60a5fa'],['pm','PM Cost','','#7c3aed','#a78bfa'],['idc','IDC','bunga KI','#d97706','#fbbf24']].concat(F&&((F.fs&&F.fs.other)||(F.actual&&F.actual.other!=null))?[['other',F.otherName||'Biaya lain','','#059669','#34d399']]:[]);" },
  // ---- Laporan Bulanan
  { file: 'MonthlyReport', find: '          <div class="calc" id="costCalc"></div>', replace: '          <div id="cfx"></div>\n          <div class="calc" id="costCalc"></div>' },
  { file: 'MonthlyReport', find: "  setMoney('cPlant',d.costs.plant);setMoney('cIdc',d.costs.idc);setMoney('cPm',d.costs.pm);",
    replace: "  setMoney('cPlant',d.costs.plant);setMoney('cIdc',d.costs.idc);setMoney('cPm',d.costs.pm);if(window.pmoCfx)pmoCfx.render(d);" },
  { file: 'MonthlyReport', find: "  const c=costVals();const total=(c.plant||0)+(c.idc||0)+(c.pm||0);",
    replace: "  const c=costVals();const total=(c.plant||0)+(c.idc||0)+(c.pm||0)+(window.pmoCfx?pmoCfx.other():0);" },
  { file: 'MonthlyReport', find: "  const p=collect();const total=(p.costs.plant||0)+(p.costs.idc||0)+(p.costs.pm||0);\n  const rows=[['Proyek',data.project.name],['Bulan',data.month.label],['Plant cost',rp(p.costs.plant)],['IDC',rp(p.costs.idc)],['PM cost',rp(p.costs.pm)],['Total bulan ini',rp(total)]];",
    replace: "  const p=collect();const total=(p.costs.plant||0)+(p.costs.idc||0)+(p.costs.pm||0)+(window.pmoCfx?pmoCfx.other():0);\n  const rows=[['Proyek',data.project.name],['Bulan',data.month.label],['Plant cost',rp(p.costs.plant)],['IDC',rp(p.costs.idc)],['PM cost',rp(p.costs.pm)]].concat(window.pmoCfx?pmoCfx.rows():[]).concat([['Total bulan ini',rp(total)]]);" },
  { file: 'MonthlyReport', find: "  const u=$('reportUrl').value.trim();if(u&&!/^https:\\/\\//i.test(u))mark($('reportUrl'),'Link laporan harus diawali https://');",
    replace: "  if(window.pmoCfx){const __ce=pmoCfx.check();if(__ce)mark(null,__ce)}\n  const u=$('reportUrl').value.trim();if(u&&!/^https:\\/\\//i.test(u))mark($('reportUrl'),'Link laporan harus diawali https://');" },
  { file: 'MonthlyReport', find: "<script>window.pmoAiPage='monthly';</script>", replace: MONTHLY_JS + "\n<script>window.pmoAiPage='monthly';</script>" },
];

module.exports = { COST_GS, GS_PATCHES, HTML_PATCHES };

'use strict';

/**
 * Sena v2 · bagian kode lama & widget (24 Nov 2026). Pemroses utamanya di src/lib/sena.js.
 *
 * - SENA_V2_GS: deklarasi fungsi bantu yang diisi SENA_BRIDGE (sena-extra.js) supaya ikut diekspor.
 * - Widget: pertanyaan dikirim ke /api/sena/ask lalu status ditanyakan berkala (langkah tampil di layar),
 *   tombol "Bahan rapat", kuota & anggaran di kaki widget, tombol "Jadikan isu manajemen" pada jawaban rapat.
 */

const SENA_V2_GS = String.raw`
// Satu deklarasi per baris: runtime hanya mengekspor nama yang ditulis "var nama =" di awal baris.
var senaBegin_ = null;
var senaDraft_ = null;
var senaSeen_ = null;
var senaFinish_ = null;
var senaEnd_ = null;

// ---- Sumber angka Sena (26 Nov 2026): PROGRES dari input mingguan terbaru tiap proyek,
// KEUANGAN (CPI, termin dibayar) tetap dari cut-off bulanan terakhir yang tersedia.
function senaWeeklyOf_(T, p) {
  const k = 'sw' + p.id;
  if (T._c[k] !== undefined) return T._c[k];
  let w = null;
  try { w = buildWeeklyData_(T.user, '', p.name); if (!w || w.projectId !== p.id) w = null; } catch (e) { w = null; }
  return (T._c[k] = w);
}
function senaWeeklyStatus_(dev) {
  if (dev === null || dev === undefined || !isFinite(dev)) return 'Data tidak tersedia';
  const c = Number(DB_CONFIG.CRITICAL_DEVIATION), thr = Math.abs(c) <= 1 ? c * 100 : c;
  return dev < thr ? 'Critical' : dev <= 0 ? 'At risk' : 'On track';
}
var __senaPortfolio = aiToolPortfolio_;
aiToolPortfolio_ = function(T) {
  if (T._c.pfw) return T._c.pfw;
  const base = __senaPortfolio(T);
  const out = JSON.parse(JSON.stringify(base));
  out.catatanSumber = 'PROGRES (aktual, rencana, deviasi, SPI, status, isu) = input MINGGUAN terbaru tiap proyek (lihat weekProgres & periodeProgres; tiap proyek bisa berbeda week). KEUANGAN (cpi, terminDibayar) = cut-off BULANAN terakhir (' + (base.periodeBulanan || '-') + ').';
  const pList = T.allowed();
  const cnt = { onTrack: 0, atRisk: 0, critical: 0 };
  out.proyek.forEach(function(x) {
    x.keuanganBulanan = { periode: base.periodeBulanan || null, cpi: x.cpi, terminDibayar: x.terminDibayar };
    delete x.cpi; delete x.terminDibayar;
    const p = pList.find(function(q) { return q.id === x.id; });
    const w = p ? senaWeeklyOf_(T, p) : null;
    const berjalan = !x.tahap || x.tahap === 'BERJALAN';
    if (w && w.overall) {
      const pl = w.overall.plan, ac = w.overall.actual, dv = w.overall.deviation !== null && w.overall.deviation !== undefined ? w.overall.deviation : (pl !== null && ac !== null ? ac - pl : null);
      x.weekProgres = w.week; x.periodeProgres = w.period || null; x.sumberProgres = 'mingguan';
      x.aktual = aiN_(ac, 2); x.rencana = aiN_(pl, 2); x.deviasi = aiN_(dv, 2);
      x.spi = ac !== null && pl ? aiN_(ac / pl, 3) : null;
      if (berjalan) x.status = senaWeeklyStatus_(dv);
      const cc = (w.concern || []).map(function(c) { return typeof c === 'string' ? c : (c && (c.concern || c.text || c.isu)) || ''; }).filter(Boolean).join('; ');
      const isu = String(cc || w.highlight || '').replace(/\s+/g, ' ').trim().slice(0, 250);
      x.isu = isu || null;
      T.src('Weekly ' + x.nama + ' W' + w.week);
    } else {
      x.weekProgres = null;
      x.sumberProgres = 'belum ada input mingguan; angka progres dari cut-off bulanan ' + (base.periodeBulanan || '');
      x.aktual = x.aktual === undefined ? null : x.aktual;
    }
    if (berjalan) { if (x.status === 'On track') cnt.onTrack++; else if (x.status === 'At risk') cnt.atRisk++; else if (x.status === 'Critical') cnt.critical++; }
  });
  if (out.ringkasan) {
    delete out.ringkasan.plan; delete out.ringkasan.actual;
    out.ringkasan.onTrack = cnt.onTrack; out.ringkasan.atRisk = cnt.atRisk; out.ringkasan.critical = cnt.critical;
    out.ringkasan.catatan = 'Jumlah status dihitung dari progres mingguan terbaru.';
  }
  return (T._c.pfw = out);
};
var __senaProject = aiToolProject_;
aiToolProject_ = function(T, p) {
  const out = __senaProject(T, p);
  if (out && out.bulanan) {
    const b = out.bulanan, pf = aiToolPortfolio_(T), x = (pf.proyek || []).find(function(q) { return q.id === p.id; }) || {}, kb = x.keuanganBulanan || {};
    out.keuanganBulanan = { periode: kb.periode || pf.periodeBulanan || null, cpi: kb.cpi === undefined ? null : kb.cpi,
      terminDibayar: kb.terminDibayar === undefined ? null : kb.terminDibayar, selesai: b.selesai || null, addendum: b.addendum || 0 };
    delete out.bulanan;
  }
  if (out) out.catatanSumber = 'Progres pakai "mingguan" (week terbaru). Keuangan (CPI, termin) pakai "keuanganBulanan" (cut-off bulanan terakhir).';
  return out;
};
`;

const WIDGET_JS = String.raw`<style id="senaV2Css">
.sena-tools>button[data-sena-rapat][aria-pressed="true"]{background:var(--pri,#0f5fa8);border-color:var(--pri,#0f5fa8);color:#fff}
.sena-iss{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:6px 12px;border-radius:99px;border:1px solid var(--pri,#0f5fa8);background:transparent;color:var(--pri-ink,#0f5fa8);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;min-height:0}
.sena-iss:disabled{opacity:.6;cursor:default}
.sena-mode{display:inline-block;margin-left:6px;padding:0 7px;border-radius:99px;background:var(--soft,#e8f3fb);color:var(--pri-ink,#0f5fa8);font-size:11px;font-weight:700}
</style>
<script>
(function(){
  if(window.pmoSenaRun)return;
  var MODE={cepat:'Jawaban cepat',analisis:'Analisis',rapat:'Bahan rapat',draf:'Draf'};
  function api(url,opt){return fetch(url,Object.assign({credentials:'same-origin',headers:{'content-type':'application/json'}},opt||{})).then(function(r){return r.json().catch(function(){return {ok:false,error:'Gagal ('+r.status+')'}})}).then(function(j){if(!j.ok)throw new Error(j.error||'Gagal');return j.data})}
  function step(t){window.__senaStep=t;var el=document.getElementById('aicStep');if(el)el.textContent=(el.getAttribute('data-name')||'Sena')+' · '+t}
  /* Pengganti google.script.run untuk askAssistant: membuat job lalu menunggu hasilnya. */
  window.pmoSenaRun=function(){
    var ok=function(){},fail=function(){};
    var o={withSuccessHandler:function(f){ok=f;return o},withFailureHandler:function(f){fail=f;return o},
      askAssistant:function(tok,req){
        req=req||{};if(window.__senaMode==='rapat')req.mode='rapat';
        step(req.mode==='rapat'?'menyiapkan bahan rapat…':'sedang berpikir…');
        api('/api/sena/ask',{method:'POST',body:JSON.stringify({token:tok,req:req})}).then(function(d){
          var t0=Date.now();
          var poll=function(){api('/api/sena/job/'+d.jobId).then(function(j){
            if(j.status==='run'){if(j.step)step(j.step+' ('+Math.round((Date.now()-t0)/1000)+' dtk)');setTimeout(poll,1500);return}
            window.__senaStep='';
            if(j.status==='error'){fail(new Error(j.error||'Sena gagal menjawab.'));return}
            var r=j.result||{};window.__senaLast=r;ok(r)}).catch(function(e){if(Date.now()-t0<300000)setTimeout(poll,3000);else fail(e)})};
          setTimeout(poll,1200);
        }).catch(function(e){window.__senaStep='';fail(e)});
        return o}};
    return o;
  };
  /* tombol Bahan rapat di bar alat Sena */
  function addRapat(){
    var bar=document.querySelector('.sena-tools');if(!bar||bar.querySelector('[data-sena-rapat]'))return;
    var b=document.createElement('button');b.type='button';b.setAttribute('data-sena-rapat','');b.setAttribute('aria-pressed',window.__senaMode==='rapat'?'true':'false');
    b.title='Jawaban lengkap & terstruktur untuk rapat: K3, kinerja, EPCC, recovery plan, arahan';
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6"/></svg>Bahan rapat';
    b.onclick=function(){var on=window.__senaMode!=='rapat';window.__senaMode=on?'rapat':'';b.setAttribute('aria-pressed',on?'true':'false');
      var ta=document.querySelector('.aic-in textarea');if(ta)ta.placeholder=on?'Contoh: Saya mau rapat weekly proyek Tangki Asam Sulfat, beri arahan K3, EPCC, dan recovery plan':'Tanya proyek, pekerjaan, dokumen, forecast…'};
    bar.appendChild(b);
  }
  /* tombol Jadikan isu manajemen pada jawaban bahan rapat */
  window.pmoSenaIssue=function(btn){
    var r=btn&&btn.__r;if(!r||!r.meetingProject)return;
    var txt=String(r.answer||''),m=txt.match(/##\s*Arahan[^\n]*\n([\s\S]*?)(\n##|$)/i),sec=m?m[1].trim():txt;
    var first=(sec.split('\n').map(function(x){return x.replace(/^[-*\d.)\s]+/,'').replace(/\*\*/g,'').trim()}).filter(Boolean)[0]||'Arahan rapat').slice(0,200);
    var title=window.prompt('Judul isu manajemen untuk '+r.meetingProject.name+':',first);if(!title)return;
    btn.disabled=true;btn.textContent='Menyimpan…';
    api('/api/pres/issues',{method:'POST',body:JSON.stringify({project:r.meetingProject.id,category:'Lainnya',title:title,detail:sec.replace(/\*\*/g,'').slice(0,1200),severity:'Sedang',status:'Baru'})})
      .then(function(){btn.textContent='Tersimpan sebagai isu manajemen ✓'}).catch(function(e){btn.disabled=false;btn.textContent='Jadikan isu manajemen';alert(e.message)});
  };
  if(window.MutationObserver)new MutationObserver(function(){addRapat()}).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>`;

const HTML_PATCHES = [
  // kirim pertanyaan lewat job asinkron
  { file: 'AiWidget', find: 'google.script.run.withSuccessHandler(function(r){ST.busy=false;',
    replace: '(window.pmoSenaRun?pmoSenaRun():google.script.run).withSuccessHandler(function(r){ST.busy=false;' },
  { file: 'AiWidget', find: 'var u=r.usage||{};if(ST.status){ST.status.used=u.used;ST.status.limit=u.limit}',
    replace: 'var u=r.usage||{};if(ST.status){ST.status.used=u.used;ST.status.limit=u.limit;if(u.budgetUsd){ST.status.monthUsd=u.monthUsd;ST.status.budgetUsd=u.budgetUsd}}' },
  // langkah yang sedang dikerjakan
  { file: 'AiWidget', find: "<div class=\"aic-meta\">'+name+' sedang membaca data dashboard… (10–30 detik)</div>",
    replace: "<div class=\"aic-meta\" id=\"aicStep\" data-name=\"'+name+'\">'+name+' · '+(window.__senaStep||'sedang membaca data dashboard…')+'</div>" },
  // kuota & anggaran
  { file: 'AiWidget', find: "usageEl.textContent=s&&s.limit?(s.used||0)+'/'+s.limit+' pertanyaan hari ini':'';",
    replace: "usageEl.textContent=s&&s.limit?(s.used||0)+'/'+s.limit+' pertanyaan hari ini'+(s.budgetUsd?' · anggaran '+Number(s.monthUsd||0).toFixed(2).replace('.',',')+' / '+s.budgetUsd+' USD':''):'';" },
  // simpan mode & proyek rapat pada pesan, tampilkan label mode
  { file: 'AiWidget', find: "ST.msgs.push({role:'ai',text:r.answer,linked:",
    replace: "ST.msgs.push({role:'ai',mode:r.mode||'',meetingProject:r.meetingProject||null,text:r.answer,linked:" },
  { file: 'AiWidget', find: "(m.cards||[]).map(card).join('')+(window.pmoSenaBody?window.pmoSenaBody(m,md):md(m.text))+",
    replace: "(m.cards||[]).map(card).join('')+(window.pmoSenaBody?window.pmoSenaBody(m,md):md(m.text))+(m.mode==='rapat'&&m.meetingProject&&!m.error?'<button type=\"button\" class=\"sena-iss\" data-sena-iss=\"'+index+'\">Jadikan isu manajemen</button>':'')+" },
  { file: 'AiWidget', find: 'if(window.pmoSenaWire)window.pmoSenaWire(body,ST.msgs);',
    replace: "if(window.pmoSenaWire)window.pmoSenaWire(body,ST.msgs);body.querySelectorAll('[data-sena-iss]').forEach(function(b){var mm=ST.msgs[+b.getAttribute('data-sena-iss')];b.__r={answer:mm&&mm.text,meetingProject:mm&&mm.meetingProject};b.onclick=function(){if(window.pmoSenaIssue)pmoSenaIssue(b)}});" },
  { file: 'AiWidget', find: "else setTimeout(init,600);\n})();\n</script>", replace: "else setTimeout(init,600);\n})();\n</script>\n" + WIDGET_JS },
];

module.exports = { SENA_V2_GS, HTML_PATCHES };

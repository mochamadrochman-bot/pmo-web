'use strict';

/**
 * Aturan rilis periode Executive Review & 3 Month Look Ahead + tampilan status kelengkapan yang ringkas.
 *
 * - Untuk Executive Review dan 3 Month Look Ahead, bulan laporan `m` muncul otomatis mulai
 *   tanggal 7 bulan berikutnya (mis. laporan November 2026 muncul mulai 7 Desember 2026),
 *   ATAU lebih cepat apabila seluruh proyek wajib lapor pada bulan `m` sudah mengisi
 *   Input Progress Bulanan secara lengkap (monthReportStatus_.complete).
 * - Halaman Portal tetap memakai aturan periode sebelumnya agar tidak berubah.
 * - Keterangan kelengkapan (#periodNote) di Executive Review dibuat ringkas 1 baris dengan
 *   tombol "Lihat rincian" opsional.
 */

const EXEC_PERIOD_CSS = String.raw`<style id="pmoExecPeriodCss">
html:not(.m-mode) .content>.notice{
  display:flex;align-items:flex-start;gap:10px;margin:12px 2px 0;padding:9px 14px;
  border-radius:12px;background:var(--card,#fff);border:1px solid var(--line,#dce5ed);
  color:var(--ink,#132b43);font-size:13px;line-height:1.45;box-shadow:0 2px 8px rgba(15,23,42,.04);
}
html:not(.m-mode) .content>.notice.is-warn{
  background:color-mix(in srgb,#f59e0b 6%,var(--card,#fff));
  border-color:color-mix(in srgb,#d97706 28%,var(--line,#dce5ed));
}
html:not(.m-mode) .content>.notice .dot{margin-top:6px;background:#16a34a}
html:not(.m-mode) .content>.notice.is-warn .dot{background:#d97706}
.pn-wrap{flex:1;min-width:0}
.pn-bar{display:flex;align-items:center;flex-wrap:wrap;gap:8px 10px}
.pn-badge{
  display:inline-flex;align-items:center;padding:2px 9px;border-radius:99px;
  font-size:11.5px;font-weight:700;letter-spacing:.01em;white-space:nowrap;
  background:rgba(217,119,6,.14);color:#b45309;
}
.pn-badge.ok{background:rgba(22,163,74,.14);color:#15803d}
html[data-theme="dark"] .pn-badge{background:rgba(245,158,11,.2);color:#fbbf24}
html[data-theme="dark"] .pn-badge.ok{background:rgba(34,197,94,.2);color:#4ade80}
.pn-txt{color:var(--muted,#5b7085);font-size:13px;font-weight:500}
.pn-txt b{color:var(--ink,#132b43);font-weight:700}
.pn-tog{
  margin-left:auto;display:inline-flex;align-items:center;gap:5px;padding:3px 10px;
  border-radius:99px;border:1px solid var(--line,#dce5ed);background:var(--tint,#f3f6fa);
  color:var(--ink,#132b43);font:600 12px/1.3 inherit;cursor:pointer;white-space:nowrap;
}
.pn-tog:hover{border-color:var(--pri,#0f5fa8);color:var(--pri,#0f5fa8)}
.pn-tog svg{width:13px;height:13px;transition:transform .2s ease}
.pn-tog[aria-expanded="true"] svg{transform:rotate(180deg)}
.pn-detail{
  margin-top:10px;padding-top:10px;border-top:1px dashed var(--line,#dce5ed);
  display:grid;gap:8px;font-size:12.5px;
}
.pn-detail[hidden]{display:none!important}
.pn-row{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 8px}
.pn-row-k{font-weight:700;color:var(--ink,#132b43);min-width:190px;flex:none}
.pn-chips{display:flex;flex-wrap:wrap;gap:6px;flex:1;min-width:0}
.pn-chip{
  display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:8px;
  background:var(--tint,#f3f6fa);border:1px solid var(--line,#dce5ed);
  color:var(--ink,#132b43);font-size:12px;font-weight:600;
}
.pn-chip small{font-weight:500;color:var(--muted,#5b7085)}
@media (max-width:700px){
  .pn-tog{margin-left:0}
  .pn-row{flex-direction:column;gap:4px}
  .pn-row-k{min-width:0}
}
</style>`;

const EXEC_PERIOD_FN = String.raw`window.pmoRenderPeriodNote=function(st,period){
  var n=document.getElementById('periodNote');if(!n)return;
  var box=n.closest('.notice');
  var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  var nm=function(v){return typeof pmoProjName==='function'?pmoProjName(v):String(v||'')};
  var wList=(st&&Array.isArray(st.waiting))?st.waiting:[];
  var fin=st&&st.finance?st.finance:null;
  var hasWarn=!!(wList.length||fin);
  if(box)box.classList.toggle('is-warn',hasWarn);
  var per=(st&&st.period)||period||'';
  if(!hasWarn){
    n.innerHTML='<div class="pn-bar"><span class="pn-badge ok">Lengkap</span><span class="pn-txt">Data progres fisik (cut-off mingguan) dan realisasi keuangan <b>'+esc(per)+'</b> telah lengkap.</span></div>';
    return;
  }
  var parts=[];
  if(wList.length)parts.push('Progres fisik <b>'+esc(st.weeklyReady)+'/'+esc(st.weeklyTotal)+' proyek</b>');
  if(fin)parts.push('Realisasi biaya <b>'+esc(fin.filled)+'/'+esc(fin.total)+' proyek</b> (acu '+esc(fin.period)+')');
  var missList=(fin&&Array.isArray(fin.missing))?fin.missing:[];
  var rows='';
  if(wList.length){
    rows+='<div class="pn-row"><span class="pn-row-k">Menunggu cut-off mingguan ('+wList.length+'):</span><div class="pn-chips">'+
      wList.map(function(w){return '<span class="pn-chip">'+esc(nm(w.name))+' <small>W'+esc(w.latestWeek)+'/W'+esc(w.cutWeek)+'</small></span>'}).join('')+
      '</div></div>';
  }
  if(fin&&missList.length){
    rows+='<div class="pn-row"><span class="pn-row-k">Belum input bulanan ('+missList.length+'):</span><div class="pn-chips">'+
      missList.map(function(m){return '<span class="pn-chip">'+esc(nm(m))+'</span>'}).join('')+
      '</div></div>';
  }
  n.innerHTML='<div class="pn-bar"><span class="pn-badge">Status Data '+esc(per)+'</span><span class="pn-txt">'+parts.join(' · ')+'</span>'+
    (rows?'<button type="button" class="pn-tog" aria-expanded="false"><span>Lihat rincian</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>':'')+
    '</div>'+(rows?'<div class="pn-detail" hidden>'+rows+'</div>':'');
  var btn=n.querySelector('.pn-tog'),det=n.querySelector('.pn-detail');
  if(btn&&det){
    btn.onclick=function(){
      var open=det.hidden;det.hidden=!open;
      btn.setAttribute('aria-expanded',open?'true':'false');
      var lbl=btn.querySelector('span');if(lbl)lbl.textContent=open?'Sembunyikan':'Lihat rincian';
    };
  }
};`;

const GS_PATCHES = [
  {
    file: 'Code',
    find: "  try { exec = execDataCached_(user, ''); } catch (e) { error = e && e.message ? e.message : String(e); }",
    replace: "  try { exec = execDataCached_(user, '', true); } catch (e) { error = e && e.message ? e.message : String(e); }",
  },
  {
    file: 'Code',
    find: "function buildExecutiveData_(user, requestedPeriod) {",
    replace: "function buildExecutiveData_(user, requestedPeriod, portalMode) {",
  },
  {
    file: 'Code',
    find: "  const valid = executivePeriods_(db, projects);",
    replace: "  const valid = executivePeriods_(db, projects, !portalMode);",
  },
  {
    file: 'Code',
    find: `/** Periode Executive (s.d. bulan berjalan): ada laporan biaya, atau ≥1 proyek wajib lapor sudah sampai week cut-off. */
function executivePeriods_(db, projects) {
  const today = new Date(), tk = today.getFullYear() * 12 + today.getMonth();
  let valid = db.monthly.months.filter(function(m) {
    if (m.year * 12 + m.month > tk) return false;
    return projects.some(function(p) { return monthSubmitted_(db, p, m) || (monthRequired_(db, p, m) && weeklyReadyFor_(db, p, m)); });
  });
  if (!valid.length) valid = db.monthly.months.filter(function(m) { return new Date(m.year, m.month, 1) <= today; });
  return valid;
}`,
    replace: `/** Periode Executive (s.d. bulan berjalan).
 *  Bila useReleaseRule = true (Executive Review & 3 Month Look Ahead): bulan muncul mulai tgl 7 bulan
 *  berikutnya (bila sudah ada data), ATAU lebih awal jika seluruh proyek wajib lapor telah melengkapi
 *  laporan bulanan. Portal tetap memakai aturan lama agar tampilannya tidak berubah. */
function executivePeriods_(db, projects, useReleaseRule) {
  const today = new Date(), tk = today.getFullYear() * 12 + today.getMonth();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let valid = db.monthly.months.filter(function(m) {
    if (m.year * 12 + m.month > tk) return false;
    const hasData = projects.some(function(p) { return monthSubmitted_(db, p, m) || (monthRequired_(db, p, m) && weeklyReadyFor_(db, p, m)); });
    if (!useReleaseRule) return hasData;
    const releaseAt = new Date(m.year, m.month + 1, 7);
    if (todayDay >= releaseAt && hasData) return true;
    return monthReportStatus_(db, projects, m).complete;
  });
  if (!valid.length) {
    valid = db.monthly.months.filter(function(m) {
      return m.year * 12 + m.month <= tk && projects.some(function(p) { return monthSubmitted_(db, p, m) || (monthRequired_(db, p, m) && weeklyReadyFor_(db, p, m)); });
    });
  }
  if (!valid.length) valid = db.monthly.months.filter(function(m) { return new Date(m.year, m.month, 1) <= today; });
  return valid;
}`,
  },
  {
    file: 'Code',
    find: "  const valid=executivePeriods_(db,projects);",
    replace: "  const valid=executivePeriods_(db,projects,true);",
  },
  {
    file: 'Code',
    find: "  return perfCached_('la-v2|'+String(requestedPeriod||''),function(){return executiveLookAheadBuild_(user,requestedPeriod);});",
    replace: "  const d=new Date(),dk=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');return perfCached_('la-v2|'+dk+'|'+String(requestedPeriod||''),function(){return executiveLookAheadBuild_(user,requestedPeriod);});",
  },
  {
    file: 'Code',
    find: `function execDataCached_(user, requestedPeriod) {
  const role = String(user && user.role || '').trim().toUpperCase();
  const scope = role === 'KONTRAKTOR' ? ':' + normKey_(user && user.projectId || '') : '';
  return perfCached_('exec|' + role + scope + '|' + String(requestedPeriod || ''), function() { return buildExecutiveData_(user, requestedPeriod); });
}`,
    replace: `function execDataCached_(user, requestedPeriod, portalMode) {
  const role = String(user && user.role || '').trim().toUpperCase();
  const scope = role === 'KONTRAKTOR' ? ':' + normKey_(user && user.projectId || '') : '';
  const d = new Date(), dk = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const tag = portalMode ? 'portal|' : 'exec|' + dk + '|';
  return perfCached_('exec|' + tag + role + scope + '|' + String(requestedPeriod || ''), function() { return buildExecutiveData_(user, requestedPeriod, portalMode); });
}`,
  },
];

const HTML_PATCHES = [
  {
    file: 'ExecutiveDashboard',
    find: '</style></head>',
    replace: EXEC_PERIOD_CSS + '</style></head>',
  },
  {
    file: 'ExecutiveDashboard',
    find: '<div class="notice"><i class="dot"></i><span id="periodNote">Periode dan angka mengikuti pilihan bulan di sheet executive.</span></div>',
    replace: '<div class="notice"><i class="dot"></i><div id="periodNote" class="pn-wrap">Memuat status periode laporan…</div></div>',
  },
  {
    file: 'ExecutiveDashboard',
    find: "(function(){var n=document.getElementById('periodNote'),st=data.periodStatus;if(!n)return;var t=[];if(st){if(st.waiting&&st.waiting.length)t.push(st.period+': '+st.weeklyReady+' dari '+st.weeklyTotal+' proyek sudah sampai week cut-off. Belum dihitung: '+st.waiting.map(function(w){return w.name+' (cut-off W'+w.cutWeek+', input s.d. W'+w.latestWeek+')'}).join(', ')+'.');if(st.finance)t.push('Realisasi keuangan memakai laporan '+st.finance.period+' sampai semua proyek mengisi realisasi '+st.period+' ('+st.finance.filled+' dari '+st.finance.total+(st.finance.missing&&st.finance.missing.length?'; belum: '+st.finance.missing.join(', '):'')+').')}n.textContent=t.length?t.join(' '):'Progres per proyek dihitung sampai week cut-off bulan pilihan (milestone bulanan).'})();",
    replace: EXEC_PERIOD_FN + "if(window.pmoRenderPeriodNote)window.pmoRenderPeriodNote(data.periodStatus,data.period||'');",
  },
];

module.exports = { GS_PATCHES, HTML_PATCHES };

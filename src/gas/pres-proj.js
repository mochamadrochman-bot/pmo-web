'use strict';

/**
 * Slide proyek untuk mode presentasi + card Prognosa akhir tahun (22 Nov 2026).
 *
 * - Di layar "Siapkan presentasi" (Monthly Executive Review dan Weekly Progress), Admin dan PIC/Input
 *   bisa menambah "Slide proyek" dari proyek mana pun yang boleh ia kelola:
 *     week = Ringkasan minggu terakhir (progres plan/aktual/deviasi total & per bidang),
 *     fin  = Realisasi keuangan cut-off bulanan (tabel seperti Laporan Bulanan Bab 6 + catatan),
 *     la   = 3 Month Look Ahead proyek itu,
 *     prog = Prognosa akhir tahun (biaya + fisik).
 *   Item disimpan di pres_sets sebagai {type:'proj', project, kind, pos, title} (routes/pres.js).
 *   Hak menambah: Admin semua proyek; PIC/Input proyek & sub-proyeknya (server memeriksa).
 *   Data slide dibaca saat ditampilkan, jadi selalu memakai minggu / bulan terakhir yang terinput.
 * - Weekly Progress: card "Prognosa akhir tahun" di bawah Realisasi keuangan, dan tiga slide bawaan
 *   (Prognosa, Realisasi keuangan cut-off bulanan, 3 Month Look Ahead) yang bisa disembunyikan.
 *
 * Prognosa:
 *   Biaya  = realisasi tahun berjalan s.d. bulan cut-off + rencana (RKAP bulanan) bulan berikutnya s.d. Desember.
 *            Bila RKAP bulanan tidak ada: sisa RKAP tahunan dikurangi RKAP s.d. cut-off (atau pro-rata).
 *   Fisik  = aktual minggu terakhir + kenaikan rencana dari minggu itu s.d. minggu 31 Desember
 *            (asumsi deviasi tetap), maksimal 100%.
 */

const PRES_PROJ_GS = String.raw`
/** Prognosa akhir tahun untuk satu proyek pada minggu tertentu (angka biaya dalam juta Rupiah). */
function presPrognosis_(db, p, week) {
  const M = db.monthly, W = db.weekly, info = weeklyInfo_(db, p);
  if (!info.startDate || !info.latestWeek) return { none: true, note: 'Data mingguan atau tanggal mulai proyek belum tersedia.' };
  week = Math.max(1, Math.min(Number(week) || info.latestWeek, info.latestWeek));
  const end = new Date(info.startDate.getFullYear(), info.startDate.getMonth(), info.startDate.getDate() + week * 7 - 1);
  const Y = end.getFullYear();
  const pct = function(item, w) { return w < 1 ? 0 : weekPercent_(W, p.id, item, w); };
  const pe = info.planEndWeek || 0;
  const planNow = pe ? pct('KOMULATIF_PLAN', Math.min(week, pe)) : null;
  const actNow = pct('KOMULATIF_REALISASI', week);
  const wDec = weekForDate_(info.startDate, new Date(Y, 11, 31));
  let planDec = null;
  if (pe) planDec = wDec >= pe ? 100 : pct('KOMULATIF_PLAN', wDec);
  let progF = null;
  if (actNow !== null && planDec !== null && planNow !== null) progF = Math.min(100, Math.max(actNow, actNow + Math.max(0, planDec - planNow)));
  const physical = { week: week, weekDec: pe ? Math.max(1, Math.min(wDec, pe)) : wDec, planNow: planNow, actualNow: actNow, planDec: planDec,
    prognosis: progF, deviation: progF === null || planDec === null ? null : progF - planDec, finishInYear: !!pe && wDec >= pe };

  let cost = null;
  try {
    const wf = weeklyFinance_(db, p, week);
    if (wf && !wf.none && wf.monthKey) {
      const m = M.months.find(function(mm) { return monthKey_(mm) === wf.monthKey; });
      if (m) {
        const J = function(v) { return v === null || v === undefined ? null : v / 1e6; };
        const mk = function(mm) { return mm.year * 12 + mm.month; };
        const f = mrFinanceAt_(db, p, m), T = f.total || {};
        const sameYear = m.year === Y;
        const real = sameYear ? (T.ytd || 0) : 0;
        const hist = sameYear ? T.hist : T.pos;
        const yt = M.yearTotals.find(function(t) { return t.year === Y; });
        let rkap = yt ? cellNumber_(M, p.id, 'RKAP', yt.col) : null, rkapToDate = null, rest = null, restN = 0, restMonths = 0;
        M.months.forEach(function(mm) {
          if (mm.year !== Y) return;
          const v = cellNumber_(M, p.id, 'RKAP', mm.col);
          if (!yt && v !== null) rkap = (rkap || 0) + v;
          if (sameYear && mk(mm) <= mk(m)) { if (v !== null) rkapToDate = (rkapToDate || 0) + v; return; }
          restMonths++;
          if (v !== null) { rest = (rest || 0) + v; restN++; }
        });
        let method = 'RKAP bulanan ' + Y;
        if (!restN) {
          if (rkap === null) { rest = null; method = ''; }
          else if (rkapToDate !== null) { rest = Math.max(0, rkap - rkapToDate); method = 'Sisa RKAP ' + Y + ' (RKAP tahunan dikurangi RKAP s.d. cut-off)'; }
          else { rest = rkap * (sameYear ? (11 - m.month) / 12 : 1); method = 'Sisa RKAP ' + Y + ' dibagi rata per bulan'; }
        }
        const restJ = J(rest), rkapJ = J(rkap), inv = J(monthlyValue_(db, p.id, 'NILAI_INVESTASI_FS'));
        const prog = restJ === null ? null : real + restJ;
        const nextM = sameYear ? (m.month < 11 ? MONTHS_ID_[m.month + 1] : '') : MONTHS_ID_[0];
        cost = { cutoff: m.label, cutoffMonth: MONTHS_ID_[m.month], lag: !!wf.lag, year: Y, real: real, rest: restJ,
          restLabel: nextM ? (nextM === 'Desember' ? 'Desember ' + Y : nextM + ' – Desember ' + Y) : '', prognosis: prog, rkap: rkapJ,
          pctReal: rkapJ ? real / rkapJ : null, pctRkap: rkapJ && prog !== null ? prog / rkapJ : null,
          hist: hist, posEnd: prog === null ? null : (hist || 0) + prog, investment: inv,
          pctInv: inv && prog !== null ? ((hist || 0) + prog) / inv : null, method: method };
      }
    }
  } catch (e) { cost = { error: String(e && e.message || e) }; }
  return { year: Y, week: week, physical: physical, cost: cost };
}

/** Data satu slide proyek untuk presentasi: kind = week | fin | la | prog. */
function getPresProjSlide(token, projectId, kind) {
  dbReadOnly_();
  const user = requireUser_(token);
  ktrBlock_(user);
  kind = String(kind || '');
  if (['week', 'fin', 'la', 'prog'].indexOf(kind) < 0) throw new Error('Jenis slide proyek tidak dikenal.');
  const db = loadDb_();
  const want = normKey_(projectId);
  const p = db.projects.filter(function(x) { return userCanAccess_(user, x); }).find(function(x) { return normKey_(x.id) === want; });
  if (!p) throw new Error('Proyek ' + projectId + ' tidak ditemukan atau tidak dapat diakses.');
  const head = { id: p.id, name: p.name, fullName: p.fullName || p.name };
  if (kind === 'la') {
    const r = getExecutiveLookAhead(token, '');
    const pr = (r.projects || []).find(function(x) { return normKey_(x.id) === want; }) || null;
    return { success: true, kind: kind, project: head, data: { period: r.period, months: r.months, project: pr } };
  }
  return perfCached_('presProj|' + p.id + '|' + kind, function() {
    const info = weeklyInfo_(db, p);
    if (kind === 'week') {
      if (!info.latestWeek) return { success: true, kind: kind, project: head, data: { none: true } };
      const d = buildWeeklyData_(user, null, p.id);
      return { success: true, kind: kind, project: head, data: { week: d.week, period: d.period, overall: d.overall, fields: d.fields,
        duration: d.duration, highlight: d.highlight || '', concern: d.concern || null, stage: d.lifecycle && d.lifecycle.stage || '' } };
    }
    if (kind === 'prog') return { success: true, kind: kind, project: head, data: presPrognosis_(db, p, info.latestWeek) };
    const M = db.monthly, now = new Date(), nk = now.getFullYear() * 12 + now.getMonth();
    let m = null;
    M.months.forEach(function(mm) { if (mm.year * 12 + mm.month <= nk) m = mm; });
    if (!m) m = M.months[M.months.length - 1];
    if (!m) return { success: true, kind: kind, project: head, data: { none: true } };
    const F = mrFinance_(db, p, m);
    return { success: true, kind: kind, project: head, data: F };
  });
}
`;

/** Patch kode .gs: prognosa ikut data Weekly. */
const GS_PATCHES = [
  {
    file: 'Code',
    find: '    finance: weeklyFinance_(db, project, week),\n    baselineInitial:',
    replace: '    finance: weeklyFinance_(db, project, week),\n' +
      '    prognosis: (function() { try { return presPrognosis_(db, project, week); } catch (e) { return { error: String(e && e.message || e) }; } })(),\n' +
      '    baselineInitial:',
  },
];

/** Skrip browser (disisipkan bersama mode presentasi di AccountMenu). */
const PRES_PROJ_JS = String.raw`<style>
.pjx{font-family:inherit;color:inherit}
.pjx-h{display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap;margin:0 0 16px}
.pjx-h h3{margin:0;font-size:22px;line-height:1.2;font-weight:800}
.pjx-h small{display:block;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted,#5b7085);margin-bottom:4px}
.pjx-h .pjx-per{margin-left:auto;padding:5px 12px;border-radius:99px;border:1px solid var(--line,#dbe5ee);font-size:13px;font-weight:600;color:var(--muted,#5b7085)}
.pjx-load,.pjx-empty{padding:40px 20px;text-align:center;color:var(--muted,#5b7085);font-size:15px}
.pjx-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
.pjx-kpi{border:1px solid var(--line,#dbe5ee);border-radius:14px;padding:12px 14px}
.pjx-kpi small{display:block;font-size:12px;color:var(--muted,#5b7085);font-weight:600}
.pjx-kpi b{display:block;font-size:26px;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums}
.pjx-kpi span{font-size:12px;color:var(--muted,#5b7085)}
.pjx-good{color:#16875d}.pjx-bad{color:#c2410c}.pjx-crit{color:#b42318}
.pjx-tbl{width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums}
.pjx-tbl th,.pjx-tbl td{border:1px solid var(--line,#c9d3dd);padding:7px 10px}
.pjx-tbl th{font-weight:700}
.pjx-bar{position:relative;height:9px;border-radius:99px;background:rgba(127,140,153,.18);overflow:hidden;min-width:120px}
.pjx-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:#087fc1}
.pjx-bar u{position:absolute;top:-2px;bottom:-2px;width:2px;background:#9bd8f7;text-decoration:none}
.pjx-note{font-size:13px;color:var(--muted,#5b7085);line-height:1.55;margin:10px 0 0}
.pjx-hl{margin-top:14px;border-left:3px solid #087fc1;padding:6px 12px;font-size:14px;line-height:1.55}
/* keuangan: seperti Laporan Bulanan Bab 6 */
.pjx-fin p{font-size:15px;line-height:1.6;margin:0 0 8px}
.pjx-fin .pjx-ju{text-align:right;font-size:13px;margin-bottom:4px}
.pjx-fin table{width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums}
.pjx-fin th{background:#1f3864;color:#fff;font-weight:700;padding:8px 8px;border:1px solid #7f8c99;text-align:center}
.pjx-fin th.b2{background:#2e75b6}
.pjx-fin tr.no th{background:#2e75b6;font-weight:500}
.pjx-fin td{border:1px solid #7f8c99;padding:7px 8px}
.pjx-fin td.r{text-align:right}.pjx-fin td.c{text-align:center}.pjx-fin tr.tb td{font-weight:700}
.pjx-fin .pjx-fb{color:#c00000;font-style:italic}
/* look ahead */
.pjx-la{display:grid;grid-template-columns:170px repeat(3,minmax(0,1fr));border:1px solid var(--line,#dbe5ee);border-radius:14px;overflow:hidden}
.pjx-la>div{padding:10px 12px;border-top:1px solid var(--line,#dbe5ee);border-left:1px solid var(--line,#dbe5ee);font-size:13.5px;min-width:0}
.pjx-la>.pjx-hd{border-top:0;font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase;background:rgba(8,127,193,.08)}
.pjx-la>div:nth-child(4n+1){border-left:0}
.pjx-la .fn{font-weight:700}.pjx-la .fn small{display:block;font-weight:500;color:var(--muted,#5b7085);font-size:11.5px;margin-top:3px}
.pjx-la .pjx-msg{grid-column:2/5;color:var(--muted,#5b7085)}
.pjx-it{padding:6px 0;border-bottom:1px dashed var(--line,#dbe5ee)}.pjx-it:last-child{border-bottom:0}
.pjx-it b{display:block;font-weight:600;line-height:1.35}
.pjx-it span{font-size:12px;color:var(--muted,#5b7085)}
.pjx-st{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:99px;font-size:11px;font-weight:700;background:rgba(245,197,71,.22);color:#8a5a00}
.pjx-st.good{background:rgba(54,189,131,.18);color:#16875d}.pjx-st.bad{background:rgba(237,76,76,.16);color:#b42318}
.pjx-more{font-size:12px;color:var(--muted,#5b7085);padding-top:4px}
/* prognosa */
.pjx-pg{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.pjx-pc{border:1px solid var(--line,#dbe5ee);border-radius:14px;padding:14px 16px;min-width:0}
.pjx-pc h4{margin:0 0 2px;font-size:14px;font-weight:700}
.pjx-pc .pjx-big{font-size:28px;font-weight:800;margin:6px 0 2px;font-variant-numeric:tabular-nums}
.pjx-pc .pjx-sub{font-size:12.5px;color:var(--muted,#5b7085);margin-bottom:10px}
.pjx-pc dl{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 12px;margin:0;font-size:13px;font-variant-numeric:tabular-nums}
.pjx-pc dt{color:var(--muted,#5b7085)}.pjx-pc dd{margin:0;text-align:right;font-weight:600}
.pjx-pc .pjx-bar{margin:8px 0 10px;height:10px}
#progBox{padding:4px 18px 18px}
#progBox .pjx-pc .pjx-big{font-size:22px}
.pp-card .pjx .pjx-pc .pjx-big{font-size:34px}
</style>
<script>
(function(){
  if(window.pmoPresProj)return;
  var KINDS=[['week','Ringkasan minggu terakhir'],['fin','Realisasi keuangan (cut-off bulanan)'],['la','3 Month Look Ahead'],['prog','Prognosa akhir tahun']];
  var SHORT={week:'Ringkasan minggu',fin:'Keuangan cut-off',la:'Look Ahead 3 bulan',prog:'Prognosa akhir tahun'};
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function fin(v){return v!==null&&v!==undefined&&isFinite(v)}
  function nf(v,d){return fin(v)?Number(v).toLocaleString('id-ID',{minimumFractionDigits:d||0,maximumFractionDigits:d||0}):'—'}
  function pc(v,d){return fin(v)?nf(v,d==null?2:d)+'%':'—'}
  function mly(j){return fin(j)?'Rp '+nf(j/1000,2)+' M':'—'}
  function tok(){try{if(typeof token!=='undefined'&&token)return token}catch(e){}try{return sessionStorage.getItem('pmoSessionToken')||''}catch(e){return ''}}
  var memo={};
  function load(pid,kind){
    var k=pid+'|'+kind;if(memo[k])return memo[k];
    memo[k]=new Promise(function(res,rej){try{google.script.run.withSuccessHandler(res).withFailureHandler(function(e){delete memo[k];rej(e)}).getPresProjSlide(tok(),pid,kind)}catch(e){delete memo[k];rej(e)}});
    return memo[k];
  }
  function head(eye,title,per){return '<div class="pjx-h"><div><small>'+esc(eye)+'</small><h3>'+esc(title)+'</h3></div>'+(per?'<span class="pjx-per">'+esc(per)+'</span>':'')+'</div>'}
  function devCls(v){return !fin(v)?'':v>=0?'pjx-good':v>-5?'pjx-bad':'pjx-crit'}
  function rWeek(d,P){
    if(!d||d.none)return head('Ringkasan minggu terakhir',P.name)+'<div class="pjx-empty">Data mingguan proyek ini belum tersedia.</div>';
    var o=d.overall||{},du=d.duration||{};
    var per=d.period&&typeof d.period==='object'?[d.period.start,d.period.end].filter(Boolean).join(' – '):String(d.period||'');
    var h=head('Ringkasan minggu terakhir · W'+d.week,P.name,per);
    h+='<div class="pjx-kpis"><div class="pjx-kpi"><small>Plan kumulatif</small><b>'+pc(o.plan)+'</b></div><div class="pjx-kpi"><small>Aktual kumulatif</small><b>'+pc(o.actual)+'</b></div><div class="pjx-kpi"><small>Deviasi</small><b class="'+devCls(o.deviation)+'">'+(fin(o.deviation)&&o.deviation>0?'+':'')+pc(o.deviation)+'</b></div><div class="pjx-kpi"><small>Waktu terpakai</small><b>'+pc(du.timeUsed,1)+'</b><span>'+nf(du.actual)+' dari '+nf(du.total)+' hari</span></div></div>';
    h+='<table class="pjx-tbl"><thead><tr><th style="text-align:left">Bidang</th><th>Plan</th><th>Aktual</th><th>Deviasi</th><th style="width:34%">Capaian</th></tr></thead><tbody>'+
      (d.fields||[]).map(function(f){var a=fin(f.actual)?Math.max(0,Math.min(100,f.actual)):0,p=fin(f.plan)?Math.max(0,Math.min(100,f.plan)):null;
        return '<tr><td><b>'+esc(f.name)+'</b></td><td style="text-align:right">'+pc(f.plan)+'</td><td style="text-align:right">'+pc(f.actual)+'</td><td style="text-align:right" class="'+devCls(f.deviation)+'">'+(fin(f.deviation)&&f.deviation>0?'+':'')+pc(f.deviation)+'</td><td><div class="pjx-bar"><i style="width:'+a+'%"></i>'+(p===null?'':'<u style="left:calc('+p+'% - 1px)"></u>')+'</div></td></tr>'}).join('')+'</tbody></table>';
    var hl=String(d.highlight||'').trim();if(hl)h+='<div class="pjx-hl"><b>Highlight aktivitas:</b> '+esc(hl.length>420?hl.slice(0,420)+'…':hl)+'</div>';
    return h;
  }
  function rFin(F,P){
    if(!F||F.none||!F.rows||!F.total)return head('Realisasi keuangan',P.name)+'<div class="pjx-empty">Realisasi keuangan proyek ini belum diinput di Laporan Bulanan.</div>';
    var T=F.total,mon=F.monthName||'',yr=F.year||'',ml=F.monthLabel||'',n=F.rows.length,n0=function(v){return fin(v)?nf(v,0):''},pcx=function(v){return fin(v)?pc(v*100):'-'};
    var rp=function(j){return fin(j)?'Rp. '+Math.round(j*1e6).toLocaleString('id-ID'):'-'};
    var note=(!fin(T.ytd)&&!fin(T.pos))?'Realisasi biaya bulan '+mon+' '+yr+' belum diisi di Laporan Bulanan.':
      'Realisasi biaya sampai dengan bulan '+mon+' '+yr+' sebesar '+rp(T.ytd)+' atau '+pcx(F.pctRkap)+' dari nilai RKAP '+yr+' sebesar '+rp(F.rkap)+',- dan posisi biaya dari awal sampai dengan Bulan '+mon+' tahun '+yr+' sebesar '+rp(T.pos)+' atau '+pcx(F.pctInv)+' dari nilai Total Nilai Investasi proyek sebesar '+rp(F.investment)+',-';
    var h=head('Realisasi keuangan · cut-off '+mon+' '+yr,P.name,F.basis?'Data '+F.basis.label:'')+'<div class="pjx-fin">';
    h+='<p>Sampai dengan Bulan '+esc(mon+' '+yr)+' realisasi anggaran proyek '+esc(P.name)+' sebagai berikut :</p>';
    if(F.basis)h+='<p class="pjx-fb">Berdasarkan Laporan Keuangan Bulan '+esc(F.basis.label)+' (data '+esc(F.reportLabel||'')+' belum tersedia)</p>';
    h+='<div class="pjx-ju">Dalam Juta Rupiah</div><table><thead><tr><th rowspan="2">Item Investasi</th><th rowspan="2">'+esc(F.histLabel||'')+'</th><th colspan="3" class="b2">Tahun '+esc(yr)+'</th><th rowspan="2">Posisi s.d. '+esc(ml+' '+yr)+'</th><th rowspan="2">Nilai Investasi</th><th colspan="2" rowspan="2">%</th></tr>'+
      '<tr><th class="b2">Real '+esc(ml)+'</th><th class="b2">Real s.d. '+esc(ml)+'</th><th class="b2">RKAP</th></tr>'+
      '<tr class="no">'+['1','2','3','4','5','6=2+4','7','8 = 4:5','9 = 6:7'].map(function(t){return '<th>'+t+'</th>'}).join('')+'</tr></thead><tbody>';
    F.rows.forEach(function(r,i){h+='<tr><td>'+esc(r.item)+'</td><td class="r">'+n0(r.hist)+'</td><td class="r">'+n0(r.month)+'</td><td class="r">'+n0(r.ytd)+'</td>'+
      (i===0?'<td class="c" rowspan="'+n+'">'+n0(F.rkap)+'</td>':'')+'<td class="r">'+n0(r.pos)+'</td>'+
      (i===0?'<td class="c" rowspan="'+(n+1)+'">'+n0(F.investment)+'</td><td class="c" rowspan="'+(n+1)+'">'+pcx(F.pctRkap)+'</td><td class="c" rowspan="'+(n+1)+'">'+pcx(F.pctInv)+'</td>':'')+'</tr>'});
    h+='<tr class="tb"><td>TOTAL</td><td class="r">'+n0(T.hist)+'</td><td class="r">'+n0(T.month)+'</td><td class="r">'+n0(T.ytd)+'</td><td></td><td class="r">'+n0(T.pos)+'</td></tr></tbody></table>';
    h+='<p style="margin-top:14px">catatan :</p><p>'+String(note).split(/(Rp\.?\s?[\d.]+(?:,\d+)?|\d+(?:,\d+)?\s?%)/).map(function(s,i){return i%2?'<b>'+esc(s)+'</b>':esc(s)}).join('')+'</p></div>';
    return h;
  }
  function rLa(d,P){
    var pr=d&&d.project,months=(d&&d.months)||[];
    var h=head('3 Month Look Ahead',P.name,months.map(function(m){return m.label}).join(' · '));
    if(!pr)return h+'<div class="pjx-empty">Look Ahead proyek ini belum tersedia (proyek belum berjalan atau baseline EPCC / jadwal belum ada).</div>';
    var pm=pr.projectMonths||[];
    if(pm.length&&pm.every(function(m){return m&&m.complete}))return h+'<div class="pjx-empty">Proyek selesai.</div>';
    var g='<div class="pjx-la"><div class="pjx-hd">Bidang</div>'+months.map(function(m){return '<div class="pjx-hd">'+esc(m.label)+'</div>'}).join('');
    (pr.fields||[]).forEach(function(f){
      var src=f.sourceText||(f.baseline?'Baseline Rev '+f.revision+(f.week?' · W'+f.week:''):'');
      g+='<div class="fn">'+esc(f.name)+(src?'<small>'+esc(src)+'</small>':'')+'</div>';
      if(f.complete||!f.baseline||f.error){g+='<div class="pjx-msg">'+esc(f.message||'')+'</div>';return}
      months.forEach(function(m,i){
        if(pm[i]&&pm[i].complete){g+='<div>Proyek selesai</div>';return}
        var L=(f.months&&f.months[i])||[];
        if(!L.length){var s=(f.monthStates||[])[i];g+='<div style="color:var(--muted,#5b7085)">'+esc(s&&s.message||'Tidak ada tambahan rencana')+'</div>';return}
        var top=L.slice().sort(function(a,b){return (b.contribution||0)-(a.contribution||0)}).slice(0,4);
        g+='<div>'+top.map(function(t){var k=t.status==='Di bawah rencana'?'bad':t.status==='Berjalan sesuai rencana'?'good':'';
          return '<div class="pjx-it"><b>'+esc(t.name)+'</b><span>Target '+pc(t.target)+(t.contribution!=null?' · +'+pc(t.contribution)+' bobot proyek':'')+'</span>'+(t.status?'<span class="pjx-st '+k+'">'+esc(t.status)+'</span>':'')+'</div>'}).join('')+
          (L.length>4?'<div class="pjx-more">+'+(L.length-4)+' pekerjaan lain</div>':'')+'</div>';
      });
    });
    return h+g+'</div><p class="pjx-note">Sumber: '+(pr.source==='XML'?'Jadwal XML (Master Schedule)':'EPCC Control')+'. Ditampilkan maksimal 4 pekerjaan dengan kontribusi terbesar per bulan.</p>';
  }
  function progHtml(d){
    if(!d||d.none||d.error)return '<div class="pjx-empty">'+esc(d&&(d.note||d.error)||'Prognosa belum dapat dihitung.')+'</div>';
    var c=d.cost,f=d.physical||{},Y=d.year,h='<div class="pjx-pg">';
    if(c&&!c.error&&fin(c.prognosis)){
      var w=fin(c.pctRkap)?Math.max(0,Math.min(100,c.pctRkap*100)):0,wr=fin(c.pctReal)?Math.max(0,Math.min(100,c.pctReal*100)):0;
      h+='<div class="pjx-pc"><h4>Biaya · prognosa akhir '+esc(Y)+'</h4><div class="pjx-big">'+mly(c.prognosis)+'</div><div class="pjx-sub">'+pc(fin(c.pctRkap)?c.pctRkap*100:null)+' dari RKAP '+esc(Y)+' '+mly(c.rkap)+'</div>'+
        '<div class="pjx-bar"><i style="width:'+w+'%;background:#93c5fd"></i><i style="width:'+wr+'%"></i></div>'+
        '<dl><dt>Realisasi s.d. '+esc(c.cutoff)+(c.lag?' (cut-off terakhir)':'')+'</dt><dd>'+mly(c.real)+'</dd><dt>Rencana '+esc(c.restLabel||'sisa tahun')+'</dt><dd>'+mly(c.rest)+'</dd>'+
        '<dt>Posisi akhir '+esc(Y)+' vs Nilai Investasi</dt><dd>'+mly(c.posEnd)+' · '+pc(fin(c.pctInv)?c.pctInv*100:null)+'</dd></dl>'+(c.method?'<p class="pjx-note">Dasar: '+esc(c.method)+'.</p>':'')+'</div>';
    }else h+='<div class="pjx-pc"><h4>Biaya · prognosa akhir '+esc(Y)+'</h4><div class="pjx-empty" style="padding:18px 0">'+esc(c&&c.error?'Tidak bisa dihitung: '+c.error:'Realisasi keuangan atau RKAP '+Y+' belum diinput di Laporan Bulanan.')+'</div></div>';
    if(fin(f.prognosis)){
      var a=Math.max(0,Math.min(100,f.prognosis)),pd=fin(f.planDec)?Math.max(0,Math.min(100,f.planDec)):null;
      h+='<div class="pjx-pc"><h4>Fisik · prognosa akhir '+esc(Y)+'</h4><div class="pjx-big">'+pc(f.prognosis)+'</div><div class="pjx-sub">Rencana akhir '+esc(Y)+' '+pc(f.planDec)+(f.finishInYear?' (baseline selesai tahun ini)':' · W'+esc(f.weekDec))+'</div>'+
        '<div class="pjx-bar"><i style="width:'+a+'%"></i>'+(pd===null?'':'<u style="left:calc('+pd+'% - 1px)"></u>')+'</div>'+
        '<dl><dt>Aktual W'+esc(f.week)+'</dt><dd>'+pc(f.actualNow)+'</dd><dt>Plan W'+esc(f.week)+'</dt><dd>'+pc(f.planNow)+'</dd><dt>Deviasi akhir '+esc(Y)+'</dt><dd class="'+devCls(f.deviation)+'">'+(fin(f.deviation)&&f.deviation>0?'+':'')+pc(f.deviation)+'</dd></dl>'+
        '<p class="pjx-note">Dasar: aktual minggu terakhir ditambah kenaikan rencana s.d. akhir Desember (deviasi dianggap tetap).</p></div>';
    }else h+='<div class="pjx-pc"><h4>Fisik · prognosa akhir '+esc(Y)+'</h4><div class="pjx-empty" style="padding:18px 0">Plan atau realisasi kumulatif belum lengkap.</div></div>';
    return h+'</div>';
  }
  function rProg(d,P){return head('Prognosa akhir tahun'+(d&&d.year?' '+d.year:''),P.name,d&&d.week?'Data s.d. W'+d.week:'')+progHtml(d)}
  function render(kind,data,P){P=P||{};try{return kind==='week'?rWeek(data,P):kind==='fin'?rFin(data,P):kind==='la'?rLa(data,P):rProg(data,P)}catch(e){return '<div class="pjx-empty">Slide tidak bisa ditampilkan: '+esc(e.message||e)+'</div>'}}
  function title(x){return (SHORT[x.kind]||'Slide proyek')+' · '+(x.title||x.project)}
  /* objek slide untuk pmoPresent */
  function slide(x,opt){
    opt=opt||{};
    return {title:opt.title||title(x),extra:!opt.title,scroll:x.kind==='la',dw:x.kind==='la'||x.kind==='fin'?1320:1280,
      html:'<div class="pjx" data-pj="'+esc(x.project)+'"><div class="pjx-load">Memuat '+esc((SHORT[x.kind]||'slide').toLowerCase())+' '+esc(x.title||x.project)+'…</div></div>',
      after:function(card){var box=card.querySelector('.pjx');if(!box)return;
        load(x.project,x.kind).then(function(r){box.innerHTML=render(x.kind,r&&r.data,(r&&r.project)||{name:x.title||x.project});try{window.dispatchEvent(new Event('resize'))}catch(e){}})
        .catch(function(e){box.innerHTML='<div class="pjx-empty">'+esc((e&&e.message)||'Data slide gagal dimuat.')+'</div>'})}};
  }
  /* card Prognosa di Weekly Progress */
  function progCard(d){
    var box=document.getElementById('progBox'),yr=document.getElementById('progYear');if(!box)return;
    if(yr)yr.textContent=d&&d.year?String(d.year):'';
    box.innerHTML=progHtml(d);
  }
  window.pmoPresProj={KINDS:KINDS,SHORT:SHORT,slide:slide,title:title,render:render,load:load,progCard:progCard};
})();
</script>`;

/** Patch halaman: card Prognosa + slide bawaan Weekly. */
const HTML_PATCHES = [
  {
    file: 'Dashboard',
    find: '<div id="finBox" class="fin"><div class="fin-empty">Memuat realisasi keuangan…</div></div>',
    replace: '<div id="finBox" class="fin"><div class="fin-empty">Memuat realisasi keuangan…</div></div>\n' +
      '        <div class="ph ph-sub" id="progHead"><span class="pi"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg></span><h3>Prognosa akhir tahun <span id="progYear"></span></h3></div>\n' +
      '        <div id="progBox"><div class="pjx-empty">Memuat prognosa…</div></div>',
  },
  {
    file: 'Dashboard',
    find: 'try{renderFin(data.finance)}catch(e){}',
    replace: 'try{renderFin(data.finance)}catch(e){}try{if(window.pmoPresProj)pmoPresProj.progCard(data.prognosis)}catch(e){}',
  },
  {
    file: 'Dashboard',
    find: "      if(fin)S.push({title:'Realisasi keuangan',wrap:'panel',nodes:[subs[1],fin]});",
    replace: "      if(fin)S.push({title:'Realisasi keuangan',wrap:'panel',nodes:[subs[1],fin]});\n" +
      "      const pgH=q('#progHead'),pgB=q('#progBox');if(pgB)S.push({title:'Prognosa akhir tahun',wrap:'panel',dw:1040,nodes:[pgH,pgB]});\n" +
      "      const wpid=String(((q('#weeklyProjectName')||{}).dataset||{}).pid||window.__pmoWeeklyPid||'');\n" +
      "      if(wpid&&window.pmoPresProj){S.push(pmoPresProj.slide({project:wpid,kind:'fin',title:proj},{title:'Realisasi keuangan (cut-off bulanan)'}));S.push(pmoPresProj.slide({project:wpid,kind:'la',title:proj},{title:'3 Month Look Ahead'}))}",
  },
];

module.exports = { PRES_PROJ_GS, PRES_PROJ_JS, GS_PATCHES, HTML_PATCHES };

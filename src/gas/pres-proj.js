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
 * Target akhir tahun (nama lama: Prognosa; fungsi & id tetap presPrognosis_, #sec-prog, kind 'prog'):
 *   Biaya  = target RKAP tahun berjalan vs realisasi s.d. bulan cut-off, rencana RKAP s.d. cut-off (bila RKAP
 *            bulanan diisi) dan sisa yang harus diserap. Tanpa prognosa / nilai investasi (permintaan pemilik 22 Nov).
 *   Fisik  = rencana baseline s.d. 31 Desember vs aktual minggu terakhir, sisa, kenaikan yang dibutuhkan per minggu,
 *            plus pekerjaan berbobot besar dari 3 Month Look Ahead.
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
  // Target = rencana baseline s.d. akhir Desember; dibandingkan dengan aktual minggu terakhir (tanpa forecast).
  const weekDec = pe ? Math.max(1, Math.min(wDec, pe)) : wDec;
  const left = Math.max(0, weekDec - week);
  const gap = planDec === null || actNow === null ? null : Math.max(0, planDec - actNow);
  const back = Math.max(1, week - 4), actBack = pct('KOMULATIF_REALISASI', back);
  const physical = { week: week, weekDec: weekDec, weeksLeft: left, planNow: planNow, actualNow: actNow, planDec: planDec,
    gap: gap, perWeek: gap === null ? null : (left ? gap / left : gap), planPerWeek: planDec === null || planNow === null || !left ? null : Math.max(0, planDec - planNow) / left,
    recentPerWeek: actNow === null || actBack === null || week <= back ? null : (actNow - actBack) / (week - back), recentWeeks: week - back,
    finishInYear: !!pe && wDec >= pe };

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
          rkapToDate: J(rkapToDate), monthlyRkap: restN > 0 || rkapToDate !== null,
          hist: hist, posEnd: prog === null ? null : (hist || 0) + prog, investment: inv,
          pctInv: inv && prog !== null ? ((hist || 0) + prog) / inv : null, method: method };
      }
    }
  } catch (e) { cost = { error: String(e && e.message || e) }; }
  return { year: Y, week: week, physical: physical, cost: cost };
}

/** Pekerjaan berbobot besar yang rencananya naik s.d. akhir tahun Y (dari 3 Month Look Ahead). */
function presProgItems_(token, projectId, Y) {
  try {
    const r = getExecutiveLookAhead(token, ''), want = normKey_(projectId);
    const pr = (r.projects || []).find(function(x) { return normKey_(x.id) === want; });
    if (!pr) return { items: [], months: [] };
    const months = (r.months || []).map(function(m, i) { return { i: i, label: m.label, year: Number(String(m.label || '').slice(-4)) }; }).filter(function(m) { return m.year === Number(Y); });
    // Selalu baseline EPCC Control (seragam untuk semua proyek; jadwal XML hanya ada di sebagian proyek).
    const fields = pr.source === 'XML' ? (pr.alt || []) : (pr.fields || []);
    const map = {}, list = [];
    fields.forEach(function(f) {
      months.forEach(function(m) {
        ((f.months && f.months[m.i]) || []).forEach(function(t) {
          const k = f.name + '|' + (t.groupCode || '') + '|' + t.code + '|' + t.name;
          let x = map[k];
          if (!x) { x = map[k] = { field: f.name, code: t.code, name: t.name, group: t.groupName || '', actual: t.actual, target: t.target, contribution: 0, status: t.status || '', until: m.label }; list.push(x); }
          x.contribution += Number(t.contribution) || 0; x.target = t.target; x.until = m.label;
        });
      });
    });
    list.sort(function(a, b) { return b.contribution - a.contribution; });
    return { items: list.slice(0, 6), total: list.length, months: months.map(function(m) { return m.label; }), source: 'EPCC', noBaseline: !fields.some(function(f) { return f.baseline; }) };
  } catch (e) { return { items: [], months: [], error: String(e && e.message || e) }; }
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
  if (kind === 'prog') {
    const base = perfCached_('presProj|' + p.id + '|prog', function() { return presPrognosis_(db, p, weeklyInfo_(db, p).latestWeek); });
    const out = Object.assign({}, base);
    if (base && base.year) out.work = presProgItems_(token, p.id, base.year);
    return { success: true, kind: kind, project: head, data: out };
  }
  return perfCached_('presProj|' + p.id + '|' + kind, function() {
    const info = weeklyInfo_(db, p);
    if (kind === 'week') {
      if (!info.latestWeek) return { success: true, kind: kind, project: head, data: { none: true } };
      const d = buildWeeklyData_(user, null, p.id);
      return { success: true, kind: kind, project: head, data: { week: d.week, period: d.period, overall: d.overall, fields: d.fields,
        duration: d.duration, highlight: d.highlight || '', concern: d.concern || null, stage: d.lifecycle && d.lifecycle.stage || '' } };
    }
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
.pjx-ig{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.pjx-ic{border:1px solid var(--line,#dbe5ee);border-top:4px solid #f5c547;border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:7px;font-size:13.5px;line-height:1.45;min-width:0}
.pjx-ic.hi{border-top-color:#ed4c4c}.pjx-ic.lo{border-top-color:#9bd8f7}.pjx-ic.closed{opacity:.72}
.pjx-ict{display:flex;gap:6px;flex-wrap:wrap}
.pjx-sv,.pjx-tg,.pjx-st2{display:inline-block;padding:2px 9px;border-radius:99px;font-size:11.5px;font-weight:700}
.pjx-sv.hi{background:rgba(237,76,76,.16);color:#b42318}.pjx-sv.md{background:rgba(245,197,71,.22);color:#8a5a00}.pjx-sv.lo{background:rgba(8,127,193,.12);color:#0c5f93}
.pjx-tg{background:rgba(127,140,153,.14);color:var(--muted,#5b7085);font-weight:600}
.pjx-ih{font-size:16px;font-weight:800;line-height:1.3}
.pjx-id{color:var(--muted,#5b7085)}
.pjx-ia{background:rgba(8,127,193,.10);color:#0c5f93;border-radius:9px;padding:7px 10px}
[data-theme=dark] .pjx-ia{color:#9fd3ff}
.pjx-if{margin-top:auto;display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:12.5px;color:var(--muted,#5b7085)}
.pjx-st2{margin-left:auto;background:rgba(245,197,71,.22);color:#8a5a00}.pjx-st2.new{background:rgba(237,76,76,.14);color:#b42318}.pjx-st2.done{background:rgba(54,189,131,.18);color:#16875d}
.pjx-cnt{display:flex;gap:6px;border:0!important;padding:0!important}.pjx-cnt i{font-style:normal;padding:4px 11px;border-radius:99px;font-size:12.5px;font-weight:700;background:rgba(127,140,153,.14)}
.pjx-cnt i.hi{background:rgba(237,76,76,.16);color:#b42318}.pjx-cnt i.md{background:rgba(245,197,71,.22);color:#8a5a00}.pjx-cnt i.ask{background:rgba(8,127,193,.12);color:#0c5f93}
.pp-card .pjx-ic{font-size:15px;gap:9px;padding:14px 16px}.pp-card .pjx-ih{font-size:19px}.pp-card .pjx-if{font-size:13.5px}
/* Weekly: Profil proyek horizontal + Highlight 2 kolom */
.pp-card #highlights{columns:2;column-gap:32px}.pp-card #highlights li{break-inside:avoid}
#sec-profil.prof-h,#sec-hl{margin-bottom:var(--gap,18px)}
#sec-profil.prof-h .pb.flush{display:grid;grid-template-columns:minmax(0,2.2fr) repeat(5,minmax(0,1fr));gap:12px;padding:16px 18px}
#sec-profil.prof-h .profile-row{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--soft);min-width:0}
#sec-profil.prof-h .profile-row:last-child{border-bottom:1px solid var(--line)}
#sec-profil.prof-h .profile-row>b{font-size:12px;gap:8px;color:var(--muted)}#sec-profil.prof-h .profile-row>b .ic{width:24px;height:24px;padding:4px;border-radius:7px}
#sec-profil.prof-h .profile-row>span{font-weight:700;color:var(--ink);font-size:14px;line-height:1.4;overflow-wrap:anywhere}
#sec-profil.prof-h #projectPurpose{font-weight:500;font-size:13px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
#sec-hl ol.highlight{columns:2;column-gap:32px}#sec-hl ol.highlight li{break-inside:avoid}
@media (max-width:1100px){#sec-profil.prof-h .pb.flush{grid-template-columns:repeat(3,minmax(0,1fr))}#sec-profil.prof-h .profile-row:first-child{grid-column:1/-1}}
@media (max-width:700px){#sec-profil.prof-h .pb.flush{grid-template-columns:repeat(2,minmax(0,1fr));padding:12px}#sec-hl ol.highlight{columns:1}}
html.m-mode #sec-profil.prof-h .pb.flush{grid-template-columns:repeat(2,minmax(0,1fr));padding:12px}html.m-mode #sec-hl ol.highlight{columns:1}
.pjx-im{position:fixed;inset:0;z-index:2147482600;display:flex;align-items:center;justify-content:center;background:rgba(3,10,20,.55);font-family:Inter,"Segoe UI",system-ui,sans-serif;color:#132b43;color-scheme:light}
.pjx-imb{width:min(980px,94vw);max-height:90vh;display:flex;flex-direction:column;background:#f6f9fc;border-radius:16px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.45)}
.pjx-imh{display:flex;align-items:center;gap:12px;padding:12px 18px;background:#0f2f52;color:#fff}.pjx-imh b{display:block;font-size:15px}.pjx-imh small{color:#9fc3e2;font-size:12px}
.pjx-imx{margin-left:auto;background:rgba(255,255,255,.12);border:0;color:#fff;width:32px;height:32px;border-radius:9px;font-size:18px;cursor:pointer}
.pjx-imc{overflow:auto;padding:14px 18px 18px;--line:#d9e3ec;--muted:#5b7085}
.pjx-imr{display:flex;gap:10px;align-items:stretch;margin-bottom:10px}.pjx-imr .pjx-ic{background:#fff}
.pjx-ima{display:flex;flex-direction:column;gap:6px;justify-content:center}
.pjx-fm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;background:#fff;border:1px solid #d5e0ea;border-radius:12px;padding:14px;margin-bottom:14px}
.pjx-fm label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#5b7085}.pjx-fm .w{grid-column:1/3}
.pjx-fm input,.pjx-fm select,.pjx-fm textarea{padding:8px 10px;border:1px solid #c9d6e2;border-radius:9px;font:13px Inter,system-ui,sans-serif;background:#fff!important;color:#132b43!important}
.pjx-fnarr{margin-top:16px;font-size:15px;line-height:1.6}.pjx-fnarr p{margin:0 0 8px}.pjx-fnarr ul{margin:0 0 12px;padding-left:22px}.pjx-fnarr li{margin:0 0 6px}.pjx-ref{font-weight:700}
.pjx-work{margin-top:14px}.pjx-tv small{display:block;color:var(--muted,#5b7085);font-size:11.5px}.pjx-work h4{margin:0 0 8px;font-size:14px;font-weight:700}.pjx-work h4 small{font-weight:500;color:var(--muted,#5b7085)}.pjx-work .pjx-tbl{font-size:13px}
#sec-prog{margin-bottom:var(--gap,18px)}
#progBox{padding:16px 18px 18px}
#progBox .pjx-pc .pjx-big{font-size:24px}
#progBox .pjx-pg{grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))}
@media (max-width:700px){#progBox{padding:12px}.pjx-work .pjx-tbl thead{display:none}.pjx-work .pjx-tbl,.pjx-work .pjx-tbl tbody,.pjx-work .pjx-tbl tr,.pjx-work .pjx-tbl td{display:block;width:100%;box-sizing:border-box}.pjx-work .pjx-tbl tr{border:1px solid var(--line,#dbe5ee);border-radius:12px;padding:10px 12px;margin-bottom:10px}.pjx-work .pjx-tbl td{border:0;padding:3px 0;text-align:left!important}.pjx-work .pjx-tbl td[data-l]{display:flex;justify-content:space-between;gap:12px}.pjx-work .pjx-tbl td[data-l]::before{content:attr(data-l);color:var(--muted,#5b7085);font-weight:500}.pjx-work .pjx-tv small{display:inline!important;margin-left:6px}.pjx-pc dl{grid-template-columns:minmax(0,1fr) auto}}
html.m-mode #progBox{padding:12px}
.pp-card .pjx .pjx-pc .pjx-big{font-size:34px}
</style>
<script>
(function(){
  if(window.pmoPresProj)return;
  var KINDS=[['week','Ringkasan minggu terakhir'],['fin','Realisasi keuangan (cut-off bulanan)'],['la','3 Month Look Ahead'],['prog','Target akhir tahun (biaya & fisik)']];
  var SHORT={week:'Ringkasan minggu',fin:'Keuangan cut-off',la:'Look Ahead 3 bulan',prog:'Target akhir tahun'};
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
    if(!d||d.none||d.error)return '<div class="pjx-empty">'+esc(d&&(d.note||d.error)||'Target akhir tahun belum dapat dihitung.')+'</div>';
    var c=d.cost,f=d.physical||{},Y=d.year,h='<div class="pjx-pg">';
    if(c&&!c.error&&fin(c.rkap)&&c.rkap>0){
      var real=fin(c.real)?c.real:0,gap=Math.max(0,c.rkap-real),done=gap<=0.0005,wr=Math.max(0,Math.min(100,real/c.rkap*100));
      var hasTo=fin(c.rkapToDate)&&c.rkapToDate>0,mk=hasTo?Math.max(0,Math.min(100,c.rkapToDate/c.rkap*100)):null;
      h+='<div class="pjx-pc"><h4>Biaya · target RKAP '+esc(Y)+'</h4><div class="pjx-big">'+mly(c.rkap)+'</div><div class="pjx-sub">Target serapan s.d. 31 Desember '+esc(Y)+'</div>'+
        '<div class="pjx-bar"><i style="width:'+wr+'%"></i>'+(mk===null?'':'<u style="left:calc('+mk+'% - 1px)"></u>')+'</div>'+
        '<dl><dt>Realisasi s.d. '+esc(c.cutoff)+(c.lag?' (cut-off terakhir)':'')+'</dt><dd>'+mly(real)+' · '+pc(real/c.rkap*100)+'</dd>'+
        (hasTo?'<dt>Rencana RKAP s.d. '+esc(c.cutoff)+'</dt><dd>'+mly(c.rkapToDate)+' · serapan '+pc(real/c.rkapToDate*100,1)+'</dd>':'')+
        '<dt><b>Sisa yang harus diserap</b></dt><dd class="'+(done?'pjx-good':'pjx-bad')+'"><b>'+(done?'Sudah tercapai':mly(gap))+'</b></dd></dl></div>';
    }else h+='<div class="pjx-pc"><h4>Biaya · target RKAP '+esc(Y)+'</h4><div class="pjx-empty" style="padding:18px 0">'+esc(c&&c.error?'Tidak bisa dihitung: '+c.error:'RKAP '+Y+' belum diinput di Laporan Bulanan.')+'</div></div>';
    if(fin(f.planDec)&&fin(f.actualNow)){
      var a=Math.max(0,Math.min(100,f.actualNow)),pd=Math.max(0,Math.min(100,f.planDec)),done=f.gap<=0.005;
      h+='<div class="pjx-pc"><h4>Fisik · target baseline akhir '+esc(Y)+'</h4><div class="pjx-big">'+pc(f.planDec)+'</div><div class="pjx-sub">Rencana baseline s.d. '+(f.finishInYear?'selesai (W'+esc(f.weekDec)+')':'W'+esc(f.weekDec)+' · 31 Desember '+esc(Y))+'</div>'+
        '<div class="pjx-bar"><i style="width:'+a+'%"></i><u style="left:calc('+pd+'% - 1px)"></u></div>'+
        '<dl><dt>Aktual W'+esc(f.week)+'</dt><dd>'+pc(f.actualNow)+'</dd><dt>Sisa yang harus dicapai</dt><dd class="'+(done?'pjx-good':'pjx-bad')+'">'+(done?'Sudah tercapai':pc(f.gap))+'</dd>'+
        '<dt>Sisa waktu</dt><dd>'+(f.weeksLeft?esc(f.weeksLeft)+' minggu (W'+esc(f.week+1)+'–W'+esc(f.weekDec)+')':'minggu terakhir')+'</dd>'+
        (done?'':'<dt><b>Kenaikan yang dibutuhkan</b></dt><dd><b>'+pc(f.perWeek)+' / minggu</b></dd>')+
        (fin(f.planPerWeek)?'<dt>Kenaikan rencana baseline</dt><dd>'+pc(f.planPerWeek)+' / minggu</dd>':'')+
        (fin(f.recentPerWeek)?'<dt>Rata-rata aktual '+esc(f.recentWeeks)+' minggu terakhir</dt><dd>'+pc(f.recentPerWeek)+' / minggu</dd>':'')+'</dl></div>';
    }else h+='<div class="pjx-pc"><h4>Fisik · target baseline akhir '+esc(Y)+'</h4><div class="pjx-empty" style="padding:18px 0">Plan atau realisasi kumulatif belum lengkap.</div></div>';
    h+='</div>'+workHtml(d.work);
    return h;
  }
  function workHtml(w){
    if(w===undefined)return '<div class="pjx-work" data-wait="1"><h4>Pekerjaan berbobot besar s.d. akhir tahun</h4><div class="pjx-empty" style="padding:12px 0">Memuat pekerjaan…</div></div>';
    var L=(w&&w.items)||[];
    var h='<div class="pjx-work"><h4>Pekerjaan berbobot besar yang menunjang kenaikan s.d. akhir tahun'+(w&&w.months&&w.months.length?' <small>('+esc(w.months.join(', '))+')</small>':'')+'</h4>';
    if(!L.length)return h+'<div class="pjx-empty" style="padding:12px 0">'+esc(w&&w.error?'Data pekerjaan belum dapat dibaca.':w&&w.noBaseline?'Baseline EPCC Control proyek ini belum tersedia.':'Tidak ada pekerjaan dengan kenaikan rencana pada sisa tahun ini di baseline EPCC Control.')+'</div></div>';
    h+='<table class="pjx-tbl"><thead><tr><th style="text-align:left">Bidang</th><th style="text-align:left">Pekerjaan</th><th>Aktual</th><th>Target</th><th>+ Bobot proyek</th></tr></thead><tbody>'+
      L.map(function(t){return '<tr><td style="color:var(--muted,#5b7085)">'+esc(t.field)+'</td><td><b>'+esc(t.name)+'</b>'+(t.group?'<br><small style="color:var(--muted,#5b7085)">'+esc(t.group)+'</small>':'')+'</td><td data-l="Aktual" style="text-align:right">'+pc(t.actual)+'</td><td data-l="Target" style="text-align:right"><span class="pjx-tv">'+pc(t.target)+'<small>akhir '+esc(t.until)+'</small></span></td><td data-l="+ Bobot proyek" style="text-align:right"><b>+'+pc(t.contribution)+'</b></td></tr>'}).join('')+'</tbody></table>';
    return h+'<p class="pjx-note">Diurutkan dari kontribusi terbesar terhadap progres proyek'+(w.total>L.length?' (6 dari '+w.total+' pekerjaan)':'')+'. Sumber: '+(w.source==='XML'?'Jadwal XML (Master Schedule)':'EPCC Control')+'.</p></div>';
  }
  function rProg(d,P){return head('Target akhir tahun'+(d&&d.year?' '+d.year:''),P.name,d&&d.week?'Data s.d. W'+d.week:'')+progHtml(d)}
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
    var wb=box.querySelector('.pjx-work[data-wait]'),pid=String(window.__pmoWeeklyPid||'');
    if(wb&&pid)load(pid,'prog').then(function(r){if(wb.isConnected)wb.outerHTML=workHtml(r&&r.data&&r.data.work||{items:[]})}).catch(function(){if(wb.isConnected)wb.outerHTML=workHtml({items:[],error:1})});
    else if(wb)wb.remove();
  }
  /* Ringkasan eksekutif di mode presentasi: tautan bagian halaman diganti nama slide yang menjelaskannya */
  function briefRefs(card,map){
    card.querySelectorAll('a[data-xgo]').forEach(function(a){var t=map[a.getAttribute('data-xgo')]||a.textContent;var b=document.createElement('b');b.className='pjx-ref';b.textContent='slide “'+t+'”';a.replaceWith(b)});
    card.querySelectorAll('.xb-act').forEach(function(x){x.remove()});
  }
  /* Narasi realisasi keuangan portofolio (gaya Laporan Bulanan) dari data Monthly Executive Review */
  function finNarr(d){
    var F=d&&d.financial;if(!F||!Array.isArray(F.rows)||!F.rows.length)return '';
    var G=(d.groups&&d.groups.map)||{},ty=function(id){var g=G[id]||{};var t=g.type||'PENGEMBANGAN';if(t==='SUB'&&g.parent)t=(G[g.parent]&&G[g.parent].type)||'PENGEMBANGAN';return t==='RUTIN'?'RUTIN':'PENGEMBANGAN'};
    var per=String(F.period||d.period||''),mon=per.split(' ')[0]||'',yr=per.split(' ')[1]||'';
    var rp=function(j){return fin(j)?'Rp. '+Math.round(j*1e6).toLocaleString('id-ID'):'-'},px=function(v){return fin(v)?(v*100).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+'%':'-'};
    var B=function(t){return String(t).split(/(Rp\.?\s?[\d.]+(?:,\d+)?|\d+(?:,\d+)?\s?%)/).map(function(x,i){return i%2?'<b>'+esc(x)+'</b>':esc(x)}).join('')};
    var sent=function(a,r,inv,pos){return 'realisasi biaya sampai dengan bulan '+mon+' '+yr+' sebesar '+rp(a)+' atau '+px(r?a/r:null)+' dari nilai RKAP '+yr+' sebesar '+rp(r)+',- dan posisi biaya dari awal sampai dengan bulan '+mon+' '+yr+' sebesar '+rp(pos)+' atau '+px(inv&&pos!=null?pos/inv:null)+' dari Total Nilai Investasi sebesar '+rp(inv)+',-'};
    var nm=function(r){var n=String(r.project||r.projectId||'');return typeof pmoProjName==='function'?pmoProjName(n):n};
    var h='<div class="pjx-fnarr"><p style="margin:0 0 6px">catatan :</p>';
    [['PENGEMBANGAN','Proyek Pengembangan'],['RUTIN','Proyek Investasi Rutin']].forEach(function(g){
      var L=F.rows.filter(function(r){return ty(r.projectId)===g[0]});if(!L.length)return;
      var S=function(k){var t=null;L.forEach(function(r){if(fin(r[k]))t=(t||0)+Number(r[k])});return t};
      h+='<p><b>'+g[1]+'</b> ('+L.length+' proyek): '+B(sent(S('actualToDate'),S('rkap2026'),S('investment'),S('totalToDate')))+'</p><ul>'+
        L.map(function(r){return '<li><b>'+esc(nm(r))+'</b>: '+B(sent(r.actualToDate,r.rkap2026,r.investment,r.totalToDate))+'</li>'}).join('')+'</ul>';
    });
    if(F.basis)h+='<p class="pjx-note">Berdasarkan Laporan Keuangan Bulan '+esc(F.basis.period||'')+' (data '+esc(F.basis.selected||'')+' belum lengkap).</p>';
    return h+'</div>';
  }
  /* ================= Isu manajemen (satu sumber untuk Monthly & Weekly) ================= */
  var ISS={},SEVR={Tinggi:0,Sedang:1,Rendah:2},PER=3;
  function role(){try{var u=JSON.parse(sessionStorage.getItem('pmoUser')||'null');return String(u&&u.role||'').toUpperCase()}catch(e){return ''}}
  function api(url,opt){return fetch(url,Object.assign({credentials:'same-origin',headers:{'content-type':'application/json'}},opt||{})).then(function(r){return r.json().catch(function(){return {ok:false,error:'Server tidak merespons ('+r.status+').'}})}).then(function(j){if(!j.ok)throw new Error(j.error||'Permintaan gagal.');return j.data})}
  function issKey(o){return o.pid?'w:'+o.pid:'m'}
  function issScope(cfg){
    if(/weekly/i.test(String(cfg&&cfg.page||''))){var el=document.getElementById('weeklyProjectName');var pid=String((el&&el.dataset&&el.dataset.pid)||window.__pmoWeeklyPid||'');return {pid:pid,days:7,name:String((el||{}).textContent||'').trim()}}
    var per='';try{per=String((document.getElementById('periodValue')||{}).textContent||'').trim()}catch(e){}
    return {pid:'',days:31,period:per};
  }
  function fetchIss(o,force){
    var k=issKey(o);if(ISS[k]&&ISS[k].p&&!force)return ISS[k].p;
    var e=ISS[k]=ISS[k]||{};
    e.p=api('/api/pres/issues?days='+o.days+(o.pid?'&project='+encodeURIComponent(o.pid):'')).then(function(d){e.d=d;return d}).catch(function(err){e.p=null;throw err});
    return e.p;
  }
  function grpType(id){var G=null;try{G=(currentReportData&&currentReportData.groups&&currentReportData.groups.map)||null}catch(e){}G=G||{};var g=G[id]||{};var t=g.type||'PENGEMBANGAN';if(t==='SUB'&&g.parent)t=(G[g.parent]&&G[g.parent].type)||'PENGEMBANGAN';return t==='RUTIN'?1:0}
  function sorted(list,o){
    return list.slice().sort(function(a,b){
      var ca=a.status==='Selesai'?1:0,cb=b.status==='Selesai'?1:0;if(ca!==cb)return ca-cb;
      if(!o.pid){var ga=grpType(a.project),gb=grpType(b.project);if(ga!==gb)return ga-gb}
      var sa=SEVR[a.severity]==null?1:SEVR[a.severity],sb=SEVR[b.severity]==null?1:SEVR[b.severity];if(sa!==sb)return sa-sb;
      var ka=a.ask?0:1,kb=b.ask?0:1;if(ka!==kb)return ka-kb;
      return String(a.projectName||'').localeCompare(String(b.projectName||''));
    });
  }
  function nmP(n){return typeof pmoProjName==='function'?pmoProjName(n):n}
  function dt(v){if(!v)return '';var d=new Date(v+'T00:00:00');return isNaN(d)?v:d.getDate()+' '+['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]+' '+d.getFullYear()}
  function issCard(x,showProj){
    var sc=x.severity==='Tinggi'?'hi':x.severity==='Rendah'?'lo':'md',stc=x.status==='Selesai'?'done':x.status==='Baru'?'new':'run';
    return '<div class="pjx-ic '+sc+(x.status==='Selesai'?' closed':'')+'"><div class="pjx-ict"><span class="pjx-sv '+sc+'">'+esc(x.severity)+'</span>'+(showProj?'<span class="pjx-tg">'+esc(nmP(x.projectName||x.project))+'</span>':'')+'<span class="pjx-tg">'+esc(x.category)+'</span></div>'+
      '<div class="pjx-ih">'+esc(x.title)+'</div>'+(x.detail?'<div class="pjx-id">'+esc(x.detail)+'</div>':'')+
      (x.ask?'<div class="pjx-ia"><b>Dukungan yang diminta:</b> '+esc(x.ask)+'</div>':'')+
      '<div class="pjx-if">'+[x.pic?esc(x.pic):'',x.target?'target '+esc(dt(x.target)):''].filter(Boolean).join(' · ')+'<span class="pjx-st2 '+stc+'">'+esc(x.status)+'</span></div></div>';
  }
  function issHtml(list,o,part,parts){
    var open=list.filter(function(x){return x.status!=='Selesai'}),hi=open.filter(function(x){return x.severity==='Tinggi'}).length,md=open.filter(function(x){return x.severity==='Sedang'}).length,ask=open.filter(function(x){return x.ask}).length;
    var eye='Isu manajemen'+(o.pid?'':o.period?' · cut-off '+o.period:'')+(parts>1?' · '+part+'/'+parts:'');
    var h='<div class="pjx-h"><div><small>'+esc(eye)+'</small><h3>'+(o.pid?esc(nmP(o.name||o.pid)):'Isu dan keputusan yang diperlukan')+'</h3></div><span class="pjx-per pjx-cnt">'+
      (hi?'<i class="hi">'+hi+' tinggi</i>':'')+(md?'<i class="md">'+md+' sedang</i>':'')+(ask?'<i class="ask">'+ask+' butuh keputusan</i>':'')+(!open.length?'<i>Tidak ada isu terbuka</i>':'')+'</span></div>';
    var chunk=list.slice((part-1)*PER,part===parts?list.length:part*PER);
    if(!list.length)return h+'<div class="pjx-empty">Belum ada isu manajemen'+(o.pid?' untuk proyek ini':'')+'. Tambahkan lewat tombol <b>Isu manajemen</b> di layar Siapkan presentasi.</div>';
    return h+'<div class="pjx-ig">'+chunk.map(function(x){return issCard(x,!o.pid||x.project!==o.pid)}).join('')+'</div><p class="pjx-note">Urutan: tingkat, lalu yang butuh keputusan. Isu yang belum selesai otomatis terbawa ke periode berikutnya; isu selesai tampil '+(o.pid?'7':'31')+' hari setelah ditutup.</p>';
  }
  /* slide isu untuk build(): dipecah 3 isu per slide bila data sudah dimuat */
  function issueSlides(cfgOrScope){
    if(role()==='KONTRAKTOR')return [];
    var o=cfgOrScope&&cfgOrScope.days?cfgOrScope:issScope(cfgOrScope),e=ISS[issKey(o)],list=e&&e.d?sorted(e.d.issues||[],o):null;
    if(!e||!e.p)fetchIss(o).catch(function(){});
    var parts=list?Math.max(1,Math.ceil(list.length/PER)):1,out=[];
    for(var i=1;i<=parts;i++)(function(part){
      out.push({title:'Isu manajemen'+(part>1?' ('+part+'/'+parts+')':''),scroll:true,dw:1320,html:'<div class="pjx" data-iss="'+part+'"><div class="pjx-load">Memuat isu manajemen…</div></div>',
        after:function(card){var box=card.querySelector('.pjx[data-iss]');if(!box)return;
          var fill=function(){var d=ISS[issKey(o)]&&ISS[issKey(o)].d;var L=sorted((d&&d.issues)||[],o);box.innerHTML=issHtml(L,o,part,part===parts?part:parts)};
          var e2=ISS[issKey(o)];if(e2&&e2.d)fill();else fetchIss(o).then(fill).catch(function(err){box.innerHTML='<div class="pjx-empty">'+esc(err.message||'Isu manajemen gagal dimuat.')+'</div>'})}});
    })(i);
    return out;
  }
  function prefetch(cfg){if(role()==='KONTRAKTOR')return Promise.resolve();return fetchIss(issScope(cfg),true).catch(function(){})}
  /* panel kelola isu (dari layar Siapkan presentasi) */
  function manageIssues(cfg,opt){
    opt=opt||{};var o=issScope(cfg),list=[],D={},edit=null;
    var m=document.createElement('div');m.className='px-mg pjx-im';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','Isu manajemen');
    m.innerHTML='<div class="pjx-imb"><div class="pjx-imh"><div><b>Isu manajemen</b><small>'+(o.pid?'Proyek '+esc(nmP(o.name||o.pid))+' dan sub-proyeknya':'Semua proyek · satu sumber dengan Weekly')+'</small></div><button type="button" class="pjx-imx" aria-label="Tutup">×</button></div><div class="pjx-imc"><div class="pjx-load">Memuat…</div></div></div>';
    document.body.appendChild(m);
    var C=m.querySelector('.pjx-imc');
    var onKey=function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done()}};window.addEventListener('keydown',onKey,true);
    function done(){window.removeEventListener('keydown',onKey,true);m.remove();fetchIss(o,true).catch(function(){}).then(function(){if(opt.onClose)opt.onClose()})}
    m.querySelector('.pjx-imx').onclick=done;
    function refresh(){return fetchIss(o,true).then(function(d){D=d;list=sorted(d.issues||[],o);draw()}).catch(function(e){C.innerHTML='<div class="pjx-empty">'+esc(e.message)+'</div>'})}
    function draw(){
      var can=(D.allowedProjects||[]).length>0;
      C.innerHTML=(can?'<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><button type="button" class="pq-btn pri sm" data-in="new">+ Tambah isu</button><span class="pq-note">'+list.filter(function(x){return x.status!=='Selesai'}).length+' isu terbuka</span></div>':'<p class="pq-note">Anda hanya dapat melihat isu.</p>')+
        '<div class="pjx-imf"></div>'+(list.length?list.map(function(x){return '<div class="pjx-imr" data-id="'+x.id+'"><div style="flex:1;min-width:0">'+issCard(x,true)+'</div>'+(x.canEdit?'<div class="pjx-ima"><button type="button" class="pq-btn sm" data-ie="'+x.id+'">Ubah</button>'+(x.status!=='Selesai'?'<button type="button" class="pq-btn sm" data-ic="'+x.id+'">Tandai selesai</button>':'')+'<button type="button" class="pq-btn sm" data-id2="'+x.id+'" style="color:#b42318">Hapus</button></div>':'')+'</div>'}).join(''):'<div class="pjx-empty">Belum ada isu.</div>');
    }
    function form(x){
      var P=D.allowedProjects||[],op=D.options||{},f=C.querySelector('.pjx-imf');edit=x||{};
      var def=x?x.project:(o.pid&&P.some(function(p){return p.id===o.pid})?o.pid:(P[0]&&P[0].id));
      var sel=function(k,a,v){return '<select data-f="'+k+'">'+a.map(function(t){return '<option'+(t===v?' selected':'')+'>'+esc(t)+'</option>'}).join('')+'</select>'};
      f.innerHTML='<div class="pjx-fm"><label>Proyek<select data-f="project">'+P.map(function(p){return '<option value="'+esc(p.id)+'"'+(p.id===def?' selected':'')+'>'+esc(nmP(p.name))+'</option>'}).join('')+'</select></label>'+
        '<label>Kategori'+sel('category',op.categories||[],edit.category||'Lainnya')+'</label>'+
        '<label class="w">Judul isu<input data-f="title" maxlength="200" value="'+esc(edit.title||'')+'" placeholder="Izin PBG belum terbit"></label>'+
        '<label class="w">Uraian dan dampak<textarea data-f="detail" rows="2" maxlength="1200" placeholder="Pemasangan tangki tertunda ±3 minggu">'+esc(edit.detail||'')+'</textarea></label>'+
        '<label class="w">Dukungan / keputusan yang diminta dari manajemen<input data-f="ask" maxlength="600" value="'+esc(edit.ask||'')+'" placeholder="Eskalasi ke Pemkab via Direksi (kosongkan bila tidak ada)"></label>'+
        '<label>Tingkat'+sel('severity',op.severities||[],edit.severity||'Sedang')+'</label><label>Status'+sel('status',op.statuses||[],edit.status||'Baru')+'</label>'+
        '<label>PIC tindak lanjut<input data-f="pic" maxlength="120" value="'+esc(edit.pic||'')+'" placeholder="PIC Teknik"></label><label>Target selesai<input type="date" data-f="target" value="'+esc(edit.target||'')+'"></label>'+
        '<div class="w" style="display:flex;gap:8px;justify-content:flex-end;align-items:center"><span class="pjx-fmm" style="margin-right:auto;font-size:12.5px"></span><button type="button" class="pq-btn sm" data-in="cancel">Batal</button><button type="button" class="pq-btn pri sm" data-in="save">Simpan isu</button></div></div>';
      var t=f.querySelector('[data-f=title]');if(t)t.focus();
    }
    C.addEventListener('click',function(e){
      var b=e.target.closest('button');if(!b)return;
      var a=b.getAttribute('data-in');
      if(a==='new')return form(null);
      if(a==='cancel'){C.querySelector('.pjx-imf').innerHTML='';return}
      if(a==='save'){var f=C.querySelector('.pjx-imf'),body={id:edit&&edit.id||undefined};f.querySelectorAll('[data-f]').forEach(function(i){body[i.getAttribute('data-f')]=i.value});
        var msg=f.querySelector('.pjx-fmm');if(!String(body.title||'').trim()){msg.textContent='Isi judul isu dulu.';msg.style.color='#b42318';return}
        b.disabled=true;msg.textContent='Menyimpan…';msg.style.color='';
        api('/api/pres/issues',{method:'POST',body:JSON.stringify(body)}).then(refresh).catch(function(err){b.disabled=false;msg.textContent=err.message;msg.style.color='#b42318'});return}
      var id=Number(b.getAttribute('data-ie')||b.getAttribute('data-ic')||b.getAttribute('data-id2'));if(!id)return;var x=list.filter(function(y){return y.id===id})[0];if(!x)return;
      if(b.hasAttribute('data-ie'))return form(x);
      if(b.hasAttribute('data-ic')){b.disabled=true;api('/api/pres/issues',{method:'POST',body:JSON.stringify(Object.assign({},x,{status:'Selesai'}))}).then(refresh).catch(function(err){b.disabled=false;alert(err.message)});return}
      if(b.hasAttribute('data-id2')){if(!confirm('Hapus isu "'+x.title+'"? Isu yang sudah selesai sebaiknya ditandai Selesai, bukan dihapus.'))return;api('/api/pres/issues/'+id+'/delete',{method:'POST',body:'{}'}).then(refresh).catch(function(err){alert(err.message)})}
    });
    refresh();
  }
  window.pmoPresProj={KINDS:KINDS,SHORT:SHORT,slide:slide,title:title,render:render,load:load,progCard:progCard,briefRefs:briefRefs,finNarr:finNarr,issueSlides:issueSlides,prefetch:prefetch,manageIssues:manageIssues};
})();
</script>`;

/** Patch halaman: card Prognosa + slide bawaan Weekly. */
const HTML_PATCHES = [
  {
    // Monthly Executive Review: slide Isu manajemen setelah Ringkasan eksekutif.
    file: 'ExecutiveDashboard',
    find: "    add('#sec-progress>article');",
    replace: "    if(window.pmoPresProj)pmoPresProj.issueSlides({page:'Executive'}).forEach(function(s){S.push(s)});\n    add('#sec-progress>article');",
  },
  {
    // Weekly: slide Isu manajemen setelah Mitigasi risiko.
    file: 'Dashboard',
    find: "[['#sec-profil',1],['#sec-risiko',0],['#sec-risiko',1],['#sec-rtl',0],['#sec-msc',0],['#sec-hse',0]].forEach(function(x){const a=art(x[0],x[1]);if(a)S.push({title:ttl(a,'Slide'),node:a})});",
    replace: "[['#sec-hl',0],['#sec-risiko',0],['#sec-risiko',1],['#sec-rtl',0],['#sec-msc',0],['#sec-hse',0]].forEach(function(x){const a=art(x[0],x[1]);if(a)S.push({title:ttl(a,'Slide'),node:a});if(x[0]==='#sec-risiko'&&x[1]===1&&window.pmoPresProj)pmoPresProj.issueSlides({page:'Weekly Progress'}).forEach(function(s){S.push(s)})});",
  },
  {
    // Monthly Executive Review · slide Ringkasan eksekutif: "dapat dilihat pada <tautan>" → nama slide.
    file: 'ExecutiveDashboard',
    find: "const br=q('#sec-ringkasan');if(vis(br))S.push({title:'Ringkasan eksekutif',node:br});",
    replace: "const br=q('#sec-ringkasan');if(vis(br))S.push({title:'Ringkasan eksekutif',node:br,after:function(card){if(window.pmoPresProj)pmoPresProj.briefRefs(card,{'sec-progress':ttl(q('#sec-progress>article'),'Pencapaian progress proyek'),financeDetailSection:'Realisasi keuangan proyek'})}});",
  },
  {
    // Slide Realisasi keuangan proyek: tabel saja (tanpa kartu pencapaian) + narasi seperti Laporan Bulanan.
    file: 'ExecutiveDashboard',
    find: "      if(vis(fp)){const a=fp.cloneNode(true),g=a.querySelector('.fin-cards');if(g)g.style.gridTemplateColumns='repeat(5,minmax(0,1fr))';host.appendChild(a)}\n      if(vis(fd)){const b=fd.cloneNode(true);b.style.marginTop='18px';host.appendChild(b)}",
    replace: "      if(vis(fd)){const b=fd.cloneNode(true);host.appendChild(b);if(window.pmoPresProj)b.insertAdjacentHTML('beforeend',pmoPresProj.finNarr(d))}\n      else if(vis(fp)){const a=fp.cloneNode(true),g=a.querySelector('.fin-cards');if(g)g.style.gridTemplateColumns='repeat(5,minmax(0,1fr))';host.appendChild(a)}",
  },
  {
    file: 'Dashboard',
    find: '<button type="button" class="nav sub" data-target="sec-progres" title="Progres dan kurva S"><i class="ic" data-ic="chart"></i><span>Progres dan kurva S</span></button>',
    replace: '<button type="button" class="nav sub" data-target="sec-profil" title="Profil proyek"><i class="ic" data-ic="file"></i><span>Profil proyek</span></button>\n' +
      '    <button type="button" class="nav sub" data-target="sec-progres" title="Progres dan kurva S"><i class="ic" data-ic="chart"></i><span>Progres dan kurva S</span></button>\n' +
      '    <button type="button" class="nav sub" data-target="sec-hl" title="Highlight aktivitas"><i class="ic" data-ic="list"></i><span>Highlight aktivitas</span></button>\n' +
      '    <button type="button" class="nav sub" data-target="sec-prog" title="Target akhir tahun"><i class="ic" data-ic="chart"></i><span>Target akhir tahun</span></button>',
  },
  {
    file: 'Dashboard',
    find: '\n    <button type="button" class="nav sub" data-target="sec-profil" title="Profil dan aktivitas"><i class="ic" data-ic="file"></i><span>Profil dan aktivitas</span></button>',
    replace: '',
  },
  {
    // Tampilan HP: Prognosa ikut tab Ringkasan.
    file: 'Dashboard',
    find: "tag(art('sec-progres',1),'kurva');",
    replace: "tag(art('sec-progres',1),'kurva');tag(document.getElementById('sec-prog'),'ringkasan');tag(document.getElementById('sec-hl'),'isu');",
  },
  {
    file: 'Dashboard',
    find: 'try{renderFin(data.finance)}catch(e){}',
    replace: 'try{renderFin(data.finance)}catch(e){}try{if(window.pmoPresProj)pmoPresProj.progCard(data.prognosis)}catch(e){}' +
      'setTimeout(function(){try{var __pp=document.getElementById(\'projectPurpose\');if(__pp)__pp.title=__pp.textContent;var __hc=document.getElementById(\'hlCount\'),__hn=document.querySelectorAll(\'#highlights>li:not(.empty)\').length;if(__hc)__hc.textContent=__hn?__hn+\' kegiatan\':\'\';[\'projectInvestment\',\'projectContract\'].forEach(function(id){var e=document.getElementById(id);if(!e)return;var t=e.textContent.trim(),n=Number(t.replace(/[^0-9]/g,\'\'));if(!/^Rp/.test(t)||!(n>=1e9))return;e.title=t;e.textContent=\'Rp \'+(n>=1e12?(n/1e12).toLocaleString(\'id-ID\',{maximumFractionDigits:2})+\' T\':(n/1e9).toLocaleString(\'id-ID\',{minimumFractionDigits:2,maximumFractionDigits:2})+\' M\')})}catch(e){}},80);',
  },
  {
    file: 'Dashboard',
    find: "      if(fin)S.push({title:'Realisasi keuangan',wrap:'panel',nodes:[subs[1],fin]});",
    replace: "      if(fin)S.push({title:'Realisasi keuangan',wrap:'panel',nodes:[subs[1],fin]});\n" +
      "      const pgP=q('#progPanel');if(pgP)S.push({title:'Target akhir tahun',node:pgP});\n" +
      "      const wpid=String(((q('#weeklyProjectName')||{}).dataset||{}).pid||window.__pmoWeeklyPid||'');\n" +
      "      if(wpid&&window.pmoPresProj){S.push(pmoPresProj.slide({project:wpid,kind:'fin',title:proj},{title:'Realisasi keuangan (cut-off bulanan)'}));S.push(pmoPresProj.slide({project:wpid,kind:'la',title:proj},{title:'3 Month Look Ahead'}))}",
  },
];

/*
 * Weekly (22 Nov): tata letak baru
 *   Ringkasan → Profil proyek (horizontal, 6 kotak) → Progres & Kurva S → Highlight aktivitas (lebar penuh, 2 kolom)
 *   → Target akhir tahun → Concern & Mitigasi …
 * Blok <section id="sec-profil"> lama dibaca dari legacy/Dashboard.html saat dimuat, lalu dipecah.
 */
try {
  const fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'legacy', 'Dashboard.html'), 'utf8');
  const a = src.indexOf('    <section id="sec-profil" class="grid g-b anchor">'), b = src.indexOf('    <section id="sec-risiko"', a);
  if (a < 0 || b < 0) throw new Error('blok sec-profil tidak ditemukan');
  const block = src.slice(a, b);
  const arts = block.split('      <article class="panel">');
  if (arts.length !== 3) throw new Error('struktur sec-profil berubah');
  const prof = '      <article class="panel">' + arts[1].replace(/\s*$/, '\n');
  const hl = ('      <article class="panel">' + arts[2]).replace(/\s*<\/section>\s*$/, '\n');
  HTML_PATCHES.push(
    { file: 'Dashboard', find: block, replace:
      '    <section id="sec-hl" class="anchor">\n' + hl.replace('<h3>Highlight activities pekan ini</h3>', '<h3>Highlight activities pekan ini</h3><span class="hint" id="hlCount"></span>') + '    </section>\n\n' +
      '    <section id="sec-prog" class="anchor">\n      <article class="panel" id="progPanel">\n' +
      '        <div class="ph"><span class="pi"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg></span><h3>Target akhir tahun <span id="progYear"></span></h3><span class="hint">Target RKAP biaya dan target fisik baseline s.d. 31 Desember</span></div>\n' +
      '        <div id="progBox"><div class="pjx-empty">Memuat prognosa…</div></div>\n      </article>\n    </section>\n\n' },
    { file: 'Dashboard', find: '    <section id="sec-progres" class="grid g-a anchor">', replace:
      '    <section id="sec-profil" class="anchor prof-h">\n' + prof + '    </section>\n\n    <section id="sec-progres" class="grid g-a anchor">' },
    { file: 'Dashboard', find: "tag(art('sec-profil',1),'isu');", replace: "" }
  );
} catch (e) { console.warn(JSON.stringify({ ev: 'pres_proj_layout_skip', message: String(e.message || e) })); }

module.exports = { PRES_PROJ_GS, PRES_PROJ_JS, GS_PATCHES, HTML_PATCHES };

/**
 * WEB DASHBOARD PMO - VERSI DATABASE BARU (MULTI PROYEK)
 *
 * Sumber data:
 *   - DATA MINGGUAN PROYEK : progress, concern/mitigasi/highlight, K3 (per WEEK n)
 *   - DATA BULANAN         : profil proyek, keuangan, RKAP, milestone (per bulan)
 *   - USER ACCESS          : akun login (dipakai Auth.gs, tidak berubah)
 *
 * Format kedua sheet data:
 *   Baris header berisi PROYEK_ID | TIM_PROYEK | NAMA_PROYEK | ITEM_DATA | ...
 *   Satu baris = satu ITEM_DATA untuk satu proyek.
 *   Proyek baru cukup ditambahkan sebagai baris baru dengan PROYEK_ID baru —
 *   tidak perlu mengubah kode.
 *
 * Nama fungsi publik dan bentuk respons sama dengan versi lama, sehingga
 * Login.html, Styles.html, Dashboard.html, ExecutiveDashboard.html dan Auth.gs
 * dapat dipakai tanpa perubahan.
 */

// ===================== KONFIGURASI =====================

const SPREADSHEET_ID = '1OVqQZQ9MfBVQl1O2d6VpxQ385wNaGzfJOC-8LduHvcE';
const APP_NAME = 'PMO INFRASTRUCTURE DASHBOARD';
/** Judul tab browser & ikon (logo PMO dari Google Drive, harus dibagikan "Siapa saja yang memiliki link"). */
const APP_TITLE = 'PMO Infra & Process Plant';
const APP_FAVICON_ID = '1JP0hqePxcaiFN0aZ2dv6WJ6qCNwrRLxf';
function withFavicon_(out) {
  try { out.setFaviconUrl('https://drive.google.com/thumbnail?id=' + APP_FAVICON_ID + '&sz=w128&.png'); } catch (e) { /* halaman tetap tampil tanpa ikon */ }
  return out;
}

const DB_SHEETS = {
  WEEKLY: 'DATA MINGGUAN PROYEK',
  MONTHLY: 'DATA BULANAN'
};

const DB_CONFIG = {
  // false = proyek yang belum punya data progress maupun nilai investasi disembunyikan.
  SHOW_EMPTY_PROJECTS: false,
  // Batas status executive (deviasi dalam pecahan: -0.02 = -2%).
  CRITICAL_DEVIATION: -0.02,
  // Ringkasan eksekutif: serapan biaya di bawah batas ini (terhadap RKAP s.d. bulan terpilih) masuk daftar perhatian.
  ABSORPTION_WARN: 0.8,
  FIELDS: ['Engineering', 'Procurement', 'Construction', 'Commissioning']
};

const USER_SHEET_NAME = 'USER ACCESS';

let USER_NAMES_ = null;
/** Nama tampilan (kolom NAMA di USER ACCESS) untuk sebuah username; teks lain dikembalikan apa adanya. */
function userDisplayName_(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return '';
  if (!USER_NAMES_) {
    USER_NAMES_ = {};
    try {
      const sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USER_SHEET_NAME);
      if (sh && sh.getLastRow() > 1) {
        const vals = sh.getDataRange().getValues();
        const head = vals[0].map(function(x) { return String(x).trim().toUpperCase(); });
        const iu = head.indexOf('USERNAME'), inm = head.indexOf('NAMA');
        if (iu >= 0 && inm >= 0) {
          for (let r = 1; r < vals.length; r++) {
            const u = String(vals[r][iu] || '').trim().toLowerCase(), n = String(vals[r][inm] || '').trim();
            if (u && n) USER_NAMES_[u] = n;
          }
        }
      }
    } catch (e) { /* tampilkan username bila sheet tidak terbaca */ }
  }
  return USER_NAMES_[s.toLowerCase()] || s;
}

// ===================== HALAMAN =====================

function doGet(e) {
  const page = e && e.parameter ? e.parameter.page : '';

  if (page === 'master') {
    const template=HtmlService.createTemplateFromFile('MasterSchedule');
    template.initialSessionToken='';template.appUrl=ScriptApp.getService().getUrl();
    template.initialProjectName = e && e.parameter ? (e.parameter.project || '') : '';
    return withFavicon_(template.evaluate()).setTitle(APP_TITLE+' — Master Schedule dan Realisasi Monitoring').addMetaTag('viewport','width=device-width, initial-scale=1');
  }

  if (page === 'weekly') {
    const template = HtmlService.createTemplateFromFile('Dashboard');
    template.initialSessionToken = '';
    template.appUrl = ScriptApp.getService().getUrl();
    template.initialProjectName = e && e.parameter ? (e.parameter.project || '') : '';
    template.initialWeek = e && e.parameter ? String(Number(e.parameter.week) || '') : '';
    return withFavicon_(template.evaluate())
      .setTitle(APP_TITLE + ' — Weekly Progress')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'input') {
    const template = HtmlService.createTemplateFromFile('InputProgress');
    template.initialSessionToken = '';
    template.appUrl = ScriptApp.getService().getUrl();
    template.initialProjectName = e && e.parameter ? (e.parameter.project || '') : '';
    return withFavicon_(template.evaluate())
      .setTitle(APP_TITLE + ' — Input Progress Mingguan')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'monthly') {
    const template = HtmlService.createTemplateFromFile('MonthlyReport');
    template.initialSessionToken = '';
    template.appUrl = ScriptApp.getService().getUrl();
    template.initialProjectName = e && e.parameter ? (e.parameter.project || '') : '';
    return withFavicon_(template.evaluate())
      .setTitle(APP_TITLE + ' — Laporan Bulanan')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'project') {
    const template = HtmlService.createTemplateFromFile('ProjectSetup');
    template.initialSessionToken = '';
    template.appUrl = ScriptApp.getService().getUrl();
    template.initialProjectName = e && e.parameter ? (e.parameter.project || '') : '';
    return withFavicon_(template.evaluate())
      .setTitle(APP_TITLE + ' — Tambah / Edit Proyek')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'spotlight' || page === 'lobby') {
    const template = HtmlService.createTemplateFromFile('Spotlight');
    template.initialSessionToken = '';
    template.appUrl = ScriptApp.getService().getUrl();
    template.initialProjectName = e && e.parameter ? (e.parameter.project || '') : '';
    return withFavicon_(template.evaluate())
      .setTitle(APP_TITLE + ' - Spotlight Lobby')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'live') {
    const template = HtmlService.createTemplateFromFile('LiveView');
    template.initialSessionToken = '';
    template.appUrl = ScriptApp.getService().getUrl();
    template.initialProjectName = e && e.parameter ? (e.parameter.project || '') : '';
    return withFavicon_(template.evaluate())
      .setTitle(APP_TITLE + ' — Live View Lapangan')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'engineering') {
    const template = HtmlService.createTemplateFromFile('Engineering');
    template.initialSessionToken = '';
    template.appUrl = ScriptApp.getService().getUrl();
    template.initialProjectName = e && e.parameter ? (e.parameter.project || '') : '';
    return withFavicon_(template.evaluate())
      .setTitle(APP_TITLE + ' — EPCC Control · Engineering')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'epcc' || page === 'procurement' || page === 'construction' || page === 'commissioning') {
    const template = HtmlService.createTemplateFromFile('Epcc');
    const fld = String((e && e.parameter && e.parameter.field) || (page === 'construction' ? 'CONS' : page === 'commissioning' ? 'COM' : 'PROC')).toUpperCase();
    template.initialSessionToken = '';
    template.appUrl = ScriptApp.getService().getUrl();
    template.initialProjectName = e && e.parameter ? (e.parameter.project || '') : '';
    template.initialField = fld.indexOf('CONS') === 0 ? 'CONS' : fld.indexOf('COM') === 0 ? 'COM' : 'PROC';
    return withFavicon_(template.evaluate())
      .setTitle(APP_TITLE + ' — EPCC Control · ' + (template.initialField === 'CONS' ? 'Construction' : template.initialField === 'COM' ? 'Commissioning' : 'Procurement'))
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'documents' || page === 'dokumen') {
    const template = HtmlService.createTemplateFromFile('DocControl');
    template.initialSessionToken = '';
    template.appUrl = ScriptApp.getService().getUrl();
    template.initialProjectName = e && e.parameter ? (e.parameter.project || '') : '';
    return withFavicon_(template.evaluate())
      .setTitle(APP_TITLE + ' — Document Control')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'weeklyprint') {
    const template = HtmlService.createTemplateFromFile('WeeklyPrint');
    template.initialSessionToken = '';
    template.appUrl = ScriptApp.getService().getUrl();
    template.initialProjectName = e && e.parameter ? (e.parameter.project || '') : '';
    return withFavicon_(template.evaluate()).setTitle(APP_TITLE + ' — Buat Laporan Weekly').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'monthlydoc') {
    const template = HtmlService.createTemplateFromFile('MonthlyDoc');
    template.initialSessionToken = '';
    template.appUrl = ScriptApp.getService().getUrl();
    template.initialProjectName = e && e.parameter ? (e.parameter.project || '') : '';
    return withFavicon_(template.evaluate()).setTitle(APP_TITLE + ' — Buat Laporan Bulanan').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'library') {
    const template = HtmlService.createTemplateFromFile('Library');
    template.initialSessionToken = '';
    template.appUrl = ScriptApp.getService().getUrl();
    template.initialDoc = e && e.parameter ? (e.parameter.doc || '') : '';
    return withFavicon_(template.evaluate()).setTitle(APP_TITLE + ' — Library & Knowledge').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'report' || page === 'laporan') {
    const template = HtmlService.createTemplateFromFile('ManagementReport');
    template.initialSessionToken = '';
    template.appUrl = ScriptApp.getService().getUrl();
    template.initialProjectName = e && e.parameter ? (e.parameter.project || '') : '';
    return withFavicon_(template.evaluate())
      .setTitle(APP_TITLE + ' — Pelaporan Manajemen')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'portal') {
    const template = HtmlService.createTemplateFromFile('Portal');
    template.initialSessionToken = '';
    template.appUrl = ScriptApp.getService().getUrl();
    return withFavicon_(template.evaluate())
      .setTitle(APP_TITLE + ' — Portal Proyek')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'dashboard' || page === 'executive') {
    const template = HtmlService.createTemplateFromFile('ExecutiveDashboard');
    template.initialSessionToken = '';
    template.appUrl = ScriptApp.getService().getUrl();
    return withFavicon_(template.evaluate())
      .setTitle(APP_TITLE + ' — Executive Dashboard')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  const template = HtmlService.createTemplateFromFile('Login');
  template.appUrl = ScriptApp.getService().getUrl();
  return withFavicon_(template.evaluate())
    .setTitle(APP_TITLE + ' — Login')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Dipakai template halaman: <?!= include('Nama') ?>. Hanya file bagian halaman yang boleh (fungsi ini juga bisa dipanggil dari browser). */
const INCLUDE_ALLOWED_ = ['AccountMenu', 'AiWidget', 'EngXlsx', 'EpcMobile', 'Gallery', 'PmoCore', 'PmoUi', 'ReportAssets', 'Styles'];
function include(filename) {
  const name = String(filename || '').replace(/\.html$/i, '');
  if (INCLUDE_ALLOWED_.indexOf(name) < 0) throw new Error('File tidak tersedia.');
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function authGetAppUrl() {
  return ScriptApp.getService().getUrl();
}

function getExecutiveDashboardHtml(token) {
  ktrBlock_(requireUser_(token));
  const template = HtmlService.createTemplateFromFile('ExecutiveDashboard');
  template.initialSessionToken = String(token);
  template.appUrl = ScriptApp.getService().getUrl();
  return template.evaluate().getContent();
}

/** Halaman tujuan setelah login, dimuat langsung di halaman login (tanpa navigasi yang diblokir browser). */
function getLandingPageHtml(token) {
  const user = requireUser_(token);
  const ktr = String(user.role || '').trim().toUpperCase() === 'KONTRAKTOR';
  const t = HtmlService.createTemplateFromFile(ktr ? 'Engineering' : 'Portal');
  t.initialSessionToken = String(token);
  t.appUrl = ScriptApp.getService().getUrl();
  t.initialProjectName = '';
  return { success: true, page: ktr ? 'engineering' : 'portal', html: t.evaluate().getContent() };
}

/** Spotlight TV dimuat di atas Portal (layar penuh) tanpa pindah halaman. */
function getSpotlightPageHtml(token) {
  requireUser_(token);
  const t = HtmlService.createTemplateFromFile('Spotlight');
  t.initialSessionToken = String(token);
  t.appUrl = ScriptApp.getService().getUrl();
  t.initialProjectName = '';
  return { success: true, html: t.evaluate().getContent() };
}

/** Realisasi keuangan kumulatif untuk Weekly: bulan laporan mengikuti cut-off minggu & ketersediaan Laporan Bulanan. */
function weeklyFinance_(db, p, week) {
  try {
    const M = db.monthly, info = weeklyInfo_(db, p);
    if (!info.startDate || !M.months.length || !db.monthly.projects[p.id]) return null;
    const mk = function(mm) { return mm.year * 12 + mm.month; };
    const end = new Date(info.startDate.getFullYear(), info.startDate.getMonth(), info.startDate.getDate() + week * 7 - 1);
    const key = end.getFullYear() * 12 + end.getMonth();
    const items = [['PLANT_COST_ACTUAL', 'plant'], ['PM_COST_AKTUAL', 'pm'], ['IDC_ACTUAL', 'idc']];
    const has = function(mm) { return items.concat([['TOTAL_INVESTASI_AKTUAL']]).some(function(it) { const v = cellNumber_(M, p.id, it[0], mm.col); return v !== null && v !== 0; }); };
    let cand = -1;
    M.months.forEach(function(mm, i) { if (mk(mm) <= key) cand = i; });
    const fs = { plant: monthlyValue_(db, p.id, 'PLANT_COST_FS'), pm: monthlyValue_(db, p.id, 'PM_COST_FS'), idc: monthlyValue_(db, p.id, 'IDC_FS') };
    const inv = monthlyValue_(db, p.id, 'NILAI_INVESTASI_FS');
    let use = -1;
    if (cand >= 0) {
      const cm = M.months[cand];
      let cw = 0; try { cw = mk(cm) === key ? cutWeekOf_(db, p, cm) : 0; } catch (e) { cw = 0; }
      if (mk(cm) < key && has(cm)) use = cand;
      else if (cw && week >= cw && has(cm)) use = cand;
      else for (let i = cand - 1; i >= 0 && i >= cand - 13; i--) if (has(M.months[i])) { use = i; break; }
    }
    const weekMonth = cand >= 0 && mk(M.months[cand]) === key ? M.months[cand].label : (MONTHS_ID_[end.getMonth()] + ' ' + end.getFullYear());
    if (use < 0) return { none: true, weekMonth: weekMonth, fs: fs, investment: inv };
    const m = M.months[use], f = mrFinanceAt_(db, p, m);
    const R = function(v) { return v === null || v === undefined ? null : v * 1e6; };
    // Urutan baris mrFinanceAt_: Plant (BA Proyek), IDC (Bunga KI), PM Cost.
    const pos = { plant: R(f.rows[0] && f.rows[0].pos), idc: R(f.rows[1] && f.rows[1].pos), pm: R(f.rows[2] && f.rows[2].pos) };
    const actual = { plant: pos.plant, pm: pos.pm, idc: pos.idc };
    let total = null; ['plant', 'pm', 'idc'].forEach(function(k) { if (actual[k] !== null) total = (total || 0) + actual[k]; });
    if (total === null) total = R(f.total && f.total.pos);
    return { month: m.label, monthKey: monthKey_(m), weekMonth: weekMonth, lag: mk(m) < key, actual: actual, fs: fs, total: total, investment: inv };
  } catch (e) { return { error: e.message }; }
}

function getLoginPageHtml() {
  const template = HtmlService.createTemplateFromFile('Login');
  template.appUrl = ScriptApp.getService().getUrl();
  return template.evaluate().getContent();
}

// ===================== API PUBLIK =====================

/** Data Portal Proyek: identitas pengguna + ringkasan eksekutif periode terakhir. */
function getPortalData(token) {
  dbReadOnly_(); // C1b: baca DATA MINGGUAN/BULANAN dari cache
  const t0 = Date.now();
  const user = requireUser_(token);
  // KONTRAKTOR boleh membuka Portal; ringkasan otomatis terbatas pada proyeknya (userCanAccess_).
  const u = { name: user.name || user.nama || user.username || '', username: user.username || '', role: user.role || '', project: user.project || '' };
  let exec = null, error = '';
  try { exec = execDataCached_(user, ''); } catch (e) { error = e && e.message ? e.message : String(e); }
  return {
    success: true,
    user: u,
    period: exec ? exec.period : '',
    summary: exec ? exec.summary : null,
    brief: exec ? exec.brief : null,
    heroPhotos: portalHeroPhotos_(),
    error: error,
    serverMs: Date.now() - t0
  };
}

/** Data Weekly Progress satu proyek (dipanggil Dashboard.html). */
function getWeeklyProjectData(token, selectedWeek, requestedProject) {
  dbReadOnly_(); // C1b: baca DATA MINGGUAN/BULANAN dari cache
  const t0 = Date.now();
  const user = requireUser_(token);
  if (ktrIs_(user)) requestedProject = normKey_(user.projectId || '') || '-';
  const out = perfCached_('wk|' + String(requestedProject || '').toUpperCase() + '|' + (Number(selectedWeek) || ''), function() { return buildWeeklyData_(user, selectedWeek, requestedProject); });
  out.user = { name: user.name || user.nama || user.username || 'Pengguna', username: user.username || '', role: String(user.role || '').toUpperCase(), project: user.project || '', projectId: user.projectId || '' };
  out.serverMs = Date.now() - t0;
  return out;
}

/** Data Executive Dashboard bulanan (dipanggil ExecutiveDashboard.html). */
function getExecutiveDashboardData(token, requestedPeriod) {
  dbReadOnly_(); // C1b: baca DATA MINGGUAN/BULANAN dari cache
  const t0 = Date.now();
  const user = requireUser_(token);
  ktrBlock_(user);
  const out = execDataCached_(user, requestedPeriod);
  out.user = { name: user.name || user.nama || user.username || 'Pengguna', username: user.username || '', role: String(user.role || '').toUpperCase(), project: user.project || '', projectId: user.projectId || '' };
  out.serverMs = Date.now() - t0;
  return out;
}

/** Daftar proyek yang boleh diakses pengguna. */
function getProjectList(token) {
  dbReadOnly_(); // C1b: baca DATA MINGGUAN/BULANAN dari cache
  const user = requireUser_(token);
  const roleKey = String(user.role || '').toUpperCase();
  const scopeKey = roleKey === 'ADMIN' || normKey_(user.projectId || user.project || '') === 'ALL' ? 'ALL' : normKey_(user.projectId || user.project || '');
  return perfCached_('projList|' + roleKey + '|' + scopeKey, function() {
    const db = loadDb_();
    return {
      success: true,
      projects: db.projects
        .filter(function(p) { return userCanAccess_(user, p); })
        .map(function(p) { return { id: p.id, name: p.name, fullName: p.fullName, team: p.team, hasWeekly: weeklyHasData_(db, p), stage: projectLifecycle_(db, p).stage }; })
    };
  });
}

// ===================== WEEKLY =====================

function buildWeeklyData_(user, selectedWeek, requestedProject) {
  const db = loadDb_();
  const allowed = db.projects.filter(function(p) { return userCanAccess_(user, p) && weeklyHasData_(db, p); });
  if (!allowed.length) throw new Error('Tidak ada proyek dengan data mingguan yang dapat diakses akun ini.');

  let project = findProject_(allowed, requestedProject);
  if (!project) {
    const anyMatch = findProject_(db.projects, requestedProject);
    if (requestedProject && anyMatch && !userCanAccess_(user, anyMatch)) {
      throw new Error('Akun Anda tidak memiliki akses ke proyek ' + anyMatch.name + '.');
    }
    project = allowed[0];
  }

  const W = db.weekly;
  const info = weeklyInfo_(db, project);
  if (!info.latestWeek) throw new Error('Data mingguan untuk ' + project.name + ' belum tersedia.');

  const week = Math.min(info.latestWeek, Math.max(1, Number(selectedWeek) || info.latestWeek));
  const pctW = function(item, w) { return weekPercent_(W, project.id, item, w); };

  const overall = {
    plan: pctW('KOMULATIF_PLAN', week),
    actual: pctW('KOMULATIF_REALISASI', week),
    deviation: pctW('OVERALL_DEVIASI', week)
  };
  if (overall.deviation === null && overall.plan !== null && overall.actual !== null) {
    overall.deviation = overall.actual - overall.plan;
  }

  const fields = DB_CONFIG.FIELDS.map(function(name) {
    const F = name.toUpperCase();
    const plan = pctW(F + '_KOMULATIF_PLAN', week);
    const actual = pctW(F + '_KOMULATIF_REALISASI', week);
    let deviation = pctW('DEVIASI_' + F, week);
    if (deviation === null && plan !== null && actual !== null) deviation = actual - plan;
    return { name: name, plan: plan, actual: actual, deviation: deviation };
  });

  const history = [{ week: 0, plan: 0, actual: 0, deviation: 0 }];
  const historyEnd = Math.max(info.latestWeek, info.planEndWeek);
  for (let w = 1; w <= historyEnd; w++) {
    let plan = w <= info.planEndWeek ? pctW('KOMULATIF_PLAN', w) : null;
    const actual = w <= info.latestWeek ? pctW('KOMULATIF_REALISASI', w) : null;
    if (w === info.planEndWeek && plan !== null) plan = 100;
    history.push({ week: w, plan: plan, actual: actual, deviation: plan === null || actual === null ? null : actual - plan });
  }

  // Profil proyek dari DATA BULANAN.
  const investmentRaw = monthlyValue_(db, project.id, 'NILAI_INVESTASI_FS');
  const contractRaw = monthlyValue_(db, project.id, 'NILAI_KONTRAK');
  const startDate = info.startDate;
  const finishDate = monthlyDate_(db, project.id, 'EFEKTIF_DATE_FINISH');
  const startText = startDate ? formatDateId_(startDate) : monthlyText_(db, project.id, 'EFEKTIF_DATE_START');
  const finishText = finishDate ? formatDateId_(finishDate) : monthlyText_(db, project.id, 'EFEKTIF_DATE_FINISH');
  const profile = {
    purpose: monthlyText_(db, project.id, 'TUJUAN'),
    capacity: monthlyText_(db, project.id, 'KAPASITAS'),
    contractor: monthlyText_(db, project.id, 'KONTRAKTOR'),
    investment: investmentRaw === null ? '' : formatRupiah_(investmentRaw),
    contract: contractRaw === null ? '' : formatRupiah_(contractRaw),
    effectiveDate: startText && finishText ? startText + ' – ' + finishText : (startText || finishText),
    effectiveStart: startText,
    effectiveFinish: finishText,
    bannerUrl: monthlyText_(db, project.id, 'LINK_BANNER')
  };
  const lifecycle = lifecycleView_(db, project);
  if (lifecycle.addendumCount && lifecycle.contractInitial !== null && lifecycle.contractDelta) {
    profile.contractNote = 'Awal ' + formatRupiah_(lifecycle.contractInitial) + ' · ' + (lifecycle.contractDelta > 0 ? '+' : '−') +
      formatRupiah_(Math.abs(lifecycle.contractDelta)) + ' (' + lifecycle.addendumCount + ' addendum)';
  }
  if (lifecycle.extendedWeeks > 0 && lifecycle.finishInitialText) {
    profile.effectiveNote = 'Jadwal awal selesai ' + lifecycle.finishInitialText + ' · diperpanjang ' + lifecycle.extendedWeeks + ' minggu';
  }

  const totalDuration = Number(monthlyValue_(db, project.id, 'TOTAL_DURASI')) || info.maxWeek * 7 || 1;
  const periodStart = new Date(startDate || new Date());
  periodStart.setDate(periodStart.getDate() + (week - 1) * 7);
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 6);
  const tz = Session.getScriptTimeZone();
  const period = startDate
    ? { start: Utilities.formatDate(periodStart, tz, 'dd MMM yyyy'), end: Utilities.formatDate(periodEnd, tz, 'dd MMM yyyy') }
    : { start: '', end: '' };

  // Concern, mitigasi, highlight, media.
  const text = function(item) { return weekText_(W, project.id, item, week); };
  const concerns = [];
  DB_CONFIG.FIELDS.forEach(function(name) {
    const F = name.toUpperCase();
    const concern = text(F + '_CONCERN');
    const mitigation = text(F + '_MITIGASI');
    if (concern || mitigation) concerns.push({ field: name, concern: concern, mitigation: mitigation });
  });
  const highlight = text('HIGHLIGHT_ACTIVITY') || text('HIGHLIGHT');
  const videoUrl = weekLink_(W, project.id, 'LINK_VIDEO', week);
  const materialUrl = weekLink_(W, project.id, 'LINK_MATERI', week);

  // K3 / HSE.
  const raw = function(item) { return weekRaw_(W, project.id, item, week); };
  const hsePlan = pctW('KOMULATIF_HSE_PLAN', week);
  const hseActual = pctW('KOMULATIF_HSE_AKTUAL', week);
  let hse = {
    contractor: raw('PERSON_CONTRACTOR'),
    subContractor: raw('PERSON_SUB_CONTRACTOR'),
    totalManpower: raw('TOTAL_MP'),
    manhour: raw('MANHOUR_WEEKLY'),
    cumulativeManhour: raw('KOMULATIF_MANHOUR'),
    fatalityWeekly: raw('FATALITY_WEEKLY'),
    fatalityCumulative: raw('FATALITY_KOMULATIF'),
    safetyTalkWeekly: raw('SAFETY_TALK_MINGGUAN'),
    smwtWeekly: raw('SMWT_MINGGUAN'),
    ltifr: raw('LTIFR'),
    hsePlan: hsePlan,
    hseActual: hseActual,
    hseDeviation: hsePlan === null || hseActual === null ? null : hseActual - hsePlan,
    issue: text('ISSUE_K3')
  };
  const hseFilled = Object.keys(hse).some(function(k) { return hse[k] !== null && hse[k] !== ''; });
  if (!hseFilled) hse = { note: 'Data K3 mingguan belum tersedia untuk minggu ini.' };

  return {
    success: true,
    project: project.name,
    projectId: project.id,
    week: week,
    latestWeek: info.latestWeek,
    maxWeek: info.latestWeek,
    planEndWeek: info.planEndWeek,
    period: period,
    duration: {
      total: totalDuration,
      actual: Math.min(week * 7, totalDuration),
      remaining: Math.max(0, totalDuration - week * 7),
      timeUsed: Math.min(100, week * 7 / totalDuration * 100)
    },
    history: history,
    overall: overall,
    fields: fields,
    concern: concerns,
    rtl: (function() { try { const v = epcRtlView_(db, project); return v.active ? { active: true, week: v.week, end: v.end, finish: v.finish, slip: v.slip, groups: v.groups.filter(function(g) { return g.wajib || g.acts; }), actions: v.actions.filter(function(a) { return a.st !== 'SELESAI' || !a.wkDone || a.wkDone >= week; }), missing: v.missing.length, late: v.late, mode: v.mode, info: (v.info || []).length } : { active: false }; } catch (e) { return { active: false }; } })(),
    highlight: highlight,
    videoUrl: videoUrl,
    media: { materialUrl: materialUrl },
    hse: hse,
    profile: profile,
    lifecycle: lifecycle,
    schedule: mscBrief_(db, project),
    addenda: addendaView_(db, project.id),
    finance: weeklyFinance_(db, project, week),
    baselineInitial: initialBaseline_(db, project.id),
    user: { name: user.name || user.username || 'Pengguna', role: String(user.role || '').toUpperCase() }
  };
}

// ===================== EXECUTIVE (BULANAN) =====================

function buildExecutiveData_(user, requestedPeriod) {
  const db = loadDb_();
  const portfolio = isPortfolioUser_(user);
  const projects = db.projects.filter(function(p) { return userCanAccess_(user, p); });
  if (!projects.length) throw new Error('Proyek untuk akun ini tidak ditemukan pada database.');

  const months = db.monthly.months;
  if (!months.length) throw new Error('Kolom bulan pada sheet ' + DB_SHEETS.MONTHLY + ' tidak ditemukan.');

  // Periode dinamis: bulan muncul begitu ada laporan biaya ATAU minimal satu proyek wajib lapor sudah
  // mengisi input mingguan sampai week cut-off bulan tsb (milestone bulanan). Proyek yang belum sampai
  // cut-off ditandai menunggu dan tidak dihitung; keuangan memakai bulan terakhir yang laporannya lengkap.
  const valid = executivePeriods_(db, projects);
  if (!valid.length) throw new Error('Belum ada periode dengan data bulanan yang tersubmit.');
  const pendingPeriod = null;

  const reqKey = normKey_(requestedPeriod);
  const selected = valid.find(function(m) { return reqKey && (normKey_(m.label) === reqKey || normKey_(m.raw) === reqKey); }) || valid[valid.length - 1];
  const mIndex = months.indexOf(selected);
  const next = mIndex + 1 < months.length ? months[mIndex + 1] : null;

  // Bulan keuangan: bulan terpilih bila semua proyek wajib lapor sudah mengisi realisasi biaya;
  // bila belum, bulan terakhir sebelumnya yang sudah lengkap.
  const finStatus = monthReportStatus_(db, projects, selected);
  let finM = selected;
  if (!finStatus.complete) for (let i = valid.indexOf(selected) - 1; i >= 0; i--) if (monthReportStatus_(db, projects, valid[i]).complete) { finM = valid[i]; break; }

  // Bobot portofolio = proporsi nilai investasi FS.
  const invest = {};
  let investSum = 0;
  projects.forEach(function(p) {
    const v = monthlyValue_(db, p.id, 'NILAI_INVESTASI_FS');
    invest[p.id] = v === null ? 0 : v;
    investSum += invest[p.id];
  });
  const weightOf = function(p) {
    return investSum ? invest[p.id] / investSum : 1 / projects.length;
  };

  const rows = projects.map(function(p, index) {
    const prog = execProgress_(db, p, selected);
    const deviation = prog.actual === null || prog.plan === null ? null : prog.actual - prog.plan;
    const fin = financialRow_(db, p, finM, index + 1, weightOf(p));
    const cpi = estimateCpi_(db, p, selected, prog, finM === selected ? fin : financialRow_(db, p, selected, index + 1, weightOf(p)));
    const info = weeklyInfo_(db, p);
    const weekOfMonth = info.startDate ? Math.min(info.latestWeek, weekForDate_(info.startDate, monthEnd_(selected))) : info.latestWeek;
    const life = lifecycleView_(db, p, monthEnd_(selected));
    const done = life.stage !== 'BERJALAN';
    return {
      schedule: (function() { if (done) return null; const b = mscBrief_(db, p); return b ? {likely: b.likely, late: b.late, move: b.move, cut: b.cut, rev: b.rev} : null; })(),
      stage: life.stage,
      stageLabel: life.stageLabel,
      finishText: life.finishText,
      timing: life.timingCurrent ? life.timingCurrent.label : '',
      addendumCount: life.addendumCount,
      revision: life.revision,
      extendedWeeks: life.extendedWeeks,
      contractDeltaPercent: life.contractDeltaPercent,
      projectIndex: index,
      projectId: p.id,
      name: p.name,
      reportUrl: monthLink_(db, p.id, 'LINK_LAPORAN_MONTHLY', selected) || execMgmtReportUrl_(p.id, selected),
      reportSource: monthLink_(db, p.id, 'LINK_LAPORAN_MONTHLY', selected) ? 'MONTHLY' : (execMgmtReportUrl_(p.id, selected) ? 'MGMT' : ''),
      termPaid: portfolio ? termPaid_(db, p) : null,
      termPaidPercent: portfolio ? termPaidPercent_(db, p) : null,
      actual: prog.actual,
      plan: prog.plan,
      deviation: deviation,
      issue: weekOfMonth > 0 ? weekText_(db.weekly, p.id, 'HIGHLIGHT_ACTIVITY', weekOfMonth) : '',
      spi: prog.actual !== null && prog.plan ? prog.actual / prog.plan : null,
      cpi: cpi.value, cpiReason: cpi.reason,
      weight: weightOf(p),
      cutWeek: info.startDate ? cutWeekOf_(db, p, selected) : null,
      latestWeek: info.latestWeek || 0,
      pending: !!prog.pending,
      status: done ? life.stageLabel : prog.pending ? 'Menunggu cut-off W' + cutWeekOf_(db, p, selected) : deviation === null ? 'Data tidak tersedia'
        : deviation < DB_CONFIG.CRITICAL_DEVIATION ? 'Critical'
        : deviation <= 0 ? 'At risk' : 'On track',
      _fin: Object.assign(fin, { addendumCount: life.addendumCount, contractDeltaPercent: life.contractDeltaPercent, stage: life.stage })
    };
  });

  const weighted = function(list, field) {
    let sw = 0, sv = 0;
    list.forEach(function(r) {
      const v = r[field];
      if (v === null || v === undefined || !Number.isFinite(Number(v))) return;
      sw += r.weight; sv += Number(v) * r.weight;
    });
    return sw ? sv / sw : null;
  };

  const running = rows.filter(function(r) { return r.stage === 'BERJALAN'; });
  const summary = {
    totalProjects: running.length,
    completed: rows.filter(function(r) { return r.stage === 'SELESAI'; }).length,
    closed: rows.filter(function(r) { return r.stage === 'DITUTUP'; }).length,
    allProjects: rows.length,
    onTrack: rows.filter(function(r) { return r.status === 'On track'; }).length,
    atRisk: rows.filter(function(r) { return r.status === 'At risk'; }).length,
    critical: rows.filter(function(r) { return r.status === 'Critical'; }).length,
    plan: weighted(running.length ? running : rows, 'plan'),
    actual: weighted(running.length ? running : rows, 'actual')
  };

  const monthlyTrend = valid.map(function(m) {
    const list = projects.map(function(p) {
      const prog = execProgress_(db, p, m);
      return { weight: weightOf(p), plan: prog.plan, actual: prog.actual };
    });
    return { period: m.label, plan: weighted(list, 'plan'), actual: weighted(list, 'actual') };
  });

  // Peta deviasi: enam bulan kalender terakhir sampai periode pilihan.
  const deviationMonths = months.slice(Math.max(0, mIndex - 5), mIndex + 1);
  const monthlyDeviation = {
    months: deviationMonths.map(function(m) { return { key: monthKey_(m), label: m.label, year: m.year }; }),
    projects: projects.filter(function(p, i) { return rows[i].stage === 'BERJALAN' && projectReady_(db, p).ready; }).map(function(p) {
      const start = monthlyDate_(db, p.id, 'EFEKTIF_DATE_START');
      return { id: p.id, name: p.name, values: deviationMonths.map(function(m) {
        const sk = projectReportStartKey_(db, p);
        const beforeStart = start && (m.year * 12 + m.month < (sk !== null ? sk : start.getFullYear() * 12 + start.getMonth()));
        const v = beforeStart ? { plan: null, actual: null } : execProgress_(db, p, m);
        const hasW = !beforeStart && weeklyInfo_(db, p).startDate;
        return { plan: v.plan, actual: v.actual, deviation: v.plan === null || v.actual === null ? null : v.actual - v.plan,
          cutWeek: hasW ? cutWeekOf_(db, p, m) : null, pending: !!v.pending };
      }) };
    })
  };

  const milestones = projects.map(function(p, index) {
    const target = next ? monthlyProgress_(db, p, next).plan : null;
    return {
      projectIndex: index,
      no: index + 1,
      project: p.fullName,
      stage: rows[index].stage,
      termPaid: portfolio ? termPaid_(db, p) : null,
      termPaidPercent: portfolio ? termPaidPercent_(db, p) : null,
      target: target,
      milestone: next ? monthText_(db, p.id, 'MILESTONE_FISIK_MONTHLY', next) : '',
      status: next ? monthText_(db, p.id, 'PROGRESS_MILESTONE_MONTHLY', next) : '',
      note: next ? monthText_(db, p.id, 'KETERANGAN_MILESTONE_MONTHLY', next) : ''
    };
  });

  let financial = null;
  if (portfolio) {
    const finRows = rows.map(function(r) { return r._fin; });
    const sum = function(key) {
      let any = false;
      const total = finRows.reduce(function(s, r) {
        if (r[key] === null || r[key] === undefined) return s;
        any = true; return s + Number(r[key]);
      }, 0);
      return any ? total : null;
    };
    const totals = {
      no: '', project: 'TOTAL',
      investment: sum('investment'), contract: sum('contract'), weight: sum('weight'),
      historical: sum('historical'), monthActual: sum('monthActual'), monthRkap: sum('monthRkap'),
      actualToDate: sum('actualToDate'), rkap2026: sum('rkap2026'), totalToDate: sum('totalToDate'),
      forecastPhysical: null, forecastAbsorption: sum('forecastAbsorption')
    };
    totals.achievement = totals.rkap2026 ? totals.actualToDate / totals.rkap2026 : null;
    totals.investmentAchievement = totals.investment ? totals.totalToDate / totals.investment : null;
    totals.forecastPercent = totals.forecastAbsorption ? totals.actualToDate / totals.forecastAbsorption : null;
    financial = {
      period: finM.label,
      basis: finM !== selected ? { period: finM.label, selected: selected.label, filled: finStatus.filled, total: finStatus.total, missing: finStatus.missing } : null,
      investment: totals.investment, contract: totals.contract, actualToDate: totals.totalToDate,
      rkap2026: totals.rkap2026, achievement: totals.achievement,
      investmentAchievement: totals.investmentAchievement,
      rows: finRows, totals: totals
    };
  }

  const brief = executiveBrief_(db, projects, rows, valid, selected, next, portfolio, weighted, milestones, finM);

  rows.forEach(function(r) { delete r._fin; });

  return {
    success: true,
    period: selected.label,
    periods: valid.map(function(m) { return m.label; }),
    pendingPeriod: pendingPeriod,
    periodStatus: executivePeriodStatus_(db, projects, selected, finM, finStatus),
    monthlyTrend: monthlyTrend,
    monthlyDeviation: monthlyDeviation,
    milestonePeriod: next ? next.label : 'Target bulan berikutnya belum tersedia',
    summary: summary,
    brief: brief,
    projects: rows,
    financial: financial,
    milestones: milestones
  };
}

/**
 * Ringkasan eksekutif (card paling atas Executive Dashboard).
 * Hanya proyek berjalan yang dihitung; biaya dibandingkan dengan RKAP tahun berjalan s.d. bulan terpilih.
 */
function executiveBrief_(db, projects, rows, valid, selected, next, portfolio, weighted, milestones, finM) {
  finM = finM || selected;
  const running = rows.filter(function(r) { return r.stage === 'BERJALAN'; });
  const today = new Date();
  const end = monthEnd_(selected);
  const ref = end < today ? end : today;

  // Bulan sebelumnya (proyek yang sama, bobot sama) untuk pembanding tren.
  const vi = valid.indexOf(selected);
  const prevMonth = vi > 0 ? valid[vi - 1] : null;
  let prev = null;
  const counted = running.filter(function(r) { return !r.pending; });
  if (prevMonth && counted.length) {
    const list = counted.map(function(r) {
      const prog = execProgress_(db, projects[r.projectIndex], prevMonth);
      return { weight: r.weight, plan: prog.plan, actual: prog.actual };
    });
    prev = { period: prevMonth.label, plan: weighted(list, 'plan'), actual: weighted(list, 'actual') };
  }

  // Kesegaran data: tanggal akhir minggu input terakhir & kelengkapan laporan bulanan.
  let asOf = null, asOfWeek = null, reported = 0;
  running.forEach(function(r) {
    const p = projects[r.projectIndex];
    const info = weeklyInfo_(db, p);
    if (info.startDate && info.latestWeek) {
      const d = new Date(info.startDate.getFullYear(), info.startDate.getMonth(), info.startDate.getDate() + info.latestWeek * 7 - 1);
      if (!asOf || d > asOf) { asOf = d; asOfWeek = info.latestWeek; }
    }
    if (monthHasReport_(db, p, selected)) reported++;
  });

  // Biaya & kontrak (khusus pengguna portofolio, sama dengan panel keuangan).
  let cost = null, contract = null;
  if (portfolio) {
    let ytd = null, rkapTo = null, rkapYear = null, cNow = null, cInit = null, addenda = 0;
    rows.forEach(function(r) {
      const f = r._fin;
      if (r.stage === 'BERJALAN' || r.stage === 'SELESAI') {
        if (f.actualToDate !== null) ytd = (ytd || 0) + f.actualToDate;
        if (f.rkapToDate !== null) rkapTo = (rkapTo || 0) + f.rkapToDate;
        if (f.rkap2026 !== null) rkapYear = (rkapYear || 0) + f.rkap2026;
      }
      if (f.contract !== null) {
        cNow = (cNow || 0) + f.contract;
        const life = lifecycleView_(db, projects[r.projectIndex], end);
        const init = life.contractInitial !== null ? life.contractInitial / 1000000 : f.contract;
        cInit = (cInit || 0) + init;
      }
      addenda += r.addendumCount || 0;
    });
    cost = { year: finM.year, period: finM.label, basis: finM !== selected ? finM.label : null, actualToDate: ytd, rkapToDate: rkapTo, rkapYear: rkapYear,
      percent: rkapTo ? (ytd || 0) / rkapTo : null, percentYear: rkapYear ? (ytd || 0) / rkapYear : null };
    contract = { total: cNow, initial: cInit, addenda: addenda,
      deltaPercent: cNow !== null && cInit ? (cNow - cInit) / cInit : null };
    // Termin kontraktor: PLANT_COST_ACTUAL, riwayat sebelum tahun pertama
    // ditambah isian bulanan hanya sampai periode pilihan (bukan TOTAL_ALL).
    let paidToSelected = null, paymentMissing = 0, contractMissing = 0;
    rows.forEach(function(r) {
      const paid = costToDate_(db, projects[r.projectIndex], 'PLANT_COST_ACTUAL', finM);
      if (paid === null) paymentMissing++;
      else paidToSelected = (paidToSelected || 0) + paid / 1000000;
      if (r._fin.contract === null) contractMissing++;
    });
    const paymentsComplete = paymentMissing === 0 && contractMissing === 0;
    contract.period = finM.label;
    contract.paidToDate = paidToSelected;
    contract.paymentMissing = paymentMissing;
    contract.contractMissing = contractMissing;
    contract.paidPercent = paymentsComplete && cNow > 0 && paidToSelected !== null ? paidToSelected / cNow : null;
    contract.remaining = paymentsComplete && cNow !== null && paidToSelected !== null ? cNow - paidToSelected : null;

  }

  // Daftar perhatian: hanya pengecualian, diurutkan dari yang paling berat.
  const LV = { critical: 3, risk: 2, info: 1 };
  const attention = [];
  let epcStoreX_ = null;
  running.forEach(function(r) {
    const p = projects[r.projectIndex];
    const reasons = [];
    let level = null;
    const bump = function(l) { if (!level || LV[l] > LV[level]) level = l; };
    if (r.deviation !== null && r.deviation <= 0) {
      const crit = r.deviation < DB_CONFIG.CRITICAL_DEVIATION;
      reasons.push({ level: crit ? 'critical' : 'risk', text: 'Deviasi ' + (r.deviation * 100).toFixed(2).replace('.', ',') + '%' });
      bump(crit ? 'critical' : 'risk');
    }
    const info = weeklyInfo_(db, p);
    if (info.startDate && info.maxWeek) {
      const over = weekForDate_(info.startDate, ref) - info.maxWeek;
      if (over > 0) { reasons.push({ level: 'critical', text: 'Melewati jadwal selesai ' + over + ' minggu' }); bump('critical'); }
    }
    if (portfolio && r._fin.rkapToDate) {
      const ab = (r._fin.actualToDate || 0) / r._fin.rkapToDate;
      if (ab < DB_CONFIG.ABSORPTION_WARN) { reasons.push({ level: 'risk', text: 'Serapan RKAP ' + Math.round(ab * 100) + '%' }); bump('risk'); }
    }
    try {
      if (!epcStoreX_) epcStoreX_ = epcStoreC_();
      const rv = epcRtlView_(db, p, epcStoreX_);
      if (rv.active && rv.missing.length) { reasons.push({ level: 'risk', text: rv.missing.length + ' item kritis belum ada tindak lanjut' }); bump('risk'); }
      if (rv.active && rv.late) { reasons.push({ level: 'risk', text: rv.late + ' tindak lanjut terlambat' }); bump('risk'); }
    } catch (e) { /* data EPCC belum ada */ }
    if (r.pending) { reasons.push({ level: 'info', text: 'Input mingguan baru s.d. W' + r.latestWeek + ' (cut-off ' + selected.label + ' W' + r.cutWeek + ')' }); bump('info'); }
    if (!monthHasReport_(db, p, selected)) { reasons.push({ level: 'info', text: 'Laporan ' + selected.label + ' belum diisi' }); bump('info'); }
    if (level) attention.push({ projectId: p.id, name: p.name, level: level, deviation: r.deviation, reasons: reasons });
  });
  attention.sort(function(a, b) {
    return LV[b.level] - LV[a.level] || b.reasons.length - a.reasons.length || (a.deviation || 0) - (b.deviation || 0);
  });

  const finishedThisMonth = rows.filter(function(r) {
    if (r.stage === 'BERJALAN') return false;
    const life = lifecycleView_(db, projects[r.projectIndex], end);
    return life.finishDate && life.finishDate.slice(0, 7) === selected.year + '-' + ('0' + (selected.month + 1)).slice(-2);
  }).map(function(r) { return r.name; });

  // Sasaran fisik portofolio bulan berikutnya: rencana bulan tujuan,
  // tanpa bergeser ke minggu realisasi terakhir yang belum mencapai akhir bulan.
  const targetRows = next ? running.map(function(r) {
    const p = projects[r.projectIndex];
    let plan = cellNumber_(db.monthly, p.id, 'PLAN_MONTHLY_PROGRESS', next.col);
    if (plan !== null) plan = Math.abs(plan) > 1.5 ? plan / 100 : plan;
    if (plan === null) {
      const info = weeklyInfo_(db, p);
      if (info.startDate && info.planEndWeek) {
        const w = weekForDate_(info.startDate, monthEnd_(next));
        const v = w < 1 ? 0 : weekPercent_(db.weekly, p.id, 'KOMULATIF_PLAN', Math.min(w, info.planEndWeek));
        plan = w < 1 ? 0 : w >= info.planEndWeek ? 1 : v === null ? null : v / 100;
      }
    }
    return { weight: r.weight, plan: plan };
  }) : [];
  const targetComplete = targetRows.length > 0 && targetRows.every(function(r) { return r.plan !== null && Number.isFinite(Number(r.plan)); });
  const nextPhysical = { period: next ? next.label : '', plan: targetComplete ? weighted(targetRows, 'plan') : null };

  // Rincian per proyek untuk narasi (urut: perlu perhatian dulu, lalu bobot terbesar).
  const ORD = { 'Critical': 0, 'At risk': 1, 'On track': 2 };
  const items = running.map(function(r) {
    const p = projects[r.projectIndex], info = weeklyInfo_(db, p);
    const wk = info.latestWeek ? Math.max(1, Math.min(info.latestWeek, r.cutWeek || info.latestWeek)) : 0;
    let hl = wk ? (weekText_(db.weekly, p.id, 'HIGHLIGHT_ACTIVITY', wk) || weekText_(db.weekly, p.id, 'HIGHLIGHT', wk)) : '';
    hl = String(hl || '').split(/\n+/).map(function(x) { return x.replace(/^\s*(?:\d+[.)]|[-•*])\s*/, '').trim(); }).filter(Boolean)[0] || '';
    if (hl.length > 150) hl = hl.slice(0, 147).replace(/\s+\S*$/, '') + '…';
    const pv = prevMonth ? execProgress_(db, p, prevMonth) : null;
    const ms = milestones[r.projectIndex] || {};
    const last = r.pending && info.latestWeek ? {
      week: info.latestWeek,
      actual: (function(v) { return v === null ? null : v / 100; })(weekPercent_(db.weekly, p.id, 'KOMULATIF_REALISASI', info.latestWeek)),
      plan: (function(v) { return v === null ? null : v / 100; })(weekPercent_(db.weekly, p.id, 'KOMULATIF_PLAN', info.latestWeek))
    } : null;
    const lagAct = r.pending ? (last ? last.actual : null) : r.actual, lagWeek = r.pending ? (last ? last.week : 0) : wk;
    // Proyek yang baru mulai setelah tanggal cut-off bulan ini belum punya cut-off bulanan: SPI-nya tidak ikut dirata-rata.
    const noCut = !monthHasCutoff_(db, p, selected);
    let firstCut = '';
    if (noCut) { const mi = db.monthly.months.indexOf(selected); for (let j = mi + 1; j >= 1 && j < db.monthly.months.length; j++) { if (monthHasCutoff_(db, p, db.monthly.months[j])) { firstCut = db.monthly.months[j].label; break; } } }
    return { projectId: p.id, name: p.name, status: r.status, pending: !!r.pending, actual: r.actual, plan: r.plan, deviation: r.deviation, noCut: noCut, firstCut: firstCut,
      cutWeek: r.cutWeek, latestWeek: info.latestWeek || 0, week: wk, prevActual: pv && !pv.pending ? pv.actual : null,
      highlight: hl, nextMilestone: ms.milestone || '', nextTarget: ms.target === undefined ? null : ms.target, last: last,
      banner: projectBannerId_(db, p), weight: r.weight,
      contract: portfolio && r._fin ? r._fin.contract : null,
      cpi: portfolio ? r.cpi : null,
      lagWeeks: execLagWeeks_(db, p, info, lagWeek, lagAct),
      cause: execCause_(db, p, wk) };
  }).sort(function(a, b) {
    const oa = a.pending ? 3 : (ORD[a.status] === undefined ? 2 : ORD[a.status]), ob = b.pending ? 3 : (ORD[b.status] === undefined ? 2 : ORD[b.status]);
    return oa - ob || (b.weight || 0) - (a.weight || 0);
  });

  return {
    period: selected.label,
    prev: prev,
    counted: counted.length,
    items: items,
    nextPhysical: nextPhysical,
    asOfText: asOf ? formatDateId_(asOf) : '',
    asOfWeek: asOfWeek,
    reports: { filled: reported, total: running.length },
    cost: cost,
    contract: contract,
    attention: attention,
    finishedThisMonth: finishedThisMonth,
    nextMilestones: next ? milestones.filter(function(m) { return m.stage === 'BERJALAN' && m.milestone; }).length : 0,
    nextPeriod: next ? next.label : ''
  };
}

/** Keterlambatan dalam minggu: realisasi sekarang setara rencana minggu ke berapa (positif = terlambat, negatif = lebih cepat). */
function execLagWeeks_(db, p, info, week, actual) {
  try {
    if (!week || actual === null || actual === undefined || !isFinite(actual)) return null;
    const end = info.planEndWeek || info.maxWeek || week;
    const plan = function(w) { if (w < 1) return 0; const v = weekPercent_(db.weekly, p.id, 'KOMULATIF_PLAN', Math.min(w, end)); return v === null ? null : v / 100; };
    const target = actual - 1e-9;
    let prevV = 0;
    for (let w = 1; w <= end; w++) {
      const v = plan(w); if (v === null) continue;
      if (v >= target) {
        const span = v - prevV, frac = span > 1e-9 ? (actual - prevV) / span : 1;
        const eq = w - 1 + Math.max(0, Math.min(1, frac));
        return Math.round((week - eq) * 10) / 10;
      }
      prevV = v;
    }
    return Math.round((week - end) * 10) / 10;
  } catch (e) { return null; }
}

/** Kendala & mitigasi bidang dengan deviasi terburuk pada minggu tertentu (isian weekly PIC). */
function execCause_(db, p, week) {
  if (!week) return null;
  let best = null;
  DB_CONFIG.FIELDS.forEach(function(n) {
    const F = n.toUpperCase();
    const c = weekText_(db.weekly, p.id, F + '_CONCERN', week), m = weekText_(db.weekly, p.id, F + '_MITIGASI', week);
    if (!c && !m) return;
    const pl = weekPercent_(db.weekly, p.id, F + '_KOMULATIF_PLAN', week), ac = weekPercent_(db.weekly, p.id, F + '_KOMULATIF_REALISASI', week);
    const dev = pl === null || ac === null ? 9 : ac - pl;
    if (!best || dev < best.dev) best = { field: n, concern: String(c || ''), mitigation: String(m || ''), dev: dev };
  });
  if (!best) return null;
  const cut = function(t) { return t.replace(/\s+/g, ' ').trim(); };
  return { field: best.field, concern: cut(best.concern), mitigation: cut(best.mitigation) };
}

/**
 * Baris keuangan satu proyek. Satuan: juta Rupiah (sama dengan versi lama).
 * historical   = realisasi investasi sebelum tahun periode terpilih (TOTAL_<tahun> sebelumnya)
 * actualToDate = realisasi Januari s.d. bulan terpilih pada tahun berjalan
 * totalToDate  = historical + actualToDate
 */
function estimateCpi_(db, project, period, progress, finance) {
  if (progress.pending) return { value: null, reason: 'Menunggu progres cut-off bulanan' };
  if (!monthHasCutoff_(db, project, period) || !Number.isFinite(progress.actual) || progress.actual <= 0) {
    return { value: null, reason: 'Belum ada progres tercatat' };
  }
  if (!weeklyReadyFor_(db, project, period)) return { value: null, reason: 'Menunggu progres cut-off bulanan' };
  if (!Number.isFinite(finance.monthActual) || !(finance.totalToDate > 0)) {
    return { value: null, reason: 'Biaya aktual periode ini belum tersedia atau nol' };
  }
  if (!(finance.investment > 0)) return { value: null, reason: 'Nilai investasi FS belum tersedia' };
  return { value: progress.actual * finance.investment / finance.totalToDate, reason: '' };
}

function financialRow_(db, p, m, no, weight) {
  const J = function(v) { return v === null || v === undefined ? null : v / 1000000; };
  const investment = J(monthlyValue_(db, p.id, 'NILAI_INVESTASI_FS'));
  const contract = J(monthlyValue_(db, p.id, 'NILAI_KONTRAK'));
  const ITEM = 'TOTAL_INVESTASI_AKTUAL';

  let historical = null;
  db.monthly.yearTotals.forEach(function(t) {
    if (t.year >= m.year) return;
    const v = cellNumber_(db.monthly, p.id, ITEM, t.col);
    if (v !== null) historical = (historical || 0) + v;
  });
  // Bulan pada tahun-tahun sebelumnya yang tidak punya kolom TOTAL_<tahun>.
  db.monthly.months.forEach(function(mm) {
    if (mm.year < m.year && !db.monthly.yearTotals.some(function(t) { return t.year === mm.year; })) {
      const v = cellNumber_(db.monthly, p.id, ITEM, mm.col);
      if (v !== null) historical = (historical || 0) + v;
    }
  });

  let ytd = null;
  db.monthly.months.forEach(function(mm) {
    if (mm.year === m.year && mm.month <= m.month) {
      const v = cellNumber_(db.monthly, p.id, ITEM, mm.col);
      if (v !== null) ytd = (ytd || 0) + v;
    }
  });

  const yearTotal = db.monthly.yearTotals.find(function(t) { return t.year === m.year; });
  let rkapYear = yearTotal ? cellNumber_(db.monthly, p.id, 'RKAP', yearTotal.col) : null;
  if (rkapYear === null) {
    db.monthly.months.forEach(function(mm) {
      if (mm.year === m.year) {
        const v = cellNumber_(db.monthly, p.id, 'RKAP', mm.col);
        if (v !== null) rkapYear = (rkapYear || 0) + v;
      }
    });
  }

  let rkapToDate = null;
  db.monthly.months.forEach(function(mm) {
    if (mm.year === m.year && mm.month <= m.month) {
      const v = cellNumber_(db.monthly, p.id, 'RKAP', mm.col);
      if (v !== null) rkapToDate = (rkapToDate || 0) + v;
    }
  });

  const row = {
    no: no,
    project: p.fullName,
    investment: investment,
    contract: contract,
    weight: weight,
    historical: J(historical),
    monthActual: J(cellNumber_(db.monthly, p.id, ITEM, m.col)),
    monthRkap: J(cellNumber_(db.monthly, p.id, 'RKAP', m.col)),
    actualToDate: J(ytd),
    rkap2026: J(rkapYear),
    rkapToDate: J(rkapToDate),
    totalToDate: historical === null && ytd === null ? null : J((historical || 0) + (ytd || 0)),
    forecastPhysical: null,
    forecastAbsorption: null,
    forecastPercent: null
  };
  row.achievement = row.rkap2026 ? (row.actualToDate || 0) / row.rkap2026 : null;
  row.investmentAchievement = row.investment && row.totalToDate !== null ? row.totalToDate / row.investment : null;
  return row;
}

/**
 * Progres fisik kumulatif bulanan (pecahan 0..1).
 * Prioritas: PLAN_MONTHLY_PROGRESS / AKTUAL_MONTHLY_PROGRESS di DATA BULANAN.
 * Jika kosong: diambil dari data mingguan pada minggu terakhir bulan tersebut.
 */
function monthlyProgress_(db, p, m) {
  const frac = function(v) { return v === null ? null : (Math.abs(v) > 1.5 ? v / 100 : v); };
  let plan = frac(cellNumber_(db.monthly, p.id, 'PLAN_MONTHLY_PROGRESS', m.col));
  let actual = frac(cellNumber_(db.monthly, p.id, 'AKTUAL_MONTHLY_PROGRESS', m.col));
  const info = weeklyInfo_(db, p);
  // Tautan aktual ke minggu yang belum diinput bernilai 0: bandingkan plan & aktual pada minggu terakhir yang sudah diinput.
  if (actual === 0 && plan !== null && plan > 0.0001 && info.latestWeek && info.startDate &&
      cutWeekOf_(db, p, m) > info.latestWeek) { plan = null; actual = null; }
  if (plan !== null && actual !== null) return { plan: plan, actual: actual };

  if (!info.startDate || (!info.latestWeek && !info.planEndWeek)) return { plan: plan, actual: actual };

  let w = cutWeekOf_(db, p, m);
  // Jika input mingguan belum sampai akhir bulan, plan & aktual dibandingkan pada minggu aktual terakhir.
  if (actual === null && info.latestWeek && w > info.latestWeek && w <= info.latestWeek + 4) w = info.latestWeek;
  if (plan === null) {
    if (w < 1) plan = 0;
    else if (info.planEndWeek) {
      const v = weekPercent_(db.weekly, p.id, 'KOMULATIF_PLAN', Math.min(w, info.planEndWeek));
      plan = w >= info.planEndWeek ? 1 : (v === null ? null : v / 100);
    }
  }
  if (actual === null) {
    if (w < 1) actual = 0;
    else if (info.latestWeek && w <= info.latestWeek + 4) {
      const v = weekPercent_(db.weekly, p.id, 'KOMULATIF_REALISASI', Math.min(w, info.latestWeek));
      actual = v === null ? null : v / 100;
    }
  }
  return { plan: plan, actual: actual };
}

/** Termin terbayar (juta Rupiah) = PLANT_COST_ACTUAL kolom TOTAL_ALL. */
function termPaid_(db, p) {
  const v = cellNumber_(db.monthly, p.id, 'PLANT_COST_ACTUAL', db.monthly.totalAllCol);
  return v === null ? null : v / 1000000;
}

/** Termin terbayar dibanding nilai kontrak (pecahan 0..1). */
function termPaidPercent_(db, p) {
  const termin = termPaid_(db, p);
  const contract = monthlyValue_(db, p.id, 'NILAI_KONTRAK');
  return termin === null || !contract ? null : termin / (contract / 1000000);
}

/** Kelengkapan laporan bulanan bulan m: proyek wajib lapor = sudah mulai (EFEKTIF_DATE_START) dan belum selesai/ditutup sebelum bulan m. */
/**
 * Bulan pertama laporan bulanan proyek (indeks tahun*12+bulan).
 * Penyesuaian di menu Tambah/Edit Proyek (Script Properties PMO_REPORT_PERIOD) dipakai lebih dulu;
 * bila bulan mulai sudah berisi laporan biaya, bulan itu tetap dipakai; selain itu tanggal mulai
 * setelah cut-off (tgl 25) masuk ke bulan berikutnya.
 */
function projectReportStartKey_(db, p) {
  const start = monthlyDate_(db, p.id, 'EFEKTIF_DATE_START');
  if (!start) return null;
  const sk = start.getFullYear() * 12 + start.getMonth();
  const cache = db._reportStart = db._reportStart || {};
  if (cache[p.id] !== undefined) return cache[p.id];
  let k = sk;
  try {
    if (!db._reportOv) db._reportOv = JSON.parse(PropertiesService.getScriptProperties().getProperty('PMO_REPORT_PERIOD') || '{}') || {};
    const ov = db._reportOv[p.id], m = ov && /^(\d{4})-(\d{2})$/.exec(String(ov.first || ''));
    const startMonth = db.monthly.months.find(function(x) { return x.year * 12 + x.month === sk; });
    const reported = startMonth && db.monthly.projects[p.id] && ['TOTAL_INVESTASI_AKTUAL', 'PM_COST_AKTUAL', 'PLANT_COST_ACTUAL', 'IDC_ACTUAL'].some(function(item) {
      const v = cellNumber_(db.monthly, p.id, item, startMonth.col); return v !== null && v !== 0;
    });
    const cut = typeof PROJECT_CONFIG !== 'undefined' && PROJECT_CONFIG.MONTH_CUTOFF_DAY ? PROJECT_CONFIG.MONTH_CUTOFF_DAY : 25;
    if (reported) k = sk;
    else if (m) k = Math.min(sk + 1, Math.max(sk, Number(m[1]) * 12 + Number(m[2]) - 1));
    else k = sk + (start.getDate() > cut ? 1 : 0);
  } catch (e) { k = sk; }
  cache[p.id] = k;
  return k;
}

/** Week cut-off laporan bulan m (milestone bulanan): tautan PLAN/AKTUAL_MONTHLY_PROGRESS ke DATA MINGGUAN;
 *  cadangan: tanggal cut-off (tgl 25), lalu akhir bulan. */
function cutWeekOf_(db, p, m) {
  db._cutL = db._cutL || {};
  if (!db._cutL[p.id]) { try { db._cutL[p.id] = monthWeekLinks_(db, p) || {}; } catch (e) { db._cutL[p.id] = {}; } }
  const L = db._cutL[p.id], k = monthKey_(m);
  if (L[k]) return L[k];
  const info = weeklyInfo_(db, p); if (!info.startDate) return 0;
  try { const w = cutoffWeek_(info.startDate, m, 99999); if (w) return w; } catch (e) {}
  return weekForDate_(info.startDate, monthEnd_(m));
}
/** Bulan m sudah punya cut-off bagi proyek p: tanggal cut-off bulan m minimal satu minggu setelah proyek mulai
 *  (proyek yang mulai tgl 25 Oktober baru punya cut-off pertama di November). */
function monthHasCutoff_(db, p, m) {
  const info = weeklyInfo_(db, p);
  if (!info.startDate || isNaN(info.startDate)) return true;
  try { return cutoffWeek_(info.startDate, m, 99999) >= 1; } catch (e) { return true; }
}
/** Proyek wajib lapor pada bulan m: sudah mulai (dan masuk periode laporannya) dan belum selesai/ditutup sebelum bulan m. */
function monthRequired_(db, p, m) {
  db._req = db._req || {};
  const key = p.id + '|' + m.year + '-' + m.month;
  if (db._req[key] !== undefined) return db._req[key];
  const first = new Date(m.year, m.month, 1), nextFirst = new Date(m.year, m.month + 1, 1);
  const start = monthlyDate_(db, p.id, 'EFEKTIF_DATE_START');
  let ok = !!start && start < nextFirst;
  if (ok) { const sk = projectReportStartKey_(db, p); if (sk !== null && m.year * 12 + m.month < sk) ok = false; }
  if (ok) {
    db._life = db._life || {};
    const life = db._life[p.id] || (db._life[p.id] = projectLifecycle_(db, p));
    const end = life.finishDate || life.closeDate;
    if (life.stage !== 'BERJALAN' && end && end < first) ok = false;
  }
  return (db._req[key] = ok);
}
/** Input mingguan proyek p sudah mencapai week cut-off bulan m. */
function weeklyReadyFor_(db, p, m) {
  const info = weeklyInfo_(db, p);
  if (!info.startDate || !info.latestWeek) return false;
  const cw = cutWeekOf_(db, p, m), need = info.maxWeek ? Math.min(cw, info.maxWeek) : cw;
  return need >= 1 && info.latestWeek >= need;
}
/** Progres bulanan untuk Executive: proyek wajib lapor yang input mingguannya belum sampai cut-off = menunggu (null). */
function execProgress_(db, p, m) {
  const info = weeklyInfo_(db, p);
  if (info.latestWeek && monthRequired_(db, p, m) && !weeklyReadyFor_(db, p, m)) return { plan: null, actual: null, pending: true };
  return monthlyProgress_(db, p, m);
}
/** Periode Executive (s.d. bulan berjalan): ada laporan biaya, atau ≥1 proyek wajib lapor sudah sampai week cut-off. */
function executivePeriods_(db, projects) {
  const today = new Date(), tk = today.getFullYear() * 12 + today.getMonth();
  let valid = db.monthly.months.filter(function(m) {
    if (m.year * 12 + m.month > tk) return false;
    return projects.some(function(p) { return monthSubmitted_(db, p, m) || (monthRequired_(db, p, m) && weeklyReadyFor_(db, p, m)); });
  });
  if (!valid.length) valid = db.monthly.months.filter(function(m) { return new Date(m.year, m.month, 1) <= today; });
  return valid;
}
/** Keterangan periode: proyek yang belum sampai cut-off & bulan dasar keuangan. */
function executivePeriodStatus_(db, projects, selected, finM, finStatus) {
  const req = projects.filter(function(p) { return monthRequired_(db, p, selected); });
  const waiting = req.filter(function(p) { const i = weeklyInfo_(db, p); return i.latestWeek && !weeklyReadyFor_(db, p, selected); })
    .map(function(p) { return { name: p.name, cutWeek: cutWeekOf_(db, p, selected), latestWeek: weeklyInfo_(db, p).latestWeek }; });
  return { period: selected.label, weeklyReady: req.length - waiting.length, weeklyTotal: req.length, waiting: waiting,
    finance: finM !== selected ? { period: finM.label, filled: finStatus.filled, total: finStatus.total, missing: finStatus.missing } : null };
}

function monthReportStatus_(db, projects, m) {
  const first = new Date(m.year, m.month, 1), nextFirst = new Date(m.year, m.month + 1, 1);
  const need = projects.filter(function(p) {
    const start = monthlyDate_(db, p.id, 'EFEKTIF_DATE_START');
    if (!start || start >= nextFirst) return false;
    const sk = projectReportStartKey_(db, p);
    if (sk !== null && m.year * 12 + m.month < sk) return false;
    const life = projectLifecycle_(db, p);
    const end = life.finishDate || life.closeDate;
    return !(life.stage !== 'BERJALAN' && end && end < first);
  });
  const missing = need.filter(function(p) { return !monthHasReport_(db, p, m); }).map(function(p) { return p.name; });
  return { complete: need.length > 0 && !missing.length, filled: need.length - missing.length, total: need.length, missing: missing };
}

function monthSubmitted_(db, p, m) {
  return ['TOTAL_INVESTASI_AKTUAL', 'PM_COST_AKTUAL', 'AKTUAL_MONTHLY_PROGRESS'].some(function(item) {
    const v = cellNumber_(db.monthly, p.id, item, m.col);
    return v !== null && v !== 0;
  });
}

// ===================== PEMBACA DATABASE =====================

let DB_CACHE_ = null;

/* ===== C1b: cache DATA MINGGUAN & DATA BULANAN khusus fungsi BACA =====
 * Fungsi baca memanggil dbReadOnly_() di awal; loadDb_() lalu memakai salinan dari cache
 * (kunci = versi data yang sama dengan C1: berubah saat ada simpan atau edit langsung di sheet).
 * Fungsi simpan tidak memanggil dbReadOnly_(), jadi selalu membaca langsung dari sheet.
 * Spreadsheet & sheet baru dibuka bila benar-benar dipakai. Saklar: PMO_STORE_CACHE = OFF (sama dengan C1). */
let DB_RO_ = false;
function dbReadOnly_() { DB_RO_ = true; }
function dbStrip_(sd) { const o = {}; Object.keys(sd).forEach(function(k) { if (k !== 'sheet') o[k] = sd[k]; }); return o; }
function dbRevive_(snap) {
  let ss = null;
  const getSs = function() { return ss || (ss = SpreadsheetApp.openById(SPREADSHEET_ID)); };
  const db = { weekly: snap.weekly, monthly: snap.monthly, allProjects: snap.allProjects || [], projects: [] };
  Object.defineProperty(db, 'ss', { get: getSs, enumerable: false, configurable: true });
  [db.weekly, db.monthly].forEach(function(sd) {
    let sh = null;
    Object.defineProperty(sd, 'sheet', { get: function() { return sh || (sh = getSs().getSheetByName(sd.name)); }, enumerable: false, configurable: true });
  });
  const show = {}; (snap.shown || []).forEach(function(id) { show[id] = 1; });
  db.projects = db.allProjects.filter(function(p) { return show[p.id]; });
  return db;
}
function dbFromCache_() {
  try {
    let fresh = null;
    const snap = storeCached_('db', function() {
      dbFromCache_.busy = true;
      try { fresh = loadDb_(); } finally { dbFromCache_.busy = false; }
      return { weekly: dbStrip_(fresh.weekly), monthly: dbStrip_(fresh.monthly), allProjects: fresh.allProjects, shown: fresh.projects.map(function(p) { return p.id; }) };
    });
    return fresh || dbRevive_(snap);
  } catch (e) {
    console.log(JSON.stringify({ ev: 'store_cache', name: 'db', err: String(e && e.message || e) }));
    return null;
  }
}

/** Membaca kedua sheet data sekali per eksekusi. */
function loadDb_() {
  if (DB_CACHE_) return DB_CACHE_;
  if (DB_RO_ && !dbFromCache_.busy) { const c = dbFromCache_(); if (c) return (DB_CACHE_ = c); }
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const weekly = readLongSheet_(ss, DB_SHEETS.WEEKLY);
  const monthly = readLongSheet_(ss, DB_SHEETS.MONTHLY);

  // Kolom minggu: header "WEEK n".
  weekly.weekCols = {};
  weekly.headers.forEach(function(h, c) {
    const m = String(h || '').trim().match(/^WEEK\s*(\d+)$/i);
    if (m) weekly.weekCols[Number(m[1])] = c;
  });

  // Kolom bulan, TOTAL_<tahun>, VALUE.
  monthly.months = [];
  monthly.yearTotals = [];
  monthly.valueCol = -1;
  monthly.totalAllCol = -1;
  monthly.headers.forEach(function(h, c) {
    const text = String(h || '').trim();
    const key = normKey_(text);
    if (key === 'VALUE') { monthly.valueCol = c; return; }
    if (key === 'TOTAL_ALL') { monthly.totalAllCol = c; return; }
    const total = key.match(/^TOTAL_(\d{4})$/);
    if (total) { monthly.yearTotals.push({ year: Number(total[1]), col: c }); return; }
    const month = parseMonthHeader_(text);
    if (month) monthly.months.push({ label: month.label, raw: text, year: month.year, month: month.month, col: c });
  });
  monthly.months.sort(function(a, b) { return (a.year - b.year) || (a.month - b.month); });

  // Registry proyek (urutan sesuai kemunculan di sheet).
  const map = {};
  const projects = [];
  [weekly, monthly].forEach(function(sheet) {
    sheet.order.forEach(function(id) {
      const meta = sheet.projects[id];
      if (!map[id]) {
        map[id] = { id: id, team: meta.team, fullName: meta.name, name: cleanProjectName_(meta.name || id) };
        projects.push(map[id]);
      } else {
        if (!map[id].team && meta.team) map[id].team = meta.team;
        if (!map[id].fullName && meta.name) { map[id].fullName = meta.name; map[id].name = cleanProjectName_(meta.name); }
      }
    });
  });

  DB_CACHE_ = { ss: ss, weekly: weekly, monthly: monthly, projects: [], allProjects: projects };
  DB_CACHE_.projects = projects.filter(function(p) {
    return DB_CONFIG.SHOW_EMPTY_PROJECTS || isProjectActive_(DB_CACHE_, p);
  });
  return DB_CACHE_;
}

/** Membaca sheet berformat PROYEK_ID | TIM_PROYEK | NAMA_PROYEK | ITEM_DATA | ... */
function readLongSheet_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet ' + name + ' tidak ditemukan.');
  const range = sheet.getDataRange();
  const values = range.getValues();
  const display = range.getDisplayValues();

  let headerRow = -1;
  for (let r = 0; r < Math.min(values.length, 30); r++) {
    if (normKey_(display[r][0]) === 'PROYEK_ID') { headerRow = r; break; }
  }
  if (headerRow < 0) throw new Error('Header PROYEK_ID tidak ditemukan pada sheet ' + name + '.');

  const projects = {};
  const order = [];
  for (let r = headerRow + 1; r < values.length; r++) {
    const id = normKey_(display[r][0]);
    const item = normKey_(display[r][3]);
    if (!id || !item) continue;
    if (!projects[id]) {
      projects[id] = { team: String(display[r][1] || '').trim(), name: String(display[r][2] || '').trim(), items: {} };
      order.push(id);
    }
    if (!projects[id].items[item]) projects[id].items[item] = r; // indeks baris (0-based)
  }

  return { sheet: sheet, name: name, values: values, display: display, headerRow: headerRow,
           headers: display[headerRow], projects: projects, order: order };
}

function itemRow_(sheetData, projectId, item) {
  const p = sheetData.projects[projectId];
  if (!p) return -1;
  const r = p.items[normKey_(item)];
  return r === undefined ? -1 : r;
}

function cellNumber_(sheetData, projectId, item, col) {
  const r = itemRow_(sheetData, projectId, item);
  if (r < 0 || col < 0) return null;
  return toNumber_(sheetData.values[r][col], sheetData.display[r][col]);
}

function cellText_(sheetData, projectId, item, col) {
  const r = itemRow_(sheetData, projectId, item);
  if (r < 0 || col < 0) return '';
  const t = String(sheetData.display[r][col] || '').trim();
  return t === '-' ? '' : t;
}

function cellLink_(sheetData, projectId, item, col) {
  const r = itemRow_(sheetData, projectId, item);
  if (r < 0 || col < 0) return '';
  const text = String(sheetData.display[r][col] || '').trim();
  if (/^https?:\/\//i.test(text)) return text;
  if (!text || text === '-') return '';
  if (!sheetData._links) sheetData._links = {};
  const k = r + ':' + col;
  if (sheetData._links[k] !== undefined) return sheetData._links[k];
  return (sheetData._links[k] = readLinkFromCell_(sheetData.sheet.getRange(r + 1, col + 1)));
}

// --- weekly helpers ---
function weekCol_(W, week) { const c = W.weekCols[week]; return c === undefined ? -1 : c; }

function weekRaw_(W, projectId, item, week) {
  const r = itemRow_(W, projectId, item);
  const c = weekCol_(W, week);
  if (r < 0 || c < 0) return null;
  const v = W.values[r][c];
  const shown = String(W.display[r][c] || '').trim();
  if (v === '' || v === null || v === undefined || shown === '' || shown === '-') return null;
  return v;
}

function weekText_(W, projectId, item, week) { return cellText_(W, projectId, item, weekCol_(W, week)); }
function weekLink_(W, projectId, item, week) { return cellLink_(W, projectId, item, weekCol_(W, week)); }

/** Nilai persen 0..100 (sama seperti percentAt versi lama). */
function weekPercent_(W, projectId, item, week) {
  const r = itemRow_(W, projectId, item);
  const c = weekCol_(W, week);
  if (r < 0 || c < 0) return null;
  const v = W.values[r][c];
  const shown = String(W.display[r][c] || '').trim();
  if (v === '' || v === null || v === undefined || shown === '' || shown === '-') return null;
  if (shown.indexOf('%') >= 0) {
    // Sel berformat persen menyimpan pecahan (0.9533 = 95.33%); pakai nilai asli agar tidak terpotong pembulatan tampilan.
    if (typeof v === 'number' && Number.isFinite(v)) return v * 100;
    const n = Number(shown.replace(/[%\s]/g, '').replace(/,/g, ''));
    if (Number.isFinite(n)) return n;
  }
  const n = toNumber_(v, shown);
  if (n === null) return null;
  return Math.abs(n) <= 1.000001 ? n * 100 : n;
}

function lastFilledWeek_(W, projectId, item) {
  const weeks = Object.keys(W.weekCols).map(Number).sort(function(a, b) { return a - b; });
  let last = 0;
  weeks.forEach(function(w) { if (w > 0 && weekRaw_(W, projectId, item, w) !== null) last = w; });
  return last;
}

function weeklyHasData_(db, p) { return lastFilledWeek_(db.weekly, p.id, 'KOMULATIF_REALISASI') > 0; }

function weeklyInfo_(db, p) {
  db._info = db._info || {};
  if (db._info[p.id]) return db._info[p.id];
  const maxWeekCfg = Number(monthlyValue_(db, p.id, 'MAX_WEEK')) || 0;
  const info = {
    latestWeek: lastFilledWeek_(db.weekly, p.id, 'KOMULATIF_REALISASI'),
    planEndWeek: lastFilledWeek_(db.weekly, p.id, 'KOMULATIF_PLAN'),
    startDate: monthlyDate_(db, p.id, 'EFEKTIF_DATE_START')
  };
  info.maxWeek = maxWeekCfg || info.planEndWeek || info.latestWeek;
  db._info[p.id] = info;
  return info;
}

// --- monthly helpers ---
function monthlyValue_(db, projectId, item) {
  return cellNumber_(db.monthly, projectId, item, db.monthly.valueCol);
}

function monthlyText_(db, projectId, item) {
  return cellText_(db.monthly, projectId, item, db.monthly.valueCol);
}

function monthlyDate_(db, projectId, item) {
  const M = db.monthly;
  const r = itemRow_(M, projectId, item);
  if (r < 0 || M.valueCol < 0) return null;
  const v = M.values[r][M.valueCol];
  if (v instanceof Date && !isNaN(v)) return v;
  return parseDateText_(String(M.display[r][M.valueCol] || ''), db.ss);
}

function monthText_(db, projectId, item, m) { return cellText_(db.monthly, projectId, item, m.col); }
function monthLink_(db, projectId, item, m) { return cellLink_(db.monthly, projectId, item, m.col); }

// ===================== AKSES PENGGUNA =====================

function requireUser_(token) {
  const session = authGetSession(token);
  if (!session || !session.success || !session.user) throw new Error('Sesi tidak valid. Silakan login kembali.');
  return session.user;
}

function isPortfolioUser_(user) {
  return !!user;
}

/** Semua akun yang login boleh melihat seluruh portofolio proyek. */
function userCanAccess_(user, project) {
  if (!user || !project) return false;
  // akun KONTRAKTOR hanya melihat proyek sesuai PROYEK_ID akunnya
  if (String(user.role || '').trim().toUpperCase() === 'KONTRAKTOR') { const id = normKey_(user.projectId || ''); return !!id && id === normKey_(project.id); }
  return true;
}

/** Hak mengubah data harus cocok dengan PROYEK_ID, bukan nama tim pada kolom PROYEK. */
function userCanOperateProject_(user, project) {
  if (!user || !project) return false;
  const role = String(user.role || '').trim().toUpperCase();
  if (role === 'ADMIN') return true;
  if (role !== 'INPUT' && role !== 'PIC') return false;
  const assignedId = normKey_(user.projectId || '');
  return !!assignedId && assignedId !== 'ALL' && assignedId === normKey_(project.id);
}

function findProject_(list, requested) {
  const key = compactKey_(String(requested || '').replace(/^\s*PROYEK\s*/i, ''));
  if (!key) return null;
  return list.find(function(p) { return compactKey_(p.id) === key || compactKey_(p.name) === key; }) ||
    list.find(function(p) {
      const id = compactKey_(p.id), name = compactKey_(p.name);
      return key.length >= 3 && (name.indexOf(key) >= 0 || key.indexOf(name) >= 0 || id.indexOf(key) >= 0 || key.indexOf(id) >= 0);
    }) || null;
}

// ===================== UTILITAS =====================

function normKey_(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function compactKey_(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function cleanProjectName_(name) {
  return String(name || '').replace(/^\s*PROYEK\s*/i, '').trim();
}

function toNumber_(value, shown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return null;
  const text = String(shown !== undefined && shown !== null && shown !== '' ? shown : value || '').trim();
  if (!text || text === '-' || text === '—') return null;
  const isPercent = text.indexOf('%') >= 0;
  let clean = text.replace(/[^0-9,.\-]/g, '');
  if (!clean || clean === '-') return null;
  // Format Indonesia (1.234,56) vs format US (1,234.56).
  if (/,\d{1,2}$/.test(clean) && clean.indexOf('.') >= 0 && clean.lastIndexOf('.') < clean.lastIndexOf(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else {
    clean = clean.replace(/,/g, '');
  }
  const n = Number(clean);
  if (!Number.isFinite(n)) return null;
  return isPercent ? n / 100 : n;
}

const MONTHS_ID_ = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTH_ALIASES_ = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, MEI: 4, JUN: 5, JUL: 6, AUG: 7, AGU: 7, AGT: 7,
  SEP: 8, OCT: 9, OKT: 9, NOV: 10, DEC: 11, DES: 11
};

function parseMonthHeader_(text) {
  const m = String(text || '').trim().match(/^([A-Za-z]+)[\s\-\/']+(\d{2}|\d{4})$/);
  if (!m) return null;
  const month = MONTH_ALIASES_[m[1].slice(0, 3).toUpperCase()];
  if (month === undefined) return null;
  let year = Number(m[2]);
  if (year < 100) year += 2000;
  return { month: month, year: year, label: MONTHS_ID_[month] + ' ' + year };
}

function monthEnd_(m) { return new Date(m.year, m.month + 1, 0); }

function weekForDate_(startDate, date) {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  return Math.floor((date - start) / (7 * 24 * 3600 * 1000)) + 1;
}

function parseDateText_(text, ss) {
  text = String(text || '').trim();
  if (!text) return null;
  let m = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    const usLocale = /^en_US/i.test(ss ? ss.getSpreadsheetLocale() : '');
    const a = Number(m[1]), b = Number(m[2]);
    const month = usLocale ? a : b, day = usLocale ? b : a;
    return new Date(Number(m[3]), month - 1, day);
  }
  m = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const month = MONTH_ALIASES_[m[2].slice(0, 3).toUpperCase()];
    if (month !== undefined) return new Date(Number(m[3]), month, Number(m[1]));
  }
  const d = new Date(text);
  return isNaN(d) ? null : d;
}

function formatDateId_(date) {
  return date.getDate() + ' ' + MONTHS_ID_[date.getMonth()] + ' ' + date.getFullYear();
}

function formatRupiah_(value) {
  const n = Math.round(Number(value) || 0);
  const s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return 'Rp ' + (n < 0 ? '-' : '') + s;
}

/** Membaca URL dari sel: hyperlink teks, formula HYPERLINK, atau URL langsung. */
function readLinkFromCell_(cell) {
  const rich = cell.getRichTextValue();
  if (rich) {
    const url = rich.getLinkUrl();
    if (url) return url;
    const runs = rich.getRuns();
    for (let i = 0; i < runs.length; i++) {
      const runUrl = runs[i].getLinkUrl();
      if (runUrl) return runUrl;
    }
  }
  const formula = cell.getFormula();
  const match = formula && formula.match(/^=HYPERLINK\(\s*"([^"]+)"/i);
  if (match) return match[1];
  const value = String(cell.getDisplayValue() || '').trim();
  return /^https?:\/\//i.test(value) ? value : '';
}

// ===================== SETUP & DIAGNOSA =====================

/**
 * Fungsi uji / diagnostik hanya boleh dijalankan dari editor Apps Script (tombol Run), tidak dari browser.
 * Semua fungsi tanpa akhiran _ bisa dipanggil lewat google.script.run, termasuk oleh pengunjung yang belum login.
 * Di editor, pengguna aktif = akun yang menjalankan script; panggilan anonim / akun lain dari web app ditolak.
 */
function editorOnly_() {
  let a = '', e = '';
  try { a = String(Session.getActiveUser().getEmail() || '').toLowerCase(); e = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (x) {}
  if (!a || a !== e) throw new Error('Fungsi ini hanya bisa dijalankan dari editor Apps Script.');
}

function testDatabaseConnection() {
  editorOnly_();
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    return { success: true, message: 'Koneksi database berhasil.', spreadsheetName: ss.getName(),
      sheetCount: ss.getSheets().length, sheetNames: ss.getSheets().map(function(s) { return s.getName(); }) };
  } catch (error) {
    return { success: false, message: 'Koneksi database gagal.', detail: error.message };
  }
}

/** Jalankan dari editor: ringkasan semua proyek yang terbaca. */
function inspectDatabase() {
  editorOnly_();
  const db = loadDb_();
  console.log('Kolom minggu: ' + Object.keys(db.weekly.weekCols).length +
    ' | Kolom bulan: ' + db.monthly.months.length +
    ' (' + (db.monthly.months[0] || {}).label + ' – ' + (db.monthly.months[db.monthly.months.length - 1] || {}).label + ')');
  db.projects.forEach(function(p) {
    const info = weeklyInfo_(db, p);
    console.log([p.id, p.name, p.team, 'latestWeek=' + info.latestWeek, 'planEnd=' + info.planEndWeek,
      'start=' + (info.startDate ? formatDateId_(info.startDate) : '-'),
      'investasi=' + monthlyValue_(db, p.id, 'NILAI_INVESTASI_FS')].join(' | '));
  });
}

/** Uji API tanpa login (sebagai ADMIN). */
function testWeeklyAdmin() {
  editorOnly_();
  const data = buildWeeklyData_({ username: 'test', name: 'Tester', role: 'ADMIN', project: 'ALL' }, '', 'Dermaga A');
  console.log(JSON.stringify({ project: data.project, week: data.week, overall: data.overall, fields: data.fields,
    hse: data.hse, profile: data.profile, period: data.period }, null, 2));
}

function testExecutiveAdmin() {
  editorOnly_();
  const data = buildExecutiveData_({ username: 'test', name: 'Tester', role: 'ADMIN', project: 'ALL' }, '');
  console.log(JSON.stringify({ period: data.period, periods: data.periods, summary: data.summary,
    projects: data.projects, financialTotals: data.financial && data.financial.totals }, null, 2));
}


// ===================== EXECUTIVE · 3 MONTH LOOK AHEAD =====================
function executiveLookAheadTasks_(candidates,fieldWeight,totalWeight){
  return candidates.filter(function(x){return x.actual===null||x.actual<99.995;}).map(function(x){
    const delta=Math.max(0,x.planEnd-x.planBefore);
    const status=x.actual===null?'Realisasi belum tersedia':x.planNow===null?'Rencana pembanding belum tersedia':x.actual+0.005<x.planNow?'Di bawah rencana':x.actual>0?'Berjalan sesuai rencana':'Belum mulai';
    return {code:x.code,name:x.name,groupCode:x.groupCode||'',groupName:x.groupName||'',discipline:x.discipline||'',target:x.planEnd,actual:x.actual,plan:x.planNow,status:status,contribution:fieldWeight===null||!totalWeight?null:fieldWeight*x.weight/totalWeight*delta/100,delta:delta};
  }).filter(function(x){return x.delta>0.001;}).sort(function(a,b){return (b.contribution===null?b.delta:b.contribution)-(a.contribution===null?a.delta:a.contribution)||a.code.localeCompare(b.code);}).slice(0,1);
}
function getExecutiveLookAhead(token,requestedPeriod){
  dbReadOnly_(); // C1b: baca DATA MINGGUAN/BULANAN dari cache
  const user=requireUser_(token);ktrBlock_(user);
  return perfCached_('la-v2|'+String(requestedPeriod||''),function(){return executiveLookAheadBuild_(user,requestedPeriod);});
}
function executiveLookAheadBuild_(user,requestedPeriod){
  const db=loadDb_();
  const selected=executiveLookAheadPeriod_(db,user,requestedPeriod);
  if(!selected)throw new Error('Periode Look Ahead tidak ditemukan.');
  const labels=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const months=[1,2,3].map(function(n){const first=new Date(selected.year,selected.month+n,1),end=new Date(first.getFullYear(),first.getMonth()+1,0),before=new Date(first.getFullYear(),first.getMonth(),0);return {label:labels[first.getMonth()]+' '+first.getFullYear(),end:end,before:before,endIso:isoDate_(end),beforeIso:isoDate_(before)};});
  const today=new Date(),selectedStart=new Date(selected.year,selected.month,1);
  const projects=db.projects.filter(function(p){if(!userCanAccess_(user,p)||!projectReady_(db,p).ready)return false;const current=projectLifecycle_(db,p),recentDone=(current.stage==='SELESAI'||current.stage==='DITUTUP')&&current.finishDate&&current.finishDate>=selectedStart&&current.finishDate<=months[2].end&&current.finishDate<=today;return projectLifecycle_(db,p,monthEnd_(selected)).stage==='BERJALAN'||recentDone;});
  const read=executiveLookAheadReader_(db.ss,projects);
  let eng=null,epc=null,engError='',epcError='';
  try{eng=executiveLookAheadEngStore_(read);}catch(e){engError='Data Engineering belum dapat dibaca.';}
  try{epc=executiveLookAheadEpcStore_(read);}catch(e){epcError='Data EPCC belum dapat dibaca.';}

  const fields=['Engineering','Procurement','Construction','Commissioning'];
  const result=projects.map(function(p){
    const info=weeklyInfo_(db,p);
    const fieldWeight=function(name){let v=weekPercent_(db.weekly,p.id,'BOBOT_'+name.toUpperCase(),Math.max(1,info.latestWeek));if(v===null)v=lastPercentBefore_(db.weekly,p.id,'BOBOT_'+name.toUpperCase(),9999);return v;};
    const views=fields.map(function(name,index){
      const out={name:name,baseline:false,revision:null,week:null,complete:false,monthStates:[null,null,null],message:'Baseline belum tersedia',months:[[],[],[]]};
      try{
        if(index===0){
          if(!eng){out.message=engError;out.error=true;return out;}
          const setting=eng.setting[p.id];if(!setting||setting.rev===null)return out;
          const docs=engBaselineOf_(eng,p.id,setting.rev);if(!docs.length)return out;
          out.baseline=true;out.revision=setting.rev;out.week=eng.stateWeek[p.id]||null;
          const P=engParamsOf_(eng,p.id,setting.rev),state=engStateOf_(eng,p.id);
          const cutoff=out.week?engCutoff_(isoDate_(info.startDate),out.week):'';
          const computed=cutoff?engCompute_(docs,P,state,cutoff):null;
          const byNo={};if(computed)computed.rows.forEach(function(r){byNo[r.no]=r;});
          out.complete=!!computed&&computed.rows.length===docs.length&&computed.rows.every(function(r){return r.prog>=99.995;});
          if(out.complete){out.message='Pekerjaan selesai';return out;}
          const sum=docs.reduce(function(v,d){return v+d.w;},0);
          const startIso=executiveLookAheadStart_('ENG',docs,info.startDate,P);
          out.months=months.map(function(m,i){const candidates=docs.map(function(d){const r=byNo[d.no];return {code:d.no,name:d.name,groupCode:d.wbs||'',groupName:'',discipline:d.disc||'',weight:d.w,actual:r&&state&&state[d.no]&&out.week?r.prog:null,planNow:r?r.plan:null,planBefore:engDocPlan_(d,P,m.beforeIso),planEnd:engDocPlan_(d,P,m.endIso)};});out.monthStates[i]=executiveLookAheadMonthState_(candidates,startIso,m.endIso);return executiveLookAheadTasks_(candidates,fieldWeight(name),sum);});
        }else{
          if(!epc){out.message=epcError;out.error=true;return out;}
          const F=['','PROC','CONS','COM'][index],key=p.id+'|'+F,setting=epc.setting[key];if(!setting)return out;
          const items=epc.items[key+'|'+setting.rev]||[];if(!items.length)return out;
          out.baseline=true;out.revision=setting.rev;out.week=epc.realWeek[key]||null;
          const state=epc.real[key]||{};
          out.complete=!!out.week&&items.every(function(it){return state[it.id]&&state[it.id].pg>=99.995;});
          if(out.complete){out.message='Pekerjaan selesai';return out;}
          const sum=items.reduce(function(v,it){return v+it.w;},0);
          const startIso=executiveLookAheadStart_('EPC',items,info.startDate,null);
          out.months=months.map(function(m,i){const wb=weekForDate_(info.startDate,m.before),we=weekForDate_(info.startDate,m.end);const candidates=items.map(function(it){const r=state[it.id];return {code:it.c||it.id,name:it.n,groupCode:it.gc||'',groupName:it.g||'',discipline:it.d||'',weight:it.w,actual:r?r.pg:null,planNow:out.week?epcPlanAt_(it.plan,out.week):null,planBefore:epcPlanAt_(it.plan,wb),planEnd:epcPlanAt_(it.plan,we)};});out.monthStates[i]=executiveLookAheadMonthState_(candidates,startIso,m.endIso);return executiveLookAheadTasks_(candidates,fieldWeight(name),sum);});
        }
        out.message=out.complete?'Pekerjaan selesai':'Tidak ada pekerjaan belum selesai dengan kenaikan rencana pada tiga bulan ini.';
      }catch(e){out.error=true;out.complete=false;out.message='Data baseline atau realisasi belum lengkap untuk menghitung Look Ahead.';out.months=[[],[],[]];}
      return out;
    });
    const xv=mscLookAhead_(db,p,months,fieldWeight),useXml=!!xv&&mscOpt_(db.ss,p.id).la==='XML';
    return {id:p.id,name:p.name,projectMonths:executiveLookAheadProjectMonths_(projectLifecycle_(db,p),months,today),fields:useXml?xv:views,alt:xv?(useXml?views:xv):null,source:useXml?'XML':'EPCC'};
  });
  return {success:true,period:selected.label,months:months.map(function(m){return {label:m.label};}),projects:result};
}


function executiveLookAheadPeriod_(db,user,requestedPeriod){
  const projects=db.projects.filter(function(p){return userCanAccess_(user,p);});
  const valid=executivePeriods_(db,projects);
  if(!valid.length)throw new Error('Belum ada periode dengan data bulanan yang tersubmit.');
  const reqKey = normKey_(requestedPeriod);
  const selected = valid.find(function(m) { return reqKey && (normKey_(m.label) === reqKey || normKey_(m.raw) === reqKey); }) || valid[valid.length - 1];

return selected;
}

function executiveLookAheadReader_(ss,projects){
  const allowed={};projects.forEach(function(p){allowed[p.id]=true;});
  return function(def){
    const sh=ss.getSheetByName(def[0]);if(!sh)return [];
    const rows=sh.getLastRow();if(rows<2)return [];
    const values=sh.getRange(1,1,rows,Math.max(sh.getLastColumn(),def[1].length)).getValues();
    const head=values[0].map(function(v){return String(v).trim().toUpperCase();}),idCol=head.indexOf('PROYEK_ID');
    return values.slice(1).filter(function(r){return idCol>=0&&allowed[String(r[idCol]||'').trim().toUpperCase()];}).map(function(r){const o={};head.forEach(function(h,i){if(h)o[h]=r[i];});return o;});
  };
}

function executiveLookAheadEngStore_(read) {
  const fmtAt = function(v) { return v instanceof Date && !isNaN(v) ? formatDateId_(v) + ' ' + String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0') : String(v || ''); };
  const up = function(v) { return String(v || '').trim().toUpperCase(); };
  const store = { setting: {}, revisions: {}, baseline: {}, real: {}, stateWeek: {}, progress: {} };
  read(ENG.SHEETS.SETTING).forEach(function(r) {
    const id = up(r.PROYEK_ID); if (!id) return;
    store.setting[id] = { mode: up(r.MODE) === 'OTOMATIS' ? 'OTOMATIS' : 'MANUAL', rev: r.REVISI_AKTIF === '' || r.REVISI_AKTIF === null ? null : Number(r.REVISI_AKTIF), by: '', atText: fmtAt(r.DIPERBARUI) };
  });
  read(ENG.SHEETS.REVISI).filter(function(r){const s=store.setting[up(r.PROYEK_ID)];return s&&s.rev!==null&&Number(r.REVISI)===s.rev;}).forEach(function(r) {
    const id = up(r.PROYEK_ID); if (!id) return;
    let params = null; try { params = JSON.parse(String(r.PARAMETER_JSON || '')); } catch (e) { params = null; }
    (store.revisions[id] = store.revisions[id] || []).push({ rev: Number(r.REVISI), note: String(r.CATATAN_REVISI || ''), docs: Number(r.JUMLAH_DOKUMEN) || 0, total: Number(r.TOTAL_BOBOT) || 0, params: params, file: String(r.NAMA_FILE || ''), by: '', atText: fmtAt(r.DIUNGGAH_PADA) });
  });
  read(ENG.SHEETS.BASELINE).filter(function(r){const s=store.setting[up(r.PROYEK_ID)];return s&&s.rev!==null&&Number(r.REVISI)===s.rev;}).forEach(function(r) {
    const id = up(r.PROYEK_ID); if (!id) return;
    const key = id + '|' + Number(r.REVISI);
    (store.baseline[key] = store.baseline[key] || []).push({ no: String(r.NOMOR_DOKUMEN || '').trim(), name: String(r.NAMA_DOKUMEN || ''), disc: String(r.DISIPLIN || ''), type: String(r.JENIS_DOKUMEN || ''), wbs: String(r.PAKET_WBS || ''),
      w: Number(r.BOBOT_DOK) || 0, pola: up(r.POLA), m: engIso_(r.RENCANA_MULAI), p: [engIso_(r.RENCANA_IFR), engIso_(r.RENCANA_IFA), engIso_(r.RENCANA_IFC), engIso_(r.RENCANA_IFI)], note: String(r.CATATAN || ''), _no: Number(r.NO) || 0, batal: up(r.STATUS) === 'BATAL' });
  });
  Object.keys(store.baseline).forEach(function(k) { store.baseline[k].sort(function(a, b) { return a._no - b._no; }); });
  const cell = function(v) { return v === null || v === undefined || v === '' ? '' : (isFinite(Number(v)) ? Number(v) : String(v).trim()); };
  read(ENG.SHEETS.REAL).forEach(function(r) {
    const id = up(r.PROYEK_ID); if (!id) return;
    const no = String(r.NOMOR_DOKUMEN || '').trim(); if (!no) return;
    (store.real[id] = store.real[id] || {})[no] = { mulai: engIso_(r.MULAI_AKTUAL), ifi: engIso_(r.IFI_TERBIT), note: String(r.CATATAN || ''),
      st: ENG.STAGES.map(function(k) { return [engIso_(r[k + '_TERBIT']), cell(r[k + '_KIRIM_KE']), cell(r[k + '_KODE'])]; }) };
    store.stateWeek[id] = Number(r.WEEK) || store.stateWeek[id] || null;
  });
  return store;
}

function executiveLookAheadEpcStore_(read) {
  const fmtAt = function(v) { return v instanceof Date && !isNaN(v) ? formatDateId_(v) + ' ' + String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0') : String(v || ''); };
  const up = function(v) { return String(v || '').trim().toUpperCase(); };
  const js = function(v, d) { try { return v === '' || v === null || v === undefined ? d : JSON.parse(String(v)); } catch (e) { return d; } };
  const store = { setting: {}, revisions: {}, items: {}, real: {}, realWeek: {}, progress: {} };
  read(EPC.SHEETS.SETTING).forEach(function(r) {
    const id = up(r.PROYEK_ID), F = up(r.BIDANG); if (!id || !F || r.REVISI_AKTIF === '' || r.REVISI_AKTIF === null) return;
    store.setting[id + '|' + F] = { rev: Number(r.REVISI_AKTIF), by: '', atText: fmtAt(r.DIPERBARUI) };
  });
  read(EPC.SHEETS.ITEM).filter(function(r){const s=store.setting[up(r.PROYEK_ID)+'|'+up(r.BIDANG)];return s&&Number(r.REVISI)===s.rev;}).forEach(function(r) {
    const id = up(r.PROYEK_ID), F = up(r.BIDANG); if (!id || !F) return;
    const key = id + '|' + F + '|' + Number(r.REVISI);
    (store.items[key] = store.items[key] || []).push({ _no: Number(r.NO) || 0, id: String(r.ID), c: String(r.KODE || ''), n: String(r.URAIAN || ''), d: String(r.DISIPLIN || ''), gc: String(r.GRUP_KODE || ''), g: String(r.GRUP || ''),
      t: up(r.TIPE), w: Number(r.BOBOT) || 0, sat: String(r.SATUAN || ''), vol: r.VOLUME, plan: js(r.RENCANA_JSON, []), jd: js(r.JADWAL_JSON, null), link: String(r.LINK_CONS || '').trim() });
  });
  Object.keys(store.items).forEach(function(k) { store.items[k].sort(function(a, b) { return a._no - b._no; }); });
  read(EPC.SHEETS.REAL).forEach(function(r) {
    const id = up(r.PROYEK_ID), F = up(r.BIDANG); if (!id || !F) return;
    const key = id + '|' + F;
    (store.real[key] = store.real[key] || {})[String(r.ID)] = { m: [Number(r.M1) || 0, Number(r.M2) || 0, Number(r.M3) || 0, Number(r.M4) || 0], pg: Number(r.PROGRES) || 0, tgl: js(r.TANGGAL_JSON, null), src: String(r.SUMBER || ''), by: '' };
    const w = Number(r.WEEK) || 0; if (w > (store.realWeek[key] || 0)) store.realWeek[key] = w;
  });
  return store;
}


function executiveLookAheadMonthState_(candidates,startIso,monthEndIso){
  const hasActual=candidates.some(function(x){return x.actual!==null&&x.actual!==undefined&&x.actual>0.001;});
  const noPlan=candidates.length>0&&candidates.every(function(x){return x.planBefore<=0.001&&x.planEnd<=0.001;});
  if(monthEndIso&&!hasActual&&noPlan&&(!startIso||startIso>monthEndIso)){
    const names=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const label=startIso?names[Number(startIso.slice(5,7))-1]+' '+startIso.slice(0,4):'';
    return {kind:'notStarted',message:'Belum ada rencana pekerjaan pada bulan ini.',detail:label?'Dijadwalkan mulai '+label+'.':'Jadwal mulai belum tersedia.'};
  }
  const remaining=candidates.filter(function(x){return x.actual===null||x.actual===undefined||x.actual<99.995;});
  if(remaining.some(function(x){return x.planEnd-x.planBefore>0.001;}))return {kind:'planned',message:''};
  if(remaining.some(function(x){return x.actual===null||x.actual===undefined;}))return {kind:'unknown',message:'Tidak ada tambahan rencana bulan ini. Status penyelesaian pekerjaan belum dapat dipastikan karena realisasi belum lengkap.'};
  if(remaining.length){
    const top=remaining.reduce(function(best,item){
      return Number(item.weight)>0&&(!best||Number(item.weight)>Number(best.weight))?item:best;
    },null);
    const item=top?{code:top.code,name:top.name,groupCode:top.groupCode,groupName:top.groupName,
      discipline:top.discipline,actual:top.actual,baselineWeight:Number(top.weight),
      status:top.planNow==null?'Rencana pembanding belum tersedia':top.actual+0.005<top.planNow?'Di bawah rencana':top.actual>0?'Berjalan sesuai rencana':'Belum mulai'}:null;
    return {kind:'pending',message:'Tidak ada tambahan rencana bulan ini. Masih terdapat pekerjaan belum selesai.',item:item};
  }
  return {kind:'complete',message:'Pekerjaan selesai'};
}

function executiveLookAheadProjectMonths_(life,months,today){
  const confirmed=(life.stage==='SELESAI'||life.stage==='DITUTUP')&&life.finishDate&&isFinite(life.finishDate.getTime())&&life.finishDate<=today;
  return months.map(function(m){const complete=!!confirmed&&life.finishDate<=m.end;return {complete:complete,finishText:complete?formatDateId_(life.finishDate):'',message:complete?'Proyek selesai':''};});
}


function executiveLookAheadStart_(kind,items,startDate,params){
  let earliest='';
  const accept=function(s){if(/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))&&(!earliest||s<earliest))earliest=s;};
  if(kind==='ENG')items.forEach(function(d){if(d.m){accept(d.m);return;}const dates=(d.p||[]).filter(function(s){return s&&engDocPlan_(d,params,s)>0.001;}).sort();if(dates.length)accept(dates[0]);});
  else if(startDate&&isFinite(startDate.getTime()))items.forEach(function(it){const index=(it.plan||[]).findIndex(function(v){return Number(v)>0.001;});if(index>=0){const date=new Date(startDate.getFullYear(),startDate.getMonth(),startDate.getDate()+index*7);accept(isoDate_(date));}});
  return earliest;
}

/** Tautan arsip laporan manajemen (Modul 5) untuk proyek & bulan, dipakai bila link laporan bulanan belum diisi. */
var EXEC_MR_LINKS_ = null;
function execMgmtReportUrl_(pid, m) {
  if (EXEC_MR_LINKS_ === null) {
    EXEC_MR_LINKS_ = {};
    try {
      if (typeof MR !== 'undefined' && typeof engSheet_ === 'function') {
        const sh = engSheet_(MR.SHEET, false), n = sh ? sh.getLastRow() : 0;
        if (n >= 2) sh.getRange(2, 1, n - 1, 6).getValues().forEach(function(r) {
          const url = String(r[5] || '').trim();
          if (url && /^https?:\/\//i.test(url)) EXEC_MR_LINKS_[String(r[0]).trim()] = url;
        });
      }
    } catch (e) { EXEC_MR_LINKS_ = {}; }
  }
  return m ? (EXEC_MR_LINKS_[pid + '|' + monthKey_(m)] || '') : '';
}

/**
 * Notifikasi menu akun.
 * ADMIN: permintaan akun baru (PENDING).
 * ADMIN/INPUT/PIC (proyek yang boleh diinput): week yang sudah berakhir tetapi input mingguan belum diisi,
 * dan laporan bulanan yang week cut-off-nya sudah lewat tetapi biaya bulan itu belum diisi.
 */
function getNotifications(token) {
  dbReadOnly_(); // C1b: baca DATA MINGGUAN/BULANAN dari cache
  const user = requireUser_(token);
  const role = String(user.role || '').trim().toUpperCase();
  const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const DAY = 24 * 3600 * 1000, items = [];
  if (role === 'ADMIN') {
    try {
      authPendingAccounts(token).forEach(function(a) {
        items.push({ id: 'acc:' + a.username, kind: 'account', level: 'info', title: 'Persetujuan akun baru',
          project: a.projectName || a.projectId || '', text: (a.name || a.username) + ' (@' + a.username + ')' + (a.team ? ' · ' + a.team : '') + ' menunggu persetujuan hak akses.',
          when: String(a.created || ''), sort: 0, action: { page: 'portal', anchor: 'pmo-account-requests' } });
      });
    } catch (e) { /* sheet akun belum siap */ }
    try {
      authResetRequests(token).items.filter(function(r) { return r.status === 'DIMINTA'; }).forEach(function(r) {
        items.push({ id: 'rst:' + r.id, kind: 'account', level: 'warn', title: 'Permintaan reset password',
          project: r.project || '', text: (r.name || r.username) + ' (@' + r.username + ') meminta reset password. Pastikan identitasnya, lalu buat kode reset.',
          when: r.askedAt, sort: 0, action: { fn: 'pwdAdmin' } });
      });
    } catch (e) { /* sheet reset belum ada */ }
  }
  if (role === 'ADMIN' || role === 'INPUT' || role === 'PIC') perfCached_('ntf|' + role + '|' + String(user.projectId || user.project || ''), function() {
    const list = [];
    let db = null;
    try { db = loadDb_(); } catch (e) { db = null; }
    if (db) db.projects.filter(function(p) { return userCanOperateProject_(user, p); }).forEach(function(p) {
      let life; try { life = projectLifecycle_(db, p); } catch (e) { return; }
      if (life.stage !== 'BERJALAN') return;
      const info = weeklyInfo_(db, p), st = info.startDate;
      if (!st) return;
      const wEnd = function(w) { return new Date(st.getFullYear(), st.getMonth(), st.getDate() + w * 7 - 1); };
      // mingguan
      let lastEnded = weekForDate_(st, today) - 1;
      if (info.maxWeek) lastEnded = Math.min(lastEnded, info.maxWeek);
      const latest = info.latestWeek || 0;
      if (lastEnded >= 1 && latest < lastEnded) {
        const n = lastEnded - latest, end = wEnd(lastEnded);
        list.push({ id: 'wk:' + p.id + ':' + lastEnded, kind: 'weekly', level: n >= 2 ? 'bad' : 'warn', project: p.name,
          title: 'Input mingguan belum diisi',
          text: (n > 1 ? 'W' + (latest + 1) + '–W' + lastEnded + ' (' + n + ' minggu)' : 'W' + lastEnded) + ' sudah berakhir ' + formatDateId_(end) + '. Input terakhir W' + latest + '.',
          when: formatDateId_(new Date(end.getTime() + DAY)), sort: n >= 2 ? 1 : 2, ts: end.getTime(), action: { page: 'input', project: p.name } });
      }
      // bulanan: 3 bulan terakhir s.d. bulan berjalan
      const tk = today.getFullYear() * 12 + today.getMonth();
      db.monthly.months.filter(function(m) { const k = m.year * 12 + m.month; return k <= tk && k >= tk - 3; }).forEach(function(m) {
        if (!monthRequired_(db, p, m) || monthHasReport_(db, p, m)) return;
        const cw = cutWeekOf_(db, p, m); if (!cw) return;
        const end = wEnd(cw); if (end >= today) return;
        const late = Math.floor((today - end) / DAY);
        list.push({ id: 'mo:' + p.id + ':' + monthKey_(m), kind: 'monthly', level: late > 14 ? 'bad' : 'warn', project: p.name,
          title: 'Laporan bulanan ' + m.label + ' belum diisi',
          text: 'Cut-off W' + cw + ' berakhir ' + formatDateId_(end) + (late > 0 ? ' (' + late + ' hari lalu)' : '') + '. Lengkapi realisasi biaya, RKAP, dan milestone.',
          when: formatDateId_(new Date(end.getTime() + DAY)), sort: late > 14 ? 1 : 2, ts: end.getTime(), action: { page: 'monthly', project: p.name } });
      });
    });
    return list;
  }).forEach(function(x) { items.push(x); });
  try { ktrNotifications_(user).forEach(function(x) { items.push(x); }); } catch (e) { /* sheet pengajuan belum ada */ }
  items.sort(function(a, b) { return a.sort - b.sort || (b.ts || 0) - (a.ts || 0); });
  items.forEach(function(x) { delete x.sort; delete x.ts; });
  return { success: true, role: role, user: user.username || '', items: items,
    at: Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm') };
}

/** ID foto banner proyek (LINK_BANNER di DATA BULANAN, atau foto bawaan Weekly Progress). */
function projectBannerId_(db, p) {
  const link = String(monthlyText_(db, p.id, 'LINK_BANNER') || '');
  const m = link.match(/\/d\/([A-Za-z0-9_-]{20,})/) || link.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  if (m) return m[1];
  const k = String(p.name || '').toUpperCase();
  return k.indexOf('TANGKI') >= 0 ? '1EEhCRiST9Qsszi8jtRFCU29S7d58OKnS' : k.indexOf('CONVEYOR') >= 0 ? '1G5EnxEDVI5z-GfyHjs5bIL7znlrAp6HN'
    : (k.indexOf('CSU') >= 0 || k.indexOf('SHIP UNLOADER') >= 0) ? '1-ON5W6RZbzvCmhG1g0h-_L9qfINagHfW' : '1WHRHo_x1Qq4g8GiPtnBmFtMw-0UjmYID';
}

/** Detail sel peta deviasi: progres per bidang pada week cut-off bulan terpilih (dipanggil ExecutiveDashboard.html). */
function getExecutiveCellDetail(token, projectId, monthKey) {
  dbReadOnly_(); // C1b: baca DATA MINGGUAN/BULANAN dari cache
  const user = requireUser_(token);
  ktrBlock_(user);
  return perfCached_('cd|' + projectId + '|' + monthKey, function() { return execCellDetailBuild_(user, projectId, monthKey); });
}
function execCellDetailBuild_(user, projectId, monthKey) {
  const db = loadDb_();
  const p = db.projects.filter(function(x) { return x.id === projectId; })[0];
  if (!p || !userCanAccess_(user, p)) throw new Error('Proyek tidak ditemukan atau tidak dapat diakses akun ini.');
  const m = db.monthly.months.filter(function(x) { return monthKey_(x) === monthKey; })[0];
  if (!m) throw new Error('Periode ' + monthKey + ' tidak ditemukan.');
  const info = weeklyInfo_(db, p), W = db.weekly;
  if (!info.latestWeek) throw new Error('Data mingguan ' + p.name + ' belum tersedia.');
  const cut = info.startDate ? cutWeekOf_(db, p, m) : info.latestWeek;
  const pending = info.latestWeek < cut;
  const week = Math.max(1, Math.min(info.latestWeek, cut));
  const pctW = function(item) { return weekPercent_(W, p.id, item, week); };
  const fields = DB_CONFIG.FIELDS.map(function(name) {
    const F = name.toUpperCase(), plan = pctW(F + '_KOMULATIF_PLAN'), actual = pctW(F + '_KOMULATIF_REALISASI');
    return { name: name, plan: plan, actual: actual, deviation: plan === null || actual === null ? null : actual - plan };
  });
  const oPlan = pctW('KOMULATIF_PLAN'), oActual = pctW('KOMULATIF_REALISASI');
  const txt = function(item) { return weekText_(W, p.id, item, week); };
  const concerns = [];
  DB_CONFIG.FIELDS.forEach(function(name) {
    const F = name.toUpperCase(), c = txt(F + '_CONCERN'), mi = txt(F + '_MITIGASI');
    if (c || mi) concerns.push({ field: name, concern: c, mitigation: mi });
  });
  let range = '';
  if (info.startDate) {
    const a = new Date(info.startDate.getFullYear(), info.startDate.getMonth(), info.startDate.getDate() + (week - 1) * 7);
    const b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6);
    range = formatDateId_(a) + ' – ' + formatDateId_(b);
  }
  const reportUrl = monthLink_(db, p.id, 'LINK_LAPORAN_MONTHLY', m) || execMgmtReportUrl_(p.id, m);
  return { success: true, projectId: p.id, name: p.name, period: m.label, monthKey: monthKey, cutWeek: cut, latestWeek: info.latestWeek,
    week: week, pending: pending, range: range, overall: { plan: oPlan, actual: oActual, deviation: oPlan === null || oActual === null ? null : oActual - oPlan },
    fields: fields, highlight: txt('HIGHLIGHT_ACTIVITY') || txt('HIGHLIGHT'), concerns: concerns, reportUrl: reportUrl || '',
    videoUrl: weekLink_(W, p.id, 'LINK_VIDEO', week) || '' };
}

/** Foto banner hero Portal: isi folder Drive (terbaru lebih dulu). Ganti folder lewat Script Property PORTAL_HERO_FOLDER. */
const PORTAL_HERO_FOLDER_ = '1w0To-LisA2Go9JgX6kRCNdkyoQ9yh0Xw';
function portalHeroPhotos_() {
  const cache = CacheService.getScriptCache(), key = 'portalHero:v2';
  try { const c = cache.get(key); if (c) return JSON.parse(c); } catch (e) {}
  let out = [];
  try {
    const id = PropertiesService.getScriptProperties().getProperty('PORTAL_HERO_FOLDER') || PORTAL_HERO_FOLDER_;
    const it = DriveApp.getFolderById(id).getFiles();
    while (it.hasNext()) {
      const f = it.next();
      if (!/^image\//.test(f.getMimeType())) continue;
      out.push({ id: f.getId(), caption: String(f.getDescription() || '').trim(), t: f.getLastUpdated().getTime() });
    }
    out.sort(function(a, b) { return b.t - a.t; });
    out = out.slice(0, 12).map(function(x) { return { id: x.id, caption: x.caption }; });
  } catch (e) { out = []; }
  try { cache.put(key, JSON.stringify(out), 1800); } catch (e) {}
  return out;
}

// ===================== CACHE HASIL (kecepatan muat) =====================
/**
 * Versi data: waktu terakhir spreadsheet diubah (dicek paling sering tiap 30 detik) + penanda simpan dari aplikasi.
 * Hasil hitungan disimpan di CacheService dengan kunci versi + tanggal hari ini, sehingga otomatis kedaluwarsa saat data berubah.
 */
function dataVersion_() {
  if (dataVersion_.v) return dataVersion_.v;
  const c = CacheService.getScriptCache();
  let v = null;
  try { v = c.get('pmoDataVer'); } catch (e) {}
  if (!v) {
    let lu = 0;
    try { lu = DriveApp.getFileById(SPREADSHEET_ID).getLastUpdated().getTime(); } catch (e) { lu = Math.floor(Date.now() / 60000); }
    const bump = PropertiesService.getScriptProperties().getProperty('PMO_DATA_BUMP') || '0';
    v = lu + '.' + bump;
    try { c.put('pmoDataVer', v, 300); } catch (e) {}
  }
  return (dataVersion_.v = v);
}
/** Dipanggil setelah aplikasi menyimpan data: cache lama langsung tidak dipakai lagi. */
function dataChanged_() {
  try { PropertiesService.getScriptProperties().setProperty('PMO_DATA_BUMP', String(Date.now())); } catch (e) {}
  try { CacheService.getScriptCache().remove('pmoDataVer'); } catch (e) {}
  dataVersion_.v = null;
  storeVer_.v = null;
}
function perfKey_(key) {
  const d = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  const raw = 'v7|' + dataVersion_() + '|' + d + '|' + key;
  try { return 'pc_' + Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw).map(function(b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
  catch (e) { return 'pc_' + raw.replace(/[^A-Za-z0-9|._-]/g, '').slice(-200); }
}
/** Ambil dari cache (dipecah per 90 ribu karakter) atau hitung lalu simpan 6 jam. */
function perfCached_(key, fn) {
  const c = CacheService.getScriptCache(), k = perfKey_(key);
  try {
    const head = c.get(k);
    if (head) {
      const n = Number(head), keys = [];
      for (let i = 0; i < n; i++) keys.push(k + '_' + i);
      const parts = c.getAll(keys);
      if (keys.every(function(x) { return parts[x] !== undefined && parts[x] !== null; })) {
        const out = JSON.parse(keys.map(function(x) { return parts[x]; }).join(''));
        if (out && typeof out === 'object' && !Array.isArray(out)) out.cached = true;
        return out;
      }
    }
  } catch (e) {}
  const val = fn();
  try {
    const s = JSON.stringify(val), size = 90000, map = {};
    let n = 0;
    for (let i = 0; i < s.length; i += size) map[k + '_' + (n++)] = s.slice(i, i + size);
    if (n <= 40) { c.putAll(map, 21600); c.put(k, String(n), 21600); }
    return JSON.parse(s);
  } catch (e) { return val; }
}

/* ===== C1: cache data olahan EPCC & Engineering (khusus jalur BACA) =====
 * Kunci cache = waktu terakhir spreadsheet diubah (Drive) + PMO_DATA_BUMP (dataChanged_/storeTouch_).
 * Jadi cache otomatis tidak dipakai lagi setelah ada simpan dari aplikasi MAUPUN edit langsung di sheet.
 * Fungsi simpan tetap memakai epcStore_()/engStore_() langsung (tanpa cache).
 * Saklar darurat tanpa ubah kode: Script Properties -> PMO_STORE_CACHE = OFF. */
function storeVer_() {
  if (storeVer_.v) return storeVer_.v;
  let lu = 0;
  try { lu = DriveApp.getFileById(SPREADSHEET_ID).getLastUpdated().getTime(); } catch (e) { lu = Math.floor(Date.now() / 60000); }
  const bump = PropertiesService.getScriptProperties().getProperty('PMO_DATA_BUMP') || '0';
  return (storeVer_.v = lu + '.' + bump);
}
/** Dipanggil fungsi tulis EPCC/Engineering: tandai data berubah (maks. sekali per detik per eksekusi). */
function storeTouch_() {
  const n = Date.now();
  if (storeTouch_.t && n - storeTouch_.t < 1000) return;
  storeTouch_.t = n;
  dataChanged_();
}
function storeReplace_(key, v) {
  const raw = this[key];
  if (raw instanceof Date) return { $d: raw.getTime() };
  if (typeof raw === 'number' && !isFinite(raw)) return { $n: String(raw) };
  return v;
}
function storeRevive_(key, v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const ks = Object.keys(v);
    if (ks.length === 1 && typeof v.$d === 'number') return new Date(v.$d);
    if (ks.length === 1 && typeof v.$n === 'string') return Number(v.$n);
  }
  return v;
}
function storeCached_(name, fn) {
  const t0 = Date.now();
  if (String(PropertiesService.getScriptProperties().getProperty('PMO_STORE_CACHE') || '').trim().toUpperCase() === 'OFF') return fn();
  const k = 'st1_' + name + '_' + storeVer_();
  const mem = storeCached_.mem = storeCached_.mem || {};
  if (mem[k]) return JSON.parse(mem[k], storeRevive_);
  const c = CacheService.getScriptCache();
  try {
    const head = c.get(k);
    if (head) {
      const n = Number(head), keys = [], parts = {};
      for (let i = 0; i < n; i++) keys.push(k + '_' + i);
      for (let i = 0; i < keys.length; i += 50) Object.assign(parts, c.getAll(keys.slice(i, i + 50)));
      if (n > 0 && keys.every(function(x) { return typeof parts[x] === 'string'; })) {
        const s = keys.map(function(x) { return parts[x]; }).join('');
        const out = JSON.parse(s, storeRevive_);
        mem[k] = s;
        console.log(JSON.stringify({ ev: 'store_cache', name: name, hit: true, kb: Math.round(s.length / 1024), ms: Date.now() - t0 }));
        return out;
      }
    }
  } catch (e) {}
  const val = fn();
  const t1 = Date.now();
  try {
    const s = JSON.stringify(val, storeReplace_), size = 30000, map = {};
    let n = 0;
    for (let i = 0; i < s.length; i += size) map[k + '_' + (n++)] = s.slice(i, i + size);
    if (n <= 300) {
      const ks = Object.keys(map);
      for (let i = 0; i < ks.length; i += 50) { const part = {}; ks.slice(i, i + 50).forEach(function(x) { part[x] = map[x]; }); c.putAll(part, 21600); }
      c.put(k, String(n), 21600);
    }
    mem[k] = s;
    console.log(JSON.stringify({ ev: 'store_cache', name: name, hit: false, kb: Math.round(s.length / 1024), parts: n, buildMs: t1 - t0, saveMs: Date.now() - t1 }));
  } catch (e) { console.log(JSON.stringify({ ev: 'store_cache', name: name, err: String(e && e.message || e) })); }
  return val;
}
function epcStoreC_() { return storeCached_('epc', epcStore_); }

/* ===== C2: lock per bagian (bukan satu lock global) =====
 * Simpan Weekly tidak lagi menunggu impor XML, unggah dokumen, atau arsip Engineering yang sedang berjalan.
 * Bagian: AUTH, MS (Master Schedule), DOC, EPCENG (EPCC & Engineering), LIB, GAL, LIVE, MDOC, RPT, WPRINT,
 *         DATA (DATA MINGGUAN & DATA BULANAN). Bila butuh beberapa bagian, diambil berurutan sesuai daftar
 *         (DATA selalu terakhir) supaya tidak saling mengunci.
 * Cara kerja: tanda "sedang dipakai" per bagian di Script Properties (PMO_LOCK_<bagian>), diambil di bawah
 * lock global yang hanya dipegang sesaat. Tanda kedaluwarsa sendiri setelah 6,5 menit (batas eksekusi).
 * Saklar darurat tanpa ubah kode: Script Properties -> PMO_LOCK_MODE = GLOBAL (kembali ke satu lock global). */
const PMO_LOCK_ORDER = ['AUTH', 'MS', 'DOC', 'EPCENG', 'LIB', 'GAL', 'LIVE', 'MDOC', 'RPT', 'WPRINT', 'DATA'];
const PMO_LOCK_TTL = 390000;
function pmoLockId_() { return pmoLockId_.v || (pmoLockId_.v = Utilities.getUuid()); }
function pmoLeaseRead_(raw) { try { const o = JSON.parse(raw || 'null'); return o && o.id ? o : null; } catch (e) { return null; } }
function pmoLeaseTake_(d, end) {
  const key = 'PMO_LOCK_' + d, me = pmoLockId_();
  let wait = 150;
  for (;;) {
    const g = LockService.getScriptLock();
    if (g.tryLock(Math.max(1, Math.min(5000, end - Date.now())))) {
      let ok = false;
      try {
        const p = PropertiesService.getScriptProperties(), cur = pmoLeaseRead_(p.getProperty(key));
        if (!cur || cur.exp < Date.now() || cur.id === me) { p.setProperty(key, JSON.stringify({ id: me, exp: Date.now() + PMO_LOCK_TTL })); ok = true; }
      } finally { g.releaseLock(); }
      if (ok) return true;
    }
    if (Date.now() + wait > end) return false;
    Utilities.sleep(wait);
    wait = Math.min(1000, wait * 2);
  }
}
function pmoLeaseDrop_(d) {
  const key = 'PMO_LOCK_' + d, me = pmoLockId_(), g = LockService.getScriptLock();
  const got = g.tryLock(5000);
  try {
    const p = PropertiesService.getScriptProperties(), cur = pmoLeaseRead_(p.getProperty(key));
    if (cur && cur.id === me) p.deleteProperty(key);
  } catch (e) {} finally { if (got) g.releaseLock(); }
}
/** Uji lock C2 dari editor: ambil EPCENG+DATA, coba ambil DATA lagi (boleh, eksekusi yang sama), lalu lepas. Penanda harus hilang lagi. */
function cekLockBagian() {
  editorOnly_();
  const p = PropertiesService.getScriptProperties(), t0 = Date.now();
  const a = pmoLock_('EPCENG', 'DATA'); a.waitLock(10000);
  const t1 = Date.now(), dipegang = [!!p.getProperty('PMO_LOCK_EPCENG'), !!p.getProperty('PMO_LOCK_DATA')];
  const b = pmoLock_('DATA'); const ulang = b.tryLock(1000); b.releaseLock();
  const masih = !!p.getProperty('PMO_LOCK_DATA');
  a.releaseLock();
  console.log(JSON.stringify({ ev: 'cek_lock', ambilMs: t1 - t0, dipegang: dipegang, ambilUlang: ulang, dataMasihDipegangSetelahLepasDalam: masih, lepasMs: Date.now() - t1, sisa: [p.getProperty('PMO_LOCK_EPCENG'), p.getProperty('PMO_LOCK_DATA')] }));
}
/** Cek ukuran spreadsheet (untuk keputusan C5) - jalankan dari editor. Batas Google: 10 juta sel per spreadsheet,
 *  dihitung dari sel yang DIALOKASIKAN (baris x kolom maksimum sheet), termasuk sel kosong. Hanya membaca. */
function cekUkuranSpreadsheet() {
  editorOnly_();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID), rows = [];
  let total = 0, pakai = 0;
  ss.getSheets().forEach(function(sh) {
    const mr = sh.getMaxRows(), mc = sh.getMaxColumns(), lr = sh.getLastRow(), lc = sh.getLastColumn();
    total += mr * mc; pakai += lr * lc;
    rows.push({ n: sh.getName(), sel: mr * mc, mr: mr, mc: mc, lr: lr, lc: lc });
  });
  rows.sort(function(a, b) { return b.sel - a.sel; });
  console.log(JSON.stringify({ ev: 'ukuran', totalSel: total, persenDariBatas: Math.round(total / 1e5 * 10) / 10, selTerisi: pakai, jumlahSheet: rows.length }));
  rows.forEach(function(r) { console.log(r.n + ' | dialokasikan ' + r.sel + ' sel (' + r.mr + ' x ' + r.mc + ') | terisi ' + r.lr + ' x ' + r.lc); });
}
/** Pengganti LockService.getScriptLock(): pmoLock_('DATA') atau pmoLock_('EPCENG', 'DATA'). Pemakaian sama: waitLock / tryLock / releaseLock. */
function pmoLock_() {
  if (String(PropertiesService.getScriptProperties().getProperty('PMO_LOCK_MODE') || '').trim().toUpperCase() === 'GLOBAL') return LockService.getScriptLock();
  const want = Array.prototype.slice.call(arguments).map(String).filter(function(d, i, a) { return a.indexOf(d) === i; })
    .sort(function(a, b) { return PMO_LOCK_ORDER.indexOf(a) - PMO_LOCK_ORDER.indexOf(b); });
  const held = pmoLock_.held = pmoLock_.held || {}, mine = [];
  const lk = {
    tryLock: function(ms) {
      const t0 = Date.now(), end = t0 + Math.max(0, Number(ms) || 0);
      for (let i = 0; i < want.length; i++) {
        const d = want[i];
        if (held[d]) { held[d]++; mine.push(d); continue; }
        if (!pmoLeaseTake_(d, end)) {
          lk.releaseLock();
          console.log(JSON.stringify({ ev: 'lock_busy', want: want.join('+'), at: d, ms: Date.now() - t0 }));
          return false;
        }
        held[d] = 1; mine.push(d);
      }
      const w = Date.now() - t0;
      if (w > 1500) console.log(JSON.stringify({ ev: 'lock_wait', want: want.join('+'), ms: w }));
      return true;
    },
    waitLock: function(ms) {
      if (!lk.tryLock(ms)) throw new Error('Server sedang menyimpan data lain di bagian yang sama (' + want.join(' + ') + '). Tunggu sebentar lalu coba lagi.');
    },
    releaseLock: function() {
      while (mine.length) { const d = mine.pop(); held[d]--; if (held[d] <= 0) { delete held[d]; pmoLeaseDrop_(d); } }
    },
    hasLock: function() { return mine.length > 0 && mine.length >= want.length; }
  };
  return lk;
}
function engStoreC_() { return storeCached_('eng', engStore_); }
/** Uji cache C1 dari editor: jalankan 2x, run ke-2 harus tercatat hit:true di log store_cache. */
function cekCacheStore() {
  editorOnly_();
  const t0 = Date.now(); const e = epcStoreC_(); const t1 = Date.now(); const g = engStoreC_();
  const t2 = Date.now(); DB_RO_ = true; DB_CACHE_ = null; const d = loadDb_();
  console.log(JSON.stringify({ ev: 'cek_cache_db', dbMs: Date.now() - t2, proyek: d.projects.length, barisWeekly: (d.weekly.values || []).length, kolomWeekly: ((d.weekly.values || [])[0] || []).length }));
  console.log(JSON.stringify({ ev: 'cek_cache', epcMs: t1 - t0, engMs: Date.now() - t1, epcItemSets: Object.keys(e.items || {}).length, engBaselineSets: Object.keys(g.baseline || {}).length }));
}

/** Data Executive bulanan (sama untuk semua peran; akses proyek tidak dibatasi per pengguna). */
function execDataCached_(user, requestedPeriod) {
  const role = String(user && user.role || '').trim().toUpperCase();
  const scope = role === 'KONTRAKTOR' ? ':' + normKey_(user && user.projectId || '') : '';
  return perfCached_('exec|' + role + scope + '|' + String(requestedPeriod || ''), function() { return buildExecutiveData_(user, requestedPeriod); });
}

// ===================== GALERI FOTO PROYEK =====================
/**
 * Sumber foto per proyek per bulan:
 *  1. Foto yang dipakai di Pelaporan Manajemen (DATA_JSON.photos).
 *  2. Folder Drive tim proyek: <folder proyek>/<PROYEK_ID>/Galeri Foto/<yyyy-MM> (nama subfolder boleh "Oktober 2026").
 * Keterangan foto: kolom Deskripsi file Drive, atau nama file (kecuali nama bawaan kamera).
 */
const GAL = { FOLDER: 'Galeri Foto', MONTHS: 12, MAX_PER_MONTH: 40 };
const GAL_MON_ = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
function galMonthKey_(name) {
  const s = String(name || '').trim().toLowerCase();
  let m = s.match(/(\d{4})\s*[-_.\/ ]\s*(\d{1,2})(?!\d)/);
  if (m && +m[2] >= 1 && +m[2] <= 12) return m[1] + '-' + ('0' + m[2]).slice(-2);
  m = s.match(/(?:^|\D)(\d{1,2})\s*[-_.\/ ]\s*(\d{4})/);
  if (m && +m[1] >= 1 && +m[1] <= 12) return m[2] + '-' + ('0' + m[1]).slice(-2);
  const y = s.match(/(\d{4})/);
  if (y) for (let i = 0; i < 12; i++) if (s.indexOf(GAL_MON_[i]) >= 0 || s.indexOf(GAL_MON_[i].slice(0, 3) + ' ') >= 0) return y[1] + '-' + ('0' + (i + 1)).slice(-2);
  return '';
}
function galCaption_(f) {
  const d = String(f.getDescription() || '').trim();
  if (d) return d.slice(0, 160);
  const n = f.getName().replace(/\.[^.]+$/, '');
  return /^(DJI|IMG|PXL|DSC|DCIM|VID|Screenshot|WhatsApp|Photo|Foto)[ _-]?\d/i.test(n) ? '' : n.replace(/[_]+/g, ' ').slice(0, 160);
}
function galProjectFolder_(p, create) {
  const d = engDriveOf_(p.id);
  if (!d) return null;
  const root = DriveApp.getFolderById(d.id);
  const get = function(parent, name) { const it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : (create ? parent.createFolder(name) : null); };
  const pf = get(root, p.id); if (!pf) return null;
  return get(pf, GAL.FOLDER);
}
function galleryBuild_() {
  const db = loadDb_(), today = new Date(), tk = today.getFullYear() * 12 + today.getMonth();
  const months = db.monthly.months.filter(function(m) { const k = m.year * 12 + m.month; return k <= tk && k > tk - GAL.MONTHS; });
  const projects = [];
  db.projects.forEach(function(p) {
    const by = {}, seen = {};
    const add = function(k, ph) { if (!k || !ph.id || seen[ph.id]) return; seen[ph.id] = 1; (by[k] = by[k] || []).push(ph); };
    try {
      mrRecordsOf_(p.id).forEach(function(r) {
        (r.data.photos || []).forEach(function(x) { if (x && x.id && x.kind !== 'video') add(r.key, { id: String(x.id), cap: String(x.cap || ''), src: 'Laporan manajemen' }); });
      });
    } catch (e) {}
    try {
      const g = galProjectFolder_(p, false);
      if (g) {
        const it = g.getFolders();
        while (it.hasNext()) {
          const mf = it.next(), k = galMonthKey_(mf.getName());
          if (!k) continue;
          const files = [], fi = mf.getFiles();
          while (fi.hasNext()) { const f = fi.next(); if (/^image\//.test(f.getMimeType())) files.push(f); }
          files.sort(function(a, b) { return a.getDateCreated() - b.getDateCreated(); });
          files.slice(0, GAL.MAX_PER_MONTH).forEach(function(f) { add(k, { id: f.getId(), cap: galCaption_(f), src: 'Folder galeri', date: formatDateId_(f.getDateCreated()) }); });
        }
      }
    } catch (e) {}
    const list = months.filter(function(m) { return by[monthKey_(m)]; }).map(function(m) {
      const k = monthKey_(m); let prog = { plan: null, actual: null };
      try { prog = execProgress_(db, p, m); } catch (e) {}
      return { key: k, label: m.label, photos: by[k], actual: prog.actual, plan: prog.plan, pending: !!prog.pending };
    });
    let stage = 'BERJALAN'; try { stage = projectLifecycle_(db, p).stage; } catch (e) {}
    projects.push({ id: p.id, name: p.name, stage: stage, banner: projectBannerId_(db, p), months: list });
  });
  return { success: true, projects: projects };
}
/** Indeks galeri, disimpan 10 menit (foto baru di folder Drive muncul paling lambat 10 menit). */
function galleryIndexCached_() {
  let ver = ''; try { ver = CacheService.getScriptCache().get('pmoGalVer') || ''; } catch (e) {}
  return perfCached_('gal|' + Math.floor(Date.now() / 600000) + '|' + ver, galleryBuild_);
}
function galleryChanged_() { try { CacheService.getScriptCache().put('pmoGalVer', String(Date.now()), 21600); } catch (e) {} }
/** Folder bulan di Galeri Foto (dibuat bila create). Error bila folder Drive tim proyek belum diatur. */
function galMonthFolder_(p, monthKey, create) {
  let g;
  try { g = galProjectFolder_(p, create); } catch (e) { throw new Error('Folder Google Drive proyek ' + p.name + ' tidak bisa dibuka akun web app (' + engScriptAccount_() + '). Bagikan folder tersebut sebagai Editor.'); }
  if (!g) throw new Error('NO_FOLDER');
  const it = g.getFolders();
  while (it.hasNext()) { const f = it.next(); if (galMonthKey_(f.getName()) === monthKey) return f; }
  return create ? g.createFolder(monthKey) : null;
}
function galCtx_(token, projectId) {
  const user = requireUser_(token), db = loadDb_();
  const p = db.allProjects.filter(function(x) { return x.id === String(projectId || ''); })[0];
  if (!p) throw new Error('Proyek tidak ditemukan.');
  if (!userCanOperateProject_(user, p)) throw new Error('Menambah foto hanya untuk ADMIN dan tim input proyek ' + p.name + '.');
  return { user: user, db: db, p: p };
}
/** Info sebelum unggah: folder Drive proyek sudah diatur atau belum. */
function getGalleryUploadInfo(token, projectId) {
  const ctx = galCtx_(token, projectId);
  let d = null; try { d = engDriveOf_(ctx.p.id); } catch (e) {}
  return { success: true, projectId: ctx.p.id, name: ctx.p.name, folderSet: !!d, folderName: d ? d.name : '', folderUrl: d ? d.url : '',
    account: engScriptAccount_(), role: String(ctx.user.role || '').toUpperCase() };
}
/** Unggah satu foto ke Galeri Foto/<bulan>. Keterangan disimpan di Deskripsi file. */
function uploadGalleryPhoto(token, projectId, monthKey, file) {
  const ctx = galCtx_(token, projectId);
  if (!/^\d{4}-\d{2}$/.test(String(monthKey || ''))) throw new Error('Bulan tidak valid.');
  const mime = String(file && file.mime || 'image/jpeg');
  if (!/^image\/(jpeg|png|webp)$/.test(mime)) throw new Error('Format foto harus JPG, PNG, atau WEBP.');
  const bytes = Utilities.base64Decode(String(file && file.base64 || ''));
  if (!bytes.length) throw new Error('Foto kosong.');
  if (bytes.length > 12 * 1048576) throw new Error('Ukuran foto lebih dari 12 MB.');
  let mf;
  try { mf = galMonthFolder_(ctx.p, monthKey, true); }
  catch (e) { if (e.message === 'NO_FOLDER') throw new Error('Folder Google Drive proyek ' + ctx.p.name + ' belum diatur. Isi di menu Tambah / Edit Proyek › Folder Google Drive proyek.'); throw e; }
  const cap = String(file.caption || '').trim().slice(0, 300);
  const original = String(file.name || 'foto.jpg');
  const sourceExtension = (original.match(/\.(jpe?g|png|webp)$/i) || [])[1];
  const extension = mime === 'image/jpeg' ? (sourceExtension && /^jpe?g$/i.test(sourceExtension) ? sourceExtension.toLowerCase() : 'jpg') : mime.slice(6);
  const clean = function(value) { return value.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').trim(); };
  const stem = clean(cap.replace(/\.(jpe?g|png|webp)$/i, '')).slice(0, 115).trim();
  const name = stem ? stem + '.' + extension : clean(original).slice(0, 120) || 'foto.' + extension;
  const f = mf.createFile(Utilities.newBlob(bytes, mime, name));
  if (cap) { try { f.setDescription(cap); } catch (e) {} }
  galleryChanged_();
  return { success: true, id: f.getId(), name: f.getName(), month: monthKey };
}
function getGalleryIndex(token) {
  const t0 = Date.now(), user = requireUser_(token);
  const out = galleryIndexCached_();
  if (ktrIs_(user)) out.projects = (out.projects || []).filter(function(p) { return userCanAccess_(user, { id: p.id || p.projectId || '' }); });
  const role = String(user.role || '').toUpperCase();
  out.canAdd = role === 'ADMIN' || role === 'INPUT' || role === 'PIC';
  out.projects = (out.projects || []).map(function(p) { return Object.assign({}, p, {canManage:userCanOperateProject_(user,p)}); });
  out.serverMs = Date.now() - t0;
  return out;
}
/** Simpan/ambil teks besar di cache (dipecah). */
function cacheBigGet_(key) {
  const c = CacheService.getScriptCache();
  try {
    const head = c.get(key); if (!head) return null;
    const keys = []; for (let i = 0; i < Number(head); i++) keys.push(key + '_' + i);
    const parts = c.getAll(keys);
    if (!keys.every(function(x) { return parts[x] != null; })) return null;
    return keys.map(function(x) { return parts[x]; }).join('');
  } catch (e) { return null; }
}
function cacheBigPut_(key, s, ttl) {
  try {
    const c = CacheService.getScriptCache(), map = {}; let n = 0;
    for (let i = 0; i < s.length; i += 90000) map[key + '_' + (n++)] = s.slice(i, i + 90000);
    if (n > 30) return;
    c.putAll(map, ttl || 21600); c.put(key, String(n), ttl || 21600);
  } catch (e) {}
}
/** Gambar foto galeri sebagai data URI (dipakai bila browser tidak bisa membuka thumbnail Drive langsung). */
function getGalleryThumbs(token, ids, size) {
  ktrBlock_(requireUser_(token));
  size = Number(size) >= 1000 ? 1280 : 480;
  const idx = galleryIndexCached_(), allowed = {};
  (idx.projects || []).forEach(function(p) { (p.months || []).forEach(function(m) { (m.photos || []).forEach(function(x) { allowed[x.id] = 1; }); }); });
  const list = (ids || []).map(String).filter(function(id, i, a) { return allowed[id] && a.indexOf(id) === i; }).slice(0, size > 500 ? 4 : 12);
  const out = {}, miss = [];
  list.forEach(function(id) { const v = cacheBigGet_('gth' + size + ':' + id); if (v) out[id] = v; else miss.push(id); });
  if (miss.length) {
    const tok = ScriptApp.getOAuthToken();
    let links = [];
    try {
      links = UrlFetchApp.fetchAll(miss.map(function(id) { return { url: 'https://www.googleapis.com/drive/v3/files/' + id + '?fields=thumbnailLink&supportsAllDrives=true', headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true }; }))
        .map(function(r) { try { return JSON.parse(r.getContentText()).thumbnailLink || ''; } catch (e) { return ''; } });
    } catch (e) { links = miss.map(function() { return ''; }); }
    const reqs = [], who = [];
    links.forEach(function(l, i) { if (l) { reqs.push({ url: l.replace(/=s\d+(-[a-z0-9-]+)?$/i, '') + '=s' + size, headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true }); who.push(miss[i]); } });
    let res = []; try { res = reqs.length ? UrlFetchApp.fetchAll(reqs) : []; } catch (e) { res = []; }
    res.forEach(function(r, i) {
      if (r.getResponseCode() !== 200) return;
      const b = r.getBlob(), uri = 'data:' + (b.getContentType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(b.getBytes());
      out[who[i]] = uri; cacheBigPut_('gth' + size + ':' + who[i], uri, 21600);
    });
    miss.forEach(function(id) {
      if (out[id]) return;
      try { const b = DriveApp.getFileById(id).getThumbnail(); if (b) out[id] = 'data:' + (b.getContentType() || 'image/png') + ';base64,' + Utilities.base64Encode(b.getBytes()); } catch (e) {}
    });
  }
  return { success: true, images: out };
}
/** Folder Drive galeri untuk proyek & bulan (dibuat bila belum ada). Hanya ADMIN / tim input proyek. */
function getGalleryFolderUrl(token, projectId, monthKey) {
  const ctx = galCtx_(token, projectId), p = ctx.p;
  if (!/^\d{4}-\d{2}$/.test(String(monthKey || ''))) throw new Error('Bulan tidak valid.');
  let mf;
  try { mf = galMonthFolder_(p, monthKey, true); }
  catch (e) { if (e.message === 'NO_FOLDER') throw new Error('Folder Google Drive proyek ' + p.name + ' belum diatur. Isi di menu Tambah / Edit Proyek › Folder Google Drive proyek.'); throw e; }
  return { success: true, url: mf.getUrl(), name: p.name + ' / ' + GAL.FOLDER + ' / ' + mf.getName() };
}



// Master Schedule desktop: read-only, active submitted baselines only.
function getExecutiveMasterSchedule(token) {
  dbReadOnly_(); // C1b: baca DATA MINGGUAN/BULANAN dari cache
  const user=requireUser_(token);ktrBlock_(user);const db=loadDb_();
  return masterScheduleBaseline_(db,(db.allProjects||db.projects).filter(function(p){return userCanAccess_(user,p);}),false);
}
function masterScheduleBaseline_(db, projects, monitored) {
  const read = executiveLookAheadReader_(db.ss, projects);
  const engSet = read(ENG.SHEETS.SETTING), engRev = read(ENG.SHEETS.REVISI), engRows = read(ENG.SHEETS.BASELINE);
  const epcSet = read(EPC.SHEETS.SETTING), epcRev = read(EPC.SHEETS.REVISI), epcRows = read(EPC.SHEETS.ITEM);
  const norm = function(v) { return String(v == null ? '' : v).trim().toUpperCase(); };
  const same = function(r, id, f) { return norm(r.PROYEK_ID) === norm(id) && (!f || norm(r.BIDANG) === f); };
  const out = projects.map(function(p) {
    const project = {id:p.id, code:p.id, name:p.name || p.id, kind:'project', children:[]};
    const info = weeklyInfo_(db, p);
    [['ENG','Engineering'],['PROC','Procurement'],['CONS','Construction'],['COM','Commissioning']].forEach(function(pair) {
      const f = pair[0], engineering = f === 'ENG';
      const setting = (engineering ? engSet : epcSet).filter(function(r) { return same(r,p.id,engineering ? '' : f); })[0];
      const field = {id:p.id+':'+f, code:f, name:pair[1], kind:'field', children:[], revision:null};
      project.children.push(field);
      if (!setting || setting.REVISI_AKTIF === '' || setting.REVISI_AKTIF == null) { field.notice='Baseline aktif belum tersedia'; return; }
      const rev = Number(setting.REVISI_AKTIF);
      const submitted = (engineering ? engRev : epcRev).filter(function(r) { return same(r,p.id,engineering ? '' : f) && Number(r.REVISI) === rev; })[0];
      if (!isFinite(rev) || !submitted) { field.notice='Baseline aktif belum tersubmit'; return; }
      field.revision=rev;
      const rows = (engineering ? engRows : epcRows).filter(function(r) { return same(r,p.id,engineering ? '' : f) && Number(r.REVISI) === rev && norm(r.STATUS) !== 'BATAL'; }).sort(function(a,b) {return Number(a.NO)-Number(b.NO);});
      let params={}; try {params=JSON.parse(submitted.PARAMETER_JSON || '{}');} catch(e) {}
      const groups={};
      rows.forEach(function(r,i) {
        const groupCode=String(engineering ? (r.PAKET_WBS || '') : (r.GRUP_KODE || '')).trim();
        const groupName=engineering ? groupCode : String(r.GRUP || groupCode).trim();
        const key=groupCode+'|'+groupName;
        if (!groups[key]) {groups[key]={id:field.id+':g:'+i,code:groupCode,name:groupName || 'Group WBS belum diisi',kind:'group',children:[],revision:rev};field.children.push(groups[key]);}
        const item={id:field.id+':i:'+i,code:String(engineering ? r.NOMOR_DOKUMEN : (r.KODE || r.ID || '')).trim(),name:String(engineering ? r.NAMA_DOKUMEN : r.URAIAN),kind:'item',revision:rev,start:'',end:'',weight:engineering ? null : Number(r.BOBOT),children:[]};
        if (engineering) {
          item.start=engIso_(r.RENCANA_MULAI);
          const dates=[r.RENCANA_IFR,r.RENCANA_IFA,r.RENCANA_IFC,r.RENCANA_IFI];
          const pattern=params.pola && params.pola[norm(r.POLA)];
          const ends=dates.filter(function(v,j) {return !pattern || Number(pattern[j])>0;}).map(engIso_).filter(Boolean).sort();
          item.end=ends.length ? ends[ends.length-1] : '';
        } else {
          let plan=[];try {plan=JSON.parse(r.RENCANA_JSON || '[]');} catch(e) {}
          if (Array.isArray(plan) && info.startDate && !isNaN(info.startDate)) {
            const first=plan.findIndex(function(v){return Number(v)>0;});
            const last=plan.findIndex(function(v){return Number(v)>=99.999;});
            if(first>=0)item.start=isoDate_(new Date(info.startDate.getFullYear(),info.startDate.getMonth(),info.startDate.getDate()+first*7));
            if(last>=0)item.end=isoDate_(new Date(info.startDate.getFullYear(),info.startDate.getMonth(),info.startDate.getDate()+last*7+6));
          }
        }
        if(monitored){
          item.sourceId=String(engineering?r.NOMOR_DOKUMEN:r.ID).trim();
          item.basisWeight=Number(engineering?r.BOBOT_DOK:r.BOBOT)||0;
          if(engineering){item.engPlan={dates:[r.RENCANA_IFR,r.RENCANA_IFA,r.RENCANA_IFC,r.RENCANA_IFI].map(engIso_),weights:(params.pola&&params.pola[norm(r.POLA)])||[0,0,0,0],portion:Number(params.porsi)||0,days:Number(params.durasi)||0};}
          else {try{item.plan=JSON.parse(r.RENCANA_JSON||'[]');}catch(e){item.plan=[];}}
        }
        if (!item.start || !item.end || item.end<item.start) {item.notice='Tanggal baseline belum lengkap';item.start='';item.end='';}
        groups[key].children.push(item);
      });
      if (!rows.length) field.notice='Item baseline aktif belum tersedia';
    });
    executiveMasterRollup_(project);
    return project;
  });
  return {ok:true,projects:out,generatedAt:new Date().toISOString()};
}
function executiveMasterRollup_(node) {
  if (!node.children || !node.children.length) {node.items=node.kind==='item'?1:0;node.incomplete=node.notice?1:0;return;}
  node.children.forEach(executiveMasterRollup_);
  const dated=node.children.filter(function(c){return c.start && c.end;});
  node.start=dated.length ? dated.map(function(c){return c.start;}).sort()[0] : '';
  node.end=dated.length ? dated.map(function(c){return c.end;}).sort().pop() : '';
  node.items=node.children.reduce(function(n,c){return n+(c.items||0);},0);
  node.incomplete=node.children.reduce(function(n,c){return n+(c.incomplete||0);},0);
}


/** Read-only monitoring page. Historical item details are never inferred from future snapshots. */
function getMasterScheduleMonitoring(token, requestedProject) {
  dbReadOnly_(); // C1b: baca DATA MINGGUAN/BULANAN dari cache
  const user=requireUser_(token);ktrBlock_(user);
  const db=loadDb_(),projects=(db.allProjects||db.projects).filter(function(p){return userCanAccess_(user,p);});
  const id=String(requestedProject||'').trim().toUpperCase();
  // terima ID proyek atau nama proyek (link dari halaman lain membawa nama proyek)
  const p=id?(projects.find(function(x){return String(x.id).toUpperCase()===id;})||projects.find(function(x){return String(x.name||'').trim().toUpperCase()===id;})||projects[0]):projects[0];
  if(!p)throw new Error('Proyek tidak ditemukan atau tidak dapat diakses.');
  const base=masterScheduleBaseline_(db,[p],true).projects[0];
  const read=executiveLookAheadReader_(db.ss,[p]),info=weeklyInfo_(db,p);
  const records={ENG:read(ENG.SHEETS.REAL)},history={ENG:read(ENG.SHEETS.PROGRES)};
  const er=read(EPC.SHEETS.REAL),eh=read(EPC.SHEETS.PROGRES);
  ['PROC','CONS','COM'].forEach(function(f){records[f]=er.filter(function(r){return String(r.BIDANG).trim().toUpperCase()===f;});history[f]=eh.filter(function(r){return String(r.BIDANG).trim().toUpperCase()===f;});});
  const weeks={};
  base.children.forEach(function(field){
    const f=field.code;field.history=[];field.snapshots={};
    const byWeek={};
    history[f].forEach(function(r){const w=Number(r.WEEK);if(!(w>=1&&w<=10000))return;weeks[w]=true;const rev=f==='ENG'&&r.REVISI!==''?Number(r.REVISI):null;byWeek[w]={week:w,plan:masterScheduleNumber_(r.RENCANA),actual:masterScheduleNumber_(r.REALISASI),revision:rev};});
    field.history=Object.keys(byWeek).map(function(w){return byWeek[w];}).sort(function(a,b){return a.week-b.week;});
    records[f].forEach(function(r){
      const w=Number(r.WEEK),key=String(f==='ENG'?r.NOMOR_DOKUMEN:r.ID).trim();
      if(!(w>=1&&w<=10000)||!key)return;
      // Realisasi dokumen dicocokkan per nomor dokumen. Revisi lama tetap dipakai (Kelola EDL membuat revisi baru
      // tanpa mengubah progres dokumen; ganti nomor sudah memindahkan realisasi ke nomor baru).
      if(f==='ENG'&&r.REVISI!==''&&Number(r.REVISI)>field.revision)return;
      let dates={};try{dates=JSON.parse(r.TANGGAL_JSON||'{}');}catch(e){}
      const rec={week:w,actual:masterScheduleNumber_(f==='ENG'?r.PROGRES_DOK:r.PROGRES),start:f==='ENG'?engIso_(r.MULAI_AKTUAL):'',finish:f==='PROC'?engIso_(dates.mosA):''};
      if(rec.actual===null)return;
      weeks[w]=true;(field.snapshots[key]=field.snapshots[key]||[]).push(rec);
    });
    Object.keys(field.snapshots).forEach(function(k){field.snapshots[k].sort(function(a,b){return a.week-b.week;});});
  });
  const start=info.startDate?isoDate_(info.startDate):'';
  const cutoffs=(db.monthly.months||[]).map(function(m){return {label:m.label,week:cutWeekOf_(db,p,m)};}).filter(function(c){return c.week>=1&&c.week<=10000;});
  return {ok:true,user:{name:user.name||user.username||'',role:String(user.role||'').toUpperCase()},canInput:userCanOperateProject_(user,p),project:base,projects:projects.map(function(x){return {id:x.id,name:x.name||x.id};}),weeks:Object.keys(weeks).map(Number).sort(function(a,b){return a-b;}),start:start,currentWeek:start?weekForDate_(info.startDate,new Date()):0,cutoffs:cutoffs,generatedAt:new Date().toISOString()};
}
function masterScheduleNumber_(v){if(v===''||v===null||v===undefined)return null;const n=Number(v);return isFinite(n)?Math.max(0,Math.min(100,n)):null;}

/** Hapus foto galeri secara recoverable; otorisasi selalu berdasarkan penugasan proyek. */
function deleteGalleryPhoto(token, projectId, photoId) {
  const ctx = galCtx_(token, projectId), id = String(photoId || '');
  if (!/^[a-zA-Z0-9_-]{10,150}$/.test(id)) throw new Error('ID foto tidak valid.');
  const lock = pmoLock_('GAL'); lock.waitLock(30000);
  try {
    const drive = engDriveOf_(ctx.p.id);
    if (!drive) throw new Error('Folder Drive proyek belum diatur.');
    const projects = DriveApp.getFolderById(drive.id).getFoldersByName(ctx.p.id);
    if (!projects.hasNext()) throw new Error('Folder proyek tidak ditemukan.');
    const projectFolder = projects.next(), roots = [];
    [GAL.FOLDER, 'Laporan Manajemen'].forEach(function(name) {
      const folders = projectFolder.getFoldersByName(name);
      while (folders.hasNext()) roots.push(folders.next().getId());
    });
    const file = DriveApp.getFileById(id);
    if (!/^image\//.test(file.getMimeType()) || !galPhotoInRoots_(file, roots)) throw new Error('Foto bukan milik galeri proyek ini.');
    // Kosongkan slot foto yang merujuk file ini tanpa menggeser slot foto/video lainnya.
    const sheet = engSheet_(MR.SHEET, false), edits = [];
    if (sheet && sheet.getLastRow() > 1) {
      const values = sheet.getDataRange().getValues(), header = values[0].map(function(v) { return String(v).trim().toUpperCase(); });
      const pi = header.indexOf('PROYEK_ID'), ji = header.indexOf('DATA_JSON');
      if (pi < 0 || ji < 0) throw new Error('Struktur data laporan belum dikenali. Foto belum dihapus.');
      for (let i = 1; i < values.length; i++) {
        let data; try { data = JSON.parse(String(values[i][ji] || '{}')); } catch(e) { continue; }
        if (!Array.isArray(data.photos) || !data.photos.some(function(ph) { return ph && ph.kind !== 'video' && String(ph.id || '') === id; })) continue;
        if (String(values[i][pi]).trim().toUpperCase() !== String(ctx.p.id).toUpperCase()) throw new Error('Foto juga dipakai laporan proyek lain. Hubungi Admin sebelum menghapus.');
        data.photos = data.photos.map(function(ph) { return ph && ph.kind !== 'video' && String(ph.id || '') === id ? null : ph; });
        edits.push({row:i+1, col:ji+1, value:JSON.stringify(data)});
      }
    }
    file.setTrashed(true);
    edits.forEach(function(e) { sheet.getRange(e.row,e.col).setValue(e.value); });
    galleryChanged_();
    return {success:true, id:id, projectId:ctx.p.id, trashed:true};
  } finally { lock.releaseLock(); }
}
function gabungOtomatisSemuaKode() {
  editorOnly_();
  let hasil = "=== 1. KODE BACKEND (.GS) ===\n\n";
  let semuaKodeGS = "";
  const globalObj = this;
  
  // 1. Ambil semua fungsi di seluruh file .gs secara otomatis
  Object.getOwnPropertyNames(globalObj).forEach(nama => {
    try {
      const item = globalObj[nama];
      if (typeof item === 'function' && nama !== 'gabungOtomatisSemuaKode' && nama !== 'gabungSemuaHalamanHTML') {
        const kodeFungsi = item.toString();
        if (!kodeFungsi.includes('[native code]')) {
          hasil += "// --- FUNGSI: " + nama + " ---\n" + kodeFungsi + "\n\n";
          semuaKodeGS += kodeFungsi + "\n";
        }
      }
    } catch (e) {}
  });

  hasil += "\n=== 2. KODE TAMPILAN (.HTML) ===\n\n";
  
  // 2. Deteksi otomatis semua nama file HTML yang dipanggil di dalam kode .gs
  const kandidatHTML = new Set([
    'Index', 'index', 'Portal', 'portal', 'Dashboard', 'dashboard',
    'Main', 'main', 'Home', 'home', 'Page', 'page', 'View', 'view',
    'CSS', 'css', 'Stylesheet', 'stylesheet', 'Style', 'style',
    'JS', 'js', 'JavaScript', 'javascript', 'Script', 'script'
  ]);

  const regexKutipan = /['"`]([a-zA-Z0-9_\-\/\.]+)['"`]/g;
  let match;
  while ((match = regexKutipan.exec(semuaKodeGS)) !== null) {
    if (match[1] && match[1].length < 60) {
      kandidatHTML.add(match[1]);
      kandidatHTML.add(match[1].replace(/\.html$/i, ''));
    }
  }

  const sudahDiambil = new Set();
  function cobaAmbilHTML(namaFile) {
    if (!namaFile || sudahDiambil.has(namaFile)) return;
    try {
      const isiHTML = HtmlService.createHtmlOutputFromFile(namaFile).getContent();
      sudahDiambil.add(namaFile);
      hasil += "\n<!-- ========================================== -->\n";
      hasil += "<!-- FILE HTML: " + namaFile + " -->\n";
      hasil += "<!-- ========================================== -->\n";
      hasil += isiHTML + "\n";

      // Cek juga jika di dalam HTML ada memanggil file HTML lain (include)
      let subMatch;
      const subRegex = /['"`]([a-zA-Z0-9_\-\/\.]+)['"`]/g;
      while ((subMatch = subRegex.exec(isiHTML)) !== null) {
        if (subMatch[1] && subMatch[1].length < 60) {
          cobaAmbilHTML(subMatch[1].replace(/\.html$/i, ''));
        }
      }
    } catch (e) {}
  }

  kandidatHTML.forEach(nama => cobaAmbilHTML(nama));

  const file = DriveApp.createFile("Full_Kode_Otomatis.txt", hasil);
  Logger.log("SELESAI! Total file HTML terdeteksi: " + sudahDiambil.size);
  Logger.log("Silakan ambil file Full_Kode_Otomatis.txt di Google Drive Anda: " + file.getUrl());
}
function gabungSemuaHalamanHTML() {
  editorOnly_();
  // Masukkan nama-nama file HTML yang ada di project Anda di dalam daftar ini:
  const daftarFileHTML = ['portal', 'index', 'dashboard']; // <-- sesuaikan dengan nama file .html Anda
  
  let hasil = "";
  daftarFileHTML.forEach(nama => {
    try {
      const isi = HtmlService.createHtmlOutputFromFile(nama).getContent();
      hasil += "\n\n<!-- === MULAI FILE: " + nama + ".html === -->\n" + isi;
    } catch (e) {
      hasil += "\n<!-- File " + nama + " tidak ditemukan -->\n";
    }
  });
  
  const file = DriveApp.createFile("Gabungan_Tampilan_Dashboard.txt", hasil);
  Logger.log("Selesai! Buka link ini di Drive: " + file.getUrl());
}


/* ===== MASTER SCHEDULE · JADWAL CPM (import XML Primavera P6 / MS Project) =====
 * Jaringan aktivitas + predecessor disimpan per revisi import. Tanggal mengikuti file apa adanya;
 * float & lintasan kritis dihitung di halaman. Import hanya Admin dan PIC proyek. */
const MSCPM = {
  REV: ['MS_REVISI', ['PROYEK_ID','REVISI','STATUS','SUMBER','NAMA_FILE','NAMA_PROYEK_FILE','DATA_DATE','STATUS_DATE','JML_WBS','JML_AKTIVITAS','JML_LINK','KALENDER_JSON','DIUNGGAH_OLEH','WAKTU']],
  WBS: ['MS_WBS', ['PROYEK_ID','REVISI','WBS_ID','INDUK_ID','KODE','NAMA','URUT']],
  ACT: ['MS_AKTIVITAS', ['PROYEK_ID','REVISI','AKT_ID','KODE','NAMA','WBS_ID','TIPE','DURASI_HARI','RENCANA_MULAI','RENCANA_SELESAI','MULAI','SELESAI','AKTUAL_MULAI','AKTUAL_SELESAI','PERSEN','BATAS','BATAS_TGL','BOBOT_KONTRAK_XML','BOBOT_REALISASI_XML']],
  LINK: ['MS_LINK', ['PROYEK_ID','REVISI','PRED','SUCC','TIPE','LAG_HARI','SUMBER','STATUS','OLEH','WAKTU','CATATAN']],
  BASE: ['MS_BASELINE', ['PROYEK_ID','REVISI_ASAL','KODE','MULAI','SELESAI']],
  FC: ['MS_FORECAST', ['PROYEK_ID','MINGGU','REVISI','TGL_STATUS','OPTIMIS','PALING_MUNGKIN','PESIMIS','SPI_FILE','RENCANA_FILE','AKTUAL_FILE','OLEH','WAKTU']],
  SUM: ['MS_RINGKASAN', ['PROYEK_ID','JENIS','ISI_JSON','WAKTU']]
};
/** Buang baris & kolom kosong berlebih pada sheet MS_* (sisa impor/hapus). Disisakan 50 baris cadangan;
 *  kolom hanya dibuang bila memang kosong. Mengembalikan jumlah sel yang dibebaskan. */
function mscTrim_(sh, width) {
  if (!sh) return 0;
  const before = sh.getMaxRows() * sh.getMaxColumns();
  const keepC = Math.max(width, sh.getLastColumn()), mc = sh.getMaxColumns();
  if (mc > keepC) sh.deleteColumns(keepC + 1, mc - keepC);
  const keepR = Math.max(1, sh.getLastRow()) + 50, mr = sh.getMaxRows();
  if (mr > keepR) sh.deleteRows(keepR + 1, mr - keepR);
  return before - sh.getMaxRows() * sh.getMaxColumns();
}
/** Jalankan dari editor sekali: pangkas semua sheet Master Schedule (MS_*) yang membengkak. */
function pangkasSheetMs() {
  editorOnly_();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID), lock = pmoLock_('MS');
  lock.waitLock(30000);
  try {
    let total = 0;
    Object.keys(MSCPM).forEach(function(k) {
      const def = MSCPM[k], sh = ss.getSheetByName(def[0]);
      if (!sh) return;
      const r0 = sh.getMaxRows(), c0 = sh.getMaxColumns(), freed = mscTrim_(sh, def[1].length);
      total += freed;
      console.log(def[0] + ' | ' + r0 + ' x ' + c0 + ' -> ' + sh.getMaxRows() + ' x ' + sh.getMaxColumns() + ' | dibebaskan ' + freed + ' sel');
    });
    console.log(JSON.stringify({ ev: 'pangkas_ms', selDibebaskan: total }));
  } finally { lock.releaseLock(); }
}
function mscSheet_(ss, def) {
  let sh = ss.getSheetByName(def[0]);
  if (!sh) { sh = ss.insertSheet(def[0]); sh.getRange(1, 1, 1, def[1].length).setValues([def[1]]).setFontWeight('bold'); sh.setFrozenRows(1); mscTrim_(sh, def[1].length); }
  else if (String(sh.getRange(1, def[1].length).getValue()).trim() === '') sh.getRange(1, 1, 1, def[1].length).setValues([def[1]]).setFontWeight('bold'); // kolom baru pada sheet lama
  return sh;
}
function mscRows_(ss, def) {
  const sh = ss.getSheetByName(def[0]);
  if (!sh || sh.getLastRow() < 2) return [];
  if (sh.getMaxColumns() < def[1].length) sh.insertColumnsAfter(sh.getMaxColumns(), def[1].length - sh.getMaxColumns());
  return sh.getRange(2, 1, sh.getLastRow() - 1, def[1].length).getDisplayValues();
}
function mscText_(v, max) { let s = String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, max || 300); if (/^[=+\-@]/.test(s)) s = ' ' + s; return s; }
function mscAppend_(ss, def, rows) {
  if (!rows.length) return;
  const sh = mscSheet_(ss, def);
  if (sh.getMaxColumns() < def[1].length) sh.insertColumnsAfter(sh.getMaxColumns(), def[1].length - sh.getMaxColumns());
  const last = sh.getLastRow(), need = last + rows.length - sh.getMaxRows();
  if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need);
  sh.getRange(last + 1, 1, rows.length, def[1].length).setNumberFormat('@').setValues(rows);
}
/** Buang baris yang tidak lolos keep(row). */
function mscPurge_(ss, def, keep) {
  const sh = ss.getSheetByName(def[0]);
  if (!sh || sh.getLastRow() < 2) return;
  if (sh.getMaxColumns() < def[1].length) sh.insertColumnsAfter(sh.getMaxColumns(), def[1].length - sh.getMaxColumns());
  const n = sh.getLastRow() - 1, rg = sh.getRange(2, 1, n, def[1].length), vals = rg.getDisplayValues(), kept = vals.filter(keep);
  if (kept.length === vals.length) return;
  rg.clearContent();
  if (kept.length) sh.getRange(2, 1, kept.length, def[1].length).setNumberFormat('@').setValues(kept);
  mscTrim_(sh, def[1].length); // baris yang dikosongkan ikut dibuang agar sheet tidak membengkak
}
function mscCtx_(token, projectId, needImport) {
  const user = requireUser_(token); ktrBlock_(user);
  const db = loadDb_(), id = String(projectId || '').trim().toUpperCase();
  const p = (db.allProjects || db.projects).filter(function(x) { return userCanAccess_(user, x); }).find(function(x) { return String(x.id).trim().toUpperCase() === id; });
  if (!p) throw new Error('Proyek tidak ditemukan atau tidak dapat diakses.');
  const role = String(user.role || '').trim().toUpperCase();
  const can = role === 'ADMIN' || (role === 'PIC' && normKey_(user.projectId || '') === normKey_(p.id));
  if (needImport && !can) throw new Error('Import jadwal hanya untuk Admin dan PIC proyek ini.');
  return {user: user, db: db, ss: db.ss, p: p, can: can, pid: id};
}
function mscRevs_(ss, pid) {
  return mscRows_(ss, MSCPM.REV).filter(function(r) { return String(r[0]).trim().toUpperCase() === pid; }).map(function(r) {
    return {no: Number(r[1]), status: String(r[2]).trim().toUpperCase(), source: r[3], file: r[4], projName: r[5], dataDate: r[6], statusDate: r[7], nWbs: Number(r[8]) || 0, nActs: Number(r[9]) || 0, nLinks: Number(r[10]) || 0, cal: r[11], by: r[12], at: r[13]};
  });
}
function mscSetStatus_(ss, pid, map) {
  const sh = ss.getSheetByName(MSCPM.REV[0]); if (!sh || sh.getLastRow() < 2) return;
  const rg = sh.getRange(2, 1, sh.getLastRow() - 1, 3), v = rg.getDisplayValues();
  v.forEach(function(r) { if (String(r[0]).trim().toUpperCase() === pid && map[Number(r[1])]) r[2] = map[Number(r[1])]; });
  rg.setNumberFormat('@').setValues(v);
}
function mscOf_(pid, revs) { return function(r) { return String(r[0]).trim().toUpperCase() === pid && revs.indexOf(Number(r[1])) >= 0; }; }

/** Jadwal CPM aktif untuk satu proyek (baris ringkas, semua nilai teks). */
function getMsCpm(token, projectId) {
  const c = mscCtx_(token, projectId, false), revs = mscRevs_(c.ss, c.pid);
  const act = revs.filter(function(r) { return r.status === 'AKTIF'; }).sort(function(a, b) { return b.no - a.no; })[0];
  const out = {ok: true, projectId: c.pid, canImport: c.can, hasPrev: revs.some(function(r) { return r.status === 'ARSIP'; }), rev: null};
  out.revs = revs.filter(function(r) { return r.status !== 'DRAF'; }).sort(function(a, b) { return b.no - a.no; }).slice(0, 30).map(function(r) { return {no: r.no, status: r.status, source: r.source, file: r.file, by: r.by, at: r.at, nActs: r.nActs, nLinks: r.nLinks}; });
  if (!act) return out;
  const mine = mscOf_(c.pid, [act.no]), cut = function(r) { return r.slice(2); };
  let cal = null; try { cal = JSON.parse(act.cal || 'null'); } catch (e) {}
  out.rev = {no: act.no, source: act.source, file: act.file, projName: act.projName, dataDate: act.dataDate, statusDate: act.statusDate, by: act.by, at: act.at, cal: cal};
  out.wbs = mscRows_(c.ss, MSCPM.WBS).filter(mine).map(cut);
  out.acts = mscRows_(c.ss, MSCPM.ACT).filter(mine).map(cut);
  out.links = mscRows_(c.ss, MSCPM.LINK).filter(mine).map(cut);
  const base = mscRows_(c.ss, MSCPM.BASE).filter(function(r) { return String(r[0]).trim().toUpperCase() === c.pid; });
  out.baseline = base.map(function(r) { return [r[2], r[3], r[4]]; });
  out.baseRev = base.length ? Number(base[0][1]) || 0 : 0;
  out.fc = mscFc_(c.ss, c.pid);
  out.epc = mscEpc_(c.pid);
  const sm = mscSumAll_(c.ss)[c.pid] || {};
  out.opt = sm.OPSI || {la: 'EPCC'};
  out.sumSig = (sm.UMUM && sm.UMUM.sig) || '';
  return out;
}
/* ----- Tahap 3 lanjutan: ringkasan jadwal untuk Weekly, Executive, Look Ahead 3 bulan, dan Sena ----- */
function mscIso_(v) { v = String(v || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''; }
function mscToday_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function mscDayNo_(s) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5) : null; }
function mscDays_(a, b) { const x = mscDayNo_(a), y = mscDayNo_(b); return x === null || y === null ? null : x - y; }
function mscAddDays_(iso, n) { const d = mscDayNo_(iso); return d === null ? '' : new Date((d + n) * 864e5).toISOString().slice(0, 10); }
function mscNum_(v, d) { v = Number(v); if (!isFinite(v)) return 0; const k = Math.pow(10, d); return Math.round(v * k) / k; }
/** Semua ringkasan jadwal: { PROYEK_ID: { UMUM, LA, OPSI } } (dibaca sekali per eksekusi). */
function mscSumAll_(ss) {
  if (mscSumAll_.c) return mscSumAll_.c;
  const out = {};
  mscRows_(ss, MSCPM.SUM).forEach(function(r) {
    const pid = String(r[0]).trim().toUpperCase(), k = String(r[1]).trim().toUpperCase(); if (!pid || !k) return;
    try { (out[pid] = out[pid] || {})[k] = JSON.parse(r[2]); } catch (e) {}
  });
  return (mscSumAll_.c = out);
}
function mscSumPut_(ss, pid, kind, obj) {
  const txt = JSON.stringify(obj);
  if (txt.length > 48000) throw new Error('Ringkasan jadwal terlalu besar untuk disimpan.');
  const sh = mscSheet_(ss, MSCPM.SUM), rows = mscRows_(ss, MSCPM.SUM);
  const row = [pid, kind, txt, Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')];
  let at = -1; rows.forEach(function(r, i) { if (String(r[0]).trim().toUpperCase() === pid && String(r[1]).trim().toUpperCase() === kind) at = i; });
  if (at >= 0) sh.getRange(at + 2, 1, 1, row.length).setNumberFormat('@').setValues([row]); else mscAppend_(ss, MSCPM.SUM, [row]);
  mscSumAll_.c = null;
}
function mscOpt_(ss, pid) { const S = mscSumAll_(ss)[String(pid).trim().toUpperCase()]; return (S && S.OPSI) || {la: 'EPCC'}; }
/** Simpan ringkasan jadwal (dihitung di tab Jadwal CPM). Admin / PIC proyek. */
function msCpmSummarySave(token, projectId, s) {
  const c = mscCtx_(token, projectId, true); s = s || {};
  const u = s.umum || {}, l = s.la || {}, fc = u.fc || {}, x = u.xml || {}, n = u.n || {};
  if (!mscIso_(fc.lik) || !mscIso_(u.cut)) throw new Error('Ringkasan jadwal tidak lengkap.');
  const umum = {v: 1, sig: mscText_(u.sig, 90), rev: Number(u.rev) || 0, cut: mscIso_(u.cut), saved: mscToday_(), finish: mscIso_(u.finish), blFinish: mscIso_(u.blFinish),
    fc: {opt: mscIso_(fc.opt), lik: mscIso_(fc.lik), pes: mscIso_(fc.pes)}, xml: {plan: mscNum_(x.plan, 2), actual: mscNum_(x.actual, 2), spi: x.spi === null || x.spi === undefined ? null : mscNum_(x.spi, 3)},
    n: {acts: Number(n.acts) || 0, done: Number(n.done) || 0, run: Number(n.run) || 0, crit: Number(n.crit) || 0},
    crit: (Array.isArray(u.crit) ? u.crit : []).slice(0, 60).map(function(r) { return [mscText_(r[0], 40), mscText_(r[1], 90), mscText_(r[2], 40), mscIso_(r[3]), mscIso_(r[4]), Math.round(Number(r[5]) || 0), r[6] ? 1 : 0]; })};
  const BID = ['ENG', 'PROC', 'CONS', 'COM'];
  let g = (Array.isArray(l.g) ? l.g : []).filter(function(q) { return q && BID.indexOf(String(q.b)) >= 0; }).map(function(q) {
    return {c: mscText_(q.c, 40), n: mscText_(q.n, 90), gc: mscText_(q.gc, 40), gn: mscText_(q.gn, 60), b: String(q.b), w: mscNum_(q.w, 2), a: mscNum_(q.a, 2), p: mscNum_(q.p, 2), s: mscIso_(q.s), k: Math.max(0, Math.round(Number(q.k) || 0)), pl: (Array.isArray(q.pl) ? q.pl : []).slice(0, 84).map(function(v) { return mscNum_(v, 1); })};
  }).sort(function(a, b) { return b.w - a.w; }).slice(0, 220);
  const la = {v: 1, rev: umum.rev, cut: umum.cut, m0: /^\d{4}-\d{2}$/.test(String(l.m0 || '')) ? String(l.m0) : '', g: g};
  while (la.g.length > 20 && JSON.stringify(la).length > 47000) la.g = la.g.slice(0, Math.floor(la.g.length * 0.85));
  const lock = pmoLock_('MS'); lock.waitLock(30000);
  try { mscSumPut_(c.ss, c.pid, 'UMUM', umum); mscSumPut_(c.ss, c.pid, 'LA', la); } finally { lock.releaseLock(); }
  try { dataChanged_(); } catch (e) {}
  return {ok: true, sig: umum.sig};
}
/** Pilihan per proyek. la = sumber Look Ahead 3 bulan di Executive: 'EPCC' atau 'XML'. Admin / PIC proyek. */
function msCpmSetOption(token, projectId, o) {
  const c = mscCtx_(token, projectId, true), opt = {la: String((o && o.la) || '').toUpperCase() === 'XML' ? 'XML' : 'EPCC'};
  const lock = pmoLock_('MS'); lock.waitLock(30000);
  try { mscSumPut_(c.ss, c.pid, 'OPSI', opt); } finally { lock.releaseLock(); }
  try { dataChanged_(); } catch (e) {}
  return {ok: true, opt: opt};
}
/** Koreksi tanggal status (cut-off) revisi aktif, mis. bila file memuat tanggal aktual yang salah. Admin / PIC proyek. */
function msCpmSetStatusDate(token, projectId, date) {
  const c = mscCtx_(token, projectId, true), d = mscIso_(date);
  if (!d) throw new Error('Tanggal status tidak valid.');
  if (d > mscToday_()) throw new Error('Tanggal status tidak boleh setelah hari ini.');
  const lock = pmoLock_('MS'); lock.waitLock(30000);
  try {
    const sh = c.ss.getSheetByName(MSCPM.REV[0]); if (!sh || sh.getLastRow() < 2) throw new Error('Belum ada jadwal untuk proyek ini.');
    const v = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getDisplayValues(); let at = -1;
    v.forEach(function(r, i) { if (String(r[0]).trim().toUpperCase() === c.pid && String(r[2]).trim().toUpperCase() === 'AKTIF') at = i; });
    if (at < 0) throw new Error('Tidak ada revisi aktif.');
    sh.getRange(at + 2, 8).setNumberFormat('@').setValue(d);
    return {ok: true, statusDate: d};
  } finally { lock.releaseLock(); }
}
/** Ringkasan singkat untuk halaman lain. Acuan terlambat = tanggal selesai kontrak (EFEKTIF_DATE_FINISH). null bila proyek belum punya ringkasan jadwal. */
function mscBrief_(db, p) {
  try {
    const pid = String(p.id).trim().toUpperCase(), S = mscSumAll_(db.ss)[pid];
    if (!S || !S.UMUM || !S.UMUM.fc || !S.UMUM.fc.lik) return null;
    const u = S.UMUM, today = mscToday_(), lim = mscAddDays_(today, 14);
    let ref = ''; try { const L = projectLifecycle_(db, p); if (L && L.finishPlan) ref = isoDate_(L.finishPlan); } catch (e) {}
    const dn = mscDayNo_(today), wk = mscAddDays_(today, -((new Date(dn * 864e5).getUTCDay() + 6) % 7));
    if (!mscBrief_.fc) mscBrief_.fc = mscRows_(db.ss, MSCPM.FC);
    let prev = '', pw = '';
    mscBrief_.fc.forEach(function(r) { if (String(r[0]).trim().toUpperCase() !== pid) return; const w = String(r[1]).trim(); if (w < wk && w > pw && mscIso_(r[5])) { pw = w; prev = mscIso_(r[5]); } });
    const crit = (u.crit || []).filter(function(r) { return (r[3] && r[3] <= lim) || (r[4] && r[4] <= lim); })
      .map(function(r) { return {code: r[0], name: r[1], area: r[2], start: r[3], finish: r[4], pct: r[5], started: !!r[6], late: !!(r[4] && r[4] < today)}; });
    return {rev: u.rev, cut: u.cut, saved: u.saved, opt: u.fc.opt, likely: u.fc.lik, pess: u.fc.pes, ref: ref, late: ref ? mscDays_(u.fc.lik, ref) : null, prev: prev, move: prev ? mscDays_(u.fc.lik, prev) : null,
      xml: u.xml || null, counts: u.n || null, crit: crit.slice(0, 20), critMore: Math.max(0, crit.length - 20), stale: mscDays_(today, u.cut)};
  } catch (e) { return null; }
}
/** Look Ahead 3 bulan dari jadwal XML, bentuknya sama dengan versi EPCC (4 bidang × 3 bulan). Kandidat = grup WBS level 3. null bila belum ada ringkasan. */
function mscLookAhead_(db, p, months, fieldWeight) {
  try {
    const S = mscSumAll_(db.ss)[String(p.id).trim().toUpperCase()], L = S && S.LA;
    if (!L || !(L.g || []).length || !/^\d{4}-\d{2}$/.test(String(L.m0 || ''))) return null;
    const y0 = Number(L.m0.slice(0, 4)), mo0 = Number(L.m0.slice(5, 7)) - 1;
    const idx = function(d) { return (d.getFullYear() - y0) * 12 + d.getMonth() - mo0; };
    const planAt = function(g, mi) { const pl = g.pl || [], k = mi - g.k; if (k < 0 || !pl.length) return 0; return Number(pl[Math.min(k, pl.length - 1)]) || 0; };
    const cutText = (function() { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(L.cut || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : '-'; })();
    const names = ['Engineering', 'Procurement', 'Construction', 'Commissioning'], keys = ['ENG', 'PROC', 'CONS', 'COM'];
    return names.map(function(name, i) {
      const gs = L.g.filter(function(g) { return g.b === keys[i]; });
      const out = {name: name, baseline: gs.length > 0, revision: L.rev, week: null, complete: false, monthStates: [null, null, null], message: 'Tidak ada WBS ' + name + ' di jadwal XML', months: [[], [], []], sourceText: 'Jadwal XML Rev ' + L.rev + ' · status file ' + cutText};
      if (!gs.length) return out;
      try {
        out.complete = gs.every(function(g) { return g.a >= 99.995; });
        if (out.complete) { out.message = 'Pekerjaan selesai'; return out; }
        const sum = gs.reduce(function(v, g) { return v + g.w; }, 0);
        let startIso = ''; gs.forEach(function(g) { if (g.s && (!startIso || g.s < startIso)) startIso = g.s; });
        out.months = months.map(function(m, mi) {
          const ib = idx(m.before), ie = idx(m.end);
          const candidates = gs.map(function(g) { return {code: g.c, name: g.n, groupCode: g.gc || '', groupName: g.gn || '', discipline: '', weight: g.w, actual: g.a, planNow: g.p, planBefore: planAt(g, ib), planEnd: planAt(g, ie)}; });
          out.monthStates[mi] = executiveLookAheadMonthState_(candidates, startIso, m.endIso);
          return executiveLookAheadTasks_(candidates, fieldWeight(name), sum);
        });
        out.message = 'Tidak ada pekerjaan belum selesai dengan kenaikan rencana pada tiga bulan ini.';
      } catch (e) { out.error = true; out.message = 'Ringkasan jadwal XML belum lengkap untuk menghitung Look Ahead.'; out.months = [[], [], []]; }
      return out;
    });
  } catch (e) { return null; }
}

/* ----- Tahap 3: forecast selesai (riwayat mingguan) + progres dashboard per bidang untuk SPI ----- */
function mscFc_(ss, pid) {
  return mscRows_(ss, MSCPM.FC).filter(function(r) { return String(r[0]).trim().toUpperCase() === pid; }).map(function(r) { return r.slice(1); })
    .sort(function(a, b) { return String(a[0]) < String(b[0]) ? -1 : String(a[0]) > String(b[0]) ? 1 : 0; }).slice(-60);
}
/** Progres EPCC Control per bidang pada minggu terakhir yang tersimpan (rencana & realisasi, % bidang). */
function mscEpc_(pid) {
  const out = [];
  try {
    const last = {};
    epcRead_(EPC.SHEETS.PROGRES).forEach(function(r) {
      if (String(r.PROYEK_ID || '').trim().toUpperCase() !== pid) return;
      const F = String(r.BIDANG || '').trim().toUpperCase(), w = Number(r.WEEK) || 0;
      if (!F || (last[F] && last[F].week >= w)) return;
      last[F] = {F: F, week: w, plan: Number(r.RENCANA) || 0, real: Number(r.REALISASI) || 0};
    });
    Object.keys(last).forEach(function(k) { out.push(last[k]); });
  } catch (e) {}
  return out;
}
/** Catat forecast minggu ini (satu baris per proyek per minggu; ditimpa bila berubah). Admin / PIC proyek. */
function msCpmForecastSave(token, projectId, f) {
  const c = mscCtx_(token, projectId, true); f = f || {};
  const iso = function(v) { v = String(v || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''; };
  const num = function(v, d) { if (v === null || v === undefined || v === '') return ''; v = Number(v); const k = Math.pow(10, d); return isFinite(v) ? String(Math.round(v * k) / k) : ''; };
  const wk = iso(f.week);
  if (!wk || !iso(f.likely) || !iso(f.opt) || !iso(f.pess)) throw new Error('Data forecast tidak lengkap.');
  const row = [c.pid, wk, String(Number(f.rev) || 0), iso(f.cut), iso(f.opt), iso(f.likely), iso(f.pess), num(f.spi, 3), num(f.plan, 2), num(f.actual, 2), mscText_(c.user.name || c.user.username, 80), Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')];
  const lock = pmoLock_('MS'); lock.waitLock(30000);
  try {
    const sh = mscSheet_(c.ss, MSCPM.FC), rows = mscRows_(c.ss, MSCPM.FC);
    let at = -1; rows.forEach(function(r, i) { if (String(r[0]).trim().toUpperCase() === c.pid && String(r[1]).trim() === wk) at = i; });
    if (at >= 0) sh.getRange(at + 2, 1, 1, row.length).setNumberFormat('@').setValues([row]); else mscAppend_(c.ss, MSCPM.FC, [row]);
    return {ok: true, fc: mscFc_(c.ss, c.pid)};
  } finally { lock.releaseLock(); }
}

/** Mulai import: buat revisi DRAF (draf lama proyek ini dibuang). */
function msCpmImportBegin(token, projectId, meta) {
  const c = mscCtx_(token, projectId, true); meta = meta || {};
  const lock = pmoLock_('MS'); lock.waitLock(30000);
  try {
    const revs = mscRevs_(c.ss, c.pid), drafts = revs.filter(function(r) { return r.status === 'DRAF'; }).map(function(r) { return r.no; });
    if (drafts.length) { const d = mscOf_(c.pid, drafts), keep = function(r) { return !d(r); }; [MSCPM.WBS, MSCPM.ACT, MSCPM.LINK, MSCPM.REV].forEach(function(def) { mscPurge_(c.ss, def, keep); }); }
    const no = revs.reduce(function(m, r) { return Math.max(m, r.no || 0); }, 0) + 1;
    const src = String(meta.source || '').toUpperCase() === 'MSP' ? 'MSP' : 'P6';
    let cal = ''; try { cal = JSON.stringify({work: (meta.cal.work || []).slice(0, 7).map(function(x) { return x ? 1 : 0; }), hol: (meta.cal.hol || []).slice(0, 400).map(function(x) { return String(x).slice(0, 10); }), hpd: Number(meta.cal.hpd) || 8, name: mscText_(meta.cal.name, 80), progress: mscProgressMeta_(meta.cal.progress)}); } catch (e) {}
    mscAppend_(c.ss, MSCPM.REV, [[c.pid, String(no), 'DRAF', src, mscText_(meta.fileName, 150), mscText_(meta.projName, 200), String(meta.dataDate || '').slice(0, 10), String(meta.statusDate || '').slice(0, 10), String(Number(meta.nWbs) || 0), String(Number(meta.nActs) || 0), String(Number(meta.nLinks) || 0), cal, mscText_(c.user.name || c.user.username, 80), Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')]]);
    return {ok: true, rev: no};
  } finally { lock.releaseLock(); }
}
function msCpmImportChunk(token, projectId, rev, kind, rows) {
  const c = mscCtx_(token, projectId, true); rev = Number(rev);
  if (!Array.isArray(rows) || rows.length > 3000) throw new Error('Potongan data tidak valid.');
  const def = kind === 'WBS' ? MSCPM.WBS : kind === 'ACT' ? MSCPM.ACT : kind === 'LINK' ? MSCPM.LINK : null;
  if (!def) throw new Error('Jenis data tidak dikenal.');
  const lock = pmoLock_('MS'); lock.waitLock(30000);
  try {
    if (!mscRevs_(c.ss, c.pid).some(function(r) { return r.no === rev && r.status === 'DRAF'; })) throw new Error('Sesi import tidak ditemukan. Ulangi import.');
    const w = kind === 'LINK' ? 4 : def[1].length - 2;
    const out = rows.map(function(r) {
      const o = [c.pid, String(rev)];
      for (let i = 0; i < w; i++) o.push(mscText_(r[i], 300));
      // hubungan manual / nonaktif dari revisi sebelumnya ikut dibawa saat import ulang
      if (kind === 'LINK') { o.push(String(r[4]).toUpperCase() === 'MANUAL' ? 'MANUAL' : 'IMPORT'); o.push(String(r[5]).toUpperCase() === 'NONAKTIF' ? 'NONAKTIF' : 'DISETUJUI'); o.push(mscText_(r[6], 80)); o.push(mscText_(r[7], 20)); o.push(mscText_(r[8], 300)); }
      return o;
    });
    mscAppend_(c.ss, def, out);
    return {ok: true, n: out.length};
  } finally { lock.releaseLock(); }
}
/** Jadikan revisi AKTIF; revisi aktif sebelumnya jadi ARSIP (satu langkah untuk pembatalan), yang lebih lama dibuang. */
function mscActivate_(c, rev, revs) {
  const map = {}, drop = []; map[rev] = 'AKTIF';
  const prevActive = revs.filter(function(r) { return r.status === 'AKTIF' && r.no !== rev; }).map(function(r) { return r.no; });
  prevActive.forEach(function(n) { map[n] = 'ARSIP'; });
  revs.filter(function(r) { return r.status === 'ARSIP'; }).forEach(function(r) { if (prevActive.length) { map[r.no] = 'DIBUANG'; drop.push(r.no); } });
  if (prevActive.length > 1) prevActive.sort(function(a, b) { return b - a; }).slice(1).forEach(function(n) { map[n] = 'DIBUANG'; drop.push(n); });
  mscSetStatus_(c.ss, c.pid, map);
  if (drop.length) { const d = mscOf_(c.pid, drop), keep = function(r) { return !d(r); }; [MSCPM.WBS, MSCPM.ACT, MSCPM.LINK].forEach(function(def) { mscPurge_(c.ss, def, keep); }); }
}
/** Baseline pembanding = tanggal tiap aktivitas (per kode) pada satu revisi. */
function mscSetBaseline_(c, rev) {
  const mine = mscOf_(c.pid, [rev]);
  const rows = mscRows_(c.ss, MSCPM.ACT).filter(mine).map(function(r) { return [c.pid, String(rev), r[3], r[12] || r[10] || r[8], r[13] || r[11] || r[9]]; });
  mscPurge_(c.ss, MSCPM.BASE, function(r) { return String(r[0]).trim().toUpperCase() !== c.pid; });
  mscAppend_(c.ss, MSCPM.BASE, rows);
}
/** Selesaikan import: periksa kelengkapan, jadikan AKTIF. opts.baseline = jadikan baseline baru. */
function msCpmImportCommit(token, projectId, rev, opts) {
  const c = mscCtx_(token, projectId, true); rev = Number(rev); opts = opts || {};
  const lock = pmoLock_('MS'); lock.waitLock(30000);
  try {
    const revs = mscRevs_(c.ss, c.pid), me = revs.filter(function(r) { return r.no === rev && r.status === 'DRAF'; })[0];
    if (!me) throw new Error('Sesi import tidak ditemukan. Ulangi import.');
    const mine = mscOf_(c.pid, [rev]), cnt = function(def) { return mscRows_(c.ss, def).filter(mine).length; };
    if (cnt(MSCPM.WBS) !== me.nWbs || cnt(MSCPM.ACT) !== me.nActs || cnt(MSCPM.LINK) !== me.nLinks) throw new Error('Unggahan tidak lengkap. Ulangi import.');
    mscActivate_(c, rev, revs);
    const hasBase = mscRows_(c.ss, MSCPM.BASE).some(function(r) { return String(r[0]).trim().toUpperCase() === c.pid; });
    if (opts.baseline || !hasBase) mscSetBaseline_(c, rev);
    return {ok: true, rev: rev};
  } finally { lock.releaseLock(); }
}
/** Simpan hasil mode simulasi sebagai revisi manual baru (salinan revisi aktif + perubahan).
 *  p = {note, acts:[[id,durasi,mulai,selesai,batas,batasTgl]], add:[[pred,succ,tipe,lag,catatan]], off:[[pred,succ,tipe]], on:[[pred,succ,tipe]]} */
function msCpmSaveManual(token, projectId, rev, p) {
  const c = mscCtx_(token, projectId, true); rev = Number(rev); p = p || {};
  const lock = pmoLock_('MS'); lock.waitLock(30000);
  try {
    const revs = mscRevs_(c.ss, c.pid), act = revs.filter(function(r) { return r.status === 'AKTIF'; }).sort(function(a, b) { return b.no - a.no; })[0];
    if (!act || act.no !== rev) throw new Error('Jadwal sudah berubah sejak halaman ini dibuka. Muat ulang, lalu ulangi perubahan.');
    const mine = mscOf_(c.pid, [rev]), no = revs.reduce(function(m, r) { return Math.max(m, r.no || 0); }, 0) + 1, N = String(no);
    const who = mscText_(c.user.name || c.user.username, 80), now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    const iso = function(v) { v = String(v || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''; };
    const wbs = mscRows_(c.ss, MSCPM.WBS).filter(mine).map(function(r) { r = r.slice(); r[1] = N; return r; });
    const ch = {}; (Array.isArray(p.acts) ? p.acts : []).slice(0, 20000).forEach(function(a) { ch[String(a[0])] = a; });
    const ids = {};
    const acts = mscRows_(c.ss, MSCPM.ACT).filter(mine).map(function(r) {
      r = r.slice(); r[1] = N; ids[r[2]] = true;
      const x = ch[r[2]];
      if (x && !r[12]) { // aktivitas yang sudah mulai tidak diubah
        const d = Number(x[1]); if (isFinite(d) && d >= 0 && d < 10000) r[7] = String(Math.round(d * 100) / 100);
        if (iso(x[2])) r[10] = iso(x[2]); if (iso(x[3])) r[11] = iso(x[3]);
        if (x[4] === 'SNET' && iso(x[5])) { r[15] = 'SNET'; r[16] = iso(x[5]); }
      }
      return r;
    });
    const key = function(a) { return a[0] + '>' + a[1] + '>' + a[2]; }, set = function(list) { const o = {}; (Array.isArray(list) ? list : []).forEach(function(a) { o[key(a)] = true; }); return o; };
    const off = set(p.off), on = set(p.on), have = {};
    const links = [];
    mscRows_(c.ss, MSCPM.LINK).filter(mine).forEach(function(r) {
      r = r.slice(); r[1] = N; const k = r[2] + '>' + r[3] + '>' + r[4];
      if (off[k]) { if (String(r[6]).toUpperCase() === 'MANUAL') return; r[7] = 'NONAKTIF'; r[8] = who; r[9] = now; }
      else if (on[k]) { r[7] = 'DISETUJUI'; r[8] = who; r[9] = now; }
      have[r[2] + '>' + r[3]] = true; links.push(r);
    });
    (Array.isArray(p.add) ? p.add : []).slice(0, 2000).forEach(function(a) {
      const pr = String(a[0]), su = String(a[1]), t = ['FS', 'SS', 'FF', 'SF'].indexOf(a[2]) >= 0 ? a[2] : 'FS', lag = Number(a[3]);
      if (!ids[pr] || !ids[su] || pr === su || have[pr + '>' + su]) return;
      have[pr + '>' + su] = true;
      links.push([c.pid, N, pr, su, t, String(isFinite(lag) ? Math.round(lag) : 0), 'MANUAL', 'DISETUJUI', who, now, mscText_(a[4], 300)]);
    });
    mscAppend_(c.ss, MSCPM.REV, [[c.pid, N, 'DRAF', 'MANUAL', mscText_(p.note || 'Perubahan manual', 150), act.projName, act.dataDate, act.statusDate, String(wbs.length), String(acts.length), String(links.length), act.cal, who, now]]);
    mscAppend_(c.ss, MSCPM.WBS, wbs); mscAppend_(c.ss, MSCPM.ACT, acts); mscAppend_(c.ss, MSCPM.LINK, links);
    mscActivate_(c, no, mscRevs_(c.ss, c.pid));
    return {ok: true, rev: no};
  } finally { lock.releaseLock(); }
}
/** Batalkan import terakhir: revisi aktif dibuang, revisi arsip terbaru kembali aktif. */
function msCpmRollback(token, projectId) {
  const c = mscCtx_(token, projectId, true);
  const lock = pmoLock_('MS'); lock.waitLock(30000);
  try {
    const revs = mscRevs_(c.ss, c.pid).sort(function(a, b) { return b.no - a.no; });
    const act = revs.filter(function(r) { return r.status === 'AKTIF'; })[0], prev = revs.filter(function(r) { return r.status === 'ARSIP'; })[0];
    if (!act || !prev) throw new Error('Tidak ada revisi sebelumnya untuk dikembalikan.');
    const map = {}; map[act.no] = 'DIBATALKAN'; map[prev.no] = 'AKTIF';
    mscSetStatus_(c.ss, c.pid, map);
    const d = mscOf_(c.pid, [act.no]), keep = function(r) { return !d(r); };
    [MSCPM.WBS, MSCPM.ACT, MSCPM.LINK].forEach(function(def) { mscPurge_(c.ss, def, keep); });
    return {ok: true, rev: prev.no};
  } finally { lock.releaseLock(); }
}
/** Hapus seluruh jadwal CPM hasil import milik satu proyek: semua revisi, hubungan manual, dan baseline.
 *  Catatan riwayat revisi tetap ada dengan status DIHAPUS. Hanya Admin dan PIC proyek. */
function msCpmDelete(token, projectId) {
  const c = mscCtx_(token, projectId, true);
  const lock = pmoLock_('MS'); lock.waitLock(30000);
  try {
    const revs = mscRevs_(c.ss, c.pid);
    if (!revs.length) throw new Error('Tidak ada jadwal yang tersimpan untuk proyek ini.');
    const keep = function(r) { return String(r[0]).trim().toUpperCase() !== c.pid; };
    [MSCPM.WBS, MSCPM.ACT, MSCPM.LINK, MSCPM.BASE, MSCPM.FC, MSCPM.SUM].forEach(function(def) { mscPurge_(c.ss, def, keep); });
    const map = {}; revs.forEach(function(r) { if (['AKTIF', 'ARSIP', 'DRAF'].indexOf(r.status) >= 0) map[r.no] = 'DIHAPUS'; });
    mscSetStatus_(c.ss, c.pid, map);
    return {ok: true};
  } finally { lock.releaseLock(); }
}

/** Metadata progres berbobot XML; hanya angka ringkasan, tanpa rumus. */
function mscProgressMeta_(p){if(!p||typeof p!=='object')return null;const n=function(v){if(v===null||v===undefined||v==='')return null;v=Number(v);return isFinite(v)&&v>=0&&v<=100000?v:null;};const out={basis:'custom',actual:n(p.actual),groups:{}};Object.keys(p.groups||{}).slice(0,100).forEach(function(k){const q=p.groups[k]||{};out.groups[String(k).slice(0,80)]={actual:n(q.actual),weight:n(q.weight)};});return out;}

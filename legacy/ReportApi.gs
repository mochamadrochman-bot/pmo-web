/**
 * MODUL 5 · PELAPORAN MANAJEMEN — presentasi bulanan per proyek (format rapat manajemen).
 *
 * - Angka, tabel, dan grafik diambil dari dashboard: profil & keuangan (DATA BULANAN), progres per bidang (DATA MINGGUAN),
 *   EPCC Control (item, realisasi, tindak lanjut CPM), dan Look Ahead.
 * - Narasi (highlight, analisis schedule, critical schedule) dibuat draf otomatis dari data, bisa disunting dan disimpan
 *   per proyek per bulan (sheet MR_LAPORAN). Foto progres diunggah ke folder Drive tim proyek › <PROYEK_ID> › Laporan Manajemen.
 * - File PowerPoint dibuat di browser (PptxGenJS) lalu bisa diarsipkan ke Drive + register Document Control (kategori LAPORAN).
 * - Akses: ADMIN dan INPUT/PIC proyek (userCanOperateProject_).
 */
const MR = {
  SHEET: ['MR_LAPORAN', ['ID', 'PROYEK_ID', 'PERIODE', 'DATA_JSON', 'FILE_ID', 'FILE_URL', 'NAMA_FILE', 'DIPERBARUI_OLEH', 'DIPERBARUI', 'DIARSIPKAN_OLEH', 'DIARSIPKAN']],
  PHOTO_MAX: 8 * 1024 * 1024,
  PPT_MAX: 45 * 1024 * 1024,
  JSON_MAX: 48000,
  FIELDS: [['ENG', 'Engineering', 'Eng.'], ['PROC', 'Procurement', 'Proc.'], ['CONS', 'Construction', 'Cons.'], ['COM', 'Commissioning', 'Com.']],
  MON: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
  MONS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sept', 'Okt', 'Nov', 'Des']
};

// ===================== HALAMAN =====================

function getMgmtReportPageHtml(token) {
  requireUser_(token);
  const t = HtmlService.createTemplateFromFile('ManagementReport');
  t.initialSessionToken = String(token);
  t.appUrl = ScriptApp.getService().getUrl();
  t.initialProjectName = '';
  return t.evaluate().getContent();
}

/** Daftar proyek yang boleh dibuatkan laporan + bulan yang tersedia. */
function getMgmtReportList(token) {
  const user = requireUser_(token), db = loadDb_();
  const list = db.allProjects.filter(function(p) { return userCanOperateProject_(user, p); });
  const today = new Date(), tk = today.getFullYear() * 12 + today.getMonth();
  const projects = list.map(function(p) {
    const info = weeklyInfo_(db, p);
    if (!info.startDate) return null;
    let sk = null; try { sk = projectReportStartKey_(db, p); } catch (e) { sk = null; }
    if (sk === null) sk = info.startDate.getFullYear() * 12 + info.startDate.getMonth();
    let fk = tk; try { const L = projectLifecycle_(db, p); const f = L.finishDate || L.closeDate; if (f) fk = Math.min(tk, f.getFullYear() * 12 + f.getMonth() + 1); } catch (e) {}
    // bulan siap = input mingguan sudah sampai week cut-off bulan tsb (milestone bulanan) atau akhir jadwal proyek
    const lw = info.latestWeek || 0, mw = info.maxWeek || 0; const CL = mrCutLinks_(db, p);
    const months = db.monthly.months.filter(function(m) { const k = m.year * 12 + m.month; return k >= sk && k <= fk; })
      .map(function(m) { const we = mrCutWeek_(db, p, m, CL), need = mw ? Math.min(we, mw) : we;
        return { key: monthKey_(m), label: m.label, done: monthEnd_(m) <= today, ready: lw >= need, needWeek: need }; });
    if (!months.length) return null;
    const ok = months.filter(function(m) { return m.done && m.ready; }), done = months.filter(function(m) { return m.done; });
    return { id: p.id, name: p.name, fullName: p.fullName || p.name, months: months, lastWeek: lw, def: (ok.length ? ok[ok.length - 1] : done.length ? done[done.length - 1] : months[months.length - 1]).key };
  }).filter(Boolean);
  return { success: true, user: { name: user.name || user.username || '', username: user.username || '', role: String(user.role || '').toUpperCase() }, projects: projects, setup: projects.length ? null : setupHint_(db, user) };
}

/** Data otomatis + catatan tersimpan untuk satu proyek & bulan (monthKey = yyyy-MM). */
function getMgmtReport(token, projectId, monthKey) {
  const ctx = mrCtx_(token, projectId, monthKey);
  const auto = mrBuild_(ctx.db, ctx.p, ctx.m);
  const rec = mrRecordOf_(ctx.p.id, ctx.key);
  let drive = null; try { drive = engDriveOf_(ctx.p.id); } catch (e) { drive = null; }
  return { success: true, project: { id: ctx.p.id, name: ctx.p.name, fullName: ctx.p.fullName || ctx.p.name }, period: ctx.key, periodLabel: ctx.m.label,
    auto: auto, notes: rec ? rec.data : null, saved: rec ? { by: rec.by, at: rec.at } : null,
    archive: rec && rec.fileUrl ? { url: rec.fileUrl, name: rec.fileName, by: rec.archBy, at: rec.archAt } : null,
    drive: drive ? { name: drive.name, url: drive.url } : null };
}

/** Simpan suntingan narasi/foto (objek bebas, divalidasi ukuran). */
function saveMgmtReport(token, projectId, monthKey, notes) {
  const ctx = mrCtx_(token, projectId, monthKey);
  const json = JSON.stringify(mrCleanNotes_(notes || {}));
  if (json.length > MR.JSON_MAX) throw new Error('Isian laporan terlalu panjang (' + json.length + ' karakter). Ringkas teks analisis atau highlight.');
  const lock = pmoLock_('RPT'); lock.waitLock(30000);
  try {
    mrEnsureHeader_();
    const by = ctx.user.username || ctx.user.name || '', now = new Date();
    const row = mrRowOf_(ctx.p.id, ctx.key);
    if (row) row.sh.getRange(row.r, 4).setValue(json), row.sh.getRange(row.r, 8, 1, 2).setValues([[by, now]]);
    else engAppend_(MR.SHEET, [[ctx.p.id + '|' + ctx.key, ctx.p.id, ctx.key, json, '', '', '', by, now, '', '']], false);
  } finally { lock.releaseLock(); }
  return { success: true, saved: { by: userDisplayName_(ctx.user.username || ctx.user.name), at: formatDateId_(new Date()) } };
}

/** Unggah foto progres → Drive tim proyek › <ID> › Laporan Manajemen › <yyyy-MM>. file: { name, mime, base64 } */
function uploadMgmtPhoto(token, projectId, monthKey, file) {
  const ctx = mrCtx_(token, projectId, monthKey);
  const bytes = Utilities.base64Decode(String((file && file.base64) || ''));
  if (!bytes.length) throw new Error('Foto kosong.');
  if (bytes.length > MR.PHOTO_MAX) throw new Error('Foto lebih dari ' + (MR.PHOTO_MAX / 1048576) + ' MB.');
  const mime = String(file.mime || 'image/jpeg');
  if (!/^image\/(jpeg|png|webp)$/.test(mime)) throw new Error('Gunakan foto JPG atau PNG.');
  const folder = mrFolder_(ctx, ctx.key);
  const name = String(file.name || 'foto.jpg').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120);
  const f = folder.createFile(Utilities.newBlob(bytes, mime, name));
  return { success: true, id: f.getId(), url: f.getUrl(), name: f.getName() };
}

/** Foto (base64) untuk disisipkan ke slide. Hanya file yang tercatat di laporan proyek ini. */
function getMgmtPhoto(token, projectId, monthKey, fileId) {
  const ctx = mrCtx_(token, projectId, monthKey);
  const id = String(fileId || '');
  const ok = mrRecordsOf_(ctx.p.id).some(function(r) { return (r.data.photos || []).some(function(x) { return x && x.id === id; }) || !!(r.data.scurve && r.data.scurve.img && r.data.scurve.img.id === id); });
  if (!ok) throw new Error('Foto tidak terdaftar di laporan proyek ini.');
  let blob;
  try { blob = DriveApp.getFileById(id).getBlob(); } catch (e) { throw new Error('Foto tidak bisa dibuka akun web app (' + engScriptAccount_() + ').'); }
  return { success: true, mime: blob.getContentType() || 'image/jpeg', base64: Utilities.base64Encode(blob.getBytes()) };
}

/** Thumbnail video mingguan (link LINK_VIDEO pada minggu di bulan laporan) untuk disisipkan ke slide sebagai tautan video. */
function getMgmtVideoThumb(token, projectId, monthKey, week) {
  const ctx = mrCtx_(token, projectId, monthKey);
  const v = mrVideos_(ctx.db, ctx.p, ctx.m).find(function(x) { return x.week === Number(week); });
  if (!v) throw new Error('Video minggu W' + week + ' tidak ada di bulan ' + ctx.m.label + '.');
  const out = { success: true, week: v.week, url: v.url, name: '', base64: '', mime: '' };
  if (v.fileId) {
    try {
      const f = DriveApp.getFileById(v.fileId); out.name = f.getName();
      const t = f.getThumbnail(); if (t) { out.base64 = Utilities.base64Encode(t.getBytes()); out.mime = t.getContentType() || 'image/png'; }
    } catch (e) { out.note = 'Thumbnail tidak bisa dibaca akun web app; slide memakai gambar putar standar.'; }
  }
  return out;
}

/** Simpan PPTX ke Drive tim proyek dan catat di Document Control (kategori PRESENTASI, ref bulan). file: { name, base64 } */
function archiveMgmtReport(token, projectId, monthKey, file) {
  const ctx = mrCtx_(token, projectId, monthKey);
  const bytes = Utilities.base64Decode(String((file && file.base64) || ''));
  if (!bytes.length) throw new Error('File presentasi kosong.');
  if (bytes.length > MR.PPT_MAX) throw new Error('File presentasi lebih dari ' + Math.round(MR.PPT_MAX / 1048576) + ' MB.');
  const folder = mrFolder_(ctx, ctx.key);
  const name = String(file.name || ('Laporan ' + ctx.p.name + ' ' + ctx.m.label + '.pptx')).replace(/[\\/:*?"<>|]+/g, '-').slice(0, 150);
  const f = folder.createFile(Utilities.newBlob(bytes, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', name));
  const by = ctx.user.username || ctx.user.name || '', now = new Date();
  const lock = pmoLock_('RPT'); lock.waitLock(30000);
  try {
    mrEnsureHeader_();
    const row = mrRowOf_(ctx.p.id, ctx.key);
    if (row) row.sh.getRange(row.r, 5, 1, 3).setValues([[f.getId(), f.getUrl(), f.getName()]]), row.sh.getRange(row.r, 10, 1, 2).setValues([[by, now]]);
    else engAppend_(MR.SHEET, [[ctx.p.id + '|' + ctx.key, ctx.p.id, ctx.key, '{}', f.getId(), f.getUrl(), f.getName(), by, now, by, now]], false);
    // register Document Control: satu baris per bulan, diperbarui bila diarsipkan ulang
    if (typeof docCat_ === 'function' && docCat_('LAPORAN')) {
      docEnsureHeader_();
      const prev = docRegsOf_(ctx.p.id).find(function(r) { return r.ref === ctx.key && (r.kat === 'PRESENTASI' || (r.kat === 'LAPORAN' && reportLinkPpt_(r,{}))); });
      const judul = 'Presentasi manajemen ' + ctx.p.name + ' · ' + ctx.m.label;
      const line = [prev ? prev.id : 'D' + Utilities.getUuid().slice(0, 8).toUpperCase(), ctx.p.id, 'PRESENTASI', '', ctx.key, '', judul, isoDate_(now), '', '', '', '', 'FINAL',
        prev ? String((Number(prev.revisi) || 0) + 1) : '', 'UNGGAH', f.getUrl(), f.getId(), f.getName(), bytes.length, 'Dibuat dari Modul 5 · Pelaporan Manajemen',
        prev ? prev.byU : by, prev ? prev.atRaw : now, by, now, true, ''];
      if (prev) docUpdateRow_(prev.id, line); else engAppend_(DOC.SHEETS.REG, [line], false);
    }
  } finally { lock.releaseLock(); }
  return { success: true, url: f.getUrl(), name: f.getName(), at: formatDateId_(now), by: userDisplayName_(by) };
}

// ===================== DATA OTOMATIS =====================

function mrBuild_(db, p, m) {
  const info = weeklyInfo_(db, p), start = info.startDate;
  if (!start) throw new Error('Tanggal efektif mulai proyek ' + p.name + ' belum diisi.');
  const W = db.weekly, end = monthEnd_(m), tz = Session.getScriptTimeZone();
  const CL = mrCutLinks_(db, p), wMonth = mrCutWeek_(db, p, m, CL);
  const w = Math.max(1, Math.min(info.latestWeek || 1, wMonth));
  const pctW = function(item, wk) { return weekPercent_(W, p.id, item, wk); };
  const wEndIso = function(wk) { return isoDate_(new Date(start.getFullYear(), start.getMonth(), start.getDate() + Math.ceil(wk) * 7 - 1)); };
  const wStartIso = function(wk) { return isoDate_(new Date(start.getFullYear(), start.getMonth(), start.getDate() + (Math.max(1, Math.floor(wk)) - 1) * 7)); };
  const out = { week: w, weekOfMonth: wMonth, latestWeek: info.latestWeek, startIso: isoDate_(start), monthEndIso: isoDate_(end), period: monthKey_(m), periodLabel: m.label };

  // ---- profil
  const L = (function() { try { return projectLifecycle_(db, p); } catch (e) { return {}; } })();
  const finish = L.finishPlan || monthlyDate_(db, p.id, 'EFEKTIF_DATE_FINISH');
  const durDays = Number(monthlyValue_(db, p.id, 'TOTAL_DURASI')) || (finish ? Math.round((finish - start) / 864e5) : 0);
  const durMonths = durDays ? Math.round(durDays / 30) : null;
  const inv = monthlyValue_(db, p.id, 'NILAI_INVESTASI_FS');
  const mNo = Math.max(1, (m.year * 12 + m.month) - (start.getFullYear() * 12 + start.getMonth()) + (start.getDate() <= 15 ? 1 : 0));
  out.profile = {
    title: String(p.fullName || p.name),
    tujuan: monthlyText_(db, p.id, 'TUJUAN'),
    kapasitas: monthlyText_(db, p.id, 'KAPASITAS'),
    investasi: inv === null ? '' : mrRp_(inv),
    kontraktor: monthlyText_(db, p.id, 'KONTRAKTOR'),
    effective: mrDateLong_(start),
    kontrak: (durMonths ? durMonths + ' Bulan' : '') + (finish ? (durMonths ? ' ' : '') + '(COD: ' + MR.MON[finish.getMonth()] + ' ' + finish.getFullYear() + ')' : '')
  };
  out.monthNo = mNo; out.monthTotal = durMonths;

  // ---- progres per bidang pada akhir bulan
  const prog = monthlyProgress_(db, p, m), fin = financialRow_(db, p, m, 1, 1);
  const bobot = function(F) { let v = pctW('BOBOT_' + F, Math.max(1, info.latestWeek)); if (v === null && typeof lastPercentBefore_ === 'function') v = lastPercentBefore_(W, p.id, 'BOBOT_' + F, 9999); return v; };
  out.fields = MR.FIELDS.map(function(f) {
    const F = f[1].toUpperCase();
    const plan = pctW(F + '_KOMULATIF_PLAN', w), act = pctW(F + '_KOMULATIF_REALISASI', w);
    return { k: f[0], name: f[1], short: f[2], weight: bobot(F), plan: mrN_(plan, 2), actual: mrN_(act, 2), dev: plan === null || act === null ? null : mrN_(act - plan, 2) };
  });
  const oPlan = prog.plan !== null ? prog.plan * 100 : pctW('KOMULATIF_PLAN', w), oAct = prog.actual !== null ? prog.actual * 100 : pctW('KOMULATIF_REALISASI', w);
  out.overall = { plan: mrN_(oPlan, 2), actual: mrN_(oAct, 2), dev: oPlan === null || oAct === null ? null : mrN_(oAct - oPlan, 3) };
  out.spi = prog.actual !== null && prog.plan ? mrN_(prog.actual / prog.plan, 2) : null;
  const cpi = estimateCpi_(db, p, m, execProgress_(db, p, m), fin);
  out.cpi = cpi.value;
  out.cpiReason = cpi.reason;

  // ---- timeline per fase (rencana vs aktual/forecast)
  const maxW = Math.max(info.planEndWeek || 0, info.maxWeek || 0, 1);
  out.timeline = MR.FIELDS.map(function(f) {
    const F = f[1].toUpperCase(), plan = [], act = [];
    let ps = 0, pf = 0, as = 0, af = 0;
    for (let k = 1; k <= maxW; k++) {
      const v = pctW(F + '_KOMULATIF_PLAN', k); plan[k - 1] = v === null ? (k > 1 ? plan[k - 2] : 0) : v;
      if (!ps && plan[k - 1] > 0.0001) ps = k; if (!pf && plan[k - 1] >= 99.95) pf = k;
      if (k <= w) { const a = pctW(F + '_KOMULATIF_REALISASI', k); if (a !== null) { act.push({ week: k, val: a }); if (!as && a > 0.0001) as = k; if (!af && a >= 99.95) af = k; } }
    }
    if (!ps) return { k: f[0], name: f[1], none: true };
    if (!pf) pf = maxW;
    const row = { k: f[0], name: f[1], plan: [wStartIso(ps), wEndIso(pf)], planEnd: wEndIso(pf) };
    if (as) {
      if (af) { row.actual = [wStartIso(as), wEndIso(af)]; row.done = true; row.finish = wEndIso(af); }
      else {
        row.actual = [wStartIso(as), isoDate_(end) < wEndIso(w) ? isoDate_(end) : wEndIso(w)];
        let fc = null; try { fc = aiForecast_(plan, act, start); } catch (e) { fc = null; }
        const fw = fc && fc.mid ? Math.max(fc.mid, w + 1) : pf;
        row.forecast = [row.actual[1], wEndIso(Math.max(fw, w + 1))]; row.finish = row.forecast[1];
      }
    } else { row.finish = wEndIso(pf); row.notStarted = true; }
    return row;
  });

  // ---- highlight & concern minggu terakhir bulan ini
  const txt = function(item) { return weekText_(W, p.id, item, w); };
  out.highlight = txt('HIGHLIGHT_ACTIVITY') || txt('HIGHLIGHT');
  out.videos = mrVideos_(db, p, m);
  // kurva S mingguan (rencana penuh, realisasi s.d. minggu laporan, forecast linear ke perkiraan selesai)
  (function() {
    const plan = [], act = [], labels = [], fcs = [], acts = [];
    let last = 0;
    for (let k = 1; k <= maxW; k++) {
      const v = pctW('KOMULATIF_PLAN', k); last = v === null ? last : v; plan.push(mrN_(k === (info.planEndWeek || maxW) ? 100 : last, 2));
      const a = k <= w ? pctW('KOMULATIF_REALISASI', k) : null; act.push(a === null ? null : mrN_(a, 2)); if (a !== null) acts.push({ week: k, val: a });
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + (k - 1) * 7), pd = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7);
      labels.push(k === 1 || d.getMonth() !== pd.getMonth() ? MR.MONS[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2) : '');
    }
    let fc = null; try { fc = aiForecast_(plan, acts, start); } catch (e) { fc = null; }
    const lastA = acts.length ? acts[acts.length - 1] : null, fw = fc && fc.mid ? Math.max(fc.mid, w + 1) : null;
    for (let k = 1; k <= maxW; k++) fcs.push(null);
    if (lastA && fw && lastA.val < 99.95) {
      for (let k = lastA.week; k <= Math.min(fw, maxW + 26); k++) { while (fcs.length < k) { fcs.push(null); plan.push(100); act.push(null); const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + (fcs.length - 1) * 7), pd = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7); labels.push(d.getMonth() !== pd.getMonth() ? MR.MONS[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2) : ''); }
        fcs[k - 1] = mrN_(lastA.val + (100 - lastA.val) * (k - lastA.week) / Math.max(1, fw - lastA.week), 2); }
    }
    out.scurve = { labels: labels, plan: plan, actual: act, forecast: fcs, week: w, planEnd: info.planEndWeek || maxW, fcWeek: fw, fcIso: fw ? wEndIso(fw) : '', planEndIso: wEndIso(info.planEndWeek || maxW) };
  })();
  out.concerns = MR.FIELDS.map(function(f) { const F = f[1].toUpperCase(); return { k: f[0], concern: txt(F + '_CONCERN'), mitigation: txt(F + '_MITIGASI') }; });

  // ---- keuangan (juta Rupiah)
  out.finance = mrFinance_(db, p, m);

  // ---- EPCC: analisis, look ahead, critical
  let es = null, ns = null, R = null;
  try { es = epcStore_(); } catch (e) { es = null; }
  try { ns = engStore_(); } catch (e) { ns = null; }
  try { R = epcRtlView_(db, p, es || undefined); } catch (e) { R = { active: false, groups: [], actions: [] }; }
  const ctx = { db: db, p: p, m: m, w: w, start: start, es: es, ns: ns, R: R, wEndIso: wEndIso, wStartIso: wStartIso, out: out };
  out.analysis = mrAnalysis_(ctx);
  out.lookahead = mrLookAhead_(ctx);
  out.critical = mrCritical_(ctx);
  out.epcWeek = {}; MR.FIELDS.forEach(function(f) { if (f[0] === 'ENG') { if (ns) out.epcWeek.ENG = ns.stateWeek[p.id] || null; } else if (es) out.epcWeek[f[0]] = es.realWeek[p.id + '|' + f[0]] || null; });
  out.generatedAt = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm');
  return out;
}

/** Week cut-off laporan bulan m: dari tautan PLAN/AKTUAL_MONTHLY_PROGRESS ke DATA MINGGUAN (milestone bulanan);
 *  bila tidak ada, dari tanggal cut-off (tgl 25), terakhir akhir bulan. L = cache monthWeekLinks_. */
function mrCutWeek_(db, p, m, L) {
  const info = weeklyInfo_(db, p), start = info.startDate; if (!start) return 0;
  const k = monthKey_(m);
  if (L && L[k]) return L[k];
  try { if (typeof cutoffWeek_ === 'function') { const w = cutoffWeek_(start, m, info.maxWeek || 9999); if (w) return w; } } catch (e) {}
  return weekForDate_(start, monthEnd_(m));
}
function mrCutLinks_(db, p) { try { return monthWeekLinks_(db, p) || {}; } catch (e) { return {}; } }

/** Video mingguan (LINK_VIDEO) pada minggu-minggu yang jatuh di bulan laporan. */
function mrVideos_(db, p, m) {
  const info = weeklyInfo_(db, p), start = info.startDate; if (!start) return [];
  const CL = mrCutLinks_(db, p), i0 = db.monthly.months.indexOf(m), pm = i0 > 0 ? db.monthly.months[i0 - 1] : null;
  const w0 = Math.max(1, pm ? mrCutWeek_(db, p, pm, CL) + 1 : weekForDate_(start, new Date(m.year, m.month, 1))), w1 = Math.min(info.latestWeek || 0, mrCutWeek_(db, p, m, CL));
  const out = [];
  for (let k = w0; k <= w1; k++) {
    const url = weekLink_(db.weekly, p.id, 'LINK_VIDEO', k); if (!url) continue;
    const id = (String(url).match(/\/d\/([\w-]{20,})/) || String(url).match(/[?&]id=([\w-]{20,})/) || [])[1] || '';
    const a = new Date(start.getFullYear(), start.getMonth(), start.getDate() + (k - 1) * 7), b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6);
    out.push({ week: k, url: url, fileId: id, range: a.getDate() + ' ' + MR.MONS[a.getMonth()] + ' – ' + b.getDate() + ' ' + MR.MONS[b.getMonth()] + ' ' + b.getFullYear() });
  }
  return out;
}

/** Keuangan bulan laporan; bila realisasi biaya bulan itu belum diisi, pakai bulan terakhir yang sudah ada laporannya. */
function mrFinance_(db, p, m) {
  const M = db.monthly, items = ['TOTAL_INVESTASI_AKTUAL', 'PLANT_COST_ACTUAL', 'IDC_ACTUAL', 'PM_COST_AKTUAL'];
  const has = function(mm) { return items.some(function(it) { const v = cellNumber_(M, p.id, it, mm.col); return v !== null && v !== 0; }); };
  const i0 = M.months.indexOf(m);
  let mf = m;
  if (!has(m)) for (let i = i0 - 1; i >= 0 && i >= i0 - 12; i--) if (has(M.months[i])) { mf = M.months[i]; break; }
  const out = mrFinanceAt_(db, p, mf);
  out.reportLabel = m.label;
  out.basis = mf !== m ? { key: monthKey_(mf), label: mf.label } : null;
  out.noData = !has(mf);
  return out;
}
function mrFinanceAt_(db, p, m) {
  const J = function(v) { return v === null || v === undefined ? null : v / 1e6; };
  const M = db.monthly;
  const sumMonths = function(item, pred) { let t = null; M.months.forEach(function(mm) { if (!pred(mm)) return; const v = cellNumber_(M, p.id, item, mm.col); if (v !== null) t = (t || 0) + v; }); return t; };
  const hist = function(item) {
    let t = null;
    M.yearTotals.forEach(function(yt) { if (yt.year >= m.year) return; const v = cellNumber_(M, p.id, item, yt.col); if (v !== null) t = (t || 0) + v; });
    M.months.forEach(function(mm) { if (mm.year < m.year && !M.yearTotals.some(function(yt) { return yt.year === mm.year; })) { const v = cellNumber_(M, p.id, item, mm.col); if (v !== null) t = (t || 0) + v; } });
    return t;
  };
  const items = [['PLANT_COST_ACTUAL', 'BA Proyek'], ['IDC_ACTUAL', 'Bunga KI (IDC)'], ['PM_COST_AKTUAL', 'PM Cost']];
  const rows = items.map(function(it) {
    const h = hist(it[0]), mo = cellNumber_(M, p.id, it[0], m.col), ytd = sumMonths(it[0], function(mm) { return mm.year === m.year && mm.month <= m.month; });
    return { item: it[1], hist: J(h), month: J(mo), ytd: J(ytd), pos: h === null && ytd === null ? null : J((h || 0) + (ytd || 0)) };
  });
  const any = rows.some(function(r) { return r.hist !== null || r.month !== null || r.ytd !== null; });
  let total;
  if (any) {
    const s = function(k) { let t = null; rows.forEach(function(r) { if (r[k] !== null) t = (t || 0) + r[k]; }); return t; };
    total = { item: 'TOTAL', hist: s('hist'), month: s('month'), ytd: s('ytd'), pos: s('pos') };
  } else {
    const f = financialRow_(db, p, m, 1, 1);
    total = { item: 'TOTAL', hist: f.historical, month: f.monthActual, ytd: f.actualToDate, pos: f.totalToDate };
  }
  const fr = financialRow_(db, p, m, 1, 1);
  const start = monthlyDate_(db, p.id, 'EFEKTIF_DATE_START'), sy = start ? start.getFullYear() : m.year - 1;
  const histLabel = sy >= m.year ? 'Real ' + (m.year - 1) : sy === m.year - 1 ? 'Real ' + (m.year - 1) : 'Real ' + sy + '–' + (m.year - 1);
  return { rows: rows, total: total, rkap: fr.rkap2026, investment: fr.investment, year: m.year, monthLabel: MR.MONS[m.month], monthName: MR.MON[m.month], histLabel: histLabel,
    pctRkap: fr.rkap2026 && total.ytd !== null ? total.ytd / fr.rkap2026 : null, pctInv: fr.investment && total.pos !== null ? total.pos / fr.investment : null };
}

/** Item EPCC (PROC/CONS/COM) aktif: { F, items, state, S } */
function mrEpc_(ctx, F) {
  const st = ctx.es; if (!st) return null;
  const key = ctx.p.id + '|' + F, set = st.setting[key]; if (!set) return null;
  const items = st.items[key + '|' + set.rev] || []; if (!items.length) return null;
  return { F: F, items: items, state: st.real[key] || {}, S: st.realWeek[key] || 0, rev: set.rev };
}
function mrSpan_(plan) { let ps = 0, pf = 0; for (let k = 0; k < (plan || []).length; k++) { if (!ps && plan[k] > 0) ps = k + 1; if (!pf && plan[k] >= 99.99) pf = k + 1; } if (!ps) ps = 1; if (!pf) pf = Math.max(ps, (plan || []).length || 1); return [ps, pf]; }
/** "W3 September 2026" dari ISO tanggal. */
function mrWeekLabel_(iso, short) {
  const d = parseIsoDate_(iso); if (!d) return '';
  return 'W' + Math.min(4, Math.ceil(d.getDate() / 7)) + ' ' + (short ? MR.MONS[d.getMonth()] : MR.MON[d.getMonth()] + ' ' + d.getFullYear());
}
/** Rollup grup Construction/Commissioning (bobot item). */
function mrGroups_(E, S) {
  const g = {}, order = [];
  E.items.forEach(function(it) {
    const k = it.gc || it.g || it.c || it.id;
    if (!g[k]) { g[k] = { code: it.gc || '', name: it.g || it.n, w: 0, pl: 0, ac: 0, ps: 9999, pf: 0, items: [] }; order.push(k); }
    const x = g[k], s = E.state[it.id] || {}, sp = mrSpan_(it.plan);
    x.w += it.w; x.pl += it.w * epcPlanAt_(it.plan, S); x.ac += it.w * (Number(s.pg) || 0); x.ps = Math.min(x.ps, sp[0]); x.pf = Math.max(x.pf, sp[1]); x.items.push(it);
  });
  return order.map(function(k) { const x = g[k]; x.key = k; x.plan = x.w ? x.pl / x.w : 0; x.act = x.w ? x.ac / x.w : 0; return x; });
}
/** "PEKERJAAN POMPA, TANGKI & MLA" → "Pekerjaan Pompa, Tangki & MLA"; awalan tidak diulang. */
function mrName_(prefix, name) {
  let n = String(name || '').trim();
  if (n && n === n.toUpperCase() && /[A-Z]{4}/.test(n)) n = n.toLowerCase().replace(/(^|[\s(\/-])([a-z])/g, function(m, a, b) { return a + b.toUpperCase(); })
    .replace(/\b([A-Za-z]{2,3})\b/g, function(w) { return /^(dan|di|ke|ss|sa|mla|pju|tk|lv|mv|hdpe|pipa)$/i.test(w) ? (/^(dan|di|ke|pipa)$/i.test(w) ? w.toLowerCase() : w.toUpperCase()) : w; });
  if (!prefix || new RegExp('^' + prefix.split(' ')[0], 'i').test(n) || /^(pengadaan|pekerjaan|penyelesaian|fabrikasi|instalasi|area)\b/i.test(n)) return n.charAt(0).toUpperCase() + n.slice(1);
  return prefix + ' ' + n;
}
function mrStatus_(act, plan) {
  const d = act - plan, a = mrFmt_(act), p = mrFmt_(plan);
  if (act >= 99.95) return 'Selesai 100%';
  if (d <= -1) return 'Delay from schedule, realisasi ' + a + '% dari rencana ' + p + '%';
  if (d >= 1) return 'Ahead of schedule, realisasi ' + a + '% (rencana ' + p + '%)';
  return 'On schedule, realisasi ' + a + '%' + (Math.abs(d) >= 0.05 ? ' (rencana ' + p + '%)' : '');
}
function mrActs_(ctx, key) { return ((ctx.R && ctx.R.actions) || []).filter(function(a) { return a.key === key && a.st !== 'SELESAI'; }).map(function(a) { return a.aksi + (a.pic ? ' (PIC ' + a.pic + (a.target ? ', target ' + mrDateShort_(a.target) : '') + ')' : ''); }); }

function mrAnalysis_(ctx) {
  const out = [], o = ctx.out;
  const fieldOf = function(k) { return o.fields.find(function(f) { return f.k === k; }) || {}; };
  const conOf = function(k) { return o.concerns.find(function(c) { return c.k === k; }) || {}; };
  MR.FIELDS.forEach(function(f) {
    const k = f[0], fld = fieldOf(k), con = conOf(k), tl = o.timeline.find(function(t) { return t.k === k; }) || {};
    const rows = [];
    if (fld.actual !== null && fld.actual >= 99.95) rows.push({ item: 'Sudah selesai', cause: '', mitigation: '', reco: '' });
    else if (k === 'ENG') {
      if (fld.plan > 0 || fld.actual > 0) rows.push({ item: 'Penyelesaian dokumen engineering', cause: mrStatus_(fld.actual || 0, fld.plan || 0), mitigation: con.mitigation || '', reco: tl.finish ? 'Target selesai ' + mrWeekLabel_(tl.finish) : '' });
    } else {
      const E = mrEpc_(ctx, k);
      if (E) {
        const S = E.S || ctx.w;
        if (k === 'PROC') {
          const cand = E.items.map(function(it) { const s = E.state[it.id] || {}, pg = Number(s.pg) || 0, pl = epcPlanAt_(it.plan, S), sp = mrSpan_(it.plan); return { it: it, pg: pg, pl: pl, sp: sp }; })
            .filter(function(x) { return x.pg < 99.95 && (x.pl > 0 || x.pg > 0 || x.sp[0] <= S + 8); })
            .sort(function(a, b) { const la = a.pg - a.pl <= -1 ? 1 : 0, lb = b.pg - b.pl <= -1 ? 1 : 0; return lb - la || b.it.w - a.it.w; }).slice(0, 3);
          cand.forEach(function(x) {
            const acts = mrActs_(ctx, 'PROC|' + x.it.id), mos = x.it.jd && x.it.jd.mos ? x.it.jd.mos : ctx.wEndIso(x.sp[1]);
            rows.push({ item: mrName_('Pengadaan', x.it.n), cause: mrStatus_(x.pg, x.pl), mitigation: acts.length ? acts.join('; ') : 'Memonitor proses produksi dan pengiriman material ke site.', reco: 'Target MOS ' + mrWeekLabel_(mos) });
          });
        } else {
          const G = mrGroups_(E, S).filter(function(g) { return g.act < 99.95 && (g.plan > 0 || g.act > 0 || g.ps <= S + 4); })
            .sort(function(a, b) { const la = a.act - a.plan <= -1 ? 1 : 0, lb = b.act - b.plan <= -1 ? 1 : 0; return lb - la || b.w - a.w; }).slice(0, 3);
          G.forEach(function(g) {
            const acts = mrActs_(ctx, 'CONS|' + g.code);
            rows.push({ item: k === 'COM' ? mrName_('', g.name) : mrName_('Penyelesaian', mrName_('pekerjaan', g.name)), cause: mrStatus_(g.act, g.plan), mitigation: acts.length ? acts.join('; ') : 'Pengawasan intensif terhadap penyelesaian pekerjaan.', reco: 'Target selesai ' + mrWeekLabel_(ctx.wEndIso(g.pf)) });
          });
        }
        if (rows.length && con.mitigation && !rows.some(function(r) { return r.mitigation.indexOf(con.mitigation) >= 0; })) rows[0].mitigation = /^(Memonitor|Pengawasan intensif)/.test(rows[0].mitigation) ? con.mitigation : con.mitigation + '\n' + rows[0].mitigation;
      } else if (fld.plan > 0 || fld.actual > 0) {
        rows.push({ item: 'Pekerjaan ' + f[1].toLowerCase(), cause: mrStatus_(fld.actual || 0, fld.plan || 0), mitigation: con.mitigation || '', reco: tl.finish ? 'Target selesai ' + mrWeekLabel_(tl.finish) : '' });
      }
    }
    if (!rows.length && k === 'COM') return;
    if (!rows.length) rows.push({ item: 'Belum dimulai', cause: tl.plan ? 'Rencana mulai ' + mrWeekLabel_(tl.plan[0]) : '', mitigation: '', reco: '' });
    out.push({ k: k, name: f[1].toUpperCase(), rows: rows });
  });
  return out;
}

function mrLookAhead_(ctx) {
  const months = [0, 1, 2].map(function(n) { const a = new Date(ctx.m.year, ctx.m.month + n, 1), b = new Date(a.getFullYear(), a.getMonth() + 1, 0), c = new Date(a.getFullYear(), a.getMonth(), 0); return { label: MR.MON[a.getMonth()] + ' ' + a.getFullYear(), short: MR.MONS[a.getMonth()], no: ctx.out.monthNo + n, first: isoDate_(a), endIso: isoDate_(b), beforeIso: isoDate_(c), end: b, before: c }; });
  const wkOf = function(d) { return weekForDate_(ctx.start, d); };
  const fields = MR.FIELDS.map(function(f) {
    const k = f[0], fld = ctx.out.fields.find(function(x) { return x.k === k; }) || {}, tl = ctx.out.timeline.find(function(t) { return t.k === k; }) || {};
    const res = { k: k, name: f[1], done: fld.actual !== null && fld.actual >= 99.95, note: '', months: [[], [], []] };
    if (res.done) { res.note = 'Fase ' + f[1] + ' selesai' + (tl.finish ? ' di ' + MR.MON[parseIsoDate_(tl.finish).getMonth()] + ' ' + parseIsoDate_(tl.finish).getFullYear() : ''); return res; }
    try {
      if (k === 'ENG') {
        const ns = ctx.ns, set = ns && ns.setting[ctx.p.id]; if (!set || set.rev === null) { res.note = 'Baseline Engineering belum tersedia'; return res; }
        const docs = engBaselineOf_(ns, ctx.p.id, set.rev), P = engParamsOf_(ns, ctx.p.id, set.rev), state = engStateOf_(ns, ctx.p.id) || {};
        const wk = ns.stateWeek[ctx.p.id], cut = wk ? engCutoff_(isoDate_(ctx.start), wk) : '', comp = cut ? engCompute_(docs, P, state, cut) : null, by = {};
        if (comp) comp.rows.forEach(function(r) { by[r.no] = r; });
        res.months = months.map(function(mm) {
          return docs.map(function(d) { const r = by[d.no], a = r ? r.prog : 0, pb = engDocPlan_(d, P, mm.beforeIso), pe = engDocPlan_(d, P, mm.endIso); return { d: d, a: a, delta: Math.max(0, pe - pb), pe: pe }; })
            .filter(function(x) { return x.a < 99.95 && x.delta > 0.001; }).sort(function(a, b) { return b.d.w * b.delta - a.d.w * a.delta; }).slice(0, 4)
            .map(function(x) { return { act: x.d.name, target: x.pe >= 99.95 ? 'IFC ' + mm.short : 'Target ' + mrFmt_(x.pe, 0) + '%' }; });
        });
      } else {
        const E = mrEpc_(ctx, k); if (!E) { res.note = 'Baseline ' + f[1] + ' belum tersedia'; return res; }
        const S = E.S || ctx.w, useG = k !== 'PROC';
        res.months = months.map(function(mm) {
          const wb = wkOf(mm.before), we = wkOf(mm.end), wf = wkOf(parseIsoDate_(mm.first));
          let c;
          if (useG) c = mrGroups_(E, S).map(function(g) { const pe = g.w ? g.items.reduce(function(s, it) { return s + it.w * epcPlanAt_(it.plan, we); }, 0) / g.w : 0, pb = g.w ? g.items.reduce(function(s, it) { return s + it.w * epcPlanAt_(it.plan, wb); }, 0) / g.w : 0; return { name: mrName_('', g.name), a: g.act, pb: pb, pe: pe, w: g.w, ps: g.ps, pf: g.pf }; });
          else c = E.items.map(function(it) { const s = E.state[it.id] || {}, sp = mrSpan_(it.plan); return { name: mrName_('', it.n), a: Number(s.pg) || 0, pb: epcPlanAt_(it.plan, wb), pe: epcPlanAt_(it.plan, we), w: it.w, ps: sp[0], pf: sp[1], mos: it.jd && it.jd.mos ? it.jd.mos : '' }; });
          return c.filter(function(x) { return x.a < 99.95 && x.pe - x.pb > 0.001; }).sort(function(a, b) { return b.w * (b.pe - b.pb) - a.w * (a.pe - a.pb); }).slice(0, 4).map(function(x) {
            let t;
            if (x.pf >= wf && x.pf <= we) t = (k === 'PROC' ? 'MOS ' : 'Finish ') + mrWeekLabel_(k === 'PROC' && x.mos && x.mos.slice(0, 7) === mm.first.slice(0, 7) ? x.mos : ctx.wEndIso(x.pf), true);
            else if (x.pb <= 0.001 && x.ps >= wf) t = 'Start ' + mrWeekLabel_(ctx.wStartIso(x.ps), true);
            else t = 'Progress ' + mrFmt_(x.pe, 0) + '%';
            return { act: x.name, target: t };
          });
        });
      }
      if (!res.months.some(function(x) { return x.length; })) res.note = 'Tidak ada kenaikan rencana pada tiga bulan ini';
    } catch (e) { res.note = 'Data baseline/realisasi belum lengkap'; res.months = [[], [], []]; }
    return res;
  });
  return { months: months.map(function(mm) { return { label: mm.label, no: mm.no }; }), fields: fields };
}

function mrCritical_(ctx) {
  const R = ctx.R || {}, rows = [];
  const label = function(w) { return mrWeekLabel_(ctx.wEndIso(w)); };
  if (R.active) {
    (R.groups || []).filter(function(g) { return g.cat === 'K' || g.cat === 'N'; }).slice(0, 4).forEach(function(g) {
      const it = (g.items || [])[0] || {}, acts = mrActs_(ctx, g.key);
      const cons = g.f === 'PROC'
        ? (g.risk ? 'Perkiraan tiba ' + (g.mos ? label(g.mos) : '-') + ' melewati kebutuhan ' + label(g.need) + (g.cons ? ' untuk ' + g.cons : '') : 'Float tipis; realisasi ' + mrFmt_(it.ac) + '% dari rencana ' + mrFmt_(it.pl) + '%')
        : (g.cat === 'K' ? 'Berada di lintasan kritis' : 'Float tipis (' + mrFmt_(g.tf, 1) + ' minggu)') + '; ' + g.n + ' item tertinggal, realisasi ' + mrFmt_(it.ac) + '% dari rencana ' + mrFmt_(it.pl) + '%';
      const con = (ctx.out.concerns || []).find(function(c) { return c.k === g.f; }) || {};
      rows.push({ item: mrName_(g.f === 'PROC' ? 'Pengadaan' : 'Pekerjaan', g.name), cons: cons, mitigation: acts.length ? acts.join('; ') : String(con.mitigation || '').slice(0, 400),
        residual: R.slip > 0.05 ? 'Perkiraan selesai proyek mundur ' + mrFmt_(R.slip, 1) + ' minggu (' + label(R.finish) + ')' : 'On schedule, finish ' + label(R.end) });
    });
  }
  if (!rows.length) {
    // tanpa CPM: ambil pekerjaan terlambat dari analisis
    (ctx.out.analysis || []).forEach(function(a) { a.rows.forEach(function(r) { if (rows.length < 4 && /^Delay/.test(r.cause)) rows.push({ item: r.item, cons: r.cause, mitigation: r.mitigation, residual: r.reco }); }); });
  }
  return { cpm: !!R.active, slip: R.active ? R.slip : null, rows: rows };
}

// ===================== UTIL =====================

function mrCtx_(token, projectId, monthKey) {
  const user = requireUser_(token), db = loadDb_(), id = normKey_(projectId);
  const p = db.allProjects.find(function(x) { return x.id === id; }) || findProject_(db.allProjects, projectId);
  if (!p) throw new Error('Proyek tidak ditemukan.');
  if (!userCanOperateProject_(user, p)) throw new Error('Pelaporan manajemen hanya untuk ADMIN dan tim input proyek ' + p.name + '.');
  const key = String(monthKey || '');
  const m = db.monthly.months.find(function(x) { return monthKey_(x) === key; });
  if (!m) throw new Error('Bulan laporan ' + key + ' tidak ditemukan di DATA BULANAN.');
  return { user: user, db: db, p: p, m: m, key: key };
}
function mrEnsureHeader_() {
  const sh = engSheet_(MR.SHEET, true), H = MR.SHEET[1];
  const cur = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(function(x) { return String(x).trim().toUpperCase(); });
  H.forEach(function(h, i) { if (cur[i] !== h && cur.indexOf(h) < 0) sh.getRange(1, i + 1).setValue(h).setFontWeight('bold').setBackground('#0F2B46').setFontColor('#FFFFFF'); });
}
function mrRowOf_(pid, key) {
  const sh = engSheet_(MR.SHEET, false); if (!sh) return null;
  const n = sh.getLastRow(); if (n < 2) return null;
  const ids = sh.getRange(2, 1, n - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === pid + '|' + key) return { sh: sh, r: i + 2 };
  return null;
}
function mrRecordsOf_(pid) {
  let rows = []; try { rows = engRead_(MR.SHEET); } catch (e) { rows = []; }
  const fmt = function(v) { return v instanceof Date && !isNaN(v) ? formatDateId_(v) + ' ' + String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0') : String(v || ''); };
  return rows.filter(function(r) { return String(r.PROYEK_ID || '').trim().toUpperCase() === pid; }).map(function(r) {
    let data = {}; try { data = JSON.parse(String(r.DATA_JSON || '{}')) || {}; } catch (e) { data = {}; }
    const per = r.PERIODE instanceof Date ? Utilities.formatDate(r.PERIODE, Session.getScriptTimeZone(), 'yyyy-MM') : String(r.PERIODE || '');
    return { key: per, data: data, fileUrl: String(r.FILE_URL || ''), fileName: String(r.NAMA_FILE || ''), by: userDisplayName_(r.DIPERBARUI_OLEH), at: fmt(r.DIPERBARUI), archBy: userDisplayName_(r.DIARSIPKAN_OLEH), archAt: fmt(r.DIARSIPKAN) };
  });
}
function mrRecordOf_(pid, key) { const l = mrRecordsOf_(pid).filter(function(r) { return r.key === key; }); return l.length ? l[l.length - 1] : null; }
function mrFolder_(ctx, key) {
  const drive = engDriveOf_(ctx.p.id);
  if (!drive) throw new Error('Folder Google Drive tim proyek belum diatur (EPCC Engineering › Setup baseline › Folder Google Drive).');
  let root; try { root = DriveApp.getFolderById(drive.id); } catch (e) { throw new Error('Folder Google Drive tim proyek tidak bisa dibuka akun web app (' + engScriptAccount_() + ').'); }
  return engSubFolder_(engSubFolder_(engSubFolder_(root, ctx.p.id), 'Laporan Manajemen'), key);
}
/** Bersihkan catatan: hanya kunci yang dikenal, teks dipangkas. */
function mrCleanNotes_(n) {
  const s = function(v, max) { return String(v == null ? '' : v).slice(0, max || 2000); };
  const out = {};
  if (n.profile && typeof n.profile === 'object') { out.profile = {}; ['title', 'tujuan', 'kapasitas', 'investasi', 'kontraktor', 'effective', 'kontrak'].forEach(function(k) { if (n.profile[k] !== undefined) out.profile[k] = s(n.profile[k], 400); }); }
  if (n.highlight !== undefined) out.highlight = s(n.highlight, 3000);
  if (n.financeIntro !== undefined) out.financeIntro = s(n.financeIntro, 600);
  if (n.financeNote !== undefined) out.financeNote = s(n.financeNote, 2000);
  if (Array.isArray(n.analysis)) out.analysis = n.analysis.slice(0, 6).map(function(sec) { return { k: s(sec.k, 8), name: s(sec.name, 40), rows: (sec.rows || []).slice(0, 8).map(function(r) { return { item: s(r.item, 300), cause: s(r.cause, 600), mitigation: s(r.mitigation, 600), reco: s(r.reco, 400) }; }) }; });
  if (Array.isArray(n.critical)) out.critical = n.critical.slice(0, 8).map(function(r) { return { item: s(r.item, 300), cons: s(r.cons, 600), mitigation: s(r.mitigation, 600), residual: s(r.residual, 400) }; });
  if (n.lookahead && typeof n.lookahead === 'object') { out.lookahead = {}; Object.keys(n.lookahead).slice(0, 6).forEach(function(k) { const v = n.lookahead[k]; if (Array.isArray(v)) out.lookahead[s(k, 8)] = v.slice(0, 3).map(function(mo) { return (mo || []).slice(0, 6).map(function(x) { return { act: s(x.act, 200), target: s(x.target, 80) }; }); }); }); }
  if (Array.isArray(n.photos)) out.photos = n.photos.slice(0, 4).map(function(x) { return !x ? null : x.kind === 'video' ? { kind: 'video', week: Number(x.week) || 0, url: s(x.url, 300), cap: s(x.cap, 60) } : { id: s(x.id, 80), url: s(x.url, 300), cap: s(x.cap, 60) }; });
  if (n.scurve && typeof n.scurve === 'object') out.scurve = { mode: ['off', 'panel', 'slide'].indexOf(n.scurve.mode) >= 0 ? n.scurve.mode : 'off', src: n.scurve.src === 'image' ? 'image' : 'auto', img: n.scurve.img && n.scurve.img.id ? { id: s(n.scurve.img.id, 80), url: s(n.scurve.img.url, 300) } : null };
  if (n.slides && typeof n.slides === 'object') { out.slides = {}; Object.keys(n.slides).slice(0, 12).forEach(function(k) { out.slides[s(k, 12)] = !!n.slides[k]; }); }
  return out;
}
function mrN_(v, d) { if (v === null || v === undefined || !isFinite(Number(v))) return null; const f = Math.pow(10, d); return Math.round(Number(v) * f) / f; }
function mrFmt_(v, d) {
  if (v === null || v === undefined || !isFinite(Number(v))) return '-';
  d = d === undefined ? 1 : d;
  const f = Math.pow(10, d), n = Math.round(Number(v) * f) / f, neg = n < 0, a = Math.abs(n);
  let ip = Math.floor(a), fp = Math.round((a - ip) * f);
  if (fp >= f) { ip += 1; fp = 0; }
  let fs = d ? String(fp).padStart(d, '0').replace(/0+$/, '') : '';
  return (neg ? '-' : '') + String(ip).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fs ? ',' + fs : '');
}
function mrRp_(v) { const a = Math.abs(v); if (a >= 1e12) return 'Rp ' + (v / 1e12).toFixed(2).replace('.', ',') + ' Triliun'; if (a >= 1e9) return 'Rp ' + (v / 1e9).toFixed(2).replace('.', ',') + ' Miliar'; if (a >= 1e6) return 'Rp ' + (v / 1e6).toFixed(1).replace('.', ',') + ' Juta'; return 'Rp ' + mrFmt_(v, 0); }
function mrDateLong_(d) { return d ? d.getDate() + ' ' + MR.MON[d.getMonth()] + ' ' + d.getFullYear() : ''; }
function mrDateShort_(iso) { const d = parseIsoDate_(iso); return d ? d.getDate() + ' ' + MR.MONS[d.getMonth()] + ' ' + d.getFullYear() : iso; }


/** Stock Story Lapangan for the report's selected project; read-only. */
function getMgmtGalleryList(token, projectId, monthKey) {
  const ctx=mrCtx_(token,projectId,monthKey),p=mrGalleryProject_(ctx.p.id);
  return {success:true,projectId:ctx.p.id,name:ctx.p.name,months:(p&&p.months||[]).map(function(m){
    return {key:String(m.key),label:String(m.label),photos:(m.photos||[]).map(function(x,i){return {id:String(x.id),cap:String(x.cap||'').slice(0,240),date:String(x.date||'').slice(0,80),source:String(x.src||'Galeri Story Lapangan').slice(0,80),name:String(x.cap||('Foto '+(i+1))).slice(0,120)};})};
  }).filter(function(m){return m.photos.length;})};
}
function getMgmtGalleryImages(token, projectId, monthKey, ids, size) {
  const ctx=mrCtx_(token,projectId,monthKey),p=mrGalleryProject_(ctx.p.id),allowed={};
  (p&&p.months||[]).forEach(function(m){(m.photos||[]).forEach(function(x){allowed[String(x.id)]=true;});});
  size=Number(size)>=1000?1280:480;
  const list=(Array.isArray(ids)?ids:[]).map(function(id){return String(id).trim();}).filter(function(id,i,a){return a.indexOf(id)===i;});
  if(!list.length||list.length>(size===1280?4:12))throw new Error('Jumlah foto galeri tidak valid.');
  if(list.some(function(id){return !allowed[id];}))throw new Error('Foto tidak terdaftar di galeri proyek laporan ini.');
  return getGalleryThumbs(token,list,size);
}
function mrGalleryProject_(projectId) {
  return (galleryIndexCached_().projects||[]).find(function(p){return String(p.id)===String(projectId);})||null;
}

/**
 * MODUL 5 · LAPORAN BULANAN (WORD)
 * - Template per proyek: file Word dari tim proyek (cover, daftar isi, Bab 1). Disimpan di Drive tim proyek › <ID> › Laporan Bulanan › Template.
 * - Bab 2 dst. disusun otomatis dari dashboard (profil, jadwal, milestone, progres, kendala bidang terlambat, termin, kegiatan,
 *   rencana bulan depan, keuangan, kurva S, dokumentasi foto). Bab K3 ditempatkan sebagai bab terakhir (diisi tim HSE).
 * - Dokumen .docx dirakit di browser (JSZip). Isian narasi yang disunting disimpan per proyek per bulan (sheet LB_LAPORAN).
 * - Tidak menulis angka dashboard.
 */
const LB = {
  SHEET: ['LB_LAPORAN', ['ID', 'PROYEK_ID', 'PERIODE', 'DATA_JSON', 'DIPERBARUI_OLEH', 'DIPERBARUI']],
  TPL: ['LB_TEMPLATE', ['PROYEK_ID', 'FILE_ID', 'FILE_URL', 'NAMA_FILE', 'UKURAN', 'DIUNGGAH_OLEH', 'DIUNGGAH']],
  TPL_MAX: 40 * 1024 * 1024,
  JSON_MAX: 48000
};

/** Data laporan bulanan Word untuk satu proyek & bulan. */
function getMonthlyDocData(token, projectId, monthKey) {
  const ctx = mrCtx_(token, projectId, monthKey), db = ctx.db, p = ctx.p, m = ctx.m;
  const auto = mrBuild_(db, p, m);
  const x = lbExtra_(db, p, m, auto);
  const rec = lbRecordOf_(p.id, ctx.key);
  return { success: true, project: { id: p.id, name: p.name, fullName: p.fullName || p.name }, period: ctx.key, periodLabel: m.label,
    auto: auto, extra: x, notes: rec ? rec.data : null, saved: rec ? { by: rec.by, at: rec.at } : null, template: lbTemplateInfo_(p.id),
    user: { name: ctx.user.name || ctx.user.username || '', role: String(ctx.user.role || '').toUpperCase() } };
}

/** Simpan isian narasi (teks bebas per bagian, pilihan foto, keterangan foto). */
function saveMonthlyDocNotes(token, projectId, monthKey, notes) {
  const ctx = mrCtx_(token, projectId, monthKey);
  const json = JSON.stringify(lbClean_(notes || {}));
  if (json.length > LB.JSON_MAX) throw new Error('Isian laporan terlalu panjang (' + json.length + ' karakter). Ringkas teks yang panjang.');
  const lock = pmoLock_('MDOC'); lock.waitLock(30000);
  try {
    lbEnsureHeader_(LB.SHEET);
    const by = ctx.user.username || ctx.user.name || '', now = new Date(), id = ctx.p.id + '|' + ctx.key;
    const sh = engSheet_(LB.SHEET, true), n = sh.getLastRow();
    const ids = n >= 2 ? sh.getRange(2, 1, n - 1, 1).getValues() : [];
    let r = 0; for (let i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === id) { r = i + 2; break; }
    if (r) sh.getRange(r, 4, 1, 3).setValues([[json, by, now]]);
    else engAppend_(LB.SHEET, [[id, ctx.p.id, "'" + ctx.key, json, by, now]], false);
  } finally { lock.releaseLock(); }
  return { success: true, saved: { by: userDisplayName_(ctx.user.username || ctx.user.name), at: formatDateId_(new Date()) } };
}

/** Unggah / ganti template Word proyek. file: { name, base64 } */
function uploadMonthlyDocTemplate(token, projectId, file) {
  const c = lbProjectCtx_(token, projectId);
  const name = String((file && file.name) || 'Template Laporan Bulanan.docx').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 150);
  if (!/\.docx$/i.test(name)) throw new Error('Gunakan file Word .docx.');
  const bytes = Utilities.base64Decode(String((file && file.base64) || ''));
  if (bytes.length < 200) throw new Error('File template kosong.');
  if (bytes.length > LB.TPL_MAX) throw new Error('File template lebih dari ' + Math.round(LB.TPL_MAX / 1048576) + ' MB. Kompres gambar di Word terlebih dahulu.');
  const drive = engDriveOf_(c.p.id);
  if (!drive) throw new Error('Folder Google Drive tim proyek belum diatur (EPCC Engineering › Setup baseline › Folder Google Drive).');
  let root; try { root = DriveApp.getFolderById(drive.id); } catch (e) { throw new Error('Folder Google Drive tim proyek tidak bisa dibuka akun web app (' + engScriptAccount_() + ').'); }
  const folder = engSubFolder_(engSubFolder_(engSubFolder_(root, c.p.id), 'Laporan Bulanan'), 'Template');
  const f = folder.createFile(Utilities.newBlob(bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name));
  const by = c.user.username || c.user.name || '', now = new Date();
  const lock = pmoLock_('MDOC'); lock.waitLock(30000);
  try {
    lbEnsureHeader_(LB.TPL);
    const sh = engSheet_(LB.TPL, true), n = sh.getLastRow();
    const ids = n >= 2 ? sh.getRange(2, 1, n - 1, 1).getValues() : [];
    let r = 0; for (let i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]).trim().toUpperCase() === c.p.id) { r = i + 2; break; }
    const line = [c.p.id, f.getId(), f.getUrl(), f.getName(), bytes.length, by, now];
    if (r) sh.getRange(r, 1, 1, line.length).setValues([line]); else engAppend_(LB.TPL, [line], false);
  } finally { lock.releaseLock(); }
  return { success: true, template: lbTemplateInfo_(c.p.id) };
}

/** Isi file template (base64) untuk dirakit di browser. */
function getMonthlyDocTemplate(token, projectId) {
  const c = lbProjectCtx_(token, projectId), t = lbTemplateRow_(c.p.id);
  if (!t) throw new Error('Template Word proyek ' + c.p.name + ' belum diunggah.');
  let blob; try { blob = DriveApp.getFileById(t.fileId).getBlob(); } catch (e) { throw new Error('File template tidak bisa dibuka akun web app (' + engScriptAccount_() + '). Unggah ulang template.'); }
  return { success: true, name: t.name, base64: Utilities.base64Encode(blob.getBytes()) };
}

// ===================== DATA TAMBAHAN =====================

function lbExtra_(db, p, m, auto) {
  const info = weeklyInfo_(db, p), start = info.startDate, W = db.weekly, CL = mrCutLinks_(db, p);
  const i0 = db.monthly.months.indexOf(m), pm = i0 > 0 ? db.monthly.months[i0 - 1] : null;
  const w = auto.week, wp = pm ? Math.max(0, Math.min(w, mrCutWeek_(db, p, pm, CL))) : 0;
  const pct = function(item, wk) { if (!wk) return 0; const v = weekPercent_(W, p.id, item, wk); return v === null ? null : mrN_(v, 3); };
  const out = { week: w, prevWeek: wp, prevLabel: pm ? pm.label : '' };
  // progres per bidang: s.d. bulan lalu, bulan ini, s.d. bulan ini
  out.fields = auto.fields.map(function(f) {
    const F = f.name.toUpperCase();
    const p0 = pct(F + '_KOMULATIF_PLAN', wp), a0 = pct(F + '_KOMULATIF_REALISASI', wp), p1 = pct(F + '_KOMULATIF_PLAN', w), a1 = pct(F + '_KOMULATIF_REALISASI', w);
    return { k: f.k, name: f.name, weight: f.weight, planPrev: p0, actPrev: a0, plan: p1, actual: a1,
      planMonth: p1 === null || p0 === null ? null : mrN_(p1 - p0, 3), actMonth: a1 === null || a0 === null ? null : mrN_(a1 - a0, 3),
      dev: p1 === null || a1 === null ? null : mrN_(a1 - p1, 3), late: p1 !== null && a1 !== null && a1 - p1 <= -0.005 && a1 < 99.95 };
  });
  const op0 = pct('KOMULATIF_PLAN', wp), oa0 = pct('KOMULATIF_REALISASI', wp);
  out.overall = { planPrev: op0, actPrev: oa0, plan: auto.overall.plan, actual: auto.overall.actual, dev: auto.overall.dev };
  // profil tambahan
  const kontrak = monthlyValue_(db, p.id, 'NILAI_KONTRAK'), inv = monthlyValue_(db, p.id, 'NILAI_INVESTASI_FS');
  const fin = (function() { try { const L = projectLifecycle_(db, p); return L.finishPlan || monthlyDate_(db, p.id, 'EFEKTIF_DATE_FINISH'); } catch (e) { return monthlyDate_(db, p.id, 'EFEKTIF_DATE_FINISH'); } })();
  let adds = []; try { adds = (readAddenda_(db, p.id) || []).map(function(a) { return { no: a.no || a.NO || '', date: a.date || a.tanggal || '', note: a.note || a.keterangan || a.perihal || '' }; }); } catch (e) { adds = []; }
  out.profile = { kontraktor: monthlyText_(db, p.id, 'KONTRAKTOR'), nilaiKontrak: kontrak, nilaiInvestasi: inv, start: start ? isoDate_(start) : '', finish: fin ? isoDate_(fin) : '',
    durasi: Number(monthlyValue_(db, p.id, 'TOTAL_DURASI')) || null, tujuan: monthlyText_(db, p.id, 'TUJUAN'), kapasitas: monthlyText_(db, p.id, 'KAPASITAS'), addenda: adds.length };
  // milestone bulanan
  out.milestones = [];
  try {
    let sk = null; try { sk = projectReportStartKey_(db, p); } catch (e) { sk = null; }
    if (sk === null && start) sk = start.getFullYear() * 12 + start.getMonth();
    const fk = fin ? fin.getFullYear() * 12 + fin.getMonth() + 1 : 99999, mk = m.year * 12 + m.month;
    let no = 0;
    db.monthly.months.forEach(function(mm) {
      const k = mm.year * 12 + mm.month; if (sk === null || k < sk || k > fk) return; no++;
      const t = String(monthText_(db, p.id, 'MILESTONE_FISIK_MONTHLY', mm) || '').trim(); if (!t) return;
      const pr = monthlyProgress_(db, p, mm), pl = pr.plan === null ? null : pr.plan * 100, ac = pr.actual === null ? null : pr.actual * 100;
      let st = 'Rencana';
      if (k <= mk) st = ac === null ? 'Belum ada realisasi' : pl !== null && ac + 0.005 >= pl ? 'Tercapai' : 'Belum tercapai';
      out.milestones.push({ no: no, key: monthKey_(mm), label: mm.label, text: t, plan: mrN_(pl, 2), actual: k <= mk ? mrN_(ac, 2) : null, status: st, current: k === mk });
    });
  } catch (e) { out.milestonesError = String(e.message || e); }
  // termin (Document Control · BA termin pembayaran) + realisasi bayar per bulan (DATA BULANAN)
  out.termin = { rows: [], months: [], kontrak: kontrak };
  try {
    out.termin.rows = docRegsOf_(p.id).filter(function(r) { return r.kat === 'BA_TERMIN'; }).map(function(r) {
      return { termin: r.ref ? Number(r.ref) : null, nomor: r.nomor, judul: r.judul, tanggal: r.tanggal, periode: r.periode || (r.tanggal ? r.tanggal.slice(0, 7) : ''), nilai: r.nilai, status: r.status, catatan: r.catatan, url: r.url };
    }).sort(function(a, b) { return (a.termin || 999) - (b.termin || 999) || String(a.tanggal).localeCompare(String(b.tanggal)); });
  } catch (e) { out.termin.error = String(e.message || e); }
  try {
    const mk = m.year * 12 + m.month;
    db.monthly.months.forEach(function(mm) { const k = mm.year * 12 + mm.month; if (k > mk) return; const v = cellNumber_(db.monthly, p.id, 'PLANT_COST_ACTUAL', mm.col); if (v === null || v <= 0) return; out.termin.months.push({ key: monthKey_(mm), label: mm.label, paid: v }); });
  } catch (e) {}
  // kegiatan per bidang (status terakhir EPCC Control)
  let es = null, ns = null; try { es = epcStore_(); } catch (e) { es = null; } try { ns = engStore_(); } catch (e) { ns = null; }
  out.eng = lbEng_(ns, p, start, w, m);
  out.epc = {};
  ['PROC', 'CONS', 'COM'].forEach(function(F) { try { out.epc[F] = lbEpc_({ es: es, p: p, w: w }, F); } catch (e) { out.epc[F] = null; } });
  return out;
}

/** Jumlah dokumen engineering per disiplin yang sudah terbit tiap tahap s.d. cut-off bulan laporan. */
function lbEng_(ns, p, start, w, m) {
  if (!ns || !start) return null;
  const set = ns.setting[p.id]; if (!set || set.rev === null) return null;
  const docs = engBaselineOf_(ns, p.id, set.rev), state = engStateOf_(ns, p.id) || {};
  const cut = engCutoff_(isoDate_(start), w), m0 = isoDate_(new Date(m.year, m.month, 1)), stg = ['IFR', 'IFA', 'IFC'];
  const by = {}, order = [];
  docs.forEach(function(d) {
    const k = String(d.disc || 'Umum').trim() || 'Umum';
    if (!by[k]) { by[k] = { disc: k, total: 0, IFR: 0, IFA: 0, IFC: 0, month: 0 }; order.push(k); }
    const x = by[k], s = state[d.no]; x.total++;
    if (!s || !s.st) return;
    let inMonth = false;
    stg.forEach(function(n, i) { const t = s.st[i] && s.st[i][0] ? epcIso_(s.st[i][0]) || String(s.st[i][0]).slice(0, 10) : ''; if (t && t <= cut) { x[n]++; if (t >= m0) inMonth = true; } });
    if (inMonth) x.month++;
  });
  return { cut: cut, rows: order.map(function(k) { return by[k]; }) };
}

/** Item PROC / grup CONS-COM dengan realisasi > 0 (status realisasi terakhir). */
function lbEpc_(ctx, F) {
  const E = mrEpc_(ctx, F); if (!E) return null;
  const S = E.S || ctx.w;
  if (F === 'PROC') {
    return { week: E.S, rows: E.items.map(function(it) { const s = E.state[it.id] || {}; return { name: mrName_('', it.n), w: it.w, act: mrN_(Number(s.pg) || 0, 2), plan: mrN_(epcPlanAt_(it.plan, S), 2) }; })
      .filter(function(x) { return x.act > 0 || x.plan > 0; }).sort(function(a, b) { return b.act - a.act || b.w - a.w; }) };
  }
  return { week: E.S, rows: mrGroups_(E, S).map(function(g) { return { name: mrName_('', g.name), w: g.w, act: mrN_(g.act, 2), plan: mrN_(g.plan, 2) }; })
    .filter(function(x) { return x.act > 0 || x.plan > 0; }) };
}

// ===================== UTIL =====================

function lbProjectCtx_(token, projectId) {
  const user = requireUser_(token), db = loadDb_(), id = normKey_(projectId);
  const p = db.allProjects.find(function(x) { return x.id === id; }) || findProject_(db.allProjects, projectId);
  if (!p) throw new Error('Proyek tidak ditemukan.');
  if (!userCanOperateProject_(user, p)) throw new Error('Laporan bulanan hanya untuk ADMIN dan tim input proyek ' + p.name + '.');
  return { user: user, db: db, p: p };
}
function lbEnsureHeader_(def) {
  const sh = engSheet_(def, true), H = def[1];
  const cur = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(function(x) { return String(x).trim().toUpperCase(); });
  H.forEach(function(h, i) { if (cur[i] !== h && cur.indexOf(h) < 0) sh.getRange(1, i + 1).setValue(h).setFontWeight('bold').setBackground('#0F2B46').setFontColor('#FFFFFF'); });
}
function lbTemplateRow_(pid) {
  let rows = []; try { rows = engRead_(LB.TPL); } catch (e) { rows = []; }
  const l = rows.filter(function(r) { return String(r.PROYEK_ID || '').trim().toUpperCase() === pid && r.FILE_ID; });
  if (!l.length) return null;
  const r = l[l.length - 1], at = r.DIUNGGAH;
  return { fileId: String(r.FILE_ID), url: String(r.FILE_URL || ''), name: String(r.NAMA_FILE || ''), size: Number(r.UKURAN) || 0, by: userDisplayName_(r.DIUNGGAH_OLEH),
    at: at instanceof Date && !isNaN(at) ? formatDateId_(at) + ' ' + String(at.getHours()).padStart(2, '0') + ':' + String(at.getMinutes()).padStart(2, '0') : String(at || '') };
}
function lbTemplateInfo_(pid) { const t = lbTemplateRow_(pid); if (!t) return null; delete t.fileId; return t; }
function lbRecordOf_(pid, key) {
  let rows = []; try { rows = engRead_(LB.SHEET); } catch (e) { rows = []; }
  const tz = Session.getScriptTimeZone();
  const l = rows.filter(function(r) { const per = r.PERIODE instanceof Date ? Utilities.formatDate(r.PERIODE, tz, 'yyyy-MM') : String(r.PERIODE || '').replace(/^'/, ''); return String(r.PROYEK_ID || '').trim().toUpperCase() === pid && per === key; });
  if (!l.length) return null;
  const r = l[l.length - 1]; let data = {}; try { data = JSON.parse(String(r.DATA_JSON || '{}')) || {}; } catch (e) { data = {}; }
  const at = r.DIPERBARUI;
  return { data: data, by: userDisplayName_(r.DIPERBARUI_OLEH), at: at instanceof Date && !isNaN(at) ? formatDateId_(at) + ' ' + String(at.getHours()).padStart(2, '0') + ':' + String(at.getMinutes()).padStart(2, '0') : String(at || '') };
}
/** Hanya kunci yang dikenal; teks dipangkas. */
function lbClean_(n) {
  const s = function(v, max) { return String(v == null ? '' : v).slice(0, max || 4000); };
  const out = {};
  ['scope', 'progressNote', 'termNote', 'financeNote', 'k3Note', 'docNo', 'preparedBy', 'approvedBy'].forEach(function(k) { if (n[k] !== undefined) out[k] = s(n[k], 4000); });
  ['done', 'next'].forEach(function(k) { if (n[k] && typeof n[k] === 'object') { out[k] = {}; ['ENG', 'PROC', 'CONS', 'COM'].forEach(function(F) { if (n[k][F] !== undefined) out[k][F] = s(n[k][F], 4000); }); } });
  if (Array.isArray(n.issues)) out.issues = n.issues.slice(0, 20).map(function(r) { return { k: s(r && r.k, 8), item: s(r && r.item, 400), cause: s(r && r.cause, 1200), action: s(r && r.action, 1200) }; });
  if (Array.isArray(n.photos)) out.photos = n.photos.slice(0, 24).map(function(x) { return { id: s(x && x.id, 80), cap: s(x && x.cap, 240) }; }).filter(function(x) { return x.id; });
  if (n.sections && typeof n.sections === 'object') { out.sections = {}; Object.keys(n.sections).slice(0, 20).forEach(function(k) { out.sections[s(k, 12)] = !!n.sections[k]; }); }
  return out;
}

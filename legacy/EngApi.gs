/**
 * EPC CONTROL · ENGINEERING (IFR / IFA / IFC / IFI)
 *
 * Alur:
 *   1. ADMIN mengunduh template baseline (dibuat di browser), mengisi daftar dokumen + rencana, lalu mengunggah.
 *      File dibaca di browser (JSZip) dan dikirim sebagai data; server memeriksa ulang lalu menyimpan sebagai revisi.
 *   2. Setiap minggu ADMIN mengunduh template realisasi (berisi daftar dokumen + isian terakhir), kontraktor mengisi
 *      tanggal terbit, kiriman ke- dan kode status, ADMIN mengunggah. Server menghitung progres dengan rumus yang sama
 *      seperti di Excel dan menyimpan ringkasan mingguan.
 *   3. Mode OTOMATIS: progres Engineering di Input Progres mingguan diisi dari ringkasan ini (terkunci).
 *
 * Sheet (dibuat otomatis):
 *   ENG_PENGATURAN  PROYEK_ID | MODE | REVISI_AKTIF | DIPERBARUI_OLEH | DIPERBARUI
 *   ENG_REVISI      riwayat baseline + parameter (JSON) per revisi
 *   ENG_BASELINE    daftar dokumen per revisi
 *   ENG_REALISASI   isian realisasi TERAKHIR per dokumen (satu blok per proyek)
 *   ENG_PROGRES     ringkasan per minggu (riwayat kurva realisasi)
 * Tanggal disimpan sebagai teks yyyy-mm-dd agar tidak bergeser karena zona waktu.
 */
const ENG = {
  SHEETS: {
    SETTING: ['ENG_PENGATURAN', ['PROYEK_ID', 'MODE', 'REVISI_AKTIF', 'DIPERBARUI_OLEH', 'DIPERBARUI']],
    REVISI: ['ENG_REVISI', ['PROYEK_ID', 'REVISI', 'CATATAN_REVISI', 'JUMLAH_DOKUMEN', 'TOTAL_BOBOT', 'PARAMETER_JSON', 'NAMA_FILE', 'DIUNGGAH_OLEH', 'DIUNGGAH_PADA']],
    BASELINE: ['ENG_BASELINE', ['PROYEK_ID', 'REVISI', 'NO', 'NOMOR_DOKUMEN', 'NAMA_DOKUMEN', 'DISIPLIN', 'JENIS_DOKUMEN', 'PAKET_WBS', 'BOBOT_DOK', 'POLA', 'RENCANA_MULAI', 'RENCANA_IFR', 'RENCANA_IFA', 'RENCANA_IFC', 'RENCANA_IFI', 'CATATAN', 'STATUS']],
    REAL: ['ENG_REALISASI', ['PROYEK_ID', 'WEEK', 'REVISI', 'NOMOR_DOKUMEN', 'MULAI_AKTUAL', 'IFR_TERBIT', 'IFR_KIRIM_KE', 'IFR_KODE', 'IFA_TERBIT', 'IFA_KIRIM_KE', 'IFA_KODE', 'IFC_TERBIT', 'IFC_KIRIM_KE', 'IFC_KODE', 'IFI_TERBIT', 'CATATAN', 'PROGRES_DOK']],
    PROGRES: ['ENG_PROGRES', ['PROYEK_ID', 'WEEK', 'CUT_OFF', 'REVISI', 'RENCANA', 'REALISASI', 'DEVIASI', 'SELESAI', 'MENUNGGU', 'MENUNGGU_LAMA', 'KIRIM_ULANG', 'TERLAMBAT', 'DOKUMEN', 'DIISI_OLEH', 'CATATAN', 'NAMA_FILE', 'DIUNGGAH_OLEH', 'DIUNGGAH_PADA']]
  },
  DISC: ['SIPIL', 'MEKANIKAL', 'PIPING', 'ELEKTRIKAL', 'INSTRUMENTASI', 'PROSES', 'HSE', 'UMUM'],
  TYPES: ['DED / DRAWING', 'CALCULATION REPORT', 'DATA SHEET', 'MATERIAL REQUISITION', 'APPROVAL MATERIAL', 'PROSEDUR KERJA', 'PHDS', 'ITP', 'HSE PLAN', 'SPESIFIKASI TEKNIS', 'LAINNYA'],
  EXAMPLE_NOS: ['C-02-40-2340-26-01', 'G-00-40-2340-90-01'],
  STAGES: ['IFR', 'IFA', 'IFC'],
  STG4: ['IFR', 'IFA', 'IFC', 'IFI'],
  // Nama bawaan pola tahap. Bobot tiap pola diatur per proyek (sheet PARAMETER / Kelola EDL).
  POLA_NAME: { P1: 'Review penuh (IFR → IFA → IFC)', P2: 'Tanpa IFR (IFA → IFC)', P3: 'Tanpa IFA (IFR → IFC)', P4: 'Informasi (IFI saja)', P5: 'Langsung IFC', P6: 'Review + informasi akhir (IFR → IFA → IFC → IFI)' },
  WEIGHT_TOL: 0.5
};

// ===================== HALAMAN =====================

function getEngineeringPageHtml(token) {
  requireUser_(token);
  const t = HtmlService.createTemplateFromFile('Engineering');
  t.initialSessionToken = String(token);
  t.appUrl = ScriptApp.getService().getUrl();
  t.initialProjectName = '';
  return t.evaluate().getContent();
}

// ===================== API =====================

/** Data halaman Engineering untuk satu proyek (default: proyek pertama yang boleh diakses). */
function getEngineeringData(token, projectId) {
  dbReadOnly_(); // C1b: baca DATA MINGGUAN/BULANAN dari cache
  const user = requireUser_(token);
  const db = loadDb_();
  const role = String(user.role || '').toUpperCase();
  const list = db.allProjects.filter(function(p) { return userCanAccess_(user, p); });
  if (!list.length) throw new Error('Akun Anda belum memiliki akses proyek.');
  const store = engStoreC_();
  // hanya proyek yang sudah siap input (setup awal lengkap) yang ditampilkan di pilihan proyek
  const ready = list.filter(function(x) { try { return !!db.weekly.projects[x.id] && projectReady_(db, x).ready; } catch (e) { return false; } });
  const pick = ready.length ? ready : list;
  let p = projectId ? (list.find(function(x) { return x.id === normKey_(projectId); }) || findProject_(list, projectId)) : null;
  if (!p) p = list.find(function(x) { return userCanOperateProject_(user, x); }) || pick.find(function(x) { return store.setting[x.id] && store.setting[x.id].rev !== null; }) || pick[0];
  const shown = list;
  const out = engView_(db, store, p);
  out.success = true;
  out.user = { name: user.name || user.username || '', username: user.username || '', role: role };
  out.canManage = userCanOperateProject_(user, p);
  out.canInput = out.canManage;
  try { out.setup = setupHint_(db, user); } catch (e) { out.setup = null; }
  out.canSubmit = !out.canManage && ktrCanField_(user, p, 'ENG');
  if (ktrIs_(user)) out.ktrFields = ktrFieldsOf_(user);
  out.projects = shown.map(function(x) { const s = store.setting[x.id]; return { id: x.id, name: x.name, fullName: x.fullName || x.name, team: x.team || '', hasBaseline: !!(s && s.rev !== null), mode: s ? s.mode : 'MANUAL' }; });
  out.lists = { disc: ENG.DISC, types: ENG.TYPES };
  out.files = engFilesView_(p.id);
  out.asbuilt = engAsbuiltOf_(p.id);
  return out;
}

/** Periksa file baseline (belum disimpan). */
function checkEngBaseline(token, projectId, parsed) {
  const ctx = engAdminCtx_(token, projectId);
  const res = engValidateBaseline_(ctx, parsed);
  delete res.clean;
  return res;
}

/** Simpan baseline sebagai revisi baru. */
function saveEngBaseline(token, projectId, parsed, fileName) {
  const ctx = engAdminCtx_(token, projectId);
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const store = engStore_();
    const res = engValidateBaseline_(ctx, parsed, store);
    if (res.errors.length) return { success: false, check: res };
    const pid = ctx.p.id, rev = res.rev, now = new Date(), by = ctx.user.username || ctx.user.name || '';
    const docs = res.clean.docs;
    const rows = docs.map(function(d, i) { return [pid, rev, i + 1, d.no, d.name, d.disc, d.type, d.wbs, d.w, d.pola, d.m, d.p[0], d.p[1], d.p[2], d.p[3], d.note, '']; });
    engEnsureHeader_(ENG.SHEETS.BASELINE);
    engAppend_(ENG.SHEETS.BASELINE, rows, true);
    engAppend_(ENG.SHEETS.REVISI, [[pid, rev, res.clean.note, docs.length, res.summary.totalWeight, JSON.stringify(res.clean.params), String(fileName || ''), by, now]], false);
    const cur = store.setting[pid];
    engUpsertSetting_(pid, cur ? cur.mode : 'MANUAL', rev, by, now);
    return { success: true, rev: rev, data: getEngineeringData(token, pid) };
  } finally {
    lock.releaseLock();
  }
}

/** Periksa file realisasi mingguan (belum disimpan). */
function checkEngRealisasi(token, projectId, parsed) {
  const u0 = requireUser_(token);
  const ctx = ktrIs_(u0) ? ktrCtx_(u0, projectId, 'ENG') : engAdminCtx_(token, projectId);
  const res = engValidateRealisasi_(ctx, parsed);
  delete res.clean;
  return res;
}

/** Simpan realisasi mingguan. */
function saveEngRealisasi(token, projectId, parsed, fileName) {
  const u0 = requireUser_(token);
  if (ktrIs_(u0)) {
    const kctx = ktrCtx_(u0, projectId, 'ENG'), lk = pmoLock_('EPCENG');
    lk.waitLock(30000);
    try { return ktrSubmitEng_(token, kctx, parsed, fileName); } finally { lk.releaseLock(); }
  }
  const ctx = engAdminCtx_(token, projectId);
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const res = engSaveRealCore_(ctx, engStore_(), parsed, fileName);
    if (!res.success) return res;
    res.data = getEngineeringData(token, ctx.p.id);
    return res;
  } finally {
    DB_CACHE_ = null;
    lock.releaseLock();
  }
}

/** Inti simpan realisasi engineering (dipakai simpan langsung dan persetujuan pengajuan kontraktor). */
function engSaveRealCore_(ctx, store, parsed, fileName) {
  {
    const res = engValidateRealisasi_(ctx, parsed, store);
    if (res.errors.length) return { success: false, check: res };
    const pid = ctx.p.id, c = res.clean, now = new Date(), by = ctx.user.username || ctx.user.name || '';
    const progByNo = {};
    res.compute.rows.forEach(function(r) { progByNo[r.no] = r.prog; });
    const rows = c.rows.map(function(r) {
      return [pid, c.week, c.rev, r.no, r.mulai, r.st[0][0], r.st[0][1], r.st[0][2], r.st[1][0], r.st[1][1], r.st[1][2], r.st[2][0], r.st[2][1], r.st[2][2], r.ifi, r.note, engRound_(progByNo[r.no], 4)];
    });
    // simpan juga isian dokumen yang tidak ada di baseline aktif (mis. dibatalkan) agar bisa dipulihkan
    const inFile = {}; c.rows.forEach(function(r) { inFile[r.no] = true; });
    const prevSt = engStateOf_(store, pid) || {};
    Object.keys(prevSt).forEach(function(no) { if (inFile[no]) return; const r = prevSt[no]; rows.push([pid, c.week, c.rev, no, r.mulai, r.st[0][0], r.st[0][1], r.st[0][2], r.st[1][0], r.st[1][1], r.st[1][2], r.st[2][0], r.st[2][1], r.st[2][2], r.ifi, r.note, 0]); });
    wrCapturePrevious_(pid, 'ENG');
    engReplaceBlock_(ENG.SHEETS.REAL, pid, rows);
    const s = res.summary;
    const prog = [pid, c.week, c.cutoff, c.rev, engRound_(s.plan, 4), engRound_(s.real, 4), engRound_(s.real - s.plan, 4), s.counts.done, s.counts.wait, s.counts.waitLong, s.counts.resub, s.counts.late, c.rows.length, c.filledBy, c.note, String(fileName || ''), by, now];
    engUpsertProgress_(pid, c.week, prog);
    wrCaptureSaved_(pid, 'ENG', c.rev, rows, ENG.SHEETS.REAL[1]);
    // Mode otomatis: perbarui progres Engineering di DATA MINGGUAN bila minggu tsb sudah diinput.
    let weeklyNote = '';
    const setting = store.setting[pid];
    if (setting && setting.mode === 'OTOMATIS') weeklyNote = engPushToWeekly_(ctx.p, c.week, s.real);
    return { success: true, week: c.week, weeklyNote: weeklyNote };
  }
}

/** Ganti sumber progres engineering: MANUAL / OTOMATIS. */
function setEngMode(token, projectId, mode) {
  const ctx = engAdminCtx_(token, projectId);
  mode = String(mode || '').toUpperCase();
  if (['MANUAL', 'OTOMATIS'].indexOf(mode) < 0) throw new Error('Mode tidak dikenal.');
  const store = engStore_();
  const cur = store.setting[ctx.p.id];
  if (mode === 'OTOMATIS' && (!cur || cur.rev === null)) throw new Error('Simpan baseline engineering terlebih dahulu sebelum memilih mode Otomatis.');
  engUpsertSetting_(ctx.p.id, mode, cur ? cur.rev : '', ctx.user.username || ctx.user.name || '', new Date());
  return getEngineeringData(token, ctx.p.id);
}

// ===================== KELOLA EDL (dashboard) =====================

/**
 * payload: { baseRev, note, pola:{P1:[ifr,ifa,ifc,ifi],…}, polaName:{P1:'…'},
 *            docs:[{ from:'nomor lama' | '', no, name, disc, type, wbs, w, pola, m, p:[4], note, batal:bool }] }
 * Bobot dokumen aktif dinormalisasi otomatis ke total 100%. Disimpan sebagai revisi baseline baru.
 */
function checkEngEdl(token, projectId, payload) {
  const ctx = engAdminCtx_(token, projectId);
  const plan = engEdlPlan_(ctx, payload, engStore_());
  return engEdlPublic_(plan);
}

function saveEngEdl(token, projectId, payload) {
  const ctx = engAdminCtx_(token, projectId);
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const store = engStore_();
    const plan = engEdlPlan_(ctx, payload, store);
    if (plan.res.errors.length) return { success: false, check: engEdlPublic_(plan) };
    const pid = ctx.p.id, rev = plan.res.rev, now = new Date(), by = ctx.user.username || ctx.user.name || '';
    const rows = plan.all.map(function(d, i) { return [pid, rev, i + 1, d.no, d.name, d.disc, d.type, d.wbs, d.w, d.pola, d.m, d.p[0], d.p[1], d.p[2], d.p[3], d.note, d.batal ? 'BATAL' : '']; });
    engEnsureHeader_(ENG.SHEETS.BASELINE);
    engAppend_(ENG.SHEETS.BASELINE, rows, true);
    engAppend_(ENG.SHEETS.REVISI, [[pid, rev, plan.res.clean.note, plan.active.length, plan.res.summary.totalWeight, JSON.stringify(plan.res.clean.params), 'Kelola EDL di dashboard', by, now]], false);
    const cur = store.setting[pid];
    engUpsertSetting_(pid, cur ? cur.mode : 'MANUAL', rev, by, now);
    let moved = null;
    if (Object.keys(plan.renames).length) moved = engRenameDocs_(pid, plan.renames);
    return { success: true, rev: rev, moved: moved, diff: plan.diff, data: getEngineeringData(token, pid) };
  } finally {
    lock.releaseLock();
  }
}

function engEdlPublic_(plan) {
  const r = plan.res;
  return { rev: r.rev, errors: r.errors, warnings: r.warnings, summary: r.summary, curve: r.curve, diff: plan.diff, factor: plan.factor, impact: plan.impact };
}

function engEdlPlan_(ctx, payload, store) {
  payload = payload || {};
  const pid = ctx.p.id, set = store.setting[pid], I = engIssues_();
  if (!set || set.rev === null || set.rev === '') throw new Error('Baseline engineering belum ada. Unggah baseline awal lewat Setup baseline terlebih dahulu.');
  if (Number(payload.baseRev) !== set.rev) throw new Error('Baseline sudah berubah menjadi Rev ' + set.rev + ' sejak halaman dibuka. Muat ulang halaman lalu ulangi perubahan.');
  const P = engParamsOf_(store, pid, set.rev);
  const old = engBaselineAllOf_(store, pid, set.rev), oldBy = {};
  old.forEach(function(d) { oldBy[d.no] = d; });
  const txt = function(v, n) { return String(v === null || v === undefined ? '' : v).trim().slice(0, n); };
  const docs = (payload.docs || []).map(function(d, i) {
    return { row: i + 1, from: txt(d.from, 120), no: txt(d.no, 120), name: txt(d.name, 500), disc: txt(d.disc, 60).toUpperCase(), type: txt(d.type, 80).toUpperCase(), wbs: txt(d.wbs, 300),
      w: d.w === '' || d.w === null || d.w === undefined ? null : Number(d.w), pola: txt(d.pola, 6).toUpperCase(), m: engIso_(d.m), p: [0, 1, 2, 3].map(function(k) { return engIso_(d.p && d.p[k]); }),
      note: txt(d.note, 500), batal: !!d.batal };
  });
  // nomor: unik di seluruh daftar (termasuk dibatalkan), nomor lama harus ada
  const seenNo = {}, seenFrom = {}, renames = {};
  docs.forEach(function(d) {
    if (d.from && !oldBy[d.from]) I.add('error', 'from', 'Dokumen asal tidak ada di baseline aktif.', d.from);
    if (d.from) { if (seenFrom[d.from]) I.add('error', 'fromdup', 'Dokumen baseline muncul dua kali di daftar.', d.from); seenFrom[d.from] = true; }
    if (d.no && seenNo[d.no]) I.add('error', 'nodupall', 'Nomor dokumen dipakai lebih dari satu dokumen (termasuk yang dibatalkan).', d.no);
    seenNo[d.no] = true;
    if (d.from && d.no && d.from !== d.no) renames[d.from] = d.no;
  });
  old.forEach(function(d) { if (!seenFrom[d.no]) I.add('error', 'gone', 'Dokumen baseline hilang dari daftar. Gunakan Batalkan, bukan hapus.', d.no); });
  // normalisasi bobot dokumen aktif ke 100%
  const active = docs.filter(function(d) { return !d.batal; });
  const totalIn = active.reduce(function(a, d) { return a + (d.w !== null && isFinite(d.w) && d.w > 0 ? d.w : 0); }, 0);
  let factor = 1;
  if (totalIn > 0 && active.every(function(d) { return d.w !== null && isFinite(d.w) && d.w >= 0; })) {
    factor = 100 / totalIn;
    active.forEach(function(d) { d.w = engRound_(d.w * factor, 6); });
    const sum = active.reduce(function(a, d) { return a + d.w; }, 0), big = active.reduce(function(m, d) { return !m || d.w > m.w ? d : m; }, null);
    if (big && Math.abs(sum - 100) > 1e-9) big.w = engRound_(big.w + (100 - sum), 6);
  }
  const parsed = { info: { projectId: pid, note: payload.note },
    params: { pola: payload.pola || P.pola, polaName: payload.polaName || P.polaName || {}, porsi: P.porsi, durasi: P.durasi, codes: P.codes },
    docs: active.map(function(d) { return { row: d.row, no: d.no, name: d.name, disc: d.disc, type: d.type, wbs: d.wbs, w: d.w, pola: d.pola, m: d.m, p: d.p, note: d.note }; }) };
  const res = engValidateBaseline_(ctx, parsed, store);
  I.list('error').forEach(function(x) { res.errors.unshift(x); });
  // ringkasan perubahan
  const diff = { added: [], renamed: [], changed: [], cancelled: [], restored: [], weightOnly: 0 };
  const F = ['name', 'disc', 'type', 'wbs', 'pola', 'm', 'note'];
  docs.forEach(function(d) {
    const o = d.from ? oldBy[d.from] : null;
    if (!o) { if (!d.batal) diff.added.push(d.no); return; }
    if (d.no !== o.no) diff.renamed.push(o.no + ' → ' + d.no);
    if (d.batal && !o.batal) { diff.cancelled.push(d.no); return; }
    if (!d.batal && o.batal) diff.restored.push(d.no);
    if (d.batal) return;
    const ch = F.some(function(k) { return String(d[k] || '') !== String(o[k] || ''); }) || [0, 1, 2, 3].some(function(k) { return (d.p[k] || '') !== (o.p[k] || ''); });
    if (ch) diff.changed.push(d.no);
  });
  // pola yang berubah
  const polaOld = P.pola || {}, polaNew = res.clean ? res.clean.params.pola : {};
  diff.pola = Object.keys(Object.assign({}, polaOld, polaNew)).filter(function(k) { return JSON.stringify(polaOld[k] || null) !== JSON.stringify(polaNew[k] || null); });
  // dampak ke realisasi tersimpan (minggu terakhir)
  let impact = null;
  const state = engStateOf_(store, pid) || {}, wk = store.stateWeek[pid] || null;
  if (wk && ctx.info.startIso && res.clean && !res.errors.length) {
    const cut = engCutoff_(ctx.info.startIso, wk), st2 = {};
    Object.keys(state).forEach(function(no) { st2[renames[no] || no] = state[no]; });
    const before = engCompute_(engBaselineOf_(store, pid, set.rev), P, state, cut), after = engCompute_(res.clean.docs, res.clean.params, st2, cut);
    impact = { week: wk, cutoff: cut, realBefore: engRound_(before.real, 4), realAfter: engRound_(after.real, 4), planBefore: engRound_(before.plan, 4), planAfter: engRound_(after.plan, 4) };
    const progBy = {}; before.rows.forEach(function(x) { progBy[x.no] = x.prog; });
    const lost = diff.cancelled.filter(function(no) { const o = docs.find(function(d) { return d.no === no; }); return (progBy[(o && o.from) || no] || 0) > 0; });
    if (lost.length) res.warnings.unshift({ label: 'Dokumen dibatalkan sudah punya realisasi; progresnya tidak dihitung lagi.', count: lost.length, items: lost.slice(0, 8) });
  }
  if (res.clean) {
    const pn = res.clean.params.pola, drop = [];
    docs.forEach(function(d) {
      const s0 = d.from && state[d.from], w = pn[d.pola]; if (!s0 || !w || d.batal) return;
      if ([0, 1, 2].some(function(i) { return !w[i] && s0.st[i] && s0.st[i][0]; }) || (!w[3] && s0.ifi)) drop.push(d.no);
    });
    if (drop.length) res.warnings.unshift({ label: 'Pola dokumen diubah: isian realisasi pada tahap yang tidak dipakai lagi diabaikan.', count: drop.length, items: drop.slice(0, 8) });
  }
  if (Math.abs(factor - 1) > 1e-9) res.warnings.push({ label: 'Total bobot dokumen ' + String(engRound_(totalIn, 4)).replace('.', ',') + '% dinormalisasi otomatis ke 100% (semua bobot × ' + String(engRound_(factor, 6)).replace('.', ',') + ').', count: 0, items: [] });
  // urutan simpan: urutan daftar (aktif & batal); bobot dokumen batal disimpan apa adanya
  const all = docs.map(function(d) { return d; });
  return { res: res, diff: diff, factor: factor, renames: renames, active: active, all: all, impact: impact };
}

/** Ganti nomor dokumen: realisasi, lampiran engineering dan as-built Document Control ikut pindah. */
function engRenameDocs_(pid, map) {
  const upd = function(def, noCol, filt) {
    const sh = engSheet_(def, false); if (!sh || sh.getLastRow() < 2) return 0;
    const v = sh.getDataRange().getValues(), h = v[0].map(function(x) { return String(x).trim().toUpperCase(); });
    const ip = h.indexOf('PROYEK_ID'), ino = h.indexOf(noCol); if (ip < 0 || ino < 0) return 0;
    let n = 0;
    for (let r = 1; r < v.length; r++) {
      if (String(v[r][ip]).trim().toUpperCase() !== pid || (filt && !filt(v[r], h))) continue;
      const o = String(v[r][ino]).trim();
      if (map[o] !== undefined) { sh.getRange(r + 1, ino + 1).setNumberFormat('@').setValue(map[o]); n++; }
    }
    return n;
  };
  const out = { realisasi: upd(ENG.SHEETS.REAL, 'NOMOR_DOKUMEN'), lampiran: 0, asbuilt: 0 };
  try { out.lampiran = upd(ENGF.SHEET, 'NOMOR_DOKUMEN'); } catch (e) {}
  try { out.asbuilt = upd(DOC.SHEETS.REG, 'REF', function(row, h) { return String(row[h.indexOf('KATEGORI')]).trim().toUpperCase() === 'ASBUILT'; }); } catch (e) {}
  SpreadsheetApp.flush();
  return out;
}

/** As-built drawing yang tercatat di Document Control, per nomor dokumen (huruf besar). */
function engAsbuiltOf_(pid) {
  const out = {};
  try {
    docRegsAll_().filter(function(r) { return r.pid === pid && r.kat === 'ASBUILT' && r.ref; }).forEach(function(r) {
      (out[String(r.ref).toUpperCase()] = out[String(r.ref).toUpperCase()] || []).push({ id: r.id, nomor: r.nomor, judul: r.judul, tanggal: r.tanggal, revisi: r.revisi, url: r.url, by: r.by, at: r.at });
    });
    Object.keys(out).forEach(function(k) { out[k].sort(function(a, b) { return String(b.tanggal).localeCompare(String(a.tanggal)); }); });
  } catch (e) {}
  return out;
}

// ===================== INTEGRASI INPUT PROGRES =====================

/**
 * Untuk Input Progres: bila proyek memakai mode OTOMATIS, kembalikan progres Engineering minggu ini
 * (kenaikan terhadap kumulatif minggu lalu di DATA MINGGUAN). null bila mode MANUAL.
 */
function engAutoForWeek_(db, p, week, storeIn) {
  let store = storeIn;
  if (!store) { try { store = engStore_(); } catch (e) { return null; } }
  const s = store.setting[p.id];
  if (!s || s.mode !== 'OTOMATIS') return null;
  const hist = (store.progress[p.id] || []).slice().sort(function(a, b) { return a.week - b.week; });
  let src = null, exact = false;
  hist.forEach(function(h) { if (h.week === week) { src = h; exact = true; } else if (!exact && h.week < week) src = h; });
  const prev = weekPercent_(db.weekly, p.id, 'ENGINEERING_KOMULATIF_REALISASI', week - 1) || 0;
  const cum = src ? src.real : null;
  return {
    mode: 'OTOMATIS',
    // Hanya unggahan minggu yang sama yang dipakai; bila belum ada, kenaikan 0 dan nilai diperbarui saat Admin mengunggah.
    inc: exact ? engRound_(cum - prev, 4) : 0,
    cumulative: exact ? cum : prev,
    sourceWeek: src ? src.week : null,
    exact: exact,
    uploadedBy: src ? src.by : '',
    uploadedAt: src ? src.atText : ''
  };
}

/** Tulis progres Engineering minggu "week" ke DATA MINGGUAN bila minggu itu sudah pernah diinput. */
function engPushToWeekly_(p, week, cumulative) {
  // C2: ditulis ke DATA MINGGUAN -> pegang lock DATA (dipanggil dari simpan Engineering / review kontraktor yang memegang lock EPCENG).
  const dataLock = pmoLock_('DATA');
  dataLock.waitLock(30000);
  try {
    DB_CACHE_ = null;
    const db = loadDb_();
    const W = db.weekly;
    const info = weeklyInfo_(db, p);
    if (week > info.latestWeek) return 'Progres Engineering akan terisi otomatis saat Input Progres WEEK ' + week + ' disimpan.';
    const r = itemRow_(W, p.id, 'ENGINEERING_REALISASI'), c = weekCol_(W, week);
    if (r < 0 || c < 0) return '';
    const prev = weekPercent_(W, p.id, 'ENGINEERING_KOMULATIF_REALISASI', week - 1) || 0;
    W.sheet.getRange(r + 1, c + 1).setValue(engRound_((cumulative - prev) / 100, 6));
    SpreadsheetApp.flush();
    DB_CACHE_ = null;
    return 'Progres Engineering WEEK ' + week + ' di Input Progres diperbarui menjadi kumulatif ' + engRound_(cumulative, 2) + '%.';
  } finally {
    dataLock.releaseLock();
  }
}

// ===================== PERHITUNGAN =====================

function engAddDays_(iso, n) {
  const d = parseIsoDate_(iso); if (!d) return '';
  d.setDate(d.getDate() + Number(n || 0)); return isoDate_(d);
}
function engDays_(a, b) { const x = parseIsoDate_(a), y = parseIsoDate_(b); return x && y ? Math.round((y - x) / 864e5) : null; }
function engRound_(v, d) { const f = Math.pow(10, d); return Math.round((Number(v) || 0) * f) / f; }
function engCutoff_(startIso, week) { return engAddDays_(startIso, week * 7 - 1); }
function engWeekOf_(startIso, iso) { const n = engDays_(startIso, iso); return n === null ? null : Math.floor(n / 7) + 1; }

/** Rencana kumulatif (%) dokumen pada tanggal cutIso, dalam persen bobot dokumen (0..100). */
function engDocPlan_(d, P, cutIso) {
  const w = d.pw || engPolaW_(P, d.pola) || [0, 0, 0, 0], por = P.porsi / 100;
  let t = 0;
  for (let i = 0; i < 3; i++) {
    const x = d.p[i]; if (!x || !w[i]) continue;
    t += w[i] * ((x <= cutIso ? por : 0) + (engAddDays_(x, P.durasi) <= cutIso ? 1 - por : 0));
  }
  if (w[3] && d.p[3] && d.p[3] <= cutIso) t += w[3];
  return t;
}

/* ---------- pola tahap ----------
   Pola = bobot (%) tahap IFR, IFA, IFC, IFI dengan total 100. Tahap berbobot 0 tidak dipakai.
   Urutan selalu IFR → IFA → IFC → IFI; tahap berikutnya baru dihitung setelah tahap sebelumnya (yang dipakai) disetujui.
   IFR/IFA/IFC: porsi terbit diakui saat terbit, sisanya saat kode disetujui. IFI: 100% bobot tahap saat terbit. */
function engPolaW_(P, k) {
  const v = P && P.pola && P.pola[String(k || '').toUpperCase()];
  return Array.isArray(v) && v.length === 4 ? v.map(function(x) { return Number(x) || 0; }) : null;
}
function engPolaName_(P, k) { return (P && P.polaName && P.polaName[k]) || ENG.POLA_NAME[k] || k; }
function engSeq_(w) { const s = []; for (let i = 0; i < 4; i++) if (w && w[i] > 0) s.push(i); return s; }
function engLastPlan_(d, P) { const w = d.pw || engPolaW_(P, d.pola) || []; for (let i = 3; i >= 0; i--) if (w[i] > 0 && d.p[i]) return d.p[i]; return ''; }

/** Progres & status dokumen dari isian realisasi s (sama dengan rumus di sheet REALISASI). */
function engDocActual_(d, s, P, okCodes, cutIso) {
  s = s || { mulai: '', st: [['', '', ''], ['', '', ''], ['', '', '']], ifi: '' };
  const w = d.pw || engPolaW_(P, d.pola) || [0, 0, 0, 0], por = P.porsi / 100, seq = engSeq_(w), N = ENG.STG4;
  const T = function(i) { return i === 3 ? (s.ifi || '') : (s.st[i] && s.st[i][0] ? s.st[i][0] : ''); };
  const ok = function(i) { if (i === 3) return !!s.ifi; const x = s.st[i]; return !!(x && x[0] && x[2] !== '' && okCodes[String(x[2])]); };
  let prog = 0, prevOk = true;
  seq.forEach(function(i) { prog += w[i] * (prevOk && T(i) ? (ok(i) ? 1 : por) : 0); prevOk = prevOk && ok(i); });
  const wait = function(i) {
    const k = N[i], x = s.st[i];
    if (x[2] === '' || x[2] === null || x[2] === undefined) return { k: 'wait', stage: k, days: engDays_(x[0], cutIso), text: k + ' menunggu review (' + engDays_(x[0], cutIso) + ' hari)' };
    return { k: 'resub', stage: k, code: x[2], send: Number(x[1]) || 1, text: k + ' kirim ulang (kode ' + x[2] + ', kiriman ke-' + (Number(x[1]) || 1) + ')' };
  };
  let st = null;
  if (!seq.length) st = { k: 'notyet', text: 'Pola ' + (d.pola || '–') + ' tidak dikenal' };
  else {
    const last = seq[seq.length - 1];
    if (ok(last)) st = { k: 'done', text: 'Selesai (' + N[last] + (last === 3 ? ' terbit' : ' disetujui') + ')' };
    for (let j = seq.length - 1; j >= 1 && !st; j--) {
      const i = seq[j], pv = seq[j - 1];
      if (ok(pv) && i < 3 && T(i)) st = wait(i);
      else if (ok(pv)) st = { k: 'ready', stage: N[i], text: N[pv] + ' disetujui · siap ' + N[i] };
    }
    if (!st) {
      const f = seq[0];
      if (f === 3) st = d.p[3] && d.p[3] < cutIso ? { k: 'late', text: 'IFI terlambat terbit' } : { k: 'notyet', text: 'Belum terbit' };
      else if (T(f)) st = wait(f);
      else if (s.mulai) st = { k: 'drafting', text: 'Sedang disusun' };
      else if (d.m && d.m <= cutIso) st = { k: 'late', text: 'Terlambat mulai' };
      else st = { k: 'notyet', text: 'Belum mulai' };
    }
  }
  st.prog = prog;
  return st;
}

/** Hitung seluruh dokumen pada cut-off. */
function engCompute_(docs, P, state, cutIso) {
  const okCodes = {};
  (P.codes || []).forEach(function(c) { if (String(c[2]).toUpperCase() === 'YA') okCodes[String(c[0])] = true; });
  let real = 0, plan = 0;
  const counts = { done: 0, wait: 0, waitLong: 0, resub: 0, ready: 0, drafting: 0, late: 0, notyet: 0 };
  const rows = docs.map(function(d) {
    const a = engDocActual_(d, state ? state[d.no] : null, P, okCodes, cutIso);
    const pl = engDocPlan_(d, P, cutIso);
    real += d.w * a.prog / 100; plan += d.w * pl / 100;
    counts[a.k] = (counts[a.k] || 0) + 1;
    if (a.k === 'wait' && a.days > P.durasi) counts.waitLong++;
    return { no: d.no, prog: engRound_(a.prog, 4), plan: engRound_(pl, 4), k: a.k, stage: a.stage || '', days: a.days === undefined ? null : a.days, code: a.code === undefined ? '' : a.code, send: a.send || null, text: a.text };
  });
  return { rows: rows, real: real, plan: plan, counts: counts };
}

function engPlanCurve_(docs, P, startIso, lastWeek) {
  const out = [];
  for (let w = 1; w <= lastWeek; w++) {
    const cut = engCutoff_(startIso, w);
    let t = 0; docs.forEach(function(d) { t += d.w * engDocPlan_(d, P, cut) / 100; });
    out.push({ week: w, end: cut, plan: engRound_(t, 3) });
  }
  return out;
}

// ===================== VALIDASI =====================

function engIssues_() {
  const map = {}, order = [];
  return {
    add: function(level, key, label, item) {
      const id = level + '|' + key;
      if (!map[id]) { map[id] = { level: level, label: label, items: [] }; order.push(id); }
      if (item !== undefined && item !== null && item !== '') map[id].items.push(String(item));
    },
    list: function(level) {
      return order.filter(function(id) { return map[id].level === level; }).map(function(id) {
        const x = map[id]; return { label: x.label, count: x.items.length, items: x.items.slice(0, 8) };
      });
    }
  };
}

function engValidateBaseline_(ctx, parsed, store) {
  store = store || engStore_();
  parsed = parsed || {};
  const I = engIssues_(), p = ctx.p, info = ctx.info;
  (parsed.parseErrors || []).forEach(function(e) { I.add('error', 'parse:' + e, e); });
  const pi = parsed.info || {};
  if (normKey_(pi.projectId) !== p.id) I.add('error', 'pid', 'PROYEK_ID di file (' + (pi.projectId || 'kosong') + ') tidak sama dengan proyek yang dibuka (' + p.id + '). Unduh template dari proyek ini.');
  const cur = store.setting[p.id];
  const rev = cur && cur.rev !== null ? cur.rev + 1 : 0;
  const note = String(pi.note || '').trim().slice(0, 1000);
  if (rev >= 1 && !note) I.add('error', 'note', 'Catatan revisi (CATATAN_REVISI) wajib diisi karena ini revisi baseline ke-' + rev + '.');
  // parameter
  const pr = parsed.params || {};
  const pola = {}, polaName = {};
  Object.keys(pr.pola || {}).forEach(function(k0) {
    const k = String(k0).trim().toUpperCase();
    if (!/^P\d{1,2}$/.test(k)) { I.add('error', 'pkode', 'Kode pola harus P diikuti angka (P1, P2, … P99).', k0); return; }
    const w = (pr.pola[k0] || []).map(Number);
    if (w.length !== 4 || w.some(function(v) { return !isFinite(v) || v < 0; })) { I.add('error', 'pw', 'Bobot tahap pola harus berupa angka ≥ 0.', k); return; }
    if (Math.abs(w.reduce(function(a, b) { return a + b; }, 0) - 100) > 0.001) I.add('error', 'ptot', 'Total bobot tahap pola harus 100 (IFR + IFA + IFC + IFI).', k);
    pola[k] = w.map(function(v) { return engRound_(v, 4); });
    polaName[k] = String((pr.polaName || {})[k0] || (pr.polaName || {})[k] || '').trim().slice(0, 80) || ENG.POLA_NAME[k] || k;
  });
  if (!Object.keys(pola).length) I.add('error', 'pnone', 'Belum ada pola tahap di PARAMETER.');
  const porsi = Number(pr.porsi), durasi = Number(pr.durasi);
  if (!isFinite(porsi) || porsi < 0 || porsi > 100) I.add('error', 'porsi', 'PORSI_TERBIT_% harus angka 0–100.');
  if (!isFinite(durasi) || durasi < 0 || durasi > 365 || Math.round(durasi) !== durasi) I.add('error', 'durasi', 'DURASI_REVIEW_HARI harus bilangan bulat 0–365.');
  const codes = (pr.codes || []).filter(function(c) { return c && String(c[0]).trim() !== ''; }).map(function(c) { return [isFinite(Number(c[0])) ? Number(c[0]) : String(c[0]).trim(), String(c[1] || '').trim(), String(c[2] || '').trim().toUpperCase(), String(c[3] || '').trim()]; });
  const seenCode = {};
  codes.forEach(function(c) {
    if (seenCode[String(c[0])]) I.add('error', 'codedup', 'Kode status ganda di sheet PARAMETER.', c[0]); seenCode[String(c[0])] = true;
    if (['YA', 'TIDAK'].indexOf(c[2]) < 0) I.add('error', 'codeok', 'Kolom DISETUJUI? kode status harus YA atau TIDAK.', c[0]);
  });
  if (!codes.some(function(c) { return c[2] === 'YA'; })) I.add('error', 'codeya', 'Minimal satu kode status harus DISETUJUI? = YA.');
  const params = { pola: pola, polaName: polaName, porsi: porsi, durasi: durasi, codes: codes };
  // dokumen
  const docs = (parsed.docs || []).map(function(d) {
    return { row: d.row, no: String(d.no || '').trim(), name: String(d.name || '').trim().slice(0, 500), disc: String(d.disc || '').trim().toUpperCase(), type: String(d.type || '').trim().toUpperCase(), wbs: String(d.wbs || '').trim().slice(0, 300),
      w: d.w === null || d.w === '' || d.w === undefined ? null : Number(d.w), pola: String(d.pola || '').trim().toUpperCase(), m: engIso_(d.m), p: [0, 1, 2, 3].map(function(i) { return engIso_(d.p && d.p[i]); }), note: String(d.note || '').trim().slice(0, 500) };
  });
  if (!docs.length) I.add('error', 'nodocs', 'Sheet DOKUMEN belum berisi dokumen.');
  const seen = {}, start = info.startIso;
  let total = 0;
  docs.forEach(function(d) {
    const id = d.no || ('baris ' + d.row);
    if (!d.no) I.add('error', 'noblank', 'Nomor dokumen kosong.', 'baris ' + d.row);
    else if (seen[d.no]) I.add('error', 'nodup', 'Nomor dokumen ganda.', d.no);
    seen[d.no] = true;
    if (ENG.EXAMPLE_NOS.indexOf(d.no) >= 0 && /^contoh/i.test(d.name)) I.add('error', 'example', 'Baris contoh dari template belum dihapus.', d.no);
    if (!d.name) I.add('error', 'name', 'Nama dokumen kosong.', id);
    if (d.w === null || !isFinite(d.w)) I.add('error', 'w', 'Bobot dokumen kosong / bukan angka.', id);
    else if (d.w < 0) I.add('error', 'wneg', 'Bobot dokumen negatif.', id);
    else { total += d.w; if (d.w === 0) I.add('warn', 'w0', 'Bobot dokumen 0 (tidak menambah progres).', id); }
    const pw = pola[d.pola];
    if (!pw) { I.add('error', 'pola', 'Pola tidak ada di daftar pola tahap.', id + ' (' + (d.pola || 'kosong') + ')'); return; }
    const seq = engSeq_(pw), N = ENG.STG4;
    if (!d.m) I.add('error', 'm', 'Rencana mulai kosong.', id);
    const issue = seq.map(function(i) { return d.p[i]; }).filter(Boolean);
    if (d.m && issue.length && d.m > issue.reduce(function(a, b) { return a < b ? a : b; })) I.add('error', 'mafter', 'Rencana mulai setelah tanggal terbit pertama.', id);
    seq.forEach(function(i) { if (!d.p[i]) I.add('error', 'need' + N[i], 'Rencana ' + N[i] + ' kosong (pola dokumen memakai ' + N[i] + ').', id); });
    [0, 1, 2, 3].forEach(function(i) { if (!pw[i] && d.p[i]) I.add('error', 'unused' + N[i], 'Rencana ' + N[i] + ' diisi, padahal pola dokumen tidak memakai ' + N[i] + '.', id + ' (' + d.pola + ')'); });
    for (let j = 1; j < seq.length; j++) {
      const a = d.p[seq[j - 1]], b = d.p[seq[j]];
      if (a && b && b < a) { I.add('error', 'order', 'Urutan rencana terbalik (harus IFR ≤ IFA ≤ IFC ≤ IFI sesuai pola).', id); break; }
    }
    for (let j = 1; j < seq.length; j++) {
      const a = d.p[seq[j - 1]], b = d.p[seq[j]];
      if (seq[j] < 3 && isFinite(durasi) && a && b && b >= a && b < engAddDays_(a, durasi)) { I.add('warn', 'review', 'Rencana terbit tahap berikutnya lebih awal dari rencana terbit + durasi review (' + durasi + ' hari).', id); break; }
    }
    const rv = seq.filter(function(i) { return i < 3; });
    if (rv.length > 1 && d.p[rv[0]] && d.p[rv[rv.length - 1]] && engDays_(d.p[rv[0]], d.p[rv[rv.length - 1]]) < 7) I.add('warn', 'tight', 'Tahap review pertama dan terakhir direncanakan dalam 7 hari yang sama.', id);
    if (start && [d.m].concat(d.p).some(function(x) { return x && x < start; })) I.add('warn', 'beforeStart', 'Rencana sebelum tanggal mulai proyek (' + start + ').', id);
    if (d.disc && ENG.DISC.indexOf(d.disc) < 0) I.add('warn', 'disc', 'Disiplin di luar daftar baku.', d.disc + ' · ' + id);
    if (!d.disc) I.add('warn', 'discblank', 'Disiplin kosong.', id);
    if (d.type && ENG.TYPES.indexOf(d.type) < 0) I.add('warn', 'type', 'Jenis dokumen di luar daftar baku.', d.type + ' · ' + id);
  });
  if (docs.length && Math.abs(total - 100) > ENG.WEIGHT_TOL) I.add('error', 'total', 'Total bobot dokumen ' + engRound_(total, 3) + '% (harus 100 ± ' + ENG.WEIGHT_TOL + ').');
  const valid = docs.filter(function(d) { return d.no && pola[d.pola] && d.w !== null && isFinite(d.w); });
  let lastIssue = '';
  valid.forEach(function(d) { const x = engLastPlan_(d, params); if (x && x > lastIssue) lastIssue = x; });
  const lastWeek = start && lastIssue ? engWeekOf_(start, lastIssue) : null;
  if (lastWeek && info.maxWeek && lastWeek > info.maxWeek) I.add('warn', 'sched', 'Rencana terbit terakhir (' + lastIssue + ', week ' + lastWeek + ') melewati jadwal proyek (' + info.maxWeek + ' week).');
  const errors = I.list('error'), warns = I.list('warn');
  let curve = [];
  if (!errors.length && start) curve = engPlanCurve_(valid, params, start, Math.min(400, Math.max(info.maxWeek || 0, (lastWeek || 0) + Math.ceil((durasi || 0) / 7) + 1)));
  const byDisc = {};
  valid.forEach(function(d) { const k = d.disc || '—'; byDisc[k] = byDisc[k] || { name: k, n: 0, w: 0 }; byDisc[k].n++; byDisc[k].w += d.w; });
  return {
    rev: rev, errors: errors, warnings: warns,
    summary: { docs: docs.length, p1: valid.filter(function(d) { return d.pola === 'P1'; }).length, p4: valid.filter(function(d) { return d.pola === 'P4'; }).length,
      byPola: Object.keys(pola).map(function(k) { return { k: k, name: polaName[k], w: pola[k], n: valid.filter(function(d) { return d.pola === k; }).length }; }),
      totalWeight: engRound_(total, 4), lastIssue: lastIssue, lastWeek: lastWeek, disc: Object.keys(byDisc).map(function(k) { byDisc[k].w = engRound_(byDisc[k].w, 3); return byDisc[k]; }).sort(function(a, b) { return b.w - a.w; }) },
    params: params, curve: curve,
    clean: { docs: valid.map(function(d) { return { no: d.no, name: d.name, disc: d.disc, type: d.type, wbs: d.wbs, w: d.w, pola: d.pola, m: d.m, p: d.p, note: d.note }; }), params: params, note: note }
  };
}

function engValidateRealisasi_(ctx, parsed, store) {
  store = store || engStore_();
  parsed = parsed || {};
  const I = engIssues_(), p = ctx.p, info = ctx.info, pid = p.id;
  (parsed.parseErrors || []).forEach(function(e) { I.add('error', 'parse:' + e, e); });
  const set = store.setting[pid];
  if (!set || set.rev === null) { I.add('error', 'nobase', 'Baseline engineering belum disimpan untuk proyek ini.'); return { errors: I.list('error'), warnings: [] }; }
  const base = engBaselineOf_(store, pid, set.rev), P = engParamsOf_(store, pid, set.rev);
  const pi = parsed.info || {};
  if (normKey_(pi.projectId) !== pid) I.add('error', 'pid', 'PROYEK_ID di file (' + (pi.projectId || 'kosong') + ') tidak sama dengan proyek yang dibuka (' + pid + ').');
  if (Number(pi.rev) !== set.rev) I.add('error', 'rev', 'File memakai baseline revisi ' + pi.rev + ', sedangkan baseline aktif revisi ' + set.rev + '. Unduh ulang template realisasi.');
  const week = Number(pi.week);
  const hist = (store.progress[pid] || []).slice().sort(function(a, b) { return a.week - b.week; });
  const lastSaved = hist.length ? hist[hist.length - 1].week : 0;
  if (!Number.isInteger(week) || week < 1 || week > 400) I.add('error', 'week', 'MINGGU_KE di sheet INFO tidak valid.');
  else if (week < lastSaved) I.add('error', 'old', 'MINGGU_KE ' + week + ' lebih lama dari unggahan terakhir (week ' + lastSaved + '). Perbaikan dimasukkan ke minggu berjalan.');
  const cut = info.startIso && Number.isInteger(week) ? engCutoff_(info.startIso, week) : '';
  if (cut && engIso_(pi.cutoff) !== cut) I.add('error', 'cut', 'CUT_OFF di file (' + (pi.cutoff || 'kosong') + ') tidak sesuai week ' + week + ' (' + cut + ').');
  if (cut && cut > isoDate_(new Date()) && engDays_(isoDate_(new Date()), cut) > 7) I.add('warn', 'future', 'Cut-off week ' + week + ' (' + cut + ') masih di masa depan.');
  if (week === lastSaved && lastSaved) I.add('warn', 'replace', 'Unggahan week ' + week + ' sudah ada dan akan diganti.');
  // dokumen
  const okCode = {}, known = {};
  P.codes.forEach(function(c) { known[String(c[0])] = true; if (c[2] === 'YA') okCode[String(c[0])] = true; });
  const byNo = {}; base.forEach(function(d) { byNo[d.no] = d; });
  const seen = {}, rows = [];
  (parsed.rows || []).forEach(function(r0) {
    const no = String(r0.no || '').trim(); if (!no) return;
    if (!byNo[no]) { I.add('error', 'extra', 'Nomor dokumen tidak ada di baseline aktif (nomor diubah/ditambah).', no); return; }
    if (seen[no]) { I.add('error', 'dup', 'Nomor dokumen muncul dua kali.', no); return; }
    seen[no] = true;
    const d = byNo[no];
    const r = { no: no, mulai: engIso_(r0.mulai), ifi: engIso_(r0.ifi), note: String(r0.note || '').trim().slice(0, 500), st: [0, 1, 2].map(function(i) {
      const x = (r0.st && r0.st[i]) || [];
      const code = x[2] === null || x[2] === undefined ? '' : (isFinite(Number(x[2])) && String(x[2]).trim() !== '' ? Number(x[2]) : String(x[2]).trim());
      const send = x[1] === '' || x[1] === null || x[1] === undefined ? '' : Number(x[1]);
      return [engIso_(x[0]), send, code];
    }) };
    ['IFR', 'IFA', 'IFC'].forEach(function(k, i) {
      const x = r.st[i];
      if (x[2] !== '' && !known[String(x[2])]) I.add('error', 'code', 'Kode status tidak dikenal.', no + ' ' + k + ' (' + x[2] + ')');
      if (x[2] !== '' && !x[0]) I.add('error', 'codeNoDate', 'Kode status diisi tanpa tanggal terbit.', no + ' ' + k);
      if (x[1] !== '' && (!Number.isInteger(x[1]) || x[1] < 1 || x[1] > 20)) I.add('error', 'send', 'KIRIM_KE harus angka 1–20.', no + ' ' + k);
      if (x[0] && x[1] === '') x[1] = 1;
    });
    const dates = [['Mulai', r.mulai], ['IFR', r.st[0][0]], ['IFA', r.st[1][0]], ['IFC', r.st[2][0]], ['IFI', r.ifi]];
    dates.forEach(function(x) { if (x[1] && cut && x[1] > cut) I.add('error', 'after', 'Tanggal setelah cut-off (' + cut + ').', no + ' ' + x[0]); });
    const pw = d.pw || engPolaW_(P, d.pola) || [0, 0, 0, 0], seq = engSeq_(pw);
    ['IFR', 'IFA', 'IFC'].forEach(function(k, i) { if (!pw[i] && (r.st[i][0] || r.st[i][2] !== '')) I.add('error', 'unused' + k, 'Tahap ' + k + ' diisi, padahal pola dokumen tidak memakai ' + k + '.', no + ' (' + d.pola + ')'); });
    if (!pw[3] && r.ifi) I.add('error', 'unusedIFI', 'IFI_TERBIT diisi, padahal pola dokumen tidak memakai IFI.', no + ' (' + d.pola + ')');
    const ok = function(i) { return !!(r.st[i][0] && r.st[i][2] !== '' && okCode[String(r.st[i][2])]); };
    for (let j = 1; j < seq.length; j++) {
      const i = seq[j], pv = seq[j - 1], N = ENG.STG4, issued = i === 3 ? r.ifi : r.st[i][0], pvOk = pv === 3 ? !!r.ifi : ok(pv);
      if (issued && !pvOk) I.add('warn', 'seq' + N[i], N[i] + ' terbit sebelum ' + N[pv] + ' disetujui (' + N[i] + ' belum dihitung).', no);
    }
    const first = [r.st[0][0], r.ifi].filter(Boolean).sort()[0];
    if (r.mulai && first && r.mulai > first) I.add('warn', 'mulai', 'Tanggal terbit sebelum MULAI_AKTUAL.', no);
    rows.push(r);
  });
  const missing = base.filter(function(d) { return !seen[d.no]; });
  missing.forEach(function(d) { I.add('error', 'missing', 'Dokumen baseline tidak ada di file (baris dihapus / nomor diubah).', d.no); });
  // bandingkan dengan isian tersimpan
  const prevState = engStateOf_(store, pid);
  const state = {}; rows.forEach(function(r) { state[r.no] = r; });
  const compute = cut ? engCompute_(base, P, state, cut) : { rows: [], real: 0, plan: 0, counts: {} };
  if (cut && prevState && Object.keys(prevState).length) {
    const prevComp = engCompute_(base, P, prevState, cut);
    const prevBy = {}; prevComp.rows.forEach(function(x) { prevBy[x.no] = x.prog; });
    compute.rows.forEach(function(x) { if (prevBy[x.no] !== undefined && x.prog < prevBy[x.no] - 1e-9) I.add('warn', 'down', 'Progres dokumen turun dibanding unggahan terakhir.', x.no); });
  }
  const prevPct = hist.filter(function(h) { return h.week < week; }).map(function(h) { return h.real; }).pop() || 0;
  return {
    errors: I.list('error'), warnings: I.list('warn'), week: week, cutoff: cut, lastSaved: lastSaved,
    summary: { real: compute.real, plan: compute.plan, prev: prevPct, inc: compute.real - prevPct, counts: compute.counts, docs: rows.length },
    compute: compute,
    clean: { week: week, cutoff: cut, rev: set.rev, rows: rows, filledBy: String(pi.filledBy || '').trim().slice(0, 200), note: String(pi.note || '').trim().slice(0, 2000) }
  };
}

function engIso_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v) ? '' : isoDate_(v);
  const m = String(v).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[1] + '-' + m[2] + '-' + m[3] : '';
}

// ===================== TAMPILAN =====================

function engView_(db, store, p) {
  const info = engInfo_(db, p);
  const set = store.setting[p.id] || { mode: 'MANUAL', rev: null, by: '', atText: '' };
  const revs = (store.revisions[p.id] || []).slice().sort(function(a, b) { return b.rev - a.rev; });
  const out = {
    project: { id: p.id, name: p.name, fullName: p.fullName || p.name, team: p.team || '', contractor: info.contractor, start: info.startIso, finish: info.finishIso, maxWeek: info.maxWeek, currentWeek: info.currentWeek, latestWeeklyWeek: info.latestWeek },
    setting: { mode: set.mode || 'MANUAL', rev: set.rev, by: set.by || '', at: set.atText || '' },
    revisions: revs.map(function(r) { return { rev: r.rev, note: r.note, docs: r.docs, total: r.total, file: r.file, by: r.by, at: r.atText }; }),
    params: null, baseline: [], cancelled: [], state: {}, stateWeek: null, history: [], planCurve: [], docsView: [], latest: null
  };
  if (set.rev === null || set.rev === undefined || set.rev === '') return out;
  const P = engParamsOf_(store, p.id, set.rev), base = engBaselineOf_(store, p.id, set.rev);
  out.params = P; out.baseline = base;
  out.cancelled = engBaselineAllOf_(store, p.id, set.rev).filter(function(d) { return d.batal; });
  const state = engStateOf_(store, p.id) || {};
  out.state = state;
  const hist = (store.progress[p.id] || []).slice().sort(function(a, b) { return a.week - b.week; });
  out.history = hist.map(function(h) { return { week: h.week, cutoff: h.cutoff, rev: h.rev, plan: h.plan, real: h.real, dev: h.dev, done: h.done, wait: h.wait, waitLong: h.waitLong, resub: h.resub, late: h.late, docs: h.docs, filledBy: h.filledBy, note: h.note, file: h.file, by: h.by, at: h.atText }; });
  out.stateWeek = store.stateWeek[p.id] || null;
  let lastIssue = '';
  base.forEach(function(d) { const x = engLastPlan_(d, P); if (x && x > lastIssue) lastIssue = x; });
  const lastWeek = info.startIso && lastIssue ? engWeekOf_(info.startIso, lastIssue) : 0;
  if (info.startIso) out.planCurve = engPlanCurve_(base, P, info.startIso, Math.min(400, Math.max(info.maxWeek || 0, lastWeek + Math.ceil(P.durasi / 7) + 1, out.stateWeek || 0)));
  const viewWeek = out.stateWeek || null;
  const cut = info.startIso && viewWeek ? engCutoff_(info.startIso, viewWeek) : (info.startIso ? engCutoff_(info.startIso, Math.max(1, Math.min(info.currentWeek || 1, info.maxWeek || 1))) : '');
  if (cut) {
    const comp = engCompute_(base, P, state, cut);
    out.docsView = comp.rows;
    out.latest = { week: viewWeek, cutoff: cut, real: comp.real, plan: comp.plan, counts: comp.counts, hasData: !!viewWeek };
  }
  return out;
}

function engInfo_(db, p) {
  const w = weeklyInfo_(db, p);
  const finish = monthlyDate_(db, p.id, 'EFEKTIF_DATE_FINISH');
  const startIso = w.startDate ? isoDate_(w.startDate) : '';
  return {
    startIso: startIso, finishIso: finish ? isoDate_(finish) : '', maxWeek: w.maxWeek || null, latestWeek: w.latestWeek || 0,
    contractor: monthlyText_(db, p.id, 'KONTRAKTOR') || '',
    currentWeek: w.startDate ? weekForDate_(w.startDate, new Date()) : null
  };
}

function engAdminCtx_(token, projectId) {
  const user = requireUser_(token);
  const db = loadDb_();
  const id = normKey_(projectId);
  const p = db.allProjects.find(function(x) { return x.id === id; }) || findProject_(db.allProjects, projectId);
  if (!p) throw new Error('Proyek tidak ditemukan.');
  if (!userCanOperateProject_(user, p)) throw new Error('Halaman operasional Engineering hanya untuk PROYEK_ID akun Anda.');
  const info = engInfo_(db, p);
  if (!info.startIso) throw new Error('Tanggal mulai proyek (EFEKTIF_DATE_START) belum diisi. Lengkapi lewat menu Tambah / Edit Proyek.');
  return { user: user, db: db, p: p, info: info };
}

// ===================== PENYIMPANAN =====================

// Spreadsheet dibuka sekali per panggilan server (bukan per sheet) — dipakai bersama oleh semua pembacaan Engineering & EPCC.
var ENG_SS_ONCE_ = null;
function engSsOnce_() { if (!ENG_SS_ONCE_) ENG_SS_ONCE_ = SpreadsheetApp.openById(SPREADSHEET_ID); return ENG_SS_ONCE_; }

function engSheet_(def, create) {
  const ss = engSsOnce_();
  let sh = ss.getSheetByName(def[0]);
  if (!sh && create) {
    sh = ss.insertSheet(def[0]);
    sh.getRange(1, 1, 1, def[1].length).setValues([def[1]]).setFontWeight('bold').setBackground('#0F2B46').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}

function engRead_(def) {
  const sh = engSheet_(def, false);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getRange(1, 1, sh.getLastRow(), Math.max(sh.getLastColumn(), def[1].length)).getValues();
  const head = values[0].map(function(h) { return String(h).trim().toUpperCase(); });
  return values.slice(1).map(function(row) { const o = {}; head.forEach(function(h, i) { if (h) o[h] = row[i]; }); return o; });
}

function engAppend_(def, rows, textDates) {
  storeTouch_();
  if (!rows.length) return;
  const sh = engSheet_(def, true);
  const start = sh.getLastRow() + 1;
  const rng = sh.getRange(start, 1, rows.length, def[1].length);
  if (textDates) rng.setNumberFormat('@');
  rng.setValues(rows);
}

/** Ganti blok baris milik satu proyek (ENG_REALISASI). */
function engReplaceBlock_(def, pid, rows) {
  storeTouch_();
  const sh = engSheet_(def, true);
  const n = sh.getLastRow();
  if (n >= 2) {
    const ids = sh.getRange(2, 1, n - 1, 1).getValues().map(function(r) { return String(r[0]).trim().toUpperCase(); });
    const idx = []; ids.forEach(function(v, i) { if (v === pid) idx.push(i); });
    if (idx.length) {
      const contiguous = idx[idx.length - 1] - idx[0] + 1 === idx.length;
      if (contiguous) sh.deleteRows(idx[0] + 2, idx.length);
      else for (let k = idx.length - 1; k >= 0; k--) sh.deleteRow(idx[k] + 2);
    }
  }
  engAppend_(def, rows, true);
}

function engUpsertSetting_(pid, mode, rev, by, at) {
  storeTouch_();
  const sh = engSheet_(ENG.SHEETS.SETTING, true);
  const n = sh.getLastRow();
  const line = [pid, mode, rev === null || rev === undefined ? '' : rev, by, at];
  if (n >= 2) {
    const ids = sh.getRange(2, 1, n - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) if (String(ids[i][0]).trim().toUpperCase() === pid) { sh.getRange(i + 2, 1, 1, line.length).setValues([line]); return; }
  }
  sh.appendRow(line);
}

function engUpsertProgress_(pid, week, line) {
  const sh = engSheet_(ENG.SHEETS.PROGRES, true);
  const n = sh.getLastRow();
  if (n >= 2) {
    const v = sh.getRange(2, 1, n - 1, 2).getValues();
    for (let i = 0; i < v.length; i++) if (String(v[i][0]).trim().toUpperCase() === pid && Number(v[i][1]) === week) {
      sh.getRange(i + 2, 3).setNumberFormat('@'); sh.getRange(i + 2, 1, 1, line.length).setValues([line]); return;
    }
  }
  const r = sh.getLastRow() + 1;
  sh.getRange(r, 3).setNumberFormat('@');
  sh.getRange(r, 1, 1, line.length).setValues([line]);
}

/** Muat seluruh data engineering sekali per eksekusi. */
function engStore_() {
  const fmtAt = function(v) { return v instanceof Date && !isNaN(v) ? formatDateId_(v) + ' ' + String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0') : String(v || ''); };
  const up = function(v) { return String(v || '').trim().toUpperCase(); };
  const store = { setting: {}, revisions: {}, baseline: {}, real: {}, stateWeek: {}, progress: {} };
  engRead_(ENG.SHEETS.SETTING).forEach(function(r) {
    const id = up(r.PROYEK_ID); if (!id) return;
    store.setting[id] = { mode: up(r.MODE) === 'OTOMATIS' ? 'OTOMATIS' : 'MANUAL', rev: r.REVISI_AKTIF === '' || r.REVISI_AKTIF === null ? null : Number(r.REVISI_AKTIF), by: userDisplayName_(r.DIPERBARUI_OLEH), atText: fmtAt(r.DIPERBARUI) };
  });
  engRead_(ENG.SHEETS.REVISI).forEach(function(r) {
    const id = up(r.PROYEK_ID); if (!id) return;
    let params = null; try { params = JSON.parse(String(r.PARAMETER_JSON || '')); } catch (e) { params = null; }
    (store.revisions[id] = store.revisions[id] || []).push({ rev: Number(r.REVISI), note: String(r.CATATAN_REVISI || ''), docs: Number(r.JUMLAH_DOKUMEN) || 0, total: Number(r.TOTAL_BOBOT) || 0, params: params, file: String(r.NAMA_FILE || ''), by: userDisplayName_(r.DIUNGGAH_OLEH), atText: fmtAt(r.DIUNGGAH_PADA) });
  });
  engRead_(ENG.SHEETS.BASELINE).forEach(function(r) {
    const id = up(r.PROYEK_ID); if (!id) return;
    const key = id + '|' + Number(r.REVISI);
    (store.baseline[key] = store.baseline[key] || []).push({ no: String(r.NOMOR_DOKUMEN || '').trim(), name: String(r.NAMA_DOKUMEN || ''), disc: String(r.DISIPLIN || ''), type: String(r.JENIS_DOKUMEN || ''), wbs: String(r.PAKET_WBS || ''),
      w: Number(r.BOBOT_DOK) || 0, pola: up(r.POLA), m: engIso_(r.RENCANA_MULAI), p: [engIso_(r.RENCANA_IFR), engIso_(r.RENCANA_IFA), engIso_(r.RENCANA_IFC), engIso_(r.RENCANA_IFI)], note: String(r.CATATAN || ''), _no: Number(r.NO) || 0, batal: up(r.STATUS) === 'BATAL' });
  });
  Object.keys(store.baseline).forEach(function(k) { store.baseline[k].sort(function(a, b) { return a._no - b._no; }); });
  const cell = function(v) { return v === null || v === undefined || v === '' ? '' : (isFinite(Number(v)) ? Number(v) : String(v).trim()); };
  engRead_(ENG.SHEETS.REAL).forEach(function(r) {
    const id = up(r.PROYEK_ID); if (!id) return;
    const no = String(r.NOMOR_DOKUMEN || '').trim(); if (!no) return;
    (store.real[id] = store.real[id] || {})[no] = { mulai: engIso_(r.MULAI_AKTUAL), ifi: engIso_(r.IFI_TERBIT), note: String(r.CATATAN || ''),
      st: ENG.STAGES.map(function(k) { return [engIso_(r[k + '_TERBIT']), cell(r[k + '_KIRIM_KE']), cell(r[k + '_KODE'])]; }) };
    store.stateWeek[id] = Number(r.WEEK) || store.stateWeek[id] || null;
  });
  engRead_(ENG.SHEETS.PROGRES).forEach(function(r) {
    const id = up(r.PROYEK_ID); if (!id) return;
    (store.progress[id] = store.progress[id] || []).push({ week: Number(r.WEEK), cutoff: engIso_(r.CUT_OFF), rev: Number(r.REVISI), plan: Number(r.RENCANA) || 0, real: Number(r.REALISASI) || 0, dev: Number(r.DEVIASI) || 0,
      done: Number(r.SELESAI) || 0, wait: Number(r.MENUNGGU) || 0, waitLong: Number(r.MENUNGGU_LAMA) || 0, resub: Number(r.KIRIM_ULANG) || 0, late: Number(r.TERLAMBAT) || 0, docs: Number(r.DOKUMEN) || 0,
      filledBy: userDisplayName_(r.DIISI_OLEH), note: String(r.CATATAN || ''), file: String(r.NAMA_FILE || ''), by: userDisplayName_(r.DIUNGGAH_OLEH), atText: fmtAt(r.DIUNGGAH_PADA) });
  });
  return store;
}

/** Dokumen aktif baseline (dokumen berstatus BATAL tidak ikut). pw = bobot tahap pola dokumen. */
function engBaselineOf_(store, pid, rev) {
  return engBaselineAllOf_(store, pid, rev).filter(function(d) { return !d.batal; });
}
/** Semua dokumen baseline termasuk yang dibatalkan (untuk Kelola EDL). */
function engBaselineAllOf_(store, pid, rev) {
  let P = null;
  try { const r = (store.revisions[pid] || []).find(function(x) { return x.rev === rev; }); P = r && r.params; } catch (e) { P = null; }
  return (store.baseline[pid + '|' + rev] || []).map(function(d) {
    const o = { no: d.no, name: d.name, disc: d.disc, type: d.type, wbs: d.wbs, w: d.w, pola: d.pola, m: d.m, p: d.p, note: d.note };
    if (d.batal) o.batal = true;
    const w = engPolaW_(P, d.pola); if (w) o.pw = w;
    return o;
  });
}

function engParamsOf_(store, pid, rev) {
  const r = (store.revisions[pid] || []).find(function(x) { return x.rev === rev; });
  const P = r && r.params ? r.params : null;
  if (!P) throw new Error('Parameter baseline revisi ' + rev + ' tidak ditemukan di sheet ' + ENG.SHEETS.REVISI[0] + '.');
  P.porsi = Number(P.porsi); P.durasi = Number(P.durasi);
  return P;
}

function engStateOf_(store, pid) { return store.real[pid] || null; }

/** Lengkapi header sheet lama dengan kolom baru (mis. STATUS di ENG_BASELINE). */
function engEnsureHeader_(def) {
  const sh = engSheet_(def, true), n = def[1].length;
  const cur = sh.getRange(1, 1, 1, Math.max(n, sh.getLastColumn())).getValues()[0].map(function(x) { return String(x).trim(); });
  def[1].forEach(function(h, i) { if (cur[i] !== h && !cur[i]) sh.getRange(1, i + 1).setValue(h).setFontWeight('bold').setBackground('#0F2B46').setFontColor('#FFFFFF'); });
}

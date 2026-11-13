/**
 * LAMPIRAN DOKUMEN ENGINEERING (scan dokumen terbit / lembar persetujuan / transmittal)
 *
 * - Lampiran menempel pada dokumen + tahap (IFR / IFA / IFC / IFI).
 * - Dua cara: tempel link (https) atau unggah file ke folder Google Drive tim proyek.
 * - Folder Drive diatur per proyek oleh ADMIN (sheet ENG_DRIVE). Folder harus dibagikan sebagai Editor
 *   ke akun yang menjalankan web app (pemilik script). File unggahan dibuat "siapa pun yang punya link dapat melihat".
 * - Data lampiran di sheet ENG_LAMPIRAN. Hapus = status DIHAPUS + file Drive dipindah ke Trash.
 */
const ENGF = {
  SHEET: ['ENG_LAMPIRAN', ['ID', 'PROYEK_ID', 'NOMOR_DOKUMEN', 'TAHAP', 'JENIS', 'KIRIM_KE', 'SUMBER', 'URL', 'FILE_ID', 'NAMA_FILE', 'UKURAN', 'CATATAN', 'STATUS', 'DIUNGGAH_OLEH', 'DIUNGGAH_PADA']],
  DRIVE: ['ENG_DRIVE', ['PROYEK_ID', 'FOLDER_ID', 'NAMA_FOLDER', 'URL', 'DIATUR_OLEH', 'DIATUR']],
  STAGES: ['IFR', 'IFA', 'IFC', 'IFI'],
  KINDS: { TERBIT: 'Dokumen terbit', PERSETUJUAN: 'Lembar persetujuan / komentar', TRANSMITTAL: 'Transmittal', LAINNYA: 'Lainnya' },
  MAX_BYTES: 20 * 1024 * 1024,
  MIME: ['application/pdf', 'image/jpeg', 'image/png']
};

/** Lampiran + folder Drive satu proyek (dipanggil dari getEngineeringData). */
function engFilesView_(pid) {
  const drive = engDriveOf_(pid);
  let owner = '';
  try { owner = Session.getEffectiveUser().getEmail(); } catch (e) { owner = ''; }
  return { drive: drive, scriptAccount: owner, kinds: ENGF.KINDS, maxMb: ENGF.MAX_BYTES / 1048576, list: engFilesOf_(pid) };
}

/** ADMIN: atur folder Google Drive tim proyek (link atau ID folder). */
function setEngDriveFolder(token, projectId, folderRef) {
  const ctx = engAdminCtx_(token, projectId);
  engSetDrive_(ctx.p.id, ctx.user, folderRef);
  return engFilesView_(ctx.p.id);
}
/** Simpan folder Google Drive tim proyek (dipakai Engineering, Pelaporan Manajemen, Galeri Foto). Cek akses tulis akun web app. */
function engSetDrive_(pid, user, folderRef) {
  const m = String(folderRef || '').match(/folders\/([A-Za-z0-9_-]{10,})/) || String(folderRef || '').match(/[?&]id=([A-Za-z0-9_-]{10,})/) || String(folderRef || '').trim().match(/^([A-Za-z0-9_-]{10,})$/);
  if (!m) throw new Error('Tempel link folder Google Drive (https://drive.google.com/drive/folders/…).');
  let folder;
  try { folder = DriveApp.getFolderById(m[1]); folder.getName(); } catch (e) { throw new Error('Folder tidak bisa dibuka oleh akun web app. Bagikan folder ke akun tersebut sebagai Editor, lalu coba lagi.'); }
  let probe = null;
  try { probe = folder.createFile('cek-akses-dashboard.txt', 'uji tulis', MimeType.PLAIN_TEXT); }
  catch (e) { throw new Error('Akun web app (' + engScriptAccount_() + ') belum bisa menulis ke folder ini: ' + e.message + ' Pastikan akun tersebut ditambahkan sebagai Editor (bukan hanya lewat link).'); }
  try { probe.setTrashed(true); } catch (e) { /* file uji tidak bisa dibuang: abaikan, akses tulis sudah terbukti */ }
  const sh = engSheet_(ENGF.DRIVE, true);
  const line = [pid, folder.getId(), folder.getName(), folder.getUrl(), user.username || user.name || '', new Date()];
  const n = sh.getLastRow();
  if (n >= 2) {
    const ids = sh.getRange(2, 1, n - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) if (String(ids[i][0]).trim().toUpperCase() === pid) { sh.getRange(i + 2, 1, 1, line.length).setValues([line]); return { id: folder.getId(), name: folder.getName(), url: folder.getUrl() }; }
  }
  sh.appendRow(line);
  return { id: folder.getId(), name: folder.getName(), url: folder.getUrl() };
}

function engScriptAccount_() { try { return Session.getEffectiveUser().getEmail(); } catch (e) { return 'pemilik script'; } }

/** ADMIN: tambah lampiran berupa link. */
function addEngLink(token, projectId, a) {
  const ctx = engAdminCtx_(token, projectId);
  const r = engCheckTarget_(ctx, a);
  const url = String(a.url || '').trim();
  if (!/^https:\/\/\S+$/i.test(url)) throw new Error('Link harus diawali https://');
  engAppendFile_([Utilities.getUuid().slice(0, 8).toUpperCase(), ctx.p.id, r.no, r.stage, r.kind, r.send, 'LINK', url, '', String(a.name || '').trim().slice(0, 200) || url.replace(/^https:\/\//, '').slice(0, 80), '', String(a.note || '').trim().slice(0, 500), 'AKTIF', ctx.user.username || ctx.user.name || '', new Date()]);
  return engFilesView_(ctx.p.id);
}

/** ADMIN: unggah file (base64) ke folder Drive tim proyek. */
function uploadEngFile(token, projectId, a) {
  const ctx = engAdminCtx_(token, projectId);
  const r = engCheckTarget_(ctx, a);
  const drive = engDriveOf_(ctx.p.id);
  if (!drive) throw new Error('Folder Google Drive tim proyek belum diatur. Atur di tab Setup baseline › Folder Google Drive.');
  const mime = String(a.mime || '').toLowerCase();
  if (ENGF.MIME.indexOf(mime) < 0) throw new Error('Format file harus PDF, JPG atau PNG.');
  const bytes = Utilities.base64Decode(String(a.base64 || ''));
  if (!bytes.length) throw new Error('File kosong.');
  if (bytes.length > ENGF.MAX_BYTES) throw new Error('Ukuran file melebihi ' + (ENGF.MAX_BYTES / 1048576) + ' MB. Gunakan tempel link untuk file besar.');
  const base = engFindDoc_(ctx, r.no);
  let folder;
  try { folder = DriveApp.getFolderById(drive.id); } catch (e) { throw new Error('Folder Google Drive tim proyek tidak bisa dibuka. Periksa akses folder.'); }
  folder = engSubFolder_(engSubFolder_(engSubFolder_(engSubFolder_(folder, ctx.p.id), 'Engineering'), base.disc || 'UMUM'), r.no.replace(/[\\/:*?"<>|]+/g, '-'));
  const ext = mime === 'application/pdf' ? '.pdf' : mime === 'image/png' ? '.png' : '.jpg';
  const day = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  let name = r.no + '_' + r.stage + '_K' + r.send + '_' + (r.kind === 'TERBIT' ? '' : r.kind + '_') + day + ext;
  name = name.replace(/[\\/:*?"<>|]+/g, '-');
  const file = folder.createFile(Utilities.newBlob(bytes, mime, name));
  file.setDescription('Lampiran engineering ' + r.no + ' · ' + r.stage + ' · ' + ENGF.KINDS[r.kind] + ' · diunggah ' + (ctx.user.name || ctx.user.username || '') + ' lewat dashboard PMO');
  let sharing = 'ANYONE';
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (e) { try { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); sharing = 'DOMAIN'; } catch (e2) { sharing = 'FOLDER'; } }
  engAppendFile_([Utilities.getUuid().slice(0, 8).toUpperCase(), ctx.p.id, r.no, r.stage, r.kind, r.send, 'UNGGAH', file.getUrl(), file.getId(), name, bytes.length, String(a.note || '').trim().slice(0, 500), 'AKTIF', ctx.user.username || ctx.user.name || '', new Date()]);
  const out = engFilesView_(ctx.p.id);
  out.sharing = sharing;
  return out;
}

/** ADMIN: hapus lampiran (file unggahan dipindah ke Trash Drive). */
function deleteEngAttachment(token, projectId, id) {
  const ctx = engAdminCtx_(token, projectId);
  const sh = engSheet_(ENGF.SHEET, false);
  if (!sh) throw new Error('Lampiran tidak ditemukan.');
  const v = sh.getDataRange().getValues();
  const h = v[0].map(function(x) { return String(x).trim().toUpperCase(); });
  const c = function(k) { return h.indexOf(k); };
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][c('ID')]) === String(id) && String(v[i][c('PROYEK_ID')]).toUpperCase() === ctx.p.id) {
      const fid = String(v[i][c('FILE_ID')] || '');
      if (fid) { try { DriveApp.getFileById(fid).setTrashed(true); } catch (e) { /* file sudah tidak ada */ } }
      sh.getRange(i + 1, c('STATUS') + 1).setValue('DIHAPUS');
      return engFilesView_(ctx.p.id);
    }
  }
  throw new Error('Lampiran tidak ditemukan.');
}

// ---------- helper ----------
function engCheckTarget_(ctx, a) {
  a = a || {};
  const no = String(a.no || '').trim(), stage = String(a.stage || '').toUpperCase(), kind = String(a.kind || 'TERBIT').toUpperCase();
  if (ENGF.STAGES.indexOf(stage) < 0) throw new Error('Tahap tidak dikenal.');
  if (!ENGF.KINDS[kind]) throw new Error('Jenis lampiran tidak dikenal.');
  const d = engFindDoc_(ctx, no);
  if (d.pw && !(d.pw[ENGF.STAGES.indexOf(stage)] > 0)) throw new Error('Pola ' + d.pola + ' tidak memakai tahap ' + stage + '.');
  const send = Math.max(1, Math.min(20, Math.round(Number(a.send) || 1)));
  return { no: no, stage: stage, kind: kind, send: send };
}

function engFindDoc_(ctx, no) {
  const store = engStore_();
  const set = store.setting[ctx.p.id];
  if (!set || set.rev === null) throw new Error('Baseline engineering belum disimpan.');
  const d = engBaselineOf_(store, ctx.p.id, set.rev).find(function(x) { return x.no === no; });
  if (!d) throw new Error('Dokumen ' + no + ' tidak ada di baseline aktif.');
  return d;
}

function engSubFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function engAppendFile_(line) {
  const sh = engSheet_(ENGF.SHEET, true);
  const r = sh.getLastRow() + 1;
  sh.getRange(r, 1, 1, line.length).setNumberFormat('@');
  sh.getRange(r, 15).setNumberFormat('dd/MM/yyyy HH:mm');
  sh.getRange(r, 1, 1, line.length).setValues([line]);
}

function engDriveOf_(pid) {
  const rows = engRead_(ENGF.DRIVE).filter(function(r) { return String(r.PROYEK_ID || '').trim().toUpperCase() === pid; });
  if (!rows.length || !rows[rows.length - 1].FOLDER_ID) return null;
  const r = rows[rows.length - 1];
  return { id: String(r.FOLDER_ID), name: String(r.NAMA_FOLDER || ''), url: String(r.URL || ''), by: userDisplayName_(r.DIATUR_OLEH) };
}

function engFilesOf_(pid) {
  const fmt = function(v) { return v instanceof Date && !isNaN(v) ? formatDateId_(v) + ' ' + String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0') : String(v || ''); };
  return engRead_(ENGF.SHEET).filter(function(r) { return String(r.PROYEK_ID || '').trim().toUpperCase() === pid && String(r.STATUS || 'AKTIF').toUpperCase() === 'AKTIF'; })
    .map(function(r) {
      return { id: String(r.ID), no: String(r.NOMOR_DOKUMEN || '').trim(), stage: String(r.TAHAP || '').toUpperCase(), kind: String(r.JENIS || 'TERBIT').toUpperCase(), send: Number(r.KIRIM_KE) || 1,
        src: String(r.SUMBER || 'LINK').toUpperCase(), url: String(r.URL || ''), name: String(r.NAMA_FILE || ''), size: Number(r.UKURAN) || 0, note: String(r.CATATAN || ''), by: userDisplayName_(r.DIUNGGAH_OLEH), at: fmt(r.DIUNGGAH_PADA) };
    });
}

// ===================== LINK MASSAL (template Excel / pindai folder Drive) =====================

/** Periksa link massal. payload: {source:'EXCEL', info, rows:[{row,no,links:{IFR_TERBIT:url,…}}]} | {source:'DRIVE', items:[{no,stage,kind,url,name}]} */
function checkEngLinks(token, projectId, payload) {
  const ctx = engAdminCtx_(token, projectId);
  const res = engLinksPlan_(ctx, payload);
  delete res.items;
  return res;
}

/** Simpan link massal: link baru menggantikan link lama (sumber LINK) untuk dokumen + tahap + jenis yang sama. */
function saveEngLinks(token, projectId, payload) {
  const ctx = engAdminCtx_(token, projectId);
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const plan = engLinksPlan_(ctx, payload);
    if (plan.errors.length) return { success: false, check: plan };
    const sh = engSheet_(ENGF.SHEET, true);
    const by = ctx.user.username || ctx.user.name || '', now = new Date();
    // tandai link lama yang diganti
    const replaceIds = {};
    plan.items.forEach(function(x) { (x.oldIds || []).forEach(function(id) { replaceIds[id] = true; }); });
    if (Object.keys(replaceIds).length && sh.getLastRow() >= 2) {
      const v = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
      const h = v[0].map(function(x) { return String(x).trim().toUpperCase(); });
      const cId = h.indexOf('ID'), cSt = h.indexOf('STATUS');
      const col = v.slice(1).map(function(r) { return [replaceIds[String(r[cId])] ? 'DIGANTI' : r[cSt]]; });
      sh.getRange(2, cSt + 1, col.length, 1).setValues(col);
    }
    const lines = plan.items.filter(function(x) { return x.action !== 'same'; }).map(function(x) {
      return [Utilities.getUuid().slice(0, 8).toUpperCase(), ctx.p.id, x.no, x.stage, x.kind, 1, 'LINK', x.url, '', (x.name || x.url.replace(/^https:\/\//, '')).slice(0, 200), '', payload && payload.source === 'DRIVE' ? 'Dari pindai folder Drive' : 'Dari template link', 'AKTIF', by, now];
    });
    if (lines.length) {
      const r = sh.getLastRow() + 1;
      sh.getRange(r, 1, lines.length, lines[0].length).setNumberFormat('@');
      sh.getRange(r, 15, lines.length, 1).setNumberFormat('dd/MM/yyyy HH:mm');
      sh.getRange(r, 1, lines.length, lines[0].length).setValues(lines);
    }
    const out = engFilesView_(ctx.p.id);
    out.saved = { add: plan.summary.add, replace: plan.summary.replace, same: plan.summary.same };
    return { success: true, files: out };
  } finally {
    lock.releaseLock();
  }
}

/** Pindai folder Drive (beserta subfolder) dan cocokkan nama file dengan nomor dokumen baseline. */
function scanEngDriveFolder(token, projectId, folderRef) {
  const ctx = engAdminCtx_(token, projectId);
  const m = String(folderRef || '').match(/folders\/([A-Za-z0-9_-]{10,})/) || String(folderRef || '').match(/[?&]id=([A-Za-z0-9_-]{10,})/) || String(folderRef || '').trim().match(/^([A-Za-z0-9_-]{10,})$/);
  if (!m) throw new Error('Tempel link folder Google Drive (https://drive.google.com/drive/folders/…).');
  let root;
  try { root = DriveApp.getFolderById(m[1]); root.getName(); } catch (e) { throw new Error('Folder tidak bisa dibuka oleh akun web app. Bagikan folder (minimal Viewer) ke akun tersebut.'); }
  const base = engFindBase_(ctx);
  const keyOf = function(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, ''); };
  const docs = base.map(function(d) { return { d: d, k: keyOf(d.no) }; }).filter(function(x) { return x.k.length >= 4; }).sort(function(a, b) { return b.k.length - a.k.length; });
  const started = Date.now(), MAX = 3000;
  let scanned = 0, truncated = false;
  const found = {}, unmatched = [], noStage = [];
  const walk = function(folder, path, depth) {
    if (truncated) return;
    const files = folder.getFiles();
    while (files.hasNext()) {
      if (scanned >= MAX || Date.now() - started > 240000) { truncated = true; return; }
      const f = files.next(); scanned++;
      const name = f.getName(), nk = keyOf(name), full = (path + ' ' + name).toUpperCase();
      const hit = docs.find(function(x) { return nk.indexOf(x.k) === 0; }) || docs.find(function(x) { return keyOf(path.split('/').pop()) === x.k; });
      if (!hit) { if (unmatched.length < 30) unmatched.push(name); continue; }
      const d = hit.d;
      if (/TRANSMIT/.test(full)) continue;
      const used = ENGF.STAGES.filter(function(k, i) { return !d.pw || d.pw[i] > 0; });
      let stage = used.length === 1 ? used[0] : ((full.match(/(?:^|[^A-Z])(IFR|IFA|IFC|IFI)(?:[^A-Z]|$)/) || [])[1] || '');
      if (stage && used.indexOf(stage) < 0) stage = '';
      if (!stage) { if (noStage.length < 30) noStage.push(name); continue; }
      const kind = /PERSETUJUAN|APPROV|KOMENTAR|COMMENT|CODE|KODE|CRS/.test(full) && !/TRANSMIT/.test(full) ? 'PERSETUJUAN' : /TRANSMIT/.test(full) ? 'TRANSMITTAL' : 'TERBIT';
      if (kind === 'TRANSMITTAL') continue;
      const key = d.no + '|' + stage + '|' + kind, upd = f.getLastUpdated();
      if (!found[key] || upd > found[key].upd) found[key] = { no: d.no, stage: stage, kind: kind, url: f.getUrl(), name: name, upd: upd, dup: found[key] ? (found[key].dup || 1) + 1 : 0 };
    }
    if (depth >= 6) return;
    const subs = folder.getFolders();
    while (subs.hasNext() && !truncated) { const s = subs.next(); walk(s, path + '/' + s.getName(), depth + 1); }
  };
  walk(root, root.getName(), 0);
  const items = Object.keys(found).map(function(k) { const x = found[k]; return { no: x.no, stage: x.stage, kind: x.kind, url: x.url, name: x.name, dup: x.dup }; });
  return { folder: root.getName(), scanned: scanned, truncated: truncated, items: items, unmatched: unmatched, noStage: noStage };
}

// ---------- helper link massal ----------
function engFindBase_(ctx) {
  const store = engStore_();
  const set = store.setting[ctx.p.id];
  if (!set || set.rev === null) throw new Error('Baseline engineering belum disimpan.');
  return engBaselineOf_(store, ctx.p.id, set.rev);
}

function engLinksPlan_(ctx, payload) {
  payload = payload || {};
  const I = engIssues_();
  (payload.parseErrors || []).forEach(function(e) { I.add('error', 'parse:' + e, e); });
  const store = engStore_();
  const set = store.setting[ctx.p.id];
  if (!set || set.rev === null) { I.add('error', 'nobase', 'Baseline engineering belum disimpan.'); return { errors: I.list('error'), warnings: [], summary: {}, changes: [], items: [] }; }
  const base = engBaselineOf_(store, ctx.p.id, set.rev), byNo = {};
  base.forEach(function(d) { byNo[d.no] = d; });
  let raw = [];
  if (payload.source === 'DRIVE') raw = (payload.items || []).map(function(x) { return { no: x.no, stage: String(x.stage || '').toUpperCase(), kind: String(x.kind || 'TERBIT').toUpperCase(), url: String(x.url || '').trim(), name: x.name || '', where: x.no }; });
  else {
    const pi = payload.info || {};
    if (normKey_(pi.projectId) !== ctx.p.id) I.add('error', 'pid', 'PROYEK_ID di file (' + (pi.projectId || 'kosong') + ') tidak sama dengan proyek yang dibuka (' + ctx.p.id + ').');
    if (pi.rev !== undefined && Number(pi.rev) !== set.rev) I.add('warn', 'rev', 'Template dibuat dari baseline revisi ' + pi.rev + '; baseline aktif revisi ' + set.rev + '. Dokumen yang sudah tidak ada akan ditolak.');
    (payload.rows || []).forEach(function(r) {
      Object.keys(r.links || {}).forEach(function(k) { const p = k.split('_'); raw.push({ no: String(r.no || '').trim(), stage: p[0], kind: p[1], url: String(r.links[k] || '').trim(), name: '', where: r.no + ' ' + k.replace('_', ' ') }); });
    });
  }
  // link lama per dokumen|tahap|jenis
  const old = {};
  engFilesOf_(ctx.p.id).forEach(function(f) { if (f.src === 'LINK') (old[f.no + '|' + f.stage + '|' + f.kind] = old[f.no + '|' + f.stage + '|' + f.kind] || []).push(f); });
  const items = [], seen = {};
  raw.forEach(function(x) {
    const d = byNo[x.no];
    if (!d) { I.add('error', 'nodoc', 'Nomor dokumen tidak ada di baseline aktif.', x.no); return; }
    if (!/^https:\/\/\S+$/i.test(x.url)) { I.add('error', 'url', 'Link harus diawali https:// (tanpa spasi).', x.where); return; }
    if (d.pw && !(d.pw[ENGF.STAGES.indexOf(x.stage)] > 0)) { I.add('error', 'stage', 'Tahap tidak dipakai pola dokumen.', x.where + ' (' + d.pola + ')'); return; }
    if (!ENGF.KINDS[x.kind]) { I.add('error', 'kind', 'Jenis lampiran tidak dikenal.', x.where); return; }
    const key = x.no + '|' + x.stage + '|' + x.kind;
    if (seen[key]) { I.add('warn', 'dupkey', 'Dokumen + tahap + jenis muncul lebih dari sekali; yang terakhir dipakai.', x.where); }
    seen[key] = true;
    const prev = old[key] || [];
    const same = prev.some(function(f) { return f.url === x.url; }) && prev.length === 1;
    items.push({ no: x.no, stage: x.stage, kind: x.kind, url: x.url, name: x.name, action: same ? 'same' : (prev.length ? 'replace' : 'add'), oldIds: same ? [] : prev.map(function(f) { return f.id; }), oldUrl: prev.length ? prev[0].url : '' });
  });
  // jika key ganda, pakai yang terakhir
  const last = {};
  items.forEach(function(x, i) { last[x.no + '|' + x.stage + '|' + x.kind] = i; });
  const final = items.filter(function(x, i) { return last[x.no + '|' + x.stage + '|' + x.kind] === i; });
  if (payload.source === 'DRIVE') (payload.items || []).forEach(function(x) { if (x.dup) I.add('warn', 'dup', 'Ada beberapa file untuk dokumen + tahap + jenis yang sama; dipakai file terbaru.', x.no + ' ' + x.stage); });
  const sum = { add: 0, replace: 0, same: 0, docs: 0 };
  const docsHit = {};
  final.forEach(function(x) { sum[x.action]++; docsHit[x.no] = true; });
  sum.docs = Object.keys(docsHit).length;
  const order = { replace: 0, add: 1, same: 2 };
  const changes = final.slice().sort(function(a, b) { return order[a.action] - order[b.action]; }).slice(0, 300).map(function(x) { return { no: x.no, stage: x.stage, kind: x.kind, url: x.url, name: x.name, action: x.action, oldUrl: x.oldUrl }; });
  return { errors: I.list('error'), warnings: I.list('warn'), summary: sum, changes: changes, total: final.length, items: final };
}

// ===================== PRATINJAU LAMPIRAN =====================
// IFRAME : file Drive yang dibagikan "siapa pun yang punya link" (atau tidak terbaca akun web app) → pratinjau Google Drive.
// PROXY  : file Drive dengan akses terbatas → dibaca lewat akun web app lalu ditampilkan dashboard (PDF / gambar / Google Docs diekspor PDF).
// LINK   : bukan file Google Drive → hanya tombol buka di tab baru.
const ENGP = {
  MAX_BYTES: 15 * 1024 * 1024,
  RAW: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  GDOC: ['application/vnd.google-apps.document', 'application/vnd.google-apps.spreadsheet', 'application/vnd.google-apps.presentation', 'application/vnd.google-apps.drawing']
};

/** Info pratinjau satu lampiran. Untuk mode PROXY, isi file ikut dikirim (base64). Bisa dipanggil semua pengguna yang punya akses proyek. */
function getEngFilePreview(token, projectId, attId) {
  const ctx = engViewCtx_(token, projectId);
  const a = engAttOf_(ctx.p.id, attId);
  if (!a.fileId) return { id: attId, mode: 'LINK', url: a.url };
  const out = { id: attId, url: a.url, fileId: a.fileId, previewUrl: 'https://drive.google.com/file/d/' + a.fileId + '/preview' };
  let f;
  try { f = DriveApp.getFileById(a.fileId); out.name = f.getName(); } catch (e) { out.mode = 'IFRAME'; out.access = 'UNKNOWN'; return out; }
  let access = '';
  try { access = String(f.getSharingAccess()); } catch (e) { access = ''; }
  const mime = String(f.getMimeType() || ''), size = Number(f.getSize()) || 0;
  out.mime = mime; out.size = size; out.access = access;
  if (access === 'ANYONE_WITH_LINK' || access === 'ANYONE') { out.mode = 'IFRAME'; return out; }
  const gdoc = ENGP.GDOC.indexOf(mime) >= 0;
  if (ENGP.RAW.indexOf(mime) < 0 && !gdoc) { out.mode = 'IFRAME'; out.why = 'FORMAT'; return out; }
  if (size > ENGP.MAX_BYTES) { out.mode = 'IFRAME'; out.why = 'SIZE'; return out; }
  let blob;
  try { blob = gdoc ? f.getAs('application/pdf') : f.getBlob(); } catch (e) { out.mode = 'IFRAME'; out.why = 'READ'; return out; }
  const bytes = blob.getBytes();
  if (bytes.length > ENGP.MAX_BYTES) { out.mode = 'IFRAME'; out.why = 'SIZE'; return out; }
  out.mode = 'PROXY';
  out.dataMime = gdoc ? 'application/pdf' : mime;
  out.base64 = Utilities.base64Encode(bytes);
  return out;
}

function engViewCtx_(token, projectId) {
  const user = requireUser_(token);
  const db = loadDb_();
  const id = normKey_(projectId);
  const p = db.allProjects.find(function(x) { return x.id === id; }) || findProject_(db.allProjects, projectId);
  if (!p) throw new Error('Proyek tidak ditemukan.');
  if (!userCanAccess_(user, p)) throw new Error('Akun Anda tidak memiliki akses ke proyek ' + p.name + '.');
  return { user: user, p: p };
}

function engDriveIdOf_(url) {
  const s = String(url || '');
  if (!/^https:\/\/(drive|docs)\.google\.com\//i.test(s)) return '';
  const m = s.match(/\/d\/([A-Za-z0-9_-]{20,})/) || s.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  return m ? m[1] : '';
}

function engAttOf_(pid, attId) {
  const r = engRead_(ENGF.SHEET).find(function(x) { return String(x.ID) === String(attId) && String(x.PROYEK_ID || '').trim().toUpperCase() === pid && String(x.STATUS || 'AKTIF').toUpperCase() === 'AKTIF'; });
  if (!r) throw new Error('Lampiran tidak ditemukan atau sudah dihapus.');
  return { url: String(r.URL || ''), fileId: String(r.FILE_ID || '') || engDriveIdOf_(r.URL), name: String(r.NAMA_FILE || '') };
}

// ===================== ARSIP DOKUMEN FINAL (IFC / IFI) =====================
// Arsip = salinan file final (IFC & IFI: dokumen terbit + lembar persetujuan) di folder Drive tim proyek:
//   <folder tim> › <PROYEK_ID> › Arsip › ARSIP_ENGINEERING_<PROYEK>_<yyyyMMdd-HHmm> › <Disiplin> › <Nomor dokumen> › file
// Proses bertahap (runEngArchive dipanggil berulang dari dashboard) agar tidak melewati batas waktu Apps Script.
const ENGA = {
  SHEET: ['ENG_ARSIP', ['ID', 'PROYEK_ID', 'NAMA', 'FOLDER_ID', 'URL', 'STATUS', 'TOTAL', 'DISALIN', 'GAGAL', 'REGISTER_URL', 'DIBUAT_OLEH', 'DIBUAT_PADA', 'SELESAI_PADA']],
  ITEMS: ['ENG_ARSIP_ISI', ['ARSIP_ID', 'LAMPIRAN_ID', 'NOMOR_DOKUMEN', 'TAHAP', 'JENIS', 'STATUS', 'FILE_ID', 'URL', 'NAMA_FILE', 'KETERANGAN', 'WAKTU']],
  STAGES: ['IFC', 'IFI'], KINDS: ['TERBIT', 'PERSETUJUAN'],
  BATCH_MS: 240000, MAX_ZIP_FILE: 25 * 1024 * 1024
};

/** Ringkasan arsip untuk halaman (ADMIN). */
function getEngArchive(token, projectId) {
  const ctx = engAdminCtx_(token, projectId);
  return engArchiveView_(ctx);
}

/** Mulai arsip baru (atau kembalikan arsip yang masih berjalan). */
function startEngArchive(token, projectId) {
  const ctx = engAdminCtx_(token, projectId);
  const lock = pmoLock_('EPCENG'); lock.waitLock(30000);
  try {
    const running = engArchives_(ctx.p.id).filter(function(a) { return a.status === 'PROSES'; })[0];
    if (running) return engArchiveView_(ctx);
    const drive = engDriveOf_(ctx.p.id);
    if (!drive) throw new Error('Folder Google Drive tim proyek belum diatur (Setup baseline › Folder Google Drive).');
    let root;
    try { root = DriveApp.getFolderById(drive.id); } catch (e) { throw new Error('Folder Google Drive tim proyek tidak bisa dibuka akun web app.'); }
    const files = engFinalFiles_(ctx);
    if (!files.length) throw new Error('Belum ada lampiran IFC / IFI untuk diarsipkan.');
    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmm');
    const name = 'ARSIP_ENGINEERING_' + ctx.p.id + '_' + stamp;
    const folder = engSubFolder_(engSubFolder_(root, ctx.p.id), 'Arsip').createFolder(name);
    const id = Utilities.getUuid().slice(0, 8).toUpperCase();
    engAppend_(ENGA.SHEET, [[id, ctx.p.id, name, folder.getId(), folder.getUrl(), 'PROSES', files.length, 0, 0, '', ctx.user.username || ctx.user.name || '', new Date(), '']]);
    return engArchiveView_(ctx);
  } finally { lock.releaseLock(); }
}

/** Salin batch berikutnya. Dipanggil berulang sampai status SELESAI. */
function runEngArchive(token, projectId, archiveId) {
  const ctx = engAdminCtx_(token, projectId);
  const started = Date.now();
  // tidak memakai script lock (penyalinan bisa ±4 menit); cegah dua proses bersamaan lewat cache
  const cache = CacheService.getScriptCache(), key = 'ENGARSIP_' + archiveId;
  if (cache.get(key)) return engArchiveView_(ctx);
  cache.put(key, '1', 300);
  try {
    const a = engArchives_(ctx.p.id).filter(function(x) { return x.id === archiveId; })[0];
    if (!a) throw new Error('Arsip tidak ditemukan.');
    if (a.status !== 'PROSES') return engArchiveView_(ctx);
    const done = {};
    engRead_(ENGA.ITEMS).forEach(function(r) { if (String(r.ARSIP_ID) === archiveId) done[String(r.LAMPIRAN_ID)] = true; });
    const base = engFindBase_(ctx), byNo = {};
    base.forEach(function(d) { byNo[d.no] = d; });
    const folder = DriveApp.getFolderById(a.folderId);
    const lines = [];
    const pending = engFinalFiles_(ctx).filter(function(f) { return !done[f.id]; });
    for (let i = 0; i < pending.length; i++) {
      if (Date.now() - started > ENGA.BATCH_MS) break;
      const f = pending[i], d = byNo[f.no] || {};
      let status = 'OK', fid = '', url = '', fname = '', note = '';
      if (!f.fileId) { status = 'LEWATI'; note = 'Link bukan file Google Drive; tidak bisa disalin.'; }
      else {
        try {
          const src = DriveApp.getFileById(f.fileId);
          const ext = engExtOf_(src.getName(), src.getMimeType());
          fname = (f.no + '_' + f.stage + '_' + (f.kind === 'TERBIT' ? 'Terbit' : 'Persetujuan') + '_K' + f.send + ext).replace(/[\\/:*?"<>|]+/g, '-');
          const sub = engSubFolder_(engSubFolder_(folder, String(d.disc || 'UMUM')), f.no.replace(/[\\/:*?"<>|]+/g, '-'));
          const copy = src.makeCopy(fname, sub);
          fid = copy.getId(); url = copy.getUrl();
        } catch (e) { status = 'GAGAL'; note = 'File tidak bisa dibuka akun web app: ' + String(e && e.message || e).slice(0, 120); }
      }
      lines.push([archiveId, f.id, f.no, f.stage, f.kind, status, fid, url, fname, note, new Date()]);
    }
    engAppend_(ENGA.ITEMS, lines);
    const all = engRead_(ENGA.ITEMS).filter(function(r) { return String(r.ARSIP_ID) === archiveId; });
    const ok = all.filter(function(r) { return r.STATUS === 'OK'; }).length, bad = all.length - ok;
    const finished = all.length >= a.total || pending.length <= lines.length;
    let regUrl = '';
    if (finished) regUrl = engArchiveRegister_(ctx, a, folder, all, byNo);
    engArchiveUpdate_(archiveId, { DISALIN: ok, GAGAL: bad, STATUS: finished ? 'SELESAI' : 'PROSES', REGISTER_URL: regUrl || a.registerUrl, SELESAI_PADA: finished ? new Date() : '' , TOTAL: Math.max(a.total, all.length) });
    return engArchiveView_(ctx);
  } finally { cache.remove(key); }
}

/** ZIP per disiplin: isi satu file final (base64) — ADMIN. */
function getEngFileBytes(token, projectId, attId) {
  const ctx = engAdminCtx_(token, projectId);
  const a = engAttOf_(ctx.p.id, attId);
  if (!a.fileId) return { id: attId, skip: 'Link bukan file Google Drive.' };
  let f;
  try { f = DriveApp.getFileById(a.fileId); f.getName(); } catch (e) { return { id: attId, skip: 'File tidak bisa dibuka akun web app: ' + String(e && e.message || e).slice(0, 160) }; }
  const mime = String(f.getMimeType() || ''), gdoc = ENGP.GDOC.indexOf(mime) >= 0;
  if (!gdoc && Number(f.getSize()) > ENGA.MAX_ZIP_FILE) return { id: attId, skip: 'File lebih dari 25 MB; ambil dari arsip Drive.', size: Number(f.getSize()) };
  const blob = gdoc ? f.getAs('application/pdf') : f.getBlob();
  const ext = gdoc ? '.pdf' : engExtOf_(f.getName(), mime);
  return { id: attId, name: f.getName(), ext: ext, base64: Utilities.base64Encode(blob.getBytes()) };
}

// ---------- helper arsip ----------
/** Ekstensi file: dari nama bila ada, bila tidak dari jenis file (MIME) — banyak file kontraktor tersimpan tanpa ".pdf". */
function engExtOf_(name, mime) {
  const m = String(name || '').match(/\.([A-Za-z0-9]{2,5})$/);
  const known = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/tiff': '.tif', 'image/bmp': '.bmp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx', 'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx', 'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx', 'application/zip': '.zip', 'application/x-zip-compressed': '.zip',
    'image/vnd.dwg': '.dwg', 'application/acad': '.dwg', 'image/vnd.dxf': '.dxf', 'text/plain': '.txt', 'text/csv': '.csv' };
  const byMime = known[String(mime || '').toLowerCase()] || '';
  if (m && (!byMime || /^(pdf|jpe?g|png|gif|webp|tiff?|bmp|docx?|xlsx?|pptx?|zip|dwg|dxf|txt|csv|rar|7z)$/i.test(m[1]))) return '.' + m[1].toLowerCase();
  return byMime;
}

function engFinalFiles_(ctx) {
  return engRead_(ENGF.SHEET).filter(function(r) {
    return String(r.PROYEK_ID || '').trim().toUpperCase() === ctx.p.id && String(r.STATUS || 'AKTIF').toUpperCase() === 'AKTIF' &&
      ENGA.STAGES.indexOf(String(r.TAHAP || '').toUpperCase()) >= 0 && ENGA.KINDS.indexOf(String(r.JENIS || '').toUpperCase()) >= 0;
  }).map(function(r) {
    return { id: String(r.ID), no: String(r.NOMOR_DOKUMEN || '').trim(), stage: String(r.TAHAP).toUpperCase(), kind: String(r.JENIS).toUpperCase(), send: Number(r.KIRIM_KE) || 1,
      src: String(r.SUMBER || 'LINK').toUpperCase(), url: String(r.URL || ''), fileId: String(r.FILE_ID || '') || engDriveIdOf_(r.URL) };
  });
}

function engArchives_(pid) {
  const fmt = function(v) { return v instanceof Date && !isNaN(v) ? formatDateId_(v) + ' ' + String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0') : String(v || ''); };
  return engRead_(ENGA.SHEET).filter(function(r) { return String(r.PROYEK_ID || '').toUpperCase() === pid; }).map(function(r) {
    return { id: String(r.ID), name: String(r.NAMA || ''), folderId: String(r.FOLDER_ID || ''), url: String(r.URL || ''), status: String(r.STATUS || ''), total: Number(r.TOTAL) || 0,
      copied: Number(r.DISALIN) || 0, failed: Number(r.GAGAL) || 0, registerUrl: String(r.REGISTER_URL || ''), by: userDisplayName_(r.DIBUAT_OLEH), at: fmt(r.DIBUAT_PADA), doneAt: fmt(r.SELESAI_PADA) };
  });
}

function engArchiveUpdate_(id, patch) {
  const sh = engSheet_(ENGA.SHEET, true);
  const v = sh.getDataRange().getValues(), h = v[0].map(function(x) { return String(x).trim().toUpperCase(); });
  for (let i = 1; i < v.length; i++) if (String(v[i][0]) === id) {
    Object.keys(patch).forEach(function(k) { const c = h.indexOf(k); if (c >= 0) sh.getRange(i + 1, c + 1).setValue(patch[k]); });
    return;
  }
}

function engArchiveView_(ctx) {
  const files = engFinalFiles_(ctx), base = engFindBase_(ctx), byNo = {};
  base.forEach(function(d) { byNo[d.no] = d; });
  const disc = {};
  base.forEach(function(d) { const k = d.disc || 'UMUM'; disc[k] = disc[k] || { name: k, docs: 0, withFinal: 0, files: 0, drive: 0, ids: [] }; disc[k].docs++; });
  const hasFinal = {};
  files.forEach(function(f) {
    const d = byNo[f.no]; if (!d) return;
    const k = d.disc || 'UMUM'; disc[k].files++; if (f.fileId) { disc[k].drive++; disc[k].ids.push(f.id); }
    if (f.kind === 'TERBIT') hasFinal[f.no] = true;
  });
  Object.keys(hasFinal).forEach(function(no) { const d = byNo[no]; if (d) disc[d.disc || 'UMUM'].withFinal++; });
  const list = engArchives_(ctx.p.id).reverse();
  let failedItems = [];
  const last = list[0];
  if (last && last.failed) failedItems = engRead_(ENGA.ITEMS).filter(function(r) { return String(r.ARSIP_ID) === last.id && r.STATUS !== 'OK'; }).slice(0, 50)
    .map(function(r) { return { no: String(r.NOMOR_DOKUMEN), stage: String(r.TAHAP), kind: String(r.JENIS), status: String(r.STATUS), note: String(r.KETERANGAN || '') }; });
  return { drive: engDriveOf_(ctx.p.id), totalFiles: files.length, driveFiles: files.filter(function(f) { return !!f.fileId; }).length, docs: base.length,
    docsWithFinal: Object.keys(hasFinal).length, disciplines: Object.keys(disc).sort().map(function(k) { return disc[k]; }), archives: list.slice(0, 10), failedItems: failedItems };
}

/** Register dokumen (Google Sheet) di folder arsip. */
function engArchiveRegister_(ctx, a, folder, items, byNo) {
  try {
    const ss = SpreadsheetApp.create('REGISTER_' + a.name);
    const sh = ss.getSheets()[0]; sh.setName('REGISTER');
    const head = ['NO', 'NOMOR_DOKUMEN', 'NAMA_DOKUMEN', 'DISIPLIN', 'POLA', 'TAHAP', 'JENIS', 'KIRIM_KE', 'STATUS_ARSIP', 'FILE_ARSIP', 'KETERANGAN'];
    const rows = items.slice().sort(function(x, y) { return String(x.NOMOR_DOKUMEN).localeCompare(String(y.NOMOR_DOKUMEN)) || String(x.TAHAP).localeCompare(String(y.TAHAP)); })
      .map(function(r, i) { const d = byNo[String(r.NOMOR_DOKUMEN)] || {};
        return [i + 1, String(r.NOMOR_DOKUMEN), d.name || '', d.disc || '', d.pola || '', String(r.TAHAP), String(r.JENIS) === 'TERBIT' ? 'Dokumen terbit' : 'Lembar persetujuan', '', String(r.STATUS), String(r.URL || ''), String(r.KETERANGAN || '')]; });
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#0F2B46').setFontColor('#FFFFFF');
    if (rows.length) sh.getRange(2, 1, rows.length, head.length).setValues(rows);
    sh.setFrozenRows(1); sh.autoResizeColumns(1, head.length);
    DriveApp.getFileById(ss.getId()).moveTo(folder);
    return ss.getUrl();
  } catch (e) { return ''; }
}

/** Diagnosa: jalankan dari editor Apps Script (Run) untuk memeriksa akses Drive akun web app. Hasil di Execution log. */
function cekAksesDrive() {
  editorOnly_();
  Logger.log('Akun yang menjalankan: ' + Session.getEffectiveUser().getEmail());
  const folderId = '1_f-BbRVBqeRooI2uWpIH-Vv9qD1-T94P';
  const f = DriveApp.getFolderById(folderId);
  Logger.log('Folder terbaca: ' + f.getName());
  try { Logger.log('Pemilik: ' + (f.getOwner() ? f.getOwner().getEmail() : '(Shared drive)')); } catch (e) { Logger.log('Pemilik: tidak terbaca (' + e.message + ')'); }
  try { Logger.log('Akses akun ini: ' + f.getAccess(Session.getEffectiveUser())); } catch (e) { Logger.log('getAccess gagal: ' + e.message); }
  try { Logger.log('Berbagi link: ' + f.getSharingAccess() + ' / ' + f.getSharingPermission()); } catch (e) { Logger.log('Sharing gagal: ' + e.message); }
  try { Logger.log('Editor: ' + f.getEditors().map(function(u) { return u.getEmail(); }).join(', ')); } catch (e) { Logger.log('getEditors gagal: ' + e.message); }
  let t = null;
  try { t = f.createFile('cek-akses-dashboard.txt', 'uji tulis', MimeType.PLAIN_TEXT); Logger.log('Buat file: OK'); } catch (e) { Logger.log('Buat file GAGAL: ' + e.message); }
  if (t) { try { t.setTrashed(true); Logger.log('Hapus file uji: OK'); } catch (e) { Logger.log('Hapus file uji GAGAL: ' + e.message); } }
}

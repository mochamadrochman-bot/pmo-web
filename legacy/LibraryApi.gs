/**
 * Modul 2 · Library & Knowledge
 * Pedoman, prosedur, dan SOP perusahaan (berlaku untuk semua proyek).
 * PDF disimpan di Drive; teks per halaman + daftar bab/pasal disusun di browser
 * (PDF.js) lalu disimpan sebagai file indeks JSON untuk pencarian.
 * Unggah, sunting, dan hapus hanya untuk ADMIN.
 */
const LIB = {
  SHEET: ['LIB_DOKUMEN', ['ID', 'JUDUL', 'KATEGORI', 'REVISI', 'TGL_BERLAKU', 'FILE_ID', 'FILE_URL', 'NAMA_FILE', 'UKURAN', 'HALAMAN',
    'INDEX_ID', 'STATUS', 'JML_BAGIAN', 'KETERANGAN', 'DIUNGGAH_OLEH', 'DIUNGGAH', 'DIPERBARUI', 'POTONGAN']],
  PROP: 'LIBRARY_FOLDER_ID',
  MAX: 30 * 1024 * 1024,
  PART: 5 * 1024 * 1024,
  CATS: ['Pedoman', 'Prosedur', 'SOP', 'Instruksi Kerja', 'Regulasi', 'Lainnya']
};

function libRole_(u) { return String((u && u.role) || '').trim().toUpperCase(); }
function libUser_(token) {
  const u = requireUser_(token);
  if (libRole_(u) === 'KONTRAKTOR') throw new Error('Library & Knowledge hanya untuk tim internal.');
  return u;
}
function libAdmin_(token) {
  const u = libUser_(token);
  if (libRole_(u) !== 'ADMIN') throw new Error('Hanya ADMIN yang dapat mengelola dokumen Library.');
  return u;
}
function libFolder_() {
  const pr = PropertiesService.getScriptProperties();
  const id = pr.getProperty(LIB.PROP);
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed || !f.isTrashed()) return f; } catch (e) {} }
  const f = DriveApp.createFolder('PMO Library & Knowledge');
  pr.setProperty(LIB.PROP, f.getId());
  return f;
}
function libSub_(name) { return engSubFolder_(libFolder_(), name); }
function libNow_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd MMM yyyy HH:mm'); }
function libTxt_(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n || 200); }
function libDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const s = String(v || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}
function libCat_(v) { const s = libTxt_(v, 40); return LIB.CATS.indexOf(s) >= 0 ? s : 'Lainnya'; }

function libAll_() {
  let rows = [];
  try { rows = engRead_(LIB.SHEET); } catch (e) { rows = []; }
  return rows.map(function(r, i) { r._row = i + 2; return r; })
    .filter(function(r) { return r.ID && String(r.STATUS || '').toUpperCase() !== 'DIHAPUS'; });
}
function libFind_(id) {
  const key = String(id || '').trim();
  const r = libAll_().find(function(x) { return String(x.ID) === key; });
  if (!r) throw new Error('Dokumen Library tidak ditemukan atau sudah dihapus.');
  return r;
}
function libView_(r) {
  return {
    id: String(r.ID), title: String(r.JUDUL || ''), category: String(r.KATEGORI || 'Lainnya'), revision: String(r.REVISI || ''),
    effective: libDate_(r.TGL_BERLAKU), fileUrl: String(r.FILE_URL || ''), fileName: String(r.NAMA_FILE || ''),
    size: Number(r.UKURAN) || 0, pages: Number(r.HALAMAN) || 0, status: String(r.STATUS || '').toUpperCase(),
    sections: Number(r.JML_BAGIAN) || 0, note: String(r.KETERANGAN || ''), by: String(r.DIUNGGAH_OLEH || ''),
    at: String(r.DIUNGGAH || ''), updated: String(r.DIPERBARUI || ''), hasIndex: !!r.INDEX_ID
  };
}
function libEnsure_() { lbEnsureHeader_(LIB.SHEET); return engSheet_(LIB.SHEET, true); }

/** Daftar dokumen Library (semua pengguna internal). */
function getLibraryList(token) {
  const u = libUser_(token);
  const docs = libAll_().map(libView_).sort(function(a, b) { return a.category.localeCompare(b.category) || a.title.localeCompare(b.title); });
  return {
    success: true, docs: docs, categories: LIB.CATS, isAdmin: libRole_(u) === 'ADMIN',
    user: { name: u.name || u.username || 'Pengguna', role: libRole_(u) }
  };
}

/** Isi indeks (teks per halaman + bab/pasal) untuk beberapa dokumen sekaligus. */
function getLibraryIndex(token, ids) {
  libUser_(token);
  const want = (Array.isArray(ids) ? ids : [ids]).map(String).slice(0, 12);
  const all = libAll_(), out = {};
  want.forEach(function(id) {
    const r = all.find(function(x) { return String(x.ID) === id; });
    if (!r || !r.INDEX_ID) { out[id] = null; return; }
    try { out[id] = DriveApp.getFileById(String(r.INDEX_ID)).getBlob().getDataAsString('UTF-8'); }
    catch (e) { out[id] = null; }
  });
  return { success: true, index: out };
}

/** PDF dikirim bertahap (base64 per bagian) untuk penampil di dashboard. */
function getLibraryPdfPart(token, id, part) {
  libUser_(token);
  const r = libFind_(id);
  const np = Number(r.POTONGAN) || 0;
  if (np > 0) {
    const i = Math.max(0, Math.min(np - 1, Number(part) || 0));
    const it = libSub_('_potongan').getFilesByName(String(r.ID) + '_' + ('0' + i).slice(-2) + '.b64');
    if (it.hasNext()) return { success: true, part: i, parts: np, size: Number(r.UKURAN) || 0, base64: it.next().getBlob().getDataAsString() };
  }
  let bytes;
  try { bytes = DriveApp.getFileById(String(r.FILE_ID)).getBlob().getBytes(); }
  catch (e) { throw new Error('File PDF tidak bisa dibuka akun web app (' + engScriptAccount_() + ').'); }
  const n = Math.max(1, Math.ceil(bytes.length / LIB.PART)), i = Math.max(0, Math.min(n - 1, Number(part) || 0));
  const slice = bytes.slice(i * LIB.PART, Math.min(bytes.length, (i + 1) * LIB.PART));
  return { success: true, part: i, parts: n, size: bytes.length, base64: Utilities.base64Encode(slice) };
}

/** ADMIN: unggah PDF per potongan (base64, ukuran potongan kelipatan 3 byte). */
function libUploadChunk(token, uploadId, index, base64) {
  libAdmin_(token);
  const id = String(uploadId || '');
  if (!/^[A-Za-z0-9-]{8,48}$/.test(id)) throw new Error('ID unggahan tidak valid.');
  const i = Number(index);
  if (!(i >= 0 && i < 40)) throw new Error('Potongan unggahan tidak valid.');
  const b = String(base64 || '');
  if (!b || /[^A-Za-z0-9+/=]/.test(b)) throw new Error('Isi potongan unggahan rusak.');
  const tmp = libSub_('_unggah');
  const name = id + '_' + ('0' + i).slice(-2) + '.b64';
  const old = tmp.getFilesByName(name);
  while (old.hasNext()) old.next().setTrashed(true);
  tmp.createFile(name, b, MimeType.PLAIN_TEXT);
  return { success: true, index: i };
}

/** ADMIN: gabungkan potongan, simpan PDF + indeks, catat di sheet LIB_DOKUMEN. */
function libUploadFinish(token, uploadId, count, meta, indexJson) {
  const u = libAdmin_(token);
  const id = String(uploadId || '');
  if (!/^[A-Za-z0-9-]{8,48}$/.test(id)) throw new Error('ID unggahan tidak valid.');
  const n = Number(count);
  if (!(n >= 1 && n <= 40)) throw new Error('Jumlah potongan unggahan tidak valid.');
  meta = meta || {};
  const title = libTxt_(meta.title, 200);
  if (!title) throw new Error('Judul dokumen wajib diisi.');
  const idx = libCheckIndex_(indexJson);

  const tmp = libSub_('_unggah'), parts = [], temps = [];
  for (let i = 0; i < n; i++) {
    const it = tmp.getFilesByName(id + '_' + ('0' + i).slice(-2) + '.b64');
    if (!it.hasNext()) throw new Error('Potongan unggahan ke-' + (i + 1) + ' tidak ditemukan. Ulangi unggah.');
    const f = it.next(); temps.push(f); parts.push(f.getBlob().getDataAsString());
  }
  const bytes = Utilities.base64Decode(parts.join(''));
  if (bytes.length < 100 || String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== '%PDF') throw new Error('File bukan PDF yang valid.');
  if (bytes.length > LIB.MAX) throw new Error('File PDF lebih dari ' + Math.round(LIB.MAX / 1048576) + ' MB.');

  let fname = libTxt_(meta.fileName, 150).replace(/[\\/:*?"<>|]+/g, '-') || (title + '.pdf');
  if (!/\.pdf$/i.test(fname)) fname += '.pdf';
  const docId = 'LIB-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  const pdf = libSub_('Dokumen').createFile(Utilities.newBlob(bytes, 'application/pdf', fname));
  const ix = libSub_('_indeks').createFile(docId + '.json', JSON.stringify(idx), MimeType.PLAIN_TEXT);
  // Potongan base64 disimpan untuk penampil (dikirim apa adanya, tanpa konversi byte).
  const keep = libSub_('_potongan');
  let kept = 0;
  temps.forEach(function(f, i) {
    try { f.setName(docId + '_' + ('0' + i).slice(-2) + '.b64'); f.moveTo(keep); kept++; } catch (e) { try { f.setTrashed(true); } catch (x) {} }
  });

  const status = idx.scan ? 'PERLU_OCR' : 'TERINDEKS', now = libNow_();
  const line = [docId, title, libCat_(meta.category), libTxt_(meta.revision, 40), libDate_(meta.effective), pdf.getId(), pdf.getUrl(), fname,
    bytes.length, idx.pages.length, ix.getId(), status, idx.toc.length, libTxt_(meta.note, 300), u.username || u.name || '', now, now, kept === temps.length ? kept : 0];
  const lock = pmoLock_('LIB'); lock.waitLock(30000);
  try { libEnsure_(); engAppend_(LIB.SHEET, [line], true); } finally { lock.releaseLock(); }
  return { success: true, id: docId, doc: libView_(libFind_(docId)) };
}

/** ADMIN: ubah data dokumen dan (opsional) daftar bab/pasal. */
function libUpdateDoc(token, id, meta, toc) {
  libAdmin_(token);
  const r = libFind_(id);
  meta = meta || {};
  const title = libTxt_(meta.title, 200);
  if (!title) throw new Error('Judul dokumen wajib diisi.');
  let count = Number(r.JML_BAGIAN) || 0;
  if (Array.isArray(toc)) {
    if (!r.INDEX_ID) throw new Error('Indeks dokumen tidak ditemukan.');
    const f = DriveApp.getFileById(String(r.INDEX_ID));
    const idx = JSON.parse(f.getBlob().getDataAsString('UTF-8'));
    idx.toc = libCleanToc_(toc, (idx.pages || []).length);
    f.setContent(JSON.stringify(idx));
    count = idx.toc.length;
  }
  const lock = pmoLock_('LIB'); lock.waitLock(30000);
  try {
    const sh = libEnsure_();
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim().toUpperCase(); });
    const set = function(k, v) { const c = head.indexOf(k); if (c >= 0) sh.getRange(r._row, c + 1).setNumberFormat('@').setValue(v); };
    set('JUDUL', title); set('KATEGORI', libCat_(meta.category)); set('REVISI', libTxt_(meta.revision, 40));
    set('TGL_BERLAKU', libDate_(meta.effective)); set('KETERANGAN', libTxt_(meta.note, 300));
    set('JML_BAGIAN', String(count)); set('DIPERBARUI', libNow_());
  } finally { lock.releaseLock(); }
  return { success: true, doc: libView_(libFind_(id)) };
}

/** ADMIN: hapus dokumen (file dipindah ke sampah Drive, baris ditandai DIHAPUS). */
function libDeleteDoc(token, id) {
  const u = libAdmin_(token);
  const r = libFind_(id);
  [r.FILE_ID, r.INDEX_ID].forEach(function(fid) { if (fid) { try { DriveApp.getFileById(String(fid)).setTrashed(true); } catch (e) {} } });
  const np = Number(r.POTONGAN) || 0;
  if (np) { const pf = libSub_('_potongan'); for (let i = 0; i < np; i++) { const it = pf.getFilesByName(String(r.ID) + '_' + ('0' + i).slice(-2) + '.b64'); while (it.hasNext()) { try { it.next().setTrashed(true); } catch (e) {} } } }
  const lock = pmoLock_('LIB'); lock.waitLock(30000);
  try {
    const sh = libEnsure_();
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim().toUpperCase(); });
    const c = head.indexOf('STATUS'), d = head.indexOf('DIPERBARUI'), k = head.indexOf('KETERANGAN');
    if (c >= 0) sh.getRange(r._row, c + 1).setValue('DIHAPUS');
    if (d >= 0) sh.getRange(r._row, d + 1).setNumberFormat('@').setValue(libNow_());
    if (k >= 0) sh.getRange(r._row, k + 1).setValue(libTxt_('Dihapus oleh ' + (u.username || u.name || ''), 300));
  } finally { lock.releaseLock(); }
  return { success: true };
}

function libCleanToc_(toc, pages) {
  return (Array.isArray(toc) ? toc : []).slice(0, 2000).map(function(t) {
    return { t: libTxt_(t && t.t, 160), p: Math.max(1, Math.min(pages || 1, Math.round(Number(t && t.p) || 1))), l: Math.max(1, Math.min(3, Math.round(Number(t && t.l) || 1))) };
  }).filter(function(t) { return t.t; }).sort(function(a, b) { return a.p - b.p; });
}
function libCheckIndex_(json) {
  let idx;
  try { idx = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { throw new Error('Indeks dokumen rusak. Ulangi unggah.'); }
  if (!idx || !Array.isArray(idx.pages) || !idx.pages.length) throw new Error('Indeks halaman dokumen kosong.');
  if (idx.pages.length > 3000) throw new Error('Dokumen lebih dari 3.000 halaman.');
  const pages = idx.pages.map(function(p) { return String(p == null ? '' : p).slice(0, 60000); });
  const chars = pages.reduce(function(s, p) { return s + p.replace(/\s+/g, '').length; }, 0);
  return { v: 1, pages: pages, toc: libCleanToc_(idx.toc, pages.length), outline: !!idx.outline, scan: chars < pages.length * 40, chars: chars };
}

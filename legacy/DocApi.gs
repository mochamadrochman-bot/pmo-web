/**
 * MODUL 2 · DOCUMENT CONTROL — register dokumen resmi proyek.
 *
 * Prinsip: berkas tetap di Google Drive; dashboard menyimpan daftar, metadata, dan tautannya.
 * - Melihat & pratinjau : semua akun yang punya akses proyek.
 * - Menambah / mengubah : ADMIN dan INPUT/PIC proyek tersebut (userCanOperateProject_).
 * - Unggahan dashboard  : <folder Drive tim proyek> › <PROYEK_ID> › Document Control › <Kategori>
 * - Impor folder lama   : baca isi folder Drive proyek, kategori ditebak dari nama file, dikonfirmasi pengguna.
 * - Kelengkapan         : dokumen yang seharusnya ada dihitung dari data dashboard (bulan laporan, termin, addendum, status proyek).
 * - Paket arsip         : salinan dokumen terpilih ke folder Drive (bisa dibagikan) + register; ZIP dibuat di browser.
 *
 * Sheet (dibuat otomatis): DOC_REGISTER, DOC_PAKET, DOC_PAKET_ISI.
 */
const DOC = {
  SHEETS: {
    REG: ['DOC_REGISTER', ['ID', 'PROYEK_ID', 'KATEGORI', 'SUB', 'REF', 'NOMOR', 'JUDUL', 'TANGGAL', 'PIHAK', 'NILAI', 'BANK', 'BERLAKU_SAMPAI', 'STATUS', 'REVISI',
      'SUMBER', 'URL', 'FILE_ID', 'NAMA_FILE', 'UKURAN', 'CATATAN', 'DIBUAT_OLEH', 'DIBUAT_PADA', 'DIPERBARUI_OLEH', 'DIPERBARUI', 'AKTIF', 'PERIODE']],
    PAKET: ['DOC_PAKET', ['ID', 'PROYEK_ID', 'NAMA', 'FOLDER_ID', 'URL', 'STATUS', 'TOTAL', 'DISALIN', 'GAGAL', 'REGISTER_URL', 'ISI_JSON', 'DIBUAT_OLEH', 'DIBUAT_PADA', 'SELESAI_PADA']],
    ISI: ['DOC_PAKET_ISI', ['PAKET_ID', 'DOC_ID', 'STATUS', 'FILE_ID', 'URL', 'NAMA_FILE', 'KETERANGAN', 'WAKTU']]
  },
  // k: kode, n: nama, t: tahap, sub: pilihan sub-jenis, ref: arti kolom REF, money: punya nilai, bond: data jaminan
  CATS: [
    { k: 'KONTRAK', n: 'Kontrak & lampiran', t: 'AWAL' },
    { k: 'OK', n: 'Order Kerja (OK)', t: 'AWAL', sub: { UTAMA: 'OK pekerjaan utama', TAMBAHAN: 'OK tambahan jasa' } },
    { k: 'BAST', n: 'BA serah terima pekerjaan', t: 'AWAL', sub: { TENDER: 'Panitia pengadaan → Tim proyek', USER: 'Tim proyek → User' } },
    { k: 'JAMINAN', n: 'Jaminan', t: 'AWAL', bond: true, money: true, sub: { PELAKSANAAN: 'Jaminan pelaksanaan', UANG_MUKA: 'Jaminan uang muka', TKDN: 'Jaminan TKDN', PEMELIHARAAN: 'Jaminan pemeliharaan' } },
    { k: 'BA_PEKERJAAN', n: 'BA pekerjaan', t: 'PELAKSANAAN' },
    { k: 'BA_MILESTONE', n: 'BA milestone bulanan', t: 'PELAKSANAAN', ref: 'BULAN' },
    { k: 'BA_TERMIN', n: 'BA termin pembayaran', t: 'PELAKSANAAN', ref: 'TERMIN', money: true },
    { k: 'ADDENDUM', n: 'Addendum kontrak', t: 'PELAKSANAAN', ref: 'ADDENDUM', money: true },
    { k: 'BA_PA', n: 'BA penerimaan awal (PHO)', t: 'PENUTUPAN' },
    { k: 'ASBUILT', n: 'As-built drawing', t: 'PENUTUPAN', ref: 'GAMBAR' },
    { k: 'BA_PAK', n: 'BA penerimaan akhir (FHO)', t: 'PENUTUPAN' },
    { k: 'LAPORAN', n: 'Laporan manajemen bulanan', t: 'PELAKSANAAN', ref: 'BULAN' },
    { k: 'PRESENTASI', n: 'Presentasi hasil generate (PPT)', t: 'PELAKSANAAN', ref: 'BULAN' },
    { k: 'LAINNYA', n: 'Dokumen lain', t: 'LAINNYA' }
  ],
  STAGES: { AWAL: 'Awal proyek', PELAKSANAAN: 'Pelaksanaan', PENUTUPAN: 'Penutupan', LAINNYA: 'Lainnya' },
  STATUS: ['DRAFT', 'FINAL'],
  BOND_STATUS: ['AKTIF', 'DIPERPANJANG', 'DIKEMBALIKAN', 'DICAIRKAN'],
  FILE_MAX: 25 * 1024 * 1024,
  SCAN_MAX: 800,
  BOND_WARN_DAYS: 30,
  BATCH_MS: 240000
};

// ===================== HALAMAN =====================

function getDocControlPageHtml(token) {
  requireUser_(token);
  const t = HtmlService.createTemplateFromFile('DocControl');
  t.initialSessionToken = String(token);
  t.appUrl = ScriptApp.getService().getUrl();
  t.initialProjectName = '';
  return t.evaluate().getContent();
}

/** Data halaman Document Control untuk satu proyek. */
function getDocData(token, projectId, skipReportSync) {
  const user = requireUser_(token);
  if (!skipReportSync) reportLinkReconcile_(user);
  const db = loadDb_();
  const list = db.allProjects.filter(function(p) { return userCanAccess_(user, p); });
  if (!list.length) throw new Error('Akun Anda belum memiliki akses proyek.');
  let p = projectId ? (list.find(function(x) { return x.id === normKey_(projectId); }) || findProject_(list, projectId)) : null;
  if (!p) p = list.find(function(x) { return userCanOperateProject_(user, x); }) || list.find(function(x) { try { return weeklyHasData_(db, x); } catch (e) { return false; } }) || list[0];
  const all = docRegsAll_();
  const regs = all.filter(function(r) { return r.pid === p.id; });
  const out = {
    success: true,
    project: { id: p.id, name: p.name, fullName: p.fullName || p.name },
    user: { name: user.name || user.username || '', username: user.username || '', role: String(user.role || '').toUpperCase() },
    canManage: userCanOperateProject_(user, p),
    projects: list.map(function(x) { return { id: x.id, name: x.name, docs: all.filter(function(r) { return r.pid === x.id; }).length }; }),
    cats: DOC.CATS, stages: DOC.STAGES, status: DOC.STATUS, bondStatus: DOC.BOND_STATUS, fileMaxMb: DOC.FILE_MAX / 1048576, bondWarnDays: DOC.BOND_WARN_DAYS,
    docs: regs.map(function(r) { const o = Object.assign({}, r); delete o.atRaw; delete o.byU; delete o.pid; return o; }),
    expected: docExpected_(db, p, regs),
    asbuilt: docAsbuilt_(p, regs),
    packages: docPackages_(p.id).slice(0, 12),
    drive: null
  };
  try { out.drive = engDriveOf_(p.id); } catch (e) { out.drive = null; }
  try {
    const st = monthlyDate_(db, p.id, 'EFEKTIF_DATE_START'), m0 = db.monthly.months[0];
    if (st && m0 && st.getFullYear() * 12 + st.getMonth() < m0.year * 12 + m0.month) out.dataFrom = { start: Utilities.formatDate(st, Session.getScriptTimeZone(), 'yyyy-MM-dd'), first: m0.label };
  } catch (e) {}
  try { out.life = (function() { const L = projectLifecycle_(db, p); return { stage: L.stage, addendumCount: L.addendumCount || 0 }; })(); } catch (e) { out.life = null; }
  return out;
}

// ===================== SIMPAN / HAPUS =====================

/**
 * a: { id?, kat, sub, ref, nomor, judul, tanggal, pihak, nilai, bank, berlaku, status, revisi, catatan,
 *      url? | file?: { name, mime, base64 } }
 */
function saveDocItem(token, projectId, a) {
  const ctx = docManageCtx_(token, projectId);
  a = a || {};
  const cat = docCat_(a.kat);
  if (!cat) throw new Error('Kategori dokumen tidak dikenal.');
  const sub = cat.sub ? String(a.sub || '').toUpperCase() : '';
  if (cat.sub && !cat.sub[sub]) throw new Error('Pilih jenis ' + cat.n.toLowerCase() + '.');
  const judul = String(a.judul || '').trim().slice(0, 300);
  if (!judul) throw new Error('Judul dokumen wajib diisi.');
  const ref = docRefClean_(cat, a.ref);
  if (cat.ref && !ref) throw new Error(cat.ref === 'BULAN' ? 'Pilih bulan milestone.' : cat.ref === 'TERMIN' ? 'Isi termin ke-.' : cat.ref === 'ADDENDUM' ? 'Isi addendum ke-.' : 'Isi nomor gambar.');
  const tanggal = docIsoOrBlank_(a.tanggal), berlaku = docIsoOrBlank_(a.berlaku);
  const periode = /^\d{4}-\d{2}$/.test(String(a.periode || '')) ? String(a.periode) : '';
  if (cat.k === 'BA_TERMIN' && !periode) throw new Error('Pilih bulan pembayaran termin.');
  if (cat.bond && !berlaku) throw new Error('Isi tanggal berlaku sampai untuk jaminan.');
  const nilai = a.nilai === '' || a.nilai === null || a.nilai === undefined ? '' : Number(String(a.nilai).replace(/[^\d.-]/g, ''));
  if (nilai !== '' && !isFinite(nilai)) throw new Error('Nilai tidak valid.');
  const status = cat.bond ? (DOC.BOND_STATUS.indexOf(String(a.status || '').toUpperCase()) >= 0 ? String(a.status).toUpperCase() : 'AKTIF')
    : (DOC.STATUS.indexOf(String(a.status || '').toUpperCase()) >= 0 ? String(a.status).toUpperCase() : 'FINAL');
  const lock = pmoLock_('DOC'); lock.waitLock(30000);
  try {
    docEnsureHeader_();
    const now = new Date(), by = ctx.user.username || ctx.user.name || '';
    const upload = a.uploadId ? docUploadSession_(ctx, a.uploadId) : null;
    if (upload && (!upload.complete || upload.kat !== cat.k || upload.sub !== sub || upload.docId !== String(a.id || ''))) throw new Error('Unggahan belum lengkap atau kategori dokumen berubah. Pilih ulang file.');
    const effectiveId = a.id || (upload && upload.savedDocId) || '';
    const prev = effectiveId ? docRegsOf_(ctx.p.id).find(function(r) { return r.id === String(effectiveId); }) : null;
    if (effectiveId && !prev) throw new Error('Dokumen tidak ditemukan.');
    if (prev && prev.kat === 'LAPORAN' && a.reportUrlBase !== undefined && reportLinkIdentity_(a.reportUrlBase) !== reportLinkIdentity_(prev.url)) throw new Error('Link laporan telah diperbarui dari menu lain. Muat ulang dokumen sebelum menyimpan.');
    let src = prev ? prev.src : '', url = prev ? prev.url : '', fid = prev ? prev.fileId : '', fname = prev ? prev.fileName : '', size = prev ? prev.size : '';
    if (upload) {
      const up = upload.complete;
      src = 'UNGGAH'; url = up.url; fid = up.id; fname = up.name; size = up.size;
    } else if (a.file && a.file.base64) {
      const up = docUpload_(ctx, cat, sub, a.file, judul);
      src = 'UNGGAH'; url = up.url; fid = up.id; fname = up.name; size = up.size;
    } else if (a.url !== undefined && String(a.url || '').trim() !== String(url || '')) {
      const u = String(a.url || '').trim();
      if (u && !/^https:\/\//i.test(u)) throw new Error('Link harus diawali https://');
      src = u ? 'LINK' : ''; url = u; fid = engDriveIdOf_(u); fname = ''; size = '';
      if (fid) { try { const f = DriveApp.getFileById(fid); fname = f.getName(); size = Number(f.getSize()) || ''; } catch (e) { /* belum dibagikan ke akun web app; tetap disimpan sebagai link */ } }
    }
    const line = [prev ? prev.id : 'D' + Utilities.getUuid().slice(0, 8).toUpperCase(), ctx.p.id, cat.k, sub, ref, String(a.nomor || '').trim().slice(0, 120), judul, tanggal,
      String(a.pihak || '').trim().slice(0, 160), nilai, String(a.bank || '').trim().slice(0, 120), berlaku, status, String(a.revisi || '').trim().slice(0, 20),
      src, url, fid, fname, size, String(a.catatan || '').trim().slice(0, 600),
      prev ? prev.byU : by, prev ? prev.atRaw : now, by, now, true, periode];
    if (line[2] === 'LAPORAN' && reportLinkPpt_({url:line[15],fileName:line[17],catatan:line[19]},{})) line[2] = 'PRESENTASI';
    if (prev) docUpdateRow_(prev.id, line); else engAppend_(DOC.SHEETS.REG, [line], false);
    if (upload) { upload.savedDocId = line[0]; docUploadStore_(a.uploadId, upload); }
    if (line[2] === 'LAPORAN' || (prev && prev.kat === 'LAPORAN')) reportLinkAfterDoc_(ctx,line,prev);
    return getDocData(token, ctx.p.id, true);
  } finally { lock.releaseLock(); }
}

/** Hapus dari register (berkas di Drive tidak dihapus). */
function deleteDocItem(token, projectId, id) {
  const ctx = docManageCtx_(token, projectId), lock=pmoLock_('DOC');lock.waitLock(30000);
  try {
    const prev = docRegsOf_(ctx.p.id).find(function(r) { return r.id === String(id); });
    if (!prev) throw new Error('Dokumen tidak ditemukan.');
    const sh=engSheet_(DOC.SHEETS.REG,true),v=sh.getDataRange().getValues(),h=v[0].map(function(x){return String(x).trim().toUpperCase();});
    for(let i=1;i<v.length;i++)if(String(v[i][0])===prev.id){sh.getRange(i+1,h.indexOf('AKTIF')+1).setValue(false);sh.getRange(i+1,h.indexOf('DIPERBARUI_OLEH')+1,1,2).setValues([[ctx.user.username||ctx.user.name||'',new Date()]]);}
    if(prev.kat==='LAPORAN'&&!reportLinkPpt_(prev,{})){
      const month=ctx.db.monthly.months.find(function(m){return monthKey_(m)===prev.ref;});
      if(month&&reportLinkIdentity_(monthLink_(ctx.db,ctx.p.id,'LINK_LAPORAN_MONTHLY',month))===reportLinkIdentity_(prev.url)){
        const overrides={};overrides[prev.ref]={url:''};const table=reportLinkTable_();reportLinkProject_(ctx.db,ctx.p,ctx.user,table,overrides);SpreadsheetApp.flush();DB_CACHE_=null;dataChanged_();
      }
    }
    return getDocData(token,ctx.p.id,true);
  } finally {lock.releaseLock();}
}

// ===================== PRATINJAU & ISI FILE =====================

function getDocPreview(token, projectId, id) {
  const ctx = docViewCtx_(token, projectId);
  const r = docRegsOf_(ctx.p.id).find(function(x) { return x.id === String(id); });
  if (!r) throw new Error('Dokumen tidak ditemukan.');
  if (docMicrosoftLink_(r.url)) return { id:r.id, mode:'MICROSOFT', url:r.url };
  if (!r.fileId) return { id: r.id, mode: 'LINK', url: r.url };
  const out = { id: r.id, url: r.url, fileId: r.fileId, previewUrl: 'https://drive.google.com/file/d/' + r.fileId + '/preview' };
  let f;
  try { f = DriveApp.getFileById(r.fileId); out.name = f.getName(); } catch (e) { out.mode = 'IFRAME'; out.access = 'UNKNOWN'; return out; }
  const mime = String(f.getMimeType() || ''), size = Number(f.getSize()) || 0;
  out.mime = mime; out.size = size;
  const gdoc = ENGP.GDOC.indexOf(mime) >= 0;
  if (ENGP.RAW.indexOf(mime) < 0 && !gdoc) { out.mode = 'IFRAME'; out.why = 'FORMAT'; return out; }
  if (size > ENGP.MAX_BYTES) { out.mode = 'IFRAME'; out.why = 'SIZE'; return out; }
  let blob;
  try { blob = gdoc ? f.getAs('application/pdf') : f.getBlob(); } catch (e) { out.mode = 'IFRAME'; out.why = 'READ'; return out; }
  const bytes = blob.getBytes();
  if (bytes.length > ENGP.MAX_BYTES) { out.mode = 'IFRAME'; out.why = 'SIZE'; return out; }
  out.mode = 'PROXY'; out.dataMime = gdoc ? 'application/pdf' : mime; out.base64 = Utilities.base64Encode(bytes);
  return out;
}

/** Isi satu file (base64) untuk ZIP di browser. */
function getDocFileBytes(token, projectId, id) {
  const ctx = docViewCtx_(token, projectId);
  const r = docRegsOf_(ctx.p.id).find(function(x) { return x.id === String(id); });
  if (!r) return { id: id, skip: 'Dokumen tidak ditemukan.' };
  if (!r.fileId) return { id: id, skip: 'Link bukan file Google Drive.' };
  let f;
  try { f = DriveApp.getFileById(r.fileId); f.getName(); } catch (e) { return { id: id, skip: 'File tidak bisa dibuka akun web app.' }; }
  const mime = String(f.getMimeType() || ''), gdoc = ENGP.GDOC.indexOf(mime) >= 0;
  if (!gdoc && Number(f.getSize()) > DOC.FILE_MAX) return { id: id, skip: 'File lebih dari 25 MB; ambil dari paket arsip Drive.' };
  const blob = gdoc ? f.getAs('application/pdf') : f.getBlob();
  return { id: id, name: f.getName(), ext: gdoc ? '.pdf' : engExtOf_(f.getName(), mime), base64: Utilities.base64Encode(blob.getBytes()) };
}

// ===================== IMPOR FOLDER LAMA =====================

/** Baca isi folder Drive (rekursif), tebak kategori dari nama berkas & sub-folder. */
function scanDocFolder(token, projectId, folderRef) {
  const ctx = docManageCtx_(token, projectId);
  const m = String(folderRef || '').match(/folders\/([A-Za-z0-9_-]{10,})/) || String(folderRef || '').match(/[?&]id=([A-Za-z0-9_-]{10,})/) || String(folderRef || '').trim().match(/^([A-Za-z0-9_-]{10,})$/);
  if (!m) throw new Error('Tempel link folder Google Drive (https://drive.google.com/drive/folders/…).');
  let root;
  try { root = DriveApp.getFolderById(m[1]); root.getName(); } catch (e) { throw new Error('Folder tidak bisa dibuka akun web app (' + engScriptAccount_() + '). Bagikan folder ke akun tersebut minimal sebagai Viewer.'); }
  const have = {}; docRegsOf_(ctx.p.id).forEach(function(r) { if (r.fileId) have[r.fileId] = r.id; });
  const rows = [], started = Date.now();
  let truncated = false;
  const walk = function(folder, path, depth) {
    const fi = folder.getFiles();
    while (fi.hasNext()) {
      if (rows.length >= DOC.SCAN_MAX || Date.now() - started > 200000) { truncated = true; return; }
      const f = fi.next(), mime = String(f.getMimeType() || '');
      if (/folder|shortcut/.test(mime)) continue;
      const g = docGuess_(f.getName(), path);
      rows.push({ fileId: f.getId(), url: f.getUrl(), name: f.getName(), path: path.join(' › '), size: Number(f.getSize()) || 0, mime: mime,
        date: Utilities.formatDate(f.getDateCreated(), Session.getScriptTimeZone(), 'yyyy-MM-dd'), kat: g.kat, sub: g.sub, ref: g.ref, periode: g.periode, nomor: g.nomor, tanggal: g.tanggal, judul: g.judul, yakin: g.yakin, ada: have[f.getId()] || null });
    }
    if (depth >= 5) return;
    const fo = folder.getFolders();
    while (fo.hasNext()) { const s = fo.next(); walk(s, path.concat([s.getName()]), depth + 1); if (truncated) return; }
  };
  walk(root, [], 0);
  return { folder: { id: root.getId(), name: root.getName(), url: root.getUrl() }, rows: rows, truncated: truncated };
}

/** Simpan hasil impor yang dikonfirmasi. rows: [{fileId, url, name, size, kat, sub, ref, nomor, judul, tanggal}] */
function importDocItems(token, projectId, rows) {
  const ctx = docManageCtx_(token, projectId);
  const have = {}; docRegsOf_(ctx.p.id).forEach(function(r) { if (r.fileId) have[r.fileId] = true; });
  const now = new Date(), by = ctx.user.username || ctx.user.name || '', lines = [], errs = [];
  (rows || []).slice(0, DOC.SCAN_MAX).forEach(function(a, i) {
    const cat = docCat_(a.kat);
    if (!cat) { errs.push((a.name || 'Baris ' + (i + 1)) + ': kategori kosong.'); return; }
    if (a.fileId && have[a.fileId]) return;
    const sub = cat.sub ? (cat.sub[String(a.sub || '').toUpperCase()] ? String(a.sub).toUpperCase() : Object.keys(cat.sub)[0]) : '';
    lines.push(['D' + Utilities.getUuid().slice(0, 8).toUpperCase(), ctx.p.id, cat.k, sub, docRefClean_(cat, a.ref), String(a.nomor || '').slice(0, 120), String(a.judul || a.name || '').slice(0, 300),
      docIsoOrBlank_(a.tanggal), '', '', '', '', cat.bond ? 'AKTIF' : 'FINAL', '', 'IMPOR', String(a.url || ''), String(a.fileId || ''), String(a.name || ''), Number(a.size) || '', 'Impor folder Drive',
      by, now, by, now, true, /^\d{4}-\d{2}$/.test(String(a.periode || '')) ? String(a.periode) : (cat.k === 'BA_TERMIN' && docIsoOrBlank_(a.tanggal) ? docIsoOrBlank_(a.tanggal).slice(0, 7) : '')]);
    if (a.fileId) have[a.fileId] = true;
  });
  if (errs.length) throw new Error(errs.slice(0, 5).join(' '));
  const lock = pmoLock_('DOC'); lock.waitLock(30000);
  try { docEnsureHeader_(); engAppend_(DOC.SHEETS.REG, lines, false); } finally { lock.releaseLock(); }
  const d = getDocData(token, ctx.p.id); d.imported = lines.length;
  return d;
}

// ===================== PAKET ARSIP (Drive) =====================

/** Mulai paket: buat folder lalu salin bertahap (runDocPackage). a: {ids:[], name, folderRef?} */
function startDocPackage(token, projectId, a) {
  const ctx = docViewCtx_(token, projectId);
  if (!userCanOperateProject_(ctx.user, ctx.p) && String(ctx.user.role || '').toUpperCase() !== 'ADMIN') throw new Error('Paket arsip hanya bisa dibuat ADMIN atau tim proyek.');
  a = a || {};
  const regs = docRegsOf_(ctx.p.id), ids = (a.ids || []).map(String).filter(function(id, i, arr) { return arr.indexOf(id) === i && regs.some(function(r) { return r.id === id; }); });
  if (!ids.length) throw new Error('Pilih minimal satu dokumen.');
  let parent = null;
  const ref = String(a.folderRef || '').trim();
  if (ref) {
    const m = ref.match(/folders\/([A-Za-z0-9_-]{10,})/) || ref.match(/^([A-Za-z0-9_-]{10,})$/);
    if (!m) throw new Error('Link folder tujuan tidak valid.');
    try { parent = DriveApp.getFolderById(m[1]); parent.getName(); } catch (e) { throw new Error('Folder tujuan tidak bisa dibuka akun web app (' + engScriptAccount_() + '). Bagikan sebagai Editor.'); }
  } else {
    const drive = engDriveOf_(ctx.p.id);
    if (!drive) throw new Error('Folder Google Drive tim proyek belum diatur. Tempel link folder tujuan, atau atur folder tim di EPCC Engineering › Setup baseline.');
    try { parent = engSubFolder_(engSubFolder_(engSubFolder_(DriveApp.getFolderById(drive.id), ctx.p.id), 'Document Control'), 'Paket Arsip'); } catch (e) { throw new Error('Folder Google Drive tim proyek tidak bisa dibuka akun web app.'); }
  }
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmm');
  const name = (String(a.name || '').trim() || 'PAKET_' + ctx.p.id).replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80) + '_' + stamp;
  let folder;
  try { folder = parent.createFolder(name); } catch (e) { throw new Error('Akun web app belum bisa menulis ke folder tujuan: ' + e.message); }
  const id = 'P' + Utilities.getUuid().slice(0, 7).toUpperCase();
  engAppend_(DOC.SHEETS.PAKET, [[id, ctx.p.id, name, folder.getId(), folder.getUrl(), 'PROSES', ids.length, 0, 0, '', JSON.stringify(ids), ctx.user.username || ctx.user.name || '', new Date(), '']]);
  return { id: id, packages: docPackages_(ctx.p.id).slice(0, 12) };
}

/** Salin batch berikutnya; dipanggil berulang sampai SELESAI. */
function runDocPackage(token, projectId, packId) {
  const ctx = docViewCtx_(token, projectId);
  const started = Date.now(), cache = CacheService.getScriptCache(), key = 'DOCPAKET_' + packId;
  if (cache.get(key)) return { packages: docPackages_(ctx.p.id).slice(0, 12) };
  cache.put(key, '1', 300);
  try {
    const pk = docPackages_(ctx.p.id).find(function(x) { return x.id === packId; });
    if (!pk) throw new Error('Paket tidak ditemukan.');
    if (pk.status !== 'PROSES') return { packages: docPackages_(ctx.p.id).slice(0, 12) };
    const done = {}; engRead_(DOC.SHEETS.ISI).forEach(function(r) { if (String(r.PAKET_ID) === packId) done[String(r.DOC_ID)] = true; });
    const regs = docRegsOf_(ctx.p.id), byId = {}; regs.forEach(function(r) { byId[r.id] = r; });
    const folder = DriveApp.getFolderById(pk.folderId), lines = [];
    const pending = pk.ids.filter(function(id) { return !done[id]; });
    for (let i = 0; i < pending.length; i++) {
      if (Date.now() - started > DOC.BATCH_MS) break;
      const r = byId[pending[i]];
      let status = 'OK', fid = '', url = '', fname = '', note = '';
      if (!r) { status = 'LEWATI'; note = 'Dokumen sudah dihapus dari register.'; }
      else if (!r.fileId) { status = 'LEWATI'; note = 'Link bukan file Google Drive; dicantumkan di register saja.'; url = r.url; }
      else {
        try {
          const src = DriveApp.getFileById(r.fileId), cat = docCat_(r.kat) || { n: r.kat };
          fname = docFileName_(r, src);
          const sub = engSubFolder_(folder, (DOC.CATS.indexOf(cat) + 1 < 10 ? '0' : '') + (DOC.CATS.indexOf(cat) + 1) + ' ' + cat.n.replace(/[\\/:*?"<>|]+/g, '-'));
          const copy = src.makeCopy(fname, sub); fid = copy.getId(); url = copy.getUrl();
        } catch (e) { status = 'GAGAL'; note = 'File tidak bisa dibuka akun web app: ' + String(e && e.message || e).slice(0, 120); }
      }
      lines.push([packId, pending[i], status, fid, url, fname, note, new Date()]);
    }
    engAppend_(DOC.SHEETS.ISI, lines, false);
    const all = engRead_(DOC.SHEETS.ISI).filter(function(r) { return String(r.PAKET_ID) === packId; });
    const ok = all.filter(function(r) { return r.STATUS === 'OK'; }).length, bad = all.length - ok, finished = all.length >= pk.total;
    let regUrl = '';
    if (finished) regUrl = docPackageRegister_(ctx, pk, folder, all, byId);
    docPackageUpdate_(packId, { DISALIN: ok, GAGAL: bad, STATUS: finished ? 'SELESAI' : 'PROSES', REGISTER_URL: regUrl || pk.registerUrl, SELESAI_PADA: finished ? new Date() : '' });
    return { packages: docPackages_(ctx.p.id).slice(0, 12) };
  } finally { cache.remove(key); }
}

// ===================== KELENGKAPAN =====================

/** Dokumen yang seharusnya ada, dihitung dari data dashboard. */
function docExpected_(db, p, regs) {
  const out = [], has = function(k, sub, ref) { return regs.filter(function(r) { return r.kat === k && (!sub || r.sub === sub) && (ref === undefined || String(r.ref) === String(ref)); }).map(function(r) { return r.id; }); };
  const add = function(k, sub, ref, label, why, wajib) { out.push({ kat: k, sub: sub || '', ref: ref === undefined ? '' : String(ref), label: label, why: why, wajib: wajib !== false, ada: has(k, sub, ref) }); };
  let life = { stage: 'BERJALAN', addendumCount: 0 };
  try { life = projectLifecycle_(db, p); } catch (e) {}
  add('KONTRAK', '', undefined, 'Kontrak & lampiran', 'Wajib sejak awal proyek');
  add('OK', 'UTAMA', undefined, 'OK pekerjaan utama', 'Wajib sejak awal proyek');
  add('BAST', 'TENDER', undefined, 'BAST panitia pengadaan → tim proyek', 'Wajib sejak awal proyek');
  add('JAMINAN', 'PELAKSANAAN', undefined, 'Jaminan pelaksanaan', 'Wajib sejak awal proyek');
  add('JAMINAN', 'UANG_MUKA', undefined, 'Jaminan uang muka', 'Bila ada uang muka', false);
  add('JAMINAN', 'TKDN', undefined, 'Jaminan TKDN', 'Bila dipersyaratkan kontrak', false);
  // BA milestone: bulan laporan yang sudah tersubmit
  try {
    reportMonths_(db, p).forEach(function(m) {
      if (!monthSubmitted_(db, p, m)) return;
      const key = m.year + '-' + String(m.month + 1).padStart(2, '0');
      add('BA_MILESTONE', '', key, 'BA milestone ' + m.label, 'Laporan bulanan ' + m.label + ' sudah tersubmit');
    });
  } catch (e) {}
  // BA termin: per bulan realisasi pembayaran (PLANT_COST_ACTUAL bulan itu; satu bulan bisa berisi lebih dari satu termin).
  // Nomor termin TIDAK ditebak dari data bulanan karena pembayaran sebelum bulan pertama DATA BULANAN tidak tercatat.
  try {
    db.monthly.months.forEach(function(m) {
      const v = cellNumber_(db.monthly, p.id, 'PLANT_COST_ACTUAL', m.col);
      if (v === null || v <= 0) return;
      const key = m.year + '-' + String(m.month + 1).padStart(2, '0');
      const docs = regs.filter(function(r) { return r.kat === 'BA_TERMIN' && r.periode === key; });
      const nos = docs.map(function(r) { return r.ref; }).filter(Boolean).sort(function(a, b) { return a - b; });
      out.push({ kat: 'BA_TERMIN', sub: '', ref: '', periode: key, label: 'BA termin · pembayaran ' + m.label,
        why: 'Realisasi pembayaran ' + m.label + ': ' + (v >= 1e9 ? 'Rp ' + (Math.round(v / 1e7) / 100).toLocaleString('id-ID') + ' M' : 'Rp ' + Math.round(v / 1e6).toLocaleString('id-ID') + ' jt') + ' (total bulan itu, bisa lebih dari satu termin)' + (nos.length ? ' · tercatat termin ke-' + nos.join(', ') : ''),
        wajib: true, ada: docs.map(function(r) { return r.id; }) });
    });
  } catch (e) {}
  for (let i = 1; i <= (Number(life.addendumCount) || 0); i++) add('ADDENDUM', '', i, 'Addendum ke-' + i, 'Tercatat di status & addendum proyek');
  if (life.stage === 'SELESAI' || life.stage === 'DITUTUP') {
    add('BA_PA', '', undefined, 'BA penerimaan awal (PHO)', 'Proyek berstatus ' + life.stage.toLowerCase());
    add('JAMINAN', 'PEMELIHARAAN', undefined, 'Jaminan pemeliharaan', 'Setelah penerimaan awal');
    add('BAST', 'USER', undefined, 'BAST tim proyek → user', 'Proyek berstatus ' + life.stage.toLowerCase());
  }
  if (life.stage === 'DITUTUP') add('BA_PAK', '', undefined, 'BA penerimaan akhir (FHO)', 'Proyek ditutup');
  return out;
}

/** Daftar gambar (DED / DRAWING) dari baseline Engineering untuk as-built. */
function docAsbuilt_(p, regs) {
  try {
    const ns = engStore_(), set = ns.setting[p.id];
    if (!set || set.rev === null || set.rev === '') return { ready: false, items: [] };
    const has = {}; regs.filter(function(r) { return r.kat === 'ASBUILT'; }).forEach(function(r) { (has[String(r.ref).toUpperCase()] = has[String(r.ref).toUpperCase()] || []).push(r.id); });
    const items = (engBaselineOf_(ns, p.id, set.rev) || []).filter(function(d) { return /DRAWING|DED|GAMBAR|DWG/i.test(d.type || ''); })
      .map(function(d) { return { no: d.no, name: d.name, disc: d.disc, ada: has[String(d.no).toUpperCase()] || [] }; });
    return { ready: true, rev: set.rev, items: items };
  } catch (e) { return { ready: false, items: [], err: e.message }; }
}

// ===================== HELPER =====================

/** Tambah kolom baru (mis. PERIODE) ke sheet register lama bila belum ada. */
function docEnsureHeader_() {
  const sh = engSheet_(DOC.SHEETS.REG, true), H = DOC.SHEETS.REG[1];
  const cur = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(function(x) { return String(x).trim().toUpperCase(); });
  H.forEach(function(h, i) { if (cur[i] !== h && cur.indexOf(h) < 0) sh.getRange(1, i + 1).setValue(h).setFontWeight('bold').setBackground('#0F2B46').setFontColor('#FFFFFF'); });
}
function docCat_(k) { k = String(k || '').toUpperCase(); return DOC.CATS.find(function(c) { return c.k === k; }) || null; }
function docIsoOrBlank_(v) { const s = String(v || '').trim(); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; }
function docRefClean_(cat, v) {
  const s = String(v === undefined || v === null ? '' : v).trim();
  if (!cat.ref || !s) return '';
  if (cat.ref === 'BULAN') return /^\d{4}-\d{2}$/.test(s) ? s : '';
  if (cat.ref === 'TERMIN' || cat.ref === 'ADDENDUM') { const n = parseInt(s, 10); return n > 0 && n < 200 ? String(n) : ''; }
  return s.slice(0, 80);
}

function docViewCtx_(token, projectId) {
  const user = requireUser_(token), db = loadDb_(), id = normKey_(projectId);
  const p = db.allProjects.find(function(x) { return x.id === id; }) || findProject_(db.allProjects, projectId);
  if (!p) throw new Error('Proyek tidak ditemukan.');
  if (!userCanAccess_(user, p)) throw new Error('Akun Anda tidak memiliki akses ke proyek ' + p.name + '.');
  return { user: user, db: db, p: p };
}
function docManageCtx_(token, projectId) {
  const ctx = docViewCtx_(token, projectId);
  if (!userCanOperateProject_(ctx.user, ctx.p)) throw new Error('Hanya ADMIN atau tim proyek ' + ctx.p.name + ' yang bisa mengubah dokumen.');
  return ctx;
}

function docRegsAll_() {
  const fmt = function(v) { return v instanceof Date && !isNaN(v) ? formatDateId_(v) + ' ' + String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0') : String(v || ''); };
  return engRead_(DOC.SHEETS.REG).filter(function(r) { return r.ID && r.AKTIF !== false && String(r.AKTIF).toUpperCase() !== 'FALSE'; }).map(function(r) {
    return { id: String(r.ID), pid: String(r.PROYEK_ID || '').trim().toUpperCase(), kat: String(r.KATEGORI || '').toUpperCase(), sub: String(r.SUB || '').toUpperCase(),
      ref: r.REF instanceof Date ? Utilities.formatDate(r.REF, Session.getScriptTimeZone(), 'yyyy-MM') : String(r.REF === null || r.REF === undefined ? '' : r.REF),
      nomor: String(r.NOMOR || ''), judul: String(r.JUDUL || ''), tanggal: epcIso_(r.TANGGAL) || '', pihak: String(r.PIHAK || ''),
      nilai: r.NILAI === '' || r.NILAI === null ? null : Number(r.NILAI), bank: String(r.BANK || ''), berlaku: epcIso_(r.BERLAKU_SAMPAI) || '',
      status: String(r.STATUS || '').toUpperCase(), revisi: String(r.REVISI || ''), src: String(r.SUMBER || ''), url: String(r.URL || ''), fileId: String(r.FILE_ID || ''),
      fileName: String(r.NAMA_FILE || ''), size: Number(r.UKURAN) || null, catatan: String(r.CATATAN || ''),
      byU: String(r.DIBUAT_OLEH || ''), by: userDisplayName_(r.DIBUAT_OLEH), atRaw: r.DIBUAT_PADA, at: fmt(r.DIBUAT_PADA), upBy: userDisplayName_(r.DIPERBARUI_OLEH), upAt: fmt(r.DIPERBARUI),
      periode: r.PERIODE instanceof Date ? Utilities.formatDate(r.PERIODE, Session.getScriptTimeZone(), 'yyyy-MM') : String(r.PERIODE || '') };
  });
}
function docRegsOf_(pid) {
  const list = docRegsAll_().filter(function(r) { return r.pid === pid; });
  list.forEach(function(r) { delete r.pid; });
  return list;
}
function docUpdateRow_(id, line) {
  const sh = engSheet_(DOC.SHEETS.REG, true), n = sh.getLastRow();
  const ids = n >= 2 ? sh.getRange(2, 1, n - 1, 1).getValues() : [];
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) { sh.getRange(i + 2, 1, 1, line.length).setValues([line]); return; }
  throw new Error('Baris dokumen tidak ditemukan di sheet.');
}

function docUpload_(ctx, cat, sub, file, judul) {
  const drive = engDriveOf_(ctx.p.id);
  if (!drive) throw new Error('Folder Google Drive tim proyek belum diatur (EPCC Engineering › Setup baseline › Folder Google Drive). Sementara, tempel link berkas.');
  const bytes = Utilities.base64Decode(String(file.base64));
  if (bytes.length > DOC.FILE_MAX) throw new Error('File lebih dari ' + (DOC.FILE_MAX / 1048576) + ' MB. Unggah langsung ke Drive lalu tempel link.');
  const mime = String(file.mime || 'application/octet-stream');
  if (!/^(application\/pdf|image\/|application\/vnd\.openxmlformats|application\/msword|application\/vnd\.ms-|application\/zip)/.test(mime)) throw new Error('Format file tidak didukung. Gunakan PDF, gambar, Office, atau ZIP.');
  let folder;
  try { folder = DriveApp.getFolderById(drive.id); } catch (e) { throw new Error('Folder Google Drive tim proyek tidak bisa dibuka. Periksa akses folder.'); }
  folder = engSubFolder_(engSubFolder_(engSubFolder_(folder, ctx.p.id), 'Document Control'), cat.n.replace(/[\\/:*?"<>|]+/g, '-') + (sub && cat.sub ? ' - ' + cat.sub[sub].replace(/[\\/:*?"<>|→]+/g, '-') : ''));
  const name = String(file.name || judul || 'dokumen').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 150);
  const f = folder.createFile(Utilities.newBlob(bytes, mime, name));
  return { id: f.getId(), url: f.getUrl(), name: f.getName(), size: bytes.length };
}

/** Tebak kategori dari nama file + jalur folder. */
function docGuess_(name, path) {
  const base = String(name || '').replace(/\.[a-z0-9]{2,5}$/i, ''), full = (path.join(' ') + ' ' + base).toLowerCase().replace(/[_\-.]+/g, ' ');
  const g = { kat: '', sub: '', ref: '', periode: '', nomor: '', tanggal: '', judul: base.replace(/[_]+/g, ' ').trim(), yakin: 0 };
  const num = function(re) { const m = full.match(re); return m ? String(parseInt(m[1], 10)) : ''; };
  const rules = [
    [/(jaminan|bank garansi|garansi bank|\bbg\b|surety|guarantee).*(pemeliharaan|maintenance|retensi)|(pemeliharaan|retensi).*(jaminan|garansi)/, 'JAMINAN', 'PEMELIHARAAN'],
    [/(jaminan|bank garansi|garansi bank|\bbg\b|surety|guarantee).*(uang muka|advance|\bum\b)|uang muka.*(jaminan|garansi)/, 'JAMINAN', 'UANG_MUKA'],
    [/(jaminan|garansi|\bbg\b).*tkdn|tkdn.*(jaminan|garansi)/, 'JAMINAN', 'TKDN'],
    [/(jaminan|bank garansi|garansi bank|\bbg\b|surety|performance bond|guarantee)/, 'JAMINAN', 'PELAKSANAAN'],
    [/(penerimaan akhir|\bfho\b|final hand ?over|\bpak\b)/, 'BA_PAK', ''],
    [/(penerimaan awal|\bpho\b|provisional hand ?over|\bbapa\b)/, 'BA_PA', ''],
    [/(as ?built|asbuilt)/, 'ASBUILT', ''],
    [/(addendum|adendum|amandemen|amendment|\badd\b)/, 'ADDENDUM', ''],
    [/termin|termyn|\bbap\b.*bayar|pembayaran/, 'BA_TERMIN', ''],
    [/milestone/, 'BA_MILESTONE', ''],
    [/(serah terima|\bbast\b|hand ?over)/, 'BAST', ''],
    [/(order kerja|\bok\b|\bspk\b|surat perintah kerja)/, 'OK', ''],
    [/(kontrak|contract|perjanjian|\bspmk\b)/, 'KONTRAK', ''],
    [/(berita acara|\bba\b)/, 'BA_PEKERJAAN', '']
  ];
  for (let i = 0; i < rules.length; i++) if (rules[i][0].test(full)) { g.kat = rules[i][1]; g.sub = rules[i][2]; g.yakin = 1; break; }
  if (g.kat === 'BAST') g.sub = /(user|pengguna|operasi|ke user)/.test(full) ? 'USER' : 'TENDER';
  if (g.kat === 'OK') g.sub = /(tambah|additional|kerja tambah|\bkt\b)/.test(full) ? 'TAMBAHAN' : 'UTAMA';
  if (g.kat === 'ADDENDUM') g.ref = num(/(?:addendum|adendum|amandemen|amendment|add)\s*(?:ke\s*|no\s*|#\s*)?0*(\d{1,2})\b/);
  if (g.kat === 'BA_TERMIN') g.ref = num(/(?:termin|termyn)\s*(?:ke\s*)?0*(\d{1,2})\b/);
  if (g.kat === 'BA_MILESTONE' || g.kat === 'BA_TERMIN') {
    const mon = { jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4, mei: 5, jun: 6, juni: 6, jul: 7, juli: 7, agu: 8, agt: 8, agustus: 8, ags: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, nov: 11, november: 11, des: 12, desember: 12 };
    const m = full.match(/\b(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|jun|jul|agu|agt|ags|sep|sept|okt|nov|des)\b\s*(20\d{2})/);
    if (m && g.kat === 'BA_MILESTONE') g.ref = m[2] + '-' + String(mon[m[1]]).padStart(2, '0');
    if (m && g.kat === 'BA_TERMIN') g.periode = m[2] + '-' + String(mon[m[1]]).padStart(2, '0');
  }
  if (g.kat === 'ASBUILT') { const m = base.match(/([A-Z0-9]{1,6}(?:-[A-Z0-9]{1,8}){2,})/i); if (m) g.ref = m[1].toUpperCase(); }
  const nm = base.match(/\b(?:no\.?|nomor)\s*[:.]?\s*([A-Z0-9][A-Z0-9./\-]{3,40})/i); if (nm) g.nomor = nm[1];
  const dt = base.match(/\b(20\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])\b/) || null;
  if (dt) g.tanggal = dt[1] + '-' + dt[2] + '-' + dt[3];
  if (g.kat === 'BA_TERMIN' && !g.periode && g.tanggal) g.periode = g.tanggal.slice(0, 7);
  if (!g.kat) g.kat = 'LAINNYA';
  return g;
}

function docFileName_(r, src) {
  const cat = docCat_(r.kat) || { n: r.kat };
  const parts = [cat.sub && r.sub ? cat.sub[r.sub] : cat.n, r.ref ? (cat.ref === 'TERMIN' ? 'Termin ' + r.ref : cat.ref === 'ADDENDUM' ? 'Add ' + r.ref : r.ref) : '', r.nomor, r.judul].filter(Boolean);
  return (parts.join(' - ').replace(/[\\/:*?"<>|→]+/g, '-').slice(0, 140)) + engExtOf_(src.getName(), src.getMimeType());
}

function docPackages_(pid) {
  const fmt = function(v) { return v instanceof Date && !isNaN(v) ? formatDateId_(v) + ' ' + String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0') : String(v || ''); };
  return engRead_(DOC.SHEETS.PAKET).filter(function(r) { return String(r.PROYEK_ID || '').trim().toUpperCase() === pid; }).map(function(r) {
    return { id: String(r.ID), name: String(r.NAMA || ''), folderId: String(r.FOLDER_ID || ''), url: String(r.URL || ''), status: String(r.STATUS || ''), total: Number(r.TOTAL) || 0,
      copied: Number(r.DISALIN) || 0, failed: Number(r.GAGAL) || 0, registerUrl: String(r.REGISTER_URL || ''), ids: epcJson_(r.ISI_JSON, []), by: userDisplayName_(r.DIBUAT_OLEH), at: fmt(r.DIBUAT_PADA), doneAt: fmt(r.SELESAI_PADA) };
  }).reverse();
}
function docPackageUpdate_(id, patch) {
  const sh = engSheet_(DOC.SHEETS.PAKET, true), v = sh.getDataRange().getValues(), h = v[0].map(function(x) { return String(x).trim().toUpperCase(); });
  for (let i = 1; i < v.length; i++) if (String(v[i][0]) === id) { Object.keys(patch).forEach(function(k) { const c = h.indexOf(k); if (c >= 0) sh.getRange(i + 1, c + 1).setValue(patch[k]); }); return; }
}
function docPackageRegister_(ctx, pk, folder, items, byId) {
  try {
    const ss = SpreadsheetApp.create('DAFTAR_ISI_' + pk.name), sh = ss.getSheets()[0]; sh.setName('DAFTAR ISI');
    const head = ['NO', 'KATEGORI', 'JENIS', 'REF', 'NOMOR', 'JUDUL', 'TANGGAL', 'PIHAK', 'NILAI', 'BERLAKU_SAMPAI', 'STATUS', 'FILE_DI_PAKET', 'BERKAS_ASLI', 'KETERANGAN'];
    const rows = items.map(function(it, i) {
      const r = byId[String(it.DOC_ID)] || {}, cat = docCat_(r.kat) || { n: r.kat || '' };
      return [i + 1, cat.n, cat.sub && r.sub ? cat.sub[r.sub] : '', r.ref || '', r.nomor || '', r.judul || '', r.tanggal || '', r.pihak || '', r.nilai === null || r.nilai === undefined ? '' : r.nilai, r.berlaku || '', r.status || '',
        String(it.URL || ''), r.url || '', String(it.STATUS) === 'OK' ? '' : String(it.KETERANGAN || it.STATUS)];
    });
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#0F2B46').setFontColor('#FFFFFF');
    if (rows.length) sh.getRange(2, 1, rows.length, head.length).setValues(rows);
    sh.setFrozenRows(1); sh.autoResizeColumns(1, head.length);
    DriveApp.getFileById(ss.getId()).moveTo(folder);
    return ss.getUrl();
  } catch (e) { return ''; }
}

function docUploadValidateDraft_(a) {
  a = a || {};
  const cat = docCat_(a.kat);
  if (!cat) throw new Error('Kategori dokumen tidak dikenal.');
  const sub = cat.sub ? String(a.sub || '').toUpperCase() : '';
  if (cat.sub && !cat.sub[sub]) throw new Error('Pilih jenis ' + cat.n.toLowerCase() + '.');
  const judul = String(a.judul || '').trim().slice(0, 300);
  if (!judul) throw new Error('Judul dokumen wajib diisi.');
  const ref = docRefClean_(cat, a.ref);
  if (cat.ref && !ref) throw new Error(cat.ref === 'BULAN' ? 'Pilih bulan milestone.' : cat.ref === 'TERMIN' ? 'Isi termin ke-.' : cat.ref === 'ADDENDUM' ? 'Isi addendum ke-.' : 'Isi nomor gambar.');
  const tanggal = docIsoOrBlank_(a.tanggal), berlaku = docIsoOrBlank_(a.berlaku);
  const periode = /^\d{4}-\d{2}$/.test(String(a.periode || '')) ? String(a.periode) : '';
  if (cat.k === 'BA_TERMIN' && !periode) throw new Error('Pilih bulan pembayaran termin.');
  if (cat.bond && !berlaku) throw new Error('Isi tanggal berlaku sampai untuk jaminan.');
  const nilai = a.nilai === '' || a.nilai === null || a.nilai === undefined ? '' : Number(String(a.nilai).replace(/[^\d.-]/g, ''));
  if (nilai !== '' && !isFinite(nilai)) throw new Error('Nilai tidak valid.');
  const status = cat.bond ? (DOC.BOND_STATUS.indexOf(String(a.status || '').toUpperCase()) >= 0 ? String(a.status).toUpperCase() : 'AKTIF')
    : (DOC.STATUS.indexOf(String(a.status || '').toUpperCase()) >= 0 ? String(a.status).toUpperCase() : 'FINAL');
  return {cat:cat,sub:sub,judul:judul};
}


// Document Control: chunks stay below Apps Script request limits; no application total-size cap.
const DOC_UPLOAD_CHUNK_=8*1024*1024;
const DOC_UPLOAD_TTL_=24*60*60*1000;
function beginDocUpload(token,projectId,a,file){
  a=a||{};
  const ctx=docManageCtx_(token,projectId),v=docUploadValidateDraft_(a);
  if(a.id&&!docRegsOf_(ctx.p.id).some(function(r){return r.id===String(a.id);}))throw new Error('Dokumen tidak ditemukan.');
  const total=Number(file&&file.size),mime=String(file&&file.mime||'application/octet-stream');
  if(!Number.isSafeInteger(total)||total<=0)throw new Error('Ukuran file tidak valid atau file kosong.');
  if(!/^(application\/pdf|image\/|application\/vnd\.openxmlformats|application\/msword|application\/vnd\.ms-|application\/zip)/.test(mime))throw new Error('Format file tidak didukung. Gunakan PDF, gambar, Office, atau ZIP.');
  const drive=engDriveOf_(ctx.p.id);if(!drive)throw new Error('Folder Google Drive tim proyek belum diatur.');
  let folder=DriveApp.getFolderById(drive.id);
  folder=engSubFolder_(engSubFolder_(engSubFolder_(folder,ctx.p.id),'Document Control'),v.cat.n.replace(/[\\/:*?"<>|]+/g,'-')+(v.sub&&v.cat.sub?' - '+v.cat.sub[v.sub].replace(/[\\/:*?"<>|→]+/g,'-'):''));
  const name=String(file.name||v.judul||'dokumen').replace(/[\\/:*?"<>|]+/g,'-').slice(0,150);
  const response=UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,size,webViewLink,parents,mimeType',{
    method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken(),'X-Upload-Content-Type':mime,'X-Upload-Content-Length':String(total)},payload:JSON.stringify({name:name,mimeType:mime,parents:[folder.getId()]}),muteHttpExceptions:true,followRedirects:false
  });
  if(response.getResponseCode()!==200)throw new Error('Sesi unggah Drive belum bisa dibuat (HTTP '+response.getResponseCode()+'). Periksa kuota penyimpanan dan akses folder.');
  const url=docUploadHeader_(response,'location');
  if(!/^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files(?:\?|\/)/.test(url))throw new Error('Alamat sesi unggah Drive tidak valid.');
  const id=Utilities.getUuid(),state={owner:docUploadOwner_(ctx.user),pid:ctx.p.id,kat:v.cat.k,sub:v.sub,docId:String(a.id||''),folder:folder.getId(),url:url,total:total,mime:mime,name:name,offset:0,expires:Date.now()+DOC_UPLOAD_TTL_,complete:null,savedDocId:''};
  docUploadPrune_();docUploadStore_(id,state);
  return {success:true,uploadId:id,chunkBytes:DOC_UPLOAD_CHUNK_,next:0,total:total,complete:false};
}
function uploadDocChunk(token,projectId,uploadId,start,base64){
  const ctx=docManageCtx_(token,projectId),lock=pmoLock_('DOC');lock.waitLock(30000);
  try{
    const s=docUploadSession_(ctx,uploadId);start=Number(start);
    if(!Number.isSafeInteger(start)||start<0)throw new Error('Posisi unggah tidak valid.');
    if(s.complete||start<s.offset)return docUploadReply_(s);
    if(!Number.isSafeInteger(start)||start!==s.offset)throw new Error('Urutan bagian unggah berubah. Lanjutkan dari status unggah terakhir.');
    const encoded=String(base64||'');if(encoded.length>Math.ceil(DOC_UPLOAD_CHUNK_/3)*4+8)throw new Error('Bagian unggah terlalu besar.');
    const bytes=Utilities.base64Decode(encoded),end=start+bytes.length;
    if(!bytes.length||bytes.length>DOC_UPLOAD_CHUNK_||end>s.total||(end<s.total&&bytes.length%(256*1024)!==0))throw new Error('Ukuran bagian unggah tidak valid.');
    const r=UrlFetchApp.fetch(s.url,{method:'put',contentType:s.mime,headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken(),'Content-Range':'bytes '+start+'-'+(end-1)+'/'+s.total},payload:bytes,muteHttpExceptions:true,followRedirects:false});
    docUploadResponse_(s,r);docUploadStore_(uploadId,s);return docUploadReply_(s);
  }finally{lock.releaseLock();}
}
function getDocUploadStatus(token,projectId,uploadId){
  const ctx=docManageCtx_(token,projectId),lock=pmoLock_('DOC');lock.waitLock(30000);
  try{
    const s=docUploadSession_(ctx,uploadId);if(s.complete)return docUploadReply_(s);
    const r=UrlFetchApp.fetch(s.url,{method:'put',contentType:s.mime,headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken(),'Content-Range':'bytes */'+s.total},payload:'',muteHttpExceptions:true,followRedirects:false});
    docUploadResponse_(s,r);docUploadStore_(uploadId,s);return docUploadReply_(s);
  }finally{lock.releaseLock();}
}
function docUploadResponse_(s,r){
  const status=r.getResponseCode();
  if(status===308){
    const range=docUploadHeader_(r,'range'),m=/^bytes=0-(\d+)$/.exec(range),next=m?Number(m[1])+1:0;
    if(!Number.isSafeInteger(next)||next<s.offset||next>s.total)throw new Error('Status penerimaan Drive tidak konsisten. Pilih ulang file untuk mencoba kembali.');
    s.offset=next;return;
  }
  if(status===200||status===201){
    let f;try{f=JSON.parse(r.getContentText());}catch(e){throw new Error('Jawaban Drive tidak bisa dibaca. Coba lanjutkan unggahan.');}
    if(!f.id||Number(f.size)!==s.total||!Array.isArray(f.parents)||f.parents.indexOf(s.folder)<0)throw new Error('Berkas selesai belum cocok dengan ukuran atau folder tujuan. Dokumen belum dicatat.');
    s.offset=s.total;s.complete={id:String(f.id),name:String(f.name||s.name),url:f.webViewLink||DriveApp.getFileById(f.id).getUrl(),size:s.total};return;
  }
  if(status===404||status===410)throw new Error('Sesi unggah kedaluwarsa. Pilih ulang file untuk mencoba kembali.');
  throw new Error('Unggah Drive terhenti (HTTP '+status+'). Klik Simpan lagi untuk melanjutkan.');
}
function docUploadHeader_(r,name){const h=r.getAllHeaders();const k=Object.keys(h).find(function(k){return k.toLowerCase()===name;});return k?String(h[k]):'';}
function docUploadOwner_(u){const owner=String(u.username||u.email||u.name||'').trim().toLowerCase();if(!owner)throw new Error('Identitas pengguna tidak tersedia. Login kembali.');return owner;}
function docUploadSession_(ctx,id){
  if(!/^[a-z0-9-]{20,80}$/i.test(String(id||'')))throw new Error('Sesi unggah tidak valid.');
  let s;try{s=JSON.parse(PropertiesService.getScriptProperties().getProperty('DOCUPLOAD:'+id)||'null');}catch(e){}
  if(!s||s.expires<Date.now())throw new Error('Sesi unggah kedaluwarsa. Pilih ulang file untuk mencoba kembali.');
  if(s.pid!==ctx.p.id||s.owner!==docUploadOwner_(ctx.user))throw new Error('Sesi unggah bukan milik pengguna atau proyek ini.');
  return s;
}
function docUploadStore_(id,s){PropertiesService.getScriptProperties().setProperty('DOCUPLOAD:'+id,JSON.stringify(s));}
function docUploadReply_(s){return {success:true,next:s.offset,total:s.total,complete:!!s.complete,chunkBytes:DOC_UPLOAD_CHUNK_};}
function docUploadPrune_(){const p=PropertiesService.getScriptProperties(),all=p.getProperties();Object.keys(all).filter(function(k){return k.indexOf('DOCUPLOAD:')===0;}).forEach(function(k){try{if(JSON.parse(all[k]).expires<Date.now())p.deleteProperty(k);}catch(e){}});}


// Satu laporan resmi per proyek/periode. Presentasi PPT mempunyai kategori terpisah.
function reportLinkIdentity_(url) {
  const s=String(url||'').trim();
  if (/^https:\/\/(?:drive|docs)\.google\.com\//i.test(s)) {
    const id=engDriveIdOf_(s); if(id)return 'DRIVE:'+id;
  }
  return s.replace(/#.*$/,'').replace(/\/$/,'');
}
function reportLinkPpt_(r,ids) {
  return r.kat==='PRESENTASI'||/\.pptx?(?:$|[?#])/i.test(String(r.fileName||'')+' '+String(r.url||''))||/\.pptx?$/i.test(String(r.fileName||''))||/Dibuat dari Modul 5.*Pelaporan Manajemen/i.test(String(r.catatan||''))||!!(ids&&ids[reportLinkIdentity_(r.url)]);
}
function reportLinkTable_() {
  docEnsureHeader_();const sh=engSheet_(DOC.SHEETS.REG,true),v=sh.getDataRange().getValues();
  return {sh:sh,rows:v.slice(1).map(function(line,i){return {line:line,row:i+2};}),changed:false};
}
function reportLinkPut_(table,entry,line) {
  if(entry){table.sh.getRange(entry.row,1,1,line.length).setValues([line]);entry.line=line;}
  else {const row=table.sh.getLastRow()+1;table.sh.getRange(row,1,1,line.length).setValues([line]);entry={row:row,line:line};table.rows.push(entry);}
  table.changed=true;return entry;
}
function reportLinkActive_(line){return !!line[0]&&line[24]!==false&&String(line[24]).toUpperCase()!=='FALSE';}
function reportLinkKey_(v){return v instanceof Date?Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM'):String(v||'').trim();}
function reportLinkPresentationIds_(pid){const out={};if(typeof mrRecordsOf_==='function')mrRecordsOf_(pid).forEach(function(r){if(r.fileUrl)out[reportLinkIdentity_(r.fileUrl)]=true;});return out;}
function reportLinkReconcile_(user, projectId) {
  const role=String(user.role||'').trim().toUpperCase();if(['ADMIN','INPUT','PIC'].indexOf(role)<0)return false;
  const lock=pmoLock_('DOC', 'DATA');lock.waitLock(30000);
  try{
    DB_CACHE_=null;const db=loadDb_(),projects=db.allProjects.filter(function(p){return (!projectId||p.id===normKey_(projectId))&&userCanOperateProject_(user,p)&&!!db.monthly.projects[p.id];});
    if(!projects.length)return false;
    const table=reportLinkTable_();let changed=false;
    projects.forEach(function(p){if(reportLinkProject_(db,p,user,table,{}))changed=true;});
    if(changed||table.changed){SpreadsheetApp.flush();DB_CACHE_=null;dataChanged_();return true;}return false;
  }finally{lock.releaseLock();}
}
// Caller holds ScriptLock. Only writes LINK_LAPORAN_MONTHLY and the report register.
function reportLinkProject_(db,p,user,table,overrides) {
  if(!userCanOperateProject_(user,p))throw new Error('Hanya Admin atau INPUT/PIC proyek ini yang boleh menyelaraskan link laporan.');
  const ppt=reportLinkPresentationIds_(p.id),by=user.username||user.name||'',now=new Date(),M=db.monthly,rows=rowsOfProject_(M,p.id),linkRow=rows.LINK_LAPORAN_MONTHLY;
  let changed=false;
  const entries=table.rows.filter(function(e){return String(e.line[1]).trim().toUpperCase()===String(p.id).toUpperCase()&&reportLinkActive_(e.line);});
  entries.forEach(function(e){const l=e.line;if(l[2]==='LAPORAN'&&reportLinkPpt_({kat:l[2],url:l[15],fileName:l[17],catatan:l[19]},ppt)){const n=l.slice();n[2]='PRESENTASI';reportLinkPut_(table,e,n);}});
  const official=entries.filter(function(e){return e.line[2]==='LAPORAN';});
  M.months.forEach(function(m){
    const key=monthKey_(m),forced=Object.prototype.hasOwnProperty.call(overrides,key),o=overrides[key]||{},list=official.filter(function(e){return reportLinkKey_(e.line[4])===key;});
    const existing=monthLink_(db,p.id,'LINK_LAPORAN_MONTHLY',m)||'';
    let url=forced?String(o.url||'').trim():String(existing).trim();
    if(!forced&&reportLinkPpt_({url:url},ppt))url='';
    list.sort(function(a,b){return (new Date(b.line[23]).getTime()||0)-(new Date(a.line[23]).getTime()||0)||b.row-a.row;});
    const valid=list.filter(function(e){return String(e.line[12]).toUpperCase()==='FINAL'&&/^https:\/\//i.test(String(e.line[15]||''));});
    if(!forced&&!url&&valid.length)url=String(valid[0].line[15]);
    if(!linkRow)return; // Legacy project without the link row keeps its existing register.
    if(forced&&url&&reportLinkPpt_({url:url},ppt))throw new Error('PPT hasil generate tidak dapat dijadikan link laporan bulanan resmi.');
    if(url&&!/^https:\/\//i.test(url))return;
    let chosen=null;
    if(url){chosen=valid.find(function(e){return (!o.id||String(e.line[0])===String(o.id))&&reportLinkIdentity_(e.line[15])===reportLinkIdentity_(url);})||valid.find(function(e){return reportLinkIdentity_(e.line[15])===reportLinkIdentity_(url);});
      if(!chosen){const id='D'+Utilities.getUuid().slice(0,8).toUpperCase(),line=[id,p.id,'LAPORAN','',key,'','Laporan bulanan '+p.name+' · '+m.label,'','','','','','FINAL','','LINK',url,engDriveIdOf_(url),'','','Terhubung dengan menu Laporan Bulanan',by,now,by,now,true,''];chosen=reportLinkPut_(table,null,line);}
      else if(String(chosen.line[15])!==url){const line=chosen.line.slice();line[15]=url;line[22]=by;line[23]=now;reportLinkPut_(table,chosen,line);}
    }
    if(url||forced)list.forEach(function(e){if(chosen&&String(e.line[0])===String(chosen.line[0]))return;const line=e.line.slice();line[24]=false;line[22]=by;line[23]=now;reportLinkPut_(table,e,line);});
    if(String(existing).trim()!==url&&(url||forced||reportLinkPpt_({url:existing},ppt))){M.sheet.getRange(linkRow,m.col+1).setValue(url);changed=true;}
  });return changed;
}
function reportLinkAfterDoc_(ctx,line,prev) {
  const table=reportLinkTable_(),overrides={},key=reportLinkKey_(line[4]);
  if(prev&&prev.kat==='LAPORAN'&&!reportLinkPpt_(prev,{})&&(prev.ref!==key||line[2]!=='LAPORAN'||line[12]!=='FINAL'))overrides[prev.ref]={url:''};
  if(line[2]==='LAPORAN'&&line[12]==='FINAL')overrides[key]={url:line[15]||'',id:line[0]};
  const changed=reportLinkProject_(ctx.db,ctx.p,ctx.user,table,overrides);
  if(changed||table.changed){SpreadsheetApp.flush();DB_CACHE_=null;dataChanged_();}
}

/** Microsoft links must never be interpreted as Google Drive file IDs. */
function docMicrosoftLink_(url) {
  const m=/^https:\/\/([^/?#]+)(?:[/?#]|$)/i.exec(String(url||'').trim());
  if(!m)return false;const h=m[1].toLowerCase();
  return h==='1drv.ms'||h==='onedrive.live.com'||/(^|\.)sharepoint\.com$/.test(h);
}

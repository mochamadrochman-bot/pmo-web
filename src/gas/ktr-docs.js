'use strict';

/**
 * Akun KONTRAKTOR · kelengkapan dokumen EPCC (18 Nov 2026).
 *
 * 1. Engineering › Dokumen: kontraktor dengan bidang ENG boleh menambah lampiran (link / unggah file) dan
 *    "Link massal" (template Excel). Pindai folder Drive & pengaturan folder tetap khusus ADMIN/tim proyek.
 *    Kontraktor hanya boleh menghapus lampiran yang diunggahnya sendiri.
 * 2. Procurement: kontraktor dengan bidang PROC boleh mengisi/ubah jadwal & tanggal aktual barang impor
 *    (PO, FAT, FOB, ETA, MOS, vendor/negara) dan menambah/memperbarui pengiriman dari dokumen FOB (B/L / AWB),
 *    termasuk baca otomatis dokumen FOB. Menghapus pengiriman tetap khusus ADMIN/tim proyek.
 * Isian ini langsung tersimpan (bukan pengajuan) dan tercatat atas nama akun kontraktor.
 */

const fs = require('node:fs');
const path = require('node:path');

// ---------- server (.gs) ----------
const ENG_CTX = `
/** Konteks lampiran Engineering: ADMIN/INPUT/PIC proyek, atau KONTRAKTOR dengan bidang ENG. */
function engDocCtx_(token, projectId) {
  const user = requireUser_(token);
  if (!ktrIs_(user)) return engAdminCtx_(token, projectId);
  const db = loadDb_(), id = normKey_(projectId);
  const p = db.allProjects.find(function(x) { return x.id === id; }) || findProject_(db.allProjects, projectId);
  if (!p) throw new Error('Proyek tidak ditemukan.');
  if (!ktrCanField_(user, p, 'ENG')) throw new Error('Akun Anda tidak ditugaskan untuk bidang Engineering proyek ini.');
  return { user: user, db: db, p: p, info: engInfo_(db, p), ktr: true };
}
`;

const EPC_CTX = `
/** Konteks dokumen Procurement: ADMIN/INPUT/PIC proyek, atau KONTRAKTOR dengan bidang PROC. */
function epcProcDocCtx_(token, projectId) {
  const user = requireUser_(token);
  if (!ktrIs_(user)) return epcAdminCtx_(token, projectId);
  const db = loadDb_(), id = normKey_(projectId);
  const p = db.allProjects.find(function(x) { return x.id === id; }) || findProject_(db.allProjects, projectId);
  if (!p) throw new Error('Proyek tidak ditemukan.');
  if (!ktrCanField_(user, p, 'PROC')) throw new Error('Akun Anda tidak ditugaskan untuk bidang Procurement proyek ini.');
  return { user: user, db: db, p: p, info: engInfo_(db, p), ktr: true };
}
`;

const GS_PATCHES = [
  // hak akses tampilan
  { file: 'EngApi', find: '  out.canManage = userCanOperateProject_(user, p);', replace: "  out.canManage = userCanOperateProject_(user, p);\n  out.canEngDocs = out.canManage || ktrCanField_(user, p, 'ENG');" },
  { file: 'EpcApi', find: '  out.canManage = userCanOperateProject_(user, p);', replace: "  out.canManage = userCanOperateProject_(user, p);\n  out.canProcDocs = out.canManage || ktrCanField_(user, p, 'PROC');" },
  // Engineering lampiran
  { file: 'EngFilesApi', find: 'function addEngLink(token, projectId, a) {\n  const ctx = engAdminCtx_(token, projectId);', replace: ENG_CTX + '\nfunction addEngLink(token, projectId, a) {\n  const ctx = engDocCtx_(token, projectId);' },
  { file: 'EngFilesApi', find: 'function uploadEngFile(token, projectId, a) {\n  const ctx = engAdminCtx_(token, projectId);', replace: 'function uploadEngFile(token, projectId, a) {\n  const ctx = engDocCtx_(token, projectId);' },
  { file: 'EngFilesApi', find: 'function deleteEngAttachment(token, projectId, id) {\n  const ctx = engAdminCtx_(token, projectId);', replace: 'function deleteEngAttachment(token, projectId, id) {\n  const ctx = engDocCtx_(token, projectId);' },
  {
    file: 'EngFilesApi',
    find: "      const fid = String(v[i][c('FILE_ID')] || '');",
    replace: "      if (ctx.ktr && String(v[i][c('DIUNGGAH_OLEH')] || '').trim().toLowerCase() !== String(ctx.user.username || '').trim().toLowerCase()) throw new Error('Akun kontraktor hanya bisa menghapus lampiran yang diunggahnya sendiri.');\n      const fid = String(v[i][c('FILE_ID')] || '');",
  },
  { file: 'EngFilesApi', find: 'function checkEngLinks(token, projectId, payload) {\n  const ctx = engAdminCtx_(token, projectId);', replace: 'function checkEngLinks(token, projectId, payload) {\n  const ctx = engDocCtx_(token, projectId);' },
  { file: 'EngFilesApi', find: 'function saveEngLinks(token, projectId, payload) {\n  const ctx = engAdminCtx_(token, projectId);', replace: 'function saveEngLinks(token, projectId, payload) {\n  const ctx = engDocCtx_(token, projectId);' },
  { file: 'EngFilesApi', find: 'by: userDisplayName_(r.DIUNGGAH_OLEH),', replace: "by: userDisplayName_(r.DIUNGGAH_OLEH), byU: String(r.DIUNGGAH_OLEH || '').trim().toLowerCase()," },
  // Procurement jadwal/tanggal & pengiriman FOB
  { file: 'EpcApi', find: 'function saveEpccDates(token, projectId, itemId, tgl) {\n  const ctx = epcAdminCtx_(token, projectId);', replace: EPC_CTX + '\nfunction saveEpccDates(token, projectId, itemId, tgl) {\n  const ctx = epcProcDocCtx_(token, projectId);' },
  { file: 'EpcApi', find: 'function saveEpcShipment(token, projectId, s) {\n  s = s || {};\n  const ctx = epcAdminCtx_(token, projectId);', replace: 'function saveEpcShipment(token, projectId, s) {\n  s = s || {};\n  const ctx = epcProcDocCtx_(token, projectId);' },
  { file: 'EpcApi', find: "function readEpcFobDoc(token, projectId, a) {\n  a = a || {};\n  const ctx = epcAdminCtx_(token, projectId),", replace: "function readEpcFobDoc(token, projectId, a) {\n  a = a || {};\n  const ctx = epcProcDocCtx_(token, projectId)," },
];

// ---------- tampilan ----------
const HTML_PATCHES = [
  { file: 'Engineering', find: "document.querySelectorAll('[data-admin]').forEach(function(b){b.hidden=!d.canManage});", replace: "document.querySelectorAll('[data-admin]').forEach(function(b){b.hidden=!d.canManage});document.querySelectorAll('[data-docs]').forEach(function(b){b.hidden=!(d.canManage||d.canEngDocs)});" },
  { file: 'Engineering', find: 'data-admin hidden onclick="openLinks()"', replace: 'data-docs hidden onclick="openLinks()"' },
  { file: 'Engineering', find: "(D.canManage&&addOpen!==k?", replace: "((D.canManage||D.canEngDocs)&&addOpen!==k?" },
  {
    file: 'Engineering',
    find: "(D.canManage?'<button type=\"button\" class=\"btn danger\" data-del=\"'+esc(f.id)+'\">",
    replace: "(D.canManage||(D.canEngDocs&&D.user&&String(f.byU||'')===String(D.user.username||'').toLowerCase())?'<button type=\"button\" class=\"btn danger\" data-del=\"'+esc(f.id)+'\">",
  },
  {
    file: 'Engineering',
    find: "<button type=\"button\" class=\"'+(xl?'':'on')+'\" data-src=\"drv\"><i class=\"ic\" data-ic=\"folder\"></i>Pindai folder Drive</button></div>'",
    replace: "'+(D.canManage?'<button type=\"button\" class=\"'+(xl?'':'on')+'\" data-src=\"drv\"><i class=\"ic\" data-ic=\"folder\"></i>Pindai folder Drive</button>':'')+'</div>'",
  },
  { file: 'Epcc', find: "(SHD.id?'<button type=\"button\" class=\"btn danger\" id=\"shDel\">", replace: "(SHD.id&&D.canManage?'<button type=\"button\" class=\"btn danger\" id=\"shDel\">" },
];

// Baris Epcc.html yang menampilkan tombol isi jadwal / tambah & perbarui pengiriman: D.canManage → (D.canManage||D.canProcDocs).
const EPCC_MARKERS = [
  "Hubungi ADMIN untuk melengkapi.",
  "lewat tombol Ubah / Isi jadwal",
  "data-date=\"'+esc(o.id)+'\">'+(jdMissText(o)?'Isi jadwal':'Ubah')",
  "ADMIN mengunggah PDF/foto dokumen; Asisten PMO membaca nomor dokumen",
  "id=\"shAdd\"",
  "item sudah FOB tetapi belum ada dokumen pengirimannya",
  "Tambahkan dari dokumen FOB (B/L / AWB) saat barang impor dikapalkan.",
  "Perbarui status / ETA</button>",
];
try {
  const lines = fs.readFileSync(path.join(__dirname, '..', '..', 'legacy', 'Epcc.html'), 'utf8').split('\n');
  for (const m of EPCC_MARKERS) {
    const line = lines.find((l) => l.includes(m) && l.includes('D.canManage'));
    if (line) HTML_PATCHES.push({ file: 'Epcc', find: line, replace: line.split('D.canManage').join('(D.canManage||D.canProcDocs)') });
    else console.warn(JSON.stringify({ ev: 'ktr_docs_marker_miss', marker: m }));
  }
} catch (e) { console.warn(JSON.stringify({ ev: 'ktr_docs_read_fail', message: String(e.message || e) })); }

module.exports = { GS_PATCHES, HTML_PATCHES };

'use strict';

/**
 * Input Progress Mingguan · unggah video/materi + kiriman kontraktor (25 Nov 2026).
 *
 * Unggah: browser mengirim file LANGSUNG ke Google Drive akun tim proyek (resumable upload, per potongan
 * 16 MB), tidak lewat VPS. Server hanya membuat sesi unggah dan mencatat hasilnya. Akun tim & folder
 * tujuan memakai sambungan menu Arsip (tabel google_project_auth). File disimpan di <folder>/W<n>/.
 *
 * File lama dibuang ke sampah Drive saat data minggu itu disimpan PIC/Admin dan file tersebut sudah
 * tidak dipakai di sel mana pun (dan tidak dipakai kiriman kontraktor yang masih menunggu).
 *
 * Kiriman kontraktor (tabel ktr_weekly): HSE + link video/materi, menunggu disimpan PIC/Admin.
 * Form PIC/Admin memuatnya otomatis; setelah disimpan statusnya DIPAKAI.
 */

const db = require('../db');
const arsip = require('../arsip/service');

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;
const LIMIT = {
  VIDEO: { max: 2 * GB, label: '2 GB', ext: /\.(mp4|mov|m4v|webm)$/i, mime: /^video\//i, kata: 'video MP4, MOV, M4V atau WEBM' },
  MATERI: { max: 200 * MB, label: '200 MB', ext: /\.(pdf|pptx?|xlsx?|docx?)$/i, mime: null, kata: 'PDF, PowerPoint, Excel atau Word' },
};
const SESSION_TTL = 7 * 24 * 3600 * 1000;

const drafts = new Map(); // 'PID|week' -> draft
const sessions = new Map(); // uploadUrl-key -> { pid, week, kind, folder, name, user, at }

const key = (pid, week) => String(pid).toUpperCase() + '|' + Number(week);
const pidOf = (v) => String(v || '').trim().toUpperCase();
const fail = (msg, status) => Object.assign(new Error(msg), { status: status || 400 });
const gbText = (n) => (n >= GB ? (n / GB).toFixed(2).replace('.', ',') + ' GB' : Math.max(1, Math.round(n / MB)) + ' MB');

// ------------------------------------------------------------ hak akses
/** Sama dengan userCanOperateProject_ + kontraktor proyeknya sendiri. lu = legacyUser(req.user). */
function canUpload(lu, pid) {
  if (!lu) return false;
  const role = String(lu.role || '').toUpperCase();
  if (role === 'ADMIN') return true;
  if (!['INPUT', 'PIC', 'KONTRAKTOR'].includes(role)) return false;
  const own = pidOf(lu.projectId);
  return !!own && own !== 'ALL' && own === pidOf(pid);
}

// ------------------------------------------------------------ status akun tim
async function status(pid) {
  const acc = await arsip.account(pid).catch(() => null);
  if (!acc) return { ready: false, reason: 'Akun Google tim proyek belum dihubungkan. Minta PIC/Admin menghubungkannya di menu Arsip Materi Weekly.' };
  if (!acc.folder_id) return { ready: false, email: acc.email, reason: 'Folder tujuan di akun tim belum dipilih. Atur di menu Arsip Materi Weekly.' };
  const out = { ready: true, email: acc.email, folder: acc.folder_name || '', limits: { VIDEO: LIMIT.VIDEO.max, MATERI: LIMIT.MATERI.max } };
  try {
    const tok = await arsip.token(pid);
    const a = await arsip.gapi(tok, arsip.DRIVE + '/about?fields=storageQuota(limit,usage)');
    if (a.storageQuota && a.storageQuota.limit) out.free = Math.max(0, Number(a.storageQuota.limit) - Number(a.storageQuota.usage || 0));
  } catch (e) {
    return { ready: false, email: acc.email, reason: e.message };
  }
  return out;
}

function safeName(s) {
  return String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
}

// ------------------------------------------------------------ sesi unggah
async function session(lu, body, origin) {
  const pid = pidOf(body.projectId);
  const week = Number(body.week);
  const kind = String(body.kind || '').toUpperCase() === 'VIDEO' ? 'VIDEO' : 'MATERI';
  const L = LIMIT[kind];
  const name = String(body.name || '');
  const size = Number(body.size || 0);
  if (!canUpload(lu, pid)) throw fail('Akun Anda tidak boleh mengunggah untuk proyek ini.', 403);
  if (!Number.isInteger(week) || week < 1 || week > 400) throw fail('Week tidak valid.');
  if (!name || !(size > 0)) throw fail('File kosong.');
  if (!L.ext.test(name) && !(L.mime && L.mime.test(String(body.type || '')))) throw fail('Jenis file harus ' + L.kata + '.');
  if (size > L.max) throw fail('Ukuran file ' + gbText(size) + ' melebihi batas ' + L.label + '.');
  const st = await status(pid);
  if (!st.ready) throw fail(st.reason);
  if (st.free != null && st.free < size) throw fail('Ruang Drive akun tim tidak cukup: perlu ' + gbText(size) + ', tersisa ' + gbText(st.free) + '. Kosongkan sampah Drive atau tambah kapasitas.');
  const acc = await arsip.account(pid);
  const tok = await arsip.token(pid);
  const parent = await arsip.subFolder(tok, acc.folder_id, 'W' + week, new Map());
  const ext = (name.match(/\.[A-Za-z0-9]{1,6}$/) || [''])[0];
  const fname = 'W' + week + ' - ' + (kind === 'VIDEO' ? 'Video' : 'Materi') + ' - ' + safeName(name.replace(/\.[A-Za-z0-9]{1,6}$/, '')) + ext;
  const res = await arsip.gapi(tok, arsip.UPLOAD + '/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,size,mimeType', {
    method: 'POST', raw: true,
    headers: { Origin: origin, 'X-Upload-Content-Type': String(body.type || 'application/octet-stream'), 'X-Upload-Content-Length': String(size) },
    body: { name: fname, parents: [parent] },
  });
  if (!res.ok) throw fail('Google menolak sesi unggah (HTTP ' + res.status + ').', 502);
  const uploadUrl = res.headers.get('location');
  const now = Date.now();
  for (const [k, v] of sessions) if (now - v.at > SESSION_TTL) sessions.delete(k);
  sessions.set(pid + '|' + fname, { pid, week, kind, folder: parent, name: fname, user: lu.username, at: now });
  return { uploadUrl, name: fname, chunk: 16 * MB };
}

async function done(lu, body) {
  const pid = pidOf(body.projectId);
  const week = Number(body.week);
  const kind = String(body.kind || '').toUpperCase() === 'VIDEO' ? 'VIDEO' : 'MATERI';
  const fileId = String(body.fileId || '').trim();
  if (!canUpload(lu, pid)) throw fail('Akun Anda tidak boleh mengunggah untuk proyek ini.', 403);
  if (!/^[A-Za-z0-9_-]{10,}$/.test(fileId)) throw fail('ID file tidak valid.');
  const tok = await arsip.token(pid);
  const f = await arsip.gapi(tok, arsip.DRIVE + '/files/' + fileId + '?supportsAllDrives=true&fields=id,name,size,mimeType,parents,trashed,ownedByMe');
  const ses = sessions.get(pid + '|' + f.name);
  const okParent = ses ? (f.parents || []).includes(ses.folder) : String(f.name || '').startsWith('W' + week + ' - ');
  if (!okParent || f.trashed) throw fail('File tidak dikenali sebagai unggahan minggu ini.');
  await arsip.shareAnyone(tok, f.id);
  const url = arsip.viewUrl(f.id);
  await db.query(
    `insert into weekly_uploads (project_id, week, kind, file_id, url, name, size_bytes, status, uploaded_by)
     values ($1,$2,$3,$4,$5,$6,$7,'BARU',$8) on conflict (file_id) do nothing`,
    [pid, week, kind, f.id, url, f.name, f.size ? Number(f.size) : null, lu.username]);
  if (ses) sessions.delete(pid + '|' + f.name);
  return { url, name: f.name, size: f.size ? Number(f.size) : null, mime: f.mimeType };
}

// ------------------------------------------------------------ kiriman kontraktor
async function loadDrafts() {
  drafts.clear();
  const r = await db.query(`select * from ktr_weekly where status = 'BARU'`);
  r.rows.forEach((x) => drafts.set(key(x.project_id, x.week), fromRow(x)));
}
function fromRow(x) {
  return {
    projectId: x.project_id, week: x.week, hseEnabled: x.hse_enabled !== false, hse: x.hse || {},
    videoUrl: x.video_url || '', materialUrl: x.material_url || '', reportDate: x.report_date || '',
    by: x.by_user || '', byName: x.by_name || x.by_user || '',
    at: x.updated_at instanceof Date ? x.updated_at.toISOString() : String(x.updated_at || ''),
  };
}

/** Dipanggil dari kode .gs (sinkron): simpan di memori, tulis ke database di latar belakang. */
function saveDraft(d) {
  const rec = {
    projectId: pidOf(d.projectId), week: Number(d.week), hseEnabled: d.hseEnabled !== false, hse: d.hse || {},
    videoUrl: String(d.videoUrl || ''), materialUrl: String(d.materialUrl || ''), reportDate: String(d.reportDate || ''),
    by: String(d.by || ''), byName: String(d.byName || d.by || ''), at: new Date().toISOString(),
  };
  drafts.set(key(rec.projectId, rec.week), rec);
  db.query(
    `insert into ktr_weekly (project_id, week, hse_enabled, hse, video_url, material_url, report_date, status, by_user, by_name, updated_at, used_by, used_at)
     values ($1,$2,$3,$4,$5,$6,$7,'BARU',$8,$9,$10,null,null)
     on conflict (project_id, week) do update set hse_enabled = excluded.hse_enabled, hse = excluded.hse, video_url = excluded.video_url,
       material_url = excluded.material_url, report_date = excluded.report_date, status = 'BARU', by_user = excluded.by_user,
       by_name = excluded.by_name, updated_at = excluded.updated_at, used_by = null, used_at = null`,
    [rec.projectId, rec.week, rec.hseEnabled, JSON.stringify(rec.hse), rec.videoUrl, rec.materialUrl, rec.reportDate, rec.by, rec.byName, rec.at])
    .catch((e) => console.error(JSON.stringify({ ev: 'ktr_weekly_save_fail', message: e.message })));
  return Object.assign({}, rec);
}
function draft(pid, week) {
  const d = drafts.get(key(pid, week));
  return d ? JSON.parse(JSON.stringify(d)) : null;
}

// ------------------------------------------------------------ setelah PIC/Admin menyimpan
/** payload = isi submitWeeklyInput. Dipanggil setelah simpan berhasil (routes/gas.js). */
async function afterSave(payload, lu) {
  const pid = pidOf(payload && payload.projectId);
  const week = Number(payload && payload.week);
  if (!pid || !week) return;
  // Kiriman kontraktor yang dimuat di form ini sudah dipakai.
  const d = drafts.get(key(pid, week));
  if (d && payload.ktrDraftAt && payload.ktrDraftAt === d.at) {
    drafts.delete(key(pid, week));
    await db.query(`update ktr_weekly set status = 'DIPAKAI', used_by = $3, used_at = now() where project_id = $1 and week = $2`, [pid, week, lu && lu.username]);
  }
  const rows = (await db.query(`select id, file_id, kind from weekly_uploads where project_id = $1 and week = $2 and status in ('BARU','AKTIF')`, [pid, week])).rows;
  if (!rows.length) return;
  const used = new Set();
  try { arsip.cells(pid).list.forEach((c) => { if (c.fileId) used.add(c.fileId); }); } catch (e) { return; } // data sel tidak terbaca: jangan buang apa pun
  [payload.videoUrl, payload.materialUrl].forEach((u) => { const id = arsip.fileIdOf(u); if (id) used.add(id); });
  for (const x of drafts.values()) if (x.projectId === pid) [x.videoUrl, x.materialUrl].forEach((u) => { const id = arsip.fileIdOf(u); if (id) used.add(id); });
  let tok = null;
  for (const r of rows) {
    if (used.has(r.file_id)) { await db.query(`update weekly_uploads set status = 'AKTIF' where id = $1`, [r.id]); continue; }
    try {
      tok = tok || await arsip.token(pid);
      await arsip.gapi(tok, arsip.DRIVE + '/files/' + r.file_id + '?supportsAllDrives=true&fields=id', { method: 'PATCH', body: { trashed: true } });
      await db.query(`update weekly_uploads set status = 'DIBUANG', trashed_at = now(), note = $2 where id = $1`, [r.id, 'diganti saat simpan W' + week + ' oleh ' + (lu && lu.username)]);
    } catch (e) {
      if (e.status === 404) await db.query(`update weekly_uploads set status = 'DIBUANG', note = 'tidak ditemukan di Drive' where id = $1`, [r.id]);
      else console.error(JSON.stringify({ ev: 'weekly_upload_trash_fail', pid, week, file: r.file_id, message: e.message }));
    }
  }
}

async function init() {
  await loadDrafts();
}

const bridge = { draft, saveDraft };

module.exports = { init, status, session, done, afterSave, canUpload, bridge, LIMIT };

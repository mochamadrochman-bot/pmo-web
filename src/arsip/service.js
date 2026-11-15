'use strict';

/**
 * Arsip Materi Weekly.
 *
 * Setiap proyek menyambungkan akun Google tim proyeknya sendiri dan memilih satu folder tujuan.
 * Video dan materi weekly (LINK_VIDEO / LINK_MATERI di DATA MINGGUAN PROYEK) yang tersimpan di
 * akun lain (kontraktor, perorangan) disalin ke folder itu DI DALAM Google (files.copy), jadi
 * datanya tidak lewat server. File asli tetap ada. File yang sudah milik akun tim dilewati.
 * Setelah salinan terbukti bisa dibuka, tautan di sel diganti ke salinan baru; tautan lama
 * dicatat di tabel arsip_items supaya bisa dipulihkan.
 */

const db = require('../db');
const store = require('../gas/store');
const gauth = require('../google/auth');
const { clearCache } = require('../gas/services');

const DRIVE = process.env.GOOGLE_DRIVE_API || 'https://www.googleapis.com/drive/v3';
const UPLOAD = process.env.GOOGLE_DRIVE_UPLOAD || 'https://www.googleapis.com/upload/drive/v3';
const SHEETS = process.env.GOOGLE_SHEETS_API || 'https://sheets.googleapis.com/v4';
const TOKEN_URL = process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const USERINFO = process.env.GOOGLE_USERINFO_URL || 'https://openidconnect.googleapis.com/v1/userinfo';
const WEEKLY = 'DATA MINGGUAN PROYEK';
const ITEMS = { LINK_VIDEO: 'VIDEO', LINK_MATERI: 'MATERI' };
const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/drive'];

// ------------------------------------------------------------ akun Google per proyek
const tokens = new Map(); // project_id -> { token, exp }

async function account(pid) {
  const r = await db.query('select project_id, email, refresh_token, folder_id, folder_name, connected_at, connected_by from google_project_auth where project_id = $1', [pid]);
  return r.rows[0] || null;
}

function authUrl(redirectUri, stateStr) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri, response_type: 'code',
    scope: SCOPES.join(' '), access_type: 'offline', prompt: 'consent select_account', state: stateStr,
  });
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + q.toString();
}

async function exchangeCode(pid, code, redirectUri, actor) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, redirect_uri: redirectUri, grant_type: 'authorization_code',
      client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) throw new Error('Google menolak: ' + (j.error_description || j.error || res.status));
  if (!j.refresh_token) throw new Error('Google tidak memberi refresh token. Cabut akses aplikasi di myaccount.google.com/permissions lalu hubungkan ulang.');
  if (!String(j.scope || '').includes('/auth/drive')) throw new Error('Izin Google Drive tidak diberikan. Ulangi dan centang semua izin.');
  let email = null;
  try { email = (await (await fetch(USERINFO, { headers: { Authorization: 'Bearer ' + j.access_token } })).json()).email || null; } catch (e) { email = null; }
  await db.query(
    `insert into google_project_auth (project_id, email, refresh_token, scope, connected_at, connected_by)
     values ($1,$2,$3,$4,now(),$5)
     on conflict (project_id) do update set email = excluded.email, refresh_token = excluded.refresh_token,
       scope = excluded.scope, connected_at = now(), connected_by = excluded.connected_by,
       folder_id = case when google_project_auth.email = excluded.email then google_project_auth.folder_id end,
       folder_name = case when google_project_auth.email = excluded.email then google_project_auth.folder_name end`,
    [pid, email, j.refresh_token, j.scope, actor || null]);
  tokens.set(pid, { token: j.access_token, exp: Date.now() + (Number(j.expires_in || 3600) - 120) * 1000 });
  return { email };
}

async function disconnect(pid) {
  const a = await account(pid);
  await db.query('delete from google_project_auth where project_id = $1', [pid]);
  tokens.delete(pid);
  if (a && a.refresh_token) {
    try { await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(a.refresh_token), { method: 'POST' }); } catch (e) { /* abaikan */ }
  }
}

async function token(pid) {
  const t = tokens.get(pid);
  if (t && t.exp > Date.now()) return t.token;
  const a = await account(pid);
  if (!a) throw new Error('Akun Google tim proyek belum dihubungkan.');
  const r = await fetch(TOKEN_URL, {
    method: 'POST', body: new URLSearchParams({
      grant_type: 'refresh_token', refresh_token: a.refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    if (j.error === 'invalid_grant') throw new Error('Izin akun Google tim sudah dicabut atau kedaluwarsa. Hubungkan ulang.');
    throw new Error('Gagal mendapatkan akses Google (' + (j.error || r.status) + ').');
  }
  tokens.set(pid, { token: j.access_token, exp: Date.now() + (Number(j.expires_in || 3600) - 120) * 1000 });
  return j.access_token;
}

async function gapi(tok, url, opts) {
  const o = opts || {};
  const res = await fetch(url, {
    method: o.method || 'GET',
    headers: Object.assign({ Authorization: 'Bearer ' + tok }, o.body ? { 'content-type': 'application/json' } : {}, o.headers || {}),
    body: o.body ? JSON.stringify(o.body) : undefined,
  });
  if (o.raw) return res;
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error((j.error && j.error.message) || ('HTTP ' + res.status));
    e.status = res.status;
    throw e;
  }
  return j;
}

// ------------------------------------------------------------ tautan
function fileIdOf(url) {
  const u = String(url || '');
  const m = u.match(/\/d\/([A-Za-z0-9_-]{20,})/) || u.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  return m ? m[1] : null;
}
function folderIdOf(url) {
  const u = String(url || '').trim();
  const m = u.match(/\/folders\/([A-Za-z0-9_-]{15,})/) || u.match(/[?&]id=([A-Za-z0-9_-]{15,})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{15,}$/.test(u) ? u : null;
}
function hostKind(url) {
  const u = String(url || '');
  if (/1drv\.ms|onedrive\.live|sharepoint\.com/i.test(u)) return 'onedrive';
  if (/\/folders\//.test(u)) return 'folder';
  if (/(drive|docs)\.google\.com/.test(u) && fileIdOf(u)) return 'drive';
  return 'lain';
}
const viewUrl = (id) => 'https://drive.google.com/file/d/' + id + '/view?usp=sharing';

/** Semua sel LINK_VIDEO / LINK_MATERI berisi tautan untuk satu proyek. */
function cells(pid) {
  const b = store.book();
  const s = b && b.sheets.get(WEEKLY);
  if (!s) return { name: pid, list: [] };
  const hdr = s.values[3] || [];
  const list = [];
  let name = pid;
  for (let r = 4; r < s.values.length; r++) {
    const row = s.values[r] || [];
    if (String(row[0] || '').trim() !== pid) continue;
    name = String(row[2] || name);
    const item = ITEMS[String(row[3] || '').trim()];
    if (!item) continue;
    for (let c = 4; c < hdr.length; c++) {
      let url = s.links[r + ',' + c] || '';
      const v = String(row[c] == null ? '' : row[c]).trim();
      if (!url && /^https?:\/\//i.test(v)) url = v;
      if (!url) continue;
      const wk = String(hdr[c] || '').match(/(\d+)/);
      list.push({ row: r, col: c, item, week: wk ? 'W' + wk[1] : String(hdr[c]), url, kind: hostKind(url), fileId: fileIdOf(url) });
    }
  }
  return { name, list };
}

function projects() {
  const b = store.book();
  const s = b && b.sheets.get(WEEKLY);
  const seen = new Map();
  if (!s) return [];
  for (let r = 4; r < s.values.length; r++) {
    const row = s.values[r] || [];
    const id = String(row[0] || '').trim();
    if (id && !seen.has(id)) seen.set(id, String(row[2] || id));
  }
  return [...seen].map(([id, name]) => ({ id, name }));
}

// ------------------------------------------------------------ inventaris
async function inventory(pid) {
  const { name, list } = cells(pid);
  const acc = await account(pid);
  let tok = null;
  let tokErr = null;
  if (acc) { try { tok = await token(pid); } catch (e) { tokErr = e.message; } }
  const me = acc && acc.email ? acc.email.toLowerCase() : null;
  const meta = new Map();
  if (tok) {
    const ids = [...new Set(list.filter((x) => x.kind === 'drive').map((x) => x.fileId))];
    let i = 0;
    const worker = async () => {
      while (i < ids.length) {
        const id = ids[i++];
        try {
          meta.set(id, await gapi(tok, DRIVE + '/files/' + id + '?supportsAllDrives=true&fields=id,name,mimeType,size,owners(emailAddress),ownedByMe,driveId,trashed'));
        } catch (e) { meta.set(id, { error: e.status === 404 ? 'Tidak ditemukan atau belum dibagikan ke akun tim' : e.message }); }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  }
  const items = list.map((x) => {
    const o = Object.assign({}, x);
    if (x.kind === 'onedrive') { o.status = 'onedrive'; return o; }
    if (x.kind === 'folder') { o.status = 'folder'; return o; }
    if (x.kind !== 'drive') { o.status = 'lain'; return o; }
    if (!tok) { o.status = 'belum-cek'; return o; }
    const m = meta.get(x.fileId) || {};
    if (m.error || m.trashed) { o.status = 'akses'; o.error = m.error || 'File ada di sampah pemiliknya'; return o; }
    o.title = m.name; o.size = m.size ? Number(m.size) : null; o.mime = m.mimeType;
    o.owner = m.owners && m.owners[0] ? m.owners[0].emailAddress : (m.driveId ? 'Shared drive' : '');
    o.status = (m.ownedByMe || (me && String(o.owner).toLowerCase() === me)) ? 'tim' : 'salin';
    return o;
  });
  let quota = null;
  if (tok) {
    try {
      const a = await gapi(tok, DRIVE + '/about?fields=storageQuota(limit,usage)');
      quota = { limit: a.storageQuota.limit ? Number(a.storageQuota.limit) : null, usage: Number(a.storageQuota.usage || 0) };
    } catch (e) { quota = null; }
  }
  const seen = new Set();
  let need = 0;
  items.forEach((x) => { if (x.status === 'salin' && !seen.has(x.fileId)) { seen.add(x.fileId); need += x.size || 0; } });
  const hist = await db.query('select status, count(*)::int n from arsip_items where project_id = $1 group by status', [pid]);
  return {
    project: { id: pid, name },
    account: acc ? { email: acc.email, folderId: acc.folder_id, folderName: acc.folder_name, connectedAt: acc.connected_at } : null,
    tokenError: tokErr, quota, need, items,
    history: Object.fromEntries(hist.rows.map((r) => [r.status, r.n])),
    job: publicJob(pid),
  };
}

async function setFolder(pid, url) {
  const id = folderIdOf(url);
  if (!id) throw new Error('Tautan folder tidak dikenali. Salin tautan folder dari Google Drive (…/folders/…).');
  const tok = await token(pid);
  let f;
  try { f = await gapi(tok, DRIVE + '/files/' + id + '?supportsAllDrives=true&fields=id,name,mimeType,trashed,capabilities(canAddChildren)'); } catch (e) {
    throw new Error(e.status === 404 ? 'Folder tidak ditemukan atau tidak bisa dibuka oleh akun tim yang terhubung.' : e.message);
  }
  if (f.mimeType !== 'application/vnd.google-apps.folder') throw new Error('Tautan itu bukan folder.');
  if (f.trashed) throw new Error('Folder ada di sampah.');
  if (!f.capabilities || !f.capabilities.canAddChildren) throw new Error('Akun tim tidak punya izin menambah file ke folder ini.');
  await db.query('update google_project_auth set folder_id = $2, folder_name = $3 where project_id = $1', [pid, f.id, f.name]);
  return { id: f.id, name: f.name };
}

// ------------------------------------------------------------ ganti tautan di sel
let sheetIdCache = null;
async function googleSheetId() {
  if (sheetIdCache != null) return sheetIdCache;
  const tok = await gauth.accessToken();
  const j = await gapi(tok, SHEETS + '/spreadsheets/' + store.MAIN_ID + '?fields=sheets.properties(sheetId,title)');
  const s = (j.sheets || []).find((x) => x.properties.title === WEEKLY);
  if (!s) throw new Error('Sheet ' + WEEKLY + ' tidak ditemukan di Google Sheets.');
  sheetIdCache = s.properties.sheetId;
  return sheetIdCache;
}

/**
 * Tulis tautan baru ke satu sel: ke data server, dan (selama data masih mengikuti Google Sheets)
 * juga ke spreadsheet induk supaya sinkron berikutnya tidak mengembalikan tautan lama.
 */
async function setCellLink(row, col, url) {
  const s = store.book().sheets.get(WEEKLY);
  const v = String((s.values[row] || [])[col] == null ? '' : s.values[row][col]).trim();
  const text = (!v || /^https?:\/\//i.test(v)) ? url : v;
  if (store.mode() !== 'produksi' && gauth.status().connected) {
    const sheetId = await googleSheetId();
    const tok = await gauth.accessToken();
    await gapi(tok, SHEETS + '/spreadsheets/' + store.MAIN_ID + ':batchUpdate', {
      method: 'POST',
      body: { requests: [{ updateCells: {
        range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: col, endColumnIndex: col + 1 },
        rows: [{ values: [{ userEnteredValue: { stringValue: text }, userEnteredFormat: { textFormat: { link: { uri: url } } }, textFormatRuns: [] }] }],
        fields: 'userEnteredValue,userEnteredFormat.textFormat.link,textFormatRuns',
      } }] },
    });
  }
  if (!s.values[row]) s.values[row] = [];
  s.values[row][col] = text;
  if (!s.display[row]) s.display[row] = [];
  s.display[row][col] = text;
  s.links[row + ',' + col] = url;
  s.dirty = true;
  await store.flush();
  clearCache();
}

// ------------------------------------------------------------ proses arsip (latar belakang)
const jobs = new Map(); // pid -> job

function publicJob(pid) {
  const j = jobs.get(pid);
  if (!j) return null;
  return { running: j.running, total: j.total, done: j.done, ok: j.ok, fail: j.fail, skipped: j.skipped, current: j.current, startedAt: j.startedAt, finishedAt: j.finishedAt, log: j.log.slice(-40), error: j.error };
}

const safe = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, '-').trim();

async function subFolder(tok, parent, name, cache) {
  if (cache.has(name)) return cache.get(name);
  const q = "'" + parent + "' in parents and name = '" + name.replace(/'/g, "\\'") + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  const found = await gapi(tok, DRIVE + '/files?supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id)&q=' + encodeURIComponent(q));
  let id = found.files && found.files[0] ? found.files[0].id : null;
  if (!id) id = (await gapi(tok, DRIVE + '/files?supportsAllDrives=true&fields=id', { method: 'POST', body: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parent] } })).id;
  cache.set(name, id);
  return id;
}

async function shareAnyone(tok, id) {
  try {
    await gapi(tok, DRIVE + '/files/' + id + '/permissions?supportsAllDrives=true', { method: 'POST', body: { type: 'anyone', role: 'reader', allowFileDiscovery: false } });
  } catch (e) { /* kebijakan domain bisa melarang; salinan tetap bisa dibuka anggota yang punya akses */ }
}

async function record(pid, x, extra, actor) {
  await db.query(
    `insert into arsip_items (project_id, item, week, row_idx, col_idx, old_url, old_file_id, new_url, new_file_id, title, size_bytes, status, error, actor)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [pid, x.item, x.week, x.row, x.col, x.url, x.fileId || null, extra.newUrl || null, extra.newId || null, x.title || extra.title || null, x.size || extra.size || null, extra.status, extra.error || null, actor]);
}

async function start(pid, actor) {
  const cur = jobs.get(pid);
  if (cur && cur.running) throw new Error('Arsip proyek ini sedang berjalan.');
  const acc = await account(pid);
  if (!acc) throw new Error('Hubungkan akun Google tim proyek dulu.');
  if (!acc.folder_id) throw new Error('Pilih folder tujuan dulu.');
  const inv = await inventory(pid);
  if (inv.tokenError) throw new Error(inv.tokenError);
  const todo = inv.items.filter((x) => x.status === 'salin');
  if (!todo.length) throw new Error('Tidak ada file yang perlu disalin.');
  if (inv.quota && inv.quota.limit && inv.quota.limit - inv.quota.usage < inv.need) {
    const gb = (n) => (n / 1e9).toFixed(2).replace('.', ',') + ' GB';
    throw new Error('Ruang Drive akun tim tidak cukup: perlu ' + gb(inv.need) + ', tersisa ' + gb(Math.max(0, inv.quota.limit - inv.quota.usage)) + '. Tambah kapasitas atau kosongkan Drive dulu.');
  }
  const job = { running: true, total: todo.length, done: 0, ok: 0, fail: 0, skipped: 0, current: null, startedAt: new Date(), finishedAt: null, log: [], error: null };
  jobs.set(pid, job);
  run(pid, acc, inv, todo, job, actor).catch((e) => { job.error = e.message; job.running = false; job.finishedAt = new Date(); });
  return publicJob(pid);
}

async function run(pid, acc, inv, todo, job, actor) {
  const folders = new Map();
  const copied = new Map(); // fileId lama -> { id, url }
  for (const x of todo) {
    job.current = x.week + ' · ' + x.item + ' · ' + (x.title || x.fileId);
    try {
      let dest = copied.get(x.fileId);
      if (!dest) {
        const tok = await token(pid);
        const parent = await subFolder(tok, acc.folder_id, x.week, folders);
        const name = safe(x.week + ' - ' + (x.item === 'VIDEO' ? 'Video' : 'Materi') + ' - ' + (x.title || inv.project.name));
        const c = await gapi(tok, DRIVE + '/files/' + x.fileId + '/copy?supportsAllDrives=true&fields=id,name,size', { method: 'POST', body: { name, parents: [parent] } });
        await shareAnyone(tok, c.id);
        const chk = await gapi(await token(pid), DRIVE + '/files/' + c.id + '?supportsAllDrives=true&fields=id,size,trashed');
        if (!chk || chk.trashed) throw new Error('Salinan tidak bisa diverifikasi.');
        dest = { id: c.id, url: viewUrl(c.id) };
        copied.set(x.fileId, dest);
      }
      await setCellLink(x.row, x.col, dest.url);
      await record(pid, x, { newUrl: dest.url, newId: dest.id, status: 'disalin' }, actor);
      job.ok++;
      job.log.push({ ok: true, text: x.week + ' ' + x.item + ': ' + (x.title || x.fileId) });
    } catch (e) {
      job.fail++;
      job.log.push({ ok: false, text: x.week + ' ' + x.item + ': ' + (x.title || x.fileId) + ' — ' + e.message });
      try { await record(pid, x, { status: 'gagal', error: e.message }, actor); } catch (e2) { /* abaikan */ }
    }
    job.done++;
  }
  job.current = null;
  job.running = false;
  job.finishedAt = new Date();
  console.log(JSON.stringify({ ev: 'arsip_done', pid, ok: job.ok, fail: job.fail }));
}

/** Kembalikan tautan lama untuk semua sel yang pernah disalin/diunggah dan tautannya belum berubah lagi. */
async function restore(pid, actor) {
  const rows = (await db.query(
    "select * from arsip_items where project_id = $1 and status in ('disalin','diunggah') order by id desc", [pid])).rows;
  const s = store.book().sheets.get(WEEKLY);
  const done = new Set();
  let n = 0;
  for (const r of rows) {
    const k = r.row_idx + ',' + r.col_idx;
    if (done.has(k)) continue;
    done.add(k);
    if ((s.links[k] || '') !== r.new_url || !r.old_url) continue;
    await setCellLink(r.row_idx, r.col_idx, r.old_url);
    await db.query("update arsip_items set status = 'dipulihkan' where id = $1", [r.id]);
    n++;
  }
  await db.query("insert into arsip_items (project_id, item, week, row_idx, col_idx, status, actor, error) values ($1,'-','-',-1,-1,'pulih-log',$2,$3)", [pid, actor, n + ' tautan dipulihkan']);
  return { restored: n };
}

// ------------------------------------------------------------ unggah manual (OneDrive / tak bisa diakses)
async function uploadSession(pid, cell, file, origin) {
  const acc = await account(pid);
  if (!acc || !acc.folder_id) throw new Error('Hubungkan akun tim dan pilih folder tujuan dulu.');
  const x = cells(pid).list.find((c) => c.row === cell.row && c.col === cell.col);
  if (!x) throw new Error('Sel tidak dikenali.');
  const tok = await token(pid);
  const parent = await subFolder(tok, acc.folder_id, x.week, new Map());
  const ext = (String(file.name || '').match(/\.[A-Za-z0-9]{1,6}$/) || [''])[0];
  const name = safe(x.week + ' - ' + (x.item === 'VIDEO' ? 'Video' : 'Materi') + ' - ' + String(file.name || '').replace(/\.[A-Za-z0-9]{1,6}$/, '')) + ext;
  const res = await gapi(tok, UPLOAD + '/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,size', {
    method: 'POST', raw: true,
    headers: { Origin: origin, 'X-Upload-Content-Type': file.type || 'application/octet-stream', 'X-Upload-Content-Length': String(file.size || 0) },
    body: { name, parents: [parent] },
  });
  if (!res.ok) throw new Error('Google menolak sesi unggah (HTTP ' + res.status + ').');
  return { uploadUrl: res.headers.get('location'), name };
}

async function uploadDone(pid, cell, fileId, actor) {
  const x = cells(pid).list.find((c) => c.row === cell.row && c.col === cell.col);
  if (!x) throw new Error('Sel tidak dikenali.');
  const tok = await token(pid);
  const f = await gapi(tok, DRIVE + '/files/' + fileId + '?supportsAllDrives=true&fields=id,name,size,ownedByMe');
  await shareAnyone(tok, f.id);
  const url = viewUrl(f.id);
  await setCellLink(x.row, x.col, url);
  await record(pid, x, { newUrl: url, newId: f.id, title: f.name, size: f.size ? Number(f.size) : null, status: 'diunggah' }, actor);
  return { url };
}

module.exports = {
  account, authUrl, exchangeCode, disconnect, inventory, setFolder, start, publicJob, restore,
  uploadSession, uploadDone, projects, cells, fileIdOf, folderIdOf, hostKind,
};

'use strict';

/**
 * Pengaturan & Proxy Cache Foto Hero Banner Portal:
 *   - GET    /media/hero/:id                  : sajikan foto hero via cache memori + disk dari Google Drive OAuth
 *   - GET    /admin/hero-portal               : halaman Admin Center untuk kelola hero banner Portal
 *   - GET    /api/admin/hero-portal           : daftar foto di folder PORTAL_HERO_FOLDER (terurut)
 *   - POST   /api/admin/hero-portal/upload    : unggah foto baru ke Google Drive folder hero (otomatis share viewer)
 *   - PATCH  /api/admin/hero-portal/:id       : ubah caption (description) / nama file di Google Drive
 *   - POST   /api/admin/hero-portal/order     : simpan urutan tampil foto hero (gas_props S:PORTAL_HERO_ORDER)
 *   - POST   /api/admin/hero-portal/folder    : ganti ID folder Drive hero (gas_props S:PORTAL_HERO_FOLDER)
 *   - POST   /api/admin/hero-portal/refresh   : bersihkan cache foto memori/disk & Portal
 *   - DELETE /api/admin/hero-portal/:id       : pindahkan foto hero ke Trash Google Drive
 */

const express = require('express');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const db = require('../db');
const gauth = require('../google/auth');
const store = require('../gas/store');
const { clearCache } = require('../gas/services');
const { renderPage } = require('../render');
const { requireUser, requireModule, audit } = require('../middleware/auth');

const router = express.Router();
const onlyAdmin = requireModule('akun');

const DEFAULT_FOLDER_ID = '1w0To-LisA2Go9JgX6kRCNdkyoQ9yh0Xw';
const DRIVE_API = (process.env.GOOGLE_DRIVE_API || 'https://www.googleapis.com/drive/v3').replace(/\/$/, '');
const DRIVE_UPLOAD = (process.env.GOOGLE_DRIVE_UPLOAD || 'https://www.googleapis.com/upload/drive/v3').replace(/\/$/, '');
const CACHE_DIR = process.env.HERO_CACHE_DIR || path.join(os.tmpdir(), 'pmo-hero-cache');

const ID_RE = /^[A-Za-z0-9_-]{10,120}$/;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_CACHE_BYTES = 15 * 1024 * 1024;
const MAX_MEM_ITEMS = 24;

const mem = new Map();     // fileId -> { buf, type }
const pending = new Map(); // fileId -> Promise
const failAt = new Map();  // fileId -> timestamp

function fail(res, code, msg) {
  return res.status(code).json({ ok: false, error: msg });
}

function getFolderId() {
  const prop = store.state.props.get('S:PORTAL_HERO_FOLDER');
  if (prop && ID_RE.test(prop.trim())) return prop.trim();
  const envProp = String(process.env.GAS_PROP_PORTAL_HERO_FOLDER || process.env.PORTAL_HERO_FOLDER || '').trim();
  if (envProp && ID_RE.test(envProp)) return envProp;
  return DEFAULT_FOLDER_ID;
}

function extractFolderId(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (ID_RE.test(s)) return s;
  const m = s.match(/\/folders\/([A-Za-z0-9_-]{10,120})/) || s.match(/[?&]id=([A-Za-z0-9_-]{10,120})/);
  return m ? m[1] : '';
}

function getOrder() {
  try {
    const raw = store.state.props.get('S:PORTAL_HERO_ORDER');
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && ID_RE.test(x)) : [];
  } catch (e) {
    return [];
  }
}

async function saveProp(key, val) {
  const fullKey = 'S:' + key;
  await db.query(
    `insert into gas_props (key, value, updated_at) values ($1, $2, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [fullKey, String(val)]
  );
  store.state.props.set(fullKey, String(val));
}

async function deleteProp(key) {
  const fullKey = 'S:' + key;
  await db.query('delete from gas_props where key = $1', [fullKey]);
  store.state.props.delete(fullKey);
}

function sortPhotos(items, orderIds) {
  const rank = new Map();
  (orderIds || []).forEach((id, i) => { if (!rank.has(id)) rank.set(id, i); });
  return items.slice().sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id) : 1e9;
    const rb = rank.has(b.id) ? rank.get(b.id) : 1e9;
    if (ra !== rb) return ra - rb;
    return b.modifiedTs - a.modifiedTs;
  });
}

function clearPortalCaches(fileId) {
  clearCache();
  if (fileId) {
    mem.delete(fileId);
    failAt.delete(fileId);
    try { fs.unlinkSync(path.join(CACHE_DIR, fileId)); } catch (e) {}
    try { fs.unlinkSync(path.join(CACHE_DIR, fileId + '.type')); } catch (e) {}
  } else {
    mem.clear();
    failAt.clear();
    try {
      for (const f of fs.readdirSync(CACHE_DIR)) {
        try { fs.unlinkSync(path.join(CACHE_DIR, f)); } catch (e) {}
      }
    } catch (e) {}
  }
}

async function fetchTimed(url, opts, timeoutMs) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs || 25000);
  try {
    return await fetch(url, Object.assign({}, opts || {}, { signal: ctl.signal }));
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('Permintaan ke Google Drive melebihi batas waktu.');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

async function driveJson(url, opts) {
  const tok = await gauth.accessToken();
  const o = opts || {};
  const headers = Object.assign({ Authorization: 'Bearer ' + tok }, o.headers || {});
  let body = o.body;
  if (body !== undefined && !Buffer.isBuffer(body) && typeof body !== 'string') {
    body = JSON.stringify(body);
    headers['content-type'] = 'application/json';
  }
  const r = await fetchTimed(url, { method: o.method || 'GET', headers, body }, o.timeoutMs || 25000);
  if (r.status === 204) return null;
  const txt = await r.text();
  let j = null;
  try { j = txt ? JSON.parse(txt) : null; } catch (e) { j = null; }
  if (!r.ok) {
    const msg = (j && j.error && j.error.message) || txt.slice(0, 200) || ('HTTP ' + r.status);
    throw Object.assign(new Error('Google Drive: ' + msg), { status: r.status });
  }
  return j;
}

function setMemCache(id, entry) {
  if (mem.has(id)) mem.delete(id);
  mem.set(id, entry);
  while (mem.size > MAX_MEM_ITEMS) {
    const oldest = mem.keys().next().value;
    if (!oldest) break;
    mem.delete(oldest);
  }
}

async function loadHeroImage(id) {
  if (mem.has(id)) return mem.get(id);
  const diskFile = path.join(CACHE_DIR, id);
  try {
    const buf = fs.readFileSync(diskFile);
    const type = fs.readFileSync(diskFile + '.type', 'utf8').trim() || 'image/jpeg';
    if (buf.length > 200 && /^image\//i.test(type)) {
      const v = { buf, type };
      setMemCache(id, v);
      return v;
    }
  } catch (e) { /* belum tersimpan di disk */ }

  if (failAt.has(id) && Date.now() - failAt.get(id) < 3 * 60 * 1000) return null;
  if (pending.has(id)) return pending.get(id);

  const job = (async () => {
    try {
      if (!gauth.status().connected) return null;
      const tok = await gauth.accessToken();
      const r = await fetchTimed(
        `${DRIVE_API}/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`,
        { headers: { Authorization: 'Bearer ' + tok } },
        25000
      );
      const type = String(r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!r.ok || !/^image\//.test(type)) throw new Error('HTTP ' + r.status + ' ' + type);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 200 || buf.length > MAX_CACHE_BYTES) throw new Error('Ukuran gambar tidak valid');
      try {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        fs.writeFileSync(diskFile, buf);
        fs.writeFileSync(diskFile + '.type', type);
      } catch (e) { /* cukup simpan di memori */ }
      const v = { buf, type };
      setMemCache(id, v);
      failAt.delete(id);
      return v;
    } catch (e) {
      failAt.set(id, Date.now());
      return null;
    } finally {
      pending.delete(id);
    }
  })();

  pending.set(id, job);
  return job;
}

async function listDriveHeroPhotos(folderId) {
  const q = `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`;
  const fields = 'files(id,name,description,mimeType,size,modifiedTime,webViewLink)';
  const res = await driveJson(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=100&includeItemsFromAllDrives=true&supportsAllDrives=true`
  );
  const raw = (res && Array.isArray(res.files) ? res.files : []).map((f) => {
    const ts = Date.parse(f.modifiedTime || '') || 0;
    return {
      id: f.id,
      name: f.name || f.id,
      caption: String(f.description || '').trim(),
      mimeType: f.mimeType || 'image/jpeg',
      size: Number(f.size || 0),
      modifiedTime: f.modifiedTime || '',
      modifiedTs: ts,
      ver: Math.floor(ts / 1000),
      viewUrl: f.webViewLink || ('https://drive.google.com/file/d/' + f.id + '/view'),
      thumbUrl: '/media/hero/' + encodeURIComponent(f.id) + (ts ? '?v=' + Math.floor(ts / 1000) : ''),
    };
  });
  const sorted = sortPhotos(raw, getOrder());
  return sorted.map((item, idx) => Object.assign({}, item, { rank: idx + 1, active: idx < 12 }));
}

async function ensureFileInHeroFolder(fileId, folderId) {
  const f = await driveJson(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,name,parents,trashed&supportsAllDrives=true`
  );
  if (!f || f.trashed || !Array.isArray(f.parents) || !f.parents.includes(folderId)) {
    throw Object.assign(new Error('Foto tidak ditemukan di folder Hero Portal saat ini.'), { status: 404 });
  }
  return f;
}

// --- Endpoint publik terautentikasi: proxy cache gambar hero Portal --------
router.get('/media/hero/:id', requireUser, async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!ID_RE.test(id)) return res.status(400).type('text').send('ID gambar tidak valid.');
  const v = await loadHeroImage(id);
  if (!v) {
    res.set('Cache-Control', 'no-store');
    return res.redirect(302, 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w1600');
  }
  res.set('Cache-Control', req.query.v ? 'private, max-age=604800' : 'private, max-age=1800');
  res.type(v.type).send(v.buf);
});

// --- Halaman Admin Center: Hero Portal -------------------------------------
router.get('/admin/hero-portal', onlyAdmin, (req, res) => {
  renderPage(res, 'pages/admin-hero-portal', {
    title: 'Hero Portal',
    user: req.user,
    defaultFolderId: DEFAULT_FOLDER_ID,
  });
});

router.get('/api/admin/hero-portal', onlyAdmin, async (req, res) => {
  const st = gauth.status();
  const folderId = getFolderId();
  if (!st.connected) {
    return res.json({
      ok: true,
      data: { connected: false, email: null, folderId, defaultFolderId: DEFAULT_FOLDER_ID, photos: [] },
    });
  }
  try {
    const photos = await listDriveHeroPhotos(folderId);
    res.json({
      ok: true,
      data: {
        connected: true,
        email: st.email || '',
        folderId,
        defaultFolderId: DEFAULT_FOLDER_ID,
        photos,
      },
    });
  } catch (e) {
    res.json({ ok: false, error: String((e && e.message) || e) });
  }
});

router.post('/api/admin/hero-portal/upload', onlyAdmin, async (req, res) => {
  try {
    if (!gauth.status().connected) return fail(res, 400, 'Akun Google belum dihubungkan. Buka menu Koneksi Google terlebih dahulu.');
    const b = req.body || {};
    const rawName = String(b.name || 'hero-portal.jpg').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'hero-portal.jpg';
    const mimeRaw = String(b.mimeType || 'image/jpeg').toLowerCase().split(';')[0].trim();
    const mimeType = mimeRaw === 'image/jpg' ? 'image/jpeg' : mimeRaw;
    if (!ALLOWED_MIME.has(mimeType)) return fail(res, 400, 'Format file harus gambar JPG, PNG, WEBP, atau GIF.');
    const b64 = String(b.dataBase64 || '').replace(/^data:image\/[a-z0-9+.-]+;base64,/i, '').trim();
    if (!b64) return fail(res, 400, 'Isi file gambar kosong.');
    const buf = Buffer.from(b64, 'base64');
    if (buf.length < 200) return fail(res, 400, 'File gambar terlalu kecil atau rusak.');
    if (buf.length > MAX_UPLOAD_BYTES) return fail(res, 400, 'Ukuran gambar maksimal 12 MB.');

    const caption = String(b.caption || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    const folderId = getFolderId();
    const meta = { name: rawName, parents: [folderId], description: caption };
    const boundary = 'pmoHero' + Date.now().toString(36);
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
      buf,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const created = await driveJson(
      `${DRIVE_UPLOAD}/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,description,mimeType,size,modifiedTime,webViewLink`,
      {
        method: 'POST',
        body,
        headers: { 'content-type': 'multipart/related; boundary=' + boundary },
        timeoutMs: 60000,
      }
    );

    // Pastikan dapat dilihat oleh semua pengguna yang membuka Portal.
    await driveJson(
      `${DRIVE_API}/files/${encodeURIComponent(created.id)}/permissions?supportsAllDrives=true`,
      { method: 'POST', body: { type: 'anyone', role: 'reader' } }
    ).catch(() => {});

    // Letakkan foto baru paling atas di urutan Portal.
    const nextOrder = [created.id].concat(getOrder().filter((id) => id !== created.id));
    await saveProp('PORTAL_HERO_ORDER', JSON.stringify(nextOrder));

    // Pre-warm cache gambar agar langsung siap di Portal.
    setMemCache(created.id, { buf, type: mimeType });
    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(path.join(CACHE_DIR, created.id), buf);
      fs.writeFileSync(path.join(CACHE_DIR, created.id + '.type'), mimeType);
    } catch (e) {}
    clearCache();

    await audit(req.user, 'hero_upload', 'hero_portal', created.id, { name: created.name, size: buf.length, caption }).catch(() => {});
    res.json({ ok: true, data: created });
  } catch (e) {
    fail(res, e.status && e.status < 500 ? e.status : 500, String((e && e.message) || e));
  }
});

router.patch('/api/admin/hero-portal/:id', onlyAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!ID_RE.test(id)) return fail(res, 400, 'ID foto tidak valid.');
    if (!gauth.status().connected) return fail(res, 400, 'Akun Google belum dihubungkan.');
    const folderId = getFolderId();
    await ensureFileInHeroFolder(id, folderId);

    const b = req.body || {};
    const patch = {};
    if (b.caption !== undefined) patch.description = String(b.caption || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    if (b.name !== undefined) {
      const nm = String(b.name || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
      if (nm) patch.name = nm;
    }
    if (!Object.keys(patch).length) return fail(res, 400, 'Tidak ada perubahan yang dikirim.');

    const updated = await driveJson(
      `${DRIVE_API}/files/${encodeURIComponent(id)}?supportsAllDrives=true&fields=id,name,description,modifiedTime`,
      { method: 'PATCH', body: patch }
    );
    clearCache();
    await audit(req.user, 'hero_edit', 'hero_portal', id, patch).catch(() => {});
    res.json({ ok: true, data: updated });
  } catch (e) {
    fail(res, e.status && e.status < 500 ? e.status : 500, String((e && e.message) || e));
  }
});

router.post('/api/admin/hero-portal/order', onlyAdmin, async (req, res) => {
  try {
    const order = Array.isArray(req.body && req.body.order)
      ? req.body.order.map((x) => String(x || '').trim()).filter((x) => ID_RE.test(x))
      : null;
    if (!order) return fail(res, 400, 'Daftar urutan tidak valid.');
    const uniq = [];
    for (const id of order) if (!uniq.includes(id)) uniq.push(id);
    await saveProp('PORTAL_HERO_ORDER', JSON.stringify(uniq));
    clearCache();
    await audit(req.user, 'hero_order', 'hero_portal', 'order', { count: uniq.length }).catch(() => {});
    res.json({ ok: true, data: { order: uniq } });
  } catch (e) {
    fail(res, 500, String((e && e.message) || e));
  }
});

router.post('/api/admin/hero-portal/folder', onlyAdmin, async (req, res) => {
  try {
    if (!gauth.status().connected) return fail(res, 400, 'Akun Google belum dihubungkan.');
    const reset = !!(req.body && req.body.reset);
    const id = reset ? DEFAULT_FOLDER_ID : extractFolderId(req.body && req.body.folder);
    if (!id) return fail(res, 400, 'ID atau tautan folder Google Drive tidak valid.');
    const f = await driveJson(`${DRIVE_API}/files/${encodeURIComponent(id)}?fields=id,name,mimeType,trashed&supportsAllDrives=true`);
    if (!f || f.trashed || f.mimeType !== 'application/vnd.google-apps.folder') {
      return fail(res, 400, 'Target tersebut bukan folder Google Drive yang aktif.');
    }
    if (reset) await deleteProp('PORTAL_HERO_FOLDER');
    else await saveProp('PORTAL_HERO_FOLDER', id);
    await deleteProp('PORTAL_HERO_ORDER');
    clearPortalCaches();
    await audit(req.user, 'hero_folder', 'hero_portal', id, { name: f.name, reset }).catch(() => {});
    res.json({ ok: true, data: { folderId: id, folderName: f.name } });
  } catch (e) {
    fail(res, e.status && e.status < 500 ? e.status : 500, String((e && e.message) || e));
  }
});

router.post('/api/admin/hero-portal/refresh', onlyAdmin, async (req, res) => {
  clearPortalCaches();
  await audit(req.user, 'hero_refresh', 'hero_portal', 'cache', null).catch(() => {});
  res.json({ ok: true });
});

router.delete('/api/admin/hero-portal/:id', onlyAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!ID_RE.test(id)) return fail(res, 400, 'ID foto tidak valid.');
    if (!gauth.status().connected) return fail(res, 400, 'Akun Google belum dihubungkan.');
    const folderId = getFolderId();
    const f = await ensureFileInHeroFolder(id, folderId);

    await driveJson(
      `${DRIVE_API}/files/${encodeURIComponent(id)}?supportsAllDrives=true&fields=id,trashed`,
      { method: 'PATCH', body: { trashed: true } }
    );
    const nextOrder = getOrder().filter((x) => x !== id);
    await saveProp('PORTAL_HERO_ORDER', JSON.stringify(nextOrder));
    clearPortalCaches(id);
    await audit(req.user, 'hero_delete', 'hero_portal', id, { name: f.name }).catch(() => {});
    res.json({ ok: true });
  } catch (e) {
    fail(res, e.status && e.status < 500 ? e.status : 500, String((e && e.message) || e));
  }
});

module.exports = router;
module.exports.sortPhotos = sortPhotos;
module.exports.extractFolderId = extractFolderId;

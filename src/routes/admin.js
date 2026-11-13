'use strict';

const express = require('express');
const argon2 = require('@node-rs/argon2');
const db = require('../db');
const session = require('../session');
const access = require('../lib/access');
const { renderPage } = require('../render');
const { requireModule, audit } = require('../middleware/auth');
const { tempPassword, passwordProblem } = require('./auth');

const router = express.Router();
const onlyAdmin = requireModule('akun');

const USERNAME_RE = /^[a-z0-9._-]{3,50}$/;

function bad(res, msg) {
  return res.status(400).json({ ok: false, error: msg });
}

/** Validasi daftar proyek: hanya ID yang ada, atau '*' untuk semua. */
async function cleanProjectIds(input) {
  const list = Array.isArray(input) ? input.map((x) => String(x).trim()).filter(Boolean) : [];
  if (list.includes(access.ALL)) return { ids: [access.ALL] };
  if (!list.length) return { ids: [] };
  const rows = await db.query('select id from projects where id = any($1::text[])', [list]);
  const found = new Set(rows.rows.map((r) => r.id));
  const missing = list.filter((x) => !found.has(x));
  if (missing.length) return { error: 'Proyek tidak dikenal: ' + missing.join(', ') };
  return { ids: [...found].sort() };
}

async function activeAdminCount(excludeId) {
  const r = await db.query(
    "select count(*)::int as n from users where role = 'admin' and status = 'aktif' and id <> $1",
    [excludeId || '00000000-0000-0000-0000-000000000000']
  );
  return r.rows[0].n;
}

// --- Halaman ---------------------------------------------------------------
router.get('/admin/akun', onlyAdmin, async (req, res, next) => {
  try {
    const projects = await db.query('select id, name from projects order by name');
    renderPage(res, 'pages/admin-akun', {
      title: 'Kelola Akun',
      user: req.user,
      projects: projects.rows,
      roles: access.ROLES.map((r) => ({ id: r, label: access.ROLE_LABEL[r] })),
    });
  } catch (err) {
    next(err);
  }
});

// --- API -------------------------------------------------------------------
router.get('/api/admin/users', onlyAdmin, async (req, res, next) => {
  try {
    const rows = await db.query(
      `select id, username, full_name, role, legacy_role, project_ids, status,
              last_login_at, locked_until, must_change_password, created_at,
              (locked_until is not null and locked_until > now()) as locked
         from users order by role, username`
    );
    res.json({ ok: true, data: rows.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/api/admin/users', onlyAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const username = String(b.username || '').trim().toLowerCase();
    const fullName = String(b.full_name || '').trim().slice(0, 120);
    const role = String(b.role || '');
    if (!USERNAME_RE.test(username)) {
      return bad(res, 'Username 3–50 karakter: huruf kecil, angka, titik, garis bawah, atau strip.');
    }
    if (!access.ROLES.includes(role)) return bad(res, 'Peran tidak dikenal.');
    const scope = await cleanProjectIds(b.project_ids);
    if (scope.error) return bad(res, scope.error);
    if (role === 'kontraktor' && !scope.ids.length) return bad(res, 'Kontraktor wajib punya minimal satu proyek.');

    const exists = await db.query('select 1 from users where lower(username) = $1', [username]);
    if (exists.rows.length) return bad(res, 'Username sudah dipakai.');

    let password = String(b.password || '');
    let generated = false;
    if (!password) {
      password = tempPassword();
      generated = true;
    } else {
      const problem = passwordProblem(password, username);
      if (problem) return bad(res, problem);
    }
    const hash = await argon2.hash(password);
    const row = await db.query(
      `insert into users (username, full_name, role, project_ids, hash, algo, status,
                          must_change_password, access_migrated)
       values ($1, $2, $3, $4, $5, 'argon2id', 'aktif', true, true)
       returning id`,
      [username, fullName || username, role, scope.ids, hash]
    );
    await audit(req.user, 'user_create', 'user', username, { role, project_ids: scope.ids });
    res.json({ ok: true, data: { id: row.rows[0].id, tempPassword: generated ? password : null } });
  } catch (err) {
    next(err);
  }
});

router.patch('/api/admin/users/:id', onlyAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const cur = await db.query('select * from users where id = $1', [req.params.id]);
    const target = cur.rows[0];
    if (!target) return res.status(404).json({ ok: false, error: 'Akun tidak ditemukan.' });
    const isSelf = target.id === req.user.id;

    const role = b.role !== undefined ? String(b.role) : target.role;
    const status = b.status !== undefined ? String(b.status) : target.status;
    const fullName = b.full_name !== undefined ? String(b.full_name).trim().slice(0, 120) : target.full_name;
    if (!access.ROLES.includes(role) && role !== target.role) return bad(res, 'Peran tidak dikenal.');
    if (!['aktif', 'nonaktif'].includes(status)) return bad(res, 'Status tidak dikenal.');

    let projectIds = target.project_ids;
    if (b.project_ids !== undefined) {
      const scope = await cleanProjectIds(b.project_ids);
      if (scope.error) return bad(res, scope.error);
      projectIds = scope.ids;
    }
    if (role === 'kontraktor' && !projectIds.length) return bad(res, 'Kontraktor wajib punya minimal satu proyek.');

    if (isSelf && (role !== target.role || status !== target.status)) {
      return bad(res, 'Anda tidak bisa mengubah peran atau status akun sendiri.');
    }
    const losesAdmin = target.role === 'admin' && target.status === 'aktif' && (role !== 'admin' || status !== 'aktif');
    if (losesAdmin && (await activeAdminCount(target.id)) === 0) {
      return bad(res, 'Harus tetap ada minimal satu Admin aktif.');
    }

    await db.query(
      `update users set full_name = $2, role = $3, status = $4, project_ids = $5,
              locked_until = case when $6 then null else locked_until end,
              failed_count = case when $6 then 0 else failed_count end
        where id = $1`,
      [target.id, fullName || target.username, role, status, projectIds, b.unlock === true]
    );
    // Hak yang berubah langsung berlaku: sesi lama dikeluarkan.
    if (role !== target.role || status !== target.status ||
        JSON.stringify(projectIds) !== JSON.stringify(target.project_ids)) {
      await session.destroyAllFor(target.id);
    }
    await audit(req.user, 'user_update', 'user', target.username, {
      from: { role: target.role, status: target.status, project_ids: target.project_ids },
      to: { role, status, project_ids: projectIds },
      unlock: b.unlock === true,
    });
    res.json({ ok: true, data: null });
  } catch (err) {
    next(err);
  }
});

router.post('/api/admin/users/:id/reset-password', onlyAdmin, async (req, res, next) => {
  try {
    const cur = await db.query('select id, username from users where id = $1', [req.params.id]);
    const target = cur.rows[0];
    if (!target) return res.status(404).json({ ok: false, error: 'Akun tidak ditemukan.' });
    const password = tempPassword();
    const hash = await argon2.hash(password);
    await db.query(
      `update users set hash = $2, algo = 'argon2id', salt = null, must_change_password = true,
              failed_count = 0, locked_until = null
        where id = $1`,
      [target.id, hash]
    );
    await session.destroyAllFor(target.id);
    await audit(req.user, 'user_reset_password', 'user', target.username, null);
    res.json({ ok: true, data: { tempPassword: password } });
  } catch (err) {
    next(err);
  }
});

router.get('/api/admin/audit', onlyAdmin, async (req, res, next) => {
  try {
    const rows = await db.query(
      `select at, actor_name, action, entity_id, detail from audit_log
        where action like 'user_%' or action like 'login_%' or action like 'password_%'
        order by at desc limit 100`
    );
    res.json({ ok: true, data: rows.rows });
  } catch (err) {
    next(err);
  }
});

// --- Impor data spreadsheet (.xlsx) -------------------------------------------
const gasStore = require('../gas/store');
const { parseWorkbook } = require('../gas/xlsx-import');
const { clearCache } = require('../gas/services');
const gasSync = require('../gas/sync');
const gauth = require('../google/auth');

router.get('/admin/data', onlyAdmin, async (req, res, next) => {
  try {
    const book = gasStore.book();
    const sheets = book ? book.list().map((d) => ({ name: d.name, rows: d.lastRow(), cols: d.lastCol() })) : [];
    renderPage(res, 'pages/admin-data', {
      title: 'Impor Data', user: req.user, sheets, last: await gasStore.lastImport(),
      sync: gasSync.info(), google: gauth.status(),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/api/admin/import-xlsx',
  onlyAdmin,
  express.raw({ type: 'application/octet-stream', limit: '80mb' }),
  async (req, res, next) => {
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length < 100) return bad(res, 'Berkas kosong atau tidak terbaca.');
      if (req.body.slice(0, 2).toString() !== 'PK') return bad(res, 'Berkas harus berformat .xlsx (Microsoft Excel).');
      const fileName = String(req.get('x-file-name') || '').slice(0, 200);
      let sheets;
      try {
        sheets = parseWorkbook(req.body);
      } catch (e) {
        return bad(res, 'Berkas .xlsx tidak bisa dibaca: ' + e.message);
      }
      const names = sheets.map((d) => d.name);
      const required = ['DATA MINGGUAN PROYEK', 'DATA BULANAN'];
      const missing = required.filter((n) => !names.includes(n));
      if (missing.length) return bad(res, 'Sheet wajib tidak ditemukan: ' + missing.join(', ') + '. Pastikan yang diunggah adalah spreadsheet PMO DASHBOARD.');
      if (gasStore.mode() === 'produksi') return bad(res, 'Mode produksi: impor dimatikan supaya data server tidak tertimpa. Ubah mode dulu bila memang perlu.');
      await gasStore.replaceMain(sheets, req.user.username, fileName);
      clearCache();
      await audit(req.user, 'data_import', 'spreadsheet', fileName, { sheets: sheets.length });
      res.json({ ok: true, data: { sheets: sheets.length, names } });
    } catch (err) {
      next(err);
    }
  });

// --- Koneksi Google (Drive, Sheets) --------------------------------------------
const crypto = require('node:crypto');
const OAUTH_COOKIE = 'pmo_goauth';

function redirectUri(req) {
  const base = process.env.APP_BASE_URL || (req.protocol + '://' + req.get('host'));
  return base.replace(/\/$/, '') + '/admin/google/callback';
}

router.get('/admin/google', onlyAdmin, (req, res) => {
  renderPage(res, 'pages/admin-google', {
    title: 'Koneksi Google', user: req.user, st: gauth.status(), redirectUri: redirectUri(req),
    msg: String(req.query.ok || ''), err: String(req.query.err || ''),
  });
});

router.get('/admin/google/connect', onlyAdmin, (req, res) => {
  if (!gauth.configured()) return res.redirect('/admin/google?err=' + encodeURIComponent('GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum diisi di Coolify.'));
  const csrf = crypto.randomBytes(16).toString('hex');
  res.cookie(OAUTH_COOKIE, csrf, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 10 * 60 * 1000, path: '/admin/google' });
  res.redirect(gauth.authUrl(redirectUri(req), csrf));
});

router.get('/admin/google/callback', onlyAdmin, async (req, res) => {
  const back = (k, v) => res.redirect('/admin/google?' + k + '=' + encodeURIComponent(v));
  const csrf = req.cookies ? req.cookies[OAUTH_COOKIE] : null;
  res.clearCookie(OAUTH_COOKIE, { path: '/admin/google' });
  if (req.query.error) return back('err', 'Izin dibatalkan: ' + req.query.error);
  if (!csrf || csrf !== req.query.state) return back('err', 'Sesi penghubungan kedaluwarsa. Ulangi dari tombol Hubungkan.');
  try {
    const r = await gauth.exchangeCode(String(req.query.code || ''), redirectUri(req), req.user.username);
    await audit(req.user, 'google_connect', 'google', r.email || '', null);
    clearCache();
    return back('ok', 'Terhubung dengan ' + (r.email || 'akun Google') + '.');
  } catch (e) {
    return back('err', e.message);
  }
});

router.post('/api/admin/google/disconnect', onlyAdmin, async (req, res, next) => {
  try {
    await gauth.disconnect();
    await audit(req.user, 'google_disconnect', 'google', '', null);
    clearCache();
    res.json({ ok: true, data: null });
  } catch (err) { next(err); }
});

router.post('/api/admin/google/test', onlyAdmin, async (req, res) => {
  try {
    const token = gauth.accessTokenSync();
    const r = await fetch((process.env.GOOGLE_DRIVE_API || 'https://www.googleapis.com/drive/v3') + '/about?fields=user(emailAddress),storageQuota(limit,usage)', { headers: { Authorization: 'Bearer ' + token } });
    const j = await r.json();
    if (!r.ok) throw new Error((j.error && j.error.message) || 'HTTP ' + r.status);
    res.json({ ok: true, data: { email: j.user && j.user.emailAddress, usage: j.storageQuota } });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

router.post('/api/admin/mode', onlyAdmin, async (req, res) => {
  try {
    const target = String((req.body && req.body.mode) || '');
    const from = gasStore.mode();
    if (target === from) return res.json({ ok: true, data: { mode: from } });
    if (target === 'produksi' && String(req.body.confirm || '') !== 'PINDAH') {
      return bad(res, 'Ketik PINDAH untuk mengonfirmasi mode produksi.');
    }
    let restored = null;
    if (target === 'baca' && from === 'uji') {
      // Kembali ke baca: buang data uji coba, ambil ulang dari Google Sheets.
      await gasStore.setMode('baca', req.user.username);
      try { restored = await gasSync.syncNow({ force: true, actor: req.user.username }); } catch (e) { restored = { status: 'error', error: e.message }; }
    } else {
      await gasStore.setMode(target, req.user.username);
    }
    clearCache();
    await audit(req.user, 'data_mode', 'gas', target, { from, restored: restored && restored.status });
    res.json({ ok: true, data: { mode: target, restored } });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

router.post('/api/admin/sync', onlyAdmin, async (req, res) => {
  try {
    const r = await gasSync.syncNow({ force: true, actor: req.user.username });
    if (r.status === 'skipped') return res.json({ ok: false, error: r.reason });
    await audit(req.user, 'data_sync', 'spreadsheet', '', { sheets: r.sheets });
    res.json({ ok: true, data: r });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

module.exports = router;

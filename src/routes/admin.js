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

module.exports = router;

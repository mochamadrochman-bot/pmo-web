'use strict';

const crypto = require('node:crypto');
const argon2 = require('@node-rs/argon2');
const db = require('../db');
const session = require('../session');
const { audit } = require('../middleware/auth');

const MAX_FAILED = Number(process.env.LOGIN_MAX_FAILED || 5);
const LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES || 15);
const MIN_PASSWORD = 8;

/**
 * Verifikasi password lama (Apps Script) lalu migrasi ke argon2id saat login berhasil.
 *
 * Skema lama: PBKDF2-SHA256, 120.000 iterasi, keluaran 32 bita, disimpan sebagai hex 64 karakter.
 * Angka ini WAJIB sama dengan Auth.js. Kalau berbeda, semua login gagal.
 */
function verifyLegacy(password, salt, storedHex) {
  const iterations = Number(process.env.LEGACY_PBKDF2_ITERATIONS || 120000);
  const keylen = Number(process.env.LEGACY_PBKDF2_KEYLEN || 32);
  const salts = [Buffer.from(String(salt || ''), 'hex'), Buffer.from(String(salt || ''), 'utf8')];
  for (const s of salts) {
    if (!s.length) continue;
    const hex = crypto.pbkdf2Sync(password, s, iterations, keylen, 'sha256').toString('hex');
    const a = Buffer.from(hex, 'utf8');
    const b = Buffer.from(String(storedHex), 'utf8');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}

async function verifyPassword(user, password) {
  if (user.algo === 'argon2id') {
    try {
      return await argon2.verify(user.hash, password);
    } catch (e) {
      return false; // hash rusak atau placeholder
    }
  }
  return verifyLegacy(password, user.salt, user.hash);
}

/** Aturan password baru. Mengembalikan pesan galat, atau null kalau lolos. */
function passwordProblem(password, username) {
  const p = String(password || '');
  if (p.length < MIN_PASSWORD) return `Password minimal ${MIN_PASSWORD} karakter.`;
  if (p.length > 200) return 'Password terlalu panjang.';
  if (username && p.toLowerCase() === String(username).toLowerCase()) {
    return 'Password tidak boleh sama dengan username.';
  }
  return null;
}

function minutesLeft(until) {
  return Math.max(1, Math.ceil((new Date(until).getTime() - Date.now()) / 60000));
}

async function login(req, res, next) {
  const username = String((req.body && req.body.username) || '').trim().toLowerCase().slice(0, 100);
  const password = String((req.body && req.body.password) || '');
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Username dan password wajib diisi.' });
  }

  try {
    const rows = await db.query(
      `select id, username, hash, salt, algo, role, status, failed_count, locked_until
         from users where lower(username) = $1`,
      [username]
    );
    const user = rows.rows[0];

    // Pesan seragam: jangan membocorkan apakah username ada.
    const fail = () => res.status(401).json({ ok: false, error: 'Username atau password salah.' });
    if (!user || user.status !== 'aktif') {
      await audit(null, 'login_fail', 'user', username, { reason: 'unknown_or_inactive' });
      return fail();
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await audit(null, 'login_locked', 'user', user.username, null);
      return res.status(429).json({
        ok: false,
        error: `Akun dikunci sementara karena terlalu banyak percobaan. Coba lagi dalam ${minutesLeft(user.locked_until)} menit, atau minta Admin membukanya.`,
      });
    }

    const valid = await verifyPassword(user, password);

    if (!valid) {
      const count = (user.failed_count || 0) + 1;
      if (count >= MAX_FAILED) {
        await db.query(
          `update users set failed_count = 0, locked_until = now() + ($2 || ' minutes')::interval
            where id = $1`,
          [user.id, String(LOCK_MINUTES)]
        );
        await audit(null, 'login_lock', 'user', user.username, { minutes: LOCK_MINUTES });
        return res.status(429).json({
          ok: false,
          error: `Password salah ${MAX_FAILED} kali. Akun dikunci ${LOCK_MINUTES} menit.`,
        });
      }
      await db.query('update users set failed_count = $2 where id = $1', [user.id, count]);
      await audit(null, 'login_fail', 'user', user.username, { reason: 'bad_password', count });
      return fail();
    }

    if (user.algo !== 'argon2id') {
      const newHash = await argon2.hash(password);
      await db.query("update users set hash = $1, algo = 'argon2id', salt = null where id = $2",
        [newHash, user.id]);
    }

    const { token, expires } = await session.create(user.id, req.headers['user-agent']);
    await db.query(
      'update users set last_login_at = now(), failed_count = 0, locked_until = null where id = $1',
      [user.id]
    );
    session.setCookie(res, token, expires);
    await audit(user, 'login_ok', 'user', user.username, null);

    const fresh = await db.query('select must_change_password from users where id = $1', [user.id]);
    return res.json({
      ok: true,
      data: {
        username: user.username,
        role: user.role,
        mustChangePassword: fresh.rows[0].must_change_password,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.cookies ? req.cookies[session.COOKIE] : null;
    await session.destroy(token);
    session.clearCookie(res);
    const wantsHtml = String(req.headers.accept || '').includes('text/html');
    if (wantsHtml) return res.redirect('/login');
    return res.json({ ok: true, data: null });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res) {
  if (!req.user) return res.status(401).json({ ok: false, error: 'Belum login.' });
  return res.json({
    ok: true,
    data: {
      username: req.user.username,
      role: req.user.role,
      name: req.user.full_name,
      projectIds: req.user.project_ids,
      mustChangePassword: req.user.must_change_password,
    },
  });
}

/** POST /api/auth/password { current, next } */
async function changePassword(req, res, next) {
  const current = String((req.body && req.body.current) || '');
  const nextPw = String((req.body && req.body.next) || '');
  try {
    const rows = await db.query(
      'select id, username, hash, salt, algo from users where id = $1',
      [req.user.id]
    );
    const user = rows.rows[0];
    if (!user || !(await verifyPassword(user, current))) {
      await audit(req.user, 'password_change_fail', 'user', req.user.username, null);
      return res.status(400).json({ ok: false, error: 'Password lama salah.' });
    }
    const problem = passwordProblem(nextPw, user.username);
    if (problem) return res.status(400).json({ ok: false, error: problem });
    if (nextPw === current) {
      return res.status(400).json({ ok: false, error: 'Password baru harus berbeda dari yang lama.' });
    }

    const hash = await argon2.hash(nextPw);
    await db.query(
      `update users set hash = $2, algo = 'argon2id', salt = null,
              must_change_password = false, password_changed_at = now()
        where id = $1`,
      [user.id, hash]
    );
    // Perangkat lain yang masih login dengan password lama dikeluarkan.
    await session.destroyOthers(user.id, req.user.token);
    await audit(req.user, 'password_change', 'user', user.username, null);
    return res.json({ ok: true, data: null });
  } catch (err) {
    return next(err);
  }
}

/** Password sementara yang mudah dibaca dan diketik: tanpa 0/O/1/l/I. */
function tempPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[bytes[i] % chars.length];
  return out;
}

module.exports = {
  login, logout, me, changePassword,
  verifyLegacy, verifyPassword, passwordProblem, tempPassword, MIN_PASSWORD,
};

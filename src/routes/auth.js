'use strict';

const crypto = require('node:crypto');
const argon2 = require('@node-rs/argon2');
const db = require('../db');
const session = require('../session');
const { audit } = require('../middleware/auth');

/**
 * Verifikasi password lama (Apps Script) lalu migrasi ke argon2id saat login berhasil.
 *
 * Skema lama: PBKDF2-SHA256, 120.000 iterasi, keluaran 32 bita, disimpan sebagai hex 64 karakter.
 * Angka ini WAJIB sama dengan Auth.js. Kalau berbeda, semua login gagal.
 * Konfirmasi juga cara salt disimpan (hex atau teks biasa) sebelum dipakai.
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

async function login(req, res, next) {
  const username = String((req.body && req.body.username) || '').trim().toLowerCase().slice(0, 100);
  const password = String((req.body && req.body.password) || '');
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Username dan password wajib diisi.' });
  }

  try {
    const rows = await db.query(
      'select id, username, hash, salt, algo, role, status from users where lower(username) = $1',
      [username]
    );
    const user = rows.rows[0];

    // Pesan seragam: jangan membocorkan apakah username ada.
    const fail = () => res.status(401).json({ ok: false, error: 'Username atau password salah.' });
    if (!user || user.status !== 'aktif') {
      await audit(null, 'login_fail', 'user', username, { reason: 'unknown' });
      return fail();
    }

    let valid = false;
    if (user.algo === 'argon2id') {
      valid = await argon2.verify(user.hash, password);
    } else {
      valid = verifyLegacy(password, user.salt, user.hash);
      if (valid) {
        const newHash = await argon2.hash(password);
        await db.query("update users set hash = $1, algo = 'argon2id', salt = null where id = $2",
          [newHash, user.id]);
      }
    }

    if (!valid) {
      await audit(null, 'login_fail', 'user', username, { reason: 'bad_password' });
      return fail();
    }

    const { token, expires } = await session.create(user.id, req.headers['user-agent']);
    await db.query('update users set last_login_at = now() where id = $1', [user.id]);
    session.setCookie(res, token, expires);
    await audit(user, 'login_ok', 'user', user.username, null);

    return res.json({
      ok: true,
      data: { username: user.username, role: user.role },
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
    // Form logout mengirim Accept text/html; API meminta JSON.
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
    data: { username: req.user.username, role: req.user.role, name: req.user.full_name },
  });
}

module.exports = { login, logout, me, verifyLegacy };

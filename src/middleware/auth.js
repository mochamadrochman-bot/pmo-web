'use strict';

const db = require('../db');

/**
 * Middleware: menempelkan req.user bila cookie sesi valid.
 * Prefix rute publik ditulis eksplisit di PUBLIC_PATHS, bukan disimpulkan.
 */
const PUBLIC_PATHS = [
  { method: 'GET', path: '/health' },
  { method: 'GET', path: '/login' },
  { method: 'POST', path: '/api/auth/login' },
];

const session = require('../session');

/** Router yang dipasang di '/api' melihat req.path tanpa awalan, jadi pakai originalUrl. */
function isApi(req) {
  return String(req.originalUrl || req.path).startsWith('/api/');
}

function isPublic(req) {
  return PUBLIC_PATHS.some((p) => p.method === req.method && p.path === req.path);
}

async function attachUser(req, res, next) {
  try {
    const token = req.cookies ? req.cookies[session.COOKIE] : null;
    req.user = await session.read(token);
    next();
  } catch (err) {
    next(err);
  }
}

function requireUser(req, res, next) {
  if (!req.user) {
    if (isApi(req)) {
      return res.status(401).json({ ok: false, error: 'Sesi tidak valid. Silakan login.' });
    }
    return res.redirect('/login');
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Sesi tidak valid. Silakan login.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: 'Peran Anda tidak berhak untuk aksi ini.' });
    }
    next();
  };
}

/** Hanya untuk modul tertentu (lihat src/lib/access.js). */
function requireModule(module) {
  const access = require('../lib/access');
  return (req, res, next) => {
    if (!req.user) return requireUser(req, res, next);
    if (!access.canUseModule(req.user, module)) return forbidden(req, res);
    next();
  };
}

function forbidden(req, res, message) {
  const msg = message || 'Akun Anda tidak berhak membuka halaman ini.';
  if (isApi(req)) return res.status(403).json({ ok: false, error: msg });
  res.status(403);
  const { renderPage } = require('../render');
  return renderPage(res, 'pages/error', { code: 403, message: msg, user: req.user });
}

/**
 * Akun dengan password sementara (dibuat atau direset Admin) wajib menggantinya dulu.
 * Selain halaman ganti password dan logout, semua rute ditolak.
 */
const ALLOWED_WHILE_CHANGING = ['/akun/password', '/api/auth/password', '/api/auth/logout', '/api/auth/me', '/health'];
function mustChangePasswordGate(req, res, next) {
  if (!req.user || !req.user.must_change_password) return next();
  if (ALLOWED_WHILE_CHANGING.includes(req.path)) return next();
  if (isApi(req)) {
    return res.status(403).json({ ok: false, error: 'Ganti password sementara Anda dulu.' });
  }
  return res.redirect('/akun/password');
}

/**
 * Tolak permintaan yang mengubah data bila datang dari situs lain (lapisan tambahan
 * di samping cookie SameSite=Lax).
 */
function sameOrigin(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  let host = null;
  try { host = new URL(origin).host; } catch (e) { host = null; }
  if (host && host === req.headers.host) return next();
  return res.status(403).json({ ok: false, error: 'Permintaan ditolak.' });
}

/** Batas percobaan login per alamat IP, di memori (cukup untuk satu container). */
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_PER_IP = Number(process.env.LOGIN_MAX_PER_IP || 30);
const loginHits = new Map();
function loginRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || 'unknown';
  let hit = loginHits.get(key);
  if (!hit || hit.reset < now) {
    hit = { count: 0, reset: now + LOGIN_WINDOW_MS };
    loginHits.set(key, hit);
  }
  hit.count += 1;
  if (loginHits.size > 5000) {
    for (const [k, v] of loginHits) if (v.reset < now) loginHits.delete(k);
  }
  if (hit.count > LOGIN_MAX_PER_IP) {
    return res.status(429).json({ ok: false, error: 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.' });
  }
  next();
}

/**
 * Router tunggal: satu tempat memutuskan siapa boleh apa.
 * Setiap rute wajib terdaftar; rute yang tidak terdaftar tidak pernah dieksekusi.
 */
const ROUTES = new Map();
function route(method, path, handler, opts) {
  ROUTES.set(`${method} ${path}`, { handler, opts: opts || {} });
}

async function audit(actor, action, entity, entityId, detail) {
  try {
    await db.query(
      'insert into audit_log (actor_id, actor_name, action, entity, entity_id, detail) values ($1,$2,$3,$4,$5,$6)',
      [actor ? actor.id : null, actor ? actor.username : 'anonim', action, entity || null,
        entityId ? String(entityId) : null, detail ? JSON.stringify(detail) : null]
    );
  } catch (err) {
    console.error(JSON.stringify({ ev: 'audit_fail', message: String(err.message || err) }));
  }
}

module.exports = {
  attachUser, requireUser, requireRole, requireModule, forbidden, isPublic, PUBLIC_PATHS, route, ROUTES, audit,
  mustChangePasswordGate, sameOrigin, loginRateLimit,
};

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
    if (req.path.startsWith('/api/')) {
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

module.exports = { attachUser, requireUser, requireRole, isPublic, PUBLIC_PATHS, route, ROUTES, audit };

'use strict';

const crypto = require('node:crypto');
const db = require('./db');

const COOKIE = 'pmo_sid';
const TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 6);

function newToken() {
  return crypto.randomBytes(32).toString('base64url');
}

async function create(userId, userAgent) {
  const token = newToken();
  const expires = new Date(Date.now() + TTL_HOURS * 3600 * 1000);
  await db.query(
    'insert into sessions (token, user_id, expires_at, user_agent) values ($1, $2, $3, $4)',
    [token, userId, expires, String(userAgent || '').slice(0, 200)]
  );
  return { token, expires };
}

async function read(token) {
  if (!token) return null;
  const res = await db.query(
    `select s.token, s.expires_at, u.id, u.username, u.full_name, u.role
       from sessions s
       join users u on u.id = s.user_id
      where s.token = $1 and s.expires_at > now() and u.status = 'aktif'`,
    [token]
  );
  return res.rows[0] || null;
}

async function destroy(token) {
  if (!token) return;
  await db.query('delete from sessions where token = $1', [token]);
}

async function destroyAllFor(userId) {
  await db.query('delete from sessions where user_id = $1', [userId]);
}

async function purgeExpired() {
  await db.query('delete from sessions where expires_at < now()');
}

function setCookie(res, token, expires) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires,
    path: '/',
  });
}

function clearCookie(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

module.exports = {
  COOKIE, TTL_HOURS, create, read, destroy, destroyAllFor, purgeExpired, setCookie, clearCookie,
};

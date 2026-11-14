'use strict';

/**
 * Koneksi ke akun Google pemilik folder Drive dan spreadsheet (OAuth 2.0).
 *
 * Admin menekan "Hubungkan akun Google" sekali; refresh token disimpan di tabel google_auth.
 * Access token (berlaku ±1 jam) diperbarui otomatis, termasuk secara sinkron untuk kode lama.
 *
 * Variabel lingkungan: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
 */

const db = require('../db');
const { requestSync } = require('./sync-http');

const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
];
const TOKEN_URL = process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token';

const state = {
  refreshToken: null,
  email: null,
  connectedAt: null,
  access: null,     // { token, exp }
  lastError: null,
};

function configured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

async function ensureTable() {
  await db.query(`
    create table if not exists google_auth (
      id            integer primary key default 1 check (id = 1),
      email         text,
      refresh_token text not null,
      scope         text,
      connected_at  timestamptz not null default now(),
      connected_by  text
    )`);
}

async function load() {
  await ensureTable();
  const r = await db.query('select email, refresh_token, connected_at from google_auth where id = 1');
  const row = r.rows[0];
  state.refreshToken = row ? row.refresh_token : null;
  state.email = row ? row.email : null;
  state.connectedAt = row ? row.connected_at : null;
  state.access = null;
  return status();
}

function status() {
  return {
    configured: configured(),
    connected: !!state.refreshToken,
    email: state.email,
    connectedAt: state.connectedAt,
    lastError: state.lastError,
  };
}

function authUrl(redirectUri, csrf) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: csrf,
  });
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + q.toString();
}

async function exchangeCode(code, redirectUri, actor) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, redirect_uri: redirectUri, grant_type: 'authorization_code',
      client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) throw new Error('Google menolak: ' + (j.error_description || j.error || res.status));
  if (!j.refresh_token) throw new Error('Google tidak memberi refresh token. Cabut akses aplikasi di myaccount.google.com/permissions lalu hubungkan ulang.');
  const scope = String(j.scope || '');
  if (!scope.includes('/auth/drive')) throw new Error('Izin Google Drive tidak diberikan. Ulangi dan centang semua izin.');

  let email = null;
  try {
    const u = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + j.access_token } });
    email = (await u.json()).email || null;
  } catch (e) { email = null; }

  await ensureTable();
  await db.query(
    `insert into google_auth (id, email, refresh_token, scope, connected_at, connected_by)
     values (1, $1, $2, $3, now(), $4)
     on conflict (id) do update set email = excluded.email, refresh_token = excluded.refresh_token,
       scope = excluded.scope, connected_at = now(), connected_by = excluded.connected_by`,
    [email, j.refresh_token, scope, actor || null]
  );
  state.refreshToken = j.refresh_token;
  state.email = email;
  state.connectedAt = new Date();
  state.access = { token: j.access_token, exp: Date.now() + (Number(j.expires_in || 3600) - 120) * 1000 };
  state.lastError = null;
  return { email };
}

async function disconnect() {
  const token = state.refreshToken;
  await db.query('delete from google_auth where id = 1');
  state.refreshToken = null; state.email = null; state.connectedAt = null; state.access = null;
  if (token) {
    try { await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(token), { method: 'POST' }); } catch (e) { /* abaikan */ }
  }
}

/** Access token untuk kode lama (sinkron). Melempar galat yang bisa dibaca pengguna. */
function accessTokenSync() {
  if (state.access && state.access.exp > Date.now()) return state.access.token;
  if (!configured()) throw new Error('Koneksi Google belum disetel di server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).');
  if (!state.refreshToken) throw new Error('Akun Google belum dihubungkan. Admin: buka menu Koneksi Google.');
  const body = new URLSearchParams({
    grant_type: 'refresh_token', refresh_token: state.refreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
  }).toString();
  const r = requestSync({ url: TOKEN_URL, method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body, timeoutMs: 15000 });
  let j = {};
  try { j = JSON.parse(r.body.toString('utf8')); } catch (e) { j = {}; }
  if (r.status !== 200 || !j.access_token) {
    state.lastError = (j.error || 'HTTP ' + r.status) + (j.error_description ? ': ' + j.error_description : '');
    if (j.error === 'invalid_grant') throw new Error('Izin Google sudah dicabut atau kedaluwarsa. Admin perlu menghubungkan ulang di menu Koneksi Google.');
    throw new Error('Gagal mendapatkan akses Google (' + state.lastError + ').');
  }
  state.access = { token: j.access_token, exp: Date.now() + (Number(j.expires_in || 3600) - 120) * 1000 };
  state.lastError = null;
  return state.access.token;
}

/** Access token asinkron (tidak memblokir event loop). */
async function accessToken() {
  if (state.access && state.access.exp > Date.now()) return state.access.token;
  if (!configured()) throw new Error('Koneksi Google belum disetel di server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).');
  if (!state.refreshToken) throw new Error('Akun Google belum dihubungkan. Admin: buka menu Koneksi Google.');
  const body = new URLSearchParams({
    grant_type: 'refresh_token', refresh_token: state.refreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
  });
  const r = await fetch(TOKEN_URL, { method: 'POST', body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    state.lastError = (j.error || 'HTTP ' + r.status) + (j.error_description ? ': ' + j.error_description : '');
    if (j.error === 'invalid_grant') throw new Error('Izin Google sudah dicabut atau kedaluwarsa. Admin perlu menghubungkan ulang di menu Koneksi Google.');
    throw new Error('Gagal mendapatkan akses Google (' + state.lastError + ').');
  }
  state.access = { token: j.access_token, exp: Date.now() + (Number(j.expires_in || 3600) - 120) * 1000 };
  state.lastError = null;
  return state.access.token;
}

module.exports = { load, status, authUrl, exchangeCode, disconnect, accessToken, accessTokenSync, configured, SCOPES };

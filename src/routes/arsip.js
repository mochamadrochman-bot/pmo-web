'use strict';

/** Arsip Materi Weekly: halaman, koneksi akun Google tim per proyek, dan API proses arsip. */

const express = require('express');
const crypto = require('node:crypto');
const access = require('../lib/access');
const groups = require('../lib/groups');
const gauth = require('../google/auth');
const arsip = require('../arsip/service');
const { renderPage } = require('../render');
const { requireUser, audit } = require('../middleware/auth');

const router = express.Router();
const COOKIE = 'pmo_arsip_oauth';

function isPic(u) { return u && u.role === 'input' && String(u.legacy_role || '').toUpperCase() === 'PIC'; }
function canArsip(u, pid) {
  if (!u) return false;
  if (u.role === 'admin') return true;
  if (!isPic(u)) return false;
  if (access.inScope(u, pid)) return true;
  const g = groups.get(pid);
  return !!(g && g.parent && access.inScope(u, g.parent));
}
function allowedProjects(u) { return arsip.projects().filter((p) => canArsip(u, p.id)); }

function redirectUri(req) {
  const base = process.env.APP_BASE_URL || (req.protocol + '://' + req.get('host'));
  return base.replace(/\/$/, '') + '/arsip/google/callback';
}
function origin(req) {
  const base = process.env.APP_BASE_URL || (req.protocol + '://' + req.get('host'));
  return new URL(base).origin;
}

function guard(req, res, next) {
  const pid = String(req.params.pid || req.query.pid || '');
  if (!canArsip(req.user, pid)) return res.status(403).json({ ok: false, error: 'Hanya Admin atau PIC proyek ini yang boleh mengarsipkan.' });
  req.pid = pid;
  next();
}
const wrap = (fn) => async (req, res) => {
  try { res.json({ ok: true, data: await fn(req) }); } catch (e) { res.json({ ok: false, error: e.message }); }
};

router.get('/arsip', requireUser, (req, res) => {
  const list = allowedProjects(req.user);
  if (!list.length) return res.status(403).send('Hanya Admin atau PIC proyek yang bisa membuka Arsip Materi Weekly.');
  renderPage(res, 'pages/arsip', {
    title: 'Arsip Materi Weekly', user: req.user, projects: list,
    sel: String(req.query.pid || list[0].id), configured: gauth.configured(),
    msg: String(req.query.ok || ''), err: String(req.query.err || ''), redirectUri: redirectUri(req),
  });
});

router.get('/arsip/google/connect', requireUser, guard, (req, res) => {
  if (!gauth.configured()) return res.redirect('/arsip?pid=' + encodeURIComponent(req.pid) + '&err=' + encodeURIComponent('GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum diisi di Coolify.'));
  const csrf = crypto.randomBytes(16).toString('hex');
  res.cookie(COOKIE, csrf + '|' + req.pid, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 10 * 60 * 1000, path: '/arsip' });
  res.redirect(arsip.authUrl(redirectUri(req), csrf));
});

router.get('/arsip/google/callback', requireUser, async (req, res) => {
  const raw = req.cookies ? String(req.cookies[COOKIE] || '') : '';
  res.clearCookie(COOKIE, { path: '/arsip' });
  const [csrf, pid] = raw.split('|');
  const back = (k, v) => res.redirect('/arsip?pid=' + encodeURIComponent(pid || '') + '&' + k + '=' + encodeURIComponent(v));
  if (req.query.error) return back('err', 'Izin dibatalkan: ' + req.query.error);
  if (!csrf || csrf !== req.query.state || !canArsip(req.user, pid)) return back('err', 'Sesi penghubungan kedaluwarsa. Ulangi dari tombol Hubungkan.');
  try {
    const r = await arsip.exchangeCode(pid, String(req.query.code || ''), redirectUri(req), req.user.username);
    await audit(req.user, 'arsip_google_connect', 'project', pid, { email: r.email });
    return back('ok', 'Akun tim terhubung: ' + (r.email || 'akun Google') + '.');
  } catch (e) { return back('err', e.message); }
});

router.get('/api/arsip/:pid', requireUser, guard, wrap((req) => arsip.inventory(req.pid)));
router.get('/api/arsip/:pid/job', requireUser, guard, wrap((req) => arsip.publicJob(req.pid)));

router.post('/api/arsip/:pid/folder', requireUser, guard, wrap(async (req) => {
  const f = await arsip.setFolder(req.pid, String((req.body && req.body.url) || ''));
  await audit(req.user, 'arsip_folder', 'project', req.pid, f);
  return f;
}));

router.post('/api/arsip/:pid/disconnect', requireUser, guard, wrap(async (req) => {
  await arsip.disconnect(req.pid);
  await audit(req.user, 'arsip_google_disconnect', 'project', req.pid, null);
  return null;
}));

router.post('/api/arsip/:pid/start', requireUser, guard, wrap(async (req) => {
  if (String((req.body && req.body.confirm) || '') !== 'ARSIP') throw new Error('Konfirmasi belum diberikan.');
  const j = await arsip.start(req.pid, req.user.username);
  await audit(req.user, 'arsip_start', 'project', req.pid, { total: j.total });
  return j;
}));

router.post('/api/arsip/:pid/restore', requireUser, guard, wrap(async (req) => {
  if (String((req.body && req.body.confirm) || '') !== 'PULIHKAN') throw new Error('Konfirmasi belum diberikan.');
  const r = await arsip.restore(req.pid, req.user.username);
  await audit(req.user, 'arsip_restore', 'project', req.pid, r);
  return r;
}));

router.post('/api/arsip/:pid/upload-session', requireUser, guard, wrap((req) => {
  const b = req.body || {};
  return arsip.uploadSession(req.pid, { row: Number(b.row), col: Number(b.col) }, { name: String(b.name || ''), size: Number(b.size || 0), type: String(b.type || '') }, origin(req));
}));

router.post('/api/arsip/:pid/upload-done', requireUser, guard, wrap(async (req) => {
  const b = req.body || {};
  const r = await arsip.uploadDone(req.pid, { row: Number(b.row), col: Number(b.col) }, String(b.fileId || ''), req.user.username);
  await audit(req.user, 'arsip_upload', 'project', req.pid, { row: b.row, col: b.col });
  return r;
}));

module.exports = router;
module.exports.canArsip = canArsip;

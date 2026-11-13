'use strict';

/**
 * Halaman dan fungsi aplikasi lama (Apps Script) yang dijalankan di server baru.
 *   GET  /app?page=...      : sama seperti doGet di Apps Script
 *   POST /app/rpc/:fungsi   : pengganti google.script.run
 * Login memakai sesi baru (cookie). Akun diterjemahkan ke bentuk yang dikenal kode lama.
 */

const express = require('express');
const runtime = require('../gas/runtime');
const store = require('../gas/store');
const { clearCache } = require('../gas/services');
const session = require('../session');
const access = require('../lib/access');
const { requireUser, forbidden, audit } = require('../middleware/auth');

const router = express.Router();

// Halaman yang boleh dibuka akun kontraktor (selain itu ditolak sebelum kode lama berjalan).
const KONTRAKTOR_PAGES = ['', 'portal', 'engineering', 'epcc', 'procurement', 'construction', 'commissioning'];

function appUrl(req) {
  const base = process.env.APP_BASE_URL || (req.protocol + '://' + req.get('host'));
  return base.replace(/\/$/, '') + '/app';
}

/** Akun baru -> bentuk akun kode lama (role huruf besar, projectId tunggal). */
function legacyUser(u) {
  if (!u) return null;
  const ids = Array.isArray(u.project_ids) ? u.project_ids : [];
  let role;
  if (u.role === 'admin') role = 'ADMIN';
  else if (u.role === 'input') role = ['INPUT', 'PIC'].includes(String(u.legacy_role || '').toUpperCase()) ? String(u.legacy_role).toUpperCase() : 'INPUT';
  else if (u.role === 'kontraktor') role = 'KONTRAKTOR';
  else role = String(u.legacy_role || 'VIEWER').toUpperCase() === 'ADMIN' ? 'VIEWER' : String(u.legacy_role || 'VIEWER').toUpperCase();
  let projectId;
  if (u.role === 'admin' || ids.includes(access.ALL)) projectId = 'ALL';
  else projectId = ids[0] || '';
  return {
    username: u.username,
    name: u.full_name || u.username,
    nama: u.full_name || u.username,
    role,
    project: u.team || projectId,
    projectId,
    mustChangePassword: false,
  };
}

/** Skrip yang disisipkan ke setiap halaman lama: pengganti google.script.run. */
function clientShim() {
  return `<script>
(function () {
  try { sessionStorage.setItem('pmoSessionToken', 'server-session'); } catch (e) {}
  function call(name, args, ok, fail, userObj) {
    fetch('/app/rpc/' + encodeURIComponent(name), {
      method: 'POST', credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ args: args })
    }).then(function (r) {
      if (r.status === 401) { location.href = '/login'; throw new Error('Sesi berakhir.'); }
      return r.json();
    }).then(function (j) {
      if (j && j.ok) { if (ok) ok(j.data, userObj); return; }
      var err = new Error((j && j.error) || 'Terjadi kesalahan di server.'); err.name = 'ScriptError';
      if (fail) fail(err, userObj); else console.error(err.message);
    }).catch(function (e) { if (fail) fail(e, userObj); else console.error(e); });
  }
  function runner(ok, fail, userObj) {
    return new Proxy({}, {
      get: function (t, name) {
        if (name === 'withSuccessHandler') return function (h) { return runner(h, fail, userObj); };
        if (name === 'withFailureHandler') return function (h) { return runner(ok, h, userObj); };
        if (name === 'withUserObject') return function (o) { return runner(ok, fail, o); };
        if (typeof name !== 'string') return undefined;
        return function () { call(name, Array.prototype.slice.call(arguments), ok, fail, userObj); };
      }
    });
  }
  window.google = window.google || {};
  window.google.script = {
    run: runner(null, null, undefined),
    host: { close: function () {}, setHeight: function () {}, setWidth: function () {}, editor: { focus: function () {} }, origin: location.origin },
    url: { getLocation: function (cb) {
      var q = new URLSearchParams(location.search), p = {}, ps = {};
      q.forEach(function (v, k) { if (!(k in p)) p[k] = v; (ps[k] = ps[k] || []).push(v); });
      cb({ parameter: p, parameters: ps, hash: location.hash.replace(/^#/, '') });
    } },
    history: { push: function (s, p, h) { var q = new URLSearchParams(p || {}).toString(); history.pushState(s, '', '?' + q + (h ? '#' + h : '')); },
               replace: function (s, p, h) { var q = new URLSearchParams(p || {}).toString(); history.replaceState(s, '', '?' + q + (h ? '#' + h : '')); },
               setChangeHandler: function (fn) { window.addEventListener('popstate', function (e) { fn({ state: e.state, location: {} }); }); } }
  };
})();
</script>`;
}

function wrapPage(out) {
  let html = out.getContent();
  const head = [
    '<meta charset="utf-8">',
    out.getTitle() && !/<title[\s>]/i.test(html) ? '<title>' + out.getTitle().replace(/</g, '&lt;') + '</title>' : '',
    ...out._meta.filter(([n]) => !new RegExp('name=["\\\']' + n + '["\\\']', 'i').test(html))
      .map(([n, c]) => '<meta name="' + n + '" content="' + String(c).replace(/"/g, '&quot;') + '">'),
    out._favicon ? '<link rel="icon" href="' + out._favicon + '">' : '',
    clientShim(),
  ].filter(Boolean).join('\n');
  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (m) => m + '\n' + head);
  else if (/<html[^>]*>/i.test(html)) html = html.replace(/<html[^>]*>/i, (m) => m + '\n<head>' + head + '</head>');
  else html = '<!doctype html>\n<html><head>' + head + '</head><body>\n' + html + '\n</body></html>';
  if (!/^\s*<!doctype/i.test(html)) html = '<!doctype html>\n' + html;
  return html;
}

function makeScope(req, res) {
  let loggedOut = false;
  const scope = runtime.createScope({
    user: legacyUser(req.user),
    appUrl: appUrl(req),
    onLogout: () => { loggedOut = true; },
  });
  return { scope, wasLoggedOut: () => loggedOut };
}

function hasSheetChanges() {
  for (const b of store.state.books.values()) {
    if (b.deleted.size || b.dirtySheets().some((d) => !store.writableInReadOnly(d.name))) return true;
  }
  return false;
}

// --- Halaman ---------------------------------------------------------------
router.get('/app', requireUser, async (req, res, next) => {
  try {
    const page = String(req.query.page || '').toLowerCase();
    if (!page) return res.redirect('/app?page=portal');
    if (req.user.role === 'kontraktor' && !KONTRAKTOR_PAGES.includes(page)) return forbidden(req, res);
    const book = store.book();
    if (!book || !book.sheets.has('DATA MINGGUAN PROYEK')) {
      if (req.user.role === 'admin') return res.redirect('/admin/data');
      return forbidden(req, res, 'Data dashboard belum diimpor. Hubungi Admin PMO.');
    }

    const parameter = {};
    const parameters = {};
    Object.keys(req.query).forEach((k) => {
      const v = req.query[k];
      parameters[k] = Array.isArray(v) ? v.map(String) : [String(v)];
      parameter[k] = parameters[k][0];
    });
    const { scope } = makeScope(req, res);
    const out = scope.exported.doGet({ parameter, parameters, queryString: new URLSearchParams(parameter).toString() });
    if (store.readOnly() && hasSheetChanges()) { await store.revertDirty(); clearCache(); }
    await store.flush();
    res.set('Cache-Control', 'no-store');
    res.type('html').send(wrapPage(out));
  } catch (err) {
    next(err);
  }
});

// --- Pengganti google.script.run --------------------------------------------
router.post('/app/rpc/:fn', requireUser, async (req, res) => {
  const name = String(req.params.fn || '');
  const args = Array.isArray(req.body && req.body.args) ? req.body.args : [];
  if (!runtime.isPublic(name)) {
    return res.status(404).json({ ok: false, error: 'Fungsi tidak dikenal: ' + name });
  }
  const started = Date.now();
  let result;
  let failed = null;
  const { scope, wasLoggedOut } = makeScope(req, res);
  try {
    const fn = scope.exported[name];
    if (typeof fn !== 'function') throw new Error('Fungsi tidak dikenal: ' + name);
    result = fn.apply(null, args);
  } catch (err) {
    failed = err;
  }
  if (store.readOnly() && hasSheetChanges()) {
    // Mode baca-saja: rumus spreadsheet belum dihitung ulang di server, jadi input
    // tetap dilakukan di aplikasi lama. Perubahan dibatalkan supaya data tidak menyimpang.
    const reverted = await store.revertDirty();
    clearCache();
    console.warn(JSON.stringify({ ev: 'gas_readonly_block', fn: name, sheets: reverted }));
    failed = new Error('Server baru masih dalam mode baca-saja. Simpan atau ubah data melalui aplikasi lama (Apps Script) dulu; data di sini diperbarui lewat menu Impor Data.');
  }
  try {
    await store.flush();
  } catch (err) {
    console.error(JSON.stringify({ ev: 'gas_flush_fail', fn: name, message: String(err.message || err) }));
    if (!failed) failed = new Error('Data gagal disimpan ke database. Coba lagi.');
  }
  const ms = Date.now() - started;
  if (ms > 3000) console.warn(JSON.stringify({ ev: 'gas_slow', fn: name, ms }));

  if (wasLoggedOut()) {
    const token = req.cookies ? req.cookies[session.COOKIE] : null;
    await session.destroy(token);
    session.clearCookie(res);
    await audit(req.user, 'logout', 'user', req.user.username, { via: 'app' });
  }
  if (failed) {
    const msg = String((failed && failed.message) || failed);
    if (!/^(Sesi|Akun|Halaman|Fitur|Tidak ada|Data)/.test(msg)) {
      console.error(JSON.stringify({ ev: 'gas_error', fn: name, message: msg.slice(0, 300) }));
    }
    return res.json({ ok: false, error: msg });
  }
  return res.json({ ok: true, data: result === undefined ? null : result });
});

module.exports = router;
module.exports.legacyUser = legacyUser;

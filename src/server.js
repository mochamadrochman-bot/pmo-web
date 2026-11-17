'use strict';

const path = require('node:path');
const express = require('express');
const helmet = require('helmet');

const db = require('./db');
const {
  attachUser, requireUser, mustChangePasswordGate, sameOrigin, loginRateLimit,
} = require('./middleware/auth');
const { renderPage } = require('./render');
const { migrate } = require('./migrate');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const portalRoutes = require('./routes/portal');
const adminRoutes = require('./routes/admin');
const gasRoutes = require('./routes/gas');
const loginPage = require('./routes/login-page');
const gasStore = require('./gas/store');
const gasRuntime = require('./gas/runtime');
const googleAuth = require('./google/auth');
const gasSync = require('./gas/sync');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
// Aplikasi berada di belakang Traefik (Coolify): ambil IP pengunjung dari X-Forwarded-For.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// CSP dimatikan pada tahap awal karena halaman lama memakai style dan script inline.
// Nyalakan setelah aset dipisah ke /assets (lihat B5).
app.use(helmet({ contentSecurityPolicy: false }));

// Dashboard internal: jangan diindeks mesin pencari, dan tutup fitur perangkat yang tidak dipakai.
// Mikrofon tetap diizinkan untuk halaman sendiri (dipakai input suara).
app.use((req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Permissions-Policy', 'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)');
  next();
});

// Satu alamat utama: host "www." dialihkan permanen ke alamat tanpa www (sesuai APP_BASE_URL).
app.use((req, res, next) => {
  const host = String(req.headers.host || '');
  if (/^www\./i.test(host) && (req.method === 'GET' || req.method === 'HEAD')) {
    let base = '';
    try { base = process.env.APP_BASE_URL ? new URL(process.env.APP_BASE_URL).origin : ''; } catch (e) { base = ''; }
    if (!base || /^https?:\/\/www\./i.test(base)) base = 'https://' + host.replace(/^www\./i, '');
    return res.redirect(301, base + req.originalUrl);
  }
  next();
});

// Content-Security-Policy mode lapor saja + penerima laporan (lihat routes/csp.js).
const cspRoutes = require('./routes/csp');
app.use(cspRoutes.header);
app.post('/api/csp-report', cspRoutes);

app.get('/robots.txt', (req, res) => res.type('text/plain').send('User-agent: *\nDisallow: /\n'));
app.use('/', require('./routes/brand'));
app.get(['/favicon.ico', '/apple-touch-icon.png'], (req, res) => res.redirect(302, '/media/brand/icon.png'));
// Halaman lama mengirim berkas lewat google.script.run (base64), jadi batasnya lebih besar di /app/rpc.
const jsonSmall = express.json({ limit: '1mb' });
const jsonLarge = express.json({ limit: '40mb' });
app.use((req, res, next) => ((req.path.startsWith('/app/rpc/') || req.path === '/api/model3d' || /^\/api\/pres\/decks\/\d+\/pages\//.test(req.path)) ? jsonLarge : jsonSmall)(req, res, next));
// pdf.js untuk merender PDF materi presentasi di browser.
// Media statis (video animasi pembuka Portal, poster).
app.use('/media', express.static(path.join(__dirname, '..', 'public', 'media'), { maxAge: '7d', index: false }));
app.use('/vendor/pdfjs', express.static(path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build'), { maxAge: '7d', index: false }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Parser cookie ringan, cukup untuk satu cookie sesi.
app.use((req, res, next) => {
  const raw = req.headers.cookie || '';
  const out = {};
  raw.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > 0) {
      out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    }
  });
  req.cookies = out;
  next();
});

app.use(sameOrigin);
app.use(attachUser);
app.use(mustChangePasswordGate);

// ---- publik
app.get('/health', async (req, res) => {
  try {
    const ok = await db.health();
    res.status(ok ? 200 : 503).json({ ok, uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ ok: false, error: String(err.message || err) });
  }
});

app.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  if (process.env.LEGACY_LOGIN !== '0') {
    try {
      const base = (process.env.APP_BASE_URL || (req.protocol + '://' + req.get('host'))).replace(/\/$/, '');
      res.set('Cache-Control', 'no-store');
      return res.type('html').send(loginPage.render(base + '/app', base));
    } catch (err) {
      console.error('[login] tampilan lama gagal, pakai tampilan sederhana:', err.message);
    }
  }
  renderPage(res, 'pages/login', { title: 'Masuk', error: null });
});

// Form login tanpa JavaScript: kembali ke halaman login (sandi tidak pernah masuk ke alamat).
app.post('/login', (req, res) => res.redirect(303, '/login'));
app.post('/api/auth/login', loginRateLimit, authRoutes.login);
app.post('/api/auth/logout', authRoutes.logout);

// ---- butuh sesi
app.get('/api/auth/me', requireUser, authRoutes.me);
app.post('/api/auth/password', requireUser, authRoutes.changePassword);
app.get('/akun/password', requireUser, (req, res) => {
  renderPage(res, 'pages/akun-password', {
    title: 'Ganti Password', user: req.user, minLength: authRoutes.MIN_PASSWORD,
  });
});
app.get('/privasi', (req, res) => renderPage(res, 'pages/privasi', { title: 'Kebijakan Privasi', user: req.user }));
app.use('/', adminRoutes);
app.use('/', cspRoutes);
app.use('/', require('./routes/arsip'));
app.use('/', require('./routes/pres'));
app.use('/', require('./routes/model3d'));
app.use('/', gasRoutes);
app.use('/api', projectRoutes);
app.use('/', portalRoutes);

// ---- 404 dan penanganan galat
app.use((req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/app/rpc/')) {
    return res.status(404).json({ ok: false, error: 'Rute tidak dikenal.' });
  }
  res.status(404);
  renderPage(res, 'pages/error', { code: 404, message: 'Halaman tidak ditemukan.', user: req.user });
});

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const parseError = err.type === 'entity.parse.failed';
  const status = parseError ? 400 : (err.status || 500);
  if (status >= 500) {
    console.error(JSON.stringify({ ev: 'unhandled', path: req.path, message: String(err.message || err) }));
  }
  if (req.path.startsWith('/api/') || req.path.startsWith('/app/rpc/')) {
    return res.status(status).json({
      ok: false,
      error: parseError ? 'Format permintaan tidak valid.' : 'Terjadi kesalahan di server.',
    });
  }
  res.status(status);
  renderPage(res, 'pages/error', { code: status, message: 'Terjadi kesalahan di server.' });
});

async function start() {
  try {
    await migrate();
    const g = await googleAuth.load();
    console.log(JSON.stringify({ ev: 'google_auth', configured: g.configured, connected: g.connected }));
    await require('./lib/groups').load();
    const info = await gasStore.load();
    const rt = gasRuntime.load();
    console.log(JSON.stringify({ ev: 'gas_ready', sheets: info.sheets, functions: rt.functions, html: rt.html }));
    const auto = gasSync.start();
    console.log(JSON.stringify({ ev: 'gas_sync_schedule', auto, minutes: gasSync.info().minutes }));
  } catch (err) {
    console.error(JSON.stringify({ ev: 'migrate_fail', message: String(err.message || err) }));
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    try { require('./routes/brand').warm(); } catch (e) { /* gambar diambil saat diminta */ }
    console.log(JSON.stringify({ ev: 'listen', port: PORT, env: process.env.NODE_ENV || 'development' }));
  });

  async function shutdown(signal) {
    console.log(JSON.stringify({ ev: 'shutdown', signal }));
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
  start();
}

module.exports = app;

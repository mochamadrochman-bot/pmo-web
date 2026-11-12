'use strict';

const path = require('node:path');
const express = require('express');
const helmet = require('helmet');

const db = require('./db');
const { attachUser, requireUser } = require('./middleware/auth');
const { renderPage } = require('./render');
const { migrate } = require('./migrate');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// CSP dimatikan pada tahap awal karena halaman lama memakai style dan script inline.
// Nyalakan setelah aset dipisah ke /assets (lihat B5).
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
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

app.use(attachUser);

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
  renderPage(res, 'pages/login', { title: 'Masuk', error: null });
});

app.post('/api/auth/login', authRoutes.login);
app.post('/api/auth/logout', authRoutes.logout);

// ---- butuh sesi
app.get('/api/auth/me', requireUser, authRoutes.me);
app.use('/api', projectRoutes);

app.get('/', requireUser, async (req, res, next) => {
  try {
    const rows = await db.query('select id, name, status from projects order by name limit 50');
    renderPage(res, 'pages/home', { title: 'Proyek', user: req.user, projects: rows.rows });
  } catch (err) {
    next(err);
  }
});

// ---- 404 dan penanganan galat
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ ok: false, error: 'Rute tidak dikenal.' });
  }
  res.status(404);
  renderPage(res, 'pages/error', { code: 404, message: 'Halaman tidak ditemukan.' });
});

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const parseError = err.type === 'entity.parse.failed';
  const status = parseError ? 400 : (err.status || 500);
  if (status >= 500) {
    console.error(JSON.stringify({ ev: 'unhandled', path: req.path, message: String(err.message || err) }));
  }
  if (req.path.startsWith('/api/')) {
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
  } catch (err) {
    console.error(JSON.stringify({ ev: 'migrate_fail', message: String(err.message || err) }));
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
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

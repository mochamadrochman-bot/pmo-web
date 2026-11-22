'use strict';

/**
 * Content-Security-Policy dalam MODE LAPOR SAJA (Content-Security-Policy-Report-Only).
 *
 * Browser TIDAK memblokir apa pun; ia hanya mengirim laporan bila ada skrip, gambar, video, atau
 * bingkai dari sumber di luar daftar. Laporan diringkas per (jenis, sumber, halaman) di tabel
 * csp_reports dan bisa dilihat Admin di /admin/csp. Setelah daftar sumber lengkap dan laporan
 * sepi, header bisa diganti ke Content-Security-Policy (penegakan) dengan CSP_MODE=enforce.
 *
 * Env:
 *   CSP_MODE   report (bawaan) | enforce | off
 *   CSP_EXTRA_FRAME  sumber tambahan untuk frame-src, dipisah spasi (mis. alamat NVR CCTV)
 */

const express = require('express');
const db = require('../db');
const { requireModule } = require('../middleware/auth');
const { renderPage } = require('../render');

const MODE = String(process.env.CSP_MODE || 'report').toLowerCase();

function policy() {
  const frameExtra = String(process.env.CSP_EXTRA_FRAME || '').trim();
  const d = {
    'default-src': ["'self'"],
    // 'wasm-unsafe-eval': hanya mengizinkan WebAssembly (bukan eval JavaScript). Laporan "wasm-eval" muncul di
    // hampir semua halaman termasuk /login, kemungkinan dari pustaka PDF/ekstensi browser; aman dibuka.
    'script-src': ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'],
    'img-src': ["'self'", 'data:', 'blob:', 'https://drive.google.com', 'https://*.googleusercontent.com', 'https://*.google.com', 'https://i.ytimg.com',
      'https://*.microsoftpersonalcontent.com', 'https://*.1drv.com'],
    // data: untuk video pembuka di /login; OneDrive untuk video mingguan/eksekutif dari tautan 1drv.ms.
    'media-src': ["'self'", 'data:', 'blob:', 'https://drive.google.com', 'https://*.googleusercontent.com',
      'https://*.microsoftpersonalcontent.com', 'https://*.1drv.com', 'https://*.sharepoint.com'],
    'frame-src': ["'self'", 'https://drive.google.com', 'https://docs.google.com', 'https://www.youtube.com', 'https://www.youtube-nocookie.com',
      'https://view.officeapps.live.com', 'https://onedrive.live.com', 'https://*.sharepoint.com', 'https://my.microsoftpersonalcontent.com',
      'https://www.vesselfinder.com', 'https://www.flightradar24.com'].concat(frameExtra ? frameExtra.split(/\s+/) : []),
    // cdn: pdf.js mengambil berkas worker lewat fetch (Engineering, Library).
    // svc.ms + microsoftpersonalcontent: membuka video OneDrive (token tamu lalu alamat unduh).
    'connect-src': ["'self'", 'https://www.googleapis.com', 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com',
      'https://api-badgerp.svc.ms', 'https://my.microsoftpersonalcontent.com', 'https://*.microsoftpersonalcontent.com', 'https://*.1drv.com'],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"],
  };
  let s = Object.entries(d).map(([k, v]) => k + ' ' + v.join(' ')).join('; ');
  // report-uri saja: dikirim langsung oleh semua browser. (report-to/Reporting API dikirim tertunda dan
  // membuat Chrome mengabaikan report-uri, jadi sengaja tidak dipakai.)
  s += '; report-uri /api/csp-report';
  return s;
}
const POLICY = policy();

function header(req, res, next) {
  if (MODE !== 'off') {
    res.set(MODE === 'enforce' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only', POLICY);
  }
  next();
}

// ---------------------------------------------------------------- penerima laporan
const hits = new Map(); // batas per IP per menit
function limited(ip) {
  const now = Date.now(), k = ip || '?';
  let h = hits.get(k);
  if (!h || h.reset < now) { h = { n: 0, reset: now + 60000 }; hits.set(k, h); }
  h.n += 1;
  if (hits.size > 2000) for (const [x, v] of hits) if (v.reset < now) hits.delete(x);
  return h.n > 120;
}

function norm(r) {
  const dir = String(r['effective-directive'] || r.effectiveDirective || r['violated-directive'] || r.violatedDirective || '').split(' ')[0].slice(0, 40);
  const raw = String(r['blocked-uri'] || r.blockedURL || r.blockedUri || '');
  let blocked = raw;
  if (/^(inline|eval|wasm-eval|trusted-types-policy|trusted-types-sink)$/.test(raw)) blocked = raw;
  else if (/^(data|blob|about|chrome-extension|moz-extension|safari-extension):?/i.test(raw)) blocked = raw.split(':')[0].toLowerCase();
  else { try { blocked = new URL(raw).origin; } catch (e) { blocked = raw.slice(0, 80) || '(kosong)'; } }
  let page = String(r['document-uri'] || r.documentURL || r.documentUri || '');
  try { const u = new URL(page); page = u.pathname + (u.searchParams.get('page') ? '?page=' + u.searchParams.get('page') : ''); } catch (e) { page = page.slice(0, 80); }
  const sample = (raw.slice(0, 200) + (r['source-file'] || r.sourceFile ? ' @ ' + String(r['source-file'] || r.sourceFile).slice(0, 120) + ':' + (r['line-number'] || r.lineNumber || '') : '')).slice(0, 360);
  return { dir: dir || '(?)', blocked: blocked.slice(0, 120), page: page.slice(0, 120) || '(?)', sample };
}

async function save(list) {
  const cnt = await db.query('select count(*)::int n from csp_reports');
  const full = cnt.rows[0].n >= 500;
  for (const r of list.slice(0, 20)) {
    const x = norm(r);
    // Ekstensi browser milik pengguna bukan urusan dashboard.
    if (/extension$/.test(x.blocked)) continue;
    if (full) {
      await db.query('update csp_reports set hits = hits + 1, last_seen = now() where directive=$1 and blocked=$2 and page=$3', [x.dir, x.blocked, x.page]);
    } else {
      await db.query(
        `insert into csp_reports (directive, blocked, page, sample) values ($1,$2,$3,$4)
         on conflict (directive, blocked, page) do update set hits = csp_reports.hits + 1, last_seen = now(), sample = excluded.sample`,
        [x.dir, x.blocked, x.page, x.sample]);
    }
  }
}

const parse = express.json({ type: ['application/csp-report', 'application/reports+json', 'application/json'], limit: '32kb' });
const router = express.Router();

router.post('/api/csp-report', parse, async (req, res) => {
  res.status(204).end();
  if (limited(req.ip)) return;
  try {
    const b = req.body;
    let list = [];
    if (b && b['csp-report']) list = [b['csp-report']];
    else if (Array.isArray(b)) list = b.filter((x) => x && /csp/i.test(String(x.type || '')) && x.body).map((x) => x.body);
    if (list.length) await save(list);
  } catch (e) {
    console.log(JSON.stringify({ ev: 'csp_report_fail', message: String(e.message || e) }));
  }
});

// ---------------------------------------------------------------- tampilan Admin
const onlyAdmin = requireModule('akun');
router.get('/admin/csp', onlyAdmin, async (req, res, next) => {
  try {
    const rows = (await db.query('select * from csp_reports order by last_seen desc limit 500')).rows;
    renderPage(res, 'pages/admin-csp', { title: 'Laporan CSP', user: req.user, rows, mode: MODE, policy: POLICY });
  } catch (e) { next(e); }
});
router.post('/api/admin/csp/clear', onlyAdmin, async (req, res) => {
  try { await db.query('delete from csp_reports'); res.json({ ok: true }); } catch (e) { res.json({ ok: false, error: e.message }); }
});

module.exports = router;
module.exports.header = header;
module.exports.POLICY = POLICY;

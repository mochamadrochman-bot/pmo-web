'use strict';

/**
 * Gambar identitas (logo, latar login, ikon tab) disajikan dari server sendiri.
 *
 * Sumber aslinya thumbnail Google Drive. Supaya halaman tidak bergantung pada Drive di setiap
 * kunjungan (lambat, bisa kena batas 403/429), server mengambilnya SEKALI, menyimpannya di disk,
 * lalu menyajikannya dengan cache panjang. Kalau pengambilan gagal, browser dialihkan ke sumber
 * asli sehingga tampilan tidak pernah rusak, dan server mencoba lagi pada permintaan berikutnya
 * (paling cepat 5 menit kemudian).
 */

const express = require('express');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SRC = process.env.BRAND_SRC || 'https://drive.google.com/thumbnail';
const DIR = process.env.BRAND_CACHE_DIR || path.join(os.tmpdir(), 'pmo-brand');
const ASSETS = {
  'logo.png': { id: '1JP0hqePxcaiFN0aZ2dv6WJ6qCNwrRLxf', w: 480 },      // logo PMO di kartu login
  'login-bg.jpg': { id: '1W4smcs4NnfWWq4ruAub6SifsfyF4unC6', w: 1920 }, // latar halaman login
  'icon.png': { id: '1JP0hqePxcaiFN0aZ2dv6WJ6qCNwrRLxf', w: 128 },      // ikon tab & pratinjau tautan
  'petro.png': { id: '1LZynEU1SZ27JmRMPdv2D5CTxcd4cKp84', w: 480 },     // logo Petrokimia Gresik
};
const mem = new Map();   // nama -> { buf, type }
const failAt = new Map(); // nama -> waktu gagal terakhir
const pending = new Map();

const urlOf = (a) => SRC + '?id=' + a.id + '&sz=w' + a.w;

async function load(name) {
  if (mem.has(name)) return mem.get(name);
  const file = path.join(DIR, name);
  try {
    const buf = fs.readFileSync(file);
    const type = fs.readFileSync(file + '.type', 'utf8').trim() || 'image/png';
    if (buf.length > 200) { const v = { buf, type }; mem.set(name, v); return v; }
  } catch (e) { /* belum tersimpan */ }
  if (failAt.has(name) && Date.now() - failAt.get(name) < 5 * 60 * 1000) return null;
  if (pending.has(name)) return pending.get(name);
  const job = (async () => {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 8000);
      const r = await fetch(urlOf(ASSETS[name]), { signal: ctl.signal, redirect: 'follow' });
      clearTimeout(t);
      const type = String(r.headers.get('content-type') || '').split(';')[0];
      if (!r.ok || !/^image\//.test(type)) throw new Error('HTTP ' + r.status + ' ' + type);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 200 || buf.length > 8 * 1024 * 1024) throw new Error('ukuran tidak wajar');
      try { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(file, buf); fs.writeFileSync(file + '.type', type); } catch (e) { /* cukup di memori */ }
      const v = { buf, type };
      mem.set(name, v);
      failAt.delete(name);
      return v;
    } catch (e) {
      failAt.set(name, Date.now());
      console.log(JSON.stringify({ ev: 'brand_fetch_fail', name, message: String(e.message || e) }));
      return null;
    } finally { pending.delete(name); }
  })();
  pending.set(name, job);
  return job;
}

const router = express.Router();
router.get('/media/brand/:name', async (req, res) => {
  const name = String(req.params.name || '');
  if (!Object.prototype.hasOwnProperty.call(ASSETS, name)) return res.status(404).type('text').send('Tidak ditemukan');
  const v = await load(name);
  res.set('Cross-Origin-Resource-Policy', 'cross-origin'); // boleh dipakai pratinjau tautan (WhatsApp/Teams)
  if (!v) { res.set('Cache-Control', 'no-store'); return res.redirect(302, urlOf(ASSETS[name])); }
  res.set('Cache-Control', 'public, max-age=604800');
  res.type(v.type).send(v.buf);
});

/** Ambil semua gambar di latar belakang saat server mulai, supaya kunjungan pertama pun cepat. */
function warm() { Object.keys(ASSETS).forEach((n) => { load(n).catch(() => {}); }); }

module.exports = router;
module.exports.warm = warm;
module.exports.ASSETS = ASSETS;

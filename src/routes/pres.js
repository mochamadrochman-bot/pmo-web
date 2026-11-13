'use strict';

/**
 * Pustaka slide presentasi (mode presentasi Executive & Weekly).
 * PDF dirender menjadi gambar JPEG di browser (pdf.js), lalu tiap halaman diunggah ke sini.
 * Gambar disimpan di database supaya presentasi tetap cepat dan tidak bergantung pada Google Drive.
 */

const express = require('express');
const db = require('../db');
const { requireUser, audit } = require('../middleware/auth');

const router = express.Router();
const MAX_PAGES = 120;

const canManage = (u) => !!u && (u.role === 'admin' || u.role === 'input');
function onlyManager(req, res, next) {
  if (!canManage(req.user)) return res.status(403).json({ ok: false, error: 'Hanya Admin dan PIC/Input yang dapat mengatur materi presentasi.' });
  next();
}
const bad = (res, msg) => res.status(400).json({ ok: false, error: msg });
const KEY_RE = /^(executive|weekly:[A-Z0-9 ._&()\-/]{1,120}|_settings)$/;

router.get('/api/pres/library', requireUser, async (req, res, next) => {
  try {
    const r = await db.query('select id, title, file_name, pages, created_by, created_at from pres_decks where ready order by created_at desc');
    res.json({ ok: true, data: { canManage: canManage(req.user), decks: r.rows } });
  } catch (err) { next(err); }
});

router.get('/api/pres/img/:deck/:page', requireUser, async (req, res, next) => {
  try {
    const col = req.query.t === '1' ? 'thumb' : 'image';
    const r = await db.query(`select ${col} as b from pres_pages where deck_id = $1 and page_no = $2`, [Number(req.params.deck) || 0, Number(req.params.page) || 0]);
    if (!r.rows[0]) return res.status(404).end();
    res.set('Cache-Control', 'private, max-age=86400, immutable');
    res.type('jpeg').send(r.rows[0].b);
  } catch (err) { next(err); }
});

router.post('/api/pres/decks', requireUser, onlyManager, async (req, res, next) => {
  try {
    const title = String((req.body && req.body.title) || '').trim().slice(0, 160);
    const fileName = String((req.body && req.body.fileName) || '').trim().slice(0, 200);
    const pages = Number(req.body && req.body.pages);
    if (!title) return bad(res, 'Judul materi wajib diisi.');
    if (!Number.isInteger(pages) || pages < 1 || pages > MAX_PAGES) return bad(res, `Jumlah halaman harus 1–${MAX_PAGES}.`);
    const r = await db.query('insert into pres_decks (title, file_name, pages, created_by) values ($1, $2, $3, $4) returning id', [title, fileName, pages, req.user.username]);
    res.json({ ok: true, data: { id: r.rows[0].id } });
  } catch (err) { next(err); }
});

// Satu halaman: body = JSON { width, height, thumb, image } dengan gambar base64 JPEG.
router.post('/api/pres/decks/:id/pages/:n', requireUser, onlyManager, async (req, res, next) => {
  try {
    const id = Number(req.params.id), n = Number(req.params.n);
    const d = await db.query('select pages, ready from pres_decks where id = $1', [id]);
    if (!d.rows[0]) return bad(res, 'Materi tidak ditemukan.');
    if (d.rows[0].ready) return bad(res, 'Materi sudah selesai diunggah.');
    if (!Number.isInteger(n) || n < 1 || n > d.rows[0].pages) return bad(res, 'Nomor halaman tidak valid.');
    const b = req.body || {};
    const jpg = (s) => { const m = /^data:image\/jpeg;base64,(.+)$/.exec(String(s || '')); return m ? Buffer.from(m[1], 'base64') : null; };
    const image = jpg(b.image), thumb = jpg(b.thumb);
    if (!image || !thumb || image.length < 100) return bad(res, 'Gambar halaman tidak terbaca.');
    if (image.slice(0, 2).toString('hex') !== 'ffd8') return bad(res, 'Gambar harus JPEG.');
    const w = Math.round(Number(b.width)), h = Math.round(Number(b.height));
    if (!(w > 0 && h > 0)) return bad(res, 'Ukuran halaman tidak valid.');
    await db.query(
      `insert into pres_pages (deck_id, page_no, width, height, thumb, image) values ($1,$2,$3,$4,$5,$6)
       on conflict (deck_id, page_no) do update set width = excluded.width, height = excluded.height, thumb = excluded.thumb, image = excluded.image`,
      [id, n, w, h, thumb, image]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/api/pres/decks/:id/done', requireUser, onlyManager, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const d = await db.query('select pages from pres_decks where id = $1', [id]);
    if (!d.rows[0]) return bad(res, 'Materi tidak ditemukan.');
    const c = await db.query('select count(*)::int as n from pres_pages where deck_id = $1', [id]);
    if (c.rows[0].n !== d.rows[0].pages) return bad(res, `Baru ${c.rows[0].n} dari ${d.rows[0].pages} halaman yang terunggah. Ulangi unggahan.`);
    await db.query('update pres_decks set ready = true where id = $1', [id]);
    await audit(req.user, 'pres_upload', 'pres_deck', id, { pages: d.rows[0].pages });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/api/pres/decks/:id', requireUser, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const d = await db.query('select id, title, file_name, pages from pres_decks where id = $1 and ready', [id]);
    if (!d.rows[0]) return res.status(404).json({ ok: false, error: 'Materi tidak ditemukan.' });
    const p = await db.query('select page_no, width, height from pres_pages where deck_id = $1 order by page_no', [id]);
    res.json({ ok: true, data: Object.assign(d.rows[0], { pageList: p.rows }) });
  } catch (err) { next(err); }
});

router.delete('/api/pres/decks/:id', requireUser, onlyManager, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const d = await db.query('select created_by from pres_decks where id = $1', [id]);
    if (!d.rows[0]) return bad(res, 'Materi tidak ditemukan.');
    if (req.user.role !== 'admin' && d.rows[0].created_by !== req.user.username) return res.status(403).json({ ok: false, error: 'Materi ini hanya dapat dihapus oleh pengunggahnya atau Admin.' });
    // Lepaskan dari semua susunan slide.
    const sets = await db.query("select key, data from pres_sets where key <> '_settings' and key not like 'layout:%'");
    for (const s of sets.rows) {
      const items = Array.isArray(s.data) ? s.data : [];
      const kept = items.filter((x) => Number(x.deck) !== id);
      if (kept.length !== items.length) await db.query('update pres_sets set data = $2 where key = $1', [s.key, JSON.stringify(kept)]);
    }
    await db.query('delete from pres_decks where id = $1', [id]);
    await audit(req.user, 'pres_delete', 'pres_deck', id, null);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Susunan slide tambahan + teks sampul/terima kasih untuk satu halaman presentasi.
router.get('/api/pres/set', requireUser, async (req, res, next) => {
  try {
    const key = String(req.query.key || '').toUpperCase().replace(/^EXECUTIVE$/, 'executive').replace(/^WEEKLY:/, 'weekly:');
    if (!KEY_RE.test(key) || key === '_settings') return bad(res, 'Kunci presentasi tidak valid.');
    const r = await db.query("select key, data from pres_sets where key = any($1::text[])", [[key, '_settings', 'layout:' + key]]);
    const get = (k, d) => { const x = r.rows.find((y) => y.key === k); return x ? x.data : d; };
    const items = get(key, []);
    // Lengkapi ukuran halaman supaya slide bisa ditata tanpa menunggu gambar.
    const ids = [...new Set(items.map((x) => Number(x.deck)).filter(Boolean))];
    let meta = [];
    if (ids.length) {
      meta = (await db.query(
        'select p.deck_id, p.page_no, p.width, p.height, d.title from pres_pages p join pres_decks d on d.id = p.deck_id where d.ready and p.deck_id = any($1::int[])', [ids]
      )).rows;
    }
    const full = items.map((x) => {
      const m = meta.find((y) => y.deck_id === Number(x.deck) && y.page_no === Number(x.page));
      return m ? { deck: m.deck_id, page: m.page_no, pos: x.pos || 'end', width: m.width, height: m.height, title: m.title } : null;
    }).filter(Boolean);
    const lay = get('layout:' + key, {});
    const layout = { order: Array.isArray(lay.order) ? lay.order : [], hidden: Array.isArray(lay.hidden) ? lay.hidden : [] };
    res.json({ ok: true, data: { key, items: full, layout, settings: get('_settings', {}), canManage: canManage(req.user) } });
  } catch (err) { next(err); }
});

router.put('/api/pres/set', requireUser, onlyManager, async (req, res, next) => {
  try {
    const b = req.body || {};
    const key = String(b.key || '').toUpperCase().replace(/^EXECUTIVE$/, 'executive').replace(/^WEEKLY:/, 'weekly:');
    if (!KEY_RE.test(key) || key === '_settings') return bad(res, 'Kunci presentasi tidak valid.');
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 200).map((x) => ({
      deck: Number(x.deck), page: Number(x.page), pos: String(x.pos || 'end').slice(0, 200),
    })).filter((x) => Number.isInteger(x.deck) && Number.isInteger(x.page));
    await db.query(
      `insert into pres_sets (key, data, updated_by, updated_at) values ($1, $2, $3, now())
       on conflict (key) do update set data = excluded.data, updated_by = excluded.updated_by, updated_at = now()`,
      [key, JSON.stringify(items), req.user.username]
    );
    if (b.layout && typeof b.layout === 'object') {
      const clean = (a) => (Array.isArray(a) ? a : []).map((t) => String(t || '').slice(0, 200)).filter(Boolean).slice(0, 200);
      const lay = { order: clean(b.layout.order), hidden: clean(b.layout.hidden) };
      await db.query(
        `insert into pres_sets (key, data, updated_by, updated_at) values ($1, $2, $3, now())
         on conflict (key) do update set data = excluded.data, updated_by = excluded.updated_by, updated_at = now()`,
        ['layout:' + key, JSON.stringify(lay), req.user.username]
      );
    }
    if (b.settings && typeof b.settings === 'object') {
      const s = {};
      ['coverTitle', 'coverSub', 'thanksSub', 'thanksContact'].forEach((k) => { if (b.settings[k] !== undefined) s[k] = String(b.settings[k] || '').slice(0, 200); });
      await db.query(
        `insert into pres_sets (key, data, updated_by, updated_at) values ('_settings', $1, $2, now())
         on conflict (key) do update set data = excluded.data, updated_by = excluded.updated_by, updated_at = now()`,
        [JSON.stringify(s), req.user.username]
      );
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// --- Video latar sampul & terima kasih: video LINK_VIDEO (Google Drive) dari data mingguan ---
const https = require('node:https');
const gauth = require('../google/auth');
const gasRuntime = require('../gas/runtime');
let vidCache = { at: 0, byProject: {}, names: {} };
function driveId(u) {
  const m = /\/file\/d\/([\w-]{20,})/.exec(String(u || '')) || /[?&]id=([\w-]{20,})/.exec(String(u || ''));
  return m ? m[1] : null;
}
/** { PROYEK_ID: [driveId terbaru dulu, ...] } — disimpan 10 menit. */
function videoIndex() {
  if (Date.now() - vidCache.at < 10 * 60 * 1000) return vidCache;
  const { exported } = gasRuntime.createScope({ user: null, appUrl: '', onLogout() {} });
  const d = exported.loadDb_();
  const W = d.weekly, weeks = Object.keys(W.weekCols || {}).map(Number).sort((a, b) => b - a);
  const byProject = {}, names = {};
  (d.allProjects || []).forEach((p) => {
    names[p.id] = [p.id, p.name, p.fullName].filter(Boolean).map((x) => String(x).toUpperCase().replace(/^PROYEK\s+/, '').trim());
    const ids = [];
    for (const w of weeks) {
      const id = driveId(exported.weekLink_(W, p.id, 'LINK_VIDEO', w));
      if (id && !ids.includes(id)) ids.push(id);
      if (ids.length >= 6) break;
    }
    if (ids.length) byProject[p.id] = ids;
  });
  vidCache = { at: Date.now(), byProject, names };
  return vidCache;
}
router.get('/api/pres/videos', requireUser, (req, res) => {
  try {
    const ix = videoIndex();
    const want = String(req.query.project || '').toUpperCase().replace(/^PROYEK\s+/, '').trim();
    let ids = [];
    if (want) {
      const pid = Object.keys(ix.names).find((k) => ix.names[k].includes(want));
      ids = pid ? (ix.byProject[pid] || []).slice(0, 3) : [];
    } else {
      ids = Object.keys(ix.byProject).map((k) => ix.byProject[k][0]).filter(Boolean).slice(0, 8);
    }
    res.json({ ok: true, data: { videos: ids } });
  } catch (e) {
    res.json({ ok: true, data: { videos: [], note: String(e.message || e) } });
  }
});
// Alirkan video Drive (hanya file yang tercatat sebagai LINK_VIDEO), mendukung Range untuk pemutar video.
router.get('/api/pres/video/:id', requireUser, (req, res) => {
  const id = String(req.params.id || '');
  let ok = false;
  try { const ix = videoIndex(); ok = Object.values(ix.byProject).some((a) => a.includes(id)); } catch (e) { ok = false; }
  if (!ok) return res.status(404).end();
  let token;
  try { token = gauth.accessTokenSync(); } catch (e) { return res.status(503).end(); }
  const headers = { Authorization: 'Bearer ' + token };
  if (req.headers.range) headers.Range = req.headers.range;
  const base = process.env.GOOGLE_DRIVE_API || 'https://www.googleapis.com/drive/v3';
  const url = new URL(base + '/files/' + encodeURIComponent(id) + '?alt=media&supportsAllDrives=true');
  const lib = url.protocol === 'http:' ? require('node:http') : https;
  const up = lib.get(url, { headers }, (r) => {
    if (r.statusCode >= 400) { r.resume(); return res.status(r.statusCode === 404 ? 404 : 502).end(); }
    res.status(r.statusCode);
    ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach((h) => { if (r.headers[h]) res.set(h, r.headers[h]); });
    res.set('Cache-Control', 'private, max-age=3600');
    r.pipe(res);
  });
  up.on('error', () => { if (!res.headersSent) res.status(502).end(); else res.end(); });
  req.on('close', () => up.destroy());
});

module.exports = router;

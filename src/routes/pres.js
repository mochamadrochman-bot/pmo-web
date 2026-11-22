'use strict';

/**
 * Pustaka slide presentasi (mode presentasi Executive & Weekly).
 * PDF dirender menjadi gambar JPEG di browser (pdf.js), lalu tiap halaman diunggah ke sini.
 * Jika Google Drive terhubung, gambar disimpan di folder Drive "PMO Presentation Slides";
 * jika tidak, disimpan di database. Gambar lama di database tetap dilayani.
 */

const express = require('express');
const db = require('../db');
const gauth = require('../google/auth');
const access = require('../lib/access');
const groups = require('../lib/groups');
const arsip = require('../arsip/service');
const { requireUser, audit } = require('../middleware/auth');

const router = express.Router();
const MAX_PAGES = 120;
const DRIVE_FOLDER_NAME = 'PMO Presentation Slides';
let cachedPresFolderId = null;

async function ensurePresFolder(token) {
  if (cachedPresFolderId) return cachedPresFolderId;
  const parent = String(process.env.LIBRARY_FOLDER_ID || '').trim();
  const qParts = [`name = '${DRIVE_FOLDER_NAME}'`, "mimeType = 'application/vnd.google-apps.folder'", 'trashed = false'];
  if (parent) qParts.push(`'${parent.replace(/'/g, "\\'")}' in parents`);
  const searchUrl = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(qParts.join(' and ')) + '&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true';
  const sr = await fetch(searchUrl, { headers: { Authorization: 'Bearer ' + token } });
  if (sr.ok) {
    const sj = await sr.json().catch(() => ({}));
    if (sj.files && sj.files[0] && sj.files[0].id) {
      cachedPresFolderId = sj.files[0].id;
      return cachedPresFolderId;
    }
  }
  const meta = { name: DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' };
  if (parent) meta.parents = [parent];
  const cr = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  });
  const cj = await cr.json().catch(() => ({}));
  if (!cr.ok || !cj.id) throw new Error('Gagal membuat folder slide presentasi di Google Drive.');
  cachedPresFolderId = cj.id;
  return cachedPresFolderId;
}

async function uploadJpegToDrive(token, folderId, name, buf) {
  const boundary = 'pmo_slide_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  const metaPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify({ name, parents: [folderId], mimeType: 'image/jpeg' }) +
    `\r\n--${boundary}\r\nContent-Type: image/jpeg\r\n\r\n`,
    'utf8'
  );
  const endPart = Buffer.from(`\r\n--${boundary}--`, 'utf8');
  const body = Buffer.concat([metaPart, buf, endPart]);
  const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.id) throw new Error('Gagal mengunggah slide ke Google Drive.');
  return j.id;
}

async function fetchDriveFile(token, fileId) {
  const r = await fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '?alt=media&supportsAllDrives=true', {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!r.ok) return null;
  return Buffer.from(await r.arrayBuffer());
}

async function deleteDriveFile(token, fileId) {
  if (!fileId) return;
  try {
    await fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '?supportsAllDrives=true', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    });
  } catch (_) { /* abaikan */ }
}

// Mengubah susunan & pustaka presentasi: Admin untuk semua, PIC / Input khusus proyeknya masing-masing.
const isAdmin = (u) => !!u && u.role === 'admin';
const isInputOrPic = (u) => !!u && u.role === 'input';
const canManageAny = (u) => isAdmin(u) || isInputOrPic(u);

function scopeOk(u, pid) {
  if (!u || !pid) return false;
  if (isAdmin(u)) return true;
  if (!isInputOrPic(u)) return false;
  if (access.inScope(u, pid)) return true;
  const g = groups.get(pid);
  return !!(g && g.parent && access.inScope(u, g.parent));
}

function normProj(v) {
  return String(v || '').toUpperCase().replace(/^PROYEK\s+/, '').replace(/[^A-Z0-9]+/g, ' ').trim();
}

function allProjects() {
  try { return arsip.projects() || []; } catch (_) { return []; }
}

function resolveProjectId(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const list = allProjects();
  const up = s.toUpperCase();
  const nm = normProj(s);
  const found = list.find((p) => String(p.id) === s || String(p.id).toUpperCase() === up || normProj(p.name) === nm);
  return found ? String(found.id) : '';
}

function allowedProjects(u) {
  return allProjects()
    .filter((p) => isAdmin(u) || scopeOk(u, p.id))
    .map((p) => ({ id: p.id, name: p.name }));
}

function keyProjectId(key, fallbackKey) {
  const fromKey = (k) => (String(k || '').startsWith('weekly:') ? resolveProjectId(String(k).slice(7)) : '');
  return fromKey(key) || fromKey(fallbackKey) || '';
}

function canManageSet(u, key, fallbackKey) {
  if (isAdmin(u)) return true;
  if (!isInputOrPic(u)) return false;
  if (key === 'executive') return allowedProjects(u).length > 0;
  if (String(key || '').startsWith('weekly:')) {
    const pid = keyProjectId(key, fallbackKey);
    return !!(pid && scopeOk(u, pid));
  }
  return false;
}

function canManageDeckRow(u, row) {
  if (!u || !row) return false;
  if (isAdmin(u)) return true;
  if (!isInputOrPic(u)) return false;
  if (row.project_id) return scopeOk(u, row.project_id);
  return String(row.created_by || '') === String(u.username || '');
}

function itemSig(x) {
  if (!x) return '';
  if (x.type === 'model3d') return 'm:' + (Number(x.model) || 0);
  if (x.type === 'video') return 'v:' + String(x.project || '') + ':' + (Number(x.week) || 0);
  if (x.type === 'proj') return 'j:' + String(x.project || '') + ':' + String(x.kind || '');
  return 'p:' + (Number(x.deck) || 0) + ':' + (Number(x.page) || 0);
}

function onlyManager(req, res, next) {
  if (!canManageAny(req.user)) return res.status(403).json({ ok: false, error: 'Hanya Admin dan PIC / Input yang dapat mengatur susunan presentasi.' });
  next();
}
const PROJ_KINDS = ['week', 'fin', 'la', 'prog'];
const bad = (res, msg) => res.status(400).json({ ok: false, error: msg });
const KEY_RE = /^(executive|weekly:[A-Z0-9 ._&()\-/]{1,120}|_settings)$/;

router.get('/api/pres/library', requireUser, async (req, res, next) => {
  try {
    const r = await db.query('select id, title, file_name, pages, project_id, created_by, created_at from pres_decks where ready order by created_at desc');
    const names = {};
    allProjects().forEach((p) => { names[p.id] = p.name; });
    const reqPid = resolveProjectId(req.query.project);
    const decks = r.rows
      .filter((d) => isAdmin(req.user) || canManageDeckRow(req.user, d))
      .filter((d) => !reqPid || !d.project_id || d.project_id === reqPid || (groups.get(d.project_id) && groups.get(d.project_id).parent === reqPid))
      .map((d) => Object.assign({}, d, {
        project_name: d.project_id ? (names[d.project_id] || d.project_id) : '',
        canDelete: canManageDeckRow(req.user, d),
      }));
    res.json({
      ok: true,
      data: {
        canManage: canManageAny(req.user),
        isAdmin: isAdmin(req.user),
        projects: allowedProjects(req.user),
        decks,
      },
    });
  } catch (err) { next(err); }
});

router.get('/api/pres/img/:deck/:page', requireUser, async (req, res, next) => {
  try {
    const isThumb = req.query.t === '1';
    const col = isThumb ? 'thumb' : 'image';
    const dcol = isThumb ? 'thumb_drive_id' : 'image_drive_id';
    const r = await db.query(`select ${col} as b, ${dcol} as drive_id from pres_pages where deck_id = $1 and page_no = $2`, [Number(req.params.deck) || 0, Number(req.params.page) || 0]);
    const row = r.rows[0];
    if (!row) return res.status(404).end();
    let buf = row.b;
    if (!buf && row.drive_id) {
      const token = await gauth.accessToken();
      buf = await fetchDriveFile(token, row.drive_id);
    }
    if (!buf) return res.status(404).end();
    res.set('Cache-Control', 'private, max-age=86400, immutable');
    res.type('jpeg').send(buf);
  } catch (err) { next(err); }
});

router.post('/api/pres/decks', requireUser, onlyManager, async (req, res, next) => {
  try {
    const title = String((req.body && req.body.title) || '').trim().slice(0, 160);
    const fileName = String((req.body && req.body.fileName) || '').trim().slice(0, 200);
    const pages = Number(req.body && req.body.pages);
    if (!title) return bad(res, 'Judul materi wajib diisi.');
    if (!Number.isInteger(pages) || pages < 1 || pages > MAX_PAGES) return bad(res, `Jumlah halaman harus 1–${MAX_PAGES}.`);
    const rawPid = String((req.body && req.body.projectId) || '').trim();
    let pid = resolveProjectId(rawPid);
    if (!isAdmin(req.user)) {
      const mine = allowedProjects(req.user);
      if (!mine.length) return res.status(403).json({ ok: false, error: 'Akun Anda tidak memiliki proyek yang dapat dikelola.' });
      if (!rawPid && mine.length === 1) pid = String(mine[0].id);
      if (!pid || !scopeOk(req.user, pid)) return res.status(403).json({ ok: false, error: 'Anda hanya dapat mengunggah PDF untuk proyek Anda sendiri.' });
    } else if (rawPid && !pid) {
      return bad(res, 'Proyek yang dipilih tidak ditemukan.');
    }
    const r = await db.query(
      'insert into pres_decks (title, file_name, pages, project_id, created_by) values ($1, $2, $3, $4, $5) returning id',
      [title, fileName, pages, pid || null, req.user.username]
    );
    res.json({ ok: true, data: { id: r.rows[0].id, project_id: pid || null } });
  } catch (err) { next(err); }
});

// Satu halaman: body = JSON { width, height, thumb, image } dengan gambar base64 JPEG.
router.post('/api/pres/decks/:id/pages/:n', requireUser, onlyManager, async (req, res, next) => {
  try {
    const id = Number(req.params.id), n = Number(req.params.n);
    const d = await db.query('select pages, ready, project_id, created_by from pres_decks where id = $1', [id]);
    if (!d.rows[0]) return bad(res, 'Materi tidak ditemukan.');
    if (!canManageDeckRow(req.user, d.rows[0])) return res.status(403).json({ ok: false, error: 'Materi PDF ini milik proyek lain.' });
    if (d.rows[0].ready) return bad(res, 'Materi sudah selesai diunggah.');
    if (!Number.isInteger(n) || n < 1 || n > d.rows[0].pages) return bad(res, 'Nomor halaman tidak valid.');
    const b = req.body || {};
    const jpg = (s) => { const m = /^data:image\/jpeg;base64,(.+)$/.exec(String(s || '')); return m ? Buffer.from(m[1], 'base64') : null; };
    const image = jpg(b.image), thumb = jpg(b.thumb);
    if (!image || !thumb || image.length < 100) return bad(res, 'Gambar halaman tidak terbaca.');
    if (image.slice(0, 2).toString('hex') !== 'ffd8') return bad(res, 'Gambar harus JPEG.');
    const w = Math.round(Number(b.width)), h = Math.round(Number(b.height));
    if (!(w > 0 && h > 0)) return bad(res, 'Ukuran halaman tidak valid.');
    let imageDriveId = null, thumbDriveId = null, dbThumb = thumb, dbImage = image;
    if (gauth.status().connected) {
      const token = await gauth.accessToken();
      const folderId = await ensurePresFolder(token);
      [imageDriveId, thumbDriveId] = await Promise.all([
        uploadJpegToDrive(token, folderId, `deck-${id}-p${n}.jpg`, image),
        uploadJpegToDrive(token, folderId, `deck-${id}-p${n}-thumb.jpg`, thumb),
      ]);
      dbThumb = null;
      dbImage = null;
    }
    await db.query(
      `insert into pres_pages (deck_id, page_no, width, height, thumb, image, thumb_drive_id, image_drive_id) values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (deck_id, page_no) do update set width = excluded.width, height = excluded.height, thumb = excluded.thumb, image = excluded.image, thumb_drive_id = excluded.thumb_drive_id, image_drive_id = excluded.image_drive_id`,
      [id, n, w, h, dbThumb, dbImage, thumbDriveId, imageDriveId]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/api/pres/decks/:id/done', requireUser, onlyManager, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const d = await db.query('select pages, project_id, created_by from pres_decks where id = $1', [id]);
    if (!d.rows[0]) return bad(res, 'Materi tidak ditemukan.');
    if (!canManageDeckRow(req.user, d.rows[0])) return res.status(403).json({ ok: false, error: 'Materi PDF ini milik proyek lain.' });
    const c = await db.query('select count(*)::int as n from pres_pages where deck_id = $1', [id]);
    if (c.rows[0].n !== d.rows[0].pages) return bad(res, `Baru ${c.rows[0].n} dari ${d.rows[0].pages} halaman yang terunggah. Ulangi unggahan.`);
    await db.query('update pres_decks set ready = true where id = $1', [id]);
    await audit(req.user, 'pres_upload', 'pres_deck', id, { pages: d.rows[0].pages, project_id: d.rows[0].project_id || null });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/api/pres/decks/:id', requireUser, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const d = await db.query('select id, title, file_name, pages, project_id, created_by from pres_decks where id = $1 and ready', [id]);
    if (!d.rows[0]) return res.status(404).json({ ok: false, error: 'Materi tidak ditemukan.' });
    if (!isAdmin(req.user) && !canManageDeckRow(req.user, d.rows[0])) {
      return res.status(403).json({ ok: false, error: 'Materi PDF ini milik proyek lain.' });
    }
    const p = await db.query('select page_no, width, height from pres_pages where deck_id = $1 order by page_no', [id]);
    res.json({ ok: true, data: Object.assign(d.rows[0], { pageList: p.rows }) });
  } catch (err) { next(err); }
});

router.delete('/api/pres/decks/:id', requireUser, onlyManager, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const d = await db.query('select project_id, created_by from pres_decks where id = $1', [id]);
    if (!d.rows[0]) return bad(res, 'Materi tidak ditemukan.');
    if (!canManageDeckRow(req.user, d.rows[0])) return res.status(403).json({ ok: false, error: 'Materi ini hanya dapat dihapus oleh PIC / Input proyek terkait atau Admin.' });
    const driveRows = await db.query('select image_drive_id, thumb_drive_id from pres_pages where deck_id = $1', [id]);
    // Lepaskan dari semua susunan slide.
    const sets = await db.query("select key, data from pres_sets where key <> '_settings' and key not like 'layout:%'");
    for (const s of sets.rows) {
      const items = Array.isArray(s.data) ? s.data : [];
      const kept = items.filter((x) => Number(x.deck) !== id);
      if (kept.length !== items.length) await db.query('update pres_sets set data = $2 where key = $1', [s.key, JSON.stringify(kept)]);
    }
    await db.query('delete from pres_decks where id = $1', [id]);
    const driveIds = driveRows.rows.flatMap((x) => [x.image_drive_id, x.thumb_drive_id]).filter(Boolean);
    if (driveIds.length && gauth.status().connected) {
      gauth.accessToken().then((token) => Promise.all(driveIds.map((fid) => deleteDriveFile(token, fid)))).catch(() => {});
    }
    await audit(req.user, 'pres_delete', 'pres_deck', id, null);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Susunan slide tambahan + teks sampul/terima kasih untuk satu halaman presentasi.
router.get('/api/pres/set', requireUser, async (req, res, next) => {
  try {
    const normKey = (raw) => String(raw || '').toUpperCase().replace(/^EXECUTIVE$/, 'executive').replace(/^WEEKLY:/, 'weekly:');
    const key = normKey(req.query.key);
    if (!KEY_RE.test(key) || key === '_settings') return bad(res, 'Kunci presentasi tidak valid.');
    const fb = normKey(req.query.fallbackKey);
    const useFb = fb && fb !== key && KEY_RE.test(fb) && fb !== '_settings';
    const keys = [key, '_settings', 'layout:' + key];
    if (useFb) keys.push(fb, 'layout:' + fb);
    const r = await db.query("select key, data from pres_sets where key = any($1::text[])", [keys]);
    const get = (k, d) => { const x = r.rows.find((y) => y.key === k); return x ? x.data : d; };
    const hasPrimaryItems = r.rows.some((y) => y.key === key && Array.isArray(y.data) && y.data.length);
    const hasPrimaryLayout = r.rows.some((y) => y.key === 'layout:' + key);
    const items = hasPrimaryItems ? get(key, []) : (useFb ? get(fb, []) : get(key, []));
    // Lengkapi ukuran halaman supaya slide bisa ditata tanpa menunggu gambar.
    const ids = [...new Set(items.map((x) => Number(x.deck)).filter(Boolean))];
    let meta = [];
    if (ids.length) {
      meta = (await db.query(
        'select p.deck_id, p.page_no, p.width, p.height, d.title, d.project_id, d.created_by from pres_pages p join pres_decks d on d.id = p.deck_id where d.ready and p.deck_id = any($1::int[])', [ids]
      )).rows;
    }
    const mids = [...new Set(items.filter((x) => x && x.type === 'model3d').map((x) => Number(x.model)).filter(Boolean))];
    const mrows = mids.length ? (await db.query('select id, project_id, title from model3d where id = any($1::bigint[])', [mids])).rows : [];
    const full = items.map((x) => {
      if (x && x.type === 'model3d') {
        const m = mrows.find((y) => Number(y.id) === Number(x.model));
        const pid = m ? m.project_id : '';
        return { type: 'model3d', model: Number(x.model) || 0, pos: x.pos || 'end', title: m ? m.title : String(x.title || ''), project: pid, missing: !m, canEdit: isAdmin(req.user) || (!!pid && scopeOk(req.user, pid)) };
      }
      if (x && x.type === 'proj') {
        const pid = String(x.project || '');
        const rpid = resolveProjectId(pid) || pid;
        return { type: 'proj', project: pid, kind: String(x.kind || ''), pos: x.pos || 'end', title: String(x.title || ''), canEdit: isAdmin(req.user) || scopeOk(req.user, rpid) };
      }
      if (x && x.type === 'video') {
        const pid = String(x.project || '');
        const rpid = resolveProjectId(pid) || pid;
        return { type: 'video', project: pid, week: Number(x.week) || 0, pos: x.pos || 'end', title: String(x.title || ''), canEdit: isAdmin(req.user) || scopeOk(req.user, rpid) };
      }
      const m = meta.find((y) => y.deck_id === Number(x.deck) && y.page_no === Number(x.page));
      return m ? { deck: m.deck_id, page: m.page_no, pos: x.pos || 'end', width: m.width, height: m.height, title: m.title, project: m.project_id || '', canEdit: canManageDeckRow(req.user, { project_id: m.project_id, created_by: m.created_by }) } : null;
    }).filter(Boolean);
    const lay = hasPrimaryLayout ? get('layout:' + key, {}) : (useFb ? get('layout:' + fb, {}) : {});
    const layout = { order: Array.isArray(lay.order) ? lay.order : [], hidden: Array.isArray(lay.hidden) ? lay.hidden : [] };
    res.json({
      ok: true,
      data: {
        key,
        items: full,
        layout,
        settings: get('_settings', {}),
        canManage: canManageSet(req.user, key, fb),
        isAdmin: isAdmin(req.user),
        allowedProjects: canManageAny(req.user) ? allowedProjects(req.user) : [],
        pageProjectId: key.startsWith('weekly:') ? keyProjectId(key, fb) : '',
      },
    });
  } catch (err) { next(err); }
});

router.put('/api/pres/set', requireUser, onlyManager, async (req, res, next) => {
  try {
    const b = req.body || {};
    const key = String(b.key || '').toUpperCase().replace(/^EXECUTIVE$/, 'executive').replace(/^WEEKLY:/, 'weekly:');
    if (!KEY_RE.test(key) || key === '_settings') return bad(res, 'Kunci presentasi tidak valid.');
    if (!canManageSet(req.user, key, b.fallbackKey)) {
      return res.status(403).json({ ok: false, error: 'Anda tidak berhak mengatur susunan presentasi untuk proyek ini.' });
    }
    let items = (Array.isArray(b.items) ? b.items : []).slice(0, 200).map((x) => {
      if (x && x.type === 'model3d') {
        const model = Number(x.model);
        if (!Number.isInteger(model) || model < 1) return null;
        return { type: 'model3d', model, pos: String(x.pos || 'end').slice(0, 200), title: String(x.title || '').slice(0, 160) };
      }
      if (x && x.type === 'video') {
        const project = String(x.project || '').trim().slice(0, 60), week = Number(x.week);
        if (!/^[A-Za-z0-9_\- .]+$/.test(project) || !Number.isInteger(week) || week < 1 || week > 2000) return null;
        return { type: 'video', project, week, pos: String(x.pos || 'end').slice(0, 200), title: String(x.title || '').slice(0, 160) };
      }
      if (x && x.type === 'proj') {
        // Slide proyek: ringkasan minggu terakhir, keuangan cut-off, look ahead, prognosa (src/gas/pres-proj.js).
        const project = String(x.project || '').trim().slice(0, 60), kind = String(x.kind || '');
        if (!/^[A-Za-z0-9_\- .]+$/.test(project) || !PROJ_KINDS.includes(kind)) return null;
        return { type: 'proj', project, kind, pos: String(x.pos || 'end').slice(0, 200), title: String(x.title || '').slice(0, 160) };
      }
      return { deck: Number(x.deck), page: Number(x.page), pos: String(x.pos || 'end').slice(0, 200) };
    }).filter((x) => x && (x.type === 'video' || x.type === 'model3d' || x.type === 'proj' || (Number.isInteger(x.deck) && Number.isInteger(x.page))));

    const admin = isAdmin(req.user);
    const pagePid = key.startsWith('weekly:') ? keyProjectId(key, b.fallbackKey) : '';
    if (!admin) {
      const deckIds = [...new Set(items.filter((x) => x.deck).map((x) => x.deck))];
      const modelIds = [...new Set(items.filter((x) => x.type === 'model3d').map((x) => x.model))];
      const [dRes, mRes, exRes] = await Promise.all([
        deckIds.length ? db.query('select id, project_id, created_by from pres_decks where id = any($1::int[])', [deckIds]) : { rows: [] },
        modelIds.length ? db.query('select id, project_id from model3d where id = any($1::bigint[])', [modelIds]) : { rows: [] },
        db.query('select data from pres_sets where key = $1', [key]),
      ]);
      const dMap = new Map(dRes.rows.map((r) => [Number(r.id), r]));
      const mMap = new Map(mRes.rows.map((r) => [Number(r.id), r]));
      const existing = (exRes.rows[0] && Array.isArray(exRes.rows[0].data)) ? exRes.rows[0].data : [];
      const exSigs = new Set(existing.map(itemSig));
      const sameProj = (pid) => {
        if (!pagePid) return true;
        if (!pid) return false;
        if (String(pid) === String(pagePid)) return true;
        const g = groups.get(pid);
        return !!(g && String(g.parent || '') === String(pagePid));
      };
      const itemAllowed = (x) => {
        if (x.type === 'model3d') {
          const m = mMap.get(Number(x.model));
          return !!(m && scopeOk(req.user, m.project_id) && (!pagePid || sameProj(m.project_id)));
        }
        if (x.type === 'proj') {
          // Slide proyek: PIC/Input boleh memakai proyek mana pun dalam aksesnya (proyek & sub-proyek), juga di halaman Weekly proyek lain miliknya.
          return scopeOk(req.user, resolveProjectId(x.project) || x.project);
        }
        if (x.type === 'video') {
          const vp = resolveProjectId(x.project) || x.project;
          return scopeOk(req.user, vp) && (!pagePid || sameProj(vp));
        }
        const d = dMap.get(Number(x.deck));
        return !!(d && canManageDeckRow(req.user, d) && (!pagePid || !d.project_id || sameProj(d.project_id)));
      };
      for (const x of items) {
        if (!itemAllowed(x) && (pagePid || !exSigs.has(itemSig(x)))) {
          return res.status(403).json({ ok: false, error: 'Anda hanya dapat menambahkan PDF, video, model 3D, atau slide proyek milik proyek Anda sendiri (dan sub-proyeknya).' });
        }
      }
      if (!pagePid) {
        const sentSigs = new Set(items.map(itemSig));
        const exDeckIds = [...new Set(existing.filter((x) => x.deck).map((x) => Number(x.deck)).filter((id) => !dMap.has(id)))];
        const exModelIds = [...new Set(existing.filter((x) => x.type === 'model3d').map((x) => Number(x.model)).filter((id) => !mMap.has(id)))];
        if (exDeckIds.length) {
          (await db.query('select id, project_id, created_by from pres_decks where id = any($1::int[])', [exDeckIds])).rows.forEach((r) => dMap.set(Number(r.id), r));
        }
        if (exModelIds.length) {
          (await db.query('select id, project_id from model3d where id = any($1::bigint[])', [exModelIds])).rows.forEach((r) => mMap.set(Number(r.id), r));
        }
        existing.forEach((old) => {
          if (!sentSigs.has(itemSig(old)) && !itemAllowed(old)) {
            items.push(old);
          }
        });
      }
    }

    await db.query(
      `insert into pres_sets (key, data, updated_by, updated_at) values ($1, $2, $3, now())
       on conflict (key) do update set data = excluded.data, updated_by = excluded.updated_by, updated_at = now()`,
      [key, JSON.stringify(items), req.user.username]
    );
    if (b.layout && typeof b.layout === 'object' && (admin || key.startsWith('weekly:'))) {
      const clean = (a) => (Array.isArray(a) ? a : []).map((t) => String(t || '').slice(0, 200)).filter(Boolean).slice(0, 200);
      const lay = { order: clean(b.layout.order), hidden: clean(b.layout.hidden) };
      await db.query(
        `insert into pres_sets (key, data, updated_by, updated_at) values ($1, $2, $3, now())
         on conflict (key) do update set data = excluded.data, updated_by = excluded.updated_by, updated_at = now()`,
        ['layout:' + key, JSON.stringify(lay), req.user.username]
      );
    }
    if (admin && b.settings && typeof b.settings === 'object') {
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

module.exports = router;

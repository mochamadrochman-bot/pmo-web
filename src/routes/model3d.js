'use strict';

/**
 * Visual 3D per proyek.
 *
 * Tim mengunggah satu berkas .html mandiri (mis. model three.js) per model; unggahan ulang dengan
 * judul yang sama menggantikan versi lama (hanya versi terbaru yang disimpan).
 *
 * Keamanan: berkas unggahan berisi skrip buatan pihak lain, jadi selalu disajikan dengan
 *   Content-Security-Policy: sandbox allow-scripts …   (tanpa allow-same-origin)
 * sehingga dokumen berjalan di origin "kosong" (opaque): tidak bisa membaca cookie sesi, tidak bisa
 * memanggil API dashboard, tidak bisa mengubah halaman induk. Skrip hanya boleh dimuat dari
 * cdnjs / jsdelivr / unpkg dan font dari Google Fonts.
 *
 * Yang boleh mengunggah/menghapus: Admin, atau PIC untuk proyeknya sendiri (dan sub-proyeknya).
 * Kontraktor: melihat dan mengunggah hanya untuk proyeknya sendiri; mengganti/menghapus hanya model
 * yang ia unggah sendiri. Pengguna lain yang login boleh melihat semua model.
 */

const express = require('express');
const db = require('../db');
const access = require('../lib/access');
const groups = require('../lib/groups');
const arsip = require('../arsip/service');
const { requireUser, audit } = require('../middleware/auth');

const router = express.Router();
const MAX_BYTES = 15 * 1024 * 1024;

const VIEW_CSP = [
  'sandbox allow-scripts allow-popups allow-pointer-lock allow-downloads',
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval' blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com",
  "style-src 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com",
  "font-src data: https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com",
  "img-src data: blob: https:",
  "media-src data: blob: https:",
  "connect-src data: blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com",
  "worker-src blob:",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'self'",
].join('; ');

function isPic(u) { return !!u && u.role === 'input'; }
function isKtr(u) { return !!u && u.role === 'kontraktor'; }
function scopeOk(u, pid) {
  if (!pid) return false;
  if (access.inScope(u, pid)) return true;
  const g = groups.get(pid);
  return !!(g && g.parent && access.inScope(u, g.parent));
}
/** Tanpa pid: boleh membuka halaman. Dengan pid: boleh melihat model proyek itu. */
function canView(u, pid) {
  if (!u) return false;
  if (!isKtr(u)) return true;
  return pid === undefined ? true : scopeOk(u, pid);
}
function canUpload(u, pid) {
  if (!u || !pid) return false;
  if (u.role === 'admin') return true;
  if (!isPic(u) && !isKtr(u)) return false;
  return scopeOk(u, pid);
}
/** Ganti/ubah/hapus satu model: kontraktor hanya model unggahannya sendiri. */
function canEdit(u, row) {
  if (!row || !canUpload(u, row.project_id)) return false;
  return !isKtr(u) || String(row.uploaded_by || '') === String(u.username || '');
}
function projectList() {
  try { return arsip.projects(); } catch (e) { return []; }
}
const wrap = (fn) => async (req, res) => {
  try { res.json({ ok: true, data: await fn(req) }); } catch (e) { res.status(e.status || 200).json({ ok: false, error: e.message }); }
};
function fail(msg, status) { const e = new Error(msg); e.status = status; return e; }
function cleanTitle(v) { return String(v || '').replace(/\s+/g, ' ').trim().slice(0, 120); }

const ROW = 'id, project_id, title, note, file_name, size_bytes, uploaded_by, updated_at';
function pub(r, u) {
  return {
    id: Number(r.id), pid: r.project_id, title: r.title, note: r.note || '', fileName: r.file_name || '',
    size: r.size_bytes, by: r.uploaded_by || '', updatedAt: r.updated_at, canEdit: canEdit(u, r),
  };
}

// Daftar proyek + model. ?pid= untuk satu proyek saja (dipakai tombol "Lihat 3D" di halaman lain).
router.get('/api/model3d', requireUser, wrap(async (req) => {
  if (!canView(req.user)) throw fail('Halaman ini tidak tersedia untuk akun ini.', 403);
  const pid = String(req.query.pid || '').trim();
  const r = pid
    ? await db.query(`select ${ROW} from model3d where project_id = $1 order by lower(title)`, [pid])
    : await db.query(`select ${ROW} from model3d order by project_id, lower(title)`);
  const projects = projectList().filter((p) => canView(req.user, p.id))
    .map((p) => ({ id: p.id, name: p.name, canUpload: canUpload(req.user, p.id) }));
  const models = r.rows.filter((x) => canView(req.user, x.project_id));
  return { projects, models: models.map((x) => pub(x, req.user)), canUploadAny: projects.some((p) => p.canUpload), maxBytes: MAX_BYTES };
}));

// Unggah / ganti. Body JSON: { pid, title, note, fileName, html, replaceId? }
router.post('/api/model3d', requireUser, wrap(async (req) => {
  const b = req.body || {};
  const pid = String(b.pid || '').trim();
  if (!canUpload(req.user, pid)) throw fail('Hanya Admin, PIC, atau kontraktor proyek ini yang boleh mengunggah model 3D.', 403);
  const html = typeof b.html === 'string' ? b.html : '';
  const size = Buffer.byteLength(html, 'utf8');
  if (!size) throw fail('Berkas kosong.');
  if (size > MAX_BYTES) throw fail('Berkas terlalu besar (maks ' + Math.round(MAX_BYTES / 1048576) + ' MB).');
  if (!/<(html|!doctype|script|canvas|body)[\s>]/i.test(html.slice(0, 200000))) throw fail('Berkas bukan halaman HTML.');
  const title = cleanTitle(b.title) || cleanTitle(String(b.fileName || '').replace(/\.html?$/i, '').replace(/[_-]+/g, ' ')) || 'Model 3D';
  const note = String(b.note || '').trim().slice(0, 500);
  const fileName = String(b.fileName || '').slice(0, 200);
  const replaceId = Number(b.replaceId) || 0;
  let row;
  if (replaceId) {
    const cur = await db.query('select project_id, uploaded_by from model3d where id = $1', [replaceId]);
    if (!cur.rows[0]) throw fail('Model yang akan diganti tidak ditemukan.');
    if (!canEdit(req.user, cur.rows[0])) throw fail('Anda tidak berhak mengganti model ini.', 403);
    const clash = await db.query('select id from model3d where project_id = $1 and lower(title) = lower($2) and id <> $3', [pid, title, replaceId]);
    if (clash.rows[0]) throw fail('Sudah ada model lain berjudul "' + title + '" di proyek ini.');
    row = (await db.query(
      `update model3d set project_id = $2, title = $3, note = $4, file_name = $5, html = $6, size_bytes = $7, uploaded_by = $8, updated_at = now()
       where id = $1 returning ${ROW}`, [replaceId, pid, title, note, fileName, html, size, req.user.username])).rows[0];
  } else {
    if (isKtr(req.user)) {
      const same = (await db.query('select uploaded_by from model3d where project_id = $1 and lower(title) = lower($2)', [pid, title])).rows[0];
      if (same && same.uploaded_by !== req.user.username) throw fail('Sudah ada model berjudul "' + title + '" dari tim PMO. Pakai judul lain.');
    }
    row = (await db.query(
      `insert into model3d (project_id, title, note, file_name, html, size_bytes, uploaded_by) values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (project_id, lower(title)) do update set note = excluded.note, file_name = excluded.file_name, html = excluded.html,
         size_bytes = excluded.size_bytes, uploaded_by = excluded.uploaded_by, updated_at = now()
       returning ${ROW}`, [pid, title, note, fileName, html, size, req.user.username])).rows[0];
  }
  await audit(req.user, 'model3d_upload', 'project', pid, { id: row.id, title, size });
  return pub(row, req.user);
}));

// Ubah judul/catatan saja.
router.post('/api/model3d/:id/meta', requireUser, wrap(async (req) => {
  const id = Number(req.params.id) || 0;
  const cur = (await db.query('select project_id, uploaded_by from model3d where id = $1', [id])).rows[0];
  if (!cur) throw fail('Model tidak ditemukan.', 404);
  if (!canEdit(req.user, cur)) throw fail('Anda tidak berhak mengubah model ini.', 403);
  const title = cleanTitle(req.body && req.body.title);
  if (!title) throw fail('Judul wajib diisi.');
  const clash = await db.query('select id from model3d where project_id = $1 and lower(title) = lower($2) and id <> $3', [cur.project_id, title, id]);
  if (clash.rows[0]) throw fail('Sudah ada model lain berjudul "' + title + '" di proyek ini.');
  const note = String((req.body && req.body.note) || '').trim().slice(0, 500);
  const row = (await db.query(`update model3d set title = $2, note = $3, updated_at = now() where id = $1 returning ${ROW}`, [id, title, note])).rows[0];
  return pub(row, req.user);
}));

router.post('/api/model3d/:id/delete', requireUser, wrap(async (req) => {
  const id = Number(req.params.id) || 0;
  const cur = (await db.query('select project_id, title, uploaded_by from model3d where id = $1', [id])).rows[0];
  if (!cur) throw fail('Model tidak ditemukan.', 404);
  if (!canEdit(req.user, cur)) throw fail('Anda tidak berhak menghapus model ini.', 403);
  await db.query('delete from model3d where id = $1', [id]);
  await audit(req.user, 'model3d_delete', 'project', cur.project_id, { id, title: cur.title });
  return { id };
}));

// Tampilan model (dimuat di iframe sandbox). ?theme=dark|light&accent=blue|sage|mocha menyelaraskan tema.
const THEME_JS = (theme, accent) => '<script>(function(){' +
  'var d=document.documentElement,curT=' + JSON.stringify(theme || 'light') + ',curA=' + JSON.stringify(accent || 'blue') + ';' +
  'var PAL={blue:{dk:"#0B3A66",pri:"#0F5FA8",br:"#1E6FC0",soft:"#E8F3FB"},sage:{dk:"#0F2A1D",pri:"#375534",br:"#6B9071",soft:"#E3EED4"},mocha:{dk:"#3B2A1F",pri:"#6F4E37",br:"#B08968",soft:"#EDE3D4"},dark:{dk:"#0F172A",pri:"#2563EB",br:"#38BDF8",soft:"#1E293B"}};' +
  'function hex2rgb(h){h=h.slice(1);if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];var n=parseInt(h,16);return [(n>>16)&255,(n>>8)&255,n&255];}' +
  'function isGreen(r,g,b){return g>=r+10&&g>=b+4&&!(r>180&&b<90);}' +
  'function lum(r,g,b){return (0.2126*r+0.7152*g+0.0722*b)/255;}' +
  'function pickColor(r,g,b,a,pal){var L=lum(r,g,b);var c=(r>190&&g>205&&b>185)?pal.soft:(L<0.16?pal.dk:(L<0.34?pal.pri:pal.br));if(a==null)return c;var x=hex2rgb(c);return "rgba("+x[0]+","+x[1]+","+x[2]+","+a+")";}' +
  'function recolorCss(css,pal){return css.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b|rgba?\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)(?:\\s*,\\s*([\\d.]+))?\\s*\\)/g,function(m,hx,rr,gg,bb,aa){var rgb=hx?hex2rgb("#"+hx):[+rr,+gg,+bb];if(!isGreen(rgb[0],rgb[1],rgb[2]))return m;return pickColor(rgb[0],rgb[1],rgb[2],aa,pal);});}' +
  'function apply(){' +
    'd.setAttribute("data-theme",curT);d.setAttribute("data-accent",curA);' +
    'var key=curT==="dark"?"dark":(PAL[curA]?curA:"blue"),pal=PAL[key];' +
    'var st=document.getElementById("__pmoAccOv");if(!st){st=document.createElement("style");st.id="__pmoAccOv";(document.head||d).appendChild(st);}' +
    'st.textContent=":root{--accent:"+pal.pri+";--pri:"+pal.pri+"}input[type=checkbox],input[type=radio]{accent-color:"+pal.pri+"!important}";' +
    'var list=document.querySelectorAll("style:not(#__pmoAccOv)");' +
    'for(var i=0;i<list.length;i++){var el=list[i];if(el.__pmoOrig==null)el.__pmoOrig=el.textContent;el.textContent=key==="sage"?el.__pmoOrig:recolorCss(el.__pmoOrig,pal);}' +
    'var stEls=document.querySelectorAll("[style]");' +
    'for(var j=0;j<stEls.length;j++){var sEl=stEls[j];if(sEl.__pmoOrigSt==null)sEl.__pmoOrigSt=sEl.getAttribute("style")||"";var nw=key==="sage"?sEl.__pmoOrigSt:recolorCss(sEl.__pmoOrigSt,pal);if(nw!==sEl.getAttribute("style"))sEl.setAttribute("style",nw);}' +
  '}' +
  'apply();' +
  'document.addEventListener("DOMContentLoaded",apply);' +
  'addEventListener("message",function(e){' +
    'var msg=e&&e.data;if(!msg||typeof msg!=="object")return;' +
    'var ch=false;' +
    'if(msg.pmoTheme==="dark"||msg.pmoTheme==="light"){curT=msg.pmoTheme;ch=true;}' +
    'if(msg.pmoAccent&&PAL[msg.pmoAccent]){curA=msg.pmoAccent;ch=true;}' +
    'if(ch)apply();' +
  '});' +
'})();</script>';

router.get('/model3d/:id/view', requireUser, async (req, res) => {
  const r = await db.query('select project_id, html from model3d where id = $1', [Number(req.params.id) || 0]).catch(() => ({ rows: [] }));
  if (!r.rows[0]) return res.status(404).type('text').send('Model tidak ditemukan.');
  if (!canView(req.user, r.rows[0].project_id)) return res.status(403).type('text').send('Tidak tersedia untuk akun ini.');
  const theme = ['dark', 'light'].includes(String(req.query.theme)) ? String(req.query.theme) : 'light';
  const accent = ['blue', 'sage', 'mocha'].includes(String(req.query.accent)) ? String(req.query.accent) : 'blue';
  let html = r.rows[0].html;
  const inj = THEME_JS(theme, accent);
  html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + inj) : inj + html;
  res.removeHeader('Content-Security-Policy-Report-Only');
  res.set({
    'Content-Security-Policy': VIEW_CSP,
    'Cache-Control': 'private, no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  res.type('html').send(html);
});

// Unduh berkas asli (cadangan / dibuka di luar dashboard). Hanya yang boleh mengunggah.
router.get('/model3d/:id/file', requireUser, async (req, res) => {
  const r = await db.query('select project_id, title, file_name, html, uploaded_by from model3d where id = $1', [Number(req.params.id) || 0]).catch(() => ({ rows: [] }));
  const m = r.rows[0];
  if (!m) return res.status(404).type('text').send('Model tidak ditemukan.');
  if (!canEdit(req.user, m)) return res.status(403).type('text').send('Hanya Admin atau PIC proyek ini yang boleh mengunduh berkas asli.');
  const name = (m.file_name || (m.title + '.html')).replace(/[^\w.\- ]+/g, '_');
  res.set({ 'Content-Disposition': 'attachment; filename="' + name + '"', 'Content-Security-Policy': "sandbox; default-src 'none'" });
  res.type('application/octet-stream').send(m.html);
});

module.exports = router;
module.exports.canUpload = canUpload;

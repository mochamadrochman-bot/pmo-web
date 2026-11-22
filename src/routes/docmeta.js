'use strict';

/**
 * Document Control · isian MoM / surat masuk / surat keluar + tindak lanjut MoM (22 Nov 2026).
 *
 *   GET  /api/doc-meta?project=PID        isian tambahan per dokumen + butir tindak lanjut proyek
 *                                          (kontraktor: hanya MoM proyeknya)
 *   POST /api/doc-meta                    {project, docId, kat, data, actions?:[{id?,uraian,pic,pihak,due,status,catatan,bukti}]}
 *                                          Admin / Input sesuai lingkup. actions dikirim → daftar butir dokumen itu diganti.
 *   POST /api/doc-actions/:id             {status, catatan, bukti} · Admin / Input sesuai lingkup, atau kontraktor
 *                                          proyeknya untuk butir dengan pihak KONTRAKTOR.
 */

const express = require('express');
const db = require('../db');
const access = require('../lib/access');
const groups = require('../lib/groups');
const { requireUser } = require('../middleware/auth');

const router = express.Router();
const KATS = ['MOM', 'SURAT_MASUK', 'SURAT_KELUAR'];
const PIHAK = ['PKG', 'KONTRAKTOR', 'LAIN'];
const STATUS = ['TERBUKA', 'PROSES', 'SELESAI'];
const FIELDS = ['kepada', 'dari', 'ttd', 'ttdJabatan', 'tembusan', 'diterima', 'tempat', 'waktu', 'pimpinan', 'peserta', 'notulis', 'auto'];

const fail = (res, code, msg) => res.status(code).json({ ok: false, error: msg });
const pidOk = (pid) => /^[A-Za-z0-9_\- .]{1,60}$/.test(pid);
const docOk = (id) => /^D[0-9A-Z]{6,12}$/.test(id);
const ymd = (d) => (d ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') : '');

function canEdit(u, pid) {
  if (!u || !pid) return false;
  if (u.role === 'admin') return true;
  if (u.role !== 'input') return false;
  if (access.inScope(u, pid)) return true;
  const g = groups.get(pid);
  return !!(g && g.parent && access.inScope(u, g.parent));
}
const isKtr = (u) => !!u && u.role === 'kontraktor';
const canView = (u, pid) => !!u && (isKtr(u) ? access.inScope(u, pid) : true);

function cleanData(d) {
  const o = {};
  FIELDS.forEach((k) => {
    if (d && d[k] !== undefined && d[k] !== null) {
      if (k === 'auto') { if (Array.isArray(d[k])) o.auto = d[k].filter((x) => FIELDS.includes(x)).slice(0, 20); return; }
      const s = String(d[k]).trim().slice(0, k === 'tembusan' || k === 'peserta' || k === 'ttd' ? 600 : 300);
      if (s) o[k] = s;
    }
  });
  if (o.diterima && !/^\d{4}-\d{2}-\d{2}$/.test(o.diterima)) delete o.diterima;
  return o;
}
const linkOk = (s) => !s || /^https:\/\/\S+$/i.test(s);
function cleanAction(a, i) {
  const uraian = String((a && a.uraian) || '').trim().slice(0, 600);
  if (!uraian) return null;
  const due = /^\d{4}-\d{2}-\d{2}$/.test(String(a.due || '')) ? a.due : null;
  const bukti = String(a.bukti || '').trim().slice(0, 500);
  if (!linkOk(bukti)) throw new Error('Link bukti harus diawali https://');
  return {
    id: /^\d+$/.test(String(a.id || '')) ? Number(a.id) : null, no: i + 1, uraian,
    pic: String(a.pic || '').trim().slice(0, 160),
    pihak: PIHAK.includes(String(a.pihak || '').toUpperCase()) ? String(a.pihak).toUpperCase() : 'PKG',
    due, status: STATUS.includes(String(a.status || '').toUpperCase()) ? String(a.status).toUpperCase() : 'TERBUKA',
    catatan: String(a.catatan || '').trim().slice(0, 600), bukti,
  };
}
const actOut = (r) => ({ id: Number(r.id), docId: r.doc_id, no: r.no, uraian: r.uraian, pic: r.pic, pihak: r.pihak, due: r.due ? ymd(new Date(r.due)) : '',
  status: r.status, catatan: r.catatan, bukti: r.bukti, by: r.updated_by || r.created_by || '', at: r.updated_at });

router.get('/api/doc-meta', requireUser, async (req, res, next) => {
  try {
    const pid = String(req.query.project || '').trim();
    if (!pidOk(pid)) return fail(res, 400, 'Kode proyek tidak valid.');
    if (!canView(req.user, pid)) return fail(res, 403, 'Tidak tersedia untuk akun ini.');
    const ktr = isKtr(req.user);
    const m = await db.query('select doc_id, kat, data, updated_by, updated_at from doc_meta where project_id = $1' + (ktr ? " and kat = 'MOM'" : ''), [pid]);
    const a = await db.query("select a.* from doc_actions a" + (ktr ? " join doc_meta m on m.doc_id = a.doc_id and m.kat = 'MOM'" : '') + ' where a.project_id = $1 order by a.doc_id, a.no, a.id', [pid]);
    const meta = {};
    m.rows.forEach((r) => { meta[r.doc_id] = Object.assign({ kat: r.kat }, r.data || {}, { by: r.updated_by || '', at: r.updated_at }); });
    res.json({ ok: true, data: { meta, actions: a.rows.map(actOut), canManage: canEdit(req.user, pid), ktr } });
  } catch (err) { next(err); }
});

router.post('/api/doc-meta', requireUser, async (req, res, next) => {
  const b = req.body || {};
  const pid = String(b.project || '').trim(), docId = String(b.docId || '').trim(), kat = String(b.kat || '').toUpperCase();
  if (!pidOk(pid) || !docOk(docId)) return fail(res, 400, 'Data dokumen tidak valid.');
  if (!KATS.includes(kat)) return fail(res, 400, 'Kategori tidak memiliki isian tambahan.');
  if (!canEdit(req.user, pid)) return fail(res, 403, 'Anda tidak berhak mengubah dokumen proyek ini.');
  let acts = null;
  try { if (Array.isArray(b.actions) && kat === 'MOM') acts = b.actions.slice(0, 100).map(cleanAction).filter(Boolean).map((x, i) => Object.assign(x, { no: i + 1 })); }
  catch (e) { return fail(res, 400, e.message); }
  const by = req.user.username;
  const client = await db.pool.connect();
  try {
    await client.query('begin');
    const own = await client.query('select project_id from doc_meta where doc_id = $1', [docId]);
    if (own.rows[0] && own.rows[0].project_id !== pid) { await client.query('rollback'); return fail(res, 409, 'Dokumen milik proyek lain.'); }
    await client.query(
      `insert into doc_meta (doc_id, project_id, kat, data, updated_by, updated_at) values ($1,$2,$3,$4,$5,now())
       on conflict (doc_id) do update set kat=excluded.kat, data=excluded.data, updated_by=excluded.updated_by, updated_at=now()`,
      [docId, pid, kat, JSON.stringify(cleanData(b.data || {})), by]);
    if (acts) {
      const keep = acts.filter((x) => x.id).map((x) => x.id);
      await client.query('delete from doc_actions where doc_id = $1 and project_id = $2' + (keep.length ? ' and not (id = any($3::bigint[]))' : ''), keep.length ? [docId, pid, keep] : [docId, pid]);
      for (const x of acts) {
        if (x.id) {
          await client.query(`update doc_actions set no=$3, uraian=$4, pic=$5, pihak=$6, due=$7, status=$8, catatan=$9, bukti=$10, updated_by=$11, updated_at=now()
            where id=$1 and doc_id=$2`, [x.id, docId, x.no, x.uraian, x.pic, x.pihak, x.due, x.status, x.catatan, x.bukti, by]);
        } else {
          await client.query(`insert into doc_actions (doc_id, project_id, no, uraian, pic, pihak, due, status, catatan, bukti, created_by, updated_by)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)`, [docId, pid, x.no, x.uraian, x.pic, x.pihak, x.due, x.status, x.catatan, x.bukti, by]);
        }
      }
    }
    await client.query('commit');
  } catch (err) { await client.query('rollback').catch(() => {}); return next(err); } finally { client.release(); }
  res.json({ ok: true });
});

router.post('/api/doc-actions/:id', requireUser, async (req, res, next) => {
  try {
    const id = String(req.params.id || '');
    if (!/^\d+$/.test(id)) return fail(res, 400, 'Butir tidak valid.');
    const r = await db.query('select a.*, m.kat from doc_actions a left join doc_meta m on m.doc_id = a.doc_id where a.id = $1', [id]);
    const a = r.rows[0];
    if (!a) return fail(res, 404, 'Butir tindak lanjut tidak ditemukan.');
    const u = req.user;
    const ok = canEdit(u, a.project_id) || (isKtr(u) && access.inScope(u, a.project_id) && a.pihak === 'KONTRAKTOR' && a.kat === 'MOM');
    if (!ok) return fail(res, 403, 'Anda tidak berhak mengubah butir ini.');
    const b = req.body || {};
    const status = STATUS.includes(String(b.status || '').toUpperCase()) ? String(b.status).toUpperCase() : a.status;
    const catatan = b.catatan === undefined ? a.catatan : String(b.catatan || '').trim().slice(0, 600);
    const bukti = b.bukti === undefined ? a.bukti : String(b.bukti || '').trim().slice(0, 500);
    if (!linkOk(bukti)) return fail(res, 400, 'Link bukti harus diawali https://');
    const w = await db.query('update doc_actions set status=$2, catatan=$3, bukti=$4, updated_by=$5, updated_at=now() where id=$1 returning *', [id, status, catatan, bukti, u.username]);
    res.json({ ok: true, data: actOut(w.rows[0]) });
  } catch (err) { next(err); }
});

module.exports = router;

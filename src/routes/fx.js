'use strict';

/**
 * Kurs bulanan & komponen mata uang nilai kontrak (lihat src/lib/fx.js, src/gas/contract-fx.js).
 *   GET  /api/fx/rates               kurs terbaru + 24 bulan terakhir
 *   POST /api/fx/refresh             (Admin) ambil ulang kurs sekarang
 *   GET  /api/contract-fx?project=   komponen kontrak proyek + kurs terbaru
 *   POST /api/contract-fx            simpan komponen {project, kind:'BASE'|'ADD', idr, usd, cny, cnh, note}
 */

const express = require('express');
const access = require('../lib/access');
const groups = require('../lib/groups');
const fx = require('../lib/fx');
const { requireUser } = require('../middleware/auth');

const router = express.Router();

function bumpData() {
  try {
    const s = require('../gas/runtime').createScope({ user: null, appUrl: '' });
    if (s.exported && typeof s.exported.dataChanged_ === 'function') s.exported.dataChanged_();
  } catch (e) { console.warn(JSON.stringify({ ev: 'fx_bump_fail', message: String(e.message || e) })); }
}
function canEdit(u, pid) {
  if (!u || !pid) return false;
  if (u.role === 'admin') return true;
  if (u.role !== 'input') return false;
  if (access.inScope(u, pid)) return true;
  const g = groups.get(pid);
  return !!(g && g.parent && access.inScope(u, g.parent));
}
const fail = (res, code, msg) => res.status(code).json({ ok: false, error: msg });

router.get('/api/fx/rates', requireUser, (req, res) => {
  const snap = fx.snapshot();
  const months = Object.keys(snap.rates).sort().reverse().slice(0, 24).map((k) => Object.assign({ month: k }, snap.rates[k]));
  res.json({ ok: true, data: { current: fx.rateFor(''), months } });
});

router.post('/api/fx/refresh', requireUser, async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') return fail(res, 403, 'Hanya Admin yang dapat memperbarui kurs.');
    const now = new Date();
    const mo = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const r = await fx.refreshMonth(mo);
    bumpData();
    res.json({ ok: true, data: Object.assign({ month: mo }, r) });
  } catch (err) { if (/gagal/.test(String(err.message))) return fail(res, 502, err.message); next(err); }
});

router.get('/api/contract-fx', requireUser, (req, res) => {
  if (req.user && req.user.role === 'kontraktor') return fail(res, 403, 'Tidak tersedia untuk akun ini.');
  const pid = String(req.query.project || '').trim();
  const c = pid ? fx.snapshot().contracts[pid] || null : null;
  res.json({ ok: true, data: { contract: c, rate: fx.rateFor(''), canEdit: canEdit(req.user, pid) || (req.user && req.user.role === 'admin') } });
});

router.post('/api/contract-fx', requireUser, async (req, res, next) => {
  try {
    const b = req.body || {};
    const pid = String(b.project || '').trim().slice(0, 60);
    if (!/^[A-Za-z0-9_\- .]+$/.test(pid)) return fail(res, 400, 'Kode proyek tidak valid.');
    if (!canEdit(req.user, pid)) return fail(res, 403, 'Anda tidak berhak mengubah nilai kontrak proyek ini.');
    const vals = { idr: b.idr, usd: b.usd, cny: b.cny, cnh: b.cnh };
    if (Object.values(vals).some((v) => v !== undefined && v !== null && v !== '' && !(Number(v) >= 0))) return fail(res, 400, 'Nilai kontrak per mata uang harus angka positif.');
    const c = await fx.saveContract(pid, b.kind, vals, req.user.username, b.note);
    bumpData();
    res.json({ ok: true, data: { contract: c, rate: fx.rateFor(''), idr: fx.toIdr(pid, '') } });
  } catch (err) { next(err); }
});

module.exports = { router, bumpData };

'use strict';

/**
 * Sena v2 (24 Nov 2026) — pertanyaan diproses asinkron supaya server tidak terhenti selama Sena berpikir.
 *
 *   POST /api/sena/ask        { token, req }  → { jobId }  (hanya akun yang boleh memakai Sena)
 *   GET  /api/sena/job/:id    → { status: 'run'|'done'|'error', step, result?, error? }
 *   GET  /api/sena/status     → pemakaian hari ini, anggaran bulan ini, status indeks dokumen
 *   POST /api/sena/index      (admin) jalankan satu putaran indeks dokumen sekarang
 */

const express = require('express');
const runtime = require('../gas/runtime');
const sena = require('../lib/sena');
const doctext = require('../lib/doctext');
const { requireUser } = require('../middleware/auth');
const { legacyUser } = require('./gas');

const router = express.Router();
const fail = (res, code, msg) => res.status(code).json({ ok: false, error: msg });
const allowed = (u) => !!u && (u.role === 'admin' || !!u.sena_access);

router.post('/api/sena/ask', requireUser, (req, res) => {
  if (!allowed(req.user)) return fail(res, 403, 'Sena hanya untuk akun ADMIN atau akun dengan izin Akses Sena.');
  const b = req.body || {};
  const r = b.req && typeof b.req === 'object' ? b.req : {};
  const q = String(r.question || '').trim();
  if (!q) return fail(res, 400, 'Pertanyaan kosong.');
  const why = sena.canAsk(req.user);
  if (why) return fail(res, 429, why);
  const clean = {
    page: String(r.page || '').slice(0, 40), projectId: String(r.projectId || r.project || '').slice(0, 80), project: String(r.project || '').slice(0, 80),
    field: String(r.field || '').slice(0, 20), period: String(r.period || '').slice(0, 20), week: r.week, avatar: r.avatar === 'm' ? 'm' : 'f',
    question: q.slice(0, 1500), history: Array.isArray(r.history) ? r.history.slice(-4) : [], draft: r.draft ? String(r.draft).slice(0, 20) : undefined,
    mode: r.mode === 'rapat' ? 'rapat' : '',
  };
  const job = sena.newJob(req.user.username);
  const user = legacyUser(req.user);
  const scope = runtime.createScope({ user, appUrl: (req.protocol || 'https') + '://' + req.get('host'), onLogout: () => {} });
  res.json({ ok: true, data: { jobId: job.id, mode: sena.pickMode(clean, clean.question) } });
  sena.run(job, scope, user, req.user, String(b.token || ''), clean)
    .then((out) => { job.result = out; job.status = 'done'; })
    .catch((e) => { job.error = String((e && e.message) || e); job.status = 'error'; console.error(JSON.stringify({ ev: 'sena_fail', user: req.user.username, message: job.error })); });
});

router.get('/api/sena/job/:id', requireUser, (req, res) => {
  const j = sena.getJob(req.params.id, req.user.username);
  if (!j) return fail(res, 404, 'Pertanyaan tidak ditemukan atau sudah kedaluwarsa.');
  res.json({ ok: true, data: { status: j.status, step: j.step, result: j.status === 'done' ? j.result : undefined, error: j.error || undefined } });
});

router.get('/api/sena/status', requireUser, (req, res) => {
  if (!allowed(req.user)) return fail(res, 403, 'Tidak tersedia untuk akun ini.');
  res.json({ ok: true, data: Object.assign(sena.usage(req.user.username), req.user.role === 'admin' ? { index: doctext.status() } : {}) });
});

router.post('/api/sena/index', requireUser, async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') return fail(res, 403, 'Hanya Admin.');
    const r = await doctext.runOnce(Math.min(10, Math.max(1, Number((req.body || {}).limit) || 3)));
    res.json({ ok: true, data: Object.assign({ run: r }, { index: doctext.status() }) });
  } catch (err) { next(err); }
});

module.exports = router;

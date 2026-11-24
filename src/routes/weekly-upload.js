'use strict';

/**
 * Input Progress Mingguan · unggah video/materi langsung ke Drive akun tim proyek (25 Nov 2026).
 *
 *   GET  /api/weekly-upload/status?projectId=  → { ready, email, folder, free, reason }
 *   POST /api/weekly-upload/session { projectId, week, kind: VIDEO|MATERI, name, size, type } → { uploadUrl, name, chunk }
 *   POST /api/weekly-upload/done    { projectId, week, kind, fileId } → { url, name, size }
 * Boleh: ADMIN, PIC/INPUT proyeknya, KONTRAKTOR proyeknya. Isi file tidak lewat server ini.
 */

const express = require('express');
const wu = require('../lib/weekly-upload');
const { requireUser, audit } = require('../middleware/auth');
const { legacyUser } = require('./gas');

const router = express.Router();

function origin(req) {
  const base = process.env.APP_BASE_URL || (req.protocol + '://' + req.get('host'));
  return new URL(base).origin;
}
const wrap = (fn) => async (req, res) => {
  try { res.json({ ok: true, data: await fn(req) }); } catch (e) { res.status(e.status && e.status < 500 ? e.status : 200).json({ ok: false, error: e.message }); }
};

router.get('/api/weekly-upload/status', requireUser, wrap(async (req) => {
  const pid = String(req.query.projectId || '').trim().toUpperCase();
  if (!wu.canUpload(legacyUser(req.user), pid)) return { ready: false, reason: 'Akun Anda tidak boleh mengunggah untuk proyek ini.' };
  return wu.status(pid);
}));

router.post('/api/weekly-upload/session', requireUser, wrap((req) => wu.session(legacyUser(req.user), req.body || {}, origin(req))));

router.post('/api/weekly-upload/done', requireUser, wrap(async (req) => {
  const b = req.body || {};
  const r = await wu.done(legacyUser(req.user), b);
  await audit(req.user, 'weekly_upload', 'project', String(b.projectId || '').toUpperCase(), { week: b.week, kind: b.kind, name: r.name, size: r.size }).catch(() => {});
  return r;
}));

module.exports = router;

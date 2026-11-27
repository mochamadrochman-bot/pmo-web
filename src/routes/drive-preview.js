'use strict';

/**
 * Proxy pratinjau file Google Drive / Docs / Slides / Sheets sebagai PDF atau gambar
 * langsung dari origin server, menghindari error cookie pihak ketiga di iframe.
 */

const express = require('express');
const gauth = require('../google/auth');
const { requireUser } = require('../middleware/auth');

const router = express.Router();
const DRIVE_API = process.env.GOOGLE_DRIVE_API || 'https://www.googleapis.com/drive/v3';
const ID_RE = /^[A-Za-z0-9_-]{10,120}$/;

const EXPORT_PDF_MIMES = new Set([
  'application/vnd.google-apps.presentation',
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.drawing',
]);

async function fetchTimed(url, headers, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { headers, signal: ctl.signal }); }
  finally { clearTimeout(t); }
}

async function resolveDriveTarget(id) {
  const token = await gauth.accessToken();
  const metaRes = await fetchTimed(
    `${DRIVE_API}/files/${encodeURIComponent(id)}?fields=id,name,mimeType,size&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
    15000
  );
  if (!metaRes.ok) {
    return { ok: false, status: metaRes.status };
  }
  const meta = await metaRes.json().catch(() => ({}));
  const mime = String(meta.mimeType || '');

  if (EXPORT_PDF_MIMES.has(mime)) {
    return {
      ok: true,
      token,
      kind: 'pdf',
      contentType: 'application/pdf',
      name: meta.name || 'preview.pdf',
      url: `${DRIVE_API}/files/${encodeURIComponent(id)}/export?mimeType=application/pdf`,
    };
  }
  if (mime === 'application/pdf') {
    return {
      ok: true,
      token,
      kind: 'pdf',
      contentType: 'application/pdf',
      name: meta.name || 'preview.pdf',
      url: `${DRIVE_API}/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`,
    };
  }
  if (mime.startsWith('image/')) {
    return {
      ok: true,
      token,
      kind: 'image',
      contentType: mime,
      name: meta.name || 'preview',
      url: `${DRIVE_API}/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`,
    };
  }
  return { ok: false, status: 415, unsupported: true };
}

router.get('/api/drive/preview-pdf/:id', requireUser, async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!ID_RE.test(id)) {
    return res.status(400).json({ ok: false, error: 'ID file Drive tidak valid.' });
  }
  try {
    const target = await resolveDriveTarget(id);
    if (!target.ok) {
      return res.status(target.status || 404).json({ ok: false, unsupported: !!target.unsupported });
    }
    if (req.query.check === '1') {
      return res.json({ ok: true, kind: target.kind, name: target.name });
    }

    const upstream = await fetchTimed(target.url, {
      headers: { Authorization: `Bearer ${target.token}` },
    }, 30000);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ ok: false, error: 'Gagal mengambil pratinjau dari Google Drive.' });
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.set({
      'Content-Type': target.contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=300',
    });
    return res.send(buf);
  } catch (err) {
    return res.status(404).json({ ok: false, error: String((err && err.message) || err) });
  }
});

module.exports = router;

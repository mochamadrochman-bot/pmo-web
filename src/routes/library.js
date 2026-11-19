'use strict';

/**
 * Endpoint async untuk OCR & perapian daftar bab/pasal Library & Knowledge (Opsi 3 Hybrid).
 * - Halaman PDF berteks digital tetap diekstrak di browser (biaya Rp0).
 * - Hanya halaman hasil scan/gambar yang dikirim sebagai gambar JPEG/WebP ke Claude Vision.
 * - Berjalan async di Express agar tidak memblokir event loop maupun rute /app/rpc/*.
 */

const express = require('express');
const store = require('../gas/store');
const { requireUser, forbidden, audit } = require('../middleware/auth');

const router = express.Router();

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_DAILY_PAGE_LIMIT = 200;
const MAX_IMAGE_B64_CHARS = 3 * 1024 * 1024;
const ALLOWED_MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Counter harian per user di memori (terpisah dari AI_DAILY_LIMIT Tanya Sena).
const ocrUsageByDay = new Map();

function getProp(k) {
  if (store.state && store.state.props && store.state.props.has('S:' + k)) {
    const v = String(store.state.props.get('S:' + k) || '').trim();
    if (v) return v;
  }
  if (process.env['GAS_PROP_' + k] !== undefined) {
    const v = String(process.env['GAS_PROP_' + k] || '').trim();
    if (v) return v;
  }
  if (process.env[k] !== undefined) {
    const v = String(process.env[k] || '').trim();
    if (v) return v;
  }
  return '';
}

function todayKey() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function dailyLimit() {
  const n = Number(getProp('LIBRARY_OCR_DAILY_LIMIT'));
  return Number.isFinite(n) && n > 0 ? Math.min(2000, Math.round(n)) : DEFAULT_DAILY_PAGE_LIMIT;
}

function getUsedToday(username) {
  const day = todayKey();
  if (ocrUsageByDay.size > 500) {
    for (const k of ocrUsageByDay.keys()) {
      if (!k.startsWith(day + ':')) ocrUsageByDay.delete(k);
    }
  }
  return ocrUsageByDay.get(day + ':' + username) || 0;
}

function bumpUsed(username, delta) {
  const key = todayKey() + ':' + username;
  const next = getUsedToday(username) + delta;
  ocrUsageByDay.set(key, next);
  return next;
}

function candidateModels() {
  const explicit = getProp('LIBRARY_OCR_MODEL');
  const shared = getProp('CLAUDE_MODEL');
  const list = [
    explicit,
    'claude-haiku-5-5',
    'claude-haiku-4-5-20251001',
    shared,
    'claude-sonnet-5-5',
  ].filter(Boolean);
  return [...new Set(list)];
}

async function callClaude(apiKey, payloadBuilder) {
  const models = candidateModels();
  let lastErr = null;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 45000);
    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        signal: ac.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(payloadBuilder(model)),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        return { model, json };
      }
      const msg = (json && json.error && json.error.message) || ('HTTP ' + res.status);
      // Jika nama model tidak tersedia (404/not_found), coba kandidat model berikutnya.
      if (res.status === 404 || /not_found|model/i.test(msg)) {
        lastErr = new Error(msg);
        continue;
      }
      if (res.status === 401) throw new Error('Kunci ANTHROPIC_API_KEY ditolak (401).');
      if (res.status === 429) throw new Error('Claude API sedang sibuk / rate limit tercapai (429). Coba lagi sebentar.');
      if (res.status === 400 && /credit|balance/i.test(msg)) throw new Error('Saldo Claude API habis.');
      throw new Error('Claude API error: ' + msg);
    } catch (err) {
      if (err && err.name === 'AbortError') {
        lastErr = new Error('Permintaan OCR ke Claude API melebihi batas waktu (45 detik).');
      } else {
        lastErr = err;
        if (!/not_found|model/i.test(String(err.message || ''))) throw err;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr || new Error('Tidak ada model Claude yang merespons.');
}

function extractText(respJson) {
  const content = (respJson && Array.isArray(respJson.content)) ? respJson.content : [];
  return content.filter((b) => b && b.type === 'text' && b.text).map((b) => b.text).join('\n').trim();
}

function parseJsonObject(raw) {
  const cleaned = String(raw || '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return JSON.parse(cleaned.slice(start, end + 1));
  }
  return JSON.parse(cleaned);
}

router.get('/api/library/ocr-status', requireUser, (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';
  if (!isAdmin) return res.json({ ok: true, enabled: false });
  const key = getProp('ANTHROPIC_API_KEY');
  const limit = dailyLimit();
  const used = getUsedToday(req.user.username);
  return res.json({
    ok: true,
    enabled: true,
    configured: !!key,
    model: candidateModels()[0] || 'claude-haiku-5-5',
    dailyLimit: limit,
    usedToday: used,
    remaining: Math.max(0, limit - used),
  });
});

router.post('/api/library/ocr-page', requireUser, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return forbidden(req, res, 'Hanya Admin yang dapat menjalankan OCR AI.');
  const apiKey = getProp('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return res.status(400).json({ ok: false, error: 'ANTHROPIC_API_KEY belum diisi di environment / Script Properties.' });
  }

  const limit = dailyLimit();
  const used = getUsedToday(req.user.username);
  if (used >= limit) {
    return res.status(429).json({ ok: false, error: `Batas OCR harian (${limit} halaman/hari) sudah tercapai.` });
  }

  const body = req.body || {};
  const page = Math.max(1, Math.min(3000, Math.round(Number(body.page) || 1)));
  const totalPages = Math.max(page, Math.min(3000, Math.round(Number(body.totalPages) || page)));
  const docTitle = String(body.docTitle || '').trim().slice(0, 200);
  const mediaType = ALLOWED_MEDIA.has(String(body.mediaType || '')) ? String(body.mediaType) : 'image/jpeg';
  const rawB64 = String(body.imageBase64 || '').replace(/^data:image\/[a-z0-9+.-]+;base64,/i, '').trim();

  if (!rawB64 || rawB64.length < 100) {
    return res.status(400).json({ ok: false, error: 'Gambar halaman kosong.' });
  }
  if (rawB64.length > MAX_IMAGE_B64_CHARS) {
    return res.status(413).json({ ok: false, error: 'Ukuran gambar halaman terlalu besar untuk OCR.' });
  }

  const prompt = [
    'Anda adalah mesin OCR presisi untuk dokumen SOP, pedoman, regulasi, dan diagram teknis PT Petrokimia Gresik (Bahasa Indonesia & Inggris).',
    docTitle ? `Dokumen: "${docTitle}" (Halaman ${page} dari ${totalPages}).` : `Halaman ${page} dari ${totalPages}.`,
    'Transkripsikan seluruh isi teks yang terbaca pada gambar halaman ini secara akurat dan urut.',
    'Aturan ketat:',
    '- Abaikan header/footer berulang (nomor dokumen di pojok, "Hal X dari Y", watermark latar belakang), kecuali judul dokumen di halaman sampul.',
    '- Jika halaman berisi tabel atau flowchart/diagram alur, tuliskan isi kotak/barisnya secara terstruktur agar mudah dicari.',
    '- Jangan mengarang atau menafsirkan kata yang tidak tertulis.',
    '- Kembalikan HANYA JSON valid dengan struktur:',
    '{"text":"<teks transkripsi lengkap dipisah \\n>","isTocPage":false,"headings":[{"t":"<judul bab/pasal>","l":1}]}',
    '- Set isTocPage=true hanya jika halaman ini adalah halaman DAFTAR ISI / DAFTAR TABEL / DAFTAR LAMPIRAN.',
    '- Pada array headings, masukkan HANYA judul bab/pasal/lampiran utama (l=1 untuk BAB/Lampiran/Romawi utama, l=2 untuk Sub-bab/Pasal, l=3 untuk sub-pasal). JANGAN masukkan item poin paragraf biasa atau baris daftar isi.',
  ].join('\n');

  try {
    const { model, json } = await callClaude(apiKey, (m) => ({
      model: m,
      max_tokens: 2400,
      temperature: 0,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: rawB64 } },
          { type: 'text', text: prompt },
        ],
      }],
    }));

    const rawText = extractText(json);
    let parsed = null;
    try {
      parsed = parseJsonObject(rawText);
    } catch (e) {
      parsed = { text: rawText, isTocPage: false, headings: [] };
    }

    const cleanText = String(parsed.text || '').replace(/\r\n/g, '\n').trim().slice(0, 60000);
    const isTocPage = !!parsed.isTocPage;
    const headings = Array.isArray(parsed.headings)
      ? parsed.headings
        .map((h) => ({
          t: String((h && h.t) || '').replace(/\s+/g, ' ').trim().slice(0, 160),
          p: page,
          l: Math.max(1, Math.min(3, Math.round(Number(h && h.l) || 1))),
        }))
        .filter((h) => h.t && h.t.length >= 2)
        .slice(0, 20)
      : [];

    const usedNow = bumpUsed(req.user.username, 1);
    const usage = json && json.usage ? {
      input: json.usage.input_tokens || 0,
      output: json.usage.output_tokens || 0,
    } : null;

    if (page === 1 || page % 10 === 0 || page === totalPages) {
      await audit(req.user, 'library_ocr_page', 'library', docTitle || 'pdf', { page, totalPages, model, chars: cleanText.length }).catch(() => {});
    }

    return res.json({
      ok: true,
      page,
      text: cleanText,
      isTocPage,
      headings,
      model,
      usage,
      usedToday: usedNow,
      dailyLimit: limit,
    });
  } catch (err) {
    return res.status(502).json({ ok: false, error: String((err && err.message) || err) });
  }
});

router.post('/api/library/toc-ai', requireUser, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return forbidden(req, res, 'Hanya Admin yang dapat merapikan daftar isi dengan AI.');
  const apiKey = getProp('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return res.status(400).json({ ok: false, error: 'ANTHROPIC_API_KEY belum diisi.' });
  }

  const limit = dailyLimit();
  if (getUsedToday(req.user.username) >= limit) {
    return res.status(429).json({ ok: false, error: `Batas OCR/AI Library harian (${limit}/hari) sudah tercapai.` });
  }

  const body = req.body || {};
  const title = String(body.title || '').trim().slice(0, 200);
  const candidates = Array.isArray(body.candidates) ? body.candidates.slice(0, 350) : [];
  if (!candidates.length) {
    return res.status(400).json({ ok: false, error: 'Tidak ada baris kandidat judul untuk dirapikan.' });
  }

  const packed = candidates
    .map((c) => `p.${Math.max(1, Math.round(Number(c.p) || 1))}${c.b ? ' [BOLD]' : ''}${c.s ? ` [sz=${Number(c.s).toFixed(1)}]` : ''}: ${String(c.t || '').replace(/\s+/g, ' ').trim().slice(0, 140)}`)
    .join('\n')
    .slice(0, 28000);

  const prompt = [
    `Rapikan Daftar Bab & Pasal untuk dokumen "${title || 'Dokumen Library'}".`,
    'Berikut adalah kandidat baris judul beserta nomor halaman asli kemunculannya di dokumen (bukan halaman Daftar Isi):',
    packed,
    '',
    'Tugas Anda:',
    '1. Pilih HANYA judul BAB, Pasal, Bagian, Lampiran, dan Sub-bab yang benar-benar merupakan struktur dokumen.',
    '2. Buang kalimat poin daftar isi paragraf biasa (mis. kalimat panjang tindakan/penjelasan), header/footer berulang, dan sisa baris Daftar Isi.',
    '3. Jika ada judul terpotong di baris berurutan pada halaman yang sama, gabungkan agar utuh dan enak dibaca.',
    '4. Gunakan level l=1 (BAB/Romawi/Lampiran), l=2 (Sub-bab/Pasal), l=3 (Sub-pasal).',
    '5. Kembalikan HANYA JSON valid: {"toc":[{"t":"...","p":1,"l":1}]} tanpa komentar lain.',
  ].join('\n');

  try {
    const { model, json } = await callClaude(apiKey, (m) => ({
      model: m,
      max_tokens: 3000,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }));

    const parsed = parseJsonObject(extractText(json));
    const toc = Array.isArray(parsed && parsed.toc)
      ? parsed.toc
        .map((x) => ({
          t: String((x && x.t) || '').replace(/\s+/g, ' ').trim().slice(0, 160),
          p: Math.max(1, Math.min(3000, Math.round(Number(x && x.p) || 1))),
          l: Math.max(1, Math.min(3, Math.round(Number(x && x.l) || 1))),
        }))
        .filter((x) => x.t)
      : [];

    bumpUsed(req.user.username, 1);
    await audit(req.user, 'library_toc_ai', 'library', title || 'toc', { count: toc.length, model }).catch(() => {});
    return res.json({ ok: true, toc, model });
  } catch (err) {
    return res.status(502).json({ ok: false, error: String((err && err.message) || err) });
  }
});

module.exports = router;

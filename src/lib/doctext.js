'use strict';

/**
 * Indeks teks dokumen untuk Sena (24 Nov 2026).
 *
 * - Sumber: register Document Control (DOC_REGISTER) kategori kontrak, addendum, OK, MoM, surat masuk/keluar,
 *   asuransi yang punya berkas PDF di Google Drive.
 * - Teks dibaca di server: pdf.js; halaman hasil scan dibaca OCR Tesseract (bahasa Indonesia + Inggris),
 *   dibatasi OCR_MAX_PAGES halaman per dokumen dan berjalan pelan di latar (satu halaman sekali jalan).
 * - Disimpan di tabel doc_text; pencarian dilakukan di memori (skor kata kunci), tanpa biaya AI.
 * - Dokumen diindeks ulang bila berkasnya berganti (FILE_ID berubah).
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const db = require('../db');

const KATS = ['KONTRAK', 'ADDENDUM', 'OK', 'MOM', 'SURAT_MASUK', 'SURAT_KELUAR', 'ASURANSI'];
const OCR_MAX_PAGES = Number(process.env.SENA_OCR_MAX_PAGES) || 40;
const MAX_PAGES = 400;
const MAX_BYTES = Math.min(45, Math.max(5, Number(process.env.SENA_DOC_MAX_MB) || 20)) * 1024 * 1024;
const PAGE_CHARS = 6000;
const STOP = new Set(('yang dan di ke dari untuk dengan pada dalam atau ini itu adalah akan oleh sebagai tidak juga sudah telah dapat bisa harus ' +
  'serta karena maka bahwa jika bila agar the of and to in for on by with is are be as at or an a this that').split(' '));

let docs = new Map();         // doc_id → { id, pid, kat, judul, nomor, fileId, pages, ocr, status, content:[{p,t}] }
let ready = false, running = false, timer = null, lastRun = null, lastErr = '';
let tessW = null, tessIdle = null;

function norm(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, ''); }
function words(s) { return norm(s).split(/[^a-z0-9./-]+/).map((w) => w.replace(/^[./-]+|[./-]+$/g, '')).filter((w) => w.length >= 2 && !STOP.has(w)); }

async function load() {
  try {
    const r = await db.query('select doc_id, project_id, kat, judul, nomor, file_id, pages, ocr_pages, status, error, content, indexed_at from doc_text');
    const m = new Map();
    r.rows.forEach((x) => m.set(x.doc_id, { id: x.doc_id, pid: x.project_id, kat: x.kat, judul: x.judul, nomor: x.nomor, fileId: x.file_id,
      pages: x.pages, ocr: x.ocr_pages, status: x.status, error: x.error, at: x.indexed_at, content: Array.isArray(x.content) ? x.content : [] }));
    docs = m; ready = true;
  } catch (e) { if (!/does not exist/.test(String(e.message))) throw e; }
  return docs.size;
}

/** Cari potongan teks paling relevan. pids: daftar proyek yang boleh diakses. */
function search(pids, query, opt) {
  opt = opt || {};
  const allow = new Set((pids || []).map((x) => String(x).toUpperCase()));
  const q = words(query);
  if (!q.length) return { hasil: [], catatan: 'Kata kunci kosong.' };
  const kat = opt.kat ? String(opt.kat).toUpperCase() : '';
  const pool = [...docs.values()].filter((d) => allow.has(d.pid) && (!opt.pid || d.pid === opt.pid) && (!kat || d.kat === kat) && d.content.length);
  // idf sederhana
  const df = {};
  const chunks = [];
  pool.forEach((d) => d.content.forEach((pg) => {
    const t = String(pg.t || '');
    // pecah halaman panjang menjadi potongan ±1.200 karakter
    for (let i = 0; i < t.length; i += 1000) {
      const piece = t.slice(Math.max(0, i - 150), i + 1050);
      const lw = norm(piece);
      chunks.push({ d, p: pg.p, piece, lw });
    }
  }));
  q.forEach((w) => { df[w] = chunks.filter((c) => c.lw.includes(w)).length; });
  const N = chunks.length || 1;
  const head = norm(query);
  chunks.forEach((c) => {
    let s = 0, hit = 0;
    q.forEach((w) => {
      if (!df[w]) return;
      const n = c.lw.split(w).length - 1;
      if (n) { hit++; s += (1 + Math.log(n)) * Math.log(1 + N / df[w]); }
    });
    if (q.length > 1 && head.length > 6 && c.lw.includes(head)) s *= 1.6;
    const tl = norm(c.d.judul + ' ' + c.d.nomor);
    q.forEach((w) => { if (tl.includes(w)) s += 0.6; });
    c.score = hit ? s * (0.6 + 0.4 * hit / q.length) : 0;
  });
  const top = chunks.filter((c) => c.score > 0).sort((a, b) => b.score - a.score);
  const out = [], seen = new Set();
  for (const c of top) {
    const k = c.d.id + ':' + c.p;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ dokumen: c.d.judul, nomor: c.d.nomor || null, kategori: c.d.kat, proyek: c.d.pid, halaman: c.p, kutipan: c.piece.replace(/\s+/g, ' ').trim().slice(0, 1100) });
    if (out.length >= (opt.limit || 6)) break;
  }
  const indexed = pool.length, total = [...docs.values()].filter((d) => allow.has(d.pid) && (!opt.pid || d.pid === opt.pid)).length;
  return { hasil: out, dokumenTerindeks: indexed, catatan: out.length ? null : (indexed ? 'Tidak ada kutipan yang cocok; coba kata kunci lain atau sinonim.' : 'Belum ada teks dokumen yang terindeks untuk proyek ini.') };
}

function status(pids) {
  const allow = pids ? new Set(pids.map((x) => String(x).toUpperCase())) : null;
  const list = [...docs.values()].filter((d) => !allow || allow.has(d.pid));
  return { ready, running, lastRun, lastErr, dokumen: list.length, ok: list.filter((d) => d.status === 'OK').length,
    sebagian: list.filter((d) => d.status === 'SEBAGIAN').length, gagal: list.filter((d) => d.status === 'GAGAL').length,
    halaman: list.reduce((a, d) => a + (d.content.length || 0), 0), ocr: list.reduce((a, d) => a + (d.ocr || 0), 0) };
}

/* ---------------- pembacaan berkas ---------------- */
let pdfjsP = null;
function pdfjs() { if (!pdfjsP) pdfjsP = import('pdfjs-dist/legacy/build/pdf.mjs'); return pdfjsP; }

async function tess() {
  if (tessIdle) { clearTimeout(tessIdle); tessIdle = null; }
  if (tessW) return tessW;
  const dir = path.join(os.tmpdir(), 'pmo-tessdata');
  fs.mkdirSync(dir, { recursive: true });
  for (const l of ['ind', 'eng']) {
    const dst = path.join(dir, l + '.traineddata.gz');
    if (!fs.existsSync(dst)) fs.copyFileSync(require.resolve('@tesseract.js-data/' + l + '/4.0.0_best_int/' + l + '.traineddata.gz'), dst);
  }
  const T = require('tesseract.js');
  tessW = await T.createWorker(['ind', 'eng'], 1, { langPath: dir, cachePath: dir, gzip: true });
  await tessW.setParameters({ preserve_interword_spaces: '1' });
  return tessW;
}
function tessLater() {
  if (tessIdle) clearTimeout(tessIdle);
  tessIdle = setTimeout(async () => { const w = tessW; tessW = null; tessIdle = null; if (w) await w.terminate().catch(() => {}); }, 5 * 60 * 1000);
  if (tessIdle.unref) tessIdle.unref();
}

function pageLines(tc) {
  const it = tc.items.filter((i) => i.str && i.str.trim());
  if (!it.length) return '';
  const rows = [];
  it.forEach((i) => {
    const y = i.transform[5], h = Math.abs(i.transform[3]) || i.height || 10;
    let r = rows.find((x) => Math.abs(x.y - y) <= Math.max(2, h * 0.45));
    if (!r) { r = { y, its: [] }; rows.push(r); }
    r.its.push({ x: i.transform[4], s: i.str });
  });
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r) => r.its.sort((a, b) => a.x - b.x).map((x) => x.s).join(' ').replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

const sleep = (ms) => new Promise((r) => { const t = setTimeout(r, ms); if (t.unref) t.unref(); });

let canvasLibCache = undefined;
function getCanvasLib() {
  if (canvasLibCache !== undefined) return canvasLibCache;
  try { canvasLibCache = require('@napi-rs/canvas'); } catch (e) { canvasLibCache = null; }
  return canvasLibCache;
}

async function extract(buf) {
  const lib = await pdfjs();
  const pdf = await lib.getDocument({ data: new Uint8Array(buf), disableFontFace: true, isEvalSupported: false, verbosity: 0 }).promise;
  const n = Math.min(pdf.numPages, MAX_PAGES), out = [];
  const canvasLib = getCanvasLib();
  let ocr = 0, skipped = 0;
  for (let p = 1; p <= n; p++) {
    const page = await pdf.getPage(p);
    let t = pageLines(await page.getTextContent());
    if (t.replace(/\s/g, '').length < 40) {
      if (canvasLib && ocr < OCR_MAX_PAGES) {
        try {
          const vp = page.getViewport({ scale: 2.0 });
          const c = canvasLib.createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
          await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
          const png = await c.encode('png');
          const w = await tess();
          const r = await w.recognize(png);
          t = String((r && r.data && r.data.text) || '').trim();
          ocr++;
          await sleep(800); // beri jeda supaya server tetap ringan
        } catch (e) { t = ''; }
      } else skipped++;
    }
    page.cleanup();
    if (t) out.push({ p, t: t.slice(0, PAGE_CHARS) });
    if (p % 10 === 0) await sleep(20); // beri kesempatan event loop melayani HTTP /health
  }
  await pdf.destroy().catch(() => {});
  return { pages: pdf.numPages, content: out, ocr, skipped };
}

async function fetchWithTimeout(url, headers, timeoutMs) {
  const ctl = new AbortController();
  const timerId = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: ctl.signal });
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('Waktu unduh dokumen dari Drive habis.');
    throw e;
  } finally {
    clearTimeout(timerId);
  }
}

async function download(fileId) {
  const gauth = require('../google/auth');
  const tok = await gauth.accessToken();
  const api = process.env.GOOGLE_DRIVE_API || 'https://www.googleapis.com/drive/v3';
  const hdrs = { Authorization: 'Bearer ' + tok };
  const meta = await fetchWithTimeout(api + '/files/' + encodeURIComponent(fileId) + '?fields=id,name,mimeType,size&supportsAllDrives=true', hdrs, 25000);
  if (!meta.ok) throw new Error('Berkas tidak bisa dibaca dari Drive (' + meta.status + ')');
  const m = await meta.json();
  if (m.mimeType !== 'application/pdf') throw new Error('Bukan PDF (' + m.mimeType + ')');
  if (Number(m.size) > MAX_BYTES) throw new Error('Berkas terlalu besar (' + Math.round(Number(m.size) / 1048576) + ' MB)');
  const r = await fetchWithTimeout(api + '/files/' + encodeURIComponent(fileId) + '?alt=media&supportsAllDrives=true', hdrs, 60000);
  if (!r.ok) throw new Error('Unduh berkas gagal (' + r.status + ')');
  return Buffer.from(await r.arrayBuffer());
}

async function save(d) {
  await db.query(
    `insert into doc_text (doc_id, project_id, kat, judul, nomor, file_id, pages, ocr_pages, status, error, content, indexed_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
     on conflict (doc_id) do update set project_id=excluded.project_id, kat=excluded.kat, judul=excluded.judul, nomor=excluded.nomor, file_id=excluded.file_id,
       pages=excluded.pages, ocr_pages=excluded.ocr_pages, status=excluded.status, error=excluded.error, content=excluded.content, indexed_at=now()`,
    [d.id, d.pid, d.kat, d.judul.slice(0, 300), d.nomor.slice(0, 120), d.fileId, d.pages || 0, d.ocr || 0, d.status, String(d.error || '').slice(0, 300), JSON.stringify(d.content || [])]);
  docs.set(d.id, Object.assign({ at: new Date() }, d));
}

/** Daftar dokumen register (dibaca lewat lingkup kode lama, akun sistem). */
function registerList() {
  const runtime = require('../gas/runtime');
  const { exported } = runtime.createScope({ user: { username: 'sena-indeks', name: 'Sena (indeks)', nama: 'Sena (indeks)', role: 'ADMIN', projectId: 'ALL' }, appUrl: '' });
  return exported.docRegsAll_().filter((r) => KATS.includes(r.kat) && r.fileId);
}

/** Satu putaran: indeks dokumen yang belum ada / berkasnya berganti. Maks `limit` dokumen. */
async function runOnce(limit) {
  if (running) return { skipped: 'berjalan' };
  running = true; lastErr = '';
  let done = 0;
  try {
    if (!ready) await load();
    const regs = registerList();
    const live = new Set(regs.map((r) => r.id));
    // hapus indeks dokumen yang sudah dihapus dari register
    for (const id of [...docs.keys()]) if (!live.has(id)) { docs.delete(id); await db.query('delete from doc_text where doc_id = $1', [id]).catch(() => {}); }
    const todo = regs.filter((r) => { const d = docs.get(r.id); return !d || d.fileId !== r.fileId || (d.status === 'GAGAL' && Date.now() - new Date(d.at).getTime() > 24 * 3600e3); });
    for (const r of todo.slice(0, limit || 1)) {
      const base = { id: r.id, pid: r.pid, kat: r.kat, judul: r.judul || r.fileName || r.id, nomor: r.nomor || '', fileId: r.fileId };
      try {
        let buf = await download(r.fileId);
        const x = await extract(buf);
        buf = null;
        await save(Object.assign(base, { pages: x.pages, ocr: x.ocr, content: x.content, status: x.skipped ? 'SEBAGIAN' : 'OK', error: x.skipped ? x.skipped + ' halaman scan belum dibaca (batas OCR ' + OCR_MAX_PAGES + ' halaman)' : '' }));
      } catch (e) {
        await save(Object.assign(base, { pages: 0, ocr: 0, content: [], status: /Bukan PDF|terlalu besar/.test(e.message) ? 'LEWATI' : 'GAGAL', error: e.message }));
      }
      done++;
    }
    lastRun = new Date();
    return { done, sisa: Math.max(0, todo.length - done) };
  } catch (e) {
    lastErr = String(e.message || e);
    return { error: lastErr };
  } finally {
    running = false;
    if (tessW) tessLater();
  }
}

/** Indeks di latar: mulai 3 menit setelah server hidup, lalu tiap 10 menit (1 dokumen per putaran agar RAM & server ringan). */
function start() {
  if (String(process.env.SENA_DOC_INDEX || '1') === '0') return;
  const tick = async () => { try { await runOnce(1); } catch (e) { lastErr = String(e.message || e); } };
  const t0 = setTimeout(tick, 3 * 60 * 1000); if (t0.unref) t0.unref();
  timer = setInterval(tick, 10 * 60 * 1000); if (timer.unref) timer.unref();
}

module.exports = { load, search, status, runOnce, start, extract, KATS };

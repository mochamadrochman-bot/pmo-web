'use strict';

/**
 * Sena v2 (24 Nov 2026): jalannya pertanyaan ke Claude dipindah ke Node (asinkron).
 *
 * Sebelumnya askAssistant di kode lama memanggil Claude secara sinkron, sehingga selama Sena berpikir
 * (bisa 20–90 detik) server tidak melayani permintaan lain. Sekarang:
 *   - POST /api/sena/ask membuat "job"; widget menanyakan status tiap ±1,5 detik (GET /api/sena/job/:id).
 *   - Alat pembaca data tetap fungsi kode lama (aiRunTool_, aiToolProject_, …) yang cepat karena di memori.
 *   - Pemakaian & biaya dicatat di tabel ai_usage: batas harian per akun (SENA_DAILY_LIMIT, bawaan 5)
 *     dan anggaran bulanan seluruh organisasi (SENA_MONTHLY_BUDGET_USD, bawaan 10).
 *   - Model dipilih otomatis: cepat → Haiku 5.5; analisis & bahan rapat → Sonnet 5.5 (CLAUDE_MODEL bila diisi).
 */

const crypto = require('node:crypto');
const db = require('../db');
const doctext = require('./doctext');

const API_URL = (() => {
  const t = String(process.env.SENA_TEST_API_URL || '').trim();
  return /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(t) ? t : 'https://api.anthropic.com/v1/messages';
})();
const TZ = 'Asia/Jakarta';
// USD per 1 juta token: input, output, tulis cache (5 menit), baca cache.
const PRICE = {
  'claude-sonnet-5-5': [2, 10, 2.5, 0.10],
  'claude-haiku-5-5': [0.10, 0.50, 0.125, 0.01],
  'claude-opus-5-5': [4, 20, 5, 0.20],
};
const MODES = {
  cepat: { effort: 'low', max: 3000, rounds: 5, timeout: 90000 },
  analisis: { effort: 'medium', max: 10000, rounds: 7, timeout: 150000 },
  rapat: { effort: 'high', max: 16000, rounds: 8, timeout: 210000 },
};

const dailyLimit = () => { const v = Number(process.env.SENA_DAILY_LIMIT); return v > 0 ? Math.floor(v) : 5; };
const budget = () => { const v = Number(process.env.SENA_MONTHLY_BUDGET_USD); return v > 0 ? v : 10; };
const modelMain = () => String(process.env.CLAUDE_MODEL || '').trim() || 'claude-sonnet-5-5';
const modelFast = () => String(process.env.CLAUDE_MODEL_FAST || '').trim() || 'claude-haiku-5-5';
const apiKey = () => String(process.env.ANTHROPIC_API_KEY || process.env.GAS_PROP_ANTHROPIC_API_KEY || '').trim();

/* ---------------- pemakaian ---------------- */
const dayKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d || new Date());
const monthKey = (d) => dayKey(d).slice(0, 7);
let U = { month: '', usd: 0, day: '', perUser: {}, loaded: false };

async function loadUsage() {
  const now = new Date(), m = monthKey(now), d = dayKey(now);
  const r = await db.query(`select username, usd, counted, status, at from ai_usage where at >= now() - interval '40 days'`).catch((e) => { if (/does not exist/.test(e.message)) return { rows: [] }; throw e; });
  const nu = { month: m, usd: 0, day: d, perUser: {}, loaded: true };
  r.rows.forEach((x) => {
    const at = new Date(x.at);
    if (monthKey(at) === m) nu.usd += Number(x.usd) || 0;
    if (dayKey(at) === d && x.counted) nu.perUser[x.username] = (nu.perUser[x.username] || 0) + 1;
  });
  U = nu;
}
function roll() {
  const now = new Date();
  if (U.month !== monthKey(now)) { U.month = monthKey(now); U.usd = 0; }
  if (U.day !== dayKey(now)) { U.day = dayKey(now); U.perUser = {}; }
}
function usage(username) {
  roll();
  return { used: U.perUser[username] || 0, limit: dailyLimit(), monthUsd: Math.round(U.usd * 10000) / 10000, budgetUsd: budget() };
}
function cost(model, u) {
  const p = PRICE[model] || PRICE['claude-sonnet-5-5'];
  return ((u.in || 0) * p[0] + (u.out || 0) * p[1] + (u.cw || 0) * p[2] + (u.cr || 0) * p[3]) / 1e6;
}
async function record(row) {
  roll();
  U.usd += row.usd || 0;
  if (row.counted) U.perUser[row.username] = (U.perUser[row.username] || 0) + 1;
  await db.query(`insert into ai_usage (username, mode, model, project, question, in_tok, out_tok, cache_write, cache_read, usd, rounds, status, counted)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
  [row.username, row.mode || '', row.model || '', String(row.project || '').slice(0, 80), String(row.question || '').slice(0, 500), row.in || 0, row.out || 0, row.cw || 0, row.cr || 0,
    Math.round((row.usd || 0) * 1e6) / 1e6, row.rounds || 0, row.status || 'OK', !!row.counted]).catch((e) => console.error(JSON.stringify({ ev: 'sena_usage_fail', message: e.message })));
}

/* ---------------- data luar sheet (Postgres) untuk bahan rapat ---------------- */
const fdt = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
async function extData() {
  const out = { issues: {}, actions: {}, letters: {} };
  const q = async (sql) => (await db.query(sql).catch(() => ({ rows: [] }))).rows;
  (await q(`select project_id, category, title, detail, ask, severity, status, pic, target, updated_at from pres_issues
            where status <> 'Selesai' and closed_at is null order by updated_at desc limit 300`)).forEach((x) => {
    (out.issues[x.project_id] = out.issues[x.project_id] || []).push({ kategori: x.category, isu: x.title, detail: String(x.detail || '').slice(0, 400),
      permintaan: String(x.ask || '').slice(0, 300), tingkat: x.severity, status: x.status, pic: x.pic, target: fdt(x.target) });
  });
  (await q(`select a.project_id, a.doc_id, a.uraian, a.pic, a.pihak, a.due, a.status, a.catatan from doc_actions a
            where a.status <> 'SELESAI' order by a.due nulls last limit 400`)).forEach((x) => {
    (out.actions[x.project_id] = out.actions[x.project_id] || []).push({ momId: x.doc_id, uraian: String(x.uraian).slice(0, 300), pic: x.pic, pihak: x.pihak,
      batasWaktu: fdt(x.due), status: x.status, catatan: String(x.catatan || '').slice(0, 200) });
  });
  (await q(`select doc_id, project_id, kat, data, updated_at from doc_meta where kat in ('SURAT_MASUK','SURAT_KELUAR') and updated_at >= now() - interval '75 days' order by updated_at desc limit 300`)).forEach((x) => {
    const d = x.data || {};
    (out.letters[x.project_id] = out.letters[x.project_id] || []).push({ docId: x.doc_id, jenis: x.kat === 'SURAT_MASUK' ? 'Surat masuk' : 'Surat keluar',
      kepada: d.kepada || '', penandatangan: d.ttd || '', jabatan: d.ttdJabatan || '' });
  });
  return out;
}

/* ---------------- pemilihan mode ---------------- */
function pickMode(req, q) {
  if (req.draft) return 'analisis';
  if (req.mode === 'rapat') return 'rapat';
  const s = String(q || '');
  const numbered = (s.match(/(^|\n)\s*\d+[.)]\s+\S/g) || []).length >= 2;
  if (/\b(rapat|meeting|briefing|recovery|arahan)\b/i.test(s) && (numbered || s.length > 160)) return 'rapat';
  if (numbered || s.length > 220 || /(rekomendasi|arahan|masukan|saran|analisis|analisa|evaluasi|strategi|percepat|mitigasi|kenapa|mengapa|penyebab|bandingkan|risiko|prioritas|sebaiknya|apa yang harus|bagaimana cara|rencana)/i.test(s)) return 'analisis';
  return 'cepat';
}

/* ---------------- alat tambahan ---------------- */
const TOOLS_V2 = [
  { name: 'paket_rapat',
    description: 'Bahan rapat lengkap satu proyek dalam satu panggilan: ringkasan mingguan (progres per bidang, K3, concern, highlight, forecast, CPM), target akhir tahun (target baseline vs aktual, kenaikan per minggu yang dibutuhkan, pekerjaan berbobot besar), 3 month look ahead, item Procurement/Construction terlambat dan grup kritis, dokumen engineering menunggu lama, isu manajemen terbuka, tindak lanjut MoM yang belum selesai, surat masuk/keluar terbaru, jaminan & asuransi yang akan berakhir. Pakai untuk pertanyaan rapat, arahan, rekomendasi, atau recovery plan satu proyek.',
    input_schema: { type: 'object', properties: { proyek: { type: 'string', description: 'Nama atau ID proyek' } }, required: ['proyek'], additionalProperties: false } },
  { name: 'cari_dokumen',
    description: 'Cari kutipan teks di dalam dokumen resmi proyek yang sudah dibaca dashboard (kontrak & lampiran, addendum, OK, MoM/risalah rapat, surat masuk/keluar, polis asuransi). Pakai untuk dasar kontrak (pasal, kewajiban kontraktor, persyaratan HSE, prosedur progres, termin, denda/penalti, jadwal) atau isi rapat/surat. Kutip judul dokumen dan halamannya.',
    input_schema: { type: 'object', properties: { proyek: { type: 'string', description: 'Nama atau ID proyek (kosongkan untuk semua proyek yang boleh diakses)' },
      kata_kunci: { type: 'string', description: 'Kata kunci inti, mis. "denda keterlambatan", "HSE requirements", "progress calculation"' },
      kategori: { type: 'string', enum: ['SEMUA', 'KONTRAK', 'ADDENDUM', 'OK', 'MOM', 'SURAT_MASUK', 'SURAT_KELUAR', 'ASURANSI'] } }, required: ['kata_kunci'], additionalProperties: false } },
];

const PROMPT_V2 = [
  'TAMBAHAN:',
  '12. Untuk pertanyaan rapat, arahan, rekomendasi, atau recovery plan satu proyek, panggil paket_rapat lebih dulu (satu panggilan berisi hampir semua data). Tambah alat lain hanya bila masih ada yang kurang.',
  '13. Untuk dasar kontrak (kewajiban kontraktor, persyaratan HSE, prosedur progres, termin, denda, jadwal) atau isi MoM/surat, pakai cari_dokumen dan sebut sumbernya, mis. "(Appendix P · hal. 3)". Jangan mengutip pasal yang tidak ada di hasil alat.',
  '14. Data K3 (fatality, LTIFR, manhour, rencana/aktual HSE) ada di ringkasan mingguan. Bila kosong, katakan data K3 belum diinput, jangan menyimpulkan aman.',
  '15. Target dan kebutuhan kenaikan per minggu sudah dihitung server (target akhir tahun); jangan menghitung ulang dengan cara lain.',
  '16. Sumber angka: PROGRES (realisasi, rencana, deviasi, SPI, status, isu) selalu dari input MINGGUAN terbaru tiap proyek; sebut week-nya, mis. "W51" (tiap proyek bisa berbeda week). KEUANGAN (CPI, termin dibayar, biaya, investasi) dari cut-off BULANAN terakhir; sebut periodenya, mis. "(Oktober 2026)". Jangan menyebut progres dari periode bulanan bila data mingguan tersedia.',
].join('\n');

const PROMPT_RAPAT = [
  'MODE BAHAN RAPAT: pengguna menyiapkan rapat. Jawaban lebih panjang dan terstruktur (±400–900 kata), boleh melebihi batas 250 kata.',
  'Bila pengguna memberi daftar pertanyaan bernomor, ikuti urutan dan judulnya. Bila tidak, pakai susunan:',
  '## Posisi proyek (2–3 kalimat: minggu data, rencana vs realisasi, deviasi, perkiraan selesai).',
  '## 1. Bidang Umum — K3 & kinerja overall (K3: fatality, LTIFR, manhour, HSE rencana vs aktual; kinerja: deviasi, tren, SPI, target akhir tahun & kenaikan per minggu yang dibutuhkan).',
  '## 2. EPCC — yang bisa ditingkatkan (per Engineering, Procurement, Construction, Commissioning: item/grup spesifik yang tertinggal atau kritis, penyebab dari data, langkah perbaikan, PIC bila ada).',
  '## 3. Recovery plan yang perlu diminta dari kontraktor (target kenaikan per minggu dan milestone pemantauan dari data; opsi percepatan yang relevan: tambah manpower/shift, alat, resequencing, pekerjaan paralel, fast-track procurement/ekspedisi material; dokumen yang wajib diserahkan kontraktor: jadwal revisi/look ahead, histogram manpower & alat, daftar material kritis dan tanggal tiba, rencana mitigasi risiko; cara pemantauan mingguan).',
  '## Arahan untuk rapat (3–6 poin tegas, masing-masing dengan PIC dan tenggat bila datanya ada).',
  'Sertakan isu manajemen terbuka dan tindak lanjut MoM yang lewat batas bila relevan. Dasar kontrak dikutip dari cari_dokumen bila ada. Tetap tanpa tabel dan tanpa emoji.',
].join('\n');

function clip(o, n) {
  let s = JSON.stringify(o === undefined ? null : o);
  if (s.length > n) s = s.slice(0, n) + ' …[dipotong]';
  return s;
}
function slim(list, n, keys) {
  return (Array.isArray(list) ? list : []).slice(0, n).map((x) => { if (!keys) return x; const o = {}; keys.forEach((k) => { if (x[k] !== undefined && x[k] !== null && x[k] !== '') o[k] = x[k]; }); return o; });
}

function toolMeeting(X, T, a, token, ext) {
  const E = X.exported, p = T.project(a.proyek);
  const out = { proyek: p.name, id: p.id };
  const tryIt = (k, f) => { try { out[k] = f(); } catch (e) { out[k] = { tidakTersedia: String(e.message || e).slice(0, 160) }; } };
  tryIt('ringkasan', () => E.aiRunTool_(T, 'ringkasan_proyek', { proyek: p.id }));
  tryIt('targetAkhirTahun', () => { const r = E.getPresProjSlide(token, p.id, 'prog'); return r && r.data; });
  tryIt('lookAhead3Bulan', () => { const r = E.getPresProjSlide(token, p.id, 'la'); return r && r.data ? { periode: r.data.period, bulan: r.data.months, proyek: r.data.project } : null; });
  ['PROCUREMENT', 'CONSTRUCTION'].forEach((F) => tryIt('terlambat' + F.charAt(0) + F.slice(1).toLowerCase(), () => {
    const r = E.aiRunTool_(T, 'daftar_item', { proyek: p.id, bidang: F, filter: 'TERLAMBAT' });
    if (r && Array.isArray(r.daftar)) r.daftar = r.daftar.slice(0, 12);
    return r;
  }));
  tryIt('grupKritisConstruction', () => { const r = E.aiRunTool_(T, 'daftar_item', { proyek: p.id, bidang: 'CONSTRUCTION', filter: 'KRITIS' }); if (r && Array.isArray(r.daftar)) r.daftar = r.daftar.slice(0, 8); return r; });
  tryIt('engineeringMenungguLama', () => { const r = E.aiRunTool_(T, 'dokumen_engineering', { proyek: p.id, status: 'MENUNGGU_LAMA' }); if (r && Array.isArray(r.dokumen)) r.dokumen = r.dokumen.slice(0, 10); return r; });
  tryIt('jaminanAsuransi', () => {
    const r = E.aiRunTool_(T, 'dokumen_proyek', { proyek: p.id, kategori: 'SEMUA' }) || {};
    const dok = Array.isArray(r.dokumen) ? r.dokumen : [];
    return { jaminanJatuhTempo: r.jaminanJatuhTempo || [], asuransi: dok.filter((d) => d.kategori === 'ASURANSI' || /asuransi/i.test(d.kategori || '')).slice(0, 8), kelengkapanBelumAda: r.kelengkapanBelumAda || r.belumAda || undefined };
  });
  out.isuManajemenTerbuka = slim(ext.issues[p.id], 12);
  const acts = ext.actions[p.id] || [];
  const today = new Date().toISOString().slice(0, 10);
  out.tindakLanjutMoMBelumSelesai = { jumlah: acts.length, lewatBatas: acts.filter((x) => x.batasWaktu && x.batasWaktu < today).length, daftar: slim(acts, 15) };
  out.suratTerbaru = slim(ext.letters[p.id], 10);
  T.src('Bahan rapat ' + p.name);
  T.steps.push('Bahan rapat ' + p.name);
  T.__meeting = { id: p.id, name: p.name };
  return out;
}

function toolDocs(T, a) {
  const allowed = T.allowed().map((x) => x.id);
  let pid = '';
  if (a.proyek) { const p = T.project(a.proyek); pid = p.id; }
  const kat = a.kategori && a.kategori !== 'SEMUA' ? a.kategori : '';
  const r = doctext.search(allowed, String(a.kata_kunci || ''), { pid, kat, limit: 6 });
  T.src('Isi dokumen proyek (teks terindeks)');
  T.steps.push('Cari dokumen: ' + String(a.kata_kunci || '').slice(0, 40));
  return r;
}

/* ---------------- panggilan Claude ---------------- */
async function callClaude(body, timeout) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(API_URL, { method: 'POST', signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey(), 'anthropic-version': '2023-06-01' }, body: JSON.stringify(body) });
    const txt = await res.text();
    let j = null; try { j = JSON.parse(txt); } catch (e) { j = null; }
    if (res.status !== 200 || !j) {
      const msg = j && j.error ? j.error.type + ': ' + j.error.message : 'HTTP ' + res.status;
      if (res.status === 401) throw new Error('Kunci API ditolak (401). Periksa ANTHROPIC_API_KEY di Coolify.');
      if (res.status === 429) throw new Error('Claude API sedang sibuk / batas akun tercapai (429). Coba beberapa saat lagi.');
      if (res.status === 529) throw new Error('Claude API sedang padat (529). Coba beberapa saat lagi.');
      if (res.status === 400 && /credit|balance/i.test(msg)) throw new Error('Saldo Claude API habis. Isi ulang di Claude Console → Billing.');
      throw new Error('Claude API error: ' + msg);
    }
    return j;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Sena terlalu lama berpikir dan dihentikan. Coba persempit pertanyaan.');
    throw e;
  } finally { clearTimeout(t); }
}

/* ---------------- job ---------------- */
const JOBS = new Map();
function newJob(username) {
  const id = crypto.randomBytes(9).toString('hex');
  const j = { id, username, status: 'run', step: 'Menyiapkan…', result: null, error: null, at: Date.now() };
  JOBS.set(id, j);
  for (const [k, v] of JOBS) if (Date.now() - v.at > 15 * 60 * 1000) JOBS.delete(k);
  return j;
}
function getJob(id, username) { const j = JOBS.get(String(id || '')); return j && j.username === username ? j : null; }

/**
 * Jalankan satu pertanyaan. X = { exported } lingkup kode lama untuk akun ini; user = akun kode lama;
 * nodeUser = akun aplikasi (req.user). Hasil sama bentuknya dengan askAssistant lama.
 */
async function run(job, X, user, nodeUser, token, req) {
  const E = X.exported;
  const q = String(req.question || '').trim().slice(0, 1500);
  const mode = pickMode(req, q);
  const M = MODES[mode];
  const model = mode === 'cepat' ? modelFast() : modelMain();
  const T = E.aiToolCtx_(user, req, q);
  if (E.senaBegin_) E.senaBegin_(req);
  const draft = E.senaDraft_ ? E.senaDraft_(req) : null;
  let ext = null;
  const sys = E.aiSystemPrompt_(req) + '\n' + PROMPT_V2 + (mode === 'rapat' && !draft ? '\n' + PROMPT_RAPAT : '');
  const tools = TOOLS_V2.concat(E.AI_TOOL_DEFS.map((t) => Object.assign({}, t)));
  const messages = [];
  (Array.isArray(req.history) ? req.history : []).slice(-4).forEach((h) => {
    const hq = String((h && h.q) || '').slice(0, 1500), ha = String((h && h.a) || '').slice(0, 3000);
    if (hq && ha) { messages.push({ role: 'user', content: hq }); messages.push({ role: 'assistant', content: ha }); }
  });
  messages.push({ role: 'user', content: [{ type: 'text', text: E.aiIntro_(T, req) + '\n\nPERTANYAAN: ' + q }] });
  const U2 = { in: 0, out: 0, cw: 0, cr: 0 };
  const add = (u) => { u = u || {}; U2.in += Number(u.input_tokens) || 0; U2.out += Number(u.output_tokens) || 0; U2.cw += Number(u.cache_creation_input_tokens) || 0; U2.cr += Number(u.cache_read_input_tokens) || 0; };
  let answer = '', rounds = 0, clarify = null, stop = '';
  const STEP = { paket_rapat: 'Membaca bahan rapat (K3, progres, EPCC, isu, MoM)…', cari_dokumen: 'Mencari di dokumen kontrak…', ringkasan_proyek: 'Membaca ringkasan proyek…',
    daftar_item: 'Membaca daftar item EPCC…', cari_data: 'Mencari data…', detail_item: 'Membaca detail item…', riwayat_progres: 'Membaca riwayat progres…',
    dokumen_engineering: 'Membaca dokumen engineering…', dokumen_proyek: 'Membaca register dokumen…', daftar_proyek: 'Membaca daftar proyek…', milestone_bulanan: 'Membaca milestone…' };
  const base = (r, final) => {
    messages.forEach((m) => { if (Array.isArray(m.content)) m.content.forEach((b) => { delete b.cache_control; }); });
    const last = messages[messages.length - 1];
    if (Array.isArray(last.content) && last.content.length) last.content[last.content.length - 1].cache_control = { type: 'ephemeral' };
    const b = { model, max_tokens: final ? Math.min(M.max, 8000) : M.max, system: [{ type: 'text', text: sys, cache_control: { type: 'ephemeral' } }], tools, messages,
      output_config: { effort: final ? 'low' : M.effort } };
    if (final || r === M.rounds - 1) b.tool_choice = { type: 'none' };
    return b;
  };
  job.step = mode === 'rapat' ? 'Menyiapkan bahan rapat…' : 'Sena sedang berpikir…';
  for (let r = 0; r < M.rounds; r++) {
    rounds = r + 1;
    const j = await callClaude(base(r, false), M.timeout);
    add(j.usage);
    stop = j.stop_reason;
    const content = j.content || [];
    const uses = content.filter((b) => b && b.type === 'tool_use');
    const text = content.filter((b) => b && b.type === 'text').map((b) => b.text).join('\n').trim();
    const ask = uses.find((b) => b.name === 'tanya_balik');
    if (ask) { clarify = ask.input || {}; break; }
    if (j.stop_reason === 'tool_use' && uses.length) {
      messages.push({ role: 'assistant', content });
      const results = [];
      for (const b of uses) {
        job.step = STEP[b.name] || 'Membaca data…';
        let out, err = false;
        try {
          if (b.name === 'paket_rapat') { if (!ext) ext = await extData(); out = toolMeeting(X, T, b.input || {}, token, ext); if (E.senaSeen_) E.senaSeen_(out); }
          else if (b.name === 'cari_dokumen') out = toolDocs(T, b.input || {});
          else out = E.aiRunTool_(T, b.name, b.input);
          if (out && out.error) err = true;
        } catch (e) { out = { error: String(e.message || e) }; err = true; }
        results.push({ type: 'tool_result', tool_use_id: b.id, content: clip(out, b.name === 'paket_rapat' ? 48000 : 16000), is_error: err });
      }
      messages.push({ role: 'user', content: results });
      job.step = 'Menyusun jawaban…';
      continue;
    }
    answer = text;
    break;
  }
  // Jawaban kosong / terpotong saat memanggil alat: satu kali minta jawaban akhir tanpa alat.
  if (!clarify && (!answer || (stop === 'max_tokens' && answer.length < 200))) {
    job.step = 'Merangkum jawaban…';
    const last = messages[messages.length - 1];
    const note = { type: 'text', text: 'Data sudah cukup. Tulis jawaban akhir sekarang berdasarkan data yang sudah dibaca, tanpa memanggil alat.' };
    if (last.role === 'user') { if (Array.isArray(last.content)) last.content.push(note); else last.content = [{ type: 'text', text: String(last.content) }, note]; }
    else messages.push({ role: 'user', content: [note] });
    const j = await callClaude(base(rounds, true), M.timeout);
    add(j.usage); rounds++;
    stop = j.stop_reason;
    answer = (j.content || []).filter((b) => b && b.type === 'text').map((b) => b.text).join('\n').trim();
  }
  if (answer && stop === 'max_tokens') answer += '\n\n_(Jawaban terpotong karena terlalu panjang. Ajukan pertanyaan lanjutan untuk bagian yang belum selesai.)_';
  const usd = cost(model, U2);
  const pj = String(req.projectId || req.project || '');
  if (clarify) {
    await record({ username: nodeUser.username, mode: 'klarifikasi', model, project: pj, question: q, ...U2, usd, rounds, status: 'KLARIFIKASI', counted: false });
    const opts = (Array.isArray(clarify.pilihan) ? clarify.pilihan : []).map((x) => String(x || '').trim().slice(0, 60)).filter(Boolean).slice(0, 4);
    const qq = String(clarify.pertanyaan || 'Yang mana yang Anda maksud?').trim().slice(0, 240);
    const op = opts.length >= 2 ? opts : ['Ya, lanjutkan', 'Tidak, ubah pertanyaan'];
    if (E.senaEnd_) E.senaEnd_();
    const us = usage(nodeUser.username);
    return { success: true, answer: qq + '\n' + op.map((o) => '- ' + o).join('\n'), clarify: { question: qq, options: op }, cards: [], sources: [], steps: [],
      usage: { used: us.used, limit: us.limit, input: 0, output: 0, monthUsd: us.monthUsd, budgetUsd: us.budgetUsd }, model, mode };
  }
  const ok = !!answer;
  await record({ username: nodeUser.username, mode: draft ? 'draf' : mode, model, project: pj, question: q, ...U2, usd, rounds, status: ok ? 'OK' : 'KOSONG', counted: ok });
  const res = { success: true, answer: answer || 'Maaf, Sena belum berhasil menyusun jawaban. Coba ulangi atau persempit pertanyaan (kuota tidak berkurang).',
    cards: T.wantFc ? T.cards.slice(0, 3) : [], sources: T.sources.slice(0, 8), steps: T.steps.slice(0, 10), model, mode, meetingProject: T.__meeting || null };
  if (ok && E.senaFinish_) Object.assign(res, E.senaFinish_(user, res.answer, draft));
  if (E.senaEnd_) E.senaEnd_();
  const us = usage(nodeUser.username);
  res.usage = { input: U2.in + U2.cw + U2.cr, output: U2.out, usd: Math.round(usd * 10000) / 10000, used: us.used, limit: us.limit, rounds, monthUsd: us.monthUsd, budgetUsd: us.budgetUsd };
  return res;
}

function canAsk(nodeUser) {
  if (!apiKey()) return 'AI belum dikonfigurasi: isi ANTHROPIC_API_KEY di Coolify.';
  const u = usage(nodeUser.username);
  if (u.used >= u.limit) return 'Batas ' + u.limit + ' pertanyaan per hari sudah tercapai. Coba lagi besok.';
  if (u.monthUsd >= u.budgetUsd) return 'Anggaran Sena bulan ini ($' + u.budgetUsd + ') sudah habis. Sena aktif kembali awal bulan depan, atau Admin menaikkan SENA_MONTHLY_BUDGET_USD.';
  return '';
}

/** Dipakai kode lama (getAiStatus) lewat __bridge.sena(). */
const bridge = {
  usage: (username) => usage(String(username || '')),
  docStatus: () => doctext.status(),
};

async function init() {
  await loadUsage();
  await doctext.load();
  doctext.start();
}

module.exports = { init, run, newJob, getJob, canAsk, usage, bridge, pickMode, cost, PRICE, MODES, extData, loadUsage };

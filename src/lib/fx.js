'use strict';

/**
 * Kurs bulanan (USD, CNY, CNH → IDR) dan komponen mata uang nilai kontrak.
 * Disimpan juga di memori supaya kode lama (GS) bisa membacanya tanpa query (bridge `fx`).
 *
 * Sumber kurs: api.frankfurter.dev (gratis, tanpa kunci). Urutan percobaan per mata uang:
 *   1. penyedia Bank Indonesia (providers=BI)   2. kurs gabungan Frankfurter   3. API v1 (ECB)
 * CNH (yuan luar daratan) bila tidak tersedia memakai kurs CNY dan ditandai di `source`.
 * Kurs bulan berjalan diperbarui tiap 6 jam; bulan yang sudah lewat memakai kurs hari kerja terakhir bulan itu.
 */

const db = require('../db');

const CUR = ['usd', 'cny', 'cnh'];
let rates = {};      // { 'YYYY-MM': { usd, cny, cnh, date, source } }
let contracts = {};  // { PID: { idr, usd, cny, cnh, kind, at, by, history: [...] } }
let fsMap = {};      // { PID: { rateDate, rates:{usd,cny,cnh}, source, items:{plant|idc|pm|other:{idr,usd,cny,cnh,total}}, otherName, by, at } }
let costs = {};      // { PID: { 'YYYY-MM': { plant|idc|pm|other: { idr,usd,cny,cnh, rates:{usd,cny,cnh}, total } } } }
const ITEMS = ['plant', 'idc', 'pm', 'other'];
const dayCache = {}; // { 'YYYY-MM-DD': { usd, cny, cnh, date, source } }
let timer = null;

const ym = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const num = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v) || 0);

async function load() {
  const r = await db.query('select * from fx_rates');
  const m = {};
  r.rows.forEach((x) => {
    m[x.month] = { usd: x.usd === null ? null : Number(x.usd), cny: x.cny === null ? null : Number(x.cny), cnh: x.cnh === null ? null : Number(x.cnh),
      date: x.rate_date ? ymd(new Date(x.rate_date)) : '', source: x.source || {}, fetchedAt: x.fetched_at };
  });
  rates = m;
  const c = await db.query('select * from contract_fx order by project_id, id');
  const cm = {};
  c.rows.forEach((x) => {
    const e = { id: Number(x.id), kind: x.kind, idr: num(x.idr), usd: num(x.usd), cny: num(x.cny), cnh: num(x.cnh), note: x.note || '', by: x.created_by || '', at: x.created_at };
    const p = cm[x.project_id] || (cm[x.project_id] = { history: [] });
    p.history.push(e);
    Object.assign(p, { idr: e.idr, usd: e.usd, cny: e.cny, cnh: e.cnh, kind: e.kind, at: e.at, by: e.by });
  });
  contracts = cm;
  await loadCosts();
  return { months: Object.keys(m).length, contracts: Object.keys(cm).length, fs: Object.keys(fsMap).length };
}

const rnum = (v) => (v === null || v === undefined || v === '' ? null : Number(v) || null);
/** Rupiah = idr + valas × kurs (CNH tanpa kurs memakai kurs CNY). */
function idrOf(v, r) {
  r = r || {};
  return num(v.idr) + num(v.usd) * num(r.usd) + num(v.cny) * num(r.cny) + num(v.cnh) * num(r.cnh || r.cny);
}
async function loadCosts() {
  const fm = {};
  try {
    const f = await db.query('select * from fs_fx');
    f.rows.forEach((x) => {
      const rates = { usd: rnum(x.usd), cny: rnum(x.cny), cnh: rnum(x.cnh) };
      const items = {};
      ITEMS.forEach((k) => {
        const v = (x.items || {})[k];
        if (!v) return;
        const o = { idr: num(v.idr), usd: num(v.usd), cny: num(v.cny), cnh: num(v.cnh) };
        o.total = Math.round(idrOf(o, rates));
        items[k] = o;
      });
      fm[x.project_id] = { rateDate: x.rate_date ? ymd(new Date(x.rate_date)) : '', rates, source: x.rate_source || '', items,
        otherName: x.other_name || '', by: x.updated_by || '', at: x.updated_at };
    });
  } catch (e) { if (!/does not exist/.test(String(e.message))) throw e; }
  const cm = {};
  try {
    const c = await db.query('select * from cost_fx order by project_id, month');
    c.rows.forEach((x) => {
      const p = cm[x.project_id] || (cm[x.project_id] = {});
      const mo = p[x.month] || (p[x.month] = {});
      mo[x.item] = { idr: num(x.idr), usd: num(x.usd), cny: num(x.cny), cnh: num(x.cnh),
        rates: { usd: rnum(x.rate_usd), cny: rnum(x.rate_cny), cnh: rnum(x.rate_cnh) }, total: num(x.total), by: x.updated_by || '', at: x.updated_at };
    });
  } catch (e) { if (!/does not exist/.test(String(e.message))) throw e; }
  fsMap = fm;
  costs = cm;
}

function snapshot() { return { rates, contracts, fs: fsMap, costs }; }
function rateFor(month) {
  if (month && rates[month]) return Object.assign({ month }, rates[month]);
  const keys = Object.keys(rates).filter((k) => rates[k] && rates[k].usd).sort();
  const pick = month ? keys.filter((k) => k <= month).pop() || keys[0] : keys.pop();
  return pick ? Object.assign({ month: pick }, rates[pick]) : null;
}

async function getJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json', 'user-agent': 'pmo-dashboard/1.0' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
/** Ambil angka kurs dari berbagai bentuk jawaban API. */
function pickRate(j) {
  if (!j) return null;
  if (Array.isArray(j)) j = j[j.length - 1];
  if (j && typeof j.rate === 'number') return { rate: j.rate, date: j.date || '' };
  if (j && j.rates && typeof j.rates.IDR === 'number') return { rate: j.rates.IDR, date: j.date || '' };
  if (j && j.rates && Array.isArray(j.rates)) return pickRate(j.rates);
  return null;
}
async function fetchOne(cur, date) {
  const C = cur.toUpperCase();
  const tries = [
    ['BI', `https://api.frankfurter.dev/v2/rate/${C}/IDR?date=${date}&providers=BI`],
    ['frankfurter', `https://api.frankfurter.dev/v2/rate/${C}/IDR?date=${date}`],
    ['ECB (v1)', `https://api.frankfurter.app/${date}?from=${C}&to=IDR`],
  ];
  const errs = [];
  for (const [label, url] of tries) {
    try {
      const x = pickRate(await getJson(url));
      if (x && x.rate > 0) return { rate: x.rate, date: x.date || date, source: label };
      errs.push(label + ': kosong');
    } catch (e) { errs.push(label + ': ' + (e.message || e)); }
  }
  throw new Error(C + ' — ' + errs.join('; '));
}

/** Ambil & simpan kurs untuk bulan 'YYYY-MM' (tanggal akhir bulan, atau hari ini untuk bulan berjalan). */
async function refreshMonth(month) {
  const [y, m] = month.split('-').map(Number);
  const today = new Date();
  const last = new Date(y, m, 0);
  const date = ymd(last < today ? last : today);
  const out = {}, source = {};
  let rateDate = date;
  for (const c of CUR) {
    try {
      const x = await fetchOne(c, date);
      out[c] = x.rate; source[c] = x.source; if (x.date) rateDate = String(x.date).slice(0, 10);
    } catch (e) { source[c] = 'gagal: ' + e.message; out[c] = null; }
  }
  if (!out.cnh && out.cny) { out.cnh = out.cny; source.cnh = 'mengikuti kurs CNY (CNH tidak tersedia)'; }
  if (!out.usd && !out.cny) throw new Error('Kurs ' + month + ' gagal diambil: ' + JSON.stringify(source));
  await db.query(
    `insert into fx_rates (month, usd, cny, cnh, rate_date, source, fetched_at) values ($1,$2,$3,$4,$5,$6,now())
     on conflict (month) do update set usd=excluded.usd, cny=excluded.cny, cnh=excluded.cnh, rate_date=excluded.rate_date, source=excluded.source, fetched_at=now()`,
    [month, out.usd, out.cny, out.cnh, rateDate, JSON.stringify(source)]);
  rates[month] = { usd: out.usd, cny: out.cny, cnh: out.cnh, date: rateDate, source, fetchedAt: new Date() };
  return rates[month];
}

/** Lengkapi kurs: bulan berjalan selalu diperbarui; 24 bulan terakhir diisi bila belum ada. */
async function ensure(onChange) {
  const now = new Date();
  const want = [];
  for (let i = 0; i < 24; i++) want.push(ym(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  let changed = 0;
  for (const mo of want) {
    const have = rates[mo];
    const nextMonth = new Date(Number(mo.slice(0, 4)), Number(mo.slice(5, 7)), 1);
    // bulan berjalan: selalu; bulan lalu: bila belum ada, atau terakhir diambil sebelum bulan itu berakhir
    const stale = !have || !have.usd || mo === want[0] || new Date(have.fetchedAt || 0) < nextMonth;
    if (!stale) continue;
    try { await refreshMonth(mo); changed++; } catch (e) {
      console.warn(JSON.stringify({ ev: 'fx_fetch_fail', month: mo, message: String(e.message || e) }));
      if (/fetch failed|abort/i.test(String(e.message))) break; // jaringan tidak tersedia: coba lagi di putaran berikutnya
    }
  }
  if (changed) { console.log(JSON.stringify({ ev: 'fx_rates', updated: changed })); if (onChange) onChange(); }
  return changed;
}

function start(onChange) {
  if (timer) return;
  setTimeout(() => ensure(onChange).catch(() => {}), 15000);
  timer = setInterval(() => ensure(onChange).catch(() => {}), 6 * 3600e3);
  if (timer.unref) timer.unref();
}

async function saveContract(projectId, kind, v, actor, note) {
  const row = { idr: Math.max(0, num(v.idr)), usd: Math.max(0, num(v.usd)), cny: Math.max(0, num(v.cny)), cnh: Math.max(0, num(v.cnh)) };
  await db.query('insert into contract_fx (project_id, kind, idr, usd, cny, cnh, note, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8)',
    [projectId, kind === 'ADD' ? 'ADD' : 'BASE', row.idr, row.usd, row.cny, row.cnh, String(note || '').slice(0, 300), actor || null]);
  await load();
  return contracts[projectId];
}

/** Nilai Rupiah kontrak pada kurs bulan tertentu (null bila tidak ada komponen valas). */
function toIdr(projectId, month) {
  const c = contracts[projectId];
  if (!c || !(c.usd || c.cny || c.cnh)) return null;
  const r = rateFor(month);
  if (!r) return null;
  return c.idr + c.usd * (r.usd || 0) + c.cny * (r.cny || 0) + c.cnh * (r.cnh || r.cny || 0);
}

/** Kurs pada tanggal tertentu (untuk kurs FS). Disimpan di memori; tidak ditulis ke fx_rates. */
async function rateOn(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) throw new Error('Tanggal kurs tidak valid.');
  if (dayCache[date]) return dayCache[date];
  const out = { date }, source = {};
  for (const c of CUR) {
    try {
      const x = await fetchOne(c, date);
      out[c] = x.rate; source[c] = x.source; if (x.date) out.date = String(x.date).slice(0, 10);
    } catch (e) { out[c] = null; source[c] = 'gagal'; }
  }
  if (!out.cnh && out.cny) { out.cnh = out.cny; source.cnh = 'mengikuti kurs CNY'; }
  if (!out.usd && !out.cny) throw new Error('Kurs tanggal ' + date + ' belum bisa diambil. Isi kurs FS secara manual.');
  out.source = source.usd || source.cny || '';
  dayCache[date] = out;
  return out;
}

const cleanVal = (v) => {
  const o = {};
  ['idr', 'usd', 'cny', 'cnh'].forEach((k) => {
    const n = v && v[k] !== undefined && v[k] !== null && v[k] !== '' ? Number(v[k]) : 0;
    if (!Number.isFinite(n) || n < 0) throw new Error('Nilai per mata uang harus angka positif.');
    o[k] = n;
  });
  return o;
};
const cleanRates = (r, need, label) => {
  const o = {};
  CUR.forEach((k) => {
    const n = r && r[k] !== undefined && r[k] !== null && r[k] !== '' ? Number(r[k]) : null;
    if (n !== null && (!Number.isFinite(n) || n <= 0)) throw new Error('Kurs ' + k.toUpperCase() + ' tidak valid.');
    o[k] = n;
  });
  if (!o.cnh && o.cny) o.cnh = null; // dihitung memakai kurs CNY
  need.forEach((k) => { if (!o[k] && !(k === 'cnh' && o.cny)) throw new Error('Kurs ' + k.toUpperCase() + ' ' + label + ' wajib diisi karena ada nilai dalam ' + k.toUpperCase() + '.'); });
  return o;
};
const usedCur = (items) => CUR.filter((k) => Object.values(items).some((v) => v && v[k] > 0));

/** Simpan nilai FS per mata uang (kurs FS tetap). */
async function saveFs(projectId, b, actor) {
  const items = {};
  ITEMS.forEach((k) => { if (b.items && b.items[k]) items[k] = cleanVal(b.items[k]); });
  const rates = cleanRates(b.rates || {}, usedCur(items), 'FS');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.rateDate || '')) ? b.rateDate : null;
  if (usedCur(items).length && !date) throw new Error('Tanggal kurs FS wajib diisi.');
  await db.query(
    `insert into fs_fx (project_id, rate_date, usd, cny, cnh, rate_source, items, other_name, updated_by, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
     on conflict (project_id) do update set rate_date=excluded.rate_date, usd=excluded.usd, cny=excluded.cny, cnh=excluded.cnh,
       rate_source=excluded.rate_source, items=excluded.items, other_name=excluded.other_name, updated_by=excluded.updated_by, updated_at=now()`,
    [projectId, date, rates.usd, rates.cny, rates.cnh, String(b.rateSource || '').slice(0, 40), JSON.stringify(items),
      String(b.otherName || '').trim().slice(0, 80), actor || null]);
  await loadCosts();
  return fsMap[projectId] || null;
}

/** Simpan realisasi satu bulan per pos dan mata uang. Nilai Rupiah dihitung dengan kurs bulan itu. */
async function saveCost(projectId, month, b, actor) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ''))) throw new Error('Bulan realisasi tidak valid.');
  const items = {};
  ITEMS.forEach((k) => { if (b.items && b.items[k]) items[k] = cleanVal(b.items[k]); });
  const rates = cleanRates(b.rates || {}, usedCur(items), month);
  const client = await db.pool.connect();
  try {
    await client.query('begin');
    for (const k of Object.keys(items)) {
      const v = items[k];
      const total = Math.round(idrOf(v, rates));
      await client.query(
        `insert into cost_fx (project_id, month, item, idr, usd, cny, cnh, rate_usd, rate_cny, rate_cnh, total, updated_by, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
         on conflict (project_id, month, item) do update set idr=excluded.idr, usd=excluded.usd, cny=excluded.cny, cnh=excluded.cnh,
           rate_usd=excluded.rate_usd, rate_cny=excluded.rate_cny, rate_cnh=excluded.rate_cnh, total=excluded.total,
           updated_by=excluded.updated_by, updated_at=now()`,
        [projectId, month, k, v.idr, v.usd, v.cny, v.cnh, rates.usd, rates.cny, rates.cnh, total, actor || null]);
    }
    await client.query('commit');
  } catch (e) { await client.query('rollback').catch(() => {}); throw e; } finally { client.release(); }
  await loadCosts();
  return (costs[projectId] || {})[month] || null;
}

module.exports = { load, snapshot, rateFor, rateOn, refreshMonth, ensure, start, saveContract, saveFs, saveCost, toIdr, idrOf, CUR };

'use strict';

/**
 * Penyimpanan permanen untuk lapisan kompatibilitas:
 *   gas_sheets : satu baris per sheet (isi lengkap dalam jsonb)
 *   gas_props  : PropertiesService
 * Seluruh data dimuat ke memori saat start; perubahan ditulis balik setelah setiap permintaan.
 */

const db = require('../db');
const { Workbook, SheetData, hooks, displayOf } = require('./sheets');
const formula = require('./formula');

// ---------------------------------------------------------------- mesin rumus
// Setelah ada sel yang ditulis, semua rumus dihitung ulang sebelum data dibaca lagi
// (sama seperti Google Sheets). Hitung ulang penuh ±0,15 detik untuk 12.700 rumus.
const astCache = new Map();
const pending = new WeakSet();
function recalcNow(book) {
  pending.delete(book);
  const r = formula.recalc(book, { astCache });
  const changed = formula.apply(r.results, displayOf);
  if (r.unsupported.length) {
    console.warn(JSON.stringify({ ev: 'formula_unsupported', count: r.unsupported.length, first: r.unsupported[0] }));
  }
  return { computed: r.computed, changed, unsupported: r.unsupported.length };
}
hooks.onWrite = (book) => { pending.add(book); };
hooks.beforeRead = (book) => { if (pending.has(book)) recalcNow(book); };
hooks.onShift = (book, sheet, axis, at, delta) => { formula.shiftRefs(book, sheet, axis, at, delta); };

const MAIN_ID = process.env.GAS_SPREADSHEET_ID || '1OVqQZQ9MfBVQl1O2d6VpxQ385wNaGzfJOC-8LduHvcE';

const state = {
  books: new Map(),   // id -> Workbook
  props: new Map(),   // key -> value (script properties)
  propsDirty: new Set(),
  propsDeleted: new Set(),
  loadedAt: null,
};

async function ensureTables() {
  await db.query(`
    create table if not exists gas_sheets (
      spreadsheet_id text not null,
      name           text not null,
      position       integer not null default 0,
      data           jsonb not null,
      updated_at     timestamptz not null default now(),
      primary key (spreadsheet_id, name)
    );
    create table if not exists gas_props (
      key        text primary key,
      value      text not null,
      updated_at timestamptz not null default now()
    );
    create table if not exists gas_imports (
      id          bigserial primary key,
      at          timestamptz not null default now(),
      actor       text,
      file_name   text,
      sheet_count integer,
      note        text
    );
  `);
}

async function load() {
  await ensureTables();
  state.books.clear();
  const rows = await db.query('select spreadsheet_id, data from gas_sheets order by spreadsheet_id, position');
  for (const r of rows.rows) {
    let book = state.books.get(r.spreadsheet_id);
    if (!book) { book = new Workbook(r.spreadsheet_id, 'PMO DASHBOARD'); state.books.set(r.spreadsheet_id, book); }
    const d = SheetData.fromJSON(r.data);
    book.sheets.set(d.name, d);
  }
  if (!state.books.has(MAIN_ID)) state.books.set(MAIN_ID, new Workbook(MAIN_ID, 'PMO DASHBOARD'));
  state.props.clear();
  const p = await db.query('select key, value from gas_props');
  p.rows.forEach((x) => state.props.set(x.key, x.value));
  state.loadedAt = new Date();
  return summary();
}

function summary() {
  const book = state.books.get(MAIN_ID);
  return { sheets: book ? book.sheets.size : 0, props: state.props.size, loadedAt: state.loadedAt };
}

function book(id) {
  return state.books.get(id || MAIN_ID) || null;
}

let chain = Promise.resolve();
/** Tulis semua sheet/properti yang berubah. Dipanggil setelah setiap pemanggilan fungsi lama.
 *  Antre satu per satu supaya tulisan lama tidak menimpa yang lebih baru. */
function flush() {
  const run = chain.then(flushNow, flushNow);
  chain = run.catch(() => {});
  return run;
}

async function flushNow() {
  for (const b of state.books.values()) if (pending.has(b)) recalcNow(b);
  const jobs = [];
  for (const b of state.books.values()) {
    for (const d of b.dirtySheets()) {
      const json = JSON.stringify(d.toJSON());
      d.dirty = false;
      jobs.push(db.query(
        `insert into gas_sheets (spreadsheet_id, name, position, data, updated_at)
         values ($1, $2, $3, $4::jsonb, now())
         on conflict (spreadsheet_id, name) do update set position = excluded.position, data = excluded.data, updated_at = now()`,
        [b.id, d.name, d.index, json]
      ));
    }
    for (const name of b.deleted) {
      if (!b.sheets.has(name)) jobs.push(db.query('delete from gas_sheets where spreadsheet_id = $1 and name = $2', [b.id, name]));
    }
    b.deleted.clear();
  }
  for (const k of state.propsDirty) {
    if (state.props.has(k)) {
      jobs.push(db.query(
        `insert into gas_props (key, value, updated_at) values ($1, $2, now())
         on conflict (key) do update set value = excluded.value, updated_at = now()`,
        [k, state.props.get(k)]
      ));
    }
  }
  for (const k of state.propsDeleted) jobs.push(db.query('delete from gas_props where key = $1', [k]));
  state.propsDirty.clear();
  state.propsDeleted.clear();
  await Promise.all(jobs);
  return jobs.length;
}

/** Ganti seluruh isi spreadsheet utama dengan hasil impor .xlsx. */
async function replaceMain(sheets, actor, fileName) {
  const client = await db.pool.connect();
  try {
    await client.query('begin');
    await client.query('delete from gas_sheets where spreadsheet_id = $1', [MAIN_ID]);
    for (const d of sheets) {
      await client.query(
        'insert into gas_sheets (spreadsheet_id, name, position, data) values ($1, $2, $3, $4::jsonb)',
        [MAIN_ID, d.name, d.index, JSON.stringify(d.toJSON())]
      );
    }
    await client.query('insert into gas_imports (actor, file_name, sheet_count) values ($1, $2, $3)', [actor || null, fileName || null, sheets.length]);
    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
  const b = new Workbook(MAIN_ID, 'PMO DASHBOARD');
  sheets.forEach((d) => { d.dirty = false; b.sheets.set(d.name, d); });
  state.books.set(MAIN_ID, b);
  state.loadedAt = new Date();
}

async function lastImport() {
  const r = await db.query('select at, actor, file_name, sheet_count from gas_imports order by id desc limit 1');
  return r.rows[0] || null;
}

/** Kembalikan sheet yang berubah ke isi terakhir di database (dipakai mode baca-saja). */
async function revertDirty() {
  const names = [];
  for (const b of state.books.values()) {
    for (const d of b.dirtySheets()) {
      if (writableInReadOnly(d.name)) continue;
      const r = await db.query('select data from gas_sheets where spreadsheet_id = $1 and name = $2', [b.id, d.name]);
      if (r.rows.length) b.sheets.set(d.name, SheetData.fromJSON(r.rows[0].data));
      else b.sheets.delete(d.name);
      names.push(d.name);
    }
    // sheet yang dihapus/diganti nama: muat ulang seluruh buku dari database
    if (b.deleted.size) { b.deleted.clear(); names.push('*'); }
  }
  if (names.includes('*')) await load();
  return names;
}

// Sheet catatan yang tetap boleh ditulis dalam mode baca-saja (tidak memengaruhi angka dashboard).
// Isinya akan tertimpa saat sinkron berikutnya dari Google Sheets.
const READONLY_WRITABLE = (process.env.GAS_READONLY_WRITABLE || 'AI_LOG').split(',').map((x) => x.trim()).filter(Boolean);
function writableInReadOnly(name) { return READONLY_WRITABLE.includes(name); }

/**
 * Mode data (diganti Admin di halaman Impor Data, disimpan di gas_props 'SYS:MODE'):
 *   baca     : server hanya menampilkan; data mengikuti Google Sheets (sinkron otomatis)
 *   uji      : input di server aktif untuk uji coba; sinkron otomatis berhenti;
 *              data bisa dikembalikan ke versi Google Sheets kapan saja
 *   produksi : server menjadi sumber data utama; sinkron dan impor dimatikan
 * GAS_READONLY=0 di lingkungan = bawaan 'produksi' (untuk kompatibilitas).
 */
const MODES = ['baca', 'uji', 'produksi'];
function mode() {
  const m = state.props.get('SYS:MODE');
  if (MODES.includes(m)) return m;
  return process.env.GAS_READONLY === '0' ? 'produksi' : 'baca';
}
async function setMode(m, actor) {
  if (!MODES.includes(m)) throw new Error('Mode tidak dikenal.');
  await db.query(
    `insert into gas_props (key, value, updated_at) values ('SYS:MODE', $1, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`, [m]);
  state.props.set('SYS:MODE', m);
  console.log(JSON.stringify({ ev: 'gas_mode', mode: m, actor: actor || null }));
}
function readOnly() {
  return mode() === 'baca';
}

function introEnabled() {
  return state.props.get('SYS:INTRO') !== '0';
}

async function setIntroEnabled(on, actor) {
  const val = on ? '1' : '0';
  await db.query(
    `insert into gas_props (key, value, updated_at) values ('SYS:INTRO', $1, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`, [val]);
  state.props.set('SYS:INTRO', val);
  console.log(JSON.stringify({ ev: 'gas_intro', enabled: !!on, actor: actor || null }));
}

module.exports = { state, load, flush, recalcNow, revertDirty, readOnly, mode, setMode, MODES, introEnabled, setIntroEnabled, writableInReadOnly, book, replaceMain, lastImport, summary, MAIN_ID, ensureTables };

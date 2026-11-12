'use strict';

/**
 * Memuat semua berkas CSV hasil export-csv.gs ke skema staging "stg".
 *
 * Pakai di dalam container aplikasi:
 *   node src/load-csv.js /tmp/csv
 *
 * Aturan:
 * - Satu berkas CSV menjadi satu tabel: "DATA MINGGUAN PROYEK.csv" -> stg.data_mingguan_proyek
 * - Baris pertama dianggap judul kolom: "PROYEK_ID" -> proyek_id, "WEEK 12" -> week_12
 * - Semua kolom bertipe teks. Pengolahan angka dilakukan di 10-core-from-staging.sql.
 * - Aman diulang: tabel stg yang sama dihapus lalu dibuat ulang.
 */

const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');

function normName(s, fallback) {
  const out = String(s || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!out) return fallback;
  return /^[0-9]/.test(out) ? 'c_' + out : out.slice(0, 60);
}

/** Parser CSV sederhana (RFC 4180): tanda kutip, koma, dan baris baru di dalam sel. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else { q = false; }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      q = true;
    } else if (c === ',') {
      row.push(cell); cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else {
      cell += c;
    }
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function uniqueCols(header) {
  const seen = new Map();
  return header.map((h, i) => {
    let name = normName(h, 'kolom_' + (i + 1));
    const n = seen.get(name) || 0;
    seen.set(name, n + 1);
    if (n > 0) name = name + '_' + (n + 1);
    return name;
  });
}

async function loadFile(file) {
  const table = normName(path.basename(file, path.extname(file)), 'sheet');
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  if (!rows.length) return { table, rows: 0, cols: 0, note: 'kosong' };

  const cols = uniqueCols(rows[0]);
  const data = rows.slice(1).filter((r) => r.some((v) => String(v).trim() !== ''));

  const client = await db.pool.connect();
  try {
    await client.query('begin');
    await client.query(`drop table if exists stg."${table}"`);
    await client.query(`create table stg."${table}" (${cols.map((c) => `"${c}" text`).join(', ')})`);

    // Sisipkan per kelompok supaya tidak melewati batas 65.535 parameter.
    const perBatch = Math.max(1, Math.floor(60000 / cols.length));
    for (let s = 0; s < data.length; s += perBatch) {
      const chunk = data.slice(s, s + perBatch);
      const params = [];
      const tuples = chunk.map((r) => {
        const ph = cols.map((_, j) => {
          params.push(r[j] === undefined ? '' : r[j]);
          return '$' + params.length;
        });
        return '(' + ph.join(',') + ')';
      });
      await client.query(
        `insert into stg."${table}" (${cols.map((c) => `"${c}"`).join(',')}) values ${tuples.join(',')}`,
        params
      );
    }
    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
  return { table, rows: data.length, cols: cols.length };
}

async function run(dir) {
  if (!dir || !fs.existsSync(dir)) {
    console.error('Pakai: node src/load-csv.js <folder berisi file .csv>');
    process.exit(1);
  }
  const files = fs.readdirSync(dir).filter((f) => /\.csv$/i.test(f)).sort();
  if (!files.length) {
    console.error('Tidak ada file .csv di ' + dir);
    process.exit(1);
  }
  await db.query('create schema if not exists stg');
  let gagal = 0;
  for (const f of files) {
    try {
      const r = await loadFile(path.join(dir, f));
      console.log(`OK    ${f}  ->  stg.${r.table}  (${r.rows} baris, ${r.cols} kolom)`);
    } catch (err) {
      gagal++;
      console.log(`GAGAL ${f}: ${err.message || err}`);
    }
  }
  console.log(gagal ? `Selesai dengan ${gagal} file gagal.` : 'Selesai, semua file termuat.');
  await db.close();
}

if (require.main === module) {
  run(process.argv[2]).catch((err) => {
    console.error('Gagal:', err.message || err);
    process.exit(1);
  });
}

module.exports = { parseCsv, normName, uniqueCols, loadFile };

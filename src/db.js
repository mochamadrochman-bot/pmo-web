'use strict';

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL belum diisi. Lihat .env.example.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error(JSON.stringify({ ev: 'pg_pool_error', message: String(err.message || err) }));
});

async function query(text, params) {
  const started = Date.now();
  const res = await pool.query(text, params);
  const ms = Date.now() - started;
  if (ms > 500) {
    console.warn(JSON.stringify({ ev: 'slow_query', ms, text: text.slice(0, 120) }));
  }
  return res;
}

async function health() {
  const res = await pool.query('select 1 as ok');
  return res.rows[0].ok === 1;
}

async function close() {
  await pool.end();
}

module.exports = { pool, query, health, close };

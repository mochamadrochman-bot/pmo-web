'use strict';

const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');

/**
 * Menjalankan db/schema.sql saat aplikasi start.
 * Semua perintah di skema memakai IF NOT EXISTS, jadi aman dijalankan berulang.
 * Matikan dengan AUTO_MIGRATE=0 kalau nanti migrasi dikelola tool lain.
 */
async function migrate() {
  if (process.env.AUTO_MIGRATE === '0') {
    console.log(JSON.stringify({ ev: 'migrate_skip' }));
    return;
  }
  const file = path.join(__dirname, '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(file, 'utf8');
  await db.query(sql);
  console.log(JSON.stringify({ ev: 'migrate_ok' }));
}

module.exports = { migrate };

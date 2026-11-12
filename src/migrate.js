'use strict';

const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');

/**
 * Menjalankan db/schema.sql lalu semua berkas db/migrations/*.sql (urut nama) saat aplikasi start.
 * Semua perintah ditulis aman diulang (IF NOT EXISTS, update bersyarat).
 *
 * db/10-core-from-staging.sql SENGAJA tidak ikut: berkas itu mengosongkan data proyek
 * dan hanya dijalankan manual saat pemindahan data dari Google Sheets.
 *
 * Matikan dengan AUTO_MIGRATE=0 kalau nanti migrasi dikelola tool lain.
 */
async function migrate() {
  if (process.env.AUTO_MIGRATE === '0') {
    console.log(JSON.stringify({ ev: 'migrate_skip' }));
    return;
  }
  const root = path.join(__dirname, '..', 'db');
  const files = [path.join(root, 'schema.sql')];
  const dir = path.join(root, 'migrations');
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .forEach((f) => files.push(path.join(dir, f)));
  }
  for (const file of files) {
    await db.query(fs.readFileSync(file, 'utf8'));
    console.log(JSON.stringify({ ev: 'migrate_ok', file: path.basename(file) }));
  }
}

module.exports = { migrate };

'use strict';

/**
 * Tabel Postgres `projects` (dipakai Kelola Akun & validasi akses) dulu hanya diisi sekali dari data awal,
 * sehingga proyek yang ditambah lewat Tambah/Edit Proyek tidak muncul di Kelola Akun.
 * Fungsi ini menyalin daftar proyek dari spreadsheet (DATA MINGGUAN PROYEK / DATA BULANAN) ke tabel itu:
 * proyek baru ditambahkan, nama yang berubah diperbarui. Tidak ada proyek yang dihapus.
 */
const db = require('../db');

function sheetProjects() {
  const gasRuntime = require('../gas/runtime');
  const { exported } = gasRuntime.createScope({ user: null, appUrl: '', onLogout() {} });
  const d = exported.loadDb_();
  return (d.allProjects || []).map((p) => ({ id: String(p.id || '').trim(), name: String(p.fullName || p.name || p.id || '').trim() })).filter((p) => p.id);
}

async function syncProjects() {
  let list;
  try { list = sheetProjects(); } catch (e) { return { ok: false, error: String(e.message || e) }; }
  let added = 0;
  for (const p of list) {
    const r = await db.query(
      `insert into projects (id, name, status) values ($1, $2, 'aktif')
       on conflict (id) do update set name = excluded.name, updated_at = now() where projects.name is distinct from excluded.name
       returning (xmax = 0) as inserted`, [p.id, p.name || p.id]);
    if (r.rows[0] && r.rows[0].inserted) added++;
  }
  if (added) console.log(JSON.stringify({ ev: 'projects_sync', added, total: list.length }));
  return { ok: true, added, total: list.length };
}

module.exports = { syncProjects, sheetProjects };

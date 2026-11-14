'use strict';

/**
 * Kelompok proyek (tabel project_groups), disimpan juga di memori supaya kode lama
 * bisa membacanya tanpa query.
 *   PENGEMBANGAN : proyek investasi pengembangan (bawaan bila belum diatur)
 *   RUTIN        : proyek investasi rutin
 *   SUB          : sub-proyek; parent_id = ID proyek Pengembangan induknya
 * Perhitungan tiap proyek tetap sendiri-sendiri; kelompok hanya untuk pengelompokan tampilan.
 */

const db = require('../db');

const TYPES = ['PENGEMBANGAN', 'RUTIN', 'SUB'];
let map = {};

async function load() {
  const r = await db.query('select project_id, group_type, parent_id from project_groups');
  const m = {};
  r.rows.forEach((x) => { m[x.project_id] = { type: x.group_type, parent: x.parent_id || null }; });
  map = m;
  return Object.keys(m).length;
}

function get(id) {
  return map[id] || { type: 'PENGEMBANGAN', parent: null };
}

function all() {
  return JSON.parse(JSON.stringify(map));
}

/**
 * rows: [{ id, type, parent }]. knownIds: ID proyek yang valid.
 * Mengembalikan { error } atau { saved }.
 */
async function save(rows, knownIds, actor) {
  const known = new Set(knownIds);
  const clean = [];
  for (const x of Array.isArray(rows) ? rows : []) {
    const id = String(x && x.id || '').trim();
    const type = String(x && x.type || '').trim().toUpperCase();
    const parent = type === 'SUB' ? String(x.parent || '').trim() : null;
    if (!known.has(id)) return { error: 'Proyek tidak dikenal: ' + id };
    if (!TYPES.includes(type)) return { error: 'Tipe tidak dikenal untuk ' + id + '.' };
    clean.push({ id, type, parent });
  }
  const typeOf = {};
  Object.keys(map).forEach((k) => { typeOf[k] = map[k].type; });
  clean.forEach((x) => { typeOf[x.id] = x.type; });
  for (const x of clean) {
    if (x.type !== 'SUB') continue;
    if (!x.parent) return { error: 'Pilih proyek induk untuk sub-proyek ' + x.id + '.' };
    if (x.parent === x.id) return { error: x.id + ' tidak bisa menjadi induk dirinya sendiri.' };
    if (!known.has(x.parent)) return { error: 'Proyek induk tidak dikenal: ' + x.parent };
    if ((typeOf[x.parent] || 'PENGEMBANGAN') !== 'PENGEMBANGAN') {
      return { error: 'Induk untuk ' + x.id + ' harus proyek Pengembangan.' };
    }
  }
  const client = await db.pool.connect();
  try {
    await client.query('begin');
    for (const x of clean) {
      await client.query(
        `insert into project_groups (project_id, group_type, parent_id, updated_at, updated_by)
         values ($1, $2, $3, now(), $4)
         on conflict (project_id) do update set group_type = excluded.group_type,
           parent_id = excluded.parent_id, updated_at = now(), updated_by = excluded.updated_by`,
        [x.id, x.type, x.parent, actor || null]
      );
    }
    await client.query('commit');
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  await load();
  return { saved: clean.length };
}

/**
 * Simpan satu proyek dari menu Tambah/Edit Proyek (kode lama berjalan sinkron).
 * Peta di memori langsung diperbarui; penulisan ke database ditunggu lewat settle().
 * allIds: semua ID proyek. Mengembalikan pesan galat atau null.
 */
const pending = [];
function check(id, type, parent, allIds) {
  if (!TYPES.includes(type)) return 'Kelompok proyek tidak dikenal.';
  if (type === 'SUB') {
    if (!parent) return 'Pilih proyek induk untuk sub-proyek.';
    if (parent === id) return 'Proyek tidak bisa menjadi induk dirinya sendiri.';
    if (allIds && !allIds.includes(parent)) return 'Proyek induk tidak dikenal: ' + parent;
    if (get(parent).type !== 'PENGEMBANGAN') return 'Proyek induk harus proyek Pengembangan.';
  }
  if (type !== 'PENGEMBANGAN') {
    const kids = Object.keys(map).filter((k) => map[k].type === 'SUB' && map[k].parent === id);
    if (kids.length) return 'Proyek ini masih menjadi induk dari ' + kids.join(', ') + '. Pindahkan sub-proyeknya dulu, atau tetap pilih Pengembangan.';
  }
  return null;
}
function setSync(id, type, parent, actor) {
  const p = type === 'SUB' ? parent : null;
  map[id] = { type, parent: p };
  pending.push({ id, type, parent: p, actor: actor || null });
}
/** Menulis perubahan setSync ke database (dipanggil setelah pemanggilan kode lama selesai). */
async function settle() {
  const ops = pending.splice(0);
  for (const x of ops) {
    await db.query(
      `insert into project_groups (project_id, group_type, parent_id, updated_at, updated_by)
       values ($1, $2, $3, now(), $4)
       on conflict (project_id) do update set group_type = excluded.group_type,
         parent_id = excluded.parent_id, updated_at = now(), updated_by = excluded.updated_by`,
      [x.id, x.type, x.parent, x.actor]
    );
  }
}
/** Membatalkan perubahan setSync yang belum ditulis (mis. penyimpanan proyek ditolak). */
async function discard() {
  if (!pending.length) return;
  pending.splice(0);
  await load();
}

/** Pulihkan seluruh peta kelompok proyek dari file backup. */
async function replaceAll(groupMap, actor) {
  if (!groupMap || typeof groupMap !== 'object') return;
  const rows = Object.keys(groupMap).map((id) => {
    const g = groupMap[id] || {};
    const t = TYPES.includes(String(g.type || '').toUpperCase()) ? String(g.type).toUpperCase() : 'PENGEMBANGAN';
    return { id: String(id).trim(), type: t, parent: t === 'SUB' && g.parent ? String(g.parent).trim() : null };
  }).filter((r) => r.id);
  const client = await db.pool.connect();
  try {
    await client.query('begin');
    await client.query('delete from project_groups');
    for (const r of rows) {
      await client.query(
        'insert into project_groups (project_id, group_type, parent_id, updated_at, updated_by) values ($1, $2, $3, now(), $4)',
        [r.id, r.type, r.parent, actor || null]
      );
    }
    await client.query('commit');
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  await load();
}

module.exports = { load, get, all, save, check, setSync, settle, discard, replaceAll, TYPES };

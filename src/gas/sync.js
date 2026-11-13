'use strict';

/**
 * Sinkron spreadsheet PMO DASHBOARD dari Google Sheets ke server.
 *
 * - Cek waktu ubah terakhir spreadsheet (Drive API). Kalau sama dengan sinkron terakhir, lewati.
 * - Kalau berubah, unduh sebagai .xlsx lalu impor (sama seperti menu Impor Data).
 * - Berjalan otomatis tiap GAS_SYNC_MINUTES menit (bawaan 15; 0 = mati), hanya selama
 *   mode baca-saja aktif. Setelah input pindah ke server baru, sinkron otomatis harus mati
 *   supaya data server tidak tertimpa.
 */

const db = require('../db');
const store = require('./store');
const gauth = require('../google/auth');
const { parseWorkbook } = require('./xlsx-import');
const { clearCache } = require('./services');

const API = process.env.GOOGLE_DRIVE_API || 'https://www.googleapis.com/drive/v3';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const state = { running: false, lastCheck: null, lastResult: null, timer: null };

async function lastSyncedModified() {
  const r = await db.query("select note from gas_imports where note like 'modified:%' order by id desc limit 1");
  return r.rows[0] ? r.rows[0].note.slice('modified:'.length) : null;
}

async function api(path, token) {
  const res = await fetch(API + path, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) {
    let msg = 'HTTP ' + res.status;
    try { msg = (await res.json()).error.message; } catch (e) { /* biarkan */ }
    throw new Error('Google Drive: ' + msg);
  }
  return res;
}

/**
 * opts: { force, actor }
 * Mengembalikan { status: 'synced' | 'unchanged' | 'skipped', ... }
 */
async function syncNow(opts) {
  const o = opts || {};
  if (state.running) return { status: 'skipped', reason: 'Sinkron sebelumnya masih berjalan.' };
  if (!gauth.status().connected) return { status: 'skipped', reason: 'Akun Google belum dihubungkan.' };
  state.running = true;
  state.lastCheck = new Date();
  const started = Date.now();
  try {
    const token = gauth.accessTokenSync();
    const meta = await (await api('/files/' + store.MAIN_ID + '?fields=modifiedTime,name&supportsAllDrives=true', token)).json();
    const prev = await lastSyncedModified();
    if (!o.force && prev && prev === meta.modifiedTime) {
      state.lastResult = { status: 'unchanged', modifiedTime: meta.modifiedTime, at: new Date() };
      return state.lastResult;
    }
    const res = await api('/files/' + store.MAIN_ID + '/export?mimeType=' + encodeURIComponent(XLSX_MIME), token);
    const buf = Buffer.from(await res.arrayBuffer());
    const sheets = parseWorkbook(buf);
    const names = sheets.map((d) => d.name);
    if (!names.includes('DATA MINGGUAN PROYEK') || !names.includes('DATA BULANAN')) {
      throw new Error('Isi spreadsheet tidak dikenali (sheet DATA MINGGUAN PROYEK / DATA BULANAN tidak ada).');
    }
    await store.replaceMain(sheets, o.actor || 'sinkron-otomatis', (meta.name || 'PMO DASHBOARD') + ' (Google Sheets)');
    await db.query("update gas_imports set note = $1 where id = (select max(id) from gas_imports)", ['modified:' + meta.modifiedTime]);
    clearCache();
    state.lastResult = { status: 'synced', modifiedTime: meta.modifiedTime, sheets: sheets.length, ms: Date.now() - started, at: new Date() };
    console.log(JSON.stringify({ ev: 'gas_sync', ...state.lastResult }));
    return state.lastResult;
  } catch (err) {
    state.lastResult = { status: 'error', error: String(err.message || err), at: new Date() };
    console.error(JSON.stringify({ ev: 'gas_sync_fail', message: state.lastResult.error }));
    throw err;
  } finally {
    state.running = false;
  }
}

function minutes() {
  const m = Number(process.env.GAS_SYNC_MINUTES === undefined ? 15 : process.env.GAS_SYNC_MINUTES);
  return Number.isFinite(m) && m > 0 ? m : 0;
}

function autoEnabled() {
  return minutes() > 0 && store.readOnly();
}

function start() {
  if (state.timer) clearInterval(state.timer);
  if (!autoEnabled()) return false;
  state.timer = setInterval(() => {
    syncNow({ actor: 'sinkron-otomatis' }).catch(() => { /* sudah dicatat */ });
  }, minutes() * 60 * 1000);
  state.timer.unref();
  // Sinkron pertama sesaat setelah server menyala.
  setTimeout(() => syncNow({ actor: 'sinkron-otomatis' }).catch(() => {}), 20 * 1000).unref();
  return true;
}

function info() {
  return { auto: autoEnabled(), minutes: minutes(), running: state.running, lastCheck: state.lastCheck, lastResult: state.lastResult };
}

module.exports = { syncNow, start, info };

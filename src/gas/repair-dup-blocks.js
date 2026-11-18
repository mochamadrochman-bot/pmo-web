'use strict';

/**
 * Perbaikan sekali jalan (18 Nov 2026) untuk akibat bug Range.copyTo(PASTE_FORMAT) lama.
 *
 * Bug: copyTo menyalin NILAI, bukan hanya format. Saat Tambah Proyek, baris blok proyek baru di
 * DATA MINGGUAN PROYEK / DATA BULANAN ikut tertimpa isi baris contoh (proyek pertama, mis. DERMAGA_A),
 * sehingga blok proyek baru berubah menjadi blok "DERMAGA_A" ganda di bawah sheet dan proyek baru tidak muncul.
 *
 * Perbaikan: di kedua sheet itu, baris paling bawah yang pasangan PROYEK_ID + ITEM_DATA-nya sudah ada di atas
 * (duplikat) dihapus — hanya bila SEMUA baris berisi dari duplikat pertama sampai akhir sheet adalah duplikat
 * (blok ganda di ekor sheet). Pembaca data selalu memakai baris pertama, jadi dashboard tidak berubah.
 * Aman dijalankan berulang: bila tidak ada blok ganda di ekor, tidak ada yang diubah.
 */

const SHEETS = ['DATA MINGGUAN PROYEK', 'DATA BULANAN'];
const norm = (v) => String(v == null ? '' : v).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

function repairSheet(d) {
  const V = d.values || [];
  let header = -1;
  for (let r = 0; r < Math.min(V.length, 30); r++) if (norm(d.getDisplay(r, 0) || d.get(r, 0)) === 'PROYEK_ID') { header = r; break; }
  if (header < 0) return null;
  const seen = new Set();
  let firstDup = -1, lastData = -1;
  for (let r = header + 1; r < V.length; r++) {
    const id = norm(d.get(r, 0)), item = norm(d.get(r, 3));
    if (!id || !item) continue;
    lastData = r;
    const k = id + '|' + item;
    if (seen.has(k)) { if (firstDup < 0) firstDup = r; }
    else { seen.add(k); if (firstDup >= 0) return { skipped: 'duplikat tidak di ekor sheet', at: firstDup + 1 }; }
  }
  if (firstDup < 0) return null;
  const n = lastData - firstDup + 1;
  const ids = new Set();
  for (let r = firstDup; r <= lastData; r++) if (norm(d.get(r, 0))) ids.add(norm(d.get(r, 0)));
  d.deleteRows(firstDup, n);
  return { removed: n, fromRow: firstDup + 1, ids: [...ids] };
}

/** Jalankan pada workbook utama; kembalikan ringkasan. Pemanggil yang menyimpan (store.flush). */
function run(store) {
  const out = [];
  for (const b of store.state.books.values()) {
    for (const name of SHEETS) {
      const d = b.sheets.get(name);
      if (!d) continue;
      const r = repairSheet(d);
      if (r) out.push(Object.assign({ sheet: name }, r));
    }
  }
  return out;
}

module.exports = { run, repairSheet };

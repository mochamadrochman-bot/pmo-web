'use strict';

/**
 * Pengurai angka dan persen.
 *
 * Dibuat dari toNumber_ dan weekPercent_ di Code.js, dengan dua perbaikan yang
 * disengaja:
 *   1. "Rp 1.500.000" dan "1.500.000" kini terbaca 1500000. Versi lama
 *      menghasilkan null untuk yang pertama dan NaN untuk yang kedua.
 *   2. "0,9533" terbaca 0,9533 (desimal), bukan 9533.
 *
 * Aturan yang dipakai, dan alasannya:
 *   - jika ada titik dan koma, pemisah yang muncul TERAKHIR adalah desimal
 *   - jika hanya satu jenis pemisah dan muncul lebih dari sekali, itu pemisah ribuan
 *   - jika hanya satu dan muncul sekali dengan 3 digit di belakang, itu ribuan,
 *     KECUALI angka depannya "0" (0.953 jelas desimal)
 *   - selain itu, satu pemisah dianggap desimal
 */

const DASH = ['', '-', '\u2013', '\u2014'];

function toNumber(value, shown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return null;

  const source = (shown !== undefined && shown !== null && shown !== '')
    ? shown : (value || '');
  const text = String(source).trim();
  if (DASH.indexOf(text) >= 0) return null;

  const isPercent = text.indexOf('%') >= 0;
  let clean = text.replace(/[^0-9,.\-]/g, '');
  if (!clean || clean === '-' || clean === '.' || clean === ',') return null;

  const hasDot = clean.indexOf('.') >= 0;
  const hasComma = clean.indexOf(',') >= 0;

  if (hasDot && hasComma) {
    // Pemisah terakhir adalah desimal.
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      clean = clean.replace(/\./g, '').replace(/,/g, '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  } else if (hasDot || hasComma) {
    const sep = hasDot ? '.' : ',';
    const parts = clean.split(sep);
    const digits = parts.length - 1;
    const before = parts[0].replace('-', '');
    if (digits > 1) {
      clean = parts.join('');                       // 1.500.000
    } else if (parts[1].length === 3 && before !== '0' && before !== '') {
      clean = parts.join('');                       // 1.234 dan 1,234 → ribuan
    } else {
      clean = parts.join('.');                      // 0.953 dan 95,33 → desimal
    }
  }

  const n = Number(clean);
  if (!Number.isFinite(n)) return null;
  return isPercent ? n / 100 : n;
}

/**
 * Nilai persen 0..100 dari teks tampilan.
 * Sel kosong menghasilkan null, bukan 0.
 * Angka tanpa tanda persen yang nilainya di bawah 1 dianggap pecahan:
 * 0,07 menjadi 7. Proyek FOSFAT menyimpan bobot dengan cara ini.
 */
function percentFromText(text) {
  const raw = String(text === null || text === undefined ? '' : text).trim();
  if (DASH.indexOf(raw) >= 0) return null;

  if (raw.indexOf('%') >= 0) {
    const n = toNumber(raw.replace(/[%\s]/g, ''), raw.replace(/[%\s]/g, ''));
    return n === null ? null : n;
  }

  const n = toNumber(raw, raw);
  if (n === null) return null;
  if (Math.abs(n) <= 1.000001) return round(n * 100, 6);
  return n;
}

function round(value, digits) {
  if (value === null || value === undefined) return null;
  const f = Math.pow(10, digits === undefined ? 2 : digits);
  return Math.round(value * f) / f;
}

module.exports = { toNumber, percentFromText, round };

'use strict';

/**
 * Membaca file .xlsx (unduhan "File > Download > Microsoft Excel" dari Google Sheets)
 * menjadi SheetData: nilai asli, teks tampilan, rumus, format angka, dan tautan.
 */

const XLSX = require('xlsx');
const { SheetData } = require('./sheets');

const SSF = XLSX.SSF;

function serialToDate(serial) {
  const p = SSF.parse_date_code(serial);
  if (!p) return null;
  // Waktu lokal proses (TZ=Asia/Bangkok), sama dengan zona spreadsheet.
  return new Date(p.y, p.m - 1, p.d, p.H, p.M, Math.floor(p.S));
}

function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellFormula: true, cellNF: true, cellText: true, cellDates: false, sheetStubs: false });
  const out = [];
  wb.SheetNames.forEach((name, index) => {
    const ws = wb.Sheets[name];
    const ref = ws['!ref'];
    const range = ref ? XLSX.utils.decode_range(ref) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
    const rows = range.e.r + 1;
    const cols = range.e.c + 1;
    const values = [], display = [], formulas = {}, fmts = {}, links = {};
    for (let r = 0; r < rows; r++) { values.push([]); display.push([]); }

    for (const addr of Object.keys(ws)) {
      if (addr[0] === '!') continue;
      const cell = ws[addr];
      const { r, c } = XLSX.utils.decode_cell(addr);
      const key = r + ',' + c;
      let v = cell.v;
      if (cell.t === 'n' && cell.z && SSF.is_date(cell.z)) {
        const d = serialToDate(v);
        if (d) v = d;
      } else if (cell.t === 'd' && cell.v instanceof Date) {
        v = cell.v;
      } else if (cell.t === 'e') {
        v = cell.w || '#ERROR!';
      } else if (v === undefined || v === null) {
        v = '';
      }
      values[r][c] = v;
      display[r][c] = cell.w !== undefined ? String(cell.w) : (v instanceof Date ? '' : String(v));
      if (cell.f) formulas[key] = '=' + cell.f;
      if (cell.z && cell.z !== 'General') fmts[key] = cell.z;
      if (cell.l && cell.l.Target) links[key] = cell.l.Target;
    }

    // Isi celah dengan '' supaya bentuk array sama seperti getValues().
    for (let r = 0; r < rows; r++) {
      const rv = values[r], rd = display[r];
      let last = -1;
      for (let c = rv.length - 1; c >= 0; c--) if (rv[c] !== undefined && rv[c] !== '') { last = c; break; }
      for (let c = 0; c <= last; c++) {
        if (rv[c] === undefined) rv[c] = '';
        if (rd[c] === undefined) rd[c] = '';
      }
      rv.length = last + 1;
      rd.length = last + 1;
    }

    out.push(new SheetData({
      name, index, sheetId: index + 1,
      values, display, formulas, fmts, links,
      maxRows: rows, maxCols: cols,
      hidden: !!(wb.Workbook && wb.Workbook.Sheets && wb.Workbook.Sheets[index] && wb.Workbook.Sheets[index].Hidden),
    }));
  });
  return out;
}

module.exports = { parseWorkbook };

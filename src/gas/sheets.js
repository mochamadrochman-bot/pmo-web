'use strict';

/**
 * Pengganti SpreadsheetApp yang membaca dan menulis data di memori,
 * lalu menyimpannya ke PostgreSQL (tabel gas_sheets) setelah setiap permintaan.
 *
 * Setiap sel menyimpan tiga hal, sama seperti Google Sheets:
 *   values   : nilai asli (angka, teks, boolean, Date)
 *   display  : teks yang tampil (dipakai kode lama untuk mengenali "%" dan "-")
 *   formulas : rumus, kalau ada
 * Ditambah format angka per sel (fmts) dan tautan (links), disimpan jarang (sparse).
 */

const SSF = require('xlsx').SSF;

/**
 * Kait untuk mesin rumus (dipasang oleh store.js):
 *   onWrite(book)          : ada sel yang ditulis -> rumus perlu dihitung ulang
 *   beforeRead(book)       : sebelum data dibaca -> hitung ulang bila perlu
 *   onShift(book, sheet, axis, at, delta) : baris/kolom disisipkan/dihapus
 */
const hooks = { onWrite: null, beforeRead: null, onShift: null };

// ---------------------------------------------------------------- nilai sel
const DATE_TAG = '$d';

function encodeCell(v) {
  if (v instanceof Date) return { [DATE_TAG]: v.getTime() };
  return v;
}
function decodeCell(v) {
  if (v && typeof v === 'object' && DATE_TAG in v) return new Date(v[DATE_TAG]);
  return v;
}

/** Tanggal JS (zona proses = Asia/Bangkok) ke serial spreadsheet. */
function dateToSerial(d) {
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  return utc / 86400000 + 25569;
}

/** Teks tampilan untuk nilai, mengikuti format angka sel bila ada. */
function displayOf(value, fmt) {
  if (value === '' || value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value instanceof Date) {
    try { return SSF.format(fmt && SSF.is_date(fmt) ? fmt : 'd/m/yyyy', dateToSerial(value)); } catch (e) { return value.toISOString(); }
  }
  if (typeof value === 'number') {
    if (fmt && fmt !== 'General') {
      try { return SSF.format(fmt, value); } catch (e) { /* jatuh ke default */ }
    }
    if (!Number.isFinite(value)) return String(value);
    // Format "Automatic" Google: sampai 10 digit bermakna.
    const s = String(Number(value.toPrecision(10)));
    return s;
  }
  return String(value);
}

// ---------------------------------------------------------------- A1
function colToNum(letters) {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
function numToCol(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
function parseA1(a1, sheet) {
  let ref = String(a1).trim();
  const bang = ref.lastIndexOf('!');
  if (bang >= 0) ref = ref.slice(bang + 1);
  ref = ref.replace(/\$/g, '');
  const [a, b] = ref.split(':');
  const one = (x) => {
    const m = /^([A-Za-z]*)(\d*)$/.exec(x);
    if (!m) throw new Error('Alamat sel tidak dikenal: ' + a1);
    return { col: m[1] ? colToNum(m[1]) : null, row: m[2] ? Number(m[2]) : null };
  };
  const s = one(a);
  const e = b ? one(b) : s;
  const r1 = s.row || 1, c1 = s.col || 1;
  const r2 = e.row || Math.max(sheet.maxRows, 1);
  const c2 = e.col || Math.max(sheet.maxCols, 1);
  return { row: r1, col: c1, numRows: r2 - r1 + 1, numCols: c2 - c1 + 1 };
}

// ---------------------------------------------------------------- sheet
class SheetData {
  constructor(o) {
    this.name = o.name;
    this.sheetId = o.sheetId;
    this.index = o.index;
    this.values = o.values || [];     // baris -> kolom (0-based)
    this.display = o.display || [];
    this.formulas = o.formulas || {}; // "r,c" -> "=..."
    this.fmts = o.fmts || {};         // "r,c" -> format angka
    this.links = o.links || {};       // "r,c" -> url
    this.maxRows = Math.max(o.maxRows || 0, this.values.length, 1);
    this.maxCols = Math.max(o.maxCols || 0, this.values.reduce((m, r) => Math.max(m, r.length), 0), 1);
    this.frozenRows = o.frozenRows || 0;
    this.hidden = !!o.hidden;
    this.dirty = false;
  }

  lastRow() {
    for (let r = this.values.length - 1; r >= 0; r--) {
      const row = this.values[r];
      if (row && row.some((v) => v !== '' && v !== null && v !== undefined)) return r + 1;
    }
    return 0;
  }
  lastCol() {
    let m = 0;
    for (const row of this.values) {
      if (!row) continue;
      for (let c = row.length - 1; c >= m; c--) {
        const v = row[c];
        if (v !== '' && v !== null && v !== undefined) { m = c + 1; break; }
      }
    }
    return m;
  }
  get(r, c) {
    const row = this.values[r];
    const v = row ? row[c] : undefined;
    return v === undefined || v === null ? '' : v;
  }
  getDisplay(r, c) {
    const row = this.display[r];
    const v = row ? row[c] : undefined;
    return v === undefined || v === null ? '' : v;
  }
  ensure(r, c) {
    while (this.values.length <= r) this.values.push([]);
    while (this.display.length <= r) this.display.push([]);
    if (r + 1 > this.maxRows) this.maxRows = r + 1;
    if (c + 1 > this.maxCols) this.maxCols = c + 1;
  }
  set(r, c, v) {
    this.ensure(r, c);
    if (v === undefined || v === null) v = '';
    const key = r + ',' + c;
    if (typeof v === 'string' && v.startsWith('=') && v.length > 1) {
      this.formulas[key] = v;
      // Rumus belum dihitung ulang di server; nilai lama dipertahankan sampai mesin rumus tersedia.
      this.dirty = true;
      return;
    }
    delete this.formulas[key];
    const fmt = this.fmts[key];
    this.values[r][c] = v;
    this.display[r][c] = displayOf(v, fmt);
    this.dirty = true;
  }
  setFormula(r, c, f) {
    this.ensure(r, c);
    const key = r + ',' + c;
    if (f) this.formulas[key] = String(f); else delete this.formulas[key];
    this.dirty = true;
  }
  setFmt(r, c, fmt) {
    const key = r + ',' + c;
    if (fmt) this.fmts[key] = fmt; else delete this.fmts[key];
    const v = this.get(r, c);
    if (v !== '') { this.ensure(r, c); this.display[r][c] = displayOf(v, fmt); }
    this.dirty = true;
  }
  /** Geser kunci sparse (rumus/format/tautan) setelah sisip/hapus baris atau kolom. */
  shiftSparse(axis, at, delta) {
    for (const mapName of ['formulas', 'fmts', 'links']) {
      const src = this[mapName], out = {};
      for (const k of Object.keys(src)) {
        let [r, c] = k.split(',').map(Number);
        const pos = axis === 'row' ? r : c;
        if (pos >= at) {
          if (delta < 0 && pos < at - delta) continue; // ikut terhapus
          if (axis === 'row') r += delta; else c += delta;
        }
        out[r + ',' + c] = src[k];
      }
      this[mapName] = out;
    }
  }
  insertRows(at, n) {
    const blank = () => [];
    this.values.splice(at, 0, ...Array.from({ length: n }, blank));
    this.display.splice(at, 0, ...Array.from({ length: n }, blank));
    this.shiftSparse('row', at, n);
    this.maxRows += n;
    this.dirty = true;
  }
  deleteRows(at, n) {
    this.values.splice(at, n);
    this.display.splice(at, n);
    this.shiftSparse('row', at, -n);
    this.maxRows = Math.max(1, this.maxRows - n);
    this.dirty = true;
  }
  insertCols(at, n) {
    for (const arr of [this.values, this.display]) {
      for (const row of arr) if (row && row.length > at) row.splice(at, 0, ...Array(n).fill(''));
    }
    this.shiftSparse('col', at, n);
    this.maxCols += n;
    this.dirty = true;
  }
  deleteCols(at, n) {
    for (const arr of [this.values, this.display]) {
      for (const row of arr) if (row) row.splice(at, n);
    }
    this.shiftSparse('col', at, -n);
    this.maxCols = Math.max(1, this.maxCols - n);
    this.dirty = true;
  }
  toJSON() {
    return {
      name: this.name, sheetId: this.sheetId, index: this.index,
      values: this.values.map((row) => (row || []).map(encodeCell)),
      display: this.display,
      formulas: this.formulas, fmts: this.fmts, links: this.links,
      maxRows: this.maxRows, maxCols: this.maxCols, frozenRows: this.frozenRows, hidden: this.hidden,
    };
  }
  static fromJSON(o) {
    return new SheetData({ ...o, values: (o.values || []).map((row) => (row || []).map(decodeCell)) });
  }
}

// ---------------------------------------------------------------- Range
const NOOP_PREFIXES = ['setFont', 'setBackground', 'setHorizontal', 'setVertical', 'setWrap', 'setBorder',
  'setNote', 'setDataValidation', 'setTextStyle', 'setShowHyperlink', 'setTextRotation', 'setFontColor',
  'merge', 'breakApart', 'activate', 'setTextDirection', 'protect', 'clearFormat', 'clearDataValidations',
  'clearNote', 'applyRowBanding', 'removeCheckboxes', 'insertCheckboxes', 'createFilter', 'setRichTextValue'];

function chainable(target) {
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (typeof prop === 'string' && NOOP_PREFIXES.some((p) => prop.startsWith(p))) return () => proxyOf(t);
      return undefined;
    },
  });
}
const proxies = new WeakMap();
function proxyOf(t) {
  if (!proxies.has(t)) proxies.set(t, chainable(t));
  return proxies.get(t);
}

class Range {
  constructor(sheet, row, col, numRows, numCols) {
    if (!(row >= 1) || !(col >= 1)) throw new Error('Koordinat range tidak valid.');
    if (!(numRows >= 1) || !(numCols >= 1)) throw new Error('Jumlah baris atau kolom range harus minimal 1.');
    this._s = sheet; this._d = sheet._d;
    this._r = row; this._c = col; this._nr = numRows; this._nc = numCols;
  }
  _grid(fn) {
    const out = [];
    for (let i = 0; i < this._nr; i++) {
      const row = [];
      for (let j = 0; j < this._nc; j++) row.push(fn(this._r - 1 + i, this._c - 1 + j));
      out.push(row);
    }
    return out;
  }
  _pre() { if (hooks.beforeRead) hooks.beforeRead(this._s._ss._b); }
  getValues() { this._pre(); return this._grid((r, c) => { const v = this._d.get(r, c); return v instanceof Date ? new Date(v.getTime()) : v; }); }
  getDisplayValues() { this._pre(); return this._grid((r, c) => this._d.getDisplay(r, c)); }
  getFormulas() { return this._grid((r, c) => this._d.formulas[r + ',' + c] || ''); }
  getNumberFormats() { return this._grid((r, c) => this._d.fmts[r + ',' + c] || 'General'); }
  getValue() { return this.getValues()[0][0]; }
  getDisplayValue() { return this.getDisplayValues()[0][0]; }
  getFormula() { return this.getFormulas()[0][0]; }
  getNumberFormat() { return this.getNumberFormats()[0][0]; }
  getBackgrounds() { return this._grid(() => '#ffffff'); }
  getBackground() { return '#ffffff'; }
  getNotes() { return this._grid(() => ''); }
  getNote() { return ''; }
  getRichTextValue() {
    const link = this._d.links[(this._r - 1) + ',' + (this._c - 1)] || null;
    const text = String(this.getDisplayValue());
    return {
      getText: () => text,
      getLinkUrl: () => link,
      getRuns: () => [{ getLinkUrl: () => link, getText: () => text }],
    };
  }
  getRichTextValues() { return [[this.getRichTextValue()]]; }

  _check(values) {
    if (!Array.isArray(values) || values.length !== this._nr || values.some((r) => !Array.isArray(r) || r.length !== this._nc)) {
      throw new Error(`Jumlah data (${Array.isArray(values) ? values.length : 0} baris) tidak cocok dengan range (${this._nr} x ${this._nc}).`);
    }
  }
  setValues(values) {
    this._check(values);
    if (hooks.onWrite) hooks.onWrite(this._s._ss._b);
    for (let i = 0; i < this._nr; i++) for (let j = 0; j < this._nc; j++) this._d.set(this._r - 1 + i, this._c - 1 + j, values[i][j]);
    return proxyOf(this);
  }
  setValue(v) {
    if (hooks.onWrite) hooks.onWrite(this._s._ss._b);
    for (let i = 0; i < this._nr; i++) for (let j = 0; j < this._nc; j++) this._d.set(this._r - 1 + i, this._c - 1 + j, v);
    return proxyOf(this);
  }
  setFormulas(f) {
    this._check(f);
    if (hooks.onWrite) hooks.onWrite(this._s._ss._b);
    for (let i = 0; i < this._nr; i++) for (let j = 0; j < this._nc; j++) this._d.setFormula(this._r - 1 + i, this._c - 1 + j, f[i][j]);
    return proxyOf(this);
  }
  setFormula(f) {
    if (hooks.onWrite) hooks.onWrite(this._s._ss._b);
    for (let i = 0; i < this._nr; i++) for (let j = 0; j < this._nc; j++) this._d.setFormula(this._r - 1 + i, this._c - 1 + j, f);
    return proxyOf(this);
  }
  setNumberFormat(fmt) {
    for (let i = 0; i < this._nr; i++) for (let j = 0; j < this._nc; j++) this._d.setFmt(this._r - 1 + i, this._c - 1 + j, fmt);
    return proxyOf(this);
  }
  setNumberFormats(fmts) {
    this._check(fmts);
    for (let i = 0; i < this._nr; i++) for (let j = 0; j < this._nc; j++) this._d.setFmt(this._r - 1 + i, this._c - 1 + j, fmts[i][j]);
    return proxyOf(this);
  }
  clearContent() { return this.setValue(''); }
  clear() {
    if (hooks.onWrite) hooks.onWrite(this._s._ss._b);
    for (let i = 0; i < this._nr; i++) for (let j = 0; j < this._nc; j++) {
      const r = this._r - 1 + i, c = this._c - 1 + j, k = r + ',' + c;
      delete this._d.formulas[k]; delete this._d.links[k];
      if (this._d.values[r]) { this._d.values[r][c] = ''; this._d.display[r][c] = ''; }
    }
    this._d.dirty = true;
    return proxyOf(this);
  }
  copyTo(dest) {
    const vals = this.getValues();
    const target = dest._s.getRange(dest._r, dest._c, this._nr, this._nc);
    target.setValues(vals);
    return proxyOf(this);
  }
  sort(spec) {
    const specs = (Array.isArray(spec) ? spec : [spec]).map((s) => (typeof s === 'number' ? { column: s, ascending: true } : s));
    const vals = this.getValues();
    vals.sort((a, b) => {
      for (const s of specs) {
        const i = s.column - this._c;
        const x = a[i], y = b[i];
        if (x === y) continue;
        const cmp = (x === '' ? 1 : y === '' ? -1 : (x < y ? -1 : 1));
        return s.ascending === false ? -cmp : cmp;
      }
      return 0;
    });
    this.setValues(vals);
    return proxyOf(this);
  }
  getRow() { return this._r; }
  getColumn() { return this._c; }
  getLastRow() { return this._r + this._nr - 1; }
  getLastColumn() { return this._c + this._nc - 1; }
  getNumRows() { return this._nr; }
  getNumColumns() { return this._nc; }
  getHeight() { return this._nr; }
  getWidth() { return this._nc; }
  getSheet() { return this._s; }
  getA1Notation() {
    const a = numToCol(this._c) + this._r;
    return this._nr === 1 && this._nc === 1 ? a : a + ':' + numToCol(this._c + this._nc - 1) + (this._r + this._nr - 1);
  }
  offset(dr, dc, nr, nc) { return this._s.getRange(this._r + dr, this._c + dc, nr || this._nr, nc || this._nc); }
  isBlank() { return this.getValues().every((r) => r.every((v) => v === '')); }
}

// ---------------------------------------------------------------- Sheet
class Sheet {
  constructor(ss, data) { this._ss = ss; this._d = data; }
  getName() { return this._d.name; }
  setName(n) { this._ss._rename(this._d.name, n); return proxyOf(this); }
  getSheetId() { return this._d.sheetId; }
  getIndex() { return this._d.index + 1; }
  getParent() { return this._ss; }
  getLastRow() { if (hooks.beforeRead) hooks.beforeRead(this._ss._b); return this._d.lastRow(); }
  getLastColumn() { return this._d.lastCol(); }
  getMaxRows() { return this._d.maxRows; }
  getMaxColumns() { return this._d.maxCols; }
  getFrozenRows() { return this._d.frozenRows; }
  setFrozenRows(n) { this._d.frozenRows = n; return proxyOf(this); }
  setFrozenColumns() { return proxyOf(this); }
  isSheetHidden() { return this._d.hidden; }
  hideSheet() { this._d.hidden = true; this._d.dirty = true; return proxyOf(this); }
  showSheet() { this._d.hidden = false; this._d.dirty = true; return proxyOf(this); }
  getRange(a, b, c, d) {
    if (typeof a === 'string') {
      const p = parseA1(a, this._d);
      return proxyOf(new Range(this, p.row, p.col, p.numRows, p.numCols));
    }
    return proxyOf(new Range(this, a, b, c === undefined ? 1 : c, d === undefined ? 1 : d));
  }
  getDataRange() {
    return this.getRange(1, 1, Math.max(1, this._d.lastRow()), Math.max(1, this._d.lastCol()));
  }
  appendRow(row) {
    if (hooks.onWrite) hooks.onWrite(this._ss._b);
    const r = this._d.lastRow();
    row.forEach((v, c) => this._d.set(r, c, v));
    return proxyOf(this);
  }
  _shift(axis, at, delta) {
    if (hooks.onShift) hooks.onShift(this._ss._b, this._d.name, axis, at, delta);
    if (hooks.onWrite) hooks.onWrite(this._ss._b);
  }
  insertRowsAfter(after, n) { this._d.insertRows(after, n || 1); this._shift('row', after + 1, n || 1); return proxyOf(this); }
  insertRowsBefore(before, n) { this._d.insertRows(before - 1, n || 1); this._shift('row', before, n || 1); return proxyOf(this); }
  insertRowAfter(after) { return this.insertRowsAfter(after, 1); }
  insertRowBefore(before) { return this.insertRowsBefore(before, 1); }
  deleteRow(r) { return this.deleteRows(r, 1); }
  deleteRows(r, n) { this._d.deleteRows(r - 1, n); this._shift('row', r, -n); return proxyOf(this); }
  insertColumnsAfter(after, n) { this._d.insertCols(after, n || 1); this._shift('col', after + 1, n || 1); return proxyOf(this); }
  insertColumnAfter(after) { return this.insertColumnsAfter(after, 1); }
  deleteColumn(c) { return this.deleteColumns(c, 1); }
  deleteColumns(c, n) { this._d.deleteCols(c - 1, n); this._shift('col', c, -n); return proxyOf(this); }
  clear() { this._d.values = []; this._d.display = []; this._d.formulas = {}; this._d.links = {}; this._d.dirty = true; return proxyOf(this); }
  clearContents() { return this.clear(); }
  getSheetValues(r, c, nr, nc) {
    const rows = nr === -1 ? this._d.lastRow() - r + 1 : nr;
    const cols = nc === -1 ? this._d.lastCol() - c + 1 : nc;
    return this.getRange(r, c, rows, cols).getValues();
  }
  autoResizeColumns() { return proxyOf(this); }
  autoResizeColumn() { return proxyOf(this); }
  setColumnWidth() { return proxyOf(this); }
  setColumnWidths() { return proxyOf(this); }
  setRowHeight() { return proxyOf(this); }
  setTabColor() { return proxyOf(this); }
  protect() { return { setDescription() { return this; }, setWarningOnly() { return this; }, removeEditors() { return this; }, addEditor() { return this; } }; }
  getProtections() { return []; }
  activate() { return proxyOf(this); }
  getFilter() { return null; }
  getCharts() { return []; }
}

// ---------------------------------------------------------------- Spreadsheet
class Spreadsheet {
  constructor(book) { this._b = book; }
  getId() { return this._b.id; }
  getName() { return this._b.title || 'PMO DASHBOARD'; }
  getUrl() { return 'https://docs.google.com/spreadsheets/d/' + this._b.id + '/edit'; }
  getSheets() { return this._b.list().map((d) => proxyOf(new Sheet(this, d))); }
  getSheetByName(name) {
    const d = this._b.sheets.get(String(name));
    return d ? proxyOf(new Sheet(this, d)) : null;
  }
  getSheetById(id) {
    const d = this._b.list().find((x) => x.sheetId === id);
    return d ? proxyOf(new Sheet(this, d)) : null;
  }
  insertSheet(name, index) {
    if (typeof name !== 'string') name = 'Sheet' + (this._b.sheets.size + 1);
    if (this._b.sheets.has(name)) throw new Error(`Sheet "${name}" sudah ada.`);
    const d = new SheetData({ name, sheetId: this._b.nextId(), index: typeof index === 'number' ? index : this._b.sheets.size });
    d.dirty = true;
    this._b.sheets.set(name, d);
    return proxyOf(new Sheet(this, d));
  }
  deleteSheet(sheet) {
    const name = sheet.getName();
    this._b.sheets.delete(name);
    this._b.deleted.add(name);
  }
  _rename(oldName, newName) {
    const d = this._b.sheets.get(oldName);
    this._b.sheets.delete(oldName);
    this._b.deleted.add(oldName);
    d.name = newName; d.dirty = true;
    this._b.sheets.set(newName, d);
  }
  getRange(a1) {
    const bang = String(a1).indexOf('!');
    if (bang < 0) throw new Error('Sertakan nama sheet di alamat range.');
    const sheet = this.getSheetByName(String(a1).slice(0, bang).replace(/^'|'$/g, ''));
    return sheet.getRange(String(a1).slice(bang + 1));
  }
  toast() {}
  getSpreadsheetTimeZone() { return process.env.TZ || 'Asia/Bangkok'; }
}

/** Satu "file spreadsheet" di memori: kumpulan SheetData dengan pelacak perubahan. */
class Workbook {
  constructor(id, title) {
    this.id = id;
    this.title = title;
    this.sheets = new Map();
    this.deleted = new Set();
  }
  list() { return [...this.sheets.values()].sort((a, b) => a.index - b.index); }
  nextId() { return this.list().reduce((m, s) => Math.max(m, s.sheetId || 0), 0) + 1; }
  dirtySheets() { return this.list().filter((s) => s.dirty); }
}

module.exports = {
  hooks,
  SheetData, Workbook, Spreadsheet, Sheet, Range, proxyOf,
  encodeCell, decodeCell, displayOf, dateToSerial, parseA1, numToCol, colToNum,
};

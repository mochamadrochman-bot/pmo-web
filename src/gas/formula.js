'use strict';

/**
 * Mesin rumus kecil untuk spreadsheet PMO DASHBOARD.
 *
 * Mendukung yang dipakai spreadsheet saat ini: angka, teks dalam tanda kutip, acuan sel
 * (A1, $A$1, 'Nama Sheet'!A1), rentang (A1:B5), operator + - * / ^ & dan perbandingan,
 * tanda minus/persen, kurung, serta fungsi SUM, MIN, MAX, AVERAGE, ABS, ROUND, IF, IFERROR,
 * AND, OR, NOT, COUNT, COUNTA.
 * Rumus lain ditandai "tidak didukung"; nilai lama dari Google tetap dipakai untuk sel itu.
 *
 * Perilaku mengikuti Google Sheets: sel kosong = 0 dalam hitungan, teks angka dikonversi,
 * SUM melewati teks di dalam rentang, galat (#DIV/0!, #VALUE!, #REF!) merambat.
 */

const { colToNum, dateToSerial } = require('./sheets');

class FErr {
  constructor(code) { this.code = code; }
  toString() { return this.code; }
}
const ERR = {
  DIV0: new FErr('#DIV/0!'), VALUE: new FErr('#VALUE!'), REF: new FErr('#REF!'),
  NAME: new FErr('#NAME?'), NA: new FErr('#N/A'), NUM: new FErr('#NUM!'),
};
const isErr = (v) => v instanceof FErr;

// ------------------------------------------------------------------ tokenizer
function tokenize(src) {
  const t = [];
  let i = 0;
  const s = src;
  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { i++; continue; }
    if (ch === '"') {
      let j = i + 1, out = '';
      while (j < s.length) {
        if (s[j] === '"') { if (s[j + 1] === '"') { out += '"'; j += 2; continue; } break; }
        out += s[j++];
      }
      t.push({ k: 'str', v: out }); i = j + 1; continue;
    }
    if (ch === "'") {
      const j = s.indexOf("'!", i + 1);
      if (j < 0) throw new Error('Nama sheet tidak ditutup');
      t.push({ k: 'sheet', v: s.slice(i + 1, j).replace(/''/g, "'") }); i = j + 2; continue;
    }
    let m = /^(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)/.exec(s.slice(i));
    if (m && !/^[A-Za-z]/.test(s.slice(i + m[0].length))) { t.push({ k: 'num', v: Number(m[0]) }); i += m[0].length; continue; }
    m = /^([A-Za-z_][A-Za-z0-9_.]*)!/.exec(s.slice(i));
    if (m) { t.push({ k: 'sheet', v: m[1] }); i += m[0].length; continue; }
    m = /^\$?([A-Za-z]{1,3})\$?(\d+)(?::\$?([A-Za-z]{1,3})\$?(\d+))?/.exec(s.slice(i));
    if (m && !/^[A-Za-z0-9_(]/.test(s.slice(i + m[0].length))) {
      t.push({ k: 'ref', c1: colToNum(m[1]), r1: Number(m[2]), c2: m[3] ? colToNum(m[3]) : null, r2: m[4] ? Number(m[4]) : null });
      i += m[0].length; continue;
    }
    m = /^([A-Za-z_][A-Za-z0-9_.]*)\s*\(/.exec(s.slice(i));
    if (m) { t.push({ k: 'fn', v: m[1].toUpperCase() }); i += m[0].length; continue; }
    m = /^#(REF!|DIV\/0!|VALUE!|N\/A|NAME\?|NUM!)/.exec(s.slice(i));
    if (m) { t.push({ k: 'err', v: m[0] }); i += m[0].length; continue; }
    m = /^(TRUE|FALSE)\b/i.exec(s.slice(i));
    if (m) { t.push({ k: 'bool', v: m[1].toUpperCase() === 'TRUE' }); i += m[0].length; continue; }
    m = /^(<=|>=|<>|[-+*/^&=<>(),%:;])/.exec(s.slice(i));
    if (m) { t.push({ k: 'op', v: m[1] === ';' ? ',' : m[1] }); i += m[1].length; continue; }
    throw new Error('Simbol tidak dikenal: ' + s.slice(i, i + 10));
  }
  return t;
}

// ------------------------------------------------------------------ parser (precedence climbing)
const SUPPORTED_FN = new Set(['SUM', 'MIN', 'MAX', 'AVERAGE', 'ABS', 'ROUND', 'IF', 'IFERROR', 'AND', 'OR', 'NOT', 'COUNT', 'COUNTA']);
const BIN = { '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '&': 2, '+': 3, '-': 3, '*': 4, '/': 4, '^': 5 };

function parse(src) {
  const toks = tokenize(src.replace(/^=/, ''));
  let p = 0;
  const peek = () => toks[p];
  const take = () => toks[p++];
  const isOp = (v) => peek() && peek().k === 'op' && peek().v === v;

  function primary() {
    const tk = take();
    if (!tk) throw new Error('Rumus berakhir tiba-tiba');
    if (tk.k === 'num') return { t: 'num', v: tk.v };
    if (tk.k === 'str') return { t: 'str', v: tk.v };
    if (tk.k === 'bool') return { t: 'bool', v: tk.v };
    if (tk.k === 'err') return { t: 'err', v: tk.v };
    if (tk.k === 'op' && (tk.v === '-' || tk.v === '+')) { const e = unary(); return tk.v === '-' ? { t: 'neg', e } : e; }
    if (tk.k === 'op' && tk.v === '(') { const e = expr(0); if (!isOp(')')) throw new Error('Kurung tidak ditutup'); take(); return e; }
    if (tk.k === 'sheet') {
      const r = take();
      if (!r || r.k !== 'ref') throw new Error('Acuan sheet tidak lengkap');
      return { t: 'ref', sheet: tk.v, ...r };
    }
    if (tk.k === 'ref') return { t: 'ref', sheet: null, c1: tk.c1, r1: tk.r1, c2: tk.c2, r2: tk.r2 };
    if (tk.k === 'fn') {
      if (!SUPPORTED_FN.has(tk.v)) throw new Error('Fungsi belum didukung: ' + tk.v);
      const args = [];
      if (!isOp(')')) {
        for (;;) {
          args.push(expr(0));
          if (isOp(',')) { take(); continue; }
          break;
        }
      }
      if (!isOp(')')) throw new Error('Kurung fungsi tidak ditutup');
      take();
      return { t: 'fn', name: tk.v, args };
    }
    throw new Error('Bentuk rumus tidak dikenal');
  }
  function postfix() {
    let e = primary();
    while (isOp('%')) { take(); e = { t: 'pct', e }; }
    return e;
  }
  function unary() {
    if (isOp('-')) { take(); return { t: 'neg', e: unary() }; }
    if (isOp('+')) { take(); return unary(); }
    return postfix();
  }
  function expr(minPrec) {
    let left = unary();
    for (;;) {
      const tk = peek();
      if (!tk || tk.k !== 'op' || !(tk.v in BIN)) break;
      const prec = BIN[tk.v];
      if (prec < minPrec) break;
      take();
      const right = expr(tk.v === '^' ? prec : prec + 1);
      left = { t: 'bin', op: tk.v, a: left, b: right };
    }
    return left;
  }
  const ast = expr(0);
  if (p < toks.length) throw new Error('Sisa rumus tidak terbaca');
  return ast;
}

// ------------------------------------------------------------------ evaluator
/**
 * Hitung ulang semua rumus dalam satu Workbook.
 * opts.sheets: daftar nama sheet yang dihitung (bawaan: semua yang punya rumus)
 * Mengembalikan { computed, unsupported: [{sheet, cell, formula, reason}], changed }
 */
function recalc(book, opts) {
  const o = opts || {};
  const sheets = new Map();
  for (const d of book.list()) sheets.set(d.name, d);
  const targets = (o.sheets || [...sheets.keys()]).map((n) => sheets.get(n)).filter((d) => d && Object.keys(d.formulas).length);

  const astCache = o.astCache || new Map();
  const unsupported = [];
  const memo = new Map();      // "sheet|r|c" -> nilai
  const visiting = new Set();

  function astOf(d, key) {
    const f = d.formulas[key];
    const ck = f;
    if (astCache.has(ck)) return astCache.get(ck);
    let a;
    try { a = parse(f); } catch (e) { a = { t: 'unsupported', reason: e.message }; }
    astCache.set(ck, a);
    return a;
  }

  function cellValue(d, r, c) {
    const key = r + ',' + c;
    if (!(key in d.formulas)) {
      const v = d.get(r, c);
      return v;
    }
    const mk = d.name + '|' + key;
    if (memo.has(mk)) return memo.get(mk);
    if (visiting.has(mk)) return ERR.REF; // rumus melingkar
    visiting.add(mk);
    const a = astOf(d, key);
    let v;
    if (a.t === 'unsupported') v = d.get(r, c); // pakai nilai lama
    else {
      try { v = ev(a, d); } catch (e) { v = ERR.VALUE; }
      if (Array.isArray(v)) v = v.length && v[0].length ? v[0][0] : '';
    }
    visiting.delete(mk);
    memo.set(mk, v);
    return v;
  }

  function sheetFor(ctx, name) {
    if (!name) return ctx;
    const d = sheets.get(name);
    if (!d) throw ERR.REF;
    return d;
  }

  function range(node, ctx) {
    const d = sheetFor(ctx, node.sheet);
    const r1 = node.r1, c1 = node.c1;
    const r2 = node.r2 || r1, c2 = node.c2 || c1;
    const out = [];
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
      const row = [];
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) row.push(cellValue(d, r - 1, c - 1));
      out.push(row);
    }
    return out;
  }

  function num(v) {
    if (isErr(v)) throw v;
    if (v === '' || v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v instanceof Date) return dateToSerial(v);
    const s = String(v).trim().replace(/,/g, '');
    if (/%$/.test(s) && !isNaN(Number(s.slice(0, -1)))) return Number(s.slice(0, -1)) / 100;
    if (s !== '' && !isNaN(Number(s))) return Number(s);
    throw ERR.VALUE;
  }
  function str(v) {
    if (isErr(v)) throw v;
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return String(v);
  }
  function truthy(v) {
    if (isErr(v)) throw v;
    if (typeof v === 'boolean') return v;
    if (v === '') return false;
    if (typeof v === 'string') { if (/^true$/i.test(v)) return true; if (/^false$/i.test(v)) return false; throw ERR.VALUE; }
    return num(v) !== 0;
  }
  function scalar(node, ctx) {
    const v = ev(node, ctx);
    if (Array.isArray(v)) return v.length && v[0].length ? v[0][0] : '';
    return v;
  }
  // Nilai numerik untuk fungsi agregat: rentang melewati teks/kosong, argumen langsung dikonversi.
  function aggNums(args, ctx) {
    const out = [];
    for (const a of args) {
      if (a.t === 'ref' && (a.r2 || a.c2)) {
        for (const row of range(a, ctx)) for (const v of row) {
          if (isErr(v)) throw v;
          if (typeof v === 'number') out.push(v);
          else if (v instanceof Date) out.push(dateToSerial(v));
        }
      } else if (a.t === 'ref') {
        const v = scalar(a, ctx);
        if (isErr(v)) throw v;
        if (typeof v === 'number') out.push(v);
        else if (v instanceof Date) out.push(dateToSerial(v));
      } else {
        out.push(num(scalar(a, ctx)));
      }
    }
    return out;
  }

  function ev(node, ctx) {
    switch (node.t) {
      case 'num': return node.v;
      case 'str': return node.v;
      case 'bool': return node.v;
      case 'err': return Object.values(ERR).find((e) => e.code === node.v) || ERR.REF;
      case 'ref': {
        if (node.r2 || node.c2) return range(node, ctx);
        const d = sheetFor(ctx, node.sheet);
        return cellValue(d, node.r1 - 1, node.c1 - 1);
      }
      case 'neg': return -num(scalar(node.e, ctx));
      case 'pct': return num(scalar(node.e, ctx)) / 100;
      case 'bin': {
        const a = scalar(node.a, ctx), b = scalar(node.b, ctx);
        if (isErr(a)) return a;
        if (isErr(b)) return b;
        switch (node.op) {
          case '+': return num(a) + num(b);
          case '-': return num(a) - num(b);
          case '*': return num(a) * num(b);
          case '/': { const y = num(b); if (y === 0) return ERR.DIV0; return num(a) / y; }
          case '^': return Math.pow(num(a), num(b));
          case '&': return str(a) + str(b);
          default: {
            const cmp = (x, y) => {
              const nx = typeof x === 'number' || typeof x === 'boolean' || x === '' || x instanceof Date;
              const ny = typeof y === 'number' || typeof y === 'boolean' || y === '' || y instanceof Date;
              if (nx && ny) return num(x) - num(y);
              const sx = str(x).toLowerCase(), sy = str(y).toLowerCase();
              return sx < sy ? -1 : sx > sy ? 1 : 0;
            };
            const r = cmp(a, b);
            return { '=': r === 0, '<>': r !== 0, '<': r < 0, '>': r > 0, '<=': r <= 0, '>=': r >= 0 }[node.op];
          }
        }
      }
      case 'fn': {
        const A = node.args;
        try {
          switch (node.name) {
            case 'SUM': return aggNums(A, ctx).reduce((s, x) => s + x, 0);
            case 'MIN': { const n = aggNums(A, ctx); return n.length ? Math.min(...n) : 0; }
            case 'MAX': { const n = aggNums(A, ctx); return n.length ? Math.max(...n) : 0; }
            case 'AVERAGE': { const n = aggNums(A, ctx); return n.length ? n.reduce((s, x) => s + x, 0) / n.length : ERR.DIV0; }
            case 'COUNT': return aggNums(A, ctx).length;
            case 'COUNTA': {
              let k = 0;
              for (const a of A) {
                const v = ev(a, ctx);
                if (Array.isArray(v)) v.forEach((row) => row.forEach((x) => { if (x !== '') k++; }));
                else if (v !== '') k++;
              }
              return k;
            }
            case 'ABS': return Math.abs(num(scalar(A[0], ctx)));
            case 'ROUND': {
              const x = num(scalar(A[0], ctx)), d = A[1] ? num(scalar(A[1], ctx)) : 0;
              const f = Math.pow(10, d);
              return Math.sign(x) * Math.round(Math.abs(x) * f + 1e-9) / f;
            }
            case 'IF': return truthy(scalar(A[0], ctx)) ? (A[1] ? scalar(A[1], ctx) : true) : (A[2] ? scalar(A[2], ctx) : false);
            case 'IFERROR': { const v = scalar(A[0], ctx); return isErr(v) ? (A[1] ? scalar(A[1], ctx) : '') : v; }
            case 'AND': return A.every((a) => truthy(scalar(a, ctx)));
            case 'OR': return A.some((a) => truthy(scalar(a, ctx)));
            case 'NOT': return !truthy(scalar(A[0], ctx));
            default: return ERR.NAME;
          }
        } catch (e) {
          if (isErr(e)) return e;
          throw e;
        }
      }
      default: return ERR.VALUE;
    }
  }

  // Hitung semua sel rumus, lalu tulis hasilnya.
  let computed = 0;
  const results = [];
  for (const d of targets) {
    for (const key of Object.keys(d.formulas)) {
      const [r, c] = key.split(',').map(Number);
      const a = astOf(d, key);
      if (a.t === 'unsupported') { unsupported.push({ sheet: d.name, cell: key, formula: d.formulas[key], reason: a.reason }); continue; }
      let v;
      try { v = cellValue(d, r, c); } catch (e) { v = isErr(e) ? e : ERR.VALUE; }
      results.push([d, r, c, v]);
      computed++;
    }
  }
  return { computed, unsupported, results };
}

/**
 * Terapkan hasil recalc ke sheet (nilai + teks tampilan). Mengembalikan jumlah sel yang berubah.
 * toCell: fungsi (d, r, c, v) => nilai yang disimpan (mis. galat -> teks kodenya).
 */
function apply(results, displayOf) {
  let changed = 0;
  for (const [d, r, c, v0] of results) {
    let v = isErr(v0) ? v0.code : v0;
    const key = r + ',' + c;
    const fmt = d.fmts[key];
    if (typeof v === 'number' && fmt && /[dmy]/i.test(fmt) && !/%/.test(fmt) && /(^|[^\\])[dmy]/i.test(fmt.replace(/"[^"]*"/g, ''))) {
      // Sel berformat tanggal: simpan sebagai Date seperti hasil impor.
      const ms = Math.round((v - 25569) * 86400000);
      const u = new Date(ms);
      v = new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), u.getUTCHours(), u.getUTCMinutes(), u.getUTCSeconds());
    }
    const old = d.get(r, c);
    const same = (old instanceof Date && v instanceof Date) ? old.getTime() === v.getTime() : old === v;
    if (same) continue;
    d.ensure(r, c);
    d.values[r][c] = v;
    d.display[r][c] = displayOf(v, fmt);
    d.dirty = true;
    changed++;
  }
  return changed;
}

// ------------------------------------------------------------------ geser acuan
const REF_RE = /((?:'(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_.]*)!)?(\$?)([A-Z]{1,3})(\$?)(\d+)(?::(\$?)([A-Z]{1,3})(\$?)(\d+))?(?![A-Za-z0-9_(])/g;

function numToColLocal(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/**
 * Sesuaikan acuan di semua rumus setelah baris/kolom disisipkan atau dihapus, seperti Google Sheets.
 * book: Workbook; target: nama sheet yang diubah; axis: 'row' | 'col';
 * at: posisi 1-based baris/kolom pertama yang disisipkan/dihapus; delta: +n sisip, -n hapus.
 */
function shiftRefs(book, target, axis, at, delta) {
  let touched = 0;
  for (const d of book.list()) {
    const keys = Object.keys(d.formulas);
    if (!keys.length) continue;
    for (const k of keys) {
      const f = d.formulas[k];
      const nf = f.replace(REF_RE, (m, pre, ca, col, ra, row, cb, col2, rb, row2) => {
        const sheetName = pre ? pre.slice(0, -1).replace(/^'|'$/g, '').replace(/''/g, "'") : d.name;
        if (sheetName !== target) return m;
        const move = (n) => {
          if (n < at) return n;
          if (delta < 0 && n < at - delta) return null; // ikut terhapus
          return n + delta;
        };
        let r1 = Number(row), c1 = colToNum(col), r2 = row2 ? Number(row2) : null, c2 = col2 ? colToNum(col2) : null;
        if (axis === 'row') {
          const a = move(r1), b = r2 !== null ? move(r2) : null;
          if (a === null || (r2 !== null && b === null)) return (pre || '') + '#REF!';
          r1 = a; if (r2 !== null) r2 = b;
        } else {
          const a = move(c1), b = c2 !== null ? move(c2) : null;
          if (a === null || (c2 !== null && b === null)) return (pre || '') + '#REF!';
          c1 = a; if (c2 !== null) c2 = b;
        }
        let out = (pre || '') + ca + numToColLocal(c1) + ra + r1;
        if (r2 !== null) out += ':' + cb + numToColLocal(c2) + rb + r2;
        return out;
      });
      if (nf !== f) { d.formulas[k] = nf; d.dirty = true; touched++; }
    }
  }
  return touched;
}

module.exports = { parse, tokenize, recalc, apply, shiftRefs, ERR, FErr, isErr };

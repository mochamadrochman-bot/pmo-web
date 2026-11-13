'use strict';

/**
 * Pengganti layanan Google Apps Script selain SpreadsheetApp:
 * CacheService, PropertiesService, LockService, Utilities, Session, Logger,
 * ScriptApp, HtmlService, serta penanda untuk layanan yang belum tersedia
 * (DriveApp, UrlFetchApp, MailApp).
 */

const crypto = require('node:crypto');
const zlib = require('node:zlib');
const store = require('./store');
const { Spreadsheet } = require('./sheets');
const { compileTemplate } = require('./template');
const { makeDrive } = require('./drive');
const gauth = require('../google/auth');

const TZ = process.env.TZ || 'Asia/Bangkok';

// ---------------------------------------------------------------- byte array (Java signed bytes)
function toBytes(buf) { return Array.from(new Int8Array(buf.buffer, buf.byteOffset, buf.length)); }
function fromBytes(arr) {
  if (Buffer.isBuffer(arr)) return arr;
  if (typeof arr === 'string') return Buffer.from(arr, 'utf8');
  return Buffer.from(Uint8Array.from(arr, (b) => b & 0xff));
}

// ---------------------------------------------------------------- Blob
class Blob {
  constructor(data, contentType, name) {
    this._buf = fromBytes(data === undefined ? '' : data);
    this._type = contentType || 'application/octet-stream';
    this._name = name || null;
  }
  getBytes() { return toBytes(this._buf); }
  getDataAsString(charset) { return this._buf.toString(charset && /16/.test(charset) ? 'utf16le' : 'utf8'); }
  getContentType() { return this._type; }
  setContentType(t) { this._type = t; return this; }
  getName() { return this._name; }
  setName(n) { this._name = n; return this; }
  setDataFromString(s) { this._buf = Buffer.from(String(s), 'utf8'); return this; }
  setBytes(b) { this._buf = fromBytes(b); return this; }
  copyBlob() { return new Blob(Buffer.from(this._buf), this._type, this._name); }
  getAs() { return this; }
  getBlob() { return this; }
  isGoogleType() { return false; }
}

function bytesOf(v) {
  if (v instanceof Blob) return v._buf;
  if (Array.isArray(v)) return fromBytes(v);
  return Buffer.from(String(v), 'utf8');
}

// ---------------------------------------------------------------- formatDate (pola Java SimpleDateFormat)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function zoneParts(date, tz) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz || TZ, hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short',
  });
  const o = {};
  f.formatToParts(date).forEach((p) => { o[p.type] = p.value; });
  const asUtc = Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour, +o.minute, +o.second);
  const offsetMin = Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  return {
    y: +o.year, M: +o.month, d: +o.day, H: +o.hour, m: +o.minute, s: +o.second,
    S: date.getUTCMilliseconds(), dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday), offsetMin,
  };
}

function formatDate(date, tz, pattern) {
  if (!(date instanceof Date) || isNaN(date)) throw new Error('Tanggal tidak valid untuk formatDate.');
  const p = zoneParts(date, tz);
  const pad = (n, w) => String(n).padStart(w, '0');
  let out = '';
  for (let i = 0; i < pattern.length;) {
    const ch = pattern[i];
    if (ch === "'") {
      const j = pattern.indexOf("'", i + 1);
      if (j === i + 1) { out += "'"; i += 2; continue; }
      out += pattern.slice(i + 1, j < 0 ? pattern.length : j);
      i = j < 0 ? pattern.length : j + 1;
      continue;
    }
    if (!/[A-Za-z]/.test(ch)) { out += ch; i++; continue; }
    let n = 1;
    while (pattern[i + n] === ch) n++;
    i += n;
    switch (ch) {
      case 'y': out += n === 2 ? pad(p.y % 100, 2) : pad(p.y, Math.max(n, 1)); break;
      case 'Y': out += n === 2 ? pad(p.y % 100, 2) : String(p.y); break;
      case 'M': out += n >= 4 ? MONTHS[p.M - 1] : n === 3 ? MONTHS[p.M - 1].slice(0, 3) : pad(p.M, n); break;
      case 'L': out += n >= 4 ? MONTHS[p.M - 1] : n === 3 ? MONTHS[p.M - 1].slice(0, 3) : pad(p.M, n); break;
      case 'd': out += pad(p.d, n); break;
      case 'E': out += n >= 4 ? DAYS[p.dow] : DAYS[p.dow].slice(0, 3); break;
      case 'u': out += String(p.dow === 0 ? 7 : p.dow); break;
      case 'H': out += pad(p.H, n); break;
      case 'k': out += pad(p.H === 0 ? 24 : p.H, n); break;
      case 'h': out += pad(p.H % 12 === 0 ? 12 : p.H % 12, n); break;
      case 'K': out += pad(p.H % 12, n); break;
      case 'm': out += pad(p.m, n); break;
      case 's': out += pad(p.s, n); break;
      case 'S': out += pad(p.S, 3).slice(0, Math.max(n, 3)); break;
      case 'a': out += p.H < 12 ? 'AM' : 'PM'; break;
      case 'Z': { const o = p.offsetMin, s = o < 0 ? '-' : '+', a = Math.abs(o); out += s + pad(Math.floor(a / 60), 2) + pad(a % 60, 2); break; }
      case 'X': { const o = p.offsetMin, s = o < 0 ? '-' : '+', a = Math.abs(o); out += o === 0 ? 'Z' : s + pad(Math.floor(a / 60), 2) + (n >= 3 ? ':' : '') + (n >= 2 ? pad(a % 60, 2) : ''); break; }
      case 'z': out += TZ; break;
      default: out += ch.repeat(n);
    }
  }
  return out;
}

// ---------------------------------------------------------------- Cache (memori, dibagi antarpermintaan)
const cacheMap = new Map();
function cacheGet(k) {
  const e = cacheMap.get(k);
  if (!e) return null;
  if (e.exp < Date.now()) { cacheMap.delete(k); return null; }
  return e.v;
}
const MAX_CACHE_VALUE = 100 * 1024; // batas Apps Script: 100 KB per nilai
function makeCache(prefix) {
  return {
    get: (k) => cacheGet(prefix + k),
    getAll: (keys) => { const o = {}; (keys || []).forEach((k) => { const v = cacheGet(prefix + k); if (v !== null) o[k] = v; }); return o; },
    put: (k, v, ttl) => {
      const s = String(v);
      if (s.length > MAX_CACHE_VALUE) throw new Error('Argument too large: value');
      cacheMap.set(prefix + k, { v: s, exp: Date.now() + Math.min(Number(ttl) || 600, 21600) * 1000 });
    },
    putAll: (o, ttl) => { Object.keys(o || {}).forEach((k) => cacheMap.set(prefix + k, { v: String(o[k]), exp: Date.now() + Math.min(Number(ttl) || 600, 21600) * 1000 })); },
    remove: (k) => { cacheMap.delete(prefix + k); },
    removeAll: (keys) => { (keys || []).forEach((k) => cacheMap.delete(prefix + k)); },
  };
}
setInterval(() => { const now = Date.now(); for (const [k, e] of cacheMap) if (e.exp < now) cacheMap.delete(k); }, 60000).unref();

// ---------------------------------------------------------------- Properties (persisten)
function makeProps(prefix) {
  const P = store.state;
  const full = (k) => prefix + k;
  const api = {
    getProperty: (k) => {
      if (P.props.has(full(k))) return P.props.get(full(k));
      // Script Properties dari Apps Script tidak ikut impor .xlsx. Nilai rahasia (mis. ANTHROPIC_API_KEY)
      // bisa diisi lewat variabel lingkungan GAS_PROP_<NAMA> di Coolify.
      if (prefix === 'S:' && process.env['GAS_PROP_' + k] !== undefined) return process.env['GAS_PROP_' + k];
      return null;
    },
    setProperty: (k, v) => { P.props.set(full(k), String(v)); P.propsDirty.add(full(k)); P.propsDeleted.delete(full(k)); return api; },
    deleteProperty: (k) => { P.props.delete(full(k)); P.propsDeleted.add(full(k)); P.propsDirty.delete(full(k)); return api; },
    getProperties: () => { const o = {}; for (const [k, v] of P.props) if (k.startsWith(prefix)) o[k.slice(prefix.length)] = v; return o; },
    getKeys: () => Object.keys(api.getProperties()),
    setProperties: (o, deleteOthers) => {
      if (deleteOthers) api.deleteAllProperties();
      Object.keys(o || {}).forEach((k) => api.setProperty(k, o[k]));
      return api;
    },
    deleteAllProperties: () => { api.getKeys().forEach((k) => api.deleteProperty(k)); return api; },
  };
  return api;
}

// ---------------------------------------------------------------- HtmlService
function makeHtmlOutput(content) {
  const o = {
    _content: String(content || ''),
    _title: '',
    _meta: [],
    getContent: () => o._content,
    setContent: (c) => { o._content = String(c); return o; },
    append: (c) => { o._content += String(c); return o; },
    appendUntrusted: (c) => { o._content += String(c).replace(/[&<>"']/g, (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x])); return o; },
    setTitle: (t) => { o._title = String(t || ''); return o; },
    getTitle: () => o._title,
    addMetaTag: (n, c) => { o._meta.push([n, c]); return o; },
    setFaviconUrl: (u) => { o._favicon = u; return o; },
    setXFrameOptionsMode: () => o,
    setSandboxMode: () => o,
    setWidth: () => o,
    setHeight: () => o,
    asTemplate: () => null,
    getBlob: () => new Blob(o._content, 'text/html'),
    getAs: () => new Blob(o._content, 'text/html'),
  };
  return o;
}

// ---------------------------------------------------------------- belum tersedia
function notYet(service) {
  return new Proxy({}, {
    get(t, prop) {
      if (prop === 'Access') return { ANYONE: 'ANYONE', ANYONE_WITH_LINK: 'ANYONE_WITH_LINK', DOMAIN: 'DOMAIN', DOMAIN_WITH_LINK: 'DOMAIN_WITH_LINK', PRIVATE: 'PRIVATE' };
      if (prop === 'Permission') return { VIEW: 'VIEW', EDIT: 'EDIT', COMMENT: 'COMMENT', NONE: 'NONE', OWNER: 'OWNER' };
      if (prop === 'getRemainingDailyQuota') return () => 0;
      if (typeof prop === 'symbol') return undefined;
      return () => { throw new Error(`Fitur ${service}.${String(prop)} belum tersedia di server baru. Fitur ini akan diaktifkan pada tahap berikutnya.`); };
    },
  });
}

/**
 * Membuat objek global untuk satu eksekusi kode lama.
 * ctx: { files: Map nama->isi HTML, appUrl, runInContext(fn) }
 */
function makeGlobals(ctx) {
  const cacheScript = makeCache('S:');
  const drive = makeDrive(Blob);
  const SpreadsheetApp = {
    openById: (id) => {
      const b = store.book(id);
      if (!b) throw new Error('Spreadsheet ' + id + ' tidak tersedia di server.');
      return new Spreadsheet(b);
    },
    openByUrl: (url) => SpreadsheetApp.openById((String(url).match(/\/d\/([^/]+)/) || [])[1]),
    getActiveSpreadsheet: () => new Spreadsheet(store.book()),
    getActive: () => new Spreadsheet(store.book()),
    flush: () => {},
    create: () => { throw new Error('Membuat spreadsheet baru belum tersedia di server baru.'); },
    getUi: () => { throw new Error('UI spreadsheet tidak tersedia.'); },
    CopyPasteType: { PASTE_VALUES: 'PASTE_VALUES', PASTE_NORMAL: 'PASTE_NORMAL', PASTE_FORMAT: 'PASTE_FORMAT' },
    newRichTextValue: () => {
      const v = { _t: '', _l: null };
      const b = { setText: (t) => { v._t = t; return b; }, setLinkUrl: (a, c, u) => { v._l = u === undefined ? a : u; return b; }, setTextStyle: () => b, build: () => ({ getText: () => v._t, getLinkUrl: () => v._l, getRuns: () => [] }) };
      return b;
    },
    newDataValidation: () => {
      const b = new Proxy({}, { get: (t, p) => (p === 'build' ? () => ({}) : () => b) });
      return b;
    },
    BorderStyle: {}, WrapStrategy: {}, ProtectionType: {}, Dimension: { ROWS: 'ROWS', COLUMNS: 'COLUMNS' },
  };

  const HtmlService = {
    createTemplateFromFile: (name) => {
      const src = ctx.files.get(String(name).replace(/\.html$/i, ''));
      if (src === undefined) throw new Error('File HTML tidak ditemukan: ' + name);
      return compileTemplate(src, name, ctx);
    },
    createTemplate: (src) => compileTemplate(String(src), 'inline', ctx),
    createHtmlOutputFromFile: (name) => {
      const src = ctx.files.get(String(name).replace(/\.html$/i, ''));
      if (src === undefined) throw new Error('File HTML tidak ditemukan: ' + name);
      return makeHtmlOutput(src);
    },
    createHtmlOutput: (c) => makeHtmlOutput(c && c.getDataAsString ? c.getDataAsString() : c || ''),
    XFrameOptionsMode: { ALLOWALL: 'ALLOWALL', DEFAULT: 'DEFAULT' },
    SandboxMode: { IFRAME: 'IFRAME', NATIVE: 'NATIVE', EMULATED: 'EMULATED' },
  };

  const Utilities = {
    getUuid: () => crypto.randomUUID(),
    formatDate,
    formatString: (fmt, ...args) => { let i = 0; return String(fmt).replace(/%[sdf]/g, () => String(args[i++])); },
    base64Encode: (v) => bytesOf(v).toString('base64'),
    base64EncodeWebSafe: (v) => bytesOf(v).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
    base64Decode: (s) => toBytes(Buffer.from(String(s), 'base64')),
    base64DecodeWebSafe: (s) => toBytes(Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
    newBlob: (data, type, name) => new Blob(data, type, name),
    computeDigest: (alg, v) => toBytes(crypto.createHash(String(alg).toLowerCase().replace('_', '')).update(bytesOf(v)).digest()),
    computeHmacSha256Signature: (v, key) => toBytes(crypto.createHmac('sha256', bytesOf(key)).update(bytesOf(v)).digest()),
    computeHmacSignature: (alg, v, key) => toBytes(crypto.createHmac(String(alg).toLowerCase().replace('hmac_', '').replace('_', ''), bytesOf(key)).update(bytesOf(v)).digest()),
    gzip: (blob, name) => new Blob(zlib.gzipSync(blob._buf), 'application/x-gzip', name || (blob.getName() ? blob.getName() + '.gz' : null)),
    ungzip: (blob) => new Blob(zlib.gunzipSync(blob._buf), 'application/octet-stream'),
    sleep: (ms) => { const end = Date.now() + Math.min(Number(ms) || 0, 2000); while (Date.now() < end) { /* tunggu */ } },
    parseCsv: (s) => String(s).split(/\r?\n/).map((l) => l.split(',')),
    DigestAlgorithm: { MD5: 'MD5', SHA_1: 'SHA_1', SHA_256: 'SHA_256', SHA_512: 'SHA_512' },
    MacAlgorithm: { HMAC_SHA_256: 'HMAC_SHA_256', HMAC_SHA_1: 'HMAC_SHA_1' },
    Charset: { UTF_8: 'UTF-8', US_ASCII: 'US-ASCII' },
  };

  const ScriptApp = {
    getService: () => ({ getUrl: () => ctx.appUrl, isEnabled: () => true }),
    getOAuthToken: () => { try { return gauth.accessTokenSync(); } catch (e) { return ''; } },
    getScriptId: () => 'pmo-web',
    getProjectTriggers: () => [],
    newTrigger: () => { const b = new Proxy({}, { get: (t, p) => (p === 'create' ? () => ({ getUniqueId: () => crypto.randomUUID() }) : () => b) }); return b; },
    deleteTrigger: () => {},
    AuthMode: { FULL: 'FULL', NONE: 'NONE' },
  };

  const Session = {
    getScriptTimeZone: () => TZ,
    getActiveUser: () => ({ getEmail: () => (ctx.user && ctx.user.email) || '' }),
    getEffectiveUser: () => ({ getEmail: () => process.env.GAS_OWNER_EMAIL || '' }),
    getTemporaryActiveUserKey: () => (ctx.user && ctx.user.username) || '',
  };

  const Logger = { log: (...a) => { console.log(JSON.stringify({ ev: 'gas_log', msg: a.map(String).join(' ').slice(0, 500) })); return Logger; } };
  const lock = { tryLock: () => true, waitLock: () => {}, releaseLock: () => {}, hasLock: () => true };

  return {
    SpreadsheetApp,
    HtmlService,
    Utilities,
    ScriptApp,
    Session,
    Logger,
    console: { log: Logger.log, info: Logger.log, warn: Logger.log, error: (...a) => console.error(JSON.stringify({ ev: 'gas_error', msg: a.map(String).join(' ').slice(0, 500) })) },
    CacheService: { getScriptCache: () => cacheScript, getUserCache: () => makeCache('U:' + ((ctx.user && ctx.user.username) || '') + ':'), getDocumentCache: () => cacheScript },
    PropertiesService: { getScriptProperties: () => makeProps('S:'), getUserProperties: () => makeProps('U:' + ((ctx.user && ctx.user.username) || '') + ':'), getDocumentProperties: () => makeProps('D:') },
    LockService: { getScriptLock: () => lock, getUserLock: () => lock, getDocumentLock: () => lock },
    DriveApp: drive.DriveApp,
    UrlFetchApp: drive.UrlFetchApp,
    MailApp: notYet('MailApp'),
    GmailApp: notYet('GmailApp'),
    DocumentApp: notYet('DocumentApp'),
    SlidesApp: notYet('SlidesApp'),
    ContentService: notYet('ContentService'),
    Drive: notYet('Drive'),
  };
}

module.exports = { makeGlobals, formatDate, Blob, makeHtmlOutput, clearCache: () => cacheMap.clear() };

'use strict';

/**
 * Menjalankan kode Apps Script lama (folder legacy/) di Node.js.
 *
 * Semua berkas .gs digabung (urut seperti di proyek Apps Script) ke dalam satu fungsi pabrik.
 * Setiap permintaan memanggil pabrik itu sekali, sehingga variabel tingkat atas
 * (cache, konfigurasi) selalu baru, sama seperti satu eksekusi Apps Script.
 * Data spreadsheet, cache, dan properti tetap dibagi lewat src/gas/store.js.
 */

const fs = require('node:fs');
const path = require('node:path');
const { makeGlobals, makeHtmlOutput } = require('./services');

const LEGACY_DIR = path.join(__dirname, '..', '..', 'legacy');

let factory = null;
const GLOBAL_NAMES = ['SpreadsheetApp', 'HtmlService', 'Utilities', 'ScriptApp', 'Session', 'Logger', 'console',
  'CacheService', 'PropertiesService', 'LockService', 'DriveApp', 'UrlFetchApp', 'MailApp', 'GmailApp',
  'DocumentApp', 'SlidesApp', 'ContentService', 'Drive'];
let htmlFiles = null;
let publicNames = null;

// Fungsi akun lama yang sudah digantikan halaman baru (/akun/password, /admin/akun).
const RETIRED = ['authCheckSetup', 'authCreateFirstAdmin', 'authBeginLogin', 'authCompleteLogin', 'authRequestAccount',
  'authBeginSignup', 'authCompleteSignup', 'authReviewAccount', 'authRequestReset', 'authResetRequests',
  'authIssueResetCode', 'authCancelReset', 'authBeginReset', 'authCompleteReset', 'authChangePwBegin',
  'authChangePwComplete'];

/**
 * Perubahan kecil pada HTML lama, diterapkan saat dimuat supaya berkas di legacy/
 * tetap identik dengan Apps Script (mudah disinkronkan ulang).
 */
const HTML_PATCHES = [
  {
    file: 'AccountMenu',
    find: "b.innerHTML=SV(kind==='admin'?USR:KEY)+'<span>'+(kind==='admin'?'Reset password pengguna':'Ganti password')+'</span>';b.onclick=function(e){e.stopPropagation();kind==='admin'?admin():change()};",
    replace: "var NAV={self:['Ganti password','/akun/password'],admin:['Kelola Akun','/admin/akun'],data:['Impor Data','/admin/data'],google:['Koneksi Google','/admin/google']}[kind];b.innerHTML=SV(kind==='self'?KEY:USR)+'<span>'+NAV[0]+'</span>';b.onclick=function(e){e.stopPropagation();location.href=NAV[1]};",
  },
  {
    // Menu admin server baru: Kelola Akun, Impor Data, Koneksi Google.
    file: 'AccountMenu',
    find: "p.insertBefore(btnFor(ref,'self'),ref);if(role==='ADMIN')p.insertBefore(btnFor(ref,'admin'),ref)",
    replace: "p.insertBefore(btnFor(ref,'self'),ref);if(role==='ADMIN'){p.insertBefore(btnFor(ref,'admin'),ref);p.insertBefore(btnFor(ref,'data'),ref);p.insertBefore(btnFor(ref,'google'),ref)}",
  },
];

/** Penghubung login baru (cookie) ke bentuk akun yang dikenal kode lama. */
const BRIDGE_CODE = `
;(function () {
  authGetSession = function (token) {
    var u = __bridge.user();
    if (!u) return { success: false, message: 'Sesi tidak valid atau telah berakhir.' };
    return { success: true, user: u };
  };
  authLogout = function () { __bridge.logout(); return { success: true, message: 'Anda telah logout.' }; };
  authPendingAccounts = function () { return []; };
  authResendPendingNotifications = function () { return { success: true, sent: 0, failed: 0, message: 'Tidak ada permintaan akun.', errors: [] }; };
${RETIRED.map((n) => `  ${n} = function () { throw new Error('Akun kini dikelola di menu Ganti Password dan Kelola Akun.'); };`).join('\n')}
  getLoginPageHtml = function () {
    return '<!doctype html><meta charset="utf-8"><script>location.replace("/login")</script>';
  };
})();
`;

function load() {
  const order = JSON.parse(fs.readFileSync(path.join(LEGACY_DIR, 'order.json'), 'utf8'));
  const gsFiles = order.map((n) => ({ name: n, src: fs.readFileSync(path.join(LEGACY_DIR, n + '.gs'), 'utf8') }));
  htmlFiles = new Map();
  fs.readdirSync(LEGACY_DIR).filter((f) => f.endsWith('.html')).forEach((f) => {
    htmlFiles.set(f.replace(/\.html$/, ''), fs.readFileSync(path.join(LEGACY_DIR, f), 'utf8'));
  });
  for (const p of HTML_PATCHES) {
    const src = htmlFiles.get(p.file);
    if (src && src.includes(p.find)) htmlFiles.set(p.file, src.replace(p.find, p.replace));
    else console.warn(JSON.stringify({ ev: 'gas_patch_miss', file: p.file }));
  }

  const code = gsFiles.map((f) => '// ---- ' + f.name + '.gs\n' + f.src).join('\n;\n');
  const fnNames = new Set();
  const varNames = new Set();
  for (const m of code.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) fnNames.add(m[1]);
  for (const m of code.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)) varNames.add(m[1]);
  const exportList = [...fnNames, ...varNames].filter((n, i, a) => a.indexOf(n) === i);
  const ret = 'return {' + exportList.map((n) => JSON.stringify(n) + ': (typeof ' + n + ' === "undefined" ? undefined : ' + n + ')').join(',') + '};';

  // Layanan pengganti diberikan sebagai parameter fungsi (lebih cepat daripada 'with').
  const body = code + '\n' + BRIDGE_CODE + '\n' + ret;
  // eslint-disable-next-line no-new-func
  factory = new Function(...GLOBAL_NAMES, '__bridge', body);
  // Fungsi yang boleh dipanggil dari halaman: sama seperti google.script.run,
  // fungsi berakhiran "_" bersifat privat.
  publicNames = new Set([...fnNames].filter((n) => !n.endsWith('_')));
  return { functions: fnNames.size, html: htmlFiles.size };
}

/**
 * Membuat satu lingkup eksekusi.
 * opts: { user (akun kode lama atau null), appUrl, onLogout }
 */
function createScope(opts) {
  if (!factory) load();
  const ctx = {
    files: htmlFiles,
    appUrl: opts.appUrl,
    user: opts.user,
    makeHtmlOutput,
    scope: null,
  };
  const globals = makeGlobals(ctx);
  const bridge = {
    user: () => (opts.user ? { ...opts.user, createdAt: Date.now() } : null),
    logout: () => { if (opts.onLogout) opts.onLogout(); },
  };
  const exported = factory(...GLOBAL_NAMES.map((n) => globals[n]), bridge);
  // Templat melihat fungsi/konstanta kode lama dan layanan global.
  ctx.scope = new Proxy({}, {
    has: (t, k) => typeof k === 'string' && (k in exported || k in globals),
    get: (t, k) => (k in exported ? exported[k] : globals[k]),
  });
  return { exported, globals, ctx };
}

function isPublic(name) {
  if (!factory) load();
  return publicNames.has(name);
}

module.exports = { load, createScope, isPublic, LEGACY_DIR };

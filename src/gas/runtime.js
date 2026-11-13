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

/** Pengelompokan kartu Portal (disisipkan ke Portal.html). */
const PORTAL_GROUPS_JS = `function pmoGroupedCards(items,b,card,esc,thumb){
  var G=(b.groups&&b.groups.map)||{},X=(b.groups&&b.groups.parents)||{};
  if(!document.getElementById('pmoGroupCss')){var st=document.createElement('style');st.id='pmoGroupCss';st.textContent='#pulse.pulse-g{display:block}.pg{margin:0 0 24px}.pg:last-child{margin-bottom:0}.pg-h{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;margin:0 0 12px;font-size:14px;font-weight:700;color:var(--ink,#13324f)}.pg-h span{font-size:12px;font-weight:500;color:var(--muted,#6b7c8a)}.pg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}.pc.pc-sub{border-left:4px solid var(--pri,#0f5fa8)}.pc-par{display:block;font-size:11px;font-weight:600;letter-spacing:.01em;opacity:.9;margin-bottom:3px}.pc-mn .pc-par{color:var(--pri,#0f5fa8);opacity:1}.pce{display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:var(--card,#fff);border:1px dashed var(--line,#d5dde3)}.pce .pc-img{opacity:.75}.pce-b{padding:14px}.pce-n{display:none;color:var(--ink,#13324f);font-size:15px;margin-bottom:4px}.pce p{margin:0;font-size:13px;color:var(--muted,#6b7c8a)}@media (max-width:760px){.pg-grid{grid-template-columns:minmax(0,1fr);gap:10px}.pc.pc-sub{margin-left:12px}.pce .pc-img{display:none}.pce-n{display:block}}';document.head.appendChild(st)}
  var type=function(id){return (G[id]&&G[id].type)||'PENGEMBANGAN'},par=function(id){return G[id]&&G[id].parent};
  var byId={},subs={};items.forEach(function(i){byId[i.projectId]=i});
  items.forEach(function(i){var pid=par(i.projectId);if(type(i.projectId)==='SUB'&&pid&&(byId[pid]||X[pid]))(subs[pid]=subs[pid]||[]).push(i)});
  var dev=[],rut=[];
  items.forEach(function(i){var t=type(i.projectId),pid=par(i.projectId);if(t==='SUB'&&pid&&(byId[pid]||X[pid]))return;(t==='RUTIN'?rut:dev).push(i)});
  Object.keys(subs).forEach(function(pid){if(!byId[pid]&&X[pid])dev.push({__empty:true,projectId:pid,name:X[pid].name,banner:X[pid].banner})});
  var nameOf=function(pid){return byId[pid]?byId[pid].name:X[pid]?X[pid].name:pid};
  var subCard=function(i){var lbl='<small class="pc-par">Sub-proyek \\u00b7 '+esc(pmoProjName(nameOf(par(i.projectId))))+'</small>';return card(i).replace('class="pc ','class="pc pc-sub ').replace('<h4>','<h4>'+lbl).replace('<div class="pc-mn"><b>','<div class="pc-mn"><b>'+lbl)};
  var empty=function(i){return '<div class="pce"><div class="pc-img"'+(i.banner?' style="background-image:url(\\''+thumb(i.banner,480)+'\\')"':'')+'><span class="pc-st wait">Belum ada data</span><h4>'+esc(pmoProjName(i.name))+'</h4></div><div class="pce-b"><b class="pce-n">'+esc(pmoProjName(i.name))+'</b><p>Belum ada data progres mingguan. Sub-proyeknya ditampilkan setelah kartu ini.</p></div></div>'};
  var count=function(list){var n=0,ok=0;var all=[];list.forEach(function(i){all.push(i);(subs[i.projectId]||[]).forEach(function(s){all.push(s)})});all.forEach(function(i){if(i.__empty)return;n++;var s=i.lw?i.lw.status:i.status;if(s==='On track')ok++});return n?n+' proyek \\u00b7 '+ok+' on track':''};
  var block=function(title,list){if(!list.length)return '';var h='';list.forEach(function(i){h+=i.__empty?empty(i):card(i);(subs[i.projectId]||[]).forEach(function(s){h+=subCard(s)})});return '<div class="pg"><div class="pg-h">'+title+'<span>'+count(list)+'</span></div><div class="pg-grid">'+h+'</div></div>'};
  $('pulse').classList.add('pulse-g');
  return block('Proyek Pengembangan',dev)+block('Proyek Investasi Rutin',rut);
}
`;

/**
 * Perubahan kecil pada HTML lama, diterapkan saat dimuat supaya berkas di legacy/
 * tetap identik dengan Apps Script (mudah disinkronkan ulang).
 */
const HTML_PATCHES = [
  {
    file: 'AccountMenu',
    find: "b.innerHTML=SV(kind==='admin'?USR:KEY)+'<span>'+(kind==='admin'?'Reset password pengguna':'Ganti password')+'</span>';b.onclick=function(e){e.stopPropagation();kind==='admin'?admin():change()};",
    replace: "var NAV={self:['Ganti password','/akun/password'],admin:['Kelola Akun','/admin/akun'],data:['Impor Data','/admin/data'],kelompok:['Kelompok Proyek','/admin/kelompok'],google:['Koneksi Google','/admin/google']}[kind];b.innerHTML=SV(kind==='self'?KEY:USR)+'<span>'+NAV[0]+'</span>';b.onclick=function(e){e.stopPropagation();location.href=NAV[1]};",
  },
  {
    // Menu admin server baru: Kelola Akun, Impor Data, Koneksi Google.
    file: 'AccountMenu',
    find: "p.insertBefore(btnFor(ref,'self'),ref);if(role==='ADMIN')p.insertBefore(btnFor(ref,'admin'),ref)",
    replace: "p.insertBefore(btnFor(ref,'self'),ref);if(role==='ADMIN'){p.insertBefore(btnFor(ref,'admin'),ref);p.insertBefore(btnFor(ref,'data'),ref);p.insertBefore(btnFor(ref,'kelompok'),ref);p.insertBefore(btnFor(ref,'google'),ref)}",
  },
  {
    // Kartu proyek Portal: pakai nilai week terakhir (field lw) dan tanpa baris "Naik … poin".
    file: 'Portal',
    find: "$('pulse').innerHTML=items.map(function(i){",
    replace: "const __card=function(i){i=i.lw?Object.assign({},i,i.lw,{pending:false,prevActual:null,cutWeek:i.lw.week,last:null}):Object.assign({},i,{prevActual:null});",
  },
  {
    // Kartu dikelompokkan: Pengembangan (sub-proyek di bawah induknya) dan Rutin.
    file: 'Portal',
    find: "+'</button>'}).join('');\n  $('pulse').querySelectorAll('.pc')",
    replace: "+'</button>'};$('pulse').innerHTML=pmoGroupedCards(items,b,__card,esc,thumb);\n  $('pulse').querySelectorAll('.pc')",
  },
  {
    file: 'Portal',
    find: 'function renderPulse(b){',
    replace: PORTAL_GROUPS_JS + 'function renderPulse(b){',
  },
  // Panel "Permintaan Akun" lama tidak dipakai lagi: akun dikelola di /admin/akun.
  ...['Portal', 'ExecutiveDashboard'].map((file) => ({
    file,
    find: "box=document.createElement('div');box.id=key;box.className='pmo-requests';box.hidden=true;",
    replace: "return;box=document.createElement('div');box.id=key;box.className='pmo-requests';box.hidden=true;",
  })),
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
  // Portal: kartu proyek memakai week terakhir yang sudah diisi (bukan week cut-off bulanan).
  // Ringkasan atas (hero) tetap cut-off bulanan; nilai week terakhir dikirim di field 'lw'.
  var __origPortal = getPortalData;
  getPortalData = function (token) {
    var r = __origPortal(token);
    try {
      var items = r && r.brief && r.brief.items;
      if (!items || !items.length) return r;
      var db = loadDb_();
      var pct = function (v) { return v === null || v === undefined ? null : v / 100; };
      r = Object.assign({}, r, { brief: Object.assign({}, r.brief, { items: items.map(function (i) {
        var w = Number(i.latestWeek) || 0;
        if (!w) return i;
        var act = pct(weekPercent_(db.weekly, i.projectId, 'KOMULATIF_REALISASI', w));
        var plan = pct(weekPercent_(db.weekly, i.projectId, 'KOMULATIF_PLAN', w));
        if (act === null) return i;
        var dev = plan === null ? null : act - plan;
        var hl = weekText_(db.weekly, i.projectId, 'HIGHLIGHT_ACTIVITY', w) || weekText_(db.weekly, i.projectId, 'HIGHLIGHT', w);
        hl = String(hl || '').split(/\\n+/).map(function (x) { return x.replace(/^\\s*(?:\\d+[.)]|[-\\u2022*])\\s*/, '').trim(); }).filter(Boolean)[0] || '';
        if (hl.length > 150) hl = hl.slice(0, 147).replace(/\\s+\\S*$/, '') + '\\u2026';
        var status = dev === null ? 'Data tidak tersedia' : dev < DB_CONFIG.CRITICAL_DEVIATION ? 'Critical' : dev <= 0 ? 'At risk' : 'On track';
        return Object.assign({}, i, { lw: { week: w, actual: act, plan: plan, deviation: dev, status: status, highlight: hl || i.highlight } });
      }) }) });
    } catch (e) { /* kalau gagal, Portal tetap tampil dengan data cut-off */ }
    try {
      if (r && r.brief && r.brief.items) {
        var gmap = __bridge.groups(), parents = {}, u = __bridge.user() || {};
        if (String(u.role || '').toUpperCase() !== 'KONTRAKTOR') {
          var have = {};
          r.brief.items.forEach(function (i) { have[i.projectId] = 1; });
          var db2 = loadDb_();
          r.brief.items.forEach(function (i) {
            var g = gmap[i.projectId], pid = g && g.type === 'SUB' ? g.parent : null;
            if (!pid || have[pid] || parents[pid]) return;
            var p = (db2.allProjects || []).filter(function (x) { return x.id === pid; })[0];
            if (p) parents[pid] = { name: p.name, banner: (function () { try { return projectBannerId_(db2, p); } catch (e) { return ''; } })() };
          });
        }
        r = Object.assign({}, r, { brief: Object.assign({}, r.brief, { groups: { map: gmap, parents: parents } }) });
      }
    } catch (e) { /* tanpa kelompok, kartu tampil seperti biasa */ }
    return r;
  };
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
    groups: () => require('../lib/groups').all(),
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

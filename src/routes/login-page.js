'use strict';

/**
 * Halaman login dengan tampilan asli Apps Script (legacy/Login.html).
 *
 * Tampilan diambil apa adanya. Yang diganti hanya perilakunya:
 * - Tombol LOGIN memakai login server ini (POST /api/auth/login), bukan alur PBKDF2 Apps Script.
 * - "Buat akun" disembunyikan, karena akun dibuat Admin di Kelola Akun.
 * - "Lupa password?" menampilkan arahan untuk menghubungi Admin PMO.
 * Kalau ada yang gagal saat menyusun halaman ini, server memakai halaman login sederhana.
 */

const runtime = require('../gas/runtime');

// google.script.run palsu: halaman login tidak boleh memanggil server lama
// (pemanggilan tanpa sesi akan memantul ke /login terus-menerus).
const STUB = `<script>
(function(){
  function chain(){var p=new Proxy({},{get:function(t,k){return /^with/.test(String(k))?function(){return p}:function(){}}});return p}
  window.google=window.google||{};window.google.script={run:chain(),host:{close:function(){},setHeight:function(){}}};
})();
</script>`;

const PATCH = `<script>
(function(){
  var $=function(i){return document.getElementById(i)};
  ['signupIntro','signupPanel','resetPanel'].forEach(function(i){var e=$(i);if(e){e.hidden=true;e.style.display='none'}});
  var lbl=$('pmoProofLabel');if(lbl)lbl.textContent='Verifikasi Sandi';
  var form=$('loginForm'),btn=$('loginButton'),box=$('pmoLoginSteps'),busy=false;
  function say(t,bad){var m=$('message');if(!m)return;m.textContent=t;m.style.color=bad?'var(--msg-bad)':'var(--msg-ok)'}
  function step(n,err){if(!box)return;Array.prototype.forEach.call(box.children,function(li,i){li.className=i+1<n?'is-done':i+1===n?(err?'is-error':'is-active'):''})}
  document.addEventListener('click',function(e){
    var t=e.target&&e.target.closest&&e.target.closest('#showResetButton');
    if(!t)return;e.preventDefault();e.stopPropagation();
    say('Lupa password? Hubungi Admin PMO. Admin akan membuatkan password sementara untuk Anda.',false);
  },true);
  /* video pembuka diunduh lebih awal selagi pengguna mengetik, agar langsung diputar setelah login */
  setTimeout(function(){try{var pt=!!(window.matchMedia&&matchMedia('(orientation: portrait)').matches&&innerWidth<900);var im=new Image();im.src=pt?'/media/pmo-intro-portrait-poster.jpg':'/media/pmo-intro-poster.jpg';var l=document.createElement('link');l.rel='prefetch';l.as='video';l.href=pt?'/media/pmo-intro-portrait.mp4':'/media/pmo-intro.mp4';document.head.appendChild(l)}catch(x){}},700);
  document.addEventListener('submit',async function(e){
    if(e.target!==form)return;
    e.preventDefault();e.stopPropagation();
    if(busy)return;
    var u=$('username').value.trim(),p=$('password').value;
    if(!u||!p){say('Username dan password wajib diisi.',true);return}
    busy=true;btn.disabled=true;btn.textContent='MEMERIKSA…';step(1);say('Memeriksa akun…',false);
    try{
      step(2);
      var r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:u,password:p})});
      var j=null;try{j=await r.json()}catch(x){}
      if(!j||!j.ok)throw new Error((j&&j.error)||'Login belum berhasil. Silakan coba lagi.');
      step(3);btn.textContent='LOGIN BERHASIL';
      var must=j.data&&j.data.mustChangePassword;
      if(!must){try{sessionStorage.setItem('pmoIntro','1')}catch(x){}}
      say(must?'Login berhasil. Silakan ganti password sementara Anda…':'Login berhasil. Membuka Portal…',false);
      location.href=must?'/akun/password':'/';
    }catch(err){
      step(2,true);$('password').value='';
      say(err.message||'Login belum berhasil. Silakan coba lagi.',true);
      busy=false;btn.disabled=false;btn.textContent='LOGIN';
    }
  },true);
})();
</script>`;

const TITLE = 'PMO Dashboard — Infrastructure & Process Plant | PT Petrokimia Gresik';
const DESC = 'Portal Project Management Office (PMO) Infrastructure & Process Plant PT Petrokimia Gresik untuk pemantauan progres proyek secara terintegrasi.';
const escAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Metadata halaman login: judul, deskripsi, ikon tab, dan pratinjau tautan (WhatsApp/Teams). Tidak diindeks. */
function headMeta(base) {
  const b = String(base || '').replace(/\/$/, '');
  const img = b + '/media/pmo-intro-poster.jpg';
  return [
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + TITLE.replace(/&/g, '&amp;') + '</title>',
    '<meta name="description" content="' + escAttr(DESC) + '">',
    '<meta name="robots" content="noindex, nofollow">',
    b ? '<link rel="canonical" href="' + escAttr(b + '/login') + '">' : '',
    '<link rel="icon" type="image/png" href="/media/brand/icon.png">',
    '<link rel="apple-touch-icon" href="/media/brand/icon.png">',
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<meta property="og:type" content="website"><meta property="og:locale" content="id_ID">',
    '<meta property="og:site_name" content="PMO PT Petrokimia Gresik">',
    '<meta property="og:title" content="' + escAttr(TITLE) + '">',
    '<meta property="og:description" content="' + escAttr(DESC) + '">',
    b ? '<meta property="og:url" content="' + escAttr(b + '/') + '"><meta property="og:image" content="' + escAttr(img) + '">' : '',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + escAttr(TITLE) + '"><meta name="twitter:description" content="' + escAttr(DESC) + '">',
    b ? '<meta name="twitter:image" content="' + escAttr(img) + '">' : '',
  ].filter(Boolean).join('\n');
}

// Perbaikan tampilan: kartu muat di layar laptop pendek (tanpa dua scrollbar), tombol tema tidak menimpa logo di HP.
const FIX_CSS = `<style>
html,body{margin:0}
.pmo-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.company-logo{aspect-ratio:220/201;height:auto!important;width:min(220px,56vw)!important;max-width:100%}
@media (max-height:800px){
  .login-wrapper{padding-top:10px!important;padding-bottom:10px!important}
  .login-card{padding-top:16px!important;padding-bottom:14px!important;max-height:none!important;overflow:visible!important}
  .brand-mark .company-logo,.company-logo{width:132px!important;max-width:132px!important}
  .login-card h1{margin:6px 0 2px!important}.login-card .subtitle{margin-bottom:10px!important}
  .login-card input{padding-top:10px!important;padding-bottom:10px!important}
  .login-card label{margin-top:8px!important}
  .login-footer{margin-top:12px!important;padding-top:10px!important}
  .pmo-login-steps{margin-top:10px!important}
}
@media (max-height:660px){.brand-mark .company-logo,.company-logo{width:96px!important;max-width:96px!important}}
@media (max-width:560px){
  .theme-switch{position:absolute!important;top:10px!important;right:10px!important;padding:3px!important}
  .theme-switch button{padding:6px 9px!important;font-size:0!important;gap:0!important}
  .theme-switch button svg{width:16px;height:16px}
  .login-wrapper{padding-top:58px!important}
}
</style>`;

function render(appUrl, base) {
  const { globals } = runtime.createScope({ user: null, appUrl, onLogout() {} });
  const t = globals.HtmlService.createTemplateFromFile('Login');
  t.appUrl = appUrl;
  let html = t.evaluate().getContent();
  if (!/id="loginForm"/.test(html)) throw new Error('Login.html tidak berisi loginForm');
  // Karakter nyasar setelah </html> di berkas lama ikut tampil di bawah halaman.
  html = html.replace(/<\/html>[\s\S]*$/i, '</html>');
  // Gambar identitas dari server sendiri (lihat routes/brand.js), bukan langsung dari Google Drive.
  html = html.split('https://drive.google.com/thumbnail?id=1JP0hqePxcaiFN0aZ2dv6WJ6qCNwrRLxf&sz=w800').join('/media/brand/logo.png')
    .split('https://drive.google.com/thumbnail?id=1W4smcs4NnfWWq4ruAub6SifsfyF4unC6&sz=w2000').join('/media/brand/login-bg.jpg');
  html = html.replace('class="company-logo">', 'class="company-logo" width="220" height="201" fetchpriority="high">');
  // Tanpa JavaScript pun form tidak boleh mengirim sandi lewat alamat (GET).
  html = html.replace('<form id="loginForm">', '<form id="loginForm" method="post" action="/login">');
  // Satu judul utama yang bermakna untuk pembaca layar; tampilan tidak berubah.
  html = html.replace('<h1>DASHBOARD</h1>', '<h1>DASHBOARD<span class="pmo-sr"> — Project Monitoring, PMO PT Petrokimia Gresik</span></h1>')
    .replace('<p class="subtitle">PROJECT MONITORING</p>', '<p class="subtitle" aria-hidden="true">PROJECT MONITORING</p>');
  html = html.replace(/<div class="login-footer">Project Management Office<br>/, '<div class="login-footer">Project Management Office <br>');
  html = /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (m) => m + '\n' + headMeta(base) + STUB)
    : STUB + html;
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, () => FIX_CSS + '</head>') : html;
  html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, () => PATCH + '</body>') : html + PATCH;
  if (!/^\s*<!doctype/i.test(html)) html = '<!doctype html>\n' + html;
  return html;
}

module.exports = { render };

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

function render(appUrl) {
  const { globals } = runtime.createScope({ user: null, appUrl, onLogout() {} });
  const t = globals.HtmlService.createTemplateFromFile('Login');
  t.appUrl = appUrl;
  let html = t.evaluate().getContent();
  if (!/id="loginForm"/.test(html)) throw new Error('Login.html tidak berisi loginForm');
  html = /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (m) => m + '\n<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Masuk · PMO Dashboard</title>' + STUB)
    : STUB + html;
  html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, PATCH + '</body>') : html + PATCH;
  if (!/^\s*<!doctype/i.test(html)) html = '<!doctype html>\n' + html;
  return html;
}

module.exports = { render };

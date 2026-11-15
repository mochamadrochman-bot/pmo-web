'use strict';

/**
 * Animasi pembuka Login -> Portal: video motion graphics landscape 10 detik
 * (dibuat dengan Remotion, proyek "REMOTION PROJECT/vid-remotion", komposisi PmoIntroLandscape).
 * Berkas: public/media/pmo-intro.mp4 (+ poster pmo-intro-poster.jpg, pmo-intro-end.jpg).
 *
 * Diputar sekali setelah login berhasil (penanda sessionStorage.pmoIntro === '1'),
 * di atas halaman Portal sambil data Portal dimuat di belakangnya.
 * Dapat dinonaktifkan Admin lewat /admin/data (gas_props 'SYS:INTRO').
 * Browser hanya mengizinkan putar otomatis tanpa suara; tombol "Suara" menyalakan backsound.
 */

const PORTAL_INTRO_SNIPPET = `<style id="pmoPortalIntroStyle">
#pmoPortalIntro{position:fixed;inset:0;z-index:2147482500;background:#e9eff5 url(/media/pmo-intro-poster.jpg) center/cover no-repeat;display:flex;align-items:center;justify-content:center;opacity:1;transition:opacity .35s ease;font-family:Inter,"Segoe UI",Arial,sans-serif}
#pmoPortalIntro.is-leaving{opacity:0;pointer-events:none}
#pmoPortalIntro video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:transparent;display:block;opacity:0;transition:opacity .25s ease}
#pmoPortalIntro.is-playing video{opacity:1}
#pmoPortalIntro .pi-load{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:12px;color:#0a2240;font-size:13px;font-weight:600;background:rgba(255,255,255,.82);padding:16px 22px;border-radius:16px;box-shadow:0 10px 30px rgba(10,34,64,.12)}
#pmoPortalIntro .pi-load i{width:34px;height:34px;border-radius:50%;border:3px solid rgba(15,95,168,.18);border-top-color:#0f5fa8;animation:piSpin .8s linear infinite}
#pmoPortalIntro.is-playing .pi-load{display:none}
@keyframes piSpin{to{transform:rotate(360deg)}}
#pmoPortalIntro .pi-ctl{position:absolute;right:24px;bottom:24px;display:flex;gap:10px;z-index:2}
#pmoPortalIntro button{font:600 13px Inter,Arial,sans-serif;border:1px solid rgba(10,34,64,.14);background:rgba(255,255,255,.88);color:#0a2240;border-radius:999px;padding:10px 18px;min-height:40px;cursor:pointer;backdrop-filter:blur(6px);box-shadow:0 6px 18px rgba(10,34,64,.12)}
#pmoPortalIntro button:hover{background:#fff}
#pmoPortalIntro button:focus-visible{outline:2px solid #0f5fa8;outline-offset:2px}
#pmoPortalIntro [data-sound]{display:none}
#pmoPortalIntro.is-playing [data-sound]{display:inline-block}
#pmoPortalIntro .pi-bar{position:absolute;left:0;bottom:0;height:3px;width:0;background:linear-gradient(90deg,#0f5fa8,#008a45);z-index:2}
@media (max-width:640px){#pmoPortalIntro .pi-ctl{right:12px;bottom:12px}#pmoPortalIntro button{padding:8px 14px;min-height:36px}}
@media (prefers-reduced-motion:reduce){#pmoPortalIntro .pi-load i{animation:none}}
</style>
<script>
(function(){
  try { if (sessionStorage.getItem('pmoIntro') !== '1') return; sessionStorage.removeItem('pmoIntro'); } catch (e) { return; }
  var START_LIMIT = 4000, STALL_LIMIT = 3000, HARD_LIMIT = 14000;
  function mount(){
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var el = document.createElement('section');
    el.id = 'pmoPortalIntro';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'PLAN BUILD GROW — membuka Portal Proyek');
    el.innerHTML = reduced
      ? '<img src="/media/pmo-intro-end.jpg" alt="PMO Infrastructure & Process Plant — PLAN BUILD GROW" style="width:100%;height:100%;object-fit:contain"><div class="pi-ctl"><button type="button" data-skip>Lewati →</button></div>'
      : '<video muted playsinline autoplay preload="auto" aria-hidden="true"></video>'
        + '<div class="pi-load" role="status"><i aria-hidden="true"></i><span>Memuat…</span></div>'
        + '<div class="pi-ctl"><button type="button" data-sound aria-pressed="false">🔈 Suara</button><button type="button" data-skip>Lewati →</button></div><div class="pi-bar"></div>';
    document.body.appendChild(el);
    var done = false, timers = [], stallT = 0;
    function close(){
      if (done) return; done = true;
      timers.forEach(clearTimeout); clearTimeout(stallT);
      document.removeEventListener('keydown', onKey, true);
      el.classList.add('is-leaving');
      var vv = el.querySelector('video'); if (vv) try { vv.pause(); vv.removeAttribute('src'); vv.load(); } catch (e) {}
      setTimeout(function(){ try { el.remove(); } catch (e) {} }, 360);
    }
    function onKey(e){ if (e.key === 'Escape') { e.preventDefault(); close(); } }
    document.addEventListener('keydown', onKey, true);
    el.querySelector('[data-skip]').addEventListener('click', function(e){ e.stopPropagation(); close(); });
    if (reduced) { timers.push(setTimeout(close, 1500)); return; }

    var v = el.querySelector('video'), bar = el.querySelector('.pi-bar'), snd = el.querySelector('[data-sound]'), started = false;
    v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
    snd.addEventListener('click', function(e){
      e.stopPropagation();
      v.muted = !v.muted;
      snd.setAttribute('aria-pressed', String(!v.muted));
      snd.textContent = v.muted ? '🔈 Suara' : '🔊 Suara aktif';
      if (v.paused) v.play().catch(function(){});
    });
    v.addEventListener('playing', function(){
      clearTimeout(stallT);
      if (!started) { started = true; el.classList.add('is-playing'); timers.push(setTimeout(close, Math.max(4000, ((v.duration || 10) + 2) * 1000))); }
    });
    // Tersendat di tengah jalan (jaringan lambat): lewati, jangan menahan pengguna.
    v.addEventListener('waiting', function(){ if (!started) return; clearTimeout(stallT); stallT = setTimeout(close, STALL_LIMIT); });
    v.addEventListener('timeupdate', function(){ if (v.duration) bar.style.width = (v.currentTime / v.duration * 100).toFixed(2) + '%'; });
    v.addEventListener('ended', close);
    v.addEventListener('error', function(){ timers.push(setTimeout(close, 200)); });
    v.src = '/media/pmo-intro.mp4';
    var tryPlay = function(){ var p = v.play(); if (p && p.catch) p.catch(function(err){ if (!started && err && err.name === 'NotAllowedError') timers.push(setTimeout(close, 300)); }); };
    if (v.readyState >= 3) tryPlay(); else { v.addEventListener('canplay', function once(){ v.removeEventListener('canplay', once); tryPlay(); }); tryPlay(); }
    // Video belum mulai dalam 4 detik → langsung ke Portal.
    timers.push(setTimeout(function(){ if (!started) close(); }, START_LIMIT));
    timers.push(setTimeout(close, HARD_LIMIT));
    el.querySelector('[data-skip]').focus();
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
</script>`;

module.exports = { PORTAL_INTRO_SNIPPET };

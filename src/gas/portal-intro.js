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
#pmoPortalIntro{position:fixed;inset:0;z-index:2147482500;background:#e9eff5;display:flex;align-items:center;justify-content:center;opacity:1;transition:opacity .35s ease;font-family:Inter,"Segoe UI",Arial,sans-serif}
#pmoPortalIntro.is-leaving{opacity:0;pointer-events:none}
#pmoPortalIntro video{width:100%;height:100%;object-fit:cover;background:#e9eff5;display:block}
#pmoPortalIntro .pi-ctl{position:absolute;right:24px;bottom:24px;display:flex;gap:10px;z-index:2}
#pmoPortalIntro button{font:600 13px Inter,Arial,sans-serif;border:1px solid rgba(10,34,64,.14);background:rgba(255,255,255,.88);color:#0a2240;border-radius:999px;padding:10px 18px;min-height:40px;cursor:pointer;backdrop-filter:blur(6px);box-shadow:0 6px 18px rgba(10,34,64,.12)}
#pmoPortalIntro button:hover{background:#fff}
#pmoPortalIntro button:focus-visible{outline:2px solid #0f5fa8;outline-offset:2px}
#pmoPortalIntro .pi-bar{position:absolute;left:0;bottom:0;height:3px;width:0;background:linear-gradient(90deg,#0f5fa8,#008a45)}
@media (max-width:640px){#pmoPortalIntro .pi-ctl{right:12px;bottom:12px}#pmoPortalIntro button{padding:8px 14px;min-height:36px}}
</style>
<script>
(function(){
  try { if (sessionStorage.getItem('pmoIntro') !== '1') return; sessionStorage.removeItem('pmoIntro'); } catch (e) { return; }
  function mount(){
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var el = document.createElement('section');
    el.id = 'pmoPortalIntro';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'PLAN BUILD GROW — membuka Portal Proyek');
    el.innerHTML = reduced
      ? '<img src="/media/pmo-intro-end.jpg" alt="PMO Infrastructure & Process Plant — PLAN BUILD GROW" style="width:100%;height:100%;object-fit:contain"><div class="pi-ctl"><button type="button" data-skip>Lewati →</button></div>'
      : '<video muted playsinline autoplay preload="auto" poster="/media/pmo-intro-poster.jpg" aria-hidden="true"><source src="/media/pmo-intro.mp4" type="video/mp4"></video>'
        + '<div class="pi-ctl"><button type="button" data-sound aria-pressed="false">🔈 Suara</button><button type="button" data-skip>Lewati →</button></div><div class="pi-bar"></div>';
    document.body.appendChild(el);
    var done = false, timers = [];
    function close(){
      if (done) return; done = true;
      timers.forEach(clearTimeout);
      document.removeEventListener('keydown', onKey, true);
      el.classList.add('is-leaving');
      var v = el.querySelector('video'); if (v) try { v.pause(); } catch (e) {}
      setTimeout(function(){ try { el.remove(); } catch (e) {} }, 360);
    }
    function onKey(e){ if (e.key === 'Escape') { e.preventDefault(); close(); } }
    document.addEventListener('keydown', onKey, true);
    el.querySelector('[data-skip]').addEventListener('click', function(e){ e.stopPropagation(); close(); });
    if (reduced) { timers.push(setTimeout(close, 1500)); return; }

    var v = el.querySelector('video'), bar = el.querySelector('.pi-bar'), snd = el.querySelector('[data-sound]');
    snd.addEventListener('click', function(e){
      e.stopPropagation();
      v.muted = !v.muted;
      snd.setAttribute('aria-pressed', String(!v.muted));
      snd.textContent = v.muted ? '🔈 Suara' : '🔊 Suara aktif';
      if (v.paused) v.play().catch(function(){});
    });
    v.addEventListener('timeupdate', function(){ if (v.duration) bar.style.width = (v.currentTime / v.duration * 100).toFixed(2) + '%'; });
    v.addEventListener('ended', close);
    v.addEventListener('error', function(){ timers.push(setTimeout(close, 400)); });
    var p = v.play(); if (p && p.catch) p.catch(function(){ timers.push(setTimeout(close, 1200)); });
    // Pengaman: jangan pernah menahan pengguna lebih dari 13 detik (mis. jaringan lambat).
    timers.push(setTimeout(close, 13000));
    el.querySelector('[data-skip]').focus();
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
</script>`;

module.exports = { PORTAL_INTRO_SNIPPET };

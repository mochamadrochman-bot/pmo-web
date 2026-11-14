'use strict';

/**
 * Animasi pembuka stop-motion Login -> Portal (5 detik, semua akun).
 * Diputar sekali setelah login berhasil (penanda sessionStorage.pmoIntro === '1'),
 * di atas halaman Portal sambil data dimuat di latar belakang.
 * Dapat dinonaktifkan Admin lewat /admin/data (gas_props 'SYS:INTRO').
 */
const LOGO_URL = 'https://drive.google.com/thumbnail?id=1JP0hqePxcaiFN0aZ2dv6WJ6qCNwrRLxf&sz=w800';

const PORTAL_INTRO_SNIPPET = `<style id="pmoPortalIntroStyle">
#pmoPortalIntro{--pi-bg:#f1f6fb;--pi-panel:#fff;--pi-ink:#12354f;--pi-muted:#58728b;--pi-line:#dce6ef;--pi-blue:#0f5fa8;--pi-navy:#073b63;--pi-green:#16875d;--pi-gold:#e2af36;position:fixed;inset:0;z-index:2147482500;overflow:auto;background:var(--pi-bg);color:var(--pi-ink);font-family:Inter,Arial,sans-serif;display:flex;flex-direction:column;min-height:100%;isolation:isolate;opacity:1;transition:opacity .28s ease}
#pmoPortalIntro.is-leaving{opacity:0;pointer-events:none}
:root[data-theme="dark"] #pmoPortalIntro{--pi-bg:#0d1b29;--pi-panel:#162737;--pi-ink:#e5eff8;--pi-muted:#9bb3ca;--pi-line:#2b4155;--pi-blue:#75bff2;--pi-green:#49cda0}
#pmoPortalIntro *{box-sizing:border-box}
#pmoPortalIntro header{display:flex;align-items:center;justify-content:space-between;padding:18px 5%;gap:20px;border-bottom:1px solid var(--pi-line);background:var(--pi-panel)}
#pmoPortalIntro .brand-mark{margin:0!important;padding:5px!important;background:#f3f7fa;border-radius:12px;width:max-content;max-width:100%}
#pmoPortalIntro .brand-mark img{max-height:64px;max-width:min(230px,52vw);width:auto;height:auto;object-fit:contain;display:block}
#pmoPortalIntro button{font:600 13px Inter,Arial,sans-serif;border:1px solid var(--pi-line);background:var(--pi-panel);color:var(--pi-ink);border-radius:10px;padding:12px 18px;min-height:44px;cursor:pointer;white-space:nowrap}
#pmoPortalIntro main{flex:1;display:flex;flex-direction:column;justify-content:center;padding:30px 20px 25px;text-align:center}
#pmoPortalIntro .pi-eyebrow{font-size:11px;letter-spacing:2.4px;font-weight:800;color:var(--pi-blue)}
#pmoPortalIntro .pi-art{position:relative;isolation:isolate;width:100%;max-width:700px;height:330px;margin:10px auto 0}
#pmoPortalIntro .pi-grid{position:absolute;inset:0;background-image:linear-gradient(var(--pi-line) 1px,transparent 1px),linear-gradient(90deg,var(--pi-line) 1px,transparent 1px);background-size:24px 24px;opacity:.45;mask-image:radial-gradient(ellipse,#000,transparent 70%)}
#pmoPortalIntro .pi-paper{position:absolute;left:calc(50% - 110px);top:35px;width:220px;height:210px;background:var(--pi-panel);padding:24px;border:1px solid var(--pi-line);border-radius:5px;box-shadow:9px 11px 0 var(--pi-line);transform:rotate(-5deg);transition:all .45s steps(6)}
#pmoPortalIntro .pi-paper b{font-size:11px;color:var(--pi-blue)}
#pmoPortalIntro .pi-paper>i{display:block;height:6px;background:var(--pi-line);margin-top:16px;width:90%}
#pmoPortalIntro .pi-paper>i:nth-of-type(2){width:60%}
#pmoPortalIntro .pi-bars{height:80px;display:flex;align-items:flex-end;gap:10px;margin-top:12px}
#pmoPortalIntro .pi-bars span{width:30px;height:35%;background:var(--pi-blue)}
#pmoPortalIntro .pi-bars span:nth-child(2){height:55%}
#pmoPortalIntro .pi-bars span:nth-child(3){height:75%;background:var(--pi-green)}
#pmoPortalIntro .pi-bars span:nth-child(4){height:85%}
#pmoPortalIntro .pi-bars span:nth-child(5){height:100%;background:var(--pi-green)}
#pmoPortalIntro .pi-paper strong{position:absolute;bottom:12px;right:16px;font-size:26px;color:var(--pi-green)}
#pmoPortalIntro .pi-site{position:absolute;width:390px;height:240px;left:calc(50% - 195px);top:30px;opacity:0;transform:translateY(25px);transition:all .5s steps(7)}
#pmoPortalIntro .pi-ground{position:absolute;bottom:20px;width:100%;height:8px;background:var(--pi-navy);border-radius:5px}
#pmoPortalIntro .pi-factory{position:absolute;left:15px;bottom:28px;width:145px;height:100px;background:var(--pi-blue);display:flex;align-items:center;justify-content:center;gap:9px;transform-origin:bottom;transition:transform .55s steps(7)}
#pmoPortalIntro .pi-factory:before{content:'';position:absolute;top:-25px;width:100%;height:30px;background:var(--pi-navy);clip-path:polygon(0 100%,0 70%,33% 0,33% 70%,66% 0,66% 70%,100% 0,100% 100%)}
#pmoPortalIntro .pi-factory i{width:25px;height:32px;background:#c8e5f5;border-top:6px solid var(--pi-gold)}
#pmoPortalIntro .pi-stack{position:absolute;left:120px;bottom:28px;width:18px;height:165px;border-top:7px solid var(--pi-blue);background:repeating-linear-gradient(0deg,#a9cadf 0 35px,#dcebf4 35px 48px)}
#pmoPortalIntro .pi-tank{position:absolute;bottom:28px;width:77px;height:110px;background:#a9cadf;border-radius:50% 50% 12px 12px / 15px 15px 9px 9px;box-shadow:inset -17px 0 #7da8c4;transform-origin:bottom;transition:transform .55s steps(7)}
#pmoPortalIntro .pi-tank:before{content:'';position:absolute;top:15px;width:100%;height:4px;background:var(--pi-blue)}
#pmoPortalIntro .one{left:180px}
#pmoPortalIntro .two{left:269px;height:90px}
#pmoPortalIntro .pi-pipe{position:absolute;bottom:58px;left:150px;width:155px;height:34px;border:8px solid var(--pi-gold);border-bottom:0;border-radius:12px 12px 0 0}
#pmoPortalIntro .pi-crane{position:absolute;left:40px;top:0;width:300px;height:180px;transition:all .55s steps(7)}
#pmoPortalIntro .pi-crane i{position:absolute;left:140px;top:25px;width:10px;height:150px;background:repeating-linear-gradient(45deg,var(--pi-gold) 0 8px,var(--pi-navy) 8px 10px)}
#pmoPortalIntro .pi-crane b{position:absolute;top:22px;left:50px;width:240px;height:8px;background:var(--pi-gold)}
#pmoPortalIntro .pi-crane span{position:absolute;left:250px;top:30px;width:2px;height:60px;background:var(--pi-navy)}
#pmoPortalIntro .pi-site label{position:absolute;font-size:9px;letter-spacing:.3px;font-weight:800;background:var(--pi-panel);padding:9px 11px;box-shadow:3px 3px var(--pi-line);color:var(--pi-blue)}
#pmoPortalIntro .pi-exp{left:-25px;top:40px;transform:rotate(-4deg)}
#pmoPortalIntro .pi-routine{right:-10px;bottom:0;transform:rotate(3deg);color:var(--pi-green)!important}
#pmoPortalIntro .pi-epcc{position:absolute;bottom:0;left:50%;display:flex;gap:12px;opacity:0;transform:translate(-50%,20px);transition:all .45s steps(6)}
#pmoPortalIntro .pi-epcc>span{width:72px;background:var(--pi-panel);padding:8px 2px;border-bottom:3px solid var(--pi-blue);font-size:23px;font-weight:900;color:var(--pi-blue)}
#pmoPortalIntro small{display:block;color:var(--pi-muted);font-size:9px;font-weight:500;margin-top:4px}
#pmoPortalIntro .pi-monitor{position:absolute;right:0;top:35px;width:205px;padding:18px;background:var(--pi-panel);box-shadow:5px 5px var(--pi-line);transform:translateY(20px) rotate(3deg);opacity:0;transition:all .45s steps(6)}
#pmoPortalIntro .pi-monitor b{font-size:10px;color:var(--pi-blue)}
#pmoPortalIntro .pi-monitor small{margin-top:12px}
#pmoPortalIntro .pi-seal{position:absolute;inset:30px 0;display:flex;flex-direction:column;justify-content:center;align-items:center;opacity:0;transform:scale(.85);transition:all .38s steps(5)}
#pmoPortalIntro .pi-seal-logo{padding:12px 20px;background:#f3f7fa;border-radius:16px;box-shadow:0 8px 24px rgba(7,59,99,.12)}
#pmoPortalIntro .pi-seal-logo img{max-height:92px;max-width:min(260px,68vw);width:auto;height:auto;object-fit:contain;display:block}
#pmoPortalIntro .pi-seal>strong{font-size:15px;letter-spacing:4px;color:var(--pi-green);margin-top:16px}
#pmoPortalIntro .pi-caption{min-height:100px;margin-top:12px}
#pmoPortalIntro .pi-caption>span{font-size:11px;letter-spacing:3px;color:var(--pi-blue);font-weight:800}
#pmoPortalIntro h2{font-size:28px;letter-spacing:-.7px;margin:12px 0 8px;color:var(--pi-ink);line-height:1.25}
#pmoPortalIntro p{font-size:13px;line-height:1.6;color:var(--pi-muted);margin:0}
#pmoPortalIntro .pi-steps{display:flex;justify-content:center;gap:7px;margin:15px 0}
#pmoPortalIntro .pi-steps i{width:37px;height:3px;background:var(--pi-line)}
#pmoPortalIntro .pi-steps i.on{background:var(--pi-blue)}
#pmoPortalIntro footer{padding:16px 5%;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;border-top:1px solid var(--pi-line);font-size:11px;color:var(--pi-muted)}
#pmoPortalIntro footer span{letter-spacing:1.2px;font-weight:600}
#pmoPortalIntro [data-phase="plan"] .pi-factory,#pmoPortalIntro [data-phase="plan"] .pi-tank{transform:scaleY(.1)}
#pmoPortalIntro [data-phase="build"] .pi-paper,#pmoPortalIntro [data-phase="control"] .pi-paper,#pmoPortalIntro [data-phase="ready"] .pi-paper{opacity:0;transform:translate(-150px,-40px) rotate(-18deg) scale(.6)}
#pmoPortalIntro [data-phase="build"] .pi-site,#pmoPortalIntro [data-phase="control"] .pi-site{opacity:1;transform:translateY(0)}
#pmoPortalIntro [data-phase="control"] .pi-site{transform:translateX(-90px) scale(.85)}
#pmoPortalIntro [data-phase="control"] .pi-crane{opacity:0;transform:translateY(-30px)}
#pmoPortalIntro [data-phase="control"] .pi-monitor{opacity:1;transform:translateY(0) rotate(2deg)}
#pmoPortalIntro [data-phase="build"] .pi-epcc,#pmoPortalIntro [data-phase="control"] .pi-epcc{opacity:1;transform:translate(-50%,0)}
#pmoPortalIntro [data-phase="ready"] .pi-seal{opacity:1;transform:scale(1)}
@media(max-width:600px){#pmoPortalIntro header{padding:12px 16px}#pmoPortalIntro main{padding:18px 12px}#pmoPortalIntro .pi-art{height:300px}#pmoPortalIntro .pi-site{transform:scale(.72)!important}#pmoPortalIntro [data-phase="control"] .pi-site{transform:translateY(-30px) scale(.6)!important;opacity:.25}#pmoPortalIntro .pi-monitor{right:calc(50% - 102px);top:40px}#pmoPortalIntro .pi-epcc{gap:6px}#pmoPortalIntro .pi-epcc>span{width:62px}#pmoPortalIntro h2{font-size:23px}#pmoPortalIntro .pi-caption{min-height:110px}#pmoPortalIntro .pi-eyebrow{font-size:9px}#pmoPortalIntro footer{font-size:9px;padding:13px 16px}#pmoPortalIntro .pi-seal>strong{font-size:13px;letter-spacing:3px}}
@media(prefers-reduced-motion:reduce){#pmoPortalIntro *{transition:none!important}}
</style>
<script>
(function(){
  try {
    if (sessionStorage.getItem('pmoIntro') !== '1') return;
    sessionStorage.removeItem('pmoIntro');
  } catch (e) { return; }

  function mount(){
    if (!document.body || document.getElementById('pmoPortalIntro')) return;
    var el = document.createElement('section');
    el.id = 'pmoPortalIntro';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'PLAN BUILD GROW — membuka Portal Proyek');
    el.innerHTML =
      '<header><div class="pi-brand"><div class="brand-mark"><img src="${LOGO_URL}" alt="Logo PT Petrokimia Gresik"></div></div><button type="button" class="pi-skip">Lewati →</button></header>' +
      '<main><span class="pi-eyebrow">PROJECT MANAGEMENT OFFICE</span>' +
      '<div class="pi-art" data-phase="plan">' +
        '<div class="pi-grid"></div>' +
        '<div class="pi-paper"><b>RENCANA INVESTASI</b><i></i><i></i><div class="pi-bars"><span></span><span></span><span></span></div><strong>✓</strong></div>' +
        '<div class="pi-site"><div class="pi-ground"></div><div class="pi-factory"><i></i><i></i><i></i></div><div class="pi-stack"></div><div class="pi-tank one"></div><div class="pi-tank two"></div><div class="pi-pipe"></div><div class="pi-crane"><i></i><b></b><span></span></div><label class="pi-exp">INVESTASI PENGEMBANGAN</label><label class="pi-routine">INVESTASI RUTIN</label></div>' +
        '<div class="pi-epcc"><span>E<small>Engineering</small></span><span>P<small>Procurement</small></span><span>C<small>Construction</small></span><span>C<small>Commissioning</small></span></div>' +
        '<div class="pi-monitor"><b>PROGRES TERPANTAU ✓</b><div class="pi-bars"><span></span><span></span><span></span><span></span><span></span></div><small>Jadwal · Biaya · Mutu &amp; K3</small></div>' +
        '<div class="pi-seal"><div class="pi-seal-logo"><img src="${LOGO_URL}" alt="Logo PMO PT Petrokimia Gresik"></div><strong>PLAN · BUILD · GROW</strong></div>' +
      '</div>' +
      '<div class="pi-caption" aria-live="polite"><span>PLAN</span><h2>Berawal dari rencana yang terarah.</h2><p>Menyiapkan investasi untuk pertumbuhan dan keandalan.</p></div>' +
      '<div class="pi-steps"><i></i><i></i><i></i><i></i></div></main>' +
      '<footer>Infrastruktur &amp; Process Plant<span>PT Petrokimia Gresik</span></footer>';

    document.body.appendChild(el);
    var art = el.querySelector('.pi-art'), cap = el.querySelector('.pi-caption'), skip = el.querySelector('.pi-skip');
    var timers = [], closed = false;

    function phase(name, label, title, desc, index){
      art.dataset.phase = name;
      cap.querySelector('span').textContent = label;
      cap.querySelector('h2').textContent = title;
      cap.querySelector('p').textContent = desc;
      el.querySelectorAll('.pi-steps i').forEach(function(v, i){ v.classList.toggle('on', i <= index); });
    }
    function close(){
      if (closed) return;
      closed = true;
      timers.forEach(clearTimeout);
      el.classList.add('is-leaving');
      setTimeout(function(){ try { el.remove(); } catch (e) {} }, 280);
    }

    skip.addEventListener('click', function(e){ e.stopPropagation(); close(); });
    el.addEventListener('click', close);
    el.addEventListener('keydown', function(e){
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    skip.focus();

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      phase('ready', 'PORTAL PROYEK', 'Satu portofolio. Satu arah.', 'Tumbuh bersama investasi yang terkelola.', 3);
      timers.push(setTimeout(close, 900));
    } else {
      phase('plan', 'PLAN', 'Berawal dari rencana yang terarah.', 'Menyiapkan investasi untuk pertumbuhan dan keandalan.', 0);
      timers.push(setTimeout(function(){ phase('build', 'BUILD', 'Merakit masa depan, bersama.', 'Investasi pengembangan dan investasi rutin, terkoordinasi.', 1); }, 1250));
      timers.push(setTimeout(function(){ phase('control', 'GROW', 'Setiap langkah, dalam kendali.', 'Engineering · Procurement · Construction · Commissioning', 2); }, 2550));
      timers.push(setTimeout(function(){ phase('ready', 'PORTAL PROYEK', 'Satu portofolio. Satu arah.', 'Tumbuh bersama investasi yang terkelola.', 3); }, 3850));
      timers.push(setTimeout(close, 5000));
    }
  }

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
</script>`;

module.exports = { PORTAL_INTRO_SNIPPET };

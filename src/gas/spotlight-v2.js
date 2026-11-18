'use strict';

/**
 * PMO Spotlight Lobby · transisi & hierarki hero ala halaman utama Adobe.
 *
 * Mempertahankan seluruh pipeline data & aset lama di legacy/Spotlight.html:
 *   - Video pembuka Sena (#spotlightIntro), boot loader (#spotBoot), transisi (#spotTrans)
 *   - Musik instrumental Web Audio (#btnMusic / toggleMusic)
 *   - Data real-time: getExecutiveDashboardData, getGalleryIndex, getWeeklyProjectData,
 *     getSpotlightIdentity, getSpotlightIntro, auto-refresh 5 menit
 *   - Kontrol Kiosk: Putar Tampilan (toggleOrientation), ‹ Portal (#btnBackPortal)
 *
 * Ditambahkan:
 *   - Latar penuh galeri foto proyek (crossfade + Ken Burns halus, caption di sisi kanan)
 *   - Tulisan utama langsung di atas scrim galeri: Progress Aktual, Plan, Deviasi + comparison bar,
 *     Target Milestone Terdekat, Nama & Logo Kontraktor, Nilai Kontrak, Termin Terbayar,
 *     serta Efektif Date Start – Finish (+ durasi)
 *   - Dock card proyek di bawah: card aktif putih solid dengan bar loading countdown real-time,
 *     card non-aktif gelap transparan, kontrol Play/Pause & navigasi manual/keyboard
 */

const CSS = String.raw`<style id="spotV2Css">
body.sv2{background:#07101c!important;color:#fff;font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;overflow:hidden}
body.sv2 #screen.sv2-screen{position:relative;width:100vw;height:100dvh;min-height:100dvh;padding:0!important;margin:0 auto;display:flex;flex-direction:column;justify-content:space-between;background:#07101c!important;overflow:hidden;gap:0}
body.sv2.sv2-portrait{background:#020617!important;overflow:auto}
body.sv2.sv2-portrait #screen.sv2-screen{max-width:480px;height:auto;min-height:100dvh;box-shadow:0 0 60px rgba(0,0,0,.85);overflow-y:auto;overflow-x:hidden}

/* ---------- latar galeri penuh + scrim ---------- */
body.sv2 .sv2-bg{position:absolute;inset:0;z-index:0;background:#0a1423;overflow:hidden}
body.sv2 .sv2-bg-slide{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transform:scale(1.06);transition:opacity 1.15s cubic-bezier(.22,1,.36,1),transform 8s linear;will-change:opacity,transform}
body.sv2 .sv2-bg-slide.on{opacity:1;transform:scale(1)}
body.sv2 .sv2-scrim{position:absolute;inset:0;z-index:1;pointer-events:none;background:
  linear-gradient(95deg,rgba(8,18,30,.95) 0%,rgba(8,18,30,.85) 38%,rgba(8,18,30,.36) 70%,rgba(8,18,30,.22) 100%),
  linear-gradient(180deg,rgba(8,18,30,.72) 0%,rgba(8,18,30,.08) 25%,rgba(8,18,30,.14) 56%,rgba(8,18,30,.96) 91%)}

/* ---------- header atas ---------- */
body.sv2 .sv2-top{position:relative;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px 40px 8px}
body.sv2 .sv2-brand{display:flex;align-items:center;gap:12px;min-width:0}
body.sv2 .sv2-logos{display:inline-flex;align-items:center;gap:10px;background:#fff;padding:6px 12px;border-radius:10px;flex:none}
body.sv2 .sv2-logos img{height:30px;width:auto;max-width:96px;object-fit:contain;display:block}
body.sv2 .sv2-btxt b{display:block;font-size:14px;letter-spacing:.02em;color:#fff}
body.sv2 .sv2-btxt span{display:block;font-size:11.5px;color:#cbd5e1}
body.sv2 .sv2-top-r{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
body.sv2 .sv2-btn{border:1px solid rgba(255,255,255,.28);background:rgba(11,20,34,.74);color:#fff;min-height:36px;padding:0 13px;border-radius:99px;font:600 12px/1 inherit;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;transition:background .18s ease,border-color .18s ease}
body.sv2 .sv2-btn:hover{background:rgba(255,255,255,.16);border-color:#fff}
body.sv2 .sv2-btn:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}
body.sv2 .sv2-clock{text-align:right;padding-left:10px;margin-left:4px;border-left:1px solid rgba(255,255,255,.22)}
body.sv2 .sv2-clock b{display:block;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:18px;font-weight:700;letter-spacing:.04em;color:#fff}
body.sv2 .sv2-clock span{display:block;font-size:11px;color:#cbd5e1}

/* ---------- tulisan utama di depan galeri ---------- */
body.sv2 .sv2-hero{position:relative;z-index:3;display:grid;grid-template-columns:minmax(0,860px) minmax(0,1fr);align-items:end;gap:24px;padding:12px 40px 14px;flex:1 1 auto;min-height:0}
body.sv2 .sv2-copy{transition:opacity .26s ease,transform .26s ease;min-width:0}
body.sv2 .sv2-copy.switching{opacity:.2;transform:translateY(8px)}
body.sv2 .sv2-eyebrow{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:8px}
body.sv2 .sv2-pill{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:5px 12px;border-radius:99px;background:rgba(16,185,129,.2);border:1px solid rgba(52,211,153,.6);color:#6ee7b7}
body.sv2 .sv2-pill i{width:7px;height:7px;border-radius:50%;background:currentColor;display:block}
body.sv2 .sv2-pill.at-risk{background:rgba(245,158,11,.2);border-color:rgba(251,191,36,.6);color:#fde68a}
body.sv2 .sv2-pill.delayed{background:rgba(244,63,94,.22);border-color:rgba(251,113,133,.65);color:#fecdd3}
body.sv2 .sv2-period{font-size:13px;font-weight:600;color:#cbd5e1}

body.sv2 .sv2-title{margin:0 0 14px;font-size:clamp(24px,3.1vw,42px);font-weight:800;line-height:1.08;letter-spacing:-.02em;color:#fff;max-width:820px;word-break:break-word}

body.sv2 .sv2-kpis{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px 34px;margin-bottom:10px}
body.sv2 .sv2-m small{display:block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:2px}
body.sv2 .sv2-m b{display:block;font-size:clamp(26px,2.8vw,38px);font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
body.sv2 .sv2-m.act b{color:#38bdf8}
body.sv2 .sv2-m.pln b{color:#fff}
body.sv2 .sv2-m.dev b.ok{color:#34d399}
body.sv2 .sv2-m.dev b.warn{color:#fbbf24}
body.sv2 .sv2-m.dev b.bad{color:#fb7185}

body.sv2 .sv2-bar-wrap{max-width:560px;margin-bottom:14px}
body.sv2 .sv2-bar-track{position:relative;height:7px;border-radius:99px;background:rgba(255,255,255,.18)}
body.sv2 .sv2-bar-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#0f5fa8 0%,#38bdf8 60%,#34d399 100%);transition:width .55s cubic-bezier(.22,1,.36,1)}
body.sv2 .sv2-bar-plan{position:absolute;top:-4px;bottom:-4px;width:2.5px;border-radius:2px;background:#fff;box-shadow:0 0 6px rgba(0,0,0,.75);transition:left .55s cubic-bezier(.22,1,.36,1)}
body.sv2 .sv2-bar-leg{display:flex;justify-content:space-between;font-size:11.5px;color:#cbd5e1;margin-top:5px}

body.sv2 .sv2-ms{border-left:3px solid #38bdf8;padding:3px 0 3px 14px;margin-bottom:16px;max-width:740px}
body.sv2 .sv2-ms small{display:block;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#38bdf8;margin-bottom:2px}
body.sv2 .sv2-ms p{margin:0;font-size:15px;font-weight:600;line-height:1.4;color:#fff}
body.sv2 .sv2-ms span{display:block;margin-top:2px;font-size:12px;color:#cbd5e1}

body.sv2 .sv2-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px 20px;padding:12px 0 2px;border-top:1px solid rgba(255,255,255,.22);max-width:840px}
body.sv2 .sv2-fact small{display:block;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:4px}
body.sv2 .sv2-fact b{display:block;font-size:13.5px;font-weight:700;line-height:1.35;color:#fff}
body.sv2 .sv2-fact span{display:block;font-size:11.5px;color:#cbd5e1;margin-top:2px}
body.sv2 .sv2-ctr{display:flex;align-items:center;gap:8px}
body.sv2 .sv2-ctr-logo{height:28px;max-width:56px;object-fit:contain;background:#fff;padding:2px 4px;border-radius:6px;flex:none}
body.sv2 .sv2-ctr-chip{width:28px;height:28px;border-radius:6px;background:#fff;color:#0f172a;font-size:10.5px;font-weight:800;display:grid;place-items:center;flex:none}

/* ---------- badge galeri kanan ---------- */
body.sv2 .sv2-pmeta{justify-self:end;text-align:right;max-width:300px;background:rgba(8,18,30,.76);border:1px solid rgba(255,255,255,.22);border-radius:12px;padding:10px 14px;cursor:pointer;color:#fff;font:inherit;transition:border-color .18s ease,background .18s ease}
body.sv2 .sv2-pmeta:hover{background:rgba(15,28,46,.9);border-color:rgba(255,255,255,.48)}
body.sv2 .sv2-pmeta:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}
body.sv2 .sv2-pmeta small{display:block;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#38bdf8;margin-bottom:3px}
body.sv2 .sv2-pmeta span{display:block;font-size:12.5px;line-height:1.4;color:#fff}

/* ---------- dock card proyek bawah ala Adobe ---------- */
body.sv2 .sv2-dock{position:relative;z-index:4;padding:8px 40px 22px;flex:none}
body.sv2 .sv2-ctrl{display:flex;align-items:center;gap:8px;margin-bottom:10px}
body.sv2 .sv2-cbtn{width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:rgba(11,20,34,.82);color:#fff;font-size:14px;display:grid;place-items:center;cursor:pointer;flex:none;transition:background .18s ease,color .18s ease,border-color .18s ease}
body.sv2 .sv2-cbtn:hover{background:#fff;color:#0f172a;border-color:#fff}
body.sv2 .sv2-cbtn:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}
body.sv2 .sv2-tick{font-size:12px;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-left:4px;min-width:0}

body.sv2 .sv2-rail{display:grid;grid-template-columns:repeat(var(--sv2-cols,5),minmax(0,1fr));gap:10px}
body.sv2 .sv2-card{position:relative;display:flex;flex-direction:column;justify-content:space-between;text-align:left;min-height:92px;padding:14px 14px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(11,20,34,.82);color:#fff;cursor:pointer;overflow:hidden;font:inherit;transition:transform .24s cubic-bezier(.22,1,.36,1),background .24s ease,border-color .24s ease,color .24s ease,box-shadow .24s ease}
body.sv2 .sv2-card:hover{background:rgba(24,37,58,.92);border-color:rgba(255,255,255,.46)}
body.sv2 .sv2-card:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}
body.sv2 .sv2-ltrack{position:absolute;left:0;right:0;top:0;height:4px;background:rgba(255,255,255,.14)}
body.sv2 .sv2-lfill{height:100%;width:0%;background:linear-gradient(90deg,#0f5fa8 0%,#0f8a5f 100%)}

body.sv2 .sv2-card.active{background:#fff;color:#0f172a;border-color:#fff;transform:translateY(-4px);box-shadow:0 14px 32px rgba(0,0,0,.48)}
body.sv2 .sv2-card.active .sv2-ltrack{background:#e2e8f0}

body.sv2 .sv2-ctop{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;font-size:10.5px;font-weight:700}
body.sv2 .sv2-cbadge{display:inline-flex;align-items:center;gap:5px;color:#cbd5e1}
body.sv2 .sv2-card.active .sv2-cbadge{color:#475569}
body.sv2 .sv2-cdot{width:7px;height:7px;border-radius:50%;background:#34d399;flex:none}
body.sv2 .sv2-cdot.warn{background:#fbbf24}
body.sv2 .sv2-cdot.bad{background:#fb7185}
body.sv2 .sv2-cpct{font-variant-numeric:tabular-nums;color:#38bdf8}
body.sv2 .sv2-card.active .sv2-cpct{color:#0f5fa8}

body.sv2 .sv2-cfoot{display:flex;align-items:flex-end;justify-content:space-between;gap:6px}
body.sv2 .sv2-cname{font-size:13px;font-weight:700;line-height:1.28;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
body.sv2 .sv2-cchev{font-size:16px;line-height:1;opacity:.75;flex:none}
body.sv2 .sv2-card.active .sv2-cchev{opacity:1;color:#0f5fa8}

/* Banyak proyek (>7) atau layar sempit: rail menjadi horizontal scroll-snap */
body.sv2 .sv2-rail.scroll{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding-top:6px;padding-bottom:4px;scrollbar-width:thin}
body.sv2 .sv2-rail.scroll .sv2-card{flex:0 0 215px;scroll-snap-align:center}

@media (max-width:1120px){
  body.sv2{overflow:auto}
  body.sv2 #screen.sv2-screen{height:auto;min-height:100dvh;overflow-y:auto;overflow-x:hidden}
  body.sv2 .sv2-top,body.sv2 .sv2-hero,body.sv2 .sv2-dock{padding-left:22px;padding-right:22px}
  body.sv2 .sv2-hero{grid-template-columns:1fr;gap:14px}
  body.sv2 .sv2-pmeta{justify-self:start;text-align:left;max-width:none}
  body.sv2 .sv2-facts{grid-template-columns:repeat(2,minmax(0,1fr))}
  body.sv2 .sv2-rail{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding-top:6px;padding-bottom:4px}
  body.sv2 .sv2-card{flex:0 0 215px;scroll-snap-align:center}
}

body.sv2.sv2-portrait .sv2-top,body.sv2.sv2-portrait .sv2-hero,body.sv2.sv2-portrait .sv2-dock{padding-left:18px;padding-right:18px}
body.sv2.sv2-portrait .sv2-btxt,body.sv2.sv2-portrait .sv2-clock{display:none}
body.sv2.sv2-portrait .sv2-hero{grid-template-columns:1fr;gap:14px;padding-top:8px}
body.sv2.sv2-portrait .sv2-pmeta{justify-self:start;text-align:left;max-width:none}
body.sv2.sv2-portrait .sv2-facts{grid-template-columns:repeat(2,minmax(0,1fr))}
body.sv2.sv2-portrait .sv2-rail{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding-top:6px;padding-bottom:4px}
body.sv2.sv2-portrait .sv2-card{flex:0 0 215px;scroll-snap-align:center}

@media (max-width:600px){
  body.sv2 .sv2-top{padding:14px 16px 6px}
  body.sv2 .sv2-btxt,body.sv2 .sv2-clock{display:none}
  body.sv2 .sv2-hero{padding:8px 16px 14px}
  body.sv2 .sv2-dock{padding:6px 16px 18px}
  body.sv2 .sv2-facts{gap:10px 14px}
}
@media (prefers-reduced-motion:reduce){
  body.sv2 .sv2-bg-slide,body.sv2 .sv2-copy,body.sv2 .sv2-card,body.sv2 .sv2-bar-fill,body.sv2 .sv2-bar-plan{transition:none!important}
}
</style>`;

const JS = String.raw`<script>
(function(){
  var D=document,B=D.body,SC=D.getElementById('screen');
  if(!SC)return;
  B.classList.add('sv2');
  SC.className='screen sv2-screen';

  var E=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  var oldBack=D.getElementById('btnBackPortal');
  var backHref=oldBack?oldBack.getAttribute('href'):((typeof appUrl!=='undefined'&&appUrl)?appUrl+'?page=portal':'?page=portal');
  var inIframe=false;try{inIframe=window.self!==window.top;}catch(e){inIframe=true;}

  SC.innerHTML=
    '<div class="sv2-bg" id="sv2Bg" aria-hidden="true"></div>'+
    '<div class="sv2-scrim" aria-hidden="true"></div>'+
    '<header class="sv2-top">'+
      '<div class="sv2-brand">'+
        '<div class="sv2-logos">'+
          '<img src="/media/brand/petro.png" alt="PT Petrokimia Gresik" decoding="async" onerror="this.onerror=null;this.src=\'https://drive.google.com/thumbnail?id=1LZynEU1SZ27JmRMPdv2D5CTxcd4cKp84&sz=w240\'">'+
          '<img src="/media/brand/logo.png" alt="PMO Infrastruktur &amp; Process Plant" decoding="async" onerror="this.onerror=null;this.src=\'https://drive.google.com/thumbnail?id=1JP0hqePxcaiFN0aZ2dv6WJ6qCNwrRLxf&sz=w240\'">'+
        '</div>'+
        '<div class="sv2-btxt"><b>PMO Spotlight Lobby</b><span>Monitoring Proyek Strategis EPCC</span></div>'+
      '</div>'+
      '<div class="sv2-top-r">'+
        '<button type="button" class="sv2-btn" id="btnMusic" onclick="toggleMusic()" title="Iringan musik instrumental">♪ Musik: Aktif</button>'+
        '<button type="button" class="sv2-btn" onclick="toggleOrientation()" title="Ganti orientasi tampilan">🔄 Putar Tampilan</button>'+
        (!inIframe?'<a href="'+E(backHref)+'" target="_top" class="sv2-btn" id="btnBackPortal" title="Kembali ke Portal Proyek">‹ Portal</a>':'')+
        '<div class="sv2-clock"><b id="liveClock">--:--:--</b><span id="liveDate">Memuat waktu...</span></div>'+
      '</div>'+
    '</header>'+
    '<main class="sv2-hero">'+
      '<section class="sv2-copy" id="sv2Copy" aria-live="polite">'+
        '<div class="sv2-eyebrow">'+
          '<span class="sv2-pill" id="sv2Pill"><i></i><span id="sv2BadgeTxt">ON TRACK</span></span>'+
          '<span class="sv2-period" id="sv2Period">Memuat data proyek…</span>'+
        '</div>'+
        '<h1 class="sv2-title" id="projName">Memuat Proyek…</h1>'+
        '<div class="sv2-kpis">'+
          '<div class="sv2-m act"><small>Progress Aktual</small><b id="sv2Act">—</b></div>'+
          '<div class="sv2-m pln"><small>Progress Plan</small><b id="sv2Plan">—</b></div>'+
          '<div class="sv2-m dev"><small>Deviasi</small><b id="sv2Dev" class="ok">—</b></div>'+
        '</div>'+
        '<div class="sv2-bar-wrap" aria-hidden="true">'+
          '<div class="sv2-bar-track"><div class="sv2-bar-fill" id="sv2Fill" style="width:0%"></div><div class="sv2-bar-plan" id="sv2PlanMark" style="left:0%"></div></div>'+
          '<div class="sv2-bar-leg"><span id="sv2BarSub">Aktual kumulatif terhadap 100%</span><span>Garis putih = Target Plan</span></div>'+
        '</div>'+
        '<div class="sv2-ms">'+
          '<small>Target Milestone Terdekat</small>'+
          '<p id="sv2MsText">—</p>'+
          '<span id="sv2MsSub">—</span>'+
        '</div>'+
        '<div class="sv2-facts">'+
          '<div class="sv2-fact"><small>Nama Kontraktor</small><div class="sv2-ctr"><img class="sv2-ctr-logo" id="sv2CtrLogo" alt="Logo kontraktor" hidden><span class="sv2-ctr-chip" id="sv2CtrChip">—</span><b id="sv2Contractor">—</b></div></div>'+
          '<div class="sv2-fact"><small>Nilai Kontrak</small><b id="sv2Contract">—</b><span id="sv2ContractNote">Nilai kontrak aktif</span></div>'+
          '<div class="sv2-fact"><small>Termin Terbayar</small><b id="sv2Paid">—</b><span id="sv2PaidPct">—</span></div>'+
          '<div class="sv2-fact"><small>Efektif Date Start – Finish</small><b id="sv2Dates">—</b><span id="sv2Duration">—</span></div>'+
        '</div>'+
      '</section>'+
      '<button type="button" class="sv2-pmeta" id="sv2PhotoBtn" title="Klik untuk ganti foto galeri proyek ini">'+
        '<small id="sv2PhotoBadge">GALERI LAPANGAN</small>'+
        '<span id="sv2PhotoCap">Menyiapkan dokumentasi lapangan…</span>'+
      '</button>'+
    '</main>'+
    '<section class="sv2-dock" aria-label="Daftar proyek spotlight">'+
      '<div class="sv2-ctrl">'+
        '<button type="button" class="sv2-cbtn" id="sv2Play" aria-label="Jeda transisi otomatis" title="Putar / Jeda (Spasi)">⏸</button>'+
        '<button type="button" class="sv2-cbtn" id="sv2Prev" aria-label="Proyek sebelumnya" title="Proyek sebelumnya (Panah Kiri)">‹</button>'+
        '<button type="button" class="sv2-cbtn" id="sv2Next" aria-label="Proyek berikutnya" title="Proyek berikutnya (Panah Kanan)">›</button>'+
        '<div class="sv2-tick" id="tickerText">Memuat data proyek…</div>'+
      '</div>'+
      '<div class="sv2-rail" id="sv2Rail" role="tablist" aria-label="Pilih proyek"></div>'+
    '</section>';

  try{if(typeof musicBtn==='function')musicBtn();}catch(e){}
  try{if(typeof updateClock==='function')updateClock();}catch(e){}

  var SLIDE_MS=21000;
  var playing=true,elapsedMs=0,lastTick=performance.now(),rafId=null,lastRenderIdx=-1,lastBgUrl='',lastRailCount=-1;
  var BRAND_BG=['/media/brand/login-bg.jpg?v=2','/media/brand/bg-1.jpg','/media/brand/bg-2.jpg'];

  function parseIdr(str){
    if(str==null)return null;
    if(typeof str==='number'&&isFinite(str))return str;
    var digits=String(str).replace(/[^\d]/g,'');
    return digits?Number(digits):null;
  }
  function fmtIdr(val){
    if(val==null||!isFinite(Number(val)))return '—';
    return Math.round(Number(val)).toLocaleString('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
  }
  function driveImg(url){
    if(!url)return '';
    var m=String(url).match(/\/d\/([\w-]{15,})/)||String(url).match(/[?&]id=([\w-]{15,})/);
    if(m)return 'https://drive.google.com/thumbnail?id='+encodeURIComponent(m[1])+'&sz=w1600';
    return /^https?:\/\//i.test(String(url))?String(url):'';
  }
  function initials(name){
    var w=String(name||'').replace(/\b(PT|CV|KSO|TBK|PERSERO)\b\.?/gi,' ').trim().split(/\s+/).filter(Boolean);
    if(!w.length)return '—';
    return w.slice(0,2).map(function(s){return s[0].toUpperCase()}).join('');
  }
  function toneOf(p){
    var cls=p&&p.badgeClass||'on-track';
    return cls==='delayed'?'bad':cls==='at-risk'?'warn':'ok';
  }
  function photosOf(p,idx){
    var list=(p&&p.photos||[]).map(function(ph){
      return {src:'https://drive.google.com/thumbnail?id='+encodeURIComponent(ph.id)+'&sz=w1600',cap:ph.cap||p.photoMonth||'Dokumentasi progres lapangan'};
    });
    if(!list.length){
      var bu=driveImg(p&&p.profile&&p.profile.bannerUrl);
      if(bu)list.push({src:bu,cap:'Foto profil proyek '+(p.name||'')});
    }
    if(!list.length){
      list.push({src:BRAND_BG[idx%BRAND_BG.length],cap:'Kawasan Industri PT Petrokimia Gresik'});
    }
    return list;
  }

  function applyBg(src,cap,label){
    var bg=D.getElementById('sv2Bg'),cb=D.getElementById('sv2PhotoBadge'),cp=D.getElementById('sv2PhotoCap');
    if(cb)cb.textContent=label||'GALERI LAPANGAN';
    if(cp)cp.textContent=cap||'Dokumentasi progres lapangan';
    if(!bg||!src||src===lastBgUrl)return;
    lastBgUrl=src;
    var dv=D.createElement('div');
    dv.className='sv2-bg-slide';
    var img=new Image();
    img.onload=function(){
      if(src!==lastBgUrl)return;
      dv.style.backgroundImage='url("'+src+'")';
      bg.appendChild(dv);
      requestAnimationFrame(function(){requestAnimationFrame(function(){
        dv.classList.add('on');
        while(bg.children.length>2)bg.removeChild(bg.firstChild);
      })});
    };
    img.onerror=function(){
      var fb=BRAND_BG[(currentIndex||0)%BRAND_BG.length];
      if(src===fb)return;
      dv.style.backgroundImage='url("'+fb+'")';
      bg.appendChild(dv);
      requestAnimationFrame(function(){requestAnimationFrame(function(){
        dv.classList.add('on');
        while(bg.children.length>2)bg.removeChild(bg.firstChild);
      })});
    };
    img.src=src;
  }

  window.paintPhotos=function(){
    if(!projectList||!projectList.length)return;
    var p=projectList[currentIndex]||projectList[0];
    var list=photosOf(p,currentIndex);
    var pIdx=(typeof photoRound==='number'?photoRound:0)%list.length;
    var cur=list[pIdx];
    var lbl=p.photos&&p.photos.length?'GALERI LAPANGAN · FOTO '+(pIdx+1)+'/'+list.length:'DOKUMENTASI PROYEK';
    applyBg(cur.src,cur.cap,lbl);
  };

  function buildRail(){
    var rail=D.getElementById('sv2Rail');if(!rail)return;
    rail.innerHTML='';
    var n=projectList.length||1;
    rail.style.setProperty('--sv2-cols',String(Math.min(Math.max(n,1),7)));
    rail.classList.toggle('scroll',n>7);
    projectList.forEach(function(p,i){
      var b=D.createElement('button');
      b.type='button';
      b.className='sv2-card'+(i===currentIndex?' active':'');
      b.setAttribute('role','tab');
      b.setAttribute('aria-selected',String(i===currentIndex));
      var tn=toneOf(p);
      var dotCls='sv2-cdot'+(tn==='warn'?' warn':tn==='bad'?' bad':'');
      b.innerHTML=
        '<div class="sv2-ltrack"><div class="sv2-lfill" id="sv2Load-'+i+'"></div></div>'+
        '<div class="sv2-ctop">'+
          '<span class="sv2-cbadge"><span class="'+dotCls+'"></span>'+E(p.badge||'ON TRACK')+'</span>'+
          '<span class="sv2-cpct" id="sv2CardPct-'+i+'">'+E(p.actual||'—')+'</span>'+
        '</div>'+
        '<div class="sv2-cfoot">'+
          '<span class="sv2-cname">'+E(p.name||'Proyek')+'</span>'+
          '<span class="sv2-cchev" aria-hidden="true">›</span>'+
        '</div>';
      b.onclick=function(){goToSlide(i,true);};
      rail.appendChild(b);
    });
    lastRailCount=projectList.length;
  }

  function syncRailCards(scrollToActive){
    if(lastRailCount!==projectList.length){buildRail();return;}
    projectList.forEach(function(p,i){
      var card=D.getElementById('sv2Rail').children[i];if(!card)return;
      var on=i===currentIndex;
      card.classList.toggle('active',on);
      card.setAttribute('aria-selected',String(on));
      var pctEl=D.getElementById('sv2CardPct-'+i);
      if(pctEl)pctEl.textContent=p.actual||'—';
      var badge=card.querySelector('.sv2-cbadge');
      if(badge){
        var tn=toneOf(p),dc='sv2-cdot'+(tn==='warn'?' warn':tn==='bad'?' bad':'');
        badge.innerHTML='<span class="'+dc+'"></span>'+E(p.badge||'ON TRACK');
      }
      var fill=D.getElementById('sv2Load-'+i);
      if(!on&&fill)fill.style.width='0%';
      if(on&&scrollToActive)try{card.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});}catch(e){}
    });
  }

  window.renderProject=function(idx){
    if(!projectList||!projectList.length)return;
    if(idx<0||idx>=projectList.length)idx=0;
    var p=projectList[idx],changed=(idx!==lastRenderIdx);
    lastRenderIdx=idx;
    var fillHero=function(){
      var pill=D.getElementById('sv2Pill'),btxt=D.getElementById('sv2BadgeTxt');
      if(pill)pill.className='sv2-pill'+(p.badgeClass==='delayed'?' delayed':p.badgeClass==='at-risk'?' at-risk':'');
      if(btxt)btxt.textContent=p.badge||'ON TRACK';
      D.getElementById('sv2Period').textContent=p.category||'Portal Proyek';
      D.getElementById('projName').textContent=p.name||'Proyek Strategis';

      D.getElementById('sv2Act').textContent=p.actual||'—';
      D.getElementById('sv2Plan').textContent=p.plan||'—';
      var devEl=D.getElementById('sv2Dev'),tn=toneOf(p);
      devEl.textContent=p.dev||'—';
      devEl.className=tn==='bad'?'bad':tn==='warn'?'warn':'ok';

      var actNum=typeof p.actualVal==='number'?p.actualVal:parseFloat(p.actual)||0;
      var planNum=typeof p.planVal==='number'?p.planVal:parseFloat(p.plan)||0;
      D.getElementById('sv2Fill').style.width=Math.min(100,Math.max(0,actNum))+'%';
      D.getElementById('sv2PlanMark').style.left=Math.min(100,Math.max(0,planNum))+'%';
      D.getElementById('sv2BarSub').textContent='Realisasi '+actNum.toFixed(2)+'% dari 100% · '+(p.devSub||'Sesuai jadwal');

      D.getElementById('sv2MsText').textContent=p.milestone||'Belum ada milestone tercatat';
      var tg=p.msTarget,gap=tg==null?null:tg-actNum;
      var tgTxt=tg==null?'':(' · Target rencana '+fmt(tg)+(gap>0.005?' (perlu +'+gap.toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+' poin)':' (sudah tercapai)'));
      D.getElementById('sv2MsSub').textContent=(p.milestoneDate||'Periode berjalan')+tgTxt;

      var profile=p.profile||{};
      var ctrName=p.contractor&&p.contractor!=='—'?p.contractor:(profile.contractor||'—');
      D.getElementById('sv2Contractor').textContent=ctrName;
      var logo=D.getElementById('sv2CtrLogo'),chip=D.getElementById('sv2CtrChip');
      if(p.logo){logo.src=p.logo;logo.hidden=false;chip.hidden=true;}
      else{logo.hidden=true;logo.removeAttribute('src');chip.hidden=false;chip.textContent=initials(ctrName);}

      D.getElementById('sv2Contract').textContent=profile.contract||'—';
      D.getElementById('sv2ContractNote').textContent=profile.contractNote||'Nilai kontrak efektif';

      var paidRupiah=p.row&&p.row.termPaid!=null?Number(p.row.termPaid)*1000000:null;
      D.getElementById('sv2Paid').textContent=paidRupiah==null?'—':fmtIdr(paidRupiah);
      var ctrRupiah=parseIdr(profile.contract);
      if(paidRupiah!=null&&ctrRupiah&&ctrRupiah>0){
        var pctTerm=(paidRupiah/ctrRupiah*100).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+'% dari nilai kontrak';
        D.getElementById('sv2PaidPct').textContent=pctTerm;
      }else{
        D.getElementById('sv2PaidPct').textContent=paidRupiah==null?'Belum tercatat':'Realisasi pembayaran termin';
      }

      var es=profile.effectiveStart,ef=profile.effectiveFinish;
      D.getElementById('sv2Dates').textContent=(es&&ef)?(es+' – '+ef):(profile.effectiveDate||es||ef||'—');
      var durTxt=(p.duration&&isFinite(Number(p.duration.total)))?('Durasi '+Math.round(Number(p.duration.total)).toLocaleString('id-ID')+' hari kalender'):'';
      D.getElementById('sv2Duration').textContent=profile.effectiveNote||durTxt||'Jadwal efektif proyek';
    };

    var copy=D.getElementById('sv2Copy');
    if(changed&&copy){
      copy.classList.add('switching');
      setTimeout(function(){fillHero();copy.classList.remove('switching');},140);
    }else{fillHero();}

    paintPhotos();
    syncRailCards(false);
  };

  function goToSlide(targetIdx,fromUser){
    if(!projectList||!projectList.length)return;
    currentIndex=(targetIdx+projectList.length)%projectList.length;
    elapsedMs=0;photoRound=0;
    renderProject(currentIndex);
    syncRailCards(!!fromUser);
  }

  window.nextSlide=function(){goToSlide((currentIndex||0)+1,false);};

  function togglePlay(){
    playing=!playing;
    var b=D.getElementById('sv2Play');
    if(b){b.textContent=playing?'⏸':'▶';b.setAttribute('aria-label',playing?'Jeda transisi otomatis':'Lanjutkan transisi otomatis');}
  }

  function tick(now){
    var dt=now-lastTick;
    lastTick=now;
    if(playing&&!introPlaying&&projectList&&projectList.length){
      elapsedMs+=dt;
      var ratio=Math.min(1,elapsedMs/SLIDE_MS);
      var fill=D.getElementById('sv2Load-'+currentIndex);
      if(fill)fill.style.width=(ratio*100).toFixed(2)+'%';
      var photos=photosOf(projectList[currentIndex],currentIndex);
      if(photos.length>1){
        var stepMs=Math.max(5000,SLIDE_MS/Math.min(3,photos.length));
        var nextRound=Math.floor(elapsedMs/stepMs);
        if(nextRound!==photoRound){photoRound=nextRound;paintPhotos();}
      }
      if(elapsedMs>=SLIDE_MS){
        elapsedMs=0;photoRound=0;
        if(currentIndex===projectList.length-1&&typeof finishIntro==='function'){
          currentIndex=0;finishIntro();
        }else{goToSlide(currentIndex+1,false);}
      }
    }
    rafId=requestAnimationFrame(tick);
  }

  window.startSlides=function(){
    if(typeof slideshowTimer!=='undefined'&&slideshowTimer){clearInterval(slideshowTimer);slideshowTimer=null;}
    elapsedMs=0;photoRound=0;lastTick=performance.now();
    if(!rafId)rafId=requestAnimationFrame(tick);
  };

  window.toggleOrientation=function(){
    var on=B.classList.toggle('sv2-portrait');
    var btns=D.querySelectorAll('[onclick*="toggleOrientation"]');
    btns.forEach(function(b){b.textContent=on?'🖥️ Mode TV Landscape':'🔄 Putar Tampilan';});
  };

  window.fitProjectTitle=function(){};

  D.getElementById('sv2Play').onclick=togglePlay;
  D.getElementById('sv2Prev').onclick=function(){goToSlide((currentIndex||0)-1,true);};
  D.getElementById('sv2Next').onclick=function(){goToSlide((currentIndex||0)+1,true);};
  D.getElementById('sv2PhotoBtn').onclick=function(){
    if(!projectList||!projectList.length)return;
    photoRound=(typeof photoRound==='number'?photoRound+1:1);
    paintPhotos();
  };
  D.addEventListener('keydown',function(e){
    if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
    if(e.key==='ArrowRight'){goToSlide((currentIndex||0)+1,true);}
    else if(e.key==='ArrowLeft'){goToSlide((currentIndex||0)-1,true);}
    else if(e.key===' '){e.preventDefault();togglePlay();}
  });
})();
</script>`;

const SPOTLIGHT_V2_PATCHES = [
  { file: 'Spotlight', find: '</head>', replace: CSS + '\n</head>' },
  { file: 'Spotlight', find: '</body>', replace: JS + '\n</body>' },
];

module.exports = { SPOTLIGHT_V2_PATCHES };

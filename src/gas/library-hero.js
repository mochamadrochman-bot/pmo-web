'use strict';

/**
 * Library & Knowledge (Desktop) · Unified Hero Banner + Tampilan Reader-First.
 * - Menggunakan 1 banner tetap bertema Library & Knowledge (/media/library-banner.jpg)
 *   yang otomatis menyesuaikan 4 tema dashboard (Biru, Sage, Mocha, Gelap).
 * - Menyatu dengan struktur layar penuh .main (100vh) pada Library: hero berada di atas
 *   workspace split panel, dan ikut menciut ringkas saat mode Fokus diaktifkan.
 * - Mobile (<= 900px / html.m-mode) dikembalikan ke layout standar agar navigasi aman.
 */

const LIBRARY_HERO_CSS = String.raw`<style id="pmoLibHeroCss">
html.ex-hero-hdr{
  --ex-stuck-top:#0B3A66;--ex-stuck-menu:#093157;--ex-stuck-act:#1E6FC0;
}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]){
  --ex-stuck-top:#0F2A1D;--ex-stuck-menu:#123022;--ex-stuck-act:#375534;
}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]){
  --ex-stuck-top:#3B2A1F;--ex-stuck-menu:#2d1f17;--ex-stuck-act:#6F4E37;
}
html.ex-hero-hdr[data-theme="dark"]{
  --ex-stuck-top:#0f172a;--ex-stuck-menu:#111c33;--ex-stuck-act:#2563eb;
}

/* Unified Hero Banner di atas split workspace */
#libHero{display:none}
html.ex-hero-hdr #libHero{
  flex:none;position:relative;overflow:visible!important;z-index:34;
  display:grid!important;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;
  align-items:end;column-gap:16px;
  padding:10px 22px 16px;min-height:138px;margin:12px 14px 0;
  border-radius:var(--r,16px);color:#fff;
  background:#073b63 url('/media/library-banner.jpg') center 52%/cover no-repeat;
  box-shadow:0 10px 26px rgba(8,24,42,.18);
  transition:min-height .2s ease,padding .2s ease;
}
html.ex-hero-hdr #libHero::before{
  content:"";position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:0;
  background:linear-gradient(96deg,rgba(7,26,46,.95) 0%,rgba(11,54,96,.82) 56%,rgba(8,28,50,.48) 100%);
  box-shadow:inset 0 64px 52px -26px rgba(0,0,0,.45);
}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]) #libHero::before{
  background:linear-gradient(98deg,rgba(15,42,29,.95) 0%,rgba(31,58,38,.82) 52%,rgba(55,85,52,.44) 100%)!important;
}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]) #libHero::before{
  background:linear-gradient(98deg,rgba(54,37,27,.95) 0%,rgba(82,58,41,.82) 52%,rgba(111,78,55,.44) 100%)!important;
}
html.ex-hero-hdr[data-theme="dark"] #libHero::before{
  background:linear-gradient(96deg,rgba(9,14,24,.96) 0%,rgba(15,23,42,.84) 56%,rgba(9,14,24,.54) 100%)!important;
}
html.ex-hero-hdr #libHero:has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden]),.pmo-isi-drop.open){z-index:150!important}

/* Baris 1 HUD di dalam Hero */
html.ex-hero-hdr #libHero>header.top{
  grid-column:1 / -1;grid-row:1;position:relative!important;top:auto!important;z-index:40!important;
  background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  border-bottom:1px solid rgba(255,255,255,.16)!important;
  padding:0 0 9px 0!important;margin:0 0 10px 0!important;gap:8px;flex-wrap:wrap;
}
html.ex-hero-hdr #libHero header.top .t{display:none!important}
html.ex-hero-hdr #libHero header.top .lib-top-sp{flex:1;min-width:8px}

/* Glass Controls inside Hero */
html.ex-hero-hdr #libHero header.top .icon-btn,
html.ex-hero-hdr #libHero header.top .ntf-wrap>button,
html.ex-hero-hdr #libHero header.top .pmo-qs-trigger,
html.ex-hero-hdr #libHero header.top .acm-chip,
html.ex-hero-hdr #libHero header.top .lib-gl-pill{
  height:36px;background:rgba(255,255,255,.12)!important;border:1px solid rgba(255,255,255,.24)!important;
  color:#fff!important;box-shadow:none!important;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
}
html.ex-hero-hdr #libHero header.top .icon-btn{width:36px;border-radius:10px}
html.ex-hero-hdr #libHero header.top .icon-btn:hover,
html.ex-hero-hdr #libHero header.top .ntf-wrap>button:hover,
html.ex-hero-hdr #libHero header.top .pmo-qs-trigger:hover,
html.ex-hero-hdr #libHero header.top .acm-chip:hover{
  background:rgba(255,255,255,.22)!important;border-color:rgba(255,255,255,.44)!important;
}
html.ex-hero-hdr #libHero header.top .acm-chip .acm-t b,
html.ex-hero-hdr #libHero header.top .acm-chip .acm-t small,
html.ex-hero-hdr #libHero header.top .acm-chip .acm-caret,
html.ex-hero-hdr #libHero header.top .pmo-qs-trigger *,
html.ex-hero-hdr #libHero header.top .ntf-wrap>button svg,
html.ex-hero-hdr #libHero header.top .icon-btn svg{color:#fff!important}
html.ex-hero-hdr #libHero header.top .pmo-qs-trigger kbd{
  background:rgba(255,255,255,.16)!important;border-color:rgba(255,255,255,.32)!important;color:#fff!important;
}
html.ex-hero-hdr #libHero header.top :is(.ntf-wrap,.account-wrap,.acm-wrap){position:relative;z-index:25}
html.ex-hero-hdr #libHero header.top :is(.ntf-wrap,.account-wrap,.acm-wrap):has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden])){z-index:55}
html.ex-hero-hdr #libHero header.top :is(.pop,.acm-pop,.ntf-pop){background:var(--card,#fff);color:var(--ink,#132b43);z-index:160!important}

.lib-gl-pill{display:none}
html.ex-hero-hdr #libHero header.top .lib-gl-pill{
  display:inline-flex;align-items:center;gap:8px;padding:0 12px;border-radius:10px;white-space:nowrap;
}
.lib-gl-pill svg{width:15px;height:15px;flex:none;opacity:.92}
.lib-gl-pill .lib-pl{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:rgba(219,234,254,.80);line-height:1;font-weight:700}
.lib-gl-pill .lib-pn{display:block;font-size:12px;font-weight:700;color:#fff;line-height:1.2}

/* CTA Unggah dokumen & Badge ADMIN */
html.ex-hero-hdr #libHero header.top .tbtn.up:not([hidden]){
  display:inline-flex;align-items:center;gap:7px;height:36px;min-height:36px;padding:0 14px;border-radius:10px;
  background:#fff!important;color:#0b3a66!important;border:1px solid rgba(255,255,255,.9)!important;
  font-size:12.5px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,.18);transition:transform .15s,background .15s;
}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]) #libHero header.top .tbtn.up:not([hidden]){color:#183319!important}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]) #libHero header.top .tbtn.up:not([hidden]){color:#3b2a1f!important}
html.ex-hero-hdr #libHero header.top .tbtn.up:not([hidden]):hover{background:#eaf4ff!important;transform:translateY(-1px)}
html.ex-hero-hdr #libHero header.top .tbtn.up svg{color:currentColor!important}
html.ex-hero-hdr #libHero header.top .adm:not([hidden]){
  display:inline-flex;align-items:center;padding:4px 9px;border-radius:8px;
  background:rgba(251,191,36,.20)!important;border:1px solid rgba(251,191,36,.42);color:#fde68a!important;
  font-size:11px;font-weight:700;letter-spacing:.04em;
}

/* Baris 2 Hero Typography & Status */
html.ex-hero-hdr #libHero .lib-hero-txt{grid-column:1;grid-row:2;position:relative;min-width:0;z-index:5}
.lib-hero-ey{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;font-size:12px;font-weight:600;color:#cbe6fb}
.lib-hero-pill{
  display:inline-flex;align-items:center;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700;
  background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.28);color:#e0f2fe;white-space:nowrap;
}
.lib-hero-pill.ok{background:rgba(79,209,160,.20);border-color:rgba(110,231,183,.45);color:#a7f3d0}
.lib-hero-pill.warn{background:rgba(245,158,11,.22);border-color:rgba(252,211,77,.45);color:#fde68a}
html.ex-hero-hdr #libHero h1{
  margin:0 0 3px;font-size:clamp(20px,2.2vw,28px);line-height:1.12;font-weight:800;letter-spacing:-.02em;color:#fff!important;
}
html.ex-hero-hdr #libHero h1 span{color:#67c5ff}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]) #libHero h1 span{color:#bce39a}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]) #libHero h1 span{color:#f3cb99}
html.ex-hero-hdr #libHero .lib-hero-sub{margin:0;color:#dcecf7!important;font-size:12.5px;max-width:74ch;line-height:1.4}

/* Isi Halaman Frosted Glass Dropdown inside Hero */
html.ex-hero-hdr .pmo-pbar .pmo-crumb{display:none!important}
html.ex-hero-hdr #libHero .pmo-pbar{
  position:relative!important;top:auto!important;margin:0!important;padding:0!important;
  border:0!important;background:transparent!important;-webkit-backdrop-filter:none!important;
  backdrop-filter:none!important;box-shadow:none!important;flex:none;overflow:visible!important;
}
html.ex-hero-hdr #libHero .pmo-pbar[hidden]{display:none!important}
html.ex-hero-hdr #libHero .pmo-pbar .pmo-pbar-r{min-height:0!important;overflow:visible!important}
html.ex-hero-hdr #libHero .pmo-pbar .pmo-isi-drop{margin-left:0}
html.ex-hero-hdr #libHero .pmo-pbar .pmo-isi-trig{
  height:36px;padding:0 13px;border-radius:10px;
  background:rgba(255,255,255,.14)!important;border:1px solid rgba(255,255,255,.28)!important;
  color:#fff!important;box-shadow:none!important;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
}
html.ex-hero-hdr #libHero .pmo-pbar .pmo-isi-trig:hover,
html.ex-hero-hdr #libHero .pmo-pbar .pmo-isi-drop.open .pmo-isi-trig{
  background:rgba(255,255,255,.22)!important;border-color:rgba(255,255,255,.46)!important;color:#fff!important;
}
html.ex-hero-hdr #libHero .pmo-pbar .pmo-isi-trig .pmo-isi-l{color:rgba(219,234,254,.84)!important}
html.ex-hero-hdr #libHero .pmo-pbar .pmo-isi-trig svg{color:#fff!important;opacity:.92}
html.ex-hero-hdr #libHero>.pmo-pbar{grid-column:2;grid-row:2;align-self:end;justify-self:end;z-index:10!important}
html.ex-hero-hdr #libHero>.pmo-pbar .pmo-isi-menu{
  background:var(--card,#fff)!important;border:1px solid var(--line,#dce5ed)!important;
  color:var(--ink,#132b43)!important;z-index:160!important;
}

/* Mode Fokus: menciutkan Hero menjadi bar ringkas agar ruang baca PDF maksimal */
html.ex-hero-hdr.lib-focus-mode #libHero{
  min-height:0;padding:8px 18px;grid-template-rows:auto;align-items:center;
}
html.ex-hero-hdr.lib-focus-mode #libHero>header.top{
  margin:0!important;padding:0!important;border-bottom:0!important;grid-column:2;grid-row:1;justify-content:flex-end;
}
html.ex-hero-hdr.lib-focus-mode #libHero header.top .lib-gl-pill,
html.ex-hero-hdr.lib-focus-mode #libHero header.top .lib-top-sp{display:none!important}
html.ex-hero-hdr.lib-focus-mode #libHero .lib-hero-txt{grid-column:1;grid-row:1}
html.ex-hero-hdr.lib-focus-mode #libHero .lib-hero-ey,
html.ex-hero-hdr.lib-focus-mode #libHero .lib-hero-sub,
html.ex-hero-hdr.lib-focus-mode #libHero>.pmo-pbar{display:none!important}
html.ex-hero-hdr.lib-focus-mode #libHero h1{font-size:18px;margin:0}

/* ================================================================
   PEMOLESAN WORKSPACE SPLIT PANEL (.lk, .lk-rail, .lk-view)
   ================================================================ */
html.ex-hero-hdr .lk{padding:12px 14px 14px!important;gap:12px!important}
html.ex-hero-hdr .lk.focus-read{gap:0!important}
html.ex-hero-hdr .lk-rail{
  border:1px solid var(--line);border-radius:16px;
  box-shadow:0 2px 10px rgba(10,37,64,.05);
}
html.ex-hero-hdr .lk.focus-read .lk-rail{border-width:0}
html.ex-hero-hdr .lk-view{
  border:1px solid var(--line);border-radius:16px;
  box-shadow:0 2px 10px rgba(10,37,64,.05);
}

/* Kartu dokumen & kontrol panel kiri */
html.ex-hero-hdr .doc{padding:11px 12px;border-radius:12px;transition:border-color .15s,background .15s}
html.ex-hero-hdr .doc:hover{border-color:var(--pri);background:var(--card)}
html.ex-hero-hdr .doc.on{
  background:var(--card);border-color:var(--pri);
  box-shadow:inset 3px 0 0 var(--pri),0 4px 12px rgba(15,95,168,.08);
}
html.ex-hero-hdr .doc .dt{padding-right:28px}
html.ex-hero-hdr .doc .dedit{top:8px;right:8px;width:26px;height:26px;border:1px solid transparent;border-radius:7px}
html.ex-hero-hdr .doc .dedit:hover{background:var(--soft);border-color:var(--line)}

/* Toolbar PDF viewer & Overview Card */
html.ex-hero-hdr .vbar{padding:10px 16px;background:var(--card);border-bottom:1px solid var(--line)}
html.ex-hero-hdr .vctl{padding-top:8px;border-top:1px dashed var(--line)}
html.ex-hero-hdr .vscroll{padding:20px 24px}
html.ex-hero-hdr .vov{max-width:920px;gap:14px}
html.ex-hero-hdr .vov-card{border-radius:15px;padding:22px;box-shadow:0 2px 10px rgba(10,37,64,.05)}

/* 4 Mini-Stat Cards inside Overview */
.vov-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0 16px}
.vst{background:var(--tint);border:1px solid var(--line);border-radius:11px;padding:10px 12px}
.vst small{display:block;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.vst b{display:block;font-size:17px;font-weight:800;color:var(--navy);margin-top:2px;font-variant-numeric:tabular-nums}
.vst span{display:block;font-size:11px;color:var(--muted);margin-top:1px}

/* Legenda titik warna & bar klikable pada Peta Keterbacaan */
.cov-leg{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.cov-leg-it{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--muted)}
.cov-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.cov-dot.pdf{background:var(--lk-ok)}.cov-dot.ocr{background:var(--pri)}.cov-dot.toc{background:var(--muted);opacity:.55}.cov-dot.scan{background:var(--lk-warn)}
.cov-b{cursor:pointer;border:0;padding:0;transition:transform .12s,opacity .12s}
.cov-b:hover{transform:translateY(-2px);opacity:1}

@media (max-width:1279px){
  html.ex-hero-hdr .lk{grid-template-columns:minmax(0,1fr)!important}
}
@media (max-width:900px){
  #libHero{display:none!important}
  .vov-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
}
</style>`;

const LIBRARY_HERO_JS = String.raw`<script id="pmoLibHeroJs">
(function(){
  if(window.__pmoLibHeroInit)return;window.__pmoLibHeroInit=true;
  var syncRaf=0,metaRaf=0;

  function mainEl(){return document.querySelector('.main')}
  function heroEl(){return document.getElementById('libHero')}

  function ensureHeroSection(){
    var m=mainEl();if(!m)return null;
    var hero=heroEl();
    if(!hero){
      hero=document.createElement('section');
      hero.id='libHero';
      hero.className='hero lib-hero';
      hero.setAttribute('aria-label','Header Library dan Knowledge');
      hero.innerHTML='<div class="lib-hero-txt">'
        +'<div class="lib-hero-ey" id="libHeroEy">'
          +'<span>Modul 2 · Document Control</span>'
          +'<span class="lib-hero-pill ok" id="libHeroStatOk">Memuat indeks…</span>'
          +'<span class="lib-hero-pill warn" id="libHeroStatWarn" hidden></span>'
        +'</div>'
        +'<h1 id="libHeroH1">Library &amp; <span>Knowledge</span></h1>'
        +'<p class="lib-hero-sub" id="libHeroSub">Repositori terpusat pedoman, prosedur, dan standar teknis dengan pencarian pasal serta OCR AI lintas proyek.</p>'
      +'</div>';
      m.insertBefore(hero,m.firstChild);
    }
    return hero;
  }

  function ensureControls(hdr){
    if(!hdr)return;
    if(!document.getElementById('libScopePill')){
      var sp=document.createElement('div');
      sp.id='libScopePill';
      sp.className='lib-gl-pill';
      sp.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
        +'<span><span class="lib-pl">Cakupan Library</span><span class="lib-pn">Semua Proyek</span></span>';
      var t=hdr.querySelector('.t');
      if(t&&t.nextSibling)hdr.insertBefore(sp,t.nextSibling);else hdr.insertBefore(sp,hdr.firstChild);
    }
    if(!document.getElementById('libTopSpacer')){
      var spacer=document.createElement('span');
      spacer.id='libTopSpacer';
      spacer.className='lib-top-sp';
      var anchor=hdr.querySelector('.pmo-qs-trigger,.ntf-wrap,.account-wrap,.acm-wrap,#themeBtn,#userAv');
      if(anchor)hdr.insertBefore(spacer,anchor);else hdr.appendChild(spacer);
    }
  }

  function syncHeroStats(){
    var okEl=document.getElementById('libHeroStatOk');
    var warnEl=document.getElementById('libHeroStatWarn');
    if(!okEl||!warnEl)return;
    var cards=document.querySelectorAll('#docList .doc');
    if(cards.length){
      var ok=0,warn=0;
      cards.forEach(function(c){
        if(c.querySelector('.dic.warn'))warn++;else ok++;
      });
      okEl.textContent=ok+' Dokumen Terindeks';
      if(warn>0){warnEl.hidden=false;warnEl.textContent=warn+' Perlu OCR AI';}
      else{warnEl.hidden=true;}
      return;
    }
    var cnt=document.getElementById('docCount');
    var txt=cnt?String(cnt.textContent||'').trim():'';
    okEl.textContent=txt||'Library Siap';
    warnEl.hidden=true;
  }

  function syncFocusClass(){
    var lk=document.getElementById('lk');
    document.documentElement.classList.toggle('lib-focus-mode',!!(lk&&lk.classList.contains('focus-read')));
  }

  function syncUnifiedHeader(){
    var H=document.documentElement,m=mainEl(),hdr=document.querySelector('header.top'),pbar=document.getElementById('pmoPbar');
    var hero=ensureHeroSection();
    if(!m||!hdr||!hero)return;
    var mob=window.innerWidth<=900||H.classList.contains('m-mode');

    if(mob){
      H.classList.remove('ex-hero-hdr','lib-focus-mode');
      hero.hidden=true;
      if(hdr.parentNode!==m)m.insertBefore(hdr,m.firstChild);
      if(pbar&&pbar.parentNode!==m)m.insertBefore(pbar,hdr.nextSibling);
      return;
    }

    hero.hidden=false;
    H.classList.add('ex-hero-hdr');
    if(hdr.parentNode!==hero)hero.insertBefore(hdr,hero.firstChild);
    if(pbar&&pbar.parentNode!==hero)hero.appendChild(pbar);
    ensureControls(hdr);
    syncHeroStats();
    syncFocusClass();
  }

  function schedSync(){if(!syncRaf)syncRaf=requestAnimationFrame(function(){syncRaf=0;syncUnifiedHeader()})}
  function schedMeta(){if(!metaRaf)metaRaf=requestAnimationFrame(function(){metaRaf=0;syncHeroStats()})}

  window.addEventListener('resize',schedSync,{passive:true});

  var mainNode=mainEl();
  if(mainNode&&window.MutationObserver){
    new MutationObserver(function(){
      var mob=window.innerWidth<=900||document.documentElement.classList.contains('m-mode');
      var pbar=document.getElementById('pmoPbar');
      if(!mob&&pbar&&pbar.parentNode===mainNode)schedSync();
    }).observe(mainNode,{childList:true});
  }

  var dl=document.getElementById('docList');
  if(dl&&window.MutationObserver){
    new MutationObserver(schedMeta).observe(dl,{childList:true,subtree:true});
  }
  var lkNode=document.getElementById('lk');
  if(lkNode&&window.MutationObserver){
    new MutationObserver(syncFocusClass).observe(lkNode,{attributes:true,attributeFilter:['class']});
  }

  syncUnifiedHeader();
})();
</script>`;

const LIBRARY_HERO_PATCHES = [
  {
    file: 'Library',
    find: '</head>',
    replace: LIBRARY_HERO_CSS + '\n</head>',
  },
  {
    file: 'Library',
    find: '</body>',
    replace: LIBRARY_HERO_JS + '\n</body>',
  },
];

module.exports = { LIBRARY_HERO_PATCHES };

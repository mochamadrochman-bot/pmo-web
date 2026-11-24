'use strict';

/**
 * Unified Hero Banner untuk 3 halaman Input & Data Proyek (Desktop):
 * - InputProgress.html (Input Progress Mingguan) -> /media/input-weekly-banner.jpg
 * - MonthlyReport.html (Input Progress Bulanan)  -> /media/input-monthly-banner.jpg
 * - ProjectSetup.html  (Tambah / Edit Proyek)    -> /media/project-setup-banner.jpg
 *
 * Fitur & Pencegahan Regresi:
 * - Melebur topbar putih, strip breadcrumb #pmoPbar, dan banner gradien menjadi
 *   1 Unified Hero Banner tematik tanpa duplikasi bar atas.
 * - Row 1 HUD selalu 1 baris rapi: pemilih Proyek Aktif + kontrol kontekstual
 *   (Week / Bulan / Mode Proyek) di kiri; Cari Ctrl K, Notifikasi, Akun di kanan.
 * - Dropdown frosted-glass "Isi form" menggantikan bar .steps di sudut kanan hero,
 *   lalu ikut ke sticky bar #exStuckHost saat halaman digulir.
 * - Memperbaiki warna tombol hover, focus ring, readonly input, kartu .bid/.mode/.seg,
 *   serta batang progres (.bar .pl -> var(--s1)) di seluruh 4 tema (Biru, Sage, Mocha, Gelap).
 * - Mobile (<= 900px / html.m-mode) dikembalikan utuh ke layout standar.
 */

const INPUT_HERO_CSS = String.raw`<style id="pmoInpHeroCss">
html.ex-hero-hdr{
  --ex-stuck-top:#0B3A66;--ex-stuck-sub:#0B3A66;--ex-stuck-menu:#093157;--ex-stuck-act:#1E6FC0;
  --pri:#0F5FA8;--pri2:#1F6DB3;--pri-ink:#0C5394;--navy:#073B63;
  --c2:#0F5FA8;--c1:#4A94D1;--s1:#9BC7EA;--s2:#4A94D1;
}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]){
  --ex-stuck-top:#0F2A1D;--ex-stuck-sub:#0F2A1D;--ex-stuck-menu:#123022;--ex-stuck-act:#375534;
  --pri:#375534;--pri2:#6B9071;--pri-ink:#2C4A2A;--navy:#0F2A1D;
  --c2:#375534;--c1:#6B9071;--s1:#C2D9BE;--s2:#6B9071;
}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]){
  --ex-stuck-top:#3B2A1F;--ex-stuck-sub:#3B2A1F;--ex-stuck-menu:#2D1F17;--ex-stuck-act:#6F4E37;
  --pri:#6F4E37;--pri2:#B08968;--pri-ink:#5D3E29;--navy:#3B2A1F;
  --c2:#6F4E37;--c1:#B08968;--s1:#DFCBB2;--s2:#B08968;
}
html.ex-hero-hdr[data-theme="dark"]{
  --ex-stuck-top:#0f172a;--ex-stuck-menu:#111c33;--ex-stuck-act:#1f6db3;
  --bg:#0E1A27;--card:#152435;--tint:#1A2C3F;--ink:#E3ECF4;--muted:#9BB0C3;--line:#263B4F;
  --pri:#1F6DB3;--pri2:#38BDF8;--pri-ink:#8FCAF6;--navy:#D9ECFA;--soft:#1B3550;
  --c2:#1F6DB3;--c1:#5FA6E0;--s1:#3F6F97;--s2:#5FA6E0;
}

/* Penyesuaian warna komponen form agar 100% sinkron dengan 4 tema */
html[data-page="input"] .content,
html[data-page="monthly"] .content,
html[data-page="project"] .content,
html[data-inp-page] .content{max-width:1360px}
html.ex-hero-hdr .content{padding-top:14px!important}
html.ex-hero-hdr .card[id^="sec-"]{scroll-margin-top:84px}
html[data-inp-page] .bid,
html[data-inp-page] .mode,
html[data-inp-page] .pitem,
html[data-inp-page] .seg button,
html[data-inp-page] .dialog{background:var(--card)}
html[data-inp-page] .inp:focus{
  background:var(--card);border-color:var(--pri2);
  box-shadow:0 0 0 3px color-mix(in srgb,var(--pri) 18%,transparent);
}
html[data-inp-page] .inp[readonly]{background:var(--tint);color:var(--muted)}
html[data-inp-page] .bar{background:var(--line)}
html[data-inp-page] .bar .pl{background:var(--s1)}
html[data-inp-page] .bar .ac{background:var(--c2,var(--pri))}
html[data-inp-page] .btn.primary:hover{background:var(--pri-ink);border-color:var(--pri-ink)}
html[data-inp-page] .pitem.on{
  border-color:var(--pri);
  box-shadow:0 0 0 3px color-mix(in srgb,var(--pri) 16%,transparent);
}
html[data-inp-page] table.mt th,
html[data-inp-page] .hist th,
html[data-inp-page] .life.closed{background:var(--tint)}
html[data-inp-page] .actionbar{
  background:var(--topbar,rgba(255,255,255,.96));border-top-color:var(--line);
}
html[data-theme="dark"][data-inp-page] .actionbar{background:rgba(21,36,53,.96)}
html[data-theme="dark"][data-inp-page] .topbar{background:rgba(21,36,53,.94)}

/* Sembunyikan strip breadcrumb/topbar duplikat saat mode Unified Hero aktif */
html.ex-hero-hdr #pmoPbar,
html.ex-hero-hdr #inpHeroSpacer[hidden],
html.ex-hero-hdr #inpHero header.topbar .crumbs,
html.ex-hero-hdr #inpHero .inp-stuck-t,
html.ex-hero-hdr #inpHero>.steps{display:none!important}
html.ex-hero-hdr #sec-info label.f:has(#projectSelect,#weekSelect,#monthSelect){display:none!important}
html.ex-hero-hdr[data-inp-page="input"] #sec-info .ginfo{grid-template-columns:repeat(3,minmax(0,1fr))}
html.ex-hero-hdr[data-inp-page="input"] #sec-info .ginfo .span2{grid-column:auto}
html.ex-hero-hdr[data-inp-page="monthly"] #sec-info .ginfo{grid-template-columns:minmax(0,1fr)}

/* Unified Hero Banner (#inpHero) */
html.ex-hero-hdr .content>#inpHero{
  position:relative;overflow:visible!important;z-index:34;
  display:grid!important;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;
  align-items:end;column-gap:18px;padding:12px 24px 20px;min-height:168px;
  border:0!important;border-radius:var(--r,16px);margin:0 0 14px;color:#fff;
  background-color:#073b63;background-size:cover;background-position:center 50%;background-repeat:no-repeat;
  box-shadow:0 12px 30px rgba(8,24,42,.18);
}
html.ex-hero-hdr .content>#inpHero::after{display:none!important}
html.ex-hero-hdr[data-inp-page="input"] .content>#inpHero{
  background-image:url('/media/input-weekly-banner.jpg');background-position:center 52%;
}
html.ex-hero-hdr[data-inp-page="monthly"] .content>#inpHero{
  background-image:url('/media/input-monthly-banner.jpg');background-position:center 46%;
}
html.ex-hero-hdr[data-inp-page="project"] .content>#inpHero{
  background-image:url('/media/project-setup-banner.jpg');background-position:center 54%;
}
html.ex-hero-hdr .content>#inpHero::before{
  content:"";position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:0;
  background:linear-gradient(96deg,rgba(7,26,46,.95) 0%,rgba(11,54,96,.82) 56%,rgba(8,28,50,.48) 100%);
  box-shadow:inset 0 68px 54px -26px rgba(0,0,0,.44);
}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]) .content>#inpHero::before{
  background:linear-gradient(98deg,rgba(15,42,29,.95) 0%,rgba(31,58,38,.82) 52%,rgba(55,85,52,.44) 100%)!important;
}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]) .content>#inpHero::before{
  background:linear-gradient(98deg,rgba(54,37,27,.95) 0%,rgba(82,58,41,.82) 52%,rgba(111,78,55,.44) 100%)!important;
}
html.ex-hero-hdr[data-theme="dark"] .content>#inpHero::before{
  background:linear-gradient(96deg,rgba(9,14,24,.96) 0%,rgba(15,23,42,.84) 56%,rgba(9,14,24,.54) 100%)!important;
}
html.ex-hero-hdr :is(#inpHero,#exStuckHost):has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden]),.inp-proj-wrap.open,.inp-isi-drop.open){z-index:150!important}

#inpHeroSpacer{display:none;grid-column:1 / -1;grid-row:1;flex:none}
html.ex-hero-hdr.ex-hdr-mounted #inpHeroSpacer{display:block}

/* Row 1 HUD di Hero & Sticky Bar */
html.ex-hero-hdr :is(#inpHero,#exStuckHost) header.topbar{
  position:relative!important;top:auto!important;z-index:40!important;
  display:flex!important;align-items:center;gap:8px;flex-wrap:nowrap;
  background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  border-bottom:1px solid rgba(255,255,255,.16)!important;
}
html.ex-hero-hdr #inpHero>header.topbar{grid-column:1 / -1;grid-row:1;padding:0 0 10px 0!important;margin:0 0 12px 0!important}
html.ex-hero-hdr #inpHero>.inp-hero-txt{grid-column:1;grid-row:2;position:relative;min-width:0;z-index:5}
html.ex-hero-hdr :is(#inpHero,#exStuckHost) header.topbar .inp-top-sp{flex:1;min-width:6px}
html.ex-hero-hdr #exStuckHost header.topbar .inp-top-sp{display:none}
html.ex-hero-hdr #inpHero header.topbar .hamb{display:none!important}

/* Frosted Glass Controls di Hero & Sticky */
html.ex-hero-hdr :is(#inpHero,#exStuckHost) header.topbar :is(.icon-btn,.ntf-wrap>button,.pmo-qs-trigger,.acm-chip,.userchip,.inp-gl-btn,.inp-isi-trig){
  height:38px;background:rgba(255,255,255,.13)!important;border:1px solid rgba(255,255,255,.28)!important;
  color:#fff!important;box-shadow:none!important;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
}
html.ex-hero-hdr :is(#inpHero,#exStuckHost) header.topbar :is(.icon-btn,.ntf-wrap>button,.pmo-qs-trigger,.acm-chip,.userchip,.inp-gl-btn):hover,
html.ex-hero-hdr :is(#inpHero,#exStuckHost) header.topbar .inp-isi-trig:hover{
  background:rgba(255,255,255,.22)!important;border-color:rgba(255,255,255,.46)!important;
}
html.ex-hero-hdr :is(#inpHero,#exStuckHost) header.topbar :is(.userchip .ut b,.userchip .ut small,.acm-chip .acm-t b,.acm-chip .acm-t small,.acm-chip .acm-caret,.pmo-qs-trigger *,.ntf-wrap>button svg,.icon-btn svg){color:#fff!important}
html.ex-hero-hdr :is(#inpHero,#exStuckHost) header.topbar .pmo-qs-trigger kbd{
  background:rgba(255,255,255,.16)!important;border-color:rgba(255,255,255,.32)!important;color:#fff!important;
}
html.ex-hero-hdr :is(#inpHero,#exStuckHost) header.topbar :is(.ntf-wrap,.account-wrap,.acm-wrap,.inp-proj-wrap,.inp-isi-drop){position:relative;z-index:25;flex:none}
html.ex-hero-hdr :is(#inpHero,#exStuckHost) header.topbar :is(.ntf-wrap,.account-wrap,.acm-wrap,.inp-proj-wrap,.inp-isi-drop):has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden]),.inp-pop:not([hidden]),.inp-isi-menu:not([hidden])){z-index:55}
html.ex-hero-hdr :is(#inpHero,#exStuckHost) header.topbar :is(.pop,.acm-pop,.ntf-pop){background:var(--card,#fff);color:var(--ink,#132b43);z-index:160!important}

/* Project HUD Selector */
.inp-proj-wrap{display:none}
html.ex-hero-hdr #inpHero header.topbar .inp-proj-wrap{display:inline-flex;align-items:center}
html.ex-hero-hdr #exStuckHost .inp-proj-wrap{display:none!important}
.inp-gl-btn{
  display:inline-flex;align-items:center;gap:8px;padding:0 12px;border-radius:11px;
  font:600 12.5px/1.2 inherit;cursor:pointer;max-width:270px;
}
.inp-gl-btn svg{width:15px;height:15px;flex:none;opacity:.9}
.inp-gl-btn .inp-chev{width:13px;height:13px;opacity:.82}
.inp-gl-btn.single .inp-chev{display:none}
.inp-gl-btn .inp-pl{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:rgba(219,234,254,.84);line-height:1;text-align:left}
.inp-gl-btn .inp-pn{display:block;font-size:12px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:195px;text-align:left;line-height:1.25}
.inp-pop{
  position:absolute;left:0;top:calc(100% + 8px);width:min(360px,calc(100vw - 48px));max-height:360px;overflow-y:auto;
  border-radius:14px;padding:10px;background:rgba(16,25,39,.96);backdrop-filter:blur(14px);
  border:1px solid rgba(255,255,255,.18);box-shadow:0 20px 48px rgba(0,0,0,.42);z-index:170;color:#f1f5f9;
}
.inp-pop[hidden]{display:none!important}
.inp-pop-q{
  width:100%;height:34px;padding:0 10px;margin-bottom:8px;border-radius:9px;
  border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.3);color:#fff;font:500 12.5px/1.2 inherit;
}
.inp-pop-q:focus{outline:0;border-color:rgba(125,211,252,.7)}
.inp-pop-opt{
  display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:36px;
  padding:7px 10px;border:1px solid transparent;border-radius:9px;background:transparent;
  color:#f1f5f9;font:600 12.5px/1.3 inherit;text-align:left;cursor:pointer;
}
.inp-pop-opt:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.14)}
.inp-pop-opt.on{background:rgba(30,111,192,.36);border-color:rgba(125,211,252,.45)}
.inp-pop-opt small{font-size:10.5px;color:#cbd5e1;font-weight:500;flex:none}

/* Period / Month Picker Pill & Mode Segmented Control */
.inp-ctx-pick{
  display:none;align-items:center;height:38px;border-radius:11px;overflow:hidden;flex:none;
  background:rgba(8,18,32,.40);border:1px solid rgba(255,255,255,.26);backdrop-filter:blur(8px);
}
html.ex-hero-hdr :is(#inpHero,#exStuckHost) .inp-ctx-pick{display:inline-flex}
.inp-ctx-pick button.inp-arr{
  width:30px;height:36px;border:0;background:transparent;color:rgba(255,255,255,.92);display:grid;place-items:center;padding:0;
}
.inp-ctx-pick button.inp-arr:hover:not(:disabled){background:rgba(255,255,255,.15);color:#fff}
.inp-ctx-pick button.inp-arr:disabled{opacity:.38;cursor:not-allowed}
.inp-ctx-pick select{
  height:36px;border:0;border-inline:1px solid rgba(255,255,255,.2);background:transparent;color:#fff;
  padding:0 10px;font-size:12px;font-weight:700;max-width:210px;cursor:pointer;outline:none;
}
.inp-ctx-pick select option{background:var(--card,#fff);color:var(--ink,#132b43)}

.inp-mode-seg{
  display:none;align-items:center;padding:3px;border-radius:11px;gap:2px;flex:none;
  background:rgba(8,18,32,.44);border:1px solid rgba(255,255,255,.24);backdrop-filter:blur(8px);
}
html.ex-hero-hdr #inpHero .inp-mode-seg{display:inline-flex}
html.ex-hero-hdr #exStuckHost .inp-mode-seg{display:none!important}
.inp-mode-seg button{
  height:30px;padding:0 11px;border:0;border-radius:8px;background:transparent;color:rgba(255,255,255,.88);
  font-size:12px;font-weight:700;white-space:nowrap;transition:background .14s,color .14s;
}
.inp-mode-seg button:hover{background:rgba(255,255,255,.12);color:#fff}
.inp-mode-seg button.on{background:#fff;color:#073b63;box-shadow:0 2px 8px rgba(0,0,0,.18)}
html[data-accent="sage"]:not([data-theme="dark"]) .inp-mode-seg button.on{color:#0F2A1D}
html[data-accent="mocha"]:not([data-theme="dark"]) .inp-mode-seg button.on{color:#3B2A1F}

/* Row 2 Hero Text & Meta Pill */
html.ex-hero-hdr #inpHero .inp-hero-ey{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px}
html.ex-hero-hdr #inpHero .inp-hero-ey>small{display:inline-block!important;margin:0;color:#cbe6fb!important;font-size:12.5px;font-weight:600}
.inp-hero-pill{
  display:inline-flex;align-items:center;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700;
  background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.28);color:#e0f2fe;white-space:nowrap;
}
.inp-hero-pill.ok{background:rgba(79,209,160,.22);border-color:rgba(110,231,183,.45);color:#d1fae5}
.inp-hero-pill.warn{background:rgba(245,158,11,.22);border-color:rgba(253,230,138,.45);color:#fef3c7}
html.ex-hero-hdr #inpHero h1{
  margin:0 0 5px!important;font-size:clamp(22px,2.4vw,30px)!important;line-height:1.12!important;
  font-weight:800!important;letter-spacing:-.02em;color:#fff!important;
}
html.ex-hero-hdr #inpHero h1 span{color:#7dd3fc!important}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]) #inpHero h1 span{color:#bce39a!important}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]) #inpHero h1 span{color:#f3cb99!important}
html.ex-hero-hdr #inpHero .inp-hero-txt>p{margin:0;color:#dcecf7!important;font-size:13px;max-width:74ch;line-height:1.45}

/* Row 2 Right: Isi Form Frosted Glass Dropdown */
.inp-isi-drop{position:relative;display:none}
html.ex-hero-hdr #inpHero .inp-isi-drop,
html.ex-hero-hdr #exStuckHost .inp-isi-drop{display:inline-block}
html.ex-hero-hdr #inpHero>.inp-isi-drop{grid-column:2;grid-row:2;align-self:end;justify-self:end;z-index:15}
.inp-isi-trig{display:inline-flex;align-items:center;gap:10px;padding:0 13px;border-radius:11px;cursor:pointer;text-align:left}
.inp-isi-l{display:block;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:rgba(219,234,254,.84);font-weight:700;line-height:1}
.inp-isi-cur{display:block;font-size:12.5px;font-weight:700;color:#fff;line-height:1.25}
.inp-isi-trig svg{width:14px;height:14px;opacity:.92;flex:none}
.inp-isi-menu{
  position:absolute;top:calc(100% + 8px);right:0;min-width:230px;padding:6px;border-radius:13px;
  background:var(--card,#fff);border:1px solid var(--line,#dce4ee);color:var(--ink,#132b43);
  box-shadow:0 18px 40px rgba(8,24,42,.26);z-index:165;display:grid;gap:2px;
}
.inp-isi-menu[hidden]{display:none!important}
.inp-isi-menu button{
  display:flex;align-items:center;gap:8px;width:100%;padding:8px 11px;
  border:0;border-radius:8px;background:transparent;color:inherit;font:600 12.5px/1.25 inherit;text-align:left;cursor:pointer;
}
.inp-isi-menu button b{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--soft,#e8f3fb);color:var(--pri-ink,#0c5394);font-size:10.5px;flex:none}
.inp-isi-menu button:hover,.inp-isi-menu button.on{background:var(--soft,#e8f3fb);color:var(--pri-ink,#0c5394);font-weight:700}

/* Sticky Scroll Bar (#exStuckHost) */
#exStuckHost{
  position:fixed;top:0;right:0;left:var(--ex-stuck-left,0);z-index:48;
  background:var(--ex-stuck-top);color:#fff;box-shadow:0 10px 28px rgba(0,0,0,.24);
  border-bottom:1px solid rgba(255,255,255,.14);
  transform:translate3d(0,-104%,0);opacity:0;pointer-events:none;
  transition:transform .36s cubic-bezier(.22,1,.36,1),opacity .28s ease,background-color .28s ease;
}
#exStuckHost:has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden]),.inp-isi-drop.open){z-index:160!important}
html.ex-hero-hdr.ex-hdr-stuck #exStuckHost{transform:none;opacity:1;pointer-events:auto}
#exStuckHost[hidden]{display:none!important}
#exStuckHost header.topbar{max-width:1600px;margin:0 auto!important;padding:8px 24px!important;min-height:0!important;border-bottom:0!important}
#exStuckHost .inp-stuck-t{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1;padding-right:10px}
#exStuckHost .inp-stuck-t small{font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,255,255,.72);font-weight:700;line-height:1.1}
#exStuckHost .inp-stuck-t b{font-size:14.5px;color:#fff;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
#exStuckHost .inp-isi-menu{background:var(--ex-stuck-menu);border-color:rgba(255,255,255,.18);color:#fff}
#exStuckHost .inp-isi-menu button b{background:rgba(255,255,255,.16);color:#fff}
#exStuckHost .inp-isi-menu button:hover{background:rgba(255,255,255,.12);color:#fff}
#exStuckHost .inp-isi-menu button.on{background:var(--ex-stuck-act);color:#fff}

/* Proteksi Z-Index Modal */
html.ex-hero-hdr .modal{z-index:320!important}
@media (max-width:900px){
  #exStuckHost,.inp-proj-wrap,.inp-ctx-pick,.inp-mode-seg,.inp-isi-drop{display:none!important}
}
</style>`;

const INPUT_HERO_JS = String.raw`<script id="pmoInpHeroJs">
(function(){
  if(window.__pmoInpHeroInit)return;window.__pmoInpHeroInit=true;
  var stuckTimer=0,syncRaf=0,metaRaf=0;

  function detectPage(){
    if(document.getElementById('sec-mode'))return 'project';
    if(document.getElementById('monthSelect'))return 'monthly';
    return 'input';
  }
  var PAGE_MODE=detectPage();
  document.documentElement.setAttribute('data-inp-page',PAGE_MODE);

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]})}
  function contentEl(){return document.querySelector('.main>.content')||document.querySelector('.content')}
  function heroEl(){return document.getElementById('inpHero')||(contentEl()?contentEl().querySelector(':scope>section.hero'):null)}
  function hdrEl(){return document.querySelector('#inpHero>header.topbar,#exStuckHost>header.topbar,.main>header.topbar,header.topbar')}

  function ensureHeroStructure(){
    var hero=heroEl();if(!hero)return null;
    if(!hero.id)hero.id='inpHero';
    if(!document.getElementById('inpHeroSpacer')){
      var sp=document.createElement('div');
      sp.id='inpHeroSpacer';sp.setAttribute('aria-hidden','true');sp.hidden=true;
      hero.insertBefore(sp,hero.firstChild);
    }
    if(!hero.querySelector('.inp-hero-txt')){
      var txt=document.createElement('div');txt.className='inp-hero-txt';
      var ey=document.createElement('div');ey.className='inp-hero-ey';
      var sm=hero.querySelector(':scope>small');
      var h1=hero.querySelector(':scope>h1');
      var p=hero.querySelector(':scope>p');
      if(sm)ey.appendChild(sm);
      var pill=document.createElement('span');pill.id='inpHeroPill';pill.className='inp-hero-pill';pill.hidden=true;
      ey.appendChild(pill);
      txt.appendChild(ey);
      if(h1)txt.appendChild(h1);
      if(p)txt.appendChild(p);
      var steps=hero.querySelector(':scope>.steps');
      hero.insertBefore(txt,steps||null);
    }
    if(!document.getElementById('inpIsiDrop')){
      var drop=document.createElement('div');
      drop.id='inpIsiDrop';drop.className='inp-isi-drop';
      drop.innerHTML='<button type="button" class="inp-isi-trig" id="inpIsiBtn" aria-haspopup="menu" aria-expanded="false">'
        +'<span><span class="inp-isi-l">Isi form</span><span class="inp-isi-cur" id="inpIsiCur">Informasi</span></span>'
        +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
        +'</button><div class="inp-isi-menu" id="inpIsiMenu" hidden role="menu"></div>';
      hero.appendChild(drop);
      document.getElementById('inpIsiBtn').addEventListener('click',function(ev){
        ev.stopPropagation();closeProjMenu();
        var m=document.getElementById('inpIsiMenu'),d=document.getElementById('inpIsiDrop'),open=m.hidden;
        m.hidden=!open;d.classList.toggle('open',open);this.setAttribute('aria-expanded',String(open));
      });
      document.addEventListener('click',function(ev){if(!ev.target.closest('#inpIsiDrop'))closeIsiMenu()});
    }
    return hero;
  }

  function closeProjMenu(){
    var pw=document.getElementById('inpProjWrap'),pop=document.getElementById('inpProjPop'),btn=document.getElementById('inpProjBtn');
    if(pop)pop.hidden=true;if(pw)pw.classList.remove('open');if(btn)btn.setAttribute('aria-expanded','false');
  }
  function closeIsiMenu(){
    var dw=document.getElementById('inpIsiDrop'),m=document.getElementById('inpIsiMenu'),b=document.getElementById('inpIsiBtn');
    if(m)m.hidden=true;if(dw)dw.classList.remove('open');if(b)b.setAttribute('aria-expanded','false');
  }

  function nativeSel(){return document.getElementById('projectSelect')}
  function ctxNativeSel(){return document.getElementById(PAGE_MODE==='monthly'?'monthSelect':'weekSelect')}

  function projectItems(){
    if(PAGE_MODE==='project'){
      var btns=Array.prototype.slice.call(document.querySelectorAll('#projectList .pitem'));
      return btns.map(function(b){
        var nmEl=b.querySelector('b'),metaEl=b.querySelector('small');
        return {
          id:b.getAttribute('data-id')||'',
          name:nmEl?String(nmEl.textContent||'').trim():'',
          meta:metaEl?String(metaEl.textContent||'').trim():'',
          selected:b.classList.contains('on'),
          pick:function(){
            var editBtn=document.getElementById('modeEdit');
            if(editBtn&&!editBtn.classList.contains('on'))editBtn.click();
            b.click();
          }
        };
      });
    }
    var sel=nativeSel();
    if(!sel)return [];
    return Array.prototype.slice.call(sel.options).map(function(o){
      return {
        id:o.value,
        name:String(o.textContent||'').trim(),
        meta:'',
        selected:!!o.selected,
        pick:function(){
          sel.value=o.value;
          try{sel.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){if(typeof sel.onchange==='function')sel.onchange()}
        }
      };
    });
  }

  function syncProjMenu(){
    var items=projectItems(),btn=document.getElementById('inpProjBtn'),nm=document.getElementById('inpProjName'),pop=document.getElementById('inpProjPop');
    if(!btn||!nm||!pop)return;
    btn.classList.toggle('single',items.length<1);
    if(PAGE_MODE==='project'){
      var modeNewBtn=document.getElementById('modeNew');
      var isNew=modeNewBtn&&modeNewBtn.classList.contains('on');
      var act=items.find(function(x){return x.selected});
      var fn=document.getElementById('fName');
      nm.textContent=isNew?((fn&&fn.value.trim())||'Proyek baru'):(act?act.name:(items.length?'Pilih proyek…':'Memuat…'));
    }else{
      var act2=items.find(function(x){return x.selected})||items[0];
      nm.textContent=act2?act2.name:'Memuat…';
    }
    var qEl=pop.querySelector('.inp-pop-q');
    if(!qEl&&items.length>=6){
      qEl=document.createElement('input');
      qEl.type='search';qEl.className='inp-pop-q';qEl.placeholder='Cari proyek…';
      qEl.addEventListener('input',syncProjListOnly);
      qEl.addEventListener('click',function(ev){ev.stopPropagation()});
      pop.appendChild(qEl);
    }
    syncProjListOnly();
  }

  function syncProjListOnly(){
    var pop=document.getElementById('inpProjPop');if(!pop)return;
    var items=projectItems(),qEl=pop.querySelector('.inp-pop-q');
    var q=qEl?String(qEl.value||'').toLowerCase().trim():'';
    Array.prototype.slice.call(pop.querySelectorAll('.inp-pop-opt')).forEach(function(x){x.remove()});
    items.forEach(function(it){
      if(q&&(it.name+' '+it.meta).toLowerCase().indexOf(q)<0)return;
      var b=document.createElement('button');
      b.type='button';b.className='inp-pop-opt'+(it.selected?' on':'');
      b.innerHTML='<span>'+esc(it.name)+'</span>'+(it.meta?'<small>'+esc(it.meta.split(' · ')[0])+'</small>':'');
      b.onclick=function(){closeProjMenu();it.pick()};
      pop.appendChild(b);
    });
  }

  function syncCtxControls(){
    if(PAGE_MODE==='project'){
      var mn=document.getElementById('modeNew'),me=document.getElementById('modeEdit');
      var bN=document.getElementById('inpModeNew'),bE=document.getElementById('inpModeEdit');
      if(bN&&mn){
        bN.hidden=mn.style.display==='none';
        bN.classList.toggle('on',mn.classList.contains('on'));
      }
      if(bE&&me)bE.classList.toggle('on',me.classList.contains('on'));
      return;
    }
    var src=ctxNativeSel(),dst=document.getElementById('inpCtxSel'),prev=document.getElementById('inpCtxPrev'),next=document.getElementById('inpCtxNext');
    if(!src||!dst)return;
    var sig=Array.prototype.map.call(src.options,function(o){return o.value+'|'+o.textContent}).join('||');
    if(dst.getAttribute('data-sig')!==sig){
      dst.setAttribute('data-sig',sig);
      dst.innerHTML=Array.prototype.map.call(src.options,function(o){
        return '<option value="'+esc(o.value)+'">'+esc(o.textContent)+'</option>';
      }).join('');
    }
    if(dst.value!==src.value)dst.value=src.value;
    var idx=src.selectedIndex,len=src.options.length;
    if(prev)prev.disabled=idx>=len-1||len<2;
    if(next)next.disabled=idx<=0||len<2;
  }

  function syncIsiMenu(){
    var hero=heroEl();if(!hero)return;
    var links=Array.prototype.slice.call(hero.querySelectorAll('.steps a'));
    var menu=document.getElementById('inpIsiMenu'),curEl=document.getElementById('inpIsiCur');
    if(!menu||!curEl)return;
    var visLinks=links.filter(function(a){
      var m=String(a.getAttribute('href')||'').match(/^#([A-Za-z0-9_-]+)/);
      if(!m)return true;
      var sec=document.getElementById(m[1]);
      return !sec||!sec.hidden;
    });
    if(!visLinks.length)return;
    menu.innerHTML='';
    visLinks.forEach(function(a,i){
      var num=a.querySelector('b')?a.querySelector('b').textContent:String(i+1);
      var lbl=String(a.textContent||'').replace(/^\s*\d+\s*/,'').trim();
      var b=document.createElement('button');
      b.type='button';
      b.innerHTML='<b>'+esc(num)+'</b><span>'+esc(lbl)+'</span>';
      b.onclick=function(){
        closeIsiMenu();
        curEl.textContent=lbl;
        a.click();
      };
      menu.appendChild(b);
    });
    if(!curEl.textContent||curEl.textContent==='Informasi'){
      curEl.textContent=String(visLinks[0].textContent||'').replace(/^\s*\d+\s*/,'').trim();
    }
  }

  function syncHeroMeta(){
    syncProjMenu();
    syncCtxControls();
    syncIsiMenu();

    var pill=document.getElementById('inpHeroPill');
    var mb=document.getElementById('modeBadge');
    if(pill&&mb&&String(mb.textContent||'').trim()){
      pill.hidden=false;
      pill.textContent=mb.textContent.trim();
      pill.className='inp-hero-pill'+(mb.classList.contains('b-upd')?' warn':mb.classList.contains('b-ok')?' ok':'');
    }

    var stuckT=document.getElementById('inpStuckTitle'),hp=document.getElementById('heroProject');
    if(stuckT){
      var baseTitle=PAGE_MODE==='monthly'?'Input Progress Bulanan':(PAGE_MODE==='project'?'Tambah / Edit Proyek':'Input Progress Mingguan');
      var pj=(hp&&String(hp.textContent||'').trim())||'';
      stuckT.textContent=pj&&pj!=='Proyek'?baseTitle+' · '+pj:baseTitle;
    }
    var stuckSub=document.getElementById('inpStuckSub');
    if(stuckSub){
      stuckSub.textContent=PAGE_MODE==='monthly'?'Monthly Project Report':(PAGE_MODE==='project'?'Project Setup':'Weekly Project Report');
    }
  }

  function ensureSpacerBeforeActions(hdr){
    var sp=document.getElementById('inpTopSpacer');
    if(!sp){sp=document.createElement('span');sp.id='inpTopSpacer';sp.className='inp-top-sp';}
    var anchor=hdr.querySelector('.pmo-qs-trigger,.ntf-wrap,.account-wrap,.acm-wrap,.userchip');
    if(anchor){if(sp.nextElementSibling!==anchor)hdr.insertBefore(sp,anchor);}
    else if(sp.parentNode!==hdr)hdr.appendChild(sp);
  }

  function ensureControls(hdr){
    if(!hdr)return;
    if(!hdr.querySelector('.inp-stuck-t')){
      var st=document.createElement('div');st.className='inp-stuck-t';
      st.innerHTML='<small id="inpStuckSub">Input &amp; Data Proyek</small><b id="inpStuckTitle">Input Progress</b>';
      var cr=hdr.querySelector('.crumbs');
      if(cr&&cr.nextSibling)hdr.insertBefore(st,cr.nextSibling);else hdr.insertBefore(st,hdr.firstChild);
    }
    if(!document.getElementById('inpProjWrap')){
      var pw=document.createElement('div');pw.id='inpProjWrap';pw.className='inp-proj-wrap';
      pw.innerHTML='<button type="button" class="inp-gl-btn" id="inpProjBtn" aria-haspopup="true" aria-expanded="false">'
        +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6"/></svg>'
        +'<span><span class="inp-pl">Proyek Aktif</span><span class="inp-pn" id="inpProjName">Memuat…</span></span>'
        +'<svg class="inp-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
        +'</button><div class="inp-pop" id="inpProjPop" hidden></div>';
      var st2=hdr.querySelector('.inp-stuck-t');
      if(st2&&st2.nextSibling)hdr.insertBefore(pw,st2.nextSibling);else hdr.appendChild(pw);
      var btn=document.getElementById('inpProjBtn'),pop=document.getElementById('inpProjPop');
      btn.addEventListener('click',function(ev){
        ev.stopPropagation();closeIsiMenu();
        if(btn.classList.contains('single'))return;
        var open=pop.hidden;
        if(open){syncProjMenu();pop.hidden=false;pw.classList.add('open');btn.setAttribute('aria-expanded','true');var q=pop.querySelector('.inp-pop-q');if(q){q.value='';syncProjListOnly();setTimeout(function(){q.focus()},20);}}
        else closeProjMenu();
      });
      document.addEventListener('click',function(ev){if(!ev.target.closest('#inpProjWrap'))closeProjMenu()});
    }
    if(PAGE_MODE==='project'){
      if(!document.getElementById('inpModeSeg')){
        var seg=document.createElement('nav');seg.id='inpModeSeg';seg.className='inp-mode-seg';seg.setAttribute('aria-label','Mode Proyek');
        seg.innerHTML='<button type="button" id="inpModeNew">+ Proyek baru</button><button type="button" id="inpModeEdit">Proyek sudah ada</button>';
        seg.querySelector('#inpModeNew').onclick=function(){var mn=document.getElementById('modeNew');if(mn)mn.click()};
        seg.querySelector('#inpModeEdit').onclick=function(){var me=document.getElementById('modeEdit');if(me)me.click()};
        var pw2=document.getElementById('inpProjWrap');
        if(pw2&&pw2.nextSibling)hdr.insertBefore(seg,pw2.nextSibling);else hdr.appendChild(seg);
      }
    }else if(!document.getElementById('inpCtxPick')){
      var cp=document.createElement('div');cp.id='inpCtxPick';cp.className='inp-ctx-pick';
      cp.innerHTML='<button type="button" class="inp-arr" id="inpCtxPrev" title="Sebelumnya" aria-label="Sebelumnya"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 18l-6-6 6-6"/></svg></button>'
        +'<select id="inpCtxSel" aria-label="'+(PAGE_MODE==='monthly'?'Bulan laporan':'Periode Week')+'"></select>'
        +'<button type="button" class="inp-arr" id="inpCtxNext" title="Berikutnya" aria-label="Berikutnya"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 18l6-6-6-6"/></svg></button>';
      var pw3=document.getElementById('inpProjWrap');
      if(pw3&&pw3.nextSibling)hdr.insertBefore(cp,pw3.nextSibling);else hdr.appendChild(cp);
      var sel=cp.querySelector('#inpCtxSel');
      var pickIdx=function(idx){
        var src=ctxNativeSel();if(!src||idx<0||idx>=src.options.length)return;
        src.selectedIndex=idx;
        try{src.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){if(typeof src.onchange==='function')src.onchange()}
      };
      sel.addEventListener('change',function(){
        var src=ctxNativeSel();if(!src)return;
        src.value=sel.value;
        try{src.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){if(typeof src.onchange==='function')src.onchange()}
      });
      cp.querySelector('#inpCtxPrev').addEventListener('click',function(){var src=ctxNativeSel();if(src)pickIdx(src.selectedIndex+1)});
      cp.querySelector('#inpCtxNext').addEventListener('click',function(){var src=ctxNativeSel();if(src)pickIdx(src.selectedIndex-1)});
    }
    ensureSpacerBeforeActions(hdr);
    if(!hdr.__inpObs&&window.MutationObserver){
      hdr.__inpObs=true;
      new MutationObserver(function(){ensureSpacerBeforeActions(hdr)}).observe(hdr,{childList:true});
    }
  }

  function ensureStuckNodes(mainEl){
    var host=document.getElementById('exStuckHost');
    if(!host&&mainEl){host=document.createElement('div');host.id='exStuckHost';host.hidden=true;mainEl.insertBefore(host,mainEl.firstChild)}
    return {host:host,hSp:document.getElementById('inpHeroSpacer')};
  }

  function syncStuckRect(){
    var mainEl=document.querySelector('.main'),host=document.getElementById('exStuckHost');
    if(!mainEl||!host)return;
    host.style.setProperty('--ex-stuck-left',Math.max(0,Math.round(mainEl.getBoundingClientRect().left))+'px');
  }

  function clearStuckState(nodes){
    clearTimeout(stuckTimer);
    document.documentElement.classList.remove('ex-hdr-stuck','ex-hdr-mounted');
    if(nodes.hSp){nodes.hSp.hidden=true;nodes.hSp.style.height='0px'}
    if(nodes.host&&!nodes.host.hidden)nodes.host.hidden=true;
    var isi=document.getElementById('inpIsiDrop'),hero=heroEl();
    if(isi&&hero&&isi.parentNode!==hero)hero.appendChild(isi);
  }

  function restoreInHero(hdr,hero,nodes){
    clearStuckState(nodes);
    if(hdr&&hero&&hdr.parentNode!==hero)hero.insertBefore(hdr,hero.firstChild);
    var isi=document.getElementById('inpIsiDrop');
    if(isi&&hero&&isi.parentNode!==hero)hero.appendChild(isi);
  }

  function syncScrollHeader(){
    var H=document.documentElement;if(!H.classList.contains('ex-hero-hdr'))return;
    var hero=heroEl(),mainEl=document.querySelector('.main')||document.body,hdr=hdrEl();
    if(!hero||!hdr)return;
    var nodes=ensureStuckNodes(mainEl);
    syncStuckRect();
    var rect=hero.getBoundingClientRect(),wasStuck=H.classList.contains('ex-hdr-stuck');
    var wantStuck=wasStuck?(rect.bottom<104):(rect.bottom<58);
    var isi=document.getElementById('inpIsiDrop');

    if(wantStuck){
      if(!wasStuck){
        clearTimeout(stuckTimer);
        if(hdr.parentNode===hero&&nodes.hSp){
          nodes.hSp.style.height=Math.max(48,hdr.offsetHeight+12)+'px';
          nodes.hSp.hidden=false;H.classList.add('ex-hdr-mounted');
        }
        nodes.host.hidden=false;
        if(hdr.parentNode!==nodes.host)nodes.host.appendChild(hdr);
        if(isi){
          var anchor=hdr.querySelector('.pmo-qs-trigger,.ntf-wrap,.account-wrap,.acm-wrap,.userchip');
          if(anchor)hdr.insertBefore(isi,anchor);else hdr.appendChild(isi);
        }
        void nodes.host.offsetHeight;
        H.classList.add('ex-hdr-stuck');
      }
    }else if(wasStuck){
      H.classList.remove('ex-hdr-stuck');
      clearTimeout(stuckTimer);
      stuckTimer=setTimeout(function(){if(!H.classList.contains('ex-hdr-stuck'))restoreInHero(hdr,hero,nodes)},300);
    }else{
      restoreInHero(hdr,hero,nodes);
    }
  }

  function syncUnifiedHeader(){
    var H=document.documentElement,hero=ensureHeroStructure(),mainEl=document.querySelector('.main')||document.body,hdr=hdrEl();
    if(!hero||!hdr)return;
    var mob=window.innerWidth<=900||H.classList.contains('m-mode');
    if(mob){
      H.classList.remove('ex-hero-hdr');
      clearStuckState({host:document.getElementById('exStuckHost'),hSp:document.getElementById('inpHeroSpacer')});
      if(hdr.parentNode!==mainEl)mainEl.insertBefore(hdr,mainEl.firstChild);
      return;
    }
    H.classList.add('ex-hero-hdr');
    ensureControls(hdr);syncHeroMeta();syncScrollHeader();
  }

  function schedSync(){if(!syncRaf)syncRaf=requestAnimationFrame(function(){syncRaf=0;syncUnifiedHeader()})}
  function schedMeta(){if(!metaRaf)metaRaf=requestAnimationFrame(function(){metaRaf=0;syncHeroMeta()})}

  window.addEventListener('scroll',function(){if(document.documentElement.classList.contains('ex-hero-hdr'))syncScrollHeader()},{passive:true});
  window.addEventListener('resize',schedSync,{passive:true});
  var sideNode=document.querySelector('aside.side');
  if(sideNode&&window.ResizeObserver){try{new ResizeObserver(syncStuckRect).observe(sideNode)}catch(e){}}

  ['projectSelect','weekSelect','monthSelect','projectList','modeBadge','heroProject','modeNew','modeEdit','sec-life','form','fName'].forEach(function(id){
    var el=document.getElementById(id);
    if(el&&window.MutationObserver)new MutationObserver(schedMeta).observe(el,{childList:true,characterData:true,subtree:true,attributes:true});
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',syncUnifiedHeader);
  else syncUnifiedHeader();
  setTimeout(syncHeroMeta,450);
  setTimeout(syncHeroMeta,1200);
})();
</script>`;

const INPUT_HERO_PATCHES = [
  { file: 'InputProgress', find: '</head>', replace: INPUT_HERO_CSS + '\n</head>' },
  { file: 'InputProgress', find: '</body>', replace: INPUT_HERO_JS + '\n</body>' },
  { file: 'MonthlyReport', find: '</head>', replace: INPUT_HERO_CSS + '\n</head>' },
  { file: 'MonthlyReport', find: '</body>', replace: INPUT_HERO_JS + '\n</body>' },
  { file: 'ProjectSetup', find: '</head>', replace: INPUT_HERO_CSS + '\n</head>' },
  { file: 'ProjectSetup', find: '</body>', replace: INPUT_HERO_JS + '\n</body>' },
];

module.exports = { INPUT_HERO_PATCHES };

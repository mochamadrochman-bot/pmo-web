'use strict';

/**
 * EPCC Control (Desktop) · Engineering, Procurement, Construction, & Commissioning.
 * - Menerapkan 1 Unified Hero Banner tematik per bidang EPCC:
 *   ENG  -> /media/epcc-eng-banner.jpg
 *   PROC -> /media/epcc-proc-banner.jpg
 *   CONS -> /media/epcc-cons-banner.jpg
 *   COM  -> /media/epcc-com-banner.jpg
 * - Otomatis menyesuaikan 4 tema dashboard (Biru, Sage, Mocha, Gelap) termasuk
 *   warna batang progres (--c2, --s1) dan badge status.
 * - Baris 1 HUD selalu sejajar 1 baris rapi (Pemilih Proyek Modern HUD,
 *   4 pill bidang EPCC, Cari Ctrl K, Notifikasi, Profil) + sticky bar #exStuckHost.
 * - Baris 2 kanan menyediakan dropdown frosted-glass "Isi halaman" dinamis.
 * - Mobile (<= 900px / html.m-mode) dikembalikan ke layout standar.
 */

const EPCC_HERO_CSS = String.raw`<style id="pmoEpcHeroCss">
html.ex-hero-hdr{
  --ex-stuck-top:#0B3A66;--ex-stuck-menu:#093157;--ex-stuck-act:#1E6FC0;
  --pri:#0F5FA8;--pri2:#1F6DB3;--pri-ink:#0C5394;--navy:#073B63;
  --c2:#0F5FA8;--c1:#4A94D1;--s1:#9BC7EA;--s2:#4A94D1;
}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]){
  --ex-stuck-top:#0F2A1D;--ex-stuck-menu:#123022;--ex-stuck-act:#375534;
  --pri:#375534;--pri2:#6B9071;--pri-ink:#2C4A2A;--navy:#0F2A1D;
  --c2:#375534;--c1:#6B9071;--s1:#C2D9BE;--s2:#6B9071;
}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]){
  --ex-stuck-top:#3B2A1F;--ex-stuck-menu:#2D1F17;--ex-stuck-act:#6F4E37;
  --pri:#6F4E37;--pri2:#B08968;--pri-ink:#5D3E29;--navy:#3B2A1F;
  --c2:#6F4E37;--c1:#B08968;--s1:#DFCBB2;--s2:#B08968;
}
html.ex-hero-hdr[data-theme="dark"]{
  --ex-stuck-top:#0f172a;--ex-stuck-menu:#111c33;--ex-stuck-act:#1f6db3;
  --bg:#0E1A27;--card:#152435;--tint:#1A2C3F;--ink:#E3ECF4;--muted:#9BB0C3;--line:#263B4F;
  --pri:#1F6DB3;--pri2:#38BDF8;--pri-ink:#8FCAF6;--navy:#D9ECFA;--soft:#1B3550;
  --c2:#1F6DB3;--c1:#5FA6E0;--s1:#3F6F97;--s2:#5FA6E0;
}

/* Ruang utama & Hero Banner (#epcHero: tidak menyentuh .hero empty-state di dalam #tab-* atau #view) */
html.ex-hero-hdr main.wrap{max-width:1540px!important;padding-top:14px!important}
#epcHero{display:none}
#epcHeroSpacer{display:none;grid-column:1 / -1;grid-row:1;flex:none}
html.ex-hero-hdr.ex-hdr-mounted #epcHeroSpacer{display:block}

html.ex-hero-hdr main.wrap>#epcHero{
  position:relative;overflow:visible!important;z-index:34;
  display:grid!important;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;
  align-items:end;justify-items:stretch;text-align:left;column-gap:16px;
  padding:12px 24px 18px;min-height:164px;border:0!important;
  border-radius:var(--r,16px);margin:0 0 14px;color:#fff;
  background-color:#073b63;background-size:cover;background-position:center 50%;
  box-shadow:0 12px 30px rgba(8,24,42,.18);
  transition:background-image .25s ease;
}
html.ex-hero-hdr main.wrap>#epcHero[data-epc-fld="ENG"]{
  background-image:url('/media/epcc-eng-banner.jpg');background-position:center 62%;
}
html.ex-hero-hdr main.wrap>#epcHero[data-epc-fld="PROC"]{
  background-image:url('/media/epcc-proc-banner.jpg');background-position:center 58%;
}
html.ex-hero-hdr main.wrap>#epcHero[data-epc-fld="CONS"]{
  background-image:url('/media/epcc-cons-banner.jpg');background-position:center 44%;
}
html.ex-hero-hdr main.wrap>#epcHero[data-epc-fld="COM"]{
  background-image:url('/media/epcc-com-banner.jpg');background-position:center 48%;
}
html.ex-hero-hdr main.wrap>#epcHero::before{
  content:"";position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:0;
  background:linear-gradient(96deg,rgba(7,26,46,.95) 0%,rgba(11,54,96,.82) 56%,rgba(8,28,50,.48) 100%);
  box-shadow:inset 0 68px 54px -26px rgba(0,0,0,.44);
}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]) main.wrap>#epcHero::before{
  background:linear-gradient(98deg,rgba(15,42,29,.95) 0%,rgba(31,58,38,.82) 52%,rgba(55,85,52,.44) 100%)!important;
}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]) main.wrap>#epcHero::before{
  background:linear-gradient(98deg,rgba(54,37,27,.95) 0%,rgba(82,58,41,.82) 52%,rgba(111,78,55,.44) 100%)!important;
}
html.ex-hero-hdr[data-theme="dark"] main.wrap>#epcHero::before{
  background:linear-gradient(96deg,rgba(9,14,24,.96) 0%,rgba(15,23,42,.84) 56%,rgba(9,14,24,.54) 100%)!important;
}
html.ex-hero-hdr :is(#epcHero,#exStuckHost):has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden]),.epc-proj-wrap.open,.epc-isi-drop.open){z-index:150!important}

/* Sembunyikan bilah lama, breadcrumb nav-theme, & judul stuck saat berada di dalam #epcHero */
html.ex-hero-hdr #projSel,
html.ex-hero-hdr #content>.bar,
html.ex-hero-hdr #pmoPbar,
html.ex-hero-hdr header.top .t,
html.ex-hero-hdr #epcHero .epc-stuck-t{display:none!important}

/* Baris 1 Hero & Sticky Header */
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top{
  position:relative!important;top:auto!important;z-index:40!important;
  background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  border-bottom:1px solid rgba(255,255,255,.16)!important;gap:8px;flex-wrap:wrap;
}
html.ex-hero-hdr #epcHero>header.top{grid-column:1 / -1;grid-row:1;padding:0 0 10px 0!important;margin:0 0 12px 0!important}
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .epc-top-sp{flex:1;min-width:8px}
html.ex-hero-hdr #exStuckHost header.top .epc-top-sp{display:none}

/* Glass Controls inside Hero & Stuck Host */
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .icon-btn,
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .ntf-wrap>button,
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .pmo-qs-trigger,
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .acm-chip,
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .epc-gl-btn,
html.ex-hero-hdr :is(#epcHero,#exStuckHost) .epc-isi-trig{
  height:38px;background:rgba(255,255,255,.13)!important;border:1px solid rgba(255,255,255,.28)!important;
  color:#fff!important;box-shadow:none!important;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
}
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .icon-btn{width:38px;border-radius:11px}
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .icon-btn:hover,
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .ntf-wrap>button:hover,
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .pmo-qs-trigger:hover,
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .acm-chip:hover,
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .epc-gl-btn:hover,
html.ex-hero-hdr :is(#epcHero,#exStuckHost) .epc-isi-trig:hover,
html.ex-hero-hdr :is(#epcHero,#exStuckHost) .epc-isi-drop.open .epc-isi-trig{
  background:rgba(255,255,255,.22)!important;border-color:rgba(255,255,255,.46)!important;
}
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .acm-chip .acm-t b,
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .acm-chip .acm-t small,
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .acm-chip .acm-caret,
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .pmo-qs-trigger *,
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .ntf-wrap>button svg,
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .icon-btn svg{color:#fff!important}
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top .pmo-qs-trigger kbd{
  background:rgba(255,255,255,.16)!important;border-color:rgba(255,255,255,.32)!important;color:#fff!important;
}
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top :is(.ntf-wrap,.account-wrap,.acm-wrap,.epc-proj-wrap){position:relative;z-index:25}
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top :is(.ntf-wrap,.account-wrap,.acm-wrap,.epc-proj-wrap):has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden]),.epc-pop:not([hidden])){z-index:55}
html.ex-hero-hdr :is(#epcHero,#exStuckHost) header.top :is(.pop,.acm-pop,.ntf-pop){background:var(--card,#fff);color:var(--ink,#132b43);z-index:160!important}

/* Project HUD Selector */
.epc-proj-wrap{display:none}
html.ex-hero-hdr #epcHero header.top .epc-proj-wrap{display:inline-flex;align-items:center}
html.ex-hero-hdr #exStuckHost .epc-proj-wrap{display:none!important}
.epc-gl-btn{
  display:inline-flex;align-items:center;gap:8px;padding:0 12px;border-radius:11px;
  font:600 12.5px/1.2 inherit;cursor:pointer;max-width:270px;
}
.epc-gl-btn .epc-pl{font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:rgba(219,234,254,.84);display:block;line-height:1}
.epc-gl-btn .epc-pn{display:block;font-size:12px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:185px;text-align:left}
.epc-gl-btn svg{width:14px;height:14px;flex:none;opacity:.9}
.epc-gl-btn.single svg.epc-chev{display:none}

html.ex-hero-hdr .epc-proj-wrap .epc-pop{
  position:absolute;left:0;top:calc(100% + 8px);width:min(350px,calc(100vw - 32px));
  background:rgba(16,25,39,.96);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  border:1px solid rgba(255,255,255,.15);border-radius:16px;box-shadow:0 24px 54px rgba(3,8,18,.62);
  color:#f1f5f9;padding:10px;z-index:160!important;display:grid;gap:4px;max-height:min(360px,62vh);overflow:auto;
}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]) .epc-proj-wrap .epc-pop{background:rgba(15,38,26,.96)}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]) .epc-proj-wrap .epc-pop{background:rgba(44,30,21,.96)}
.epc-pop[hidden]{display:none!important}
.epc-pop-q{
  width:100%;height:36px;padding:0 11px;border-radius:9px;margin-bottom:6px;
  border:1px solid rgba(255,255,255,.16);background:rgba(6,12,22,.56);color:#f1f5f9;font:500 13px/1.2 inherit;
}
.epc-pop-q:focus{outline:0;border-color:rgba(125,211,252,.7)}
.epc-pop-opt{
  display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:38px;
  padding:8px 11px;border:1px solid transparent;border-radius:10px;background:transparent;
  color:#f1f5f9;font:600 13px/1.3 inherit;text-align:left;cursor:pointer;
}
.epc-pop-opt:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.14)}
.epc-pop-opt.on{background:rgba(30,111,192,.36);border-color:rgba(125,211,252,.45)}

/* 4-Discipline Segmented Switch inside HUD */
.epc-seg-nav{
  display:inline-flex;align-items:center;padding:3px;border-radius:11px;gap:2px;
  background:rgba(8,18,32,.44);border:1px solid rgba(255,255,255,.24);backdrop-filter:blur(8px);
}
.epc-seg-nav button{
  height:30px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:rgba(255,255,255,.86);
  font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;
  transition:background .14s,color .14s;
}
.epc-seg-nav button:hover{background:rgba(255,255,255,.12);color:#fff}
.epc-seg-nav button.on{background:#fff;color:#073b63;box-shadow:0 2px 8px rgba(0,0,0,.18)}
html[data-accent="sage"]:not([data-theme="dark"]) .epc-seg-nav button.on{color:#0F2A1D}
html[data-accent="mocha"]:not([data-theme="dark"]) .epc-seg-nav button.on{color:#3B2A1F}
.epc-seg-nav .epc-dot{width:7px;height:7px;border-radius:50%;display:inline-block;flex:none}
@media (max-width:1180px){
  .epc-seg-nav button span.epc-fn{display:inline}
  .epc-seg-nav button{padding:0 8px;font-size:11.5px}
}

/* Row 2 Hero Typography & Meta Pills */
html.ex-hero-hdr #epcHero .epc-hero-txt{grid-column:1;grid-row:2;position:relative;min-width:0;z-index:5}
.epc-hero-ey{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px;font-size:12px;font-weight:600;color:#cbe6fb}
.epc-hero-pill{
  display:inline-flex;align-items:center;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700;
  background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.28);color:#e0f2fe;white-space:nowrap;
}
.epc-hero-pill.ok{background:rgba(79,209,160,.22);border-color:rgba(110,231,183,.45);color:#a7f3d0}
html.ex-hero-hdr #epcHero h1{
  margin:0 0 5px;font-size:clamp(22px,2.4vw,30px);line-height:1.12;font-weight:800;letter-spacing:-.02em;color:#fff!important;
}
html.ex-hero-hdr #epcHero h1 span{color:#7dd3fc}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]) #epcHero h1 span{color:#bce39a}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]) #epcHero h1 span{color:#f3cb99}
html.ex-hero-hdr #epcHero .epc-hero-sub{margin:0;color:#dcecf7!important;font-size:13px;max-width:74ch;line-height:1.45}

/* Row 2 Right: Isi Halaman Frosted Glass Dropdown */
.epc-isi-drop{position:relative;display:none}
html.ex-hero-hdr #epcHero .epc-isi-drop,
html.ex-hero-hdr #exStuckHost .epc-isi-drop{display:inline-block}
html.ex-hero-hdr #epcHero>.epc-isi-drop{grid-column:2;grid-row:2;align-self:end;justify-self:end;z-index:15}
.epc-isi-trig{
  display:inline-flex;align-items:center;gap:10px;padding:0 13px;border-radius:11px;cursor:pointer;text-align:left;
}
.epc-isi-l{display:block;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:rgba(219,234,254,.84);font-weight:700;line-height:1}
.epc-isi-cur{display:block;font-size:12.5px;font-weight:700;color:#fff;line-height:1.25}
.epc-isi-trig svg{width:14px;height:14px;opacity:.92;flex:none}
.epc-isi-menu{
  position:absolute;top:calc(100% + 8px);right:0;min-width:230px;padding:6px;border-radius:13px;
  background:var(--card,#fff);border:1px solid var(--line,#dce4ee);color:var(--ink,#132b43);
  box-shadow:0 18px 40px rgba(8,24,42,.26);z-index:165;display:grid;gap:2px;
}
.epc-isi-menu[hidden]{display:none!important}
.epc-isi-menu button{
  display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:9px 12px;
  border:0;border-radius:9px;background:transparent;color:inherit;font:600 12.5px/1.25 inherit;text-align:left;cursor:pointer;
}
.epc-isi-menu button:hover,.epc-isi-menu button.on{background:var(--soft,#e8f3fb);color:var(--pri-ink,#0c5394);font-weight:700}

/* Sticky Scroll Bar */
#exStuckHost{
  position:fixed;top:0;right:0;left:var(--ex-stuck-left,0);z-index:48;
  background:var(--ex-stuck-top);color:#fff;box-shadow:0 10px 28px rgba(0,0,0,.24);
  border-bottom:1px solid rgba(255,255,255,.14);
  transform:translate3d(0,-104%,0);opacity:0;pointer-events:none;
  transition:transform .38s cubic-bezier(.22,1,.36,1),opacity .30s ease,background-color .30s ease;
}
#exStuckHost:has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden]),.epc-isi-drop.open){z-index:160!important}
html.ex-hero-hdr.ex-hdr-stuck #exStuckHost{transform:none;opacity:1;pointer-events:auto}
#exStuckHost[hidden]{display:none!important}
#exStuckHost header.top{max-width:1600px;margin:0 auto!important;padding:8px 24px!important;min-height:0!important;border-bottom:0!important;align-items:center}
#exStuckHost .epc-stuck-t{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1;padding-right:10px}
#exStuckHost .epc-stuck-t small{font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,255,255,.72);font-weight:700;line-height:1.1}
#exStuckHost .epc-stuck-t b{font-size:14.5px;color:#fff;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
#exStuckHost .epc-isi-menu{background:var(--ex-stuck-menu);border-color:rgba(255,255,255,.18);color:#fff}
#exStuckHost .epc-isi-menu button:hover{background:rgba(255,255,255,.12);color:#fff}
#exStuckHost .epc-isi-menu button.on{background:var(--ex-stuck-act);color:#fff}

/* Proteksi Z-Index Modal, Toast & Busy Loader */
html.ex-hero-hdr .modal{z-index:320!important}
html.ex-hero-hdr .busy{z-index:330!important}
html.ex-hero-hdr .toast{z-index:340!important}

@media (max-width:900px){
  #epcHero,#exStuckHost{display:none!important}
}
</style>`;

const EPCC_HERO_JS = String.raw`<script id="pmoEpcHeroJs">
(function(){
  if(window.__pmoEpcHeroInit)return;window.__pmoEpcHeroInit=true;
  var stuckTimer=0,syncRaf=0,metaRaf=0;

  var FLDS=[
    {c:'ENG',nm:'Engineering',dot:'#4a94d1',sub:'Pantau jadwal dan realisasi dokumen desain rekayasa (IFR, IFA, IFC), kelola daftar dokumen (EDL), dan arsip berkas final.'},
    {c:'PROC',nm:'Procurement',dot:'#16875d',sub:'Monitoring status pengadaan material & peralatan, pelacakan tahap PO hingga tiba di lokasi (MOS), serta jadwal item long-lead.'},
    {c:'CONS',nm:'Construction',dot:'#d6a014',sub:'Pantau progres pekerjaan konstruksi di lapangan, kurva S mingguan, diagram Gantt bertingkat, dan aktivitas lintasan kritis (CPM).'},
    {c:'COM',nm:'Commissioning',dot:'#b07cc6',sub:'Lacak kesiapan sistem dan sub-sistem dari pre-commissioning hingga uji kinerja, daftar material, dan penyelesaian punch list.'}
  ];

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]})}
  function wrapEl(){return document.querySelector('.main>main.wrap')||document.querySelector('main.wrap')}
  function heroEl(){return document.getElementById('epcHero')}
  function isEngPage(){return !!document.getElementById('tab-sum')}

  function curField(){
    if(isEngPage())return 'ENG';
    var onFld=document.querySelector('aside.side .nav.sub[data-field].on');
    if(onFld)return onFld.getAttribute('data-field')||'PROC';
    try{
      var p=new URLSearchParams(location.search);
      var f=String(p.get('field')||'').toUpperCase();
      if(f==='PROC'||f==='CONS'||f==='COM')return f;
      var pg=String(p.get('page')||'').toLowerCase();
      if(pg==='construction')return 'CONS';
      if(pg==='commissioning')return 'COM';
    }catch(e){}
    return 'PROC';
  }

  function fldInfo(code){return FLDS.find(function(x){return x.c===code})||FLDS[0]}

  function goField(code){
    var cur=curField();
    if(code===cur)return;
    if(code==='ENG'){
      if(typeof window.pmoGoWithProject==='function')window.pmoGoWithProject('engineering');
      else if(typeof window.go==='function')window.go('engineering');
      return;
    }
    if(!isEngPage()){
      var btn=document.querySelector('aside.side .nav.sub[data-field="'+code+'"]');
      if(btn){
        btn.click();
        try{var u=new URL(location.href);u.searchParams.set('field',code);history.replaceState(history.state,'',u.toString())}catch(e){}
        setTimeout(schedMeta,50);
        return;
      }
    }
    if(typeof window.pmoGoWithProject==='function')window.pmoGoWithProject('epcc&field='+code);
    else if(typeof window.go==='function')window.go('epcc&field='+code);
  }

  function ensureHeroSection(){
    var w=wrapEl();if(!w)return null;
    var hero=heroEl();
    if(!hero){
      hero=document.createElement('section');
      hero.id='epcHero';
      hero.className='epc-hero';
      hero.setAttribute('aria-label','Header EPCC Control');
      hero.innerHTML='<div id="epcHeroSpacer" aria-hidden="true"></div>'
        +'<div class="epc-hero-txt">'
          +'<div class="epc-hero-ey" id="epcHeroEy"><span>EPCC Control</span></div>'
          +'<h1 id="epcHeroH1">EPCC Control</h1>'
          +'<p class="epc-hero-sub" id="epcHeroSub"></p>'
        +'</div>'
        +'<div class="epc-isi-drop" id="epcIsiDrop">'
          +'<button type="button" class="epc-isi-trig" id="epcIsiBtn" aria-haspopup="menu" aria-expanded="false">'
            +'<span><span class="epc-isi-l">Isi halaman</span><span class="epc-isi-cur" id="epcIsiCur">Ringkasan</span></span>'
            +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
          +'</button>'
          +'<div class="epc-isi-menu" id="epcIsiMenu" hidden role="menu"></div>'
        +'</div>';
      w.insertBefore(hero,w.firstChild);

      var isiBtn=document.getElementById('epcIsiBtn'),isiDrop=document.getElementById('epcIsiDrop'),isiMenu=document.getElementById('epcIsiMenu');
      isiBtn.addEventListener('click',function(ev){
        ev.stopPropagation();closeProjMenu();
        var open=isiMenu.hidden;
        isiMenu.hidden=!open;isiDrop.classList.toggle('open',open);isiBtn.setAttribute('aria-expanded',String(open));
      });
      document.addEventListener('click',function(ev){if(!ev.target.closest('#epcIsiDrop'))closeIsiMenu()});
    }
    return hero;
  }

  function closeProjMenu(){
    var pw=document.getElementById('epcProjWrap'),pop=document.getElementById('epcProjPop'),btn=document.getElementById('epcProjBtn');
    if(pop)pop.hidden=true;if(pw)pw.classList.remove('open');if(btn)btn.setAttribute('aria-expanded','false');
  }
  function closeIsiMenu(){
    var dw=document.getElementById('epcIsiDrop'),m=document.getElementById('epcIsiMenu'),b=document.getElementById('epcIsiBtn');
    if(m)m.hidden=true;if(dw)dw.classList.remove('open');if(b)b.setAttribute('aria-expanded','false');
  }

  function syncProjMenu(){
    var sel=document.getElementById('projSel'),btn=document.getElementById('epcProjBtn'),nm=document.getElementById('epcProjName'),pop=document.getElementById('epcProjPop');
    if(!btn||!nm||!pop)return;
    var opts=sel?Array.prototype.slice.call(sel.options):[];
    btn.classList.toggle('single',opts.length<2);
    var actOpt=opts.find(function(o){return o.selected})||opts[0];
    nm.textContent=actOpt?String(actOpt.textContent||'').trim():'Memuat…';

    var qEl=pop.querySelector('.epc-pop-q');
    var q=qEl?String(qEl.value||'').toLowerCase().trim():'';
    if(!qEl&&opts.length>=6){
      qEl=document.createElement('input');
      qEl.type='search';qEl.className='epc-pop-q';qEl.placeholder='Cari proyek…';
      qEl.addEventListener('input',syncProjListOnly);
      qEl.addEventListener('click',function(ev){ev.stopPropagation()});
      pop.appendChild(qEl);
    }
    syncProjListOnly();
  }

  function syncProjListOnly(){
    var sel=document.getElementById('projSel'),pop=document.getElementById('epcProjPop');
    if(!sel||!pop)return;
    var qEl=pop.querySelector('.epc-pop-q');
    var q=qEl?String(qEl.value||'').toLowerCase().trim():'';
    Array.prototype.slice.call(pop.querySelectorAll('.epc-pop-opt')).forEach(function(x){x.remove()});
    Array.prototype.slice.call(sel.options).forEach(function(o){
      var lbl=String(o.textContent||'').trim();
      if(q&&lbl.toLowerCase().indexOf(q)<0)return;
      var b=document.createElement('button');
      b.type='button';
      b.className='epc-pop-opt'+(o.selected?' on':'');
      b.innerHTML='<span>'+esc(lbl)+'</span>';
      b.onclick=function(){
        closeProjMenu();
        sel.value=o.value;
        try{sel.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){if(typeof sel.onchange==='function')sel.onchange()}
      };
      pop.appendChild(b);
    });
  }

  function syncIsiMenu(){
    var tabs=Array.prototype.slice.call(document.querySelectorAll('#tabs button')).filter(function(b){return !b.hidden});
    var menu=document.getElementById('epcIsiMenu'),curEl=document.getElementById('epcIsiCur');
    if(!menu||!curEl)return;
    if(!tabs.length){menu.innerHTML='';return}
    var act=tabs.find(function(b){return b.classList.contains('on')})||tabs[0];
    curEl.textContent=act?String(act.textContent||'').replace(/\s+/g,' ').trim():'Ringkasan';
    menu.innerHTML='';
    tabs.forEach(function(tb){
      var b=document.createElement('button');
      b.type='button';
      b.className=tb.classList.contains('on')?'on':'';
      b.innerHTML='<span>'+tb.innerHTML+'</span>';
      b.onclick=function(){closeIsiMenu();tb.click()};
      menu.appendChild(b);
    });
  }

  function syncHeroMeta(){
    var hero=heroEl();if(!hero)return;
    var fld=curField(),info=fldInfo(fld);
    hero.setAttribute('data-epc-fld',fld);

    document.querySelectorAll('#epcFieldSeg button').forEach(function(b){
      var on=b.getAttribute('data-epc-btn')===fld;
      b.classList.toggle('on',on);
      b.setAttribute('aria-current',on?'page':'false');
    });

    var sel=document.getElementById('projSel');
    var opt=sel&&sel.options&&sel.selectedIndex>=0?sel.options[sel.selectedIndex]:null;
    var pName=opt?String(opt.textContent||'').trim():'';
    if(!pName){
      var pj=document.getElementById('pjName');
      pName=pj?String(pj.textContent||'').trim():'';
    }
    if(pName==='–')pName='';

    var h1=document.getElementById('epcHeroH1');
    if(h1)h1.innerHTML=esc(info.nm)+(pName?': <span>'+esc(pName)+'</span>':' <span>Control</span>');
    var sub=document.getElementById('epcHeroSub');
    if(sub)sub.textContent=info.sub;

    var ey=document.getElementById('epcHeroEy'),metaEl=document.getElementById('meta');
    if(ey){
      var pills=[];
      if(metaEl){
        Array.prototype.slice.call(metaEl.children).forEach(function(ch){
          var t=String(ch.textContent||'').trim();
          if(t)pills.push('<span class="epc-hero-pill'+(ch.classList.contains('auto')?' ok':'')+'">'+esc(t)+'</span>');
        });
      }
      ey.innerHTML='<span>EPCC Control · '+esc(info.nm)+'</span>'+pills.join('');
    }

    var stT=document.getElementById('epcStuckTitle');
    if(stT)stT.textContent=info.nm+(pName?' · '+pName:'');

    syncProjMenu();
    syncIsiMenu();
  }

  function ensureControls(hdr){
    if(!hdr)return;
    if(!document.getElementById('epcStuckTitle')){
      var st=document.createElement('div');
      st.className='epc-stuck-t';
      st.innerHTML='<small>EPCC Control</small><b id="epcStuckTitle">EPCC Control</b>';
      hdr.insertBefore(st,hdr.firstChild);
    }
    if(!document.getElementById('epcProjWrap')){
      var pw=document.createElement('div');
      pw.id='epcProjWrap';pw.className='epc-proj-wrap';
      pw.innerHTML='<button type="button" class="epc-gl-btn" id="epcProjBtn" aria-haspopup="true" aria-expanded="false">'
        +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6"/></svg>'
        +'<span><span class="epc-pl">Proyek Aktif</span><span class="epc-pn" id="epcProjName">Memuat…</span></span>'
        +'<svg class="epc-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
        +'</button><div class="epc-pop" id="epcProjPop" hidden></div>';
      var t=hdr.querySelector('.t');
      if(t&&t.nextSibling)hdr.insertBefore(pw,t.nextSibling);else hdr.appendChild(pw);
      var btn=document.getElementById('epcProjBtn'),pop=document.getElementById('epcProjPop');
      btn.addEventListener('click',function(ev){
        ev.stopPropagation();closeIsiMenu();
        if(btn.classList.contains('single'))return;
        var open=pop.hidden;
        if(open){syncProjMenu();pop.hidden=false;pw.classList.add('open');btn.setAttribute('aria-expanded','true');var q=pop.querySelector('.epc-pop-q');if(q){q.value='';syncProjListOnly();setTimeout(function(){q.focus()},20);}}
        else closeProjMenu();
      });
      document.addEventListener('click',function(ev){if(!ev.target.closest('#epcProjWrap'))closeProjMenu()});
    }
    if(!document.getElementById('epcFieldSeg')){
      var seg=document.createElement('nav');
      seg.id='epcFieldSeg';seg.className='epc-seg-nav';seg.setAttribute('aria-label','Bidang EPCC');
      seg.innerHTML=FLDS.map(function(f){
        return '<button type="button" data-epc-btn="'+f.c+'"><i class="epc-dot" style="background:'+f.dot+'"></i><span class="epc-fn">'+f.nm+'</span></button>';
      }).join('');
      seg.addEventListener('click',function(ev){
        var b=ev.target.closest('button[data-epc-btn]');if(!b)return;
        goField(b.getAttribute('data-epc-btn'));
      });
      var pw2=document.getElementById('epcProjWrap');
      if(pw2&&pw2.nextSibling)hdr.insertBefore(seg,pw2.nextSibling);else hdr.appendChild(seg);
    }
    if(!document.getElementById('epcTopSpacer')){
      var sp=document.createElement('span');
      sp.id='epcTopSpacer';sp.className='epc-top-sp';
      var anchor=hdr.querySelector('.pmo-qs-trigger,.ntf-wrap,.account-wrap,.acm-wrap,#themeBtn,#userAv');
      if(anchor)hdr.insertBefore(sp,anchor);else hdr.appendChild(sp);
    }
  }

  function ensureStuckNodes(mainEl){
    var host=document.getElementById('exStuckHost');
    if(!host&&mainEl){host=document.createElement('div');host.id='exStuckHost';host.hidden=true;mainEl.insertBefore(host,mainEl.firstChild)}
    return {host:host,hSp:document.getElementById('epcHeroSpacer')};
  }

  function syncStuckRect(){
    var mainEl=document.querySelector('.main'),host=document.getElementById('exStuckHost');
    if(!mainEl||!host)return;
    host.style.setProperty('--ex-stuck-left',Math.max(0,Math.round(mainEl.getBoundingClientRect().left))+'px');
  }

  function clearStuckState(nodes){
    clearTimeout(stuckTimer);
    document.documentElement.classList.remove('ex-hdr-stuck','ex-hdr-mounted');
    if(nodes.hSp&&nodes.hSp.style.height!=='0px')nodes.hSp.style.height='0px';
    if(nodes.host&&!nodes.host.hidden)nodes.host.hidden=true;
    var isi=document.getElementById('epcIsiDrop'),hero=heroEl();
    if(isi&&hero&&isi.parentNode!==hero)hero.appendChild(isi);
  }

  function restoreInHero(hdr,hero,nodes){
    clearStuckState(nodes);
    if(hdr&&hero&&hdr.parentNode!==hero)hero.insertBefore(hdr,hero.firstChild);
    var isi=document.getElementById('epcIsiDrop');
    if(isi&&hero&&isi.parentNode!==hero)hero.appendChild(isi);
  }

  function syncScrollHeader(){
    var H=document.documentElement;if(!H.classList.contains('ex-hero-hdr'))return;
    var hero=heroEl(),mainEl=document.querySelector('.main')||document.body,hdr=document.querySelector('header.top');
    if(!hero||!hdr)return;
    var nodes=ensureStuckNodes(mainEl);
    syncStuckRect();
    var rect=hero.getBoundingClientRect(),wasStuck=H.classList.contains('ex-hdr-stuck');
    var wantStuck=wasStuck?(rect.bottom<104):(rect.bottom<58);
    var isi=document.getElementById('epcIsiDrop');

    if(wantStuck){
      if(!wasStuck){
        clearTimeout(stuckTimer);
        if(hdr.parentNode===hero&&nodes.hSp){nodes.hSp.style.height=Math.max(48,hdr.offsetHeight+12)+'px';H.classList.add('ex-hdr-mounted')}
        nodes.host.hidden=false;
        if(hdr.parentNode!==nodes.host)nodes.host.appendChild(hdr);
        if(isi){
          var anchor=hdr.querySelector('.pmo-qs-trigger,.ntf-wrap,.account-wrap,.acm-wrap,#themeBtn,#userAv');
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
    var H=document.documentElement,hero=ensureHeroSection(),mainEl=document.querySelector('.main')||document.body,hdr=document.querySelector('header.top');
    if(!hero||!hdr)return;
    var mob=window.innerWidth<=900||H.classList.contains('m-mode');
    if(mob){
      H.classList.remove('ex-hero-hdr');
      hero.hidden=true;
      clearStuckState({host:document.getElementById('exStuckHost'),hSp:document.getElementById('epcHeroSpacer')});
      if(hdr.parentNode!==mainEl)mainEl.insertBefore(hdr,mainEl.firstChild);
      return;
    }
    hero.hidden=false;H.classList.add('ex-hero-hdr');
    ensureControls(hdr);syncHeroMeta();syncScrollHeader();
  }

  function schedSync(){if(!syncRaf)syncRaf=requestAnimationFrame(function(){syncRaf=0;syncUnifiedHeader()})}
  function schedMeta(){if(!metaRaf)metaRaf=requestAnimationFrame(function(){metaRaf=0;syncHeroMeta()})}

  window.addEventListener('scroll',function(){if(document.documentElement.classList.contains('ex-hero-hdr'))syncScrollHeader()},{passive:true});
  window.addEventListener('resize',schedSync,{passive:true});
  var sideNode=document.querySelector('aside.side');
  if(sideNode&&window.ResizeObserver){try{new ResizeObserver(syncStuckRect).observe(sideNode)}catch(e){}}

  ['projSel','tabs','meta','subNav','pjName'].forEach(function(id){
    var el=document.getElementById(id);
    if(el&&window.MutationObserver)new MutationObserver(schedMeta).observe(el,{childList:true,characterData:true,subtree:true,attributes:true});
  });

  syncUnifiedHeader();
})();
</script>`;

const EPCC_HERO_PATCHES = [
  { file: 'Engineering', find: '</head>', replace: EPCC_HERO_CSS + '\n</head>' },
  { file: 'Engineering', find: '</body>', replace: EPCC_HERO_JS + '\n</body>' },
  { file: 'Epcc', find: '</head>', replace: EPCC_HERO_CSS + '\n</head>' },
  { file: 'Epcc', find: '</body>', replace: EPCC_HERO_JS + '\n</body>' },
];

module.exports = { EPCC_HERO_PATCHES };

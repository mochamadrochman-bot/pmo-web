'use strict';

/**
 * Live View Lapangan / CCTV (Desktop) · Unified Hero Banner + Tampilan Monitoring Modern.
 * - Menggunakan 1 banner tetap bertema Monitoring CCTV Lapangan (/media/liveview-banner.jpg)
 *   yang otomatis menyesuaikan 4 tema dashboard (Biru, Sage, Mocha, Gelap).
 * - Kontrol topbar (Modern HUD Pemilih Lokasi Proyek, tombol Kelola kamera, Cari Ctrl K,
 *   Notifikasi, Akun) menyatu ke dalam banner dan berpindah halus ke #exStuckHost saat digulir.
 * - Menyempurnakan tampilan stage 16:9, kartu instruksi NVR jaringan internal (LAN),
 *   kotak catatan, dan panel daftar kamera.
 * - Mobile (<= 900px / html.m-mode) dikembalikan ke layout standar agar navigasi satu tangan aman.
 */

const LIVEVIEW_HERO_CSS = String.raw`<style id="pmoLiveHeroCss">
html.ex-hero-hdr{
  --ex-stuck-top:#0B3A66;--ex-stuck-sub:#0B3A66;--ex-stuck-menu:#093157;--ex-stuck-act:#1E6FC0;
}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]){
  --ex-stuck-top:#0F2A1D;--ex-stuck-sub:#0F2A1D;--ex-stuck-menu:#123022;--ex-stuck-act:#375534;
}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]){
  --ex-stuck-top:#3B2A1F;--ex-stuck-sub:#3B2A1F;--ex-stuck-menu:#2d1f17;--ex-stuck-act:#6F4E37;
}
html.ex-hero-hdr[data-theme="dark"]{
  --ex-stuck-top:#0f172a;--ex-stuck-sub:#0f172a;--ex-stuck-menu:#111c33;--ex-stuck-act:#2563eb;
}

html.ex-hero-hdr main.wrap{max-width:1540px!important;padding-top:14px!important}
#lvHero{display:none}
#lvHeroSpacer{display:none;grid-column:1 / -1;grid-row:1;flex:none}
html.ex-hero-hdr.ex-hdr-mounted #lvHeroSpacer{display:block}

html.ex-hero-hdr main.wrap>#lvHero{
  position:relative;overflow:visible!important;z-index:34;
  display:grid!important;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;
  align-items:end;column-gap:16px;padding:12px 24px 18px;min-height:158px;
  border-radius:var(--r,16px);margin:0 0 14px;color:#fff;
  background:#073b63 url('/media/liveview-banner.jpg') center 46%/cover no-repeat;
  box-shadow:0 12px 28px rgba(8,24,42,.18);
}
html.ex-hero-hdr main.wrap>#lvHero::before{
  content:"";position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:0;
  background:linear-gradient(96deg,rgba(7,26,46,.95) 0%,rgba(11,54,96,.82) 56%,rgba(8,28,50,.48) 100%);
  box-shadow:inset 0 68px 54px -26px rgba(0,0,0,.44);
}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]) main.wrap>#lvHero::before{
  background:linear-gradient(98deg,rgba(15,42,29,.95) 0%,rgba(31,58,38,.82) 52%,rgba(55,85,52,.44) 100%)!important;
}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]) main.wrap>#lvHero::before{
  background:linear-gradient(98deg,rgba(54,37,27,.95) 0%,rgba(82,58,41,.82) 52%,rgba(111,78,55,.44) 100%)!important;
}
html.ex-hero-hdr[data-theme="dark"] main.wrap>#lvHero::before{
  background:linear-gradient(96deg,rgba(9,14,24,.96) 0%,rgba(15,23,42,.84) 56%,rgba(9,14,24,.54) 100%)!important;
}
html.ex-hero-hdr :is(#lvHero,#exStuckHost):has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden]),.lv-proj-wrap.open){z-index:150!important}

/* Sembunyikan bilah chips duplikat & judul header lama; simpan .back sebagai tombol frosted-glass kembali ke Portal (kecuali jika sidebar ada) */
html.ex-hero-hdr #content>.bar,
html.ex-hero-hdr header.top .t,
html.ex-hero-hdr #lvHero .lv-stuck-t{display:none!important}
html.ex-hero-hdr body:has(aside.side) header.top .back{display:none!important}
html.ex-hero-hdr .pmo-pbar{display:none!important}

/* Baris 1 Hero & Sticky Header */
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top{
  position:relative!important;top:auto!important;z-index:40!important;
  background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  border-bottom:1px solid rgba(255,255,255,.16)!important;gap:8px;flex-wrap:wrap;
}
html.ex-hero-hdr #lvHero>header.top{grid-column:1 / -1;grid-row:1;padding:0 0 10px 0!important;margin:0 0 12px 0!important}
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .lv-top-sp{flex:1;min-width:8px}
html.ex-hero-hdr #exStuckHost header.top .lv-top-sp{display:none}

/* Glass Controls inside Hero & Stuck Host */
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .back,
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .icon-btn,
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .ntf-wrap>button,
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .pmo-qs-trigger,
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .acm-chip,
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .lv-gl-btn,
html.ex-hero-hdr #lvHero .lv-hero-act{
  height:38px;min-height:38px;background:rgba(255,255,255,.13)!important;border:1px solid rgba(255,255,255,.28)!important;
  color:#fff!important;box-shadow:none!important;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
}
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .icon-btn{width:38px;border-radius:11px}
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .back:hover,
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .icon-btn:hover,
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .ntf-wrap>button:hover,
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .pmo-qs-trigger:hover,
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .acm-chip:hover,
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .lv-gl-btn:hover,
html.ex-hero-hdr #lvHero .lv-hero-act:hover{
  background:rgba(255,255,255,.22)!important;border-color:rgba(255,255,255,.46)!important;
}
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .back svg,
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .acm-chip .acm-t b,
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .acm-chip .acm-t small,
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .acm-chip .acm-caret,
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .pmo-qs-trigger *,
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .ntf-wrap>button svg,
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .icon-btn svg{color:#fff!important}
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top .pmo-qs-trigger kbd{
  background:rgba(255,255,255,.16)!important;border-color:rgba(255,255,255,.32)!important;color:#fff!important;
}
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top :is(.ntf-wrap,.account-wrap,.acm-wrap,.lv-proj-wrap){position:relative;z-index:25}
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top :is(.ntf-wrap,.account-wrap,.acm-wrap,.lv-proj-wrap):has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden]),.lv-pop:not([hidden])){z-index:55}
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top :is(.pop,.acm-pop,.ntf-pop){background:var(--card,#fff);color:var(--ink,#132b43);z-index:160!important}

/* CTA Putih (Kelola kamera) */
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top #manageBtn:not([hidden]){
  display:inline-flex;align-items:center;gap:7px;height:38px;min-height:38px;padding:0 14px;border-radius:11px;
  background:#fff!important;color:#0b3a66!important;border:1px solid rgba(255,255,255,.9)!important;
  font-size:12.5px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,.18);transition:transform .15s,background .15s;
}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]) :is(#lvHero,#exStuckHost) header.top #manageBtn:not([hidden]){color:#183319!important}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]) :is(#lvHero,#exStuckHost) header.top #manageBtn:not([hidden]){color:#3b2a1f!important}
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top #manageBtn:not([hidden]):hover{background:#eaf4ff!important;transform:translateY(-1px)}
html.ex-hero-hdr :is(#lvHero,#exStuckHost) header.top #manageBtn svg{color:currentColor!important}

/* Project HUD Selector */
.lv-proj-wrap{display:none}
html.ex-hero-hdr #lvHero header.top .lv-proj-wrap{display:inline-flex;align-items:center}
html.ex-hero-hdr #exStuckHost .lv-proj-wrap{display:none!important}
.lv-gl-btn{
  display:inline-flex;align-items:center;gap:8px;padding:0 13px;border-radius:11px;
  font:600 12.5px/1.2 inherit;cursor:pointer;max-width:300px;
}
.lv-gl-btn .lv-pl{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:rgba(219,234,254,.84);display:block;line-height:1}
.lv-gl-btn .lv-pn{display:block;font-size:12.5px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:215px;text-align:left}
.lv-gl-btn svg{width:14px;height:14px;flex:none;opacity:.9}
.lv-gl-btn.single svg.lv-chev{display:none}

html.ex-hero-hdr .lv-proj-wrap .lv-pop{
  position:absolute;left:0;top:calc(100% + 8px);width:min(360px,calc(100vw - 32px));
  background:rgba(16,25,39,.96);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  border:1px solid rgba(255,255,255,.15);border-radius:16px;box-shadow:0 24px 54px rgba(3,8,18,.62);
  color:#f1f5f9;padding:10px;z-index:160!important;display:grid;gap:4px;max-height:min(360px,62vh);overflow:auto;
}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]) .lv-proj-wrap .lv-pop{background:rgba(15,38,26,.96)}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]) .lv-proj-wrap .lv-pop{background:rgba(44,30,21,.96)}
.lv-pop[hidden]{display:none!important}
.lv-pop-opt{
  display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:40px;
  padding:8px 11px;border:1px solid transparent;border-radius:10px;background:transparent;
  color:#f1f5f9;font:600 13px/1.3 inherit;text-align:left;cursor:pointer;
}
.lv-pop-opt:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.14)}
.lv-pop-opt.on{background:rgba(30,111,192,.36);border-color:rgba(125,211,252,.45)}
.lv-pop-bdg{padding:2px 7px;border-radius:6px;background:rgba(125,211,252,.18);color:#93c5fd;font-size:11px;font-weight:700;flex:none}

/* Baris 2 Hero Typography */
html.ex-hero-hdr #lvHero .lv-hero-txt{grid-column:1;grid-row:2;position:relative;min-width:0;z-index:5}
.lv-hero-ey{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px;font-size:12px;font-weight:600;color:#cbe6fb}
.lv-hero-pill{
  display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700;
  background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.28);color:#e0f2fe;white-space:nowrap;
}
.lv-hero-pill.ok{background:rgba(79,209,160,.22);border-color:rgba(110,231,183,.45);color:#a7f3d0}
.lv-hero-pill.ok::before{content:"";width:7px;height:7px;border-radius:50%;background:#ef4444;box-shadow:0 0 8px #ef4444}
.lv-hero-pill.warn{background:rgba(245,158,11,.24);border-color:rgba(252,211,77,.45);color:#fde68a}
html.ex-hero-hdr #lvHero h1{
  margin:0 0 5px;font-size:clamp(22px,2.4vw,30px);line-height:1.12;font-weight:800;letter-spacing:-.02em;color:#fff!important;
}
html.ex-hero-hdr #lvHero h1 span{color:#7dd3fc}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]) #lvHero h1 span{color:#bce39a}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]) #lvHero h1 span{color:#f3cb99}
html.ex-hero-hdr #lvHero .lv-hero-sub{margin:0;color:#dcecf7!important;font-size:13px;max-width:72ch;line-height:1.45}
html.ex-hero-hdr #lvHero .lv-hero-right{grid-column:2;grid-row:2;align-self:end;justify-self:end;z-index:5}
.lv-hero-act{
  display:inline-flex;align-items:center;gap:7px;padding:0 14px;border-radius:11px;font-size:12.5px;font-weight:700;cursor:pointer;
}
.lv-hero-act svg{width:15px;height:15px}

/* Sticky Scroll Bar */
#exStuckHost{
  position:fixed;top:0;right:0;left:var(--ex-stuck-left,0);z-index:48;
  background:var(--ex-stuck-top);color:#fff;box-shadow:0 10px 28px rgba(0,0,0,.24);
  border-bottom:1px solid rgba(255,255,255,.14);
  transform:translate3d(0,-104%,0);opacity:0;pointer-events:none;
  transition:transform .38s cubic-bezier(.22,1,.36,1),opacity .30s ease,background-color .30s ease;
}
#exStuckHost:has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden])){z-index:160!important}
html.ex-hero-hdr.ex-hdr-stuck #exStuckHost{transform:none;opacity:1;pointer-events:auto}
#exStuckHost[hidden]{display:none!important}
#exStuckHost header.top{max-width:1600px;margin:0 auto!important;padding:8px 28px!important;min-height:0!important;border-bottom:0!important;align-items:center}
#exStuckHost .lv-stuck-t{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1;padding-right:10px}
#exStuckHost .lv-stuck-t small{font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,255,255,.72);font-weight:700;line-height:1.1}
#exStuckHost .lv-stuck-t b{font-size:15px;color:#fff;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}

/* Pemolesan Stage CCTV, Kartu LAN NVR, & Panel Daftar Kamera */
html.ex-hero-hdr .lv{gap:16px}
html.ex-hero-hdr .lv>div:first-child{
  background:var(--card);border:1px solid var(--line);border-radius:var(--r,16px);padding:12px;box-shadow:var(--shadow);
}
html.ex-hero-hdr .stage{border-radius:12px;box-shadow:none}
html.ex-hero-hdr .stage.lan{
  background-color:#0b1825;
  background-image:linear-gradient(rgba(125,211,252,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(125,211,252,.10) 1px,transparent 1px);
  background-size:44px 44px;
}
html.ex-hero-hdr .stage.lan .msg>div{
  max-width:460px;padding:20px 22px;border-radius:15px;
  background:rgba(13,27,44,.86);backdrop-filter:blur(10px);
  border:1px solid rgba(125,211,252,.28);box-shadow:0 16px 36px rgba(0,0,0,.4);
}
html.ex-hero-hdr .under:not(:empty){
  margin-top:12px;padding:11px 14px;border-radius:12px;background:var(--tint);border:1px solid var(--line);
}
html.ex-hero-hdr .note{margin-top:12px;padding:11px 14px;border-radius:12px;font-size:12.5px}
html.ex-hero-hdr .panel{padding:16px;border-radius:var(--r,16px)}
html.ex-hero-hdr .panel h3{padding-bottom:10px;border-bottom:1px solid var(--line);margin-bottom:12px}
html.ex-hero-hdr .panel h3 .n{padding:2px 8px;border-radius:99px;background:var(--soft);color:var(--pri-ink);font-size:11.5px;font-weight:700}
html.ex-hero-hdr .cam{border-radius:12px;transition:border-color .15s,background .15s}
html.ex-hero-hdr .cam:hover{border-color:var(--pri);background:var(--card)}
html.ex-hero-hdr .cam.on{border-color:var(--pri);background:var(--soft);box-shadow:inset 3px 0 0 var(--pri)}
html.ex-hero-hdr .modal{z-index:320!important}
html.ex-hero-hdr .toast{z-index:340!important}

@media (max-width:900px){
  #lvHero,#exStuckHost{display:none!important}
}
</style>`;

const LIVEVIEW_HERO_JS = String.raw`<script id="pmoLiveHeroJs">
(function(){
  if(window.__pmoLiveHeroInit)return;window.__pmoLiveHeroInit=true;
  var stuckTimer=0,syncRaf=0,metaRaf=0;

  function wrapEl(){return document.querySelector('.main>main.wrap')||document.querySelector('main.wrap')}
  function heroEl(){return document.getElementById('lvHero')}

  function ensureHeroSection(){
    var w=wrapEl();if(!w)return null;
    var hero=heroEl();
    if(!hero){
      hero=document.createElement('section');
      hero.id='lvHero';
      hero.className='hero lv-hero';
      hero.setAttribute('aria-label','Header Live View Lapangan');
      hero.innerHTML='<div id="lvHeroSpacer" aria-hidden="true"></div>'
        +'<div class="lv-hero-txt">'
          +'<div class="lv-hero-ey">'
            +'<span>Modul 4 · Overview Proyek</span>'
            +'<span class="lv-hero-pill ok" id="lvHeroStat">Memuat kamera…</span>'
            +'<span class="lv-hero-pill" id="lvHeroTypePill" hidden></span>'
          +'</div>'
          +'<h1 id="lvHeroH1">Live View Lapangan</h1>'
          +'<p class="lv-hero-sub">Pemantauan kamera CCTV lapangan proyek secara real-time, dukungan siaran HLS, YouTube, Snapshot foto, serta akses NVR jaringan internal.</p>'
        +'</div>'
        +'<div class="lv-hero-right">'
          +'<button type="button" class="lv-hero-act" id="lvHeroFullBtn" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg><span>Layar penuh</span></button>'
        +'</div>';
      w.insertBefore(hero,w.firstChild);
      var fb=document.getElementById('lvHeroFullBtn');
      if(fb)fb.onclick=function(){if(typeof window.fullscreen==='function')window.fullscreen()};
    }
    return hero;
  }

  function closeProjMenu(){
    var pw=document.getElementById('lvProjWrap'),pop=document.getElementById('lvProjPop'),btn=document.getElementById('lvProjBtn');
    if(pop)pop.hidden=true;if(pw)pw.classList.remove('open');if(btn)btn.setAttribute('aria-expanded','false');
  }

  function syncProjMenu(){
    var chips=Array.prototype.slice.call(document.querySelectorAll('#projChips button'));
    var btn=document.getElementById('lvProjBtn'),nm=document.getElementById('lvProjName'),pop=document.getElementById('lvProjPop');
    if(!btn||!nm||!pop)return;
    btn.classList.toggle('single',chips.length<2);
    var act=chips.find(function(c){return c.classList.contains('on')})||chips[0];
    var actLabel=act?String((act.firstChild&&act.firstChild.nodeType===3?act.firstChild.textContent:act.textContent)||'').trim():'';
    nm.textContent=actLabel||'Memuat…';

    pop.innerHTML='';
    chips.forEach(function(c){
      var sm=c.querySelector('small');
      var cnt=sm?String(sm.textContent||'').trim():'';
      var title=String((c.firstChild&&c.firstChild.nodeType===3?c.firstChild.textContent:c.textContent)||'').trim();
      var opt=document.createElement('button');
      opt.type='button';
      opt.className='lv-pop-opt'+(c.classList.contains('on')?' on':'');
      opt.innerHTML='<span>'+title.replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]})+'</span>'+(cnt?'<span class="lv-pop-bdg">'+cnt+' kamera</span>':'');
      opt.onclick=function(){closeProjMenu();c.click()};
      pop.appendChild(opt);
    });
  }

  function syncHeroMeta(){
    var actChip=document.querySelector('#projChips button.on');
    var pName=actChip?String((actChip.firstChild&&actChip.firstChild.nodeType===3?actChip.firstChild.textContent:actChip.textContent)||'').trim():'';
    var h1=document.getElementById('lvHeroH1');
    if(h1){
      if(pName)h1.innerHTML='Live View: <span>'+pName.replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]})+'</span>';
      else h1.innerHTML='Live View <span>Lapangan</span>';
    }
    var cams=document.querySelectorAll('#camList .cam').length;
    var statEl=document.getElementById('lvHeroStat');
    if(statEl){
      statEl.className='lv-hero-pill '+(cams>0?'ok':'warn');
      statEl.textContent=cams>0?(cams+' Kamera Aktif'):'Belum Ada Kamera';
    }
    var typePill=document.getElementById('lvHeroTypePill');
    var onCam=document.querySelector('#camList .cam.on .ty');
    if(typePill){
      if(onCam){
        var isLan=!!document.querySelector('#stage.lan');
        typePill.hidden=false;
        typePill.textContent=isLan?'NVR Jaringan Internal LAN':('Siaran '+String(onCam.textContent||'').trim());
      }else{
        typePill.hidden=true;
      }
    }
    var stName=document.getElementById('lvStuckTitle');
    if(stName)stName.textContent='Live View'+(pName?' · '+pName:' Lapangan');
    var fb=document.getElementById('lvHeroFullBtn');
    if(fb){
      var hasCam=cams>0&&!document.querySelector('#stage.lan')&&!document.querySelector('#stage .msg a[target="_blank"]');
      fb.hidden=!hasCam;
    }
    syncProjMenu();
  }

  function ensureControls(hdr){
    if(!hdr)return;
    if(!document.getElementById('lvProjWrap')){
      var pw=document.createElement('div');
      pw.id='lvProjWrap';pw.className='lv-proj-wrap';
      pw.innerHTML='<button type="button" class="lv-gl-btn" id="lvProjBtn" aria-haspopup="true" aria-expanded="false">'
        +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 7h11a2 2 0 012 2v6a2 2 0 01-2 2H3z"/><path d="M16 11l5-3v8l-5-3"/></svg>'
        +'<span><span class="lv-pl">Lokasi Proyek</span><span class="lv-pn" id="lvProjName">Memuat…</span></span>'
        +'<svg class="lv-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
        +'</button><div class="lv-pop" id="lvProjPop" hidden></div>';
      var t=hdr.querySelector('.t');
      if(t&&t.nextSibling)hdr.insertBefore(pw,t.nextSibling);else hdr.insertBefore(pw,hdr.firstChild);
      var btn=document.getElementById('lvProjBtn'),pop=document.getElementById('lvProjPop');
      btn.addEventListener('click',function(ev){
        ev.stopPropagation();
        if(btn.classList.contains('single'))return;
        var open=pop.hidden;
        if(open){syncProjMenu();pop.hidden=false;pw.classList.add('open');btn.setAttribute('aria-expanded','true')}
        else closeProjMenu();
      });
      document.addEventListener('click',function(ev){if(!ev.target.closest('#lvProjWrap'))closeProjMenu()});
    }
    if(!document.getElementById('lvStuckTitle')){
      var st=document.createElement('div');
      st.className='lv-stuck-t';
      st.innerHTML='<small>Modul 4 · Overview Proyek</small><b id="lvStuckTitle">Live View Lapangan</b>';
      hdr.insertBefore(st,hdr.firstChild);
    }
    if(!document.getElementById('lvTopSpacer')){
      var sp=document.createElement('span');
      sp.id='lvTopSpacer';sp.className='lv-top-sp';
      var anchor=hdr.querySelector('#manageBtn,.pmo-qs-trigger,.ntf-wrap,.account-wrap,.acm-wrap,#themeBtn,#userAv');
      if(anchor)hdr.insertBefore(sp,anchor);else hdr.appendChild(sp);
      var mg=document.getElementById('manageBtn');
      if(mg&&sp.parentNode===hdr)hdr.insertBefore(mg,sp);
    }
  }

  function ensureStuckNodes(mainEl){
    var host=document.getElementById('exStuckHost');
    if(!host&&mainEl){host=document.createElement('div');host.id='exStuckHost';host.hidden=true;mainEl.insertBefore(host,mainEl.firstChild)}
    return {host:host,hSp:document.getElementById('lvHeroSpacer')};
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
  }

  function restoreInHero(hdr,hero,nodes){
    clearStuckState(nodes);
    if(hdr&&hero&&hdr.parentNode!==hero)hero.insertBefore(hdr,hero.firstChild);
  }

  function syncScrollHeader(){
    var H=document.documentElement;if(!H.classList.contains('ex-hero-hdr'))return;
    var hero=heroEl(),mainEl=document.querySelector('.main')||document.body,hdr=document.querySelector('header.top');
    if(!hero||!hdr)return;
    var nodes=ensureStuckNodes(mainEl);
    syncStuckRect();
    var rect=hero.getBoundingClientRect(),wasStuck=H.classList.contains('ex-hdr-stuck');
    var wantStuck=wasStuck?(rect.bottom<104):(rect.bottom<58);

    if(wantStuck){
      if(!wasStuck){
        clearTimeout(stuckTimer);
        if(hdr.parentNode===hero&&nodes.hSp){nodes.hSp.style.height=Math.max(48,hdr.offsetHeight+12)+'px';H.classList.add('ex-hdr-mounted')}
        nodes.host.hidden=false;
        if(hdr.parentNode!==nodes.host)nodes.host.appendChild(hdr);
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
      clearStuckState({host:document.getElementById('exStuckHost'),hSp:document.getElementById('lvHeroSpacer')});
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

  ['projChips','camList','stage'].forEach(function(id){
    var el=document.getElementById(id);
    if(el&&window.MutationObserver)new MutationObserver(schedMeta).observe(el,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class']});
  });

  syncUnifiedHeader();
})();
</script>`;

const LIVEVIEW_HERO_PATCHES = [
  {
    file: 'LiveView',
    find: '</head>',
    replace: LIVEVIEW_HERO_CSS + '\n</head>',
  },
  {
    file: 'LiveView',
    find: '</body>',
    replace: LIVEVIEW_HERO_JS + '\n</body>',
  },
];

module.exports = { LIVEVIEW_HERO_PATCHES };

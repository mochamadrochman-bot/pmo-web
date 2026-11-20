'use strict';

/**
 * Master Schedule (Desktop) · Unified Hero Banner (Alternatif B), disamakan dengan tema
 * Monthly Executive Review & Weekly Progress.
 * - Kontrol topbar (#cpTabs Monitoring EPCC/Jadwal CPM, pemilih proyek Modern HUD Scroll,
 *   Cari Ctrl K, Notifikasi, Tema, Akun) menyatu ke dalam banner .hero, lalu berpindah halus
 *   ke #exStuckHost saat halaman digulir melewati banner bersama dropdown "Isi halaman".
 * - Menghilangkan duplikasi Week Realisasi (tetap ada di toolbar bawah), judul ganda, dan
 *   badge "Hanya baca · data otomatis".
 * - Mobile (<= 760px / html.m-mode) dikembalikan utuh ke layout standar tanpa menyentuh #mobileNote.
 */

const MASTER_HERO_CSS = String.raw`<style id="pmoMasterHeroCss">
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

html.ex-hero-hdr main.wrap{padding-top:14px!important}
html.ex-hero-hdr #desk>.hero{
  position:relative;overflow:visible!important;z-index:34;
  display:grid!important;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;
  align-items:end;column-gap:16px;padding:12px 24px 20px;min-height:156px;
  border-radius:var(--r,16px);margin:0 0 14px;color:#fff;
  background:#102e4b url('https://drive.google.com/thumbnail?id=1vAJUIDwskvCdPmXNNvzCwoqpBVBCsdP1&sz=w2000') center/cover;
  box-shadow:0 12px 30px rgba(8,24,42,.18);
}
html.ex-hero-hdr #desk>.hero::before{
  content:"";position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:0;
  background:linear-gradient(95deg,rgba(8,30,51,.95),rgba(11,58,102,.78) 56%,rgba(8,30,51,.52));
  box-shadow:inset 0 72px 58px -28px rgba(0,0,0,.44);
}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]) #desk>.hero::before{
  background:linear-gradient(100deg,rgba(15,42,29,.95) 0%,rgba(31,58,38,.80) 45%,rgba(55,85,52,.42) 100%)!important;
}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]) #desk>.hero::before{
  background:linear-gradient(100deg,rgba(59,42,31,.95) 0%,rgba(84,60,43,.80) 45%,rgba(111,78,55,.42) 100%)!important;
}
html.ex-hero-hdr[data-theme="dark"] #desk>.hero::before{
  background:linear-gradient(95deg,rgba(9,14,24,.96),rgba(15,23,42,.80) 56%,rgba(9,14,24,.56))!important;
}
html.ex-hero-hdr :is(.hero,#exStuckHost):has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden]),.pmo-isi-drop.open,.pmo-isi-drop:hover,.pmo-isi-drop:focus-within,.ms-proj-wrap.open){z-index:150!important}

#exHeroSpacer{display:none;grid-column:1 / -1;grid-row:1;flex:none}
#exPbarSpacer{display:none;flex:none}
html.ex-hero-hdr.ex-hdr-mounted #exHeroSpacer{display:block}
html.ex-hero-hdr.ex-pbar-mounted #exPbarSpacer{display:block}

/* Hapus chip "Hanya baca · data otomatis" dan select native putih di mode unified hero */
html.ex-hero-hdr #desk>.hero>.chip,
html.ex-hero-hdr #project{display:none!important}

/* Baris 1 Hero & Sticky Bar controls */
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top{
  position:relative!important;top:auto!important;z-index:40!important;
  background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  border-bottom:1px solid rgba(255,255,255,.16)!important;gap:8px;flex-wrap:wrap;
}
html.ex-hero-hdr .hero>header.top{grid-column:1 / -1;grid-row:1;padding:0 0 10px 0!important;margin:0 0 12px 0!important}
html.ex-hero-hdr .hero>.ms-hero-txt{grid-column:1;grid-row:2;position:relative;min-width:0;z-index:5}
html.ex-hero-hdr .hero header.top .t{display:none!important}

/* Switcher Monitoring EPCC | Jadwal CPM tunggal di baris atas Hero */
html.ex-hero-hdr :is(.hero,#exStuckHost) #cpTabs{
  display:inline-flex!important;gap:2px;padding:3px;margin:0!important;border-radius:11px;
  background:rgba(8,18,32,.42);border:1px solid rgba(255,255,255,.24);
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);flex:none;
}
html.ex-hero-hdr :is(.hero,#exStuckHost) #cpTabs button{
  border:0;background:transparent;color:rgba(255,255,255,.84);
  height:30px;padding:0 13px;border-radius:8px;font-size:12.5px;font-weight:600;
  transition:background .14s ease,color .14s ease;
}
html.ex-hero-hdr :is(.hero,#exStuckHost) #cpTabs button:hover{color:#fff;background:rgba(255,255,255,.10)}
html.ex-hero-hdr :is(.hero,#exStuckHost) #cpTabs button.on{background:#fff;color:#0c243c;font-weight:700}

/* Frosted glass controls */
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .icon-btn,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .ntf-wrap>button,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .pmo-qs-trigger,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .acm-chip,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .ms-gl-btn{
  height:38px;background:rgba(255,255,255,.12)!important;border:1px solid rgba(255,255,255,.28)!important;
  color:#fff!important;box-shadow:none!important;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .icon-btn{width:38px;border-radius:11px}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .icon-btn:hover,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .ntf-wrap>button:hover,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .pmo-qs-trigger:hover,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .acm-chip:hover,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .ms-gl-btn:hover{background:rgba(255,255,255,.22)!important;border-color:rgba(255,255,255,.45)!important}

html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .acm-chip .acm-t b,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .acm-chip .acm-t small,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .acm-chip .acm-caret,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .pmo-qs-trigger *,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .ntf-wrap>button svg,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .icon-btn svg{color:#fff!important}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .pmo-qs-trigger kbd{background:rgba(255,255,255,.16)!important;border-color:rgba(255,255,255,.32)!important;color:#fff!important}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top :is(.ntf-wrap,.account-wrap,.acm-wrap,.ms-proj-wrap){position:relative;z-index:25}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top :is(.ntf-wrap,.account-wrap,.acm-wrap,.ms-proj-wrap):has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden]),.ms-pop:not([hidden])){z-index:55}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top :is(.pop,.acm-pop,.ntf-pop){background:var(--card,#fff);color:var(--ink,#132b43);z-index:160!important}

/* Dorong sisi kanan setelah #cpTabs / .t */
html.ex-hero-hdr .hero header.top .ms-top-sp{flex:1;min-width:8px}
html.ex-hero-hdr #exStuckHost header.top .ms-top-sp{display:none}
html.ex-hero-hdr #exStuckHost .ms-proj-wrap{display:none!important}
.ms-proj-wrap{display:none}
html.ex-hero-hdr .hero header.top .ms-proj-wrap{display:inline-flex;align-items:center}
.ms-gl-btn{
  display:inline-flex;align-items:center;gap:8px;padding:0 13px;border-radius:11px;
  font:600 12.5px/1.2 inherit;cursor:pointer;max-width:290px;
}
.ms-gl-btn .ms-pl{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:rgba(219,234,254,.82);display:block;line-height:1}
.ms-gl-btn .ms-pn{display:block;font-size:12.5px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px;text-align:left}
.ms-gl-btn svg{width:14px;height:14px;flex:none;opacity:.88}
.ms-gl-btn.single svg.ms-chev{display:none}

/* Modern HUD Hover Scroll Panel untuk Pemilih Proyek (selaras Portal & Weekly) */
html.ex-hero-hdr .ms-proj-wrap .ms-pop{
  position:absolute;left:50%;transform:translateX(-50%);top:calc(100% + 8px);
  width:min(352px,calc(100vw - 32px));
  background:rgba(16,25,39,.96);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  border:1px solid rgba(255,255,255,.15);border-radius:16px;
  box-shadow:0 24px 54px rgba(3,8,18,.62);
  color:#f1f5f9;display:flex;flex-direction:column;overflow:hidden;z-index:160!important;
}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]) .ms-proj-wrap .ms-pop{background:rgba(15,38,26,.96)}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]) .ms-proj-wrap .ms-pop{background:rgba(44,30,21,.96)}
.ms-pop[hidden]{display:none!important}
.ms-pop-top{flex:none;padding:12px 12px 10px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02)}
.ms-pop-h{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 2px;margin-bottom:8px;font-size:13px;font-weight:600;color:#7dd3fc}
.ms-pop-cnt{font-size:12.5px;font-weight:500;color:#9db0c4;font-variant-numeric:tabular-nums}
.ms-pop-qwrap{position:relative;display:flex;align-items:center}
.ms-pop-qic{position:absolute;left:11px;width:15px;height:15px;color:#9db0c4;pointer-events:none}
.ms-pop-q{
  width:100%;height:38px;padding:0 34px;border-radius:9px;
  border:1px solid rgba(255,255,255,.14);background:rgba(6,12,22,.56);
  color:#f1f5f9;font:500 13.5px/1.2 inherit;transition:border-color .15s ease,background .15s ease;
}
.ms-pop-q::placeholder{color:#8fa3b8}
.ms-pop-q:focus{outline:0;border-color:rgba(125,211,252,.7);background:rgba(6,12,22,.82)}
.ms-pop-q::-webkit-search-cancel-button{display:none}
.ms-pop-clr{
  position:absolute;right:7px;width:24px;height:24px;padding:0;border:0;border-radius:6px;
  background:rgba(255,255,255,.09);color:#e2e8f0;cursor:pointer;
  display:none;place-items:center;text-align:center;font-size:15px;line-height:1;
}
.ms-pop-clr.on{display:grid}
.ms-pop-clr:hover{background:rgba(255,255,255,.18);color:#fff}
.ms-pop-body{position:relative}
.ms-pop-list{
  max-height:min(320px,56vh);overflow-y:auto;padding:8px 16px 10px 8px;
  display:flex;flex-direction:column;gap:2px;
  scrollbar-width:none;-ms-overflow-style:none;scroll-behavior:smooth;
}
.ms-pop-list::-webkit-scrollbar{display:none}
.ms-pop-body.has-top .ms-pop-list{-webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 18px,#000 100%);mask-image:linear-gradient(180deg,transparent 0%,#000 18px,#000 100%)}
.ms-pop-body.has-bot .ms-pop-list{-webkit-mask-image:linear-gradient(180deg,#000 0%,#000 calc(100% - 24px),transparent 100%);mask-image:linear-gradient(180deg,#000 0%,#000 calc(100% - 24px),transparent 100%)}
.ms-pop-body.has-top.has-bot .ms-pop-list{-webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 18px,#000 calc(100% - 24px),transparent 100%);mask-image:linear-gradient(180deg,transparent 0%,#000 18px,#000 calc(100% - 24px),transparent 100%)}
.ms-pop-rail{
  position:absolute;top:8px;bottom:8px;right:5px;width:10px;border-radius:99px;
  cursor:pointer;opacity:0;pointer-events:none;transition:opacity .18s ease;
  display:flex;justify-content:center;z-index:5;
}
.ms-pop:hover .ms-pop-rail.needed,.ms-pop-body.scrolling .ms-pop-rail.needed,.ms-pop-rail.dragging{opacity:1;pointer-events:auto}
.ms-pop-track{position:relative;width:3px;height:100%;border-radius:99px;background:rgba(255,255,255,.08);transition:width .14s ease,background .14s ease}
.ms-pop-rail:hover .ms-pop-track,.ms-pop-rail.dragging .ms-pop-track{width:5px;background:rgba(255,255,255,.15)}
.ms-pop-thumb{position:absolute;left:0;right:0;top:0;min-height:28px;border-radius:99px;background:rgba(125,211,252,.52);transition:background .14s ease}
.ms-pop-rail:hover .ms-pop-thumb,.ms-pop-rail.dragging .ms-pop-thumb{background:rgba(125,211,252,.92)}
.ms-pop-opt{
  position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:42px;
  padding:9px 12px;border:1px solid transparent;border-radius:10px;background:transparent;
  color:#f1f5f9;font:600 14px/1.35 inherit;text-align:left;cursor:pointer;
  transition:background .12s ease,border-color .12s ease,color .12s ease,transform .12s ease;
}
.ms-pop-opt:hover,.ms-pop-opt:focus-visible{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.14);color:#fff;transform:translateX(2px);outline:0}
.ms-pop-opt:active{transform:translateX(1px) scale(.995)}
.ms-pop-opt:focus-visible{border-color:#7dd3fc}
.ms-pop-opt.on{background:rgba(30,111,192,.36);border-color:rgba(125,211,252,.45);color:#fff}
.ms-pop-nm{flex:1;min-width:0;line-height:1.35}
.ms-pop-bdg{padding:2px 7px;border-radius:6px;background:rgba(16,185,129,.2);color:#6ee7b7;font-size:11.5px;font-weight:600;flex:none}
.ms-pop-go{flex:none;font-size:16px;line-height:1;color:#7dd3fc;opacity:0;transform:translateX(-3px);transition:opacity .12s ease,transform .12s ease}
.ms-pop-opt:hover .ms-pop-go,.ms-pop-opt:focus-visible .ms-pop-go,.ms-pop-opt.on .ms-pop-go{opacity:.95;transform:none}
.ms-pop-empty{padding:24px 12px;text-align:center;font-size:13px;color:#9db0c4;line-height:1.5}
.ms-pop-foot{flex:none;display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-top:1px solid rgba(255,255,255,.08);background:rgba(8,14,24,.55);font-size:12px;color:#9db0c4}
.ms-pop-more{color:#7dd3fc;font-weight:600}
.ms-pop-more.done{color:#94a3b8;font-weight:500}
.ms-pop-kbd{font-size:11.5px;color:#9db0c4}

/* Tipografi & pills Baris 2 Hero */
html.ex-hero-hdr #desk>.hero .ey{display:inline-block;font-size:12.5px;font-weight:600;letter-spacing:0;text-transform:none;color:#c3e4f7!important}
.ms-hero-ey{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px}
.ms-hero-pill{
  display:inline-flex;align-items:center;padding:2px 9px;border-radius:99px;
  font-size:11.5px;font-weight:700;letter-spacing:.01em;
  background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.28);color:#e0f2fe;
}
.ms-hero-pill.ok{background:rgba(79,209,160,.22);border-color:rgba(110,231,183,.45);color:#a7f3d0}
.ms-hero-pill.warn{background:rgba(245,158,11,.24);border-color:rgba(252,211,77,.45);color:#fde68a}
html:not(.ex-hero-hdr) .ms-hero-pill{display:none}
html.ex-hero-hdr #desk>.hero h1{
  margin:0 0 6px;font-size:clamp(23px,2.7vw,34px);line-height:1.12;font-weight:800;letter-spacing:-.015em;color:#fff!important;
}
html.ex-hero-hdr #desk>.hero h1 span{color:#7dd3fc}
html.ex-hero-hdr #desk>.hero p{margin:0;color:#dcecf7!important;font-size:13.5px;max-width:68ch;line-height:1.45}

/* Isi Halaman frosted dropdown di pojok kanan bawah hero */
html.ex-hero-hdr .pmo-pbar .pmo-crumb{display:none!important}
html.ex-hero-hdr :is(.hero,#exStuckHost) .pmo-pbar{
  position:relative!important;top:auto!important;margin:0!important;padding:0!important;
  border:0!important;background:transparent!important;-webkit-backdrop-filter:none!important;
  backdrop-filter:none!important;box-shadow:none!important;flex:none;overflow:visible!important;
}
html.ex-hero-hdr :is(.hero,#exStuckHost) .pmo-pbar[hidden]{display:none!important}
html.ex-hero-hdr :is(.hero,#exStuckHost) .pmo-pbar .pmo-pbar-r{min-height:0!important;overflow:visible!important}
html.ex-hero-hdr :is(.hero,#exStuckHost) .pmo-pbar .pmo-isi-drop{margin-left:0}
html.ex-hero-hdr :is(.hero,#exStuckHost) .pmo-pbar .pmo-isi-trig{
  height:38px;padding:0 13px;border-radius:11px;
  background:rgba(255,255,255,.12)!important;border:1px solid rgba(255,255,255,.28)!important;
  color:#fff!important;box-shadow:none!important;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
}
html.ex-hero-hdr :is(.hero,#exStuckHost) .pmo-pbar .pmo-isi-trig:hover,
html.ex-hero-hdr :is(.hero,#exStuckHost) .pmo-pbar .pmo-isi-drop.open .pmo-isi-trig{
  background:rgba(255,255,255,.22)!important;border-color:rgba(255,255,255,.46)!important;color:#fff!important;
}
html.ex-hero-hdr :is(.hero,#exStuckHost) .pmo-pbar .pmo-isi-trig .pmo-isi-l{color:rgba(219,234,254,.84)!important}
html.ex-hero-hdr :is(.hero,#exStuckHost) .pmo-pbar .pmo-isi-trig svg{color:#fff!important;opacity:.9}
html.ex-hero-hdr .hero>.pmo-pbar{grid-column:2;grid-row:2;align-self:end;justify-self:end;z-index:10!important}
html.ex-hero-hdr .hero>.pmo-pbar .pmo-isi-menu{background:var(--card,#fff)!important;border:1px solid var(--line,#dce5ed)!important;color:var(--ink,#132b43)!important;z-index:160!important}

/* Sticky Header Host saat scroll ke bawah */
#exStuckHost{
  position:fixed;top:0;right:0;left:var(--ex-stuck-left,0);z-index:48;
  background:var(--ex-stuck-top);color:#fff;box-shadow:0 10px 28px rgba(0,0,0,.24);
  border-bottom:1px solid rgba(255,255,255,.14);
  transform:translate3d(0,-104%,0);opacity:0;pointer-events:none;
  transition:transform .38s cubic-bezier(.22,1,.36,1),opacity .30s ease,background-color .30s ease;
  will-change:transform,opacity;
}
#exStuckHost[hidden]{display:none}
html.ex-hero-hdr.ex-hdr-stuck #exStuckHost{transform:translate3d(0,0,0);opacity:1;pointer-events:auto}
html.ex-hero-hdr #exStuckHost header.top{margin:0!important;padding:10px 24px!important;min-height:60px;border-bottom:0!important;gap:8px;flex-wrap:nowrap;align-items:center}
html.ex-hero-hdr #exStuckHost header.top .t{display:block!important;min-width:90px;flex:1 1 90px;overflow:hidden}
html.ex-hero-hdr #exStuckHost header.top .t small{color:rgba(255,255,255,.74);font-size:11px;display:block;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
html.ex-hero-hdr #exStuckHost header.top .t b{color:#fff!important;font-size:15px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#exStuckHost .pmo-isi-menu{background:var(--ex-stuck-menu)!important;border:1px solid rgba(255,255,255,.18)!important;box-shadow:0 18px 40px rgba(0,0,0,.44);z-index:160!important}
#exStuckHost .pmo-isi-menu .pmo-chip{color:rgba(255,255,255,.9)!important}
#exStuckHost .pmo-isi-menu .pmo-chip:hover{background:rgba(255,255,255,.12)!important;color:#fff!important}
#exStuckHost .pmo-isi-menu .pmo-chip.on{background:var(--ex-stuck-act)!important;color:#fff!important}

@media (max-width:1260px){
  html.ex-hero-hdr #exStuckHost header.top .acm-chip{max-width:170px}
  html.ex-hero-hdr #exStuckHost header.top .pmo-qs-trigger kbd{display:none!important}
}
@media (max-width:1060px){
  html.ex-hero-hdr #exStuckHost header.top{padding:10px 16px!important;gap:6px}
  html.ex-hero-hdr #exStuckHost .pmo-isi-trig .pmo-isi-l{display:none}
}
@media (prefers-reduced-motion:reduce){
  #exStuckHost,html.ex-hero-hdr :is(.hero,#exStuckHost) #cpTabs button,.ms-pop-list,.ms-pop-rail,.ms-pop-opt{transition:none!important;scroll-behavior:auto!important}
}
</style>`;

const MASTER_HERO_JS = String.raw`<script id="pmoMasterHeroJs">
(function(){
  if(window.__pmoMasterHeroInit)return;window.__pmoMasterHeroInit=true;
  var stuckTimer=0,syncRaf=0,metaRaf=0,msHudDrag=null,msHudSync=null;

  function deskEl(){return document.getElementById('desk')}
  function heroEl(){return document.querySelector('#desk>.hero')}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

  function heroTxtEl(hero){
    if(!hero)return null;
    for(var i=0;i<hero.children.length;i++){
      var el=hero.children[i];
      if(el.tagName==='DIV'&&el.id!=='exHeroSpacer'&&el.id!=='exPbarSpacer'&&!el.classList.contains('pmo-pbar')){
        el.classList.add('ms-hero-txt');
        return el;
      }
    }
    return hero.querySelector('.ms-hero-txt');
  }

  window.addEventListener('mousemove',function(e){
    if(!msHudDrag)return;
    var d=msHudDrag,sh=d.sc.scrollHeight,ch=d.sc.clientHeight,th=d.track.clientHeight||ch,bh=d.thumb.offsetHeight||28,use=Math.max(1,th-bh);
    d.sc.scrollTop=d.ds+((e.clientY-d.dy)/use)*(sh-ch);
  });
  window.addEventListener('mouseup',function(){
    if(!msHudDrag)return;
    msHudDrag.rail.classList.remove('dragging');
    msHudDrag=null;
  });

  function bindProjHudRail(body,sc,rail,track,thumb,moreEl){
    var scrT=null;
    function sync(){
      var sh=sc.scrollHeight,ch=sc.clientHeight,st=sc.scrollTop,max=Math.max(0,sh-ch),need=max>4;
      body.classList.toggle('has-top',need&&st>6);
      body.classList.toggle('has-bot',need&&st<max-6);
      rail.classList.toggle('needed',need);
      if(!need){moreEl.textContent='Semua tampil';moreEl.className='ms-pop-more done';return}
      var th=track.clientHeight||ch,bh=Math.max(28,Math.round((ch/sh)*th)),bt=Math.round((max?st/max:0)*(th-bh));
      thumb.style.height=bh+'px';
      thumb.style.transform='translateY('+bt+'px)';
      if(st>=max-6){moreEl.textContent='Akhir daftar';moreEl.className='ms-pop-more done'}
      else{moreEl.textContent='\u2193 Scroll untuk lainnya';moreEl.className='ms-pop-more'}
    }
    sc.addEventListener('scroll',function(){
      body.classList.add('scrolling');clearTimeout(scrT);
      scrT=setTimeout(function(){body.classList.remove('scrolling')},750);
      sync();
    },{passive:true});
    rail.addEventListener('mousedown',function(e){
      e.preventDefault();e.stopPropagation();
      var r=track.getBoundingClientRect();
      if(e.target!==thumb){var ratio=Math.max(0,Math.min(1,(e.clientY-r.top)/Math.max(1,r.height)));sc.scrollTop=ratio*(sc.scrollHeight-sc.clientHeight)}
      msHudDrag={sc:sc,rail:rail,track:track,thumb:thumb,dy:e.clientY,ds:sc.scrollTop};
      rail.classList.add('dragging');
    });
    return sync;
  }

  function ensureControls(hdr){
    if(!hdr)return;
    if(!document.getElementById('msTopSpacer')){
      var sp=document.createElement('span');
      sp.id='msTopSpacer';
      sp.className='ms-top-sp';
      var t=hdr.querySelector('.t');
      if(t&&t.nextSibling)hdr.insertBefore(sp,t.nextSibling);
      else hdr.appendChild(sp);
    }
    if(!document.getElementById('msProjWrap')){
      var pw=document.createElement('div');
      pw.id='msProjWrap';
      pw.className='pop-wrap ms-proj-wrap';
      pw.innerHTML='<button type="button" class="ms-gl-btn" id="msProjBtn" aria-haspopup="true" aria-expanded="false">'
        +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6"/></svg>'
        +'<span><span class="ms-pl">Proyek aktif</span><span class="ms-pn" id="msProjBtnName">Memuat…</span></span>'
        +'<svg class="ms-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
        +'</button>'
        +'<div class="ms-pop" id="msProjPop" hidden role="region" aria-label="Pilih Proyek Master Schedule">'
          +'<div class="ms-pop-top">'
            +'<div class="ms-pop-h"><span>Pilih Proyek</span><span class="ms-pop-cnt" id="msProjCount"></span></div>'
            +'<div class="ms-pop-qwrap">'
              +'<svg class="ms-pop-qic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'
              +'<input type="search" class="ms-pop-q" id="msProjSearch" placeholder="Cari proyek…" aria-label="Cari proyek" autocomplete="off">'
              +'<button type="button" class="ms-pop-clr" id="msProjClear" aria-label="Bersihkan pencarian">\u00d7</button>'
            +'</div>'
          +'</div>'
          +'<div class="ms-pop-body" id="msProjBody">'
            +'<div class="ms-pop-list" id="msProjList" tabindex="0" aria-label="Daftar proyek"></div>'
            +'<div class="ms-pop-rail" id="msProjRail" aria-hidden="true"><div class="ms-pop-track" id="msProjTrack"><div class="ms-pop-thumb" id="msProjThumb"></div></div></div>'
          +'</div>'
          +'<div class="ms-pop-foot"><span class="ms-pop-more" id="msProjMore"></span><span class="ms-pop-kbd">\u2191\u2193 \u00b7 Enter</span></div>'
        +'</div>';
      var anchor=hdr.querySelector('.pmo-qs-trigger,.ntf-wrap,#themeBtn');
      if(anchor)hdr.insertBefore(pw,anchor);else hdr.appendChild(pw);

      var btn=document.getElementById('msProjBtn'),pop=document.getElementById('msProjPop'),qInp=document.getElementById('msProjSearch'),clr=document.getElementById('msProjClear');
      var body=document.getElementById('msProjBody'),list=document.getElementById('msProjList'),rail=document.getElementById('msProjRail'),track=document.getElementById('msProjTrack'),thumb=document.getElementById('msProjThumb'),more=document.getElementById('msProjMore');
      msHudSync=bindProjHudRail(body,list,rail,track,thumb,more);

      btn.addEventListener('click',function(ev){
        ev.stopPropagation();
        var sel=document.getElementById('project');
        if(!sel||sel.options.length<2)return;
        var open=pop.hidden;
        if(open){qInp.value='';syncProjMenu();pop.hidden=false;pw.classList.add('open');btn.setAttribute('aria-expanded','true');requestAnimationFrame(function(){if(msHudSync)msHudSync();qInp.focus()});}
        else closeMenus();
      });
      pop.addEventListener('click',function(ev){ev.stopPropagation()});
      qInp.addEventListener('input',function(){list.scrollTop=0;syncProjMenu()});
      clr.addEventListener('click',function(ev){ev.stopPropagation();qInp.value='';qInp.focus();syncProjMenu()});
      pop.addEventListener('keydown',function(ev){
        var bs=Array.prototype.slice.call(list.querySelectorAll('.ms-pop-opt'));
        if(!bs.length)return;
        var idx=bs.indexOf(document.activeElement);
        if(ev.key==='ArrowDown'){ev.preventDefault();bs[Math.min(bs.length-1,idx+1)].focus()}
        else if(ev.key==='ArrowUp'){ev.preventDefault();if(idx<=0)qInp.focus();else bs[idx-1].focus()}
        else if(ev.key==='Escape'){closeMenus();btn.focus()}
      });
    }
    if(!window.__msHeroCloseBound){
      window.__msHeroCloseBound=true;
      document.addEventListener('click',function(){closeMenus()});
      document.addEventListener('keydown',function(ev){if(ev.key==='Escape')closeMenus()});
    }
  }

  function closeMenus(){
    var pw=document.getElementById('msProjWrap'),p=document.getElementById('msProjPop'),b=document.getElementById('msProjBtn');
    if(p)p.hidden=true;if(pw)pw.classList.remove('open');if(b)b.setAttribute('aria-expanded','false');
  }

  function syncProjMenu(){
    var sel=document.getElementById('project'),list=document.getElementById('msProjList'),btn=document.getElementById('msProjBtn'),lbl=document.getElementById('msProjBtnName');
    var qInp=document.getElementById('msProjSearch'),clr=document.getElementById('msProjClear'),cnt=document.getElementById('msProjCount');
    if(!sel||!lbl)return;
    var opts=Array.prototype.slice.call(sel.options||[]);
    var curOpt=opts.find(function(o){return o.selected})||opts[0];
    var pname=(curOpt&&curOpt.textContent)||'—';
    lbl.textContent=pname;
    if(btn)btn.classList.toggle('single',opts.length<2);
    if(!list)return;
    var rawQ=qInp?(qInp.value||''):'',ql=rawQ.trim().toLocaleLowerCase('id');
    if(clr)clr.classList.toggle('on',rawQ.length>0);
    var shown=opts.filter(function(o){return !ql||String(o.textContent||'').toLocaleLowerCase('id').indexOf(ql)>=0});
    if(cnt)cnt.textContent=shown.length+(ql?' dari '+opts.length:' Proyek');
    list.innerHTML='';
    if(!shown.length){
      var em=document.createElement('div');
      em.className='ms-pop-empty';
      em.innerHTML='Tidak ada proyek cocok dengan "<b>'+esc(rawQ.trim())+'</b>".';
      list.appendChild(em);
      if(msHudSync)msHudSync();
      return;
    }
    shown.forEach(function(o){
      var raw=String(o.textContent||'').trim();
      var done=/selesai$/i.test(raw);
      var nm=done?raw.replace(/\s*selesai$/i,'').trim():raw;
      var b=document.createElement('button');
      b.type='button';
      b.className='ms-pop-opt'+(o.selected?' on':'');
      b.innerHTML='<span class="ms-pop-nm">'+esc(nm)+'</span>'+(done?'<span class="ms-pop-bdg">Selesai</span>':'')+'<span class="ms-pop-go" aria-hidden="true">\u203a</span>';
      b.onclick=function(){
        closeMenus();
        if(sel.value!==o.value){
          sel.value=o.value;
          sel.dispatchEvent(new Event('change',{bubbles:true}));
        }
      };
      list.appendChild(b);
    });
    if(msHudSync)msHudSync();
  }

  function currentWeekBadgeText(){
    var wsel=document.getElementById('week');
    if(!wsel||wsel.disabled||!wsel.options||!wsel.options.length)return '';
    var cur=wsel.options[wsel.selectedIndex>=0?wsel.selectedIndex:0];
    var full=(cur&&cur.textContent)||'';
    if(!full||/Memuat|Belum/i.test(full))return '';
    var m=/^(W\d+)\s*·\s*(?:[^–]+–\s*)?(.+)$/.exec(full);
    return m?(m[1]+' · Cut-off '+m[2].trim()):full;
  }

  function syncHeroMeta(){
    var hero=heroEl();if(!hero)return;
    var txtWrap=heroTxtEl(hero);
    if(!txtWrap)return;
    var h1=txtWrap.querySelector('h1'),ey=txtWrap.querySelector('.ey'),sub=txtWrap.querySelector('p');

    var pn='';
    if(typeof MS!=='undefined'&&MS.data&&MS.data.project&&MS.data.project.name)pn=MS.data.project.name;
    if(!pn){
      var sel=document.getElementById('project');
      if(sel&&sel.selectedOptions&&sel.selectedOptions[0])pn=sel.selectedOptions[0].textContent||'';
    }
    if(!pn||/Memuat/i.test(pn)){
      var pt=document.getElementById('projTitle');
      if(pt&&pt.textContent){
        var rawPt=pt.textContent.trim();
        if(/^Master Schedule\s*·\s*/i.test(rawPt))pn=rawPt.replace(/^Master Schedule\s*·\s*/i,'').trim();
      }
    }
    if(h1){
      var wantProj=pn&&!/Memuat|Master Schedule/i.test(pn)?pn.trim():'';
      var nextHtml=wantProj?'Master Schedule — <span>'+esc(wantProj)+'</span>':'Master Schedule';
      if(h1.innerHTML!==nextHtml)h1.innerHTML=nextHtml;
    }

    var row=txtWrap.querySelector('.ms-hero-ey');
    if(ey&&!row){
      row=document.createElement('div');row.className='ms-hero-ey';
      ey.parentNode.insertBefore(row,ey);row.appendChild(ey);
    }
    if(row){
      var wp=document.getElementById('msHeroWeekPill'),lp=document.getElementById('msHeroWarnPill');
      if(!wp){wp=document.createElement('span');wp.id='msHeroWeekPill';wp.className='ms-hero-pill ok';row.appendChild(wp)}
      if(!lp){lp=document.createElement('span');lp.id='msHeroWarnPill';lp.className='ms-hero-pill warn';row.appendChild(lp)}
      var wTxt=currentWeekBadgeText();
      wp.hidden=!wTxt;
      if(wTxt&&wp.textContent!==wTxt)wp.textContent=wTxt;

      var warnCard=document.querySelector('#summary .kpi.kpi-warn .v');
      var warnTxt=warnCard?String(warnCard.textContent||'').replace(/\s+/g,' ').trim():'';
      lp.hidden=!warnTxt;
      if(warnTxt&&lp.textContent!==warnTxt)lp.textContent=warnTxt;
    }
    if(sub){
      var isCpm=deskEl()&&deskEl().classList.contains('cpm-on');
      var sTxt=isCpm
        ?'Analisis jalur kritis, total float, dan simulasi jadwal impor Primavera P6 / MS Project.'
        :'Telusuri proyek \u2192 bidang \u2192 group WBS \u2192 item, lalu bandingkan baseline aktif dengan progres dan deviasi pada week yang tercatat.';
      if(sub.textContent!==sTxt)sub.textContent=sTxt;
    }
    syncProjMenu();
  }

  function ensureStuckNodes(hero,mainEl){
    var host=document.getElementById('exStuckHost');
    if(!host&&mainEl){host=document.createElement('div');host.id='exStuckHost';host.hidden=true;mainEl.insertBefore(host,mainEl.firstChild)}
    var hSp=document.getElementById('exHeroSpacer');
    if(!hSp&&hero){hSp=document.createElement('div');hSp.id='exHeroSpacer';hero.insertBefore(hSp,hero.firstChild)}
    var pSp=document.getElementById('exPbarSpacer');
    if(!pSp&&hero&&hero.parentNode){pSp=document.createElement('div');pSp.id='exPbarSpacer';hero.parentNode.insertBefore(pSp,hero.nextSibling)}
    return {host:host,hSp:hSp,pSp:pSp};
  }

  function syncStuckRect(){
    var mainEl=document.querySelector('.main'),host=document.getElementById('exStuckHost');
    if(!mainEl||!host)return;
    var r=mainEl.getBoundingClientRect();
    host.style.setProperty('--ex-stuck-left',Math.max(0,Math.round(r.left))+'px');
  }

  function clearStuckState(nodes){
    clearTimeout(stuckTimer);
    var H=document.documentElement;
    H.classList.remove('ex-hdr-stuck','ex-hdr-mounted','ex-pbar-mounted');
    if(nodes.hSp&&nodes.hSp.style.height!=='0px')nodes.hSp.style.height='0px';
    if(nodes.pSp&&nodes.pSp.style.height!=='0px')nodes.pSp.style.height='0px';
    if(nodes.host&&!nodes.host.hidden)nodes.host.hidden=true;
  }

  function restoreInHero(hdr,pbar,hero,nodes){
    clearStuckState(nodes);
    if(hdr&&hero&&hdr.parentNode!==hero)hero.insertBefore(hdr,hero.firstChild);
    if(pbar&&hero&&pbar.parentNode!==hero)hero.appendChild(pbar);
    if(pbar&&pbar.style.top!=='0px')pbar.style.top='0px';
  }

  function syncScrollHeader(){
    var H=document.documentElement;
    if(!H.classList.contains('ex-hero-hdr'))return;
    var hero=heroEl(),mainEl=document.querySelector('.main'),hdr=document.querySelector('header.top'),pbar=document.getElementById('pmoPbar');
    if(!hero||!mainEl||!hdr)return;
    var nodes=ensureStuckNodes(hero,mainEl);
    syncStuckRect();

    var rect=hero.getBoundingClientRect();
    var wasStuck=H.classList.contains('ex-hdr-stuck');
    var wantStuck=wasStuck?(rect.bottom<108):(rect.bottom<58);

    if(wantStuck){
      if(!wasStuck){
        clearTimeout(stuckTimer);
        if(hdr.parentNode===hero&&nodes.hSp){
          nodes.hSp.style.height=Math.max(48,hdr.offsetHeight+12)+'px';
          H.classList.add('ex-hdr-mounted');
        }
        nodes.host.hidden=false;
        if(hdr.parentNode!==nodes.host)nodes.host.appendChild(hdr);
        if(pbar){
          var sp=document.getElementById('msProjWrap');
          if(sp&&sp.parentNode===hdr){if(pbar.parentNode!==hdr||pbar.nextElementSibling!==sp)hdr.insertBefore(pbar,sp)}
          else if(pbar.parentNode!==hdr)hdr.appendChild(pbar);
        }
        void nodes.host.offsetHeight;
        H.classList.add('ex-hdr-stuck');
      }else if(pbar&&pbar.parentNode!==hdr){
        var sp2=document.getElementById('msProjWrap');
        if(sp2&&sp2.parentNode===hdr)hdr.insertBefore(pbar,sp2);else hdr.appendChild(pbar);
      }
    }else if(wasStuck){
      H.classList.remove('ex-hdr-stuck');
      clearTimeout(stuckTimer);
      stuckTimer=setTimeout(function(){
        if(H.classList.contains('ex-hdr-stuck'))return;
        restoreInHero(hdr,pbar,hero,nodes);
      },320);
    }else{
      restoreInHero(hdr,pbar,hero,nodes);
    }
  }

  function syncUnifiedHeader(){
    var H=document.documentElement;
    var hero=heroEl(),desk=deskEl(),mainEl=document.querySelector('.main'),hdr=document.querySelector('header.top'),tabs=document.getElementById('cpTabs'),pbar=document.getElementById('pmoPbar');
    if(!hero||!desk||!mainEl||!hdr)return;
    var mob=window.innerWidth<=760||H.classList.contains('m-mode');

    if(mob){
      H.classList.remove('ex-hero-hdr');
      var host=document.getElementById('exStuckHost');
      clearStuckState({host:host,hSp:document.getElementById('exHeroSpacer'),pSp:document.getElementById('exPbarSpacer')});
      if(hdr.parentNode!==mainEl)mainEl.insertBefore(hdr,mainEl.firstChild);
      if(tabs&&tabs.parentNode!==desk){
        var sm=document.getElementById('summary');
        if(sm)desk.insertBefore(tabs,sm);else desk.appendChild(tabs);
      }
      if(pbar&&pbar.parentNode!==mainEl)mainEl.insertBefore(pbar,hdr.nextSibling);
      return;
    }

    H.classList.add('ex-hero-hdr');
    heroTxtEl(hero);
    ensureControls(hdr);
    if(tabs&&tabs.parentNode!==hdr){
      var t=hdr.querySelector('.t');
      hdr.insertBefore(tabs,t?t.nextSibling:hdr.firstChild);
    }
    syncHeroMeta();
    syncScrollHeader();
  }

  function schedSync(){if(!syncRaf)syncRaf=requestAnimationFrame(function(){syncRaf=0;syncUnifiedHeader()})}
  function schedMeta(){if(!metaRaf)metaRaf=requestAnimationFrame(function(){metaRaf=0;syncHeroMeta()})}

  window.addEventListener('scroll',function(){
    if(document.documentElement.classList.contains('ex-hero-hdr'))syncScrollHeader();
  },{passive:true});
  window.addEventListener('resize',schedSync,{passive:true});

  var sideNode=document.querySelector('aside.side');
  if(sideNode&&window.ResizeObserver){
    try{new ResizeObserver(function(){if(document.documentElement.classList.contains('ex-hero-hdr'))syncStuckRect()}).observe(sideNode)}catch(e){}
  }

  var mainNode=document.querySelector('.main');
  if(mainNode&&window.MutationObserver){
    new MutationObserver(function(){
      var mob=window.innerWidth<=760||document.documentElement.classList.contains('m-mode');
      var pbar=document.getElementById('pmoPbar');
      if(!mob&&pbar&&pbar.parentNode===mainNode)schedSync();
    }).observe(mainNode,{childList:true});
  }

  ['summary','project','week','projTitle'].forEach(function(id){
    var el=document.getElementById(id);
    if(el&&window.MutationObserver)new MutationObserver(schedMeta).observe(el,{childList:true,characterData:true,subtree:true});
  });

  if(typeof window.msAccept==='function'){
    var __origMsAccept=window.msAccept;
    window.msAccept=function(){
      var res=__origMsAccept.apply(this,arguments);
      schedMeta();
      return res;
    };
  }
  if(typeof window.msRender==='function'){
    var __origMsRender=window.msRender;
    window.msRender=function(){
      var res=__origMsRender.apply(this,arguments);
      schedMeta();
      return res;
    };
  }
  var tabsNode=document.getElementById('cpTabs');
  if(tabsNode){tabsNode.addEventListener('click',function(){setTimeout(schedMeta,0)})}

  syncUnifiedHeader();
  setTimeout(syncUnifiedHeader,150);
  setTimeout(syncUnifiedHeader,600);
})();
</script>`;

const MASTER_HERO_PATCHES = [
  {
    file: 'MasterSchedule',
    find: '</head>',
    replace: MASTER_HERO_CSS + '\n</head>',
  },
  {
    file: 'MasterSchedule',
    find: '</body>',
    replace: MASTER_HERO_JS + '\n</body>',
  },
];

module.exports = { MASTER_HERO_PATCHES };

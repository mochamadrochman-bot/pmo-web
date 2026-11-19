'use strict';

/**
 * Tata letak awal Executive Dashboard:
 * 1. Ringkasan Eksekutif di kiri, Story Lapangan (Floating Spatial Gallery) di kanan dengan tinggi sejajar
 *    yang memenuhi layar awal (card KPI di bawah tidak terlihat mengintip sebelum di-scroll).
 * 2. Story Lapangan menampilkan seluruh foto bulan terpilih secara melayang dan fokus bergantian setiap 3 detik.
 * 3. Saat foto galeri diklik, popup slideshow juga otomatis berganti foto setiap 3 detik dengan strip thumbnail.
 * 4. Responsif & rapi di mobile + kompatibel dengan mode HP satu tangan dan Mode Presentasi.
 */

const EXEC_STORY_BRIEF_CSS = String.raw`<style id="pmoExecStoryBriefCss">
.ex-top-split{display:grid;grid-template-columns:minmax(0,1.16fr) minmax(370px,1fr);gap:16px;align-items:stretch;margin:0 0 28px}
.ex-brief-shell{position:relative;grid-column:1;grid-row:1;height:var(--ex-split-h,470px);min-width:0;border-radius:var(--r,16px)}
.ex-brief-shell>#sec-ringkasan{margin:0!important;height:100%;display:block;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;padding-bottom:46px!important;box-sizing:border-box}
.ex-brief-shell>#sec-ringkasan::-webkit-scrollbar{display:none}
.ex-brief-rail{position:absolute;right:5px;top:12px;bottom:44px;width:9px;border-radius:99px;z-index:10;cursor:pointer;display:none;background:rgba(255,255,255,.22);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);border:1px solid rgba(15,23,42,.06)}
.ex-brief-rail.on{display:block}
.ex-brief-thumb{position:absolute;left:1px;right:1px;min-height:36px;border-radius:99px;background:rgba(19,43,67,.26);border:1px solid rgba(255,255,255,.45);transition:background .15s}
.ex-brief-rail:hover .ex-brief-thumb,.ex-brief-rail.drag .ex-brief-thumb{background:color-mix(in srgb,var(--pri,#0f5fa8) 80%,transparent)}
html[data-theme="dark"] .ex-brief-rail{background:rgba(15,23,42,.30);border-color:rgba(255,255,255,.10)}
html[data-theme="dark"] .ex-brief-thumb{background:rgba(226,232,240,.30);border-color:rgba(255,255,255,.16)}
html[data-theme="dark"] .ex-brief-rail:hover .ex-brief-thumb,html[data-theme="dark"] .ex-brief-rail.drag .ex-brief-thumb{background:rgba(56,189,248,.78)}
.ex-brief-sbtn{position:absolute;right:14px;bottom:10px;z-index:12;display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:0 13px;border-radius:99px;border:1px solid rgba(15,23,42,.13);background:rgba(255,255,255,.62);-webkit-backdrop-filter:blur(12px) saturate(1.3);backdrop-filter:blur(12px) saturate(1.3);color:var(--ink,#132b43);font:600 11.5px/1 inherit;cursor:pointer;box-shadow:0 6px 18px rgba(15,23,42,.10);transition:background .18s ease,border-color .18s ease,color .18s ease}
.ex-brief-sbtn:hover{background:color-mix(in srgb,var(--pri,#0f5fa8) 84%,transparent);border-color:var(--pri,#0f5fa8);color:#fff}
html[data-theme="dark"] .ex-brief-sbtn{background:rgba(15,23,42,.52);border-color:rgba(255,255,255,.18);color:#f1f5f9;box-shadow:0 6px 18px rgba(0,0,0,.28)}
html[data-theme="dark"] .ex-brief-sbtn:hover{background:rgba(14,165,233,.72);border-color:rgba(56,189,248,.65);color:#fff}
.ex-brief-sbtn[hidden]{display:none!important}
.ex-brief-tabs{display:inline-flex;flex-wrap:wrap;gap:4px;background:var(--tint,#f3f6fa);border:1px solid var(--line,#dce5ed);border-radius:99px;padding:3px}
.ex-brief-tab{border:0;background:transparent;color:var(--muted,#5b7085);padding:4px 10px;border-radius:99px;font:600 11.5px/1.2 inherit;cursor:pointer;white-space:nowrap}
.ex-brief-tab:hover{color:var(--ink,#132b43)}
.ex-brief-tab.on{background:var(--pri,#0f5fa8);color:#fff}
.ex-top-split>#sec-story{grid-column:2;grid-row:1;margin:0!important;height:var(--ex-split-h,470px);background:var(--card,#fff);border:1px solid var(--line,#dce5ed);border-radius:var(--r,16px);padding:16px 18px;box-shadow:var(--shadow,0 4px 18px rgba(15,23,42,.06));display:flex;flex-direction:column;overflow:hidden}
.ex-top-split>#sec-story .ex-sh{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin:0 0 10px;font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted,#5b7085)}
.ex-top-split>#sec-story .ex-sh>div:first-child{min-width:0;flex:1 1 auto;overflow:hidden}
.ex-top-split>#sec-story .gl-stories{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:visible!important;gap:10px;padding:0!important}

/* Reset inside Mode Presentasi supaya slide ringkasan tidak terpotong */
.pp #sec-ringkasan{height:auto!important;overflow:visible!important;grid-column:auto;grid-row:auto;padding-bottom:0!important}
.pp #sec-ringkasan .ex-brief-tabs,.pp .ex-brief-sbtn,.pp .ex-brief-rail{display:none!important}
.pp #sec-ringkasan [data-xbgrp]{display:block!important}

/* Desktop Header Controls menyatu ke dalam Banner Hero + transisi smooth sticky bertema saat scroll */
html.ex-hero-hdr{
  --ex-stuck-top:#073b63;--ex-stuck-sub:#0d4b7a;--ex-stuck-menu:#0b3356;--ex-stuck-act:#1e6fc0;
}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]){
  --ex-stuck-top:#0F2A1D;--ex-stuck-sub:#193d2b;--ex-stuck-menu:#123022;--ex-stuck-act:#375534;
}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]){
  --ex-stuck-top:#3B2A1F;--ex-stuck-sub:#4e382a;--ex-stuck-menu:#2d1f17;--ex-stuck-act:#6f4e37;
}
html.ex-hero-hdr[data-theme="dark"]{
  --ex-stuck-top:#0d1524;--ex-stuck-sub:#142033;--ex-stuck-menu:#0f1929;--ex-stuck-act:#2563eb;
}
html.ex-hero-hdr .content{padding-top:14px!important}
html.ex-hero-hdr .hero{position:relative;overflow:visible!important;z-index:34;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;align-items:end;column-gap:16px;padding:12px 24px 20px;min-height:156px}
html.ex-hero-hdr .hero::before{border-radius:inherit;overflow:hidden}
#exHeroSpacer{display:none;grid-column:1 / -1;grid-row:1;flex:none}#exPbarSpacer{display:none;flex:none}
html.ex-hero-hdr.ex-hdr-mounted #exHeroSpacer{display:block}
html.ex-hero-hdr.ex-pbar-mounted #exPbarSpacer{display:block}

/* Kontrol glass di dalam .hero (at top) maupun di dalam #exStuckHost (saat scroll) */
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar{position:relative!important;top:auto!important;z-index:8;background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border-bottom:1px solid rgba(255,255,255,.16)!important;padding:0 0 10px 0!important;margin:0 0 12px 0!important;gap:8px;flex-wrap:wrap}
html.ex-hero-hdr .hero>header.topbar{grid-column:1 / -1;grid-row:1}
html.ex-hero-hdr .hero>div:not(#exHeroSpacer):not(#exPbarSpacer):not(.pmo-pbar){grid-column:1;grid-row:2;min-width:0;z-index:5}
html.ex-hero-hdr .hero header.topbar .crumbs{display:none!important}
html.ex-hero-hdr .hero header.topbar .period-control{margin-left:auto}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .period-control{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);color:#fff;border-radius:11px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .period-control .step{height:38px;color:rgba(255,255,255,.88)}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .period-control .step:hover{background:rgba(255,255,255,.16);color:#fff}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .period-trigger{height:38px;min-width:190px;border-inline-color:rgba(255,255,255,.22);color:#fff}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .period-trigger:hover{background:rgba(255,255,255,.08)}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .period-trigger small{color:rgba(219,234,254,.82)}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .period-trigger b,html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .period-trigger .ic{color:#fff}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .pp-btn,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .ntf-wrap>button,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .pmo-qs-trigger,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .userchip{height:38px;background:rgba(255,255,255,.12)!important;border:1px solid rgba(255,255,255,.28)!important;color:#fff!important;box-shadow:none!important;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .pp-btn:hover,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .ntf-wrap>button:hover,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .pmo-qs-trigger:hover,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .userchip:hover{background:rgba(255,255,255,.22)!important}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .userchip .ut b,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .userchip .ut small,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .userchip .caretic,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .pmo-qs-trigger *,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .pp-btn *,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .ntf-wrap>button svg{color:#fff!important}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .pmo-qs-trigger kbd{background:rgba(255,255,255,.16)!important;border-color:rgba(255,255,255,.32)!important;color:#fff!important}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .pop{background:var(--card,#fff);color:var(--ink,#132b43);z-index:80}
html.ex-hero-hdr .pmo-pbar .pmo-crumb{display:none!important}
html.ex-hero-hdr .hero>.pmo-pbar{grid-column:2;grid-row:2;align-self:end;justify-self:end;position:relative!important;top:auto!important;z-index:7;margin:0!important;padding:0!important;border:0!important;background:transparent!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;box-shadow:none!important}
html.ex-hero-hdr .hero>.pmo-pbar[hidden]{display:none!important}
html.ex-hero-hdr .hero>.pmo-pbar .pmo-pbar-r{min-height:0!important;overflow:visible!important}
html.ex-hero-hdr .hero>.pmo-pbar .pmo-isi-drop{margin-left:0}
html.ex-hero-hdr .hero>.pmo-pbar .pmo-isi-trig{height:38px;padding:0 14px;border-radius:11px;background:rgba(255,255,255,.12)!important;border:1px solid rgba(255,255,255,.28)!important;color:#fff!important;box-shadow:none!important;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
html.ex-hero-hdr .hero>.pmo-pbar .pmo-isi-trig:hover,html.ex-hero-hdr .hero>.pmo-pbar .pmo-isi-drop.open .pmo-isi-trig{background:rgba(255,255,255,.22)!important;border-color:rgba(255,255,255,.46)!important;color:#fff!important}
html.ex-hero-hdr .hero>.pmo-pbar .pmo-isi-trig .pmo-isi-l{color:rgba(219,234,254,.84)!important}
html.ex-hero-hdr .hero>.pmo-pbar .pmo-isi-trig svg{color:#fff!important;opacity:.9}
html.ex-hero-hdr .hero>.pmo-pbar .pmo-isi-menu{background:var(--card,#fff)!important;border:1px solid var(--line,#dce5ed)!important;color:var(--ink,#132b43)!important;z-index:80}
html.ex-hero-hdr .content>.notice{margin-top:12px}
html.ex-hero-hdr .anchor{scroll-margin-top:112px!important}

/* Sticky Header Host: muncul sangat smooth dengan latar tema saat scroll melewati banner */
#exStuckHost{position:fixed;top:0;right:0;left:var(--ex-stuck-left,0);z-index:48;background:var(--ex-stuck-top);color:#fff;box-shadow:0 12px 32px rgba(0,0,0,.26);border-bottom:1px solid rgba(255,255,255,.14);transform:translate3d(0,-104%,0);opacity:0;pointer-events:none;transition:transform .38s cubic-bezier(.22,1,.36,1),opacity .30s ease,background-color .30s ease;will-change:transform,opacity}
#exStuckHost[hidden]{display:none}
html.ex-hero-hdr.ex-hdr-stuck #exStuckHost{transform:translate3d(0,0,0);opacity:1;pointer-events:auto}
#exStuckHost header.topbar{margin:0!important;padding:9px 24px!important;border-bottom:1px solid rgba(255,255,255,.12)!important}
#exStuckHost header.topbar .crumbs{display:block!important;min-width:0;flex:1}
#exStuckHost header.topbar .crumbs small{color:rgba(255,255,255,.74);font-size:11px}
#exStuckHost header.topbar .crumbs h2{color:#fff;font-size:16.5px;margin:0}
#exStuckHost .pmo-pbar{position:relative!important;top:auto!important;margin:0!important;border:0!important;border-radius:0!important;padding:0 24px!important;background:var(--ex-stuck-sub)!important;color:#fff;box-shadow:none!important;transition:background-color .30s ease}
#exStuckHost .pmo-pbar-r{min-height:38px;justify-content:flex-end}
#exStuckHost .pmo-isi-trig{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.28);color:#fff;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
#exStuckHost .pmo-isi-trig:hover,#exStuckHost .pmo-isi-drop.open .pmo-isi-trig{background:rgba(255,255,255,.24);border-color:rgba(255,255,255,.5);color:#fff}
#exStuckHost .pmo-isi-trig .pmo-isi-l{color:rgba(255,255,255,.8)}
#exStuckHost .pmo-isi-menu{background:var(--ex-stuck-menu)!important;border:1px solid rgba(255,255,255,.18)!important;box-shadow:0 18px 40px rgba(0,0,0,.44)}
#exStuckHost .pmo-isi-menu .pmo-chip{color:rgba(255,255,255,.9)!important}
#exStuckHost .pmo-isi-menu .pmo-chip:hover{background:rgba(255,255,255,.12)!important;color:#fff!important}
#exStuckHost .pmo-isi-menu .pmo-chip.on{background:var(--ex-stuck-act)!important;color:#fff!important}
html.pp-open #exStuckHost{display:none!important}

/* 1. Hapus Card Ringkasan per Kelompok & 2. Susun Vertikal Peta Deviasi + Realisasi Keuangan */
#pmoGroupSummary{display:none!important}
#content .g-ov{grid-template-columns:minmax(0,1fr)!important;gap:16px}
@media (min-width:960px){#content #financePanel .xg-fin-wrap{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}}

/* Floating Spatial Gallery ("Rethinking the Gallery") */
.ex-gal-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ex-gal-sub{display:block;margin-top:3px;font-size:11.5px;color:var(--muted,#5b7085);font-weight:500;text-transform:none;letter-spacing:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ex-gal-ctrl{display:flex;align-items:center;gap:5px;flex-shrink:0}
.ex-gbtn{border:1px solid var(--line,#dce5ed);background:var(--tint,#f7fafc);color:var(--ink,#132b43);height:28px;min-width:28px;padding:0 9px;border-radius:8px;font:600 12px/1 inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap}
.ex-gbtn:hover{border-color:var(--pri,#0f5fa8);color:var(--pri-ink,#0f5fa8)}

.ex-gal-stage{position:relative;flex:1 1 auto;min-height:260px;border-radius:12px;background:radial-gradient(circle at 50% 45%,#162a42 0%,#0b1626 100%);overflow:hidden;perspective:1100px;border:1px solid rgba(255,255,255,.1)}
.ex-gal-stage::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 52%,rgba(56,189,248,.14),transparent 62%);pointer-events:none}
.ex-fcard{position:absolute;top:50%;left:50%;width:210px;height:202px;border-radius:14px;overflow:hidden;cursor:pointer;background:#102437;border:1px solid rgba(255,255,255,.22);box-shadow:0 16px 36px rgba(0,0,0,.44);transform-origin:center center;transition:transform .68s cubic-bezier(.22,1,.36,1),opacity .55s ease,filter .55s ease,box-shadow .55s ease;will-change:transform,opacity}
.ex-fcard-in{width:100%;height:100%;position:relative;animation:exFloat 5.2s ease-in-out infinite}
.ex-fcard[data-pos="1"] .ex-fcard-in{animation-delay:-.8s}
.ex-fcard[data-pos="2"] .ex-fcard-in{animation-delay:-1.9s}
.ex-fcard[data-pos="3"] .ex-fcard-in{animation-delay:-3.1s}
.ex-fcard[data-pos="4"] .ex-fcard-in{animation-delay:-4.2s}
.ex-fcard[data-pos="5"] .ex-fcard-in{animation-delay:-2.4s}
@keyframes exFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}

.ex-fcard.is-focus{width:254px;height:242px;z-index:20!important;opacity:1!important;filter:brightness(1.04) saturate(1.06)!important;border:2px solid rgba(255,255,255,.88);box-shadow:0 24px 52px rgba(0,0,0,.62),0 0 0 4px rgba(59,130,246,.28)}
.ex-fcard:not(.is-focus){filter:brightness(.72) saturate(.85);opacity:.84}
.ex-fcard:not(.is-focus):hover{filter:brightness(.94) saturate(1);opacity:.96}
.ex-fcard img{width:100%;height:100%;object-fit:cover;display:block}
.ex-fscrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(9,18,30,.12) 0%,rgba(9,18,30,.16) 46%,rgba(9,18,30,.92) 100%)}
.ex-ftag{position:absolute;top:9px;left:9px;background:rgba(11,22,38,.78);color:#e2e8f0;border:1px solid rgba(255,255,255,.16);padding:3px 8px;border-radius:99px;font-size:10.5px;font-weight:700;max-width:calc(100% - 18px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ex-fmeta{position:absolute;left:11px;right:11px;bottom:10px;color:#fff}
.ex-fmeta b{display:block;font-size:12.5px;line-height:1.25;text-shadow:0 1px 4px rgba(0,0,0,.65)}
.ex-fmeta small{display:block;font-size:10.5px;color:#cbd5e1;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ex-fcard:not(.is-focus) .ex-fmeta small{display:none}

.ex-gal-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;flex-wrap:wrap;flex-shrink:0}
.ex-gal-dots{display:flex;flex-wrap:wrap;gap:5px;align-items:center;flex:1 1 220px;min-width:0}
.ex-gdot{border:1px solid var(--line,#dce5ed);background:var(--tint,#f7fafc);color:var(--muted,#5b7085);border-radius:99px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;line-height:1.25;text-align:left}
.ex-gdot.on{background:var(--pri,#0f5fa8);border-color:var(--pri,#0f5fa8);color:#fff}

/* Auto-cycling Slideshow Lightbox */
.ex-lb{position:fixed;inset:0;background:rgba(9,18,30,.84);z-index:100400;display:flex;align-items:center;justify-content:center;padding:16px}
.ex-lb[hidden]{display:none}
.ex-lb-box{background:var(--card,#fff);color:var(--ink,#132b43);border:1px solid var(--line,#dce5ed);border-radius:16px;max-width:820px;width:100%;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.5)}
.ex-lb-stage{position:relative;background:#0b1626}
.ex-lb-img{width:100%;height:450px;object-fit:contain;display:block;transition:opacity .25s ease;background:#0b1626}
.ex-lb-cnt{position:absolute;top:12px;left:12px;background:rgba(11,22,38,.78);color:#f8fafc;border:1px solid rgba(255,255,255,.18);padding:4px 10px;border-radius:99px;font-size:11.5px;font-weight:700}
.ex-lb-nav{position:absolute;top:50%;transform:translateY(-50%);width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.28);background:rgba(11,22,38,.74);color:#fff;font-size:20px;cursor:pointer;display:grid;place-items:center}
.ex-lb-nav:hover{background:var(--pri,#0f5fa8)}
.ex-lb-nav.prev{left:12px}.ex-lb-nav.next{right:12px}
.ex-lb-prog{height:3px;background:var(--line,#dce5ed);width:100%;overflow:hidden}
.ex-lb-prog i{display:block;height:100%;background:var(--pri,#0f5fa8);width:0%;transition:width .18s linear}
.ex-lb-foot{padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.ex-lb-acts{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ex-lb-strip{display:flex;gap:7px;padding:0 16px 14px;overflow-x:auto}
.ex-lb-thumb{flex:0 0 78px;height:52px;border-radius:8px;overflow:hidden;cursor:pointer;border:2px solid transparent;opacity:.55;transition:.15s;background:#0b1626;padding:0}
.ex-lb-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.ex-lb-thumb.on{border-color:var(--pri,#0f5fa8);opacity:1}

@media (max-width:1080px){
  .ex-top-split{grid-template-columns:1fr;margin-bottom:18px}
  .ex-brief-shell,.ex-top-split>#sec-story{grid-column:1;grid-row:auto;height:auto!important;min-height:0}
  .ex-brief-shell>#sec-ringkasan{height:auto!important;overflow:visible!important;padding-bottom:16px!important}
  .ex-brief-sbtn,.ex-brief-rail{display:none!important}
}
@media (max-width:760px){
  .ex-top-split>#sec-story,.ex-brief-shell>#sec-ringkasan{padding:13px 14px}
  .ex-gal-stage{height:245px;min-height:245px}
  .ex-fcard{width:136px;height:142px}
  .ex-fcard.is-focus{width:188px;height:194px}
  .ex-lb-img{height:260px}
}
html.m-mode .ex-top-split{grid-template-columns:1fr;margin-bottom:14px}
html.m-mode .ex-brief-shell,html.m-mode .ex-top-split>#sec-story{grid-column:1;grid-row:auto;height:auto!important;min-height:0}
html.m-mode .ex-brief-shell>#sec-ringkasan,html.m-mode .ex-top-split>#sec-story{padding:13px 14px;overflow:visible!important;height:auto!important}
html.m-mode .ex-brief-sbtn,html.m-mode .ex-brief-rail{display:none!important}
html.m-mode .ex-gal-stage{height:245px;min-height:245px}
html.m-mode .ex-fcard{width:136px;height:142px}
html.m-mode .ex-fcard.is-focus{width:188px;height:194px}
</style>`;

const EXEC_STORY_BRIEF_JS = String.raw`<script id="pmoExecStoryBriefJs">
(function(){
  if(window.__pmoExecStoryBriefInit)return;window.__pmoExecStoryBriefInit=true;

  var MON=['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
  function keyOf(v){
    v=String(v||'').trim();
    if(/^\d{4}-\d{2}$/.test(v))return v;
    var s=v.toLowerCase(),y=s.match(/(\d{4})/);
    if(!y)return '';
    for(var i=0;i<12;i++)if(s.indexOf(MON[i])>=0)return y[1]+'-'+('0'+(i+1)).slice(-2);
    return '';
  }
  function nowKey(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function niceName(n){
    try{if(typeof pmoProjName==='function')return pmoProjName(n);}catch(e){}
    return String(n||'').toLowerCase().replace(/(^|[\s(\-\/])([a-z])/g,function(m,a,c){return a+c.toUpperCase();}).replace(/\b(Csu|Sa|Ubb|Pt|Npk)\b/g,function(w){return w.toUpperCase();});
  }
  function tok(){
    try{if(typeof token!=='undefined'&&token)return token;}catch(e){}
    try{return sessionStorage.getItem('pmoSessionToken')||'';}catch(e){return '';}
  }
  function drv(id,w){return 'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w'+(w||800);}

  var srvCache={};
  function loadImgTag(img,id,w){
    if(!img||!id)return;
    var k=w+':'+id;
    if(srvCache[k]){img.src=srvCache[k];return;}
    img.onerror=function(){
      img.onerror=null;
      if(typeof google==='undefined'||!google.script||!google.script.run)return;
      google.script.run.withSuccessHandler(function(r){
        var m=r&&r.images||{};
        if(m[id]){srvCache[k]=m[id];if(img.isConnected)img.src=m[id];}
      }).withFailureHandler(function(){}).getGalleryThumbs(tok(),[id],w);
    };
    img.src=drv(id,w);
  }

  /* 1. Scroll modern dalam Ringkasan + Filter cepat Pengembangan / Investasi Rutin + full-viewport 2-kolom */
  var briefTabGrp='all';
  function applyBriefFilter(){
    var sec=document.getElementById('sec-ringkasan');
    if(!sec)return;
    var nodes=sec.querySelectorAll('.xbn-memo [data-xbgrp]');
    nodes.forEach(function(n){
      n.style.display=(briefTabGrp==='all'||n.getAttribute('data-xbgrp')===briefTabGrp)?'':'none';
    });
    sec.querySelectorAll('.ex-brief-tab').forEach(function(b){
      b.classList.toggle('on',b.getAttribute('data-g')===briefTabGrp);
    });
  }

  function mountBriefTabs(){
    var sec=document.getElementById('sec-ringkasan');
    if(!sec)return;
    var memo=sec.querySelector('.xbn-memo');
    var head=sec.querySelector('.xbn-head');
    if(!memo||!head)return;
    var heads=[];
    var curGrp=-1;
    Array.prototype.slice.call(memo.children).forEach(function(ch){
      if(ch.classList&&ch.classList.contains('xbn-h')){
        curGrp++;
        heads.push({idx:String(curGrp),label:String(ch.textContent||'').replace(/\s+/g,' ').trim()});
      }
      if(curGrp>=0)ch.setAttribute('data-xbgrp',String(curGrp));
    });
    if(heads.length<2)return;
    var tabs=head.querySelector('.ex-brief-tabs');
    if(!tabs){
      tabs=document.createElement('div');
      tabs.className='ex-brief-tabs';
      tabs.setAttribute('role','tablist');
      tabs.innerHTML='<button type="button" class="ex-brief-tab" data-g="all">Semua</button>'+
        heads.map(function(g){
          var shortLbl=/rutin/i.test(g.label)?'2. Investasi Rutin':(/pengembangan/i.test(g.label)?'1. Pengembangan':g.label);
          return '<button type="button" class="ex-brief-tab" data-g="'+g.idx+'">'+esc(shortLbl)+'</button>';
        }).join('');
      head.appendChild(tabs);
      tabs.addEventListener('click',function(e){
        var b=e.target.closest('.ex-brief-tab');
        if(!b)return;
        briefTabGrp=b.getAttribute('data-g')||'all';
        applyBriefFilter();
        sec.scrollTop=0;
        syncBriefScroll();
      });
    }
    applyBriefFilter();
  }

  function syncBriefScroll(){
    var shell=document.getElementById('exBriefShell');
    var sec=document.getElementById('sec-ringkasan');
    if(!shell||!sec)return;

    var rail=document.getElementById('exBriefRail');
    var thumb=document.getElementById('exBriefThumb');
    if(!rail){
      rail=document.createElement('div');
      rail.id='exBriefRail';
      rail.className='ex-brief-rail';
      rail.setAttribute('aria-hidden','true');
      thumb=document.createElement('div');
      thumb.id='exBriefThumb';
      thumb.className='ex-brief-thumb';
      rail.appendChild(thumb);
      shell.appendChild(rail);
      var dragBrief=false;
      var moveBrief=function(cy){
        var rect=rail.getBoundingClientRect(),th=thumb.offsetHeight||36;
        var ratio=Math.min(1,Math.max(0,(cy-rect.top-th/2)/Math.max(1,rect.height-th)));
        sec.scrollTop=ratio*Math.max(0,sec.scrollHeight-sec.clientHeight);
      };
      rail.addEventListener('pointerdown',function(e){
        dragBrief=true;rail.classList.add('drag');
        try{rail.setPointerCapture(e.pointerId);}catch(x){}
        moveBrief(e.clientY);
      });
      rail.addEventListener('pointermove',function(e){if(dragBrief)moveBrief(e.clientY);});
      rail.addEventListener('pointerup',function(){dragBrief=false;rail.classList.remove('drag');});
    }

    var btn=document.getElementById('exBriefScrollBtn');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.id='exBriefScrollBtn';
      btn.className='ex-brief-sbtn';
      btn.hidden=true;
      btn.onclick=function(){
        var atBot=sec.scrollTop+sec.clientHeight>=sec.scrollHeight-24;
        if(atBot)sec.scrollTo({top:0,behavior:'smooth'});
        else sec.scrollTo({top:Math.min(sec.scrollHeight,sec.scrollTop+Math.max(180,Math.round(sec.clientHeight*0.72))),behavior:'smooth'});
      };
      sec.addEventListener('scroll',syncBriefScroll,{passive:true});
      shell.appendChild(btn);
    }

    var mob=window.innerWidth<=1080||document.documentElement.classList.contains('m-mode');
    var maxScroll=Math.max(0,sec.scrollHeight-sec.clientHeight);
    var hasMore=!mob&&maxScroll>16;
    btn.hidden=!hasMore;
    rail.classList.toggle('on',hasMore);
    if(hasMore){
      var ratio=Math.min(1,Math.max(0,sec.scrollTop/maxScroll));
      var th=Math.max(36,Math.round((sec.clientHeight/sec.scrollHeight)*rail.clientHeight));
      thumb.style.height=th+'px';
      thumb.style.top=Math.round(ratio*Math.max(0,rail.clientHeight-th))+'px';
      var atBot=sec.scrollTop+sec.clientHeight>=sec.scrollHeight-24;
      btn.textContent=atBot?'↑ Ke atas':'↓ Baca selengkapnya';
      btn.setAttribute('aria-label',atBot?'Gulir ringkasan ke atas':'Gulir ringkasan ke bawah');
    }
  }

  var stuckTimer=0;
  function ensureStuckNodes(hero,content,mainEl){
    var host=document.getElementById('exStuckHost');
    if(!host&&mainEl){
      host=document.createElement('div');
      host.id='exStuckHost';
      host.hidden=true;
      mainEl.insertBefore(host,mainEl.firstChild);
    }
    var hSp=document.getElementById('exHeroSpacer');
    if(!hSp&&hero){
      hSp=document.createElement('div');
      hSp.id='exHeroSpacer';
      hero.insertBefore(hSp,hero.firstChild);
    }
    var pSp=document.getElementById('exPbarSpacer');
    if(!pSp&&hero&&content){
      pSp=document.createElement('div');
      pSp.id='exPbarSpacer';
      content.insertBefore(pSp,hero.nextSibling);
    }
    return {host:host,hSp:hSp,pSp:pSp};
  }

  function syncStuckRect(){
    var mainEl=document.querySelector('.main');
    var host=document.getElementById('exStuckHost');
    if(!mainEl||!host)return;
    var r=mainEl.getBoundingClientRect();
    host.style.setProperty('--ex-stuck-left',Math.max(0,Math.round(r.left))+'px');
  }

  function restoreInHero(hdr,pbar,hero,content,nodes){
    clearTimeout(stuckTimer);
    document.documentElement.classList.remove('ex-hdr-stuck','ex-hdr-mounted','ex-pbar-mounted');
    if(nodes.hSp)nodes.hSp.style.height='0px';
    if(nodes.pSp)nodes.pSp.style.height='0px';
    if(nodes.host)nodes.host.hidden=true;
    if(hdr&&hero&&hdr.parentNode!==hero)hero.insertBefore(hdr,hero.firstChild);
    if(pbar&&hero&&pbar.parentNode!==hero)hero.appendChild(pbar);
    if(pbar)pbar.style.top='0px';
  }

  function syncScrollHeader(){
    var H=document.documentElement;
    if(!H.classList.contains('ex-hero-hdr'))return;
    var hero=document.querySelector('.content>.hero');
    var content=document.querySelector('.main>.content');
    var mainEl=document.querySelector('.main');
    var hdr=document.querySelector('header.topbar');
    var pbar=document.getElementById('pmoPbar');
    if(!hero||!content||!mainEl||!hdr)return;
    var nodes=ensureStuckNodes(hero,content,mainEl);
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
        if(pbar&&pbar.parentNode===content&&nodes.pSp){
          nodes.pSp.style.height=(pbar.offsetHeight+10)+'px';
          H.classList.add('ex-pbar-mounted');
        }
        nodes.host.hidden=false;
        if(hdr.parentNode!==nodes.host)nodes.host.appendChild(hdr);
        if(pbar&&pbar.parentNode!==nodes.host)nodes.host.appendChild(pbar);
        void nodes.host.offsetHeight;
        H.classList.add('ex-hdr-stuck');
      }
    }else if(wasStuck){
      if(window.scrollY<18){
        restoreInHero(hdr,pbar,hero,content,nodes);
      }else{
        H.classList.remove('ex-hdr-stuck');
        clearTimeout(stuckTimer);
        stuckTimer=setTimeout(function(){
          if(!H.classList.contains('ex-hdr-stuck')&&H.classList.contains('ex-hero-hdr')){
            restoreInHero(hdr,pbar,hero,content,nodes);
          }
        },300);
      }
    }
  }

  function syncUnifiedHeader(){
    var mob=window.innerWidth<=900||document.documentElement.classList.contains('m-mode');
    var hdr=document.querySelector('header.topbar');
    var hero=document.querySelector('.content>.hero');
    var content=document.querySelector('.main>.content');
    var mainEl=document.querySelector('.main');
    var pbar=document.getElementById('pmoPbar');
    var use=!mob&&!!(hdr&&hero&&content);
    document.documentElement.classList.toggle('ex-hero-hdr',use);
    if(!hdr||!hero||!content||!mainEl)return;
    var nodes=ensureStuckNodes(hero,content,mainEl);
    if(use){
      if(!document.documentElement.classList.contains('ex-hdr-stuck')){
        restoreInHero(hdr,pbar,hero,content,nodes);
      }
      syncScrollHeader();
    }else{
      clearTimeout(stuckTimer);
      document.documentElement.classList.remove('ex-hdr-stuck','ex-hdr-mounted','ex-pbar-mounted');
      if(nodes.hSp)nodes.hSp.style.height='0px';
      if(nodes.pSp)nodes.pSp.style.height='0px';
      if(nodes.host)nodes.host.hidden=true;
      if(hdr.parentNode!==mainEl)mainEl.insertBefore(hdr,content);
      if(pbar&&pbar.parentNode!==mainEl)mainEl.insertBefore(pbar,content);
    }
  }

  window.addEventListener('scroll',syncScrollHeader,{passive:true});
  (function(){
    var navBtn=document.querySelector('[data-toggle-nav]');
    if(navBtn&&!navBtn.dataset.exStuckBound){
      navBtn.dataset.exStuckBound='1';
      navBtn.addEventListener('click',function(){setTimeout(syncStuckRect,220);});
    }
    var mainEl=document.querySelector('.main');
    if(mainEl&&window.ResizeObserver&&!window._exMainRO){
      window._exMainRO=new ResizeObserver(syncStuckRect);
      window._exMainRO.observe(mainEl);
    }
  })();

  function fitTopSplit(){
    syncUnifiedHeader();
    var split=document.getElementById('exTopSplit');
    if(!split)return;
    var mob=window.innerWidth<=1080||document.documentElement.classList.contains('m-mode');
    if(mob){
      split.style.removeProperty('--ex-split-h');
      positionCards();
      mountBriefTabs();
      syncBriefScroll();
      return;
    }
    var content=document.getElementById('content');
    if(!content||content.style.display==='none'||split.offsetParent===null)return;
    if(window.scrollY<60){
      var topY=split.getBoundingClientRect().top;
      var h=Math.max(440,Math.round(window.innerHeight-topY-20));
      split.style.setProperty('--ex-split-h',h+'px');
    }
    positionCards();
    mountBriefTabs();
    syncBriefScroll();
  }
  window.addEventListener('resize',fitTopSplit);
  (function(){
    var sec=document.getElementById('sec-ringkasan');
    if(sec&&window.MutationObserver&&!sec.__exObs){
      sec.__exObs=true;
      var tm=0;
      new MutationObserver(function(){
        if(tm)return;
        tm=setTimeout(function(){tm=0;mountBriefTabs();syncBriefScroll();},60);
      }).observe(sec,{childList:true,subtree:true});
    }
  })();

  /* Tag #exBriefShell & #sec-story untuk tab Ringkasan di Mode HP satu tangan */
  function tagStoryMobile(){
    var sh=document.getElementById('exBriefShell');
    if(sh&&!sh.getAttribute('data-mtab'))sh.setAttribute('data-mtab','ringkasan');
    var st=document.getElementById('sec-story');
    if(st&&!st.getAttribute('data-mtab'))st.setAttribute('data-mtab','ringkasan');
  }
  tagStoryMobile();

  /* 2. Floating Spatial Story Gallery (3 detik auto-focus) + Slideshow Lightbox (3 detik auto-advance) */
  var DESKTOP_SLOTS=[
    {x:0,   y:0,   s:1.0,  r:0,  z:20},
    {x:168, y:-22, s:0.78, r:7,  z:12},
    {x:-168,y:-18, s:0.76, r:-7, z:11},
    {x:135, y:72,  s:0.65, r:-5, z:7},
    {x:-138,y:70,  s:0.64, r:5,  z:6},
    {x:0,   y:-86, s:0.55, r:2,  z:4}
  ];
  var MOBILE_SLOTS=[
    {x:0,   y:4,   s:1.0,  r:0,  z:20},
    {x:104, y:-14, s:0.72, r:6,  z:12},
    {x:-104,y:-12, s:0.72, r:-6, z:11},
    {x:80,  y:48,  s:0.58, r:-4, z:7},
    {x:-82, y:46,  s:0.58, r:4,  z:6},
    {x:0,   y:-54, s:0.52, r:1,  z:4}
  ];

  var idxCache=null,allPhotos=[],projChips=[],focusIdx=0,playing=true,hoverPaused=false,curAk='';
  var lbEl=null,lbIdx=0,lbPlaying=true,lbHoverPaused=false,lbElapsed=0;
  var INTERVAL_MS=3000;

  function pickMonth(p,ak){
    var ms=p&&p.months||[];
    if(!ms.length)return null;
    if(!ak)return ms[ms.length-1];
    for(var i=ms.length-1;i>=0;i--)if(ms[i].key<=ak)return ms[i];
    return null;
  }

  function buildPhotoList(idxData,period){
    curAk=keyOf(period)||nowKey();
    var list=[],chips=[];
    var projects=(idxData&&idxData.projects||[]).filter(function(p){return p.months&&p.months.length;});
    projects.forEach(function(p){
      var m=pickMonth(p,curAk);
      if(!m||!m.photos||!m.photos.length)return;
      var pname=niceName(p.name);
      var startAt=list.length;
      m.photos.forEach(function(ph,k){
        list.push({
          projId:p.id,
          projName:pname,
          monthKey:m.key,
          monthLabel:m.label,
          photoId:ph.id,
          cap:ph.cap||('Foto lapangan '+(k+1)),
          date:ph.date||'',
          actual:m.actual,
          plan:m.plan,
          idxInMonth:k+1,
          monthCount:m.photos.length
        });
      });
      chips.push({projId:p.id,label:pname,count:m.photos.length,startAt:startAt});
    });
    allPhotos=list;
    projChips=chips;
    if(focusIdx>=allPhotos.length)focusIdx=0;
  }

  function ensureHeaderAndHost(){
    var sec=document.getElementById('sec-story');
    if(!sec)return null;
    var sh=sec.querySelector('.ex-sh');
    if(sh&&!sh.querySelector('.ex-gal-ctrl')){
      sh.innerHTML='<div><span>Story Lapangan <span id="exStoryPer"></span></span><small class="ex-gal-sub" id="exGalSub">Fokus bergantian tiap 3 detik · Klik foto untuk melihat</small></div>'+
        '<div class="ex-gal-ctrl">'+
        '<button type="button" class="ex-gbtn" id="exGalPrev" title="Foto sebelumnya">‹</button>'+
        '<button type="button" class="ex-gbtn" id="exGalPlay" title="Jeda/Putar rotasi fokus">❚❚</button>'+
        '<button type="button" class="ex-gbtn" id="exGalNext" title="Foto berikutnya">›</button>'+
        '</div>';
      sh.querySelector('#exGalPrev').onclick=function(){stepFocus(-1);};
      sh.querySelector('#exGalNext').onclick=function(){stepFocus(1);};
      sh.querySelector('#exGalPlay').onclick=function(){
        playing=!playing;
        this.textContent=playing?'❚❚':'▶';
      };
    }
    return document.getElementById('exStories');
  }

  function renderFloatingGallery(period){
    var host=ensureHeaderAndHost();
    if(!host)return;
    var perEl=document.getElementById('exStoryPer');
    if(perEl)perEl.textContent=period?'· '+period:'';
    var subEl=document.getElementById('exGalSub');

    if(!allPhotos.length){
      if(subEl)subEl.textContent='Belum ada foto lapangan untuk periode ini';
      host.innerHTML='<div class="ex-gal-stage" style="display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:#cbd5e1"><div><b style="display:block;color:#fff;margin-bottom:6px">Belum ada foto lapangan</b><span style="font-size:12px">Foto proyek di bulan terpilih akan muncul otomatis di sini.</span></div></div>'+
        '<div class="ex-gal-foot"><span></span><button type="button" class="ex-gbtn" id="exOpenFullGal">⊞ Buka Galeri Lengkap</button></div>';
      var og=host.querySelector('#exOpenFullGal');
      if(og&&window.pmoGallery)og.onclick=function(){window.pmoGallery.open(curAk?{month:curAk}:{});};
      fitTopSplit();
      return;
    }

    if(subEl)subEl.textContent=allPhotos.length+' foto aktif · fokus bergantian tiap 3 detik';

    host.innerHTML='<div class="ex-gal-stage" id="exGalStage"></div>'+
      '<div class="ex-gal-foot"><div class="ex-gal-dots" id="exGalDots"></div>'+
      '<button type="button" class="ex-gbtn" id="exOpenFullGal">⊞ Galeri ('+allPhotos.length+' foto)</button></div>';

    var stage=host.querySelector('#exGalStage');
    stage.onmouseenter=function(){hoverPaused=true;};
    stage.onmouseleave=function(){hoverPaused=false;};

    host.querySelector('#exOpenFullGal').onclick=function(){
      if(allPhotos.length)openLightbox(focusIdx);
      else if(window.pmoGallery)window.pmoGallery.open(curAk?{month:curAk}:{});
    };

    var dotsBox=host.querySelector('#exGalDots');
    dotsBox.innerHTML=projChips.map(function(ch){
      return '<button type="button" class="ex-gdot" data-proj="'+esc(ch.projId)+'" data-start="'+ch.startAt+'">'+esc(ch.label)+' ('+ch.count+')</button>';
    }).join('');
    dotsBox.querySelectorAll('.ex-gdot').forEach(function(b){
      b.onclick=function(){focusPhoto(+b.getAttribute('data-start'));};
    });

    paintStage();
    fitTopSplit();
  }

  function paintStage(){
    var stage=document.getElementById('exGalStage');
    if(!stage||!allPhotos.length)return;
    var n=allPhotos.length;
    var visibleCount=Math.min(6,n);
    var slots=(window.innerWidth<=760||document.documentElement.classList.contains('m-mode'))?MOBILE_SLOTS:DESKTOP_SLOTS;

    // Bangun window 6 kartu di sekitar focusIdx supaya ringan dan seluruh foto bergiliran fokus
    var indices=[];
    for(var rel=0;rel<visibleCount;rel++){
      indices.push({rel:rel,idx:(focusIdx+rel)%n});
    }

    // Reconcile kartu existing berdasarkan data-idx agar transisi smooth
    var existing={};
    stage.querySelectorAll('.ex-fcard').forEach(function(el){existing[el.getAttribute('data-idx')]=el;});
    var keep={};
    indices.forEach(function(item){keep[item.idx]=true;});
    Object.keys(existing).forEach(function(k){if(!keep[k])existing[k].remove();});

    indices.forEach(function(item){
      var p=allPhotos[item.idx];
      var card=existing[item.idx];
      if(!card){
        card=document.createElement('div');
        card.className='ex-fcard';
        card.setAttribute('data-idx',String(item.idx));
        card.innerHTML='<div class="ex-fcard-in"><img alt=""><div class="ex-fscrim"></div><span class="ex-ftag"></span><div class="ex-fmeta"><b></b><small></small></div></div>';
        card.onclick=function(){
          var ci=+card.getAttribute('data-idx');
          if(ci===focusIdx)openLightbox(ci);else focusPhoto(ci);
        };
        loadImgTag(card.querySelector('img'),p.photoId,800);
        stage.appendChild(card);
      }
      card.querySelector('img').alt=p.projName;
      card.querySelector('.ex-ftag').textContent=p.projName+' · '+p.idxInMonth+'/'+p.monthCount;
      card.querySelector('.ex-fmeta b').textContent=p.cap;
      card.querySelector('.ex-fmeta small').textContent=p.monthLabel+(p.date?' · '+p.date:'');

      var slot=slots[item.rel]||slots[slots.length-1];
      card.setAttribute('data-pos',String(item.rel));
      card.classList.toggle('is-focus',item.rel===0);
      card.style.zIndex=String(slot.z);
      card.style.transform='translate(-50%,-50%) translate3d('+slot.x+'px,'+slot.y+'px,0) scale('+slot.s+') rotate('+slot.r+'deg)';
    });

    var curProj=allPhotos[focusIdx]&&allPhotos[focusIdx].projId;
    document.querySelectorAll('#exGalDots .ex-gdot').forEach(function(d){
      d.classList.toggle('on',d.getAttribute('data-proj')===curProj);
    });
  }

  function positionCards(){
    var stage=document.getElementById('exGalStage');
    if(!stage||!allPhotos.length)return;
    var slots=(window.innerWidth<=760||document.documentElement.classList.contains('m-mode'))?MOBILE_SLOTS:DESKTOP_SLOTS;
    stage.querySelectorAll('.ex-fcard').forEach(function(card){
      var rel=+card.getAttribute('data-pos');
      var slot=slots[rel]||slots[slots.length-1];
      card.style.transform='translate(-50%,-50%) translate3d('+slot.x+'px,'+slot.y+'px,0) scale('+slot.s+') rotate('+slot.r+'deg)';
    });
  }

  function focusPhoto(i){
    if(!allPhotos.length)return;
    focusIdx=((i%allPhotos.length)+allPhotos.length)%allPhotos.length;
    paintStage();
  }
  function stepFocus(dir){focusPhoto(focusIdx+dir);}

  /* 3. Auto-cycling Slideshow Lightbox (setiap 3 detik saat galeri diklik) */
  function buildLightbox(){
    if(lbEl)return;
    lbEl=document.createElement('div');
    lbEl.className='ex-lb';lbEl.id='exGalLb';lbEl.hidden=true;
    lbEl.setAttribute('role','dialog');lbEl.setAttribute('aria-modal','true');lbEl.setAttribute('aria-label','Galeri Story Lapangan');
    lbEl.innerHTML='<div class="ex-lb-box">'+
      '<div class="ex-lb-stage"><img class="ex-lb-img" id="exLbImg" alt=""><span class="ex-lb-cnt" id="exLbCnt">1 / 1</span>'+
      '<button type="button" class="ex-lb-nav prev" id="exLbPrev" aria-label="Sebelumnya">‹</button>'+
      '<button type="button" class="ex-lb-nav next" id="exLbNext" aria-label="Berikutnya">›</button></div>'+
      '<div class="ex-lb-prog"><i id="exLbProg"></i></div>'+
      '<div class="ex-lb-foot"><div><b id="exLbTitle" style="font-size:15px"></b><div id="exLbSub" style="font-size:12px;color:var(--muted,#5b7085)"></div></div>'+
      '<div class="ex-lb-acts"><button type="button" class="ex-gbtn" id="exLbPlay">❚❚ Otomatis (3s)</button>'+
      '<button type="button" class="ex-gbtn" id="exLbFull">⊞ Timeline &amp; Bandingkan</button>'+
      '<button type="button" class="ex-gbtn" id="exLbClose">✕ Tutup</button></div></div>'+
      '<div class="ex-lb-strip" id="exLbStrip"></div></div>';
    document.body.appendChild(lbEl);
    lbEl.onclick=function(e){if(e.target===lbEl)closeLightbox();};
    var st=lbEl.querySelector('.ex-lb-stage');
    st.onmouseenter=function(){lbHoverPaused=true;};
    st.onmouseleave=function(){lbHoverPaused=false;};
    lbEl.querySelector('#exLbPrev').onclick=function(){stepLightbox(-1);};
    lbEl.querySelector('#exLbNext').onclick=function(){stepLightbox(1);};
    lbEl.querySelector('#exLbClose').onclick=closeLightbox;
    lbEl.querySelector('#exLbPlay').onclick=function(){
      lbPlaying=!lbPlaying;
      this.textContent=lbPlaying?'❚❚ Otomatis (3s)':'▶ Putar (3s)';
    };
    lbEl.querySelector('#exLbFull').onclick=function(){
      var cur=allPhotos[lbIdx];
      closeLightbox();
      if(window.pmoGallery&&cur)window.pmoGallery.open({project:cur.projId,month:cur.monthKey});
    };
    document.addEventListener('keydown',function(e){
      if(!lbEl||lbEl.hidden)return;
      if(e.key==='Escape')closeLightbox();
      else if(e.key==='ArrowRight')stepLightbox(1);
      else if(e.key==='ArrowLeft')stepLightbox(-1);
    });
  }

  function renderLightbox(){
    if(!lbEl||!allPhotos.length)return;
    var p=allPhotos[lbIdx];
    var img=lbEl.querySelector('#exLbImg');
    img.style.opacity='0.35';
    img.onload=function(){img.style.opacity='1';};
    loadImgTag(img,p.photoId,1280);
    lbEl.querySelector('#exLbCnt').textContent=(lbIdx+1)+' / '+allPhotos.length+' · '+p.projName;
    lbEl.querySelector('#exLbTitle').textContent=p.cap;
    lbEl.querySelector('#exLbSub').textContent=p.projName+' · '+p.monthLabel+(p.date?' · '+p.date:'');

    var strip=lbEl.querySelector('#exLbStrip');
    var n=allPhotos.length;
    var maxT=Math.min(18,n);
    var start=Math.max(0,Math.min(lbIdx-Math.floor(maxT/2),n-maxT));
    var html='';
    for(var i=start;i<start+maxT;i++){
      html+='<button type="button" class="ex-lb-thumb'+(i===lbIdx?' on':'')+'" data-i="'+i+'" title="'+esc(allPhotos[i].projName+' · '+allPhotos[i].cap)+'"><img alt=""></button>';
    }
    strip.innerHTML=html;
    strip.querySelectorAll('.ex-lb-thumb').forEach(function(b){
      var idx=+b.getAttribute('data-i');
      loadImgTag(b.querySelector('img'),allPhotos[idx].photoId,480);
      b.onclick=function(){lbIdx=idx;lbElapsed=0;renderLightbox();};
    });
    focusPhoto(lbIdx);
  }

  function openLightbox(idx){
    if(!allPhotos.length)return;
    buildLightbox();
    lbIdx=((idx%allPhotos.length)+allPhotos.length)%allPhotos.length;
    lbElapsed=0;lbPlaying=true;
    lbEl.querySelector('#exLbPlay').textContent='❚❚ Otomatis (3s)';
    lbEl.hidden=false;
    renderLightbox();
  }
  function closeLightbox(){if(lbEl)lbEl.hidden=true;}
  function stepLightbox(dir){
    if(!allPhotos.length)return;
    lbIdx=((lbIdx+dir)%allPhotos.length+allPhotos.length)%allPhotos.length;
    lbElapsed=0;
    renderLightbox();
  }

  /* Timer 3 detik tepat untuk kartu melayang (saat lightbox tutup) & lightbox (saat lightbox buka) */
  var stageElapsed=0;
  setInterval(function(){
    if(document.hidden||!allPhotos.length)return;
    if(lbEl&&!lbEl.hidden){
      if(!lbPlaying||lbHoverPaused)return;
      lbElapsed+=150;
      var bar=lbEl.querySelector('#exLbProg');
      if(bar)bar.style.width=Math.min(100,(lbElapsed/INTERVAL_MS)*100)+'%';
      if(lbElapsed>=INTERVAL_MS){lbElapsed=0;stepLightbox(1);}
    }else if(playing&&!hoverPaused){
      var sec=document.getElementById('sec-story');
      if(!sec||sec.hidden||sec.offsetParent===null)return;
      stageElapsed+=150;
      if(stageElapsed>=INTERVAL_MS){stageElapsed=0;stepFocus(1);}
    }
  },150);

  function refreshAndRender(period){
    tagStoryMobile();
    var cached=null;
    try{cached=JSON.parse(localStorage.getItem('pmoGalIdx')||'null');}catch(e){}
    if(cached&&cached.d&&Array.isArray(cached.d.projects)){
      idxCache=cached.d;
      buildPhotoList(idxCache,period);
      renderFloatingGallery(period);
    }
    if(typeof google!=='undefined'&&google.script&&google.script.run){
      google.script.run.withSuccessHandler(function(d){
        if(!d||!d.success)return;
        idxCache=d;
        try{localStorage.setItem('pmoGalIdx',JSON.stringify({t:Date.now(),d:d}));}catch(e){}
        buildPhotoList(idxCache,period);
        renderFloatingGallery(period);
      }).withFailureHandler(function(){}).getGalleryIndex(tok());
    }
  }

  /* Hook renderExecStories & renderExecutive supaya bulan baru langsung update galeri + tinggi 2-kolom */
  var __origStories=typeof renderExecStories==='function'?renderExecStories:null;
  window.renderExecStories=renderExecStories=function(period){
    refreshAndRender(period);
  };
  if(typeof renderExecutive==='function'){
    var __origRenderExec=renderExecutive;
    renderExecutive=function(data){
      __origRenderExec.apply(this,arguments);
      setTimeout(fitTopSplit,30);
    };
  }
  if(typeof setViewMode==='function'){
    var __origSVM=setViewMode;
    window.setViewMode=setViewMode=function(){
      __origSVM.apply(this,arguments);
      setTimeout(fitTopSplit,20);
    };
  }
  if(typeof mShowTab==='function'){
    var __origMShow=mShowTab;
    mShowTab=function(t){
      tagStoryMobile();
      __origMShow.apply(this,arguments);
      setTimeout(positionCards,30);
    };
  }

  syncUnifiedHeader();
  if(window.MutationObserver){
    var __mainEl=document.querySelector('.main');
    if(__mainEl){
      new MutationObserver(function(){
        var mob=window.innerWidth<=900||document.documentElement.classList.contains('m-mode');
        var pbar=document.getElementById('pmoPbar');
        if(!mob&&pbar&&pbar.parentNode===__mainEl)syncUnifiedHeader();
      }).observe(__mainEl,{childList:true});
    }
  }
  if(document.getElementById('exStories')){
    var per=typeof currentReportData!=='undefined'&&currentReportData?currentReportData.period:'';
    refreshAndRender(per);
    setTimeout(fitTopSplit,60);
  }
  setTimeout(syncUnifiedHeader,150);
  setTimeout(syncUnifiedHeader,600);
})();
</script>`;

const EXEC_STORY_PATCHES = [
  {
    file: 'ExecutiveDashboard',
    find: '</head>',
    replace: EXEC_STORY_BRIEF_CSS + '\n</head>',
  },
  {
    file: 'ExecutiveDashboard',
    find: '      <section class="ex-story anchor" id="sec-story" aria-label="Story lapangan">',
    replace: '      <div class="ex-top-split" id="exTopSplit">\n      <section class="ex-story anchor" id="sec-story" aria-label="Story lapangan">',
  },
  {
    file: 'ExecutiveDashboard',
    find: '      <section class="brief anchor" id="sec-ringkasan" aria-label="Ringkasan eksekutif">',
    replace: '      <div class="ex-brief-shell" id="exBriefShell">\n      <section class="brief anchor" id="sec-ringkasan" aria-label="Ringkasan eksekutif">',
  },
  {
    file: 'ExecutiveDashboard',
    find: '      </section>\n      <section class="kpis" aria-label="Ringkasan status proyek">',
    replace: '      </section>\n      </div>\n      </div>\n      <section class="kpis" aria-label="Ringkasan status proyek">',
  },
  {
    file: 'ExecutiveDashboard',
    find: '</script></body></html>',
    replace: '</script>\n' + EXEC_STORY_BRIEF_JS + '\n</body></html>',
  },
];

module.exports = { EXEC_STORY_PATCHES };

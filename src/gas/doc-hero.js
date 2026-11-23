'use strict';

/**
 * Document Control (Desktop) · Unified Hero Banner + Tampilan Profesional.
 * - Menggunakan 1 banner tetap bertema Document Control (/media/doc-control-banner.jpg)
 *   yang otomatis menyesuaikan 4 tema dashboard (Biru, Sage, Mocha, Gelap).
 * - Kontrol topbar (pemilih proyek Modern HUD Hover Scroll, tautan Folder Drive Tim,
 *   Cari Ctrl K, Notifikasi, Tema, Akun) menyatu ke dalam banner, lalu berpindah
 *   halus ke #exStuckHost saat halaman digulir melewati banner bersama dropdown "Isi halaman".
 * - Menyempurnakan hierarki kartu KPI, panel tab, toolbar filter, grup kategori, dan baris register.
 * - Mobile (<= 760px / html.m-mode) dikembalikan utuh ke layout standar agar navigasi satu tangan aman.
 */

const DOC_HERO_CSS = String.raw`<style id="pmoDocHeroCss">
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

/* Ruang utama di mode unified hero (hanya untuk banner utama #dcHero, tidak menyentuh .hero empty-state di #tab-reg) */
html.ex-hero-hdr main.wrap{padding-top:14px!important}
html.ex-hero-hdr main.wrap>#dcHero{
  position:relative;overflow:visible!important;z-index:34;
  display:grid!important;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;
  align-items:end;justify-items:stretch;text-align:left;column-gap:16px;
  padding:12px 24px 20px;min-height:164px;border:0!important;
  border-radius:var(--r,16px);margin:0 0 14px;color:#fff;
  background:#073b63 url('/media/doc-control-banner.jpg') center 54%/cover no-repeat;
  box-shadow:0 12px 30px rgba(8,24,42,.18);
}
html.ex-hero-hdr main.wrap>#dcHero::before{
  content:"";position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:0;
  background:linear-gradient(95deg,rgba(8,30,51,.95),rgba(11,58,102,.80) 56%,rgba(8,30,51,.52));
  box-shadow:inset 0 72px 58px -28px rgba(0,0,0,.44);
}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]) main.wrap>#dcHero::before{
  background:linear-gradient(100deg,rgba(15,42,29,.95) 0%,rgba(31,58,38,.82) 48%,rgba(55,85,52,.44) 100%)!important;
}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]) main.wrap>#dcHero::before{
  background:linear-gradient(100deg,rgba(59,42,31,.95) 0%,rgba(84,60,43,.82) 48%,rgba(111,78,55,.44) 100%)!important;
}
html.ex-hero-hdr[data-theme="dark"] main.wrap>#dcHero::before{
  background:linear-gradient(95deg,rgba(9,14,24,.96),rgba(15,23,42,.82) 56%,rgba(9,14,24,.56))!important;
}
html.ex-hero-hdr :is(#dcHero,#exStuckHost):has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden]),.pmo-isi-drop.open,.pmo-isi-drop:hover,.pmo-isi-drop:focus-within,.dc-proj-wrap.open){z-index:150!important}

#dcHero{display:none}
#dcHeroSpacer{display:none;grid-column:1 / -1;grid-row:1;flex:none}
#dcPbarSpacer{display:none;flex:none}
html.ex-hero-hdr.ex-hdr-mounted #dcHeroSpacer{display:block}
html.ex-hero-hdr.ex-pbar-mounted #dcPbarSpacer{display:block}

/* Sembunyikan select putih bawaan & bilah tab lama di desktop (dipindah ke banner hero) */
html.ex-hero-hdr #projSel,
html.ex-hero-hdr #content>.bar{display:none!important}
html.ex-hero-hdr #dcHero .dc-hero-txt{grid-column:1;grid-row:2;position:relative;min-width:0;z-index:5}
html.ex-hero-hdr #dcHero header.top .t{display:none!important}

/* Baris 1 Hero & Sticky Header */
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top{
  position:relative!important;top:auto!important;z-index:40!important;
  background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  border-bottom:1px solid rgba(255,255,255,.16)!important;gap:8px;flex-wrap:wrap;
}
html.ex-hero-hdr #dcHero>header.top{grid-column:1 / -1;grid-row:1;padding:0 0 10px 0!important;margin:0 0 12px 0!important}
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .dc-top-sp{flex:1;min-width:8px}
html.ex-hero-hdr #exStuckHost header.top .dc-top-sp{display:none}

/* Frosted Glass Controls di Hero & Sticky Bar */
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .icon-btn,
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .ntf-wrap>button,
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .pmo-qs-trigger,
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .acm-chip,
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .dc-gl-btn{
  height:38px;background:rgba(255,255,255,.13)!important;border:1px solid rgba(255,255,255,.28)!important;
  color:#fff!important;box-shadow:none!important;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
}
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .icon-btn{width:38px;border-radius:11px}
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .icon-btn:hover,
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .ntf-wrap>button:hover,
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .pmo-qs-trigger:hover,
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .acm-chip:hover,
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .dc-gl-btn:hover{
  background:rgba(255,255,255,.22)!important;border-color:rgba(255,255,255,.46)!important;
}
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .acm-chip .acm-t b,
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .acm-chip .acm-t small,
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .acm-chip .acm-caret,
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .pmo-qs-trigger *,
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .ntf-wrap>button svg,
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .icon-btn svg{color:#fff!important}
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top .pmo-qs-trigger kbd{
  background:rgba(255,255,255,.16)!important;border-color:rgba(255,255,255,.32)!important;color:#fff!important;
}
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top :is(.ntf-wrap,.account-wrap,.acm-wrap,.dc-proj-wrap){position:relative;z-index:25}
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top :is(.ntf-wrap,.account-wrap,.acm-wrap,.dc-proj-wrap):has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden]),.dc-pop:not([hidden])){z-index:55}
html.ex-hero-hdr :is(#dcHero,#exStuckHost) header.top :is(.pop,.acm-pop,.ntf-pop){background:var(--card,#fff);color:var(--ink,#132b43);z-index:160!important}

/* Project HUD Selector & Drive Quick Pill */
.dc-proj-wrap,.dc-drive-pill{display:none}
html.ex-hero-hdr #dcHero header.top .dc-proj-wrap,
html.ex-hero-hdr #dcHero header.top .dc-drive-pill:not([hidden]){display:inline-flex;align-items:center}
html.ex-hero-hdr #exStuckHost .dc-proj-wrap,
html.ex-hero-hdr #exStuckHost .dc-drive-pill{display:none!important}
.dc-gl-btn{
  display:inline-flex;align-items:center;gap:8px;padding:0 13px;border-radius:11px;
  font:600 12.5px/1.2 inherit;cursor:pointer;max-width:290px;text-decoration:none;
}
.dc-gl-btn .dc-pl{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:rgba(219,234,254,.84);display:block;line-height:1}
.dc-gl-btn .dc-pn{display:block;font-size:12.5px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:205px;text-align:left}
.dc-gl-btn svg{width:14px;height:14px;flex:none;opacity:.9}
.dc-gl-btn.single svg.dc-chev{display:none}

/* Modern HUD Hover Scroll Panel untuk Pemilih Proyek */
html.ex-hero-hdr .dc-proj-wrap .dc-pop{
  position:absolute;left:0;top:calc(100% + 8px);width:min(356px,calc(100vw - 32px));
  background:rgba(16,25,39,.96);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  border:1px solid rgba(255,255,255,.15);border-radius:16px;
  box-shadow:0 24px 54px rgba(3,8,18,.62);
  color:#f1f5f9;display:flex;flex-direction:column;overflow:hidden;z-index:160!important;
}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]) .dc-proj-wrap .dc-pop{background:rgba(15,38,26,.96)}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]) .dc-proj-wrap .dc-pop{background:rgba(44,30,21,.96)}
.dc-pop[hidden]{display:none!important}
.dc-pop-top{flex:none;padding:12px 12px 10px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02)}
.dc-pop-h{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 2px;margin-bottom:8px;font-size:13px;font-weight:600;color:#7dd3fc}
.dc-pop-cnt{font-size:12.5px;font-weight:500;color:#9db0c4;font-variant-numeric:tabular-nums}
.dc-pop-qwrap{position:relative;display:flex;align-items:center}
.dc-pop-qic{position:absolute;left:11px;width:15px;height:15px;color:#9db0c4;pointer-events:none}
.dc-pop-q{
  width:100%;height:38px;padding:0 34px;border-radius:9px;
  border:1px solid rgba(255,255,255,.14);background:rgba(6,12,22,.56);
  color:#f1f5f9;font:500 13.5px/1.2 inherit;transition:border-color .15s ease,background .15s ease;
}
.dc-pop-q::placeholder{color:#8fa3b8}
.dc-pop-q:focus{outline:0;border-color:rgba(125,211,252,.7);background:rgba(6,12,22,.82)}
.dc-pop-q::-webkit-search-cancel-button{display:none}
.dc-pop-clr{
  position:absolute;right:7px;width:24px;height:24px;padding:0;border:0;border-radius:6px;
  background:rgba(255,255,255,.09);color:#e2e8f0;cursor:pointer;
  display:none;place-items:center;text-align:center;font-size:15px;line-height:1;
}
.dc-pop-clr.on{display:grid}
.dc-pop-clr:hover{background:rgba(255,255,255,.18);color:#fff}
.dc-pop-body{position:relative}
.dc-pop-list{
  max-height:min(320px,56vh);overflow-y:auto;padding:8px 16px 10px 8px;
  display:flex;flex-direction:column;gap:2px;
  scrollbar-width:none;-ms-overflow-style:none;scroll-behavior:smooth;
}
.dc-pop-list::-webkit-scrollbar{display:none}
.dc-pop-body.has-top .dc-pop-list{-webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 18px,#000 100%);mask-image:linear-gradient(180deg,transparent 0%,#000 18px,#000 100%)}
.dc-pop-body.has-bot .dc-pop-list{-webkit-mask-image:linear-gradient(180deg,#000 0%,#000 calc(100% - 24px),transparent 100%);mask-image:linear-gradient(180deg,#000 0%,#000 calc(100% - 24px),transparent 100%)}
.dc-pop-body.has-top.has-bot .dc-pop-list{-webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 18px,#000 calc(100% - 24px),transparent 100%);mask-image:linear-gradient(180deg,transparent 0%,#000 18px,#000 calc(100% - 24px),transparent 100%)}
.dc-pop-rail{
  position:absolute;top:8px;bottom:8px;right:5px;width:10px;border-radius:99px;
  cursor:pointer;opacity:0;pointer-events:none;transition:opacity .18s ease;
  display:flex;justify-content:center;z-index:5;
}
.dc-pop:hover .dc-pop-rail.needed,.dc-pop-body.scrolling .dc-pop-rail.needed,.dc-pop-rail.dragging{opacity:1;pointer-events:auto}
.dc-pop-track{position:relative;width:3px;height:100%;border-radius:99px;background:rgba(255,255,255,.08);transition:width .14s ease,background .14s ease}
.dc-pop-rail:hover .dc-pop-track,.dc-pop-rail.dragging .dc-pop-track{width:5px;background:rgba(255,255,255,.15)}
.dc-pop-thumb{position:absolute;left:0;right:0;top:0;min-height:28px;border-radius:99px;background:rgba(125,211,252,.52);transition:background .14s ease}
.dc-pop-rail:hover .dc-pop-thumb,.dc-pop-rail.dragging .dc-pop-thumb{background:rgba(125,211,252,.92)}
.dc-pop-opt{
  position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:42px;
  padding:9px 12px;border:1px solid transparent;border-radius:10px;background:transparent;
  color:#f1f5f9;font:600 14px/1.35 inherit;text-align:left;cursor:pointer;
  transition:background .12s ease,border-color .12s ease,color .12s ease,transform .12s ease;
}
.dc-pop-opt:hover,.dc-pop-opt:focus-visible{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.14);color:#fff;transform:translateX(2px);outline:0}
.dc-pop-opt.on{background:rgba(30,111,192,.36);border-color:rgba(125,211,252,.45);color:#fff}
.dc-pop-nm{flex:1;min-width:0;line-height:1.35}
.dc-pop-bdg{padding:2px 7px;border-radius:6px;background:rgba(125,211,252,.16);color:#93c5fd;font-size:11.5px;font-weight:700;flex:none;font-variant-numeric:tabular-nums}
.dc-pop-go{flex:none;font-size:16px;line-height:1;color:#7dd3fc;opacity:0;transform:translateX(-3px);transition:opacity .12s ease,transform .12s ease}
.dc-pop-opt:hover .dc-pop-go,.dc-pop-opt:focus-visible .dc-pop-go,.dc-pop-opt.on .dc-pop-go{opacity:.95;transform:none}
.dc-pop-empty{padding:24px 12px;text-align:center;font-size:13px;color:#9db0c4;line-height:1.5}
.dc-pop-foot{flex:none;display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-top:1px solid rgba(255,255,255,.08);background:rgba(8,14,24,.55);font-size:12px;color:#9db0c4}
.dc-pop-more{color:#7dd3fc;font-weight:600}
.dc-pop-more.done{color:#94a3b8;font-weight:500}
.dc-pop-kbd{font-size:11.5px;color:#9db0c4}

/* Baris 2 Hero Typography & Status Pills */
.dc-hero-ey{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;font-size:12.5px;font-weight:600;color:#c3e4f7}
.dc-hero-pill{
  display:inline-flex;align-items:center;padding:2px 9px;border-radius:99px;font-size:11.5px;font-weight:700;letter-spacing:.01em;
  background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.28);color:#e0f2fe;white-space:nowrap;
}
.dc-hero-pill.ok{background:rgba(79,209,160,.22);border-color:rgba(110,231,183,.45);color:#a7f3d0}
.dc-hero-pill.warn{background:rgba(245,158,11,.24);border-color:rgba(252,211,77,.45);color:#fde68a}
html.ex-hero-hdr #dcHero h1{
  margin:0 0 6px;font-size:clamp(22px,2.5vw,32px);line-height:1.12;font-weight:800;letter-spacing:-.015em;color:#fff!important;
}
html.ex-hero-hdr #dcHero h1 span{color:#7dd3fc}
html.ex-hero-hdr[data-accent="sage"]:not([data-theme="dark"]) #dcHero h1 span{color:#E3EED4}
html.ex-hero-hdr[data-accent="mocha"]:not([data-theme="dark"]) #dcHero h1 span{color:#EDE3D4}
html.ex-hero-hdr #dcHero .dc-hero-sub{margin:0;color:#dcecf7!important;font-size:13.5px;max-width:68ch;line-height:1.45}

/* Isi Halaman Frosted Glass Dropdown di pojok kanan bawah hero -> pindah ke sticky bar saat scroll */
html.ex-hero-hdr .pmo-pbar .pmo-crumb{display:none!important}
html.ex-hero-hdr :is(#dcHero,#exStuckHost) .pmo-pbar{
  position:relative!important;top:auto!important;margin:0!important;padding:0!important;
  border:0!important;background:transparent!important;-webkit-backdrop-filter:none!important;
  backdrop-filter:none!important;box-shadow:none!important;flex:none;overflow:visible!important;
}
html.ex-hero-hdr :is(#dcHero,#exStuckHost) .pmo-pbar[hidden]{display:none!important}
html.ex-hero-hdr :is(#dcHero,#exStuckHost) .pmo-pbar .pmo-pbar-r{min-height:0!important;overflow:visible!important}
html.ex-hero-hdr :is(#dcHero,#exStuckHost) .pmo-pbar .pmo-isi-drop{margin-left:0}
html.ex-hero-hdr :is(#dcHero,#exStuckHost) .pmo-pbar .pmo-isi-trig{
  height:38px;padding:0 13px;border-radius:11px;
  background:rgba(255,255,255,.13)!important;border:1px solid rgba(255,255,255,.28)!important;
  color:#fff!important;box-shadow:none!important;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
}
html.ex-hero-hdr :is(#dcHero,#exStuckHost) .pmo-pbar .pmo-isi-trig:hover,
html.ex-hero-hdr :is(#dcHero,#exStuckHost) .pmo-pbar .pmo-isi-drop.open .pmo-isi-trig{
  background:rgba(255,255,255,.22)!important;border-color:rgba(255,255,255,.46)!important;color:#fff!important;
}
html.ex-hero-hdr :is(#dcHero,#exStuckHost) .pmo-pbar .pmo-isi-trig .pmo-isi-l{color:rgba(219,234,254,.84)!important}
html.ex-hero-hdr :is(#dcHero,#exStuckHost) .pmo-pbar .pmo-isi-trig svg{color:#fff!important;opacity:.92}
html.ex-hero-hdr #dcHero>.pmo-pbar{grid-column:2;grid-row:2;align-self:end;justify-self:end;z-index:10!important}
html.ex-hero-hdr #dcHero>.pmo-pbar .pmo-isi-menu{
  background:var(--card,#fff)!important;border:1px solid var(--line,#dce5ed)!important;
  color:var(--ink,#132b43)!important;z-index:160!important;
}

/* Sticky Header Host */
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
html.ex-hero-hdr #exStuckHost header.top .t{display:block!important;min-width:100px;flex:1 1 110px;overflow:hidden}
html.ex-hero-hdr #exStuckHost header.top .t small{color:rgba(255,255,255,.74);font-size:11px;display:block;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
html.ex-hero-hdr #exStuckHost header.top .t b{color:#fff!important;font-size:15px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#exStuckHost .pmo-isi-menu{background:var(--ex-stuck-menu)!important;border:1px solid rgba(255,255,255,.18)!important;box-shadow:0 18px 40px rgba(0,0,0,.44);z-index:160!important}
#exStuckHost .pmo-isi-menu .pmo-chip{color:rgba(255,255,255,.9)!important}
#exStuckHost .pmo-isi-menu .pmo-chip:hover{background:rgba(255,255,255,.12)!important;color:#fff!important}
#exStuckHost .pmo-isi-menu .pmo-chip.on{background:var(--ex-stuck-act)!important;color:#fff!important}

/* =====================================================================
   UPGRADE VISUAL KARTU KPI, PANEL TAB, TOOLBAR & TABEL REGISTER
   ===================================================================== */
html.ex-hero-hdr #kpis{gap:12px;margin:0 0 14px}
html.ex-hero-hdr #kpis .kpi{
  display:flex;flex-direction:column;justify-content:space-between;gap:5px;
  padding:15px 17px;border-radius:var(--r,16px);transition:border-color .15s,transform .15s;
}
html.ex-hero-hdr #kpis .kpi[data-dc-jump]{cursor:pointer}
html.ex-hero-hdr #kpis .kpi[data-dc-jump]:hover{
  border-color:color-mix(in srgb,var(--pri) 45%,var(--line));transform:translateY(-1px);
}
html.ex-hero-hdr #kpis .kpi-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
html.ex-hero-hdr #kpis .kpi small{line-height:1.25}
html.ex-hero-hdr #kpis .kpi-badge{
  display:inline-flex;align-items:center;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;
  white-space:nowrap;flex:none;font-variant-numeric:tabular-nums;border:1px solid var(--line);
}
html.ex-hero-hdr #kpis .kpi-badge.ok{background:var(--ok-bg);color:var(--ok);border-color:var(--ok-line)}
html.ex-hero-hdr #kpis .kpi-badge.warn{background:var(--warn-bg);color:var(--warn);border-color:var(--warn-line)}
html.ex-hero-hdr #kpis .kpi-badge.bad{background:var(--bad-bg);color:var(--bad);border-color:var(--bad-line)}
html.ex-hero-hdr #kpis .kpi-badge.info{background:var(--soft);color:var(--pri-ink);border-color:color-mix(in srgb,var(--pri) 26%,var(--line))}
html.ex-hero-hdr #kpis .kpi .v{font-size:26px;font-weight:800;line-height:1.15;margin-top:2px}
html.ex-hero-hdr #kpis .kpi .bar2{height:5px;margin-top:2px}

/* Panel utama & register dokumen yang lebih rapi */
#content .panel{padding:18px 20px;border-radius:var(--r,16px)}
#content .panel>h3{font-size:16px;font-weight:700;gap:9px}
#content .panel>h3 .n{
  padding:2px 10px;border-radius:99px;background:var(--tint);border:1px solid var(--line);
  font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;
}
#content .panel>.sub{margin:5px 0 14px;font-size:12.5px;line-height:1.5;max-width:78ch}
#content .panel>.tools{
  padding:10px 12px;margin:0 0 10px;border-radius:12px;background:var(--tint);border:1px solid var(--line);gap:8px;
}
#content .panel>.tools .inp{min-height:38px;background:var(--card)}
#content .panel>.chips{padding:2px 0 12px;margin-bottom:4px;border-bottom:1px solid var(--line)}
#content .panel .grp{margin-top:16px}
#content .panel .grp-h{
  padding:9px 12px;border-radius:10px;background:var(--tint);border:1px solid var(--line);margin-bottom:2px;
}
#content .panel .dl td{padding:11px 10px}
#content .panel .dl tr.r{transition:background .12s ease}
#content .panel .clip{border-radius:8px;padding:4px 10px}

@media (max-width:1240px){
  html.ex-hero-hdr #exStuckHost header.top .acm-chip{max-width:170px}
  html.ex-hero-hdr #exStuckHost header.top .pmo-qs-trigger kbd{display:none!important}
}
@media (max-width:1060px){
  html.ex-hero-hdr #exStuckHost header.top{padding:10px 16px!important;gap:6px}
  html.ex-hero-hdr #exStuckHost .pmo-isi-trig .pmo-isi-l{display:none}
}
@media (max-width:900px){
  html.ex-hero-hdr #dcHero{grid-template-columns:minmax(0,1fr);padding:14px 16px 16px}
  html.ex-hero-hdr #dcHero>.pmo-pbar{grid-column:1;grid-row:3;justify-self:start;margin-top:12px!important}
}
@media (prefers-reduced-motion:reduce){
  #exStuckHost,.dc-pop-list,.dc-pop-rail,.dc-pop-opt,html.ex-hero-hdr #kpis .kpi{transition:none!important;scroll-behavior:auto!important}
}
</style>`;

const DOC_HERO_JS = String.raw`<script id="pmoDocHeroJs">
(function(){
  if(window.__pmoDocHeroInit)return;window.__pmoDocHeroInit=true;
  var stuckTimer=0,syncRaf=0,metaRaf=0,dcHudDrag=null,dcHudSync=null;

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function wrapEl(){return document.querySelector('.main>main.wrap')||document.querySelector('main.wrap')}
  function heroEl(){return document.getElementById('dcHero')}

  function ensureHeroSection(){
    var wrap=wrapEl();if(!wrap)return null;
    var hero=document.getElementById('dcHero');
    if(!hero){
      hero=document.createElement('section');
      hero.id='dcHero';
      hero.className='hero dc-hero';
      hero.setAttribute('aria-label','Header Document Control');
      hero.innerHTML='<div id="dcHeroSpacer" aria-hidden="true"></div>'
        +'<div class="dc-hero-txt">'
          +'<div class="dc-hero-ey" id="dcHeroEy"><span>Modul 2 · Pelaksanaan proyek</span></div>'
          +'<h1 id="dcHeroH1">Document Control</h1>'
          +'<p class="dc-hero-sub" id="dcHeroSub">Register terpadu berkas proyek di Google Drive, kelengkapan wajib, pantauan jaminan &amp; asuransi, tindak lanjut MoM, hingga arsip audit.</p>'
        +'</div>';
      wrap.insertBefore(hero,wrap.firstChild);
    }
    return hero;
  }

  window.addEventListener('mousemove',function(e){
    if(!dcHudDrag)return;
    var d=dcHudDrag,sh=d.sc.scrollHeight,ch=d.sc.clientHeight,th=d.track.clientHeight||ch,bh=d.thumb.offsetHeight||28,use=Math.max(1,th-bh);
    d.sc.scrollTop=d.ds+((e.clientY-d.dy)/use)*(sh-ch);
  });
  window.addEventListener('mouseup',function(){
    if(!dcHudDrag)return;
    dcHudDrag.rail.classList.remove('dragging');
    dcHudDrag=null;
  });

  function bindProjHudRail(body,sc,rail,track,thumb,moreEl){
    var scrT=null;
    function sync(){
      var sh=sc.scrollHeight,ch=sc.clientHeight,st=sc.scrollTop,max=Math.max(0,sh-ch),need=max>4;
      body.classList.toggle('has-top',need&&st>6);
      body.classList.toggle('has-bot',need&&st<max-6);
      rail.classList.toggle('needed',need);
      if(!need){moreEl.textContent='Semua tampil';moreEl.className='dc-pop-more done';return}
      var th=track.clientHeight||ch,bh=Math.max(28,Math.round((ch/sh)*th)),bt=Math.round((max?st/max:0)*(th-bh));
      thumb.style.height=bh+'px';
      thumb.style.transform='translateY('+bt+'px)';
      if(st>=max-6){moreEl.textContent='Akhir daftar';moreEl.className='dc-pop-more done'}
      else{moreEl.textContent='\u2193 Scroll untuk lainnya';moreEl.className='dc-pop-more'}
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
      dcHudDrag={sc:sc,rail:rail,track:track,thumb:thumb,dy:e.clientY,ds:sc.scrollTop};
      rail.classList.add('dragging');
    });
    return sync;
  }

  function closeMenus(){
    var pw=document.getElementById('dcProjWrap'),p=document.getElementById('dcProjPop'),b=document.getElementById('dcProjBtn');
    if(p)p.hidden=true;if(pw)pw.classList.remove('open');if(b)b.setAttribute('aria-expanded','false');
  }

  function ensureControls(hdr){
    if(!hdr)return;
    if(!document.getElementById('dcProjWrap')){
      var pw=document.createElement('div');
      pw.id='dcProjWrap';
      pw.className='pop-wrap dc-proj-wrap';
      pw.innerHTML='<button type="button" class="dc-gl-btn" id="dcProjBtn" aria-haspopup="true" aria-expanded="false">'
        +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6"/></svg>'
        +'<span><span class="dc-pl">Proyek aktif</span><span class="dc-pn" id="dcProjBtnName">Memuat…</span></span>'
        +'<svg class="dc-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
        +'</button>'
        +'<div class="dc-pop" id="dcProjPop" hidden role="region" aria-label="Pilih Proyek Document Control">'
          +'<div class="dc-pop-top">'
            +'<div class="dc-pop-h"><span>Pilih Proyek</span><span class="dc-pop-cnt" id="dcProjCount"></span></div>'
            +'<div class="dc-pop-qwrap">'
              +'<svg class="dc-pop-qic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'
              +'<input type="search" class="dc-pop-q" id="dcProjSearch" placeholder="Cari proyek…" aria-label="Cari proyek" autocomplete="off">'
              +'<button type="button" class="dc-pop-clr" id="dcProjClear" aria-label="Bersihkan pencarian">\u00d7</button>'
            +'</div>'
          +'</div>'
          +'<div class="dc-pop-body" id="dcProjBody">'
            +'<div class="dc-pop-list" id="dcProjList" tabindex="0" aria-label="Daftar proyek"></div>'
            +'<div class="dc-pop-rail" id="dcProjRail" aria-hidden="true"><div class="dc-pop-track" id="dcProjTrack"><div class="dc-pop-thumb" id="dcProjThumb"></div></div></div>'
          +'</div>'
          +'<div class="dc-pop-foot"><span class="dc-pop-more" id="dcProjMore"></span><span class="dc-pop-kbd">\u2191\u2193 \u00b7 Enter</span></div>'
        +'</div>';
      var t=hdr.querySelector('.t');
      if(t&&t.nextSibling)hdr.insertBefore(pw,t.nextSibling);else hdr.appendChild(pw);

      var btn=document.getElementById('dcProjBtn'),pop=document.getElementById('dcProjPop'),qInp=document.getElementById('dcProjSearch'),clr=document.getElementById('dcProjClear');
      var body=document.getElementById('dcProjBody'),list=document.getElementById('dcProjList'),rail=document.getElementById('dcProjRail'),track=document.getElementById('dcProjTrack'),thumb=document.getElementById('dcProjThumb'),more=document.getElementById('dcProjMore');
      dcHudSync=bindProjHudRail(body,list,rail,track,thumb,more);

      btn.addEventListener('click',function(ev){
        ev.stopPropagation();
        var sel=document.getElementById('projSel');
        if(!sel||sel.options.length<2)return;
        var open=pop.hidden;
        if(open){qInp.value='';syncProjMenu();pop.hidden=false;pw.classList.add('open');btn.setAttribute('aria-expanded','true');requestAnimationFrame(function(){if(dcHudSync)dcHudSync();qInp.focus()});}
        else closeMenus();
      });
      pop.addEventListener('click',function(ev){ev.stopPropagation()});
      qInp.addEventListener('input',function(){list.scrollTop=0;syncProjMenu()});
      clr.addEventListener('click',function(ev){ev.stopPropagation();qInp.value='';qInp.focus();syncProjMenu()});
      pop.addEventListener('keydown',function(ev){
        var bs=Array.prototype.slice.call(list.querySelectorAll('.dc-pop-opt'));
        if(!bs.length)return;
        var idx=bs.indexOf(document.activeElement);
        if(ev.key==='ArrowDown'){ev.preventDefault();bs[Math.min(bs.length-1,idx+1)].focus()}
        else if(ev.key==='ArrowUp'){ev.preventDefault();if(idx<=0)qInp.focus();else bs[idx-1].focus()}
        else if(ev.key==='Escape'){closeMenus();btn.focus()}
      });
      qInp.addEventListener('keydown',function(ev){
        var bs=Array.prototype.slice.call(list.querySelectorAll('.dc-pop-opt'));
        if(ev.key==='ArrowDown'&&bs.length){ev.preventDefault();bs[0].focus()}
        else if(ev.key==='Enter'&&bs.length===1){ev.preventDefault();bs[0].click()}
        else if(ev.key==='Escape'){closeMenus();btn.focus()}
      });
      document.addEventListener('click',function(ev){if(!ev.target.closest('#dcProjWrap'))closeMenus()});
    }

    if(!document.getElementById('dcDrivePill')){
      var dp=document.createElement('a');
      dp.id='dcDrivePill';
      dp.className='dc-gl-btn dc-drive-pill';
      dp.target='_blank';
      dp.rel='noopener';
      dp.hidden=true;
      dp.title='Buka folder Google Drive tim';
      dp.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>'
        +'<span><span class="dc-pl">Folder Drive tim</span><span class="dc-pn" id="dcDriveName">–</span></span>'
        +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"/></svg>';
      var pw2=document.getElementById('dcProjWrap');
      if(pw2&&pw2.nextSibling)hdr.insertBefore(dp,pw2.nextSibling);else hdr.appendChild(dp);
    }

    if(!document.getElementById('dcTopSpacer')){
      var sp=document.createElement('span');
      sp.id='dcTopSpacer';
      sp.className='dc-top-sp';
      var anchor=hdr.querySelector('.pmo-qs-trigger,.ntf-wrap,.account-wrap,.acm-wrap,#themeBtn,#userAv');
      if(anchor)hdr.insertBefore(sp,anchor);else hdr.appendChild(sp);
    }
  }

  function syncProjMenu(){
    var sel=document.getElementById('projSel'),list=document.getElementById('dcProjList'),btn=document.getElementById('dcProjBtn'),lbl=document.getElementById('dcProjBtnName');
    var qInp=document.getElementById('dcProjSearch'),clr=document.getElementById('dcProjClear'),cnt=document.getElementById('dcProjCount');
    if(!sel||!lbl)return;
    var opts=Array.prototype.slice.call(sel.options||[]);
    var curOpt=opts.find(function(o){return o.selected})||opts[0];
    var pname=(curOpt&&curOpt.textContent)||((typeof D!=='undefined'&&D&&D.project&&D.project.name)||'Document Control');
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
      em.className='dc-pop-empty';
      em.innerHTML='Tidak ada proyek cocok dengan "<b>'+esc(rawQ.trim())+'</b>".';
      list.appendChild(em);
      if(dcHudSync)dcHudSync();
      return;
    }
    shown.forEach(function(o){
      var raw=String(o.textContent||'').trim();
      var parts=raw.split(' · ');
      var nm=parts[0]||raw,badge=parts.slice(1).join(' · ');
      var b=document.createElement('button');
      b.type='button';
      b.className='dc-pop-opt'+(o.selected?' on':'');
      b.innerHTML='<span class="dc-pop-nm">'+esc(nm)+'</span>'+(badge?'<span class="dc-pop-bdg">'+esc(badge)+'</span>':'')+'<span class="dc-pop-go" aria-hidden="true">\u203a</span>';
      b.onclick=function(){
        closeMenus();
        if(sel.value!==o.value){
          sel.value=o.value;
          sel.dispatchEvent(new Event('change',{bubbles:true}));
        }
      };
      list.appendChild(b);
    });
    if(dcHudSync)dcHudSync();
  }

  function enhanceKpis(){
    var box=document.getElementById('kpis');
    if(!box||typeof D==='undefined'||!D)return;
    var cards=Array.prototype.slice.call(box.querySelectorAll('.kpi'));
    if(!cards.length)return;
    var targets=['reg','chk','bond','asb'];
    var s=typeof chkStats==='function'?chkStats():{req:0,ok:0,miss:0};
    var ab=D.asbuilt||{items:[],rev:0};
    cards.forEach(function(k,idx){
      var top=k.querySelector('.kpi-top'),sm=k.querySelector('small');
      if(sm&&!top){
        top=document.createElement('div');
        top.className='kpi-top';
        k.insertBefore(top,sm);
        top.appendChild(sm);
        var b=document.createElement('span');
        b.className='kpi-badge';
        if(idx===0){b.classList.add('info');b.textContent='3 Tahap';}
        else if(idx===1){b.classList.add(s.miss?'warn':'ok');b.textContent=s.miss?(s.miss+' belum ada'):'Lengkap';}
        else if(idx===2){
          var warnTxt=k.querySelector('b.neg,b.wrn');
          b.classList.add(warnTxt?'warn':'ok');
          b.textContent=warnTxt?'Perlu cek':'Aman';
        }else if(idx===3){
          b.classList.add('info');
          b.textContent=ab.ready?('Eng Rev '+ab.rev):'Belum ada';
        }
        top.appendChild(b);
      }
      if(!k.getAttribute('data-dc-jump')){
        k.setAttribute('data-dc-jump',targets[idx]||'reg');
        k.setAttribute('role','button');
        k.setAttribute('tabindex','0');
        k.onclick=function(){if(typeof setTab==='function')setTab(k.getAttribute('data-dc-jump'))};
        k.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();k.click()}};
      }
    });
  }

  function syncHeroMeta(){
    var hero=heroEl();if(!hero)return;
    var h1=document.getElementById('dcHeroH1'),ey=document.getElementById('dcHeroEy'),dp=document.getElementById('dcDrivePill'),dn=document.getElementById('dcDriveName');
    var pn='';
    if(typeof D!=='undefined'&&D&&D.project&&D.project.name)pn=D.project.name;
    else{
      var pt=document.getElementById('projTitle');
      if(pt&&pt.textContent)pn=pt.textContent.replace(/^Document Control\s*·\s*/i,'').trim();
    }
    if(!pn||/^Document Control$/i.test(pn))pn='';
    if(h1){
      var nextHtml=pn?'Document Control: <span>'+esc(pn)+'</span>':'Document Control';
      if(h1.innerHTML!==nextHtml)h1.innerHTML=nextHtml;
    }
    if(ey&&typeof D!=='undefined'&&D){
      var pills=['<span>Modul 2 · Pelaksanaan proyek</span>'];
      if(!D.ktr&&Array.isArray(D.docs))pills.push('<span class="dc-hero-pill ok">'+D.docs.length+' Dokumen Terdaftar</span>');
      if(!D.ktr&&typeof chkStats==='function'){
        var st=chkStats();
        pills.push('<span class="dc-hero-pill '+(st.miss?'warn':'ok')+'">'+(st.miss?(st.miss+' Wajib Belum Ada'):'Semua Wajib Lengkap')+'</span>');
      }
      pills.push('<span class="dc-hero-pill">'+(D.canManage?'Mode Editor':'Hanya Lihat')+'</span>');
      var eyHtml=pills.join('');
      if(ey.innerHTML!==eyHtml)ey.innerHTML=eyHtml;
    }
    if(dp){
      if(typeof D!=='undefined'&&D&&!D.ktr&&D.drive&&D.drive.url){
        dp.hidden=false;
        dp.href=D.drive.url;
        if(dn)dn.textContent=D.drive.name||'Google Drive Tim';
      }else{
        dp.hidden=true;
      }
    }
    syncProjMenu();
    enhanceKpis();
  }

  function ensureStuckNodes(hero,mainEl){
    var host=document.getElementById('exStuckHost');
    if(!host&&mainEl){host=document.createElement('div');host.id='exStuckHost';host.hidden=true;mainEl.insertBefore(host,mainEl.firstChild)}
    var hSp=document.getElementById('dcHeroSpacer');
    var pSp=document.getElementById('dcPbarSpacer');
    if(!pSp&&hero&&hero.parentNode){pSp=document.createElement('div');pSp.id='dcPbarSpacer';hero.parentNode.insertBefore(pSp,hero.nextSibling)}
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
          var anchor=hdr.querySelector('.pmo-qs-trigger,.ntf-wrap,.account-wrap,.acm-wrap,#themeBtn,#userAv');
          if(anchor)hdr.insertBefore(pbar,anchor);else hdr.appendChild(pbar);
        }
        void nodes.host.offsetHeight;
        H.classList.add('ex-hdr-stuck');
      }else if(pbar&&pbar.parentNode!==hdr){
        var anchor2=hdr.querySelector('.pmo-qs-trigger,.ntf-wrap,.account-wrap,.acm-wrap,#themeBtn,#userAv');
        if(anchor2)hdr.insertBefore(pbar,anchor2);else hdr.appendChild(pbar);
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
    var hero=ensureHeroSection(),mainEl=document.querySelector('.main'),hdr=document.querySelector('header.top'),pbar=document.getElementById('pmoPbar');
    if(!hero||!mainEl||!hdr)return;
    var mob=window.innerWidth<=900||H.classList.contains('m-mode');

    if(mob){
      H.classList.remove('ex-hero-hdr');
      hero.hidden=true;
      var host=document.getElementById('exStuckHost');
      clearStuckState({host:host,hSp:document.getElementById('dcHeroSpacer'),pSp:document.getElementById('dcPbarSpacer')});
      if(hdr.parentNode!==mainEl)mainEl.insertBefore(hdr,mainEl.firstChild);
      if(pbar&&pbar.parentNode!==mainEl)mainEl.insertBefore(pbar,hdr.nextSibling);
      return;
    }

    hero.hidden=false;
    H.classList.add('ex-hero-hdr');
    ensureControls(hdr);
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
      var mob=window.innerWidth<=900||document.documentElement.classList.contains('m-mode');
      var pbar=document.getElementById('pmoPbar');
      if(!mob&&pbar&&pbar.parentNode===mainNode)schedSync();
    }).observe(mainNode,{childList:true});
  }

  ['kpis','projSel','projTitle'].forEach(function(id){
    var el=document.getElementById(id);
    if(el&&window.MutationObserver)new MutationObserver(schedMeta).observe(el,{childList:true,characterData:true,subtree:true});
  });

  if(typeof window.setData==='function'){
    var __origSetData=window.setData;
    window.setData=function(){
      var res=__origSetData.apply(this,arguments);
      schedMeta();
      return res;
    };
  }
  if(typeof window.renderKpis==='function'){
    var __origRenderKpis=window.renderKpis;
    window.renderKpis=function(){
      var res=__origRenderKpis.apply(this,arguments);
      schedMeta();
      return res;
    };
  }
  if(typeof window.setTab==='function'){
    var __origSetTab=window.setTab;
    window.setTab=function(){
      var res=__origSetTab.apply(this,arguments);
      setTimeout(schedMeta,0);
      return res;
    };
  }

  syncUnifiedHeader();
  setTimeout(syncUnifiedHeader,150);
  setTimeout(syncUnifiedHeader,600);
})();
</script>`;

const DOC_HERO_PATCHES = [
  {
    file: 'DocControl',
    find: '</head>',
    replace: DOC_HERO_CSS + '\n</head>',
  },
  {
    file: 'DocControl',
    find: '</body>',
    replace: DOC_HERO_JS + '\n</body>',
  },
];

module.exports = { DOC_HERO_PATCHES };

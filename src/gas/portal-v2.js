'use strict';

/**
 * Portal Proyek · tampilan "Vision 2030" (18 Nov 2026).
 * Acuan: docs/vision2030-portal-preview.html.
 *
 * Prinsip: tidak membuang fungsi lama. Elemen lama (header, hero + carousel heroPhotos, KPI, Ringkasan
 * dari portal-latest.js, Story Lapangan, menu akun/tema, notifikasi, Cari, Sena) tetap dipakai; skrip ini
 * hanya menata ulang DOM dan menambah:
 *   - menu modul sebagai dropdown di header (isi diambil dari tombol kartu Modul lama, jadi hak akses tetap),
 *   - strip utilitas (breadcrumb + tombol),
 *   - grid kartu proyek portrait bertingkat dari i.lw (week terakhir yang diinput) + filter,
 *   - tab "TANYA SENA" di tepi kanan yang membuka widget Sena (AiWidget).
 * Semua CSS berada di bawah html.pv2 sehingga halaman lain tidak terpengaruh.
 */

const CSS = String.raw`<style id="pmoPortalV2Css">
html.pv2{--v-bg:#f2f5f9;--v-ink:#132b43;--v-mut:#5b7085;--v-card:#fff;--v-line:#dce4ee;--v-pill:#e5edf6;--v-pill-ink:#132b43;--v-act:#0f5fa8;--v-act-ink:#fff;--v-acc:#0f5fa8;--v-acc2:#0f8a5f;--v-grad:linear-gradient(90deg,#0f5fa8,#0f8a5f);--v-stuck:rgba(7,59,99,.96);--v-foot:#073b63;--v-eye:#0f5fa8}
html.pv2[data-accent="sage"]:not([data-theme="dark"]){--v-bg:#F3F7EC;--v-ink:#0F2A1D;--v-mut:#4F6B52;--v-card:#fff;--v-line:#D3DFCC;--v-pill:#E3EED4;--v-pill-ink:#0F2A1D;--v-act:#375534;--v-acc:#375534;--v-acc2:#6B9071;--v-grad:linear-gradient(90deg,#375534,#6B9071);--v-stuck:rgba(15,42,29,.96);--v-foot:#0F2A1D;--v-eye:#375534}
html.pv2[data-accent="mocha"]:not([data-theme="dark"]){--v-bg:#EDE3D4;--v-ink:#3B2A1F;--v-mut:#725947;--v-card:#FFF9F0;--v-line:#D4B996;--v-pill:#E3D3BE;--v-pill-ink:#3B2A1F;--v-act:#6F4E37;--v-act-ink:#FFF9F0;--v-acc:#6F4E37;--v-acc2:#B08968;--v-grad:linear-gradient(90deg,#6F4E37,#B08968);--v-stuck:rgba(59,42,31,.96);--v-foot:#3B2A1F;--v-eye:#6F4E37}
html.pv2[data-theme="dark"]{--v-bg:#161618;--v-ink:#f3f5f8;--v-mut:#9aa8b8;--v-card:#1e2127;--v-line:rgba(255,255,255,.13);--v-pill:#262629;--v-pill-ink:#d5dbe3;--v-act:#fff;--v-act-ink:#161618;--v-acc:#0f5fa8;--v-acc2:#0f8a5f;--v-grad:linear-gradient(90deg,#38bdf8,#4fd1a0);--v-stuck:rgba(13,21,34,.96);--v-foot:#0d1324;--v-eye:#7dd3fc}
html.pv2,html.pv2 body{background:var(--v-bg)!important;color:var(--v-ink)}
html.pv2 body{margin:0;overflow-x:clip}

/* ---------- header melayang ---------- */
html.pv2 header.top{position:fixed!important;top:0;left:0;right:0;z-index:80;display:flex;align-items:center;gap:14px;padding:12px 36px!important;margin:0!important;max-width:none!important;border:0!important;box-shadow:none!important;background:linear-gradient(180deg,rgba(8,14,22,.84) 0%,rgba(8,14,22,0) 100%)!important;backdrop-filter:none!important;transition:background .25s ease}
html.pv2 header.top.v-stuck{background:var(--v-stuck)!important;border-bottom:1px solid rgba(255,255,255,.12)!important;backdrop-filter:blur(10px)!important}
html.pv2 header.top .brand{display:inline-flex;align-items:center;gap:8px;padding:4px 10px;border-radius:10px;background:rgba(255,255,255,.95);flex:none;cursor:pointer}
html.pv2 header.top .brand img{height:28px!important;width:auto!important;display:block}
html.pv2 header.top>.t{display:none!important}
html.pv2 .v-menu{display:flex;align-items:center;gap:4px;flex:1;min-width:0}
html.pv2 .v-dd{position:relative}
html.pv2 .v-dd>button{border:0;background:transparent;color:rgba(255,255,255,.92);padding:9px 12px;border-radius:99px;cursor:pointer;font:600 11.5px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;min-height:36px}
html.pv2 .v-dd>button:hover,html.pv2 .v-dd.open>button,html.pv2 .v-dd:focus-within>button{background:rgba(255,255,255,.14);color:#fff}
html.pv2 .v-dd-pop{position:absolute;left:0;top:calc(100% + 6px);min-width:240px;background:#131c2b;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:8px;box-shadow:0 18px 40px rgba(0,0,0,.45);opacity:0;pointer-events:none;transform:translateY(4px);transition:opacity .16s ease,transform .16s ease;z-index:90}
html.pv2 .v-dd-pop::before{content:"";position:absolute;left:0;right:0;top:-10px;height:10px}
html.pv2 .v-dd:focus-within .v-dd-pop,html.pv2 .v-dd.open .v-dd-pop{opacity:1;pointer-events:auto;transform:none}
html.pv2 .v-dd-pop>button,html.pv2 .v-has-sub>button{display:block;width:100%;text-align:left;border:0;background:transparent;padding:10px 12px;border-radius:9px;color:#dbe5f0;font:500 13.5px/1.35 Inter,system-ui,sans-serif;cursor:pointer}
html.pv2 .v-dd-pop>button:hover,html.pv2 .v-dd-pop>button:focus-visible,html.pv2 .v-has-sub>button:hover,html.pv2 .v-has-sub>button:focus-visible{background:rgba(255,255,255,.1);color:#fff;outline:0}
html.pv2 .v-dd-pop>button.on{background:var(--v-acc);color:#fff;font-weight:600}
html.pv2 .v-has-sub{position:relative}
html.pv2 .v-has-sub>button{display:flex!important;align-items:center;justify-content:space-between;gap:10px}
html.pv2 .v-has-sub>button span{font-size:16px;opacity:.8}
html.pv2 .v-sub{position:absolute;left:calc(100% + 2px);top:-10px;width:344px;max-width:calc(100vw - 270px);background:rgba(16,25,39,.96);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.14);border-radius:16px;box-shadow:0 24px 54px rgba(3,8,18,.62);opacity:0;pointer-events:none;transform:translateX(-4px);transition:opacity .14s ease,transform .14s ease;display:flex;flex-direction:column;overflow:hidden}
html.pv2 .v-sub::before{content:"";position:absolute;top:-16px;bottom:-16px;left:-18px;width:20px}
html.pv2 .v-has-sub.open>.v-sub,html.pv2 .v-has-sub:focus-within>.v-sub{opacity:1;pointer-events:auto;transform:none}
html.pv2 .v-has-sub.open>button{background:rgba(255,255,255,.1);color:#fff}
html.pv2 .v-sub-top{flex:none;padding:12px 12px 10px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02)}
html.pv2 .v-sub-h{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 2px;margin-bottom:8px;font-size:13px;font-weight:600;color:#7dd3fc}
html.pv2 .v-sub-cnt{font-size:12.5px;font-weight:500;color:#9db0c4;font-variant-numeric:tabular-nums}
html.pv2 .v-sub-qwrap{position:relative;display:flex;align-items:center}
html.pv2 .v-sub-qic{position:absolute;left:11px;width:15px;height:15px;color:#9db0c4;pointer-events:none}
html.pv2 .v-sub-q{width:100%;height:38px;padding:0 34px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(6,12,22,.56);color:#f1f5f9;font:500 13.5px/1.2 Inter,system-ui,sans-serif;transition:border-color .15s ease,background .15s ease}
html.pv2 .v-sub-q::placeholder{color:#8fa3b8}
html.pv2 .v-sub-q:focus{outline:0;border-color:rgba(125,211,252,.7);background:rgba(6,12,22,.82)}
html.pv2 .v-sub .v-sub-clr{position:absolute;right:7px;width:24px;height:24px;padding:0;border:0;border-radius:6px;background:rgba(255,255,255,.09);color:#e2e8f0;cursor:pointer;display:none;place-items:center;text-align:center;font-size:15px;line-height:1}
html.pv2 .v-sub .v-sub-clr.on{display:grid}
html.pv2 .v-sub .v-sub-clr:hover{background:rgba(255,255,255,.18);color:#fff}
html.pv2 .v-sub-body{position:relative}
html.pv2 .v-sub-scroll{max-height:min(328px,60vh);overflow-y:auto;padding:8px 16px 10px 8px;scrollbar-width:none;-ms-overflow-style:none;scroll-behavior:smooth}
html.pv2 .v-sub-scroll::-webkit-scrollbar{display:none}
html.pv2 .v-sub-body.has-top .v-sub-scroll{-webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 18px,#000 100%);mask-image:linear-gradient(180deg,transparent 0%,#000 18px,#000 100%)}
html.pv2 .v-sub-body.has-bot .v-sub-scroll{-webkit-mask-image:linear-gradient(180deg,#000 0%,#000 calc(100% - 24px),transparent 100%);mask-image:linear-gradient(180deg,#000 0%,#000 calc(100% - 24px),transparent 100%)}
html.pv2 .v-sub-body.has-top.has-bot .v-sub-scroll{-webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 18px,#000 calc(100% - 24px),transparent 100%);mask-image:linear-gradient(180deg,transparent 0%,#000 18px,#000 calc(100% - 24px),transparent 100%)}
html.pv2 .v-sub-rail{position:absolute;top:8px;bottom:8px;right:5px;width:10px;border-radius:99px;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .18s ease;display:flex;justify-content:center;z-index:5}
html.pv2 .v-sub:hover .v-sub-rail.needed,html.pv2 .v-sub-body.scrolling .v-sub-rail.needed,html.pv2 .v-sub-rail.dragging{opacity:1;pointer-events:auto}
html.pv2 .v-sub-track{position:relative;width:3px;height:100%;border-radius:99px;background:rgba(255,255,255,.08);transition:width .14s ease,background .14s ease}
html.pv2 .v-sub-rail:hover .v-sub-track,html.pv2 .v-sub-rail.dragging .v-sub-track{width:5px;background:rgba(255,255,255,.15)}
html.pv2 .v-sub-thumb{position:absolute;left:0;right:0;top:0;min-height:28px;border-radius:99px;background:rgba(125,211,252,.52);transition:background .14s ease}
html.pv2 .v-sub-rail:hover .v-sub-thumb,html.pv2 .v-sub-rail.dragging .v-sub-thumb{background:rgba(125,211,252,.92)}
html.pv2 .v-sub .v-sub-btn{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:42px;text-align:left;border:1px solid transparent;background:transparent;padding:9px 12px;border-radius:10px;color:#f1f5f9;font:600 14px/1.35 Inter,system-ui,sans-serif;cursor:pointer;transition:background .12s ease,border-color .12s ease,color .12s ease,transform .12s ease}
html.pv2 .v-sub .v-sub-btn+.v-sub-btn{margin-top:2px}
html.pv2 .v-sub .v-sub-btn:hover,html.pv2 .v-sub .v-sub-btn:focus-visible{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.14);color:#fff;transform:translateX(2px);outline:0}
html.pv2 .v-sub .v-sub-btn:active{transform:translateX(1px) scale(.995)}
html.pv2 .v-sub .v-sub-btn:focus-visible{border-color:#7dd3fc}
html.pv2 .v-sub-main{min-width:0;flex:1}
html.pv2 .v-sub-nm{display:block;font-size:14px;font-weight:600;line-height:1.35;color:inherit}
html.pv2 .v-sub-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:3px}
html.pv2 .v-sub-bdg{display:inline-flex;align-items:center;font-size:12px;line-height:1.25}
html.pv2 .v-sub-bdg.ok{padding:2px 7px;border-radius:6px;background:rgba(16,185,129,.18);color:#6ee7b7;font-size:11.5px;font-weight:600}
html.pv2 .v-sub-bdg.sub{color:#9db0c4;font-weight:500}
html.pv2 .v-sub-go{flex:none;font-size:16px;line-height:1;color:#7dd3fc;opacity:0;transform:translateX(-3px);transition:opacity .12s ease,transform .12s ease}
html.pv2 .v-sub .v-sub-btn:hover .v-sub-go,html.pv2 .v-sub .v-sub-btn:focus-visible .v-sub-go{opacity:.95;transform:none}
html.pv2 .v-sub-empty{padding:24px 12px;text-align:center;font-size:13px;color:#9db0c4;line-height:1.5}
html.pv2 .v-sub-foot{flex:none;display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-top:1px solid rgba(255,255,255,.08);background:rgba(8,14,24,.55);font-size:12px;color:#9db0c4}
html.pv2 .v-sub-more{color:#7dd3fc;font-weight:600}
html.pv2 .v-sub-more.done{color:#94a3b8;font-weight:500}
html.pv2 .v-sub-kbd{font-size:11.5px;color:#9db0c4}
html.pv2 .v-sh-sub button{display:block;width:100%;text-align:left;border:0;background:transparent;padding:9px 12px;border-radius:9px;color:#dbe5f0;font:500 13px/1.3 Inter,system-ui,sans-serif;cursor:pointer}
html.pv2 .v-sh-sub button:hover{background:rgba(255,255,255,.1);color:#fff;outline:0}
html.pv2 .v-sh-sub small{display:block;font-size:11px;color:#94a3b8;margin-top:2px}
html.pv2 .v-sh-sub{margin:0 0 6px 14px;padding-left:8px;border-left:2px solid rgba(255,255,255,.14)}
html.pv2 .v-sh-sub button{min-height:44px;font-size:13.5px}
html.pv2 .v-burger{display:none;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.1);color:#fff;border-radius:99px;min-height:40px;padding:0 14px;font:600 12px/1 Inter,system-ui,sans-serif;cursor:pointer;align-items:center;gap:6px}
html.pv2 .v-burger svg{width:18px;height:18px}
html.pv2 header.top .ntf-wrap{margin-left:auto}
html.pv2 header.top .ntf-wrap,html.pv2 header.top .pmo-qs-trigger,html.pv2 header.top .account-wrap{flex:none}
html.pv2 header.top .ntf-wrap>button,html.pv2 header.top .pmo-qs-trigger,html.pv2 header.top .account-wrap>.chip{background:rgba(255,255,255,.12)!important;border:1px solid rgba(255,255,255,.28)!important;color:#fff!important;box-shadow:none!important}
html.pv2 header.top .pmo-qs-trigger *,html.pv2 header.top .account-wrap>.chip b,html.pv2 header.top .account-wrap>.chip small,html.pv2 header.top .account-wrap>.chip .ic,html.pv2 header.top .ntf-wrap>button svg{color:#fff!important}
html.pv2 header.top .pmo-qs-trigger kbd{background:rgba(255,255,255,.14)!important;border-color:rgba(255,255,255,.3)!important;color:#fff!important}
html.pv2 header.top .account-wrap>.chip small{opacity:.8}

/* ---------- hero penuh + strip bawah pas 1 layar ---------- */
html.pv2 .v-first{display:flex;flex-direction:column;min-height:100svh}
@media (min-width:761px){html.pv2 .v-first{height:100svh;min-height:580px}}
html.pv2 #hero.hero{position:relative;flex:1 1 auto;height:auto!important;min-height:460px;max-height:none!important;margin:0!important;border-radius:0!important;overflow:hidden;display:flex;align-items:flex-end;padding:0!important;box-shadow:none!important;background:#0b1825!important}
html.pv2 #hero .hero-bg{position:absolute;inset:0;z-index:0}
html.pv2 #hero .hero-bg>div{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transform:scale(1.04);transition:opacity 1.4s ease,transform 7s ease}
html.pv2 #hero .hero-bg>div.on{opacity:1;transform:scale(1)}
html.pv2 #hero::before,html.pv2 #hero::after{display:none!important}
html.pv2 #hero .v-scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(7,15,24,.45) 0%,rgba(7,15,24,.15) 45%,rgba(10,16,24,.88) 100%);pointer-events:none}
html.pv2 #hero .hero-in{position:absolute;z-index:2;left:0;bottom:0;width:auto;max-width:min(860px,calc(100% - 260px));margin:0!important;padding:0 0 44px 48px!important;background:none!important;display:block!important;min-height:0!important;height:auto!important;top:auto!important}
html.pv2 #hero .hero-top{display:block!important;margin:0!important;padding:0!important;min-height:0!important}
html.pv2 #hero .hero-t{margin:0!important;padding:0!important}
html.pv2 #hero #greet,html.pv2 #hero #heroSub,html.pv2 #hero .stamp,html.pv2 #hero .hero-kpis,html.pv2 #hero .hero-cap{display:none!important}
html.pv2 #hero .hero-eye{display:block;font-size:11.5px!important;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#7dd3fc!important;margin:0 0 12px!important}
html.pv2 #hero .hero-eye::before{display:none!important}
html.pv2 #hero .v-h1{margin:0;font-size:clamp(32px,5vw,60px);font-weight:300;line-height:1.06;letter-spacing:-.02em;color:#fff;max-width:780px}
html.pv2 #hero .v-h1 b{font-weight:700}
html.pv2 #hero .hero-dots{position:absolute!important;z-index:3;right:48px!important;left:auto!important;bottom:48px!important;top:auto!important;display:flex;gap:8px;align-items:center}
html.pv2 #hero .hero-dots button{width:10px;height:10px;min-width:0;min-height:0;border-radius:99px;border:0;padding:0;cursor:pointer;background:rgba(255,255,255,.35);transition:width .25s ease,background .25s ease}
html.pv2 #hero .hero-dots button.on{width:28px;background:#fff}
html.pv2 #hero #heroName{color:rgba(255,255,255,.82);font-size:12px;margin-right:6px;white-space:nowrap}

/* ---------- strip utilitas ---------- */
html.pv2 .v-util{flex:none;background:#fff;color:#132b43;border-bottom:1px solid #e0e8f0;padding:15px 48px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px}
html.pv2[data-theme="dark"] .v-util{background:#0f141c;color:#e2e8f0;border-color:rgba(255,255,255,.1)}
html.pv2 .v-crumb{font-size:12.5px;color:#5b7085;font-weight:500}
html.pv2 .v-crumb b{color:#073b63}
html.pv2[data-theme="dark"] .v-crumb{color:#94a3b8}html.pv2[data-theme="dark"] .v-crumb b{color:#e2e8f0}
html.pv2 .v-ua{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
html.pv2 .v-ub{border:1px solid #d2dde8;background:#f5f8fc;color:#073b63;padding:0 18px;min-height:40px;display:inline-flex;align-items:center;border-radius:99px;font:700 11.5px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;text-decoration:none}
html.pv2 .v-ub.pri{background:var(--v-acc);border-color:var(--v-acc);color:#fff}
html.pv2[data-theme="dark"] .v-ub:not(.pri){background:#1b2330;border-color:rgba(255,255,255,.16);color:#e2e8f0}

/* ---------- kanvas ---------- */
html.pv2 main.wrap{max-width:none!important;margin:0!important;padding:20px 48px 52px!important;background:var(--v-bg)}
html.pv2 main.wrap>*{max-width:1280px;margin-left:auto!important;margin-right:auto!important}
html.pv2 main.wrap>section.grp:first-of-type{margin-top:0!important}
html.pv2 main.wrap>section.grp:first-of-type+.v-sum{margin-top:16px!important}
html.pv2 main.wrap>section.grp>h2{font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--v-eye)!important}
html.pv2 main.wrap>section.grp>h2::after{background:var(--v-line)!important}
html.pv2 .v-sum{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:22px!important}
html.pv2 .v-sum .hk{background:var(--v-card)!important;border:1px solid var(--v-line)!important;border-radius:16px;padding:16px 18px;box-shadow:0 6px 20px rgba(0,0,0,.06);color:var(--v-ink)!important;backdrop-filter:none!important}
html.pv2 .v-sum .hk small{display:block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--v-mut)!important;margin-bottom:6px}
html.pv2 .v-sum .hk b{color:var(--v-ink)!important;font-size:24px}
html.pv2 .v-sum .hk b span{color:var(--v-mut)!important}
html.pv2 .v-sum .hk>span,html.pv2 .v-sum .hk span{color:var(--v-mut)}
html.pv2 .v-sum .hk .up{color:#14724f!important}html.pv2 .v-sum .hk .dn{color:#c0302f!important}
html.pv2[data-theme="dark"] .v-sum .hk .up{color:#22c55e!important}html.pv2[data-theme="dark"] .v-sum .hk .dn{color:#f87171!important}
html.pv2 .v-sum .hk .seg{background:var(--v-line)!important}

/* Ringkasan (portal-latest.js) */
html.pv2 #briefBox.story{background:var(--v-card)!important;border:1px solid var(--v-line)!important;border-radius:18px!important;padding:22px 24px!important;box-shadow:0 6px 20px rgba(0,0,0,.06)!important;color:var(--v-ink)!important}
html.pv2 #briefBox .xbn-wrap,html.pv2 #briefBox .xbn-memo{background:none!important;border:0!important;padding:0!important;box-shadow:none!important;color:var(--v-ink)!important}
html.pv2 #briefBox .xpl-lead{color:var(--v-mut)!important;font-size:13px}
html.pv2 #briefBox .xpl-tools button{color:var(--v-acc)!important}
html.pv2[data-theme="dark"] #briefBox .xpl-tools button{color:#7dd3fc!important}
html.pv2 #briefBox .xbn-tag{background:var(--v-acc)!important;color:#fff!important}
html.pv2 #briefBox .xbn-tag.rut{background:var(--v-acc2)!important}
html.pv2 #briefBox details.xpl-p{border:1px solid var(--v-line)!important;border-radius:12px!important;background:var(--v-bg)!important;padding:10px 14px!important;margin:0 0 8px!important}
html.pv2 #briefBox details.xpl-p summary{color:var(--v-ink)!important}
html.pv2 #briefBox .xpl-b{border-top:1px solid var(--v-line)!important;color:var(--v-mut)!important}
html.pv2 #briefBox .xpl-mon{background:var(--v-pill)!important;border-color:var(--v-line)!important;color:var(--v-ink)!important}
html.pv2 #briefBox .xpl-mon a{color:var(--v-acc)!important}
html.pv2[data-theme="dark"] #briefBox .xpl-mon a{color:#7dd3fc!important}

/* ---------- showcase daftar proyek ala Vision 2030 ---------- */
html.pv2 #briefBox .xpl-mon{display:none!important}
html.pv2 #briefBox .xpl-acts,.xpl-acts{margin:2px 0 10px;padding-left:22px;display:grid;gap:3px}
html.pv2 #briefBox .xpl-acts li{padding-left:2px}
html.pv2 .v20-sec{position:relative;scroll-margin-top:var(--pv2-hh,64px);min-height:max(620px,calc(100svh - var(--pv2-hh,64px) - var(--pv2-fh,83px)));width:100%;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;padding:44px 56px 48px;margin-top:0;background:#0b1523;color:#fff;user-select:none}
html.pv2 .v20-bg{position:absolute;inset:0;z-index:0}
html.pv2 .v20-bg-slide{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transform:scale(1.05);transition:opacity .9s cubic-bezier(.22,1,.36,1),transform 7s linear;will-change:opacity,transform}
html.pv2 .v20-bg-slide.on{opacity:1;transform:scale(1)}
html.pv2 .v20-scrim{position:absolute;inset:0;z-index:1;pointer-events:none;background:
  linear-gradient(92deg,rgba(7,15,26,.93) 0%,rgba(7,15,26,.78) 44%,rgba(7,15,26,.34) 76%,rgba(7,15,26,.54) 100%),
  linear-gradient(180deg,rgba(7,15,26,.68) 0%,rgba(7,15,26,.14) 36%,rgba(7,15,26,.88) 100%)}
html.pv2 .v20-in{position:relative;z-index:3;max-width:1280px;width:100%;margin:0 auto;display:flex;flex-direction:column;flex:1 1 auto;justify-content:space-between}
html.pv2 .v20-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;margin-bottom:28px}
html.pv2 .v20-eye{font-size:11.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#38bdf8}
html.pv2 .v20-filters{display:flex;flex-wrap:wrap;gap:8px}
html.pv2 .v20-filters button{border:1px solid rgba(255,255,255,.26);background:rgba(11,20,34,.62);color:#e2e8f0;padding:0 16px;min-height:38px;border-radius:99px;font:600 12px/1 Inter,system-ui,sans-serif;cursor:pointer;transition:background .18s ease,color .18s ease,border-color .18s ease}
html.pv2 .v20-filters button:hover{border-color:#fff;color:#fff}
html.pv2 .v20-filters button.on{background:#fff;color:#0f172a;border-color:#fff}
html.pv2 .v20-filters button:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}

html.pv2 .v20-body{display:grid;grid-template-columns:minmax(0,1.02fr) minmax(0,.98fr);align-items:center;gap:42px;flex:1 1 auto}
html.pv2 .v20-left{min-width:0;transition:opacity .24s ease,transform .24s ease}
html.pv2 .v20-left.switching{opacity:.22;transform:translateY(6px)}
html.pv2 .v20-par{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#a8c7e4;margin-bottom:8px}
html.pv2 .v20-title{position:relative;margin:0 0 22px;padding-bottom:14px;font-size:clamp(24px,3vw,40px);font-weight:700;line-height:1.15;color:#fff;max-width:600px}
html.pv2 .v20-title::after{content:"";position:absolute;left:0;bottom:0;height:3px;width:min(220px,65%);border-radius:99px;background:linear-gradient(90deg,#38bdf8,#34d399)}
html.pv2 .v20-stats{display:flex;flex-wrap:wrap;align-items:center;gap:14px 28px;padding-top:16px;border-top:1px solid rgba(255,255,255,.18)}
html.pv2 .v20-stat small{display:block;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:2px}
html.pv2 .v20-stat b{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;color:#fff}
html.pv2 .v20-stat.act b{color:#38bdf8}
html.pv2 .v20-stat.dev.ok b{color:#34d399}html.pv2 .v20-stat.dev.warn b{color:#fbbf24}html.pv2 .v20-stat.dev.bad b{color:#fb7185}
html.pv2 .v20-gal-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:14px;font-size:12.5px;color:#cbd5e1}
html.pv2 .v20-gal-btn{border:1px solid rgba(255,255,255,.26);background:rgba(11,20,34,.55);color:#fff;padding:4px 10px;border-radius:99px;font:600 11px/1.2 inherit;cursor:pointer}
html.pv2 .v20-gal-btn:hover{border-color:#fff;background:rgba(255,255,255,.16)}

html.pv2 .v20-right{display:flex;flex-direction:column;align-items:flex-start;gap:18px;min-width:0}
html.pv2 .v20-deck{position:relative;width:100%;max-width:460px;height:430px;touch-action:pan-y;cursor:grab}
html.pv2 .v20-deck.dragging{cursor:grabbing}
html.pv2 .v20-card{position:absolute;left:0;top:0;width:316px;height:420px;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.24);background:#142133;box-shadow:0 22px 48px rgba(0,0,0,.55);display:flex;flex-direction:column;justify-content:space-between;padding:18px;color:#fff;transition:transform .38s cubic-bezier(.22,1,.36,1),opacity .38s ease,filter .38s ease;will-change:transform,opacity}
html.pv2 .v20-card.no-tr{transition:none!important}
html.pv2 .v20-card-img{position:absolute;inset:0;background-size:cover;background-position:center;z-index:0}
html.pv2 .v20-card::after{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(8,15,26,.36) 0%,rgba(8,15,26,.08) 40%,rgba(8,15,26,.92) 94%)}
html.pv2 .v20-card[data-pos="0"]{z-index:5;transform:translate3d(0,0,0) scale(1);opacity:1;cursor:pointer}
html.pv2 .v20-card[data-pos="1"]{z-index:4;transform:translate3d(104px,14px,0) scale(.89);opacity:.78;filter:brightness(.68);cursor:pointer}
html.pv2 .v20-card[data-pos="2"]{z-index:3;transform:translate3d(176px,28px,0) scale(.79);opacity:.44;filter:brightness(.5);cursor:pointer}
html.pv2 .v20-card[data-pos="hidden"]{z-index:1;transform:translate3d(204px,34px,0) scale(.72);opacity:0;pointer-events:none}
html.pv2 .v20-card[data-pos="prev"]{z-index:6;transform:translate3d(-120px,0,0) scale(.92);opacity:0;pointer-events:none}

html.pv2 .v20-ctop,html.pv2 .v20-cbot{position:relative;z-index:2}
html.pv2 .v20-ctop{display:flex;align-items:center;justify-content:space-between;gap:8px}
html.pv2 .v-st{padding:4px 10px;border-radius:99px;font-size:11px;font-weight:700;background:rgba(20,114,79,.9);color:#dcf5e9}
html.pv2 .v-st.warn{background:rgba(180,120,10,.92);color:#fff4cc}
html.pv2 .v-st.bad{background:rgba(192,48,47,.92);color:#ffe4e4}
html.pv2 .v-st.done{background:rgba(15,95,168,.92);color:#e0f0ff}
html.pv2 .v-st.wait{background:rgba(90,104,120,.92);color:#eef2f6}
html.pv2 .v20-cpct{font-size:13px;font-weight:800;background:rgba(8,15,26,.72);padding:4px 10px;border-radius:99px;font-variant-numeric:tabular-nums;color:#fff}
html.pv2 .v20-cbot h3{margin:0 0 6px;font-size:20px;font-weight:700;line-height:1.25;color:#fff}
html.pv2 .v20-cbot p{margin:0 0 12px;font-size:12px;color:#cbd5e1;line-height:1.4}
html.pv2 .v20-ccta{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:99px;border:1px solid rgba(255,255,255,.55);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;background:rgba(255,255,255,.12);color:#fff}
html.pv2 .v20-card[data-pos="0"]:hover .v20-ccta{background:#fff;color:#0f172a;border-color:#fff}

html.pv2 .v20-ctrl{display:flex;align-items:center;justify-content:space-between;gap:12px;width:316px}
html.pv2 .v20-all{border:1px solid rgba(52,211,153,.7);background:rgba(16,185,129,.16);color:#fff;min-height:40px;padding:0 18px;border-radius:99px;font:600 12.5px/1 Inter,system-ui,sans-serif;cursor:pointer;transition:background .18s ease}
html.pv2 .v20-all:hover{background:rgba(16,185,129,.34)}
html.pv2 .v20-arrows{display:flex;align-items:center;gap:8px}
html.pv2 .v20-arr{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.34);background:rgba(11,20,34,.68);color:#fff;font-size:17px;display:grid;place-items:center;cursor:pointer;transition:background .18s ease,color .18s ease}
html.pv2 .v20-arr:hover:not(:disabled){background:#fff;color:#0f172a}
html.pv2 .v20-arr:disabled{opacity:.35;cursor:default}
html.pv2 .v20-arr:focus-visible,.v20-all:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}
html.pv2 .v20-count{font-size:12px;color:#cbd5e1;font-variant-numeric:tabular-nums;margin-right:2px}
html.pv2 .v20-empty{padding:48px 0;text-align:center;color:#cbd5e1;font-size:14px}

/* bagian lama yang dipindah ke header / grid baru */
html.pv2 main.wrap>section.grp.v-hide{display:none!important}
html.pv2 .foot.v-foot{max-width:none!important;margin:0!important;background:var(--v-foot);border-top:1px solid rgba(255,255,255,.1);padding:32px 136px 32px 48px;color:#cbd5e1;font-size:12.5px;display:flex;flex-wrap:wrap;justify-content:space-between;gap:14px;text-align:left}

/* ---------- Tanya Sena ---------- */
html.pv2 .v-sena{position:fixed;right:18px;top:auto;bottom:152px;transform:none;z-index:70;writing-mode:vertical-rl;text-orientation:mixed;padding:14px 10px;border:1px solid rgba(255,255,255,.22);border-radius:99px;cursor:pointer;background:linear-gradient(180deg,var(--v-acc) 0%,var(--v-acc2) 100%);color:#fff;font:700 11.5px/1 Inter,system-ui,sans-serif;letter-spacing:.14em;box-shadow:0 10px 26px rgba(0,0,0,.36);min-width:40px}
html.pv2 .aic-fab{opacity:0!important;pointer-events:none!important}

/* ---------- menu HP ---------- */
html.pv2 .v-sheet{position:fixed;inset:0;z-index:120;background:rgba(5,10,18,.6);display:flex;justify-content:flex-end}
html.pv2 .v-sheet[hidden]{display:none}
html.pv2 .v-sheet-in{width:min(360px,88vw);height:100%;overflow:auto;background:#131c2b;color:#e2e8f0;padding:18px 16px 40px;box-shadow:-10px 0 40px rgba(0,0,0,.4)}
html.pv2 .v-sheet-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-weight:700}
html.pv2 .v-sheet-h button{border:0;background:rgba(255,255,255,.1);color:#fff;width:44px;height:44px;border-radius:12px;cursor:pointer;font-size:20px}
html.pv2 .v-sheet h4{margin:16px 6px 6px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#7dd3fc}
html.pv2 .v-sheet-in>button{display:block;width:100%;text-align:left;border:0;background:transparent;color:#e2e8f0;padding:12px 10px;border-radius:10px;font:500 14px/1.3 Inter,system-ui,sans-serif;cursor:pointer;min-height:44px}
html.pv2 .v-sheet-in>button:hover,html.pv2 .v-sheet-in>button.on{background:rgba(255,255,255,.1)}

@media (max-width:1180px){html.pv2 .v-dd>button{padding:9px 8px;letter-spacing:.03em}}
@media (max-width:1080px){
  html.pv2 .v-menu{display:none}html.pv2 .v-burger{display:inline-flex}
  html.pv2 header.top{padding:10px 18px!important}
  html.pv2 header.top .ntf-wrap{margin-left:auto}
  html.pv2 .v-sum{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:960px){
  html.pv2 .v20-sec{padding:28px 20px 34px;min-height:auto}
  html.pv2 .v20-body{grid-template-columns:1fr;gap:24px}
  html.pv2 .v20-deck{height:380px}
  html.pv2 .v20-card{width:280px;height:370px}
  html.pv2 .v20-card[data-pos="1"]{transform:translate3d(64px,12px,0) scale(.90)}
  html.pv2 .v20-card[data-pos="2"]{transform:translate3d(104px,22px,0) scale(.82)}
  html.pv2 .v20-ctrl{width:100%;max-width:330px}
}
@media (max-width:760px){
  html.pv2 header.top{gap:8px;padding:8px 12px!important}
  html.pv2 header.top .brand{padding:3px 6px}html.pv2 header.top .brand img{height:22px!important}
  html.pv2 header.top .pmo-qs-trigger{display:none!important}
  html.pv2 header.top .account-wrap>.chip>div{display:none!important}
  html.pv2 .v-burger span{display:none}html.pv2 .v-burger{padding:0 11px;min-width:44px;justify-content:center}
  html.pv2 #hero.hero{min-height:420px}
  html.pv2 #hero .hero-in{max-width:calc(100% - 20px);padding:0 0 64px 20px!important}
  html.pv2 #hero .hero-dots{left:20px!important;right:auto!important;bottom:26px!important}
  html.pv2 .v-util{padding:14px 20px}
  html.pv2 .v-ub{flex:1 1 auto;justify-content:center}
  html.pv2 main.wrap{padding:16px 16px 40px!important}
  html.pv2 #briefBox.story{padding:16px!important}
  html.pv2 .v-sum{gap:10px}html.pv2 .v-sum .hk{padding:12px 14px}html.pv2 .v-sum .hk b{font-size:20px}
  html.pv2 .foot.v-foot{padding:24px 20px}
  html.pv2 .v-sena{right:0;top:auto;bottom:96px;transform:none;border:0;border-radius:12px 0 0 12px;padding:12px 8px}
}
@media (max-width:600px){html.pv2 .v-sum{grid-template-columns:1fr 1fr}}
@media (prefers-reduced-motion:reduce){html.pv2 #hero .hero-bg>div,html.pv2 .v20-bg-slide,html.pv2 .v20-card,html.pv2 .v20-left,html.pv2 .v-sub,html.pv2 .v-sub-scroll,html.pv2 .v-sub-rail{transition:none!important;scroll-behavior:auto!important}}
</style>`;

const JS = String.raw`<script>
(function(){
  var D=document,H=D.documentElement;
  H.classList.add('pv2');
  var E=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  var q=function(s,r){return (r||D).querySelector(s)},qa=function(s,r){return Array.prototype.slice.call((r||D).querySelectorAll(s))};
  var BRAND=['/media/brand/login-bg.jpg?v=2','/media/brand/bg-1.jpg','/media/brand/bg-2.jpg'];
  var GROUPS=[['Dashboard Proyek',['tileDash'],true],['EPCC Control',['tileEpc']],['Dokumen & 3D',['tileDoc','tileLive']],['Pelaporan & Input',['tileMr','tileInput']]];
  var label=function(b){var t=(b.textContent||'').replace(/\s+/g,' ').trim().replace(/^Buka\s+/i,'');if(/^Live View$/i.test(t))t='Live View (CCTV)';if(/^Executive Dashboard$/i.test(t))t='Monthly Executive Review';return t};
  // Akun kontraktor: hanya halaman yang boleh dibuka (proyeknya sendiri) yang tampil di menu.
  var KTR_OK=/^(Portal Proyek|Weekly Progress|Live View|Spotlight|Visual 3D|Engineering|Procurement|Construction|Commissioning)/i;
  function isKtr(){if(H.classList.contains('is-ktr'))return true;try{var u=JSON.parse(sessionStorage.getItem('pmoUser')||'null');return String(u&&u.role||'').trim().toUpperCase()==='KONTRAKTOR'}catch(e){return false}}
  function menuData(){
    var ktr=isKtr();
    return GROUPS.map(function(g){
      var items=[];if(g[2])items.push({t:'Portal Proyek',on:true,fn:function(){window.scrollTo({top:0,behavior:'smooth'})}});
      g[1].forEach(function(id){var tile=D.getElementById(id);if(!tile||tile.hidden)return;qa('.subs button',tile).forEach(function(b){if(b.hidden||(!ktr&&b.style.display==='none'))return;var t=label(b);if(!t)return;if(ktr&&!KTR_OK.test(t))return;var it={t:t,fn:function(){b.click()}};if(/^Weekly Progress$/i.test(t))it.sub=weeklySub();items.push(it)})});
      return {name:g[0],items:items};
    }).filter(function(g){return g.items.length});
  }
  function weeklySub(){
    return (ST.items||[]).map(function(m){return {t:NM(m.i.name)+(m.par?'':''),par:m.par?NM(m.par):'',done:m.done,fn:function(){if(typeof goWeek==='function')goWeek(m.i.name,m.wk);else location.href='/app?page=weekly&project='+encodeURIComponent(m.i.name)}}});
  }
  var hudDrag=null;
  window.addEventListener('mousemove',function(e){
    if(!hudDrag)return;
    var d=hudDrag,sh=d.sc.scrollHeight,ch=d.sc.clientHeight,th=d.track.clientHeight||ch,bh=d.thumb.offsetHeight||28,use=Math.max(1,th-bh);
    d.sc.scrollTop=d.ds+((e.clientY-d.dy)/use)*(sh-ch);
  });
  window.addEventListener('mouseup',function(){
    if(!hudDrag)return;
    hudDrag.rail.classList.remove('dragging');
    hudDrag=null;
  });
  function bindHudRail(body,sc,rail,track,thumb,moreEl){
    var scrT=null;
    function sync(){
      var sh=sc.scrollHeight,ch=sc.clientHeight,st=sc.scrollTop,max=Math.max(0,sh-ch),need=max>4;
      body.classList.toggle('has-top',need&&st>6);
      body.classList.toggle('has-bot',need&&st<max-6);
      rail.classList.toggle('needed',need);
      if(!need){moreEl.textContent='Semua tampil';moreEl.className='v-sub-more done';return}
      var th=track.clientHeight||ch,bh=Math.max(28,Math.round((ch/sh)*th)),bt=Math.round((max?st/max:0)*(th-bh));
      thumb.style.height=bh+'px';
      thumb.style.transform='translateY('+bt+'px)';
      if(st>=max-6){moreEl.textContent='Akhir daftar';moreEl.className='v-sub-more done'}
      else{moreEl.textContent='\u2193 Scroll \u00b7 masih ada di bawah';moreEl.className='v-sub-more'}
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
      hudDrag={sc:sc,rail:rail,track:track,thumb:thumb,dy:e.clientY,ds:sc.scrollTop};
      rail.classList.add('dragging');
    });
    return sync;
  }
  function subEl(it,sheet){
    if(sheet){
      var w=D.createElement('div');w.className='v-sh-sub';
      it.sub.forEach(function(s){var b=D.createElement('button');b.type='button';b.innerHTML=E(s.t)+(s.par?'<small>Sub \u00b7 '+E(s.par)+'</small>':'')+(s.done?'<small>Selesai</small>':'');b.onclick=function(){closeAll();s.fn()};w.appendChild(b)});
      return w;
    }
    var w=D.createElement('div');w.className='v-sub';w.setAttribute('role','region');w.setAttribute('aria-label','Pilih Proyek Weekly Progress');
    w.innerHTML='<div class="v-sub-top"><div class="v-sub-h"><span>Pilih Proyek</span><span class="v-sub-cnt"></span></div><div class="v-sub-qwrap"><svg class="v-sub-qic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input type="text" class="v-sub-q" placeholder="Cari proyek..." aria-label="Cari proyek weekly progress" autocomplete="off"><button type="button" class="v-sub-clr" aria-label="Bersihkan pencarian">\u00d7</button></div></div><div class="v-sub-body"><div class="v-sub-scroll" tabindex="0" aria-label="Daftar proyek"></div><div class="v-sub-rail" aria-hidden="true"><div class="v-sub-track"><div class="v-sub-thumb"></div></div></div></div><div class="v-sub-foot"><span class="v-sub-more"></span><span class="v-sub-kbd">\u2191\u2193 \u00b7 Enter</span></div>';
    var cnt=q('.v-sub-cnt',w),inp=q('.v-sub-q',w),clr=q('.v-sub-clr',w),body=q('.v-sub-body',w),sc=q('.v-sub-scroll',w),rail=q('.v-sub-rail',w),track=q('.v-sub-track',w),thumb=q('.v-sub-thumb',w),more=q('.v-sub-more',w);
    var sync=bindHudRail(body,sc,rail,track,thumb,more);
    function render(){
      var raw=inp.value||'',ql=raw.trim().toLowerCase();
      clr.classList.toggle('on',raw.length>0);
      var rows=it.sub.filter(function(s){return !ql||s.t.toLowerCase().indexOf(ql)>=0||(s.par&&s.par.toLowerCase().indexOf(ql)>=0)});
      cnt.textContent=rows.length+(ql?' dari '+it.sub.length:' Proyek');
      sc.innerHTML='';
      if(!rows.length){
        var em=D.createElement('div');em.className='v-sub-empty';em.innerHTML='Tidak ada proyek cocok dengan "<b>'+E(raw.trim())+'</b>".';sc.appendChild(em);
        sync();return;
      }
      rows.forEach(function(s){
        var b=D.createElement('button');b.type='button';b.className='v-sub-btn';
        var meta=(s.done||s.par)?'<span class="v-sub-meta">'+(s.done?'<span class="v-sub-bdg ok">Selesai</span>':'')+(s.par?'<span class="v-sub-bdg sub">Sub \u00b7 '+E(s.par)+'</span>':'')+'</span>':'';
        b.innerHTML='<span class="v-sub-main"><span class="v-sub-nm">'+E(s.t)+'</span>'+meta+'</span><span class="v-sub-go" aria-hidden="true">\u203a</span>';
        b.onclick=function(){closeAll();s.fn()};
        sc.appendChild(b);
      });
      sync();
    }
    inp.addEventListener('input',function(){sc.scrollTop=0;render()});
    inp.addEventListener('click',function(e){e.stopPropagation()});
    clr.addEventListener('click',function(e){e.stopPropagation();inp.value='';inp.focus();render()});
    w.addEventListener('keydown',function(e){
      var bs=qa('.v-sub-btn',sc);if(!bs.length)return;
      var i=bs.indexOf(D.activeElement);
      if(e.key==='ArrowDown'){e.preventDefault();bs[Math.min(bs.length-1,i+1)].focus()}
      else if(e.key==='ArrowUp'){e.preventDefault();if(i<=0)inp.focus();else bs[i-1].focus()}
    });
    w.__syncHud=sync;
    render();
    return w;
  }
  function itemBtn(it,cls){var b=D.createElement('button');b.type='button';b.textContent=it.t;if(it.on)b.className='on';b.onclick=function(){closeAll();it.fn()};return b}
  function closeAll(){qa('.v-dd.open').forEach(function(d){clearTimeout(d.__ddT);d.__pinned=false;d.classList.remove('open');qa('.v-has-sub.open',d).forEach(function(r){clearTimeout(r.__subT);r.classList.remove('open')})});var s=D.getElementById('vSheet');if(s)s.hidden=true;D.body.style.overflow=''}
  function inTri(p,a,b,c){
    var s1=(p.x-c.x)*(b.y-c.y)-(b.x-c.x)*(p.y-c.y),s2=(p.x-a.x)*(c.y-a.y)-(c.x-a.x)*(p.y-a.y),s3=(p.x-b.x)*(a.y-b.y)-(a.x-b.x)*(p.y-b.y);
    return (s1<=0&&s2<=0&&s3<=0)||(s1>=0&&s2>=0&&s3>=0);
  }
  function aimingAtPanel(el,prev,cur){
    if(!el||!prev||!cur)return false;
    var dx=cur.x-prev.x;
    if(!dx)return false;
    var r=el.getBoundingClientRect();
    if(!r.width||!r.height)return false;
    if(dx>0&&r.left<prev.x)return false;
    if(dx<0&&r.right>prev.x)return false;
    var rx=dx>0?r.left:r.right;
    return inTri(cur,prev,{x:rx,y:r.top-18},{x:rx,y:r.bottom+18});
  }
  function buildMenu(){
    var m=D.getElementById('vMenu'),sh=D.getElementById('vSheetIn');if(!m||!sh)return;
    var data=menuData();m.innerHTML='';
    data.forEach(function(g){
      var dd=D.createElement('div');dd.className='v-dd';
      var bt=D.createElement('button');bt.type='button';bt.setAttribute('aria-haspopup','true');bt.setAttribute('aria-expanded','false');bt.textContent=g.name+' ⌄';
      var pop=D.createElement('div');pop.className='v-dd-pop';pop.setAttribute('role','menu');
      var prevPt=null,curPt=null,subRow=null,subBox=null;
      g.items.forEach(function(it){
        if(it.sub&&it.sub.length){
          var row=D.createElement('div');row.className='v-has-sub';
          var ib=itemBtn(it);ib.innerHTML=E(it.t)+'<span aria-hidden="true">\u203a</span>';ib.setAttribute('aria-haspopup','true');row.appendChild(ib);
          var sp=subEl(it,false);row.appendChild(sp);
          subRow=row;subBox=sp;pop.appendChild(row);
        }else pop.appendChild(itemBtn(it));
      });
      var openDd=function(pin){
        clearTimeout(dd.__ddT);
        qa('.v-dd.open',m).forEach(function(o){if(o!==dd){clearTimeout(o.__ddT);o.__pinned=false;o.classList.remove('open');qa('.v-has-sub.open',o).forEach(function(r){clearTimeout(r.__subT);r.classList.remove('open')})}});
        dd.classList.add('open');if(pin!==undefined)dd.__pinned=!!pin;
        bt.setAttribute('aria-expanded','true');
      };
      var closeDdSoon=function(ms){
        if(dd.__pinned)return;
        clearTimeout(dd.__ddT);
        dd.__ddT=setTimeout(function(){dd.classList.remove('open');bt.setAttribute('aria-expanded','false');if(subRow){clearTimeout(subRow.__subT);subRow.classList.remove('open')}},ms||300);
      };
      dd.addEventListener('mouseenter',function(){openDd()});
      dd.addEventListener('mouseleave',function(){closeDdSoon(300)});
      if(subRow&&subBox){
        var keepSub=function(){clearTimeout(subRow.__subT);clearTimeout(dd.__ddT);subRow.classList.add('open');if(subBox.__syncHud)requestAnimationFrame(subBox.__syncHud)};
        var hideSubSoon=function(ms){clearTimeout(subRow.__subT);subRow.__subT=setTimeout(function(){subRow.classList.remove('open')},ms)};
        subRow.addEventListener('mouseenter',keepSub);
        subBox.addEventListener('mouseenter',keepSub);
        subRow.addEventListener('mouseleave',function(){hideSubSoon(aimingAtPanel(subBox,prevPt,curPt)?320:220)});
        pop.addEventListener('mousemove',function(e){prevPt=curPt;curPt={x:e.clientX,y:e.clientY};if(subRow.classList.contains('open')&&!subRow.contains(e.target)&&aimingAtPanel(subBox,prevPt,curPt))hideSubSoon(320)});
        pop.addEventListener('mouseover',function(e){
          if(subRow.contains(e.target)){keepSub();return}
          if(!subRow.classList.contains('open'))return;
          hideSubSoon(aimingAtPanel(subBox,prevPt,curPt)?320:180);
        });
      }
      bt.onclick=function(e){
        e.stopPropagation();
        var wasOpen=dd.classList.contains('open');
        if(wasOpen&&dd.__pinned){closeAll();return}
        openDd(true);
      };
      dd.appendChild(bt);dd.appendChild(pop);m.appendChild(dd);
    });
    var head=sh.firstElementChild;sh.innerHTML='';sh.appendChild(head);
    data.forEach(function(g){var h=D.createElement('h4');h.textContent=g.name;sh.appendChild(h);g.items.forEach(function(it){sh.appendChild(itemBtn(it));if(it.sub&&it.sub.length)sh.appendChild(subEl(it,true))})});
  }
  function sena(){var f=q('.aic-fab');if(f){f.click();return}var p=q('aside.aic');if(p)p.hidden=false}
  function setup(){
    if(D.getElementById('vMenu'))return;
    var hdr=q('header.top'),hero=D.getElementById('hero'),main=q('main.wrap');if(!hdr||!hero||!main)return;
    // header: logo kembali ke atas, menu modul, tombol menu HP
    var brand=q('.brand',hdr);if(brand){brand.setAttribute('role','link');brand.setAttribute('tabindex','0');brand.setAttribute('aria-label','Portal Proyek — kembali ke atas');brand.onclick=function(){window.scrollTo({top:0,behavior:'smooth'})};brand.onkeydown=function(e){if(e.key==='Enter')brand.onclick()};
      qa('img',brand).forEach(function(im,k){var s=k===0?'/media/brand/petro.png':'/media/brand/logo.png';if(!/\/media\/brand\//.test(im.getAttribute('src')||''))im.src=s})}
    var menu=D.createElement('nav');menu.id='vMenu';menu.className='v-menu';menu.setAttribute('aria-label','Menu modul');
    var t=q('.t',hdr);hdr.insertBefore(menu,t?t.nextSibling:hdr.children[1]||null);
    var burger=D.createElement('button');burger.type='button';burger.className='v-burger';burger.setAttribute('aria-label','Buka menu modul');
    burger.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>Menu</span>';
    hdr.appendChild(burger);
    var sheet=D.createElement('div');sheet.id='vSheet';sheet.className='v-sheet';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','Menu modul');
    sheet.innerHTML='<div class="v-sheet-in" id="vSheetIn"><div class="v-sheet-h"><span>Menu modul</span><button type="button" aria-label="Tutup menu">×</button></div></div>';
    D.body.appendChild(sheet);
    sheet.onclick=function(e){if(e.target===sheet)closeAll()};q('.v-sheet-h button',sheet).onclick=closeAll;
    burger.onclick=function(e){e.stopPropagation();buildMenu();sheet.hidden=false;D.body.style.overflow='hidden';var f=q('.v-sheet-in>button',sheet);if(f)f.focus()};
    D.addEventListener('click',function(e){if(!e.target.closest('.v-dd'))qa('.v-dd.open').forEach(function(d){d.classList.remove('open')})});
    D.addEventListener('keydown',function(e){if(e.key==='Escape')closeAll()});
    // hero penuh + strip utilitas dalam satu layar penuh (.v-first)
    var first=D.createElement('div');first.className='v-first';
    D.body.insertBefore(first,main);
    first.appendChild(hero);
    if(!q('.v-scrim',hero)){var sc=D.createElement('div');sc.className='v-scrim';hero.insertBefore(sc,hero.children[1]||null)}
    var top=q('.hero-t',hero);if(top&&!q('.v-h1',top)){var h1=D.createElement('h2');h1.className='v-h1';h1.innerHTML='<b>Proyek Pengembangan</b><br>PT Petrokimia Gresik';top.appendChild(h1)}
    var eye=D.getElementById('heroEye');if(eye)eye.textContent='PMO Infrastruktur & Process Plant';
    // strip utilitas
    var u=D.createElement('div');u.className='v-util';
    u.innerHTML='<div class="v-crumb">PMO Infrastruktur &amp; Process Plant</div><div class="v-ua"><button type="button" class="v-ub" data-v="brief">Ringkasan Eksekutif</button><button type="button" class="v-ub" data-v="grid">Daftar Proyek</button>'+(isKtr()?'':'<button type="button" class="v-ub pri" data-v="exec">Monthly Executive Review →</button>')+'</div>';
    first.appendChild(u);
    q('[data-v="brief"]',u).onclick=function(){var t=briefSec||D.getElementById('briefBox');if(t)window.scrollTo({top:Math.max(0,t.getBoundingClientRect().top+window.scrollY-(hdr?hdr.offsetHeight:64)-16),behavior:'smooth'})};
    q('[data-v="grid"]',u).onclick=function(){var s=D.getElementById('vSec');if(s)window.scrollTo({top:Math.max(0,s.getBoundingClientRect().top+window.scrollY-(hdr?hdr.offsetHeight:64)),behavior:'smooth'})};
    var ex=q('[data-v="exec"]',u);if(ex)ex.onclick=function(){if(typeof go==='function')go('executive');else location.href='/app?page=executive'};
    // KPI ke kanvas, ringkasan di atas grid
    var kp=D.getElementById('heroKpis');if(kp){var sum=D.createElement('div');sum.className='v-sum';sum.id='vSum';sum.setAttribute('aria-label','Ringkasan portofolio');main.insertBefore(sum,main.firstChild);sum.appendChild(kp);kp.style.display='contents'}
    var brief=D.getElementById('briefBox'),briefSec=brief&&brief.closest('section'),pulseSec=(D.getElementById('pulse')||{}).closest&&D.getElementById('pulse').closest('section');
    var story=D.getElementById('glStories'),storySec=story&&story.closest('section');
    var modSec=qa('main.wrap>section.grp').filter(function(s){return q('.mods',s)})[0];
    var sec=D.createElement('section');sec.className='v20-sec';sec.id='vSec';sec.setAttribute('aria-label','Proyek pengembangan');
    sec.innerHTML=
      '<div class="v20-bg" id="v20Bg" aria-hidden="true"></div>'+
      '<div class="v20-scrim" aria-hidden="true"></div>'+
      '<div class="v20-in">'+
        '<div class="v20-head">'+
          '<div class="v20-eye">Proyek - Proyek Pengembangan PT Petrokimia Gresik</div>'+
          '<div class="v20-filters" id="vFilters" role="group" aria-label="Filter proyek"></div>'+
        '</div>'+
        '<div class="v20-body" id="v20Body">'+
          '<div class="v20-left" id="v20Left">'+
            '<span class="v20-par" id="v20Par" hidden></span>'+
            '<h2 class="v20-title" id="v20Title">Memuat proyek…</h2>'+
            '<div class="v20-stats" id="v20Stats"></div>'+
            '<div class="v20-gal-row" id="v20GalRow"><span id="v20GalCap"></span><button type="button" class="v20-gal-btn" id="v20GalNext" hidden>Foto berikutnya ›</button></div>'+
          '</div>'+
          '<div class="v20-right">'+
            '<div class="v20-deck" id="v20Deck" aria-live="polite"></div>'+
            '<div class="v20-ctrl">'+
              '<button type="button" class="v20-all" id="v20OpenBtn">Buka Weekly Proyek →</button>'+
              '<div class="v20-arrows"><span class="v20-count" id="v20Count">0 / 0</span><button type="button" class="v20-arr" id="v20Prev" aria-label="Proyek sebelumnya">‹</button><button type="button" class="v20-arr" id="v20Next" aria-label="Proyek berikutnya">›</button></div>'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div class="v20-empty" id="v20Empty" hidden>Belum ada proyek berjalan pada filter ini.</div>'+
      '</div>';
    if(briefSec&&briefSec.parentNode===main){main.insertBefore(briefSec,(kp?D.getElementById('vSum').nextSibling:main.firstChild));}
    if(storySec)main.insertBefore(storySec,main.firstChild);
    if(pulseSec)pulseSec.classList.add('v-hide');if(modSec)modSec.classList.add('v-hide');
    var ft=q('main.wrap>.foot');if(ft){ft.classList.add('v-foot');ft.innerHTML='<div>PT Petrokimia Gresik · PMO Infrastruktur &amp; Process Plant</div><div>Portal Proyek</div>';D.body.insertBefore(sec,main.nextSibling);D.body.insertBefore(ft,sec.nextSibling);}else{D.body.insertBefore(sec,main.nextSibling);}
    var syncSizes=function(){H.style.setProperty('--pv2-hh',(hdr?hdr.offsetHeight:64)+'px');H.style.setProperty('--pv2-fh',(ft?ft.offsetHeight:0)+'px')};
    syncSizes();window.addEventListener('resize',syncSizes,{passive:true});
    initV20Gestures();
    // Tanya Sena
    var sb=D.createElement('button');sb.type='button';sb.className='v-sena';sb.textContent='TANYA SENA';sb.title='Tanya Asisten AI Sena';sb.onclick=sena;D.body.appendChild(sb);
    // header melekat saat scroll
    var stick=function(){hdr.classList.toggle('v-stuck',window.scrollY>40)};window.addEventListener('scroll',stick,{passive:true});stick();
    buildMenu();
    // menu diperbarui setelah sesi/peran diketahui (kartu modul lama diberi/dilepas atribut hidden)
    if(window.MutationObserver){var mo=new MutationObserver(function(){clearTimeout(window.__pv2mt);window.__pv2mt=setTimeout(buildMenu,60)});qa('.mods .tile').forEach(function(t){mo.observe(t,{attributes:true,attributeFilter:['hidden','style'],subtree:true})})}
    setTimeout(heroFallback,4000);
  }
  function heroFallback(){
    var bg=D.getElementById('heroBg');if(!bg||bg.children.length)return;
    bg.innerHTML=BRAND.map(function(u,k){return '<div'+(k===0?' class="on"':'')+' style="background-image:url(\''+u+'\')"></div>'}).join('');
    var hero=D.getElementById('hero'),dots=q('.hero-dots',hero);if(!dots){dots=D.createElement('div');dots.className='hero-dots';hero.appendChild(dots)}
    dots.innerHTML=BRAND.map(function(u,k){return '<button type="button" aria-label="Foto '+(k+1)+'"'+(k===0?' class="on"':'')+'></button>'}).join('');
    var cur=0,show=function(n){cur=(n+BRAND.length)%BRAND.length;qa('div',bg).forEach(function(d,k){d.classList.toggle('on',k===cur)});qa('button',dots).forEach(function(d,k){d.classList.toggle('on',k===cur)})};
    qa('button',dots).forEach(function(b,k){b.onclick=function(){show(k)}});
    clearInterval(window.__pv2ht);window.__pv2ht=setInterval(function(){show(cur+1)},7000);
  }

  // ---------- showcase proyek ala Vision 2030 (i.lw + Galeri Foto per proyek) ----------
  var ST={kind:'all',items:[],b:null,idx:0,pIdx:0,gal:{},lastBg:'',dragMoved:false,galLoaded:false,timer:0};
  var P2=function(v){return v==null||!isFinite(v)?'—':(v*100).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+'%'};
  var PTS=function(v){return (v>0?'+':v<0?'−':'')+(Math.abs(v)*100).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})};
  var NM=function(n){return typeof pmoProjName==='function'?pmoProjName(n):n};
  function model(b){
    var G=(b.groups&&b.groups.map)||{},X=(b.groups&&b.groups.parents)||{},items=Array.isArray(b.items)?b.items:[],byId={};
    items.forEach(function(i){byId[i.projectId]=i});
    return items.map(function(i,k){
      var g=G[i.projectId]||{},t=g.type||'PENGEMBANGAN',par=g.parent,pt=t;
      if(t==='SUB'){var pg=G[par]||{};pt=pg.type==='RUTIN'?'RUTIN':'PENGEMBANGAN'}
      var L=i.lw||{},act=L.actual!=null?L.actual:(i.pending?(i.last&&i.last.actual):i.actual),plan=L.plan!=null?L.plan:(i.pending?(i.last&&i.last.plan):i.plan);
      var dev=L.deviation!=null?L.deviation:i.deviation,st=L.status||i.status,wk=L.week||i.latestWeek||i.cutWeek||i.week;
      var done=act!=null&&act>=0.99995,lbl=done?'Selesai':(i.pending&&!L.week?'Menunggu data':(st||'—'));
      var cls=done?'done':st==='Critical'?'bad':st==='At risk'?'warn':st==='On track'?'':'wait';
      var parName=t==='SUB'&&par?(byId[par]?byId[par].name:(X[par]&&X[par].name)||''):'';
      return {i:i,k:k,grp:pt==='RUTIN'?'rutin':'dev',done:done,act:act,plan:plan,dev:dev,wk:wk,lbl:lbl,cls:cls,stale:L.stale||0,par:parName,banner:i.banner};
    });
  }
  function parseGal(data){
    var map={};
    ((data&&data.projects)||[]).forEach(function(pr){
      var all=[];
      (pr.months||[]).slice().reverse().forEach(function(mo){
        (mo.photos||[]).forEach(function(ph){
          if(ph&&ph.id&&all.length<10)all.push({src:typeof thumb==='function'?thumb(ph.id,1600):('https://drive.google.com/thumbnail?id='+encodeURIComponent(ph.id)+'&sz=w1600'),card:typeof thumb==='function'?thumb(ph.id,800):('https://drive.google.com/thumbnail?id='+encodeURIComponent(ph.id)+'&sz=w800'),cap:ph.cap||mo.label||'Dokumentasi lapangan'});
        });
      });
      if(all.length){map[String(pr.id||'').toUpperCase()]=all;if(pr.name)map[String(pr.name||'').toUpperCase()]=all;}
    });
    ST.gal=map;
  }
  function loadGalleryForShowcase(){
    try{var c=JSON.parse(localStorage.getItem('pmoGalIdx')||'null');if(c&&c.d)parseGal(c.d);}catch(e){}
    if(ST.galLoaded)return;ST.galLoaded=true;
    var tok='';try{tok=(typeof token!=='undefined'&&token)||sessionStorage.getItem('pmoSessionToken')||'';}catch(e){}
    if(tok&&typeof google!=='undefined'&&google.script&&google.script.run){
      try{
        google.script.run.withSuccessHandler(function(d){if(d&&d.success){parseGal(d);render();}}).withFailureHandler(function(){}).getGalleryIndex(tok);
      }catch(e){}
    }
  }
  function photosOf(m){
    var pid=String((m.i&&m.i.projectId)||'').toUpperCase(),pnm=String((m.i&&m.i.name)||'').toUpperCase();
    var g=ST.gal[pid]||ST.gal[pnm];
    if(g&&g.length)return g;
    if(m.banner&&typeof thumb==='function'){
      var b1=thumb(m.banner,1600),b2=thumb(m.banner,800);
      return [{src:b1,card:b2,cap:'Foto profil '+NM(m.i.name)}];
    }
    var fb=BRAND[m.k%BRAND.length];
    return [{src:fb,card:fb,cap:'Kawasan Industri PT Petrokimia Gresik'}];
  }
  function paintBg(m){
    var bg=D.getElementById('v20Bg'),capEl=D.getElementById('v20GalCap'),nxtEl=D.getElementById('v20GalNext');
    if(!bg||!m)return;
    var list=photosOf(m),idxP=ST.pIdx%list.length,ph=list[idxP];
    if(capEl)capEl.textContent='Galeri Proyek ('+(idxP+1)+'/'+list.length+'): '+ph.cap;
    if(nxtEl)nxtEl.hidden=list.length<2;
    var fImg=D.querySelector('.v20-card[data-pos="0"] .v20-card-img');
    if(fImg&&ph.card)fImg.style.backgroundImage='url("'+ph.card+'")';
    if(ph.src===ST.lastBg)return;
    ST.lastBg=ph.src;
    var dv=D.createElement('div');dv.className='v20-bg-slide';
    var img=new Image();
    img.onload=function(){if(ph.src!==ST.lastBg)return;dv.style.backgroundImage='url("'+img.src+'")';bg.appendChild(dv);requestAnimationFrame(function(){requestAnimationFrame(function(){dv.classList.add('on');while(bg.children.length>2)bg.removeChild(bg.firstChild)})})};
    img.onerror=function(){var fb=BRAND[m.k%BRAND.length];dv.style.backgroundImage='url("'+fb+'")';bg.appendChild(dv);requestAnimationFrame(function(){requestAnimationFrame(function(){dv.classList.add('on');while(bg.children.length>2)bg.removeChild(bg.firstChild)})})};
    img.src=ph.src;
  }
  function filteredList(){
    return ST.items.filter(function(m){return ST.kind==='all'?true:ST.kind==='done'?m.done:m.grp===ST.kind});
  }
  function openProj(m){
    if(!m||!m.i)return;
    if(typeof goWeek==='function')goWeek(m.i.name,m.wk);else location.href='/app?page=weekly&project='+encodeURIComponent(m.i.name);
  }
  function stepV20(delta){
    var list=filteredList();if(list.length<2)return;
    ST.idx=(ST.idx+delta+list.length)%list.length;ST.pIdx=0;render();
  }
  function initV20Gestures(){
    var deckEl=D.getElementById('v20Deck');if(!deckEl)return;
    var startX=0,dx=0,dragging=false;
    deckEl.addEventListener('pointerdown',function(e){
      if(e.target&&e.target.closest('button'))return;
      dragging=true;ST.dragMoved=false;startX=e.clientX;dx=0;deckEl.classList.add('dragging');
      var f=deckEl.querySelector('.v20-card[data-pos="0"]');if(f)f.classList.add('no-tr');
    });
    window.addEventListener('pointermove',function(e){
      if(!dragging)return;dx=e.clientX-startX;if(Math.abs(dx)>6)ST.dragMoved=true;
      var f=deckEl.querySelector('.v20-card[data-pos="0"]');
      if(f)f.style.transform='translate3d('+dx+'px,0,0) rotate('+(dx*0.03)+'deg)';
    });
    window.addEventListener('pointerup',function(){
      if(!dragging)return;dragging=false;deckEl.classList.remove('dragging');
      var f=deckEl.querySelector('.v20-card[data-pos="0"]');if(f){f.classList.remove('no-tr');f.style.transform='';}
      if(dx<-45)stepV20(1);else if(dx>45)stepV20(-1);
      setTimeout(function(){ST.dragMoved=false;},40);
    });
    var prv=D.getElementById('v20Prev'),nxt=D.getElementById('v20Next'),gn=D.getElementById('v20GalNext'),op=D.getElementById('v20OpenBtn');
    if(prv)prv.onclick=function(){stepV20(-1);};
    if(nxt)nxt.onclick=function(){stepV20(1);};
    if(gn)gn.onclick=function(){var list=filteredList();if(list[ST.idx]){ST.pIdx++;paintBg(list[ST.idx]);}};
    if(op)op.onclick=function(){var list=filteredList();if(list[ST.idx])openProj(list[ST.idx]);};
    clearInterval(ST.timer);
    ST.timer=setInterval(function(){var list=filteredList(),cur=list[ST.idx];if(cur&&photosOf(cur).length>1){ST.pIdx++;paintBg(cur);}},4000);
  }
  function render(){
    var f=D.getElementById('vFilters'),body=D.getElementById('v20Body'),emp=D.getElementById('v20Empty');
    if(!f||!body)return;
    var all=ST.items,cnt={all:all.length,dev:0,rutin:0,done:0};all.forEach(function(m){cnt[m.grp]++;if(m.done)cnt.done++});
    var F=[['all','Semua'],['dev','Proyek Pengembangan'],['rutin','Investasi Rutin'],['done','Selesai']];
    f.innerHTML=F.map(function(x){return '<button type="button" data-k="'+x[0]+'" aria-pressed="'+(ST.kind===x[0])+'" class="'+(ST.kind===x[0]?'on':'')+'">'+x[1]+' ('+cnt[x[0]]+')</button>'}).join('');
    qa('button',f).forEach(function(b){b.onclick=function(){ST.kind=b.getAttribute('data-k');ST.idx=0;ST.pIdx=0;render()}});
    var list=filteredList();
    if(!list.length){body.hidden=true;if(emp){emp.hidden=false;emp.textContent=all.length?'Tidak ada proyek pada filter ini.':'Belum ada proyek berjalan.';}return;}
    body.hidden=false;if(emp)emp.hidden=true;
    if(ST.idx>=list.length)ST.idx=0;
    var cur=list[ST.idx];
    paintBg(cur);

    var parEl=D.getElementById('v20Par'),tEl=D.getElementById('v20Title'),stEl=D.getElementById('v20Stats');
    if(parEl){if(cur.par){parEl.hidden=false;parEl.textContent='Sub-proyek · '+NM(cur.par);}else{parEl.hidden=true;parEl.textContent='';}}
    if(tEl)tEl.textContent=NM(cur.i.name);
    var dvTone=cur.cls==='bad'?'bad':cur.cls==='warn'?'warn':'ok';
    if(stEl){
      stEl.innerHTML=
        '<div class="v20-stat act"><small>Aktual (W'+E(cur.wk||'—')+')</small><b>'+(cur.act==null?'—':P2(cur.act))+'</b></div>'+
        '<div class="v20-stat"><small>Rencana</small><b>'+(cur.plan==null?'—':P2(cur.plan))+'</b></div>'+
        '<div class="v20-stat dev '+dvTone+'"><small>Deviasi</small><b>'+(cur.done?'Selesai':(cur.dev==null?'—':PTS(cur.dev)+' poin'))+'</b></div>'+
        '<div class="v20-stat"><small>Status</small><b>'+E(cur.lbl)+'</b></div>';
    }
    var cntEl=D.getElementById('v20Count'),prv=D.getElementById('v20Prev'),nxt=D.getElementById('v20Next');
    if(cntEl)cntEl.textContent=(ST.idx+1)+' / '+list.length;
    if(prv)prv.disabled=list.length<2;
    if(nxt)nxt.disabled=list.length<2;

    var deck=D.getElementById('v20Deck');
    if(deck){
      deck.innerHTML=list.map(function(m,i){
        var rel=(i-ST.idx+list.length)%list.length;
        var pos=rel===0?'0':(list.length>1&&rel===1)?'1':(list.length>2&&rel===2)?'2':(list.length>3&&rel===list.length-1)?'prev':'hidden';
        var ph=photosOf(m)[0];
        var wl='W'+E(m.wk||'—')+(m.plan!=null?' · Plan '+P2(m.plan):'')+(m.dev!=null&&!m.done?' ('+PTS(m.dev)+' poin)':'')+(m.stale>=1?' · Input '+m.stale+' mg lalu':'');
        return '<div class="v20-card" data-pos="'+pos+'" data-i="'+i+'" role="button" tabindex="'+(pos==='0'||pos==='1'||pos==='2'?'0':'-1')+'" aria-label="'+E(NM(m.i.name))+'">'+
          '<div class="v20-card-img" style="background-image:url(\''+E(ph.card)+'\')"></div>'+
          '<div class="v20-ctop"><span class="v-st '+m.cls+'">'+E(m.lbl)+'</span><span class="v20-cpct">'+(m.act==null?'—':P2(m.act))+'</span></div>'+
          '<div class="v20-cbot"><h3>'+E(NM(m.i.name))+'</h3><p>'+wl+'</p><span class="v20-ccta">Buka Weekly →</span></div>'+
        '</div>';
      }).join('');
      qa('.v20-card',deck).forEach(function(c){
        c.onclick=function(){
          if(ST.dragMoved)return;
          var pos=c.getAttribute('data-pos'),ci=+c.getAttribute('data-i');
          if(pos==='0')openProj(list[ci]);
          else if(pos==='1'||pos==='2'){ST.idx=ci;ST.pIdx=0;render();}
        };
        c.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();c.click();}};
      });
    }
  }
  window.pmoV2Grid=function(b){
    try{setup()}catch(e){console.warn('pv2 setup',e)}
    loadGalleryForShowcase();
    ST.b=b||{};ST.items=model(ST.b);render();
    var eye=D.getElementById('heroEye');if(eye&&b&&b.asOfText)eye.textContent='PMO Infrastruktur & Process Plant · Input terakhir '+b.asOfText;
    try{buildMenu()}catch(e){}
  };
  var boot=function(){try{setup()}catch(e){console.warn('pv2',e)}if(window.__pv2b)window.pmoV2Grid(window.__pv2b)};
  if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot);else boot();
})();
</script>`;

const PORTAL_V2_PATCHES = [
  { file: 'Portal', find: '</head>', replace: CSS + '</head>' },
  {
    file: 'Portal',
    find: "try{pmoPortalAfter(b)}catch(e){console.warn('pmoPortalAfter',e)}",
    replace: "try{pmoPortalAfter(b)}catch(e){console.warn('pmoPortalAfter',e)}window.__pv2b=b;try{if(window.pmoV2Grid)pmoV2Grid(b)}catch(e){console.warn('pmoV2Grid',e)}",
  },
  { file: 'Portal', find: '</body>', replace: JS + '\n</body>' },
];

module.exports = { PORTAL_V2_PATCHES };

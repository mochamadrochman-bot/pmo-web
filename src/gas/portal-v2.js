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
html.pv2 .v-dd>button:hover,html.pv2 .v-dd:hover>button,html.pv2 .v-dd:focus-within>button{background:rgba(255,255,255,.14);color:#fff}
html.pv2 .v-dd-pop{position:absolute;left:0;top:calc(100% + 6px);min-width:240px;background:#131c2b;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:8px;box-shadow:0 18px 40px rgba(0,0,0,.45);opacity:0;pointer-events:none;transform:translateY(4px);transition:opacity .16s ease,transform .16s ease;z-index:90}
html.pv2 .v-dd-pop::before{content:"";position:absolute;left:0;right:0;top:-8px;height:8px}
html.pv2 .v-dd:hover .v-dd-pop,html.pv2 .v-dd:focus-within .v-dd-pop,html.pv2 .v-dd.open .v-dd-pop{opacity:1;pointer-events:auto;transform:none}
html.pv2 .v-dd-pop button{display:block;width:100%;text-align:left;border:0;background:transparent;padding:10px 12px;border-radius:9px;color:#dbe5f0;font:500 13px/1.3 Inter,system-ui,sans-serif;cursor:pointer}
html.pv2 .v-dd-pop button:hover,html.pv2 .v-dd-pop button:focus-visible{background:rgba(255,255,255,.1);color:#fff;outline:0}
html.pv2 .v-dd-pop button.on{background:var(--v-acc);color:#fff;font-weight:600}
html.pv2 .v-has-sub{position:relative}
html.pv2 .v-has-sub>button{display:flex!important;align-items:center;justify-content:space-between;gap:10px}
html.pv2 .v-has-sub>button span{font-size:16px;opacity:.8}
html.pv2 .v-sub{position:absolute;left:calc(100% + 8px);top:-8px;min-width:270px;max-height:70vh;overflow:auto;background:#131c2b;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:8px;box-shadow:0 18px 40px rgba(0,0,0,.45);opacity:0;pointer-events:none;transform:translateX(-4px);transition:opacity .14s ease,transform .14s ease}
html.pv2 .v-sub::before{content:"";position:absolute;top:0;bottom:0;left:-10px;width:10px}
html.pv2 .v-has-sub:hover>.v-sub,html.pv2 .v-has-sub:focus-within>.v-sub{opacity:1;pointer-events:auto;transform:none}
html.pv2 .v-has-sub:hover>button{background:rgba(255,255,255,.1);color:#fff}
html.pv2 .v-sub-h{padding:6px 12px 8px;font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#7dd3fc}
html.pv2 .v-sub button,html.pv2 .v-sh-sub button{display:block;width:100%;text-align:left;border:0;background:transparent;padding:9px 12px;border-radius:9px;color:#dbe5f0;font:500 13px/1.3 Inter,system-ui,sans-serif;cursor:pointer}
html.pv2 .v-sub button:hover,html.pv2 .v-sub button:focus-visible,html.pv2 .v-sh-sub button:hover{background:rgba(255,255,255,.1);color:#fff;outline:0}
html.pv2 .v-sub small,html.pv2 .v-sh-sub small{display:block;font-size:11px;color:#94a3b8;margin-top:2px}
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

/* ---------- hero penuh ---------- */
html.pv2 #hero.hero{position:relative;height:88svh;min-height:540px;max-height:840px;margin:0!important;border-radius:0!important;overflow:hidden;display:flex;align-items:flex-end;padding:0!important;box-shadow:none!important;background:#0b1825!important}
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
html.pv2 .v-util{background:#fff;color:#132b43;border-bottom:1px solid #e0e8f0;padding:15px 48px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px}
html.pv2[data-theme="dark"] .v-util{background:#0f141c;color:#e2e8f0;border-color:rgba(255,255,255,.1)}
html.pv2 .v-crumb{font-size:12.5px;color:#5b7085;font-weight:500}
html.pv2 .v-crumb b{color:#073b63}
html.pv2[data-theme="dark"] .v-crumb{color:#94a3b8}html.pv2[data-theme="dark"] .v-crumb b{color:#e2e8f0}
html.pv2 .v-ua{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
html.pv2 .v-ub{border:1px solid #d2dde8;background:#f5f8fc;color:#073b63;padding:0 18px;min-height:40px;display:inline-flex;align-items:center;border-radius:99px;font:700 11.5px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;text-decoration:none}
html.pv2 .v-ub.pri{background:var(--v-acc);border-color:var(--v-acc);color:#fff}
html.pv2[data-theme="dark"] .v-ub:not(.pri){background:#1b2330;border-color:rgba(255,255,255,.16);color:#e2e8f0}

/* ---------- kanvas ---------- */
html.pv2 main.wrap{max-width:none!important;margin:0!important;padding:44px 48px 90px!important;background:var(--v-bg)}
html.pv2 main.wrap>*{max-width:1280px;margin-left:auto!important;margin-right:auto!important}
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

/* ---------- grid proyek ---------- */
html.pv2 #briefBox .xpl-mon{display:none!important}
html.pv2 #briefBox .xpl-acts,.xpl-acts{margin:2px 0 10px;padding-left:22px;display:grid;gap:3px}
html.pv2 #briefBox .xpl-acts li{padding-left:2px}
html.pv2 .v-sec{scroll-margin-top:90px;text-align:center;margin:56px auto 28px!important}
html.pv2 .v-sec h2{margin:0 0 8px;font-size:clamp(24px,3.2vw,34px);font-weight:700;letter-spacing:.04em;color:var(--v-ink)}
html.pv2 .v-sec p{margin:0 0 18px;font-size:13px;color:var(--v-mut)}
html.pv2 .v-filters{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
html.pv2 .v-filters button{border:1px solid var(--v-line);background:var(--v-pill);color:var(--v-pill-ink);padding:0 20px;min-height:40px;border-radius:99px;font:600 12.5px/1 Inter,system-ui,sans-serif;cursor:pointer}
html.pv2 .v-filters button.on{background:var(--v-act);color:var(--v-act-ink);border-color:var(--v-act)}
html.pv2 .v-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:26px;align-items:start;margin-top:34px!important;margin-bottom:150px!important}
html.pv2 .v-card{position:relative;aspect-ratio:3/4;border-radius:16px;overflow:hidden;border:1px solid var(--v-line);background:#1e242c;display:flex;flex-direction:column;justify-content:flex-end;color:#fff;box-shadow:0 14px 32px rgba(0,0,0,.18);transition:transform .25s ease,border-color .25s ease;cursor:pointer;text-align:left;padding:0;font:inherit;width:100%}
html.pv2 .v-card:hover,html.pv2 .v-card:focus-visible{border-color:var(--v-acc);outline:0}
html.pv2 .v-card .v-img{position:absolute;inset:0;background-size:cover;background-position:center;transition:transform .5s ease}
html.pv2 .v-card:hover .v-img{transform:scale(1.04)}
html.pv2 .v-card::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,14,20,.1) 25%,rgba(10,14,20,.92) 92%)}
html.pv2 .v-in{position:relative;z-index:2;padding:20px}
html.pv2 .v-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:6px;font-size:11.5px;font-weight:700}
html.pv2 .v-st{padding:3px 9px;border-radius:99px;background:rgba(20,114,79,.9);color:#dcf5e9}
html.pv2 .v-st.warn{background:rgba(180,120,10,.92);color:#fff4cc}
html.pv2 .v-st.bad{background:rgba(192,48,47,.92);color:#ffe4e4}
html.pv2 .v-st.done{background:rgba(15,95,168,.92);color:#e0f0ff}
html.pv2 .v-st.wait{background:rgba(90,104,120,.92);color:#eef2f6}
html.pv2 .v-pct{color:#e2e8f0;font-variant-numeric:tabular-nums}
html.pv2 .v-wk{font-size:11.5px;color:#a8c7e4;margin-bottom:10px;line-height:1.45}
html.pv2 .v-par{display:block;font-size:11px;color:#cbd5e1;font-weight:600;letter-spacing:.04em;margin-bottom:4px}
html.pv2 .v-in h3{margin:0 0 12px;font-size:20px;font-weight:500;line-height:1.25;color:#fff}
html.pv2 .v-cta{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:99px;border:1px solid rgba(255,255,255,.5);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fff}
html.pv2 .v-card:hover .v-cta,html.pv2 .v-card:focus-visible .v-cta{background:#fff;color:#161618;border-color:#fff}
html.pv2 .v-empty{grid-column:1/-1;text-align:center;color:var(--v-mut);padding:30px 0}
@media (min-width:1024px){
  html.pv2 .v-card.st-1{transform:translateY(60px)}html.pv2 .v-card.st-1:hover{transform:translateY(56px)}
  html.pv2 .v-card.st-2{transform:translateY(120px)}html.pv2 .v-card.st-2:hover{transform:translateY(116px)}
  html.pv2 .v-card:not(.st-1):not(.st-2):hover{transform:translateY(-4px)}
}

/* bagian lama yang dipindah ke header / grid baru */
html.pv2 main.wrap>section.grp.v-hide{display:none!important}
html.pv2 .foot.v-foot{max-width:none!important;margin:0!important;background:var(--v-foot);border-top:1px solid rgba(255,255,255,.1);padding:32px 48px;color:#cbd5e1;font-size:12.5px;display:flex;flex-wrap:wrap;justify-content:space-between;gap:14px;text-align:left}

/* ---------- Tanya Sena ---------- */
html.pv2 .v-sena{position:fixed;right:0;top:52%;transform:translateY(-50%);z-index:70;writing-mode:vertical-rl;text-orientation:mixed;padding:16px 10px;border:0;border-radius:12px 0 0 12px;cursor:pointer;background:linear-gradient(180deg,var(--v-acc) 0%,var(--v-acc2) 100%);color:#fff;font:700 11.5px/1 Inter,system-ui,sans-serif;letter-spacing:.14em;box-shadow:-4px 8px 24px rgba(0,0,0,.35);min-width:40px}
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
@media (max-width:1023px){html.pv2 .v-grid{grid-template-columns:repeat(2,minmax(0,1fr));margin-bottom:40px!important}}
@media (max-width:760px){
  html.pv2 header.top{gap:8px;padding:8px 12px!important}
  html.pv2 header.top .brand{padding:3px 6px}html.pv2 header.top .brand img{height:22px!important}
  html.pv2 header.top .pmo-qs-trigger{display:none!important}
  html.pv2 header.top .account-wrap>.chip>div{display:none!important}
  html.pv2 .v-burger span{display:none}html.pv2 .v-burger{padding:0 11px;min-width:44px;justify-content:center}
  html.pv2 #hero.hero{height:72svh;min-height:460px}
  html.pv2 #hero .hero-in{max-width:calc(100% - 20px);padding:0 0 64px 20px!important}
  html.pv2 #hero .hero-dots{left:20px!important;right:auto!important;bottom:26px!important}
  html.pv2 .v-util{padding:14px 20px}
  html.pv2 .v-ub{flex:1 1 auto;justify-content:center}
  html.pv2 main.wrap{padding:28px 16px 70px!important}
  html.pv2 #briefBox.story{padding:16px!important}
  html.pv2 .v-sum{gap:10px}html.pv2 .v-sum .hk{padding:12px 14px}html.pv2 .v-sum .hk b{font-size:20px}
  html.pv2 .v-sec{margin-top:40px!important}
  html.pv2 .foot.v-foot{padding:24px 20px}
  html.pv2 .v-sena{top:auto;bottom:96px;transform:none;padding:12px 8px}
}
@media (max-width:600px){html.pv2 .v-grid{grid-template-columns:1fr;gap:16px}html.pv2 .v-card{aspect-ratio:4/3}html.pv2 .v-sum{grid-template-columns:1fr 1fr}}
@media (prefers-reduced-motion:reduce){html.pv2 #hero .hero-bg>div,html.pv2 .v-card,html.pv2 .v-card .v-img{transition:none!important}}
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
  function menuData(){
    return GROUPS.map(function(g){
      var items=[];if(g[2])items.push({t:'Portal Proyek',on:true,fn:function(){window.scrollTo({top:0,behavior:'smooth'})}});
      g[1].forEach(function(id){var tile=D.getElementById(id);if(!tile||tile.hidden)return;qa('.subs button',tile).forEach(function(b){if(b.hidden||b.style.display==='none')return;var t=label(b);if(!t)return;var it={t:t,fn:function(){b.click()}};if(/^Weekly Progress$/i.test(t))it.sub=weeklySub();items.push(it)})});
      return {name:g[0],items:items};
    }).filter(function(g){return g.items.length});
  }
  function weeklySub(){
    return (ST.items||[]).map(function(m){return {t:NM(m.i.name)+(m.par?'':''),par:m.par?NM(m.par):'',done:m.done,fn:function(){if(typeof goWeek==='function')goWeek(m.i.name,m.wk);else location.href='/app?page=weekly&project='+encodeURIComponent(m.i.name)}}});
  }
  function subEl(it,sheet){
    var w=D.createElement('div');w.className=sheet?'v-sh-sub':'v-sub';
    it.sub.forEach(function(s){var b=D.createElement('button');b.type='button';b.innerHTML=E(s.t)+(s.par?'<small>Sub \u00b7 '+E(s.par)+'</small>':'')+(s.done?'<small>Selesai</small>':'');b.onclick=function(){closeAll();s.fn()};w.appendChild(b)});
    return w;
  }
  function itemBtn(it,cls){var b=D.createElement('button');b.type='button';b.textContent=it.t;if(it.on)b.className='on';b.onclick=function(){closeAll();it.fn()};return b}
  function closeAll(){qa('.v-dd.open').forEach(function(d){d.classList.remove('open')});var s=D.getElementById('vSheet');if(s)s.hidden=true;D.body.style.overflow=''}
  function buildMenu(){
    var m=D.getElementById('vMenu'),sh=D.getElementById('vSheetIn');if(!m||!sh)return;
    var data=menuData();m.innerHTML='';
    data.forEach(function(g){
      var dd=D.createElement('div');dd.className='v-dd';
      var bt=D.createElement('button');bt.type='button';bt.setAttribute('aria-haspopup','true');bt.setAttribute('aria-expanded','false');bt.textContent=g.name+' ⌄';
      var pop=D.createElement('div');pop.className='v-dd-pop';pop.setAttribute('role','menu');g.items.forEach(function(it){if(it.sub&&it.sub.length){var row=D.createElement('div');row.className='v-has-sub';var ib=itemBtn(it);ib.innerHTML=E(it.t)+'<span aria-hidden="true">\u203a</span>';ib.setAttribute('aria-haspopup','true');row.appendChild(ib);var sp=subEl(it,false);var h=D.createElement('div');h.className='v-sub-h';h.textContent='Pilih proyek';sp.insertBefore(h,sp.firstChild);row.appendChild(sp);pop.appendChild(row)}else pop.appendChild(itemBtn(it))});
      bt.onclick=function(e){e.stopPropagation();var o=!dd.classList.contains('open');closeAll();dd.classList.toggle('open',o);bt.setAttribute('aria-expanded',String(o))};
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
    // hero penuh di luar main
    D.body.insertBefore(hero,main);
    if(!q('.v-scrim',hero)){var sc=D.createElement('div');sc.className='v-scrim';hero.insertBefore(sc,hero.children[1]||null)}
    var top=q('.hero-t',hero);if(top&&!q('.v-h1',top)){var h1=D.createElement('h2');h1.className='v-h1';h1.innerHTML='<b>Proyek Pengembangan</b><br>PT Petrokimia Gresik';top.appendChild(h1)}
    var eye=D.getElementById('heroEye');if(eye)eye.textContent='PMO Infrastruktur & Process Plant';
    // strip utilitas
    var u=D.createElement('div');u.className='v-util';
    u.innerHTML='<div class="v-crumb">PMO Infrastruktur &amp; Process Plant</div><div class="v-ua"><button type="button" class="v-ub" data-v="brief">Ringkasan Eksekutif</button><button type="button" class="v-ub" data-v="grid">Daftar Proyek</button><button type="button" class="v-ub pri" data-v="exec">Monthly Executive Review →</button></div>';
    D.body.insertBefore(u,main);
    q('[data-v="brief"]',u).onclick=function(){var t=briefSec||D.getElementById('briefBox');if(t)window.scrollTo({top:Math.max(0,t.getBoundingClientRect().top+window.scrollY-76),behavior:'smooth'})};
    q('[data-v="grid"]',u).onclick=function(){var s=D.getElementById('vSec');if(s)window.scrollTo({top:Math.max(0,s.getBoundingClientRect().top+window.scrollY-76),behavior:'smooth'})};
    q('[data-v="exec"]',u).onclick=function(){if(typeof go==='function')go('executive');else location.href='/app?page=executive'};
    // KPI ke kanvas, ringkasan di atas grid
    var kp=D.getElementById('heroKpis');if(kp){var sum=D.createElement('div');sum.className='v-sum';sum.id='vSum';sum.setAttribute('aria-label','Ringkasan portofolio');main.insertBefore(sum,main.firstChild);sum.appendChild(kp);kp.style.display='contents'}
    var brief=D.getElementById('briefBox'),briefSec=brief&&brief.closest('section'),pulseSec=(D.getElementById('pulse')||{}).closest&&D.getElementById('pulse').closest('section');
    var story=D.getElementById('glStories'),storySec=story&&story.closest('section');
    var modSec=qa('main.wrap>section.grp').filter(function(s){return q('.mods',s)})[0];
    var sec=D.createElement('div');sec.className='v-sec';sec.id='vSec';
    sec.innerHTML='<h2>PROYEK - PROYEK PENGEMBANGAN</h2><p>Menampilkan progres week terakhir yang sudah diinput pada masing-masing proyek</p><div class="v-filters" id="vFilters" role="group" aria-label="Filter proyek"></div>';
    var grid=D.createElement('div');grid.className='v-grid';grid.id='vGrid';grid.innerHTML='<div class="v-empty">Memuat kartu proyek…</div>';
    if(briefSec&&briefSec.parentNode===main){main.insertBefore(briefSec,(kp?D.getElementById('vSum').nextSibling:main.firstChild));briefSec.parentNode.insertBefore(sec,briefSec.nextSibling)}else main.appendChild(sec);
    sec.parentNode.insertBefore(grid,sec.nextSibling);
    if(storySec)main.insertBefore(storySec,main.firstChild);
    if(pulseSec)pulseSec.classList.add('v-hide');if(modSec)modSec.classList.add('v-hide');
    var ft=q('main.wrap>.foot');if(ft){ft.classList.add('v-foot');ft.innerHTML='<div>PT Petrokimia Gresik · PMO Infrastruktur &amp; Process Plant</div><div>Portal Proyek</div>';D.body.insertBefore(ft,main.nextSibling)}
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

  // ---------- grid proyek dari i.lw ----------
  var ST={kind:'all',items:[],b:null};
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
  function photo(m,idx){if(m.banner&&typeof thumb==='function')return thumb(m.banner,800);return BRAND[idx%BRAND.length]}
  function render(){
    var g=D.getElementById('vGrid'),f=D.getElementById('vFilters');if(!g||!f)return;
    var all=ST.items,cnt={all:all.length,dev:0,rutin:0,done:0};all.forEach(function(m){cnt[m.grp]++;if(m.done)cnt.done++});
    var F=[['all','Semua'],['dev','Proyek Pengembangan'],['rutin','Investasi Rutin'],['done','Selesai']];
    f.innerHTML=F.map(function(x){return '<button type="button" data-k="'+x[0]+'" aria-pressed="'+(ST.kind===x[0])+'" class="'+(ST.kind===x[0]?'on':'')+'">'+x[1]+' ('+cnt[x[0]]+')</button>'}).join('');
    qa('button',f).forEach(function(b){b.onclick=function(){ST.kind=b.getAttribute('data-k');render()}});
    var list=all.filter(function(m){return ST.kind==='all'?true:ST.kind==='done'?m.done:m.grp===ST.kind});
    if(!list.length){g.innerHTML='<div class="v-empty">'+(all.length?'Tidak ada proyek pada filter ini.':'Belum ada proyek berjalan.')+'</div>';return}
    g.innerHTML=list.map(function(m,n){
      var col=n%4,stg=col===1?' st-1':col===2?' st-2':'';
      var wl='W'+E(m.wk||'—')+(m.plan!=null?' · Plan '+P2(m.plan):'')+(m.dev!=null&&!m.done?' ('+PTS(m.dev)+' poin)':'')+(m.stale>=1?'<br>Input terakhir '+m.stale+' minggu lalu':'');
      return '<button type="button" class="v-card'+stg+'" data-n="'+E(m.i.name)+'" data-w="'+E(m.wk||'')+'" aria-label="Buka Weekly Progress '+E(NM(m.i.name))+'">'+
        '<span class="v-img" style="background-image:url(\''+E(photo(m,m.k))+'\')"></span>'+
        '<span class="v-in"><span class="v-meta"><span class="v-st '+m.cls+'">'+E(m.lbl)+'</span><span class="v-pct">'+(m.act==null?'—':P2(m.act))+'</span></span>'+
        '<span class="v-wk" style="display:block">'+wl+'</span>'+(m.par?'<span class="v-par">Sub-proyek · '+E(NM(m.par))+'</span>':'')+
        '<h3>'+E(NM(m.i.name))+'</h3><span class="v-cta">Buka Weekly →</span></span></button>';
    }).join('');
    qa('.v-card',g).forEach(function(c){c.onclick=function(){var n=c.getAttribute('data-n'),w=c.getAttribute('data-w');if(typeof goWeek==='function')goWeek(n,w);else location.href='/app?page=weekly&project='+encodeURIComponent(n)}});
  }
  window.pmoV2Grid=function(b){
    try{setup()}catch(e){console.warn('pv2 setup',e)}
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

'use strict';

/**
 * Tema warna mode terang + navigasi Tipe A (15 Nov 2026).
 *
 * Tema (atribut <html data-accent="blue|sage|mocha">, hanya berlaku di mode terang):
 *   - blue  : warna bawaan, sidebar biru tua.
 *   - sage  : palet hijau  #0F2A1D #375534 #6B9071 #AEC3B0 #E3EED4.
 *   - mocha : palet coklat #3B2A1F #6F4E37 #B08968 #D4B996 #EDE3D4 #FFF9F0.
 *   Disimpan per akun (kolom users.ui_accent). Bawaan untuk akun yang belum memilih
 *   diatur Admin di /admin/data (gas_props 'SYS:ACCENT').
 *
 * Navigasi Tipe A (pelengkap setupModularSidebar di legacy/AccountMenu.html):
 *   - sidebar akordeon: grup halaman aktif terbuka, grup lain tertutup;
 *   - grup "Isi halaman" keluar dari sidebar → baris pintasan menempel di bawah header;
 *   - halaman EPCC punya tab Engineering | Procurement | Construction | Commissioning;
 *   - breadcrumb "Grup › Halaman".
 *   Tombol "Isi halaman" asli tetap ada (disembunyikan) supaya menu HP tetap bekerja.
 */

const ACCENTS = ['blue', 'sage', 'mocha'];

function cleanAccent(v) {
  const a = String(v || '').toLowerCase();
  return ACCENTS.includes(a) ? a : '';
}

const ACCENT_CSS = String.raw`<style id="pmoAccentCss">
html[data-accent="sage"]:not([data-theme="dark"]){
  --bg:#F3F7EC;--card:#fff;--ink:#0F2A1D;--muted:#4F6B52;--line:#D3DFCC;
  --pri:#375534;--pri2:#6B9071;--pri-ink:#375534;--navy:#0F2A1D;--soft:#E3EED4;--tint:#F7FAF2;
  --th:#E3EED4;--th-group:#D3DFCC;--stripe:#F7FAF2;--pill:#EEF4E6;--accent:#375534;--paper:#fff;
  --ok:#0E7A63;--ok-bg:#DCF3EC;--ok-line:#A7DCCB;
  --c1:#6B9071;--c2:#375534;--s1:#AEC3B0;--s2:#6B9071;
  --shadow:0 1px 2px rgba(15,42,29,.05),0 8px 22px rgba(15,42,29,.06);
  --pmo-side:#0F2A1D;--pmo-side-act:#375534;--pmo-side-ink:#E3EED4;--pmo-side-mut:#AEC3B0;
}
html[data-accent="mocha"]:not([data-theme="dark"]){
  --bg:#FFF9F0;--card:#fff;--ink:#3B2A1F;--muted:#7A5C46;--line:#EDE3D4;
  --pri:#6F4E37;--pri2:#B08968;--pri-ink:#6F4E37;--navy:#3B2A1F;--soft:#EDE3D4;--tint:#FFFCF7;
  --th:#F3EADC;--th-group:#EDE3D4;--stripe:#FFFCF7;--pill:#F5EDE1;--accent:#6F4E37;--paper:#fff;
  --c1:#B08968;--c2:#6F4E37;--s1:#D4B996;--s2:#B08968;
  --shadow:0 1px 2px rgba(59,42,31,.05),0 8px 22px rgba(59,42,31,.07);
  --pmo-side:#3B2A1F;--pmo-side-act:#6F4E37;--pmo-side-ink:#EDE3D4;--pmo-side-mut:#D4B996;
}
html:not([data-theme="dark"]){--pmo-side:#0B3A66;--pmo-side-act:#1E6FC0;--pmo-side-ink:#E6F0FA;--pmo-side-mut:#A9C4DE}
html[data-accent="sage"]:not([data-theme="dark"]),html[data-accent="mocha"]:not([data-theme="dark"]){--pmo-x:1}

/* Banner/hero ikut tema. Foto latar tetap; hanya lapisan warnanya yang berganti. */
html[data-accent="sage"]:not([data-theme="dark"]):is([data-page="portal"],[data-page="executive"],[data-page="weekly"],[data-page="master"],[data-page="input"],[data-page="project"],[data-page="monthly"]) .hero{background-color:#0F2A1D!important;box-shadow:0 18px 40px rgba(15,42,29,.22)}
html[data-accent="sage"]:not([data-theme="dark"]):is([data-page="portal"],[data-page="executive"],[data-page="weekly"],[data-page="master"],[data-page="input"],[data-page="project"],[data-page="monthly"]) .hero::before{background:linear-gradient(100deg,rgba(15,42,29,.95) 0%,rgba(31,58,38,.80) 45%,rgba(55,85,52,.35) 100%)!important}
html[data-accent="sage"]:not([data-theme="dark"])[data-page="executive"] header.head{background:#0F2A1D!important}
html[data-accent="sage"]:not([data-theme="dark"]):not(.ex-hero-hdr)[data-page="input"] .hero,html[data-accent="sage"]:not([data-theme="dark"]):not(.ex-hero-hdr)[data-page="project"] .hero,html[data-accent="sage"]:not([data-theme="dark"]):not(.ex-hero-hdr)[data-page="monthly"] .hero{background-image:linear-gradient(110deg,#0F2A1D 0%,#375534 55%,#6B9071 100%)!important}
html[data-accent="mocha"]:not([data-theme="dark"]):is([data-page="portal"],[data-page="executive"],[data-page="weekly"],[data-page="master"],[data-page="input"],[data-page="project"],[data-page="monthly"]) .hero{background-color:#3B2A1F!important;box-shadow:0 18px 40px rgba(59,42,31,.22)}
html[data-accent="mocha"]:not([data-theme="dark"]):is([data-page="portal"],[data-page="executive"],[data-page="weekly"],[data-page="master"],[data-page="input"],[data-page="project"],[data-page="monthly"]) .hero::before{background:linear-gradient(100deg,rgba(59,42,31,.95) 0%,rgba(84,60,43,.80) 45%,rgba(111,78,55,.35) 100%)!important}
html[data-accent="mocha"]:not([data-theme="dark"])[data-page="executive"] header.head{background:#3B2A1F!important}
html[data-accent="mocha"]:not([data-theme="dark"]):not(.ex-hero-hdr)[data-page="input"] .hero,html[data-accent="mocha"]:not([data-theme="dark"]):not(.ex-hero-hdr)[data-page="project"] .hero,html[data-accent="mocha"]:not([data-theme="dark"]):not(.ex-hero-hdr)[data-page="monthly"] .hero{background-image:linear-gradient(110deg,#3B2A1F 0%,#6F4E37 55%,#B08968 100%)!important}
html[data-accent="sage"]:not([data-theme="dark"])[data-page="input"] .hero::after,html[data-accent="mocha"]:not([data-theme="dark"])[data-page="input"] .hero::after{opacity:.35}

/* Sidebar berwarna di mode terang (semua tema). Variabel di-scope ke sidebar supaya isi halaman tidak ikut berubah. */
html:not([data-theme="dark"]) aside.side{
  background:var(--pmo-side)!important;border-right-color:transparent!important;
  --ink:var(--pmo-side-ink);--muted:var(--pmo-side-mut);--soft:rgba(255,255,255,.10);--tint:rgba(255,255,255,.06);
  --line:rgba(255,255,255,.14);--pri:var(--pmo-side-act);--pri-ink:#fff;--navy:#fff;color:var(--pmo-side-ink);
}
html:not([data-theme="dark"]) aside.side .nav{color:var(--pmo-side-ink)}
html:not([data-theme="dark"]) aside.side .nav:hover{background:rgba(255,255,255,.10);color:#fff}
html:not([data-theme="dark"]) aside.side .nav.active,html:not([data-theme="dark"]) aside.side .nav.pmo-epc-sub.on,html:not([data-theme="dark"]) aside.side .nav.pmo-epc-sub.active{background:var(--pmo-side-act)!important;color:#fff!important;box-shadow:inset 3px 0 0 rgba(255,255,255,.85)}
html:not([data-theme="dark"]) aside.side .nav.fld.on,html:not([data-theme="dark"]) aside.side .nav.sub.on{background:rgba(255,255,255,.14);color:#fff}
html:not([data-theme="dark"]) aside.side .sec,html:not([data-theme="dark"]) aside.side .pmo-mod-hd{color:var(--pmo-side-mut)}
html:not([data-theme="dark"]) aside.side .pmo-mod-hd.sec-t:hover{background:rgba(255,255,255,.08);color:#fff}
html:not([data-theme="dark"]) aside.side .pmo-mod-tag{background:rgba(255,255,255,.10)!important;border-color:rgba(255,255,255,.22)!important}
html:not([data-theme="dark"]) aside.side .pmo-mod-tag.m1{color:#7dd3fc}
html:not([data-theme="dark"]) aside.side .pmo-mod-tag.m3{color:#67e8f9}
html:not([data-theme="dark"]) aside.side .pmo-mod-tag.m2{color:#d8b4fe}
html:not([data-theme="dark"]) aside.side .pmo-mod-tag.m5{color:#c7d2fe}
html:not([data-theme="dark"]) aside.side .pmo-mod-tag.minp{color:#fcd34d}
html:not([data-theme="dark"]) aside.side .pmo-mod-hd .sg-n{background:rgba(255,255,255,.12);color:var(--pmo-side-ink)}
html:not([data-theme="dark"]) aside.side .pmo-epc-pill{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.16);color:var(--pmo-side-ink)}
html:not([data-theme="dark"]) aside.side .pmo-epc-pill:hover{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.35)}
html:not([data-theme="dark"]) aside.side .brand{flex:0 1 auto;width:auto;background:#fff;border-radius:12px;padding:6px 10px;box-shadow:0 1px 3px rgba(0,0,0,.25)}
html:not([data-theme="dark"]) .app.collapsed aside.side .brand{padding:5px;max-width:calc(100% - 12px);margin:0 auto}
html:not([data-theme="dark"]) .app.collapsed aside.side .brand .brand-pmo{width:54px;height:44px}
html:not([data-theme="dark"]) aside.side .pmo-mgrp+.pmo-mgrp{border-top-color:rgba(255,255,255,.10)}
html:not([data-theme="dark"]) aside.side ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.22)}
html:not([data-theme="dark"]) aside.side button:focus-visible{outline:2px solid #fff;outline-offset:2px}
html:not(.pv2) aside.side .brand,html:not(.pv2) .side-head .brand{cursor:pointer}
html:not(.pv2) aside.side .brand:focus-visible,html:not(.pv2) .side-head .brand:focus-visible{outline:2px solid #fff;outline-offset:3px;border-radius:10px}

/* Judul grup ditulis utuh (tidak terpotong) */
aside.side .pmo-mod-hd{text-transform:none!important;letter-spacing:0!important;font-size:12.5px!important;font-weight:600!important}
aside.side .pmo-mod-hd>span{white-space:normal!important;overflow:visible!important;line-height:1.3}
/* Isi halaman tidak lagi di sidebar (desktop). Elemen tetap ada untuk menu HP. */
aside.side .pmo-mgrp[data-mod-grp="isi"]{display:none!important}

/* Pilihan tema di menu akun */
.pmo-acc-lbl{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#5b7085);margin:10px 2px 6px}
.pmo-acc{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.pmo-acc button{display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px 4px;border:1px solid var(--line,#e0e8f0);border-radius:10px;background:var(--card,#fff);color:var(--ink,#132b43);font-family:inherit;font-size:12px;font-weight:600;line-height:1.2;cursor:pointer;min-height:0}
.pmo-acc button:hover{border-color:var(--pri,#0f5fa8)}
.pmo-acc button.on{border:2px solid var(--pri,#0f5fa8);padding:7px 3px}
.pmo-acc .sw{display:flex}.pmo-acc .sw i{width:12px;height:12px;border-radius:50%;margin-left:-3px;border:1.5px solid #fff;box-shadow:0 0 0 .5px rgba(0,0,0,.15)}
.pmo-acc .sw i:first-child{margin-left:0}
.pmo-acc-note{font-size:11.5px;color:var(--muted,#5b7085);margin:6px 2px 0;line-height:1.4}
</style>`;


/** Mode presentasi (Executive & Weekly): lapisan, sampul, penutup, layar pembuka, dan panel materi ikut tema. */
function presCss() {
  const T = {
    sage: { d: '15,42,29', dh: '#0F2A1D', ah: '#375534', hero: '#24452f', acc: '#AEC3B0', accRgb: '174,195,176', acc2: '#E3EED4', mut: '#AEC3B0', act: '55,85,52' },
    mocha: { d: '59,42,31', dh: '#3B2A1F', ah: '#6F4E37', hero: '#5b4231', acc: '#D4B996', accRgb: '212,185,150', acc2: '#EDE3D4', mut: '#D4B996', act: '111,78,55' },
  };
  return Object.keys(T).map((k) => {
    const t = T[k], A = 'html[data-accent="' + k + '"]:not([data-theme="dark"]) ';
    return [
      A + '.pp{background:rgba(' + t.d + ',.62)!important}',
      A + '.pp-k small,' + A + '.pp-hint,' + A + '.pp-list button small{color:' + t.mut + '!important}',
      A + '.pp-cnt,' + A + '.pp-scroll-hint{color:' + t.acc2 + '!important}',
      A + '.pp-scroll-hint{background:rgba(' + t.d + ',.7)!important}',
      A + '.pp-nav{background:rgba(' + t.d + ',.6)!important}',
      A + '.pp-nav:hover{background:rgba(' + t.act + ',.85)!important}',
      A + '.pp-dots button.on{background:' + t.acc + '!important}',
      A + '.pp-list{background:rgba(' + t.d + ',.92)!important}',
      A + '.pp-list button.on{border-color:' + t.acc + '!important;background:rgba(' + t.accRgb + ',.18)!important}',
      A + '.pp-boot{background:radial-gradient(900px 600px at 50% 42%,' + t.hero + ' 0%,rgba(' + t.d + ',.97) 68%)!important}',
      A + '.pp-boot-ring,' + A + '.px-ring{background:conic-gradient(from 0deg,rgba(' + t.accRgb + ',0) 0 55%,' + t.acc + ' 80%,' + t.acc2 + ' 100%)!important}',
      A + '.pp-boot-logo,' + A + '.px-logo{box-shadow:0 0 0 10px rgba(' + t.accRgb + ',.10),0 24px 70px rgba(0,0,0,.45)!important}',
      A + '.pp-boot-sub,' + A + '.pp-boot-step,' + A + '.px-meta,' + A + '.px-foot{color:' + t.mut + '!important}',
      A + '.pp-boot-bar i,' + A + '.px-bar{background:linear-gradient(90deg,' + t.acc + ',' + t.acc2 + ')!important;box-shadow:0 0 14px rgba(' + t.accRgb + ',.45)!important}',
      A + '.pp-card.px-bleed,' + A + '.px-bleed{background:' + t.dh + '!important}',
      A + '.px-hero{background:radial-gradient(120% 90% at 50% 40%,' + t.hero + ' 0%,' + t.dh + ' 72%)!important;color:#fff!important}',
      A + '.px-shade{background:linear-gradient(180deg,rgba(' + t.d + ',.50) 0%,rgba(' + t.d + ',.70) 55%,rgba(' + t.d + ',.94) 100%),radial-gradient(70% 60% at 50% 45%,rgba(' + t.accRgb + ',.16),transparent 70%)!important}',
      A + '.px-eye,' + A + '.px-sub{color:' + t.acc2 + '!important}',
      A + '.px-h{background-image:linear-gradient(100deg,#ffffff 0%,' + t.acc2 + ' 40%,' + t.acc + ' 55%,#ffffff 75%)!important}',
      A + '.px-hd{background:' + t.dh + '!important}',
      A.trim() + ':is([data-page="weekly"],[data-page="master"],[data-page="input"],[data-page="monthly"],[data-page="project"]) .hero h1 span{color:' + t.acc2 + '!important}',
      A.trim() + ':is([data-page="weekly"],[data-page="master"],[data-page="input"],[data-page="monthly"],[data-page="project"]) .hero small{color:' + t.mut + '!important}',
      A + '.px-hd small{color:' + t.mut + '!important}',
      A + '.px-btn.pri{background:' + t.ah + '!important;border-color:' + t.ah + '!important;color:#fff!important}',
      A + '.px-h4{color:' + t.dh + '!important}',
      A + '.px-mg input[type=checkbox]{accent-color:' + t.ah + '}',
      A + '.px-tabs button.on{color:' + t.dh + '!important;border-bottom-color:' + t.ah + '!important}',
      A + '.px-tabs{background:color-mix(in srgb,' + t.acc2 + ' 45%,#fff)!important}',
    ].join('\n');
  }).join('\n');
}

/** Disisipkan di <head> (paling awal) supaya tidak ada kedipan warna saat halaman dibuka. */
function accentHead(accent) {
  const a = cleanAccent(accent) || 'blue';
  const css = ACCENT_CSS.replace('</style>', presCss() + '\n</style>');
  return `<script>(function(d){d.setAttribute('data-accent','${a}');try{d.setAttribute('data-page',(new URLSearchParams(location.search).get('page')||'').toLowerCase())}catch(e){}})(document.documentElement);window.__pmoAccent='${a}';</script>\n${css}`;
}

const NAV_SNIPPET = String.raw`<style id="pmoNavACss">
.pmo-pbar{position:sticky;z-index:29;max-width:100%;min-width:0;box-sizing:border-box;background:var(--topbar,rgba(255,255,255,.94));-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border-bottom:1px solid var(--line,#e0e8f0);padding:0 24px}
.pmo-pbar-r{display:flex;align-items:center;gap:14px;min-height:44px;min-width:0;max-width:100%;overflow-x:auto;scrollbar-width:none}
.pmo-pbar-r::-webkit-scrollbar{display:none}
.pmo-pbar-r+.pmo-pbar-r{border-top:1px solid color-mix(in srgb,var(--line,#e0e8f0) 70%,transparent);min-height:40px}
.pmo-crumb{display:flex;align-items:center;gap:6px;flex:none;min-width:0;font-size:12.5px;color:var(--muted,#5b7085);white-space:nowrap}
.pmo-pbar-r.has-drop .pmo-crumb{flex:1 1 auto;overflow:hidden;text-overflow:ellipsis}
.pmo-crumb b{color:var(--ink,#132b43);font-weight:600}
.pmo-crumb .sep{opacity:.6}
.pmo-tabs{display:flex;align-items:stretch;gap:2px;align-self:stretch}
.pmo-tab{display:flex;align-items:center;gap:7px;padding:0 14px;border:0;border-bottom:2.5px solid transparent;background:transparent;color:var(--muted,#5b7085);font-family:inherit;font-size:13.5px;font-weight:600;line-height:1;cursor:pointer;white-space:nowrap;min-height:44px}
.pmo-tab:hover{color:var(--ink,#132b43)}
.pmo-tab .dot{width:8px;height:8px;border-radius:50%;flex:none}
.pmo-tab.on{color:var(--pri-ink,#0f5fa8);border-bottom-color:var(--pri,#0f5fa8)}
.pmo-tab:focus-visible,.pmo-chip:focus-visible{outline:2px solid var(--pri,#0f5fa8);outline-offset:-2px;border-radius:8px}
.pmo-isi-l{flex:none;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#5b7085)}
.pmo-chips{display:flex;gap:6px;align-items:center;flex:none}
.pmo-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:99px;border:1px solid var(--line,#e0e8f0);background:var(--card,#fff);color:var(--ink,#132b43);font-family:inherit;font-size:12.5px;font-weight:500;line-height:1.2;cursor:pointer;white-space:nowrap;min-height:0}
.pmo-chip:hover{border-color:var(--pri,#0f5fa8);color:var(--pri-ink,#0f5fa8)}
.pmo-chip.on{background:var(--soft,#e8f3fb);border-color:var(--pri,#0f5fa8);color:var(--pri-ink,#0f5fa8);font-weight:600}
.pmo-chip svg{width:14px;height:14px}
.pmo-pbar .pmo-crumb+.pmo-chips{margin-left:auto}
.pmo-pbar-r.has-drop{overflow:visible}
.pmo-isi-drop{position:relative;margin-left:auto;flex:none}
.pmo-isi-trig{display:inline-flex;align-items:center;gap:8px;padding:5px 13px;border-radius:99px;border:1px solid var(--line,#e0e8f0);background:var(--tint,#f8fafc);color:var(--ink,#132b43);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;min-height:0;white-space:nowrap;transition:border-color .15s,background .15s,color .15s}
.pmo-isi-trig:hover,.pmo-isi-drop.open .pmo-isi-trig{border-color:var(--pri,#0f5fa8);background:var(--soft,#e8f3fb);color:var(--pri-ink,#0f5fa8)}
.pmo-isi-trig .pmo-isi-l{font-size:10px}
.pmo-isi-trig svg{width:13px;height:13px;opacity:.75;transition:transform .16s}
.pmo-isi-drop:hover .pmo-isi-trig svg,.pmo-isi-drop.open .pmo-isi-trig svg{transform:rotate(180deg)}
.pmo-isi-menu{position:absolute;right:0;top:calc(100% + 6px);min-width:228px;padding:6px;border-radius:12px;border:1px solid var(--line,#e0e8f0);background:var(--card,#fff);box-shadow:0 14px 34px rgba(15,23,42,.18);opacity:0;transform:translateY(-6px) scale(.98);pointer-events:none;transition:opacity .16s ease,transform .16s ease;z-index:70}
.pmo-isi-drop:hover .pmo-isi-menu,.pmo-isi-drop:focus-within .pmo-isi-menu,.pmo-isi-drop.open .pmo-isi-menu{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}
.pmo-isi-menu .pmo-chip{width:100%;justify-content:space-between;border:0;border-radius:8px;padding:8px 11px;background:transparent;font-size:12.5px;text-align:left}
.pmo-isi-menu .pmo-chip:hover{background:var(--tint,#f5f8fb);color:var(--pri-ink,#0f5fa8)}
.pmo-isi-menu .pmo-chip.on{background:var(--soft,#e8f3fb);color:var(--pri-ink,#0f5fa8)}
@media (max-width:1100px){.pmo-pbar{padding:0 16px}}
@media (max-width:760px){.pmo-pbar:not(.is-epc):not(.has-isi-drop){display:none!important}.pmo-pbar{padding:0 10px}.pmo-pbar.is-epc .pmo-crumb,.pmo-pbar .pmo-r-isi{display:none!important}.pmo-pbar.has-isi-drop .pmo-crumb{font-size:11.5px;overflow:hidden;text-overflow:ellipsis}.pmo-tab{padding:0 10px;font-size:13px}}
html.m-mode .pmo-pbar,html.pp-open .pmo-pbar{display:none!important}
@media print{.pmo-pbar,.pmo-ftrack,.pmo-sdots,.pmo-topbtn{display:none!important}html,body{scrollbar-width:auto!important}}
/* Opsi 2 Scrollbar Modern Global: sembunyikan scrollbar klasik di dokumen luar, ganti floating rail + section dots + ke atas */
html:not([data-page="spotlight"]):not([data-page="lobby"]),html:not([data-page="spotlight"]):not([data-page="lobby"]) body{scrollbar-width:none}
html:not([data-page="spotlight"]):not([data-page="lobby"])::-webkit-scrollbar,html:not([data-page="spotlight"]):not([data-page="lobby"]) body::-webkit-scrollbar{display:none}
.pmo-ftrack{position:fixed;right:4px;top:72px;bottom:14px;width:10px;border-radius:99px;z-index:55;cursor:pointer;display:none;background:rgba(255,255,255,.22);border:1px solid rgba(15,23,42,.08);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:background .18s ease,width .18s ease,border-color .18s ease}
.pmo-ftrack:hover,.pmo-ftrack.drag{width:12px;background:rgba(255,255,255,.42);border-color:rgba(15,23,42,.14)}
.pmo-ftrack.on{display:block}
.pmo-fthumb{position:absolute;left:1px;right:1px;min-height:42px;border-radius:99px;background:rgba(19,43,67,.28);border:1px solid rgba(255,255,255,.45);transition:background .15s ease}
.pmo-ftrack:hover .pmo-fthumb,.pmo-ftrack.drag .pmo-fthumb{background:color-mix(in srgb,var(--pri,#0f5fa8) 78%,transparent);border-color:rgba(255,255,255,.55)}
html[data-theme="dark"] .pmo-ftrack{background:rgba(15,23,42,.30);border-color:rgba(255,255,255,.10)}
html[data-theme="dark"] .pmo-ftrack:hover,html[data-theme="dark"] .pmo-ftrack.drag{background:rgba(15,23,42,.52);border-color:rgba(255,255,255,.18)}
html[data-theme="dark"] .pmo-fthumb{background:rgba(226,232,240,.30);border-color:rgba(255,255,255,.18)}
html[data-theme="dark"] .pmo-ftrack:hover .pmo-fthumb,html[data-theme="dark"] .pmo-ftrack.drag .pmo-fthumb{background:rgba(56,189,248,.78)}
.pmo-sdots{position:fixed;right:18px;top:50%;transform:translateY(-50%);z-index:56;display:none;flex-direction:column;align-items:flex-end;gap:6px;padding:8px 6px;border-radius:99px;background:rgba(255,255,255,.52);-webkit-backdrop-filter:blur(14px) saturate(1.35);backdrop-filter:blur(14px) saturate(1.35);border:1px solid rgba(15,23,42,.12);box-shadow:0 8px 24px rgba(15,23,42,.10);transition:background .18s ease,border-color .18s ease}
.pmo-sdots:hover{background:rgba(255,255,255,.70);border-color:rgba(15,23,42,.18)}
.pmo-sdots.on{display:flex}
.pmo-sdot{position:relative;display:flex;align-items:center;border:0;background:transparent;padding:3px;cursor:pointer}
.pmo-sdot:focus-visible{outline:2px solid var(--pri,#0f5fa8);border-radius:99px}
.pmo-sdot i{display:block;width:7px;height:7px;border-radius:99px;background:rgba(19,43,67,.28);transition:height .2s ease,background .2s ease}
.pmo-sdot.on i{height:20px;background:var(--pri,#0f5fa8)}
.pmo-sdot span{position:absolute;right:calc(100% + 10px);background:rgba(15,23,42,.74);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.18);color:#fff;font:600 11.5px/1.2 inherit;padding:5px 10px;border-radius:8px;white-space:nowrap;opacity:0;pointer-events:none;transform:translateX(4px);transition:opacity .15s ease,transform .15s ease;box-shadow:0 6px 18px rgba(0,0,0,.18)}
.pmo-sdot:hover span,.pmo-sdot:focus-visible span{opacity:1;transform:none}
html[data-theme="dark"] .pmo-sdots{background:rgba(15,23,42,.46);border-color:rgba(255,255,255,.16);box-shadow:0 8px 24px rgba(0,0,0,.28)}
html[data-theme="dark"] .pmo-sdots:hover{background:rgba(15,23,42,.66);border-color:rgba(255,255,255,.24)}
html[data-theme="dark"] .pmo-sdot i{background:rgba(226,232,240,.34)}
html[data-theme="dark"] .pmo-sdot.on i{background:#38bdf8}
.pmo-topbtn{position:fixed;right:20px;bottom:22px;z-index:56;display:inline-flex;align-items:center;gap:5px;min-height:38px;padding:0 14px;border-radius:99px;border:1px solid rgba(15,23,42,.13);background:rgba(255,255,255,.58);-webkit-backdrop-filter:blur(14px) saturate(1.35);backdrop-filter:blur(14px) saturate(1.35);color:var(--ink,#132b43);font:600 12px/1 inherit;cursor:pointer;box-shadow:0 8px 22px rgba(15,23,42,.10);opacity:0;visibility:hidden;pointer-events:none;transform:translateY(8px);transition:opacity .2s ease,transform .2s ease,visibility .2s ease,background .18s ease,border-color .18s ease,color .18s ease}
.pmo-topbtn.show{opacity:1;visibility:visible;pointer-events:auto;transform:none}
.pmo-topbtn:hover{background:color-mix(in srgb,var(--pri,#0f5fa8) 84%,transparent);border-color:color-mix(in srgb,var(--pri,#0f5fa8) 92%,#fff);color:#fff}
.pmo-topbtn:focus-visible{outline:2px solid var(--pri,#0f5fa8);outline-offset:2px}
html[data-theme="dark"] .pmo-topbtn{background:rgba(15,23,42,.50);border-color:rgba(255,255,255,.18);color:#f1f5f9;box-shadow:0 8px 22px rgba(0,0,0,.28)}
html[data-theme="dark"] .pmo-topbtn:hover{background:rgba(14,165,233,.72);border-color:rgba(56,189,248,.65);color:#fff}
html:not(.pv2) .pmo-topbtn.has-fab{bottom:88px}
html.pv2 .pmo-sdots{top:34%;right:20px}
@media (max-height:700px){html:not(.pv2) .pmo-sdots{top:42%}}
@media (max-width:760px){.pmo-sdots{display:none!important}.pmo-topbtn{right:12px;bottom:16px}html:not(.pv2) .pmo-topbtn.has-fab{right:20px;bottom:88px}}
@media (max-width:640px){html:not(.pv2) .pmo-topbtn.has-fab{right:12px;bottom:16px}}
html.pp-open .pmo-ftrack,html.pp-open .pmo-sdots,html.pp-open .pmo-topbtn,html.m-mode .pmo-ftrack,html.m-mode .pmo-sdots,html.m-mode .pmo-topbtn,body.sv2 .pmo-ftrack,body.sv2 .pmo-sdots,body.sv2 .pmo-topbtn{display:none!important}
.pmo-sena-hit{outline:3px solid var(--pri,#0f5fa8)!important;outline-offset:2px;border-radius:6px;background-color:color-mix(in srgb,var(--soft,#e8f3fb) 80%,transparent)!important;transition:outline-color 1.2s ease .8s}
.pmo-sena-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:70;padding:10px 16px;border-radius:12px;background:var(--ink,#132b43);color:var(--card,#fff);font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.25);max-width:min(560px,92vw)}
.ntf-it.k-alert .ntf-av{background:#fde8e6;color:#b42318}
html[data-theme="dark"] .ntf-it.k-alert .ntf-av{background:#3d1d20;color:#ff8c86}
/* Sidebar diciutkan: satu ikon per grup (rapi); daftar halaman lewat menu melayang */
.pmo-gi{display:none;width:22px;height:22px;flex:none}
.app.collapsed aside.side .pmo-mgrp:not([data-mod-grp="isi"])>:not(.pmo-mod-hd){display:none!important}
.app.collapsed aside.side .pmo-mgrp{border-top:0!important;padding:0!important;margin:2px 0!important}
.app.collapsed aside.side .pmo-mod-hd{pointer-events:auto!important;cursor:pointer;display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:56px;margin:4px auto!important;padding:9px 0 7px!important;border-radius:12px;transition:background .15s}
.app.collapsed aside.side .pmo-mod-hd .pmo-gi{display:block}
.app.collapsed aside.side .pmo-mod-hd .pmo-mod-tag{font-size:9.5px!important;line-height:1.3!important;padding:0 5px!important;margin:0!important;border-width:0!important;background:transparent!important}
.app.collapsed aside.side .pmo-mod-hd:hover,.app.collapsed aside.side .pmo-mod-hd:focus-visible{background:rgba(255,255,255,.12);outline:none}
.app.collapsed aside.side .pmo-mgrp.pmo-act>.pmo-mod-hd{background:var(--pmo-side-act,var(--pri,#0f5fa8));color:#fff}
.app.collapsed aside.side .pmo-mgrp.pmo-act>.pmo-mod-hd .pmo-mod-tag{color:#fff!important}
.app.collapsed aside.side nav,.app.collapsed aside.side{scrollbar-width:none}
.app.collapsed aside.side nav::-webkit-scrollbar,.app.collapsed aside.side::-webkit-scrollbar{display:none}
.app.collapsed aside.side .brand{padding:5px!important;border-radius:12px}
html[data-theme="dark"] .app.collapsed aside.side .pmo-mod-hd{color:var(--ink,#e3ecf4)}
html.ex-hero-hdr aside.side{z-index:210!important}
@media (max-width:900px){.app.nav-open .scrim{z-index:205!important}.app.nav-open aside.side{z-index:210!important}}
.pmo-fly{position:fixed;z-index:260;min-width:220px;max-width:280px;padding:8px;border-radius:12px;background:var(--pmo-side,#152435);color:var(--pmo-side-ink,#e3ecf4);box-shadow:0 12px 32px rgba(0,0,0,.28),0 0 0 1px rgba(255,255,255,.08);opacity:0;transform:translateX(-4px);transition:opacity .12s ease,transform .12s ease;pointer-events:none}
.pmo-fly.on{opacity:1;transform:none;pointer-events:auto}
.pmo-fly h5{margin:2px 6px 6px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;opacity:.75;display:flex;align-items:center;gap:6px}
.pmo-fly button{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:0;border-radius:8px;background:transparent;color:inherit;font-family:inherit;font-size:13.5px;font-weight:500;text-align:left;cursor:pointer;min-height:0}
.pmo-fly button:hover,.pmo-fly button:focus-visible{background:rgba(255,255,255,.12);outline:none}
.pmo-fly button.on{background:var(--pmo-side-act,#1f6db3);color:#fff;font-weight:600}
.pmo-fly .dot{width:8px;height:8px;border-radius:50%;flex:none}
.pmo-fly button.has-sub{justify-content:space-between}
.pmo-fly .chev{opacity:.7;font-size:15px;line-height:1;margin-left:8px}
.pmo-fly2{z-index:265;width:332px;max-width:calc(100vw - 24px);padding:0!important;border-radius:16px!important;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 54px rgba(3,8,18,.55),0 0 0 1px rgba(255,255,255,.12)!important}
.pmo-fly2::before{content:"";position:absolute;top:-14px;bottom:-14px;left:-14px;width:16px}
.pmo-fly2-top{flex:none;padding:12px 12px 10px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02)}
.pmo-fly-sub{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px;padding:0 2px;font-size:13px;font-weight:600;color:#7dd3fc}
.pmo-fly-cnt{font-size:12.5px;font-weight:500;color:#cbd5e1;font-variant-numeric:tabular-nums}
.pmo-fly-qwrap{position:relative;display:flex;align-items:center}
.pmo-fly-qic{position:absolute;left:10px;width:15px;height:15px;color:#9db0c4;pointer-events:none}
.pmo-fly-q{width:100%;height:36px;box-sizing:border-box;margin:0;padding:0 32px;border-radius:9px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.3);color:#f1f5f9;font:500 13.5px/1.2 inherit;outline:none;transition:border-color .14s ease,background .14s ease}
.pmo-fly-q::placeholder{color:#8fa3b8}
.pmo-fly-q:focus{border-color:rgba(125,211,252,.7);background:rgba(0,0,0,.48)}
.pmo-fly.pmo-fly2 .pmo-fly-clr{position:absolute;right:6px;width:24px;height:24px;padding:0;justify-content:center;text-align:center;border:0;border-radius:6px;background:rgba(255,255,255,.09);color:#e2e8f0;font-size:15px;line-height:1;display:none}
.pmo-fly.pmo-fly2 .pmo-fly-clr.on{display:flex}
.pmo-fly.pmo-fly2 .pmo-fly-clr:hover{background:rgba(255,255,255,.18);color:#fff}
.pmo-fly-body{position:relative}
.pmo-fly-projs{max-height:min(316px,56vh);overflow-y:auto;padding:8px 16px 10px 8px;display:flex;flex-direction:column;gap:2px;scrollbar-width:none;-ms-overflow-style:none;scroll-behavior:smooth}
.pmo-fly-projs::-webkit-scrollbar{display:none}
.pmo-fly-body.has-top .pmo-fly-projs{-webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 18px,#000 100%);mask-image:linear-gradient(180deg,transparent 0%,#000 18px,#000 100%)}
.pmo-fly-body.has-bot .pmo-fly-projs{-webkit-mask-image:linear-gradient(180deg,#000 0%,#000 calc(100% - 24px),transparent 100%);mask-image:linear-gradient(180deg,#000 0%,#000 calc(100% - 24px),transparent 100%)}
.pmo-fly-body.has-top.has-bot .pmo-fly-projs{-webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 18px,#000 calc(100% - 24px),transparent 100%);mask-image:linear-gradient(180deg,transparent 0%,#000 18px,#000 calc(100% - 24px),transparent 100%)}
.pmo-fly-rail{position:absolute;top:8px;bottom:8px;right:5px;width:10px;border-radius:99px;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .18s ease;display:flex;justify-content:center;z-index:5}
.pmo-fly2:hover .pmo-fly-rail.needed,.pmo-fly-body.scrolling .pmo-fly-rail.needed,.pmo-fly-rail.dragging{opacity:1;pointer-events:auto}
.pmo-fly-track{position:relative;width:3px;height:100%;border-radius:99px;background:rgba(255,255,255,.1);transition:width .14s ease,background .14s ease}
.pmo-fly-rail:hover .pmo-fly-track,.pmo-fly-rail.dragging .pmo-fly-track{width:5px;background:rgba(255,255,255,.18)}
.pmo-fly-thumb{position:absolute;left:0;right:0;top:0;min-height:28px;border-radius:99px;background:rgba(125,211,252,.52);transition:background .14s ease}
.pmo-fly-rail:hover .pmo-fly-thumb,.pmo-fly-rail.dragging .pmo-fly-thumb{background:rgba(125,211,252,.92)}
.pmo-fly.pmo-fly2 .pmo-fly-projs button{font-size:14px;font-weight:600;line-height:1.35;padding:9px 12px;min-height:40px;justify-content:space-between;gap:10px;border:1px solid transparent;border-radius:9px;transition:background .12s ease,border-color .12s ease,transform .12s ease}
.pmo-fly.pmo-fly2 .pmo-fly-projs button:hover,.pmo-fly.pmo-fly2 .pmo-fly-projs button:focus-visible{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.14);transform:translateX(2px)}
.pmo-fly.pmo-fly2 .pmo-fly-projs button:active{transform:translateX(1px) scale(.995)}
.pmo-fly.pmo-fly2 .pmo-fly-projs button span.nm{text-align:left;flex:1;min-width:0;line-height:1.35;color:#f1f5f9}
.pmo-fly.pmo-fly2 .pmo-fly-projs button em.st{font-style:normal;font-size:11.5px;font-weight:600;padding:2px 7px;border-radius:6px;background:rgba(16,185,129,.2);color:#6ee7b7;flex:none}
.pmo-fly.pmo-fly2 .pmo-fly-projs button .go{flex:none;font-size:16px;line-height:1;color:#7dd3fc;opacity:0;transform:translateX(-2px);transition:opacity .12s ease,transform .12s ease}
.pmo-fly.pmo-fly2 .pmo-fly-projs button:hover .go,.pmo-fly.pmo-fly2 .pmo-fly-projs button:focus-visible .go,.pmo-fly.pmo-fly2 .pmo-fly-projs button.on .go{opacity:.95;transform:none}
.pmo-fly-empty{padding:20px 10px;text-align:center;font-size:13px;color:#9db0c4;line-height:1.45}
.pmo-fly-foot{flex:none;display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-top:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.22);font-size:12px;color:#9db0c4}
.pmo-fly-more{color:#7dd3fc;font-weight:600}
.pmo-fly-more.done{color:#94a3b8;font-weight:500}
.pmo-fly-kbd{font-size:11.5px;color:#9db0c4}
html[data-theme="dark"] .pmo-fly{background:#1b2c3e}
@media (prefers-reduced-motion:reduce){.pmo-fly,.pmo-fly-projs,.pmo-fly-rail{transition:none;scroll-behavior:auto}}
@media (max-width:760px){.pmo-fly{display:none!important}}
</style>
<script>
(function(){
  if(window.__pmoNavA)return;window.__pmoNavA=true;
  var EPC=[['ENG','Engineering','engineering','#38bdf8'],['PROC','Procurement','epcc&field=PROC','#a855f7'],['CONS','Construction','epcc&field=CONS','#f59e0b'],['COM','Commissioning','epcc&field=COM','#14b8a6']];
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function qp(k){try{return new URLSearchParams(location.search).get(k)||''}catch(e){return ''}}
  var page=qp('page').toLowerCase();
  function go(route){if(typeof window.pmoGoWithProject==='function')window.pmoGoWithProject(route);else location.href='/app?page='+route}

  /* ---------- pilihan tema di menu akun ---------- */
  var ACC=[['blue','Biru',['#0B3A66','#0f5fa8','#9bc7ea','#f2f5f9']],['sage','Sage',['#0F2A1D','#375534','#6B9071','#AEC3B0','#E3EED4']],['mocha','Mocha',['#3B2A1F','#6F4E37','#B08968','#D4B996','#EDE3D4']]];
  function curAcc(){return document.documentElement.getAttribute('data-accent')||'blue'}
  function setAcc(a){
    document.documentElement.setAttribute('data-accent',a);window.__pmoAccent=a;
    document.querySelectorAll('.pmo-acc button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-acc')===a)});
    try{fetch('/api/prefs/accent',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({accent:a}),keepalive:true,credentials:'same-origin'})}catch(e){}
    try{window.dispatchEvent(new CustomEvent('pmo:accent',{detail:a}))}catch(e){}
  }
  function addPicker(){
    document.querySelectorAll('.theme-switch,.acm-theme').forEach(function(sw){
      if(sw.parentNode.querySelector('.pmo-acc'))return;
      var lbl=document.createElement('div');lbl.className='pmo-acc-lbl';lbl.textContent='Warna tema';
      var box=document.createElement('div');box.className='pmo-acc';box.setAttribute('role','group');box.setAttribute('aria-label','Warna tema');
      box.innerHTML=ACC.map(function(x){return '<button type="button" data-acc="'+x[0]+'" aria-label="Tema '+x[1]+'"><span class="sw">'+x[2].map(function(c){return '<i style="background:'+c+'"></i>'}).join('')+'</span>'+x[1]+'</button>'}).join('');
      var note=document.createElement('div');note.className='pmo-acc-note';note.textContent='Berlaku di tampilan terang.';
      sw.parentNode.insertBefore(lbl,sw.nextSibling);sw.parentNode.insertBefore(box,lbl.nextSibling);sw.parentNode.insertBefore(note,box.nextSibling);
      box.addEventListener('click',function(e){var b=e.target.closest('[data-acc]');if(!b)return;e.preventDefault();e.stopPropagation();setAcc(b.getAttribute('data-acc'))});
      box.querySelectorAll('button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-acc')===curAcc())});
    });
  }

  /* ikon grup untuk sidebar yang diciutkan */
  var GI={m1:'<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    m3:'<path d="M12 4 3 9l9 5 9-5-9-5z"/><path d="m3 14 9 5 9-5"/>',
    m2:'<path d="M4 6.5A1.5 1.5 0 0 1 5.5 5H10l2 2.5h6.5A1.5 1.5 0 0 1 20 9v8.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/>',
    m5:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8M7 12l3-3 2 2 4-4"/>',
    minp:'<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m14.5 7.5 3 3"/>'};
  function railIcons(){
    var act=(activeInfo()||{}).g;
    document.querySelectorAll('aside.side .pmo-mgrp[data-mod-grp]').forEach(function(w){
      var id=w.getAttribute('data-mod-grp'),hd=w.querySelector(':scope>.pmo-mod-hd');if(!hd||id==='isi')return;
      if(!hd.querySelector('.pmo-gi')&&GI[id])hd.insertAdjacentHTML('afterbegin','<svg class="pmo-gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+GI[id]+'</svg>');
      if(!hd.hasAttribute('tabindex')){hd.setAttribute('tabindex','0');hd.setAttribute('title',GRP[id]||'')}
      w.classList.toggle('pmo-act',id===act);
    });
  }

  /* ---------- menu melayang saat sidebar diciutkan ---------- */
  var fly=null,fly2=null,flyT=0,fly2T=0,flyGrp=null;
  function collapsed(){var a=document.querySelector('.app');return !!(a&&a.classList.contains('collapsed'))&&innerWidth>760}
  function grpItems(w){
    var out=[],seen={};
    w.querySelectorAll('button.nav,.pmo-epc-pill').forEach(function(b){
      if(b.closest('#subNav,#projectNav'))return;
      if(b.classList.contains('pmo-epc-main')&&w.querySelector('.pmo-epc-sub,.pmo-epc-pill'))return;
      if(b.hidden||b.style.display==='none'||b.closest('[hidden]'))return;
      var sp=b.querySelector('span');var t=String((sp&&sp.textContent)||b.getAttribute('title')||b.textContent||'').replace(/\s+/g,' ').trim();
      if(!t||seen[t])return;seen[t]=1;
      var dot=b.querySelector('.dot');out.push({b:b,t:t,on:b.classList.contains('active')||b.classList.contains('on'),dot:dot?getComputedStyle(dot).backgroundColor:''});
    });
    return out;
  }
  // Daftar proyek Weekly untuk sub-menu: pakai tombol #projectNav bila ada (halaman Weekly),
  // selain itu daftar dari getProjectList (cache pmoSwr 'projNav') berupa tombol virtual.
  var NAVP=null,navpBusy=false;
  function navpKey(v){return String(v||'').toUpperCase().replace(/^\s*PROYEK\s*/,'').replace(/[^A-Z0-9]/g,'')}
  function navpLoad(){
    if(NAVP||navpBusy)return;
    try{var c=window.pmoSwr&&pmoSwr.get('projNav');if(c&&c.d)NAVP=c.d}catch(e){}
    if(!(window.google&&google.script&&google.script.run))return;
    var tok='';try{tok=sessionStorage.getItem('pmoSessionToken')||''}catch(e){}
    navpBusy=true;
    google.script.run.withSuccessHandler(function(r){navpBusy=false;if(r&&r.projects){NAVP=r.projects;try{window.pmoSwr&&pmoSwr.set('projNav',r.projects)}catch(e){}}}).withFailureHandler(function(){navpBusy=false}).getProjectList(tok);
  }
  function navProjBtns(){
    var real=Array.prototype.slice.call(document.querySelectorAll('#projectNav .project-item'));
    if(real.length)return real;
    navpLoad();
    if(!Array.isArray(NAVP))return [];
    var act='';try{act=navpKey(sessionStorage.getItem('pmoActiveProject')||'')}catch(e){}
    var onWeekly=/[?&]page=weekly\b/.test(location.search);
    return NAVP.filter(function(p){return p&&p.name&&p.hasWeekly!==false}).sort(function(a,b){var da=a.stage==='SELESAI'||a.stage==='DITUTUP'?1:0,db=b.stage==='SELESAI'||b.stage==='DITUTUP'?1:0;return da-db}).map(function(p){
      var b=document.createElement('button');var done=p.stage==='SELESAI'||p.stage==='DITUTUP';
      b.textContent=p.name+(done?' Selesai':'');
      if(onWeekly&&navpKey(p.name)===act)b.classList.add('on');
      b.click=function(){try{sessionStorage.setItem('pmoActiveProject',p.name)}catch(e){}
        if(typeof window.pmoGoWithProject==='function')window.pmoGoWithProject('weekly');else window.top.location.href='/app?page=weekly&project='+encodeURIComponent(p.name)};
      return b});
  }
  function flyInTri(p,a,b,c){
    var s1=(p.x-c.x)*(b.y-c.y)-(b.x-c.x)*(p.y-c.y),s2=(p.x-a.x)*(c.y-a.y)-(c.x-a.x)*(p.y-a.y),s3=(p.x-b.x)*(a.y-b.y)-(a.x-b.x)*(p.y-b.y);
    return (s1<=0&&s2<=0&&s3<=0)||(s1>=0&&s2>=0&&s3>=0);
  }
  function flyAiming(el,prev,cur){
    if(!el||!el.classList.contains('on')||!prev||!cur)return false;
    var dx=cur.x-prev.x;
    if(!dx)return false;
    var r=el.getBoundingClientRect();
    if(!r.width||!r.height)return false;
    if(dx>0&&r.left<prev.x)return false;
    if(dx<0&&r.right>prev.x)return false;
    var rx=dx>0?r.left:r.right;
    return flyInTri(cur,prev,{x:rx,y:r.top-18},{x:rx,y:r.bottom+18});
  }
  var flyPrev=null,flyCur=null,fly2Drag=null,fly2ScrT=null;
  window.addEventListener('mousemove',function(e){
    if(!fly2Drag)return;
    var d=fly2Drag,sh=d.sc.scrollHeight,ch=d.sc.clientHeight,th=d.track.clientHeight||ch,bh=d.thumb.offsetHeight||28,use=Math.max(1,th-bh);
    d.sc.scrollTop=d.ds+((e.clientY-d.dy)/use)*(sh-ch);
  });
  window.addEventListener('mouseup',function(){
    if(!fly2Drag)return;
    fly2Drag.rail.classList.remove('dragging');
    fly2Drag=null;
  });
  function fly2SyncHud(){
    if(!fly2)return;
    var body=fly2.querySelector('.pmo-fly-body'),sc=fly2.querySelector('.pmo-fly-projs'),rail=fly2.querySelector('.pmo-fly-rail'),track=fly2.querySelector('.pmo-fly-track'),thumb=fly2.querySelector('.pmo-fly-thumb'),more=fly2.querySelector('.pmo-fly-more');
    if(!body||!sc||!rail||!track||!thumb||!more)return;
    var sh=sc.scrollHeight,ch=sc.clientHeight,st=sc.scrollTop,max=Math.max(0,sh-ch),need=max>4;
    body.classList.toggle('has-top',need&&st>6);
    body.classList.toggle('has-bot',need&&st<max-6);
    rail.classList.toggle('needed',need);
    if(!need){more.textContent='Semua tampil';more.className='pmo-fly-more done';return}
    var th=track.clientHeight||ch,bh=Math.max(28,Math.round((ch/sh)*th)),bt=Math.round((max?st/max:0)*(th-bh));
    thumb.style.height=bh+'px';
    thumb.style.transform='translateY('+bt+'px)';
    if(st>=max-6){more.textContent='Akhir daftar';more.className='pmo-fly-more done'}
    else{more.textContent='↓ Scroll · lainnya';more.className='pmo-fly-more'}
  }
  function fly2Filter(qRaw){
    if(!fly2)return;
    var q=String(qRaw||'').toLowerCase().trim();
    var btns=fly2.querySelectorAll('.pmo-fly-projs button'),shown=0;
    btns.forEach(function(b){var ok=!q||b.textContent.toLowerCase().indexOf(q)>=0;b.style.display=ok?'':'none';if(ok)shown++});
    var cnt=fly2.querySelector('.pmo-fly-cnt'),clr=fly2.querySelector('.pmo-fly-clr'),emp=fly2.querySelector('.pmo-fly-empty'),sc=fly2.querySelector('.pmo-fly-projs');
    if(cnt)cnt.textContent=shown+(q?' dari '+btns.length:' Proyek');
    if(clr)clr.classList.toggle('on',String(qRaw||'').length>0);
    if(emp)emp.style.display=shown?'none':'block';
    if(sc)sc.scrollTop=0;
    fly2SyncHud();
  }
  function fly2Hide(){clearTimeout(fly2T);if(fly2)fly2.classList.remove('on')}
  function fly2HideSoon(ms){clearTimeout(fly2T);fly2T=setTimeout(fly2Hide,ms||300)}
  function fly2Show(anchorBtn){
    if(!fly||!fly.__projs||!fly.__projs.length)return;
    if(!fly2){
      fly2=document.createElement('div');fly2.className='pmo-fly pmo-fly2';fly2.setAttribute('role','menu');document.body.appendChild(fly2);
      fly2.addEventListener('mouseenter',function(){clearTimeout(flyT);clearTimeout(fly2T)});
      fly2.addEventListener('mouseleave',function(){fly2HideSoon();flyHideSoon()});
      fly2.addEventListener('keydown',function(e){
        if(e.key==='Escape'){fly2Hide();if(anchorBtn)anchorBtn.focus();return}
        var vis=Array.prototype.slice.call(fly2.querySelectorAll('.pmo-fly-projs button')).filter(function(b){return b.style.display!=='none'});
        if(!vis.length)return;
        var idx=vis.indexOf(document.activeElement);
        if(e.key==='ArrowDown'){e.preventDefault();vis[Math.min(vis.length-1,idx+1)].focus()}
        else if(e.key==='ArrowUp'){e.preventDefault();var qi=fly2.querySelector('.pmo-fly-q');if(idx<=0&&qi)qi.focus();else if(idx>0)vis[idx-1].focus()}
      });
      fly2.addEventListener('input',function(e){if(e.target.classList.contains('pmo-fly-q'))fly2Filter(e.target.value)});
      fly2.addEventListener('scroll',function(e){
        if(!e.target||!e.target.classList||!e.target.classList.contains('pmo-fly-projs'))return;
        var body=fly2.querySelector('.pmo-fly-body');
        if(body){body.classList.add('scrolling');clearTimeout(fly2ScrT);fly2ScrT=setTimeout(function(){if(body)body.classList.remove('scrolling')},750)}
        fly2SyncHud();
      },true);
      fly2.addEventListener('mousedown',function(e){
        var rail=e.target.closest('.pmo-fly-rail');if(!rail)return;
        e.preventDefault();e.stopPropagation();
        var sc=fly2.querySelector('.pmo-fly-projs'),track=fly2.querySelector('.pmo-fly-track'),thumb=fly2.querySelector('.pmo-fly-thumb');
        if(!sc||!track||!thumb)return;
        var r=track.getBoundingClientRect();
        if(e.target!==thumb){var ratio=Math.max(0,Math.min(1,(e.clientY-r.top)/Math.max(1,r.height)));sc.scrollTop=ratio*(sc.scrollHeight-sc.clientHeight)}
        fly2Drag={sc:sc,rail:rail,track:track,thumb:thumb,dy:e.clientY,ds:sc.scrollTop};
        rail.classList.add('dragging');
      });
      fly2.addEventListener('click',function(e){
        var clr=e.target.closest('.pmo-fly-clr');
        if(clr){e.stopPropagation();var qi=fly2.querySelector('.pmo-fly-q');if(qi){qi.value='';qi.focus()}fly2Filter('');return}
        var px=e.target.closest('[data-fp]');if(!px||!fly.__projs)return;var pb=fly.__projs[+px.getAttribute('data-fp')];flyHide();if(pb)pb.click();
      });
    }
    clearTimeout(fly2T);
    var pBtns=fly.__projs;
    fly2.innerHTML='<div class="pmo-fly2-top"><div class="pmo-fly-sub"><span>Pilih Proyek Weekly</span><span class="pmo-fly-cnt">'+pBtns.length+' Proyek</span></div>'
      +'<div class="pmo-fly-qwrap"><svg class="pmo-fly-qic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input type="text" class="pmo-fly-q" placeholder="Cari proyek…" aria-label="Cari proyek weekly" autocomplete="off"><button type="button" class="pmo-fly-clr" aria-label="Bersihkan pencarian">×</button></div></div>'
      +'<div class="pmo-fly-body"><div class="pmo-fly-projs">'+pBtns.map(function(pb,pi){
        var raw=String(pb.textContent||'').replace(/[›»]/g,'').replace(/\s+/g,' ').trim();
        var done=/selesai$/i.test(raw);
        var lbl=done?raw.replace(/\s*selesai$/i,'').trim():raw;
        var on=pb.classList.contains('active')||pb.classList.contains('on')||pb.getAttribute('aria-current')==='true';
        return '<button type="button" role="menuitem" data-fp="'+pi+'" class="'+(on?'on':'')+'"><span class="nm">'+esc(lbl)+'</span>'+(done?'<em class="st">Selesai</em>':'')+'<span class="go" aria-hidden="true">›</span></button>';
      }).join('')+'<div class="pmo-fly-empty" style="display:none">Tidak ada proyek yang cocok.</div></div><div class="pmo-fly-rail" aria-hidden="true"><div class="pmo-fly-track"><div class="pmo-fly-thumb"></div></div></div></div>'
      +'<div class="pmo-fly-foot"><span class="pmo-fly-more"></span><span class="pmo-fly-kbd">↑↓ · Enter</span></div>';
    var fr=fly.getBoundingClientRect(),br=anchorBtn.getBoundingClientRect();
    fly2.classList.add('on');
    var w2=fly2.offsetWidth,h2=fly2.offsetHeight;
    var left=Math.round(fr.right+2);
    if(left+w2>innerWidth-8)left=Math.max(8,Math.round(fr.left-w2-2));
    fly2.style.left=left+'px';
    fly2.style.top=Math.max(8,Math.min(Math.round(br.top-8),innerHeight-h2-8))+'px';
    requestAnimationFrame(fly2SyncHud);
  }
  function flyShow(w){
    if(!collapsed())return;
    var id=w.getAttribute('data-mod-grp');if(id==='isi')return;
    var L=grpItems(w);if(!L.length)return;
    if(!fly){fly=document.createElement('div');fly.className='pmo-fly';fly.setAttribute('role','menu');document.body.appendChild(fly);
      fly.addEventListener('mouseenter',function(){clearTimeout(flyT)});fly.addEventListener('mouseleave',function(){flyHideSoon();fly2HideSoon(300)});
      fly.addEventListener('mousemove',function(e){flyPrev=flyCur;flyCur={x:e.clientX,y:e.clientY};var b=e.target.closest('button[data-fi]');if((!b||b.getAttribute('data-has-sub')!=='1')&&fly2&&fly2.classList.contains('on')&&flyAiming(fly2,flyPrev,flyCur))fly2HideSoon(320)});
      fly.addEventListener('mouseover',function(e){var b=e.target.closest('button[data-fi]');if(!b)return;if(b.getAttribute('data-has-sub')==='1')fly2Show(b);else fly2HideSoon(flyAiming(fly2,flyPrev,flyCur)?320:200)});
      fly.addEventListener('focusin',function(e){var b=e.target.closest('button[data-fi]');if(b&&b.getAttribute('data-has-sub')==='1')fly2Show(b)});
      fly.addEventListener('keydown',function(e){if(e.key==='Escape'){flyHide();if(flyGrp){var f=flyGrp.querySelector('button.nav');if(f)f.focus()}}});
      fly.addEventListener('click',function(e){var x=e.target.closest('[data-fi]');if(!x||!fly.__items)return;var it=fly.__items[+x.getAttribute('data-fi')];flyHide();if(it)it.b.click()});}
    clearTimeout(flyT);fly2Hide();if(flyGrp!==w)fly.__byClick=false;flyGrp=w;fly.__items=L;
    var pBtns=id==='m1'?navProjBtns():null;
    fly.__projs=pBtns||[];
    fly.innerHTML='<h5>'+esc(TAG[id]||'')+' '+esc(GRP[id]||'')+'</h5>'+L.map(function(x,i){
      var hasSub=id==='m1'&&fly.__projs.length&&/weekly/i.test(x.t);
      return '<button type="button" role="menuitem" data-fi="'+i+'"'+(hasSub?' data-has-sub="1"':'')+' class="'+(x.on?'on':'')+(hasSub?' has-sub':'')+'">'+(x.dot?'<i class="dot" style="background:'+x.dot+'"></i>':'')+'<span>'+esc(x.t)+'</span>'+(hasSub?'<span class="chev" aria-hidden="true">›</span>':'')+'</button>';
    }).join('');
    var side=document.querySelector('aside.side').getBoundingClientRect(),r=w.getBoundingClientRect();
    fly.style.left=Math.round(side.right+8)+'px';fly.classList.add('on');
    var h=fly.offsetHeight;fly.style.top=Math.max(8,Math.min(Math.round(r.top),innerHeight-h-8))+'px';
    var subBtn=fly.querySelector('button[data-has-sub="1"]');
    if(subBtn&&subBtn.classList.contains('on'))fly2Show(subBtn);
  }
  function flyHide(){clearTimeout(flyT);fly2Hide();if(fly)fly.classList.remove('on');flyGrp=null}
  function flyHideSoon(){clearTimeout(flyT);flyT=setTimeout(flyHide,300)}
  function bindFly(){
    var side=document.querySelector('aside.side');if(!side||side.__pmoFly)return;side.__pmoFly=true;
    setTimeout(navpLoad,400);
    side.addEventListener('mouseover',function(e){var w=e.target.closest('.pmo-mgrp');if(!w){return}if(w!==flyGrp||!fly||!fly.classList.contains('on'))flyShow(w);else clearTimeout(flyT)});
    side.addEventListener('mouseleave',flyHideSoon);
    side.addEventListener('click',function(e){var hd=e.target.closest('.pmo-mod-hd');if(!hd||!collapsed())return;var w=hd.closest('.pmo-mgrp');if(!w)return;e.preventDefault();e.stopPropagation();if(fly&&fly.classList.contains('on')&&flyGrp===w&&fly.__byClick){flyHide();fly.__byClick=false}else{flyShow(w);if(fly)fly.__byClick=true}},true);
    side.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&collapsed()){var hd=e.target.closest&&e.target.closest('.pmo-mod-hd');if(hd){e.preventDefault();flyShow(hd.closest('.pmo-mgrp'));var f=fly&&fly.querySelector('button');if(f)f.focus()}}},true);
    side.addEventListener('focusin',function(e){var w=e.target.closest('.pmo-mgrp');if(w&&collapsed())flyShow(w)});
    side.addEventListener('focusout',function(e){if((!fly||!fly.contains(e.relatedTarget))&&(!fly2||!fly2.contains(e.relatedTarget)))flyHideSoon()});
    side.addEventListener('keydown',function(e){if(e.key==='ArrowRight'&&fly&&fly.classList.contains('on')){var f=fly.querySelector('button');if(f){e.preventDefault();f.focus()}}});
    document.addEventListener('click',function(e){if(fly&&!fly.contains(e.target)&&(!fly2||!fly2.contains(e.target))&&!side.contains(e.target))flyHide()});
    window.addEventListener('scroll',flyHide,{passive:true});
  }

  /* ---------- daftar halaman untuk pencarian Ctrl K ---------- */
  function role(){var r='';try{var u=JSON.parse(sessionStorage.getItem('pmoUser')||'null');r=u&&u.role||''}catch(e){}return String(r||'').trim().toUpperCase()}
  function navPages(){
    var r=role(),ktr=r==='KONTRAKTOR',mrB=document.querySelector('aside.side [data-mr]'),mr=['ADMIN','INPUT','PIC'].indexOf(r)>=0||!!(mrB&&!mrB.hidden&&mrB.style.display!=='none'),inp=['ADMIN','INPUT','PIC'].indexOf(r)>=0||mr,out=[];
    function g(gn,list){list.forEach(function(x){out.push({name:x[1],route:x[0],grp:gn,kw:x[2]||''})})}
    if(!ktr)g('Dashboard Proyek',[['portal','Portal','beranda ringkasan'],['executive','Monthly Executive Review','eksekutif direksi'],['master','Master Schedule','jadwal baseline'],['weekly','Weekly Progress','mingguan']]);
    else g('Dashboard Proyek',[['portal','Portal','beranda ringkasan'],['weekly','Weekly Progress','mingguan']]);
    if(!window.__pmoNoEpc&&!(r&&['ADMIN','PIC','INPUT','KONTRAKTOR'].indexOf(r)<0))g('EPCC Control',[['engineering','Engineering','dokumen ifr ifa ifc'],['epcc&field=PROC','Procurement','pengadaan po material'],['epcc&field=CONS','Construction','konstruksi fisik lapangan'],['epcc&field=COM','Commissioning','komisioning uji']]);
    if(!ktr)g('Dokumen & Lapangan',[['documents','Document Control','dokumen kontrak'],['library','Library & Knowledge','pedoman prosedur'],['live','Live View','cctv kamera'],['visual3d','Visual 3D Proyek','model 3d tiga dimensi three']]);
    if(ktr)g('Lapangan & 3D',[['documents','MoM / Risalah rapat','notulen tindak lanjut document control'],['live','Live View','cctv kamera'],['spotlight','Spotlight Lobby','tv lobby'],['visual3d','Visual 3D Proyek','model 3d tiga dimensi three']]);
    if(!ktr&&mr)g('Pelaporan Manajemen',[['report','Management Report · Pelaporan Manajemen','presentasi bulanan'],['weeklyprint','Buat Laporan Weekly','cetak pdf excel'],['monthlydoc','Buat Laporan Bulanan (dokumen)','word']]);
    if(ktr)g('Input Mingguan',[['input','Input HSE & Video Mingguan','isi k3 hse video materi mingguan']]);
    if(!ktr&&inp)g('Input & Data Proyek',[['input','Input Progress Mingguan','isi mingguan input progres'],['monthly','Input Progress Bulanan','isian bulanan laporan bulanan biaya realisasi'],['project','Tambah / Edit Proyek','proyek baru']]);
    return out;
  }
  window.pmoNavExtra=function(add,used){
    navPages().forEach(function(x){
      add(x.name,'Halaman · '+x.grp,document.body,function(){go(x.route)},x.name,x.kw);
      used['Modul|'+x.name.toLowerCase()]=1;
    });
    isiBtns().forEach(function(b){var sp=b.querySelector('span');var t=String((sp&&sp.textContent)||b.textContent||'').trim();if(t)add(t,'Isi halaman ini',b,function(){b.click()},t)});
  };

  /* ---------- sorot item dari tautan Sena / peringatan (?sena=<kode>) ---------- */
  function senaFocus(){
    var code=qp('sena');if(!code)return;
    var norm=function(t){return String(t||'').toLowerCase().replace(/\s+/g,' ').trim()},key=norm(code),t0=Date.now(),phase=0;
    function toast(msg){var d=document.createElement('div');d.className='pmo-sena-toast';d.setAttribute('role','status');d.textContent=msg;document.body.appendChild(d);setTimeout(function(){d.remove()},5200)}
    function main(){return document.querySelector('main')||document.querySelector('.content')||document.body}
    function find(){
      var root=main(),best=null,cands=root.querySelectorAll('tr,li,.row,.it,.item,.card,.doc,[data-id],.gr,.grp-row,.tree-row');
      for(var i=0;i<cands.length;i++){var el=cands[i];if(!el.offsetParent)continue;if(el.closest('.pmo-pbar,aside.side,.aic-pan,.pmo-qs-dialog'))continue;
        var txt=norm(el.textContent);if(txt.indexOf(key)<0||txt.length>1600)continue;if(!best||el.textContent.length<best.textContent.length)best=el}
      return best;
    }
    function hit(el){el.scrollIntoView({block:'center',behavior:'smooth'});el.classList.add('pmo-sena-hit');setTimeout(function(){el.classList.remove('pmo-sena-hit')},4500);
      try{var u=new URL(location.href);u.searchParams.delete('sena');history.replaceState(history.state,'',u.toString())}catch(e){}}
    function search(){
      var inp=main().querySelector('input.q:not([disabled]),input[type="search"]:not(#pmoQuickDialog input):not([disabled])');
      if(!inp||!inp.offsetParent)return false;
      inp.value=code;['input','keyup','change'].forEach(function(ev){inp.dispatchEvent(new Event(ev,{bubbles:true}))});return true;
    }
    function openList(){
      var L=isiBtns(),pick=null;
      L.forEach(function(b){var t=norm(b.textContent);if(!pick&&(/^item\b/.test(t)||t==='dokumen'||/^register/.test(t)||/^dokumen proyek/.test(t)))pick=b});
      if(pick&&!pick.classList.contains('on')){pick.click();return true}return false;
    }
    (function step(){
      var el=find();if(el){hit(el);return}
      if(Date.now()-t0>14000){toast('"'+code+'" tidak terlihat di halaman ini. Coba cari lewat kotak pencarian halaman.');return}
      if(Date.now()-t0>2500){
        if(phase===0){phase=1;if(openList()){setTimeout(step,900);return}}
        if(phase===1){phase=2;if(search()){setTimeout(step,900);return}}
      }
      setTimeout(step,400);
    })();
  }

  /* ---------- baris navigasi (breadcrumb, tab EPCC, isi halaman) ---------- */
  var GRP={m1:'Dashboard Proyek',m3:'EPCC Control',m2:'Dokumen & Lapangan',m5:'Pelaporan Manajemen',minp:'Input & Data Proyek'};
  var TAG={m1:'M1',m3:'M3',m2:'M2·M4',m5:'M5',minp:'INPUT'};
  function isEpc(){return page==='engineering'||page==='epcc'||page==='procurement'||page==='construction'||page==='commissioning'}
  function epcCur(){
    if(page==='engineering')return 'ENG';
    var on=document.querySelector('aside.side .nav[data-field].on,aside.side .nav[data-field].active,aside.side .nav.fld.on');
    if(on)return on.getAttribute('data-field');
    var f=qp('field').toUpperCase();if(f)return f;
    return {procurement:'PROC',construction:'CONS',commissioning:'COM'}[page]||'PROC';
  }
  function isiBtns(){
    var w=document.querySelector('aside.side [data-mod-grp="isi"]');if(!w)return [];
    return Array.prototype.slice.call(w.querySelectorAll('button.nav')).filter(function(b){if(b.hidden||b.style.display==='none')return false;try{return getComputedStyle(b).display!=='none'}catch(e){return true}});
  }
  function activeInfo(){
    var g=window.__pmoActGrp||'',name='';
    if(isEpc()){g='m3';var c=epcCur();EPC.forEach(function(x){if(x[0]===c)name=x[1]})}
    else{
      var a=document.querySelector('aside.side .pmo-mgrp:not([data-mod-grp="isi"]) .nav.active:not(.sub),aside.side .pmo-mgrp:not([data-mod-grp="isi"]) .nav[aria-current="page"]:not(.sub)');
      if(a){var sp=a.querySelector('span');name=String((sp&&sp.textContent)||a.getAttribute('title')||'').trim();var w=a.closest('[data-mod-grp]');if(w)g=w.getAttribute('data-mod-grp')}
    }
    return {g:g,name:name};
  }
  var bar=null,hdr=null;
  function build(){
    var side=document.querySelector('aside.side');if(!side)return false;
    hdr=document.querySelector('header.top,header.topbar');if(!hdr||!hdr.parentNode)return false;
    if(!bar){bar=document.createElement('div');bar.className='pmo-pbar';bar.id='pmoPbar';hdr.parentNode.insertBefore(bar,hdr.nextSibling);
      bar.addEventListener('click',function(e){
        var tr=e.target.closest('.pmo-isi-trig');
        if(tr){var dw=tr.closest('.pmo-isi-drop');if(dw){var nx=!dw.classList.contains('open');dw.classList.toggle('open',nx);tr.setAttribute('aria-expanded',nx?'true':'false')}return}
        var t=e.target.closest('[data-epc]');
        if(t){var code=t.getAttribute('data-epc');var own=document.querySelector('aside.side .nav[data-field="'+code+'"]');
          if(own&&page==='epcc'){own.click();try{var u=new URL(location.href);u.searchParams.set('field',code);history.replaceState(history.state,'',u.toString())}catch(x){}setTimeout(render,60)}else{EPC.forEach(function(x){if(x[0]===code)go(x[2])})}return}
        var c=e.target.closest('[data-isi]');
        if(c){var dw2=c.closest('.pmo-isi-drop');if(dw2){dw2.classList.remove('open');var tb=dw2.querySelector('.pmo-isi-trig');if(tb)tb.setAttribute('aria-expanded','false')}var b=isiBtns()[+c.getAttribute('data-isi')];if(b){b.click();setTimeout(render,80)}}
      });
      document.addEventListener('click',function(e){var dw=bar&&bar.querySelector('.pmo-isi-drop.open');if(dw&&!dw.contains(e.target)){dw.classList.remove('open');var tb=dw.querySelector('.pmo-isi-trig');if(tb)tb.setAttribute('aria-expanded','false')}});
    }
    render();return true;
  }
  var lastHtml='';
  function render(){
    if(!bar)return;
    var info=activeInfo(),h='';
    var crumb=info.g&&GRP[info.g]?'<span class="pmo-crumb"><span>'+esc(GRP[info.g])+'</span>'+(info.name?'<span class="sep">›</span><b>'+esc(info.name)+'</b>':'')+'</span>':'';
    var L=isiBtns();
    var isMob=window.innerWidth<=900||document.documentElement.classList.contains('m-mode');
    var useDrop=(page==='executive'||((page==='weekly'||page==='master'||page==='documents'||page==='dokumen'||page==='library')&&!isMob))&&L.length>0;
    var chips=L.length?'<span class="pmo-chips" role="list">'+L.map(function(b,i){var on=b.classList.contains('on')||b.classList.contains('active')||b.getAttribute('aria-current')==='true';var sp=b.querySelector('span');return '<button type="button" role="listitem" class="pmo-chip'+(on?' on':'')+'" data-isi="'+i+'"'+(on?' aria-current="true"':'')+'>'+esc(String((sp&&sp.textContent)||b.textContent||'').trim())+'</button>'}).join('')+'</span>':'';
    if(isEpc()){
      var cur=epcCur();
      h='<div class="pmo-pbar-r">'+crumb+'<nav class="pmo-tabs" aria-label="EPCC Control">'+EPC.map(function(x){var on=x[0]===cur;return '<button type="button" class="pmo-tab'+(on?' on':'')+'" data-epc="'+x[0]+'"'+(on?' aria-current="page"':'')+'><i class="dot" style="background:'+x[3]+'"></i>'+x[1]+'</button>'}).join('')+'</nav></div>';
      if(chips)h+='<div class="pmo-pbar-r pmo-r-isi"><span class="pmo-isi-l">Isi halaman</span>'+chips+'</div>';
    }else if(useDrop){
      var actBtn=L.find(function(b){return b.classList.contains('on')||b.classList.contains('active')||b.getAttribute('aria-current')==='true'})||L[0];
      var actSp=actBtn&&actBtn.querySelector('span');
      var actLbl=esc(String((actSp&&actSp.textContent)||(actBtn&&actBtn.textContent)||'Ringkasan').trim());
      var menuItems=L.map(function(b,i){var on=b.classList.contains('on')||b.classList.contains('active')||b.getAttribute('aria-current')==='true';var sp=b.querySelector('span');return '<button type="button" role="menuitem" class="pmo-chip'+(on?' on':'')+'" data-isi="'+i+'"><span>'+esc(String((sp&&sp.textContent)||b.textContent||'').trim())+'</span></button>'}).join('');
      h='<div class="pmo-pbar-r has-drop">'+crumb+'<div class="pmo-isi-drop"><button type="button" class="pmo-isi-trig" aria-haspopup="menu" aria-expanded="false"><span class="pmo-isi-l">Isi halaman</span><span>'+actLbl+'</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><div class="pmo-isi-menu" role="menu" aria-label="Isi halaman">'+menuItems+'</div></div></div>';
    }else{
      if(!crumb&&!chips){bar.hidden=true;return}
      h='<div class="pmo-pbar-r'+(crumb?'':' pmo-r-isi')+'">'+crumb+(chips?'<span class="pmo-chips" style="margin-left:auto"><span class="pmo-isi-l">Isi halaman</span></span>'+chips:'')+'</div>';
    }
    bar.hidden=false;bar.classList.toggle('is-epc',isEpc());bar.classList.toggle('has-isi-drop',useDrop);
    if(h!==lastHtml){bar.innerHTML=h;lastHtml=h}
    place();
  }
  function place(){
    if(!bar||!hdr)return;
    if(document.documentElement.classList.contains('ex-hero-hdr')){bar.style.top='0px';return;}
    var cs=getComputedStyle(hdr);
    bar.style.top=(cs.position==='sticky'||cs.position==='fixed')?hdr.offsetHeight+'px':'0px';
  }
  /* ---------- scroll modern opsi 2 (floating rail + section dots + ke atas) ---------- */
  function initScrollHud(){
    if(/^(spotlight|lobby)$/i.test(page)||document.body.classList.contains('sv2')||document.getElementById('spotBoot')||document.getElementById('pmoScrollTrack'))return;
    var track=document.createElement('div');track.id='pmoScrollTrack';track.className='pmo-ftrack';track.setAttribute('aria-hidden','true');
    var thumb=document.createElement('div');thumb.id='pmoScrollThumb';thumb.className='pmo-fthumb';track.appendChild(thumb);
    var dotsNav=document.createElement('nav');dotsNav.id='pmoScrollDots';dotsNav.className='pmo-sdots';dotsNav.setAttribute('aria-label','Navigasi bagian halaman');
    var topBtn=document.createElement('button');topBtn.type='button';topBtn.id='pmoToTop';topBtn.className='pmo-topbtn';topBtn.setAttribute('aria-label','Kembali ke atas');topBtn.textContent='↑ Ke atas';
    document.body.appendChild(track);document.body.appendChild(dotsNav);document.body.appendChild(topBtn);

    var secs=[],dotBtns=[];
    function collectSections(){
      var list=[];
      if(document.documentElement.classList.contains('pv2')){
        [['#hero','Puncak Hero'],['#briefBox','Ringkasan Eksekutif'],['#vSec','Daftar Proyek']].forEach(function(p){
          var el=document.querySelector(p[0]);if(el&&el.offsetHeight>0)list.push({el:el,label:p[1]});
        });
      }else if(page==='executive'){
        var topEl=document.querySelector('.hero')||document.body;
        list.push({el:topEl,label:'Ringkasan & Story',isTop:true});
        [['section.kpis','Status Proyek (KPI)'],['#monthlyDeviationPanel','Peta Deviasi Bulanan'],['#financePanel','Realisasi Keuangan'],['#lookAheadSection','3 Month Look Ahead'],['#financeDetailSection','Tabel Keuangan RKAP'],['#sec-progress','Pencapaian Progress'],['#milestoneSection','Milestone & Laporan']].forEach(function(p){
          var el=document.querySelector(p[0]);if(el&&el.offsetHeight>0&&list.length<7)list.push({el:el,label:p[1]});
        });
      }else if(page==='weekly'){
        var wTop=document.querySelector('#sec-ringkasan>.hero')||document.querySelector('#sec-ringkasan')||document.body;
        list.push({el:wTop,label:'Ringkasan & KPI',isTop:true});
        [['#sec-profil','Profil Proyek'],['#sec-progres','Progres & Kurva S'],['#sec-hl','Highlight Aktivitas'],['#sec-prog','Target Akhir Tahun'],['#sec-risiko','Concern & Mitigasi'],['#sec-rtl','RTL Jadwal'],['#sec-msc','Forecast CPM'],['#sec-hse','HSE, Video & Materi']].forEach(function(p){
          var el=document.querySelector(p[0]);if(el&&!el.hidden&&el.offsetHeight>0&&list.length<10)list.push({el:el,label:p[1]});
        });
      }else{
        var seen=[],topEl=document.querySelector('main,.wrap,.hero,header.head')||document.body;
        list.push({el:topEl,label:'Bagian Atas',isTop:true});
        var cand=document.querySelectorAll('main section.grp>h2,main .cardh>b,main details>summary>b,main .sec>h2,.wrap>section>h2,.wrap details>summary .st>b');
        for(var i=0;i<cand.length&&list.length<6;i++){
          var c=cand[i],target=c.closest('section,details,.card')||c;
          if(!target||target.offsetHeight<40||seen.indexOf(target)>=0)continue;
          var topY=target.getBoundingClientRect().top+window.scrollY;
          if(list.length&&Math.abs(topY-(list[list.length-1].isTop?0:list[list.length-1].y))<180)continue;
          seen.push(target);
          var txt=String(c.textContent||'').replace(/\s+/g,' ').trim().slice(0,36);
          if(txt)list.push({el:target,label:txt,y:topY});
        }
      }
      secs=list;
      var max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
      var showDots=secs.length>=3&&max>220;
      dotsNav.classList.toggle('on',showDots);
      if(!showDots){dotsNav.innerHTML='';dotBtns=[];return;}
      var key=secs.map(function(s){return s.label}).join('|');
      if(dotsNav.getAttribute('data-k')===key)return;
      dotsNav.setAttribute('data-k',key);
      dotsNav.innerHTML=secs.map(function(s,idx){
        return '<button type="button" class="pmo-sdot'+(idx===0?' on':'')+'" data-idx="'+idx+'" aria-label="Ke '+esc(s.label)+'"><span>'+esc(s.label)+'</span><i></i></button>';
      }).join('');
      dotBtns=Array.prototype.slice.call(dotsNav.querySelectorAll('.pmo-sdot'));
      dotBtns.forEach(function(b){
        b.onclick=function(){
          var s=secs[+b.getAttribute('data-idx')];
          if(!s)return;
          if(s.isTop){window.scrollTo({top:0,behavior:'smooth'});return;}
          var padOff=(s.el&&s.el.id==='vSec')?0:16;
          var isHeroHdr=document.documentElement.classList.contains('ex-hero-hdr');
          var sh=isHeroHdr?document.getElementById('exStuckHost'):null;
          var heroStickyH=(sh&&sh.offsetHeight>0)?sh.offsetHeight:(hdr&&hdr.offsetHeight>40?hdr.offsetHeight+14:64);
          var hdrPos=hdr?getComputedStyle(hdr).position:'';
          var stickyOff=isHeroHdr?heroStickyH:(hdrPos==='fixed'?hdr.offsetHeight:(page==='executive'&&hdrPos==='sticky'?hdr.offsetHeight+(bar&&!bar.hidden?bar.offsetHeight:0):0));
          var off=stickyOff+padOff;
          var y=Math.max(0,s.el.getBoundingClientRect().top+window.scrollY-off);
          window.scrollTo({top:y,behavior:'smooth'});
        };
      });
    }

    var raf=0;
    function sync(){
      raf=0;
      var doc=document.documentElement,max=Math.max(0,doc.scrollHeight-window.innerHeight);
      var showTrack=max>60;
      track.classList.toggle('on',showTrack);
      if(hdr){
        var isHeroHdr=document.documentElement.classList.contains('ex-hero-hdr');
        var sh=isHeroHdr?document.getElementById('exStuckHost'):null;
        var heroTopPad=(sh&&document.documentElement.classList.contains('ex-hdr-stuck')&&sh.offsetHeight>0)?(sh.offsetHeight+10):12;
        var cs=getComputedStyle(hdr),topPad=isHeroHdr?heroTopPad:((cs.position==='sticky'||cs.position==='fixed')?(hdr.offsetHeight+(bar&&!bar.hidden?bar.offsetHeight:0)+8):12);
        track.style.top=Math.min(140,Math.max(12,topPad))+'px';
      }
      if(showTrack){
        var y=window.scrollY,pct=Math.min(1,Math.max(0,y/max));
        var th=Math.max(42,Math.round((window.innerHeight/doc.scrollHeight)*track.clientHeight));
        thumb.style.height=th+'px';
        thumb.style.top=Math.round(pct*Math.max(0,track.clientHeight-th))+'px';
      }
      if(page==='executive'&&max>220){
        var atTop=window.scrollY<=260;
        topBtn.classList.add('show');
        topBtn.textContent=atTop?'↓ Ke bawah':'↑ Ke atas';
        topBtn.setAttribute('aria-label',atTop?'Gulir ke bawah ke KPI & detail':'Kembali ke atas');
        topBtn.setAttribute('data-dir',atTop?'down':'up');
      }else{
        topBtn.classList.toggle('show',window.scrollY>260);
        topBtn.textContent='↑ Ke atas';
        topBtn.setAttribute('aria-label','Kembali ke atas');
        topBtn.setAttribute('data-dir','up');
      }
      var fab=document.querySelector('.aic-fab');
      var fabVis=!!(fab&&!fab.hidden&&getComputedStyle(fab).opacity!=='0'&&getComputedStyle(fab).display!=='none');
      topBtn.classList.toggle('has-fab',fabVis);
      var barH=0;
      document.querySelectorAll('.actionbar,.pmn-dock,.m-dock').forEach(function(el){
        if(el.hidden)return;
        var cs=getComputedStyle(el);
        if(cs.display==='none'||cs.visibility==='hidden')return;
        if(cs.position!=='fixed'&&cs.position!=='sticky')return;
        var r=el.getBoundingClientRect();
        if(r.height>0&&r.bottom>=window.innerHeight-4)barH=Math.max(barH,Math.round(r.height));
      });
      var baseB=(window.innerWidth<=760?16:22)+barH+(fabVis?66:0);
      topBtn.style.bottom=baseB+'px';
      if(showTrack)track.style.bottom=(14+barH)+'px';
      var modOpen=!!document.querySelector('.modal:not([hidden]),.pv-wrap:not([hidden]),.pw-ov:not([hidden])');
      if(modOpen)topBtn.classList.remove('show');
      if(dotBtns.length){
        var act=0;
        secs.forEach(function(s,i){
          if(s.isTop)return;
          if(s.el.getBoundingClientRect().top<=window.innerHeight*0.42)act=i;
        });
        if(window.scrollY<60)act=0;
        dotBtns.forEach(function(b,i){b.classList.toggle('on',i===act);});
      }
    }
    function scheduleSync(){if(!raf)raf=requestAnimationFrame(sync);}

    var dragging=false;
    function dragTo(clientY){
      var rect=track.getBoundingClientRect(),th=thumb.offsetHeight||42;
      var ratio=Math.min(1,Math.max(0,(clientY-rect.top-th/2)/Math.max(1,rect.height-th)));
      var max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
      window.scrollTo({top:ratio*max,behavior:'auto'});
    }
    track.addEventListener('pointerdown',function(e){
      dragging=true;track.classList.add('drag');
      try{track.setPointerCapture(e.pointerId);}catch(x){}
      dragTo(e.clientY);
    });
    track.addEventListener('pointermove',function(e){if(dragging)dragTo(e.clientY);});
    track.addEventListener('pointerup',function(){dragging=false;track.classList.remove('drag');});
    topBtn.onclick=function(){
      if(topBtn.getAttribute('data-dir')==='down'){
        var nxt=secs[1]&&secs[1].el;
        if(nxt){
          var isHeroHdr=document.documentElement.classList.contains('ex-hero-hdr');
          var sh=isHeroHdr?document.getElementById('exStuckHost'):null;
          var heroOff=(sh&&sh.offsetHeight>0)?sh.offsetHeight:(hdr&&hdr.offsetHeight>40?hdr.offsetHeight+14:64);
          var hdrPos=hdr?getComputedStyle(hdr).position:'';
          var off=(isHeroHdr?heroOff:(/(sticky|fixed)/.test(hdrPos)?hdr.offsetHeight+(bar&&!bar.hidden?bar.offsetHeight:0):0))+16;
          window.scrollTo({top:Math.max(0,nxt.getBoundingClientRect().top+window.scrollY-off),behavior:'smooth'});
        }else{
          window.scrollTo({top:Math.round(window.innerHeight*0.85),behavior:'smooth'});
        }
        return;
      }
      window.scrollTo({top:0,behavior:'smooth'});
    };

    window.addEventListener('scroll',scheduleSync,{passive:true});
    window.addEventListener('resize',function(){if(page==='weekly')render();collectSections();scheduleSync();},{passive:true});
    if(window.ResizeObserver)try{new ResizeObserver(function(){collectSections();scheduleSync();}).observe(document.body);}catch(e){}
    var hadFab=false;
    if(window.MutationObserver)try{new MutationObserver(function(muts){var cur=!!document.querySelector('.aic-fab');if(cur!==hadFab){hadFab=cur;scheduleSync();return;}for(var i=0;i<muts.length;i++){var t=muts[i].target;if(t&&typeof t.className==='string'&&/\b(aic-fab|actionbar|pmn-dock|m-dock|modal|pv-wrap|pw-ov)\b/.test(t.className)){scheduleSync();break;}}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','style','class']});}catch(e){}
    collectSections();sync();
    setTimeout(function(){collectSections();sync();},800);
    setTimeout(function(){collectSections();sync();},2200);
  }

  function bindBrandHome(){
    if(page==='portal'||document.documentElement.classList.contains('pv2'))return;
    var goPortal=function(){
      if(typeof go==='function'){try{go('portal');return;}catch(e){}}
      var base='';try{base=typeof appUrl!=='undefined'&&appUrl?appUrl:'/app'}catch(e){base='/app'}
      window.top.location.href=base+(base.indexOf('?')>=0?'&':'?')+'page=portal';
    };
    document.querySelectorAll('aside.side .brand,.side-head .brand,header.top .brand,header.topbar .brand').forEach(function(el){
      if(el.getAttribute('data-pmo-home')==='1')return;
      el.setAttribute('data-pmo-home','1');
      el.setAttribute('role','link');
      el.setAttribute('tabindex','0');
      el.setAttribute('title','Kembali ke halaman Portal utama');
      el.setAttribute('aria-label','Kembali ke halaman Portal utama');
      el.style.cursor='pointer';
      el.addEventListener('click',function(e){if(e.target&&e.target.closest('button,a,[data-toggle-nav]'))return;goPortal();});
      el.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();goPortal();}});
    });
  }

  var q=0;function queue(){if(!q)q=setTimeout(function(){q=0;render();addPicker();bindBrandHome();try{railIcons()}catch(e){}},120)}
  function init(){
    addPicker();bindBrandHome();initScrollHud();
    var tries=0;(function wait(){if(document.querySelector('aside.side nav[data-pmo-modular="1"]')||tries>40){build();bindFly();railIcons();setTimeout(senaFocus,600);
      var side=document.querySelector('aside.side');
      if(side&&window.MutationObserver)new MutationObserver(queue).observe(side,{subtree:true,attributes:true,attributeFilter:['class','hidden','style','aria-current']});
      if(window.MutationObserver)new MutationObserver(function(){if(!document.querySelector('.pmo-acc')||document.querySelectorAll('.theme-switch,.acm-theme').length>document.querySelectorAll('.pmo-acc').length)queue()}).observe(document.body,{childList:true,subtree:true});
      window.addEventListener('resize',place);
      return}tries++;setTimeout(wait,150)})();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
</script>`;

/**
 * Sidebar akordeon (patch ke setupModularSidebar di legacy/AccountMenu.html):
 * saat halaman dibuka, hanya grup yang berisi halaman aktif yang terbuka; membuka satu grup menutup yang lain.
 * Grup M1 (Dashboard Proyek) tetap selalu terbuka.
 */
const NAV_PATCHES = [

  {
    file: 'AccountMenu',
    find: "shown=entries.filter(function(x){return (x.name+' '+x.type).toLocaleLowerCase('id').includes(q)})",
    replace: "shown=entries.filter(function(x){return (x.name+' '+x.type+' '+(x.kw||'')).toLocaleLowerCase('id').includes(q)})",
  },
  {
    file: 'AccountMenu',
    find: "search.placeholder='Cari proyek atau modul…';",
    replace: "search.placeholder='Cari halaman, proyek, atau isi halaman…';",
  },

  {
    file: 'PmoUi',
    find: "shown=entries.filter(function(x){return (x.name+' '+x.type).toLocaleLowerCase('id').includes(q)})",
    replace: "shown=entries.filter(function(x){return (x.name+' '+x.type+' '+(x.kw||'')).toLocaleLowerCase('id').includes(q)})",
  },
  {
    file: 'PmoUi',
    find: "search.placeholder='Cari proyek atau modul…';",
    replace: "search.placeholder='Cari halaman, proyek, atau isi halaman…';",
  },
  {
    // Ctrl K: tambah daftar halaman lengkap (sesuai hak akses) dan isi halaman aktif (nav-theme.js → pmoNavExtra).
    file: 'AccountMenu',
    find: "entries=[];var used={};function add(name,type,node,fn,key){if(!name)return;key=type+'|'+(key||name).toLowerCase();if(used[key])return;used[key]=1;entries.push({name:name,type:type,node:node,run:fn})}",
    replace: "entries=[];var used={};function add(name,type,node,fn,key,kw){if(!name)return;key=type+'|'+(key||name).toLowerCase();if(used[key])return;used[key]=1;entries.push({name:name,type:type,node:node,run:fn,kw:kw||''})}if(window.pmoNavExtra)try{window.pmoNavExtra(add,used)}catch(e){}",
  },
  {
    // Ctrl K: tambah daftar halaman lengkap (sesuai hak akses) dan isi halaman aktif (nav-theme.js → pmoNavExtra).
    file: 'PmoUi',
    find: "entries=[];var used={};function add(name,type,node,fn,key){if(!name)return;key=type+'|'+(key||name).toLowerCase();if(used[key])return;used[key]=1;entries.push({name:name,type:type,node:node,run:fn})}",
    replace: "entries=[];var used={};function add(name,type,node,fn,key,kw){if(!name)return;key=type+'|'+(key||name).toLowerCase();if(used[key])return;used[key]=1;entries.push({name:name,type:type,node:node,run:fn,kw:kw||''})}if(window.pmoNavExtra)try{window.pmoNavExtra(add,used)}catch(e){}",
  },
  {
    file: 'AccountMenu',
    find: 'st[g.id]=!st[g.id];',
    replace: "var __was=!!st[g.id];GROUPS.forEach(function(x){if(!x.pinned&&x.id!=='isi')st[x.id]=true});st[g.id]=!__was;",
  },
  {
    file: 'AccountMenu',
    find: '    window.sideGrpSync=syncModules;\n    syncModules();\n',
    replace: [
      '    window.sideGrpSync=syncModules;',
      '    (function(){',
      "      var act=null;if(/[?&]page=(engineering|epcc|procurement|construction|commissioning)\\b/i.test(location.search))act='m3';",
      "      if(!act)GROUPS.forEach(function(g){var w=grpEls[g.id];if(act||!w||g.id==='isi')return;if(w.querySelector('.nav.active:not(.sub),.nav[aria-current=\"page\"]:not(.sub)'))act=g.id});",
      '      window.__pmoActGrp=act||\'\';',
      "      GROUPS.forEach(function(g){if(!g.pinned&&g.id!=='isi')st[g.id]=(g.id!==act)});",
      '      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(st))}catch(e){}',
      '    })();',
      '    syncModules();',
      '',
    ].join('\n'),
  },
];

module.exports = { ACCENTS, cleanAccent, accentHead, NAV_SNIPPET, NAV_PATCHES };

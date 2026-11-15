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
html[data-accent="sage"]:not([data-theme="dark"]):is([data-page="portal"],[data-page="executive"],[data-page="weekly"],[data-page="input"],[data-page="project"],[data-page="monthly"]) .hero{background-color:#0F2A1D!important;box-shadow:0 18px 40px rgba(15,42,29,.22)}
html[data-accent="sage"]:not([data-theme="dark"]):is([data-page="portal"],[data-page="executive"],[data-page="weekly"],[data-page="input"],[data-page="project"],[data-page="monthly"]) .hero::before{background:linear-gradient(100deg,rgba(15,42,29,.95) 0%,rgba(31,58,38,.80) 45%,rgba(55,85,52,.35) 100%)!important}
html[data-accent="sage"]:not([data-theme="dark"])[data-page="executive"] header.head{background:#0F2A1D!important}
html[data-accent="sage"]:not([data-theme="dark"])[data-page="input"] .hero,html[data-accent="sage"]:not([data-theme="dark"])[data-page="project"] .hero,html[data-accent="sage"]:not([data-theme="dark"])[data-page="monthly"] .hero{background-image:linear-gradient(110deg,#0F2A1D 0%,#375534 55%,#6B9071 100%)!important}
html[data-accent="mocha"]:not([data-theme="dark"]):is([data-page="portal"],[data-page="executive"],[data-page="weekly"],[data-page="input"],[data-page="project"],[data-page="monthly"]) .hero{background-color:#3B2A1F!important;box-shadow:0 18px 40px rgba(59,42,31,.22)}
html[data-accent="mocha"]:not([data-theme="dark"]):is([data-page="portal"],[data-page="executive"],[data-page="weekly"],[data-page="input"],[data-page="project"],[data-page="monthly"]) .hero::before{background:linear-gradient(100deg,rgba(59,42,31,.95) 0%,rgba(84,60,43,.80) 45%,rgba(111,78,55,.35) 100%)!important}
html[data-accent="mocha"]:not([data-theme="dark"])[data-page="executive"] header.head{background:#3B2A1F!important}
html[data-accent="mocha"]:not([data-theme="dark"])[data-page="input"] .hero,html[data-accent="mocha"]:not([data-theme="dark"])[data-page="project"] .hero,html[data-accent="mocha"]:not([data-theme="dark"])[data-page="monthly"] .hero{background-image:linear-gradient(110deg,#3B2A1F 0%,#6F4E37 55%,#B08968 100%)!important}
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
html:not([data-theme="dark"]) aside.side .pmo-mgrp+.pmo-mgrp{border-top-color:rgba(255,255,255,.10)}
html:not([data-theme="dark"]) aside.side ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.22)}
html:not([data-theme="dark"]) aside.side button:focus-visible{outline:2px solid #fff;outline-offset:2px}

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

/** Disisipkan di <head> (paling awal) supaya tidak ada kedipan warna saat halaman dibuka. */
function accentHead(accent) {
  const a = cleanAccent(accent) || 'blue';
  return `<script>(function(d){d.setAttribute('data-accent','${a}');try{d.setAttribute('data-page',(new URLSearchParams(location.search).get('page')||'').toLowerCase())}catch(e){}})(document.documentElement);window.__pmoAccent='${a}';</script>\n${ACCENT_CSS}`;
}

const NAV_SNIPPET = String.raw`<style id="pmoNavACss">
.pmo-pbar{position:sticky;z-index:29;background:var(--topbar,rgba(255,255,255,.94));-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border-bottom:1px solid var(--line,#e0e8f0);padding:0 28px}
.pmo-pbar-r{display:flex;align-items:center;gap:14px;min-height:44px;overflow-x:auto;scrollbar-width:none}
.pmo-pbar-r::-webkit-scrollbar{display:none}
.pmo-pbar-r+.pmo-pbar-r{border-top:1px solid color-mix(in srgb,var(--line,#e0e8f0) 70%,transparent);min-height:40px}
.pmo-crumb{display:flex;align-items:center;gap:6px;flex:none;font-size:12.5px;color:var(--muted,#5b7085);white-space:nowrap}
.pmo-crumb b{color:var(--ink,#132b43);font-weight:600}
.pmo-crumb .sep{opacity:.6}
.pmo-tabs{display:flex;align-items:stretch;gap:2px;align-self:stretch}
.pmo-tab{display:flex;align-items:center;gap:7px;padding:0 14px;border:0;border-bottom:2.5px solid transparent;background:transparent;color:var(--muted,#5b7085);font-family:inherit;font-size:13.5px;font-weight:600;line-height:1;cursor:pointer;white-space:nowrap;min-height:44px}
.pmo-tab:hover{color:var(--ink,#132b43)}
.pmo-tab .dot{width:8px;height:8px;border-radius:50%;flex:none}
.pmo-tab.on{color:var(--pri-ink,#0f5fa8);border-bottom-color:var(--pri,#0f5fa8)}
.pmo-tab:focus-visible,.pmo-chip:focus-visible{outline:2px solid var(--pri,#0f5fa8);outline-offset:-2px;border-radius:8px}
.pmo-isi-l{flex:none;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#5b7085)}
.pmo-chips{display:flex;gap:6px;align-items:center}
.pmo-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:99px;border:1px solid var(--line,#e0e8f0);background:var(--card,#fff);color:var(--ink,#132b43);font-family:inherit;font-size:12.5px;font-weight:500;line-height:1.2;cursor:pointer;white-space:nowrap;min-height:0}
.pmo-chip:hover{border-color:var(--pri,#0f5fa8);color:var(--pri-ink,#0f5fa8)}
.pmo-chip.on{background:var(--soft,#e8f3fb);border-color:var(--pri,#0f5fa8);color:var(--pri-ink,#0f5fa8);font-weight:600}
.pmo-chip svg{width:14px;height:14px}
.pmo-pbar .pmo-crumb+.pmo-chips{margin-left:auto}
@media (max-width:1100px){.pmo-pbar{padding:0 16px}}
@media (max-width:760px){.pmo-pbar:not(.is-epc){display:none!important}.pmo-pbar{padding:0 10px}.pmo-crumb,.pmo-pbar .pmo-r-isi{display:none!important}.pmo-tab{padding:0 10px;font-size:13px}}
html.m-mode .pmo-pbar,html.pp-open .pmo-pbar{display:none!important}
@media print{.pmo-pbar{display:none!important}}
.pmo-fly{position:fixed;z-index:60;min-width:220px;max-width:280px;padding:8px;border-radius:12px;background:var(--pmo-side,#152435);color:var(--pmo-side-ink,#e3ecf4);box-shadow:0 12px 32px rgba(0,0,0,.28),0 0 0 1px rgba(255,255,255,.08);opacity:0;transform:translateX(-4px);transition:opacity .12s ease,transform .12s ease;pointer-events:none}
.pmo-fly.on{opacity:1;transform:none;pointer-events:auto}
.pmo-fly h5{margin:2px 6px 6px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;opacity:.75;display:flex;align-items:center;gap:6px}
.pmo-fly button{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:0;border-radius:8px;background:transparent;color:inherit;font-family:inherit;font-size:13.5px;font-weight:500;text-align:left;cursor:pointer;min-height:0}
.pmo-fly button:hover,.pmo-fly button:focus-visible{background:rgba(255,255,255,.12);outline:none}
.pmo-fly button.on{background:var(--pmo-side-act,#1f6db3);color:#fff;font-weight:600}
.pmo-fly .dot{width:8px;height:8px;border-radius:50%;flex:none}
html[data-theme="dark"] .pmo-fly{background:#1b2c3e}
@media (prefers-reduced-motion:reduce){.pmo-fly{transition:none}}
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

  /* ---------- menu melayang saat sidebar diciutkan ---------- */
  var fly=null,flyT=0,flyGrp=null;
  function collapsed(){var a=document.querySelector('.app');return !!(a&&a.classList.contains('collapsed'))&&innerWidth>760}
  function grpItems(w){
    var out=[],seen={};
    w.querySelectorAll('button.nav,.pmo-epc-pill').forEach(function(b){
      if(b.closest('#subNav'))return;
      if(b.classList.contains('pmo-epc-main')&&w.querySelector('.pmo-epc-sub,.pmo-epc-pill'))return;
      if(b.hidden||b.style.display==='none'||b.closest('[hidden]'))return;
      var sp=b.querySelector('span');var t=String((sp&&sp.textContent)||b.getAttribute('title')||b.textContent||'').replace(/\s+/g,' ').trim();
      if(!t||seen[t])return;seen[t]=1;
      var dot=b.querySelector('.dot');out.push({b:b,t:t,on:b.classList.contains('active')||b.classList.contains('on'),dot:dot?getComputedStyle(dot).backgroundColor:''});
    });
    return out;
  }
  function flyShow(w){
    if(!collapsed())return;
    var id=w.getAttribute('data-mod-grp');if(id==='isi')return;
    var L=grpItems(w);if(!L.length)return;
    if(!fly){fly=document.createElement('div');fly.className='pmo-fly';fly.setAttribute('role','menu');document.body.appendChild(fly);
      fly.addEventListener('mouseenter',function(){clearTimeout(flyT)});fly.addEventListener('mouseleave',flyHideSoon);
      fly.addEventListener('keydown',function(e){if(e.key==='Escape'){flyHide();if(flyGrp){var f=flyGrp.querySelector('button.nav');if(f)f.focus()}}});
      fly.addEventListener('click',function(e){var x=e.target.closest('[data-fi]');if(!x||!fly.__items)return;var it=fly.__items[+x.getAttribute('data-fi')];flyHide();if(it)it.b.click()});}
    clearTimeout(flyT);flyGrp=w;fly.__items=L;
    fly.innerHTML='<h5>'+esc(TAG[id]||'')+' '+esc(GRP[id]||'')+'</h5>'+L.map(function(x,i){return '<button type="button" role="menuitem" data-fi="'+i+'" class="'+(x.on?'on':'')+'">'+(x.dot?'<i class="dot" style="background:'+x.dot+'"></i>':'')+esc(x.t)+'</button>'}).join('');
    var side=document.querySelector('aside.side').getBoundingClientRect(),r=w.getBoundingClientRect();
    fly.style.left=Math.round(side.right+8)+'px';fly.classList.add('on');
    var h=fly.offsetHeight;fly.style.top=Math.max(8,Math.min(Math.round(r.top),innerHeight-h-8))+'px';
  }
  function flyHide(){clearTimeout(flyT);if(fly)fly.classList.remove('on');flyGrp=null}
  function flyHideSoon(){clearTimeout(flyT);flyT=setTimeout(flyHide,220)}
  function bindFly(){
    var side=document.querySelector('aside.side');if(!side||side.__pmoFly)return;side.__pmoFly=true;
    side.addEventListener('mouseover',function(e){var w=e.target.closest('.pmo-mgrp');if(!w){return}if(w!==flyGrp||!fly||!fly.classList.contains('on'))flyShow(w);else clearTimeout(flyT)});
    side.addEventListener('mouseleave',flyHideSoon);
    side.addEventListener('focusin',function(e){var w=e.target.closest('.pmo-mgrp');if(w&&collapsed())flyShow(w)});
    side.addEventListener('focusout',function(e){if(!fly||!fly.contains(e.relatedTarget))flyHideSoon()});
    side.addEventListener('keydown',function(e){if(e.key==='ArrowRight'&&fly&&fly.classList.contains('on')){var f=fly.querySelector('button');if(f){e.preventDefault();f.focus()}}});
    document.addEventListener('click',function(e){if(fly&&!fly.contains(e.target)&&!side.contains(e.target))flyHide()});
    window.addEventListener('scroll',flyHide,{passive:true});
  }

  /* ---------- daftar halaman untuk pencarian Ctrl K ---------- */
  function role(){var r='';try{var u=JSON.parse(sessionStorage.getItem('pmoUser')||'null');r=u&&u.role||''}catch(e){}return String(r||'').trim().toUpperCase()}
  function navPages(){
    var r=role(),ktr=r==='KONTRAKTOR',mrB=document.querySelector('aside.side [data-mr]'),mr=['ADMIN','INPUT','PIC'].indexOf(r)>=0||!!(mrB&&!mrB.hidden&&mrB.style.display!=='none'),inp=['ADMIN','INPUT','PIC'].indexOf(r)>=0||mr,out=[];
    function g(gn,list){list.forEach(function(x){out.push({name:x[1],route:x[0],grp:gn,kw:x[2]||''})})}
    if(!ktr)g('Dashboard Proyek',[['portal','Portal','beranda ringkasan'],['executive','Executive Dashboard','eksekutif direksi'],['master','Master Schedule','jadwal baseline'],['weekly','Weekly Progress','mingguan']]);
    else g('Dashboard Proyek',[['portal','Portal','beranda ringkasan']]);
    g('EPCC Control',[['engineering','Engineering','dokumen ifr ifa ifc'],['epcc&field=PROC','Procurement','pengadaan po material'],['epcc&field=CONS','Construction','konstruksi fisik lapangan'],['epcc&field=COM','Commissioning','komisioning uji']]);
    if(!ktr)g('Dokumen & Lapangan',[['documents','Document Control','dokumen kontrak'],['library','Library & Knowledge','pedoman prosedur'],['live','Live View','cctv kamera']]);
    if(!ktr&&mr)g('Pelaporan Manajemen',[['report','Management Report · Pelaporan Manajemen','presentasi bulanan'],['weeklyprint','Buat Laporan Weekly','cetak pdf excel'],['monthlydoc','Buat Laporan Bulanan','word']]);
    if(!ktr&&inp)g('Input & Data Proyek',[['input','Input Progress','isi mingguan'],['monthly','Laporan Bulanan','isian bulanan'],['project','Tambah / Edit Proyek','proyek baru']]);
    return out;
  }
  window.pmoNavExtra=function(add,used){
    navPages().forEach(function(x){
      add(x.name,'Halaman · '+x.grp,document.body,function(){go(x.route)},x.name,x.kw);
      used['Modul|'+x.name.toLowerCase()]=1;
    });
    isiBtns().forEach(function(b){var sp=b.querySelector('span');var t=String((sp&&sp.textContent)||b.textContent||'').trim();if(t)add(t,'Isi halaman ini',b,function(){b.click()},t)});
  };

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
    return Array.prototype.slice.call(w.querySelectorAll('button.nav')).filter(function(b){return !b.hidden&&b.style.display!=='none'});
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
        var t=e.target.closest('[data-epc]');
        if(t){var code=t.getAttribute('data-epc');var own=document.querySelector('aside.side .nav[data-field="'+code+'"]');
          if(own&&page==='epcc'){own.click();try{var u=new URL(location.href);u.searchParams.set('field',code);history.replaceState(history.state,'',u.toString())}catch(x){}setTimeout(render,60)}else{EPC.forEach(function(x){if(x[0]===code)go(x[2])})}return}
        var c=e.target.closest('[data-isi]');
        if(c){var b=isiBtns()[+c.getAttribute('data-isi')];if(b){b.click();setTimeout(render,80)}}
      });
    }
    render();return true;
  }
  var lastHtml='';
  function render(){
    if(!bar)return;
    var info=activeInfo(),h='';
    var crumb=info.g&&GRP[info.g]?'<span class="pmo-crumb"><span>'+esc(GRP[info.g])+'</span>'+(info.name?'<span class="sep">›</span><b>'+esc(info.name)+'</b>':'')+'</span>':'';
    var L=isiBtns();
    var chips=L.length?'<span class="pmo-chips" role="list">'+L.map(function(b,i){var on=b.classList.contains('on')||b.classList.contains('active')||b.getAttribute('aria-current')==='true';var sp=b.querySelector('span');return '<button type="button" role="listitem" class="pmo-chip'+(on?' on':'')+'" data-isi="'+i+'"'+(on?' aria-current="true"':'')+'>'+esc(String((sp&&sp.textContent)||b.textContent||'').trim())+'</button>'}).join('')+'</span>':'';
    if(isEpc()){
      var cur=epcCur();
      h='<div class="pmo-pbar-r">'+crumb+'<nav class="pmo-tabs" aria-label="EPCC Control">'+EPC.map(function(x){var on=x[0]===cur;return '<button type="button" class="pmo-tab'+(on?' on':'')+'" data-epc="'+x[0]+'"'+(on?' aria-current="page"':'')+'><i class="dot" style="background:'+x[3]+'"></i>'+x[1]+'</button>'}).join('')+'</nav></div>';
      if(chips)h+='<div class="pmo-pbar-r pmo-r-isi"><span class="pmo-isi-l">Isi halaman</span>'+chips+'</div>';
    }else{
      if(!crumb&&!chips){bar.hidden=true;return}
      h='<div class="pmo-pbar-r'+(crumb?'':' pmo-r-isi')+'">'+crumb+(chips?'<span class="pmo-chips" style="margin-left:auto"><span class="pmo-isi-l">Isi halaman</span></span>'+chips:'')+'</div>';
    }
    bar.hidden=false;bar.classList.toggle('is-epc',isEpc());
    if(h!==lastHtml){bar.innerHTML=h;lastHtml=h}
    place();
  }
  function place(){
    if(!bar||!hdr)return;var cs=getComputedStyle(hdr);
    bar.style.top=(cs.position==='sticky'||cs.position==='fixed')?hdr.offsetHeight+'px':'0px';
  }
  var q=0;function queue(){if(!q)q=setTimeout(function(){q=0;render();addPicker()},120)}
  function init(){
    addPicker();
    var tries=0;(function wait(){if(document.querySelector('aside.side nav[data-pmo-modular="1"]')||tries>40){build();bindFly();
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

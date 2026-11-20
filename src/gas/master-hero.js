'use strict';

/**
 * Master Schedule (Desktop) · Unified Hero Banner (Alternatif B), disamakan dengan tema
 * Monthly Executive Review & Weekly Progress.
 * - Kontrol topbar (#cpTabs Monitoring EPCC/Jadwal CPM, pemilih proyek, week realisasi,
 *   Cari Ctrl K, Notifikasi, Tema, Akun) menyatu ke dalam banner .hero, lalu berpindah halus
 *   ke #exStuckHost saat halaman digulir melewati banner bersama dropdown "Isi halaman".
 * - Menghilangkan judul ganda dan badge "Hanya baca · data otomatis" sesuai permintaan pengguna.
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
html.ex-hero-hdr :is(.hero,#exStuckHost):has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden]),.pmo-isi-drop.open,.pmo-isi-drop:hover,.pmo-isi-drop:focus-within,.ms-proj-wrap.open,.ms-week-wrap.open){z-index:150!important}

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
html.ex-hero-hdr .hero>div:not(#exHeroSpacer):not(#exPbarSpacer):not(.pmo-pbar){grid-column:1;grid-row:2;position:relative;min-width:0;z-index:5}
html.ex-hero-hdr .hero header.top .t{display:none!important}

/* Switcher Monitoring EPCC | Jadwal CPM menyatu tunggal di baris atas Hero */
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
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top :is(.ntf-wrap,.account-wrap,.acm-wrap,.ms-proj-wrap,.ms-week-wrap){position:relative;z-index:25}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top :is(.ntf-wrap,.account-wrap,.acm-wrap,.ms-proj-wrap,.ms-week-wrap):has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden]),.ms-pop:not([hidden])){z-index:55}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top :is(.pop,.acm-pop,.ntf-pop,.ms-pop){background:var(--card,#fff);color:var(--ink,#132b43);z-index:160!important}

/* Dorong sisi kanan setelah #cpTabs / .t */
html.ex-hero-hdr .hero header.top .ms-top-sp{flex:1;min-width:8px}
html.ex-hero-hdr #exStuckHost header.top .ms-top-sp{display:none}
html.ex-hero-hdr #exStuckHost .ms-proj-wrap{display:none!important}
.ms-proj-wrap,.ms-week-wrap{display:none}
html.ex-hero-hdr .hero header.top .ms-proj-wrap,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.top .ms-week-wrap{display:inline-flex;align-items:center}
.ms-gl-btn{
  display:inline-flex;align-items:center;gap:8px;padding:0 12px;border-radius:11px;
  font:600 12.5px/1.2 inherit;cursor:pointer;max-width:250px;
}
.ms-gl-btn .ms-pl{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:rgba(219,234,254,.82);display:block;line-height:1}
.ms-gl-btn .ms-pn{display:block;font-size:12.5px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:165px;text-align:left}
.ms-gl-btn svg{width:14px;height:14px;flex:none;opacity:.88}
.ms-gl-btn.single svg.ms-chev{display:none}
.ms-pop{
  position:absolute;left:0;top:calc(100% + 8px);width:min(320px,calc(100vw - 48px));
  border:1px solid var(--line,#dce5ed);border-radius:14px;
  box-shadow:0 18px 42px rgba(5,15,30,.28);padding:10px;
}
.ms-week-wrap .ms-pop{left:auto;right:0}
.ms-pop[hidden]{display:none!important}
.ms-pop-q{
  width:100%;height:34px;padding:0 10px;margin-bottom:8px;
  border:1px solid var(--line,#dce5ed);border-radius:8px;background:var(--tint,#f4f8fc);
  color:var(--ink,#132b43);font:inherit;font-size:12.5px;
}
.ms-pop-list{max-height:280px;overflow-y:auto;display:grid;gap:2px}
.ms-pop-opt{
  display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;
  padding:8px 10px;border:0;border-radius:8px;background:transparent;
  color:var(--ink,#132b43);font:500 12.5px/1.3 inherit;text-align:left;cursor:pointer;
}
.ms-pop-opt:hover{background:var(--tint,#f4f8fc);color:var(--pri-ink,#0f5fa8)}
.ms-pop-opt.on{background:var(--soft,#e8f3fb);color:var(--pri-ink,#0f5fa8);font-weight:700}
.ms-pop-opt span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* Tipografi & pills Baris 2 Hero */
html.ex-hero-hdr #desk>.hero .ey{display:inline-block;font-size:12.5px;font-weight:600;letter-spacing:0;text-transform:none;color:#c3e4f7!important}
.ms-hero-ey{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px}
.ms-hero-pill{
  display:inline-flex;align-items:center;padding:2px 9px;border-radius:99px;
  font-size:11px;font-weight:700;letter-spacing:.02em;
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

@media (max-width:1420px){
  html.ex-hero-hdr #exStuckHost .ms-week-wrap{display:none!important}
}
@media (max-width:1260px){
  html.ex-hero-hdr #exStuckHost header.top .acm-chip{max-width:170px}
  html.ex-hero-hdr #exStuckHost header.top .pmo-qs-trigger kbd{display:none!important}
}
@media (max-width:1060px){
  html.ex-hero-hdr #exStuckHost header.top{padding:10px 16px!important;gap:6px}
  html.ex-hero-hdr #exStuckHost .pmo-isi-trig .pmo-isi-l{display:none}
}
@media (prefers-reduced-motion:reduce){
  #exStuckHost,html.ex-hero-hdr :is(.hero,#exStuckHost) #cpTabs button{transition:none!important}
}
</style>`;

const MASTER_HERO_JS = String.raw`<script id="pmoMasterHeroJs">
(function(){
  if(window.__pmoMasterHeroInit)return;window.__pmoMasterHeroInit=true;
  var stuckTimer=0,syncRaf=0,metaRaf=0;

  function deskEl(){return document.getElementById('desk')}
  function heroEl(){return document.querySelector('#desk>.hero')}

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
        +'<div class="ms-pop" id="msProjPop" hidden>'
        +'<input type="search" class="ms-pop-q" id="msProjSearch" placeholder="Cari proyek…" aria-label="Cari proyek">'
        +'<div class="ms-pop-list" id="msProjList"></div>'
        +'</div>';
      var anchor=hdr.querySelector('.pmo-qs-trigger,.ntf-wrap,#themeBtn');
      if(anchor)hdr.insertBefore(pw,anchor);else hdr.appendChild(pw);

      var btn=document.getElementById('msProjBtn'),pop=document.getElementById('msProjPop'),qInp=document.getElementById('msProjSearch');
      btn.addEventListener('click',function(ev){
        ev.stopPropagation();
        var sel=document.getElementById('project');
        if(!sel||sel.options.length<2)return;
        closeMenus('proj');
        syncProjMenu();
        var open=pop.hidden;
        pop.hidden=!open;
        pw.classList.toggle('open',open);
        btn.setAttribute('aria-expanded',String(open));
        if(open){qInp.value='';filterProj('');setTimeout(function(){qInp.focus()},10)}
      });
      pop.addEventListener('click',function(ev){ev.stopPropagation()});
      qInp.addEventListener('input',function(){filterProj(qInp.value)});
    }
    if(!document.getElementById('msWeekWrap')){
      var ww=document.createElement('div');
      ww.id='msWeekWrap';
      ww.className='pop-wrap ms-week-wrap';
      ww.innerHTML='<button type="button" class="ms-gl-btn" id="msWeekBtn" aria-haspopup="true" aria-expanded="false">'
        +'<span><span class="ms-pl">Week realisasi</span><span class="ms-pn" id="msWeekBtnName">—</span></span>'
        +'<svg class="ms-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
        +'</button>'
        +'<div class="ms-pop" id="msWeekPop" hidden><div class="ms-pop-list" id="msWeekList"></div></div>';
      var anchor2=hdr.querySelector('.pmo-qs-trigger,.ntf-wrap,#themeBtn');
      if(anchor2)hdr.insertBefore(ww,anchor2);else hdr.appendChild(ww);

      var wbtn=document.getElementById('msWeekBtn'),wpop=document.getElementById('msWeekPop');
      wbtn.addEventListener('click',function(ev){
        ev.stopPropagation();
        var wsel=document.getElementById('week');
        if(!wsel||wsel.disabled||!wsel.options.length)return;
        closeMenus('week');
        syncWeekMenu();
        var open=wpop.hidden;
        wpop.hidden=!open;
        ww.classList.toggle('open',open);
        wbtn.setAttribute('aria-expanded',String(open));
      });
      wpop.addEventListener('click',function(ev){ev.stopPropagation()});
    }
    if(!window.__msHeroCloseBound){
      window.__msHeroCloseBound=true;
      document.addEventListener('click',function(){closeMenus()});
      document.addEventListener('keydown',function(ev){if(ev.key==='Escape')closeMenus()});
    }
  }

  function closeMenus(except){
    if(except!=='proj'){
      var pw=document.getElementById('msProjWrap'),p=document.getElementById('msProjPop'),b=document.getElementById('msProjBtn');
      if(p)p.hidden=true;if(pw)pw.classList.remove('open');if(b)b.setAttribute('aria-expanded','false');
    }
    if(except!=='week'){
      var ww=document.getElementById('msWeekWrap'),wp=document.getElementById('msWeekPop'),wb=document.getElementById('msWeekBtn');
      if(wp)wp.hidden=true;if(ww)ww.classList.remove('open');if(wb)wb.setAttribute('aria-expanded','false');
    }
  }

  function filterProj(val){
    var q=String(val||'').trim().toLocaleLowerCase('id');
    document.querySelectorAll('#msProjList .ms-pop-opt').forEach(function(b){
      b.hidden=!!(q&&String(b.textContent||'').toLocaleLowerCase('id').indexOf(q)<0);
    });
  }

  function syncProjMenu(){
    var sel=document.getElementById('project'),list=document.getElementById('msProjList'),btn=document.getElementById('msProjBtn'),lbl=document.getElementById('msProjBtnName');
    if(!sel||!lbl)return;
    var opts=Array.prototype.slice.call(sel.options||[]);
    var curOpt=opts.find(function(o){return o.selected})||opts[0];
    var pname=(curOpt&&curOpt.textContent)||'—';
    lbl.textContent=pname;
    if(btn)btn.classList.toggle('single',opts.length<2);
    if(!list)return;
    list.innerHTML='';
    opts.forEach(function(o){
      var b=document.createElement('button');
      b.type='button';
      b.className='ms-pop-opt'+(o.selected?' on':'');
      b.innerHTML='<span>'+String(o.textContent||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})+'</span>';
      b.onclick=function(){
        closeMenus();
        if(sel.value!==o.value){
          sel.value=o.value;
          sel.dispatchEvent(new Event('change',{bubbles:true}));
        }
      };
      list.appendChild(b);
    });
  }

  function syncWeekMenu(){
    var wsel=document.getElementById('week'),list=document.getElementById('msWeekList'),btn=document.getElementById('msWeekBtn'),lbl=document.getElementById('msWeekBtnName');
    if(!wsel||!lbl)return;
    var opts=Array.prototype.slice.call(wsel.options||[]);
    var curOpt=opts.find(function(o){return o.selected})||opts[0];
    var full=(curOpt&&curOpt.textContent)||'—';
    var shortTxt=/^(W\d+)\s*·\s*(?:[^–]+–\s*)?(.+)$/.exec(full);
    lbl.textContent=shortTxt?(shortTxt[1]+' · '+shortTxt[2].trim()):full;
    if(btn)btn.classList.toggle('single',wsel.disabled||opts.length<2);
    if(!list)return;
    list.innerHTML='';
    opts.forEach(function(o){
      var b=document.createElement('button');
      b.type='button';
      b.className='ms-pop-opt'+(o.selected?' on':'');
      b.innerHTML='<span>'+String(o.textContent||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})+'</span>';
      b.onclick=function(){
        closeMenus();
        if(wsel.value!==o.value){
          wsel.value=o.value;
          wsel.dispatchEvent(new Event('change',{bubbles:true}));
        }
      };
      list.appendChild(b);
    });
  }

  function syncHeroMeta(){
    var hero=heroEl();if(!hero)return;
    var txtWrap=hero.querySelector('div:not(#exHeroSpacer):not(#exPbarSpacer):not(.pmo-pbar)');
    if(!txtWrap)return;
    var h1=txtWrap.querySelector('h1'),ey=txtWrap.querySelector('.ey'),sub=txtWrap.querySelector('p');
    var pn='';
    if(typeof MS!=='undefined'&&MS.data&&MS.data.project&&MS.data.project.name)pn=MS.data.project.name;
    else{var sel=document.getElementById('project');if(sel&&sel.selectedOptions&&sel.selectedOptions[0])pn=sel.selectedOptions[0].textContent||''}
    if(!pn||/Memuat/i.test(pn)){var pt=document.getElementById('projTitle');if(pt&&pt.textContent)pn=pt.textContent.replace(/^Master Schedule\s*·\s*/i,'').trim()}
    if(h1){
      var wantProj=pn&&!/Master Schedule/i.test(pn)?pn:'';
      var nextHtml=wantProj?'Master Schedule — <span>'+wantProj.replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})+'</span>':'Master Schedule';
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
      var wlbl=document.getElementById('msWeekBtnName');
      var wTxt=wlbl&&wlbl.textContent&&wlbl.textContent!=='—'&&!/Memuat/i.test(wlbl.textContent)?wlbl.textContent:'';
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
    syncWeekMenu();
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

  ['summary','project','week'].forEach(function(id){
    var el=document.getElementById(id);
    if(el&&window.MutationObserver)new MutationObserver(schedMeta).observe(el,{childList:true,subtree:true});
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

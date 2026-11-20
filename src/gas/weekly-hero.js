'use strict';

/**
 * Weekly Progress (Desktop) · Tata letak Unified Hero Banner menyerupai Monthly Executive Review.
 * Kontrol header (.weekpick, Presentasi, Notifikasi, Cari, Akun, serta pemilih proyek cepat) menyatu ke dalam
 * banner .hero di bagian atas, lalu berpindah halus ke #exStuckHost saat halaman digulir melewati banner
 * dengan "Isi halaman" di sebelah kiri pemilih week.
 *
 * Mobile (lebar <= 900px atau html.m-mode) tidak disentuh agar menu & dok satu tangan tetap seperti semula.
 */

const WEEKLY_HERO_CSS = String.raw`<style id="pmoWeeklyHeroCss">
/* Tema bar sticky mengikuti aksen & mode gelap (identik dengan Monthly Executive Review) */
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

html.ex-hero-hdr .content{padding-top:14px!important}
html.ex-hero-hdr #sec-ringkasan>.hero{
  position:relative;overflow:visible!important;z-index:34;
  display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;
  align-items:end;column-gap:16px;padding:12px 24px 20px;min-height:156px;border-radius:var(--r,14px);
}
html.ex-hero-hdr :is(.hero,#exStuckHost):has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden]),.pmo-isi-drop.open,.pmo-isi-drop:hover,.pmo-isi-drop:focus-within,.wk-proj-wrap.open){z-index:150!important}
html.ex-hero-hdr .hero::before{border-radius:inherit;overflow:hidden;box-shadow:inset 0 72px 58px -28px rgba(0,0,0,.44)}
#exHeroSpacer{display:none;grid-column:1 / -1;grid-row:1;flex:none}
#exPbarSpacer{display:none;flex:none}
html.ex-hero-hdr.ex-hdr-mounted #exHeroSpacer{display:block}
html.ex-hero-hdr.ex-pbar-mounted #exPbarSpacer{display:block}

/* Header topbar & kontrol frosted glass di dalam .hero maupun #exStuckHost */
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar{
  position:relative!important;top:auto!important;z-index:40!important;
  background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  border-bottom:1px solid rgba(255,255,255,.16)!important;gap:8px;flex-wrap:wrap;
}
html.ex-hero-hdr .hero>header.topbar{grid-column:1 / -1;grid-row:1;padding:0 0 10px 0!important;margin:0 0 12px 0!important}
html.ex-hero-hdr .hero>div:not(#exHeroSpacer):not(#exPbarSpacer):not(.pmo-pbar){grid-column:1;grid-row:2;min-width:0;z-index:5}
html.ex-hero-hdr .hero header.topbar .crumbs{display:none!important}
html.ex-hero-hdr .hero header.topbar .weekpick{margin-left:auto}

html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .weekpick{
  height:38px;display:inline-flex;align-items:center;
  background:rgba(255,255,255,.12)!important;border:1px solid rgba(255,255,255,.28)!important;
  color:#fff!important;border-radius:11px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);overflow:hidden;
}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .weekpick .wbtn{width:34px;height:36px;color:rgba(255,255,255,.9)!important}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .weekpick .wbtn:hover:not(:disabled){background:rgba(255,255,255,.16)!important;color:#fff!important}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .weekpick select{
  height:36px;border-inline:1px solid rgba(255,255,255,.22)!important;
  background:transparent!important;color:#fff!important;padding:0 12px;font-weight:700;min-width:110px;cursor:pointer;
}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .weekpick select option{background:var(--card,#fff);color:var(--ink,#132b43)}

html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .pp-btn,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .ntf-wrap>button,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .pmo-qs-trigger,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .userchip,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .acm-chip,
html.ex-hero-hdr .hero header.topbar .wk-proj-btn{
  height:38px;background:rgba(255,255,255,.12)!important;border:1px solid rgba(255,255,255,.28)!important;
  color:#fff!important;box-shadow:none!important;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .pp-btn:hover,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .ntf-wrap>button:hover,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .pmo-qs-trigger:hover,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .userchip:hover,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .acm-chip:hover,
html.ex-hero-hdr .hero header.topbar .wk-proj-btn:hover{background:rgba(255,255,255,.22)!important}

html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .userchip .ut b,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .userchip .ut small,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .userchip .caretic,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .acm-chip .acm-t b,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .acm-chip .acm-t small,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .acm-chip .acm-caret,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .pmo-qs-trigger *,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .pp-btn *,
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .ntf-wrap>button svg{color:#fff!important}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar .pmo-qs-trigger kbd{background:rgba(255,255,255,.16)!important;border-color:rgba(255,255,255,.32)!important;color:#fff!important}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar :is(.ntf-wrap,.account-wrap,.wk-proj-wrap){position:relative;z-index:25}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar :is(.ntf-wrap,.account-wrap,.wk-proj-wrap):has(.pop:not([hidden]),.acm-pop:not([hidden]),.ntf-pop:not([hidden]),.wk-proj-pop:not([hidden])){z-index:55}
html.ex-hero-hdr :is(.hero,#exStuckHost) header.topbar :is(.pop,.acm-pop,.ntf-pop,.wk-proj-pop){background:var(--card,#fff);color:var(--ink,#132b43);z-index:160!important}

/* Pemilih proyek cepat di topbar hero (disembunyikan di mobile & di sticky bar) */
.wk-proj-wrap{display:none}
html.ex-hero-hdr .hero header.topbar .wk-proj-wrap{display:inline-flex;align-items:center}
html.ex-hero-hdr #exStuckHost .wk-proj-wrap{display:none!important}
.wk-proj-btn{
  display:inline-flex;align-items:center;gap:8px;padding:0 12px;border-radius:11px;
  font:600 12.5px/1.2 inherit;cursor:pointer;max-width:260px;
}
.wk-proj-btn .wk-pl{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:rgba(219,234,254,.82);display:block;line-height:1}
.wk-proj-btn .wk-pn{display:block;font-size:12.5px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:175px;text-align:left}
.wk-proj-btn svg{width:14px;height:14px;flex:none;opacity:.88}
.wk-proj-pop{
  position:absolute;left:0;top:calc(100% + 8px);width:min(320px,calc(100vw - 48px));
  border:1px solid var(--line,#dce5ed);border-radius:14px;
  box-shadow:0 18px 42px rgba(5,15,30,.28);padding:10px;
}
.wk-proj-pop[hidden]{display:none!important}
.wk-proj-q{
  width:100%;height:34px;padding:0 10px;margin-bottom:8px;
  border:1px solid var(--line,#dce5ed);border-radius:8px;background:var(--tint,#f4f8fc);
  color:var(--ink,#132b43);font:inherit;font-size:12.5px;
}
.wk-proj-list{max-height:280px;overflow-y:auto;display:grid;gap:2px}
.wk-proj-opt{
  display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;
  padding:8px 10px;border:0;border-radius:8px;background:transparent;
  color:var(--ink,#132b43);font:500 12.5px/1.3 inherit;text-align:left;cursor:pointer;
}
.wk-proj-opt:hover{background:var(--tint,#f4f8fc);color:var(--pri-ink,#0f5fa8)}
.wk-proj-opt.on{background:var(--soft,#e8f3fb);color:var(--pri-ink,#0f5fa8);font-weight:700}
.wk-proj-opt span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wk-proj-opt em{font-style:normal;font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:99px;background:var(--ok-bg,#dcf5e9);color:var(--ok,#14724f);flex:none}

/* Pill status proyek di baris eyebrow hero (desktop) */
.wk-hero-eyebrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.wk-hero-pill{
  display:inline-flex;align-items:center;padding:2px 9px;border-radius:99px;
  font-size:11px;font-weight:700;letter-spacing:.02em;
  background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.28);color:#e0f2fe;
}
.wk-hero-pill.done{background:rgba(79,209,160,.22);border-color:rgba(110,231,183,.45);color:#a7f3d0}
.wk-hero-pill.late{background:rgba(245,158,11,.24);border-color:rgba(252,211,77,.45);color:#fde68a}
html:not(.ex-hero-hdr) .wk-hero-pill{display:none}

/* Isi Halaman frosted glass dropdown di pojok kanan bawah hero -> pindah ke kiri .weekpick saat scroll */
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
html.ex-hero-hdr .anchor{scroll-margin-top:82px!important}

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
html.ex-hero-hdr #exStuckHost header.topbar{margin:0!important;padding:12px 24px!important;min-height:62px;border-bottom:0!important;gap:8px;flex-wrap:nowrap;align-items:center}
#exStuckHost header.topbar .crumbs{display:block!important;min-width:110px;flex:1 1 130px;overflow:hidden}
#exStuckHost header.topbar .crumbs small{color:rgba(255,255,255,.74);font-size:11px;display:block;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#exStuckHost header.topbar .crumbs h2{color:#fff;font-size:15.5px;margin:0;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#exStuckHost header.topbar .crumbs h2 .wk-sc-p{color:#6fdaf7;font-weight:800}
#exStuckHost .pmo-isi-menu{background:var(--ex-stuck-menu)!important;border:1px solid rgba(255,255,255,.18)!important;box-shadow:0 18px 40px rgba(0,0,0,.44);z-index:160!important}
#exStuckHost .pmo-isi-menu .pmo-chip{color:rgba(255,255,255,.9)!important}
#exStuckHost .pmo-isi-menu .pmo-chip:hover{background:rgba(255,255,255,.12)!important;color:#fff!important}
#exStuckHost .pmo-isi-menu .pmo-chip.on{background:var(--ex-stuck-act)!important;color:#fff!important}

@media (max-width:1240px){
  html.ex-hero-hdr #exStuckHost header.topbar .userchip,
  html.ex-hero-hdr #exStuckHost header.topbar .acm-chip{max-width:175px}
  html.ex-hero-hdr #exStuckHost header.topbar .pmo-qs-trigger kbd{display:none!important}
}
@media (max-width:1060px){
  html.ex-hero-hdr #exStuckHost header.topbar{padding:11px 16px!important;gap:6px}
  html.ex-hero-hdr #exStuckHost .pmo-isi-trig .pmo-isi-l{display:none}
}

/* 4 KPI card tetap satu baris di desktop/laptop sebelum turun jadi 2x2 di layar sempit */
html.ex-hero-hdr #sec-ringkasan .kpis{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px}
html.ex-hero-hdr #sec-ringkasan .kpi{padding:14px 16px;gap:12px}
html.ex-hero-hdr #sec-ringkasan .kpi .val{font-size:24px}
@container content (max-width:640px){html.ex-hero-hdr #sec-ringkasan .kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container content (max-width:440px){html.ex-hero-hdr #sec-ringkasan .kpis{grid-template-columns:minmax(0,1fr)}}

/* Jangan tampilkan kontrol topbar/sticky saat Mode Presentasi */
html.pp-open #exStuckHost,
.pp .hero>header.topbar,
.pp .hero>.pmo-pbar,
.pp #exHeroSpacer,
.pp .wk-hero-pill{display:none!important}
</style>`;

const WEEKLY_HERO_JS = String.raw`<script id="pmoWeeklyHeroJs">
(function(){
  if(window.__pmoWeeklyHeroInit)return;window.__pmoWeeklyHeroInit=true;
  var stuckTimer=0;

  function heroEl(){
    return document.querySelector('#sec-ringkasan>.hero')||document.querySelector('.content .hero');
  }

  function ensureProjectPicker(hdr){
    if(!hdr||document.getElementById('wkProjWrap'))return;
    var wrap=document.createElement('div');
    wrap.className='wk-proj-wrap';
    wrap.id='wkProjWrap';
    wrap.innerHTML='<button type="button" class="wk-proj-btn" id="wkProjBtn" aria-haspopup="true" aria-expanded="false">'
      +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6"/></svg>'
      +'<span><span class="wk-pl">Proyek aktif</span><span class="wk-pn" id="wkProjBtnName">DERMAGA A</span></span>'
      +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
      +'</button>'
      +'<div class="wk-proj-pop" id="wkProjPop" hidden>'
      +'<input type="search" class="wk-proj-q" id="wkProjSearch" placeholder="Cari proyek…" aria-label="Cari proyek">'
      +'<div class="wk-proj-list" id="wkProjList"></div>'
      +'</div>';
    var wp=hdr.querySelector('.weekpick');
    if(wp)hdr.insertBefore(wrap,wp);
    else hdr.appendChild(wrap);

    var btn=document.getElementById('wkProjBtn');
    var pop=document.getElementById('wkProjPop');
    var qInp=document.getElementById('wkProjSearch');
    function closeProjPop(){
      pop.hidden=true;
      wrap.classList.remove('open');
      btn.setAttribute('aria-expanded','false');
    }
    btn.addEventListener('click',function(ev){
      ev.stopPropagation();
      var open=pop.hidden;
      if(typeof closeAccountMenu==='function')closeAccountMenu();
      syncProjectList();
      pop.hidden=!open;
      wrap.classList.toggle('open',open);
      btn.setAttribute('aria-expanded',String(open));
      if(open){qInp.value='';filterPop('');setTimeout(function(){qInp.focus()},10)}
    });
    pop.addEventListener('click',function(ev){ev.stopPropagation()});
    qInp.addEventListener('input',function(){filterPop(qInp.value)});
    document.addEventListener('click',function(ev){if(!wrap.contains(ev.target))closeProjPop()});
    document.addEventListener('keydown',function(ev){if(ev.key==='Escape')closeProjPop()});

    function filterPop(val){
      var q=String(val||'').trim().toLocaleLowerCase('id');
      document.querySelectorAll('#wkProjList .wk-proj-opt').forEach(function(o){
        o.hidden=!(o.getAttribute('data-q')||o.textContent).toLocaleLowerCase('id').includes(q);
      });
    }
    window.__wkCloseProjPop=closeProjPop;
  }

  function syncProjectList(){
    var listEl=document.getElementById('wkProjList');
    if(!listEl)return;
    var items=Array.prototype.slice.call(document.querySelectorAll('#projectNav .project-item'));
    if(!items.length){
      listEl.innerHTML='<div style="padding:8px 10px;font-size:12px;color:var(--muted)">Memuat daftar proyek…</div>';
      return;
    }
    listEl.innerHTML='';
    items.forEach(function(src){
      var name=src.getAttribute('data-project')||'';
      var title=src.getAttribute('title')||name;
      var tag=src.querySelector('.tag');
      var on=src.classList.contains('active');
      var b=document.createElement('button');
      b.type='button';
      b.className='wk-proj-opt'+(on?' on':'');
      b.setAttribute('data-q',title+' '+name);
      var sp=document.createElement('span');
      sp.textContent=name;
      b.appendChild(sp);
      if(tag){
        var em=document.createElement('em');
        em.textContent=tag.textContent;
        b.appendChild(em);
      }
      b.onclick=function(){
        if(window.__wkCloseProjPop)window.__wkCloseProjPop();
        if(typeof switchProject==='function')switchProject(name);
      };
      listEl.appendChild(b);
    });
  }

  function syncHeroMeta(){
    var pnEl=document.getElementById('weeklyProjectName');
    var pnText=String((pnEl&&pnEl.textContent)||'').trim();
    var btnNm=document.getElementById('wkProjBtnName');
    if(btnNm&&pnText)btnNm.textContent=pnText;

    // Tambahkan nama proyek aktif ke .crumbs untuk bar sticky (disembunyikan saat di banner atas)
    var crumbH2=document.querySelector('header.topbar .crumbs h2');
    if(crumbH2&&pnText){
      var sc=crumbH2.querySelector('.wk-sc-p');
      if(!sc){
        sc=document.createElement('span');
        sc.className='wk-sc-p';
        crumbH2.appendChild(document.createTextNode(' · '));
        crumbH2.appendChild(sc);
      }
      sc.textContent=pnText;
    }

    // Pill status proyek di eyebrow hero, sinkron dari #lifeBanner
    var hero=heroEl();
    var txtWrap=hero?hero.querySelector('div:not(#exHeroSpacer):not(#exPbarSpacer):not(.pmo-pbar)'):null;
    if(txtWrap){
      var sm=txtWrap.querySelector('small');
      var row=txtWrap.querySelector('.wk-hero-eyebrow');
      if(sm&&!row){
        row=document.createElement('div');
        row.className='wk-hero-eyebrow';
        sm.parentNode.insertBefore(row,sm);
        row.appendChild(sm);
      }
      if(row){
        var pill=document.getElementById('wkHeroStage');
        if(!pill){
          pill=document.createElement('span');
          pill.id='wkHeroStage';
          pill.className='wk-hero-pill';
          row.appendChild(pill);
        }
        var lb=document.getElementById('lifeBanner');
        var lbFirst=lb&&!lb.hidden&&lb.querySelector('.grow')?String(lb.querySelector('.grow').innerHTML||'').split('<br>')[0].replace(/<[^>]+>/g,'').trim():'';
        if(lb&&!lb.hidden&&lbFirst){
          pill.hidden=false;
          pill.className='wk-hero-pill'+(lb.classList.contains('done')?' done':lb.classList.contains('late')?' late':'');
          // Ambil ringkasan singkat sebelum tanda "· Lihat BAST"
          pill.textContent=lbFirst.replace(/\s*·\s*Lihat BAST.*$/i,'');
        }else{
          pill.hidden=true;
        }
      }
    }
    syncProjectList();
  }

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
    if(!pSp&&hero&&hero.parentNode){
      pSp=document.createElement('div');
      pSp.id='exPbarSpacer';
      hero.parentNode.insertBefore(pSp,hero.nextSibling);
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

  function clearStuckState(nodes){
    clearTimeout(stuckTimer);
    var H=document.documentElement;
    if(H.classList.contains('ex-hdr-stuck'))H.classList.remove('ex-hdr-stuck');
    if(H.classList.contains('ex-hdr-mounted'))H.classList.remove('ex-hdr-mounted');
    if(H.classList.contains('ex-pbar-mounted'))H.classList.remove('ex-pbar-mounted');
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
    var hero=heroEl();
    var content=document.querySelector('.main>.content');
    var mainEl=document.querySelector('.main');
    var hdr=document.querySelector('header.topbar');
    var pbar=document.getElementById('pmoPbar');
    if(!hero||!content||!mainEl||!hdr)return;
    if(content.classList.contains('wk-wait'))return;
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
        if(pbar){
          var per=hdr.querySelector('.weekpick');
          if(per){if(pbar.parentNode!==hdr||pbar.nextElementSibling!==per)hdr.insertBefore(pbar,per);}
          else if(pbar.parentNode!==hdr)hdr.appendChild(pbar);
        }
        void nodes.host.offsetHeight;
        H.classList.add('ex-hdr-stuck');
      }else if(pbar&&pbar.parentNode!==hdr){
        var per2=hdr.querySelector('.weekpick');
        if(per2)hdr.insertBefore(pbar,per2);else hdr.appendChild(pbar);
      }
    }else if(wasStuck){
      if(window.scrollY<18){
        restoreInHero(hdr,pbar,hero,nodes);
      }else{
        H.classList.remove('ex-hdr-stuck');
        clearTimeout(stuckTimer);
        stuckTimer=setTimeout(function(){
          if(!H.classList.contains('ex-hdr-stuck')&&H.classList.contains('ex-hero-hdr')){
            restoreInHero(hdr,pbar,hero,nodes);
          }
        },300);
      }
    }
  }

  var syncing=false;
  function syncUnifiedHeader(){
    if(syncing)return;
    syncing=true;
    try{
      var H=document.documentElement;
      var mob=window.innerWidth<=900||H.classList.contains('m-mode');
      var hdr=document.querySelector('header.topbar');
      var hero=heroEl();
      var content=document.querySelector('.main>.content');
      var mainEl=document.querySelector('.main');
      var pbar=document.getElementById('pmoPbar');
      var ready=!!(hdr&&hero&&content&&!content.classList.contains('wk-wait'));
      var use=!mob&&ready;
      if(H.classList.contains('ex-hero-hdr')!==use)H.classList.toggle('ex-hero-hdr',use);
      if(!hdr||!hero||!content||!mainEl)return;
      var nodes=ensureStuckNodes(hero,content,mainEl);
      if(use){
        ensureProjectPicker(hdr);
        syncHeroMeta();
        if(!H.classList.contains('ex-hdr-stuck')){
          restoreInHero(hdr,pbar,hero,nodes);
        }
        syncScrollHeader();
      }else{
        clearStuckState(nodes);
        if(hdr.parentNode!==mainEl)mainEl.insertBefore(hdr,content);
        if(pbar&&pbar.parentNode!==mainEl)mainEl.insertBefore(pbar,content);
      }
    }finally{
      syncing=false;
    }
  }

  window.addEventListener('scroll',syncScrollHeader,{passive:true});
  window.addEventListener('resize',syncUnifiedHeader,{passive:true});

  var navBtn=document.querySelector('[data-toggle-nav]');
  if(navBtn&&!navBtn.dataset.wkStuckBound){
    navBtn.dataset.wkStuckBound='1';
    navBtn.addEventListener('click',function(){setTimeout(syncStuckRect,220)});
  }
  var mainNode=document.querySelector('.main');
  if(mainNode&&window.ResizeObserver&&!window._wkMainRO){
    window._wkMainRO=new ResizeObserver(syncStuckRect);
    window._wkMainRO.observe(mainNode);
  }
  if(window.MutationObserver){
    var contentNode=document.querySelector('.main>.content');
    if(contentNode){
      var lastWait=contentNode.classList.contains('wk-wait');
      new MutationObserver(function(){
        var w=contentNode.classList.contains('wk-wait');
        if(w===lastWait)return;
        lastWait=w;
        setTimeout(syncUnifiedHeader,0);
      }).observe(contentNode,{attributes:true,attributeFilter:['class']});
    }
    var pnNode=document.getElementById('weeklyProjectName');
    if(pnNode){
      new MutationObserver(function(){syncHeroMeta()}).observe(pnNode,{childList:true,characterData:true,subtree:true});
    }
    var projNavNode=document.getElementById('projectNav');
    if(projNavNode){
      new MutationObserver(function(){syncProjectList()}).observe(projNavNode,{childList:true,subtree:true,attributes:true});
    }
    if(mainNode){
      new MutationObserver(function(){
        var mob=window.innerWidth<=900||document.documentElement.classList.contains('m-mode');
        var pbar=document.getElementById('pmoPbar');
        var ready=contentNode&&!contentNode.classList.contains('wk-wait');
        if(!mob&&ready&&pbar&&pbar.parentNode===mainNode)setTimeout(syncUnifiedHeader,0);
      }).observe(mainNode,{childList:true});
    }
  }
  if(typeof mApplyMode==='function'){
    var __origMApply=mApplyMode;
    mApplyMode=function(){
      __origMApply.apply(this,arguments);
      setTimeout(syncUnifiedHeader,0);
    };
  }

  if(typeof renderLife==='function'){
    var __origRenderLife=renderLife;
    renderLife=function(){
      __origRenderLife.apply(this,arguments);
      syncHeroMeta();
    };
  }
  if(typeof wkWait==='function'){
    var __origWkWait=wkWait;
    wkWait=function(){
      __origWkWait.apply(this,arguments);
      setTimeout(syncUnifiedHeader,0);
    };
  }

  syncUnifiedHeader();
  setTimeout(syncUnifiedHeader,150);
  setTimeout(syncUnifiedHeader,600);
})();
</script>`;

const WEEKLY_HERO_PATCHES = [
  {
    file: 'Dashboard',
    find: '</head>',
    replace: WEEKLY_HERO_CSS + '\n</head>',
  },
  {
    file: 'Dashboard',
    find: '</body>',
    replace: WEEKLY_HERO_JS + '\n</body>',
  },
];

module.exports = { WEEKLY_HERO_PATCHES };

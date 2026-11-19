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
.ex-top-split>#sec-ringkasan{position:relative;grid-column:1;grid-row:1;margin:0!important;height:var(--ex-split-h,470px);display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:rgba(100,116,139,.38) transparent;padding-bottom:18px}
.ex-top-split>#sec-ringkasan::-webkit-scrollbar{width:6px}
.ex-top-split>#sec-ringkasan::-webkit-scrollbar-track{background:transparent}
.ex-top-split>#sec-ringkasan::-webkit-scrollbar-thumb{background:rgba(100,116,139,.34);border-radius:99px}
.ex-top-split>#sec-ringkasan::-webkit-scrollbar-thumb:hover{background:var(--pri,#0f5fa8)}
.ex-top-split>#sec-ringkasan .bf-metrics,.ex-top-split>#sec-ringkasan .bf-head,.ex-top-split>#sec-ringkasan .bf-attn,.ex-top-split>#sec-ringkasan .xbn-wrap{flex-shrink:0}
.ex-brief-sbtn{position:sticky;bottom:2px;align-self:flex-end;margin-top:auto;z-index:8;display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:0 13px;border-radius:99px;border:1px solid rgba(255,255,255,.18);background:rgba(15,25,38,.88);color:#fff;font:600 11.5px/1 inherit;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,.22);flex-shrink:0;transition:opacity .2s ease,transform .2s ease,background .15s ease}
.ex-brief-sbtn:hover{background:var(--pri,#0f5fa8);border-color:var(--pri,#0f5fa8)}
.ex-brief-sbtn[hidden]{display:none!important}
.ex-top-split>#sec-story{grid-column:2;grid-row:1;margin:0!important;height:var(--ex-split-h,470px);background:var(--card,#fff);border:1px solid var(--line,#dce5ed);border-radius:var(--r,16px);padding:16px 18px;box-shadow:var(--shadow,0 4px 18px rgba(15,23,42,.06));display:flex;flex-direction:column;overflow:hidden}
.ex-top-split>#sec-story .ex-sh{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin:0 0 10px;font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted,#5b7085)}
.ex-top-split>#sec-story .ex-sh>div:first-child{min-width:0;flex:1 1 auto;overflow:hidden}
.ex-top-split>#sec-story .gl-stories{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:visible!important;gap:10px;padding:0!important}

/* Reset inside Mode Presentasi supaya slide ringkasan tidak terpotong */
.pp #sec-ringkasan{height:auto!important;overflow:visible!important;grid-column:auto;grid-row:auto;padding-bottom:0}
.pp #sec-ringkasan .ex-brief-sbtn{display:none!important}

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
  .ex-top-split>#sec-ringkasan,.ex-top-split>#sec-story{grid-column:1;grid-row:auto;height:auto!important;min-height:0;overflow:visible!important;padding-bottom:16px}
  .ex-brief-sbtn{display:none!important}
}
@media (max-width:760px){
  .ex-top-split>#sec-story,.ex-top-split>#sec-ringkasan{padding:13px 14px}
  .ex-gal-stage{height:245px;min-height:245px}
  .ex-fcard{width:136px;height:142px}
  .ex-fcard.is-focus{width:188px;height:194px}
  .ex-lb-img{height:260px}
}
html.m-mode .ex-top-split{grid-template-columns:1fr;margin-bottom:14px}
html.m-mode .ex-top-split>#sec-ringkasan,html.m-mode .ex-top-split>#sec-story{grid-column:1;grid-row:auto;height:auto!important;min-height:0;padding:13px 14px;overflow:visible!important}
html.m-mode .ex-brief-sbtn{display:none!important}
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

  /* 1. Pastikan ukuran layar awal 2-kolom full viewport di Desktop agar card KPI tidak mengintip */
  function syncBriefScroll(){
    var sec=document.getElementById('sec-ringkasan');
    if(!sec)return;
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
      sec.appendChild(btn);
    }else if(sec.lastElementChild!==btn){
      sec.appendChild(btn);
    }
    var mob=window.innerWidth<=1080||document.documentElement.classList.contains('m-mode');
    var hasMore=!mob&&sec.scrollHeight>sec.clientHeight+14;
    btn.hidden=!hasMore;
    if(hasMore){
      var atBot=sec.scrollTop+sec.clientHeight>=sec.scrollHeight-24;
      btn.textContent=atBot?'↑ Ke atas':'↓ Baca selengkapnya';
      btn.setAttribute('aria-label',atBot?'Gulir ringkasan ke atas':'Gulir ringkasan ke bawah');
    }
  }

  function fitTopSplit(){
    var split=document.getElementById('exTopSplit');
    if(!split)return;
    var mob=window.innerWidth<=1080||document.documentElement.classList.contains('m-mode');
    if(mob){
      split.style.removeProperty('--ex-split-h');
      positionCards();
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
        tm=setTimeout(function(){tm=0;syncBriefScroll();},60);
      }).observe(sec,{childList:true,subtree:true});
    }
  })();

  /* Tag #sec-story untuk tab Ringkasan di Mode HP satu tangan */
  function tagStoryMobile(){
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
  if(typeof mShowTab==='function'){
    var __origMShow=mShowTab;
    mShowTab=function(t){
      tagStoryMobile();
      __origMShow.apply(this,arguments);
      setTimeout(positionCards,30);
    };
  }

  if(document.getElementById('exStories')){
    var per=typeof currentReportData!=='undefined'&&currentReportData?currentReportData.period:'';
    refreshAndRender(per);
    setTimeout(fitTopSplit,60);
  }
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
    find: '      </section>\n      <section class="kpis" aria-label="Ringkasan status proyek">',
    replace: '      </section>\n      </div>\n      <section class="kpis" aria-label="Ringkasan status proyek">',
  },
  {
    file: 'ExecutiveDashboard',
    find: '</script></body></html>',
    replace: '</script>\n' + EXEC_STORY_BRIEF_JS + '\n</body></html>',
  },
];

module.exports = { EXEC_STORY_PATCHES };

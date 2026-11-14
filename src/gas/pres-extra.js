'use strict';

/**
 * Tambahan untuk mode presentasi bersama (legacy/AccountMenu.html → window.pmoPresent):
 * - slide sampul (pertama) dan slide "Terima Kasih" (terakhir);
 * - slide dari pustaka PDF yang disisipkan di posisi pilihan;
 * - panel "Materi tambahan" untuk mengunggah PDF dan mengatur susunan.
 * Disisipkan ke AccountMenu.html lewat HTML_PATCHES di runtime.js.
 */

const PRES_EXTRA_JS = String.raw`<script>
(function(){
  if(window.pmoPresExtra)return;
  var LOGO='https://drive.google.com/thumbnail?id=1JP0hqePxcaiFN0aZ2dv6WJ6qCNwrRLxf&sz=w480';
  var cache={key:null,items:[],settings:{},layout:{order:[],hidden:[]},canManage:false,base:[],err:'',photos:[]};
  var BULAN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'],HARI=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function api(url,opt){return fetch(url,Object.assign({credentials:'same-origin',headers:{'content-type':'application/json'}},opt||{})).then(function(r){return r.json().catch(function(){return {ok:false,error:'Server tidak merespons ('+r.status+').'}})}).then(function(j){if(!j.ok)throw new Error(j.error||'Permintaan gagal.');return j.data})}
  function normKeyPart(v){return String(v||'').trim().toUpperCase().replace(/[^A-Z0-9 ._&()\-\/]/g,' ').replace(/\s+/g,' ').trim().slice(0,120)}
  function nameKeyOf(cfg){
    if(/weekly/i.test(String(cfg&&cfg.page||''))){
      var n=normKeyPart((document.getElementById('weeklyProjectName')||{}).textContent||'');
      return n?'weekly:'+n:null;
    }
    return 'executive';
  }
  function keyOf(cfg){
    if(/weekly/i.test(String(cfg&&cfg.page||''))){
      var el=document.getElementById('weeklyProjectName');
      var pid=normKeyPart((el&&el.dataset&&el.dataset.pid)||window.__pmoWeeklyPid||'');
      if(pid)return 'weekly:'+pid;
      return nameKeyOf(cfg);
    }
    return 'executive';
  }
  function css(){
    if(document.getElementById('pxCss'))return;
    var st=document.createElement('style');st.id='pxCss';
    st.textContent=[
      '.pp-card.px-bleed{padding:0!important;overflow:hidden;background:#06121f}',
      '.px-hero{position:relative;width:100%;aspect-ratio:16/9;container-type:inline-size;overflow:hidden;border-radius:24px;color:#eaf4ff;font-family:Inter,"Segoe UI",system-ui,sans-serif;background:radial-gradient(120% 90% at 50% 40%,#123a63 0%,#07182b 70%)}',
      '.px-bg{position:absolute;inset:0}',
      '.px-bg i{position:absolute;inset:-4%;background:center/cover no-repeat;opacity:0;transform:scale(1.02);transition:opacity 1.8s ease,transform 9s linear}',
      '.px-bg i.on{opacity:.42;transform:scale(1.12)}',
      '.px-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,18,34,.55) 0%,rgba(6,22,40,.72) 55%,rgba(4,14,26,.94) 100%),radial-gradient(70% 60% at 50% 45%,rgba(56,189,248,.16),transparent 70%)}',
      '.px-grid{position:absolute;inset:0;opacity:.18;background-image:radial-gradient(rgba(255,255,255,.55) 1px,transparent 1.2px);background-size:2.2cqw 2.2cqw;-webkit-mask:radial-gradient(60% 55% at 50% 50%,transparent 40%,#000 100%);mask:radial-gradient(60% 55% at 50% 50%,transparent 40%,#000 100%)}',
      '.px-in{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4cqw 7cqw;gap:1.1cqw}',
      '.px-core{position:relative;width:13cqw;height:13cqw;display:grid;place-items:center;margin-bottom:1.2cqw}',
      '.px-ring{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,rgba(56,189,248,0) 0 55%,#38bdf8 80%,#4fd1a0 100%);animation:ppSpin 3.2s linear infinite;-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - .45cqw),#000 calc(100% - .4cqw));mask:radial-gradient(farthest-side,transparent calc(100% - .45cqw),#000 calc(100% - .4cqw))}',
      '.px-logo{width:10.4cqw;height:10.4cqw;border-radius:50%;background:#fff;display:grid;place-items:center;box-shadow:0 0 0 .8cqw rgba(56,189,248,.10),0 2cqw 5cqw rgba(0,0,0,.45)}',
      '.px-logo img{width:8cqw;height:auto;object-fit:contain}',
      '.px-eye{font-size:1.25cqw;font-weight:700;letter-spacing:.32em;text-transform:uppercase;color:#8fd3ff}',
      '.px-h{margin:0;font-size:6.2cqw;line-height:1.05;font-weight:800;letter-spacing:-.01em;background:linear-gradient(100deg,#ffffff 0%,#bfe6ff 40%,#7dd3fc 55%,#ffffff 75%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:pxShine 6s ease-in-out infinite}',
      '.px-cover .px-h{font-size:4.6cqw}',
      '.px-bar{width:9cqw;height:.42cqw;border-radius:99px;background:linear-gradient(90deg,#38bdf8,#4fd1a0);box-shadow:0 0 1.4cqw rgba(56,189,248,.6)}',
      '.px-sub{font-size:2cqw;color:#d6ebfb;font-weight:500}',
      '.px-meta{font-size:1.45cqw;color:#9fc3e2}',
      '.px-stats{display:flex;gap:1.2cqw;flex-wrap:wrap;justify-content:center;margin-top:1.4cqw}',
      '.px-stats span{font-size:1.3cqw;padding:.55cqw 1.3cqw;border-radius:99px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:#e6f1fb}',
      '.px-foot{position:absolute;left:0;right:0;bottom:2.6cqw;font-size:1.15cqw;letter-spacing:.18em;text-transform:uppercase;color:#7fa6c8;text-align:center}',
      '.px-up{opacity:0;transform:translateY(1.2cqw)}',
      '.pp-slide:not(.next):not(.prev) .px-up{animation:ppUp .9s ease forwards}',
      '.pp-slide:not(.next):not(.prev) .px-up.d1{animation-delay:.15s}.pp-slide:not(.next):not(.prev) .px-up.d2{animation-delay:.35s}.pp-slide:not(.next):not(.prev) .px-up.d3{animation-delay:.55s}.pp-slide:not(.next):not(.prev) .px-up.d4{animation-delay:.75s}',
      '@keyframes pxShine{0%,100%{background-position:100% 0}50%{background-position:0 0}}',
      '.px-pdf{position:relative;width:100%;background:#fff;border-radius:24px;overflow:hidden}',
      '.px-pdf img{display:block;width:100%;height:100%;object-fit:contain}',
      '@media (prefers-reduced-motion:reduce){.px-ring,.px-h{animation:none!important}.px-bg i{transition:opacity .4s ease!important;transform:none!important}.px-up{opacity:1!important;transform:none!important;animation:none!important}}',
      /* panel materi tambahan */
      '.px-mg{position:fixed;inset:0;z-index:2147482500;display:flex;align-items:center;justify-content:center;background:rgba(3,10,20,.62);font-family:Inter,"Segoe UI",system-ui,sans-serif}',
      '.px-box{width:min(980px,94vw);max-height:90vh;display:flex;flex-direction:column;background:#f6f9fc;color:#132b43;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.5);overflow:hidden}',
      '.px-hd{display:flex;align-items:center;gap:12px;padding:16px 20px;background:#0f2f52;color:#fff}.px-hd b{font-size:16px}.px-hd small{display:block;color:#9fc3e2;font-size:12px;font-weight:500}',
      '.px-hd .px-x{margin-left:auto;background:rgba(255,255,255,.12);border:0;color:#fff;width:34px;height:34px;border-radius:10px;font-size:18px;cursor:pointer}',
      '.px-tabs{display:flex;gap:4px;padding:10px 20px 0;background:#e9f0f7;border-bottom:1px solid #d5e0ea}.px-tabs button{border:0;background:none;padding:10px 14px;font:600 13px Inter,system-ui,sans-serif;color:#5b7085;border-bottom:3px solid transparent;cursor:pointer}.px-tabs button.on{color:#0f2f52;border-color:#0f5fa8}',
      '.px-bd{padding:18px 20px;overflow:auto;flex:1}',
      '.px-ft{display:flex;align-items:center;gap:10px;padding:12px 20px;border-top:1px solid #d5e0ea;background:#fff}.px-ft .px-msg{font-size:13px;color:#5b7085;margin-right:auto}.px-ft .px-msg.bad{color:#b42318}',
      '.px-btn{border:1px solid #c9d6e2;background:#fff;color:#132b43;padding:9px 14px;border-radius:10px;font:600 13px Inter,system-ui,sans-serif;cursor:pointer}.px-btn.pri{background:#0f5fa8;border-color:#0f5fa8;color:#fff}.px-btn:disabled{opacity:.5;cursor:default}.px-btn.sm{padding:5px 9px;font-size:12px}',
      '.px-note{font-size:13px;color:#5b7085;margin:0 0 12px;line-height:1.5}',
      '.px-row{display:grid;grid-template-columns:96px minmax(0,1fr) 240px auto;gap:12px;align-items:center;padding:10px;border:1px solid #d9e3ec;border-radius:12px;background:#fff;margin-bottom:8px}',
      '.px-row img{width:96px;border-radius:6px;border:1px solid #e2e8f0;display:block}.px-row b{font-size:13px;display:block}.px-row small{font-size:12px;color:#6b7c8a}',
      '.px-row select,.px-f input,.px-pick select{width:100%;padding:8px 10px;border:1px solid #c9d6e2;border-radius:9px;font:13px Inter,system-ui,sans-serif;background:#fff;color:#132b43}',
      '.px-acts{display:flex;gap:4px}',
      '.px-h4{margin:0 0 4px;font-size:14px;color:#0f2f52}.px-h4 span{font-weight:500;color:#6b7c8a;font-size:12px;margin-left:6px}',
      '.px-brow{display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid #d9e3ec;border-radius:10px;background:#fff;margin-bottom:6px}.px-brow label{display:flex;align-items:center;gap:10px;flex:1;min-width:0;font-size:13px;font-weight:600;cursor:pointer}.px-brow label span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.px-brow input{width:16px;height:16px;accent-color:#0f5fa8}.px-brow.off{background:#f3f5f8}.px-brow.off label span{color:#9aa5b1;text-decoration:line-through}',
      '.px-empty{padding:22px;text-align:center;color:#6b7c8a;font-size:13px;border:1px dashed #c9d6e2;border-radius:12px;background:#fff}',
      '.px-deck{border:1px solid #d9e3ec;border-radius:12px;background:#fff;margin-bottom:10px}.px-deck-h{display:flex;align-items:center;gap:10px;padding:12px 14px}.px-deck-h b{font-size:14px}.px-deck-h small{display:block;font-size:12px;color:#6b7c8a}.px-deck-h .px-acts{margin-left:auto}',
      '.px-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;padding:0 14px 14px}',
      '.px-th{position:relative;border:2px solid transparent;border-radius:10px;cursor:pointer;background:#eef3f8;padding:4px}.px-th img{width:100%;display:block;border-radius:6px}.px-th span{position:absolute;left:8px;top:8px;background:rgba(15,47,82,.85);color:#fff;font-size:11px;font-weight:700;padding:1px 7px;border-radius:99px}.px-th.on{border-color:#0f5fa8;background:#e2efff}.px-th.on::after{content:"✓";position:absolute;right:8px;top:6px;width:22px;height:22px;border-radius:50%;background:#0f5fa8;color:#fff;font-size:13px;display:grid;place-items:center}',
      '.px-pick{display:flex;gap:10px;align-items:center;padding:0 14px 14px;flex-wrap:wrap}.px-pick select{width:auto;min-width:260px}',
      '.px-up-box{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:14px;border:1px dashed #9fb7cc;border-radius:12px;background:#fff;margin-bottom:14px}',
      '.px-prog{height:6px;border-radius:99px;background:#e2e8f0;overflow:hidden;flex:1;min-width:160px}.px-prog i{display:block;height:100%;width:0;background:linear-gradient(90deg,#38bdf8,#4fd1a0);transition:width .3s}',
      '.px-f{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.px-f label{font-size:12px;font-weight:600;color:#5b7085}.px-f label input{margin-top:4px}',
      '@media (max-width:760px){.px-row{grid-template-columns:72px minmax(0,1fr)}.px-row img{width:72px}.px-row select,.px-row .px-acts{grid-column:1/-1}.px-f{grid-template-columns:minmax(0,1fr)}}'
    ].join('');
    document.head.appendChild(st);
  }

  /* ---------- slide sampul & terima kasih ---------- */
  function banners(){
    if(cache.photos&&cache.photos.length)return cache.photos.slice();
    var out=[],seen={};
    var add=function(u){if(!u||seen[u]||out.length>=6)return;seen[u]=1;out.push(u.replace(/([?&]sz=)w\d+/,'$1w1600'))};
    try{
      var d=typeof currentReportData!=='undefined'&&currentReportData;
      if(d&&d.brief&&Array.isArray(d.brief.items))d.brief.items.forEach(function(i){if(i.banner)add('https://drive.google.com/thumbnail?id='+encodeURIComponent(i.banner)+'&sz=w1600')});
    }catch(e){}
    Array.prototype.forEach.call(document.querySelectorAll('[style*="drive.google.com/thumbnail"],img[src*="drive.google.com/thumbnail"]'),function(el){
      if(el.closest('.pp'))return;
      var s=el.tagName==='IMG'?el.getAttribute('src'):(String(el.getAttribute('style')||'').match(/url\(['"]?([^'")]+)/)||[])[1];
      if(s&&s.indexOf(LOGO.split('&')[0])<0)add(s);
    });
    return out;
  }
  function bgHtml(list){return '<div class="px-bg">'+list.map(function(u,i){return '<i'+(i===0?' class="on"':'')+' style="background-image:url(\''+u.replace(/'/g,'%27')+'\')"></i>'}).join('')+'</div><div class="px-shade"></div><div class="px-grid"></div>'}
  function rotate(card){
    var imgs=card.querySelectorAll('.px-bg i');if(imgs.length<2)return;
    var k=0,t=setInterval(function(){if(!document.body.contains(card)){clearInterval(t);return}imgs[k].classList.remove('on');k=(k+1)%imgs.length;imgs[k].classList.add('on')},7000);
  }
  function today(){var d=new Date();return HARI[d.getDay()]+', '+d.getDate()+' '+BULAN[d.getMonth()]+' '+d.getFullYear()}
  function stats(){
    try{
      var d=typeof currentReportData!=='undefined'&&currentReportData,s=d&&d.summary;if(!s)return '';
      var a=[];if(s.totalProjects)a.push(s.totalProjects+' proyek berjalan');if(s.onTrack!=null)a.push(s.onTrack+' on track');if(s.atRisk)a.push(s.atRisk+' at risk');if(s.critical)a.push(s.critical+' critical');
      return a.length?'<div class="px-stats px-up d4">'+a.map(function(x){return '<span>'+esc(x)+'</span>'}).join('')+'</div>':'';
    }catch(e){return ''}
  }
  function logoHtml(){return '<div class="px-core px-up"><div class="px-ring"></div><div class="px-logo"><img src="'+LOGO+'" alt="Logo PT Petrokimia Gresik" onerror="this.style.display=\'none\'"></div></div>'}
  function coverSlide(cfg,S,bn){
    var title=S.coverTitle||'Rapat Progres Proyek';
    return {title:'Sampul',html:'<div class="px-hero px-cover">'+bgHtml(bn)+'<div class="px-in">'+logoHtml()+
      '<div class="px-eye px-up d1">PMO Infrastruktur &amp; Process Plant</div>'+
      '<h1 class="px-h px-up d2">'+esc(title)+'</h1><div class="px-bar px-up d2"></div>'+
      '<div class="px-sub px-up d3">'+esc(S.coverSub||[cfg.page,cfg.sub].filter(Boolean).join(' · '))+'</div>'+
      '<div class="px-meta px-up d4">'+esc(today())+'</div></div><div class="px-foot">PT Petrokimia Gresik</div></div>',
      after:function(card){card.classList.add('px-bleed');rotate(card)}};
  }
  function thanksSlide(cfg,S,bn){
    return {title:'Terima kasih',html:'<div class="px-hero px-thanks">'+bgHtml(bn.slice().reverse())+'<div class="px-in">'+logoHtml()+
      '<div class="px-eye px-up d1">'+esc([cfg.page,cfg.sub].filter(Boolean).join(' · '))+'</div>'+
      '<h1 class="px-h px-up d2">Terima Kasih</h1><div class="px-bar px-up d2"></div>'+
      '<div class="px-sub px-up d3">'+esc(S.thanksSub||'Sesi diskusi & tanya jawab')+'</div>'+
      (S.thanksContact?'<div class="px-meta px-up d3">'+esc(S.thanksContact)+'</div>':'')+
      stats()+'</div><div class="px-foot">PMO Infrastruktur &amp; Process Plant · PT Petrokimia Gresik</div></div>',
      after:function(card){card.classList.add('px-bleed');rotate(card)}};
  }
  function pdfSlide(x){
    return {title:x.title+' · hal. '+x.page,extra:true,html:'<div class="px-pdf" style="aspect-ratio:'+x.width+'/'+x.height+'"><img src="/api/pres/img/'+x.deck+'/'+x.page+'" alt="'+esc(x.title)+' halaman '+x.page+'" loading="eager"></div>',
      after:function(card){card.classList.add('px-bleed')}};
  }
  function decorate(cfg,slides){
    css();
    var S=cache.settings||{},bn=banners(),mine=cache.key===keyOf(cfg);
    var L=mine&&cache.layout?cache.layout:{order:[],hidden:[]};
    /* urutan slide dashboard: sesuai susunan tersimpan; slide baru tetap di dekat posisi aslinya */
    var last=-1,ord=slides.map(function(sl,i){var t=sl.title||'',o=L.order.indexOf(t);if(o>=0){last=o;return {sl:sl,t:t,k:o}}return {sl:sl,t:t,k:last+0.001*(i+1)}});
    ord.sort(function(x,y){return x.k-y.k});
    cache.orig=slides.map(function(sl){return sl.title||''});cache.base=ord.map(function(x){return x.t});
    var hid={};(L.hidden||[]).forEach(function(t){hid[t]=1});
    var start=[],end=[],after={};
    (mine?cache.items:[]).forEach(function(x){
      var p=String(x.pos||'end');
      if(p==='start')start.push(x);
      else if(p.indexOf('after:')===0&&cache.base.indexOf(p.slice(6))>=0)(after[p.slice(6)]=after[p.slice(6)]||[]).push(x);
      else end.push(x);
    });
    var out=[coverSlide(cfg,S,bn)];
    start.forEach(function(x){out.push(pdfSlide(x))});
    ord.forEach(function(x){if(!hid[x.t])out.push(x.sl);(after[x.t]||[]).forEach(function(y){out.push(pdfSlide(y))})});
    end.forEach(function(x){out.push(pdfSlide(x))});
    out.push(thanksSlide(cfg,S,bn));
    return out;
  }
  /* foto latar dari Galeri Foto: Executive = semua proyek, Weekly = proyek itu saja */
  function gs(fn,args){return new Promise(function(res,rej){try{var r=google.script.run.withSuccessHandler(res).withFailureHandler(rej);r[fn].apply(r,args)}catch(e){rej(e)}})}
  function tok(){try{if(typeof token!=='undefined'&&token)return token}catch(e){}try{return sessionStorage.getItem('pmoSessionToken')||''}catch(e){return ''}}
  function nk(v){return String(v||'').toUpperCase().replace(/^PROYEK\s+/,'').replace(/[^A-Z0-9]+/g,' ').trim()}
  var galMemo={};
  function galleryPhotos(proj){
    var mk=proj||'*';if(galMemo[mk])return Promise.resolve(galMemo[mk]);
    var t=tok();
    var timeout=new Promise(function(res){setTimeout(function(){res(null)},6000)});
    return Promise.race([gs('getGalleryIndex',[t]),timeout]).then(function(d){
      var ps=((d&&d.projects)||[]).filter(function(p){return p.months&&p.months.length});
      if(proj)ps=ps.filter(function(p){return nk(p.name)===nk(proj)||nk(p.id)===nk(proj)});
      var lists=ps.map(function(p){var a=[];for(var i=p.months.length-1;i>=0&&a.length<8;i--)(p.months[i].photos||[]).forEach(function(x){if(x&&x.id&&a.length<8)a.push(x.id)});return a});
      var ids=[];for(var r=0;ids.length<8&&r<8;r++)lists.forEach(function(l){if(l[r]&&ids.length<8&&ids.indexOf(l[r])<0)ids.push(l[r])});
      if(!ids.length)return [];
      var parts=[];for(var i=0;i<ids.length;i+=4)parts.push(ids.slice(i,i+4));
      return Promise.all(parts.map(function(part){return Promise.race([gs('getGalleryThumbs',[t,part,1280]),new Promise(function(res){setTimeout(function(){res(null)},9000)})]).catch(function(){return null})})).then(function(rs){
        var m={};rs.forEach(function(r){var im=r&&r.images||{};Object.keys(im).forEach(function(k){m[k]=im[k]})});
        var out=ids.map(function(id){return m[id]}).filter(Boolean);
        if(out.length)galMemo[mk]=out;return out;
      });
    }).catch(function(){return []});
  }
  function load(cfg){
    var key=keyOf(cfg);cache.key=key;
    var proj=key&&key.indexOf('weekly:')===0?key.slice(7):'';
    var vids=Promise.race([galleryPhotos(proj),new Promise(function(r){setTimeout(function(){r(null)},7000)})]).then(function(a){cache.photos=a||galMemo[proj||'*']||[]}).catch(function(){cache.photos=[]});
    if(!key){cache.items=[];return vids}
    cache.err='';
    var fb=nameKeyOf(cfg);
    var q='key='+encodeURIComponent(key)+(fb&&fb!==key?'&fallbackKey='+encodeURIComponent(fb):'');
    return api('/api/pres/set?'+q).then(function(d){cache.items=d.items||[];cache.settings=d.settings||{};cache.layout=d.layout||{order:[],hidden:[]};cache.canManage=!!d.canManage}).catch(function(e){cache.items=[];cache.layout={order:[],hidden:[]};cache.err=(e&&e.message)||'Data materi tambahan tidak dapat dimuat.';try{console.warn('pmoPresExtra',cache.err)}catch(x){}}).then(function(){return vids});
  }
  function btn(){
    if(!cache.key||!(cache.canManage||cache.err))return '';
    return '<button type="button" class="pp-ic" data-a="extra" title="Materi tambahan (PDF)" aria-label="Materi tambahan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M12 11v6M9 14h6"/></svg></button>';
  }

  /* ---------- panel materi tambahan ---------- */
  var pdfjs=null;
  function loadPdfjs(){
    if(pdfjs)return Promise.resolve(pdfjs);
    return import('/vendor/pdfjs/pdf.min.mjs').then(function(m){m.GlobalWorkerOptions.workerSrc='/vendor/pdfjs/pdf.worker.min.mjs';pdfjs=m;return m});
  }
  function render(page,width,q){
    var vp0=page.getViewport({scale:1}),sc=width/vp0.width,vp=page.getViewport({scale:sc});
    var c=document.createElement('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);
    var g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);
    return page.render({canvasContext:g,viewport:vp}).promise.then(function(){var u=c.toDataURL('image/jpeg',q);c.width=c.height=0;return {url:u,w:Math.round(vp.width),h:Math.round(vp.height)}});
  }
  function manage(cfg){
    css();
    var key=cache.key||keyOf(cfg);if(!key)return;
    var items=cache.items.map(function(x){return {deck:x.deck,page:x.page,pos:x.pos,title:x.title,width:x.width,height:x.height}});
    var S=Object.assign({},cache.settings||{}),dirty=false,lib=[];
    var hid0={};((cache.layout&&cache.layout.hidden)||[]).forEach(function(t){hid0[t]=1});
    var base=cache.base.map(function(t){return {t:t,show:!hid0[t]}});
    var m=document.createElement('div');m.className='px-mg';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','Materi tambahan presentasi');
    m.innerHTML='<div class="px-box"><div class="px-hd"><div><b>Materi tambahan</b><small>'+esc([cfg.page,cfg.sub].filter(Boolean).join(' · '))+'</small></div><button type="button" class="px-x" aria-label="Tutup">×</button></div>'+
      '<div class="px-tabs" role="tablist"><button type="button" class="on" data-t="set">Susunan slide</button><button type="button" data-t="lib">Pustaka PDF</button><button type="button" data-t="txt">Sampul &amp; penutup</button></div>'+
      '<div class="px-bd"></div><div class="px-ft"><span class="px-msg"></span><button type="button" class="px-btn" data-x="close">Tutup</button><button type="button" class="px-btn pri" data-x="save" disabled>Simpan &amp; terapkan</button></div></div>';
    document.body.appendChild(m);
    var bd=m.querySelector('.px-bd'),msg=m.querySelector('.px-msg'),saveBtn=m.querySelector('[data-x=save]'),tab='set';
    var say=function(t,bad){msg.textContent=t||'';msg.classList.toggle('bad',!!bad)};
    var mark=function(){dirty=true;saveBtn.disabled=false};
    var posOpts=function(cur){
      var o=[['start','Awal (setelah sampul)']].concat(base.map(function(b){return b.t}).map(function(t){return ['after:'+t,'Setelah: '+t]})).concat([['end','Akhir (sebelum terima kasih)']]);
      return o.map(function(x){return '<option value="'+esc(x[0])+'"'+(x[0]===cur?' selected':'')+'>'+esc(x[1])+'</option>'}).join('');
    };
    function drawSet(){
      var nShow=base.filter(function(b){return b.show}).length;
      bd.innerHTML=(cache.err?'<div class="px-empty" style="border-color:#f3b4ae;color:#b42318;margin-bottom:12px">Gagal memuat data materi tambahan: '+esc(cache.err)+'</div>':'')+
        '<h4 class="px-h4">Slide dashboard <span>'+nShow+' dari '+base.length+' ditampilkan</span></h4><p class="px-note">Centang untuk menampilkan, atur urutan dengan ↑ ↓. Halaman sampul selalu pertama dan halaman Terima Kasih selalu terakhir.</p>'+
        base.map(function(b,i){return '<div class="px-brow'+(b.show?'':' off')+'" data-b="'+i+'"><label><input type="checkbox"'+(b.show?' checked':'')+'><span>'+esc(b.t||'Slide '+(i+1))+'</span></label><div class="px-acts"><button type="button" class="px-btn sm" data-bm="-1" title="Naik"'+(i===0?' disabled':'')+'>↑</button><button type="button" class="px-btn sm" data-bm="1" title="Turun"'+(i===base.length-1?' disabled':'')+'>↓</button></div></div>'}).join('')+
        '<div style="display:flex;gap:8px;margin:8px 0 22px"><button type="button" class="px-btn sm" data-bx="all">Tampilkan semua</button><button type="button" class="px-btn sm" data-bx="reset">Kembalikan urutan bawaan</button></div>'+
        '<h4 class="px-h4">Slide tambahan (PDF) <span>'+items.length+' slide</span></h4><p class="px-note">Tambah slide dari tab <b>Pustaka PDF</b>.</p>'+
        (items.length?items.map(function(x,i){return '<div class="px-row" data-i="'+i+'"><img src="/api/pres/img/'+x.deck+'/'+x.page+'?t=1" alt=""><div><b>'+esc(x.title||'Materi')+'</b><small>Halaman '+x.page+'</small></div><select aria-label="Posisi slide">'+posOpts(x.pos)+'</select><div class="px-acts"><button type="button" class="px-btn sm" data-m="-1" title="Naik"'+(i===0?' disabled':'')+'>↑</button><button type="button" class="px-btn sm" data-m="1" title="Turun"'+(i===items.length-1?' disabled':'')+'>↓</button><button type="button" class="px-btn sm" data-m="del" title="Hapus dari presentasi">✕</button></div></div>'}).join(''):'<div class="px-empty">Belum ada slide tambahan untuk presentasi ini.</div>');
    }
    function drawTxt(){
      bd.innerHTML='<p class="px-note">Teks ini dipakai di halaman sampul dan halaman Terima Kasih pada semua presentasi (Executive dan Weekly). Kosongkan untuk memakai teks bawaan.</p><div class="px-f">'+
        [['coverTitle','Judul sampul','Rapat Progres Proyek'],['coverSub','Subjudul sampul','otomatis: nama halaman · periode'],['thanksSub','Subjudul terima kasih','Sesi diskusi & tanya jawab'],['thanksContact','Kontak / keterangan penutup','mis. PMO Infrastruktur · ext. 1234']].map(function(f){return '<label>'+f[1]+'<input data-k="'+f[0]+'" maxlength="200" placeholder="'+esc(f[2])+'" value="'+esc(S[f[0]]||'')+'"></label>'}).join('')+'</div>';
    }
    function drawLib(){
      bd.innerHTML='<p class="px-note">Pustaka dipakai bersama untuk semua presentasi. Unggah file <b>PDF</b> (dari PowerPoint: File → Save As / Export → PDF). Setiap halaman disimpan sebagai gambar; animasi dan video tidak ikut.</p>'+
        '<div class="px-up-box"><input type="file" accept="application/pdf,.pdf" hidden><button type="button" class="px-btn pri" data-u="pick">Unggah PDF…</button><span class="px-up-t" style="font-size:13px;color:#5b7085">Maksimal 120 halaman.</span><div class="px-prog" hidden><i></i></div></div><div class="px-lib"><div class="px-empty">Memuat pustaka…</div></div>';
      var file=bd.querySelector('input[type=file]');
      bd.querySelector('[data-u=pick]').onclick=function(){file.click()};
      file.onchange=function(){if(file.files&&file.files[0])upload(file.files[0]);file.value=''};
      refreshLib();
    }
    function refreshLib(){
      api('/api/pres/library').then(function(d){lib=d.decks||[];drawDecks()}).catch(function(e){var l=bd.querySelector('.px-lib');if(l)l.innerHTML='<div class="px-empty">'+esc(e.message)+'</div>'});
    }
    function drawDecks(){
      var l=bd.querySelector('.px-lib');if(!l)return;
      l.innerHTML=lib.length?lib.map(function(d){var dt=new Date(d.created_at);return '<div class="px-deck" data-d="'+d.id+'"><div class="px-deck-h"><div><b>'+esc(d.title)+'</b><small>'+d.pages+' halaman · '+esc(d.created_by||'')+' · '+dt.getDate()+' '+BULAN[dt.getMonth()].slice(0,3)+' '+dt.getFullYear()+'</small></div><div class="px-acts"><button type="button" class="px-btn sm" data-a="open">Pilih halaman</button><button type="button" class="px-btn sm" data-a="del">Hapus</button></div></div><div class="px-dbody"></div></div>'}).join(''):'<div class="px-empty">Pustaka masih kosong. Unggah PDF pertama.</div>';
    }
    function openDeck(box,id){
      var body=box.querySelector('.px-dbody');if(body.innerHTML){body.innerHTML='';return}
      body.innerHTML='<div class="px-empty" style="margin:0 14px 14px">Memuat halaman…</div>';
      api('/api/pres/decks/'+id).then(function(d){
        body.innerHTML='<div class="px-thumbs">'+d.pageList.map(function(p){return '<div class="px-th" data-p="'+p.page_no+'" data-w="'+p.width+'" data-h="'+p.height+'" role="checkbox" aria-checked="false" tabindex="0"><img src="/api/pres/img/'+id+'/'+p.page_no+'?t=1" alt="Halaman '+p.page_no+'" loading="lazy"><span>'+p.page_no+'</span></div>'}).join('')+'</div>'+
          '<div class="px-pick"><button type="button" class="px-btn sm" data-a="all">Pilih semua</button><select aria-label="Posisi">'+posOpts('end')+'</select><button type="button" class="px-btn pri sm" data-a="add" disabled>Tambahkan ke presentasi</button></div>';
        var upd=function(){var n=body.querySelectorAll('.px-th.on').length;var b=body.querySelector('[data-a=add]');b.disabled=!n;b.textContent=n?'Tambahkan '+n+' halaman':'Tambahkan ke presentasi'};
        body.querySelectorAll('.px-th').forEach(function(t){var tg=function(){t.classList.toggle('on');t.setAttribute('aria-checked',String(t.classList.contains('on')));upd()};t.onclick=tg;t.onkeydown=function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();tg()}}});
        body.querySelector('[data-a=all]').onclick=function(){var all=Array.prototype.every.call(body.querySelectorAll('.px-th'),function(t){return t.classList.contains('on')});body.querySelectorAll('.px-th').forEach(function(t){t.classList.toggle('on',!all)});upd()};
        body.querySelector('[data-a=add]').onclick=function(){
          var pos=body.querySelector('.px-pick select').value;
          body.querySelectorAll('.px-th.on').forEach(function(t){items.push({deck:id,page:Number(t.getAttribute('data-p')),pos:pos,title:d.title,width:Number(t.getAttribute('data-w')),height:Number(t.getAttribute('data-h'))});t.classList.remove('on')});
          upd();mark();say(items.length+' slide tambahan disusun. Klik Simpan & terapkan.');
        };
      }).catch(function(e){body.innerHTML='<div class="px-empty" style="margin:0 14px 14px">'+esc(e.message)+'</div>'});
    }
    function upload(f){
      if(!/\.pdf$/i.test(f.name)&&f.type!=='application/pdf'){say('File harus PDF.',true);return}
      var t=bd.querySelector('.px-up-t'),pg=bd.querySelector('.px-prog'),bar=pg.querySelector('i'),pick=bd.querySelector('[data-u=pick]');
      pick.disabled=true;pg.hidden=false;bar.style.width='2%';t.textContent='Membaca PDF…';say('');
      var title=f.name.replace(/\.pdf$/i,'').replace(/[_]+/g,' ').trim().slice(0,160)||'Materi';
      var deckId=null,doc=null;
      loadPdfjs().then(function(lib){return f.arrayBuffer().then(function(b){return lib.getDocument({data:b}).promise})})
      .then(function(d){doc=d;if(d.numPages>120)throw new Error('PDF berisi '+d.numPages+' halaman. Maksimal 120 halaman per file.');
        return api('/api/pres/decks',{method:'POST',body:JSON.stringify({title:title,fileName:f.name,pages:d.numPages})})})
      .then(function(r){deckId=r.id;var n=doc.numPages,i=0;
        var next=function(){i++;if(i>n)return Promise.resolve();t.textContent='Memproses halaman '+i+' dari '+n+'…';
          return doc.getPage(i).then(function(p){return render(p,1920,0.86).then(function(big){return render(p,360,0.72).then(function(th){p.cleanup();
            return api('/api/pres/decks/'+deckId+'/pages/'+i,{method:'POST',body:JSON.stringify({width:big.w,height:big.h,image:big.url,thumb:th.url})})})})})
          .then(function(){bar.style.width=Math.round(i/n*100)+'%';return next()})};
        return next()})
      .then(function(){return api('/api/pres/decks/'+deckId+'/done',{method:'POST',body:'{}'})})
      .then(function(){t.textContent='Selesai: "'+title+'" ('+doc.numPages+' halaman) masuk pustaka.';say('PDF berhasil diunggah. Klik Pilih halaman untuk menambahkannya.');refreshLib()})
      .catch(function(e){t.textContent='Unggahan gagal.';say((e&&e.message)||'Unggahan gagal.',true);if(deckId)api('/api/pres/decks/'+deckId,{method:'DELETE'}).catch(function(){})})
      .then(function(){pick.disabled=false;setTimeout(function(){pg.hidden=true},800);try{doc&&doc.destroy()}catch(e){}});
    }
    function show(t){tab=t;m.querySelectorAll('.px-tabs button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-t')===t)});if(t==='set')drawSet();else if(t==='lib')drawLib();else drawTxt()}
    m.querySelector('.px-tabs').onclick=function(e){var b=e.target.closest('button[data-t]');if(b)show(b.getAttribute('data-t'))};
    bd.addEventListener('change',function(e){var br=e.target.closest('.px-brow');if(br&&e.target.type==='checkbox'){base[Number(br.getAttribute('data-b'))].show=e.target.checked;mark();drawSet();return}var r=e.target.closest('.px-row');if(r&&e.target.tagName==='SELECT'){items[Number(r.getAttribute('data-i'))].pos=e.target.value;mark()}});
    bd.addEventListener('input',function(e){var k=e.target.getAttribute&&e.target.getAttribute('data-k');if(k){S[k]=e.target.value;mark()}});
    bd.addEventListener('click',function(e){
      var b=e.target.closest('button');if(!b)return;
      var bb=b.closest('.px-brow');
      if(bb&&b.getAttribute('data-bm')){var bi=Number(bb.getAttribute('data-b')),bj=bi+Number(b.getAttribute('data-bm'));var bt=base[bi];base[bi]=base[bj];base[bj]=bt;mark();drawSet();return}
      if(b.getAttribute('data-bx')==='all'){base.forEach(function(x){x.show=true});mark();drawSet();return}
      if(b.getAttribute('data-bx')==='reset'){var o0=(cache.orig||[]);base.sort(function(x,y){return o0.indexOf(x.t)-o0.indexOf(y.t)});base.forEach(function(x){x.show=true});mark();drawSet();return}
      var r=b.closest('.px-row');
      if(r&&b.getAttribute('data-m')){var i=Number(r.getAttribute('data-i')),a=b.getAttribute('data-m');
        if(a==='del')items.splice(i,1);else{var j=i+Number(a);var tmp=items[i];items[i]=items[j];items[j]=tmp}mark();drawSet();return}
      var dk=b.closest('.px-deck');
      if(dk){var id=Number(dk.getAttribute('data-d'));
        if(b.getAttribute('data-a')==='open')openDeck(dk,id);
        else if(b.getAttribute('data-a')==='del'){if(!confirm('Hapus materi ini dari pustaka? Slide-nya juga dilepas dari semua presentasi.'))return;
          api('/api/pres/decks/'+id,{method:'DELETE'}).then(function(){items=items.filter(function(x){return x.deck!==id});cache.items=cache.items.filter(function(x){return x.deck!==id});say('Materi dihapus dari pustaka.');refreshLib()}).catch(function(err){say(err.message,true)})}
      }
    });
    var close=function(){if(dirty&&!confirm('Perubahan belum disimpan. Tutup tanpa menyimpan?'))return;window.removeEventListener('keydown',onKey,true);m.remove()};
    /* panel di atas slide: tombol keyboard tidak boleh menggeser slide di belakangnya */
    var onKey=function(e){e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close()}};
    window.addEventListener('keydown',onKey,true);
    m.querySelector('.px-x').onclick=close;m.querySelector('[data-x=close]').onclick=close;
    saveBtn.onclick=function(){
      saveBtn.disabled=true;say('Menyimpan…');
      api('/api/pres/set',{method:'PUT',body:JSON.stringify({key:key,items:items.map(function(x){return {deck:x.deck,page:x.page,pos:x.pos}}),layout:{order:base.map(function(x){return x.t}),hidden:base.filter(function(x){return !x.show}).map(function(x){return x.t})},settings:S})})
      .then(function(){dirty=false;window.removeEventListener('keydown',onKey,true);m.remove();
        if(window.pmoPresent&&pmoPresent.isOpen()){pmoPresent.close();setTimeout(function(){if(typeof window.pmoPresentStart==='function')window.pmoPresentStart()},650)}})
      .catch(function(e){saveBtn.disabled=false;say(e.message,true)});
    };
    show('set');
  }
  window.pmoPresExtra={load:load,decorate:decorate,btn:btn,manage:manage};
})();
</script>`;

module.exports = { PRES_EXTRA_JS };

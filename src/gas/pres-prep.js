'use strict';

/**
 * Layar "Siapkan presentasi": muncul sebelum mode presentasi dimulai (tombol Presentasi).
 *
 * - Satu daftar slide terpadu: sampul, slide dashboard, halaman PDF, video proyek, terima kasih.
 * - Urutan diatur dengan seret (atau ↑ ↓), slide dashboard bisa disembunyikan, slide tambahan dihapus.
 * - Pratinjau slide terpilih di kanan; teks sampul/penutup diubah dari pratinjau sampul/penutup.
 * - Admin dan PIC menyimpan susunan (dipakai bersama). Akun lain hanya mengatur untuk sesi itu.
 * - Tombol P di keyboard tetap langsung mulai dengan susunan tersimpan.
 * - "Lain kali langsung mulai" (tersimpan di browser) melewati layar ini; tombol "Ubah susunan"
 *   di toolbar presentasi membukanya kembali.
 */

const PRES_PREP_JS = String.raw`<style>
.pp-pj .ph .pp-per{display:inline-flex;align-items:center;gap:6px;margin-left:12px;padding:4px 11px;border-radius:99px;background:var(--tint,#eef4fa);border:1px solid var(--line,#dbe5ee);color:var(--muted,#4f6478);font-size:12.5px;font-weight:600;white-space:nowrap}
.pq{position:fixed;inset:0;z-index:2147482400;display:flex;align-items:center;justify-content:center;background:rgba(3,10,20,.66);font-family:Inter,"Segoe UI",system-ui,sans-serif;color:#132b43;color-scheme:light}
.pq input,.pq select,.pq textarea{color-scheme:light}
.pq-box{width:min(1240px,96vw);height:min(860px,92vh);display:flex;flex-direction:column;background:#f6f9fc;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.5);overflow:hidden}
.pq-hd{display:flex;align-items:center;gap:12px;padding:14px 20px;background:#0f2f52;color:#fff}
.pq-hd b{font-size:16px;display:block}.pq-hd small{color:#9fc3e2;font-size:12.5px;font-weight:500}
.pq-x{margin-left:auto;background:rgba(255,255,255,.12);border:0;color:#fff;width:34px;height:34px;border-radius:10px;font-size:18px;cursor:pointer}
.pq-main{flex:1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);min-height:0}
.pq-left{display:flex;flex-direction:column;min-height:0;border-right:1px solid #d5e0ea}
.pq-tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:12px 14px;border-bottom:1px solid #e2e9f0}
.pq-tools .pq-n{margin-left:auto;font-size:12.5px;color:#5b7085}
.pq-list{flex:1;overflow:auto;padding:10px 12px 14px;display:flex;flex-direction:column;gap:5px}
.pq-row{display:flex;align-items:center;gap:8px;padding:7px 8px;border:1px solid #d9e3ec;border-radius:10px;background:#fff;cursor:pointer;font-size:13.5px;user-select:none}
.pq-row:hover{border-color:#9fb7cc}
.pq-row.sel{border-color:#0f5fa8;background:#e8f2fd;box-shadow:inset 3px 0 0 #0f5fa8}
.pq-row.off{background:#f3f5f8}.pq-row.off .pq-t{color:#9aa5b1;text-decoration:line-through}
.pq-row.drag{opacity:.4}.pq-row.over-top{box-shadow:inset 0 3px 0 #0f5fa8}.pq-row.over-bot{box-shadow:inset 0 -3px 0 #0f5fa8}
.pq-g{color:#9aa5b1;cursor:grab;display:grid;place-items:center;width:16px}.pq-g.fix{cursor:default;opacity:.35}
.pq-row input{width:16px;height:16px;margin:0;accent-color:#0f5fa8}
.pq-ic{width:22px;height:22px;display:grid;place-items:center;color:#5b7085}
.pq-ic svg,.pq-g svg{width:16px;height:16px}
.pq-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.pq-tag{font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:#eef3f8;color:#5b7085;white-space:nowrap}
.pq-tag.pdf{background:#fde8e6;color:#b42318}.pq-tag.vid{background:#e7f0ff;color:#1e4fa8}.pq-tag.fix{background:#eef3f8}
.pq-mv{display:flex;gap:2px}.pq-mv button,.pq-del{width:26px;height:26px;border:1px solid #d5e0ea;border-radius:7px;background:#fff;color:#334e68;cursor:pointer;font-size:13px;line-height:1;padding:0}
.pq-mv button:disabled{opacity:.3;cursor:default}.pq-del{color:#b42318}
.pq-right{display:flex;flex-direction:column;min-height:0;padding:14px 18px;gap:12px;overflow:auto}
.pq-pt{font-size:12.5px;color:#5b7085}.pq-pt b{color:#132b43;font-size:14px;display:block;margin-top:2px}
.pq-frame{position:relative;width:100%;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:radial-gradient(120% 90% at 50% 40%,#123a63 0%,#07182b 70%);flex:none}
.pq-frame .pp-card{position:absolute;left:0;top:0;transform-origin:0 0;box-shadow:none!important;pointer-events:none}
.pq-frame .px-up{opacity:1!important;transform:none!important;animation:none!important}
.pq-frame .pq-ph{position:absolute;inset:0;display:grid;place-items:center;color:#cfd8e3;font-size:14px;text-align:center;padding:20px}
.pq-f{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.pq-f label{font-size:12px;font-weight:600;color:#5b7085}.pq-f input{width:100%;box-sizing:border-box;margin-top:4px;padding:8px 10px;border:1px solid #c9d6e2;border-radius:9px;font:13px Inter,system-ui,sans-serif;background:#fff!important;color:#132b43!important}
.pq-opts{display:flex;flex-direction:column;gap:8px;font-size:13.5px}.pq-opts label{display:flex;gap:8px;align-items:center;cursor:pointer}.pq-opts input{width:16px;height:16px;accent-color:#0f5fa8;margin:0}
.pq-note{font-size:12.5px;color:#5b7085;line-height:1.5;margin:0}
.pq-ft{display:flex;align-items:center;gap:10px;padding:12px 20px;border-top:1px solid #d5e0ea;background:#fff}
.pq-msg{font-size:13px;color:#5b7085;margin-right:auto}.pq-msg.bad{color:#b42318}.pq-msg.ok{color:#16875d}
.pq-btn{border:1px solid #c9d6e2;background:#fff;color:#132b43;padding:9px 14px;border-radius:10px;font:600 13px Inter,system-ui,sans-serif;cursor:pointer;display:inline-flex;gap:6px;align-items:center}
.pq-btn.pri{background:#0f5fa8;border-color:#0f5fa8;color:#fff}.pq-btn.go{background:#16875d;border-color:#16875d;color:#fff;padding:10px 18px}
.pq-btn:disabled{opacity:.5;cursor:default}.pq-btn.sm{padding:6px 10px;font-size:12.5px}
.pq-btn svg{width:16px;height:16px}
.pq-vadd{display:flex;gap:6px;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid #e2e9f0;background:#fbfdff}
.pq-vadd select{padding:7px 9px;border:1px solid #c9d6e2;border-radius:9px;font:13px Inter,system-ui,sans-serif;max-width:100%;background:#fff!important;color:#132b43!important}
.pq-vadd select option{background:#fff;color:#132b43}
.pq-load{flex:1;display:grid;place-items:center;color:#5b7085;font-size:14px}
@media (max-width:860px){.pq-main{grid-template-columns:minmax(0,1fr)}.pq-right{border-top:1px solid #d5e0ea;max-height:42vh}.pq-left{border-right:0;min-height:40vh}}
</style>
<script>
(function(){
  if(window.pmoPresPrep)return;
  var SKIP='pmoPresSkip',ANIM='pmoMotion';
  var I={
    grip:'<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="3"/>',
    dash:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>',
    proj:'<path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-6h6v6"/>',
    pdf:'<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/>',
    vid:'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M10 9l5 3-5 3z"/>',
    cover:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="11" r="3"/>',
    cube:'<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 22V12M21 7l-9 5-9-5"/>',
    play:'<path d="M7 5l12 7-12 7z"/>',plus:'<path d="M12 5v14M5 12h14"/>'
  };
  function sv(p){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>'}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
  function api(url,opt){return fetch(url,Object.assign({credentials:'same-origin',headers:{'content-type':'application/json'}},opt||{})).then(function(r){return r.json().catch(function(){return {ok:false,error:'Server tidak merespons ('+r.status+').'}})}).then(function(j){if(!j.ok)throw new Error(j.error||'Permintaan gagal.');return j.data})}

  var P=null; /* sesi layar persiapan yang sedang terbuka */

  function want(cfg){
    if(window.__ppDirect)return false;
    if(ls(SKIP)==='1')return false;
    return true;
  }

  function rowsFrom(cfg,built){
    var X=window.pmoPresExtra,C=X.state(),mine=C.key===X.keyOf(cfg);
    var byT={};built.forEach(function(s){byT[s.title||'']=s});
    var hid={};((mine&&C.layout&&C.layout.hidden)||[]).forEach(function(t){hid[t]=1});
    var base=(C.base||[]).filter(function(t){return byT.hasOwnProperty(t)});
    var start=[],end=[],after={};
    (mine?C.items:[]).forEach(function(x){
      var p=String(x.pos||'end'),it={k:x.type==='proj'?'pj':x.type==='video'?'vid':x.type==='model3d'?'m3d':'pdf',x:Object.assign({},x)};
      if(p==='start')start.push(it);
      else if(p.indexOf('after:')===0&&base.indexOf(p.slice(6))>=0)(after[p.slice(6)]=after[p.slice(6)]||[]).push(it);
      else end.push(it);
    });
    var rows=[{k:'cover',fix:true}].concat(start);
    base.forEach(function(t){rows.push({k:'dash',t:t,show:!hid[t]});(after[t]||[]).forEach(function(y){rows.push(y)})});
    return {rows:rows.concat(end).concat([{k:'thanks',fix:true}]),byT:byT};
  }

  function titleOf(r){
    if(r.k==='cover')return 'Sampul';if(r.k==='thanks')return 'Terima kasih';if(r.k==='dash')return r.t||'Slide';
    if(r.k==='vid')return 'Video · '+(r.x.title||r.x.project)+' · W'+r.x.week;
    if(r.k==='m3d')return '3D · '+(r.x.title||'Model 3D');
    if(r.k==='pj')return window.pmoPresProj?pmoPresProj.title(r.x):'Slide proyek · '+(r.x.title||r.x.project);
    return (r.x.title||'Materi PDF')+' · hal. '+r.x.page;
  }
  function slideOf(r){
    var X=window.pmoPresExtra,T=X.parts;
    if(r.k==='cover')return T.coverSlide(P.cfg,P.S,P.bn);
    if(r.k==='thanks')return T.thanksSlide(P.cfg,P.S,P.bn);
    if(r.k==='dash')return P.byT[r.t];
    return T.slideOf(r.x);
  }
  function shown(r){return r.k!=='dash'||r.show}

  function show(cfg,opt){
    if(P)return;opt=opt||{};
    var X=window.pmoPresExtra;if(!X){cfg.direct=true;window.pmoPresent.open(cfg);return}
    X.parts.css();
    var m=document.createElement('div');m.className='pq';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','Siapkan presentasi');
    m.innerHTML='<div class="pq-box"><div class="pq-hd"><span style="width:22px;height:22px;display:grid;place-items:center">'+sv('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>')+'</span><div><b>Siapkan presentasi</b><small>'+esc([cfg.page,cfg.sub].filter(Boolean).join(' · '))+'</small></div><button type="button" class="pq-x" aria-label="Tutup">×</button></div><div class="pq-load">Memuat susunan slide…</div></div>';
    document.body.appendChild(m);
    P={cfg:cfg,m:m,rows:[],sel:0,dirty:false,opt:opt};
    var onKey=function(e){if(!P||P.m!==m)return;
      if(document.querySelector('.px-mg'))return; /* panel PDF terbuka di atasnya */
      e.stopPropagation();
      if(e.key==='Escape'){e.preventDefault();close()}};
    P.onKey=onKey;window.addEventListener('keydown',onKey,true);
    m.querySelector('.pq-x').onclick=close;
    m.addEventListener('mousedown',function(e){if(e.target===m)close()});
    X.load(cfg).catch(function(){}).then(function(){
      if(!P||P.m!==m)return;
      var built=[];try{built=((cfg.build?cfg.build():[])||[]).filter(Boolean)}catch(e){console.warn(e)}
      try{X.decorate(cfg,built)}catch(e){}
      var C=X.state(),r=rowsFrom(cfg,built);
      P.rows=r.rows;P.byT=r.byT;P.can=!!C.canManage;P.isAdmin=!!C.isAdmin;P.allowed=C.allowedProjects||[];P.pagePid=C.pageProjectId||'';P.S=Object.assign({},C.settings||{});P.bn=X.parts.banners();
      P.vidList=C.vidList||[];P.key=C.key;P.err=C.err;
      if(opt.at){var k=P.rows.map(titleOf).indexOf(opt.at);if(k>=0)P.sel=k}
      draw();
    });
  }

  function draw(){
    var m=P.m,box=m.querySelector('.pq-box'),can=P.can,isExec=P.key==='executive';
    var ld=box.querySelector('.pq-load');if(ld)ld.remove();
    if(!box.querySelector('.pq-main')){
      box.insertAdjacentHTML('beforeend','<div class="pq-main"><div class="pq-left"><div class="pq-tools">'+
        (can?'<button type="button" class="pq-btn sm" data-q="pdf">'+sv(I.plus)+'Tambah PDF</button>'+(isExec?'<button type="button" class="pq-btn sm" data-q="vid">'+sv(I.plus)+'Tambah video</button>':'')+'<button type="button" class="pq-btn sm" data-q="m3d">'+sv(I.plus)+'Tambah 3D</button>'+(window.pmoPresProj?'<button type="button" class="pq-btn sm" data-q="pj">'+sv(I.plus)+'Tambah slide proyek</button>':''):'')+
        '<button type="button" class="pq-btn sm" data-q="all">Tampilkan semua</button><button type="button" class="pq-btn sm" data-q="reset">Urutan bawaan</button><span class="pq-n"></span></div>'+
        '<div class="pq-vadd" hidden></div><div class="pq-list" role="listbox" aria-label="Susunan slide"></div></div>'+
        '<div class="pq-right"></div></div>'+
        '<div class="pq-ft"><span class="pq-msg"></span>'+(can?'<button type="button" class="pq-btn" data-q="save" disabled>Simpan susunan</button>':'')+
        '<button type="button" class="pq-btn go" data-q="go">'+sv(I.play)+'Mulai presentasi</button></div>');
      wire();
    }
    var n=P.rows.filter(shown).length;
    box.querySelector('.pq-n').textContent=n+' slide';
    var list=box.querySelector('.pq-list'),last=P.rows.length-1;
    list.innerHTML=P.rows.map(function(r,i){
      var ic=r.k==='pdf'?I.pdf:r.k==='vid'?I.vid:r.k==='m3d'?I.cube:r.k==='pj'?I.proj:(r.k==='cover'||r.k==='thanks')?I.cover:/^Proyek ·/.test(r.t||'')?I.proj:I.dash;
      var canDel=(r.k==='pdf'||r.k==='vid'||r.k==='m3d'||r.k==='pj')&&(P.isAdmin||r.x.canEdit!==false);
      var tag=r.k==='pdf'?'<span class="pq-tag pdf">PDF</span>':r.k==='vid'?'<span class="pq-tag vid">Video</span>':r.k==='m3d'?'<span class="pq-tag vid">3D</span>':r.k==='pj'?'<span class="pq-tag vid">Proyek</span>':r.fix?'<span class="pq-tag fix">Tetap</span>':'';
      var up=!r.fix&&i>1,dn=!r.fix&&i<last-1;
      return '<div class="pq-row'+(i===P.sel?' sel':'')+(shown(r)?'':' off')+'" data-i="'+i+'" role="option" aria-selected="'+(i===P.sel)+'"'+(r.fix?'':' draggable="true"')+'>'+
        '<span class="pq-g'+(r.fix?' fix':'')+'" title="Seret untuk memindah">'+sv(I.grip)+'</span>'+
        (r.k==='dash'?'<input type="checkbox" '+(r.show?'checked':'')+' aria-label="Tampilkan slide">':'<span style="width:16px"></span>')+
        '<span class="pq-ic">'+sv(ic)+'</span><span class="pq-t" title="'+esc(titleOf(r))+'">'+esc(titleOf(r))+'</span>'+tag+
        (r.fix?'':'<span class="pq-mv"><button type="button" data-mv="-1" '+(up?'':'disabled')+' aria-label="Naikkan">↑</button><button type="button" data-mv="1" '+(dn?'':'disabled')+' aria-label="Turunkan">↓</button></span>')+
        (canDel?'<button type="button" class="pq-del" data-del="1" title="Hapus dari presentasi" aria-label="Hapus">×</button>':((r.k==='pdf'||r.k==='vid'||r.k==='m3d'||r.k==='pj')?'<span class="pq-tag fix" title="Dikelola Admin atau proyek lain">Terkunci</span>':''))+'</div>';
    }).join('');
    preview();
  }

  function preview(){
    var r=P.rows[P.sel],R=P.m.querySelector('.pq-right');if(!r||!R)return;
    var can=P.can,canTxt=can&&!!P.isAdmin;
    var txt='';
    if(r.k==='cover'&&canTxt)txt='<div class="pq-f"><label>Judul sampul<input data-s="coverTitle" placeholder="Rapat Progres Proyek" value="'+esc(P.S.coverTitle||'')+'"></label><label>Subjudul sampul<input data-s="coverSub" placeholder="otomatis: nama halaman · periode" value="'+esc(P.S.coverSub||'')+'"></label></div>';
    if(r.k==='thanks'&&canTxt)txt='<div class="pq-f"><label>Subjudul penutup<input data-s="thanksSub" placeholder="Sesi diskusi &amp; tanya jawab" value="'+esc(P.S.thanksSub||'')+'"></label><label>Kontak / keterangan<input data-s="thanksContact" placeholder="mis. PMO Infrastruktur · ext. 1234" value="'+esc(P.S.thanksContact||'')+'"></label></div>';
    var roleNote=can?(P.isAdmin?'Susunan yang disimpan dipakai semua orang saat presentasi halaman ini. ':'Anda dapat menambah & menyusun slide PDF'+(P.key==='executive'?', video,':'')+', Visual 3D, dan slide proyek (ringkasan minggu, keuangan cut-off, look ahead, prognosa) khusus proyek Anda ('+(P.allowed.map(function(x){return x.name}).join(', ')||'sesuai akses')+'). '):'Perubahan susunan hanya berlaku untuk sesi presentasi ini. ';
    R.innerHTML='<div class="pq-pt">Pratinjau slide '+(P.rows.slice(0,P.sel+1).filter(shown).length)+(shown(r)?'':' (disembunyikan)')+'<b>'+esc(titleOf(r))+'</b></div><div class="pq-frame"></div>'+txt+
      '<div class="pq-opts"><label><input type="checkbox" data-o="anim" '+(ls(ANIM)==='0'?'':'checked')+'> Animasi slide (angka, grafik, kartu bergerak)</label><label><input type="checkbox" data-o="skip" '+(ls(SKIP)==='1'?'checked':'')+'> Lain kali langsung mulai, lewati layar ini</label></div>'+
      '<p class="pq-note">'+roleNote+'Tombol <b>P</b> di keyboard langsung memulai presentasi dengan susunan tersimpan. Selama presentasi, buka layar ini lagi lewat tombol <b>Ubah susunan</b>.</p>';
    var fr=R.querySelector('.pq-frame');
    var s=null;try{s=slideOf(r)}catch(e){s=null}
    if(!s){fr.innerHTML='<div class="pq-ph">Pratinjau tidak tersedia.</div>';return}
    if(r.k==='vid'){var v=window.pmoPresExtra.parts.vidInfo(r.x);fr.innerHTML='<div class="pq-ph">'+sv(I.vid).replace('<svg','<svg style="width:46px;height:46px;display:block;margin:0 auto 10px"')+esc(titleOf(r))+(v&&v.range?'<br><small>'+esc(v.range)+'</small>':'')+(v?'':'<br><small>Video tidak ditemukan</small>')+'</div>';return}
    var DW=r.k==='pdf'||r.k==='cover'||r.k==='thanks'?1280:(s.dw||1280);
    var card=document.createElement('div');card.className='pp-card';card.style.width=DW+'px';
    var host=card;if(s.wrap){host=document.createElement('article');host.className=s.wrap;card.appendChild(host)}
    (s.nodes||(s.node?[s.node]:[])).forEach(function(n){if(n)host.appendChild(n.cloneNode(true))});
    if(s.html)host.insertAdjacentHTML('beforeend',s.html);
    if(typeof s.compose==='function'){try{s.compose(host)}catch(e){}}
    card.querySelectorAll('[hidden]').forEach(function(x){if(x.classList&&x.classList.contains('pp-show'))x.hidden=false});
    fr.appendChild(card);
    if(typeof s.after==='function'){try{s.after(card)}catch(e){}}
    var fit=function(){if(!card.isConnected)return;var W=fr.clientWidth,H=fr.clientHeight,h=card.offsetHeight||1,sc=Math.min(W/DW,H/h);card.style.transform='translate('+Math.max(0,(W-DW*sc)/2)+'px,'+Math.max(0,(H-h*sc)/2)+'px) scale('+sc.toFixed(4)+')'};
    fit();setTimeout(fit,300);setTimeout(fit,1200);
  }

  function say(t,cls){var e=P&&P.m.querySelector('.pq-msg');if(!e)return;e.textContent=t||'';e.className='pq-msg'+(cls?' '+cls:'')}
  function mark(){P.dirty=true;var b=P.m.querySelector('[data-q=save]');if(b)b.disabled=false;say(P.can?'Ada perubahan yang belum disimpan.':'Susunan sesi ini diubah.')}
  function move(i,j){
    var last=P.rows.length-1;j=Math.max(1,Math.min(last-1,j));if(i===j||P.rows[i].fix)return;
    var r=P.rows.splice(i,1)[0];P.rows.splice(j,0,r);P.sel=j;mark();draw();
  }

  function wire(){
    var m=P.m,list=m.querySelector('.pq-list');
    list.addEventListener('click',function(e){
      var row=e.target.closest('.pq-row');if(!row)return;var i=Number(row.getAttribute('data-i')),r=P.rows[i];
      var mv=e.target.closest('[data-mv]');if(mv){move(i,i+Number(mv.getAttribute('data-mv')));return}
      if(e.target.closest('[data-del]')){if(!P.isAdmin&&r.x&&r.x.canEdit===false)return;P.rows.splice(i,1);P.sel=Math.min(P.sel,P.rows.length-1);mark();draw();return}
      if(e.target.tagName==='INPUT'){r.show=e.target.checked;mark();P.sel=i;draw();return}
      P.sel=i;list.querySelectorAll('.pq-row').forEach(function(x,k){x.classList.toggle('sel',k===i);x.setAttribute('aria-selected',String(k===i))});preview();
    });
    /* seret untuk memindah */
    var from=-1;
    list.addEventListener('dragstart',function(e){var row=e.target.closest('.pq-row');if(!row)return;from=Number(row.getAttribute('data-i'));row.classList.add('drag');try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(from))}catch(x){}});
    list.addEventListener('dragend',function(){from=-1;list.querySelectorAll('.pq-row').forEach(function(x){x.classList.remove('drag','over-top','over-bot')})});
    list.addEventListener('dragover',function(e){if(from<0)return;var row=e.target.closest('.pq-row');if(!row)return;e.preventDefault();var b=row.getBoundingClientRect(),top=e.clientY<b.top+b.height/2;
      list.querySelectorAll('.pq-row').forEach(function(x){x.classList.remove('over-top','over-bot')});row.classList.add(top?'over-top':'over-bot')});
    list.addEventListener('drop',function(e){if(from<0)return;var row=e.target.closest('.pq-row');if(!row)return;e.preventDefault();var b=row.getBoundingClientRect(),to=Number(row.getAttribute('data-i'))+(e.clientY<b.top+b.height/2?0:1);if(to>from)to--;var f=from;from=-1;move(f,to)});
    m.addEventListener('input',function(e){var k=e.target.getAttribute&&e.target.getAttribute('data-s');if(k){P.S[k]=e.target.value;mark()}});
    m.addEventListener('change',function(e){
      var o=e.target.getAttribute&&e.target.getAttribute('data-o');
      if(o==='anim')ls(ANIM,e.target.checked?'1':'0');
      if(o==='skip')ls(SKIP,e.target.checked?'1':'0');
      var vp=e.target.getAttribute&&e.target.hasAttribute('data-vp');if(vp){var p=P.vidList.filter(function(x){return x.id===e.target.value})[0];m.querySelector('[data-vw]').innerHTML=weekOpts(p)}
    });
    m.querySelector('.pq-tools').addEventListener('click',function(e){
      var b=e.target.closest('[data-q]');if(!b)return;var q=b.getAttribute('data-q');
      if(q==='all'){P.rows.forEach(function(r){if(r.k==='dash')r.show=true});mark();draw()}
      else if(q==='reset'){var o0=window.pmoPresExtra.state().orig||[],dash=P.rows.filter(function(r){return r.k==='dash'}).sort(function(a,b){return o0.indexOf(a.t)-o0.indexOf(b.t)}),k=0;P.rows=P.rows.map(function(r){if(r.k==='dash'){var d=dash[k++];d.show=true;return d}return r});mark();draw()}
      else if(q==='pdf')window.pmoPresExtra.manage(P.cfg,{onAdd:function(got){if(!P||!got.length)return;var at=Math.min(P.sel+1,P.rows.length-1);got.forEach(function(x,k){P.rows.splice(at+k,0,{k:'pdf',x:x})});P.sel=at;mark();draw();say(got.length+' halaman PDF ditambahkan setelah slide terpilih.','ok')}});
      else if(q==='vid')toggleVid();
      else if(q==='m3d')toggleM3d();
      else if(q==='pj')togglePj();
    });
    m.querySelector('.pq-ft').addEventListener('click',function(e){var b=e.target.closest('[data-q]');if(!b)return;if(b.getAttribute('data-q')==='save')save();else go()});
  }
  function weekOpts(p){return ((p&&p.videos)||[]).map(function(v){return '<option value="'+v.week+'">W'+v.week+(v.range?' · '+esc(v.range):'')+'</option>'}).join('')}
  function toggleVid(){
    var w=P.m.querySelector('.pq-vadd');
    if(!w.hidden&&w.getAttribute('data-m')==='vid'){w.hidden=true;return}
    w.setAttribute('data-m','vid');
    var L=P.vidList;
    w.innerHTML=L.length?'<select data-vp aria-label="Proyek">'+L.map(function(p){return '<option value="'+esc(p.id)+'">'+esc(p.name)+' ('+p.videos.length+' video)</option>'}).join('')+'</select><select data-vw aria-label="Minggu">'+weekOpts(L[0])+'</select><button type="button" class="pq-btn pri sm" data-va="1">Tambahkan</button>'
      :'<span class="pq-note">Belum ada video proyek. Isi tautan video di Input Progress terlebih dahulu.</span>';
    w.hidden=false;
    var b=w.querySelector('[data-va]');if(b)b.onclick=function(){
      var pid=w.querySelector('[data-vp]').value,wk=Number(w.querySelector('[data-vw]').value),pj=L.filter(function(x){return x.id===pid})[0];
      if(P.rows.some(function(r){return r.k==='vid'&&r.x.project===pid&&Number(r.x.week)===wk})){say('Video ini sudah ada di susunan.','bad');return}
      var at=Math.min(P.sel+1,P.rows.length-1);P.rows.splice(at,0,{k:'vid',x:{type:'video',project:pid,week:wk,title:pj?pj.name:pid,canEdit:true}});P.sel=at;w.hidden=true;mark();draw();say('Video ditambahkan setelah slide terpilih.','ok');
    };
  }

  function renderM3dBar(w){
    var C=window.pmoPresExtra.state(),PN=C.m3dProj||{},allowMap={};
    (P.allowed||[]).forEach(function(p){allowMap[String(p.id)]=1});
    var L=(C.m3d||[]).filter(function(m){
      if(P.isAdmin)return true;
      var ok=!!(m.canEdit||allowMap[String(m.pid)]);
      if(!ok)return false;
      return !P.pagePid||String(m.pid)===String(P.pagePid);
    });
    var targetPid=P.pagePid||(P.allowed&&P.allowed[0]&&P.allowed[0].id)||'';
    var v3dUrl='/app?page=visual3d'+(targetPid?'&project='+encodeURIComponent(targetPid):'');
    w.innerHTML=(L.length?'<select data-mm aria-label="Model 3D">'+L.map(function(m){return '<option value="'+m.id+'">'+esc((PN[m.pid]||m.pid)+' · '+m.title)+'</option>'}).join('')+'</select><button type="button" class="pq-btn pri sm" data-ma="1">Tambahkan</button><button type="button" class="pq-btn sm" data-m3r="1" title="Muat ulang daftar model 3D">↻</button><a class="pq-btn sm" href="'+v3dUrl+'" target="_blank" rel="noopener">Unggah / Kelola 3D ↗</a>'
      :'<span class="pq-note">Belum ada model 3D'+(P.isAdmin?'':' untuk proyek Anda')+'.</span><button type="button" class="pq-btn sm" data-m3r="1" title="Muat ulang daftar model 3D">↻ Muat ulang</button><a class="pq-btn pri sm" href="'+v3dUrl+'" target="_blank" rel="noopener">+ Unggah Model 3D ↗</a>');
    var b=w.querySelector('[data-ma]');if(b)b.onclick=function(){
      var id=Number(w.querySelector('[data-mm]').value),m=L.filter(function(x){return x.id===id})[0];if(!m)return;
      if(P.rows.some(function(r){return r.k==='m3d'&&Number(r.x.model)===id})){say('Model ini sudah ada di susunan.','bad');return}
      var at=Math.min(P.sel+1,P.rows.length-1);P.rows.splice(at,0,{k:'m3d',x:{type:'model3d',model:id,title:m.title,canEdit:true}});P.sel=at;w.hidden=true;mark();draw();say('Model 3D ditambahkan setelah slide terpilih.','ok');
    };
    var rf=w.querySelector('[data-m3r]');if(rf)rf.onclick=function(){
      rf.disabled=true;
      fetch('/api/model3d',{credentials:'same-origin'}).then(function(r){return r.json()}).then(function(j){
        if(j&&j.ok&&j.data){var pm={};(j.data.projects||[]).forEach(function(p){pm[p.id]=p.name});C.m3d=j.data.models||[];C.m3dProj=pm}
      }).catch(function(){}).then(function(){if(P&&w.isConnected)renderM3dBar(w)});
    };
  }
  function toggleM3d(){
    var w=P.m.querySelector('.pq-vadd');
    if(!w.hidden&&w.getAttribute('data-m')==='m3d'){w.hidden=true;return}
    w.setAttribute('data-m','m3d');
    renderM3dBar(w);
    w.hidden=false;
  }
  /* slide proyek: pilih proyek + jenis slide (src/gas/pres-proj.js) */
  function togglePj(){
    var w=P.m.querySelector('.pq-vadd');
    if(!w.hidden&&w.getAttribute('data-m')==='pj'){w.hidden=true;return}
    w.setAttribute('data-m','pj');
    var L=(P.allowed||[]).slice();
    if(P.pagePid&&!P.isAdmin){var top=L.filter(function(p){return String(p.id)===String(P.pagePid)});L=top.concat(L.filter(function(p){return String(p.id)!==String(P.pagePid)}))}
    else if(P.pagePid){L.sort(function(a,b){return (String(b.id)===String(P.pagePid))-(String(a.id)===String(P.pagePid))})}
    var K=window.pmoPresProj.KINDS;
    w.innerHTML=L.length?'<select data-pp aria-label="Proyek">'+L.map(function(p){return '<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>'}).join('')+'</select>'+
      K.map(function(k){return '<label style="display:inline-flex;gap:5px;align-items:center;font-size:12.5px;cursor:pointer"><input type="checkbox" data-pk="'+k[0]+'" checked style="width:15px;height:15px;margin:0;accent-color:#0f5fa8">'+esc(window.pmoPresProj.SHORT[k[0]])+'</label>'}).join('')+
      '<button type="button" class="pq-btn pri sm" data-pa="1">Tambahkan</button><span class="pq-note" style="flex-basis:100%">Data selalu memakai minggu terakhir yang terinput dan laporan keuangan bulan cut-off terakhir.'+(P.isAdmin?'':' Pilihan proyek sesuai akses Anda (proyek & sub-proyek).')+'</span>'
      :'<span class="pq-note">Tidak ada proyek yang dapat Anda tambahkan.</span>';
    w.hidden=false;
    var b=w.querySelector('[data-pa]');if(b)b.onclick=function(){
      var pid=w.querySelector('[data-pp]').value,pj=L.filter(function(x){return String(x.id)===String(pid)})[0],nm=pj?pj.name:pid;
      var kinds=[].slice.call(w.querySelectorAll('[data-pk]')).filter(function(c){return c.checked}).map(function(c){return c.getAttribute('data-pk')});
      if(!kinds.length){say('Pilih minimal satu jenis slide.','bad');return}
      var at=Math.min(P.sel+1,P.rows.length-1),n=0,dup=0;
      kinds.forEach(function(k){
        if(P.rows.some(function(r){return r.k==='pj'&&String(r.x.project)===String(pid)&&r.x.kind===k})){dup++;return}
        P.rows.splice(at+n,0,{k:'pj',x:{type:'proj',project:pid,kind:k,title:nm,canEdit:true}});n++;
      });
      if(!n){say('Slide '+nm+' yang dipilih sudah ada di susunan.','bad');return}
      P.sel=at;w.hidden=true;mark();draw();say(n+' slide proyek '+nm+' ditambahkan setelah slide terpilih'+(dup?' ('+dup+' sudah ada)':'')+'.','ok');
    };
  }
  function payload(){
    var items=[],last=null,order=[],hidden=[];
    P.rows.forEach(function(r){
      if(r.k==='dash'){order.push(r.t);if(!r.show)hidden.push(r.t);last=r.t;return}
      if(r.k!=='pdf'&&r.k!=='vid'&&r.k!=='m3d'&&r.k!=='pj')return;
      var pos=last?'after:'+last:'start',x=r.x;
      items.push(r.k==='pj'?{type:'proj',project:x.project,kind:x.kind,pos:pos,title:x.title}:r.k==='m3d'?{type:'model3d',model:x.model,pos:pos,title:x.title}:r.k==='vid'?{type:'video',project:x.project,week:x.week,pos:pos,title:x.title}:{deck:x.deck,page:x.page,pos:pos});
    });
    return {key:P.key,items:items,layout:{order:order,hidden:hidden},settings:P.S};
  }
  function save(){
    if(!P.can)return Promise.resolve();
    var b=P.m.querySelector('[data-q=save]');if(b)b.disabled=true;say('Menyimpan…');
    return api('/api/pres/set',{method:'PUT',body:JSON.stringify(payload())}).then(function(){P.dirty=false;say('Susunan tersimpan.','ok')})
      .catch(function(e){if(b)b.disabled=false;say(e.message,'bad');throw e});
  }
  function go(){
    var p=(P.can&&P.dirty)?save():Promise.resolve();
    p.then(function(){
      var cfg=P.cfg,vis=P.rows.filter(shown),slides=[];
      vis.forEach(function(r){var s=null;try{s=slideOf(r)}catch(e){}if(s)slides.push(s)});
      var at=0;if(P.opt.at){var k=vis.map(titleOf).indexOf(P.opt.at);if(k>=0)at=k}
      var c2=Object.assign({},cfg,{direct:true,__final:slides,start:at});
      shut();window.pmoPresent.open(c2);
    }).catch(function(){});
  }
  function shut(){if(!P)return;window.removeEventListener('keydown',P.onKey,true);P.m.remove();P=null}
  function close(){if(!P)return;if(P.can&&P.dirty&&!confirm('Susunan belum disimpan. Tutup tanpa menyimpan?'))return;shut()}

  window.pmoPresPrep={want:want,show:show,
    reopen:function(cfg,atTitle){var c=Object.assign({},cfg);delete c.__final;delete c.direct;delete c.start;
      if(window.pmoPresent&&pmoPresent.isOpen())pmoPresent.close();setTimeout(function(){show(c,{at:atTitle})},450)}};
})();
</script>
`;

module.exports = { PRES_PREP_JS };

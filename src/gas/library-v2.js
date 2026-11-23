'use strict';

/**
 * Pembaruan Library & Knowledge (Tampilan Reader-First + Parser Lapis 1 + OCR Opsi 3 Hybrid).
 * - Seluruh perubahan halaman lama disuntikkan melalui HTML_PATCHES dan GS_PATCHES (legacy/* tetap utuh).
 */

const LIBRARY_V2_CSS = `
/* ===== Library & Knowledge v2 (Reader-First + Opsi 3) ===== */
:root{--lk-ok:#147a52;--lk-ok-bg:#e6f6ef;--lk-warn:#9a5b00;--lk-warn-bg:#fff1d6;--lk-shadow:0 10px 28px rgba(10,28,48,.1)}
html[data-theme=dark]{--lk-ok:#36c48c;--lk-ok-bg:#12382c;--lk-warn:#f5b942;--lk-warn-bg:#3c2c10;--lk-shadow:0 12px 32px rgba(0,0,0,.35)}
.lk{flex:1;display:grid;grid-template-columns:360px minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);gap:0;padding:0;min-height:0;overflow:hidden;transition:grid-template-columns .2s ease}
.lk.focus-read{grid-template-columns:0px minmax(0,1fr)}
.lk-note{grid-column:1/-1;margin:10px 14px 0;padding:10px 14px;border-radius:10px;background:var(--soft);border-left:3px solid var(--pri);font-size:13px}
.lk-rail{grid-row:2;grid-column:1;display:flex;flex-direction:column;min-height:0;min-width:0;overflow:hidden;background:var(--card);border-right:1px solid var(--line)}
.lk.focus-read .lk-rail{opacity:0;pointer-events:none;border-right-color:transparent}
.lk-segwrap{padding:10px 12px;border-bottom:1px solid var(--line);background:var(--tint);flex:none}
.lk-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:3px;background:var(--bg);border:1px solid var(--line);border-radius:9px}
.lk-seg button{border:0;background:transparent;color:var(--muted);font-size:12px;font-weight:600;padding:7px 4px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap}
.lk-seg button.active{background:var(--card);color:var(--pri-ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.lk-seg .cnt{font-size:10.5px;padding:1px 6px;border-radius:5px;background:var(--soft);color:var(--pri-ink);font-weight:700}
.lk-pane{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding:12px;gap:9px}
.lk-pane .doclist{flex:1;min-height:0;overflow:auto;padding-right:2px;align-content:start}
.lk-pane .toc{flex:1;min-height:0;overflow:auto;margin:0 -4px;padding:0 4px}
.lk-pane .results{flex:1;min-height:0;overflow:auto;padding:2px 4px 8px 0}
.doc{border-radius:10px;padding:10px 11px;gap:8px;background:var(--tint);transition:border-color .15s,background .15s}
.doc.on{background:var(--soft);border-color:var(--pri);box-shadow:none}
.doc .dt b{font-size:13px;line-height:1.35;margin-bottom:3px}
.doc .dt small{margin-bottom:5px}
.doc-badges{display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;margin-top:4px;padding-top:6px;border-top:1px dashed var(--line)}
.lbadge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:2px 7px;border-radius:5px}
.lbadge.ok{background:var(--lk-ok-bg);color:var(--lk-ok)}
.lbadge.warn{background:var(--lk-warn-bg);color:var(--lk-warn)}
.lbadge.info{background:var(--soft);color:var(--pri-ink)}
.doc-qacts{display:inline-flex;gap:4px}
.doc-qact{border:1px solid var(--line);background:var(--card);color:var(--ink);font-size:11px;font-weight:600;padding:2px 8px;border-radius:6px}
.doc-qact:hover{border-color:var(--pri);color:var(--pri-ink)}
.toc-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--tint);flex:none}
.toc-bar .lk-h{min-width:0;flex:1}.toc-bar small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lk-view{grid-row:2;grid-column:2;border:0;border-radius:0;background:var(--bg);display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden}
.vbar{padding:8px 14px;background:var(--card);border-bottom:1px solid var(--line);gap:8px}
.vtop{gap:8px;flex-wrap:wrap}
.vmode{display:inline-flex;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--tint);gap:2px}
.vmode button{height:26px;padding:0 10px;border:0;border-radius:6px;background:transparent;font-size:11.5px;font-weight:600;color:var(--muted)}
.vmode button.active{background:var(--card);color:var(--pri-ink);box-shadow:0 1px 2px rgba(0,0,0,.1)}
.vb.pri{background:var(--pri);border-color:var(--pri);color:#fff}
.vb.pri:hover{filter:brightness(1.08);background:var(--pri)}
.vscroll{padding:18px 22px}
.vov{max-width:860px;margin:0 auto;display:grid;gap:14px}
.vov-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px;box-shadow:var(--lk-shadow)}
.vov-kicker{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--pri-ink);margin-bottom:6px}
.vov-title{font-size:20px;font-weight:800;color:var(--navy);margin:0 0 8px;line-height:1.3}
.vov-meta{display:flex;gap:12px;flex-wrap:wrap;font-size:12.5px;color:var(--muted);margin-bottom:14px}
.vov-note{font-size:12.5px;color:var(--ink);background:var(--tint);border:1px solid var(--line);border-radius:8px;padding:9px 12px;margin-bottom:14px}
.vov-acts{display:flex;gap:8px;flex-wrap:wrap}
.vov-btn{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px;border-radius:9px;border:1px solid var(--line);background:var(--card);color:var(--ink);font-size:12.5px;font-weight:600}
.vov-btn:hover{background:var(--soft)}
.vov-btn.pri{background:var(--pri);border-color:var(--pri);color:#fff}
.cov-strip{margin-top:16px;padding-top:14px;border-top:1px solid var(--line);display:grid;gap:7px}
.cov-lbl{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:11.5px;color:var(--muted)}
.cov-bars{display:flex;gap:2px;height:11px;align-items:stretch}
.cov-b{flex:1;min-width:2px;border-radius:2px;background:var(--lk-ok);opacity:.85}
.cov-b.ocr{background:var(--pri)}
.cov-b.toc{background:var(--muted);opacity:.42}
.cov-b.need{background:var(--lk-warn)}
.qchap-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:9px;margin-top:10px}
.qchap{text-align:left;border:1px solid var(--line);background:var(--tint);border-radius:9px;padding:11px 13px;transition:border-color .15s}
.qchap:hover{border-color:var(--pri);background:var(--soft)}
.qchap small{display:block;font-size:11px;font-weight:700;color:var(--pri-ink);margin-bottom:3px}
.qchap b{display:block;font-size:12.5px;color:var(--navy);line-height:1.35}
.ocr-panel{border:1px solid var(--pri);background:var(--soft);border-radius:11px;padding:12px 14px;display:grid;gap:9px}
.ocr-panel-h{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;font-weight:700;color:var(--navy)}
.ocr-panel p{margin:0;font-size:12.5px;color:var(--ink);line-height:1.45}
.ocr-acts{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ocr-acts button{height:34px;padding:0 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);font-size:12px;font-weight:600}
.ocr-acts button.pri{background:var(--pri);border-color:var(--pri);color:#fff}
.ocr-chk{display:flex!important;flex-direction:row!important;align-items:center;gap:8px!important;font-size:12px!important;color:var(--ink)!important;font-weight:500!important}
.ocr-chk input{width:15px!important;height:15px!important;margin:0;accent-color:var(--pri)}
.res-src{font-size:10.5px;font-weight:700;padding:1px 6px;border-radius:4px;background:var(--soft);color:var(--pri-ink);margin-left:6px}
@media(max-width:1279px){
  .lk{grid-template-columns:minmax(0,1fr)}
  .lk-rail{grid-column:1;border-right:0}
  .lk-view{position:fixed;top:0;right:0;bottom:0;left:auto;width:min(820px,100%);z-index:1200;box-shadow:-12px 0 40px rgba(7,25,43,.28);transform:translateX(105%);transition:transform .22s ease;visibility:hidden}
  .lk.view-open .lk-view{transform:none;visibility:visible}
  #focusBtn{display:none}
}
@media(max-width:900px){
  .lk{padding:0;height:auto;overflow:visible}
  .lk-rail{overflow:visible}
  .lk-pane{overflow:visible;padding:10px}
  .lk-pane .doclist{max-height:52vh}
  .lk-pane .toc{max-height:55vh}
  .lk-pane .results{max-height:none;overflow:visible}
  .lk-view{width:100%}
  .vscroll{padding:12px}
  .vov-card{padding:14px}
}
`;

const LIBRARY_MAIN_HTML = `<main class="lk" id="lk">
  <div class="lk-note" id="note" role="status" aria-live="polite" hidden></div>
  <aside class="lk-rail" id="lkRail" aria-label="Panel Library">
    <div class="lk-segwrap">
      <div class="lk-seg" role="tablist" aria-label="Mode panel Library">
        <button type="button" class="active" id="tabBtnDocs" data-ltab="docs" role="tab" aria-selected="true">Dokumen <span class="cnt" id="cntDocs">0</span></button>
        <button type="button" id="tabBtnToc" data-ltab="toc" role="tab" aria-selected="false">Bab &amp; Pasal</button>
        <button type="button" id="tabBtnSearch" data-ltab="search" role="tab" aria-selected="false">Cari <span class="cnt" id="cntHits" hidden>0</span></button>
      </div>
    </div>

    <section class="lk-pane" id="colDocs" aria-label="Dokumen library">
      <div class="lk-h"><b style="display:flex;justify-content:space-between;align-items:center"><span>Dokumen library</span><small id="docCount" style="font-weight:500">Memuat…</small></b></div>
      <div class="chips" id="cats" role="group" aria-label="Filter kategori"></div>
      <label class="dfilter"><i class="ic" data-ic="search"></i><input id="docFilter" type="search" placeholder="Saring judul, nomor, atau revisi" aria-label="Saring judul dokumen"></label>
      <div class="dsel"><button type="button" id="selAll">Centang semua</button><button type="button" id="selNone">Kosongkan</button></div>
      <div class="doclist" id="docList"></div>
    </section>

    <section class="lk-pane" id="colToc" aria-label="Daftar bab dan pasal" hidden>
      <div class="toc-bar">
        <div class="lk-h"><b>Daftar bab &amp; pasal</b><small id="tocDoc">Pilih dokumen untuk melihat daftar isinya</small></div>
        <span class="tocact" id="tocAct" hidden><button type="button" id="tocOpen" title="Buka semua sub-bab">Buka</button><button type="button" id="tocClose" title="Tutup semua sub-bab">Tutup</button></span>
      </div>
      <div class="toc" id="toc"></div>
    </section>

    <section class="lk-pane" id="colSearch" aria-label="Pencarian" hidden>
      <form class="sbox" id="sForm" role="search"><i class="ic" data-ic="search"></i><input id="q" type="search" placeholder="Cari kata atau frasa, mis. adendum" aria-label="Kata yang dicari" autocomplete="off"><button type="submit" class="sgo">Cari</button></form>
      <div class="shint"><span class="kbd" id="scope">0 dokumen</span> Pakai kutip untuk frasa, misal <code>"perubahan nilai kontrak"</code>.</div>
      <div id="tochits"></div>
      <div class="rcount" id="rcount"></div>
      <div class="results" id="results"><div class="empty"><i class="ic" data-ic="search"></i><b>Cari di pedoman &amp; prosedur</b><span>Hasil menampilkan dokumen, nomor halaman, dan bab/pasal tempat kata itu muncul.</span></div></div>
    </section>
  </aside>

  <section class="lk-col lk-view" id="colView" aria-label="Penampil PDF">
    <div class="vbar">
      <div class="vtop">
        <button type="button" class="vb" id="focusBtn" title="Luaskan area baca (sembunyikan panel kiri)" aria-label="Mode fokus baca"><i class="ic" data-ic="chevl"></i><span id="focusTxt">Fokus</span></button>
        <b id="vTitle">Penampil PDF</b>
        <span class="lbadge ok" id="vStatusBadge" hidden>Terindeks</span>
        <div class="vmode" id="vModeBox" hidden>
          <button type="button" id="vModeOv" class="active">Ringkasan</button>
          <button type="button" id="vModePdf">Baca PDF</button>
        </div>
        <button type="button" class="vb" id="vOcrBtn" hidden title="Jalankan OCR AI (Opsi 3) untuk halaman scan atau perbaiki bab/pasal">OCR AI</button>
        <a id="vDrive" class="vb" href="#" target="_blank" rel="noopener" hidden title="Buka di Google Drive"><i class="ic" data-ic="ext"></i><span>Drive</span></a>
        <button type="button" class="vb vclose" id="vClose" aria-label="Tutup penampil"><i class="ic" data-ic="x"></i></button>
      </div>
      <div class="vctl" id="vPdfCtl" hidden>
        <span class="vnav"><button type="button" id="vPrev" aria-label="Halaman sebelumnya"><i class="ic" data-ic="chevl"></i></button><label>hal.<input id="vPage" inputmode="numeric" value="–" aria-label="Nomor halaman"></label><span>/ <b id="vTotal">–</b></span><button type="button" id="vNext" aria-label="Halaman berikutnya"><i class="ic" data-ic="chevr"></i></button></span>
        <span class="vhit" id="vHitBox" hidden><button type="button" id="hPrev" aria-label="Temuan sebelumnya"><i class="ic" data-ic="chevl"></i></button><span id="vHit"></span><button type="button" id="hNext" aria-label="Temuan berikutnya"><i class="ic" data-ic="chevr"></i></button></span>
        <span class="vzoom"><button type="button" id="zOut" aria-label="Perkecil">−</button><button type="button" id="zFit" title="Pas lebar">100%</button><button type="button" id="zIn" aria-label="Perbesar">+</button></span>
      </div>
    </div>
    <div class="vscroll" id="vScroll">
      <div class="vempty" id="vEmpty"><i class="ic" data-ic="doc"></i><b>Belum ada dokumen dipilih</b><span>Pilih dokumen di panel kiri untuk melihat ringkasan, daftar bab, atau membaca halaman PDF.</span></div>
      <div class="vov" id="vOverview" hidden></div>
      <div class="pgwrap" id="pgWrap" hidden></div>
    </div>
  </section>
</main>`;

const LIBRARY_V2_SCRIPT = `
/* ---------- Navigasi tab panel kiri & Mode Fokus ---------- */
let LTAB='docs';
function syncIsiNav(gotoId){
  var lbl='';
  document.querySelectorAll('aside.side .nav.sub[data-goto]').forEach(function(b){
    var on=b.getAttribute('data-goto')===gotoId;
    b.classList.toggle('on',on);
    if(on){var sp=b.querySelector('span');lbl=(sp&&sp.textContent)||'';}
  });
  var trigSp=document.querySelector('#pmoPbar .pmo-isi-trig > span:nth-of-type(2)');
  if(trigSp&&lbl)trigSp.textContent=lbl;
  document.querySelectorAll('#pmoPbar .pmo-isi-menu .pmo-chip').forEach(function(c,i){
    var target=(i===0?'colDocs':(i===1?'colSearch':'colView'));
    c.classList.toggle('on',target===gotoId);
  });
}
function switchLTab(name){
  LTAB=name;
  document.querySelectorAll('[data-ltab]').forEach(b=>{
    const on=b.getAttribute('data-ltab')===name;
    b.classList.toggle('active',on);
    b.setAttribute('aria-selected',String(on));
  });
  if($('colDocs'))$('colDocs').hidden=(name!=='docs');
  if($('colToc'))$('colToc').hidden=(name!=='toc');
  if($('colSearch'))$('colSearch').hidden=(name!=='search');
  if($('vModePdf')&&!$('vModePdf').classList.contains('active'))syncIsiNav(name==='search'?'colSearch':'colDocs');
  if(name==='search')setTimeout(()=>{if($('q'))$('q').focus();},60);
}
document.querySelectorAll('[data-ltab]').forEach(b=>b.addEventListener('click',()=>switchLTab(b.getAttribute('data-ltab'))));
if($('focusBtn'))$('focusBtn').addEventListener('click',()=>{
  const on=$('lk').classList.toggle('focus-read');
  $('focusTxt').textContent=on?'Panel':'Fokus';
  setTimeout(()=>{if(VIEW.pdf&&!$('pgWrap').hidden)renderPage(VIEW.page);},220);
});
function setViewerMode(mode){
  const showPdf=(mode==='pdf');
  if($('vModeOv'))$('vModeOv').classList.toggle('active',!showPdf);
  if($('vModePdf'))$('vModePdf').classList.toggle('active',showPdf);
  if($('vOverview'))$('vOverview').hidden=showPdf||!ACTIVE;
  if($('pgWrap'))$('pgWrap').hidden=!showPdf||!VIEW.pdf;
  if($('vEmpty'))$('vEmpty').hidden=!!ACTIVE||!!VIEW.pdf;
  if($('vPdfCtl'))$('vPdfCtl').hidden=!showPdf;
  syncIsiNav(showPdf?'colView':(LTAB==='search'?'colSearch':'colDocs'));
}
if($('vModeOv'))$('vModeOv').onclick=()=>{setViewerMode('ov');renderOverview();};
if($('vModePdf'))$('vModePdf').onclick=()=>{if(ACTIVE){if(VIEW.doc===ACTIVE&&VIEW.pdf)setViewerMode('pdf');else openViewer(ACTIVE,VIEW.page||1,TERMS);}};

/* ---------- Override nav.sub shortcuts ---------- */
document.querySelectorAll('.nav.sub').forEach(function(b){
  b.onclick=function(){
    const id=b.getAttribute('data-goto');
    $('app').classList.remove('nav-open');
    $('lk').classList.remove('focus-read');
    if($('focusTxt'))$('focusTxt').textContent='Fokus';
    if(id==='colDocs')switchLTab(ACTIVE&&LTAB==='docs'?'toc':'docs');
    else if(id==='colSearch')switchLTab('search');
    else if(id==='colView'){if(narrow()&&ACTIVE)$('lk').classList.add('view-open');if(ACTIVE&&(!VIEW.pdf||$('pgWrap').hidden))openViewer(ACTIVE,VIEW.page||1,TERMS);}
  };
});

/* ---------- Status OCR server (Opsi 3) ---------- */
let OCR_STATUS={enabled:false,configured:false,model:'',remaining:0};
async function fetchOcrStatus(){
  try{
    const r=await fetch('/api/library/ocr-status',{credentials:'same-origin'});
    if(r.ok){const j=await r.json();if(j&&j.ok)OCR_STATUS=j;}
  }catch(e){}
  return OCR_STATUS;
}

/* ---------- Kartu dokumen modern ---------- */
function renderDocs(){
  const list=shown();
  if($('cntDocs'))$('cntDocs').textContent=DOCS.length;
  $('docCount').textContent=DOCS.length?DOCS.length+' dokumen':'Belum ada dokumen';
  $('docList').innerHTML=list.length?list.map(d=>{
    const ok=searchable(d),warn=d.status==='PERLU_OCR';
    const meta=[d.revision,d.pages?d.pages+' hal':'',d.category,d.effective].filter(Boolean).join(' · ');
    const st=ok?'Terindeks'+(d.sections?' · '+d.sections+' bab':''):warn?'Scan · Perlu OCR AI':'Belum terindeks';
    return '<div class="doc'+(d.id===ACTIVE?' on':'')+'" data-id="'+esc(d.id)+'">'+
      '<input type="checkbox"'+(CHECK[d.id]&&ok?' checked':'')+(ok?'':' disabled')+' aria-label="Sertakan '+esc(d.title)+' dalam pencarian">'+
      '<span class="dic'+(warn?' warn':'')+'"><i class="ic" data-ic="'+(warn?'warn':'doc')+'"></i></span>'+
      '<span class="dt"><b>'+esc(d.title)+'</b><small>'+esc(meta)+'</small>'+
        '<div class="doc-badges"><span class="lbadge '+(ok?'ok':'warn')+'">'+esc(st)+'</span>'+
          '<span class="doc-qacts"><button type="button" class="doc-qact" data-qact="toc">Bab</button><button type="button" class="doc-qact" data-qact="read">Baca</button></span>'+
        '</div>'+
      '</span>'+
      (ADMIN?'<button type="button" class="dedit" title="Sunting & OCR dokumen" aria-label="Sunting '+esc(d.title)+'"><i class="ic" data-ic="edit"></i></button>':'')+
    '</div>';
  }).join('')
  :'<div class="empty"><i class="ic" data-ic="doc"></i><b>'+(DOCS.length?'Tidak ada dokumen yang cocok':'Library masih kosong')+'</b><span>'+(DOCS.length?'Ubah filter kategori atau kata saringan.':ADMIN?'Klik Unggah dokumen untuk menambahkan PDF.':'ADMIN belum mengunggah dokumen.')+'</span></div>';
  paint($('docList'));scopeText();
}
$('docList').onclick=e=>{
  const card=e.target.closest('.doc');if(!card)return;
  const id=card.getAttribute('data-id');
  if(e.target.closest('.dedit')){openEdit(id);return;}
  const qa=e.target.closest('[data-qact]');
  if(qa){
    const act=qa.getAttribute('data-qact');
    setActive(id);
    if(act==='toc')switchLTab('toc');
    else openViewer(id,1,TERMS);
    return;
  }
  if(e.target.tagName==='INPUT'){if(e.target.checked)CHECK[id]=true;else delete CHECK[id];scopeText();rerun();return;}
  setActive(id);
  if(narrow())openViewer(id,1,TERMS);
  else renderOverview();
};

/* ---------- Ringkasan Dokumen & Peta Halaman ---------- */
function renderOverview(){
  const d=docOf(ACTIVE);if(!d||!$('vOverview'))return;
  if($('vModeBox'))$('vModeBox').hidden=false;
  if($('vTitle')){$('vTitle').textContent=d.title+(d.revision?' · '+d.revision:'');$('vTitle').title=d.title;}
  if($('vStatusBadge')){
    const ok=searchable(d);
    $('vStatusBadge').hidden=false;
    $('vStatusBadge').className='lbadge '+(ok?'ok':'warn');
    $('vStatusBadge').textContent=ok?'Terindeks':'Perlu OCR';
  }
  if($('vDrive')){if(d.fileUrl){$('vDrive').href=d.fileUrl;$('vDrive').hidden=false;}else $('vDrive').hidden=true;}
  if($('vOcrBtn'))$('vOcrBtn').hidden=!ADMIN;
  setViewerMode('ov');

  const ix=IDX[d.id];
  const ocrSet=new Set((ix&&Array.isArray(ix.ocrPages))?ix.ocrPages:[]);
  const tocSet=new Set((ix&&Array.isArray(ix.tocPages))?ix.tocPages:[]);
  const total=d.pages||(ix&&ix.pages?ix.pages.length:0)||1;
  let digCount=0,ocrCount=0,scanCount=0;
  const bars=[];
  const step=total>120?Math.ceil(total/120):1;
  for(let p=1;p<=total;p++){
    const txt=(ix&&ix.pages&&ix.pages[p-1])?String(ix.pages[p-1]).replace(/\\s+/g,''):'';
    const isOcr=ocrSet.has(p),isToc=tocSet.has(p),hasTxt=txt.length>=40;
    if(isOcr)ocrCount++;else if(hasTxt)digCount++;else scanCount++;
    if((p-1)%step===0){
      const cls=isOcr?'ocr':(isToc?'toc':(hasTxt?'':'need'));
      bars.push('<button type="button" class="cov-b '+cls+'" data-op="'+p+'" title="Hal. '+p+(isOcr?' (OCR AI)':isToc?' (Daftar Isi)':hasTxt?' (Teks PDF)':' (Scan / teks sedikit)')+'"></button>');
    }
  }
  const chaps=(ix&&ix.toc?ix.toc.filter(t=>t.l===1):[]).slice(0,12);
  $('vOverview').innerHTML=
    '<div class="vov-card">'+
      '<div class="vov-kicker">'+esc([d.category,d.revision,d.effective?'Berlaku '+d.effective:''].filter(Boolean).join(' · ')||'DOKUMEN LIBRARY')+'</div>'+
      '<h2 class="vov-title">'+esc(d.title)+'</h2>'+
      '<div class="vov-meta">'+
        '<span>File: '+esc(d.fileName||'PDF')+'</span>'+
        (ix?'':'<span>'+(searchable(d)?'Memuat detail indeks…':'Belum diindeks / hasil scan')+'</span>')+
      '</div>'+
      '<div class="vov-stats">'+
        '<div class="vst"><small>Total Halaman</small><b>'+esc(total)+'</b><span>Dokumen PDF</span></div>'+
        '<div class="vst"><small>Teks PDF Digital</small><b>'+(ix?digCount+' hal.':'-')+'</b><span>Indeks instan</span></div>'+
        '<div class="vst"><small>Ekstraksi OCR AI</small><b>'+(ix?ocrCount+' hal.':'-')+'</b><span>Terbaca AI</span></div>'+
        '<div class="vst"><small>Bab / Lampiran</small><b>'+esc((d.sections||chaps.length||0)+' bagian')+'</b><span>'+(ix?scanCount+' hal. scan':'Menunggu indeks')+'</span></div>'+
      '</div>'+
      (d.note?'<div class="vov-note">'+esc(d.note)+'</div>':'')+
      '<div class="vov-acts">'+
        '<button type="button" class="vov-btn pri" id="ovOpen1">Buka Halaman 1</button>'+
        '<button type="button" class="vov-btn" id="ovGoToc">Lihat Bab &amp; Pasal</button>'+
        (ADMIN&&(scanCount>0||d.status==='PERLU_OCR')?'<button type="button" class="vov-btn" id="ovRunOcr">Jalankan OCR AI'+(scanCount?' ('+scanCount+' hal. scan)':'')+'</button>':'')+
      '</div>'+
      (ix?'<div class="cov-strip"><div class="cov-lbl"><span><b>Peta Keterbacaan ('+total+' hal.)</b></span><span class="cov-leg"><span class="cov-leg-it"><i class="cov-dot pdf"></i>Teks PDF</span><span class="cov-leg-it"><i class="cov-dot ocr"></i>OCR AI</span><span class="cov-leg-it"><i class="cov-dot toc"></i>Daftar Isi</span><span class="cov-leg-it"><i class="cov-dot scan"></i>Scan</span></span></div><div class="cov-bars">'+bars.join('')+'</div></div>':'')+
    '</div>'+
    (chaps.length?'<div class="vov-card"><div class="vov-kicker">LOMPAT CEPAT KE BAB UTAMA</div><div class="qchap-grid">'+
      chaps.map(c=>'<button type="button" class="qchap" data-op="'+c.p+'"><small>Halaman '+c.p+'</small><b>'+esc(c.t)+'</b></button>').join('')+
    '</div></div>':'');

  if($('ovOpen1'))$('ovOpen1').onclick=()=>openViewer(d.id,1,TERMS);
  if($('ovGoToc'))$('ovGoToc').onclick=()=>switchLTab('toc');
  if($('ovRunOcr'))$('ovRunOcr').onclick=()=>{openEdit(d.id,true);};
  $('vOverview').querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>openViewer(d.id,Number(b.getAttribute('data-op')),TERMS));
}

async function setActive(id){
  ACTIVE=id;
  document.querySelectorAll('.doc').forEach(x=>x.classList.toggle('on',x.getAttribute('data-id')===id));
  const d=docOf(id);
  $('tocDoc').textContent=d?d.title:'';
  if(!VIEW.pdf||VIEW.doc!==id)renderOverview();
  if(!searchable(d)){
    $('toc').innerHTML='<div class="empty"><span>'+(d&&d.status==='PERLU_OCR'?'Dokumen hasil scan belum diindeks. '+(ADMIN?'Klik ikon pensil atau tombol OCR AI untuk memprosesnya.':'PDF tetap bisa dibuka di penampil.'):'Daftar isi belum tersedia.')+'</span></div>';
    return;
  }
  $('toc').innerHTML='<div class="empty"><span>Memuat daftar bab &amp; pasal…</span></div>';
  try{await loadIdx([id]);}catch(e){$('toc').innerHTML='<div class="empty"><span>'+esc(errText(e))+'</span></div>';return;}
  if(ACTIVE===id){renderToc();if(!VIEW.pdf||VIEW.doc!==id||!$('vOverview').hidden)renderOverview();}
}

/* ---------- Pencarian + source badge ---------- */
async function search(){
  const q=$('q').value.trim(),terms=parseQ(q),no=++searchNo;TERMS=terms;SHOWN=60;
  if(!terms.length){HITS=[];$('tochits').innerHTML='';$('rcount').innerHTML=q?'Kata terlalu pendek (minimal 2 huruf).':'';if($('cntHits'))$('cntHits').hidden=true;renderResults();return;}
  const ids=DOCS.filter(d=>CHECK[d.id]&&searchable(d)).map(d=>d.id);
  if(!ids.length){HITS=[];$('tochits').innerHTML='';$('rcount').innerHTML='<b>Centang minimal satu dokumen</b> di tab Dokumen untuk mencari.';if($('cntHits'))$('cntHits').hidden=true;renderResults();return;}
  if(ids.some(id=>!(id in IDX))){$('rcount').textContent='Memuat indeks '+ids.filter(id=>!(id in IDX)).length+' dokumen…';
    try{await loadIdx(ids);}catch(e){$('rcount').textContent=errText(e);return;}if(no!==searchNo)return;}
  const R=terms.map(rx),out=[],th=[];let nd=0;
  ids.forEach((id,di)=>{const ix=IDX[id];if(!ix)return;if(!ix.n)ix.n=ix.pages.map(fold);let any=false;
    ix.n.forEach((f,i)=>{let score=0,at=-1;for(const r of R){r.lastIndex=0;const m=f.match(r);if(!m)return;score+=Math.min(m.length,30);r.lastIndex=0;const m1=r.exec(f);if(m1&&(at<0||m1.index<at))at=m1.index;}
      const sec=secOf(ix,i+1,at),sf=fold(sec);R.forEach(r=>{r.lastIndex=0;if(r.test(sf))score+=8;});out.push({id,p:i+1,score,sec,di});any=true;});
    if(any)nd++;
    ix.toc.forEach((t,k)=>{if(R.every(r=>{r.lastIndex=0;return r.test(ix.tf[k]);}))th.push({id,t});});});
  out.sort((a,b)=>b.score-a.score||a.di-b.di||a.p-b.p);HITS=out;$('results').scrollTop=0;
  if($('cntHits')){$('cntHits').textContent=out.length;$('cntHits').hidden=!out.length;}
  $('tochits').innerHTML=th.length?'<span>Bab/pasal cocok:</span>'+th.slice(0,8).map((x,i)=>'<button type="button" data-th="'+i+'" title="'+esc(docOf(x.id).title)+'">'+esc(x.t.t)+' · hal. '+x.t.p+'</button>').join(''):'';
  $('tochits').__th=th;
  $('rcount').innerHTML=out.length?'<b>'+out.length+' halaman</b> di '+nd+' dokumen <span>urut: paling relevan</span>':'<b>Tidak ditemukan</b> di '+ids.length+' dokumen yang dicentang.';
  renderResults();
}
function renderResults(){
  const box=$('results');
  if(!HITS.length){if(!TERMS.length)box.innerHTML='<div class="empty"><i class="ic" data-ic="search"></i><b>Cari di pedoman &amp; prosedur</b><span>Hasil menampilkan dokumen, nomor halaman, dan bab/pasal tempat kata itu muncul.</span></div>';else box.innerHTML='';paint(box);return;}
  const R=TERMS.map(rx);
  box.innerHTML=HITS.slice(0,SHOWN).map((h,i)=>{
    const d=docOf(h.id)||{},ix=IDX[h.id],isOcr=ix&&Array.isArray(ix.ocrPages)&&ix.ocrPages.indexOf(h.p)>=0;
    return '<button type="button" class="res'+(VIEW.doc===h.id&&VIEW.page===h.p?' on':'')+'" data-i="'+i+'">'+
      '<div class="rh"><b>'+esc(d.title)+(isOcr?'<span class="res-src">OCR AI</span>':'')+'</b><span class="pg">hal. '+h.p+'</span></div>'+
      (h.sec?'<div class="rp">'+markup(h.sec,fold(h.sec),R)+'</div>':'')+
      '<p>'+snippet(ix.pages[h.p-1]||'',R)+'</p></button>';
  }).join('')+(HITS.length>SHOWN?'<button type="button" class="more" id="moreBtn">Tampilkan '+Math.min(60,HITS.length-SHOWN)+' hasil berikutnya</button>':'');
}

/* ---------- Override openViewer / renderPage / drawHits (X-gap spacing & mode switcher) ---------- */
async function openViewer(id,page,terms){
  const d=docOf(id);if(!d)return;const tok=++VIEW.tok;
  $('lk').classList.add('view-open');
  if($('vModeBox'))$('vModeBox').hidden=false;
  setViewerMode('pdf');
  $('vTitle').textContent=d.title+(d.revision?' · '+d.revision:'');$('vTitle').title=d.title;
  if($('vStatusBadge')){const ok=searchable(d);$('vStatusBadge').hidden=false;$('vStatusBadge').className='lbadge '+(ok?'ok':'warn');$('vStatusBadge').textContent=ok?'Terindeks':'Perlu OCR';}
  if($('vOcrBtn'))$('vOcrBtn').hidden=!ADMIN;
  const dr=$('vDrive');if(d.fileUrl){dr.href=d.fileUrl;dr.hidden=false;}else dr.hidden=true;
  VIEW.terms=(terms||[]).slice();
  if(VIEW.doc!==id||!VIEW.pdf){VIEW.doc=id;VIEW.pdf=null;$('vTotal').textContent=d.pages||'–';$('vPage').value=page||1;
    vmsg('<div class="spin"></div><div>Memuat PDF…</div>');
    try{VIEW.pdf=await getPdf(id,tok);}catch(e){if(e===null||tok!==VIEW.tok)return;vmsg('<div>'+esc(errText(e))+'</div>'+(d.fileUrl?'<a class="vb" href="'+esc(d.fileUrl)+'" target="_blank" rel="noopener">Buka di Google Drive</a>':''));return;}
    if(tok!==VIEW.tok)return;VIEW.total=VIEW.pdf.numPages;$('vTotal').textContent=VIEW.total;}
  await renderPage(page||1);
}
async function renderPage(p){
  if(!VIEW.pdf)return;setViewerMode('pdf');
  p=Math.max(1,Math.min(VIEW.total,Math.round(Number(p)||1)));VIEW.page=p;$('vPage').value=p;const tok=++VIEW.tok;
  const L=await ensurePdfjs();let page;try{page=await VIEW.pdf.getPage(p);}catch(e){vmsg('<div>Halaman tidak bisa dibuka: '+esc(errText(e))+'</div>');return;}
  if(tok!==VIEW.tok)return;const box=$('vScroll');const avail=Math.max(260,box.clientWidth-36);VIEW.w=box.clientWidth;
  const v1=page.getViewport({scale:1}),scale=Math.max(.25,Math.min(6,avail/v1.width*VIEW.zoom)),vp=page.getViewport({scale});
  const dpr=Math.min(2,window.devicePixelRatio||1),cv=document.createElement('canvas');cv.width=Math.floor(vp.width*dpr);cv.height=Math.floor(vp.height*dpr);cv.style.width=Math.floor(vp.width)+'px';cv.style.height=Math.floor(vp.height)+'px';
  try{await page.render({canvasContext:cv.getContext('2d'),viewport:vp,transform:dpr!==1?[dpr,0,0,dpr,0,0]:null}).promise;}catch(e){if(tok===VIEW.tok)vmsg('<div>Gagal menampilkan halaman: '+esc(errText(e))+'</div>');return;}
  if(tok!==VIEW.tok)return;
  const w=$('pgWrap');w.innerHTML='';w.style.width=Math.floor(vp.width)+'px';w.style.height=Math.floor(vp.height)+'px';w.appendChild(cv);vclear();$('vEmpty').hidden=true;$('vOverview').hidden=true;w.hidden=false;
  $('zFit').textContent=Math.round(VIEW.zoom*100)+'%';
  VIEW.hits=[];VIEW.hi=-1;
  if(VIEW.terms.length){try{const tc=await page.getTextContent();if(tok!==VIEW.tok)return;drawHits(tc,vp,L);}catch(e){}}
  hitUi();if(VIEW.hits.length)gotoHit(0,true);else box.scrollTop=0;
  if(VIEW.doc===ACTIVE&&IDX[ACTIVE])renderToc();
  document.querySelectorAll('.res').forEach(b=>{const h=HITS[Number(b.getAttribute('data-i'))];b.classList.toggle('on',!!h&&h.id===VIEW.doc&&h.p===p);});
}
function drawHits(tc,vp,L){
  let s='',prevEnd=null,prevY=null;const items=[];
  tc.items.forEach(it=>{
    if(typeof it.str!=='string')return;
    const tr=it.transform||[1,0,0,1,0,0],fs=Math.hypot(tr[0],tr[1])||Math.hypot(tr[2],tr[3])||10,x=tr[4]||0,y=tr[5]||0,w=it.width||0;
    if(prevY!==null&&Math.abs(y-prevY)>2){if(s&&!/\\s$/.test(s))s+=' ';}
    else if(prevEnd!==null&&(x-prevEnd)>Math.max(1.8,fs*0.22)){if(s&&!/\\s$/.test(s))s+=' ';}
    items.push({st:s.length,it});s+=it.str+(it.hasEOL?' ':'');
    if(it.str.trim()){prevEnd=x+w;prevY=y;}
  });
  const f=fold(s),rg=ranges(f,VIEW.terms.map(rx)),w=$('pgWrap');
  rg.forEach(x=>{let first=null;items.forEach(o=>{const len=o.it.str.length;if(!len)return;const a=Math.max(x[0],o.st),b=Math.min(x[1],o.st+len);if(a>=b)return;
    const tx=L.Util.transform(vp.transform,o.it.transform),fh=Math.hypot(tx[2],tx[3])||10,W=(o.it.width||0)*vp.scale;if(!W)return;
    const fa=frac(o.it,tc.styles,a-o.st),fb=frac(o.it,tc.styles,b-o.st);
    const el=document.createElement('div');el.className='hl';el.style.left=(tx[4]+W*fa-1)+'px';el.style.top=(tx[5]-fh*0.92)+'px';el.style.width=(W*(fb-fa)+2)+'px';el.style.height=(fh*1.18)+'px';w.appendChild(el);if(!first)first=el;});
    if(first)VIEW.hits.push(first);});
}

/* ---------- LAPIS 1: Parser PDF X-gap, Font-Aware, Strip Header/Footer, Skip Daftar Isi ---------- */
function isBoldFont(it,styles){
  const fn=String(it.fontName||'');const st=styles&&styles[fn];
  const fam=String((st&&st.fontFamily)||fn);
  return /bold|black|heavy|demi|semi|medi/i.test(fn+' '+fam);
}
function pageLinesStruct(tc){
  const raw=[];let cur='',prevEnd=null,lastY=null,maxFs=0,boldChars=0,totChars=0,lineY=null;
  const push=()=>{
    const t=cur.replace(/\\s+/g,' ').trim();
    if(t){
      raw.push({t,fs:maxFs||11,bold:totChars>0&&(boldChars/totChars)>=0.6,y:lineY==null?0:lineY});
    }
    cur='';prevEnd=null;maxFs=0;boldChars=0;totChars=0;lineY=null;
  };
  (tc.items||[]).forEach(it=>{
    if(typeof it.str!=='string')return;
    const tr=it.transform||[1,0,0,1,0,0];
    const fs=Math.hypot(tr[0],tr[1])||Math.hypot(tr[2],tr[3])||11;
    const x=tr[4]||0,y=tr[5];
    const w=it.width||0;
    if(lastY!==null&&y!=null&&Math.abs(y-lastY)>Math.max(2.2,fs*0.35)&&cur.trim())push();
    if(prevEnd!==null&&cur&&!/\\s$/.test(cur)&&(x-prevEnd)>Math.max(1.8,fs*0.22))cur+=' ';
    cur+=it.str;
    const ns=it.str.replace(/\\s+/g,'').length;
    if(ns){
      lastY=y;if(lineY==null)lineY=y;
      if(fs>maxFs)maxFs=fs;
      totChars+=ns;if(isBoldFont(it,tc.styles))boldChars+=ns;
      prevEnd=x+w;
    }
    if(it.hasEOL)push();
  });
  push();
  return raw;
}
function pageLines(tc){return pageLinesStruct(tc).map(l=>l.t);}
function stripRunningChrome(structs){
  const n=structs.length;if(n<4)return structs;
  const freq={};
  const sig=s=>s.toLowerCase().replace(/\\d+/g,'#').replace(/\\s+/g,' ').trim();
  structs.forEach(ls=>{
    if(!ls.length)return;
    const picks=[0,1,ls.length-2,ls.length-1].filter((i,k,a)=>i>=0&&i<ls.length&&a.indexOf(i)===k);
    const seen=new Set();
    picks.forEach(i=>{
      const s=sig(ls[i].t);
      if(s.length>=4&&s.length<=110&&!seen.has(s)){seen.add(s);freq[s]=(freq[s]||0)+1;}
    });
  });
  const minHit=Math.max(3,Math.floor(n*0.45));
  return structs.map(ls=>{
    if(ls.length<=1)return ls;
    return ls.filter((l,i)=>{
      const edge=i<2||i>=ls.length-2;
      if(!edge)return true;
      return (freq[sig(l.t)]||0)<minHit;
    });
  });
}
function detectTocPages(structs){
  const out=new Set();
  const lead=/\\.{3,}|…{2,}|(\\s\\.){3,}/;
  const maxCheck=Math.min(structs.length,Math.max(6,Math.ceil(structs.length*0.3)));
  for(let i=0;i<maxCheck;i++){
    const ls=structs[i];if(!ls.length)continue;
    let hasHeader=false,tocRows=0;
    ls.forEach(l=>{
      const s=l.t.trim();
      if(/^(daftar\\s+(isi|tabel|gambar|lampiran)|table\\s+of\\s+contents)\\b/i.test(s))hasHeader=true;
      if(s.length<=130&&(lead.test(s)||(/\\s\\d{1,4}$/.test(s)&&!/^(pasal|bab|tahun|no\\.?)\\b/i.test(s)&&s.split(' ').length>=2)))tocRows++;
    });
    if(hasHeader||(tocRows>=4&&tocRows/ls.length>=0.32))out.add(i+1);
  }
  return out;
}
function computeBodySize(structs,tocPages){
  const hist={};
  structs.forEach((ls,pi)=>{
    if(tocPages&&tocPages.has(pi+1))return;
    ls.forEach(l=>{
      const b=Math.round(l.fs*2)/2;
      hist[b]=(hist[b]||0)+l.t.length;
    });
  });
  let best=11,max=0;
  Object.keys(hist).forEach(k=>{if(hist[k]>max){max=hist[k];best=Number(k);}});
  return best||11;
}
function isHeadingLineObj(s){
  return /^(BAB\\s+[IVXLC0-9]+|Pasal\\s+\\d+|Lampiran\\s+[A-Z0-9]+|(?:X{0,3}(?:IX|IV|V?I{0,3}))\\.\\s+\\S|[A-H]\\.\\s+[A-Z]|\\d{1,2}(?:\\.\\d{1,2}){0,2}\\.?\\s+[A-Z])/i.test(s);
}
function headingToc(input,tocPages){
  const structs=input.map(ls=>ls.map(x=>typeof x==='string'?{t:x,fs:11,bold:false,y:0}:x));
  const tocSet=tocPages||detectTocPages(structs);
  const bodySize=computeBodySize(structs,tocSet);
  const found=[];const lead=/\\.{3,}|…{2,}|(\\s\\.){3,}/;
  const contTitle=(ls,i,base)=>{
    let out='';
    for(let k=i+1;k<Math.min(ls.length,i+3);k++){
      const nx=ls[k],s=nx.t.trim();if(!s)continue;
      if(s.length>100||/^(\\(|\\d+[.)]|[a-z][.)]\\s|pasal\\b|bab\\b|lampiran\\b)/i.test(s)||lead.test(s)||isHeadingLineObj(s))break;
      if(base&&base.y&&nx.y&&Math.abs(base.y-nx.y)>Math.max(26,base.fs*2.2))break;
      if(base&&base.bold&&!nx.bold&&nx.fs<base.fs*0.95)break;
      out=(out?out+' ':'')+s.replace(/[.:;]+$/,'');
      base=nx;
      if(out.length>90)break;
    }
    return out;
  };
  let curBab='';
  structs.forEach((ls,pi)=>{
    if(tocSet.has(pi+1))return;
    ls.forEach((obj,i)=>{
      const s=obj.t.trim();if(!s||s.length>125||lead.test(s))return;let m;
      if((m=s.match(/^BAB\\s+([IVXLC]+|\\d{1,2})\\b[\\s.:\\-–]*(.*)$/i))&&(!m[2]||m[2].length<100)&&!/\\s\\d+$/.test(m[2]||'')){
        let t=(m[2]||'').replace(/[.:;]+$/,'');if(!t)t=contTitle(ls,i,obj);
        curBab='B'+m[1].toUpperCase();
        found.push({k:'BAB:'+m[1].toUpperCase()+':'+(pi+1),t:'BAB '+m[1].toUpperCase()+(t?' · '+cap(t):''),p:pi+1,l:1});return;
      }
      if((m=s.match(/^Lampiran\\s+([A-Z0-9]{1,3})\\b[\\s.:\\-–]*(.*)$/i))&&m[2].length<100){
        let t=(m[2]||'').replace(/[.:;]+$/,'');if(!t)t=contTitle(ls,i,obj);
        curBab='L'+m[1].toUpperCase();
        found.push({k:'LAMP:'+m[1].toUpperCase()+':'+(pi+1),t:'Lampiran '+m[1].toUpperCase()+(t?' · '+cap(t):''),p:pi+1,l:1});return;
      }
      if((m=s.match(/^Pasal\\s+(\\d{1,3}[A-Z]?)\\s*[.:\\-–]?\\s*(.*)$/i))&&(m[2].length<90)&&!/^(ayat|huruf|angka)\\b/i.test(m[2])&&!/\\s\\d+$/.test(m[2])){
        let t=(m[2]||'').replace(/[.:;]+$/,'');if(!t)t=contTitle(ls,i,obj);
        found.push({k:'PASAL:'+m[1].toUpperCase()+':'+(pi+1),t:'Pasal '+m[1].toUpperCase()+(t?' · '+cap(t):''),p:pi+1,l:2});
      }
    });
  });
  let toc=dedupePreserve(found);
  if(toc.length<3){const rt=romanTocStruct(structs,tocSet,bodySize,contTitle,lead);if(rt.length>=3)toc=rt;}
  if(toc.length<3){
    const num=[];let secCtx='';
    structs.forEach((ls,pi)=>{
      if(tocSet.has(pi+1))return;
      ls.forEach((obj,i)=>{
        const s=obj.t.trim();
        const m=s.match(/^(\\d{1,2}(?:\\.\\d{1,2}){0,2})\\.?\\s+([A-Z][^.;:]{2,95})$/);
        if(!m||lead.test(s)||/\\s\\d{1,4}$/.test(s))return;
        const words=m[2].trim().split(/\\s+/);
        const lv=m[1].split('.').length;
        const isHeadStyle=obj.bold||obj.fs>=bodySize*1.08;
        if(lv===1&&!isHeadStyle&&(words.length>9||/\\b(mengajukan|memberikan|melakukan|wajib|apabila|setelah|dengan|untuk|kepada|bahwa|tersebut)\\b/i.test(m[2])))return;
        if(words.length>13)return;
        let title=m[2].trim().replace(/[.:;]+$/,'');
        if(isHeadStyle&&words.length<=7&&/[a-zA-Z&\\-]$/.test(title)){
          const extra=contTitle(ls,i,obj);
          if(extra&&extra.split(/\\s+/).length<=5&&!/[.]$/.test(extra))title+=' '+extra;
        }
        if(lv===1)secCtx=m[1];
        num.push({k:'N:'+secCtx+':'+m[1]+':'+(pi+1),t:m[1]+' '+title,p:pi+1,l:lv});
      });
    });
    const nt=dedupePreserve(num);if(nt.length>=3)toc=nt;
  }
  return toc;
}
function romanTocStruct(structs,tocSet,bodySize,contTitle,lead){
  const out=[];let R='',A='',seen=0;
  structs.forEach((ls,pi)=>{
    if(tocSet.has(pi+1))return;
    ls.forEach((obj,i)=>{
      const s=obj.t.trim();
      if(!s||s.length>150||lead.test(s)||(/\\s\\d{1,4}$/.test(s)&&s.length<100))return;
      const isHeadStyle=obj.bold||obj.fs>=bodySize*1.06;
      let m;
      if((m=s.match(/^(X{0,3}(?:IX|IV|V?I{0,3}))\\.\\s+(\\S.{1,88})$/))&&m[1]&&(upish(m[2])||isHeadStyle)&&!/[,;]$/.test(m[2])){
        R=m[1];A='';seen++;
        out.push({k:'R:'+R+':'+(pi+1),t:R+'. '+cap(m[2].replace(/[.:]+$/,'')),p:pi+1,l:1});return;
      }
      if(!R)return;
      if((m=s.match(/^([A-H])\\.\\s+([A-Z][^]{2,})$/))&&!/;$/.test(m[2])&&(isHeadStyle||m[2].split(/\\s+/).length<=9)){
        A=m[1];out.push({k:'RA:'+R+A+':'+(pi+1),t:A+'. '+short(m[2]),p:pi+1,l:2});return;
      }
      if((m=s.match(/^(\\d{1,2}\\.\\d{1,2}(?:\\.\\d{1,2})?)\\.?\\s+([A-Z][^]{2,})$/))&&!/;$/.test(m[2])){
        let title=m[2].trim().replace(/[.:;]+$/,'');
        if(isHeadStyle&&title.split(/\\s+/).length<=7&&/[a-zA-Z&\\-]$/.test(title)){
          const extra=contTitle(ls,i,obj);
          if(extra&&extra.split(/\\s+/).length<=5)title+=' '+extra;
        }
        out.push({k:'RN:'+R+A+':'+m[1]+':'+(pi+1),t:m[1]+' '+short(title),p:pi+1,l:A?3:2});
      }
    });
  });
  return seen>=2?dedupePreserve(out):[];
}
function dedupePreserve(list){
  const seen={};const out=[];
  list.forEach(x=>{
    const key=x.k+'|'+fold(x.t);
    if(seen[key])return;seen[key]=true;
    out.push({t:x.t.slice(0,160),p:x.p,l:x.l});
  });
  return out.sort((a,b)=>a.p-b.p);
}

/* ---------- LAPIS 2: OCR Opsi 3 (Browser Render Scan Pages -> /api/library/ocr-page) ---------- */
async function renderScanPageJpeg(pdf,pageNo){
  const pg=await pdf.getPage(pageNo);
  const v1=pg.getViewport({scale:1});
  const scale=Math.max(1.2,Math.min(2.2,1440/Math.max(1,v1.width)));
  const vp=pg.getViewport({scale});
  const cv=document.createElement('canvas');
  cv.width=Math.floor(vp.width);cv.height=Math.floor(vp.height);
  await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
  pg.cleanup();
  const url=cv.toDataURL('image/jpeg',0.84);
  return url.replace(/^data:image\\/jpeg;base64,/,'');
}
async function ocrPagesWithAi(pdf,pageList,docTitle,onProgress,signal){
  const results=[];let done=0;const queue=pageList.slice();
  async function worker(){
    while(queue.length){
      if(signal&&signal.aborted)throw new Error('Proses OCR dihentikan.');
      const p=queue.shift();
      const b64=await renderScanPageJpeg(pdf,p);
      const r=await fetch('/api/library/ocr-page',{
        method:'POST',credentials:'same-origin',signal,
        headers:{'content-type':'application/json'},
        body:JSON.stringify({docTitle,page:p,totalPages:pdf.numPages,mediaType:'image/jpeg',imageBase64:b64})
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok||!j.ok)throw new Error((j&&j.error)||'Gagal OCR halaman '+p);
      results.push(j);done++;
      if(onProgress)onProgress(done,pageList.length,j);
    }
  }
  const nWorkers=Math.min(2,pageList.length);
  await Promise.all(Array.from({length:nWorkers},()=>worker()));
  return results.sort((a,b)=>a.page-b.page);
}
async function aiRefineToc(title,structs,tocSet){
  const cands=[];
  structs.forEach((ls,pi)=>{
    if(tocSet&&tocSet.has(pi+1))return;
    ls.forEach(l=>{
      const s=l.t.trim();
      if(!s||s.length>130)return;
      if(l.bold||l.fs>=12||isHeadingLineObj(s))cands.push({p:pi+1,t:s,b:l.bold,s:l.fs});
    });
  });
  if(!cands.length)return null;
  const r=await fetch('/api/library/toc-ai',{
    method:'POST',credentials:'same-origin',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({title,candidates:cands.slice(0,320)})
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.ok)throw new Error((j&&j.error)||'Gagal merapikan bab dengan AI.');
  return j.toc||[];
}

/* ---------- Override analyze & upload modal dengan konfirmasi OCR Opsi 3 ---------- */
function upEnsureOcrBox(){
  if($('upOcrBox'))return $('upOcrBox');
  const box=document.createElement('div');box.id='upOcrBox';box.className='ocr-panel';box.hidden=true;
  $('upSteps').parentNode.insertBefore(box,$('upPrev'));
  return box;
}
async function analyze(file){
  if(!UP||UP.busy)return;
  if(!/\\.pdf$/i.test(file.name)&&file.type!=='application/pdf'){$('upInfo').textContent='Pilih file PDF (.pdf).';return;}
  if(file.size>UP_MAX){$('upInfo').textContent='Ukuran file '+(file.size/1048576).toFixed(1).replace('.',',')+' MB melebihi batas 30 MB. Kompres PDF terlebih dahulu.';return;}
  UP={busy:true,file,steps:[{t:'Buka file PDF',st:'r'},{t:'Baca teks & struktur per halaman',st:'w'},{t:'Susun daftar bab & pasal',st:'w'},{t:'Unggah ke Drive Library',st:'w'},{t:'Simpan indeks pencarian',st:'w'}]};
  $('upSave').disabled=true;$('upPrev').hidden=true;upEnsureOcrBox().hidden=true;
  $('upName').textContent=file.name;$('upInfo').textContent=(file.size/1048576).toFixed(1).replace('.',',')+' MB';
  if(!$('upTitle').value.trim())$('upTitle').value=file.name.replace(/\\.pdf$/i,'').replace(/[_]+/g,' ').replace(/\\s+/g,' ').trim();
  steps(UP.steps);
  try{
    const L=await ensurePdfjs();const buf=new Uint8Array(await file.arrayBuffer());UP.bytes=buf;
    const pdf=await L.getDocument({data:buf.slice()}).promise;UP.pdf=pdf;stepSet(0,'d',pdf.numPages+' halaman');
    let structs=[];stepSet(1,'r','0 / '+pdf.numPages,0);
    for(let i=1;i<=pdf.numPages;i++){
      const pg=await pdf.getPage(i),tc=await pg.getTextContent();
      structs.push(pageLinesStruct(tc));pg.cleanup();
      if(i%3===0||i===pdf.numPages)stepSet(1,'r',i+' / '+pdf.numPages,i/pdf.numPages*100);
    }
    structs=stripRunningChrome(structs);
    const tocSet=detectTocPages(structs);
    const pages=structs.map(ls=>ls.map(l=>l.t).join('\\n'));
    const scanPages=[];
    pages.forEach((p,idx)=>{if(p.replace(/\\s+/g,'').length<40)scanPages.push(idx+1);});
    const scan=scanPages.length===pages.length;
    stepSet(1,scanPages.length?'w':'d',scanPages.length?(pages.length-scanPages.length)+' teks · '+scanPages.length+' hal. scan':pdf.numPages+' / '+pdf.numPages);
    stepSet(2,'r','');let toc=[],src='';
    try{toc=await outlineToc(pdf);if(toc.length>=3)src='bookmark PDF';}catch(e){toc=[];}
    if(toc.length<3){toc=headingToc(structs,tocSet);src=toc.length?'parser struktur + font':'';}
    stepSet(2,toc.length?'d':'w',toc.length?toc.length+' bagian · dari '+src:'tidak terdeteksi');
    UP.structs=structs;UP.tocSet=tocSet;UP.scanPages=scanPages;UP.ocrPages=[];
    UP.index={v:1,pages,toc,outline:src==='bookmark PDF',ocrPages:[],tocPages:Array.from(tocSet)};UP.pages=pages.length;UP.scan=scan;
    const l1=toc.filter(t=>t.l===1).length,l2=toc.filter(t=>t.l===2).length;
    $('upPrev').hidden=false;$('upPrev').className='prev'+(scanPages.length?' warn':'');
    $('upPrev').innerHTML=(scanPages.length?'<b>Deteksi per halaman:</b> ditemukan <b>'+scanPages.length+' dari '+pages.length+' halaman</b> berupa gambar/scan tanpa teks. ':'')+
      'Struktur terdeteksi: <b>'+(toc.length?((l1?l1+' bab':'')+(l1&&l2?' · ':'')+(l2?l2+' sub-bab':'')||toc.length+' bagian'):'belum ada')+'</b>'+
      (tocSet.size?' (hal. Daftar Isi '+Array.from(tocSet).join(', ')+' dikecualikan otomatis).':'.');

    if(scanPages.length){
      if(ADMIN&&!OCR_STATUS.enabled)await fetchOcrStatus();
      const ob=upEnsureOcrBox();ob.hidden=false;
      if(OCR_STATUS.configured){
        ob.innerHTML='<div class="ocr-panel-h"><span>OCR AI Siap (Opsi 3 · Hemat Kuota)</span><span class="lbadge info">'+scanPages.length+' hal. scan</span></div>'+
          '<p>Hanya <b>'+scanPages.length+' halaman scan</b> yang akan dikirim ke Claude Vision ('+esc(OCR_STATUS.model||'Haiku')+'). Sisa kuota hari ini: <b>'+OCR_STATUS.remaining+' hal.</b></p>'+
          '<div class="ocr-acts"><button type="button" class="pri" id="upRunOcr">Jalankan OCR AI ('+scanPages.length+' hal.)</button><button type="button" id="upSkipOcr">Lewati (Simpan dulu)</button></div>';
        $('upSkipOcr').onclick=()=>{ob.hidden=true;};
        $('upRunOcr').onclick=()=>runUploadOcr();
      }else{
        ob.innerHTML='<div class="ocr-panel-h"><span>Halaman Scan Terdeteksi</span><span class="lbadge warn">'+scanPages.length+' hal.</span></div>'+
          '<p>Dokumen tetap bisa disimpan dan dibuka. Untuk mengaktifkan OCR AI otomatis, isi <code>ANTHROPIC_API_KEY</code> di konfigurasi server.</p>';
      }
    }
    UP.busy=false;$('upSave').disabled=false;
  }catch(e){UP.busy=false;const i=UP.steps.findIndex(s=>s.st==='r');if(i>=0)stepSet(i,'e',errText(e));}
}
async function runUploadOcr(){
  if(!UP||!UP.pdf||!UP.scanPages||!UP.scanPages.length)return;
  UP.busy=true;$('upSave').disabled=true;
  const ac=new AbortController();UP.ocrAbort=ac;
  const ob=upEnsureOcrBox();
  ob.innerHTML='<div class="ocr-panel-h"><span>Memproses OCR AI…</span><span id="upOcrCnt">0 / '+UP.scanPages.length+' hal.</span></div><div class="bar"><span id="upOcrBar" style="width:0%"></span></div><div class="ocr-acts"><button type="button" id="upOcrStop">Hentikan</button></div>';
  $('upOcrStop').onclick=()=>ac.abort();
  try{
    const res=await ocrPagesWithAi(UP.pdf,UP.scanPages,$('upTitle').value.trim(),(done,tot)=>{
      if($('upOcrCnt'))$('upOcrCnt').textContent=done+' / '+tot+' hal.';
      if($('upOcrBar'))$('upOcrBar').style.width=Math.round(done/tot*100)+'%';
    },ac.signal);
    const ocrHeadingList=[];
    res.forEach(r=>{
      UP.index.pages[r.page-1]=r.text||'';
      if(UP.index.ocrPages.indexOf(r.page)<0)UP.index.ocrPages.push(r.page);
      if(r.isTocPage&&UP.index.tocPages.indexOf(r.page)<0)UP.index.tocPages.push(r.page);
      if(!r.isTocPage&&Array.isArray(r.headings))r.headings.forEach(h=>ocrHeadingList.push(h));
    });
    if(!UP.index.outline){
      const merged=UP.index.toc.concat(ocrHeadingList);
      UP.index.toc=merged.filter((x,i,a)=>a.findIndex(y=>y.p===x.p&&fold(y.t)===fold(x.t))===i).sort((a,b)=>a.p-b.p);
    }
    UP.scan=false;stepSet(1,'d',UP.pages+' hal. (termasuk '+res.length+' OCR AI)');
    stepSet(2,UP.index.toc.length?'d':'w',UP.index.toc.length?UP.index.toc.length+' bagian':'tidak terdeteksi');
    ob.innerHTML='<div class="ocr-panel-h"><span>OCR AI Selesai</span><span class="lbadge ok">'+res.length+' halaman terbaca</span></div><p>Seluruh halaman scan sudah terindeks dan siap dicari. Klik <b>Simpan ke Library</b>.</p>';
    $('upPrev').className='prev';
    await fetchOcrStatus();
  }catch(e){
    ob.innerHTML='<div class="ocr-panel-h"><span>OCR AI Berhenti</span></div><p>'+esc(errText(e))+'</p>';
  }finally{UP.busy=false;$('upSave').disabled=false;}
}

/* ---------- Override openEdit + OCR Ulang Dokumen Lama + AI Rapikan TOC ---------- */
function edEnsureAiBtns(){
  const row=document.querySelector('#edOv .edauto');if(!row||$('edOcrBtn'))return;
  const b1=document.createElement('button');b1.type='button';b1.id='edOcrBtn';b1.textContent='OCR AI (Opsi 3)';
  const b2=document.createElement('button');b2.type='button';b2.id='edAiTocBtn';b2.textContent='Rapikan Bab dgn AI';
  row.insertBefore(b2,row.querySelector('small'));
  row.insertBefore(b1,b2);
  b1.onclick=()=>runExistingDocOcr(ED&&ED.id);
  b2.onclick=()=>runExistingTocAi();
}
async function openEdit(id,autoOcrPrompt){
  const d=docOf(id);if(!d)return;edEnsureAiBtns();
  if(ADMIN&&!OCR_STATUS.enabled)await fetchOcrStatus();
  ED={id,working:false};$('edTitle').value=d.title;catOptions($('edCat'),d.category);$('edRev').value=d.revision;$('edDate').value=d.effective;$('edNote').value=d.note;
  $('edInfo').textContent=[d.fileName,d.pages?d.pages+' hal':'',d.size?(d.size/1048576).toFixed(1).replace('.',',')+' MB':'',d.at?'diunggah '+d.at+(d.by?' oleh '+d.by:''):''].filter(Boolean).join(' · ');
  $('edToc').value='Memuat…';$('edToc').disabled=true;$('edSave').disabled=false;
  if($('edOcrBtn'))$('edOcrBtn').hidden=!OCR_STATUS.configured;
  if($('edAiTocBtn'))$('edAiTocBtn').hidden=!OCR_STATUS.configured;
  openModal('edOv');
  if(!searchable(d)&&d.status!=='PERLU_OCR'){$('edToc').value='';return;}
  try{await loadIdx([id]);const ix=IDX[id];$('edToc').value=ix?ix.toc.map(t=>'  '.repeat(t.l-1)+t.t+' | '+t.p).join('\\n'):'';$('edToc').disabled=!ix;}catch(e){$('edToc').value='';}
  ED.toc0=$('edToc').value;
  if(autoOcrPrompt&&OCR_STATUS.configured)runExistingDocOcr(id);
}
$('edAuto').onclick=()=>{
  if(!ED)return;const ix=IDX[ED.id];if(!ix||!ix.pages){$('edInfo').textContent='Teks dokumen belum dimuat.';return;}
  const structs=ix.pages.map(p=>String(p||'').split('\\n').map(t=>({t,fs:11,bold:false,y:0})));
  const toc=headingToc(structs,new Set(ix.tocPages||[]));
  if(!toc.length){$('edInfo').textContent='Tidak ada pola judul yang terdeteksi otomatis. Coba "Rapikan Bab dgn AI" atau isi manual.';return;}
  $('edToc').value=toc.map(t=>'  '.repeat(t.l-1)+t.t+' | '+t.p).join('\\n');$('edToc').disabled=false;$('edInfo').textContent=toc.length+' bagian terdeteksi (Lapis 1) · klik Simpan perubahan.';
};
async function runExistingTocAi(){
  if(!ED||ED.working)return;const ix=IDX[ED.id];if(!ix||!ix.pages){$('edInfo').textContent='Teks dokumen belum dimuat.';return;}
  ED.working=true;$('edAiTocBtn').disabled=true;$('edInfo').textContent='Merapikan daftar bab & pasal dengan AI…';
  try{
    const tocSet=new Set(ix.tocPages||[]);
    const structs=ix.pages.map(p=>String(p||'').split('\\n').filter(Boolean).map(t=>({t,fs:11,bold:/^(BAB|Pasal|Lampiran|[IVX]+\\.|\\d+\\.\\d+)/i.test(t)})));
    const toc=await aiRefineToc($('edTitle').value.trim(),structs,tocSet);
    if(!toc||!toc.length)throw new Error('AI tidak menemukan struktur bab baru.');
    $('edToc').value=toc.map(t=>'  '.repeat(t.l-1)+t.t+' | '+t.p).join('\\n');$('edToc').disabled=false;
    $('edInfo').textContent=toc.length+' bab/pasal dirapikan oleh AI · periksa lalu klik Simpan perubahan.';
    await fetchOcrStatus();
  }catch(e){$('edInfo').textContent=errText(e);}finally{ED.working=false;$('edAiTocBtn').disabled=false;}
}
async function runExistingDocOcr(id,onlyPage){
  if(!id||(ED&&ED.working))return;const d=docOf(id);if(!d)return;
  if(!OCR_STATUS.configured){note('ANTHROPIC_API_KEY belum diisi untuk OCR AI.',true);return;}
  if(ED){ED.working=true;if($('edOcrBtn'))$('edOcrBtn').disabled=true;$('edInfo').textContent='Memuat PDF asli dari Drive untuk OCR…';}
  else note('Memuat PDF untuk OCR AI…');
  try{
    const pdf=await getPdf(id,VIEW.tok);
    if(!IDX[id])await loadIdx([id]).catch(()=>{});
    const ix=IDX[id]||{v:1,pages:Array(pdf.numPages).fill(''),toc:[],ocrPages:[],tocPages:[]};
    while(ix.pages.length<pdf.numPages)ix.pages.push('');
    let targets=onlyPage?[onlyPage]:[];
    if(!targets.length){
      ix.pages.forEach((p,idx)=>{if(String(p||'').replace(/\\s+/g,'').length<40)targets.push(idx+1);});
    }
    if(!targets.length)targets=Array.from({length:pdf.numPages},(_,i)=>i+1);
    const msg='Menjalankan OCR AI untuk '+targets.length+' halaman…';
    if(ED)$('edInfo').textContent=msg;else note(msg);
    const res=await ocrPagesWithAi(pdf,targets,d.title,(done,tot)=>{
      const m='OCR AI: '+done+' / '+tot+' halaman…';
      if(ED)$('edInfo').textContent=m;else note(m);
    });
    ix.ocrPages=Array.isArray(ix.ocrPages)?ix.ocrPages:[];
    ix.tocPages=Array.isArray(ix.tocPages)?ix.tocPages:[];
    const extraHeadings=[];
    res.forEach(r=>{
      ix.pages[r.page-1]=r.text||'';
      if(ix.ocrPages.indexOf(r.page)<0)ix.ocrPages.push(r.page);
      if(r.isTocPage&&ix.tocPages.indexOf(r.page)<0)ix.tocPages.push(r.page);
      if(!r.isTocPage&&Array.isArray(r.headings))r.headings.forEach(h=>extraHeadings.push(h));
    });
    if(extraHeadings.length){
      const cleanOld=(ix.toc||[]).filter(t=>!onlyPage||t.p!==onlyPage);
      ix.toc=cleanOld.concat(extraHeadings).filter((x,i,a)=>a.findIndex(y=>y.p===x.p&&fold(y.t)===fold(x.t))===i).sort((a,b)=>a.p-b.p);
    }
    if(ED)$('edInfo').textContent='Menyimpan hasil OCR ke Drive…';else note('Menyimpan hasil OCR ke Drive…');
    const saved=await rpc('libUpdateIndex',[token,id,JSON.stringify(ix)]);
    IDX[id]=Object.assign({},ix,{n:ix.pages.map(fold),tf:ix.toc.map(t=>fold(t.t))});
    const idxPos=DOCS.findIndex(x=>x.id===id);if(idxPos>=0&&saved.doc)DOCS[idxPos]=saved.doc;
    if(saved.doc&&saved.doc.status==='TERINDEKS')CHECK[id]=true;
    if(ED&&!$('edOv').hidden){$('edToc').value=ix.toc.map(t=>'  '.repeat(t.l-1)+t.t+' | '+t.p).join('\\n');$('edToc').disabled=false;ED.toc0=$('edToc').value;$('edInfo').textContent='OCR AI selesai ('+res.length+' halaman) dan indeks diperbarui.';}
    else{note('OCR AI selesai untuk '+res.length+' halaman.');setTimeout(()=>note(''),5000);}
    renderCats();renderDocs();if(ACTIVE===id){TOCDOC=null;renderToc();renderOverview();}
    await fetchOcrStatus();
  }catch(e){if(ED)$('edInfo').textContent=errText(e);else note(errText(e),true);}
  finally{if(ED){ED.working=false;if($('edOcrBtn'))$('edOcrBtn').disabled=false;}}
}
if($('vOcrBtn'))$('vOcrBtn').onclick=()=>{
  if(!ACTIVE)return;
  if(VIEW.pdf&&!$('pgWrap').hidden)runExistingDocOcr(ACTIVE,VIEW.page);
  else openEdit(ACTIVE,true);
};

/* ---------- Muat awal & pembersihan modal ---------- */
const _origUpClick=$('upBtn').onclick;
$('upBtn').onclick=()=>{if(_origUpClick)_origUpClick();if($('upOcrBox'))$('upOcrBox').hidden=true;};
const _origLoadList=loadList;
loadList=async function(){
  const r=await _origLoadList();
  if(ADMIN)await fetchOcrStatus();
  return r;
};
setTimeout(()=>{if(ADMIN&&!OCR_STATUS.enabled)fetchOcrStatus();},400);
`;

const HTML_PATCHES = [
  {
    file: 'Library',
    find: '.toc{font-size:12.5px}.toc .tt b{font-weight:inherit}\n</style>',
    replace: '.toc{font-size:12.5px}.toc .tt b{font-weight:inherit}\n' + LIBRARY_V2_CSS + '\n</style>',
  },
  {
    file: 'Library',
    find: `<main class="lk" id="lk">
  <div class="lk-note" id="note" role="status" aria-live="polite" hidden></div>
  <section class="lk-col lk-docs" id="colDocs" aria-label="Dokumen library">
    <button type="button" class="dhead" id="docToggle" aria-expanded="true" aria-controls="docBody" title="Ciutkan atau tampilkan daftar dokumen"><span class="lk-h"><b>Dokumen library</b><small id="docCount">Memuat daftar dokumen…</small></span><i class="ic chev" data-ic="chevr"></i></button>
    <div class="dbody" id="docBody">
      <div class="chips" id="cats" role="group" aria-label="Filter kategori"></div>
      <label class="dfilter"><i class="ic" data-ic="search"></i><input id="docFilter" type="search" placeholder="Saring judul dokumen" aria-label="Saring judul dokumen"></label>
      <div class="dsel"><button type="button" id="selAll">Centang semua</button><button type="button" id="selNone">Kosongkan</button></div>
      <div class="doclist" id="docList"></div>
    </div>
    <button type="button" class="dmini" id="docMini" hidden><span id="docMiniTxt"></span><b>Tampilkan</b></button>
    <div class="toc-h"><div class="lk-h"><b>Daftar bab &amp; pasal</b><small id="tocDoc">Pilih dokumen untuk melihat daftar isinya</small></div><span class="tocact" id="tocAct" hidden><button type="button" id="tocOpen" title="Buka semua sub-bab">Buka semua</button><button type="button" id="tocClose" title="Tutup semua sub-bab">Tutup</button></span></div>
    <div class="toc" id="toc"></div>
  </section>
  <section class="lk-col lk-search" id="colSearch" aria-label="Pencarian">
    <form class="sbox" id="sForm" role="search"><i class="ic" data-ic="search"></i><input id="q" type="search" placeholder="Cari kata atau frasa, mis. adendum" aria-label="Kata yang dicari" autocomplete="off"><button type="submit" class="sgo">Cari</button></form>
    <div class="shint"><span class="kbd" id="scope">0 dokumen</span> Pakai tanda kutip untuk frasa, misal <code>"perubahan nilai kontrak"</code>. Beberapa kata = halaman yang memuat semua kata.</div>
    <div id="tochits"></div>
    <div class="rcount" id="rcount"></div>
    <div class="results" id="results"><div class="empty"><i class="ic" data-ic="search"></i><b>Cari di pedoman &amp; prosedur</b><span>Hasil menampilkan dokumen, nomor halaman, dan bab/pasal tempat kata itu muncul.</span></div></div>
  </section>
  <section class="lk-col lk-view" id="colView" aria-label="Penampil PDF">
    <div class="vbar">
      <div class="vtop"><b id="vTitle">Penampil PDF</b><a id="vDrive" class="vb" href="#" target="_blank" rel="noopener" hidden title="Buka di Google Drive"><i class="ic" data-ic="ext"></i><span>Drive</span></a><button type="button" class="vb vclose" id="vClose" aria-label="Tutup penampil"><i class="ic" data-ic="x"></i></button></div>
      <div class="vctl">
        <span class="vnav"><button type="button" id="vPrev" aria-label="Halaman sebelumnya"><i class="ic" data-ic="chevl"></i></button><label>hal.<input id="vPage" inputmode="numeric" value="–" aria-label="Nomor halaman"></label><span>/ <b id="vTotal">–</b></span><button type="button" id="vNext" aria-label="Halaman berikutnya"><i class="ic" data-ic="chevr"></i></button></span>
        <span class="vhit" id="vHitBox" hidden><button type="button" id="hPrev" aria-label="Temuan sebelumnya"><i class="ic" data-ic="chevl"></i></button><span id="vHit"></span><button type="button" id="hNext" aria-label="Temuan berikutnya"><i class="ic" data-ic="chevr"></i></button></span>
        <span class="vzoom"><button type="button" id="zOut" aria-label="Perkecil">−</button><button type="button" id="zFit" title="Pas lebar">100%</button><button type="button" id="zIn" aria-label="Perbesar">+</button></span>
      </div>
    </div>
    <div class="vscroll" id="vScroll"><div class="vempty" id="vEmpty"><i class="ic" data-ic="doc"></i><b>Belum ada dokumen dibuka</b><span>Klik hasil pencarian atau bab/pasal untuk membuka halaman PDF di sini.</span></div><div class="pgwrap" id="pgWrap" hidden></div></div>
  </section>
</main>`,
    replace: LIBRARY_MAIN_HTML,
  },
  {
    file: 'Library',
    find: `$('docToggle').onclick=()=>docMin(!$('colDocs').classList.contains('min'));
$('docMini').onclick=()=>docMin(false);`,
    replace: `function docMin(){}`,
  },
  {
    file: 'Library',
    find: `if($('colDocs').classList.contains('min'))docMin(true);`,
    replace: ``,
  },
  {
    file: 'Library',
    find: `function docMin(v){const c=$('colDocs');c.classList.toggle('min',v);$('docToggle').setAttribute('aria-expanded',String(!v));$('docMini').hidden=!v;
  if(v){const n=DOCS.filter(d=>CHECK[d.id]&&searchable(d)).length;$('docMiniTxt').textContent=n+' dari '+DOCS.length+' dokumen dicentang untuk pencarian';}}`,
    replace: `function docMin(){}`,
  },
  {
    file: 'Library',
    find: `</script><?!= include('AccountMenu') ?>`,
    replace: LIBRARY_V2_SCRIPT + `\n</script><?!= include('AccountMenu') ?>`,
  },
];

const GS_PATCHES = [
  {
    file: 'LibraryApi',
    find: `function libCheckIndex_(json) {
  let idx;
  try { idx = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { throw new Error('Indeks dokumen rusak. Ulangi unggah.'); }
  if (!idx || !Array.isArray(idx.pages) || !idx.pages.length) throw new Error('Indeks halaman dokumen kosong.');
  if (idx.pages.length > 3000) throw new Error('Dokumen lebih dari 3.000 halaman.');
  const pages = idx.pages.map(function(p) { return String(p == null ? '' : p).slice(0, 60000); });
  const chars = pages.reduce(function(s, p) { return s + p.replace(/\\s+/g, '').length; }, 0);
  return { v: 1, pages: pages, toc: libCleanToc_(idx.toc, pages.length), outline: !!idx.outline, scan: chars < pages.length * 40, chars: chars };
}`,
    replace: `function libCheckIndex_(json) {
  let idx;
  try { idx = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { throw new Error('Indeks dokumen rusak. Ulangi unggah.'); }
  if (!idx || !Array.isArray(idx.pages) || !idx.pages.length) throw new Error('Indeks halaman dokumen kosong.');
  if (idx.pages.length > 3000) throw new Error('Dokumen lebih dari 3.000 halaman.');
  const pages = idx.pages.map(function(p) { return String(p == null ? '' : p).slice(0, 60000); });
  const chars = pages.reduce(function(s, p) { return s + p.replace(/\\s+/g, '').length; }, 0);
  const ocrPages = Array.isArray(idx.ocrPages) ? idx.ocrPages.map(Number).filter(function(n) { return n >= 1 && n <= pages.length; }) : [];
  const tocPages = Array.isArray(idx.tocPages) ? idx.tocPages.map(Number).filter(function(n) { return n >= 1 && n <= pages.length; }) : [];
  const scan = chars < 40 || (chars < pages.length * 40 && !ocrPages.length);
  return { v: 1, pages: pages, toc: libCleanToc_(idx.toc, pages.length), outline: !!idx.outline, scan: scan, chars: chars, ocrPages: ocrPages, tocPages: tocPages };
}

/** ADMIN: simpan pembaruan teks hasil OCR AI dan daftar bab/pasal ke file indeks Drive. */
function libUpdateIndex(token, id, indexJson) {
  libAdmin_(token);
  const r = libFind_(id);
  const idx = libCheckIndex_(indexJson);
  let indexId = String(r.INDEX_ID || '');
  if (indexId) {
    DriveApp.getFileById(indexId).setContent(JSON.stringify(idx));
  } else {
    const ixFile = libSub_('_indeks').createFile(String(id) + '.json', JSON.stringify(idx), MimeType.PLAIN_TEXT);
    indexId = ixFile.getId();
  }
  const status = idx.scan ? 'PERLU_OCR' : 'TERINDEKS', now = libNow_();
  const lock = pmoLock_('LIB'); lock.waitLock(30000);
  try {
    const sh = libEnsure_();
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim().toUpperCase(); });
    const set = function(k, v) { const c = head.indexOf(k); if (c >= 0) sh.getRange(r._row, c + 1).setNumberFormat('@').setValue(v); };
    set('INDEX_ID', indexId);
    set('STATUS', status);
    set('JML_HAL', String(idx.pages.length));
    set('JML_BAGIAN', String(idx.toc.length));
    set('DIPERBARUI', now);
  } finally { lock.releaseLock(); }
  return { success: true, doc: libView_(libFind_(id)) };
}`,
  },
];

module.exports = { HTML_PATCHES, GS_PATCHES };

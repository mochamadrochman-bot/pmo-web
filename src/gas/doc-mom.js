'use strict';

/**
 * Document Control · MoM (risalah rapat), Surat masuk, Surat keluar (22 Nov 2026).
 *
 * - Tiga kategori baru di register (tahap Pelaksanaan). Perihal = JUDUL, Nomor, Tanggal, dan PIHAK
 *   (surat masuk: dari · surat keluar: kepada · MoM: pimpinan rapat) tetap di DOC_REGISTER.
 *   Isian khusus (kepada, penandatangan, tembusan, tempat, waktu, peserta, notulis, ...) di tabel doc_meta.
 * - Baca otomatis TANPA AI: teks PDF dibaca pdf.js di browser; PDF hasil scan / gambar dibaca OCR Tesseract
 *   (berjalan di browser, data bahasa Indonesia + Inggris disajikan dari server sendiri). Pola baca: src/gas/doc-parse.js.
 *   Hasil hanya mengisi kotak sebagai usulan (ditandai "terbaca otomatis"), tetap diperiksa sebelum disimpan.
 * - MoM: daftar tindak lanjut opsional (uraian, PIC, pihak, batas waktu, status, catatan, bukti) + tab
 *   "Tindak lanjut MoM" (rekap seluruh MoM proyek, lewat batas ditandai).
 * - Kontraktor: boleh membuka Document Control, tetapi hanya melihat MoM proyeknya dan memperbarui status butir
 *   tindak lanjut dengan pihak KONTRAKTOR (dicek di server: routes/docmeta.js dan patch DocApi di bawah).
 */

const parse = require('./doc-parse');

const GS_PATCHES = [
  { file: 'DocApi', find: "    { k: 'LAINNYA', n: 'Dokumen lain', t: 'LAINNYA' }",
    replace: "    { k: 'MOM', n: 'MoM / risalah rapat', t: 'PELAKSANAAN', sub: { INTERNAL: 'Rapat internal', EKSTERNAL: 'Rapat dengan pihak luar' } },\n" +
      "    { k: 'SURAT_MASUK', n: 'Surat masuk', t: 'PELAKSANAAN' },\n" +
      "    { k: 'SURAT_KELUAR', n: 'Surat keluar', t: 'PELAKSANAAN' },\n" +
      "    { k: 'LAINNYA', n: 'Dokumen lain', t: 'LAINNYA' }" },
  // Impor folder: tebak kategori dari nama berkas / sub-folder.
  { file: 'DocApi', find: '  const rules = [\n',
    replace: "  const rules = [\n    [/(risalah|notulen|notula|minutes of meeting|\\bmom\\b|\\bmom\\s)/, 'MOM', 'INTERNAL'],\n" +
      "    [/(surat masuk|incoming letter|\\bsm\\b)/, 'SURAT_MASUK', ''],\n    [/(surat keluar|outgoing letter|\\bsk\\b)/, 'SURAT_KELUAR', ''],\n" },
  { file: 'DocApi', find: "  if (g.kat === 'BAST') g.sub =",
    replace: "  if (g.kat === 'MOM') g.sub = /(ekstern|external|sosialisasi|masyarakat|dinas|vendor|kontraktor)/.test(full) ? 'EKSTERNAL' : 'INTERNAL';\n  if (g.kat === 'BAST') g.sub =" },
  // Kontraktor: hanya MoM proyeknya, tanpa hak ubah register / paket arsip.
  { file: 'DocApi', find: '  const regs = all.filter(function(r) { return r.pid === p.id; });',
    replace: "  const __ktr = ktrIs_(user);\n  const regs = all.filter(function(r) { return r.pid === p.id && (!__ktr || r.kat === 'MOM'); });" },
  { file: 'DocApi', find: '    canManage: userCanOperateProject_(user, p),\n    projects: list.map(function(x) { return { id: x.id, name: x.name, docs: all.filter(function(r) { return r.pid === x.id; }).length }; }),',
    replace: "    canManage: !__ktr && userCanOperateProject_(user, p),\n    ktr: __ktr,\n    projects: list.map(function(x) { return { id: x.id, name: x.name, docs: all.filter(function(r) { return r.pid === x.id && (!__ktr || r.kat === 'MOM'); }).length }; })," },
  { file: 'DocApi', find: '    packages: docPackages_(p.id).slice(0, 12),', replace: '    packages: __ktr ? [] : docPackages_(p.id).slice(0, 12),' },
  { file: 'DocApi', find: "  if (!r) throw new Error('Dokumen tidak ditemukan.');\n  if (docMicrosoftLink_(r.url))",
    replace: "  if (!r) throw new Error('Dokumen tidak ditemukan.');\n  if (ktrIs_(ctx.user) && r.kat !== 'MOM') throw new Error('Dokumen tidak tersedia untuk akun ini.');\n  if (docMicrosoftLink_(r.url))" },
  { file: 'DocApi', find: "  if (!r) return { id: id, skip: 'Dokumen tidak ditemukan.' };",
    replace: "  if (!r) return { id: id, skip: 'Dokumen tidak ditemukan.' };\n  if (ktrIs_(ctx.user) && r.kat !== 'MOM') return { id: id, skip: 'Dokumen tidak tersedia untuk akun ini.' };" },
];

const DOCMOM_JS = String.raw`<style>
.dmx{margin:14px 0 4px;padding:12px 14px;border:1px solid var(--line,#dbe4ee);border-radius:12px;background:var(--soft,#f7fafc)}
.dmx-h{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:8px}.dmx-h b{font-size:13px}.dmx-h span{font-size:12px;color:var(--muted,#5b7085)}
.dmx-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px}.dmx-g .fld{margin:0}.dmx-g .wide{grid-column:1/-1}
.dmx-ar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0 2px;padding:10px 12px;border:1px dashed #b9cde0;border-radius:10px;background:rgba(37,99,235,.04)}
.dmx-ar .btn{white-space:nowrap}.dmx-ar span{font-size:12.5px;color:var(--muted,#5b7085);flex:1;min-width:200px}.dmx-ar span.err{color:#b45309}.dmx-ar span.ok{color:#047857}
.dmx-ar span.run::before{content:"";display:inline-block;width:11px;height:11px;margin-right:6px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:dmxs .8s linear infinite;vertical-align:-1px}
@keyframes dmxs{to{transform:rotate(360deg)}}
.inp.dmx-auto{background:#fff8e1!important;border-color:#f2c14e!important}
.dmx-act{margin-top:12px}.dmx-tg{display:flex;gap:8px;align-items:center;font-size:13px;font-weight:600;cursor:pointer}
.dmx-tg input{width:16px;height:16px;accent-color:var(--pri,#2563eb)}
.dmx-ai{display:grid;grid-template-columns:24px minmax(0,1.3fr) minmax(0,1fr) 150px 130px 34px;gap:6px 8px;align-items:end;margin-top:8px;padding:10px 10px 10px 6px;border:1px solid var(--line,#dbe4ee);border-radius:10px;background:var(--card,#fff)}
.dmx-ai .n{font-size:12px;font-weight:700;color:var(--muted,#5b7085);text-align:center;align-self:center}.dmx-ai .inp{width:100%;min-width:0}.dmx-ai .u{grid-column:2/-1}
.dmx-ai label{display:block;margin:0}.dmx-ai label small{display:block;font-size:11px;font-weight:600;color:var(--muted,#5b7085);margin-bottom:2px}
.dmx-tl select.inp{min-width:112px}
.dmx-add{margin-top:8px}
.dmx-l{display:block;margin-top:2px;color:var(--muted,#5b7085);font-size:12px}
.dmx-sum{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0 12px}.dmx-sum div{padding:8px 12px;border:1px solid var(--line,#dbe4ee);border-radius:10px;min-width:120px}
.dmx-sum b{display:block;font-size:20px}.dmx-sum small{font-size:11.5px;color:var(--muted,#5b7085)}.dmx-sum .neg b{color:#dc2626}
.dmx-tl{width:100%;border-collapse:collapse;font-size:13px}.dmx-tl th{font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:var(--muted,#5b7085);text-align:left;padding:6px 8px;border-bottom:1px solid var(--line,#dbe4ee)}
.dmx-tl td{padding:8px;border-bottom:1px solid var(--line,#e6edf4);vertical-align:top}.dmx-tl td small{display:block;color:var(--muted,#5b7085);font-size:11.5px;margin-top:2px}
.dmx-tl .late{color:#dc2626;font-weight:700}.dmx-tl .inp{width:100%;min-width:0;padding:6px 8px;height:34px}.dmx-tl a.ref{color:inherit;text-decoration:underline dotted;cursor:pointer}
.dmx-chip{display:inline-block;padding:1px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#eef2ff;color:#3730a3}.dmx-chip.KONTRAKTOR{background:#fef3c7;color:#92400e}.dmx-chip.LAIN{background:#ecfeff;color:#155e75}
.dmx-st{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11.5px;font-weight:700}.dmx-st.TERBUKA{background:#fee2e2;color:#991b1b}.dmx-st.PROSES{background:#fef3c7;color:#92400e}.dmx-st.SELESAI{background:#dcfce7;color:#166534}
.dmx-cnt{display:inline-block;min-width:18px;padding:0 6px;margin-left:6px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;line-height:18px;text-align:center}
html.dmx-ktr #kpis,html.dmx-ktr #meta,html.dmx-ktr #tabs button:not([data-tab="reg"]):not([data-tab="mom"]),html.dmx-ktr .nav.sub:not([data-goto="reg"]):not([data-goto="mom"]),html.dmx-ktr #fStage{display:none!important}
html[data-theme="dark"] .dmx{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.14)}
html[data-theme="dark"] .dmx-ar{background:rgba(56,189,248,.06);border-color:rgba(255,255,255,.18)}
html[data-theme="dark"] .inp.dmx-auto{background:rgba(250,204,21,.12)!important;border-color:rgba(250,204,21,.55)!important}
html[data-theme="dark"] .dmx-chip{background:rgba(99,102,241,.2);color:#c7d2fe}html[data-theme="dark"] .dmx-chip.KONTRAKTOR{background:rgba(245,158,11,.2);color:#fcd34d}html[data-theme="dark"] .dmx-chip.LAIN{background:rgba(6,182,212,.18);color:#a5f3fc}
html[data-theme="dark"] .dmx-st.TERBUKA{background:rgba(239,68,68,.2);color:#fca5a5}html[data-theme="dark"] .dmx-st.PROSES{background:rgba(245,158,11,.2);color:#fcd34d}html[data-theme="dark"] .dmx-st.SELESAI{background:rgba(34,197,94,.2);color:#86efac}
html[data-theme="dark"] .dmx-tl .late,html[data-theme="dark"] .dmx-sum .neg b{color:#f87171}
@media (max-width:760px){
  .dmx-g{grid-template-columns:1fr}
  .dmx-ai{grid-template-columns:1fr 1fr;padding:10px}.dmx-ai .sp{display:none}
  .dmx-ai .n{grid-column:1/-1;text-align:left}.dmx-ai .u{grid-column:1/-1}
  .dmx-tl thead{display:none}.dmx-tl,.dmx-tl tbody,.dmx-tl tr,.dmx-tl td{display:block;width:100%}
  .dmx-tl tr{padding:10px 0;border-bottom:1px solid var(--line,#dbe4ee)}.dmx-tl td{border:0;padding:4px 0}
  .dmx-tl td[data-l]::before{content:attr(data-l);display:block;font-size:11px;font-weight:600;color:var(--muted,#5b7085)}
}
</style>
<script>
(function(){
  if(window.pmoDm)return;
  var PARSE=__PARSE__;
  var META=null,ACTS=[],MPID='',MCAN=false,PDFJS=null,OCRW=null;
  var KAT={MOM:1,SURAT_MASUK:1,SURAT_KELUAR:1};
  var FIELDS={
    SURAT_MASUK:[['kepada','Kepada'],['ttd','Penandatangan'],['ttdJabatan','Jabatan penandatangan'],['diterima','Tanggal diterima','date']],
    SURAT_KELUAR:[['ttd','Penandatangan'],['ttdJabatan','Jabatan penandatangan'],['tembusan','Tembusan','wide']],
    MOM:[['waktu','Waktu / pukul'],['tempat','Tempat'],['peserta','Peserta / hadir'],['notulis','Notulis'],['ttd','Penandatangan','wide']]
  };
  var PIHAK_L={SURAT_MASUK:['Dari (pengirim)','Instansi / perusahaan pengirim'],SURAT_KELUAR:['Kepada','Tujuan surat'],MOM:['Pimpinan rapat','Jabatan / nama pimpinan rapat']};
  var NOMOR_L={SURAT_MASUK:'Nomor surat',SURAT_KELUAR:'Nomor surat',MOM:'Nomor risalah'};
  var TGL_L={SURAT_MASUK:'Tanggal surat',SURAT_KELUAR:'Tanggal surat',MOM:'Tanggal rapat'};
  var PIHAK={PKG:'PKG / internal',KONTRAKTOR:'Kontraktor',LAIN:'Pihak lain'},STAT={TERBUKA:'Terbuka',PROSES:'Proses',SELESAI:'Selesai'};
  var LBL={nomor:'nomor',tanggal:'tanggal',perihal:'perihal',pihak:'pihak',kepada:'kepada',ttd:'penandatangan',ttdJabatan:'jabatan',tembusan:'tembusan',tempat:'tempat',waktu:'waktu',peserta:'peserta',notulis:'notulis'};
  function api(url,opt){return fetch(url,Object.assign({credentials:'same-origin',headers:{'content-type':'application/json'}},opt||{})).then(function(r){return r.json().catch(function(){return {ok:false,error:'Gagal ('+r.status+')'}})}).then(function(j){if(!j.ok)throw new Error(j.error||'Gagal');return j.data})}
  function today(){return todayIso()}
  function late(a){return a.status!=='SELESAI'&&a.due&&a.due<today()}

  /* ---------- data ---------- */
  function loadMeta(pid){MPID=pid;return api('/api/doc-meta?project='+encodeURIComponent(pid)).then(function(d){if(MPID!==pid)return;META=d.meta||{};ACTS=d.actions||[];MCAN=!!d.canManage;refresh()}).catch(function(){if(MPID===pid&&!META){META={};refresh()}})}
  function refresh(){if(!D)return;updTab();if(tab==='reg')renderReg();else if(tab==='mom')renderMom()}
  function momIds(){var o={};(D.docs||[]).forEach(function(d){if(d.kat==='MOM')o[d.id]=d});return o}
  function updTab(){var b=document.querySelector('#tabs [data-tab="mom"]'),s=document.querySelector('.nav.sub[data-goto="mom"] span');var ids=momIds(),n=ACTS.filter(function(a){return ids[a.docId]&&a.status!=='SELESAI'}).length;
    if(b)b.innerHTML='Tindak lanjut MoM'+(n?'<span class="dmx-cnt">'+n+'</span>':'');if(s)s.textContent='Tindak lanjut MoM'+(n?' ('+n+')':'')}

  /* ---------- kaitan dengan fungsi halaman ---------- */
  /* setData lama dipanggil dengan referensi asli saat muat pertama; renderKpis dipanggil di dalamnya lewat nama global. */
  var oKpi=renderKpis;renderKpis=function(){oKpi.apply(this,arguments);if(!D||!D.project)return;document.documentElement.classList.toggle('dmx-ktr',!!D.ktr);
    if(D.ktr&&['reg','mom'].indexOf(tab)<0)tab='reg';
    if(MPID!==D.project.id){META=null;ACTS=[]}loadMeta(D.project.id);updTab()};
  var oTab=setTab;setTab=function(t){var m=$('tab-mom');if(t!=='mom'){if(m)m.hidden=true;return oTab(t)}
    oTab('reg');tab='mom';document.querySelectorAll('#tabs button').forEach(function(b){var on=b.getAttribute('data-tab')==='mom';b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
    document.querySelectorAll('.nav.sub').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-goto')==='mom')});if(window.sideGrpSync)sideGrpSync();
    $('tab-reg').hidden=true;m.hidden=false;renderMom()};
  var oRow=rowHtml;rowHtml=function(d){var h=oRow(d);if(!KAT[d.kat]||!META)return h;var x=META[d.id]||{},p=[];
    if(d.kat==='SURAT_MASUK'){if(x.kepada)p.push('Kepada: '+x.kepada);if(x.ttd)p.push('TTD: '+x.ttd)}
    if(d.kat==='SURAT_KELUAR'){if(x.ttd)p.push('TTD: '+x.ttd);if(x.tembusan)p.push('Tembusan: '+x.tembusan)}
    if(d.kat==='MOM'){if(x.tempat)p.push(x.tempat);var a=ACTS.filter(function(z){return z.docId===d.id});if(a.length){var o=a.filter(function(z){return z.status!=='SELESAI'}).length,l=a.filter(late).length;p.push(a.length+' tindak lanjut'+(o?' · '+o+' belum selesai':' · selesai semua')+(l?' · '+l+' lewat batas':''))}}
    return p.length?h.replace('</small></td>','</small><small class="dmx-l">'+esc(p.join(' · '))+'</small></td>'):h};
  var oDraw=drawForm;drawForm=function(isNew){oDraw.apply(this,arguments);try{decorate(isNew)}catch(e){console.warn('dmx',e)}};
  var oPick=pickFile;pickFile=function(f){oPick(f);if(FM&&KAT[FM.d.kat]&&FM.file===f)readNow(false)};
  var oRun=run;run=function(fn,args,ok,fail,txt){
    if(fn==='saveDocItem'&&FM&&FM.mx&&args&&args[2]&&KAT[args[2].kat]){
      var f=FM,a=args[2],pid=args[1],prev={},ok0=ok;(D.docs||[]).forEach(function(x){prev[x.id]=1});
      ok=function(r){var id=a.id;if(!id){var c=(r.docs||[]).filter(function(x){return !prev[x.id]&&x.kat===a.kat}),m=c.filter(function(x){return x.judul===String(a.judul||'').trim()});id=(m[0]||c[0]||{}).id}
        if(!id){ok0(r);return}
        var body={project:pid,docId:id,kat:a.kat,data:f.mx};if(a.kat==='MOM'&&f.actsReady)body.actions=f.actOn?f.acts:[];
        busy(true,'Menyimpan isian '+(a.kat==='MOM'?'risalah':'surat')+'…');
        api('/api/doc-meta',{method:'POST',body:JSON.stringify(body)}).then(function(){busy(false);ok0(r);loadMeta(pid)}).catch(function(e){busy(false);ok0(r);toast('Dokumen tersimpan, tetapi isian tambahan belum tersimpan: '+e.message)})};
    }
    return oRun.call(this,fn,args,ok,fail,txt)};

  /* ---------- formulir ---------- */
  function decorate(isNew){
    var f=FM;if(!f)return;var d=f.d;if(!KAT[d.kat]){f.mx=null;return}
    if(!f.mx||f.mxKat!==d.kat){var base=d.id&&META&&META[d.id]?META[d.id]:{};f.mx={};Object.keys(base).forEach(function(k){if(['kat','by','at'].indexOf(k)<0)f.mx[k]=base[k]});f.mxKat=d.kat;f.auto=f.auto||{};
      if(!f.acts){f.acts=d.id?ACTS.filter(function(a){return a.docId===d.id}).map(function(a){return Object.assign({},a)}):[];f.actOn=f.acts.length>0;f.actsReady=META!==null}}
    var lab=function(id,t,ph){var el=$(id);if(!el)return;var l=el.closest('label');if(!l)return;var sp=l.querySelector('span');if(sp)sp.innerHTML=t+(id==='fJudul'?' <em>*</em>':'');else if(l.firstChild&&l.firstChild.nodeType===3)l.firstChild.nodeValue=t;if(ph!==undefined)el.placeholder=ph};
    lab('fJudul','Perihal',d.kat==='MOM'?'Contoh: Rapat pembahasan penempatan Marine Loading Arm':'Contoh: Undangan visit uji riksa hydraulic jacking machine');
    lab('fNomor',NOMOR_L[d.kat]);lab('fTgl',TGL_L[d.kat]);lab('fPihak',PIHAK_L[d.kat][0],PIHAK_L[d.kat][1]);
    var grid=document.querySelector('#dmBody .fgrid');if(!grid)return;
    var box=document.createElement('div');box.className='dmx';
    box.innerHTML='<div class="dmx-h"><b>'+(d.kat==='MOM'?'Isian risalah rapat':'Isian surat')+'</b><span>Bisa diisi otomatis dari berkas: pilih / tarik PDF atau gambar, atau klik Baca otomatis.</span></div><div class="dmx-g">'+
      FIELDS[d.kat].map(function(x){var v=f.mx[x[0]]||'';return '<label class="fld'+(x[2]==='wide'?' wide':'')+'"><span>'+esc(x[1])+'</span><input class="inp'+(f.auto[x[0]]?' dmx-auto':'')+'" data-mx="'+x[0]+'"'+(x[2]==='date'?' type="date"':'')+' value="'+esc(v)+'" maxlength="600"></label>'}).join('')+'</div>';
    grid.parentNode.insertBefore(box,grid.nextSibling);
    box.querySelectorAll('[data-mx]').forEach(function(el){el.addEventListener('input',function(){f.mx[el.getAttribute('data-mx')]=el.value;el.classList.remove('dmx-auto');delete f.auto[el.getAttribute('data-mx')]})});
    ['fNomor','fTgl','fJudul','fPihak'].forEach(function(id){var el=$(id);if(!el)return;if(f.auto[id])el.classList.add('dmx-auto');el.addEventListener('input',function(){el.classList.remove('dmx-auto');delete f.auto[id]})});
    var bar=document.createElement('div');bar.className='dmx-ar';bar.innerHTML='<button type="button" class="btn" id="dmxRead"><i class="ic" data-ic="eye"></i>Baca otomatis dari berkas</button><span id="dmxSt">'+esc(f.readMsg||'Mengisi nomor, tanggal, perihal, '+(d.kat==='MOM'?'tempat, waktu, pimpinan, notulis':'kepada / pengirim, penandatangan')+' dari PDF atau gambar. PDF hasil scan dibaca dengan OCR (±10 detik per halaman).')+'</span>';
    var stg=document.querySelector('#dmBody .stg');if(stg)stg.appendChild(bar);else box.appendChild(bar);
    $('dmxRead').onclick=function(){readNow(true)};if(f.readCls)$('dmxSt').className=f.readCls;
    if(d.kat==='MOM'){var ab=document.createElement('div');ab.className='dmx dmx-act';box.parentNode.insertBefore(ab,box.nextSibling);drawActs(ab)}
    if(typeof paint==='function')paint($('dmBody'));
  }
  function drawActs(ab){
    var f=FM;ab.innerHTML='<label class="dmx-tg"><input type="checkbox" id="dmxActOn"'+(f.actOn?' checked':'')+'> Ada daftar tindak lanjut <span style="font-weight:400;color:var(--muted)">(opsional)</span></label>'+(f.actOn?
      f.acts.map(function(a,i){return '<div class="dmx-ai"><span class="n">'+(i+1)+'</span>'+
        '<label class="u"><small>Uraian tindak lanjut</small><input class="inp" data-ai="'+i+'" data-ak="uraian" value="'+esc(a.uraian||'')+'" placeholder="Contoh: Kalkulasi biaya penambahan pipa" maxlength="600"></label><span class="sp"></span>'+
        '<label><small>PIC</small><input class="inp" data-ai="'+i+'" data-ak="pic" value="'+esc(a.pic||'')+'" placeholder="Nama / unit"></label>'+
        '<label><small>Pihak</small><select class="inp" data-ai="'+i+'" data-ak="pihak">'+Object.keys(PIHAK).map(function(k){return '<option value="'+k+'"'+((a.pihak||'PKG')===k?' selected':'')+'>'+PIHAK[k]+'</option>'}).join('')+'</select></label>'+
        '<label><small>Batas waktu</small><input class="inp" type="date" data-ai="'+i+'" data-ak="due" value="'+esc(a.due||'')+'"></label>'+
        '<label><small>Status</small><select class="inp" data-ai="'+i+'" data-ak="status">'+Object.keys(STAT).map(function(k){return '<option value="'+k+'"'+((a.status||'TERBUKA')===k?' selected':'')+'>'+STAT[k]+'</option>'}).join('')+'</select></label>'+
        '<button type="button" class="btn" data-adel="'+i+'" aria-label="Hapus butir '+(i+1)+'" title="Hapus butir">×</button></div>'}).join('')+
      '<button type="button" class="btn dmx-add" id="dmxAdd">+ Tambah butir</button>':'');
    $('dmxActOn').onchange=function(){f.actOn=this.checked;if(f.actOn&&!f.acts.length)f.acts.push({pihak:'PKG',status:'TERBUKA'});drawActs(ab)};
    ab.querySelectorAll('[data-ai]').forEach(function(el){var h=function(){f.acts[+el.getAttribute('data-ai')][el.getAttribute('data-ak')]=el.value};el.addEventListener('input',h);el.addEventListener('change',h)});
    ab.querySelectorAll('[data-adel]').forEach(function(b){b.onclick=function(){f.acts.splice(+b.getAttribute('data-adel'),1);if(!f.acts.length)f.actOn=false;drawActs(ab)}});
    var add=$('dmxAdd');if(add)add.onclick=function(){f.acts.push({pihak:'PKG',status:'TERBUKA'});drawActs(ab);var u=ab.querySelectorAll('[data-ak="uraian"]');if(u.length)u[u.length-1].focus()};
  }

  /* ---------- baca otomatis ---------- */
  function st(msg,cls){var f=FM;if(f){f.readMsg=msg;f.readCls=cls||''}var el=$('dmxSt');if(el){el.textContent=msg;el.className=cls||''}}
  function driveId(u){var m=String(u||'').match(/\/d\/([A-Za-z0-9_-]{10,})/)||String(u||'').match(/[?&]id=([A-Za-z0-9_-]{10,})/);return m?m[1]:''}
  function readNow(manual){
    var f=FM;if(!f||!KAT[f.d.kat])return;var src;
    if(f.file)src=Promise.resolve(f.file);
    else{var u=($('fUrl')||{}).value||f.d.url||'',id=f.d.fileId||driveId(u);
      if(!id){st('Pilih berkas PDF / gambar terlebih dahulu, atau tempel link Google Drive berkasnya.','err');return}
      src=fetch('/api/drive/preview-pdf/'+encodeURIComponent(id),{credentials:'same-origin'}).then(function(r){if(!r.ok)throw new Error('Berkas tidak bisa diambil dari Google Drive. Pastikan dibagikan ke akun web app.');return r.blob()})}
    var btn=$('dmxRead');if(btn)btn.disabled=true;st('Membaca berkas…','run');
    src.then(extract).then(function(r){if(FM!==f)return;var p=PARSE(r.text,f.d.kat),got=apply(f,p,manual);
      st(got.length?'Terbaca otomatis: '+got.join(', ')+(r.ocr?' (OCR)':'')+'. Periksa kembali kotak berwarna kuning sebelum menyimpan.':'Tidak ada isian yang dikenali'+(r.ocr?' dari hasil OCR':'')+'. Isi secara manual.',got.length?'ok':'err')})
    .catch(function(e){if(FM===f)st(e.message||String(e),'err')}).then(function(){var b=$('dmxRead');if(b)b.disabled=false});
  }
  function apply(f,p,manual){
    var d=f.d,got=[],fileBase=f.file?String(f.file.name).replace(/\.[a-z0-9]{2,5}$/i,'').replace(/[_]+/g,' '):'';
    var put=function(id,v,lbl){var el=$(id);if(!el||!v)return;var cur=String(el.value||'').trim();if(cur&&!(manual&&f.auto[id])&&!(id==='fJudul'&&cur===fileBase.trim()))return;el.value=v;el.classList.add('dmx-auto');f.auto[id]=1;got.push(lbl)};
    put('fNomor',p.nomor,'nomor');put('fTgl',p.tanggal,'tanggal');put('fJudul',p.perihal,'perihal');
    put('fPihak',d.kat==='SURAT_MASUK'?p.dari:d.kat==='SURAT_KELUAR'?p.kepada:p.pimpinan,d.kat==='SURAT_MASUK'?'pengirim':d.kat==='SURAT_KELUAR'?'kepada':'pimpinan');
    FIELDS[d.kat].forEach(function(x){var k=x[0],v=p[k];if(!v)return;var el=document.querySelector('#dmBody [data-mx="'+k+'"]');var cur=String(f.mx[k]||'').trim();if(cur&&!(manual&&f.auto[k]))return;f.mx[k]=v;f.auto[k]=1;if(el){el.value=v;el.classList.add('dmx-auto')}got.push(LBL[k]||k)});
    f.mx.auto=Object.keys(f.auto);
    if(d.kat==='MOM'&&p.tempat&&/zoom|teams|online|daring|meet/i.test(p.tempat)){/* tetap */}
    return got;
  }
  function pdfLib(){if(PDFJS)return Promise.resolve(PDFJS);return import('/vendor/pdfjs/pdf.min.mjs').then(function(m){m.GlobalWorkerOptions.workerSrc='/vendor/pdfjs/pdf.worker.min.mjs';PDFJS=m;return m})}
  function med(a){if(!a.length)return 0;a=a.slice().sort(function(x,y){return x-y});return a[Math.floor(a.length/2)]}
  function layout(page){return page.getTextContent().then(function(tc){
    var it=tc.items.filter(function(i){return i.str&&i.str.trim()});if(!it.length)return '';
    var cw=med(it.filter(function(i){return i.str.length>=3&&i.width>0}).map(function(i){return i.width/i.str.length}))||5;
    var rows=[];it.forEach(function(i){var y=i.transform[5],x=i.transform[4],h=Math.abs(i.transform[3])||i.height||10;var r=null;for(var k=0;k<rows.length;k++)if(Math.abs(rows[k].y-y)<=Math.max(2,h*0.45)){r=rows[k];break}if(!r){r={y:y,h:h,its:[]};rows.push(r)}r.its.push({x:x,w:i.width||0,s:i.str})});
    rows.sort(function(a,b){return b.y-a.y});var gaps=[];for(var k=1;k<rows.length;k++)gaps.push(rows[k-1].y-rows[k].y);var lh=med(gaps)||12,minX=Math.min.apply(null,it.map(function(i){return i.transform[4]}));
    var out=[],py=null;rows.forEach(function(r){if(py!==null&&py-r.y>1.9*lh)out.push('');py=r.y;r.its.sort(function(a,b){return a.x-b.x});var s='';
      var pe=null;r.its.forEach(function(i){var col=Math.round((i.x-minX)/cw),gap=pe===null?null:i.x-pe;
        if(gap!==null&&gap<cw*1.6){if(gap>cw*0.25&&!/\s$/.test(s)&&!/^\s/.test(i.s))s+=' '}
        else if(s.length<col)s+=' '.repeat(Math.max(col-s.length,s.length?3:0));else if(s.length)s+='   ';
        s+=i.s;pe=i.x+i.w});out.push(s.replace(/\s+$/,''))});
    return out.join('\n')})}
  function ocr(){if(OCRW)return OCRW;OCRW=import('/vendor/tesseract/tesseract.esm.min.js').then(function(T){var cw=T.createWorker||(T.default&&T.default.createWorker);
      return cw(['ind','eng'],1,{workerPath:'/vendor/tesseract/worker.min.js',corePath:'/vendor/tesseract-core',langPath:'/vendor/tessdata',workerBlobURL:false,gzip:true,
        logger:function(m){if(m&&m.status==='recognizing text')st('OCR '+(OCR_PG?'halaman '+OCR_PG+' · ':'')+Math.round((m.progress||0)*100)+'%','run');else if(m&&/loading|initializ/.test(m.status||''))st('Menyiapkan OCR (sekali saja, ±4 MB)…','run')}})
      .then(function(w){return w.setParameters({preserve_interword_spaces:'1'}).then(function(){return w})})}).catch(function(e){OCRW=null;throw new Error('OCR tidak bisa dijalankan di peramban ini: '+(e.message||e))});return OCRW}
  var OCR_PG=0;
  function ocrCanvas(c,pg){OCR_PG=pg;return ocr().then(function(w){return w.recognize(c)}).then(function(r){return r.data.text||''})}
  function extract(blob){
    var type=String(blob.type||''),name=String(blob.name||'');
    if(/^image\//.test(type)||/\.(png|jpe?g|webp|bmp|tiff?)$/i.test(name))return ocrCanvas(blob,1).then(function(t){return {text:t,ocr:true}});
    if(!/pdf/.test(type)&&!/\.pdf$/i.test(name)&&type)throw new Error('Baca otomatis hanya untuk berkas PDF atau gambar.');
    return blob.arrayBuffer().then(function(buf){return pdfLib().then(function(lib){return lib.getDocument({data:new Uint8Array(buf)}).promise})}).then(function(pdf){
      var n=pdf.numPages,want=[1,2,3,n].filter(function(p,i,a){return p<=n&&a.indexOf(p)===i});
      return Promise.all(want.map(function(p){return pdf.getPage(p).then(layout)})).then(function(txt){
        var first=String(txt[0]||'').replace(/\s/g,'');
        if(first.length>=60)return {text:txt.join('\n\n'),ocr:false};
        var pages=[1,2].filter(function(p){return p<=n}),acc=[];
        return pages.reduce(function(pr,p){return pr.then(function(){return pdf.getPage(p).then(function(pg){var vp=pg.getViewport({scale:2.2}),c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);
          return pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise.then(function(){return ocrCanvas(c,p)}).then(function(t){acc.push(t)})})})},Promise.resolve()).then(function(){return {text:acc.join('\n\n'),ocr:true}});
      })});
  }

  /* ---------- tab Tindak lanjut MoM ---------- */
  var MF={st:'OPEN',ph:''};
  function renderMom(){
    var el=$('tab-mom');if(!el||!D)return;var ids=momIds(),all=ACTS.filter(function(a){return ids[a.docId]});
    var list=all.filter(function(a){return (MF.st==='ALL'||(MF.st==='OPEN'?a.status!=='SELESAI':a.status===MF.st))&&(!MF.ph||a.pihak===MF.ph)});
    list.sort(function(a,b){var la=late(a)?0:1,lb=late(b)?0:1;return la-lb||String(a.due||'9999').localeCompare(String(b.due||'9999'))||a.no-b.no});
    var nOpen=all.filter(function(a){return a.status==='TERBUKA'}).length,nPro=all.filter(function(a){return a.status==='PROSES'}).length,nLate=all.filter(late).length,nDone=all.filter(function(a){return a.status==='SELESAI'}).length;
    var h='<div class="panel"><h3><i class="ic" data-ic="check"></i>Tindak lanjut MoM <span class="n">'+Object.keys(ids).length+' risalah · '+all.length+' butir</span></h3><p class="sub">Butir tindak lanjut dari seluruh MoM / risalah rapat proyek. Butir yang melewati batas waktu dan belum selesai ditandai merah.'+(D.ktr?' Anda dapat memperbarui status butir dengan pihak Kontraktor.':'')+'</p>'+
      '<div class="dmx-sum"><div><b>'+nOpen+'</b><small>Terbuka</small></div><div><b>'+nPro+'</b><small>Proses</small></div><div class="'+(nLate?'neg':'')+'"><b>'+nLate+'</b><small>Lewat batas</small></div><div><b>'+nDone+'</b><small>Selesai</small></div></div>'+
      '<div class="tools"><select class="inp" id="dmxFs" aria-label="Filter status"><option value="OPEN">Belum selesai</option><option value="ALL">Semua status</option><option value="TERBUKA">Terbuka</option><option value="PROSES">Proses</option><option value="SELESAI">Selesai</option></select>'+
      '<select class="inp" id="dmxFp" aria-label="Filter pihak"><option value="">Semua pihak</option>'+Object.keys(PIHAK).map(function(k){return '<option value="'+k+'">'+PIHAK[k]+'</option>'}).join('')+'</select>'+
      (D.canManage?'<span style="flex:1"></span><button type="button" class="btn pri" id="dmxNew"><i class="ic" data-ic="plus"></i>Tambah MoM</button>':'')+'</div>';
    if(META===null)h+='<div class="empty">Memuat tindak lanjut…</div>';
    else if(!Object.keys(ids).length)h+='<div class="empty">Belum ada MoM / risalah rapat terdaftar.'+(D.canManage?' Klik Tambah MoM untuk mendaftarkan risalah dan butir tindak lanjutnya.':'')+'</div>';
    else if(!all.length)h+='<div class="empty">Belum ada butir tindak lanjut. Daftar tindak lanjut bersifat opsional; tambahkan dari formulir MoM (Ubah dokumen › Ada daftar tindak lanjut).</div>';
    else if(!list.length)h+='<div class="empty">Tidak ada butir yang cocok dengan filter.</div>';
    else h+='<div class="scroll"><table class="dmx-tl"><thead><tr><th style="width:34%">Tindak lanjut</th><th>PIC</th><th>Batas waktu</th><th>Status</th><th style="width:26%">Catatan / bukti</th><th></th></tr></thead><tbody>'+list.map(function(a){var m=ids[a.docId]||{},can=MCAN||(D.ktr&&a.pihak==='KONTRAKTOR'),lt=late(a);
      return '<tr data-aid="'+a.id+'"><td data-l="Tindak lanjut"><b>'+esc(a.uraian)+'</b><small><a class="ref" data-view="'+esc(a.docId)+'">'+esc([m.nomor?'MoM '+m.nomor:'MoM',m.tanggal?fd(m.tanggal):''].filter(Boolean).join(' · '))+'</a> · '+esc(m.judul||'')+'</small></td>'+
        '<td data-l="PIC">'+esc(a.pic||'–')+'<small><span class="dmx-chip '+a.pihak+'">'+PIHAK[a.pihak]+'</span></small></td>'+
        '<td data-l="Batas waktu" class="'+(lt?'late':'')+'">'+(a.due?fd(a.due):'–')+(lt?'<small class="late">lewat '+(-daysTo(a.due))+' hari</small>':'')+'</td>'+
        '<td data-l="Status">'+(can?'<select class="inp" data-af="status">'+Object.keys(STAT).map(function(k){return '<option value="'+k+'"'+(a.status===k?' selected':'')+'>'+STAT[k]+'</option>'}).join('')+'</select>':'<span class="dmx-st '+a.status+'">'+STAT[a.status]+'</span>')+'</td>'+
        '<td data-l="Catatan / bukti">'+(can?'<input class="inp" data-af="catatan" value="'+esc(a.catatan||'')+'" placeholder="Catatan progres" maxlength="600"><input class="inp" data-af="bukti" value="'+esc(a.bukti||'')+'" placeholder="Link bukti (https://…)" style="margin-top:4px">'
          :esc(a.catatan||'–')+(a.bukti?'<small><a href="'+esc(a.bukti)+'" target="_blank" rel="noopener">Bukti</a></small>':''))+(a.by?'<small>Diperbarui '+esc(a.by)+'</small>':'')+'</td>'+
        '<td>'+(can?'<button type="button" class="btn" data-asave disabled>Simpan</button>':'')+'</td></tr>'}).join('')+'</tbody></table></div>';
    el.innerHTML=h+'</div>';if(typeof paint==='function')paint(el);
    var fs=$('dmxFs'),fp=$('dmxFp');fs.value=MF.st;fp.value=MF.ph;fs.onchange=function(){MF.st=fs.value;renderMom()};fp.onchange=function(){MF.ph=fp.value;renderMom()};
    var nb=$('dmxNew');if(nb)nb.onclick=function(){openForm(null,{kat:'MOM',sub:'INTERNAL'})};
    el.querySelectorAll('[data-view]').forEach(function(a){a.onclick=function(){openView(a.getAttribute('data-view'))}});
    el.querySelectorAll('tr[data-aid]').forEach(function(tr){var b=tr.querySelector('[data-asave]');if(!b)return;
      tr.querySelectorAll('[data-af]').forEach(function(i){var on=function(){b.disabled=false;b.classList.add('pri')};i.addEventListener('input',on);i.addEventListener('change',on)});
      b.onclick=function(){var body={};tr.querySelectorAll('[data-af]').forEach(function(i){body[i.getAttribute('data-af')]=i.value});b.disabled=true;
        api('/api/doc-actions/'+tr.getAttribute('data-aid'),{method:'POST',body:JSON.stringify(body)}).then(function(r){var k=ACTS.findIndex(function(x){return x.id===r.id});if(k>=0)ACTS[k]=r;updTab();renderMom();toast('Tindak lanjut diperbarui.')})
          .catch(function(e){b.disabled=false;toast(e.message)})}});
  }
  window.pmoDm={parse:PARSE,extract:extract,read:readNow,reload:function(){if(D)loadMeta(D.project.id)}};
})();
</script>`.replace('__PARSE__', () => parse.toString());

const HTML_PATCHES = [
  { file: 'DocControl', find: '<button type="button" data-tab="reg" class="on">Register</button>',
    replace: '<button type="button" data-tab="reg" class="on">Register</button>\n        <button type="button" data-tab="mom">Tindak lanjut MoM</button>' },
  { file: 'DocControl', find: '    <section id="tab-pkt" hidden></section>', replace: '    <section id="tab-pkt" hidden></section>\n    <section id="tab-mom" hidden></section>' },
  { file: 'DocControl', find: '<button type="button" class="nav sub" data-goto="chk" title="Kelengkapan">',
    replace: '<button type="button" class="nav sub" data-goto="mom" title="Tindak lanjut MoM"><i class="ic" data-ic="check"></i><span>Tindak lanjut MoM</span></button>\n    <button type="button" class="nav sub" data-goto="chk" title="Kelengkapan">' },
  { file: 'DocControl', find: "<?!= include('AccountMenu') ?>", replace: DOCMOM_JS + "\n<?!= include('AccountMenu') ?>" },
];

module.exports = { GS_PATCHES, HTML_PATCHES };

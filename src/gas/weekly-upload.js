'use strict';

/**
 * Input Progress Mingguan · unggah video/materi + mode kontraktor (25 Nov 2026).
 *
 * 1. Tombol "Unggah file" di samping "Cek link" (video maks 2 GB, materi maks 200 MB). File dikirim
 *    langsung dari browser ke Drive akun tim proyek per potongan 16 MB (bisa dijeda/dilanjutkan, otomatis
 *    melanjutkan bila koneksi putus). Setelah selesai, link terisi otomatis. Server: routes/weekly-upload.js.
 * 2. Kontraktor boleh membuka halaman ini untuk proyeknya, tetapi hanya mengisi HSE dan video/materi.
 *    Progres, concern, highlight tidak tampil. Tombol "Kirim ke PIC / Admin" → submitKtrWeekly (disimpan
 *    sebagai kiriman, tabel ktr_weekly). Form PIC/Admin memuat kiriman itu otomatis; setelah PIC/Admin
 *    menyimpan, kiriman ditandai terpakai dan file unggahan lama yang tidak dipakai lagi dibuang ke sampah.
 */

const WU_GS = String.raw`
function requireInputOrKtr_(token) {
  const user = requireUser_(token);
  if (canInput_(user) || ktrIs_(user)) return user;
  throw new Error('Akun Anda tidak memiliki akses input progress. Hubungi admin PMO.');
}
function inputCanProject_(user, p) {
  return userCanOperateProject_(user, p) || (ktrIs_(user) && userCanAccess_(user, p));
}
var __wuOrigInputForm = getInputFormData;
getInputFormData = function(token, projectId, week) {
  const out = __wuOrigInputForm(token, projectId, week);
  try {
    const user = requireUser_(token);
    out.ktrMode = ktrIs_(user);
    const d = __bridge.weeklyUp().draft(out.project.id, out.week);
    if (d) out.ktrDraft = d;
  } catch (e) { /* kiriman kontraktor tidak wajib */ }
  return out;
};
/** Kontraktor: kirim HSE + link video/materi untuk diperiksa dan disimpan PIC/Admin. */
function submitKtrWeekly(token, payload) {
  const user = requireUser_(token);
  if (!ktrIs_(user)) throw new Error('Fungsi ini khusus akun kontraktor.');
  payload = payload || {};
  const db = loadDb_();
  const p = inputProject_(db, user, payload.projectId);
  const info = weeklyInfo_(db, p);
  const w = Number(payload.week);
  if (!(w >= 1 && w <= info.latestWeek + 1)) throw new Error('Week tidak valid. Pilih week yang tersedia.');
  const on = payload.hseEnabled !== false;
  const src = payload.hse || {};
  const hse = {};
  Object.keys(src).forEach(function(k) {
    if (k === 'issue' || !/^[A-Za-z]{2,20}$/.test(k)) return;
    const v = src[k];
    if (v === null || v === undefined || v === '') { hse[k] = null; return; }
    const n = Number(v);
    if (!isFinite(n) || n < 0) throw new Error('Angka K3 tidak valid: ' + v);
    hse[k] = n;
  });
  if (on && Object.keys(hse).some(function(k) { return hse[k] === null; })) throw new Error('Data K3 belum lengkap.');
  hse.issue = cleanText_(src.issue || '').slice(0, INPUT_CONFIG.TEXT_LIMIT);
  const link = function(v, nm) {
    v = String(v || '').trim();
    if (v && !/^https:\/\/\S+$/i.test(v)) throw new Error(nm + ' harus diawali https://');
    return v.slice(0, 500);
  };
  const videoUrl = link(payload.videoUrl, 'Link video');
  const materialUrl = link(payload.materialUrl, 'Link materi');
  if (!on && !videoUrl && !materialUrl) throw new Error('Isi data K3 atau link video / materi dulu.');
  const d = __bridge.weeklyUp().saveDraft({ projectId: p.id, week: w, hseEnabled: on, hse: hse, videoUrl: videoUrl, materialUrl: materialUrl,
    reportDate: String(payload.reportDate || '').slice(0, 20), by: user.username, byName: user.name || user.username });
  return { success: true, week: w, project: p.name, at: d.at };
}
`;

const GS_PATCHES = [
  { file: 'InputApi', find: 'function getInputPageHtml(token) {\n  requireInputUser_(token);', replace: 'function getInputPageHtml(token) {\n  requireInputOrKtr_(token);' },
  { file: 'InputApi', find: "  const user = requireInputUser_(token);\n  const db = loadDb_();\n  const projects = db.allProjects\n    .filter(function(p) { return db.weekly.projects[p.id] && userCanOperateProject_(user, p) &&",
    replace: "  const user = requireInputOrKtr_(token);\n  const db = loadDb_();\n  const projects = db.allProjects\n    .filter(function(p) { return db.weekly.projects[p.id] && inputCanProject_(user, p) &&" },
  { file: 'InputApi', find: "  const pf = inputPerf_('input_form');\n  const user = requireInputUser_(token);", replace: "  const pf = inputPerf_('input_form');\n  const user = requireInputOrKtr_(token);" },
  { file: 'InputApi', find: "  if (!userCanOperateProject_(user, p)) throw new Error('Akun Anda hanya dapat menginput proyek sesuai PROYEK_ID akun.');",
    replace: "  if (!inputCanProject_(user, p)) throw new Error('Akun Anda hanya dapat menginput proyek sesuai PROYEK_ID akun.');" },
  { file: 'InputApi', find: 'function checkWeeklyLink(token, url, kind) {\n  requireInputUser_(token);', replace: 'function checkWeeklyLink(token, url, kind) {\n  requireInputOrKtr_(token);' },
];

const CSS = `
.wu{margin-top:8px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--soft);font-size:12.5px;line-height:1.45}
.wu-bar{height:8px;border-radius:99px;background:var(--line);overflow:hidden;margin:6px 0}
.wu-bar i{display:block;height:100%;width:0;background:var(--pri);border-radius:99px;transition:width .3s}
.wu[data-s="ok"] .wu-bar i{background:var(--ok)}.wu[data-s="fail"]{border-color:var(--bad)}.wu[data-s="fail"] .wu-t{color:var(--bad)}
.wu[data-s="ok"] .wu-t{color:var(--ok);font-weight:600}
.wu-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.wu-row .wu-t{flex:1;min-width:0;overflow-wrap:anywhere}
.wu-row button{min-height:28px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);font:inherit;font-weight:600;cursor:pointer}
.wu-row button:hover{background:var(--card)}.wu-row button[hidden]{display:none}
.wu-dest{color:var(--muted);margin-top:4px}
.ktr-note{margin:0 0 14px;padding:12px 14px;border:1px solid var(--line);border-left:4px solid var(--pri);border-radius:10px;background:var(--card);font-size:13px;line-height:1.5}
.ktr-note b{color:var(--ink)}
html.ktr-mode #sec-progress,html.ktr-mode #sec-concern,html.ktr-mode #copyHighlight,html.ktr-mode a[href="#sec-progress"],html.ktr-mode a[href="#sec-concern"],html.ktr-mode #epccAll{display:none!important}
`;

const lkFind = (id) => 'data-lk="' + id + '">Cek link</button><span class="lk-st" aria-live="polite"></span></div>';
const lkRepl = (id) => 'data-lk="' + id + '">Cek link</button><button type="button" class="lk-btn" data-wu="' + id + '">Unggah file</button><span class="lk-st" aria-live="polite"></span></div>' +
  '<input type="file" id="' + id + 'File" hidden accept="' + (id === 'videoUrl' ? 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm' : '.pdf,.ppt,.pptx,.xls,.xlsx,.doc,.docx') + '">' +
  '<div class="wu" id="' + id + 'Wu" hidden><div class="wu-row"><span class="wu-t" aria-live="polite"></span>' +
  '<button type="button" data-wu-pause="' + id + '" hidden>Jeda</button><button type="button" data-wu-cancel="' + id + '" hidden>Batal</button></div>' +
  '<div class="wu-bar"><i></i></div><div class="wu-dest"></div></div>';

const JS = String.raw`
<script>
(function(){
  if(window.__pmoWU)return;window.__pmoWU=true;
  var MB=1048576,GB=1073741824,LIM={videoUrl:{kind:'VIDEO',max:2*GB,label:'2 GB',ext:/\.(mp4|mov|m4v|webm)$/i,kata:'video MP4, MOV, M4V atau WEBM'},materialUrl:{kind:'MATERI',max:200*MB,label:'200 MB',ext:/\.(pdf|pptx?|xlsx?|docx?)$/i,kata:'PDF, PowerPoint, Excel atau Word'}};
  var ST={},CUR={};
  function g(id){return document.getElementById(id)}
  function sz(n){return n>=GB?(n/GB).toFixed(2).replace('.',',')+' GB':n>=MB?Math.round(n/MB)+' MB':Math.max(1,Math.round(n/1024))+' KB'}
  function dur(s){s=Math.round(s);return s<60?s+' dtk':s<3600?Math.round(s/60)+' menit':Math.floor(s/3600)+' jam '+Math.round(s%3600/60)+' menit'}
  function api(url,body){return fetch(url,{method:body?'POST':'GET',credentials:'same-origin',headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined})
    .then(function(r){return r.json().catch(function(){return{ok:false,error:'HTTP '+r.status}})}).then(function(j){if(!j.ok)throw new Error(j.error||'Gagal');return j.data})}
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
  function fmtAt(s){try{var d=new Date(s);return d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}catch(e){return s}}
  function esc2(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

  /* ---------- tampilan unggah ---------- */
  function box(id,state,text,pct,dest){var b=g(id+'Wu');if(!b)return;b.hidden=false;b.setAttribute('data-s',state||'');
    b.querySelector('.wu-t').textContent=text||'';b.querySelector('.wu-bar i').style.width=(pct==null?0:Math.max(0,Math.min(100,pct)))+'%';
    b.querySelector('.wu-bar').style.display=pct==null?'none':'';
    if(dest!=null)b.querySelector('.wu-dest').textContent=dest;
    var U=CUR[id],pb=b.querySelector('[data-wu-pause]'),cb=b.querySelector('[data-wu-cancel]');
    pb.hidden=!U||state==='ok'||state==='fail';cb.hidden=!U||state==='ok';pb.textContent=U&&U.paused?'Lanjut':'Jeda';}
  function destText(s){return s&&s.ready?'Tujuan: Drive akun tim '+(s.email||'')+(s.folder?' · folder '+s.folder:'')+(s.free!=null?' · sisa ruang '+sz(s.free):''):''}
  function status(pid){if(!ST[pid])ST[pid]=api('/api/weekly-upload/status?projectId='+encodeURIComponent(pid)).catch(function(e){delete ST[pid];return{ready:false,reason:e.message}});return ST[pid]}
  function busyAny(){return Object.keys(CUR).some(function(k){return CUR[k]&&!CUR[k].done})}

  /* ---------- mesin unggah (resumable, potongan 16 MB) ---------- */
  function put(U,start,end){return new Promise(function(ok,no){var x=new XMLHttpRequest();U.xhr=x;x.open('PUT',U.url);
    var total=U.file.size;x.setRequestHeader('Content-Range',start==null?'bytes */'+total:'bytes '+start+'-'+end+'/'+total);
    if(start!=null)x.upload.onprogress=function(e){prog(U,start+e.loaded)};
    x.onload=function(){ok(x)};x.onerror=function(){no(new Error('net'))};x.onabort=function(){no(new Error('abort'))};
    x.send(start==null?null:U.file.slice(start,end+1))})}
  function rangeOf(x){var r=null;try{r=x.getResponseHeader('Range')}catch(e){}var m=r&&/bytes=0-(\d+)/.exec(r);return m?+m[1]+1:null}
  function prog(U,sent){var now=Date.now();U.samples.push([now,sent]);while(U.samples.length>2&&now-U.samples[0][0]>20000)U.samples.shift();
    var a=U.samples[0],sp=now>a[0]?(sent-a[1])/((now-a[0])/1000):0,pct=sent/U.file.size*100;
    box(U.id,'run','Mengunggah '+pct.toFixed(0)+'% · '+sz(sent)+' / '+sz(U.file.size)+(sp>0?' · '+(sp*8/1e6).toFixed(1).replace('.',',')+' Mbps · sisa ±'+dur((U.file.size-sent)/sp):''),pct)}
  function fileJson(x){try{return JSON.parse(x.responseText)}catch(e){return null}}
  async function loop(U){
    var total=U.file.size,fails=0;
    while(!U.cancel&&!U.paused){
      var end=Math.min(U.off+U.chunk,total)-1,x=null;
      try{x=await put(U,U.off,end)}catch(e){
        if(U.cancel||U.paused)return;fails++;
        if(fails>10){U.paused=true;box(U.id,'run','Koneksi terputus. Tekan Lanjut setelah internet kembali.',U.off/total*100);return}
        box(U.id,'run','Koneksi terputus, mencoba lagi dalam '+Math.min(30,2*fails)+' dtk… ('+sz(U.off)+' sudah terkirim)',U.off/total*100);
        await sleep(Math.min(30000,2000*fails));if(U.cancel||U.paused)return;
        if(!(await resync(U)))return;continue}
      if(x.status===308){var r=rangeOf(x);U.off=r!=null?r:end+1;fails=0;continue}
      if(x.status===200||x.status===201){var j=fileJson(x);if(j&&j.id)return finish(U,j.id);return fail(U,'Jawaban Google tidak terbaca.')}
      if(x.status===404||x.status===410)return fail(U,'Sesi unggah sudah kedaluwarsa. Pilih file lagi untuk mengunggah ulang.');
      if(x.status>=500||x.status===429){fails++;await sleep(Math.min(30000,2000*fails));if(!(await resync(U)))return;continue}
      return fail(U,'Unggah ditolak Google (HTTP '+x.status+').')}
  }
  /* Tanya Google sudah sampai byte ke berapa. false = selesai/berhenti. */
  async function resync(U){try{var x=await put(U,null,null);
      if(x.status===308){var r=rangeOf(x);U.off=r!=null?r:0;return true}
      if(x.status===200||x.status===201){var j=fileJson(x);if(j&&j.id){finish(U,j.id);return false}}
      if(x.status===404||x.status===410){fail(U,'Sesi unggah sudah kedaluwarsa. Pilih file lagi untuk mengunggah ulang.');return false}
    }catch(e){}return true}
  function finish(U,fileId){box(U.id,'run','Menyelesaikan & mengatur akses link…',100);
    api('/api/weekly-upload/done',{projectId:U.pid,week:U.week,kind:U.kind,fileId:fileId}).then(function(r){
      U.done=true;delete CUR[U.id];
      var same=typeof data!=='undefined'&&data&&data.project.id===U.pid&&data.week===U.week;
      if(same){g(U.id).value=r.url;setLink(U.id,'ok','Terunggah: '+r.name+' ('+sz(r.size||U.file.size)+') · bisa dibuka siapa saja yang memiliki link.',r.url);try{saveDraft();recalc()}catch(e){}}
      box(U.id,'ok','✓ Selesai: '+r.name+(same?'':' (untuk WEEK '+U.week+'; buka week itu untuk memakainya)')+(U.kind==='VIDEO'?'. Google butuh beberapa menit untuk memproses video sebelum bisa diputar.':''),100);
    }).catch(function(e){fail(U,'File sudah terkirim, tetapi gagal dicatat: '+e.message)})}
  function fail(U,msg){delete CUR[U.id];U.done=true;box(U.id,'fail','✕ '+msg,null)}
  function start(id,file){
    if(typeof data==='undefined'||!data)return;var L=LIM[id];
    if(CUR[id]&&!CUR[id].done){box(id,'run','Masih ada unggahan berjalan.',null);return}
    if(!L.ext.test(file.name)){box(id,'fail','✕ Jenis file harus '+L.kata+'.',null);return}
    if(file.size>L.max){box(id,'fail','✕ Ukuran '+sz(file.size)+' melebihi batas '+L.label+'.',null);return}
    var U={id:id,kind:L.kind,file:file,off:0,chunk:16*MB,pid:data.project.id,week:data.week,samples:[],paused:false,cancel:false};CUR[id]=U;
    box(id,'run','Menyiapkan unggahan '+file.name+' ('+sz(file.size)+')…',0);
    api('/api/weekly-upload/session',{projectId:U.pid,week:U.week,kind:U.kind,name:file.name,size:file.size,type:file.type})
      .then(function(s){U.url=s.uploadUrl;U.chunk=s.chunk||U.chunk;U.samples=[[Date.now(),0]];loop(U)})
      .catch(function(e){fail(U,e.message)})}
  function pick(id){if(typeof data==='undefined'||!data)return;
    status(data.project.id).then(function(s){
      if(!s.ready){box(id,'fail','✕ '+(s.reason||'Unggah belum bisa dipakai.'),null,'');return}
      box(id,'',(id==='videoUrl'?'Pilih video (maks 2 GB).':'Pilih file materi (maks 200 MB).'),null,destText(s));
      var inp=g(id+'File');inp.value='';inp.click()})}
  document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-wu],[data-wu-pause],[data-wu-cancel]');if(!t)return;
    if(t.hasAttribute('data-wu')){pick(t.getAttribute('data-wu'));return}
    if(t.hasAttribute('data-wu-pause')){var U=CUR[t.getAttribute('data-wu-pause')];if(!U)return;
      if(U.paused){U.paused=false;U.samples=[[Date.now(),U.off]];box(U.id,'run','Melanjutkan…',U.off/U.file.size*100);resync(U).then(function(go){if(go)loop(U)})}
      else{U.paused=true;try{U.xhr&&U.xhr.abort()}catch(e){}box(U.id,'run','Dijeda di '+sz(U.off)+' / '+sz(U.file.size)+'. Tekan Lanjut untuk meneruskan.',U.off/U.file.size*100)}return}
    if(t.hasAttribute('data-wu-cancel')){var id=t.getAttribute('data-wu-cancel'),V=CUR[id];if(!V)return;V.cancel=true;try{V.xhr&&V.xhr.abort()}catch(e){}
      try{if(V.url)fetch(V.url,{method:'DELETE'}).catch(function(){})}catch(e){}delete CUR[id];box(id,'','Unggahan dibatalkan.',null);}});
  ['videoUrl','materialUrl'].forEach(function(id){var f=g(id+'File');if(f)f.addEventListener('change',function(){if(f.files&&f.files[0])start(id,f.files[0])})});
  window.addEventListener('beforeunload',function(e){if(busyAny()){e.preventDefault();e.returnValue='Unggahan masih berjalan.';return e.returnValue}});

  /* ---------- kiriman kontraktor & mode kontraktor ---------- */
  function note(d){var n=g('ktrNote');if(!n){n=document.createElement('div');n.id='ktrNote';n.className='ktr-note';var f=g('form');if(f)f.insertBefore(n,f.firstChild)}
    var dr=d.ktrDraft;
    if(d.ktrMode)n.innerHTML=dr?'<b>Kiriman Anda untuk WEEK '+d.week+'</b> ('+esc2(fmtAt(dr.at))+') sudah diterima dan menunggu diperiksa PIC/Admin. Anda masih bisa memperbaikinya lalu kirim ulang.'
      :'<b>Akun kontraktor:</b> isi data HSE dan/atau unggah video &amp; materi WEEK '+d.week+', lalu tekan <b>Kirim ke PIC / Admin</b>. Data masuk dashboard setelah diperiksa dan disimpan PIC/Admin.';
    else n.innerHTML=dr?'<b>Kiriman kontraktor</b> dari '+esc2(dr.byName||dr.by)+' · '+esc2(fmtAt(dr.at))+': data K3'+(dr.videoUrl?', link video':'')+(dr.materialUrl?', link materi':'')+' sudah dimuat ke form ini. Periksa, lalu tekan <b>Simpan ke database</b> agar masuk dashboard.':'';
    n.hidden=!n.innerHTML}
  var _render=render;
  render=function(d){
    var dr=d&&d.ktrDraft;
    if(dr){d.hse=d.hse||{};d.hse.current=Object.assign({},dr.hse||{});d.hse.enabled=dr.hseEnabled!==false;d.__hseShow=true;
      if(dr.videoUrl)d.videoUrl=dr.videoUrl;if(dr.materialUrl)d.materialUrl=dr.materialUrl}
    document.documentElement.classList.toggle('ktr-mode',!!(d&&d.ktrMode));
    _render(d);
    if(dr){['videoUrl','materialUrl'].forEach(function(id){if(dr[id]&&g(id).value.trim()===dr[id])setLink(id,'saved',d.ktrMode?'Link dari kiriman Anda.':'Link dari kiriman kontraktor.',dr[id])});
      if(dr.reportDate&&g('reportDate')&&!g('reportDate').value)g('reportDate').value=dr.reportDate}
    var hl=g('highlight');if(hl){var lb=hl.closest('label');if(lb)lb.hidden=!!d.ktrMode}
    var sb=g('submitBtn');if(sb){var ic=sb.querySelector('i');sb.textContent=d.ktrMode?'Kirim ke PIC / Admin':'Simpan ke database';if(ic)sb.insertBefore(ic,sb.firstChild)}
    ['videoUrl','materialUrl'].forEach(function(id){var b=g(id+'Wu');if(b&&!CUR[id])b.hidden=true});
    var h3=document.querySelector('#sec-highlight h3');if(h3){if(!h3.dataset.t0)h3.dataset.t0=h3.textContent;h3.textContent=d.ktrMode?'Video & materi minggu ini':h3.dataset.t0}
    note(d);
    try{recalc()}catch(e){}ktrMeter();
  };
  var _collect=collect;
  collect=function(){var c=_collect();if(data&&data.ktrDraft&&!data.ktrMode)c.ktrDraftAt=data.ktrDraft.at;return c};
  /* Meter kelengkapan mode kontraktor: dijalankan setelah perhitungan bawaan (listener bawaan memegang fungsi recalc asli). */
  function ktrMeter(){if(typeof data==='undefined'||!data||!data.ktrMode)return;var req=[!!g('reportDate').value];
    if(g('hseEnabled').checked)document.querySelectorAll('.hse').forEach(function(el){req.push(num(el.value)!=null)});
    var dn=req.filter(Boolean).length;g('meterBar').style.width=Math.round(dn/req.length*100)+'%';g('meterText').textContent='Kelengkapan: '+dn+' dari '+req.length+(dn===req.length?' · siap dikirim':'')}
  document.addEventListener('input',function(){setTimeout(ktrMeter,0)});document.addEventListener('change',function(){setTimeout(ktrMeter,0)});
  (function(){var mt=g('meterText');if(mt&&window.MutationObserver)new MutationObserver(function(){if(typeof data!=='undefined'&&data&&data.ktrMode&&mt.textContent.indexOf('Kelengkapan: ')!==0)ktrMeter()}).observe(mt,{childList:true,characterData:true,subtree:true})})();
  function ktrErrors(){var errs=[];
    if(busyAny())errs.push('Tunggu unggahan selesai');
    ['videoUrl','materialUrl'].forEach(function(id){var v=g(id).value.trim(),nm=id==='videoUrl'?'Link video':'Link materi';if(!v||v===savedLinks[id])return;
      if(!/^https:\/\//i.test(v)){errs.push(nm+' harus diawali https://');return}var st=linkState[id]||{};
      if(st.url!==v||!st.status||st.status==='busy'||st.status==='unchecked')errs.push(nm+' belum dicek. Tekan "Cek link" dulu.');else if(st.status==='fail')errs.push(nm+': '+st.message)});
    if(g('hseEnabled').checked)document.querySelectorAll('.hse').forEach(function(el){if(num(el.value)==null)errs.push('Data K3 "'+el.closest('label').querySelector('span').textContent.replace('*','').trim()+'" belum diisi')});
    if(!g('hseEnabled').checked&&!g('videoUrl').value.trim()&&!g('materialUrl').value.trim())errs.push('Isi data K3 atau link / unggah video & materi');
    return errs}
  var _open=openConfirm;
  openConfirm=function(){
    if(!data||busy)return;
    if(!data.ktrMode){if(busyAny()){showError('Tunggu unggahan video / materi selesai sebelum menyimpan.');return}return _open()}
    var errs=ktrErrors();if(errs.length){showError('Mohon lengkapi:\n• '+errs.join('\n• '));return}hideError();
    var rows=[['Proyek',data.project.name],['Periode','WEEK '+data.week+(data.period?' · '+data.period:'')],['Data K3',g('hseEnabled').checked?'Diisi':'Tidak ada'],
      ['Video',g('videoUrl').value.trim()||'—'],['Materi',g('materialUrl').value.trim()||'—']];
    g('cfTable').innerHTML=rows.map(function(r){return '<tr><td>'+esc2(r[0])+'</td><td>'+esc2(r[1])+'</td></tr>'}).join('');
    g('cfSub').textContent='Kiriman diteruskan ke PIC/Admin. Data masuk dashboard setelah mereka memeriksa dan menyimpannya.';
    var w=g('cfWarn');w.hidden=!data.ktrDraft;w.textContent=data.ktrDraft?'Kiriman sebelumnya untuk WEEK '+data.week+' akan diganti dengan isian ini.':'';
    g('confirmModal').hidden=false;g('cfGo').focus()};
  var _do=doSubmit;
  doSubmit=function(){
    if(!data||!data.ktrMode)return _do();if(busy)return;busy=true;var btn=g('cfGo');btn.disabled=true;btn.textContent='Mengirim…';
    run('submitKtrWeekly',[token,collect()],function(r){busy=false;btn.disabled=false;btn.textContent='Ya, simpan';closeModal('confirmModal');
      try{localStorage.removeItem(draftKey())}catch(e){}
      data.ktrDraft={at:r.at,byName:'',hseEnabled:g('hseEnabled').checked};note(data);
      if(typeof toast==='function')toast('Terkirim. PIC/Admin akan memeriksa dan menyimpan data WEEK '+r.week+'.');
    },function(){busy=false;btn.disabled=false;btn.textContent='Ya, simpan';closeModal('confirmModal')})};
})();
</script>
`;

const HTML_PATCHES = [
  { file: 'InputProgress', find: '</style>', replace: CSS + '</style>' },
  { file: 'InputProgress', find: lkFind('videoUrl'), replace: lkRepl('videoUrl') },
  { file: 'InputProgress', find: lkFind('materialUrl'), replace: lkRepl('materialUrl') },
  { file: 'InputProgress', find: 'const v=d.existing?cur[k]:null;', replace: 'const v=(d.existing||d.__hseShow)?cur[k]:null;' },
  { file: 'InputProgress', find: "$('hseIssue').value=d.existing?(cur.issue", replace: "$('hseIssue').value=(d.existing||d.__hseShow)?(cur.issue" },
  { file: 'InputProgress', find: 'Link baru wajib dicek (tombol <b>Cek link</b>) sebelum disimpan.',
    replace: 'Link baru wajib dicek (tombol <b>Cek link</b>) sebelum disimpan. Atau tekan <b>Unggah file</b>: video maks 2 GB, materi maks 200 MB, langsung ke Drive akun tim proyek dan link terisi otomatis. File lama yang diganti dipindah ke sampah Drive saat disimpan.' },
  { file: 'InputProgress', find: '</body>', replace: JS + '</body>' },
  // Menu ponsel / menu akun: kontraktor mendapat satu menu input.
  { file: 'AccountMenu', find: "    if(!ktr&&inp)out.push({tag:'INPUT'",
    replace: "    if(ktr)out.push({tag:'INPUT',t:'Input Mingguan',items:[['input','Input HSE & Video Mingguan','edit','Data K3 dan video/materi mingguan']]});\n    if(!ktr&&inp)out.push({tag:'INPUT'" },
];

module.exports = { WU_GS, GS_PATCHES, HTML_PATCHES };

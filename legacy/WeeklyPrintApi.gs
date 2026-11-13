/** Modul 5: laporan weekly cetak. Tidak menulis baseline / angka dashboard. */
const WR_SETTINGS = ['WR_PENGATURAN', ['PROYEK_ID','DATA_JSON','OLEH','PADA']];
const WR_HISTORY = ['WR_SNAPSHOT', ['ID','PROYEK_ID','BIDANG','WEEK','REVISI','BAGIAN','JUMLAH','DATA','PADA']];
function wrCtx_(token, projectId) {
  const user=requireUser_(token),db=loadDb_();
  const allowed=db.allProjects.filter(function(p){return userCanOperateProject_(user,p);});
  const p=allowed.find(function(p){return p.id===normKey_(projectId);})||findProject_(allowed,projectId);
  if(!p)throw new Error('Laporan weekly hanya tersedia untuk ADMIN dan INPUT/PIC proyek yang ditugaskan.');
  return {user:user,db:db,p:p,info:weeklyInfo_(db,p)};
}
function getWeeklyPrintList(token) {
  const user=requireUser_(token),db=loadDb_();
  return {projects:db.allProjects.filter(function(p){return userCanOperateProject_(user,p);}).map(function(p){return {id:p.id,name:p.name};})};
}
function wrJson_(v,def){try{return JSON.parse(String(v||''));}catch(e){return def;}}
function wrSettings_(pid){const rows=engRead_(WR_SETTINGS).filter(function(r){return String(r.PROYEK_ID)===pid;});return rows.length?wrJson_(rows[rows.length-1].DATA_JSON,{}):{};}
function saveWeeklyPrintSettings(token,projectId,settings,logo) {
  const c=wrCtx_(token,projectId),lock=pmoLock_('WPRINT');lock.waitLock(30000);
  try {
    const old=wrSettings_(c.p.id),out={};
    ['company','submitter','submitRole','approver','approveRole','location','contractNo','docNo'].forEach(function(k){out[k]=String((settings||{})[k]||'').trim().slice(0,200);});
    if(old.logoId)out.logoId=old.logoId;
    if(logo){
      const mime=String(logo.mime||'');if(!/^image\/(png|jpeg)$/.test(mime))throw new Error('Logo harus JPG atau PNG.');
      if(String(logo.base64||'').length>2900000)throw new Error('Logo maksimal 2 MB.');
      const bytes=Utilities.base64Decode(logo.base64||'');if(!bytes.length||bytes.length>2*1024*1024)throw new Error('Logo kosong atau melebihi 2 MB.');
      const png=bytes.length>8&&[137,80,78,71,13,10,26,10].every(function(v,i){return ((bytes[i]+256)%256)===v;});
      const jpg=bytes.length>3&&((bytes[0]+256)%256)===255&&((bytes[1]+256)%256)===216;
      if(!(mime==='image/png'?png:jpg))throw new Error('Isi file bukan logo JPG/PNG yang valid.');
      const folder=mrFolder_(c,'Pengaturan Weekly');
      const f=folder.createFile(Utilities.newBlob(bytes,mime,'Logo Kontraktor '+c.p.id+(mime==='image/png'?'.png':'.jpg')));
      out.logoId=f.getId(); // logo lama tetap tersedia; tidak menghapus berkas Drive.
    }
    const sh=engSheet_(WR_SETTINGS,true),rows=sh.getDataRange().getValues();let row=0;
    for(let i=1;i<rows.length;i++)if(String(rows[i][0])===c.p.id)row=i+1;
    sh.getRange(row||sh.getLastRow()+1,1,1,4).setValues([[c.p.id,JSON.stringify(out),c.user.username||c.user.name,new Date()]]);
    return {success:true,settings:out};
  } finally {lock.releaseLock();}
}
function wrLogo_(settings) {
  if(!settings.logoId)return '';
  try {const f=DriveApp.getFileById(settings.logoId),b=f.getBlob();if(b.getBytes().length>2*1024*1024)return '';return 'data:'+b.getContentType()+';base64,'+Utilities.base64Encode(b.getBytes());}catch(e){return '';}
}
/** Isolated, append-only archive. Existing save locks serialize these hooks. */
function wrArchive_(pid,F,rev,rows,headers) {
  if(!rows.length)return;
  const wi=headers.indexOf('WEEK'),week=Number(rows[0][wi]);if(!(week>=1))return;
  const packed=Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(JSON.stringify({headers:headers,rows:rows}),'application/json')).getBytes());
  const chunks=[];for(let i=0;i<packed.length;i+=40000)chunks.push(packed.slice(i,i+40000));
  const id=Utilities.getUuid(),now=new Date();
  engAppend_(WR_HISTORY,chunks.map(function(s,i){return [id,pid,F,week,rev==null?'':rev,i,chunks.length,s,now];}),false);
}
function wrCapturePrevious_(pid,F) {
  try {
    const def=F==='ENG'?ENG.SHEETS.REAL:EPC.SHEETS.REAL;
    const rows=engRead_(def).filter(function(r){return String(r.PROYEK_ID).trim().toUpperCase()===pid&&(F==='ENG'||String(r.BIDANG)===F);});
    if(!rows.length)return;
    const weeks={};rows.forEach(function(r){(weeks[Number(r.WEEK)]=weeks[Number(r.WEEK)]||[]).push(r);});
    const have=engRead_(WR_HISTORY).filter(function(r){return String(r.PROYEK_ID)===pid&&r.BIDANG===F;});
    Object.keys(weeks).forEach(function(w){if(have.some(function(r){return Number(r.WEEK)===Number(w);}))return;
      const rr=weeks[w];wrArchive_(pid,F,F==='ENG'?Number(rr[0].REVISI):null,rr.map(function(r){return def[1].map(function(h){return r[h]===undefined?'':r[h];});}),def[1]);});
  }catch(e){console.warn('Weekly snapshot sebelum simpan: '+e.message);}
}
function wrCaptureSaved_(pid,F,rev,rows,headers){try{wrArchive_(pid,F,rev,rows,headers);}catch(e){console.warn('Weekly snapshot: '+e.message);}}
function wrSnapshots_(read) {
  const groups={},out={};read(WR_HISTORY).forEach(function(r){const id=String(r.ID);const g=groups[id]=groups[id]||{f:r.BIDANG,w:Number(r.WEEK),rev:r.REVISI===''?null:Number(r.REVISI),n:Number(r.JUMLAH),parts:[],order:0};g.parts[Number(r.BAGIAN)]=String(r.DATA);g.order++;});
  Object.keys(groups).forEach(function(id){const g=groups[id];if(g.parts.length!==g.n||g.parts.filter(Boolean).length!==g.n)return;
    try{const raw=Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(g.parts.join('')))).getDataAsString();const pack=JSON.parse(raw);
      const rows=pack.rows.map(function(v){const r={};pack.headers.forEach(function(h,i){r[h]=v[i];});return r;});
      const k=g.f+'|'+g.w;(out[k]=out[k]||[]).push({rev:g.rev,rows:rows});
    }catch(e){console.warn('Snapshot laporan tidak lengkap: '+id);}});return out;
}
function wrSnapshotAt_(snaps,live,F,week,rev) {
  if(week===0)return {rows:[],known:true,zero:true,revision:rev};
  const all=snaps[F+'|'+week]||[],same=all.filter(function(s){return s.rev===rev;});
  if(same.length)return {rows:same[same.length-1].rows,known:true,revision:rev};
  const r=live.filter(function(r){return Number(r.WEEK)===week;});
  if(r.length){const ok=F!=='ENG'||r.every(function(x){return Number(x.REVISI)===rev;});return {rows:r,known:ok,revision:ok?rev:null};}
  if(all.length)return {rows:all[all.length-1].rows,known:false,revision:all[all.length-1].rev};
  // A completed field remains complete after its last submission; do not carry running work.
  if(live.length&&live.every(function(r){return Number(r.WEEK)<=week&&wrNum_(r[F==='ENG'?'PROGRES_DOK':'PROGRES'])>=99.999&&(F!=='ENG'||Number(r.REVISI)<=rev);})){return {rows:live,known:false,revision:null,completedWeek:Math.max.apply(null,live.map(function(r){return Number(r.WEEK);} ))};}
  return {rows:[],known:false,revision:null};
}
function wrNum_(v){if(v===''||v==null)return null;const n=Number(v);return isFinite(n)?n:null;}
function wrStage_(F,it,r,P,cut) {
  if(!r)return null;
  if(F!=='ENG')return [r.M1,r.M2,r.M3,r.M4].map(wrNum_);
  const weights=engPolaW_(P,it.pola)||[0,0,0,0],ok={};(P.codes||[]).forEach(function(c){if(String(c[2]).toUpperCase()==='YA')ok[String(c[0])]=true;});
  let prior=true;return ['IFR','IFA','IFC','IFI'].map(function(s,i){
    const date=engIso_(r[s+'_TERBIT']),issued=!!date&&date<=cut,approved=issued&&(i===3||ok[String(r[s+'_KODE'])]);
    const pg=weights[i]>0?(prior&&issued?(approved?100:Number(P.porsi)||0):0):0;prior=prior&&(weights[i]===0||approved);return pg;});
}
function wrBuildField_(F,name,items,P,rev,live,snaps,week,start,summaryHistory,weight) {
  const active={};items.forEach(function(it){active[String(F==='ENG'?it.no:it.id)]=true;});live=live.filter(function(r){return active[String(F==='ENG'?r.NOMOR_DOKUMEN:r.ID)];});
  const prev=wrEngRecon_(wrSnapshotAt_(snaps,live,F,week-1,rev),F,items,P,rev,live,start,week),cur=wrSnapshotAt_(snaps,live,F,week,rev),map=function(s){const m={};s.rows.forEach(function(r){m[String(F==='ENG'?r.NOMOR_DOKUMEN:r.ID)]=r;});return m;},pm=map(prev),cm=map(cur);
  const total=items.reduce(function(a,it){return a+it.w;},0),at=function(w,it){return F==='ENG'?(w?engDocPlan_(it,P,engCutoff_(start,w)):0):epcPlanAt_(it.plan,w);};
  const result={key:F,name:name,revision:rev,weight:weight,baseWeight:total,stages:F==='ENG'?['IFR','IFA','IFC','IFI']:F==='PROC'?['FAT / Inspection','FOB','MOS impor','MOS lokal']:F==='CONS'?['PREP','FAB','INS','FIN']:['Tahap 1','Tahap 2','Tahap 3','Tahap 4'],rows:[],notices:[],curve:[]};
  if(cur.completedWeek)result.notices.push('Bidang selesai 100% sesuai realisasi terakhir W'+cur.completedWeek+'. Nilai selesai dipertahankan; tidak dibuat tambahan item baru.');
  else if(!cur.known)result.notices.push(cur.rows.length?'Detail W'+week+' berasal dari data terakhir/arsip lama; revisi sumber belum terverifikasi.':'Detail aktual W'+week+' belum tersimpan. Nilai yang tidak tersedia ditampilkan —.');
  if(prev.recon)result.notices.push('Pembanding Engineering W'+(week-1)+' dihitung ulang dari tanggal terbit tiap tahap pada cut-off minggu tersebut.');
  if(!prev.known)result.notices.push('Pembanding detail W'+(week-1)+' pada revisi aktif belum tersedia. Tambahan per item ditampilkan —.');
  result.rows=items.map(function(it){const id=String(F==='ENG'?it.no:it.id),cr=cm[id],pr=pm[id];const actual=function(r,s){if(s.zero)return 0;if(!r)return null;return wrNum_(r[F==='ENG'?'PROGRES_DOK':'PROGRES']);};
    const a=actual(cr,cur),b=actual(pr,prev),pl=at(week,it),plb=at(week-1,it),ms=F==='ENG'?(engPolaW_(P,it.pola)||[0,0,0,0]):F==='PROC'?(it.t==='LN'?[P.ms[0],P.ms[1],P.ms[2],0]:[0,0,0,P.ms[3]]):P.ms;
    let s0=prev.zero?[0,0,0,0]:wrStage_(F,it,pr,P,engCutoff_(start,week-1)),s1=wrStage_(F,it,cr,P,engCutoff_(start,week));
    const consistent=function(st,pg){return !st||pg==null||Math.abs(st.reduce(function(n,v,i){return n+(v==null?0:v)*ms[i]/100;},0)-pg)<0.02;};
    const stageNote=!consistent(s0,b)||!consistent(s1,a);
    if(!consistent(s0,b))s0=null;if(!consistent(s1,a))s1=null;
    const delta=cur.known&&prev.known&&a!==null&&b!==null?a-b:null;
    const block=function(x,plan,st){return {progress:x,total:x===null?null:total?it.w*x/total:null,contract:x===null||weight==null?null:(F==='ENG'?it.w*weight/100:it.w)*x/100,plan:total?it.w*plan/total:null,stages:st};};
    return {id:id,code:it.c||it.wbs||it.no,name:it.n||it.name,group:it.gc||it.wbs||'',groupName:it.g||it.wbs||'',type:it.t||it.pola,stageNote:stageNote,weight:F==='ENG'?(weight==null?null:it.w*weight/100):it.w,fieldWeight:total?it.w/total*100:0,ms:ms,
      previous:block(b,plb,s0),current:block(a,pl,s1),added:block(delta,pl-plb,delta===null||!s0||!s1?null:s1.map(function(v,i){return v==null||s0[i]==null?null:v-s0[i];})),actual:a,plan:pl,dev:a===null?null:a-pl,changed:delta!==null&&delta>1e-8};
  });
  const aggregate=function(prop){return result.rows.every(function(r){return r[prop].progress!==null;})?result.rows.reduce(function(a,r){return a+ r[prop].total;},0):null;};
  let completedSummaryWeek=null;
  const exact=function(w){const rows=summaryHistory.filter(function(h){return Number(h.WEEK)===w;});if(rows.length)return wrNum_(rows[rows.length-1].REALISASI);
    if(F==='ENG'){const past=summaryHistory.filter(function(h){return Number(h.WEEK)<=w&&Number(h.REVISI)===rev;}).sort(function(a,b){return Number(a.WEEK)-Number(b.WEEK);});const last=past[past.length-1];if(last&&wrNum_(last.REALISASI)>=99.999){completedSummaryWeek=Number(last.WEEK);return wrNum_(last.REALISASI);}}
    return null;};
  const cp=total?items.reduce(function(a,it){return a+it.w*at(week,it);},0)/total:null,pp=total?items.reduce(function(a,it){return a+it.w*at(week-1,it);},0)/total:null;
  let ca=aggregate('current'),pa=aggregate('previous');if(ca===null)ca=exact(week);if(pa===null)pa=week===1?0:exact(week-1);
  if(completedSummaryWeek)result.notices.push('Ringkasan bidang Engineering selesai berdasarkan ENG_PROGRES W'+completedSummaryWeek+' pada revisi aktif; tidak mengada-adakan detail item minggu berikutnya.');
  result.summary={prevPlan:pp,prevActual:pa,plan:cp,actual:ca,addedPlan:cp==null||pp==null?null:cp-pp,addedActual:ca==null||pa==null?null:ca-pa,completedWeek:cur.completedWeek||completedSummaryWeek||null};
  const hist={};summaryHistory.forEach(function(h){hist[Number(h.WEEK)]=wrNum_(h.REALISASI);});
  const max=Math.min(1500,Math.max(week,items.reduce(function(n,it){const dates=(it.p||[]).filter(Boolean).sort();const end=dates.length?engAddDays_(dates[dates.length-1],Number(P.durasi)||0):'';return Math.max(n,(it.plan||[]).length,end?engWeekOf_(start,end)||0:0);},0)));
  for(let w=1;w<=max;w++)result.curve.push({week:w,plan:total?items.reduce(function(a,it){return a+it.w*at(w,it);},0)/total:null,actual:w<=week&&Object.prototype.hasOwnProperty.call(hist,w)?hist[w]:null});
  return result;
}
/** Engineering tanpa arsip minggu lalu: hitung ulang progres tiap dokumen dari tanggal terbit tiap tahap (<= cut-off minggu lalu). */
function wrEngRecon_(prev,F,items,P,rev,live,start,week){
  if(F!=='ENG'||!prev||prev.known||prev.zero||week<=1)return prev;
  const src=live.filter(function(r){return Number(r.REVISI)===rev;});if(!src.length)return prev;
  const cut=engCutoff_(start,week-1),byNo={};items.forEach(function(it){byNo[String(it.no)]=it;});
  const rows=src.map(function(r){const it=byNo[String(r.NOMOR_DOKUMEN)],o={};Object.keys(r).forEach(function(k){o[k]=r[k];});
    if(!it){o.PROGRES_DOK='';return o;}const st=wrStage_('ENG',it,r,P,cut)||[0,0,0,0],w=engPolaW_(P,it.pola)||[0,0,0,0];
    o.PROGRES_DOK=st.reduce(function(a,v,i){return a+(Number(v)||0)*(Number(w[i])||0)/100;},0);return o;});
  return {rows:rows,known:true,revision:rev,recon:true};
}
/** Impor arsip realisasi minggu lampau dari Template Realisasi EPCC (PROC/CONS/COM).
 *  Hanya menulis WR_SNAPSHOT; realisasi berjalan, baseline, dan angka dashboard tidak berubah. */
function importWeeklyArchive(token,projectId,pack,fileName){
  const c=wrCtx_(token,projectId),pid=c.p.id,week=Math.round(Number(pack&&pack.week));
  if(String((pack&&pack.pid)||'').trim().toUpperCase()!==pid)return {success:false,errors:['Template untuk proyek '+((pack&&pack.pid)||'?')+', bukan '+pid+'.']};
  if(!(week>=1))return {success:false,errors:['WEEK pada sheet INFO tidak valid.']};
  const store=epcStore_(),Fs=Object.keys((pack&&pack.fields)||{}).filter(function(F){return ['PROC','CONS','COM'].indexOf(F)>=0;});
  if(!Fs.length)return {success:false,errors:['Tidak ada sheet PROCUREMENT / CONSTRUCTION / COMMISSIONING di file.']};
  const errors=[],plan=[];
  Fs.forEach(function(F){const f=pack.fields[F]||{},key=pid+'|'+F,set=store.setting[key],nm=EPC.FIELDS[F]||F;
    if(f.err){errors.push(nm+': '+f.err);return;}
    if(!set){errors.push(nm+': baseline belum disimpan.');return;}
    if(Number(f.rev)!==Number(set.rev)){errors.push(nm+': template memakai Baseline Rev '+f.rev+', baseline aktif Rev '+set.rev+'. Unduh template dengan baseline aktif.');return;}
    const last=store.realWeek[key]||0;if(last&&week>=last){errors.push(nm+': WEEK '+week+' bukan minggu lampau (realisasi berjalan W'+last+'). Minggu berjalan diinput melalui EPCC Control.');return;}
    if((f.bad||[]).length){errors.push(nm+': '+f.bad.length+' sel di luar 0–100.');return;}
    const items=store.items[key+'|'+set.rev]||[],ids={};items.forEach(function(it){ids[String(it.id)]=true;});
    const matched=(f.rows||[]).filter(function(r){return r&&ids[String(r.id)];}).length;
    if(!matched){errors.push(nm+': tidak ada ID item yang cocok dengan baseline aktif.');return;}
    plan.push({F:F,key:key,set:set,f:f,items:items,matched:matched,nm:nm});});
  if(errors.length)return {success:false,errors:errors.slice(0,30)};
  const lock=pmoLock_('WPRINT');lock.waitLock(30000);
  try{
    const by=c.user.username||c.user.name||'',now=new Date(),done=[];
    plan.forEach(function(x){const params=epcParamsOf_(store,x.key,x.set.rev),byId={};(x.f.rows||[]).forEach(function(r){if(r&&r.id)byId[String(r.id)]=r;});
      const rows=x.items.map(function(it){const r=byId[String(it.id)];const m=[0,1,2,3].map(function(k){const v=Number(r&&r.m&&r.m[k]);return isFinite(v)?Math.max(0,Math.min(100,v)):0;});
        const pg=epcProg_(x.F,it,m,params);return [pid,x.F,week,it.id,epcRound_(m[0],4),epcRound_(m[1],4),epcRound_(m[2],4),epcRound_(m[3],4),epcRound_(pg,4),'','ARSIP '+String(fileName||'').slice(0,80),by,now];});
      wrArchive_(pid,x.F,Number(x.set.rev),rows,EPC.SHEETS.REAL[1]);done.push({field:x.nm,items:rows.length,matched:x.matched});});
    return {success:true,week:week,done:done};
  }finally{lock.releaseLock();}
}
function getWeeklyPrintReport(token,projectId,requestedWeek) {
  const c=wrCtx_(token,projectId),read=executiveLookAheadReader_(c.db.ss,[c.p]),start=c.info.startDate?isoDate_(c.info.startDate):'';
  if(!start)throw new Error('Tanggal mulai proyek belum tersedia.');
  const engReal=read(ENG.SHEETS.REAL),epcReal=read(EPC.SHEETS.REAL),engHist=read(ENG.SHEETS.PROGRES),epcHist=read(EPC.SHEETS.PROGRES),archiveRows=read(WR_HISTORY),weeks={};
  engReal.concat(epcReal,engHist,epcHist,archiveRows).forEach(function(r){const w=Number(r.WEEK);if(w>=1)weeks[w]=1;});
  const available=Object.keys(weeks).map(Number).sort(function(a,b){return a-b;}),week=requestedWeek==null?available[available.length-1]:Number(requestedWeek);
  if(!Number.isInteger(week)||week<1||week>1500||!weeks[week])throw new Error('Belum ada realisasi mingguan tercatat untuk periode tersebut.');
  const snaps=wrSnapshots_(function(){return archiveRows.filter(function(r){return Number(r.WEEK)===week||Number(r.WEEK)===week-1;});});
  const settings=wrSettings_(c.p.id),es=read(ENG.SHEETS.SETTING),er=read(ENG.SHEETS.REVISI),eb=read(ENG.SHEETS.BASELINE),ps=read(EPC.SHEETS.SETTING),pr=read(EPC.SHEETS.REVISI),pb=read(EPC.SHEETS.ITEM),fields=[];
  [['ENG','Engineering'],['PROC','Procurement'],['CONS','Construction'],['COM','Commissioning']].forEach(function(pair){const F=pair[0],isEng=F==='ENG',set=(isEng?es:ps).find(function(r){return isEng||r.BIDANG===F;});
    if(!set||set.REVISI_AKTIF===''||set.REVISI_AKTIF==null){fields.push({key:F,name:pair[1],notice:'Baseline aktif belum tersedia',rows:[],curve:[]});return;}
    const rev=Number(set.REVISI_AKTIF),r=(isEng?er:pr).find(function(r){return Number(r.REVISI)===rev&&(isEng||r.BIDANG===F);});
    if(!r){fields.push({key:F,name:pair[1],notice:'Baseline aktif belum tersubmit',rows:[],curve:[]});return;}
    const P=wrJson_(r.PARAMETER_JSON,{});if(!P.ms&&!isEng)P.ms=EPC.MS[F];
    let items=(isEng?eb:pb).filter(function(r){return Number(r.REVISI)===rev&&(isEng||r.BIDANG===F)&&String(r.STATUS).toUpperCase()!=='BATAL';}).sort(function(a,b){return Number(a.NO)-Number(b.NO);}).map(function(r){return isEng?{no:String(r.NOMOR_DOKUMEN),name:String(r.NAMA_DOKUMEN),wbs:String(r.PAKET_WBS||''),w:Number(r.BOBOT_DOK)||0,pola:String(r.POLA),p:[r.RENCANA_IFR,r.RENCANA_IFA,r.RENCANA_IFC,r.RENCANA_IFI].map(engIso_),m:engIso_(r.RENCANA_MULAI)}:{id:String(r.ID),c:String(r.KODE||r.ID),n:String(r.URAIAN),gc:String(r.GRUP_KODE||''),g:String(r.GRUP||''),t:String(r.TIPE),w:Number(r.BOBOT)||0,plan:wrJson_(r.RENCANA_JSON,[])};});
    const fw=isEng?Number(P.bidang):epcFieldWeight_({db:c.db,p:c.p,info:c.info},F);
    let weight=fw;if(isEng){weight=weekPercent_(c.db.weekly,c.p.id,'BOBOT_ENGINEERING',week);if(weight===null)weight=lastPercentBefore_(c.db.weekly,c.p.id,'BOBOT_ENGINEERING',week+1);}
    fields.push(wrBuildField_(F,pair[1],items,P,rev,isEng?engReal:epcReal.filter(function(r){return r.BIDANG===F;}),snaps,week,start,isEng?engHist:epcHist.filter(function(r){return r.BIDANG===F;}),weight));
  });
  return {success:true,project:{id:c.p.id,name:c.p.name,contractor:monthlyText_(c.db,c.p.id,'KONTRAKTOR')||''},week:week,weeks:available,start:engAddDays_(start,(week-1)*7),finish:engCutoff_(start,week),settings:settings,logo:wrLogo_(settings),ownerLogo:wrLogo_({logoId:'1LZynEU1SZ27JmRMPdv2D5CTxcd4cKp84'}),fields:fields};
}

/** Read-only contractor identity for the authorized Spotlight portfolio. */
function getSpotlightIdentity(token,projectId){
 const data=getExecutiveDashboardData(token,'');
 if(!(data.projects||[]).some(function(p){return p.projectId===projectId;}))throw new Error('Proyek tidak tersedia untuk akun ini.');
 const s=wrSettings_(projectId);return {logo:wrLogo_(s)};
}

function getSpotlightIntro(token){requireUser_(token);ktrBlock_(requireUser_(token));const f=DriveApp.getFileById('1_I7GjnposQYSsOWvT3K77pZupEK7rO53');if(f.getSize()>15000000)throw new Error('Video pembuka melebihi ukuran yang didukung.');const b=f.getBlob();return {mime:b.getContentType(),base64:Utilities.base64Encode(b.getBytes())};}

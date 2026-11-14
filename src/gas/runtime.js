'use strict';

/**
 * Menjalankan kode Apps Script lama (folder legacy/) di Node.js.
 *
 * Semua berkas .gs digabung (urut seperti di proyek Apps Script) ke dalam satu fungsi pabrik.
 * Setiap permintaan memanggil pabrik itu sekali, sehingga variabel tingkat atas
 * (cache, konfigurasi) selalu baru, sama seperti satu eksekusi Apps Script.
 * Data spreadsheet, cache, dan properti tetap dibagi lewat src/gas/store.js.
 */

const fs = require('node:fs');
const path = require('node:path');
const { makeGlobals, makeHtmlOutput } = require('./services');

const LEGACY_DIR = path.join(__dirname, '..', '..', 'legacy');

let factory = null;
const GLOBAL_NAMES = ['SpreadsheetApp', 'HtmlService', 'Utilities', 'ScriptApp', 'Session', 'Logger', 'console',
  'CacheService', 'PropertiesService', 'LockService', 'DriveApp', 'UrlFetchApp', 'MailApp', 'GmailApp',
  'DocumentApp', 'SlidesApp', 'ContentService', 'Drive'];
let htmlFiles = null;
let publicNames = null;

// Fungsi akun lama yang sudah digantikan halaman baru (/akun/password, /admin/akun).
const RETIRED = ['authCheckSetup', 'authCreateFirstAdmin', 'authBeginLogin', 'authCompleteLogin', 'authRequestAccount',
  'authBeginSignup', 'authCompleteSignup', 'authReviewAccount', 'authRequestReset', 'authResetRequests',
  'authIssueResetCode', 'authCancelReset', 'authBeginReset', 'authCompleteReset', 'authChangePwBegin',
  'authChangePwComplete'];

/** Pengelompokan kartu Portal (disisipkan ke Portal.html). */
const PORTAL_GROUPS_JS = `function pmoGroupedCards(items,b,card,esc,thumb){
  var G=(b.groups&&b.groups.map)||{},X=(b.groups&&b.groups.parents)||{};
  if(!document.getElementById('pmoGroupCss')){var st=document.createElement('style');st.id='pmoGroupCss';st.textContent='#pulse.pulse-g{display:block}.pg{margin:0 0 20px}.pg:last-child{margin-bottom:0}.pg-h{display:flex;align-items:center;flex-wrap:wrap;gap:4px 10px;margin:0 0 12px;font-size:14px;font-weight:700;color:var(--ink,#13324f)}.pg-h b{display:inline-block;padding:5px 14px;border-radius:99px;background:#0f5fa8;color:#fff;font-size:13px;letter-spacing:.02em}.pg.pg-rut .pg-h b{background:#0f8a5f}.pg{padding:12px;border-radius:18px;background:rgba(15,95,168,.05);border:1px solid rgba(15,95,168,.14)}.pg.pg-rut{background:rgba(15,138,95,.05);border-color:rgba(15,138,95,.16)}.pg-h span{font-size:12px;font-weight:500;color:var(--muted,#6b7c8a)}.pg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}.pc.pc-sub{border-left:4px solid var(--pri,#0f5fa8)}.pc-par{display:block;font-size:11px;font-weight:600;letter-spacing:.01em;opacity:.9;margin-bottom:3px}.pc-mn .pc-par{color:var(--pri,#0f5fa8);opacity:1}.pce{display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:var(--card,#fff);border:1px dashed var(--line,#d5dde3)}.pce .pc-img{opacity:.75}.pce-b{padding:14px}.pce-n{display:none;color:var(--ink,#13324f);font-size:15px;margin-bottom:4px}.pce p{margin:0;font-size:13px;color:var(--muted,#6b7c8a)}@media (max-width:760px){.pg-grid{grid-template-columns:minmax(0,1fr);gap:10px}.pc.pc-sub{margin-left:12px}.pce .pc-img{display:none}.pce-n{display:block}}';document.head.appendChild(st)}
  var type=function(id){return (G[id]&&G[id].type)||'PENGEMBANGAN'},par=function(id){return G[id]&&G[id].parent};
  var byId={},subs={};items.forEach(function(i){byId[i.projectId]=i});
  items.forEach(function(i){var pid=par(i.projectId);if(type(i.projectId)==='SUB'&&pid&&(byId[pid]||X[pid]))(subs[pid]=subs[pid]||[]).push(i)});
  var dev=[],rut=[];
  items.forEach(function(i){var t=type(i.projectId),pid=par(i.projectId);if(t==='SUB'&&pid&&(byId[pid]||X[pid]))return;(t==='RUTIN'?rut:dev).push(i)});
  Object.keys(subs).forEach(function(pid){if(!byId[pid]&&X[pid])dev.push({__empty:true,projectId:pid,name:X[pid].name,banner:X[pid].banner})});
  var nameOf=function(pid){return byId[pid]?byId[pid].name:X[pid]?X[pid].name:pid};
  var subCard=function(i){var lbl='<small class="pc-par">Sub-proyek \\u00b7 '+esc(pmoProjName(nameOf(par(i.projectId))))+'</small>';return card(i).replace('class="pc ','class="pc pc-sub ').replace('<h4>','<h4>'+lbl).replace('<div class="pc-mn"><b>','<div class="pc-mn"><b>'+lbl)};
  var empty=function(i){return '<div class="pce"><div class="pc-img"'+(i.banner?' style="background-image:url(\\''+thumb(i.banner,480)+'\\')"':'')+'><span class="pc-st wait">Belum ada data</span><h4>'+esc(pmoProjName(i.name))+'</h4></div><div class="pce-b"><b class="pce-n">'+esc(pmoProjName(i.name))+'</b><p>Belum ada data progres mingguan. Sub-proyeknya ditampilkan setelah kartu ini.</p></div></div>'};
  var count=function(list){var n=0,ok=0;var all=[];list.forEach(function(i){all.push(i);(subs[i.projectId]||[]).forEach(function(s){all.push(s)})});all.forEach(function(i){if(i.__empty)return;n++;var s=i.lw?i.lw.status:i.status;if(s==='On track')ok++});return n?n+' proyek \\u00b7 '+ok+' on track':''};
  var block=function(title,list){if(!list.length)return '';var h='';list.forEach(function(i){h+=i.__empty?empty(i):card(i);(subs[i.projectId]||[]).forEach(function(s){h+=subCard(s)})});return '<div class="pg '+(/Rutin/.test(title)?'pg-rut':'pg-dev')+'"><div class="pg-h"><b>'+title+'</b><span>'+count(list)+'</span></div><div class="pg-grid">'+h+'</div></div>'};
  $('pulse').classList.add('pulse-g');
  return block('Proyek Pengembangan',dev)+block('Proyek Investasi Rutin',rut);
}
`;

/** Executive: pengelompokan Pengembangan / Rutin (disisipkan ke ExecutiveDashboard.html). */
const EXEC_GROUPS_JS = `<script>
function pmoExecOrder(data){
  var G=(data&&data.groups&&data.groups.map)||{},N=(data&&data.groups&&data.groups.names)||{};
  var type=function(id){return (G[id]&&G[id].type)||'PENGEMBANGAN'},par=function(id){return G[id]&&G[id].parent};
  var nm=function(id){return typeof pmoProjName==='function'?pmoProjName(N[id]||id):(N[id]||id)};
  var projects=Array.isArray(data&&data.projects)?data.projects:[];
  var ids=projects.map(function(p){return p.projectId});
  var subsOf={},present={};ids.forEach(function(id){present[id]=1});
  ids.forEach(function(id){var pid=par(id);if(type(id)==='SUB'&&pid&&present[pid])(subsOf[pid]=subsOf[pid]||[]).push(id)});
  var isNested=function(id){var pid=par(id);return type(id)==='SUB'&&pid&&present[pid]};
  var order={PENGEMBANGAN:[],RUTIN:[]};
  ids.forEach(function(id){if(isNested(id))return;var t=type(id)==='RUTIN'?'RUTIN':'PENGEMBANGAN';order[t].push(id);(subsOf[id]||[]).forEach(function(s){order[t].push(s)})});
  var LABEL={PENGEMBANGAN:'Proyek Pengembangan',RUTIN:'Proyek Investasi Rutin'};
  var groupsUsed=['PENGEMBANGAN','RUTIN'].filter(function(t){return order[t].length});
  var nameToId={};
  projects.forEach(function(p){if(p.projectId&&p.name)nameToId[String(p.name).trim().toLowerCase()]=p.projectId});
  Object.keys(N).forEach(function(id){nameToId[String(N[id]||'').trim().toLowerCase()]=id;nameToId[String(nm(id)||'').trim().toLowerCase()]=id});
  return {G:G,N:N,type:type,par:par,nm:nm,projects:projects,ids:ids,isNested:isNested,order:order,LABEL:LABEL,groupsUsed:groupsUsed,nameToId:nameToId};
}
function pmoExecGroups(data){
  var O=pmoExecOrder(data),G=O.G,N=O.N,type=O.type,par=O.par,nm=O.nm,projects=O.projects,ids=O.ids,isNested=O.isNested,order=O.order,LABEL=O.LABEL,groupsUsed=O.groupsUsed,nameToId=O.nameToId;
  var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  if(!document.getElementById('pmoXgCss')){var st=document.createElement('style');st.id='pmoXgCss';st.textContent='.xg-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-top:14px}.xg-card{background:var(--card);border:1px solid var(--line);border-radius:var(--r,14px);box-shadow:var(--shadow);padding:16px 18px}.xg-card h4{margin:0 0 2px;font-size:15px}.xg-card .xg-sub{font-size:12px;color:var(--muted);margin:6px 0 8px}.xg-real{font-size:12.5px;color:var(--muted);margin-bottom:10px}.xg-real b{color:var(--ink,inherit)}.xg-list{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}.xg-list li{display:grid;grid-template-columns:minmax(0,1fr) auto 92px;gap:10px;align-items:center;padding:8px 2px;border-bottom:1px solid var(--line);font-size:13.5px}.xg-list li:last-child{border-bottom:0}.xg-nm{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis}.xg-nm small{display:block;font-size:11px;font-weight:600;color:var(--pri2)}.xg-li-sub .xg-nm{padding-left:14px;border-left:3px solid var(--pri2)}.xg-pct{font-variant-numeric:tabular-nums;font-weight:700}.xg-s{justify-self:end;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:99px;background:var(--th)}.xg-s.g{color:#0f6b48}.xg-s.a{color:#8a5a00}.xg-s.r{color:#a52826}.xg-kv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.xg-kv div{min-width:0}.xg-kv small{display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.03em}.xg-kv b{display:block;font-size:18px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.xg-kv em{font-style:normal;font-size:12px;color:var(--muted)}.xg-st{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.xg-st span{font-size:12px;font-weight:600;padding:3px 9px;border-radius:99px;background:var(--th)}.xg-st .g{color:#0f6b48}.xg-st .a{color:#8a5a00}.xg-st .r{color:#a52826}.xg-pos{color:#0f6b48}.xg-neg{color:#b42318}tr.xg-h td{text-align:left!important;font-weight:700;font-size:13px;letter-spacing:.02em;padding:10px 12px;border-left:5px solid #0f5fa8;background:rgba(15,95,168,.10)}tr.xg-h.xg-rut td{border-left-color:#0f8a5f;background:rgba(15,138,95,.10)}tr.xg-h td span{font-weight:500;color:var(--muted);margin-left:8px}.xg-pill{display:inline-block;padding:4px 12px;border-radius:99px;background:#0f5fa8;color:#fff;font-weight:700;font-size:12.5px;letter-spacing:.02em}.xg-pill.xg-rut{background:#0f8a5f}tr.xg-tot.xg-rut td{background:rgba(15,138,95,.08)}tr.xg-tot.xg-dev td{background:rgba(15,95,168,.08)}.xg-card{border-top:5px solid #0f5fa8}.xg-card.xg-rut{border-top-color:#0f8a5f}.xg-card h4 .xg-pill{font-size:13px}tr.xg-sub-row td:first-child,tr.xg-sub-row td.xg-name,td.md-name.xg-sub-cell{padding-left:28px}.xg-tag{display:block;font-size:11px;font-weight:600;color:var(--pri2);margin-bottom:2px}tr.xg-tot td{font-weight:700;background:rgba(127,160,190,.10)}.xg-fin-wrap{display:grid;grid-template-columns:1fr;gap:14px}.xg-fin-card{border:1px solid var(--line);border-top:4px solid #0f5fa8;border-radius:12px;padding:16px 18px;background:var(--th)}.xg-fin-card.xg-rut{border-top-color:#0f8a5f}.xg-fin-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}.xg-fin-head small{font-size:12px;color:var(--muted);font-weight:600}.xg-fin-money{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px 14px;margin-bottom:12px}.xg-fin-money div{min-width:0}.xg-fin-money small,.xg-fin-pctbox small{display:block;font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;font-weight:600}.xg-fin-money b{display:block;font-size:15px;margin-top:3px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.xg-fin-pcts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.xg-fin-pctbox{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px}.xg-fin-pcttop{display:flex;align-items:baseline;justify-content:space-between;gap:6px;margin-top:4px}.xg-fin-pcttop b{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums}.xg-fin-pcttop b.ok{color:#0f6b48}.xg-fin-pcttop b.warn{color:#b45309}.xg-fin-pcttop b.bad{color:#b42318}.xg-fin-bar{height:7px;border-radius:99px;background:var(--line);overflow:hidden;margin-top:7px}.xg-fin-bar>i{display:block;height:100%;border-radius:99px;background:#0f5fa8;transition:width .35s ease}.xg-fin-bar.ok>i{background:#0f8a5f}.xg-fin-bar.warn>i{background:#d97706}.xg-fin-bar.bad>i{background:#dc2626}@media (max-width:520px){.xg-fin-pcts{grid-template-columns:1fr}}.xg-la-h{display:flex;align-items:center;gap:8px;padding:9px 12px;margin:14px 0 8px;border-radius:10px;border-left:5px solid #0f5fa8;background:rgba(15,95,168,.10);font-size:13px}.xg-la-h:first-child{margin-top:0}.xg-la-h.xg-rut{border-left-color:#0f8a5f;background:rgba(15,138,95,.10)}.xg-la-h>span{color:var(--muted);font-size:12px}.xg-la-sub{margin-left:18px;border-left:3px solid var(--pri2);padding-left:6px;border-radius:8px}@media (max-width:700px){.xg-kv{grid-template-columns:repeat(2,minmax(0,1fr))}.xg-la-sub{margin-left:8px}}';document.head.appendChild(st)}

  var fin=data.financial,frows=fin&&Array.isArray(fin.rows)?fin.rows:[];
  var finById={};frows.forEach(function(f){if(f.projectId)finById[f.projectId]=f});
  var sum=function(list,k){var any=false,t=0;list.forEach(function(f){var v=f[k];if(v==null||v==='')return;any=true;t+=Number(v)});return any?t:null};
  var pc=function(v){return v==null||!isFinite(Number(v))?'—':(Number(v)*100).toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'};

  // ---------- tabel status proyek ----------
  var pBody=document.getElementById('projectRows');
  if(pBody&&projects.length&&pBody.children.length>=projects.length){
    var trs=Array.prototype.slice.call(pBody.children,0,projects.length),byId={};
    projects.forEach(function(p,i){byId[p.projectId]=trs[i]});
    var cols=(trs[0]&&trs[0].children.length)||9;
    var frag=document.createDocumentFragment();
    groupsUsed.forEach(function(t){
      var h=document.createElement('tr');h.className='xg-h '+(t==='RUTIN'?'xg-rut':'xg-dev');h.setAttribute('data-xg',t);h.innerHTML='<td colspan="'+cols+'"><b class="xg-pill '+(t==='RUTIN'?'xg-rut':'xg-dev')+'">'+LABEL[t]+'</b><span>'+order[t].length+' proyek</span></td>';frag.appendChild(h);
      order[t].forEach(function(id){var tr=byId[id];if(!tr)return;tr.setAttribute('data-xg',t);if(type(id)==='SUB'&&par(id)){if(isNested(id))tr.classList.add('xg-sub-row');var b=tr.querySelector('.proj');if(b&&!tr.querySelector('.xg-tag'))b.insertAdjacentHTML('beforebegin','<span class="xg-tag">Sub-proyek · '+esc(nm(par(id)))+'</span>')}frag.appendChild(tr)});
    });
    Array.prototype.slice.call(pBody.children).forEach(function(tr){if(tr.id==='stageEmpty')frag.appendChild(tr)});
    pBody.innerHTML='';pBody.appendChild(frag);pmoXgHeaders();
  }

  // ---------- card realisasi keuangan per kelompok (menggantikan total) ----------
  var fPanel=document.querySelector('#financePanel .pb');
  if(fPanel&&fin&&frows.length){
    var fc=fPanel.querySelector('.fin-cards');
    var oldFw=document.getElementById('pmoFinGroups');if(oldFw)oldFw.remove();
    if(groupsUsed.length){
      if(fc)fc.style.display='none';
      var rp=function(v){if(v==null||!isFinite(Number(v)))return '—';return 'Rp '+Math.round(Number(v)*1000000).toLocaleString('id-ID')};
      var pctBox=function(label,v,mode){
        var p=v==null||!isFinite(Number(v))?null:Math.max(0,Math.min(100,Number(v)*100));
        var cls=p==null?'':(mode==='rkap'?(p>=85?'ok':p>=55?'warn':'bad'):(p>=50?'ok':p>=20?'warn':'bad'));
        return '<div class="xg-fin-pctbox"><small>'+label+'</small><div class="xg-fin-pcttop"><b class="'+cls+'">'+pc(v)+'</b></div><div class="xg-fin-bar '+cls+'"><i style="width:'+(p==null?0:p.toFixed(1))+'%"></i></div></div>';
      };
      var fw=document.createElement('div');fw.id='pmoFinGroups';fw.className='xg-fin-wrap';
      fw.innerHTML=groupsUsed.map(function(t){
        var list=order[t].map(function(id){return finById[id]}).filter(Boolean);
        var inv=sum(list,'investment'),ctr=sum(list,'contract'),act=sum(list,'actualToDate'),rkap=sum(list,'rkap2026'),tot=sum(list,'totalToDate');
        var rkapPct=rkap?act/rkap:null,invPct=inv?tot/inv:null;
        return '<div class="xg-fin-card '+(t==='RUTIN'?'xg-rut':'xg-dev')+'"><div class="xg-fin-head"><b class="xg-pill '+(t==='RUTIN'?'xg-rut':'xg-dev')+'">'+LABEL[t]+'</b><small>'+list.length+' proyek</small></div><div class="xg-fin-money"><div><small>Nilai investasi</small><b>'+rp(inv)+'</b></div><div><small>Nilai kontrak</small><b>'+rp(ctr)+'</b></div><div><small>Realisasi s.d. bulan pilihan</small><b>'+rp(act)+'</b></div></div><div class="xg-fin-pcts">'+pctBox('Pencapaian RKAP 2026',rkapPct,'rkap')+pctBox('Capaian nilai investasi',invPct,'inv')+'</div></div>';
      }).join('');
      fPanel.appendChild(fw);
    }else if(fc){fc.style.display='';}
  }

  // ---------- tabel keuangan ----------
  var fBody=document.getElementById('financialRows');
  if(fBody&&frows.length&&fBody.children.length>=frows.length&&frows.every(function(f){return f.projectId})){
    var ftrs=Array.prototype.slice.call(fBody.children,0,frows.length),fById={};
    frows.forEach(function(f,i){fById[f.projectId]=ftrs[i]});
    var jt=function(v){if(v==null||v===''||!isFinite(Number(v))||Math.abs(Number(v))<0.05)return '—';return Number(v).toLocaleString('id-ID',{minimumFractionDigits:0,maximumFractionDigits:1})};
    var ff=document.createDocumentFragment(),no=0;
    groupsUsed.forEach(function(t){
      var list=order[t].map(function(id){return finById[id]}).filter(Boolean);
      var h=document.createElement('tr');h.className='xg-h '+(t==='RUTIN'?'xg-rut':'xg-dev');h.innerHTML='<td colspan="13"><b class="xg-pill '+(t==='RUTIN'?'xg-rut':'xg-dev')+'">'+LABEL[t]+'</b><span>'+list.length+' proyek</span></td>';ff.appendChild(h);
      order[t].forEach(function(id){var tr=fById[id];if(!tr)return;no++;if(tr.children[0])tr.children[0].textContent=no;if(type(id)==='SUB'&&par(id)){if(isNested(id))tr.classList.add('xg-sub-row');var c=tr.children[1];if(c&&!c.querySelector('.xg-tag')){c.classList.add('xg-name');c.insertAdjacentHTML('afterbegin','<span class="xg-tag">Sub-proyek · '+esc(nm(par(id)))+'</span>')}}ff.appendChild(tr)});
      var T={investment:sum(list,'investment'),contract:sum(list,'contract'),weight:sum(list,'weight'),historical:sum(list,'historical'),monthActual:sum(list,'monthActual'),monthRkap:sum(list,'monthRkap'),actualToDate:sum(list,'actualToDate'),rkap2026:sum(list,'rkap2026'),totalToDate:sum(list,'totalToDate')};
      var tot=document.createElement('tr');tot.className='xg-tot '+(t==='RUTIN'?'xg-rut':'xg-dev');
      tot.innerHTML='<td></td><td>Total '+LABEL[t].replace('Proyek ','')+'</td><td>'+jt(T.investment)+'</td><td>'+jt(T.contract)+'</td><td>'+pc(T.weight)+'</td><td>'+jt(T.historical)+'</td><td>'+jt(T.monthActual)+'</td><td>'+jt(T.monthRkap)+'</td><td>'+jt(T.actualToDate)+'</td><td>'+jt(T.rkap2026)+'</td><td>'+jt(T.totalToDate)+'</td><td>'+pc(T.rkap2026?T.actualToDate/T.rkap2026:null)+'</td><td>'+pc(T.investment?T.totalToDate/T.investment:null)+'</td>';
      if(groupsUsed.length>1)ff.appendChild(tot);
    });
    fBody.innerHTML='';fBody.appendChild(ff);
    var ft=document.getElementById('financialTotal');if(ft)ft.style.display='none';
  }

  // ---------- tabel next target progress & milestone ----------
  var mBody=document.getElementById('milestoneRows');
  var mList=(Array.isArray(data.milestones)?data.milestones:[]).filter(function(m){return !m.stage||m.stage==='BERJALAN'});
  if(mBody&&mList.length&&mBody.children.length>=mList.length&&!mBody.querySelector('tr.xg-h')){
    var mtrs=Array.prototype.slice.call(mBody.children,0,mList.length),mById={},mOther=[];
    mList.forEach(function(m,i){
      var id=m.projectId||(m.projectIndex!=null&&projects[m.projectIndex]&&projects[m.projectIndex].projectId)||nameToId[String(m.project||'').trim().toLowerCase()];
      if(id&&!mById[id])mById[id]=mtrs[i];else mOther.push(mtrs[i]);
    });
    var mf=document.createDocumentFragment(),mno=0;
    groupsUsed.forEach(function(t){
      var items=order[t].filter(function(id){return !!mById[id]});
      if(!items.length)return;
      var h=document.createElement('tr');h.className='xg-h '+(t==='RUTIN'?'xg-rut':'xg-dev');h.innerHTML='<td colspan="6"><b class="xg-pill '+(t==='RUTIN'?'xg-rut':'xg-dev')+'">'+LABEL[t]+'</b><span>'+items.length+' proyek</span></td>';mf.appendChild(h);
      items.forEach(function(id){
        var tr=mById[id];mno++;if(tr.children[0])tr.children[0].textContent=mno;
        if(type(id)==='SUB'&&par(id)){if(isNested(id))tr.classList.add('xg-sub-row');var c=tr.children[1];if(c&&!c.querySelector('.xg-tag')){c.classList.add('xg-name');c.insertAdjacentHTML('afterbegin','<span class="xg-tag">Sub-proyek · '+esc(nm(par(id)))+'</span>')}}
        mf.appendChild(tr);
      });
    });
    mOther.forEach(function(tr){mno++;if(tr.children[0])tr.children[0].textContent=mno;mf.appendChild(tr)});
    mBody.innerHTML='';mBody.appendChild(mf);
  }

  // ---------- ringkasan per kelompok ----------
  var box=document.getElementById('pmoGroupSummary');
  if(box){
    var cards=groupsUsed.map(function(t){
      var list=order[t].map(function(id){return projects[ids.indexOf(id)]}).filter(function(p){return p&&(p.stage||'BERJALAN')==='BERJALAN'});
      var c={g:0,a:0,r:0};list.forEach(function(p){var s=String(p.status||'');if(s==='On track')c.g++;else if(s==='At risk')c.a++;else if(s==='Critical')c.r++});
      var fl=order[t].map(function(id){return finById[id]}).filter(Boolean);
      var rl='';if(fin){var inv=sum(fl,'investment'),ttd=sum(fl,'totalToDate');rl='<div class="xg-real">Realisasi s.d. bulan ini <b>'+(ttd==null?'—':'Rp '+(ttd/1e3).toLocaleString('id-ID',{maximumFractionDigits:1})+' M')+'</b> · '+pc(inv?ttd/inv:null)+' dari investasi</div>'}
      var li=list.map(function(p){var s=String(p.status||''),c=s==='On track'?'g':s==='At risk'?'a':s==='Critical'?'r':'n',sub=type(p.projectId)==='SUB'&&par(p.projectId);
        return '<li class="'+(sub?'xg-li-sub':'')+'"><span class="xg-nm">'+(sub?'<small>Sub · '+esc(nm(par(p.projectId)))+'</small>':'')+esc(nm(p.projectId)||p.name)+'</span><span class="xg-pct">'+(p.actual==null?'—':pc(p.actual))+'</span><span class="xg-s '+c+'">'+esc(s||'—')+'</span></li>'}).join('');
      return '<article class="xg-card '+(t==='RUTIN'?'xg-rut':'xg-dev')+'"><h4><b class="xg-pill '+(t==='RUTIN'?'xg-rut':'xg-dev')+'">'+LABEL[t]+'</b></h4><div class="xg-sub">'+list.length+' proyek berjalan · '+c.g+' on track · '+c.a+' at risk · '+c.r+' critical</div>'+rl+'<ul class="xg-list">'+(li||'<li><span class="xg-nm">Belum ada proyek berjalan.</span></li>')+'</ul></article>';
    });
    box.innerHTML=cards.join('');box.hidden=!cards.length;
  }

  // ---------- peta deviasi bulanan & 3 month look ahead ----------
  pmoExecGroupMd(data);
  pmoExecGroupLa(data);
}
function pmoExecGroupMd(data){
  var tbody=document.querySelector('#monthlyDeviationMap table.md-table tbody');
  var mdProjs=(typeof monthlyDeviationData!=='undefined'&&monthlyDeviationData&&Array.isArray(monthlyDeviationData.projects))?monthlyDeviationData.projects:[];
  if(!tbody||!mdProjs.length||tbody.children.length<mdProjs.length||tbody.querySelector('tr.xg-h'))return;
  var O=pmoExecOrder(data),type=O.type,par=O.par,nm=O.nm,isNested=O.isNested,order=O.order,LABEL=O.LABEL,groupsUsed=O.groupsUsed;
  var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  var trs=Array.prototype.slice.call(tbody.children,0,mdProjs.length),byId={},other=[];
  mdProjs.forEach(function(p,i){var id=p.id||O.nameToId[String(p.name||'').trim().toLowerCase()];if(id&&!byId[id])byId[id]=trs[i];else other.push(trs[i])});
  var cols=(trs[0]&&trs[0].children.length)||2,frag=document.createDocumentFragment();
  groupsUsed.forEach(function(t){
    var items=order[t].filter(function(id){return !!byId[id]});
    if(!items.length)return;
    var h=document.createElement('tr');h.className='xg-h '+(t==='RUTIN'?'xg-rut':'xg-dev');h.innerHTML='<td colspan="'+cols+'"><b class="xg-pill '+(t==='RUTIN'?'xg-rut':'xg-dev')+'">'+LABEL[t]+'</b><span>'+items.length+' proyek</span></td>';frag.appendChild(h);
    items.forEach(function(id){
      var tr=byId[id];
      if(type(id)==='SUB'&&par(id)){var td=tr.querySelector('td.md-name');if(td){if(isNested(id))td.classList.add('xg-sub-cell');if(!td.querySelector('.xg-tag'))td.insertAdjacentHTML('afterbegin','<span class="xg-tag">Sub-proyek · '+esc(nm(par(id)))+'</span>')}}
      frag.appendChild(tr);
    });
  });
  other.forEach(function(tr){frag.appendChild(tr)});
  tbody.innerHTML='';tbody.appendChild(frag);
}
function pmoExecGroupLa(data){
  var host=document.getElementById('executiveLookAhead');
  var laProjs=(window.__execLa&&Array.isArray(window.__execLa.projects))?window.__execLa.projects:[];
  if(!host||!laProjs.length||host.querySelector('.xg-la-h'))return;
  var dets=Array.prototype.slice.call(host.querySelectorAll('details.exec-la-project'));
  if(dets.length<laProjs.length)return;
  var O=pmoExecOrder(data),type=O.type,par=O.par,nm=O.nm,isNested=O.isNested,order=O.order,LABEL=O.LABEL,groupsUsed=O.groupsUsed;
  var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  var byId={},other=[];
  laProjs.forEach(function(p,i){var id=p.id||O.nameToId[String(p.name||'').trim().toLowerCase()];if(id&&!byId[id])byId[id]=dets[i];else other.push(dets[i])});
  var frag=document.createDocumentFragment();
  groupsUsed.forEach(function(t){
    var items=order[t].filter(function(id){return !!byId[id]});
    if(!items.length)return;
    var h=document.createElement('div');h.className='xg-la-h '+(t==='RUTIN'?'xg-rut':'xg-dev');
    h.innerHTML='<b class="xg-pill '+(t==='RUTIN'?'xg-rut':'xg-dev')+'">'+LABEL[t]+'</b><span>'+items.length+' proyek</span>';
    frag.appendChild(h);
    items.forEach(function(id){
      var d=byId[id];
      if(type(id)==='SUB'&&par(id)){if(isNested(id))d.classList.add('xg-la-sub');var sm=d.querySelector('summary > span');if(sm&&!sm.querySelector('.xg-tag'))sm.insertAdjacentHTML('afterbegin','<span class="xg-tag">Sub-proyek · '+esc(nm(par(id)))+'</span>')}
      frag.appendChild(d);
    });
  });
  other.forEach(function(d){frag.appendChild(d)});
  host.innerHTML='';host.appendChild(frag);
}
function pmoXgHeaders(){
  var body=document.getElementById('projectRows');if(!body)return;
  Array.prototype.forEach.call(body.querySelectorAll('tr.xg-h'),function(h){var t=h.getAttribute('data-xg');var vis=Array.prototype.some.call(body.querySelectorAll('tr[data-stage][data-xg="'+t+'"]'),function(tr){return !tr.hidden});h.hidden=!vis});
}
(function(){if(typeof applyStageFilter==='function'){var o=applyStageFilter;applyStageFilter=function(){o.apply(this,arguments);try{pmoXgHeaders()}catch(e){}}}})();
(function(){if(typeof renderMonthlyDeviation==='function'){var o=renderMonthlyDeviation;renderMonthlyDeviation=function(){o.apply(this,arguments);try{if(typeof currentReportData!=='undefined'&&currentReportData)pmoExecGroupMd(currentReportData)}catch(e){console.warn('pmoExecGroupMd',e)}}}})();
(function(){if(typeof renderExecutiveLookAhead==='function'){var o=renderExecutiveLookAhead;renderExecutiveLookAhead=function(){o.apply(this,arguments);try{if(typeof currentReportData!=='undefined'&&currentReportData)pmoExecGroupLa(currentReportData)}catch(e){console.warn('pmoExecGroupLa',e)}}}})();
/* Data dari cache browser bisa sudah tampil sebelum skrip ini dimuat: kelompokkan sekarang. */
try{if(typeof currentReportData!=='undefined'&&currentReportData&&!document.querySelector('#projectRows tr.xg-h'))pmoExecGroups(currentReportData)}catch(e){console.warn('pmoExecGroups',e)}
try{if(typeof currentReportData!=='undefined'&&currentReportData){pmoExecGroupMd(currentReportData);pmoExecGroupLa(currentReportData)}}catch(e){console.warn('pmoExecGroupsExtra',e)}
try{var __st=document.getElementById('exStories');if(__st&&!__st.querySelector('.gl-st')&&typeof renderExecStories==='function'&&window.pmoGallery)renderExecStories(typeof currentReportData!=='undefined'&&currentReportData?currentReportData.period:'')}catch(e){console.warn('stories',e)}
</script>`;

/** Tambah/Edit Proyek: perilaku isian kelompok proyek (disisipkan ke ProjectSetup.html). */
const PROJECT_GROUP_JS = `<script>
function pmoGrpRoutine(){var g=document.getElementById('fGroup');return !!g&&g.value!=='PENGEMBANGAN'}
function pmoGrpApply(){
  var t=document.getElementById('fGroup').value,id=String(document.getElementById('fId').value||'').trim().toUpperCase(),sel=document.getElementById('fParent');
  var cur=sel.value||sel.getAttribute('data-cur')||'';
  var list=(typeof ctx!=='undefined'&&ctx&&ctx.devProjects)||[];
  sel.innerHTML='<option value="">Pilih proyek induk…</option>'+list.filter(function(p){return p.id!==id}).map(function(p){return '<option value="'+p.id+'"'+(p.id===cur?' selected':'')+'>'+String(p.name||p.id).replace(/</g,'&lt;')+'</option>'}).join('');
  document.getElementById('wParent').hidden=t!=='SUB';
  ['wPlant','wIdc','wPm'].forEach(function(k){var e=document.getElementById(k);if(e)e.hidden=t!=='PENGEMBANGAN'});
  document.getElementById('grpHint').textContent=t==='PENGEMBANGAN'?'Plant cost FS wajib. IDC dan PM cost FS boleh dilengkapi menyusul.':t==='RUTIN'?'Cukup nilai kontrak. Nilai investasi = nilai kontrak.':'Cukup nilai kontrak. Laporannya dikelompokkan di bawah proyek induk.';
  if(typeof moneyHints==='function')moneyHints();
}
function pmoGrpFill(p){
  var g=document.getElementById('fGroup'),sel=document.getElementById('fParent');if(!g)return;
  g.value=(p&&p.groupType)||'PENGEMBANGAN';sel.setAttribute('data-cur',(p&&p.parentId)||'');sel.value='';pmoGrpApply();
}
(function(){
  var g=document.getElementById('fGroup'),sel=document.getElementById('fParent');if(!g)return;
  g.addEventListener('change',function(){pmoGrpApply();if(typeof refresh==='function')refresh()});
  sel.addEventListener('change',function(){sel.setAttribute('data-cur',sel.value);if(typeof refresh==='function')refresh()});
  pmoGrpApply();
})();
</script>`;

/**
 * Perubahan kecil pada HTML lama, diterapkan saat dimuat supaya berkas di legacy/
 * tetap identik dengan Apps Script (mudah disinkronkan ulang).
 */
const { PRES_EXTRA_JS } = require('./pres-extra');

const HTML_PATCHES = [
  {
    file: 'AccountMenu',
    find: "b.innerHTML=SV(kind==='admin'?USR:KEY)+'<span>'+(kind==='admin'?'Reset password pengguna':'Ganti password')+'</span>';b.onclick=function(e){e.stopPropagation();kind==='admin'?admin():change()};",
    replace: "var NAV={self:['Ganti password','/akun/password'],admin:['Kelola Akun','/admin/akun'],data:['Impor Data','/admin/data'],kelompok:['Kelompok Proyek','/admin/kelompok'],google:['Koneksi Google','/admin/google']}[kind];b.innerHTML=SV(kind==='self'?KEY:USR)+'<span>'+NAV[0]+'</span>';b.onclick=function(e){e.stopPropagation();location.href=NAV[1]};",
  },
  {
    // Menu admin server baru: Kelola Akun, Impor Data, Koneksi Google.
    file: 'AccountMenu',
    find: "p.insertBefore(btnFor(ref,'self'),ref);if(role==='ADMIN')p.insertBefore(btnFor(ref,'admin'),ref)",
    replace: "p.insertBefore(btnFor(ref,'self'),ref);if(role==='ADMIN'){p.insertBefore(btnFor(ref,'admin'),ref);p.insertBefore(btnFor(ref,'data'),ref);p.insertBefore(btnFor(ref,'kelompok'),ref);p.insertBefore(btnFor(ref,'google'),ref)}",
  },
  {
    // Kartu proyek Portal: pakai nilai week terakhir (field lw) dan tanpa baris "Naik … poin".
    file: 'Portal',
    find: "$('pulse').innerHTML=items.map(function(i){",
    replace: "const __card=function(i){i=i.lw?Object.assign({},i,i.lw,{pending:false,prevActual:null,cutWeek:i.lw.week,last:null}):Object.assign({},i,{prevActual:null});",
  },
  {
    // Kartu dikelompokkan: Pengembangan (sub-proyek di bawah induknya) dan Rutin.
    file: 'Portal',
    find: "+'</button>'}).join('');\n  $('pulse').querySelectorAll('.pc')",
    replace: "+'</button>'};$('pulse').innerHTML=pmoGroupedCards(items,b,__card,esc,thumb);\n  $('pulse').querySelectorAll('.pc')",
  },
  {
    file: 'Portal',
    find: 'function renderPulse(b){',
    replace: PORTAL_GROUPS_JS + 'function renderPulse(b){',
  },
  // Tambah/Edit Proyek: isian kelompok proyek dan proyek induk.
  {
    file: 'ProjectSetup',
    find: '<label class="f"><span>Kapasitas</span><input class="inp" id="fCapacity" placeholder="contoh: 500.000 ton/tahun"></label>\n          </div>',
    replace: '<label class="f"><span>Kapasitas</span><input class="inp" id="fCapacity" placeholder="contoh: 500.000 ton/tahun"></label>\n          </div>\n          <div class="g g2b"><label class="f"><span>Kelompok proyek <em>*</em></span><select class="inp" id="fGroup"><option value="PENGEMBANGAN">Pengembangan</option><option value="RUTIN">Investasi rutin</option><option value="SUB">Sub-proyek</option></select><small class="hint" id="grpHint"></small></label><label class="f" id="wParent" hidden><span>Proyek induk <em>*</em></span><select class="inp" id="fParent"></select><small class="hint">Laporan sub-proyek dikelompokkan di bawah proyek induk ini.</small></label></div>',
  },
  { file: 'ProjectSetup', find: '<label class="f"><span>Plant cost FS <em>*</em></span>', replace: '<label class="f" id="wPlant"><span>Plant cost FS <em>*</em></span>' },
  { file: 'ProjectSetup', find: '<label class="f"><span>IDC FS</span>', replace: '<label class="f" id="wIdc"><span>IDC FS</span>' },
  { file: 'ProjectSetup', find: '<label class="f"><span>PM cost FS</span>', replace: '<label class="f" id="wPm"><span>PM cost FS</span>' },
  {
    file: 'ProjectSetup',
    find: "function fillForm(d){\n  const p=d?d.project:{};",
    replace: "function fillForm(d){\n  const p=d?d.project:{};pmoGrpFill(p);",
  },
  {
    file: 'ProjectSetup',
    find: "contractValue:pmoney($('fContract').value),plantFs:pmoney($('fPlant').value),idcFs:pmoney($('fIdc').value),pmFs:pmoney($('fPm').value),",
    replace: "contractValue:pmoney($('fContract').value),plantFs:pmoGrpRoutine()?pmoney($('fContract').value):pmoney($('fPlant').value),idcFs:pmoGrpRoutine()?0:pmoney($('fIdc').value),pmFs:pmoGrpRoutine()?0:pmoney($('fPm').value),groupType:$('fGroup').value,parentId:$('fGroup').value==='SUB'?$('fParent').value:'',",
  },
  {
    file: 'ProjectSetup',
    find: "add(pmoney($('fContract').value)!=null,'Nilai kontrak');add(pmoney($('fPlant').value)!=null,'Plant cost FS');",
    replace: "add(pmoney($('fContract').value)!=null,'Nilai kontrak');if(!pmoGrpRoutine())add(pmoney($('fPlant').value)!=null,'Plant cost FS');if($('fGroup').value==='SUB')add(!!$('fParent').value,'Proyek induk');",
  },
  {
    file: 'ProjectSetup',
    find: "const pl=pmoney($('fPlant').value),idc=pmoney($('fIdc').value)||0,pm=pmoney($('fPm').value)||0;",
    replace: "const rt=pmoGrpRoutine(),pl=rt?pmoney($('fContract').value):pmoney($('fPlant').value),idc=rt?0:(pmoney($('fIdc').value)||0),pm=rt?0:(pmoney($('fPm').value)||0);",
  },
  { file: 'ProjectSetup', find: '</body>', replace: PROJECT_GROUP_JS + '</body>' },
  // Executive: ringkasan per kelompok + tabel proyek & keuangan dikelompokkan.
  {
    file: 'ExecutiveDashboard',
    find: '</section>\n\n      <section class="grid g-ov">',
    replace: '</section>\n      <section class="xg-sum" id="pmoGroupSummary" hidden aria-label="Ringkasan per kelompok proyek"></section>\n\n      <section class="grid g-ov">',
  },
  {
    file: 'ExecutiveDashboard',
    find: "if(window.pmoIcons)pmoIcons(document.getElementById('reports'));\n}\ndocument.addEventListener('click',function(event){if(!event.target.closest('.period-control'))",
    replace: "if(window.pmoIcons)pmoIcons(document.getElementById('reports'));\ntry{pmoExecGroups(data)}catch(e){console.warn('pmoExecGroups',e)}\n}\ndocument.addEventListener('click',function(event){if(!event.target.closest('.period-control'))",
  },
  { file: 'ExecutiveDashboard', find: "document.addEventListener('DOMContentLoaded',init);else init();\n})();\n</script>\n</body>", replace: "document.addEventListener('DOMContentLoaded',init);else init();\n})();\n</script>\n" + EXEC_GROUPS_JS + '</body>' },
  // Tambah/Edit Proyek: label pilihan sub-proyek diperjelas.
  {
    file: 'ProjectSetup',
    find: '<option value="SUB">Sub-proyek</option>',
    replace: '<option value="SUB">Investasi rutin · sub-proyek dari proyek pengembangan</option>',
  },
  // Mode presentasi: sampul, terima kasih, dan slide dari pustaka PDF (lihat pres-extra.js).
  {
    file: 'AccountMenu',
    find: "step(b,'Menyusun slide…',58);return wait(250)})",
    replace: "step(b,'Menyusun slide…',58);return Promise.all([wait(250),window.pmoPresExtra?window.pmoPresExtra.load(cfg).catch(function(){}):null])})",
  },
  {
    file: 'AccountMenu',
    find: "var slides=[];try{slides=(cfg.build?cfg.build():[])||[]}catch(e){console.warn('pmoPresent',e)}",
    replace: "var slides=[];try{slides=(cfg.build?cfg.build():[])||[]}catch(e){console.warn('pmoPresent',e)}if(window.pmoPresExtra){try{slides=window.pmoPresExtra.decorate(cfg,slides.filter(Boolean))}catch(e){console.warn('pmoPresExtra',e)}}",
  },
  {
    file: 'AccountMenu',
    find: '<div class="pp-ctl"><button type="button" class="pp-ic" data-a="list"',
    replace: '<div class="pp-ctl">\'+(window.pmoPresExtra?window.pmoPresExtra.btn():\'\')+\'<button type="button" class="pp-ic" data-a="list"',
  },
  {
    file: 'AccountMenu',
    find: "else if(k==='fs')toggleFs()});",
    replace: "else if(k==='fs')toggleFs();else if(k==='extra'&&window.pmoPresExtra)window.pmoPresExtra.manage(st.cfg)});",
  },
  {
    file: 'AccountMenu',
    find: "window.pmoPresent={open:open,close:close,go:function(n){go(n)},isOpen:function(){return !!st}};\n})();\n</script>",
    replace: "window.pmoPresent={open:open,close:close,go:function(n){go(n)},isOpen:function(){return !!st}};\n})();\n</script>\n" + PRES_EXTRA_JS,
  },
  // Panel "Permintaan Akun" lama tidak dipakai lagi: akun dikelola di /admin/akun.
  ...['Portal', 'ExecutiveDashboard'].map((file) => ({
    file,
    find: "box=document.createElement('div');box.id=key;box.className='pmo-requests';box.hidden=true;",
    replace: "return;box=document.createElement('div');box.id=key;box.className='pmo-requests';box.hidden=true;",
  })),
];

/** Penghubung login baru (cookie) ke bentuk akun yang dikenal kode lama. */
const BRIDGE_CODE = `
;(function () {
  authGetSession = function (token) {
    var u = __bridge.user();
    if (!u) return { success: false, message: 'Sesi tidak valid atau telah berakhir.' };
    return { success: true, user: u };
  };
  authLogout = function () { __bridge.logout(); return { success: true, message: 'Anda telah logout.' }; };
  authPendingAccounts = function () { return []; };
  authResendPendingNotifications = function () { return { success: true, sent: 0, failed: 0, message: 'Tidak ada permintaan akun.', errors: [] }; };
${RETIRED.map((n) => `  ${n} = function () { throw new Error('Akun kini dikelola di menu Ganti Password dan Kelola Akun.'); };`).join('\n')}
  // Portal: kartu proyek memakai week terakhir yang sudah diisi (bukan week cut-off bulanan).
  // Ringkasan atas (hero) tetap cut-off bulanan; nilai week terakhir dikirim di field 'lw'.
  var __origPortal = getPortalData;
  getPortalData = function (token) {
    var r = __origPortal(token);
    try {
      var items = r && r.brief && r.brief.items;
      if (!items || !items.length) return r;
      var db = loadDb_();
      var pct = function (v) { return v === null || v === undefined ? null : v / 100; };
      r = Object.assign({}, r, { brief: Object.assign({}, r.brief, { items: items.map(function (i) {
        var w = Number(i.latestWeek) || 0;
        if (!w) return i;
        var act = pct(weekPercent_(db.weekly, i.projectId, 'KOMULATIF_REALISASI', w));
        var plan = pct(weekPercent_(db.weekly, i.projectId, 'KOMULATIF_PLAN', w));
        if (act === null) return i;
        var dev = plan === null ? null : act - plan;
        var hl = weekText_(db.weekly, i.projectId, 'HIGHLIGHT_ACTIVITY', w) || weekText_(db.weekly, i.projectId, 'HIGHLIGHT', w);
        hl = String(hl || '').split(/\\n+/).map(function (x) { return x.replace(/^\\s*(?:\\d+[.)]|[-\\u2022*])\\s*/, '').trim(); }).filter(Boolean)[0] || '';
        if (hl.length > 150) hl = hl.slice(0, 147).replace(/\\s+\\S*$/, '') + '\\u2026';
        var status = dev === null ? 'Data tidak tersedia' : dev < DB_CONFIG.CRITICAL_DEVIATION ? 'Critical' : dev <= 0 ? 'At risk' : 'On track';
        return Object.assign({}, i, { lw: { week: w, actual: act, plan: plan, deviation: dev, status: status, highlight: hl || i.highlight } });
      }) }) });
    } catch (e) { /* kalau gagal, Portal tetap tampil dengan data cut-off */ }
    try {
      if (r && r.brief && r.brief.items) {
        var gmap = __bridge.groups(), parents = {}, u = __bridge.user() || {};
        if (String(u.role || '').toUpperCase() !== 'KONTRAKTOR') {
          var have = {};
          r.brief.items.forEach(function (i) { have[i.projectId] = 1; });
          var db2 = loadDb_();
          r.brief.items.forEach(function (i) {
            var g = gmap[i.projectId], pid = g && g.type === 'SUB' ? g.parent : null;
            if (!pid || have[pid] || parents[pid]) return;
            var p = (db2.allProjects || []).filter(function (x) { return x.id === pid; })[0];
            if (p) parents[pid] = { name: p.name, banner: (function () { try { return projectBannerId_(db2, p); } catch (e) { return ''; } })() };
          });
        }
        r = Object.assign({}, r, { brief: Object.assign({}, r.brief, { groups: { map: gmap, parents: parents } }) });
      }
    } catch (e) { /* tanpa kelompok, kartu tampil seperti biasa */ }
    return r;
  };
  // Tambah/Edit Proyek: kelompok proyek (Pengembangan / Rutin / Sub-proyek).
  var __origSetupCtx = getProjectSetupContext, __origSetupData = getProjectSetupData, __origSetupSave = saveProjectSetup;
  getProjectSetupContext = function (token) {
    var r = __origSetupCtx(token);
    if (!r || !r.success) return r;
    var g = __bridge.groups(), db = loadDb_();
    var typeOf = function (id) { return (g[id] && g[id].type) || 'PENGEMBANGAN'; };
    return Object.assign({}, r, {
      groups: g,
      devProjects: (db.allProjects || []).filter(function (p) { return typeOf(p.id) === 'PENGEMBANGAN'; })
        .map(function (p) { return { id: p.id, name: p.fullName || p.name }; })
    });
  };
  getProjectSetupData = function (token, projectId) {
    var r = __origSetupData(token, projectId);
    if (!r || !r.success || !r.project) return r;
    var g = __bridge.groups()[r.project.id] || {};
    return Object.assign({}, r, { project: Object.assign({}, r.project, { groupType: g.type || 'PENGEMBANGAN', parentId: g.parent || '' }) });
  };
  saveProjectSetup = function (token, payload) {
    payload = Object.assign({}, payload || {});
    var id = normKey_(payload.id);
    var type = String(payload.groupType || 'PENGEMBANGAN').trim().toUpperCase();
    var parent = type === 'SUB' ? normKey_(payload.parentId || '') : '';
    var allIds = (loadDb_().allProjects || []).map(function (p) { return p.id; });
    var err = __bridge.groupCheck(id, type, parent, allIds);
    if (err) throw new Error(err);
    if (type !== 'PENGEMBANGAN') {
      // Rutin / sub-proyek: cukup nilai kontrak. Plant cost FS = nilai kontrak, IDC dan PM cost 0.
      payload.plantFs = payload.contractValue;
      payload.idcFs = 0;
      payload.pmFs = 0;
    }
    var r = __origSetupSave(token, payload);
    if (r && r.success !== false) __bridge.groupSet(id, type, parent);
    return r;
  };
  // Executive: data kelompok proyek untuk pengelompokan tabel dan ringkasan per kelompok.
  var __origExec = getExecutiveDashboardData;
  getExecutiveDashboardData = function (token, requestedPeriod) {
    var r = __origExec(token, requestedPeriod);
    try {
      if (!r || !r.success) return r;
      var names = {};
      (loadDb_().allProjects || []).forEach(function (p) { names[p.id] = p.name; });
      var rows = Array.isArray(r.projects) ? r.projects : [];
      var fin = r.financial;
      if (fin && Array.isArray(fin.rows)) {
        fin = Object.assign({}, fin, { rows: fin.rows.map(function (x, i) { return Object.assign({}, x, { projectId: rows[i] ? rows[i].projectId : '' }); }) });
      }
      r = Object.assign({}, r, { financial: fin, groups: { map: __bridge.groups(), names: names } });
    } catch (e) { /* tanpa kelompok, Executive tampil seperti biasa */ }
    return r;
  };
  getLoginPageHtml = function () {
    return '<!doctype html><meta charset="utf-8"><script>location.replace("/login")</script>';
  };
})();
`;

function load() {
  const order = JSON.parse(fs.readFileSync(path.join(LEGACY_DIR, 'order.json'), 'utf8'));
  const gsFiles = order.map((n) => ({ name: n, src: fs.readFileSync(path.join(LEGACY_DIR, n + '.gs'), 'utf8') }));
  htmlFiles = new Map();
  fs.readdirSync(LEGACY_DIR).filter((f) => f.endsWith('.html')).forEach((f) => {
    htmlFiles.set(f.replace(/\.html$/, ''), fs.readFileSync(path.join(LEGACY_DIR, f), 'utf8'));
  });
  for (const p of HTML_PATCHES) {
    const src = htmlFiles.get(p.file);
    if (src && src.includes(p.find)) htmlFiles.set(p.file, src.replace(p.find, p.replace));
    else console.warn(JSON.stringify({ ev: 'gas_patch_miss', file: p.file }));
  }

  const code = gsFiles.map((f) => '// ---- ' + f.name + '.gs\n' + f.src).join('\n;\n');
  const fnNames = new Set();
  const varNames = new Set();
  for (const m of code.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) fnNames.add(m[1]);
  for (const m of code.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)) varNames.add(m[1]);
  const exportList = [...fnNames, ...varNames].filter((n, i, a) => a.indexOf(n) === i);
  const ret = 'return {' + exportList.map((n) => JSON.stringify(n) + ': (typeof ' + n + ' === "undefined" ? undefined : ' + n + ')').join(',') + '};';

  // Layanan pengganti diberikan sebagai parameter fungsi (lebih cepat daripada 'with').
  const body = code + '\n' + BRIDGE_CODE + '\n' + ret;
  // eslint-disable-next-line no-new-func
  factory = new Function(...GLOBAL_NAMES, '__bridge', body);
  // Fungsi yang boleh dipanggil dari halaman: sama seperti google.script.run,
  // fungsi berakhiran "_" bersifat privat.
  publicNames = new Set([...fnNames].filter((n) => !n.endsWith('_')));
  return { functions: fnNames.size, html: htmlFiles.size };
}

/**
 * Membuat satu lingkup eksekusi.
 * opts: { user (akun kode lama atau null), appUrl, onLogout }
 */
function createScope(opts) {
  if (!factory) load();
  const ctx = {
    files: htmlFiles,
    appUrl: opts.appUrl,
    user: opts.user,
    makeHtmlOutput,
    scope: null,
  };
  const globals = makeGlobals(ctx);
  const bridge = {
    user: () => (opts.user ? { ...opts.user, createdAt: Date.now() } : null),
    logout: () => { if (opts.onLogout) opts.onLogout(); },
    groups: () => require('../lib/groups').all(),
    groupCheck: (id, type, parent, allIds) => require('../lib/groups').check(id, type, parent, allIds),
    groupSet: (id, type, parent) => require('../lib/groups').setSync(id, type, parent, opts.user && opts.user.username),
  };
  const exported = factory(...GLOBAL_NAMES.map((n) => globals[n]), bridge);
  // Templat melihat fungsi/konstanta kode lama dan layanan global.
  ctx.scope = new Proxy({}, {
    has: (t, k) => typeof k === 'string' && (k in exported || k in globals),
    get: (t, k) => (k in exported ? exported[k] : globals[k]),
  });
  return { exported, globals, ctx };
}

function isPublic(name) {
  if (!factory) load();
  return publicNames.has(name);
}

module.exports = { load, createScope, isPublic, LEGACY_DIR };

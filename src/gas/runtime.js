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
  'DocumentApp', 'SlidesApp', 'ContentService', 'Drive', 'MimeType'];
let htmlFiles = null;
let publicNames = null;

// Fungsi akun lama yang sudah digantikan halaman baru (/akun/password, /admin/akun).
const RETIRED = ['authCheckSetup', 'authCreateFirstAdmin', 'authBeginLogin', 'authCompleteLogin', 'authRequestAccount',
  'authBeginSignup', 'authCompleteSignup', 'authReviewAccount', 'authRequestReset', 'authResetRequests',
  'authIssueResetCode', 'authCancelReset', 'authBeginReset', 'authCompleteReset', 'authChangePwBegin',
  'authChangePwComplete'];

/** Narasi Ringkasan Eksekutif untuk Direksi (dipakai bersama di ExecutiveDashboard.html & Portal.html). */
const EXEC_BRIEF_NARR_JS = `(function(){
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function nm(v){return typeof pmoProjName==='function'?pmoProjName(v):String(v||'')}
  function f2(v){return v==null||!isFinite(v)?'\\u2014':Number(v).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})}
  function pc(v,d){return v==null||!isFinite(v)?'\\u2014':(v*100).toLocaleString('id-ID',{minimumFractionDigits:d==null?1:d,maximumFractionDigits:d==null?1:d})+'%'}
  function rpM(m){if(m==null||!isFinite(m))return '\\u2014';return m>=1e6?'Rp '+(m/1e6).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+' T':'Rp '+(m/1e3).toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:1})+' M'}
  function spiOf(i){if(i.noCut)return null;var a=i.pending?(i.last&&i.last.actual):i.actual,pl=i.pending?(i.last&&i.last.plan):i.plan;return a!=null&&pl!=null&&pl>0?a/pl:null}
  function ensureBriefCss(){
    if(document.getElementById('xbNarrCss'))return;
    var st=document.createElement('style');st.id='xbNarrCss';
    st.textContent=[
      '.xbn-wrap{display:flex;flex-direction:column;gap:12px}',
      '.xbn-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding-bottom:10px;border-bottom:1px solid var(--line,#e2e8f0)}',
      '.xbn-eye{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#64748b)}',
      '.xbn-memo{font-size:14px;line-height:1.7;color:var(--ink,#1e293b);padding:2px 0}',
      '.xbn-memo p{margin:0 0 11px}.xbn-memo p:last-child{margin-bottom:0}',
      '.xbn-memo ul{margin:6px 0 10px 18px;padding:0}.xbn-memo li{margin-bottom:6px}',
      '.xbn-done{display:inline-flex;align-items:center;padding:2px 9px;border-radius:99px;background:rgba(15,138,95,.12);color:#0f8a5f;font-weight:700;font-size:12px;margin-right:6px}',
      '.xbn-tag{display:inline-block;padding:2px 9px;border-radius:99px;font-size:12px;font-weight:700;color:#fff;background:#0f5fa8;margin-right:4px}',
      '.xbn-tag.rut{background:#0f8a5f}',
      '#briefBox.xb{padding:18px 20px!important}',
      '#xbExec{padding:16px 20px 14px!important;box-sizing:border-box}',
      '@media (max-width:640px){#xbExec{padding:14px 14px 12px!important}}',
      '.xbn-h{margin:14px 0 8px!important}.xbn-h:first-child{margin-top:0!important}.xbn-h .xbn-tag{font-size:13.5px;padding:4px 12px}.xbn-memo a{color:var(--pri,#0f5fa8);font-weight:700;text-decoration:underline;text-underline-offset:3px}',
      '.xv{font-weight:800}.xv.g{color:#16875d}.xv.w{color:#b45309}.xv.b{color:#b42318}.xv.f{color:var(--pri,#0f5fa8)}.xv.p{color:inherit}',
      '[data-theme=dark] .xv.g{color:#4ade80}[data-theme=dark] .xv.w{color:#fbbf24}[data-theme=dark] .xv.b{color:#f87171}[data-theme=dark] .xv.f,[data-theme=dark] .xbn-memo a{color:#7cc4ff}',
      '.xbn-wrap .xb-act{margin-top:2px}',
      '.xbn-wrap .xb-foot{margin-top:2px;padding-top:10px;border-top:1px solid var(--line,#e2e8f0)}'
    ].join('');
    document.head.appendChild(st);
  }
  window.pmoExecBriefMount=function(el,s,b){
    if(!el)return;
    ensureBriefCss();
    var base=typeof pmoExecBrief==='function'?pmoExecBrief(s,b):{period:(b&&b.period)||'',level:'good',label:'Sesuai jadwal',attention:[],notes:[]};
    var data=window.__pmoBriefData||(typeof currentReportData!=='undefined'&&currentReportData?currentReportData:{});
    var G=(data.groups&&data.groups.map)||(b&&b.groups&&b.groups.map)||{};
    var grpOf=function(id){var t=(G[id]&&G[id].type)||'PENGEMBANGAN';return t==='RUTIN'?'RUTIN':'PENGEMBANGAN'};
    var items=Array.isArray(b&&b.items)?b.items:[];
    var projs=Array.isArray(data.projects)?data.projects:[];
    var finRows=(data.financial&&Array.isArray(data.financial.rows))?data.financial.rows:(Array.isArray(b&&b.finRows)?b.finRows:[]);
    var finById={};finRows.forEach(function(r){if(r.projectId)finById[r.projectId]=r});
    var doneProjs=projs.length?projs.filter(function(p){return String(p.stage||'').toUpperCase()==='SELESAI'}):(Array.isArray(b&&b.doneProjects)?b.doneProjects:[]);

    function calcGroup(code){
      var list=items.filter(function(i){return grpOf(i.projectId)===code});
      var pList=projs.filter(function(p){return grpOf(p.projectId)===code&&String(p.stage||'BERJALAN').toUpperCase()==='BERJALAN'});
      var runCount=pList.length||list.length;
      var onT=0,risk=0,crit=0;
      (pList.length?pList:list).forEach(function(x){
        var st=String(x.status||'');
        if(st==='On track')onT++;else if(st==='At risk')risk++;else if(st==='Critical')crit++;
      });
      var spiRows=list.map(function(i){return {i:i,v:spiOf(i)}}).filter(function(r){return r.v!=null&&isFinite(r.v)});
      var spi=spiRows.length?spiRows.reduce(function(a,r){return a+r.v},0)/spiRows.length:null;
      var spiLow=spiRows.slice().sort(function(a,c){return a.v-c.v})[0];
      if(spiLow&&spiLow.v>=0.995)spiLow=null;
      var cpiRows=list.filter(function(i){return i.cpi!=null&&isFinite(i.cpi)});
      var cpi=cpiRows.length?cpiRows.reduce(function(a,i){return a+i.cpi},0)/cpiRows.length:null;
      var fList=(pList.length?pList:list).map(function(x){return finById[x.projectId]}).filter(Boolean);
      var act=0,rTo=0,rYr=0,hasFin=false;
      fList.forEach(function(f){
        if(f.actualToDate!=null||f.rkap2026!=null||f.rkapToDate!=null)hasFin=true;
        act+=Number(f.actualToDate||0);rTo+=Number(f.rkapToDate||0);rYr+=Number(f.rkap2026||0);
      });
      return {
        code:code,label:code==='RUTIN'?'Proyek Investasi Rutin':'Proyek Pengembangan',
        run:runCount,onT:onT,risk:risk,crit:crit,
        spi:spi,spiLow:spiLow,cpi:cpi,
        hasFin:hasFin,act:act,rTo:rTo,rYr:rYr,
        pctTo:rTo?act/rTo:null,pctYr:rYr?act/rYr:null
      };
    }

    var dev=calcGroup('PENGEMBANGAN'),rut=calcGroup('RUTIN');

    var V=function(t,c){return '<b class="xv '+c+'">'+t+'</b>'};
    var P2=function(v){return v==null||!isFinite(v)?'\\u2014':(v*100).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+'%'};
    var pts=function(v){return (v>0?'+':v<0?'\\u2212':'')+(Math.abs(v)*100).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})};
    var rpL=function(m){var t=rpM(m);return / M$/.test(t)?t.slice(0,-2)+' Miliar':/ T$/.test(t)?t.slice(0,-2)+' Triliun':t};
    var tidy=function(t){t=String(t||'').split(/[ \\n\\t]+/).join(' ').trim();while(/[ .;,]$/.test(t))t=t.slice(0,-1);return t};
    var joinNames=function(a){return a.length<=1?a.join(''):a.length===2?a.join(' dan '):a.slice(0,-1).join(', ')+', dan '+a[a.length-1]};
    var mon=String(base.period||'').split(' ')[0];
    var pjById={};projs.forEach(function(p){if(p.projectId)pjById[p.projectId]=p});
    var finA=(base.attention||[]).filter(function(a){return a.g==='keuangan'});
    var LINK_P='<a href="#sec-progress" data-xgo="sec-progress">Pencapaian Progress Proyek</a>',LINK_F='<a href="#financeDetailSection" data-xgo="financeDetailSection">Realisasi Keuangan Proyek</a>';
    var blockNo=0,firstBlock=true;

    function grpMemo(g){
      if(!g.run)return '';
      blockNo++;
      var list=items.filter(function(i){return grpOf(i.projectId)===g.code});
      var names=list.map(function(i){return esc(nm(i.name))});
      var riskL=list.filter(function(i){return i.status==='At risk'}),critL=list.filter(function(i){return i.status==='Critical'});
      var stTxt=[];
      if(critL.length)stTxt.push(V(critL.length+' berstatus critical','b')+', yaitu '+joinNames(critL.map(function(i){return esc(nm(i.name))})));
      if(riskL.length)stTxt.push(V(riskL.length+' berstatus at risk','w')+', yaitu '+joinNames(riskL.map(function(i){return esc(nm(i.name))})));
      var txt='<p class="xbn-h"><span class="xbn-tag'+(g.code==='RUTIN'?' rut':'')+'">'+blockNo+'. '+esc(g.label)+'</span></p>';
      txt+='<p>Sesuai pelaporan cut-off bulan <b>'+esc(base.period)+'</b>, terdapat <b>'+g.run+' proyek berjalan</b>'+(names.length?', yaitu '+joinNames(names):'')
        +(stTxt.length?'; '+stTxt.join(' dan '):(g.run===1?', dengan status '+V('on track','g'):'; seluruhnya berstatus '+V('on track','g')))+'.';
      var perf=[];
      if(g.spi!=null)perf.push('nilai '+(g.run>1?'rata-rata ':'')+'<b>SPI</b>'+(firstBlock?' (<i>Schedule Performance Index</i>)':'')+' '+V(f2(g.spi),g.spi>=0.995?'g':g.spi>=0.95?'w':'b'));
      if(g.cpi!=null)perf.push((g.run>1?'rata-rata ':'')+'<b>CPI</b>'+(firstBlock?' (<i>Cost Performance Index</i>)':'')+' '+V(f2(g.cpi),g.cpi>=0.995?'g':g.cpi>=0.95?'w':'b'));
      if(perf.length)txt+=' '+(g.run>1?'Dari '+g.run+' proyek tersebut, ':'Capaian ')+perf.join(' dan ')+'.';
      if(g.hasFin&&g.rYr>0)txt+=' Secara total, serapan anggaran terhadap total RKAP 2026 pada bulan '+esc(mon)+' yaitu '+V(pc(g.pctYr,0),'f')+' atau sebesar <b>'+esc(rpL(g.act))+'</b> dari '+esc(rpL(g.rYr))+' (nilai yang dikelola Dashboard).';
      txt+=' Rincian tiap proyek dapat dilihat pada '+LINK_P+' dan '+LINK_F+'.</p>';
      firstBlock=false;
      var late=list.filter(function(i){return !i.pending&&i.deviation!=null&&i.deviation<0}).sort(function(a,c){return a.deviation-c.deviation});
      var absG=finA.filter(function(x){return list.some(function(i){return nm(i.name)===x.name})});
      if(late.length||absG.length){
        txt+='<p><b>Yang perlu diperhatikan:</b></p><ul>';
        late.forEach(function(i){
          var pj=pjById[i.projectId]||{},cs=i.cause||{},lw=i.lagWeeks!=null&&isFinite(i.lagWeeks)&&i.lagWeeks>=0.5?Math.max(1,Math.round(i.lagWeeks)):null;
          var cut='pada cut-off '+esc(mon)+(i.cutWeek?' (W'+esc(i.cutWeek)+(pj.cutRange?', periode '+esc(pj.cutRange):'')+')':'');
          txt+='<li><b>'+esc(nm(i.name))+'</b>: '+cut+' terlambat '+V(pts(i.deviation)+' poin',i.status==='Critical'?'b':'w')+(lw?' atau sekitar '+lw+' minggu dari jadwal':'')
            +' (plan '+V(P2(i.plan),'p')+' vs aktual '+V(P2(i.actual),i.status==='Critical'?'b':'w')+')'
            +(cs.concern?', dengan kendala'+(cs.field?' ('+esc(cs.field)+')':'')+' yaitu '+esc(tidy(cs.concern)):'')
            +(cs.mitigation?(cs.concern?', dan akan ditindaklanjuti dengan ':', dengan tindak lanjut ')+esc(tidy(cs.mitigation)):'')+'.</li>';
        });
        if(absG.length)txt+='<li><b>Serapan RKAP 2026</b> yang perlu menjadi perhatian yaitu '+joinNames(absG.map(function(x){var w=String(x.what||'');var m=w.match(/([0-9.,]+%)/);return '<b>'+esc(x.name)+'</b>'+(m?' ('+V(esc(m[1]),'f')+' dari rencana s.d. '+esc(mon)+')':'')}))+', dengan detail pada '+LINK_F+'.</li>';
        txt+='</ul>';
      }else{
        txt+='<p><b>Yang perlu diperhatikan:</b> tidak ada proyek yang terlambat dari jadwal, dan serapan RKAP sesuai rencana s.d. bulan laporan.</p>';
      }
      var doneG=doneProjs.filter(function(p){return grpOf(p.projectId)===g.code});
      if(doneG.length)txt+='<p><span class="xbn-done">Proyek Selesai</span> <b>'+doneG.map(function(p){return esc(nm(p.name))}).join(', ')+'</b> telah mencapai progres fisik 100% dan berstatus selesai.</p>';
      return txt;
    }

    var memo=grpMemo(dev)+grpMemo(rut);

    var plain=memo.replace(/<\\/p>|<\\/ul>/g,'\\n\\n').replace(/<li>/g,'\\u2022 ').replace(/<\\/li>/g,'\\n').replace(/<[^>]+>/g,'').replace(/\\n{3,}/g,'\\n\\n').trim();

    var pt=document.getElementById('portalBriefTitle');
    if(pt&&base.period)pt.textContent='Ringkasan eksekutif \\u00b7 '+base.period;
    var h='<div class="xbn-wrap">'
      +(pt?'':'<div class="xbn-head"><span class="xbn-eye">Ringkasan eksekutif \\u00b7 '+esc(base.period)+'</span></div>')
      +'<div class="xbn-memo">'+memo+'</div>'
      +'<div class="xb-act"><button type="button" data-xb-copy>Salin narasi</button>'+(window.speechSynthesis?'<button type="button" data-xb-say>Dengarkan</button>':'')+'<span class="xb-msg" role="status"></span></div>'
      +(base.notes&&base.notes.length?'<div class="xb-foot">'+base.notes.map(function(n){return '<span>'+esc(n)+'</span>'}).join('')+'</div>':'')
      +'</div>';
    el.innerHTML=h;

    el.querySelectorAll('[data-xgo]').forEach(function(l){l.addEventListener('click',function(e){var t=document.getElementById(l.getAttribute('data-xgo'));if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'})}})});
    var msg=el.querySelector('.xb-msg'),say=function(t){if(msg){msg.textContent=t;clearTimeout(msg._t);msg._t=setTimeout(function(){msg.textContent=''},3500)}};
    var cp=el.querySelector('[data-xb-copy]');
    if(cp)cp.onclick=function(){
      var done=function(){say('Narasi disalin.')};
      try{navigator.clipboard.writeText(plain).then(done,fallback)}catch(e){fallback()}
      function fallback(){var ta=document.createElement('textarea');ta.value=plain;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(e){say('Tidak bisa menyalin otomatis.')}ta.remove()}
    };
    var sp=el.querySelector('[data-xb-say]');
    if(sp)sp.onclick=function(){
      if(window.pmoSay){
        var on=sp.getAttribute('data-on')==='1';
        if(on){pmoSay.stop();sp.removeAttribute('data-on');sp.textContent='Dengarkan';return}
        sp.setAttribute('data-on','1');sp.textContent='Hentikan';
        pmoSay.speak(plain,function(){sp.removeAttribute('data-on');sp.textContent='Dengarkan'},function(m){say(m);sp.removeAttribute('data-on');sp.textContent='Dengarkan'});
      }else{
        try{var u=new SpeechSynthesisUtterance(plain);u.lang='id-ID';speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){say('Suara tidak tersedia di browser ini.')}
      }
    };
    return base;
  };
  try{var __xb=document.getElementById('xbExec');if(__xb&&typeof currentReportData!=='undefined'&&currentReportData&&currentReportData.brief)window.pmoExecBriefMount(__xb,currentReportData.summary||{},currentReportData.brief)}catch(e){console.warn('pmoExecBriefMount',e)}
})();`;

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
  var count=function(list){var n=0,ok=0;var all=[];list.forEach(function(i){all.push(i);(subs[i.projectId]||[]).forEach(function(s){all.push(s)})});all.forEach(function(i){if(i.__empty)return;n++;if(i.status==='On track')ok++});return n?n+' proyek \\u00b7 '+ok+' on track':''};
  var block=function(title,list){if(!list.length)return '';var h='';list.forEach(function(i){h+=i.__empty?empty(i):card(i);(subs[i.projectId]||[]).forEach(function(s){h+=subCard(s)})});return '<div class="pg '+(/Rutin/.test(title)?'pg-rut':'pg-dev')+'"><div class="pg-h"><b>'+title+'</b><span>'+count(list)+'</span></div><div class="pg-grid">'+h+'</div></div>'};
  var pt=document.getElementById('portalPulseTitle');if(pt&&b&&b.period)pt.textContent='Progres Proyek Cut off Bulan '+b.period;
  $('pulse').classList.add('pulse-g');
  return block('Proyek Pengembangan',dev)+block('Proyek Investasi Rutin',rut);
}
` + EXEC_BRIEF_NARR_JS + require('./portal-latest').PORTAL_LATEST_JS + `
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
  if(!document.getElementById('pmoXgCss')){var st=document.createElement('style');st.id='pmoXgCss';st.textContent='.xg-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px;margin-top:14px}.xg-card{background:var(--card);border:1px solid var(--line);border-radius:var(--r,14px);box-shadow:var(--shadow);padding:16px 18px}.xg-card h4{margin:0 0 2px;font-size:15px}.xg-card .xg-sub{font-size:12px;color:var(--muted);margin:6px 0 8px}.xg-real{font-size:12.5px;color:var(--muted);margin-bottom:10px}.xg-real b{color:var(--ink,inherit)}.xg-list{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}.xg-list li{display:grid;grid-template-columns:minmax(0,1fr) auto 92px;gap:10px;align-items:center;padding:8px 2px;border-bottom:1px solid var(--line);font-size:13.5px}.xg-list li:last-child{border-bottom:0}.xg-nm{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis}.xg-nm small{display:block;font-size:11px;font-weight:600;color:var(--pri2)}.xg-li-sub .xg-nm{padding-left:14px;border-left:3px solid var(--pri2)}.xg-pct{font-variant-numeric:tabular-nums;font-weight:700}.xg-s{justify-self:end;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:99px;background:var(--th);white-space:nowrap}.xg-s.g{color:#0f6b48}.xg-s.a{color:#8a5a00}.xg-s.r{color:#a52826}.xg-kv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.xg-kv div{min-width:0}.xg-kv small{display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.03em}.xg-kv b{display:block;font-size:18px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.xg-kv em{font-style:normal;font-size:12px;color:var(--muted)}.xg-st{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.xg-st span{font-size:12px;font-weight:600;padding:3px 9px;border-radius:99px;background:var(--th)}.xg-st .g{color:#0f6b48}.xg-st .a{color:#8a5a00}.xg-st .r{color:#a52826}.xg-pos{color:#0f6b48}.xg-neg{color:#b42318}tr.xg-h td{text-align:left!important;font-weight:700;font-size:13px;letter-spacing:.02em;padding:10px 12px;border-left:5px solid #0f5fa8;background:rgba(15,95,168,.10)}tr.xg-h.xg-rut td{border-left-color:#0f8a5f;background:rgba(15,138,95,.10)}tr.xg-h td span{font-weight:500;color:var(--muted);margin-left:8px}.xg-pill{display:inline-block;padding:4px 12px;border-radius:99px;background:#0f5fa8;color:#fff;font-weight:700;font-size:12.5px;letter-spacing:.02em;white-space:nowrap}.xg-pill.xg-rut{background:#0f8a5f}tr.xg-tot.xg-rut td{background:rgba(15,138,95,.08)}tr.xg-tot.xg-dev td{background:rgba(15,95,168,.08)}.xg-card{border-top:5px solid #0f5fa8}.xg-card.xg-rut{border-top-color:#0f8a5f}.xg-card h4 .xg-pill{font-size:13px}tr.xg-sub-row td:first-child,tr.xg-sub-row td.xg-name,td.md-name.xg-sub-cell{padding-left:10px!important;border-left:3px solid var(--pri2)}.xg-tag{display:block;font-size:11px;font-weight:600;color:var(--pri2);margin-bottom:2px}tr.xg-tot td{font-weight:700;background:rgba(127,160,190,.10)}.xg-fin-wrap{display:grid;grid-template-columns:1fr;gap:14px}.xg-fin-card{border:1px solid var(--line);border-top:4px solid #0f5fa8;border-radius:12px;padding:16px 18px;background:var(--th)}.xg-fin-card.xg-rut{border-top-color:#0f8a5f}.xg-fin-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px 8px;margin-bottom:12px}.xg-fin-head small{font-size:12px;color:var(--muted);font-weight:600}.xg-fin-money{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px 14px;margin-bottom:12px}.xg-fin-money div{min-width:0}.xg-fin-money small,.xg-fin-pctbox small{display:block;font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;font-weight:600}.xg-fin-money b{display:block;font-size:15px;margin-top:3px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.xg-fin-pcts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.xg-fin-pctbox{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px}.xg-fin-pcttop{display:flex;align-items:baseline;justify-content:space-between;gap:6px;margin-top:4px}.xg-fin-pcttop b{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums}.xg-fin-pcttop b.ok{color:#0f6b48}.xg-fin-pcttop b.warn{color:#b45309}.xg-fin-pcttop b.bad{color:#b42318}.xg-fin-bar{height:7px;border-radius:99px;background:var(--line);overflow:hidden;margin-top:7px}.xg-fin-bar>i{display:block;height:100%;border-radius:99px;background:#0f5fa8;transition:width .35s ease}.xg-fin-bar.ok>i{background:#0f8a5f}.xg-fin-bar.warn>i{background:#d97706}.xg-fin-bar.bad>i{background:#dc2626}@media (max-width:520px){.xg-fin-pcts{grid-template-columns:1fr}.xg-list li{grid-template-columns:minmax(0,1fr) auto auto;gap:8px}}.xg-la-h{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px 8px;padding:9px 12px;margin:14px 0 8px;border-radius:10px;border-left:5px solid #0f5fa8;background:rgba(15,95,168,.10);font-size:13px}.xg-la-h:first-child{margin-top:0}.xg-la-h.xg-rut{border-left-color:#0f8a5f;background:rgba(15,138,95,.10)}.xg-la-h>span{color:var(--muted);font-size:12px}.xg-la-sub{margin-left:18px;border-left:3px solid var(--pri2);padding-left:6px;border-radius:8px}@media (max-width:700px){.xg-kv{grid-template-columns:repeat(2,minmax(0,1fr))}.xg-la-sub{margin-left:8px}}@media (max-width:640px){#monthlyDeviationPanel .md-table tr.xg-h{display:block;margin:14px 0 10px;padding:0;border-bottom:0}#monthlyDeviationPanel .md-table tr.xg-h:first-child{margin-top:0}#monthlyDeviationPanel .md-table tr.xg-h td{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px 10px;width:100%;padding:9px 12px;border-radius:10px}#monthlyDeviationPanel .md-table tr.xg-h td span{margin-left:0}}@media (max-width:760px){table.pmo-cards>tbody>tr.xg-h{border:0!important;background:transparent!important;padding:0!important;margin:14px 0 8px!important}table.pmo-cards>tbody>tr.xg-h>td{display:flex!important;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px 10px;padding:9px 12px!important;border-radius:10px}table.pmo-cards>tbody>tr.xg-h>td span{margin-left:0}}:where(html.m-mode) #monthlyDeviationPanel .md-table tr.xg-h{display:block;margin:14px 0 10px;padding:0;border-bottom:0}:where(html.m-mode) #monthlyDeviationPanel .md-table tr.xg-h:first-child{margin-top:0}:where(html.m-mode) #monthlyDeviationPanel .md-table tr.xg-h td{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px 10px;width:100%;padding:9px 12px;border-radius:10px}:where(html.m-mode) #monthlyDeviationPanel .md-table tr.xg-h td span{margin-left:0}:where(html.m-mode) table.pmo-cards>tbody>tr.xg-h{border:0!important;background:transparent!important;padding:0!important;margin:14px 0 8px!important}:where(html.m-mode) table.pmo-cards>tbody>tr.xg-h>td{display:flex!important;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px 10px;padding:9px 12px!important;border-radius:10px}:where(html.m-mode) table.pmo-cards>tbody>tr.xg-h>td span{margin-left:0}';document.head.appendChild(st)}

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
      var rp=function(v){if(v==null||!isFinite(Number(v)))return '—';var m=Number(v),full='Rp '+Math.round(m*1000000).toLocaleString('id-ID');var t=Math.abs(m)>=1e6?'Rp '+(m/1e6).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+' T':'Rp '+(m/1e3).toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:1})+' M';return '<span title="'+full+'">'+t+'</span>'};
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
    box.innerHTML=cards.join('');box.hidden=!cards.length||(typeof mIsOn==='function'&&mIsOn()&&typeof mTab!=='undefined'&&mTab!=='ringkasan');
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
/* exStories dirender oleh exec-story-brief.js agar tidak tertimpa Story lingkaran lama */
` + EXEC_BRIEF_NARR_JS + `
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
const { PRES_MOTION_JS } = require('./pres-motion');
const { PRES_PREP_JS } = require('./pres-prep');

const HTML_PATCHES = [
  {
    // Presentasi: hapus overlay lama yang mungkin masih tertinggal sebelum membuat yang baru.
    file: 'AccountMenu',
    find: "var ov=mk('div','pp');ov.setAttribute('role','dialog');",
    replace: "document.querySelectorAll('body>.pp').forEach(function(o){o.remove()});var ov=mk('div','pp');ov.setAttribute('role','dialog');",
  },
  {
    // Slide per proyek (Executive): periode & cut-off proyek di sebelah judul.
    file: 'ExecutiveDashboard',
    find: "<h3>'+E(p.name)+'</h3><span class=\"pp-st '+cls+'\">",
    replace: "<h3>'+E(p.name)+'</h3>'+(function(){var per=String((document.querySelector('#periodValue')||{}).textContent||d.period||'').trim();var t=[p.cutWeek?'Cut-off W'+p.cutWeek+(p.cutRange?' · '+p.cutRange:''):(per?'Periode '+per:''),p.pending&&p.latestWeek?'input s.d. W'+p.latestWeek:''].filter(Boolean);return t.length?'<span class=\"pp-per\"><svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M16 2v4M8 2v4M3 10h18\"/></svg>'+E(t.join(' · '))+'</span>':''})()+'<span class=\"pp-st '+cls+'\">",
  },
  {
    // Siapkan presentasi: tombol Presentasi membuka layar persiapan dulu (lihat pres-prep.js).
    file: 'AccountMenu',
    find: "if(st||busy)return;busy=true;cfg=cfg||{};enterFs();",
    replace: "if(st||busy)return;cfg=cfg||{};if(!cfg.direct&&window.pmoPresPrep&&window.pmoPresPrep.want(cfg)){window.pmoPresPrep.show(cfg);return}busy=true;enterFs();",
  },
  {
    // Tombol P: langsung mulai dengan susunan tersimpan.
    file: 'AccountMenu',
    find: "e.preventDefault();window.pmoPresentStart()}",
    replace: "e.preventDefault();window.__ppDirect=1;try{window.pmoPresentStart()}finally{window.__ppDirect=0}}",
  },
  {
    // Presentasi Bergerak: putar animasi setiap kali slide tampil.
    file: 'AccountMenu',
    find: "else if(hint)hint.hidden=true;",
    replace: "else if(hint)hint.hidden=true;\n    if(window.pmoMotion)try{window.pmoMotion.enter(it[n].card,it[n].s)}catch(e){}",
  },
  {
    file: 'AccountMenu',
    find: "b.innerHTML=SV(kind==='admin'?USR:KEY)+'<span>'+(kind==='admin'?'Reset password pengguna':'Ganti password')+'</span>';b.onclick=function(e){e.stopPropagation();kind==='admin'?admin():change()};",
    replace: "var NAV={self:['Ganti password','/akun/password'],admin:['Kelola Akun','/admin/akun'],data:['Impor Data','/admin/data'],kelompok:['Kelompok Proyek','/admin/kelompok'],google:['Koneksi Google','/admin/google'],arsip:['Arsip Materi Weekly','/arsip']}[kind];b.innerHTML=SV(kind==='self'?KEY:USR)+'<span>'+NAV[0]+'</span>';b.onclick=function(e){e.stopPropagation();location.href=NAV[1]};",
  },
  {
    // Menu admin server baru: Kelola Akun, Impor Data, Koneksi Google.
    file: 'AccountMenu',
    find: "p.insertBefore(btnFor(ref,'self'),ref);if(role==='ADMIN')p.insertBefore(btnFor(ref,'admin'),ref)",
    replace: "p.insertBefore(btnFor(ref,'self'),ref);if(role==='ADMIN'){p.insertBefore(btnFor(ref,'admin'),ref);p.insertBefore(btnFor(ref,'data'),ref);p.insertBefore(btnFor(ref,'kelompok'),ref);p.insertBefore(btnFor(ref,'google'),ref);p.insertBefore(btnFor(ref,'arsip'),ref)}else if(role==='PIC'){p.insertBefore(btnFor(ref,'arsip'),ref)}",
  },
  {
    // Kartu proyek Portal: kembali memakai data cut-off bulanan (tanpa override i.lw).
    file: 'Portal',
    find: "$('pulse').innerHTML=items.map(function(i){",
    replace: "const __card=function(i){i=Object.assign({},i,{prevActual:null});",
  },
  {
    // Portal: beri judul dinamis pada ringkasan eksekutif & progres proyek cut-off bulan.
    file: 'Portal',
    find: "else{const up=i.prevActual!=null&&i.actual!=null?i.actual-i.prevActual:null;",
    replace: "else{const up=null;",
  },
  {
    file: 'Portal',
    find: '<section class="grp"><h2>Ringkasan eksekutif</h2>',
    replace: '<section class="grp"><h2 id="portalBriefTitle">Ringkasan eksekutif</h2>',
  },
  {
    file: 'Portal',
    find: '<section class="grp"><h2>progres proyek</h2>',
    replace: '<section class="grp"><h2 id="portalPulseTitle">Progres Proyek</h2>',
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
  // Executive: narasi Direksi memakai data yang sedang dirender (currentReportData baru diisi sesudahnya).
  {
    file: 'ExecutiveDashboard',
    find: "  pmoExecBriefMount(xbEl,s,b,function(r){",
    replace: "  window.__pmoBriefData=data;pmoExecBriefMount(xbEl,s,b,function(r){",
  },
  // Executive: ringkasan per kelompok + tabel proyek & keuangan dikelompokkan.
  {
    file: 'ExecutiveDashboard',
    find: '</section>\n\n      <section class="grid g-ov">',
    replace: '</section>\n      <section class="xg-sum" id="pmoGroupSummary" data-mtab="ringkasan" hidden aria-label="Ringkasan per kelompok proyek"></section>\n\n      <section class="grid g-ov">',
  },
  {
    file: 'ExecutiveDashboard',
    find: "if(window.pmoIcons)pmoIcons(document.getElementById('reports'));\n}\ndocument.addEventListener('click',function(event){if(!event.target.closest('.period-control'))",
    replace: "if(window.pmoIcons)pmoIcons(document.getElementById('reports'));\ntry{pmoExecGroups(data)}catch(e){console.warn('pmoExecGroups',e)}\n}\ndocument.addEventListener('click',function(event){if(!event.target.closest('.period-control'))",
  },
  { file: 'ExecutiveDashboard', find: "document.addEventListener('DOMContentLoaded',init);else init();\n})();\n</script>\n</body>", replace: "document.addEventListener('DOMContentLoaded',init);else init();\n})();\n</script>\n" + EXEC_GROUPS_JS + require('./groups-r3').EXEC_MOBILE_GROUPS_JS + '</body>' },
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
    replace: "var slides=[];if(cfg.__final){slides=cfg.__final.slice()}else{try{slides=(cfg.build?cfg.build():[])||[]}catch(e){console.warn('pmoPresent',e)}if(window.pmoPresExtra){try{slides=window.pmoPresExtra.decorate(cfg,slides.filter(Boolean))}catch(e){console.warn('pmoPresExtra',e)}}}",
  },
  {
    file: 'AccountMenu',
    find: '<div class="pp-ctl"><button type="button" class="pp-ic" data-a="list"',
    replace: '<div class="pp-ctl">\'+(window.pmoPresExtra?window.pmoPresExtra.btn():\'\')+\'<button type="button" class="pp-ic" data-a="list"',
  },
  {
    file: 'AccountMenu',
    find: "else if(k==='fs')toggleFs()});",
    replace: "else if(k==='fs')toggleFs();else if(k==='extra'){var ct=st.items[st.i]&&st.items[st.i].s.title;if(window.pmoPresPrep)window.pmoPresPrep.reopen(st.cfg,ct);else if(window.pmoPresExtra)window.pmoPresExtra.manage(st.cfg)}});",
  },
  {
    file: 'AccountMenu',
    find: "window.pmoPresent={open:open,close:close,go:function(n){go(n)},isOpen:function(){return !!st}};\n})();\n</script>",
    replace: "window.pmoPresent={open:open,close:close,go:function(n){go(n)},isOpen:function(){return !!st}};\n})();\n</script>\n" + PRES_EXTRA_JS + PRES_MOTION_JS + PRES_PREP_JS + require('./pres-proj').PRES_PROJ_JS,
  },
  // Panel "Permintaan Akun" lama tidak dipakai lagi: akun dikelola di /admin/akun.
  ...['Portal', 'ExecutiveDashboard'].map((file) => ({
    file,
    find: "box=document.createElement('div');box.id=key;box.className='pmo-requests';box.hidden=true;",
    replace: "return;box=document.createElement('div');box.id=key;box.className='pmo-requests';box.hidden=true;",
  })),
  // Weekly Dashboard (Desktop & Mobile): cegah clipping kanan saat muat awal, rapikan dok bawah mobile & posisi Sena, rapikan tabel addendum/keuangan/CPM mobile, dan perbesar target sentuh HP.
  {
    file: 'Dashboard',
    find: '</style></head><body>',
    replace: '\nhtml,body{overflow-x:clip}.app>*,.main,.content,.topbar,.grid,.panel{min-width:0;max-width:100%}.life-banner[hidden],#lifeBanner[hidden]{display:none!important}' +
      '\nhtml.m-mode body{padding-bottom:140px!important}' +
      '\nhtml.m-mode .m-dock{padding:0!important;background:linear-gradient(to bottom,transparent 0,var(--bg) 56%)}' +
      '\nhtml.m-mode .m-period{margin:0 auto 8px 10px!important}' +
      '\nhtml.m-mode .m-period button{height:44px!important}' +
      '\nhtml.m-mode .m-tabs{border-radius:18px 18px 0 0!important;border-bottom:0!important;padding:6px 6px calc(6px + env(safe-area-inset-bottom,0px))!important}' +
      '\nhtml.m-mode .aic-fab{bottom:calc(74px + env(safe-area-inset-bottom,0px))!important;right:12px!important}' +
      '\n@media (max-width:760px){.ntf-btn,.search-btn,.msc-btn{min-height:44px!important;min-width:44px!important}.life-banner{padding:12px 14px;gap:8px 12px}.life-banner .grow{min-width:min(200px,100%)}.life-banner button{min-height:36px;padding:6px 12px}.life-banner .adlist,.life-banner .adlist tbody{display:block;width:100%}.life-banner .adlist tr{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;padding:10px 0;border-top:1px solid var(--line)}.life-banner .adlist td{display:block;padding:0;border:0;font-size:12.5px;line-height:1.5;min-width:0}.life-banner .adlist td:nth-child(1){font-size:13px;font-weight:700;color:var(--navy)}.life-banner .adlist td:nth-child(2){color:var(--muted);font-size:12px}.life-banner .adlist td:nth-child(3){padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;background:var(--card);border:1px solid var(--line);color:var(--ink)}.life-banner .adlist td:nth-child(4),.life-banner .adlist td:nth-child(5){flex:0 0 100%;width:100%;overflow-wrap:anywhere}.life-banner .adlist td:nth-child(4){font-weight:600;color:var(--navy)}.life-banner .adlist td:nth-child(4):empty{display:none}}' +
      '\nhtml.m-mode .life-banner .adlist,html.m-mode .life-banner .adlist tbody{display:block;width:100%}' +
      '\nhtml.m-mode .life-banner .adlist tr{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;padding:10px 0;border-top:1px solid var(--line)}' +
      '\nhtml.m-mode .life-banner .adlist td{display:block;padding:0;border:0;font-size:12.5px;line-height:1.5;min-width:0}' +
      '\nhtml.m-mode .life-banner .adlist td:nth-child(3){padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;background:var(--card);border:1px solid var(--line);color:var(--ink)}' +
      '\nhtml.m-mode .life-banner .adlist td:nth-child(4),html.m-mode .life-banner .adlist td:nth-child(5){flex:0 0 100%;width:100%;overflow-wrap:anywhere}' +
      '\nhtml.m-mode .life-banner .adlist td:nth-child(4):empty{display:none}' +
      '\n@container panel (max-width:460px){.fin-row{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 12px}.fin-row .fl{grid-column:1;white-space:normal}.fin-row .fin-pct{grid-column:2;grid-row:1;align-self:center;justify-self:end}.fin-row .fin-v{text-align:left;white-space:normal}.fin-row .fin-v.fs{border-left:1px solid var(--line);padding-left:12px}.fin-row .fin-bar{grid-column:1/-1;grid-row:3;margin-top:2px}}' +
      '\n@container panel (max-width:360px){.discipline{grid-template-columns:minmax(0,1fr) auto auto auto;gap:6px 8px}.discipline .badge{padding:3px 7px;font-size:10.5px}}' +
      '\nhtml.m-mode .table.pmo-cards>tbody>tr>td::before{display:block;margin-bottom:2px}\nhtml.m-mode .table.pmo-cards>tbody>tr>td:first-child::before{display:none}\nhtml.m-mode .table.pmo-cards>tbody>tr>td:first-child{display:block;margin:0 0 8px 0;padding-bottom:6px!important;border-bottom:1px solid var(--line)!important}\nhtml.m-mode .table.pmo-cards>tbody>tr>td+td{margin-top:6px}\nhtml.m-mode .table.pmo-cards>tbody>tr>td[colspan]{margin:0!important;padding:0!important;border-bottom:0!important}\nhtml.m-mode #concerns>tr>td:nth-child(2){display:block;margin:0 0 8px 0}\nhtml.m-mode #concerns>tr>td:nth-child(2)::before{display:inline-block;margin-right:8px;margin-bottom:0}' +
      '\nhtml.m-mode .crumbs h2,@media (max-width:760px){.crumbs h2{white-space:normal;font-size:15px;line-height:1.25;overflow-wrap:break-word}}' +
      '\nhtml.m-mode .m-proj{font-size:clamp(16px,4.5vw,20px);line-height:1.25;overflow-wrap:break-word}' +
      '\n@media (max-width:760px){#sec-msc .table.pmo-cards>tbody>tr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 10px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card);margin-bottom:10px}#sec-msc .table.pmo-cards>tbody>tr>td{display:block!important;padding:0!important;margin:0!important;border:0!important;width:auto!important;background:transparent!important}#sec-msc .table.pmo-cards>tbody>tr>td::before{display:block;font-size:10.5px;font-weight:600;color:var(--muted);margin-bottom:1px}#sec-msc .table.pmo-cards>tbody>tr>td:nth-child(1){grid-column:1/3;align-self:center;font-size:12px;color:var(--pri-ink);border-bottom:0!important;padding-bottom:0!important}#sec-msc .table.pmo-cards>tbody>tr>td:nth-child(1)::before,#sec-msc .table.pmo-cards>tbody>tr>td:nth-child(2)::before,#sec-msc .table.pmo-cards>tbody>tr>td:nth-child(7)::before{display:none}#sec-msc .table.pmo-cards>tbody>tr>td:nth-child(7){grid-column:3;grid-row:1;justify-self:end;align-self:center}#sec-msc .table.pmo-cards>tbody>tr>td:nth-child(2){grid-column:1/-1;font-size:13.5px;font-weight:700;color:var(--navy);line-height:1.35}#sec-msc .table.pmo-cards>tbody>tr>td:nth-child(3){grid-column:1/-1;font-size:12px;color:var(--muted);padding-bottom:8px!important;border-bottom:1px dashed var(--line)!important}#sec-msc .table.pmo-cards>tbody>tr>td:nth-child(3)::before{display:inline;content:"WBS: "}#sec-msc .table.pmo-cards>tbody>tr>td:nth-child(4),#sec-msc .table.pmo-cards>tbody>tr>td:nth-child(5),#sec-msc .table.pmo-cards>tbody>tr>td:nth-child(6){padding-top:4px!important;font-size:12.5px;font-weight:600;color:var(--ink)}#sec-msc .table.pmo-cards>tbody>tr>td[colspan]{grid-column:1/-1}}' +
      '\nhtml.m-mode #sec-msc .table.pmo-cards>tbody>tr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 10px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card);margin-bottom:10px}html.m-mode #sec-msc .table.pmo-cards>tbody>tr>td{display:block!important;padding:0!important;margin:0!important;border:0!important;width:auto!important;background:transparent!important}html.m-mode #sec-msc .table.pmo-cards>tbody>tr>td::before{display:block;font-size:10.5px;font-weight:600;color:var(--muted);margin-bottom:1px}html.m-mode #sec-msc .table.pmo-cards>tbody>tr>td:nth-child(1){grid-column:1/3;align-self:center;font-size:12px;color:var(--pri-ink)}html.m-mode #sec-msc .table.pmo-cards>tbody>tr>td:nth-child(1)::before,html.m-mode #sec-msc .table.pmo-cards>tbody>tr>td:nth-child(2)::before,html.m-mode #sec-msc .table.pmo-cards>tbody>tr>td:nth-child(7)::before{display:none}html.m-mode #sec-msc .table.pmo-cards>tbody>tr>td:nth-child(7){grid-column:3;grid-row:1;justify-self:end;align-self:center}html.m-mode #sec-msc .table.pmo-cards>tbody>tr>td:nth-child(2){grid-column:1/-1;font-size:13.5px;font-weight:700;color:var(--navy);line-height:1.35}html.m-mode #sec-msc .table.pmo-cards>tbody>tr>td:nth-child(3){grid-column:1/-1;font-size:12px;color:var(--muted);padding-bottom:8px!important;border-bottom:1px dashed var(--line)!important}html.m-mode #sec-msc .table.pmo-cards>tbody>tr>td:nth-child(3)::before{display:inline;content:"WBS: "}html.m-mode #sec-msc .table.pmo-cards>tbody>tr>td:nth-child(4),html.m-mode #sec-msc .table.pmo-cards>tbody>tr>td:nth-child(5),html.m-mode #sec-msc .table.pmo-cards>tbody>tr>td:nth-child(6){padding-top:4px!important;font-size:12.5px;font-weight:600;color:var(--ink)}html.m-mode #sec-msc .table.pmo-cards>tbody>tr>td[colspan]{grid-column:1/-1}\n</style></head><body>',
  },
  // Weekly Dashboard (Kurva S): pisahkan label Plan & Aktual agar tidak bertumpuk saat titik akhir berdekatan.
  {
    file: 'Dashboard',
    find: "let yPlanLbl=selectedPlan?Math.max(T+14,y(selectedPlan.value)-10):null;\n  let yActLbl=selectedActual?Math.min(H-B-6,y(selectedActual.value)+18):null;\n  if(yPlanLbl!==null&&yActLbl!==null&&Math.abs(yActLbl-yPlanLbl)<15){\n    yPlanLbl=Math.max(T+14,y(selectedPlan.value)-14);\n    yActLbl=Math.min(H-B-4,y(selectedActual.value)+20);\n  }",
    replace: "let yPlanLbl=selectedPlan?Math.max(T+14,y(selectedPlan.value)-10):null;\n  let yActLbl=selectedActual?Math.min(H-B-6,y(selectedActual.value)+18):null;\n  if(selectedPlan&&selectedActual){\n    if(selectedActual.value>=selectedPlan.value){\n      yActLbl=Math.max(T+12,y(selectedActual.value)-10);\n      yPlanLbl=Math.min(H-B-4,y(selectedPlan.value)+16);\n      if(yPlanLbl-yActLbl<16)yPlanLbl=Math.min(H-B-4,yActLbl+16);\n    }else if(yActLbl-yPlanLbl<16){\n      yPlanLbl=Math.max(T+12,y(selectedPlan.value)-14);\n      yActLbl=Math.min(H-B-4,yPlanLbl+16);\n    }\n  }",
  },
  // Monthly Executive Review (Mobile): rapikan dok bawah, cegah overflow & tabrakan pil PERIODE vs Sena, dan perbesar target sentuh HP.
  {
    file: 'ExecutiveDashboard',
    find: '</head><body>',
    replace: '<style>\nhtml,body{overflow-x:clip}.app>*,.main,.content,.topbar,.grid,.panel{min-width:0;max-width:100%}' +
      '\nhtml.m-mode body{padding-bottom:140px!important}' +
      '\nhtml.m-mode .m-dock{padding:0!important;background:linear-gradient(to bottom,transparent 0,var(--bg) 56%)}' +
      '\nhtml.m-mode .m-period{margin:0 auto 8px 10px!important}' +
      '\nhtml.m-mode .m-period button{height:44px!important}' +
      '\nhtml.m-mode .m-tabs{border-radius:18px 18px 0 0!important;border-bottom:0!important;padding:6px 6px calc(6px + env(safe-area-inset-bottom,0px))!important}' +
      '\nhtml.m-mode .aic-fab{bottom:calc(74px + env(safe-area-inset-bottom,0px))!important;right:12px!important}' +
      '\n#mProj .mc-h,#mFin .mc-h,#mMs .mc-h{gap:6px 8px;flex-wrap:wrap}#mProj .mc-h b,#mFin .mc-h b,#mMs .mc-h b{min-width:0;overflow-wrap:break-word}' +
      '\n@media (max-width:900px){#lookAheadPanel summary{flex-wrap:wrap;align-items:center;gap:6px 8px;padding:14px 0}#lookAheadPanel summary>span{flex:1 1 calc(100% - 28px);min-width:0;font-size:14.5px;line-height:1.3;overflow-wrap:break-word}#lookAheadPanel summary>small{margin-left:20px}#lookAheadPanel summary>.exec-la-src{margin-left:20px;max-width:calc(100% - 20px);white-space:normal;text-align:left}}' +
      '\nhtml.m-mode #lookAheadPanel summary{flex-wrap:wrap;align-items:center;gap:6px 8px;padding:14px 0}html.m-mode #lookAheadPanel summary>span{flex:1 1 calc(100% - 28px);min-width:0;font-size:14.5px;line-height:1.3;overflow-wrap:break-word}html.m-mode #lookAheadPanel summary>small{margin-left:20px}html.m-mode #lookAheadPanel summary>.exec-la-src{margin-left:20px;max-width:calc(100% - 20px);white-space:normal;text-align:left}' +
      '\n@media (max-width:760px){.ntf-btn,.search-btn,.xb-act button{min-height:44px!important;min-width:44px!important}}\n</style>\n</head><body>',
  },
  // Global AccountMenu & Ringkasan Eksekutif (Mobile): cegah klip angka % pada .xb-bar & overflow grid.
  {
    file: 'AccountMenu',
    find: '@media (max-width:760px){.xb-tiles{grid-template-columns:repeat(2,minmax(0,1fr));padding:12px 14px}.xb-top,.xb-head,.xb-att,.xb-memo,.xb-act,.xb-foot{padding-left:14px;padding-right:14px}.xb-head{flex-direction:column;gap:8px}.xb-hl{font-size:16px}.xb-t b{font-size:20px}.xb-memo{font-size:15px}.xb-tabs{margin-left:0}.xb-bars{padding:0 14px 12px}.xb-bar{grid-template-columns:minmax(0,1fr) 54px;gap:4px 10px;margin:0 -6px;padding:8px 6px}.xb-bar .n{grid-column:1/2}.xb-bar .v{grid-column:2/3;grid-row:1}.xb-bar .tr{grid-column:1/3}.xb-bar .l{grid-column:1/3}}',
    replace: '@media (max-width:760px){.app>*,.main,.content,.wrap{min-width:0}.xb-tiles{grid-template-columns:repeat(2,minmax(0,1fr));padding:12px 14px}.xb-top,.xb-head,.xb-att,.xb-memo,.xb-act,.xb-foot{padding-left:14px;padding-right:14px}.xb-head{flex-direction:column;gap:8px}.xb-hl{font-size:16px}.xb-t b{font-size:20px}.xb-memo{font-size:15px}.xb-tabs{margin-left:0}.xb-bars{padding:0 14px 12px}.xb-bar{grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;margin:0 -6px;padding:8px 6px}.xb-bar .n{grid-column:1/2}.xb-bar .v{grid-column:2/3;grid-row:1;white-space:nowrap}.xb-bar .tr{grid-column:1/3}.xb-bar .l{grid-column:1/3}}',
  },
  // Document Control (Mobile): ubah tabel register dokumen (.dl) menjadi kartu, rapikan header proyek & sematkan bilah Isi halaman agar langsung bisa diakses.
  {
    file: 'DocControl',
    find: '</head>',
    replace: '<style>html,body{overflow-x:clip}.app>*,.main,.wrap{min-width:0;max-width:100%}' +
      '\n@media (max-width:900px){#content{display:flex;flex-direction:column}#content>.bar{order:-1;margin:0 0 12px!important;position:sticky;top:var(--dc-top,60px);z-index:25;background:var(--bg);padding:6px 0 8px;border-bottom:1px solid var(--line)}#content>.bar .tabs{width:100%;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;box-shadow:var(--shadow)}#content>.bar .tabs::-webkit-scrollbar{display:none}#content>.bar .tabs button{min-height:36px;padding:0 12px;font-size:12.5px}#content>.bar .meta{margin-left:0;font-size:12px}}' +
      '\n@media (max-width:760px){.top{flex-wrap:wrap;gap:8px 10px;padding:10px 12px}.top .t b{white-space:normal;font-size:15px;line-height:1.25}.top .sel{order:10;flex:1 0 100%;max-width:100%;width:100%;min-height:36px;height:36px}}' +
      '\n@media (max-width:640px){.tools .inp.q{min-width:0;width:100%}table.dl{table-layout:auto;display:block}table.dl colgroup{display:none}table.dl tbody{display:block}table.dl tr.r{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:12px 4px;border-bottom:1px solid var(--line)}table.dl td{display:block;border:0;padding:0;overflow:visible;text-overflow:clip}table.dl td.cb{flex:none;width:auto;padding:0;align-self:flex-start;margin-top:2px}table.dl td.t{flex:1 1 calc(100% - 40px);min-width:0}table.dl td.t b,table.dl td.t small{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere}table.dl td.n:not(.h){margin-left:28px}table.dl td.a{margin-left:auto;text-align:right;white-space:normal;display:flex;gap:6px;align-items:center;flex-wrap:wrap}}</style>' +
      '\n<script>(function(){function sy(){var h=document.querySelector("header.top");if(h)document.documentElement.style.setProperty("--dc-top",h.offsetHeight+"px");}window.addEventListener("resize",sy);if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",sy);else setTimeout(sy,50);})();</script>\n</head>',
  },
  // Tambah / Edit Proyek (Mobile): susun tabel riwayat addendum (.hist) menjadi kartu & cegah overflow.
  {
    file: 'ProjectSetup',
    find: '</head>',
    replace: '<style>html,body{overflow-x:clip}.app>*,.main,.content{min-width:0;max-width:100%}@media (max-width:760px){table.hist,table.hist tbody{display:block;width:100%}table.hist thead{display:none}table.hist tr{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;padding:10px 0;border-bottom:1px solid var(--line)}table.hist td{display:block;padding:0;border:0;min-width:0}table.hist td:nth-child(4),table.hist td:nth-child(5){flex:0 0 100%;width:100%;overflow-wrap:anywhere}}</style>\n</head>',
  },
  // EPCC Control & Engineering (Mobile): cegah overflow pada input pencarian & kartu.
  ...['Epcc', 'Engineering'].map((file) => ({
    file,
    find: '</head>',
    replace: '<style>html,body{overflow-x:clip}.app>*,.main,.wrap{min-width:0;max-width:100%}@media (max-width:640px){.tools .inp.q{min-width:0;width:100%}.drv .t{min-width:0}.stg3 b{font-size:17px}}</style>\n</head>',
  })),
  // Portal Proyek (Mobile): geser titik carousel menjauhi Sena, judul 1 baris, titik status bulat, dan target sentuh >= 44px.
  {
    file: 'Portal',
    find: '</head>',
    replace: '<style>@media (max-width:760px){.hero-dots{left:16px!important;right:auto!important;bottom:14px!important}.top .t b{white-space:nowrap;font-size:clamp(14px,4vw,17px)}.top .t small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hero-eye::before,.hero-eye i,.hero-eye span{flex-shrink:0}.ntf-btn,.search-btn,.xb-act button,.acc-all button{min-height:44px!important;min-width:44px!important}}</style>\n</head>',
  },
  // Buat Laporan Weekly: ubah Resume per bidang menjadi 4 Disiplin (CIVIL, MECHANICAL, ELECTRICAL, INSTRUMENT) + tabel gabungan 4 Bidang x 4 Disiplin.
  // Buat Laporan Bulanan: ganti daftar bullet kontribusi bidang dengan tabel kontribusi per item/disiplin (tanpa kolom Kendala & Action Plan).
  // Scope Pekerjaan: ambil WBS Level 2 (Eng, Proc, Comm) & Level 2-3 (Construction) dari baseline EPCC tanpa info bobot, dukung sub-bullet di Preview & Word.
  {
    file: 'MonthlyDoc',
    find: '.pv .pv-ul{font-size:12.5px;line-height:1.5;padding-left:96px}.pv .pv-ul li{margin:2px 0}',
    replace: '.pv .pv-ul{font-size:12.5px;line-height:1.5;padding-left:96px}.pv .pv-ul li{margin:2px 0}.pv .pv-ul .pv-sub{padding-left:20px;margin:2px 0 4px;list-style-type:circle}.pv .pv-ul .pv-sub .pv-sub{list-style-type:square}.pv .pv-ul li.pv-top{font-weight:700;margin-top:6px}.pv .pv-ul li.pv-top>.pv-sub{font-weight:400}',
  },
  {
    file: 'MonthlyDoc',
    find: '<label>Scope pekerjaan · satu butir per baris<textarea id="n_scope" rows="6"></textarea></label>',
    replace: '<label>Scope pekerjaan · satu butir per baris (awalan spasi/`-` untuk sub-butir)<textarea id="n_scope" rows="8"></textarea></label>\n        <div class="btnrow"><button type="button" id="scopePull"><i class="ic" data-ic="refresh"></i>Isi ulang dari baseline WBS</button></div>',
  },
  {
    file: 'MonthlyDoc',
    find: "    const def=lbDefaults(d),s=d.notes||{};N={};NOTE_KEYS.forEach(k=>N[k]=s[k]!==undefined?s[k]:def[k]);",
    replace: "    const def=lbDefaults(d),s=d.notes||{};N={};NOTE_KEYS.forEach(k=>N[k]=s[k]!==undefined?s[k]:def[k]);\n    if(typeof s.scope==='string'&&/^\\s*Pekerjaan Engineering \\(bobot\\s+\\d/i.test(s.scope)&&def.scope)N.scope=def.scope;",
  },
  {
    file: 'MonthlyDoc',
    find: "$('actPull').onclick=()=>{if(!confirm('Isi ulang kegiatan dari data dashboard? Suntingan kegiatan saat ini diganti.'))return;const d=lbDefaults(D);N.done=d.done;N.next=d.next;renderActs();markDirty();};",
    replace: "$('actPull').onclick=()=>{if(!confirm('Isi ulang kegiatan dari data dashboard? Suntingan kegiatan saat ini diganti.'))return;const d=lbDefaults(D);N.done=d.done;N.next=d.next;renderActs();markDirty();};\nif($('scopePull'))$('scopePull').onclick=()=>{if(!D)return;if(N.scope&&!confirm('Isi ulang Scope pekerjaan dari baseline WBS EPCC terbaru? Suntingan scope saat ini diganti.'))return;N.scope=lbDefaults(D).scope;$('n_scope').value=N.scope||'';markDirty();renderPreview();say('Scope pekerjaan diisi ulang dari baseline WBS.');};",
  },
  {
    file: 'MonthlyDoc',
    find: "  const sc=[];x.fields.forEach(f=>{if(fin(f.weight)&&Number(f.weight)>0)sc.push('Pekerjaan '+f.name+' (bobot '+nf(f.weight,f.weight%1?2:0)+'%)');});\n  const cons=x.epc&&x.epc.CONS;if(cons&&cons.rows)cons.rows.slice(0,12).forEach(r=>sc.push(r.name));\n  o.scope=sc.join('\\n');",
    replace: `  const ws=x.wbsScope||{},sc=[];
  const pushFlat=(title,arr,label)=>{if(!arr||!arr.length)return;sc.push(title);if(arr.length<=10&&arr.every(s=>String(s).length<32)){sc.push('  - '+label+': '+arr.join(', '));}else{arr.forEach(s=>sc.push('  - '+s));}};
  const engArr=(ws.eng&&ws.eng.length)?ws.eng:(x.eng&&x.eng.rows?x.eng.rows.map(r=>r.disc):[]);
  pushFlat('Pekerjaan Engineering',engArr,'Disiplin');
  pushFlat('Pekerjaan Procurement',ws.proc||[],'Disiplin');
  if(ws.cons&&ws.cons.length){
    sc.push('Pekerjaan Construction');
    const totL3=ws.cons.reduce((s,g)=>s+((g.items&&g.items.length)||0),0);
    ws.cons.forEach(g=>{
      const its=g.items||[];
      if(!its.length)sc.push('  - '+g.name);
      else if(totL3<=60){sc.push('  - '+g.name);its.forEach(it=>sc.push('    - '+it));}
      else sc.push('  - '+g.name+': '+its.join('; '));
    });
  }else{
    const cons=x.epc&&x.epc.CONS;if(cons&&cons.rows&&cons.rows.length){sc.push('Pekerjaan Construction');cons.rows.forEach(r=>sc.push('  - '+r.name));}
  }
  pushFlat('Pekerjaan Commissioning',ws.com||[],'Lingkup');
  if(!sc.length)x.fields.forEach(f=>{if(fin(f.weight)&&Number(f.weight)>0)sc.push('Pekerjaan '+f.name);});
  o.scope=sc.join('\\n');`,
  },
  {
    file: 'MonthlyDoc',
    find: "  ul(lines(N.scope));",
    replace: `  const scItems=String(N.scope||'').split(/\\r?\\n/).map(raw=>{
    if(!raw||!raw.trim())return null;
    const m=raw.match(/^([ \\t]*)/),ind=m?m[1].replace(/\\t/g,'  ').length:0;
    const text=raw.replace(/^\\s*(?:[-•*]|\\d+[.)])\\s+/,'').trim();
    return text?{lv:ind>=4?2:ind>=2?1:0,text:text}:null;
  }).filter(Boolean);
  if(scItems.length)B.push({t:'ul',items:scItems,tree:true});`,
  },
  {
    file: 'MonthlyDoc',
    find: "    if(b.t==='ul')return '<ul class=\"pv-ul\">'+b.items.map(i=>'<li>'+e(i)+'</li>').join('')+'</ul>';",
    replace: `    if(b.t==='ul'){
      if(!b.tree)return '<ul class="pv-ul">'+b.items.map(i=>'<li>'+e(i)+'</li>').join('')+'</ul>';
      let h='<ul class="pv-ul">',lv=0;
      b.items.forEach((it,idx)=>{
        const t=Math.max(0,Math.min(it.lv,idx===0?0:lv+1));
        const nx=b.items[idx+1],hasChild=nx&&nx.lv>t;
        while(lv<t){h+='<ul class="pv-sub">';lv++;}
        while(lv>t){h+='</li></ul>';lv--;}
        if(idx>0&&b.items[idx-1].lv>=t)h+='</li>';
        const cls=(t===0&&hasChild)?' class="pv-top"':'';
        const c=(t===1&&!hasChild)?it.text.indexOf(': '):-1;
        const body=(c>0&&c<90&&it.text[c-1]!==' ')?'<b>'+e(it.text.slice(0,c+1))+'</b>'+e(it.text.slice(c+1)):e(it.text);
        h+='<li'+cls+'>'+body;
      });
      while(lv>0){h+='</li></ul>';lv--;}
      if(b.items.length)h+='</li>';
      return h+'</ul>';
    }`,
  },
  {
    file: 'MonthlyDoc',
    find: "  const bullet=t=>'<w:p><w:pPr><w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"'+LBNUM+'\"/></w:numPr><w:spacing w:before=\"0\" w:after=\"60\" w:line=\"264\" w:lineRule=\"auto\"/><w:ind w:left=\"'+(ind+360)+'\" w:hanging=\"360\"/><w:jc w:val=\"both\"/></w:pPr>'+run(t)+'</w:p>';",
    replace: `  const bullet=(it,idx,arr)=>{
    const o=typeof it==='string'?{lv:0,text:it}:it,lv=Math.max(0,Math.min(2,Number(o.lv)||0));
    const nx=arr&&arr[idx+1],nxLv=nx?(typeof nx==='string'?0:Number(nx.lv)||0):0,left=ind+(lv+1)*360;
    let inner;
    if(lv===0&&nx&&nxLv>0)inner=run(o.text,{b:true});
    else{const c=(lv===1&&(!nx||nxLv<=1))?o.text.indexOf(': '):-1;inner=(c>0&&c<90&&o.text[c-1]!==' ')?run(o.text.slice(0,c+1),{b:true})+run(o.text.slice(c+1)):run(o.text);}
    return '<w:p><w:pPr><w:numPr><w:ilvl w:val="'+lv+'"/><w:numId w:val="'+LBNUM+'"/></w:numPr><w:spacing w:before="0" w:after="60" w:line="264" w:lineRule="auto"/><w:ind w:left="'+left+'" w:hanging="360"/><w:jc w:val="both"/></w:pPr>'+inner+'</w:p>';
  };`,
  },
  {
    file: 'MonthlyDoc',
    find: "    else if(b.t==='ul')out+=b.items.map(bullet).join('');",
    replace: "    else if(b.t==='ul')out+=b.items.map((it,idx)=>bullet(it,idx,b.items)).join('');",
  },
  {
    file: 'MonthlyDoc',
    find: "  const abs='<w:abstractNum w:abstractNumId=\"'+aid+'\"><w:multiLevelType w:val=\"singleLevel\"/><w:lvl w:ilvl=\"0\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"•\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"'+(ind+360)+'\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Arial\" w:hAnsi=\"Arial\" w:cs=\"Arial\" w:hint=\"default\"/></w:rPr></w:lvl></w:abstractNum>';",
    replace: `  const mkLvl=(lv,sym)=>'<w:lvl w:ilvl="'+lv+'"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="'+sym+'"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="'+(ind+(lv+1)*360)+'" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:hint="default"/></w:rPr></w:lvl>';
  const abs='<w:abstractNum w:abstractNumId="'+aid+'"><w:multiLevelType w:val="multilevel"/>'+mkLvl(0,'•')+mkLvl(1,'–')+mkLvl(2,'-')+'</w:abstractNum>';`,
  },
  {
    file: 'MonthlyDoc',
    find: "  p('Kontribusi progres tiap bidang terhadap progres proyek (100%):',{sp:true});\n  ul(x.fields.filter(f=>fin(f.weight)&&Number(f.weight)>0).map(f=>f.name+': realisasi '+pc(fin(f.actual)?f.actual*f.weight/100:null,2)+' dari '+pc(f.weight,2)+' (rencana '+pc(fin(f.plan)?f.plan*f.weight/100:null,2)+')'));",
    replace: `  const dbMap=x.discByField||{};
  x.fields.filter(f=>fin(f.weight)&&Number(f.weight)>0).forEach(f=>{
    const d=dbMap[f.k],projCont=fin(f.actual)?f.actual*f.weight/100:null,projPlan=fin(f.plan)?f.plan*f.weight/100:null;
    p(f.name+' : '+(fin(f.actual)?nf(f.actual,3)+'%':'-')+' dari '+(fin(f.plan)?nf(f.plan,3)+'%':'-')+' (bobot proyek '+pc(f.weight,2)+' · kontribusi '+pc(projCont,2)+' dari rencana '+pc(projPlan,2)+')',{b:true,sp:true});
    if(d&&d.rows&&d.rows.length){
      const trs=d.rows.map((r,idx)=>[String(idx+1)+'.',r.name,nf(r.weight,3),nf(r.contrib,3)]);
      trs.push(['','TOTAL',nf(d.totWeight,3),nf(d.totContrib,3)]);
      tb({cols:[{h:'No',w:8,al:'c'},{h:'Item',w:44,al:'l'},{h:'Bobot (%)',w:24},{h:'Kontribusi (%)',w:24}],rows:trs,total:true});
    }
  });`,
  },
  // Buat Laporan Weekly: ubah Resume per bidang menjadi 4 Disiplin (CIVIL, MECHANICAL, ELECTRICAL, INSTRUMENT) + tabel gabungan 4 Bidang x 4 Disiplin.
  {
    file: 'WeeklyPrint',
    find: "return {code:r.code,name:r.name,group:r.group||'',groupName:r.groupName||'',weight:r.weight,fw:r.fieldWeight,blk,dev,late,changed,hl,ket};",
    replace: "return {code:r.code,name:r.name,disc:r.disc||'',epcType:r.type||'',stageNote:r.stageNote||'',group:r.group||'',groupName:r.groupName||'',weight:r.weight,fw:r.fieldWeight,blk,dev,late,changed,hl,ket};",
  },
  {
    file: 'WeeklyPrint',
    find: "function resumeModel(f){const M=detailModel(f),w=fin(f.weight)?Number(f.weight):null,sc=v=>fin(v)&&w!=null?v*w/100:null;\n  const groups=M.rows.filter(r=>r.type==='group'),loose=M.rows.filter(r=>r.type==='item'&&!r.group&&!r.groupName);\n  const list=groups.map(g=>({code:g.code,name:g.name,fw:g.fw,blk:g.blk}));\n  if(loose.length){const sum=sel=>loose.every(x=>fin(sel(x)))?loose.reduce((a,x)=>a+Number(sel(x)),0):null,blk={};BLOCKS.forEach(([k])=>blk[k]={total:sum(x=>x.blk[k].total),plan:sum(x=>x.blk[k].plan)});list.push({code:'',name:'Lain-lain',fw:sum(x=>x.fw),blk});}\n  const row=g=>{const o={code:g.code,name:g.name,weight:sc(g.fw)};BLOCKS.forEach(([k])=>o[k]=[sc(g.blk[k].plan),sc(g.blk[k].total)]);o.contrib=fin(g.blk.current.total)&&fin(g.fw)&&g.fw>0?g.blk.current.total/g.fw*100:null;o.dev=fin(o.current[0])&&fin(o.current[1])?o.current[1]-o.current[0]:null;return o;};\n  const rows=list.map(row),T=row({code:'',name:'JUMLAH',fw:M.total.fw,blk:M.total.blk});return {weight:w,rows,total:T};}",
    replace: `function pmoDiscOf(it){
  const m=function(s){
    if(/\\b(CIVIL|SIPIL|CIV|SIP|STRUKTUR|STRUCTURE|STRUCTURAL|STR|ARSITEK|ARCH|ARCHITECTURAL)\\b/.test(s))return 'CIVIL';
    if(/\\b(MECHANICAL|MEKANIKAL|MEKANIK|MEC|MEK|PIPING|PIP|PROSES|PROCESS|PRC|ROTATING|STATIC|EQUIPMENT)\\b/.test(s))return 'MECHANICAL';
    if(/\\b(ELECTRICAL|ELEKTRIKAL|ELEKTRIK|LISTRIK|ELE|ELK)\\b/.test(s))return 'ELECTRICAL';
    if(/\\b(INSTRUMENT|INSTRUMENTASI|INSTRUMENTATION|INSTRUMEN|INSTUMENT|INS|INST|AUTOMATION)\\b/.test(s))return 'INSTRUMENT';
    return '';
  };
  const d1=m((String(it.disc||'')+' '+String(it.groupName||'')+' '+String(it.group||'')+' '+String(it.epcType||'')+' '+String(it.stageNote||'')).toUpperCase());
  if(d1)return d1;
  const n=String(it.name||'').toUpperCase();
  if(/\\b(FT-\\d+|FCV|PLC|DCS|SCADA|TRANSMITTER|GAUGE|METER|ANALYZER|CONTROL VALVE|THERMOCOUPLE|SENSOR|F&G|FIRE|ALARM|CCTV|INSTRUMENT|INSTUMENT)\\b/.test(n))return 'INSTRUMENT';
  if(/\\b(ELECTRICAL|ELEKTRIK|LISTRIK|CABLE|KABEL|PANEL|TRAFO|TRANSFORMER|SWITCHGEAR|HVS|MCC|MOTOR|LIGHTING|LAMPU|GROUNDING|LIGHTNING|UPS|GENSET|POWER|BUSDUCT|FIBER OPTIC)\\b/.test(n))return 'ELECTRICAL';
  if(/\\b(MECHANICAL|MEKANIK|GRANULATOR|DRYER|COOLER|SCRUBBER|TANK|TANGKI|VESSEL|PUMP|POMPA|PIPE|PIPA|PIPING|VALVE|HYDRANT|CRANE|CONVEYOR|HOIST|BLOWER|FAN|COMPRESSOR|HEAT EXCHANGER|CHILLER|BOILER|TURBINE|REACTOR|UNLOADER|ELEVATOR|SCREW|HOPPER|SILO|DUCTING|RAIL|JACK UP|STRINGING|FIT UP|DYE PENETRANT|BIN HOPPER)\\b/.test(n))return 'MECHANICAL';
  if(/\\b(CIVIL|SIPIL|BETON|ATAP|PONDASI|FOUNDATION|STRUKTUR|STRUCTURE|STEEL STRUCTURE|JALAN|DRAINASE|TANGGUL|TIANG|PANCANG|PILE|BORE PILE|PILING|SHEET PILE|PLATFORM|STAIRS|LADDER|GEDUNG|BANGUNAN|EXCAVATION|EARTHWORK|CONCRETE|FENDER|BOLLARD|REVETMENT|DERMAGA|BAJA|SILT PROTECTOR|DREDGING|PIPE BRIDGE|CABLE TRAY|SITE OFFICE|DIREKSI KEET|PERSIAPAN|MOBILISASI|DEMOBILISASI|FINISHING|PERIZINAN)\\b/.test(n))return 'CIVIL';
  const gc=String(it.group||it.code||'').trim();
  if(/^1\\.[23]\\.1(?:\\.|$)/.test(gc))return 'CIVIL';
  if(/^1\\.[23]\\.2(?:\\.|$)/.test(gc))return 'MECHANICAL';
  if(/^1\\.[23]\\.3(?:\\.|$)/.test(gc))return 'ELECTRICAL';
  if(/^1\\.[23]\\.4(?:\\.|$)/.test(gc))return 'INSTRUMENT';
  return 'LAIN';
}
function resumeModel(f){const M=detailModel(f),w=fin(f.weight)?Number(f.weight):null,sc=v=>fin(v)&&w!=null?v*w/100:null;
  const items=M.rows.filter(r=>r.type==='item');
  const buckets={CIVIL:[],MECHANICAL:[],ELECTRICAL:[],INSTRUMENT:[],LAIN:[]};
  items.forEach(it=>buckets[pmoDiscOf(it)].push(it));
  const aggB=(name,arr)=>{if(!arr.length)return {code:'',name:name,fw:null,blk:{previous:{plan:null,total:null},added:{plan:null,total:null},current:{plan:null,total:null}}};
    const sum=sel=>{const vals=arr.map(sel).filter(fin);return vals.length?vals.reduce((a,x)=>a+Number(x),0):null;};
    const blk={};BLOCKS.forEach(([k])=>{blk[k]={total:sum(x=>x.blk[k].total),plan:sum(x=>x.blk[k].plan)};});
    return {code:'',name:name,fw:sum(x=>x.fw),blk};};
  const list=['CIVIL','MECHANICAL','ELECTRICAL','INSTRUMENT'].map(d=>aggB(d,buckets[d]));
  if(buckets.LAIN.length)list.push(aggB('LAIN-LAIN',buckets.LAIN));
  const row=g=>{const o={code:g.code,name:g.name,weight:sc(g.fw)};BLOCKS.forEach(([k])=>o[k]=[sc(g.blk[k].plan),sc(g.blk[k].total)]);o.contrib=fin(g.blk.current.total)&&fin(g.fw)&&g.fw>0?g.blk.current.total/g.fw*100:null;o.dev=fin(o.current[0])&&fin(o.current[1])?o.current[1]-o.current[0]:null;return o;};
  const rows=list.map(row),T=row({code:'',name:'JUMLAH',fw:M.total.fw,blk:M.total.blk});return {weight:w,rows,total:T};}
function resumeAllReport(){const ph=periodHeads();
  let h=head('RESUME WEEKLY PROGRESS PER BIDANG & DISIPLIN')+'<table class="sum res"><thead><tr><th rowspan="3" class="c-no">No</th><th rowspan="3" class="desc">Uraian Pekerjaan</th><th rowspan="3">Bobot (%)</th>'+RES_HEAD.map((x,i)=>'<th colspan="2">'+x[1]+'<span class="thd">'+ph[i][1]+'</span></th>').join('')+'<th rowspan="2">KONTRIBUSI</th><th rowspan="2">DEVIASI</th></tr><tr>'+Array(3).fill('<th>Rencana</th><th>Aktual</th>').join('')+'</tr><tr>'+Array(6).fill('<th>Bobot (%)</th>').join('')+'<th>%</th><th>%</th></tr></thead><tbody>';
  const line=(r,cls,num)=>'<tr'+(cls?' class="'+cls+'"':'')+'><td class="c-no">'+(num||'')+'</td><td class="desc">'+esc(r.name)+'</td>'+tdn(r.weight)+BLOCKS.map(([k])=>tdn(r[k][0])+tdn(r[k][1])).join('')+tdn(r.contrib)+tdn(r.dev)+'</tr>';
  let totW=0,totBlk={previous:[0,0],added:[0,0],current:[0,0]},hasAny=false;
  D.fields.forEach((f,fi)=>{const no=fi+1,w=fin(f.weight)?Number(f.weight):null;if(w!=null)totW+=w;
    if(f.notice){h+='<tr class="grp"><td class="c-no">'+no+'</td><td class="desc">'+esc(f.name.toUpperCase())+'</td>'+tdn(w)+'<td colspan="8" style="text-align:left;color:#64748b">Baseline belum tersedia</td></tr>';
      ['CIVIL','MECHANICAL','ELECTRICAL','INSTRUMENT'].forEach((d,di)=>h+=line({name:d,weight:null,previous:[null,null],added:[null,null],current:[null,null],contrib:null,dev:null},'',no+'.'+(di+1)));return;}
    const M=resumeModel(f);hasAny=true;
    h+='<tr class="grp"><td class="c-no">'+no+'</td><td class="desc">'+esc(f.name.toUpperCase())+'</td>'+tdn(M.weight)+BLOCKS.map(([k])=>tdn(M.total[k][0])+tdn(M.total[k][1])).join('')+tdn(M.total.contrib)+tdn(M.total.dev)+'</tr>';
    M.rows.forEach((r,ri)=>h+=line(r,'',no+'.'+(ri+1)));
    BLOCKS.forEach(([k])=>{if(fin(M.total[k][0]))totBlk[k][0]+=Number(M.total[k][0]);if(fin(M.total[k][1]))totBlk[k][1]+=Number(M.total[k][1]);});
  });
  const totRow={name:'JUMLAH',weight:totW||null,previous:totBlk.previous,added:totBlk.added,current:totBlk.current,contrib:hasAny&&totW>0?totBlk.current[1]/totW*100:null,dev:hasAny?totBlk.current[1]-totBlk.current[0]:null};
  h+=line(totRow,'total','');
  return h+'</tbody></table><div class="memo"><b>Catatan :</b> Pengelompokan disiplin (Civil, Mechanical, Electrical, Instrument) mengikuti label kolom GRUP pada baseline proyek. Item yang belum diberi label disiplin masuk ke Lain-lain.</div>'+signs();}`,
  },
  {
    file: 'WeeklyPrint',
    find: "function sections(){const out=[{id:'summary',t:'Summary Weekly Progress',html:summaryReport}];",
    replace: "function sections(){const out=[{id:'summary',t:'Summary Weekly Progress',html:summaryReport},{id:'rall',t:'Resume Progress per Bidang & Disiplin',html:resumeAllReport}];",
  },
  {
    file: 'WeeklyPrint',
    find: "if(selected==='summary')html=summaryReport();",
    replace: "if(selected==='summary')html=summaryReport()+'<hr>'+resumeAllReport();",
  },
  {
    file: 'WeeklyPrint',
    find: "for(const f of D.fields){fno++;if(!f.notice)resumeSheet(f,fno);",
    replace: `(function(){const ws=b.sheet('Resume Bidang'),ph=periodHeads();[7,34,11,12,12,12,12,12,12,13,12].forEach((w,i)=>ws.cols[i+1]=w);const r0=header(ws,'RESUME WEEKLY PROGRESS PER BIDANG & DISIPLIN',11);ws.mg(r0,1,r0+2,1,'No',S.th);ws.mg(r0,2,r0+2,2,'Uraian Pekerjaan',S.th);ws.mg(r0,3,r0+2,3,'Bobot (%)',S.th);RES_HEAD.forEach((x,i)=>{ws.mg(r0,4+i*2,r0,5+i*2,x[1]+'\\n'+ph[i][1],S.th);ws.set(r0+1,4+i*2,'Rencana',S.th2);ws.set(r0+1,5+i*2,'Aktual',S.th2);ws.set(r0+2,4+i*2,'Bobot (%)',S.th2);ws.set(r0+2,5+i*2,'Bobot (%)',S.th2);});ws.mg(r0,10,r0+1,10,'KONTRIBUSI',S.th);ws.mg(r0,11,r0+1,11,'DEVIASI',S.th);ws.set(r0+2,10,'%',S.th2);ws.set(r0+2,11,'%',S.th2);ws.hts[r0]=54;ws.cols[1]=9;let r=r0+3,totW=0,tb={previous:[0,0],added:[0,0],current:[0,0]},any=false;const g=o=>cell(Object.assign({b:1,fill:GRP},o));const put=(x,num,tot)=>{const o=e=>cell(Object.assign(tot?{b:1,fill:HEAD}:{},e));ws.set(r,1,num,o({h:'center'}));ws.set(r,2,x.name,o(tot?{h:'right'}:{}));ws.set(r,3,x.weight,o({fmt:NF3}));BLOCKS.forEach(([k],i)=>{ws.set(r,4+i*2,x[k][0],o({fmt:NF3}));ws.set(r,5+i*2,x[k][1],o({fmt:NF3}));});ws.set(r,10,x.contrib,o({fmt:NF3}));ws.set(r,11,x.dev,o({fmt:NF3}));ws.hts[r]=17;r++;};D.fields.forEach((f,fi)=>{const no=fi+1,w=fin(f.weight)?Number(f.weight):null;if(w!=null)totW+=w;if(f.notice){ws.set(r,1,no,g({h:'center'}));ws.set(r,2,f.name.toUpperCase(),g({}));ws.set(r,3,w,g({fmt:NF3}));for(let c=4;c<=11;c++)ws.set(r,c,null,g({}));r++;['CIVIL','MECHANICAL','ELECTRICAL','INSTRUMENT'].forEach((d,di)=>put({name:d,weight:null,previous:[null,null],added:[null,null],current:[null,null],contrib:null,dev:null},no+'.'+(di+1)));return;}const M=resumeModel(f);any=true;ws.set(r,1,no,g({h:'center'}));ws.set(r,2,f.name.toUpperCase(),g({}));ws.set(r,3,M.weight,g({fmt:NF3}));BLOCKS.forEach(([k],i)=>{ws.set(r,4+i*2,M.total[k][0],g({fmt:NF3}));ws.set(r,5+i*2,M.total[k][1],g({fmt:NF3}));});ws.set(r,10,M.total.contrib,g({fmt:NF3}));ws.set(r,11,M.total.dev,g({fmt:NF3}));r++;M.rows.forEach((x,i)=>put(x,no+'.'+(i+1)));BLOCKS.forEach(([k])=>{if(fin(M.total[k][0]))tb[k][0]+=Number(M.total[k][0]);if(fin(M.total[k][1]))tb[k][1]+=Number(M.total[k][1]);});});put({name:'JUMLAH',weight:totW||null,previous:tb.previous,added:tb.added,current:tb.current,contrib:any&&totW>0?tb.current[1]/totW*100:null,dev:any?tb.current[1]-tb.current[0]:null},'',true);signBlock(ws,r+2,2,3,8,11);ws.titles=[r0,r0+2];})();\n  for(const f of D.fields){fno++;if(!f.notice)resumeSheet(f,fno);`,
  },
  // Weekly Dashboard (mode mobile): Forecast selesai & aktivitas kritis (Jadwal CPM) hanya tampil di tab Kurva S.
  {
    file: 'Dashboard',
    find: "function renderMscW(data){const v=data.schedule,sec=document.getElementById('sec-msc');if(!sec)return;if(!v||!v.likely){sec.hidden=true;return}sec.hidden=false;",
    replace: "function renderMscW(data){const v=data.schedule,sec=document.getElementById('sec-msc');if(!sec)return;if(!v||!v.likely){sec.removeAttribute('data-mtab');sec.hidden=true;return}sec.setAttribute('data-mtab','kurva');sec.hidden=(typeof mIsOn==='function'&&mIsOn()&&typeof mTab!=='undefined'&&mTab!=='kurva');",
  },
  // Weekly Dashboard: simpan projectId di atribut elemen judul agar kunci susunan slide tetap aman walau nama proyek diubah.
  {
    file: 'Dashboard',
    find: "document.getElementById('weeklyProjectName').textContent=selectedProject.toUpperCase();",
    replace: "var __wpEl=document.getElementById('weeklyProjectName');__wpEl.textContent=selectedProject.toUpperCase();__wpEl.dataset.pid=data.projectId||'';window.__pmoWeeklyPid=data.projectId||'';",
  },
];
HTML_PATCHES.push(...require('./portal-latest').PORTAL_LATEST_PATCHES, ...require('./nav-theme').NAV_PATCHES, ...require('./sena-extra').SENA_PATCHES, ...require('./sena-v2').HTML_PATCHES, ...require('./live-lan').LIVE_HTML_PATCHES, ...require('./drive-preview').DRIVE_PREVIEW_PATCHES, ...require('./exec-story-brief').EXEC_STORY_PATCHES, ...require('./weekly-hero').WEEKLY_HERO_PATCHES, ...require('./master-hero').MASTER_HERO_PATCHES, ...require('./doc-hero').DOC_HERO_PATCHES, ...require('./library-hero').LIBRARY_HERO_PATCHES, ...require('./visual3d-hero').VISUAL3D_HERO_PATCHES, ...require('./liveview-hero').LIVEVIEW_HERO_PATCHES, ...require('./epcc-hero').EPCC_HERO_PATCHES, ...require('./input-hero').INPUT_HERO_PATCHES);

/** Tambahan/perbaikan fungsi server .gs yang belum lengkap di berkas legacy. */
const GS_PATCHES = [
  {
    file: 'Code',
    find: 'function deleteGalleryPhoto(token, projectId, photoId) {',
    replace: `function galPhotoInRoots_(file, roots) {
  if (!file || !Array.isArray(roots) || !roots.length) return false;
  var allow = {};
  for (var i = 0; i < roots.length; i++) {
    if (roots[i]) allow[String(roots[i])] = true;
  }
  var queue = [], seen = {};
  try {
    var ps = file.getParents();
    while (ps && ps.hasNext()) queue.push({ folder: ps.next(), depth: 1 });
  } catch (e) { return false; }
  while (queue.length) {
    var cur = queue.shift();
    if (!cur || !cur.folder) continue;
    var pid = '';
    try { pid = String(cur.folder.getId() || ''); } catch (e) { continue; }
    if (!pid || seen[pid]) continue;
    seen[pid] = true;
    if (allow[pid]) return true;
    if (cur.depth >= 8) continue;
    try {
      var up = cur.folder.getParents();
      while (up && up.hasNext()) queue.push({ folder: up.next(), depth: cur.depth + 1 });
    } catch (e) {}
  }
  return false;
}
function deleteGalleryPhoto(token, projectId, photoId) {`,
  },
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
        var lw = { week: w, actual: act, plan: plan, deviation: dev, status: status, highlight: hl || i.highlight };
        try {
          var raw = weekText_(db.weekly, i.projectId, 'HIGHLIGHT_ACTIVITY', w) || weekText_(db.weekly, i.projectId, 'HIGHLIGHT', w);
          lw.lines = String(raw || '').split(/\\n+/).map(function (x) { return x.replace(/^\\s*(?:\\d+[.)]|[-\\u2022*])\\s*/, '').trim(); }).filter(Boolean).slice(0, 10).map(function (x) { return x.length > 400 ? x.slice(0, 397) + '\\u2026' : x; });
          var pj = (db.projects || []).filter(function (x) { return x.id === i.projectId; })[0];
          if (pj) {
            var inf = weeklyInfo_(db, pj), sd = inf && inf.startDate;
            if (sd) {
              var a = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate() + (w - 1) * 7), b2 = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6);
              var iso = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
              lw.from = iso(a); lw.to = iso(b2);
              var now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              var late = Math.floor((today - b2) / 6048e5);
              lw.stale = late >= 2 ? late : 0;
            }
            var cs = execCause_(db, pj, w);
            if (cs) { var lim = function (t) { return String(t || '').trim().slice(0, 4000); }; lw.cause = { field: cs.field, concern: lim(cs.concern), mitigation: lim(cs.mitigation) }; }
          }
          if (w > 1) { var pa = pct(weekPercent_(db.weekly, i.projectId, 'KOMULATIF_REALISASI', w - 1)); if (pa !== null) lw.prev = { week: w - 1, actual: pa }; }
        } catch (e2) { /* rincian tambahan opsional */ }
        return Object.assign({}, i, { lw: lw });
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
        var finRows = [], doneProjects = [], msMap = {};
        try {
          var ex = getExecutiveDashboardData(token);
          if (ex && ex.financial && Array.isArray(ex.financial.rows)) finRows = ex.financial.rows;
          if (ex && Array.isArray(ex.projects) && Array.isArray(ex.milestones)) {
            ex.milestones.forEach(function (m) { var pj = ex.projects[m.projectIndex]; if (pj && pj.projectId) msMap[pj.projectId] = { milestone: String(m.milestone || ''), status: String(m.status || ''), note: String(m.note || '') }; });
          }
          if (ex && Array.isArray(ex.projects)) {
            doneProjects = ex.projects.filter(function (p) { return String(p.stage || '').toUpperCase() === 'SELESAI'; })
              .map(function (p) { return { projectId: p.projectId, name: p.name }; });
          }
        } catch (e2) { /* abaikan jika gagal */ }
        r = Object.assign({}, r, { brief: Object.assign({}, r.brief, { groups: { map: gmap, parents: parents }, finRows: finRows, doneProjects: doneProjects, msMap: msMap }) });
      }
    } catch (e) { /* tanpa kelompok, kartu tampil seperti biasa */ }
    return r;
  };
  // Buat Laporan Weekly: sertakan kolom DISIPLIN dari ENG_BASELINE & EPC_ITEM agar resume 4 Disiplin akurat.
  var __origWeeklyPrint = getWeeklyPrintReport;
  getWeeklyPrintReport = function (token, projectId, requestedWeek) {
    var r = __origWeeklyPrint(token, projectId, requestedWeek);
    try {
      if (!r || !r.success || !r.project || !Array.isArray(r.fields)) return r;
      var pid = String(r.project.id || '').trim().toUpperCase();
      var ss = loadDb_().ss;
      var engMap = {}, epcMap = {};
      var readSh = function (def, fn) {
        var sh = ss.getSheetByName(def[0]);
        if (!sh || sh.getLastRow() < 2) return;
        var vals = sh.getDataRange().getValues(), hd = vals[0].map(function (x) { return String(x || '').trim().toUpperCase(); });
        var iP = hd.indexOf('PROYEK_ID'), iD = hd.indexOf('DISIPLIN'), iSt = hd.indexOf('STATUS');
        if (iP < 0 || iD < 0) return;
        for (var i = 1; i < vals.length; i++) {
          if (String(vals[i][iP] || '').trim().toUpperCase() !== pid) continue;
          if (iSt >= 0 && String(vals[i][iSt] || '').trim().toUpperCase() === 'BATAL') continue;
          fn(vals[i], hd, String(vals[i][iD] || '').trim());
        }
      };
      readSh(ENG.SHEETS.BASELINE, function (row, hd, disc) {
        if (!disc) return;
        var iNo = hd.indexOf('NOMOR_DOKUMEN'), iNm = hd.indexOf('NAMA_DOKUMEN');
        if (iNo >= 0 && row[iNo]) engMap[String(row[iNo]).trim()] = disc;
        if (iNm >= 0 && row[iNm]) engMap['N:' + String(row[iNm]).trim()] = disc;
      });
      readSh(EPC.SHEETS.ITEM, function (row, hd, disc) {
        if (!disc) return;
        var iId = hd.indexOf('ID'), iBid = hd.indexOf('BIDANG');
        if (iId >= 0 && row[iId]) epcMap[String(iBid >= 0 ? row[iBid] : '') + '|' + String(row[iId]).trim()] = disc;
        if (iId >= 0 && row[iId]) epcMap[String(row[iId]).trim()] = disc;
      });
      r.fields.forEach(function (f) {
        if (!f || !Array.isArray(f.rows)) return;
        f.rows.forEach(function (row) {
          if (f.key === 'ENG') row.disc = engMap[String(row.id || '').trim()] || engMap['N:' + String(row.name || '').trim()] || '';
          else row.disc = epcMap[f.key + '|' + String(row.id || '').trim()] || epcMap[String(row.id || '').trim()] || '';
        });
      });
    } catch (e) { /* jika gagal, resume tetap memakai GRUP */ }
    return r;
  };
  // Buat Laporan Bulanan (Word): longgarkan batas karakter scope agar WBS Level 2-3 panjang tidak terpotong saat disimpan.
  if (typeof lbClean_ === 'function') {
    var __origLbClean = lbClean_;
    lbClean_ = function (n) {
      var out = __origLbClean(n);
      if (n && n.scope !== undefined && out) out.scope = String(n.scope == null ? '' : n.scope).slice(0, 24000);
      return out;
    };
  }
  // Buat Laporan Bulanan (Word): tambahkan rincian kontribusi per item/disiplin dan struktur WBS baseline untuk Scope Pekerjaan.
  var __origMonthlyDoc = getMonthlyDocData;
  getMonthlyDocData = function (token, projectId, monthKey) {
    var r = __origMonthlyDoc(token, projectId, monthKey);
    try {
      if (!r || !r.success || !r.extra || !r.project) return r;
      var extraPatch = {};
      // 1) WBS Scope Pekerjaan langsung dari baseline EPCC & Engineering aktif (tanpa bobot, tanpa filter progres).
      try {
        var pidW = String(r.project.id || '').trim().toUpperCase();
        var cleanWbs = function (raw) {
          var s = String(raw || '').replace(/\\s+/g, ' ').trim();
          if (!s) return '';
          if (/[A-Z]/.test(s) && /[a-z]/.test(s)) return s;
          var tc = typeof mrName_ === 'function' ? mrName_('', s) : s.toLowerCase().replace(/(^|[\\s(\\/-])([a-z])/g, function (_, a, b) { return a + b.toUpperCase(); });
          return tc.replace(/\\b(hse|gbb|cctv|ups|mv|lv|kv|spt|pda|slo|sbnp|ss|sa|mla|pju|hdpe|prw|fw|cv|tp)\\b/gi, function (w) { return w.toUpperCase(); });
        };
        var dedupList = function (arr) {
          var out = [], seen = {};
          arr.forEach(function (v) {
            var nm = cleanWbs(v), k = nm.toUpperCase();
            if (nm && !seen[k]) { seen[k] = 1; out.push(nm); }
          });
          return out;
        };
        var wbsEng = [];
        if (r.extra.eng && Array.isArray(r.extra.eng.rows) && r.extra.eng.rows.length) {
          wbsEng = dedupList(r.extra.eng.rows.map(function (row) { return row.disc; }));
        } else {
          try {
            var ns = engStoreC_(), nset = ns && ns.setting && ns.setting[pidW];
            if (nset && nset.rev !== null) wbsEng = dedupList((engBaselineOf_(ns, pidW, nset.rev) || []).map(function (d) { return d.disc || 'Umum'; }));
          } catch (eEng) {}
        }
        var es = null; try { es = epcStoreC_(); } catch (eEs) { es = null; }
        var readEpcL2 = function (F) {
          if (!es) return [];
          var k = pidW + '|' + F, set = es.setting && es.setting[k];
          if (!set || set.rev == null) return [];
          var pr = epcParamsOf_(es, k, set.rev) || {}, items = (es.items && es.items[k + '|' + set.rev]) || [];
          var l2 = (pr.groups || []).filter(function (g) { return Number(g.l) === 2 && g.n; }).map(function (g) { return g.n; });
          if (l2.length) return dedupList(l2);
          var disc = items.map(function (it) { return it.d; }).filter(Boolean);
          if (disc.length) return dedupList(disc);
          return dedupList(items.map(function (it) { return it.g || it.n; }));
        };
        var readConsL2L3 = function () {
          if (!es) return [];
          var k = pidW + '|CONS', set = es.setting && es.setting[k];
          if (!set || set.rev == null) return [];
          var pr = epcParamsOf_(es, k, set.rev) || {}, items = (es.items && es.items[k + '|' + set.rev]) || [];
          var buckets = [], byName = {}, l2ByCode = {}, l3ByCode = {};
          var ensureB = function (name) {
            var nm = cleanWbs(name || 'Umum') || 'Umum', key = nm.toUpperCase();
            if (!byName[key]) { byName[key] = { name: nm, items: [], _seen: {} }; buckets.push(byName[key]); }
            return byName[key];
          };
          var curL2 = null;
          (pr.groups || []).forEach(function (g) {
            var lv = Number(g.l), nm = cleanWbs(g.n), code = String(g.c || '').trim();
            if (!nm) return;
            if (lv === 2) {
              curL2 = ensureB(nm);
              if (code) l2ByCode[code] = curL2;
            } else if (lv === 3) {
              var parentCode = code.split('.').slice(0, 2).join('.');
              var target = curL2 || (parentCode && l2ByCode[parentCode]) || ensureB('Umum');
              var uk = nm.toUpperCase();
              if (!target._seen[uk]) { target._seen[uk] = 1; target.items.push(nm); }
              if (code) l3ByCode[code] = nm;
            }
          });
          items.forEach(function (it) {
            var dNm = cleanWbs(it.d || ''), gNm = cleanWbs(it.g || ''), gc = String(it.gc || '').trim();
            if (!dNm && !gNm) return;
            if (gc && (l3ByCode[gc] || l2ByCode[gc])) return;
            var b = ensureB(dNm || gNm);
            if (gNm && gNm.toUpperCase() !== b.name.toUpperCase() && !b._seen[gNm.toUpperCase()]) {
              b._seen[gNm.toUpperCase()] = 1;
              b.items.push(gNm);
            }
          });
          return buckets.map(function (b) {
            var list = (b.items.length === 1 && b.items[0].toUpperCase() === b.name.toUpperCase()) ? [] : b.items;
            return { name: b.name, items: list };
          });
        };
        extraPatch.wbsScope = {
          eng: wbsEng,
          proc: readEpcL2('PROC'),
          cons: readConsL2L3(),
          com: readEpcL2('COM')
        };
      } catch (eWbs) { /* bila store WBS gagal dibaca, pakai fallback default */ }
      // 2) Rincian kontribusi per item/disiplin untuk tiap bidang pada week cut-off.
      if (r.extra.week) {
        var wp = getWeeklyPrintReport(token, r.project.id, r.extra.week);
        if (wp && wp.success && Array.isArray(wp.fields)) {
          var ORDER = ['General', 'Process', 'Sipil', 'Mekanikal', 'Piping', 'Elektrikal', 'Instrument', 'HSE', 'Umum'];
          var pickLabel = function (row) {
            var norm = function (s) {
              if (/\\b(UMUM|GENERAL|GEN|DOC CONTROL|DOCUMENT CONTROL)\\b/.test(s)) return 'General';
              if (/\\b(PROSES|PROCESS|PRC)\\b/.test(s)) return 'Process';
              if (/\\b(CIVIL|SIPIL|CIV|SIP|STRUKTUR|STRUCTURE|STRUCTURAL|STR|ARSITEK|ARCH)\\b/.test(s)) return 'Sipil';
              if (/\\b(MECHANICAL|MEKANIKAL|MEKANIK|MEC|MEK|ROTATING|STATIC|EQUIPMENT)\\b/.test(s)) return 'Mekanikal';
              if (/\\b(PIPING|PIP)\\b/.test(s)) return 'Piping';
              if (/\\b(ELECTRICAL|ELEKTRIKAL|ELEKTRIK|LISTRIK|ELE|ELK)\\b/.test(s)) return 'Elektrikal';
              if (/\\b(INSTRUMENT|INSTRUMENTASI|INSTRUMENTATION|INSTRUMEN|INSTUMENT|INS|INST|AUTOMATION)\\b/.test(s)) return 'Instrument';
              if (/\\b(HSE|K3|SAFETY)\\b/.test(s)) return 'HSE';
              return '';
            };
            var d1 = norm((String(row.disc || '') + ' ' + String(row.groupName || '') + ' ' + String(row.group || '') + ' ' + String(row.type || '') + ' ' + String(row.stageNote || '')).toUpperCase());
            if (d1) return d1;
            var n = String(row.name || '').toUpperCase();
            if (/\\b(FT-\\d+|FCV|PLC|DCS|SCADA|TRANSMITTER|GAUGE|METER|ANALYZER|CONTROL VALVE|THERMOCOUPLE|SENSOR|F&G|FIRE|ALARM|CCTV|INSTRUMENT|INSTUMENT)\\b/.test(n)) return 'Instrument';
            if (/\\b(ELECTRICAL|ELEKTRIK|LISTRIK|CABLE|KABEL|PANEL|TRAFO|TRANSFORMER|SWITCHGEAR|HVS|MCC|MOTOR|LIGHTING|LAMPU|GROUNDING|LIGHTNING|UPS|GENSET|POWER|BUSDUCT|FIBER OPTIC)\\b/.test(n)) return 'Elektrikal';
            if (/\\b(MECHANICAL|MEKANIK|GRANULATOR|DRYER|COOLER|SCRUBBER|TANK|TANGKI|VESSEL|PUMP|POMPA|PIPE|PIPA|PIPING|VALVE|HYDRANT|CRANE|CONVEYOR|HOIST|BLOWER|FAN|COMPRESSOR|HEAT EXCHANGER|CHILLER|BOILER|TURBINE|REACTOR|UNLOADER|ELEVATOR|SCREW|HOPPER|SILO|DUCTING|RAIL|JACK UP|STRINGING|FIT UP|DYE PENETRANT|BIN HOPPER)\\b/.test(n)) return 'Mekanikal';
            if (/\\b(CIVIL|SIPIL|BETON|ATAP|PONDASI|FOUNDATION|STRUKTUR|STRUCTURE|STEEL STRUCTURE|JALAN|DRAINASE|TANGGUL|TIANG|PANCANG|PILE|BORE PILE|PILING|SHEET PILE|PLATFORM|STAIRS|LADDER|GEDUNG|BANGUNAN|EXCAVATION|EARTHWORK|CONCRETE|FENDER|BOLLARD|REVETMENT|DERMAGA|BAJA|SILT PROTECTOR|DREDGING|PIPE BRIDGE|CABLE TRAY|SITE OFFICE|DIREKSI KEET|PERSIAPAN|MOBILISASI|DEMOBILISASI|FINISHING|PERIZINAN)\\b/.test(n)) return 'Sipil';
            var gc = String(row.group || row.code || '').trim();
            if (/^1\\.[23]\\.1(?:\\.|$)/.test(gc)) return 'Sipil';
            if (/^1\\.[23]\\.2(?:\\.|$)/.test(gc)) return 'Mekanikal';
            if (/^1\\.[23]\\.3(?:\\.|$)/.test(gc)) return 'Elektrikal';
            if (/^1\\.[23]\\.4(?:\\.|$)/.test(gc)) return 'Instrument';
            return 'Umum';
          };
          var discByField = {};
          wp.fields.forEach(function (f) {
            if (!f || f.notice || !Array.isArray(f.rows) || !f.rows.length) return;
            var map = {};
            f.rows.forEach(function (row) {
              var lb = pickLabel(row);
              if (!map[lb]) map[lb] = { name: lb, weight: 0, contrib: 0 };
              map[lb].weight += Number(row.fieldWeight) || 0;
              map[lb].contrib += (row.current && Number(row.current.total)) || 0;
            });
            var rows = Object.keys(map).map(function (k) { return map[k]; }).filter(function (x) { return x.weight > 0 || x.contrib > 0; });
            rows.sort(function (a, b) {
              var ia = ORDER.indexOf(a.name), ib = ORDER.indexOf(b.name);
              return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
            });
            var totW = rows.reduce(function (s, x) { return s + x.weight; }, 0);
            var totC = rows.reduce(function (s, x) { return s + x.contrib; }, 0);
            var ef = (r.extra.fields || []).filter(function (x) { return x.k === f.key; })[0];
            if (ef && ef.actual != null && isFinite(ef.actual)) {
              if (ef.actual >= 99.995 && totW > 0 && Math.abs(totC - 100) > 0.05) {
                rows.forEach(function (x) { x.contrib = x.weight * 100 / totW; });
                totC = 100;
              } else if (totC > 0 && Math.abs(totC - ef.actual) > 0.5) {
                var sc = ef.actual / totC;
                rows.forEach(function (x) { x.contrib = x.contrib * sc; });
                totC = ef.actual;
              }
            }
            discByField[f.key] = { rows: rows, totWeight: totW, totContrib: totC };
          });
          extraPatch.discByField = discByField;
        }
      }
      if (Object.keys(extraPatch).length) r = Object.assign({}, r, { extra: Object.assign({}, r.extra, extraPatch) });
    } catch (e) { /* jika baseline mingguan tidak tersedia, tampilkan ringkasan bidang saja */ }
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
  const v3d = require('./visual3d');
  htmlFiles.set('Visual3D', v3d.VISUAL3D_HTML);
  for (const p of HTML_PATCHES.concat(v3d.HTML_PATCHES, require('./monthly-fin').HTML_PATCHES, require('./portal-v2').PORTAL_V2_PATCHES, require('./spotlight-v2').SPOTLIGHT_V2_PATCHES, require('./ktr-docs').HTML_PATCHES, require('./ktr-access').HTML_PATCHES, require('./library-v2').HTML_PATCHES, require('./pres-proj').HTML_PATCHES, require('./contract-fx').HTML_PATCHES, require('./cost-fx').HTML_PATCHES, require('./doc-mom').HTML_PATCHES, require('./doc-ins').HTML_PATCHES, require('./project-drive').HTML_PATCHES, require('./weekly-upload').HTML_PATCHES)) {
    const src = htmlFiles.get(p.file);
    if (src && src.includes(p.find)) htmlFiles.set(p.file, src.replace(p.find, p.replace));
    else console.warn(JSON.stringify({ ev: 'gas_patch_miss', file: p.file }));
  }

  const MENU_RENAMES = [
    ['title="Input Progress"', 'title="Input Progress Mingguan"'], ['<span>Input Progress</span>', '<span>Input Progress Mingguan</span>'],
    ['<h1>Input Progress <span id="heroProject">', '<h1>Input Progress Mingguan <span id="heroProject">'],
    ['title="Laporan Bulanan"', 'title="Input Progress Bulanan"'], ['<span>Laporan Bulanan</span>', '<span>Input Progress Bulanan</span>'],
    ['<title>Laporan Bulanan</title>', '<title>Input Progress Bulanan</title>'], ['<h1>Laporan Bulanan <span id="heroProject">', '<h1>Input Progress Bulanan <span id="heroProject">'],
    ["input:'Input Progress',monthly:'Laporan Bulanan'", "input:'Input Progress Mingguan',monthly:'Input Progress Bulanan'"],
    ["['input','Input Progress','edit'],['monthly','Laporan Bulanan',", "['input','Input Progress Mingguan','edit'],['monthly','Input Progress Bulanan',"],
    ['Input progress mingguan<i', 'Input Progress Mingguan<i'], ['Laporan bulanan<i class="ic go"', 'Input Progress Bulanan<i class="ic go"'],
    ['<i class="ic" data-ic="edit"></i>Input progress</button>', '<i class="ic" data-ic="edit"></i>Input Progress Mingguan</button>'],
    ['<i class="ic" data-ic="cal"></i>Laporan bulanan</button>', '<i class="ic" data-ic="cal"></i>Input Progress Bulanan</button>'],
    ['Input progress mingguan, laporan bulanan (biaya, milestone, RKAP)', 'Input progress mingguan & bulanan (biaya, milestone, RKAP)'],
    ["(PAGE==='input'?'Input progress':'Laporan bulanan')", "(PAGE==='input'?'Input Progress Mingguan':'Input Progress Bulanan')"],
    // Teks penunjuk tempat mengisi data.
    ['di Laporan Bulanan', 'di Input Progress Bulanan'], ['Otomatis dari Laporan Bulanan', 'Otomatis dari Input Progress Bulanan'],
  ];
  // Ganti nama halaman: "Executive Dashboard" → "Monthly Executive Review" (alamat ?page=executive tetap).
  for (const [k, v] of htmlFiles) {
    let t = v.split('Executive Dashboard').join('Monthly Executive Review').split('EXECUTIVE DASHBOARD').join('MONTHLY EXECUTIVE REVIEW');
    t = t.split("'Buat Laporan Bulanan'").join("'Buat Laporan Bulanan (dokumen)'");
    // Ganti nama menu (22 Nov): "Input Progress" → "Input Progress Mingguan", "Laporan Bulanan" → "Input Progress Bulanan".
    // "Buat Laporan Bulanan" (dokumen Word) tetap. Alamat ?page=input / ?page=monthly tidak berubah.
    for (const [a, b] of MENU_RENAMES) t = t.split(a).join(b);
    if (t !== v) htmlFiles.set(k, t);
  }
  for (const f of gsFiles) {
    f.src = f.src.split('Executive Dashboard').join('Monthly Executive Review')
      .split("APP_TITLE + ' — Laporan Bulanan'").join("APP_TITLE + ' — Input Progress Bulanan'")
      .split("title: 'Laporan bulanan ' + m.label + ' belum diisi',").join("title: 'Input progress bulanan ' + m.label + ' belum diisi',");
  }
  // Logo, ikon, dan gambar latar yang ditulis tetap di halaman lama: sajikan dari server sendiri (routes/brand.js).
  try {
    const { rewrite } = require('../routes/brand');
    for (const [k, v] of htmlFiles) { const t = rewrite(v); if (t !== v) htmlFiles.set(k, t); }
  } catch (e) { console.log(JSON.stringify({ ev: 'brand_rewrite_skip', message: String(e.message || e) })); }
  for (const p of GS_PATCHES.concat(require('./live-lan').GS_PATCHES, require('./visual3d').GS_PATCHES, require('./ktr-docs').GS_PATCHES, require('./ktr-access').GS_PATCHES, require('./library-v2').GS_PATCHES, require('./master-hero').MASTER_HERO_GS_PATCHES, require('./pres-proj').GS_PATCHES, require('./contract-fx').GS_PATCHES, require('./cost-fx').GS_PATCHES, require('./doc-mom').GS_PATCHES, require('./doc-ins').GS_PATCHES, require('./weekly-upload').GS_PATCHES)) {
    const f = gsFiles.find((x) => x.name === p.file);
    if (f && f.src.includes(p.find)) f.src = f.src.replace(p.find, () => p.replace);
    else console.warn(JSON.stringify({ ev: 'gas_patch_miss', file: p.file + '.gs' }));
  }
  const code = gsFiles.map((f) => '// ---- ' + f.name + '.gs\n' + f.src).join('\n;\n') +
    '\n;\n// ---- pres-video (server)\n' + require('./pres-video').PRES_VIDEO_GS +
    '\n;\n// ---- pres-proj (server)\n' + require('./pres-proj').PRES_PROJ_GS +
    '\n;\n// ---- contract-fx (server)\n' + require('./contract-fx').FX_GS +
    '\n;\n// ---- cost-fx (server)\n' + require('./cost-fx').COST_GS +
    '\n;\n// ---- sena-v2 (deklarasi)\n' + require('./sena-v2').SENA_V2_GS +
    '\n;\n// ---- project-drive (server)\n' + require('./project-drive').PROJ_DRIVE_GS +
    '\n;\n// ---- weekly-upload (server)\n' + require('./weekly-upload').WU_GS;
  const fnNames = new Set();
  const varNames = new Set();
  for (const m of code.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) fnNames.add(m[1]);
  for (const m of code.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)) varNames.add(m[1]);
  const exportList = [...fnNames, ...varNames].filter((n, i, a) => a.indexOf(n) === i);
  const ret = 'return {' + exportList.map((n) => JSON.stringify(n) + ': (typeof ' + n + ' === "undefined" ? undefined : ' + n + ')').join(',') + '};';

  // Layanan pengganti diberikan sebagai parameter fungsi (lebih cepat daripada 'with').
  const body = code + '\n' + BRIDGE_CODE + '\n' + require('./sena-extra').SENA_BRIDGE + '\n' + require('./groups-r3').GROUPS_BRIDGE + '\n' + ret;
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
    fx: () => require('../lib/fx').snapshot(),
    sena: () => require('../lib/sena').bridge,
    weeklyUp: () => require('../lib/weekly-upload').bridge,
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

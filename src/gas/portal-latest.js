'use strict';

/**
 * Portal = posisi PALING UPDATE (16 Nov 2026).
 *
 * Pembagian peran halaman:
 *  - Portal: tiap proyek memakai minggu terakhir yang sudah diinput (bisa berbeda antar proyek).
 *  - Monthly Executive Review (dulu "Executive Dashboard"): cut-off bulanan, SPI/CPI rata-rata, serapan RKAP.
 *
 * Server (runtime.js, getPortalData) mengirim field `lw` per proyek:
 *   { week, from, to, actual, plan, deviation, status, highlight, lines[], prev:{week,actual}, cause, stale }
 * Modul ini (disisipkan ke Portal.html):
 *  - pmoPortalLatest(i): memetakan `lw` ke kartu proyek.
 *  - pmoPortalSort(items): proyek critical / at risk di depan.
 *  - pmoPortalAfter(b): label minggu + tanggal, perubahan dari minggu sebelumnya, tanda input tertinggal,
 *    resume yang bisa dibuka ("Selengkapnya"), blok kartu naik ke atas ringkasan.
 *  - pmoPortalBrief(el,s,b): ringkasan posisi minggu terakhir + satu baris kinerja bulanan (tautan).
 */

const PORTAL_LATEST_JS = String.raw`
function pmoPortalLatest(i){
  var L=i&&i.lw;if(!L||L.actual==null)return Object.assign({},i,{prevActual:null});
  return Object.assign({},i,{pending:false,actual:L.actual,plan:L.plan,deviation:L.deviation,status:L.status,cutWeek:L.week,week:L.week,highlight:L.highlight||i.highlight,prevActual:null});
}
function pmoPortalSort(items){
  var rk=function(i){var s=(i.lw&&i.lw.status)||i.status;return s==='Critical'?0:s==='At risk'?1:2};
  return items.map(function(i,k){return {i:i,k:k}}).sort(function(a,b){return rk(a.i)-rk(b.i)||a.k-b.k}).map(function(x){return x.i});
}
function pmoPortalRange(a,b){
  var M=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  var p=function(s){var m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?{y:+m[1],m:+m[2]-1,d:+m[3]}:null};
  var x=p(a),y=p(b);if(!x||!y)return '';
  return x.m===y.m&&x.y===y.y?x.d+'–'+y.d+' '+M[y.m]:x.d+' '+M[x.m]+' – '+y.d+' '+M[y.m];
}
function pmoPortalPts(v){return (v>0?'+':v<0?'−':'')+(Math.abs(v)*100).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})}
function pmoPortalAfter(b){
  if(!document.getElementById('pmoPlCss')){var st=document.createElement('style');st.id='pmoPlCss';st.textContent=
    '.pc .pc-wk{white-space:nowrap}.pc .pc-stale{display:block;text-align:left;margin:0 20px 8px;padding:5px 10px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700}'+
    '.pc .pc-dl{color:var(--muted,#5b7085)}.pc .pc-dl b{font-weight:700}.pc .pc-dl.up b{color:#16875d}.pc .pc-dl.dn b{color:#b42318}'+
    '.xpl-lead{margin:0 0 12px;line-height:1.7;color:var(--muted,#5b7085);font-size:14px}.xpl-g{margin:14px 0 8px}'+
    '.xpl-p{border:1px solid var(--line,#dbe5ee);border-radius:12px;margin:0 0 8px;background:var(--card,#fff)}'+
    '.xpl-p>summary{list-style:none;cursor:pointer;padding:11px 14px 11px 38px;position:relative;line-height:1.65}.xpl-p>summary::-webkit-details-marker{display:none}'+
    '.xpl-p>summary:before{content:"";position:absolute;left:16px;top:19px;width:7px;height:7px;border-right:2px solid var(--muted,#5b7085);border-bottom:2px solid var(--muted,#5b7085);transform:rotate(-45deg);transition:transform .15s}.xpl-p[open]>summary:before{transform:rotate(45deg)}'+
    '.xpl-p>summary:focus-visible{outline:2px solid var(--pri,#0f5fa8);outline-offset:2px;border-radius:12px}'+
    '.xpl-p .xpl-b{padding:0 14px 12px 38px;line-height:1.7}.xpl-p .xpl-b p{margin:0 0 6px}.xpl-p .xpl-b p:last-child{margin:0}.xpl-p .xpl-b i{color:var(--muted,#5b7085)}'+
    '.xpl-v{font-weight:800}.xpl-v.good{color:#16875d}.xpl-v.warn{color:#b45309}.xpl-v.bad{color:#b42318}.xpl-v.pl{color:var(--ink,#13324f)}.xpl-v.fin{color:var(--pri,#0f5fa8)}.xpl-s{font-weight:700}.xpl-s.good{color:#16875d}.xpl-s.warn{color:#b45309}.xpl-s.bad{color:#b42318}'+
    '.xpl-tools{display:flex;gap:14px;margin:0 0 8px;font-size:12.5px}.xpl-tools button{background:none;border:0;padding:0;color:var(--pri,#0f5fa8);font:inherit;font-weight:700;cursor:pointer;text-decoration:underline;text-underline-offset:3px}'+
    '.xpl-mon{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin:10px 0 14px;padding:12px 16px;border-radius:12px;background:var(--tint,#f3f7fb);border:1px solid var(--line,#dbe5ee);font-size:14px}.xpl-mon b{font-weight:700}.xpl-mon a{margin-left:auto;font-weight:700;color:var(--pri,#0f5fa8);text-decoration:none;white-space:nowrap}.xpl-mon a:hover{text-decoration:underline}';
    document.head.appendChild(st)}
  var by={};(b.items||[]).forEach(function(i){by[i.name]=i});
  var box=document.getElementById('pulse');if(!box)return;
  box.querySelectorAll('.pc').forEach(function(c){
    var i=by[c.getAttribute('data-name')],L=i&&i.lw;if(!L||L.actual==null)return;
    var rg=pmoPortalRange(L.from,L.to),wk=c.querySelector('.pc-wk');
    if(wk)wk.textContent='W'+L.week+(rg?' · '+rg:'');
    c.title='Buka Weekly Progress W'+L.week;
    if(L.stale>=1&&!c.querySelector('.pc-stale')){var bd=c.querySelector('.pc-b');if(bd)bd.insertAdjacentHTML('afterend','<span class="pc-stale">Input terakhir '+L.stale+' minggu lalu</span>')}
    if(L.prev&&L.prev.actual!=null){var d=L.actual-L.prev.actual,txt='<span class="pc-dl '+(d>0?'up':d<0?'dn':'')+'"><b>'+pmoPortalPts(d)+' poin</b> dari W'+L.prev.week+'</span>';
      var m=c.querySelector('.pc-meta');if(m)m.insertAdjacentHTML('beforeend','<br>'+txt);
      var mm=c.querySelector('.pc-meta-m');if(mm)mm.insertAdjacentHTML('beforeend',' · '+txt)}
  });
  var pt=document.getElementById('portalPulseTitle');if(pt)pt.textContent='Posisi proyek · minggu terakhir yang diinput';
}
function pmoPortalBrief(el,s,b){
  if(!el)return;
  var E=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  var nm=function(n){return typeof pmoProjName==='function'?pmoProjName(n):n};
  var P=function(v){return v==null||!isFinite(v)?'—':(v*100).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+'%'};
  var P0=function(v){return v==null||!isFinite(v)?'—':(v*100).toLocaleString('id-ID',{maximumFractionDigits:0})+'%'};
  var rp=function(m){m=Number(m);if(!isFinite(m))return '—';return Math.abs(m)>=1e6?'Rp '+(m/1e6).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+' T':'Rp '+(m/1e3).toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:1})+' M'};
  var MON=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var D=function(x){var m=String(x||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?{y:+m[1],m:+m[2]-1,d:+m[3]}:null};
  var sen=function(t){t=String(t||'').replace(/\s+/g,' ').trim().replace(/[\s.;,]+$/,'');return t};
  var short=function(t,n){t=sen(t);return t.length>n?t.slice(0,n-1).replace(/\s+\S*$/,'')+'…':t};
  var items=Array.isArray(b&&b.items)?b.items:[],G=(b.groups&&b.groups.map)||{},MS=b.msMap||{};
  var fin={};(b.finRows||[]).forEach(function(r){if(r.projectId)fin[r.projectId]=r});
  var grp=function(id){return (G[id]&&G[id].type)==='RUTIN'?'RUTIN':'PENGEMBANGAN'};
  var finPer=b.period||'',nx=String(b.nextPeriod||'').split(' ')[0];
  var ends=items.map(function(i){return i.lw&&D(i.lw.to)}).filter(Boolean).sort(function(a,c){return (c.y*12+c.m)-(a.y*12+a.m)});
  var run=ends[0]?MON[ends[0].m]+' '+ends[0].y:'';
  var plainParts=[];
  var lead='Periode berjalan '+(run||'—')+'. Progres memakai minggu terakhir yang diinput tiap proyek; keuangan memakai posisi akhir '+(finPer||'bulan laporan terakhir')+' terhadap RKAP tahun berjalan.';
  plainParts.push(lead);
  function one(i){
    var L=i.lw||{},t=D(L.to),f=fin[i.projectId],ms=MS[i.projectId]||{},cs=L.cause||{};
    var act=L.actual!=null?L.actual:i.actual,plan=L.plan!=null?L.plan:i.plan,dev=L.deviation!=null?L.deviation:i.deviation,stt=L.status||i.status;
    var cls=stt==='Critical'?'bad':stt==='At risk'?'warn':'good',done=act!=null&&act>=0.99995;
    var when=t?'sampai dengan minggu ke-'+Math.min(5,Math.ceil(t.d/7))+' '+MON[t.m]+' '+t.y+' (W'+L.week+')':(L.week?'sampai dengan W'+L.week:'');
    var prog=done?'progres fisik telah <b class="xpl-v good">selesai 100%</b>'+(plan!=null&&plan<0.99995?' (rencana '+P(plan)+')':'')
      :'progres fisik <b class="xpl-v '+cls+'">'+P(act)+'</b> dari rencana <b class="xpl-v pl">'+P(plan)+'</b>'+(dev!=null?' (<span class="xpl-s '+cls+'">'+pmoPortalPts(dev)+' poin, '+E(String(stt||'').toLowerCase())+'</span>)':'');
    var head='<b>'+E(nm(i.name))+'</b> — '+(when?when+': ':'')+prog+'.'+(L.stale>=1?' <i>(input terakhir '+L.stale+' minggu lalu)</i>':'');
    var body=[];
    var acts=(L.lines&&L.lines.length?L.lines:(L.highlight?[L.highlight]:[])).slice(0,3).map(function(x){return short(x,140)}).filter(Boolean);
    if(acts.length)body.push('<i>Aktivitas utama:</i> '+acts.map(E).join('; ')+'.');
    if(dev!=null&&dev<0&&cs.concern)body.push('<i>Kendala'+(cs.field?' ('+E(cs.field)+')':'')+':</i> '+E(short(cs.concern,260))+'.'+(cs.mitigation?' <i>Tindak lanjut:</i> '+E(short(cs.mitigation,260))+'.':''));
    var msName=sen(ms.milestone||i.nextMilestone||'');
    if(msName)body.push('<i>Target milestone '+E(nx||'bulan berikutnya')+':</i> '+E(msName)+(sen(ms.status)?' — status <b>'+E(sen(ms.status))+'</b>':(done?' — <b>selesai</b>':''))+'.');
    if(f&&f.rkap2026!=null&&Number(f.rkap2026)>0&&f.actualToDate!=null)body.push('<i>Keuangan s.d. akhir '+E(finPer)+':</i> realisasi '+E(rp(f.actualToDate))+', <b class="xpl-v fin">'+P0(Number(f.actualToDate)/Number(f.rkap2026))+'</b> dari RKAP tahunan '+E(rp(f.rkap2026))+'.');
    else body.push('<i>Keuangan s.d. akhir '+E(finPer)+':</i> data RKAP belum tersedia.');
    plainParts.push((head+' '+body.join(' ')).replace(/<[^>]+>/g,''));
    return '<details class="xpl-p"'+(cls!=='good'?' open':'')+'><summary>'+head+'</summary><div class="xpl-b">'+body.map(function(x){return '<p>'+x+'</p>'}).join('')+'</div></details>';
  }
  var rk=function(i){var x=(i.lw&&i.lw.status)||i.status;return x==='Critical'?0:x==='At risk'?1:2};
  var memo='<p class="xpl-lead">'+E(lead)+'</p><div class="xpl-tools"><button type="button" data-xpl="1">Buka semua</button><button type="button" data-xpl="0">Lipat semua</button></div>';
  [['PENGEMBANGAN','Proyek Pengembangan',''],['RUTIN','Proyek Investasi Rutin',' rut']].forEach(function(g){
    var list=items.filter(function(i){return grp(i.projectId)===g[0]});if(!list.length)return;
    list=list.map(function(i,k){return {i:i,k:k}}).sort(function(a,c){return rk(a.i)-rk(c.i)||a.k-c.k}).map(function(x){return x.i});
    var a=0,r=0,any=false;list.forEach(function(i){var f=fin[i.projectId];if(!f)return;if(f.actualToDate!=null||f.rkap2026!=null)any=true;a+=Number(f.actualToDate||0);r+=Number(f.rkap2026||0)});
    var tot=any&&r>0?' Serapan RKAP tahunan <b class="xpl-v fin">'+P0(a/r)+'</b> ('+E(rp(a))+' dari '+E(rp(r))+') s.d. akhir '+E(finPer)+'.':'';
    memo+='<p class="xpl-g"><span class="xbn-tag'+g[2]+'">'+g[1]+'</span> '+list.length+' proyek berjalan.'+tot+'</p>'+list.map(one).join('');
    if(tot)plainParts.push(g[1]+': '+tot.replace(/<[^>]+>/g,'').trim());
  });
  var mon='<div class="xpl-mon"><span>SPI, CPI, dan rincian keuangan bulanan (cut-off '+E(finPer)+') ada di halaman bulanan.</span><a href="/app?page=executive">Buka Monthly Executive Review →</a></div>';
  var plain=plainParts.join('\n\n');
  var pt=document.getElementById('portalBriefTitle');if(pt)pt.textContent='Ringkasan · progres minggu terakhir & keuangan bulanan';
  el.innerHTML='<div class="xbn-wrap"><div class="xbn-memo xpl-memo">'+memo+'</div>'+mon+
    '<div class="xb-act"><button type="button" data-xb-copy>Salin narasi</button>'+(window.speechSynthesis?'<button type="button" data-xb-say>Dengarkan</button>':'')+'<span class="xb-msg" role="status"></span></div>'+
    (b.asOfText?'<div class="xb-foot"><span>Data mingguan s.d. '+E(b.asOfText)+'</span></div>':'')+'</div>';
  el.querySelectorAll('[data-xpl]').forEach(function(bt){bt.onclick=function(){var o=bt.getAttribute('data-xpl')==='1';el.querySelectorAll('details.xpl-p').forEach(function(d){d.open=o})}});
  var msg=el.querySelector('.xb-msg'),say=function(t){if(msg){msg.textContent=t;clearTimeout(msg._t);msg._t=setTimeout(function(){msg.textContent=''},3500)}};
  var cp=el.querySelector('[data-xb-copy]');
  if(cp)cp.onclick=function(){var done=function(){say('Narasi disalin.')};
    function fb(){var ta=document.createElement('textarea');ta.value=plain;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(e){say('Tidak bisa menyalin otomatis.')}ta.remove()}
    try{navigator.clipboard.writeText(plain).then(done,fb)}catch(e){fb()}};
  var sp=el.querySelector('[data-xb-say]');
  if(sp)sp.onclick=function(){
    if(window.pmoSay){if(sp.getAttribute('data-on')==='1'){pmoSay.stop();sp.removeAttribute('data-on');sp.textContent='Dengarkan';return}
      sp.setAttribute('data-on','1');sp.textContent='Hentikan';
      pmoSay.speak(plain,function(){sp.removeAttribute('data-on');sp.textContent='Dengarkan'},function(m){say(m);sp.removeAttribute('data-on');sp.textContent='Dengarkan'})}
    else{try{var u=new SpeechSynthesisUtterance(plain);u.lang='id-ID';speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){say('Suara tidak tersedia di browser ini.')}}};
}
`;

/** Patch Portal.html (diterapkan SETELAH patch Portal lain di runtime.js). */
const PORTAL_LATEST_PATCHES = [
  {
    file: 'Portal',
    find: "const __card=function(i){i=Object.assign({},i,{prevActual:null});",
    replace: "const __card=function(i){i=pmoPortalLatest(i);",
  },
  {
    file: 'Portal',
    find: "$('pulse').innerHTML=pmoGroupedCards(items,b,__card,esc,thumb);",
    replace: "$('pulse').innerHTML=pmoGroupedCards(items,b,__card,esc,thumb);try{pmoPortalAfter(b)}catch(e){console.warn('pmoPortalAfter',e)}",
  },
  {
    file: 'Portal',
    find: "pmoExecBriefMount($('briefBox'),s,b,function(r){goWeek(r.name,r.week)});",
    replace: "try{pmoExecBriefMount(document.createElement('div'),s,b)}catch(e){}pmoPortalBrief($('briefBox'),s,b);",
  },
];

module.exports = { PORTAL_LATEST_JS, PORTAL_LATEST_PATCHES };

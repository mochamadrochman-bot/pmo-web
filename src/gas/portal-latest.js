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
  var E=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  if(!document.getElementById('pmoPlCss')){var st=document.createElement('style');st.id='pmoPlCss';st.textContent=
    '.pc .pc-wk{white-space:nowrap}.pc .pc-stale{display:block;text-align:left;margin:0 20px 8px;padding:5px 10px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700}.pg-grid:has(.pl-open){align-items:start}'+
    '.pc .pc-img{position:relative}.pc .pc-dl{color:var(--muted,#5b7085)}.pc .pc-dl b{font-weight:700}.pc .pc-dl.up b{color:#16875d}.pc .pc-dl.dn b{color:#b42318}'+
    '.pc .pc-more{display:inline-block;margin:2px 0 0;padding:2px 0;font-size:12.5px;font-weight:700;color:var(--pri,#0f5fa8);cursor:pointer;text-decoration:underline;text-underline-offset:3px}'+
    '.pc .pc-moreW{padding:0 20px;margin-top:-6px;text-align:left}.pc .pc-full{display:none;text-align:left;padding:2px 20px 4px;font-size:13.5px;line-height:1.55;color:var(--ink,#13324f)}'+
    '.pc .pc-full ol{margin:0;padding-left:18px}.pc .pc-full li{margin:0 0 4px}.pc .pc-full .k{margin-top:8px;padding:8px 10px;border-radius:10px;background:var(--tint,#f3f7fb);font-size:13px}.pc .pc-full .k b{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#5b7085);margin-bottom:2px}'+
    '.pc.pl-open .pc-hl{display:none}.pc.pl-open .pc-full{display:block}'+
    '.pg-grid .pce{grid-column:1/-1;display:flex;align-items:center;justify-content:flex-start;text-align:left;gap:12px;min-height:0;padding:10px 16px;border-radius:14px;border:1px dashed var(--line,#cfdbe6);background:transparent}'+
    '.pg-grid .pce .pc-img{display:none}.pg-grid .pce .pce-b{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:0}.pg-grid .pce .pce-n{display:inline;font-size:14px}.pg-grid .pce p{margin:0;font-size:13px;color:var(--muted,#5b7085)}'+
    '.xpl-memo p{margin:0 0 12px;line-height:1.75}.xpl-memo ul{margin:0 0 12px;padding-left:20px}.xpl-memo li{margin:0 0 8px;line-height:1.65}.xpl-mon{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin:4px 0 14px;padding:12px 16px;border-radius:12px;background:var(--tint,#f3f7fb);border:1px solid var(--line,#dbe5ee);font-size:14px}.xpl-mon b{font-weight:700}.xpl-mon a{margin-left:auto;font-weight:700;color:var(--pri,#0f5fa8);text-decoration:none;white-space:nowrap}.xpl-mon a:hover{text-decoration:underline}';
    document.head.appendChild(st)}
  var by={};(b.items||[]).forEach(function(i){by[i.name]=i});
  var box=document.getElementById('pulse');if(!box)return;
  box.querySelectorAll('.pce p').forEach(function(p){p.textContent='Belum ada data progres mingguan di tingkat induk. Sub-proyeknya ada di bawah ini.'});
  box.querySelectorAll('.pc').forEach(function(c){
    var i=by[c.getAttribute('data-name')],L=i&&i.lw;if(!L||L.actual==null)return;
    var rg=pmoPortalRange(L.from,L.to),wk=c.querySelector('.pc-wk');
    if(wk)wk.textContent='W'+L.week+(rg?' · '+rg:'');
    c.title='Buka Weekly Progress W'+L.week;
    if(L.stale>=1&&!c.querySelector('.pc-stale')){var bd=c.querySelector('.pc-b');if(bd)bd.insertAdjacentHTML('afterend','<span class="pc-stale">Input terakhir '+L.stale+' minggu lalu</span>')}
    if(L.prev&&L.prev.actual!=null){var d=L.actual-L.prev.actual,txt='<span class="pc-dl '+(d>0?'up':d<0?'dn':'')+'"><b>'+pmoPortalPts(d)+' poin</b> dari W'+L.prev.week+'</span>';
      var m=c.querySelector('.pc-meta');if(m)m.insertAdjacentHTML('beforeend','<br>'+txt);
      var mm=c.querySelector('.pc-meta-m');if(mm)mm.insertAdjacentHTML('beforeend',' · '+txt)}
    var lines=L.lines||[],cs=L.cause,hl=c.querySelector('.pc-hl');
    if(hl&&(lines.length>1||(lines[0]&&lines[0].length>120)||(cs&&(cs.concern||cs.mitigation)))){
      var full='<div class="pc-full">'+(lines.length?'<ol>'+lines.map(function(t){return '<li>'+E(t)+'</li>'}).join('')+'</ol>':'')+
        (cs&&cs.concern?'<div class="k"><b>Kendala'+(cs.field?' · '+E(cs.field):'')+'</b>'+E(cs.concern)+'</div>':'')+(cs&&cs.mitigation?'<div class="k"><b>Tindak lanjut</b>'+E(cs.mitigation)+'</div>':'')+'</div>';
      hl.insertAdjacentHTML('afterend',full+'<div class="pc-moreW"><span class="pc-more" role="button" tabindex="0" aria-expanded="false">Selengkapnya</span></div>');
      var more=c.querySelector('.pc-more'),tg=function(e){e.preventDefault();e.stopPropagation();var o=c.classList.toggle('pl-open');more.textContent=o?'Ringkas':'Selengkapnya';more.setAttribute('aria-expanded',String(o))};
      more.addEventListener('click',tg);more.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' ')tg(e)});
      c.querySelector('.pc-full').addEventListener('click',function(e){e.stopPropagation()});
    }
  });
  var pt=document.getElementById('portalPulseTitle');if(pt)pt.textContent='Posisi proyek · minggu terakhir yang diinput';
  var sp=box.closest('section'),bb=document.getElementById('briefBox'),sb=bb&&bb.closest('section');
  if(sp&&sb&&sp.parentNode===sb.parentNode&&(sb.compareDocumentPosition(sp)&Node.DOCUMENT_POSITION_FOLLOWING))sb.parentNode.insertBefore(sp,sb);
}
function pmoPortalBrief(el,s,b){
  if(!el)return;
  var E=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  var nm=function(n){return typeof pmoProjName==='function'?pmoProjName(n):n};
  var P=function(v){return v==null||!isFinite(v)?'—':(v*100).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+'%'};
  var items=Array.isArray(b&&b.items)?b.items:[],G=(b.groups&&b.groups.map)||{};
  var grp=function(id){return (G[id]&&G[id].type)==='RUTIN'?'RUTIN':'PENGEMBANGAN'};
  var st=function(i){return (i.lw&&i.lw.status)||i.status};
  var sen=function(t){t=String(t||'').replace(/\s+/g,' ').trim().replace(/[\s.]+$/,'');return t?t+'.':''};
  var memo='';
  [['PENGEMBANGAN','Proyek Pengembangan',''],['RUTIN','Proyek Investasi Rutin',' rut']].forEach(function(g){
    var list=items.filter(function(i){return grp(i.projectId)===g[0]});if(!list.length)return;
    var on=list.filter(function(i){return st(i)==='On track'}).length,rk=list.filter(function(i){return st(i)==='At risk'}).length,cr=list.filter(function(i){return st(i)==='Critical'}).length;
    var parts=[on+' <i>on track</i>'];if(rk)parts.push(rk+' <i>at risk</i>');if(cr)parts.push(cr+' <i>critical</i>');
    memo+='<p><span class="xbn-tag'+g[2]+'">'+g[1]+'</span> '+list.length+' proyek berjalan: '+parts.join(', ')+', berdasarkan minggu terakhir yang diinput tiap proyek.</p>';
  });
  var bad=items.filter(function(i){var L=i.lw;return L&&L.deviation!=null&&L.deviation<0}).sort(function(a,c){return a.lw.deviation-c.lw.deviation});
  if(bad.length){
    memo+='<p><b>Perlu perhatian:</b></p><ul>'+bad.map(function(i){var L=i.lw,rg=pmoPortalRange(L.from,L.to),cs=L.cause||{};
      return '<li><b>'+E(nm(i.name))+'</b> (W'+L.week+(rg?', '+rg:'')+') — aktual '+P(L.actual)+' dari rencana '+P(L.plan)+' ('+pmoPortalPts(L.deviation)+' poin).'+
        (cs.concern?' <i>Kendala'+(cs.field?' ('+E(cs.field)+')':'')+':</i> '+E(sen(cs.concern)):'')+(cs.mitigation?' <i>Tindak lanjut:</i> '+E(sen(cs.mitigation)):'')+'</li>'}).join('')+'</ul>';
  }else if(items.length){
    memo+='<p><b>Perlu perhatian:</b> tidak ada. Semua proyek berada di atas atau sama dengan rencana pada minggu terakhirnya.</p>';
  }
  var late=items.filter(function(i){return i.lw&&i.lw.stale>=1});
  if(late.length)memo+='<p><b>Input tertinggal:</b> '+late.map(function(i){return E(nm(i.name))+' (terakhir W'+i.lw.week+', '+i.lw.stale+' minggu lalu)'}).join('; ')+'.</p>';
  var x=null;try{x=typeof pmoExecBrief==='function'?pmoExecBrief(s,b):null}catch(e){x=null}
  var per=(x&&x.period)||b.period||'',mon='',monTxt='';
  if(x&&x.tiles){var t=x.tiles,bits=[];
    if(/SPI/.test(t[0].k)&&t[0].v!=='—')bits.push('SPI <b>'+E(t[0].v)+'</b>');
    if(t[3]&&t[3].v!=='—')bits.push('CPI <b>'+E(t[3].v)+'</b>');
    if(t[2]&&t[2].v!=='—')bits.push('serapan RKAP <b>'+E(t[2].v)+'</b>');
    if(bits.length){mon='<div class="xpl-mon"><span>Kinerja bulanan (cut-off '+E(per)+'): '+bits.join(' · ')+'</span><a href="/app?page=executive">Buka Monthly Executive Review →</a></div>';
      monTxt='Kinerja bulanan cut-off '+per+': '+bits.join(', ').replace(/<[^>]+>/g,'')+'.'}}
  var plain=memo.replace(/<\/p>|<\/ul>/g,'\n\n').replace(/<li>/g,'• ').replace(/<\/li>/g,'\n').replace(/<[^>]+>/g,'').replace(/\n{3,}/g,'\n\n').trim()+(monTxt?'\n\n'+monTxt:'');
  var pt=document.getElementById('portalBriefTitle');if(pt)pt.textContent='Ringkasan · posisi minggu terakhir';
  el.innerHTML='<div class="xbn-wrap"><div class="xbn-memo xpl-memo">'+memo+'</div>'+mon+
    '<div class="xb-act"><button type="button" data-xb-copy>Salin narasi</button>'+(window.speechSynthesis?'<button type="button" data-xb-say>Dengarkan</button>':'')+'<span class="xb-msg" role="status"></span></div>'+
    (b.asOfText?'<div class="xb-foot"><span>Data mingguan s.d. '+E(b.asOfText)+'</span></div>':'')+'</div>';
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
    replace: "$('pulse').innerHTML=pmoGroupedCards(pmoPortalSort(items),b,__card,esc,thumb);try{pmoPortalAfter(b)}catch(e){console.warn('pmoPortalAfter',e)}",
  },
  {
    file: 'Portal',
    find: "pmoExecBriefMount($('briefBox'),s,b,function(r){goWeek(r.name,r.week)});",
    replace: "try{pmoExecBriefMount(document.createElement('div'),s,b)}catch(e){}pmoPortalBrief($('briefBox'),s,b);",
  },
];

module.exports = { PORTAL_LATEST_JS, PORTAL_LATEST_PATCHES };

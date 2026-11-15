'use strict';

/**
 * R3 — Kelompok proyek tahap 3 (15 Nov 2026).
 *
 * 1. Hak ubah PIC/INPUT (bridge):
 *    - semua proyek di project_ids akunnya (sebelumnya hanya proyek pertama);
 *    - sub-proyek dari proyek induk yang dipegangnya.
 * 2. Pilihan proyek di Laporan Bulanan, Pelaporan Manajemen, Input Progress, Buat Laporan Weekly/Bulanan:
 *    dikelompokkan "Proyek Pengembangan" / "Proyek Investasi Rutin", sub-proyek di bawah induknya.
 *    Laporan Bulanan & Pelaporan Manajemen juga menampilkan kartu "Lampiran sub-proyek"
 *    (sub-proyek tetap dilaporkan dan dihitung sendiri-sendiri).
 * 3. Executive versi HP (mRender): kartu proyek dikelompokkan per kelompok.
 */

const GROUPS_BRIDGE = String.raw`
;(function () {
  var __origOp = userCanOperateProject_;
  userCanOperateProject_ = function (user, project) {
    if (__origOp(user, project)) return true;
    if (!user || !project) return false;
    var role = String(user.role || '').trim().toUpperCase();
    if (role !== 'INPUT' && role !== 'PIC') return false;
    var ids = (Array.isArray(user.projectIds) ? user.projectIds : []).map(function (x) { return normKey_(x); });
    var pid = normKey_(project.id);
    if (ids.indexOf(pid) >= 0) return true;
    try { var g = __bridge.groups()[project.id] || __bridge.groups()[pid]; if (g && g.type === 'SUB' && g.parent && ids.indexOf(normKey_(g.parent)) >= 0) return true; } catch (e) {}
    return false;
  };
})();
`;

/** Disisipkan di halaman laporan per proyek. groups: { id: { type, parent } } */
function selectGroupsSnippet(groups, page) {
  const data = JSON.stringify(groups || {}).replace(/</g, '\\u003c');
  return String.raw`<style id="pmoR3Css">
.pmo-subx{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:12px 0;padding:12px 16px;border:1px solid var(--line,#e0e8f0);border-left:4px solid var(--pri,#0f5fa8);border-radius:12px;background:var(--card,#fff);color:var(--ink,#132b43);font-size:13.5px;line-height:1.45}
.pmo-subx b{font-weight:700}
.pmo-subx .lbl{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#5b7085);width:100%}
.pmo-subx button{padding:6px 12px;border-radius:99px;border:1px solid var(--pri,#0f5fa8);background:transparent;color:var(--pri-ink,#0f5fa8);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;min-height:0}
.pmo-subx button:hover{background:var(--soft,#e8f3fb)}
.pmo-subx .pmo-subx-n{font-size:12px;color:var(--muted,#5b7085);width:100%}
@media print{.pmo-subx{display:none!important}}
</style>
<script>
(function(){
  if(window.__pmoR3)return;window.__pmoR3=true;
  var G=${data},PAGE=${JSON.stringify(String(page || ''))};
  var APPX=['monthly','report','monthlydoc'].indexOf(PAGE)>=0;
  function type(id){return (G[id]&&G[id].type)||'PENGEMBANGAN'}
  function par(id){return G[id]&&G[id].parent}
  function pretty(id){return String(id||'').replace(/_/g,' ')}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  var SEL='#projectSelect,#projSel,select#project';
  function regroup(sel){
    var opts=Array.prototype.slice.call(sel.querySelectorAll('option'));
    var sig=opts.map(function(o){return o.value}).join('|');
    if(!opts.length||sel.__pmoSig===sig)return;
    var real=opts.filter(function(o){return o.value});
    if(real.length<2){sel.__pmoSig=sig;return}
    var cur=sel.value,present={},byId={};real.forEach(function(o){present[o.value]=1;byId[o.value]=o});
    var lead=opts.filter(function(o){return !o.value});
    var subsOf={};real.forEach(function(o){var p=par(o.value);if(type(o.value)==='SUB'&&p&&present[p])(subsOf[p]=subsOf[p]||[]).push(o)});
    var nested=function(id){var p=par(id);return type(id)==='SUB'&&p&&present[p]};
    var order={PENGEMBANGAN:[],RUTIN:[]};
    real.forEach(function(o){if(nested(o.value))return;var t=type(o.value)==='RUTIN'?'RUTIN':'PENGEMBANGAN';order[t].push(o);(subsOf[o.value]||[]).forEach(function(s){order[t].push(s)})});
    var frag=document.createDocumentFragment();lead.forEach(function(o){frag.appendChild(o)});
    [['PENGEMBANGAN','Proyek Pengembangan'],['RUTIN','Proyek Investasi Rutin']].forEach(function(g){
      if(!order[g[0]].length)return;var og=document.createElement('optgroup');og.label=g[1];
      order[g[0]].forEach(function(o){if(type(o.value)==='SUB'&&!o.__pmoSub){o.__pmoSub=1;o.textContent=(nested(o.value)?'\u21B3 ':'')+o.textContent+(nested(o.value)?' (sub-proyek)':' (sub-proyek '+pretty(par(o.value))+')')}og.appendChild(o)});
      frag.appendChild(og);
    });
    sel.innerHTML='';sel.appendChild(frag);
    if(cur&&present[cur])sel.value=cur;
    sel.__pmoSig=opts.map(function(o){return o.value}).join('|');
    if(APPX)appendix(sel);
  }
  function nameOf(sel,id){if(!id)return '';var o=sel.querySelector('option[value="'+(window.CSS&&CSS.escape?CSS.escape(id):id)+'"]');return o?String(o.textContent).replace(/^↳\s*/,'').replace(/\s*\(sub-proyek[^)]*\)$/,'').replace(/\s*\(selesai\)$/,''):id}
  function appendix(sel){
    var id=sel.value,box=document.getElementById('pmoSubx');
    var subs=Object.keys(G).filter(function(k){return G[k]&&G[k].type==='SUB'&&G[k].parent===id&&sel.querySelector('option[value="'+k+'"]')});
    var parent=type(id)==='SUB'&&par(id)?par(id):'',parentHere=parent&&sel.querySelector('option[value="'+parent+'"]');
    if(!subs.length&&!parent){if(box)box.remove();return}
    if(!box){box=document.createElement('div');box.id='pmoSubx';box.className='pmo-subx';box.setAttribute('role','note');
      var host=sel.closest('.toolbar,.tools,.bar,.filters,.row,.grid,.panel,.card,form,header')||sel.parentNode;
      host.parentNode.insertBefore(box,host.nextSibling);
      box.addEventListener('click',function(e){var b=e.target.closest('[data-go]');if(!b)return;sel.value=b.getAttribute('data-go');sel.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(function(){appendix(sel)},50)});}
    if(subs.length)box.innerHTML='<span class="lbl">Lampiran sub-proyek</span>'+subs.map(function(s){return '<span><b>'+esc(nameOf(sel,s))+'</b></span><button type="button" data-go="'+esc(s)+'">Buka laporannya</button>'}).join('')+'<span class="pmo-subx-n">Sub-proyek dilaporkan dan dihitung sendiri-sendiri (tanpa bobot terhadap induk).</span>';
    else box.innerHTML='<span class="lbl">Sub-proyek</span><span>Proyek ini adalah sub-proyek dari <b>'+esc(parentHere?nameOf(sel,parent):pretty(parent))+'</b>.</span>'+(parentHere?'<button type="button" data-go="'+esc(parent)+'">Buka laporan induk</button>':'')+'<span class="pmo-subx-n">Progres dan keuangannya dihitung sendiri-sendiri.</span>';
  }
  function scan(){document.querySelectorAll(SEL).forEach(function(sel){regroup(sel);if(!sel.__pmoR3b){sel.__pmoR3b=1;sel.addEventListener('change',function(){if(APPX)setTimeout(function(){appendix(sel)},0)})}})}
  var t=0;if(window.MutationObserver)new MutationObserver(function(){if(!t)t=setTimeout(function(){t=0;scan()},60)}).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
})();
</script>`;
}

/** Executive versi HP: kartu proyek dikelompokkan (memakai pmoExecOrder dari EXEC_GROUPS_JS). */
const EXEC_MOBILE_GROUPS_JS = String.raw`<style>
#mProj .m-grp{margin:14px 2px 6px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#5b7085);display:flex;align-items:center;gap:8px}
#mProj .m-grp i{width:8px;height:8px;border-radius:50%;background:#1565c0}
#mProj .m-grp.rutin i{background:#15803d}
#mProj .mc .m-sub{display:inline-block;margin-top:2px;font-size:11.5px;font-weight:600;color:var(--muted,#5b7085)}
</style>
<script>
(function(){
  if(typeof mRender!=='function'||typeof pmoExecOrder!=='function')return;
  var orig=mRender;
  mRender=function(data){
    orig(data);
    try{
      var box=document.getElementById('mProj');if(!box)return;
      var O=pmoExecOrder(data);if(!O.groupsUsed.length)return;
      var cards=Array.prototype.slice.call(box.querySelectorAll('article.mc'));if(!cards.length)return;
      var byId={},rest=[];
      cards.forEach(function(c){var b=c.querySelector('.mc-h b');var id=b&&O.nameToId[String(b.textContent).trim().toLowerCase()];if(id&&!byId[id])byId[id]=c;else rest.push(c)});
      var anchor=document.createElement('span');cards[0].parentNode.insertBefore(anchor,cards[0]);var frag=document.createDocumentFragment();
      O.groupsUsed.forEach(function(t){
        var list=O.order[t].filter(function(id){return byId[id]});if(!list.length)return;
        var h=document.createElement('div');h.className='m-grp'+(t==='RUTIN'?' rutin':'');h.innerHTML='<i aria-hidden="true"></i>'+O.LABEL[t];frag.appendChild(h);
        list.forEach(function(id){var c=byId[id];if(O.type(id)==='SUB'&&O.par(id)&&!c.querySelector('.m-sub')){var s=document.createElement('span');s.className='m-sub';s.textContent='Sub-proyek · '+O.nm(O.par(id));var hb=c.querySelector('.mc-h');if(hb)hb.insertAdjacentElement('afterend',s)}frag.appendChild(c)});
      });
      rest.forEach(function(c){frag.appendChild(c)});
      anchor.parentNode.insertBefore(frag,anchor);anchor.remove();
    }catch(e){}
  };
})();
</script>`;

module.exports = { GROUPS_BRIDGE, selectGroupsSnippet, EXEC_MOBILE_GROUPS_JS };

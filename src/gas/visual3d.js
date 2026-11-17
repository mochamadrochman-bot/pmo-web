'use strict';

/**
 * Visual 3D per proyek (17 Nov 2026): halaman ?page=visual3d di kerangka halaman lama.
 * Templat: visual3d.html (berkas virtual "Visual3D"). Data & unggahan: routes/model3d.js.
 */

const fs = require('node:fs');
const path = require('node:path');

const VISUAL3D_HTML = fs.readFileSync(path.join(__dirname, 'visual3d.html'), 'utf8');
const CUBE = '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 22V12M21 7l-9 5-9-5"/>';
const CUBE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + CUBE + '</svg>';


// Weekly Progress: tombol "Lihat 3D" di kartu judul bila proyek yang dibuka punya model 3D.
const WEEKLY_V3D_JS = `<style>.v3d-go{display:inline-flex;align-items:center;gap:7px;margin-top:10px;min-height:38px;padding:0 14px;border-radius:99px;border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.14);color:#fff;font:600 13px/1 Inter,system-ui,sans-serif;text-decoration:none;cursor:pointer;backdrop-filter:blur(4px)}.v3d-go:hover{background:rgba(255,255,255,.24)}.v3d-go svg{width:17px;height:17px}.v3d-go small{opacity:.8;font-weight:600}</style>
<script>(function(){
  var M=null,busy=false;function key(v){return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'')}
  function sync(){
    var el=document.getElementById('weeklyProjectName');if(!el||!M)return;
    var k=key(el.textContent),p=M.projects.filter(function(x){return key(x.id)===k||key(x.name)===k})[0];
    var ms=p?M.models.filter(function(m){return m.pid===p.id}):[];
    var host=el.closest('.hero')&&el.closest('.hero').firstElementChild;if(!host)return;
    var b=host.querySelector('.v3d-go');
    if(!ms.length){if(b)b.remove();return}
    if(!b){b=document.createElement('a');b.className='v3d-go';host.appendChild(b)}
    b.href='/app?page=visual3d&project='+encodeURIComponent(p.id)+'&model='+ms[0].id;b.target='_top';
    b.innerHTML='${CUBE_SVG.replace(/"/g, '\\"')}Lihat model 3D'+(ms.length>1?' <small>· '+ms.length+' model</small>':'');
  }
  function start(){
    if(busy)return;busy=true;
    fetch('/api/model3d',{credentials:'same-origin'}).then(function(r){return r.json()}).then(function(j){if(j&&j.ok){M=j.data;sync();var el=document.getElementById('weeklyProjectName');if(el)new MutationObserver(sync).observe(el,{childList:true,characterData:true,subtree:true})}}).catch(function(){});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();</script>
`;

const GS_PATCHES = [
  {
    file: 'Code',
    find: "  if (page === 'live') {",
    replace: "  if (page === 'visual3d') {\n" +
      "    const template = HtmlService.createTemplateFromFile('Visual3D');\n" +
      "    template.appUrl = ScriptApp.getService().getUrl();\n" +
      "    template.initialProjectName = e && e.parameter ? (e.parameter.project || '') : '';\n" +
      "    template.initialModel = e && e.parameter ? (e.parameter.model || '') : '';\n" +
      "    return withFavicon_(template.evaluate())\n" +
      "      .setTitle(APP_TITLE + ' — Visual 3D Proyek')\n" +
      "      .addMetaTag('viewport', 'width=device-width, initial-scale=1');\n" +
      "  }\n" +
      "  if (page === 'live') {",
  },
];

const HTML_PATCHES = [
  { file: 'Dashboard', find: '</body>', replace: WEEKLY_V3D_JS + '</body>' },
  {
    // Sidebar: tombol "Visual 3D Proyek" tepat setelah Live View CCTV (kelompok Dokumen & Lapangan).
    file: 'AccountMenu',
    find: "      buckets.m2.push(liveBtn);\n    }\n",
    replace: "      buckets.m2.push(liveBtn);\n    }\n" +
      "    (function(){var r='';try{var vu=JSON.parse(sessionStorage.getItem('pmoUser')||'null');r=String(vu&&vu.role||'').trim().toUpperCase()}catch(e){}if(r==='KONTRAKTOR')return;\n" +
      "      var vb=document.createElement('button');vb.type='button';vb.className='nav';vb.setAttribute('title','Visual 3D Proyek');\n" +
      "      vb.innerHTML='<i class=\"ic\">" + CUBE_SVG.replace(/'/g, "\\'") + "</i><span>Visual 3D Proyek</span>';\n" +
      "      vb.onclick=function(){window.pmoGoWithProject('visual3d')};\n" +
      "      var at=-1;buckets.m2.forEach(function(x,i){if(/Live View/i.test(String(x.getAttribute&&x.getAttribute('title')||x.textContent||'')))at=i});\n" +
      "      buckets.m2.splice(at+1,0,vb)})();\n",
  },
  {
    // Menu halaman (ponsel / menu akun).
    file: 'AccountMenu',
    find: "['live','Live View CCTV','cam']]});",
    replace: "['live','Live View CCTV','cam'],['visual3d','Visual 3D Proyek','cube','Model 3D per proyek']]});",
  },
  {
    file: 'AccountMenu',
    find: "  var I={book:",
    replace: "  var I={cube:'" + CUBE + "',book:",
  },
];

module.exports = { VISUAL3D_HTML, GS_PATCHES, HTML_PATCHES };

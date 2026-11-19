'use strict';

/**
 * Patch pratinjau dokumen (Dashboard, Epcc, ExecutiveDashboard, InputProgress):
 * 1. Menambahkan tombol Muat Ulang di header modal pratinjau.
 * 2. Menggunakan proxy PDF/gambar server-side (/api/drive/preview-pdf/:id) untuk file Google
 *    Drive/Docs/Slides/Sheets agar tidak terkena error third-party cookie, dengan fallback otomatis
 *    ke /preview Google jika file tidak terjangkau akun Google server atau berupa video/non-PDF.
 */

const FILES = ['Dashboard', 'Epcc', 'ExecutiveDashboard', 'InputProgress'];

const DRIVE_PREVIEW_PATCHES = [];

for (const file of FILES) {
  DRIVE_PREVIEW_PATCHES.push(
    {
      file,
      find:
        "    if(h==='drive.google.com'){\n" +
        "      if((m=p.match(/\\/file\\/d\\/([^/]+)/)))return {src:'https://drive.google.com/file/d/'+enc(m[1])+'/preview',refit:true};\n" +
        "      if((m=p.match(/\\/folders\\/([^/?#]+)/)))return {src:'https://drive.google.com/embeddedfolderview?id='+enc(m[1])+'#grid'};\n" +
        "      id=u.searchParams.get('id');if(id)return {src:'https://drive.google.com/file/d/'+enc(id)+'/preview',refit:true};\n" +
        "      return null;\n" +
        "    }\n" +
        "    if(h==='docs.google.com'){\n" +
        "      if((m=p.match(/^\\/(document|spreadsheets|presentation|drawings)\\/d\\/([^/]+)/)))return {src:'https://docs.google.com/'+m[1]+'/d/'+enc(m[2])+'/preview'};\n" +
        "      if((m=p.match(/^\\/file\\/d\\/([^/]+)/)))return {src:'https://drive.google.com/file/d/'+enc(m[1])+'/preview',refit:true};\n" +
        "      return null;\n" +
        "    }",
      replace:
        "    if(h==='drive.google.com'){\n" +
        "      if((m=p.match(/\\/file\\/d\\/([^/]+)/)))return {src:'https://drive.google.com/file/d/'+enc(m[1])+'/preview',refit:true,driveId:m[1]};\n" +
        "      if((m=p.match(/\\/folders\\/([^/?#]+)/)))return {src:'https://drive.google.com/embeddedfolderview?id='+enc(m[1])+'#grid'};\n" +
        "      id=u.searchParams.get('id');if(id)return {src:'https://drive.google.com/file/d/'+enc(id)+'/preview',refit:true,driveId:id};\n" +
        "      return null;\n" +
        "    }\n" +
        "    if(h==='docs.google.com'){\n" +
        "      if((m=p.match(/^\\/(document|spreadsheets|presentation|drawings)\\/d\\/([^/]+)/)))return {src:'https://docs.google.com/'+m[1]+'/d/'+enc(m[2])+'/preview',driveId:m[2]};\n" +
        "      if((m=p.match(/^\\/file\\/d\\/([^/]+)/)))return {src:'https://drive.google.com/file/d/'+enc(m[1])+'/preview',refit:true,driveId:m[1]};\n" +
        "      return null;\n" +
        "    }",
    },
    {
      file,
      find:
        'wrap.innerHTML=\'<div class="pv-box" role="dialog" aria-modal="true" aria-labelledby="pvTitle"><div class="pv-head"><div class="pv-title"><small id="pvSub"></small><b id="pvTitle"></b></div><a class="pv-btn" id="pvOpen" target="_blank" rel="noopener" title="Buka di tab baru">\'+SV.ext+\'<span class="pv-lbl">Buka di tab baru</span></a><button type="button" class="pv-btn pv-x" id="pvClose" title="Tutup pratinjau" aria-label="Tutup pratinjau">\'+SV.x+\'</button></div><div class="pv-body" id="pvBody"></div><div class="pv-foot" id="pvFoot"></div></div>\';\n' +
        "    document.body.appendChild(wrap);body=wrap.querySelector('#pvBody');\n" +
        "    wrap.addEventListener('click',function(e){if(e.target===wrap)close()});\n" +
        "    wrap.querySelector('#pvClose').addEventListener('click',close);",
      replace:
        'wrap.innerHTML=\'<div class="pv-box" role="dialog" aria-modal="true" aria-labelledby="pvTitle"><div class="pv-head"><div class="pv-title"><small id="pvSub"></small><b id="pvTitle"></b></div><button type="button" class="pv-btn" id="pvReload" title="Muat ulang pratinjau">&#8635;<span class="pv-lbl">Muat ulang</span></button><a class="pv-btn" id="pvOpen" target="_blank" rel="noopener" title="Buka di tab baru">\'+SV.ext+\'<span class="pv-lbl">Buka di tab baru</span></a><button type="button" class="pv-btn pv-x" id="pvClose" title="Tutup pratinjau" aria-label="Tutup pratinjau">\'+SV.x+\'</button></div><div class="pv-body" id="pvBody"></div><div class="pv-foot" id="pvFoot"></div></div>\';\n' +
        "    document.body.appendChild(wrap);body=wrap.querySelector('#pvBody');\n" +
        "    wrap.addEventListener('click',function(e){if(e.target===wrap)close()});\n" +
        "    wrap.querySelector('#pvReload').addEventListener('click',function(){if(cur)load()});\n" +
        "    wrap.querySelector('#pvClose').addEventListener('click',close);",
    },
    {
      file,
      find:
        "    msg('<div class=\"pv-spin\" aria-hidden=\"true\"></div><span>Memuat pratinjau…</span>');\n" +
        "    var f=document.createElement('iframe');f.title='Pratinjau dokumen';f.setAttribute('allow','autoplay; encrypted-media; fullscreen');f.setAttribute('allowfullscreen','');\n" +
        "    f.onload=function(){f.style.background='#fff';var m=body.querySelector('.pv-msg');if(m)m.remove()};\n" +
        "    f.src=cur.src;body.appendChild(f);",
      replace:
        "    msg('<div class=\"pv-spin\" aria-hidden=\"true\"></div><span>Memuat pratinjau…</span>');\n" +
        "    if(cur.driveId){\n" +
        "      var mineD=cur,pUrl='/api/drive/preview-pdf/'+enc(cur.driveId);\n" +
        "      fetch(pUrl+'?check=1',{credentials:'same-origin'}).then(function(r){return r.ok?r.json():null}).then(function(j){\n" +
        "        if(cur!==mineD)return;\n" +
        "        if(j&&j.ok){\n" +
        "          if(j.kind==='image'){body.innerHTML='';var im=new Image();im.alt=j.name||'';im.src=pUrl;body.appendChild(im);return}\n" +
        "          frame(pUrl);return;\n" +
        "        }\n" +
        "        frame(mineD.src);\n" +
        "      }).catch(function(){if(cur===mineD)frame(mineD.src)});\n" +
        "      return;\n" +
        "    }\n" +
        "    frame(cur.src);",
    }
  );
}

module.exports = { DRIVE_PREVIEW_PATCHES };

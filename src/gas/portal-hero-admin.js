'use strict';

/**
 * Patch urutan kustom & cache lokal gambar untuk Hero Banner halaman Portal.
 *   - portalHeroPhotos_() membaca Script Property PORTAL_HERO_ORDER dan menyertakan versi timestamp `ver`.
 *   - Portal.html memuat foto hero banner Portal via `/media/hero/:id?v=<ver>` agar cepat dari cache server.
 */

const GS_PATCHES = [
  {
    file: 'Code',
    find: `function portalHeroPhotos_() {
  const cache = CacheService.getScriptCache(), key = 'portalHero:v2';
  try { const c = cache.get(key); if (c) return JSON.parse(c); } catch (e) {}
  let out = [];
  try {
    const id = PropertiesService.getScriptProperties().getProperty('PORTAL_HERO_FOLDER') || PORTAL_HERO_FOLDER_;
    const it = DriveApp.getFolderById(id).getFiles();
    while (it.hasNext()) {
      const f = it.next();
      if (!/^image\\//.test(f.getMimeType())) continue;
      out.push({ id: f.getId(), caption: String(f.getDescription() || '').trim(), t: f.getLastUpdated().getTime() });
    }
    out.sort(function(a, b) { return b.t - a.t; });
    out = out.slice(0, 12).map(function(x) { return { id: x.id, caption: x.caption }; });
  } catch (e) { out = []; }
  try { cache.put(key, JSON.stringify(out), 1800); } catch (e) {}
  return out;
}`,
    replace: `function portalHeroPhotos_() {
  const cache = CacheService.getScriptCache(), key = 'portalHero:v2';
  try { const c = cache.get(key); if (c) return JSON.parse(c); } catch (e) {}
  let out = [];
  try {
    const props = PropertiesService.getScriptProperties();
    const id = props.getProperty('PORTAL_HERO_FOLDER') || PORTAL_HERO_FOLDER_;
    let order = [];
    try {
      const rawOrder = JSON.parse(props.getProperty('PORTAL_HERO_ORDER') || '[]');
      if (Array.isArray(rawOrder)) order = rawOrder;
    } catch (e) {}
    const rank = {};
    order.forEach(function(fid, i) { if (rank[fid] === undefined) rank[fid] = i; });
    const it = DriveApp.getFolderById(id).getFiles();
    while (it.hasNext()) {
      const f = it.next();
      if (!/^image\\//.test(f.getMimeType())) continue;
      out.push({ id: f.getId(), caption: String(f.getDescription() || '').trim(), t: f.getLastUpdated().getTime() });
    }
    out.sort(function(a, b) {
      const ra = rank[a.id] !== undefined ? rank[a.id] : 1e9;
      const rb = rank[b.id] !== undefined ? rank[b.id] : 1e9;
      if (ra !== rb) return ra - rb;
      return b.t - a.t;
    });
    out = out.slice(0, 12).map(function(x) { return { id: x.id, caption: x.caption, ver: Math.floor(x.t / 1000) }; });
  } catch (e) { out = []; }
  try { cache.put(key, JSON.stringify(out), 1800); } catch (e) {}
  return out;
}`,
  },
];

const HTML_PATCHES = [
  {
    file: 'Portal',
    find: "function heroPhotos(items){\n  const list=(items||[]).filter(function(i){return i.banner}).map(function(i){return {banner:i.banner,cap:i.caption!=null?i.caption:pmoProjName(i.name)}});const bg=$('heroBg');if(!list.length||!bg)return;\n  bg.innerHTML=list.map(function(i,k){return '<div'+(k===0?' class=\"on\"':'')+' style=\"background-image:url(\\''+thumb(i.banner)+'\\')\"></div>'}).join('');",
    replace: "function heroUrl(i){return i.local?('/media/hero/'+encodeURIComponent(i.banner)+(i.ver?'?v='+encodeURIComponent(i.ver):'')):thumb(i.banner)}\nfunction heroPhotos(items){\n  const list=(items||[]).filter(function(i){return i.banner}).map(function(i){return {banner:i.banner,ver:i.ver||0,local:!!i.local,cap:i.caption!=null?i.caption:pmoProjName(i.name)}});const bg=$('heroBg');if(!list.length||!bg)return;\n  bg.innerHTML=list.map(function(i,k){return '<div'+(k===0?' class=\"on\"':'')+' style=\"background-image:url(\\''+heroUrl(i)+'\\')\"></div>'}).join('');",
  },
  {
    file: 'Portal',
    find: "heroPhotos(d.heroPhotos&&d.heroPhotos.length?d.heroPhotos.map(function(x){return {banner:x.id,caption:x.caption||''}}):b.items);",
    replace: "heroPhotos(d.heroPhotos&&d.heroPhotos.length?d.heroPhotos.map(function(x){return {banner:x.id,caption:x.caption||'',ver:x.ver||0,local:true}}):b.items);",
  },
];

module.exports = { GS_PATCHES, HTML_PATCHES };

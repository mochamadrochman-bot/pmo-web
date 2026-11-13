'use strict';

/**
 * Pengganti DriveApp dan UrlFetchApp untuk kode lama, memakai Google Drive API v3
 * atas nama akun Google yang dihubungkan Admin (src/google/auth.js).
 */

const { requestSync, requestAllSync } = require('../google/sync-http');
const gauth = require('../google/auth');

const FIELDS = 'id,name,mimeType,size,webViewLink,webContentLink,description,modifiedTime,createdTime,trashed,thumbnailLink,parents,owners(emailAddress,displayName),iconLink';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
// Bisa diarahkan ke server tiruan saat pengujian.
const API = process.env.GOOGLE_DRIVE_API || 'https://www.googleapis.com/drive/v3';
const UPLOAD = process.env.GOOGLE_DRIVE_UPLOAD || 'https://www.googleapis.com/upload/drive/v3';

const Access = { ANYONE: 'ANYONE', ANYONE_WITH_LINK: 'ANYONE_WITH_LINK', DOMAIN: 'DOMAIN', DOMAIN_WITH_LINK: 'DOMAIN_WITH_LINK', PRIVATE: 'PRIVATE' };
const Permission = { VIEW: 'VIEW', EDIT: 'EDIT', COMMENT: 'COMMENT', NONE: 'NONE', OWNER: 'OWNER', ORGANIZER: 'ORGANIZER', FILE_ORGANIZER: 'FILE_ORGANIZER' };

const READONLY_MSG = 'Server baru masih dalam mode baca-saja: unggah, ubah, atau hapus file Drive dilakukan lewat aplikasi lama dulu.';
function guardWrite() {
  if (require('./store').readOnly()) throw new Error(READONLY_MSG);
}

function makeDrive(Blob) {
  function call(method, path, opts) {
    const o = opts || {};
    const q = new URLSearchParams(Object.assign({ supportsAllDrives: 'true' }, o.query || {}));
    const url = (o.upload ? UPLOAD : API) + path + '?' + q.toString();
    const headers = Object.assign({ Authorization: 'Bearer ' + gauth.accessTokenSync() }, o.headers || {});
    let body = o.body;
    if (body !== undefined && !Buffer.isBuffer(body) && typeof body !== 'string') {
      body = JSON.stringify(body);
      headers['content-type'] = 'application/json';
    }
    const r = requestSync({ url, method, headers, body, timeoutMs: o.timeoutMs || 60000 });
    if (r.status === 204) return null;
    if (r.status >= 400) {
      let msg = '';
      try { msg = JSON.parse(r.body.toString('utf8')).error.message; } catch (e) { msg = r.body.toString('utf8').slice(0, 200); }
      if (r.status === 404) throw new Error('File atau folder Drive tidak ditemukan, atau akun tidak punya akses (' + path.split('/')[2] + ').');
      throw new Error('Google Drive menolak (' + r.status + '): ' + msg);
    }
    if (o.raw) return r;
    const text = r.body.toString('utf8');
    return text ? JSON.parse(text) : null;
  }

  // ------------------------------------------------------------ iterator
  function iterator(query, wrap, pageToken) {
    let buf = [];
    let next = pageToken || undefined;
    let done = false;
    let started = false;
    const fill = () => {
      while (!buf.length && !done) {
        const res = call('GET', '/files', {
          query: { q: query, fields: 'nextPageToken,files(' + FIELDS + ')', pageSize: '200', includeItemsFromAllDrives: 'true', ...(next ? { pageToken: next } : {}) },
        });
        started = true;
        buf = (res.files || []).map(wrap);
        next = res.nextPageToken;
        if (!next) done = true;
      }
    };
    return {
      hasNext() { fill(); return buf.length > 0; },
      next() { fill(); if (!buf.length) throw new Error('Tidak ada item berikutnya.'); return buf.shift(); },
      getContinuationToken() { return started ? next || '' : pageToken || ''; },
    };
  }
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  // ------------------------------------------------------------ item dasar
  class Item {
    constructor(meta) { this._m = meta; }
    _refresh() { this._m = call('GET', '/files/' + this._m.id, { query: { fields: FIELDS } }); return this; }
    _patch(body, query) { this._m = call('PATCH', '/files/' + this._m.id, { body, query: Object.assign({ fields: FIELDS }, query || {}) }); return this; }
    getId() { return this._m.id; }
    getName() { return this._m.name; }
    setName(n) { guardWrite(); return this._patch({ name: String(n) }); }
    getDescription() { return this._m.description || null; }
    setDescription(d) { guardWrite(); return this._patch({ description: String(d || '') }); }
    getUrl() { return this._m.webViewLink || ('https://drive.google.com/open?id=' + this._m.id); }
    getLastUpdated() { return new Date(this._m.modifiedTime); }
    getDateCreated() { return new Date(this._m.createdTime); }
    isTrashed() { return !!this._m.trashed; }
    setTrashed(t) { guardWrite(); return this._patch({ trashed: !!t }); }
    getOwner() {
      const o = (this._m.owners || [])[0];
      return o ? { getEmail: () => o.emailAddress || '', getName: () => o.displayName || '' } : null;
    }
    getEditors() { return []; }
    getViewers() { return []; }
    getParents() {
      const ids = this._m.parents || [];
      let i = 0;
      return { hasNext: () => i < ids.length, next: () => getFolderById(ids[i++]) };
    }
    moveTo(folder) {
      guardWrite();
      const remove = (this._m.parents || []).join(',');
      return this._patch({}, { addParents: folder.getId(), removeParents: remove });
    }
    _permissions() {
      const r = call('GET', '/files/' + this._m.id + '/permissions', { query: { fields: 'permissions(id,type,role,allowFileDiscovery,domain)' } });
      return r.permissions || [];
    }
    getSharingAccess() {
      const p = this._permissions();
      const anyone = p.find((x) => x.type === 'anyone');
      if (anyone) return anyone.allowFileDiscovery ? Access.ANYONE : Access.ANYONE_WITH_LINK;
      const dom = p.find((x) => x.type === 'domain');
      if (dom) return dom.allowFileDiscovery ? Access.DOMAIN : Access.DOMAIN_WITH_LINK;
      return Access.PRIVATE;
    }
    getSharingPermission() {
      const p = this._permissions().find((x) => x.type === 'anyone' || x.type === 'domain');
      if (!p) return Permission.NONE;
      return p.role === 'writer' ? Permission.EDIT : p.role === 'commenter' ? Permission.COMMENT : Permission.VIEW;
    }
    setSharing(access, permission) {
      guardWrite();
      const existing = this._permissions().filter((x) => x.type === 'anyone' || x.type === 'domain');
      existing.forEach((x) => call('DELETE', '/files/' + this._m.id + '/permissions/' + x.id));
      if (access === Access.ANYONE || access === Access.ANYONE_WITH_LINK) {
        const role = permission === Permission.EDIT ? 'writer' : permission === Permission.COMMENT ? 'commenter' : 'reader';
        call('POST', '/files/' + this._m.id + '/permissions', { body: { type: 'anyone', role, allowFileDiscovery: access === Access.ANYONE } });
      }
      return this;
    }
    addViewer() { return this; }
    addEditor() { return this; }
  }

  class DFile extends Item {
    getMimeType() { return this._m.mimeType; }
    getSize() { return Number(this._m.size || 0); }
    getDownloadUrl() { return this._m.webContentLink || ''; }
    getBlob() {
      if (/^application\/vnd\.google-apps\./.test(this._m.mimeType)) return this.getAs('application/pdf');
      const r = call('GET', '/files/' + this._m.id, { query: { alt: 'media' }, raw: true, timeoutMs: 120000 });
      return new Blob(r.body, this._m.mimeType, this._m.name);
    }
    getAs(mime) {
      if (/^application\/vnd\.google-apps\./.test(this._m.mimeType)) {
        const r = call('GET', '/files/' + this._m.id + '/export', { query: { mimeType: mime }, raw: true, timeoutMs: 120000 });
        return new Blob(r.body, mime, this._m.name);
      }
      return this.getBlob();
    }
    getThumbnail() {
      const link = this._m.thumbnailLink || this._refresh()._m.thumbnailLink;
      if (!link) return null;
      const r = requestSync({ url: link, headers: { Authorization: 'Bearer ' + gauth.accessTokenSync() } });
      return r.status === 200 ? new Blob(r.body, r.headers['content-type'] || 'image/jpeg', this._m.name) : null;
    }
    makeCopy(name, folder) {
      guardWrite();
      if (name && typeof name === 'object') { folder = name; name = undefined; }
      const body = {};
      if (name) body.name = String(name);
      if (folder) body.parents = [folder.getId()];
      return new DFile(call('POST', '/files/' + this._m.id + '/copy', { body, query: { fields: FIELDS } }));
    }
    setContent(text) {
      guardWrite();
      this._m = call('PATCH', '/files/' + this._m.id, { upload: true, query: { uploadType: 'media', fields: FIELDS }, body: Buffer.from(String(text), 'utf8'), headers: { 'content-type': this._m.mimeType || 'text/plain' } });
      return this;
    }
  }

  class DFolder extends Item {
    getFiles() { return iterator(`'${esc(this._m.id)}' in parents and trashed = false and mimeType != '${FOLDER_MIME}'`, (m) => new DFile(m)); }
    getFolders() { return iterator(`'${esc(this._m.id)}' in parents and trashed = false and mimeType = '${FOLDER_MIME}'`, (m) => new DFolder(m)); }
    getFilesByName(n) { return iterator(`'${esc(this._m.id)}' in parents and trashed = false and mimeType != '${FOLDER_MIME}' and name = '${esc(n)}'`, (m) => new DFile(m)); }
    getFoldersByName(n) { return iterator(`'${esc(this._m.id)}' in parents and trashed = false and mimeType = '${FOLDER_MIME}' and name = '${esc(n)}'`, (m) => new DFolder(m)); }
    getFilesByType(t) { return iterator(`'${esc(this._m.id)}' in parents and trashed = false and mimeType = '${esc(t)}'`, (m) => new DFile(m)); }
    searchFiles(q) { return iterator(`'${esc(this._m.id)}' in parents and (${q})`, (m) => new DFile(m)); }
    createFolder(name) { return createFolderIn(this._m.id, name); }
    createFile(a, b, c) { return createFileIn(this._m.id, a, b, c); }
    addFile(f) { f.moveTo(this); return this; }
    removeFile() { return this; }
  }

  function getMeta(id) {
    if (!id) throw new Error('ID Drive kosong.');
    return call('GET', '/files/' + encodeURIComponent(String(id)), { query: { fields: FIELDS } });
  }
  function getFileById(id) { return new DFile(getMeta(id)); }
  function getFolderById(id) {
    const m = getMeta(id);
    if (m.mimeType !== FOLDER_MIME) throw new Error('ID ' + id + ' bukan folder Drive.');
    return new DFolder(m);
  }
  function createFolderIn(parentId, name) {
    guardWrite();
    const body = { name: String(name), mimeType: FOLDER_MIME };
    if (parentId) body.parents = [parentId];
    return new DFolder(call('POST', '/files', { body, query: { fields: FIELDS } }));
  }
  function createFileIn(parentId, a, b, c) {
    guardWrite();
    let blob;
    if (a && typeof a === 'object' && typeof a.getBytes === 'function') blob = a.getBlob ? a.getBlob() : a;
    else blob = new Blob(String(b === undefined ? '' : b), c || 'text/plain', String(a));
    const meta = { name: blob.getName() || 'untitled' };
    if (parentId) meta.parents = [parentId];
    const boundary = 'pmo' + Date.now().toString(36);
    const type = blob.getContentType() || 'application/octet-stream';
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\ncontent-type: ${type}\r\n\r\n`),
      blob._buf,
      Buffer.from(`\r\n--${boundary}--`),
    ]);
    return new DFile(call('POST', '/files', {
      upload: true, query: { uploadType: 'multipart', fields: FIELDS }, body,
      headers: { 'content-type': 'multipart/related; boundary=' + boundary }, timeoutMs: 120000,
    }));
  }

  const DriveApp = {
    getFileById,
    getFolderById,
    createFolder: (name) => createFolderIn(null, name),
    createFile: (a, b, c) => createFileIn(null, a, b, c),
    getRootFolder: () => getFolderById('root'),
    getFilesByName: (n) => iterator(`name = '${esc(n)}' and trashed = false and mimeType != '${FOLDER_MIME}'`, (m) => new DFile(m)),
    getFoldersByName: (n) => iterator(`name = '${esc(n)}' and trashed = false and mimeType = '${FOLDER_MIME}'`, (m) => new DFolder(m)),
    searchFiles: (q) => iterator(q, (m) => new DFile(m)),
    continueFileIterator: (t) => { throw new Error('continueFileIterator belum didukung.'); },
    Access,
    Permission,
  };

  // ------------------------------------------------------------ UrlFetchApp
  function toRequest(url, params) {
    const p = params || {};
    const headers = Object.assign({}, p.headers || {});
    let body;
    if (p.payload !== undefined && p.payload !== null) {
      const pl = p.payload;
      if (pl && typeof pl.getBytes === 'function') { body = (pl.getBlob ? pl.getBlob() : pl)._buf; if (!p.contentType && pl.getContentType) headers['content-type'] = pl.getContentType(); }
      else if (Array.isArray(pl)) body = Buffer.from(Uint8Array.from(pl, (x) => x & 0xff));
      else if (typeof pl === 'object') { body = new URLSearchParams(pl).toString(); headers['content-type'] = headers['content-type'] || 'application/x-www-form-urlencoded'; }
      else body = String(pl);
    }
    if (p.contentType) headers['content-type'] = p.contentType;
    return {
      url: String(url),
      method: (p.method || (body !== undefined ? 'POST' : 'GET')).toUpperCase(),
      headers, body, timeoutMs: 60000,
      followRedirects: p.followRedirects !== false,
      mute: !!p.muteHttpExceptions,
    };
  }
  function toResponse(req, r) {
    if (r.error) throw new Error('Permintaan ke ' + req.url.split('?')[0] + ' gagal: ' + r.error);
    const resp = {
      getResponseCode: () => r.status,
      getContentText: (cs) => r.body.toString(cs && /16/.test(cs) ? 'utf16le' : 'utf8'),
      getContent: () => Array.from(new Int8Array(r.body.buffer, r.body.byteOffset, r.body.length)),
      getBlob: () => new Blob(r.body, (r.headers['content-type'] || 'application/octet-stream').split(';')[0]),
      getAs: () => resp.getBlob(),
      getHeaders: () => Object.assign({}, r.headers),
      getAllHeaders: () => Object.assign({}, r.headers),
    };
    if (!req.mute && r.status >= 400) {
      throw new Error('Request failed for ' + req.url.split('?')[0] + ' returned code ' + r.status + '. Truncated server response: ' + r.body.toString('utf8').slice(0, 300));
    }
    return resp;
  }
  const UrlFetchApp = {
    fetch(url, params) {
      const req = toRequest(url, params);
      const [r] = requestAllSync([req]);
      return toResponse(req, r);
    },
    fetchAll(list) {
      const reqs = (list || []).map((x) => (typeof x === 'string' ? toRequest(x, {}) : toRequest(x.url, x)));
      const out = [];
      for (let i = 0; i < reqs.length; i += 20) {
        const chunk = reqs.slice(i, i + 20);
        requestAllSync(chunk).forEach((r, j) => out.push(toResponse(chunk[j], r)));
      }
      return out;
    },
    getRequest(url, params) { const r = toRequest(url, params); return { url: r.url, method: r.method, headers: r.headers, payload: r.body }; },
  };

  return { DriveApp, UrlFetchApp };
}

module.exports = { makeDrive, Access, Permission };

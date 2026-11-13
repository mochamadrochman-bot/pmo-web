/**
 * LIVE VIEW LAPANGAN (CCTV)
 * Daftar kamera disimpan di sheet "CCTV" (dibuat otomatis).
 * Semua pengguna yang login dapat melihat; hanya ADMIN yang dapat menambah/mengubah/menghapus kamera.
 *
 * JENIS kamera:
 *   HLS     : alamat siaran .m3u8 (server streaming IT, HTTPS + CORS)
 *   YOUTUBE : tautan video/siaran YouTube
 *   EMBED   : halaman pemutar yang boleh disematkan (iframe)
 *   GAMBAR  : alamat foto/snapshot kamera (dimuat ulang berkala)
 *   TAUTAN  : halaman yang tidak bisa disematkan, dibuka di tab baru
 */
const LIVE_CONFIG = {
  SHEET: 'CCTV',
  HEADERS: ['ID', 'PROYEK_ID', 'NAMA_KAMERA', 'LOKASI', 'JENIS', 'URL', 'AKTIF', 'URUTAN', 'CATATAN', 'DIPERBARUI_OLEH', 'DIPERBARUI'],
  TYPES: ['HLS', 'YOUTUBE', 'EMBED', 'GAMBAR', 'TAUTAN'],
  DEMO_ID: 'DEMO',
  DEMO_CAMERAS: [
    { name: 'Vancouver Harbour (siaran publik)', location: 'Pelabuhan Vancouver, Kanada · bukan lokasi proyek', type: 'YOUTUBE',
      url: 'https://www.youtube.com/watch?v=DhkGXCgqWjg', note: 'Siaran langsung publik di YouTube, dipakai sebagai contoh tampilan kamera pelabuhan.' },
    { name: 'Victoria Harbour (siaran publik)', location: 'Pelabuhan Victoria, Kanada · bukan lokasi proyek', type: 'YOUTUBE',
      url: 'https://www.youtube.com/watch?v=Bf1W-IOVg5E', note: 'Siaran langsung publik CHEK News di YouTube, dipakai sebagai contoh.' },
    { name: 'Uji pemutar HLS (rekaman)', location: 'Stream uji publik Mux · bukan lokasi proyek', type: 'HLS',
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', note: 'Rekaman uji format HLS, format yang sama dengan server streaming IT nanti.' },
    { name: 'Port of Los Angeles (EarthCam)', location: 'Pelabuhan Los Angeles, AS · bukan lokasi proyek', type: 'TAUTAN',
      url: 'https://www.earthcam.com/usa/california/losangeles/port/?cam=portofla', note: 'Kamera publik pelabuhan, dibuka di halaman EarthCam.' }
  ]
};

/** Data halaman Live View. */
function getLiveViewData(token) {
  const user = requireUser_(token);
  ktrBlock_(user);
  const db = loadDb_();
  const projects = (db.allProjects || db.projects).map(function(p) {
    return { id: p.id, name: p.name, fullName: p.fullName || p.name };
  });
  const role = String(user.role || '').toUpperCase();
  return {
    success: true,
    user: { name: user.name || user.username || '', username: user.username || '', role: role, project: user.project || '' },
    canManage: role === 'ADMIN',
    projects: projects,
    cameras: readCameras_(),
    types: LIVE_CONFIG.TYPES,
    demoId: LIVE_CONFIG.DEMO_ID
  };
}

/** Tambah / ubah kamera (ADMIN). */
function saveCamera(token, cam) {
  const user = requireLiveAdmin_(token);
  cam = cam || {};
  const name = String(cam.name || '').trim();
  const type = String(cam.type || '').trim().toUpperCase();
  const url = String(cam.url || '').trim();
  const projectId = String(cam.projectId || '').trim();
  if (!projectId) throw new Error('Pilih proyek untuk kamera ini.');
  if (!name) throw new Error('Nama kamera wajib diisi.');
  if (LIVE_CONFIG.TYPES.indexOf(type) < 0) throw new Error('Jenis kamera tidak dikenal.');
  if (!/^https:\/\/[^\s]+$/i.test(url)) throw new Error('Alamat kamera harus diawali https:// (browser memblokir alamat http).');
  if (type === 'YOUTUBE' && !youtubeId_(url)) throw new Error('Tautan YouTube tidak dikenali.');
  const order = cam.order === '' || cam.order === null || cam.order === undefined ? '' : Number(cam.order);

  const lock = pmoLock_('LIVE');
  lock.waitLock(20000);
  try {
    const sh = cameraSheet_();
    const values = sh.getDataRange().getValues();
    const head = values[0].map(function(h) { return String(h).trim().toUpperCase(); });
    const col = function(k) { return head.indexOf(k); };
    let row = -1;
    const id = String(cam.id || '').trim();
    if (id) {
      for (let r = 1; r < values.length; r++) if (String(values[r][col('ID')]) === id) { row = r + 1; break; }
      if (row < 0) throw new Error('Kamera tidak ditemukan. Muat ulang halaman.');
    }
    const record = {
      ID: id || Utilities.getUuid().slice(0, 8).toUpperCase(),
      PROYEK_ID: projectId,
      NAMA_KAMERA: name,
      LOKASI: String(cam.location || '').trim(),
      JENIS: type,
      URL: url,
      AKTIF: cam.active === false ? 'TIDAK' : 'YA',
      URUTAN: isFinite(order) ? order : '',
      CATATAN: String(cam.note || '').trim(),
      DIPERBARUI_OLEH: user.username || user.name || '',
      DIPERBARUI: new Date()
    };
    const line = head.map(function(h) { return record.hasOwnProperty(h) ? record[h] : ''; });
    if (row > 0) sh.getRange(row, 1, 1, line.length).setValues([line]);
    else sh.appendRow(line);
    return { success: true, id: record.ID, cameras: readCameras_() };
  } finally {
    lock.releaseLock();
  }
}

/** Hapus kamera (ADMIN). */
function deleteCamera(token, id) {
  requireLiveAdmin_(token);
  const lock = pmoLock_('LIVE');
  lock.waitLock(20000);
  try {
    const sh = cameraSheet_();
    const values = sh.getDataRange().getValues();
    const c = values[0].map(function(h) { return String(h).trim().toUpperCase(); }).indexOf('ID');
    for (let r = values.length - 1; r >= 1; r--) {
      if (String(values[r][c]) === String(id)) { sh.deleteRow(r + 1); return { success: true, cameras: readCameras_() }; }
    }
    throw new Error('Kamera tidak ditemukan.');
  } finally {
    lock.releaseLock();
  }
}

/** Tambahkan kamera contoh untuk demonstrasi (ADMIN). Tidak menggandakan bila sudah ada. */
function addDemoCameras(token) {
  const user = requireLiveAdmin_(token);
  const existing = readCameras_().map(function(c) { return c.url; });
  LIVE_CONFIG.DEMO_CAMERAS.forEach(function(d, i) {
    if (existing.indexOf(d.url) >= 0) return;
    saveCamera(token, { projectId: LIVE_CONFIG.DEMO_ID, name: d.name, location: d.location, type: d.type, url: d.url, note: d.note, order: i + 1, active: true });
  });
  return { success: true, cameras: readCameras_(), by: user.username };
}

// --- helpers ---
function requireLiveAdmin_(token) {
  const user = requireUser_(token);
  if (String(user.role || '').toUpperCase() !== 'ADMIN') throw new Error('Hanya ADMIN yang dapat mengelola kamera.');
  return user;
}

function cameraSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(LIVE_CONFIG.SHEET);
  if (!sh) {
    sh = ss.insertSheet(LIVE_CONFIG.SHEET);
    sh.getRange(1, 1, 1, LIVE_CONFIG.HEADERS.length).setValues([LIVE_CONFIG.HEADERS])
      .setFontWeight('bold').setBackground('#0F2B46').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readCameras_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(LIVE_CONFIG.SHEET);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const head = values[0].map(function(h) { return String(h).trim().toUpperCase(); });
  const v = function(row, k) { const i = head.indexOf(k); return i < 0 ? '' : row[i]; };
  const list = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const id = String(v(row, 'ID') || '').trim();
    if (!id) continue;
    const type = String(v(row, 'JENIS') || '').trim().toUpperCase();
    const url = String(v(row, 'URL') || '').trim();
    const upd = v(row, 'DIPERBARUI');
    list.push({
      id: id,
      projectId: String(v(row, 'PROYEK_ID') || '').trim(),
      name: String(v(row, 'NAMA_KAMERA') || '').trim(),
      location: String(v(row, 'LOKASI') || '').trim(),
      type: type,
      url: url,
      youtubeId: type === 'YOUTUBE' ? youtubeId_(url) : '',
      active: String(v(row, 'AKTIF') || 'YA').trim().toUpperCase() !== 'TIDAK',
      order: v(row, 'URUTAN') === '' ? null : Number(v(row, 'URUTAN')),
      note: String(v(row, 'CATATAN') || '').trim(),
      updatedText: upd instanceof Date ? formatDateId_(upd) : String(upd || '')
    });
  }
  list.sort(function(a, b) {
    return a.projectId.localeCompare(b.projectId) || ((a.order == null ? 999 : a.order) - (b.order == null ? 999 : b.order)) || a.name.localeCompare(b.name);
  });
  return list;
}

function youtubeId_(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|live\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : '';
}

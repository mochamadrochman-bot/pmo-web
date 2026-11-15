'use strict';

/**
 * Live View · kamera di jaringan internal perusahaan (15 Nov 2026).
 * NVR CCTV berada di LAN pabrik (mis. http://192.168.61.230), sehingga tidak bisa disematkan di dashboard
 * (HTTPS) dan tidak terjangkau dari server. Sementara (pilihan A): jenis "Tautan" boleh memakai
 * http:// KHUSUS untuk alamat jaringan internal (10.x, 172.16–31.x, 192.168.x). Tautan dibuka di tab baru
 * dan hanya berhasil dari komputer/HP yang tersambung ke jaringan internal perusahaan.
 * Solusi tetap (pilihan B): jembatan streaming RTSP → HLS di LAN + Cloudflare Tunnel, memakai jenis HLS.
 */

const LAN_RE_JS = '^http:\\/\\/(10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|192\\.168\\.\\d{1,3}\\.\\d{1,3}|172\\.(1[6-9]|2\\d|3[01])\\.\\d{1,3}\\.\\d{1,3})(:\\d{1,5})?(\\/[^\\s]*)?$';

/** Patch kode .gs (diterapkan saat runtime dimuat). */
const GS_PATCHES = [
  {
    file: 'LiveApi',
    find: "  if (!/^https:\\/\\/[^\\s]+$/i.test(url)) throw new Error('Alamat kamera harus diawali https:// (browser memblokir alamat http).');",
    replace: "  const lanOk = type === 'TAUTAN' && new RegExp('" + LAN_RE_JS.replace(/\\/g, '\\\\') + "', 'i').test(url);\n" +
      "  if (!lanOk && !/^https:\\/\\/[^\\s]+$/i.test(url)) throw new Error('Alamat kamera harus diawali https://. Pengecualian: jenis Tautan boleh http:// untuk alamat jaringan internal (mis. http://192.168.61.230).');",
  },
];

/** Patch halaman LiveView.html. */
const LIVE_HTML_PATCHES = [
  {
    file: 'LiveView',
    find: "function testCam(){const c=formCam();if(!/^https:\\/\\//i.test(c.url)){toast('Isi alamat https:// dulu.');return}",
    replace: "function pmoIsLan(u){return new RegExp(" + JSON.stringify(LAN_RE_JS) + ",'i').test(String(u||''))}" +
      "function testCam(){const c=formCam();if(!/^https:\\/\\//i.test(c.url)&&!(c.type==='TAUTAN'&&pmoIsLan(c.url))){toast('Isi alamat https:// dulu (jenis Tautan boleh http:// untuk alamat jaringan internal).');return}",
  },
  {
    file: 'LiveView',
    find: "st.innerHTML=overlay(c)+'<div class=\"msg\"><div><b>'+esc(c.name)+'</b>Kamera ini dibuka di halaman penyedianya.<br><a href=\"'+esc(c.url)+'\" target=\"_blank\" rel=\"noopener\">Buka tayangan</a></div></div>';",
    replace: "st.innerHTML=overlay(c)+(pmoIsLan(c.url)" +
      "?'<div class=\"msg\"><div><b>'+esc(c.name)+'</b>Kamera ini ada di <b style=\"display:inline\">jaringan internal perusahaan</b> (perekam NVR '+esc(c.url.replace(/^http:\\/\\//,''))+').<br>Buka dari komputer atau HP yang tersambung ke jaringan kantor/pabrik, lalu login dengan akun NVR.<br><a href=\"'+esc(c.url)+'\" target=\"_blank\" rel=\"noopener\">Buka NVR di tab baru</a><br><small style=\"opacity:.75\">Di luar jaringan kantor, halaman ini tidak akan terbuka.</small></div></div>'" +
      ":'<div class=\"msg\"><div><b>'+esc(c.name)+'</b>Kamera ini dibuka di halaman penyedianya.<br><a href=\"'+esc(c.url)+'\" target=\"_blank\" rel=\"noopener\">Buka tayangan</a></div></div>');",
  },
  {
    file: 'LiveView',
    find: "TAUTAN:['Tautan','Halaman kamera yang tidak bisa disematkan. Dibuka di tab baru.']",
    replace: "TAUTAN:['Tautan','Halaman kamera yang tidak bisa disematkan. Dibuka di tab baru. Untuk NVR di jaringan internal boleh memakai http://, mis. http://192.168.61.230 (hanya terbuka dari jaringan kantor).']",
  },
];

module.exports = { GS_PATCHES, LIVE_HTML_PATCHES };

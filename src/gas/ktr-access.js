'use strict';

/**
 * Akun KONTRAKTOR · akses halaman (18 Nov 2026).
 *
 * Kontraktor boleh membuka, khusus proyeknya sendiri:
 *   Portal, Weekly Progress, EPCC Control (E/P/C/C), Live View CCTV, Spotlight Lobby, Visual 3D
 *   (lihat + unggah model; ganti/hapus hanya unggahannya sendiri, lihat routes/model3d.js).
 * Document Control: hanya MoM / risalah rapat proyeknya + status tindak lanjut pihak kontraktor (22 Nov 2026).
 * Tidak boleh: Monthly Executive Review, Master Schedule, Galeri foto, Library,
 *   Pelaporan Manajemen, Input. Menu-menu itu tidak ditampilkan sama sekali untuk kontraktor.
 *
 * Gerbang halaman di server: routes/gas.js (KONTRAKTOR_PAGES). Data tetap dibatasi di server:
 *   - Weekly: getWeeklyProjectData memaksa proyek = PROYEK_ID akun (sudah di Code.gs).
 *   - Spotlight: getExecutiveDashboardData hanya memuat proyek userCanAccess_ (kontraktor = proyeknya).
 *   - Live View: daftar proyek & kamera disaring ke proyeknya (patch di bawah).
 */

/** Patch kode .gs */
const GS_PATCHES = [
  {
    // Live View: kontraktor hanya melihat proyek & kamera proyeknya.
    file: 'LiveApi',
    find: "  ktrBlock_(user);\n  const db = loadDb_();\n  const projects = (db.allProjects || db.projects).map(function(p) {",
    replace: "  const ktrPid = ktrIs_(user) ? normKey_(user.projectId || '') || '-' : '';\n" +
      "  const db = loadDb_();\n" +
      "  const projects = (db.allProjects || db.projects).filter(function(p) { return !ktrPid || normKey_(p.id) === ktrPid; }).map(function(p) {",
  },
  {
    file: 'LiveApi',
    find: "    cameras: readCameras_(),\n    types: LIVE_CONFIG.TYPES,",
    replace: "    cameras: readCameras_().filter(function(c) { return !ktrPid || normKey_(c.projectId) === ktrPid; }),\n    types: LIVE_CONFIG.TYPES,",
  },
  {
    // Spotlight Lobby memakai data Executive; datanya sudah disaring per akun (userCanAccess_).
    // Halaman Executive Dashboard sendiri tetap tertutup untuk kontraktor (gerbang server).
    file: 'Code',
    find: "  const user = requireUser_(token);\n  ktrBlock_(user);\n  const out = execDataCached_(user, requestedPeriod);",
    replace: "  const user = requireUser_(token);\n  const out = execDataCached_(user, requestedPeriod);",
  },
  {
    // Video pembuka Spotlight.
    file: 'WeeklyPrintApi',
    find: "function getSpotlightIntro(token){requireUser_(token);ktrBlock_(requireUser_(token));",
    replace: "function getSpotlightIntro(token){requireUser_(token);",
  },
];

/** Patch halaman HTML lama */
const HTML_PATCHES = [
  {
    // Gerbang sisi browser: halaman yang boleh dibuka + menu samping yang disembunyikan.
    file: 'AccountMenu',
    find: String.raw`  var allowed=/^(Portal Proyek|EPCC Control)/i.test(title);
  var HIDE=/^(Executive Dashboard|Weekly Progress|Master Schedule|Document Control|Library|Pelaporan Manajemen|Input Progress|Laporan Bulanan|Tambah \/ Edit Proyek|Live View|Spotlight)/i;`,
    replace: String.raw`  var allowed=/^(Portal Proyek|EPCC Control|Weekly Progress|Live View|Visual 3D|PMO Spotlight|Document Control|Input Progress Mingguan)/i.test(title);
  var HIDE=/^(Executive Dashboard|Monthly Executive|Master Schedule|Galeri|Library|Pelaporan Manajemen|Management Report|Buat Laporan|Input Progress Bulanan|Input Progress$|Laporan Bulanan|Tambah \/ Edit Proyek)/i;`,
  },
  {
    // Menu halaman (ponsel / menu akun): kelompok khusus kontraktor.
    file: 'AccountMenu',
    find: "    out.push({tag:'M3',t:'EPCC Control',epc:",
    replace: "    if(ktr)out.push({tag:'M1',t:'Dashboard Proyek',items:[['portal','Portal proyek','home'],['weekly','Weekly Progress','trend']]});\n" +
      "    out.push({tag:'M3',t:'EPCC Control',epc:",
  },
  {
    file: 'AccountMenu',
    find: "    if(!ktr&&mr)out.push({tag:'M5'",
    replace: "    if(ktr)out.push({tag:'M4',t:'Lapangan & 3D',items:[['live','Live View CCTV','cam'],['visual3d','Visual 3D Proyek','cube','Model 3D proyek Anda'],['documents','MoM / Risalah rapat','folder','Risalah rapat & tindak lanjut']]});\n" +
      "    if(!ktr&&mr)out.push({tag:'M5'",
  },
  {
    file: 'AccountMenu',
    find: "if(role()==='KONTRAKTOR')tabs=[['portal','Portal','home'],['engineering','EPCC','list']];",
    replace: "if(role()==='KONTRAKTOR')tabs=[['portal','Portal','home'],['weekly','Weekly','trend'],['engineering','EPCC','list']];",
  },
  {
    // Portal lama: tile yang tidak boleh untuk kontraktor; di tile Dashboard hanya Weekly Progress.
    file: 'Portal',
    find: "html.is-ktr #tileDash,html.is-ktr #tileInput,html.is-ktr #tileLive,html.is-ktr #tileDoc,html.is-ktr #tileMr{display:none!important}",
    replace: "html.is-ktr #tileInput,html.is-ktr #tileDoc,html.is-ktr #tileMr{display:none!important}" +
      "html.is-ktr #tileDash .subs button:not([onclick*=\"'weekly'\"]),html.is-ktr .v-util [data-v=\"exec\"]{display:none!important}",
  },
];

module.exports = { GS_PATCHES, HTML_PATCHES };

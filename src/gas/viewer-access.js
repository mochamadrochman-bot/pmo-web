'use strict';

/**
 * Akun USER / VIEWER tanpa EPCC Control (25 Nov 2026).
 *
 * Yang boleh EPCC Control: ADMIN, PIC, INPUT, KONTRAKTOR. Selain itu (role USER / VIEWER):
 *   - menu EPCC Control disembunyikan: menu atas Portal, tile Modul 3, menu samping (grup M3), Ctrl K, menu ponsel;
 *   - halaman EPCC (engineering, epcc, procurement, construction, commissioning) ditolak server (routes/gas.js),
 *     dan fungsi data EPCC (getEpccData, getEngineeringData, …) ditolak di /app/rpc.
 */

const ROLE_JS = "(function(){try{var u=JSON.parse(sessionStorage.getItem('pmoUser')||'null');return String(u&&u.role||'').trim().toUpperCase()}catch(e){return ''}})()";

const GATE = `<style>html.no-epcc [data-mod-grp="m3"],html.no-epcc #tileEpc{display:none!important}</style>
<script>
/* ===== Akun USER / VIEWER: tanpa EPCC Control ===== */
(function(){
  function chk(){var r=${ROLE_JS};if(!r)return false;
    if(['ADMIN','PIC','INPUT','KONTRAKTOR'].indexOf(r)<0){window.__pmoNoEpc=true;document.documentElement.classList.add('no-epcc');
      if(/^EPCC Control/i.test(document.title||''))location.replace('/app?page=portal')}
    return true}
  var n=0;(function t(){if(!chk()&&++n<20)setTimeout(t,250)})();
})();
</script>
`;

const HTML_PATCHES = [
  { file: 'AccountMenu', find: '<script>\n/* ===== Akun KONTRAKTOR:', replace: GATE + '<script>\n/* ===== Akun KONTRAKTOR:' },
  { file: 'AccountMenu', find: "    out.push({tag:'M3',t:'EPCC Control',epc:", replace: "    if(!window.__pmoNoEpc)out.push({tag:'M3',t:'EPCC Control',epc:" },
  { file: 'Portal', find: "$('tileInput').hidden=!canInput;",
    replace: "$('tileInput').hidden=!canInput;$('tileEpc').hidden=['ADMIN','PIC','INPUT','KONTRAKTOR'].indexOf(role)<0;" },
];

/** Dipakai routes/gas.js */
const EPCC_PAGES = ['engineering', 'epcc', 'procurement', 'construction', 'commissioning'];
const EPCC_FNS = new Set(['getEpccData', 'getEpccWeekPack', 'readEpcFobDoc', 'getEngineeringData', 'getEngArchive', 'getEngFileBytes']);
/** Akun Node role 'viewer' = USER / VIEWER (bukan admin, input/PIC, kontraktor). */
const noEpcc = (u) => !!u && u.role === 'viewer';

module.exports = { HTML_PATCHES, EPCC_PAGES, EPCC_FNS, noEpcc };

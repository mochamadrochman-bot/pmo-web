'use strict';

/**
 * Live View · kamera di jaringan internal perusahaan (15 Nov 2026, diperbarui 20 Nov 2026).
 * NVR CCTV berada di LAN pabrik (mis. http://192.168.61.62/), sehingga tidak bisa disematkan di dashboard
 * (HTTPS) dan tidak terjangkau dari server. Sementara (pilihan A): jenis "Tautan" boleh memakai
 * http:// KHUSUS untuk alamat jaringan internal (10.x, 172.16–31.x, 192.168.x), termasuk auto-prefix
 * http:// jika admin mengetik IP LAN langsung (mis. 192.168.61.62). Tautan dibuka di tab baru
 * atau lewat aplikasi HIK-Connect (IP LAN + port 8000) dari komputer/HP di jaringan kantor/VPN.
 * Solusi tetap (pilihan B): jembatan streaming RTSP → HLS di LAN + Cloudflare Tunnel, memakai jenis HLS.
 */

const LAN_HOST_RE = '(10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|192\\.168\\.\\d{1,3}\\.\\d{1,3}|172\\.(1[6-9]|2\\d|3[01])\\.\\d{1,3}\\.\\d{1,3})(:\\d{1,5})?(\\/[^\\s]*)?';
const LAN_BARE_RE_JS = '^' + LAN_HOST_RE + '$';
const LAN_RE_JS = '^http:\\/\\/' + LAN_HOST_RE + '$';

/** Patch kode .gs (diterapkan saat runtime dimuat). */
const GS_PATCHES = [
  {
    // Executive: rentang tanggal minggu cut-off per proyek (dipakai label periode di slide proyek).
    file: 'Code',
    find: "      cutWeek: info.startDate ? cutWeekOf_(db, p, selected) : null,",
    replace: "      cutWeek: info.startDate ? cutWeekOf_(db, p, selected) : null,\n" +
      "      cutRange: (function () { try { if (!info.startDate) return ''; var w = cutWeekOf_(db, p, selected), st = info.startDate; if (!w) return ''; var a = new Date(st.getFullYear(), st.getMonth(), st.getDate() + (w - 1) * 7), b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6); return formatDateId_(a) + ' – ' + formatDateId_(b); } catch (e) { return ''; } })(),",
  },
  {
    file: 'LiveApi',
    find: "  const url = String(cam.url || '').trim();",
    replace: "  const rawUrl_ = String(cam.url || '').trim();\n" +
      "  const url = type === 'TAUTAN' && new RegExp('" + LAN_BARE_RE_JS.replace(/\\/g, '\\\\') + "', 'i').test(rawUrl_) ? 'http://' + rawUrl_ : rawUrl_;",
  },
  {
    file: 'LiveApi',
    find: "  if (!/^https:\\/\\/[^\\s]+$/i.test(url)) throw new Error('Alamat kamera harus diawali https:// (browser memblokir alamat http).');",
    replace: "  const lanOk = type === 'TAUTAN' && new RegExp('" + LAN_RE_JS.replace(/\\/g, '\\\\') + "', 'i').test(url);\n" +
      "  if (!lanOk && !/^https:\\/\\/[^\\s]+$/i.test(url)) throw new Error('Alamat kamera harus diawali https://. Pengecualian: jenis Tautan boleh http:// atau IP jaringan internal (mis. http://192.168.61.62/).');",
  },
];

/** Patch halaman LiveView.html. */
const LIVE_HTML_PATCHES = [
  {
    file: 'LiveView',
    find: ".msg a,.msg button{display:inline-flex;align-items:center;gap:6px;margin-top:12px;min-height:44px;padding:0 18px;border-radius:10px;background:#fff;color:#073b63;font-weight:700;text-decoration:none;border:0}",
    replace: ".msg a,.msg button{display:inline-flex;align-items:center;gap:6px;margin-top:12px;min-height:44px;padding:0 18px;border-radius:10px;background:#fff;color:#073b63;font-weight:700;text-decoration:none;border:0}" +
      ".msg-acts{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:12px}" +
      ".msg-acts a,.msg-acts button{margin-top:0}" +
      ".msg button.sec{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.28)}" +
      "@media (max-width:640px){.stage.lan{aspect-ratio:auto;min-height:220px}.stage.lan .msg{padding:44px 14px 16px;font-size:13px}}",
  },
  {
    file: 'LiveView',
    find: "function formCam(){return{id:editId,projectId:$('fProject').value,name:$('fName').value.trim(),location:$('fLoc').value.trim(),type:$('fType').value,url:$('fUrl').value.trim(),order:$('fOrder').value.trim(),active:$('fActive').checked,note:$('fNote').value.trim()}}",
    replace: "function pmoNormLanUrl(t,u){const s=String(u||'').trim();return t==='TAUTAN'&&new RegExp(" + JSON.stringify(LAN_BARE_RE_JS) + ",'i').test(s)?'http://'+s:s}" +
      "function pmoLanHost(u){return String(u||'').replace(/^https?:\\/\\//i,'').split('/')[0]}" +
      "function pmoLanIp(u){return pmoLanHost(u).split(':')[0]}" +
      "function pmoCopyLan(ip){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(ip).then(function(){toast('IP disalin: '+ip)},function(){toast('Salin manual: '+ip)})}else{toast('IP NVR: '+ip)}}" +
      "function formCam(){const t=$('fType').value;return{id:editId,projectId:$('fProject').value,name:$('fName').value.trim(),location:$('fLoc').value.trim(),type:t,url:pmoNormLanUrl(t,$('fUrl').value),order:$('fOrder').value.trim(),active:$('fActive').checked,note:$('fNote').value.trim()}}",
  },
  {
    file: 'LiveView',
    find: "function testCam(){const c=formCam();if(!/^https:\\/\\//i.test(c.url)){toast('Isi alamat https:// dulu.');return}",
    replace: "function pmoIsLan(u){return new RegExp(" + JSON.stringify(LAN_RE_JS) + ",'i').test(String(u||''))}" +
      "function testCam(){const c=formCam();if(!/^https:\\/\\//i.test(c.url)&&!(c.type==='TAUTAN'&&pmoIsLan(c.url))){toast('Isi alamat https:// dulu (jenis Tautan boleh http:// atau IP jaringan internal).');return}",
  },
  {
    file: 'LiveView',
    find: "function stop(){if(hls){try{hls.destroy()}catch(e){}hls=null}clearInterval(imgTimer);clearInterval(clockTimer);const v=$('stage').querySelector('video');if(v){try{v.pause();v.removeAttribute('src');v.load()}catch(e){}}}",
    replace: "function stop(){$('stage').classList.remove('lan');if(hls){try{hls.destroy()}catch(e){}hls=null}clearInterval(imgTimer);clearInterval(clockTimer);const v=$('stage').querySelector('video');if(v){try{v.pause();v.removeAttribute('src');v.load()}catch(e){}}}",
  },
  {
    file: 'LiveView',
    find: "st.innerHTML=overlay(c)+'<div class=\"msg\"><div><b>'+esc(c.name)+'</b>Kamera ini dibuka di halaman penyedianya.<br><a href=\"'+esc(c.url)+'\" target=\"_blank\" rel=\"noopener\">Buka tayangan</a></div></div>';",
    replace: "const isLan=pmoIsLan(c.url);if(isLan)st.classList.add('lan');" +
      "st.innerHTML=overlay(c)+(isLan" +
      "?'<div class=\"msg\"><div><b>'+esc(c.name)+'</b>NVR jaringan internal ('+esc(pmoLanHost(c.url))+').<br>Buka dari komputer atau HP yang tersambung ke Wi-Fi/LAN kantor atau VPN.<div class=\"msg-acts\"><a href=\"'+esc(c.url)+'\" target=\"_blank\" rel=\"noopener\">Buka NVR di tab baru</a><button type=\"button\" class=\"sec\" onclick=\"pmoCopyLan(\\''+esc(pmoLanIp(c.url))+'\\')\">Salin IP</button></div><small style=\"display:block;margin-top:10px;opacity:.75\">Di luar jaringan kantor/VPN, alamat ini tidak akan terbuka.</small></div></div>'" +
      ":'<div class=\"msg\"><div><b>'+esc(c.name)+'</b>Kamera ini dibuka di halaman penyedianya.<br><a href=\"'+esc(c.url)+'\" target=\"_blank\" rel=\"noopener\">Buka tayangan</a></div></div>');",
  },
  {
    file: 'LiveView',
    find: "$('camNote').innerHTML=(c.projectId===D.demoId?'<div class=\"note demo\">Tayangan contoh untuk demonstrasi, bukan kamera lokasi proyek. Ganti dengan kamera proyek setelah server streaming IT siap.</div>':'')+(c.note?'<div class=\"note\">'+esc(c.note)+'</div>':'');",
    replace: "$('camNote').innerHTML=(c.projectId===D.demoId?'<div class=\"note demo\">Tayangan contoh untuk demonstrasi, bukan kamera lokasi proyek. Ganti dengan kamera proyek setelah server streaming IT siap.</div>':'')+(pmoIsLan(c.url)?'<div class=\"note\"><b>Akses NVR &amp; HIK-Connect (jaringan internal):</b> di browser PC buka <code>'+esc(c.url)+'</code> lalu login dengan akun NVR. Di aplikasi HP <b>HIK-Connect</b>, pilih <i>Tambahkan Perangkat Secara Manual → IP/Domain</i>, lalu isi Alamat IP <code>'+esc(pmoLanIp(c.url))+'</code> dan Port <code>8000</code> saat terhubung ke Wi-Fi/LAN kantor atau VPN.</div>':'')+(c.note?'<div class=\"note\">'+esc(c.note)+'</div>':'');",
  },
  {
    file: 'LiveView',
    find: "$('fType').onchange=function(){$('typeHint').textContent=(TYPE_INFO[this.value]||['',''])[1]};",
    replace: "$('fType').onchange=function(){$('typeHint').textContent=(TYPE_INFO[this.value]||['',''])[1];$('fUrl').placeholder=this.value==='TAUTAN'?'https://… atau 192.168.61.62':'https://…'};",
  },
  {
    file: 'LiveView',
    find: "TAUTAN:['Tautan','Halaman kamera yang tidak bisa disematkan. Dibuka di tab baru.']",
    replace: "TAUTAN:['Tautan','Halaman kamera yang tidak bisa disematkan. Dibuka di tab baru. Untuk NVR di jaringan internal boleh memakai http:// atau langsung ketik IP LAN, mis. http://192.168.61.62/ (hanya terbuka dari jaringan kantor/VPN).']",
  },
];

module.exports = { GS_PATCHES, LIVE_HTML_PATCHES };

'use strict';

/**
 * Tambah / Edit Proyek · tombol "Cek link" untuk Folder Google Drive tim proyek (25 Nov 2026).
 *
 * checkProjectDrive(token, projectId, url) menjalankan pemeriksaan yang sama dengan saat simpan
 * (engSetDrive_) tanpa menyimpan apa pun:
 *   - link harus link FOLDER (bukan file / dokumen);
 *   - folder bisa dibuka akun web app;
 *   - akun web app bisa menulis (file uji dibuat lalu dibuang ke sampah);
 *   - peringatan bila folder yang sama sudah dipakai proyek lain.
 * Di sisi browser: status tampil di bawah isian, otomatis dicek saat isian berubah,
 * dan daftar kelengkapan menandai merah bila link baru belum dicek / gagal.
 */

const PROJ_DRIVE_GS = String.raw`
function checkProjectDrive(token, projectId, url) {
  const user = requireProjectEditor_(token);
  url = String(url || '').trim();
  const pid = String(projectId || '').trim().toUpperCase();
  if (!url) return { status: '', message: '' };
  if (/\/file\/d\/|docs\.google\.com\/(document|spreadsheets|presentation|forms|drawings)\//.test(url))
    return { status: 'fail', message: 'Ini link file / dokumen, bukan folder. Buka folder di Google Drive lalu salin link dari address bar (…/drive/folders/…).' };
  const m = url.match(/folders\/([A-Za-z0-9_-]{10,})/) || url.match(/[?&]id=([A-Za-z0-9_-]{10,})/) || url.match(/^([A-Za-z0-9_-]{25,})$/);
  if (!m) return { status: 'fail', message: 'Bukan link folder Google Drive. Contoh: https://drive.google.com/drive/folders/…' };
  if (!/^https:\/\/drive\.google\.com\//i.test(url) && !/^[A-Za-z0-9_-]{25,}$/.test(url))
    return { status: 'fail', message: 'Link harus diawali https://drive.google.com/' };
  const acc = engScriptAccount_() || 'akun pemilik dashboard';
  let folder, name, link;
  try { folder = DriveApp.getFolderById(m[1]); name = folder.getName(); link = folder.getUrl(); }
  catch (e) { return { status: 'fail', message: 'Folder tidak ditemukan atau belum dibagikan ke akun web app (' + acc + '). Bagikan folder ke akun tersebut sebagai Editor, lalu cek ulang.' }; }
  let probe = null;
  try { probe = folder.createFile('cek-akses-dashboard.txt', 'uji tulis', MimeType.PLAIN_TEXT); }
  catch (e) { return { status: 'fail', name: name, message: 'Folder "' + name + '" bisa dibuka, tetapi akun web app (' + acc + ') belum bisa menambah file. Jadikan akun tersebut Editor (bukan Viewer/Commenter).' }; }
  try { probe.setTrashed(true); } catch (e) { /* abaikan */ }
  let others = [];
  try {
    const last = {};
    engRead_(ENGF.DRIVE).forEach(function(r) { const p = String(r.PROYEK_ID || '').trim().toUpperCase(); if (p) last[p] = String(r.FOLDER_ID || ''); });
    others = Object.keys(last).filter(function(p) { return p !== pid && last[p] === m[1]; });
  } catch (e) { others = []; }
  if (others.length) return { status: 'warn', name: name, url: link, message: 'Folder "' + name + '" bisa dipakai, tetapi sudah dipakai proyek ' + others.join(', ') + '. Sebaiknya tiap proyek punya folder sendiri.' };
  return { status: 'ok', name: name, url: link, message: 'Folder "' + name + '" siap dipakai · akun web app bisa membaca dan menulis.' };
}
`;

const CSS = '.lk{display:flex;align-items:flex-start;gap:8px;margin-top:6px;min-height:24px;font-size:12.5px;line-height:1.45}' +
  '.lk-btn{flex:none;min-height:28px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--pri-ink,var(--pri));font:inherit;font-weight:700;cursor:pointer}' +
  '.lk-btn:hover{background:var(--soft)}.lk-btn:disabled{opacity:.6;cursor:default}' +
  '.lk-st{min-width:0;padding-top:4px;color:var(--muted);overflow-wrap:anywhere}' +
  '.lk-st[data-s="ok"]{color:var(--ok)}.lk-st[data-s="warn"]{color:var(--warn)}.lk-st[data-s="fail"]{color:var(--bad)}' +
  '.lk-st a{color:inherit;font-weight:700;margin-left:6px;text-decoration:underline}.inp.lk-bad{border-color:var(--bad)}\n';

const JS = `
<script>
(function(){
  var st={url:'',status:'',message:''};window.__pmoDriveSaved=window.__pmoDriveSaved||'';
  function el(id){return document.getElementById(id)}
  function show(status,msg,url,link){st={url:url,status:status,message:msg};var box=el('fDriveLk');if(!box)return;
    var s=box.querySelector('.lk-st'),b=box.querySelector('.lk-btn');s.setAttribute('data-s',status||'');
    b.disabled=status==='busy';b.textContent=status&&status!=='unchecked'&&status!=='busy'&&status!=='saved'?'Cek ulang':'Cek link';
    s.textContent=({ok:'✓ ',warn:'⚠ ',fail:'✕ '}[status]||'')+(msg||'');
    if(link&&(status==='ok'||status==='warn')){var a=document.createElement('a');a.href=link;a.target='_blank';a.rel='noopener';a.textContent='Buka folder';s.appendChild(a)}
    el('fDrive').classList.toggle('lk-bad',status==='fail');try{refresh()}catch(e){}}
  function cur(){return el('fDrive').value.trim()}
  window.pmoDriveCheck=function(){var v=cur();if(!v){show('','',v);return}
    show('busy','Mengecek folder…',v);
    google.script.run.withSuccessHandler(function(r){if(cur()!==v)return;r=r||{};show(r.status||'fail',r.message||'',v,r.url)})
      .withFailureHandler(function(e){if(cur()!==v)return;show('fail','Gagal mengecek: '+(e&&e.message?e.message:e),v)})
      .checkProjectDrive(token,(el('fId').value||'').trim(),v)};
  window.pmoDriveReset=function(){var v=cur();if(!v)show('','',v);else if(v===window.__pmoDriveSaved)show('saved','Folder tersimpan sebelumnya.',v);else show('unchecked','Belum dicek. Tekan "Cek link".',v)};
  window.pmoDriveState=function(){var v=cur();if(!v)return null;if(v===window.__pmoDriveSaved)return{ok:true,t:'Folder Drive tim proyek'};
    if(st.url!==v||!st.status||st.status==='unchecked')return{ok:false,t:'Folder Drive belum dicek (tekan "Cek link")'};
    if(st.status==='busy')return{ok:false,t:'Folder Drive sedang dicek…'};
    if(st.status==='fail')return{ok:false,t:'Folder Drive tidak bisa dipakai'};
    return{ok:true,t:'Folder Drive tim proyek'+(st.status==='warn'?' (dipakai proyek lain)':''),warn:st.status==='warn'}};
  document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-dlk]'))pmoDriveCheck()});
  var f=el('fDrive');if(f){f.addEventListener('input',pmoDriveReset);f.addEventListener('change',function(){var v=cur();if(v&&v!==window.__pmoDriveSaved)pmoDriveCheck()})}
})();
</script>
`;

const HTML_PATCHES = [
  { file: 'ProjectSetup', find: '</style>', replace: CSS + '</style>' },
  { file: 'ProjectSetup', find: 'placeholder="https://drive.google.com/drive/folders/…">',
    replace: 'placeholder="https://drive.google.com/drive/folders/…"><div class="lk" id="fDriveLk"><button type="button" class="lk-btn" data-dlk>Cek link</button><span class="lk-st" aria-live="polite"></span></div>' },
  { file: 'ProjectSetup', find: "$('fDrive').value=p.driveUrl||'';",
    replace: "$('fDrive').value=p.driveUrl||'';window.__pmoDriveSaved=String(p.driveUrl||'').trim();if(window.pmoDriveReset)pmoDriveReset();" },
  { file: 'ProjectSetup', find: "  if(warnN)add(false,warnN+' bulan selisih",
    replace: "  if(window.pmoDriveState){const ds=pmoDriveState();if(ds)add(ds.ok&&!ds.warn,ds.t,ds.ok&&ds.warn)}\n  if(warnN)add(false,warnN+' bulan selisih" },
  { file: 'ProjectSetup', find: '</body>', replace: JS + '</body>' },
];

module.exports = { PROJ_DRIVE_GS, HTML_PATCHES };

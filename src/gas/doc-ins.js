'use strict';

/**
 * Document Control · Asuransi (23 Nov 2026).
 *
 * Kategori ASURANSI (tahap Awal proyek) memakai kolom register yang sama dengan Jaminan:
 *   NOMOR = nomor polis · TANGGAL = mulai berlaku · BERLAKU_SAMPAI = berakhir polis · NILAI = nilai pertanggungan
 *   BANK = perusahaan asuransi · PIHAK = tertanggung · STATUS = AKTIF | DIPERPANJANG | BERAKHIR | KLAIM.
 * Jenis: CAR, EAR, TPL, marine cargo, alat berat, BPJS Ketenagakerjaan, lainnya.
 * Tab/menu "Asuransi" memantau masa berlaku (≤ 30 hari kuning, lewat merah), sama seperti tab Jaminan.
 */

const GS_PATCHES = [
  { file: 'DocApi', find: "    { k: 'BA_PEKERJAAN', n: 'BA pekerjaan', t: 'PELAKSANAAN' },",
    replace: "    { k: 'ASURANSI', n: 'Asuransi', t: 'AWAL', bond: true, ins: true, money: true, sub: { CAR: \"Contractor's All Risk (CAR)\", EAR: 'Erection All Risk (EAR)', TPL: 'Tanggung gugat pihak ketiga (TPL)', MARINE: 'Marine cargo / pengangkutan', ALAT: 'Alat berat & peralatan', BPJS: 'BPJS Ketenagakerjaan', LAINNYA: 'Asuransi lainnya' } },\n" +
      "    { k: 'BA_PEKERJAAN', n: 'BA pekerjaan', t: 'PELAKSANAAN' }," },
  { file: 'DocApi', find: "  BOND_STATUS: ['AKTIF', 'DIPERPANJANG', 'DIKEMBALIKAN', 'DICAIRKAN'],",
    replace: "  BOND_STATUS: ['AKTIF', 'DIPERPANJANG', 'DIKEMBALIKAN', 'DICAIRKAN'],\n  INS_STATUS: ['AKTIF', 'DIPERPANJANG', 'BERAKHIR', 'KLAIM']," },
  { file: 'DocApi', find: 'bondStatus: DOC.BOND_STATUS,', replace: 'bondStatus: DOC.BOND_STATUS, insStatus: DOC.INS_STATUS,' },
  // Simpan & ubah (dua tempat): status dan pesan wajib "berakhir polis".
  ...[1, 2].map(() => ({ file: 'DocApi', find: 'const status = cat.bond ? (DOC.BOND_STATUS.indexOf(',
    replace: 'const status = cat.bond ? ((cat.ins ? DOC.INS_STATUS : DOC.BOND_STATUS).indexOf(' })),
  ...[1, 2].map(() => ({ file: 'DocApi', find: "if (cat.bond && !berlaku) throw new Error('Isi tanggal berlaku sampai untuk jaminan.');",
    replace: "if (cat.bond && !berlaku) throw new Error(cat.ins ? 'Isi tanggal berakhir polis asuransi.' : 'Isi tanggal berlaku sampai untuk jaminan.');" })),
  // Kelengkapan: polis proyek (tidak wajib, tergantung kontrak).
  { file: 'DocApi', find: "  add('JAMINAN', 'TKDN', undefined, 'Jaminan TKDN', 'Bila dipersyaratkan kontrak', false);",
    replace: "  add('JAMINAN', 'TKDN', undefined, 'Jaminan TKDN', 'Bila dipersyaratkan kontrak', false);\n  add('ASURANSI', '', undefined, 'Polis asuransi proyek (CAR / EAR, dll.)', 'Bila dipersyaratkan kontrak', false);" },
  // Impor folder: tebak kategori dari nama berkas (setelah aturan jaminan, supaya surety bond tetap jaminan).
  { file: 'DocApi', find: "    [/(jaminan|bank garansi|garansi bank|\\bbg\\b|surety|performance bond|guarantee)/, 'JAMINAN', 'PELAKSANAAN'],\n",
    replace: "    [/(jaminan|bank garansi|garansi bank|\\bbg\\b|surety|performance bond|guarantee)/, 'JAMINAN', 'PELAKSANAAN'],\n" +
      "    [/(asuransi|insurance|polis|policy|all risk|\\bcar\\b|\\bear\\b|\\btpl\\b|bpjs)/, 'ASURANSI', 'CAR'],\n" },
  { file: 'DocApi', find: "  if (g.kat === 'BAST') g.sub =",
    replace: "  if (g.kat === 'ASURANSI') g.sub = /(erection|\\bear\\b)/.test(full) ? 'EAR' : /(third party|pihak ketiga|\\btpl\\b|liability)/.test(full) ? 'TPL' : /(marine|cargo|pengangkutan|transit)/.test(full) ? 'MARINE' : /(alat berat|equipment|heavy|peralatan)/.test(full) ? 'ALAT' : /bpjs/.test(full) ? 'BPJS' : /(contractor|\\bcar\\b|all risk)/.test(full) ? 'CAR' : 'LAINNYA';\n  if (g.kat === 'BAST') g.sub =" },
  // Asisten AI: kategori baru bisa disaring; sisa hari polis ikut dihitung.
  { file: 'AiApi', find: "'BA_PA', 'ASBUILT', 'BA_PAK', 'LAINNYA'] }",
    replace: "'BA_PA', 'ASBUILT', 'BA_PAK', 'ASURANSI', 'MOM', 'SURAT_MASUK', 'SURAT_KELUAR', 'LAINNYA'] }" },
  { file: 'AiApi', find: "sisaHari: r.kat === 'JAMINAN' ? days(r.berlaku) : undefined,",
    replace: "sisaHari: r.kat === 'JAMINAN' || r.kat === 'ASURANSI' ? days(r.berlaku) : undefined," },
];

const INS_JS = String.raw`<style>
.ins-sum{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0 12px}.ins-sum div{padding:8px 12px;border:1px solid var(--line,#dbe4ee);border-radius:10px;min-width:120px}
.ins-sum b{display:block;font-size:20px}.ins-sum small{font-size:11.5px;color:var(--muted,#5b7085)}.ins-sum .neg b{color:#dc2626}.ins-sum .wrn b{color:#b45309}
.ins-cnt{display:inline-block;min-width:18px;padding:0 6px;margin-left:6px;border-radius:999px;background:#d97706;color:#fff;font-size:11px;line-height:18px;text-align:center}.ins-cnt.neg{background:#dc2626}
html[data-theme="dark"] .ins-sum div{border-color:rgba(255,255,255,.14)}html[data-theme="dark"] .ins-sum .neg b{color:#f87171}html[data-theme="dark"] .ins-sum .wrn b{color:#fbbf24}
</style>
<script>
(function(){
  if(window.pmoIns)return;
  var ACT={AKTIF:1,DIPERPANJANG:1,KLAIM:1};
  function insState(d){if(d.kat!=='ASURANSI'||!ACT[d.status])return null;var n=daysTo(d.berlaku);if(n==null)return null;return n<0?{k:'exp',t:'Lewat '+(-n)+' hari'}:n<=D.bondWarnDays?{k:'soon',t:n+' hari lagi'}:{k:'ok',t:n+' hari lagi'}}
  function list(){return (D&&D.docs||[]).filter(function(d){return d.kat==='ASURANSI'})}
  function counts(){var a=list().filter(function(d){return ACT[d.status]}),s=a.map(insState);return {act:a.length,soon:s.filter(function(x){return x&&x.k==='soon'}).length,exp:s.filter(function(x){return x&&x.k==='exp'}).length,all:list().length}}
  function updTab(){if(!D)return;var c=counts(),w=c.soon+c.exp,b=document.querySelector('#tabs [data-tab="ins"]'),s=document.querySelector('.nav.sub[data-goto="ins"] span');
    if(b)b.innerHTML='Asuransi'+(w?'<span class="ins-cnt'+(c.exp?' neg':'')+'">'+w+'</span>':'');if(s)s.textContent='Asuransi'+(w?' ('+w+')':'')}

  /* register: kolom kanan = nilai · asuransi · s.d. tanggal, status menunjukkan jatuh tempo */
  var oRow=rowHtml;rowHtml=function(d){var h=oRow(d);if(d.kat!=='ASURANSI')return h;var st=insState(d);
    var right=(d.nilai!=null?rp(d.nilai)+' · ':'')+(d.bank?esc(d.bank)+' · ':'')+(d.berlaku?'s.d. '+fd(d.berlaku):'');
    h=h.replace(/<td class="n h">[\s\S]*?<\/td>/,'<td class="n h">'+right+'</td>');
    return h.replace(/<td><span class="st [^"]*"[^>]*>[^<]*<\/span><\/td>/,'<td><span class="st '+(st&&st.k!=='ok'?st.k:d.status)+'"'+(st?' title="'+esc(st.t)+'"':'')+'>'+(st&&st.k!=='ok'?esc(st.t):esc(String(d.status||'').toLowerCase()))+'</span></td>')};

  /* KPI Jaminan: tambah ringkasan asuransi */
  var oKpi=renderKpis;renderKpis=function(){oKpi.apply(this,arguments);if(!D)return;updTab();var c=counts();if(!c.all)return;
    var k=Array.prototype.find.call(document.querySelectorAll('#kpis .kpi'),function(x){var s=x.querySelector('small');return s&&/Jaminan aktif/.test(s.textContent)});
    if(k){var p=k.querySelector('p');if(p)p.insertAdjacentHTML('beforeend','<br>Asuransi aktif <b>'+c.act+'</b>'+(c.soon+c.exp?' · <b class="'+(c.exp?'neg':'wrn')+'">'+(c.soon+c.exp)+'</b> jatuh tempo ≤ '+D.bondWarnDays+' hari / lewat':''))}};

  /* formulir: label & status khusus polis */
  var oDraw=drawForm;drawForm=function(isNew){oDraw.apply(this,arguments);if(!FM||FM.d.kat!=='ASURANSI')return;
    var lab=function(id,t,ph,req){var el=$(id);if(!el)return;var l=el.closest('label');if(!l)return;var sp=l.querySelector('span');var txt=t+(req?' <em>*</em>':'');if(sp)sp.innerHTML=txt;else if(l.firstChild&&l.firstChild.nodeType===3)l.firstChild.nodeValue=t;if(ph!==undefined)el.placeholder=ph};
    lab('fJudul','Judul / uraian polis','Contoh: Polis CAR Proyek Tangki Asam Sulfat 2x20.000 ton',true);
    lab('fNomor','Nomor polis');lab('fTgl','Mulai berlaku');lab('fPihak','Tertanggung','Kontraktor / PT Petrokimia Gresik');
    lab('fNilai','Nilai pertanggungan (Rp)');lab('fBank','Perusahaan asuransi','Contoh: PT Asuransi …');lab('fBerlaku','Berakhir polis',undefined,true);
    var s=$('fSt');if(s&&D.insStatus){var cur=FM.d.status&&D.insStatus.indexOf(FM.d.status)>=0?FM.d.status:'AKTIF';s.innerHTML=D.insStatus.map(function(x){return '<option value="'+x+'"'+(x===cur?' selected':'')+'>'+x.charAt(0)+x.slice(1).toLowerCase()+'</option>'}).join('')}};

  /* tab Asuransi */
  var oTab=setTab;setTab=function(t){var el=$('tab-ins');if(t!=='ins'){if(el)el.hidden=true;return oTab(t)}
    oTab('reg');tab='ins';document.querySelectorAll('#tabs button').forEach(function(b){var on=b.getAttribute('data-tab')==='ins';b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
    document.querySelectorAll('.nav.sub').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-goto')==='ins')});if(window.sideGrpSync)sideGrpSync();
    $('tab-reg').hidden=true;el.hidden=false;renderIns()};
  function renderIns(){
    var el=$('tab-ins');if(!el||!D)return;var c=cat('ASURANSI'),c2=counts();
    var L=list().sort(function(a,b){var x=ACT[a.status]?0:1,y=ACT[b.status]?0:1;return x-y||String(a.berlaku).localeCompare(String(b.berlaku))});
    var h='<div class="panel"><h3><i class="ic" data-ic="shield"></i>Asuransi <span class="n">'+L.length+' polis</span></h3><p class="sub">Pantau masa berlaku polis CAR / EAR, TPL, marine cargo, alat berat, dan BPJS Ketenagakerjaan. Polis aktif yang tinggal ≤ '+D.bondWarnDays+' hari ditandai kuning, yang sudah lewat ditandai merah.</p>'+
      '<div class="ins-sum"><div><b>'+c2.act+'</b><small>Polis aktif</small></div><div class="'+(c2.soon?'wrn':'')+'"><b>'+c2.soon+'</b><small>≤ '+D.bondWarnDays+' hari</small></div><div class="'+(c2.exp?'neg':'')+'"><b>'+c2.exp+'</b><small>Lewat masa berlaku</small></div><div><b>'+(c2.all-c2.act)+'</b><small>Berakhir</small></div></div>'+
      (D.canManage?'<div class="tools"><span style="flex:1"></span><button type="button" class="btn pri" id="insNew"><i class="ic" data-ic="plus"></i>Tambah polis</button></div>':'');
    if(!L.length)h+='<div class="empty">Belum ada polis asuransi terdaftar.'+(D.canManage?' Klik Tambah polis untuk mendaftarkan polis CAR / EAR dan lainnya.':'')+'</div>';
    else h+='<div class="scroll"><table class="tbl"><thead><tr><th>Jenis</th><th>Nomor polis · asuransi</th><th>Nilai pertanggungan</th><th>Periode</th><th>Status</th><th></th></tr></thead><tbody>'+L.map(function(d){var st=insState(d);
      return '<tr><td><b>'+esc(c.sub[d.sub]||d.sub||'–')+'</b><br><small>'+esc(d.judul)+'</small></td><td>'+esc(d.nomor||'–')+'<br><small>'+esc(d.bank||'')+(d.pihak?' · tertanggung '+esc(d.pihak):'')+'</small></td><td class="n">'+(d.nilai!=null?rp(d.nilai):'–')+'</td>'+
        '<td class="n">'+(d.tanggal?fd(d.tanggal)+' – ':'')+(d.berlaku?fd(d.berlaku):'<small class="wrn">belum diisi</small>')+(st?'<br><small class="'+(st.k==='exp'?'neg':st.k==='soon'?'wrn':'')+'">'+esc(st.t)+'</small>':'')+'</td>'+
        '<td><span class="st '+(st&&st.k!=='ok'?st.k:d.status)+'">'+esc(String(d.status||'').toLowerCase())+'</span></td><td class="n"><button type="button" class="btn" data-view="'+d.id+'" aria-label="Lihat"><i class="ic" data-ic="eye"></i></button>'+(D.canManage?' <button type="button" class="btn" data-edit="'+d.id+'" aria-label="Ubah"><i class="ic" data-ic="edit"></i></button>':'')+'</td></tr>'}).join('')+'</tbody></table></div>';
    el.innerHTML=h+'</div>';paint(el);
    var nb=$('insNew');if(nb)nb.onclick=function(){openForm(null,{kat:'ASURANSI',sub:'CAR'})};
    el.querySelectorAll('[data-view]').forEach(function(b){b.onclick=function(){openView(b.getAttribute('data-view'))}});
    el.querySelectorAll('[data-edit]').forEach(function(b){b.onclick=function(){openForm(D.docs.find(function(d){return d.id===b.getAttribute('data-edit')}))}});
  }
  /* setelah simpan, tab Asuransi ikut diperbarui */
  var oSet=setData;setData=function(d){oSet(d);if(tab==='ins')renderIns();updTab()};
  window.pmoIns={render:renderIns};
})();
</script>`;

const HTML_PATCHES = [
  { file: 'DocControl', find: '        <button type="button" data-tab="bond">Jaminan</button>',
    replace: '        <button type="button" data-tab="bond">Jaminan</button>\n        <button type="button" data-tab="ins">Asuransi</button>' },
  { file: 'DocControl', find: '    <section id="tab-bond" hidden></section>', replace: '    <section id="tab-bond" hidden></section>\n    <section id="tab-ins" hidden></section>' },
  { file: 'DocControl', find: '<button type="button" class="nav sub" data-goto="bond" title="Jaminan"><i class="ic" data-ic="shield"></i><span>Jaminan</span></button>',
    replace: '<button type="button" class="nav sub" data-goto="bond" title="Jaminan"><i class="ic" data-ic="shield"></i><span>Jaminan</span></button>\n    <button type="button" class="nav sub" data-goto="ins" title="Asuransi"><i class="ic" data-ic="shield"></i><span>Asuransi</span></button>' },
  { file: 'DocControl', find: "<?!= include('AccountMenu') ?>", replace: INS_JS + "\n<?!= include('AccountMenu') ?>" },
];

module.exports = { GS_PATCHES, HTML_PATCHES };

'use strict';

/**
 * Laporan Bulanan (MonthlyDoc) · Bab "LAPORAN REALISASI KEUANGAN" (17 Nov 2026):
 * format disamakan dengan slide Realisasi Keuangan di Presentasi bulanan (ManagementReport):
 *   kalimat pembuka, "Dalam Juta Rupiah", tabel Item Investasi (header bertingkat, baris nomor
 *   kolom 1..9, sel RKAP / Nilai Investasi / % digabung), lalu "catatan :" berupa narasi otomatis.
 * Berlaku untuk pratinjau (HTML) dan berkas Word (.docx).
 */

const MODEL_FIND = "  if(Fz.rows){p('Realisasi biaya proyek s.d. '+(Fz.basis?Fz.basis.label+' (data '+per+' belum tersedia)':per)+' dalam juta Rupiah:');";

const MODEL_JS = `  if(Fz.rows&&Fz.total){
    const T=Fz.total,mon=Fz.monthName||'',yr=Fz.year||'',nm=String((a.profile&&a.profile.title)||P.name||'').replace(/\\s+\\d+\\s*[xX×]\\s*[\\d.,]+\\s*(ton|mt|mtpy|tpd)?\\b.*$/i,'').replace(/\\s+/g,' ').trim().toLowerCase().replace(/(^|\\s)([a-z])/g,(m,q,c)=>q+c.toUpperCase()).replace(/\\b(Sa|Ss|Csu|Npk|Mla|Ubb)\\b/g,w=>w.toUpperCase());
    const rpx=j=>fin(j)?'Rp. '+Math.round(j*1e6).toLocaleString('id-ID'):'-',ppx=v=>fin(v)?(v*100).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+'%':'-';
    const note=(!fin(T.ytd)&&!fin(T.pos))?'Realisasi biaya bulan '+mon+' '+yr+' belum diisi di Laporan Bulanan.':
      'Realisasi biaya sampai dengan bulan '+mon+' '+yr+' sebesar '+rpx(T.ytd)+' atau '+ppx(Fz.pctRkap)+' dari nilai RKAP '+yr+' sebesar '+rpx(Fz.rkap)+',- dan posisi biaya dari awal sampai dengan Bulan '+mon+' tahun '+yr+' sebesar '+rpx(T.pos)+' atau '+ppx(Fz.pctInv)+' dari nilai Total Nilai Investasi proyek sebesar '+rpx(Fz.investment)+',-';
    B.push({t:'fin6',F:Fz,intro:'Sampai dengan Bulan '+mon+' '+yr+' realisasi anggaran proyek '+nm+' sebagai berikut :',basis:Fz.basis?'Berdasarkan Laporan Keuangan Bulan '+Fz.basis.label+' (data '+per+' belum tersedia)':'',note:note});}
  else if(Fz.rows){p('Realisasi biaya proyek s.d. '+(Fz.basis?Fz.basis.label+' (data '+per+' belum tersedia)':per)+' dalam juta Rupiah:');`;

// Pecah narasi: angka Rupiah & persen ditebalkan (sama seperti slide).
const SPLIT = "/(Rp\\.?\\s?[\\d.]+(?:,\\d+)?|\\d+(?:,\\d+)?\\s?%)/";

const PREVIEW_FIND = "    if(b.t==='table'){let h='';";
const PREVIEW_JS = `    if(b.t==='fin6'){const F=b.F,n0=v=>fin(v)?nf(v,0):'',pcx=v=>fin(v)?pc(v*100):'-',n=F.rows.length,ml=F.monthLabel||'';
      let h='<p class="pv-p">'+e(b.intro)+'</p>'+(b.basis?'<p class="pv-p pv-fb">'+e(b.basis)+'</p>':'')+'<div class="pv-tw"><div class="pv-fju">Dalam Juta Rupiah</div><table class="pv-t pv-f6"><thead>'+
        '<tr><th rowspan="2">Item Investasi</th><th rowspan="2">'+e(F.histLabel||'')+'</th><th colspan="3" class="b2">Tahun '+e(F.year)+'</th><th rowspan="2">Posisi s.d. '+e(ml+' '+F.year)+'</th><th rowspan="2">Nilai Investasi</th><th colspan="2" rowspan="2">%</th></tr>'+
        '<tr><th class="b2">Real '+e(ml)+'</th><th class="b2">Real s.d. '+e(ml)+'</th><th class="b2">RKAP</th></tr>'+
        '<tr class="no">'+['1','2','3','4','5','6=2+4','7','8 = 4:5','9 = 6:7'].map(t=>'<th>'+t+'</th>').join('')+'</tr></thead><tbody>';
      F.rows.forEach((r,i)=>{h+='<tr><td class="l">'+e(r.item)+'</td><td class="r">'+n0(r.hist)+'</td><td class="r">'+n0(r.month)+'</td><td class="r">'+n0(r.ytd)+'</td>'+
        (i===0?'<td class="c" rowspan="'+n+'">'+n0(F.rkap)+'</td>':'')+'<td class="r">'+n0(r.pos)+'</td>'+
        (i===0?'<td class="c" rowspan="'+(n+1)+'">'+n0(F.investment)+'</td><td class="c" rowspan="'+(n+1)+'">'+pcx(F.pctRkap)+'</td><td class="c" rowspan="'+(n+1)+'">'+pcx(F.pctInv)+'</td>':'')+'</tr>';});
      const T=F.total;h+='<tr class="tb"><td class="l">TOTAL</td><td class="r">'+n0(T.hist)+'</td><td class="r">'+n0(T.month)+'</td><td class="r">'+n0(T.ytd)+'</td><td></td><td class="r">'+n0(T.pos)+'</td></tr></tbody></table></div>';
      h+='<p class="pv-p">catatan :</p><p class="pv-p pv-fn">'+String(b.note).split(${SPLIT}).map((s,i)=>i%2?'<b>'+e(s)+'</b>':e(s)).join('')+'</p>';
      return h;}
`;

const DOCX_FIND = "    else if(b.t==='table')out+=table(b);";
const DOCX_JS = "    else if(b.t==='fin6')out+=fin6(b);\n";

const DOCX_FN_FIND = "  const addImg=async(src)=>{";
const DOCX_FN = `  const fin6=b=>{const F=b.F,n=F.rows.length,ml=F.monthLabel||'',HF='1F3864',BL='2E75B6',fs='18',n0=v=>fin(v)?nf(v,0):'',pcx=v=>fin(v)?pc(v*100):'-';
    const W=[1.5,1.15,1.15,1.15,1.2,1.25,1.3,1.35,1.35],tot=W.reduce((s,v)=>s+v,0),ws=W.map(w=>Math.round(w/tot*tw)),sw=(a,k)=>ws.slice(a,a+k).reduce((s,v)=>s+v,0);
    const H=(t,i,o)=>cell(t,o&&o.span?sw(i,o.span):ws[i],Object.assign({fill:HF,c:'FFFFFF',b:true,al:'c',sz:fs},o||{}));
    const D=(t,i,o)=>cell(t,ws[i],Object.assign({al:'r',sz:fs},o||{}));
    const hp='<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>',rp='<w:trPr><w:cantSplit/></w:trPr>';
    let x=para(b.intro,{after:40,keep:true});
    if(b.basis)x+=para(b.basis,{after:40,keep:true,i:true,c:'C00000'});
    x+=para('Dalam Juta Rupiah',{after:40,jc:'right',keep:true});
    x+='<w:tbl><w:tblPr><w:tblW w:w="'+tw+'" w:type="dxa"/><w:tblInd w:w="'+ind+'" w:type="dxa"/><w:tblBorders>'+B1+'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="7F8C99"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="7F8C99"/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+ws.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid>';
    x+='<w:tr>'+hp+H('Item Investasi',0,{vm:'r'})+H(F.histLabel||'',1,{vm:'r'})+H('Tahun '+F.year,2,{span:3,fill:BL})+H('Posisi s.d. '+ml+' '+F.year,5,{vm:'r'})+H('Nilai Investasi',6,{vm:'r'})+H('%',7,{span:2,vm:'r'})+'</w:tr>';
    x+='<w:tr>'+hp+H('',0,{vm:'c'})+H('',1,{vm:'c'})+H('Real '+ml,2,{fill:BL})+H('Real s.d. '+ml,3,{fill:BL})+H('RKAP',4,{fill:BL})+H('',5,{vm:'c'})+H('',6,{vm:'c'})+H('',7,{span:2,vm:'c'})+'</w:tr>';
    x+='<w:tr>'+hp+['1','2','3','4','5','6=2+4','7','8 = 4:5','9 = 6:7'].map((t,i)=>H(t,i,{fill:BL,b:false})).join('')+'</w:tr>';
    F.rows.forEach((r,i)=>{x+='<w:tr>'+rp+D(r.item,0,{al:'l'})+D(n0(r.hist),1)+D(n0(r.month),2)+D(n0(r.ytd),3)+D(i===0?n0(F.rkap):'',4,{al:'c',vm:i===0?'r':'c'})+D(n0(r.pos),5)+
      D(i===0?n0(F.investment):'',6,{al:'c',vm:i===0?'r':'c'})+D(i===0?pcx(F.pctRkap):'',7,{al:'c',vm:i===0?'r':'c'})+D(i===0?pcx(F.pctInv):'',8,{al:'c',vm:i===0?'r':'c'})+'</w:tr>';});
    const T=F.total;x+='<w:tr>'+rp+D('TOTAL',0,{al:'l',b:true})+D(n0(T.hist),1,{b:true})+D(n0(T.month),2,{b:true})+D(n0(T.ytd),3,{b:true})+D('',4)+D(n0(T.pos),5,{b:true})+D('',6,{vm:'c'})+D('',7,{vm:'c'})+D('',8,{vm:'c'})+'</w:tr></w:tbl>';
    x+=para('',{after:40})+para('catatan :',{after:20,keep:true});
    const ph='\\u0001',base=para(ph,{after:120});
    const runs=String(b.note).split(${SPLIT}).map((s,i)=>s?run(s,{b:i%2===1}):'').join('');
    return x+base.replace(run(ph,{}),runs);};
`;

const CSS_FIND = ".pv .pv-t tr.tot td{background:#d9e2f3;font-weight:700}";
const CSS = ".pv .pv-t tr.tot td{background:#d9e2f3;font-weight:700}" +
  ".pv .pv-fju{text-align:right;font:11.5px Arial,sans-serif;margin:2px 0 0}" +
  ".pv .pv-f6 th{vertical-align:middle}.pv .pv-f6 th.b2,.pv .pv-f6 thead tr+tr th,.pv .pv-f6 tr.no th{background:#2e75b6!important;color:#fff!important}.pv .pv-f6 tr.no th{font-weight:400;font-size:10.5px;padding:3px}" +
  ".pv .pv-f6 tr.tb td{font-weight:700}.pv .pv-p.pv-fb{color:#c00000;font-style:italic}.pv .pv-p.pv-fn{text-align:justify}";

const HTML_PATCHES = [
  { file: 'MonthlyDoc', find: MODEL_FIND, replace: MODEL_JS },
  { file: 'MonthlyDoc', find: PREVIEW_FIND, replace: PREVIEW_JS + PREVIEW_FIND },
  { file: 'MonthlyDoc', find: DOCX_FIND, replace: DOCX_JS + DOCX_FIND },
  { file: 'MonthlyDoc', find: DOCX_FN_FIND, replace: DOCX_FN + DOCX_FN_FIND },
  { file: 'MonthlyDoc', find: CSS_FIND, replace: CSS },
];

module.exports = { HTML_PATCHES };

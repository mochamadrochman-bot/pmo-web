'use strict';

/**
 * Pembaca otomatis surat masuk / surat keluar / MoM (risalah rapat) TANPA AI (22 Nov 2026).
 * Masukan: teks berformat tata letak (kolom dipertahankan dengan spasi) dari pdf.js atau OCR Tesseract.
 * Keluaran: { nomor, tanggal (YYYY-MM-DD), perihal, kepada, dari, ttd, ttdJabatan, ttdOrg, tembusan, tempat, waktu, pimpinan, peserta, notulis }.
 * Dipakai di browser (Document Control) lewat Function.prototype.toString; diuji di Node dengan contoh surat asli.
 */
function pmoDocParse(text, kind) {
  var MON = { jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, peb: 2, mar: 3, maret: 3, march: 3, apr: 4, april: 4, mei: 5, may: 5, jun: 6, juni: 6, june: 6,
    jul: 7, juli: 7, july: 7, agu: 8, agt: 8, ags: 8, agustus: 8, aug: 8, august: 8, sep: 9, sept: 9, september: 9, okt: 10, oct: 10, oktober: 10, october: 10,
    nov: 11, nop: 11, november: 11, nopember: 11, des: 12, dec: 12, desember: 12, december: 12 };
  var MRE = '(januari|februari|pebruari|maret|april|mei|juni|juli|agustus|september|oktober|nopember|november|desember|january|february|march|may|june|july|august|october|december|jan|feb|peb|mar|apr|jun|jul|agu|agt|ags|aug|sept|sep|okt|oct|nov|nop|des|dec)';
  var raw = String(text || '').replace(/\r/g, '').replace(/[ \t]/g, ' ').replace(/[：]/g, ':');
  var L = raw.split('\n').map(function(s) { return s.replace(/\s+$/, ''); });
  var out = {}, NOISE = /ditandatangani secara elektronik|tersertifikasi sebagai|tanda tangan dan stempel basah|^\s*halaman\s*:?\s*\d+\s*(dari|of)\s*\d+/i;
  function clean(s) { return String(s || '').replace(/\s{2,}/g, ' ').replace(/^[\s:;.,\-–]+|[\s;,\-–]+$/g, '').trim(); }
  function segs(line) { var r = [], re = /\S+(?: \S+)*/g, m; while ((m = re.exec(line))) r.push({ t: m[0], c: m.index }); return r; }
  function isLabelLine(s) { return /^[A-Za-z][A-Za-z ./()]{1,28}\s*:/.test(s.trim()); }
  function iso(d, m, y) { y = +y; if (y < 100) y += 2000; if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && y > 1990 && y < 2100)) return ''; return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
  function dateIn(s) {
    s = String(s || '');
    var m = s.match(new RegExp('\\b(\\d{1,2})\\s*' + MRE + '\\.?\\s*,?\\s*(\\d{4})\\b', 'i'));
    if (m) return iso(+m[1], MON[m[2].toLowerCase()], m[3]);
    m = s.match(new RegExp('\\b' + MRE + '\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})\\b', 'i'));
    if (m) return iso(+m[2], MON[m[1].toLowerCase()], m[3]);
    m = s.match(/\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})\b/);
    if (m) return iso(+m[1], +m[2], m[3]);
    m = s.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    return m ? iso(+m[3], +m[2], m[1]) : '';
  }
  /* Nilai label: "Label : nilai" (boleh di kolom kanan), baris lanjutan pada kolom yang sama. */
  function field(labels, opt) {
    opt = opt || {};
    var re = new RegExp('(^|\\s{2,}|^\\s*)(' + labels + ')\\s*:( *)', 'i');
    var lim = opt.lines || 3;
    for (var i = 0; i < L.length && i < (opt.max || 80); i++) {
      var line = L[i], m = re.exec(line);
      if (!m) continue;
      var start = m.index + m[0].length, lcol = m.index + m[1].length;
      var rest = line.slice(start), seg = m[3].length >= 8 ? '' : rest.split(/\s{3,}/)[0];
      if (seg && isLabelLine(seg)) seg = '';
      var val = seg, col = seg ? start : lcol, got = clean(seg) ? 1 : 0;
      var skips = 0;
      for (var j = i + 1; j < L.length && got < lim; j++) {
        var nx = L[j];
        if (!nx.trim()) { if (got) break; else continue; }
        var ss = segs(nx), pick = null;
        for (var k = 0; k < ss.length; k++) {
          var c = ss[k].c;
          if (Math.abs(c - col) <= 3 || (!got && Math.abs(c - lcol) <= 4) || (ss.length === 1 && !/\s{3,}/.test(rest.trim()) && c <= col + 2 && c >= Math.min(col, lcol) - 2 && !opt.strict)) { pick = ss[k]; break; }
        }
        if (!pick) { if (got && skips < 1 && col > 8 && ss.every(function(q) { return q.c < lcol - 3; })) { skips++; continue; } break; }
        if (isLabelLine(pick.t) || /^(kepada|yth|dengan hormat|hasil rapat|pembahasan|i+\.|[0-9]+\.)/i.test(pick.t.trim())) break;
        if (!got) col = pick.c;
        val += ' ' + pick.t; got++;
      }
      val = clean(val);
      if (val) return val;
    }
    return '';
  }
  function after(re, from) { for (var i = from || 0; i < L.length; i++) if (re.test(L[i])) return i; return -1; }

  /* ---- nomor ---- */
  var nomor = field('nomor|no\\.?|nomer|ref\\.?|our ref\\.?|reference', { lines: 1, max: 40 });
  var nm = (nomor.match(/[A-Z0-9][A-Z0-9.\/\-]{2,}[A-Z0-9]/i) || [''])[0];
  if (!nm || nm.indexOf('/') < 0) { var mm = raw.match(/\b[0-9A-Z]{2,8}(?:\.[0-9]{1,3})?\/[A-Z0-9.\-]+(?:\/[A-Z0-9.\-]+){1,7}\b/i); if (mm && (!nm || mm.index < 3000)) nm = mm[0]; }
  out.nomor = nm || '';

  /* ---- tanggal ---- */
  var tg = '';
  if (kind !== 'MOM') for (var i = 0; i < Math.min(L.length, 25); i++) { var x0 = L[i].match(new RegExp('[A-Z][a-zA-Z]+\\s*,?\\s+\\d{1,2}\\s+' + MRE + '\\s+\\d{4}', 'i')); if (x0) { tg = dateIn(x0[0]); if (tg) break; } }
  var ht = tg ? '' : field('hari\\s*/\\s*tanggal|hari\\s*/\\s*tgl|tanggal|tgl\\.?|date', { lines: 1, max: 60 });
  if (ht) tg = dateIn(ht);
  if (!tg) for (var i = 0; i < Math.min(L.length, 30); i++) { var x = L[i].match(new RegExp('[A-Z][a-zA-Z]+\\s*,?\\s+\\d{1,2}\\s+' + MRE + '\\s+\\d{4}', 'i')); if (x) { tg = dateIn(x[0]); if (tg) break; } }
  if (!tg) tg = dateIn(L.slice(0, 40).join(' '));
  out.tanggal = tg;

  /* ---- perihal ---- */
  var per = kind === 'MOM'
    ? field('hal\\s*/\\s*subject|topik pembahasan|topik|agenda|acara|perihal|hal|subject|pokok bahasan')
    : field('perihal|hal|subject|re|pokok');
  if (!per && kind === 'MOM') {
    var t = after(/RISALAH RAPAT|NOTULEN|NOTULA|MINUTES OF MEETING/i);
    if (t >= 0) { var tt = []; for (var j = t + 1; j < L.length && tt.length < 3; j++) { var s = L[j].trim(); if (!s || /^nomor|^no\b/i.test(s)) break; tt.push(s); } per = clean(tt.join(' ')); }
  }
  out.perihal = per.replace(/\s*\b(?:lampiran|lamp)\s*:.*$/i, '');

  /* ---- kepada ---- */
  var KY = /^\s*(kepada\s*(yth\.?|yang terhormat)?\s*[:,.]?|yth\.?\s*[:,.]?|to\s*:)\s*/i;
  var ky = kind === 'MOM' ? -1 : after(KY);
  if (ky >= 0 && ky < 60) {
    var first = L[ky].replace(KY, '').trim(), acc = first ? [first] : [];
    for (var j = ky + 1; j < L.length && acc.length < 4; j++) {
      var s = L[j].trim();
      if (!s) { if (acc.length) break; else continue; }
      if (/^(di\b|di\s|u\.?p\.?|dengan hormat|perihal|hal\b|assalam|up\s*:)/i.test(s)) break;
      acc.push(s.split(/\s{3,}/)[0]);
    }
    out.kepada = clean(acc.join(', '));
  } else out.kepada = '';

  /* ---- penandatangan (blok "Hormat kami") ---- */
  function sigAfter(idx) {
    var r = { org: '', nama: '', jabatan: '' }, seen = [];
    var first = L[idx].replace(/^.*?(hormat\s+(kami|saya)|yours\s+(faithfully|sincerely|truly)|regards|mengetahui)\s*,?/i, '').trim();
    if (first) seen.push(first);
    for (var j = idx + 1; j < L.length && seen.length < 5; j++) {
      var s = L[j].trim();
      if (!s || NOISE.test(s)) continue;
      if (/^(tembusan|cc|lampiran|nomor\s*:|halaman)/i.test(s)) break;
      seen.push(s.split(/\s{3,}/)[0]);
    }
    var orgRe = /\b(pt\.?|cv\.?|persero|tbk|divisi|departemen|dinas|kantor|lembaga|kelurahan|perusahaan|ltd|co\.|corporation|consortium|konsorsium|kso)\b|,$/i;
    var k = 0;
    if (seen[k] && orgRe.test(seen[k])) { r.org = clean(seen[k]); k++; if (seen[k] && orgRe.test(seen[k]) && !/^[A-Z][a-z]+(\s+[A-Z][a-z.]+){1,4}$/.test(seen[k])) { r.org += ' ' + clean(seen[k]); k++; } }
    r.nama = clean((seen[k] || '').replace(/^\(|\)$/g, ''));
    r.jabatan = clean(seen[k + 1] || '');
    if (r.jabatan && /^(nip|nik|npp)\b/i.test(r.jabatan)) r.jabatan = clean(seen[k + 2] || '');
    return r;
  }
  if (kind !== 'MOM') {
    var hk = after(/\b(hormat\s+(kami|saya)|yours\s+(faithfully|sincerely|truly)|best regards|regards)\b/i);
    if (hk >= 0) { var sg = sigAfter(hk); out.ttd = sg.nama; out.ttdJabatan = sg.jabatan; out.ttdOrg = sg.org; }
    var tb = after(/^\s*(tembusan|cc)\s*:?/i, hk >= 0 ? hk : 0);
    if (tb >= 0) { var tl = []; for (var j = tb + 1; j < L.length && tl.length < 8; j++) { var s = L[j].trim(); if (!s) { if (tl.length) break; else continue; } if (!/^(\d+[.)]|[-•])/.test(s) && tl.length) break; tl.push(s.replace(/^(\d+[.)]|[-•])\s*/, '')); } out.tembusan = tl.join('; '); }
    if (kind === 'SURAT_MASUK') {
      var dr = out.ttdOrg || '';
      if (!dr) { var kop = []; for (var i = 0; i < Math.min(L.length, 12); i++) { var s = L[i].trim(); if (!s) { if (kop.length) break; else continue; } if (/^(nomor|no\b|[A-Z][a-z]+\s*,\s*\d)/i.test(s) || dateIn(s)) break; if (/^(jl\.?|jalan|telp|tel\.|fax|email|e-mail|http|www\.)/i.test(s)) continue; kop.push(s); if (kop.length >= 2) break; } dr = clean(kop.join(' ')); }
      out.dari = dr;
    }
  } else {
    out.tempat = field('tempat|lokasi|venue|place', { lines: 2 });
    out.waktu = field('pukul|waktu pelaksanaan|waktu|jam|time', { lines: 1 });
    out.pimpinan = field('pimpinan\\s*rapat|dipimpin\\s*oleh|chairman|chaired by', { lines: 2 });
    var hd = field('hadir|peserta|participants|attendees', { lines: 2 });
    out.peserta = hd;
    /* tanda tangan: "Pimpinan Rapat,   Notulis," lalu nama & jabatan pada kolom yang sama */
    var pr = after(/pimpinan\s*rapat\s*,|notulis\s*,|notulen\s*,/i, 10);
    var sig = [];
    if (pr >= 0) {
      var heads = segs(L[pr]), rows = [];
      for (var j = pr + 1; j < L.length && rows.length < 2; j++) { if (!L[j].trim() || NOISE.test(L[j])) continue; rows.push(segs(L[j])); }
      heads.forEach(function(h) {
        var near = function(row) { var b = null; (row || []).forEach(function(s) { if (!b || Math.abs(s.c - h.c) < Math.abs(b.c - h.c)) b = s; }); return b && Math.abs(b.c - h.c) < 25 ? b.t : ''; };
        var nama = near(rows[0]), jab = near(rows[1]);
        if (nama) sig.push({ peran: clean(h.t.replace(/,$/, '')), nama: clean(nama), jabatan: clean(jab) });
      });
    }
    var mg = after(/^\s*mengetahui\s*,?\s*$/i, pr >= 0 ? pr : 10);
    if (mg >= 0) { var sm = sigAfter(mg); if (sm.nama) sig.push({ peran: 'Mengetahui', nama: sm.org && !sm.nama ? sm.org : sm.nama, jabatan: sm.jabatan }); }
    var nt = sig.filter(function(s) { return /notul/i.test(s.peran); })[0];
    out.notulis = nt ? nt.nama : '';
    out.ttd = sig.filter(function(s) { return !/notul/i.test(s.peran); }).map(function(s) { return s.nama + (s.jabatan ? ' (' + s.jabatan + ')' : ''); }).join('; ');
  }
  Object.keys(out).forEach(function(k) { if (typeof out[k] === 'string') out[k] = out[k].slice(0, 300); });
  return out;
}
module.exports = pmoDocParse;

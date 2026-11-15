'use strict';

/**
 * Peningkatan Sena (Asisten PMO) · 15 Nov 2026.
 *
 * 1. Tautan "Buka di halaman": Sena menulis [[teks|KODE|BIDANG|PROYEK]]. Server hanya menerima kode yang
 *    benar-benar muncul di hasil alat (tidak dikarang), lalu mengubahnya menjadi chip tautan.
 *    Halaman tujuan menyorot item lewat parameter ?sena=<kode> (lihat nav-theme.js).
 * 2. Klarifikasi: alat tanya_balik → widget menampilkan 2–4 tombol pilihan. Tidak mengurangi kuota.
 * 3. Draf: req.draft = ringkasan | concern | highlight | email → jawaban berupa draf siap salin.
 * 4. Peringatan dini di lonceng (ADMIN/INPUT/PIC): deviasi memburuk 3 minggu, item kritis CPM tertinggal,
 *    dokumen menunggu review > 14 hari, jaminan berakhir ≤ 30 hari. Dihitung tanpa AI.
 * 5. Akses Sena: ADMIN, atau akun dengan izin "Akses Sena" (users.sena_access), misalnya direktur.
 * 6. Perbaikan: kuota harian sebelumnya tidak pernah bertambah (status log "OK · …" ≠ "OK").
 *
 * SENA_BRIDGE dijalankan di lingkup kode Apps Script (setelah BRIDGE_CODE di runtime.js).
 */

const SENA_BRIDGE = String.raw`
;(function () {
  var DRAFTS = {
    ringkasan: { label: 'Narasi ringkasan eksekutif', how: 'Satu sampai dua paragraf (80–140 kata) gaya laporan ke Direksi: progres rencana vs realisasi dan deviasi, penyebab utama keterlambatan bila ada, dan tindak lanjut. Untuk portofolio (tanpa proyek dibuka) ringkas per kelompok proyek.' },
    concern: { label: 'Concern & mitigasi', how: 'Dua sampai empat pasang baris dengan format "Concern: …" lalu "Mitigasi: …". Concern harus bersumber dari data (deviasi, item terlambat, material belum tiba, dokumen tertahan).' },
    highlight: { label: 'Highlight minggu ini', how: 'Tiga sampai lima poin diawali "- ", masing-masing satu kalimat pencapaian/aktivitas minggu terakhir beserta angkanya.' },
    email: { label: 'Email ke kontraktor', how: 'Format email resmi: baris "Perihal: …", salam pembuka, isi 1–2 paragraf yang menyebut data (minggu, realisasi vs rencana, item yang tertinggal) dan permintaan tindak lanjut dengan tenggat, lalu penutup. Tulis nama pengirim sebagai [Nama]. Tidak memakai bahasa yang menyalahkan.' }
  };
  var SEEN = null, REQ = null;

  // --- akses ---
  aiIsAdmin_ = function (user) {
    var r = String((user && user.role) || '').trim().toUpperCase();
    if (r === 'ADMIN') return true;
    try { var u = __bridge.user(); if (u && u.senaAccess && user && u.username === user.username) return true; } catch (e) {}
    return !!(user && user.senaAccess);
  };

  // --- kuota: status "OK · n putaran" juga dihitung ---
  var __origLog = aiLog_;
  aiLog_ = function (user, req, q, model, inTok, outTok, status) {
    var s = String(status || '');
    if (s !== 'OK' && /^OK\b/.test(s)) {
      try { var c = CacheService.getScriptCache(), k = aiDayKey_(user); c.put(k, String((Number(c.get(k)) || 0) + 1), 21600); } catch (e) {}
    }
    return __origLog(user, req, q, model, inTok, outTok, status);
  };

  // --- alat tanya_balik ---
  delete AI_TOOL_DEFS[AI_TOOL_DEFS.length - 1].cache_control;
  AI_TOOL_DEFS.push({ name: 'tanya_balik',
    description: 'Tanyakan kembali kepada pengguna bila pertanyaan bisa berarti dua hal atau lebih yang jawabannya berbeda (misalnya kata kunci cocok dengan pengadaan dan pemasangan, beberapa proyek, atau beberapa item serupa). Berikan 2–4 pilihan singkat yang bisa langsung diklik. Panggil setelah data cukup untuk menyusun pilihan. Jangan dipakai bila satu arti jelas lebih mungkin.',
    input_schema: { type: 'object', properties: {
      pertanyaan: { type: 'string', description: 'Satu kalimat pertanyaan singkat' },
      pilihan: { type: 'array', items: { type: 'string', description: 'Maks 45 karakter; sebut kode grup/item bila ada' }, minItems: 2, maxItems: 4 } },
      required: ['pertanyaan', 'pilihan'], additionalProperties: false },
    cache_control: { type: 'ephemeral' } });

  var __origCall = aiCall_;
  aiCall_ = function (user, req, q, key, model, body) {
    var j = __origCall(user, req, q, key, model, body);
    var c = (j && j.content) || [];
    for (var i = 0; i < c.length; i++) {
      if (c[i] && c[i].type === 'tool_use' && c[i].name === 'tanya_balik') {
        var e = new Error('SENA_CLARIFY'); e.__clarify = c[i].input || {}; e.__usage = j.usage || {}; throw e;
      }
    }
    return j;
  };

  // --- catat kode yang benar-benar dibaca dari alat (untuk validasi tautan) ---
  function seenWalk(o, d) {
    if (!SEEN || o === null || o === undefined || d > 7) return;
    if (Array.isArray(o)) { for (var i = 0; i < o.length && i < 400; i++) seenWalk(o[i], d + 1); return; }
    if (typeof o !== 'object') return;
    ['id', 'kode', 'no', 'nomor', 'code'].forEach(function (k) {
      var v = o[k]; if (typeof v === 'string' || typeof v === 'number') { var s = String(v).trim(); if (s) SEEN[aiNorm_(s.replace(/^G:/i, ''))] = 1; }
    });
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k) && o[k] && typeof o[k] === 'object') seenWalk(o[k], d + 1);
  }
  var __origRun = aiRunTool_;
  aiRunTool_ = function (T, name, a) {
    var out = __origRun(T, name, a);
    try { seenWalk(out, 0); } catch (e) {}
    return out;
  };

  // --- prompt tambahan ---
  var __origPrompt = aiSystemPrompt_;
  aiSystemPrompt_ = function (req) {
    var base = __origPrompt(req).replace('Pengguna adalah ADMIN/pimpinan.', 'Pengguna adalah pimpinan atau tim PMO.');
    var dk = req && req.draft && DRAFTS[req.draft];
    if (dk) {
      return base + '\n' + [
        'MODE DRAF: pengguna meminta draf "' + dk.label + '" untuk ' + ((req.projectId || req.project) ? 'proyek yang sedang dibuka' : 'portofolio proyek') + '. Ambil data seperlunya dengan alat, lalu tulis HANYA isi draf yang siap disalin.',
        'Ketentuan draf: ' + dk.how,
        'Tanpa judul "## ", tanpa bagian "Perlu tindak lanjut", tanpa tautan [[...]], tanpa kalimat pembuka seperti "Berikut draf". Aturan angka (koma desimal, W.., Rp ringkas, tanggal Indonesia) tetap berlaku. Jangan mengarang data; bila data tidak ada, tulis [lengkapi] di tempatnya.'
      ].join('\n');
    }
    return base + '\n' + [
      '9. Bila pertanyaan ambigu (bisa berarti dua hal atau lebih dengan jawaban berbeda), JANGAN menebak: panggil tanya_balik dengan 2–4 pilihan. Bila pengguna baru saja memilih salah satu pilihan, langsung jawab.',
      '10. Tautan: setiap menyebut item, grup, dokumen engineering, dokumen proyek, atau proyek yang datanya Anda baca dari alat, tulis [[teks|KODE|BIDANG|PROYEK_ID]]. KODE = kode item/grup/nomor dokumen persis seperti di hasil alat (kosongkan untuk proyek). BIDANG = ENG, PROC, CONS, COM, DOC (dokumen proyek) atau WEEKLY (proyek). Contoh: [[Pekerjaan Pipe jalur SA (3.2.3.1.1)|3.2.3.1.1|CONS|TANGKI_SA]]. Maksimal 6 tautan, tidak di dalam judul.'
    ].join('\n');
  };

  // --- tautan ---
  var PAGE = { ENG: 'engineering', PROC: 'epcc&field=PROC', CONS: 'epcc&field=CONS', COM: 'epcc&field=COM', DOC: 'documents', WEEKLY: 'weekly' };
  function linkify(user, text) {
    var links = [], plain = text, linked = text, list = [];
    try { var db = loadDb_(); list = (db.allProjects || db.projects || []).filter(function (p) { return userCanAccess_(user, p); }); } catch (e) {}
    var re = /\[\[([^\]|]{1,160})\|([^\]|]{0,80})\|([A-Za-z]{2,7})\|([^\]|]{0,80})\]\]/g;
    linked = text.replace(re, function (m, label, kode, bid, proj) {
      label = String(label).trim(); kode = String(kode).trim().replace(/^G:/i, ''); bid = String(bid).toUpperCase(); proj = String(proj).trim();
      var p = null;
      if (proj) p = list.filter(function (x) { return x.id === normKey_(proj); })[0] || (function () { try { return findProject_(list, proj); } catch (e) { return null; } })();
      var ok = p && PAGE[bid] && (kode ? (SEEN && SEEN[aiNorm_(kode)]) : (bid === 'WEEKLY' || bid === 'DOC' || bid === 'ENG' || bid === 'PROC' || bid === 'CONS' || bid === 'COM'));
      if (!ok || links.length >= 8) return label;
      links.push({ label: label, url: '?page=' + PAGE[bid] + '&project=' + encodeURIComponent(p.name) + (kode ? '&sena=' + encodeURIComponent(kode) : '') });
      return '\u27E6L' + (links.length - 1) + '\u27E7';
    });
    plain = text.replace(re, function (m, label) { return String(label).trim(); });
    return { plain: plain, linked: links.length ? linked : '', links: links };
  }

  var __origAsk = askAssistant;
  askAssistant = function (token, req) {
    req = req || {};
    var dk = req.draft && DRAFTS[String(req.draft)] ? String(req.draft) : '';
    req.draft = dk || undefined;
    SEEN = {}; REQ = req;
    try {
      var r = __origAsk(token, req);
      var user = requireUser_(token);
      if (r && r.success) {
        if (dk) {
          r.answer = String(r.answer || '').replace(/\[\[([^\]|]{1,160})\|[^\]]*\]\]/g, '$1').trim();
          r.draft = { kind: dk, label: DRAFTS[dk].label };
          r.cards = [];
        } else {
          var L = linkify(user, String(r.answer || ''));
          r.answer = L.plain; r.answerLinked = L.linked; r.links = L.links;
        }
      }
      return r;
    } catch (e) {
      if (e && e.__clarify) {
        var user2 = requireUser_(token), c = e.__clarify, u = e.__usage || {};
        var opts = (Array.isArray(c.pilihan) ? c.pilihan : []).map(function (x) { return String(x || '').trim().slice(0, 60); }).filter(Boolean).slice(0, 4);
        var qq = String(c.pertanyaan || 'Yang mana yang Anda maksud?').trim().slice(0, 240);
        var model = aiModel_(), q = String(req.question || '').trim().slice(0, 1500);
        try { aiLog_(user2, req, q, model, Number(u.input_tokens) || 0, Number(u.output_tokens) || 0, 'KLARIFIKASI'); } catch (x) {}
        if (opts.length < 2) opts = ['Ya, lanjutkan', 'Tidak, ubah pertanyaan'];
        return { success: true, answer: qq + '\n' + opts.map(function (o) { return '- ' + o; }).join('\n'), clarify: { question: qq, options: opts },
          cards: [], sources: [], steps: [], usage: { used: aiUsedToday_(user2), limit: aiLimit_(), input: 0, output: 0 }, model: model };
      }
      throw e;
    } finally { SEEN = null; REQ = null; }
  };

  // --- peringatan dini ---
  function pct(v) { return v === null || v === undefined || !isFinite(v) ? null : Number(v); }
  function fmt(v) { return (v > 0 ? '+' : '') + String(Math.round(v * 100) / 100).replace('.', ','); }
  function senaAlerts_(user) {
    var out = [], db = loadDb_(), T = aiToolCtx_(user, {}, ''), today = new Date();
    var todayTxt = formatDateId_(today);
    db.projects.filter(function (p) { return userCanOperateProject_(user, p); }).forEach(function (p) {
      try { if (projectLifecycle_(db, p).stage !== 'BERJALAN') return; } catch (e) { return; }
      var nm = p.name;
      // 1. deviasi memburuk 3 minggu berturut-turut
      try {
        var info = weeklyInfo_(db, p), w = Number(info.latestWeek) || 0;
        if (w >= 4) {
          var d = [];
          for (var k = w - 3; k <= w; k++) {
            var a = pct(weekPercent_(db.weekly, p.id, 'KOMULATIF_REALISASI', k)), pl = pct(weekPercent_(db.weekly, p.id, 'KOMULATIF_PLAN', k));
            d.push(a === null || pl === null ? null : a - pl);
          }
          if (d.every(function (x) { return x !== null; }) && d[1] < d[0] - 0.005 && d[2] < d[1] - 0.005 && d[3] < d[2] - 0.005 && d[3] < 0) {
            out.push({ id: 'al:dev:' + p.id + ':' + w, kind: 'alert', level: d[3] < -5 ? 'bad' : 'warn', levelText: 'Peringatan dini', project: nm,
              title: 'Deviasi memburuk 3 minggu berturut-turut',
              text: 'Deviasi W' + (w - 3) + '–W' + w + ': ' + d.map(function (x) { return fmt(x) + '%'; }).join(' → ') + '.',
              when: todayTxt, sort: 1, ts: today.getTime(), action: { page: 'weekly', project: nm },
              ask: 'Kenapa deviasi proyek ' + nm + ' memburuk 3 minggu terakhir (W' + (w - 3) + '–W' + w + ') dan apa tindak lanjut yang disarankan?' });
          }
        }
      } catch (e) {}
      // 2. grup kritis CPM yang tertinggal
      ['CONS', 'PROC'].forEach(function (F) {
        try {
          var r = aiToolList_(T, p, F, 'KRITIS', '');
          var crit = ((r && r.daftar) || []).filter(function (g) {
            var n = Array.isArray(g.itemTertinggal) ? g.itemTertinggal.length : Number(g.itemTertinggal) || 0;
            return g.kategori === 'lintasan kritis' && n > 0;
          });
          if (!crit.length) return;
          var g0 = crit[0], fld = { CONS: 'Construction', PROC: 'Procurement' }[F];
          out.push({ id: 'al:crit:' + p.id + ':' + F + ':' + (r.realisasiConstructionWeek || '') + ':' + crit.length, kind: 'alert', level: 'bad', levelText: 'Peringatan dini', project: nm,
            title: 'Item kritis tertinggal · ' + fld,
            text: (g0.kode ? g0.kode + ' ' : '') + (g0.nama || '') + (crit.length > 1 ? ' dan ' + (crit.length - 1) + ' grup lain' : '') + ' berada di lintasan kritis dan masih tertinggal' + (r.mundurMinggu > 0 ? '; perkiraan selesai mundur ' + r.mundurMinggu + ' minggu' : '') + '.',
            when: todayTxt, sort: 1, ts: today.getTime(), action: { page: 'epcc', field: F, project: nm, sena: g0.kode || '' },
            ask: 'Jelaskan grup kritis ' + fld + ' yang tertinggal di proyek ' + nm + ' (mulai dari ' + (g0.kode || g0.nama) + '), dampaknya ke jadwal, dan tindak lanjut yang disarankan.' });
        } catch (e) {}
      });
      // 3. dokumen engineering menunggu review > 14 hari
      try {
        var e1 = aiToolEngDocs_(T, p, 'MENUNGGU_LAMA', '');
        if (e1 && !e1.error && Number(e1.durasiReviewHari) > 14) e1 = aiToolEngDocs_(T, p, 'MENUNGGU', '');
        var docs = ((e1 && e1.dokumen) || []).filter(function (x) { return Number(x.hariMenunggu) > 14; }).sort(function (a, b) { return b.hariMenunggu - a.hariMenunggu; });
        if (docs.length) {
          var dd = docs[0];
          out.push({ id: 'al:doc:' + p.id + ':' + (e1.week || '') + ':' + docs.length, kind: 'alert', level: docs[0].hariMenunggu > 30 ? 'bad' : 'warn', levelText: 'Peringatan dini', project: nm,
            title: docs.length + ' dokumen menunggu review > 14 hari',
            text: 'Terlama ' + dd.hariMenunggu + ' hari: ' + dd.no + (dd.judul ? ' (' + String(dd.judul).slice(0, 60) + ')' : '') + '.',
            when: todayTxt, sort: 2, ts: today.getTime(), action: { page: 'engineering', project: nm, sena: dd.no },
            ask: 'Dokumen engineering apa saja di proyek ' + nm + ' yang menunggu review lebih dari 14 hari, siapa yang perlu ditindaklanjuti, dan apa dampaknya?' });
        }
      } catch (e) {}
      // 4. jaminan berakhir ≤ 30 hari (digabung per proyek)
      try {
        var j = aiToolDocs_(T, p, '', 'JAMINAN');
        var jm = ((j && j.jaminanJatuhTempo) || []).filter(function (x) { return x.sisaHari !== null && x.sisaHari <= 30; }).sort(function (a, b) { return a.sisaHari - b.sisaHari; });
        if (jm.length) {
          var x0 = jm[0], dt = x0.berlakuSampai ? formatDateId_(new Date(x0.berlakuSampai + 'T00:00:00')) : '';
          var nm0 = function (x) { var jn = String(x.jenis || 'Jaminan'); return (/^jaminan/i.test(jn) ? jn : 'Jaminan ' + jn) + (x.nomor ? ' ' + x.nomor : ''); };
          var when0 = x0.sisaHari < 0 ? 'sudah lewat ' + (-x0.sisaHari) + ' hari' : x0.sisaHari === 0 ? 'berakhir hari ini' : 'berakhir ' + x0.sisaHari + ' hari lagi';
          out.push({ id: 'al:jm:' + p.id + ':' + jm.map(function (x) { return (x.nomor || '') + x.berlakuSampai; }).join(','), kind: 'alert', level: x0.sisaHari <= 7 ? 'bad' : 'warn', levelText: 'Peringatan dini', project: nm,
            title: (jm.length > 1 ? jm.length + ' jaminan ' : 'Jaminan ') + when0,
            text: jm.slice(0, 3).map(function (x) { return [String(x.jenis || 'Jaminan'), x.nomor, x.bank].filter(Boolean).join(' · '); }).join('; ') + (jm.length > 3 ? '; dan ' + (jm.length - 3) + ' lainnya' : '') + (dt ? '. Berlaku s.d. ' + dt + '.' : '.'),
            when: todayTxt, sort: x0.sisaHari <= 7 ? 1 : 2, ts: today.getTime(), action: { page: 'documents', project: nm, sena: x0.nomor || '' },
            ask: (jm.length > 1 ? jm.map(nm0).join(', ') : nm0(x0)) + ' proyek ' + nm + ' ' + when0 + '. Apa yang perlu disiapkan (perpanjangan atau pengembalian) dan dokumen terkaitnya?' });
        }
      } catch (e) {}
    });
    return out;
  }
  var __origNtf = getNotifications;
  getNotifications = function (token) {
    var r = __origNtf(token);
    try {
      if (!r || !r.success) return r;
      var user = requireUser_(token), role = String(user.role || '').trim().toUpperCase();
      if (['ADMIN', 'INPUT', 'PIC'].indexOf(role) < 0) return r;
      var al = perfCached_('senaAl|' + role + '|' + String(user.username || '') + '|' + String(user.projectId || user.project || ''), function () { return senaAlerts_(user); }) || [];
      if (!al.length) return r;
      al = al.map(function (x) { return Object.assign({}, x); }).sort(function (a, b) { return a.sort - b.sort; });
      al.forEach(function (x) { delete x.sort; delete x.ts; });
      var items = (r.items || []).slice(), acc = items.filter(function (x) { return x.kind === 'account'; }), rest = items.filter(function (x) { return x.kind !== 'account'; });
      r = Object.assign({}, r, { items: acc.concat(al, rest) });
    } catch (e) { /* tanpa peringatan dini, notifikasi lain tetap tampil */ }
    return r;
  };
})();
`;

/** Widget Sena: tautan, pilihan klarifikasi, draf. Disisipkan di akhir AiWidget.html. */
const SENA_WIDGET_JS = String.raw`<style id="senaExtraCss">
.sena-lk{display:inline-flex;align-items:center;gap:3px;padding:1px 8px 1px 9px;margin:0 1px;border-radius:99px;background:var(--soft,#e8f3fb);color:var(--pri-ink,#0f5fa8);font-weight:600;font-size:.94em;text-decoration:none;white-space:normal;line-height:1.5;border:1px solid transparent}
.sena-lk:hover{border-color:var(--pri,#0f5fa8)}
.sena-lk svg{width:12px;height:12px;flex:none}
.sena-opts{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px}
.sena-opts button{padding:7px 12px;border-radius:99px;border:1px solid var(--pri,#0f5fa8);background:var(--card,#fff);color:var(--pri-ink,#0f5fa8);font:inherit;font-size:13px;font-weight:600;cursor:pointer;min-height:0}
.sena-opts button:hover{background:var(--soft,#e8f3fb)}
.sena-opts button:disabled{opacity:.55;cursor:default}
.sena-note{font-size:11.5px;color:var(--muted,#5b7085)}
.sena-draft .sena-dl{font-size:12px;font-weight:600;color:var(--muted,#5b7085);margin-bottom:6px}
.sena-draft textarea{width:100%;box-sizing:border-box;min-height:150px;padding:10px 12px;border:1px solid var(--line,#e0e8f0);border-radius:10px;background:var(--card,#fff);color:var(--ink,#132b43);font:inherit;font-size:13.5px;line-height:1.55;resize:vertical}
.sena-draft textarea:focus{outline:2px solid var(--pri,#0f5fa8);outline-offset:1px}
.sena-da{display:flex;align-items:center;gap:10px;margin-top:8px}
.sena-da button{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9px;border:0;background:var(--pri,#0f5fa8);color:#fff;font:inherit;font-size:13px;font-weight:600;cursor:pointer;min-height:0}
.sena-da span{font-size:12px;color:var(--ok,#14724f)}
.sena-tools{position:relative;display:flex;gap:6px;padding:8px 14px 0}
.sena-tools>button{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:99px;border:1px solid var(--line,#e0e8f0);background:var(--card,#fff);color:var(--ink,#132b43);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;min-height:0}
.sena-tools>button:hover,.sena-tools>button[aria-expanded="true"]{border-color:var(--pri,#0f5fa8);color:var(--pri-ink,#0f5fa8)}
.sena-tools svg{width:14px;height:14px}
.sena-menu{position:absolute;left:14px;bottom:calc(100% + 6px);z-index:5;min-width:240px;padding:6px;border-radius:12px;background:var(--card,#fff);border:1px solid var(--line,#e0e8f0);box-shadow:0 12px 30px rgba(13,49,79,.18)}
.sena-menu button{display:block;width:100%;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:var(--ink,#132b43);font:inherit;font-size:13.5px;text-align:left;cursor:pointer;min-height:0}
.sena-menu button small{display:block;font-size:11.5px;color:var(--muted,#5b7085);margin-top:1px}
.sena-menu button:hover,.sena-menu button:focus-visible{background:var(--soft,#e8f3fb);outline:none}
.ntf-ask{margin-left:auto;white-space:nowrap;flex:none;padding:3px 10px;border-radius:99px;border:1px solid var(--pri,#0f5fa8);background:transparent;color:var(--pri-ink,#0f5fa8);font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;min-height:0}
.ntf-ask:hover{background:var(--soft,#e8f3fb)}
</style>
<script>
(function(){
  if(window.__senaExtra)return;window.__senaExtra=true;
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  var ARROW='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>';
  var DOC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>';
  var edits=typeof WeakMap!=='undefined'?new WeakMap():null;
  window.pmoSenaBody=function(m,md){
    if(m.draft){
      var v=(edits&&edits.get(m))||m.text||'';
      return '<div class="sena-draft"><div class="sena-dl">Draf · '+esc(m.draft.label)+' · bisa diedit sebelum disalin</div><textarea class="sena-dta" aria-label="Draf '+esc(m.draft.label)+'">'+esc(v)+'</textarea><div class="sena-da"><button type="button" data-sena-copy>Salin</button><span class="sena-cn" role="status"></span></div></div>';
    }
    if(m.clarify&&m.clarify.options){
      return md(m.clarify.question)+'<div class="sena-opts" role="group" aria-label="Pilihan">'+m.clarify.options.map(function(o){return '<button type="button" data-sena-opt="'+esc(o)+'">'+esc(o)+'</button>'}).join('')+'</div><div class="sena-note">Pilih salah satu. Pertanyaan klarifikasi tidak mengurangi kuota.</div>';
    }
    var h=md(m.linked||m.text);
    if(m.linked&&m.links&&m.links.length)h=h.replace(/\u27E6L(\d+)\u27E7/g,function(s,i){var l=m.links[+i];return l?'<a class="sena-lk" href="'+esc(l.url)+'" target="_top" title="Buka di halaman">'+esc(l.label)+ARROW+'</a>':''});
    return h;
  };
  window.pmoSenaWire=function(body,msgs){
    var list=body.querySelectorAll('.sena-draft');
    list.forEach(function(box){
      var ta=box.querySelector('textarea'),btn=box.querySelector('[data-sena-copy]'),cn=box.querySelector('.sena-cn');
      var m=null;if(msgs){var drafts=msgs.filter(function(x){return x.draft});var idx=Array.prototype.indexOf.call(body.querySelectorAll('.sena-draft'),box);m=drafts[idx]||null}
      if(ta&&m&&edits)ta.addEventListener('input',function(){edits.set(m,ta.value)});
      if(btn)btn.onclick=function(){var t=ta.value;var done=function(){cn.textContent='Tersalin';setTimeout(function(){cn.textContent=''},2200)};
        if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,function(){ta.select();try{document.execCommand('copy');done()}catch(e){cn.textContent='Salin manual: Ctrl+C'}});
        else{ta.select();try{document.execCommand('copy');done()}catch(e){cn.textContent='Salin manual: Ctrl+C'}}};
    });
  };
  /* tombol Buat draf di atas kotak tanya */
  var KINDS=[['ringkasan','Narasi ringkasan eksekutif','Paragraf laporan ke Direksi'],['concern','Concern & mitigasi','2–4 pasang concern dan mitigasi'],['highlight','Highlight minggu ini','3–5 poin pencapaian'],['email','Email ke kontraktor','Permintaan tindak lanjut resmi']];
  function addTools(){
    var pan=document.querySelector('.aic-in');if(!pan||pan.previousElementSibling&&pan.previousElementSibling.classList.contains('sena-tools'))return;
    var bar=document.createElement('div');bar.className='sena-tools';
    bar.innerHTML='<button type="button" data-sena-draft aria-haspopup="true" aria-expanded="false">'+DOC+'Buat draf</button><div class="sena-menu" role="menu" hidden>'+KINDS.map(function(k){return '<button type="button" role="menuitem" data-k="'+k[0]+'">'+esc(k[1])+'<small>'+esc(k[2])+'</small></button>'}).join('')+'</div>';
    pan.parentNode.insertBefore(bar,pan);
    var b=bar.querySelector('[data-sena-draft]'),menu=bar.querySelector('.sena-menu');
    var show=function(v){menu.hidden=!v;b.setAttribute('aria-expanded',String(!!v));if(v){var f=menu.querySelector('button');if(f)f.focus()}};
    b.onclick=function(e){e.stopPropagation();show(menu.hidden)};
    menu.addEventListener('keydown',function(e){if(e.key==='Escape'){show(false);b.focus()}});
    document.addEventListener('click',function(e){if(!menu.hidden&&!bar.contains(e.target))show(false)});
    menu.addEventListener('click',function(e){var x=e.target.closest('[data-k]');if(!x||!window.pmoSenaSend)return;show(false);
      var k=KINDS.filter(function(y){return y[0]===x.getAttribute('data-k')})[0];window.__senaDraft=k[0];window.pmoSenaSend('Buat draf: '+k[1])});
  }
  if(window.MutationObserver)new MutationObserver(function(){if(document.querySelector('.aic-in')&&!document.querySelector('.sena-tools'))addTools()}).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>`;

/** Patch HTML lama (lihat HTML_PATCHES di runtime.js). */
const SENA_PATCHES = [
  {
    file: 'AiWidget',
    find: "ST.msgs.push({role:'ai',text:r.answer,cards:r.cards||[],sources:r.sources||[],steps:r.steps||[],meta:",
    replace: "ST.msgs.push({role:'ai',text:r.answer,linked:r.answerLinked||'',links:r.links||[],clarify:r.clarify||null,draft:r.draft||null,cards:r.cards||[],sources:r.sources||[],steps:r.steps||[],meta:",
  },
  {
    file: 'AiWidget',
    find: "(m.cards||[]).map(card).join('')+md(m.text)+",
    replace: "(m.cards||[]).map(card).join('')+(window.pmoSenaBody?window.pmoSenaBody(m,md):md(m.text))+",
  },
  {
    file: 'AiWidget',
    find: "body.querySelectorAll('[data-sug]').forEach(function(b){b.onclick=function(){send(b.textContent)}});",
    replace: "body.querySelectorAll('[data-sug]').forEach(function(b){b.onclick=function(){send(b.textContent)}});" +
      "body.querySelectorAll('[data-sena-opt]').forEach(function(b){b.onclick=function(){if(ST.busy)return;b.parentNode.querySelectorAll('button').forEach(function(x){x.disabled=true});send(b.getAttribute('data-sena-opt'))}});" +
      'if(window.pmoSenaWire)window.pmoSenaWire(body,ST.msgs);',
  },
  {
    file: 'AiWidget',
    find: 'var req=ctx();req.avatar=AVSEL;req.question=text;req.history=hist.slice(-4);',
    replace: 'var req=ctx();req.avatar=AVSEL;req.question=text;req.history=hist.slice(-4);if(window.__senaDraft){req.draft=window.__senaDraft;window.__senaDraft=null}',
  },
  {
    file: 'AiWidget',
    find: 'function open(e){ST.open=true;',
    replace: 'window.pmoSenaOpen=function(){if(pan)open()};window.pmoSenaSend=function(t){send(t)};function open(e){ST.open=true;',
  },
  {
    file: 'AiWidget',
    find: "else setTimeout(init,600);\n})();\n</script>",
    replace: "else setTimeout(init,600);\n})();\n</script>\n" + SENA_WIDGET_JS,
  },
  // Lonceng: tombol "Tanya Sena", label peringatan dini, dan tautan sorot item.
  {
    file: 'AccountMenu',
    find: "(a.week?'&week='+encodeURIComponent(a.week):'');",
    replace: "(a.week?'&week='+encodeURIComponent(a.week):'')+(a.sena?'&sena='+encodeURIComponent(a.sena):'');",
  },
  {
    file: 'AccountMenu',
    find: "<span class=\"ntf-lv '+esc(x.level)+'\">'+(LV[x.level]||'')+'</span>",
    replace: "<span class=\"ntf-lv '+esc(x.level)+'\">'+esc(x.levelText||LV[x.level]||'')+'</span>'+(x.ask&&window.pmoSenaSend?'<button type=\"button\" class=\"ntf-ask\" data-ask=\"'+i+'\">Tanya Sena</button>':'')+'",
  },
  {
    file: 'AccountMenu',
    find: "pop.querySelector('[data-a=read]').onclick=function(e){",
    replace: "pop.querySelectorAll('[data-ask]').forEach(function(b){b.onclick=function(e){e.stopPropagation();var x=items[+b.getAttribute('data-ask')];if(!x||!window.pmoSenaSend)return;var s=seen();if(s.indexOf(x.id)<0){s.push(x.id);setSeen(s)}toggle(false);if(window.pmoSenaOpen)window.pmoSenaOpen();setTimeout(function(){window.pmoSenaSend(x.ask)},60)}});pop.querySelector('[data-a=read]').onclick=function(e){",
  },
];

// Khusus uji lokal: arahkan panggilan Claude API ke server tiruan (jangan diisi di server produksi).
const TEST_URL = String(process.env.SENA_TEST_API_URL || '').trim();
const SENA_BRIDGE_FINAL = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(TEST_URL)
  ? SENA_BRIDGE + '\n;AI.URL = ' + JSON.stringify(TEST_URL) + ';\n'
  : SENA_BRIDGE;

module.exports = { SENA_BRIDGE: SENA_BRIDGE_FINAL, SENA_WIDGET_JS, SENA_PATCHES };

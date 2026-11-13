/**
 * EPCC CONTROL · PROCUREMENT, CONSTRUCTION & COMMISSIONING
 *
 * Alur:
 *   1. ADMIN menyetel baseline per bidang (PROC / CONS): unggah template baseline atau laporan mingguan kontraktor.
 *      File dibaca di browser (JSZip) dan dikirim sebagai data. Item = WBS level 4 (level 5 digabung ke induknya).
 *      Procurement: tipe LN (impor) / LK (lokal), milestone FAT/FOB/MOS (LN) atau MOS (LK); skema 4+2 per proyek: Manufacturing/FAT/FOB/MOS (LN) dan Fabrikasi/MOS (LK), jadwal impor LN boleh dilengkapi setelah baseline disimpan.
 *      Construction: milestone PREP/FAB/INS/FIN, atau tahap per disiplin (profil tahap per item, maks. 4 tahap) bila baseline memuat params.prof;
 *      logika predecessor per grup (level 3) untuk CPM.
 *   2. Realisasi mingguan: unggah laporan kontraktor atau input manual milestone per item.
 *   3. Item impor: tanggal aktual/perkiraan (FAT, FOB, ETA, MOS) bisa diperbarui kapan saja.
 *
 * Sheet (dibuat otomatis):
 *   EPC_PENGATURAN  PROYEK_ID | BIDANG | REVISI_AKTIF | DIPERBARUI_OLEH | DIPERBARUI
 *   EPC_REVISI      riwayat baseline + parameter (JSON: milestone, grup, logika) per revisi
 *   EPC_ITEM        daftar item per revisi (rencana kumulatif mingguan & jadwal impor dalam JSON)
 *   EPC_REALISASI   status TERAKHIR per item (milestone, progres, tanggal aktual/perkiraan)
 *   EPC_PROGRES     ringkasan per minggu (kurva realisasi bidang)
 *   EPC_EVIDENCE    lampiran pelengkap commissioning per aktivitas + tahap (link / unggah ke folder Drive tim proyek)
 *   EPC_PUNCH       punch list commissioning (kategori A/B/C, status OPEN → DIKERJAKAN → SIAP → CLOSED)
 *
 * Commissioning: progres aktivitas = 30% tahap 1 + 20% tahap 2 + 50% tahap 3 (input per tahap, evidence hanya pelengkap).
 * Punch kategori A yang belum CLOSED menahan tahap 3 (uji kinerja) aktivitas pengujian di sistem / aktivitas terkait.
 */
const EPC = {
  SHEETS: {
    SETTING: ['EPC_PENGATURAN', ['PROYEK_ID', 'BIDANG', 'REVISI_AKTIF', 'DIPERBARUI_OLEH', 'DIPERBARUI']],
    REVISI: ['EPC_REVISI', ['PROYEK_ID', 'BIDANG', 'REVISI', 'CATATAN_REVISI', 'JUMLAH_ITEM', 'TOTAL_BOBOT', 'PARAMETER_JSON', 'NAMA_FILE', 'DIUNGGAH_OLEH', 'DIUNGGAH_PADA']],
    ITEM: ['EPC_ITEM', ['PROYEK_ID', 'BIDANG', 'REVISI', 'NO', 'ID', 'KODE', 'URAIAN', 'DISIPLIN', 'GRUP_KODE', 'GRUP', 'TIPE', 'BOBOT', 'SATUAN', 'VOLUME', 'RENCANA_JSON', 'JADWAL_JSON', 'LINK_CONS']],
    REAL: ['EPC_REALISASI', ['PROYEK_ID', 'BIDANG', 'WEEK', 'ID', 'M1', 'M2', 'M3', 'M4', 'PROGRES', 'TANGGAL_JSON', 'SUMBER', 'DIPERBARUI_OLEH', 'DIPERBARUI']],
    PROGRES: ['EPC_PROGRES', ['PROYEK_ID', 'BIDANG', 'WEEK', 'RENCANA', 'REALISASI', 'DEVIASI', 'DISIPLIN_JSON', 'SUMBER', 'NAMA_FILE', 'DIUNGGAH_OLEH', 'DIUNGGAH_PADA']],
    EVIDENCE: ['EPC_EVIDENCE', ['ID', 'PROYEK_ID', 'BIDANG', 'ITEM_ID', 'TAHAP', 'JUDUL', 'SUMBER', 'URL', 'FILE_ID', 'NAMA_FILE', 'UKURAN', 'CATATAN', 'STATUS', 'DIUNGGAH_OLEH', 'DIUNGGAH_PADA']],
    PUNCH: ['EPC_PUNCH', ['ID', 'PROYEK_ID', 'NO', 'GRUP_KODE', 'ITEM_ID', 'URAIAN', 'KATEGORI', 'PIC', 'TGL_TEMUAN', 'TARGET', 'STATUS', 'CATATAN', 'FOTO_JSON', 'DIBUAT_OLEH', 'DIBUAT_PADA', 'DIPERBARUI_OLEH', 'DIPERBARUI', 'DITUTUP_OLEH', 'DITUTUP_PADA']],
    TIPE: ['EPC_UBAH_TIPE', ['PROYEK_ID', 'ID', 'KODE', 'TIPE', 'LONG_LEAD', 'TIPE_LAMA', 'ALASAN', 'DIUBAH_OLEH', 'DIUBAH_PADA']],
    ALIAS: ['EPC_PEMETAAN', ['PROYEK_ID', 'BIDANG', 'ID_LAPORAN', 'ID_BASELINE', 'KODE_LAPORAN', 'URAIAN_LAPORAN', 'DIBUAT_OLEH', 'DIBUAT_PADA']],
    SESUAI: ['EPC_PENYESUAIAN', ['PROYEK_ID', 'BIDANG', 'REVISI', 'JENIS', 'ID', 'KODE', 'NILAI_LAMA', 'NILAI_BARU', 'CATATAN', 'OLEH', 'PADA']],
    LOE: ['EPC_LOE', ['PROYEK_ID', 'ID', 'KODE', 'LOE', 'ALASAN', 'DIUBAH_OLEH', 'DIUBAH_PADA']],
    RTLMODE: ['EPC_TINDAK_LANJUT_MODE', ['PROYEK_ID', 'MODE', 'ALASAN', 'DIUBAH_OLEH', 'DIUBAH_PADA']],
    RTL: ['EPC_TINDAK_LANJUT', ['ID', 'PROYEK_ID', 'BIDANG', 'KUNCI', 'GRUP_KODE', 'GRUP_NAMA', 'AKSI', 'PIC', 'TARGET', 'STATUS', 'CATATAN', 'WEEK_DIBUAT', 'WEEK_SELESAI', 'DIBUAT_OLEH', 'DIBUAT_PADA', 'DIPERBARUI_OLEH', 'DIPERBARUI']],
    KIRIM: ['EPC_PENGIRIMAN', ['ID', 'PROYEK_ID', 'MODA', 'NO_DOK', 'CARRIER', 'ARMADA', 'IMO', 'MUATAN', 'POL', 'POD', 'ETD', 'ATD', 'ETA_AWAL', 'ETA', 'ATA', 'CLEARANCE_HARI', 'TIBA_SITE', 'STATUS', 'ITEM_JSON', 'DOK_URL', 'DOK_FILE_ID', 'DOK_NAMA', 'CATATAN', 'RIWAYAT_JSON', 'DIBUAT_OLEH', 'DIBUAT_PADA', 'DIPERBARUI_OLEH', 'DIPERBARUI']]
  },
  FIELDS: { PROC: 'Procurement', CONS: 'Construction', COM: 'Commissioning' },
  MS: { PROC: [40, 40, 20, 100], CONS: [10, 40, 40, 10], COM: [30, 20, 50, 0] },
  // Commissioning: tahap per aktivitas (UJI = pengujian, DOK = dokumen / sertifikasi)
  COM_STAGES: { UJI: ['Pre-commissioning', 'Commissioning', 'Uji kinerja'], DOK: ['Pengajuan', 'Pemeriksaan / inspeksi', 'Terbit / disahkan'] },
  PUNCH_CAT: ['A', 'B', 'C'],
  PUNCH_ST: ['OPEN', 'DIKERJAKAN', 'SIAP', 'CLOSED'],
  FILE_MIME: ['application/pdf', 'image/jpeg', 'image/png'],
  FILE_MAX: 20 * 1024 * 1024,
  SHIP_ST: ['FOB', 'BERANGKAT', 'PERJALANAN', 'TIBA', 'CLEARANCE', 'SITE'],
  CLEARANCE_DAYS: 14,
  // Rencana tindak lanjut: aktif bila logika CPM Construction sudah diisi. Wajib = tertinggal >= 40 poin DAN float terhadap kontrak <= 4 minggu.
  RTL_DEV: -40,
  RTL_FLOAT: 4,
  // item sepanjang proyek (level of effort): otomatis bila rentang rencana >= LOE_SPAN x durasi proyek dan mulai <= LOE_START x durasi,
  // atau uraiannya berpola LOE (K3, mobilisasi, keet, dokumentasi, ...) dengan rentang >= LOE_SPAN_KW x durasi. ADMIN bisa mengoreksi.
  LOE_SPAN: 0.5, LOE_START: 0.15, LOE_SPAN_KW: 0.25,
  LOE_RE: 'k3|hse|keselamatan|hazop|hazid|mobilisasi|demobilisasi|dokumentasi|administrasi|asuransi|qa ?/? ?qc|manajemen|security|keamanan|kebersihan|house ?keeping',
  RTL_ST: ['RENCANA', 'PROSES', 'SELESAI'],
  WEIGHT_TOL: 0.0005
};

// ===================== API =====================

/** Data halaman EPCC (Procurement / Construction) untuk satu proyek. */
function getEpccData(token, projectId, field) {
  dbReadOnly_(); // C1b: baca DATA MINGGUAN/BULANAN dari cache
  const user = requireUser_(token);
  const F = epcField_(field);
  const db = loadDb_();
  const role = String(user.role || '').toUpperCase();
  const list = db.allProjects.filter(function(p) { return userCanAccess_(user, p); });
  if (!list.length) throw new Error('Akun Anda belum memiliki akses proyek.');
  const store = epcStoreC_();
  const ready = list.filter(function(x) { try { return !!db.weekly.projects[x.id] && projectReady_(db, x).ready; } catch (e) { return false; } });
  const pick = ready.length ? ready : list;
  let p = projectId ? (list.find(function(x) { return x.id === normKey_(projectId); }) || findProject_(list, projectId)) : null;
  if (!p) p = list.find(function(x) { return userCanOperateProject_(user, x); }) || pick.find(function(x) { return store.setting[x.id + '|' + F]; }) || pick[0];
  const shown = list;
  const out = epcView_(db, store, p, F);
  out.success = true;
  out.user = { name: user.name || user.username || '', username: user.username || '', role: role };
  out.canManage = userCanOperateProject_(user, p);
  out.canInput = out.canManage;
  try { out.setup = setupHint_(db, user); } catch (e) { out.setup = null; }
  out.canSubmit = !out.canManage && ktrCanField_(user, p, F);
  if (ktrIs_(user)) out.ktrFields = ktrFieldsOf_(user);
  out.projects = shown.map(function(x) { return { id: x.id, name: x.name, fullName: x.fullName || x.name, hasBaseline: !!store.setting[x.id + '|' + F] }; });
  return out;
}

/** Simpan baseline bidang sebagai revisi baru. Selisih bobot hanya peringatan; jadwal impor wajib untuk item LN. */
function saveEpccBaseline(token, projectId, field, payload, fileName) {
  const ctx = epcAdminCtx_(token, projectId);
  const F = epcField_(field);
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const store = epcStore_();
    const v = epcValidateBaseline_(ctx, F, payload);
    if (v.errors.length) return { success: false, errors: v.errors };
    const pid = ctx.p.id, now = new Date(), by = ctx.user.username || ctx.user.name || '';
    const revs = store.revisions[pid + '|' + F] || [];
    const rev = revs.length ? Math.max.apply(null, revs.map(function(r) { return r.rev; })) + 1 : 0;
    const rows = v.items.map(function(it, i) {
      return [pid, F, rev, i + 1, it.id, it.c, it.n, it.d, it.gc, it.g, it.t, it.w, it.sat, it.vol, JSON.stringify(it.plan), it.jd ? JSON.stringify(it.jd) : '', it.link || ''];
    });
    epcAppend_(EPC.SHEETS.ITEM, rows);
    epcAppend_(EPC.SHEETS.REVISI, [[pid, F, rev, String(payload.note || ''), v.items.length, epcRound_(v.total, 6), JSON.stringify(v.params), String(fileName || ''), by, now]]);
    epcUpsert_(EPC.SHEETS.SETTING, [pid, F], [pid, F, rev, by, now]);
    return { success: true, rev: rev, warnings: v.warnings, data: getEpccData(token, pid, F) };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Simpan realisasi satu WEEK.
 * payload: { week, source: 'LAPORAN'|'MANUAL', rows: [{ id, m: [4], pg: progres% | null }], history: [{ week, plan, real }] (opsional, dari laporan) }
 */
function saveEpccWeek(token, projectId, field, payload, fileName) {
  const F = epcField_(field);
  const u0 = requireUser_(token);
  if (ktrIs_(u0)) {
    const kctx = ktrCtx_(u0, projectId, F), lk = pmoLock_('EPCENG');
    lk.waitLock(30000);
    try { const pays = {}; pays[F] = payload || {}; return ktrSubmitEpc_(token, kctx, epcStore_(), pays, fileName, F); } finally { lk.releaseLock(); }
  }
  const ctx = epcAdminCtx_(token, projectId);
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const res = epcWeekCore_(ctx, epcStore_(), F, payload, fileName, false);
    if (!res.success) return res;
    res.data = getEpccData(token, ctx.p.id, F);
    return res;
  } finally {
    lock.releaseLock();
  }
}

/** Inti simpan realisasi satu bidang. dry = hanya validasi (tanpa menulis). */
function epcWeekCore_(ctx, store, F, payload, fileName, dry) {
  {
    const pid = ctx.p.id, key = pid + '|' + F;
    const set = store.setting[key];
    if (!set) throw new Error('Baseline ' + EPC.FIELDS[F] + ' belum disimpan.');
    const items = store.items[key + '|' + set.rev] || [];
    const params = epcParamsOf_(store, key, set.rev);
    const week = Math.round(Number(payload && payload.week));
    if (!(week >= 1)) throw new Error('WEEK tidak valid.');
    if (ctx.info.maxWeek && week > ctx.info.maxWeek + 52) throw new Error('WEEK ' + week + ' di luar rentang proyek.');
    const state = store.real[key] || {}, stWeek = store.realWeek[key] || 0;
    if (stWeek && week < stWeek) throw new Error('Realisasi terakhir sudah WEEK ' + stWeek + '. Minggu sebelumnya tidak bisa ditimpa.');
    const source = ['LAPORAN', 'TEMPLATE'].indexOf(String(payload.source || '').toUpperCase()) >= 0 ? String(payload.source).toUpperCase() : 'MANUAL';
    const byId = {}; (payload.rows || []).forEach(function(r) { if (r && r.id) byId[String(r.id)] = r; });
    const errors = [];
    const now = new Date(), by = ctx.user.username || ctx.user.name || '';
    const out = items.map(function(it) {
      const prev = state[it.id] || { m: [0, 0, 0, 0], pg: 0, tgl: null };
      const r = byId[it.id];
      let m = prev.m.slice(), pg = prev.pg;
      if (r) {
        m = [0, 1, 2, 3].map(function(k) { const x = Number(r.m && r.m[k]); return isFinite(x) ? Math.max(0, Math.min(100, x)) : (prev.m[k] || 0); });
        if (F === 'PROC' && source === 'LAPORAN') epcKeepExtra_(it, params, m, prev.m);
        if (source === 'MANUAL' && week > stWeek) {
          [0, 1, 2, 3].forEach(function(k) { if (m[k] + 1e-9 < (prev.m[k] || 0)) errors.push(it.c + ' ' + it.n + ': nilai turun dari minggu lalu (' + epcRound_(prev.m[k], 2) + ' → ' + epcRound_(m[k], 2) + ').'); });
        }
        pg = r.pg === null || r.pg === undefined || r.pg === '' ? epcProg_(F, it, m, params) : Math.max(0, Math.min(100, Number(r.pg) || 0));
      }
      return { it: it, m: m, pg: pg, tgl: prev.tgl, src: r ? source : (prev.src || '') };
    });
    if (F === 'COM') {
      const gate = epcPunchGate_(pid, items);
      out.forEach(function(o) { const g = gate[o.it.id], pm = (state[o.it.id] || {}).m || [0, 0, 0, 0]; if (g && o.m[2] >= 99.995 && (Number(pm[2]) || 0) < 99.995) errors.push(o.it.c + ' ' + o.it.n + ': uji kinerja belum bisa 100% karena punch kategori A ' + g.join(', ') + ' belum ditutup.'); });
    }
    if (errors.length) return { success: false, errors: errors.slice(0, 30) };
    if (dry) return { success: true, week: week, summary: epcSummary_(items, out, week) };
    const rows = out.map(function(o) { return [pid, F, week, o.it.id, epcRound_(o.m[0], 4), epcRound_(o.m[1], 4), epcRound_(o.m[2], 4), epcRound_(o.m[3], 4), epcRound_(o.pg, 4), o.tgl ? JSON.stringify(o.tgl) : '', o.src, by, now]; });
    wrCapturePrevious_(pid, F);
    epcReplaceBlock_(EPC.SHEETS.REAL, pid, F, rows);
    const sum = epcSummary_(items, out, week);
    epcUpsertProgress_(pid, F, week, [pid, F, week, epcRound_(sum.plan, 4), epcRound_(sum.real, 4), epcRound_(sum.real - sum.plan, 4), JSON.stringify(sum.disc), source, String(fileName || ''), by, now]);
    wrCaptureSaved_(pid, F, set.rev, rows, EPC.SHEETS.REAL[1]);
    // riwayat kurva dari laporan kontraktor: isi minggu yang belum pernah tercatat
    if (source === 'LAPORAN' && Array.isArray(payload.history) && String(payload.historyMode || '').toUpperCase() === 'REPLACE') {
      epcReplaceHistory_(pid, F, week, payload.history, fileName, by, now);
    } else if (source === 'LAPORAN' && Array.isArray(payload.history)) {
      const have = {}; (store.progress[key] || []).forEach(function(h) { have[h.week] = true; });
      const hist = payload.history.filter(function(h) { const w = Number(h.week); return w >= 1 && w < week && !have[w] && isFinite(Number(h.real)); })
        .map(function(h) { return [pid, F, Number(h.week), epcRound_(Number(h.plan) || 0, 4), epcRound_(Number(h.real), 4), epcRound_(Number(h.real) - (Number(h.plan) || 0), 4), '', 'LAPORAN (riwayat)', String(fileName || ''), by, now]; });
      if (hist.length) epcAppend_(EPC.SHEETS.PROGRES, hist);
    }
    return { success: true, week: week, summary: sum };
  }
}

/** Perbarui tanggal aktual / perkiraan item impor (FAT, FOB, ETA, MOS); tgl.jd (opsional) = jadwal rencana PO–MOS di baseline aktif. */
function saveEpccDates(token, projectId, itemId, tgl) {
  const ctx = epcAdminCtx_(token, projectId);
  const F = 'PROC', pid = ctx.p.id, key = pid + '|' + F;
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const store = epcStore_();
    const set = store.setting[key];
    if (!set) throw new Error('Baseline Procurement belum disimpan.');
    const it = (store.items[key + '|' + set.rev] || []).find(function(x) { return x.id === String(itemId); });
    if (!it) throw new Error('Item tidak ditemukan di baseline.');
    if (tgl && tgl.jd) {
      if (it.t !== 'LN') throw new Error('Jadwal impor hanya untuk item LN.');
      const j = tgl.jd, nj = { vendor: String(j.vendor || '').trim().slice(0, 120), negara: String(j.negara || '').trim().slice(0, 60) };
      ['po', 'fat', 'fob', 'eta', 'mos'].forEach(function(k) { const v = epcIso_(j[k]); if (v) nj[k] = v; });
      const ord = ['po', 'fat', 'fob', 'eta', 'mos'].filter(function(k) { return nj[k]; });
      for (let q = 1; q < ord.length; q++) if (nj[ord[q]] < nj[ord[q - 1]]) throw new Error('Urutan jadwal harus PO ≤ FAT ≤ FOB ≤ ETA ≤ MOS (' + ord[q].toUpperCase() + ' lebih awal dari ' + ord[q - 1].toUpperCase() + ').');
      const ish = epcSheet_(EPC.SHEETS.ITEM, true), last = ish.getLastRow();
      let row = 0;
      if (last >= 2) {
        const iv = ish.getRange(2, 1, last - 1, 5).getValues();
        for (let r = 0; r < iv.length; r++) {
          if (String(iv[r][0]).trim().toUpperCase() === pid && String(iv[r][1]).trim().toUpperCase() === F && Number(iv[r][2]) === Number(set.rev) && String(iv[r][4]) === it.id) { row = r + 2; break; }
        }
      }
      if (!row) throw new Error('Baris item ' + it.c + ' tidak ditemukan di sheet ' + EPC.SHEETS.ITEM[0] + '.');
      const col = EPC.SHEETS.ITEM[1].indexOf('JADWAL_JSON') + 1;
      ish.getRange(row, col).setValue(JSON.stringify(nj));
    }
    const clean = {};
    ['fatA', 'fobA', 'etaA', 'mosA', 'etaF', 'mosF'].forEach(function(k) { const v = epcIso_(tgl && tgl[k]); if (v) clean[k] = v; });
    clean.note = String((tgl && tgl.note) || '').slice(0, 300);
    const sh = epcSheet_(EPC.SHEETS.REAL, true);
    const n = sh.getLastRow();
    const now = new Date(), by = ctx.user.username || ctx.user.name || '';
    if (n >= 2) {
      const v = sh.getRange(2, 1, n - 1, 4).getValues();
      for (let i = 0; i < v.length; i++) {
        if (String(v[i][0]).trim().toUpperCase() === pid && String(v[i][1]).trim().toUpperCase() === F && String(v[i][3]) === it.id) {
          sh.getRange(i + 2, 10).setValue(JSON.stringify(clean)); sh.getRange(i + 2, 12, 1, 2).setValues([[by, now]]);
          return getEpccData(token, pid, F);
        }
      }
    }
    sh.appendRow([pid, F, store.realWeek[key] || '', it.id, 0, 0, 0, 0, 0, JSON.stringify(clean), '', by, now]);
    return getEpccData(token, pid, F);
  } finally {
    lock.releaseLock();
  }
}

// ===================== VALIDASI & PERHITUNGAN =====================

function epcField_(f) {
  const F = String(f || '').toUpperCase();
  if (F === 'PROC' || F === 'PROCUREMENT') return 'PROC';
  if (F === 'CONS' || F === 'CONSTRUCTION') return 'CONS';
  if (F === 'COM' || F === 'COMM' || F === 'COMMISSIONING') return 'COM';
  throw new Error('Bidang tidak dikenal (Procurement / Construction / Commissioning).');
}

function epcValidateBaseline_(ctx, F, payload) {
  const errors = [], warnings = [];
  const src = payload && Array.isArray(payload.items) ? payload.items : [];
  if (!src.length) errors.push('Tidak ada item yang terbaca.');
  const p0 = (payload && payload.params) || {};
  const prof = F === 'CONS' ? epcProfClean_(p0.prof, errors) : null, pKnown = {}, pMiss = [], pBad = [];
  (prof || []).forEach(function(x) { pKnown[x.c] = 1; });
  const seen = {}, items = [];
  const jdMiss = [];
  src.forEach(function(x, i) {
    const id = String(x.id || x.c || '').trim(), c = String(x.c || '').trim(), n = String(x.n || '').trim();
    if (!id || !n) { errors.push('Baris item ' + (i + 1) + ': ID/kode atau uraian kosong.'); return; }
    if (seen[id]) { errors.push('ID item ganda: ' + id + '.'); return; }
    seen[id] = 1;
    const w = Number(x.w);
    const plan = (Array.isArray(x.plan) ? x.plan : []).map(function(v) { return epcRound_(Math.max(0, Math.min(100, Number(v) || 0)), 3); });
    let jd = null;
    const t = F === 'PROC' ? (String(x.t || '').toUpperCase() === 'LN' ? 'LN' : 'LK') : F === 'COM' ? (String(x.t || '').toUpperCase() === 'DOK' ? 'DOK' : 'UJI') : (prof ? String(x.t || '').trim().toUpperCase() : '');
    if (prof) { if (!t) pMiss.push(c); else if (!pKnown[t]) pBad.push(c + ' (' + t + ')'); }
    if (F === 'PROC' && t === 'LN') {
      const j = x.jd || {};
      jd = { vendor: String(j.vendor || '').slice(0, 120), negara: String(j.negara || '').slice(0, 60) };
      const miss = [];
      ['po', 'fat', 'fob', 'eta', 'mos'].forEach(function(k) { const v = epcIso_(j[k]); if (v) jd[k] = v; else miss.push(k.toUpperCase()); });
      if (miss.length) jdMiss.push(c);
      else if (!(jd.po <= jd.fat && jd.fat <= jd.fob && jd.fob <= jd.eta && jd.eta <= jd.mos)) warnings.push('Urutan tanggal impor ' + c + ' tidak berurutan (PO ≤ FAT ≤ FOB ≤ ETA ≤ MOS).');
    }
    items.push({ id: id, c: c, n: n, d: String(x.d || '').trim(), gc: String(x.gc || c).trim(), g: String(x.g || '').trim(), t: t, w: isFinite(w) ? w : 0,
      sat: String(x.sat || ''), vol: x.vol === null || x.vol === undefined ? '' : x.vol, plan: plan, jd: jd, link: F === 'PROC' ? String(x.link || '').trim() : '' });
    if (!(w > 0)) warnings.push('Bobot item ' + c + ' kosong / 0.');
    if (!plan.length || plan[plan.length - 1] < 99.99) warnings.push('Rencana kumulatif ' + c + ' tidak mencapai 100%.');
  });
  if (pMiss.length) errors.push(pMiss.length + ' item belum diberi profil tahap: ' + pMiss.slice(0, 10).join(', ') + (pMiss.length > 10 ? ', …' : '') + '.');
  if (pBad.length) errors.push(pBad.length + ' item memakai profil tahap yang tidak ada di daftar: ' + pBad.slice(0, 10).join(', ') + (pBad.length > 10 ? ', …' : '') + '.');
  if (jdMiss.length) warnings.push('Jadwal impor (PO, FAT, FOB, ETA, MOS) belum lengkap untuk ' + jdMiss.length + ' item LN: ' + jdMiss.slice(0, 12).join(', ') + (jdMiss.length > 12 ? ', …' : '') + '. Baseline tetap bisa disimpan; lengkapi lewat menu Long lead & impor.');

  const total = items.reduce(function(a, x) { return a + x.w; }, 0);
  const bid = epcFieldWeight_(ctx, F);
  if (bid !== null && Math.abs(total - bid) > EPC.WEIGHT_TOL) warnings.push('Total bobot ' + epcRound_(total, 4) + '% ≠ bobot ' + EPC.FIELDS[F] + ' ' + epcRound_(bid, 4) + '%.');
  const p = payload.params || {};
  const ms = (Array.isArray(p.ms) && (p.ms.length === 4 || (F === 'PROC' && p.ms.length === 6)) ? p.ms : EPC.MS[F]).map(function(v) { return Number(v) || 0; });
  if (F === 'PROC' && ms.length === 6) {
    if (!(ms[4] > 0) || !(ms[5] > 0)) errors.push('Skema 4 tahap impor + 2 tahap lokal: bobot Manufacturing (impor) dan Fabrikasi (lokal) wajib lebih dari 0.');
    if (Math.abs(ms[4] + ms[0] + ms[1] + ms[2] - 100) > 0.01) errors.push('Bobot Manufacturing + FAT + FOB + MOS impor harus 100.');
    if (Math.abs(ms[5] + ms[3] - 100) > 0.01) errors.push('Bobot Fabrikasi + MOS lokal harus 100.');
  }
  const groups = (Array.isArray(p.groups) ? p.groups : []).slice(0, 2000).map(function(g) { return { c: String(g.c || ''), n: String(g.n || ''), l: Number(g.l) || 0, w: Number(g.w) || 0, at: Number(g.at) || 0 }; });
  const logic = F === 'CONS' ? (Array.isArray(p.logic) ? p.logic : []).map(function(r) { return [String(r[0] || '').trim(), String(r[1] || '').trim(), ['FS', 'SS', 'FF'].indexOf(String(r[2] || '').toUpperCase()) >= 0 ? String(r[2]).toUpperCase() : 'FS', Number(r[3]) || 0]; }).filter(function(r) { return r[0] && r[1]; }) : [];
  const params = { ms: ms, groups: groups, logic: logic, bidang: bid, source: String(p.source || ''), sourceWeek: Number(p.sourceWeek) || null };
  if (prof) params.prof = prof;
  return { errors: errors, warnings: warnings, items: items, total: total, params: params };
}

/**
 * Construction tahap per disiplin: params.prof = [{ c: kode, n: nama disiplin, st: [nama tahap 1..4], w: [bobot 1..4] }], item.t = kode profil.
 * Nilai realisasi tetap di slot M1..M4 (tahap 1..4 profil). Tanpa params.prof Construction memakai PREP/FAB/INS/FIN seperti sebelumnya.
 */
function epcProfClean_(arr, errors) {
  if (!Array.isArray(arr) || !arr.length) return null;
  const out = [], seen = {};
  arr.slice(0, 60).forEach(function(x, i) {
    const c = String((x && x.c) || '').trim().toUpperCase();
    if (!/^[A-Z0-9_\-]{1,20}$/.test(c)) { errors.push('Profil tahap baris ' + (i + 1) + ': kode tidak valid (huruf, angka, _ atau -, maks. 20).'); return; }
    if (seen[c]) { errors.push('Profil tahap ' + c + ' ganda.'); return; }
    seen[c] = 1;
    const w = [0, 1, 2, 3].map(function(k) { const v = Number(x.w && x.w[k]); return isFinite(v) && v > 0 ? epcRound_(v, 4) : 0; });
    const st = [0, 1, 2, 3].map(function(k) { return w[k] > 0 ? String((x.st && x.st[k]) || '').trim().slice(0, 60) : ''; });
    const sum = w.reduce(function(a, v) { return a + v; }, 0);
    if (Math.abs(sum - 100) > 0.01) errors.push('Profil tahap ' + c + ': jumlah bobot ' + epcRound_(sum, 2) + ', harus 100.');
    st.forEach(function(s, k) { if (w[k] > 0 && !s) errors.push('Profil tahap ' + c + ': tahap ' + (k + 1) + ' berbobot tetapi tanpa nama.'); });
    out.push({ c: c, n: String((x && x.n) || c).trim().slice(0, 80), st: st, w: w });
  });
  return out.length ? out : null;
}
function epcConsW_(params, t) {
  const P = params && params.prof; if (!P || !P.length || !t) return null;
  for (let i = 0; i < P.length; i++) if (P[i].c === t) return P[i].w;
  return null;
}

/** Progres item dari milestone (% item). */
function epcProg_(F, it, m, params) {
  const w = (F === 'CONS' && epcConsW_(params, it && it.t)) || (params && params.ms) || EPC.MS[F];
  if (F === 'PROC') return it.t === 'LN' ? (w[0] * m[0] + w[1] * m[1] + w[2] * m[2] + (Number(w[4]) || 0) * (Number(m[3]) || 0)) / 100 : (w[3] * m[3] + (Number(w[5]) || 0) * (Number(m[0]) || 0)) / 100;
  return (w[0] * m[0] + w[1] * m[1] + w[2] * m[2] + w[3] * m[3]) / 100;
}

/**
 * Skema Procurement 4 tahap impor + 2 tahap lokal (per proyek, dari baseline): ms = [FAT, FOB, MOS impor, MOS lokal, Manufacturing impor, Fabrikasi lokal].
 * Slot realisasi: item LN → M4 = Manufacturing, M1 = FAT, M2 = FOB, M3 = MOS; item LK → M1 = Fabrikasi, M4 = MOS. Baseline lama (4 bobot) tidak berubah.
 */
function epcProcX_(params) { const w = (params && params.ms) || []; return Number(w[4]) > 0 || Number(w[5]) > 0; }
/** Laporan kontraktor format lama tidak memuat Manufacturing / Fabrikasi: nilai tahap itu dipertahankan. */
function epcKeepExtra_(it, params, m, pm) { if (!epcProcX_(params)) return; if (it.t === 'LN') m[3] = Number(pm && pm[3]) || 0; else m[0] = Number(pm && pm[0]) || 0; }

/** Ringkasan bidang (% bidang) pada WEEK tertentu. */
function epcSummary_(items, out, week) {
  let W = 0, P = 0, R = 0; const disc = {};
  out.forEach(function(o) {
    const it = o.it, w = it.w || 0, pl = epcPlanAt_(it.plan, week);
    W += w; P += w * pl; R += w * o.pg;
    const d = disc[it.d || '-'] = disc[it.d || '-'] || { w: 0, plan: 0, real: 0 };
    d.w += w; d.plan += w * pl; d.real += w * o.pg;
  });
  Object.keys(disc).forEach(function(k) { const d = disc[k]; d.plan = d.w ? epcRound_(d.plan / d.w, 4) : 0; d.real = d.w ? epcRound_(d.real / d.w, 4) : 0; d.w = epcRound_(d.w, 6); });
  return { plan: W ? P / W : 0, real: W ? R / W : 0, w: W, disc: disc };
}
function epcPlanAt_(plan, week) { if (!plan || !plan.length || week < 1) return 0; return Number(plan[Math.min(plan.length, week) - 1]) || 0; }

/** Bobot bidang dari Setup proyek (BOBOT_PROCUREMENT / BOBOT_CONSTRUCTION di DATA MINGGUAN). */
function epcFieldWeight_(ctx, F) {
  try {
    const W = ctx.db.weekly, item = 'BOBOT_' + EPC.FIELDS[F].toUpperCase();
    const wk = Math.max(1, ctx.info.latestWeek || 1);
    let v = weekPercent_(W, ctx.p.id, item, wk);
    if (v === null) v = lastPercentBefore_(W, ctx.p.id, item, wk + 1);
    if (v === null) v = weekPercent_(W, ctx.p.id, item, 1);
    return v === null ? null : Number(v);
  } catch (e) { return null; }
}

function epcIso_(v) { return engIso_(v); }
function epcRound_(v, d) { return engRound_(v, d); }

// ===================== TAMPILAN =====================

function epcView_(db, store, p, F) {
  const info = engInfo_(db, p), key = p.id + '|' + F;
  const set = store.setting[key];
  const revs = (store.revisions[key] || []).slice().sort(function(a, b) { return b.rev - a.rev; });
  const ctx = { db: db, p: p, info: info };
  const out = {
    field: F, fieldName: EPC.FIELDS[F],
    project: { id: p.id, name: p.name, fullName: p.fullName || p.name, contractor: info.contractor, start: info.startIso, finish: info.finishIso, maxWeek: info.maxWeek, currentWeek: info.currentWeek, latestWeeklyWeek: info.latestWeek },
    bidangWeight: epcFieldWeight_(ctx, F),
    setting: set ? { rev: set.rev, by: set.by, at: set.atText } : { rev: null },
    revisions: revs.map(function(r) { return { rev: r.rev, note: r.note, items: r.items, total: r.total, file: r.file, by: r.by, at: r.atText }; }),
    params: null, items: [], state: {}, stateWeek: null, history: [],
    linkCons: null
  };
  // Procurement: item construction yang dituju (untuk kebutuhan pasang & CPM); Construction: barang procurement yang ditunggu
  const other = F === 'PROC' ? 'CONS' : 'PROC', okey = p.id + '|' + other, oset = F === 'COM' ? null : store.setting[okey];
  if (F === 'COM') {
    out.stages = EPC.COM_STAGES;
    out.evidence = epcEvidenceOf_(p.id);
    out.punch = epcPunchOf_(p.id);
    try { out.drive = engDriveOf_(p.id); } catch (e) { out.drive = null; }
    out.fileMaxMb = EPC.FILE_MAX / 1048576;
  }
  if (F === 'PROC') {
    out.ships = epcShipsOf_(p.id);
    try { out.drive = engDriveOf_(p.id); } catch (e) { out.drive = null; }
    out.fileMaxMb = EPC.FILE_MAX / 1048576;
    try { out.aiReady = !!String(PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY') || '').trim(); } catch (e) { out.aiReady = false; }
    out.clearanceDays = EPC.CLEARANCE_DAYS;
  }
  if (F === 'CONS') out.loeRule = { span: EPC.LOE_SPAN, start: EPC.LOE_START, spanKw: EPC.LOE_SPAN_KW, re: EPC.LOE_RE };
  if (oset) {
    const oitems = store.items[okey + '|' + oset.rev] || [], ost = store.real[okey] || {};
    if (F === 'PROC') {
      out.linkCons = oitems.map(function(it) { return { id: it.id, c: it.c, n: it.n, gc: it.gc, g: it.g, plan: it.plan }; });
    } else {
      out.linkProc = oitems.filter(function(it) { return it.link; }).map(function(it) { const s = ost[it.id] || {}; return { id: it.id, c: it.c, n: it.n, t: it.t, link: it.link, plan: it.plan, jd: it.jd, pg: s.pg || 0, m: s.m || [0, 0, 0, 0], tgl: s.tgl || null }; });
    }
  }
  try { const al = epcAliasOf_(p.id, F); out.alias = {}; out.aliasList = al.map(function(a) { out.alias[a.lap] = a.base; return a; }); } catch (e) { out.alias = {}; out.aliasList = []; }
  if (!set) return out;
  out.params = epcParamsOf_(store, key, set.rev);
  out.items = (store.items[key + '|' + set.rev] || []).map(function(it) { const x = { id: it.id, c: it.c, n: it.n, d: it.d, gc: it.gc, g: it.g, t: it.t, w: it.w, sat: it.sat, vol: it.vol, plan: it.plan, jd: it.jd, link: it.link }; if (it.tlog) { x.llx = it.llx; x.tlog = it.tlog; x.t0 = it.t0; } if (it.loex) { x.loex = it.loex; x.loelog = it.loelog; } return x; });
  out.state = store.real[key] || {};
  out.stateWeek = store.realWeek[key] || null;
  out.history = (store.progress[key] || []).slice().sort(function(a, b) { return a.week - b.week; }).map(function(h) { return { week: h.week, plan: h.plan, real: h.real, dev: h.dev, disc: h.disc, src: h.src, file: h.file, by: h.by, at: h.atText }; });
  return out;
}

function epcAdminCtx_(token, projectId) {
  const user = requireUser_(token);
  const db = loadDb_();
  const id = normKey_(projectId);
  const p = db.allProjects.find(function(x) { return x.id === id; }) || findProject_(db.allProjects, projectId);
  if (!p) throw new Error('Proyek tidak ditemukan.');
  if (!userCanOperateProject_(user, p)) throw new Error('Halaman operasional EPCC hanya untuk PROYEK_ID akun Anda.');
  const info = engInfo_(db, p);
  if (!info.startIso) throw new Error('Tanggal mulai proyek (EFEKTIF_DATE_START) belum diisi. Lengkapi lewat menu Tambah / Edit Proyek.');
  return { user: user, db: db, p: p, info: info };
}

// ===================== PENYIMPANAN =====================

function epcSheet_(def, create) { return engSheet_(def, create); }
function epcRead_(def) { return engRead_(def); }
function epcAppend_(def, rows) {
  storeTouch_();
  if (!rows.length) return;
  const sh = epcSheet_(def, true);
  const start = sh.getLastRow() + 1;
  const rng = sh.getRange(start, 1, rows.length, def[1].length);
  rng.setNumberFormat('@');
  rng.setValues(rows.map(function(r) { return r.map(function(v) { return v instanceof Date ? v : (v === null || v === undefined ? '' : String(v)); }); }));
}

/** Ganti blok baris milik satu proyek + bidang. */
function epcReplaceBlock_(def, pid, F, rows) {
  storeTouch_();
  const sh = epcSheet_(def, true);
  const n = sh.getLastRow();
  if (n >= 2) {
    const v = sh.getRange(2, 1, n - 1, 2).getValues();
    const idx = []; v.forEach(function(r, i) { if (String(r[0]).trim().toUpperCase() === pid && String(r[1]).trim().toUpperCase() === F) idx.push(i); });
    if (idx.length) {
      const contiguous = idx[idx.length - 1] - idx[0] + 1 === idx.length;
      if (contiguous) sh.deleteRows(idx[0] + 2, idx.length);
      else for (let k = idx.length - 1; k >= 0; k--) sh.deleteRow(idx[k] + 2);
    }
  }
  epcAppend_(def, rows);
}

function epcUpsert_(def, keys, line) {
  storeTouch_();
  const sh = epcSheet_(def, true);
  const n = sh.getLastRow();
  if (n >= 2) {
    const v = sh.getRange(2, 1, n - 1, keys.length).getValues();
    for (let i = 0; i < v.length; i++) {
      let ok = true; for (let k = 0; k < keys.length; k++) if (String(v[i][k]).trim().toUpperCase() !== String(keys[k]).toUpperCase()) { ok = false; break; }
      if (ok) { sh.getRange(i + 2, 1, 1, line.length).setValues([line]); return; }
    }
  }
  sh.appendRow(line);
}

function epcUpsertProgress_(pid, F, week, line) {
  storeTouch_();
  const sh = epcSheet_(EPC.SHEETS.PROGRES, true);
  const n = sh.getLastRow();
  if (n >= 2) {
    const v = sh.getRange(2, 1, n - 1, 3).getValues();
    for (let i = 0; i < v.length; i++) if (String(v[i][0]).trim().toUpperCase() === pid && String(v[i][1]).trim().toUpperCase() === F && Number(v[i][2]) === week) { sh.getRange(i + 2, 1, 1, line.length).setValues([line]); return; }
  }
  sh.appendRow(line);
}

/** Muat seluruh data EPCC sekali per eksekusi. */
function epcStore_() {
  const fmtAt = function(v) { return v instanceof Date && !isNaN(v) ? formatDateId_(v) + ' ' + String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0') : String(v || ''); };
  const up = function(v) { return String(v || '').trim().toUpperCase(); };
  const js = function(v, d) { try { return v === '' || v === null || v === undefined ? d : JSON.parse(String(v)); } catch (e) { return d; } };
  const store = { setting: {}, revisions: {}, items: {}, real: {}, realWeek: {}, progress: {} };
  epcRead_(EPC.SHEETS.SETTING).forEach(function(r) {
    const id = up(r.PROYEK_ID), F = up(r.BIDANG); if (!id || !F || r.REVISI_AKTIF === '' || r.REVISI_AKTIF === null) return;
    store.setting[id + '|' + F] = { rev: Number(r.REVISI_AKTIF), by: userDisplayName_(r.DIPERBARUI_OLEH), atText: fmtAt(r.DIPERBARUI) };
  });
  epcRead_(EPC.SHEETS.REVISI).forEach(function(r) {
    const id = up(r.PROYEK_ID), F = up(r.BIDANG); if (!id || !F) return;
    (store.revisions[id + '|' + F] = store.revisions[id + '|' + F] || []).push({ rev: Number(r.REVISI), note: String(r.CATATAN_REVISI || ''), items: Number(r.JUMLAH_ITEM) || 0, total: Number(r.TOTAL_BOBOT) || 0, params: js(r.PARAMETER_JSON, null), file: String(r.NAMA_FILE || ''), by: userDisplayName_(r.DIUNGGAH_OLEH), atText: fmtAt(r.DIUNGGAH_PADA) });
  });
  epcRead_(EPC.SHEETS.ITEM).forEach(function(r) {
    const id = up(r.PROYEK_ID), F = up(r.BIDANG); if (!id || !F) return;
    const key = id + '|' + F + '|' + Number(r.REVISI);
    (store.items[key] = store.items[key] || []).push({ _no: Number(r.NO) || 0, id: String(r.ID), c: String(r.KODE || ''), n: String(r.URAIAN || ''), d: String(r.DISIPLIN || ''), gc: String(r.GRUP_KODE || ''), g: String(r.GRUP || ''),
      t: up(r.TIPE), w: Number(r.BOBOT) || 0, sat: String(r.SATUAN || ''), vol: r.VOLUME, plan: js(r.RENCANA_JSON, []), jd: js(r.JADWAL_JSON, null), link: String(r.LINK_CONS || '').trim() });
  });
  Object.keys(store.items).forEach(function(k) { store.items[k].sort(function(a, b) { return a._no - b._no; }); });
  // perubahan tipe Impor/Lokal & long lead oleh ADMIN (log; baris terakhir per item berlaku, untuk semua revisi baseline)
  store.loe = {};
  try {
    epcRead_(EPC.SHEETS.LOE).forEach(function(r) {
      const id = up(r.PROYEK_ID), iid = String(r.ID || ''); if (!id || !iid) return;
      const m = store.loe[id] = store.loe[id] || {}, o = m[iid] = m[iid] || { log: [] };
      o.v = ['YA', 'TIDAK'].indexOf(up(r.LOE)) >= 0 ? up(r.LOE) : 'AUTO';
      o.log.push({ v: o.v, why: String(r.ALASAN || ''), by: userDisplayName_(r.DIUBAH_OLEH), at: fmtAt(r.DIUBAH_PADA) });
    });
  } catch (e) {}
  store.tipe = {};
  epcRead_(EPC.SHEETS.TIPE).forEach(function(r) {
    const id = up(r.PROYEK_ID), iid = String(r.ID || ''); if (!id || !iid) return;
    const m = store.tipe[id] = store.tipe[id] || {}, o = m[iid] = m[iid] || { log: [] };
    o.t = up(r.TIPE) === 'LN' ? 'LN' : 'LK'; o.ll = ['YA', 'TIDAK'].indexOf(up(r.LONG_LEAD)) >= 0 ? up(r.LONG_LEAD) : 'AUTO';
    o.log.push({ t: o.t, ll: o.ll, from: up(r.TIPE_LAMA), why: String(r.ALASAN || ''), by: userDisplayName_(r.DIUBAH_OLEH), at: fmtAt(r.DIUBAH_PADA) });
  });
  Object.keys(store.items).forEach(function(k) {
    const parts = k.split('|'), lo = parts[1] === 'CONS' ? store.loe[parts[0]] : null; if (!lo) return;
    store.items[k].forEach(function(it) { const o = lo[it.id]; if (!o) return; it.loex = o.v; it.loelog = o.log; });
  });
  Object.keys(store.items).forEach(function(k) {
    const parts = k.split('|'), ov = parts[1] === 'PROC' ? store.tipe[parts[0]] : null; if (!ov) return;
    store.items[k].forEach(function(it) { const o = ov[it.id]; if (!o) return; it.t0 = it.t; it.t = o.t; it.llx = o.ll; it.tlog = o.log; });
  });
  epcRead_(EPC.SHEETS.REAL).forEach(function(r) {
    const id = up(r.PROYEK_ID), F = up(r.BIDANG); if (!id || !F) return;
    const key = id + '|' + F;
    (store.real[key] = store.real[key] || {})[String(r.ID)] = { m: [Number(r.M1) || 0, Number(r.M2) || 0, Number(r.M3) || 0, Number(r.M4) || 0], pg: Number(r.PROGRES) || 0, tgl: js(r.TANGGAL_JSON, null), src: String(r.SUMBER || ''), by: userDisplayName_(r.DIPERBARUI_OLEH) };
    const w = Number(r.WEEK) || 0; if (w > (store.realWeek[key] || 0)) store.realWeek[key] = w;
  });
  epcRead_(EPC.SHEETS.PROGRES).forEach(function(r) {
    const id = up(r.PROYEK_ID), F = up(r.BIDANG); if (!id || !F) return;
    (store.progress[id + '|' + F] = store.progress[id + '|' + F] || []).push({ week: Number(r.WEEK), plan: Number(r.RENCANA) || 0, real: Number(r.REALISASI) || 0, dev: Number(r.DEVIASI) || 0, disc: js(r.DISIPLIN_JSON, null), src: String(r.SUMBER || ''), file: String(r.NAMA_FILE || ''), by: userDisplayName_(r.DIUNGGAH_OLEH), atText: fmtAt(r.DIUNGGAH_PADA) });
  });
  return store;
}

function epcParamsOf_(store, key, rev) {
  const r = (store.revisions[key] || []).find(function(x) { return x.rev === rev; });
  return r && r.params ? r.params : { ms: EPC.MS[key.split('|')[1]], groups: [], logic: [] };
}

// ===================== COMMISSIONING · EVIDENCE & PUNCH LIST =====================

/** Konteks pengguna yang boleh mengisi evidence / punch (ADMIN, PIC, INPUT) untuk proyek ini. */
function epcInputCtx_(token, projectId) {
  const user = requireUser_(token);
  const role = String(user.role || '').toUpperCase();
  if (['ADMIN', 'PIC', 'INPUT'].indexOf(role) < 0) throw new Error('Akun Anda tidak memiliki akses mengisi data commissioning.');
  const db = loadDb_();
  const id = normKey_(projectId);
  const p = db.allProjects.find(function(x) { return x.id === id; }) || findProject_(db.allProjects, projectId);
  if (!p) throw new Error('Proyek tidak ditemukan.');
  if (!userCanOperateProject_(user, p)) throw new Error('Punch list hanya dapat diubah untuk PROYEK_ID akun Anda.');
  return { user: user, role: role, db: db, p: p, admin: role === 'ADMIN' };
}

function epcComItems_(pid) {
  const store = epcStore_(), key = pid + '|COM', set = store.setting[key];
  if (!set) throw new Error('Baseline Commissioning belum disimpan.');
  return { store: store, set: set, items: store.items[key + '|' + set.rev] || [], state: store.real[key] || {} };
}

/** Lampiran evidence: link (https) atau unggah file (PDF/JPG/PNG, base64) ke folder Drive tim proyek. a: {item, tahap 1-3, judul, note, url | base64+mime+fileName} */
function addEpcEvidence(token, projectId, a) {
  a = a || {};
  const ctx = epcInputCtx_(token, projectId), pid = ctx.p.id;
  const com = epcComItems_(pid);
  const it = com.items.find(function(x) { return x.id === String(a.item || ''); });
  if (!it) throw new Error('Aktivitas tidak ada di baseline Commissioning aktif.');
  const tahap = Math.round(Number(a.tahap));
  if (!(tahap >= 1 && tahap <= 3)) throw new Error('Tahap tidak valid.');
  const judul = String(a.judul || '').trim().slice(0, 160);
  if (!judul) throw new Error('Isi nama / jenis dokumen evidence.');
  const by = ctx.user.username || ctx.user.name || '', now = new Date(), note = String(a.note || '').trim().slice(0, 500);
  const eid = Utilities.getUuid().slice(0, 8).toUpperCase();
  let line;
  if (a.base64) {
    const file = epcSaveDriveFile_(pid, ['Commissioning', (it.c + ' ' + it.n).slice(0, 80), String(tahap) + ' ' + (EPC.COM_STAGES[it.t === 'DOK' ? 'DOK' : 'UJI'][tahap - 1])], a,
      it.c + '_T' + tahap + '_' + judul.slice(0, 40), 'Evidence commissioning ' + it.c + ' ' + it.n + ' · tahap ' + tahap + ' · ' + judul + ' · diunggah ' + (ctx.user.name || by) + ' lewat dashboard PMO');
    line = [eid, pid, 'COM', it.id, tahap, judul, 'UNGGAH', file.url, file.id, file.name, file.size, note, 'AKTIF', by, now];
  } else {
    const url = String(a.url || '').trim();
    if (!/^https:\/\/\S+$/i.test(url)) throw new Error('Link harus diawali https://');
    line = [eid, pid, 'COM', it.id, tahap, judul, 'LINK', url, '', '', '', note, 'AKTIF', by, now];
  }
  epcAppendRow_(EPC.SHEETS.EVIDENCE, line);
  return { success: true, evidence: epcEvidenceOf_(pid) };
}

/** Hapus evidence: ADMIN, atau pengunggahnya sendiri. File unggahan dipindah ke Trash Drive. */
function deleteEpcEvidence(token, projectId, id) {
  const ctx = epcInputCtx_(token, projectId), pid = ctx.p.id;
  const sh = epcSheet_(EPC.SHEETS.EVIDENCE, false);
  if (!sh) throw new Error('Evidence tidak ditemukan.');
  const v = sh.getDataRange().getValues(), h = v[0].map(function(x) { return String(x).trim().toUpperCase(); }), c = function(k) { return h.indexOf(k); };
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][c('ID')]) !== String(id) || String(v[i][c('PROYEK_ID')]).trim().toUpperCase() !== pid) continue;
    const owner = String(v[i][c('DIUNGGAH_OLEH')] || '').toLowerCase() === String(ctx.user.username || '').toLowerCase();
    if (!ctx.admin && !owner) throw new Error('Hanya ADMIN atau pengunggah yang bisa menghapus evidence ini.');
    const fid = String(v[i][c('FILE_ID')] || '');
    if (fid) { try { DriveApp.getFileById(fid).setTrashed(true); } catch (e) { /* file sudah tidak ada */ } }
    sh.getRange(i + 1, c('STATUS') + 1).setValue('DIHAPUS');
    return { success: true, evidence: epcEvidenceOf_(pid) };
  }
  throw new Error('Evidence tidak ditemukan.');
}

/**
 * Tambah / ubah punch. p: {id?, grup, item?, uraian, kategori, pic, temuan (yyyy-mm-dd), target, status, note}
 * Status OPEN / DIKERJAKAN / SIAP boleh diisi ADMIN, PIC, INPUT. CLOSED (dan membuka ulang) hanya ADMIN, wajib ada foto sesudah perbaikan.
 */
function saveEpcPunch(token, projectId, p) {
  p = p || {};
  const ctx = epcInputCtx_(token, projectId), pid = ctx.p.id;
  const com = epcComItems_(pid);
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const groups = {}; com.items.forEach(function(it) { groups[it.gc] = it.g || it.gc; });
    const grup = String(p.grup || '').trim(), item = String(p.item || '').trim();
    if (!groups[grup]) throw new Error('Pilih sistem dari baseline Commissioning.');
    if (item && !com.items.some(function(x) { return x.id === item && x.gc === grup; })) throw new Error('Aktivitas tidak berada di sistem yang dipilih.');
    const uraian = String(p.uraian || '').trim().slice(0, 500);
    if (!uraian) throw new Error('Uraian temuan wajib diisi.');
    const kat = String(p.kategori || '').toUpperCase();
    if (EPC.PUNCH_CAT.indexOf(kat) < 0) throw new Error('Kategori harus A, B atau C.');
    const st = String(p.status || 'OPEN').toUpperCase();
    if (EPC.PUNCH_ST.indexOf(st) < 0) throw new Error('Status punch tidak dikenal.');
    const temuan = epcIso_(p.temuan) || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const target = epcIso_(p.target) || '';
    if (target && target < temuan) throw new Error('Target selesai tidak boleh sebelum tanggal temuan.');
    const by = ctx.user.username || ctx.user.name || '', now = new Date();
    const sh = epcSheet_(EPC.SHEETS.PUNCH, true);
    const H = EPC.SHEETS.PUNCH[1], col = function(k) { return H.indexOf(k); };
    const n = sh.getLastRow(), v = n >= 2 ? sh.getRange(2, 1, n - 1, H.length).getValues() : [];
    if (p.id) {
      let r = -1; for (let i = 0; i < v.length; i++) if (String(v[i][0]) === String(p.id) && String(v[i][1]).trim().toUpperCase() === pid) { r = i; break; }
      if (r < 0) throw new Error('Punch tidak ditemukan.');
      const row = v[r], prev = String(row[col('STATUS')] || 'OPEN').toUpperCase();
      if (prev === 'CLOSED' && !ctx.admin) throw new Error('Punch sudah ditutup. Hanya ADMIN yang bisa membuka kembali.');
      if (st === 'CLOSED' && prev !== 'CLOSED') {
        if (!ctx.admin) throw new Error('Hanya ADMIN yang bisa menutup punch (verifikasi).');
        const foto = epcJson_(row[col('FOTO_JSON')], []);
        if (!foto.some(function(f) { return f.k === 'after'; })) throw new Error('Unggah foto sesudah perbaikan sebelum punch ditutup.');
      }
      if (prev === 'CLOSED' && st !== 'CLOSED' && !ctx.admin) throw new Error('Hanya ADMIN yang bisa membuka kembali punch.');
      const upd = row.slice();
      upd[col('GRUP_KODE')] = grup; upd[col('ITEM_ID')] = item; upd[col('URAIAN')] = uraian; upd[col('KATEGORI')] = kat; upd[col('PIC')] = String(p.pic || '').trim().slice(0, 80);
      upd[col('TGL_TEMUAN')] = temuan; upd[col('TARGET')] = target; upd[col('STATUS')] = st; upd[col('CATATAN')] = String(p.note || '').trim().slice(0, 500);
      upd[col('DIPERBARUI_OLEH')] = by; upd[col('DIPERBARUI')] = now;
      if (st === 'CLOSED' && prev !== 'CLOSED') { upd[col('DITUTUP_OLEH')] = by; upd[col('DITUTUP_PADA')] = now; }
      if (st !== 'CLOSED') { upd[col('DITUTUP_OLEH')] = ''; upd[col('DITUTUP_PADA')] = ''; }
      const rng = sh.getRange(r + 2, 1, 1, H.length);
      rng.setValues([upd.map(function(x) { return x instanceof Date ? x : (x === null || x === undefined ? '' : String(x)); })]);
    } else {
      if (st === 'CLOSED') throw new Error('Punch baru tidak bisa langsung berstatus Closed.');
      let mx = 0; v.forEach(function(row) { if (String(row[1]).trim().toUpperCase() !== pid) return; const m = /(\d+)\s*$/.exec(String(row[2] || '')); if (m) mx = Math.max(mx, Number(m[1])); });
      const no = 'PL-' + String(mx + 1).padStart(3, '0');
      epcAppendRow_(EPC.SHEETS.PUNCH, [Utilities.getUuid().slice(0, 8).toUpperCase(), pid, no, grup, item, uraian, kat, String(p.pic || '').trim().slice(0, 80), temuan, target, st, String(p.note || '').trim().slice(0, 500), '[]', by, now, by, now, '', '']);
    }
    return { success: true, punch: epcPunchOf_(pid) };
  } finally {
    lock.releaseLock();
  }
}

/** Foto punch (sebelum / sesudah perbaikan) atau lampiran: unggah ke folder Drive tim proyek. a: {id, k: 'before'|'after', base64, mime, fileName} */
function uploadEpcPunchPhoto(token, projectId, a) {
  a = a || {};
  const ctx = epcInputCtx_(token, projectId), pid = ctx.p.id;
  const k = a.k === 'after' ? 'after' : 'before';
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const sh = epcSheet_(EPC.SHEETS.PUNCH, false);
    if (!sh) throw new Error('Punch tidak ditemukan.');
    const H = EPC.SHEETS.PUNCH[1], col = function(x) { return H.indexOf(x); };
    const n = sh.getLastRow(), v = n >= 2 ? sh.getRange(2, 1, n - 1, H.length).getValues() : [];
    let r = -1; for (let i = 0; i < v.length; i++) if (String(v[i][0]) === String(a.id) && String(v[i][1]).trim().toUpperCase() === pid) { r = i; break; }
    if (r < 0) throw new Error('Punch tidak ditemukan.');
    if (String(v[r][col('STATUS')]).toUpperCase() === 'CLOSED' && !ctx.admin) throw new Error('Punch sudah ditutup.');
    const no = String(v[r][col('NO')] || '');
    const file = epcSaveDriveFile_(pid, ['Commissioning', 'Punch list', no], a, no + '_' + (k === 'after' ? 'SESUDAH' : 'SEBELUM'), 'Foto punch ' + no + ' (' + (k === 'after' ? 'sesudah' : 'sebelum') + ' perbaikan) · diunggah ' + (ctx.user.name || ctx.user.username || '') + ' lewat dashboard PMO');
    const foto = epcJson_(v[r][col('FOTO_JSON')], []);
    foto.push({ k: k, url: file.url, id: file.id, name: file.name, by: ctx.user.username || ctx.user.name || '', at: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') });
    sh.getRange(r + 2, col('FOTO_JSON') + 1).setValue(JSON.stringify(foto.slice(-20)));
    sh.getRange(r + 2, col('DIPERBARUI_OLEH') + 1, 1, 2).setValues([[ctx.user.username || ctx.user.name || '', new Date()]]);
    return { success: true, punch: epcPunchOf_(pid) };
  } finally {
    lock.releaseLock();
  }
}

/** ADMIN: hapus punch (salah input). */
function deleteEpcPunch(token, projectId, id) {
  const ctx = epcInputCtx_(token, projectId), pid = ctx.p.id;
  if (!ctx.admin) throw new Error('Hanya ADMIN yang bisa menghapus punch.');
  const sh = epcSheet_(EPC.SHEETS.PUNCH, false);
  if (!sh) throw new Error('Punch tidak ditemukan.');
  const n = sh.getLastRow(), v = n >= 2 ? sh.getRange(2, 1, n - 1, 2).getValues() : [];
  for (let i = 0; i < v.length; i++) if (String(v[i][0]) === String(id) && String(v[i][1]).trim().toUpperCase() === pid) { sh.deleteRow(i + 2); return { success: true, punch: epcPunchOf_(pid) }; }
  throw new Error('Punch tidak ditemukan.');
}

/** Punch A terbuka per aktivitas pengujian: { itemId: ['PL-001', …] } */
function epcPunchGate_(pid, items) {
  const open = epcPunchOf_(pid).filter(function(x) { return x.kat === 'A' && x.st !== 'CLOSED'; });
  const g = {};
  open.forEach(function(x) {
    items.forEach(function(it) {
      if (it.t === 'DOK') return;
      if (x.item ? it.id === x.item : it.gc === x.grup) (g[it.id] = g[it.id] || []).push(x.no);
    });
  });
  return g;
}

function epcEvidenceOf_(pid) {
  const fmt = function(v) { return v instanceof Date && !isNaN(v) ? formatDateId_(v) + ' ' + String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0') : String(v || ''); };
  return epcRead_(EPC.SHEETS.EVIDENCE).filter(function(r) { return String(r.PROYEK_ID || '').trim().toUpperCase() === pid && String(r.STATUS || 'AKTIF').toUpperCase() === 'AKTIF'; })
    .map(function(r) { return { id: String(r.ID), item: String(r.ITEM_ID), tahap: Number(r.TAHAP) || 1, judul: String(r.JUDUL || ''), src: String(r.SUMBER || 'LINK').toUpperCase(), url: String(r.URL || ''), name: String(r.NAMA_FILE || ''), size: Number(r.UKURAN) || 0, note: String(r.CATATAN || ''), byU: String(r.DIUNGGAH_OLEH || ''), by: userDisplayName_(r.DIUNGGAH_OLEH), at: fmt(r.DIUNGGAH_PADA) }; });
}

function epcPunchOf_(pid) {
  const fmt = function(v) { return v instanceof Date && !isNaN(v) ? formatDateId_(v) + ' ' + String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0') : String(v || ''); };
  return epcRead_(EPC.SHEETS.PUNCH).filter(function(r) { return String(r.PROYEK_ID || '').trim().toUpperCase() === pid; })
    .map(function(r) {
      return { id: String(r.ID), no: String(r.NO || ''), grup: String(r.GRUP_KODE || ''), item: String(r.ITEM_ID || ''), uraian: String(r.URAIAN || ''), kat: String(r.KATEGORI || 'B').toUpperCase(), pic: String(r.PIC || ''),
        temuan: epcIso_(r.TGL_TEMUAN) || '', target: epcIso_(r.TARGET) || '', st: String(r.STATUS || 'OPEN').toUpperCase(), note: String(r.CATATAN || ''), foto: epcJson_(r.FOTO_JSON, []),
        by: userDisplayName_(r.DIBUAT_OLEH), at: fmt(r.DIBUAT_PADA), upBy: userDisplayName_(r.DIPERBARUI_OLEH), upAt: fmt(r.DIPERBARUI), closedBy: userDisplayName_(r.DITUTUP_OLEH), closedAt: epcIso_(r.DITUTUP_PADA) || '' };
    }).sort(function(a, b) { return a.no < b.no ? -1 : a.no > b.no ? 1 : 0; });
}

/** Simpan file base64 ke folder Drive tim proyek (folder sama dengan lampiran Engineering) di sub-folder path. */
function epcSaveDriveFile_(pid, path, a, baseName, desc) {
  const drive = engDriveOf_(pid);
  if (!drive) throw new Error('Folder Google Drive tim proyek belum diatur. ADMIN mengaturnya di Commissioning › Setup baseline (sama dengan folder Engineering).');
  const mime = String(a.mime || '').toLowerCase();
  if (EPC.FILE_MIME.indexOf(mime) < 0) throw new Error('Format file harus PDF, JPG atau PNG.');
  const bytes = Utilities.base64Decode(String(a.base64 || ''));
  if (!bytes.length) throw new Error('File kosong.');
  if (bytes.length > EPC.FILE_MAX) throw new Error('Ukuran file melebihi ' + (EPC.FILE_MAX / 1048576) + ' MB. Gunakan tempel link untuk file besar.');
  let folder;
  try { folder = DriveApp.getFolderById(drive.id); } catch (e) { throw new Error('Folder Google Drive tim proyek tidak bisa dibuka. Periksa akses folder.'); }
  folder = engSubFolder_(folder, pid);
  path.forEach(function(nm) { folder = engSubFolder_(folder, String(nm).replace(/[\\/:*?"<>|]+/g, '-').trim() || '-'); });
  const ext = mime === 'application/pdf' ? '.pdf' : mime === 'image/png' ? '.png' : '.jpg';
  const day = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const name = (baseName + '_' + day + ext).replace(/[\\/:*?"<>|]+/g, '-');
  const file = folder.createFile(Utilities.newBlob(bytes, mime, name));
  try { file.setDescription(desc); } catch (e) { /* abaikan */ }
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (e) { try { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (e2) { /* ikut akses folder */ } }
  return { id: file.getId(), url: file.getUrl(), name: name, size: bytes.length };
}

function epcAppendRow_(def, line) {
  storeTouch_();
  const sh = epcSheet_(def, true);
  const r = sh.getLastRow() + 1;
  const rng = sh.getRange(r, 1, 1, line.length);
  rng.setNumberFormat('@');
  rng.setValues([line.map(function(v) { return v instanceof Date ? v : (v === null || v === undefined ? '' : String(v)); })]);
}

function epcJson_(v, d) { try { return v === '' || v === null || v === undefined ? d : JSON.parse(String(v)); } catch (e) { return d; } }

// ===================== PROCUREMENT · UBAH TIPE & PENGIRIMAN =====================

/**
 * ADMIN: ubah tipe item pengadaan (Impor LN / Lokal LK) dan status long lead (AUTO / YA / TIDAK).
 * Milestone realisasi terakhir dikonversi otomatis: LN→LK MOS lokal = MOS impor; LK→LN MOS impor = MOS lokal, FAT & FOB = 100 bila MOS lokal 100, selain itu 0.
 * Riwayat WEEK yang sudah tersimpan (kurva) tidak diubah. a: {item, t: 'LN'|'LK', ll: 'AUTO'|'YA'|'TIDAK', alasan}
 */
function saveEpcItemType(token, projectId, a) {
  a = a || {};
  const ctx = epcAdminCtx_(token, projectId);
  const F = 'PROC', pid = ctx.p.id, key = pid + '|' + F;
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const store = epcStore_(), set = store.setting[key];
    if (!set) throw new Error('Baseline Procurement belum disimpan.');
    const it = (store.items[key + '|' + set.rev] || []).find(function(x) { return x.id === String(a.item || ''); });
    if (!it) throw new Error('Item tidak ditemukan di baseline aktif.');
    const t = String(a.t || '').toUpperCase() === 'LN' ? 'LN' : 'LK';
    const ll = ['YA', 'TIDAK'].indexOf(String(a.ll || '').toUpperCase()) >= 0 ? String(a.ll).toUpperCase() : 'AUTO';
    const why = String(a.alasan || '').trim().slice(0, 300);
    if (!why) throw new Error('Alasan perubahan wajib diisi.');
    if (t === it.t && ll === (it.llx || 'AUTO')) throw new Error('Tidak ada perubahan.');
    const by = ctx.user.username || ctx.user.name || '', now = new Date();
    epcAppendRow_(EPC.SHEETS.TIPE, [pid, it.id, it.c, t, ll, it.t, why, by, now]);
    if (t !== it.t) {
      const params = epcParamsOf_(store, key, set.rev);
      const sh = epcSheet_(EPC.SHEETS.REAL, false), n = sh ? sh.getLastRow() : 0;
      if (n >= 2) {
        const v = sh.getRange(2, 1, n - 1, 9).getValues();
        for (let i = 0; i < v.length; i++) {
          if (String(v[i][0]).trim().toUpperCase() !== pid || String(v[i][1]).trim().toUpperCase() !== F || String(v[i][3]) !== it.id) continue;
          const m = [4, 5, 6, 7].map(function(c) { return Number(v[i][c]) || 0; });
          const px = epcProcX_(params), m0 = m[0], m3 = m[3];
          if (t === 'LK') { m[3] = m[2]; if (px) m[0] = m3; }
          else { m[2] = m3; m[0] = m[1] = m3 >= 99.995 ? 100 : 0; if (px) m[3] = m0; }
          const pg = epcProg_(F, { t: t }, m, params);
          sh.getRange(i + 2, 5, 1, 5).setValues([[epcRound_(m[0], 4), epcRound_(m[1], 4), epcRound_(m[2], 4), epcRound_(m[3], 4), epcRound_(pg, 4)]]);
          sh.getRange(i + 2, 12, 1, 2).setValues([[by, now]]);
        }
      }
    }
    return getEpccData(token, pid, F);
  } finally {
    lock.releaseLock();
  }
}

/**
 * ADMIN: tambah / ubah data pengiriman barang impor dari dokumen FOB (B/L laut, AWB udara).
 * s: {id?, moda 'LAUT'|'UDARA', no, carrier, armada, imo, muatan, pol, pod, etd, atd, eta, ata, clearance, tibaSite, status, items: [itemId], note, doc: {url, fileId, name}}
 * Efek ke item: FOB aktual (bila kosong) = tanggal on board, ETA perkiraan & MOS perkiraan (= ETA/ATA + waktu clearance) dari pengiriman yang belum tiba di site.
 */
function saveEpcShipment(token, projectId, s) {
  s = s || {};
  const ctx = epcAdminCtx_(token, projectId);
  const F = 'PROC', pid = ctx.p.id, key = pid + '|' + F;
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const store = epcStore_(), set = store.setting[key];
    if (!set) throw new Error('Baseline Procurement belum disimpan.');
    const items = store.items[key + '|' + set.rev] || [], IX = {}; items.forEach(function(x) { IX[x.id] = x; });
    const moda = String(s.moda || '').toUpperCase() === 'UDARA' ? 'UDARA' : 'LAUT';
    const no = String(s.no || '').trim().slice(0, 60);
    if (!no) throw new Error('Nomor ' + (moda === 'UDARA' ? 'AWB' : 'B/L') + ' wajib diisi.');
    const ids = (Array.isArray(s.items) ? s.items : []).map(String).filter(function(x, i, arr) { return IX[x] && arr.indexOf(x) === i; });
    if (!ids.length) throw new Error('Pilih minimal satu item pengadaan di dokumen ini.');
    const d = {}; ['etd', 'atd', 'eta', 'ata', 'tibaSite'].forEach(function(k) { d[k] = epcIso_(s[k]) || ''; });
    if (!d.etd && !d.atd) throw new Error('Isi tanggal on board / ETD.');
    if (d.atd && d.ata && d.ata < d.atd) throw new Error('ATA tidak boleh sebelum ATD.');
    if (d.eta && (d.atd || d.etd) && d.eta < (d.atd || d.etd)) throw new Error('ETA tidak boleh sebelum tanggal berangkat.');
    if (d.tibaSite && (d.ata || d.eta) && d.tibaSite < (d.ata || d.eta)) throw new Error('Tanggal tiba di site tidak boleh sebelum tiba pelabuhan/bandara.');
    const clr = Math.max(0, Math.min(120, Math.round(Number(s.clearance)))); const clearance = isFinite(clr) ? clr : EPC.CLEARANCE_DAYS;
    let st = String(s.status || '').toUpperCase(); if (EPC.SHIP_ST.indexOf(st) < 0) st = 'FOB';
    const auto = d.tibaSite ? 'SITE' : d.ata ? 'TIBA' : d.atd ? 'PERJALANAN' : 'FOB';
    if (EPC.SHIP_ST.indexOf(st) < EPC.SHIP_ST.indexOf(auto)) st = auto;
    if (st === 'SITE' && !d.tibaSite) throw new Error('Isi tanggal tiba di site untuk status Tiba site.');
    const txt = function(k, n) { return String(s[k] || '').trim().slice(0, n); };
    const doc = s.doc || {};
    const by = ctx.user.username || ctx.user.name || '', now = new Date();
    const sh = epcSheet_(EPC.SHEETS.KIRIM, true), H = EPC.SHEETS.KIRIM[1], col = function(k) { return H.indexOf(k); };
    const n = sh.getLastRow(), v = n >= 2 ? sh.getRange(2, 1, n - 1, H.length).getValues() : [];
    let r = -1;
    if (s.id) { for (let i = 0; i < v.length; i++) if (String(v[i][0]) === String(s.id) && String(v[i][1]).trim().toUpperCase() === pid) { r = i; break; } if (r < 0) throw new Error('Data pengiriman tidak ditemukan.'); }
    for (let i = 0; i < v.length; i++) if (i !== r && String(v[i][1]).trim().toUpperCase() === pid && String(v[i][col('NO_DOK')]).trim().toUpperCase() === no.toUpperCase()) throw new Error('Nomor dokumen ' + no + ' sudah terdaftar.');
    const old = r >= 0 ? v[r] : null;
    const hist = old ? epcJson_(old[col('RIWAYAT_JSON')], []) : [];
    const etaAwal = old ? (epcIso_(old[col('ETA_AWAL')]) || d.eta) : d.eta;
    const prevSt = old ? String(old[col('STATUS')] || '') : '', prevEta = old ? epcIso_(old[col('ETA')]) : '';
    if (!old || prevSt !== st || prevEta !== d.eta) hist.push({ at: Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'), st: st, eta: d.eta, by: ctx.user.name || by, note: txt('note', 200) });
    const line = [old ? old[0] : Utilities.getUuid().slice(0, 8).toUpperCase(), pid, moda, no, txt('carrier', 80), txt('armada', 80), txt('imo', 12), txt('muatan', 160), txt('pol', 80), txt('pod', 80),
      d.etd, d.atd, etaAwal || '', d.eta, d.ata, clearance, d.tibaSite, st, JSON.stringify(ids),
      String(doc.url || (old ? old[col('DOK_URL')] : '') || ''), String(doc.fileId || (old ? old[col('DOK_FILE_ID')] : '') || ''), String(doc.name || (old ? old[col('DOK_NAMA')] : '') || ''),
      txt('note', 300), JSON.stringify(hist.slice(-30)), old ? old[col('DIBUAT_OLEH')] : by, old ? old[col('DIBUAT_PADA')] : now, by, now];
    if (r >= 0) {
      const rng = sh.getRange(r + 2, 1, 1, H.length); rng.setNumberFormat('@');
      rng.setValues([line.map(function(x) { return x instanceof Date ? x : (x === null || x === undefined ? '' : String(x)); })]);
    } else epcAppendRow_(EPC.SHEETS.KIRIM, line);
    const touched = ids.slice(); if (old) epcJson_(old[col('ITEM_JSON')], []).forEach(function(x) { if (touched.indexOf(x) < 0) touched.push(x); });
    epcShipApply_(pid, touched, by, now);
    return getEpccData(token, pid, F);
  } finally {
    lock.releaseLock();
  }
}

/** ADMIN: hapus data pengiriman (salah input). File dokumen di Drive tetap tersimpan. */
function deleteEpcShipment(token, projectId, id) {
  const ctx = epcAdminCtx_(token, projectId), pid = ctx.p.id;
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const sh = epcSheet_(EPC.SHEETS.KIRIM, false);
    if (!sh) throw new Error('Data pengiriman tidak ditemukan.');
    const H = EPC.SHEETS.KIRIM[1], n = sh.getLastRow(), v = n >= 2 ? sh.getRange(2, 1, n - 1, H.length).getValues() : [];
    for (let i = 0; i < v.length; i++) {
      if (String(v[i][0]) !== String(id) || String(v[i][1]).trim().toUpperCase() !== pid) continue;
      const ids = epcJson_(v[i][H.indexOf('ITEM_JSON')], []);
      sh.deleteRow(i + 2);
      epcShipApply_(pid, ids, ctx.user.username || ctx.user.name || '', new Date());
      return getEpccData(token, pid, 'PROC');
    }
    throw new Error('Data pengiriman tidak ditemukan.');
  } finally {
    lock.releaseLock();
  }
}

/**
 * ADMIN: baca dokumen FOB (PDF / foto B/L atau AWB) dengan Claude, simpan file ke folder Drive tim proyek (bila diatur).
 * a: {base64, mime, fileName}. Hasil: {fields, doc} — belum disimpan sebagai pengiriman; ADMIN memeriksa dulu.
 */
function readEpcFobDoc(token, projectId, a) {
  a = a || {};
  const ctx = epcAdminCtx_(token, projectId), pid = ctx.p.id, key = pid + '|PROC';
  const mime = String(a.mime || '').toLowerCase();
  if (EPC.FILE_MIME.indexOf(mime) < 0) throw new Error('Format file harus PDF, JPG atau PNG.');
  const b64 = String(a.base64 || '');
  if (!b64) throw new Error('File kosong.');
  if (b64.length * 0.75 > 15 * 1048576) throw new Error('File terlalu besar untuk dibaca otomatis (maks 15 MB). Isi data secara manual.');
  const store = epcStore_(), set = store.setting[key];
  if (!set) throw new Error('Baseline Procurement belum disimpan.');
  const items = (store.items[key + '|' + set.rev] || []).filter(function(x) { return x.t === 'LN'; });
  let doc = null;
  try { if (engDriveOf_(pid)) { const f = epcSaveDriveFile_(pid, ['Procurement', 'Dokumen FOB'], a, 'FOB_' + String(a.fileName || 'dokumen').replace(/\.[a-z0-9]+$/i, '').slice(0, 50), 'Dokumen FOB (B/L / AWB) · diunggah ' + (ctx.user.name || ctx.user.username || '') + ' lewat dashboard PMO'); doc = { url: f.url, fileId: f.id, name: f.name }; } } catch (e) { doc = null; }
  const keyApi = String(PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY') || '').trim();
  if (!keyApi) return { success: true, fields: null, doc: doc, message: 'Asisten PMO belum dikonfigurasi (ANTHROPIC_API_KEY). Isi data secara manual.' };
  const list = items.map(function(x) { return { id: x.id, kode: x.c, uraian: x.n }; });
  const prompt = 'Dokumen terlampir adalah dokumen pengiriman barang impor (Bill of Lading untuk laut atau Air Waybill untuk udara). ' +
    'Ambil data berikut dan balas HANYA dengan satu objek JSON tanpa teks lain: ' +
    '{"moda":"LAUT|UDARA","no":"nomor B/L atau AWB","carrier":"nama pelayaran / maskapai","armada":"nama kapal + voyage, atau nomor penerbangan","imo":"nomor IMO kapal bila ada","muatan":"ringkas: jumlah & jenis kontainer / koli, berat, nomor kontainer",' +
    '"pol":"pelabuhan / bandara muat (kota, kode negara)","pod":"pelabuhan / bandara bongkar","etd":"yyyy-mm-dd tanggal on board / shipped on board / flight date","eta":"yyyy-mm-dd bila tertulis","barang":"uraian barang singkat","items":["id item yang cocok dari DAFTAR_ITEM"],"yakin":{"nama_field":0-1}}. ' +
    'Isi string kosong bila tidak ada di dokumen; jangan menebak. Cocokkan item hanya bila uraian barang, tag peralatan, atau nomor PO jelas sesuai.\nDAFTAR_ITEM: ' + JSON.stringify(list);
  const block = mime === 'application/pdf' ? { type: 'document', source: { type: 'base64', media_type: mime, data: b64 } } : { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } };
  const model = aiModel_();
  let res;
  try {
    res = UrlFetchApp.fetch(AI.URL, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: { 'x-api-key': keyApi, 'anthropic-version': AI.VERSION },
      payload: JSON.stringify({ model: model, max_tokens: 1200, messages: [{ role: 'user', content: [block, { type: 'text', text: prompt }] }] }) });
  } catch (e) {
    return { success: true, fields: null, doc: doc, message: 'Tidak bisa menghubungi Asisten PMO: ' + e.message + '. Isi data secara manual.' };
  }
  const code = res.getResponseCode(); let j = null; try { j = JSON.parse(res.getContentText()); } catch (e) { j = null; }
  if (code !== 200 || !j) { const msg = j && j.error ? j.error.message : 'HTTP ' + code; try { aiLog_(ctx.user, { page: 'epcc-fob', projectId: pid }, 'Baca dokumen FOB', model, 0, 0, 'GAGAL: ' + msg); } catch (e) {} return { success: true, fields: null, doc: doc, message: 'Asisten PMO gagal membaca dokumen (' + msg + '). Isi data secara manual.' }; }
  const u = j.usage || {};
  try { aiLog_(ctx.user, { page: 'epcc-fob', projectId: pid }, 'Baca dokumen FOB ' + String(a.fileName || ''), model, (Number(u.input_tokens) || 0) + (Number(u.cache_read_input_tokens) || 0), Number(u.output_tokens) || 0, 'OK'); } catch (e) {}
  const text = (j.content || []).filter(function(b) { return b && b.type === 'text'; }).map(function(b) { return b.text; }).join('\n');
  const m = text.match(/\{[\s\S]*\}/);
  let f = null; try { f = m ? JSON.parse(m[0]) : null; } catch (e) { f = null; }
  if (!f) return { success: true, fields: null, doc: doc, message: 'Isi dokumen tidak terbaca otomatis. Isi data secara manual.' };
  const ids = {}; items.forEach(function(x) { ids[x.id] = 1; });
  const out = { moda: String(f.moda || '').toUpperCase() === 'UDARA' ? 'UDARA' : 'LAUT', yakin: f.yakin || {} };
  ['no', 'carrier', 'armada', 'imo', 'muatan', 'pol', 'pod', 'barang'].forEach(function(k) { out[k] = String(f[k] || '').trim().slice(0, 160); });
  out.etd = epcIso_(f.etd) || ''; out.eta = epcIso_(f.eta) || '';
  out.items = (Array.isArray(f.items) ? f.items : []).map(String).filter(function(x) { return ids[x]; });
  return { success: true, fields: out, doc: doc };
}

/** Pengiriman per proyek (urut terbaru). */
function epcShipsOf_(pid) {
  return epcRead_(EPC.SHEETS.KIRIM).filter(function(r) { return String(r.PROYEK_ID || '').trim().toUpperCase() === pid; }).map(function(r) {
    return { id: String(r.ID), moda: String(r.MODA || 'LAUT').toUpperCase(), no: String(r.NO_DOK || ''), carrier: String(r.CARRIER || ''), armada: String(r.ARMADA || ''), imo: String(r.IMO || ''), muatan: String(r.MUATAN || ''),
      pol: String(r.POL || ''), pod: String(r.POD || ''), etd: epcIso_(r.ETD) || '', atd: epcIso_(r.ATD) || '', etaAwal: epcIso_(r.ETA_AWAL) || '', eta: epcIso_(r.ETA) || '', ata: epcIso_(r.ATA) || '',
      clearance: r.CLEARANCE_HARI === '' || r.CLEARANCE_HARI === null ? EPC.CLEARANCE_DAYS : Number(r.CLEARANCE_HARI) || 0, tibaSite: epcIso_(r.TIBA_SITE) || '', st: String(r.STATUS || 'FOB').toUpperCase(),
      items: epcJson_(r.ITEM_JSON, []), doc: r.DOK_URL ? { url: String(r.DOK_URL), name: String(r.DOK_NAMA || '') } : null, note: String(r.CATATAN || ''), hist: epcJson_(r.RIWAYAT_JSON, []),
      by: userDisplayName_(r.DIPERBARUI_OLEH || r.DIBUAT_OLEH) };
  }).sort(function(a, b) { return (b.atd || b.etd) < (a.atd || a.etd) ? -1 : (b.atd || b.etd) > (a.atd || a.etd) ? 1 : 0; });
}

/** Turunkan tanggal item dari pengiriman: fobA (bila kosong), etaF & mosF dari pengiriman yang belum tiba di site. */
function epcShipApply_(pid, ids, by, now) {
  if (!ids || !ids.length) return;
  const ships = epcShipsOf_(pid), F = 'PROC';
  const addDays = function(iso, n) { const p = String(iso).split('-'); const d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + n)); return d.toISOString().slice(0, 10); };
  const sh = epcSheet_(EPC.SHEETS.REAL, true), n = sh.getLastRow(), v = n >= 2 ? sh.getRange(2, 1, n - 1, 10).getValues() : [];
  const store = epcStore_(), stWeek = store.realWeek[pid + '|' + F] || '';
  ids.forEach(function(id) {
    const S = ships.filter(function(s) { return s.items.indexOf(id) >= 0; });
    let row = -1; for (let i = 0; i < v.length; i++) if (String(v[i][0]).trim().toUpperCase() === pid && String(v[i][1]).trim().toUpperCase() === F && String(v[i][3]) === id) { row = i; break; }
    const t = row >= 0 ? epcJson_(v[row][9], {}) || {} : {};
    const prev = JSON.stringify(t);
    const board = S.map(function(s) { return s.atd || s.etd; }).filter(String).sort()[0];
    if (board && !t.fobA) { t.fobA = board; t.fobShip = 1; }
    if (!board && t.fobShip) { delete t.fobA; delete t.fobShip; }
    const open = S.filter(function(s) { return s.st !== 'SITE'; });
    if (open.length) {
      const eta = open.map(function(s) { return s.ata || s.eta; }).filter(String).sort().pop();
      const mos = open.map(function(s) { const b = s.ata || s.eta; return b ? addDays(b, s.clearance) : ''; }).filter(String).sort().pop();
      if (eta) { t.etaF = eta; t.etaShip = 1; } if (mos) { t.mosF = mos; t.mosShip = 1; }
    } else {
      if (t.etaShip) { delete t.etaF; delete t.etaShip; }
      if (t.mosShip) { delete t.mosF; delete t.mosShip; }
    }
    if (JSON.stringify(t) === prev) return;
    if (row >= 0) { sh.getRange(row + 2, 10).setValue(JSON.stringify(t)); sh.getRange(row + 2, 12, 1, 2).setValues([[by, now]]); }
    else sh.appendRow([pid, F, stWeek, id, 0, 0, 0, 0, 0, JSON.stringify(t), '', by, now]);
  });
}

// ===================== RENCANA TINDAK LANJUT (berbasis CPM) =====================

/** Jaringan CPM (sama dengan perhitungan di halaman EPCC Control). nodes: {id: {snet, dur}}, links: [{p, s, t, lag}] */
function epcCpmNet_(nodes, links) {
  const ids = Object.keys(nodes), succ = {}, pred = {}, indeg = {};
  ids.forEach(function(i) { succ[i] = []; pred[i] = []; indeg[i] = 0; });
  links.forEach(function(l) { if (!nodes[l.p] || !nodes[l.s] || l.p === l.s) return; succ[l.p].push(l); pred[l.s].push(l); indeg[l.s]++; });
  const order = [], q = ids.filter(function(i) { return !indeg[i]; }), deg = Object.assign({}, indeg);
  while (q.length) { const i = q.shift(); order.push(i); succ[i].forEach(function(l) { if (--deg[l.s] === 0) q.push(l.s); }); }
  ids.forEach(function(i) { if (order.indexOf(i) < 0) order.push(i); });
  const R = {};
  order.forEach(function(i) {
    const n = nodes[i]; let es = n.snet;
    pred[i].forEach(function(l) { const p = R[l.p]; if (!p) return; const lag = l.lag || 0;
      if (l.t === 'SS') es = Math.max(es, p.es + lag); else if (l.t === 'FF') es = Math.max(es, p.ef + lag - n.dur); else es = Math.max(es, p.ef + lag); });
    R[i] = { es: es, ef: es + n.dur };
  });
  let PF = 0; order.forEach(function(i) { PF = Math.max(PF, R[i].ef); });
  for (let k = order.length - 1; k >= 0; k--) {
    const i = order[k], n = nodes[i]; let lf = PF;
    succ[i].forEach(function(l) { const s = R[l.s]; if (!s || s.ls === undefined) return; const lag = l.lag || 0;
      if (l.t === 'SS') lf = Math.min(lf, s.ls - lag + n.dur); else if (l.t === 'FF') lf = Math.min(lf, s.lf - lag); else lf = Math.min(lf, s.ls - lag); });
    R[i].lf = lf; R[i].ls = lf - n.dur; R[i].tf = Math.round((R[i].ls - R[i].es) * 100) / 100;
  }
  return { R: R, PF: PF };
}

/**
 * Deteksi item tertinggal yang menggeser jadwal (CPM). Hasil per grup Construction / item Procurement terhubung.
 * Aktif hanya bila baseline Construction punya logika CPM (sheet LOGIKA) dan realisasi Construction sudah ada.
 */
function epcRtlScan_(db, store, p) {
  const out = { active: false, groups: [] };
  const kc = p.id + '|CONS', setC = store.setting[kc];
  if (!setC) { out.reason = 'Baseline Construction belum ada.'; return out; }
  const params = epcParamsOf_(store, kc, setC.rev), logic = (params && params.logic) || [];
  const itemsC = store.items[kc + '|' + setC.rev] || [];
  const S = store.realWeek[kc] || 0;
  const GX = {}, GI = [];
  itemsC.forEach(function(it) { if (!GX[it.gc]) { GX[it.gc] = { id: 'G:' + it.gc, c: it.gc, n: it.g || it.n, d: it.d, items: [] }; GI.push(GX[it.gc]); } });
  const valid = logic.filter(function(a) { return GX[a[0]] && GX[a[1]]; });
  if (!valid.length) { out.reason = 'Logika CPM (sheet LOGIKA) belum diisi di baseline Construction.'; return out; }
  if (!S) { out.reason = 'Realisasi Construction belum diisi.'; return out; }
  const info = engInfo_(db, p), end = info.maxWeek || 0;
  const wpos = function(iso) { const a = epcIso_(info.startIso), b = epcIso_(iso); if (!a || !b) return null; const x = a.split('-'), y = b.split('-'); return (Date.UTC(+y[0], +y[1] - 1, +y[2]) - Date.UTC(+x[0], +x[1] - 1, +x[2])) / 864e5 / 7 + 1; };
  const planAt = function(pl, w) { return epcPlanAt_(pl, w); };
  const mk = function(it, st, W) {
    const pl = it.plan || []; let ps = 0, pf = 0;
    for (let k = 0; k < pl.length; k++) { if (!ps && pl[k] > 0) ps = k + 1; if (!pf && pl[k] >= 99.99) pf = k + 1; }
    if (!ps) ps = 1; if (!pf) pf = Math.max(ps, pl.length || 1);
    const o = { id: it.id, c: it.c, n: it.n, d: it.d, gc: it.gc, g: it.g, t: it.t, w: it.w, link: it.link, ps: ps, pf: pf, cp: [], pl: planAt(pl, W), ac: Number(st && st.pg) || 0, ms: (st && st.m) || [0, 0, 0, 0], tgl: (st && st.tgl) || null, loex: it.loex };
    for (let t = ps; t <= pf; t++) o.cp.push(planAt(pl, t));
    return o;
  };
  const cpAt = function(o, t) { if (t < o.ps) return 0; if (t >= o.pf) return 100; return o.cp[t - o.ps]; };
  const remW = function(o) { if (o.ac >= 99.99) return 0; let k = o.ps - 1; for (let t = o.ps; t <= o.pf; t++) { if (cpAt(o, t) <= o.ac + 1e-6) k = t; else break; } return Math.max(0.5, o.pf - k); };
  const fcNode = function(o, W) { if (o.ac >= 99.99) return { snet: Math.min(o.pf, W), dur: 0 }; if (o.ac > 0 || cpAt(o, W) > 0) return { snet: W, dur: remW(o), st: 1 }; return { snet: Math.max(o.ps - 1, W), dur: o.pf - o.ps + 1 }; };
  const tyOf = function(a, b) { if (a.pf < b.ps) return 'FS'; if (a.ps <= b.ps && a.pf <= b.pf) return 'SS'; return 'FF'; };
  const needOf = function(pp, c, t) { return t === 'FS' ? c.ps : (t === 'SS' ? c.ps + (pp.pf - pp.ps + 1) : c.pf + 1); };
  const procFc = function(o, W) { const tg = o.tgl || {}; if (tg.mosA) return { done: 1, pos: wpos(tg.mosA) }; if (o.ac >= 99.99 || (o.t === 'LN' ? o.ms[2] : o.ms[3]) >= 99.99) return { done: 1, pos: null }; if (tg.mosF) return { pos: wpos(tg.mosF), fixed: 1 }; const n = fcNode(o, W); return { pos: n.snet + n.dur + 1 }; };
  const stC = store.real[kc] || {}, IX = {};
  const items = itemsC.map(function(it) { const o = mk(it, stC[it.id], S); o.loe = epcLoeOf_(o, end).loe; o.grp = GX[it.gc]; GX[it.gc].items.push(o); IX[o.id] = o; return o; });
  // CPM grup memakai item normal saja; item LOE tidak menggeser jadwal (grup yang seluruhnya LOE memakai semua itemnya)
  GI.forEach(function(g) { g.all = g.items; const core = g.items.filter(function(o) { return !o.loe; }); g.items = core.length ? core : g.items; });
  GI.forEach(function(g) { const it = g.items; g.w = it.reduce(function(a, o) { return a + o.w; }, 0) || 1e-9; g.ps = Math.min.apply(null, it.map(function(o) { return o.ps; })); g.pf = Math.max.apply(null, it.map(function(o) { return o.pf; }));
    g.ac = it.reduce(function(a, o) { return a + o.w * o.ac; }, 0) / g.w; g.cp = []; for (let t = g.ps; t <= g.pf; t++) g.cp.push(it.reduce(function(a, o) { return a + o.w * cpAt(o, t); }, 0) / g.w); });
  const links = valid.map(function(a) { return { p: GX[a[0]].id, s: GX[a[1]].id, t: a[2] || 'FS', lag: Number(a[3]) || 0 }; });
  // barang procurement yang ditunggu construction
  const kp = p.id + '|PROC', setP = store.setting[kp], PX = {}, SP = store.realWeek[kp] || S;
  if (setP) {
    const stP = store.real[kp] || {};
    (store.items[kp + '|' + setP.rev] || []).forEach(function(it) {
      if (!it.link || !IX[it.link]) return;
      const o = mk(it, stP[it.id], S); o.pid = 'P:' + it.id; o.cons = IX[it.link]; PX[o.pid] = o;
      links.push({ p: o.pid, s: o.cons.grp.id, t: tyOf(o, o.cons.grp), lag: 0 });
      o.plP = planAt(it.plan || [], SP);
    });
  }
  const fcGroup = function(g) { if (g.ac >= 99.99) return { snet: Math.min(g.pf, S), dur: 0 }; let started = false, ef = 0; g.items.forEach(function(o) { const f = fcNode(o, S); ef = Math.max(ef, f.snet + f.dur); if (o.ac > 0 || cpAt(o, S) > 0) started = true; });
    if (!started) return { snet: Math.max(g.ps - 1, S), dur: g.pf - g.ps + 1 }; return { snet: S, dur: Math.max(0.5, ef - S), st: 1 }; };
  const procNode = function(o) { const fc = procFc(o, S); if (fc.done) return { snet: Math.min(o.pf, S), dur: 0 }; if (fc.fixed) return { snet: S, dur: Math.max(0, fc.pos - 1 - S), st: 1 }; return fcNode(o, S); };
  const NF = {}; GI.forEach(function(g) { NF[g.id] = fcGroup(g); }); Object.keys(PX).forEach(function(id) { NF[id] = procNode(PX[id]); });
  const linked = {}; links.forEach(function(l) { linked[l.p] = 1; linked[l.s] = 1; });
  const CF = epcCpmNet_(NF, links.filter(function(l) { return !(NF[l.s] && NF[l.s].st && l.t !== 'FF'); }));
  const slip = end ? CF.PF - end : 0;
  out.active = true; out.week = S; out.end = end; out.finish = CF.PF; out.slip = Math.round(slip * 10) / 10; out.dev = EPC.RTL_DEV; out.float = EPC.RTL_FLOAT;
  const cat = function(lk, tfK) { return !lk ? 'X' : tfK <= 0.001 ? 'K' : tfK <= EPC.RTL_FLOAT + 0.001 ? 'N' : 'F'; };
  GI.forEach(function(g) {
    const lateL = g.all.filter(function(o) { return o.loe && g.items.indexOf(o) < 0 && o.ac - o.pl <= EPC.RTL_DEV + 1e-9; });
    if (lateL.length) {
      lateL.sort(function(a, b) { return (a.ac - a.pl) - (b.ac - b.pl); });
      out.groups.push({ key: 'CONS|' + g.c + '|LOE', f: 'CONS', code: g.c, name: g.n, d: g.d, cat: 'L', tf: null, ef: null, wajib: false, loe: true,
        n: lateL.length, imp: Math.round(lateL.reduce(function(a, o) { return a + (o.ac - o.pl) * o.w / 100; }, 0) * 1e4) / 1e4,
        items: lateL.slice(0, 5).map(function(o) { return { c: o.c, n: o.n, pl: Math.round(o.pl * 10) / 10, ac: Math.round(o.ac * 10) / 10, dev: Math.round((o.ac - o.pl) * 10) / 10 }; }) });
    }
    const late = g.items.filter(function(o) { return !o.loe && o.ac - o.pl <= EPC.RTL_DEV + 1e-9; });
    if (!late.length) return;
    const r = CF.R[g.id], lk = !!linked[g.id] && !!r, tfK = r ? Math.round((r.tf - Math.max(0, slip)) * 10) / 10 : null;
    late.sort(function(a, b) { return (a.ac - a.pl) - (b.ac - b.pl); });
    const c = cat(lk, tfK);
    out.groups.push({ key: 'CONS|' + g.c, f: 'CONS', code: g.c, name: g.n, d: g.d, cat: c, tf: tfK, ef: r ? Math.round(r.ef * 10) / 10 : null, wajib: c === 'K' || c === 'N',
      n: late.length, imp: Math.round(late.reduce(function(a, o) { return a + (o.ac - o.pl) * o.w / 100; }, 0) * 1e4) / 1e4,
      items: late.slice(0, 5).map(function(o) { return { c: o.c, n: o.n, pl: Math.round(o.pl * 10) / 10, ac: Math.round(o.ac * 10) / 10, dev: Math.round((o.ac - o.pl) * 10) / 10 }; }) });
  });
  Object.keys(PX).forEach(function(id) {
    const o = PX[id], dev = o.ac - o.plP;
    if (dev > EPC.RTL_DEV + 1e-9) return;
    const fc = procFc(o, SP); if (fc.done) return;
    const t = tyOf(o, o.cons), need = needOf(o, o.cons, t), risk = fc.pos != null && fc.pos > need + 0.001;
    const r = CF.R[id], tfK = r ? Math.round((r.tf - Math.max(0, slip)) * 10) / 10 : null;
    const c = risk ? 'K' : cat(!!r, tfK);
    out.groups.push({ key: 'PROC|' + o.id, f: 'PROC', code: o.c, name: o.n, d: o.d, cat: c, tf: tfK, risk: risk, need: Math.round(need * 10) / 10, mos: fc.pos != null ? Math.round(fc.pos * 10) / 10 : null, wajib: c === 'K' || c === 'N',
      n: 1, imp: Math.round(dev * o.w / 100 * 1e4) / 1e4, cons: o.cons.c + ' ' + o.cons.n, items: [{ c: o.c, n: o.n, pl: Math.round(o.plP * 10) / 10, ac: Math.round(o.ac * 10) / 10, dev: Math.round(dev * 10) / 10 }] });
  });
  // jaringan CPM per grup (dibaca Asisten PMO untuk detail item)
  const r1 = function(x) { return x === null || x === undefined ? null : Math.round(x * 10) / 10; };
  const nm = function(id) { const g = GI.find(function(x) { return x.id === id; }); return g ? g.c + ' ' + g.n : (PX[id] ? PX[id].c + ' ' + PX[id].n + ' (procurement)' : id); };
  out.net = { groups: {}, proc: {} };
  GI.forEach(function(g) {
    const r = CF.R[g.id], gpl = S < g.ps ? 0 : S >= g.pf ? 100 : g.cp[S - g.ps];
    out.net.groups[g.c] = { kode: g.c, nama: g.n, realisasi: r1(g.ac), rencana: r1(gpl), mingguRencana: [g.ps, g.pf], perkiraanMulaiSelesai: r ? [r1(r.es), r1(r.ef)] : null,
      float: r && linked[g.id] ? r1(r.tf - Math.max(0, slip)) : null, terhubungLogika: !!linked[g.id], itemLoe: g.all.length - g.items.length,
      predecessor: links.filter(function(l) { return l.s === g.id; }).map(function(l) { return { dari: nm(l.p), tipe: l.t, lag: l.lag }; }),
      successor: links.filter(function(l) { return l.p === g.id; }).map(function(l) { return { ke: nm(l.s), tipe: l.t, lag: l.lag }; }) };
  });
  Object.keys(PX).forEach(function(id) {
    const o = PX[id], fc = procFc(o, SP), t = tyOf(o, o.cons), need = needOf(o, o.cons, t), r = CF.R[id];
    out.net.proc[o.id] = { untukConstruction: o.cons.c + ' ' + o.cons.n, dibutuhkanWeek: r1(need), perkiraanTibaWeek: fc.pos != null ? r1(fc.pos) : null, sudahTiba: !!fc.done,
      berisikoMenggeser: !fc.done && fc.pos != null && fc.pos > need + 0.001, float: r ? r1(r.tf - Math.max(0, slip)) : null };
  });
  const rank = { K: 0, N: 1, F: 2, X: 3, L: 4 };
  out.groups.sort(function(a, b) { return rank[a.cat] - rank[b.cat] || (a.tf == null ? 999 : a.tf) - (b.tf == null ? 999 : b.tf) || a.imp - b.imp; });
  return out;
}

function epcRtlOf_(pid) {
  const tz = Session.getScriptTimeZone(), today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  return epcRead_(EPC.SHEETS.RTL).filter(function(r) { return String(r.PROYEK_ID || '').trim().toUpperCase() === pid; }).map(function(r) {
    const st = String(r.STATUS || 'RENCANA').toUpperCase(), target = epcIso_(r.TARGET) || '';
    return { id: String(r.ID), f: String(r.BIDANG || ''), key: String(r.KUNCI || ''), code: String(r.GRUP_KODE || ''), name: String(r.GRUP_NAMA || ''), aksi: String(r.AKSI || ''), pic: String(r.PIC || ''), target: target, st: st,
      late: st !== 'SELESAI' && !!target && target < today, note: String(r.CATATAN || ''), wk: Number(r.WEEK_DIBUAT) || null, wkDone: Number(r.WEEK_SELESAI) || null, by: userDisplayName_(r.DIPERBARUI_OLEH || r.DIBUAT_OLEH) };
  });
}

/** Ringkasan untuk halaman Input Progress, Weekly dan Executive. store opsional (dipakai ulang). */
function epcRtlView_(db, p, store) {
  const v = epcRtlScan_(db, store || epcStore_(), p);
  const acts = epcRtlOf_(p.id);
  v.actions = acts;
  v.missing = [];
  v.groups.forEach(function(g) {
    const A = acts.filter(function(a) { return a.key === g.key; });
    g.open = A.filter(function(a) { return a.st !== 'SELESAI'; }).length;
    g.acts = A.length;
    if (v.active && g.wajib && !g.open) v.missing.push(g);
  });
  v.late = acts.filter(function(a) { return a.late; }).length;
  // mode INFO: tindak lanjut tidak wajib (data CPM masih diverifikasi) — hanya notifikasi, tidak menahan simpan laporan
  const md = epcRtlModeOf_(p.id);
  v.mode = md.mode; v.modeInfo = md; v.info = [];
  if (md.mode === 'INFO') { v.info = v.missing; v.missing = []; }
  return v;
}

/** Mode tindak lanjut per proyek: WAJIB (default) atau INFO. Baris terakhir berlaku. */
function epcRtlModeOf_(pid) {
  let out = { mode: 'WAJIB', why: '', by: '', at: '' };
  try {
    epcRead_(EPC.SHEETS.RTLMODE).forEach(function(r) {
      if (String(r.PROYEK_ID || '').trim().toUpperCase() !== pid) return;
      const at = r.DIUBAH_PADA instanceof Date && !isNaN(r.DIUBAH_PADA) ? formatDateId_(r.DIUBAH_PADA) : String(r.DIUBAH_PADA || '');
      out = { mode: String(r.MODE || '').toUpperCase() === 'INFO' ? 'INFO' : 'WAJIB', why: String(r.ALASAN || ''), by: userDisplayName_(r.DIUBAH_OLEH), at: at };
    });
  } catch (e) {}
  return out;
}

/** ADMIN: ubah mode tindak lanjut proyek. a: {mode: 'WAJIB'|'INFO', alasan} */
function saveEpcRtlMode(token, projectId, a) {
  a = a || {};
  const ctx = epcAdminCtx_(token, projectId), pid = ctx.p.id;
  const mode = String(a.mode || '').toUpperCase() === 'INFO' ? 'INFO' : 'WAJIB';
  const why = String(a.alasan || '').trim().slice(0, 300);
  if (mode === 'INFO' && !why) throw new Error('Isi alasan tindak lanjut dibuat tidak wajib.');
  if (epcRtlModeOf_(pid).mode === mode) throw new Error('Mode tindak lanjut sudah ' + (mode === 'INFO' ? 'info (tidak wajib)' : 'wajib') + '.');
  epcAppendRow_(EPC.SHEETS.RTLMODE, [pid, mode, why, ctx.user.username || ctx.user.name || '', new Date()]);
  return { success: true, rtl: epcRtlView_(ctx.db, ctx.p) };
}

/** ADMIN: tambah / ubah rencana tindak lanjut. a: {id?, key, aksi, pic, target (yyyy-mm-dd), status, note, week} */
function saveEpcRtl(token, projectId, a) {
  a = a || {};
  const ctx = epcAdminCtx_(token, projectId), pid = ctx.p.id;
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const key = String(a.key || '');
    const aksi = String(a.aksi || '').trim().slice(0, 500), pic = String(a.pic || '').trim().slice(0, 80), target = epcIso_(a.target) || '';
    if (!aksi) throw new Error('Isi rencana tindak lanjut.');
    if (!pic) throw new Error('Isi PIC tindak lanjut.');
    if (!target) throw new Error('Isi target selesai.');
    let st = String(a.status || 'RENCANA').toUpperCase(); if (EPC.RTL_ST.indexOf(st) < 0) st = 'RENCANA';
    const sh = epcSheet_(EPC.SHEETS.RTL, true), H = EPC.SHEETS.RTL[1], col = function(k) { return H.indexOf(k); };
    const n = sh.getLastRow(), v = n >= 2 ? sh.getRange(2, 1, n - 1, H.length).getValues() : [];
    const by = ctx.user.username || ctx.user.name || '', now = new Date(), week = Math.round(Number(a.week)) || '';
    if (a.id) {
      for (let i = 0; i < v.length; i++) {
        if (String(v[i][0]) !== String(a.id) || String(v[i][1]).trim().toUpperCase() !== pid) continue;
        const row = v[i].slice(), prev = String(row[col('STATUS')] || '').toUpperCase();
        row[col('AKSI')] = aksi; row[col('PIC')] = pic; row[col('TARGET')] = target; row[col('STATUS')] = st; row[col('CATATAN')] = String(a.note || '').trim().slice(0, 300);
        if (st === 'SELESAI' && prev !== 'SELESAI') row[col('WEEK_SELESAI')] = week; if (st !== 'SELESAI') row[col('WEEK_SELESAI')] = '';
        row[col('DIPERBARUI_OLEH')] = by; row[col('DIPERBARUI')] = now;
        const rng = sh.getRange(i + 2, 1, 1, H.length); rng.setNumberFormat('@');
        rng.setValues([row.map(function(x) { return x instanceof Date ? x : (x === null || x === undefined ? '' : String(x)); })]);
        return { success: true, rtl: epcRtlView_(ctx.db, ctx.p) };
      }
      throw new Error('Tindak lanjut tidak ditemukan.');
    }
    const scan = epcRtlScan_(ctx.db, epcStore_(), ctx.p);
    const g = scan.groups.find(function(x) { return x.key === key; });
    if (!g) throw new Error('Grup / item tidak ada di daftar tertinggal saat ini.');
    epcAppendRow_(EPC.SHEETS.RTL, [Utilities.getUuid().slice(0, 8).toUpperCase(), pid, g.f, g.key, g.code, g.name, aksi, pic, target, st, String(a.note || '').trim().slice(0, 300), week, st === 'SELESAI' ? week : '', by, now, by, now]);
    return { success: true, rtl: epcRtlView_(ctx.db, ctx.p) };
  } finally {
    lock.releaseLock();
  }
}

/** ADMIN: hapus tindak lanjut (salah input). */
function deleteEpcRtl(token, projectId, id) {
  const ctx = epcAdminCtx_(token, projectId), pid = ctx.p.id;
  const sh = epcSheet_(EPC.SHEETS.RTL, false);
  if (!sh) throw new Error('Tindak lanjut tidak ditemukan.');
  const n = sh.getLastRow(), v = n >= 2 ? sh.getRange(2, 1, n - 1, 2).getValues() : [];
  for (let i = 0; i < v.length; i++) if (String(v[i][0]) === String(id) && String(v[i][1]).trim().toUpperCase() === pid) { sh.deleteRow(i + 2); return { success: true, rtl: epcRtlView_(ctx.db, ctx.p) }; }
  throw new Error('Tindak lanjut tidak ditemukan.');
}

/** Dipanggil saat simpan laporan mingguan: tolak bila grup wajib belum punya tindak lanjut. */
function epcRtlGate_(db, p) {
  let v;
  try { v = epcRtlView_(db, p, epcStoreC_()); } catch (e) { return; }
  if (!v.active || !v.missing.length) return;
  throw new Error('Rencana tindak lanjut wajib belum lengkap: ' + v.missing.length + ' grup/item yang menggeser jadwal belum punya tindak lanjut (' +
    v.missing.slice(0, 3).map(function(g) { return g.name; }).join('; ') + (v.missing.length > 3 ? '; …' : '') + '). ADMIN mengisinya di bagian Concern dan mitigasi.');
}

// ===================== PENYESUAIAN KE LAPORAN KONTRAKTOR =====================

/** Riwayat kurva S dari laporan menimpa minggu sebelum `week` (dipakai saat revisi baseline dari laporan). */
function epcReplaceHistory_(pid, F, week, history, fileName, by, now) {
  const src = {}; (history || []).forEach(function(h) { const w = Number(h.week); if (w >= 1 && w < week && isFinite(Number(h.real))) src[w] = h; });
  const sh = epcSheet_(EPC.SHEETS.PROGRES, true), n = sh.getLastRow(), done = {};
  const line = function(w) { const h = src[w], pl = Number(h.plan) || 0, re = Number(h.real); return [pid, F, w, epcRound_(pl, 4), epcRound_(re, 4), epcRound_(re - pl, 4), '', 'LAPORAN (riwayat)', String(fileName || ''), by, now]; };
  if (n >= 2) {
    const v = sh.getRange(2, 1, n - 1, 3).getValues();
    for (let i = 0; i < v.length; i++) {
      const w = Number(v[i][2]);
      if (String(v[i][0]).trim().toUpperCase() !== pid || String(v[i][1]).trim().toUpperCase() !== F || !src[w] || done[w]) continue;
      sh.getRange(i + 2, 1, 1, 11).setValues([line(w)]); done[w] = true;
    }
  }
  const add = Object.keys(src).map(Number).filter(function(w) { return !done[w]; }).sort(function(a, b) { return a - b; }).map(line);
  if (add.length) epcAppend_(EPC.SHEETS.PROGRES, add);
}

/** Pemetaan ID baris laporan → ID item baseline per proyek + bidang. */
function epcAliasOf_(pid, F) {
  const m = {};
  epcRead_(EPC.SHEETS.ALIAS).forEach(function(r) {
    if (String(r.PROYEK_ID || '').trim().toUpperCase() !== pid || String(r.BIDANG || '').trim().toUpperCase() !== F) return;
    const lap = String(r.ID_LAPORAN || ''), base = String(r.ID_BASELINE || ''); if (!lap || !base) return;
    const at = r.DIBUAT_PADA instanceof Date && !isNaN(r.DIBUAT_PADA) ? formatDateId_(r.DIBUAT_PADA) : String(r.DIBUAT_PADA || '');
    m[lap] = { lap: lap, base: base, c: String(r.KODE_LAPORAN || ''), n: String(r.URAIAN_LAPORAN || ''), by: userDisplayName_(r.DIBUAT_OLEH), at: at };
  });
  return Object.keys(m).map(function(k) { return m[k]; });
}

function epcLogAdjust_(rows) { if (rows.length) epcAppend_(EPC.SHEETS.SESUAI, rows); }

function epcDeleteAliasRows_(pid, F, laps) {
  const sh = epcSheet_(EPC.SHEETS.ALIAS, false); if (!sh) return 0;
  const n = sh.getLastRow(); if (n < 2) return 0;
  const v = sh.getRange(2, 1, n - 1, 3).getValues(), want = {}; laps.forEach(function(x) { want[x] = 1; });
  let k = 0;
  for (let i = v.length - 1; i >= 0; i--) if (String(v[i][0]).trim().toUpperCase() === pid && String(v[i][1]).trim().toUpperCase() === F && want[String(v[i][2])]) { sh.deleteRow(i + 2); k++; }
  return k;
}

/** ADMIN: simpan pemetaan. a: {maps: [{lap, base, c, n}]} */
function saveEpcAlias(token, projectId, field, a) {
  const ctx = epcAdminCtx_(token, projectId), F = epcField_(field), pid = ctx.p.id, key = pid + '|' + F;
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const store = epcStore_(), set = store.setting[key];
    if (!set) throw new Error('Baseline ' + EPC.FIELDS[F] + ' belum disimpan.');
    const IX = {}; (store.items[key + '|' + set.rev] || []).forEach(function(x) { IX[x.id] = x; });
    const maps = (a && Array.isArray(a.maps) ? a.maps : []).slice(0, 500);
    if (!maps.length) throw new Error('Tidak ada pemetaan.');
    const used = {}, lapSeen = {}, rows = [], log = [], by = ctx.user.username || ctx.user.name || '', now = new Date();
    epcAliasOf_(pid, F).forEach(function(x) { used[x.base] = x.lap; });
    maps.forEach(function(m) {
      const lap = String(m.lap || '').trim(), base = String(m.base || '').trim();
      if (!lap || !base) throw new Error('Pemetaan tidak lengkap.');
      if (IX[lap]) throw new Error('ID ' + lap + ' sudah ada di baseline; tidak perlu dipetakan.');
      if (!IX[base]) throw new Error('Item baseline ' + base + ' tidak ada di baseline aktif.');
      if (lapSeen[lap]) throw new Error('Baris laporan ' + lap + ' dipetakan dua kali.');
      if (used[base] && used[base] !== lap) throw new Error('Item baseline ' + IX[base].c + ' sudah dipetakan ke baris laporan ' + used[base] + '.');
      lapSeen[lap] = 1; used[base] = lap;
      rows.push([pid, F, lap, base, String(m.c || '').slice(0, 60), String(m.n || '').slice(0, 300), by, now]);
      log.push([pid, F, set.rev, 'PEMETAAN', base, IX[base].c, '', lap, String(m.n || '').slice(0, 300), by, now]);
    });
    epcDeleteAliasRows_(pid, F, Object.keys(lapSeen));
    epcAppend_(EPC.SHEETS.ALIAS, rows);
    epcLogAdjust_(log);
    return getEpccData(token, pid, F);
  } finally {
    lock.releaseLock();
  }
}

function deleteEpcAlias(token, projectId, field, lap) {
  const ctx = epcAdminCtx_(token, projectId), F = epcField_(field), pid = ctx.p.id;
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    lap = String(lap || '');
    const old = epcAliasOf_(pid, F).find(function(x) { return x.lap === lap; });
    if (!old) throw new Error('Pemetaan tidak ditemukan.');
    epcDeleteAliasRows_(pid, F, [lap]);
    const set = epcStore_().setting[pid + '|' + F];
    epcLogAdjust_([[pid, F, set ? set.rev : '', 'HAPUS_PEMETAAN', old.base, '', lap, '', old.n, ctx.user.username || ctx.user.name || '', new Date()]]);
    return getEpccData(token, pid, F);
  } finally {
    lock.releaseLock();
  }
}

/** ADMIN: ubah bobot item di baseline aktif (tanpa revisi baru). a: {items: [{id, w}], note} */
function saveEpcWeights(token, projectId, field, a) {
  const ctx = epcAdminCtx_(token, projectId), F = epcField_(field), pid = ctx.p.id, key = pid + '|' + F;
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const note = String(a && a.note || '').trim().slice(0, 300);
    if (!note) throw new Error('Catatan wajib diisi.');
    const store = epcStore_(), set = store.setting[key];
    if (!set) throw new Error('Baseline ' + EPC.FIELDS[F] + ' belum disimpan.');
    const items = store.items[key + '|' + set.rev] || [], IX = {}; items.forEach(function(x) { IX[x.id] = x; });
    const nw = {};
    (a && Array.isArray(a.items) ? a.items : []).forEach(function(x) {
      const id = String(x.id || ''), w = Number(x.w);
      if (!IX[id]) throw new Error('Item ' + id + ' tidak ada di baseline aktif.');
      if (!(isFinite(w) && w >= 0 && w <= 100)) throw new Error('Bobot ' + IX[id].c + ' tidak valid.');
      nw[id] = epcRound_(w, 8);
    });
    const ids = Object.keys(nw); if (!ids.length) throw new Error('Tidak ada item yang dipilih.');
    const sh = epcSheet_(EPC.SHEETS.ITEM, false), n = sh ? sh.getLastRow() : 0;
    if (n < 2) throw new Error('Sheet item baseline kosong.');
    const COLW = EPC.SHEETS.ITEM[1].indexOf('BOBOT') + 1;
    const v = sh.getRange(2, 1, n - 1, 5).getValues(), wcol = sh.getRange(2, COLW, n - 1, 1).getValues();
    let lo = -1, hi = -1, hit = 0;
    for (let i = 0; i < v.length; i++) {
      if (String(v[i][0]).trim().toUpperCase() !== pid || String(v[i][1]).trim().toUpperCase() !== F || Number(v[i][2]) !== set.rev) continue;
      const id = String(v[i][4]); if (nw[id] === undefined) continue;
      wcol[i][0] = String(nw[id]); hit++; if (lo < 0) lo = i; hi = i;
    }
    if (!hit) throw new Error('Baris item tidak ditemukan di sheet baseline.');
    const rng = sh.getRange(lo + 2, COLW, hi - lo + 1, 1); rng.setNumberFormat('@'); rng.setValues(wcol.slice(lo, hi + 1).map(function(r) { return [String(r[0])]; }));
    const total = items.reduce(function(s, x) { return s + (nw[x.id] !== undefined ? nw[x.id] : x.w); }, 0);
    const rs = epcSheet_(EPC.SHEETS.REVISI, false), rn = rs ? rs.getLastRow() : 0;
    if (rn >= 2) {
      const rv = rs.getRange(2, 1, rn - 1, 3).getValues();
      for (let i = 0; i < rv.length; i++) if (String(rv[i][0]).trim().toUpperCase() === pid && String(rv[i][1]).trim().toUpperCase() === F && Number(rv[i][2]) === set.rev) { rs.getRange(i + 2, 6).setNumberFormat('@').setValue(String(epcRound_(total, 6))); break; }
    }
    const by = ctx.user.username || ctx.user.name || '', now = new Date();
    epcLogAdjust_(ids.map(function(id) { return [pid, F, set.rev, 'BOBOT', id, IX[id].c, String(IX[id].w), String(nw[id]), note, by, now]; }));
    return getEpccData(token, pid, F);
  } finally {
    lock.releaseLock();
  }
}

// ===================== TEMPLATE REALISASI PMO (satu file: Procurement, Construction, Commissioning) =====================

/** ADMIN: data ringkas ketiga bidang untuk menyusun / memeriksa template realisasi. */
function getEpccWeekPack(token, projectId) {
  const u0 = requireUser_(token);
  const ctx = ktrIs_(u0) ? ktrCtx_(u0, projectId, '') : epcAdminCtx_(token, projectId), pid = ctx.p.id, store = epcStoreC_();
  const fields = ['PROC', 'CONS', 'COM'].filter(function(F) { return !ctx.ktr || ctx.fields.indexOf(F) >= 0; }).map(function(F) {
    const key = pid + '|' + F, set = store.setting[key]; if (!set) return null;
    const params = epcParamsOf_(store, key, set.rev), st = store.real[key] || {};
    const items = (store.items[key + '|' + set.rev] || []).map(function(it) { return { id: it.id, c: it.c, n: it.n, d: it.d, gc: it.gc, g: it.g, t: it.t, w: it.w, plan: it.plan }; });
    const state = {}; Object.keys(st).forEach(function(id) { state[id] = { m: st[id].m, pg: st[id].pg }; });
    return { F: F, name: EPC.FIELDS[F], rev: set.rev, ms: params.ms || EPC.MS[F], prof: params.prof || null, groups: params.groups || [], items: items, state: state, stateWeek: store.realWeek[key] || null, bidang: epcFieldWeight_(ctx, F) };
  }).filter(function(x) { return x; });
  return { project: { id: pid, name: ctx.p.name, start: ctx.info.startIso, maxWeek: ctx.info.maxWeek, currentWeek: ctx.info.currentWeek }, fields: fields };
}

/** ADMIN: simpan realisasi dari template PMO. pack: {week, fields: {F: {rev, rows: [{id, m}]}}}. Semua bidang divalidasi dulu; bila ada yang gagal tidak ada yang disimpan. */
function saveEpccWeekPack(token, projectId, pack, fileName, curField) {
  const u0 = requireUser_(token);
  const ctx = ktrIs_(u0) ? ktrCtx_(u0, projectId, '') : epcAdminCtx_(token, projectId), pid = ctx.p.id;
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const store = epcStore_(), week = Math.round(Number(pack && pack.week));
    const Fs = Object.keys((pack && pack.fields) || {}).filter(function(F) { return ['PROC', 'CONS', 'COM'].indexOf(F) >= 0; });
    if (!Fs.length) return { success: false, errors: ['Tidak ada bidang yang terbaca dari template.'] };
    if (ctx.ktr) { const bad = Fs.filter(function(F) { return ctx.fields.indexOf(F) < 0; }); if (bad.length) return { success: false, errors: ['Template berisi bidang yang tidak ditugaskan ke akun Anda (' + bad.map(function(F) { return EPC.FIELDS[F]; }).join(', ') + '). Unduh template baru dari halaman ini.'] }; }
    const errors = [];
    const pay = {};
    Fs.forEach(function(F) {
      const f = pack.fields[F], set = store.setting[pid + '|' + F];
      if (!set) { errors.push(EPC.FIELDS[F] + ': baseline belum disimpan.'); return; }
      if (Number(f.rev) !== set.rev) { errors.push(EPC.FIELDS[F] + ': template memakai Baseline Rev ' + f.rev + ', baseline aktif Rev ' + set.rev + '. Unduh template baru.'); return; }
      pay[F] = { week: week, source: 'TEMPLATE', rows: (f.rows || []).map(function(r) { const pg = Number(r.pg); return { id: r.id, m: r.m, pg: r.pg === null || r.pg === undefined || r.pg === '' || !isFinite(pg) ? null : pg }; }) };
      try { const v = epcWeekCore_(ctx, store, F, pay[F], fileName, true); if (!v.success) (v.errors || []).forEach(function(e) { errors.push(EPC.FIELDS[F] + ': ' + e); }); }
      catch (e) { errors.push(EPC.FIELDS[F] + ': ' + e.message); }
    });
    if (errors.length) return { success: false, errors: errors.slice(0, 30) };
    if (ctx.ktr) return ktrSubmitEpc_(token, ctx, store, pay, fileName, String(curField || '').toUpperCase());
    const sums = {};
    Fs.forEach(function(F) { const r = epcWeekCore_(ctx, store, F, pay[F], fileName, false); sums[F] = r.summary; });
    const cf = ['PROC', 'CONS', 'COM'].indexOf(String(curField || '').toUpperCase()) >= 0 ? String(curField).toUpperCase() : Fs[0];
    return { success: true, week: week, fields: Fs, summary: sums, data: getEpccData(token, pid, cf) };
  } finally {
    lock.releaseLock();
  }
}

// ===================== ITEM SEPANJANG PROYEK (LOE) · CONSTRUCTION =====================

/** Status LOE item construction. o: {n, ps, pf, loex}; end = minggu selesai kontrak. Hasil {loe, auto, why}. */
function epcLoeOf_(o, end) {
  const E = Math.max(1, end || 0, o.pf || 0), span = (o.pf || 0) - (o.ps || 0) + 1;
  const kw = new RegExp(EPC.LOE_RE, 'i').test(String(o.n || ''));
  let auto = false, why = '';
  if (span >= EPC.LOE_SPAN * E && (o.ps || 1) <= Math.max(1, EPC.LOE_START * E)) { auto = true; why = 'rencana tersebar ' + span + ' dari ' + E + ' minggu sejak awal proyek'; }
  else if (kw && span >= EPC.LOE_SPAN_KW * E) { auto = true; why = 'uraian kegiatan pendukung, rencana tersebar ' + span + ' minggu'; }
  const x = String(o.loex || 'AUTO').toUpperCase();
  return { loe: x === 'YA' ? true : x === 'TIDAK' ? false : auto, auto: auto, why: why };
}

/** ADMIN: koreksi status LOE item construction. a: {item, loe: 'AUTO'|'YA'|'TIDAK', alasan} */
function saveEpcLoe(token, projectId, a) {
  a = a || {};
  const ctx = epcAdminCtx_(token, projectId), pid = ctx.p.id, key = pid + '|CONS';
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const store = epcStore_(), set = store.setting[key];
    if (!set) throw new Error('Baseline Construction belum disimpan.');
    const it = (store.items[key + '|' + set.rev] || []).find(function(x) { return x.id === String(a.item || ''); });
    if (!it) throw new Error('Item tidak ditemukan di baseline aktif.');
    const v = ['YA', 'TIDAK'].indexOf(String(a.loe || '').toUpperCase()) >= 0 ? String(a.loe).toUpperCase() : 'AUTO';
    const why = String(a.alasan || '').trim().slice(0, 300);
    if (v !== 'AUTO' && !why) throw new Error('Alasan koreksi wajib diisi.');
    if (v === (it.loex || 'AUTO')) throw new Error('Tidak ada perubahan.');
    epcAppendRow_(EPC.SHEETS.LOE, [pid, it.id, it.c, v, why, ctx.user.username || ctx.user.name || '', new Date()]);
    return getEpccData(token, pid, 'CONS');
  } finally {
    lock.releaseLock();
  }
}


// ===================== KONTRAKTOR · PENGAJUAN REALISASI MINGGUAN =====================
/*
 * Akun KONTRAKTOR terikat ke satu PROYEK_ID (sheet USER) dan satu/lebih bidang (sheet KONTRAKTOR_BIDANG).
 * Kontraktor hanya melihat proyeknya (Weekly Progress, Document Control, EPCC Control) dan mengisi realisasi mingguan
 * bidangnya dengan cara yang sama seperti tim proyek. Isiannya disimpan sebagai PENGAJUAN; data resmi baru berubah
 * setelah disetujui ADMIN atau INPUT/PIC proyek tersebut (satu tahap, boleh dikoreksi).
 * Status: DIAJUKAN → DISETUJUI | DIKEMBALIKAN | DIBATALKAN | DIGANTI.
 */
const KTR = {
  SHEETS: {
    BIDANG: ['KONTRAKTOR_BIDANG', ['USERNAME', 'PROYEK_ID', 'BIDANG', 'DIATUR_OLEH', 'DIATUR_PADA']],
    SUB: ['EPC_PENGAJUAN', ['ID', 'PROYEK_ID', 'BIDANG', 'WEEK', 'SUMBER', 'NAMA_FILE', 'RINGKASAN_JSON', 'STATUS', 'CATATAN', 'KOREKSI_JSON', 'DIAJUKAN_OLEH', 'DIAJUKAN_NAMA', 'DIAJUKAN_PADA', 'DITINJAU_OLEH', 'DITINJAU_NAMA', 'DITINJAU_PADA', 'BAGIAN']],
    DATA: ['EPC_PENGAJUAN_DATA', ['ID', 'BAGIAN', 'DATA']]
  },
  FIELDS: ['ENG', 'PROC', 'CONS', 'COM'],
  NAMES: { ENG: 'Engineering', PROC: 'Procurement', CONS: 'Construction', COM: 'Commissioning' },
  MSL: { PROC: ['FAT', 'FOB', 'MOS impor', 'MOS lokal'], CONS: ['Persiapan', 'Fabrikasi', 'Instalasi', 'Finishing'], COM: ['Tahap 1', 'Tahap 2', 'Tahap 3'] },
  CHUNK: 45000
};

function ktrIs_(user) { return !!user && String(user.role || '').trim().toUpperCase() === 'KONTRAKTOR'; }

/** Bidang yang ditugaskan ke akun kontraktor (untuk PROYEK_ID akunnya). */
function ktrFieldsOf_(user) {
  if (!ktrIs_(user)) return [];
  const u = String(user.username || '').trim().toLowerCase(), pid = normKey_(user.projectId || '');
  const cache = CacheService.getScriptCache(), key = 'ktrB|' + u + '|' + pid;
  const hit = cache.get(key);
  if (hit !== null) return hit ? hit.split(',') : [];
  let out = [], found = false;
  engRead_(KTR.SHEETS.BIDANG).forEach(function(r) {
    if (String(r.USERNAME || '').trim().toLowerCase() === u && normKey_(r.PROYEK_ID) === pid) {
      found = true; out = ktrParseFields_(r.BIDANG);
    }
  });
  // Akun kontraktor tanpa penugasan bidang (mis. role diubah langsung di sheet akun) atau penugasan kosong:
  // buka semua bidang EPCC proyeknya agar input realisasi mingguan tetap tersedia. Isian tetap menunggu persetujuan tim proyek.
  if (!found || !out.length) out = KTR.FIELDS.slice();
  cache.put(key, out.join(','), 120);
  return out;
}
function ktrParseFields_(v) {
  const seen = {};
  return String(v || '').toUpperCase().split(/[^A-Z]+/).map(function(f) { return f === 'PROCUREMENT' ? 'PROC' : f === 'CONSTRUCTION' ? 'CONS' : f === 'COMMISSIONING' || f === 'COMM' ? 'COM' : f === 'ENGINEERING' ? 'ENG' : f; })
    .filter(function(f) { if (KTR.FIELDS.indexOf(f) < 0 || seen[f]) return false; seen[f] = true; return true; });
}
function ktrCanField_(user, p, F) { return ktrIs_(user) && !!p && normKey_(user.projectId || '') === p.id && ktrFieldsOf_(user).indexOf(F) >= 0; }
function ktrBlock_(user) { if (ktrIs_(user)) throw new Error('Halaman ini tidak tersedia untuk akun kontraktor.'); }

/** Simpan penugasan bidang kontraktor (dipanggil saat ADMIN menyetujui akun). */
function ktrSetFields_(username, pid, fields, by) {
  const now = new Date();
  epcUpsert_(KTR.SHEETS.BIDANG, [String(username).toLowerCase(), pid], [String(username).toLowerCase(), pid, fields.join(','), by || '', now]);
  try { CacheService.getScriptCache().remove('ktrB|' + String(username).toLowerCase() + '|' + pid); } catch (e) {}
}

/** Konteks kontraktor untuk proyek + bidang (F kosong = cukup proyeknya). */
function ktrCtx_(user, projectId, F) {
  const db = loadDb_(), id = normKey_(projectId);
  const p = db.allProjects.find(function(x) { return x.id === id; }) || findProject_(db.allProjects, projectId);
  if (!p) throw new Error('Proyek tidak ditemukan.');
  if (normKey_(user.projectId || '') !== p.id) throw new Error('Akun kontraktor hanya untuk proyek ' + (user.project || user.projectId || '-') + '.');
  const fields = ktrFieldsOf_(user);
  if (!fields.length) throw new Error('Akun Anda belum ditugaskan ke bidang mana pun. Hubungi admin PMO.');
  if (F && fields.indexOf(F) < 0) throw new Error('Akun Anda tidak ditugaskan untuk bidang ' + KTR.NAMES[F] + '.');
  const info = engInfo_(db, p);
  if (!info.startIso) throw new Error('Tanggal mulai proyek belum diisi. Hubungi tim proyek.');
  return { user: user, db: db, p: p, info: info, ktr: true, fields: fields };
}

// ---------- penyimpanan pengajuan ----------
function ktrSubs_() {
  const fmtAt = function(v) { return v instanceof Date && !isNaN(v) ? formatDateId_(v) + ' ' + String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0') : String(v || ''); };
  const js = function(v, d) { try { return v === '' || v === null || v === undefined ? d : JSON.parse(String(v)); } catch (e) { return d; } };
  return engRead_(KTR.SHEETS.SUB).filter(function(r) { return String(r.ID || '').trim(); }).map(function(r) {
    const at = r.DIAJUKAN_PADA instanceof Date ? r.DIAJUKAN_PADA : new Date(r.DIAJUKAN_PADA);
    const rt = r.DITINJAU_PADA instanceof Date ? r.DITINJAU_PADA : (r.DITINJAU_PADA ? new Date(r.DITINJAU_PADA) : null);
    return { id: String(r.ID).trim(), pid: normKey_(r.PROYEK_ID), F: String(r.BIDANG || '').trim().toUpperCase(), week: Number(r.WEEK) || 0,
      src: String(r.SUMBER || ''), file: String(r.NAMA_FILE || ''), sum: js(r.RINGKASAN_JSON, {}), status: String(r.STATUS || '').trim().toUpperCase(),
      note: String(r.CATATAN || ''), fix: js(r.KOREKSI_JSON, null), byU: String(r.DIAJUKAN_OLEH || '').toLowerCase(), by: String(r.DIAJUKAN_NAMA || r.DIAJUKAN_OLEH || ''),
      atTs: isNaN(at) ? 0 : at.getTime(), at: fmtAt(at), rvU: String(r.DITINJAU_OLEH || '').toLowerCase(), rv: String(r.DITINJAU_NAMA || r.DITINJAU_OLEH || ''),
      rvTs: rt && !isNaN(rt) ? rt.getTime() : 0, rvAt: rt ? fmtAt(rt) : '', parts: Number(r.BAGIAN) || 1 };
  });
}
function ktrPayload_(id) {
  const parts = engRead_(KTR.SHEETS.DATA).filter(function(r) { return String(r.ID || '').trim() === id; })
    .sort(function(a, b) { return Number(a.BAGIAN) - Number(b.BAGIAN); }).map(function(r) { return String(r.DATA || ''); });
  if (!parts.length) throw new Error('Isi pengajuan ' + id + ' tidak ditemukan.');
  return JSON.parse(parts.join(''));
}
function ktrSetRow_(id, patch) {
  const sh = engSheet_(KTR.SHEETS.SUB, true), n = sh.getLastRow();
  if (n < 2) throw new Error('Pengajuan tidak ditemukan.');
  const head = KTR.SHEETS.SUB[1], ids = sh.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() !== id) continue;
    Object.keys(patch).forEach(function(k) { const c = head.indexOf(k); if (c >= 0) sh.getRange(i + 2, c + 1).setValue(patch[k]); });
    return;
  }
  throw new Error('Pengajuan tidak ditemukan.');
}
function ktrNewSub_(ctx, F, week, source, fileName, payload, summary) {
  const id = 'AJU-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
  const s = JSON.stringify(payload), parts = [];
  for (let i = 0; i < s.length; i += KTR.CHUNK) parts.push([id, parts.length + 1, s.slice(i, i + KTR.CHUNK)]);
  engAppend_(KTR.SHEETS.DATA, parts, true);
  const u = ctx.user;
  engAppend_(KTR.SHEETS.SUB, [[id, ctx.p.id, F, week, source, String(fileName || ''), JSON.stringify(summary || {}), 'DIAJUKAN', '', '',
    String(u.username || '').toLowerCase(), u.name || u.username || '', new Date(), '', '', '', parts.length]], false);
  return id;
}
/** Satu pengajuan aktif per bidang: WEEK sama → yang lama diganti; WEEK lain → tunggu disetujui / batalkan. */
function ktrGuardPending_(pid, F, week) {
  const pend = ktrSubs_().filter(function(s) { return s.pid === pid && s.F === F && s.status === 'DIAJUKAN'; });
  const other = pend.filter(function(s) { return s.week !== week; });
  if (other.length) throw new Error('Pengajuan ' + KTR.NAMES[F] + ' WEEK ' + other[0].week + ' masih menunggu persetujuan. Tunggu disetujui atau batalkan pengajuan itu dulu.');
  return pend;
}

/** Kontraktor: simpan isian EPCC (satu atau beberapa bidang) sebagai pengajuan. pays = {F: payload}. */
function ktrSubmitEpc_(token, ctx, store, pays, fileName, curField) {
  const Fs = Object.keys(pays), errors = [], sums = {}, old = {};
  Fs.forEach(function(F) {
    if (ctx.fields.indexOf(F) < 0) { errors.push('Bidang ' + EPC.FIELDS[F] + ' tidak ditugaskan ke akun Anda.'); return; }
    const week = Math.round(Number(pays[F].week));
    try { old[F] = ktrGuardPending_(ctx.p.id, F, week); } catch (e) { errors.push(e.message); return; }
    try {
      const v = epcWeekCore_(ctx, store, F, pays[F], fileName, true);
      if (!v.success) { (v.errors || []).forEach(function(e) { errors.push(EPC.FIELDS[F] + ': ' + e); }); return; }
      const hist = store.progress[ctx.p.id + '|' + F] || [];
      const prev = hist.filter(function(h) { return h.week < week; }).sort(function(a, b) { return a.week - b.week; }).pop();
      sums[F] = { plan: epcRound_(v.summary.plan, 4), real: epcRound_(v.summary.real, 4), prev: prev ? epcRound_(prev.real, 4) : 0, rows: (pays[F].rows || []).length };
    } catch (e) { errors.push(EPC.FIELDS[F] + ': ' + e.message); }
  });
  if (errors.length) return { success: false, errors: errors.slice(0, 30) };
  const ids = [];
  Fs.forEach(function(F) {
    (old[F] || []).forEach(function(s) { ktrSetRow_(s.id, { STATUS: 'DIGANTI', CATATAN: 'Diganti pengajuan baru', DITINJAU_PADA: new Date() }); });
    ids.push(ktrNewSub_(ctx, F, Math.round(Number(pays[F].week)), String(pays[F].source || 'MANUAL').toUpperCase(), fileName, pays[F], sums[F]));
  });
  const cf = Fs.indexOf(curField) >= 0 ? curField : Fs[0];
  return { success: true, submitted: true, ids: ids, week: Math.round(Number(pays[Fs[0]].week)), fields: Fs, summary: sums, data: getEpccData(token, ctx.p.id, cf) };
}

/** Kontraktor: simpan file realisasi engineering sebagai pengajuan. */
function ktrSubmitEng_(token, ctx, parsed, fileName) {
  const store = engStore_();
  const res = engValidateRealisasi_(ctx, parsed, store);
  if (res.errors.length) { delete res.clean; return { success: false, check: res }; }
  const old = ktrGuardPending_(ctx.p.id, 'ENG', res.week);
  old.forEach(function(s) { ktrSetRow_(s.id, { STATUS: 'DIGANTI', CATATAN: 'Diganti pengajuan baru', DITINJAU_PADA: new Date() }); });
  const s = res.summary;
  const id = ktrNewSub_(ctx, 'ENG', res.week, 'TEMPLATE', fileName, { parsed: parsed },
    { plan: engRound_(s.plan, 4), real: engRound_(s.real, 4), prev: engRound_(s.prev, 4), rows: s.docs });
  return { success: true, submitted: true, ids: [id], week: res.week, data: getEngineeringData(token, ctx.p.id) };
}

// ---------- tinjauan ----------
function ktrViewCtx_(token, projectId) {
  const user = requireUser_(token), db = loadDb_(), id = normKey_(projectId);
  const p = db.allProjects.find(function(x) { return x.id === id; }) || findProject_(db.allProjects, projectId);
  if (!p) throw new Error('Proyek tidak ditemukan.');
  const isK = ktrIs_(user) && normKey_(user.projectId || '') === p.id, canReview = userCanOperateProject_(user, p);
  return { user: user, db: db, p: p, isK: isK, canReview: canReview };
}
function ktrPublic_(s) {
  return { id: s.id, F: s.F, field: KTR.NAMES[s.F] || s.F, week: s.week, src: s.src, file: s.file, sum: s.sum, status: s.status, note: s.note,
    by: s.by, byU: s.byU, at: s.at, atTs: s.atTs, rv: s.rv, rvAt: s.rvAt, fixed: !!(s.fix && Object.keys(s.fix).length) };
}

/** Daftar pengajuan proyek (kontraktor proyek itu, atau ADMIN / INPUT / PIC proyek). */
function getEpcSubmissions(token, projectId) {
  const c = ktrViewCtx_(token, projectId);
  if (!c.isK && !c.canReview) return { success: true, visible: false };
  const all = ktrSubs_().filter(function(s) { return s.pid === c.p.id && s.status !== 'DIGANTI'; }).sort(function(a, b) { return b.atTs - a.atTs; });
  return { success: true, visible: true, project: { id: c.p.id, name: c.p.name }, isKtr: c.isK, canReview: c.canReview,
    fields: c.isK ? ktrFieldsOf_(c.user) : [], me: String(c.user.username || '').toLowerCase(),
    pending: all.filter(function(s) { return s.status === 'DIAJUKAN'; }).map(ktrPublic_),
    items: all.slice(0, 40).map(ktrPublic_) };
}

/** Detail satu pengajuan: baris yang berubah dibanding data resmi, siap dikoreksi. */
function getEpcSubmission(token, id) {
  const s = ktrSubs_().find(function(x) { return x.id === String(id || ''); });
  if (!s) throw new Error('Pengajuan tidak ditemukan.');
  const c = ktrViewCtx_(token, s.pid);
  if (!c.isK && !c.canReview) throw new Error('Akun Anda tidak dapat membuka pengajuan ini.');
  const pay = ktrPayload_(s.id), out = ktrPublic_(s);
  out.project = { id: c.p.id, name: c.p.name };
  out.canReview = c.canReview && s.status === 'DIAJUKAN';
  out.canCancel = s.status === 'DIAJUKAN' && (c.canReview || (c.isK && s.byU === String(c.user.username || '').toLowerCase()));
  if (s.F === 'ENG') ktrDiffEng_(c, pay, out); else ktrDiffEpc_(c, s.F, pay, out);
  if (s.fix) out.fix = s.fix;
  return out;
}

function ktrDiffEpc_(c, F, pay, out) {
  const store = epcStore_(), key = c.p.id + '|' + F, set = store.setting[key];
  if (!set) throw new Error('Baseline ' + EPC.FIELDS[F] + ' belum ada.');
  const items = store.items[key + '|' + set.rev] || [], params = epcParamsOf_(store, key, set.rev), st = store.real[key] || {};
  const byId = {}; items.forEach(function(it) { byId[it.id] = it; });
  const px = F === 'PROC' && epcProcX_(params);
  const cx = F === 'CONS' && !!(params.prof && params.prof.length);
  const L = px ? ['FAT (impor) / Fabrikasi (lokal)', 'FOB', 'MOS impor', 'MOS lokal / Manufacturing (impor)'] : cx ? ['Tahap 1', 'Tahap 2', 'Tahap 3', 'Tahap 4'] : KTR.MSL[F];
  out.cols = L.map(function(l, k) { return { k: k, l: l + ' %', t: 'num' }; });
  out.stateWeek = store.realWeek[key] || null;
  const rows = [];
  (pay.rows || []).forEach(function(r) {
    const it = byId[String(r.id)]; if (!it) return;
    const pv = (st[it.id] || {}).m || [0, 0, 0, 0], ppg = (st[it.id] || {}).pg || 0;
    const nx = [0, 1, 2, 3].map(function(k) { const x = Number(r.m && r.m[k]); return isFinite(x) ? Math.max(0, Math.min(100, x)) : (pv[k] || 0); });
    if (F === 'PROC' && String(pay.source || '').toUpperCase() === 'LAPORAN') epcKeepExtra_(it, params, nx, pv);
    const npg = r.pg === null || r.pg === undefined || r.pg === '' ? epcProg_(F, it, nx, params) : Number(r.pg) || 0;
    const ed = F === 'PROC' ? (it.t === 'LN' ? (px ? [3, 0, 1, 2] : [0, 1, 2]) : (px ? [0, 3] : [3])) : F === 'COM' ? [0, 1, 2] : cx ? (function() { const w = epcConsW_(params, it.t); return [0, 1, 2, 3].filter(function(k) { return !w || w[k] > 0; }); })() : [0, 1, 2, 3];
    const changed = ed.some(function(k) { return Math.abs((nx[k] || 0) - (Number(pv[k]) || 0)) > 1e-6; }) || Math.abs(npg - ppg) > 1e-6;
    if (!changed) return;
    rows.push({ id: it.id, c: it.c, n: it.n, g: it.g || it.d || '', w: it.w, ed: ed, prev: ed.map(function(k) { return epcRound_(Number(pv[k]) || 0, 2); }), next: ed.map(function(k) { return epcRound_(nx[k], 2); }),
      pgPrev: epcRound_(ppg, 2), pg: epcRound_(npg, 2), plan: epcRound_(epcPlanAt_(it.plan, Number(pay.week)), 2) });
  });
  rows.sort(function(a, b) { return (b.w * Math.abs(b.pg - b.pgPrev)) - (a.w * Math.abs(a.pg - a.pgPrev)); });
  out.total = rows.length; out.rows = rows.slice(0, 600); out.items = items.length;
}

function ktrEngVals_(r) {
  r = r || {}; const st = r.st || [[], [], []], cd = function(x) { return x === null || x === undefined ? '' : String(x).trim(); };
  return [engIso_(r.mulai), engIso_((st[0] || [])[0]), cd((st[0] || [])[2]), engIso_((st[1] || [])[0]), cd((st[1] || [])[2]), engIso_((st[2] || [])[0]), cd((st[2] || [])[2]), engIso_(r.ifi)];
}
function ktrDiffEng_(c, pay, out) {
  const store = engStore_(), set = store.setting[c.p.id];
  if (!set || set.rev === null) throw new Error('Baseline engineering belum ada.');
  const base = engBaselineOf_(store, c.p.id, set.rev), prev = engStateOf_(store, c.p.id) || {};
  const byNo = {}; base.forEach(function(d) { byNo[d.no] = d; });
  out.cols = [['Mulai', 'date'], ['IFR terbit', 'date'], ['IFR kode', 'code'], ['IFA terbit', 'date'], ['IFA kode', 'code'], ['IFC terbit', 'date'], ['IFC kode', 'code'], ['IFI terbit', 'date']]
    .map(function(x, k) { return { k: k, l: x[0], t: x[1] }; });
  try { out.codes = engParamsOf_(store, c.p.id, set.rev).codes.map(function(x) { return [String(x[0]), String(x[1] || ''), x[2] === 'YA']; }); } catch (e) { out.codes = []; }
  const rows = [];
  ((pay.parsed || {}).rows || []).forEach(function(r) {
    const no = String(r.no || '').trim(), d = byNo[no]; if (!d) return;
    const pv = ktrEngVals_(prev[no]), nx = ktrEngVals_(r);
    if (pv.join('|') === nx.join('|')) return;
    rows.push({ id: no, c: no, n: d.name, g: d.disc || '', w: d.w, ed: [0, 1, 2, 3, 4, 5, 6, 7], prev: pv, next: nx, pola: d.pola });
  });
  out.total = rows.length; out.rows = rows.slice(0, 600); out.items = base.length;
  out.info = (pay.parsed || {}).info || {};
}

/** ADMIN / INPUT / PIC proyek: setujui (boleh dengan koreksi) atau kembalikan pengajuan. fix = {rowId: [nilai sesuai kolom ed]} */
function reviewEpcSubmission(token, id, decision, note, fix) {
  requireUser_(token); // C3: periksa sesi sebelum mengambil lock
  decision = String(decision || '').toUpperCase(); note = String(note || '').trim().slice(0, 1000);
  if (['APPROVE', 'RETURN'].indexOf(decision) < 0) throw new Error('Keputusan tidak dikenal.');
  if (decision === 'RETURN' && note.length < 3) throw new Error('Tulis catatan untuk kontraktor saat mengembalikan pengajuan.');
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const s = ktrSubs_().find(function(x) { return x.id === String(id || ''); });
    if (!s) throw new Error('Pengajuan tidak ditemukan.');
    if (s.status !== 'DIAJUKAN') throw new Error('Pengajuan ini sudah ' + s.status.toLowerCase() + '. Muat ulang daftar.');
    const user = requireUser_(token), db = loadDb_();
    const p = db.allProjects.find(function(x) { return x.id === s.pid; });
    if (!p || !userCanOperateProject_(user, p)) throw new Error('Persetujuan hanya untuk ADMIN atau tim proyek (INPUT/PIC) ' + (p ? p.name : '') + '.');
    const by = String(user.username || '').toLowerCase(), byN = user.name || user.username || '';
    if (decision === 'RETURN') {
      ktrSetRow_(s.id, { STATUS: 'DIKEMBALIKAN', CATATAN: note, DITINJAU_OLEH: by, DITINJAU_NAMA: byN, DITINJAU_PADA: new Date() });
      return { success: true, status: 'DIKEMBALIKAN' };
    }
    const pay = ktrPayload_(s.id), fixed = {};
    fix = fix && typeof fix === 'object' ? fix : {};
    let res;
    if (s.F === 'ENG') {
      const rows = (pay.parsed && pay.parsed.rows) || [];
      Object.keys(fix).forEach(function(no) {
        const r = rows.find(function(x) { return String(x.no || '').trim() === no; }), v = fix[no];
        if (!r || !Array.isArray(v) || v.length !== 8) return;
        const before = ktrEngVals_(r).join('|');
        r.st = r.st || [[], [], []];
        r.mulai = String(v[0] || ''); r.ifi = String(v[7] || '');
        [[1, 2, 0], [3, 4, 1], [5, 6, 2]].forEach(function(q) { const x = r.st[q[2]] = (r.st[q[2]] || ['', '', '']).slice(); x[0] = String(v[q[0]] || ''); x[2] = String(v[q[1]] || '').trim(); if (!x[0]) { x[1] = ''; x[2] = x[2] || ''; } });
        if (ktrEngVals_(r).join('|') !== before) fixed[no] = v;
      });
      const ctx = engAdminCtx_(token, p.id);
      res = engSaveRealCore_(ctx, engStore_(), pay.parsed, s.file);
      if (!res.success) return { success: false, errors: (res.check.errors || []).map(function(e) { return e.label + (e.items && e.items.length ? ' (' + e.items.slice(0, 5).join(', ') + ')' : ''); }).slice(0, 20) };
    } else {
      const F = s.F, rows = pay.rows || [];
      Object.keys(fix).forEach(function(rid) {
        const r = rows.find(function(x) { return String(x.id) === rid; }), v = fix[rid];
        if (!r || !v || typeof v !== 'object') return;
        const m = (r.m || [0, 0, 0, 0]).slice(); let ch = false;
        Object.keys(v).forEach(function(k) { const kk = Number(k), x = Number(v[k]); if (kk >= 0 && kk < 4 && isFinite(x)) { const y = Math.max(0, Math.min(100, x)); if (Math.abs(y - (Number(m[kk]) || 0)) > 1e-9) { m[kk] = y; ch = true; } } });
        if (ch) { r.m = m; r.pg = null; fixed[rid] = v; }
      });
      const ctx = epcAdminCtx_(token, p.id), store = epcStore_();
      res = epcWeekCore_(ctx, store, F, pay, s.file, false);
      if (!res.success) return { success: false, errors: res.errors || ['Gagal menyimpan.'] };
    }
    ktrSetRow_(s.id, { STATUS: 'DISETUJUI', CATATAN: note, KOREKSI_JSON: Object.keys(fixed).length ? JSON.stringify(fixed) : '', DITINJAU_OLEH: by, DITINJAU_NAMA: byN, DITINJAU_PADA: new Date() });
    try { dataChanged_(); } catch (e) {}
    return { success: true, status: 'DISETUJUI', week: s.week, F: s.F, fixed: Object.keys(fixed).length, weeklyNote: res.weeklyNote || '' };
  } finally {
    DB_CACHE_ = null;
    lock.releaseLock();
  }
}

/** Batalkan pengajuan yang belum ditinjau (kontraktor pengaju, atau ADMIN / INPUT / PIC proyek). */
function cancelEpcSubmission(token, id) {
  const lock = pmoLock_('EPCENG');
  lock.waitLock(30000);
  try {
    const s = ktrSubs_().find(function(x) { return x.id === String(id || ''); });
    if (!s) throw new Error('Pengajuan tidak ditemukan.');
    if (s.status !== 'DIAJUKAN') throw new Error('Pengajuan ini sudah ' + s.status.toLowerCase() + '.');
    const c = ktrViewCtx_(token, s.pid), me = String(c.user.username || '').toLowerCase();
    if (!c.canReview && !(c.isK && s.byU === me)) throw new Error('Hanya pengaju atau tim proyek yang bisa membatalkan.');
    ktrSetRow_(s.id, { STATUS: 'DIBATALKAN', CATATAN: c.isK ? 'Dibatalkan pengaju' : 'Dibatalkan tim proyek', DITINJAU_OLEH: me, DITINJAU_NAMA: c.user.name || me, DITINJAU_PADA: new Date() });
    return { success: true };
  } finally { lock.releaseLock(); }
}

/** Notifikasi terkait pengajuan (dipanggil getNotifications). */
function ktrNotifications_(user) {
  const items = [], role = String(user.role || '').toUpperCase(), DAY = 86400000, now = Date.now();
  let subs; try { subs = ktrSubs_(); } catch (e) { return items; }
  const pageOf = function(F) { return F === 'ENG' ? { page: 'engineering' } : { page: 'epcc', field: F }; };
  if (ktrIs_(user)) {
    const me = String(user.username || '').toLowerCase(), pid = normKey_(user.projectId || '');
    subs.filter(function(s) { return s.pid === pid && s.byU === me && (s.status === 'DIKEMBALIKAN' || s.status === 'DISETUJUI') && now - s.rvTs < 14 * DAY; }).forEach(function(s) {
      const back = s.status === 'DIKEMBALIKAN';
      items.push({ id: 'aju:' + s.id + ':' + s.status, kind: 'review', level: back ? 'bad' : 'info', project: user.project || '',
        title: (back ? 'Pengajuan dikembalikan · ' : 'Pengajuan disetujui · ') + KTR.NAMES[s.F] + ' W' + s.week,
        text: back ? 'Catatan ' + (s.rv || 'tim proyek') + ': ' + s.note : 'Disetujui ' + (s.rv || '') + (s.fix && Object.keys(s.fix).length ? ' dengan koreksi ' + Object.keys(s.fix).length + ' baris' : '') + '.',
        when: s.rvAt, sort: back ? 1 : 3, ts: s.rvTs, action: Object.assign({ project: user.project || '' }, pageOf(s.F)) });
    });
    // pengingat: minggu yang sudah berakhir tetapi belum diajukan
    try {
      const db = loadDb_(), p = db.allProjects.find(function(x) { return x.id === pid; });
      if (p) {
        const info = engInfo_(db, p), st = info.startIso ? new Date(info.startIso + 'T00:00:00') : null;
        if (st) {
          const ended = weekForDate_(st, new Date()) - 1, es = epcStoreC_(), gs = engStoreC_();
          ktrFieldsOf_(user).forEach(function(F) {
            let last = 0, has = false;
            if (F === 'ENG') { const s0 = gs.setting[pid]; has = !!(s0 && s0.rev !== null); last = gs.stateWeek[pid] || 0; }
            else { has = !!es.setting[pid + '|' + F]; last = es.realWeek[pid + '|' + F] || 0; }
            if (!has) return;
            const pend = subs.filter(function(s) { return s.pid === pid && s.F === F && s.status === 'DIAJUKAN'; }).map(function(s) { return s.week; });
            const top = Math.max.apply(null, [last].concat(pend));
            if (ended >= 1 && top < ended) items.push({ id: 'ktrw:' + pid + ':' + F + ':' + ended, kind: 'weekly', level: ended - top >= 2 ? 'bad' : 'warn', project: p.name,
              title: 'Realisasi ' + KTR.NAMES[F] + ' W' + ended + ' belum diajukan', text: 'Isian terakhir W' + (top || '–') + '. Ajukan realisasi mingguan lewat EPCC Control.',
              when: '', sort: 2, ts: now, action: Object.assign({ project: p.name }, pageOf(F)) });
          });
        }
      }
    } catch (e) { /* data proyek belum siap */ }
    return items;
  }
  if (role !== 'ADMIN' && role !== 'INPUT' && role !== 'PIC') return items;
  let db = null; try { db = loadDb_(); } catch (e) { return items; }
  subs.filter(function(s) { return s.status === 'DIAJUKAN'; }).forEach(function(s) {
    const p = db.allProjects.find(function(x) { return x.id === s.pid; });
    if (!p || !userCanOperateProject_(user, p)) return;
    items.push({ id: 'aju:' + s.id, kind: 'review', level: 'warn', project: p.name, title: 'Persetujuan realisasi ' + KTR.NAMES[s.F] + ' W' + s.week,
      text: (s.by || s.byU) + ' mengajukan realisasi ' + (s.sum && s.sum.real != null ? (Math.round(s.sum.real * 100) / 100).toString().replace('.', ',') + '%' : '') + (s.file ? ' · ' + s.file : '') + '.',
      when: s.at, sort: 0, ts: s.atTs, action: Object.assign({ project: p.name }, pageOf(s.F)) });
  });
  return items;
}

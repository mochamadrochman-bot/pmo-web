/**
 * STATUS PROYEK & ADDENDUM (khusus ADMIN)
 *
 * Status proyek 3 tahap : BERJALAN -> SELESAI -> DITUTUP
 * Addendum              : BIAYA (nilai kontrak) dan/atau WAKTU (perpanjangan + revisi baseline)
 *
 * Data disimpan di DATA BULANAN (kolom VALUE) dan sheet RIWAYAT ADDENDUM.
 * Nilai di DATA BULANAN selalu nilai TERKINI; nilai awal disimpan di item *_AWAL.
 */

const LIFECYCLE_CONFIG = {
  ADDENDUM_SHEET: 'RIWAYAT ADDENDUM',
  ADDENDUM_HEADERS: ['WAKTU_INPUT', 'USERNAME', 'PROYEK_ID', 'NAMA_PROYEK', 'NO_ADDENDUM', 'NOMOR_DOKUMEN',
    'TANGGAL_ADDENDUM', 'JENIS', 'ALASAN', 'LINK_DOKUMEN', 'NILAI_KONTRAK_LAMA', 'NILAI_KONTRAK_BARU', 'SELISIH_NILAI',
    'FINISH_LAMA', 'FINISH_BARU', 'MAX_WEEK_LAMA', 'MAX_WEEK_BARU', 'REVISI_BASELINE', 'WEEK_MULAI_REVISI', 'SNAPSHOT_PLAN'],
  STAGES: ['BERJALAN', 'SELESAI', 'DITUTUP'],
  // Item proyek yang ditambahkan otomatis (sekali) di akhir blok proyek pada DATA BULANAN.
  ITEMS: ['STATUS_PROYEK', 'TANGGAL_SELESAI_AKTUAL', 'WEEK_SELESAI', 'TANGGAL_DITUTUP', 'LINK_BAST',
    'NILAI_KONTRAK_AWAL', 'EFEKTIF_DATE_FINISH_AWAL', 'MAX_WEEK_AWAL', 'JUMLAH_ADDENDUM', 'REVISI_BASELINE']
};

// ===================== BACA STATUS =====================

/**
 * Ringkasan siklus proyek. Bila atDate diisi, status dihitung pada tanggal tersebut
 * (proyek yang selesai sesudah atDate dianggap masih BERJALAN pada periode itu).
 */
function projectLifecycle_(db, p, atDate) {
  db._life = db._life || {};
  let base = db._life[p.id];
  if (!base) {
    const raw = normKey_(monthlyText_(db, p.id, 'STATUS_PROYEK'));
    const info = weeklyInfo_(db, p);
    const finishDate = monthlyDate_(db, p.id, 'TANGGAL_SELESAI_AKTUAL');
    const closeDate = monthlyDate_(db, p.id, 'TANGGAL_DITUTUP');
    const finishPlan = monthlyDate_(db, p.id, 'EFEKTIF_DATE_FINISH');
    const finishInitial = monthlyDate_(db, p.id, 'EFEKTIF_DATE_FINISH_AWAL') || finishPlan;
    const maxWeek = Number(monthlyValue_(db, p.id, 'MAX_WEEK')) || info.planEndWeek || null;
    const maxWeekInitial = Number(monthlyValue_(db, p.id, 'MAX_WEEK_AWAL')) || maxWeek;
    const contract = monthlyValue_(db, p.id, 'NILAI_KONTRAK');
    const contractInitial = monthlyValue_(db, p.id, 'NILAI_KONTRAK_AWAL');
    let finishWeek = Number(monthlyValue_(db, p.id, 'WEEK_SELESAI')) || null;
    if (!finishWeek && finishDate && info.startDate) finishWeek = weekForDate_(info.startDate, finishDate);
    base = {
      stage: raw === 'DITUTUP' ? 'DITUTUP' : raw === 'SELESAI' ? 'SELESAI' : 'BERJALAN',
      finishDate: finishDate, closeDate: closeDate, finishWeek: finishWeek,
      bastUrl: monthlyText_(db, p.id, 'LINK_BAST'),
      finishPlan: finishPlan, finishInitial: finishInitial,
      maxWeek: maxWeek, maxWeekInitial: maxWeekInitial,
      contract: contract, contractInitial: contractInitial === null ? contract : contractInitial,
      addendumCount: Number(monthlyValue_(db, p.id, 'JUMLAH_ADDENDUM')) || 0,
      revision: Number(monthlyValue_(db, p.id, 'REVISI_BASELINE')) || 0,
      startDate: info.startDate, latestWeek: info.latestWeek
    };
    db._life[p.id] = base;
  }
  const life = Object.assign({}, base);
  if (atDate) {
    if (life.stage === 'DITUTUP' && life.closeDate && life.closeDate > atDate) life.stage = 'SELESAI';
    if (life.stage === 'SELESAI' && life.finishDate && life.finishDate > atDate) life.stage = 'BERJALAN';
  }
  return life;
}

/** Versi aman untuk dikirim ke halaman (tanpa objek Date). */
function lifecycleView_(db, p, atDate) {
  const L = projectLifecycle_(db, p, atDate);
  const today = new Date();
  const calendarWeek = L.startDate ? weekForDate_(L.startDate, today) : null;
  const overdueWeeks = L.stage === 'BERJALAN' && L.maxWeek && calendarWeek && calendarWeek > L.maxWeek
    ? calendarWeek - L.maxWeek : 0;
  const timing = function(ref) {
    if (!L.finishWeek || !ref) return null;
    const d = L.finishWeek - ref;
    return { weeks: d, label: d > 0 ? 'Terlambat ' + d + ' minggu' : d < 0 ? 'Lebih cepat ' + (-d) + ' minggu' : 'Tepat waktu' };
  };
  const delta = L.contract !== null && L.contractInitial !== null ? L.contract - L.contractInitial : null;
  return {
    stage: L.stage,
    stageLabel: L.stage === 'DITUTUP' ? 'Ditutup' : L.stage === 'SELESAI' ? 'Selesai' : 'Berjalan',
    finishDate: L.finishDate ? isoDate_(L.finishDate) : '',
    finishText: L.finishDate ? formatDateId_(L.finishDate) : '',
    finishWeek: L.finishWeek,
    closeDate: L.closeDate ? isoDate_(L.closeDate) : '',
    closeText: L.closeDate ? formatDateId_(L.closeDate) : '',
    bastUrl: /^https?:\/\//i.test(L.bastUrl) ? L.bastUrl : '',
    maxWeek: L.maxWeek, maxWeekInitial: L.maxWeekInitial,
    finishPlanText: L.finishPlan ? formatDateId_(L.finishPlan) : '',
    finishInitialText: L.finishInitial ? formatDateId_(L.finishInitial) : '',
    extendedWeeks: L.maxWeek && L.maxWeekInitial ? L.maxWeek - L.maxWeekInitial : 0,
    contract: L.contract, contractInitial: L.contractInitial, contractDelta: delta,
    contractDeltaPercent: delta !== null && L.contractInitial ? delta / L.contractInitial : null,
    addendumCount: L.addendumCount, revision: L.revision,
    calendarWeek: calendarWeek, overdueWeeks: overdueWeeks,
    timingCurrent: timing(L.maxWeek), timingInitial: timing(L.maxWeekInitial)
  };
}

/** Riwayat addendum satu proyek (urut nomor). */
function readAddenda_(db, projectId) {
  if (!db._addenda) {
    db._addenda = {};
    const sh = db.ss.getSheetByName(LIFECYCLE_CONFIG.ADDENDUM_SHEET);
    if (sh && sh.getLastRow() > 1) {
      const values = sh.getDataRange().getValues();
      const head = values[0].map(function(h) { return normKey_(h); });
      const ix = function(k) { return head.indexOf(k); };
      for (let r = 1; r < values.length; r++) {
        const row = values[r];
        const id = normKey_(row[ix('PROYEK_ID')]);
        if (!id) continue;
        const d = function(k) { const v = row[ix(k)]; return v instanceof Date ? isoDate_(v) : String(v || ''); };
        const n = function(k) { const v = row[ix(k)]; return v === '' || v === null ? null : Number(v); };
        let snapshot = null;
        try { snapshot = row[ix('SNAPSHOT_PLAN')] ? JSON.parse(row[ix('SNAPSHOT_PLAN')]) : null; } catch (e) { snapshot = null; }
        (db._addenda[id] = db._addenda[id] || []).push({
          no: n('NO_ADDENDUM'), docNo: d('NOMOR_DOKUMEN'), date: d('TANGGAL_ADDENDUM'), type: d('JENIS'),
          reason: d('ALASAN'), url: d('LINK_DOKUMEN'),
          contractOld: n('NILAI_KONTRAK_LAMA'), contractNew: n('NILAI_KONTRAK_BARU'), contractDelta: n('SELISIH_NILAI'),
          finishOld: d('FINISH_LAMA'), finishNew: d('FINISH_BARU'),
          maxWeekOld: n('MAX_WEEK_LAMA'), maxWeekNew: n('MAX_WEEK_BARU'),
          revision: n('REVISI_BASELINE'), startWeek: n('WEEK_MULAI_REVISI'), snapshot: snapshot
        });
      }
      Object.keys(db._addenda).forEach(function(k) { db._addenda[k].sort(function(a, b) { return (a.no || 0) - (b.no || 0); }); });
    }
  }
  return db._addenda[projectId] || [];
}

/** Riwayat addendum tanpa snapshot (ringan untuk halaman). */
function addendaView_(db, projectId) {
  return readAddenda_(db, projectId).map(function(a) {
    const o = Object.assign({}, a);
    delete o.snapshot;
    o.dateText = a.date ? formatDateId_(parseIsoDate_(a.date) || new Date(a.date)) : '';
    return o;
  });
}

/** Kurva plan baseline awal (Rev.0) dari snapshot addendum waktu pertama. */
function initialBaseline_(db, projectId) {
  const first = readAddenda_(db, projectId).find(function(a) { return Array.isArray(a.snapshot) && a.snapshot.length; });
  return first ? first.snapshot.map(function(v, w) { return { week: w, plan: v }; }) : null;
}

// ===================== STATUS PROYEK =====================

/** Simpan status proyek (BERJALAN / SELESAI / DITUTUP). */
function saveProjectStatus(token, payload) {
  const user = requireAdminUser_(token);
  payload = payload || {};
  const lock = pmoLock_('DATA');
  lock.waitLock(30000);
  try {
    DB_CACHE_ = null;
    let db = loadDb_();
    let p = lifecycleProject_(db, payload.id);
    const stage = String(payload.stage || '').toUpperCase();
    if (LIFECYCLE_CONFIG.STAGES.indexOf(stage) < 0) throw new Error('Status proyek tidak valid.');
    const info = weeklyInfo_(db, p);
    let finish = null, close = null, finishWeek = null;
    const bast = String(payload.bastUrl || '').trim();
    if (bast && !/^https:\/\//i.test(bast)) throw new Error('Link BAST harus diawali https://');
    if (stage !== 'BERJALAN') {
      finish = parseIsoDate_(payload.finishDate);
      if (!finish) throw new Error('Tanggal selesai aktual wajib diisi.');
      if (info.startDate && finish < info.startDate) throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai proyek.');
      if (finish > new Date()) throw new Error('Tanggal selesai aktual tidak boleh di masa depan.');
      finishWeek = info.startDate ? weekForDate_(info.startDate, finish) : null;
    }
    if (stage === 'DITUTUP') {
      close = parseIsoDate_(payload.closeDate);
      if (!close) throw new Error('Tanggal penutupan wajib diisi.');
      if (close < finish) throw new Error('Tanggal penutupan tidak boleh sebelum tanggal selesai.');
    }

    db = ensureLifecycleItems_(db, p);
    p = lifecycleProject_(db, p.id);
    const M = db.monthly;
    const setV = function(item, v, fmt) {
      const r = itemRow_(M, p.id, item);
      const cell = M.sheet.getRange(r + 1, M.valueCol + 1);
      cell.setValue(v === null ? '' : v);
      if (fmt && v !== null) cell.setNumberFormat(fmt);
    };
    setV('STATUS_PROYEK', stage);
    setV('TANGGAL_SELESAI_AKTUAL', finish, 'dd mmm yyyy');
    setV('WEEK_SELESAI', finishWeek);
    setV('TANGGAL_DITUTUP', close, 'dd mmm yyyy');
    setV('LINK_BAST', bast);
    SpreadsheetApp.flush();
    logProjectSetup_(db.ss, user, p.id, p.fullName, 'STATUS PROYEK: ' + stage);
    DB_CACHE_ = null;
    db = loadDb_();
    p = lifecycleProject_(db, p.id);
    dataChanged_();
    return { success: true, id: p.id, name: p.name, lifecycle: lifecycleView_(db, p) };
  } finally {
    DB_CACHE_ = null;
    lock.releaseLock();
  }
}

// ===================== ADDENDUM =====================

/** Data pendukung form addendum (dipanggil dari getProjectSetupData). */
function addendumContext_(db, p) {
  const W = db.weekly;
  const info = weeklyInfo_(db, p);
  const life = projectLifecycle_(db, p);
  const latest = info.latestWeek;
  const fields = DB_CONFIG.FIELDS.map(function(name) {
    const F = name.toUpperCase();
    let bobot = weekPercent_(W, p.id, 'BOBOT_' + F, 0);
    if (bobot === null) bobot = lastPercentBefore_(W, p.id, 'BOBOT_' + F, 9999);
    return {
      name: name, bobot: bobot,
      actual: latest ? (weekPercent_(W, p.id, F + '_KOMULATIF_REALISASI', latest) || 0) : 0,
      plan: latest ? weekPercent_(W, p.id, F + '_KOMULATIF_PLAN', Math.min(latest, info.planEndWeek || latest)) : 0
    };
  });
  const termPaidRaw = cellNumber_(db.monthly, p.id, 'PLANT_COST_ACTUAL', db.monthly.totalAllCol);
  const startWeek = latest + 1;
  const revDate = info.startDate ? new Date(info.startDate.getFullYear(), info.startDate.getMonth(), info.startDate.getDate() + (startWeek - 1) * 7) : null;
  return {
    stage: life.stage,
    contract: life.contract, contractInitial: life.contractInitial,
    termPaid: termPaidRaw, plantFs: monthlyValue_(db, p.id, 'PLANT_COST_FS'),
    finishDate: life.finishPlan ? isoDate_(life.finishPlan) : '',
    maxWeek: life.maxWeek, latestWeek: latest, startWeek: startWeek,
    revisionMonth: revDate ? monthKey_({ year: revDate.getFullYear(), month: revDate.getMonth() }) : '',
    overallActual: latest ? weekPercent_(W, p.id, 'KOMULATIF_REALISASI', latest) : 0,
    fields: fields,
    nextNo: readAddenda_(db, p.id).reduce(function(m, a) { return Math.max(m, a.no || 0); }, life.addendumCount) + 1,
    history: addendaView_(db, p.id)
  };
}

/**
 * Simpan addendum.
 * payload: { id, docNo, date (YYYY-MM-DD), reason, url,
 *            cost: { newValue } | null,
 *            time: { newFinish, maxWeek, weeklyPlan: [[e,p,c,co] ...] (WEEK latest+1 .. maxWeek, % kumulatif),
 *                    monthly: [{ key, plan, milestone }] } | null }
 */
function saveAddendum(token, payload) {
  const user = requireAdminUser_(token);
  payload = payload || {};
  const lock = pmoLock_('DATA');
  lock.waitLock(30000);
  try {
    DB_CACHE_ = null;
    let db = loadDb_();
    let p = lifecycleProject_(db, payload.id);
    const life = projectLifecycle_(db, p);
    if (life.stage !== 'BERJALAN') throw new Error('Addendum hanya untuk proyek berstatus Berjalan.');
    const cost = payload.cost && payload.cost.enabled !== false ? payload.cost : null;
    const time = payload.time && payload.time.enabled !== false ? payload.time : null;
    if (!cost && !time) throw new Error('Pilih minimal satu jenis perubahan: biaya atau waktu.');
    const date = parseIsoDate_(payload.date);
    if (!date) throw new Error('Tanggal addendum wajib diisi.');
    const url = String(payload.url || '').trim();
    if (url && !/^https:\/\//i.test(url)) throw new Error('Link dokumen addendum harus diawali https://');
    const reason = cleanText_(payload.reason);
    if (!reason) throw new Error('Alasan / keterangan addendum wajib diisi.');

    const W = db.weekly;
    const info = weeklyInfo_(db, p);
    const latest = info.latestWeek;
    const oldContract = life.contract;
    const oldFinish = life.finishPlan;
    const oldMax = life.maxWeek;

    // ---------- validasi biaya ----------
    let newContract = null;
    if (cost) {
      newContract = Number(cost.newValue);
      if (!Number.isFinite(newContract) || newContract <= 0) throw new Error('Nilai kontrak baru wajib diisi (angka).');
      const paid = cellNumber_(db.monthly, p.id, 'PLANT_COST_ACTUAL', db.monthly.totalAllCol) || 0;
      if (newContract + 0.5 < paid) throw new Error('Nilai kontrak baru (' + formatRupiah_(newContract) + ') lebih kecil dari termin yang sudah dibayar (' + formatRupiah_(paid) + ').');
      if (oldContract !== null && Math.abs(newContract - oldContract) < 0.5) throw new Error('Nilai kontrak baru sama dengan nilai kontrak saat ini.');
    }

    // ---------- validasi waktu ----------
    let newFinish = null, newMax = null, fullPlan = null, revMonths = [], bobot = null;
    if (time) {
      if (!info.startDate) throw new Error('Tanggal mulai proyek belum diisi.');
      newFinish = parseIsoDate_(time.newFinish);
      if (!newFinish) throw new Error('Tanggal selesai baru wajib diisi.');
      if (oldFinish && newFinish <= oldFinish) throw new Error('Tanggal selesai baru harus setelah tanggal selesai saat ini (' + formatDateId_(oldFinish) + ').');
      const days = Math.round((newFinish - info.startDate) / 86400000) + 1;
      newMax = time.maxWeek ? Number(time.maxWeek) : Math.ceil(days / 7);
      if (!Number.isInteger(newMax) || Math.abs(newMax - days / 7) > 2) throw new Error('Jumlah minggu baru ' + newMax + ' tidak sesuai durasi ' + days + ' hari (±' + Math.ceil(days / 7) + ' minggu).');
      if (newMax <= latest) throw new Error('Jumlah minggu baru (' + newMax + ') harus lebih besar dari week terakhir yang sudah diinput (WEEK ' + latest + ').');
      if (newMax > 400) throw new Error('Jumlah minggu terlalu besar.');

      bobot = {};
      DB_CONFIG.FIELDS.forEach(function(f) {
        let b = weekPercent_(W, p.id, 'BOBOT_' + f.toUpperCase(), 0);
        if (b === null) b = lastPercentBefore_(W, p.id, 'BOBOT_' + f.toUpperCase(), 9999);
        bobot[f] = b || 0;
      });
      const rest = Array.isArray(time.weeklyPlan) ? time.weeklyPlan : null;
      const need = newMax - latest;
      if (!rest || rest.length !== need) throw new Error('Plan mingguan baru harus berisi ' + need + ' baris (WEEK ' + (latest + 1) + ' sampai WEEK ' + newMax + ')' + (rest ? ', saat ini ' + rest.length + ' baris.' : '.'));
      fullPlan = [];
      for (let w = 1; w <= latest; w++) {
        fullPlan.push(DB_CONFIG.FIELDS.map(function(f) {
          const F = f.toUpperCase();
          let v = weekPercent_(W, p.id, F + '_KOMULATIF_PLAN', w);
          if (v === null) v = w > 1 ? fullPlan[w - 2][DB_CONFIG.FIELDS.indexOf(f)] : 0;
          return v;
        }));
      }
      DB_CONFIG.FIELDS.forEach(function(f, i) {
        const actual = latest ? (weekPercent_(W, p.id, f.toUpperCase() + '_KOMULATIF_REALISASI', latest) || 0) : 0;
        let prev = actual;
        for (let k = 0; k < rest.length; k++) {
          const v = Number(rest[k][i]);
          const wk = latest + 1 + k;
          if (!Number.isFinite(v) || v < 0 || v > 100.0001) throw new Error('Plan ' + f + ' WEEK ' + wk + ' tidak valid.');
          if (v + 0.01 < prev) throw new Error(k === 0
            ? 'Plan ' + f + ' WEEK ' + wk + ' (' + v + '%) lebih kecil dari realisasi kumulatif terakhir (' + actual.toFixed(2) + '%). Plan baru dimulai dari realisasi.'
            : 'Plan ' + f + ' turun di WEEK ' + wk + '. Plan kumulatif tidak boleh turun.');
          prev = Math.max(prev, v);
        }
        if (bobot[f] > 0 && Math.abs(Number(rest[rest.length - 1][i]) - 100) > 0.01) throw new Error('Plan ' + f + ' di WEEK ' + newMax + ' harus 100%.');
      });
      rest.forEach(function(r) { fullPlan.push(r.map(Number)); });

      // bulan yang direvisi: dari bulan week mulai revisi s.d. bulan selesai baru
      const revDate = new Date(info.startDate.getFullYear(), info.startDate.getMonth(), info.startDate.getDate() + latest * 7);
      revMonths = monthsBetween_(db.monthly.months, revDate, newFinish);
      if (!revMonths.length) throw new Error('Kolom bulan untuk periode revisi tidak tersedia di ' + DB_SHEETS.MONTHLY + '.');
    }
    const legacy = isLegacyMonthly_(db, p);
    const monthlyInput = {};
    if (time && !legacy) {
      ((time && time.monthly) || []).forEach(function(m) { monthlyInput[m.key] = m; });
      validateMonthlyPlan_(revMonths, monthlyInput);
    }

    // ================= TULIS =================
    db = ensureLifecycleItems_(db, p);
    p = lifecycleProject_(db, p.id);
    const M = db.monthly;
    const rowM = function(item) { const r = itemRow_(M, p.id, item); if (r < 0) throw new Error('Baris ' + item + ' tidak ditemukan untuk ' + p.id + '.'); return r + 1; };
    const cellV = function(item) { return M.sheet.getRange(rowM(item), M.valueCol + 1); };
    const blank = function(item) { return cellNumber_(M, p.id, item, M.valueCol) === null && !cellText_(M, p.id, item, M.valueCol); };

    // nilai awal disimpan sekali (sebelum addendum pertama)
    if (blank('NILAI_KONTRAK_AWAL') && oldContract !== null) cellV('NILAI_KONTRAK_AWAL').setValue(oldContract);
    if (blank('EFEKTIF_DATE_FINISH_AWAL') && oldFinish) cellV('EFEKTIF_DATE_FINISH_AWAL').setValue(oldFinish).setNumberFormat('dd mmm yyyy');
    if (blank('MAX_WEEK_AWAL') && oldMax) cellV('MAX_WEEK_AWAL').setValue(oldMax);

    const no = readAddenda_(db, p.id).reduce(function(m, a) { return Math.max(m, a.no || 0); }, life.addendumCount) + 1;
    cellV('JUMLAH_ADDENDUM').setValue(no);
    if (cost) cellV('NILAI_KONTRAK').setValue(newContract);

    let revision = life.revision, snapshot = '';
    if (time) {
      // salinan kurva plan overall sebelum direvisi
      const planEnd = Math.max(info.planEndWeek, latest);
      const snap = [0];
      for (let w = 1; w <= planEnd; w++) {
        const v = weekPercent_(W, p.id, 'KOMULATIF_PLAN', w);
        snap.push(v === null ? snap[w - 1] : Math.round(v * 100) / 100);
      }
      snapshot = JSON.stringify(snap);
      revision += 1;
      cellV('REVISI_BASELINE').setValue(revision);
      cellV('EFEKTIF_DATE_FINISH').setValue(newFinish).setNumberFormat('dd mmm yyyy');
      cellV('MAX_WEEK').setValue(newMax);

      const wRows = rowsOfProject_(W, p.id);
      ensureWeekHeaders_(W, newMax);
      writeWeeklyStructure_(W, wRows, p.id, bobot, fullPlan, newMax, latest, false, latest + 1);

      const planRow = rowM('PLAN_MONTHLY_PROGRESS'), actRow = rowM('AKTUAL_MONTHLY_PROGRESS'), msRow = rowM('MILESTONE_FISIK_MONTHLY');
      const weekLinks = monthWeekLinks_(db, p);
      revMonths.forEach(function(m) {
        const lw = weekLinks[monthKey_(m)];
        const wk = lw && lw <= newMax ? lw : cutoffWeek_(info.startDate, m, newMax);
        const c = weekCol_(W, wk);
        const link = function(r) { return "='" + DB_SHEETS.WEEKLY + "'!" + columnLetter_(c + 1) + r; };
        if (legacy) {
          if (wk >= 1 && c >= 0) M.sheet.getRange(planRow, m.col + 1).setFormula(link(wRows.KOMULATIF_PLAN));
        } else {
          M.sheet.getRange(planRow, m.col + 1).setValue(Number(monthlyInput[monthKey_(m)].plan) / 100);
        }
        const inp = monthlyInput[monthKey_(m)] || ((time.monthly || []).find(function(x) { return x.key === monthKey_(m); }));
        if (inp && inp.milestone !== undefined) M.sheet.getRange(msRow, m.col + 1).setValue(cleanText_(inp.milestone));
        if (wk >= 1 && c >= 0) M.sheet.getRange(actRow, m.col + 1).setFormula(link(wRows.KOMULATIF_REALISASI));
      });
      writeMonthlyFormulas_(M, rowsOfProject_(M, p.id));
    }

    // ---------- riwayat ----------
    const sh = addendumSheet_(db.ss);
    const type = cost && time ? 'BIAYA + WAKTU' : cost ? 'BIAYA' : 'WAKTU';
    sh.appendRow([new Date(), user.username || '', p.id, p.fullName, no, cleanText_(payload.docNo), date, type, reason, url,
      cost ? oldContract : '', cost ? newContract : '', cost && oldContract !== null ? newContract - oldContract : '',
      time ? oldFinish : '', time ? newFinish : '', time ? oldMax : '', time ? newMax : '',
      time ? revision : '', time ? latest + 1 : '', snapshot]);
    SpreadsheetApp.flush();
    logProjectSetup_(db.ss, user, p.id, p.fullName, 'ADDENDUM ' + no + ' (' + type + ')');

    DB_CACHE_ = null;
    db = loadDb_();
    p = lifecycleProject_(db, p.id);
    dataChanged_();
    return { success: true, id: p.id, name: p.name, no: no, type: type, revision: revision,
      lifecycle: lifecycleView_(db, p), maxWeek: time ? newMax : oldMax };
  } finally {
    DB_CACHE_ = null;
    lock.releaseLock();
  }
}

// ===================== HELPER =====================

function lifecycleProject_(db, projectId) {
  const p = db.allProjects.find(function(x) { return x.id === normKey_(projectId); });
  if (!p) throw new Error('Proyek tidak ditemukan.');
  if (!db.monthly.projects[p.id]) throw new Error('Proyek ' + p.name + ' belum ada di ' + DB_SHEETS.MONTHLY + '.');
  return p;
}

/** Nomor baris (1-based) seluruh item proyek di sheet. */
function rowsOfProject_(S, id) {
  const rows = {};
  const items = S.projects[id] ? S.projects[id].items : {};
  Object.keys(items).forEach(function(k) { rows[k] = items[k] + 1; });
  return rows;
}

/**
 * Tambahkan item status/addendum yang belum ada tepat di bawah blok proyek pada DATA BULANAN.
 * Baris disisipkan (insert), sehingga rumus lain di sheet ikut menyesuaikan otomatis.
 */
function ensureLifecycleItems_(db, p) {
  const M = db.monthly;
  const items = M.projects[p.id] ? M.projects[p.id].items : null;
  if (!items) throw new Error('Proyek ' + p.name + ' belum ada di ' + DB_SHEETS.MONTHLY + '.');
  const missing = LIFECYCLE_CONFIG.ITEMS.filter(function(it) { return items[it] === undefined; });
  if (!missing.length) return db;
  const last = Math.max.apply(null, Object.keys(items).map(function(k) { return items[k]; })) + 1; // 1-based
  const sheet = M.sheet;
  sheet.insertRowsAfter(last, missing.length);
  const meta = M.projects[p.id];
  sheet.getRange(last + 1, 1, missing.length, 4).setValues(missing.map(function(it) { return [p.id, meta.team || p.team, meta.name || p.fullName, it]; }));
  sheet.getRange(last, 1, 1, 4).copyTo(sheet.getRange(last + 1, 1, missing.length, 4), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  SpreadsheetApp.flush();
  DB_CACHE_ = null;
  return loadDb_();
}

function addendumSheet_(ss) {
  let sh = ss.getSheetByName(LIFECYCLE_CONFIG.ADDENDUM_SHEET);
  if (!sh) {
    sh = ss.insertSheet(LIFECYCLE_CONFIG.ADDENDUM_SHEET);
    sh.getRange(1, 1, 1, LIFECYCLE_CONFIG.ADDENDUM_HEADERS.length).setValues([LIFECYCLE_CONFIG.ADDENDUM_HEADERS])
      .setFontWeight('bold').setBackground('#0F2B46').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}

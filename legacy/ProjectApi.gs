/**
 * TAMBAH / EDIT PROYEK (khusus ADMIN)
 *
 * Membuat atau melengkapi blok proyek di dua sheet:
 *   DATA BULANAN         : profil, nilai FS, tanggal, plan bulanan (baseline),
 *                          milestone fisik, rumus total/kumulatif, tautan aktual bulanan
 *   DATA MINGGUAN PROYEK : bobot bidang, plan mingguan per bidang + rumus kumulatif,
 *                          deviasi dan progres overall (pola sama dengan proyek lama)
 *
 * Proyek lama (PLAN_MONTHLY_PROGRESS berupa rumus tautan) tidak diubah tautannya.
 */

const PROJECT_CONFIG = {
  // Tanggal batas laporan bulanan: AKTUAL_MONTHLY_PROGRESS diambil dari WEEK terakhir
  // yang selesai paling lambat tanggal ini pada bulan tersebut.
  MONTH_CUTOFF_DAY: 25,
  ID_PATTERN: /^[A-Z][A-Z0-9_]{1,30}$/,
  LOG_SHEET: 'LOG INPUT WEEKLY'
};

// ===================== API =====================

/** Daftar proyek + status setup untuk halaman Tambah/Edit Proyek. */
function getProjectSetupContext(token) {
  const user = requireProjectEditor_(token);
  const db = loadDb_();
  const teams = [];
  db.allProjects.forEach(function(p) { if (p.team && teams.indexOf(p.team) < 0) teams.push(p.team); });
  const isAdmin = String(user.role || '').toUpperCase() === 'ADMIN';
  // Tim proyek (INPUT/PIC) boleh membuat proyek miliknya sendiri bila PROYEK_ID akun belum terdaftar.
  const own = normKey_(user.projectId || '');
  const ownNewId = !isAdmin && own && own !== 'ALL' && PROJECT_CONFIG.ID_PATTERN.test(own) && !db.allProjects.some(function(p) { return p.id === own; }) ? own : '';
  return {
    success: true,
    user: { name: user.name || user.username, role: String(user.role || '').toUpperCase() },
    isAdmin: isAdmin,
    canCreate: isAdmin || !!ownNewId,
    ownNewId: ownNewId,
    teams: teams,
    projects: db.allProjects.filter(function(p) { return userCanOperateProject_(user, p); }).map(function(p) {
      const st = projectReady_(db, p);
      const latest = weeklyInfo_(db, p).latestWeek;
      const actual = latest ? weekPercent_(db.weekly, p.id, 'KOMULATIF_REALISASI', latest) : null;
      const stage = projectLifecycle_(db, p).stage;
      return { id: p.id, name: p.name, fullName: p.fullName, team: p.team, ready: st.ready,
        active: isProjectActive_(db, p), latestWeek: latest, actual: actual, stage: stage,
        suggestClose: stage === 'BERJALAN' && actual !== null && actual >= 99.95 };
    }),
    weekHeaderMax: inputHeaderMaxWeek_(db.weekly),
    monthRange: db.monthly.months.length
      ? { first: monthKey_(db.monthly.months[0]), last: monthKey_(db.monthly.months[db.monthly.months.length - 1]) }
      : null,
    cutoffDay: PROJECT_CONFIG.MONTH_CUTOFF_DAY
  };
}

/** Data proyek yang sudah ada (untuk mode edit / melengkapi setup). */
function getProjectSetupData(token, projectId) {
  const user = requireProjectEditor_(token);
  const db = loadDb_();
  const p = db.allProjects.find(function(x) { return x.id === normKey_(projectId); });
  if (!p) throw new Error('Proyek tidak ditemukan.');
  if (!userCanOperateProject_(user, p)) throw new Error('Anda hanya dapat mengedit proyek sesuai PROYEK_ID akun.');
  const M = db.monthly, W = db.weekly;
  const info = weeklyInfo_(db, p);
  const num = function(item) { return monthlyValue_(db, p.id, item); };
  const finish = monthlyDate_(db, p.id, 'EFEKTIF_DATE_FINISH');
  const histCol = historicalTotalCol_(M);
  const hist = function(item) { return histCol < 0 ? null : cellNumber_(M, p.id, item, histCol); };

  const planRow = itemRow_(M, p.id, 'PLAN_MONTHLY_PROGRESS');
  const planFormulas = planRow >= 0 && M.months.length
    ? M.sheet.getRange(planRow + 1, M.months[0].col + 1, 1, M.months.length).getFormulas()[0] : [];
  const links = monthWeekLinks_(db, p);
  const monthly = M.months.map(function(m, i) {
    const v = cellNumber_(M, p.id, 'PLAN_MONTHLY_PROGRESS', m.col);
    return { key: monthKey_(m), label: m.label, plan: v === null ? null : (Math.abs(v) > 1.5 ? v : v * 100),
      milestone: cellText_(M, p.id, 'MILESTONE_FISIK_MONTHLY', m.col), linked: !!planFormulas[i], week: links[monthKey_(m)] || null };
  }).filter(function(m) { return m.plan !== null || m.milestone || m.linked || m.week; });

  const bobot = {};
  const weekly = [];
  DB_CONFIG.FIELDS.forEach(function(name) {
    const F = name.toUpperCase();
    bobot[name] = weekPercent_(W, p.id, 'BOBOT_' + F, 0);
    if (bobot[name] === null) bobot[name] = lastPercentBefore_(W, p.id, 'BOBOT_' + F, 9999);
  });
  for (let w = 1; w <= info.planEndWeek; w++) {
    weekly.push(DB_CONFIG.FIELDS.map(function(name) { return weekPercent_(W, p.id, name.toUpperCase() + '_KOMULATIF_PLAN', w); }));
  }

  return {
    success: true,
    project: {
      id: p.id, name: p.fullName || p.name, team: p.team,
      contractor: monthlyText_(db, p.id, 'KONTRAKTOR'), purpose: monthlyText_(db, p.id, 'TUJUAN'),
      capacity: monthlyText_(db, p.id, 'KAPASITAS'), bannerUrl: monthlyText_(db, p.id, 'LINK_BANNER'),
      driveUrl: (function() { try { const d = engDriveOf_(p.id); return d ? d.url : ''; } catch (e) { return ''; } })(),
      driveName: (function() { try { const d = engDriveOf_(p.id); return d ? d.name : ''; } catch (e) { return ''; } })(),
      startDate: info.startDate ? isoDate_(info.startDate) : '', finishDate: finish ? isoDate_(finish) : '',
      contractValue: num('NILAI_KONTRAK'), plantFs: num('PLANT_COST_FS'), idcFs: num('IDC_FS'), pmFs: num('PM_COST_FS'),
      histPlant: hist('PLANT_COST_ACTUAL'), histIdc: hist('IDC_ACTUAL'), histPm: hist('PM_COST_AKTUAL')
    },
    legacyMonthly: planFormulas.some(function(f) { return !!f; }) || projectLifecycle_(db, p).revision > 0,
    planLockReason: planFormulas.some(function(f) { return !!f; }) ? 'linked' : projectLifecycle_(db, p).revision > 0 ? 'revised' : '',
    monthly: monthly,
    bobot: bobot,
    weeklyPlan: weekly,
    maxWeek: Number(monthlyValue_(db, p.id, 'MAX_WEEK')) || info.planEndWeek || null,
    period: reportPeriodOverride_(p.id),
    latestWeek: info.latestWeek,
    status: projectReady_(db, p),
    lifecycle: lifecycleView_(db, p),
    addendum: addendumContext_(db, p)
  };
}

/** Simpan proyek baru atau perubahan proyek. */
function saveProjectSetup(token, payload) {
  const user = requireProjectEditor_(token);
  payload = payload || {};
  const lock = pmoLock_('EPCENG', 'DATA');
  lock.waitLock(30000);
  try {
    DB_CACHE_ = null;
    let db = loadDb_();
    const mode = payload.mode === 'edit' ? 'edit' : 'new';
    const id = normKey_(payload.id);
    const existing = db.allProjects.find(function(x) { return x.id === id; });

    // ---------- validasi identitas ----------
    if (!PROJECT_CONFIG.ID_PATTERN.test(id)) throw new Error('Kode proyek harus diawali huruf dan hanya berisi huruf, angka, atau garis bawah (contoh: GUDANG_B).');
    if (mode === 'new' && existing) throw new Error('Kode proyek ' + id + ' sudah dipakai. Pilih proyek tersebut untuk diedit, atau gunakan kode lain.');
    if (mode === 'edit' && !existing) throw new Error('Proyek ' + id + ' tidak ditemukan.');
    if (String(user.role || '').toUpperCase() !== 'ADMIN' && mode !== 'edit') {
      const own = normKey_(user.projectId || '');
      if (!own || own === 'ALL' || own !== id) throw new Error('Tim proyek hanya dapat membuat proyek dengan kode sesuai PROYEK_ID akun' + (own && own !== 'ALL' ? ' (' + own + ')' : '') + '. Proyek lain ditambahkan oleh ADMIN.');
    }
    if (mode === 'edit' && !userCanOperateProject_(user, existing)) throw new Error('Anda hanya dapat mengedit proyek sesuai PROYEK_ID akun.');
    const name = String(payload.name || '').trim().toUpperCase();
    if (name.length < 3) throw new Error('Nama proyek wajib diisi.');
    const fullName = /^PROYEK\b/.test(name) || /^PABRIK\b/.test(name) ? name : 'PROYEK ' + name;
    const team = normKey_(payload.team);
    if (!team) throw new Error('Tim proyek wajib diisi.');

    // ---------- validasi jadwal & nilai ----------
    const start = parseIsoDate_(payload.startDate), finish = parseIsoDate_(payload.finishDate);
    if (!start || !finish) throw new Error('Tanggal mulai dan selesai wajib diisi.');
    if (finish < start) throw new Error('Tanggal selesai harus setelah tanggal mulai.');
    const durationDays = Math.round((finish - start) / 86400000) + 1;
    const maxWeek = payload.maxWeek ? Number(payload.maxWeek) : Math.ceil(durationDays / 7);
    if (!Number.isInteger(maxWeek) || maxWeek < 1 || maxWeek > 400) throw new Error('Jumlah minggu (MAX_WEEK) tidak valid.');
    if (Math.abs(maxWeek - durationDays / 7) > 2) throw new Error('Jumlah minggu ' + maxWeek + ' tidak sesuai durasi ' + durationDays + ' hari (±' + Math.ceil(durationDays / 7) + ' minggu).');
    const money = function(key, label, required) {
      const v = payload[key];
      if (v === '' || v === null || v === undefined) { if (required) throw new Error(label + ' wajib diisi.'); return null; }
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) throw new Error(label + ' harus berupa angka positif.');
      return n;
    };
    let contractValue = money('contractValue', 'Nilai kontrak', true);
    const plantFs = money('plantFs', 'Plant cost FS', true);
    const idcFs = money('idcFs', 'IDC FS', false) || 0;
    const pmFs = money('pmFs', 'PM cost FS', false) || 0;
    const hist = { PLANT_COST_ACTUAL: money('histPlant', 'Realisasi plant cost sebelumnya', false),
      IDC_ACTUAL: money('histIdc', 'Realisasi IDC sebelumnya', false), PM_COST_AKTUAL: money('histPm', 'Realisasi PM cost sebelumnya', false) };
    const banner = String(payload.bannerUrl || '').trim();
    if (banner && !/^https:\/\//i.test(banner)) throw new Error('Link banner harus diawali https://');

    // Proyek yang sudah punya addendum: nilai kontrak, tanggal selesai, dan MAX_WEEK hanya berubah lewat addendum.
    const lifeNow = existing && db.monthly.projects[existing.id] ? projectLifecycle_(db, existing) : null;
    if (lifeNow && lifeNow.addendumCount > 0) {
      const finNow = lifeNow.finishPlan, maxNow = lifeNow.maxWeek;
      if (lifeNow.contract !== null && Math.abs(contractValue - lifeNow.contract) > 0.5) throw new Error('Nilai kontrak proyek ini diubah lewat menu Addendum, bukan dari form ini.');
      if (finNow && isoDate_(finNow) !== isoDate_(finish)) throw new Error('Tanggal selesai proyek ini diubah lewat menu Addendum (perpanjangan waktu).');
      if (maxNow && maxNow !== maxWeek) throw new Error('Jumlah minggu proyek ini diubah lewat menu Addendum (perpanjangan waktu).');
    }
    if (lifeNow && lifeNow.revision > 0 && Array.isArray(payload.weeklyPlan)) throw new Error('Baseline proyek ini sudah direvisi lewat addendum. Plan mingguan tidak bisa ditempel ulang dari form ini.');

    // ---------- validasi bobot ----------
    const bobot = {};
    let bobotSum = 0;
    DB_CONFIG.FIELDS.forEach(function(f) {
      const v = Number((payload.bobot || {})[f]);
      if (!Number.isFinite(v) || v < 0 || v > 100) throw new Error('Bobot ' + f + ' wajib diisi (0–100%).');
      bobot[f] = v; bobotSum += v;
    });
    if (Math.abs(bobotSum - 100) > 0.01) throw new Error('Total bobot bidang harus 100% (saat ini ' + bobotSum.toFixed(2) + '%).');

    // ---------- validasi plan mingguan ----------
    const weeklyPlan = Array.isArray(payload.weeklyPlan) ? payload.weeklyPlan : null;
    const needWeekly = mode === 'new' || !(existing && projectReady_(db, existing).ready);
    if (weeklyPlan || needWeekly) validateWeeklyPlan_(weeklyPlan, maxWeek, bobot);

    // ---------- validasi plan bulanan ----------
    // periode laporan: otomatis dari cut-off (mulai lewat tgl cut-off -> bulan berikutnya), boleh disesuaikan ±1 bulan di ujung
    const period = reportPeriodFor_(start, finish, payload.period);
    const legacyPre = existing ? (isLegacyMonthly_(db, existing) || !!(lifeNow && lifeNow.revision > 0)) : false;
    const months = legacyPre ? monthsBetween_(db.monthly.months, start, finish)
      : db.monthly.months.filter(function(m) { const k = m.year * 12 + m.month; return k >= period.first && k <= period.last; });
    const outside = legacyPre || !existing ? [] : db.monthly.months.filter(function(m) {
      const k = m.year * 12 + m.month, sk = start.getFullYear() * 12 + start.getMonth(), fk = finish.getFullYear() * 12 + finish.getMonth();
      return (k < period.first || k > period.last) && k >= Math.min(sk, period.first) && k <= Math.max(fk + 1, period.last);
    });
    outside.forEach(function(m) {
      if (monthSubmitted_(db, existing, m)) throw new Error('Bulan ' + m.label + ' sudah punya laporan bulanan (realisasi biaya), jadi tidak bisa dikeluarkan dari periode laporan.');
    });
    if (!months.length) throw new Error('Rentang tanggal proyek di luar kolom bulan yang tersedia di ' + DB_SHEETS.MONTHLY + '.');
    // plan bulanan dikunci untuk proyek lama (tautan rumus) dan proyek yang baseline-nya sudah direvisi addendum
    const legacy = existing ? (isLegacyMonthly_(db, existing) || !!(lifeNow && lifeNow.revision > 0)) : false;
    const monthlyInput = {};
    (payload.monthly || []).forEach(function(m) { monthlyInput[m.key] = m; });
    if (!legacy) validateMonthlyPlan_(months, monthlyInput);
    const monthWeek = resolveMonthWeeks_(months, monthlyInput, start, maxWeek);
    const oldLinks = existing ? monthWeekLinks_(db, existing) : {};

    // ================= TULIS DATA BULANAN =================
    const M = db.monthly;
    const mRows = ensureProjectBlock_(M, id, team, fullName, templateItems_(M));
    const VL = columnLetter_(M.valueCol + 1);
    const setV = function(item, value) { M.sheet.getRange(mRows[item], M.valueCol + 1).setValue(value); };
    const setF = function(item, formula) { M.sheet.getRange(mRows[item], M.valueCol + 1).setFormula(formula); };
    setV('NILAI_KONTRAK', contractValue);
    setV('PLANT_COST_FS', plantFs); setV('IDC_FS', idcFs); setV('PM_COST_FS', pmFs);
    setF('NILAI_INVESTASI_FS', '=' + VL + mRows.PLANT_COST_FS + '+' + VL + mRows.IDC_FS + '+' + VL + mRows.PM_COST_FS);
    setV('TUJUAN', cleanText_(payload.purpose)); setV('KAPASITAS', cleanText_(payload.capacity));
    setV('KONTRAKTOR', cleanText_(payload.contractor)); setV('LINK_BANNER', banner);
    setV('EFEKTIF_DATE_START', start); setV('EFEKTIF_DATE_FINISH', finish);
    setF('TOTAL_DURASI', '=' + VL + mRows.EFEKTIF_DATE_FINISH + '-' + VL + mRows.EFEKTIF_DATE_START + '+1');
    setV('MAX_WEEK', maxWeek);
    [mRows.EFEKTIF_DATE_START, mRows.EFEKTIF_DATE_FINISH].forEach(function(r) { M.sheet.getRange(r, M.valueCol + 1).setNumberFormat('dd mmm yyyy'); });

    writeMonthlyFormulas_(M, mRows);
    const histCol = historicalTotalCol_(M);
    if (histCol >= 0) Object.keys(hist).forEach(function(item) { if (hist[item] !== null) M.sheet.getRange(mRows[item], histCol + 1).setValue(hist[item]); });

    // plan bulanan, milestone, tautan aktual bulanan
    if (!legacy) {
      outside.forEach(function(m) {
        ['PLAN_MONTHLY_PROGRESS', 'MILESTONE_FISIK_MONTHLY', 'AKTUAL_MONTHLY_PROGRESS'].forEach(function(item) { if (mRows[item]) M.sheet.getRange(mRows[item], m.col + 1).clearContent(); });
      });
      months.forEach(function(m) {
        const inp = monthlyInput[monthKey_(m)] || {};
        M.sheet.getRange(mRows.PLAN_MONTHLY_PROGRESS, m.col + 1).setValue(Number(inp.plan) / 100);
        M.sheet.getRange(mRows.MILESTONE_FISIK_MONTHLY, m.col + 1).setValue(cleanText_(inp.milestone));
      });
    } else {
      months.forEach(function(m) {
        const inp = monthlyInput[monthKey_(m)];
        if (inp && inp.milestone !== undefined) M.sheet.getRange(mRows.MILESTONE_FISIK_MONTHLY, m.col + 1).setValue(cleanText_(inp.milestone));
      });
    }

    // ================= TULIS DATA MINGGUAN =================
    const W = db.weekly;
    const wRows = ensureProjectBlock_(W, id, team, fullName, templateItems_(W));
    ensureWeekHeaders_(W, maxWeek);
    const latestWeek = existing ? weeklyInfo_(db, existing).latestWeek : 0;
    writeWeeklyStructure_(W, wRows, id, bobot, weeklyPlan, maxWeek, latestWeek, !existing || latestWeek === 0);

    // tautan AKTUAL_MONTHLY_PROGRESS -> KOMULATIF_REALISASI di WEEK batas laporan tiap bulan (week manual bila diisi)
    const linkTo = function(c, row) { return "='" + DB_SHEETS.WEEKLY + "'!" + columnLetter_(c + 1) + row; };
    months.forEach(function(m) {
      const key = monthKey_(m), wk = monthWeek[key], c = weekCol_(W, wk);
      if (legacy && (oldLinks[key] === undefined || oldLinks[key] === wk)) return; // proyek terkunci: hanya tautan yang week-nya diubah
      const target = M.sheet.getRange(mRows.AKTUAL_MONTHLY_PROGRESS, m.col + 1);
      if (wk >= 1 && c >= 0) target.setFormula(linkTo(c, wRows.KOMULATIF_REALISASI));
      else if (!legacy) target.setValue(0);
      if (legacy && wk >= 1 && c >= 0 && wRows.KOMULATIF_PLAN) {
        const pc = M.sheet.getRange(mRows.PLAN_MONTHLY_PROGRESS, m.col + 1);
        if (pc.getFormula()) pc.setFormula(linkTo(c, wRows.KOMULATIF_PLAN));
      }
    });

    if (!legacy) saveReportPeriodOverride_(id, period);
    SpreadsheetApp.flush();
    logProjectSetup_(db.ss, user, id, fullName, mode === 'new' ? 'TAMBAH PROYEK' : 'EDIT PROYEK');
    DB_CACHE_ = null;
    db = loadDb_();
    const p = db.allProjects.find(function(x) { return x.id === id; });
    dataChanged_();
    // Folder Google Drive tim proyek (opsional): gagal disimpan tidak membatalkan data proyek.
    let drive = null;
    const driveRef = String(payload.driveUrl || '').trim();
    if (driveRef) {
      let cur = null; try { cur = engDriveOf_(id); } catch (e) {}
      const same = cur && (driveRef === cur.url || driveRef.indexOf(cur.id) >= 0);
      if (same) drive = { ok: true, name: cur.name, url: cur.url, unchanged: true };
      else { try { const d = engSetDrive_(id, user, driveRef); drive = { ok: true, name: d.name, url: d.url }; } catch (e) { drive = { ok: false, message: e.message }; } }
    }
    return { success: true, mode: mode, id: id, name: p ? p.name : fullName, maxWeek: maxWeek, durationDays: durationDays,
      status: p ? projectReady_(db, p) : { ready: false, missing: [] }, drive: drive, account: engScriptAccount_() };
  } finally {
    DB_CACHE_ = null;
    lock.releaseLock();
  }
}

// ===================== STATUS PROYEK =====================

/** Proyek siap diinput mingguan bila tanggal mulai, bobot, dan plan kumulatif tersedia. */
function projectReady_(db, p) {
  const W = db.weekly;
  const missing = [];
  if (!W.projects[p.id]) return { ready: false, missing: ['blok DATA MINGGUAN PROYEK'] };
  if (!weeklyInfo_(db, p).startDate) missing.push('tanggal mulai');
  DB_CONFIG.FIELDS.forEach(function(f) {
    if (lastFilledWeekBefore_(W, p.id, 'BOBOT_' + f.toUpperCase(), 9999) === null) missing.push('bobot ' + f);
  });
  if (!weeklyInfo_(db, p).planEndWeek) missing.push('plan mingguan');
  return { ready: !missing.length, missing: missing };
}

/** Status setup proyek milik akun (PROYEK_ID) untuk pemberitahuan "setup proyek dahulu" di halaman input. */
function setupHint_(db, user) {
  if (!user) return null;
  const role = String(user.role || '').trim().toUpperCase();
  const own = normKey_(user.projectId || '');
  const out = { role: role, id: own && own !== 'ALL' ? own : '', canSetup: ['ADMIN', 'INPUT', 'PIC'].indexOf(role) >= 0 };
  if (!out.id) return out;
  const p = db.allProjects.find(function(x) { return x.id === out.id; });
  if (!p) { out.exists = false; return out; }
  let st = { ready: false, missing: [] };
  try { st = projectReady_(db, p); } catch (e) {}
  out.exists = true; out.name = p.name; out.ready = !!st.ready; out.missing = st.missing || [];
  try { out.stage = projectLifecycle_(db, p).stage; } catch (e) {}
  try { out.monthlyReady = !!monthlyDate_(db, p.id, 'EFEKTIF_DATE_START'); } catch (e) { out.monthlyReady = false; }
  return out;
}

/** Proyek aktif = sudah ada realisasi progres mingguan atau realisasi biaya. */
function isProjectActive_(db, p) {
  if (weeklyHasData_(db, p)) return true;
  const total = cellNumber_(db.monthly, p.id, 'TOTAL_INVESTASI_AKTUAL', db.monthly.totalAllCol);
  return total !== null && total > 0;
}

// ===================== PENULISAN =====================

/** Pastikan semua ITEM_DATA ada untuk proyek; baris yang belum ada ditambahkan di bawah. */
function ensureProjectBlock_(S, id, team, fullName, items) {
  const sheet = S.sheet;
  const lastCol = sheet.getLastColumn();
  const rows = {};
  const existing = S.projects[id] ? S.projects[id].items : {};
  const toAdd = [];
  items.forEach(function(it) {
    const key = normKey_(it.item);
    if (existing[key] !== undefined) rows[key] = existing[key] + 1; else toAdd.push(it);
  });
  // perbarui identitas pada baris yang sudah ada
  Object.keys(rows).forEach(function(k) { sheet.getRange(rows[k], 2, 1, 2).setValues([[team, fullName]]); });
  if (toAdd.length) {
    let r = Math.max(sheet.getLastRow(), S.headerRow + 1) + 1;
    sheet.getRange(r, 1, toAdd.length, 4).setValues(toAdd.map(function(it) { return [id, team, fullName, it.item]; }));
    toAdd.forEach(function(it, i) {
      if (it.templateRow) sheet.getRange(it.templateRow, 1, 1, lastCol).copyTo(sheet.getRange(r + i, 1, 1, lastCol), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
      rows[normKey_(it.item)] = r + i;
    });
  }
  return rows;
}

/** Daftar ITEM_DATA mengikuti proyek pertama yang paling lengkap (beserta baris contoh formatnya). */
function templateItems_(S) {
  let best = null;
  S.order.forEach(function(pid) {
    const n = Object.keys(S.projects[pid].items).length;
    if (!best || n > Object.keys(S.projects[best].items).length) best = pid;
  });
  const items = S.projects[best].items;
  return Object.keys(items).sort(function(a, b) { return items[a] - items[b]; }).map(function(k) {
    return { item: String(S.display[items[k]][3]).trim(), templateRow: items[k] + 1 };
  });
}

/** Rumus total tahunan, total investasi, dan kumulatif bulanan (tidak menimpa isian manual). */
function writeMonthlyFormulas_(M, rows) {
  const sheet = M.sheet;
  const months = M.months;
  const L = function(c) { return columnLetter_(c + 1); };
  const yearCols = M.yearTotals.slice().sort(function(a, b) { return a.year - b.year; });
  const monthsOf = function(y) { return months.filter(function(m) { return m.year === y; }); };
  // Tulis rumus per baris sekaligus; sel yang berisi isian manual tidak ditimpa.
  const lastCol = sheet.getLastColumn();
  const rowCache = {};
  const rowState = function(r) {
    if (!rowCache[r]) {
      const rg = sheet.getRange(r, 1, 1, lastCol);
      rowCache[r] = { f: rg.getFormulas()[0], d: rg.getDisplayValues()[0], pending: {} };
    }
    return rowCache[r];
  };
  const setIfFormula = function(r, c, f) {
    const st = rowState(r);
    const val = String(st.d[c] || '').trim();
    if (st.f[c]) return; // rumus yang sudah ada tidak diubah
    if (val && val !== '-' && val !== '0') return; // isian manual dipertahankan
    st.pending[c] = f;
  };
  const flushRows = function() {
    Object.keys(rowCache).forEach(function(r) {
      const st = rowCache[r];
      const cols = Object.keys(st.pending).map(Number).sort(function(a, b) { return a - b; });
      if (!cols.length) return;
      const from = cols[0], to = cols[cols.length - 1];
      const fx = st.f.slice(from, to + 1).map(function(cur, i) {
        const c = from + i;
        if (st.pending[c] !== undefined) return st.pending[c];
        return cur || null;
      });
      if (fx.every(function(x) { return x !== null; })) sheet.getRange(Number(r), from + 1, 1, fx.length).setFormulas([fx]);
      else cols.forEach(function(c) { sheet.getRange(Number(r), c + 1).setFormula(st.pending[c]); });
    });
  };
  const totalsFor = function(item) {
    const r = rows[item];
    if (!r) return;
    yearCols.forEach(function(t) {
      const ms = monthsOf(t.year);
      if (ms.length) setIfFormula(r, t.col, '=SUM(' + L(ms[0].col) + r + ':' + L(ms[ms.length - 1].col) + r + ')');
    });
    if (M.totalAllCol >= 0 && item !== 'RKAP' && yearCols.length) {
      setIfFormula(r, M.totalAllCol, '=SUM(' + L(yearCols[0].col) + r + ':' + L(yearCols[yearCols.length - 1].col) + r + ')');
    }
  };
  ['PLANT_COST_ACTUAL', 'IDC_ACTUAL', 'PM_COST_AKTUAL', 'RKAP'].forEach(totalsFor);

  const rT = rows.TOTAL_INVESTASI_AKTUAL, rP = rows.PLANT_COST_ACTUAL, rI = rows.IDC_ACTUAL, rM = rows.PM_COST_AKTUAL;
  if (rT && rP && rI && rM) {
    const cols = (M.totalAllCol >= 0 ? [M.totalAllCol] : []).concat(yearCols.map(function(t) { return t.col; })).concat(months.map(function(m) { return m.col; }));
    cols.forEach(function(c) { setIfFormula(rT, c, '=' + L(c) + rP + '+' + L(c) + rI + '+' + L(c) + rM); });
  }
  const cumulative = [['INVESTASI_AKTUAL_KOMULATIF_MONTHLY', rT], ['PLANT_COST_AKTUAL_KOMULATIF_MONTHLY', rP],
    ['IDC_AKTUAL_KOMULATIF_MONTHLY', rI], ['PM_COST_AKTUAL_KOMULATIF_MONTHLY', rM]];
  cumulative.forEach(function(pair) {
    const r = rows[pair[0]], src = pair[1];
    if (!r || !src || !months.length) return;
    months.forEach(function(m, i) { setIfFormula(r, m.col, i === 0 ? '=' + L(m.col) + src : '=' + L(months[i - 1].col) + r + '+' + L(m.col) + src); });
  });
  flushRows();
}

/** Tambah header WEEK n bila durasi proyek melebihi kolom yang tersedia. */
function ensureWeekHeaders_(W, maxWeek) {
  const current = inputHeaderMaxWeek_(W);
  if (current >= maxWeek) return;
  const sheet = W.sheet;
  const lastCol = weekCol_(W, current) + 1;
  const add = [];
  for (let w = current + 1; w <= maxWeek; w++) add.push('WEEK ' + w);
  // sisipkan kolom baru tepat setelah WEEK terakhir (kolom lain di kanannya ikut bergeser, sheet ikut melebar)
  sheet.insertColumnsAfter(lastCol, add.length);
  sheet.getRange(W.headerRow + 1, lastCol + 1, 1, add.length).setValues([add]);
  // format seluruh kolom mengikuti WEEK terakhir (persen, angka, dll.)
  const nRows = Math.max(sheet.getLastRow(), W.headerRow + 1);
  sheet.getRange(1, lastCol, nRows, 1).copyTo(sheet.getRange(1, lastCol + 1, nRows, add.length), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  add.forEach(function(h, i) { W.weekCols[current + 1 + i] = lastCol + i; });
}

/** Bobot, plan mingguan, dan rumus kumulatif/deviasi untuk WEEK 0..maxWeek. */
function writeWeeklyStructure_(W, rows, id, bobot, weeklyPlan, maxWeek, latestWeek, applyFormat, planFrom) {
  planFrom = Math.max(1, Number(planFrom) || 1);
  const sheet = W.sheet;
  const c0 = weekCol_(W, 0);
  if (c0 < 0) throw new Error('Kolom WEEK 0 tidak ditemukan di ' + DB_SHEETS.WEEKLY + '.');
  const n = maxWeek + 1;
  const col = function(w) { return columnLetter_(weekCol_(W, w) + 1); };
  const rowFx = function(r, build) { const a = []; for (let w = 0; w <= maxWeek; w++) a.push(build(w)); sheet.getRange(r, c0 + 1, 1, n).setFormulas([a]); };
  const need = function(item) { if (!rows[item]) throw new Error('Baris ' + item + ' tidak ditemukan untuk ' + id + '.'); return rows[item]; };

  const F = DB_CONFIG.FIELDS.map(function(f) { return f.toUpperCase(); });
  F.forEach(function(f, i) {
    const rB = need('BOBOT_' + f), rP = need(f + '_PLAN'), rCP = need(f + '_KOMULATIF_PLAN');
    const rR = need(f + '_REALISASI'), rCR = need(f + '_KOMULATIF_REALISASI'), rD = need('DEVIASI_' + f);
    // bobot: WEEK 0 nilai, minggu berikutnya = kolom sebelumnya
    sheet.getRange(rB, c0 + 1).setValue(bobot[DB_CONFIG.FIELDS[i]] / 100);
    if (maxWeek >= 1) {
      const a = []; for (let w = 1; w <= maxWeek; w++) a.push('=' + col(w - 1) + rB);
      sheet.getRange(rB, weekCol_(W, 1) + 1, 1, maxWeek).setFormulas([a]);
    }
    // plan mingguan (tambahan per minggu) dari kumulatif yang ditempel
    // planFrom > 1: minggu sebelum planFrom dibekukan (revisi baseline / addendum waktu)
    if (weeklyPlan) {
      const inc = planFrom === 1 ? [0] : [];
      for (let w = planFrom; w <= maxWeek; w++) {
        const cur = Number(weeklyPlan[w - 1][i]) / 100, prev = w === 1 ? 0 : Number(weeklyPlan[w - 2][i]) / 100;
        inc.push(Math.round((cur - prev) * 1e9) / 1e9);
      }
      if (inc.length) sheet.getRange(rP, (planFrom === 1 ? c0 : weekCol_(W, planFrom)) + 1, 1, inc.length).setValues([inc]);
    }
    rowFx(rCP, function(w) { return w === 0 ? '=' + col(0) + rP : '=' + col(w - 1) + rCP + '+' + col(w) + rP; });
    rowFx(rCR, function(w) { return w === 0 ? '=' + col(0) + rR : '=' + col(w - 1) + rCR + '+' + col(w) + rR; });
    rowFx(rD, function(w) { return '=' + col(w) + rCR + '-' + col(w) + rCP; });
    if (latestWeek === 0) sheet.getRange(rR, c0 + 1).setValue(0);
  });

  const term = function(w, suffix) {
    return F.map(function(f) { return col(w) + rows['BOBOT_' + f] + '*' + col(w) + rows[f + suffix]; }).join('+');
  };
  rowFx(need('OVERALL_PLAN'), function(w) { return '=' + term(w, '_PLAN'); });
  rowFx(need('KOMULATIF_PLAN'), function(w) { return '=' + term(w, '_KOMULATIF_PLAN'); });
  if (latestWeek === 0) {
    const rProg = need('PROGRESS_REALISASI'), rKom = need('KOMULATIF_REALISASI'), rDev = need('OVERALL_DEVIASI');
    sheet.getRange(rProg, c0 + 1).setFormula('=' + term(0, '_REALISASI'));
    sheet.getRange(rKom, c0 + 1).setFormula('=' + col(0) + rProg);
    sheet.getRange(rDev, c0 + 1).setFormula('=' + col(0) + rKom + '-' + col(0) + rows.KOMULATIF_PLAN);
  }

  // bersihkan sisa plan bila durasi dipersingkat (hanya kolom tanpa realisasi)
  const headerMax = inputHeaderMaxWeek_(W);
  if (headerMax > maxWeek && latestWeek <= maxWeek) {
    const from = weekCol_(W, maxWeek + 1) + 1, count = weekCol_(W, headerMax) + 1 - from + 1;
    const clearRows = ['OVERALL_PLAN', 'KOMULATIF_PLAN'];
    F.forEach(function(f) { clearRows.push('BOBOT_' + f, f + '_PLAN', f + '_KOMULATIF_PLAN', f + '_KOMULATIF_REALISASI', 'DEVIASI_' + f); });
    clearRows.forEach(function(item) { if (rows[item] && count > 0) sheet.getRange(rows[item], from, 1, count).clearContent(); });
  }
  // format mengikuti WEEK 0 untuk seluruh minggu proyek (hanya proyek baru / belum berjalan)
  if (applyFormat) Object.keys(rows).forEach(function(k) {
    sheet.getRange(rows[k], c0 + 1).copyTo(sheet.getRange(rows[k], c0 + 2, 1, maxWeek), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  });
}

// ===================== VALIDASI =====================

function validateWeeklyPlan_(plan, maxWeek, bobot) {
  if (!plan || !plan.length) throw new Error('Plan mingguan per bidang wajib ditempel (WEEK 1 sampai WEEK ' + maxWeek + ').');
  if (plan.length !== maxWeek) throw new Error('Plan mingguan berisi ' + plan.length + ' baris, seharusnya ' + maxWeek + ' baris (WEEK 1 sampai WEEK ' + maxWeek + ').');
  DB_CONFIG.FIELDS.forEach(function(f, i) {
    let prev = 0;
    for (let w = 0; w < plan.length; w++) {
      const v = Number(plan[w][i]);
      if (!Number.isFinite(v) || v < 0 || v > 100.0001) throw new Error('Plan ' + f + ' WEEK ' + (w + 1) + ' tidak valid.');
      if (v + 0.0001 < prev) throw new Error('Plan ' + f + ' turun di WEEK ' + (w + 1) + ' (' + v + '% < ' + prev + '%). Plan kumulatif tidak boleh turun.');
      prev = v;
    }
    if (bobot[f] > 0 && Math.abs(prev - 100) > 0.01) throw new Error('Plan ' + f + ' di WEEK ' + maxWeek + ' harus 100% (saat ini ' + prev + '%).');
  });
}

function validateMonthlyPlan_(months, input) {
  let prev = 0;
  months.forEach(function(m, i) {
    const inp = input[monthKey_(m)] || {};
    const v = Number(inp.plan);
    if (inp.plan === '' || inp.plan === null || inp.plan === undefined || !Number.isFinite(v)) throw new Error('Plan bulanan ' + m.label + ' belum diisi.');
    if (v < 0 || v > 100.0001) throw new Error('Plan bulanan ' + m.label + ' harus 0–100%.');
    if (v + 0.0001 < prev) throw new Error('Plan bulanan ' + m.label + ' lebih kecil dari bulan sebelumnya.');
    prev = v;
    if (i === months.length - 1 && Math.abs(v - 100) > 0.01) throw new Error('Plan bulanan bulan terakhir (' + m.label + ') harus 100%.');
  });
}

// ===================== HELPER =====================

function requireProjectEditor_(token) {
  const user = requireUser_(token);
  if (['ADMIN', 'INPUT', 'PIC'].indexOf(String(user.role || '').trim().toUpperCase()) < 0) throw new Error('Akun Anda tidak memiliki akses edit proyek.');
  return user;
}

function requireAdminUser_(token) {
  const user = requireUser_(token);
  if (String(user.role || '').trim().toUpperCase() !== 'ADMIN') throw new Error('Menu Tambah/Edit Proyek hanya untuk ADMIN.');
  return user;
}

function isLegacyMonthly_(db, p) {
  const M = db.monthly;
  const r = itemRow_(M, p.id, 'PLAN_MONTHLY_PROGRESS');
  if (r < 0 || !M.months.length) return false;
  return M.sheet.getRange(r + 1, M.months[0].col + 1, 1, M.months.length).getFormulas()[0].some(function(f) { return !!f; });
}

function historicalTotalCol_(M) {
  if (!M.months.length) return -1;
  const firstYear = M.months[0].year;
  const prev = M.yearTotals.filter(function(t) { return t.year < firstYear; }).sort(function(a, b) { return b.year - a.year; })[0];
  return prev ? prev.col : -1;
}

/** Periode laporan bulanan proyek (indeks tahun*12+bulan). Otomatis: tanggal setelah cut-off masuk bulan berikutnya.
 *  req {first:'yyyy-mm', last:'yyyy-mm'} boleh menggeser bulan pertama 0..+1 dan bulan terakhir -1..+1 dari bulan kalender. */
function reportPeriodFor_(start, finish, req) {
  const cut = PROJECT_CONFIG.MONTH_CUTOFF_DAY;
  const sk = start.getFullYear() * 12 + start.getMonth(), fk = finish.getFullYear() * 12 + finish.getMonth();
  const auto = { first: sk + (start.getDate() > cut ? 1 : 0), last: fk + (finish.getDate() > cut ? 1 : 0) };
  if (auto.last < auto.first) auto.last = auto.first;
  const key = function(t) { const m = /^(\d{4})-(\d{2})$/.exec(String(t || '')); return m ? Number(m[1]) * 12 + Number(m[2]) - 1 : null; };
  const out = { first: auto.first, last: auto.last, adjusted: false, auto: auto };
  if (req) {
    const a = key(req.first), b = key(req.last);
    if (a !== null) { if (a < sk || a > sk + 1) throw new Error('Bulan pertama laporan hanya boleh bulan mulai atau bulan berikutnya.'); out.first = a; }
    if (b !== null) { if (b < fk - 1 || b > fk + 1) throw new Error('Bulan terakhir laporan hanya boleh bulan selesai, sebelumnya, atau sesudahnya.'); out.last = b; }
    if (out.last < out.first) throw new Error('Periode laporan tidak valid.');
    out.adjusted = out.first !== auto.first || out.last !== auto.last;
  }
  return out;
}
function reportPeriodKey_(n) { return Math.floor(n / 12) + '-' + String(n % 12 + 1).padStart(2, '0'); }
/** Penyesuaian periode (selain otomatis) disimpan di Script Properties: { PROYEK_ID: {first, last} }. */
function reportPeriodOverrides_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('PMO_REPORT_PERIOD') || '{}') || {}; } catch (e) { return {}; }
}
function reportPeriodOverride_(id) { return reportPeriodOverrides_()[normKey_(id)] || null; }
function saveReportPeriodOverride_(id, period) {
  try {
    const all = reportPeriodOverrides_(), k = normKey_(id);
    if (!period.adjusted && !all[k]) return;
    if (period.adjusted) all[k] = { first: reportPeriodKey_(period.first), last: reportPeriodKey_(period.last) }; else delete all[k];
    PropertiesService.getScriptProperties().setProperty('PMO_REPORT_PERIOD', JSON.stringify(all));
  } catch (e) { console.error('Simpan periode laporan gagal: ' + (e && e.message)); }
}

function monthsBetween_(months, start, finish) {
  const a = start.getFullYear() * 12 + start.getMonth(), b = finish.getFullYear() * 12 + finish.getMonth();
  return months.filter(function(m) { const k = m.year * 12 + m.month; return k >= a && k <= b; });
}

function cutoffWeek_(start, m, maxWeek) {
  const cutoff = new Date(m.year, m.month, Math.min(PROJECT_CONFIG.MONTH_CUTOFF_DAY, new Date(m.year, m.month + 1, 0).getDate()));
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const days = Math.floor((cutoff - s) / 86400000) + 1; // hari ke-n sejak mulai
  return Math.max(0, Math.min(maxWeek, Math.floor(days / 7)));
}

/** Week tiap bulan dari input form (week manual) atau dari tanggal cut-off. Ditolak bila di luar 1..MAX_WEEK atau turun. */
function resolveMonthWeeks_(months, input, start, maxWeek) {
  const out = {};
  let prev = 0;
  months.forEach(function(m) {
    const key = monthKey_(m), inp = input[key] || {};
    let wk = cutoffWeek_(start, m, maxWeek);
    if (inp.week !== undefined && inp.week !== null && inp.week !== '' && !(Number(inp.week) === 0 && wk === 0)) {
      wk = Number(inp.week);
      if (!Number.isInteger(wk) || wk < 1 || wk > maxWeek) throw new Error('Week cut-off ' + m.label + ' harus angka 1–' + maxWeek + '.');
    }
    if (wk && wk < prev) throw new Error('Week cut-off ' + m.label + ' (W' + wk + ') lebih kecil dari bulan sebelumnya (W' + prev + ').');
    if (wk) prev = wk;
    out[key] = wk;
  });
  return out;
}

/** Week yang dipakai rumus tautan bulanan saat ini ({ 'yyyy-mm': week }), dibaca dari AKTUAL_MONTHLY_PROGRESS (atau PLAN bila AKTUAL bukan tautan). */
function monthWeekLinks_(db, p) {
  const M = db.monthly, W = db.weekly, out = {};
  if (!M.months.length || !W.weekCols) return out;
  const colToWeek = {};
  Object.keys(W.weekCols).forEach(function(w) { colToWeek[W.weekCols[w]] = Number(w); });
  const read = function(item) {
    const r = itemRow_(M, p.id, item);
    return r < 0 ? [] : M.sheet.getRange(r + 1, M.months[0].col + 1, 1, M.months.length).getFormulas()[0];
  };
  const colOf = function(letters) { let n = 0; for (let i = 0; i < letters.length; i++) n = n * 26 + letters.charCodeAt(i) - 64; return n - 1; };
  const act = read('AKTUAL_MONTHLY_PROGRESS'), plan = read('PLAN_MONTHLY_PROGRESS');
  M.months.forEach(function(m, i) {
    [act[i], plan[i]].some(function(f) {
      const mm = String(f || '').match(/^=\s*'?([^'!]+)'?!\$?([A-Z]{1,3})\$?\d+\s*$/);
      if (!mm || mm[1].trim() !== DB_SHEETS.WEEKLY) return false;
      const w = colToWeek[colOf(mm[2])];
      if (!w) return false;
      out[monthKey_(m)] = w;
      return true;
    });
  });
  return out;
}

function monthKey_(m) { return m.year + '-' + String(m.month + 1).padStart(2, '0'); }

function isoDate_(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

function parseIsoDate_(s) {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

function logProjectSetup_(ss, user, id, name, mode) {
  let sh = ss.getSheetByName(PROJECT_CONFIG.LOG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(PROJECT_CONFIG.LOG_SHEET);
    sh.getRange(1, 1, 1, 8).setValues([['WAKTU', 'USERNAME', 'NAMA', 'PROYEK_ID', 'NAMA_PROYEK', 'WEEK', 'TANGGAL_REPORT', 'MODE']])
      .setFontWeight('bold').setBackground('#0F2B46').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  sh.appendRow([new Date(), user.username || '', user.name || '', id, name, '-', '', mode]);
}

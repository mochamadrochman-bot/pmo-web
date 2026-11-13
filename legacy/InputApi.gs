/**
 * INPUT PROGRESS MINGGUAN
 *
 * Menulis data mingguan langsung ke sheet DATA MINGGUAN PROYEK
 * (format panjang: PROYEK_ID | TIM_PROYEK | NAMA_PROYEK | ITEM_DATA | WEEK 0..n).
 *
 * Yang ditulis untuk kolom WEEK terpilih:
 *   - <BIDANG>_REALISASI              : nilai input minggu ini
 *   - <BIDANG>_KOMULATIF-REALISASI    : rumus  = minggu lalu + minggu ini
 *   - DEVIASI_<BIDANG>                : rumus  = kumulatif realisasi - kumulatif plan
 *   - BOBOT_<BIDANG>                  : rumus  = minggu lalu (hanya jika kosong)
 *   - PROGRESS_REALISASI              : rumus  = Σ bobot x realisasi bidang
 *   - KOMULATIF_REALISASI             : rumus  = minggu lalu + minggu ini
 *   - OVERALL_DEVIASI                 : rumus  = kumulatif realisasi - kumulatif plan
 *   - concern, mitigasi, highlight, link video, link materi
 *   - K3 mingguan + rumus kumulatif K3 (opsional)
 *
 * Proyek dibaca otomatis dari sheet, jadi proyek baru langsung tersedia
 * selama baris ITEM_DATA-nya sudah ada.
 */

const INPUT_CONFIG = {
  // ROLE di USER ACCESS yang boleh menginput. Akses proyek tetap mengikuti kolom PROYEK.
  ROLES: ['ADMIN', 'PIC', 'INPUT'],
  LOG_SHEET: 'LOG INPUT WEEKLY',
  TEXT_LIMIT: 5000
};

const INPUT_K3_CUMULATIVE = [
  ['KOMULATIF_MANHOUR', 'MANHOUR_WEEKLY'],
  ['FATALITY_KOMULATIF', 'FATALITY_WEEKLY'],
  ['SAFETY_TALK_KOMULATIF', 'SAFETY_TALK_MINGGUAN'],
  ['SMWT_KOMULATIF', 'SMWT_MINGGUAN'],
  ['KOMULATIF_HSE_PLAN', 'HSE_PLAN_WEEK'],
  ['KOMULATIF_HSE_AKTUAL', 'HSE_AKTUAL_WEEK']
];

// ===================== HALAMAN =====================

function getInputPageHtml(token) {
  requireInputUser_(token);
  const template = HtmlService.createTemplateFromFile('InputProgress');
  template.initialSessionToken = String(token);
  template.appUrl = ScriptApp.getService().getUrl();
  template.initialProjectName = '';
  return template.evaluate().getContent();
}

// ===================== API =====================

/** Info awal halaman input: pengguna dan daftar proyek yang boleh diinput. */
function getInputContext(token) {
  dbReadOnly_(); // C1b: baca DATA MINGGUAN/BULANAN dari cache
  const user = requireInputUser_(token);
  const db = loadDb_();
  const projects = db.allProjects
    .filter(function(p) { return db.weekly.projects[p.id] && userCanOperateProject_(user, p) && projectReady_(db, p).ready && projectLifecycle_(db, p).stage === 'BERJALAN'; })
    .map(function(p) {
      const info = weeklyInfo_(db, p);
      return { id: p.id, name: p.name, fullName: p.fullName, team: p.team, latestWeek: info.latestWeek };
    });
  return {
    success: true,
    user: { name: user.name || user.username, username: user.username, role: String(user.role || '').toUpperCase() },
    projects: projects,
    setup: projects.length ? null : setupHint_(db, user)
  };
}

/** Data form untuk satu proyek dan satu minggu (default: minggu setelah data terakhir). */
function getInputFormData(token, projectId, week) {
  dbReadOnly_(); // C1b: baca DATA MINGGUAN/BULANAN dari cache
  const pf = inputPerf_('input_form');
  const user = requireInputUser_(token);
  pf.lap('auth');
  const db = loadDb_();
  pf.lap('loadDb');
  const p = inputProject_(db, user, projectId);
  const W = db.weekly;
  const info = weeklyInfo_(db, p);
  const headerMax = inputHeaderMaxWeek_(W);
  // Proyek terlambat boleh lanjut melewati MAX_WEEK; kolom WEEK baru dibuat saat disimpan.
  const allowedMax = Math.min(400, info.latestWeek + 1);
  let w = Number(week) || allowedMax;
  w = Math.max(1, Math.min(allowedMax, w));

  const planEnd = info.planEndWeek;
  const schedMax = Number(monthlyValue_(db, p.id, 'MAX_WEEK')) || planEnd;
  // Setelah baseline berakhir, plan dianggap tetap (100%) sampai ada addendum waktu.
  const pct = function(item, wk) {
    const v = weekPercent_(W, p.id, item, wk);
    if (v === null && planEnd && wk > planEnd && /KOMULATIF_PLAN$/.test(normKey_(item))) return weekPercent_(W, p.id, item, planEnd);
    return v;
  };
  const raw = function(item, wk) { return weekRaw_(W, p.id, item, wk); };
  const text = function(item, wk) { return weekText_(W, p.id, item, wk); };
  const existing = w <= info.latestWeek;
  pf.lap('prep');
  // Data Engineering & EPCC dimuat sekali lalu dipakai bersama (sebelumnya masing-masing dibaca dua kali).
  let engS = null, epcS = null;
  try { engS = engStoreC_(); } catch (e) {}
  pf.lap('engStore');
  try { epcS = epcStoreC_(); } catch (e) {}
  pf.lap('epcStore');
  const engAuto = engAutoForWeek_(db, p, w, engS);
  pf.lap('engAuto');
  const epcc = epccForInput_(db, p, w, epcS, engS);
  pf.lap('epcc');

  const fields = DB_CONFIG.FIELDS.map(function(name) {
    const F = name.toUpperCase();
    let bobot = pct('BOBOT_' + F, w);
    if (bobot === null) bobot = lastPercentBefore_(W, p.id, 'BOBOT_' + F, w);
    return {
      name: name,
      bobot: bobot,
      prevCumulative: pct(F + '_KOMULATIF_REALISASI', w - 1) || 0,
      planCumulative: pct(F + '_KOMULATIF_PLAN', w),
      prevPlanCumulative: pct(F + '_KOMULATIF_PLAN', w - 1),
      current: existing ? (pct(F + '_REALISASI', w) || 0) : null,
      concern: existing ? text(F + '_CONCERN', w) : '',
      mitigation: existing ? text(F + '_MITIGASI', w) : '',
      prevConcern: lastTextBefore_(W, p.id, F + '_CONCERN', w),
      prevMitigation: lastTextBefore_(W, p.id, F + '_MITIGASI', w),
      auto: name === 'Engineering' ? engAuto : null,
      epcc: epcc[name] || null
    };
  });

  const hseNumbers = function(wk) {
    return {
      contractor: raw('PERSON_CONTRACTOR', wk),
      subContractor: raw('PERSON_SUB_CONTRACTOR', wk),
      manhour: raw('MANHOUR_WEEKLY', wk),
      fatality: raw('FATALITY_WEEKLY', wk),
      safetyTalk: raw('SAFETY_TALK_MINGGUAN', wk),
      smwt: raw('SMWT_MINGGUAN', wk),
      ltifr: raw('LTIFR', wk),
      hsePlan: pct('HSE_PLAN_WEEK', wk),
      hseActual: pct('HSE_AKTUAL_WEEK', wk),
      issue: text('ISSUE_K3', wk)
    };
  };
  const hseCurrent = existing ? hseNumbers(w) : null;
  const hasHseCurrent = !!hseCurrent && Object.keys(hseCurrent).some(function(k) { return hseCurrent[k] !== null && hseCurrent[k] !== ''; });
  const prevCumulative = {};
  INPUT_K3_CUMULATIVE.forEach(function(pair) {
    const last = lastFilledWeekBefore_(W, p.id, pair[0], w);
    prevCumulative[pair[0]] = last ? (pair[0].indexOf('HSE') >= 0 ? pct(pair[0], last) : toNumber_(raw(pair[0], last))) : null;
  });
  const lastHseWeek = lastFilledWeekBefore_(W, p.id, 'TOTAL_MP', w);

  const start = info.startDate;
  const periodOf = function(wk) {
    if (!start) return '';
    const a = new Date(start); a.setDate(a.getDate() + (wk - 1) * 7);
    const b = new Date(a); b.setDate(b.getDate() + 6);
    return formatDateId_(a) + ' – ' + formatDateId_(b);
  };
  const weeks = [];
  for (let i = 1; i <= allowedMax; i++) weeks.push({ week: i, period: periodOf(i), submitted: i <= info.latestWeek });

  pf.lap('fields');
  const rtlView = (function() { try { return epcRtlView_(db, p, epcS); } catch (e) { return { active: false, reason: 'Data CPM tidak bisa dibaca: ' + e.message, groups: [], actions: [], missing: [] }; } })();
  pf.lap('rtl');
  const out = {
    success: true,
    project: { id: p.id, name: p.name, fullName: p.fullName, team: p.team,
      contractor: monthlyText_(db, p.id, 'KONTRAKTOR'), startDate: start ? formatDateId_(start) : '' },
    week: w,
    period: periodOf(w),
    scheduleMaxWeek: schedMax,
    overdueWeeks: schedMax && w > schedMax ? w - schedMax : 0,
    latestWeek: info.latestWeek,
    maxWeek: headerMax,
    weeks: weeks,
    existing: existing,
    overall: {
      prevCumulative: pct('KOMULATIF_REALISASI', w - 1) || 0,
      planCumulative: pct('KOMULATIF_PLAN', w),
      currentCumulative: existing ? pct('KOMULATIF_REALISASI', w) : null
    },
    fields: fields,
    highlight: existing ? (text('HIGHLIGHT_ACTIVITY', w)) : '',
    prevHighlight: lastTextBefore_(W, p.id, 'HIGHLIGHT_ACTIVITY', w),
    videoUrl: existing ? weekLink_(W, p.id, 'LINK_VIDEO', w) : '',
    materialUrl: existing ? weekLink_(W, p.id, 'LINK_MATERI', w) : '',
    hse: {
      enabled: existing ? hasHseCurrent : !!lastHseWeek,
      current: hseCurrent,
      lastWeek: lastHseWeek,
      last: lastHseWeek ? hseNumbers(lastHseWeek) : null,
      prevCumulative: prevCumulative
    },
    rtl: rtlView,
    canRtl: String(user.role || '').toUpperCase() === 'ADMIN'
  };
  pf.done({ projectId: p.id, week: w });
  return out;
}

/** Simpan input mingguan ke DATA MINGGUAN PROYEK. */
function submitWeeklyInput(token, payload) {
  const pf = inputPerf_('input_submit');
  const user = requireInputUser_(token);
  pf.lap('auth');
  payload = payload || {};
  const t0 = Date.now();
  const lock = pmoLock_('DATA');
  lock.waitLock(30000);
  pf.lap('lockWait');
  try {
    DB_CACHE_ = null;
    const db = loadDb_();
    pf.lap('loadDb');
    const p = inputProject_(db, user, payload.projectId);
    const W = db.weekly;
    const sheet = W.sheet;
    const info = weeklyInfo_(db, p);
    const headerMax = inputHeaderMaxWeek_(W);
    const week = Number(payload.week);

    if (!Number.isInteger(week) || week < 1 || week > Math.max(headerMax, info.latestWeek + 1) || week > 400) throw new Error('Week tidak valid.');
    if (week > info.latestWeek + 1) {
      throw new Error('WEEK ' + (info.latestWeek + 1) + ' harus diinput terlebih dahulu sebelum WEEK ' + week + '.');
    }
    // Rencana tindak lanjut (aktif bila logika CPM Construction sudah diisi): grup/item yang menggeser jadwal wajib punya tindak lanjut.
    pf.lap('prep');
    if (week >= info.latestWeek) epcRtlGate_(db, p);
    pf.lap('rtlGate');
    if (week > headerMax) ensureWeekHeaders_(W, week);
    if (weekCol_(W, week - 1) < 0) throw new Error('Kolom WEEK ' + (week - 1) + ' tidak ditemukan di sheet.');

    const col = weekCol_(W, week) + 1;
    const prevCol = weekCol_(W, week - 1) + 1;
    const L = columnLetter_(col);
    const PL = columnLetter_(prevCol);
    const rowOf = function(item, required) {
      const r = itemRow_(W, p.id, item);
      if (r < 0 && required !== false) throw new Error('Baris ' + item + ' untuk ' + p.id + ' tidak ditemukan di ' + DB_SHEETS.WEEKLY + '.');
      return r < 0 ? 0 : r + 1;
    };
    // Semua sel minggu ini dikumpulkan dulu, lalu ditulis sekaligus oleh inputFlush_ (bukan sel per sel).
    const writes = {};
    const setVal = function(row, value) { writes[row] = { v: value }; };
    const setFx = function(row, formula) { writes[row] = { f: formula }; };

    // ---------- validasi progress ----------
    const progress = Object.assign({}, payload.progress || {});
    pf.lap('cols');
    // Mode otomatis: progres Engineering selalu dari unggahan realisasi dokumen engineering (nilai dari browser diabaikan).
    const engAuto = engAutoForWeek_(db, p, week, (function() { try { return engStoreC_(); } catch (e) { return null; } })());
    pf.lap('engAuto');
    if (engAuto) progress.Engineering = engAuto.inc;
    const inc = {};
    DB_CONFIG.FIELDS.forEach(function(name) {
      let v = Number(progress[name]);
      if (progress[name] === '' || progress[name] === null || progress[name] === undefined || !Number.isFinite(v)) {
        throw new Error('Progress ' + name + ' minggu ini wajib diisi (isi 0 bila tidak ada kemajuan).');
      }
      if (v < -100 || v > 100) throw new Error('Progress ' + name + ' harus di antara -100% dan 100%.');
      const prev = weekPercent_(W, p.id, name.toUpperCase() + '_KOMULATIF_REALISASI', week - 1) || 0;
      // kumulatif yang mendekati 100% (±0,05) dibulatkan tepat ke 100%
      if (prev + v >= 99.95 && prev + v <= 100.05 && Math.abs(prev + v - 100) > 1e-9) { progress[name] = 100 - prev; v = 100 - prev; }
      if (prev + v > 100.05) throw new Error('Kumulatif ' + name + ' melebihi 100% (' + (prev + v).toFixed(2) + '%).');
      if (prev + v < -0.05) throw new Error('Kumulatif ' + name + ' tidak boleh negatif.');
      inc[name] = v;
    });
    const highlight = cleanText_(payload.highlight);
    if (!highlight) throw new Error('Highlight activities wajib diisi.');
    ['videoUrl', 'materialUrl'].forEach(function(k) {
      const u = String(payload[k] || '').trim();
      if (u && !/^https:\/\//i.test(u)) throw new Error('Link harus diawali https:// (' + (k === 'videoUrl' ? 'video' : 'materi') + ').');
    });

    // ---------- progress per bidang ----------
    const overallTerms = [];
    DB_CONFIG.FIELDS.forEach(function(name) {
      const F = name.toUpperCase();
      const rBobot = rowOf('BOBOT_' + F);
      const rReal = rowOf(F + '_REALISASI');
      const rCum = rowOf(F + '_KOMULATIF_REALISASI');
      const rPlan = rowOf(F + '_KOMULATIF_PLAN');
      const rDev = rowOf('DEVIASI_' + F);
      if (weekRaw_(W, p.id, 'BOBOT_' + F, week) === null) setFx(rBobot, '=' + PL + rBobot);
      setVal(rReal, inc[name] / 100);
      setFx(rCum, '=' + PL + rCum + '+' + L + rReal);
      setFx(rDev, '=' + L + rCum + '-' + L + rPlan);
      overallTerms.push(L + rBobot + '*' + L + rReal);
    });
    // Minggu di luar baseline (proyek terlambat): plan tidak bertambah, kumulatif plan tetap.
    if (weekRaw_(W, p.id, 'KOMULATIF_PLAN', week) === null) {
      const planTerms = [], cumTerms = [];
      DB_CONFIG.FIELDS.forEach(function(name) {
        const F = name.toUpperCase();
        const rB = rowOf('BOBOT_' + F), rP = rowOf(F + '_PLAN'), rCP = rowOf(F + '_KOMULATIF_PLAN');
        setVal(rP, 0);
        setFx(rCP, '=' + PL + rCP + '+' + L + rP);
        planTerms.push(L + rB + '*' + L + rP);
        cumTerms.push(L + rB + '*' + L + rCP);
      });
      const rOvPlan = rowOf('OVERALL_PLAN', false);
      if (rOvPlan) setFx(rOvPlan, '=' + planTerms.join('+'));
      setFx(rowOf('KOMULATIF_PLAN'), '=' + cumTerms.join('+'));
    }

    const rProg = rowOf('PROGRESS_REALISASI');
    const rKom = rowOf('KOMULATIF_REALISASI');
    const rKomPlan = rowOf('KOMULATIF_PLAN');
    const rOvDev = rowOf('OVERALL_DEVIASI');
    setFx(rProg, '=' + overallTerms.join('+'));
    setFx(rKom, '=' + PL + rKom + '+' + L + rProg);
    setFx(rOvDev, '=' + L + rKom + '-' + L + rKomPlan);

    // ---------- concern, highlight, media ----------
    const concern = payload.concern || {};
    DB_CONFIG.FIELDS.forEach(function(name) {
      const F = name.toUpperCase();
      const c = concern[name] || {};
      const rc = rowOf(F + '_CONCERN', false), rm = rowOf(F + '_MITIGASI', false);
      if (rc) setVal(rc, cleanText_(c.concern));
      if (rm) setVal(rm, cleanText_(c.mitigation));
    });
    const rHigh = rowOf('HIGHLIGHT_ACTIVITY');
    setVal(rHigh, highlight);
    const rVid = rowOf('LINK_VIDEO', false), rMat = rowOf('LINK_MATERI', false);
    if (rVid) setVal(rVid, String(payload.videoUrl || '').trim());
    if (rMat) setVal(rMat, String(payload.materialUrl || '').trim());

    // ---------- K3 ----------
    if (payload.hseEnabled) {
      const h = payload.hse || {};
      const num = function(key, label, isPct) {
        const v = Number(h[key]);
        if (h[key] === '' || h[key] === null || h[key] === undefined || !Number.isFinite(v)) throw new Error(label + ' wajib diisi (angka).');
        if (v < 0) throw new Error(label + ' tidak boleh negatif.');
        return isPct ? v / 100 : v;
      };
      const weekly = [
        ['PERSON_CONTRACTOR', num('contractor', 'Man power main contractor')],
        ['PERSON_SUB_CONTRACTOR', num('subContractor', 'Man power sub kontraktor')],
        ['MANHOUR_WEEKLY', num('manhour', 'Safe man hours minggu ini')],
        ['FATALITY_WEEKLY', num('fatality', 'Fatality')],
        ['SAFETY_TALK_MINGGUAN', num('safetyTalk', 'Safety talk')],
        ['SMWT_MINGGUAN', num('smwt', 'SMWT')],
        ['LTIFR', num('ltifr', 'LTI / LTIFR')],
        ['HSE_PLAN_WEEK', num('hsePlan', 'HSE plan minggu ini', true)],
        ['HSE_AKTUAL_WEEK', num('hseActual', 'HSE aktual minggu ini', true)]
      ];
      weekly.forEach(function(item) { const r = rowOf(item[0], false); if (r) setVal(r, item[1]); });
      const rIssue = rowOf('ISSUE_K3', false);
      if (rIssue) setVal(rIssue, cleanText_(h.issue) || 'Not Available');
      const rC = rowOf('PERSON_CONTRACTOR', false), rS = rowOf('PERSON_SUB_CONTRACTOR', false), rT = rowOf('TOTAL_MP', false);
      if (rT && rC && rS) setFx(rT, '=' + L + rC + '+' + L + rS);
      INPUT_K3_CUMULATIVE.forEach(function(pair) {
        const rCum = rowOf(pair[0], false), rW = rowOf(pair[1], false);
        if (!rCum || !rW) return;
        const last = lastFilledWeekBefore_(W, p.id, pair[0], week);
        const lastL = last !== null && last !== undefined && weekCol_(W, last) >= 0 ? columnLetter_(weekCol_(W, last) + 1) : null;
        setFx(rCum, lastL ? '=' + lastL + rCum + '+' + L + rW : '=' + L + rW);
      });
    }

    // ---------- tulis sekaligus; format mengikuti kolom minggu sebelumnya ----------
    pf.lap('build');
    const wr = inputFlush_(sheet, col, prevCol, writes, rHigh);
    pf.lap('write');
    const mode = week <= info.latestWeek ? 'UPDATE' : 'BARU';
    const fromEpcc = DB_CONFIG.FIELDS.filter(function(f) { return payload.progressSource && String(payload.progressSource[f] || '').toUpperCase() === 'EPCC'; });
    writeInputLog_(db.ss, user, p, week, payload.reportDate, mode + (fromEpcc.length ? ' · dari EPCC Control: ' + fromEpcc.join(', ') : ''));
    pf.lap('inputLog');

    const actual = wr.value(rKom);
    const plan = wr.value(rKomPlan);
    dataChanged_();
    pf.lap('cacheReset');
    return {
      success: true,
      mode: mode,
      project: p.name,
      projectId: p.id,
      week: week,
      overallActual: typeof actual === 'number' ? actual * 100 : null,
      suggestClose: typeof actual === 'number' && actual >= 0.9995,
      overallPlan: typeof plan === 'number' ? plan * 100 : null,
      writeMode: wr.mode,
      serverMs: Date.now() - t0
    };
  } finally {
    DB_CACHE_ = null;
    lock.releaseLock();
    pf.done({ projectId: payload && payload.projectId, week: payload && payload.week });
  }
}

// ===================== HELPER =====================

/** Catatan waktu per langkah (ms) -> satu baris log JSON di Executions / Cloud logs. Tidak mengubah hasil. */
function inputPerf_(ev) {
  const t0 = Date.now(), laps = {};
  let last = t0;
  return {
    lap: function(k) { const n = Date.now(); laps[k] = (laps[k] || 0) + (n - last); last = n; },
    done: function(extra) {
      const o = { ev: ev, totalMs: Date.now() - t0 };
      Object.keys(laps).forEach(function(k) { o[k] = laps[k]; });
      Object.keys(extra || {}).forEach(function(k) { o[k] = extra[k]; });
      try { console.log(JSON.stringify(o)); } catch (e) {}
      return o.totalMs;
    }
  };
}

/**
 * Tulis semua sel minggu ini sekaligus.
 *  - BATCH (bawaan): 1 baca blok + 1 tulis + 1 salin format + 1 baca ulang untuk verifikasi.
 *    Sel di sela baris yang ditulis dipertahankan apa adanya (rumus tetap rumus).
 *    Hasil dibaca ulang dan dibandingkan dengan yang seharusnya tertulis; sel yang tidak cocok ditulis ulang per sel.
 *  - LAMA: tulis per sel seperti sebelumnya. Saklar cadangan tanpa ubah kode:
 *    Project Settings -> Script Properties -> PMO_INPUT_WRITE = LAMA (hapus / isi BATCH untuk kembali).
 */
function inputFlush_(sheet, col, prevCol, writes, rHigh) {
  const rows = Object.keys(writes).map(Number).filter(function(r) { return r > 0; }).sort(function(a, b) { return a - b; });
  const mode = String(PropertiesService.getScriptProperties().getProperty('PMO_INPUT_WRITE') || 'BATCH').trim().toUpperCase() === 'LAMA' ? 'LAMA' : 'BATCH';
  const t0 = Date.now();
  const writeOne = function(r) { const w = writes[r], c = sheet.getRange(r, col); if (w.f !== undefined) c.setFormula(w.f); else c.setValue(w.v); };
  if (!rows.length) return { mode: mode, repaired: 0, value: function(r) { return r > 0 ? sheet.getRange(r, col).getValue() : null; } };
  if (mode === 'LAMA') {
    rows.forEach(writeOne);
    rows.forEach(function(r) { sheet.getRange(r, prevCol).copyTo(sheet.getRange(r, col), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false); });
    if (rHigh) sheet.getRange(rHigh, col).setWrap(true);
    SpreadsheetApp.flush();
    console.log(JSON.stringify({ ev: 'input_write', mode: mode, cells: rows.length, ms: Date.now() - t0 }));
    return { mode: mode, repaired: 0, value: function(r) { return sheet.getRange(r, col).getValue(); } };
  }
  const r0 = rows[0], n = rows[rows.length - 1] - r0 + 1, rg = sheet.getRange(r0, col, n, 1);
  const curF = rg.getFormulas(), curV = rg.getValues();
  const grid = curV.map(function(x, i) {
    const w = writes[r0 + i];
    if (w) return [w.f !== undefined ? w.f : w.v];
    return [curF[i][0] ? curF[i][0] : x[0]];
  });
  rg.setValues(grid);
  sheet.getRange(r0, prevCol, n, 1).copyTo(rg, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  if (rHigh) sheet.getRange(rHigh, col).setWrap(true);
  SpreadsheetApp.flush();
  const backF = rg.getFormulas(), backV = rg.getValues(), bad = [];
  const norm = function(s) { return String(s || '').replace(/\s/g, '').toUpperCase(); };
  rows.forEach(function(r) {
    const i = r - r0, w = writes[r];
    if (w.f !== undefined) { if (norm(backF[i][0]) !== norm(w.f)) bad.push(r); return; }
    const a = backV[i][0], e = w.v;
    const same = typeof e === 'number' ? (typeof a === 'number' && Math.abs(a - e) < 1e-9) : String(a === null || a === undefined ? '' : a) === String(e === null || e === undefined ? '' : e);
    if (!same || backF[i][0]) bad.push(r);
  });
  if (bad.length) { bad.forEach(writeOne); SpreadsheetApp.flush(); }
  console.log(JSON.stringify({ ev: 'input_write', mode: mode, cells: rows.length, block: n, repaired: bad.length, ms: Date.now() - t0 }));
  const fixed = {}; bad.forEach(function(r) { fixed[r] = 1; });
  return { mode: mode, repaired: bad.length, value: function(r) { const i = r - r0; return (fixed[r] || i < 0 || i >= n) ? sheet.getRange(r, col).getValue() : backV[i][0]; } };
}


function canInput_(user) {
  return INPUT_CONFIG.ROLES.indexOf(String(user.role || '').trim().toUpperCase()) >= 0;
}

/**
 * Cek link Google Drive untuk video / materi mingguan: file ada, jenisnya sesuai, dan akses berbagi.
 * status: ok | warn | fail | unverified
 */
function checkWeeklyLink(token, url, kind) {
  requireInputUser_(token);
  url = String(url || '').trim();
  const m = url.match(/^https:\/\/(?:drive|docs)\.google\.com\/(?:file\/d\/|(?:document|spreadsheets|presentation|drawings)\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([A-Za-z0-9_-]{10,})/);
  if (!m) {
    if (/\/drive\/(?:u\/\d+\/)?folders\//.test(url)) return { status: 'fail', message: 'Ini link folder. Gunakan link file video / dokumen.' };
    return { status: 'unverified', message: 'Format link Google Drive tidak dikenali; tidak bisa dicek otomatis.' };
  }
  let f;
  try { f = DriveApp.getFileById(m[1]); }
  catch (e) {
    const em = String((e && e.message) || e);
    if (/permission|authorization|izin|scope/i.test(em)) return { status: 'unverified', message: 'Akun web app belum punya izin Drive untuk mengecek link. Pastikan file dibagikan "Siapa saja yang memiliki link".' };
    return { status: 'fail', message: 'File tidak ditemukan atau tidak bisa dibuka. Periksa kembali link dan akses berbaginya.' };
  }
  const name = f.getName(), mime = f.getMimeType();
  let access = '';
  try { access = String(f.getSharingAccess()); } catch (e) { access = ''; }
  if (kind === 'video' && !/^video\//.test(mime)) return { status: 'fail', message: '"' + name + '" bukan file video.' };
  if (access === 'ANYONE' || access === 'ANYONE_WITH_LINK') return { status: 'ok', message: name + ' · bisa dibuka siapa saja yang memiliki link.' };
  if (access === 'DOMAIN' || access === 'DOMAIN_WITH_LINK') return { status: 'warn', message: name + ' · hanya bisa dibuka akun satu domain organisasi.' };
  if (!access) return { status: 'unverified', message: name + ' · akses berbagi tidak bisa dibaca; pastikan "Siapa saja yang memiliki link".' };
  return { status: 'fail', message: '"' + name + '" masih terbatas (tidak dibagikan lewat link). Ubah akses menjadi "Siapa saja yang memiliki link".' };
}

function requireInputUser_(token) {
  const user = requireUser_(token);
  if (!canInput_(user)) throw new Error('Akun Anda tidak memiliki akses input progress. Hubungi admin PMO.');
  return user;
}

/** Dipakai menu sidebar untuk menampilkan/menyembunyikan tombol Input Progress. */
function getInputAccess(token) {
  dbReadOnly_(); // C1b: baca DATA MINGGUAN/BULANAN dari cache
  const session = authGetSession(token);
  return { canInput: !!(session && session.success && session.user && canInput_(session.user)) };
}

function inputProject_(db, user, projectId) {
  const id = normKey_(projectId);
  const p = db.allProjects.find(function(x) { return x.id === id; }) || findProject_(db.allProjects, projectId);
  if (!p || !db.weekly.projects[p.id]) throw new Error('Proyek tidak ditemukan di ' + DB_SHEETS.WEEKLY + '.');
  if (!userCanOperateProject_(user, p)) throw new Error('Akun Anda hanya dapat menginput proyek sesuai PROYEK_ID akun.');
  const stage = projectLifecycle_(db, p).stage;
  if (stage !== 'BERJALAN') throw new Error('Proyek ' + p.name + ' sudah berstatus ' + (stage === 'DITUTUP' ? 'Ditutup' : 'Selesai') + '. Input mingguan ditutup.');
  const st = projectReady_(db, p);
  if (!st.ready) throw new Error('Proyek ' + p.name + ' belum di-setup (' + st.missing.join(', ') + '). Lengkapi lewat menu Tambah/Edit Proyek.');
  return p;
}

function inputHeaderMaxWeek_(W) {
  return Object.keys(W.weekCols).map(Number).reduce(function(a, b) { return Math.max(a, b); }, 0);
}

function lastFilledWeekBefore_(W, projectId, item, week) {
  for (let w = week - 1; w >= 0; w--) {
    if (weekCol_(W, w) >= 0 && weekRaw_(W, projectId, item, w) !== null) return w;
  }
  return null;
}

function lastPercentBefore_(W, projectId, item, week) {
  const w = lastFilledWeekBefore_(W, projectId, item, week);
  return w === null ? null : weekPercent_(W, projectId, item, w);
}

function lastTextBefore_(W, projectId, item, week) {
  for (let w = week - 1; w >= 1; w--) {
    const t = weekText_(W, projectId, item, w);
    if (t && !/^not available$/i.test(t)) return t;
  }
  return '';
}

function cleanText_(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, INPUT_CONFIG.TEXT_LIMIT);
}

function columnLetter_(col) {
  let s = '';
  while (col > 0) { const m = (col - 1) % 26; s = String.fromCharCode(65 + m) + s; col = Math.floor((col - 1) / 26); }
  return s;
}

/**
 * Angka EPCC Control untuk Input Progres WEEK "week": kumulatif per bidang dari ENG_PROGRES / EPC_PROGRES.
 * Hanya minggu yang sama yang bisa diambil (exact); prevCum = kumulatif EPCC minggu sebelumnya (untuk catatan selisih).
 */
function epccForInput_(db, p, week, epcIn, engIn) {
  const out = {};
  const pick = function(hist) {
    let cur = null, last = null, prev = null, done = null;
    hist.forEach(function(h) {
      if (h.week <= week && h.real >= 99.995 && (!done || h.week < done.week)) done = h;
      if (h.week === week) cur = h;
      if (h.week <= week && (!last || h.week > last.week)) last = h;
      if (h.week < week && (!prev || h.week > prev.week)) prev = h;
    });
    return {
      exact: !!cur, week: week, cumulative: cur ? engRound_(cur.real, 4) : null,
      lastWeek: last ? last.week : null, lastCumulative: last ? engRound_(last.real, 4) : null,
      prevWeek: prev ? prev.week : null, prevCumulative: prev ? engRound_(prev.real, 4) : null,
      doneWeek: done ? done.week : null,
      by: cur ? cur.by || '' : '', at: cur ? cur.atText || '' : ''
    };
  };
  try {
    const es = epcIn || epcStore_();
    ['PROC', 'CONS', 'COM'].forEach(function(F) {
      const k = p.id + '|' + F;
      if (es.setting[k] || es.progress[k]) out[EPC.FIELDS[F]] = pick(es.progress[k] || []);
    });
  } catch (e) { /* EPCC belum disiapkan */ }
  try {
    const s = engIn || engStore_();
    if (s.setting[p.id] || s.progress[p.id]) out.Engineering = pick(s.progress[p.id] || []);
  } catch (e) { /* Engineering belum disiapkan */ }
  return out;
}

function writeInputLog_(ss, user, p, week, reportDate, mode) {
  let sh = ss.getSheetByName(INPUT_CONFIG.LOG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(INPUT_CONFIG.LOG_SHEET);
    sh.getRange(1, 1, 1, 8).setValues([['WAKTU', 'USERNAME', 'NAMA', 'PROYEK_ID', 'NAMA_PROYEK', 'WEEK', 'TANGGAL_REPORT', 'MODE']])
      .setFontWeight('bold').setBackground('#0F2B46').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  sh.appendRow([new Date(), user.username || '', user.name || '', p.id, p.fullName || p.name, 'WEEK ' + week, String(reportDate || ''), mode]);
}
   
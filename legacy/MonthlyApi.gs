/**
 * LAPORAN BULANAN (ADMIN / PIC / INPUT)
 *
 * Mengisi data bulanan proyek di DATA BULANAN:
 *   PLANT_COST_ACTUAL, IDC_ACTUAL, PM_COST_AKTUAL     : realisasi biaya bulan berjalan (Rupiah)
 *   PROGRESS_MILESTONE_MONTHLY, KETERANGAN_MILESTONE_MONTHLY : status milestone bulan ini & bulan depan
 *   LINK_LAPORAN_MONTHLY                                : tautan dokumen laporan bulanan
 *   RKAP                                                : wajib lengkap 12 bulan per tahun
 * Kolom TOTAL_<tahun>, TOTAL_ALL, dan kumulatif dihitung dengan rumus (tidak diisi dari form).
 */

const MONTHLY_CONFIG = {
  STATUS_OPTIONS: ['Belum Dimulai', 'Inprogress', 'Proses Procurement', 'Proses Fabrikasi', 'FAT', 'Selesai', 'Proyek Sudah Selesai'],
  COSTS: [['PLANT_COST_ACTUAL', 'plant', 'Plant cost'], ['IDC_ACTUAL', 'idc', 'IDC'], ['PM_COST_AKTUAL', 'pm', 'PM cost']]
};

// ===================== API =====================

function getMonthlyContext(token) {
  const user = requireInputUser_(token);
  reportLinkReconcile_(user);
  const db = loadDb_();
  const projects = db.allProjects.filter(function(p) {
    return db.monthly.projects[p.id] && userCanOperateProject_(user, p) && monthlyDate_(db, p.id, 'EFEKTIF_DATE_START') &&
      projectLifecycle_(db, p).stage !== 'DITUTUP';
  }).map(function(p) {
    const last = lastReportedMonth_(db, p);
    return { id: p.id, name: p.name, fullName: p.fullName, team: p.team, stage: projectLifecycle_(db, p).stage,
      lastMonth: last ? last.label : '' };
  });
  return {
    success: true,
    user: { name: user.name || user.username, username: user.username, role: String(user.role || '').toUpperCase() },
    projects: projects,
    setup: projects.length ? null : setupHint_(db, user),
    statusOptions: MONTHLY_CONFIG.STATUS_OPTIONS
  };
}

/** Data form satu proyek & satu bulan (default: bulan setelah laporan terakhir). */
function getMonthlyFormData(token, projectId, monthKey) {
  const user = requireInputUser_(token);
  reportLinkReconcile_(user,projectId);
  const db = loadDb_();
  const p = monthlyProject_(db, user, projectId);
  const M = db.monthly;
  const months = reportMonths_(db, p);
  if (!months.length) throw new Error('Belum ada kolom bulan yang sesuai dengan periode proyek ' + p.name + '.');
  const last = lastReportedMonth_(db, p);
  let m = months.find(function(x) { return monthKey_(x) === monthKey; });
  if (!m) {
    const li = last ? months.indexOf(last) : -1;
    m = months[Math.min(months.length - 1, li + 1)] || months[months.length - 1];
  }
  const idx = M.months.indexOf(m);
  const prev = idx > 0 ? M.months[idx - 1] : null;
  const next = idx + 1 < M.months.length ? M.months[idx + 1] : null;

  const costs = {}, prevCosts = {};
  MONTHLY_CONFIG.COSTS.forEach(function(c) {
    costs[c[1]] = cellNumber_(M, p.id, c[0], m.col);
    prevCosts[c[1]] = prev ? cellNumber_(M, p.id, c[0], prev.col) : null;
  });
  const prog = monthlyProgress_(db, p, m);
  const milestone = function(mm) {
    if (!mm) return null;
    return { key: monthKey_(mm), label: mm.label, plan: monthText_(db, p.id, 'MILESTONE_FISIK_MONTHLY', mm),
      status: monthText_(db, p.id, 'PROGRESS_MILESTONE_MONTHLY', mm), note: monthText_(db, p.id, 'KETERANGAN_MILESTONE_MONTHLY', mm) };
  };

  const rkapMonths = M.months.filter(function(x) { return x.year === m.year; });
  const rkap = rkapMonths.map(function(x) { return { key: monthKey_(x), label: x.label, value: cellNumber_(M, p.id, 'RKAP', x.col) }; });
  const life = lifecycleView_(db, p);
  const contract = monthlyValue_(db, p.id, 'NILAI_KONTRAK');
  const termPaid = cellNumber_(M, p.id, 'PLANT_COST_ACTUAL', M.totalAllCol);

  return {
    success: true,
    project: { id: p.id, name: p.name, fullName: p.fullName, team: p.team, contractor: monthlyText_(db, p.id, 'KONTRAKTOR') },
    lifecycle: { stage: life.stage, stageLabel: life.stageLabel },
    month: { key: monthKey_(m), label: m.label, year: m.year },
    months: months.map(function(x) { return { key: monthKey_(x), label: x.label, filled: monthHasReport_(db, p, x) }; }).reverse(),
    existing: monthHasReport_(db, p, m),
    costs: costs,
    prevMonth: prev ? prev.label : '',
    prevCosts: prevCosts,
    toDatePrev: costToDate_(db, p, 'TOTAL_INVESTASI_AKTUAL', prev),
    investment: monthlyValue_(db, p.id, 'NILAI_INVESTASI_FS'),
    contract: contract,
    termPaid: termPaid,
    termPaidThisMonth: costs.plant,
    progress: { plan: prog.plan === null ? null : prog.plan * 100, actual: prog.actual === null ? null : prog.actual * 100 },
    milestones: [milestone(m), milestone(next)].filter(Boolean),
    reportUrl: monthLink_(db, p.id, 'LINK_LAPORAN_MONTHLY', m),
    rkap: { year: m.year, months: rkap, complete: rkap.length === 12 && rkap.every(function(r) { return r.value !== null; }),
      total: rkap.reduce(function(s, r) { return s + (r.value || 0); }, 0) },
    statusOptions: MONTHLY_CONFIG.STATUS_OPTIONS
  };
}

/**
 * Simpan laporan bulanan.
 * payload: { projectId, month: 'YYYY-MM', costs: {plant, idc, pm}, milestones: [{key, status, note}],
 *            reportUrl, rkap: { year, values: [12 angka] } | null }
 */
function submitMonthlyReport(token, payload) {
  const user = requireInputUser_(token);
  payload = payload || {};
  const lock = pmoLock_('DATA');
  lock.waitLock(30000);
  try {
    DB_CACHE_ = null;
    const db = loadDb_();
    const p = monthlyProject_(db, user, payload.projectId);
    const M = db.monthly;
    const months = reportMonths_(db, p);
    const m = months.find(function(x) { return monthKey_(x) === payload.month; });
    if (!m) throw new Error('Bulan laporan tidak valid untuk proyek ini.');
    const rows = rowsOfProject_(M, p.id);
    const need = function(item) { if (!rows[item]) throw new Error('Baris ' + item + ' untuk ' + p.id + ' tidak ditemukan di ' + DB_SHEETS.MONTHLY + '.'); return rows[item]; };

    // ---------- validasi ----------
    const costs = payload.costs || {};
    const values = {};
    MONTHLY_CONFIG.COSTS.forEach(function(c) {
      const v = costs[c[1]];
      const n = Number(v);
      if (v === '' || v === null || v === undefined || !Number.isFinite(n)) throw new Error('Realisasi ' + c[2] + ' bulan ' + m.label + ' wajib diisi (isi 0 bila tidak ada).');
      if (n < 0) throw new Error('Realisasi ' + c[2] + ' tidak boleh negatif.');
      values[c[0]] = n;
    });
    const url = String(payload.reportUrl || '').trim();
    if (url && !/^https:\/\//i.test(url)) throw new Error('Link laporan harus diawali https://');
    const currentUrl=monthLink_(db,p.id,'LINK_LAPORAN_MONTHLY',m)||'';
    if(payload.reportUrlBase!==undefined&&reportLinkIdentity_(payload.reportUrlBase)!==reportLinkIdentity_(currentUrl)) throw new Error('Link laporan telah diperbarui dari Document Control. Muat ulang laporan sebelum menyimpan.');
    if(reportLinkPpt_({url:url},reportLinkPresentationIds_(p.id))) throw new Error('PPT hasil generate terpisah dari link laporan bulanan resmi.');
    const milestones = (payload.milestones || []).filter(function(x) { return x && x.key; });
    milestones.forEach(function(x) {
      if (x.status && MONTHLY_CONFIG.STATUS_OPTIONS.indexOf(x.status) < 0) throw new Error('Status milestone "' + x.status + '" tidak dikenal.');
    });
    const yearMonths = M.months.filter(function(x) { return x.year === m.year; });
    const rkapComplete = yearMonths.length === 12 && yearMonths.every(function(x) { return cellNumber_(M, p.id, 'RKAP', x.col) !== null; });
    let rkap = null;
    if (payload.rkap && Array.isArray(payload.rkap.values)) {
      if (Number(payload.rkap.year) !== m.year) throw new Error('RKAP harus untuk tahun ' + m.year + '.');
      if (payload.rkap.values.length !== yearMonths.length) throw new Error('RKAP ' + m.year + ' harus berisi ' + yearMonths.length + ' bulan.');
      rkap = payload.rkap.values.map(function(v, i) {
        const n = Number(v);
        if (v === '' || v === null || v === undefined || !Number.isFinite(n) || n < 0) throw new Error('RKAP ' + yearMonths[i].label + ' wajib diisi (angka, isi 0 bila tidak ada).');
        return n;
      });
    } else if (!rkapComplete) {
      throw new Error('RKAP tahun ' + m.year + ' belum lengkap. Isi RKAP 12 bulan terlebih dahulu.');
    }

    // ---------- tulis ----------
    const existing = monthHasReport_(db, p, m);
    Object.keys(values).forEach(function(item) { M.sheet.getRange(need(item), m.col + 1).setValue(values[item]); });
    const linkTable=reportLinkTable_(),linkOverrides={};linkOverrides[monthKey_(m)]={url:url};
    reportLinkProject_(db,p,user,linkTable,linkOverrides);
    const rLink = rows.LINK_LAPORAN_MONTHLY;
    if (rLink) M.sheet.getRange(rLink, m.col + 1).setValue(url);
    milestones.forEach(function(x) {
      const mm = M.months.find(function(y) { return monthKey_(y) === x.key; });
      if (!mm) return;
      if (rows.PROGRESS_MILESTONE_MONTHLY) M.sheet.getRange(rows.PROGRESS_MILESTONE_MONTHLY, mm.col + 1).setValue(String(x.status || ''));
      if (rows.KETERANGAN_MILESTONE_MONTHLY) M.sheet.getRange(rows.KETERANGAN_MILESTONE_MONTHLY, mm.col + 1).setValue(cleanText_(x.note));
    });
    if (rkap) {
      const rR = need('RKAP');
      const first = yearMonths[0].col, lastCol = yearMonths[yearMonths.length - 1].col;
      if (lastCol - first + 1 === yearMonths.length) {
        M.sheet.getRange(rR, first + 1, 1, rkap.length).setValues([rkap]);
      } else {
        yearMonths.forEach(function(x, i) { M.sheet.getRange(rR, x.col + 1).setValue(rkap[i]); });
      }
    }
    writeMonthlyFormulas_(M, rows);
    SpreadsheetApp.flush();
    monthlyLog_(db.ss, user, p, m, existing ? 'LAPORAN BULANAN (UPDATE)' : 'LAPORAN BULANAN');

    DB_CACHE_ = null;
    const db2 = loadDb_();
    const p2 = db2.allProjects.find(function(x) { return x.id === p.id; });
    const total = cellNumber_(db2.monthly, p.id, 'TOTAL_INVESTASI_AKTUAL', m.col);
    dataChanged_();
    return {
      success: true, mode: existing ? 'UPDATE' : 'BARU', project: p2.name, projectId: p.id,
      month: m.label, monthKey: monthKey_(m),
      monthTotal: total !== null ? total : values.PLANT_COST_ACTUAL + values.IDC_ACTUAL + values.PM_COST_AKTUAL,
      toDate: costToDate_(db2, p2, 'TOTAL_INVESTASI_AKTUAL', m),
      rkapYear: (function() {
        const t = db2.monthly.yearTotals.find(function(x) { return x.year === m.year; });
        return t ? cellNumber_(db2.monthly, p.id, 'RKAP', t.col) : null;
      })()
    };
  } finally {
    DB_CACHE_ = null;
    lock.releaseLock();
  }
}

// ===================== HELPER =====================

function monthlyProject_(db, user, projectId) {
  const id = normKey_(projectId);
  const p = db.allProjects.find(function(x) { return x.id === id; }) || findProject_(db.allProjects, projectId);
  if (!p || !db.monthly.projects[p.id]) throw new Error('Proyek tidak ditemukan di ' + DB_SHEETS.MONTHLY + '.');
  if (!userCanOperateProject_(user, p)) throw new Error('Akun Anda hanya dapat menginput proyek sesuai PROYEK_ID akun.');
  if (!monthlyDate_(db, p.id, 'EFEKTIF_DATE_START')) throw new Error('Proyek ' + p.name + ' belum di-setup (tanggal mulai kosong). Lengkapi lewat menu Tambah/Edit Proyek.');
  if (projectLifecycle_(db, p).stage === 'DITUTUP') throw new Error('Proyek ' + p.name + ' sudah ditutup. Laporan bulanan tidak bisa diubah.');
  return p;
}

/** Bulan yang boleh dilaporkan: dari bulan mulai proyek s.d. bulan berjalan. */
function reportMonths_(db, p) {
  const start = monthlyDate_(db, p.id, 'EFEKTIF_DATE_START');
  const today = new Date();
  const sk = start ? projectReportStartKey_(db, p) : null;
  const a = start ? (sk !== null ? sk : start.getFullYear() * 12 + start.getMonth()) : 0;
  const b = today.getFullYear() * 12 + today.getMonth();
  return db.monthly.months.filter(function(m) { const k = m.year * 12 + m.month; return k >= a && k <= b; });
}

function monthHasReport_(db, p, m) {
  return MONTHLY_CONFIG.COSTS.some(function(c) { return cellNumber_(db.monthly, p.id, c[0], m.col) !== null; });
}

function lastReportedMonth_(db, p) {
  const list = reportMonths_(db, p).filter(function(m) { return monthHasReport_(db, p, m); });
  return list.length ? list[list.length - 1] : null;
}

/** Akumulasi item biaya s.d. bulan m (termasuk), termasuk total tahun-tahun sebelum kolom bulan pertama. */
function costToDate_(db, p, item, m) {
  const M = db.monthly;
  let total = null;
  const add = function(v) { if (v !== null) total = (total || 0) + v; };
  const firstYear = M.months.length ? M.months[0].year : 0;
  M.yearTotals.forEach(function(t) { if (t.year < firstYear) add(cellNumber_(M, p.id, item, t.col)); });
  if (m) M.months.forEach(function(x) { if (x.year * 12 + x.month <= m.year * 12 + m.month) add(cellNumber_(M, p.id, item, x.col)); });
  return total;
}

function monthlyLog_(ss, user, p, m, mode) {
  let sh = ss.getSheetByName(INPUT_CONFIG.LOG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(INPUT_CONFIG.LOG_SHEET);
    sh.getRange(1, 1, 1, 8).setValues([['WAKTU', 'USERNAME', 'NAMA', 'PROYEK_ID', 'NAMA_PROYEK', 'WEEK', 'TANGGAL_REPORT', 'MODE']])
      .setFontWeight('bold').setBackground('#0F2B46').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  sh.appendRow([new Date(), user.username || '', user.name || '', p.id, p.fullName || p.name, m.label, '', mode]);
}

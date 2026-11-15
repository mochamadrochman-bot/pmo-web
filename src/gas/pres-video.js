'use strict';

/**
 * Slide video proyek di mode presentasi Executive (15 Nov 2026).
 * Sumber video: LINK_VIDEO di DATA MINGGUAN (sama dengan "Video minggu ini" di Weekly Progress).
 *
 * PRES_VIDEO_GS ditambahkan ke kode Apps Script saat dimuat (runtime.js), sehingga fungsi publik
 * getPresVideoOptions bisa dipanggil lewat google.script.run.
 */
const PRES_VIDEO_GS = `
/** Daftar video per proyek per minggu untuk slide presentasi (bukan untuk akun kontraktor). */
function getPresVideoOptions(token) {
  dbReadOnly_();
  const user = requireUser_(token);
  ktrBlock_(user);
  return perfCached_('presVid', function () {
    const db = loadDb_(), W = db.weekly, out = [];
    const weeks = Object.keys(W.weekCols || {}).map(Number).filter(function (w) { return w > 0; }).sort(function (a, b) { return b - a; });
    (db.projects || []).forEach(function (p) {
      let info = null; try { info = weeklyInfo_(db, p); } catch (e) {}
      const st = info && info.startDate;
      const list = [];
      weeks.forEach(function (w) {
        let u = ''; try { u = String(weekLink_(W, p.id, 'LINK_VIDEO', w) || '').trim(); } catch (e) {}
        if (!/^https:\\/\\//i.test(u)) return;
        let range = '';
        if (st) { const a = new Date(st.getFullYear(), st.getMonth(), st.getDate() + (w - 1) * 7), b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6); range = formatDateId_(a) + ' – ' + formatDateId_(b); }
        list.push({ week: w, range: range, url: u });
      });
      if (list.length) out.push({ id: p.id, name: p.name, videos: list });
    });
    return { success: true, projects: out };
  });
}
`;

module.exports = { PRES_VIDEO_GS };

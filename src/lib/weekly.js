'use strict';

/**
 * Perhitungan KPI mingguan, padanan dari buildWeeklyData_ di Code.js.
 *
 * Prinsipnya sama dengan aplikasi lama: nilai total dibaca apa adanya dari
 * sel KOMULATIF_REALISASI, bukan dihitung ulang dari bobot. Bobot hanya
 * dipakai untuk rincian per disiplin dan untuk pemeriksaan kewajaran.
 */

const { percentFromText, round } = require('./numbers');

const FIELDS = ['ENGINEERING', 'PROCUREMENT', 'CONSTRUCTION', 'COMMISSIONING'];

function indexValues(rows) {
  const map = new Map();
  rows.forEach(function (r) {
    const key = r.item_key + '|' + r.week_no;
    map.set(key, r.value_text);
  });
  return map;
}

function makeReader(map) {
  return function (item, week) {
    return percentFromText(map.get(item + '|' + week));
  };
}

/** Week terakhir yang terisi untuk sebuah item. */
function lastFilledWeek(map, item, maxWeek) {
  let last = 0;
  for (let w = 0; w <= maxWeek; w++) {
    if (map.has(item + '|' + w) && percentFromText(map.get(item + '|' + w)) !== null) last = w;
  }
  return last;
}

/**
 * @param rows [{item_key, week_no, value_text}]
 * @param opts {week, maxWeek}
 */
function buildWeeklyKpi(rows, opts) {
  const map = indexValues(rows);
  const pct = makeReader(map);
  const maxWeek = (opts && opts.maxWeek) || 200;

  const info = {
    latestWeek: lastFilledWeek(map, 'KOMULATIF_REALISASI', maxWeek),
    planEndWeek: lastFilledWeek(map, 'KOMULATIF_PLAN', maxWeek),
  };

  const week = (opts && opts.week) ? opts.week : info.latestWeek;

  const overall = {
    plan: pct('KOMULATIF_PLAN', week),
    actual: pct('KOMULATIF_REALISASI', week),
    deviation: pct('OVERALL_DEVIASI', week),
  };
  if (overall.deviation === null && overall.plan !== null && overall.actual !== null) {
    overall.deviation = overall.actual - overall.plan;
  }

  const fields = FIELDS.map(function (name) {
    const plan = pct(name + '_KOMULATIF_PLAN', week);
    const actual = pct(name + '_KOMULATIF_REALISASI', week);
    let deviation = pct('DEVIASI_' + name, week);
    if (deviation === null && plan !== null && actual !== null) deviation = actual - plan;
    return {
      name: name,
      bobot: pct('BOBOT_' + name, 0),
      plan: round(plan, 2),
      actual: round(actual, 2),
      deviation: round(deviation, 2),
    };
  });

  const history = [{ week: 0, plan: 0, actual: 0, deviation: 0 }];
  const end = Math.max(info.latestWeek, info.planEndWeek);
  for (let w = 1; w <= end; w++) {
    let plan = w <= info.planEndWeek ? pct('KOMULATIF_PLAN', w) : null;
    const actual = w <= info.latestWeek ? pct('KOMULATIF_REALISASI', w) : null;
    if (w === info.planEndWeek && plan !== null) plan = 100;
    history.push({
      week: w,
      plan: round(plan, 2),
      actual: round(actual, 2),
      deviation: (plan === null || actual === null) ? null : round(actual - plan, 2),
    });
  }

  // Pemeriksaan: jumlah bobot harus 100, dan total tertimbang mendekati nilai tersimpan.
  const bobotSum = fields.reduce(function (a, f) { return a + (f.bobot || 0); }, 0);
  const weighted = fields.reduce(function (a, f) {
    if (f.bobot === null || f.actual === null) return a;
    return a + f.bobot * f.actual;
  }, 0) / 100;

  return {
    week: week,
    latestWeek: info.latestWeek,
    planEndWeek: info.planEndWeek,
    hasData: info.latestWeek > 0,
    overall: {
      plan: round(overall.plan, 2),
      actual: round(overall.actual, 2),
      deviation: round(overall.deviation, 2),
    },
    fields: fields,
    history: history,
    checks: {
      bobotSum: round(bobotSum, 2),
      weightedActual: round(weighted, 3),
      storedActual: round(overall.actual, 3),
      delta: (overall.actual === null) ? null : round(weighted - overall.actual, 3),
    },
  };
}

module.exports = { buildWeeklyKpi, FIELDS };

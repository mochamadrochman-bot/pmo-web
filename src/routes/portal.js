'use strict';

const express = require('express');
const db = require('../db');
const { buildWeeklyKpi } = require('../lib/weekly');
const { renderPage } = require('../render');
const { requireUser } = require('../middleware/auth');

const router = express.Router();

/**
 * Portal: satu kartu per proyek dengan KPI minggu terakhir.
 *
 * Catatan: satu query per proyek. Untuk 7 proyek ini masih cepat, tetapi
 * nanti perlu diganti satu query agregat ketika jumlah proyek bertambah.
 */
router.get('/', requireUser, async (req, res, next) => {
  try {
    const projects = await db.query('select id, name from projects order by name');

    const cards = [];
    for (const p of projects.rows) {
      const values = await db.query(
        'select item_key, week_no, value_text from weekly_values where project_id = $1',
        [p.id]
      );
      const kpi = buildWeeklyKpi(values.rows, {});
      cards.push({
        id: p.id,
        name: p.name,
        week: kpi.week,
        hasData: kpi.hasData,
        plan: kpi.overall.plan,
        actual: kpi.overall.actual,
        deviation: kpi.overall.deviation,
        fields: kpi.fields,
        check: kpi.checks,
      });
    }

    const total = cards.length;
    const aktif = cards.filter((c) => c.hasData).length;
    const rata = cards.filter((c) => c.actual !== null);
    const avg = rata.length
      ? Math.round(rata.reduce((a, c) => a + c.actual, 0) / rata.length * 100) / 100
      : null;

    renderPage(res, 'pages/portal', {
      title: 'Portal',
      user: req.user,
      cards: cards,
      ringkasan: { total: total, aktif: aktif, rata: avg },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

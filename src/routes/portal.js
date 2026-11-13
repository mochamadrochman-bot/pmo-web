'use strict';

const express = require('express');
const db = require('../db');
const { buildWeeklyKpi, FIELDS } = require('../lib/weekly');
const { renderPage } = require('../render');
const { requireUser, requireModule, forbidden } = require('../middleware/auth');
const access = require('../lib/access');

const router = express.Router();

/**
 * Menyiapkan titik-titik grafik dari riwayat KPI.
 * Segmen dipisah ketika nilainya null, supaya garis tidak menyambung
 * melewati minggu yang belum punya data.
 */
function buildChart(history) {
  const W = 720;
  const H = 220;
  const P = 34;
  const pts = history;
  const n = pts.length;
  const x = (i) => (n <= 1 ? P : P + (i * (W - 2 * P)) / (n - 1));
  const y = (v) => H - P - (Math.max(0, Math.min(100, v)) / 100) * (H - 2 * P);

  function segments(key) {
    const out = [];
    let cur = [];
    pts.forEach(function (h, i) {
      const v = h[key];
      if (v === null || v === undefined) {
        if (cur.length > 1) out.push(cur.join(' '));
        cur = [];
      } else {
        cur.push(x(i).toFixed(1) + ',' + y(v).toFixed(1));
      }
    });
    if (cur.length > 1) out.push(cur.join(' '));
    return out;
  }

  const grid = [0, 25, 50, 75, 100].map((v) => ({ v: v, y: y(v).toFixed(1) }));
  const labels = [];
  const step = Math.max(1, Math.ceil(n / 8));
  pts.forEach(function (h, i) {
    if (i % step === 0 || i === n - 1) labels.push({ x: x(i).toFixed(1), label: h.week });
  });

  return {
    W: W, H: H, P: P,
    plan: segments('plan'),
    actual: segments('actual'),
    grid: grid,
    labels: labels,
  };
}

function textMap(rows) {
  const map = new Map();
  rows.forEach(function (r) {
    map.set(r.item_key + '|' + r.week_no, String(r.value_text || '').trim());
  });
  return map;
}

// --- Portal ---------------------------------------------------------------
// Halaman utama = Portal aplikasi lama (tampilan sama seperti Apps Script).
// Portal ringkas versi baru tetap tersedia di /portal-ringkas.
router.get('/', requireUser, (req, res) => res.redirect('/app?page=portal'));

router.get('/portal-ringkas', requireUser, async (req, res, next) => {
  try {
    const all = await db.query('select id, name from projects order by name');
    const projects = { rows: access.visibleProjects(req.user, all.rows) };
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
        actual: kpi.overall.actual,
        deviation: kpi.overall.deviation,
        fields: kpi.fields,
      });
    }

    const aktif = cards.filter((c) => c.hasData).length;
    const rata = cards.filter((c) => c.actual !== null);
    const avg = rata.length
      ? Math.round((rata.reduce((a, c) => a + c.actual, 0) / rata.length) * 100) / 100
      : null;

    renderPage(res, 'pages/portal', {
      title: 'Portal',
      user: req.user,
      cards: cards,
      canOpenDashboard: access.canUseModule(req.user, 'dashboard'),
      ringkasan: { total: cards.length, aktif: aktif, rata: avg },
    });
  } catch (err) {
    next(err);
  }
});

// --- Detail proyek --------------------------------------------------------
router.get('/proyek/:id', requireModule('dashboard'), async (req, res, next) => {
  try {
    const projectId = req.params.id;
    if (!access.canViewProject(req.user, projectId)) return forbidden(req, res);
    const proj = await db.query('select id, name from projects where id = $1', [projectId]);
    if (!proj.rows.length) {
      res.status(404);
      return renderPage(res, 'pages/error', { code: 404, message: 'Proyek tidak ditemukan.' });
    }

    const values = await db.query(
      'select item_key, week_no, value_text from weekly_values where project_id = $1',
      [projectId]
    );

    const week = req.query.week ? Number(req.query.week) : undefined;
    const kpi = buildWeeklyKpi(values.rows, week ? { week: week } : {});
    const texts = textMap(values.rows);

    const concerns = FIELDS.map(function (f) {
      return {
        field: f,
        concern: texts.get(f + '_CONCERN|' + kpi.week) || '',
        mitigation: texts.get(f + '_MITIGASI|' + kpi.week) || '',
      };
    }).filter(function (c) { return c.concern || c.mitigation; });

    renderPage(res, 'pages/proyek', {
      title: proj.rows[0].name,
      user: req.user,
      project: proj.rows[0],
      kpi: kpi,
      chart: buildChart(kpi.history),
      concerns: concerns,
      highlight: texts.get('HIGHLIGHT_ACTIVITY|' + kpi.week) || '',
      issueK3: texts.get('ISSUE_K3|' + kpi.week) || '',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

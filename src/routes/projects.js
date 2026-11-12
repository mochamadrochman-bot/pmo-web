'use strict';

const express = require('express');
const db = require('../db');
const { requireUser, forbidden } = require('../middleware/auth');
const access = require('../lib/access');

const router = express.Router();

// GET /api/projects?status=aktif
router.get('/projects', requireUser, async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : null;
    const rows = await db.query(
      `select p.id, p.name, p.status,
              count(i.id) as item_count,
              coalesce(sum(i.weight), 0) as total_weight
         from projects p
         left join items i on i.project_id = p.id
        where ($1::text is null or p.status = $1)
        group by p.id, p.name, p.status
        order by p.name`,
      [status]
    );
    res.json({ ok: true, data: access.visibleProjects(req.user, rows.rows) });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id
router.get('/projects/:id', requireUser, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!access.canViewProject(req.user, id)) return forbidden(req, res);
    const project = await db.query('select * from projects where id = $1', [id]);
    if (!project.rows.length) {
      return res.status(404).json({ ok: false, error: 'Proyek tidak ditemukan.' });
    }
    const items = await db.query(
      'select id, code, name, weight, required from items where project_id = $1 order by code',
      [id]
    );
    res.json({ ok: true, data: { ...project.rows[0], items: items.rows } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

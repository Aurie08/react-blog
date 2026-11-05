const express = require('express');
const db = require('../db');
const HttpError = require('../utils/httpError');
const wrap = require('../utils/wrap');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('admin')); // everything here is admin-only

// GET /users?search=&role=&page=&limit=  -> lets the admin UI find people to promote
router.get('/', wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const where = [];
  const params = [];
  if (req.query.search) {
    params.push(`%${String(req.query.search).replace(/[%_\\]/g, '\\$&')}%`);
    where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  if (req.query.role) {
    if (!['reader', 'author', 'admin'].includes(req.query.role)) throw new HttpError(400, 'Invalid role filter');
    params.push(req.query.role);
    where.push(`role = $${params.length}`);
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = (await db.query(`SELECT COUNT(*)::int AS n FROM users ${whereSql}`, params)).rows[0].n;
  // password_hash is never selected
  const { rows } = await db.query(
    `SELECT id, name, email, role, created_at FROM users ${whereSql}
     ORDER BY created_at DESC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]);
  res.json({ data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

// PATCH /users/:id/role : promote/demote (reader | author | admin)
router.patch('/:id/role', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body;
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Invalid id');
  if (!['reader', 'author', 'admin'].includes(role)) throw new HttpError(400, 'Invalid role');
  // Stops the last admin demoting themselves and locking everyone out.
  if (id === req.user.id) throw new HttpError(400, 'You cannot change your own role');
  const { rows } = await db.query(
    'UPDATE users SET role=$1 WHERE id=$2 RETURNING id,name,email,role', [role, id]);
  if (!rows[0]) throw new HttpError(404, 'User not found');
  res.json({ user: rows[0] });
}));

module.exports = router;

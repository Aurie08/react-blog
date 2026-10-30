const express = require('express');
const db = require('../db');
const HttpError = require('../utils/httpError');
const wrap = require('../utils/wrap');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Admin-only: promote/demote users (the spec has no other way to become an Author).
router.patch('/:id/role', authenticate, requireRole('admin'), wrap(async (req, res) => {
  const { role } = req.body;
  if (!['reader', 'author', 'admin'].includes(role)) throw new HttpError(400, 'Invalid role');
  const { rows } = await db.query(
    'UPDATE users SET role=$1 WHERE id=$2 RETURNING id,name,email,role', [role, Number(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'User not found');
  res.json({ user: rows[0] });
}));

module.exports = router;

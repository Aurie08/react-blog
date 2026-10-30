const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const HttpError = require('../utils/httpError');
const wrap = require('../utils/wrap');
const { cleanText } = require('../utils/sanitize');
const { authenticate } = require('../middleware/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Compared against when the email is unknown, so response time doesn't reveal valid emails.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', config.bcryptRounds);

const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

module.exports = (loginLimiter) => {
  const router = express.Router();

  router.post('/register', wrap(async (req, res) => {
    const name = cleanText(req.body.name);
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const errors = {};
    if (name.length < 2 || name.length > 100) errors.name = 'Name must be 2-100 characters';
    if (!EMAIL_RE.test(email)) errors.email = 'Valid email required';
    if (password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (Object.keys(errors).length) throw new HttpError(400, 'Validation failed', errors);

    const hash = await bcrypt.hash(password, config.bcryptRounds);
    // Role is NEVER taken from the request body -> default 'reader' (no privilege escalation).
    const { rows } = await db.query(
      `INSERT INTO users(name,email,password_hash) VALUES ($1,$2,$3)
       RETURNING id,name,email,role`, [name, email, hash]);
    res.status(201).json({ user: rows[0], token: signToken(rows[0]) });
  }));

  router.post('/login', loginLimiter, wrap(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const { rows } = await db.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = rows[0];
    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) throw new HttpError(401, 'Invalid email or password');
    res.json({ user: publicUser(user), token: signToken(user) });
  }));

  router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

  return router;
};

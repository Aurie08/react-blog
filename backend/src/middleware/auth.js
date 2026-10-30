const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const HttpError = require('../utils/httpError');

async function loadUser(req, required) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    if (required) throw new HttpError(401, 'Authentication required');
    return;
  }
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret); // checks signature + expiry
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
  // Re-read the user so role changes / deleted accounts take effect immediately.
  const { rows } = await db.query('SELECT id, name, email, role FROM users WHERE id=$1', [payload.sub]);
  if (!rows[0]) throw new HttpError(401, 'User no longer exists');
  req.user = rows[0];
}

const authenticate = (req, res, next) => loadUser(req, true).then(() => next(), next);
const optionalAuth = (req, res, next) => loadUser(req, false).then(() => next(), next);

// RBAC: requireRole('author','admin')
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new HttpError(401, 'Authentication required'));
  if (!roles.includes(req.user.role)) return next(new HttpError(403, 'Insufficient permissions'));
  next();
};

module.exports = { authenticate, optionalAuth, requireRole };

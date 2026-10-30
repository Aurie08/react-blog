const rateLimit = require('express-rate-limit');

// Fixed window per client IP. Exceeding the max returns 429 until the window resets.
const loginLimiter = (max = 5) => rateLimit({
  windowMs: 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in a minute.' },
});

const generalLimiter = (max = 300) => rateLimit({
  windowMs: 60 * 1000, max, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Slow down.' },
});

module.exports = { loginLimiter, generalLimiter };

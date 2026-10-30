const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { loginLimiter, generalLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp({ loginMax = 5, generalMax = 300 } = {}) {
  const app = express();
  app.set('trust proxy', 1); // behind Render/Railway proxy -> correct client IP for rate limiting
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // allow frontend <img>
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
  app.use('/api', generalLimiter(generalMax));

  app.get('/api/v1/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/v1/auth', require('./routes/auth')(loginLimiter(loginMax)));
  app.use('/api/v1/users', require('./routes/users'));
  app.use('/api/v1/posts', require('./routes/posts'));
  app.use('/api/v1/author', require('./routes/author'));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;

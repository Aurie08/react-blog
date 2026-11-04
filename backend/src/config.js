require('dotenv').config();

const config = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: process.env.DATABASE_SSL === 'true',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
 corsOrigin: (() => {
  const value = process.env.CORS_ORIGIN || '*';

  if (value === '*') return '*';

  return value.split(',').map(origin => origin.trim());
})(),
  bcryptRounds: 10,
};

if (!config.jwtSecret) throw new Error('JWT_SECRET is not set');
if (!config.databaseUrl) throw new Error('DATABASE_URL is not set');

module.exports = config;

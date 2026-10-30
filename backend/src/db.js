const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
});

// Always parameterised queries ($1, $2...) -> no SQL injection.
module.exports = { pool, query: (text, params) => pool.query(text, params) };

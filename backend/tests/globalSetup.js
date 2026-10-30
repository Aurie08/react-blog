module.exports = async () => {
  require('./setupEnv');
  const migrate = require('../scripts/migrate');
  await migrate();
  await require('../src/db').pool.end();
};

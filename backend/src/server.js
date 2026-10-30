const createApp = require('./app');
const config = require('./config');

createApp().listen(config.port, () => console.log(`API listening on :${config.port}`));

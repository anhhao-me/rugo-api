const { MongoMemoryServer } = require('mongodb-memory-server');
const config = require('./config');
const mongoServer = new MongoMemoryServer();

(async () => {
  config.database = await mongoServer.getUri();
  await require('./index')();
})();
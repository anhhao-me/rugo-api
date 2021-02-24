const config = require('./config');
const Server = require('./src/server');
const Api = require('./src/api');
const { curry } = require('ramda');
const { clone } = require('./src/utils');
const auth = require('./src/auth');
const jwt = require('jsonwebtoken');

const { Driver: MongoDBDriver, Model: MongoDBModel } = require('rugo-mongodb');

module.exports = async () => {
  // database
  const db = await MongoDBDriver(config.database);
  const Models = {
    mongodb: curry(MongoDBModel)(db)
  };

  // server
  const server = Server(config.port);

  // authentication
  server.router.post('/authentication', async ctx => {
    const { email, password } = ctx.request.body;

    if (!email || !password)
      return ctx.forbidden('Email and Password must not be empty');

    if (config.admin.email === email && config.admin.password === password){
      ctx.body = {
        token: jwt.sign({
          email: config.admin.email
        }, config.jwt, {
          expiresIn: '30d'
        })
      };
      return;
    }

    return ctx.forbidden('Wrong email or password');
  });

  // api
  server.router.use('/:modelId', async (ctx, next) => {
    const { modelId } = ctx.params;
    let modelSchema = config.models[modelId];

    if (!modelSchema)
      return ctx.notFound();

    ctx.schema = modelSchema;
    modelSchema = clone(modelSchema);

    // get type
    const modelType = modelSchema.__type || 'mongodb';

    // remove __<name> in schema
    for (let key in modelSchema){
      if (key.indexOf('__') === 0)
        delete modelSchema[key];
    }

    // assign model handle
    ctx.model = Models[modelType](modelId, modelSchema);

    // authentication
    const { 'x-api-key': apiKey, 'authorization': authToken } = ctx.headers;

    if (config.admin.apiKey === apiKey)
      ctx.user = config.admin;
    else {
      const rel = await auth.verify(authToken, config.jwt);
      if (rel && rel.email === config.admin.email){
        ctx.user = config.admin
      }
    }

    // permission
    ctx.permission = function(){
      return this.user && this.user.email === config.admin.email;
    }

    await next();
  }, Api);

  const listener = await server.listen();

  return {
    db, server, listener
  };
};
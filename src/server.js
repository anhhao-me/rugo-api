const Koa = require('koa');
const logger = require('./logger');
const Router = require('@koa/router');
const koaBody = require('koa-body');
const cors = require('@koa/cors');

module.exports = port => {
  const app = new Koa();

  app.use(async (ctx, next) => {
    // useful methods
    ctx.notFound = function(){
      ctx.status = 404;
      ctx.body = {
        error: 'not found'
      }
    }

    ctx.forbidden = function(error){
      ctx.status = 403;
      ctx.body = {
        error
      }
    }

    // logging
    const ltime = new Date();
    await next();
    logger(`${ctx.method} ${decodeURIComponent(ctx.url)} - ${ctx.status} - ${(new Date()) - ltime}ms`);
  });

  require('koa-qs')(app);

  const router = Router();

  app.use(cors());
  app.use(koaBody({ multipart: true }));
  app.use(router.routes());

  return {
    app,
    router,
    async listen(){
      this.listener = app.listen(port, () => {
        logger(`Server is running at port ${port}`)
      });
      return this.listener;
    }
  }
}
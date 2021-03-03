const Router = require('@koa/router');
const router = new Router();

const authorization = action => async (ctx, next) => {
  const schema = ctx.schema;
  if (schema.__everyone && schema.__everyone[action]){
    await next();
    return;
  }

  if (!ctx.user || !ctx.permission(action))
    return ctx.forbidden('You are no allow to access');

  await next();
}

router.use('/', async (ctx, next) => {
  try {
    await next();
  } catch(err){
    ctx.status = 500;
    ctx.body = {
      error: err.message
    }
  }
})

router.get('/:id', authorization('get'), async ctx => {
  const { id } = ctx.params;
  const doc = await ctx.model.get(id);
  if (doc === null){
    ctx.status = 404;
    ctx.body = {
      error: 'not found'
    }
    return;
  }

  ctx.body = doc;
});

router.get('/', authorization('list'), async ctx => {
  const { query } = ctx;

  if (query.$sort)
    for (let key in query.$sort)
      query.$sort[key] = parseInt(query.$sort[key]);

  if (query.$limit)
    query.$limit = parseInt(query.$limit);

  if (query.$skip)
    query.$skip = parseInt(query.$skip);
      
  const res = await ctx.model.list(query);
  ctx.body = res;
});

router.post('/', authorization('create'), async ctx => {
  const form = ctx.request.body;
  ctx.body = await ctx.model.create(form);
});

router.patch('/:id', authorization('patch'), async ctx => {
  const { id } = ctx.params;
  const form = ctx.request.body;
  const lastDoc = await ctx.model.get(id);
  if (!lastDoc)
    return ctx.notFound();

  ctx.body = await ctx.model.patch(id, form);
});

router.delete('/:id', authorization('remove'), async ctx => {
  const { id } = ctx.params;
  const lastDoc = await ctx.model.get(id);
  if (!lastDoc)
    return ctx.notFound();
  ctx.body = await ctx.model.remove(id);
});

module.exports = router.routes();
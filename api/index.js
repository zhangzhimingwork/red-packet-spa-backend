// Vercel Serverless Function 入口
const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const authRoutes = require('../src/routes/auth');

const app = new Koa();
const router = new Router();

// 中间件
app.use(cors());
app.use(bodyParser());

// 挂载认证路由
app.use(authRoutes.routes()).use(authRoutes.allowedMethods());

// 健康检查
router.get('/health', async (ctx) => {
  ctx.body = { status: 'ok', timestamp: Date.now() };
});

app.use(router.routes()).use(router.allowedMethods());

// Vercel 导出
module.exports = app.callback();

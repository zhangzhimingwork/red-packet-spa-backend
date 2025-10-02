const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const authRoutes = require('./routes/auth');
const nonceStore = require('./store/nonceStore');

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 后端服务运行在 http://localhost:${PORT}`);
});

// 导出nonceStore供认证路由使用
module.exports = { app };
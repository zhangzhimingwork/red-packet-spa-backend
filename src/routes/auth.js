const Router = require('@koa/router');
const { verifyMessage } = require('viem');
const jwt = require('jsonwebtoken');
const { generateNonce } = require('../utils/crypto');
const { createSignatureMessage } = require('../utils/message');
const nonceStore = require('../store/nonceStore');

const router = new Router();

/**
 * 生成签名消息接口
 * POST /api/auth/nonce
 */
router.post('/api/auth/nonce', async (ctx) => {
  try {
    const { address } = ctx.request.body;

    // 验证地址格式
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      ctx.status = 400;
      ctx.body = { error: '无效的钱包地址' };
      return;
    }

    // 生成随机nonce
    const nonce = generateNonce();
    const timestamp = Date.now();
    const expiresAt = timestamp + 5 * 60 * 1000; // 5分钟过期

    const normalizedAddress = address.toLowerCase();

    // 存储nonce
    nonceStore.set(normalizedAddress, { nonce, expiresAt });

    // 清理过期的nonce
    cleanExpiredNonces();

    // 生成签名消息
    const message = createSignatureMessage({
      address,
      nonce,
      timestamp,
      expiresAt,
      domain: process.env.DOMAIN || 'localhost:3000',
    });

    ctx.body = {
      message,
      nonce,
      timestamp,
      expiresAt,
    };
  } catch (error) {
    console.error('生成nonce失败:', error);
    ctx.status = 500;
    ctx.body = { error: '服务器错误' };
  }
});

/**
 * 验证签名接口
 * POST /api/auth/verify
 */
router.post('/api/auth/verify', async (ctx) => {
  try {
    const { address, signature, message } = ctx.request.body;

    // 验证必需参数
    if (!address || !signature || !message) {
      ctx.status = 400;
      ctx.body = { error: '缺少必需参数' };
      return;
    }

    // 验证地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      ctx.status = 400;
      ctx.body = { error: '无效的钱包地址' };
      return;
    }

    // 验证签名格式
    if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) {
      ctx.status = 400;
      ctx.body = { error: '无效的签名格式' };
      return;
    }

    const normalizedAddress = address.toLowerCase();

    // 检查nonce是否存在
    const storedData = nonceStore.get(normalizedAddress);
    if (!storedData) {
      ctx.status = 401;
      ctx.body = { error: '未找到nonce，请先请求签名消息' };
      return;
    }

    // 检查nonce是否过期
    if (Date.now() > storedData.expiresAt) {
      nonceStore.delete(normalizedAddress);
      ctx.status = 401;
      ctx.body = { error: '签名已过期，请重新请求' };
      return;
    }

    // 验证消息中是否包含nonce
    if (!message.includes(storedData.nonce)) {
      ctx.status = 401;
      ctx.body = { error: '消息验证失败：nonce不匹配' };
      return;
    }

    // 使用viem验证签名
    const isValid = await verifyMessage({
      address: address,
      message: message,
      signature: signature,
    });

    if (!isValid) {
      ctx.status = 401;
      ctx.body = { error: '签名验证失败' };
      return;
    }

    // 签名验证成功，删除已使用的nonce
    nonceStore.delete(normalizedAddress);

    // 生成JWT Token
    const token = jwt.sign(
      {
        address: normalizedAddress,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET || 'your-secret-key',
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      }
    );

    ctx.body = {
      success: true,
      token,
      address: normalizedAddress,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    };
  } catch (error) {
    console.error('验证签名失败:', error);
    ctx.status = 500;
    ctx.body = { error: '服务器错误' };
  }
});

/**
 * 验证JWT Token的中间件
 */
async function authMiddleware(ctx, next) {
  try {
    const authHeader = ctx.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ctx.status = 401;
      ctx.body = { error: '未授权：缺少Token' };
      return;
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );

    // 将用户信息添加到上下文
    ctx.state.user = decoded;
    
    await next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      ctx.status = 401;
      ctx.body = { error: '无效的Token' };
    } else if (error instanceof jwt.TokenExpiredError) {
      ctx.status = 401;
      ctx.body = { error: 'Token已过期' };
    } else {
      ctx.status = 500;
      ctx.body = { error: '服务器错误' };
    }
  }
}

/**
 * 测试受保护的路由
 * GET /api/auth/me
 */
router.get('/api/auth/me', authMiddleware, async (ctx) => {
  ctx.body = {
    address: ctx.state.user.address,
    message: '身份验证成功',
  };
});

// 清理过期nonce
function cleanExpiredNonces() {
  const now = Date.now();
  for (const [address, data] of nonceStore.entries()) {
    if (data.expiresAt < now) {
      nonceStore.delete(address);
    }
  }
}

module.exports = router;
# Red Packet SPA Backend - Cloudflare Workers 版本

这是一个部署在 Cloudflare Workers 上的钱包签名认证后端服务。

## 功能特性

- ✅ Web3 钱包签名认证（使用 viem）
- ✅ JWT Token 生成和验证
- ✅ EIP-4361 (Sign-In with Ethereum) 标准
- ✅ CORS 支持
- ✅ Nonce 防重放攻击

## API 端点

### 1. 健康检查
```
GET /health
```

### 2. 获取签名消息
```
POST /api/auth/nonce
Content-Type: application/json

{
  "address": "0x..."
}
```

### 3. 验证签名
```
POST /api/auth/verify
Content-Type: application/json

{
  "address": "0x...",
  "signature": "0x...",
  "message": "..."
}
```

### 4. 验证 Token
```
GET /api/auth/me
Authorization: Bearer <token>
```

## 部署到 Cloudflare Workers

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量

编辑 `wrangler.toml` 文件，设置以下变量：
- `JWT_SECRET`: JWT 密钥（生产环境必须更改）
- `JWT_EXPIRES_IN`: Token 过期时间
- `DOMAIN`: 你的域名

### 3. 本地开发
```bash
npm run dev
```

### 4. 部署到生产环境
```bash
npm run deploy
```

## 环境变量

在 Cloudflare Workers 控制台中设置以下环境变量：

- `JWT_SECRET`: JWT 签名密钥（必须设置为强密码）
- `JWT_EXPIRES_IN`: Token 过期时间（默认 7d）
- `DOMAIN`: 你的应用域名

## 注意事项

1. **生产环境安全**：请务必在生产环境中更改 `JWT_SECRET`
2. **Nonce 存储**：当前使用内存存储，重启会丢失。生产环境建议使用 Cloudflare KV 或 Durable Objects
3. **跨域配置**：当前允许所有来源，生产环境应限制特定域名

## 从 Koa 迁移说明

主要变更：
- 使用原生 Fetch API 替代 Koa
- 使用 Web Crypto API 替代 Node.js crypto
- 使用 ES Modules
- 移除了 Koa 相关依赖

## 技术栈

- Cloudflare Workers
- Viem (以太坊签名验证)
- JSON Web Token
- Web Crypto API

## License

MIT

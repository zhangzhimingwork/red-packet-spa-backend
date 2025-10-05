# MetaMask 签名警告问题修复指南

## 问题描述

当使用 MetaMask 进行签名时，会出现警告：
> "提出请求的网站不是您正在登录的网站。这可能试图窃取您的登录凭据。"

## 问题原因

这个警告是由于使用了 **EIP-4361 (Sign-In with Ethereum)** 标准消息格式，但消息中的 `domain` 字段与实际发起请求的网站不匹配。

**MetaMask 的安全检查：**
- 检查消息中的 domain（如 `localhost:3000`）
- 检查实际发起请求的网站 origin（如 `http://localhost:3000`）
- 如果不匹配，显示警告以防止钓鱼攻击

## 解决方案

已提供两种解决方案：

### 方案 1：使用前端 Origin 作为 Domain（已实现）✅

**优点：**
- 保持 EIP-4361 标准兼容
- 自动适配不同环境（localhost、测试、生产）
- 安全性最高

**实现：**
后端从请求头中获取 `Origin`，并将其用作消息中的 domain：

```javascript
// src/routes/auth.js
const origin = ctx.request.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000';
const domain = origin.replace(/^https?:\/\//, '');
```

**部署配置：**
确保 CORS 配置允许前端 origin：
```javascript
// api/index.js
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));
```

### 方案 2：使用简化消息格式（备选）

**优点：**
- 完全避免 MetaMask 警告
- 消息更简洁易读
- 实现简单

**缺点：**
- 不符合 EIP-4361 标准
- 某些第三方工具可能不识别

**使用方法：**
在 `src/utils/message.js` 中注释掉当前的简化格式，取消注释 EIP-4361 格式即可切换。

## 测试步骤

1. **启动后端：**
   ```bash
   cd red-packet-spa-backend
   npm install
   npm run dev
   ```

2. **启动前端：**
   ```bash
   cd red-packet-spa-web
   npm install
   npm run dev
   ```

3. **测试签名：**
   - 打开浏览器访问 `http://localhost:3000`
   - 连接 MetaMask 钱包
   - 点击登录/签名按钮
   - **预期结果：**MetaMask 不再显示警告

## 环境变量配置

### 开发环境 (.env.development)
```env
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-dev-secret-key
JWT_EXPIRES_IN=7d
```

### 生产环境 (.env.production)
```env
FRONTEND_URL=https://your-domain.com
JWT_SECRET=your-production-secret-key
JWT_EXPIRES_IN=7d
```

## 安全建议

1. **生产环境必须配置：**
   - ✅ 正确的 `FRONTEND_URL`
   - ✅ 强密码 `JWT_SECRET`
   - ✅ 严格的 CORS 策略

2. **验证流程：**
   - ✅ 检查 nonce 是否存在
   - ✅ 检查 nonce 是否过期
   - ✅ 检查 domain 是否匹配
   - ✅ 验证签名有效性

3. **Token 管理：**
   - ✅ 使用 HTTP-only cookies（可选，更安全）
   - ✅ 实现 token 刷新机制
   - ✅ 退出登录时清除 token

## 常见问题

### Q1: 为什么 MetaMask 会检查 domain？
**A:** 这是 MetaMask 的安全功能，防止钓鱼网站冒充合法网站骗取用户签名。

### Q2: 我应该使用哪种方案？
**A:** 
- 推荐**方案 1**（使用 Origin）：如果你需要 EIP-4361 标准兼容
- 使用**方案 2**（简化格式）：如果你只是需要简单的身份验证

### Q3: 如何在生产环境中使用？
**A:** 确保设置正确的环境变量：
```bash
# Vercel/Cloudflare Workers
FRONTEND_URL=https://your-production-domain.com
```

### Q4: 多个前端域名怎么办？
**A:** 可以支持多个 origin：
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://app.yourdomain.com',
  'https://www.yourdomain.com'
];

app.use(cors({
  origin: function (ctx) {
    const origin = ctx.request.headers.origin;
    if (allowedOrigins.includes(origin)) {
      return origin;
    }
    return allowedOrigins[0];
  }
}));
```

## 更新日志

- **2025-10-05**: 修复 MetaMask 签名警告问题
  - 实现从请求头获取 origin 作为 domain
  - 提供简化消息格式作为备选方案
  - 添加 domain 验证逻辑

## 相关资源

- [EIP-4361: Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361)
- [MetaMask 签名最佳实践](https://docs.metamask.io/guide/signing-data.html)
- [viem 文档](https://viem.sh/docs/actions/public/verifyMessage.html)

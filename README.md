# Red Packet SPA Backend

## 部署说明

### Vercel 部署 (推荐)

1. 安装 Vercel CLI:
```bash
npm i -g vercel
```

2. 部署:
```bash
vercel
```

### 本地开发

```bash
npm install
npm run dev
```

服务将运行在 http://localhost:3001

## API 端点

- `GET /health` - 健康检查
- `POST /auth/nonce` - 获取 nonce
- `POST /auth/verify` - 验证签名

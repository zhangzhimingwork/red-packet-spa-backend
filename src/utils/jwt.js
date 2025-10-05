/**
 * JWT 工具类 - Cloudflare Workers 版本
 * 使用 Web Crypto API 实现 JWT 签名和验证
 */

// Base64 URL 编码
function base64UrlEncode(data) {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Base64 URL 解码
function base64UrlDecode(str) {
  // 添加回填充符号
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// 字符串转 ArrayBuffer
function str2ab(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// ArrayBuffer 转字符串
function ab2str(buffer) {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

// 生成密钥
async function getKey(secret) {
  const keyData = str2ab(secret);
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * 签名 JWT
 * @param {Object} payload - JWT payload
 * @param {string} secret - 密钥
 * @param {Object} options - 选项 { expiresIn: '7d' }
 * @returns {Promise<string>} JWT token
 */
export async function sign(payload, secret, options = {}) {
  // 处理过期时间
  let exp;
  if (options.expiresIn) {
    const now = Math.floor(Date.now() / 1000);
    const match = options.expiresIn.match(/^(\d+)([smhd])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
      exp = now + value * multipliers[unit];
    }
  }

  // 创建 header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // 创建 payload
  const finalPayload = {
    ...payload,
    ...(exp && { exp })
  };

  // 编码 header 和 payload
  const encodedHeader = base64UrlEncode(str2ab(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(str2ab(JSON.stringify(finalPayload)));

  // 创建签名
  const message = `${encodedHeader}.${encodedPayload}`;
  const key = await getKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    str2ab(message)
  );

  const encodedSignature = base64UrlEncode(signature);

  return `${message}.${encodedSignature}`;
}

/**
 * 验证 JWT
 * @param {string} token - JWT token
 * @param {string} secret - 密钥
 * @returns {Promise<Object>} 解码的 payload
 * @throws {Error} 验证失败时抛出错误
 */
export async function verify(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  // 验证签名
  const message = `${encodedHeader}.${encodedPayload}`;
  const key = await getKey(secret);
  
  const signature = base64UrlDecode(encodedSignature);
  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    str2ab(message)
  );

  if (!isValid) {
    throw new Error('Invalid signature');
  }

  // 解码 payload
  const payloadBuffer = base64UrlDecode(encodedPayload);
  const payloadStr = ab2str(payloadBuffer);
  const payload = JSON.parse(payloadStr);

  // 检查过期时间
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error('Token expired');
  }

  return payload;
}

/**
 * JWT 错误类
 */
export class JsonWebTokenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'JsonWebTokenError';
  }
}

export class TokenExpiredError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

// 为了兼容性，提供默认导出
export default { sign, verify, JsonWebTokenError, TokenExpiredError };

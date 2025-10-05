/**
 * 生成随机 nonce (Cloudflare Workers 版本)
 * 使用 Web Crypto API
 */
export function generateNonce() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

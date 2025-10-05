/**
 * 创建 EIP-4361 标准的签名消息
 */
export function createSignatureMessage(params) {
  const { address, nonce, timestamp, expiresAt, domain } = params;
  
  const issuedAt = new Date(timestamp).toISOString();
  const expirationTime = new Date(expiresAt).toISOString();

  // EIP-4361 (Sign-In with Ethereum) 标准消息格式
  return `${domain} wants you to sign in with your Ethereum account:
${address}

Welcome to our DApp! Please sign this message to verify your identity.

URI: https://${domain}
Version: 1
Chain ID: 1
Nonce: ${nonce}
Issued At: ${issuedAt}
Expiration Time: ${expirationTime}`;
}

/**
 * 创建签名消息
 * 方案1: EIP-4361 标准格式 (推荐，但需要确保 domain 匹配)
 * 方案2: 简单格式 (避免 MetaMask 警告)
 */
export function createSignatureMessage(params) {
  const { address, nonce, timestamp, expiresAt, domain } = params;
  
  // 方案2: 简单格式 - 不会触发 MetaMask 警告
  // 推荐：如果你不需要严格遵循 EIP-4361 标准
  const issuedAt = new Date(timestamp).toISOString();
  const expirationTime = new Date(expiresAt).toISOString();
  
  return `Welcome to our DApp!

Please sign this message to verify your identity.

Address: ${address}
Nonce: ${nonce}
Issued At: ${issuedAt}
Expiration Time: ${expirationTime}

This request will not trigger a blockchain transaction or cost any gas fees.`;

  // 方案1: EIP-4361 标准格式 (如果 domain 匹配则使用此格式)
  /*
  const issuedAt = new Date(timestamp).toISOString();
  const expirationTime = new Date(expiresAt).toISOString();

  return `${domain} wants you to sign in with your Ethereum account:
${address}

Welcome to our DApp! Please sign this message to verify your identity.

URI: https://${domain}
Version: 1
Chain ID: 1
Nonce: ${nonce}
Issued At: ${issuedAt}
Expiration Time: ${expirationTime}`;
  */
}

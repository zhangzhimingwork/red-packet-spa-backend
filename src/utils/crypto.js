const crypto = require('crypto');

/**
 * 生成随机nonce
 */
function generateNonce() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { generateNonce };
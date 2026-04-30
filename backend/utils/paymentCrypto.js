const crypto = require('crypto');

function normalizeKey(rawKey) {
  if (!rawKey) return '';
  return String(rawKey).replace(/\\n/g, '\n').trim();
}

function randomString(length = 32) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

function signWithRsaSha256(content, privateKey) {
  const key = normalizeKey(privateKey);
  if (!key) {
    throw new Error('PAYMENT_PRIVATE_KEY_MISSING');
  }

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(content, 'utf8');
  signer.end();
  return signer.sign(key, 'base64');
}

function verifyWithRsaSha256(content, signature, publicKey) {
  const key = normalizeKey(publicKey);
  if (!key || !signature) {
    return false;
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(content, 'utf8');
  verifier.end();
  return verifier.verify(key, signature, 'base64');
}

function buildWechatAuthorization({
  method,
  requestPath,
  body = '',
  mchid,
  serialNo,
  privateKey
}) {
  const nonce = randomString(32);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signText = `${method.toUpperCase()}\n${requestPath}\n${timestamp}\n${nonce}\n${body}\n`;
  const signature = signWithRsaSha256(signText, privateKey);

  const value = [
    'WECHATPAY2-SHA256-RSA2048',
    `mchid="${mchid}"`,
    `serial_no="${serialNo}"`,
    `nonce_str="${nonce}"`,
    `timestamp="${timestamp}"`,
    `signature="${signature}"`
  ].join(',');

  return value;
}

function verifyWechatSignature({
  timestamp,
  nonce,
  body,
  signature,
  publicKey
}) {
  const verifyText = `${timestamp}\n${nonce}\n${body}\n`;
  return verifyWithRsaSha256(verifyText, signature, publicKey);
}

function decryptWechatResource({
  ciphertext,
  nonce,
  associatedData = '',
  apiV3Key
}) {
  const key = Buffer.from(String(apiV3Key), 'utf8');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'utf8'));
  decipher.setAAD(Buffer.from(associatedData, 'utf8'));

  const raw = Buffer.from(ciphertext, 'base64');
  const authTag = raw.subarray(raw.length - 16);
  const encrypted = raw.subarray(0, raw.length - 16);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = {
  normalizeKey,
  randomString,
  signWithRsaSha256,
  verifyWithRsaSha256,
  buildWechatAuthorization,
  verifyWechatSignature,
  decryptWechatResource
};


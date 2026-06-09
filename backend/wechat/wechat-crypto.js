/**
 * 企业微信加解密模块
 * 基于企业微信官方规范实现 AES-256-CBC 加解密
 */
const crypto = require('crypto');

/**
 * 验证消息签名
 * @param {string} token - 企业微信的Token
 * @param {string} timestamp - 时间戳
 * @param {string} nonce - 随机数
 * @param {string} encrypted - 加密消息
 * @returns {boolean}
 */
function verifySignature(token, timestamp, nonce, encrypted) {
  const arr = [token, timestamp, nonce, encrypted].sort();
  const sha1 = crypto.createHash('sha1').update(arr.join('')).digest('hex');
  return sha1 === encrypted;
}

/**
 * 生成签名
 * @param {string} token
 * @param {string} timestamp
 * @param {string} nonce
 * @param {string} encrypted
 * @returns {string}
 */
function generateSignature(token, timestamp, nonce, encrypted) {
  const arr = [token, timestamp, nonce, encrypted].sort();
  return crypto.createHash('sha1').update(arr.join('')).digest('hex');
}

/**
 * PKCS7 解码
 */
function pkcs7Decode(buf) {
  const pad = buf[buf.length - 1];
  if (pad < 1 || pad > 32) pad = 0;
  return buf.slice(0, buf.length - pad);
}

/**
 * PKCS7 编码
 */
function pkcs7Encode(buf) {
  const blockSize = 32;
  const pad = blockSize - (buf.length % blockSize);
  const padding = Buffer.alloc(pad, pad);
  return Buffer.concat([buf, padding]);
}

/**
 * 解密企业微信消息
 * @param {string} encrypted - Base64编码的密文
 * @param {string} encodingAESKey - 43位EncodingAESKey
 * @param {string} corpId - 企业微信CorpID
 * @returns {{ message: string, corpId: string }}
 */
function decryptMessage(encrypted, encodingAESKey, corpId) {
  // AESKey = Base64Decode(EncodingAESKey + "=")
  const aesKey = Buffer.from(encodingAESKey + '=', 'base64');
  const iv = aesKey.slice(0, 16);

  const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
  decipher.setAutoPadding(false);

  const encryptedBuf = Buffer.from(encrypted, 'base64');
  let decrypted = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);

  // 去除PKCS7填充
  decrypted = pkcs7Decode(decrypted);

  // 提取: Random(16 bytes) + Length(4 bytes, network byte order) + Message + CorpID
  const msgLen = decrypted.readUInt32BE(16);
  const message = decrypted.slice(20, 20 + msgLen).toString('utf-8');
  const receivedCorpId = decrypted.slice(20 + msgLen).toString('utf-8');

  if (receivedCorpId !== corpId) {
    throw new Error('CorpID不匹配');
  }

  return { message, corpId: receivedCorpId };
}

/**
 * 加密回复消息
 * @param {string} message - 明文消息
 * @param {string} encodingAESKey - 43位EncodingAESKey
 * @param {string} corpId - 企业微信CorpID
 * @returns {string} Base64密文
 */
function encryptMessage(message, encodingAESKey, corpId) {
  const aesKey = Buffer.from(encodingAESKey + '=', 'base64');
  const iv = aesKey.slice(0, 16);

  // Random(16) + Length(4) + Message + CorpID
  const randomBytes = crypto.randomBytes(16);
  const msgBuf = Buffer.from(message, 'utf-8');
  const corpBuf = Buffer.from(corpId, 'utf-8');
  const msgLenBuf = Buffer.alloc(4);
  msgLenBuf.writeUInt32BE(msgBuf.length, 0);

  const plainBuf = Buffer.concat([randomBytes, msgLenBuf, msgBuf, corpBuf]);
  const padded = pkcs7Encode(plainBuf);

  const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
  cipher.setAutoPadding(false);
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final()]);

  return encrypted.toString('base64');
}

/**
 * 构建回复XML
 * @param {string} encrypted - Base64密文
 * @param {string} signature - 签名
 * @param {string} timestamp - 时间戳
 * @param {string} nonce - 随机数
 * @returns {string}
 */
function buildReplyXml(encrypted, signature, timestamp, nonce) {
  return `<xml>
<Encrypt><![CDATA[${encrypted}]]></Encrypt>
<MsgSignature><![CDATA[${signature}]]></MsgSignature>
<TimeStamp>${timestamp}</TimeStamp>
<Nonce><![CDATA[${nonce}]]></Nonce>
</xml>`;
}

module.exports = {
  verifySignature,
  generateSignature,
  decryptMessage,
  encryptMessage,
  buildReplyXml,
};

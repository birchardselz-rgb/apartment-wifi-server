/**
 * 企业微信消息处理器
 * 接收客户微信消息 → AI处理 → 自动回复
 */
const https = require('https');
const http = require('http');
const url = require('url');
const { decryptMessage } = require('./wechat-crypto');

const AI_API_URL = process.env.AI_API_URL || 'http://localhost:3002';
const AI_TARGET = new URL(AI_API_URL);

// Token缓存
let tokenCache = { accessToken: '', expiresAt: 0 };

/**
 * 获取企业微信Access Token
 */
async function getAccessToken(corpId, corpSecret) {
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  const apiUrl = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${corpSecret}`;

  return new Promise((resolve, reject) => {
    https.get(apiUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.errcode === 0) {
            tokenCache = {
              accessToken: json.access_token,
              expiresAt: Date.now() + (json.expires_in - 60) * 1000, // 提前1分钟过期
            };
            resolve(json.access_token);
          } else {
            reject(new Error(`获取token失败: ${json.errmsg}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * 通过企业微信API发送消息
 */
function sendWeChatMessage(accessToken, msgData) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(msgData);
    const apiUrl = new URL(`https://qyapi.weixin.qq.com/cgi-bin/externalcontact/message/send?access_token=${accessToken}`);

    const options = {
      hostname: apiUrl.hostname,
      path: apiUrl.pathname + apiUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.errcode === 0) resolve(json);
          else reject(new Error(`发送消息失败: ${json.errmsg}`));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * 调用AI后端处理消息
 */
function callAiBackend(wechatId, question) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ wechat_id: wechatId, question });
    const options = {
      hostname: AI_TARGET.hostname,
      port: AI_TARGET.port || '3002',
      path: '/api/ai/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 15000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success && json.data) {
            resolve(json.data.answer);
          } else {
            reject(new Error('AI处理失败'));
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('AI超时')); });
    req.write(body);
    req.end();
  });
}

/**
 * 解析企业微信回调XML
 * 简单XML解析，只提取需要的字段
 */
function parseCallbackXml(xml) {
  const getTag = (tag) => {
    const match = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]></${tag}>`));
    return match ? match[1] : '';
  };
  return {
    toUserName: getTag('ToUserName'),
    fromUserName: getTag('FromUserName'),
    createTime: getTag('CreateTime'),
    msgType: getTag('MsgType'),
    content: getTag('Content'),
    msgId: getTag('MsgId'),
    agentId: getTag('AgentID'),
  };
}

/**
 * 处理企业微信回调（主动回复模式：先确认，再异步回复）
 */
async function handleWeChatCallback(config, bodyXml) {
  const { token, encodingAESKey, corpId, corpSecret, agentId } = config;

  // 解析加密XML
  const encryptMatch = bodyXml.match(/<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/);
  if (!encryptMatch) return { reply: 'success' };

  const encrypted = encryptMatch[1];

  // 解密消息
  let decrypted;
  try {
    decrypted = decryptMessage(encrypted, encodingAESKey, corpId);
  } catch (e) {
    console.error('解密失败:', e.message);
    return { reply: 'success' };
  }

  // 解析消息XML
  const msg = parseCallbackXml(decrypted.message);
  console.log(`[微信消息] 来自: ${msg.fromUserName}, 类型: ${msg.msgType}, 内容: ${msg.content}`);

  // 只处理文本消息
  if (msg.msgType === 'text' && msg.content) {
    // 异步回复，不阻塞回调
    replyAsync(config, msg).catch(err => {
      console.error('异步回复失败:', err.message);
    });
  }

  // 立即返回success告知微信已收到
  return { reply: 'success' };
}

/**
 * 异步回复消息
 */
async function replyAsync(config, msg) {
  const { corpId, corpSecret, agentId } = config;

  try {
    // 1. 调用AI处理
    const answer = await callAiBackend(msg.fromUserName, msg.content);

    // 2. 获取企业微信access token
    const accessToken = await getAccessToken(corpId, corpSecret);

    // 3. 发送回复
    await sendWeChatMessage(accessToken, {
      touser: msg.fromUserName,
      msgtype: 'text',
      agentid: agentId,
      text: { content: answer },
    });

    console.log(`[微信回复成功] ${msg.fromUserName}: ${answer.substring(0, 50)}...`);
  } catch (e) {
    console.error(`[微信回复失败] ${msg.fromUserName}: ${e.message}`);
  }
}

/**
 * 处理GET请求（URL验证）
 */
function handleVerifyUrl(config, query) {
  const { token, encodingAESKey, corpId } = config;
  const { msg_signature, timestamp, nonce, echostr } = query;

  if (!echostr) return null;

  try {
    const decrypted = decryptMessage(echostr, encodingAESKey, corpId);
    return decrypted.message;
  } catch (e) {
    console.error('URL验证解密失败:', e.message);
    return null;
  }
}

module.exports = {
  handleWeChatCallback,
  handleVerifyUrl,
  callAiBackend,
};

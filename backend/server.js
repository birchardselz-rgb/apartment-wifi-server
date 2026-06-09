// server.js — Express API 服务
// 在 Vercel Serverless 和本地环境均可运行

const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '50mb' }));

// ============================================================
// 企业微信配置
// ============================================================
const WX_CONFIG = {
  corpId: process.env.WX_CORP_ID || '',
  corpSecret: process.env.WX_CORP_SECRET || '',
  token: process.env.WX_TOKEN || '',
  encodingAESKey: process.env.WX_ENCODING_AES_KEY || '',
  agentId: process.env.WX_AGENT_ID || '',
};
const wxEnabled = !!(WX_CONFIG.corpId && WX_CONFIG.token && WX_CONFIG.encodingAESKey);

// 企业微信模块（延迟加载，避免本地缺失时崩溃）
let wechatCrypto, wechatHandler;
function getWechatModules() {
  if (!wechatCrypto) {
    try {
      wechatCrypto = require('./wechat/wechat-crypto');
      wechatHandler = require('./wechat/wechat-handler');
    } catch (e) {
      // wechat modules may not exist in Vercel deployment
    }
  }
  return { wechatCrypto, wechatHandler };
}

// ============================================================
// API 路由
// ============================================================

// 获取全部数据
app.get('/api/data', async (req, res) => {
  try {
    const data = await db.readAllData();
    res.json({ success: true, data, packages: data.packages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 保存全部数据
app.post('/api/data', async (req, res) => {
  try {
    await db.writeAllData(req.body);
    res.json({ success: true, message: '数据已保存' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 重置数据
app.post('/api/reset', async (req, res) => {
  try {
    await db.seedIfEmpty();
    res.json({ success: true, message: '数据已重置为初始演示数据' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 企业微信回调 - URL验证
app.get('/api/wechat/callback', (req, res) => {
  const echostr = req.query.echostr;
  if (echostr) {
    const mods = getWechatModules();
    if (wxEnabled && mods.wechatHandler) {
      const query = {
        msg_signature: req.query.msg_signature || '',
        timestamp: req.query.timestamp || '',
        nonce: req.query.nonce || '',
        echostr,
      };
      const result = mods.wechatHandler.handleVerifyUrl(WX_CONFIG, query);
      res.type('text/plain').send(result || echostr);
    } else {
      res.type('text/plain').send(echostr);
    }
  } else {
    res.status(400).send('Missing echostr');
  }
});

// 企业微信消息回调
app.post('/api/wechat/callback', async (req, res) => {
  if (!wxEnabled) {
    res.type('text/plain').send('success');
    return;
  }
  try {
    const mods = getWechatModules();
    if (mods.wechatHandler) {
      const result = await mods.wechatHandler.handleWeChatCallback(WX_CONFIG, JSON.stringify(req.body));
      res.type('text/plain').send(result.reply || 'success');
    } else {
      res.type('text/plain').send('success');
    }
  } catch (e) {
    console.error('微信回调错误:', e.message);
    res.type('text/plain').send('success');
  }
});

// 保持与旧 API 兼容（管理后台的 mock API 转发）
app.all('/api/*', (req, res) => {
  res.status(404).json({ code: 404, message: 'API endpoint not found: ' + req.path, data: null });
});

// 导出 Express app（供 Vercel Serverless 使用）
module.exports = app;

// ====== 本地开发模式：直接启动 ======
if (require.main === module) {
  const PORT = parseInt(process.env.PORT) || 3456;

  // 启动时初始化数据库
  db.seedIfEmpty().then(() => {
    console.log('✓ 数据库初始化完成');
    app.listen(PORT, () => {
      console.log(`✓ 本地服务已启动: http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error('✗ 数据库初始化失败:', err.message);
    process.exit(1);
  });
}

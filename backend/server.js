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
app.all('/api/*', async (req, res) => {
  const path = req.path;
  const method = req.method;
  const send = (data, code = 200) => res.json({ code, message: 'success', data });
  const fail = (msg, code = 400) => res.json({ code, message: msg, data: null });

  try {
    // === AUTH ===
    if (path === '/api/auth/login' && method === 'POST') {
      const { username, password, loginType, landlordId } = req.body || {};
      const companies = ['白云公寓管理有限公司', '天河青年社区', '幸福家园公寓', '阳光城公寓', '碧桂园公寓'];

      if (loginType === 'admin') {
        // 总公司管理员
        if (username === 'admin' && (!password || password === 'admin123')) {
          return send({ token: 'token-' + Date.now(), userId: 1, username: 'admin', companyName: '总公司 · 管理员' });
        }
        // 也查一下 staff 表
        const staffList = await db.getAllStaff();
        const user = staffList.find(s => s.name === username && (!password || s.password === password));
        if (user) return send({ token: 'token-' + Date.now(), userId: user.id, username: user.name, companyName: '总公司 · ' + user.role });
        return fail('总公司演示账号: admin / admin123', 401);
      } else {
        // 二房东登录
        const idx = landlordId ? (parseInt(landlordId) - 1) : 0;
        const company = companies[idx] || companies[0];
        if (!password || password === 'admin123') {
          return send({ token: 'token-' + Date.now(), userId: 1000 + (idx + 1), username: username || company, companyName: '二房东 · ' + company });
        }
        return fail('二房东演示密码: admin123', 401);
      }
    }

    // === DASHBOARD ===
    if (path === '/api/dashboard/landlord') {
      const data = await db.readAllData();
      return send({
        buildingCount: 3,
        allRooms: 300, occupiedRooms: 280, vacantRooms: 20, vacancyRate: '6.7',
        activatedBroadband: data.clients.length, broadbandCoverage: '87.5',
        onlineUsers: Math.max(data.clients.length - 5, 0), offlineUsers: 5, overdueUsers: 3,
        monthIncome: data.orders.reduce((s, o) => s + (o.amount || 0), 0),
        balance: data.orders.reduce((s, o) => s + (o.totalAmount || 0), 0),
        pendingOrders: data.tickets.filter(t => t.status === 'pending' || t.status === 'assigned').length,
      });
    }
    if (path === '/api/dashboard/admin') {
      const data = await db.readAllData();
      return send({
        totalLandlords: 12, totalBuildings: 35, totalRooms: 3200, occupiedRooms: 2850, vacantRooms: 350,
        totalBroadbandUsers: data.clients.length, onlineUsers: Math.max(data.clients.length - 5, 0), offlineUsers: 5, overdueUsers: 3,
        monthIncome: data.orders.reduce((s, o) => s + (o.amount || 0), 0), pendingOrders: data.tickets.filter(t => t.status === 'pending').length,
      });
    }

    // === BUILDING ===（来自数据库客户地址生成）
    if (path === '/api/building/list') {
      const data = await db.readAllData();
      const buildings = {};
      for (const c of data.clients) {
        const addr = c.address || '';
        const parts = addr.split(' ');
        const name = parts[0] || '默认楼栋';
        const roomNo = parts[1] || '';
        if (!buildings[name]) buildings[name] = { id: Object.keys(buildings).length + 1, name, totalRooms: 0 };
        buildings[name].totalRooms++;
      }
      if (Object.keys(buildings).length === 0) {
        return send([
          { id: 1, name: '白云公寓A栋', totalRooms: 120, floors: 10, status: 1 },
          { id: 2, name: '白云公寓B栋', totalRooms: 100, floors: 8, status: 1 },
        ]);
      }
      return send(Object.values(buildings));
    }
    if (path === '/api/building/save' && method === 'POST') return send({ id: Date.now() });
    const buildingDeleteMatch = path.match(/^\/api\/building\/(\d+)$/);
    if (buildingDeleteMatch && method === 'DELETE') return send('删除成功');

    // === ROOM ===
    const roomListMatch = path.match(/^\/api\/room\/list\/(\d+)$/);
    if (roomListMatch) {
      const data = await db.readAllData();
      return send(data.clients.map((c, i) => ({
        id: i + 1, buildingId: parseInt(roomListMatch[1]), roomNo: c.roomNo || `A-${String(i + 1).padStart(3, '0')}`,
        floor: Math.ceil((i + 1) / 12), area: 25 + (i % 5) * 5, rentAmount: 1200 + (i % 3) * 300,
        status: c.status === 'active' || c.status === 'suspended' ? 1 : 0,
      })));
    }
    if (path === '/api/room/save' && method === 'POST') return send({ id: 999 });
    if (path === '/api/room/batch' && method === 'POST') return send('批量创建成功');
    if (path.match(/^\/api\/room\/\d+$/) && method === 'DELETE') return send('删除成功');
    if (path.match(/^\/api\/room\/\d+\/status/) && method === 'PUT') return send('状态更新成功');

    // === BROADBAND ===
    if (path === '/api/broadband/list') {
      const data = await db.readAllData();
      return send(data.clients.map((c, i) => ({
        id: i + 1, username: 'BB' + String(1000000 + i), status: c.status === 'active' ? 1 : 0,
        onlineStatus: c.status === 'active' ? 1 : 0, expireDate: c.expiryDate || '2026-12-31',
      })));
    }
    if (path === '/api/broadband/stats') {
      const data = await db.readAllData();
      const active = data.clients.filter(c => c.status === 'active').length;
      return send({ online: active, offline: data.clients.length - active, active, total: data.clients.length });
    }
    if (path === '/api/broadband/activate' && method === 'POST') return send({ id: 999, username: 'BB' + Date.now(), status: 1 });
    if (path.match(/^\/api\/broadband\/\d+\/suspend/) && method === 'PUT') return send('已暂停');
    if (path.match(/^\/api\/broadband\/\d+\/resume/) && method === 'PUT') return send('已恢复');

    // === WORK ORDER ===
    if (path === '/api/workorder/list') {
      const data = await db.readAllData();
      return send(data.tickets.map((t, i) => ({
        id: i + 1, orderNo: 'WO' + String(i + 1).padStart(6, '0'),
        orderType: (i % 5) + 1, title: (t.issueType || '工单') + ' - ' + (t.clientName || ''),
        description: t.description || '', priority: t.priority === 'urgent' ? 3 : t.priority === 'high' ? 2 : 1,
        status: t.status === 'resolved' || t.status === 'closed' ? 2 : t.status === 'in_progress' || t.status === 'assigned' ? 1 : 0,
        assigneeId: t.assignedTo ? 1 : null, handlerNote: t.handle_note,
        handleTime: t.resolvedAt || t.update_time, createdAt: t.create_time,
      })));
    }
    if (path === '/api/workorder/pending') {
      const data = await db.readAllData();
      return send(data.tickets.filter(t => t.status === 'pending').length);
    }
    if (path === '/api/workorder/create' && method === 'POST') return send({ id: 999, orderNo: 'WO' + Date.now(), status: 0 });
    if (path === '/api/workorder/assign' && method === 'PUT') return send({ id: 1, status: 1 });
    if (path === '/api/workorder/complete' && method === 'PUT') return send({ id: 1, status: 2 });
    if (path === '/api/workorder/stats') {
      const data = await db.readAllData();
      return send({
        pending: data.tickets.filter(t => t.status === 'pending').length,
        processing: data.tickets.filter(t => t.status === 'in_progress' || t.status === 'assigned').length,
        completed: data.tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
      });
    }

    // === FINANCE ===
    if (path === '/api/finance/income') {
      const data = await db.readAllData();
      const total = data.orders.reduce((s, o) => s + (o.amount || 0), 0);
      return send({
        monthIncome: total, weekIncome: Math.round(total * 0.3), totalIncome: total,
        monthlyData: [
          { month: '1月', income: Math.round(total * 0.1) },
          { month: '2月', income: Math.round(total * 0.12) },
          { month: '3月', income: Math.round(total * 0.15) },
          { month: '4月', income: Math.round(total * 0.18) },
          { month: '5月', income: Math.round(total * 0.2) },
          { month: '6月', income: Math.round(total * 0.25) },
        ],
      });
    }
    if (path === '/api/finance/records') {
      return send(Array.from({ length: 30 }, (_, i) => ({
        id: i + 1, paymentNo: 'PAY' + String(i + 1).padStart(8, '0'),
        amount: [29, 49, 69, 99, 299, 499][i % 6], platformFee: 1.00,
        landlordShare: [20.3, 34.3, 48.3, 69.3, 209.3, 349.3][i % 6],
        paymentMethod: 1, paymentType: i % 3 === 0 ? 2 : 1, status: 1,
        paidAt: '2026-06-' + String((i % 20) + 1).padStart(2, '0') + 'T' + String(8 + i % 12).padStart(2, '0') + ':30:00',
      })));
    }

    // === PACKAGE ===
    if (path === '/api/package/list' || path === '/api/package/all') {
      const data = await db.readAllData();
      return send(data.packages.length > 0 ? data.packages.map(p => ({
        id: parseInt(p.id) || 1, name: p.name, speed: p.speed, price: p.price || 0,
        durationMonths: p.durationMonths || 1, description: p.name + ' ' + p.speed,
        sortOrder: 1, status: 1,
      })) : [
        { id: 1, name: '经济版', speed: '100M', price: 29, durationMonths: 1, status: 1 },
        { id: 2, name: '畅享版', speed: '300M', price: 49, durationMonths: 1, status: 1 },
        { id: 3, name: '极速版', speed: '500M', price: 69, durationMonths: 1, status: 1 },
        { id: 4, name: '千兆版', speed: '1000M', price: 99, durationMonths: 1, status: 1 },
      ]);
    }
    if (path === '/api/package/save' && method === 'POST') return send({ id: 999 });
    if (path.match(/^\/api\/package\/\d+$/) && method === 'DELETE') return send('删除成功');

    // 404
    res.status(404).json({ code: 404, message: 'API endpoint not found: ' + path, data: null });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
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

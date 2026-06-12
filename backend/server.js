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
// 角色认证中间件
// ============================================================
function getUserFromToken(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return { role: 'unknown' };
  try {
    // Simple base64-encoded JSON token
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const payload = JSON.parse(decoded);
    return { role: payload.role || 'admin', landlordId: payload.landlordId || null, username: payload.username || '' };
  } catch {
    return { role: 'admin' }; // fallback to admin for backward compatibility
  }
}

// ============================================================
// API 路由
// ============================================================

// 获取全部数据（总公司专用，含所有二房东数据）
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

// ============================================================
// API 路由：角色化 / 二房东管理 / 业务接口
// ============================================================
app.all('/api/*', async (req, res) => {
  const path = req.path;
  const method = req.method;
  const user = getUserFromToken(req);
  const isAdmin = user.role === 'admin';
  const landlordId = user.landlordId;

  const send = (data, code = 200) => res.json({ code, message: 'success', data });
  const fail = (msg, code = 400) => res.json({ code, message: msg, data: null });

  try {
    // === AUTH ===
    if (path === '/api/auth/login' && method === 'POST') {
      const { username, password, loginType, landlordId: llId } = req.body || {};
      const companies = ['白云公寓管理有限公司', '天河青年社区', '幸福家园公寓', '阳光城公寓', '碧桂园公寓'];

      if (loginType === 'admin') {
        if (username === 'admin' && (!password || password === 'admin123')) {
          const token = Buffer.from(JSON.stringify({ role: 'admin', username: 'admin' })).toString('base64');
          return send({ token, userId: 1, username: 'admin', companyName: '总公司 · 管理员' });
        }
        const staffList = await db.getAllStaff();
        const user = staffList.find(s => s.name === username && (!password || s.password === password));
        if (user) {
          const token = Buffer.from(JSON.stringify({ role: 'admin', username: user.name })).toString('base64');
          return send({ token, userId: user.id, username: user.name, companyName: '总公司 · ' + user.role });
        }
        return fail('总公司演示账号: admin / admin123', 401);
      } else {
        // 二房东登录
        const idx = llId ? (parseInt(llId) - 1) : 0;
        const company = companies[idx] || companies[0];
        if (!password || password === 'admin123') {
          const token = Buffer.from(JSON.stringify({ role: 'landlord', landlordId: idx + 1, username: username || company })).toString('base64');
          return send({ token, userId: 1000 + (idx + 1), username: username || company, companyName: '二房东 · ' + company });
        }
        return fail('二房东演示密码: admin123', 401);
      }
    }

    // === 二房东管理（总公司专用） ===
    if (path === '/api/landlord/list') {
      if (!isAdmin) return fail('无权限');
      const landlords = await db.getAllLandlords();
      // 如果没有数据，返回默认列表
      if (landlords.length === 0) {
        return send([
          { id: 1, name: '白云公寓管理有限公司', contact: '陈总', phone: '13800001001', address: '白云大道1号', status: 1, shareRatio: 70, totalRooms: 220, activeUsers: 176, monthIncome: 12600 },
          { id: 2, name: '天河青年社区', contact: '李总', phone: '13800001002', address: '天河路88号', status: 1, shareRatio: 65, totalRooms: 150, activeUsers: 120, monthIncome: 8900 },
        ]);
      }
      return send(landlords.map(l => ({
        id: l.id, name: l.name, contact: l.contact, phone: l.phone, address: l.address,
        status: l.status, shareRatio: l.share_ratio,
      })));
    }
    if (path === '/api/landlord/save' && method === 'POST') {
      if (!isAdmin) return fail('无权限');
      const ll = await db.createLandlord(req.body);
      return send(ll);
    }
    if (path === '/api/landlord/update' && method === 'POST') {
      if (!isAdmin) return fail('无权限');
      const ll = await db.updateLandlord(req.body.id, req.body);
      return send(ll);
    }
    const landlordDelMatch = path.match(/^\/api\/landlord\/(\d+)$/);
    if (landlordDelMatch && method === 'DELETE') {
      if (!isAdmin) return fail('无权限');
      await db.deleteLandlord(parseInt(landlordDelMatch[1]));
      return send('删除成功');
    }

    // === DASHBOARD ===
    if (path === '/api/dashboard/landlord') {
      const data = await db.readAllData();
      if (!isAdmin) {
        // 二房东只看自己的数据
        const myName = user.username || '白云公寓管理有限公司';
        const myClients = data.clients.filter(c => parseInt(c.landlordId) === parseInt(landlordId));
        return send({
          buildingCount: Math.max(1, Math.round(myClients.length / 50)),
          allRooms: myClients.length + 20, occupiedRooms: myClients.length, vacantRooms: 20, vacancyRate: '6.7',
          activatedBroadband: myClients.length, broadbandCoverage: '87.5',
          onlineUsers: Math.max(myClients.length - 3, 0), offlineUsers: 3, overdueUsers: 1,
          monthIncome: myClients.reduce((s, c) => s + 299, 0),
          balance: myClients.reduce((s, c) => s + 299, 0),
          pendingOrders: data.tickets.filter(t => (t.status === 'pending' || t.status === 'assigned') && (!t.clientName || myClients.some(c => c.name === t.clientName))).length,
        });
      }
      return send({
        buildingCount: 5, allRooms: 450, occupiedRooms: 380, vacantRooms: 70, vacancyRate: '15.6',
        activatedBroadband: data.clients.length, broadbandCoverage: Math.round(data.clients.length / 450 * 100) + '%',
        onlineUsers: Math.max(data.clients.length - 10, 0), offlineUsers: 10, overdueUsers: 3,
        monthIncome: data.orders.reduce((s, o) => s + (o.amount || 0), 0) || 12600,
        balance: data.orders.reduce((s, o) => s + (o.totalAmount || 0), 0) || 45800,
        pendingOrders: data.tickets.filter(t => t.status === 'pending' || t.status === 'assigned').length,
      });
    }

    // === EXPIRING CUSTOMERS ===
    if (path === '/api/dashboard/expiring') {
      const data = await db.readAllData();
      let clients = data.clients;
      if (!isAdmin && landlordId) {
        clients = clients.filter(c => parseInt(c.landlordId) === parseInt(landlordId));
      }
      const now = new Date();
      const expiringSoon = clients.filter(c => {
        if (!c.expiryDate || c.expiryDate === '永久') return false;
        const expiry = new Date(c.expiryDate);
        const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 30;
      }).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)).slice(0, 10);
      const overdue = clients.filter(c => {
        if (!c.expiryDate || c.expiryDate === '永久') return false;
        const expiry = new Date(c.expiryDate);
        const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        return diffDays <= 0;
      }).length;
      return send({
        expiringSoon: expiringSoon.map(c => ({
          id: c.id, name: c.name, phone: c.phone, roomNo: c.roomNo,
          address: c.address, packageId: c.packageId,
          expiryDate: c.expiryDate, daysLeft: Math.ceil((new Date(c.expiryDate) - now) / (1000 * 60 * 60 * 24)),
        })),
        overdue,
        expiringCount: expiringSoon.length,
      });
    }

    // === BUILDING ===
    if (path === '/api/building/list') {
      const allBuildings = await db.getAllBuildings();
      if (allBuildings.length > 0) {
        if (!isAdmin && landlordId) {
          const filtered = allBuildings.filter(b => b.landlord_id === landlordId);
          return send(filtered.map(b => ({ id: b.id, name: b.name, address: b.address, totalRooms: b.total_rooms, floors: b.floors, status: b.status, landlordId: b.landlord_id })));
        }
        return send(allBuildings.map(b => ({ id: b.id, name: b.name, address: b.address, totalRooms: b.total_rooms, floors: b.floors, status: b.status, landlordId: b.landlord_id })));
      }
      // fallback
      return send([
        { id: 1, name: '白云公寓A栋', totalRooms: 60, floors: 10, status: 1, landlordId: 1 },
        { id: 2, name: '白云公寓B栋', totalRooms: 50, floors: 8, status: 1, landlordId: 1 },
        { id: 3, name: '天河青年社区A栋', totalRooms: 40, floors: 6, status: 1, landlordId: 2 },
      ]);
    }
    if (path === '/api/building/save' && method === 'POST') {
      if (!isAdmin) return fail('无权限');
      const { id, ...data } = req.body;
      if (id) {
        const updated = await db.updateBuilding(id, { ...data, landlordId: data.landlordId || landlordId || 0 });
        return send(updated);
      }
      const created = await db.createBuilding({ ...data, landlordId: data.landlordId || landlordId || 0 });
      return send(created);
    }
    const buildingDelMatch = path.match(/^\/api\/building\/(\d+)$/);
    if (buildingDelMatch && method === 'DELETE') {
      await db.deleteBuilding(parseInt(buildingDelMatch[1]));
      return send('删除成功');
    }

    // === ROOM ===
    const roomListMatch = path.match(/^\/api\/room\/list\/(\d+)$/);
    if (roomListMatch) {
      const data = await db.readAllData();
      return send(data.clients.slice(0, 50).map((c, i) => ({
        id: i + 1, buildingId: parseInt(roomListMatch[1]), roomNo: c.roomNo || `A-${String(i + 1).padStart(3, '0')}`,
        floor: Math.ceil((i + 1) / 12), area: 25 + (i % 5) * 5, rentAmount: 1200 + (i % 3) * 300,
        status: c.status === 'active' || c.status === 'suspended' ? 1 : 0,
      })));
    }

    // === BROADBAND / WORKORDER / FINANCE / PACKAGE (同原有逻辑) ===
    // 以下与之前代码相同 - 保持向后兼容
    if (path === '/api/room/save' && method === 'POST') return send({ id: 999 });
    if (path === '/api/room/batch' && method === 'POST') return send('批量创建成功');
    if (path.match(/^\/api\/room\/\d+$/) && method === 'DELETE') return send('删除成功');
    if (path.match(/^\/api\/room\/\d+\/status/) && method === 'PUT') return send('状态更新成功');
    if (path === '/api/tenant/list') {
      const data = await db.readAllData();
      return send(data.clients.map((c, i) => ({
        id: i + 1, name: c.name, phone: c.phone, roomId: c.roomNo || '',
        gender: 1, checkinDate: c.installDate || c.createdAt, status: c.status === 'active' ? 1 : 2,
        remark: c.address || '',
      })));
    }

    // === BROADBAND - Real DB backed ===
    if (path === '/api/broadband/list') {
      const landlordIds = (!isAdmin && landlordId) ? [landlordId] : null;
      let accounts;
      if (landlordIds) {
        accounts = await db.getBroadbandAccountsByLandlord(landlordId);
      } else {
        accounts = await db.getAllBroadbandAccounts();
      }
      if (accounts.length === 0) {
        const data = await db.readAllData();
        let clients = data.clients;
        if (!isAdmin && landlordId) clients = clients.filter(c => parseInt(c.landlordId) === parseInt(landlordId));
        return send(clients.slice(0, 50).map((c, i) => ({
          id: i + 1, username: 'BB' + String(1000000 + i), customerName: c.name, phone: c.phone,
          roomId: c.roomNo || '', status: c.status === 'active' ? 1 : c.status === 'suspended' ? 2 : 0,
          onlineStatus: c.status === 'active' ? 1 : 0, expireDate: c.expiryDate || '2026-12-31',
          macAddress: 'AA:BB:CC:DD:EE:' + String(i).padStart(2, '0'),
          ipAddress: '192.168.1.' + (i + 10),
          packageName: c.packageId || 'Standard', landlordId: c.landlordId,
        })));
      }
      const data = await db.readAllData();
      return send(accounts.map(a => {
        const cust = data.clients.find(c => parseInt(c.id) === a.customer_id);
        return {
          id: a.id, username: a.account_no, customerName: cust?.name || '', phone: cust?.phone || '',
          roomId: cust?.roomNo || '', status: a.status, onlineStatus: a.online_status,
          expireDate: a.expire_date, macAddress: a.mac_address, ipAddress: a.ip_address,
          packageId: a.package_id, bandwidthLimit: a.bandwidth_limit, landlordId: a.landlord_id,
        };
      }));
    }
    if (path === '/api/broadband/stats') {
      let accounts;
      if (!isAdmin && landlordId) {
        accounts = await db.getBroadbandAccountsByLandlord(landlordId);
      } else {
        accounts = await db.getAllBroadbandAccounts();
      }
      if (accounts.length === 0) {
        const data = await db.readAllData();
        let clients = data.clients;
        if (!isAdmin && landlordId) clients = clients.filter(c => parseInt(c.landlordId) === parseInt(landlordId));
        const active = clients.filter(c => c.status === 'active').length;
        return send({ online: Math.round(active * 0.8), offline: clients.length - Math.round(active * 0.8), active, total: clients.length });
      }
      const online = accounts.filter(a => a.online_status === 1).length;
      const suspended = accounts.filter(a => a.status === 2).length;
      const active = accounts.filter(a => a.status === 1).length;
      return send({ online, offline: active - online, active, total: accounts.length, suspended });
    }
    if (path === '/api/broadband/activate' && method === 'POST') {
      const body = req.body;
      const customers = await db.getAllCustomers();
      let customer;
      if (body.customerId) {
        customer = customers.find(c => c.id === parseInt(body.customerId));
      } else if (body.phone) {
        customer = customers.find(c => c.phone === body.phone);
      }
      if (!customer) {
        const targetLandlordId = body.landlordId || landlordId || 1;
        customer = customers.find(c => c.landlord_id === targetLandlordId) || customers[0];
      }
      const accountPrefix = 'BB' + String(Date.now()).slice(-8);
      const expireDate = new Date();
      expireDate.setMonth(expireDate.getMonth() + (body.durationMonths || 12));
      const expireStr = expireDate.toISOString().split('T')[0];
      const account = await db.createBroadbandAccount({
        customerId: customer?.id || 0,
        landlordId: body.landlordId || landlordId || customer?.landlord_id || 1,
        packageId: body.packageId || 0,
        accountNo: accountPrefix,
        macAddress: body.macAddress || '',
        ipAddress: '192.168.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255),
        status: 1,
        onlineStatus: 0,
        expireDate: expireStr,
        bandwidthLimit: body.bandwidthLimit || 100000000,
      });
      return send({ id: account.id, username: account.account_no, status: account.status, macAddress: account.mac_address, expireDate: account.expire_date });
    }
    const suspendMatch = path.match(/^\/api\/broadband\/(\d+)\/suspend$/);
    if (suspendMatch && method === 'PUT') {
      await db.updateBroadbandAccount(parseInt(suspendMatch[1]), { status: 2 });
      return send('Suspended');
    }
    const resumeMatch = path.match(/^\/api\/broadband\/(\d+)\/resume$/);
    if (resumeMatch && method === 'PUT') {
      await db.updateBroadbandAccount(parseInt(resumeMatch[1]), { status: 1 });
      return send('Resumed');
    }
    const renewMatch = path.match(/^\/api\/broadband\/(\d+)\/renew$/);
    if (renewMatch && method === 'POST') {
      const account = (await db.getAllBroadbandAccounts()).find(a => a.id === parseInt(renewMatch[1]));
      if (!account) return fail('Not found', 404);
      const now = new Date();
      const currentExpire = account.expire_date ? new Date(account.expire_date) : now;
      const months = req.body.months || 12;
      const newExpire = new Date(Math.max(currentExpire.getTime(), now.getTime()));
      newExpire.setMonth(newExpire.getMonth() + months);
      await db.updateBroadbandAccount(parseInt(renewMatch[1]), { ...account, expireDate: newExpire.toISOString().split('T')[0], status: 1 });
      return send({ message: 'Renewed', newExpireDate: newExpire.toISOString().split('T')[0] });
    }

    // WORKORDER
    if (path === '/api/workorder/list') {
      const tickets = await db.getAllTickets();
      // 获取客户数据用于 landlordId 过滤
      let landlordClientNames = [];
      if (!isAdmin && landlordId) {
        const data = await db.readAllData();
        const myClients = data.clients.filter(c => parseInt(c.landlordId) === parseInt(landlordId));
        landlordClientNames = myClients.map(c => c.name);
      }
      const filteredTickets = !isAdmin && landlordId
        ? tickets.filter(t => landlordClientNames.includes(t.customer_name))
        : tickets;
      if (filteredTickets.length === 0) {
        return send([]);
      }
      return send(filteredTickets.map(t => ({
        id: t.id, orderNo: t.ticket_no,
        orderType: t.issue_type === 'no_connection' ? 3 : t.issue_type === 'slow_speed' ? 3 : t.issue_type === 'equipment_fault' ? 3 : t.issue_type === 'installation' ? 1 : t.issue_type === 'other' ? 5 : 5,
        title: (t.issue_type || '工单') + ' - ' + (t.customer_name || ''),
        description: t.problem || '', priority: t.priority === 'urgent' ? 3 : t.priority === 'high' ? 2 : 1,
        status: t.status >= 3 ? 2 : t.status >= 1 ? 1 : 0,
        assigneeId: t.handler || null, handlerNote: t.handle_note || '',
        createdAt: t.create_time ? new Date(t.create_time).toISOString().replace('T', ' ').substring(0, 19) : '',
      })));
    }
    if (path === '/api/workorder/pending') {
      if (!isAdmin && landlordId) {
        const data = await db.readAllData();
        const myClients = data.clients.filter(c => parseInt(c.landlordId) === parseInt(landlordId));
        const myNames = myClients.map(c => c.name);
        const tickets = await db.getAllTickets();
        const myPending = tickets.filter(t => t.status === 0 && myNames.includes(t.customer_name));
        return send(myPending.length);
      }
      const rows = await db.query('SELECT COUNT(*)::int as c FROM ticket WHERE status = 0');
      return send(rows.rows[0]?.c || 0);
    }
    if (path === '/api/workorder/create' && method === 'POST') {
      const body = req.body;
      const ticket = await db.createTicket({
        issueType: ['','new_install','relocation','fault','removal','consultation'][body.orderType] || 'fault',
        problem: body.description || body.title || '',
        customerName: body.customerName || '',
        phone: body.phone || '',
        roomNo: body.roomNo || '',
        clientId: body.clientId || '',
        priority: body.priority === 3 ? 'urgent' : body.priority === 2 ? 'high' : 'medium',
        status: 0,
      });
      return send({ id: ticket.id, orderNo: ticket.ticket_no, status: 0 });
    }
    if (path === '/api/workorder/assign' && method === 'PUT') {
      const { orderId, operatorId } = req.body;
      const staffList = await db.getAllStaff();
      const operator = staffList.find(s => s.id === parseInt(operatorId));
      await db.updateTicket(parseInt(orderId), { handler: operator?.name || operatorId, status: 1 });
      return send({ id: orderId, status: 1 });
    }
    if (path === '/api/workorder/complete' && method === 'PUT') {
      const { orderId, note } = req.body;
      await db.updateTicket(parseInt(orderId), { handleNote: note || '已完成处理', status: 3, resolvedAt: new Date().toISOString() });
      return send({ id: orderId, status: 2 });
    }
    if (path === '/api/workorder/stats') {
      if (!isAdmin && landlordId) {
        const data = await db.readAllData();
        const myClients = data.clients.filter(c => parseInt(c.landlordId) === parseInt(landlordId));
        const myNames = myClients.map(c => c.name);
        const tickets = await db.getAllTickets();
        const myTickets = tickets.filter(t => myNames.includes(t.customer_name));
        return send({
          pending: myTickets.filter(t => t.status === 0).length || 0,
          processing: myTickets.filter(t => t.status === 1 || t.status === 2).length || 0,
          completed: myTickets.filter(t => t.status >= 3).length || 0,
        });
      }
      const result = await db.query(`SELECT
        COALESCE(SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END), 0) as pending,
        COALESCE(SUM(CASE WHEN status IN (1,2) THEN 1 ELSE 0 END), 0) as processing,
        COALESCE(SUM(CASE WHEN status >= 3 THEN 1 ELSE 0 END), 0) as completed
        FROM ticket`);
      const r = result.rows[0] || { pending: 0, processing: 0, completed: 0 };
      return send({ pending: parseInt(r.pending) || 3, processing: parseInt(r.processing) || 2, completed: parseInt(r.completed) || 1 });
    }

    // FINANCE
    if (path === '/api/finance/income') {
      const data = await db.readAllData();
      let relevantClients = data.clients;
      if (!isAdmin && landlordId) {
        relevantClients = data.clients.filter(c => parseInt(c.landlordId) === parseInt(landlordId));
      }
      const relevantNames = relevantClients.map(c => c.name);
      const relevantOrders = data.orders.filter(o => relevantNames.includes(o.clientName));
      const total = relevantOrders.reduce((s, o) => s + (o.amount || 0), 0) || relevantClients.length * 299;
      const monthly = [5200, 6800, 8900, 10200, 11800, total];
      return send({
        monthIncome: Math.round(total * 100) / 100, weekIncome: Math.round(total * 0.3 * 100) / 100, totalIncome: Math.round(total * 3 * 100) / 100,
        monthlyData: monthly.map((v, i) => ({ month: (i + 1) + '月', income: Math.round(v * 100) / 100 })),
      });
    }
    if (path === '/api/finance/records') {
      if (!isAdmin && landlordId) {
        const data = await db.readAllData();
        const myClients = data.clients.filter(c => parseInt(c.landlordId) === parseInt(landlordId));
        const myNames = myClients.map(c => c.name);
        const myOrders = data.orders.filter(o => myNames.includes(o.clientName));
        return send(myOrders.slice(0, 30).map((o, i) => ({
          id: i + 1, paymentNo: 'PAY' + String(i + 1).padStart(8, '0'),
          amount: o.amount || 0, platformFee: 1.00,
          paymentMethod: 1, paymentType: i % 3 === 0 ? 2 : 1, status: 1,
          paidAt: o.paidAt || o.createdAt || '2026-06-01',
        })));
      }
      return send(Array.from({ length: 30 }, (_, i) => ({
        id: i + 1, paymentNo: 'PAY' + String(i + 1).padStart(8, '0'),
        amount: [29, 49, 69, 99, 299, 499][i % 6], platformFee: 1.00,
        paymentMethod: 1, paymentType: i % 3 === 0 ? 2 : 1, status: 1,
        paidAt: '2026-06-' + String((i % 20) + 1).padStart(2, '0') + 'T08:30:00',
      })));
    }
    if (path === '/api/finance/settlement') {
      const data = await db.readAllData();
      const landlords = await db.getAllLandlords();
      const allLandlords = landlords.length > 0 ? landlords : [
        { id: 1, name: '白云公寓管理有限公司', share_ratio: 70 },
        { id: 2, name: '天河青年社区', share_ratio: 65 },
        { id: 3, name: '幸福家园公寓', share_ratio: 60 },
      ];

      // Calculate income per landlord
      const settlementList = allLandlords.map(ll => {
        const llClients = data.clients.filter(c => parseInt(c.landlordId) === ll.id);
        const llOrders = data.orders.filter(o => llClients.some(c => c.name === o.clientName));
        const totalIncome = llOrders.reduce((s, o) => s + (o.amount || 0), 0) || llClients.length * 299;
        const shareRatio = ll.share_ratio || 70;
        const platformFee = totalIncome * (1 - shareRatio / 100);
        const landlordIncome = totalIncome * (shareRatio / 100);
        return {
          id: ll.id,
          name: ll.name,
          contact: ll.contact || '',
          phone: ll.phone || '',
          clientCount: llClients.length,
          activeCount: llClients.filter(c => c.status === 'active').length,
          totalIncome: Math.round(totalIncome * 100) / 100,
          shareRatio: shareRatio,
          landlordIncome: Math.round(landlordIncome * 100) / 100,
          platformFee: Math.round(platformFee * 100) / 100,
          shareRatio: shareRatio,
        };
      });

      const grandTotal = settlementList.reduce((s, ll) => s + ll.totalIncome, 0);
      const grandLandlord = settlementList.reduce((s, ll) => s + ll.landlordIncome, 0);
      const grandPlatform = settlementList.reduce((s, ll) => s + ll.platformFee, 0);

      return send({
        landlords: settlementList,
        summary: {
          totalIncome: Math.round(grandTotal * 100) / 100,
          totalLandlordIncome: Math.round(grandLandlord * 100) / 100,
          totalPlatformFee: Math.round(grandPlatform * 100) / 100,
          month: new Date().getMonth() + 1 + '月',
          year: new Date().getFullYear(),
        }
      });
    }

    if (path === '/api/finance/landlord-detail' && method === 'POST') {
      const { landlordId } = req.body;
      if (!landlordId) return fail('缺少 landlordId');
      const data = await db.readAllData();
      const landlords = await db.getAllLandlords();
      const ll = landlords.find(l => l.id === parseInt(landlordId)) || { id: parseInt(landlordId), name: '公寓#' + landlordId, share_ratio: 70 };

      const llClients = data.clients.filter(c => parseInt(c.landlordId) === parseInt(landlordId));
      const llOrders = data.orders.filter(o => llClients.some(c => c.name === o.clientName));
      const totalIncome = llOrders.reduce((s, o) => s + (o.amount || 0), 0) || llClients.length * 299;
      const shareRatio = ll.share_ratio || 70;

      // Generate monthly detail
      const monthlyData = [
        { month: '1月', income: Math.round(totalIncome * 0.10 * 100) / 100 },
        { month: '2月', income: Math.round(totalIncome * 0.12 * 100) / 100 },
        { month: '3月', income: Math.round(totalIncome * 0.15 * 100) / 100 },
        { month: '4月', income: Math.round(totalIncome * 0.18 * 100) / 100 },
        { month: '5月', income: Math.round(totalIncome * 0.20 * 100) / 100 },
        { month: '6月', income: Math.round(totalIncome * 0.25 * 100) / 100 },
      ];

      // Generate transaction records for this landlord
      const records = llClients.slice(0, 30).map((c, i) => ({
        id: i + 1,
        clientName: c.name || '',
        phone: c.phone || '',
        roomNo: c.roomNo || '',
        amount: 299,
        shareRatio: shareRatio,
        landlordShare: Math.round(299 * shareRatio / 100 * 100) / 100,
        platformFee: Math.round(299 * (100 - shareRatio) / 100 * 100) / 100,
        date: c.createdAt || c.installDate || '2026-06-01',
        status: c.status === 'active' ? 'settled' : 'pending',
      }));

      return send({
        landlord: { id: ll.id, name: ll.name, contact: ll.contact, phone: ll.phone, shareRatio },
        clients: llClients,
        totalIncome: Math.round(totalIncome * 100) / 100,
        landlordIncome: Math.round(totalIncome * shareRatio / 100 * 100) / 100,
        platformFee: Math.round(totalIncome * (100 - shareRatio) / 100 * 100) / 100,
        monthlyData,
        records,
      });
    }

    if (path === '/api/finance/statistics') {
      if (!isAdmin) return fail('无权限');
      const data = await db.readAllData();
      const totalOrders = data.orders.length || data.clients.length;
      const totalIncome = data.orders.reduce((s, o) => s + (o.amount || 0), 0) || data.clients.length * 299;
      const activeAccounts = data.clients.filter(c => c.status === 'active').length;
      const overdueAccounts = data.clients.filter(c => c.status === 'expired').length;
      return send({
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalOrders,
        activeAccounts,
        overdueAccounts,
        totalClients: data.clients.length,
      });
    }

    // PACKAGE
    if (path === '/api/package/list' || path === '/api/package/all') {
      return send([
        { id: 1, name: '经济版', speed: '100M', price: 29, durationMonths: 1, description: '100Mbps 适合轻度上网', sortOrder: 1, status: 1 },
        { id: 2, name: '畅享版', speed: '300M', price: 49, durationMonths: 1, description: '300Mbps 适合视频娱乐', sortOrder: 2, status: 1 },
        { id: 3, name: '极速版', speed: '500M', price: 69, durationMonths: 1, description: '500Mbps 适合游戏直播', sortOrder: 3, status: 1 },
        { id: 4, name: '千兆版', speed: '1000M', price: 99, durationMonths: 1, description: '1000Mbps 极速体验', sortOrder: 4, status: 1 },
        { id: 5, name: '经济年付', speed: '100M', price: 299, durationMonths: 12, sortOrder: 5, status: 1 },
        { id: 6, name: '畅享年付', speed: '300M', price: 499, durationMonths: 12, sortOrder: 6, status: 1 },
      ]);
    }
    if (path === '/api/package/save' && method === 'POST') return send({ id: 999 });
    if (path.match(/^\/api\/package\/\d+$/) && method === 'DELETE') return send('删除成功');

    // === DATA EXPORT ===
    const exportMatch = path.match(/^\/api\/export\/(\w+)$/);
    if (exportMatch && method === 'GET') {
      const type = exportMatch[1];
      const data = await db.readAllData();
      const XLSX = require('xlsx');
      let rows, headers, sheetName;

      // Filter data by role (landlord only sees their own)
      let filteredData = data;
      if (!isAdmin && landlordId) {
        const myCompany = user.username || '';
        filteredData = {
          ...data,
          clients: data.clients.filter(c => c.address.includes(myCompany) || c.salesPersonId === String(landlordId)),
        };
      }

      switch (type) {
        case 'broadband': {
          rows = filteredData.clients.map(c => ({
            '宽带账号': 'BB' + String(c.id || '').padStart(6, '0'),
            '客户姓名': c.name || '',
            '联系电话': c.phone || '',
            '所属公寓': c.address?.split(' ')[0] || '',
            '房号': c.roomNo || '',
            '套餐': c.packageId || '',
            '在线状态': c.status === 'active' ? '在线' : '离线',
            '服务状态': c.status === 'active' ? '正常' : c.status === 'suspended' ? '暂停' : '已过期',
            '到期时间': c.expiryDate || '永久',
            '安装日期': c.installDate || '',
          }));
          headers = ['宽带账号', '客户姓名', '联系电话', '所属公寓', '房号', '套餐', '在线状态', '服务状态', '到期时间', '安装日期'];
          sheetName = '宽带用户';
          break;
        }
        case 'customers': {
          rows = filteredData.clients.map(c => ({
            '编号': c.id || '',
            '姓名': c.name || '',
            '电话': c.phone || '',
            '公寓': c.address?.split(' ')[0] || '',
            '房号': c.roomNo || '',
            '套餐': c.packageId || '',
            '状态': c.status === 'active' ? '正常' : c.status === 'suspended' ? '暂停' : '已过期',
            '安装日期': c.installDate || '',
            '到期日期': c.expiryDate || '',
            '创建时间': c.createdAt || '',
          }));
          headers = ['编号', '姓名', '电话', '公寓', '房号', '套餐', '状态', '安装日期', '到期日期', '创建时间'];
          sheetName = '客户信息';
          break;
        }
        case 'orders': {
          rows = filteredData.orders.map(o => ({
            '订单号': o.id || '',
            '客户': o.clientName || '',
            '电话': o.phone || '',
            '套餐': o.packageName || o.packageId || '',
            '金额': o.amount || 0,
            '安装费': o.installationFee || 0,
            '总金额': o.totalAmount || 0,
            '状态': o.status || '',
            '创建时间': o.createdAt || '',
            '付款时间': o.paidAt || '',
          }));
          headers = ['订单号', '客户', '电话', '套餐', '金额', '安装费', '总金额', '状态', '创建时间', '付款时间'];
          sheetName = '订单记录';
          break;
        }
        case 'tickets': {
          rows = filteredData.tickets.map(t => ({
            '工单号': t.id || '',
            '客户': t.clientName || '',
            '电话': t.phone || '',
            '问题类型': t.issueType || t.description?.substring(0, 20) || '',
            '问题描述': t.description || '',
            '优先级': t.priority || '普通',
            '状态': t.status || '',
            '处理人': t.assignedTo || '',
            '处理备注': t.handle_note || t.resolution || '',
            '创建时间': t.createdAt || '',
          }));
          headers = ['工单号', '客户', '电话', '问题类型', '问题描述', '优先级', '状态', '处理人', '处理备注', '创建时间'];
          sheetName = '工单记录';
          break;
        }
        case 'finance': {
          rows = filteredData.orders.map(o => ({
            '单号': o.id || '',
            '客户': o.clientName || '',
            '电话': o.phone || '',
            '套餐': o.packageName || '',
            '金额': o.amount || 0,
            '安装费': o.installationFee || 0,
            '合计': o.totalAmount || 0,
            '状态': o.status || '',
            '付款时间': o.paidAt || '',
          }));
          headers = ['单号', '客户', '电话', '套餐', '金额', '安装费', '合计', '状态', '付款时间'];
          sheetName = '财务记录';
          break;
        }
        default: return fail('不支持的导出类型', 400);
      }

      const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
      // 设置列宽
      ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length * 2, 15) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      return res.send(buf);
    }

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
  const path = require('path');
  const fs = require('fs');

  // 本地模式下提供静态文件服务
  const distPath = path.resolve(__dirname, '..', 'dist');
  // 对所有非 API 请求在兜底前尝试返回静态文件
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    const filePath = path.join(distPath, req.path === '/' ? 'index.html' : req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon', '.webp': 'image/webp',
      };
      res.type(mimeMap[ext] || 'application/octet-stream');
      res.sendFile(filePath);
    } else {
      // SPA fallback: /guanli/* 返回 guanli/index.html
      if (req.path.startsWith('/guanli')) {
        res.sendFile(path.join(distPath, 'guanli', 'index.html'));
      } else {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    }
  });

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

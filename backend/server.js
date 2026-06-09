const express = require('express');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');
const http = require('http');
const multer = require('multer');
const net = require('net');
const url = require('url');
const db = require('./db');

// 企业微信适配模块
const { decryptMessage, encryptMessage, generateSignature, buildReplyXml } = require('./wechat/wechat-crypto');
const { handleWeChatCallback, handleVerifyUrl } = require('./wechat/wechat-handler');

// 加载 .env 文件（如果存在）
try {
  const envPath = path.resolve(__dirname, '..', 'ai-customer-service', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) return;
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      if (key && !process.env[key]) {
        process.env[key] = val.replace(/^["']|["']$/g, '');
      }
    });
    console.log('✓ .env 配置已加载');
  }
} catch (e) {
  // ignore
}

const app = express();
const PORT = parseInt(process.env.PORT) || 3456;
const DATA_DIR = path.join(__dirname, '..', '数据');

// CORS 支持（允许 tailscale 等自定义域名访问）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

// ============================================================
// 照片上传配置
// ============================================================
const STORAGE_DIR = path.join(__dirname, '..', 'storage');
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

// 安全地解析路径，防止路径穿越
function safeResolve(base, userPath) {
  const target = path.resolve(base, userPath || '.');
  if (!target.startsWith(path.resolve(base))) return null;
  return target;
}

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subdir = req.query.dir || '';
    const dest = safeResolve(STORAGE_DIR, subdir);
    if (!dest) return cb(new Error('非法路径'));
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
    cb(null, name);
  },
});
const upload = multer({
  storage: photoStorage,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10GB
});

// ============================================================
// 数据存储：统一使用 SQLite（与 AI 客服共用同一数据库）
// 导出 Excel 功能保留，方便手动编辑数据
// ============================================================

// ============================================================
// Excel 导入/导出（保留手动编辑功能）
// ============================================================
function excelFilePath(name) {
  return path.join(DATA_DIR, `${name}.xlsx`);
}

function readSheet(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

function writeSheet(filePath, data, columns) {
  const ws = XLSX.utils.json_to_sheet(data, { header: columns });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filePath);
}

// ============================================================
// API 路由
// ============================================================

// 获取全部数据（从 SQLite 读取）
app.get('/api/data', (req, res) => {
  try {
    const data = db.readAllData();
    res.json({ success: true, data, packages: data.packages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 保存全部数据（写入 SQLite + 同步导出 Excel）
app.post('/api/data', (req, res) => {
  try {
    db.writeAllData(req.body);
    // 同步导出 Excel（保留手动编辑能力）
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const data = db.readAllData();
      const fileDefs = [
        { name: '客户信息', data: data.clients, cols: ['id', 'name', 'phone', 'address', 'roomNo', 'packageId', 'status', 'installDate', 'expiryDate', 'createdAt', 'salesPersonId'] },
        { name: '订单记录', data: data.orders, cols: ['id', 'clientId', 'clientName', 'phone', 'packageId', 'packageName', 'amount', 'installationFee', 'totalAmount', 'status', 'createdAt', 'paidAt', 'salesPersonId'] },
        { name: '销售线索', data: data.leads, cols: ['id', 'name', 'phone', 'address', 'source', 'status', 'notes', 'assignedTo', 'createdAt', 'updatedAt'] },
        { name: '维护工单', data: data.tickets, cols: ['id', 'clientId', 'clientName', 'phone', 'address', 'issueType', 'description', 'priority', 'status', 'assignedTo', 'createdAt', 'resolvedAt', 'resolution'] },
        { name: '员工信息', data: data.staff, cols: ['id', 'name', 'phone', 'role', 'status', 'joinDate', 'password'] },
        { name: '套餐配置', data: (data.packages || []).map(p => ({ ...p, features: JSON.stringify(p.features) })), cols: ['id', 'name', 'speed', 'durationMonths', 'price', 'installationFee', 'totalPrice', 'features'] },
      ];
      for (const f of fileDefs) {
        writeSheet(excelFilePath(f.name), f.data, f.cols);
      }
    } catch (e) { console.error('Excel 导出失败:', e.message); }
    res.json({ success: true, message: '数据已保存（SQLite + Excel）' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 导出 Excel 文件（供下载）
app.get('/api/export', (req, res) => {
  try {
    const data = db.readAllData();
    const fileDefs = [
      { name: 'clients', label: '客户信息', data: data.clients, cols: ['id', 'name', 'phone', 'address', 'roomNo', 'packageId', 'status', 'installDate', 'expiryDate', 'createdAt', 'salesPersonId'] },
      { name: 'orders', label: '订单记录', data: data.orders, cols: ['id', 'clientId', 'clientName', 'phone', 'packageId', 'packageName', 'amount', 'installationFee', 'totalAmount', 'status', 'createdAt', 'paidAt', 'salesPersonId'] },
      { name: 'leads', label: '销售线索', data: data.leads, cols: ['id', 'name', 'phone', 'address', 'source', 'status', 'notes', 'assignedTo', 'createdAt', 'updatedAt'] },
      { name: 'tickets', label: '维护工单', data: data.tickets, cols: ['id', 'clientId', 'clientName', 'phone', 'address', 'issueType', 'description', 'priority', 'status', 'assignedTo', 'createdAt', 'resolvedAt', 'resolution'] },
      { name: 'staff', label: '员工信息', data: data.staff, cols: ['id', 'name', 'phone', 'role', 'status', 'joinDate', 'password'] },
      { name: 'packages', label: '套餐配置', data: (data.packages || []).map(p => ({ ...p, features: JSON.stringify(p.features) })), cols: ['id', 'name', 'speed', 'durationMonths', 'price', 'installationFee', 'totalPrice', 'features'] },
    ];

    const AdmZip = (() => { try { return require('adm-zip'); } catch { return null; } })();
    if (AdmZip) {
      const zip = new AdmZip();
      for (const f of fileDefs) {
        const ws = XLSX.utils.json_to_sheet(f.data, { header: f.cols });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        zip.addFile(f.name + '.xlsx', XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
      }
      res.set('Content-Type', 'application/zip');
      res.set('Content-Disposition', 'attachment; filename=data-export.zip');
      res.send(zip.toBuffer());
    } else {
      // 无 adm-zip，逐个导出第一个表
      const tgt = fileDefs[0];
      const ws = XLSX.utils.json_to_sheet(tgt.data, { header: tgt.cols });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.set('Content-Disposition', 'attachment; filename=clients.xlsx');
      res.send(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 重置数据
app.post('/api/reset', (req, res) => {
  try {
    db.seedIfEmpty();
    res.json({ success: true, message: '数据已重置为初始演示数据' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 文件管理器 API
// ============================================================

// 上传文件（支持 ?dir= 指定子目录）
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: '未收到文件' });
  res.json({ success: true, name: req.file.filename, originalName: req.file.originalname, size: req.file.size, type: req.file.mimetype });
});

// 批量上传
app.post('/api/upload-multiple', upload.array('files', 50), (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ success: false, error: '未收到文件' });
  const result = req.files.map(f => ({ name: f.filename, originalName: f.originalname, size: f.size, type: f.mimetype }));
  res.json({ success: true, files: result });
});

// 列出目录内容
app.get('/api/files', (req, res) => {
  try {
    const dir = req.query.dir || '';
    const target = safeResolve(STORAGE_DIR, dir);
    if (!target) return res.status(400).json({ success: false, error: '非法路径' });
    if (!fs.existsSync(target)) return res.json({ success: true, path: dir, entries: [] });

    const entries = fs.readdirSync(target, { withFileTypes: true }).map(dirent => {
      const fullPath = path.join(target, dirent.name);
      const stat = fs.statSync(fullPath);
      const relativePath = dir ? dir + '/' + dirent.name : dirent.name;
      return {
        name: dirent.name,
        path: relativePath,
        isDir: dirent.isDirectory(),
        size: dirent.isDirectory() ? 0 : stat.size,
        mtime: stat.mtimeMs,
        mtimeStr: new Date(stat.mtime).toLocaleString('zh-CN'),
      };
    });

    // 目录排前，按名称排序
    entries.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name, 'zh-CN');
    });

    res.json({ success: true, path: dir, entries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 创建目录
app.post('/api/mkdir', (req, res) => {
  try {
    const { dir } = req.body;
    if (!dir) return res.status(400).json({ success: false, error: '缺少目录名' });
    const target = safeResolve(STORAGE_DIR, dir);
    if (!target) return res.status(400).json({ success: false, error: '非法路径' });
    if (fs.existsSync(target)) return res.status(400).json({ success: false, error: '目录已存在' });
    fs.mkdirSync(target, { recursive: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 删除文件或目录
app.post('/api/delete', (req, res) => {
  try {
    const { path: targetPath } = req.body;
    if (!targetPath) return res.status(400).json({ success: false, error: '缺少路径' });
    const target = safeResolve(STORAGE_DIR, targetPath);
    if (!target) return res.status(400).json({ success: false, error: '非法路径' });
    if (!fs.existsSync(target)) return res.status(404).json({ success: false, error: '文件不存在' });
    if (fs.statSync(target).isDirectory()) {
      fs.rmSync(target, { recursive: true, force: true });
    } else {
      fs.unlinkSync(target);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 重命名
app.post('/api/rename', (req, res) => {
  try {
    const { path: oldPath, name: newName } = req.body;
    if (!oldPath || !newName) return res.status(400).json({ success: false, error: '缺少参数' });
    const src = safeResolve(STORAGE_DIR, oldPath);
    const dst = safeResolve(path.dirname(src), newName);
    if (!src || !dst) return res.status(400).json({ success: false, error: '非法路径' });
    if (!fs.existsSync(src)) return res.status(404).json({ success: false, error: '文件不存在' });
    fs.renameSync(src, dst);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 下载文件（支持 ?dir= 指定子目录中的文件）
app.get('/api/download', (req, res) => {
  try {
    const filePath = req.query.path || req.query.file;
    if (!filePath) return res.status(400).json({ success: false, error: '缺少参数' });
    const target = safeResolve(STORAGE_DIR, filePath);
    if (!target) return res.status(400).json({ success: false, error: '非法路径' });
    if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      return res.status(404).json({ success: false, error: '文件不存在' });
    }
    const name = path.basename(filePath);
    res.download(target, name);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取存储信息
app.get('/api/storage-info', (req, res) => {
  try {
    function getDirSize(dirPath) {
      let total = 0;
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const e of entries) {
          const full = path.join(dirPath, e.name);
          if (e.isDirectory()) total += getDirSize(full);
          else total += fs.statSync(full).size;
        }
      } catch {}
      return total;
    }
    const usedBytes = getDirSize(STORAGE_DIR);
    res.json({ success: true, usedBytes, usedStr: (usedBytes / (1024*1024*1024)).toFixed(2) + ' GB' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 静态文件服务（前端 dist）
// ============================================================
const distPath = path.resolve(__dirname, '..', 'dist');
console.log('静态文件目录:', distPath);

app.use('/storage', express.static(STORAGE_DIR));

// SPA fallback：非 API 非 storage 请求返回对应的 index.html
app.use((req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/storage/') || res.headersSent) return;
  try {
    res.type('text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    // /guanli/ 路径走管理后台 SPA
    if (req.path.startsWith('/guanli')) {
      res.send(fs.readFileSync(path.join(distPath, 'guanli', 'index.html')));
    } else {
      res.send(fs.readFileSync(path.join(distPath, 'index.html')));
    }
  } catch (err) {
    res.status(404).send('Not found');
  }
});

// ============================================================
// 端口检查
// ============================================================
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => { tester.close(); resolve(true); })
      .listen(port);
  });
}

function killProcessOnPort(port) {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32'
      ? `for /f "tokens=5" %a in ('netstat -ano ^| findstr ":${port}"') do @taskkill /f /pid %a >nul 2>&1`
      : `lsof -ti:${port} | xargs kill -9 2>/dev/null`;
    require('child_process').exec(cmd, () => resolve());
  });
}

// ============================================================
// 启动（带端口冲突自动修复）
// ============================================================
async function startServer() {
  console.log('DVS网络 — 本地服务启动中...');
  console.log(`数据库: ${path.resolve(__dirname, '..', 'ai-customer-service', 'backend', 'data', 'broadband_cs.db')}`);
  console.log(`Excel导出目录: ${DATA_DIR}`);
  db.seedIfEmpty();

  // 检查并释放端口
  if (!(await isPortAvailable(PORT))) {
    console.log(`⚠ 端口 ${PORT} 已被占用，正在自动释放...`);
    await killProcessOnPort(PORT);
    // 等待操作系统释放端口
    await new Promise(r => setTimeout(r, 1500));
    if (!(await isPortAvailable(PORT))) {
      console.error(`✗ 无法释放端口 ${PORT}，请手动关闭占用程序后重试`);
      process.exit(1);
    }
    console.log(`✓ 端口 ${PORT} 已释放`);
  }
  console.log('');

  // AI 服务代理地址
  const AI_TARGET = process.env.AI_API_URL || 'http://localhost:3002';

  // 使用原生 HTTP 服务包装（绕开 Windows 上 express.static/res.sendFile 异常）
  const rawServer = http.createServer((req, res) => {
    const url = req.url || '';

    // 代理 AI 相关 API 到 NestJS 后端
    if (url.startsWith('/api/ai/')) {
      const options = {
        hostname: new URL(AI_TARGET).hostname,
        port: new URL(AI_TARGET).port || 3002,
        path: url,
        method: req.method,
        headers: { ...req.headers, host: new URL(AI_TARGET).host },
      };
      const proxyReq = http.request(options, (proxyRes) => {
        // 转发 AI 后端的 Set-Cookie
        if (proxyRes.headers['set-cookie']) {
          res.setHeader('set-cookie', proxyRes.headers['set-cookie']);
        }
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(res);
      });
      proxyReq.on('error', () => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'AI 服务暂不可用' }));
      });
      req.pipe(proxyReq);
      return;
    }

    // 企业微信回调 - URL验证 GET /api/wechat/callback?echostr=xxx
    if (url.startsWith('/api/wechat/') && req.method === 'GET') {
      const parsedUrl = new URL(url, `http://${req.headers.host || 'localhost'}`);
      const echostr = parsedUrl.searchParams.get('echostr');
      if (echostr) {
        if (wxEnabled) {
          const query = {
            msg_signature: parsedUrl.searchParams.get('msg_signature') || '',
            timestamp: parsedUrl.searchParams.get('timestamp') || '',
            nonce: parsedUrl.searchParams.get('nonce') || '',
            echostr,
          };
          const result = handleVerifyUrl(WX_CONFIG, query);
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end(result || echostr);
        } else {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end(echostr);
        }
        return;
      }
    }

    // 企业微信消息回调 POST /api/wechat/callback
    if (url.startsWith('/api/wechat/callback') && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        if (!wxEnabled) {
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('success');
          return;
        }
        try {
          const result = await handleWeChatCallback(WX_CONFIG, body);
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(result.reply || 'success');
        } catch (e) {
          console.error('微信回调错误:', e.message);
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('success');
        }
      });
      return;
    }

    // ===== /guanli/ 管理后台 SPA 回退 =====
    if (url.startsWith('/guanli/') || url === '/guanli') {
      const cleanPath = url.split('?')[0].split('#')[0];
      let filePath = path.join(distPath, cleanPath === '/guanli' ? 'guanli/index.html' : cleanPath);
      if (!path.extname(filePath)) filePath = path.join(filePath, 'index.html');
      try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const mimeMap = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'text/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
            '.gif': 'image/gif', '.svg': 'image/svg+xml',
            '.txt': 'text/plain; charset=utf-8',
            '.ico': 'image/x-icon', '.webp': 'image/webp',
            '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
            '.pdf': 'application/pdf',
          };
          res.writeHead(200, {
            'Content-Type': mimeMap[ext] || 'application/octet-stream',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          });
          res.end(fs.readFileSync(filePath));
          return;
        }
      } catch (e) { /* fall through to SPA fallback */ }
      // SPA fallback: all /guanli/* routes serve guanli/index.html
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
      res.end(fs.readFileSync(path.join(distPath, 'guanli', 'index.html')));
      return;
    }

    if (!url.startsWith('/api/') && !url.startsWith('/storage/')) {
      const cleanPath = url.split('?')[0].split('#')[0];
      let filePath = path.join(distPath, cleanPath === '/' ? '' : cleanPath);
      if (!path.extname(filePath)) filePath = path.join(filePath, 'index.html');
      try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const mimeMap = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'text/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
            '.gif': 'image/gif', '.svg': 'image/svg+xml',
            '.txt': 'text/plain; charset=utf-8',
            '.ico': 'image/x-icon', '.webp': 'image/webp',
            '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
            '.pdf': 'application/pdf',
          };
          res.writeHead(200, {
            'Content-Type': mimeMap[ext] || 'application/octet-stream',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          });
          let content = fs.readFileSync(filePath);
          // 在 HTML 中注入版本标记（方便验证部署是否生效）
          if (ext === '.html') {
            const ver = Date.now().toString(36);
            content = content.toString().replace('</body>', `<div id="__dv_ver" style="position:fixed;top:2px;right:2px;z-index:99999;background:#f59e0b;color:#000;font-size:10px;padding:1px 4px;border-radius:3px;font-family:sans-serif">${ver}</div></body>`);
          }
          res.end(content);
          return;
        }
      } catch (e) { /* fall through to express */ }
    }
    app(req, res);
  });

  rawServer.listen(PORT, () => {
    console.log(`✓ 服务已启动！
  ─────────────────────────────
  本地访问: http://localhost:${PORT}
  数据目录: ${DATA_DIR}
  企业微信: ${wxEnabled ? '已配置 ✓' : '未配置（在 .env 中设置 WX_* 变量即可启用）'}
  ─────────────────────────────
  打开 Excel 文件直接修改数据，
  修改后刷新网页即可生效。`);
  });
}

startServer();

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '..', 'ai-customer-service', 'backend', 'data', 'broadband_cs.db');
const DATA_DIR = path.resolve(__dirname, '..', '数据');

let db;

function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      wechat_id TEXT NOT NULL DEFAULT '',
      project_name TEXT NOT NULL DEFAULT '',
      building_name TEXT NOT NULL DEFAULT '',
      room_no TEXT NOT NULL DEFAULT '',
      package_name TEXT NOT NULL DEFAULT '',
      package_id TEXT NOT NULL DEFAULT '',
      status INTEGER NOT NULL DEFAULT 1,
      expire_time DATETIME,
      install_date TEXT DEFAULT '',
      sales_person_id TEXT DEFAULT '',
      remark TEXT,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_customer_phone ON customer(phone);
    CREATE INDEX IF NOT EXISTS idx_customer_wechat ON customer(wechat_id);

    CREATE TABLE IF NOT EXISTS "order" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL DEFAULT '',
      client_id TEXT NOT NULL DEFAULT '',
      client_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      package_id TEXT NOT NULL DEFAULT '',
      package_name TEXT NOT NULL DEFAULT '',
      amount REAL DEFAULT 0,
      installation_fee REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      sales_person_id TEXT DEFAULT '',
      paid_at DATETIME,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_order_client ON "order"(client_id);

    CREATE TABLE IF NOT EXISTS lead (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      address TEXT DEFAULT '',
      source TEXT DEFAULT 'online',
      status TEXT DEFAULT 'new',
      notes TEXT DEFAULT '',
      assigned_to TEXT DEFAULT '',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT '',
      status TEXT DEFAULT 'active',
      join_date TEXT DEFAULT '',
      password TEXT DEFAULT '',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS package (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_name TEXT NOT NULL DEFAULT '',
      speed TEXT DEFAULT '',
      price REAL DEFAULT 0,
      duration_days INTEGER DEFAULT 30,
      duration_months INTEGER DEFAULT 6,
      installation_fee REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      features TEXT DEFAULT '[]',
      description TEXT,
      status INTEGER DEFAULT 1,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ticket (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_no TEXT NOT NULL,
      customer_id INTEGER,
      wechat_id TEXT DEFAULT '',
      customer_name TEXT DEFAULT '',
      room_no TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      client_id TEXT DEFAULT '',
      issue_type TEXT DEFAULT '',
      problem TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      images TEXT,
      status INTEGER DEFAULT 0,
      handler TEXT DEFAULT '',
      handle_note TEXT,
      source TEXT DEFAULT 'wechat',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_no ON ticket(ticket_no);
    CREATE INDEX IF NOT EXISTS idx_ticket_status ON ticket(status);
    CREATE INDEX IF NOT EXISTS idx_ticket_wechat ON ticket(wechat_id);
  `);

  // 兼容 NestJS TypeORM 自动创建的表（可能缺少扩展字段）
  const ensureColumn = (table, col, def) => {
    try {
      const existing = db.prepare(`PRAGMA table_info(${table})`).all().map(r => r.name);
      if (!existing.includes(col)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
      }
    } catch (e) { /* table might not exist yet */ }
  };
  ensureColumn('customer', 'package_id', 'TEXT DEFAULT ""');
  ensureColumn('customer', 'install_date', 'TEXT DEFAULT ""');
  ensureColumn('customer', 'sales_person_id', 'TEXT DEFAULT ""');
  ensureColumn('ticket', 'client_id', 'TEXT DEFAULT ""');
  ensureColumn('ticket', 'issue_type', 'TEXT DEFAULT ""');
  ensureColumn('ticket', 'priority', 'TEXT DEFAULT "medium"');
  ensureColumn('package', 'duration_months', 'INTEGER DEFAULT 6');
  ensureColumn('package', 'installation_fee', 'REAL DEFAULT 0');
  ensureColumn('package', 'total_price', 'REAL DEFAULT 0');
  ensureColumn('package', 'features', 'TEXT DEFAULT "[]"');
}

// ====== Customer CRUD ======
function getAllCustomers() {
  return getDb().prepare('SELECT * FROM customer ORDER BY id').all();
}

function getCustomerByPhone(phone) {
  if (!phone) return null;
  return getDb().prepare('SELECT * FROM customer WHERE phone = ?').get(phone);
}

function getCustomerByWechat(wechatId) {
  if (!wechatId) return null;
  return getDb().prepare('SELECT * FROM customer WHERE wechat_id = ?').get(wechatId);
}

// ====== Package CRUD ======
function getAllPackages() {
  return getDb().prepare('SELECT * FROM package ORDER BY id').all();
}

// ====== Ticket CRUD ======
function getAllTickets() {
  return getDb().prepare('SELECT * FROM ticket ORDER BY id').all();
}

// ====== Order CRUD ======
function getAllOrders() {
  return getDb().prepare('SELECT * FROM "order" ORDER BY id').all();
}

// ====== Lead CRUD ======
function getAllLeads() {
  return getDb().prepare('SELECT * FROM lead ORDER BY id').all();
}

// ====== Staff CRUD ======
function getAllStaff() {
  return getDb().prepare('SELECT * FROM staff ORDER BY id').all();
}

// ====== Read All ======
function readAllData() {
  return {
    clients: getAllCustomers().map(c => ({
      id: c.id?.toString() || '',
      name: c.name || '',
      phone: c.phone || '',
      address: c.project_name + (c.building_name ? ' ' + c.building_name : '') + (c.room_no ? ' ' + c.room_no : ''),
      roomNo: c.room_no || '',
      packageId: c.package_id || c.package_name || '',
      status: ['suspended', 'active', 'cancelled'][c.status] || (c.status === 1 ? 'active' : 'suspended'),
      installDate: c.install_date || '',
      expiryDate: c.expire_time || '',
      createdAt: c.create_time || '',
      salesPersonId: c.sales_person_id || '',
    })),
    orders: getAllOrders().map(o => ({
      id: o.order_id || o.id?.toString() || '',
      clientId: o.client_id || '',
      clientName: o.client_name || '',
      phone: o.phone || '',
      packageId: o.package_id || '',
      packageName: o.package_name || '',
      amount: o.amount || 0,
      installationFee: o.installation_fee || 0,
      totalAmount: o.total_amount || 0,
      status: o.status || 'active',
      createdAt: o.create_time || '',
      paidAt: o.paid_at || '',
      salesPersonId: o.sales_person_id || '',
    })),
    leads: getAllLeads().map(l => ({
      id: l.lead_id || l.id?.toString() || '',
      name: l.name || '',
      phone: l.phone || '',
      address: l.address || '',
      source: l.source || 'online',
      status: l.status || 'new',
      notes: l.notes || '',
      assignedTo: l.assigned_to || '',
      createdAt: l.create_time || '',
      updatedAt: l.update_time || '',
    })),
    tickets: getAllTickets().map(t => ({
      id: t.ticket_no || t.id?.toString() || '',
      clientId: t.client_id || '',
      clientName: t.customer_name || '',
      phone: t.phone || '',
      address: '',
      issueType: t.issue_type || '',
      description: t.problem || '',
      priority: t.priority || 'medium',
      status: ['pending', 'assigned', 'in_progress', 'resolved', 'closed'][t.status] || 'pending',
      assignedTo: t.handler || '',
      createdAt: t.create_time || '',
      resolvedAt: '',
      resolution: t.handle_note || '',
    })),
    staff: getAllStaff().map(s => ({
      id: s.staff_id || s.id?.toString() || '',
      name: s.name || '',
      phone: s.phone || '',
      role: s.role || '',
      status: s.status || 'active',
      joinDate: s.join_date || '',
      password: s.password || '',
    })),
    packages: getAllPackages().map(p => ({
      id: p.id?.toString() || '',
      name: p.package_name || '',
      speed: p.speed || '',
      durationMonths: p.duration_months || Math.round(p.duration_days / 30) || 6,
      price: p.price || 0,
      installationFee: p.installation_fee || 0,
      totalPrice: p.total_price || 0,
      features: (() => { try { return JSON.parse(p.features || '[]'); } catch { return []; } })(),
    })),
  };
}

// ====== Write All ======
function writeAllData(data) {
  const _db = getDb();
  const tx = _db.transaction(() => {
    // Customers
    if (data.clients) {
      _db.prepare('DELETE FROM customer').run();
      const stmt = _db.prepare(`INSERT INTO customer (name, phone, wechat_id, project_name, building_name, room_no, package_name, package_id, status, expire_time, install_date, sales_person_id, create_time)
        VALUES (@name, @phone, @phone, @project_name, @building_name, @roomNo, @package_name, @packageId, @status, @expire_time, @installDate, @salesPersonId, @createdAt)`);
      for (const c of data.clients) {
        stmt.run({
          name: c.name || '',
          phone: c.phone || '',
          project_name: (c.address || '').split(' ')[0] || '',
          building_name: (c.address || '').split(' ')[1] || '',
          roomNo: c.roomNo || '',
          package_name: c.packageId || '',
          packageId: c.packageId || '',
          status: c.status === 'active' || c.status === 'pending_install' ? 1 : c.status === 'cancelled' ? 2 : 0,
          expire_time: c.expiryDate || null,
          installDate: c.installDate || '',
          salesPersonId: c.salesPersonId || '',
          createdAt: c.createdAt || new Date().toISOString(),
        });
      }
    }

    // Orders
    if (data.orders) {
      _db.prepare('DELETE FROM "order"').run();
      const stmt = _db.prepare(`INSERT INTO "order" (order_id, client_id, client_name, phone, package_id, package_name, amount, installation_fee, total_amount, status, sales_person_id, paid_at, create_time)
        VALUES (@order_id, @clientId, @clientName, @phone, @packageId, @packageName, @amount, @installationFee, @totalAmount, @status, @salesPersonId, @paidAt, @createdAt)`);
      for (const o of data.orders) {
        stmt.run({
          order_id: o.id || '',
          clientId: o.clientId || '',
          clientName: o.clientName || '',
          phone: o.phone || '',
          packageId: o.packageId || '',
          packageName: o.packageName || '',
          amount: o.amount || 0,
          installationFee: o.installationFee || 0,
          totalAmount: o.totalAmount || 0,
          status: o.status || 'active',
          salesPersonId: o.salesPersonId || '',
          paidAt: o.paidAt || null,
          createdAt: o.createdAt || new Date().toISOString(),
        });
      }
    }

    // Leads
    if (data.leads) {
      _db.prepare('DELETE FROM lead').run();
      const stmt = _db.prepare(`INSERT INTO lead (lead_id, name, phone, address, source, status, notes, assigned_to, create_time, update_time)
        VALUES (@lead_id, @name, @phone, @address, @source, @status, @notes, @assignedTo, @createdAt, @updatedAt)`);
      for (const l of data.leads) {
        stmt.run({
          lead_id: l.id || '',
          name: l.name || '',
          phone: l.phone || '',
          address: l.address || '',
          source: l.source || 'online',
          status: l.status || 'new',
          notes: l.notes || '',
          assignedTo: l.assignedTo || '',
          createdAt: l.createdAt || new Date().toISOString(),
          updatedAt: l.updatedAt || l.createdAt || new Date().toISOString(),
        });
      }
    }

    // Tickets
    if (data.tickets) {
      _db.prepare('DELETE FROM ticket').run();
      const stmt = _db.prepare(`INSERT INTO ticket (ticket_no, client_id, customer_name, phone, issue_type, problem, priority, status, handler, handle_note, create_time)
        VALUES (@ticket_no, @clientId, @customer_name, @phone, @issue_type, @problem, @priority, @status, @handler, @handle_note, @createdAt)`);
      for (const t of data.tickets) {
        stmt.run({
          ticket_no: t.id || '',
          clientId: t.clientId || '',
          customer_name: t.clientName || '',
          phone: t.phone || '',
          issue_type: t.issueType || '',
          problem: t.description || '',
          priority: t.priority || 'medium',
          status: ['pending', 'assigned', 'in_progress', 'resolved', 'closed'].indexOf(t.status),
          handler: t.assignedTo || '',
          handle_note: t.resolution || '',
          createdAt: t.createdAt || new Date().toISOString(),
        });
      }
    }

    // Staff
    if (data.staff) {
      _db.prepare('DELETE FROM staff').run();
      const stmt = _db.prepare(`INSERT INTO staff (staff_id, name, phone, role, status, join_date, password, create_time)
        VALUES (@staff_id, @name, @phone, @role, @status, @joinDate, @password, @createdAt)`);
      for (const s of data.staff) {
        stmt.run({
          staff_id: s.id || '',
          name: s.name || '',
          phone: s.phone || '',
          role: s.role || '',
          status: s.status || 'active',
          joinDate: s.joinDate || '',
          password: s.password || '',
          createdAt: s.createdAt || new Date().toISOString(),
        });
      }
    }

    // Packages
    if (data.packages) {
      _db.prepare('DELETE FROM package').run();
      const stmt = _db.prepare(`INSERT INTO package (package_name, speed, duration_months, price, installation_fee, total_price, features, description, status)
        VALUES (@package_name, @speed, @durationMonths, @price, @installationFee, @totalPrice, @features, @description, 1)`);
      for (const p of data.packages) {
        stmt.run({
          package_name: p.name || '',
          speed: p.speed || '',
          durationMonths: p.durationMonths || 6,
          price: p.price || 0,
          installationFee: p.installationFee || 0,
          totalPrice: p.totalPrice || 0,
          features: JSON.stringify(p.features || []),
          description: p.description || '',
        });
      }
    }
  });
  tx();
}

// ====== Excel Import ======
function importFromExcel() {
  const XLSX = require('xlsx');
  const excelFiles = [
    { name: '客户信息', key: 'clients' },
    { name: '订单记录', key: 'orders' },
    { name: '销售线索', key: 'leads' },
    { name: '维护工单', key: 'tickets' },
    { name: '员工信息', key: 'staff' },
    { name: '套餐配置', key: 'packages' },
  ];

  const data = {};
  for (const f of excelFiles) {
    const fp = path.join(DATA_DIR, `${f.name}.xlsx`);
    if (fs.existsSync(fp)) {
      const wb = XLSX.readFile(fp);
      const ws = wb.Sheets[wb.SheetNames[0]];
      data[f.key] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    }
  }

  if (Object.keys(data).length > 0) {
    writeAllData(data);
    console.log('  ✓ Excel 数据已导入 SQLite');
    return true;
  }
  return false;
}

// ====== Export to Excel ======
function exportToExcel() {
  const XLSX = require('xlsx');
  const data = readAllData();
  const fileDefs = [
    { name: '客户信息', data: data.clients, cols: ['id', 'name', 'phone', 'address', 'roomNo', 'packageId', 'status', 'installDate', 'expiryDate', 'createdAt', 'salesPersonId'] },
    { name: '订单记录', data: data.orders, cols: ['id', 'clientId', 'clientName', 'phone', 'packageId', 'packageName', 'amount', 'installationFee', 'totalAmount', 'status', 'createdAt', 'paidAt', 'salesPersonId'] },
    { name: '销售线索', data: data.leads, cols: ['id', 'name', 'phone', 'address', 'source', 'status', 'notes', 'assignedTo', 'createdAt', 'updatedAt'] },
    { name: '维护工单', data: data.tickets, cols: ['id', 'clientId', 'clientName', 'phone', 'address', 'issueType', 'description', 'priority', 'status', 'assignedTo', 'createdAt', 'resolvedAt', 'resolution'] },
    { name: '员工信息', data: data.staff, cols: ['id', 'name', 'phone', 'role', 'status', 'joinDate', 'password'] },
    { name: '套餐配置', data: (data.packages || []).map(p => ({ ...p, features: JSON.stringify(p.features) })), cols: ['id', 'name', 'speed', 'durationMonths', 'price', 'installationFee', 'totalPrice', 'features'] },
  ];

  const results = {};
  for (const f of fileDefs) {
    const ws = XLSX.utils.json_to_sheet(f.data, { header: f.cols });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    results[f.name] = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
  return results;
}

// ====== Seed / import data on startup ======
function seedIfEmpty() {
  // 优先从 Excel 导入（Excel 是管理员手动编辑的数据源）
  const hasExcel = fs.existsSync(DATA_DIR) && fs.readdirSync(DATA_DIR).some(f => f.endsWith('.xlsx'));
  if (hasExcel) {
    const ordersCount = getDb().prepare('SELECT COUNT(*) as c FROM "order"').get().c;
    // 只有订单/线索等表为空时才从 Excel 导入（避免覆盖已有数据）
    if (ordersCount === 0) {
      console.log('  ✓ 检测到 Excel 数据文件，正在导入 SQLite...');
      importFromExcel();
      return;
    }
    return;
  }

  const count = getDb().prepare('SELECT COUNT(*) as c FROM customer').get().c;
  if (count > 0) return;

  const SEED = {
    clients: [
      { id: 'C001', name: '陈先生', phone: '13800138001', address: '天河星界公寓 B栋 403', roomNo: 'B-403', packageId: 'pkg-year-500', status: 'active', installDate: '2026-01-15', expiryDate: '2027-01-15', createdAt: '2026-01-10', salesPersonId: 'S001' },
      { id: 'C002', name: '李女士', phone: '13900139002', address: '天河星界公寓 A栋 205', roomNo: 'A-205', packageId: 'pkg-half-500', status: 'active', installDate: '2026-03-01', expiryDate: '2026-09-01', createdAt: '2026-02-28', salesPersonId: 'S001' },
      { id: 'C003', name: '张先生', phone: '13700137003', address: '珠江新城公寓 C栋 1201', roomNo: 'C-1201', packageId: 'pkg-year-500', status: 'active', installDate: '2025-12-01', expiryDate: '2026-12-01', createdAt: '2025-11-28', salesPersonId: 'S002' },
      { id: 'C004', name: '王同学', phone: '13600136004', address: '天河星界公寓 B栋 510', roomNo: 'B-510', packageId: 'pkg-half-500', status: 'expired', installDate: '2025-10-01', expiryDate: '2026-04-01', createdAt: '2025-09-28', salesPersonId: 'S001' },
      { id: 'C005', name: '赵先生', phone: '13500135005', address: '棠下小区 3栋 202', roomNo: '3-202', packageId: 'pkg-year-500', status: 'pending_install', createdAt: '2026-05-20', salesPersonId: 'S002' },
    ],
    orders: [
      { id: 'ORD001', clientId: 'C001', clientName: '陈先生', phone: '13800138001', packageId: 'pkg-year-500', packageName: '一年 500M 超值版', amount: 990, installationFee: 200, totalAmount: 1190, status: 'active', createdAt: '2026-01-10', paidAt: '2026-01-10', salesPersonId: 'S001' },
      { id: 'ORD002', clientId: 'C002', clientName: '李女士', phone: '13900139002', packageId: 'pkg-half-500', packageName: '半年 500M 极速版', amount: 499, installationFee: 200, totalAmount: 699, status: 'active', createdAt: '2026-02-28', paidAt: '2026-02-28', salesPersonId: 'S001' },
      { id: 'ORD003', clientId: 'C003', clientName: '张先生', phone: '13700137003', packageId: 'pkg-year-500', packageName: '一年 500M 超值版', amount: 990, installationFee: 200, totalAmount: 1190, status: 'active', createdAt: '2025-11-28', paidAt: '2025-11-29', salesPersonId: 'S002' },
      { id: 'ORD004', clientId: 'C004', clientName: '王同学', phone: '13600136004', packageId: 'pkg-half-500', packageName: '半年 500M 极速版', amount: 499, installationFee: 200, totalAmount: 699, status: 'active', createdAt: '2025-09-28', paidAt: '2025-09-29', salesPersonId: 'S001' },
      { id: 'ORD005', clientId: 'C005', clientName: '赵先生', phone: '13500135005', packageId: 'pkg-year-500', packageName: '一年 500M 超值版', amount: 990, installationFee: 200, totalAmount: 1190, status: 'pending_payment', createdAt: '2026-05-20', salesPersonId: 'S002' },
    ],
    leads: [
      { id: 'L001', name: '刘先生', phone: '13400134006', address: '棠下小区 5栋 303', source: 'online', status: 'new', notes: '咨询半年套餐', assignedTo: 'S001', createdAt: '2026-05-21', updatedAt: '2026-05-21' },
      { id: 'L002', name: '黄女士', phone: '13300133007', address: '天河星界公寓 C栋 805', source: 'referral', status: 'contacted', notes: '朋友介绍，对一年套餐感兴趣', assignedTo: 'S001', createdAt: '2026-05-19', updatedAt: '2026-05-20' },
      { id: 'L003', name: '周同学', phone: '13200132008', source: 'self_visit', status: 'negotiating', notes: '学生，想要半年套餐，纠结安装费', assignedTo: 'S002', createdAt: '2026-05-18', updatedAt: '2026-05-22' },
      { id: 'L004', name: '吴先生', phone: '13100131009', address: '珠江新城公寓 A栋 1502', source: 'walk_in', status: 'converted', notes: '已签约一年套餐，等待安装', assignedTo: 'S002', createdAt: '2026-05-15', updatedAt: '2026-05-22' },
      { id: 'L005', name: '林小姐', phone: '13000130010', source: 'online', status: 'lost', notes: '价格敏感，暂时不考虑', assignedTo: 'S001', createdAt: '2026-05-10', updatedAt: '2026-05-16' },
    ],
    tickets: [
      { id: 'TK001', clientId: 'C001', clientName: '陈先生', phone: '13800138001', address: '天河星界公寓 B栋 403', issueType: 'no_connection', description: '完全无法上网，光猫 LOS 红灯闪烁', priority: 'urgent', status: 'in_progress', assignedTo: 'M001', createdAt: '2026-05-22' },
      { id: 'TK002', clientId: 'C002', clientName: '李女士', phone: '13900139002', address: '天河星界公寓 A栋 205', issueType: 'slow_speed', description: '晚上测速只有 50M，离 500M 差很远', priority: 'medium', status: 'assigned', assignedTo: 'M002', createdAt: '2026-05-21' },
      { id: 'TK003', clientId: 'C003', clientName: '张先生', phone: '13700137003', address: '珠江新城公寓 C栋 1201', issueType: 'equipment_fault', description: '路由器频繁重启，怀疑电源适配器坏了', priority: 'high', status: 'pending', createdAt: '2026-05-23' },
      { id: 'TK004', clientId: 'C005', clientName: '赵先生', phone: '13500135005', address: '棠下小区 3栋 202', issueType: 'installation', description: '预约本周五安装，确认时间', priority: 'low', status: 'resolved', assignedTo: 'M001', createdAt: '2026-05-20', resolvedAt: '2026-05-22', resolution: '已联系客户，周五下午安装' },
      { id: 'TK005', clientId: 'C004', clientName: '王同学', phone: '13600136004', address: '天河星界公寓 B栋 510', issueType: 'other', description: '需要迁移宽带到同栋 608 房', priority: 'medium', status: 'closed', assignedTo: 'M002', createdAt: '2026-05-15', resolvedAt: '2026-05-17', resolution: '已完成移机' },
    ],
    staff: [
      { id: 'S001', name: '李明', phone: '18800010001', role: 'sales', status: 'active', joinDate: '2025-06-01', password: '123456' },
      { id: 'S002', name: '王芳', phone: '18800010002', role: 'sales', status: 'active', joinDate: '2025-08-15', password: '123456' },
      { id: 'M001', name: '陈师傅', phone: '18800020001', role: 'maintenance', status: 'active', joinDate: '2025-06-01', password: '123456' },
      { id: 'M002', name: '张师傅', phone: '18800020002', role: 'maintenance', status: 'active', joinDate: '2025-07-01', password: '123456' },
      { id: 'A001', name: '赵经理', phone: '18800030001', role: 'admin', status: 'active', joinDate: '2025-01-01', password: '123456' },
      { id: 'SU001', name: '系统管理员', phone: '18800000001', role: 'super_admin', status: 'active', joinDate: '2025-01-01' },
    ],
    packages: [
      { id: 'pkg-half-500', name: '半年 500M 极速版', speed: '500M', durationMonths: 6, price: 499, installationFee: 200, totalPrice: 699, features: ['500M 光纤接入', '公网 IP', '7×12 售后'] },
      { id: 'pkg-year-500', name: '一年 500M 超值版', speed: '500M', durationMonths: 12, price: 990, installationFee: 200, totalPrice: 1190, features: ['500M 光纤接入', '公网 IP', '7×24 售后'] },
      { id: 'pkg-year-1290', name: '一年1000M极速超值包年版', speed: '1000M', durationMonths: 12, price: 1290, installationFee: 200, totalPrice: 1490, features: ['1000M 光纤接入', '公网 IP', '7×24 售后'] },
    ],
  };

  writeAllData(SEED);
  console.log('  ✓ 默认种子数据已写入 SQLite');
}

module.exports = {
  getDb,
  readAllData,
  writeAllData,
  importFromExcel,
  exportToExcel,
  seedIfEmpty,
  getAllCustomers,
  getCustomerByPhone,
  getCustomerByWechat,
  getAllPackages,
  getAllTickets,
  getAllOrders,
  getAllLeads,
  getAllStaff,
};

// db.js — PostgreSQL 版本（兼容 Vercel Serverless 和 Neon）
// 对外 API 与原 SQLite 版本完全一致

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// 从环境变量读取数据库连接串（Vercel 中设置）
const DATABASE_URL = process.env.DATABASE_URL || '';

const DATA_DIR = path.resolve(__dirname, '..', '数据');

let pool;
let tablesInitialized = false;

function getPool() {
  if (!pool) {
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL 环境变量未设置，请在 Vercel 中配置');
    }
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

async function query(text, params) {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// 确保表已创建（幂等）
async function ensureTables() {
  if (tablesInitialized) return;
  await initTables();
  tablesInitialized = true;
}

// ====== 建表 ======
async function initTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS customer (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      wechat_id TEXT NOT NULL DEFAULT '',
      project_name TEXT NOT NULL DEFAULT '',
      building_name TEXT NOT NULL DEFAULT '',
      room_no TEXT NOT NULL DEFAULT '',
      package_name TEXT NOT NULL DEFAULT '',
      package_id TEXT NOT NULL DEFAULT '',
      status INTEGER NOT NULL DEFAULT 1,
      expire_time TIMESTAMP,
      install_date TEXT DEFAULT '',
      sales_person_id TEXT DEFAULT '',
      remark TEXT,
      create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_customer_phone ON customer(phone);
    CREATE INDEX IF NOT EXISTS idx_customer_wechat ON customer(wechat_id);

    CREATE TABLE IF NOT EXISTS "order" (
      id SERIAL PRIMARY KEY,
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
      paid_at TIMESTAMP,
      create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_order_client ON "order"(client_id);

    CREATE TABLE IF NOT EXISTS lead (
      id SERIAL PRIMARY KEY,
      lead_id TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      address TEXT DEFAULT '',
      source TEXT DEFAULT 'online',
      status TEXT DEFAULT 'new',
      notes TEXT DEFAULT '',
      assigned_to TEXT DEFAULT '',
      create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS staff (
      id SERIAL PRIMARY KEY,
      staff_id TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT '',
      status TEXT DEFAULT 'active',
      join_date TEXT DEFAULT '',
      password TEXT DEFAULT '',
      create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS package (
      id SERIAL PRIMARY KEY,
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
      create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ticket (
      id SERIAL PRIMARY KEY,
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
      create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_no ON ticket(ticket_no);
    CREATE INDEX IF NOT EXISTS idx_ticket_status ON ticket(status);
    CREATE INDEX IF NOT EXISTS idx_ticket_wechat ON ticket(wechat_id);

    CREATE TABLE IF NOT EXISTS landlord (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      contact TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      address TEXT DEFAULT '',
      status INTEGER DEFAULT 1,
      share_ratio REAL DEFAULT 0,
      remark TEXT DEFAULT '',
      create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS building (
      id SERIAL PRIMARY KEY,
      landlord_id INTEGER NOT NULL DEFAULT 0,
      name TEXT NOT NULL DEFAULT '',
      address TEXT DEFAULT '',
      total_rooms INTEGER DEFAULT 0,
      floors INTEGER DEFAULT 1,
      status INTEGER DEFAULT 1,
      create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS broadband_account (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL DEFAULT 0,
      landlord_id INTEGER NOT NULL DEFAULT 0,
      package_id INTEGER DEFAULT 0,
      account_no TEXT NOT NULL DEFAULT '',
      mac_address TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      status INTEGER DEFAULT 1,
      online_status INTEGER DEFAULT 0,
      expire_date DATE,
      bandwidth_limit BIGINT DEFAULT 0,
      last_login_time TIMESTAMP,
      create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 确保扩展字段存在（兼容旧表）
  const tables = [
    { name: 'customer', cols: ['package_id', 'install_date', 'sales_person_id', 'landlord_id'] },
    { name: 'ticket', cols: ['client_id', 'issue_type', 'priority'] },
    { name: 'package', cols: ['duration_months', 'installation_fee', 'total_price', 'features'] },
  ];
  for (const t of tables) {
    const { rows } = await query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [t.name]);
    const existing = rows.map(r => r.column_name);
    for (const col of t.cols) {
      if (!existing.includes(col)) {
        // PostgreSQL 不支持 ALTER TABLE ADD COLUMN IF NOT EXISTS（旧版本），用 try
        try {
          await query(`ALTER TABLE ${t.name} ADD COLUMN ${col} TEXT DEFAULT ''`);
        } catch (e) { /* column may already exist */ }
      }
    }
  }
}

// ====== Customer CRUD ======
async function getAllCustomers() {
  await ensureTables();
  const { rows } = await query('SELECT * FROM customer ORDER BY id');
  return rows;
}

async function getCustomerByPhone(phone) {
  if (!phone) return null;
  await ensureTables();
  const { rows } = await query('SELECT * FROM customer WHERE phone = $1', [phone]);
  return rows[0] || null;
}

async function getCustomerByWechat(wechatId) {
  if (!wechatId) return null;
  await ensureTables();
  const { rows } = await query('SELECT * FROM customer WHERE wechat_id = $1', [wechatId]);
  return rows[0] || null;
}

// ====== Package CRUD ======
async function getAllPackages() {
  await ensureTables();
  const { rows } = await query('SELECT * FROM package ORDER BY id');
  return rows;
}

// ====== Ticket CRUD ======
async function getAllTickets() {
  await ensureTables();
  const { rows } = await query('SELECT * FROM ticket ORDER BY id');
  return rows;
}

async function createTicket(data) {
  await ensureTables();
  const ticketNo = 'TK' + String(Date.now()).slice(-6);
  const { rows } = await query(
    `INSERT INTO ticket (ticket_no, client_id, customer_name, phone, room_no, issue_type, problem, priority, status, handler, create_time)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) RETURNING *`,
    [ticketNo, data.clientId || '', data.customerName || '', data.phone || '',
     data.roomNo || '', data.issueType || '', data.problem || data.description || '',
     data.priority || 'medium', data.status ?? 0, data.handler || '']
  );
  return rows[0];
}

async function updateTicket(id, data) {
  await ensureTables();
  const fields = [];
  const values = [];
  let idx = 1;
  for (const [key, val] of Object.entries(data)) {
    const col = { clientId: 'client_id', customerName: 'customer_name', phone: 'phone',
      roomNo: 'room_no', issueType: 'issue_type', problem: 'problem', priority: 'priority',
      status: 'status', handler: 'handler', handleNote: 'handle_note', resolution: 'handle_note',
      resolvedAt: 'resolved_at' }[key] || key;
    fields.push(`${col}=$${idx}`);
    values.push(val);
    idx++;
  }
  if (fields.length === 0) return;
  values.push(id);
  await query(`UPDATE ticket SET ${fields.join(',')}, update_time=NOW() WHERE id=$${idx}`, values);
  const { rows } = await query('SELECT * FROM ticket WHERE id = $1', [id]);
  return rows[0];
}

// ====== Order CRUD ======
async function getAllOrders() {
  await ensureTables();
  const { rows } = await query('SELECT * FROM "order" ORDER BY id');
  return rows;
}

// ====== Lead CRUD ======
async function getAllLeads() {
  await ensureTables();
  const { rows } = await query('SELECT * FROM lead ORDER BY id');
  return rows;
}

// ====== Staff CRUD ======
async function getAllStaff() {
  await ensureTables();
  const { rows } = await query('SELECT * FROM staff ORDER BY id');
  return rows;
}

// ====== Read All ======
async function readAllData() {
  const [customers, orders, leads, tickets, staffs, pkg] = await Promise.all([
    getAllCustomers(),
    getAllOrders(),
    getAllLeads(),
    getAllTickets(),
    getAllStaff(),
    getAllPackages(),
  ]);

  return {
    clients: customers.map(c => ({
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
      landlordId: c.landlord_id || 0,
    })),
    orders: orders.map(o => ({
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
    leads: leads.map(l => ({
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
    tickets: tickets.map(t => ({
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
    staff: staffs.map(s => ({
      id: s.staff_id || s.id?.toString() || '',
      name: s.name || '',
      phone: s.phone || '',
      role: s.role || '',
      status: s.status || 'active',
      joinDate: s.join_date || '',
      password: s.password || '',
    })),
    packages: pkg.map(p => ({
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
async function writeAllData(data) {
  await ensureTables();
  // Customers
  if (data.clients) {
    await query('DELETE FROM customer');
    for (const c of data.clients) {
      await query(`INSERT INTO customer (name, phone, wechat_id, project_name, building_name, room_no, package_name, package_id, status, expire_time, install_date, sales_person_id, create_time, landlord_id)
        VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          c.name || '',
          c.phone || '',
          (c.address || '').split(' ')[0] || '',
          (c.address || '').split(' ')[1] || '',
          c.roomNo || '',
          c.packageId || '',
          c.packageId || '',
          c.status === 'active' || c.status === 'pending_install' ? 1 : c.status === 'cancelled' ? 2 : 0,
          c.expiryDate || null,
          c.installDate || '',
          c.salesPersonId || '',
          c.createdAt || new Date().toISOString(),
          c.landlordId || 0,
        ]);
    }
  }

  // Orders
  if (data.orders) {
    await query('DELETE FROM "order"');
    for (const o of data.orders) {
      await query(`INSERT INTO "order" (order_id, client_id, client_name, phone, package_id, package_name, amount, installation_fee, total_amount, status, sales_person_id, paid_at, create_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          o.id || '', o.clientId || '', o.clientName || '', o.phone || '',
          o.packageId || '', o.packageName || '', o.amount || 0,
          o.installationFee || 0, o.totalAmount || 0, o.status || 'active',
          o.salesPersonId || '', o.paidAt || null, o.createdAt || new Date().toISOString(),
        ]);
    }
  }

  // Leads
  if (data.leads) {
    await query('DELETE FROM lead');
    for (const l of data.leads) {
      await query(`INSERT INTO lead (lead_id, name, phone, address, source, status, notes, assigned_to, create_time, update_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          l.id || '', l.name || '', l.phone || '', l.address || '',
          l.source || 'online', l.status || 'new', l.notes || '',
          l.assignedTo || '', l.createdAt || new Date().toISOString(),
          l.updatedAt || l.createdAt || new Date().toISOString(),
        ]);
    }
  }

  // Tickets
  if (data.tickets) {
    await query('DELETE FROM ticket');
    for (const t of data.tickets) {
      const statusIdx = ['pending', 'assigned', 'in_progress', 'resolved', 'closed'].indexOf(t.status);
      await query(`INSERT INTO ticket (ticket_no, client_id, customer_name, phone, issue_type, problem, priority, status, handler, handle_note, create_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          t.id || '', t.clientId || '', t.clientName || '', t.phone || '',
          t.issueType || '', t.description || '', t.priority || 'medium',
          statusIdx >= 0 ? statusIdx : 0,
          t.assignedTo || '', t.resolution || '',
          t.createdAt || new Date().toISOString(),
        ]);
    }
  }

  // Staff
  if (data.staff) {
    await query('DELETE FROM staff');
    for (const s of data.staff) {
      await query(`INSERT INTO staff (staff_id, name, phone, role, status, join_date, password, create_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          s.id || '', s.name || '', s.phone || '', s.role || '',
          s.status || 'active', s.joinDate || '', s.password || '',
          s.createdAt || new Date().toISOString(),
        ]);
    }
  }

  // Packages
  if (data.packages) {
    await query('DELETE FROM package');
    for (const p of data.packages) {
      await query(`INSERT INTO package (package_name, speed, duration_months, price, installation_fee, total_price, features, description, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)`,
        [
          p.name || '', p.speed || '', p.durationMonths || 6,
          p.price || 0, p.installationFee || 0, p.totalPrice || 0,
          JSON.stringify(p.features || []), p.description || '',
        ]);
    }
  }
}

// ====== Broadband Account CRUD ======
async function getAllBroadbandAccounts() {
  await ensureTables();
  const { rows } = await query('SELECT * FROM broadband_account ORDER BY id');
  return rows;
}

async function getBroadbandAccountsByLandlord(landlordId) {
  await ensureTables();
  const { rows } = await query('SELECT * FROM broadband_account WHERE landlord_id = $1 ORDER BY id', [landlordId]);
  return rows;
}

async function createBroadbandAccount(data) {
  await ensureTables();
  const { rows } = await query(
    `INSERT INTO broadband_account (customer_id, landlord_id, package_id, account_no, mac_address, ip_address, status, online_status, expire_date, bandwidth_limit)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [data.customerId || 0, data.landlordId || 0, data.packageId || 0, data.accountNo || '',
     data.macAddress || '', data.ipAddress || '', data.status ?? 1, data.onlineStatus ?? 0,
     data.expireDate || null, data.bandwidthLimit || 0]
  );
  return rows[0];
}

async function updateBroadbandAccount(id, data) {
  await ensureTables();
  const { rows } = await query(
    `UPDATE broadband_account SET status=$1, mac_address=$2, ip_address=$3, package_id=$4, expire_date=$5, online_status=$6 WHERE id=$7 RETURNING *`,
    [data.status ?? 1, data.macAddress || '', data.ipAddress || '', data.packageId || 0,
     data.expireDate || null, data.onlineStatus ?? 0, id]
  );
  return rows[0];
}

async function deleteBroadbandAccount(id) {
  await ensureTables();
  await query('DELETE FROM broadband_account WHERE id = $1', [id]);
}

// ====== Building CRUD ======
async function getAllBuildings() {
  await ensureTables();
  const { rows } = await query('SELECT * FROM building ORDER BY id');
  return rows;
}

async function getBuildingsByLandlord(landlordId) {
  await ensureTables();
  const { rows } = await query('SELECT * FROM building WHERE landlord_id = $1 ORDER BY id', [landlordId]);
  return rows;
}

async function createBuilding(data) {
  await ensureTables();
  const { rows } = await query(
    `INSERT INTO building (landlord_id, name, address, total_rooms, floors, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.landlordId || 0, data.name, data.address || '', data.totalRooms || 0, data.floors || 1, data.status ?? 1]
  );
  return rows[0];
}

async function updateBuilding(id, data) {
  await ensureTables();
  const { rows } = await query(
    `UPDATE building SET landlord_id=$1, name=$2, address=$3, total_rooms=$4, floors=$5, status=$6 WHERE id=$7 RETURNING *`,
    [data.landlordId || 0, data.name, data.address || '', data.totalRooms || 0, data.floors || 1, data.status ?? 1, id]
  );
  return rows[0];
}

async function deleteBuilding(id) {
  await ensureTables();
  await query('DELETE FROM building WHERE id = $1', [id]);
}

// ====== Seed Data ======
async function seedIfEmpty() {
  await ensureTables();
  const { rows } = await query('SELECT COUNT(*)::int as c FROM customer');
  if (rows[0].c > 0) return;

  // 先插入默认二房东
  await query(`INSERT INTO landlord (name, contact, phone, address, status, share_ratio) VALUES
    ('白云公寓管理有限公司', '陈总', '13800001001', '白云大道1号', 1, 70),
    ('天河青年社区', '李总', '13800001002', '天河路88号', 1, 65),
    ('幸福家园公寓', '王先生', '13800001003', '幸福路100号', 1, 60)`);

  // 插入默认楼栋
  await query(`INSERT INTO building (landlord_id, name, address, total_rooms, floors) VALUES
    (1, '白云公寓A栋', '白云大道1号', 60, 10),
    (1, '白云公寓B栋', '白云大道1号', 50, 8),
    (2, '天河青年社区A栋', '天河路88号', 40, 6),
    (2, '天河青年社区B栋', '天河路88号', 35, 5),
    (3, '幸福家园1栋', '幸福路100号', 30, 15)`);

  const SEED = {
    clients: [
      { id: 'C001', name: '陈先生', phone: '13800138001', address: '白云公寓A栋 403', roomNo: '403', packageId: 'pkg-year-500', status: 'active', installDate: '2026-01-15', expiryDate: '2027-01-15', createdAt: '2026-01-10', salesPersonId: 'S001', landlordId: 1 },
      { id: 'C002', name: '李女士', phone: '13900139002', address: '白云公寓A栋 205', roomNo: '205', packageId: 'pkg-half-500', status: 'active', installDate: '2026-03-01', expiryDate: '2026-09-01', createdAt: '2026-02-28', salesPersonId: 'S001', landlordId: 1 },
      { id: 'C003', name: '张先生', phone: '13700137003', address: '天河青年社区A栋 1201', roomNo: '1201', packageId: 'pkg-year-500', status: 'active', installDate: '2025-12-01', expiryDate: '2026-12-01', createdAt: '2025-11-28', salesPersonId: 'S002', landlordId: 2 },
      { id: 'C004', name: '王同学', phone: '13600136004', address: '白云公寓B栋 510', roomNo: '510', packageId: 'pkg-half-500', status: 'expired', installDate: '2025-10-01', expiryDate: '2026-04-01', createdAt: '2025-09-28', salesPersonId: 'S001', landlordId: 1 },
      { id: 'C005', name: '赵先生', phone: '13500135005', address: '幸福家园1栋 202', roomNo: '202', packageId: 'pkg-year-500', status: 'pending_install', createdAt: '2026-05-20', salesPersonId: 'S002', landlordId: 3 },
      { id: 'C006', name: '刘小姐', phone: '13400134006', address: '天河青年社区B栋 805', roomNo: '805', packageId: 'pkg-year-1000', status: 'active', installDate: '2026-04-01', expiryDate: '2027-04-01', createdAt: '2026-03-28', salesPersonId: 'S002', landlordId: 2 },
      { id: 'C007', name: '黄先生', phone: '13300133007', address: '白云公寓A栋 601', roomNo: '601', packageId: 'pkg-year-500', status: 'suspended', installDate: '2026-02-01', expiryDate: '2027-02-01', createdAt: '2026-01-28', salesPersonId: 'S001', landlordId: 1 },
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

  await writeAllData(SEED);
  console.log('  ✓ 默认种子数据已写入 PostgreSQL');
}

// ====== Landlord CRUD ======
async function getAllLandlords() {
  await ensureTables();
  const { rows } = await query('SELECT * FROM landlord ORDER BY id');
  return rows;
}

async function getLandlordById(id) {
  await ensureTables();
  const { rows } = await query('SELECT * FROM landlord WHERE id = $1', [id]);
  return rows[0] || null;
}

async function createLandlord(data) {
  await ensureTables();
  const { rows } = await query(`INSERT INTO landlord (name, contact, phone, address, status, share_ratio, remark)
    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [data.name, data.contact || '', data.phone || '', data.address || '', data.status ?? 1, data.shareRatio || 0, data.remark || '']);
  return rows[0];
}

async function updateLandlord(id, data) {
  await ensureTables();
  const { rows } = await query(`UPDATE landlord SET name=$1, contact=$2, phone=$3, address=$4, status=$5, share_ratio=$6, remark=$7 WHERE id=$8 RETURNING *`,
    [data.name, data.contact || '', data.phone || '', data.address || '', data.status ?? 1, data.shareRatio || 0, data.remark || '', id]);
  return rows[0];
}

async function deleteLandlord(id) {
  await ensureTables();
  await query('DELETE FROM landlord WHERE id = $1', [id]);
}

module.exports = {
  getPool,
  query,
  readAllData,
  writeAllData,
  seedIfEmpty,
  getAllCustomers,
  getCustomerByPhone,
  getCustomerByWechat,
  getAllPackages,
  getAllTickets,
  createTicket,
  updateTicket,
  getAllOrders,
  getAllLeads,
  getAllStaff,
  getAllLandlords,
  getLandlordById,
  createLandlord,
  updateLandlord,
  deleteLandlord,
  getAllBuildings,
  getBuildingsByLandlord,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  getAllBroadbandAccounts,
  getBroadbandAccountsByLandlord,
  createBroadbandAccount,
  updateBroadbandAccount,
  deleteBroadbandAccount,
};

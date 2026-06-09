import type {
  BroadbandPackage, Client, Order, SalesLead,
  Ticket, Staff, DashboardStats
} from '@/types';

// ============================================================
// 数据存储模式：API 优先（本地服务器），fallback 到 localStorage
// ============================================================
// 使用相对路径，适配 localhost 和 tailscale 等自定义域名访问
const API_BASE = '';
const STORAGE_KEY = 'apartment_wifi_data';

interface StoreData {
  clients: Client[];
  orders: Order[];
  leads: SalesLead[];
  tickets: Ticket[];
  staff: Staff[];
  packages: BroadbandPackage[];
  counters: { client: number; order: number; lead: number; ticket: number };
}

// 运行时数据缓存
let _cache: StoreData | null = null;
let _useApi = false;

// ============================================================
// 套餐（持久化，可从 store 读写）
// ============================================================
export const PACKAGES: BroadbandPackage[] = [
  { id: 'pkg-half-500', name: '半年 500M 极速版', speed: '500M', durationMonths: 6, price: 499, installationFee: 200, totalPrice: 699, features: ['500M 光纤接入', '公网 IP', '7×12 售后'], isPopular: false, color: 'from-blue-950/40 to-cyan-950/40' },
  { id: 'pkg-year-500', name: '一年 500M 超值版', speed: '500M', durationMonths: 12, price: 990, installationFee: 200, totalPrice: 1190, features: ['500M 光纤接入', '公网 IP', '7×24 售后'], isPopular: true, color: 'from-purple-950/40 to-indigo-950/40' },
  { id: 'pkg-year-1290', name: '一年1000M极速超值包年版', speed: '1000M', durationMonths: 12, price: 1290, installationFee: 200, totalPrice: 1490, features: ['1000M 光纤接入', '公网 IP', '7×24 售后'], isPopular: true, color: 'from-rose-950/40 to-pink-950/40' },
];
export function getPackages(): BroadbandPackage[] { return [...getStore().packages]; }
export function getPackageById(id: string): BroadbandPackage | undefined { return getStore().packages.find(p => p.id === id); }

// ============================================================
// 初始化：探测 API，决定用 API 还是 localStorage
// ============================================================
let _initPromise: Promise<void> | null = null;

async function initStore(): Promise<void> {
  if (_cache) return;
  try {
    const res = await fetch(`${API_BASE}/api/data`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const json = await res.json();
      _useApi = true;
      const apiData = json.data as StoreData;
      _cache = apiData;
      // API 数据不含 counters，根据现有数据初始化
      if (!apiData.counters) {
        apiData.counters = {
          client: apiData.clients.length,
          order: apiData.orders.length,
          lead: apiData.leads.length,
          ticket: apiData.tickets.length,
        };
      }
      return;
    }
  } catch (e) { console.error('API save failed:', e); }
  // API 不可用 → 用 localStorage
  _useApi = false;
  _cache = loadFromLocalStorage();
}

function loadFromLocalStorage(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return getDefaultStore();
}

function getDefaultStore(): StoreData {
  return {
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
      { id: 'pkg-half-500', name: '半年 500M 极速版', speed: '500M', durationMonths: 6, price: 499, installationFee: 200, totalPrice: 699, features: ['500M 光纤接入', '公网 IP', '7×12 售后'], isPopular: false, color: 'from-blue-950/40 to-cyan-950/40' },
      { id: 'pkg-year-500', name: '一年 500M 超值版', speed: '500M', durationMonths: 12, price: 990, installationFee: 200, totalPrice: 1190, features: ['500M 光纤接入', '公网 IP', '7×24 售后'], isPopular: true, color: 'from-purple-950/40 to-indigo-950/40' },
      { id: 'pkg-year-1290', name: '一年1000M极速超值包年版', speed: '1000M', durationMonths: 12, price: 1290, installationFee: 200, totalPrice: 1490, features: ['1000M 光纤接入', '公网 IP', '7×24 售后'], isPopular: true, color: 'from-rose-950/40 to-pink-950/40' },
    ],
    counters: { client: 5, order: 5, lead: 5, ticket: 5 },
  };
}

// ============================================================
// 持久化保存
// ============================================================
async function persistStore(): Promise<void> {
  if (!_cache) return;
  // localStorage 保存（兜底）
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache)); } catch {}
  // API 保存
  if (_useApi) {
    try {
      await fetch(`${API_BASE}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clients: _cache.clients,
          orders: _cache.orders,
          leads: _cache.leads,
          tickets: _cache.tickets,
          staff: _cache.staff,
          packages: _cache.packages,
        }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {}
  }
}

// ============================================================
// 公共数据访问接口（异步初始化后使用）
// ============================================================
export async function ensureInit(): Promise<void> {
  if (!_initPromise) _initPromise = initStore();
  await _initPromise;
}

function getStore(): StoreData {
  if (!_cache) throw new Error('Store not initialized. Call ensureInit() first.');
  return _cache;
}

// --- 客户 ---
export function getClients(): Client[] { return [...getStore().clients]; }
export function getClientById(id: string): Client | undefined { return getStore().clients.find(c => c.id === id); }

export async function addClient(client: Client): Promise<void> {
  getStore().clients.push(client);
  await persistStore();
}

export async function updateClient(id: string, data: Partial<Client>): Promise<void> {
  const s = getStore();
  const idx = s.clients.findIndex(c => c.id === id);
  if (idx >= 0) s.clients[idx] = { ...s.clients[idx], ...data };
  await persistStore();
}

// --- 订单 ---
export function getOrders(): Order[] { return [...getStore().orders]; }

export async function addOrder(order: Order): Promise<void> {
  getStore().orders.push(order);
  await persistStore();
}

export async function updateOrder(id: string, data: Partial<Order>): Promise<void> {
  const s = getStore();
  const idx = s.orders.findIndex(o => o.id === id);
  if (idx >= 0) s.orders[idx] = { ...s.orders[idx], ...data };
  await persistStore();
}

// --- 销售线索 ---
export function getLeads(): SalesLead[] { return [...getStore().leads]; }

export async function addLead(lead: SalesLead): Promise<void> {
  getStore().leads.push(lead);
  await persistStore();
}

export async function updateLead(id: string, data: Partial<SalesLead>): Promise<void> {
  const s = getStore();
  const idx = s.leads.findIndex(l => l.id === id);
  if (idx >= 0) s.leads[idx] = { ...s.leads[idx], ...data };
  await persistStore();
}

// --- 工单 ---
export function getTickets(): Ticket[] { return [...getStore().tickets]; }

export async function addTicket(ticket: Ticket): Promise<void> {
  getStore().tickets.push(ticket);
  await persistStore();
}

export async function updateTicket(id: string, data: Partial<Ticket>): Promise<void> {
  const s = getStore();
  const idx = s.tickets.findIndex(t => t.id === id);
  if (idx >= 0) s.tickets[idx] = { ...s.tickets[idx], ...data };
  await persistStore();
}

// --- 员工 ---
export function getStaff(): Staff[] { return [...getStore().staff]; }
export function getStaffByRole(role: Staff['role']): Staff[] { return getStore().staff.filter(s => s.role === role && s.status === 'active'); }

export async function addStaff(member: Staff): Promise<void> {
  getStore().staff.push(member);
  await persistStore();
}

export async function updateStaff(id: string, data: Partial<Staff>): Promise<void> {
  const s = getStore();
  const idx = s.staff.findIndex(m => m.id === id);
  if (idx >= 0) s.staff[idx] = { ...s.staff[idx], ...data };
  await persistStore();
}

// --- 统计数据 ---
export function getDashboardStats(): DashboardStats {
  const s = getStore();
  const active = s.clients.filter(c => c.status === 'active' || c.status === 'pending_install');
  const totalRevenue = s.orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.totalAmount, 0);
  const thisMonth = s.orders.filter(o => o.status !== 'cancelled' && o.createdAt >= '2026-05-01' && o.createdAt <= '2026-05-31');
  const monthlyRevenue = thisMonth.reduce((sum, o) => sum + o.totalAmount, 0);
  const allPkgs = s.packages.length ? s.packages : PACKAGES;
  const pkgDist = allPkgs.map(p => ({ name: p.name, count: s.clients.filter(c => c.packageId === p.id).length }));
  return {
    totalClients: s.clients.length, activeClients: active.length, monthlyRevenue, totalRevenue,
    pendingTickets: s.tickets.filter(t => t.status === 'pending' || t.status === 'assigned' || t.status === 'in_progress').length,
    newLeads: s.leads.filter(l => l.status === 'new').length,
    packageDistribution: pkgDist,
    monthlyRevenueData: [{ month: '1月', revenue: 2380 }, { month: '2月', revenue: 699 }, { month: '3月', revenue: 1398 }, { month: '4月', revenue: 0 }, { month: '5月', revenue: monthlyRevenue }],
  };
}

// --- ID 生成器 ---
export function genId(type: 'client' | 'order' | 'lead' | 'ticket'): string {
  const s = getStore();
  s.counters[type]++;
  persistStore(); // 异步，不等待
  const map = { client: 'C', order: 'ORD', lead: 'L', ticket: 'TK' };
  return `${map[type]}${String(s.counters[type]).padStart(3, '0')}`;
}

// ============================================================
// 登录认证
// ============================================================
const AUTH_KEY_PREFIX = 'apartment_wifi_auth_';

export interface AuthSession {
  staffId: string;
  name: string;
  role: Staff['role'];
}

export function getPortalAuth(portal: string): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY_PREFIX + portal);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function loginPortal(portal: string, username: string, password: string): AuthSession | null {
  if (portal === 'system') {
    if (username === 'admin' && password === '123456') {
      const session: AuthSession = { staffId: 'SU001', name: '系统管理员', role: 'super_admin' };
      localStorage.setItem(AUTH_KEY_PREFIX + portal, JSON.stringify(session));
      return session;
    }
    return null;
  }

  try {
    const staff = getStore().staff.filter(s => {
      if (portal === 'sales') return s.role === 'sales';
      if (portal === 'maintenance') return s.role === 'maintenance';
      if (portal === 'admin') return s.role === 'admin' || s.role === 'super_admin';
      return false;
    });

    const found = staff.find(s => {
      if (!s.password) return false;
      return (s.name === username || s.phone === username) && s.password === password;
    });

    if (found && found.status === 'active') {
      const session: AuthSession = { staffId: found.id, name: found.name, role: found.role };
      localStorage.setItem(AUTH_KEY_PREFIX + portal, JSON.stringify(session));
      return session;
    }
  } catch {}
  return null;
}

export function logoutPortal(portal: string): void {
  localStorage.removeItem(AUTH_KEY_PREFIX + portal);
}

export async function deleteStaff(id: string, force?: boolean): Promise<{ ok: boolean; message?: string }> {
  const s = getStore();
  const idx = s.staff.findIndex(m => m.id === id);
  if (idx < 0) return { ok: false, message: '员工不存在' };
  if (idx === 0 && s.staff[idx].role === 'super_admin') return { ok: false, message: '不能删除初始系统管理员' };
  const member = s.staff[idx];
  const activeClients = s.clients.filter(c => c.salesPersonId === id).length;
  const activeTickets = s.tickets.filter(t => t.assignedTo === id && (t.status === 'in_progress' || t.status === 'assigned' || t.status === 'pending')).length;
  if ((activeClients > 0 || activeTickets > 0) && !force) {
    return { ok: false, message: `该员工负责 ${activeClients} 个客户、${activeTickets} 个工单，请先 reassign 后再删除` };
  }
  // 强制删除：清除该员工负责的客户和工单的关联
  if (force) {
    for (const c of s.clients) {
      if (c.salesPersonId === id) c.salesPersonId = undefined;
    }
    for (const t of s.tickets) {
      if (t.assignedTo === id) t.assignedTo = undefined;
    }
  }
  s.staff.splice(idx, 1);
  await persistStore();
  return { ok: true };
}

export async function setStaffPassword(id: string, password: string): Promise<void> {
  await updateStaff(id, { password });
}

// --- 套餐 ---
export async function addPackage(pkg: BroadbandPackage): Promise<void> {
  getStore().packages.push(pkg);
  await persistStore();
}

export async function deletePackage(id: string): Promise<{ ok: boolean; message?: string }> {
  const s = getStore();
  const inUse = s.clients.filter(c => c.packageId === id).length;
  if (inUse > 0) return { ok: false, message: `有 ${inUse} 个客户正在使用此套餐，无法删除` };
  s.packages = s.packages.filter(p => p.id !== id);
  await persistStore();
  return { ok: true };
}

// --- 导出/导入（供 excel.ts 使用）---
export type { StoreData };
export function getStoreData(): StoreData { return getStore(); }
export function importStoreData(data: Partial<StoreData>): void {
  const s = getStore();
  if (data.clients) s.clients = data.clients;
  if (data.orders) s.orders = data.orders;
  if (data.leads) s.leads = data.leads;
  if (data.tickets) s.tickets = data.tickets;
  if (data.staff) s.staff = data.staff;
  if (data.packages) s.packages = data.packages;
  persistStore();
}

// --- 重置 ---
export async function resetAllData(): Promise<void> {
  if (_useApi) {
    try {
      await fetch(`${API_BASE}/api/reset`, { method: 'POST', signal: AbortSignal.timeout(3000) });
    } catch {}
  }
  localStorage.removeItem(STORAGE_KEY);
  _cache = getDefaultStore();
  await persistStore();
}

// --- API 模式判断 ---
export function isUsingApi(): boolean { return _useApi; }

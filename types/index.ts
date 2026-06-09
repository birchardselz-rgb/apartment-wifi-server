// ===== 套餐 =====
export interface BroadbandPackage {
  id: string;
  name: string;
  speed: string;
  durationMonths: number;
  price: number;
  installationFee: number;
  totalPrice: number;
  features: string[];
  isPopular?: boolean;
  color: string;
}

// ===== 客户 =====
export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  roomNo: string;
  packageId: string;
  status: 'active' | 'expired' | 'pending_install' | 'suspended';
  installDate?: string;
  expiryDate?: string;
  createdAt: string;
  salesPersonId?: string;
}

// ===== 订单 =====
export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  phone: string;
  packageId: string;
  packageName: string;
  amount: number;
  installationFee: number;
  totalAmount: number;
  status: 'pending_payment' | 'paid' | 'installing' | 'active' | 'cancelled';
  createdAt: string;
  paidAt?: string;
  salesPersonId?: string;
}

// ===== 销售线索 =====
export interface SalesLead {
  id: string;
  name: string;
  phone: string;
  address?: string;
  source: 'self_visit' | 'referral' | 'online' | 'walk_in' | 'other';
  status: 'new' | 'contacted' | 'negotiating' | 'converted' | 'lost';
  notes: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
}

// ===== 维护工单 =====
export interface Ticket {
  id: string;
  clientId: string;
  clientName: string;
  phone: string;
  address: string;
  issueType: 'no_connection' | 'slow_speed' | 'equipment_fault' | 'installation' | 'other';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

// ===== 员工 =====
export interface Staff {
  id: string;
  name: string;
  phone: string;
  role: 'sales' | 'maintenance' | 'admin' | 'super_admin';
  status: 'active' | 'inactive';
  joinDate: string;
  avatar?: string;
  password?: string;
}

// ===== 统计数据 =====
export interface DashboardStats {
  totalClients: number;
  activeClients: number;
  monthlyRevenue: number;
  totalRevenue: number;
  pendingTickets: number;
  newLeads: number;
  packageDistribution: { name: string; count: number }[];
  monthlyRevenueData: { month: string; revenue: number }[];
}

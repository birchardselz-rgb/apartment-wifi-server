export type GuanliRole = 'admin' | 'super_admin' | 'landlord' | 'sales' | 'maintenance';

export type GuanliSession = {
  token: string;
  userId: number | string;
  username: string;
  companyName: string;
  role: GuanliRole;
  landlordId?: number | null;
};

export type ApiEnvelope<T> = {
  code?: number;
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
};

export type GuanliNavItem = {
  id: string;
  label: string;
  path: string;
  roles: GuanliRole[];
  description: string;
  icon: string;
};

export type DashboardSummary = {
  buildingCount?: number;
  allRooms?: number;
  occupiedRooms?: number;
  vacantRooms?: number;
  customerCount?: number;
  activeBroadband?: number;
  pendingTickets?: number;
  monthlyIncome?: number;
  [key: string]: unknown;
};

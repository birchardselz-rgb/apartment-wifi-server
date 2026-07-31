import { BarChart3, Building2, CircleDollarSign, Headphones, LayoutDashboard, Package, Settings, Users, Wifi } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GuanliNavItem, GuanliRole } from '../types';

export type NavigationItem = GuanliNavItem & { Icon: LucideIcon };

const allRoles: GuanliRole[] = ['admin', 'super_admin', 'landlord', 'sales', 'maintenance'];

export const NAV_ITEMS: NavigationItem[] = [
  { id: 'overview', label: '总览', path: '/guanli/', roles: allRoles, description: '运营概况与待办', icon: 'dashboard', Icon: LayoutDashboard },
  { id: 'customers', label: '客户', path: '/guanli/customers/', roles: ['admin', 'super_admin', 'landlord', 'sales'], description: '客户与租客档案', icon: 'users', Icon: Users },
  { id: 'broadband', label: '宽带', path: '/guanli/broadband/', roles: ['admin', 'super_admin', 'landlord', 'sales'], description: '账号与套餐状态', icon: 'wifi', Icon: Wifi },
  { id: 'tickets', label: '工单', path: '/guanli/tickets/', roles: ['admin', 'super_admin', 'landlord', 'maintenance'], description: '维护与服务请求', icon: 'headphones', Icon: Headphones },
  { id: 'properties', label: '楼栋房间', path: '/guanli/properties/', roles: ['admin', 'super_admin', 'landlord'], description: '空间与入住状态', icon: 'building', Icon: Building2 },
  { id: 'packages', label: '套餐', path: '/guanli/packages/', roles: ['admin', 'super_admin'], description: '资费与产品配置', icon: 'package', Icon: Package },
  { id: 'finance', label: '财务', path: '/guanli/finance/', roles: ['admin', 'super_admin', 'landlord'], description: '收入与结算', icon: 'finance', Icon: CircleDollarSign },
  { id: 'settings', label: '系统', path: '/guanli/settings/', roles: ['admin', 'super_admin'], description: '人员与数据工具', icon: 'settings', Icon: Settings },
];

export const LEGACY_ROUTES: Record<string, string> = {
  '/admin': '/guanli/',
  '/sales': '/guanli/customers/',
  '/maintenance': '/guanli/tickets/',
  '/system': '/guanli/settings/',
};

export function getVisibleNavigation(role: GuanliRole | undefined) {
  return NAV_ITEMS.filter((item) => role && item.roles.includes(role));
}

export function getNavigationItem(pathname: string) {
  return NAV_ITEMS.find((item) => pathname === item.path || pathname.startsWith(item.path.replace(/\/$/, '')));
}

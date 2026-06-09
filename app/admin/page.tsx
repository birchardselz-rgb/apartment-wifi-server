'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, Users, DollarSign, Wifi, Activity, BarChart3, Download, Upload, LogOut, User } from 'lucide-react';
import { ensureInit, getDashboardStats, getClients, getOrders, getPackages, getPortalAuth, loginPortal, logoutPortal } from '@/lib/mock-data';
import { exportAllToExcel, importFromExcel } from '@/lib/excel';
import type { Client, Order, DashboardStats, BroadbandPackage } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState<{ staffId: string; name: string } | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [loginErr, setLoginErr] = useState('');

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pkgs, setPkgs] = useState<BroadbandPackage[]>([]);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  useEffect(() => {
    ensureInit().then(() => {
      const auth = getPortalAuth('admin');
      if (auth) setAuthed(auth);
      setStats(getDashboardStats());
      setClients(getClients());
      setOrders(getOrders());
      setPkgs(getPackages());
      setReady(true);
    });
  }, []);

  const handleLogin = () => {
    const result = loginPortal('admin', loginUser, loginPwd);
    if (result) {
      setAuthed(result);
      setLoginErr('');
    } else {
      setLoginErr('登录名或密码错误');
    }
  };

  const handleLogout = () => {
    logoutPortal('admin');
    setAuthed(null);
    setLoginUser('');
    setLoginPwd('');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg('');
    try {
      const msg = await importFromExcel(file);
      setImportMsg(msg);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setImportMsg('导入失败：' + (err instanceof Error ? err.message : String(err)));
    }
    setImporting(false);
    e.target.value = '';
  };

  if (!ready || !stats) {
    return <div className="max-w-md mx-auto min-h-screen bg-[#0B0F19] flex items-center justify-center text-gray-500 text-sm">加载中...</div>;
  }

  if (!authed) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#0B0F19] flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20 mb-4">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">后台数据端登录</h1>
            <p className="text-gray-500 text-sm mt-1">DVS网络运营管理平台</p>
          </div>
          <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-5 space-y-4">
            <input value={loginUser} onChange={e => setLoginUser(e.target.value)}
              placeholder="登录名（姓名或手机号）"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 outline-none"
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <input value={loginPwd} onChange={e => setLoginPwd(e.target.value)}
              type="password" placeholder="密码"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 outline-none"
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            {loginErr && <div className="text-red-400 text-xs text-center">{loginErr}</div>}
            <button onClick={handleLogin} className="w-full bg-purple-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors">登 录</button>
            <div className="text-[10px] text-gray-600 text-center">运营人员使用系统管理员分配的账号登录</div>
          </div>
          <button onClick={() => router.push('/')} className="mt-4 text-gray-500 text-sm flex items-center justify-center space-x-1 w-full"><ArrowLeft className="w-4 h-4" /><span>返回主页</span></button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0B0F19] pb-20">
      <header className="sticky top-0 z-40 bg-[#0F1524]/80 backdrop-blur-md border-b border-gray-800 px-4 py-3 flex items-center">
        <button onClick={() => router.push('/')} className="text-gray-400 mr-3"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1"><h1 className="font-bold text-white text-base">后台数据端</h1><p className="text-[10px] text-gray-500"><User className="w-3 h-3 inline mr-0.5" />{authed.name}</p></div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 p-2"><LogOut className="w-5 h-5" /></button>
      </header>

      <div className="p-4 space-y-4">
        {/* Excel 导入导出 */}
        <div className="flex space-x-3">
          <button onClick={exportAllToExcel} className="flex-1 bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-xl py-3 text-sm font-bold flex items-center justify-center space-x-2 hover:bg-emerald-950/60 transition-colors">
            <Download className="w-4 h-4" /><span>导出 Excel</span>
          </button>
          <label className="flex-1 bg-blue-950/40 border border-blue-800/40 text-blue-400 rounded-xl py-3 text-sm font-bold flex items-center justify-center space-x-2 hover:bg-blue-950/60 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" /><span>导入 Excel</span>
            <input type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          </label>
        </div>
        {importMsg && (
          <div className={`text-xs text-center p-2 rounded-lg ${importMsg.includes('成功') ? 'bg-emerald-950/30 text-emerald-400' : 'bg-red-950/30 text-red-400'}`}>
            {importMsg}
          </div>
        )}

        {/* 核心 KPI */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px] text-gray-600">本月</span>
            </div>
            <div className="text-2xl font-bold text-white font-mono">¥{stats.monthlyRevenue.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">本月营收</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <span className="text-[10px] text-gray-600">累计</span>
            </div>
            <div className="text-2xl font-bold text-white font-mono">¥{stats.totalRevenue.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">累计营收</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 rounded-2xl p-4">
            <Users className="w-5 h-5 text-blue-400 mb-2" />
            <div className="text-2xl font-bold text-white">{stats.totalClients}</div>
            <div className="text-xs text-gray-500 mt-1">总客户 · {stats.activeClients} 活跃</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 rounded-2xl p-4">
            <Activity className="w-5 h-5 text-amber-400 mb-2" />
            <div className="text-2xl font-bold text-white">{stats.pendingTickets}</div>
            <div className="text-xs text-gray-500 mt-1">待处理工单</div>
          </motion.div>
        </div>

        {/* 月度营收趋势 */}
        <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center"><BarChart3 className="w-4 h-4 mr-1.5 text-cyan-400" />月度营收趋势</h3>
          <div className="flex items-end justify-between h-28">
            {stats.monthlyRevenueData.map((d, i) => {
              const max = Math.max(...stats.monthlyRevenueData.map(x => x.revenue), 1);
              const height = (d.revenue / max) * 100;
              return (
                <div key={d.month} className="flex flex-col items-center flex-1">
                  <span className="text-[10px] text-gray-500 mb-1">¥{d.revenue}</span>
                  <div className="w-full mx-1 bg-gradient-to-t from-cyan-500 to-blue-500 rounded-t-md" style={{ height: `${Math.max(height, 4)}%` }}></div>
                  <span className="text-[10px] text-gray-600 mt-1">{d.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 套餐分布 */}
        <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center"><Wifi className="w-4 h-4 mr-1.5 text-cyan-400" />套餐分布</h3>
          <div className="space-y-2">
            {stats.packageDistribution.map(p => {
              const total = stats.packageDistribution.reduce((s, x) => s + x.count, 0) || 1;
              const pct = Math.round(p.count / total * 100);
              return (
                <div key={p.name}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{p.name}</span><span className="text-white">{p.count} 户</span></div>
                  <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 最近订单 */}
        <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">最近订单</h3>
          <div className="space-y-2">
            {orders.slice(0, 5).map(o => (
              <div key={o.id} className="flex justify-between items-center py-2 border-b border-gray-800/60 last:border-0">
                <div>
                  <div className="text-white text-sm">{o.clientName}</div>
                  <div className="text-gray-500 text-[10px]">{o.packageName}</div>
                </div>
                <div className="text-right">
                  <div className="text-cyan-400 text-sm font-bold">¥{o.totalAmount}</div>
                  <div className="text-gray-600 text-[10px]">{o.createdAt}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 客户列表 */}
        <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">客户列表</h3>
          <div className="space-y-2">
            {clients.map(c => (
              <div key={c.id} className="flex justify-between items-center py-2 border-b border-gray-800/60 last:border-0">
                <div>
                  <div className="text-white text-sm">{c.name}</div>
                  <div className="text-gray-500 text-[10px]">{c.phone} · {c.roomNo}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-gray-400">{c.status === 'active' ? '正常' : c.status === 'expired' ? '已过期' : c.status === 'pending_install' ? '待安装' : '暂停'}</span>
                  <span className={`w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : c.status === 'expired' ? 'bg-red-500' : c.status === 'pending_install' ? 'bg-amber-500' : 'bg-gray-500'}`}></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

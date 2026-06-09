'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Users, Wifi, Settings, Plus, LogOut, Key, Download, User, Trash2, X, AlertTriangle } from 'lucide-react';
import { ensureInit, getStaff, addStaff, updateStaff, deleteStaff, resetAllData, getPackages, addPackage, deletePackage, getPortalAuth, loginPortal, setStaffPassword } from '@/lib/mock-data';
import { exportAllToExcel } from '@/lib/excel';
import type { Staff, BroadbandPackage, Client } from '@/types';

export default function SystemPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [loginErr, setLoginErr] = useState('');

  const [staff, setStaff] = useState<Staff[]>([]);
  const [packages, setPackages] = useState<BroadbandPackage[]>([]);
  const [tab, setTab] = useState<'staff' | 'packages' | 'settings'>('staff');
  const [showAdd, setShowAdd] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', phone: '', role: 'sales' as Staff['role'] });
  const [showPwdModal, setShowPwdModal] = useState<string | null>(null);
  const [pwdValue, setPwdValue] = useState('');
  const [showPkgModal, setShowPkgModal] = useState(false);
  const [newPkg, setNewPkg] = useState({ id: '', name: '', speed: '', durationMonths: 12, price: 0, installationFee: 200, features: '', isPopular: false });

  useEffect(() => {
    ensureInit().then(() => {
      if (getPortalAuth('system')) setAuthed(true);
      setStaff(getStaff());
      setPackages(getPackages());
      setReady(true);
    });
  }, []);

  const handleLogin = () => {
    const result = loginPortal('system', loginUser, loginPwd);
    if (result) {
      setAuthed(true);
      setLoginErr('');
    } else {
      setLoginErr('登录名或密码错误');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('apartment_wifi_auth_system');
    setAuthed(false);
    setLoginUser('');
    setLoginPwd('');
  };

  const handleAdd = async () => {
    if (!newStaff.name || !newStaff.phone) return;
    const id = (newStaff.role === 'sales' ? 'S' : newStaff.role === 'maintenance' ? 'M' : newStaff.role === 'admin' ? 'A' : 'SU') +
      String(staff.filter(s => s.role === newStaff.role).length + 1).padStart(3, '0');
    await addStaff({ id, name: newStaff.name, phone: newStaff.phone, role: newStaff.role, status: 'active', joinDate: new Date().toISOString().slice(0, 10) });
    setStaff(getStaff());
    setShowAdd(false);
    setNewStaff({ name: '', phone: '', role: 'sales' });
  };

  const toggleStatus = async (id: string) => {
    const s = staff.find(m => m.id === id);
    if (s) {
      await updateStaff(id, { status: s.status === 'active' ? 'inactive' : 'active' });
      setStaff(getStaff());
    }
  };

  const handleDeleteStaff = async (id: string) => {
    const s = staff.find(m => m.id === id);
    if (!s) return;
    // 先检查是否有关联数据
    const check = await deleteStaff(id);
    if (check.ok) {
      setStaff(getStaff());
      return;
    }
    // 有关联数据时，提示是否强制删除
    if (!check.ok && check.message?.includes('负责')) {
      if (confirm(`${s.name} ${check.message}\n\n强制删除将会清空该员工的客户和工单关联。\n确定要强制删除吗？`)) {
        const forceResult = await deleteStaff(id, true);
        if (forceResult.ok) {
          setStaff(getStaff());
        } else {
          alert(forceResult.message);
        }
      }
    } else {
      alert(check.message);
    }
  };

  const handleSetPassword = async (id: string) => {
    if (!pwdValue || pwdValue.length < 4) return;
    await setStaffPassword(id, pwdValue);
    setStaff(getStaff());
    setShowPwdModal(null);
    setPwdValue('');
  };

  const refreshPackages = () => setPackages(getPackages());

  const handleAddPkg = async () => {
    if (!newPkg.id || !newPkg.name || !newPkg.speed || !newPkg.price) return;
    const features = newPkg.features.split(/[,，]/).map(f => f.trim()).filter(Boolean);
    const pkg: BroadbandPackage = {
      id: newPkg.id,
      name: newPkg.name,
      speed: newPkg.speed,
      durationMonths: newPkg.durationMonths,
      price: newPkg.price,
      installationFee: newPkg.installationFee,
      totalPrice: newPkg.price + newPkg.installationFee,
      features,
      isPopular: newPkg.isPopular,
      color: `from-${['blue','purple','rose','emerald','amber','cyan','indigo','pink'][packages.length % 8]}-950/40 to-${['cyan','indigo','pink','teal','orange','blue','purple','rose'][packages.length % 8]}-950/40`,
    };
    await addPackage(pkg);
    refreshPackages();
    setShowPkgModal(false);
    setNewPkg({ id: '', name: '', speed: '', durationMonths: 12, price: 0, installationFee: 200, features: '', isPopular: false });
  };

  const handleDeletePkg = async (id: string) => {
    const result = await deletePackage(id);
    if (!result.ok) {
      alert(result.message);
    } else {
      refreshPackages();
    }
  };

  const handleReset = async () => {
    if (confirm('确认重置所有数据？\n所有客户、订单、线索、工单将恢复为初始演示数据。此操作不可撤销！')) {
      await resetAllData();
      setStaff(getStaff());
      window.location.reload();
    }
  };

  if (!ready) {
    return <div className="max-w-md mx-auto min-h-screen bg-[#0B0F19] flex items-center justify-center text-gray-500 text-sm">加载中...</div>;
  }

  if (!authed) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#0B0F19] flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20 mb-4">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">系统管理</h1>
            <p className="text-gray-500 text-sm mt-1">DVS网络系统管理平台</p>
          </div>
          <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-5 space-y-4">
            <input value={loginUser} onChange={e => setLoginUser(e.target.value)}
              placeholder="管理员账号"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 outline-none"
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <input value={loginPwd} onChange={e => setLoginPwd(e.target.value)}
              type="password" placeholder="密码"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 outline-none"
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            {loginErr && <div className="text-red-400 text-xs text-center">{loginErr}</div>}
            <button onClick={handleLogin} className="w-full bg-red-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-red-600 transition-colors">登 录</button>
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
        <div className="flex-1"><h1 className="font-bold text-white text-base">系统管理</h1><p className="text-[10px] text-gray-500">员工 · 套餐 · 配置</p></div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 p-2"><LogOut className="w-5 h-5" /></button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 px-4">
        {[
          { k: 'staff', l: '员工管理', icon: Users },
          { k: 'packages', l: '套餐配置', icon: Wifi },
          { k: 'settings', l: '系统设置', icon: Settings },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.k} onClick={() => setTab(t.k as typeof tab)}
              className={`flex items-center space-x-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t.k ? 'text-cyan-400 border-cyan-400' : 'text-gray-500 border-transparent'}`}>
              <Icon className="w-4 h-4" /><span>{t.l}</span>
            </button>
          );
        })}
      </div>

      {tab === 'staff' && (
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">共 {staff.length} 名员工</span>
            <button onClick={() => setShowAdd(true)} className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs px-3 py-1.5 rounded-full flex items-center space-x-1">
              <Plus className="w-3 h-3" /><span>添加员工</span>
            </button>
          </div>

          {(['super_admin', 'admin', 'sales', 'maintenance'] as const).map(role => {
            const members = staff.filter(s => s.role === role);
            if (!members.length) return null;
            const roleLabel = { super_admin: '系统管理员', admin: '运营管理', sales: '销售团队', maintenance: '维护团队' }[role];
            return (
              <div key={role}>
                <div className="text-xs text-gray-500 font-bold mb-2">{roleLabel}</div>
                {members.map(m => (
                  <motion.div key={m.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#131B2E] border border-gray-800 rounded-xl p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${m.status === 'active' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-600'}`}>
                          {m.name[0]}
                        </div>
                        <div>
                          <div className="text-white text-sm font-bold">{m.name}</div>
                          <div className="text-gray-500 text-[10px]">{m.phone}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.status === 'active' ? 'bg-emerald-950/50 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>{m.status === 'active' ? '在职' : '离职'}</span>
                        <button onClick={() => toggleStatus(m.id)} className={`text-xs px-2 py-1 rounded-lg ${m.status === 'active' ? 'text-red-400 bg-red-950/30' : 'text-emerald-400 bg-emerald-950/30'}`}>
                          {m.status === 'active' ? '禁用' : '启用'}
                        </button>
                        <button onClick={() => handleDeleteStaff(m.id)} className="text-gray-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/20 transition-colors" title="删除员工">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800/60">
                      <span className={`text-[10px] ${m.password ? 'text-emerald-400' : 'text-gray-600'}`}>
                        {m.password ? '已设置密码' : '未设置密码'}
                      </span>
                      <button onClick={() => { setShowPwdModal(m.id); setPwdValue(''); }} className="text-xs text-cyan-400 bg-cyan-950/30 border border-cyan-800/30 px-2.5 py-1 rounded-lg flex items-center space-x-1">
                        <Key className="w-3 h-3" /><span>设置密码</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'packages' && (
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">共 {packages.length} 个套餐</span>
            <button onClick={() => setShowPkgModal(true)} className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs px-3 py-1.5 rounded-full flex items-center space-x-1">
              <Plus className="w-3 h-3" /><span>添加套餐</span>
            </button>
          </div>
          {packages.map(p => (
            <div key={p.id} className="bg-[#131B2E] border border-gray-800 rounded-xl p-4 relative group">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-white font-bold flex items-center space-x-2">
                    <span>{p.name}</span>
                    {p.isPopular && <span className="text-[10px] bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-2 py-0.5 rounded-full">推荐</span>}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-800 text-cyan-400 rounded border border-gray-700">{p.speed}</span>
                    <span className="text-[10px] text-gray-500">{p.durationMonths} 个月</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white font-mono">¥{p.price}</div>
                  <div className="text-[10px] text-gray-500">安装费 ¥{p.installationFee}</div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.features.map(f => (
                  <span key={f} className="text-[10px] bg-gray-800/60 text-gray-400 px-2 py-0.5 rounded-full">{f}</span>
                ))}
              </div>
              <button onClick={() => handleDeletePkg(p.id)} className="absolute top-3 right-3 text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/20 transition-colors" title="删除套餐">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'settings' && (
        <div className="p-4 space-y-3">
          <button onClick={exportAllToExcel} className="w-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-xl py-3 text-sm font-bold flex items-center justify-center space-x-2 hover:bg-emerald-950/60 transition-colors">
            <Download className="w-4 h-4" /><span>导出全部数据到 Excel</span>
          </button>
          <div className="bg-[#131B2E] border border-gray-800 rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div><div className="text-white text-sm font-bold">平台名称</div><div className="text-gray-500 text-xs">DVS网络</div></div>
              <span className="text-[10px] text-gray-600">v2.0</span>
            </div>
            <div className="border-t border-gray-800/60 pt-4">
              <div className="text-white text-sm font-bold mb-2">系统信息</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">运行环境</span><span className="text-gray-300">微信浏览器 / Web</span></div>
                <div className="flex justify-between"><span className="text-gray-500">数据状态</span><span className="text-emerald-400">演示模式</span></div>
                <div className="flex justify-between"><span className="text-gray-500">员工数量</span><span className="text-gray-300">{staff.length} 人</span></div>
                <div className="flex justify-between"><span className="text-gray-500">套餐数量</span><span className="text-gray-300">{packages.length} 个</span></div>
              </div>
            </div>
            <div className="border-t border-gray-800/60 pt-4">
              <div className="text-white text-sm font-bold mb-2">操作日志</div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>2026-05-23 系统管理员 登录系统</div>
                <div>2026-05-22 赵经理 查看营收报表</div>
                <div>2026-05-22 陈师傅 完成工单 TK004</div>
                <div>2026-05-21 李明 新增销售线索</div>
              </div>
            </div>
            <div className="border-t border-gray-800/60 pt-4 space-y-3">
              <button onClick={handleReset} className="w-full bg-red-950/40 border border-red-800/40 text-red-400 rounded-xl py-3 text-sm font-bold hover:bg-red-950/60 transition-colors">
                🗑 重置所有数据（恢复演示数据）
              </button>
              <p className="text-[10px] text-gray-600 text-center">数据保存在浏览器 localStorage，清除浏览器缓存会丢失</p>
            </div>
          </div>
        </div>
      )}

      {/* Password Setting Modal */}
      <AnimatePresence>
        {showPwdModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowPwdModal(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-sm bg-[#1A1D2E] border border-gray-800 rounded-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                <div>
                  <h2 className="text-lg font-bold text-white">设置登录密码</h2>
                  <p className="text-xs text-gray-500">为 {staff.find(m => m.id === showPwdModal)?.name} 设置</p>
                </div>
                <button onClick={() => handleSetPassword(showPwdModal)} disabled={!pwdValue || pwdValue.length < 4} className="bg-cyan-500 text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-40">确认修改</button>
              </div>
              <div className="p-5 space-y-4">
                <input value={pwdValue} onChange={e => setPwdValue(e.target.value)} type="password" placeholder="输入密码（至少4位）" minLength={4}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none"
                  onKeyDown={e => e.key === 'Enter' && handleSetPassword(showPwdModal)} />
                <div className="flex justify-center">
                  <button onClick={() => setShowPwdModal(null)} className="text-gray-500 text-sm hover:text-gray-300 transition-colors">取消</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-sm bg-[#1A1D2E] border border-gray-800 rounded-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                <h2 className="text-lg font-bold text-white">添加员工</h2>
                <button onClick={handleAdd} disabled={!newStaff.name || !newStaff.phone} className="bg-cyan-500 text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-40">确认</button>
              </div>
              <div className="p-5 space-y-3">
                <input value={newStaff.name} onChange={e => setNewStaff(f => ({ ...f, name: e.target.value }))} placeholder="姓名 *" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
                <input value={newStaff.phone} onChange={e => setNewStaff(f => ({ ...f, phone: e.target.value }))} placeholder="手机号 *" maxLength={11} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
                <select value={newStaff.role} onChange={e => setNewStaff(f => ({ ...f, role: e.target.value as Staff['role'] }))} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none">
                  <option value="sales">销售</option>
                  <option value="maintenance">维护</option>
                  <option value="admin">运营管理</option>
                  <option value="super_admin">系统管理员</option>
                </select>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Package Modal */}
      <AnimatePresence>
        {showPkgModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowPkgModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-sm bg-[#1A1D2E] border border-gray-800 rounded-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
                <h2 className="text-lg font-bold text-white">添加套餐</h2>
                <button onClick={handleAddPkg} disabled={!newPkg.id || !newPkg.name || !newPkg.speed || !newPkg.price} className="bg-cyan-500 text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-40">确认</button>
              </div>
              <div className="p-5 space-y-3 overflow-y-auto flex-1">
                <input value={newPkg.id} onChange={e => setNewPkg(f => ({ ...f, id: e.target.value }))} placeholder="套餐 ID * (如: pkg-my-plan)" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none font-mono" />
                <input value={newPkg.name} onChange={e => setNewPkg(f => ({ ...f, name: e.target.value }))} placeholder="套餐名称 * (如: 一年 500M 超值版)" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={newPkg.speed} onChange={e => setNewPkg(f => ({ ...f, speed: e.target.value }))} placeholder="速率 * (如: 500M)" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
                  <input value={newPkg.durationMonths} onChange={e => setNewPkg(f => ({ ...f, durationMonths: Number(e.target.value) }))} type="number" min={1} placeholder="时长(月)" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input value={newPkg.price} onChange={e => setNewPkg(f => ({ ...f, price: Number(e.target.value) }))} type="number" min={0} placeholder="价格 *" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
                  <input value={newPkg.installationFee} onChange={e => setNewPkg(f => ({ ...f, installationFee: Number(e.target.value) }))} type="number" min={0} placeholder="安装费" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
                </div>
                <input value={newPkg.features} onChange={e => setNewPkg(f => ({ ...f, features: e.target.value }))} placeholder="功能特性（逗号分隔）如: 500M 光纤, 公网 IP" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
                <label className="flex items-center space-x-3 text-sm text-gray-300">
                  <input type="checkbox" checked={newPkg.isPopular} onChange={e => setNewPkg(f => ({ ...f, isPopular: e.target.checked }))} className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-cyan-500 focus:ring-cyan-500" />
                  <span>标记为推荐套餐</span>
                </label>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

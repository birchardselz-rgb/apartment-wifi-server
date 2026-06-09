'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, User, MapPin, Plus, Search, Clock, TrendingUp, DollarSign, Users, Package, Wrench, CheckCircle, AlertTriangle, LogOut } from 'lucide-react';
import { ensureInit, getLeads, getClients, getStaffByRole, addLead, updateLead, genId, addClient, addOrder, addTicket, getPortalAuth, loginPortal, logoutPortal, getPackages, getPackageById } from '@/lib/mock-data';
import type { SalesLead, BroadbandPackage } from '@/types';

const STATUS_LABELS: Record<string, string> = { new: '新线索', contacted: '已联系', negotiating: '洽谈中', converted: '已成交', lost: '已流失' };
const STATUS_COLORS: Record<string, string> = { new: 'bg-cyan-950/50 text-cyan-400', contacted: 'bg-blue-950/50 text-blue-400', negotiating: 'bg-amber-950/50 text-amber-400', converted: 'bg-emerald-950/50 text-emerald-400', lost: 'bg-red-950/50 text-red-400' };

const ISSUE_TYPES = [
  { value: 'no_connection', label: '无法上网' },
  { value: 'slow_speed', label: '网速慢' },
  { value: 'equipment_fault', label: '设备故障' },
  { value: 'installation', label: '安装服务' },
  { value: 'other', label: '其他' },
];

export default function SalesPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState<{ staffId: string; name: string } | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [loginErr, setLoginErr] = useState('');

  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [tab, setTab] = useState<'leads' | 'stats' | 'packages' | 'repair'>('leads');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', address: '', notes: '' });

  // Package selection state
  const [selPkg, setSelPkg] = useState<BroadbandPackage | null>(null);
  const [pkgForm, setPkgForm] = useState({ name: '', phone: '', address: '', roomNo: '' });
  const [pkgSuccess, setPkgSuccess] = useState('');

  // Repair form state
  const [pkgTab, setPkgTab] = useState<'repair' | 'renewal'>('repair');
  const [repairForm, setRepairForm] = useState({ name: '', phone: '', address: '', issueType: 'no_connection', description: '' });
  const [repairSuccess, setRepairSuccess] = useState('');

  // Renewal state
  const [renewPhone, setRenewPhone] = useState('');
  const [renewClient, setRenewClient] = useState<any>(null);
  const [renewPkg, setRenewPkg] = useState('');
  const [renewSuccess, setRenewSuccess] = useState('');

  useEffect(() => {
    ensureInit().then(() => {
      const auth = getPortalAuth('sales');
      if (auth) setAuthed(auth);
      setLeads(getLeads());
      setClientsCount(getClients().length);
      setReady(true);
    });
  }, []);

  const salesStaff = ready ? getStaffByRole('sales') : [];
  const filtered = leads.filter(l => l.name.includes(search) || l.phone.includes(search));
  const activeLeads = leads.filter(l => l.status !== 'converted' && l.status !== 'lost').length;
  const converted = leads.filter(l => l.status === 'converted').length;
  const conversionRate = leads.length ? Math.round(converted / leads.length * 100) : 0;
  const pkgs = ready ? getPackages() : [];

  const handleLogin = () => {
    const result = loginPortal('sales', loginUser, loginPwd);
    if (result) {
      setAuthed(result);
      setLoginErr('');
    } else {
      setLoginErr('登录名或密码错误');
    }
  };

  const handleLogout = () => {
    logoutPortal('sales');
    setAuthed(null);
    setLoginUser('');
    setLoginPwd('');
  };

  const handleAdd = async () => {
    if (!newLead.name || !newLead.phone) return;
    await addLead({
      id: genId('lead'), name: newLead.name, phone: newLead.phone,
      address: newLead.address || undefined, source: 'self_visit', status: 'new',
      notes: newLead.notes, assignedTo: authed?.staffId || salesStaff[0]?.id || 'S001',
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setLeads(getLeads());
    setShowForm(false);
    setNewLead({ name: '', phone: '', address: '', notes: '' });
  };

  const handleStatus = async (id: string, status: SalesLead['status']) => {
    await updateLead(id, { status, updatedAt: new Date().toISOString().slice(0, 10) });
    setLeads(getLeads());
  };

  const handlePkgSubmit = async () => {
    if (!selPkg || !pkgForm.name || !pkgForm.phone) return;
    const clientId = genId('client');
    await addClient({
      id: clientId, name: pkgForm.name, phone: pkgForm.phone,
      address: pkgForm.address || '待补充', roomNo: pkgForm.roomNo || '待分配',
      packageId: selPkg.id, status: 'pending_install',
      createdAt: new Date().toISOString().slice(0, 10),
      salesPersonId: authed?.staffId || 'S001',
    });
    await addOrder({
      id: genId('order'), clientId, clientName: pkgForm.name, phone: pkgForm.phone,
      packageId: selPkg.id, packageName: selPkg.name,
      amount: selPkg.price, installationFee: selPkg.installationFee,
      totalAmount: selPkg.totalPrice, status: 'pending_payment',
      createdAt: new Date().toISOString().slice(0, 10),
      salesPersonId: authed?.staffId || 'S001',
    });
    setPkgSuccess(`${pkgForm.name} 已成功办理 ${selPkg.name}，待支付`);
    setSelPkg(null);
    setPkgForm({ name: '', phone: '', address: '', roomNo: '' });
    setClientsCount(getClients().length);
    setTimeout(() => setPkgSuccess(''), 3000);
  };

  const handleRepairSubmit = async () => {
    if (!repairForm.name || !repairForm.phone || !repairForm.description) return;
    await addTicket({
      id: genId('ticket'), clientId: '',
      clientName: repairForm.name, phone: repairForm.phone,
      address: repairForm.address || '',
      issueType: repairForm.issueType as any, description: repairForm.description,
      priority: 'medium', status: 'pending',
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setRepairSuccess(`${repairForm.name} 的报修工单已提交，维护团队将尽快处理`);
    setRepairForm({ name: '', phone: '', address: '', issueType: 'no_connection', description: '' });
    setTimeout(() => setRepairSuccess(''), 3000);
  };

  const handleLookupClient = () => {
    const clients = getClients();
    const found = clients.find(c => c.phone === renewPhone);
    setRenewClient(found || null);
    setRenewPkg('');
  };

  const handleRenewSubmit = async () => {
    if (!renewClient || !renewPkg) return;
    const pkg = getPackageById(renewPkg);
    if (!pkg) return;
    await addOrder({
      id: genId('order'), clientId: renewClient.id, clientName: renewClient.name,
      phone: renewClient.phone, packageId: pkg.id, packageName: pkg.name,
      amount: pkg.price, installationFee: 0, totalAmount: pkg.price,
      status: 'pending_payment', createdAt: new Date().toISOString().slice(0, 10),
      salesPersonId: authed?.staffId || 'S001',
    });
    setRenewSuccess(`${renewClient.name} 续费 ${pkg.name} 成功，待支付`);
    setRenewPhone(''); setRenewClient(null); setRenewPkg('');
    setTimeout(() => setRenewSuccess(''), 3000);
  };

  if (!ready) {
    return <div className="max-w-md mx-auto min-h-screen bg-[#0B0F19] flex items-center justify-center text-gray-500 text-sm">加载中...</div>;
  }

  if (!authed) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#0B0F19] flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-4">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">销售端登录</h1>
            <p className="text-gray-500 text-sm mt-1">DVS网络销售管理平台</p>
          </div>
          <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-5 space-y-4">
            <input value={loginUser} onChange={e => setLoginUser(e.target.value)}
              placeholder="登录名（姓名或手机号）"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none"
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <input value={loginPwd} onChange={e => setLoginPwd(e.target.value)}
              type="password" placeholder="密码"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none"
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            {loginErr && <div className="text-red-400 text-xs text-center">{loginErr}</div>}
            <button onClick={handleLogin} className="w-full bg-cyan-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-cyan-600 transition-colors">登 录</button>
          </div>
          <button onClick={() => router.push('/')} className="mt-4 text-gray-500 text-sm flex items-center justify-center space-x-1 w-full"><ArrowLeft className="w-4 h-4" /><span>返回主页</span></button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0B0F19] pb-20">
      <header className="sticky top-0 z-40 bg-[#0F1524]/80 backdrop-blur-md border-b border-gray-800 px-4 py-3 flex items-center">
        {showForm ? (
          <>
            <button onClick={() => setShowForm(false)} className="text-gray-400 mr-3"><ArrowLeft className="w-5 h-5" /></button>
            <div className="flex-1"><h1 className="font-bold text-white text-base">新增销售线索</h1></div>
            <button onClick={handleAdd} className="text-sm font-bold text-white bg-blue-600 px-5 py-2 rounded-lg hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-600/30 shrink-0"><Plus className="w-4 h-4 inline mr-1" />确认</button>
            <span className="hidden">v2</span>
          </>
        ) : (
          <>
            <button onClick={() => router.push('/')} className="text-gray-400 mr-3"><ArrowLeft className="w-5 h-5" /></button>
            <div className="flex-1">
              <h1 className="font-bold text-white text-base">销售端</h1>
              <p className="text-[10px] text-gray-500"><User className="w-3 h-3 inline mr-0.5" />{authed.name}</p>
            </div>
            <button onClick={() => setShowForm(true)} className="bg-cyan-500 text-white p-2 rounded-xl mr-2"><Plus className="w-5 h-5" /></button>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 p-2"><LogOut className="w-5 h-5" /></button>
          </>
        )}
      </header>

      {showForm && (
        <div className="p-5 space-y-4">
          <div className="space-y-3">
            <input value={newLead.name} onChange={e => setNewLead(f => ({ ...f, name: e.target.value }))} placeholder="客户姓名 *" className="w-full bg-[#131B2E] border border-gray-700 rounded-xl px-4 py-3.5 text-white text-sm focus:border-cyan-500 outline-none transition-colors" />
            <input value={newLead.phone} onChange={e => setNewLead(f => ({ ...f, phone: e.target.value }))} placeholder="手机号 *" maxLength={11} className="w-full bg-[#131B2E] border border-gray-700 rounded-xl px-4 py-3.5 text-white text-sm focus:border-cyan-500 outline-none transition-colors" />
            <input value={newLead.address} onChange={e => setNewLead(f => ({ ...f, address: e.target.value }))} placeholder="地址" className="w-full bg-[#131B2E] border border-gray-700 rounded-xl px-4 py-3.5 text-white text-sm focus:border-cyan-500 outline-none transition-colors" />
            <textarea value={newLead.notes} onChange={e => setNewLead(f => ({ ...f, notes: e.target.value }))} placeholder="备注信息" rows={4} className="w-full bg-[#131B2E] border border-gray-700 rounded-xl px-4 py-3.5 text-white text-sm focus:border-cyan-500 outline-none resize-none transition-colors" />
          </div>
          <button onClick={handleAdd} disabled={!newLead.name || !newLead.phone} className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3.5 rounded-xl text-base font-bold shadow-lg shadow-blue-600/25 disabled:opacity-40">确认添加</button>
        </div>
      )}

      {!showForm && (<div>
      {/* Tabs */}
      <div className="flex border-b border-gray-800 px-4 overflow-x-auto">
        {[
          { k: 'leads', l: '销售线索', icon: Users },
          { k: 'stats', l: '业绩统计', icon: TrendingUp },
          { k: 'packages', l: '套餐选择', icon: Package },
          { k: 'repair', l: '报修续费', icon: Wrench },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.k} onClick={() => setTab(t.k as typeof tab)}
              className={`flex items-center space-x-1 py-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.k ? 'text-cyan-400 border-cyan-400' : 'text-gray-500 border-transparent'}`}>
              <Icon className="w-4 h-4" /><span>{t.l}</span>
            </button>
          );
        })}
      </div>

      {/* Leads Tab */}
      {tab === 'leads' && (
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索客户姓名或手机号..." className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
          </div>
          <div className="flex space-x-3 text-xs">
            <div className="bg-[#131B2E] border border-gray-800 rounded-xl px-3 py-2 flex-1 text-center"><div className="text-gray-400">待跟进</div><div className="text-cyan-400 font-bold text-lg">{activeLeads}</div></div>
            <div className="bg-[#131B2E] border border-gray-800 rounded-xl px-3 py-2 flex-1 text-center"><div className="text-gray-400">本月成交</div><div className="text-emerald-400 font-bold text-lg">{converted}</div></div>
            <div className="bg-[#131B2E] border border-gray-800 rounded-xl px-3 py-2 flex-1 text-center"><div className="text-gray-400">转化率</div><div className="text-amber-400 font-bold text-lg">{conversionRate}%</div></div>
          </div>
          <AnimatePresence>
            {filtered.map(lead => (
              <motion.div key={lead.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#131B2E] border border-gray-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-white font-bold text-sm flex items-center"><User className="w-3.5 h-3.5 mr-1.5 text-gray-500" />{lead.name}</div>
                    <div className="text-gray-500 text-xs flex items-center mt-0.5"><Phone className="w-3 h-3 mr-1" />{lead.phone}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status]}`}>{STATUS_LABELS[lead.status]}</span>
                </div>
                {lead.address && <div className="text-gray-500 text-xs flex items-center"><MapPin className="w-3 h-3 mr-1" />{lead.address}</div>}
                {lead.notes && <div className="text-gray-400 text-xs bg-gray-900/50 rounded-lg p-2">{lead.notes}</div>}
                <div className="flex space-x-2 pt-1">
                  {lead.status === 'new' && <button onClick={() => handleStatus(lead.id, 'contacted')} className="flex-1 text-xs bg-blue-950/50 text-blue-400 border border-blue-800/30 rounded-lg py-1.5">标记已联系</button>}
                  {lead.status === 'contacted' && <button onClick={() => handleStatus(lead.id, 'negotiating')} className="flex-1 text-xs bg-amber-950/50 text-amber-400 border border-amber-800/30 rounded-lg py-1.5">进入洽谈</button>}
                  {lead.status === 'negotiating' && (
                    <>
                      <button onClick={() => handleStatus(lead.id, 'converted')} className="flex-1 text-xs bg-emerald-950/50 text-emerald-400 border border-emerald-800/30 rounded-lg py-1.5">成交</button>
                      <button onClick={() => handleStatus(lead.id, 'lost')} className="flex-1 text-xs bg-red-950/50 text-red-400 border border-red-800/30 rounded-lg py-1.5">流失</button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Stats Tab */}
      {tab === 'stats' && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 rounded-xl p-4">
              <Users className="w-5 h-5 text-cyan-400 mb-2" />
              <div className="text-2xl font-bold text-white">{clientsCount}</div>
              <div className="text-xs text-gray-500">总客户数</div>
            </div>
            <div className="bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 rounded-xl p-4">
              <TrendingUp className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="text-2xl font-bold text-white">{converted}</div>
              <div className="text-xs text-gray-500">累计成交</div>
            </div>
            <div className="bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 rounded-xl p-4">
              <DollarSign className="w-5 h-5 text-amber-400 mb-2" />
              <div className="text-2xl font-bold text-white">{conversionRate}%</div>
              <div className="text-xs text-gray-500">转化率</div>
            </div>
            <div className="bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 rounded-xl p-4">
              <Clock className="w-5 h-5 text-purple-400 mb-2" />
              <div className="text-2xl font-bold text-white">{activeLeads}</div>
              <div className="text-xs text-gray-500">跟进中</div>
            </div>
          </div>
          <div className="bg-[#131B2E] border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-white mb-3">销售人员业绩</h3>
            {salesStaff.map(s => {
              const myLeads = leads.filter(l => l.assignedTo === s.id);
              const myConverted = myLeads.filter(l => l.status === 'converted').length;
              return (
                <div key={s.id} className="flex justify-between items-center py-2 border-b border-gray-800/60 last:border-0">
                  <div><div className="text-white text-sm">{s.name}</div><div className="text-gray-500 text-[10px]">{myLeads.length} 条线索</div></div>
                  <div className="text-emerald-400 font-bold">{myConverted} 成交</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Package Selection Tab */}
      {tab === 'packages' && (
        <div className="p-4 space-y-4">
          <h2 className="text-white font-bold text-base flex items-center"><Package className="w-5 h-5 mr-2 text-cyan-400" />套餐选择</h2>
          {pkgSuccess && (
            <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-xl p-3 text-sm flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 shrink-0" />{pkgSuccess}
            </div>
          )}
          <div className="space-y-3">
            {pkgs.map(p => (
              <div key={p.id} onClick={() => { setSelPkg(p); setPkgSuccess(''); }}
                className={`bg-[#131B2E] border rounded-xl p-4 cursor-pointer transition-all ${selPkg?.id === p.id ? 'border-cyan-500 ring-1 ring-cyan-500/30' : 'border-gray-800 hover:border-gray-600'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-white font-bold">{p.name}</div>
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
                {selPkg?.id === p.id && (
                  <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                    <input value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} placeholder="客户姓名 *" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none" />
                    <input value={pkgForm.phone} onChange={e => setPkgForm(f => ({ ...f, phone: e.target.value }))} placeholder="手机号 *" maxLength={11} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none" />
                    <input value={pkgForm.address} onChange={e => setPkgForm(f => ({ ...f, address: e.target.value }))} placeholder="地址" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none" />
                    <input value={pkgForm.roomNo} onChange={e => setPkgForm(f => ({ ...f, roomNo: e.target.value }))} placeholder="房号" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none" />
                    <button onClick={handlePkgSubmit} disabled={!pkgForm.name || !pkgForm.phone}
                      className="w-full bg-cyan-500 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-40">确认办理</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fault Repair & Renewal Tab */}
      {tab === 'repair' && (
        <div className="p-4 space-y-4">
          <div className="flex space-x-2 border-b border-gray-800 pb-0">
            <button onClick={() => setPkgTab('repair')}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${pkgTab === 'repair' ? 'text-amber-400 border-amber-400' : 'text-gray-500 border-transparent'}`}>故障报修</button>
            <button onClick={() => setPkgTab('renewal')}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${pkgTab === 'renewal' ? 'text-cyan-400 border-cyan-400' : 'text-gray-500 border-transparent'}`}>续费</button>
          </div>

          {pkgTab === 'repair' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">为客户提交故障报修工单，工单将自动派发给维护团队</p>
              {repairSuccess && (
                <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-xl p-3 text-sm flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 shrink-0" />{repairSuccess}
                </div>
              )}
              <div className="bg-[#131B2E] border border-gray-800 rounded-xl p-4 space-y-3">
                <input value={repairForm.name} onChange={e => setRepairForm(f => ({ ...f, name: e.target.value }))} placeholder="客户姓名 *" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
                <input value={repairForm.phone} onChange={e => setRepairForm(f => ({ ...f, phone: e.target.value }))} placeholder="手机号 *" maxLength={11} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
                <input value={repairForm.address} onChange={e => setRepairForm(f => ({ ...f, address: e.target.value }))} placeholder="地址" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
                <select value={repairForm.issueType} onChange={e => setRepairForm(f => ({ ...f, issueType: e.target.value }))} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none">
                  {ISSUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <textarea value={repairForm.description} onChange={e => setRepairForm(f => ({ ...f, description: e.target.value }))} placeholder="故障描述 *" rows={3} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none resize-none" />
                <button onClick={handleRepairSubmit} disabled={!repairForm.name || !repairForm.phone || !repairForm.description}
                  className="w-full bg-amber-500 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40">提交报修</button>
              </div>
            </div>
          )}

          {pkgTab === 'renewal' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">查询客户当前套餐并办理续费</p>
              {renewSuccess && (
                <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-xl p-3 text-sm flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 shrink-0" />{renewSuccess}
                </div>
              )}
              <div className="bg-[#131B2E] border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex space-x-2">
                  <input value={renewPhone} onChange={e => setRenewPhone(e.target.value)} placeholder="输入客户手机号查询" maxLength={11}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
                  <button onClick={handleLookupClient} disabled={!renewPhone} className="bg-cyan-500 text-white px-4 rounded-xl text-sm font-bold disabled:opacity-40">查询</button>
                </div>
                {renewClient === null && renewPhone && (
                  <div className="text-amber-400 text-xs flex items-center"><AlertTriangle className="w-3 h-3 mr-1" />未找到该手机号的客户</div>
                )}
                {renewClient && (
                  <>
                    <div className="bg-gray-900 rounded-xl p-3 space-y-1">
                      <div className="text-white text-sm font-bold">{renewClient.name}</div>
                      <div className="text-gray-400 text-xs">{renewClient.phone} · {renewClient.roomNo}</div>
                      <div className="text-gray-500 text-xs">当前套餐：{pkgs.find(p => p.id === renewClient.packageId)?.name || '未知'}</div>
                      {renewClient.expiryDate && <div className="text-amber-400 text-xs">到期时间：{renewClient.expiryDate}</div>}
                    </div>
                    <select value={renewPkg} onChange={e => setRenewPkg(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none">
                      <option value="">选择续费套餐</option>
                      {pkgs.map(p => <option key={p.id} value={p.id}>{p.name} - ¥{p.price}</option>)}
                    </select>
                    <button onClick={handleRenewSubmit} disabled={!renewPkg}
                      className="w-full bg-emerald-500 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40">确认续费</button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      </div>)}

    </div>
  );
}

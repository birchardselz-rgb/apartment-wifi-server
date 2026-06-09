'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wrench, Phone, MapPin, AlertTriangle, CheckCircle, Clock, User, Plus, Search, LogOut } from 'lucide-react';
import { getTickets, getStaffByRole, updateTicket, addTicket, genId, ensureInit, getPortalAuth, loginPortal, logoutPortal } from '@/lib/mock-data';
import type { Ticket } from '@/types';

const TYPE_LABELS: Record<string, string> = { no_connection: '无法上网', slow_speed: '网速慢', equipment_fault: '设备故障', installation: '安装服务', other: '其他' };
const PRIORITY_COLORS: Record<string, string> = { low: 'bg-gray-800 text-gray-400', medium: 'bg-blue-950/50 text-blue-400', high: 'bg-amber-950/50 text-amber-400', urgent: 'bg-red-950/50 text-red-400' };
const STATUS_LABELS: Record<string, string> = { pending: '待处理', assigned: '已派单', in_progress: '处理中', resolved: '已解决', closed: '已关闭' };
const STATUS_COLORS: Record<string, string> = { pending: 'text-gray-400', assigned: 'text-blue-400', in_progress: 'text-amber-400', resolved: 'text-emerald-400', closed: 'text-gray-600' };

export default function MaintenancePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState<{ staffId: string; name: string } | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [loginErr, setLoginErr] = useState('');

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newTicket, setNewTicket] = useState({ clientName: '', phone: '', address: '', issueType: 'no_connection' as Ticket['issueType'], description: '' });

  useEffect(() => {
    ensureInit().then(() => {
      const auth = getPortalAuth('maintenance');
      if (auth) setAuthed(auth);
      setTickets(getTickets());
      setReady(true);
    });
  }, []);

  const handleLogin = () => {
    const result = loginPortal('maintenance', loginUser, loginPwd);
    if (result) {
      setAuthed(result);
      setLoginErr('');
    } else {
      setLoginErr('登录名或密码错误');
    }
  };

  const handleLogout = () => {
    logoutPortal('maintenance');
    setAuthed(null);
    setLoginUser('');
    setLoginPwd('');
  };

  const maintenanceStaff = ready ? getStaffByRole('maintenance') : [];
  const filtered = tickets.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search && !t.clientName.includes(search) && !t.phone.includes(search)) return false;
    return true;
  });

  const pending = tickets.filter(t => t.status === 'pending' || t.status === 'assigned').length;
  const inProgress = tickets.filter(t => t.status === 'in_progress').length;
  const resolved = tickets.filter(t => t.status === 'resolved').length;

  const handleAssign = async (id: string) => {
    const tech = maintenanceStaff[Math.floor(Math.random() * maintenanceStaff.length)];
    await updateTicket(id, { status: 'assigned', assignedTo: tech.id });
    setTickets(getTickets());
  };

  const handleProgress = async (id: string) => {
    await updateTicket(id, { status: 'in_progress' });
    setTickets(getTickets());
  };

  const handleResolve = async (id: string) => {
    const resolution = prompt('请输入处理结果：');
    if (resolution) {
      await updateTicket(id, { status: 'resolved', resolvedAt: new Date().toISOString().slice(0, 10), resolution });
      setTickets(getTickets());
    }
  };

  const handleAddTicket = async () => {
    if (!newTicket.clientName || !newTicket.phone || !newTicket.description) return;
    await addTicket({ id: genId('ticket'), clientId: '', ...newTicket, priority: 'medium', status: 'pending', createdAt: new Date().toISOString().slice(0, 10) });
    setTickets(getTickets());
    setShowForm(false);
    setNewTicket({ clientName: '', phone: '', address: '', issueType: 'no_connection', description: '' });
  };

  if (!ready) {
    return <div className="max-w-md mx-auto min-h-screen bg-[#0B0F19] flex items-center justify-center text-gray-500 text-sm">加载中...</div>;
  }

  if (!authed) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#0B0F19] flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">维护端登录</h1>
            <p className="text-gray-500 text-sm mt-1">DVS网络维护管理平台</p>
          </div>
          <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-5 space-y-4">
            <input value={loginUser} onChange={e => setLoginUser(e.target.value)}
              placeholder="登录名（姓名或手机号）"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none"
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <input value={loginPwd} onChange={e => setLoginPwd(e.target.value)}
              type="password" placeholder="密码"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none"
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            {loginErr && <div className="text-red-400 text-xs text-center">{loginErr}</div>}
            <button onClick={handleLogin} className="w-full bg-amber-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors">登 录</button>
            <div className="text-[10px] text-gray-600 text-center">维护人员使用系统管理员分配的账号登录</div>
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
            <div className="flex-1"><h1 className="font-bold text-white text-base">新建工单</h1></div>
            <button onClick={handleAddTicket} className="text-sm font-bold text-white bg-blue-600 px-5 py-2 rounded-lg hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-600/30 shrink-0"><Plus className="w-4 h-4 inline mr-1" />确认创建</button>
          </>
        ) : (
          <>
            <button onClick={() => router.push('/')} className="text-gray-400 mr-3"><ArrowLeft className="w-5 h-5" /></button>
            <div className="flex-1"><h1 className="font-bold text-white text-base">维护端</h1><p className="text-[10px] text-gray-500"><User className="w-3 h-3 inline mr-0.5" />{authed.name}</p></div>
            <button onClick={() => setShowForm(true)} className="bg-amber-500 text-white p-2 rounded-xl mr-2"><Plus className="w-5 h-5" /></button>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 p-2"><LogOut className="w-5 h-5" /></button>
          </>
        )}
      </header>

      {showForm && (
        <div className="p-5 space-y-4">
          <div className="space-y-3">
            <input value={newTicket.clientName} onChange={e => setNewTicket(f => ({ ...f, clientName: e.target.value }))} placeholder="客户姓名 *" className="w-full bg-[#131B2E] border border-gray-700 rounded-xl px-4 py-3.5 text-white text-sm focus:border-amber-500 outline-none transition-colors" />
            <input value={newTicket.phone} onChange={e => setNewTicket(f => ({ ...f, phone: e.target.value }))} placeholder="手机号 *" maxLength={11} className="w-full bg-[#131B2E] border border-gray-700 rounded-xl px-4 py-3.5 text-white text-sm focus:border-amber-500 outline-none transition-colors" />
            <input value={newTicket.address} onChange={e => setNewTicket(f => ({ ...f, address: e.target.value }))} placeholder="地址" className="w-full bg-[#131B2E] border border-gray-700 rounded-xl px-4 py-3.5 text-white text-sm focus:border-amber-500 outline-none transition-colors" />
            <select value={newTicket.issueType} onChange={e => setNewTicket(f => ({ ...f, issueType: e.target.value as Ticket['issueType'] }))} className="w-full bg-[#131B2E] border border-gray-700 rounded-xl px-4 py-3.5 text-white text-sm focus:border-amber-500 outline-none">
              <option value="no_connection">无法上网</option>
              <option value="slow_speed">网速慢</option>
              <option value="equipment_fault">设备故障</option>
              <option value="installation">安装服务</option>
              <option value="other">其他</option>
            </select>
            <textarea value={newTicket.description} onChange={e => setNewTicket(f => ({ ...f, description: e.target.value }))} placeholder="故障描述 *" rows={4} className="w-full bg-[#131B2E] border border-gray-700 rounded-xl px-4 py-3.5 text-white text-sm focus:border-amber-500 outline-none resize-none transition-colors" />
          </div>
          <button onClick={handleAddTicket} disabled={!newTicket.clientName || !newTicket.phone || !newTicket.description} className="w-full bg-gradient-to-r from-blue-600 to-amber-500 text-white py-3.5 rounded-xl text-base font-bold shadow-lg shadow-blue-600/25 disabled:opacity-40">确认创建</button>
        </div>
      )}

      {!showForm && (<div>

      {/* Stats */}
      <div className="flex space-x-2 p-4 pb-2">
        <div className="bg-[#131B2E] border border-gray-800 rounded-xl px-3 py-2 flex-1 text-center"><div className="text-xs text-gray-400">待处理</div><div className="text-lg font-bold text-amber-400">{pending}</div></div>
        <div className="bg-[#131B2E] border border-gray-800 rounded-xl px-3 py-2 flex-1 text-center"><div className="text-xs text-gray-400">处理中</div><div className="text-lg font-bold text-blue-400">{inProgress}</div></div>
        <div className="bg-[#131B2E] border border-gray-800 rounded-xl px-3 py-2 flex-1 text-center"><div className="text-xs text-gray-400">本月解决</div><div className="text-lg font-bold text-emerald-400">{resolved}</div></div>
      </div>

      {/* Filter + Search */}
      <div className="px-4 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索..." className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:border-cyan-500 outline-none" />
        </div>
        <div className="flex space-x-2 overflow-x-auto pb-1">
          {[{ k: 'all', l: '全部' }, { k: 'pending', l: '待处理' }, { k: 'assigned', l: '已派单' }, { k: 'in_progress', l: '处理中' }, { k: 'resolved', l: '已解决' }].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap ${filter === f.k ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>{f.l}</button>
          ))}
        </div>
      </div>

      {/* Tickets */}
      <div className="p-4 space-y-3">
        <AnimatePresence>
          {filtered.map(ticket => (
            <motion.div key={ticket.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#131B2E] border border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority === 'urgent' ? '紧急' : ticket.priority === 'high' ? '高' : ticket.priority === 'medium' ? '中' : '低'}</span>
                  <span className={`text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>{STATUS_LABELS[ticket.status]}</span>
                </div>
                <span className="text-[10px] text-gray-600">{ticket.createdAt}</span>
              </div>
              <div className="text-white text-sm font-bold">{ticket.clientName} · {TYPE_LABELS[ticket.issueType]}</div>
              <div className="text-xs text-gray-400 flex items-center"><Phone className="w-3 h-3 mr-1" />{ticket.phone}</div>
              {ticket.address && <div className="text-xs text-gray-500 flex items-center"><MapPin className="w-3 h-3 mr-1" />{ticket.address}</div>}
              <div className="text-xs text-gray-400 bg-gray-900/50 rounded-lg p-2.5">{ticket.description}</div>
              {ticket.resolution && <div className="text-xs text-emerald-400 bg-emerald-950/20 rounded-lg p-2.5">✅ {ticket.resolution}</div>}
              <div className="flex space-x-2 pt-1">
                {ticket.status === 'pending' && <button onClick={() => handleAssign(ticket.id)} className="flex-1 text-xs bg-blue-950/50 text-blue-400 border border-blue-800/30 rounded-lg py-1.5">派单</button>}
                {ticket.status === 'assigned' && <button onClick={() => handleProgress(ticket.id)} className="flex-1 text-xs bg-amber-950/50 text-amber-400 border border-amber-800/30 rounded-lg py-1.5">开始处理</button>}
                {ticket.status === 'in_progress' && <button onClick={() => handleResolve(ticket.id)} className="flex-1 text-xs bg-emerald-950/50 text-emerald-400 border border-emerald-800/30 rounded-lg py-1.5">完成处理</button>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      </div>)}
    </div>
  );
}

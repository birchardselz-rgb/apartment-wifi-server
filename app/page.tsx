'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi, TrendingUp, Wrench, BarChart3, Shield,
  Check, CreditCard, ArrowLeft, User, Phone, MapPin, Home, ShieldCheck, Package, AlertTriangle, CheckCircle,
  Plus, Search, Clock, DollarSign, Users, Activity, Download, Upload, Key, LogOut, Settings, Trash2
} from 'lucide-react';
import {
  ensureInit, getPackages,
  addClient, addOrder, addLead, addTicket, genId, getClients, getPackageById,
  getLeads, getStaffByRole, updateLead, getStaff, addStaff, updateStaff, deleteStaff, resetAllData, setStaffPassword,
  getPortalAuth, loginPortal, logoutPortal, getDashboardStats,
  getTickets, updateTicket,
  getOrders, addPackage, deletePackage
} from '@/lib/mock-data';
import { exportAllToExcel, importFromExcel } from '@/lib/excel';
import type { SalesLead, BroadbandPackage, Client, Order, DashboardStats, Ticket, Staff } from '@/types';

// ============================================================
// Tab definitions
// ============================================================
const TABS = [
  { id: 'client',      label: '客户端',     icon: Wifi,      color: 'from-cyan-500 to-blue-600',     activeColor: 'text-cyan-400' },
  { id: 'sales',       label: '销售端',     icon: TrendingUp, color: 'from-emerald-500 to-teal-600',  activeColor: 'text-emerald-400' },
  { id: 'maintenance', label: '维护端',     icon: Wrench,     color: 'from-amber-500 to-orange-600',  activeColor: 'text-amber-400' },
  { id: 'admin',       label: '后台数据端', icon: BarChart3,  color: 'from-purple-500 to-pink-600',   activeColor: 'text-purple-400' },
  { id: 'system',      label: '系统管理',   icon: Shield,     color: 'from-red-500 to-rose-600',      activeColor: 'text-red-400' },
];

const ISSUE_TYPES = [
  { value: 'no_connection', label: '无法上网' },
  { value: 'slow_speed', label: '网速慢' },
  { value: 'equipment_fault', label: '设备故障' },
  { value: 'installation', label: '安装服务' },
  { value: 'other', label: '其他' },
];

const STATUS_LABELS: Record<string, string> = { new: '新线索', contacted: '已联系', negotiating: '洽谈中', converted: '已成交', lost: '已流失' };
const STATUS_COLORS: Record<string, string> = { new: 'bg-cyan-950/50 text-cyan-400', contacted: 'bg-blue-950/50 text-blue-400', negotiating: 'bg-amber-950/50 text-amber-400', converted: 'bg-emerald-950/50 text-emerald-400', lost: 'bg-red-950/50 text-red-400' };

const TYPE_LABELS_R: Record<string, string> = { no_connection: '无法上网', slow_speed: '网速慢', equipment_fault: '设备故障', installation: '安装服务', other: '其他' };
const PRIORITY_COLORS: Record<string, string> = { low: 'bg-gray-800 text-gray-400', medium: 'bg-blue-950/50 text-blue-400', high: 'bg-amber-950/50 text-amber-400', urgent: 'bg-red-950/50 text-red-400' };
const STATUS_LABELS_R: Record<string, string> = { pending: '待处理', assigned: '已派单', in_progress: '处理中', resolved: '已解决', closed: '已关闭' };
const STATUS_COLORS_R: Record<string, string> = { pending: 'text-gray-400', assigned: 'text-blue-400', in_progress: 'text-amber-400', resolved: 'text-emerald-400', closed: 'text-gray-600' };

type FormData = { name: string; phone: string; address: string; roomNo: string };

// ============================================================
// Tech SVG Illustrations (Apple-style)
// ============================================================
function HeroTechSVG() {
  return (
    <svg viewBox="0 0 375 480" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="heroCyan" cx="25%" cy="45%" r="70%">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.18" />
          <stop offset="35%" stopColor="#0066ff" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="heroAmber" cx="80%" cy="65%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fiberBeam" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0" />
          <stop offset="25%" stopColor="#00d4ff" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#0088ff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="routerMetal" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4a4a5a" />
          <stop offset="50%" stopColor="#2a2a3a" />
          <stop offset="100%" stopColor="#1a1a2a" />
        </linearGradient>
        <filter id="hGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="hGlowB"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="hGlowL"><feGaussianBlur stdDeviation="15" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="375" height="480" fill="url(#heroCyan)" />
      <rect width="375" height="480" fill="url(#heroAmber)" />
      {/* Grid */}
      <g stroke="#ffffff" strokeOpacity="0.012" strokeWidth="0.5">
        {[0,1,2,3,4,5,6,7,8,9,10,11,12,13].map(i => <line key={`h${i}`} x1="0" y1={i*36} x2="375" y2={i*36} />)}
        {[0,1,2,3,4,5,6,7,8,9,10].map(i => <line key={`v${i}`} x1={i*36} y1="0" x2={i*36} y2="480" />)}
      </g>
      {/* Bokeh circles */}
      <g filter="url(#hGlowL)">
        <circle cx="60" cy="130" r="22" fill="#00d4ff" opacity="0.04" />
        <circle cx="280" cy="90" r="30" fill="#0066ff" opacity="0.03" />
        <circle cx="340" cy="250" r="18" fill="#00d4ff" opacity="0.035" />
        <circle cx="40" cy="320" r="25" fill="#0088ff" opacity="0.025" />
        <circle cx="320" cy="160" r="12" fill="#00d4ff" opacity="0.05" />
        <circle cx="180" cy="60" r="15" fill="#f59e0b" opacity="0.02" />
      </g>
      {/* Macro fiber optic bundle - close up perspective */}
      <g fill="none" strokeLinecap="round">
        <path d="M-60,380 Q40,220 140,260 T440,200" stroke="url(#fiberBeam)" strokeWidth="3.5" filter="url(#hGlow)" />
        <path d="M-60,400 Q50,240 150,280 T440,220" stroke="#0088ff" strokeWidth="2" opacity="0.35" />
        <path d="M-60,360 Q30,200 130,240 T440,180" stroke="#00d4ff" strokeWidth="1.2" opacity="0.2" />
        <path d="M-40,420 Q70,260 170,300 T440,240" stroke="#0066cc" strokeWidth="0.8" opacity="0.15" />
        <path d="M-80,350 Q10,190 110,230 T440,160" stroke="#00d4ff" strokeWidth="0.6" opacity="0.12" />
      </g>
      {/* Metallic router silhouette (macro perspective) */}
      <g transform="translate(285, 310)" opacity="0.2">
        <rect x="-45" y="-12" width="90" height="24" rx="4" fill="url(#routerMetal)" stroke="#f59e0b" strokeOpacity="0.3" strokeWidth="0.8" />
        <rect x="-30" y="-18" width="60" height="6" rx="2" fill="#f59e0b" opacity="0.4" />
        <rect x="-15" y="-3" width="30" height="8" rx="1.5" fill="#f59e0b" opacity="0.08" />
        <line x1="-20" y1="-12" x2="-20" y2="-25" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
        <line x1="0" y1="-12" x2="0" y2="-28" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <line x1="20" y1="-12" x2="20" y2="-25" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      </g>
      {/* Light particles */}
      <g filter="url(#hGlow)">
        <circle cx="110" cy="190" r="2.5" fill="#00d4ff" opacity="0.9" />
        <circle cx="190" cy="230" r="2" fill="#00d4ff" opacity="0.7" />
        <circle cx="310" cy="175" r="3" fill="#00d4ff" opacity="0.8" />
        <circle cx="160" cy="260" r="1.5" fill="#0088ff" opacity="0.6" />
        <circle cx="260" cy="205" r="2.5" fill="#00d4ff" opacity="0.65" />
        <circle cx="350" cy="250" r="1.2" fill="#0099ff" opacity="0.8" />
        <circle cx="70" cy="150" r="1.5" fill="#00d4ff" opacity="0.5" />
        <circle cx="220" cy="180" r="2" fill="#0088ff" opacity="0.55" />
        <circle cx="340" cy="290" r="1.8" fill="#0099ff" opacity="0.4" />
        <circle cx="50" cy="250" r="1.2" fill="#00d4ff" opacity="0.6" />
        <circle cx="280" cy="145" r="1.8" fill="#00d4ff" opacity="0.5" />
        <circle cx="130" cy="130" r="1" fill="#0088ff" opacity="0.7" />
        <circle cx="370" cy="180" r="2" fill="#f59e0b" opacity="0.3" />
        <circle cx="30" cy="190" r="1" fill="#f59e0b" opacity="0.25" />
        <circle cx="200" cy="350" r="1.2" fill="#00d4ff" opacity="0.35" />
      </g>
      {/* Bottom fiber glow line */}
      <line x1="0" y1="478" x2="375" y2="478" stroke="#00d4ff" strokeWidth="0.8" opacity="0.06" />
      <line x1="0" y1="0" x2="375" y2="0" stroke="#00d4ff" strokeWidth="0.5" opacity="0.03" />
    </svg>
  );
}

// ============================================================
// Client Tab
// ============================================================
function ClientTab() {
  const [view, setView] = useState<'menu' | 'plans' | 'repair'>('menu');
  const [selectedPkg, setSelectedPkg] = useState('pkg-year-500');
  const [step, setStep] = useState<'plans' | 'form' | 'confirm' | 'done'>('plans');
  const [form, setForm] = useState<FormData>({ name: '', phone: '', address: '', roomNo: '' });
  const [submitted, setSubmitted] = useState(false);
  const [repairTab, setRepairTab] = useState<'repair' | 'renewal'>('repair');
  const [repairForm, setRepairForm] = useState({ name: '', phone: '', address: '', issueType: 'no_connection', description: '' });
  const [repairSuccess, setRepairSuccess] = useState('');
  const [renewPhone, setRenewPhone] = useState('');
  const [renewClient, setRenewClient] = useState<any>(null);
  const [renewPkg, setRenewPkg] = useState('');
  const [renewSuccess, setRenewSuccess] = useState('');
  const [renewName, setRenewName] = useState('');
  const [renewRoom, setRenewRoom] = useState('');
  const [packages, setPackages] = useState<BroadbandPackage[]>([]);

  useEffect(() => {
    const pkgs = getPackages();
    setPackages(pkgs);
    if (pkgs.length > 0 && !pkgs.find(p => p.id === selectedPkg)) {
      setSelectedPkg(pkgs[0].id);
    }
  }, []);

  const pkg = packages.find(p => p.id === selectedPkg)!;
  const pkgs = packages;

  const updateForm = (key: keyof FormData, val: string) => setForm(f => ({ ...f, [key]: val }));
  const isValid = form.name.length >= 2 && /^1\d{10}$/.test(form.phone) && form.address.length > 2 && form.roomNo.length > 0;
  const updateRepair = (k: string, v: string) => setRepairForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSubmitted(true);
    try {
      const clientId = genId('client');
      const orderId = genId('order');
      await addClient({ id: clientId, name: form.name, phone: form.phone, address: form.address, roomNo: form.roomNo, packageId: selectedPkg, status: 'pending_install', createdAt: new Date().toISOString().slice(0, 10) });
      await addOrder({ id: orderId, clientId, clientName: form.name, phone: form.phone, packageId: selectedPkg, packageName: pkg.name, amount: pkg.price, installationFee: pkg.installationFee, totalAmount: pkg.totalPrice, status: 'pending_payment', createdAt: new Date().toISOString().slice(0, 10) });
      const defaultSales = getStaffByRole('sales')[0]; await addLead({ id: genId('lead'), name: form.name, phone: form.phone, address: `${form.address} ${form.roomNo}`, source: 'self_visit', status: 'new', notes: `自助登记 ${pkg.name}，待跟进`, assignedTo: defaultSales?.id || 'S001', createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10) });
      await addTicket({ id: genId('ticket'), clientId, clientName: form.name, phone: form.phone, address: `${form.address} ${form.roomNo}`, issueType: 'installation', description: `新装宽带：${pkg.name}，请尽快安排安装`, priority: 'medium', status: 'pending', createdAt: new Date().toISOString().slice(0, 10) });
      setTimeout(() => setStep('done'), 400);
    } catch (err) {
      alert('提交失败，请重试');
      setSubmitted(false);
    }
  };

  const handleRepairSubmit = async () => {
    if (!repairForm.name || !repairForm.phone || !repairForm.description) return;
    await addTicket({ id: genId('ticket'), clientId: '', clientName: repairForm.name, phone: repairForm.phone, address: repairForm.address || '', issueType: repairForm.issueType as any, description: repairForm.description, priority: 'medium', status: 'pending', createdAt: new Date().toISOString().slice(0, 10) });
    setRepairSuccess('报修工单已提交，维护团队将尽快与您联系');
    setRepairForm({ name: '', phone: '', address: '', issueType: 'no_connection', description: '' });
    setTimeout(() => setRepairSuccess(''), 4000);
  };

  const handleLookupClient = () => {
    const clients = getClients();
    const found = clients.find(c => c.phone === renewPhone) || null;
    setRenewClient(found);
    if (found) { setRenewName(found.name); setRenewRoom(found.roomNo || ''); }
    setRenewPkg('');
  };

  const handleRenewSubmit = async () => {
    if (!renewPkg) return;
    const p = getPackageById(renewPkg);
    if (!p) return;
    const name = renewClient ? renewClient.name : renewName;
    const phone = renewClient ? renewClient.phone : renewPhone;
    const room = renewClient ? renewClient.roomNo : renewRoom;
    if (!name || !phone) return;
    await addOrder({ id: genId('order'), clientId: renewClient?.id || '', clientName: name, phone, packageId: p.id, packageName: p.name, amount: p.price, installationFee: 0, totalAmount: p.price, status: 'pending_payment', createdAt: new Date().toISOString().slice(0, 10) });
    setRenewSuccess(name + ' 续费 ' + p.name + ' 成功');
    setRenewPhone(''); setRenewName(''); setRenewRoom(''); setRenewClient(null); setRenewPkg('');
    setTimeout(() => setRenewSuccess(''), 4000);
  };

  if (view === 'menu') return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* ===== Hero Section ===== */}
      <div className="relative h-[30vh] min-h-[200px] overflow-hidden">
        <div className="absolute inset-0"><HeroTechSVG /></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F19]/40 via-transparent to-[#0B0F19]" />
        <div className="absolute inset-0 flex flex-col justify-center px-7 pt-4">
          <div className="inline-block self-start px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold tracking-[0.15em] text-cyan-400/70 uppercase mb-4">
            DVS网络
          </div>
          <h1 className="text-[2.5rem] sm:text-5xl font-bold text-white tracking-tight leading-[1.05]">
            极速，<br />超乎想象。
          </h1>
          <p className="text-sm text-gray-400 font-light tracking-wide mt-2.5 max-w-[280px]">
            1000M 光纤到户 · 全屋 Wi-Fi 覆盖 · 尊享品质体验
          </p>
        </div>
        {/* Scroll hint removed - fixed layout */}
      </div>

      {/* ===== Bento Grid Cards ===== */}
      <div className="flex-1 px-4 pt-3 pb-2 space-y-3 overflow-hidden">
        {/* Main Card - 套餐选择 */}
        <motion.button initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          onClick={() => { setView('plans'); setStep('plans'); }}
          className="relative w-full text-left bg-gradient-to-br from-[#161B2E]/95 to-[#0F1524]/95 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 overflow-hidden group hover:border-orange-500/25 active:scale-[0.99] transition-all duration-300">
          {/* Glass shine */}
          <div className="absolute -inset-x-20 -top-40 h-60 bg-gradient-to-b from-white/[0.03] to-transparent rounded-full blur-3xl group-hover:from-white/[0.05] transition-all duration-500" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-purple-600/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center space-x-2.5 mb-3">
              <div className="w-2 h-2 rounded-full bg-orange-400 shadow-lg shadow-orange-400/50"><motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} className="w-full h-full rounded-full bg-orange-400" /></div>
              <span className="text-[20px] font-semibold tracking-[0.12em] text-orange-400/70 uppercase">宽带套餐</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">尊享千兆光纤套餐</h2>
            <p className="text-sm text-gray-400/80 mt-1.5 font-light">1000M 光纤直达每个房间 · 全家畅享极速网络</p>
            <div className="mt-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span className="flex items-center space-x-1"><span className="w-1 h-1 rounded-full bg-emerald-500/60" /><span>公网 IP</span></span>
                  <span className="text-gray-700/60">|</span>
                  <span className="flex items-center space-x-1"><span className="w-1 h-1 rounded-full bg-emerald-500/60" /><span>7×24 售后</span></span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-orange-500 to-purple-600 text-white text-sm font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/30 group-hover:scale-[1.02] transition-all duration-300 text-center whitespace-nowrap">
                立即办理
              </div>
            </div>
          </div>
          {/* Bottom glow line */}
          <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-orange-400/15 to-transparent" />
        </motion.button>

        {/* Twin Cards */}
        <div className="grid grid-cols-2 gap-3 pb-2">
          {/* 故障报修 */}
          <motion.button initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            onClick={() => { setRepairTab('repair'); setView('repair'); }}
            className="relative bg-gradient-to-br from-[#161B2E]/95 to-[#0F1524]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 text-left overflow-hidden group hover:border-orange-500/25 active:scale-[0.98] transition-all duration-300">
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-orange-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-orange-400/10 to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-3">
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }} className="w-2 h-2 rounded-full bg-orange-400 shadow-lg shadow-orange-400/40" />
                <span className="text-[18px] font-semibold tracking-[0.12em] text-orange-400/70 uppercase">故障报修</span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight mb-1">急速响应</h3>
              <p className="text-xs text-gray-400/70 font-light leading-relaxed">专业维护团队<br />快速上门服务</p>
            </div>
          </motion.button>

          {/* 快捷续费 */}
          <motion.button initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            onClick={() => { setRepairTab('renewal'); setView('repair'); }}
            className="relative bg-gradient-to-br from-[#161B2E]/95 to-[#0F1524]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 text-left overflow-hidden group hover:border-purple-500/25 active:scale-[0.98] transition-all duration-300">
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-purple-500/5 rounded-full blur-3xl" />
            {/* Aurora line decoration */}
            <div className="absolute bottom-3 left-3 right-3 h-[2px] overflow-hidden rounded-full opacity-40">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-3">
                <svg width="16" height="16" viewBox="0 0 20 20" className="opacity-60">
                  <defs><linearGradient id="aurora" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#a855f7" stopOpacity="0" /><stop offset="50%" stopColor="#a855f7" stopOpacity="0.9" /><stop offset="100%" stopColor="#a855f7" stopOpacity="0" /></linearGradient></defs>
                  <path d="M2,14 Q5,5 10,9 T18,2" fill="none" stroke="url(#aurora)" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M2,17 Q5,8 10,12 T18,5" fill="none" stroke="url(#aurora)" strokeWidth="0.6" strokeLinecap="round" opacity="0.5" />
                </svg>
                <span className="text-[18px] font-semibold tracking-[0.12em] text-purple-400/70 uppercase">快捷续费</span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight mb-1">网络不断流</h3>
              <p className="text-xs text-gray-400/70 font-light leading-relaxed">一键续费即办即通<br />保障网络永续</p>
            </div>
          </motion.button>
        </div>

        {/* ===== Tech Footer ===== */}
        <div className="relative py-6 text-center overflow-hidden select-none">
          <div className="text-[2.5rem] sm:text-[3.25rem] font-black text-white/[0.04] tracking-[0.18em] leading-none pointer-events-none">
            TECH-NET
          </div>
          <p className="text-[10px] text-gray-700 mt-1.5 tracking-widest font-medium">DVS网络 · 智联未来</p>
          <p className="text-[8px] text-gray-800 mt-0.5">v2.0 光纤宽带管理平台</p>
        </div>
      </div>
    </div>
  );

  if (view === 'plans') {
    if (step === 'done') return (
      <div className="flex flex-col items-center justify-center p-6 text-center min-h-[70vh]">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-emerald-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">提交成功！</h2>
        <p className="text-gray-400 text-sm mb-2">我们已收到您的宽带申请</p>
        <div className="bg-[#131B2E] border border-gray-800 rounded-xl p-4 w-full text-left space-y-2 mb-8">
          <div className="text-xs text-gray-500">订单摘要</div>
          <div className="flex justify-between"><span className="text-gray-400 text-sm">套餐</span><span className="text-white text-sm font-bold">{pkg.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-400 text-sm">费用</span><span className="text-white text-sm font-bold">¥{pkg.price} + ¥{pkg.installationFee} 安装费</span></div>
          <div className="flex justify-between"><span className="text-gray-400 text-sm">合计</span><span className="text-cyan-400 text-sm font-bold">¥{pkg.totalPrice}</span></div>
          <div className="flex justify-between"><span className="text-gray-400 text-sm">客户</span><span className="text-white text-sm">{form.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-400 text-sm">联系方式</span><span className="text-white text-sm">{form.phone}</span></div>
        </div>
        <p className="text-[10px] text-gray-600 mb-4">专属客服将在 30 分钟内与您联系确认安装时间</p>
        <button onClick={() => { setView('menu'); setStep('plans'); }} className="text-cyan-400 text-sm underline">返回首页</button>
      </div>
    );

    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center space-x-3 mb-2">
          <button onClick={() => step === 'plans' ? setView('menu') : setStep('plans')} className="text-gray-400"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex-1"><h1 className="font-bold text-white text-base">宽带办理</h1><p className="text-[10px] text-gray-500">DVS网络 · 光纤到户</p></div>
          <div className="flex items-center space-x-1.5">
            {['plans', 'form', 'confirm'].map((s, i) => (
              <div key={s} className={`w-6 h-1.5 rounded-full ${step === s ? 'bg-cyan-400' : i < ['plans', 'form', 'confirm'].indexOf(step) ? 'bg-emerald-500' : 'bg-gray-700'}`} />
            ))}
          </div>
        </div>

        {step === 'plans' && (
          <>
            <div className="text-center py-2">
              <h2 className="text-xl font-bold text-white">选择您的宽带方案</h2>
              <p className="text-xs text-gray-500 mt-1">光纤直达 · 极速稳定 · 专业售后</p>
            </div>
            {packages.map((p, i) => {
              const isSel = selectedPkg === p.id;
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  onClick={() => setSelectedPkg(p.id)}
                  className={`relative rounded-2xl border p-5 cursor-pointer transition-all bg-gradient-to-br ${p.color} ${isSel ? 'border-cyan-500 shadow-lg shadow-cyan-500/10' : 'border-gray-800 hover:border-gray-700'}`}>
                  {p.isPopular && <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md">推荐</span>}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-white">{p.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs font-mono px-2 py-0.5 bg-gray-800 text-cyan-400 rounded-md border border-gray-700">{p.speed}</span>
                        <span className="text-xs text-gray-500">{p.durationMonths}个月</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-white font-mono">¥{p.price}</div>
                      <div className="text-[10px] text-gray-500">+¥{p.installationFee} 安装费</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.features.map(f => (
                      <span key={f} className="text-[10px] bg-gray-800/60 text-gray-300 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <Check className="w-2.5 h-2.5 text-cyan-400" /><span>{f}</span>
                      </span>
                    ))}
                  </div>
                  {isSel && (
                    <motion.div layoutId="sel" className="mt-3 pt-3 border-t border-gray-800/60">
                      <div className="flex justify-between text-sm"><span className="text-gray-400">套餐费</span><span className="text-white">¥{p.price}</span></div>
                      <div className="flex justify-between text-sm mt-1"><span className="text-gray-400">安装调试费</span><span className="text-white">¥{p.installationFee}</span></div>
                      <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-gray-800">
                        <span className="text-gray-300">合计</span><span className="text-cyan-400">¥{p.totalPrice}</span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
            {packages.length > 0 && <>
            <button onClick={() => setStep('form')} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-cyan-500/10 active:scale-[0.99] transition-transform">立即办理 · ¥{pkg.totalPrice}</button>
            <p className="text-center text-[10px] text-gray-600">安装后 7 天内不满意可全额退款</p>
            </>}
            {packages.length === 0 && <p className="text-center text-gray-500 py-8">暂无可用套餐，请联系管理员</p>}
          </>
        )}

        {step === 'form' && (
          <>
            <div className="text-center py-2">
              <h2 className="text-xl font-bold text-white">填写联系方式</h2>
              <p className="text-xs text-gray-500 mt-1">我们将安排工程师上门安装调试</p>
            </div>
            <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-5 space-y-4">
              <div><label className="text-xs text-gray-400 mb-1.5 flex items-center space-x-1"><User className="w-3 h-3" /><span>姓名</span></label>
                <input value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="请输入您的姓名" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" /></div>
              <div><label className="text-xs text-gray-400 mb-1.5 flex items-center space-x-1"><Phone className="w-3 h-3" /><span>手机号</span></label>
                <input value={form.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="请输入11位手机号" maxLength={11} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" /></div>
              <div><label className="text-xs text-gray-400 mb-1.5 flex items-center space-x-1"><MapPin className="w-3 h-3" /><span>地址</span></label>
                <input value={form.address} onChange={e => updateForm('address', e.target.value)} placeholder="如：天河星界公寓" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" /></div>
              <div><label className="text-xs text-gray-400 mb-1.5 flex items-center space-x-1"><Home className="w-3 h-3" /><span>房号</span></label>
                <input value={form.roomNo} onChange={e => updateForm('roomNo', e.target.value)} placeholder="如：B栋 403" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" /></div>
            </div>
            <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-4">
              <div className="text-xs text-gray-500 mb-2">已选套餐</div>
              <div className="flex justify-between items-center">
                <div><div className="text-white text-sm font-bold">{pkg.name}</div><div className="text-gray-500 text-xs">{pkg.speed} · {pkg.durationMonths}个月</div></div>
                <div className="text-right"><div className="text-cyan-400 font-bold">¥{pkg.totalPrice}</div><div className="text-gray-500 text-[10px]">含安装费</div></div>
              </div>
            </div>
            <button onClick={() => setStep('confirm')} disabled={!isValid}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl active:scale-[0.99] transition-transform disabled:opacity-40 disabled:cursor-not-allowed">
              {isValid ? '确认订单' : '请完善个人信息'}
            </button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="text-center py-2">
              <h2 className="text-xl font-bold text-white">确认订单信息</h2>
              <p className="text-xs text-gray-500 mt-1">请核对以下信息，提交后我们将尽快联系您</p>
            </div>
            <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-5 space-y-3">
              <div className="text-xs text-gray-500 font-bold">客户信息</div>
              <div className="flex justify-between"><span className="text-gray-400 text-sm">姓名</span><span className="text-white text-sm">{form.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 text-sm">手机</span><span className="text-white text-sm">{form.phone}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 text-sm">地址</span><span className="text-white text-sm text-right max-w-[200px]">{form.address}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 text-sm">房号</span><span className="text-white text-sm">{form.roomNo}</span></div>
              <div className="border-t border-gray-800 pt-3 mt-3">
                <div className="text-xs text-gray-500 font-bold mb-2">套餐明细</div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">{pkg.name}</span><span className="text-cyan-400 font-bold">¥{pkg.price}</span></div>
                <div className="flex justify-between text-sm mt-1"><span className="text-gray-400">安装调试费</span><span className="text-white">¥{pkg.installationFee}</span></div>
                <div className="flex justify-between text-base font-bold mt-3 pt-3 border-t border-gray-800">
                  <span className="text-white">应付总额</span><span className="text-cyan-400 text-xl">¥{pkg.totalPrice}</span>
                </div>
              </div>
            </div>
            <div className="bg-cyan-950/20 border border-cyan-800/30 rounded-xl p-3 flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span className="text-xs text-cyan-200">信息提交后，专属客服将在 30 分钟内电话确认安装时间。安装完成后现场支付费用。</span>
            </div>
            <button onClick={handleSubmit} disabled={submitted} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-4 rounded-2xl shadow-xl active:scale-[0.99] transition-transform disabled:opacity-60">
              {submitted ? '提交中...' : '确认提交'}
            </button>
            <button onClick={() => setStep('form')} className="w-full text-center text-gray-500 text-sm py-2">返回修改</button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-3 pb-2">
        <button onClick={() => setView('menu')} className="text-gray-400"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1"><h1 className="font-bold text-white text-base">故障报修及续费</h1><p className="text-[10px] text-gray-500">DVS网络客户服务</p></div>
      </div>

      <div className="flex space-x-2 border-b border-gray-800">
        <button onClick={() => setRepairTab('repair')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${repairTab === 'repair' ? 'text-orange-400 border-orange-400' : 'text-gray-500 border-transparent'}`}>故障报修</button>
        <button onClick={() => setRepairTab('renewal')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${repairTab === 'renewal' ? 'text-purple-400 border-purple-400' : 'text-gray-500 border-transparent'}`}>续费</button>
      </div>

      {repairTab === 'repair' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">提交故障报修，维护团队将尽快与您联系</p>
          {repairSuccess && <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-xl p-3 text-sm flex items-center"><CheckCircle className="w-4 h-4 mr-2 shrink-0" />{repairSuccess}</div>}
          <div className="bg-[#131B2E] border border-gray-800 rounded-xl p-4 space-y-3">
            <input value={repairForm.name} onChange={e => updateRepair('name', e.target.value)} placeholder="您的姓名 *" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500 outline-none" />
            <input value={repairForm.phone} onChange={e => updateRepair('phone', e.target.value)} placeholder="手机号 *" maxLength={11} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500 outline-none" />
            <input value={repairForm.address} onChange={e => updateRepair('address', e.target.value)} placeholder="地址" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500 outline-none" />
            <select value={repairForm.issueType} onChange={e => updateRepair('issueType', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500 outline-none">
              {ISSUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <textarea value={repairForm.description} onChange={e => updateRepair('description', e.target.value)} placeholder="请描述您遇到的问题 *" rows={3} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500 outline-none resize-none" />
            <button onClick={handleRepairSubmit} disabled={!repairForm.name || !repairForm.phone || !repairForm.description} className="w-full bg-orange-500 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40">提交报修</button>
          </div>
        </div>
      )}

      {repairTab === 'renewal' && (
        <div className="space-y-3 flex flex-col min-h-[calc(100vh-14rem)]">
          <p className="text-xs text-gray-500">填写客户信息并选择续费套餐</p>
          {renewSuccess && <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-xl p-3 text-sm flex items-center"><CheckCircle className="w-4 h-4 mr-2 shrink-0" />{renewSuccess}</div>}
          <div className="bg-[#131B2E] border border-gray-800 rounded-xl p-4 space-y-3 relative overflow-hidden">
            {/* Decorative tech elements */}
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full opacity-[0.04]" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="pNet" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
                    <stop offset="50%" stopColor="#6366f1" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="pNet2" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity="0" />
                    <stop offset="50%" stopColor="#c084fc" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Grid */}
                <g stroke="#a855f7" strokeWidth="0.3" opacity="0.5">
                  {[0,30,60,90,120,150,180,210,240,270,300,330,360,390].map(y => <line key={"hg"+y} x1="0" y1={y} x2="400" y2={y} />)}
                  {[0,30,60,90,120,150,180,210,240,270,300,330,360,390].map(x => <line key={"vg"+x} x1={x} y1="0" x2={x} y2="400" />)}
                </g>
                {/* Network nodes */}
                <circle cx="40" cy="50" r="2" fill="#a855f7" opacity="0.6" />
                <circle cx="120" cy="90" r="3" fill="#c084fc" opacity="0.5" />
                <circle cx="280" cy="30" r="2" fill="#a855f7" opacity="0.4" />
                <circle cx="350" cy="110" r="2.5" fill="#c084fc" opacity="0.5" />
                <circle cx="60" cy="200" r="1.5" fill="#a855f7" opacity="0.3" />
                <circle cx="320" cy="230" r="2" fill="#c084fc" opacity="0.4" />
                <circle cx="180" cy="60" r="1.5" fill="#a855f7" opacity="0.35" />
                <circle cx="60" cy="130" r="1.8" fill="#c084fc" opacity="0.3" />
                {/* Data flow lines */}
                <path d="M0,80 Q100,40 200,100 T400,70" fill="none" stroke="url(#pNet)" strokeWidth="1.5" />
                <path d="M0,140 Q120,100 240,160 T400,130" fill="none" stroke="url(#pNet2)" strokeWidth="1" />
                <path d="M0,200 Q80,170 160,210 T400,190" fill="none" stroke="url(#pNet)" strokeWidth="0.8" opacity="0.6" />
                {/* Signal waves */}
                <path d="M300,300 Q320,280 340,300 T380,300" fill="none" stroke="#a855f7" strokeWidth="0.8" opacity="0.25" />
                <path d="M290,315 Q320,290 350,315 T390,315" fill="none" stroke="#c084fc" strokeWidth="0.6" opacity="0.15" />
              </svg>
            </div>
            <input value={renewName} onChange={e => setRenewName(e.target.value)} placeholder="客户姓名" className="relative z-10 w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 outline-none" />
            <div className="relative z-10 flex space-x-2">
              <input value={renewPhone} onChange={e => setRenewPhone(e.target.value)} placeholder="手机号" maxLength={11} className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 outline-none" />
              <button onClick={handleLookupClient} disabled={!renewPhone} className="bg-purple-500 text-white px-4 rounded-xl text-sm font-bold disabled:opacity-40">查询</button>
            </div>
            <input value={renewRoom} onChange={e => setRenewRoom(e.target.value)} placeholder="房号（如：B栋 403）" className="relative z-10 w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 outline-none" />
            {renewClient === null && renewPhone && <div className="text-amber-400 text-xs flex items-center"><AlertTriangle className="w-3 h-3 mr-1" />未找到该手机号的客户信息</div>}
            {renewClient && (
              <>
                <div className="relative z-10 bg-gray-900 rounded-xl p-3 space-y-1">
                  <div className="text-white text-sm font-bold">{renewClient.name}</div>
                  <div className="text-gray-400 text-xs">{renewClient.phone} · {renewClient.roomNo}</div>
                  <div className="text-gray-500 text-xs">当前套餐：{pkgs.find(p => p.id === renewClient.packageId)?.name || '未知'}</div>
                  {renewClient.expiryDate && <div className="text-amber-400 text-xs">到期时间：{renewClient.expiryDate}</div>}
                </div>
              </>
            )}
            <select value={renewPkg} onChange={e => setRenewPkg(e.target.value)} className="relative z-10 w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 outline-none">
              <option value="">选择续费套餐</option>
              {pkgs.map(p => <option key={p.id} value={p.id}>{p.name} - ¥{p.price}</option>)}
            </select>
            <button onClick={handleRenewSubmit} disabled={!renewPkg} className="relative z-10 w-full bg-emerald-500 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40">确认续费</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sales Tab
// ============================================================
function SalesTab() {
  const [authed, setAuthed] = useState<{ staffId: string; name: string } | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [tab, setTab] = useState<'leads' | 'stats' | 'packages' | 'repair'>('leads');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', address: '', notes: '' });
  const [selPkg, setSelPkg] = useState<BroadbandPackage | null>(null);
  const [pkgForm, setPkgForm] = useState({ name: '', phone: '', address: '', roomNo: '' });
  const [pkgSuccess, setPkgSuccess] = useState('');
  const [pkgTab, setPkgTab] = useState<'repair' | 'renewal'>('repair');
  const [repairForm, setRepairForm] = useState({ name: '', phone: '', address: '', issueType: 'no_connection', description: '' });
  const [repairSuccess, setRepairSuccess] = useState('');
  const [renewPhone, setRenewPhone] = useState('');
  const [renewClient, setRenewClient] = useState<any>(null);
  const [renewPkg, setRenewPkg] = useState('');
  const [renewSuccess, setRenewSuccess] = useState('');
  const [ready, setReady] = useState(false);

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
    if (result) { setAuthed(result); setLoginErr(''); }
    else { setLoginErr('登录名或密码错误'); }
  };

  const handleLogout = () => { logoutPortal('sales'); setAuthed(null); setLoginUser(''); setLoginPwd(''); };
  const handleAdd = async () => {
    if (!newLead.name || !newLead.phone) return;
    await addLead({ id: genId('lead'), name: newLead.name, phone: newLead.phone, address: newLead.address || undefined, source: 'self_visit', status: 'new', notes: newLead.notes, assignedTo: authed?.staffId || salesStaff[0]?.id || 'S001', createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10) });
    setLeads(getLeads()); setShowModal(false); setNewLead({ name: '', phone: '', address: '', notes: '' });
  };
  const handleStatus = async (id: string, status: SalesLead['status']) => { await updateLead(id, { status, updatedAt: new Date().toISOString().slice(0, 10) }); setLeads(getLeads()); };

  const handlePkgSubmit = async () => {
    if (!selPkg || !pkgForm.name || !pkgForm.phone) return;
    const clientId = genId('client');
    await addClient({ id: clientId, name: pkgForm.name, phone: pkgForm.phone, address: pkgForm.address || '待补充', roomNo: pkgForm.roomNo || '待分配', packageId: selPkg.id, status: 'pending_install', createdAt: new Date().toISOString().slice(0, 10), salesPersonId: authed?.staffId || 'S001' });
    await addOrder({ id: genId('order'), clientId, clientName: pkgForm.name, phone: pkgForm.phone, packageId: selPkg.id, packageName: selPkg.name, amount: selPkg.price, installationFee: selPkg.installationFee, totalAmount: selPkg.totalPrice, status: 'pending_payment', createdAt: new Date().toISOString().slice(0, 10), salesPersonId: authed?.staffId || 'S001' });
    setPkgSuccess(`${pkgForm.name} 已成功办理 ${selPkg.name}，待支付`);
    setSelPkg(null); setPkgForm({ name: '', phone: '', address: '', roomNo: '' });
    setClientsCount(getClients().length); setTimeout(() => setPkgSuccess(''), 3000);
  };

  const handleRepairSubmit = async () => {
    if (!repairForm.name || !repairForm.phone || !repairForm.description) return;
    await addTicket({ id: genId('ticket'), clientId: '', clientName: repairForm.name, phone: repairForm.phone, address: repairForm.address || '', issueType: repairForm.issueType as any, description: repairForm.description, priority: 'medium', status: 'pending', createdAt: new Date().toISOString().slice(0, 10) });
    setRepairSuccess(`${repairForm.name} 的报修工单已提交`); setRepairForm({ name: '', phone: '', address: '', issueType: 'no_connection', description: '' }); setTimeout(() => setRepairSuccess(''), 3000);
  };

  const handleLookup = () => { const clients = getClients(); setRenewClient(clients.find(c => c.phone === renewPhone) || null); setRenewPkg(''); };
  const handleRenewSubmit = async () => {
    if (!renewClient || !renewPkg) return;
    const p = getPackageById(renewPkg); if (!p) return;
    await addOrder({ id: genId('order'), clientId: renewClient.id, clientName: renewClient.name, phone: renewClient.phone, packageId: p.id, packageName: p.name, amount: p.price, installationFee: 0, totalAmount: p.price, status: 'pending_payment', createdAt: new Date().toISOString().slice(0, 10), salesPersonId: authed?.staffId || 'S001' });
    setRenewSuccess(`${renewClient.name} 续费 ${p.name} 成功`); setRenewPhone(''); setRenewClient(null); setRenewPkg(''); setTimeout(() => setRenewSuccess(''), 3000);
  };

  if (!ready) return <div className="flex items-center justify-center py-20 text-gray-500 text-sm">加载中...</div>;

  if (!authed) return (
    <div className="flex items-center justify-center p-8 min-h-[70vh]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4"><TrendingUp className="w-7 h-7 text-white" /></div>
          <h1 className="text-xl font-bold text-white">销售端登录</h1><p className="text-gray-500 text-sm mt-1">DVS网络销售管理平台</p>
        </div>
        <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-5 space-y-4">
          <input value={loginUser} onChange={e => setLoginUser(e.target.value)} placeholder="登录名（姓名或手机号）" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 outline-none" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          <input value={loginPwd} onChange={e => setLoginPwd(e.target.value)} type="password" placeholder="密码" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 outline-none" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          {loginErr && <div className="text-red-400 text-xs text-center">{loginErr}</div>}
          <button onClick={handleLogin} className="w-full bg-emerald-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors">登 录</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-0">
      <div className="flex items-center justify-between px-4 py-3 bg-[#0F1524]/80 border-b border-gray-800">
        <div><h1 className="font-bold text-white text-base">销售端</h1><p className="text-[10px] text-gray-500"><User className="w-3 h-3 inline mr-0.5" />{authed.name}</p></div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setShowModal(true)} className="bg-emerald-500 text-white p-2 rounded-xl"><Plus className="w-5 h-5" /></button>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 p-2"><LogOut className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex border-b border-gray-800 px-4 overflow-x-auto">
        {[{ k: 'leads', l: '销售线索', icon: Users }, { k: 'stats', l: '业绩统计', icon: TrendingUp }, { k: 'packages', l: '套餐选择', icon: Package }, { k: 'repair', l: '报修续费', icon: Wrench }].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.k} onClick={() => setTab(t.k as typeof tab)}
              className={`flex items-center space-x-1 py-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.k ? 'text-emerald-400 border-emerald-400' : 'text-gray-500 border-transparent'}`}>
              <Icon className="w-4 h-4" /><span>{t.l}</span>
            </button>
          );
        })}
      </div>

      {tab === 'leads' && (
        <div className="p-4 space-y-3">
          <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索客户..." className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-emerald-500 outline-none" /></div>
          <div className="flex space-x-3 text-xs">
            <div className="bg-[#131B2E] border border-gray-800 rounded-xl px-3 py-2 flex-1 text-center"><div className="text-gray-400">待跟进</div><div className="text-emerald-400 font-bold text-lg">{activeLeads}</div></div>
            <div className="bg-[#131B2E] border border-gray-800 rounded-xl px-3 py-2 flex-1 text-center"><div className="text-gray-400">本月成交</div><div className="text-emerald-400 font-bold text-lg">{converted}</div></div>
            <div className="bg-[#131B2E] border border-gray-800 rounded-xl px-3 py-2 flex-1 text-center"><div className="text-gray-400">转化率</div><div className="text-amber-400 font-bold text-lg">{conversionRate}%</div></div>
          </div>
          <AnimatePresence>{filtered.map(lead => (
            <motion.div key={lead.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#131B2E] border border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div><div className="text-white font-bold text-sm flex items-center"><User className="w-3.5 h-3.5 mr-1.5 text-gray-500" />{lead.name}</div><div className="text-gray-500 text-xs flex items-center mt-0.5"><Phone className="w-3 h-3 mr-1" />{lead.phone}</div></div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status]}`}>{STATUS_LABELS[lead.status]}</span>
              </div>
              {lead.address && <div className="text-gray-500 text-xs flex items-center"><MapPin className="w-3 h-3 mr-1" />{lead.address}</div>}
              {lead.notes && <div className="text-gray-400 text-xs bg-gray-900/50 rounded-lg p-2">{lead.notes}</div>}
              <div className="flex space-x-2 pt-1">
                {lead.status === 'new' && <button onClick={() => handleStatus(lead.id, 'contacted')} className="flex-1 text-xs bg-blue-950/50 text-blue-400 border border-blue-800/30 rounded-lg py-1.5">标记已联系</button>}
                {lead.status === 'contacted' && <button onClick={() => handleStatus(lead.id, 'negotiating')} className="flex-1 text-xs bg-amber-950/50 text-amber-400 border border-amber-800/30 rounded-lg py-1.5">进入洽谈</button>}
                {lead.status === 'negotiating' && (<><button onClick={() => handleStatus(lead.id, 'converted')} className="flex-1 text-xs bg-emerald-950/50 text-emerald-400 border border-emerald-800/30 rounded-lg py-1.5">成交</button><button onClick={() => handleStatus(lead.id, 'lost')} className="flex-1 text-xs bg-red-950/50 text-red-400 border border-red-800/30 rounded-lg py-1.5">流失</button></>)}
              </div>
            </motion.div>
          ))}</AnimatePresence>
        </div>
      )}

      {tab === 'stats' && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 rounded-xl p-4"><Users className="w-5 h-5 text-emerald-400 mb-2" /><div className="text-2xl font-bold text-white">{clientsCount}</div><div className="text-xs text-gray-500">总客户数</div></div>
            <div className="bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 rounded-xl p-4"><TrendingUp className="w-5 h-5 text-emerald-400 mb-2" /><div className="text-2xl font-bold text-white">{converted}</div><div className="text-xs text-gray-500">累计成交</div></div>
            <div className="bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 rounded-xl p-4"><DollarSign className="w-5 h-5 text-amber-400 mb-2" /><div className="text-2xl font-bold text-white">{conversionRate}%</div><div className="text-xs text-gray-500">转化率</div></div>
            <div className="bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 rounded-xl p-4"><Clock className="w-5 h-5 text-purple-400 mb-2" /><div className="text-2xl font-bold text-white">{activeLeads}</div><div className="text-xs text-gray-500">跟进中</div></div>
          </div>
          <div className="bg-[#131B2E] border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-white mb-3">销售人员业绩</h3>
            {salesStaff.map(s => {
              const myLeads = leads.filter(l => l.assignedTo === s.id);
              const myConverted = myLeads.filter(l => l.status === 'converted').length;
              return <div key={s.id} className="flex justify-between items-center py-2 border-b border-gray-800/60 last:border-0"><div><div className="text-white text-sm">{s.name}</div><div className="text-gray-500 text-[10px]">{myLeads.length} 条线索</div></div><div className="text-emerald-400 font-bold">{myConverted} 成交</div></div>;
            })}
          </div>
        </div>
      )}

      {tab === 'packages' && (
        <div className="p-4 space-y-4">
          <h2 className="text-white font-bold text-base flex items-center"><Package className="w-5 h-5 mr-2 text-emerald-400" />套餐选择</h2>
          {pkgSuccess && <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-xl p-3 text-sm flex items-center"><CheckCircle className="w-4 h-4 mr-2 shrink-0" />{pkgSuccess}</div>}
          <div className="space-y-3">{pkgs.map(p => (
            <div key={p.id} onClick={() => { setSelPkg(p); setPkgSuccess(''); }} className={`bg-[#131B2E] border rounded-xl p-4 cursor-pointer transition-all ${selPkg?.id === p.id ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-gray-800 hover:border-gray-600'}`}>
              <div className="flex justify-between items-start">
                <div><div className="text-white font-bold">{p.name}</div><div className="flex items-center space-x-2 mt-1"><span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-800 text-cyan-400 rounded border border-gray-700">{p.speed}</span><span className="text-[10px] text-gray-500">{p.durationMonths} 个月</span></div></div>
                <div className="text-right"><div className="text-lg font-bold text-white font-mono">¥{p.price}</div><div className="text-[10px] text-gray-500">安装费 ¥{p.installationFee}</div></div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">{p.features.map(f => <span key={f} className="text-[10px] bg-gray-800/60 text-gray-400 px-2 py-0.5 rounded-full">{f}</span>)}</div>
              {selPkg?.id === p.id && (
                <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                  <input value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} placeholder="客户姓名 *" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none" />
                  <input value={pkgForm.phone} onChange={e => setPkgForm(f => ({ ...f, phone: e.target.value }))} placeholder="手机号 *" maxLength={11} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none" />
                  <input value={pkgForm.address} onChange={e => setPkgForm(f => ({ ...f, address: e.target.value }))} placeholder="地址" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none" />
                  <input value={pkgForm.roomNo} onChange={e => setPkgForm(f => ({ ...f, roomNo: e.target.value }))} placeholder="房号" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none" />
                  <button onClick={handlePkgSubmit} disabled={!pkgForm.name || !pkgForm.phone} className="w-full bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-40">确认办理</button>
                </div>
              )}
            </div>
          ))}</div>
        </div>
      )}

      {tab === 'repair' && (
        <div className="p-4 space-y-4">
          <div className="flex space-x-2 border-b border-gray-800 pb-0">
            <button onClick={() => setPkgTab('repair')} className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${pkgTab === 'repair' ? 'text-amber-400 border-amber-400' : 'text-gray-500 border-transparent'}`}>故障报修</button>
            <button onClick={() => setPkgTab('renewal')} className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${pkgTab === 'renewal' ? 'text-emerald-400 border-emerald-400' : 'text-gray-500 border-transparent'}`}>续费</button>
          </div>
          {pkgTab === 'repair' && (
            <div className="space-y-3">
              {repairSuccess && <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-xl p-3 text-sm flex items-center"><CheckCircle className="w-4 h-4 mr-2 shrink-0" />{repairSuccess}</div>}
              <div className="bg-[#131B2E] border border-gray-800 rounded-xl p-4 space-y-3">
                <input value={repairForm.name} onChange={e => setRepairForm(f => ({ ...f, name: e.target.value }))} placeholder="客户姓名 *" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 outline-none" />
                <input value={repairForm.phone} onChange={e => setRepairForm(f => ({ ...f, phone: e.target.value }))} placeholder="手机号 *" maxLength={11} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 outline-none" />
                <input value={repairForm.address} onChange={e => setRepairForm(f => ({ ...f, address: e.target.value }))} placeholder="地址" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 outline-none" />
                <select value={repairForm.issueType} onChange={e => setRepairForm(f => ({ ...f, issueType: e.target.value }))} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 outline-none">
                  {ISSUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <textarea value={repairForm.description} onChange={e => setRepairForm(f => ({ ...f, description: e.target.value }))} placeholder="故障描述 *" rows={3} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 outline-none resize-none" />
                <button onClick={handleRepairSubmit} disabled={!repairForm.name || !repairForm.phone || !repairForm.description} className="w-full bg-amber-500 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40">提交报修</button>
              </div>
            </div>
          )}
          {pkgTab === 'renewal' && (
            <div className="space-y-3">
              {renewSuccess && <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-xl p-3 text-sm flex items-center"><CheckCircle className="w-4 h-4 mr-2 shrink-0" />{renewSuccess}</div>}
              <div className="bg-[#131B2E] border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex space-x-2"><input value={renewPhone} onChange={e => setRenewPhone(e.target.value)} placeholder="输入客户手机号查询" maxLength={11} className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 outline-none" /><button onClick={handleLookup} disabled={!renewPhone} className="bg-emerald-500 text-white px-4 rounded-xl text-sm font-bold disabled:opacity-40">查询</button></div>
                {renewClient === null && renewPhone && <div className="text-amber-400 text-xs flex items-center"><AlertTriangle className="w-3 h-3 mr-1" />未找到该手机号的客户</div>}
                {renewClient && (<><div className="bg-gray-900 rounded-xl p-3 space-y-1"><div className="text-white text-sm font-bold">{renewClient.name}</div><div className="text-gray-400 text-xs">{renewClient.phone} · {renewClient.roomNo}</div><div className="text-gray-500 text-xs">当前套餐：{pkgs.find(p => p.id === renewClient.packageId)?.name || '未知'}</div>{renewClient.expiryDate && <div className="text-amber-400 text-xs">到期时间：{renewClient.expiryDate}</div>}</div>
                <select value={renewPkg} onChange={e => setRenewPkg(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 outline-none"><option value="">选择续费套餐</option>{pkgs.map(p => <option key={p.id} value={p.id}>{p.name} - ¥{p.price}</option>)}</select>
                <button onClick={handleRenewSubmit} disabled={!renewPkg} className="w-full bg-emerald-500 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40">确认续费</button></>)}
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>{showModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={() => setShowModal(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} className="w-full max-w-md bg-[#1A1D2E] rounded-t-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-6"></div>
            <h2 className="text-lg font-bold text-white mb-4">新增销售线索</h2>
            <div className="space-y-3">
              <input value={newLead.name} onChange={e => setNewLead(f => ({ ...f, name: e.target.value }))} placeholder="客户姓名 *" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 outline-none" />
              <input value={newLead.phone} onChange={e => setNewLead(f => ({ ...f, phone: e.target.value }))} placeholder="手机号 *" maxLength={11} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 outline-none" />
              <input value={newLead.address} onChange={e => setNewLead(f => ({ ...f, address: e.target.value }))} placeholder="地址" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 outline-none" />
              <textarea value={newLead.notes} onChange={e => setNewLead(f => ({ ...f, notes: e.target.value }))} placeholder="备注信息" rows={2} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 outline-none resize-none" />
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-gray-400 border border-gray-700 text-sm">取消</button>
              <button onClick={handleAdd} disabled={!newLead.name || !newLead.phone} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40">添加线索</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

// ============================================================
// Maintenance Tab
// ============================================================
function MaintenanceTab() {
  const [authed, setAuthed] = useState<{ staffId: string; name: string } | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newTicket, setNewTicket] = useState({ clientName: '', phone: '', address: '', issueType: 'no_connection' as Ticket['issueType'], description: '' });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureInit().then(() => {
      const auth = getPortalAuth('maintenance');
      if (auth) setAuthed(auth);
      setTickets(getTickets());
      setReady(true);
    });
  }, []);

  const maintenanceStaff = ready ? getStaffByRole('maintenance') : [];
  const filtered = tickets.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search && !t.clientName.includes(search) && !t.phone.includes(search)) return false;
    return true;
  });
  const pending = tickets.filter(t => t.status === 'pending' || t.status === 'assigned').length;
  const inProgress = tickets.filter(t => t.status === 'in_progress').length;
  const resolved = tickets.filter(t => t.status === 'resolved').length;

  const handleLogin = () => {
    const result = loginPortal('maintenance', loginUser, loginPwd);
    if (result) { setAuthed(result); setLoginErr(''); }
    else { setLoginErr('登录名或密码错误'); }
  };
  const handleLogout = () => { logoutPortal('maintenance'); setAuthed(null); setLoginUser(''); setLoginPwd(''); };
  const handleAssign = async (id: string) => {
    const tech = maintenanceStaff[Math.floor(Math.random() * maintenanceStaff.length)];
    await updateTicket(id, { status: 'assigned', assignedTo: tech.id });
    setTickets(getTickets());
  };
  const handleProgress = async (id: string) => { await updateTicket(id, { status: 'in_progress' }); setTickets(getTickets()); };
  const handleResolve = async (id: string) => {
    const resolution = prompt('请输入处理结果：');
    if (resolution) { await updateTicket(id, { status: 'resolved', resolvedAt: new Date().toISOString().slice(0, 10), resolution }); setTickets(getTickets()); }
  };
  const handleAddTicket = async () => {
    if (!newTicket.clientName || !newTicket.phone || !newTicket.description) return;
    await addTicket({ id: genId('ticket'), clientId: '', ...newTicket, priority: 'medium', status: 'pending', createdAt: new Date().toISOString().slice(0, 10) });
    setTickets(getTickets()); setShowModal(false);
    setNewTicket({ clientName: '', phone: '', address: '', issueType: 'no_connection', description: '' });
  };

  if (!ready) return <div className="flex items-center justify-center py-20 text-gray-500 text-sm">加载中...</div>;

  if (!authed) return (
    <div className="flex items-center justify-center p-8 min-h-[70vh]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4"><Wrench className="w-7 h-7 text-white" /></div>
          <h1 className="text-xl font-bold text-white">维护端登录</h1><p className="text-gray-500 text-sm mt-1">DVS网络维护管理平台</p>
        </div>
        <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-5 space-y-4">
          <input value={loginUser} onChange={e => setLoginUser(e.target.value)} placeholder="登录名（姓名或手机号）" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          <input value={loginPwd} onChange={e => setLoginPwd(e.target.value)} type="password" placeholder="密码" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          {loginErr && <div className="text-red-400 text-xs text-center">{loginErr}</div>}
          <button onClick={handleLogin} className="w-full bg-amber-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors">登 录</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-0">
      <div className="flex items-center justify-between px-4 py-3 bg-[#0F1524]/80 border-b border-gray-800">
        <div><h1 className="font-bold text-white text-base">维护端</h1><p className="text-[10px] text-gray-500"><User className="w-3 h-3 inline mr-0.5" />{authed.name}</p></div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setShowModal(true)} className="bg-amber-500 text-white p-2 rounded-xl"><Plus className="w-5 h-5" /></button>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 p-2"><LogOut className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex space-x-2 p-4 pb-2">
        <div className="bg-[#131B2E] border border-gray-800 rounded-xl px-3 py-2 flex-1 text-center"><div className="text-xs text-gray-400">待处理</div><div className="text-lg font-bold text-amber-400">{pending}</div></div>
        <div className="bg-[#131B2E] border border-gray-800 rounded-xl px-3 py-2 flex-1 text-center"><div className="text-xs text-gray-400">处理中</div><div className="text-lg font-bold text-amber-400">{inProgress}</div></div>
        <div className="bg-[#131B2E] border border-gray-800 rounded-xl px-3 py-2 flex-1 text-center"><div className="text-xs text-gray-400">本月解决</div><div className="text-lg font-bold text-emerald-400">{resolved}</div></div>
      </div>

      <div className="px-4 space-y-2">
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索..." className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:border-amber-500 outline-none" /></div>
        <div className="flex space-x-2 overflow-x-auto pb-1">
          {[{ k: 'all', l: '全部' }, { k: 'pending', l: '待处理' }, { k: 'assigned', l: '已派单' }, { k: 'in_progress', l: '处理中' }, { k: 'resolved', l: '已解决' }].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap ${filter === f.k ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>{f.l}</button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <AnimatePresence>{filtered.map(ticket => (
          <motion.div key={ticket.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#131B2E] border border-gray-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-2"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority === 'urgent' ? '紧急' : ticket.priority === 'high' ? '高' : ticket.priority === 'medium' ? '中' : '低'}</span>
                <span className={`text-xs font-medium ${STATUS_COLORS_R[ticket.status]}`}>{STATUS_LABELS_R[ticket.status]}</span></div>
              <span className="text-[10px] text-gray-600">{ticket.createdAt}</span>
            </div>
            <div className="text-white text-sm font-bold">{ticket.clientName} · {TYPE_LABELS_R[ticket.issueType]}</div>
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
        ))}</AnimatePresence>
      </div>

      <AnimatePresence>{showModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={() => setShowModal(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} className="w-full max-w-md bg-[#1A1D2E] rounded-t-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-6"></div>
            <h2 className="text-lg font-bold text-white mb-4">新建工单</h2>
            <div className="space-y-3">
              <input value={newTicket.clientName} onChange={e => setNewTicket(f => ({ ...f, clientName: e.target.value }))} placeholder="客户姓名 *" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none" />
              <input value={newTicket.phone} onChange={e => setNewTicket(f => ({ ...f, phone: e.target.value }))} placeholder="手机号 *" maxLength={11} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none" />
              <input value={newTicket.address} onChange={e => setNewTicket(f => ({ ...f, address: e.target.value }))} placeholder="地址" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none" />
              <select value={newTicket.issueType} onChange={e => setNewTicket(f => ({ ...f, issueType: e.target.value as Ticket['issueType'] }))} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none">
                <option value="no_connection">无法上网</option><option value="slow_speed">网速慢</option><option value="equipment_fault">设备故障</option><option value="installation">安装服务</option><option value="other">其他</option>
              </select>
              <textarea value={newTicket.description} onChange={e => setNewTicket(f => ({ ...f, description: e.target.value }))} placeholder="故障描述 *" rows={2} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none resize-none" />
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-gray-400 border border-gray-700 text-sm">取消</button>
              <button onClick={handleAddTicket} disabled={!newTicket.clientName || !newTicket.phone || !newTicket.description} className="flex-1 bg-amber-500 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40">创建工单</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

// ============================================================
// Admin Tab
// ============================================================
function AdminTab() {
  const [authed, setAuthed] = useState<{ staffId: string; name: string } | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureInit().then(() => {
      const auth = getPortalAuth('admin');
      if (auth) setAuthed(auth);
      setStats(getDashboardStats());
      setClients(getClients());
      setOrders(getOrders());
      setReady(true);
    });
  }, []);

  const handleLogin = () => {
    const result = loginPortal('admin', loginUser, loginPwd);
    if (result) { setAuthed(result); setLoginErr(''); }
    else { setLoginErr('登录名或密码错误'); }
  };
  const handleLogout = () => { logoutPortal('admin'); setAuthed(null); setLoginUser(''); setLoginPwd(''); };
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportMsg('');
    try { const msg = await importFromExcel(file); setImportMsg(msg); setTimeout(() => window.location.reload(), 1500); }
    catch (err) { setImportMsg('导入失败：' + (err instanceof Error ? err.message : String(err))); }
    setImporting(false); e.target.value = '';
  };

  if (!ready || !stats) return <div className="flex items-center justify-center py-20 text-gray-500 text-sm">加载中...</div>;

  if (!authed) return (
    <div className="flex items-center justify-center p-8 min-h-[70vh]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20 mb-4"><BarChart3 className="w-7 h-7 text-white" /></div>
          <h1 className="text-xl font-bold text-white">后台数据端登录</h1><p className="text-gray-500 text-sm mt-1">DVS网络运营管理平台</p>
        </div>
        <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-5 space-y-4">
          <input value={loginUser} onChange={e => setLoginUser(e.target.value)} placeholder="登录名（姓名或手机号）" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 outline-none" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          <input value={loginPwd} onChange={e => setLoginPwd(e.target.value)} type="password" placeholder="密码" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 outline-none" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          {loginErr && <div className="text-red-400 text-xs text-center">{loginErr}</div>}
          <button onClick={handleLogin} className="w-full bg-purple-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors">登 录</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-0">
      <div className="flex items-center justify-between px-4 py-3 bg-[#0F1524]/80 border-b border-gray-800">
        <div><h1 className="font-bold text-white text-base">后台数据端</h1><p className="text-[10px] text-gray-500"><User className="w-3 h-3 inline mr-0.5" />{authed.name}</p></div>
        <div className="flex items-center space-x-2">
          <button onClick={exportAllToExcel} className="bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1"><Download className="w-3.5 h-3.5" /><span>导出</span></button>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 p-2"><LogOut className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex space-x-3">
          <button onClick={exportAllToExcel} className="flex-1 bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-xl py-3 text-sm font-bold flex items-center justify-center space-x-2"><Download className="w-4 h-4" /><span>导出 Excel</span></button>
          <label className="flex-1 bg-blue-950/40 border border-blue-800/40 text-blue-400 rounded-xl py-3 text-sm font-bold flex items-center justify-center space-x-2 cursor-pointer">
            <Upload className="w-4 h-4" /><span>导入 Excel</span>
            <input type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          </label>
        </div>
        {importMsg && <div className={`text-xs text-center p-2 rounded-lg ${importMsg.includes('成功') ? 'bg-emerald-950/30 text-emerald-400' : 'bg-red-950/30 text-red-400'}`}>{importMsg}</div>}

        <div className="grid grid-cols-2 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2"><DollarSign className="w-5 h-5 text-emerald-400" /><span className="text-[10px] text-gray-600">本月</span></div>
            <div className="text-2xl font-bold text-white font-mono">¥{stats.monthlyRevenue.toLocaleString()}</div><div className="text-xs text-gray-500 mt-1">本月营收</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2"><TrendingUp className="w-5 h-5 text-cyan-400" /><span className="text-[10px] text-gray-600">累计</span></div>
            <div className="text-2xl font-bold text-white font-mono">¥{stats.totalRevenue.toLocaleString()}</div><div className="text-xs text-gray-500 mt-1">累计营收</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 rounded-2xl p-4">
            <Users className="w-5 h-5 text-blue-400 mb-2" /><div className="text-2xl font-bold text-white">{stats.totalClients}</div><div className="text-xs text-gray-500 mt-1">总客户 · {stats.activeClients} 活跃</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 rounded-2xl p-4">
            <Activity className="w-5 h-5 text-amber-400 mb-2" /><div className="text-2xl font-bold text-white">{stats.pendingTickets}</div><div className="text-xs text-gray-500 mt-1">待处理工单</div>
          </motion.div>
        </div>

        <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center"><BarChart3 className="w-4 h-4 mr-1.5 text-cyan-400" />月度营收趋势</h3>
          <div className="flex items-end justify-between h-28">
            {stats.monthlyRevenueData.map((d, i) => {
              const max = Math.max(...stats.monthlyRevenueData.map(x => x.revenue), 1);
              return (
                <div key={d.month} className="flex flex-col items-center flex-1">
                  <span className="text-[10px] text-gray-500 mb-1">¥{d.revenue}</span>
                  <div className="w-full mx-1 bg-gradient-to-t from-cyan-500 to-blue-500 rounded-t-md" style={{ height: `${Math.max((d.revenue / max) * 100, 4)}%` }}></div>
                  <span className="text-[10px] text-gray-600 mt-1">{d.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center"><Wifi className="w-4 h-4 mr-1.5 text-cyan-400" />套餐分布</h3>
          <div className="space-y-2">{stats.packageDistribution.map(p => {
            const total = stats.packageDistribution.reduce((s, x) => s + x.count, 0) || 1;
            return (
              <div key={p.name}>
                <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{p.name}</span><span className="text-white">{p.count} 户</span></div>
                <div className="h-2 bg-gray-900 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${Math.round(p.count / total * 100)}%` }}></div></div>
              </div>
            );
          })}</div>
        </div>

        <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">最近订单</h3>
          <div className="space-y-2">{orders.slice(0, 5).map(o => (
            <div key={o.id} className="flex justify-between items-center py-2 border-b border-gray-800/60 last:border-0">
              <div><div className="text-white text-sm">{o.clientName}</div><div className="text-gray-500 text-[10px]">{o.packageName}</div></div>
              <div className="text-right"><div className="text-cyan-400 text-sm font-bold">¥{o.totalAmount}</div><div className="text-gray-600 text-[10px]">{o.createdAt}</div></div>
            </div>
          ))}</div>
        </div>

        <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">客户列表</h3>
          <div className="space-y-2">{clients.map(c => (
            <div key={c.id} className="flex justify-between items-center py-2 border-b border-gray-800/60 last:border-0">
              <div><div className="text-white text-sm">{c.name}</div><div className="text-gray-500 text-[10px]">{c.phone} · {c.roomNo}</div></div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-gray-400">{c.status === 'active' ? '正常' : c.status === 'expired' ? '已过期' : c.status === 'pending_install' ? '待安装' : '暂停'}</span>
                <span className={`w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : c.status === 'expired' ? 'bg-red-500' : c.status === 'pending_install' ? 'bg-amber-500' : 'bg-gray-500'}`}></span>
              </div>
            </div>
          ))}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// System Tab
// ============================================================
function SystemTab() {
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
  const [ready, setReady] = useState(false);

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
    if (result) { setAuthed(true); setLoginErr(''); }
    else { setLoginErr('登录名或密码错误'); }
  };
  const handleLogout = () => { localStorage.removeItem('apartment_wifi_auth_system'); setAuthed(false); setLoginUser(''); setLoginPwd(''); };
  const handleAdd = async () => {
    if (!newStaff.name || !newStaff.phone) return;
    const id = (newStaff.role === 'sales' ? 'S' : newStaff.role === 'maintenance' ? 'M' : newStaff.role === 'admin' ? 'A' : 'SU') +
      String(staff.filter(s => s.role === newStaff.role).length + 1).padStart(3, '0');
    await addStaff({ id, name: newStaff.name, phone: newStaff.phone, role: newStaff.role, status: 'active', joinDate: new Date().toISOString().slice(0, 10) });
    setStaff(getStaff()); setShowAdd(false); setNewStaff({ name: '', phone: '', role: 'sales' });
  };
  const toggleStatus = async (id: string) => {
    const s = staff.find(m => m.id === id);
    if (s) { await updateStaff(id, { status: s.status === 'active' ? 'inactive' : 'active' }); setStaff(getStaff()); }
  };
  const handleDeleteStaff = async (id: string) => {
    const s = staff.find(m => m.id === id);
    if (!s) return;
    if (!confirm(`确定删除员工 ${s.name}？\n此操作不可撤销！`)) return;
    const result = await deleteStaff(id);
    if (!result.ok) { alert(result.message); } else { setStaff(getStaff()); }
  };
  const handleSetPassword = async (id: string) => {
    if (!pwdValue || pwdValue.length < 4) return;
    await setStaffPassword(id, pwdValue); setStaff(getStaff()); setShowPwdModal(null); setPwdValue('');
  };
  const refreshPackages = () => setPackages(getPackages());

  const handleAddPkg = async () => {
    if (!newPkg.id || !newPkg.name || !newPkg.speed || !newPkg.price) return;
    const features = newPkg.features.split(/[,，]/).map(f => f.trim()).filter(Boolean);
    const pkg: BroadbandPackage = {
      id: newPkg.id, name: newPkg.name, speed: newPkg.speed,
      durationMonths: newPkg.durationMonths, price: newPkg.price,
      installationFee: newPkg.installationFee, totalPrice: newPkg.price + newPkg.installationFee,
      features, isPopular: newPkg.isPopular,
      color: `from-${['blue','purple','rose','emerald','amber','cyan','indigo','pink'][packages.length % 8]}-950/40 to-${['cyan','indigo','pink','teal','orange','blue','purple','rose'][packages.length % 8]}-950/40`,
    };
    await addPackage(pkg);
    refreshPackages();
    setShowPkgModal(false);
    setNewPkg({ id: '', name: '', speed: '', durationMonths: 12, price: 0, installationFee: 200, features: '', isPopular: false });
  };

  const handleDeletePkg = async (id: string) => {
    const result = await deletePackage(id);
    if (!result.ok) { alert(result.message); }
    else { refreshPackages(); }
  };

  const handleReset = async () => {
    if (confirm('确认重置所有数据？\n所有客户、订单、线索、工单将恢复为初始演示数据。此操作不可撤销！')) {
      await resetAllData(); setStaff(getStaff()); window.location.reload();
    }
  };

  if (!ready) return <div className="flex items-center justify-center py-20 text-gray-500 text-sm">加载中...</div>;

  if (!authed) return (
    <div className="flex items-center justify-center p-8 min-h-[70vh]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20 mb-4"><Shield className="w-7 h-7 text-white" /></div>
          <h1 className="text-xl font-bold text-white">系统管理</h1><p className="text-gray-500 text-sm mt-1">DVS网络系统管理平台</p>
        </div>
        <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-5 space-y-4">
          <input value={loginUser} onChange={e => setLoginUser(e.target.value)} placeholder="管理员账号" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 outline-none" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          <input value={loginPwd} onChange={e => setLoginPwd(e.target.value)} type="password" placeholder="密码" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 outline-none" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          {loginErr && <div className="text-red-400 text-xs text-center">{loginErr}</div>}
          <button onClick={handleLogin} className="w-full bg-red-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-red-600 transition-colors">登 录</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-0">
      <div className="flex items-center justify-between px-4 py-3 bg-[#0F1524]/80 border-b border-gray-800">
        <div><h1 className="font-bold text-white text-base">系统管理</h1><p className="text-[10px] text-gray-500">员工 · 套餐 · 配置</p></div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 p-2"><LogOut className="w-5 h-5" /></button>
      </div>

      <div className="flex border-b border-gray-800 px-4">
        {[{ k: 'staff', l: '员工管理', icon: Users }, { k: 'packages', l: '套餐配置', icon: Wifi }, { k: 'settings', l: '系统设置', icon: Settings }].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.k} onClick={() => setTab(t.k as typeof tab)}
              className={`flex items-center space-x-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t.k ? 'text-red-400 border-red-400' : 'text-gray-500 border-transparent'}`}>
              <Icon className="w-4 h-4" /><span>{t.l}</span>
            </button>
          );
        })}
      </div>

      {tab === 'staff' && (
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">共 {staff.length} 名员工</span>
            <button onClick={() => setShowAdd(true)} className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-3 py-1.5 rounded-full flex items-center space-x-1"><Plus className="w-3 h-3" /><span>添加员工</span></button>
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
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${m.status === 'active' ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-600'}`}>{m.name[0]}</div>
                        <div><div className="text-white text-sm font-bold">{m.name}</div><div className="text-gray-500 text-[10px]">{m.phone}</div></div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.status === 'active' ? 'bg-emerald-950/50 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>{m.status === 'active' ? '在职' : '离职'}</span>
                        <button onClick={() => toggleStatus(m.id)} className={`text-xs px-2 py-1 rounded-lg ${m.status === 'active' ? 'text-red-400 bg-red-950/30' : 'text-emerald-400 bg-emerald-950/30'}`}>{m.status === 'active' ? '禁用' : '启用'}</button>
                        <button onClick={() => handleDeleteStaff(m.id)} className="text-gray-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/20 transition-colors" title="删除员工"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800/60">
                      <span className={`text-[10px] ${m.password ? 'text-emerald-400' : 'text-gray-600'}`}>{m.password ? '已设置密码' : '未设置密码'}</span>
                      <button onClick={() => { setShowPwdModal(m.id); setPwdValue(''); }} className="text-xs text-cyan-400 bg-cyan-950/30 border border-cyan-800/30 px-2.5 py-1 rounded-lg flex items-center space-x-1"><Key className="w-3 h-3" /><span>设置密码</span></button>
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
            <button onClick={() => setShowPkgModal(true)} className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-3 py-1.5 rounded-full flex items-center space-x-1"><Plus className="w-3 h-3" /><span>添加套餐</span></button>
          </div>
          {packages.map(p => (
            <div key={p.id} className="bg-[#131B2E] border border-gray-800 rounded-xl p-4 relative group">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-white font-bold flex items-center space-x-2">
                    <span>{p.name}</span>
                    {p.isPopular && <span className="text-[10px] bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-2 py-0.5 rounded-full">推荐</span>}
                  </div>
                  <div className="flex items-center space-x-2 mt-1"><span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-800 text-cyan-400 rounded border border-gray-700">{p.speed}</span><span className="text-[10px] text-gray-500">{p.durationMonths} 个月</span></div>
                </div>
                <div className="text-right"><div className="text-lg font-bold text-white font-mono">¥{p.price}</div><div className="text-[10px] text-gray-500">安装费 ¥{p.installationFee}</div></div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">{p.features.map(f => <span key={f} className="text-[10px] bg-gray-800/60 text-gray-400 px-2 py-0.5 rounded-full">{f}</span>)}</div>
              <button onClick={() => handleDeletePkg(p.id)} className="absolute top-3 right-3 text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/20 transition-colors" title="删除套餐"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'settings' && (
        <div className="p-4 space-y-3">
          <button onClick={exportAllToExcel} className="w-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-xl py-3 text-sm font-bold flex items-center justify-center space-x-2"><Download className="w-4 h-4" /><span>导出全部数据到 Excel</span></button>
          <div className="bg-[#131B2E] border border-gray-800 rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center"><div><div className="text-white text-sm font-bold">平台名称</div><div className="text-gray-500 text-xs">DVS网络</div></div><span className="text-[10px] text-gray-600">v2.0</span></div>
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
              <div className="text-xs text-gray-500 space-y-1"><div>2026-05-23 系统管理员 登录系统</div><div>2026-05-22 赵经理 查看营收报表</div><div>2026-05-22 陈师傅 完成工单 TK004</div><div>2026-05-21 李明 新增销售线索</div></div>
            </div>
            <div className="border-t border-gray-800/60 pt-4 space-y-3">
              <button onClick={handleReset} className="w-full bg-red-950/40 border border-red-800/40 text-red-400 rounded-xl py-3 text-sm font-bold hover:bg-red-950/60 transition-colors">🗑 重置所有数据（恢复演示数据）</button>
              <p className="text-[10px] text-gray-600 text-center">数据保存在浏览器 localStorage，清除浏览器缓存会丢失</p>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>{showPwdModal && (
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
              <input value={pwdValue} onChange={e => setPwdValue(e.target.value)} type="password" placeholder="输入密码（至少4位）" minLength={4} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" onKeyDown={e => e.key === 'Enter' && handleSetPassword(showPwdModal)} />
              <div className="flex justify-center">
                <button onClick={() => setShowPwdModal(null)} className="text-gray-500 text-sm hover:text-gray-300 transition-colors">取消</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <AnimatePresence>{showAdd && (
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
                <option value="sales">销售</option><option value="maintenance">维护</option><option value="admin">运营管理</option><option value="super_admin">系统管理员</option>
              </select>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <AnimatePresence>{showPkgModal && (
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
      )}</AnimatePresence>
    </div>
  );
}

// ============================================================
// Main App
// ============================================================
export default function HomePage() {
  const router = useRouter();
  const [tab, setTab] = useState('client');
  const [loadingState, setLoadingState] = useState<'init' | 'connecting' | 'loading' | 'ready'>('init');
  const [loadingTick, setLoadingTick] = useState(0);

  useEffect(() => {
    // 第一阶段提示
    const t1 = setTimeout(() => setLoadingState('connecting'), 800);
    // 第二阶段提示（如果还没完成）
    const t2 = setTimeout(() => setLoadingState('loading'), 2500);
    // 加载动画
    const tick = setInterval(() => setLoadingTick(i => i + 1), 400);

    ensureInit().then(() => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(tick);
      setLoadingState('ready');
    });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(tick);
    };
  }, []);

  if (loadingState !== 'ready') {
    const dots = '.'.repeat((loadingTick % 3) + 1);
    const messages = {
      init: ['正在初始化...', '初始化中' + dots, 'text-cyan-400'],
      connecting: ['正在连接服务器...', '连接中' + dots, 'text-amber-400'],
      loading: ['正在加载数据...', '加载中' + dots, 'text-emerald-400'],
    };
    const [title, sub, color] = messages[loadingState];

    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center text-gray-500 select-none">
        {/* 加载动画 */}
        <div className="relative mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Wifi className="w-6 h-6 text-white" />
          </div>
          {/* 旋转光晕 */}
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-cyan-500/20 via-transparent to-blue-500/20 animate-spin" style={{ animationDuration: '2s' }} />
        </div>
        <p className={'text-sm font-medium mb-1 ' + color}>{title}</p>
        <p className="text-xs text-gray-600">{sub}</p>
        {/* 底部提示 */}
        {loadingState === 'connecting' && (
          <p className="text-[10px] text-gray-700 mt-6 max-w-[200px] text-center leading-relaxed">
            首次加载可能需要几秒钟<br />请耐心等待
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0B0F19] pb-16">
      {/* Content area */}
      {tab === 'client' && <ClientTab />}
      <div className={tab !== 'sales' ? 'hidden' : ''}><SalesTab /></div>
      <div className={tab !== 'maintenance' ? 'hidden' : ''}><MaintenanceTab /></div>
      <div className={tab !== 'admin' ? 'hidden' : ''}><AdminTab /></div>
      <div className={tab !== 'system' ? 'hidden' : ''}><SystemTab /></div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-md w-full z-50">
        <div className="bg-[#0F1524]/95 backdrop-blur-xl border-t border-gray-800/60 safe-area-bottom">
          <div className="flex items-center justify-around py-1 px-1">
            {TABS.map(t => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              const colorClass = isActive ? t.activeColor : 'text-gray-500';
              const boxClass = isActive ? 'bg-gradient-to-br ' + t.color + ' shadow-lg shadow-orange-500/10 scale-110' : '';
              return (
                <button key={t.id} onClick={() => {
                  if (t.id === 'client') {
                    setTab('client');
                  } else {
                    router.push('/' + t.id + '/');
                  }
                }}
                  className={'flex flex-col items-center justify-center py-1.5 px-3 min-w-0 transition-all duration-200 ' + colorClass}>
                  <div className={'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ' + boxClass}>
                    <Icon className={'w-5 h-5 transition-all duration-200 ' + (isActive ? 'text-white' : 'text-gray-500')} />
                  </div>
                  <span className={'text-xs mt-1 font-semibold tracking-wide transition-all duration-200 ' + (isActive ? 'text-white' : 'text-gray-500')}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}

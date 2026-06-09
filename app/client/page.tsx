'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Wifi, Check, CreditCard, ArrowLeft, User, Phone, MapPin, Home, ShieldCheck, Package, Wrench, AlertTriangle, CheckCircle } from 'lucide-react';
import { PACKAGES, ensureInit, addClient, addOrder, addLead, addTicket, genId, getClients, getPackageById } from '@/lib/mock-data';

const ISSUE_TYPES = [
  { value: 'no_connection', label: '无法上网' },
  { value: 'slow_speed', label: '网速慢' },
  { value: 'equipment_fault', label: '设备故障' },
  { value: 'installation', label: '安装服务' },
  { value: 'other', label: '其他' },
];

type FormData = { name: string; phone: string; address: string; roomNo: string };

export default function ClientPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => { ensureInit().then(() => setReady(true)); }, []);

  const [view, setView] = useState<'menu' | 'plans' | 'repair'>('menu');

  // Package selection flow
  const [selectedPkg, setSelectedPkg] = useState('pkg-year-500');
  const [step, setStep] = useState<'plans' | 'form' | 'confirm' | 'done'>('plans');
  const [form, setForm] = useState<FormData>({ name: '', phone: '', address: '', roomNo: '' });
  const [submitted, setSubmitted] = useState(false);

  // Repair flow
  const [repairTab, setRepairTab] = useState<'repair' | 'renewal'>('repair');
  const [repairForm, setRepairForm] = useState({ name: '', phone: '', address: '', issueType: 'no_connection', description: '' });
  const [repairSuccess, setRepairSuccess] = useState('');
  const [renewPhone, setRenewPhone] = useState('');
  const [renewClient, setRenewClient] = useState<any>(null);
  const [renewPkg, setRenewPkg] = useState('');
  const [renewSuccess, setRenewSuccess] = useState('');

  const pkg = PACKAGES.find(p => p.id === selectedPkg)!;
  const pkgs = PACKAGES;

  const handleSubmit = async () => {
    setSubmitted(true);
    try {
      const clientId = genId('client');
      const orderId = genId('order');
      await addClient({
        id: clientId, name: form.name, phone: form.phone,
        address: form.address, roomNo: form.roomNo,
        packageId: selectedPkg, status: 'pending_install',
        createdAt: new Date().toISOString().slice(0, 10),
      });
      await addOrder({
        id: orderId, clientId, clientName: form.name, phone: form.phone,
        packageId: selectedPkg, packageName: pkg.name,
        amount: pkg.price, installationFee: pkg.installationFee,
        totalAmount: pkg.totalPrice, status: 'pending_payment',
        createdAt: new Date().toISOString().slice(0, 10),
      });
      await addLead({
        id: genId('lead'), name: form.name, phone: form.phone,
        address: `${form.address} ${form.roomNo}`,
        source: 'self_visit', status: 'new',
        notes: `自助登记 ${pkg.name}，待跟进`, assignedTo: 'S001',
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
      });
      await addTicket({
        id: genId('ticket'), clientId, clientName: form.name,
        phone: form.phone, address: `${form.address} ${form.roomNo}`,
        issueType: 'installation', description: `新装宽带：${pkg.name}，请尽快安排安装`,
        priority: 'medium', status: 'pending',
        createdAt: new Date().toISOString().slice(0, 10),
      });
      setTimeout(() => setStep('done'), 400);
    } catch (err) {
      alert('提交失败，请重试: ' + (err instanceof Error ? err.message : String(err)));
      setSubmitted(false);
    }
  };

  const updateForm = (key: keyof FormData, val: string) => setForm(f => ({ ...f, [key]: val }));
  const isValid = form.name.length >= 2 && /^1\d{10}$/.test(form.phone) && form.address.length > 2 && form.roomNo.length > 0;
  const updateRepair = (k: string, v: string) => setRepairForm(f => ({ ...f, [k]: v }));

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
    setRepairSuccess('报修工单已提交，维护团队将尽快与您联系');
    setRepairForm({ name: '', phone: '', address: '', issueType: 'no_connection', description: '' });
    setTimeout(() => setRepairSuccess(''), 4000);
  };

  const handleLookupClient = () => {
    const clients = getClients();
    const found = clients.find(c => c.phone === renewPhone);
    setRenewClient(found || null);
    setRenewPkg('');
  };

  const handleRenewSubmit = async () => {
    if (!renewClient || !renewPkg) return;
    const p = getPackageById(renewPkg);
    if (!p) return;
    await addOrder({
      id: genId('order'), clientId: renewClient.id, clientName: renewClient.name,
      phone: renewClient.phone, packageId: p.id, packageName: p.name,
      amount: p.price, installationFee: 0, totalAmount: p.price,
      status: 'pending_payment', createdAt: new Date().toISOString().slice(0, 10),
    });
    setRenewSuccess(`${renewClient.name} 续费 ${p.name} 成功`);
    setRenewPhone(''); setRenewClient(null); setRenewPkg('');
    setTimeout(() => setRenewSuccess(''), 4000);
  };

  if (!ready) {
    return <div className="max-w-md mx-auto min-h-screen bg-[#0B0F19] flex items-center justify-center text-gray-500 text-sm">加载中...</div>;
  }

  if (view === 'menu') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#0B0F19] pb-12">
        <div className="px-4 pt-4">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <header className="pt-4 pb-6 px-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/20 mb-4">
            <Wifi className="w-9 h-9 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">DVS网络</h1>
          <p className="text-gray-500 text-sm mt-1">请选择您要办理的业务</p>
        </header>

        <div className="px-4 space-y-4">
          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => { setView('plans'); setStep('plans'); }}
            className="w-full bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 hover:border-cyan-500/50 rounded-2xl p-6 text-left transition-all active:scale-[0.98]">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-4">
              <Package className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">套餐选择</h2>
            <p className="text-gray-500 text-sm">浏览宽带套餐 · 在线办理开户</p>
            <div className="mt-3 flex space-x-2">
              {pkgs.map(p => (
                <span key={p.id} className="text-[10px] bg-gray-800/60 text-gray-400 px-2 py-1 rounded-full">{p.name.split(' ')[0]}</span>
              ))}
            </div>
          </motion.button>

          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            onClick={() => setView('repair')}
            className="w-full bg-gradient-to-br from-[#131B2E] to-[#0F1524] border border-gray-800 hover:border-amber-500/50 rounded-2xl p-6 text-left transition-all active:scale-[0.98]">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">故障报修及续费</h2>
            <p className="text-gray-500 text-sm">网络故障报修 · 查询续费</p>
          </motion.button>
        </div>
      </div>
    );
  }

  // ===== Package Selection Flow =====
  if (view === 'plans') {
    if (step === 'done') {
      return (
        <div className="max-w-md mx-auto min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-center">
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
    }

    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#0B0F19] pb-12">
        <header className="sticky top-0 z-40 bg-[#0F1524]/80 backdrop-blur-md border-b border-gray-800 px-4 py-3 flex items-center space-x-3">
          <button onClick={() => step === 'plans' ? setView('menu') : setStep('plans')} className="text-gray-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-white text-base">宽带办理</h1>
            <p className="text-[10px] text-gray-500">DVS网络 · 光纤到户</p>
          </div>
          <div className="ml-auto flex items-center space-x-1.5">
            {['plans', 'form', 'confirm'].map((s, i) => (
              <div key={s} className={`w-6 h-1.5 rounded-full ${step === s ? 'bg-cyan-400' : i < ['plans', 'form', 'confirm'].indexOf(step) ? 'bg-emerald-500' : 'bg-gray-700'}`} />
            ))}
          </div>
        </header>

        <div className="p-4 space-y-4">
          {step === 'plans' && (
            <>
              <div className="text-center py-2">
                <h2 className="text-xl font-bold text-white">选择您的宽带方案</h2>
                <p className="text-xs text-gray-500 mt-1">光纤直达 · 极速稳定 · 专业售后</p>
              </div>
              {PACKAGES.map((p, i) => {
                const isSel = selectedPkg === p.id;
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    onClick={() => setSelectedPkg(p.id)}
                    className={`relative rounded-2xl border p-5 cursor-pointer transition-all bg-gradient-to-br ${p.color} ${isSel ? 'border-cyan-500 shadow-lg shadow-cyan-500/10' : 'border-gray-800 hover:border-gray-700'}`}>
                    {p.isPopular && (
                      <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md">推荐</span>
                    )}
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
              <button onClick={() => setStep('form')} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-cyan-500/10 active:scale-[0.99] transition-transform">
                立即办理 · ¥{pkg.totalPrice}
              </button>
              <p className="text-center text-[10px] text-gray-600">安装后 7 天内不满意可全额退款</p>
            </>
          )}

          {step === 'form' && (
            <>
              <div className="text-center py-2">
                <h2 className="text-xl font-bold text-white">填写联系方式</h2>
                <p className="text-xs text-gray-500 mt-1">我们将安排工程师上门安装调试</p>
              </div>
              <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-5 space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 flex items-center space-x-1"><User className="w-3 h-3" /><span>姓名</span></label>
                  <input value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="请输入您的姓名" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 flex items-center space-x-1"><Phone className="w-3 h-3" /><span>手机号</span></label>
                  <input value={form.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="请输入11位手机号" maxLength={11} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 flex items-center space-x-1"><MapPin className="w-3 h-3" /><span>地址</span></label>
                  <input value={form.address} onChange={e => updateForm('address', e.target.value)} placeholder="如：天河星界公寓" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 flex items-center space-x-1"><Home className="w-3 h-3" /><span>房号</span></label>
                  <input value={form.roomNo} onChange={e => updateForm('roomNo', e.target.value)} placeholder="如：B栋 403" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
                </div>
              </div>
              <div className="bg-[#131B2E] border border-gray-800 rounded-2xl p-4">
                <div className="text-xs text-gray-500 mb-2">已选套餐</div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white text-sm font-bold">{pkg.name}</div>
                    <div className="text-gray-500 text-xs">{pkg.speed} · {pkg.durationMonths}个月</div>
                  </div>
                  <div className="text-right">
                    <div className="text-cyan-400 font-bold">¥{pkg.totalPrice}</div>
                    <div className="text-gray-500 text-[10px]">含安装费</div>
                  </div>
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
      </div>
    );
  }

  // ===== Fault Repair & Renewal =====
  if (view === 'repair') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#0B0F19] pb-12">
        <header className="sticky top-0 z-40 bg-[#0F1524]/80 backdrop-blur-md border-b border-gray-800 px-4 py-3 flex items-center">
          <button onClick={() => setView('menu')} className="text-gray-400 mr-3"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex-1">
            <h1 className="font-bold text-white text-base">故障报修及续费</h1>
            <p className="text-[10px] text-gray-500">DVS网络客户服务</p>
          </div>
        </header>

        <div className="flex space-x-2 border-b border-gray-800 px-4">
          <button onClick={() => setRepairTab('repair')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${repairTab === 'repair' ? 'text-amber-400 border-amber-400' : 'text-gray-500 border-transparent'}`}>故障报修</button>
          <button onClick={() => setRepairTab('renewal')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${repairTab === 'renewal' ? 'text-cyan-400 border-cyan-400' : 'text-gray-500 border-transparent'}`}>续费</button>
        </div>

        <div className="p-4 space-y-4">
          {repairTab === 'repair' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">提交故障报修，维护团队将尽快与您联系</p>
              {repairSuccess && (
                <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-xl p-3 text-sm flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 shrink-0" />{repairSuccess}
                </div>
              )}
              <div className="bg-[#131B2E] border border-gray-800 rounded-xl p-4 space-y-3">
                <input value={repairForm.name} onChange={e => updateRepair('name', e.target.value)} placeholder="您的姓名 *" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none" />
                <input value={repairForm.phone} onChange={e => updateRepair('phone', e.target.value)} placeholder="手机号 *" maxLength={11} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none" />
                <input value={repairForm.address} onChange={e => updateRepair('address', e.target.value)} placeholder="地址" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none" />
                <select value={repairForm.issueType} onChange={e => updateRepair('issueType', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none">
                  {ISSUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <textarea value={repairForm.description} onChange={e => updateRepair('description', e.target.value)} placeholder="请描述您遇到的问题 *" rows={3} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none resize-none" />
                <button onClick={handleRepairSubmit} disabled={!repairForm.name || !repairForm.phone || !repairForm.description}
                  className="w-full bg-amber-500 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40">提交报修</button>
              </div>
            </div>
          )}

          {repairTab === 'renewal' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">查询当前套餐并在线续费</p>
              {renewSuccess && (
                <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-xl p-3 text-sm flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 shrink-0" />{renewSuccess}
                </div>
              )}
              <div className="bg-[#131B2E] border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex space-x-2">
                  <input value={renewPhone} onChange={e => setRenewPhone(e.target.value)} placeholder="输入注册手机号" maxLength={11}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none" />
                  <button onClick={handleLookupClient} disabled={!renewPhone} className="bg-cyan-500 text-white px-4 rounded-xl text-sm font-bold disabled:opacity-40">查询</button>
                </div>
                {renewClient === null && renewPhone && (
                  <div className="text-amber-400 text-xs flex items-center"><AlertTriangle className="w-3 h-3 mr-1" />未找到该手机号的客户信息</div>
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
      </div>
    );
  }
}

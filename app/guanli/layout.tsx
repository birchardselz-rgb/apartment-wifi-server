'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './styles.css';
import { Sidebar } from './components/Sidebar';
import { StateView } from './components/StateView';
import { TopBar } from './components/TopBar';
import { clearSession, getSession } from './lib/auth';
import type { GuanliSession } from './types';

export default function GuanliLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname.startsWith('/guanli/login');
  const [session, setSession] = useState<GuanliSession | null>(null);
  const [checking, setChecking] = useState(!isLogin);

  useEffect(() => {
    const current = getSession();
    setSession(current);
    setChecking(false);
    if (!isLogin && !current) router.replace('/guanli/login/');
  }, [isLogin, router]);

  const handleLogout = () => {
    clearSession();
    setSession(null);
    router.replace('/guanli/login/');
  };

  if (isLogin) return <div className="guanli-root">{children}</div>;
  if (checking) return <div className="guanli-root grid min-h-screen place-items-center"><StateView kind="loading" /></div>;
  if (!session) return <div className="guanli-root grid min-h-screen place-items-center"><StateView kind="forbidden" title="需要登录" description="登录后才能进入运营管理中心。" actionLabel="返回登录" onAction={() => router.replace('/guanli/login/')} /></div>;

  return <div className="guanli-root flex min-h-screen">
    <Sidebar session={session} />
    <div className="min-w-0 flex-1 pb-20 lg:pb-0">
      <TopBar pathname={pathname} session={session} onLogout={handleLogout} />
      <main className="mx-auto w-full max-w-[1440px] p-5 sm:p-8">{children}</main>
    </div>
  </div>;
}

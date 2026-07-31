'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Wifi } from 'lucide-react';
import { getVisibleNavigation } from '../lib/navigation';
import type { GuanliSession } from '../types';

type SidebarProps = { session: GuanliSession | null };

export function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname();
  const items = getVisibleNavigation(session?.role);

  return (
    <>
      <aside className="hidden w-[238px] shrink-0 flex-col border-r border-black/[0.07] bg-white/70 px-4 py-6 backdrop-blur-xl lg:flex">
        <Link href="/guanli/" className="mb-8 flex items-center gap-3 px-3">
          <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[#1d1d1f] text-white"><Wifi size={18} /></span>
          <span><strong className="block text-[14px] tracking-[-0.02em]">DVS 网络</strong><small className="text-[11px] text-[#86868b]">运营管理中心</small></span>
        </Link>
        <nav aria-label="管理后台主导航" className="space-y-1">
          {items.map(({ id, label, path, Icon }) => {
            const active = id === 'overview' ? pathname === '/guanli/' || pathname === '/guanli' : pathname.startsWith(path.replace(/\/$/, ''));
            return <Link key={id} href={path} aria-current={active ? 'page' : undefined} className={`group flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-[13px] font-medium transition ${active ? 'bg-[#1d1d1f] text-white shadow-[0_8px_18px_rgba(29,29,31,.14)]' : 'text-[#6e6e73] hover:bg-black/[0.045] hover:text-[#1d1d1f]'}`}>
              <Icon size={17} strokeWidth={active ? 2.3 : 1.9} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="opacity-60" />}
            </Link>;
          })}
        </nav>
        <div className="mt-auto rounded-[16px] bg-[#f5f5f7] p-3 text-[11px] leading-5 text-[#86868b]">系统运行正常<br /><span className="font-semibold text-[#18864b]">● 在线服务</span></div>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-black/[0.08] bg-white/90 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl lg:hidden" aria-label="移动端导航">
        {items.slice(0, 4).map(({ id, label, path, Icon }) => {
          const active = id === 'overview' ? pathname === '/guanli/' || pathname === '/guanli' : pathname.startsWith(path.replace(/\/$/, ''));
          return <Link key={id} href={path} aria-current={active ? 'page' : undefined} className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] ${active ? 'font-semibold text-[#0071e3]' : 'text-[#86868b]'}`}><Icon size={18} /><span>{label}</span></Link>;
        })}
      </nav>
    </>
  );
}

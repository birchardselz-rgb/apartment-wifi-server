"use client";
import { LogOut, Menu, UserCircle } from "lucide-react";
import { getNavigationItem } from "../lib/navigation";
import type { GuanliSession } from "../types";
type TopBarProps = { pathname: string; session: GuanliSession | null; onLogout: () => void; onMenu?: () => void };
export function TopBar({ pathname, session, onLogout, onMenu }: TopBarProps) {
  const item = getNavigationItem(pathname);
  return <header className="flex min-h-[74px] items-center justify-between gap-4 border-b border-black/[0.07] px-5 sm:px-8"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={onMenu} className="rounded-full p-2 text-[#6e6e73] hover:bg-black/[0.05] lg:hidden" aria-label="\u6253\u5f00\u83dc\u5355"><Menu size={19} /></button><div className="min-w-0"><p className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-[#86868b]">DVS {"\u7f51\u7edc"} / {item?.label || "\u7ba1\u7406\u540e\u53f0"}</p><h1 className="mt-1 truncate text-[20px] font-semibold tracking-[-0.035em]">{item?.description || "\u8fd0\u8425\u7ba1\u7406\u4e2d\u5fc3"}</h1></div></div><div className="flex shrink-0 items-center gap-3"><div className="hidden text-right sm:block"><p className="text-[13px] font-semibold">{session?.username || "\u8bbf\u5ba2"}</p><p className="text-[11px] text-[#86868b]">{session?.companyName || "\u8bf7\u767b\u5f55"}</p></div><div className="grid h-9 w-9 place-items-center rounded-full bg-[#e8f2ff] text-[#0071e3]"><UserCircle size={20} /></div>{session && <button type="button" onClick={onLogout} aria-label="\u9000\u51fa\u767b\u5f55" className="hidden rounded-full p-2 text-[#86868b] hover:bg-black/[0.05] sm:block"><LogOut size={17} /></button>}</div></header>;
}

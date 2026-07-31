"use client";
import { ArrowUpRight, ClipboardList } from "lucide-react";
import Link from "next/link";
type Props = { tickets: unknown[] };
const record = (item: unknown) => item && typeof item === "object" ? item as Record<string, unknown> : {};
export default function RecentTickets({ tickets }: Props) {
  const rows = tickets.slice(0, 4).map(record);
  return <section className="guanli-card guanli-list-card"><div className="guanli-section-heading"><div><p className="guanli-eyebrow">{"\u670d\u52a1\u53f0"}</p><h3>{"\u5f85\u5904\u7406\u5de5\u5355"}</h3></div><Link href="/guanli/tickets/" className="guanli-icon-link" aria-label="\u67e5\u770b\u5de5\u5355"><ArrowUpRight size={18} /></Link></div>{rows.length ? <div className="guanli-list">{rows.map((item, index) => <div className="guanli-list-row" key={String(item.id || item.ticketId || index)}><span className="guanli-list-icon"><ClipboardList size={17} /></span><div className="guanli-list-main"><strong>{String(item.title || item.subject || item.type || "\u5ba2\u6237\u670d\u52a1\u8bf7\u6c42")}</strong><span>{String(item.customerName || item.clientName || item.roomNumber || "\u5f85\u5206\u914d")}</span></div><span className="guanli-status-dot" /></div>)}</div> : <p className="guanli-empty-copy">{"\u5f53\u524d\u6ca1\u6709\u5f85\u5904\u7406\u5de5\u5355\uff0c\u8fd0\u8425\u72b6\u6001\u826f\u597d\u3002"}</p>}</section>;
}

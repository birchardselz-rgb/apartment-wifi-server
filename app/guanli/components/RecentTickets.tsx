"use client";

import { ArrowUpRight, ClipboardList } from "lucide-react";
import Link from "next/link";

type Props = { tickets: unknown[] };
const record = (item: unknown) => item && typeof item === "object" ? item as Record<string, unknown> : {};
export default function RecentTickets({ tickets }: Props) {
  const rows = tickets.slice(0, 4).map(record);
  return <section className="guanli-card guanli-list-card"><div className="guanli-section-heading"><div><p className="guanli-eyebrow">SERVICE DESK</p><h3>Pending requests</h3></div><Link href="/guanli/tickets/" className="guanli-icon-link" aria-label="View tickets"><ArrowUpRight size={18} /></Link></div>{rows.length ? <div className="guanli-list">{rows.map((item, index) => <div className="guanli-list-row" key={String(item.id || item.ticketId || index)}><span className="guanli-list-icon"><ClipboardList size={17} /></span><div className="guanli-list-main"><strong>{String(item.title || item.subject || item.type || "Customer service request")}</strong><span>{String(item.customerName || item.clientName || item.roomNumber || "Unassigned")}</span></div><span className="guanli-status-dot" /></div>)}</div> : <p className="guanli-empty-copy">No pending requests. Operations are looking good.</p>}</section>;
}

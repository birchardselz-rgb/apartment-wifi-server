"use client";

import { ArrowUpRight, CalendarClock } from "lucide-react";
import Link from "next/link";

type Props = { customers: unknown[] };
const record = (item: unknown) => item && typeof item === "object" ? item as Record<string, unknown> : {};
export default function ExpiryAlerts({ customers }: Props) {
  const rows = customers.slice(0, 4).map(record);
  return <section className="guanli-card guanli-list-card"><div className="guanli-section-heading"><div><p className="guanli-eyebrow">NEXT UP</p><h3>Expiring soon</h3></div><Link href="/guanli/customers/" className="guanli-icon-link" aria-label="View customers"><ArrowUpRight size={18} /></Link></div>{rows.length ? <div className="guanli-list">{rows.map((item, index) => <div className="guanli-list-row" key={String(item.id || item.customerId || index)}><span className="guanli-list-icon guanli-list-icon-warm"><CalendarClock size={17} /></span><div className="guanli-list-main"><strong>{String(item.name || item.customerName || item.phone || "Customer")}</strong><span>{String(item.expireDate || item.endDate || item.expiryDate || "Expiring soon")}</span></div><span className="guanli-list-arrow">›</span></div>)}</div> : <p className="guanli-empty-copy">No customers are expiring soon.</p>}</section>;
}

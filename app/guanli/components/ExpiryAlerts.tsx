"use client";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import Link from "next/link";
type Props = { customers: unknown[] };
const record = (item: unknown) => item && typeof item === "object" ? item as Record<string, unknown> : {};
export default function ExpiryAlerts({ customers }: Props) {
  const rows = customers.slice(0, 4).map(record);
  return <section className="guanli-card guanli-list-card"><div className="guanli-section-heading"><div><p className="guanli-eyebrow">{"\u5373\u5c06\u5904\u7406"}</p><h3>{"\u5373\u5c06\u5230\u671f"}</h3></div><Link href="/guanli/customers/" className="guanli-icon-link" aria-label="\u67e5\u770b\u5ba2\u6237"><ArrowUpRight size={18} /></Link></div>{rows.length ? <div className="guanli-list">{rows.map((item, index) => <div className="guanli-list-row" key={String(item.id || item.customerId || index)}><span className="guanli-list-icon guanli-list-icon-warm"><CalendarClock size={17} /></span><div className="guanli-list-main"><strong>{String(item.name || item.customerName || item.phone || "\u5ba2\u6237")}</strong><span>{String(item.expireDate || item.endDate || item.expiryDate || "\u8fd1\u671f\u5230\u671f")}</span></div><span className="guanli-list-arrow">›</span></div>)}</div> : <p className="guanli-empty-copy">{"\u6682\u65e0\u5373\u5c06\u5230\u671f\u7684\u5ba2\u6237\u3002"}</p>}</section>;
}

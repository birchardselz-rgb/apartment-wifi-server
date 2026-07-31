"use client";

import { ArrowUpRight, Building2, Wifi } from "lucide-react";
import type { DashboardSummary } from "../types";

type Props = { summary: DashboardSummary };
const numberValue = (value: unknown) => Number(value || 0).toLocaleString("zh-CN");

export default function OverviewPanel({ summary }: Props) {
  const rooms = Number(summary.allRooms || 0);
  const occupied = Number(summary.occupiedRooms || 0);
  const occupancy = rooms ? Math.round((occupied / rooms) * 100) : 0;
  return <section className="guanli-overview-grid">
    <div className="guanli-card guanli-card-dark guanli-hero-card"><div><p className="guanli-eyebrow">{"\u8fd0\u8425\u4fe1\u53f7"}</p><h2>{"\u6bcf\u4e00\u4e2a\u7ec6\u8282\uff0c"}<br />{"\u90fd\u53d8\u5f97\u6e05\u6670\u53ef\u89c1\u3002"}</h2><p className="guanli-hero-copy">{"\u623f\u6e90\u3001\u5bbd\u5e26\u3001\u5ba2\u6237\u4e0e\u5de5\u5355\u72b6\u6001\uff0c\u5728\u8fd9\u91cc\u5b9e\u65f6\u540c\u6b65\u3002"}</p></div><div className="guanli-hero-footer"><span><Wifi size={16} /> {"\u7f51\u7edc\u7a33\u5b9a"}</span><span><ArrowUpRight size={16} /> {"\u5b9e\u65f6\u540c\u6b65"}</span></div></div>
    <div className="guanli-card guanli-occupancy-card"><div className="guanli-card-heading"><div><p className="guanli-eyebrow">{"\u5165\u4f4f\u7387"}</p><h3>{occupancy}%</h3></div><Building2 size={22} className="guanli-icon-muted" /></div><div className="guanli-progress"><span style={{ width: String(Math.min(100, occupancy)) + "%" }} /></div><div className="guanli-card-meta"><span>{numberValue(occupied)} {"\u95f4\u5df2\u5165\u4f4f"}</span><span>{numberValue(Math.max(0, rooms - occupied))} {"\u95f4\u7a7a\u7f6e"}</span></div></div>
  </section>;
}

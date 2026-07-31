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
    <div className="guanli-card guanli-card-dark guanli-hero-card"><div><p className="guanli-eyebrow">PROPERTY SIGNAL</p><h2>Every detail in focus.<br />Every decision, simpler.</h2><p className="guanli-hero-copy">A live view of properties, network services, customers, and support requests.</p></div><div className="guanli-hero-footer"><span><Wifi size={16} /> Network stable</span><span><ArrowUpRight size={16} /> Live sync</span></div></div>
    <div className="guanli-card guanli-occupancy-card"><div className="guanli-card-heading"><div><p className="guanli-eyebrow">OCCUPANCY</p><h3>{occupancy}%</h3></div><Building2 size={22} className="guanli-icon-muted" /></div><div className="guanli-progress"><span style={{ width: `${Math.min(100, occupancy)}%` }} /></div><div className="guanli-card-meta"><span>{numberValue(occupied)} occupied</span><span>{numberValue(Math.max(0, rooms - occupied))} vacant</span></div></div>
  </section>;
}

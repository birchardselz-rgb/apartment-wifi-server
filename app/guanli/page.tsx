"use client";

import { Building2, CircleDollarSign, RefreshCw, Users, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { MetricCard } from "./components/MetricCard";
import OverviewPanel from "./components/OverviewPanel";
import RecentTickets from "./components/RecentTickets";
import ExpiryAlerts from "./components/ExpiryAlerts";
import { StateView } from "./components/StateView";
import { ApiError, getDashboardSummary, getExpiringCustomers, getPendingTickets } from "./lib/api";
import type { DashboardSummary } from "./types";

const emptySummary: DashboardSummary = { buildingCount: 0, allRooms: 0, occupiedRooms: 0, vacantRooms: 0, customerCount: 0 };
const asList = (value: unknown) => Array.isArray(value) ? value : [];

export default function GuanliOverviewPage() {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [tickets, setTickets] = useState<unknown[]>([]);
  const [customers, setCustomers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const [nextSummary, nextTickets, nextCustomers] = await Promise.all([getDashboardSummary(), getPendingTickets(), getExpiringCustomers()]); setSummary(nextSummary || emptySummary); setTickets(asList(nextTickets)); setCustomers(asList(nextCustomers)); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Unable to load live operations data."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const income = Number((summary as Record<string, unknown>).todayIncome || (summary as Record<string, unknown>).monthlyIncome || 0);
  if (loading) return <StateView kind="loading" title="Preparing your operations overview" />;
  if (error) return <StateView kind="error" title="Operations data is unavailable" description={error} actionLabel="Try again" onAction={() => void load()} />;
  return <div className="guanli-page-stack"><header className="guanli-page-header"><div><p className="guanli-eyebrow">OVERVIEW</p><h1>Good morning. Everything in order.</h1><p>Your property and network services control center.</p></div><button className="guanli-btn guanli-btn-secondary" onClick={() => void load()}><RefreshCw size={16} />Refresh</button></header><div className="guanli-metrics-grid"><MetricCard label="Total rooms" value={String(summary.allRooms || 0)} detail={`${summary.buildingCount || 0} properties`} icon={Building2} tone="blue" /><MetricCard label="Active customers" value={String(summary.customerCount || summary.occupiedRooms || 0)} detail="Currently active" icon={Users} tone="green" /><MetricCard label="Pending tickets" value={String(tickets.length)} detail="Service requests to review" icon={Wrench} tone="orange" /><MetricCard label="Current income" value={`¥${income.toLocaleString("zh-CN")}`} detail="Synced billing data" icon={CircleDollarSign} tone="red" /></div><OverviewPanel summary={summary} /><div className="guanli-two-column"><RecentTickets tickets={tickets} /><ExpiryAlerts customers={customers} /></div></div>;
}

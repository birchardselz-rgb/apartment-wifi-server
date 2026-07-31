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
    try {
      const [nextSummary, nextTickets, nextCustomers] = await Promise.all([getDashboardSummary(), getPendingTickets(), getExpiringCustomers()]);
      setSummary(nextSummary || emptySummary); setTickets(asList(nextTickets)); setCustomers(asList(nextCustomers));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "\u6682\u65f6\u65e0\u6cd5\u8bfb\u53d6\u8fd0\u8425\u6570\u636e\u3002");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const income = Number((summary as Record<string, unknown>).todayIncome || (summary as Record<string, unknown>).monthlyIncome || 0);
  if (loading) return <StateView kind="loading" title={"\u6b63\u5728\u6574\u7406\u8fd0\u8425\u6570\u636e"} />;
  if (error) return <StateView kind="error" title={"\u8fd0\u8425\u6570\u636e\u6682\u65f6\u4e0d\u53ef\u7528"} description={error} actionLabel={"\u91cd\u65b0\u52a0\u8f7d"} onAction={() => void load()} />;
  return <div className="guanli-page-stack">
    <header className="guanli-page-header"><div><p className="guanli-eyebrow">{"\u603b\u89c8"}</p><h1>{"\u65e9\u4e0a\u597d\uff0c\u4eca\u5929\u4e5f\u4e95\u7136\u6709\u5e8f\u3002"}</h1><p>{"\u8fd9\u662f\u4f60\u7684\u623f\u6e90\u4e0e\u7f51\u7edc\u670d\u52a1\u63a7\u5236\u53f0\u3002"}</p></div><button className="guanli-btn guanli-btn-secondary" onClick={() => void load()}><RefreshCw size={16} />{"\u5237\u65b0\u6570\u636e"}</button></header>
    <div className="guanli-metrics-grid">
      <MetricCard label={"\u623f\u6e90\u603b\u6570"} value={String(summary.allRooms || 0)} detail={String(summary.buildingCount || 0) + " \u4e2a\u9879\u76ee"} icon={Building2} tone="blue" />
      <MetricCard label={"\u5df2\u5165\u4f4f\u5ba2\u6237"} value={String(summary.customerCount || summary.occupiedRooms || 0)} detail={"\u5f53\u524d\u6d3b\u8dc3\u5ba2\u6237"} icon={Users} tone="green" />
      <MetricCard label={"\u5f85\u5904\u7406\u5de5\u5355"} value={String(tickets.length)} detail={"\u9700\u8981\u5173\u6ce8\u7684\u670d\u52a1\u8bf7\u6c42"} icon={Wrench} tone="orange" />
      <MetricCard label={"\u5f53\u671f\u6536\u5165"} value={"\u00a5" + income.toLocaleString("zh-CN")} detail={"\u6765\u81ea\u5df2\u540c\u6b65\u8d26\u5355"} icon={CircleDollarSign} tone="red" />
    </div>
    <OverviewPanel summary={summary} />
    <div className="guanli-two-column"><RecentTickets tickets={tickets} /><ExpiryAlerts customers={customers} /></div>
  </div>;
}

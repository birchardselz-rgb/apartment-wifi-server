"use client";

import { RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StateView } from "./StateView";
import { ApiError, getAllData } from "../lib/api";

export type ModuleConfig = { eyebrow: string; title: string; description: string; keys: string[]; columns: string[] };
const record = (item: unknown) => item && typeof item === "object" ? item as Record<string, unknown> : {};
const columnNames: Record<string, string> = { name: "\u540d\u79f0", phone: "\u7535\u8bdd", roomNumber: "\u623f\u95f4", roomNo: "\u623f\u53f7", status: "\u72b6\u6001", title: "\u6807\u9898", type: "\u7c7b\u578b", createdAt: "\u521b\u5efa\u65f6\u95f4", address: "\u5730\u5740", price: "\u4ef7\u683c", duration: "\u5468\u671f", amount: "\u91d1\u989d", username: "\u8d26\u53f7", role: "\u89d2\u8272" };
const titleize = (key: string) => columnNames[key] || key;

export function ModulePage({ config }: { config: ModuleConfig }) {
  const [data, setData] = useState<unknown[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const payload = await getAllData(); const source = record(payload); const found = config.keys.flatMap(key => Array.isArray(source[key]) ? source[key] : []); setData(found); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "\u6682\u65f6\u65e0\u6cd5\u52a0\u8f7d\u6570\u636e\u3002"); } finally { setLoading(false); } }, [config]);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => data.filter(item => JSON.stringify(item).toLowerCase().includes(query.toLowerCase())).slice(0, 100), [data, query]);
  if (loading) return <StateView kind="loading" title={"\u6b63\u5728\u52a0\u8f7d" + config.title} />;
  if (error) return <StateView kind="error" title={"\u6a21\u5757\u6682\u65f6\u4e0d\u53ef\u7528"} description={error} actionLabel={"\u91cd\u65b0\u52a0\u8f7d"} onAction={() => void load()} />;
  return <div className="guanli-page-stack"><header className="guanli-page-header"><div><p className="guanli-eyebrow">{config.eyebrow}</p><h1>{config.title}</h1><p>{config.description}</p></div><button className="guanli-btn guanli-btn-secondary" onClick={() => void load()}><RefreshCw size={16} />{"\u5237\u65b0"}</button></header><section className="guanli-card guanli-table-card"><div className="guanli-table-toolbar"><div className="guanli-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={"\u641c\u7d22\u8bb0\u5f55"} /></div><span className="guanli-count">{filtered.length} {"\u6761\u8bb0\u5f55"}</span></div>{filtered.length ? <div className="guanli-table-wrap"><table><thead><tr>{config.columns.map(column => <th key={column}>{titleize(column)}</th>)}</tr></thead><tbody>{filtered.map((item, index) => { const row = record(item); return <tr key={String(row.id || row._id || index)}>{config.columns.map(column => <td key={column}>{String(row[column] ?? "\u6682\u65e0")}</td>)}</tr>; })}</tbody></table></div> : <p className="guanli-empty-copy">{"\u6682\u65e0\u8bb0\u5f55\u3002"}</p>}</section></div>;
}

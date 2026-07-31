"use client";

import { RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StateView } from "./StateView";
import { ApiError, getAllData } from "../lib/api";

export type ModuleConfig = { eyebrow: string; title: string; description: string; keys: string[]; columns: string[] };
const record = (item: unknown) => item && typeof item === "object" ? item as Record<string, unknown> : {};
const titleize = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());

export function ModulePage({ config }: { config: ModuleConfig }) {
  const [data, setData] = useState<unknown[]>([]); const [query, setQuery] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const payload = await getAllData(); const source = record(payload); const found = config.keys.flatMap(key => Array.isArray(source[key]) ? source[key] : []); setData(found); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Unable to load module data."); } finally { setLoading(false); } }, [config]);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => data.filter(item => JSON.stringify(item).toLowerCase().includes(query.toLowerCase())).slice(0, 100), [data, query]);
  if (loading) return <StateView kind="loading" title={`Loading ${config.title.toLowerCase()}`} />;
  if (error) return <StateView kind="error" title="This module is unavailable" description={error} actionLabel="Try again" onAction={() => void load()} />;
  return <div className="guanli-page-stack"><header className="guanli-page-header"><div><p className="guanli-eyebrow">{config.eyebrow}</p><h1>{config.title}</h1><p>{config.description}</p></div><button className="guanli-btn guanli-btn-secondary" onClick={() => void load()}><RefreshCw size={16} />Refresh</button></header><section className="guanli-card guanli-table-card"><div className="guanli-table-toolbar"><div className="guanli-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search records" /></div><span className="guanli-count">{filtered.length} records</span></div>{filtered.length ? <div className="guanli-table-wrap"><table><thead><tr>{config.columns.map(column => <th key={column}>{titleize(column)}</th>)}</tr></thead><tbody>{filtered.map((item, index) => { const row = record(item); return <tr key={String(row.id || row._id || index)}>{config.columns.map(column => <td key={column}>{String(row[column] ?? "—")}</td>)}</tr>; })}</tbody></table></div> : <p className="guanli-empty-copy">No records are available yet.</p>}</section></div>;
}

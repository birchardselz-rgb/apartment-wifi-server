import { AlertCircle, Inbox, LoaderCircle, RefreshCw } from "lucide-react";
type StateViewProps = { kind: "loading" | "empty" | "error" | "forbidden"; title?: string; description?: string; actionLabel?: string; onAction?: () => void };
const defaults = {
  loading: ["\u6b63\u5728\u52a0\u8f7d", "\u6b63\u5728\u51c6\u5907\u6700\u65b0\u6570\u636e"],
  empty: ["\u6682\u65e0\u6570\u636e", "\u5f53\u524d\u6761\u4ef6\u4e0b\u6ca1\u6709\u53ef\u5c55\u793a\u7684\u5185\u5bb9"],
  error: ["\u6682\u65f6\u65e0\u6cd5\u52a0\u8f7d", "\u8bf7\u68c0\u67e5\u7f51\u7edc\u8fde\u63a5\u540e\u91cd\u8bd5"],
  forbidden: ["\u6ca1\u6709\u8bbf\u95ee\u6743\u9650", "\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u5f00\u901a\u5bf9\u5e94\u6a21\u5757\u6743\u9650"],
} as const;
export function StateView({ kind, title, description, actionLabel, onAction }: StateViewProps) {
  const [defaultTitle, defaultDescription] = defaults[kind];
  const Icon = kind === "loading" ? LoaderCircle : kind === "empty" ? Inbox : AlertCircle;
  return <div className="guanli-state"><div><div className="guanli-state__icon"><Icon size={20} className={kind === "loading" ? "animate-spin" : undefined} /></div><p className="guanli-state__title">{title || defaultTitle}</p><p className="guanli-state__description">{description || defaultDescription}</p>{onAction && actionLabel && kind !== "loading" && <button className="guanli-btn" type="button" onClick={onAction}><RefreshCw size={14} />{actionLabel}</button>}</div></div>;
}

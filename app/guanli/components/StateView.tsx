import { AlertCircle, Inbox, LoaderCircle, RefreshCw } from 'lucide-react';

type StateViewProps = {
  kind: 'loading' | 'empty' | 'error' | 'forbidden';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

const defaults = {
  loading: ['正在加载', '正在准备最新数据。'],
  empty: ['暂无数据', '当前条件下还没有可展示的内容。'],
  error: ['暂时无法加载', '请检查网络连接后重试。'],
  forbidden: ['没有访问权限', '请联系管理员开通对应模块权限。'],
} as const;

export function StateView({ kind, title, description, actionLabel, onAction }: StateViewProps) {
  const [defaultTitle, defaultDescription] = defaults[kind];
  const Icon = kind === 'loading' ? LoaderCircle : kind === 'empty' ? Inbox : AlertCircle;
  const isLoading = kind === 'loading';

  return (
    <div className="guanli-state">
      <div>
        <div className="guanli-state__icon">
          <Icon size={20} className={isLoading ? 'animate-spin' : undefined} />
        </div>
        <p className="guanli-state__title">{title || defaultTitle}</p>
        <p className="guanli-state__description">{description || defaultDescription}</p>
        {onAction && actionLabel && !isLoading && (
          <button className="guanli-btn" type="button" onClick={onAction}>
            <RefreshCw size={14} />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

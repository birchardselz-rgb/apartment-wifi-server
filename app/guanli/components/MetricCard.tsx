import type { LucideIcon } from 'lucide-react';

type MetricTone = 'blue' | 'green' | 'orange' | 'red';

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: MetricTone;
};

const toneStyles: Record<MetricTone, React.CSSProperties> = {
  blue: { '--g-metric-color': '#0071e3', '--g-metric-bg': '#e8f2ff', '--g-metric-glow': 'rgba(0, 113, 227, 0.1)' } as React.CSSProperties,
  green: { '--g-metric-color': '#18864b', '--g-metric-bg': '#e6f5ed', '--g-metric-glow': 'rgba(24, 134, 75, 0.1)' } as React.CSSProperties,
  orange: { '--g-metric-color': '#b45f06', '--g-metric-bg': '#fff2df', '--g-metric-glow': 'rgba(180, 95, 6, 0.1)' } as React.CSSProperties,
  red: { '--g-metric-color': '#c9342d', '--g-metric-bg': '#ffebe9', '--g-metric-glow': 'rgba(201, 52, 45, 0.1)' } as React.CSSProperties,
};

export function MetricCard({ label, value, detail, icon: Icon, tone = 'blue' }: MetricCardProps) {
  return (
    <article className="guanli-card guanli-metric" style={toneStyles[tone]}>
      <div className="guanli-metric__icon"><Icon size={18} strokeWidth={2.1} /></div>
      <p className="guanli-metric__label">{label}</p>
      <p className="guanli-metric__value">{value}</p>
      <p className="guanli-metric__detail">{detail}</p>
    </article>
  );
}

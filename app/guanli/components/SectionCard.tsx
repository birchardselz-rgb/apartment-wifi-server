import type { ReactNode } from 'react';

type SectionCardProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ eyebrow, title, description, action, children, className = '' }: SectionCardProps) {
  return (
    <section className={`guanli-card guanli-section ${className}`.trim()}>
      {(eyebrow || title || description || action) && (
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            {eyebrow && <p className="guanli-eyebrow">{eyebrow}</p>}
            {title && <h2 className="text-[19px] font-semibold tracking-[-0.03em]">{title}</h2>}
            {description && <p className="mt-1.5 text-[13px] leading-6 text-[#6e6e73]">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

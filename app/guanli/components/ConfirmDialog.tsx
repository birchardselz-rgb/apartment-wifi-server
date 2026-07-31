'use client';

import { X } from 'lucide-react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, description, confirmLabel = '确认', cancelLabel = '取消', destructive = false, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="guanli-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div className="guanli-modal" role="dialog" aria-modal="true" aria-labelledby="guanli-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p id="guanli-dialog-title" className="text-[20px] font-semibold tracking-[-0.03em]">{title}</p>
            <p className="mt-2 text-[14px] leading-6 text-[#6e6e73]">{description}</p>
          </div>
          <button className="rounded-full p-2 text-[#6e6e73] hover:bg-[#f1f1f3]" type="button" aria-label="关闭" onClick={onCancel}>
            <X size={17} />
          </button>
        </div>
        <div className="guanli-modal__actions">
          <button className="guanli-btn guanli-modal__cancel" type="button" onClick={onCancel}>{cancelLabel}</button>
          <button className={`guanli-btn ${destructive ? 'guanli-btn--danger' : 'guanli-btn--dark'}`} type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

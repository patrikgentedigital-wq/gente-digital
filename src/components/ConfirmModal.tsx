import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useDialog } from '../hooks/useDialog';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onClose,
}) => {
  const dialogRef = useDialog(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay/80 backdrop-blur-sm p-4" role="presentation">
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl border border-accent/40 bg-surface p-6 text-ink shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        tabIndex={-1}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-modal-title" className="text-base font-bold text-white">{title}</h2>
            <p id="confirm-modal-message" className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar confirmação" className="rounded-lg p-1 text-faint hover:bg-surface-2 hover:text-white">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-line bg-surface-2 px-4 py-2 text-xs font-semibold text-muted hover:text-white">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-ink hover:bg-accent-hover">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

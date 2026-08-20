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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#050912]/80 backdrop-blur-sm p-4" role="presentation">
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl border border-[#E3A73B]/40 bg-[#0F1E38] p-6 text-[#F2F5FA] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        tabIndex={-1}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E3A73B]/30 bg-[#E3A73B]/10 text-[#E3A73B]">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-modal-title" className="text-base font-bold text-white">{title}</h2>
            <p id="confirm-modal-message" className="mt-2 text-sm leading-relaxed text-[#A9B7CE]">{message}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar confirmação" className="rounded-lg p-1 text-[#6C7C99] hover:bg-[#14294A] hover:text-white">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#22365C] bg-[#14294A] px-4 py-2 text-xs font-semibold text-[#A9B7CE] hover:text-white">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className="rounded-xl bg-[#E3A73B] px-4 py-2 text-xs font-bold text-[#1a1200] hover:bg-[#eeb64f]">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

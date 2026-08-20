import React, { useEffect, useState } from 'react';
import { toast, ToastItem } from '../utils/toastUtils';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe((updated) => setToasts(updated));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => {
        let borderCls = 'border-[#22365C]';
        let bgCls = 'bg-[#0F1E38]';
        let textCls = 'text-white';
        let IconComponent = Info;
        let iconColor = 'text-[#38BDF8]';

        if (t.type === 'success') {
          borderCls = 'border-[#4fb579]/40';
          bgCls = 'bg-[#132a1c]';
          textCls = 'text-[#e6f8ee]';
          IconComponent = CheckCircle2;
          iconColor = 'text-[#4fb579]';
        } else if (t.type === 'error') {
          borderCls = 'border-[#e2687a]/40';
          bgCls = 'bg-[#3A1620]';
          textCls = 'text-[#ffebee]';
          IconComponent = AlertCircle;
          iconColor = 'text-[#e2687a]';
        } else if (t.type === 'warning') {
          borderCls = 'border-[#E3A73B]/40';
          bgCls = 'bg-[#3A2E14]';
          textCls = 'text-[#fef3c7]';
          IconComponent = AlertTriangle;
          iconColor = 'text-[#E3A73B]';
        }

        return (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${borderCls} ${bgCls} ${textCls} shadow-2xl backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in slide-in-from-top-2`}
          >
            <IconComponent aria-hidden="true" className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              {t.title && <div className="font-bold text-xs mb-0.5">{t.title}</div>}
              <div className="text-xs leading-relaxed opacity-95">{t.message}</div>
            </div>
            <button
              type="button"
              onClick={() => toast.remove(t.id)}
              aria-label="Fechar notificação"
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

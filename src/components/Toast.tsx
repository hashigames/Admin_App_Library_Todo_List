import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-in slide-in-from-bottom-2 ${
            toast.type === 'error'
              ? 'bg-rose-900/90 text-white border-rose-700'
              : 'bg-[#1E2A5E]/95 text-white border-[#1E2A5E]'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#F5A623] shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

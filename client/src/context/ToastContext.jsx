import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur)
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
        {toasts.map(t => {
          let bg = 'bg-white border-slate-200 text-slate-800';
          let Icon = Info;
          let iconColor = 'text-blue-500';

          if (t.type === 'success') {
            bg = 'bg-emerald-50 border-emerald-200 text-emerald-900';
            Icon = CheckCircle2;
            iconColor = 'text-emerald-600';
          } else if (t.type === 'error') {
            bg = 'bg-rose-50 border-rose-200 text-rose-900';
            Icon = AlertCircle;
            iconColor = 'text-rose-600';
          } else if (t.type === 'warning') {
            bg = 'bg-amber-50 border-amber-200 text-amber-900';
            Icon = AlertCircle;
            iconColor = 'text-amber-600';
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all animate-in slide-in-from-bottom-3 ${bg}`}
            >
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
              <div className="flex-1 text-sm font-medium leading-relaxed">{t.message}</div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

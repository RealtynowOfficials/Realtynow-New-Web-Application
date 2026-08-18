import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full px-4 sm:px-0 pointer-events-none">
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          // Success and Info/Notification toasts render in premium vibrant success green
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto px-4 py-3.5 rounded-xl shadow-xl text-sm font-semibold flex items-start justify-between gap-3 transition-all duration-300 animate-in slide-in-from-bottom-3 fade-in ${
                isError
                  ? 'bg-red-600 text-white border border-red-500 shadow-red-950/25'
                  : isWarning
                    ? 'bg-amber-500 text-white border border-amber-400 shadow-amber-950/25'
                    : 'bg-emerald-600 text-white border border-emerald-500 shadow-emerald-950/25'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {isError ? (
                  <AlertCircle className="h-5 w-5 shrink-0 text-white mt-0.5" />
                ) : isWarning ? (
                  <AlertTriangle className="h-5 w-5 shrink-0 text-white mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-white mt-0.5" />
                )}
                <span className="leading-snug break-words text-white font-medium">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-80 hover:opacity-100 hover:bg-white/20 rounded-md p-0.5 transition-colors shrink-0 text-white"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

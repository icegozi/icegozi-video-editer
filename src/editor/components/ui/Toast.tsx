import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (msg: string) => console.log('[Toast fallback]:', msg),
    };
  }
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto dismiss after 3.5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 'var(--z-toast, 250)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';

          return (
            <div
              key={toast.id}
              role={isError ? 'alert' : 'status'}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-control, 8px)',
                backgroundColor: 'var(--color-surface, #FFFFFF)',
                border: `1px solid ${
                  isError
                    ? 'var(--color-danger, #DC2626)'
                    : isSuccess
                    ? 'var(--color-success, #167A4A)'
                    : 'var(--color-border-default, #CBD5E1)'
                }`,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                fontSize: '13px',
                color: 'var(--color-text-primary, #17233B)',
                maxWidth: '360px',
                animation: 'fadeIn 120ms ease',
              }}
            >
              {isSuccess && <CheckCircle2 size={16} color="var(--color-success, #167A4A)" />}
              {isError && <AlertCircle size={16} color="var(--color-danger, #DC2626)" />}
              {!isSuccess && !isError && <Info size={16} color="var(--color-primary, #3568E8)" />}

              <span style={{ flex: 1, lineHeight: '1.4' }}>{toast.message}</span>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  padding: '2px',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary, #52627A)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Đóng thông báo"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

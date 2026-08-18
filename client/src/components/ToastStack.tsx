import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

interface ToastItem {
  id: number;
  message: string;
  variant: 'success' | 'danger' | 'warning' | 'info';
}

interface ToastContextValue {
  addToast: (message: string, variant?: ToastItem['variant']) => void;
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastItem['variant'] = 'success') => {
      const id = Date.now();
      setToasts((ts) => [...ts, { id, message, variant }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* aria-live so a toast is announced; the region exists even when empty
          so an insertion into it is what gets read, not the region appearing. */}
      <ToastContainer position="bottom-end" className="toast-stack">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            onClose={() => remove(t.id)}
            className={`text-bg-${t.variant} border-0`}
          >
            <Toast.Body className="d-flex justify-content-between align-items-center gap-3">
              <span>{t.message}</span>
              <button
                type="button"
                className={`btn-close${['success', 'danger', 'warning'].includes(t.variant) ? ' btn-close-white' : ''}`}
                onClick={() => remove(t.id)}
                aria-label="Close"
              />
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

import type { ToastItem, ToastVariant } from '../types';

interface ToasterProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

const ACCENT: Record<ToastVariant, string> = {
  success: 'border-l-4 border-l-green-500 text-green-400',
  error: 'border-l-4 border-l-red-500 text-red-400',
  info: 'border-l-4 border-l-indigo-500 text-indigo-400',
};

export default function Toaster({ toasts, onDismiss }: ToasterProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          onClick={() => onDismiss(toast.id)}
          className={`pointer-events-auto flex items-center justify-between gap-3 min-w-[240px] max-w-sm px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 shadow-lg cursor-pointer ${ACCENT[toast.variant]}`}
        >
          <span className="text-sm">{toast.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(toast.id);
            }}
            className="text-gray-400 hover:text-gray-100 transition-colors leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

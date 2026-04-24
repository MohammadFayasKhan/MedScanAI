import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return createPortal(
    <div className="fixed top-4 right-4 z-[120] space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onRemove(toast.id), toast.duration ?? 3200);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const colorMap: Record<ToastType, string> = {
    success: 'border-green-500/30 bg-green-500/12 text-green-300',
    error: 'border-red-500/30 bg-red-500/12 text-red-300',
    warning: 'border-amber-500/30 bg-amber-500/12 text-amber-300',
    info: 'border-cyan-500/30 bg-cyan-500/12 text-cyan-300',
  };

  return (
    <motion.div
      className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-xl ${colorMap[toast.type]}`}
      initial={{ opacity: 0, x: 40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 350, damping: 24 }}
    >
      <p className="text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="rounded p-1 text-current/80 hover:text-current hover:bg-white/10 transition-colors"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </motion.div>
  );
}

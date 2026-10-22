'use client';

import { useEffect } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastData {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
}

interface ToastProps {
  toast: ToastData;
  onClose: (id: number) => void;
  duration?: number;
}

const TONE_STYLE: Record<ToastTone, { box: string; icon: React.ReactNode }> = {
  success: {
    box: 'border-forest-300 bg-forest-100 text-forest-800',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  error: {
    box: 'border-clay-100 bg-clay-100 text-clay-600',
    icon: <TriangleAlert className="h-4 w-4" />,
  },
  info: {
    box: 'border-ink-200 bg-ink-100/80 text-ink-700',
    icon: <Info className="h-4 w-4" />,
  },
};

export function Toast({ toast, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => onClose(toast.id), duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, duration, onClose]);

  const tone = TONE_STYLE[toast.tone];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-[0_18px_40px_-24px_rgba(7,26,46,0.55)] animate-slide-down ${tone.box}`}
    >
      <span className="mt-0.5 shrink-0">{tone.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.message && <p className="mt-0.5 text-xs leading-relaxed opacity-90">{toast.message}</p>}
      </div>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        aria-label="Tutup notifikasi"
        className="focus-ring -mr-1 shrink-0 rounded-lg p-1 opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastViewport({
  toasts,
  onClose,
}: {
  toasts: ToastData[];
  onClose: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:top-0 sm:items-end sm:p-6">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

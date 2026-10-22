'use client';

import { useCallback, useRef, useState } from 'react';
import { ToastViewport, type ToastData, type ToastTone } from '@/components/Toast';

let counter = 0;

/** Notifikasi ringkas (toast) untuk aksi "data terkirim" / error. */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const timers = useRef<number[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, message?: string) => {
      counter += 1;
      const id = counter;
      setToasts((current) => [...current, { id, tone, title, message }]);
      const timer = window.setTimeout(() => dismiss(id), 6000);
      timers.current.push(timer);
      return id;
    },
    [dismiss],
  );

  const viewport = <ToastViewport toasts={toasts} onClose={dismiss} />;

  return { push, viewport };
}

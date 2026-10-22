'use client';

import { useEffect, useState } from 'react';
import { Delete, LockKeyhole, ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'penetasan.admin.unlocked';
const DEFAULT_PIN = '2361';
const PIN_LENGTH = 4;

export function AdminGate({ children }: { children: React.ReactNode }) {
  const expectedPin = (process.env.NEXT_PUBLIC_ADMIN_PIN || DEFAULT_PIN).trim();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(STORAGE_KEY) === '1') setUnlocked(true);
    } catch {
      /* abaikan */
    }
  }, []);

  function verify(value: string) {
    if (value === expectedPin) {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* abaikan */
      }
      setError(null);
      setUnlocked(true);
      return;
    }
    setError('PIN salah. Silakan coba kembali.');
    setPin('');
  }

  function press(digit: string) {
    setError(null);
    setPin((current) => {
      if (current.length >= PIN_LENGTH) return current;
      const next = current + digit;
      if (next.length === PIN_LENGTH) {
        window.setTimeout(() => verify(next), 120);
      }
      return next;
    });
  }

  function backspace() {
    setPin((current) => current.slice(0, -1));
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center px-4 py-14 sm:px-6">
      <div className="card p-6 sm:p-8">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-900 text-gold-300">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <h1 className="font-display mt-5 text-2xl font-extrabold tracking-tight text-ink-900">
          Panel admin
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          Rekap absensi piket hanya terbuka untuk tim fasilitas. Masukkan PIN 4 digit untuk
          melanjutkan.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3" aria-label="Kotak PIN">
          {Array.from({ length: PIN_LENGTH }).map((_, index) => (
            <span
              key={index}
              className={`h-3.5 w-3.5 rounded-full transition-all ${
                index < pin.length ? 'bg-forest-600 scale-110' : 'bg-ink-200'
              }`}
            />
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-center text-xs font-semibold text-clay-600">
            {error}
          </p>
        )}

        <div className="mt-6 grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => press(digit)}
              className="focus-ring num h-14 rounded-xl border border-ink-100 bg-surface text-lg font-bold text-ink-900 transition-colors hover:border-forest-400 hover:bg-forest-100/50 active:bg-forest-100"
            >
              {digit}
            </button>
          ))}
          <span aria-hidden="true" />
          <button
            type="button"
            onClick={() => press('0')}
            className="focus-ring num h-14 rounded-xl border border-ink-100 bg-surface text-lg font-bold text-ink-900 transition-colors hover:border-forest-400 hover:bg-forest-100/50 active:bg-forest-100"
          >
            0
          </button>
          <button
            type="button"
            onClick={backspace}
            aria-label="Hapus satu digit"
            className="focus-ring inline-flex h-14 items-center justify-center rounded-xl border border-ink-100 bg-surface text-ink-500 transition-colors hover:border-ink-300"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-ink-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Sesi terbuka sampai tab ini ditutup.
        </p>
      </div>
    </div>
  );
}

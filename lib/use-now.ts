'use client';

import { useEffect, useState } from 'react';

/**
 * Jam "hidup" yang diperbarui berkala.
 *
 * Nilai awal `null` supaya HTML server dan klien identik, lalu diisi tepat
 * setelah komponen terpasang (mount). Selama `null`, komponen menampilkan
 * skeleton — jadi tampilan tidak pernah berkedip teks waktu yang berbeda.
 */
export function useNow(intervalMs = 30000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}

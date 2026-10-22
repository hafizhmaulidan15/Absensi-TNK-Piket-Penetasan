'use client';

import { useEffect, useState } from 'react';
import { formatIndonesianDate, formatWIBTime } from '@/lib/shifts';

export function LiveClock({ className = '' }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!now) {
    return (
      <span className={`num font-mono text-sm text-ink-400 ${className}`} aria-hidden="true">
        --:--:--
      </span>
    );
  }

  return (
    <time className={`num font-mono text-sm text-ink-700 ${className}`} dateTime={now.toISOString()}>
      {formatWIBTime(now)}
    </time>
  );
}

export function TodayLabel({ className = '' }: { className?: string }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    setLabel(formatIndonesianDate(new Date()));
  }, []);

  if (!label) return null;

  return <span className={`text-xs text-ink-400 ${className}`}>{label}</span>;
}

'use client';

import { ClipboardCheck, Sparkles } from 'lucide-react';
import { useNow } from '@/lib/use-now';
import {
  formatCountdown,
  formatMinutes,
  formatWIBDateKey,
  formatWIBTime,
  getActiveShift,
  getNextShift,
  getShiftAvailability,
  getWIBMinutes,
} from '@/lib/shifts';

export function HeroSection() {
  const now = useNow(1000);

  if (!now) {
    return <HeroSkeleton />;
  }

  const active = getActiveShift(now);
  const next = getNextShift(now);
  const activeState = active ? getShiftAvailability(active.shift, now) : null;

  const current = getWIBMinutes(now);
  const windowProgress = active
    ? Math.min(
        100,
        Math.max(
          0,
          ((current - active.windowOpenMinutes) /
            (active.windowCloseMinutes - active.windowOpenMinutes)) *
            100,
        ),
      )
    : 0;

  const dayKey = formatWIBDateKey(now);

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-6 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:pt-20">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-forest-300/60 bg-forest-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-forest-800">
            <Sparkles className="h-3.5 w-3.5" />
            Fasilitas Penetasan &middot; TKIP
          </span>

          <h1 className="font-display mt-5 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl lg:text-[4.1rem]">
            Piket dicatat,
            <br />
            penetasan <span className="relative whitespace-nowrap text-forest-700">
              terpantau
              <svg
                className="absolute -bottom-2 left-0 w-full text-gold-500"
                viewBox="0 0 200 12"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M2 8C40 3 92 1.5 198 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
            .
          </h1>

          <p className="mt-7 max-w-xl text-base leading-relaxed text-ink-500 sm:text-lg">
            Enam shift piket, satu formulir singkat. Isi nama, pilih shift yang sedang berjalan, lalu
            kirim foto kondisi ruang penetasan sebagai bukti kehadiran.
          </p>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-ink-100 pt-6">
            <div>
              <dt className="label-caps">Shift/hari</dt>
              <dd className="num font-display mt-1 text-2xl font-bold text-ink-900">6</dd>
            </div>
            <div>
              <dt className="label-caps">Jendela</dt>
              <dd className="num font-display mt-1 text-2xl font-bold text-ink-900">90 mnt</dd>
            </div>
            <div>
              <dt className="label-caps">Bukti</dt>
              <dd className="font-display mt-1 text-2xl font-bold text-ink-900">Foto</dd>
            </div>
          </dl>
        </div>

        <div className="animate-rise relative lg:justify-self-end">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-forest-200/40 via-gold-100/50 to-transparent blur-2xl" />
          <div className="relative overflow-hidden rounded-[1.75rem] bg-ink-900 p-6 text-ink-100 shadow-[0_40px_90px_-50px_rgba(7,26,46,0.9)] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="label-caps text-ink-300">Waktu sekarang</p>
                <p className="num font-mono mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  {formatWIBTime(now).replace(' WIB', '')}
                </p>
                <p className="mt-1 text-xs text-ink-400">Waktu Indonesia Barat (UTC+7)</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[11px] text-ink-200">
                {dayKey}
              </span>
            </div>

            <div className="mt-7 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="label-caps text-ink-300">Status shift</span>
                  {activeState && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        activeState.state === 'late'
                          ? 'bg-clay-500/20 text-clay-100'
                          : 'bg-forest-500/25 text-forest-300'
                      }`}
                    >
                      {activeState.statusLabel}
                    </span>
                  )}
                </div>

                {active ? (
                  <>
                    <p className="mt-2 font-display text-xl font-bold text-white">
                      {active.shift} &middot; {active.name}
                    </p>
                    <p className="mt-1 text-xs text-ink-300">
                      Jendela pengisian {active.windowLabel}
                    </p>
                    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-300 transition-[width] duration-700"
                        style={{ width: `${windowProgress}%` }}
                      />
                    </div>
                    <p className="num mt-2 text-[11px] text-ink-400">
                      {formatMinutes(current)} &rarr; {formatMinutes(active.windowCloseMinutes)} WIB
                    </p>
                  </>
                ) : (
                  <p className="mt-2 font-display text-xl font-bold text-white">Tidak ada shift terbuka</p>
                )}
              </div>

              {next && (
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div>
                    <p className="label-caps text-ink-300">Shift berikutnya</p>
                    <p className="mt-1 font-display text-base font-bold text-white">
                      {next.config.shift} &middot; {next.config.name}
                    </p>
                  </div>
                  <p className="num shrink-0 rounded-xl bg-gold-500/15 px-3 py-1.5 text-xs font-semibold text-gold-300">
                    {formatCountdown(next.minutesUntil)} lagi
                  </p>
                </div>
              )}
            </div>

            <p className="mt-6 flex items-start gap-2 text-[11px] leading-relaxed text-ink-400">
              <ClipboardCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-400" />
              Formulir hanya bisa dikirim pada shift yang sedang terbuka. Foto wajib diambil langsung
              dari kamera (dengan cap waktu WIB) dan tersimpan di folder Drive
              &ldquo;Dokumentasi Penetasan&rdquo;.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroSkeleton() {
  return (
    <section className="relative overflow-hidden" aria-hidden="true">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-6 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:pt-20">
        <div className="animate-pulse">
          <div className="h-7 w-56 rounded-full bg-ink-100" />
          <div className="mt-5 h-12 w-full rounded-2xl bg-ink-100" />
          <div className="mt-3 h-12 w-4/5 rounded-2xl bg-ink-100" />
          <div className="mt-7 h-4 w-full rounded-full bg-ink-100" />
          <div className="mt-2 h-4 w-3/4 rounded-full bg-ink-100" />
          <div className="mt-8 flex gap-3">
            <div className="h-12 w-52 rounded-full bg-ink-100" />
            <div className="h-12 w-48 rounded-full bg-ink-100" />
          </div>
        </div>
        <div className="relative">
          <div className="overflow-hidden rounded-[1.75rem] bg-ink-900 p-6 sm:p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-3 w-28 rounded bg-white/15" />
              <div className="h-10 w-56 rounded-lg bg-white/15" />
              <div className="h-24 w-full rounded-2xl bg-white/10" />
              <div className="h-16 w-full rounded-2xl bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

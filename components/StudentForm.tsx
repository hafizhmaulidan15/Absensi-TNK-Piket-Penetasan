'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, MapPin, PhoneCall, Send } from 'lucide-react';
import { PhotoCapture } from '@/components/PhotoCapture';
import { submitAttendance } from '@/lib/api';
import { useNow } from '@/lib/use-now';
import {
  calculateAttendanceStatus,
  getAllShiftAvailabilities,
  getShiftConfig,
} from '@/lib/shifts';
import type { CompressedImage } from '@/lib/image';
import { LOKASI_OPTIONS, type PiketShift } from '@/types/attendance';
import { useToasts } from '@/lib/use-toasts';

type Feedback = { tone: 'success' | 'error' | 'info'; message: string };

export function StudentForm({ defaultShift }: { defaultShift?: PiketShift }) {
  const now = useNow(15000);
  const [name, setName] = useState('');
  const [nim, setNim] = useState('');
  const [lokasi] = useState<string>(LOKASI_OPTIONS[0]);
  const [deskripsi, setDeskripsi] = useState('');
  const [shift, setShift] = useState<PiketShift | ''>(defaultShift ?? '');
  const [photo, setPhoto] = useState<CompressedImage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const { push, viewport } = useToasts();
  const successRef = useRef<HTMLDivElement>(null);

  const shiftStates = useMemo(() => (now ? getAllShiftAvailabilities(now) : []), [now]);
  const activeShift = shiftStates.find((item) => item.availability.isOpen)?.config ?? null;

  useEffect(() => {
    if (defaultShift) setShift(defaultShift);
  }, [defaultShift]);

  useEffect(() => {
    if (feedback?.tone === 'success') {
      successRef.current?.focus();
    }
  }, [feedback]);

  if (!now) {
    return <FormSkeleton />;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    if (name.trim().length < 3) {
      setFieldError('Isi nama lengkap minimal 3 karakter.');
      return;
    }
    if (nim.trim().length < 3) {
      setFieldError('Isi NIM minimal 3 karakter (boleh huruf, contoh: J0409241062).');
      return;
    }
    if (!lokasi) {
      setFieldError('Pilih lokasi piket.');
      return;
    }
    if (deskripsi.trim().length < 3) {
      setFieldError('Tulis deskripsi singkat kegiatan piket.');
      return;
    }
    if (!shift) {
      setFieldError('Pilih shift piket yang sedang berjalan.');
      return;
    }
    if (!photo) {
      setFieldError('Ambil foto kondisi sebagai bukti kehadiran.');
      return;
    }

    const availability = shiftStates.find((item) => item.config.shift === shift)?.availability;
    if (!availability?.isOpen) {
      setFieldError('Shift yang dipilih sedang terkunci. Pilih shift yang sedang terbuka.');
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const timestamp = new Date().toISOString();

    void submitAttendance({
      nama: name.trim(),
      nim: nim.trim(),
      lokasi,
      deskripsi: deskripsi.trim(),
      waktu: timestamp,
      shift,
      foto: photo.base64,
      status: calculateAttendanceStatus(shift, new Date()),
    })
      .then((result) => {
        if (result.ok) {
          setFeedback({
            tone: result.offline ? 'info' : 'success',
            message: result.offline
              ? 'Absensi tersimpan di perangkat (mode demo). Hubungkan endpoint GAS untuk masuk ke Sheet.'
              : `Absensi ${shift} tercatat. Terima kasih, ${name.trim().split(' ')[0]}.`,
          });
          setName('');
          setNim('');
          setDeskripsi('');
          setPhoto(null);
          setShift('');
          push(
            result.offline ? 'info' : 'success',
            result.offline ? 'Tersimpan di perangkat' : 'Absensi terkirim',
            result.offline
              ? 'Endpoint GAS belum terhubung, data disimpan di perangkat.'
              : `${name.trim().split(' ')[0]} - shift ${shift} tercatat di rekap Sheet.`,
          );
        } else {
          setFeedback({ tone: 'error', message: result.message });
          push('error', 'Gagal mengirim', result.message);
        }
      })
      .catch(() => {
        setFeedback({
          tone: 'error',
          message: 'Terjadi kendala teknis. Silakan coba beberapa saat lagi.',
        });
        push('error', 'Gagal mengirim', 'Terjadi kendala teknis, coba lagi beberapa saat.');
      })
      .finally(() => setIsSubmitting(false));
  }

  return (
    <>
      {viewport}
      <form onSubmit={handleSubmit} className="card p-5 sm:p-7" noValidate>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">
            Formulir kehadiran
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Semua kolom wajib diisi: nama, NIM, lokasi, deskripsi, shift, lalu foto dari kamera.
          </p>
        </div>
        {activeShift ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-forest-100 px-3 py-1.5 text-[11px] font-bold text-forest-800">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-forest-500" />
            </span>
            {activeShift.shift} terbuka
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-ink-100 px-3 py-1.5 text-[11px] font-bold text-ink-600">
            Tidak ada shift terbuka
          </span>
        )}
      </div>

      {!activeShift && (
        <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-ink-100 bg-ink-100/60 px-3.5 py-2.5 text-xs leading-relaxed text-ink-500">
          <PhoneCall className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500" />
          <span>
            Belum ada shift yang terbuka. Form dibuka 5 menit sebelum jam shift dan ditutup 10
            menit setelah dibuka. Telat mengisi? Hubungi{' '}
            <span className="font-semibold text-ink-700">Kak Riswi</span> untuk konfirmasi
            kehadiran â€” absen dicatat manual oleh Kak Riswi.
          </span>
        </p>
      )}


      <div className="mt-6 space-y-6">
        <div>
          <label htmlFor="nama" className="label-caps">
            Nama lengkap
          </label>
          <input
            id="nama"
            name="nama"
            type="text"
            autoComplete="name"
            placeholder="Contoh: Rizky Amanullah"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field mt-2"
            aria-describedby="nama-help"
          />
          <p id="nama-help" className="mt-1.5 text-xs text-ink-400">
            Nama akan tampil di rekap admin. Tulis sesuai nama resmi piket.
          </p>
        </div>

        <div>
          <label htmlFor="nim" className="label-caps">
            NIM
          </label>
          <input
            id="nim"
            name="nim"
            type="text"
            inputMode="text"
            autoComplete="off"
            placeholder="Contoh: J0409241062"
            value={nim}
            onChange={(event) => setNim(event.target.value)}
            className="num field mt-2 font-mono"
            aria-describedby="nim-help"
          />
          <p id="nim-help" className="mt-1.5 text-xs text-ink-400">
            Boleh huruf dan angka (contoh: J0409241062). Dipakai sebagai referensi &amp; nama berkas foto.
          </p>
        </div>

        <div>
          <label htmlFor="lokasi" className="label-caps">
            Lokasi piket <span className="text-clay-500">*</span>
          </label>
          <div
            id="lokasi"
            aria-describedby="lokasi-help"
            className="field mt-2 flex items-center gap-2 text-ink-800"
          >
            <MapPin className="h-4 w-4 shrink-0 text-forest-600" />
            <span className="font-semibold">{LOKASI_OPTIONS[0]}</span>
          </div>
          <input type="hidden" name="lokasi" value={LOKASI_OPTIONS[0]} />
          <p id="lokasi-help" className="mt-1.5 text-xs text-ink-400">
            Lokasi piket tetap: {LOKASI_OPTIONS[0]}.
          </p>
        </div>

        <div>
          <label htmlFor="deskripsi" className="label-caps">
            Deskripsi piket <span className="text-clay-500">*</span>
          </label>
          <textarea
            id="deskripsi"
            name="deskripsi"
            rows={3}
            value={deskripsi}
            onChange={(event) => setDeskripsi(event.target.value)}
            placeholder="Contoh: Supervisi piket staff kandang dan cek pagar"
            className="field mt-2 resize-y"
            aria-describedby="deskripsi-help"
          />
          <p id="deskripsi-help" className="mt-1.5 text-xs text-ink-400">
            Wajib diisi, minimal 3 karakter.
          </p>
        </div>


        <fieldset>
          <legend className="label-caps">Shift piket</legend>
          <p className="mt-1.5 text-xs text-ink-400">
            Jadwal hari ini â€” shift terkunci tidak dapat dipilih.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {shiftStates.map(({ config, availability }) => {
              const selected = shift === config.shift;
              const disabled = !availability.isOpen;
              return (
                <label
                  key={config.shift}
                  className={`relative flex cursor-pointer flex-col rounded-xl border px-3 py-2.5 transition-all ${
                    selected
                      ? 'border-forest-600 bg-forest-100/70 ring-2 ring-forest-500/25'
                      : disabled
                        ? 'cursor-not-allowed border-ink-100 bg-paper-deep/60'
                        : 'border-ink-200 bg-surface hover:border-ink-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="shift"
                    value={config.shift}
                    checked={selected}
                    disabled={disabled}
                    onChange={() => setShift(config.shift)}
                    className="sr-only"
                  />
                  <span
                    className={`num font-display text-base font-extrabold ${
                      disabled ? 'text-ink-300' : selected ? 'text-forest-800' : 'text-ink-900'
                    }`}
                  >
                    {config.shift}
                  </span>
                  <span
                    className={`mt-0.5 text-[11px] ${
                      disabled ? 'text-ink-300' : selected ? 'text-forest-700' : 'text-ink-500'
                    }`}
                  >
                    {config.name}
                  </span>
                  {!disabled && (
                    <span
                      className={`mt-1 text-[10px] font-semibold ${
                        availability.state === 'late' ? 'text-clay-600' : 'text-forest-600'
                      }`}
                    >
                      {availability.statusLabel}
                    </span>
                  )}
                  {disabled && (
                    <span className="mt-1 text-[10px] font-semibold text-ink-300">
                      {availability.minutesUntilOpen > 0
                        ? `Buka ${availability.minutesUntilOpen} mnt lagi`
                        : 'Terkunci'}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          {shift && (
            <p className="mt-2 text-xs text-ink-400">
              {getShiftConfig(shift).windowLabel} &middot; durasi piket {getShiftConfig(shift).durationLabel}.
            </p>
          )}
        </fieldset>

        <div>
          <span className="label-caps">Dokumentasi foto</span>
          <div className="mt-2">
            <PhotoCapture value={photo} onChange={setPhoto} disabled={isSubmitting} />
          </div>
        </div>

        {fieldError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-clay-100 bg-clay-100/60 px-3.5 py-2.5 text-xs font-medium text-clay-600"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {fieldError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest-700 px-6 py-3.5 text-sm font-bold text-white shadow-[0_18px_40px_-22px_rgba(11,90,56,0.9)] transition-all hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Mengirim laporan...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Kirim absensi
            </>
          )}
        </button>

        {feedback && (
          <div
            ref={successRef}
            tabIndex={-1}
            role="status"
            className={`animate-slide-down flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm focus:outline-none ${
              feedback.tone === 'success'
                ? 'border-forest-300 bg-forest-100 text-forest-800'
                : feedback.tone === 'info'
                  ? 'border-ink-200 bg-ink-100/70 text-ink-700'
                  : 'border-clay-100 bg-clay-100/70 text-clay-600'
            }`}
          >
            {feedback.tone === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : feedback.tone === 'info' ? (
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}
      </div>
      </form>
    </>
  );
}

function FormSkeleton() {
  return (
    <div className="card p-5 sm:p-7" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <div className="animate-pulse space-y-2">
          <div className="h-5 w-44 rounded bg-ink-100" />
          <div className="h-3 w-64 rounded bg-ink-100" />
        </div>
        <div className="h-7 w-28 rounded-full bg-ink-100" />
      </div>
      <div className="mt-6 animate-pulse space-y-5">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-ink-100" />
          <div className="h-12 w-full rounded-xl bg-ink-100" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-ink-100" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-16 rounded-xl bg-ink-100" />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-ink-100" />
          <div className="h-44 w-full rounded-2xl bg-ink-100" />
        </div>
        <div className="h-12 w-full rounded-full bg-ink-100" />
      </div>
    </div>
  );
}

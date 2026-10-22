'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { compressImage, formatBytes, type CompressedImage } from '@/lib/image';

interface PhotoCaptureProps {
  value: CompressedImage | null;
  onChange: (value: CompressedImage | null) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

/**
 * Ambil foto langsung dari kamera (tanpa unggah berkas) dan bakar cap waktu WIB
 * ke dalam gambar. Hanya menerima hasil jepretan kamera perangkat.
 */
export function PhotoCapture({ value, onChange, onError, disabled = false }: PhotoCaptureProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      setError(null);
      setIsProcessing(true);
      try {
        // Captured timestamp dibakar ke foto pada detik ini.
        const compressed = await compressImage(file, new Date());
        onChange(compressed);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gagal memproses foto.';
        setError(message);
        onError?.(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [onChange, onError],
  );

  useEffect(() => {
    if (!value) setError(null);
  }, [value]);

  if (value) {
    return (
      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-surface">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-100 sm:aspect-[16/10]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value.previewUrl}
            alt="Pratinjau foto dokumentasi piket"
            className="h-full w-full object-cover"
          />
          <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2">
            <span className="num rounded-full bg-ink-900/80 px-2.5 py-1 font-mono text-[11px] text-white backdrop-blur">
              {value.width} &times; {value.height} px &middot; {formatBytes(value.sizeBytes)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs text-ink-500">
            <ShieldCheck className="h-3.5 w-3.5 text-forest-600" />
            Cap waktu <span className="num font-mono text-ink-700">{value.capturedAt}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => cameraInputRef.current?.click()}
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:border-ink-300 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Ambil ulang
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-clay-100 bg-clay-100 px-3 py-1.5 text-xs font-semibold text-clay-600 transition-colors hover:bg-clay-100/70 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus
            </button>
          </div>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-200 bg-surface-sunk px-5 py-9 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-forest-700 shadow-sm">
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </span>

        <p className="font-display mt-4 text-sm font-bold text-ink-900">
          {isProcessing ? 'Memproses foto...' : 'Foto langsung di tempat'}
        </p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-400">
          Foto wajib diambil saat ini lewat kamera. Unggah berkas tidak tersedia, dan cap waktu WIB
          otomatis tertanam di foto sebagai bukti.
        </p>

        <button
          type="button"
          disabled={disabled || isProcessing}
          onClick={() => cameraInputRef.current?.click()}
          className="focus-ring mt-5 inline-flex items-center gap-2 rounded-full bg-forest-700 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-forest-800 disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
          Buka kamera
        </button>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-clay-600">
          {error}
        </p>
      )}
    </div>
  );
}

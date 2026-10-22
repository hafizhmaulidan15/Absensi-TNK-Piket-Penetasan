import { BrandMark } from '@/components/BrandMark';

const CREDIT = process.env.NEXT_PUBLIC_CREDIT_NAME || 'Hafizh Maulidan';

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col items-start justify-between gap-6 border-t border-ink-100 pt-8 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <BrandMark className="h-8 w-8" />
          <div>
            <p className="font-display text-sm font-bold text-ink-900">Absensi Piket Penetasan</p>
            <p className="text-xs text-ink-400">TNK 62 &middot; Sekolah Vokasi IPB &middot; 2026</p>
          </div>
        </div>
        <p className="max-w-sm text-xs leading-relaxed text-ink-400">
          Pengisian absensi hanya sah pada shift yang sedang terbuka. Foto dokumentasi disimpan di
          folder Drive tim piket.
        </p>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2 border-t border-ink-100 pt-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-300">
          Web ini dibuat oleh
        </p>
        <p className="font-display text-sm font-extrabold tracking-tight text-ink-800">
          {CREDIT}
        </p>
        <p className="text-[10px] text-ink-300">
          Absensi Piket Penetasan TNK 62 &middot; Sekolah Vokasi IPB
        </p>
      </div>
    </footer>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { LiveClock } from '@/components/LiveClock';

const NAV = [
  { href: '/#absen', label: 'Isi Absensi' },
  { href: '/#panduan', label: 'Panduan' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = pathname?.startsWith('/admin');

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100/80 bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-xl" aria-label="Beranda absensi piket">
          <BrandMark className="h-9 w-9 shrink-0" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-sm font-extrabold tracking-tight text-ink-900 sm:text-[15px]">
              Piket Penetasan
            </span>
            <span className="label-caps text-[10px]">TNK 62 &middot; Vokasi IPB</span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
          {!isAdmin &&
            NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="focus-ring rounded-lg px-3 py-2 text-sm font-medium text-ink-500 transition-colors hover:bg-forest-100 hover:text-forest-800"
              >
                {item.label}
              </a>
            ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <div className="hidden items-center gap-2 rounded-full border border-ink-100 bg-surface px-3 py-1.5 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-forest-500" />
            </span>
            <LiveClock />
          </div>

          {isAdmin && (
            <Link
              href="/"
              className="focus-ring hidden items-center gap-2 rounded-full border border-ink-200 bg-surface px-4 py-2 text-sm font-semibold text-ink-800 transition-colors hover:border-forest-500 hover:text-forest-700 sm:inline-flex"
            >
              <ArrowLeft className="h-4 w-4" />
              Halaman Absen
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Buka menu navigasi"
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 bg-surface text-ink-800 md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="animate-slide-down border-t border-ink-100 bg-paper px-4 pb-5 pt-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Navigasi seluler">
            {!isAdmin &&
              NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-forest-100"
                >
                  {item.label}
                </a>
              ))}
            {isAdmin && (
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-surface px-3 py-2.5 text-sm font-semibold text-ink-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Halaman Absen
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

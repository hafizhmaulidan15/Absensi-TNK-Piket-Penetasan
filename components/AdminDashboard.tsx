'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileSpreadsheet,
  ImageOff,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  TriangleAlert,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { addManualRecord, fetchAttendanceRecords } from '@/lib/api';
import {
  formatWIBDateKey,
  formatWIBDateTime,
  SHIFT_CONFIGS,
} from '@/lib/shifts';
import { LOKASI_OPTIONS, type AttendanceRecord, type AttendanceStatus, type PiketShift } from '@/types/attendance';
import { useToasts } from '@/lib/use-toasts';
import { compressImage } from '@/lib/image';

const PAGE_SIZE = 8;
const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
type SortKey = 'timestamp' | 'name';

const SPREADSHEET_ID = (
  process.env.NEXT_PUBLIC_SPREADSHEET_ID ?? '10XUDc4pgIIThzizmV0G24eUok80KoAo3DEjPBBgeXAQ'
).trim();
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=0`;

const SOURCE_LABEL: Record<string, string> = {
  gas: 'Google Sheets',
  local: 'Penyimpanan lokal',
  sample: 'Data contoh',
};

function formatLongWIBDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatShortWIBDate(value: string): string {
  if (!value) return '-';
  const [year, month, day] = value.split('-');
  return `${Number(day)} ${MONTHS[Number(month) - 1].slice(0, 3)} ${year}`;
}

export function AdminDashboard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [source, setSource] = useState<'gas' | 'local' | 'sample'>('sample');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  const [query, setQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState<PiketShift | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [ascending, setAscending] = useState(false);
  const [page, setPage] = useState(1);

  const [showAddForm, setShowAddForm] = useState(false);
  const { push, viewport } = useToasts();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchAttendanceRecords();
      setRecords(result.records);
      setSource(result.source);
      setLastLoadedAt(new Date());
    } catch {
      setError('Gagal memuat data absensi. Periksa koneksi lalu coba muat ulang.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const result = records.filter((record) => {
      if (shiftFilter !== 'all' && record.shift !== shiftFilter) return false;
      if (statusFilter !== 'all' && record.status !== statusFilter) return false;
      if (normalized) {
        const haystack = `${record.studentName} ${record.nim}`.toLowerCase();
        if (!haystack.includes(normalized)) return false;
      }

      const key = formatWIBDateKey(new Date(record.timestamp));
      if (fromDate && key < fromDate) return false;
      if (toDate && key > toDate) return false;
      return true;
    });

    return result.sort((a, b) => {
      if (sortKey === 'name') {
        return a.studentName.localeCompare(b.studentName, 'id');
      }
      return +new Date(a.timestamp) - +new Date(b.timestamp);
    });
  }, [records, query, shiftFilter, statusFilter, fromDate, toDate, sortKey]);

  const ordered = useMemo(
    () => (ascending ? [...filtered].reverse() : filtered),
    [filtered, ascending],
  );

  const pageCount = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = ordered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    const perShift = SHIFT_CONFIGS.reduce(
      (acc, config) => {
        acc[config.shift] = 0;
        return acc;
      },
      {} as Record<PiketShift, number>,
    );
    const unique = new Set<string>();
    let photos = 0;
    let late = 0;
    let onTime = 0;
    let manual = 0;

    for (const record of records) {
      perShift[record.shift] = (perShift[record.shift] ?? 0) + 1;
      unique.add(record.studentName.trim().toLowerCase());
      if (record.photoUrl || record.photoName) photos += 1;
      if (record.status === 'Terlambat') late += 1;
      else onTime += 1;
      if (record.manual) manual += 1;
    }

    const topShift = SHIFT_CONFIGS.reduce(
      (best, config) => (perShift[config.shift] > perShift[best.shift] ? config : best),
      SHIFT_CONFIGS[0],
    );

    return { total: records.length, unique: unique.size, photos, perShift, topShift, late, onTime, manual };
  }, [records]);

  const maxShiftCount = Math.max(1, ...Object.values(stats.perShift));
  const isSample = source === 'sample';
  const punctuality = stats.total > 0 ? Math.round((stats.onTime / stats.total) * 100) : 0;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setAscending((value) => !value);
    } else {
      setSortKey(key);
      setAscending(key === 'name');
    }
    setPage(1);
  }

  function resetFilters() {
    setQuery('');
    setShiftFilter('all');
    setStatusFilter('all');
    setFromDate('');
    setToDate('');
    setPage(1);
  }

  function exportCsv() {
    const header = ['Tanggal', 'Waktu', 'Nama', 'NIM', 'Shift', 'Status', 'Sumber', 'File foto'];
    const rows = ordered.map((record) => {
      const { date, time } = formatWIBDateTime(record.timestamp);
      return [
        date,
        time,
        record.studentName,
        record.nim,
        record.shift,
        record.status,
        record.manual ? 'Manual' : 'Absensi',
        record.photoName || record.photoUrl,
      ];
    });
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rekap-absensi-penetasan-${formatWIBDateKey(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const hasFilters = Boolean(
    query || shiftFilter !== 'all' || statusFilter !== 'all' || fromDate || toDate,
  );

  return (
    <>
    {viewport}
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">Panel admin</p>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
            Rekap absensi piket
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-500">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isSample ? 'bg-gold-100 text-gold-800' : 'bg-forest-100 text-forest-800'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isSample ? 'bg-gold-600' : 'bg-forest-500'}`}
              />
              {SOURCE_LABEL[source] ?? source}
            </span>
            <span className="num font-mono text-xs text-ink-400">{records.length} baris</span>
            {lastLoadedAt && (
              <span className="num font-mono text-xs text-ink-400">
                &middot; dimuat {formatWIBDateTime(lastLoadedAt.toISOString()).time}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddForm((value) => !value)}
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-forest-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-forest-800"
          >
            <Plus className={`h-4 w-4 transition-transform ${showAddForm ? 'rotate-45' : ''}`} />
            Tambah manual
          </button>
          <a
            href={SHEET_URL}
            target="_blank"
            rel="noreferrer"
            className="focus-ring inline-flex items-center gap-2 rounded-full border border-ink-200 bg-surface px-4 py-2.5 text-xs font-semibold text-ink-700 transition-colors hover:border-ink-300"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Buka Sheet
          </a>
          <button
            type="button"
            onClick={exportCsv}
            disabled={ordered.length === 0}
            className="focus-ring inline-flex items-center gap-2 rounded-full border border-ink-200 bg-surface px-4 py-2.5 text-xs font-semibold text-ink-700 transition-colors hover:border-ink-300 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Ekspor CSV
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={isLoading}
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-ink-800 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Muat ulang
          </button>
        </div>
      </div>

      {showAddForm && (
        <ManualForm
          onDone={load}
          onSaved={(message) => push('success', 'Baris manual ditambahkan', message)}
        />
      )}

      {isSample && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-gold-200 bg-gold-100/60 p-4">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold-800" />
          <div className="text-sm text-gold-800">
            <p className="font-semibold">Rekap belum terhubung ke Google Sheets.</p>
            <p className="mt-0.5 leading-relaxed text-gold-800/80">
              Yang tampil saat ini adalah data contoh. Sambungkan endpoint GAS agar rekap sinkron.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-clay-100 bg-clay-100/60 p-4">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-clay-600" />
          <div className="text-sm text-clay-600">
            <p className="font-semibold">Gagal memuat rekap</p>
            <p className="mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total absensi" value={String(stats.total)} icon={<Users className="h-4 w-4" />} />
        <StatCard
          label="Nama unik"
          value={String(stats.unique)}
          hint={stats.manual > 0 ? `${stats.manual} baris manual` : undefined}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Foto terlampir"
          value={String(stats.photos)}
          hint={`${Math.round((stats.photos / Math.max(stats.total, 1)) * 100)}% dari total`}
          icon={<Download className="h-4 w-4" />}
        />
        <StatCard
          label="Ketepatan waktu"
          value={`${punctuality}%`}
            hint={`${stats.onTime} tepat · ${stats.late} terlambat`}
          icon={<CalendarDays className="h-4 w-4" />}
        />
      </div>

      <div className="card mt-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="label-caps">Distribusi per shift</p>
          <p className="num font-mono text-xs text-ink-400">teramai {stats.topShift.shift}</p>
        </div>
        <div className="mt-4 space-y-2.5">
          {SHIFT_CONFIGS.map((config) => {
            const count = stats.perShift[config.shift] ?? 0;
            const width = (count / maxShiftCount) * 100;
            return (
              <div key={config.shift} className="flex items-center gap-3">
                <span className="num w-12 shrink-0 font-mono text-xs text-ink-500">{config.shift}</span>
                <span className="hidden w-28 shrink-0 text-xs text-ink-400 sm:block">{config.name}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-forest-600 transition-[width] duration-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="num w-8 shrink-0 text-right font-mono text-xs text-ink-500">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card mt-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="label-caps">Dari tanggal</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
              className="field mt-1.5"
            />
          </label>
          <label className="block">
            <span className="label-caps">Sampai tanggal</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
              className="field mt-1.5"
            />
          </label>
          <label className="block">
            <span className="label-caps">Shift</span>
            <select
              value={shiftFilter}
              onChange={(event) => {
                setShiftFilter(event.target.value as PiketShift | 'all');
                setPage(1);
              }}
              className="field mt-1.5"
            >
              <option value="all">Semua shift</option>
              {SHIFT_CONFIGS.map((config) => (
                <option key={config.shift} value={config.shift}>
                  {config.shift} - {config.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label-caps">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as typeof statusFilter);
                setPage(1);
              }}
              className="field mt-1.5"
            >
              <option value="all">Semua status</option>
              <option value="Tepat Waktu">Tepat waktu</option>
              <option value="Terlambat">Terlambat</option>
            </select>
          </label>
          <label className="block">
            <span className="label-caps">Cari nama / NIM</span>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Nama atau NIM"
                className="field pl-9"
              />
            </div>
          </label>
        </div>

        {hasFilters && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3">
            <p className="num text-xs text-ink-400">
              {ordered.length} dari {records.length} baris
              {fromDate || toDate
                ? ` \u00b7 ${formatShortWIBDate(fromDate)} \u2013 ${formatShortWIBDate(toDate)}`
                : ''}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-[11px] font-semibold text-ink-600 transition-colors hover:border-ink-300"
            >
              <X className="h-3.5 w-3.5" />
              Reset filter
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-ink-100 bg-surface shadow-[0_1px_2px_rgba(7,26,46,0.04),0_12px_32px_-18px_rgba(7,26,46,0.28)]">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-ink-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat rekap...
          </div>
        ) : pageItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
              <SearchX className="h-5 w-5" />
            </span>
            <p className="font-display mt-4 text-base font-bold text-ink-900">
              {hasFilters ? 'Tidak ada baris yang cocok' : 'Belum ada data absensi'}
            </p>
            <p className="mt-1 max-w-sm text-sm text-ink-400">
              {hasFilters
                ? 'Coba longgarkan filter atau reset untuk melihat semua baris.'
                : 'Absensi yang dikirim petugas piket akan muncul di sini.'}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="focus-ring mt-4 inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 transition-colors hover:border-ink-300"
              >
                <X className="h-3.5 w-3.5" />
                Reset filter
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-surface-sunk text-[11px] uppercase tracking-[0.12em] text-ink-400">
                    <th className="px-4 py-3 font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort('timestamp')}
                        className="focus-ring inline-flex items-center gap-1 rounded"
                      >
                        Waktu
                        {sortKey === 'timestamp' &&
                          (ascending ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort('name')}
                        className="focus-ring inline-flex items-center gap-1 rounded"
                      >
                        Nama
                        {sortKey === 'name' &&
                          (ascending ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold">Shift</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Foto</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((record) => {
                    const { date, time } = formatWIBDateTime(record.timestamp);
                    return (
                      <tr key={record.id} className="border-b border-ink-100/70 transition-colors last:border-0 hover:bg-surface-sunk">
                        <td className="px-4 py-3 align-top">
                          <p className="num font-mono text-xs text-ink-800">{time}</p>
                          <p className="mt-0.5 text-[11px] text-ink-400">{date}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="font-medium text-ink-900">{record.studentName}</p>
                          <p className="num mt-0.5 font-mono text-xs text-ink-500">
                            {record.nim || 'tanpa NIM'}
                          </p>
                          {record.location && (
                            <p className="mt-0.5 text-[11px] text-ink-400">{record.location}</p>
                          )}
                          {record.description && (
                            <p className="mt-0.5 max-w-[16rem] truncate text-[11px] text-ink-400">
                              {record.description}
                            </p>
                          )}
                          {record.manual && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-bold text-gold-800">
                              <UserPlus className="h-3 w-3" />
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="num font-mono text-xs text-ink-700">{record.shift}</span>
                          <p className="mt-0.5 text-[11px] text-ink-400">{record.location || '-'}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          {record.photoUrl && record.photoUrl.startsWith('http') ? (
                            <a
                              href={record.photoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[11px] font-semibold text-ink-700 transition-colors hover:border-forest-400 hover:text-forest-700"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Lihat
                            </a>
                          ) : record.photoName || record.photoUrl ? (
                            <span
                              className="inline-flex max-w-[11rem] items-center gap-1.5 text-[11px] text-ink-600"
                              title={record.photoName || record.photoUrl}
                            >
                              <ImageOff className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                              <span className="truncate font-mono">{record.photoName || record.photoUrl}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-300">
                              <ImageOff className="h-3.5 w-3.5" />
                              Tidak ada
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-ink-100 md:hidden">
              {pageItems.map((record) => {
                const { date, time } = formatWIBDateTime(record.timestamp);
                return (
                  <li key={record.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink-900">{record.studentName}</p>
                        <p className="num mt-0.5 font-mono text-xs text-ink-500">
                          {record.nim || 'tanpa NIM'}
                        </p>
                        <p className="num mt-0.5 font-mono text-xs text-ink-500">
                          {time} &middot; {date}
                        </p>
                      </div>
                      <StatusBadge status={record.status} />
                    </div>
                    {record.description && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-ink-500">{record.description}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="num flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-xs text-ink-600">
                        <span className="truncate">
                          Shift {record.shift}
                          <span className="ml-1 font-sans text-[11px] text-ink-400">
                            {SHIFT_CONFIGS.find((config) => config.shift === record.shift)?.name ?? ''}
                          </span>
                        </span>
                        {record.manual && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-bold text-gold-800">
                            <UserPlus className="h-3 w-3" />
                            Manual
                          </span>
                        )}
                      </span>
                      {record.photoUrl ? (
                        <a
                          href={record.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[11px] font-semibold text-ink-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Foto
                        </a>
                      ) : record.photoName ? (
                        <span
                          className="inline-flex min-w-0 max-w-[10rem] items-center gap-1.5 text-[11px] text-ink-500"
                          title={record.photoName}
                        >
                          <ImageOff className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                          <span className="truncate font-mono">{record.photoName}</span>
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-ink-300">
                          <ImageOff className="h-3.5 w-3.5" />
                          Tanpa foto
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {pageItems.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="num text-xs text-ink-400">
            Menampilkan {(currentPage - 1) * PAGE_SIZE + 1}&ndash;
            {Math.min(currentPage * PAGE_SIZE, ordered.length)} dari {ordered.length} baris
          </p>
          <div className="flex items-center gap-2">
            <span className="num mr-1 font-mono text-xs text-ink-400">
              {currentPage} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-surface text-ink-600 transition-colors hover:border-ink-300 disabled:opacity-40"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              disabled={currentPage === pageCount}
              className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-surface text-ink-600 transition-colors hover:border-ink-300 disabled:opacity-40"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {!isLoading && records.length > 0 && (
        <p className="mt-6 text-center text-[11px] text-ink-400">
          Rekap untuk {formatLongWIBDate(new Date())} &middot; seluruh data tersimpan di Google Sheets
        </p>
      )}
    </div>
    </>
  );
}

function ManualForm({
  onDone,
  onSaved,
}: {
  onDone: () => Promise<void>;
  onSaved?: (message: string) => void;
}) {
  const [nama, setNama] = useState('');
  const [nim, setNim] = useState('');
  const [lokasi] = useState<string>(LOKASI_OPTIONS[0]);
  const [deskripsi, setDeskripsi] = useState('');
  const [shift, setShift] = useState<PiketShift>(SHIFT_CONFIGS[0].shift);
  const [status, setStatus] = useState<AttendanceStatus>('Tepat Waktu');
  const [fotoBase64, setFotoBase64] = useState('');
  const [fotoName, setFotoName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setIsProcessing(true);
    try {
      const compressed = await compressImage(file, new Date());
      setFotoBase64(compressed.base64);
      setFotoName(compressed.capturedAt);
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Gagal memproses foto.' });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (nama.trim().length < 3) {
      setMessage({ tone: 'error', text: 'Nama minimal 3 karakter.' });
      return;
    }
    if (nim.trim().length < 3) {
      setMessage({ tone: 'error', text: 'NIM minimal 3 karakter (boleh huruf).' });
      return;
    }
    if (!lokasi) {
      setMessage({ tone: 'error', text: 'Pilih lokasi piket.' });
      return;
    }
    if (deskripsi.trim().length < 3) {
      setMessage({ tone: 'error', text: 'Deskripsi minimal 3 karakter.' });
      return;
    }

    setIsSaving(true);
    const result = await addManualRecord({
      nama: nama.trim(),
      nim: nim.trim(),
      lokasi,
      deskripsi: deskripsi.trim(),
      shift,
      status,
      foto: fotoBase64 || undefined,
    });
    setIsSaving(false);

    if (result.ok) {
      setMessage({ tone: 'success', text: result.message });
      onSaved?.(result.message);
      setNama('');
      setNim('');
      setDeskripsi('');
      setStatus('Tepat Waktu');
      setFotoBase64('');
      setFotoName('');
      await onDone();
    } else {
      setMessage({ tone: 'error', text: result.message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-6 p-5 sm:p-6" noValidate>
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-forest-100 text-forest-700">
          <UserPlus className="h-4 w-4" />
        </span>
        <div>
          <p className="font-display text-sm font-bold text-ink-900">Tambah absensi manual</p>
          <p className="text-xs text-ink-400">
            Petugas tidak mengisi sendiri — ditandai <span className="font-semibold">Manual</span> di
            Sheet. Foto opsional.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="label-caps">Nama</span>
          <input
            type="text"
            value={nama}
            onChange={(event) => setNama(event.target.value)}
            placeholder="Nama lengkap"
            className="field mt-1.5"
            required
          />
        </label>
        <label className="block">
          <span className="label-caps">NIM</span>
          <input
            type="text"
            value={nim}
            onChange={(event) => setNim(event.target.value)}
            placeholder="Contoh: J0409241062"
            className="num field mt-1.5 font-mono"
            required
          />
        </label>
        <label className="block">
          <span className="label-caps">Lokasi</span>
          <div className="field mt-1.5 flex items-center gap-2 text-ink-800">
            <MapPin className="h-4 w-4 shrink-0 text-forest-600" />
            <span className="font-semibold">{LOKASI_OPTIONS[0]}</span>
          </div>
        </label>
        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="label-caps">Deskripsi piket</span>
          <input
            type="text"
            value={deskripsi}
            onChange={(event) => setDeskripsi(event.target.value)}
            placeholder="Contoh: Supervisi piket staff kandang"
            className="field mt-1.5"
            required
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <span className="label-caps mr-1">Foto (opsional)</span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isProcessing}
          className="focus-ring inline-flex items-center gap-2 rounded-full border border-ink-200 px-3.5 py-2 text-xs font-semibold text-ink-700 transition-colors hover:border-ink-300 disabled:opacity-50"
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {isProcessing ? 'Memproses...' : 'Unggah foto'}
        </button>
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={isProcessing}
          className="focus-ring inline-flex items-center gap-2 rounded-full border border-ink-200 px-3.5 py-2 text-xs font-semibold text-ink-700 transition-colors hover:border-ink-300 disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
          Ambil foto
        </button>
        {fotoName && (
          <span className="num inline-flex items-center gap-1.5 rounded-full bg-forest-100 px-2.5 py-1 font-mono text-[11px] text-forest-800">
            Foto siap · {fotoName}
            <button
              type="button"
              onClick={() => {
                setFotoBase64('');
                setFotoName('');
              }}
              className="focus-ring rounded p-0.5 hover:bg-forest-200"
              aria-label="Hapus foto"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <input
          ref={cameraRef}
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label-caps">Shift</span>
          <select
            value={shift}
            onChange={(event) => setShift(event.target.value as PiketShift)}
            className="field mt-1.5"
          >
            {SHIFT_CONFIGS.map((config) => (
              <option key={config.shift} value={config.shift}>
                {config.shift} - {config.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label-caps">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as AttendanceStatus)}
            className="field mt-1.5"
          >
            <option value="Tepat Waktu">Tepat waktu</option>
            <option value="Terlambat">Terlambat</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {message ? (
          <p
            className={`text-xs font-medium ${
              message.tone === 'success' ? 'text-forest-700' : 'text-clay-600'
            }`}
          >
            {message.text}
          </p>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="focus-ring inline-flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-ink-800 disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Simpan baris manual
        </button>
      </div>
    </form>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="label-caps">{label}</p>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-forest-100 text-forest-700">
          {icon}
        </span>
      </div>
      <p className="num font-display mt-3 text-3xl font-extrabold tracking-tight text-ink-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: AttendanceRecord['status'] }) {
  const late = status === 'Terlambat';
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        late ? 'bg-clay-100 text-clay-600' : 'bg-forest-100 text-forest-800'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${late ? 'bg-clay-500' : 'bg-forest-500'}`} />
      {status}
    </span>
  );
}

import type { AttendanceStatus, PiketShift, ShiftInfo } from '@/types/attendance';

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

export const TIMEZONE = 'Asia/Jakarta';

/**
 * Enam shift piket fasilitas penetasan beserta rentang pengisian form.
 * Form dibuka 5 menit sebelum jam shift dan ditutup 10 menit setelah dibuka.
 */
export const SHIFT_CONFIGS: ShiftInfo[] = [
  {
    shift: '06.00',
    name: 'Piket Fajar',
    startMinutes: h(6, 0),
    windowOpenMinutes: h(5, 55),
    windowCloseMinutes: h(6, 5),
    windowLabel: '05.55 - 06.05 WIB',
    durationLabel: '3 jam',
    description: 'Cek kondisi telur, kelembapan, dan hygrometer.',
    accent: 'dawn',
  },
  {
    shift: '09.00',
    name: 'Piket Pagi',
    startMinutes: h(9, 0),
    windowOpenMinutes: h(8, 55),
    windowCloseMinutes: h(9, 5),
    windowLabel: '08.55 - 09.05 WIB',
    durationLabel: '3 jam',
    description: 'Pengerasan telur, penyusunan rak, dan pencatatan telur.',
    accent: 'morning',
  },
  {
    shift: '12.00',
    name: 'Piket Siang',
    startMinutes: h(12, 0),
    windowOpenMinutes: h(11, 55),
    windowCloseMinutes: h(12, 5),
    windowLabel: '11.55 - 12.05 WIB',
    durationLabel: '3 jam',
    description: 'Pemindahan telur, pembersihan rak, dan cek brooding.',
    accent: 'midday',
  },
  {
    shift: '15.00',
    name: 'Piket Sore',
    startMinutes: h(15, 0),
    windowOpenMinutes: h(14, 55),
    windowCloseMinutes: h(15, 5),
    windowLabel: '14.55 - 15.05 WIB',
    durationLabel: '3 jam',
    description: 'Pencatatan DOC, sterilisasi, dan pengaturan brooding.',
    accent: 'afternoon',
  },
  {
    shift: '18.00',
    name: 'Piket Sore-Malam',
    startMinutes: h(18, 0),
    windowOpenMinutes: h(17, 55),
    windowCloseMinutes: h(18, 5),
    windowLabel: '17.55 - 18.05 WIB',
    durationLabel: '3 jam',
    description: 'Penutupan rak, pengecekan kualitas, dan laporan harian.',
    accent: 'dusk',
  },
  {
    shift: '21.00',
    name: 'Piket Malam',
    startMinutes: h(21, 0),
    windowOpenMinutes: h(20, 55),
    windowCloseMinutes: h(21, 5),
    windowLabel: '20.55 - 21.05 WIB',
    durationLabel: '3 jam',
    description: 'Kontrol suhu ruang penetasan serta pengawasan pada malam hari.',
    accent: 'night',
  },
];

export const SHIFT_VALUES: PiketShift[] = SHIFT_CONFIGS.map((s) => s.shift);

export function getShiftConfig(shift: PiketShift): ShiftInfo {
  return SHIFT_CONFIGS.find((s) => s.shift === shift) ?? SHIFT_CONFIGS[0];
}

/** Parts waktu WIB dari sebuah Date. */
export function getWIBTimeParts(date: Date): { hours: number; minutes: number; seconds: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(date);

    const pick = (type: Intl.DateTimeFormatPartTypes) =>
      parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

    return { hours: pick('hour'), minutes: pick('minute'), seconds: pick('second') };
  } catch {
    return { hours: date.getHours(), minutes: date.getMinutes(), seconds: date.getSeconds() };
  }
}

/** Total menit sejak tengah malam WIB. */
export function getWIBMinutes(date: Date): number {
  const { hours, minutes } = getWIBTimeParts(date);
  return hours * 60 + minutes;
}

export function formatMinutes(minutes: number): string {
  const hh = Math.floor(minutes / 60) % 24;
  const mm = minutes % 60;
  return `${String(hh).padStart(2, '0')}.${String(mm).padStart(2, '0')}`;
}

/**
 * Status ketersediaan satu shift pada waktu tertentu.
 * - Terkunci   : di luar rentang pengisian
 * - Terbuka    : masih sebelum jam mulai shift
 * - Tepat Waktu: sudah masuk, belum lewat batas akhir
 * - Terlambat  : lewat batas akhir pengisian
 */
export function getShiftAvailability(shift: PiketShift, now: Date) {
  const config = getShiftConfig(shift);
  const current = getWIBMinutes(now);

  if (current < config.windowOpenMinutes) {
    return {
      shift: config.shift,
      isOpen: false,
      state: 'locked' as const,
      statusLabel: 'Terkunci',
      reason: `Form shift ${config.shift} dibuka pukul ${formatMinutes(config.windowOpenMinutes)} WIB.`,
      minutesUntilOpen: config.windowOpenMinutes - current,
    };
  }

  if (current > config.windowCloseMinutes) {
    return {
      shift: config.shift,
      isOpen: false,
      state: 'locked' as const,
      statusLabel: 'Terkunci',
      reason: `Form shift ${config.shift} ditutup pukul ${formatMinutes(config.windowCloseMinutes)} WIB.`,
      minutesUntilOpen: 0,
    };
  }

  if (current < config.startMinutes) {
    return {
      shift: config.shift,
      isOpen: true,
      state: 'open' as const,
      statusLabel: 'Terbuka',
      reason: `Form sudah dibuka. Shift ${config.shift} dimulai pukul ${formatMinutes(config.startMinutes)} WIB.`,
      minutesUntilOpen: 0,
    };
  }

  const tolerance = config.startMinutes + 15;
  if (current <= tolerance) {
    return {
      shift: config.shift,
      isOpen: true,
      state: 'on-time' as const,
      statusLabel: 'Tepat Waktu',
      reason: `Tepat waktu. Batas pengisian shift ${config.shift} pukul ${formatMinutes(config.windowCloseMinutes)} WIB.`,
      minutesUntilOpen: 0,
    };
  }

  return {
    shift: config.shift,
    isOpen: true,
    state: 'late' as const,
    statusLabel: 'Terlambat',
    reason: `Terlambat. Batas pengisian shift ${config.shift} pukul ${formatMinutes(config.windowCloseMinutes)} WIB.`,
    minutesUntilOpen: 0,
  };
}

/** Semua status shift pada waktu tertentu (untuk kartu timeline). */
export function getAllShiftAvailabilities(now: Date) {
  return SHIFT_CONFIGS.map((config) => ({
    config,
    availability: getShiftAvailability(config.shift, now),
  }));
}

/** Shift yang sedang terbuka (bila ada). */
export function getActiveShift(now: Date): ShiftInfo | null {
  const found = SHIFT_CONFIGS.find((s) => getShiftAvailability(s.shift, now).isOpen);
  return found ?? null;
}

/** Shift berikutnya yang akan dibuka. */
export function getNextShift(now: Date): { config: ShiftInfo; minutesUntil: number } | null {
  const current = getWIBMinutes(now);
  const upcoming = SHIFT_CONFIGS.find((s) => s.windowOpenMinutes > current);
  if (upcoming) {
    return { config: upcoming, minutesUntil: upcoming.windowOpenMinutes - current };
  }
  const tomorrow = SHIFT_CONFIGS[0];
  const minutesUntilToday = 24 * 60 - current + tomorrow.windowOpenMinutes;
  return { config: tomorrow, minutesUntil: minutesUntilToday };
}

export function calculateAttendanceStatus(shift: PiketShift, now: Date): AttendanceStatus {
  const config = getShiftConfig(shift);
  const current = getWIBMinutes(now);
  return current <= config.startMinutes + 15 ? 'Tepat Waktu' : 'Terlambat';
}

export function formatIndonesianDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: TIMEZONE,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

export function formatWIBTime(date: Date): string {
  const { hours, minutes, seconds } = getWIBTimeParts(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)} WIB`;
}

/** Tanggal format YYYY-MM-DD berdasarkan zona WIB. */
export function formatWIBDateKey(date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const pick = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? '00';
    return `${pick('year')}-${pick('month')}-${pick('day')}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatWIBDateTime(iso: string): { date: string; time: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { date: '-', time: '-' };
  }
  try {
    const datePart = new Intl.DateTimeFormat('id-ID', {
      timeZone: TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
    const timePart = new Intl.DateTimeFormat('id-ID', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .format(date)
      .replace(/\./g, ':');
    return { date: datePart, time: `${timePart} WIB` };
  } catch {
    return { date: '-', time: '-' };
  }
}

/** Selisih menit dari timestamp ISO ke waktu sekarang. */
export function minutesSince(iso: string, now: Date = new Date()): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.round((now.getTime() - then) / 60000));
}

export function formatCountdown(minutes: number): string {
  if (minutes <= 0) return '0 menit';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} menit`;
  return `${hours} jam ${mins} menit`;
}

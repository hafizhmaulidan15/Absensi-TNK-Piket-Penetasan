export type PiketShift = '06.00' | '09.00' | '12.00' | '15.00' | '18.00' | '21.00';

export type ShiftState = 'locked' | 'open' | 'on-time' | 'late';

export type AttendanceStatus = 'Tepat Waktu' | 'Terlambat';

/** Lokasi piket yang bisa dipilih. */
export const LOKASI_OPTIONS = ['Penetasan'] as const;

export type PiketLokasi = (typeof LOKASI_OPTIONS)[number];

export interface ShiftInfo {
  shift: PiketShift;
  name: string;
  /** Jam mulai shift (WIB). */
  startMinutes: number;
  /** Rentang pengisian form (WIB) - sebelum mulai shift. */
  windowOpenMinutes: number;
  /** Batas akhir pengisian (WIB). */
  windowCloseMinutes: number;
  /** Label window, contoh "05.30 - 07.00 WIB". */
  windowLabel: string;
  /** Durasi shift, contoh "3 jam". */
  durationLabel: string;
  description: string;
  accent: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night';
}

export interface ShiftAvailability {
  shift: PiketShift;
  isOpen: boolean;
  state: ShiftState;
  statusLabel: string;
  /** Penjelasan singkat yang tampil di UI. */
  reason: string;
  /** Menit menuju jendela berikutnya bila shift terkunci. */
  minutesUntilOpen: number;
}

export interface AttendanceRecord {
  id: string;
  /** ISO timestamp WIB. */
  timestamp: string;
  studentName: string;
  /** NIM / nomor induk, boleh berisi huruf. */
  nim: string;
  shift: PiketShift;
  /** Lokasi piket. */
  location: string;
  /** Deskripsi kegiatan piket. */
  description: string;
  photoUrl: string;
  photoName?: string;
  status: AttendanceStatus;
  /** True bila baris ditambahkan manual oleh admin (bukan absensi mandiri). */
  manual: boolean;
}

export interface AttendanceSummary {
  total: number;
  uniqueStudents: number;
  photoCount: number;
  perShift: Record<PiketShift, number>;
}

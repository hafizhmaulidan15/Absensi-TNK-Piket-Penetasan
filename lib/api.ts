import type { AttendanceRecord, AttendanceStatus, PiketShift } from '@/types/attendance';
import { calculateAttendanceStatus, formatWIBDateKey } from '@/lib/shifts';

const GAS_ENDPOINT = (process.env.NEXT_PUBLIC_GAS_ENDPOINT ?? '').trim();
const STORAGE_KEY = 'penetasan.absensi.local.v1';

export interface SubmitPayload {
  nama: string;
  nim: string;
  lokasi: string;
  deskripsi: string;
  waktu: string;
  shift: PiketShift;
  foto: string;
  status: 'Tepat Waktu' | 'Terlambat';
}

export interface ManualPayload {
  nama: string;
  nim: string;
  lokasi: string;
  deskripsi: string;
  shift: PiketShift;
  status: 'Tepat Waktu' | 'Terlambat';
  waktu?: string;
  /** Foto opsional (base64). Boleh diunggah atau difoto. */
  foto?: string;
}

export interface SubmitResult {
  ok: boolean;
  message: string;
  photoUrl?: string;
  /** True bila data disimpan lokal karena endpoint GAS belum dikonfigurasi. */
  offline: boolean;
}

export function isGasConfigured(): boolean {
  return GAS_ENDPOINT.length > 0;
}

export function getGasEndpoint(): string {
  return GAS_ENDPOINT;
}

function readLocalRecords(): AttendanceRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Partial<AttendanceRecord>[]).map(normalizeRecord);
  } catch {
    return [];
  }
}

function writeLocalRecords(records: AttendanceRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* penyimpanan penuh / diblokir - abaikan */
  }
}

export function saveLocalRecord(record: AttendanceRecord) {
  const records = readLocalRecords();
  records.unshift(record);
  writeLocalRecords(records.slice(0, 500));
}

/** Kirim absensi ke Google Apps Script. Bila endpoint belum di-set, simpan lokal. */
export async function submitAttendance(payload: SubmitPayload): Promise<SubmitResult> {
  if (!isGasConfigured()) {
    const record: AttendanceRecord = {
      id: `local-${Date.now()}`,
      timestamp: payload.waktu,
      studentName: payload.nama,
      nim: payload.nim,
      shift: payload.shift,
      location: payload.lokasi,
      description: payload.deskripsi,
      photoUrl: `data:image/jpeg;base64,${payload.foto}`,
      status: payload.status,
      manual: false,
    };
    saveLocalRecord(record);
    return {
      ok: true,
      offline: true,
      message: 'Tersimpan di perangkat (mode demo). Sambungkan endpoint GAS untuk menyimpan ke Sheet.',
    };
  }

  try {
    // Catatan CORS: Apps Script (script.google.com) tidak mengirim header CORS
    // untuk application/json, dan preflight OPTIONS diblokir. Mengirim sebagai
    // "text/plain" membuat ini simple request (tanpa preflight) sehingga
    // browser mengizinkan POST lintas origin. Server tetap JSON.parse isinya.
    const response = await fetch(GAS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const text = await response.text();
    let parsed: { ok?: boolean; message?: string; photoUrl?: string } | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        offline: false,
        message: parsed?.message || `Server menolak permintaan (${response.status}).`,
      };
    }

    if (parsed && parsed.ok === false) {
      return { ok: false, offline: false, message: parsed.message || 'Absensi ditolak server.' };
    }

    // Beberapa deployment GAS mengembalikan 200 dengan body HTML/opaque (tanpa
    // JSON). Bila tidak bisa diparse, perlakukan sebagai sukses bila status 200,
    // karena baris biasanya tetap tertulis di Sheet.
    if (!parsed && text.trim().length === 0) {
      return { ok: true, offline: false, message: 'Absensi berhasil dikirim.' };
    }

    return {
      ok: true,
      offline: false,
      message: parsed?.message || 'Absensi berhasil dikirim.',
      photoUrl: parsed?.photoUrl,
    };
  } catch {
    return {
      ok: false,
      offline: false,
      message: 'Gagal menghubungi server. Periksa koneksi internet lalu coba lagi.',
    };
  }
}

/** Tambah baris manual dari panel admin (ditandai "Manual" di Sheet). */
export async function addManualRecord(payload: ManualPayload): Promise<SubmitResult> {
  const waktu = payload.waktu || new Date().toISOString();

  if (!isGasConfigured()) {
    const record: AttendanceRecord = {
      id: `local-${Date.now()}`,
      timestamp: waktu,
      studentName: payload.nama,
      nim: payload.nim,
      shift: payload.shift,
      location: payload.lokasi,
      description: payload.deskripsi,
      photoUrl: payload.foto ? `data:image/jpeg;base64,${payload.foto}` : '',
      status: payload.status,
      manual: true,
    };
    saveLocalRecord(record);
    return { ok: true, offline: true, message: 'Baris manual tersimpan di perangkat (mode demo).' };
  }

  try {
    const response = await fetch(GAS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'add',
        nama: payload.nama,
        nim: payload.nim,
        lokasi: payload.lokasi,
        deskripsi: payload.deskripsi,
        shift: payload.shift,
        status: payload.status,
        waktu,
        foto: payload.foto || '',
      }),
      redirect: 'follow',
    });

    const text = await response.text();
    let parsed: { ok?: boolean; message?: string } | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    if (!response.ok || (parsed && parsed.ok === false)) {
      return {
        ok: false,
        offline: false,
        message: parsed?.message || `Server menolak permintaan (${response.status}).`,
      };
    }

    return { ok: true, offline: false, message: parsed?.message || 'Baris manual ditambahkan.' };
  } catch {
    return {
      ok: false,
      offline: false,
      message: 'Gagal menghubungi server. Periksa koneksi internet lalu coba lagi.',
    };
  }
}

/** Normalkan record dari GAS: field baru (nim/manual) mungkin belum ada di versi lama. */
function normalizeRecord(record: Partial<AttendanceRecord>): AttendanceRecord {
  const rawPhoto = String(record.photoName || record.photoUrl || '').trim();
  const isLink = /^(https?:\/\/|data:image\/)/i.test(rawPhoto);
  const isFile = rawPhoto.length > 0 && !isLink && rawPhoto !== 'MANUAL_';
  return {
    id: String(record.id ?? ''),
    timestamp: String(record.timestamp ?? ''),
    studentName: String(record.studentName ?? ''),
    nim: String(record.nim ?? ''),
    shift: (record.shift ?? '06.00') as PiketShift,
    location: String(record.location ?? ''),
    description: String(record.description ?? ''),
    photoUrl: isLink ? rawPhoto : '',
    photoName: isFile ? rawPhoto : '',
    status: (record.status ?? 'Tepat Waktu') as AttendanceStatus,
    manual: record.manual === true,
  };
}

/** Ambil rekap absensi dari GAS. Bila tidak tersedia, gunakan data lokal. */
export async function fetchAttendanceRecords(): Promise<{
  records: AttendanceRecord[];
  source: 'gas' | 'local' | 'sample';
}> {
  if (!isGasConfigured()) {
    const local = readLocalRecords();
    return { records: local, source: local.length ? 'local' : 'sample' };
  }

  try {
    const response = await fetch(`${GAS_ENDPOINT}?action=list`, { cache: 'no-store' });
    if (!response.ok) throw new Error('gagal');
    const data = (await response.json()) as { records?: Partial<AttendanceRecord>[] };
    const records = Array.isArray(data.records)
      ? data.records.map(normalizeRecord)
      : [];
    // Sheet kosong = tampil kosong (bukan data contoh) supaya sinkron dengan aslinya.
    return { records, source: 'gas' };
  } catch {
    const local = readLocalRecords();
    return { records: local, source: local.length ? 'local' : 'sample' };
  }
}

const SAMPLE_NAMES = [
  'Rizky Amanullah',
  'Dewi Anggraini',
  'Bagas Prakoso',
  'Nabila Zahra',
  'Fajar Nugroho',
  'Salsabila Putri',
  'Reza Maulana',
  'Anindya Kusuma',
];

/** Data contoh untuk mengisi rekap saat backend belum terhubung. */
export function getSampleRecords(): AttendanceRecord[] {
  const now = new Date();
  const records: AttendanceRecord[] = [];
  const shifts: PiketShift[] = ['06.00', '09.00', '12.00', '15.00', '18.00', '21.00'];

  for (let dayOffset = 0; dayOffset < 3; dayOffset += 1) {
    const day = new Date(now.getTime() - dayOffset * 86400000);
    shifts.forEach((shift, index) => {
      if ((index + dayOffset) % 4 === 3) return;
      const name = SAMPLE_NAMES[(index + dayOffset) % SAMPLE_NAMES.length];
      const [hourStr, minuteStr] = shift.split('.');
      const stamp = new Date(day);
      stamp.setHours(Number(hourStr), Number(minuteStr), 0, 0);
      records.push({
        id: `sample-${dayOffset}-${shift}`,
        timestamp: stamp.toISOString(),
        studentName: name,
        nim: '',
        shift,
        location: 'Kandang Puyuh',
        description: 'Supervisi piket staff kandang',
        photoUrl: '',
        status: calculateAttendanceStatus(shift, stamp),
        manual: false,
      });
    });
  }

  return records.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
}

export function isToday(timestamp: string): boolean {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return false;
  return formatWIBDateKey(date) === formatWIBDateKey(new Date());
}

/**
 * Absensi Piket Penetasan (TNK 62) - Google Apps Script
 * Sheet : https://docs.google.com/spreadsheets/d/10XUDc4pgIIThzizmV0G24eUok80KoAo3DEjPBBgeXAQ/edit
 * Kolom : Waktu | Nama | NIM | Jam Piket | Lokasi | Status | Deskripsi piket | File foto gdrive
 *
 * POST { nama, nim, lokasi, deskripsi, waktu, shift, foto, status }
 * POST { action:'add', nama, nim, lokasi, deskripsi, shift, status, waktu?, foto? }
 * GET  ?action=list | ping | diag | clean[&tab=]
 */

const SPREADSHEET_ID = '10XUDc4pgIIThzizmV0G24eUok80KoAo3DEjPBBgeXAQ';
const DRIVE_FOLDER_ID = '1l4iPHD5e7OLChUVu4iMDkXldHLmHREX_';

const ADMIN_TOKEN_DEFAULT = 'tkn62-riswi-2026';

const SHEET_NAME_DEFAULT = 'DataAbsenPenetasan';
const FOLDER_NAME_DEFAULT = 'Dokumentasi Penetasan';
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const HEADER = [
  'Waktu',
  'Nama',
  'NIM',
  'Jam Piket',
  'Lokasi',
  'Status',
  'Deskripsi piket',
  'File foto gdrive',
];

const HEADER_ALIASES = {
  0: ['waktu', 'timestamp', 'tanggal', 'waktu absen'],
  1: ['nama', 'nama mahasiswa', 'nama lengkap'],
  2: ['nim'],
  3: ['jam piket', 'shift', 'waktu piket', 'jam'],
  4: ['lokasi', 'tempat'],
  5: ['status'],
  6: ['deskripsi piket', 'deskripsi', 'catatan', 'keterangan', 'deskripsi kegiatan'],
  7: ['file foto gdrive', 'tautan foto', 'referensi foto', 'file foto', 'foto', 'link foto'],
};

const TAG_MANUAL_NOTE = '[INPUT MANUAL]';
const TAG_MANUAL_FILE = 'MANUAL_';
const TEST_NAME_PATTERN = /(e2e|test|tes\b|uji\b|contoh|sample|diag)/i;

const SHIFTS = ['06.00', '09.00', '12.00', '15.00', '18.00', '21.00'];
const STATUSES = ['Tepat Waktu', 'Terlambat'];

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: props.getProperty('SHEET_ID_62') || SPREADSHEET_ID,
    sheetName: props.getProperty('TAB_62') || SHEET_NAME_DEFAULT,
    folderId: props.getProperty('FOLDER_62') || DRIVE_FOLDER_ID,
  };
}

function jsonOutput(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function adminToken_() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('ADMIN_TOKEN') || ADMIN_TOKEN_DEFAULT;
}

function requireAdmin_(e) {
  const given = (e && e.parameter && e.parameter.token) || '';
  if (given !== adminToken_()) {
    return jsonOutput({ ok: false, message: 'Akses ditolak. Token admin tidak valid.' });
  }
  return null;
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'list';

  if (action === 'list') {
    try {
      return jsonOutput({ ok: true, records: readRecords() });
    } catch (error) {
      return jsonOutput({ ok: false, message: 'Gagal membaca rekap: ' + error.message });
    }
  }
  if (action === 'ping') {
    return jsonOutput({ ok: true, message: 'Absensi Penetasan aktif', time: new Date().toISOString() });
  }
  if (action === 'diag') {
    const denied = requireAdmin_(e);
    if (denied) return denied;
    try {
      return jsonOutput(diagnose_());
    } catch (error) {
      return jsonOutput({ ok: false, message: 'Gagal diagnosa: ' + error.message });
    }
  }
  if (action === 'clean') {
    const denied = requireAdmin_(e);
    if (denied) return denied;
    try {
      return jsonOutput(cleanTestRows_((e && e.parameter && e.parameter.tab) || ''));
    } catch (error) {
      return jsonOutput({ ok: false, message: 'Gagal membersihkan: ' + error.message });
    }
  }
  if (action === 'purge') {
    const denied = requireAdmin_(e);
    if (denied) return denied;
    try {
      return jsonOutput(purgeTestPhotos_());
    } catch (error) {
      return jsonOutput({ ok: false, message: 'Gagal menghapus foto uji: ' + error.message });
    }
  }
  return jsonOutput({ ok: false, message: 'Aksi tidak dikenal: ' + action });
}

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '{}';
    let body;
    try {
      body = JSON.parse(raw);
    } catch (parseError) {
      const parsed = (e && e.parameter) || {};
      body = Object.keys(parsed).length ? parsed : parseQueryString_(raw);
    }

    const action = String(body.action || '').trim();
    const nama = String(body.nama || '').trim();
    const nim = String(body.nim || '').trim();
    const shift = String(body.shift || '').trim();
    const lokasi = String(body.lokasi || '').trim();
    const deskripsi = String(body.deskripsi || '').trim();
    const status = String(body.status || 'Tepat Waktu').trim();
    const waktu = String(body.waktu || new Date().toISOString());
    const foto = String(body.foto || '');

    if (nama.length < 3) return jsonOutput({ ok: false, message: 'Nama minimal 3 karakter.' });
    if (nim.length < 3) return jsonOutput({ ok: false, message: 'NIM minimal 3 karakter.' });
    if (SHIFTS.indexOf(shift) === -1) {
      return jsonOutput({ ok: false, message: 'Shift tidak valid: ' + shift });
    }
    if (!lokasi) return jsonOutput({ ok: false, message: 'Lokasi wajib diisi.' });
    if (!deskripsi) return jsonOutput({ ok: false, message: 'Deskripsi piket wajib diisi.' });
    if (STATUSES.indexOf(status) === -1) {
      return jsonOutput({ ok: false, message: 'Status tidak dikenal: ' + status });
    }

    const sheet = getSheet_();

    if (action === 'add') {
      let photoRef = TAG_MANUAL_FILE;
      if (foto) {
        try {
          photoRef = savePhoto(foto, nama, nim, shift, waktu);
        } catch (photoError) {
          Logger.log('Foto manual gagal disimpan: ' + photoError);
        }
      }
      let manualDate = new Date();
      const parsedManual = new Date(waktu);
      if (!isNaN(parsedManual.getTime())) manualDate = parsedManual;

      sheet.appendRow([
        manualDate,
        nama,
        nim,
        shift,
        lokasi,
        status,
        deskripsi + ' ' + TAG_MANUAL_NOTE,
        photoRef,
      ]);
      SpreadsheetApp.flush();
      return jsonOutput({
        ok: true,
        message: 'Baris manual ' + shift + ' ditambahkan untuk ' + nama + '.',
        photoName: photoRef.indexOf('http') === 0 ? '' : photoRef,
      });
    }

    if (!foto) return jsonOutput({ ok: false, message: 'Foto wajib dilampirkan.' });

    const gate = checkWindow_(shift, waktu);
    if (!gate.ok) {
      return jsonOutput({ ok: false, message: gate.message, code: 'WINDOW_TUTUP' });
    }

    const photoUrl = savePhoto(foto, nama, nim, shift, waktu);
    sheet.appendRow([waktu, nama, nim, shift, lokasi, status, deskripsi, photoUrl]);
    SpreadsheetApp.flush();

    return jsonOutput({
      ok: true,
      message: 'Absensi ' + shift + ' tercatat untuk ' + nama + '.',
      photoName: photoUrl,
    });
  } catch (error) {
    return jsonOutput({ ok: false, message: 'Gagal menyimpan absensi: ' + error.message });
  }
}

function parseQueryString_(str) {
  const out = {};
  String(str || '')
    .split('&')
    .forEach(function (pair) {
      if (!pair) return;
      const idx = pair.indexOf('=');
      const key = idx === -1 ? pair : pair.slice(0, idx);
      const value = idx === -1 ? '' : pair.slice(idx + 1);
      try {
        out[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
      } catch (error) {
        out[key] = value;
      }
    });
  return out;
}

// Tab rekap: pakai tab yang headernya cocok, else tab bernama konfigurasi, else tab pertama.
function getSheet_() {
  const config = getConfig();
  const spreadsheet = config.spreadsheetId
    ? SpreadsheetApp.openById(config.spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) throw new Error('Spreadsheet tidak ditemukan.');

  const sheets = spreadsheet.getSheets();
  let target = null;
  for (let i = 0; i < sheets.length; i += 1) {
    if (resolveColumns_(sheets[i])) {
      target = sheets[i];
      break;
    }
  }
  if (!target) target = spreadsheet.getSheetByName(config.sheetName);
  if (!target) target = sheets.length ? sheets[0] : spreadsheet.insertSheet(config.sheetName);

  migrateSheet_(target);
  target.setFrozenRows(1);
  return target;
}

// Pemetaan kolom kanonik -> kolom fisik, null bila header tidak cocok.
function resolveColumns_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (!lastColumn) return null;

  const header = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (cell) {
    return String(cell).trim().toLowerCase();
  });

  const map = {};
  for (let canonical = 0; canonical < HEADER.length; canonical += 1) {
    const aliases = HEADER_ALIASES[canonical];
    let found = -1;
    for (let i = 0; i < header.length; i += 1) {
      if (aliases.indexOf(header[i]) !== -1) {
        found = i;
        break;
      }
    }
    if (found === -1) return null;
    map[canonical] = found;
  }
  return map;
}

// Susun ulang isi tab ke skema HEADER; data baris lama ikut dipindah.
function migrateSheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const map = resolveColumns_(sheet);

  if (!map) {
    sheet.getRange(1, 1, 1, Math.max(lastColumn, HEADER.length)).clearContent();
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
    return;
  }

  const canonicalOrder =
    lastColumn === HEADER.length && HEADER.every(function (_, index) { return map[index] === index; });
  const headerText = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (cell) {
    return String(cell).trim();
  });
  const headerOk =
    headerText.length === HEADER.length &&
    HEADER.every(function (cell, index) { return headerText[index] === cell; });

  if (canonicalOrder && headerOk) return;

  const rows = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues() : [];
  const rebuilt = rows.map(function (row) {
    const out = new Array(HEADER.length).fill('');
    for (let canonical = 0; canonical < HEADER.length; canonical += 1) {
      const physical = map[canonical];
      if (physical !== undefined && row[physical] !== undefined) out[canonical] = row[physical];
    }
    return out;
  });

  const clearWidth = Math.max(lastColumn, HEADER.length);
  sheet.getRange(1, 1, Math.max(lastRow, 1), clearWidth).clearContent();
  sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
  if (rebuilt.length > 0) sheet.getRange(2, 1, rebuilt.length, HEADER.length).setValues(rebuilt);
  if (clearWidth > HEADER.length) sheet.deleteColumns(HEADER.length + 1, clearWidth - HEADER.length);
}

// Folder Drive tujuan; fallback ke folder milik akun eksekusi bila id tidak bisa diakses.
function getFolder_() {
  const config = getConfig();

  if (config.folderId) {
    try {
      const folder = DriveApp.getFolderById(config.folderId);
      folder.getFiles(1);
      return folder;
    } catch (error) {
      Logger.log('Folder ' + config.folderId + ' tidak bisa diakses, memakai fallback. ' + error);
    }
  }

  const folders = DriveApp.getFoldersByName(FOLDER_NAME_DEFAULT);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(FOLDER_NAME_DEFAULT);
}

function savePhoto(base64, nama, nim, shift, waktu) {
  const clean = base64.indexOf(',') === -1 ? base64 : base64.split(',')[1];
  const blob = Utilities.newBlob(
    Utilities.base64Decode(clean),
    'image/jpeg',
    buildFileName(nama, nim, shift, waktu),
  );

  if (blob.getBytes().length > MAX_FILE_BYTES) throw new Error('Ukuran foto melebihi 5 MB.');

  const file = getFolder_().createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shareError) {
    Logger.log('Gagal setSharing: ' + shareError);
  }
  return file.getName();
}

function buildFileName(nama, nim, shift, waktu) {
  const slug = function (value) {
    return String(value).trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  };
  const namePart = [slug(nama) || 'tanpa-nama', slug(nim)].filter(Boolean).join('-');
  const date = new Date(waktu);
  const pad = function (n) { return n < 10 ? '0' + n : String(n); };
  const stamp =
    date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate()) +
    '-' + pad(date.getHours()) + pad(date.getMinutes());
  return 'absen-' + namePart + '-' + shift + '-' + stamp + '.jpg';
}

function readRecords() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, HEADER.length).getValues();
  const records = [];

  for (let i = 0; i < values.length; i += 1) {
    const row = values[i];
    const waktu = row[0];
    const nama = row[1];
    if (!nama) continue;

    const deskripsi = String(row[6] || '');
    const fileRef = String(row[7] || '');
    const isManual =
      deskripsi.toLowerCase().indexOf(TAG_MANUAL_NOTE.toLowerCase()) !== -1 ||
      fileRef.indexOf(TAG_MANUAL_FILE) === 0;

    records.push({
      id: 'row-' + (i + 2),
      timestamp: waktu instanceof Date ? waktu.toISOString() : String(waktu),
      studentName: String(nama),
      nim: String(row[2] || ''),
      shift: String(row[3] || ''),
      location: String(row[4] || ''),
      status: String(row[5] || '').trim() || shiftStatus(String(row[3] || ''), waktu),
      description: deskripsi.replace(TAG_MANUAL_NOTE, '').trim(),
      photoUrl: String(fileRef || ''),
    photoName: String(fileRef || '').indexOf('http') === 0 ? '' : String(fileRef || ''),
      manual: isManual,
    });
  }

  records.sort(function (a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  return records;
}

function shiftStatus(shift, waktu) {
  if (SHIFTS.indexOf(shift) === -1) return 'Tepat Waktu';
  const parts = String(shift).split('.');
  const startMinutes = Number(parts[0]) * 60 + Number(parts[1]);
  const currentMinutes = wibMinutes_(waktu);
  if (currentMinutes === null) return 'Tepat Waktu';
  return currentMinutes <= startMinutes + 15 ? 'Tepat Waktu' : 'Terlambat';
}

// Jendela pengisian: buka 5 menit sebelum jam shift, tutup 10 menit setelah dibuka.
const WINDOW_OPEN_BEFORE_MINUTES = 5;
const WINDOW_LENGTH_MINUTES = 10;

function wibMinutes_(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return null;
  const parts = Utilities.formatDate(date, 'Asia/Jakarta', 'HH:mm').split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}

// Absensi mandiri hanya sah di dalam jendela shift.
function checkWindow_(shift, waktu) {
  const parts = String(shift).split('.');
  const startMinutes = Number(parts[0]) * 60 + Number(parts[1]);
  const openMinutes = startMinutes - WINDOW_OPEN_BEFORE_MINUTES;
  const closeMinutes = openMinutes + WINDOW_LENGTH_MINUTES;
  const current = wibMinutes_(waktu);
  if (current === null) return { ok: true };

  const stamp = formatMinutes_(closeMinutes);
  if (current < openMinutes) {
    return {
      ok: false,
      message: 'Form shift ' + shift + ' dibuka pukul ' + formatMinutes_(openMinutes) + ' WIB.',
    };
  }
  if (current > closeMinutes) {
    return {
      ok: false,
      message:
        'Form shift ' + shift + ' sudah ditutup pukul ' + stamp +
        ' WIB. Hubungi Kak Riswi untuk konfirmasi kehadiran, absen dicatat manual oleh Kak Riswi.',
    };
  }
  return { ok: true };
}

function formatMinutes_(minutes) {
  const hh = Math.floor(minutes / 60) % 24;
  const mm = minutes % 60;
  return (hh < 10 ? '0' : '') + hh + '.' + (mm < 10 ? '0' : '') + mm;
}

function findNameColumn_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (!lastColumn) return null;
  const header = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (cell) {
    return String(cell).trim().toLowerCase();
  });
  for (let i = 0; i < header.length; i += 1) {
    if (HEADER_ALIASES[1].indexOf(header[i]) !== -1) return i;
  }
  return null;
}

// Hapus baris uji (nama berpola test/uji/contoh); baris 1 = header tetap.
function cleanTestRows_(tabName) {
  const config = getConfig();
  const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  const sheets = spreadsheet.getSheets();

  let target = tabName ? spreadsheet.getSheetByName(tabName) : null;
  if (!target) {
    for (let i = 0; i < sheets.length; i += 1) {
      if (resolveColumns_(sheets[i])) {
        target = sheets[i];
        break;
      }
    }
  }
  if (!target) return { ok: false, message: 'Tab rekap tidak ditemukan.' };

  const map = resolveColumns_(target);
  const nameColumn = map ? map[1] : findNameColumn_(target);
  if (nameColumn === null) return { ok: false, message: 'Header tab tidak dikenali.' };

  const lastRow = target.getLastRow();
  if (lastRow < 2) return { ok: true, removed: 0, tab: target.getName() };

  const values = target.getRange(2, 1, lastRow - 1, target.getLastColumn()).getValues();
  const removed = [];
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (TEST_NAME_PATTERN.test(String(values[i][nameColumn] || ''))) removed.push(i + 2);
  }
  for (const rowIndex of removed) target.deleteRow(rowIndex);
  if (removed.length) SpreadsheetApp.flush();

  return { ok: true, tab: target.getName(), removed: removed.length, rows: removed };
}

// Hapus berkas foto uji (nama berpola test/uji/contoh) di folder foto.
function purgeTestPhotos_() {
  const folder = getFolder_();
  const files = folder.getFiles();
  const removed = [];
  while (files.hasNext()) {
    const file = files.next();
    if (TEST_NAME_PATTERN.test(file.getName())) {
      removed.push(file.getName());
      file.setTrashed(true);
    }
  }
  return { ok: true, folder: folder.getName(), removed: removed.length, files: removed };
}

function diagnose_() {
  const config = getConfig();
  const result = { ok: true, spreadsheetId: config.spreadsheetId, tabs: [], sheet: {}, drive: {} };

  try {
    const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    const sheets = spreadsheet.getSheets();
    for (let i = 0; i < sheets.length; i += 1) {
      const sheet = sheets[i];
      let header = [];
      let match = false;
      try {
        header = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(function (c) {
          return String(c || '');
        });
        match = !!resolveColumns_(sheet);
      } catch (headerError) {
        header = ['(error)'];
      }
      result.tabs.push({
        name: sheet.getName(),
        sheetId: (function () { try { return sheet.getSheetId(); } catch (e) { return null; } })(),
        lastRow: (function () { try { return sheet.getLastRow(); } catch (e) { return null; } })(),
        lastColumn: (function () { try { return sheet.getLastColumn(); } catch (e) { return null; } })(),
        header: header,
        match: match,
      });
    }

    const sheet = getSheet_();
    result.sheet = {
      ok: true,
      name: sheet.getName(),
      sheetId: (function () { try { return sheet.getSheetId(); } catch (e) { return null; } })(),
      header: sheet.getRange(1, 1, 1, HEADER.length).getValues()[0],
      lastRow: sheet.getLastRow(),
    };
  } catch (error) {
    result.sheet = { ok: false, error: String(error && error.message ? error.message : error) };
  }

  try {
    const folder = getFolder_();
    result.drive = {
      ok: true,
      folderId: folder.getId(),
      folderName: folder.getName(),
      folderUrl: folder.getUrl(),
      configuredFolderId: config.folderId || '(kosong)',
    };
  } catch (error) {
    result.ok = false;
    result.drive = {
      ok: false,
      configuredFolderId: config.folderId || '(kosong)',
      error: String(error && error.message ? error.message : error),
    };
  }

  return result;
}

// Jalankan sekali dari editor Apps Script.
function setup() {
  const sheet = getSheet_();
  const folder = getFolder_();
  const records = readRecords();
  Logger.log('Sheet  : ' + sheet.getName());
  Logger.log('Header : ' + HEADER.join(' | '));
  Logger.log('Baris  : ' + records.length);
  Logger.log('Folder : ' + folder.getName() + ' - ' + folder.getUrl());
  return { ok: true, sheet: sheet.getName(), records: records.length };
}

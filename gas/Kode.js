// ================= KONFIGURASI =================

// Folder Drive tempat foto bukti disimpan.
// Ambil dari URL: https://drive.google.com/drive/folders/<ID>
// Kosongkan untuk melewatkan upload - presensi tetap jalan, sheet tetap
// terisi nama file. Bisa juga diisi lewat Script Property "FOLDER_ID".
var FOLDER_ID = '18OSc_MWUPiuDx0eTVd_jrZH3MN6utKW4';

// Nama tab. Harus dibuat & di-rename manual di Google Sheets, karena Apps
// Script tidak bisa membuat spreadsheet. ensureSheet_() hanya menulis header.
var SHEET_NAME = 'data_absen61';

// ID spreadsheet angkatan 61.
// Dari URL: https://docs.google.com/spreadsheets/d/<ID>/edit
// Script Property "SPREADSHEET_ID" diprioritaskan daripada nilai ini.
var SPREADSHEET_ID = '14T76EGoET-9VIkNLNg7fXCoCk-81OpoBVqUj8mYyfJM';

var TIMEZONE = 'Asia/Jakarta';

// ================= HEADER SPREADSHEET =================
// Urutan HARUS sama dengan array ini. Kolom terakhir berisi nama file;
// file aslinya ada di folder Drive dengan nama yang persis sama.
var HEADERS = [
  'Timestamp',
  'Nama Mahasiswa',
  'NIM',
  'Divisi Piket',
  'Waktu Piket',
  'Lokasi',
  'Status',
  'Catatan',
  'Referensi Foto'
];

// Penanda data manual: '[INPUT MANUAL]' di Catatan, 'MANUAL_' di Referensi Foto.
var TAG_MANUAL_NOTE = '[INPUT MANUAL]';
var TAG_MANUAL_FILE = 'MANUAL_';

// Status yang boleh diisi manual. Sisanya dihitung otomatis oleh form.
var STATUS_MANUAL = ['Tepat Waktu', 'Terlambat', 'Toleransi', 'Izin', 'Tidak Hadir'];

var SHIFT_VALID = ['06.30', '12.00', '16.00'];
var LOKASI_VALID = ['Kandang Puyuh', 'Kandang Itik', 'Penelitian'];


// ================= ENTRY POINT =================

// Dipanggil form mahasiswa dan form manual admin. Kunci payload sama.
function doPost(e) {
  try {
    // -- Dispatch modul TNK 62 (payload: nama / action=add) --
    try {
      var __raw62 = (e && e.postData && e.postData.contents) || '';
      var __p62 = JSON.parse(__raw62);
      if (__p62 && (typeof __p62.nama === 'string' || __p62.action === 'add')) {
        return doPost62(e);
      }
    } catch (errDispatch62) { /* bukan payload 62 -> lanjut modul 61 */ }

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ status: 'error', message: 'Tidak ada payload.' });
    }

    var data = JSON.parse(e.postData.contents);
    var isManual = String(data.action || '') === 'submitManualAttendance';

    var nama = str(data.namaMahasiswa);
    var nim = str(data.nim);
    var divisi = str(data.divisi);
    var waktu = str(data.waktuPiket);
    var lokasi = str(data.lokasi);
    var status = str(data.status);
    var catatan = str(data.catatan);
    var fotoBase64 = String(data.fotoBase64 || '');

    // --- Wajib ---
    if (!nama) return jsonResponse_({ status: 'error', message: 'Nama wajib diisi.' });
    if (!nim) return jsonResponse_({ status: 'error', message: 'NIM wajib diisi.' });
    if (!divisi) {
      return jsonResponse_({ status: 'error', message: 'Divisi piket wajib diisi.' });
    }
    if (!catatan) {
      return jsonResponse_({ status: 'error', message: 'Deskripsi kegiatan wajib diisi.' });
    }
    if (!fotoBase64) {
      return jsonResponse_({
        status: 'error',
        message: 'Foto dokumentasi wajib diisi.'
      });
    }
    if (!waktu) {
      return jsonResponse_({ status: 'error', message: 'Shift piket wajib diisi.' });
    }
    if (SHIFT_VALID.indexOf(waktu) === -1) {
      return jsonResponse_({
        status: 'error',
        message: 'Waktu piket tidak dikenal: ' + waktu
      });
    }
    if (!lokasi) {
      return jsonResponse_({ status: 'error', message: 'Lokasi wajib diisi.' });
    }
    if (LOKASI_VALID.indexOf(lokasi) === -1) {
      return jsonResponse_({
        status: 'error',
        message: 'Lokasi tidak dikenal: ' + lokasi
      });
    }

    // --- Batas panjang ---
    // Lebih baik menolak daripada menulis teks yang tak akan terbaca lagi.
    var tooLong = checkLength_('Nama', nama, 100);
    if (tooLong) return jsonResponse_({ status: 'error', message: tooLong });
    tooLong = checkLength_('NIM', nim, 30);
    if (tooLong) return jsonResponse_({ status: 'error', message: tooLong });
    tooLong = checkLength_('Divisi', divisi, 100);
    if (tooLong) return jsonResponse_({ status: 'error', message: tooLong });
    tooLong = checkLength_('Catatan', catatan, 500);
    if (tooLong) return jsonResponse_({ status: 'error', message: tooLong });

    // Hasil canvas biasanya di bawah 1 MB; 8 MB masih memberi ruang.
    if (fotoBase64.length > 8 * 1024 * 1024) {
      return jsonResponse_({
        status: 'error',
        message: 'Ukuran foto terlalu besar. Maksimal sekitar 8 MB.'
      });
    }

    // --- Data manual ---
    if (isManual) {
      catatan = catatan ? catatan + ' ' + TAG_MANUAL_NOTE : TAG_MANUAL_NOTE;
      if (!status) status = 'Tepat Waktu';
      if (STATUS_MANUAL.indexOf(status) === -1) {
        return jsonResponse_({
          status: 'error',
          message: 'Status tidak dikenal: ' + status
        });
      }
    } else if (!status) {
      status = 'Tepat Waktu';
    }

    var foto = processFoto(fotoBase64, nama, waktu, isManual);

    // --- Tulis baris ---
    var sheet = ensureSheet_();
    sheet.appendRow([
      new Date(),
      nama,
      nim,
      divisi,
      waktu,
      lokasi,
      status,
      catatan,
      foto.ref
    ]);

    return jsonResponse_({
      status: 'success',
      refFoto: foto.ref,
      fotoTerupload: foto.uploaded,
      urlFoto: foto.url
    });
  } catch (err) {
    return jsonResponse_({ status: 'error', message: String(err && err.message || err) });
  }
}

// Dipanggil panel admin untuk menarik semua baris.
function doGet(e) {
  try {
    // -- Dispatch modul TNK 62 (aksi list / ping / diag) --
    try {
      var __act62 = (e && e.parameter && e.parameter.action) || '';
      if (__act62 === 'list' || __act62 === 'ping' || __act62 === 'diag' || __act62 === 'clean' || __act62 === 'purge') {
        return doGet62(e);
      }
    } catch (errDispatch62b) { /* bukan aksi 62 -> lanjut modul 61 */ }

    var sheet = ensureSheet_();
    var values = sheet.getDataRange().getValues();
    var rows = [];

    // Baris 1 adalah header.
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      if (!r || !r[0] && !r[1]) continue;

      var d = r[0] ? new Date(r[0]) : null;
      rows.push({
        timestamp: d ? d.toISOString() : '',
        tanggal: d ? Utilities.formatDate(d, TIMEZONE, 'dd/MM/yyyy') : '',
        waktu: d ? Utilities.formatDate(d, TIMEZONE, 'HH:mm:ss') : '',
        nama: String(r[1] || ''),
        nim: String(r[2] || ''),
        divisi: String(r[3] || ''),
        shift: String(r[4] || ''),
        lokasi: String(r[5] || ''),
        status: String(r[6] || ''),
        catatan: String(r[7] || ''),
        refFoto: String(r[8] || ''),
        // Mirror supaya frontend tidak perlu dibedakan.
        urlFoto: String(r[8] || ''),
        manual: isManualRow(r)
      });
    }

    rows.reverse();

    return jsonResponse_({
      status: 'success',
      total: rows.length,
      data: rows
    });
  } catch (err) {
    return jsonResponse_({ status: 'error', message: String(err && err.message || err) });
  }
}


// ================= FOTO =================

/**
 * Bentuk nama file, lalu upload foto aslinya ke Drive.
 *
 * ref      - nama file untuk kolom sheet. Selalu terisi selama ada foto.
 * uploaded - true hanya kalau file benar-benar masuk Drive.
 * url      - link Drive, hanya kalau upload berhasil.
 *
 * Upload gagal TIDAK menggagalkan presensi: baris tetap ditulis, hanya
 * file aslinya yang hilang. Ekstensi diambil dari header data URL;
 * kalau tidak terbaca, diasumsikan JPEG.
 */
function processFoto(fotoBase64, nama, waktu, isManual) {
  if (!fotoBase64) return { ref: '', uploaded: false, url: '' };

  var mime = 'image/jpeg';
  var ext = 'jpg';
  var m = String(fotoBase64).match(/^data:([^;,]+);base64,/);
  if (m) {
    mime = m[1];
    ext = mime.split('/')[1] || 'jpg';
    if (ext === 'jpeg') ext = 'jpg';
  }

  var stamp = Utilities.formatDate(new Date(), TIMEZONE, 'HHmmss');

  var base = String(nama).replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');
  if (!base) base = 'TanpaNama';
  if (waktu) base = base + '_' + String(waktu).replace('.', '');
  if (isManual) base = TAG_MANUAL_FILE + base;

  var filename = base + '_' + stamp + '.' + ext;
  var ref = '[FILE] ' + filename;

  var folderId = getFolderId_();
  if (!folderId) return { ref: ref, uploaded: false, url: '' };

  try {
    var cleaned = String(fotoBase64).replace(/^data:[^,]*,/, '');
    var bytes = Utilities.base64Decode(cleaned);
    var blob = Utilities.newBlob(bytes, mime, filename);
    var file = ensureFolder_().createFile(blob);
    // Tanpa setSharing: foto tetap privat.
    return { ref: ref, uploaded: true, url: file.getUrl() };
  } catch (err) {
    console.log('Upload foto ke Drive gagal: ' + (err && err.message || err));
    return { ref: ref, uploaded: false, url: '' };
  }
}


// ================= HELPER =================

function str(v) {
  return String(v === null || v === undefined ? '' : v).trim();
}

// Pesan error kalau teks melewati batas, atau '' kalau aman.
function checkLength_(label, value, max) {
  if (value.length > max) {
    return label + ' terlalu panjang (maks ' + max + ' karakter, dapat ' + value.length + ').';
  }
  return '';
}

function isManualRow(row) {
  return (
    String(row[7] || '').indexOf(TAG_MANUAL_NOTE) !== -1 ||
    String(row[8] || '').indexOf(TAG_MANUAL_FILE) !== -1
  );
}

/**
 * Spreadsheet tempat data ditulis. Urutan:
 *  1. Script Property SPREADSHEET_ID
 *  2. variabel SPREADSHEET_ID di konfigurasi
 *  3. getActiveSpreadsheet() - dipakai kalau script bound ke sheet
 */
function getSpreadsheet_() {
  var id = String(SPREADSHEET_ID || '').trim();

  try {
    var dariProperty = String(
      PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || ''
    ).trim();
    if (dariProperty) id = dariProperty;
  } catch (e) {
    // Script Properties tidak selalu tersedia; pakai variabel saja.
  }

  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (e) {
      // Pesan asli "Spreadsheet not found" tidak memberi petunjuk,
      // jadi dibungkus dengan cara memperbaiki.
      throw new Error(
        'Spreadsheet tidak bisa dibuka. ID yang dipakai: ' + id + '\n' +
        'Penyebab yang paling mungkin:\n' +
        '  (a) SPREADSHEET_ID di KONFIGURASI atas salah, atau spreadsheet\n' +
        '      sudah dihapus, atau\n' +
        '  (b) script ini belum punya akses ke spreadsheet itu - buka dulu\n' +
        '      spreadsheet-nya, lalu Extensions > Apps Script dari sana.\n' +
        'Asli: ' + (e && e.message || e)
      );
    }
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      'Spreadsheet tidak ditemukan. Pilih salah satu cara:\n' +
      '(a) Isi SPREADSHEET_ID di bagian KONFIGURASI atas, atau\n' +
      '(b) Project Settings > Script Properties > nama "SPREADSHEET_ID", atau\n' +
      '(c) Buka script ini dari Extensions > Apps Script milik spreadsheet-nya.'
    );
  }
  return ss;
}

/** Script Property FOLDER_ID menang atas variabel di kode. Kosong = dilewati. */
function getFolderId_() {
  var id = String(FOLDER_ID || '').trim();
  try {
    var dariProperty = String(
      PropertiesService.getScriptProperties().getProperty('FOLDER_ID') || ''
    ).trim();
    if (dariProperty) id = dariProperty;
  } catch (e) {
    // Script Properties tidak selalu tersedia; pakai variabel saja.
  }
  return id;
}

// Sengaja tidak membuat folder otomatis: kalau ID salah lebih baik error
// jelas daripada foto tersimpan di tempat yang tidak dikenal.
function ensureFolder_() {
  var id = getFolderId_();
  if (!id) {
    throw new Error(
      'FOLDER_ID kosong. Isi ID folder foto di KONFIGURASI atas, atau ' +
      'Project Settings > Script Properties > nama "FOLDER_ID".\n' +
      'Ambil dari URL: https://drive.google.com/drive/folders/<FOLDER_ID>'
    );
  }
  try {
    return DriveApp.getFolderById(id);
  } catch (e) {
    throw new Error(
      'Folder Drive tidak bisa dibuka. ID yang dipakai: ' + id + '\n' +
      'Penyebab yang paling mungkin:\n' +
      '  (a) FOLDER_ID di KONFIGURASI atas salah atau folder sudah dihapus, atau\n' +
      '  (b) script ini belum punya akses Drive - jalankan testSetup() dulu\n' +
      '      dan setujui izin "Lihat semua file Google Drive".\n' +
      'Asli: ' + (e && e.message || e)
    );
  }
}

/**
 * Sheet + header. Tab dibuat otomatis kalau belum ada. Header hanya ditulis
 * kalau baris 1 masih kosong seluruhnya, supaya data tidak pernah ditimpa.
 */
function ensureSheet_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  var row1 = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  var isEmpty = row1.every(function (cell) {
    return String(cell || '').trim() === '';
  });

  if (isEmpty) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  } else if (String(row1[0] || '').trim() !== HEADERS[0]) {
    // Baris 1 sudah berisi data lain. Jangan ditimpa, cukup ingatkan.
    console.log(
      'Perhatian: baris 1 tab "' + SHEET_NAME + '" sudah berisi data, ' +
      'header tidak ditulis. Pastikan urutannya: ' + HEADERS.join(' | ')
    );
  }

  return sheet;
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


// ================= UTILITAS (untuk admin) =================

/**
 * JALANKAN INI DULUAN sebelum deploy. Pilih `testSetup` di dropdown fungsi
 * atas lalu Run. Muncul pop-up yang mengecek: spreadsheet, tab, header
 * 9 kolom, dan folder Drive (termasuk izin tulisnya).
 *
 * Kali pertama akan muncul pop-up izin Google - izinkan akses Drive.
 */
function testSetup() {
  var lines = [];

  lines.push('Tab yang dicari : ' + SHEET_NAME);
  lines.push('');

  // --- Spreadsheet ---
  try {
    var ss = getSpreadsheet_();
    lines.push('Spreadsheet    : ' + ss.getName());
    lines.push('ID             : ' + ss.getId());
    var dariProperty = '';
    try {
      dariProperty = String(
        PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || ''
      ).trim();
    } catch (e2) {
      dariProperty = '';
    }
    lines.push('ID dari        : ' +
      (dariProperty ? 'Script Property' :
        (String(SPREADSHEET_ID || '').trim() ? 'SPREADSHEET_ID di kode' : 'bound (spreadsheet tempat script ini)')));
  } catch (e) {
    lines.push('SPREADSHEET GAGAL: ' + e.message);
    lines.push('');
    lines.push('Perbaiki dengan salah satu cara ini:');
    lines.push('  - isi SPREADSHEET_ID di bagian KONFIGURASI atas, ATAU');
    lines.push('  - Project Settings > Script Properties > nama "SPREADSHEET_ID", ATAU');
    lines.push('  - pastikan script dibuka dari Extensions > Apps Script milik spreadsheet.');
    SpreadsheetApp.getUi().alert('Hasil testSetup\n\n' + lines.join('\n'));
    return;
  }

  // --- Tab + header ---
  try {
    var sheet = ensureSheet_();
    var row1 = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    lines.push('Tab            : OK, ada');
    lines.push('Baris terakhir : ' + sheet.getLastRow());
    lines.push('');
    lines.push('Header baris 1 :');
    for (var i = 0; i < HEADERS.length; i++) {
      var isi = String(row1[i] || '(kosong)');
      var cocok = isi === HEADERS[i];
      lines.push('  ' + (i + 1) + '. ' + HEADERS[i] +
        (isEmptyCell(row1[i]) ? '  <- kosong, akan diisi otomatis' :
          (cocok ? '  <- OK' : '  <- PERIKSA: ketemu "' + isi + '"')));
    }
  } catch (e) {
    lines.push('Tab GAGAL: ' + e.message);
  }

  lines.push('');
  lines.push('Foto           : referensi nama file ditulis ke sheet,');
  lines.push('                file aslinya di-upload ke folder Drive.');

  // --- Folder foto (Drive) ---
  lines.push('');
  var folderId = getFolderId_();
  if (!folderId) {
    lines.push('Folder foto    : DILEWATI (FOLDER_ID kosong)');
    lines.push('                Presensi tetap jalan, tapi file foto tidak');
    lines.push('                tersimpan - hanya nama file yang tercatat.');
  } else {
    try {
      var folder = ensureFolder_();
      lines.push('Folder foto    : OK, "' + folder.getName() + '"');
      lines.push('URL            : ' + folder.getUrl());
      lines.push('ID dari        : ' +
        (folderIdProp_() ? 'Script Property' : 'FOLDER_ID di kode'));
      // Tulis satu file tes untuk memastikan izin tulis benar-benar ada.
      try {
        var tes = folder.createFile(
          Utilities.newBlob('tes', 'text/plain', '.testSetup.txt')
        );
        buangFileTes_(tes);
        lines.push('Izin tulis     : OK (file tes dibuat lalu dihapus)');
      } catch (e2) {
        lines.push('Izin tulis     : GAGAL - ' + e2.message);
        lines.push('                Upload foto akan gagal. Buka folder,');
        lines.push('                pastikan script ini punya akses editor.');
      }
    } catch (e) {
      lines.push('Folder foto    : GAGAL - ' + e.message);
    }
  }

  SpreadsheetApp.getUi().alert('Hasil testSetup\n\n' + lines.join('\n'));
}

function folderIdProp_() {
  try {
    return String(
      PropertiesService.getScriptProperties().getProperty('FOLDER_ID') || ''
    ).trim();
  } catch (e) {
    return '';
  }
}

// Dipisah dari testSetup supaya error penghapusan tidak menutupi
// hasil tes izin tulis.
function buangFileTes_(file) {
  try {
    file.setTrashed(true);
  } catch (e) {
    console.log('File tes tidak bisa dibuang: ' + (e && e.message || e));
  }
}

function isEmptyCell(v) {
  return String(v || '').trim() === '';
}

/** Membersihkan baris kosong di tengah sheet. Jalankan manual bila perlu. */
function bersihkanBarisKosong() {
  var sheet = ensureSheet_();
  var last = sheet.getLastRow();
  var hapus = [];
  for (var i = last; i >= 2; i--) {
    var row = sheet.getRange(i, 1, 1, HEADERS.length).getValues()[0];
    if (!row[0] && !row[1]) hapus.push(i);
  }
  for (var j = 0; j < hapus.length; j++) {
    sheet.deleteRow(hapus[j]);
  }
  SpreadsheetApp.getUi().alert(hapus.length + ' baris kosong dihapus.');
}

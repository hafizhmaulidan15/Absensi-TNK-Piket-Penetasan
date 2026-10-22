# System Design: Web Absensi Piket Penetasan 62

## 1. Arsitektur Komponen
- **Frontend:** HTML, CSS, JavaScript (Vue.js 3 via CDN) dengan *mobile-first layout*.
- **Backend / API:** Google Apps Script (GAS).
- **Database:** Google Sheets (`DataAbsenPenetasan`).
- **File Storage:** Google Drive Folder khusus untuk menyimpan gambar dokumentasi.

## 2. Alur Data (Data Flow)
1. Mahasiswa membuka web di HP -> Mengisi nama, memilih dari 6 waktu shift, dan mengambil foto kondisi penetasan.
2. Frontend mengonversi foto menjadi string **Base64** dan memvalidasi kecocokan waktu shift dengan jam sistem perangkat.
3. Frontend mengirimkan data JSON (Nama, Waktu, Foto Base64) via `fetch` POST ke Endpoint Google Apps Script.
4. GAS menerima data -> Decode Base64 menjadi file gambar -> Simpan ke Google Drive -> Atur izin akses `ANYONE_WITH_LINK`.
5. GAS mencatat baris baru (Timestamp, Nama, Waktu Piket, URL File Drive) ke Google Sheets.
6. Server mengembalikan respons JSON `{ status: 'success' }` ke frontend.

## 3. Logika Pengunci Waktu (Time Lock Logic)
Sistem *frontend* akan mengatur *state disabled* pada *dropdown* berdasarkan rentang waktu:
- Shift 06.00 (Terbuka 05.30 - 07.00)
- Shift 09.00 (Terbuka 08.30 - 10.00)
- Shift 12.00 (Terbuka 11.30 - 13.00)
- Shift 15.00 (Terbuka 14.30 - 16.00)
- Shift 18.00 (Terbuka 17.30 - 19.00)
- Shift 21.00 (Terbuka 20.30 - 22.00)
*(Catatan: Rentang toleransi bisa disesuaikan di sisi frontend).*
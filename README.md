# Absensi Piket Penetasan â€” TNK 62

Aplikasi web absensi piket: mahasiswa isi nama, NIM, lokasi, deskripsi, pilih shift, lalu **foto
langsung dari kamera** (dengan cap waktu WIB yang tertanam di foto). Laporan masuk ke Google
Sheets (8 kolom) + foto ke Google Drive, dan bisa dibaca dari panel admin.

## Fitur

- **Form wajib diisi** â€” nama, NIM (boleh huruf, contoh `J0409241062`), lokasi, deskripsi piket,
  shift, foto kamera. Tidak ada jalur unggah berkas di halaman utama.
- **Kamera langsung** â€” tanpa dropzone; cap waktu WIB dibakar ke sudut foto.
- **Enam shift** dengan jendela pengisian ketat: buka **5 menit sebelum** jam shift, tutup **10 menit**
  setelah dibuka (`05.55-06.05`, `08.55-09.05`, `11.55-12.05`, `14.55-15.05`, `17.55-18.05`,
  `20.55-21.05` WIB).
- **Gate di server** â€” kiriman di luar jendela ditolak GAS; yang terlambat menghubungi Kak Riswi dan
  dicatat manual lewat panel admin.
- **Panel admin** â€” PIN statis, rekap per shift, filter tanggal/shift/status/nama, urut kolom,
  pagination, ekspor CSV, tombol "Buka Sheet".
- **Tambah data manual** dari admin (boleh lampirkan foto), ditandai `Manual` di Sheet.
- **Notifikasi toast** setiap data berhasil terkirim / gagal.
- **Panel admin sinkron** â€” rekap dibaca langsung dari Sheet; Sheet kosong tampil kosong.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:3000
```

Produksi:

```bash
npm run build
npm start
```


## Konfigurasi (`.env.local`)

| Variabel | Keterangan |
| --- | --- |
| `NEXT_PUBLIC_GAS_ENDPOINT` | URL Web App Google Apps Script (`/exec`). Kosong = mode demo (data lokal). |
| `NEXT_PUBLIC_ADMIN_PIN` | PIN panel admin (default `2361`). |
| `NEXT_PUBLIC_SHEET_NAME` | Nama sheet rekap (default `DataAbsenPenetasan`). |
| `NEXT_PUBLIC_SPREADSHEET_ID` | ID spreadsheet rekap. |
| `NEXT_PUBLIC_DRIVE_FOLDER_ID` | ID folder Drive (opsional). |

## Backend Google Apps Script

Sheet rekap:

```
https://docs.google.com/spreadsheets/d/10XUDc4pgIIThzizmV0G24eUok80KoAo3DEjPBBgeXAQ/edit
```

### Skema kolom (8 kolom)

```
Waktu | Nama | NIM | Jam Piket | Lokasi | Status | Deskripsi piket | File foto gdrive
```

Tab yang dipakai adalah tab yang **headernya cocok** dengan skema di atas (header dengan
nama lain seperti `Shift`, `Catatan`, `Tautan Foto`, `Referensi Foto` juga dikenali). Kalau
tidak ada tab yang cocok, script memakai tab `DataAbsenPenetasan` atau tab pertama, lalu
menyusun ulang datanya ke skema 8 kolom.

### Memindahkan spreadsheet ke folder lain

**`Code.gs` tidak perlu diubah** â€” memindahkan file di Drive tidak mengubah `SPREADSHEET_ID`.
Yang perlu dijaga:

1. Tab rekap tetap punya header 8 kolom di baris 1.
2. Kalau script tidak bisa membuka spreadsheet, isi Script Property `SHEET_ID_62`.
3. Tab tertentu â†’ Script Property `TAB_62`.
4. Folder foto tertentu â†’ Script Property `FOLDER_62`.

### Folder foto

`DRIVE_FOLDER_ID` menunjuk folder `Absensi_Piket_Penetasan`. Folder itu hanya dibagikan
"anyone:writer", sedangkan `DriveApp` tidak menghargai link-sharing â†’ script otomatis
fallback ke folder `Dokumentasi Penetasan` milik akun eksekusi. Agar foto masuk folder yang
dituju, bagikan folder itu ke **user spesifik** (bukan "anyone").

### Endpoint

- `POST /exec` `{ nama, nim, lokasi, deskripsi, waktu, shift, foto, status }` â†’ absensi mandiri.
- `POST /exec` `{ action: 'add', nama, nim, lokasi, deskripsi, shift, status, waktu?, foto? }`
  â†’ baris manual (foto opsional), ditandai `[INPUT MANUAL]` + `MANUAL_`.
- `GET /exec?action=list` â†’ `{ ok, records }`.
- `GET /exec?action=ping` â†’ cek koneksi.
- `GET /exec?action=diag` â†’ daftar tab, header, dan status Drive.
- `GET /exec?action=clean&tab=Data` â†’ hapus baris uji pada tab.
- `GET /exec?action=purge` â†’ hapus foto uji di folder foto.

POST dikirim sebagai `Content-Type: text/plain;charset=utf-8` agar lolos CORS Apps Script.

### Struktur file GAS di repo

| Berkas | Isi |
| --- | --- |
| `Code.gs` | Modul TNK 62 mandiri (siap dipakai di proyek Apps Script sendiri). |
| `gas/Code62.gs` | Modul TNK 62 yang ter-deploy di proyek bersama (suffix `_62`). |
| `gas/Kode.js` | Modul TNK 61 + dispatch ke modul TNK 62 (deploy aktif). |
| `gas/appsscript.json` | Manifest deployment aktif. |

Proyek GAS yang dipakai: `13QVRXHQClt6kJBpKtDEVCEW4mQ2LzOWyVxnQPG4b7D9ORonjvb5gXxUk`
(modul TNK 61 + TNK 62 digabung; deployment lama TNK 61 tetap ter-pin ke versinya sendiri).

## Struktur proyek

```
app/            halaman siswa (/) dan admin (/admin)
components/     form, kamera, toast, panel admin
lib/            logika shift WIB, kompresi + cap waktu gambar, akses API, toasts
types/          tipe data absensi
gas/            artefak backend Google Apps Script yang ter-deploy
Code.gs         backend TNK 62 (versi standalone)
```

## Catatan desain

- Design system editorial agri-tech: emeraldâ€“goldâ€“deep navy ink, Plus Jakarta Sans + JetBrains
  Mono, kartu border tipis, tipografi hierarkis.
- Tanpa layanan AI eksternal: seluruh proses berjalan di browser dan Google Workspace.

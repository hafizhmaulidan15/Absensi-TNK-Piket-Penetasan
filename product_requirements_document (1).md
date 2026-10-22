# Product Requirements Document (PRD): Web Absensi Piket Penetasan 62

## 1. Overview
Aplikasi web sederhana untuk mencatat kehadiran piket mahasiswa Peternakan IPB Angkatan 62 di **Fasilitas Penetasan**. Sistem menggunakan Google Sheets sebagai database utama dan Google Drive sebagai penyimpanan foto dokumentasi.

## 2. Target Pengguna
- **Mahasiswa (Angkatan 62):** Mengisi absensi harian secara mandiri via perangkat seluler di lokasi penetasan.
- **Admin (Client):** Memantau, merekap, dan memfilter data kehadiran serta bukti foto.

## 3. Fitur Utama
### A. Halaman Mahasiswa
- Input nama lengkap (manual).
- Pemilihan waktu piket (6 Shift): **06.00**, **09.00**, **12.00**, **15.00**, **18.00**, dan **21.00**.
- Pengunci jadwal otomatis: Pilihan waktu piket hanya aktif pada rentang jam operasional shift terkait.
- Upload foto dokumentasi penetasan langsung dari perangkat/kamera HP.
- Notifikasi sukses/gagal setelah data terkirim, tanpa akses melihat data mahasiswa lain.

### B. Halaman Admin
- Autentikasi halaman menggunakan PIN admin.
- Tabel rekapitulasi data (Timestamp, Nama, Waktu Piket, Link Foto).
- Fitur filter data berdasarkan tanggal.
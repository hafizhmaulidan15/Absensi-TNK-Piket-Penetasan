# Agents / Implementation Guidelines: Absensi Penetasan

## 1. Peran & Tanggung Jawab Modul Kode
- **Modul Frontend (Mahasiswa):** 
  - Mengelola *state* input form (`nama`, `waktu` dengan 6 opsi, `foto`).
  - Mengatur validasi *time-locking* 6 shift (06.00 s/d 21.00) menggunakan `computed` properties Vue.js secara *real-time*.
  - Melakukan kompresi gambar dan konversi `FileReader` ke *Base64*.
- **Modul Frontend (Admin):** 
  - Proteksi *login* dengan PIN statis.
  - Rendering tabel rekapitulasi data penetasan.
  - Fitur filter berdasarkan rentang tanggal.
- **Modul Backend (GAS):** 
  - Ekstraksi payload POST.
  - Konversi *Base64 string* menjadi *Blob* gambar.
  - Penyimpanan file ke folder ID "Dokumentasi Penetasan" di Google Drive.
  - Insersi data ke Spreadsheet (`appendRow`).

## 2. Roadmap Eksekusi (Step-by-Step)
1. **Setup Google Ecosystem:** Buat Folder Drive & File Sheets baru, catat ID keduanya.
2. **Deploy Backend:** Tanamkan skrip `doPost(e)` di GAS, atur otorisasi, deploy sebagai *Web App*, dan salin URL Endpoint.
3. **Coding Frontend Mahasiswa:** Integrasikan URL Endpoint ke `index.html`. Uji coba pengunci waktu untuk keenam shift dan kompresi fotonya.
4. **Coding Frontend Admin:** Bangun dasbor rekap (`admin.html`) dan pastikan filter tanggal bekerja memotong array data.
5. **UAT (User Acceptance Testing):** Tes pengisian form langsung dari HP saat berada di fasilitas penetasan untuk memastikan kecepatan *upload* dan kesesuaian zona waktu.
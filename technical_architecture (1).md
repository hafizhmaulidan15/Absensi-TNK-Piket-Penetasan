# Technical Architecture: Web Absensi Piket Penetasan 62

## 1. Endpoint & Payload Structure
- **Method:** `POST`
- **Payload (JSON):**
  ```json
  {
    "nama": "Nama Mahasiswa",
    "waktu": "09.00",
    "foto": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."
  }
  ```

## 2. Struktur Database (Google Sheets)
Sheet Name: `DataAbsenPenetasan`
| Kolom | Nama Field | Tipe Data | Keterangan |
| :--- | :--- | :--- | :--- |
| A | Timestamp | DateTime | Format `YYYY-MM-DD HH:mm:ss` |
| B | Nama Mahasiswa | String | Diinput manual |
| C | Waktu Piket | String | 06.00 / 09.00 / 12.00 / 15.00 / 18.00 / 21.00 |
| D | URL Foto | String | Tautan Drive (View Access) |

## 3. Penanganan Keterbatasan Sistem
- **Payload Limit (Base64):** Untuk menghindari kegagalan eksekusi GAS akibat limit payload (max 50MB), foto yang diunggah dari HP akan dikompresi menggunakan HTML5 Canvas API pada sisi *frontend* sebelum dikonversi ke Base64.
- **Timeout Avoidance:** Kode penulisan ke Sheets dan Drive diletakkan dalam satu alur linier yang efisien memakan waktu rata-rata di bawah 2 detik.
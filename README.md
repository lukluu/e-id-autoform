# KTP Scan & Fill

Berikut prompt yang bisa langsung kamu gunakan untuk meminta AI membuat website tersebut.

Buatkan sebuah website modern dan responsive untuk OCR KTP Indonesia yang dapat membaca informasi dari gambar KTP dan secara otomatis mengisi form data berdasarkan hasil OCR.

## Tujuan Aplikasi

Aplikasi digunakan untuk:

1. Mengambil gambar KTP dari berbagai sumber.
2. Memproses gambar menggunakan OCR.
3. Mengekstrak data penting dari KTP Indonesia.
4. Menampilkan hasil ekstraksi ke dalam form.
5. Melakukan autofill pada setiap input form.
6. Memungkinkan pengguna mengoreksi hasil OCR secara manual.
7. Menyediakan preview gambar sebelum dan sesudah proses OCR.

## Tech Stack

Gunakan:

- React.js
- Vite
- TypeScript
- Tailwind CSS
- Lucide React untuk icon
- React Hook Form untuk pengelolaan form
- Zustand atau Context API untuk state management
- OCR engine dibuat modular agar mudah dihubungkan dengan:

  - Tesseract.js untuk OCR lokal, atau
  - API backend OCR seperti Node.js/Python/Flask/FastAPI

Gunakan struktur project yang rapi, scalable, reusable, dan mudah dikembangkan.

## Fitur Input Gambar KTP

Buat halaman utama dengan area upload KTP yang mendukung 3 metode:

### 1. Upload dari Galeri/File

Pengguna dapat:

- Upload gambar JPG
- JPEG
- PNG
- Drag and drop gambar
- Melihat preview gambar sebelum diproses

### 2. Kamera Langsung

Buat fitur kamera langsung menggunakan browser API:

- Gunakan `navigator.mediaDevices.getUserMedia()`
- Tampilkan live camera preview
- Tombol Capture
- Tombol ganti kamera jika device memiliki lebih dari satu kamera
- Dukungan kamera depan dan belakang pada perangkat mobile
- Setelah capture, gambar langsung masuk ke image editor

### 3. External Webcam

Website harus dapat mendeteksi dan menggunakan webcam eksternal yang terhubung ke komputer/laptop.

Buat dropdown untuk memilih kamera:

- Integrated Camera
- External USB Webcam
- Kamera lain yang tersedia

Gunakan:

```javascript
navigator.mediaDevices.enumerateDevices();
```

untuk mendapatkan daftar kamera yang tersedia.

## Image Editor Sebelum OCR

Setelah gambar diupload atau diambil dari kamera, tampilkan halaman/image editor.

Pengguna harus dapat melakukan:

### Crop

Sediakan fitur crop dengan area crop yang dapat:

- Digeser
- Diperbesar
- Diperkecil
- Disesuaikan dengan ukuran KTP

Gunakan rasio KTP Indonesia:

`85.60 × 53.98 mm`

atau gunakan aspect ratio sekitar:

`1.586`

### Rotate

Sediakan tombol:

- Rotate Left 90°
- Rotate Right 90°

Tambahkan slider untuk rotasi manual:

- -180°
- 0°
- +180°

Pengguna dapat memperbaiki posisi KTP jika gambar miring.

### Zoom

Tambahkan:

- Zoom In
- Zoom Out
- Reset

### Image Adjustment

Tambahkan pengaturan opsional:

- Brightness
- Contrast
- Grayscale
- Sharpen
- Reset Image

Tujuannya agar teks pada KTP lebih mudah dibaca oleh OCR.

Tambahkan tombol:

- Batal
- Reset
- Gunakan Gambar

Setelah pengguna selesai melakukan crop dan rotasi, gunakan hasil gambar tersebut untuk proses OCR.

## Proses OCR

Setelah tombol:

`Scan KTP`

ditekan, tampilkan proses loading dengan beberapa status:

1. Menyiapkan gambar
2. Meningkatkan kualitas gambar
3. Membaca teks KTP
4. Mengekstrak data
5. Mengisi form

Buat progress bar dengan persentase proses OCR.

Contoh:

`Memproses OCR... 65%`

## Data yang Harus Diekstrak

OCR harus mencoba membaca dan mengisi data berikut:

### Data Utama

- NIK
- Nama
- Tempat Lahir
- Tanggal Lahir
- Jenis Kelamin
- Golongan Darah
- Alamat
- RT
- RW
- Kelurahan/Desa
- Kecamatan
- Agama
- Status Perkawinan
- Pekerjaan
- Kewarganegaraan
- Berlaku Hingga

## Form Autofill

Setelah OCR selesai, seluruh data otomatis dimasukkan ke dalam form.

Buat form dengan layout profesional menggunakan card.

### Informasi Identitas

Input:

```text
NIK
Nama Lengkap
Tempat Lahir
Tanggal Lahir
Jenis Kelamin
Golongan Darah
```

### Informasi Alamat

Input:

```text
Alamat
RT
RW
Kelurahan / Desa
Kecamatan
Kabupaten / Kota
Provinsi
```

### Informasi Tambahan

Input:

```text
Agama
Status Perkawinan
Pekerjaan
Kewarganegaraan
Berlaku Hingga
```

Gunakan:

- Input text
- Select dropdown untuk data tertentu
- Date picker untuk tanggal lahir
- Validasi form

## Dropdown Data

Buat dropdown untuk:

### Jenis Kelamin

- LAKI-LAKI
- PEREMPUAN

### Golongan Darah

- A
- B
- AB
- O
- Tidak diketahui

### Agama

- ISLAM
- KRISTEN
- KATOLIK
- HINDU
- BUDDHA
- KONGHUCU
- Lainnya

### Status Perkawinan

- BELUM KAWIN
- KAWIN
- CERAI HIDUP
- CERAI MATI

### Kewarganegaraan

- WNI
- WNA

### Berlaku Hingga

Harus mendukung:

- Tanggal tertentu
- SEUMUR HIDUP

## Intelligent OCR Parsing

Jangan hanya menampilkan hasil OCR mentah.

Buat sistem parsing data yang mampu mengenali label KTP.

Contoh hasil OCR:

```text
NIK : 7371XXXXXXXXXXXX
Nama : LUKMAN ODE
Tempat/Tgl Lahir : KENDARI, 01-01-2000
Jenis Kelamin : LAKI-LAKI
Gol. Darah : O
Alamat : JL. CONTOH NO 123
RT/RW : 001/002
Kel/Desa : BARABARAYA
Kecamatan : ...
Agama : ISLAM
Status Perkawinan : BELUM KAWIN
Pekerjaan : PROGRAMMER
Kewarganegaraan : WNI
Berlaku Hingga : SEUMUR HIDUP
```

Buat parser yang dapat:

- Menghapus karakter yang tidak diperlukan
- Menormalkan hasil OCR
- Memperbaiki kesalahan umum OCR
- Mengenali variasi label

Contoh kesalahan OCR:

```text
NIK
N1K
NIK.
NIK:
```

Semuanya harus dapat dikenali sebagai field `nik`.

Contoh koreksi karakter:

```text
O ↔ 0
I ↔ 1
L ↔ 1
S ↔ 5
B ↔ 8
```

Khusus untuk NIK, lakukan validasi:

- Harus berisi 16 digit
- Hapus karakter selain angka
- Jangan memaksa hasil OCR jika jumlah digit tidak 16
- Tampilkan status confidence atau warning jika NIK tidak valid

## Provinsi dan Kabupaten/Kota

Sediakan input:

```text
Provinsi
Kabupaten / Kota
```

Buat sistem yang memungkinkan data ini:

1. Diisi dari hasil OCR jika terbaca.
2. Dapat dipilih secara manual jika OCR gagal.
3. Kabupaten/Kota harus dapat difilter berdasarkan Provinsi.

Gunakan struktur data seperti:

```javascript
{
  provinsi: "SULAWESI SELATAN",
  kabupaten_kota: [
    "KOTA MAKASSAR",
    "KABUPATEN GOWA",
    "KABUPATEN MAROS"
  ]
}
```

Buat arsitektur agar data wilayah Indonesia mudah diintegrasikan dari API atau file JSON.

## OCR Result Review

Setelah proses OCR selesai, buat tampilan:

### Kiri

Preview gambar KTP.

### Kanan

Form hasil OCR.

Setiap field yang berhasil terbaca memiliki indikator:

- High confidence
- Medium confidence
- Low confidence

Contoh:

```text
NIK                    ✓ High
Nama                   ✓ High
Tempat Lahir           ✓ Medium
Golongan Darah         ? Low
```

Field dengan confidence rendah diberi highlight agar pengguna dapat memeriksa dan mengeditnya.

Jangan mengunci hasil OCR. Semua field harus dapat diedit secara manual.

## Desain UI

Gunakan desain modern, clean, dan profesional.

Buat layout:

### Header

Berisi:

- Logo aplikasi
- Nama aplikasi: `KTP OCR Scanner`
- Status kamera

### Halaman Upload

Tampilkan card besar dengan:

```text
Scan KTP Indonesia

[ Upload dari Galeri ]

[ Buka Kamera ]

atau drag & drop gambar KTP di sini
```

### Halaman Editor

Layout:

```text
-------------------------------------------
|              IMAGE EDITOR                |
-------------------------------------------
|                                         |
|             Preview KTP                 |
|                                         |
-------------------------------------------
| Crop | Rotate | Zoom | Brightness       |
-------------------------------------------

                [ Scan KTP ]
```

### Halaman Hasil

Desktop:

```text
--------------------------------------------------
|                  HASIL OCR                      |
--------------------------------------------------
|                    |                             |
|   Preview KTP      |      FORM DATA KTP          |
|                    |                             |
|                    | NIK                         |
|                    | Nama                        |
|                    | Tempat Lahir                |
|                    | Tanggal Lahir               |
|                    | Jenis Kelamin               |
|                    | dan seterusnya              |
--------------------------------------------------
```

Mobile:

- Layout berubah menjadi satu kolom.
- Preview gambar di atas.
- Form di bawah.
- Semua tombol mudah digunakan dengan touchscreen.

## Component Structure

Gunakan struktur komponen seperti:

```text
src/
│
├── components/
│   ├── UploadKtp.tsx
│   ├── CameraCapture.tsx
│   ├── CameraSelector.tsx
│   ├── ImageEditor.tsx
│   ├── Cropper.tsx
│   ├── RotateControl.tsx
│   ├── ImagePreview.tsx
│   ├── OCRProgress.tsx
│   ├── OCRResult.tsx
│   ├── KtpForm.tsx
│   ├── ConfidenceIndicator.tsx
│   └── Header.tsx
│
├── hooks/
│   ├── useCamera.ts
│   ├── useOCR.ts
│   └── useImageEditor.ts
│
├── services/
│   ├── ocrService.ts
│   └── ktpParser.ts
│
├── utils/
│   ├── imageProcessor.ts
│   ├── textNormalizer.ts
│   └── validation.ts
│
├── types/
│   └── ktp.ts
│
├── data/
│   └── wilayahIndonesia.ts
│
├── pages/
│   ├── Home.tsx
│   └── Result.tsx
│
└── App.tsx
```

## TypeScript Interface

Buat interface utama:

```typescript
export interface KtpData {
  nik: string;
  nama: string;
  provinsi: string;
  kabupatenKota: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  golonganDarah: string;
  alamat: string;
  rt: string;
  rw: string;
  kelurahanDesa: string;
  kecamatan: string;
  agama: string;
  statusPerkawinan: string;
  pekerjaan: string;
  kewarganegaraan: string;
  berlakuHingga: string;
}
```

Tambahkan interface confidence:

```typescript
export interface FieldConfidence {
  field: keyof KtpData;
  confidence: number;
  status: "high" | "medium" | "low";
}
```

## Validasi

Tambahkan validasi:

### NIK

- Harus 16 digit.
- Hanya angka.
- Tampilkan error jika tidak valid.

### RT/RW

- Maksimal 3 digit per field.
- Otomatis tambahkan leading zero jika diperlukan.

Contoh:

```text
1 → 001
12 → 012
123 → 123
```

### Tanggal Lahir

Gunakan format:

```text
DD-MM-YYYY
```

Namun internal state dapat menggunakan format ISO.

## Error Handling

Tangani kondisi:

- Kamera tidak tersedia.
- Permission kamera ditolak.
- Tidak ada webcam.
- Gagal mengambil gambar.
- OCR gagal membaca teks.
- Gambar terlalu buram.
- Gambar bukan KTP.
- NIK tidak valid.

Tampilkan pesan error yang jelas dan user-friendly.

## Privasi dan Keamanan

Karena KTP mengandung data pribadi sensitif:

- Jangan menyimpan gambar secara permanen secara default.
- Proses gambar secara lokal jika memungkinkan.
- Jangan mengirim data ke server tanpa persetujuan pengguna.
- Sediakan tombol `Hapus Data`.
- Setelah halaman direfresh, data sebaiknya dapat dibersihkan.
- Jangan menampilkan data KTP di console log production.
- Jangan menyimpan data sensitif ke localStorage secara default.

## Output yang Diharapkan

Buatkan project React yang lengkap dan dapat dijalankan.

Berikan:

1. Struktur folder project.
2. Source code setiap komponen utama.
3. Implementasi upload gambar.
4. Implementasi kamera langsung.
5. Implementasi pemilihan external webcam.
6. Implementasi crop gambar.
7. Implementasi rotate gambar dengan tombol dan slider derajat.
8. Implementasi OCR service.
9. Implementasi parser khusus format KTP Indonesia.
10. Implementasi autofill React Hook Form.
11. Validasi NIK dan field lainnya.
12. Responsive design untuk desktop dan mobile.
13. Loading state OCR.
14. Error handling.
15. Dummy/mock OCR result agar aplikasi bisa langsung diuji tanpa backend.
16. Pisahkan kode OCR agar nantinya mudah diganti dengan API OCR backend.

Pastikan kode bersih, menggunakan TypeScript dengan type yang jelas, reusable component, tidak menggunakan `any`, dan tidak membuat seluruh aplikasi dalam satu file.

Buat aplikasi dengan tampilan profesional seperti aplikasi document scanner modern. Fokus utama adalah pengalaman pengguna yang mudah: Upload/Camera → Crop/Rotate → Scan OCR → Autofill Form → Review/Edit → Submit atau Reset.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7f79e384-b346-4c86-9b3f-e55ad4619cc2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

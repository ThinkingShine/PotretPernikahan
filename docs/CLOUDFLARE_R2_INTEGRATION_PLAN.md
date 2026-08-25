# Rencana Implementasi & Persiapan: Integrasi Cloudflare R2


| Dokumen | Panduan & Rencana Integrasi Cloudflare R2 Storage                                     |
| --------- | --------------------------------------------------------------------------------------- |
| Target  | Migrasi penyimpanan media ke Cloudflare R2 (10 GB Free Storage + $0 Egress/Bandwidth) |
| Versi   | 1.0                                                                                   |
| Tanggal | 24 Agustus 2026                                                                       |

---

## 1. Mengapa Cloudflare R2?


| Parameter              | Vercel Blob (Sebelumnya) | Cloudflare R2 (Baru)                | Dampak Positif                                              |
| ------------------------ | -------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| **Free Storage**       | 1 GB                     | **10 GB**                           | Muat 1.000 – 2.000+ foto resolusi tinggi                   |
| **Bandwidth (Egress)** | 10 GB / bulan            | **$0 Unlimited (Gratis Selamanya)** | Slideshow TV di venue bebas menyala 8 jam penuh tanpa biaya |
| **Arsitektur API**     | Proprietary Vercel SDK   | **Standard S3-Compatible API**      | Fleksibel, portabel, dan stabil                             |
| **Direct Upload**      | Token internal           | **S3 Presigned URL (HTTP PUT)**     | Kompatibel dengan semua browser modern                      |

---

## 2. Checklist Persiapan (Prerequisites)

### A. Pengaturan di Cloudflare Dashboard

Pastikan 4 hal ini sudah selesai di dashboard Cloudflare:

- [X] **Bucket dibuat:** Bucket `potretpernikahan` sudah tersedia.
- [X] **Public Development URL Aktif:**
  * Di bucket `potretpernikahan` $\rightarrow$ Tab **Settings** $\rightarrow$ Bagian **Public Development URL** $\rightarrow$ Klik **Enable**.
  * Dapatkan URL seperti `https://pub-xxxxxxxxxxxxxxxx.r2.dev`.
- [X] **CORS Policy Terpasang:**
  * Di bucket `potretpernikahan` $\rightarrow$ Tab **Settings** $\rightarrow$ **CORS Policy** $\rightarrow$ Paste JSON berikut:
    ```json
    [
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET", "PUT", "HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3600
      }
    ]
    ```
- [X] **Account API Token Dibuat:**
  * Menggunakan permission *Object Read & Write* pada bucket `potretpernikahan`.
  * Memiliki **Access Key ID** dan **Secret Access Key**.

### B. Konfigurasi File `.env`

Isi nilai-nilai tersebut ke file [`.env`](file:///home/azfa/web_projects/masfik/.env) di root proyek:

```bash
# Supabase Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Cloudflare R2 Storage
R2_ACCOUNT_ID=dc69a166f51873e42f15a6d76052c943
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=potretpernikahan
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxx.r2.dev
```

---

## 3. Langkah Teknis Implementasi Kode

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Pasang AWS S3 Client SDK                                │
│    pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner│
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Buat Adapter Storage Baru (server/r2.ts)                 │
│    - S3Client dengan R2 Endpoint Cloudflare                 │
│    - createUploadPresignedUrl() via PutObjectCommand        │
│    - statObject() via HeadObjectCommand                     │
│    - deleteObject() via DeleteObjectCommand                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Hubungkan ke Router API (server/app.ts)                  │
│    - POST /api/media/upload-url (Menerbitkan presigned PUT) │
│    - POST /api/media/:id/complete (Verifikasi HeadObject)   │
│    - DELETE /api/admin/media/:id (Hapus dari R2 & DB)       │
│    - Alur Cover Event Admin dengan R2                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Perbarui Handler Frontend (src/lib/api.ts)               │
│    - uploadMedia(): Direct HTTP PUT ke Presigned URL R2     │
│    - Progress bar upload menggunakan XMLHttpRequest / Fetch │
│    - adminUploadCover(): Direct PUT ke Presigned Cover R2   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Pengujian & Validasi Penuh                               │
│    - Upload foto & video tamu                               │
│    - Verifikasi render di Galeri, Lightbox, dan Slideshow   │
│    - Hapus media & ganti cover di Admin Dashboard           │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Rincian Perubahan Modul Kode

### 1. Modul Baru: `server/r2.ts`

Menggantikan peran `server/blob.ts` untuk mengelola interaksi dengan bucket S3 Cloudflare R2:

```ts
import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Inisialisasi S3Client dengan endpoint R2 Cloudflare
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})
```

### 2. Modul API: `server/app.ts`

* Endpoint `/api/health` memverifikasi status koneksi R2 (`r2: true`).
* Endpoint `/api/media/upload-url` menghasilkan Presigned URL `PUT` berdurasi 1 jam.
* Endpoint `/api/media/:id/complete` memverifikasi file dengan `HeadObjectCommand` lalu menyusun URL publik menggunakan `R2_PUBLIC_URL`.

### 3. Modul Frontend: `src/lib/api.ts`

* `uploadMedia()` mengunggah file biner langsung ke Presigned URL menggunakan `fetch(uploadUrl, { method: "PUT", body: file })` atau `XMLHttpRequest` dengan event `progress` untuk menggerakkan progress bar secara akurat.

---

## 5. Rencana Pengujian (Testing Matrix)


| Test Case             | Langkah Pengujian                          | Hasil yang Diharapkan                                                          |
| ----------------------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| **Health Check**      | Akses`GET /api/health`                     | Output`{"status":"ok", "r2":true, "database":true}`                            |
| **Upload Foto Tamu**  | Tamu unggah foto JPG/PNG dari landing page | File masuk ke bucket R2`potretpernikahan`, thumbnail langsung muncul di galeri |
| **Upload Video Tamu** | Tamu unggah video MP4 (misal 50 MB)        | Progress bar bergerak mulus, video bisa diputar di galeri & slideshow          |
| **CORS Validation**   | Upload dilakukan langsung dari browser     | Tidak ada error CORS`Blocked by CORS policy` di Developer Console              |
| **Moderasi & Hapus**  | Admin menghapus foto di dashboard admin    | File fisik di R2 terhapus permanen dan baris database dibersihkan              |
| **Ganti Cover Acara** | Admin mengganti foto sampul acara          | Sampul baru tersimpan di R2, sampul lama terhapus dari bucket                  |

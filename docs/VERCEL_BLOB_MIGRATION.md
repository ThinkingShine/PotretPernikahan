# Migrasi penyimpanan ke Vercel Blob

Dokumen ini menjelaskan arsitektur penyimpanan file setelah migrasi, environment
variable yang dibutuhkan, cara menjalankan migrasi data, langkah deploy, dan
langkah rollback.

## Apa yang berubah

| | Sebelum | Sesudah |
| --- | --- | --- |
| Penyimpanan file | Google Cloud Storage (sebelumnya Supabase Storage) | **Vercel Blob** |
| Backend API | Supabase Edge Function (Deno + Hono) | **Vercel Function** (Node + Hono) |
| Database | Supabase Postgres (`kv_store_746e6e59`) | Supabase Postgres — **tidak berubah** |
| Base URL API | `https://<ref>.supabase.co/functions/v1/make-server-746e6e59` | `/api` (satu origin dengan frontend) |

Supabase **tetap dipakai** sebagai database. Yang dilepas hanya bagian
penyimpanan file. Supabase Auth tidak pernah dipakai di aplikasi ini — login
admin memakai passcode yang hash-nya disimpan di tabel KV.

### Mengapa backend ikut pindah

SDK `@vercel/blob` bergantung pada `undici` dan beberapa builtin Node
(`node:crypto`, `node:stream`) yang tidak berjalan andal di Supabase Edge
Functions (Deno). Alternatifnya adalah menulis ulang sendiri format token
internal Vercel Blob di Deno — tidak terdokumentasi dan rapuh terhadap
perubahan versi SDK. Memindahkan app Hono ke Vercel Function adalah porting
mekanis (kode Hono-nya sama), memakai SDK resmi sesuai dokumentasi, dan
sekaligus membuat seluruh infrastruktur berada di Vercel.

### Alur upload

Byte file tidak pernah melewati fungsi API, jadi limit body dan durasi Vercel
Function tidak berlaku untuk media:

1. `POST /api/media/upload-url` — server menerbitkan **client token** yang
   dibatasi pada satu pathname, satu media type, dan satu batas ukuran
   (`generateClientTokenFromReadWriteToken`), lalu menyimpan baris `pending` di
   database.
2. Browser mengunggah langsung ke Vercel Blob dengan token itu
   (`put()` dari `@vercel/blob/client`). File di atas 8 MB diunggah multipart
   sehingga bagian yang gagal bisa diulang tanpa mengulang seluruh file.
3. `POST /api/media/:id/complete` — server memverifikasi blob benar-benar ada
   (`head()`) sebelum item muncul di galeri.

Batasan upload ditegakkan oleh Vercel Blob, bukan oleh browser: client yang
dimodifikasi tetap tidak bisa menulis ke pathname lain, mengganti media type,
atau melewati batas ukuran.

Foto sampul memakai alur dua langkah yang sama
(`/api/admin/event/cover/upload-url` → `/api/admin/event/cover/complete`),
karena batas body Vercel Function ada di bawah batas 10 MB yang diizinkan untuk
sampul.

### Unduhan

Vercel Blob menyediakan `downloadUrl` yang menyajikan byte dengan
`Content-Disposition: attachment`, sehingga seluruh modul signed-URL V4 milik
GCS bisa dihapus. Nama file yang tersimpan di perangkat tamu berasal dari
segmen terakhir pathname blob, misalnya `potret-budi-1a2b3c4d.jpg`.

Endpoint `/api/media/:id/download` tetap ada sebagai redirect agar item lama
(yang belum dimigrasikan dan hanya punya URL biasa) tetap bisa diunduh.

## Environment variables

### Di Vercel (Project Settings → Environment Variables)

| Variable | Wajib | Environment | Keterangan |
| --- | --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | ya | Production, Preview, Development | **Diisi otomatis** oleh Vercel begitu Blob store dihubungkan ke project. Jangan diisi manual. |
| `SUPABASE_URL` | ya | Production, Preview, Development | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ya | Production, Preview, Development | Supabase → Project Settings → API. **Server-side saja**, jangan pernah diberi prefix `VITE_`. |
| `VITE_API_BASE_URL` | tidak | — | Hanya jika frontend dihosting di luar Vercel (misalnya preview Figma Make) dan harus memanggil API Vercel. |

Lihat `.env.example` untuk pengembangan lokal.

`GCS_BUCKET` dan `GCS_SERVICE_ACCOUNT_JSON` **tidak lagi dipakai** dan bisa
dihapus dari secrets setelah migrasi data selesai dan terverifikasi.

### Konfigurasi Vercel Dashboard

1. **Buat Blob store** — Dashboard → Storage → Create Database → Blob. Beri
   nama, misalnya `potret-pernikahan-media`.
2. **Hubungkan ke project** — pada store tersebut, Connect Project → pilih
   project ini → centang Production, Preview, dan Development. Vercel otomatis
   menambahkan `BLOB_READ_WRITE_TOKEN`.
3. **Tambahkan env Supabase** — Project Settings → Environment Variables:
   `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` untuk ketiga environment.
4. **Framework preset** — Vite. Sudah dikunci di `vercel.json`
   (`framework`, `buildCommand`, `outputDirectory`), jadi tidak perlu diubah.
5. **Node.js version** — 22.x (sesuai `.mise.toml`).

## Migrasi data

Script memindahkan file yang sudah ada dari store lama ke Vercel Blob dan
memperbarui URL di database.

Store lama menyajikan setiap objek melalui URL publik, dan URL itulah yang sudah
tersimpan di database — jadi script **tidak memerlukan kredensial provider
lama**. File dibaca lewat HTTPS biasa lalu dialirkan ke Vercel Blob.

```bash
# 1. Ambil env dari Vercel (atau isi .env dari .env.example)
vercel env pull .env

# 2. Lihat dulu apa yang akan dilakukan, tanpa menulis apa pun
pnpm run migrate:blob -- --dry-run

# 3. Jalankan migrasi
pnpm run migrate:blob
```

Sifat script:

- **Idempotent** — pathname blob diturunkan dari id baris, jadi eksekusi ulang
  menemukan apa pun yang sudah terunggah dan hanya mengisi sisanya.
- **Aman dihentikan** — jalankan ulang saja; baris yang sudah selesai dilewati.
- **Progress log** per baris, plus ringkasan di akhir.
- **Error handling per baris** — satu file gagal tidak menghentikan sisanya;
  daftar yang gagal dicetak di akhir dan exit code menjadi 1.
- **Streaming** — video besar tidak dibuffer seluruhnya di memori.
- Baris `pending` (upload yang tidak pernah selesai) dan sampul bawaan
  (Unsplash) dilewati.

## Langkah deployment ke production

1. Selesaikan konfigurasi Vercel Dashboard di atas (Blob store + env Supabase).
2. Merge branch ini ke branch production.
3. Tunggu deploy Vercel selesai, lalu verifikasi:
   ```bash
   curl https://<domain>/api/health
   # → {"status":"ok","blob":true,"database":true}
   ```
   Kalau `blob` atau `database` bernilai `false`, env-nya belum terpasang di
   environment Production.
4. Jalankan migrasi data (`pnpm run migrate:blob`) agar galeri lama tetap tampil
   dan bisa diunduh.
5. Verifikasi manual:
   - Galeri memuat foto dan video lama.
   - Tamu bisa mengunggah foto baru, progress bar bergerak, item langsung muncul.
   - Tamu bisa mengunggah video besar (multipart).
   - Tombol unduh menghasilkan file dengan nama yang benar.
   - Admin bisa approve, hapus, dan bulk-delete.
   - Admin bisa mengganti foto sampul.
   - Slideshow berjalan.
6. Setelah semuanya terverifikasi, hapus secret `GCS_BUCKET` dan
   `GCS_SERVICE_ACCOUNT_JSON`, dan hapus bucket GCS lama bila sudah tidak
   dibutuhkan.

## Rollback

Migrasi data hanya **menambah** file di Vercel Blob dan menulis ulang URL di
database — file di store lama tidak dihapus. Jadi rollback tidak kehilangan
data, selama bucket GCS lama belum dihapus.

1. **Kembalikan kode**

   ```bash
   git revert <commit-migrasi>
   git push
   ```

   Ini memulihkan Supabase Edge Function beserta modul GCS-nya.

2. **Deploy ulang edge function** — Supabase Edge Function yang sudah
   ter-deploy tetap berjalan meski sumbernya dihapus dari repository, jadi
   biasanya tidak perlu tindakan apa pun. Kalau memang sudah di-undeploy,
   deploy ulang setelah revert.

3. **Kembalikan URL di database** — baris yang sudah dimigrasikan menunjuk ke
   Vercel Blob. Kembalikan `url` ke bentuk lama lewat SQL:

   ```sql
   -- Periksa dulu
   SELECT key, value->>'url' FROM kv_store_746e6e59
   WHERE key LIKE 'media:%' AND value->>'url' LIKE '%blob.vercel-storage.com%';

   -- Bangun ulang URL GCS dari pathname blob (media/<id>/<nama>)
   UPDATE kv_store_746e6e59
   SET value = value
     || jsonb_build_object(
          'url',
          'https://storage.googleapis.com/<BUCKET-LAMA>/media/'
            || (value->>'id') || '.' || split_part(value->>'downloadName', '.', 2)
        )
     || jsonb_build_object('objectName',
          'media/' || (value->>'id') || '.' || split_part(value->>'downloadName', '.', 2))
   WHERE key LIKE 'media:%'
     AND value->>'url' LIKE '%blob.vercel-storage.com%';
   ```

   Sesuaikan `<BUCKET-LAMA>`. Ambil backup tabel dulu sebelum menjalankannya.

4. **Rollback sebagian (lebih cepat)** — kalau frontend masih berjalan di
   Vercel dan hanya API yang ingin dikembalikan, cukup set
   `VITE_API_BASE_URL=https://<ref>.supabase.co/functions/v1/make-server-746e6e59`
   lalu redeploy. Tidak perlu revert kode.

## Catatan

- `utils/supabase/info.tsx` adalah file autogenerated Figma Make. Setelah
  migrasi file ini tidak lagi diimpor oleh kode aplikasi, tetapi dibiarkan apa
  adanya karena header-nya melarang penyuntingan.
- Dalam mode development, `/api/*` dilayani sebagai Vite middleware
  (lihat `apiDevServer` di `vite.config.ts`), sehingga preview Figma Make tetap
  berjalan tanpa proses kedua.

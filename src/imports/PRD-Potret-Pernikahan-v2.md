# Product Requirements Document — Potret Pernikahan

| Field | Value |
|---|---|
| Versi | 2.0 |
| Status | Draft for Review |
| Tanggal | 4 Agustus 2026 |
| Product Owner | Muhammad Fikri Mubarok |
| Tech Lead | Fikri |
| Target Rilis MVP | 1 minggu |
| Dokumen Terkait | `Design-Guidelines-Potret-Pernikahan.md` |

---

## 1. Executive Summary

Potret Pernikahan adalah platform berbasis QR code untuk mengumpulkan foto, video, dan ucapan dari tamu undangan pernikahan ke dalam satu galeri terpusat, tanpa tamu perlu mengunduh aplikasi atau membuat akun.

Tamu memindai QR code yang tersedia di meja, standing banner, atau kartu undangan, lalu langsung diarahkan ke halaman web event untuk mengunggah media dan menulis ucapan. Pengantin dan wedding organizer (WO) mengelola event lewat dashboard admin, memantau unggahan secara real-time, memoderasi konten, menampilkan slideshow di layar acara, dan mengunduh seluruh arsip setelah acara selesai.

**Ruang lingkup MVP:** pembuatan event, akses tamu via QR, unggah foto/video, galeri real-time, guestbook digital, slideshow layar besar, moderasi, dan unduh arsip.

**Di luar ruang lingkup MVP:** AI photo search, RSVP, undangan digital, aplikasi native, pembayaran/self-service billing, multi-bahasa selain Indonesia.

**Stack teknis:** Next.js (App Router) di Vercel, Supabase (Postgres + Auth + Realtime), Cloudflare R2 untuk object storage, Cloudflare Images/Workers untuk transformasi thumbnail.

---

## 2. Product Vision

> Setiap momen pernikahan terekam dari ratusan sudut pandang — dan semuanya tersimpan di satu tempat.

Fotografer profesional menangkap momen resmi. Tamu menangkap momen yang tidak terlihat kamera: tawa di meja belakang, anak-anak berlarian, pelukan yang tidak terjadwal. Potret Pernikahan memastikan momen-momen tersebut tidak hilang di ratusan galeri ponsel yang berbeda.

**Positioning:** produk pendamping fotografer, bukan penggantinya. Dijual sebagai add-on oleh WO dan vendor dokumentasi.

**Prinsip produk:**

1. **Nol friksi untuk tamu.** Tanpa install, tanpa login, tanpa tutorial. Scan → unggah → selesai dalam < 60 detik.
2. **Tidak boleh gagal di hari-H.** Acara tidak bisa diulang. Ketersediaan dan resiliensi upload lebih penting daripada fitur.
3. **Pengantin yang memegang kendali.** Semua konten dapat dimoderasi, diunduh, dan dihapus oleh pemilik event.
4. **Ringan di jaringan buruk.** Venue sering punya sinyal lemah dan ratusan perangkat berebut bandwidth.

---

## 3. Problem Statement

### 3.1 Masalah

Setelah acara, pengantin harus memburu dokumentasi tamu secara manual. Media tersebar di grup WhatsApp (terkompresi berat), Instagram Story (hilang 24 jam), dan galeri pribadi tamu yang tidak pernah dikirim sama sekali.

### 3.2 Bukti masalah

| Gejala | Dampak |
|---|---|
| Media dikirim via grup chat | Kompresi menurunkan kualitas drastis; file hilang saat chat dibersihkan |
| Story media sosial tidak diarsipkan | Konten hilang permanen dalam 24 jam |
| Tidak ada satu tempat kumpul | Pengantin menagih satu per satu selama berminggu-minggu |
| Ucapan tertulis di buku tamu fisik | Sulit dibaca, tidak terarsip digital, sering hilang |

### 3.3 Mengapa solusi eksisting tidak cukup

- **Google Drive / Google Photos shared album:** butuh akun Google, izin folder rumit, tidak ada moderasi, tidak ada slideshow, tampilan tidak sesuai konteks acara.
- **Grup WhatsApp:** kompresi merusak kualitas, tidak terstruktur, tercampur obrolan.
- **Aplikasi wedding gallery luar negeri:** harga dalam USD, butuh install aplikasi, tidak berbahasa Indonesia, latensi tinggi.

### 3.4 Hipotesis

Jika friksi unggah dihilangkan sampai satu kali scan, maka rasio tamu yang berkontribusi naik dari <10% (kondisi saat ini via grup chat) menjadi ≥35%.

---

## 4. Objectives & KPIs

### 4.1 Objectives

| ID | Objective |
|---|---|
| O1 | Memaksimalkan jumlah media yang berhasil terkumpul per event |
| O2 | Menjamin keandalan sistem pada saat acara berlangsung |
| O3 | Menjadikan produk mudah dijual ulang oleh WO dan vendor |

### 4.2 KPI

| KPI | Definisi | Target MVP | Sumber Data |
|---|---|---|---|
| Guest participation rate | Tamu unik yang mengunggah ≥1 media ÷ estimasi tamu hadir | ≥ 35% | `uploads` distinct `guest_session_id` |
| Media per event | Total foto + video per event | ≥ 200 | `uploads` count |
| Upload success rate | Upload sukses ÷ upload dimulai | ≥ 97% | Event log `upload_started` vs `upload_completed` |
| Scan-to-upload conversion | Sesi yang mengunggah ÷ sesi yang membuka halaman | ≥ 45% | Analytics funnel |
| Time to first upload | Median durasi dari halaman terbuka sampai upload pertama sukses | ≤ 90 detik | Analytics |
| Uptime saat event window | Ketersediaan selama H-1 s.d. H+1 | ≥ 99.9% | Uptime monitor |
| P95 gallery load | Waktu muat galeri (50 item pertama) di 4G | ≤ 2.5 detik | RUM |
| Owner satisfaction | Skor 1–5 dari pengantin/WO pasca-acara | ≥ 4.3 | Survei |
| Archive download rate | Event yang mengunduh arsip ÷ total event | ≥ 80% | Log download |

### 4.3 Guardrail metrics

- Rasio konten yang dihapus moderator ≤ 3% (indikator spam/abuse).
- Biaya storage + bandwidth per event ≤ target margin *(isi angka bisnis)*.

---

## 5. Target Users

| Segmen | Peran | Kebutuhan Utama |
|---|---|---|
| **Pengantin** | Pemilik event | Semua dokumentasi terkumpul, mudah diunduh, bisa dimoderasi |
| **Keluarga inti** | Co-admin | Bantu kelola event dan moderasi saat pengantin sibuk |
| **Tamu undangan** | Kontributor | Unggah cepat tanpa hambatan; sebagian lansia dan gaptek |
| **Wedding Organizer** | Operator / reseller | Kelola banyak event, siapkan QR & layar, jual sebagai add-on |
| **Vendor dokumentasi** | Mitra | Mendapat aset tambahan; tidak merasa tersaingi |

### Konteks pemakaian

- Mayoritas akses dari **ponsel Android kelas menengah-bawah**, browser Chrome.
- Jaringan venue sering **4G lemah atau Wi-Fi jenuh**.
- Tamu memakai **satu tangan**, sambil berdiri, kadang membawa piring.
- Layar slideshow dijalankan dari **laptop WO** ke TV/proyektor.

---

## 6. Personas

### 6.1 Dinda — Pengantin, 28 tahun

Bekerja kantoran, merencanakan pernikahan sambil bekerja. Aktif di Instagram dan Pinterest. Sudah menyewa fotografer, tapi ingin "momen yang tidak sempat difoto".

- **Goal:** semua dokumentasi tamu terkumpul rapi tanpa dia harus menagih.
- **Frustrasi:** takut ada foto yang tidak pantas terpajang di layar acara.
- **Kebutuhan kunci:** moderasi, unduh massal, tampilan yang cocok dengan tema pernikahannya.

### 6.2 Pak Hendra — Tamu, 55 tahun

Kerabat jauh, membawa Android dengan penyimpanan hampir penuh. Tidak terbiasa install aplikasi baru dan tidak ingat password apa pun.

- **Goal:** membagikan 3 foto yang baru saja dia ambil.
- **Frustrasi:** halaman yang meminta login atau izin aneh langsung ditinggalkan.
- **Kebutuhan kunci:** tombol besar, instruksi satu kalimat, tidak ada langkah registrasi.

### 6.3 Rani — Wedding Organizer, 33 tahun

Menangani 4–6 acara per bulan. Datang paling pagi, pulang paling akhir. Menyiapkan meja registrasi dan layar.

- **Goal:** setup < 15 menit, tidak ada masalah teknis saat acara.
- **Frustrasi:** produk yang butuh penjelasan panjang ke tamu.
- **Kebutuhan kunci:** dashboard multi-event, QR siap cetak, mode slideshow satu klik.

---

## 7. User Journeys

### 7.1 Sebelum acara (H-30 s.d. H-1)

1. Pengantin/WO membuat akun dan event baru (nama pasangan, tanggal, venue, tema warna, foto sampul).
2. Sistem menghasilkan slug unik dan QR code.
3. Owner mengunduh QR dalam format PNG dan PDF siap cetak (A4, A5, dan table tent).
4. Owner mengatur privasi: galeri publik / butuh kode akses; moderasi otomatis atau manual.
5. Owner melakukan uji coba unggah untuk memastikan alur berjalan.

### 7.2 Saat acara (H)

1. Tamu memindai QR di meja atau banner.
2. Halaman event terbuka — sampul, nama pasangan, dan dua aksi utama: **Unggah Foto/Video** dan **Tulis Ucapan**.
3. Tamu memilih media dari galeri atau kamera; preview muncul; tekan kirim.
4. Upload berjalan di latar belakang dengan progress bar; tamu dapat menutup layar setelah upload selesai.
5. Media muncul di galeri real-time (atau masuk antrian moderasi jika mode manual aktif).
6. Slideshow di layar acara menampilkan media terbaru yang sudah disetujui.
7. Admin memantau dashboard live: jumlah upload, kontributor, item menunggu moderasi.

### 7.3 Setelah acara (H+1 s.d. H+90)

1. Owner meninjau seluruh galeri, menghapus item yang tidak diinginkan.
2. Owner mengunduh arsip ZIP resolusi asli (dibuat asynchronous, link dikirim via email).
3. Owner membagikan tautan galeri ke tamu.
4. H+60: notifikasi masa aktif akan berakhir; opsi perpanjang atau unduh ulang.
5. H+90: media dipindahkan ke cold storage sesuai kebijakan retensi.

---

## 8. Feature Overview

| ID | Fitur | Prioritas | Rilis |
|---|---|---|---|
| F1 | Event creation & dashboard admin | P0 | MVP |
| F2 | Akses tamu via QR & upload media | P0 | MVP |
| F3 | Pengelolaan media & moderasi | P0 | MVP |
| F4 | Galeri real-time & slideshow | P0 | MVP |
| F5 | Guestbook digital | P0 | MVP |
| F6 | Arsip & unduh massal | P0 | MVP |
| F7 | Analitik event | P1 | MVP |
| F8 | Multi-event & peran kolaborator | P1 | V1.1 |
| F9 | Kustomisasi tema lanjutan | P2 | V1.1 |

Prioritas mengikuti MoSCoW: **P0 = Must**, **P1 = Should**, **P2 = Could**.

---

## 9. F1 — Event Creation & Dashboard Admin

### 9.1 Deskripsi

Owner dapat membuat, mengonfigurasi, dan memantau event dari satu dashboard.

### 9.2 User stories

| ID | Story |
|---|---|
| F1-US1 | Sebagai owner, saya ingin membuat event dengan mengisi nama pasangan, tanggal, dan venue, agar halaman tamu langsung siap. |
| F1-US2 | Sebagai owner, saya ingin mengunggah foto sampul dan memilih tema warna, agar halaman terasa personal. |
| F1-US3 | Sebagai owner, saya ingin mengatur apakah galeri publik atau butuh kode akses. |
| F1-US4 | Sebagai owner, saya ingin memilih mode moderasi (auto-approve / manual review). |
| F1-US5 | Sebagai owner, saya ingin mengunduh QR code siap cetak dalam beberapa ukuran. |
| F1-US6 | Sebagai WO, saya ingin melihat daftar semua event saya beserta statusnya. |

### 9.3 Aturan bisnis

- Slug event dibuat dari nama pasangan + 6 karakter acak (`dinda-arya-k3n9pq`), unik global, tidak dapat diubah setelah ada upload pertama.
- Event memiliki status: `draft` → `active` → `archived`.
- Event otomatis `active` pada H-7 dan otomatis `archived` pada H+90.
- Kode akses berupa 6 karakter alfanumerik non-ambigu (tanpa 0/O, 1/I).
- Maksimum 3 kolaborator per event pada MVP.

### 9.4 Acceptance criteria

- [ ] Event dapat dibuat dalam ≤ 5 field wajib.
- [ ] QR code dihasilkan otomatis dan dapat diunduh sebagai PNG (1024px), SVG, dan PDF (A4/A5/table tent).
- [ ] Perubahan pengaturan tercermin di halaman tamu dalam ≤ 10 detik.
- [ ] Foto sampul otomatis dikompresi dan dibuatkan varian responsif.
- [ ] Dashboard menampilkan: total media, total kontributor, total ucapan, item pending moderasi.
- [ ] Percobaan membuat slug duplikat ditolak dengan pesan yang jelas.

---

## 10. F2 — Akses Tamu via QR & Upload Media

### 10.1 Deskripsi

Tamu mengakses halaman event tanpa registrasi dan mengunggah foto/video.

### 10.2 User stories

| ID | Story |
|---|---|
| F2-US1 | Sebagai tamu, saya ingin scan QR dan langsung sampai di halaman event tanpa login. |
| F2-US2 | Sebagai tamu, saya ingin memilih beberapa foto sekaligus dan mengunggahnya dalam satu aksi. |
| F2-US3 | Sebagai tamu, saya ingin mengambil foto langsung dari kamera. |
| F2-US4 | Sebagai tamu, saya ingin melihat progres unggahan dan tahu kapan selesai. |
| F2-US5 | Sebagai tamu, saya ingin upload otomatis dicoba ulang saat sinyal terputus. |
| F2-US6 | Sebagai tamu, saya ingin mencantumkan nama saya (opsional) agar pengantin tahu siapa pengirimnya. |

### 10.3 Aturan bisnis

| Aturan | Nilai |
|---|---|
| Format foto | JPEG, PNG, HEIC, WebP |
| Format video | MP4, MOV, WebM |
| Ukuran maks foto | 25 MB per file |
| Ukuran maks video | 200 MB per file / durasi ≤ 3 menit |
| Batas per upload batch | 20 file |
| Rate limit per sesi | 100 file per jam |
| Identitas tamu | Cookie `guest_session_id` (UUID, 90 hari) + nama opsional |
| Metode upload | Direct-to-R2 via presigned URL, multipart untuk file > 8 MB |

### 10.4 Penanganan kesalahan

| Kondisi | Perilaku |
|---|---|
| Koneksi terputus | Retry otomatis 3× dengan exponential backoff; state upload dipertahankan |
| File melebihi batas | Ditolak sebelum upload dimulai dengan pesan spesifik |
| Format tidak didukung | Ditolak dengan saran format alternatif |
| Presigned URL kedaluwarsa | Minta URL baru secara transparan, lanjutkan upload |
| Event tidak aktif / diarsipkan | Halaman menampilkan status, upload dinonaktifkan |
| Kode akses salah | Pesan kesalahan; rate limit 5 percobaan per 10 menit |

### 10.5 Acceptance criteria

- [ ] Halaman tamu dapat digunakan tanpa akun, tanpa install.
- [ ] LCP halaman tamu ≤ 2.0 detik pada 4G (Moto G Power baseline).
- [ ] Upload berjalan direct ke R2, tidak melalui server aplikasi.
- [ ] Upload melanjutkan otomatis setelah koneksi pulih dalam 30 detik.
- [ ] HEIC dari iPhone dikonversi ke JPEG untuk tampilan, file asli tetap disimpan.
- [ ] EXIF orientasi dihormati; EXIF lokasi GPS dihapus dari file yang ditampilkan publik.
- [ ] Tamu menerima konfirmasi visual eksplisit saat upload sukses.

---

## 11. F3 — Pengelolaan Media & Moderasi

### 11.1 User stories

| ID | Story |
|---|---|
| F3-US1 | Sebagai owner, saya ingin melihat antrian item yang menunggu persetujuan. |
| F3-US2 | Sebagai owner, saya ingin menyetujui atau menolak item secara massal. |
| F3-US3 | Sebagai owner, saya ingin menghapus media apa pun kapan pun. |
| F3-US4 | Sebagai owner, saya ingin menandai foto favorit untuk ditonjolkan. |
| F3-US5 | Sebagai owner, saya ingin menyembunyikan item dari slideshow tanpa menghapusnya. |
| F3-US6 | Sebagai tamu, saya ingin menghapus media yang baru saja saya unggah dalam sesi yang sama. |

### 11.2 Aturan bisnis

- Status media: `pending` → `approved` | `rejected` → `deleted`.
- Mode auto-approve: media langsung `approved`; mode manual: masuk `pending`.
- Penghapusan bersifat **soft delete** selama 30 hari, lalu dihapus permanen dari R2.
- Tamu hanya dapat menghapus media miliknya sendiri dalam 60 menit setelah upload.
- Slideshow hanya menarik item berstatus `approved` dan `visible_in_slideshow = true`.

### 11.3 Acceptance criteria

- [ ] Aksi moderasi tercermin di galeri dan slideshow dalam ≤ 3 detik.
- [ ] Aksi massal mendukung minimal 50 item sekaligus.
- [ ] Terdapat undo selama 10 detik setelah penghapusan.
- [ ] Semua aksi moderasi tercatat di audit log (aktor, waktu, item).
- [ ] Item terhapus tidak lagi dapat diakses lewat URL langsung.

---

## 12. F4 — Galeri Real-Time & Slideshow

### 12.1 User stories

| ID | Story |
|---|---|
| F4-US1 | Sebagai tamu, saya ingin melihat foto tamu lain muncul secara langsung. |
| F4-US2 | Sebagai tamu, saya ingin membuka foto ke tampilan penuh dan menggeser antar foto. |
| F4-US3 | Sebagai tamu, saya ingin menyaring galeri antara foto, video, dan ucapan. |
| F4-US4 | Sebagai WO, saya ingin membuka mode slideshow layar penuh untuk ditampilkan di TV. |
| F4-US5 | Sebagai WO, saya ingin slideshow tetap berjalan meski koneksi sempat terputus. |

### 12.2 Spesifikasi

**Galeri**

- Layout masonry, infinite scroll, halaman 30 item.
- Thumbnail WebP progresif dengan blur placeholder.
- Realtime melalui Supabase Realtime channel per event; item baru muncul dengan animasi masuk.
- Lightbox mendukung swipe, pinch-zoom, dan pemutaran video inline.

**Slideshow**

- Rasio 16:9, tanpa elemen navigasi, aman untuk proyektor.
- Interval default 6 detik, dapat diatur 3–15 detik.
- Transisi crossfade; Ken Burns opsional.
- Prioritas menampilkan item baru (masuk antrian depan), lalu rotasi acak dari arsip.
- Buffer lokal 20 item terakhir agar tetap berjalan saat koneksi putus.
- Overlay opsional: nama pengirim, ucapan terbaru, dan QR kecil di sudut.

### 12.3 Acceptance criteria

- [ ] Media baru muncul di galeri klien lain dalam ≤ 3 detik tanpa refresh.
- [ ] Slideshow berjalan ≥ 8 jam tanpa memory leak atau crash.
- [ ] Slideshow bertahan minimal 5 menit saat jaringan terputus, memakai buffer lokal.
- [ ] Galeri dengan 1.000 item tetap scroll mulus di perangkat kelas menengah.
- [ ] Video menampilkan durasi dan thumbnail poster sebelum diputar.

---

## 13. F5 — Guestbook Digital

### 13.1 User stories

| ID | Story |
|---|---|
| F5-US1 | Sebagai tamu, saya ingin menulis ucapan untuk pengantin. |
| F5-US2 | Sebagai tamu, saya ingin melampirkan foto pada ucapan saya. |
| F5-US3 | Sebagai tamu, saya ingin membaca ucapan tamu lain. |
| F5-US4 | Sebagai owner, saya ingin memoderasi ucapan seperti halnya media. |
| F5-US5 | Sebagai owner, saya ingin mengekspor semua ucapan ke PDF sebagai kenang-kenangan. |

### 13.2 Aturan bisnis

- Nama pengirim wajib, maksimum 60 karakter.
- Isi ucapan 1–500 karakter, plain text, emoji diizinkan.
- Filter kata terlarang dasar (daftar dapat dikonfigurasi) memindahkan ucapan ke `pending`.
- Maksimum 5 ucapan per sesi tamu.
- Ucapan dapat menyertakan maksimal 1 foto.

### 13.3 Acceptance criteria

- [ ] Ucapan tersimpan dan tampil di feed dalam ≤ 2 detik.
- [ ] Ekspor PDF menghasilkan dokumen berformat rapi dengan nama, ucapan, dan timestamp.
- [ ] Ucapan yang dimoderasi tidak muncul di slideshow maupun feed publik.

---

## 14. F6 — Arsip & Unduh Massal

### 14.1 User stories

| ID | Story |
|---|---|
| F6-US1 | Sebagai owner, saya ingin mengunduh semua media dalam resolusi asli sebagai ZIP. |
| F6-US2 | Sebagai owner, saya ingin mengunduh hanya item favorit. |
| F6-US3 | Sebagai owner, saya ingin mendapat notifikasi email saat arsip siap. |

### 14.2 Aturan bisnis

- Pembuatan ZIP dijalankan asynchronous sebagai background job.
- Arsip > 2 GB dipecah menjadi beberapa bagian.
- Link unduh presigned, berlaku 7 hari.
- Nama file mengikuti pola `YYYYMMDD-HHMMSS-namapengirim-<id>.<ext>`.
- Manifest CSV disertakan (nama file, pengirim, waktu unggah, tipe).

### 14.3 Acceptance criteria

- [ ] Arsip 500 item selesai diproses dalam ≤ 10 menit.
- [ ] Email notifikasi terkirim dengan link unduh yang valid.
- [ ] Arsip berisi file resolusi asli, bukan versi terkompresi.

---

## 15. F7 — Analitik Event

Dashboard menampilkan:

- Total media, total video, total ucapan, total kontributor unik.
- Grafik unggahan per jam (mengidentifikasi puncak aktivitas acara).
- Kontributor teratas.
- Jumlah scan QR vs sesi yang mengunggah (funnel konversi).
- Total penggunaan storage per event.

**Acceptance criteria**

- [ ] Data diperbarui setidaknya setiap 60 detik selama event aktif.
- [ ] Analitik dapat diekspor ke CSV.
- [ ] Tidak ada data personal tamu yang ditampilkan di luar nama yang mereka isi sendiri.

---

## 16. Information Architecture

### 16.1 Sitemap — Area Tamu (publik)

```
/[slug]                     Landing event — sampul, CTA unggah & ucapan
/[slug]/upload              Alur unggah media
/[slug]/gallery             Galeri real-time
/[slug]/gallery/[mediaId]   Lightbox (deep-linkable)
/[slug]/guestbook           Feed ucapan
/[slug]/guestbook/new       Form ucapan
/[slug]/unlock              Form kode akses (jika event terkunci)
```

### 16.2 Sitemap — Area Owner (terautentikasi)

```
/login
/dashboard                        Daftar event
/dashboard/events/new             Wizard pembuatan event
/dashboard/e/[id]                 Ringkasan & analitik event
/dashboard/e/[id]/media           Grid media + aksi massal
/dashboard/e/[id]/moderation      Antrian moderasi
/dashboard/e/[id]/guestbook       Kelola ucapan
/dashboard/e/[id]/qr              Unduh aset QR
/dashboard/e/[id]/settings        Pengaturan event, privasi, kolaborator
/dashboard/e/[id]/archive         Permintaan & riwayat unduh arsip
/present/[slug]                   Mode slideshow layar penuh
```

### 16.3 Navigasi

- **Tamu:** bottom navigation 3 item — Unggah, Galeri, Ucapan. Tanpa hamburger menu.
- **Owner:** sidebar di desktop, bottom tab di mobile.
- **Slideshow:** tanpa navigasi; keluar dengan `Esc`.

---

## 17. Database Design

Database: PostgreSQL via Supabase. Semua tabel mengaktifkan Row Level Security.

### 17.1 Skema

```sql
-- Pemilik & kolaborator
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  phone         text,
  role          text not null default 'owner',  -- owner | wo | admin
  created_at    timestamptz not null default now()
);

create table events (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references profiles(id) on delete cascade,
  slug                  text not null unique,
  couple_name           text not null,
  event_date            date not null,
  venue                 text,
  cover_image_key       text,
  theme                 jsonb not null default '{}'::jsonb,
  status                text not null default 'draft',      -- draft|active|archived
  visibility            text not null default 'public',     -- public|code
  access_code_hash      text,
  moderation_mode       text not null default 'auto',       -- auto|manual
  storage_bytes_used    bigint not null default 0,
  storage_quota_bytes   bigint not null default 21474836480, -- 20 GB
  archived_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index on events (owner_id);
create index on events (status, event_date);

create table event_collaborators (
  event_id   uuid not null references events(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role       text not null default 'moderator',  -- moderator|viewer
  created_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

-- Sesi tamu anonim
create table guest_sessions (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  display_name text,
  user_agent   text,
  ip_hash      text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index on guest_sessions (event_id);

-- Media
create table uploads (
  id                    uuid primary key default gen_random_uuid(),
  event_id              uuid not null references events(id) on delete cascade,
  guest_session_id      uuid references guest_sessions(id) on delete set null,
  uploader_name         text,
  media_type            text not null,          -- image|video
  storage_key           text not null,          -- object key di R2
  thumbnail_key         text,
  original_filename     text,
  mime_type             text not null,
  size_bytes            bigint not null,
  width                 int,
  height                int,
  duration_seconds      numeric(6,2),
  status                text not null default 'approved', -- pending|approved|rejected
  is_favorite           boolean not null default false,
  visible_in_slideshow  boolean not null default true,
  deleted_at            timestamptz,
  created_at            timestamptz not null default now()
);
create index on uploads (event_id, status, created_at desc);
create index on uploads (event_id, is_favorite) where deleted_at is null;
create index on uploads (guest_session_id);

-- Guestbook
create table guestbook_entries (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references events(id) on delete cascade,
  guest_session_id uuid references guest_sessions(id) on delete set null,
  author_name      text not null,
  message          text not null check (char_length(message) between 1 and 500),
  upload_id        uuid references uploads(id) on delete set null,
  status           text not null default 'approved',
  deleted_at       timestamptz,
  created_at       timestamptz not null default now()
);
create index on guestbook_entries (event_id, status, created_at desc);

-- Analitik ringan
create table event_analytics (
  id         bigserial primary key,
  event_id   uuid not null references events(id) on delete cascade,
  event_name text not null,   -- page_view|upload_started|upload_completed|upload_failed|qr_scan
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on event_analytics (event_id, event_name, created_at);

-- Audit moderasi
create table moderation_logs (
  id          bigserial primary key,
  event_id    uuid not null references events(id) on delete cascade,
  actor_id    uuid references profiles(id) on delete set null,
  target_type text not null,   -- upload|guestbook_entry
  target_id   uuid not null,
  action      text not null,   -- approve|reject|delete|restore|favorite
  created_at  timestamptz not null default now()
);

-- Job arsip
create table archive_jobs (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  requested_by uuid references profiles(id) on delete set null,
  scope        text not null default 'all',   -- all|favorites
  status       text not null default 'queued', -- queued|processing|ready|failed
  download_key text,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);
```

### 17.2 Row Level Security (contoh kebijakan)

| Tabel | Kebijakan |
|---|---|
| `events` | Owner & kolaborator dapat SELECT/UPDATE; publik hanya SELECT kolom terbatas untuk event `active` |
| `uploads` | Publik SELECT hanya `status='approved' and deleted_at is null` untuk event yang dapat diakses; INSERT lewat service role dari API route |
| `guestbook_entries` | Sama seperti `uploads` |
| `moderation_logs` | Hanya owner & kolaborator |
| `event_analytics` | Hanya owner; INSERT via service role |

Penulisan dari tamu dilakukan melalui API route yang memakai service role dan memvalidasi sesi tamu — bukan langsung dari klien — agar rate limit dan validasi terjamin.

### 17.3 Retensi

| Data | Retensi |
|---|---|
| Media aktif | 90 hari setelah tanggal acara (hot storage) |
| Media terarsip | Setelahnya dipindah ke kelas penyimpanan lebih murah |
| Soft-deleted media | 30 hari, lalu dihapus permanen |
| Analitik mentah | 180 hari, lalu diagregasi |
| Sesi tamu | 90 hari |

---

## 18. API Design

Base path: `/api/v1`. Format: JSON. Autentikasi owner: Supabase JWT (`Authorization: Bearer`). Autentikasi tamu: cookie `guest_session_id` + slug event.

### 18.1 Endpoint publik (tamu)

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/events/:slug` | Metadata event publik (nama, tema, status, apakah butuh kode) |
| `POST` | `/events/:slug/unlock` | Verifikasi kode akses, set cookie akses |
| `POST` | `/events/:slug/session` | Buat/segarkan sesi tamu, set nama tampilan |
| `POST` | `/events/:slug/uploads/presign` | Minta presigned URL untuk 1–20 file |
| `POST` | `/events/:slug/uploads/complete` | Konfirmasi upload selesai, buat record `uploads` |
| `GET` | `/events/:slug/media` | Daftar media (cursor pagination, filter tipe) |
| `DELETE` | `/events/:slug/media/:id` | Hapus media milik sesi sendiri (≤ 60 menit) |
| `GET` | `/events/:slug/guestbook` | Daftar ucapan |
| `POST` | `/events/:slug/guestbook` | Kirim ucapan |

### 18.2 Endpoint owner

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/events` | Daftar event milik owner |
| `POST` | `/events` | Buat event |
| `PATCH` | `/events/:id` | Perbarui pengaturan event |
| `GET` | `/events/:id/qr` | Aset QR (`?format=png\|svg\|pdf&size=a4\|a5\|tent`) |
| `GET` | `/events/:id/moderation` | Antrian item `pending` |
| `POST` | `/events/:id/moderation/bulk` | Aksi massal approve/reject/delete |
| `PATCH` | `/events/:id/media/:mediaId` | Ubah favorit / visibilitas slideshow |
| `GET` | `/events/:id/analytics` | Ringkasan metrik |
| `POST` | `/events/:id/archive` | Minta pembuatan arsip |
| `GET` | `/events/:id/archive/:jobId` | Status & link unduh arsip |
| `GET` | `/events/:id/guestbook/export` | Ekspor ucapan ke PDF |

### 18.3 Contoh — presign upload

**Request**

```http
POST /api/v1/events/dinda-arya-k3n9pq/uploads/presign
Content-Type: application/json

{
  "files": [
    { "filename": "IMG_2381.HEIC", "mimeType": "image/heic", "sizeBytes": 3841200 }
  ]
}
```

**Response `200`**

```json
{
  "uploads": [
    {
      "clientRef": "IMG_2381.HEIC",
      "uploadId": "0f2c...",
      "storageKey": "events/dinda-arya-k3n9pq/originals/0f2c....heic",
      "method": "PUT",
      "url": "https://<r2-endpoint>/...&X-Amz-Expires=900",
      "expiresIn": 900
    }
  ]
}
```

### 18.4 Format error

```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Ukuran file melebihi batas 25 MB.",
    "details": { "limitBytes": 26214400, "actualBytes": 41200000 }
  }
}
```

| Code | HTTP | Arti |
|---|---|---|
| `EVENT_NOT_FOUND` | 404 | Slug tidak dikenal |
| `EVENT_LOCKED` | 403 | Butuh kode akses |
| `EVENT_INACTIVE` | 409 | Event draft atau sudah diarsipkan |
| `FILE_TOO_LARGE` | 413 | Melebihi batas ukuran |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Format tidak didukung |
| `RATE_LIMITED` | 429 | Melebihi batas laju |
| `QUOTA_EXCEEDED` | 402 | Kuota storage event habis |

### 18.5 Realtime

Channel: `event:{eventId}`

| Payload event | Trigger |
|---|---|
| `media.created` | Media baru berstatus `approved` |
| `media.updated` | Perubahan status/visibilitas |
| `media.deleted` | Media dihapus |
| `guestbook.created` | Ucapan baru disetujui |

---

## 19. Cloudflare R2 Architecture

### 19.1 Struktur bucket

```
potret-media/
  events/{slug}/originals/{uploadId}.{ext}      # file asli, tidak diubah
  events/{slug}/derived/{uploadId}_800.webp     # thumbnail galeri
  events/{slug}/derived/{uploadId}_1600.webp    # lightbox
  events/{slug}/derived/{uploadId}_poster.webp  # poster video
  events/{slug}/cover/{hash}.webp
  events/{slug}/archives/{jobId}.zip
```

### 19.2 Alur upload

1. Klien meminta presigned URL ke API (validasi: event aktif, kuota tersisa, tipe & ukuran file).
2. Klien `PUT` langsung ke R2 (multipart bila > 8 MB). Server aplikasi tidak menyentuh byte media.
3. Klien memanggil `/uploads/complete`.
4. API memverifikasi objek ada di R2 (`HEAD`), membuat record, memancarkan event realtime.
5. Worker asinkron membuat turunan (thumbnail, poster video), membersihkan EXIF GPS, mengonversi HEIC → WebP/JPEG.
6. `events.storage_bytes_used` diperbarui.

### 19.3 Delivery

- Domain kustom `media.<domain>` di depan R2, cache Cloudflare CDN.
- Turunan disajikan publik dengan cache panjang (`max-age=31536000, immutable`) karena key berbasis ID unik.
- File asli hanya disajikan lewat presigned URL berumur pendek (15 menit) untuk owner.

### 19.4 Backup & lifecycle

| Kebijakan | Detail |
|---|---|
| Backup | Replikasi harian objek `originals/` ke bucket sekunder di region berbeda |
| Lifecycle | `archives/` dihapus 7 hari setelah dibuat; `derived/` dapat diregenerasi kapan saja |
| Cold storage | Setelah H+90, `originals/` pindah ke kelas infrequent access |
| Disaster recovery | RPO 24 jam, RTO 4 jam |
| Verifikasi | Uji restore sampel bulanan |

### 19.5 Pengendalian biaya

- R2 tidak mengenakan biaya egress, sehingga slideshow dan galeri berat tidak menaikkan biaya bandwidth.
- Kuota default 20 GB per event; peringatan pada 80% dan 95%.
- Kompresi turunan agresif (WebP q75) untuk menekan volume transfer klien.

---

## 20. Security & Privacy

### 20.1 Akses & autentikasi

- Owner: Supabase Auth (email magic link + Google OAuth). Sesi 30 hari.
- Tamu: anonim, diidentifikasi cookie `HttpOnly`, `SameSite=Lax`, `Secure`.
- Event terkunci: kode akses di-hash (Argon2id); cookie akses berumur sesuai masa aktif event.
- RLS aktif di seluruh tabel; penulisan tamu hanya lewat API route bersanitasi.

### 20.2 Perlindungan konten

| Ancaman | Mitigasi |
|---|---|
| Upload spam | Rate limit per IP hash & per sesi; batas file per batch |
| Konten tidak pantas | Mode moderasi manual; filter kata untuk teks; laporan cepat oleh owner |
| Enumerasi slug | Slug mengandung 6 karakter acak; tanpa endpoint listing publik |
| Hotlink media | Domain kustom + referrer policy; file asli hanya presigned |
| Malicious file | Validasi magic bytes, bukan hanya ekstensi; tolak SVG dan file eksekusi |
| Brute force kode akses | 5 percobaan / 10 menit per IP, lalu backoff |

### 20.3 Privasi data

- **Minimisasi data:** dari tamu hanya disimpan nama opsional, user agent, dan hash IP. Tidak ada email/telepon tamu.
- **EXIF:** metadata GPS dihapus dari semua turunan publik.
- **Persetujuan:** halaman tamu menampilkan pemberitahuan singkat bahwa media akan tampil di galeri dan layar acara.
- **Hak hapus:** tamu dapat menghapus miliknya dalam 60 menit; owner dapat menghapus kapan pun; permintaan penghapusan lanjutan ditangani lewat kontak support.
- **Transport:** TLS 1.2+ wajib; HSTS aktif.
- **Rahasia:** kredensial R2 dan service role key hanya di server, tidak pernah dikirim ke klien.

### 20.4 Kepatuhan

Selaras dengan prinsip UU PDP Indonesia: dasar pemrosesan, minimisasi, retensi terbatas, dan hak subjek data. *(Perlu tinjauan hukum sebelum rilis komersial.)*

---

## 21. Non-Functional Requirements

| Kategori | Persyaratan |
|---|---|
| Performa | LCP ≤ 2.0 s (4G, halaman tamu); TTI ≤ 3.5 s; P95 API ≤ 400 ms |
| Skalabilitas | 500 tamu konkuren per event; 50 event aktif bersamaan |
| Ketersediaan | 99.9% selama H-1 s.d. H+1 |
| Kompatibilitas | Chrome/Safari/Firefox/Samsung Internet 2 versi terakhir; Android 9+, iOS 15+ |
| Aksesibilitas | WCAG 2.1 AA (kontras, target sentuh, fokus, label) |
| Bahasa | Bahasa Indonesia (default); arsitektur i18n disiapkan |
| Observability | Error tracking, RUM, uptime monitor, alert saat upload success rate < 95% |
| Backup | Harian, retensi 30 hari, uji restore bulanan |

---

## 22. Development Roadmap

| Fase | Durasi | Cakupan | Exit Criteria |
|---|---|---|---|
| **Fase 1 — Fondasi** | Minggu 1–2 | Setup repo, Supabase, R2, CI/CD Vercel, skema DB, auth owner, design tokens | Deploy staging hijau; login owner berfungsi |
| **Fase 2 — Alur inti** | Minggu 3–5 | F1 event creation, generator QR, F2 halaman tamu & upload direct-to-R2, pipeline turunan | Tamu dapat scan dan upload di staging dari perangkat nyata |
| **Fase 3 — Galeri & moderasi** | Minggu 6–7 | F4 galeri realtime & lightbox, F3 moderasi, F5 guestbook | Media muncul realtime; owner dapat memoderasi |
| **Fase 4 — Presentasi & arsip** | Minggu 8–9 | Mode slideshow, F6 arsip ZIP, F7 analitik, ekspor PDF ucapan | Slideshow stabil 8 jam; arsip 500 item < 10 menit |
| **Fase 5 — Hardening & pilot** | Minggu 10 | Uji beban, uji lapangan di venue nyata, aksesibilitas, dokumentasi WO | Semua acceptance criteria P0 lulus; pilot 1 acara sukses |

**Dependensi kritis:** akun Cloudflare R2 + domain media aktif sebelum Fase 2; perangkat uji Android kelas menengah tersedia sebelum Fase 3.

---

## 23. Definition of Done (global)

Sebuah fitur dianggap selesai bila:

- [ ] Seluruh acceptance criteria fitur terpenuhi.
- [ ] Diuji di perangkat Android kelas menengah dan iPhone pada jaringan 4G ter-throttle.
- [ ] Tidak ada error konsol dan tidak ada regresi Lighthouse (Performance ≥ 85, Accessibility ≥ 95 pada halaman tamu).
- [ ] Menangani status kosong, loading, dan error dengan salinan teks berbahasa Indonesia yang jelas.
- [ ] Ditinjau kode dan sesuai design tokens pada dokumen desain.
- [ ] Analitik dan error tracking terpasang pada alur terkait.
- [ ] Dokumentasi singkat untuk WO diperbarui bila alur operasional berubah.

---

## 24. Risks & Mitigations

| Risiko | Dampak | Kemungkinan | Mitigasi |
|---|---|---|---|
| Jaringan venue buruk saat acara | Tinggi | Tinggi | Retry otomatis, buffer lokal slideshow, kompresi klien sebelum upload |
| Adopsi tamu rendah | Tinggi | Sedang | QR di banyak titik, ajakan dari MC, tampilan slideshow sebagai pemicu sosial |
| Biaya storage membengkak | Sedang | Sedang | Kuota per event, kompresi turunan, lifecycle cold storage |
| Konten tidak pantas tampil di layar | Tinggi | Rendah | Default moderasi manual untuk slideshow; tombol sembunyikan cepat |
| Slideshow crash saat acara | Tinggi | Rendah | Mode buffer offline, auto-reload watchdog, uji 8 jam |
| Ketergantungan vendor tunggal | Sedang | Rendah | Storage key abstrak, lapisan adapter S3-compatible |

---

## 25. Open Questions

| # | Pertanyaan | Pemilik | Batas Waktu |
|---|---|---|---|
| 1 | Model harga: per event, per GB, atau lisensi WO? | Bisnis | Sebelum Fase 3 |
| 2 | Apakah tamu boleh mengunduh media tamu lain? | Produk | Sebelum Fase 3 |
| 3 | Apakah butuh watermark opsional untuk vendor dokumentasi? | Produk | Sebelum V1.1 |
| 4 | Berapa lama masa aktif default yang layak secara biaya — 90 atau 180 hari? | Bisnis | Sebelum Fase 5 |
| 5 | Perlukah moderasi otomatis berbasis ML sejak awal? | Teknis | Sebelum V1.1 |

---

## 26. Future Roadmap

| Versi | Fitur | Nilai |
|---|---|---|
| V1.1 | Multi-event & peran kolaborator lanjutan | Menyasar WO sebagai reseller |
| V1.1 | Kustomisasi tema lanjutan (font, layout sampul) | Diferensiasi & upsell |
| V1.2 | AI photo search — cari "foto saya", cari per orang/adegan | Nilai retensi pasca-acara |
| V1.2 | RSVP terintegrasi | Memperluas cakupan ke pra-acara |
| V1.3 | Undangan digital dengan QR terpadu | Satu produk untuk seluruh siklus |
| V1.3 | Album cetak & integrasi mitra percetakan | Sumber pendapatan tambahan |
| V2.0 | Highlight reel otomatis dari video tamu | Nilai kejutan pasca-acara |

---

## Appendix A — Glosarium

| Istilah | Arti |
|---|---|
| Event | Satu acara pernikahan dengan slug, galeri, dan QR sendiri |
| Owner | Pemilik akun event (pengantin atau WO) |
| Sesi tamu | Identitas anonim berbasis cookie untuk kontributor |
| Turunan (derived) | Versi terkompresi dari file asli untuk tampilan web |
| Slideshow | Mode layar penuh untuk ditampilkan di layar acara |
| Slug | Identifier unik event pada URL |

# Design Guidelines — Potret Pernikahan

| Field | Value |
|---|---|
| Versi | 1.0 |
| Tanggal | 4 Agustus 2026 |
| Cakupan | Design principles, tokens, komponen, spesifikasi layar, aset cetak |
| Dokumen Terkait | `PRD-Potret-Pernikahan-v2.md` |

Dokumen ini adalah acuan desain. PRD menetapkan **apa** yang dibangun; dokumen ini menetapkan **seperti apa** tampilan dan rasanya.

---

## 1. Design Principles

### 1.1 Elegan, bukan ramai

Produk ini hadir di hari paling penting dalam hidup seseorang. Antarmuka harus terasa seperti undangan cetak berkualitas: lapang, tenang, dan tidak berebut perhatian dengan momen yang sedang berlangsung.

### 1.2 Konten adalah bintangnya

Foto tamu yang harus terlihat menonjol, bukan chrome antarmuka. Kurangi border, bayangan berat, dan aksen berwarna yang tidak perlu. Biarkan warna datang dari foto.

### 1.3 Satu aksi jelas per layar

Tamu memakai satu tangan sambil berdiri. Setiap layar memiliki satu tindakan utama yang tidak mungkin terlewat. Tindakan sekunder disamarkan secara visual.

### 1.4 Ramah untuk semua usia

Tamu berusia 60 tahun harus bisa memakainya tanpa dibantu. Ukuran teks minimum lebih besar dari standar konsumen, target sentuh besar, dan tidak ada gestur tersembunyi.

### 1.5 Jujur tentang keadaan

Progres upload, kegagalan koneksi, dan status moderasi ditampilkan apa adanya. Tidak ada spinner tanpa keterangan. Tamu perlu tahu foto mereka sudah aman terkirim.

---

## 2. Brand & Art Direction

**Mood:** hangat, lembut, sedikit sinematik. Referensi rasa: kertas linen, cahaya sore, emas tembaga tipis.

**Yang dihindari:**

- Palet neon atau gradien SaaS generik.
- Ikon kartun dan ilustrasi bergaya "startup blob".
- Tipografi tebal padat bergaya teknologi.
- Efek glassmorphism berat yang mengganggu keterbacaan foto.

**Nada tulisan:** hangat dan sopan, tanpa bahasa gaul berlebihan. Sapaan netral "Anda". Kalimat pendek.

Contoh:

| Konteks | ✗ Hindari | ✓ Gunakan |
|---|---|---|
| CTA upload | "Upload sekarang juga!!" | "Bagikan Foto Anda" |
| Sukses | "Yeay berhasil 🎉🎉🎉" | "Terkirim. Terima kasih!" |
| Error | "Terjadi kesalahan" | "Koneksi terputus. Kami akan mencoba lagi otomatis." |
| Kosong | "No data" | "Belum ada foto. Jadilah yang pertama berbagi." |

---

## 3. Design Tokens

Seluruh nilai di bawah diimplementasikan sebagai CSS custom properties dan dipetakan ke konfigurasi Tailwind. **Tidak boleh ada nilai hardcoded di komponen.**

### 3.1 Warna — Palet inti

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-ink-900` | `#1C1917` | Teks utama, latar slideshow |
| `--color-ink-700` | `#44403C` | Teks sekunder |
| `--color-ink-500` | `#78716C` | Teks tersier, placeholder |
| `--color-ink-300` | `#D6D3D1` | Border, pemisah |
| `--color-ink-100` | `#F5F5F4` | Latar sekunder |
| `--color-canvas` | `#FDFBF7` | Latar utama (warm off-white) |
| `--color-surface` | `#FFFFFF` | Kartu, sheet |

### 3.2 Warna — Aksen

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-primary-600` | `#9A6A4F` | Aksi utama (terracotta/tembaga) |
| `--color-primary-700` | `#7E5540` | Hover / pressed |
| `--color-primary-100` | `#F4E9E1` | Latar lembut, badge |
| `--color-accent-500` | `#C9A227` | Aksen emas — hemat, hanya untuk highlight & favorit |

### 3.3 Warna — Semantik

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-success` | `#3F7D57` | Upload sukses, status disetujui |
| `--color-warning` | `#B0761C` | Kuota hampir habis, menunggu moderasi |
| `--color-danger` | `#A8382F` | Hapus, kesalahan |
| `--color-info` | `#3F6C8C` | Notifikasi netral |

### 3.4 Tema per event

Owner memilih satu dari preset tema. Tema **hanya** mengubah `--color-primary-*` dan warna sampul; struktur dan warna netral tetap sama demi konsistensi dan aksesibilitas.

| Preset | Primary | Karakter |
|---|---|---|
| Terracotta *(default)* | `#9A6A4F` | Hangat, netral |
| Sage | `#6B7F63` | Botani, outdoor |
| Dusty Rose | `#A9707A` | Romantis lembut |
| Navy | `#3A4A6B` | Formal, malam |
| Emas Klasik | `#9C7B3C` | Tradisional |

### 3.5 Tipografi

| Token | Nilai |
|---|---|
| `--font-display` | `"Fraunces", Georgia, serif` — untuk nama pasangan & judul besar |
| `--font-body` | `"Inter", system-ui, sans-serif` — untuk seluruh UI |

**Skala (mobile-first):**

| Token | Ukuran / Line-height | Weight | Penggunaan |
|---|---|---|---|
| `--text-display` | 40 / 44 px | 600 | Nama pasangan di sampul |
| `--text-h1` | 28 / 34 px | 600 | Judul halaman |
| `--text-h2` | 22 / 28 px | 600 | Judul bagian |
| `--text-h3` | 18 / 24 px | 600 | Judul kartu |
| `--text-body` | 16 / 24 px | 400 | Teks default — **jangan turun di bawah ini** |
| `--text-body-lg` | 18 / 28 px | 400 | Isi ucapan guestbook |
| `--text-caption` | 14 / 20 px | 400 | Metadata, keterangan |
| `--text-micro` | 12 / 16 px | 500 | Label badge saja |

Aturan: maksimum dua ukuran font display per layar; `--font-display` tidak pernah dipakai untuk teks berjalan lebih dari dua baris.

### 3.6 Spasi

Skala 4px: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80`.

| Token | Nilai | Penggunaan |
|---|---|---|
| `--space-xs` | 4px | Jarak ikon–label |
| `--space-sm` | 8px | Dalam komponen padat |
| `--space-md` | 16px | Padding standar kartu |
| `--space-lg` | 24px | Antar blok |
| `--space-xl` | 40px | Antar bagian halaman |
| `--space-2xl` | 64px | Ruang di atas/bawah bagian besar |

Padding tepi layar mobile: 20px. Lebar konten maksimum di desktop: 1120px; kolom teks maksimum 68ch.

### 3.7 Radius & elevasi

| Token | Nilai |
|---|---|
| `--radius-sm` | 8px — badge, input kecil |
| `--radius-md` | 12px — tombol, input |
| `--radius-lg` | 16px — kartu, thumbnail |
| `--radius-xl` | 24px — bottom sheet, modal |
| `--radius-full` | 999px — avatar, pil |

| Token | Nilai |
|---|---|
| `--shadow-sm` | `0 1px 2px rgba(28,25,23,.06)` |
| `--shadow-md` | `0 4px 12px rgba(28,25,23,.08)` |
| `--shadow-lg` | `0 12px 32px rgba(28,25,23,.12)` |

Elevasi dipakai hemat. Kartu galeri **tidak** memakai shadow — pemisahan cukup lewat spasi.

### 3.8 Motion

| Token | Nilai | Penggunaan |
|---|---|---|
| `--ease-standard` | `cubic-bezier(.2,0,0,1)` | Transisi umum |
| `--ease-enter` | `cubic-bezier(0,0,.2,1)` | Elemen masuk |
| `--duration-fast` | 150ms | Hover, tekan |
| `--duration-base` | 250ms | Sheet, dropdown |
| `--duration-slow` | 400ms | Lightbox, transisi halaman |
| `--duration-slide` | 800ms | Crossfade slideshow |

Wajib menghormati `prefers-reduced-motion`: nonaktifkan Ken Burns, transisi masuk, dan parallax; ganti dengan fade sederhana ≤ 150ms.

### 3.9 Ikonografi

- Set: garis (stroke), ketebalan 1.5px, ujung membulat.
- Ukuran: 20px (inline), 24px (tombol), 28px (navigasi).
- Ikon selalu didampingi label teks pada alur tamu. Ikon tanpa label hanya diperbolehkan di dashboard owner, dengan `aria-label`.

---

## 4. Layout & Grid

| Breakpoint | Lebar | Kolom | Gutter |
|---|---|---|---|
| `sm` | < 640px | 4 | 16px |
| `md` | 640–1023px | 8 | 20px |
| `lg` | 1024–1439px | 12 | 24px |
| `xl` | ≥ 1440px | 12 (maks 1120px) | 24px |

**Galeri masonry:**

| Breakpoint | Kolom | Gap |
|---|---|---|
| < 480px | 2 | 8px |
| 480–767px | 3 | 12px |
| 768–1199px | 4 | 16px |
| ≥ 1200px | 5 | 16px |

**Safe area:** hormati `env(safe-area-inset-bottom)` untuk bottom navigation dan tombol melayang.

---

## 5. Component Specifications

### 5.1 Button

| Varian | Latar | Teks | Penggunaan |
|---|---|---|---|
| Primary | `--color-primary-600` | putih | Satu per layar |
| Secondary | transparan, border `--color-ink-300` | `--color-ink-900` | Aksi pendamping |
| Ghost | transparan | `--color-ink-700` | Aksi tersier |
| Danger | transparan, teks `--color-danger` | — | Hapus |

| Ukuran | Tinggi | Padding-x | Teks |
|---|---|---|---|
| Large | 56px | 24px | 18px |
| Medium | 48px | 20px | 16px |
| Small | 40px | 16px | 14px |

Aturan:
- Tombol utama di alur tamu **selalu** ukuran Large dan lebar penuh pada mobile.
- Target sentuh minimum 48×48px, jarak antar target minimum 8px.
- Status: default, hover, pressed (skala 0.98), focus (ring 2px offset 2px), disabled (opasitas 40%), loading (spinner + teks tetap terbaca).

### 5.2 Upload Card / Dropzone

- Area besar dengan border putus-putus `--color-ink-300`, radius `--radius-lg`, tinggi minimum 180px.
- Isi: ikon kamera 32px, judul "Bagikan Foto & Video", subteks batasan format & ukuran.
- Dua tombol: **Pilih dari Galeri** (primary) dan **Ambil Foto** (secondary).
- Setelah file dipilih: berubah menjadi daftar preview dengan thumbnail 64px, nama file terpotong, progress bar per file, dan tombol batal.
- Progress bar: tinggi 4px, radius penuh, warna `--color-primary-600`, latar `--color-ink-100`.
- Kondisi sukses: ikon centang `--color-success` + teks "Terkirim".
- Kondisi gagal: baris berubah ke `--color-danger` dengan tombol "Coba Lagi".

### 5.3 Media Tile (galeri)

- Rasio menyesuaikan media asli (masonry), radius `--radius-lg`, `object-fit: cover`.
- Placeholder blur (LQIP) sebelum gambar termuat.
- Badge video: pil gelap semi transparan di kanan bawah berisi ikon play + durasi.
- Badge favorit: bintang `--color-accent-500` di kanan atas, hanya di tampilan owner.
- Overlay nama pengirim muncul di 20% bawah dengan gradien gelap, hanya bila nama diisi.
- Hover (desktop): skala 1.02 dengan `--duration-fast`. Tidak ada efek hover di mobile.

### 5.4 Lightbox

- Latar `rgba(28,25,23,.94)`, tanpa blur berat demi performa.
- Media dipusatkan, maksimal 92vw × 84vh.
- Kontrol: tutup (kiri atas), navigasi prev/next (desktop), indikator posisi "12 dari 340".
- Bar bawah: nama pengirim, waktu unggah, dan aksi owner (favorit, sembunyikan, hapus).
- Gestur: swipe horizontal untuk berpindah, swipe ke bawah untuk menutup, pinch untuk zoom.
- Preload media berikutnya dan sebelumnya.

### 5.5 Guestbook Entry Card

- Latar `--color-surface`, radius `--radius-lg`, padding 20px.
- Nama pengirim: `--text-h3`, `--font-body`, weight 600.
- Isi ucapan: `--text-body-lg`, `--color-ink-700`, maksimum 68ch.
- Timestamp relatif: `--text-caption`, `--color-ink-500` ("2 jam lalu").
- Bila menyertakan foto: thumbnail 80×80px radius `--radius-md` di kiri.
- Aksen dekoratif: garis tipis 2px `--color-primary-100` di sisi kiri kartu.

### 5.6 Bottom Navigation (tamu)

- Tinggi 64px + safe area, latar `--color-surface`, border atas 1px `--color-ink-300`.
- Tiga item: Unggah, Galeri, Ucapan — masing-masing ikon 24px + label 12px.
- Item aktif: ikon dan label `--color-primary-600`; item nonaktif `--color-ink-500`.
- Selalu terlihat pada halaman tamu; tersembunyi di lightbox dan slideshow.

### 5.7 Empty, Loading, Error States

Setiap daftar wajib punya tiga status, dengan ilustrasi garis sederhana monokrom (tanpa maskot).

| Status | Judul | Aksi |
|---|---|---|
| Galeri kosong | "Belum ada foto di sini" | Tombol "Bagikan Foto Pertama" |
| Guestbook kosong | "Belum ada ucapan" | Tombol "Tulis Ucapan" |
| Loading | Skeleton masonry 6 tile dengan shimmer halus | — |
| Offline | "Koneksi terputus" + subteks bahwa unggahan akan dilanjutkan | Tombol "Coba Lagi" |
| Event terkunci | "Acara ini butuh kode akses" | Input kode 6 karakter |

### 5.8 Toast & Feedback

- Muncul di atas bottom navigation, lebar penuh dikurangi margin 20px.
- Durasi 4 detik; toast dengan aksi undo 10 detik.
- Maksimum satu toast dalam satu waktu; toast baru menggantikan yang lama.
- Ikon status di kiri, teks di tengah, aksi teks di kanan.

---

## 6. Key Screen Specifications

### 6.1 Halaman Landing Tamu (`/[slug]`)

```
┌──────────────────────────────┐
│  Foto sampul 16:9            │  gradien gelap di 40% bawah
│                              │
│  Dinda & Arya                │  --text-display, putih
│  12 Oktober 2026 · Bandung   │  --text-caption, putih 80%
├──────────────────────────────┤
│  [ Bagikan Foto & Video ]    │  Primary, Large, full-width
│  [ Tulis Ucapan ]            │  Secondary, Large, full-width
├──────────────────────────────┤
│  Galeri Terbaru        Lihat │  --text-h2 + link
│  ▢ ▢ ▢                       │  3 thumbnail terbaru
├──────────────────────────────┤
│  Ucapan Terbaru              │
│  [kartu ucapan]              │
└──────────────────────────────┘
   [ Unggah | Galeri | Ucapan ]
```

Aturan:
- Foto sampul dimuat sebagai LCP element dengan `priority`; tidak ada animasi masuk di atasnya.
- Nama pasangan dan CTA utama harus terlihat tanpa scroll di layar 360×640.
- Tidak ada modal, popup, atau permintaan izin apa pun sebelum interaksi pertama.

### 6.2 Alur Unggah

Tiga langkah, tanpa halaman perantara:

1. **Pilih** — dropzone / picker native.
2. **Tinjau** — daftar preview, kolom nama opsional ("Nama Anda — boleh dikosongkan"), tombol "Kirim".
3. **Selesai** — konfirmasi jelas, jumlah file terkirim, dan dua pilihan: "Unggah Lagi" atau "Lihat Galeri".

Aturan: upload berjalan di latar; tamu boleh berpindah tab dalam aplikasi tanpa membatalkan proses. Progres global tampil sebagai bar tipis di bawah header.

### 6.3 Mode Slideshow (`/present/[slug]`)

- Latar `--color-ink-900` penuh, tanpa border.
- Media di-`contain` dalam bingkai 16:9 agar tidak terpotong.
- Overlay bawah kiri: nama pengirim, `--text-h3`, putih, dengan bayangan teks halus.
- Overlay bawah kanan: QR kecil 120px + teks "Pindai untuk ikut berbagi".
- Overlay atas kanan (opsional): ucapan terbaru, muncul 8 detik lalu memudar.
- Transisi crossfade 800ms; Ken Burns lambat opsional (skala 1.0 → 1.06 selama durasi tayang).
- Kontrol tersembunyi; muncul saat mouse bergerak, hilang setelah 3 detik. `Esc` untuk keluar, spasi untuk jeda.
- Wajib diuji pada proyektor dengan kontras rendah: hindari teks abu-abu di bawah 70% putih.

### 6.4 Dashboard Owner

- Struktur: sidebar kiri (desktop) / bottom tab (mobile).
- Kartu ringkasan di baris atas: Total Media, Kontributor, Ucapan, Menunggu Moderasi.
- Angka besar `--text-h1` dengan label `--text-caption`; tanpa warna aksen kecuali "Menunggu Moderasi" > 0 → `--color-warning`.
- Grid media dengan mode seleksi: tap-and-hold di mobile, checkbox di desktop; action bar muncul dari bawah saat ada item terpilih.
- Antrian moderasi: tampilan kartu besar satu per satu di mobile (approve/reject cepat), grid di desktop.

---

## 7. Aset QR & Cetak

QR adalah titik masuk utama produk. Kualitas cetaknya menentukan tingkat pemindaian.

| Aspek | Spesifikasi |
|---|---|
| Error correction | Level H (30%) agar tetap terbaca meski tergores atau tertutup sebagian |
| Ukuran minimum cetak | 3 × 3 cm; direkomendasikan 5 × 5 cm untuk table tent |
| Quiet zone | Minimum 4 modul di semua sisi |
| Warna | Modul `--color-ink-900` di atas putih. **Jangan** memakai warna terang, gradien, atau QR terbalik (terang di atas gelap) |
| Logo di tengah | Opsional, maksimum 20% luas, hanya bila error correction H |
| Format ekspor | PNG 1024px (transparan), SVG vektor, PDF siap cetak |

**Template cetak yang disediakan:**

| Template | Ukuran | Isi |
|---|---|---|
| Table tent | 10 × 15 cm, lipat | Nama pasangan, QR, satu baris instruksi |
| Poster A5 | 148 × 210 mm | Sampul, QR besar, tiga langkah instruksi |
| Poster A4 | 210 × 297 mm | Versi standing banner meja registrasi |
| Sisipan undangan | 9 × 5 cm | QR + URL teks sebagai fallback |

**Salinan instruksi standar (maksimum tiga baris):**

> **Bagikan Momen Anda**
> Pindai kode ini untuk mengunggah foto & video.
> Tanpa aplikasi. Tanpa daftar akun.

URL teks (`potret.id/dinda-arya`) selalu dicantumkan di bawah QR sebagai cadangan untuk tamu yang kesulitan memindai.

---

## 8. Accessibility Checklist

Target: **WCAG 2.1 AA**.

- [ ] Kontras teks normal ≥ 4.5:1; teks besar (≥ 24px) ≥ 3:1.
- [ ] Kontras komponen UI dan indikator status ≥ 3:1.
- [ ] Target sentuh ≥ 48×48px dengan jarak antar target ≥ 8px.
- [ ] Seluruh fungsi dapat diakses lewat keyboard; urutan fokus logis.
- [ ] Indikator fokus terlihat jelas (ring 2px, offset 2px), tidak pernah `outline: none` tanpa pengganti.
- [ ] Setiap gambar galeri memiliki `alt` deskriptif ("Foto dari Hendra, diunggah pukul 19.42").
- [ ] Perubahan realtime diumumkan lewat `aria-live="polite"`, tidak mengganggu pembacaan.
- [ ] Video tidak autoplay dengan suara.
- [ ] `prefers-reduced-motion` dihormati di seluruh animasi, termasuk slideshow.
- [ ] Ukuran teks dapat diperbesar hingga 200% tanpa konten terpotong.
- [ ] Warna tidak menjadi satu-satunya penanda status (selalu disertai ikon atau teks).
- [ ] Form memiliki label eksplisit, bukan hanya placeholder.
- [ ] Pesan error diasosiasikan ke input dengan `aria-describedby`.

---

## 9. Responsive & Performance Rules

| Aturan | Detail |
|---|---|
| Mobile-first | Desain dan implementasi dimulai dari 360px |
| Gambar | `srcset` dengan varian 400/800/1600px; format WebP dengan fallback JPEG |
| LQIP | Placeholder blur base64 ≤ 1 KB pada setiap tile |
| Lazy load | Semua media di bawah lipatan; `loading="lazy"` + IntersectionObserver untuk masonry |
| Font | Maksimum 2 keluarga, 3 weight total; `font-display: swap`; subset Latin |
| Bundle | JS halaman tamu ≤ 180 KB gzip |
| CLS | ≤ 0.1 — semua media memiliki dimensi eksplisit atau rasio aspek |
| Skeleton | Selalu sesuai bentuk konten akhir untuk mencegah pergeseran layout |

---

## 10. Implementation Notes

**Struktur token**

```css
:root {
  /* palet netral & semantik — tetap di semua tema */
  --color-canvas: #FDFBF7;
  --color-ink-900: #1C1917;
  /* ... */

  /* diinjeksi per event dari events.theme */
  --color-primary-600: #9A6A4F;
  --color-primary-700: #7E5540;
  --color-primary-100: #F4E9E1;
}
```

Tema event diinjeksikan sebagai inline style pada elemen root halaman tamu saat server render — bukan lewat class — agar tidak ada kedipan warna (FOUC) saat halaman dimuat.

**Aturan komponen**

- Komponen tidak boleh menerima prop warna mentah; hanya varian semantik (`variant="primary"`).
- Setiap komponen wajib mendefinisikan status: default, hover, focus, active, disabled, loading, error.
- Komponen alur tamu tidak boleh bergantung pada hover untuk mengungkap informasi penting.

**Checklist review desain sebelum merge**

- [ ] Tidak ada nilai warna, spasi, atau radius hardcoded.
- [ ] Semua status komponen tersedia dan diuji.
- [ ] Diperiksa pada 360px, 768px, dan 1440px.
- [ ] Diperiksa dengan `prefers-reduced-motion` aktif.
- [ ] Kontras diverifikasi dengan alat, bukan perkiraan.
- [ ] Salinan teks berbahasa Indonesia sesuai panduan nada di bagian 2.

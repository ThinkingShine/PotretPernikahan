import { useState } from "react"
import { Button } from "./components/Button"
import { Input, Textarea } from "./components/Input"
import { Card } from "./components/Card"
import { Badge } from "./components/Badge"
import { Toast } from "./components/Toast"
import { BottomNav } from "./components/BottomNav"
import { EmptyState } from "./components/EmptyState"
import { Skeleton } from "./components/Skeleton"
import GuestLanding from "./GuestLanding"
import UploadFlow from "./UploadFlow"
import GalleryScreen from "./GalleryScreen"
import GuestbookScreen from "./GuestbookScreen"

export default function App() {
  const [view, setView] = useState<"landing" | "upload" | "gallery" | "guestbook" | "library">("landing")
  const [activeNav, setActiveNav] = useState<"upload" | "gallery" | "guestbook">("gallery")
  const [toastVisible, setToastVisible] = useState(false)
  const [toastType, setToastType] = useState<"success" | "warning" | "danger" | "info">("success")

  function showToast(type: typeof toastType) {
    setToastType(type)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 4000)
  }

  type AppView = "landing" | "upload" | "gallery" | "guestbook" | "library"

  const TAB_VIEWS = ["landing", "upload", "gallery", "guestbook"] as const
  type TabView = typeof TAB_VIEWS[number]

  const TAB_LABELS: Record<TabView, string> = {
    landing: "Home",
    upload: "Upload",
    gallery: "Galeri",
    guestbook: "Ucapan",
  }

  const TAB_ICONS: Record<TabView, React.ReactNode> = {
    landing: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    upload: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
    gallery: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
    guestbook: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  }

  const DevTabBar = () => (
    <nav
      aria-label="Navigasi demo"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        height: "calc(60px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
        backgroundColor: "var(--color-surface)",
        borderTop: "1px solid var(--color-ink-300)",
        display: "flex",
        boxShadow: "0 -2px 12px rgba(28,25,23,.07)",
      }}
    >
      {TAB_VIEWS.map(v => {
        const isActive = view === v
        return (
          <button
            key={v}
            onClick={() => setView(v as AppView)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              border: "none",
              background: "none",
              cursor: "pointer",
              color: isActive ? "var(--color-primary-600)" : "var(--color-ink-500)",
              fontFamily: "var(--font-body)",
              transition: "color var(--duration-fast) var(--ease-standard)",
              minHeight: 48,
            }}
          >
            {TAB_ICONS[v]}
            <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400, lineHeight: 1 }}>
              {TAB_LABELS[v]}
            </span>
          </button>
        )
      })}
    </nav>
  )

  if (view === "landing") return <><GuestLanding /><DevTabBar /></>
  if (view === "upload") return <><UploadFlow /><DevTabBar /></>
  if (view === "gallery") return <><GalleryScreen /><DevTabBar /></>
  if (view === "guestbook") return <><GuestbookScreen /><DevTabBar /></>

  return (
    <div style={{ backgroundColor: "var(--color-canvas)", minHeight: "100vh", fontFamily: "var(--font-body)" }}>
      {/* Page header */}
      <header style={{ backgroundColor: "var(--color-surface)", borderBottom: "1px solid var(--color-ink-300)", padding: "20px var(--space-screen-edge)", position: "sticky", top: 0, zIndex: 50, boxShadow: "var(--shadow-sm)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setView("landing")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 12 }}
          >
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-full)", backgroundColor: "var(--color-primary-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-600)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "var(--color-ink-900)", letterSpacing: "-0.01em" }}>Potret Pernikahan</span>
          </button>
          <button
            onClick={() => setView("landing")}
            style={{
              marginLeft: "auto",
              fontSize: 11,
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              color: "var(--color-ink-500)",
              backgroundColor: "transparent",
              border: "1px solid var(--color-ink-300)",
              borderRadius: "var(--radius-full)",
              padding: "4px 12px",
              cursor: "pointer",
            }}
          >
            ← Home
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px var(--space-screen-edge) 120px" }}>

        {/* ── SECTION: Tipografi ── */}
        <Section title="Tipografi" subtitle="Fraunces untuk judul display, Inter untuk seluruh UI">
          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <Label>Display — Fraunces 600, 40/44</Label>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-display-size)", lineHeight: "var(--text-display-lh)", fontWeight: "var(--text-display-w)", color: "var(--color-ink-900)", marginTop: 4 }}>Dinda &amp; Arya</p>
              </div>
              <Divider />
              <div>
                <Label>H1 — Inter 600, 28/34</Label>
                <p style={{ fontSize: "var(--text-h1-size)", lineHeight: "var(--text-h1-lh)", fontWeight: "var(--text-h1-w)", color: "var(--color-ink-900)", marginTop: 4 }}>Galeri Foto Pernikahan</p>
              </div>
              <div>
                <Label>H2 — Inter 600, 22/28</Label>
                <p style={{ fontSize: "var(--text-h2-size)", lineHeight: "var(--text-h2-lh)", fontWeight: "var(--text-h2-w)", color: "var(--color-ink-900)", marginTop: 4 }}>Bagikan Momen Anda</p>
              </div>
              <div>
                <Label>H3 — Inter 600, 18/24</Label>
                <p style={{ fontSize: "var(--text-h3-size)", lineHeight: "var(--text-h3-lh)", fontWeight: "var(--text-h3-w)", color: "var(--color-ink-900)", marginTop: 4 }}>Unggahan Terbaru</p>
              </div>
              <Divider />
              <div>
                <Label>Body LG — Inter 400, 18/28</Label>
                <p style={{ fontSize: "var(--text-body-lg-size)", lineHeight: "var(--text-body-lg-lh)", color: "var(--color-ink-700)", marginTop: 4 }}>Terima kasih telah hadir dan membagikan momen indah ini bersama kami. Setiap foto adalah kenangan yang akan kami jaga selamanya.</p>
              </div>
              <div>
                <Label>Body — Inter 400, 16/24</Label>
                <p style={{ fontSize: "var(--text-body-size)", lineHeight: "var(--text-body-lh)", color: "var(--color-ink-700)", marginTop: 4 }}>Pindai kode QR di meja Anda untuk mulai berbagi foto dan video. Tidak perlu akun atau aplikasi tambahan.</p>
              </div>
              <div style={{ display: "flex", gap: 32 }}>
                <div>
                  <Label>Caption — 14/20</Label>
                  <p style={{ fontSize: "var(--text-caption-size)", lineHeight: "var(--text-caption-lh)", color: "var(--color-ink-500)", marginTop: 4 }}>12 Oktober 2026 · Bandung</p>
                </div>
                <div>
                  <Label>Micro — 12/16 w500</Label>
                  <p style={{ fontSize: "var(--text-micro-size)", lineHeight: "var(--text-micro-lh)", fontWeight: "var(--text-micro-w)", color: "var(--color-ink-500)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Disetujui</p>
                </div>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── SECTION: Warna ── */}
        <Section title="Warna" subtitle="Token CSS — tidak ada nilai hardcoded di komponen">
          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <Label>Palet Netral</Label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {[
                    { token: "--color-canvas", hex: "#FDFBF7", label: "Canvas" },
                    { token: "--color-surface", hex: "#FFFFFF", label: "Surface", border: true },
                    { token: "--color-ink-100", hex: "#F5F5F4", label: "Ink 100" },
                    { token: "--color-ink-300", hex: "#D6D3D1", label: "Ink 300" },
                    { token: "--color-ink-500", hex: "#78716C", label: "Ink 500" },
                    { token: "--color-ink-700", hex: "#44403C", label: "Ink 700" },
                    { token: "--color-ink-900", hex: "#1C1917", label: "Ink 900" },
                  ].map(c => <ColorSwatch key={c.token} {...c} />)}
                </div>
              </div>
              <div>
                <Label>Palet Utama &amp; Aksen</Label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {[
                    { token: "--color-primary-100", hex: "#F4E9E1", label: "Primary 100" },
                    { token: "--color-primary-600", hex: "#9A6A4F", label: "Primary 600" },
                    { token: "--color-primary-700", hex: "#7E5540", label: "Primary 700" },
                    { token: "--color-accent-500", hex: "#C9A227", label: "Accent 500" },
                  ].map(c => <ColorSwatch key={c.token} {...c} />)}
                </div>
              </div>
              <div>
                <Label>Semantik</Label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {[
                    { token: "--color-success", hex: "#3F7D57", label: "Sukses" },
                    { token: "--color-warning", hex: "#B0761C", label: "Peringatan" },
                    { token: "--color-danger", hex: "#A8382F", label: "Bahaya" },
                    { token: "--color-info", hex: "#3F6C8C", label: "Info" },
                  ].map(c => <ColorSwatch key={c.token} {...c} />)}
                </div>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── SECTION: Tombol ── */}
        <Section title="Tombol" subtitle="4 varian × 3 ukuran — plus semua status interaksi">
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            <Card>
              <Label style={{ marginBottom: 16, display: "block" }}>Varian — ukuran Medium</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <Button variant="primary" size="medium">Bagikan Foto</Button>
                <Button variant="secondary" size="medium">Tulis Ucapan</Button>
                <Button variant="ghost" size="medium">Lihat Semua</Button>
                <Button variant="danger" size="medium">Hapus</Button>
              </div>
            </Card>

            <Card>
              <Label style={{ marginBottom: 16, display: "block" }}>Ukuran</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <Button variant="primary" size="large">Large 56px</Button>
                <Button variant="primary" size="medium">Medium 48px</Button>
                <Button variant="primary" size="small">Small 40px</Button>
              </div>
            </Card>

            <Card>
              <Label style={{ marginBottom: 16, display: "block" }}>Status</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <Button variant="primary" size="medium">Default</Button>
                <Button variant="primary" size="medium" disabled>Nonaktif</Button>
                <Button variant="primary" size="medium" loading>Mengunggah…</Button>
                <Button variant="secondary" size="medium" disabled>Nonaktif</Button>
                <Button variant="danger" size="medium">Hapus Item</Button>
              </div>
            </Card>

            <Card>
              <Label style={{ marginBottom: 16, display: "block" }}>Tombol tamu — Large, lebar penuh (mobile)</Label>
              <div style={{ maxWidth: 400, display: "flex", flexDirection: "column", gap: 12 }}>
                <Button variant="primary" size="large" fullWidth
                  icon={<CameraIcon />}>Bagikan Foto &amp; Video</Button>
                <Button variant="secondary" size="large" fullWidth
                  icon={<PenIcon />}>Tulis Ucapan</Button>
              </div>
            </Card>
          </div>
        </Section>

        {/* ── SECTION: Input ── */}
        <Section title="Input &amp; Textarea" subtitle="Label eksplisit di atas, bukan hanya placeholder">
          <Card>
            <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 20 }}>
              <Input label="Nama Anda" placeholder="Contoh: Pak Hendra" helper="Boleh dikosongkan — foto tetap terkirim" />
              <Input label="Nama Anda" placeholder="Masukkan nama" value="Hendra Kusuma" readOnly />
              <Input label="Kode Akses" placeholder="Masukkan 6 karakter" error="Kode tidak sesuai. Silakan coba lagi." />
              <Input label="Nama Acara" placeholder="Dinda &amp; Arya" disabled />
              <Textarea label="Ucapan untuk Pengantin" placeholder="Tulis ucapan Anda di sini…" rows={4} helper="Maksimum 500 karakter" />
              <Textarea label="Ucapan" placeholder="" defaultValue="Selamat menempuh hidup baru! Semoga selalu bahagia dan harmonis bersama." rows={3} />
            </div>
          </Card>
        </Section>

        {/* ── SECTION: Badge ── */}
        <Section title="Badge &amp; Pill" subtitle="Micro type, warna semantik">
          <Card>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <Badge variant="default">Semua</Badge>
              <Badge variant="primary">Foto</Badge>
              <Badge variant="accent">Favorit</Badge>
              <Badge variant="success">Terkirim</Badge>
              <Badge variant="warning">Menunggu</Badge>
              <Badge variant="danger">Ditolak</Badge>
              <Badge variant="neutral">Video</Badge>
            </div>
          </Card>
        </Section>

        {/* ── SECTION: Toast ── */}
        <Section title="Toast" subtitle="Ikon kiri, teks tengah, aksi kanan — lebar penuh minus 20px">
          <Card>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: toastVisible ? 0 : 0 }}>
              <Button variant="secondary" size="small" onClick={() => showToast("success")}>Sukses</Button>
              <Button variant="secondary" size="small" onClick={() => showToast("warning")}>Peringatan</Button>
              <Button variant="secondary" size="small" onClick={() => showToast("danger")}>Error</Button>
              <Button variant="secondary" size="small" onClick={() => showToast("info")}>Info</Button>
            </div>
            <p style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", marginTop: 12 }}>Toast muncul di atas bottom navigation. Klik untuk menampilkan.</p>
          </Card>

          {/* Toast preview inline */}
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <Toast type="success" message="Terkirim. Terima kasih!" action={{ label: "Lihat", onClick: () => {} }} visible />
            <Toast type="warning" message="Kuota hampir habis. 500 MB tersisa." visible />
            <Toast type="danger" message="Koneksi terputus. Kami akan mencoba lagi otomatis." action={{ label: "Coba Lagi", onClick: () => {} }} visible />
            <Toast type="info" message="3 foto baru ditambahkan ke galeri." visible />
          </div>
        </Section>

        {/* ── SECTION: Navigasi Bawah ── */}
        <Section title="Navigasi Bawah" subtitle="64px + safe area, 3 item, ikon 24px + label">
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ height: 120, backgroundColor: "var(--color-canvas)", display: "flex", alignItems: "flex-end" }}>
              <BottomNav active={activeNav} onChange={setActiveNav} />
            </div>
          </Card>
        </Section>

        {/* ── SECTION: Kartu Ucapan ── */}
        <Section title="Kartu Ucapan" subtitle="Aksen garis kiri primary-100, nama h3, isi body-lg">
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560 }}>
            <GuestbookCard
              name="Pak Hendra Kusuma"
              message="Selamat menempuh hidup baru! Semoga kalian selalu bahagia, harmonis, dan dikaruniai keturunan yang saleh dan salehah."
              time="2 jam lalu"
            />
            <GuestbookCard
              name="Keluarga Besar Santoso"
              message="Barakallah ya Dinda & Arya 💐 Semoga rumah tangganya penuh cinta dan keberkahan."
              time="45 menit lalu"
              hasPhoto
            />
          </div>
        </Section>

        {/* ── SECTION: Kartu Komponen ── */}
        <Section title="Kartu" subtitle="Surface putih, radius-lg, shadow-sm">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            <Card>
              <p style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", marginBottom: 4 }}>Total Foto</p>
              <p style={{ fontSize: "var(--text-h1-size)", fontWeight: "var(--text-h1-w)", color: "var(--color-ink-900)" }}>342</p>
            </Card>
            <Card>
              <p style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", marginBottom: 4 }}>Kontributor</p>
              <p style={{ fontSize: "var(--text-h1-size)", fontWeight: "var(--text-h1-w)", color: "var(--color-ink-900)" }}>87</p>
            </Card>
            <Card>
              <p style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", marginBottom: 4 }}>Menunggu Moderasi</p>
              <p style={{ fontSize: "var(--text-h1-size)", fontWeight: "var(--text-h1-w)", color: "var(--color-warning)" }}>12</p>
            </Card>
          </div>
        </Section>

        {/* ── SECTION: Tile Galeri ── */}
        <Section title="Tile Galeri &amp; Media" subtitle="Masonry, tanpa shadow, radius-lg, overlay nama">
          <div style={{ columns: "2 180px", gap: 8 }}>
            {[
              { h: 220, name: "Pak Hendra", isVideo: false },
              { h: 160, name: null, isVideo: false },
              { h: 200, name: "Keluarga Santoso", isVideo: true, dur: "0:42" },
              { h: 140, name: "Ibu Sari", isVideo: false },
              { h: 180, name: null, isVideo: false },
              { h: 220, name: "Rombongan Jogja", isVideo: false },
            ].map((t, i) => <GalleryTile key={i} {...t} />)}
          </div>
        </Section>

        {/* ── SECTION: Status Kosong ── */}
        <Section title="Status Kosong" subtitle="Ilustrasi garis monokrom, judul, subjudul, satu CTA">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            <EmptyState
              icon="gallery"
              title="Belum ada foto di sini"
              subtitle="Jadilah yang pertama berbagi momen indah hari ini."
              cta="Bagikan Foto Pertama"
            />
            <EmptyState
              icon="guestbook"
              title="Belum ada ucapan"
              subtitle="Tulis ucapan untuk pasangan pengantin."
              cta="Tulis Ucapan"
            />
            <EmptyState
              icon="offline"
              title="Koneksi terputus"
              subtitle="Unggahan akan dilanjutkan otomatis saat sinyal kembali."
              cta="Coba Lagi"
            />
          </div>
        </Section>

        {/* ── SECTION: Skeleton ── */}
        <Section title="Skeleton Loader" subtitle="Shimmer halus, bentuk sesuai konten akhir">
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card>
              <Label style={{ marginBottom: 12, display: "block" }}>Skeleton Galeri</Label>
              <div style={{ columns: "2 140px", gap: 8 }}>
                {[220, 150, 190, 160, 210, 140].map((h, i) => (
                  <div key={i} style={{ breakInside: "avoid", marginBottom: 8 }}>
                    <Skeleton height={h} radius="var(--radius-lg)" />
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <Label style={{ marginBottom: 12, display: "block" }}>Skeleton Ucapan</Label>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "16px 20px", border: "1px solid var(--color-ink-100)", borderRadius: "var(--radius-lg)", borderLeft: "2px solid var(--color-primary-100)" }}>
                    <Skeleton height={18} width="40%" />
                    <Skeleton height={14} width="90%" />
                    <Skeleton height={14} width="70%" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Section>

        {/* ── SECTION: Upload Card ── */}
        <Section title="Upload Card" subtitle="Dropzone, preview file, progress bar, status">
          <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 20 }}>
            <Card>
              <UploadDropzone />
            </Card>
            <Card>
              <Label style={{ marginBottom: 12, display: "block" }}>Preview File — sedang mengunggah</Label>
              <UploadFileList />
            </Card>
          </div>
        </Section>

      </main>

      {/* Bottom nav always rendered */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100 }}>
        <BottomNav active={activeNav} onChange={setActiveNav} />
      </div>

      {/* Live toast */}
      {toastVisible && (
        <div style={{ position: "fixed", bottom: "calc(64px + env(safe-area-inset-bottom) + 12px)", left: "var(--space-screen-edge)", right: "var(--space-screen-edge)", zIndex: 200 }}>
          <Toast
            type={toastType}
            message={
              toastType === "success" ? "Terkirim. Terima kasih!" :
              toastType === "warning" ? "Kuota hampir habis. 500 MB tersisa." :
              toastType === "danger" ? "Koneksi terputus. Kami akan mencoba lagi." :
              "3 foto baru ditambahkan ke galeri."
            }
            action={toastType !== "warning" ? { label: toastType === "danger" ? "Coba Lagi" : "Lihat", onClick: () => setToastVisible(false) } : undefined}
            visible
          />
        </div>
      )}
    </div>
  )
}

// ── Helper components ──

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid var(--color-ink-300)" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-h1-size)", lineHeight: "var(--text-h1-lh)", fontWeight: "var(--text-h1-w)", color: "var(--color-ink-900)", marginBottom: 4 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)" }}>{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ fontSize: "var(--text-micro-size)", fontWeight: "var(--text-micro-w)", color: "var(--color-ink-500)", textTransform: "uppercase", letterSpacing: "0.07em", ...style }}>
      {children}
    </span>
  )
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: "var(--color-ink-100)" }} />
}

function ColorSwatch({ hex, label, border }: { token: string; hex: string; label: string; border?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ width: 56, height: 56, borderRadius: "var(--radius-md)", backgroundColor: hex, border: border ? "1px solid var(--color-ink-300)" : undefined, boxShadow: "var(--shadow-sm)" }} />
      <span style={{ fontSize: "var(--text-micro-size)", color: "var(--color-ink-500)", textAlign: "center", maxWidth: 60, lineHeight: 1.3 }}>{label}</span>
      <span style={{ fontSize: 10, color: "var(--color-ink-300)", fontFamily: "monospace" }}>{hex}</span>
    </div>
  )
}

function GalleryTile({ h, name, isVideo, dur }: { h: number; name: string | null; isVideo: boolean; dur?: string }) {
  const colors = ["#e8ddd6", "#d4c8b8", "#c9bfb0", "#ddd5cc", "#c8bfb5", "#d8cfc7"]
  const idx = Math.floor(Math.random() * colors.length)
  return (
    <div style={{ breakInside: "avoid", marginBottom: 8, position: "relative", height: h, borderRadius: "var(--radius-lg)", overflow: "hidden", backgroundColor: colors[idx], cursor: "pointer" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1.02)" }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)" }}
    >
      <div style={{ position: "absolute", inset: 0, transition: "transform var(--duration-fast) var(--ease-standard)" }} />
      {isVideo && (
        <div style={{ position: "absolute", bottom: 8, right: 8, backgroundColor: "rgba(28,25,23,.7)", borderRadius: "var(--radius-full)", padding: "3px 10px", display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <span style={{ fontSize: 11, color: "white", fontWeight: 500 }}>{dur}</span>
        </div>
      )}
      {name && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(28,25,23,.55) 0%, transparent 100%)", padding: "20px 10px 8px", borderRadius: "0 0 var(--radius-lg) var(--radius-lg)" }}>
          <span style={{ fontSize: "var(--text-caption-size)", color: "white", fontWeight: 500, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
        </div>
      )}
    </div>
  )
}

function GuestbookCard({ name, message, time, hasPhoto }: { name: string; message: string; time: string; hasPhoto?: boolean }) {
  return (
    <div style={{ backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-lg)", padding: 20, borderLeft: "2px solid var(--color-primary-100)", boxShadow: "var(--shadow-sm)", display: "flex", gap: 12 }}>
      {hasPhoto && (
        <div style={{ width: 80, height: 80, borderRadius: "var(--radius-md)", backgroundColor: "var(--color-primary-100)", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 8 }}>
          <span style={{ fontSize: "var(--text-h3-size)", fontWeight: "var(--text-h3-w)", color: "var(--color-ink-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", flexShrink: 0 }}>{time}</span>
        </div>
        <p style={{ fontSize: "var(--text-body-lg-size)", lineHeight: "var(--text-body-lg-lh)", color: "var(--color-ink-700)", margin: 0 }}>{message}</p>
      </div>
    </div>
  )
}

function UploadDropzone() {
  return (
    <div style={{ border: "1.5px dashed var(--color-ink-300)", borderRadius: "var(--radius-lg)", minHeight: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 12, cursor: "pointer", transition: "border-color var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard)" }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "var(--color-primary-600)"; el.style.backgroundColor = "var(--color-primary-100)" }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "var(--color-ink-300)"; el.style.backgroundColor = "" }}
    >
      <div style={{ width: 48, height: 48, borderRadius: "var(--radius-full)", backgroundColor: "var(--color-primary-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-600)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "var(--text-h3-size)", fontWeight: "var(--text-h3-w)", color: "var(--color-ink-900)", marginBottom: 4 }}>Bagikan Foto &amp; Video</p>
        <p style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)" }}>JPEG, PNG, HEIC, MP4, MOV · Maks. 25 MB per foto, 200 MB per video</p>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 4, width: "100%", maxWidth: 360 }}>
        <Button variant="primary" size="medium" fullWidth icon={<GalleryIcon />}>Pilih dari Galeri</Button>
        <Button variant="secondary" size="medium" fullWidth icon={<CameraIcon />}>Ambil Foto</Button>
      </div>
    </div>
  )
}

function UploadFileList() {
  const files = [
    { name: "IMG_2381.heic", size: "3.6 MB", progress: 100, status: "done" as const },
    { name: "VID_2382.mp4", size: "48.2 MB", progress: 63, status: "uploading" as const },
    { name: "IMG_2390.jpeg", size: "2.1 MB", progress: 0, status: "error" as const },
  ]
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {files.map((f, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", backgroundColor: f.status === "error" ? "rgba(168,56,47,.05)" : "var(--color-ink-100)", borderRadius: "var(--radius-md)", border: f.status === "error" ? "1px solid rgba(168,56,47,.2)" : "1px solid transparent" }}>
          <div style={{ width: 48, height: 48, borderRadius: "var(--radius-sm)", backgroundColor: "var(--color-ink-300)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: "var(--text-caption-size)", fontWeight: 500, color: "var(--color-ink-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{f.name}</span>
              <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)" }}>{f.size}</span>
            </div>
            <div style={{ height: 4, backgroundColor: "var(--color-ink-300)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${f.progress}%`, backgroundColor: f.status === "error" ? "var(--color-danger)" : "var(--color-primary-600)", borderRadius: "var(--radius-full)", transition: "width var(--duration-base) var(--ease-standard)" }} />
            </div>
          </div>
          {f.status === "done" && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          )}
          {f.status === "error" && (
            <button style={{ fontSize: "var(--text-caption-size)", color: "var(--color-danger)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", padding: "4px 8px" }}>Coba Lagi</button>
          )}
          {f.status === "uploading" && (
            <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--color-ink-500)" }} aria-label="Batal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Inline icons ──
function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}
function PenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  )
}
function GalleryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>
  )
}

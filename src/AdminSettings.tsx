import { useState, useEffect, useRef, type CSSProperties } from "react"
import QRCode from "qrcode"
import { Button } from "./components/Button"
import {
  adminChangePasscode,
  adminUpdateEvent,
  adminUploadCover,
  getAdminPasscode,
  type EventSettings,
} from "./lib/api"
import { optimizeImage } from "./lib/imageOptimizer"

/* ─────────────────────────────────────────
   EVENT + SLIDESHOW SETTINGS
───────────────────────────────────────── */
export function EventSettingsForm({
  event,
  onSaved,
}: {
  event: EventSettings
  onSaved: (next: EventSettings) => void
}) {
  const [coupleNames, setCoupleNames] = useState(event.coupleNames)
  const [eventDate, setEventDate] = useState(event.eventDate)
  const [eventLocation, setEventLocation] = useState(event.eventLocation)
  const [requiresApproval, setRequiresApproval] = useState(event.galleryRequiresApproval)
  const [durationSec, setDurationSec] = useState(
    String(Math.round(event.slideshowDurationMs / 1000)),
  )
  const [shuffle, setShuffle] = useState(event.slideshowShuffle)
  const [showWishes, setShowWishes] = useState(event.slideshowShowWishes)

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!coupleNames.trim()) {
      setFormError("Nama pengantin tidak boleh kosong.")
      return
    }
    const seconds = Number(durationSec)
    if (!Number.isFinite(seconds) || seconds < 2 || seconds > 60) {
      setFormError("Durasi per foto harus antara 2 dan 60 detik.")
      return
    }

    setSaving(true)
    setFormError(null)
    setMessage(null)
    try {
      const next = await adminUpdateEvent({
        coupleNames: coupleNames.trim(),
        eventDate: eventDate.trim(),
        eventLocation: eventLocation.trim(),
        galleryRequiresApproval: requiresApproval,
        slideshowDurationMs: Math.round(seconds * 1000),
        slideshowShuffle: shuffle,
        slideshowShowWishes: showWishes,
      })
      onSaved(next)
      setMessage("Pengaturan tersimpan.")
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan pengaturan.")
    } finally {
      setSaving(false)
    }
  }

  async function pickCover(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setFormError(null)
    setMessage(null)
    try {
      const optimized = await optimizeImage(file, { maxDimension: 2560, quality: 0.85 })
      const next = await adminUploadCover(optimized)
      onSaved(next)
      setMessage("Foto sampul diperbarui.")
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal mengunggah foto sampul.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={save} style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Cover */}
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SectionTitle>Foto Sampul</SectionTitle>
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 9",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            backgroundColor: "var(--color-ink-100)",
            border: "1px solid var(--color-ink-100)",
          }}
        >
          <img
            src={event.coverUrl}
            alt="Pratinjau foto sampul"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={e => {
            pickCover(e.target.files?.[0])
            e.target.value = ""
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            size="medium"
            type="button"
            loading={uploading}
            onClick={() => coverInputRef.current?.click()}
          >
            {uploading ? "Mengunggah…" : "Ganti Foto Sampul"}
          </Button>
          <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)" }}>
            JPG, PNG atau WebP · maks 10 MB
          </span>
        </div>
      </section>

      {/* Event details */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SectionTitle>Detail Acara</SectionTitle>
        <Field id="ev-couple" label="Nama Pengantin" value={coupleNames} onChange={setCoupleNames} placeholder="Contoh: Dinda & Arya" maxLength={80} />
        <Field id="ev-date" label="Tanggal" value={eventDate} onChange={setEventDate} placeholder="Contoh: 12 Oktober 2026" maxLength={40} />
        <Field id="ev-location" label="Lokasi" value={eventLocation} onChange={setEventLocation} placeholder="Contoh: Bandung" maxLength={60} />
      </section>

      {/* Gallery moderation */}
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SectionTitle>Moderasi Galeri</SectionTitle>
        <Toggle
          id="ev-moderation"
          checked={requiresApproval}
          onChange={setRequiresApproval}
          label="Foto harus disetujui sebelum tampil di galeri"
          hint="Jika mati, unggahan tamu langsung terlihat semua orang."
        />
        {requiresApproval && !event.galleryRequiresApproval && (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(176,118,28,.08)",
              border: "1px solid rgba(176,118,28,.25)",
              color: "var(--color-warning)",
              fontSize: "var(--text-caption-size)",
              lineHeight: "var(--text-caption-lh)",
            }}
          >
            Setelah disimpan, galeri hanya menampilkan foto yang sudah ditandai
            <strong> Tayang</strong>. Foto yang sudah ada dan belum ditandai akan hilang
            dari galeri sampai Anda menyetujuinya.
          </p>
        )}
      </section>

      {/* Slideshow */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SectionTitle>Slideshow</SectionTitle>
        <Field
          id="ev-duration"
          label="Durasi per foto (detik)"
          value={durationSec}
          onChange={setDurationSec}
          placeholder="7"
          type="number"
        />
        <Toggle
          id="ev-shuffle"
          checked={shuffle}
          onChange={setShuffle}
          label="Acak urutan tayangan"
          hint="Jika mati, foto tampil dari yang terbaru."
        />
        <Toggle
          id="ev-wishes"
          checked={showWishes}
          onChange={setShowWishes}
          label="Tampilkan ucapan di slideshow"
          hint="Hanya ucapan yang sudah ditandai Tayang."
        />
      </section>

      {formError && <ErrorText>{formError}</ErrorText>}
      {message && <SuccessText>{message}</SuccessText>}

      <div>
        <Button variant="primary" size="large" type="submit" loading={saving}>
          {saving ? "Menyimpan…" : "Simpan Perubahan"}
        </Button>
      </div>
    </form>
  )
}

/* ─────────────────────────────────────────
   QR CODE / GUEST LINK
───────────────────────────────────────── */
export function InvitePanel({ coupleNames }: { coupleNames: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The guest link is this app without the admin hash.
  const guestUrl = `${window.location.origin}${window.location.pathname}`

  useEffect(() => {
    QRCode.toDataURL(guestUrl, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#1C1917", light: "#FFFFFF" },
    })
      .then(setDataUrl)
      .catch(() => setError("Gagal membuat kode QR."))
  }, [guestUrl])

  function copyLink() {
    navigator.clipboard
      .writeText(guestUrl)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => setError("Gagal menyalin tautan."))
  }

  function downloadQr() {
    if (!dataUrl) return
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = `qr-${coupleNames.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <SectionTitle>Undangan QR</SectionTitle>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: "var(--text-caption-size)",
            lineHeight: "var(--text-caption-lh)",
            color: "var(--color-ink-500)",
          }}
        >
          Cetak kode ini dan letakkan di meja tamu. Memindainya membuka halaman
          berbagi foto — tanpa aplikasi, tanpa akun.
        </p>
      </div>

      <div
        style={{
          alignSelf: "flex-start",
          padding: 20,
          backgroundColor: "#fff",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-ink-100)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`Kode QR menuju halaman tamu ${coupleNames}`}
            style={{ width: 240, height: 240, display: "block" }}
          />
        ) : (
          <div
            style={{
              width: 240,
              height: 240,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-ink-500)",
              fontSize: "var(--text-caption-size)",
            }}
          >
            {error ?? "Membuat kode QR…"}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "var(--text-caption-size)", fontWeight: 500, color: "var(--color-ink-700)" }}>
          Tautan tamu
        </span>
        <code
          style={{
            display: "block",
            padding: "10px 12px",
            backgroundColor: "var(--color-ink-100)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-caption-size)",
            color: "var(--color-ink-700)",
            wordBreak: "break-all",
          }}
        >
          {guestUrl}
        </code>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button variant="primary" size="medium" onClick={downloadQr} disabled={!dataUrl}>
          Unduh QR (PNG)
        </Button>
        <Button variant="secondary" size="medium" onClick={copyLink}>
          {copied ? "Tersalin!" : "Salin Tautan"}
        </Button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   PASSCODE
───────────────────────────────────────── */
export function PasscodePanel() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (next.length < 8) {
      setError("Kode baru minimal 8 karakter.")
      return
    }
    if (next !== confirm) {
      setError("Konfirmasi kode baru tidak cocok.")
      return
    }

    setBusy(true)
    try {
      await adminChangePasscode(current || getAdminPasscode() || "", next)
      setMessage("Kode admin berhasil diubah. Simpan kode baru Anda.")
      setCurrent("")
      setNext("")
      setConfirm("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah kode admin.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 440, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <SectionTitle>Ganti Kode Admin</SectionTitle>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: "var(--text-caption-size)",
            lineHeight: "var(--text-caption-lh)",
            color: "var(--color-ink-500)",
          }}
        >
          Kode ini dipakai bersama oleh siapa pun yang mengelola acara. Ganti
          setelah acara selesai atau jika kode pernah dibagikan.
        </p>
      </div>

      <Field id="pc-current" label="Kode Saat Ini" value={current} onChange={setCurrent} type="password" placeholder="Kode admin sekarang" />
      <Field id="pc-next" label="Kode Baru" value={next} onChange={setNext} type="password" placeholder="Minimal 8 karakter" />
      <Field id="pc-confirm" label="Ulangi Kode Baru" value={confirm} onChange={setConfirm} type="password" placeholder="Ketik ulang kode baru" />

      {error && <ErrorText>{error}</ErrorText>}
      {message && <SuccessText>{message}</SuccessText>}

      <div>
        <Button variant="primary" size="large" type="submit" loading={busy}>
          {busy ? "Menyimpan…" : "Ganti Kode"}
        </Button>
      </div>
    </form>
  )
}

/* ─────────────────────────────────────────
   SHARED PIECES
───────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: "var(--text-h3-size)",
        fontWeight: "var(--text-h3-w)",
        color: "var(--color-ink-900)",
      }}
    >
      {children}
    </h2>
  )
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <span role="alert" style={{ fontSize: "var(--text-caption-size)", color: "var(--color-danger)", lineHeight: "var(--text-caption-lh)" }}>
      {children}
    </span>
  )
}

function SuccessText({ children }: { children: React.ReactNode }) {
  return (
    <span role="status" style={{ fontSize: "var(--text-caption-size)", color: "var(--color-success)", lineHeight: "var(--text-caption-lh)" }}>
      {children}
    </span>
  )
}

function Toggle({
  id,
  checked,
  onChange,
  label,
  hint,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: 18, height: 18, marginTop: 2, accentColor: "var(--color-primary-600)", cursor: "pointer" }}
      />
      <label htmlFor={id} style={{ cursor: "pointer" }}>
        <span style={{ display: "block", fontSize: "var(--text-body-size)", color: "var(--color-ink-900)" }}>
          {label}
        </span>
        {hint && (
          <span style={{ display: "block", fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", lineHeight: "var(--text-caption-lh)" }}>
            {hint}
          </span>
        )}
      </label>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = "text",
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
  type?: string
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: "var(--text-caption-size)", fontWeight: 500, color: "var(--color-ink-700)" }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete={type === "password" ? "new-password" : undefined}
        onChange={e => onChange(e.target.value)}
        style={adminFieldStyle}
      />
    </div>
  )
}

export const adminFieldStyle: CSSProperties = {
  width: "100%",
  height: 48,
  paddingLeft: 14,
  paddingRight: 14,
  fontSize: "var(--text-body-size)",
  fontFamily: "var(--font-body)",
  color: "var(--color-ink-900)",
  backgroundColor: "var(--color-surface)",
  border: "1.5px solid var(--color-ink-300)",
  borderRadius: "var(--radius-md)",
  outline: "none",
  boxSizing: "border-box",
}

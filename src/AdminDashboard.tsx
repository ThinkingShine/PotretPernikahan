import { useState, useEffect, useCallback, useRef, type CSSProperties } from "react"
import { Button } from "./components/Button"
import { Skeleton } from "./components/Skeleton"
import {
  adminDeleteGuestbookEntry,
  adminDeleteMedia,
  adminFetchGuestbook,
  adminFetchMedia,
  adminLogin,
  adminSetGuestbookApproval,
  adminSetMediaApproval,
  adminUpdateEvent,
  adminUploadCover,
  downloadTextFile,
  fetchEventSettings,
  FALLBACK_EVENT,
  formatDateTime,
  getAdminPasscode,
  mediaDownloadUrl,
  relativeTime,
  setAdminPasscode,
  toCsv,
  type EventSettings,
  type GuestbookEntry,
  type MediaItem,
} from "./lib/api"

type Tab = "media" | "guestbook" | "event"

/** Gap between triggered downloads so the browser queues them reliably. */
const BULK_DELAY_MS = 800

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(getAdminPasscode() !== null)

  if (!authed) return <LoginGate onSuccess={() => setAuthed(true)} />
  return (
    <Dashboard
      onLogout={() => {
        setAdminPasscode(null)
        setAuthed(false)
      }}
    />
  )
}

/* ─────────────────────────────────────────
   LOGIN
───────────────────────────────────────── */
function LoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [passcode, setPasscode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!passcode.trim()) {
      setError("Masukkan kode admin.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await adminLogin(passcode.trim())
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kode admin tidak sesuai.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--color-canvas)",
        fontFamily: "var(--font-body)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-screen-edge)",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 360,
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-ink-100)",
          boxShadow: "var(--shadow-md)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              margin: "0 0 4px",
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-h1-size)",
              lineHeight: "var(--text-h1-lh)",
              fontWeight: "var(--text-h1-w)",
              color: "var(--color-ink-900)",
            }}
          >
            Dashboard Admin
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-caption-size)",
              lineHeight: "var(--text-caption-lh)",
              color: "var(--color-ink-500)",
            }}
          >
            Masukkan kode admin untuk mengelola foto dan ucapan.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            htmlFor="admin-passcode"
            style={{ fontSize: "var(--text-caption-size)", fontWeight: 500, color: "var(--color-ink-700)" }}
          >
            Kode Admin
          </label>
          <input
            id="admin-passcode"
            type="password"
            autoComplete="current-password"
            value={passcode}
            onChange={e => setPasscode(e.target.value)}
            placeholder="XXXX-XXXX-XXXX"
            aria-invalid={!!error}
            style={{
              ...fieldStyle,
              borderColor: error ? "var(--color-danger)" : "var(--color-ink-300)",
            }}
          />
          {error && (
            <span
              role="alert"
              style={{ fontSize: "var(--text-caption-size)", color: "var(--color-danger)", lineHeight: "var(--text-caption-lh)" }}
            >
              {error}
            </span>
          )}
        </div>

        <Button variant="primary" size="large" fullWidth loading={busy} type="submit">
          {busy ? "Memeriksa…" : "Masuk"}
        </Button>
      </form>
    </div>
  )
}

/* ─────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────── */
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("media")
  const [media, setMedia] = useState<MediaItem[]>([])
  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null)
  const [event, setEvent] = useState<EventSettings>(FALLBACK_EVENT)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [m, g, ev] = await Promise.all([
        adminFetchMedia(),
        adminFetchGuestbook(),
        fetchEventSettings(),
      ])
      setMedia(m)
      setEntries(g)
      setEvent(ev)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memuat data."
      setError(message)
      // An expired or wrong passcode should drop the session, not loop.
      if (/kode admin/i.test(message)) {
        setAdminPasscode(null)
        onLogout()
      }
    } finally {
      setLoading(false)
    }
  }, [onLogout])

  useEffect(() => {
    load()
  }, [load])

  async function toggleMedia(item: MediaItem) {
    setBusyId(item.id)
    try {
      const updated = await adminSetMediaApproval(item.id, !item.approved)
      setMedia(prev => prev.map(m => (m.id === item.id ? updated : m)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui status.")
    } finally {
      setBusyId(null)
    }
  }

  async function removeMedia(item: MediaItem) {
    if (!confirm(`Hapus media ini secara permanen?`)) return
    setBusyId(item.id)
    try {
      await adminDeleteMedia(item.id)
      setMedia(prev => prev.filter(m => m.id !== item.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus media.")
    } finally {
      setBusyId(null)
    }
  }

  async function toggleEntry(entry: GuestbookEntry) {
    setBusyId(entry.id)
    try {
      const updated = await adminSetGuestbookApproval(entry.id, !entry.approved)
      setEntries(prev => prev.map(e => (e.id === entry.id ? updated : e)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui status.")
    } finally {
      setBusyId(null)
    }
  }

  async function removeEntry(entry: GuestbookEntry) {
    if (!confirm(`Hapus ucapan dari ${entry.author}?`)) return
    setBusyId(entry.id)
    try {
      await adminDeleteGuestbookEntry(entry.id)
      setEntries(prev => prev.filter(e => e.id !== entry.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus ucapan.")
    } finally {
      setBusyId(null)
    }
  }

  /**
   * Triggers each file as its own download. Browsers ask once to allow
   * multiple downloads, then handle the rest, which keeps large videos
   * streaming to disk instead of through page memory.
   */
  async function downloadAllMedia() {
    if (media.length === 0) return
    if (
      !confirm(
        `Unduh ${media.length} berkas? Browser mungkin meminta izin untuk mengunduh beberapa berkas sekaligus.`,
      )
    ) {
      return
    }
    for (let i = 0; i < media.length; i++) {
      const link = document.createElement("a")
      link.href = mediaDownloadUrl(media[i])
      link.download = ""
      document.body.appendChild(link)
      link.click()
      link.remove()
      setBulk({ done: i + 1, total: media.length })
      if (i < media.length - 1) {
        await new Promise(resolve => setTimeout(resolve, BULK_DELAY_MS))
      }
    }
    setTimeout(() => setBulk(null), 1500)
  }

  function downloadMediaList() {
    const rows: (string | number)[][] = [
      ["Nama Pengunggah", "Tipe", "Tayang di Slideshow", "Waktu Unggah", "Tautan Unduh"],
      ...media.map(m => [
        m.uploader ?? "Tanpa nama",
        m.isVideo ? "Video" : "Foto",
        m.approved ? "Ya" : "Tidak",
        formatDateTime(m.createdAt),
        mediaDownloadUrl(m),
      ]),
    ]
    downloadTextFile("daftar-media-potret-pernikahan.csv", toCsv(rows))
  }

  function downloadWishes() {
    const rows: (string | number)[][] = [
      ["Nama", "Ucapan", "Tayang di Slideshow", "Waktu"],
      ...entries.map(e => [
        e.author,
        e.message,
        e.approved ? "Ya" : "Tidak",
        formatDateTime(e.createdAt),
      ]),
    ]
    downloadTextFile("ucapan-potret-pernikahan.csv", toCsv(rows))
  }

  const approvedMedia = media.filter(m => m.approved).length
  const approvedWishes = entries.filter(e => e.approved).length

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--color-canvas)",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: "var(--color-surface)",
          borderBottom: "1px solid var(--color-ink-300)",
          padding: "14px var(--space-screen-edge)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 180 }}>
            <p
              style={{
                margin: 0,
                fontSize: "var(--text-h3-size)",
                fontWeight: "var(--text-h3-w)",
                color: "var(--color-ink-900)",
                lineHeight: 1.2,
              }}
            >
              Dashboard Admin
            </p>
            <p style={{ margin: 0, fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", lineHeight: 1.4 }}>
              {media.length} media · {approvedMedia} tayang · {entries.length} ucapan · {approvedWishes} tayang
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <Button variant="secondary" size="small" onClick={() => { window.location.hash = "#/slideshow" }}>
              Buka Slideshow
            </Button>
            <Button variant="ghost" size="small" onClick={load}>
              Muat Ulang
            </Button>
            <Button variant="ghost" size="small" onClick={onLogout}>
              Keluar
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth: 1120, margin: "12px auto 0", display: "flex", gap: 4 }}>
          <TabButton active={tab === "media"} onClick={() => setTab("media")}>
            Foto &amp; Video ({media.length})
          </TabButton>
          <TabButton active={tab === "guestbook"} onClick={() => setTab("guestbook")}>
            Ucapan ({entries.length})
          </TabButton>
          <TabButton active={tab === "event"} onClick={() => setTab("event")}>
            Acara
          </TabButton>
        </div>
      </header>

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "20px var(--space-screen-edge) 64px" }}>
        {tab !== "event" && (
        <p
          style={{
            margin: "0 0 16px",
            fontSize: "var(--text-caption-size)",
            lineHeight: "var(--text-caption-lh)",
            color: "var(--color-ink-500)",
          }}
        >
          Tandai <strong style={{ color: "var(--color-ink-700)" }}>Tayang</strong> agar item muncul di slideshow layar besar.
          Item yang tidak ditandai tetap ada di galeri, tetapi tidak ikut tampil.
        </p>
        )}

        {/* Export toolbar */}
        {tab !== "event" && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            paddingBottom: 16,
            borderBottom: "1px solid var(--color-ink-100)",
          }}
        >
          {tab === "media" ? (
            <>
              <Button
                variant="secondary"
                size="small"
                disabled={media.length === 0 || bulk !== null}
                onClick={downloadAllMedia}
              >
                Unduh Semua Media ({media.length})
              </Button>
              <Button
                variant="ghost"
                size="small"
                disabled={media.length === 0}
                onClick={downloadMediaList}
              >
                Daftar Media (CSV)
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="small"
              disabled={entries.length === 0}
              onClick={downloadWishes}
            >
              Unduh Ucapan (CSV, {entries.length})
            </Button>
          )}

          {bulk && (
            <span
              role="status"
              style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)" }}
            >
              Mengunduh {bulk.done} dari {bulk.total}…
            </span>
          )}
        </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(168,56,47,.06)",
              border: "1px solid rgba(168,56,47,.2)",
              color: "var(--color-danger)",
              fontSize: "var(--text-caption-size)",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} height={220} radius="var(--radius-lg)" />
            ))}
          </div>
        ) : tab === "event" ? (
          <EventSettingsForm event={event} onSaved={setEvent} />
        ) : tab === "media" ? (
          media.length === 0 ? (
            <EmptyNote>Belum ada foto atau video yang diunggah tamu.</EmptyNote>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {media.map(item => (
                <MediaCard
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  onToggle={() => toggleMedia(item)}
                  onDelete={() => removeMedia(item)}
                />
              ))}
            </div>
          )
        ) : entries.length === 0 ? (
          <EmptyNote>Belum ada ucapan dari tamu.</EmptyNote>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 720 }}>
            {entries.map(entry => (
              <EntryRow
                key={entry.id}
                entry={entry}
                busy={busyId === entry.id}
                onToggle={() => toggleEntry(entry)}
                onDelete={() => removeEntry(entry)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

/* ─────────────────────────────────────────
   PIECES
───────────────────────────────────────── */
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={{
        padding: "8px 14px",
        fontSize: "var(--text-caption-size)",
        fontWeight: active ? 600 : 400,
        fontFamily: "var(--font-body)",
        color: active ? "var(--color-primary-600)" : "var(--color-ink-500)",
        backgroundColor: "transparent",
        border: "none",
        borderBottom: `2px solid ${active ? "var(--color-primary-600)" : "transparent"}`,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  )
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        textAlign: "center",
        padding: "64px 24px",
        margin: 0,
        color: "var(--color-ink-500)",
        fontSize: "var(--text-body-size)",
      }}
    >
      {children}
    </p>
  )
}

function MediaCard({
  item,
  busy,
  onToggle,
  onDelete,
}: {
  item: MediaItem
  busy: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        border: `1px solid ${item.approved ? "var(--color-primary-600)" : "var(--color-ink-100)"}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        opacity: busy ? 0.6 : 1,
        transition: "opacity var(--duration-fast) var(--ease-standard)",
      }}
    >
      <div style={{ position: "relative", backgroundColor: "var(--color-ink-100)", aspectRatio: "1 / 1" }}>
        {item.isVideo ? (
          <video
            src={item.url}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <img
            src={item.url}
            alt={item.uploader ? `Foto dari ${item.uploader}` : "Foto tamu"}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
        {item.approved && (
          <span
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              backgroundColor: "var(--color-primary-600)",
              color: "#fff",
              fontSize: "var(--text-micro-size)",
              fontWeight: "var(--text-micro-w)",
              padding: "3px 8px",
              borderRadius: "var(--radius-full)",
            }}
          >
            Tayang
          </span>
        )}
        {item.isVideo && (
          <span
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              backgroundColor: "rgba(28,25,23,.72)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: "var(--radius-full)",
            }}
          >
            Video
          </span>
        )}
      </div>

      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-caption-size)",
              fontWeight: 500,
              color: "var(--color-ink-900)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.uploader ?? "Tanpa nama"}
          </p>
          <p style={{ margin: 0, fontSize: "var(--text-micro-size)", color: "var(--color-ink-500)" }}>
            {relativeTime(item.createdAt)}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant={item.approved ? "secondary" : "primary"}
            size="small"
            disabled={busy}
            onClick={onToggle}
            style={{ flex: 1, minWidth: 0 }}
          >
            {item.approved ? "Sembunyikan" : "Tayangkan"}
          </Button>
          <a
            href={mediaDownloadUrl(item)}
            download
            aria-label="Unduh berkas ini"
            title="Unduh"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              border: "1.5px solid var(--color-ink-300)",
              color: "var(--color-ink-700)",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </a>
          <Button variant="danger" size="small" disabled={busy} onClick={onDelete}>
            Hapus
          </Button>
        </div>
      </div>
    </div>
  )
}

function EntryRow({
  entry,
  busy,
  onToggle,
  onDelete,
}: {
  entry: GuestbookEntry
  busy: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <article
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        padding: 16,
        border: "1px solid var(--color-ink-100)",
        borderLeft: `3px solid ${entry.approved ? "var(--color-primary-600)" : "var(--color-ink-300)"}`,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: busy ? 0.6 : 1,
        transition: "opacity var(--duration-fast) var(--ease-standard)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <h3
          style={{
            margin: 0,
            fontSize: "var(--text-h3-size)",
            fontWeight: "var(--text-h3-w)",
            color: "var(--color-ink-900)",
          }}
        >
          {entry.author}
        </h3>
        <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", flexShrink: 0 }}>
          {relativeTime(entry.createdAt)}
        </span>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: "var(--text-body-size)",
          lineHeight: "var(--text-body-lh)",
          color: "var(--color-ink-700)",
          wordBreak: "break-word",
        }}
      >
        {entry.message}
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        <Button
          variant={entry.approved ? "secondary" : "primary"}
          size="small"
          disabled={busy}
          onClick={onToggle}
        >
          {entry.approved ? "Sembunyikan" : "Tayangkan"}
        </Button>
        <Button variant="danger" size="small" disabled={busy} onClick={onDelete}>
          Hapus
        </Button>
      </div>
    </article>
  )
}

/* ─────────────────────────────────────────
   EVENT SETTINGS
───────────────────────────────────────── */
function EventSettingsForm({
  event,
  onSaved,
}: {
  event: EventSettings
  onSaved: (next: EventSettings) => void
}) {
  const [coupleNames, setCoupleNames] = useState(event.coupleNames)
  const [eventDate, setEventDate] = useState(event.eventDate)
  const [eventLocation, setEventLocation] = useState(event.eventLocation)
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
    setSaving(true)
    setFormError(null)
    setMessage(null)
    try {
      const next = await adminUpdateEvent({
        coupleNames: coupleNames.trim(),
        eventDate: eventDate.trim(),
        eventLocation: eventLocation.trim(),
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
      const next = await adminUploadCover(file)
      onSaved(next)
      setMessage("Foto sampul diperbarui.")
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal mengunggah foto sampul.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={save} style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Cover */}
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: "var(--text-h3-size)", fontWeight: "var(--text-h3-w)", color: "var(--color-ink-900)" }}>
          Foto Sampul
        </h2>
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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

      {/* Text fields */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: "var(--text-h3-size)", fontWeight: "var(--text-h3-w)", color: "var(--color-ink-900)" }}>
          Detail Acara
        </h2>

        <Field
          id="ev-couple"
          label="Nama Pengantin"
          value={coupleNames}
          onChange={setCoupleNames}
          placeholder="Contoh: Dinda & Arya"
          maxLength={80}
        />
        <Field
          id="ev-date"
          label="Tanggal"
          value={eventDate}
          onChange={setEventDate}
          placeholder="Contoh: 12 Oktober 2026"
          maxLength={40}
        />
        <Field
          id="ev-location"
          label="Lokasi"
          value={eventLocation}
          onChange={setEventLocation}
          placeholder="Contoh: Bandung"
          maxLength={60}
        />
      </section>

      {formError && (
        <span role="alert" style={{ fontSize: "var(--text-caption-size)", color: "var(--color-danger)" }}>
          {formError}
        </span>
      )}
      {message && (
        <span role="status" style={{ fontSize: "var(--text-caption-size)", color: "var(--color-success)" }}>
          {message}
        </span>
      )}

      <div>
        <Button variant="primary" size="large" type="submit" loading={saving}>
          {saving ? "Menyimpan…" : "Simpan Perubahan"}
        </Button>
      </div>
    </form>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: "var(--text-caption-size)", fontWeight: 500, color: "var(--color-ink-700)" }}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={fieldStyle}
      />
    </div>
  )
}

const fieldStyle: CSSProperties = {
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

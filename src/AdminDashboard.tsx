import { useState, useEffect, useCallback, type CSSProperties } from "react"
import { Button } from "./components/Button"
import { Skeleton } from "./components/Skeleton"
import { EventSettingsForm, InvitePanel, PasscodePanel } from "./AdminSettings"
import {
  adminBulkDeleteGuestbook,
  adminBulkDeleteMedia,
  adminBulkGuestbookApproval,
  adminBulkMediaApproval,
  adminFetchGuestbook,
  adminFetchMedia,
  adminLogin,
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

type Tab = "media" | "guestbook" | "event" | "invite" | "security"
type StatusFilter = "semua" | "tayang" | "belum"
type TypeFilter = "semua" | "foto" | "video"
type SortOrder = "terbaru" | "terlama"

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
  const [event, setEvent] = useState<EventSettings>(FALLBACK_EVENT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("semua")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("semua")
  const [sortOrder, setSortOrder] = useState<SortOrder>("terbaru")

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
      setSelected(new Set())
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

  // Selection is per-tab, so switching tabs clears it to avoid acting on
  // items the admin can no longer see.
  useEffect(() => {
    setSelected(new Set())
  }, [tab])

  /* ── Derived lists ── */

  const visibleMedia = applySort(
    media.filter(m => {
      if (statusFilter === "tayang" && !m.approved) return false
      if (statusFilter === "belum" && m.approved) return false
      if (typeFilter === "foto" && m.isVideo) return false
      if (typeFilter === "video" && !m.isVideo) return false
      return true
    }),
    sortOrder,
  )

  const visibleEntries = applySort(
    entries.filter(e => {
      if (statusFilter === "tayang" && !e.approved) return false
      if (statusFilter === "belum" && e.approved) return false
      return true
    }),
    sortOrder,
  )

  const currentList: { id: string }[] = tab === "guestbook" ? visibleEntries : visibleMedia
  const allSelected = currentList.length > 0 && currentList.every(i => selected.has(i.id))

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(currentList.map(i => i.id)))
  }

  /* ── Bulk actions ── */

  async function run(action: () => Promise<void>) {
    setWorking(true)
    setError(null)
    try {
      await action()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses pilihan.")
    } finally {
      setWorking(false)
    }
  }

  const ids = [...selected]

  function bulkApprove(approved: boolean) {
    if (ids.length === 0) return
    run(() =>
      tab === "guestbook"
        ? adminBulkGuestbookApproval(ids, approved)
        : adminBulkMediaApproval(ids, approved),
    )
  }

  function bulkDelete() {
    if (ids.length === 0) return
    const what = tab === "guestbook" ? "ucapan" : "media"
    if (!confirm(`Hapus ${ids.length} ${what} secara permanen? Tindakan ini tidak bisa dibatalkan.`)) return
    run(() =>
      tab === "guestbook" ? adminBulkDeleteGuestbook(ids) : adminBulkDeleteMedia(ids),
    )
  }

  /* ── Downloads ── */

  /**
   * Triggers each file as its own download. Browsers ask once to allow
   * multiple downloads, then handle the rest, which keeps large videos
   * streaming to disk instead of through page memory.
   */
  async function downloadMediaFiles(list: MediaItem[]) {
    if (list.length === 0) return
    if (
      !confirm(
        `Unduh ${list.length} berkas? Browser mungkin meminta izin untuk mengunduh beberapa berkas sekaligus.`,
      )
    ) {
      return
    }
    for (let i = 0; i < list.length; i++) {
      const link = document.createElement("a")
      link.href = mediaDownloadUrl(list[i])
      link.download = ""
      document.body.appendChild(link)
      link.click()
      link.remove()
      setBulk({ done: i + 1, total: list.length })
      if (i < list.length - 1) {
        await new Promise(resolve => setTimeout(resolve, BULK_DELAY_MS))
      }
    }
    setTimeout(() => setBulk(null), 1500)
  }

  function downloadMediaList(list: MediaItem[]) {
    const rows: (string | number)[][] = [
      ["Nama Pengunggah", "Tipe", "Tayang di Slideshow", "Waktu Unggah", "Tautan Unduh"],
      ...list.map(m => [
        m.uploader ?? "Tanpa nama",
        m.isVideo ? "Video" : "Foto",
        m.approved ? "Ya" : "Tidak",
        formatDateTime(m.createdAt),
        mediaDownloadUrl(m),
      ]),
    ]
    downloadTextFile("daftar-media-potret-pernikahan.csv", toCsv(rows))
  }

  function downloadWishes(list: GuestbookEntry[]) {
    const rows: (string | number)[][] = [
      ["Nama", "Ucapan", "Tayang di Slideshow", "Waktu"],
      ...list.map(e => [
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
  const isModerationTab = tab === "media" || tab === "guestbook"

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "var(--color-canvas)", fontFamily: "var(--font-body)" }}>
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
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <p style={{ margin: 0, fontSize: "var(--text-h3-size)", fontWeight: "var(--text-h3-w)", color: "var(--color-ink-900)", lineHeight: 1.2 }}>
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
        <div style={{ maxWidth: 1120, margin: "12px auto 0", display: "flex", gap: 4, overflowX: "auto" }}>
          <TabButton active={tab === "media"} onClick={() => setTab("media")}>
            Foto &amp; Video ({media.length})
          </TabButton>
          <TabButton active={tab === "guestbook"} onClick={() => setTab("guestbook")}>
            Ucapan ({entries.length})
          </TabButton>
          <TabButton active={tab === "event"} onClick={() => setTab("event")}>
            Acara
          </TabButton>
          <TabButton active={tab === "invite"} onClick={() => setTab("invite")}>
            Undangan QR
          </TabButton>
          <TabButton active={tab === "security"} onClick={() => setTab("security")}>
            Keamanan
          </TabButton>
        </div>
      </header>

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "20px var(--space-screen-edge) 64px" }}>
        {isModerationTab && !loading && (
          <>
            <p style={{ margin: "0 0 16px", fontSize: "var(--text-caption-size)", lineHeight: "var(--text-caption-lh)", color: "var(--color-ink-500)" }}>
              Tandai <strong style={{ color: "var(--color-ink-700)" }}>Tayang</strong> agar item muncul di slideshow layar besar.
              {event.galleryRequiresApproval
                ? " Moderasi galeri aktif: foto yang belum ditandai juga tidak terlihat tamu."
                : " Item yang tidak ditandai tetap ada di galeri, tetapi tidak ikut tampil."}
            </p>

            <Controls
              tab={tab}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              shownCount={currentList.length}
              allSelected={allSelected}
              onToggleAll={toggleSelectAll}
              selectedCount={ids.length}
              working={working}
              onApprove={() => bulkApprove(true)}
              onHide={() => bulkApprove(false)}
              onDelete={bulkDelete}
              onDownloadFiles={
                tab === "media"
                  ? () =>
                      downloadMediaFiles(
                        ids.length > 0 ? visibleMedia.filter(m => selected.has(m.id)) : visibleMedia,
                      )
                  : undefined
              }
              onDownloadCsv={() =>
                tab === "media" ? downloadMediaList(visibleMedia) : downloadWishes(visibleEntries)
              }
              bulk={bulk}
            />
          </>
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
        ) : tab === "invite" ? (
          <InvitePanel coupleNames={event.coupleNames} />
        ) : tab === "security" ? (
          <PasscodePanel />
        ) : tab === "media" ? (
          visibleMedia.length === 0 ? (
            <EmptyNote>
              {media.length === 0
                ? "Belum ada foto atau video yang diunggah tamu."
                : "Tidak ada item yang cocok dengan filter."}
            </EmptyNote>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {visibleMedia.map(item => (
                <MediaCard
                  key={item.id}
                  item={item}
                  selected={selected.has(item.id)}
                  onSelect={() => toggleSelect(item.id)}
                />
              ))}
            </div>
          )
        ) : visibleEntries.length === 0 ? (
          <EmptyNote>
            {entries.length === 0
              ? "Belum ada ucapan dari tamu."
              : "Tidak ada ucapan yang cocok dengan filter."}
          </EmptyNote>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 720 }}>
            {visibleEntries.map(entry => (
              <EntryRow
                key={entry.id}
                entry={entry}
                selected={selected.has(entry.id)}
                onSelect={() => toggleSelect(entry.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function applySort<T extends { createdAt: number }>(list: T[], order: SortOrder): T[] {
  return [...list].sort((a, b) =>
    order === "terbaru" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt,
  )
}

/* ─────────────────────────────────────────
   CONTROL BAR
───────────────────────────────────────── */
function Controls({
  tab,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  sortOrder,
  setSortOrder,
  shownCount,
  allSelected,
  onToggleAll,
  selectedCount,
  working,
  onApprove,
  onHide,
  onDelete,
  onDownloadFiles,
  onDownloadCsv,
  bulk,
}: {
  tab: Tab
  statusFilter: StatusFilter
  setStatusFilter: (v: StatusFilter) => void
  typeFilter: TypeFilter
  setTypeFilter: (v: TypeFilter) => void
  sortOrder: SortOrder
  setSortOrder: (v: SortOrder) => void
  shownCount: number
  allSelected: boolean
  onToggleAll: () => void
  selectedCount: number
  working: boolean
  onApprove: () => void
  onHide: () => void
  onDelete: () => void
  onDownloadFiles?: () => void
  onDownloadCsv: () => void
  bulk: { done: number; total: number } | null
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginBottom: 16,
        paddingBottom: 16,
        borderBottom: "1px solid var(--color-ink-100)",
      }}
    >
      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <Select
          label="Status"
          value={statusFilter}
          onChange={v => setStatusFilter(v as StatusFilter)}
          options={[
            { value: "semua", label: "Semua status" },
            { value: "belum", label: "Belum disetujui" },
            { value: "tayang", label: "Sudah tayang" },
          ]}
        />
        {tab === "media" && (
          <Select
            label="Tipe"
            value={typeFilter}
            onChange={v => setTypeFilter(v as TypeFilter)}
            options={[
              { value: "semua", label: "Semua tipe" },
              { value: "foto", label: "Foto saja" },
              { value: "video", label: "Video saja" },
            ]}
          />
        )}
        <Select
          label="Urutan"
          value={sortOrder}
          onChange={v => setSortOrder(v as SortOrder)}
          options={[
            { value: "terbaru", label: "Terbaru dulu" },
            { value: "terlama", label: "Terlama dulu" },
          ]}
        />
        <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)" }}>
          {shownCount} ditampilkan
        </span>
      </div>

      {/* Selection + actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "var(--text-caption-size)", color: "var(--color-ink-700)" }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleAll}
            style={{ width: 16, height: 16, accentColor: "var(--color-primary-600)", cursor: "pointer" }}
          />
          Pilih semua
        </label>

        {selectedCount > 0 && (
          <>
            <span style={{ fontSize: "var(--text-caption-size)", fontWeight: 600, color: "var(--color-primary-600)" }}>
              {selectedCount} dipilih
            </span>
            <Button variant="primary" size="small" disabled={working} onClick={onApprove}>
              Tayangkan
            </Button>
            <Button variant="secondary" size="small" disabled={working} onClick={onHide}>
              Sembunyikan
            </Button>
            <Button variant="danger" size="small" disabled={working} onClick={onDelete}>
              Hapus
            </Button>
          </>
        )}

        <span style={{ flex: 1 }} />

        {onDownloadFiles && (
          <Button variant="secondary" size="small" disabled={bulk !== null} onClick={onDownloadFiles}>
            {selectedCount > 0 ? `Unduh ${selectedCount} Berkas` : "Unduh Semua Media"}
          </Button>
        )}
        <Button variant="ghost" size="small" onClick={onDownloadCsv}>
          {tab === "media" ? "Daftar Media (CSV)" : "Unduh Ucapan (CSV)"}
        </Button>

        {bulk && (
          <span role="status" style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)" }}>
            Mengunduh {bulk.done} dari {bulk.total}…
          </span>
        )}
      </div>
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        height: 36,
        paddingLeft: 10,
        paddingRight: 28,
        fontSize: "var(--text-caption-size)",
        fontFamily: "var(--font-body)",
        color: "var(--color-ink-900)",
        backgroundColor: "var(--color-surface)",
        border: "1.5px solid var(--color-ink-300)",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
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
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  )
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ textAlign: "center", padding: "64px 24px", margin: 0, color: "var(--color-ink-500)", fontSize: "var(--text-body-size)" }}>
      {children}
    </p>
  )
}

function MediaCard({
  item,
  selected,
  onSelect,
}: {
  item: MediaItem
  selected: boolean
  onSelect: () => void
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        border: `2px solid ${
          selected
            ? "var(--color-primary-600)"
            : item.approved
              ? "rgba(154,106,79,.35)"
              : "var(--color-ink-100)"
        }`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
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

        {/* Select checkbox */}
        <label
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 30,
            height: 30,
            borderRadius: "var(--radius-sm)",
            backgroundColor: "rgba(255,255,255,.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            aria-label="Pilih media ini"
            style={{ width: 16, height: 16, accentColor: "var(--color-primary-600)", cursor: "pointer" }}
          />
        </label>

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

      <div style={{ padding: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
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
        <a
          href={mediaDownloadUrl(item)}
          download
          aria-label="Unduh berkas ini"
          title="Unduh"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
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
      </div>
    </div>
  )
}

function EntryRow({
  entry,
  selected,
  onSelect,
}: {
  entry: GuestbookEntry
  selected: boolean
  onSelect: () => void
}) {
  return (
    <article
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        padding: 16,
        border: `1px solid ${selected ? "var(--color-primary-600)" : "var(--color-ink-100)"}`,
        borderLeft: `3px solid ${entry.approved ? "var(--color-primary-600)" : "var(--color-ink-300)"}`,
        display: "flex",
        gap: 12,
      }}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onSelect}
        aria-label={`Pilih ucapan dari ${entry.author}`}
        style={{ width: 16, height: 16, marginTop: 4, accentColor: "var(--color-primary-600)", cursor: "pointer", flexShrink: 0 }}
      />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: "var(--text-h3-size)", fontWeight: "var(--text-h3-w)", color: "var(--color-ink-900)" }}>
            {entry.author}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {entry.approved && (
              <span
                style={{
                  fontSize: "var(--text-micro-size)",
                  fontWeight: "var(--text-micro-w)",
                  color: "var(--color-primary-600)",
                  backgroundColor: "var(--color-primary-100)",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-full)",
                }}
              >
                Tayang
              </span>
            )}
            <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)" }}>
              {relativeTime(entry.createdAt)}
            </span>
          </div>
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
      </div>
    </article>
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

import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react"
import { Button } from "./components/Button"
import { BottomNav } from "./components/BottomNav"
import { Skeleton } from "./components/Skeleton"
import {
  createGuestbookEntry,
  fetchGuestbook,
  relativeTime,
  type GuestbookEntry as ApiGuestbookEntry,
} from "./lib/api"

type NavItem = "upload" | "gallery" | "guestbook"

interface GuestbookEntry {
  id: string
  author: string
  message: string
  timestamp: string
  isOwn?: boolean
}

function toEntry(entry: ApiGuestbookEntry, isOwn = false): GuestbookEntry {
  return {
    id: entry.id,
    author: entry.author,
    message: entry.message,
    timestamp: relativeTime(entry.createdAt),
    isOwn,
  }
}

export default function GuestbookScreen() {
  const [activeNav, setActiveNav] = useState<NavItem>("guestbook")
  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await fetchGuestbook()
      setEntries(data.map(e => toEntry(e)))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal memuat ucapan.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit(input: { author: string; message: string }) {
    const created = await createGuestbookEntry(input.author, input.message)
    setEntries(prev => [toEntry(created, true), ...prev])
    setSheetOpen(false)
    setToastMsg("Ucapan terkirim. Terima kasih!")
    setTimeout(() => setToastMsg(null), 6000)
  }

  return (
    <div
      style={{
        backgroundColor: "var(--color-canvas)",
        minHeight: "100dvh",
        fontFamily: "var(--font-body)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Header ── */}
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
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: "var(--text-h3-size)", fontWeight: "var(--text-h3-w)", color: "var(--color-ink-900)", lineHeight: 1.2 }}>
              Ucapan
            </p>
            <p style={{ margin: 0, fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", lineHeight: 1.4 }}>
              Dinda & Arya · {entries.length} ucapan
            </p>
          </div>
        </div>
      </header>

      {/* ── Feed ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px var(--space-screen-edge)",
          paddingBottom: "calc(64px + env(safe-area-inset-bottom) + 80px)",
          maxWidth: 680,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {loading ? (
          <SkeletonFeed />
        ) : loadError ? (
          <FeedError message={loadError} onRetry={load} />
        ) : entries.length === 0 ? (
          <EmptyFeed onCompose={() => setSheetOpen(true)} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {entries.map(entry => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      {/* ── Sticky CTA above bottom nav ── */}
      {!loading && !loadError && (
        <div
          style={{
            position: "fixed",
            bottom: `calc(64px + env(safe-area-inset-bottom))`,
            left: 0,
            right: 0,
            zIndex: 45,
            padding: "12px var(--space-screen-edge)",
            background: "linear-gradient(to top, var(--color-canvas) 60%, transparent)",
            maxWidth: 680,
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          <Button
            variant="primary"
            size="large"
            fullWidth
            icon={<PenIcon />}
            onClick={() => setSheetOpen(true)}
          >
            Tulis Ucapan
          </Button>
        </div>
      )}

      {/* ── Toast ── */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: `calc(64px + env(safe-area-inset-bottom) + 80px)`,
            left: "var(--space-screen-edge)",
            right: "var(--space-screen-edge)",
            zIndex: 200,
            animation: "toastIn 250ms var(--ease-enter) both",
          }}
        >
          <style>{`@keyframes toastIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              backgroundColor: "var(--color-surface)",
              border: "1px solid rgba(176,118,28,.25)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p style={{ flex: 1, margin: 0, fontSize: "var(--text-body-size)", color: "var(--color-ink-900)", lineHeight: "var(--text-body-lh)" }}>
              {toastMsg}
            </p>
          </div>
        </div>
      )}

      {/* ── Compose sheet ── */}
      <ComposeSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleSubmit}
      />

      {/* ── Bottom nav ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50 }}>
        <BottomNav active={activeNav} onChange={setActiveNav} />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   ENTRY CARD
───────────────────────────────────────── */
function EntryCard({ entry }: { entry: GuestbookEntry }) {
  return (
    <article
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        padding: 20,
        borderLeft: "2px solid var(--color-primary-100)",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        animation: entry.isOwn ? "fadeSlideUp 250ms var(--ease-enter) both" : "none",
      }}
    >
      <style>{`@keyframes fadeSlideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Author row */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <h3
          style={{
            margin: 0,
            fontSize: "var(--text-h3-size)",
            fontWeight: "var(--text-h3-w)",
            lineHeight: "var(--text-h3-lh)",
            color: "var(--color-ink-900)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {entry.author}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", lineHeight: 1 }}>
            {entry.timestamp}
          </span>
        </div>
      </div>

      {/* Body: message */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-body-lg-size)",
            lineHeight: "var(--text-body-lg-lh)",
            color: "var(--color-ink-700)",
            maxWidth: "68ch",
            wordBreak: "break-word",
          }}
        >
          {entry.message}
        </p>
      </div>
    </article>
  )
}

/* ─────────────────────────────────────────
   LOADING / ERROR STATES
───────────────────────────────────────── */
function SkeletonFeed() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            backgroundColor: "var(--color-surface)",
            borderRadius: "var(--radius-lg)",
            padding: 20,
            borderLeft: "2px solid var(--color-primary-100)",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <Skeleton height={18} width="40%" />
          <Skeleton height={14} width="92%" />
          <Skeleton height={14} width="72%" />
        </div>
      ))}
    </div>
  )
}

function FeedError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "64px 24px",
        gap: 16,
      }}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <p style={{ margin: 0, fontSize: "var(--text-body-size)", lineHeight: "var(--text-body-lh)", color: "var(--color-ink-500)", maxWidth: "32ch" }}>
        {message}
      </p>
      <Button variant="secondary" size="medium" onClick={onRetry}>
        Coba Lagi
      </Button>
    </div>
  )
}

/* ─────────────────────────────────────────
   EMPTY FEED
───────────────────────────────────────── */
function EmptyFeed({ onCompose }: { onCompose: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "80px 24px",
        gap: 20,
      }}
    >
      {/* Monochrome line illustration */}
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <rect x="12" y="14" width="72" height="68" rx="8" stroke="var(--color-ink-300)" strokeWidth="1.5"/>
        {/* left accent line */}
        <rect x="12" y="22" width="2.5" height="52" rx="1.25" fill="var(--color-ink-300)"/>
        {/* text lines */}
        <line x1="24" y1="32" x2="76" y2="32" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="24" y1="42" x2="76" y2="42" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="24" y1="52" x2="60" y2="52" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="24" y1="62" x2="68" y2="62" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round"/>
        {/* pen hint */}
        <path d="M68 70 l8-8 4 4-8 8-5 1 1-5z" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>

      <div>
        <h2
          style={{
            fontSize: "var(--text-h2-size)",
            fontWeight: "var(--text-h2-w)",
            color: "var(--color-ink-900)",
            margin: "0 0 8px",
          }}
        >
          Belum ada ucapan
        </h2>
        <p
          style={{
            fontSize: "var(--text-body-size)",
            lineHeight: "var(--text-body-lh)",
            color: "var(--color-ink-500)",
            margin: 0,
            maxWidth: "36ch",
          }}
        >
          Tulis ucapan pertama untuk Dinda & Arya.
        </p>
      </div>

      <Button variant="primary" size="medium" icon={<PenIcon />} onClick={onCompose}>
        Tulis Ucapan Pertama
      </Button>
    </div>
  )
}

/* ─────────────────────────────────────────
   COMPOSE BOTTOM SHEET
───────────────────────────────────────── */
function ComposeSheet({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (entry: { author: string; message: string }) => Promise<void>
}) {
  const [author, setAuthor] = useState("")
  const [message, setMessage] = useState("")
  const [authorError, setAuthorError] = useState<string | null>(null)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [showValidation, setShowValidation] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const authorRef = useRef<HTMLInputElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Focus name field when sheet opens
  useEffect(() => {
    if (open) {
      setTimeout(() => authorRef.current?.focus(), 320)
    } else {
      // Reset on close
      setAuthor("")
      setMessage("")
      setAuthorError(null)
      setMessageError(null)
      setShowValidation(false)
      setSubmitError(null)
      setSubmitting(false)
    }
  }, [open])

  // Close on backdrop click
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  function validate() {
    let ok = true
    if (!author.trim()) {
      setAuthorError("Nama tidak boleh kosong")
      ok = false
    } else if (author.length > 60) {
      setAuthorError("Nama maksimum 60 karakter")
      ok = false
    } else {
      setAuthorError(null)
    }
    if (!message.trim()) {
      setMessageError("Ucapan tidak boleh kosong")
      ok = false
    } else {
      setMessageError(null)
    }
    return ok
  }

  async function handleSubmit() {
    setShowValidation(true)
    setSubmitError(null)
    if (!validate()) return
    setSubmitting(true)
    try {
      await onSubmit({ author: author.trim(), message: message.trim() })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal mengirim ucapan.")
    } finally {
      setSubmitting(false)
    }
  }

  const msgLen = message.length
  const isOverLimit = msgLen > 500

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        aria-hidden="true"
        onClick={handleBackdropClick}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          backgroundColor: "rgba(28,25,23,0.45)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity var(--duration-base) var(--ease-standard)",
        }}
      />

      {/* ── Sheet ── */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Tulis ucapan"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 110,
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          padding: "0 var(--space-screen-edge) calc(var(--space-screen-edge) + env(safe-area-inset-bottom))",
          maxWidth: 680,
          margin: "0 auto",
          boxShadow: "var(--shadow-lg)",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform var(--duration-base) var(--ease-standard)",
          maxHeight: "92dvh",
          overflowY: "auto",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: "var(--radius-full)", backgroundColor: "var(--color-ink-300)" }} />
        </div>

        {/* Sheet header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0 20px" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "var(--text-h2-size)",
              fontWeight: "var(--text-h2-w)",
              color: "var(--color-ink-900)",
            }}
          >
            Tulis Ucapan
          </h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-ink-500)",
              padding: 8,
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              minWidth: 40,
              minHeight: 40,
              justifyContent: "center",
              transition: "background-color var(--duration-fast) var(--ease-standard)",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--color-ink-100)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Form ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Name field */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              htmlFor="gb-author"
              style={{ fontSize: "var(--text-caption-size)", fontWeight: 500, color: "var(--color-ink-700)" }}
            >
              Nama Anda <span style={{ color: "var(--color-danger)" }} aria-hidden="true">*</span>
            </label>
            <input
              id="gb-author"
              ref={authorRef}
              type="text"
              value={author}
              maxLength={60}
              placeholder="Contoh: Pak Hendra"
              onChange={e => {
                setAuthor(e.target.value)
                if (showValidation) setAuthorError(e.target.value.trim() ? null : "Nama tidak boleh kosong")
              }}
              aria-describedby={authorError ? "gb-author-err" : undefined}
              aria-invalid={!!authorError}
              style={{
                ...fieldBase,
                borderColor: authorError ? "var(--color-danger)" : "var(--color-ink-300)",
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = authorError ? "var(--color-danger)" : "var(--color-primary-600)"
                e.currentTarget.style.boxShadow = authorError
                  ? "0 0 0 3px rgba(168,56,47,.12)"
                  : "0 0 0 3px rgba(154,106,79,.12)"
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = authorError ? "var(--color-danger)" : "var(--color-ink-300)"
                e.currentTarget.style.boxShadow = "none"
              }}
            />
            {authorError && (
              <span
                id="gb-author-err"
                role="alert"
                style={{ fontSize: "var(--text-caption-size)", color: "var(--color-danger)", lineHeight: "var(--text-caption-lh)", display: "flex", alignItems: "center", gap: 5 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {authorError}
              </span>
            )}
            {!authorError && (
              <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)" }}>
                {author.length}/60
              </span>
            )}
          </div>

          {/* Message textarea */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              htmlFor="gb-message"
              style={{ fontSize: "var(--text-caption-size)", fontWeight: 500, color: "var(--color-ink-700)" }}
            >
              Ucapan Anda
            </label>
            <textarea
              id="gb-message"
              value={message}
              rows={4}
              placeholder="Tulis ucapan terbaik untuk pengantin…"
              onChange={e => {
                if (e.target.value.length <= 500) setMessage(e.target.value)
                if (showValidation) setMessageError(e.target.value.trim() ? null : "Ucapan tidak boleh kosong")
              }}
              aria-describedby="gb-message-count"
              style={{
                ...fieldBase,
                height: "auto",
                paddingTop: 12,
                paddingBottom: 12,
                resize: "none",
                lineHeight: "var(--text-body-lg-lh)",
                fontSize: "var(--text-body-lg-size)",
                borderColor: messageError ? "var(--color-danger)" : "var(--color-ink-300)",
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = messageError ? "var(--color-danger)" : "var(--color-primary-600)"
                e.currentTarget.style.boxShadow = messageError
                  ? "0 0 0 3px rgba(168,56,47,.12)"
                  : "0 0 0 3px rgba(154,106,79,.12)"
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = messageError ? "var(--color-danger)" : "var(--color-ink-300)"
                e.currentTarget.style.boxShadow = "none"
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>
                {messageError && (
                  <span
                    role="alert"
                    style={{ fontSize: "var(--text-caption-size)", color: "var(--color-danger)", display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {messageError}
                  </span>
                )}
              </span>
              <span
                id="gb-message-count"
                style={{
                  fontSize: "var(--text-caption-size)",
                  color: isOverLimit ? "var(--color-danger)" : "var(--color-ink-500)",
                  marginLeft: "auto",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {msgLen}/500
              </span>
            </div>
          </div>

          {/* Submit */}
          <div style={{ paddingBottom: 4, display: "flex", flexDirection: "column", gap: 8 }}>
            {submitError && (
              <span
                role="alert"
                style={{ fontSize: "var(--text-caption-size)", color: "var(--color-danger)", lineHeight: "var(--text-caption-lh)" }}
              >
                {submitError}
              </span>
            )}
            <Button
              variant="primary"
              size="large"
              fullWidth
              loading={submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Mengirim\u2026" : "Kirim Ucapan"}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────
   SHARED STYLES & ICONS
───────────────────────────────────────── */
const fieldBase: CSSProperties = {
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
  transition: "border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)",
  boxSizing: "border-box",
}

function PenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  )
}

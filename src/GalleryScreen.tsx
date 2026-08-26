import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type CSSProperties,
} from "react"
import { BottomNav } from "./components/BottomNav"
import { Button } from "./components/Button"
import { Skeleton } from "./components/Skeleton"
import {
  fetchMedia,
  mediaDownloadUrl,
  relativeTime,
  type EventSettings,
  type MediaItem,
} from "./lib/api"

type NavItem = "upload" | "gallery" | "guestbook"
type Filter = "semua" | "foto" | "video"

export default function GalleryScreen({
  event,
  onNavigate,
}: {
  event: EventSettings
  onNavigate?: (view: "upload" | "gallery" | "guestbook") => void
}) {
  const [activeNav, setActiveNav] = useState<NavItem>("gallery")
  const [filter, setFilter] = useState<Filter>("semua")
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setItems(await fetchMedia())
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal memuat galeri.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = items.filter(item =>
    filter === "foto" ? !item.isVideo :
    filter === "video" ? item.isVideo :
    true
  )

  const photoCount = items.filter(i => !i.isVideo).length
  const videoCount = items.filter(i => i.isVideo).length
  const uploaderCount = new Set(items.map(i => i.uploader).filter(Boolean)).size

  function openLightbox(idx: number) {
    setLightboxIndex(idx)
  }
  function closeLightbox() {
    setLightboxIndex(null)
  }

  return (
    <div style={{ backgroundColor: "var(--color-canvas)", minHeight: "100dvh", fontFamily: "var(--font-body)", display: "flex", flexDirection: "column" }}>
      {/* ── Sticky header ── */}
      <header style={{ backgroundColor: "var(--color-surface)", borderBottom: "1px solid var(--color-ink-300)", padding: "14px var(--space-screen-edge)", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: "var(--radius-full)", backgroundColor: "var(--color-primary-100)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-600)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: "var(--text-h3-size)", fontWeight: "var(--text-h3-w)", color: "var(--color-ink-900)", lineHeight: 1.2 }}>Galeri</p>
              <p style={{ margin: 0, fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", lineHeight: 1.4 }}>{event.coupleNames} · {event.eventDate}</p>
            </div>
          </div>

          {/* Filter + count */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <SegmentedFilter value={filter} onChange={setFilter} />
            <p style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", margin: 0, whiteSpace: "nowrap", flexShrink: 0, lineHeight: 1.3 }}>
              {photoCount} foto · {videoCount} video · {uploaderCount} tamu
            </p>
          </div>
        </div>
      </header>

      {/* ── Scrollable area ── */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: "auto", paddingBottom: "calc(64px + env(safe-area-inset-bottom) + 20px)", position: "relative" }}
      >
        <style>{`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes slideDown { from { opacity:0 } to { opacity:1 } }
            @keyframes fadeSlideIn { from { opacity:0 } to { opacity:1 } }
          }
        `}</style>

        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "16px var(--space-screen-edge) 0" }}>
          {loading ? (
            <SkeletonMasonry />
          ) : loadError ? (
            <GalleryError message={loadError} onRetry={load} />
          ) : filtered.length === 0 ? (
            <EmptyGallery />
          ) : (
            <MasonryGrid items={filtered} onOpenLightbox={openLightbox} />
          )}
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && (
        <Lightbox
          items={filtered}
          index={lightboxIndex}
          onClose={closeLightbox}
          onChange={setLightboxIndex}
        />
      )}

      {/* ── Bottom nav ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50 }}>
        <BottomNav
          active={activeNav}
          onChange={v => {
            setActiveNav(v)
            onNavigate?.(v)
          }}
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   MASONRY GRID
   Uses CSS columns for true masonry.
───────────────────────────────────────── */
function MasonryGrid({
  items,
  onOpenLightbox,
}: {
  items: MediaItem[]
  onOpenLightbox: (idx: number) => void
}) {
  return (
    <>
      <style>{`
        .masonry { columns: 2; column-gap: 8px; }
        @media (min-width: 480px) { .masonry { columns: 3; column-gap: 12px; } }
        @media (min-width: 768px) { .masonry { columns: 4; column-gap: 16px; } }
        @media (min-width: 1200px) { .masonry { columns: 5; column-gap: 16px; } }
      `}</style>
      <div className="masonry">
        {items.map((item, idx) => (
          <MediaTile
            key={item.id}
            item={item}
            onClick={() => onOpenLightbox(idx)}
          />
        ))}
      </div>
    </>
  )
}

/* ─────────────────────────────────────────
   MEDIA TILE
───────────────────────────────────────── */
function MediaTile({
  item,
  onClick,
}: {
  item: MediaItem
  onClick: () => void
}) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div style={{ breakInside: "avoid", marginBottom: 8 }}>
      <button
        onClick={onClick}
        aria-label={`Buka media${item.uploader ? ` dari ${item.uploader}` : ""}`}
        style={{
          display: "block",
          width: "100%",
          border: "none",
          padding: 0,
          cursor: "pointer",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          position: "relative",
          backgroundColor: "var(--color-ink-100)",
          minHeight: loaded ? undefined : 160,
        }}
      >
        {item.isVideo ? (
          <video
            src={item.url}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={() => setLoaded(true)}
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              opacity: loaded ? 1 : 0,
              transition: "opacity var(--duration-base) var(--ease-standard)",
            }}
          />
        ) : (
          <img
            src={item.url}
            alt={item.uploader ? `Foto dari ${item.uploader}` : "Foto tamu"}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              opacity: loaded ? 1 : 0,
              transition: "opacity var(--duration-base) var(--ease-standard)",
            }}
          />
        )}

        {/* Video badge */}
        {item.isVideo && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              backgroundColor: "rgba(28,25,23,0.72)",
              borderRadius: "var(--radius-full)",
              padding: "3px 8px",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span style={{ fontSize: 11, color: "white", fontWeight: 600, lineHeight: 1 }}>
              Video
            </span>
          </div>
        )}

        {/* Uploader name overlay */}
        {item.uploader && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "40%",
              background: "linear-gradient(to top, rgba(28,25,23,0.65) 0%, transparent 100%)",
              display: "flex",
              alignItems: "flex-end",
              padding: "0 8px 7px",
              borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
            }}
          >
            <span
              style={{
                fontSize: "var(--text-caption-size)",
                color: "white",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                width: "100%",
                lineHeight: 1.3,
              }}
            >
              {item.uploader}
            </span>
          </div>
        )}
      </button>
    </div>
  )
}

/* ─────────────────────────────────────────
   LIGHTBOX
───────────────────────────────────────── */
function Lightbox({
  items,
  index,
  onClose,
  onChange,
}: {
  items: MediaItem[]
  index: number
  onClose: () => void
  onChange: (i: number) => void
}) {
  const item = items[index]
  const [imgLoaded, setImgLoaded] = useState(false)
  const touchStartX = useRef<number | null>(null)

  // Reset loaded state on index change
  useEffect(() => { setImgLoaded(false) }, [index])

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft" && index > 0) onChange(index - 1)
      if (e.key === "ArrowRight" && index < items.length - 1) onChange(index + 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [index, items.length, onChange, onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 60) {
      if (dx < 0 && index < items.length - 1) onChange(index + 1)
      else if (dx > 0 && index > 0) onChange(index - 1)
    }
    touchStartX.current = null
  }

  const showPrev = index > 0
  const showNext = index < items.length - 1

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tampilan penuh foto"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        backgroundColor: "rgba(28,25,23,0.94)",
        display: "flex",
        flexDirection: "column",
      }}
      onTouchStart={item.isVideo ? undefined : handleTouchStart}
      onTouchEnd={item.isVideo ? undefined : handleTouchEnd}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          flexShrink: 0,
          paddingTop: "calc(14px + env(safe-area-inset-top))",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Tutup"
          style={iconBtnStyle}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Position */}
        <span style={{ fontSize: "var(--text-caption-size)", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
          {index + 1} dari {items.length}
        </span>

        {/* Spacer to balance layout */}
        <div style={{ width: 40 }} />
      </div>

      {/* ── Media area ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Desktop prev arrow */}
        {showPrev && (
          <NavArrow dir="prev" onClick={() => onChange(index - 1)} />
        )}

        {/* Image */}
        <div style={{ position: "relative", maxWidth: "92vw", maxHeight: "84vh" }}>
          {!imgLoaded && (
            <div
              style={{
                width: "min(92vw, 600px)",
                height: "min(84vh, 400px)",
                backgroundColor: "rgba(255,255,255,0.06)",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          )}
          {item.isVideo ? (
            <video
              src={item.url}
              controls
              autoPlay
              playsInline
              onLoadedData={() => setImgLoaded(true)}
              style={{
                display: "block",
                maxWidth: "92vw",
                maxHeight: "84vh",
                width: "auto",
                height: "auto",
                borderRadius: 4,
                opacity: imgLoaded ? 1 : 0,
                transition: "opacity var(--duration-base) var(--ease-standard)",
              }}
            />
          ) : (
            <img
              src={item.url}
              alt={item.uploader ? `Foto dari ${item.uploader}` : "Foto tamu"}
              onLoad={() => setImgLoaded(true)}
              style={{
                display: "block",
                maxWidth: "92vw",
                maxHeight: "84vh",
                width: "auto",
                height: "auto",
                borderRadius: 4,
                opacity: imgLoaded ? 1 : 0,
                transition: "opacity var(--duration-base) var(--ease-standard)",
              }}
            />
          )}
        </div>

        {/* Desktop next arrow */}
        {showNext && (
          <NavArrow dir="next" onClick={() => onChange(index + 1)} />
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div
        style={{
          flexShrink: 0,
          padding: "14px 20px",
          paddingBottom: "calc(14px + env(safe-area-inset-bottom))",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* Uploader info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {item.uploader && (
            <p style={{ margin: 0, fontSize: "var(--text-h3-size)", fontWeight: "var(--text-h3-w)", color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.uploader}
            </p>
          )}
          <p style={{ margin: 0, fontSize: "var(--text-caption-size)", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
            {relativeTime(item.createdAt)}
          </p>
        </div>

        {/* Download */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <a
            href={mediaDownloadUrl(item)}
            download
            aria-label={item.isVideo ? "Unduh video" : "Unduh foto"}
            style={{
              ...iconBtnStyle,
              width: "auto",
              paddingLeft: 14,
              paddingRight: 16,
              gap: 8,
              textDecoration: "none",
              fontSize: "var(--text-caption-size)",
              fontWeight: 600,
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.18)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Unduh
          </a>
        </div>
      </div>
    </div>
  )
}

const iconBtnStyle: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "var(--radius-sm)",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(255,255,255,0.7)",
  backgroundColor: "rgba(255,255,255,0.08)",
  transition: "background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)",
  fontFamily: "var(--font-body)",
}

/* ─────────────────────────────────────────
   DESKTOP NAV ARROWS
───────────────────────────────────────── */
function NavArrow({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  return (
    <>
      <style>{`
        .nav-arrow { display: none; }
        @media (min-width: 768px) { .nav-arrow { display: flex; } }
      `}</style>
      <button
        className="nav-arrow"
        onClick={onClick}
        aria-label={dir === "prev" ? "Foto sebelumnya" : "Foto berikutnya"}
        style={{
          position: "absolute",
          [dir === "prev" ? "left" : "right"]: 16,
          zIndex: 10,
          width: 48,
          height: 48,
          borderRadius: "var(--radius-full)",
          border: "1.5px solid rgba(255,255,255,0.18)",
          backgroundColor: "rgba(28,25,23,0.55)",
          cursor: "pointer",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          backdropFilter: "blur(4px)",
          transition: "background-color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)",
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(28,25,23,0.8)")}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(28,25,23,0.55)")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          {dir === "prev"
            ? <polyline points="15 18 9 12 15 6" />
            : <polyline points="9 6 15 12 9 18" />
          }
        </svg>
      </button>
    </>
  )
}

/* ─────────────────────────────────────────
   SEGMENTED FILTER
───────────────────────────────────────── */
function SegmentedFilter({
  value,
  onChange,
}: {
  value: Filter
  onChange: (f: Filter) => void
}) {
  const options: { id: Filter; label: string }[] = [
    { id: "semua", label: "Semua" },
    { id: "foto",  label: "Foto" },
    { id: "video", label: "Video" },
  ]

  return (
    <div
      role="group"
      aria-label="Filter media"
      style={{
        display: "flex",
        backgroundColor: "var(--color-ink-100)",
        borderRadius: "var(--radius-md)",
        padding: 3,
        gap: 2,
      }}
    >
      {options.map(opt => (
        <button
          key={opt.id}
          role="radio"
          aria-checked={value === opt.id}
          onClick={() => onChange(opt.id)}
          style={{
            padding: "5px 14px",
            fontSize: "var(--text-caption-size)",
            fontWeight: value === opt.id ? 600 : 400,
            fontFamily: "var(--font-body)",
            color: value === opt.id ? "var(--color-ink-900)" : "var(--color-ink-500)",
            backgroundColor: value === opt.id ? "var(--color-surface)" : "transparent",
            border: "none",
            borderRadius: "calc(var(--radius-md) - 3px)",
            cursor: "pointer",
            transition: "background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)",
            boxShadow: value === opt.id ? "var(--shadow-sm)" : "none",
            height: 32,
            lineHeight: 1,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────
   SKELETON MASONRY
───────────────────────────────────────── */
function SkeletonMasonry({ count = 12 }: { count?: number }) {
  // Vary heights to mimic organic masonry
  const heights = [220, 150, 290, 180, 240, 160, 200, 270, 140, 210, 180, 250]
  return (
    <div className="masonry">
      <style>{`
        .masonry { columns: 2; column-gap: 8px; }
        @media (min-width: 480px) { .masonry { columns: 3; column-gap: 12px; } }
        @media (min-width: 768px) { .masonry { columns: 4; column-gap: 16px; } }
        @media (min-width: 1200px) { .masonry { columns: 5; column-gap: 16px; } }
      `}</style>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ breakInside: "avoid", marginBottom: 8 }}>
          <Skeleton height={heights[i % heights.length]} radius="var(--radius-lg)" />
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────
   ERROR STATE
───────────────────────────────────────── */
function GalleryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "80px 24px",
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
   EMPTY STATE
───────────────────────────────────────── */
function EmptyGallery() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "80px 24px",
        gap: 16,
      }}
    >
      {/* Monochrome line illustration */}
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <rect x="8" y="20" width="80" height="60" rx="8" stroke="var(--color-ink-300)" strokeWidth="1.5"/>
        <rect x="18" y="30" width="28" height="20" rx="4" stroke="var(--color-ink-300)" strokeWidth="1.5"/>
        <rect x="50" y="30" width="28" height="20" rx="4" stroke="var(--color-ink-300)" strokeWidth="1.5"/>
        <rect x="18" y="56" width="60" height="16" rx="4" stroke="var(--color-ink-300)" strokeWidth="1.5"/>
        <circle cx="26" cy="38" r="4" stroke="var(--color-ink-300)" strokeWidth="1.5"/>
        <path d="M22 48 l6-6 5 5 5-5 8 6" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Plus icon hinting at upload */}
        <circle cx="76" cy="22" r="10" stroke="var(--color-ink-300)" strokeWidth="1.5"/>
        <line x1="76" y1="17" x2="76" y2="27" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="71" y1="22" x2="81" y2="22" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>

      <div>
        <h2 style={{ fontSize: "var(--text-h2-size)", fontWeight: "var(--text-h2-w)", color: "var(--color-ink-900)", margin: "0 0 8px" }}>
          Belum ada foto di sini
        </h2>
        <p style={{ fontSize: "var(--text-body-size)", lineHeight: "var(--text-body-lh)", color: "var(--color-ink-500)", margin: 0, maxWidth: "32ch" }}>
          Jadilah yang pertama berbagi momen indah hari ini.
        </p>
      </div>

      <Button variant="primary" size="medium" icon={
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
        </svg>
      }>
        Bagikan Foto Pertama
      </Button>
    </div>
  )
}

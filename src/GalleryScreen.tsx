import {
  useState,
  useEffect,
  useRef,
  type CSSProperties,
} from "react"
import { BottomNav } from "./components/BottomNav"
import { Button } from "./components/Button"
import { Skeleton } from "./components/Skeleton"

type NavItem = "upload" | "gallery" | "guestbook"
type Filter = "semua" | "foto" | "video"

interface MediaItem {
  id: string
  url: string       // full-res
  thumb: string     // small, fast
  lqip: string      // blurred placeholder color
  w: number
  h: number
  uploader: string | null
  isVideo: boolean
  duration?: string
  uploadedAt: string
  isNew?: boolean
}

// ── Photo pool ─────────────────────────────────────────────────────
const PHOTO_IDS = [
  { id: "1650377509454-1bbd8392e122", w: 4000, h: 6000, up: "Rina Kusuma",     lqip: "#c9bfb0" },
  { id: "1541700513212-79f419c0221d", w: 5074, h: 3383, up: null,              lqip: "#b8c4b0" },
  { id: "1650377509488-724221735c19", w: 4000, h: 6000, up: "Pak Hendra",      lqip: "#cfc4b8" },
  { id: "1623991614441-2b124385eb63", w: 3633, h: 5450, up: "Siti Rahayu",     lqip: "#d4c0a8" },
  { id: "1757017199822-beab923a1afc", w: 5464, h: 8192, up: null,              lqip: "#e8d8c8" },
  { id: "1667353931393-7cf46f3d0649", w: 4000, h: 6000, up: "Bagas Santoso",   lqip: "#b0bccc" },
  { id: "1715911431612-2666e9c5b89a", w: 3456, h: 5184, up: "Keluarga Wahyu",  lqip: "#d8c8b8" },
  { id: "1715588837113-80441978e93e", w: 3552, h: 5328, up: null,              lqip: "#c8c0b8" },
  { id: "1749883530206-30804e13c72d", w: 4000, h: 6000, up: "Rombongan Jogja", lqip: "#d0bcac" },
  { id: "1715911431567-51810f0f0220", w: 3456, h: 5184, up: "Ibu Sari",        lqip: "#c8d0c0" },
  { id: "1525272149490-82288cb110a0", w: 6000, h: 4000, up: null,              lqip: "#e0d0c0" },
  { id: "1610604708806-a5c1d7c9bc21", w: 6240, h: 4160, up: "Pak Budi",        lqip: "#bcc8d0" },
  { id: "1613128517270-f3983564ed8d", w: 3998, h: 6000, up: "Mbak Dewi",       lqip: "#f0e8e0" },
  { id: "1555041113-88b42409cf7f",    w: 3264, h: 4896, up: null,              lqip: "#d8c8c0" },
  { id: "1613128518101-e15cf2fdc7d7", w: 6000, h: 4000, up: "Keluarga Santoso",lqip: "#e8dcd0" },
  { id: "1715588837150-c66c33f055f8", w: 6233, h: 9350, up: "Nisa Amalia",     lqip: "#c8c0b0" },
  { id: "1715588837145-e177cc797c1a", w: 6216, h: 9324, up: null,              lqip: "#d0c8bc" },
  { id: "1623991611322-b52b91aff8d7", w: 3710, h: 5566, up: "Tim Dekorasi",    lqip: "#dcc8b8" },
  { id: "1660068087403-69045a7f2ab6", w: 6000, h: 4000, up: "Pak Hendra",      lqip: "#c4b8b0" },
  { id: "1715588837113-80441978e93e", w: 3552, h: 5328, up: "Rina Kusuma",     lqip: "#d4ccc4" },
]

const VIDEO_IDS = [2, 5, 11, 16] // indices into PHOTO_IDS that will be treated as video
const DURATIONS = ["0:34", "1:12", "0:58", "2:03"]

let _itemSeq = 0

function buildItems(count = 30, offset = 0): MediaItem[] {
  return Array.from({ length: count }, (_, i) => {
    const src = PHOTO_IDS[(i + offset) % PHOTO_IDS.length]
    const vidIdx = VIDEO_IDS.indexOf((i + offset) % PHOTO_IDS.length)
    const isVideo = vidIdx !== -1
    return {
      id: `item-${_itemSeq++}`,
      url: `https://images.unsplash.com/photo-${src.id}?w=1200&auto=format`,
      thumb: `https://images.unsplash.com/photo-${src.id}?w=400&h=${Math.round(400 * src.h / src.w)}&fit=crop&auto=format`,
      lqip: src.lqip,
      w: src.w,
      h: src.h,
      uploader: src.up,
      isVideo,
      duration: isVideo ? DURATIONS[vidIdx] : undefined,
      uploadedAt: `${Math.max(1, 60 - i * 2)} menit lalu`,
    }
  })
}

const INITIAL_ITEMS = buildItems(30, 0)
const NEW_ARRIVALS: MediaItem[] = [
  {
    id: "new-1",
    url: `https://images.unsplash.com/photo-1660068087403-69045a7f2ab6?w=1200&auto=format`,
    thumb: `https://images.unsplash.com/photo-1660068087403-69045a7f2ab6?w=400&h=267&fit=crop&auto=format`,
    lqip: "#c4b8b0",
    w: 6000, h: 4000,
    uploader: "Bagas Santoso",
    isVideo: false,
    uploadedAt: "baru saja",
    isNew: true,
  },
  {
    id: "new-2",
    url: `https://images.unsplash.com/photo-1623991611322-b52b91aff8d7?w=1200&auto=format`,
    thumb: `https://images.unsplash.com/photo-1623991611322-b52b91aff8d7?w=400&h=600&fit=crop&auto=format`,
    lqip: "#dcc8b8",
    w: 3710, h: 5566,
    uploader: null,
    isVideo: false,
    uploadedAt: "baru saja",
    isNew: true,
  },
  {
    id: "new-3",
    url: `https://images.unsplash.com/photo-1715911431567-51810f0f0220?w=1200&auto=format`,
    thumb: `https://images.unsplash.com/photo-1715911431567-51810f0f0220?w=400&h=600&fit=crop&auto=format`,
    lqip: "#c8d0c0",
    w: 3456, h: 5184,
    uploader: "Ibu Sari",
    isVideo: true,
    duration: "0:47",
    uploadedAt: "baru saja",
    isNew: true,
  },
]

export default function GalleryScreen() {
  const [activeNav, setActiveNav] = useState<NavItem>("gallery")
  const [filter, setFilter] = useState<Filter>("semua")
  const [items, setItems] = useState<MediaItem[]>(INITIAL_ITEMS)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [newBadgeCount, setNewBadgeCount] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const newArrivalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Simulate initial load delay
  useEffect(() => {
    const t = setTimeout(() => setInitialLoading(false), 1200)
    return () => clearTimeout(t)
  }, [])

  // Simulate realtime arrivals after 3.5s
  useEffect(() => {
    const t = setTimeout(() => {
      setNewBadgeCount(3)
    }, 3500)
    return () => clearTimeout(t)
  }, [])

  // Infinite scroll sentinel
  useEffect(() => {
    if (initialLoading) return
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          loadMore()
        }
      },
      { rootMargin: "400px" }
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [loading, hasMore, initialLoading])

  function loadMore() {
    if (loading || !hasMore) return
    setLoading(true)
    setTimeout(() => {
      const next = page + 1
      setItems(prev => [...prev, ...buildItems(30, page * 30)])
      setPage(next)
      if (next >= 4) setHasMore(false)
      setLoading(false)
    }, 900)
  }

  function handleNewBadgeClick() {
    const ids = new Set(NEW_ARRIVALS.map(n => n.id))
    setNewItemIds(ids)
    setItems(prev => [...NEW_ARRIVALS, ...prev])
    setNewBadgeCount(0)
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    // Clear highlight after animation
    setTimeout(() => setNewItemIds(new Set()), 1200)
  }

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
              <p style={{ margin: 0, fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", lineHeight: 1.4 }}>Dinda & Arya · 12 Oktober 2026</p>
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
        {/* New arrivals badge */}
        {newBadgeCount > 0 && (
          <div style={{ position: "sticky", top: 12, zIndex: 30, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
            <button
              onClick={handleNewBadgeClick}
              style={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                gap: 6,
                backgroundColor: "var(--color-ink-900)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-full)",
                padding: "8px 16px",
                fontSize: "var(--text-caption-size)",
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                cursor: "pointer",
                boxShadow: "var(--shadow-md)",
                animation: "slideDown 250ms var(--ease-enter) both",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {newBadgeCount} foto baru
            </button>
          </div>
        )}

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
          {initialLoading ? (
            <SkeletonMasonry />
          ) : filtered.length === 0 ? (
            <EmptyGallery />
          ) : (
            <>
              <MasonryGrid
                items={filtered}
                newItemIds={newItemIds}
                onOpenLightbox={openLightbox}
              />
              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} style={{ height: 1 }} />
              {loading && (
                <div style={{ padding: "20px 0" }}>
                  <SkeletonMasonry count={6} />
                </div>
              )}
              {!hasMore && (
                <p style={{ textAlign: "center", fontSize: "var(--text-caption-size)", color: "var(--color-ink-300)", padding: "24px 0" }}>
                  Semua foto sudah ditampilkan
                </p>
              )}
            </>
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
        <BottomNav active={activeNav} onChange={setActiveNav} />
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
  newItemIds,
  onOpenLightbox,
}: {
  items: MediaItem[]
  newItemIds: Set<string>
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
            isNew={newItemIds.has(item.id)}
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
  isNew,
  onClick,
}: {
  item: MediaItem
  isNew: boolean
  onClick: () => void
}) {
  const [loaded, setLoaded] = useState(false)
  const ratio = item.h / item.w

  return (
    <div
      style={{
        breakInside: "avoid",
        marginBottom: 8,
        animation: isNew ? "fadeSlideIn 250ms var(--ease-enter) both" : "none",
      }}
    >
      <button
        onClick={onClick}
        aria-label={`Buka foto${item.uploader ? ` dari ${item.uploader}` : ""}`}
        style={{
          display: "block",
          width: "100%",
          border: "none",
          padding: 0,
          cursor: "pointer",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          position: "relative",
          backgroundColor: item.lqip,
          // maintain aspect ratio via padding trick
          aspectRatio: `${item.w} / ${item.h}`,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.02)" }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)" }}
      >
        {/* LQIP blurred placeholder */}
        {!loaded && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: item.lqip,
              filter: "blur(8px)",
              transform: "scale(1.05)",
            }}
          />
        )}

        <img
          src={item.thumb}
          alt={item.uploader ? `Foto dari ${item.uploader}` : "Foto tamu"}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            inset: 0,
            opacity: loaded ? 1 : 0,
            transition: "opacity var(--duration-base) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)",
          }}
        />

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
              {item.duration}
            </span>
          </div>
        )}

        {/* Uploader name overlay — bottom 20% gradient */}
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
  const [isFav, setIsFav] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
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
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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
                backgroundColor: item.lqip,
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
            {item.uploadedAt}
          </p>
        </div>

        {/* Owner actions */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {/* Favorite */}
          <button
            onClick={() => setIsFav(f => !f)}
            aria-label={isFav ? "Hapus dari favorit" : "Tandai favorit"}
            style={{ ...iconBtnStyle, color: isFav ? "#C9A227" : "rgba(255,255,255,0.7)" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>

          {/* Hide from slideshow */}
          <button
            onClick={() => setIsHidden(h => !h)}
            aria-label={isHidden ? "Tampilkan di slideshow" : "Sembunyikan dari slideshow"}
            style={{ ...iconBtnStyle, color: isHidden ? "var(--color-warning)" : "rgba(255,255,255,0.7)" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              {isHidden ? (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </>
              )}
            </svg>
          </button>

          {/* Delete */}
          <button
            aria-label="Hapus foto"
            style={{ ...iconBtnStyle, color: "rgba(255,255,255,0.7)" }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(168,56,47,0.25)"; e.currentTarget.style.color = "#ff9b9b" }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.7)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
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

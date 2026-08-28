import { useState, useEffect } from "react"
import { Button } from "./components/Button"
import { BottomNav } from "./components/BottomNav"
import { Skeleton } from "./components/Skeleton"
import {
  fetchGuestbook,
  fetchMedia,
  relativeTime,
  type GuestbookEntry,
  type EventSettings,
  type MediaItem,
} from "./lib/api"
import { useHeicImage } from "./lib/useHeicImage"

type NavItem = "upload" | "gallery" | "guestbook"

export default function GuestLanding({
  event,
  onNavigate,
}: {
  event: EventSettings
  onNavigate?: (view: "upload" | "gallery" | "guestbook") => void
}) {
  const [activeNav, setActiveNav] = useState<NavItem>("upload")
  const [media, setMedia] = useState<MediaItem[]>([])
  const [wishes, setWishes] = useState<GuestbookEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Latest few of each, refreshed whenever the landing screen mounts.
  useEffect(() => {
    let cancelled = false
    async function load() {
      const [mediaResult, wishResult] = await Promise.allSettled([
        fetchMedia(),
        fetchGuestbook(),
      ])
      if (cancelled) return
      if (mediaResult.status === "fulfilled") setMedia(mediaResult.value.slice(0, 3))
      if (wishResult.status === "fulfilled") setWishes(wishResult.value.slice(0, 1))
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

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
      {/* ── 1. Cover photo ── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          // 16:9 but capped so the CTAs stay above the fold on 360×640
          // On 360px wide → 360 × (9/16) = 202.5px. That leaves ~437px for CTAs + nav.
          // We clamp to 56vw max so on wide screens it stays proportional.
          aspectRatio: "16 / 9",
          maxHeight: "56vw",
          overflow: "hidden",
          flexShrink: 0,
          backgroundColor: "#c9bfb0", // warm fallback while image loads
        }}
      >
        <img
          src={event.coverUrl}
          alt={`Foto sampul pernikahan ${event.coupleNames}`}
          // LCP element — no lazy load
          loading="eager"
          fetchPriority="high"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 30%",
          }}
        />

        {/* Dark gradient over bottom 40% */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(28,25,23,0.82) 0%, rgba(28,25,23,0.4) 40%, transparent 70%)",
          }}
        />

        {/* Couple name + date overlaid on gradient */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "20px var(--space-screen-edge) 20px",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-display-size)",
              lineHeight: "var(--text-display-lh)",
              fontWeight: "var(--text-display-w)",
              color: "#ffffff",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {event.coupleNames}
          </h1>
          <p
            style={{
              fontSize: "var(--text-caption-size)",
              lineHeight: "var(--text-caption-lh)",
              color: "rgba(255,255,255,0.8)",
              margin: "4px 0 0",
            }}
          >
            {event.eventDate}
            {event.eventLocation ? ` · ${event.eventLocation}` : ""}
          </p>
        </div>
      </div>

      {/* ── Scrollable content below cover ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingBottom: "calc(64px + env(safe-area-inset-bottom) + 16px)",
        }}
      >
        {/* ── 2. Primary CTAs ── */}
        <div
          style={{
            padding: "20px var(--space-screen-edge) 0",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Button
            variant="primary"
            size="large"
            fullWidth
            icon={<CameraIcon />}
            onClick={() => onNavigate?.("upload")}
          >
            Bagikan Foto &amp; Video
          </Button>
          <Button
            variant="secondary"
            size="large"
            fullWidth
            icon={<PenIcon />}
            onClick={() => onNavigate?.("guestbook")}
          >
            Tulis Ucapan
          </Button>
        </div>

        {/* ── 3. Galeri Terbaru ── */}
        <section
          style={{ padding: "32px var(--space-screen-edge) 0" }}
          aria-labelledby="galeri-heading"
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <h2
              id="galeri-heading"
              style={{
                fontSize: "var(--text-h2-size)",
                lineHeight: "var(--text-h2-lh)",
                fontWeight: "var(--text-h2-w)",
                color: "var(--color-ink-900)",
                margin: 0,
              }}
            >
              Galeri Terbaru
            </h2>
            <button
              onClick={() => onNavigate?.("gallery")}
              style={{
                fontSize: "var(--text-caption-size)",
                color: "var(--color-primary-600)",
                fontWeight: 500,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 0",
                fontFamily: "var(--font-body)",
              }}
            >
              Lihat semua
            </button>
          </div>

          {/* 3 thumbnails, equal-width, 8px gap */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
            }}
          >
            {loading
              ? [0, 1, 2].map(i => (
                  <div key={i} style={{ aspectRatio: "1 / 1" }}>
                    <Skeleton height="100%" radius="var(--radius-lg)" />
                  </div>
                ))
              : media.map(item => (
                  <GuestThumbnailTile
                    key={item.id}
                    item={item}
                    onClick={() => onNavigate?.("gallery")}
                  />
                ))}
          </div>

          {!loading && media.length === 0 && (
            <p
              style={{
                fontSize: "var(--text-caption-size)",
                lineHeight: "var(--text-caption-lh)",
                color: "var(--color-ink-500)",
                margin: 0,
              }}
            >
              Belum ada foto. Jadilah yang pertama berbagi momen hari ini.
            </p>
          )}
        </section>

        {/* ── 4. Ucapan Terbaru ── */}
        <section
          style={{ padding: "32px var(--space-screen-edge) 0" }}
          aria-labelledby="ucapan-heading"
        >
          <h2
            id="ucapan-heading"
            style={{
              fontSize: "var(--text-h2-size)",
              lineHeight: "var(--text-h2-lh)",
              fontWeight: "var(--text-h2-w)",
              color: "var(--color-ink-900)",
              margin: "0 0 12px",
            }}
          >
            Ucapan Terbaru
          </h2>

          {loading ? (
            <div
              style={{
                backgroundColor: "var(--color-surface)",
                borderRadius: "var(--radius-lg)",
                padding: "16px 20px",
                border: "1px solid var(--color-ink-100)",
                borderLeft: "2px solid var(--color-primary-100)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <Skeleton height={18} width="40%" />
              <Skeleton height={14} width="90%" />
            </div>
          ) : wishes.length === 0 ? (
            <p
              style={{
                fontSize: "var(--text-caption-size)",
                lineHeight: "var(--text-caption-lh)",
                color: "var(--color-ink-500)",
                margin: 0,
              }}
            >
              Belum ada ucapan. Tulis ucapan pertama untuk pengantin.
            </p>
          ) : (
            wishes.map(wish => (
              <GuestbookCard
                key={wish.id}
                name={wish.author}
                message={wish.message}
                time={relativeTime(wish.createdAt)}
              />
            ))
          )}
        </section>
      </div>

      {/* ── 5. Fixed bottom navigation ── */}
      <div
        style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100 }}
      >
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

/* ── Guestbook card ── */
function GuestbookCard({
  name,
  message,
  time,
}: {
  name: string
  message: string
  time: string
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        padding: "16px 20px",
        borderLeft: "2px solid var(--color-primary-100)",
        boxShadow: "var(--shadow-sm)",
        border: "1px solid var(--color-ink-100)",
        // The left accent overrides the left portion of the border
        borderLeftColor: "var(--color-primary-100)",
        borderLeftWidth: 2,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: "var(--text-h3-size)",
            fontWeight: "var(--text-h3-w)",
            lineHeight: "var(--text-h3-lh)",
            color: "var(--color-ink-900)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontSize: "var(--text-caption-size)",
            lineHeight: "var(--text-caption-lh)",
            color: "var(--color-ink-500)",
            flexShrink: 0,
          }}
        >
          {time}
        </span>
      </div>
      <p
        style={{
          fontSize: "var(--text-body-lg-size)",
          lineHeight: "var(--text-body-lg-lh)",
          color: "var(--color-ink-700)",
          margin: 0,
        }}
      >
          {message}
        </p>
    </div>
  )
}

/* ── Inline icons ── */
function CameraIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function PenIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

function GuestThumbnailTile({
  item,
  onClick,
}: {
  item: MediaItem
  onClick?: () => void
}) {
  const [loaded, setLoaded] = useState(false)
  const displayUrl = useHeicImage(item)

  return (
    <button
      aria-label={item.uploader ? `Foto dari ${item.uploader}` : "Foto tamu"}
      onClick={onClick}
      style={{
        padding: 0,
        border: "none",
        background: "var(--color-ink-100)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        cursor: "pointer",
        aspectRatio: "1 / 1",
        display: "block",
        width: "100%",
        position: "relative",
      }}
      onMouseEnter={e =>
        ((e.currentTarget as HTMLButtonElement).style.opacity = "0.88")
      }
      onMouseLeave={e =>
        ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
      }
    >
      {item.isVideo ? (
        <video
          src={item.url}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={() => setLoaded(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: loaded ? 1 : 0,
            transition: "opacity var(--duration-fast) var(--ease-standard)",
          }}
        />
      ) : (
        <img
          src={displayUrl}
          alt={item.uploader ? `Foto dari ${item.uploader}` : "Foto tamu"}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: loaded ? 1 : 0,
            transition: "opacity var(--duration-fast) var(--ease-standard)",
          }}
        />
      )}
    </button>
  )
}

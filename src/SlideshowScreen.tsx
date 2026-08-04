import { useState, useEffect, useCallback, useRef } from "react"
import {
  fetchSlideshow,
  type GuestbookEntry,
  type MediaItem,
  type SlideshowSettings,
} from "./lib/api"

const REFRESH_MS = 30000

/** Fisher-Yates, so shuffled order is uniform rather than sort-comparator luck. */
function shuffled<T>(list: T[]): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function SlideshowScreen() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [wishes, setWishes] = useState<GuestbookEntry[]>([])
  const [settings, setSettings] = useState<SlideshowSettings>({
    durationMs: 7000,
    shuffle: false,
  })
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showChrome, setShowChrome] = useState(true)
  const chromeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchSlideshow()
      setSettings(data.settings)
      setItems(prev => {
        // Keep the current position stable when the set of items is unchanged,
        // so a refresh never restarts or reorders a running show.
        const sameSet =
          prev.length === data.items.length &&
          prev.every(p => data.items.some(n => n.id === p.id))
        if (sameSet) return prev
        return data.settings.shuffle ? shuffled(data.items) : data.items
      })
      setWishes(data.wishes)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat slideshow.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

  // Keep the index inside the list as items come and go.
  useEffect(() => {
    if (items.length > 0 && index >= items.length) setIndex(0)
  }, [items.length, index])

  const advance = useCallback(() => {
    setIndex(i => (items.length === 0 ? 0 : (i + 1) % items.length))
  }, [items.length])

  const current = items[index]

  // Photos advance on a timer; videos advance when they finish.
  useEffect(() => {
    if (!current || current.isVideo || items.length <= 1) return
    const t = setTimeout(advance, settings.durationMs)
    return () => clearTimeout(t)
  }, [current, advance, items.length, settings.durationMs])

  // Auto-hide the on-screen controls so the projector view stays clean.
  const wakeChrome = useCallback(() => {
    setShowChrome(true)
    if (chromeTimer.current) clearTimeout(chromeTimer.current)
    chromeTimer.current = setTimeout(() => setShowChrome(false), 3000)
  }, [])

  useEffect(() => {
    wakeChrome()
    return () => {
      if (chromeTimer.current) clearTimeout(chromeTimer.current)
    }
  }, [wakeChrome])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") advance()
      if (e.key === "ArrowLeft") {
        setIndex(i => (items.length === 0 ? 0 : (i - 1 + items.length) % items.length))
      }
      if (e.key === "f") toggleFullscreen()
      wakeChrome()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [advance, items.length, wakeChrome])

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen().catch(() => {})
  }

  // A wish is paired with each slide so the screen always has something warm on it.
  const wish = wishes.length > 0 ? wishes[index % wishes.length] : null

  return (
    <div
      onMouseMove={wakeChrome}
      onTouchStart={wakeChrome}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#0f0d0c",
        fontFamily: "var(--font-body)",
        overflow: "hidden",
        cursor: showChrome ? "default" : "none",
      }}
    >
      <style>{`
        @keyframes slideFade {
          from { opacity: 0; transform: scale(1.02); }
          to   { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes slideFade { from { opacity: 0 } to { opacity: 1 } }
        }
      `}</style>

      {loading ? (
        <Centered>Memuat slideshow…</Centered>
      ) : error ? (
        <Centered>{error}</Centered>
      ) : items.length === 0 ? (
        <Centered>
          <span style={{ display: "block", fontSize: 28, marginBottom: 12 }}>
            Belum ada media yang ditayangkan
          </span>
          <span style={{ fontSize: 18, color: "rgba(255,255,255,0.55)" }}>
            Tandai foto atau video sebagai “Tayang” di dashboard admin.
          </span>
        </Centered>
      ) : (
        <>
          {/* Slide */}
          <div
            key={current?.id}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "slideFade 700ms var(--ease-enter) both",
            }}
          >
            {current?.isVideo ? (
              <video
                ref={videoRef}
                src={current.url}
                autoPlay
                muted
                playsInline
                onEnded={advance}
                onError={advance}
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            ) : (
              <img
                src={current?.url}
                alt={current?.uploader ? `Foto dari ${current.uploader}` : "Foto tamu"}
                onError={advance}
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            )}
          </div>

          {/* Uploader credit */}
          {current?.uploader && (
            <div
              style={{
                position: "absolute",
                left: 40,
                bottom: 40,
                padding: "10px 18px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "rgba(15,13,12,0.55)",
                backdropFilter: "blur(6px)",
                color: "#fff",
                fontSize: 20,
                fontWeight: 500,
              }}
            >
              {current.uploader}
            </div>
          )}

          {/* Rotating wish */}
          {wish && (
            <div
              style={{
                position: "absolute",
                right: 40,
                bottom: 40,
                maxWidth: "38vw",
                padding: "16px 22px",
                borderRadius: "var(--radius-lg)",
                backgroundColor: "rgba(15,13,12,0.55)",
                backdropFilter: "blur(6px)",
                color: "#fff",
                borderLeft: "3px solid var(--color-accent-500)",
              }}
            >
              <p style={{ margin: "0 0 6px", fontSize: 20, lineHeight: 1.45 }}>
                “{wish.message}”
              </p>
              <p style={{ margin: 0, fontSize: 16, color: "rgba(255,255,255,0.65)" }}>
                — {wish.author}
              </p>
            </div>
          )}

          {/* Progress dots */}
          <div
            style={{
              position: "absolute",
              top: 28,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 6,
              opacity: showChrome ? 1 : 0,
              transition: "opacity var(--duration-base) var(--ease-standard)",
            }}
          >
            {items.slice(0, 24).map((it, i) => (
              <span
                key={it.id}
                style={{
                  width: i === index ? 20 : 6,
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: i === index ? "#fff" : "rgba(255,255,255,0.35)",
                  transition: "width var(--duration-base) var(--ease-standard)",
                }}
              />
            ))}
          </div>

          {/* Controls */}
          <div
            style={{
              position: "absolute",
              top: 24,
              right: 28,
              display: "flex",
              gap: 8,
              opacity: showChrome ? 1 : 0,
              transition: "opacity var(--duration-base) var(--ease-standard)",
            }}
          >
            <ChromeButton onClick={toggleFullscreen}>Layar Penuh</ChromeButton>
            <ChromeButton onClick={() => { window.location.hash = "#/admin" }}>
              Admin
            </ChromeButton>
          </div>
        </>
      )}
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.8)",
        fontSize: 22,
        textAlign: "center",
        padding: 32,
      }}
    >
      {children}
    </div>
  )
}

function ChromeButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: "var(--radius-full)",
        border: "1px solid rgba(255,255,255,0.2)",
        backgroundColor: "rgba(15,13,12,0.55)",
        color: "#fff",
        fontSize: 14,
        fontWeight: 500,
        fontFamily: "var(--font-body)",
        cursor: "pointer",
        backdropFilter: "blur(6px)",
      }}
    >
      {children}
    </button>
  )
}

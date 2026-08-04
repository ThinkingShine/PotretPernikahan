import { useState } from "react"
import { Button } from "./components/Button"
import { BottomNav } from "./components/BottomNav"

type NavItem = "upload" | "gallery" | "guestbook"

// Cover: Indonesian wedding couple, cropped 16:9
const COVER_URL =
  "https://images.unsplash.com/photo-1650377509454-1bbd8392e122?w=800&h=450&fit=crop&auto=format"

// Gallery thumbnails — three distinct wedding shots
const THUMBNAILS = [
  {
    url: "https://images.unsplash.com/photo-1541700513212-79f419c0221d?w=400&h=400&fit=crop&auto=format",
    alt: "Foto dari Rina, pasangan berjalan di taman",
  },
  {
    url: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=400&h=400&fit=crop&auto=format",
    alt: "Foto dari Pak Hendra, tamu mengangkat gelas",
  },
  {
    url: "https://images.unsplash.com/photo-1714972383570-44ddc9738355?w=400&h=400&fit=crop&auto=format",
    alt: "Foto dari Bagas, lantai dansa resepsi",
  },
]

export default function GuestLanding() {
  const [activeNav, setActiveNav] = useState<NavItem>("upload")

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
          src={COVER_URL}
          alt="Foto sampul pernikahan Dinda dan Arya"
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
            Dinda &amp; Arya
          </h1>
          <p
            style={{
              fontSize: "var(--text-caption-size)",
              lineHeight: "var(--text-caption-lh)",
              color: "rgba(255,255,255,0.8)",
              margin: "4px 0 0",
            }}
          >
            12 Oktober 2026 · Bandung
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
          >
            Bagikan Foto &amp; Video
          </Button>
          <Button
            variant="secondary"
            size="large"
            fullWidth
            icon={<PenIcon />}
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
            <a
              href="#"
              style={{
                fontSize: "var(--text-caption-size)",
                color: "var(--color-primary-600)",
                fontWeight: 500,
                textDecoration: "none",
                padding: "4px 0",
              }}
              onMouseEnter={e =>
                ((e.currentTarget as HTMLAnchorElement).style.textDecoration =
                  "underline")
              }
              onMouseLeave={e =>
                ((e.currentTarget as HTMLAnchorElement).style.textDecoration =
                  "none")
              }
            >
              Lihat semua
            </a>
          </div>

          {/* 3 thumbnails, equal-width, 8px gap */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
            }}
          >
            {THUMBNAILS.map((t, i) => (
              <button
                key={i}
                aria-label={t.alt}
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
                }}
                onMouseEnter={e =>
                  ((e.currentTarget as HTMLButtonElement).style.opacity = "0.88")
                }
                onMouseLeave={e =>
                  ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
                }
              >
                <img
                  src={t.url}
                  alt={t.alt}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    transition: "opacity var(--duration-fast) var(--ease-standard)",
                  }}
                />
              </button>
            ))}
          </div>
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

          <GuestbookCard
            name="Siti Rahayu"
            message="Selamat menempuh hidup baru, Dinda & Arya! Semoga selalu dalam lindungan Allah dan rumah tangganya penuh keberkahan."
            time="2 jam lalu"
          />
        </section>
      </div>

      {/* ── 5. Fixed bottom navigation ── */}
      <div
        style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100 }}
      >
        <BottomNav active={activeNav} onChange={setActiveNav} />
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

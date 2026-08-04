import { Button } from "./Button"

type EmptyIcon = "gallery" | "guestbook" | "offline"

interface EmptyStateProps {
  icon: EmptyIcon
  title: string
  subtitle: string
  cta?: string
  onCta?: () => void
}

function GalleryIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <rect x="8" y="16" width="64" height="48" rx="6" stroke="var(--color-ink-300)" strokeWidth="1.5"/>
      <rect x="16" y="24" width="22" height="16" rx="3" stroke="var(--color-ink-300)" strokeWidth="1.5"/>
      <rect x="42" y="24" width="22" height="16" rx="3" stroke="var(--color-ink-300)" strokeWidth="1.5"/>
      <rect x="16" y="44" width="48" height="12" rx="3" stroke="var(--color-ink-300)" strokeWidth="1.5"/>
      <circle cx="22" cy="30" r="3" stroke="var(--color-ink-300)" strokeWidth="1.5"/>
      <path d="M19 38 l5-5 4 4 4-4 6 5" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function GuestbookIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <rect x="12" y="12" width="56" height="56" rx="6" stroke="var(--color-ink-300)" strokeWidth="1.5"/>
      <line x1="22" y1="28" x2="58" y2="28" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="22" y1="36" x2="58" y2="36" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="22" y1="44" x2="46" y2="44" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M52 50 l4-4 6 6" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function OfflineIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <path d="M14 30 Q40 10 66 30" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M22 40 Q40 25 58 40" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M30 50 Q40 42 50 50" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="40" cy="60" r="4" stroke="var(--color-ink-300)" strokeWidth="1.5"/>
      <line x1="12" y1="12" x2="68" y2="68" stroke="var(--color-ink-300)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

const illustrations: Record<EmptyIcon, React.ReactNode> = {
  gallery: <GalleryIllustration />,
  guestbook: <GuestbookIllustration />,
  offline: <OfflineIllustration />,
}

export function EmptyState({ icon, title, subtitle, cta, onCta }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        textAlign: "center",
        gap: 16,
        backgroundColor: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-ink-100)",
      }}
    >
      <div style={{ opacity: 0.7 }}>{illustrations[icon]}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h3 style={{ fontSize: "var(--text-h3-size)", fontWeight: "var(--text-h3-w)", lineHeight: "var(--text-h3-lh)", color: "var(--color-ink-900)", margin: 0 }}>
          {title}
        </h3>
        <p style={{ fontSize: "var(--text-body-size)", lineHeight: "var(--text-body-lh)", color: "var(--color-ink-500)", margin: 0, maxWidth: "36ch" }}>
          {subtitle}
        </p>
      </div>
      {cta && (
        <Button variant="primary" size="medium" onClick={onCta}>
          {cta}
        </Button>
      )}
    </div>
  )
}

type NavItem = "upload" | "gallery" | "guestbook"

interface BottomNavProps {
  active: NavItem
  onChange: (item: NavItem) => void
}

const items: { id: NavItem; label: string; icon: React.ReactNode }[] = [
  {
    id: "upload",
    label: "Unggah",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
  },
  {
    id: "gallery",
    label: "Galeri",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
  },
  {
    id: "guestbook",
    label: "Ucapan",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
]

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav
      style={{
        height: "calc(64px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
        backgroundColor: "var(--color-surface)",
        borderTop: "1px solid var(--color-ink-300)",
        display: "flex",
        alignItems: "stretch",
      }}
      aria-label="Navigasi utama"
    >
      {items.map(item => {
        const isActive = item.id === active
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              border: "none",
              background: "none",
              cursor: "pointer",
              color: isActive ? "var(--color-primary-600)" : "var(--color-ink-500)",
              transition: "color var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard)",
              borderRadius: 0,
              minHeight: 48,
              fontFamily: "var(--font-body)",
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = "var(--color-ink-100)" }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent" }}
          >
            {item.icon}
            <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, lineHeight: 1, letterSpacing: "0.01em" }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

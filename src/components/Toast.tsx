type ToastType = "success" | "warning" | "danger" | "info"

interface ToastProps {
  type: ToastType
  message: string
  action?: { label: string; onClick: () => void }
  visible?: boolean
}

const config: Record<ToastType, { bg: string; border: string; color: string; icon: React.ReactNode }> = {
  success: {
    bg: "rgba(63,125,87,.08)",
    border: "rgba(63,125,87,.25)",
    color: "var(--color-success)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  },
  warning: {
    bg: "rgba(176,118,28,.08)",
    border: "rgba(176,118,28,.25)",
    color: "var(--color-warning)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="1.5" strokeLinecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  danger: {
    bg: "rgba(168,56,47,.08)",
    border: "rgba(168,56,47,.25)",
    color: "var(--color-danger)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
  },
  info: {
    bg: "rgba(63,108,140,.08)",
    border: "rgba(63,108,140,.25)",
    color: "var(--color-info)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-info)" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
}

export function Toast({ type, message, action, visible = true }: ToastProps) {
  const c = config[type]

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--color-surface)",
        border: `1px solid ${c.border}`,
        boxShadow: "var(--shadow-md)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity var(--duration-base) var(--ease-standard), transform var(--duration-base) var(--ease-standard)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <span style={{ flexShrink: 0 }}>{c.icon}</span>
      <span style={{ flex: 1, fontSize: "var(--text-body-size)", color: "var(--color-ink-900)", lineHeight: "var(--text-body-lh)" }}>
        {message}
      </span>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            fontSize: "var(--text-caption-size)",
            fontWeight: 600,
            color: c.color,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "var(--radius-sm)",
            whiteSpace: "nowrap",
            fontFamily: "var(--font-body)",
            transition: "background-color var(--duration-fast) var(--ease-standard)",
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = c.bg)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

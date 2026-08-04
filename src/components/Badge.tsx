import { type ReactNode } from "react"

type BadgeVariant = "default" | "primary" | "accent" | "success" | "warning" | "danger" | "neutral"

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
}

const styles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    backgroundColor: "var(--color-ink-100)",
    color: "var(--color-ink-700)",
  },
  primary: {
    backgroundColor: "var(--color-primary-100)",
    color: "var(--color-primary-700)",
  },
  accent: {
    backgroundColor: "rgba(201,162,39,.12)",
    color: "#8A6A10",
  },
  success: {
    backgroundColor: "rgba(63,125,87,.1)",
    color: "var(--color-success)",
  },
  warning: {
    backgroundColor: "rgba(176,118,28,.1)",
    color: "var(--color-warning)",
  },
  danger: {
    backgroundColor: "rgba(168,56,47,.1)",
    color: "var(--color-danger)",
  },
  neutral: {
    backgroundColor: "var(--color-ink-100)",
    color: "var(--color-ink-500)",
  },
}

export function Badge({ variant = "default", children }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 24,
        paddingLeft: 10,
        paddingRight: 10,
        borderRadius: "var(--radius-full)",
        fontSize: "var(--text-micro-size)",
        fontWeight: "var(--text-micro-w)",
        lineHeight: "var(--text-micro-lh)",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        ...styles[variant],
      }}
    >
      {children}
    </span>
  )
}

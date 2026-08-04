import { type ReactNode, type CSSProperties } from "react"

interface CardProps {
  children: ReactNode
  style?: CSSProperties
  className?: string
}

export function Card({ children, style }: CardProps) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        padding: 20,
        boxShadow: "var(--shadow-sm)",
        border: "1px solid var(--color-ink-100)",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

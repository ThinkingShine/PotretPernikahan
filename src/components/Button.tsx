import { type ReactNode, type ButtonHTMLAttributes } from "react"

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size = "large" | "medium" | "small"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
  icon?: ReactNode
  children?: ReactNode
}

const HEIGHT: Record<Size, string> = {
  large: "56px",
  medium: "48px",
  small: "40px",
}
const PADDING_X: Record<Size, string> = {
  large: "24px",
  medium: "20px",
  small: "16px",
}
const FONT_SIZE: Record<Size, string> = {
  large: "var(--text-body-lg-size)",
  medium: "var(--text-body-size)",
  small: "var(--text-caption-size)",
}

export function Button({
  variant = "primary",
  size = "medium",
  fullWidth = false,
  loading = false,
  icon,
  children,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: HEIGHT[size],
    minWidth: "48px",
    minHeight: "48px",
    paddingLeft: PADDING_X[size],
    paddingRight: PADDING_X[size],
    fontSize: FONT_SIZE[size],
    fontWeight: 600,
    fontFamily: "var(--font-body)",
    borderRadius: "var(--radius-md)",
    border: "none",
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.4 : 1,
    width: fullWidth ? "100%" : undefined,
    transition: `background-color var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)`,
    outline: "none",
    position: "relative",
    letterSpacing: "-0.01em",
    lineHeight: 1,
    ...style,
  }

  const variantStyles: Record<Variant, React.CSSProperties> = {
    primary: {
      backgroundColor: "var(--color-primary-600)",
      color: "#fff",
    },
    secondary: {
      backgroundColor: "transparent",
      color: "var(--color-ink-900)",
      border: "1.5px solid var(--color-ink-300)",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--color-ink-700)",
    },
    danger: {
      backgroundColor: "transparent",
      color: "var(--color-danger)",
    },
  }

  function handleMouseEnter(e: React.MouseEvent<HTMLButtonElement>) {
    if (isDisabled) return
    const el = e.currentTarget
    if (variant === "primary") el.style.backgroundColor = "var(--color-primary-700)"
    if (variant === "secondary") el.style.borderColor = "var(--color-ink-500)"
    if (variant === "ghost") el.style.backgroundColor = "var(--color-ink-100)"
    if (variant === "danger") el.style.backgroundColor = "rgba(168,56,47,.06)"
  }

  function handleMouseLeave(e: React.MouseEvent<HTMLButtonElement>) {
    const el = e.currentTarget
    if (variant === "primary") el.style.backgroundColor = "var(--color-primary-600)"
    if (variant === "secondary") el.style.borderColor = "var(--color-ink-300)"
    if (variant === "ghost") el.style.backgroundColor = "transparent"
    if (variant === "danger") el.style.backgroundColor = "transparent"
    el.style.transform = "scale(1)"
  }

  function handleMouseDown(e: React.MouseEvent<HTMLButtonElement>) {
    if (!isDisabled) e.currentTarget.style.transform = "scale(0.98)"
  }

  function handleMouseUp(e: React.MouseEvent<HTMLButtonElement>) {
    e.currentTarget.style.transform = "scale(1)"
  }

  return (
    <button
      {...rest}
      disabled={isDisabled}
      style={{ ...base, ...variantStyles[variant] }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onFocus={e => { e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-canvas), 0 0 0 4px var(--color-primary-600)" }}
      onBlur={e => { e.currentTarget.style.boxShadow = "none" }}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

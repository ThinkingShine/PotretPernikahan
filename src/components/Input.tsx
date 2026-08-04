import { type InputHTMLAttributes, type TextareaHTMLAttributes } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  helper?: string
  error?: string
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  helper?: string
  error?: string
  rows?: number
}

const fieldBase: React.CSSProperties = {
  width: "100%",
  height: 48,
  paddingLeft: 14,
  paddingRight: 14,
  fontSize: "var(--text-body-size)",
  lineHeight: "var(--text-body-lh)",
  fontFamily: "var(--font-body)",
  color: "var(--color-ink-900)",
  backgroundColor: "var(--color-surface)",
  border: "1.5px solid var(--color-ink-300)",
  borderRadius: "var(--radius-md)",
  outline: "none",
  transition: "border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)",
  boxSizing: "border-box",
}

export function Input({ label, helper, error, disabled, style, ...rest }: InputProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      <label style={{ fontSize: "var(--text-caption-size)", fontWeight: 500, color: "var(--color-ink-700)", lineHeight: "var(--text-caption-lh)" }}>
        {label}
      </label>
      <input
        {...rest}
        disabled={disabled}
        style={{
          ...fieldBase,
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : undefined,
          borderColor: error ? "var(--color-danger)" : "var(--color-ink-300)",
          ...style,
        }}
        onFocus={e => {
          if (!error) e.currentTarget.style.borderColor = "var(--color-primary-600)"
          e.currentTarget.style.boxShadow = error
            ? "0 0 0 3px rgba(168,56,47,.12)"
            : "0 0 0 3px rgba(154,106,79,.12)"
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = error ? "var(--color-danger)" : "var(--color-ink-300)"
          e.currentTarget.style.boxShadow = "none"
        }}
      />
      {error && (
        <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-danger)", lineHeight: "var(--text-caption-lh)" }} role="alert">
          {error}
        </span>
      )}
      {helper && !error && (
        <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", lineHeight: "var(--text-caption-lh)" }}>
          {helper}
        </span>
      )}
    </div>
  )
}

export function Textarea({ label, helper, error, rows = 4, disabled, style, ...rest }: TextareaProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      <label style={{ fontSize: "var(--text-caption-size)", fontWeight: 500, color: "var(--color-ink-700)", lineHeight: "var(--text-caption-lh)" }}>
        {label}
      </label>
      <textarea
        {...rest}
        rows={rows}
        disabled={disabled}
        style={{
          ...fieldBase,
          height: "auto",
          paddingTop: 12,
          paddingBottom: 12,
          resize: "vertical",
          lineHeight: "var(--text-body-lg-lh)",
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : undefined,
          borderColor: error ? "var(--color-danger)" : "var(--color-ink-300)",
          ...style,
        }}
        onFocus={e => {
          if (!error) e.currentTarget.style.borderColor = "var(--color-primary-600)"
          e.currentTarget.style.boxShadow = error
            ? "0 0 0 3px rgba(168,56,47,.12)"
            : "0 0 0 3px rgba(154,106,79,.12)"
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = error ? "var(--color-danger)" : "var(--color-ink-300)"
          e.currentTarget.style.boxShadow = "none"
        }}
      />
      {error && (
        <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-danger)", lineHeight: "var(--text-caption-lh)" }} role="alert">
          {error}
        </span>
      )}
      {helper && !error && (
        <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-ink-500)", lineHeight: "var(--text-caption-lh)" }}>
          {helper}
        </span>
      )}
    </div>
  )
}

interface SkeletonProps {
  height?: number | string
  width?: number | string
  radius?: string
}

export function Skeleton({ height = 16, width = "100%", radius = "var(--radius-sm)" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        height,
        width,
        borderRadius: radius,
        background: "linear-gradient(90deg, var(--color-ink-100) 25%, var(--color-ink-300) 50%, var(--color-ink-100) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s ease-in-out infinite",
      }}
    />
  )
}

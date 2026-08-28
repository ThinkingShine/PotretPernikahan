/**
 * Custom React Hook for dynamically decoding legacy HEIC images in the browser.
 */

import { useState, useEffect } from "react"

export function isHeicMedia(item?: {
  url?: string
  blobPathname?: string
  downloadName?: string
  isVideo?: boolean
}): boolean {
  if (!item || item.isVideo) return false
  const path = (
    item.blobPathname ||
    item.downloadName ||
    item.url ||
    ""
  ).toLowerCase()
  return (
    path.endsWith(".heic") ||
    path.endsWith(".heif") ||
    path.includes(".heic") ||
    path.includes(".heif")
  )
}

export function useHeicImage(item?: {
  url?: string
  blobPathname?: string
  downloadName?: string
  isVideo?: boolean
}): string {
  const isHeic = isHeicMedia(item)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!isHeic || !item?.url) return
    let active = true
    let objectUrl: string | null = null

    async function decode() {
      try {
        const res = await fetch(item!.url!)
        const blob = await res.blob()
        const heic2anyModule = await import("heic2any")
        const heic2any = (heic2anyModule as any).default || heic2anyModule
        const converted = await heic2any({
          blob,
          toType: "image/jpeg",
          quality: 0.88,
        })
        const finalBlob = Array.isArray(converted) ? converted[0] : converted
        objectUrl = URL.createObjectURL(finalBlob)
        if (active) {
          setBlobUrl(objectUrl)
        }
      } catch (err) {
        console.warn("Failed to decode HEIC:", err)
      }
    }

    decode()
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [isHeic, item?.url])

  return isHeic ? blobUrl || item?.url || "" : item?.url || ""
}

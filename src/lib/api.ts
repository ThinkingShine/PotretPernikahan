import { projectId, publicAnonKey } from "../../utils/supabase/info"

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-746e6e59`

export interface MediaItem {
  id: string
  url: string
  uploader: string | null
  isVideo: boolean
  createdAt: number
}

export interface GuestbookEntry {
  id: string
  author: string
  message: string
  createdAt: number
}

/** Reads the server's error message when present, else a generic fallback. */
async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json()
    if (body && typeof body.error === "string") return body.error
  } catch {
    // Non-JSON error body — fall through.
  }
  return fallback
}

/**
 * fetch() rejects with a bare "Failed to fetch" when the network is
 * unreachable. Guests should see something they can act on instead.
 */
async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        ...(init?.headers ?? {}),
      },
    })
  } catch {
    throw new Error("Koneksi terputus. Periksa jaringan Anda lalu coba lagi.")
  }
}

export async function fetchMedia(): Promise<MediaItem[]> {
  const res = await request("/media")
  if (!res.ok) throw new Error(await errorMessage(res, "Gagal memuat galeri."))
  const body = await res.json()
  return body.items ?? []
}

export async function fetchGuestbook(): Promise<GuestbookEntry[]> {
  const res = await request("/guestbook")
  if (!res.ok) throw new Error(await errorMessage(res, "Gagal memuat ucapan."))
  const body = await res.json()
  return body.entries ?? []
}

export async function createGuestbookEntry(
  author: string,
  message: string,
): Promise<GuestbookEntry> {
  const res = await request("/guestbook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ author, message }),
  })
  if (!res.ok) throw new Error(await errorMessage(res, "Gagal mengirim ucapan."))
  const body = await res.json()
  return body.entry
}

/**
 * Uploads one file. Uses XMLHttpRequest rather than fetch because only XHR
 * reports upload progress, which the review screen shows per file.
 */
export function uploadMedia(
  file: File,
  uploader: string,
  onProgress?: (percent: number) => void,
): Promise<MediaItem> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append("file", file)
    if (uploader.trim()) form.append("uploader", uploader.trim())

    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${BASE}/media`)
    xhr.setRequestHeader("Authorization", `Bearer ${publicAnonKey}`)

    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      let body: any = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        // Leave body null and fall through to the status check.
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.item) {
        resolve(body.item)
      } else {
        reject(new Error(body?.error ?? "Gagal mengunggah berkas."))
      }
    }

    xhr.onerror = () => reject(new Error("Koneksi terputus saat mengunggah."))
    xhr.send(form)
  })
}

/** Formats a timestamp as a short relative label in Indonesian. */
export function relativeTime(createdAt: number): string {
  const seconds = Math.floor((Date.now() - createdAt) / 1000)
  if (seconds < 60) return "Baru saja"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return `${days} hari lalu`
}

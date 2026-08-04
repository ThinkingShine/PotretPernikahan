import { projectId, publicAnonKey } from "../../utils/supabase/info"

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-746e6e59`

export interface MediaItem {
  id: string
  url: string
  uploader: string | null
  isVideo: boolean
  approved?: boolean
  createdAt: number
}

export interface GuestbookEntry {
  id: string
  author: string
  message: string
  approved?: boolean
  createdAt: number
}

/* ── Admin passcode, held for the tab session only ── */

const PASSCODE_KEY = "pp-admin-passcode"

export function getAdminPasscode(): string | null {
  try {
    return sessionStorage.getItem(PASSCODE_KEY)
  } catch {
    return null
  }
}

export function setAdminPasscode(passcode: string | null) {
  try {
    if (passcode === null) sessionStorage.removeItem(PASSCODE_KEY)
    else sessionStorage.setItem(PASSCODE_KEY, passcode)
  } catch {
    // Private-mode browsers may block storage; the session just won't persist.
  }
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

/* ── Slideshow ─────────────────────────────────────── */

export async function fetchSlideshow(): Promise<{
  items: MediaItem[]
  wishes: GuestbookEntry[]
}> {
  const res = await request("/slideshow")
  if (!res.ok) throw new Error(await errorMessage(res, "Gagal memuat slideshow."))
  const body = await res.json()
  return { items: body.items ?? [], wishes: body.wishes ?? [] }
}

/* ── Admin ─────────────────────────────────────────── */

/** Adds the stored passcode header to an admin request. */
async function adminRequest(path: string, init?: RequestInit): Promise<Response> {
  const passcode = getAdminPasscode() ?? ""
  return request(path, {
    ...init,
    headers: { "X-Admin-Passcode": passcode, ...(init?.headers ?? {}) },
  })
}

export async function adminLogin(passcode: string): Promise<void> {
  const res = await request("/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode }),
  })
  if (!res.ok) throw new Error(await errorMessage(res, "Kode admin tidak sesuai."))
  setAdminPasscode(passcode)
}

export async function adminFetchMedia(): Promise<MediaItem[]> {
  const res = await adminRequest("/admin/media")
  if (!res.ok) throw new Error(await errorMessage(res, "Gagal memuat media."))
  const body = await res.json()
  return body.items ?? []
}

export async function adminFetchGuestbook(): Promise<GuestbookEntry[]> {
  const res = await adminRequest("/admin/guestbook")
  if (!res.ok) throw new Error(await errorMessage(res, "Gagal memuat ucapan."))
  const body = await res.json()
  return body.entries ?? []
}

export async function adminSetMediaApproval(
  id: string,
  approved: boolean,
): Promise<MediaItem> {
  const res = await adminRequest(`/admin/media/${id}/approval`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved }),
  })
  if (!res.ok) throw new Error(await errorMessage(res, "Gagal memperbarui status."))
  const body = await res.json()
  return body.item
}

export async function adminSetGuestbookApproval(
  id: string,
  approved: boolean,
): Promise<GuestbookEntry> {
  const res = await adminRequest(`/admin/guestbook/${id}/approval`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved }),
  })
  if (!res.ok) throw new Error(await errorMessage(res, "Gagal memperbarui status."))
  const body = await res.json()
  return body.entry
}

export async function adminDeleteMedia(id: string): Promise<void> {
  const res = await adminRequest(`/admin/media/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error(await errorMessage(res, "Gagal menghapus media."))
}

export async function adminDeleteGuestbookEntry(id: string): Promise<void> {
  const res = await adminRequest(`/admin/guestbook/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error(await errorMessage(res, "Gagal menghapus ucapan."))
}

/* ── Downloads ─────────────────────────────────────── */

/**
 * Supabase serves public objects with Content-Disposition: attachment when
 * `download` is present. The HTML download attribute cannot do this on its
 * own because storage sits on a different origin.
 */
export function mediaDownloadUrl(item: MediaItem): string {
  const base = item.url.split("?")[0]
  const ext = base.includes(".") ? base.split(".").pop() : item.isVideo ? "mp4" : "jpg"
  const who = item.uploader
    ? item.uploader.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()
    : "tamu"
  const filename = `potret-${who}-${item.id.slice(0, 8)}.${ext}`
  const sep = item.url.includes("?") ? "&" : "?"
  return `${item.url}${sep}download=${encodeURIComponent(filename)}`
}

/** Quotes a CSV cell so commas, quotes and newlines survive a spreadsheet. */
function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  // The BOM makes Excel read UTF-8 correctly for Indonesian text.
  return "﻿" + rows.map(r => r.map(csvCell).join(",")).join("\r\n")
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function formatDateTime(createdAt: number): string {
  return new Date(createdAt).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/* ── Event settings ────────────────────────────────── */

export interface EventSettings {
  coupleNames: string
  eventDate: string
  eventLocation: string
  coverUrl: string
  coverPath: string | null
}

/** Used until the real settings arrive so headings are never blank. */
export const FALLBACK_EVENT: EventSettings = {
  coupleNames: "Dinda & Arya",
  eventDate: "12 Oktober 2026",
  eventLocation: "Bandung",
  coverUrl:
    "https://images.unsplash.com/photo-1650377509454-1bbd8392e122?w=800&h=450&fit=crop&auto=format",
  coverPath: null,
}

export async function fetchEventSettings(): Promise<EventSettings> {
  const res = await request("/event")
  if (!res.ok) throw new Error(await errorMessage(res, "Gagal memuat pengaturan acara."))
  const body = await res.json()
  return { ...FALLBACK_EVENT, ...(body.event ?? {}) }
}

export async function adminUpdateEvent(input: {
  coupleNames: string
  eventDate: string
  eventLocation: string
}): Promise<EventSettings> {
  const res = await adminRequest("/admin/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await errorMessage(res, "Gagal menyimpan pengaturan."))
  const body = await res.json()
  return { ...FALLBACK_EVENT, ...(body.event ?? {}) }
}

export async function adminUploadCover(file: File): Promise<EventSettings> {
  const form = new FormData()
  form.append("file", file)
  const res = await adminRequest("/admin/event/cover", { method: "POST", body: form })
  if (!res.ok) throw new Error(await errorMessage(res, "Gagal mengunggah foto sampul."))
  const body = await res.json()
  return { ...FALLBACK_EVENT, ...(body.event ?? {}) }
}

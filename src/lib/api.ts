import { put } from "@vercel/blob/client"

/**
 * The API runs as a Vercel Function on the same origin as this app, so a
 * relative base needs no configuration. VITE_API_BASE_URL overrides it for the
 * cases where the two are split, e.g. a Figma Make preview build pointing at
 * the deployed Vercel API.
 */
const BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/+$/, "")

export interface MediaItem {
  id: string
  url: string
  /** Location inside the Vercel Blob store. */
  blobPathname?: string
  /** Serves the same bytes as `url` but as an attachment. */
  downloadUrl?: string
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
    return await fetch(`${BASE}${path}`, init)
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
  if (!res.ok)
    throw new Error(await errorMessage(res, "Gagal mengirim ucapan."))
  const body = await res.json()
  return body.entry
}

/**
 * Anything above this goes up in parallel chunks, which survive a dropped
 * connection by retrying only the failed part. Venue wifi makes that worth the
 * extra requests for videos, but not for a single small photo.
 */
const MULTIPART_THRESHOLD_BYTES = 8 * 1024 * 1024

/**
 * Uploads one file straight to Vercel Blob.
 *
 * The bytes never touch the API function: it only mints a client token scoped
 * to one pathname, media type and size, the browser uploads with it, and the
 * server then confirms the blob exists before the item becomes visible.
 */
export async function uploadMedia(
  file: File,
  uploader: string,
  onProgress?: (percent: number) => void,
): Promise<MediaItem> {
  const startRes = await request("/media/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      uploader: uploader.trim(),
    }),
  })
  if (!startRes.ok) {
    throw new Error(await errorMessage(startRes, "Gagal menyiapkan unggahan."))
  }
  const { id, pathname, clientToken, contentType } = await startRes.json()

  try {
    await put(pathname, file, {
      access: "public",
      token: clientToken,
      contentType,
      multipart: file.size > MULTIPART_THRESHOLD_BYTES,
      onUploadProgress: ({ percentage }) =>
        onProgress?.(Math.round(percentage)),
    })
  } catch {
    throw new Error(
      "Gagal mengunggah ke penyimpanan. Periksa jaringan Anda lalu coba lagi.",
    )
  }

  const doneRes = await request(`/media/${id}/complete`, { method: "POST" })
  if (!doneRes.ok) {
    throw new Error(
      await errorMessage(doneRes, "Gagal menyelesaikan unggahan."),
    )
  }
  return (await doneRes.json()).item
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

export interface SlideshowSettings {
  durationMs: number
  shuffle: boolean
}

export async function fetchSlideshow(): Promise<{
  items: MediaItem[]
  wishes: GuestbookEntry[]
  settings: SlideshowSettings
}> {
  const res = await request("/slideshow")
  if (!res.ok)
    throw new Error(await errorMessage(res, "Gagal memuat slideshow."))
  const body = await res.json()
  return {
    items: body.items ?? [],
    wishes: body.wishes ?? [],
    settings: {
      durationMs: body.settings?.durationMs ?? 7000,
      shuffle: body.settings?.shuffle ?? false,
    },
  }
}

/* ── Admin ─────────────────────────────────────────── */

/** Adds the stored passcode header to an admin request. */
async function adminRequest(
  path: string,
  init?: RequestInit,
): Promise<Response> {
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
  if (!res.ok)
    throw new Error(await errorMessage(res, "Kode admin tidak sesuai."))
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
  if (!res.ok)
    throw new Error(await errorMessage(res, "Gagal memperbarui status."))
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
  if (!res.ok)
    throw new Error(await errorMessage(res, "Gagal memperbarui status."))
  const body = await res.json()
  return body.entry
}

export async function adminDeleteMedia(id: string): Promise<void> {
  const res = await adminRequest(`/admin/media/${id}`, { method: "DELETE" })
  if (!res.ok)
    throw new Error(await errorMessage(res, "Gagal menghapus media."))
}

export async function adminDeleteGuestbookEntry(id: string): Promise<void> {
  const res = await adminRequest(`/admin/guestbook/${id}`, { method: "DELETE" })
  if (!res.ok)
    throw new Error(await errorMessage(res, "Gagal menghapus ucapan."))
}

/* ── Downloads ─────────────────────────────────────── */

/**
 * Redirects to the blob's download URL, which carries
 * Content-Disposition: attachment. Routed through the API rather than linking
 * the blob directly so items uploaded before the Vercel Blob migration still
 * resolve, and so a moved blob only has to be fixed in one place.
 */
export function mediaDownloadUrl(item: MediaItem): string {
  return `${BASE}/media/${item.id}/download`
}

/** Quotes a CSV cell so commas, quotes and newlines survive a spreadsheet. */
function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  // The BOM makes Excel read UTF-8 correctly for Indonesian text.
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n")
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/csv",
) {
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
  /** Location of the cover inside the Vercel Blob store. */
  coverBlobPathname: string | null
  galleryRequiresApproval: boolean
  slideshowDurationMs: number
  slideshowShuffle: boolean
  slideshowShowWishes: boolean
}

/** Used until the real settings arrive so headings are never blank. */
export const FALLBACK_EVENT: EventSettings = {
  coupleNames: "Dinda & Arya",
  eventDate: "12 Oktober 2026",
  eventLocation: "Bandung",
  coverUrl:
    "https://images.unsplash.com/photo-1650377509454-1bbd8392e122?w=800&h=450&fit=crop&auto=format",
  coverBlobPathname: null,
  galleryRequiresApproval: false,
  slideshowDurationMs: 7000,
  slideshowShuffle: false,
  slideshowShowWishes: true,
}

export async function fetchEventSettings(): Promise<EventSettings> {
  const res = await request("/event")
  if (!res.ok)
    throw new Error(await errorMessage(res, "Gagal memuat pengaturan acara."))
  const body = await res.json()
  return { ...FALLBACK_EVENT, ...(body.event ?? {}) }
}

export async function adminUpdateEvent(
  input: Partial<Omit<EventSettings, "coverUrl" | "coverBlobPathname">> & {
    coupleNames: string
  },
): Promise<EventSettings> {
  const res = await adminRequest("/admin/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok)
    throw new Error(await errorMessage(res, "Gagal menyimpan pengaturan."))
  const body = await res.json()
  return { ...FALLBACK_EVENT, ...(body.event ?? {}) }
}

/**
 * Uploads the cover straight to Vercel Blob too. A Vercel Function caps request
 * bodies well below the 10 MB an admin may pick, so relaying the file through
 * the API is not an option.
 */
export async function adminUploadCover(file: File): Promise<EventSettings> {
  const startRes = await adminRequest("/admin/event/cover/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    }),
  })
  if (!startRes.ok) {
    throw new Error(
      await errorMessage(startRes, "Gagal mengunggah foto sampul."),
    )
  }
  const { pathname, clientToken, contentType } = await startRes.json()

  try {
    await put(pathname, file, {
      access: "public",
      token: clientToken,
      contentType,
    })
  } catch {
    throw new Error(
      "Gagal mengunggah foto sampul. Periksa jaringan Anda lalu coba lagi.",
    )
  }

  const doneRes = await adminRequest("/admin/event/cover/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pathname }),
  })
  if (!doneRes.ok) {
    throw new Error(
      await errorMessage(doneRes, "Gagal mengunggah foto sampul."),
    )
  }
  const body = await doneRes.json()
  return { ...FALLBACK_EVENT, ...(body.event ?? {}) }
}

/* ── Bulk admin actions ────────────────────────────── */

async function bulkAction(path: string, body: object): Promise<void> {
  const res = await adminRequest(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok)
    throw new Error(await errorMessage(res, "Gagal memproses pilihan."))
}

export function adminBulkMediaApproval(ids: string[], approved: boolean) {
  return bulkAction("/admin/media/bulk-approval", { ids, approved })
}

export function adminBulkDeleteMedia(ids: string[]) {
  return bulkAction("/admin/media/bulk-delete", { ids })
}

export function adminBulkGuestbookApproval(ids: string[], approved: boolean) {
  return bulkAction("/admin/guestbook/bulk-approval", { ids, approved })
}

export function adminBulkDeleteGuestbook(ids: string[]) {
  return bulkAction("/admin/guestbook/bulk-delete", { ids })
}

/** Changes the shared admin passcode and re-arms the current session. */
export async function adminChangePasscode(
  currentPasscode: string,
  nextPasscode: string,
): Promise<void> {
  const res = await adminRequest("/admin/passcode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPasscode, nextPasscode }),
  })
  if (!res.ok)
    throw new Error(await errorMessage(res, "Gagal mengubah kode admin."))
  setAdminPasscode(nextPasscode)
}

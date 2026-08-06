/**
 * The Potret Pernikahan API.
 *
 * Runs as a single Vercel Function (see api/index.ts) and, in development, as
 * Vite middleware (see vite.config.ts) so the preview keeps working without a
 * separate process. Media lives in Vercel Blob; the guestbook, gallery index
 * and settings live in Supabase Postgres via server/kv.ts.
 */

import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import * as kv from "./kv"
import { blobConfigured, createUploadToken, deleteBlob, statBlob } from "./blob"

const app = new Hono()

const BASE = "/api"

const MAX_PHOTO_BYTES = 25 * 1024 * 1024
const MAX_VIDEO_BYTES = 500 * 1024 * 1024
const MAX_NAME_LEN = 60
const MAX_MESSAGE_LEN = 500
const MAX_COVER_BYTES = 10 * 1024 * 1024

const DEFAULT_EVENT = {
  coupleNames: "Dinda & Arya",
  eventDate: "12 Oktober 2026",
  eventLocation: "Bandung",
  coverUrl:
    "https://images.unsplash.com/photo-1650377509454-1bbd8392e122?w=800&h=450&fit=crop&auto=format",
  coverBlobPathname: null as string | null,
  // false keeps the original behaviour: uploads appear in the gallery at once.
  galleryRequiresApproval: false,
  slideshowDurationMs: 7000,
  slideshowShuffle: false,
  slideshowShowWishes: true,
}

async function readEvent() {
  const stored = await kv.get("config:event")
  return { ...DEFAULT_EVENT, ...(stored ?? {}) }
}

// Enable logger
app.use("*", logger(console.log))

// The SPA is served from the same origin in production, but CORS stays open so
// a preview build hosted elsewhere (Figma Make) can still reach this API.
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Admin-Passcode"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
)

/**
 * Anything that escapes a route handler still answers in the shape the client
 * parses. Without this Hono replies with bare "Internal Server Error" text, so
 * a deployment missing SUPABASE_URL would show guests nothing they can act on.
 */
app.onError((err, c) => {
  console.log("Unhandled API error:", err)
  return c.json({ error: "Terjadi gangguan pada server. Coba lagi sebentar lagi." }, 500)
})

/* ── Admin auth ────────────────────────────────────── */

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/** Constant-time compare so a wrong passcode leaks no timing signal. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function isAdmin(passcode: string | undefined): Promise<boolean> {
  if (!passcode) return false
  const config = await kv.get("config:admin")
  if (!config?.passcodeHash) return false
  return safeEqual(await sha256Hex(passcode), config.passcodeHash)
}

/** Guards every /admin route. */
async function requireAdmin(c: any, next: any) {
  const passcode = c.req.header("X-Admin-Passcode")
  if (!(await isAdmin(passcode))) {
    return c.json({ error: "Kode admin tidak sesuai." }, 401)
  }
  await next()
}

app.use(`${BASE}/admin/*`, requireAdmin)

// Health check endpoint
app.get(`${BASE}/health`, (c) => {
  return c.json({
    status: "ok",
    blob: blobConfigured(),
    database: kv.kvConfigured(),
  })
})

// Passcode check. Not under /admin/* so it can return a clean 401 itself.
app.post(`${BASE}/admin-login`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null)
    const passcode = typeof body?.passcode === "string" ? body.passcode : ""
    if (!(await isAdmin(passcode))) {
      return c.json({ error: "Kode admin tidak sesuai." }, 401)
    }
    return c.json({ ok: true })
  } catch (err) {
    console.log("Admin login failed:", err)
    return c.json({ error: "Gagal memeriksa kode admin." }, 500)
  }
})

/* ── Media ─────────────────────────────────────────── */

app.get(`${BASE}/media`, async (c) => {
  try {
    const [all, event] = await Promise.all([
      kv.getByPrefix("media:"),
      readEvent(),
    ])
    const ready = all.filter((m) => m && !m.pending)
    const items = (
      event.galleryRequiresApproval ? ready.filter((m) => m.approved) : ready
    ).sort((a, b) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0))
    return c.json({ items })
  } catch (err) {
    console.log("Failed to list media:", err)
    return c.json({ error: "Gagal memuat galeri." }, 500)
  }
})

function guardBlob(c: any) {
  if (blobConfigured()) return null
  return c.json(
    {
      error:
        "Penyimpanan Vercel Blob belum dikonfigurasi. Hubungkan Blob store ke project agar BLOB_READ_WRITE_TOKEN tersedia.",
    },
    503,
  )
}

/** Turns a guest name into something safe to use inside a filename. */
function slugify(value: string): string {
  return (
    value
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "tamu"
  )
}

function extensionOf(filename: string, fallback: string): string {
  const ext = filename.includes(".") ? filename.split(".").pop() : ""
  // Blob pathnames end up in a URL and a Content-Disposition filename, so keep
  // the extension to plain characters.
  return ext && /^[a-zA-Z0-9]{1,8}$/.test(ext) ? ext.toLowerCase() : fallback
}

/** Step 1: reserve an id and hand the browser a token it can upload with. */
app.post(`${BASE}/media/upload-url`, async (c) => {
  const blocked = guardBlob(c)
  if (blocked) return blocked

  try {
    const body = await c.req.json().catch(() => null)
    const filename = typeof body?.filename === "string" ? body.filename : ""
    const contentType =
      typeof body?.contentType === "string" && body.contentType
        ? body.contentType
        : "application/octet-stream"
    const sizeBytes = Number(body?.sizeBytes ?? 0)

    if (!filename) return c.json({ error: "Nama berkas tidak ada." }, 400)

    const isVideo = contentType.startsWith("video/")
    const limit = isVideo ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES
    if (sizeBytes > limit) {
      const mb = Math.round(limit / (1024 * 1024))
      return c.json({ error: `Berkas terlalu besar. Maksimum ${mb} MB.` }, 413)
    }

    const rawUploader = body?.uploader
    const uploader =
      typeof rawUploader === "string" && rawUploader.trim()
        ? rawUploader.trim().slice(0, MAX_NAME_LEN)
        : null

    const id = crypto.randomUUID()
    const ext = extensionOf(filename, "bin")
    const downloadName = `potret-${slugify(uploader ?? "tamu")}-${id.slice(0, 8)}.${ext}`
    // The uuid segment keeps pathnames unique; the last segment becomes the
    // filename a browser saves when the blob's download URL is used.
    const blobPathname = `media/${id}/${downloadName}`

    const clientToken = await createUploadToken({
      pathname: blobPathname,
      contentType,
      maximumSizeInBytes: limit,
    })

    // Stored as pending so a reserved id that never finishes uploading can
    // never surface in the gallery.
    await kv.set(`media:${id}`, {
      id,
      blobPathname,
      downloadName,
      url: null,
      downloadUrl: null,
      uploader,
      isVideo,
      approved: false,
      pending: true,
      createdAt: Date.now(),
    })

    return c.json({ id, pathname: blobPathname, clientToken, contentType })
  } catch (err) {
    console.log("Failed to create upload token:", err)
    return c.json({ error: "Gagal menyiapkan unggahan." }, 500)
  }
})

/** Step 2: only publish the item once the blob really exists. */
app.post(`${BASE}/media/:id/complete`, async (c) => {
  const blocked = guardBlob(c)
  if (blocked) return blocked

  try {
    const id = c.req.param("id")
    const item = await kv.get(`media:${id}`)
    if (!item) return c.json({ error: "Unggahan tidak ditemukan." }, 404)

    const stat = await statBlob(item.blobPathname)
    if (!stat) {
      await kv.del(`media:${id}`)
      return c.json({ error: "Berkas tidak sampai ke penyimpanan." }, 400)
    }

    const updated = {
      ...item,
      pending: false,
      sizeBytes: stat.size,
      url: stat.url,
      downloadUrl: stat.downloadUrl,
    }
    await kv.set(`media:${id}`, updated)
    return c.json({ item: updated }, 201)
  } catch (err) {
    console.log("Failed to complete upload:", err)
    return c.json({ error: "Gagal menyelesaikan unggahan." }, 500)
  }
})

/**
 * Redirects to the blob's download URL, which serves the bytes with
 * Content-Disposition: attachment. Kept as a redirect so a plain anchor still
 * works: the HTML download attribute is ignored cross-origin, and older items
 * migrated from another provider may only have a plain URL.
 */
app.get(`${BASE}/media/:id/download`, async (c) => {
  try {
    const id = c.req.param("id")
    const item = await kv.get(`media:${id}`)
    const target = item?.downloadUrl ?? item?.url
    if (!target) return c.json({ error: "Media tidak ditemukan." }, 404)
    return c.redirect(target, 302)
  } catch (err) {
    console.log("Failed to resolve download:", err)
    return c.json({ error: "Gagal menyiapkan unduhan." }, 500)
  }
})

/* ── Guestbook ─────────────────────────────────────── */

app.get(`${BASE}/guestbook`, async (c) => {
  try {
    const entries = await kv.getByPrefix("guestbook:")
    entries.sort((a, b) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0))
    return c.json({ entries })
  } catch (err) {
    console.log("Failed to list guestbook:", err)
    return c.json({ error: "Gagal memuat ucapan." }, 500)
  }
})

app.post(`${BASE}/guestbook`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return c.json({ error: "Format permintaan tidak sesuai." }, 400)
    }

    const author = typeof body.author === "string" ? body.author.trim() : ""
    const message = typeof body.message === "string" ? body.message.trim() : ""

    if (!author) return c.json({ error: "Nama tidak boleh kosong." }, 400)
    if (!message) return c.json({ error: "Ucapan tidak boleh kosong." }, 400)

    const id = crypto.randomUUID()
    const entry = {
      id,
      author: author.slice(0, MAX_NAME_LEN),
      message: message.slice(0, MAX_MESSAGE_LEN),
      approved: false,
      createdAt: Date.now(),
    }
    await kv.set(`guestbook:${id}`, entry)

    return c.json({ entry }, 201)
  } catch (err) {
    console.log("Failed to create guestbook entry:", err)
    return c.json({ error: "Gagal mengirim ucapan." }, 500)
  }
})

/* ── Slideshow (public, approved only) ─────────────── */

app.get(`${BASE}/slideshow`, async (c) => {
  try {
    const [media, entries, event] = await Promise.all([
      kv.getByPrefix("media:"),
      kv.getByPrefix("guestbook:"),
      readEvent(),
    ])
    const items = media
      .filter((m) => m?.approved && !m.pending)
      .sort((a, b) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0))
    const wishes = event.slideshowShowWishes
      ? entries
          .filter((e) => e?.approved)
          .sort((a, b) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0))
      : []
    return c.json({
      items,
      wishes,
      settings: {
        durationMs: event.slideshowDurationMs,
        shuffle: event.slideshowShuffle,
      },
    })
  } catch (err) {
    console.log("Failed to load slideshow:", err)
    return c.json({ error: "Gagal memuat slideshow." }, 500)
  }
})

/* ── Admin ─────────────────────────────────────────── */

app.get(`${BASE}/admin/media`, async (c) => {
  try {
    const all = await kv.getByPrefix("media:")
    const items = all.filter((m) => m && !m.pending)
    items.sort((a, b) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0))
    return c.json({ items })
  } catch (err) {
    console.log("Failed to list media for admin:", err)
    return c.json({ error: "Gagal memuat media." }, 500)
  }
})

app.post(`${BASE}/admin/media/:id/approval`, async (c) => {
  try {
    const id = c.req.param("id")
    const body = await c.req.json().catch(() => null)
    const approved = body?.approved === true

    const item = await kv.get(`media:${id}`)
    if (!item) return c.json({ error: "Media tidak ditemukan." }, 404)

    const updated = { ...item, approved }
    await kv.set(`media:${id}`, updated)
    return c.json({ item: updated })
  } catch (err) {
    console.log("Failed to set media approval:", err)
    return c.json({ error: "Gagal memperbarui status." }, 500)
  }
})

app.delete(`${BASE}/admin/media/:id`, async (c) => {
  try {
    const id = c.req.param("id")
    const item = await kv.get(`media:${id}`)
    if (!item) return c.json({ error: "Media tidak ditemukan." }, 404)

    if (item.blobPathname) await deleteBlob(item.blobPathname)
    await kv.del(`media:${id}`)
    return c.json({ ok: true })
  } catch (err) {
    console.log("Failed to delete media:", err)
    return c.json({ error: "Gagal menghapus media." }, 500)
  }
})

app.get(`${BASE}/admin/guestbook`, async (c) => {
  try {
    const entries = await kv.getByPrefix("guestbook:")
    entries.sort((a, b) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0))
    return c.json({ entries })
  } catch (err) {
    console.log("Failed to list guestbook for admin:", err)
    return c.json({ error: "Gagal memuat ucapan." }, 500)
  }
})

app.post(`${BASE}/admin/guestbook/:id/approval`, async (c) => {
  try {
    const id = c.req.param("id")
    const body = await c.req.json().catch(() => null)
    const approved = body?.approved === true

    const entry = await kv.get(`guestbook:${id}`)
    if (!entry) return c.json({ error: "Ucapan tidak ditemukan." }, 404)

    const updated = { ...entry, approved }
    await kv.set(`guestbook:${id}`, updated)
    return c.json({ entry: updated })
  } catch (err) {
    console.log("Failed to set guestbook approval:", err)
    return c.json({ error: "Gagal memperbarui status." }, 500)
  }
})

app.delete(`${BASE}/admin/guestbook/:id`, async (c) => {
  try {
    const id = c.req.param("id")
    const entry = await kv.get(`guestbook:${id}`)
    if (!entry) return c.json({ error: "Ucapan tidak ditemukan." }, 404)
    await kv.del(`guestbook:${id}`)
    return c.json({ ok: true })
  } catch (err) {
    console.log("Failed to delete guestbook entry:", err)
    return c.json({ error: "Gagal menghapus ucapan." }, 500)
  }
})

/* ── Event settings ────────────────────────────────── */

app.get(`${BASE}/event`, async (c) => {
  try {
    return c.json({ event: await readEvent() })
  } catch (err) {
    console.log("Failed to load event settings:", err)
    return c.json({ error: "Gagal memuat pengaturan acara." }, 500)
  }
})

app.post(`${BASE}/admin/event`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return c.json({ error: "Format permintaan tidak sesuai." }, 400)
    }

    const coupleNames =
      typeof body.coupleNames === "string" ? body.coupleNames.trim() : ""
    if (!coupleNames) {
      return c.json({ error: "Nama pengantin tidak boleh kosong." }, 400)
    }

    const current = await readEvent()
    const updated = {
      ...current,
      coupleNames: coupleNames.slice(0, 80),
      eventDate:
        typeof body.eventDate === "string"
          ? body.eventDate.trim().slice(0, 40)
          : current.eventDate,
      eventLocation:
        typeof body.eventLocation === "string"
          ? body.eventLocation.trim().slice(0, 60)
          : current.eventLocation,
      galleryRequiresApproval:
        typeof body.galleryRequiresApproval === "boolean"
          ? body.galleryRequiresApproval
          : current.galleryRequiresApproval,
      slideshowShuffle:
        typeof body.slideshowShuffle === "boolean"
          ? body.slideshowShuffle
          : current.slideshowShuffle,
      slideshowShowWishes:
        typeof body.slideshowShowWishes === "boolean"
          ? body.slideshowShowWishes
          : current.slideshowShowWishes,
      slideshowDurationMs:
        typeof body.slideshowDurationMs === "number" &&
        Number.isFinite(body.slideshowDurationMs)
          ? Math.min(
              60000,
              Math.max(2000, Math.round(body.slideshowDurationMs)),
            )
          : current.slideshowDurationMs,
    }
    await kv.set("config:event", updated)
    return c.json({ event: updated })
  } catch (err) {
    console.log("Failed to update event settings:", err)
    return c.json({ error: "Gagal menyimpan pengaturan." }, 500)
  }
})

/**
 * The cover photo uses the same direct-to-Blob flow as guest media rather than
 * being relayed through this function: a Vercel Function request body is capped
 * well below the 10 MB an admin is allowed to pick.
 */
app.post(`${BASE}/admin/event/cover/upload-url`, async (c) => {
  const blocked = guardBlob(c)
  if (blocked) return blocked

  try {
    const body = await c.req.json().catch(() => null)
    const filename = typeof body?.filename === "string" ? body.filename : ""
    const contentType =
      typeof body?.contentType === "string" ? body.contentType : ""
    const sizeBytes = Number(body?.sizeBytes ?? 0)

    if (!filename) return c.json({ error: "Nama berkas tidak ada." }, 400)
    if (!contentType.startsWith("image/")) {
      return c.json({ error: "Foto sampul harus berupa gambar." }, 400)
    }
    if (sizeBytes > MAX_COVER_BYTES) {
      return c.json({ error: "Foto sampul maksimum 10 MB." }, 413)
    }

    const ext = extensionOf(filename, "jpg")
    const blobPathname = `cover/${crypto.randomUUID()}/sampul.${ext}`

    const clientToken = await createUploadToken({
      pathname: blobPathname,
      contentType,
      maximumSizeInBytes: MAX_COVER_BYTES,
    })

    return c.json({ pathname: blobPathname, clientToken, contentType })
  } catch (err) {
    console.log("Failed to create cover upload token:", err)
    return c.json({ error: "Gagal menyiapkan unggahan foto sampul." }, 500)
  }
})

/** Matches only pathnames this server mints, so `pathname` can be trusted. */
const COVER_PATHNAME = /^cover\/[0-9a-f-]{36}\/sampul\.[a-z0-9]{1,8}$/i

app.post(`${BASE}/admin/event/cover/complete`, async (c) => {
  const blocked = guardBlob(c)
  if (blocked) return blocked

  try {
    const body = await c.req.json().catch(() => null)
    const pathname = typeof body?.pathname === "string" ? body.pathname : ""
    if (!COVER_PATHNAME.test(pathname)) {
      return c.json({ error: "Lokasi berkas tidak sesuai." }, 400)
    }

    const stat = await statBlob(pathname)
    if (!stat)
      return c.json({ error: "Berkas tidak sampai ke penyimpanan." }, 400)
    if (!stat.contentType.startsWith("image/")) {
      await deleteBlob(pathname)
      return c.json({ error: "Foto sampul harus berupa gambar." }, 400)
    }

    const current = await readEvent()
    if (current.coverBlobPathname) await deleteBlob(current.coverBlobPathname)

    const updated = {
      ...current,
      coverUrl: stat.url,
      coverBlobPathname: pathname,
    }
    await kv.set("config:event", updated)

    return c.json({ event: updated })
  } catch (err) {
    console.log("Failed to set cover:", err)
    return c.json({ error: "Gagal mengunggah foto sampul." }, 500)
  }
})

/* ── Bulk admin actions ────────────────────────────── */

function idsFrom(body: any): string[] {
  return Array.isArray(body?.ids)
    ? body.ids.filter((v: unknown) => typeof v === "string").slice(0, 500)
    : []
}

app.post(`${BASE}/admin/media/bulk-approval`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null)
    const ids = idsFrom(body)
    const approved = body?.approved === true
    if (ids.length === 0)
      return c.json({ error: "Tidak ada item dipilih." }, 400)

    let changed = 0
    for (const id of ids) {
      const item = await kv.get(`media:${id}`)
      if (!item) continue
      await kv.set(`media:${id}`, { ...item, approved })
      changed++
    }
    return c.json({ changed })
  } catch (err) {
    console.log("Bulk media approval failed:", err)
    return c.json({ error: "Gagal memperbarui status." }, 500)
  }
})

app.post(`${BASE}/admin/media/bulk-delete`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null)
    const ids = idsFrom(body)
    if (ids.length === 0)
      return c.json({ error: "Tidak ada item dipilih." }, 400)

    for (const id of ids) {
      const item = await kv.get(`media:${id}`)
      if (!item) continue
      if (item.blobPathname) await deleteBlob(item.blobPathname)
      await kv.del(`media:${id}`)
    }
    return c.json({ deleted: ids.length })
  } catch (err) {
    console.log("Bulk media delete failed:", err)
    return c.json({ error: "Gagal menghapus media." }, 500)
  }
})

app.post(`${BASE}/admin/guestbook/bulk-approval`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null)
    const ids = idsFrom(body)
    const approved = body?.approved === true
    if (ids.length === 0)
      return c.json({ error: "Tidak ada item dipilih." }, 400)

    let changed = 0
    for (const id of ids) {
      const entry = await kv.get(`guestbook:${id}`)
      if (!entry) continue
      await kv.set(`guestbook:${id}`, { ...entry, approved })
      changed++
    }
    return c.json({ changed })
  } catch (err) {
    console.log("Bulk guestbook approval failed:", err)
    return c.json({ error: "Gagal memperbarui status." }, 500)
  }
})

app.post(`${BASE}/admin/guestbook/bulk-delete`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null)
    const ids = idsFrom(body)
    if (ids.length === 0)
      return c.json({ error: "Tidak ada item dipilih." }, 400)
    for (const id of ids) await kv.del(`guestbook:${id}`)
    return c.json({ deleted: ids.length })
  } catch (err) {
    console.log("Bulk guestbook delete failed:", err)
    return c.json({ error: "Gagal menghapus ucapan." }, 500)
  }
})

/* ── Change passcode ───────────────────────────────── */

app.post(`${BASE}/admin/passcode`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null)
    const current =
      typeof body?.currentPasscode === "string" ? body.currentPasscode : ""
    const next =
      typeof body?.nextPasscode === "string" ? body.nextPasscode.trim() : ""

    // Re-check the old code even though the route is already guarded, so a
    // walk-up to an unlocked dashboard cannot silently change the lock.
    if (!(await isAdmin(current))) {
      return c.json({ error: "Kode admin saat ini tidak sesuai." }, 401)
    }
    if (next.length < 8) {
      return c.json({ error: "Kode baru minimal 8 karakter." }, 400)
    }

    await kv.set("config:admin", { passcodeHash: await sha256Hex(next) })
    return c.json({ ok: true })
  } catch (err) {
    console.log("Failed to change passcode:", err)
    return c.json({ error: "Gagal mengubah kode admin." }, 500)
  }
})

export default app

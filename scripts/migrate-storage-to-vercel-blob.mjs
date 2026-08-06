#!/usr/bin/env node
/**
 * Moves existing media out of the old object store and into Vercel Blob, then
 * rewrites the URLs held in the database.
 *
 * The old store (Google Cloud Storage, and Supabase Storage before it) served
 * every object over a public URL, and that URL is what the database already
 * holds, so no credentials for the old provider are needed: the script reads
 * each file over plain HTTPS and streams it into Vercel Blob.
 *
 * The run is idempotent. Blob pathnames are derived from the row's id, so a
 * re-run finds anything a previous run uploaded and only fills in whatever is
 * still missing. Interrupting it is safe; run it again.
 *
 * Usage:
 *   node --env-file-if-exists=.env scripts/migrate-storage-to-vercel-blob.mjs
 *   node --env-file-if-exists=.env scripts/migrate-storage-to-vercel-blob.mjs --dry-run
 *
 * Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and BLOB_READ_WRITE_TOKEN.
 */

import { createClient } from "@supabase/supabase-js"
import { head, put } from "@vercel/blob"

const TABLE = "kv_store_746e6e59"
const CACHE_MAX_AGE_SECONDS = 31_536_000
const MULTIPART_THRESHOLD_BYTES = 8 * 1024 * 1024

/** The default cover ships with the app and is not ours to copy. */
const UNSPLASH_HOST = "images.unsplash.com"

const dryRun = process.argv.includes("--dry-run")

/* ── Setup ─────────────────────────────────────────── */

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`✗ ${name} belum diatur. Lihat .env.example.`)
    process.exit(1)
  }
  return value
}

const supabase = createClient(
  requireEnv("SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
)
requireEnv("BLOB_READ_WRITE_TOKEN")

/* ── Helpers ───────────────────────────────────────── */

async function kvGetByPrefix(prefix) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("key, value")
    .like("key", `${prefix}%`)
  if (error) throw new Error(`Gagal membaca ${prefix}*: ${error.message}`)
  return data ?? []
}

async function kvSet(key, value) {
  if (dryRun) return
  const { error } = await supabase.from(TABLE).upsert({ key, value })
  if (error) throw new Error(`Gagal menyimpan ${key}: ${error.message}`)
}

function isBlobUrl(url) {
  try {
    return new URL(url).hostname.endsWith(".blob.vercel-storage.com")
  } catch {
    return false
  }
}

function isDefaultCover(url) {
  try {
    return new URL(url).hostname === UNSPLASH_HOST
  } catch {
    return false
  }
}

function extensionOf(value, fallback) {
  const last = value.split("/").pop() ?? ""
  const ext = last.includes(".") ? last.split(".").pop() : ""
  return ext && /^[a-zA-Z0-9]{1,8}$/.test(ext) ? ext.toLowerCase() : fallback
}

function slugify(value) {
  return (
    value
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "tamu"
  )
}

/** Metadata for a blob that already exists, or null. */
async function existingBlob(pathname) {
  try {
    return await head(pathname)
  } catch (err) {
    if (err instanceof Error && err.name === "BlobNotFoundError") return null
    if (err instanceof Error && /not found/i.test(err.message)) return null
    throw err
  }
}

/**
 * Copies one public URL into Vercel Blob, streaming rather than buffering so a
 * 500 MB video does not have to fit in memory. Returns the blob metadata.
 */
async function copyToBlob(sourceUrl, pathname, fallbackContentType) {
  const already = await existingBlob(pathname)
  if (already) return { blob: already, uploaded: false }

  if (dryRun) {
    return {
      blob: {
        url: `(dry-run)/${pathname}`,
        downloadUrl: "(dry-run)",
        size: 0,
        pathname,
      },
      uploaded: true,
    }
  }

  const response = await fetch(sourceUrl)
  if (!response.ok || !response.body) {
    throw new Error(`unduhan gagal (HTTP ${response.status})`)
  }

  const contentType =
    response.headers.get("content-type") || fallbackContentType
  const declaredSize = Number(response.headers.get("content-length") ?? 0)

  await put(pathname, response.body, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: false,
    cacheControlMaxAge: CACHE_MAX_AGE_SECONDS,
    multipart: declaredSize === 0 || declaredSize > MULTIPART_THRESHOLD_BYTES,
  })

  // Re-read rather than trusting the source's content-length, so the size
  // written to the database is the size Vercel Blob actually stored.
  const blob = await existingBlob(pathname)
  if (!blob) throw new Error("blob tidak ditemukan setelah diunggah")
  return { blob, uploaded: true }
}

function formatBytes(bytes) {
  if (!bytes) return "?"
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

/* ── Media ─────────────────────────────────────────── */

async function migrateMedia(stats) {
  const rows = await kvGetByPrefix("media:")
  console.log(`\n▶ Media: ${rows.length} baris ditemukan.`)

  for (const [index, row] of rows.entries()) {
    const label = `[${index + 1}/${rows.length}] ${row.key}`
    const item = row.value ?? {}

    try {
      if (item.pending) {
        console.log(`  ${label} — dilewati (unggahan belum selesai).`)
        stats.skipped++
        continue
      }
      if (!item.url) {
        console.log(`  ${label} — dilewati (tidak ada URL sumber).`)
        stats.skipped++
        continue
      }
      if (item.blobPathname && isBlobUrl(item.url)) {
        console.log(`  ${label} — sudah di Vercel Blob.`)
        stats.alreadyDone++
        continue
      }

      const ext = extensionOf(
        item.downloadName ?? item.objectName ?? item.url,
        "bin",
      )
      const downloadName =
        item.downloadName ??
        `potret-${slugify(item.uploader ?? "tamu")}-${item.id.slice(0, 8)}.${ext}`
      const pathname = `media/${item.id}/${downloadName}`

      const { blob, uploaded } = await copyToBlob(
        item.url,
        pathname,
        item.isVideo ? "video/mp4" : "image/jpeg",
      )

      await kvSet(row.key, {
        ...item,
        blobPathname: pathname,
        downloadName,
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        sizeBytes: blob.size ?? item.sizeBytes,
        // The old provider's location is no longer meaningful.
        objectName: undefined,
      })

      console.log(
        `  ${label} — ${
          uploaded ? "dipindahkan" : "sudah ada di Blob, URL diperbarui"
        }` + ` (${formatBytes(blob.size)}).`,
      )
      stats.migrated++
    } catch (err) {
      console.error(
        `  ${label} — GAGAL: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
      stats.failed.push(row.key)
    }
  }
}

/* ── Cover photo ───────────────────────────────────── */

async function migrateCover(stats) {
  console.log("\n▶ Foto sampul:")
  const rows = await kvGetByPrefix("config:event")
  const row = rows[0]
  const event = row?.value

  if (!event?.coverUrl) {
    console.log("  Dilewati (belum ada foto sampul tersimpan).")
    stats.skipped++
    return
  }
  if (isDefaultCover(event.coverUrl)) {
    console.log("  Dilewati (masih memakai sampul bawaan).")
    stats.skipped++
    return
  }
  if (event.coverBlobPathname && isBlobUrl(event.coverUrl)) {
    console.log("  Sudah di Vercel Blob.")
    stats.alreadyDone++
    return
  }

  try {
    // Keyed off the existing URL so a re-run lands on the same pathname.
    const ext = extensionOf(
      event.coverObject ?? event.coverPath ?? event.coverUrl,
      "jpg",
    )
    const pathname = `cover/${stableCoverId(event.coverUrl)}/sampul.${ext}`

    const { blob, uploaded } = await copyToBlob(
      event.coverUrl,
      pathname,
      "image/jpeg",
    )

    await kvSet(row.key, {
      ...event,
      coverUrl: blob.url,
      coverBlobPathname: pathname,
      coverObject: undefined,
      coverPath: undefined,
    })

    console.log(
      `  ${
        uploaded ? "Dipindahkan" : "Sudah ada di Blob, URL diperbarui"
      } → ${pathname}`,
    )
    stats.migrated++
  } catch (err) {
    console.error(
      `  GAGAL: ${err instanceof Error ? err.message : String(err)}`,
    )
    stats.failed.push("config:event")
  }
}

/**
 * Derives a stable directory name from the old URL so repeated runs reuse one
 * pathname instead of piling up copies of the same cover.
 */
function stableCoverId(url) {
  const existing = url.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  )
  if (existing) return existing[0].toLowerCase()
  // No uuid in the old path: fall back to a hash of the URL, still stable.
  let hash = 0
  for (let i = 0; i < url.length; i++)
    hash = (hash * 31 + url.charCodeAt(i)) | 0
  return `legacy-${(hash >>> 0).toString(16)}`
}

/* ── Run ───────────────────────────────────────────── */

async function main() {
  console.log("Migrasi penyimpanan → Vercel Blob")
  if (dryRun) console.log("Mode: DRY RUN (tidak ada perubahan yang ditulis)")

  const stats = { migrated: 0, alreadyDone: 0, skipped: 0, failed: [] }

  await migrateMedia(stats)
  await migrateCover(stats)

  console.log("\n── Ringkasan ──")
  console.log(`  Dipindahkan   : ${stats.migrated}`)
  console.log(`  Sudah selesai : ${stats.alreadyDone}`)
  console.log(`  Dilewati      : ${stats.skipped}`)
  console.log(`  Gagal         : ${stats.failed.length}`)

  if (stats.failed.length > 0) {
    console.log(`\n  Baris yang gagal: ${stats.failed.join(", ")}`)
    console.log(
      "  Jalankan ulang script ini untuk mencoba lagi hanya yang gagal.",
    )
    process.exit(1)
  }
  console.log("\n✓ Selesai.")
}

main().catch((err) => {
  console.error("\n✗ Migrasi berhenti:", err)
  process.exit(1)
})

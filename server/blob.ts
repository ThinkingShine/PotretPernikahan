/**
 * Vercel Blob access for the API function.
 *
 * Guest files are uploaded straight from the browser to Vercel Blob: this
 * module only mints short-lived, tightly scoped client tokens and confirms
 * afterwards that a blob really landed. Bytes never pass through the function,
 * so its request-body and duration limits do not apply to media at all.
 *
 * Credentials come from one environment variable, which Vercel injects
 * automatically once a Blob store is connected to the project:
 *   BLOB_READ_WRITE_TOKEN — the store's read-write token
 */

import { del, head, put } from "@vercel/blob"
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client"

/** Blobs stay cached for a year; every pathname carries a uuid, so bytes at a
 * given pathname never change. */
const CACHE_MAX_AGE_SECONDS = 31_536_000

/** Client tokens outlive even a slow venue-wifi upload, but not the event. */
const UPLOAD_TOKEN_TTL_MS = 6 * 60 * 60 * 1000

export function blobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

/**
 * Mints a token the browser can upload with. Every constraint is baked into
 * the token and enforced by Vercel Blob, so a tampered client cannot write
 * outside its own pathname, change the media type, or exceed the size cap.
 */
export function createUploadToken(options: {
  pathname: string
  contentType: string
  maximumSizeInBytes: number
}): Promise<string> {
  return generateClientTokenFromReadWriteToken({
    pathname: options.pathname,
    allowedContentTypes: [options.contentType],
    maximumSizeInBytes: options.maximumSizeInBytes,
    validUntil: Date.now() + UPLOAD_TOKEN_TTL_MS,
    // The pathname already contains a uuid, so a suffix would only make the
    // download filename uglier, and overwrites must stay impossible.
    addRandomSuffix: false,
    allowOverwrite: false,
    cacheControlMaxAge: CACHE_MAX_AGE_SECONDS,
  })
}

export interface BlobStat {
  size: number
  contentType: string
  url: string
  downloadUrl: string
}

/** Reads a blob's metadata; null when it does not exist. */
export async function statBlob(pathname: string): Promise<BlobStat | null> {
  try {
    const blob = await head(pathname)
    return {
      size: blob.size,
      contentType: blob.contentType,
      url: blob.url,
      downloadUrl: blob.downloadUrl,
    }
  } catch (err) {
    // head() throws BlobNotFoundError rather than returning null.
    if (err instanceof Error && err.name === "BlobNotFoundError") return null
    if (err instanceof Error && /not found/i.test(err.message)) return null
    throw err
  }
}

/** Uploads from the server. Only used for the small, admin-only cover photo. */
export async function putBlob(
  pathname: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<BlobStat> {
  const blob = await put(pathname, body, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    cacheControlMaxAge: CACHE_MAX_AGE_SECONDS,
  })
  return {
    size: body.byteLength,
    contentType: blob.contentType,
    url: blob.url,
    downloadUrl: blob.downloadUrl,
  }
}

/** Deletes a blob. A missing blob is already the desired end state, and del()
 * does not throw for one. */
export async function deleteBlob(pathnameOrUrl: string): Promise<void> {
  try {
    await del(pathnameOrUrl)
  } catch (err) {
    // Losing the object is not worth failing the caller's delete over: the KV
    // row still goes away, and an orphan blob costs only storage.
    console.log("Blob delete failed:", pathnameOrUrl, err)
  }
}

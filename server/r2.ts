/**
 * Cloudflare R2 Storage Adapter using standard AWS S3 SDK.
 *
 * Provides:
 * - Presigned PUT URL for direct-to-R2 upload from browser
 * - Object stat (HeadObject) verification
 * - Object deletion (DeleteObject)
 * - Public URL construction & Presigned Download URL generation
 */

import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

let cachedS3: S3Client | null = null

export function r2Configured(): boolean {
  return (
    !!process.env.R2_ACCOUNT_ID &&
    !!process.env.R2_ACCESS_KEY_ID &&
    !!process.env.R2_SECRET_ACCESS_KEY &&
    !!process.env.R2_BUCKET_NAME
  )
}

function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error("R2_BUCKET_NAME belum dikonfigurasi.")
  return bucket
}

function getS3Client(): S3Client {
  if (cachedS3) return cachedS3

  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Kredensial Cloudflare R2 belum lengkap di .env")
  }

  cachedS3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
  return cachedS3
}

export function getPublicUrl(pathname: string): string {
  const base = (
    process.env.R2_PUBLIC_URL ??
    `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  ).replace(/\/+$/, "")
  const cleanPath = pathname.replace(/^\/+/, "")
  return `${base}/${cleanPath}`
}

/**
 * Generates a presigned PUT URL for direct browser upload.
 */
export async function createUploadPresignedUrl(options: {
  pathname: string
  contentType: string
}): Promise<string> {
  const s3 = getS3Client()
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: options.pathname,
    ContentType: options.contentType,
    CacheControl: "public, max-age=31536000, immutable",
  })
  // Valid for 1 hour
  return getSignedUrl(s3, command, { expiresIn: 3600 })
}

export interface R2ObjectStat {
  size: number
  contentType: string
  url: string
  downloadUrl: string
}

/**
 * Checks if an object exists in R2 and returns its metadata.
 */
export async function statObject(pathname: string): Promise<R2ObjectStat | null> {
  try {
    const s3 = getS3Client()
    const response = await s3.send(
      new HeadObjectCommand({
        Bucket: getBucketName(),
        Key: pathname,
      }),
    )

    const url = getPublicUrl(pathname)
    return {
      size: response.ContentLength ?? 0,
      contentType: response.ContentType ?? "application/octet-stream",
      url,
      downloadUrl: url,
    }
  } catch (err: any) {
    if (
      err?.$metadata?.httpStatusCode === 404 ||
      err?.name === "NotFound" ||
      err?.name === "NoSuchKey"
    ) {
      return null
    }
    throw err
  }
}

/**
 * Generates a presigned GET URL with Content-Disposition attachment for reliable download.
 */
export async function createDownloadPresignedUrl(
  pathname: string,
  downloadName?: string,
): Promise<string> {
  const s3 = getS3Client()
  const disposition = downloadName
    ? `attachment; filename="${encodeURIComponent(downloadName)}"`
    : "attachment"

  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: pathname,
    ResponseContentDisposition: disposition,
  })
  return getSignedUrl(s3, command, { expiresIn: 3600 })
}

/**
 * Deletes an object from R2 bucket.
 */
export async function deleteObject(pathname: string): Promise<void> {
  try {
    const s3 = getS3Client()
    await s3.send(
      new DeleteObjectCommand({
        Bucket: getBucketName(),
        Key: pathname,
      }),
    )
  } catch (err) {
    console.log("R2 delete failed:", pathname, err)
  }
}

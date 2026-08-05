/**
 * Google Cloud Storage access for the edge function.
 *
 * Guest files are uploaded straight from the browser to GCS: this module only
 * mints short-lived credentials and confirms afterwards that an object really
 * landed. Bytes never pass through Supabase, so its per-file, storage and
 * egress quotas do not apply to media at all.
 *
 * Authentication uses HMAC keys against the XML API rather than a service
 * account JSON key, because org policy commonly blocks service-account key
 * creation. HMAC keys come from Cloud Storage → Settings → Interoperability
 * and are signed with GOOG4-HMAC-SHA256, the same V4 scheme as S3.
 *
 * Credentials come from secrets set in the Supabase dashboard:
 *   GCS_ACCESS_KEY — HMAC access key id (starts with GOOG...)
 *   GCS_SECRET     — HMAC secret
 *   GCS_BUCKET     — the bucket name
 *   GCS_REGION     — optional; bucket location, defaults to "auto"
 */

const HOST = "storage.googleapis.com";
const ALGORITHM = "GOOG4-HMAC-SHA256";

export function gcsBucket(): string {
  const bucket = Deno.env.get("GCS_BUCKET");
  if (!bucket) throw new Error("GCS_BUCKET belum diatur.");
  return bucket;
}

function gcsRegion(): string {
  return Deno.env.get("GCS_REGION") || "auto";
}

function credentials(): { accessKey: string; secret: string } {
  const accessKey = Deno.env.get("GCS_ACCESS_KEY");
  const secret = Deno.env.get("GCS_SECRET");
  if (!accessKey || !secret) {
    throw new Error("GCS_ACCESS_KEY/GCS_SECRET belum diatur.");
  }
  return { accessKey, secret };
}

export function gcsConfigured(): boolean {
  return (
    !!Deno.env.get("GCS_BUCKET") &&
    !!Deno.env.get("GCS_ACCESS_KEY") &&
    !!Deno.env.get("GCS_SECRET")
  );
}

/* ── Signing primitives ────────────────────────────── */

export function hex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return hex(new Uint8Array(digest));
}

async function hmac(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

/** Derives the V4 signing key: secret → date → region → service → request. */
async function signingKey(secret: string, datestamp: string, region: string): Promise<Uint8Array> {
  let key = new TextEncoder().encode(`GOOG4${secret}`);
  key = await hmac(key, datestamp);
  key = await hmac(key, region);
  key = await hmac(key, "storage");
  key = await hmac(key, "goog4_request");
  return key;
}

/**
 * RFC 3986 escaping. encodeURIComponent leaves !'()* alone, but the signature
 * is computed over the encoded string, so any mismatch breaks the request.
 */
function rfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function objectPath(objectName: string): string {
  return `/${gcsBucket()}/${objectName.split("/").map(rfc3986).join("/")}`;
}

function yyyymmdd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}
function isoStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Builds a V4 pre-signed URL. Any header in `headers` is folded into the
 * signature and MUST be sent verbatim on the request, or GCS rejects it.
 */
export async function signedUrl(
  method: string,
  objectName: string,
  options: {
    expiresSeconds?: number;
    query?: Record<string, string>;
    headers?: Record<string, string>;
  } = {},
): Promise<string> {
  const { accessKey, secret } = credentials();
  const { expiresSeconds = 900, query = {}, headers = {} } = options;

  const now = new Date();
  const datestamp = yyyymmdd(now);
  const timestamp = isoStamp(now);
  const region = gcsRegion();
  const credentialScope = `${datestamp}/${region}/storage/goog4_request`;

  const allHeaders: Record<string, string> = { host: HOST, ...headers };
  const headerNames = Object.keys(allHeaders)
    .map((h) => h.toLowerCase())
    .sort();
  const signedHeaders = headerNames.join(";");
  const canonicalHeaders = headerNames.map((name) => {
    const key = Object.keys(allHeaders).find((h) => h.toLowerCase() === name)!;
    return `${name}:${String(allHeaders[key]).trim()}`;
  });

  const params: Record<string, string> = {
    ...query,
    "X-Goog-Algorithm": ALGORITHM,
    "X-Goog-Credential": `${accessKey}/${credentialScope}`,
    "X-Goog-Date": timestamp,
    "X-Goog-Expires": String(expiresSeconds),
    "X-Goog-SignedHeaders": signedHeaders,
  };

  const canonicalQuery = Object.keys(params)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(params[k])}`)
    .join("&");

  const canonicalUri = objectPath(objectName);
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    ...canonicalHeaders,
    "",
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    ALGORITHM,
    timestamp,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const key = await signingKey(secret, datestamp, region);
  const signature = hex(await hmac(key, stringToSign));

  return `https://${HOST}${canonicalUri}?${canonicalQuery}&X-Goog-Signature=${signature}`;
}

/* ── Uploads ───────────────────────────────────────── */

/**
 * Opens a resumable upload session and returns the URI the browser PUTs to.
 * Resumable rather than a single signed PUT because venue wifi drops, and a
 * dropped resumable upload can continue instead of starting over. The session
 * URI carries its own credential, so the browser needs no key of its own.
 */
export async function createResumableUpload(
  objectName: string,
  contentType: string,
  _downloadFilename: string,
): Promise<string> {
  const headers = {
    "content-type": contentType,
    "x-goog-resumable": "start",
    "cache-control": "public, max-age=31536000, immutable",
  };
  const url = await signedUrl("POST", objectName, { headers });

  const res = await fetch(url, { method: "POST", headers });
  const location = res.headers.get("Location");
  if (!res.ok || !location) {
    console.log("GCS resumable session failed:", res.status, await res.text().catch(() => ""));
    throw new Error("Gagal memulai unggahan ke Google Cloud Storage.");
  }
  return location;
}

/**
 * Uploads a byte payload straight through a resumable session in one shot.
 * Used for small server-relayed uploads (cover photos, legacy backfill) where
 * the bytes are already in memory and a multi-request resumable flow buys
 * nothing.
 */
export async function putObject(
  objectName: string,
  contentType: string,
  bytes: BodyInit,
  downloadFilename: string,
): Promise<void> {
  const uploadUrl = await createResumableUpload(objectName, contentType, downloadFilename);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: bytes,
  });
  if (!res.ok) {
    console.log("GCS object upload failed:", res.status, await res.text().catch(() => ""));
    throw new Error("Gagal mengunggah berkas ke Google Cloud Storage.");
  }
}

/** Reads an object's metadata; null when it does not exist. */
export async function statObject(
  objectName: string,
): Promise<{ size: number; contentType: string } | null> {
  const url = await signedUrl("HEAD", objectName);
  const res = await fetch(url, { method: "HEAD" });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.log("GCS stat failed:", res.status);
    throw new Error("Gagal memeriksa berkas di Google Cloud Storage.");
  }
  return {
    size: Number(res.headers.get("Content-Length") ?? 0),
    contentType: res.headers.get("Content-Type") ?? "",
  };
}

export async function deleteObject(objectName: string): Promise<void> {
  const url = await signedUrl("DELETE", objectName);
  const res = await fetch(url, { method: "DELETE" });
  // A missing object is already the desired end state.
  if (!res.ok && res.status !== 404) {
    console.log("GCS delete failed:", res.status, await res.text().catch(() => ""));
  }
}

export function publicUrl(objectName: string): string {
  return `https://${HOST}${objectPath(objectName)}`;
}

/**
 * Builds a signed GET URL that forces a download with a chosen filename.
 * A plain public URL cannot do this: the HTML download attribute is ignored
 * cross-origin, and response-content-disposition must be signed to be honoured.
 */
export async function signedDownloadUrl(
  objectName: string,
  filename: string,
  expiresSeconds = 900,
): Promise<string> {
  return signedUrl("GET", objectName, {
    expiresSeconds,
    query: {
      "response-content-disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
    },
  });
}

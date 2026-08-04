/**
 * Google Cloud Storage access for the edge function.
 *
 * Guest files are uploaded straight from the browser to GCS: this module only
 * mints short-lived credentials and confirms afterwards that an object really
 * landed. Bytes never pass through Supabase, so its per-file, storage and
 * egress quotas do not apply to media at all.
 *
 * Credentials come from two secrets, set in the Supabase dashboard:
 *   GCS_SERVICE_ACCOUNT_JSON — the full service-account key JSON
 *   GCS_BUCKET               — the bucket name
 */

interface ServiceAccount {
  client_email: string
  private_key: string
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/devstorage.read_write";

export function gcsBucket(): string {
  const bucket = Deno.env.get("GCS_BUCKET");
  if (!bucket) throw new Error("GCS_BUCKET belum diatur.");
  return bucket;
}

export function gcsConfigured(): boolean {
  return !!Deno.env.get("GCS_BUCKET") && !!Deno.env.get("GCS_SERVICE_ACCOUNT_JSON");
}

function serviceAccount(): ServiceAccount {
  const raw = Deno.env.get("GCS_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("GCS_SERVICE_ACCOUNT_JSON belum diatur.");
  const parsed = JSON.parse(raw);
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("GCS_SERVICE_ACCOUNT_JSON tidak berisi client_email/private_key.");
  }
  return parsed;
}

/* ── Encoding helpers ──────────────────────────────── */

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlText(text: string): string {
  return base64Url(new TextEncoder().encode(text));
}

/** Strips the PEM armour and returns the raw PKCS#8 bytes. */
export function pemToPkcs8(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function hex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function importSigningKey(privateKeyPem: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function signRsa(privateKeyPem: string, data: string): Promise<Uint8Array> {
  const key = await importSigningKey(privateKeyPem);
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(data),
  );
  return new Uint8Array(sig);
}

/* ── Access token ──────────────────────────────────── */

let cachedToken: { value: string; expiresAt: number } | null = null;

/** Builds the signed assertion Google exchanges for an access token. */
export async function buildAssertion(
  sa: ServiceAccount,
  now = Math.floor(Date.now() / 1000),
): Promise<string> {
  const header = base64UrlText(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64UrlText(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claims}`;
  const signature = await signRsa(sa.private_key, unsigned);
  return `${unsigned}.${base64Url(signature)}`;
}

export async function accessToken(): Promise<string> {
  // Re-use the token until a minute before it lapses; each mint costs a
  // round-trip to Google that would otherwise happen on every upload.
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const sa = serviceAccount();
  const assertion = await buildAssertion(sa);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.access_token) {
    console.log("GCS token exchange failed:", res.status, body);
    throw new Error("Gagal mengautentikasi ke Google Cloud Storage.");
  }

  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

/* ── Uploads ───────────────────────────────────────── */

/**
 * Opens a resumable upload session and returns the URI the browser PUTs to.
 * Resumable rather than a single signed PUT because venue wifi drops, and a
 * dropped resumable upload can continue instead of starting over.
 */
export async function createResumableUpload(
  objectName: string,
  contentType: string,
  downloadFilename: string,
): Promise<string> {
  const token = await accessToken();
  const url =
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(gcsBucket())}/o` +
    `?uploadType=resumable&name=${encodeURIComponent(objectName)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": contentType,
    },
    body: JSON.stringify({
      // inline so the gallery can render it; downloads attach their own
      // disposition through a signed URL.
      contentDisposition: `inline; filename="${downloadFilename.replace(/"/g, "")}"`,
      cacheControl: "public, max-age=31536000, immutable",
    }),
  });

  const location = res.headers.get("Location");
  if (!res.ok || !location) {
    console.log("GCS resumable session failed:", res.status, await res.text().catch(() => ""));
    throw new Error("Gagal memulai unggahan ke Google Cloud Storage.");
  }
  return location;
}

/** Reads an object's metadata; null when it does not exist. */
export async function statObject(
  objectName: string,
): Promise<{ size: number; contentType: string } | null> {
  const token = await accessToken();
  const url =
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(gcsBucket())}` +
    `/o/${encodeURIComponent(objectName)}`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.log("GCS stat failed:", res.status, await res.text().catch(() => ""));
    throw new Error("Gagal memeriksa berkas di Google Cloud Storage.");
  }
  const body = await res.json();
  return { size: Number(body.size ?? 0), contentType: body.contentType ?? "" };
}

export async function deleteObject(objectName: string): Promise<void> {
  const token = await accessToken();
  const url =
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(gcsBucket())}` +
    `/o/${encodeURIComponent(objectName)}`;
  const res = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  // A missing object is already the desired end state.
  if (!res.ok && res.status !== 404) {
    console.log("GCS delete failed:", res.status, await res.text().catch(() => ""));
  }
}

export function publicUrl(objectName: string): string {
  return `https://storage.googleapis.com/${gcsBucket()}/${objectName
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

/* ── V4 signed download URL ────────────────────────── */

function yyyymmdd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}
function isoStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Builds a V4 signed GET URL that forces a download with a chosen filename.
 * A plain public URL cannot do this: the HTML download attribute is ignored
 * cross-origin, and response-content-disposition must be signed to be honoured.
 */
export async function signedDownloadUrl(
  objectName: string,
  filename: string,
  expiresSeconds = 900,
): Promise<string> {
  const sa = serviceAccount();
  const now = new Date();
  const datestamp = yyyymmdd(now);
  const timestamp = isoStamp(now);
  const credentialScope = `${datestamp}/auto/storage/goog4_request`;

  const canonicalUri = `/${gcsBucket()}/${objectName.split("/").map(encodeURIComponent).join("/")}`;
  const disposition = `attachment; filename="${filename.replace(/"/g, "")}"`;

  const params: Record<string, string> = {
    "X-Goog-Algorithm": "GOOG4-RSA-SHA256",
    "X-Goog-Credential": `${sa.client_email}/${credentialScope}`,
    "X-Goog-Date": timestamp,
    "X-Goog-Expires": String(expiresSeconds),
    "X-Goog-SignedHeaders": "host",
    "response-content-disposition": disposition,
  };

  const canonicalQuery = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");

  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQuery,
    "host:storage.googleapis.com",
    "",
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalRequest),
  );
  const stringToSign = [
    "GOOG4-RSA-SHA256",
    timestamp,
    credentialScope,
    hex(new Uint8Array(digest)),
  ].join("\n");

  const signature = hex(await signRsa(sa.private_key, stringToSign));
  return `https://storage.googleapis.com${canonicalUri}?${canonicalQuery}&X-Goog-Signature=${signature}`;
}

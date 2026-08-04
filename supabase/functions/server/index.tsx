import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();

const BASE = "/make-server-746e6e59";
const BUCKET = "wedding-media";

const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const MAX_NAME_LEN = 60;
const MAX_MESSAGE_LEN = 500;
const MAX_COVER_BYTES = 10 * 1024 * 1024;

const DEFAULT_EVENT = {
  coupleNames: "Dinda & Arya",
  eventDate: "12 Oktober 2026",
  eventLocation: "Bandung",
  coverUrl:
    "https://images.unsplash.com/photo-1650377509454-1bbd8392e122?w=800&h=450&fit=crop&auto=format",
  coverPath: null as string | null,
};

async function readEvent() {
  const stored = await kv.get("config:event");
  return { ...DEFAULT_EVENT, ...(stored ?? {}) };
}

const admin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Admin-Passcode"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

/* ── Admin auth ────────────────────────────────────── */

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time compare so a wrong passcode leaks no timing signal. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function isAdmin(passcode: string | undefined): Promise<boolean> {
  if (!passcode) return false;
  const config = await kv.get("config:admin");
  if (!config?.passcodeHash) return false;
  return safeEqual(await sha256Hex(passcode), config.passcodeHash);
}

/** Guards every /admin route. */
async function requireAdmin(c: any, next: any) {
  const passcode = c.req.header("X-Admin-Passcode");
  if (!(await isAdmin(passcode))) {
    return c.json({ error: "Kode admin tidak sesuai." }, 401);
  }
  await next();
}

app.use(`${BASE}/admin/*`, requireAdmin);

// Health check endpoint
app.get(`${BASE}/health`, (c) => {
  return c.json({ status: "ok" });
});

// Passcode check. Not under /admin/* so it can return a clean 401 itself.
app.post(`${BASE}/admin-login`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const passcode = typeof body?.passcode === "string" ? body.passcode : "";
    if (!(await isAdmin(passcode))) {
      return c.json({ error: "Kode admin tidak sesuai." }, 401);
    }
    return c.json({ ok: true });
  } catch (err) {
    console.log("Admin login failed:", err);
    return c.json({ error: "Gagal memeriksa kode admin." }, 500);
  }
});

/* ── Media ─────────────────────────────────────────── */

app.get(`${BASE}/media`, async (c) => {
  try {
    const items = await kv.getByPrefix("media:");
    items.sort((a, b) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0));
    return c.json({ items });
  } catch (err) {
    console.log("Failed to list media:", err);
    return c.json({ error: "Gagal memuat galeri." }, 500);
  }
});

app.post(`${BASE}/media`, async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];

    if (!(file instanceof File)) {
      return c.json({ error: "Tidak ada berkas yang dikirim." }, 400);
    }

    const isVideo = file.type.startsWith("video/");
    const limit = isVideo ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
    if (file.size > limit) {
      const mb = Math.round(limit / (1024 * 1024));
      return c.json({ error: `Berkas terlalu besar. Maksimum ${mb} MB.` }, 413);
    }

    const rawUploader = body["uploader"];
    const uploader =
      typeof rawUploader === "string" && rawUploader.trim()
        ? rawUploader.trim().slice(0, MAX_NAME_LEN)
        : null;

    const id = crypto.randomUUID();
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const path = `${id}.${ext}`;

    const supabase = admin();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || "application/octet-stream" });

    if (uploadError) {
      console.log("Storage upload failed:", uploadError);
      return c.json({ error: "Gagal mengunggah berkas." }, 500);
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const item = {
      id,
      path,
      url: pub.publicUrl,
      uploader,
      isVideo,
      approved: false,
      createdAt: Date.now(),
    };
    await kv.set(`media:${id}`, item);

    return c.json({ item }, 201);
  } catch (err) {
    console.log("Failed to upload media:", err);
    return c.json({ error: "Gagal mengunggah berkas." }, 500);
  }
});

/* ── Guestbook ─────────────────────────────────────── */

app.get(`${BASE}/guestbook`, async (c) => {
  try {
    const entries = await kv.getByPrefix("guestbook:");
    entries.sort((a, b) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0));
    return c.json({ entries });
  } catch (err) {
    console.log("Failed to list guestbook:", err);
    return c.json({ error: "Gagal memuat ucapan." }, 500);
  }
});

app.post(`${BASE}/guestbook`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return c.json({ error: "Format permintaan tidak sesuai." }, 400);
    }

    const author = typeof body.author === "string" ? body.author.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!author) return c.json({ error: "Nama tidak boleh kosong." }, 400);
    if (!message) return c.json({ error: "Ucapan tidak boleh kosong." }, 400);

    const id = crypto.randomUUID();
    const entry = {
      id,
      author: author.slice(0, MAX_NAME_LEN),
      message: message.slice(0, MAX_MESSAGE_LEN),
      approved: false,
      createdAt: Date.now(),
    };
    await kv.set(`guestbook:${id}`, entry);

    return c.json({ entry }, 201);
  } catch (err) {
    console.log("Failed to create guestbook entry:", err);
    return c.json({ error: "Gagal mengirim ucapan." }, 500);
  }
});

/* ── Slideshow (public, approved only) ─────────────── */

app.get(`${BASE}/slideshow`, async (c) => {
  try {
    const [media, entries] = await Promise.all([
      kv.getByPrefix("media:"),
      kv.getByPrefix("guestbook:"),
    ]);
    const items = media
      .filter((m) => m?.approved)
      .sort((a, b) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0));
    const wishes = entries
      .filter((e) => e?.approved)
      .sort((a, b) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0));
    return c.json({ items, wishes });
  } catch (err) {
    console.log("Failed to load slideshow:", err);
    return c.json({ error: "Gagal memuat slideshow." }, 500);
  }
});

/* ── Admin ─────────────────────────────────────────── */

app.get(`${BASE}/admin/media`, async (c) => {
  try {
    const items = await kv.getByPrefix("media:");
    items.sort((a, b) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0));
    return c.json({ items });
  } catch (err) {
    console.log("Failed to list media for admin:", err);
    return c.json({ error: "Gagal memuat media." }, 500);
  }
});

app.post(`${BASE}/admin/media/:id/approval`, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const approved = body?.approved === true;

    const item = await kv.get(`media:${id}`);
    if (!item) return c.json({ error: "Media tidak ditemukan." }, 404);

    const updated = { ...item, approved };
    await kv.set(`media:${id}`, updated);
    return c.json({ item: updated });
  } catch (err) {
    console.log("Failed to set media approval:", err);
    return c.json({ error: "Gagal memperbarui status." }, 500);
  }
});

app.delete(`${BASE}/admin/media/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const item = await kv.get(`media:${id}`);
    if (!item) return c.json({ error: "Media tidak ditemukan." }, 404);

    // Remove the stored object too so deletes free space.
    if (item.path) {
      const { error } = await admin().storage.from(BUCKET).remove([item.path]);
      if (error) console.log("Storage remove failed:", error);
    }
    await kv.del(`media:${id}`);
    return c.json({ ok: true });
  } catch (err) {
    console.log("Failed to delete media:", err);
    return c.json({ error: "Gagal menghapus media." }, 500);
  }
});

app.get(`${BASE}/admin/guestbook`, async (c) => {
  try {
    const entries = await kv.getByPrefix("guestbook:");
    entries.sort((a, b) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0));
    return c.json({ entries });
  } catch (err) {
    console.log("Failed to list guestbook for admin:", err);
    return c.json({ error: "Gagal memuat ucapan." }, 500);
  }
});

app.post(`${BASE}/admin/guestbook/:id/approval`, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const approved = body?.approved === true;

    const entry = await kv.get(`guestbook:${id}`);
    if (!entry) return c.json({ error: "Ucapan tidak ditemukan." }, 404);

    const updated = { ...entry, approved };
    await kv.set(`guestbook:${id}`, updated);
    return c.json({ entry: updated });
  } catch (err) {
    console.log("Failed to set guestbook approval:", err);
    return c.json({ error: "Gagal memperbarui status." }, 500);
  }
});

app.delete(`${BASE}/admin/guestbook/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const entry = await kv.get(`guestbook:${id}`);
    if (!entry) return c.json({ error: "Ucapan tidak ditemukan." }, 404);
    await kv.del(`guestbook:${id}`);
    return c.json({ ok: true });
  } catch (err) {
    console.log("Failed to delete guestbook entry:", err);
    return c.json({ error: "Gagal menghapus ucapan." }, 500);
  }
});

/* ── Event settings ────────────────────────────────── */

app.get(`${BASE}/event`, async (c) => {
  try {
    return c.json({ event: await readEvent() });
  } catch (err) {
    console.log("Failed to load event settings:", err);
    return c.json({ error: "Gagal memuat pengaturan acara." }, 500);
  }
});

app.post(`${BASE}/admin/event`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return c.json({ error: "Format permintaan tidak sesuai." }, 400);
    }

    const coupleNames =
      typeof body.coupleNames === "string" ? body.coupleNames.trim() : "";
    if (!coupleNames) {
      return c.json({ error: "Nama pengantin tidak boleh kosong." }, 400);
    }

    const current = await readEvent();
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
    };
    await kv.set("config:event", updated);
    return c.json({ event: updated });
  } catch (err) {
    console.log("Failed to update event settings:", err);
    return c.json({ error: "Gagal menyimpan pengaturan." }, 500);
  }
});

app.post(`${BASE}/admin/event/cover`, async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];

    if (!(file instanceof File)) {
      return c.json({ error: "Tidak ada berkas yang dikirim." }, 400);
    }
    if (!file.type.startsWith("image/")) {
      return c.json({ error: "Foto sampul harus berupa gambar." }, 400);
    }
    if (file.size > MAX_COVER_BYTES) {
      return c.json({ error: "Foto sampul maksimum 10 MB." }, 413);
    }

    const current = await readEvent();
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
    // Kept under cover/ so it never shows up in the guest gallery listing.
    const path = `cover/${crypto.randomUUID()}.${ext}`;

    const supabase = admin();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      console.log("Cover upload failed:", uploadError);
      return c.json({ error: "Gagal mengunggah foto sampul." }, 500);
    }

    // Drop the previous cover so replacements do not pile up.
    if (current.coverPath) {
      const { error } = await supabase.storage
        .from(BUCKET)
        .remove([current.coverPath]);
      if (error) console.log("Old cover remove failed:", error);
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const updated = { ...current, coverUrl: pub.publicUrl, coverPath: path };
    await kv.set("config:event", updated);

    return c.json({ event: updated });
  } catch (err) {
    console.log("Failed to set cover:", err);
    return c.json({ error: "Gagal mengunggah foto sampul." }, 500);
  }
});

Deno.serve(app.fetch);

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
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get(`${BASE}/health`, (c) => {
  return c.json({ status: "ok" });
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
      url: pub.publicUrl,
      uploader,
      isVideo,
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
      createdAt: Date.now(),
    };
    await kv.set(`guestbook:${id}`, entry);

    return c.json({ entry }, 201);
  } catch (err) {
    console.log("Failed to create guestbook entry:", err);
    return c.json({ error: "Gagal mengirim ucapan." }, 500);
  }
});

Deno.serve(app.fetch);

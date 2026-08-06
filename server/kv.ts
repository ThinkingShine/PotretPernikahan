/**
 * Key-value storage backed by the Supabase Postgres table `kv_store_746e6e59`.
 *
 * Storage moved to Vercel Blob, but the database stays on Supabase: this is the
 * same table and the same rows the previous Deno edge function used, reached
 * with the service-role key from the Vercel function instead.
 *
 * Table schema (see supabase/migrations):
 *   CREATE TABLE kv_store_746e6e59 (
 *     key TEXT NOT NULL PRIMARY KEY,
 *     value JSONB NOT NULL
 *   );
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const TABLE = "kv_store_746e6e59"

let cached: SupabaseClient | null = null

export function kvConfigured(): boolean {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY
}

/** One client per warm function instance rather than one per query. */
function client(): SupabaseClient {
  if (cached) return cached

  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur.")
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}

export async function set(key: string, value: unknown): Promise<void> {
  const { error } = await client().from(TABLE).upsert({ key, value })
  if (error) throw new Error(error.message)
}

export async function get(key: string): Promise<any> {
  const { data, error } = await client()
    .from(TABLE)
    .select("value")
    .eq("key", key)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data?.value
}

export async function del(key: string): Promise<void> {
  const { error } = await client().from(TABLE).delete().eq("key", key)
  if (error) throw new Error(error.message)
}

export async function mset(keys: string[], values: unknown[]): Promise<void> {
  const { error } = await client()
    .from(TABLE)
    .upsert(keys.map((k, i) => ({ key: k, value: values[i] })))
  if (error) throw new Error(error.message)
}

export async function mget(keys: string[]): Promise<any[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("value")
    .in("key", keys)
  if (error) throw new Error(error.message)
  return data?.map((d) => d.value) ?? []
}

export async function mdel(keys: string[]): Promise<void> {
  const { error } = await client().from(TABLE).delete().in("key", keys)
  if (error) throw new Error(error.message)
}

export async function getByPrefix(prefix: string): Promise<any[]> {
  const { data, error } = await client()
    .from(TABLE)
    .select("key, value")
    .like("key", prefix + "%")
  if (error) throw new Error(error.message)
  return data?.map((d) => d.value) ?? []
}

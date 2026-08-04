-- Key-value store backing the make-server-746e6e59 edge function.
-- The function accesses this table with the service-role key, which
-- bypasses RLS. RLS is enabled with no policies so the public/anon
-- API cannot read or write it directly.

CREATE TABLE IF NOT EXISTS public.kv_store_746e6e59 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

ALTER TABLE public.kv_store_746e6e59 ENABLE ROW LEVEL SECURITY;

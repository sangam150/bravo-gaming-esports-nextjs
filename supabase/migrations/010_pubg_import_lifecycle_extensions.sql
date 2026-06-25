-- Extend import lifecycle tracking for pending_imports without changing core routes.

DO $$
BEGIN
  ALTER TYPE public.import_status ADD VALUE IF NOT EXISTS 'queued';
  ALTER TYPE public.import_status ADD VALUE IF NOT EXISTS 'fetching';
  ALTER TYPE public.import_status ADD VALUE IF NOT EXISTS 'fetched';
  ALTER TYPE public.import_status ADD VALUE IF NOT EXISTS 'normalized';
  ALTER TYPE public.import_status ADD VALUE IF NOT EXISTS 'draft';
  ALTER TYPE public.import_status ADD VALUE IF NOT EXISTS 'repaired';
  ALTER TYPE public.import_status ADD VALUE IF NOT EXISTS 'reset';
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

ALTER TABLE public.pending_imports
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS external_match_id text,
  ADD COLUMN IF NOT EXISTS raw_json_id text,
  ADD COLUMN IF NOT EXISTS normalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE INDEX IF NOT EXISTS pending_imports_external_match_id_idx ON public.pending_imports (external_match_id);
CREATE INDEX IF NOT EXISTS pending_imports_source_idx ON public.pending_imports (source);
CREATE INDEX IF NOT EXISTS pending_imports_published_at_idx ON public.pending_imports (published_at);

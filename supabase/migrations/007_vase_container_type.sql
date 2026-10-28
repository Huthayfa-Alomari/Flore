-- FLORÉ migration 007: the Atelier API selects vase_options.container_type,
-- but the original table did not define it. Safe for existing installations.
ALTER TABLE public.vase_options ADD COLUMN IF NOT EXISTS container_type TEXT;

UPDATE public.vase_options
SET container_type = CASE
  WHEN lower(name) LIKE '%glass%'
    OR lower(name) LIKE '%ceramic%'
    OR coalesce(name_ar, '') LIKE '%مزهرية%' THEN 'glass_vase'
  WHEN lower(name) LIKE '%box%'
    OR coalesce(name_ar, '') LIKE '%صندوق%' THEN 'luxury_box'
  WHEN lower(name) LIKE '%basket%'
    OR coalesce(name_ar, '') LIKE '%سلة%' THEN 'basket'
  ELSE 'wrap'
END
WHERE container_type IS NULL
   OR container_type NOT IN ('basket', 'glass_vase', 'wrap', 'luxury_box');

ALTER TABLE public.vase_options
  ALTER COLUMN container_type SET DEFAULT 'wrap';
ALTER TABLE public.vase_options
  ALTER COLUMN container_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.vase_options'::regclass
      AND conname = 'vase_options_container_type_check'
  ) THEN
    ALTER TABLE public.vase_options
      ADD CONSTRAINT vase_options_container_type_check
      CHECK (container_type IN ('basket', 'glass_vase', 'wrap', 'luxury_box'));
  END IF;
END $$;

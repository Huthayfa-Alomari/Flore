-- FLORÉ migration 006: atomic daily quota for AI image generation.
-- The RPC reserves a slot atomically, preventing concurrent requests from bypassing the daily cap.
CREATE TABLE IF NOT EXISTS public.ai_generation_usage (
  identifier TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT (timezone('utc', now())::date),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (identifier, usage_date)
);

ALTER TABLE public.ai_generation_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_generation_usage FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.claim_ai_generation(
  p_identifier TEXT,
  p_daily_limit INTEGER DEFAULT 5
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_count INTEGER;
BEGIN
  IF p_identifier IS NULL OR length(p_identifier) = 0 OR p_daily_limit < 1 THEN
    RETURN -1;
  END IF;

  INSERT INTO public.ai_generation_usage (identifier, usage_date, used_count)
  VALUES (p_identifier, timezone('utc', now())::date, 1)
  ON CONFLICT (identifier, usage_date)
  DO UPDATE SET
    used_count = public.ai_generation_usage.used_count + 1,
    updated_at = now()
  WHERE public.ai_generation_usage.used_count < p_daily_limit
  RETURNING used_count INTO claimed_count;

  IF claimed_count IS NULL THEN
    RETURN -1;
  END IF;

  RETURN p_daily_limit - claimed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_ai_generation(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ai_generation(TEXT, INTEGER) TO service_role;

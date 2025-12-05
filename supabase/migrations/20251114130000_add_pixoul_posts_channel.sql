-- Ensure the post_channel enum exists with required values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'post_channel'
  ) THEN
    CREATE TYPE post_channel AS ENUM ('from_pixoul', 'packages_offers');
  END IF;
END $$;

-- Guarantee the channel column exists so we can migrate data safely
ALTER TABLE public.pixoul_posts
  ADD COLUMN IF NOT EXISTS channel text;

-- Drop any legacy check constraint so we can rely on the enum definition instead
ALTER TABLE public.pixoul_posts
  DROP CONSTRAINT IF EXISTS pixoul_posts_channel_check;

-- Backfill historic rows with the default channel
UPDATE public.pixoul_posts
SET channel = 'from_pixoul'
WHERE channel IS NULL;

-- Cast the column to the enum and enforce defaults / not-null semantics
ALTER TABLE public.pixoul_posts
  ALTER COLUMN channel TYPE post_channel
    USING COALESCE(channel, 'from_pixoul')::post_channel,
  ALTER COLUMN channel SET DEFAULT 'from_pixoul',
  ALTER COLUMN channel SET NOT NULL;

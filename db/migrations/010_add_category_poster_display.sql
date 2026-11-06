ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS poster_display TEXT NOT NULL DEFAULT 'per-video'
  CHECK (poster_display IN ('per-video', 'portrait', 'landscape'));

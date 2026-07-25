DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'media_items_metadata_object_chk'
      AND conrelid = 'media_items'::regclass
  ) THEN
    ALTER TABLE media_items
      ADD CONSTRAINT media_items_metadata_object_chk
      CHECK (jsonb_typeof(metadata) = 'object');
  END IF;
END $$;

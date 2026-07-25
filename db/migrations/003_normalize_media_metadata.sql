UPDATE media_items
SET metadata = CASE
  WHEN metadata IS NULL THEN '{}'::jsonb
  WHEN jsonb_typeof(metadata) = 'object' THEN metadata
  ELSE '{}'::jsonb
END
WHERE metadata IS NULL OR jsonb_typeof(metadata) <> 'object';

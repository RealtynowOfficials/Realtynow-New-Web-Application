-- 0072: Storage bucket for raw bulk-import files (.csv/.xlsx), matching the
-- idempotent insert-or-nothing + per-bucket RLS pattern from migration 0004.

INSERT INTO storage.buckets (id, name, public)
VALUES ('bulk-import-files', 'bulk-import-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth_rw_bulk_import_files" ON storage.objects;
CREATE POLICY "auth_rw_bulk_import_files" ON storage.objects FOR ALL
  TO authenticated USING (bucket_id = 'bulk-import-files') WITH CHECK (bucket_id = 'bulk-import-files');

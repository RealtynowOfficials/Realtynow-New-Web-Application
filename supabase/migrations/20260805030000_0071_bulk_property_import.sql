-- 0071: Bulk Property Import (Phase 1)
--
-- Adds job/row/error tracking for a multi-role (Customer/Agent/Admin — Builder
-- deferred, see plan) bulk Excel/CSV property import. Additive only: 3 new
-- tables, no changes to `properties` or any existing table. Customer/Agent
-- writes go through the normal Supabase client + RLS below; Admin writes go
-- through a service-role edge function (supabase/functions/bulk-import-admin)
-- because /admin/login's session (admin_sessions table, migration 0068) is
-- not a real Supabase Auth session, so auth.uid() is NULL for admin callers
-- and these RLS policies never evaluate for them.

-- created_by is nullable: admin-portal accounts (public.admins) are NOT backed by an
-- auth.users row (confirmed — /admin/login's custom email+OTP flow never calls
-- supabase.auth.signInWithPassword/setSession), so admin-originated jobs are attributed
-- via admin_id instead. Customer/Agent jobs always set created_by (real Supabase Auth
-- user) and leave admin_id null.
CREATE TABLE IF NOT EXISTS public.bulk_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  created_by_role TEXT NOT NULL CHECK (created_by_role IN ('customer','agent','builder','admin')),
  purpose TEXT NOT NULL CHECK (purpose IN ('Sale','Rent')),
  file_name TEXT NOT NULL,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Processing','Completed','Failed')),
  total_rows INT NOT NULL DEFAULT 0,
  success_rows INT NOT NULL DEFAULT 0,
  failed_rows INT NOT NULL DEFAULT 0,
  skipped_rows INT NOT NULL DEFAULT 0,
  duplicate_strategy TEXT NOT NULL DEFAULT 'skip' CHECK (duplicate_strategy IN ('skip','update','replace','create_new')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT bulk_import_jobs_owner_check CHECK (created_by IS NOT NULL OR admin_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.bulk_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.bulk_import_jobs(id) ON DELETE CASCADE,
  row_number INT NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','skipped','duplicate')),
  duplicate_of_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  duplicate_reason TEXT CHECK (duplicate_reason IN ('title_city_price','reference_id','rera_number','mobile') OR duplicate_reason IS NULL),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, row_number)
);

CREATE TABLE IF NOT EXISTS public.bulk_import_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.bulk_import_jobs(id) ON DELETE CASCADE,
  row_id UUID REFERENCES public.bulk_import_rows(id) ON DELETE CASCADE,
  row_number INT NOT NULL,
  field TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bulk_import_rows_job ON public.bulk_import_rows(job_id);
CREATE INDEX IF NOT EXISTS idx_bulk_import_errors_job ON public.bulk_import_errors(job_id);
CREATE INDEX IF NOT EXISTS idx_bulk_import_jobs_created_by ON public.bulk_import_jobs(created_by);

DROP TRIGGER IF EXISTS trg_bulk_import_jobs_updated_at ON public.bulk_import_jobs;
CREATE TRIGGER trg_bulk_import_jobs_updated_at BEFORE UPDATE ON public.bulk_import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_dynamic_engine_updated_at();

ALTER TABLE public.bulk_import_jobs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_import_rows   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_import_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bulk_import_jobs_rw" ON public.bulk_import_jobs;
CREATE POLICY "bulk_import_jobs_rw" ON public.bulk_import_jobs
  FOR ALL TO authenticated
  USING (auth.uid() = created_by OR public.is_staff())
  WITH CHECK (auth.uid() = created_by OR public.is_staff());

DROP POLICY IF EXISTS "bulk_import_rows_rw" ON public.bulk_import_rows;
CREATE POLICY "bulk_import_rows_rw" ON public.bulk_import_rows
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bulk_import_jobs j WHERE j.id = job_id AND (j.created_by = auth.uid() OR public.is_staff())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bulk_import_jobs j WHERE j.id = job_id AND (j.created_by = auth.uid() OR public.is_staff())));

DROP POLICY IF EXISTS "bulk_import_errors_rw" ON public.bulk_import_errors;
CREATE POLICY "bulk_import_errors_rw" ON public.bulk_import_errors
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bulk_import_jobs j WHERE j.id = job_id AND (j.created_by = auth.uid() OR public.is_staff())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bulk_import_jobs j WHERE j.id = job_id AND (j.created_by = auth.uid() OR public.is_staff())));

GRANT ALL ON public.bulk_import_jobs, public.bulk_import_rows, public.bulk_import_errors TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bulk_import_jobs; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

/*
  Master Applications CRM Migration
  Extends the Agent and Builder Applications to support a full CRM workflow.
*/

-- ==========================================
-- 1. Extend Status Check Constraints
-- ==========================================

DO $$
DECLARE
  con record;
BEGIN
  -- Drop all check constraints on agent_applications.status
  FOR con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.agent_applications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    EXECUTE 'ALTER TABLE public.agent_applications DROP CONSTRAINT ' || quote_ident(con.conname);
  END LOOP;

  -- Drop all check constraints on builder_applications.status
  FOR con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.builder_applications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    EXECUTE 'ALTER TABLE public.builder_applications DROP CONSTRAINT ' || quote_ident(con.conname);
  END LOOP;
END $$;

-- Update existing 'pending' to 'pending_review'
UPDATE public.agent_applications SET status = 'pending_review' WHERE status = 'pending';
UPDATE public.builder_applications SET status = 'pending_review' WHERE status = 'pending';

-- Add new constraints
ALTER TABLE public.agent_applications
  ADD CONSTRAINT agent_applications_status_check
  CHECK (status IN (
    'submitted',
    'pending_review',
    'document_verification',
    'identity_verification',
    'rera_verification',
    'background_verification',
    'final_review',
    'approved',
    'rejected'
  ));

ALTER TABLE public.builder_applications
  ADD CONSTRAINT builder_applications_status_check
  CHECK (status IN (
    'submitted',
    'pending_review',
    'document_verification',
    'identity_verification',
    'rera_verification',
    'background_verification',
    'final_review',
    'approved',
    'rejected'
  ));

-- ==========================================
-- 2. Add CRM Tracking Fields
-- ==========================================

ALTER TABLE public.agent_applications
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS admin_remarks TEXT,
  ADD COLUMN IF NOT EXISTS verification_timeline JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.builder_applications
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS admin_remarks TEXT,
  ADD COLUMN IF NOT EXISTS verification_timeline JSONB DEFAULT '[]'::jsonb;

-- ==========================================
-- 3. Application Activity Logs Table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.application_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  application_type text NOT NULL CHECK (application_type IN ('agent', 'builder')),
  action text NOT NULL,
  details text,
  admin_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.application_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_logs" ON public.application_activity_logs;
CREATE POLICY "admin_all_logs" ON public.application_activity_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

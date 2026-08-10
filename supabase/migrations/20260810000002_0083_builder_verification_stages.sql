-- ============================================================
-- Migration 0083: Builder Applications — Extended Verification Stages
-- Adds builder-specific verification stages to status constraint
-- ============================================================

-- 1. Drop existing check constraints on builder_applications.status
DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.builder_applications'::regclass
      AND contype = 'c'
      AND conname LIKE '%status%'
  LOOP
    EXECUTE 'ALTER TABLE public.builder_applications DROP CONSTRAINT ' || quote_ident(con.conname);
  END LOOP;
END $$;

-- 2. Migrate any old 'pending' values
UPDATE public.builder_applications
SET status = 'pending_review'
WHERE status = 'pending';

-- 3. Add new constraint with builder-specific verification stages
ALTER TABLE public.builder_applications
  ADD CONSTRAINT builder_applications_status_check
  CHECK (status IN (
    'submitted',
    'pending_review',
    'document_verification',
    'company_verification',       -- Builder-specific: verify company/business identity
    'rera_verification',
    'project_verification',       -- Builder-specific: verify listed projects
    'background_verification',
    'final_review',
    'approved',
    'rejected',
    'changes_requested'
  ));

-- 4. Also update agent_applications constraint to include changes_requested
DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.agent_applications'::regclass
      AND contype = 'c'
      AND conname LIKE '%status%'
  LOOP
    EXECUTE 'ALTER TABLE public.agent_applications DROP CONSTRAINT ' || quote_ident(con.conname);
  END LOOP;
END $$;

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
    'rejected',
    'changes_requested'
  ));

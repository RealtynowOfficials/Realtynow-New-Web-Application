-- Migration: 20260831174000_0137_fix_agent_referral_delete_cascade.sql
-- Description: Fix trigger fn_sync_property_agent_id to support ON DELETE SET NULL on referrals and properties

CREATE OR REPLACE FUNCTION public.fn_sync_property_agent_id()
RETURNS TRIGGER AS $$
BEGIN
  -- When updating (including foreign key ON DELETE SET NULL actions):
  IF TG_OP = 'UPDATE' THEN
    -- If agent_id was cleared to NULL, also clear assigned_agent_id
    IF OLD.agent_id IS NOT NULL AND NEW.agent_id IS NULL THEN
      NEW.assigned_agent_id := NULL;
    -- If assigned_agent_id was cleared to NULL, also clear agent_id
    ELSIF OLD.assigned_agent_id IS NOT NULL AND NEW.assigned_agent_id IS NULL THEN
      NEW.agent_id := NULL;
    -- Otherwise synchronize values if one is populated
    ELSIF NEW.agent_id IS NOT NULL AND NEW.assigned_agent_id IS NULL THEN
      NEW.assigned_agent_id := NEW.agent_id;
    ELSIF NEW.assigned_agent_id IS NOT NULL AND NEW.agent_id IS NULL THEN
      NEW.agent_id := NEW.assigned_agent_id;
    END IF;
  ELSE
    -- On INSERT:
    IF NEW.agent_id IS NOT NULL AND NEW.assigned_agent_id IS NULL THEN
      NEW.assigned_agent_id := NEW.agent_id;
    ELSIF NEW.assigned_agent_id IS NOT NULL AND NEW.agent_id IS NULL THEN
      NEW.agent_id := NEW.assigned_agent_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure foreign keys on referrals have ON DELETE SET NULL
DO $$
BEGIN
  ALTER TABLE IF EXISTS public.referrals 
    DROP CONSTRAINT IF EXISTS referrals_assigned_agent_id_fkey,
    ADD CONSTRAINT referrals_assigned_agent_id_fkey 
      FOREIGN KEY (assigned_agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE IF EXISTS public.referrals 
    DROP CONSTRAINT IF EXISTS referrals_agent_id_fkey,
    ADD CONSTRAINT referrals_agent_id_fkey 
      FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- =============================================================================
-- Migration: 20260806000002_0077_agent_ecosystem_schema.sql
-- Description: Extends the Agent Portal into a full ecosystem — negotiations,
-- documents, tasks. Leads/clients/site-visits/commissions/communication reuse
-- existing enquiries/appointments/visits/commissions/wallets schema. Additive only.
-- =============================================================================

-- ============================================================
-- 1. agent_negotiations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agent_negotiations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id         UUID NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  property_id     UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  round_number    INT NOT NULL DEFAULT 1,
  offer_amount    NUMERIC(15,2) NOT NULL,
  counter_amount  NUMERIC(15,2),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'countered', 'accepted', 'rejected', 'withdrawn')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_negotiations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_negotiations_select" ON public.agent_negotiations;
CREATE POLICY "agent_negotiations_select" ON public.agent_negotiations
  FOR SELECT TO authenticated USING (auth.uid() = agent_id OR public.is_staff());

DROP POLICY IF EXISTS "agent_negotiations_insert" ON public.agent_negotiations;
CREATE POLICY "agent_negotiations_insert" ON public.agent_negotiations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id);

DROP POLICY IF EXISTS "agent_negotiations_update" ON public.agent_negotiations;
CREATE POLICY "agent_negotiations_update" ON public.agent_negotiations
  FOR UPDATE TO authenticated USING (auth.uid() = agent_id) WITH CHECK (auth.uid() = agent_id);

DROP POLICY IF EXISTS "agent_negotiations_delete" ON public.agent_negotiations;
CREATE POLICY "agent_negotiations_delete" ON public.agent_negotiations
  FOR DELETE TO authenticated USING (auth.uid() = agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_negotiations_agent ON public.agent_negotiations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_negotiations_lead ON public.agent_negotiations(lead_id);

-- ============================================================
-- 2. agent_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agent_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES public.enquiries(id) ON DELETE SET NULL,
  property_id     UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  category        TEXT NOT NULL DEFAULT 'general',
  title           TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_path       TEXT,
  visibility      TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'client', 'public')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_documents_select" ON public.agent_documents;
CREATE POLICY "agent_documents_select" ON public.agent_documents
  FOR SELECT TO authenticated USING (auth.uid() = agent_id OR public.is_staff());

DROP POLICY IF EXISTS "agent_documents_insert" ON public.agent_documents;
CREATE POLICY "agent_documents_insert" ON public.agent_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id);

DROP POLICY IF EXISTS "agent_documents_update" ON public.agent_documents;
CREATE POLICY "agent_documents_update" ON public.agent_documents
  FOR UPDATE TO authenticated USING (auth.uid() = agent_id) WITH CHECK (auth.uid() = agent_id);

DROP POLICY IF EXISTS "agent_documents_delete" ON public.agent_documents;
CREATE POLICY "agent_documents_delete" ON public.agent_documents
  FOR DELETE TO authenticated USING (auth.uid() = agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_documents_agent ON public.agent_documents(agent_id);

-- ============================================================
-- 3. agent_tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  due_date            DATE,
  priority            TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  related_lead_id     UUID REFERENCES public.enquiries(id) ON DELETE SET NULL,
  related_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_tasks_select" ON public.agent_tasks;
CREATE POLICY "agent_tasks_select" ON public.agent_tasks
  FOR SELECT TO authenticated USING (auth.uid() = agent_id OR public.is_staff());

DROP POLICY IF EXISTS "agent_tasks_insert" ON public.agent_tasks;
CREATE POLICY "agent_tasks_insert" ON public.agent_tasks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id);

DROP POLICY IF EXISTS "agent_tasks_update" ON public.agent_tasks;
CREATE POLICY "agent_tasks_update" ON public.agent_tasks
  FOR UPDATE TO authenticated USING (auth.uid() = agent_id) WITH CHECK (auth.uid() = agent_id);

DROP POLICY IF EXISTS "agent_tasks_delete" ON public.agent_tasks;
CREATE POLICY "agent_tasks_delete" ON public.agent_tasks
  FOR DELETE TO authenticated USING (auth.uid() = agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent ON public.agent_tasks(agent_id);

-- ============================================================
-- 4. Enable Realtime
-- ============================================================
ALTER TABLE public.agent_negotiations REPLICA IDENTITY FULL;
ALTER TABLE public.agent_documents REPLICA IDENTITY FULL;
ALTER TABLE public.agent_tasks REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_negotiations; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_documents; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_tasks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

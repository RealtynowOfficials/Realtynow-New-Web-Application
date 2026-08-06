-- =============================================================================
-- Migration: 20260806000000_0075_builder_portal_schema.sql
-- Description: Isolated ecosystem for Builder Portal (Projects, Towers, Units, Leads)
-- =============================================================================

-- ============================================================
-- 1. builder_projects
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  rera_id         TEXT,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed')),
  city_id         UUID REFERENCES public.cities(id),
  locality_id     UUID REFERENCES public.localities(id),
  cover_image     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_projects_select" ON public.builder_projects
  FOR SELECT TO authenticated USING (auth.uid() = builder_id OR public.is_staff());

CREATE POLICY "builder_projects_insert" ON public.builder_projects
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = builder_id);

CREATE POLICY "builder_projects_update" ON public.builder_projects
  FOR UPDATE TO authenticated USING (auth.uid() = builder_id) WITH CHECK (auth.uid() = builder_id);

CREATE POLICY "builder_projects_delete" ON public.builder_projects
  FOR DELETE TO authenticated USING (auth.uid() = builder_id);

CREATE INDEX IF NOT EXISTS idx_builder_projects_builder ON public.builder_projects(builder_id);

-- ============================================================
-- 2. builder_towers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_towers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.builder_projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  total_floors    INT NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'under_construction', 'ready')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_towers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_towers_select" ON public.builder_towers
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid()) OR public.is_staff()
  );

CREATE POLICY "builder_towers_insert" ON public.builder_towers
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid())
  );

CREATE POLICY "builder_towers_update" ON public.builder_towers
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid())
  );

CREATE POLICY "builder_towers_delete" ON public.builder_towers
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_builder_towers_project ON public.builder_towers(project_id);

-- ============================================================
-- 3. builder_units
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_units (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tower_id        UUID NOT NULL REFERENCES public.builder_towers(id) ON DELETE CASCADE,
  unit_number     TEXT NOT NULL,
  type            TEXT NOT NULL, -- e.g., '2BHK', '3BHK'
  size_sqft       NUMERIC(10,2),
  price           NUMERIC(15,2),
  status          TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'sold')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_units_select" ON public.builder_units
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.builder_towers t
      JOIN public.builder_projects p ON t.project_id = p.id
      WHERE t.id = tower_id AND p.builder_id = auth.uid()
    ) OR public.is_staff()
  );

CREATE POLICY "builder_units_insert" ON public.builder_units
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.builder_towers t
      JOIN public.builder_projects p ON t.project_id = p.id
      WHERE t.id = tower_id AND p.builder_id = auth.uid()
    )
  );

CREATE POLICY "builder_units_update" ON public.builder_units
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.builder_towers t
      JOIN public.builder_projects p ON t.project_id = p.id
      WHERE t.id = tower_id AND p.builder_id = auth.uid()
    )
  );

CREATE POLICY "builder_units_delete" ON public.builder_units
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.builder_towers t
      JOIN public.builder_projects p ON t.project_id = p.id
      WHERE t.id = tower_id AND p.builder_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_builder_units_tower ON public.builder_units(tower_id);

-- ============================================================
-- 4. builder_leads (Isolated CRM for Builders)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES public.builder_projects(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'site_visit', 'negotiation', 'won', 'lost', 'closed')),
  message         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_leads_select" ON public.builder_leads
  FOR SELECT TO authenticated USING (auth.uid() = builder_id OR public.is_staff());

CREATE POLICY "builder_leads_insert" ON public.builder_leads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = builder_id);

CREATE POLICY "builder_leads_update" ON public.builder_leads
  FOR UPDATE TO authenticated USING (auth.uid() = builder_id) WITH CHECK (auth.uid() = builder_id);

CREATE POLICY "builder_leads_delete" ON public.builder_leads
  FOR DELETE TO authenticated USING (auth.uid() = builder_id);

CREATE INDEX IF NOT EXISTS idx_builder_leads_builder ON public.builder_leads(builder_id);

-- ============================================================
-- 5. Enable Realtime
-- ============================================================
ALTER TABLE public.builder_projects REPLICA IDENTITY FULL;
ALTER TABLE public.builder_towers REPLICA IDENTITY FULL;
ALTER TABLE public.builder_units REPLICA IDENTITY FULL;
ALTER TABLE public.builder_leads REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_projects; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_towers; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_units; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_leads; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

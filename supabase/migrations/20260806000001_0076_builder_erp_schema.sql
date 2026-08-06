-- =============================================================================
-- Migration: 20260806000001_0076_builder_erp_schema.sql
-- Description: Extends the Builder Portal (0075) into a full ERP — floors,
-- pricing, bookings, customers, agents, CRM activity, construction, payments,
-- invoices, documents, floor plans, gallery, marketing. Additive only.
-- =============================================================================

-- ============================================================
-- 1. builder_floors (+ floor_id on builder_units)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_floors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tower_id        UUID NOT NULL REFERENCES public.builder_towers(id) ON DELETE CASCADE,
  floor_number    INT NOT NULL,
  name            TEXT,
  status          TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'under_construction', 'ready')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_floors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_floors_select" ON public.builder_floors
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_towers t JOIN public.builder_projects p ON t.project_id = p.id WHERE t.id = tower_id AND p.builder_id = auth.uid()) OR public.is_staff()
  );
CREATE POLICY "builder_floors_insert" ON public.builder_floors
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.builder_towers t JOIN public.builder_projects p ON t.project_id = p.id WHERE t.id = tower_id AND p.builder_id = auth.uid())
  );
CREATE POLICY "builder_floors_update" ON public.builder_floors
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_towers t JOIN public.builder_projects p ON t.project_id = p.id WHERE t.id = tower_id AND p.builder_id = auth.uid())
  );
CREATE POLICY "builder_floors_delete" ON public.builder_floors
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_towers t JOIN public.builder_projects p ON t.project_id = p.id WHERE t.id = tower_id AND p.builder_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_builder_floors_tower ON public.builder_floors(tower_id);

ALTER TABLE public.builder_units ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES public.builder_floors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_builder_units_floor ON public.builder_units(floor_id);

-- ============================================================
-- 2. builder_pricing_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_pricing_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.builder_projects(id) ON DELETE CASCADE,
  tower_id        UUID REFERENCES public.builder_towers(id) ON DELETE SET NULL,
  unit_type       TEXT NOT NULL,
  base_price      NUMERIC(15,2) NOT NULL,
  price_per_sqft  NUMERIC(12,2),
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  effective_from  DATE NOT NULL DEFAULT current_date,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_pricing_rules_select" ON public.builder_pricing_rules
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid()) OR public.is_staff()
  );
CREATE POLICY "builder_pricing_rules_insert" ON public.builder_pricing_rules
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid())
  );
CREATE POLICY "builder_pricing_rules_update" ON public.builder_pricing_rules
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid())
  );
CREATE POLICY "builder_pricing_rules_delete" ON public.builder_pricing_rules
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_builder_pricing_rules_project ON public.builder_pricing_rules(project_id);

-- ============================================================
-- 3. builder_customers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES public.builder_leads(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  kyc_doc_url     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_customers_select" ON public.builder_customers
  FOR SELECT TO authenticated USING (auth.uid() = builder_id OR public.is_staff());
CREATE POLICY "builder_customers_insert" ON public.builder_customers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = builder_id);
CREATE POLICY "builder_customers_update" ON public.builder_customers
  FOR UPDATE TO authenticated USING (auth.uid() = builder_id) WITH CHECK (auth.uid() = builder_id);
CREATE POLICY "builder_customers_delete" ON public.builder_customers
  FOR DELETE TO authenticated USING (auth.uid() = builder_id);

CREATE INDEX IF NOT EXISTS idx_builder_customers_builder ON public.builder_customers(builder_id);

-- ============================================================
-- 4. builder_bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id         UUID NOT NULL REFERENCES public.builder_units(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES public.builder_customers(id) ON DELETE SET NULL,
  lead_id         UUID REFERENCES public.builder_leads(id) ON DELETE SET NULL,
  booking_date    DATE NOT NULL DEFAULT current_date,
  amount          NUMERIC(15,2),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_bookings_select" ON public.builder_bookings
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.builder_units u
      JOIN public.builder_towers t ON u.tower_id = t.id
      JOIN public.builder_projects p ON t.project_id = p.id
      WHERE u.id = unit_id AND p.builder_id = auth.uid()
    ) OR public.is_staff()
  );
CREATE POLICY "builder_bookings_insert" ON public.builder_bookings
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.builder_units u
      JOIN public.builder_towers t ON u.tower_id = t.id
      JOIN public.builder_projects p ON t.project_id = p.id
      WHERE u.id = unit_id AND p.builder_id = auth.uid()
    )
  );
CREATE POLICY "builder_bookings_update" ON public.builder_bookings
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.builder_units u
      JOIN public.builder_towers t ON u.tower_id = t.id
      JOIN public.builder_projects p ON t.project_id = p.id
      WHERE u.id = unit_id AND p.builder_id = auth.uid()
    )
  );
CREATE POLICY "builder_bookings_delete" ON public.builder_bookings
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.builder_units u
      JOIN public.builder_towers t ON u.tower_id = t.id
      JOIN public.builder_projects p ON t.project_id = p.id
      WHERE u.id = unit_id AND p.builder_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_builder_bookings_unit ON public.builder_bookings(unit_id);
CREATE INDEX IF NOT EXISTS idx_builder_bookings_customer ON public.builder_bookings(customer_id);

-- ============================================================
-- 5. builder_agents + builder_project_agents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_agents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_profile_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  email               TEXT,
  phone               TEXT,
  commission_percent  NUMERIC(5,2),
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_agents_select" ON public.builder_agents
  FOR SELECT TO authenticated USING (auth.uid() = builder_id OR public.is_staff());
CREATE POLICY "builder_agents_insert" ON public.builder_agents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = builder_id);
CREATE POLICY "builder_agents_update" ON public.builder_agents
  FOR UPDATE TO authenticated USING (auth.uid() = builder_id) WITH CHECK (auth.uid() = builder_id);
CREATE POLICY "builder_agents_delete" ON public.builder_agents
  FOR DELETE TO authenticated USING (auth.uid() = builder_id);

CREATE INDEX IF NOT EXISTS idx_builder_agents_builder ON public.builder_agents(builder_id);

CREATE TABLE IF NOT EXISTS public.builder_project_agents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.builder_projects(id) ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES public.builder_agents(id) ON DELETE CASCADE,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, agent_id)
);

ALTER TABLE public.builder_project_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_project_agents_select" ON public.builder_project_agents
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid()) OR public.is_staff()
  );
CREATE POLICY "builder_project_agents_insert" ON public.builder_project_agents
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid())
  );
CREATE POLICY "builder_project_agents_delete" ON public.builder_project_agents
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_builder_project_agents_project ON public.builder_project_agents(project_id);
CREATE INDEX IF NOT EXISTS idx_builder_project_agents_agent ON public.builder_project_agents(agent_id);

-- ============================================================
-- 6. builder_lead_activities (CRM timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_lead_activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES public.builder_leads(id) ON DELETE CASCADE,
  builder_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type   TEXT NOT NULL DEFAULT 'note' CHECK (activity_type IN ('note', 'call', 'email', 'meeting', 'site_visit', 'status_change')),
  notes           TEXT,
  activity_date   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_lead_activities_select" ON public.builder_lead_activities
  FOR SELECT TO authenticated USING (auth.uid() = builder_id OR public.is_staff());
CREATE POLICY "builder_lead_activities_insert" ON public.builder_lead_activities
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = builder_id);
CREATE POLICY "builder_lead_activities_update" ON public.builder_lead_activities
  FOR UPDATE TO authenticated USING (auth.uid() = builder_id) WITH CHECK (auth.uid() = builder_id);
CREATE POLICY "builder_lead_activities_delete" ON public.builder_lead_activities
  FOR DELETE TO authenticated USING (auth.uid() = builder_id);

CREATE INDEX IF NOT EXISTS idx_builder_lead_activities_lead ON public.builder_lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_builder_lead_activities_builder ON public.builder_lead_activities(builder_id);

-- ============================================================
-- 7. builder_construction_milestones
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_construction_milestones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.builder_projects(id) ON DELETE CASCADE,
  tower_id          UUID REFERENCES public.builder_towers(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  planned_date      DATE,
  actual_date       DATE,
  percent_complete  INT NOT NULL DEFAULT 0 CHECK (percent_complete BETWEEN 0 AND 100),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
  photo_urls        TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_construction_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_construction_milestones_select" ON public.builder_construction_milestones
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid()) OR public.is_staff()
  );
CREATE POLICY "builder_construction_milestones_insert" ON public.builder_construction_milestones
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid())
  );
CREATE POLICY "builder_construction_milestones_update" ON public.builder_construction_milestones
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid())
  );
CREATE POLICY "builder_construction_milestones_delete" ON public.builder_construction_milestones
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_builder_construction_milestones_project ON public.builder_construction_milestones(project_id);

-- ============================================================
-- 8. builder_payments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES public.builder_bookings(id) ON DELETE CASCADE,
  amount          NUMERIC(15,2) NOT NULL,
  due_date        DATE,
  paid_date       DATE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
  payment_mode    TEXT,
  reference_no    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_payments_select" ON public.builder_payments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.builder_bookings b
      JOIN public.builder_units u ON b.unit_id = u.id
      JOIN public.builder_towers t ON u.tower_id = t.id
      JOIN public.builder_projects p ON t.project_id = p.id
      WHERE b.id = booking_id AND p.builder_id = auth.uid()
    ) OR public.is_staff()
  );
CREATE POLICY "builder_payments_insert" ON public.builder_payments
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.builder_bookings b
      JOIN public.builder_units u ON b.unit_id = u.id
      JOIN public.builder_towers t ON u.tower_id = t.id
      JOIN public.builder_projects p ON t.project_id = p.id
      WHERE b.id = booking_id AND p.builder_id = auth.uid()
    )
  );
CREATE POLICY "builder_payments_update" ON public.builder_payments
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.builder_bookings b
      JOIN public.builder_units u ON b.unit_id = u.id
      JOIN public.builder_towers t ON u.tower_id = t.id
      JOIN public.builder_projects p ON t.project_id = p.id
      WHERE b.id = booking_id AND p.builder_id = auth.uid()
    )
  );
CREATE POLICY "builder_payments_delete" ON public.builder_payments
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.builder_bookings b
      JOIN public.builder_units u ON b.unit_id = u.id
      JOIN public.builder_towers t ON u.tower_id = t.id
      JOIN public.builder_projects p ON t.project_id = p.id
      WHERE b.id = booking_id AND p.builder_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_builder_payments_booking ON public.builder_payments(booking_id);

-- ============================================================
-- 9. builder_invoices
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id      UUID REFERENCES public.builder_bookings(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES public.builder_customers(id) ON DELETE SET NULL,
  invoice_number  TEXT NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(15,2),
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date        DATE,
  issued_date     DATE NOT NULL DEFAULT current_date,
  pdf_url         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (builder_id, invoice_number)
);

ALTER TABLE public.builder_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_invoices_select" ON public.builder_invoices
  FOR SELECT TO authenticated USING (auth.uid() = builder_id OR public.is_staff());
CREATE POLICY "builder_invoices_insert" ON public.builder_invoices
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = builder_id);
CREATE POLICY "builder_invoices_update" ON public.builder_invoices
  FOR UPDATE TO authenticated USING (auth.uid() = builder_id) WITH CHECK (auth.uid() = builder_id);
CREATE POLICY "builder_invoices_delete" ON public.builder_invoices
  FOR DELETE TO authenticated USING (auth.uid() = builder_id);

CREATE INDEX IF NOT EXISTS idx_builder_invoices_builder ON public.builder_invoices(builder_id);

-- ============================================================
-- 10. builder_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES public.builder_projects(id) ON DELETE SET NULL,
  category        TEXT NOT NULL DEFAULT 'general',
  title           TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_path       TEXT,
  visibility      TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'customers', 'public')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_documents_select" ON public.builder_documents
  FOR SELECT TO authenticated USING (auth.uid() = builder_id OR public.is_staff());
CREATE POLICY "builder_documents_insert" ON public.builder_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = builder_id);
CREATE POLICY "builder_documents_update" ON public.builder_documents
  FOR UPDATE TO authenticated USING (auth.uid() = builder_id) WITH CHECK (auth.uid() = builder_id);
CREATE POLICY "builder_documents_delete" ON public.builder_documents
  FOR DELETE TO authenticated USING (auth.uid() = builder_id);

CREATE INDEX IF NOT EXISTS idx_builder_documents_builder ON public.builder_documents(builder_id);

-- ============================================================
-- 11. builder_floor_plans
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_floor_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.builder_projects(id) ON DELETE CASCADE,
  tower_id        UUID REFERENCES public.builder_towers(id) ON DELETE SET NULL,
  unit_type       TEXT,
  name            TEXT NOT NULL,
  image_url       TEXT NOT NULL,
  size_sqft       NUMERIC(10,2),
  bedrooms        INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_floor_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_floor_plans_select" ON public.builder_floor_plans
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid()) OR public.is_staff()
  );
CREATE POLICY "builder_floor_plans_insert" ON public.builder_floor_plans
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid())
  );
CREATE POLICY "builder_floor_plans_update" ON public.builder_floor_plans
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid())
  );
CREATE POLICY "builder_floor_plans_delete" ON public.builder_floor_plans
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_builder_floor_plans_project ON public.builder_floor_plans(project_id);

-- ============================================================
-- 12. builder_media_gallery
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_media_gallery (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.builder_projects(id) ON DELETE CASCADE,
  media_url       TEXT NOT NULL,
  media_type      TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  caption         TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_media_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_media_gallery_select" ON public.builder_media_gallery
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid()) OR public.is_staff()
  );
CREATE POLICY "builder_media_gallery_insert" ON public.builder_media_gallery
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid())
  );
CREATE POLICY "builder_media_gallery_update" ON public.builder_media_gallery
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid())
  );
CREATE POLICY "builder_media_gallery_delete" ON public.builder_media_gallery
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.builder_projects p WHERE p.id = project_id AND p.builder_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_builder_media_gallery_project ON public.builder_media_gallery(project_id);

-- ============================================================
-- 13. builder_marketing_campaigns
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_marketing_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES public.builder_projects(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  channel         TEXT NOT NULL DEFAULT 'social' CHECK (channel IN ('social', 'email', 'sms', 'print', 'other')),
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'paused')),
  content         TEXT,
  budget          NUMERIC(12,2),
  start_date      DATE,
  end_date        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_marketing_campaigns_select" ON public.builder_marketing_campaigns
  FOR SELECT TO authenticated USING (auth.uid() = builder_id OR public.is_staff());
CREATE POLICY "builder_marketing_campaigns_insert" ON public.builder_marketing_campaigns
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = builder_id);
CREATE POLICY "builder_marketing_campaigns_update" ON public.builder_marketing_campaigns
  FOR UPDATE TO authenticated USING (auth.uid() = builder_id) WITH CHECK (auth.uid() = builder_id);
CREATE POLICY "builder_marketing_campaigns_delete" ON public.builder_marketing_campaigns
  FOR DELETE TO authenticated USING (auth.uid() = builder_id);

CREATE INDEX IF NOT EXISTS idx_builder_marketing_campaigns_builder ON public.builder_marketing_campaigns(builder_id);

-- ============================================================
-- 14. audit_logs: allow builders to read back their own entries
-- ============================================================
DROP POLICY IF EXISTS "audit_logs_own_select" ON public.audit_logs;
CREATE POLICY "audit_logs_own_select" ON public.audit_logs
  FOR SELECT TO authenticated USING (actor_id = auth.uid());

-- ============================================================
-- 15. profiles: builder company logo (additive)
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- ============================================================
-- 16. Storage buckets for documents & media
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('builder-documents', 'builder-documents', false),
  ('builder-media', 'builder-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth_rw_builder_documents" ON storage.objects;
CREATE POLICY "auth_rw_builder_documents" ON storage.objects FOR ALL
  TO authenticated USING (bucket_id = 'builder-documents') WITH CHECK (bucket_id = 'builder-documents');

DROP POLICY IF EXISTS "public_read_builder_media" ON storage.objects;
CREATE POLICY "public_read_builder_media" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'builder-media');

DROP POLICY IF EXISTS "auth_upload_builder_media" ON storage.objects;
CREATE POLICY "auth_upload_builder_media" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'builder-media');

DROP POLICY IF EXISTS "auth_update_builder_media" ON storage.objects;
CREATE POLICY "auth_update_builder_media" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'builder-media');

DROP POLICY IF EXISTS "auth_delete_builder_media" ON storage.objects;
CREATE POLICY "auth_delete_builder_media" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'builder-media');

-- ============================================================
-- 17. Enable Realtime on all new tables
-- ============================================================
ALTER TABLE public.builder_floors REPLICA IDENTITY FULL;
ALTER TABLE public.builder_pricing_rules REPLICA IDENTITY FULL;
ALTER TABLE public.builder_customers REPLICA IDENTITY FULL;
ALTER TABLE public.builder_bookings REPLICA IDENTITY FULL;
ALTER TABLE public.builder_agents REPLICA IDENTITY FULL;
ALTER TABLE public.builder_project_agents REPLICA IDENTITY FULL;
ALTER TABLE public.builder_lead_activities REPLICA IDENTITY FULL;
ALTER TABLE public.builder_construction_milestones REPLICA IDENTITY FULL;
ALTER TABLE public.builder_payments REPLICA IDENTITY FULL;
ALTER TABLE public.builder_invoices REPLICA IDENTITY FULL;
ALTER TABLE public.builder_documents REPLICA IDENTITY FULL;
ALTER TABLE public.builder_floor_plans REPLICA IDENTITY FULL;
ALTER TABLE public.builder_media_gallery REPLICA IDENTITY FULL;
ALTER TABLE public.builder_marketing_campaigns REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_floors; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_pricing_rules; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_customers; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_bookings; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_agents; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_project_agents; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_lead_activities; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_construction_milestones; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_payments; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_invoices; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_documents; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_floor_plans; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_media_gallery; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_marketing_campaigns; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

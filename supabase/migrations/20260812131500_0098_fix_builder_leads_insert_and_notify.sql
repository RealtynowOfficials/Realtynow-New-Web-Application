/*
  Fix: builder_leads had a full Kanban/CRM UI (src/pages/builder/leads.tsx,
  BuilderKanbanBoard) but was a structurally dead table — nothing could ever
  insert into it in production.

  Root cause: the only INSERT policy was
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = builder_id)
  which only lets a builder insert a row where THEY are the builder — i.e.
  only a builder could create a "lead about their own project", which makes
  no product sense. A real lead is created by a prospective customer (often
  anonymous), who is never the builder, so auth.uid() = builder_id could
  never be true for an actual enquiry. No customer-facing contact form
  existed either, compounding the gap.

  Fix:
  1. Replace the INSERT policy with one that allows anon/authenticated
     submission (matching the public.enquiries pattern used for the agent
     lead-capture flow), while still validating that builder_id actually
     refers to an active builder profile (so garbage/forged ids can't create
     orphaned rows).
  2. Add a notify trigger mirroring fn_notify_agent_on_enquiry, so the
     builder is actually told a new lead arrived.
*/

DROP POLICY IF EXISTS "builder_leads_insert" ON public.builder_leads;
CREATE POLICY "builder_leads_insert" ON public.builder_leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = builder_id AND role = 'builder' AND status = 'active'
    )
  );

CREATE OR REPLACE FUNCTION public.fn_notify_builder_on_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_user(
    NEW.builder_id,
    'lead',
    'New enquiry received',
    COALESCE(NEW.name, 'A visitor') || ' is interested in your project.',
    '/builder/leads'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_builder_lead_created ON public.builder_leads;
CREATE TRIGGER on_builder_lead_created
  AFTER INSERT ON public.builder_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_builder_on_lead();

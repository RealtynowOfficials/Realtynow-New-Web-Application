/*
  Fix: fn_notify_agent_on_enquiry() silently no-ops whenever a new enquiry has
  no agent_id — the common case for the home-loans, borewell-services, and
  static "Contact Us" lead-capture forms (none of which set agent_id), and for
  any property with no assigned_agent_id. Those leads were created with zero
  notification to anyone: not the (nonexistent) agent, and not staff either,
  so they were only discoverable by an admin manually browsing /admin/crm.

  Fix: when an enquiry arrives with no agent_id (and no assigned_to, covering
  leads later routed via fn_assign_lead before this trigger version existed),
  notify every active admin/super_admin/sales_executive so routing still
  happens promptly. verification_executive is intentionally excluded — that
  role handles KYC/document verification, not sales lead routing.
*/

CREATE OR REPLACE FUNCTION public.fn_notify_agent_on_enquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
BEGIN
  IF NEW.agent_id IS NOT NULL THEN
    PERFORM public.notify_user(
      NEW.agent_id,
      'enquiry',
      'New enquiry received',
      COALESCE(NEW.name, 'A visitor') || ' is interested in a property you manage.',
      '/agent/leads'
    );
  ELSIF NEW.assigned_to IS NOT NULL THEN
    PERFORM public.notify_user(
      NEW.assigned_to,
      'enquiry',
      'New enquiry received',
      COALESCE(NEW.name, 'A visitor') || ' is interested in a property you manage.',
      '/agent/crm'
    );
  ELSE
    FOR v_staff_id IN
      SELECT id FROM public.profiles
      WHERE role IN ('admin', 'super_admin', 'sales_executive')
        AND status = 'active'
    LOOP
      PERFORM public.notify_user(
        v_staff_id,
        'enquiry',
        'New unassigned lead',
        COALESCE(NEW.name, 'A visitor') || ' submitted an enquiry with no agent assigned. Route it from the CRM.',
        '/admin/crm'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

/*
# Enterprise Triggers, Audit Log Access, and Status History Fixes

## Overview
This migration adds database-level automation for cross-portal synchronization:
1. Auto-generates notifications when key events happen (enquiry submitted, property status changed, appointment requested).
2. Grants admin role SELECT access to audit_logs and activity_logs.
3. Fixes property_status_history to capture from_status and changed_by.
4. Adds an updated_at trigger to profiles (already exists on properties).

## Changes

### 1. Notification helper function
- `notify_user(user_id, type, title, body, link)` — inserts a row into notifications table.
  Security definer so triggers can insert regardless of RLS context.

### 2. Triggers
- `on_enquiry_created` — notifies the assigned agent when a new enquiry is submitted.
- `on_property_status_changed` — notifies the property owner when status changes (approved, rejected, published, pending_verification).
- `on_appointment_requested` — notifies the assigned agent when a customer requests an appointment.

### 3. Audit log access for admins
- Adds SELECT policies on audit_logs and activity_logs for admin role (via is_admin() function).

### 4. Status history fix
- Replaces the old status history insert logic in updatePropertyStatus with a trigger-based approach that captures from_status and changed_by automatically.
- `on_property_status_change` trigger fires AFTER UPDATE on properties when status changes.

### 5. Updated_at on profiles
- Ensures profiles.updated_at is maintained by a trigger (matching properties behavior).
*/

-- ============================================================
-- 1. Notification helper function (security definer)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (p_user_id, p_type, p_title, p_body, p_link);
END;
$$;

-- ============================================================
-- 2. Enquiry → Agent notification trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_notify_agent_on_enquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.agent_id IS NOT NULL THEN
    PERFORM public.notify_user(
      NEW.agent_id,
      'enquiry',
      'New enquiry received',
      COALESCE(NEW.name, 'A visitor') || ' is interested in a property you manage.',
      '/agent/leads'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_enquiry_created ON public.enquiries;
CREATE TRIGGER on_enquiry_created
  AFTER INSERT ON public.enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_agent_on_enquiry();

-- ============================================================
-- 3. Property status change → Owner notification + status history
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_on_property_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only act when status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Insert status history with from_status and changed_by
    INSERT INTO public.property_status_history (property_id, from_status, to_status, changed_by, reason)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NEW.rejection_reason);

    -- Notify the owner
    PERFORM public.notify_user(
      NEW.owner_id,
      'property_status',
      'Property "' || LEFT(NEW.title, 40) || '" ' ||
      CASE NEW.status
        WHEN 'approved' THEN 'has been approved'
        WHEN 'rejected' THEN 'was rejected'
        WHEN 'published' THEN 'is now live'
        WHEN 'pending_verification' THEN 'is pending verification'
        WHEN 'submitted' THEN 'has been submitted for review'
        ELSE 'status changed to ' || NEW.status
      END,
      COALESCE(NEW.rejection_reason, 'View your property for more details.'),
      '/portal/my-properties'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_property_status_change ON public.properties;
CREATE TRIGGER on_property_status_change
  AFTER UPDATE OF status ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_on_property_status_change();

-- ============================================================
-- 4. Appointment → Agent notification trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_notify_agent_on_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.agent_id IS NOT NULL AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status)) THEN
    IF NEW.status = 'requested' THEN
      PERFORM public.notify_user(
        NEW.agent_id,
        'appointment',
        'New appointment request',
        'A customer has requested a property visit.',
        '/agent/appointments'
      );
    ELSIF NEW.status = 'confirmed' THEN
      PERFORM public.notify_user(
        NEW.customer_id,
        'appointment',
        'Appointment confirmed',
        'Your appointment has been confirmed by the agent.',
        '/portal/enquiries'
      );
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM public.notify_user(
        NEW.customer_id,
        'appointment',
        'Appointment cancelled',
        'Your appointment has been cancelled.',
        '/portal/enquiries'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_appointment_change ON public.appointments;
CREATE TRIGGER on_appointment_change
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_agent_on_appointment();

-- ============================================================
-- 5. Appointment → Customer confirmation notification (INSERT)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_notify_customer_on_appointment_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    PERFORM public.notify_user(
      NEW.customer_id,
      'appointment',
      'Appointment request submitted',
      'Your appointment request has been submitted. The agent will confirm shortly.',
      '/portal/enquiries'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_appointment_insert_notify_customer ON public.appointments;
CREATE TRIGGER on_appointment_insert_notify_customer
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_customer_on_appointment_insert();

-- ============================================================
-- 6. Audit log + activity log SELECT access for admins
-- ============================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_audit_logs" ON public.audit_logs;
CREATE POLICY "admin_select_audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_activity_logs" ON public.activity_logs;
CREATE POLICY "admin_select_activity_logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 7. Review → Property owner notification trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_notify_owner_on_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  p_owner_id uuid;
BEGIN
  SELECT owner_id INTO p_owner_id FROM public.properties WHERE id = NEW.property_id;
  IF p_owner_id IS NOT NULL THEN
    PERFORM public.notify_user(
      p_owner_id,
      'review',
      'New review on your property',
      'Your property received a ' || NEW.rating || '-star review.',
      '/portal/my-properties'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_owner_on_review();

-- ============================================================
-- 8. Updated_at trigger on profiles (idempotent)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profiles_updated_at ON public.profiles;
CREATE TRIGGER on_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profiles_updated_at();

-- Create property_assignments table
CREATE TABLE IF NOT EXISTS public.property_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  previous_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  new_agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for property_assignments
ALTER TABLE public.property_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_property_assignments" ON public.property_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "agent_view_property_assignments" ON public.property_assignments
  FOR SELECT USING (
    new_agent_id = auth.uid() OR previous_agent_id = auth.uid()
  );

-- Add new columns to properties
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS change_request_reason TEXT,
ADD COLUMN IF NOT EXISTS change_requested_at TIMESTAMPTZ;

-- Update admin_assign_agent RPC
CREATE OR REPLACE FUNCTION public.admin_assign_agent(
  p_property_id UUID,
  p_agent_id UUID,
  p_admin_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_agent_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = COALESCE(p_admin_id, auth.uid()) AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can assign agents.';
  END IF;

  SELECT assigned_agent_id INTO v_old_agent_id
  FROM public.properties
  WHERE id = p_property_id;

  UPDATE public.properties
  SET
    assigned_agent_id = p_agent_id,
    updated_at = now()
  WHERE id = p_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property % not found.', p_property_id;
  END IF;

  -- Log assignment history
  INSERT INTO public.property_assignments (property_id, previous_agent_id, new_agent_id, assigned_by)
  VALUES (p_property_id, v_old_agent_id, p_agent_id, COALESCE(p_admin_id, auth.uid()));

  -- Notify assigned agent
  PERFORM public.notify_user(
    p_agent_id,
    'agent_assigned',
    'Property Assigned',
    'A new property has been assigned to you.',
    '{"property_id": "' || p_property_id || '"}'::jsonb
  );

  RETURN jsonb_build_object('success', true, 'property_id', p_property_id, 'agent_id', p_agent_id);
END;
$$;

-- Create admin_request_property_changes RPC
CREATE OR REPLACE FUNCTION public.admin_request_property_changes(
  p_property_id UUID,
  p_reason TEXT,
  p_admin_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status TEXT;
  v_owner_id UUID;
  v_agent_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = COALESCE(p_admin_id, auth.uid()) AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can request changes.';
  END IF;

  SELECT status, owner_id, assigned_agent_id INTO v_old_status, v_owner_id, v_agent_id
  FROM public.properties
  WHERE id = p_property_id;

  UPDATE public.properties
  SET
    status = 'changes_requested',
    approval_status = 'Changes Requested',
    is_live = false,
    change_request_reason = p_reason,
    change_requested_at = now(),
    updated_at = now()
  WHERE id = p_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property % not found.', p_property_id;
  END IF;

  -- The property_status_history trigger should handle the audit, but just in case we can explicitly notify
  PERFORM public.notify_user(
    v_owner_id,
    'changes_requested',
    'Changes Requested',
    'Admin has requested changes to your property listing.',
    '{"property_id": "' || p_property_id || '", "reason": "' || p_reason || '"}'::jsonb
  );
  
  IF v_agent_id IS NOT NULL THEN
    PERFORM public.notify_user(
      v_agent_id,
      'changes_requested',
      'Changes Requested',
      'Admin has requested changes to an assigned property listing.',
      '{"property_id": "' || p_property_id || '", "reason": "' || p_reason || '"}'::jsonb
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'property_id', p_property_id);
END;
$$;

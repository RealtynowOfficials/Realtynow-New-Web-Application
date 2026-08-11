-- Migration: 20260811165000_0092_production_approval_workflow.sql
-- Description: Adds provisioning_status to application tables and creates approval_audit_logs table.

-- Add provisioning_status to agent_applications
ALTER TABLE public.agent_applications 
ADD COLUMN IF NOT EXISTS provisioning_status text NOT NULL DEFAULT 'NOT_STARTED'
CHECK (provisioning_status IN ('NOT_STARTED', 'PROVISIONING', 'PROVISIONED', 'PROVISIONING_FAILED'));

-- Add provisioning_status to builder_applications
ALTER TABLE public.builder_applications 
ADD COLUMN IF NOT EXISTS provisioning_status text NOT NULL DEFAULT 'NOT_STARTED'
CHECK (provisioning_status IN ('NOT_STARTED', 'PROVISIONING', 'PROVISIONED', 'PROVISIONING_FAILED'));

-- Add provisioning_status to partner_applications
ALTER TABLE public.partner_applications 
ADD COLUMN IF NOT EXISTS provisioning_status text NOT NULL DEFAULT 'NOT_STARTED'
CHECK (provisioning_status IN ('NOT_STARTED', 'PROVISIONING', 'PROVISIONED', 'PROVISIONING_FAILED'));

-- Create approval_audit_logs table
CREATE TABLE IF NOT EXISTS public.approval_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid NOT NULL,
    application_type text NOT NULL,
    action text NOT NULL,
    performed_by uuid REFERENCES public.profiles(id),
    status text NOT NULL, -- e.g., 'SUCCESS', 'FAILED'
    error_code text,
    error_message text,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on approval_audit_logs
ALTER TABLE public.approval_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to read audit logs
DROP POLICY IF EXISTS "admin_read_audit_logs" ON public.approval_audit_logs;
CREATE POLICY "admin_read_audit_logs" ON public.approval_audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Note: Inserts into approval_audit_logs will be handled by the Edge Function using the Service Role Key, 
-- thus bypassing RLS for insertion.

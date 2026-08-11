-- Migration to add verification_state JSONB column to all application tables
-- This provides a structured source of truth for document and background checks.

ALTER TABLE public.agent_applications
ADD COLUMN IF NOT EXISTS verification_state JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.builder_applications
ADD COLUMN IF NOT EXISTS verification_state JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.partner_applications
ADD COLUMN IF NOT EXISTS verification_state JSONB DEFAULT '{}'::jsonb;

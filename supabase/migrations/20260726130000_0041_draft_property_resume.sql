-- Migration: Add Draft Property Resume & Stepper Persistence columns
-- Purpose: Support auto-saving properties with accurate step restoration.

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS current_step integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_steps integer[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS draft_data jsonb,
ADD COLUMN IF NOT EXISTS completion_percentage integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_saved_at timestamptz DEFAULT now();

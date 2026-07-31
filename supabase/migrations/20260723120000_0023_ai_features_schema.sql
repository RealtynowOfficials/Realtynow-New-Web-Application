-- Migration: 20260723120000_0023_ai_features_schema.sql
-- Description: Create tables for AI query logging, AI recommendations, and market insights history.

CREATE TABLE IF NOT EXISTS public.ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  task TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_saved_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_saved_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "ai_logs_read_own_or_admin" ON public.ai_logs;
CREATE POLICY "ai_logs_read_own_or_admin" ON public.ai_logs
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "ai_logs_insert_authenticated_or_anon" ON public.ai_logs;
CREATE POLICY "ai_logs_insert_authenticated_or_anon" ON public.ai_logs
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "ai_recommendations_owner_all" ON public.ai_saved_recommendations;
CREATE POLICY "ai_recommendations_owner_all" ON public.ai_saved_recommendations
  FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON public.ai_logs TO anon, authenticated, service_role;
GRANT ALL ON public.ai_saved_recommendations TO anon, authenticated, service_role;

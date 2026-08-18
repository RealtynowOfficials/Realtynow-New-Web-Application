-- RealtyNow Customer Support System - Phase 2 Enhancements
-- Adds contact preference, escalation details, article feedback, customer status history policy, and configurable contact settings.

-- 1. Extend support_tickets with additional tracking fields
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS contact_preference TEXT DEFAULT 'Email' CHECK (contact_preference IN ('Email', 'Phone', 'Chat'));
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS is_escalated BOOLEAN DEFAULT false;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS escalation_reason TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

-- 2. Article Feedback Table
CREATE TABLE IF NOT EXISTS public.support_article_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  helpful BOOLEAN NOT NULL,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_article_feedback_article ON public.support_article_feedback(article_id);
CREATE INDEX IF NOT EXISTS idx_support_article_feedback_user ON public.support_article_feedback(user_id);

ALTER TABLE public.support_article_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert article feedback" ON public.support_article_feedback;
CREATE POLICY "Anyone can insert article feedback" ON public.support_article_feedback
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view article feedback" ON public.support_article_feedback;
CREATE POLICY "Admins can view article feedback" ON public.support_article_feedback
  FOR SELECT TO authenticated USING (public.is_support_admin());

-- 3. Fix Customer Status History Insert Policy
DROP POLICY IF EXISTS "Customers can insert status history for own tickets" ON public.support_status_history;
CREATE POLICY "Customers can insert status history for own tickets" ON public.support_status_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = support_status_history.ticket_id AND customer_id = auth.uid()
    )
  );

-- 4. Configurable Support Contact Settings in cms_settings
INSERT INTO public.cms_settings (key, label, value, type)
VALUES 
  ('support_phone', 'Support Phone Number', '', 'text'),
  ('support_email', 'Support Email Address', '', 'text'),
  ('support_whatsapp', 'Support WhatsApp Number', '', 'text'),
  ('support_hours', 'Support Operating Hours', 'Mon - Sat: 9:00 AM - 7:00 PM IST', 'text'),
  ('live_chat_enabled', 'Enable Live Chat', 'true', 'boolean'),
  ('ticket_system_enabled', 'Enable Ticket System', 'true', 'boolean')
ON CONFLICT (key) DO NOTHING;

-- 5. Enable Realtime Publications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_status_history;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Table may already be part of publication
END
$$;

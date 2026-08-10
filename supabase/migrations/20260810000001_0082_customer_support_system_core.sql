-- RealtyNow Customer Support System - Phase 1 Migration
-- Creates core tables, relationships, RLS policies, storage buckets, and realtime configurations.

--------------------------------------------------
-- 1. TABLES
--------------------------------------------------

-- support_conversations
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ticket_id UUID, -- References support_tickets(id), added later to avoid circular dependency
  session_id TEXT,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  mode TEXT DEFAULT 'ai' CHECK (mode IN ('ai', 'human', 'hybrid')),
  started_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Assigned', 'In Progress', 'Waiting for Customer', 'Waiting for Internal Team', 'Resolved', 'Closed', 'Reopened')),
  source TEXT DEFAULT 'Customer Portal',
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_team TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  reopened_at TIMESTAMPTZ
);

-- Establish cyclic reference
ALTER TABLE public.support_conversations 
ADD CONSTRAINT fk_conversation_ticket FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE SET NULL;

-- support_messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'ai', 'admin', 'system')),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  message_type TEXT DEFAULT 'text',
  message TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- support_assignments
CREATE TABLE IF NOT EXISTS public.support_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_team TEXT,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- support_internal_notes
CREATE TABLE IF NOT EXISTS public.support_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- support_attachments
CREATE TABLE IF NOT EXISTS public.support_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.support_messages(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- support_status_history
CREATE TABLE IF NOT EXISTS public.support_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- support_canned_responses
CREATE TABLE IF NOT EXISTS public.support_canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- support_ai_logs
CREATE TABLE IF NOT EXISTS public.support_ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_message TEXT,
  ai_response TEXT,
  model TEXT,
  confidence NUMERIC,
  action TEXT,
  escalated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

--------------------------------------------------
-- 2. INDEXES
--------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_support_conversations_customer ON public.support_conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON public.support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation ON public.support_messages(conversation_id);

--------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
--------------------------------------------------

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ai_logs ENABLE ROW LEVEL SECURITY;

-- Helper to check if user is admin
CREATE OR REPLACE FUNCTION public.is_support_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'support')
  );
$$;

-- support_conversations Policies
CREATE POLICY "Customers can view own conversations" ON public.support_conversations FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Customers can insert own conversations" ON public.support_conversations FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Admins can view all conversations" ON public.support_conversations FOR SELECT USING (public.is_support_admin());
CREATE POLICY "Admins can manage conversations" ON public.support_conversations FOR ALL USING (public.is_support_admin());

-- support_tickets Policies
CREATE POLICY "Customers can view own tickets" ON public.support_tickets FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Customers can create own tickets" ON public.support_tickets FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Admins can view all tickets" ON public.support_tickets FOR SELECT USING (public.is_support_admin());
CREATE POLICY "Admins can manage tickets" ON public.support_tickets FOR ALL USING (public.is_support_admin());

-- support_messages Policies
CREATE POLICY "Customers can view own ticket messages" ON public.support_messages FOR SELECT USING (
  NOT is_internal AND (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = support_messages.ticket_id AND customer_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.support_conversations WHERE id = support_messages.conversation_id AND customer_id = auth.uid())
  )
);
CREATE POLICY "Customers can insert messages" ON public.support_messages FOR INSERT WITH CHECK (
  sender_type = 'customer' AND sender_id = auth.uid() AND NOT is_internal
);
CREATE POLICY "Admins can view all messages" ON public.support_messages FOR SELECT USING (public.is_support_admin());
CREATE POLICY "Admins can insert messages" ON public.support_messages FOR INSERT WITH CHECK (public.is_support_admin());

-- support_assignments Policies
CREATE POLICY "Admins can manage assignments" ON public.support_assignments FOR ALL USING (public.is_support_admin());

-- support_internal_notes Policies
CREATE POLICY "Admins can manage internal notes" ON public.support_internal_notes FOR ALL USING (public.is_support_admin());

-- support_attachments Policies
CREATE POLICY "Customers can view own ticket attachments" ON public.support_attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.support_tickets WHERE id = support_attachments.ticket_id AND customer_id = auth.uid())
);
CREATE POLICY "Customers can insert attachments" ON public.support_attachments FOR INSERT WITH CHECK (
  uploaded_by = auth.uid()
);
CREATE POLICY "Admins can view all attachments" ON public.support_attachments FOR SELECT USING (public.is_support_admin());
CREATE POLICY "Admins can insert attachments" ON public.support_attachments FOR INSERT WITH CHECK (public.is_support_admin());

-- support_status_history Policies
CREATE POLICY "Customers can view own status history" ON public.support_status_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.support_tickets WHERE id = support_status_history.ticket_id AND customer_id = auth.uid())
);
CREATE POLICY "Admins can view all status history" ON public.support_status_history FOR SELECT USING (public.is_support_admin());
CREATE POLICY "Admins can insert status history" ON public.support_status_history FOR INSERT WITH CHECK (public.is_support_admin());

-- support_canned_responses Policies
CREATE POLICY "Admins can manage canned responses" ON public.support_canned_responses FOR ALL USING (public.is_support_admin());

-- support_ai_logs Policies
CREATE POLICY "Admins can view ai logs" ON public.support_ai_logs FOR SELECT USING (public.is_support_admin());

--------------------------------------------------
-- 4. REALTIME
--------------------------------------------------

-- Safely add tables to existing supabase_realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_assignments;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
  ELSE
    CREATE PUBLICATION supabase_realtime FOR TABLE public.support_messages, public.support_tickets, public.support_assignments, public.support_conversations;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore duplicate table errors
END
$$;

--------------------------------------------------
-- 5. STORAGE BUCKET
--------------------------------------------------
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'support_attachments',
    'support_attachments',
    false, -- Private bucket
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  )
  ON CONFLICT (id) DO UPDATE SET 
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
END
$$;

-- Storage RLS Policies
CREATE POLICY "Customers can upload support attachments" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'support_attachments' AND auth.uid() = owner
);

CREATE POLICY "Customers can view their own support attachments" ON storage.objects FOR SELECT USING (
  bucket_id = 'support_attachments' AND auth.uid() = owner
);

CREATE POLICY "Admins can view all support attachments" ON storage.objects FOR SELECT USING (
  bucket_id = 'support_attachments' AND public.is_support_admin()
);

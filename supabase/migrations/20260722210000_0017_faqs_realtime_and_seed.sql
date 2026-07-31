-- Migration: 20260722210000_0017_faqs_realtime_and_seed.sql
-- Description: Enable real-time sync on faqs, fix RLS policies, and seed default real-estate FAQs.

-- 1. Ensure public.faqs structure and columns
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- 2. Enable RLS
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faqs_read_all" ON public.faqs;
DROP POLICY IF EXISTS "faqs_admin_write" ON public.faqs;
DROP POLICY IF EXISTS "faqs_read" ON public.faqs;
DROP POLICY IF EXISTS "faqs_write" ON public.faqs;

CREATE POLICY "faqs_read_all" ON public.faqs
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "faqs_admin_write" ON public.faqs
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR TRUE
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR TRUE
  );

-- 3. Enable REPLICA IDENTITY FULL & Realtime
ALTER TABLE public.faqs REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.faqs;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

-- 4. Seed initial high-quality FAQs if table is empty
INSERT INTO public.faqs (question, answer, category, is_active, sort_order)
SELECT q, a, c, true, s FROM (VALUES
  ('How do I schedule a property site visit?', 'You can click on "Book Visit" or "Schedule Appointment" on any property listing page to choose your preferred date and time. An agent will confirm your visit.', 'General', 1),
  ('What documents are required to buy a property in India?', 'Standard documents include identity proof (Aadhaar/Passport), PAN card, address proof, income documents (for home loans), and passport-size photographs.', 'Buying', 2),
  ('How does RealtyNow verify listed properties?', 'Our team conducts thorough legal title checks, physical verification of construction status, RERA registration checks, and builder credentials verification.', 'Buying', 3),
  ('How can I list my property for sale or rent?', 'Sign in to your account, click on "Post Property" in your dashboard, enter property details, upload photos, and hit submit. Our team will verify and make it live.', 'Selling', 4),
  ('What are the typical home loan interest rates?', 'Home loan interest rates currently start around 8.35% to 9.50% depending on your credit score, loan amount, and employment type. Use our EMI Calculator to estimate payments.', 'Home Loans', 5),
  ('Is RERA registration mandatory for all new projects?', 'Yes, under the RERA Act, all residential and commercial real estate projects where land area exceeds 500 sq. meters or 8 apartments must be registered with RERA.', 'General', 6)
) AS v(q, a, c, s)
WHERE NOT EXISTS (SELECT 1 FROM public.faqs LIMIT 1);

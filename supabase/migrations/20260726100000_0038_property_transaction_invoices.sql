/*
# Invoice Management System (Property Transactions)
Creates isolated tables for real estate transaction invoicing to prevent
clashing with the platform's SaaS agent subscription billing.

Tables:
1. txn_customers
2. txn_invoices
3. txn_invoice_items
4. txn_payments
*/

-- ============================================================
-- 1. TRANSACTION CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.txn_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Link to auth user if exists
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  pincode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.txn_customers ENABLE ROW LEVEL SECURITY;

-- Admins get full CRUD
CREATE POLICY "admin_all_txn_customers" ON public.txn_customers FOR ALL 
TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- 2. TRANSACTION INVOICES
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS public.txn_invoice_number_seq START 1 INCREMENT 1;

CREATE TABLE IF NOT EXISTS public.txn_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE DEFAULT ('RN-' || to_char(now(), 'YYYY') || '-' || LPAD(nextval('public.txn_invoice_number_seq')::TEXT, 6, '0')),
  customer_id UUID NOT NULL REFERENCES public.txn_customers(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invoice_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 18,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'failed', 'refunded')),
  payment_method TEXT,
  invoice_status TEXT NOT NULL DEFAULT 'issued' CHECK (invoice_status IN ('draft', 'issued', 'cancelled')),
  notes TEXT,
  pdf_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.txn_invoices ENABLE ROW LEVEL SECURITY;

-- Admins all
CREATE POLICY "admin_all_txn_invoices" ON public.txn_invoices FOR ALL 
TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Agents read own assigned invoices
CREATE POLICY "agent_read_txn_invoices" ON public.txn_invoices FOR SELECT 
TO authenticated USING (agent_id = auth.uid());

-- Customers read own invoices
CREATE POLICY "customer_read_txn_invoices" ON public.txn_invoices FOR SELECT 
TO authenticated USING (
  customer_id IN (SELECT id FROM public.txn_customers WHERE profile_id = auth.uid())
);

-- ============================================================
-- 3. TRANSACTION INVOICE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.txn_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.txn_invoices(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.txn_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_txn_invoice_items" ON public.txn_invoice_items FOR ALL 
TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "agent_read_txn_invoice_items" ON public.txn_invoice_items FOR SELECT 
TO authenticated USING (
  invoice_id IN (SELECT id FROM public.txn_invoices WHERE agent_id = auth.uid())
);

CREATE POLICY "customer_read_txn_invoice_items" ON public.txn_invoice_items FOR SELECT 
TO authenticated USING (
  invoice_id IN (
    SELECT id FROM public.txn_invoices 
    WHERE customer_id IN (SELECT id FROM public.txn_customers WHERE profile_id = auth.uid())
  )
);

-- ============================================================
-- 4. TRANSACTION PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.txn_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.txn_invoices(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.txn_customers(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('Razorpay', 'Stripe', 'Bank Transfer', 'Cash', 'UPI')),
  transaction_id TEXT,
  gateway TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  paid_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.txn_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_txn_payments" ON public.txn_payments FOR ALL 
TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "agent_read_txn_payments" ON public.txn_payments FOR SELECT 
TO authenticated USING (
  invoice_id IN (SELECT id FROM public.txn_invoices WHERE agent_id = auth.uid())
);

CREATE POLICY "customer_read_txn_payments" ON public.txn_payments FOR SELECT 
TO authenticated USING (
  customer_id IN (SELECT id FROM public.txn_customers WHERE profile_id = auth.uid())
);

-- ============================================================
-- 5. STORAGE BUCKET FOR INVOICE PDFS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoice-pdfs', 'invoice-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "invoice_pdfs_public_read" ON storage.objects FOR SELECT 
USING (bucket_id = 'invoice-pdfs');

CREATE POLICY "invoice_pdfs_admin_insert" ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'invoice-pdfs' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "invoice_pdfs_admin_update" ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'invoice-pdfs' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "invoice_pdfs_admin_delete" ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'invoice-pdfs' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- 6. REALTIME SUBSCRIPTIONS
-- ============================================================
-- Ensure tables are published to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.txn_invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.txn_payments;

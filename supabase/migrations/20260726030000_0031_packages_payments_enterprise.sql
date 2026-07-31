-- =============================================================================
-- Migration: 20260726030000_0031_packages_payments_enterprise.sql
-- Description: Full package system (Bronze→Diamond), expanded payments with
--              Razorpay/Stripe support, payment schedules, invoice generation,
--              and renewal management with automated reminder tracking.
-- =============================================================================

-- ============================================================
-- 1. PACKAGES TABLE (Bronze → Diamond)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.packages (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT NOT NULL UNIQUE,
  slug                   TEXT NOT NULL UNIQUE,
  tier                   INT NOT NULL UNIQUE CHECK (tier BETWEEN 1 AND 5), -- 1=Bronze,2=Silver,3=Gold,4=Platinum,5=Diamond
  description            TEXT,
  price_monthly          NUMERIC(12,2) NOT NULL DEFAULT 0,
  price_yearly           NUMERIC(12,2) NOT NULL DEFAULT 0,
  price_onetime          NUMERIC(12,2),
  -- Listing limits
  listing_limit          INT NOT NULL DEFAULT 5,         -- max active listings
  featured_listings      INT NOT NULL DEFAULT 0,
  sponsored_listings     INT NOT NULL DEFAULT 0,
  banner_credits         INT NOT NULL DEFAULT 0,
  lead_credits           INT NOT NULL DEFAULT 0,
  -- Visibility & priority
  priority_level         INT NOT NULL DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 10),
  homepage_visibility    BOOLEAN NOT NULL DEFAULT false,
  search_boost           BOOLEAN NOT NULL DEFAULT false,
  -- Access controls
  crm_access             BOOLEAN NOT NULL DEFAULT false,
  analytics_access       BOOLEAN NOT NULL DEFAULT false,
  ai_tools               BOOLEAN NOT NULL DEFAULT false,
  advanced_reporting     BOOLEAN NOT NULL DEFAULT false,
  api_access             BOOLEAN NOT NULL DEFAULT false,
  -- Duration
  duration_days          INT NOT NULL DEFAULT 30,
  renewal_discount_pct   NUMERIC(5,2) NOT NULL DEFAULT 0,
  -- Metadata
  color                  TEXT DEFAULT '#6366f1',
  badge_text             TEXT,
  is_popular             BOOLEAN NOT NULL DEFAULT false,
  is_active              BOOLEAN NOT NULL DEFAULT true,
  sort_order             INT NOT NULL DEFAULT 0,
  features               JSONB DEFAULT '[]'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packages_read" ON public.packages;
CREATE POLICY "packages_read" ON public.packages
  FOR SELECT TO anon, authenticated USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "packages_admin_write" ON public.packages;
CREATE POLICY "packages_admin_write" ON public.packages
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_packages_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS on_packages_updated_at ON public.packages;
CREATE TRIGGER on_packages_updated_at
  BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.handle_packages_updated_at();

-- ============================================================
-- 2. SEED DEFAULT PACKAGES
-- ============================================================
INSERT INTO public.packages (
  name, slug, tier, description, price_monthly, price_yearly,
  listing_limit, featured_listings, sponsored_listings, banner_credits, lead_credits,
  priority_level, homepage_visibility, search_boost,
  crm_access, analytics_access, ai_tools, advanced_reporting,
  duration_days, renewal_discount_pct, color, badge_text, is_popular, sort_order,
  features
) VALUES
(
  'Bronze', 'bronze', 1,
  'Perfect for individual property owners getting started.',
  999, 9990,
  5, 0, 0, 0, 10,
  1, false, false,
  false, false, false, false,
  30, 0, '#cd7f32', NULL, false, 1,
  '["5 Active Listings","10 Lead Credits","Basic Analytics","Email Support"]'::jsonb
),
(
  'Silver', 'silver', 2,
  'Ideal for small agents managing a growing portfolio.',
  2499, 24990,
  20, 2, 1, 2, 30,
  3, false, true,
  true, true, false, false,
  30, 5, '#c0c0c0', NULL, false, 2,
  '["20 Active Listings","2 Featured Listings","1 Sponsored Listing","2 Banner Credits","30 Lead Credits","CRM Access","Analytics Dashboard","Search Boost","Email & Chat Support"]'::jsonb
),
(
  'Gold', 'gold', 3,
  'For professional agents and small agencies.',
  4999, 49990,
  50, 5, 3, 5, 75,
  5, true, true,
  true, true, true, false,
  30, 10, '#ffd700', 'Popular', true, 3,
  '["50 Active Listings","5 Featured Listings","3 Sponsored Listings","5 Banner Credits","75 Lead Credits","CRM Access","Full Analytics","AI Tools","Homepage Visibility","Search Boost","Priority Support"]'::jsonb
),
(
  'Platinum', 'platinum', 4,
  'For agencies and high-volume property professionals.',
  9999, 99990,
  150, 15, 10, 15, 200,
  8, true, true,
  true, true, true, true,
  30, 15, '#e5e4e2', 'Premium', false, 4,
  '["150 Active Listings","15 Featured Listings","10 Sponsored Listings","15 Banner Credits","200 Lead Credits","Full CRM Suite","Advanced Analytics","All AI Tools","Homepage Banner","Search Priority","Advanced Reporting","API Access","Dedicated Account Manager"]'::jsonb
),
(
  'Diamond', 'diamond', 5,
  'Ultimate enterprise package for large agencies and developers.',
  19999, 199990,
  500, 50, 30, 50, 500,
  10, true, true,
  true, true, true, true,
  30, 20, '#b9f2ff', 'Enterprise', false, 5,
  '["Unlimited Listings","50 Featured Listings","30 Sponsored Listings","50 Banner Credits","500 Lead Credits","Enterprise CRM","Real-time Analytics","All AI Tools + Priority","Homepage Hero Banner","Highest Search Priority","Custom Reports","Full API Access","24/7 Dedicated Support","Custom Branding"]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 3. AGENT_PACKAGES TABLE (Agent ↔ Package Subscriptions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agent_packages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_id        UUID NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
  payment_id        UUID,                   -- FK set after payment table created below
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','active','expired','cancelled','suspended')),
  billing_cycle     TEXT NOT NULL DEFAULT 'monthly'
                      CHECK (billing_cycle IN ('monthly','yearly','onetime')),
  started_at        TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  auto_renew        BOOLEAN NOT NULL DEFAULT true,
  listings_used     INT NOT NULL DEFAULT 0,
  featured_used     INT NOT NULL DEFAULT 0,
  sponsored_used    INT NOT NULL DEFAULT 0,
  banner_used       INT NOT NULL DEFAULT 0,
  leads_used        INT NOT NULL DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_packages_own" ON public.agent_packages;
CREATE POLICY "agent_packages_own" ON public.agent_packages
  FOR SELECT TO authenticated
  USING (auth.uid() = agent_id OR public.is_staff());

DROP POLICY IF EXISTS "agent_packages_insert" ON public.agent_packages;
CREATE POLICY "agent_packages_insert" ON public.agent_packages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id OR public.is_admin());

DROP POLICY IF EXISTS "agent_packages_update" ON public.agent_packages;
CREATE POLICY "agent_packages_update" ON public.agent_packages
  FOR UPDATE TO authenticated
  USING (auth.uid() = agent_id OR public.is_admin())
  WITH CHECK (auth.uid() = agent_id OR public.is_admin());

CREATE INDEX IF NOT EXISTS idx_agent_packages_agent    ON public.agent_packages(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_packages_status   ON public.agent_packages(status);
CREATE INDEX IF NOT EXISTS idx_agent_packages_expires  ON public.agent_packages(expires_at);

-- Updated_at trigger
DROP TRIGGER IF EXISTS on_agent_packages_updated_at ON public.agent_packages;
CREATE TRIGGER on_agent_packages_updated_at
  BEFORE UPDATE ON public.agent_packages FOR EACH ROW EXECUTE FUNCTION public.handle_packages_updated_at();

-- ============================================================
-- 4. EXPAND PAYMENTS TABLE
-- ============================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_type       TEXT DEFAULT 'upfront'
                              CHECK (payment_type IN ('upfront','split','emi','partial','full')),
  ADD COLUMN IF NOT EXISTS gateway            TEXT DEFAULT 'razorpay'
                              CHECK (gateway IN ('razorpay','stripe','offline','free')),
  ADD COLUMN IF NOT EXISTS gateway_order_id   TEXT,
  ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS gateway_signature  TEXT,
  ADD COLUMN IF NOT EXISTS package_id         UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agent_package_id   UUID REFERENCES public.agent_packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_id         UUID,                -- FK added after invoices table created
  ADD COLUMN IF NOT EXISTS subtotal           NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS tax_pct            NUMERIC(5,2) DEFAULT 18,
  ADD COLUMN IF NOT EXISTS tax_amount         NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS discount_pct       NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount    NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason    TEXT,
  ADD COLUMN IF NOT EXISTS description        TEXT,
  ADD COLUMN IF NOT EXISTS metadata           JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS paid_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_reason      TEXT,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT now();

-- Allow admin and staff to view all payments
DROP POLICY IF EXISTS "payments_own" ON public.payments;
CREATE POLICY "payments_own" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS "payments_insert" ON public.payments;
CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "payments_update" ON public.payments;
CREATE POLICY "payments_update" ON public.payments
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_payments_gateway_order  ON public.payments(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_pid    ON public.payments(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_package        ON public.payments(package_id);
CREATE INDEX IF NOT EXISTS idx_payments_status         ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created        ON public.payments(created_at DESC);

-- ============================================================
-- 5. PAYMENT_SCHEDULE TABLE (Split / EMI schedules)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_schedule (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  installment_no  INT NOT NULL DEFAULT 1,
  due_date        DATE NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','overdue','waived')),
  paid_at         TIMESTAMPTZ,
  gateway_ref     TEXT,
  reminder_sent   BOOLEAN NOT NULL DEFAULT false,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_schedule_own" ON public.payment_schedule;
CREATE POLICY "payment_schedule_own" ON public.payment_schedule
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS "payment_schedule_write" ON public.payment_schedule;
CREATE POLICY "payment_schedule_write" ON public.payment_schedule
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE INDEX IF NOT EXISTS idx_pay_sched_payment   ON public.payment_schedule(payment_id);
CREATE INDEX IF NOT EXISTS idx_pay_sched_user      ON public.payment_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_sched_due       ON public.payment_schedule(due_date);
CREATE INDEX IF NOT EXISTS idx_pay_sched_status    ON public.payment_schedule(status);

-- ============================================================
-- 6. INVOICES TABLE
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1000 INCREMENT 1;

CREATE TABLE IF NOT EXISTS public.invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  TEXT NOT NULL UNIQUE DEFAULT ('INV-' || LPAD(nextval('public.invoice_number_seq')::TEXT, 6, '0')),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  payment_id      UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  agent_package_id UUID REFERENCES public.agent_packages(id) ON DELETE SET NULL,
  -- Billing details (snapshot at time of invoice)
  billing_name    TEXT,
  billing_email   TEXT,
  billing_phone   TEXT,
  billing_address TEXT,
  billing_gstin   TEXT,
  -- Line items
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Financial
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_pct         NUMERIC(5,2) NOT NULL DEFAULT 18,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'INR',
  -- Status
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','issued','paid','overdue','cancelled','refunded')),
  issued_at       TIMESTAMPTZ,
  due_at          TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  -- Output
  pdf_url         TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_own" ON public.invoices;
CREATE POLICY "invoices_own" ON public.invoices
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
CREATE POLICY "invoices_insert" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
CREATE POLICY "invoices_update" ON public.invoices
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_invoices_user      ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment   ON public.invoices(payment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status    ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_at ON public.invoices(issued_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_invoices_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS on_invoices_updated_at ON public.invoices;
CREATE TRIGGER on_invoices_updated_at
  BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.handle_invoices_updated_at();

-- Link payments.invoice_id FK now that invoices table exists
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_invoice_id_fk;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_invoice_id_fk
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL
  NOT VALID;

-- ============================================================
-- 7. fn_create_payment_and_invoice() — Atomic RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_create_payment_and_invoice(
  p_user_id          UUID,
  p_package_id       UUID,
  p_amount           NUMERIC,
  p_payment_type     TEXT DEFAULT 'upfront',
  p_billing_cycle    TEXT DEFAULT 'monthly',
  p_gateway          TEXT DEFAULT 'razorpay',
  p_discount_pct     NUMERIC DEFAULT 0,
  p_split_schedule   JSONB DEFAULT NULL  -- [{due_date, amount}, ...]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_package      public.packages%ROWTYPE;
  v_payment_id   UUID;
  v_invoice_id   UUID;
  v_ap_id        UUID;
  v_tax          NUMERIC;
  v_subtotal     NUMERIC;
  v_discount_amt NUMERIC;
  v_total        NUMERIC;
  v_expires_at   TIMESTAMPTZ;
  v_inv_number   TEXT;
  v_item         JSONB;
BEGIN
  SELECT * INTO v_package FROM public.packages WHERE id = p_package_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found or inactive'; END IF;

  -- Calculate financials
  v_subtotal     := p_amount;
  v_discount_amt := ROUND(v_subtotal * (p_discount_pct / 100), 2);
  v_subtotal     := v_subtotal - v_discount_amt;
  v_tax          := ROUND(v_subtotal * 0.18, 2);
  v_total        := v_subtotal + v_tax;
  v_expires_at   := now() + (v_package.duration_days || ' days')::INTERVAL;

  -- Create agent_package record
  INSERT INTO public.agent_packages (agent_id, package_id, status, billing_cycle, started_at, expires_at)
  VALUES (p_user_id, p_package_id, 'pending', p_billing_cycle, now(), v_expires_at)
  RETURNING id INTO v_ap_id;

  -- Build invoice item
  v_item := jsonb_build_array(jsonb_build_object(
    'description', v_package.name || ' Package (' || p_billing_cycle || ')',
    'quantity', 1,
    'unit_price', p_amount,
    'amount', p_amount
  ));

  -- Create invoice
  v_inv_number := 'INV-' || LPAD(nextval('public.invoice_number_seq')::TEXT, 6, '0');
  INSERT INTO public.invoices (
    invoice_number, user_id, agent_package_id, items,
    subtotal, tax_pct, tax_amount, discount_amount, total, currency,
    status, issued_at, due_at
  ) VALUES (
    v_inv_number, p_user_id, v_ap_id, v_item,
    v_subtotal, 18, v_tax, v_discount_amt, v_total, 'INR',
    'issued', now(), now() + INTERVAL '7 days'
  ) RETURNING id INTO v_invoice_id;

  -- Create payment record
  INSERT INTO public.payments (
    user_id, amount, currency, status, payment_type, gateway,
    package_id, agent_package_id, invoice_id,
    subtotal, tax_pct, tax_amount, discount_pct, discount_amount,
    description, updated_at
  ) VALUES (
    p_user_id, v_total, 'INR', 'pending', p_payment_type, p_gateway,
    p_package_id, v_ap_id, v_invoice_id,
    v_subtotal, 18, v_tax, p_discount_pct, v_discount_amt,
    v_package.name || ' Package Subscription',
    now()
  ) RETURNING id INTO v_payment_id;

  -- Update invoice with payment_id
  UPDATE public.invoices SET payment_id = v_payment_id WHERE id = v_invoice_id;

  -- Update agent_package with payment_id
  UPDATE public.agent_packages SET payment_id = v_payment_id WHERE id = v_ap_id;

  -- Create split payment schedule if applicable
  IF p_payment_type IN ('split','emi') AND p_split_schedule IS NOT NULL THEN
    INSERT INTO public.payment_schedule (payment_id, user_id, installment_no, due_date, amount)
    SELECT
      v_payment_id,
      p_user_id,
      (ROW_NUMBER() OVER ())::INT,
      (item->>'due_date')::DATE,
      (item->>'amount')::NUMERIC
    FROM jsonb_array_elements(p_split_schedule) AS item;
  END IF;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'invoice_id', v_invoice_id,
    'invoice_number', v_inv_number,
    'agent_package_id', v_ap_id,
    'total', v_total,
    'tax', v_tax,
    'discount', v_discount_amt
  );
END;
$$;

-- ============================================================
-- 8. fn_confirm_payment() — Called after gateway verification
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_confirm_payment(
  p_payment_id          UUID,
  p_gateway_payment_id  TEXT,
  p_gateway_order_id    TEXT DEFAULT NULL,
  p_gateway_signature   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
BEGIN
  UPDATE public.payments
  SET status = 'paid', paid_at = now(),
      gateway_payment_id = p_gateway_payment_id,
      gateway_order_id = COALESCE(p_gateway_order_id, gateway_order_id),
      gateway_signature = COALESCE(p_gateway_signature, gateway_signature),
      updated_at = now()
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;

  -- Activate agent package
  IF v_payment.agent_package_id IS NOT NULL THEN
    UPDATE public.agent_packages
    SET status = 'active', started_at = now(), updated_at = now()
    WHERE id = v_payment.agent_package_id;
  END IF;

  -- Update invoice
  IF v_payment.invoice_id IS NOT NULL THEN
    UPDATE public.invoices
    SET status = 'paid', paid_at = now(), updated_at = now()
    WHERE id = v_payment.invoice_id;
  END IF;

  -- Notify user
  PERFORM public.notify_user(
    v_payment.user_id, 'payment',
    'Payment Confirmed',
    'Your payment of ₹' || v_payment.amount || ' has been received. Invoice #' ||
      COALESCE((SELECT invoice_number FROM public.invoices WHERE id = v_payment.invoice_id), 'N/A') || ' is ready.',
    '/portal/invoices'
  );

  -- Recalculate agent score
  PERFORM public.fn_calculate_agent_score(v_payment.user_id);

  RETURN jsonb_build_object('success', true, 'payment_id', p_payment_id, 'status', 'paid');
END;
$$;

-- ============================================================
-- 9. RENEWALS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.renewals (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_package_id        UUID NOT NULL REFERENCES public.agent_packages(id) ON DELETE CASCADE,
  package_id              UUID NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
  expires_at              TIMESTAMPTZ NOT NULL,
  reminder_sent_30d       BOOLEAN NOT NULL DEFAULT false,
  reminder_sent_20d       BOOLEAN NOT NULL DEFAULT false,
  reminder_sent_7d        BOOLEAN NOT NULL DEFAULT false,
  reminder_sent_1d        BOOLEAN NOT NULL DEFAULT false,
  lock_in_offer_pct       NUMERIC(5,2) DEFAULT 0,
  lock_in_offer_expires   TIMESTAMPTZ,
  renewal_status          TEXT NOT NULL DEFAULT 'pending'
                            CHECK (renewal_status IN ('pending','renewed','expired','cancelled')),
  renewed_payment_id      UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  renewed_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.renewals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "renewals_own" ON public.renewals;
CREATE POLICY "renewals_own" ON public.renewals
  FOR SELECT TO authenticated
  USING (auth.uid() = agent_id OR public.is_staff());

DROP POLICY IF EXISTS "renewals_write" ON public.renewals;
CREATE POLICY "renewals_write" ON public.renewals
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_renewals_agent      ON public.renewals(agent_id);
CREATE INDEX IF NOT EXISTS idx_renewals_expires    ON public.renewals(expires_at);
CREATE INDEX IF NOT EXISTS idx_renewals_status     ON public.renewals(renewal_status);

-- ============================================================
-- 10. fn_process_renewal_reminders() — Cron function
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_process_renewal_reminders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec   public.renewals%ROWTYPE;
  v_count INT := 0;
BEGIN
  FOR v_rec IN
    SELECT * FROM public.renewals
    WHERE renewal_status = 'pending'
  LOOP
    -- 30-day reminder
    IF NOT v_rec.reminder_sent_30d AND v_rec.expires_at - INTERVAL '30 days' <= now() THEN
      PERFORM public.notify_user(v_rec.agent_id, 'renewal',
        'Package Expiring in 30 Days',
        'Your subscription expires in 30 days. Renew early and save ' ||
          (SELECT renewal_discount_pct FROM public.packages WHERE id = v_rec.package_id) || '%!',
        '/agent/packages');
      UPDATE public.renewals SET reminder_sent_30d = true, updated_at = now() WHERE id = v_rec.id;
      v_count := v_count + 1;
    END IF;

    -- 20-day reminder
    IF NOT v_rec.reminder_sent_20d AND v_rec.expires_at - INTERVAL '20 days' <= now() THEN
      PERFORM public.notify_user(v_rec.agent_id, 'renewal',
        'Package Expiring in 20 Days',
        'Only 20 days left on your subscription. Lock in your renewal discount now!',
        '/agent/packages');
      UPDATE public.renewals SET reminder_sent_20d = true, updated_at = now() WHERE id = v_rec.id;
      v_count := v_count + 1;
    END IF;

    -- 7-day reminder with special offer
    IF NOT v_rec.reminder_sent_7d AND v_rec.expires_at - INTERVAL '7 days' <= now() THEN
      PERFORM public.notify_user(v_rec.agent_id, 'renewal_urgent',
        'URGENT: Package Expiring in 7 Days!',
        'Your listings will be removed in 7 days. Renew now to keep your properties live!',
        '/agent/packages');
      UPDATE public.renewals
        SET reminder_sent_7d = true,
            lock_in_offer_pct = 5,
            lock_in_offer_expires = now() + INTERVAL '7 days',
            updated_at = now()
        WHERE id = v_rec.id;
      v_count := v_count + 1;
    END IF;

    -- 1-day final reminder
    IF NOT v_rec.reminder_sent_1d AND v_rec.expires_at - INTERVAL '1 day' <= now() THEN
      PERFORM public.notify_user(v_rec.agent_id, 'renewal_critical',
        'FINAL NOTICE: Package Expires Tomorrow!',
        'This is your last chance! Your package expires tomorrow and all your listings will be deactivated.',
        '/agent/packages');
      UPDATE public.renewals SET reminder_sent_1d = true, updated_at = now() WHERE id = v_rec.id;
      v_count := v_count + 1;
    END IF;

    -- Mark as expired
    IF v_rec.renewal_status = 'pending' AND v_rec.expires_at < now() THEN
      UPDATE public.renewals SET renewal_status = 'expired', updated_at = now() WHERE id = v_rec.id;
      -- Deactivate package
      UPDATE public.agent_packages SET status = 'expired', updated_at = now() WHERE id = v_rec.agent_package_id;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Trigger: auto-create renewal record when agent_package is activated
CREATE OR REPLACE FUNCTION public.fn_create_renewal_on_activate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active') AND NEW.expires_at IS NOT NULL THEN
    INSERT INTO public.renewals (agent_id, agent_package_id, package_id, expires_at)
    VALUES (NEW.agent_id, NEW.id, NEW.package_id, NEW.expires_at)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_agent_package_activate ON public.agent_packages;
CREATE TRIGGER on_agent_package_activate
  AFTER UPDATE OF status ON public.agent_packages
  FOR EACH ROW EXECUTE FUNCTION public.fn_create_renewal_on_activate();

-- ============================================================
-- 11. GRANTS & REALTIME
-- ============================================================
GRANT ALL ON public.packages TO authenticated, service_role;
GRANT ALL ON public.agent_packages TO authenticated, service_role;
GRANT ALL ON public.invoices TO authenticated, service_role;
GRANT ALL ON public.payment_schedule TO authenticated, service_role;
GRANT ALL ON public.renewals TO authenticated, service_role;
GRANT USAGE ON SEQUENCE public.invoice_number_seq TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_create_payment_and_invoice(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, NUMERIC, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_confirm_payment(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_process_renewal_reminders() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.packages; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_packages; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_schedule; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.renewals; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

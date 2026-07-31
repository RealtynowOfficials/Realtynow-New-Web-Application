-- =============================================================================
-- Migration: 20260726110000_0039_package_renewals_engine.sql
-- Description: Implement Package Renewal & Discount Management System.
--              Includes discount campaigns, user_packages, automated notifications.
-- =============================================================================

-- ============================================================
-- 1. DISCOUNT CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.discount_campaigns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  discount_type       TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  percentage          NUMERIC(5,2) DEFAULT 0,
  flat_amount         NUMERIC(12,2) DEFAULT 0,
  valid_from          TIMESTAMPTZ,
  valid_to            TIMESTAMPTZ,
  days_before_expiry  INT, -- Trigger discount if package expires in exactly these many days (e.g., 5)
  is_active           BOOLEAN NOT NULL DEFAULT true,
  coupon_code         TEXT UNIQUE,
  min_purchase        NUMERIC(12,2) DEFAULT 0,
  max_discount        NUMERIC(12,2),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discount_campaigns_read" ON public.discount_campaigns;
CREATE POLICY "discount_campaigns_read" ON public.discount_campaigns
  FOR SELECT TO authenticated USING (is_active = true OR public.is_staff());

DROP POLICY IF EXISTS "discount_campaigns_admin" ON public.discount_campaigns;
CREATE POLICY "discount_campaigns_admin" ON public.discount_campaigns
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 2. USER PACKAGES (Centralized subscription tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_packages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id       UUID NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
  purchase_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  start_date       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date      TIMESTAMPTZ NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  renewal_count    INT NOT NULL DEFAULT 0,
  auto_renew       BOOLEAN NOT NULL DEFAULT false,
  payment_status   TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'failed')),
  coupon_id        UUID REFERENCES public.discount_campaigns(id) ON DELETE SET NULL,
  discount_amount  NUMERIC(12,2) DEFAULT 0,
  final_amount     NUMERIC(12,2) NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_packages_own" ON public.user_packages;
CREATE POLICY "user_packages_own" ON public.user_packages
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS "user_packages_admin" ON public.user_packages;
CREATE POLICY "user_packages_admin" ON public.user_packages
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 3. RENEWAL NOTIFICATIONS (Tracking reminders & offers)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.renewal_notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id        UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  user_package_id   UUID NOT NULL REFERENCES public.user_packages(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('reminder', 'discount_offer', 'expired', 'renewed')),
  email_sent        BOOLEAN NOT NULL DEFAULT false,
  sms_sent          BOOLEAN NOT NULL DEFAULT false,
  push_sent         BOOLEAN NOT NULL DEFAULT false,
  whatsapp_sent     BOOLEAN NOT NULL DEFAULT false,
  sent_at           TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.renewal_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "renewal_notifications_own" ON public.renewal_notifications;
CREATE POLICY "renewal_notifications_own" ON public.renewal_notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS "renewal_notifications_admin" ON public.renewal_notifications;
CREATE POLICY "renewal_notifications_admin" ON public.renewal_notifications
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 4. TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_package_engine_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_discount_campaigns_updated_at ON public.discount_campaigns;
CREATE TRIGGER on_discount_campaigns_updated_at
  BEFORE UPDATE ON public.discount_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_package_engine_updated_at();

DROP TRIGGER IF EXISTS on_user_packages_updated_at ON public.user_packages;
CREATE TRIGGER on_user_packages_updated_at
  BEFORE UPDATE ON public.user_packages
  FOR EACH ROW EXECUTE FUNCTION public.handle_package_engine_updated_at();

-- ============================================================
-- 5. COUPON VALIDATION RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_validate_coupon(
  p_code TEXT,
  p_package_price NUMERIC
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_campaign RECORD;
  v_discount NUMERIC(12,2) := 0;
  v_final NUMERIC(12,2) := p_package_price;
BEGIN
  SELECT * INTO v_campaign FROM public.discount_campaigns
  WHERE coupon_code = p_code AND is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_to IS NULL OR valid_to >= now());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Invalid or expired coupon code.');
  END IF;

  IF p_package_price < v_campaign.min_purchase THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Minimum purchase amount not met.');
  END IF;

  IF v_campaign.discount_type = 'percentage' THEN
    v_discount := (p_package_price * (v_campaign.percentage / 100));
    IF v_campaign.max_discount IS NOT NULL AND v_discount > v_campaign.max_discount THEN
      v_discount := v_campaign.max_discount;
    END IF;
  ELSE
    v_discount := v_campaign.flat_amount;
  END IF;

  v_final := GREATEST(0, p_package_price - v_discount);

  RETURN jsonb_build_object(
    'valid', true,
    'campaign_id', v_campaign.id,
    'discount_amount', v_discount,
    'final_amount', v_final,
    'message', 'Coupon applied successfully!'
  );
END;
$$;

-- ============================================================
-- 6. DASHBOARD ANALYTICS RPC (Admin & User)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_renewal_analytics(
  p_user_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_revenue NUMERIC;
  v_active_packages INT;
  v_expired_packages INT;
  v_upcoming_renewals INT;
BEGIN
  IF p_user_id IS NOT NULL THEN
    -- User Analytics
    SELECT count(*) INTO v_active_packages FROM public.user_packages WHERE user_id = p_user_id AND status = 'active';
    SELECT count(*) INTO v_expired_packages FROM public.user_packages WHERE user_id = p_user_id AND status = 'expired';
    SELECT count(*) INTO v_upcoming_renewals FROM public.user_packages 
      WHERE user_id = p_user_id AND status = 'active' AND expiry_date BETWEEN now() AND now() + interval '15 days';
    
    RETURN jsonb_build_object(
      'active', v_active_packages,
      'expired', v_expired_packages,
      'upcoming_renewals', v_upcoming_renewals
    );
  ELSE
    -- Admin Analytics (requires staff/admin)
    IF NOT public.is_staff() THEN
      RAISE EXCEPTION 'Access Denied';
    END IF;

    SELECT COALESCE(sum(final_amount), 0) INTO v_total_revenue FROM public.user_packages WHERE payment_status = 'paid';
    SELECT count(*) INTO v_active_packages FROM public.user_packages WHERE status = 'active';
    SELECT count(*) INTO v_expired_packages FROM public.user_packages WHERE status = 'expired';
    SELECT count(*) INTO v_upcoming_renewals FROM public.user_packages 
      WHERE status = 'active' AND expiry_date BETWEEN now() AND now() + interval '15 days';

    RETURN jsonb_build_object(
      'total_revenue', v_total_revenue,
      'active_packages', v_active_packages,
      'expired_packages', v_expired_packages,
      'upcoming_renewals', v_upcoming_renewals
    );
  END IF;
END;
$$;

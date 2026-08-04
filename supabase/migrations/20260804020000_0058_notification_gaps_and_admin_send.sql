-- Migration: 20260804020000_0058_notification_gaps_and_admin_send.sql
-- Description: Closes the remaining gaps in the notification-trigger coverage
--              audited against the "Property Submitted/Approved/Rejected, New
--              Enquiry/Lead, Payment Success/Failed, Subscription Activated/
--              Expired, Admin Announcement" requirement list. Most of these
--              already existed (fn_notify_agent_on_enquiry, the property
--              status-change trigger, appointment triggers, renewal-reminder
--              warnings) — this migration adds only what was actually
--              missing:
--                1. Payment Failed had no handler at all.
--                2. Payment Confirmed activated a subscription silently —
--                   now also sends a distinct "Subscription Activated" note.
--                3. Subscription expiry (fn_process_renewal_reminders) only
--                   ever sent pre-expiry warnings, never a notification for
--                   the actual lapse.
--                4. "Admin Announcement" (send to one user or broadcast to
--                   all) didn't exist in any form — new admin-only RPC.

-- ============================================================
-- 1. fn_mark_payment_failed — Payment Failed
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_mark_payment_failed(
  p_payment_id UUID,
  p_reason     TEXT DEFAULT NULL
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
  SET status = 'failed', updated_at = now()
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;

  PERFORM public.notify_user(
    v_payment.user_id, 'payment_failed',
    'Payment Failed',
    'Your payment of ₹' || v_payment.amount || ' could not be processed.' ||
      CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE ' Please try again.' END,
    '/portal/invoices'
  );

  RETURN jsonb_build_object('success', true, 'payment_id', p_payment_id, 'status', 'failed');
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_mark_payment_failed(UUID, TEXT) TO authenticated, service_role;

-- ============================================================
-- 2. fn_confirm_payment — add a distinct Subscription Activated
--    notification alongside the existing Payment Confirmed one, only
--    when this payment actually activated a package.
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
  v_payment      public.payments%ROWTYPE;
  v_package_name TEXT;
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

  -- Distinct "Subscription Activated" notification when a package was activated
  IF v_payment.agent_package_id IS NOT NULL THEN
    SELECT p.name INTO v_package_name
    FROM public.agent_packages ap JOIN public.packages p ON p.id = ap.package_id
    WHERE ap.id = v_payment.agent_package_id;

    PERFORM public.notify_user(
      v_payment.user_id, 'subscription_activated',
      'Subscription Activated! 🎉',
      COALESCE(v_package_name, 'Your') || ' package is now active. Enjoy your new benefits.',
      '/agent/packages'
    );
  END IF;

  -- Recalculate agent score
  PERFORM public.fn_calculate_agent_score(v_payment.user_id);

  RETURN jsonb_build_object('success', true, 'payment_id', p_payment_id, 'status', 'paid');
END;
$$;

-- ============================================================
-- 3. fn_process_renewal_reminders — add a "Subscription Expired"
--    notification for the actual lapse, not just the pre-expiry warnings.
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
      -- Notify: subscription has actually lapsed (distinct from the warnings above)
      PERFORM public.notify_user(v_rec.agent_id, 'subscription_expired',
        'Subscription Expired',
        'Your package has expired and your listings are no longer live. Renew now to republish them.',
        '/agent/packages');
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ============================================================
-- 4. admin_send_notification — Admin Announcement (one user or broadcast).
--    Deliberately separate from notify_user()/fn_send_notification(), which
--    stay caller-unrestricted because they're invoked from inside existing
--    SECURITY DEFINER triggers/RPCs on behalf of ordinary users' own
--    actions (e.g. a customer resubmitting their own listing). Gating this
--    one specifically to admins is what makes it safe to expose directly
--    to the admin UI.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_send_notification(
  p_title       TEXT,
  p_body        TEXT,
  p_user_id     UUID DEFAULT NULL,
  p_broadcast   BOOLEAN DEFAULT false,
  p_link        TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_uid   UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'title is required';
  END IF;

  IF p_broadcast THEN
    FOR v_uid IN SELECT id FROM public.profiles WHERE status = 'active' LOOP
      PERFORM public.notify_user(v_uid, 'admin_announcement', p_title, p_body, p_link);
      v_count := v_count + 1;
    END LOOP;
  ELSE
    IF p_user_id IS NULL THEN
      RAISE EXCEPTION 'user_id is required when broadcast is false';
    END IF;
    PERFORM public.notify_user(p_user_id, 'admin_announcement', p_title, p_body, p_link);
    v_count := 1;
  END IF;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_send_notification(TEXT, TEXT, UUID, BOOLEAN, TEXT) TO authenticated;

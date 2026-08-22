-- admin_make_property_live() (called by admin_approve_property, which is
-- called by the approveProperty edge function — the actual "Approve" /
-- "Publish" action in the Admin UI) had a broken price gate:
--
--   IF v_property.price IS NULL OR v_property.price <= 0 THEN
--     IF v_property.purpose = 'Rent' AND (rent_amount IS NULL OR rent_amount <= 0) THEN
--       RAISE EXCEPTION ...
--     END IF;
--   END IF;
--
-- For any Sale listing with price <= 0, the outer IF is true but the inner
-- IF's `purpose = 'Rent'` condition is false, so NO exception is ever
-- raised — a ₹0 Sale property sailed straight through. This is very
-- likely the actual mechanism by which ₹0 properties reached Admin/live
-- in the past (the table-level CHECK constraint added in 0114/0120 now
-- backstops this regardless, but this RPC is the intended user-facing
-- gate and must reject with a clear message before hitting a raw
-- constraint-violation error).
--
-- Rewritten to: cover every rent-like purpose (not just the literal
-- string 'Rent'), require >= 1000 (not merely > 0), and return the exact
-- message the Admin UI is expected to show.
CREATE OR REPLACE FUNCTION public.admin_make_property_live(p_property_id uuid, p_admin_id uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_property public.properties%ROWTYPE;
  v_admin_id UUID;
  v_is_rent_like BOOLEAN;
BEGIN
  v_admin_id := COALESCE(p_admin_id, auth.uid());

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can publish properties to live.';
  END IF;

  SELECT * INTO v_property FROM public.properties WHERE id = p_property_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property % not found.', p_property_id;
  END IF;

  -- Validate mandatory fields before publishing
  IF v_property.title IS NULL OR length(trim(v_property.title)) = 0 THEN
    RAISE EXCEPTION 'Cannot publish: Property title is missing.';
  END IF;

  v_is_rent_like := v_property.purpose IN ('Rent', 'Lease', 'PG', 'CoLiving', 'Hostel', 'Short Stay', 'Vacation Rental');
  IF v_is_rent_like THEN
    IF COALESCE(v_property.rent_amount, 0) < 1000 THEN
      RAISE EXCEPTION 'This property cannot be published. The minimum property price is ₹1,000.';
    END IF;
  ELSIF v_property.listing_category = 'Plot' AND v_property.price_per_unit IS NOT NULL THEN
    IF v_property.price_per_unit < 1000 THEN
      RAISE EXCEPTION 'This property cannot be published. The minimum property price is ₹1,000.';
    END IF;
  ELSE
    IF COALESCE(v_property.price, 0) < 1000 THEN
      RAISE EXCEPTION 'This property cannot be published. The minimum property price is ₹1,000.';
    END IF;
  END IF;

  -- Atomic update
  UPDATE public.properties
  SET
    status = 'published',
    approval_status = 'Approved',
    is_live = true,
    is_active = true,
    deleted_at = NULL,
    approved_by = v_admin_id,
    approved_at = now(),
    published_at = COALESCE(published_at, now()),
    updated_at = now()
  WHERE id = p_property_id
  RETURNING * INTO v_property;

  -- Log into property_status_history for audit
  INSERT INTO public.property_status_history (
    property_id,
    status,
    changed_by,
    reason,
    created_at
  ) VALUES (
    p_property_id,
    'published',
    v_admin_id,
    'Published to Live by Admin',
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'property_id', p_property_id,
    'status', 'published',
    'approval_status', 'Approved',
    'is_live', true,
    'published_at', v_property.published_at
  );
END;
$function$;

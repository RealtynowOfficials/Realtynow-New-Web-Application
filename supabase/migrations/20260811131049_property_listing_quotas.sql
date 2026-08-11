-- Migration: 20260811131049_property_listing_quotas.sql
-- Description: Enforce 2 property limit for free users

CREATE OR REPLACE FUNCTION public.check_free_user_property_quota()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
  v_active_package_count INT;
  v_current_property_count INT;
BEGIN
  -- 1. Check user role
  SELECT role INTO v_role FROM public.profiles WHERE id = NEW.user_id;
  
  -- We only enforce this for customers
  IF v_role != 'customer' THEN
    RETURN NEW;
  END IF;

  -- 2. Check if user has an active subscription/package
  SELECT count(*) INTO v_active_package_count
  FROM public.agent_packages
  WHERE agent_id = NEW.user_id AND status = 'active' AND expires_at > now();
  
  -- If they have an active package, we bypass the "free" 2 property limit
  -- They might be subject to the package's `listing_limit`, but the prompt only asked for the free limit.
  IF v_active_package_count > 0 THEN
    RETURN NEW;
  END IF;

  -- 3. Check current properties count for this user
  SELECT count(*) INTO v_current_property_count
  FROM public.properties
  WHERE user_id = NEW.user_id;

  -- 4. Enforce quota
  IF v_current_property_count >= 2 THEN
    RAISE EXCEPTION 'You have reached the maximum limit of 2 properties for free accounts. Please upgrade your plan.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_property_quota ON public.properties;
CREATE TRIGGER trg_enforce_property_quota
  BEFORE INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.check_free_user_property_quota();

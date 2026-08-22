-- Bug: enforce_property_limit() incremented used_quota on every INSERT into
-- properties, including draft creation (autosave, abandoned attempts) — not
-- just real submissions. It also only ran on INSERT, never on UPDATE, so the
-- actual "draft -> submitted" transition (the one true "listing" action) was
-- never counted at all. The counter drifted permanently out of sync with
-- reality: confirmed a customer blocked at "limit of 5" with used_quota=5,
-- but only 2 real (non-draft) properties actually existing for them.
--
-- Fix: recompute the count LIVE from actual non-draft properties each time
-- (no more manually-incremented, driftable counter), skip drafts entirely,
-- and only enforce when a property is actually becoming non-draft (a fresh
-- non-draft insert, or an update where OLD.status = 'draft' and
-- NEW.status <> 'draft').
CREATE OR REPLACE FUNCTION public.enforce_property_limit()
RETURNS TRIGGER AS $$
DECLARE
    limit_record RECORD;
    v_current_count INT;
    v_period_start TIMESTAMPTZ;
BEGIN
    -- Drafts never count against the monthly listing quota.
    IF NEW.status = 'draft' THEN
        RETURN NEW;
    END IF;

    -- On UPDATE, only enforce the moment a property actually leaves draft
    -- status — a property that was already non-draft (e.g. any other field
    -- being edited) must not be re-counted on every subsequent save.
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'draft' THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.property_limits (user_id)
    VALUES (NEW.owner_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO limit_record FROM public.property_limits WHERE user_id = NEW.owner_id FOR UPDATE;

    IF limit_record.override_enabled THEN
        RETURN NEW;
    END IF;

    v_period_start := limit_record.reset_date - interval '1 month';
    IF now() >= limit_record.reset_date THEN
        UPDATE public.property_limits
        SET reset_date = now() + interval '1 month', updated_at = now()
        WHERE user_id = NEW.owner_id;
        v_period_start := now();
    END IF;

    -- Live count of this owner's real (non-draft) listings created within
    -- the current billing period — the source of truth, not a stored counter.
    SELECT count(*) INTO v_current_count
    FROM public.properties
    WHERE owner_id = NEW.owner_id
      AND status <> 'draft'
      AND created_at >= v_period_start
      AND id <> NEW.id;

    IF v_current_count >= limit_record.monthly_quota THEN
        RAISE EXCEPTION 'MONTHLY_PROPERTY_LIMIT_EXCEEDED: You have reached your monthly limit of % properties.', limit_record.monthly_quota;
    END IF;

    UPDATE public.property_limits
    SET used_quota = v_current_count + 1, updated_at = now()
    WHERE user_id = NEW.owner_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger previously only fired on INSERT, so the real "draft becomes
-- submitted" transition (an UPDATE) was never checked at all.
DROP TRIGGER IF EXISTS trg_enforce_property_limit ON public.properties;
CREATE TRIGGER trg_enforce_property_limit
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.enforce_property_limit();

-- One-time data repair: reconcile every existing property_limits row's
-- used_quota with the customer's actual current non-draft listing count for
-- their open billing period, undoing the drift the old counter accumulated.
UPDATE public.property_limits pl
SET used_quota = COALESCE((
  SELECT count(*) FROM public.properties p
  WHERE p.owner_id = pl.user_id
    AND p.status <> 'draft'
    AND p.created_at >= (pl.reset_date - interval '1 month')
), 0),
updated_at = now();

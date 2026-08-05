-- Fix: enforce_property_limit trigger used NEW.user_id but properties table uses owner_id
CREATE OR REPLACE FUNCTION public.enforce_property_limit()
RETURNS TRIGGER AS $$
DECLARE
    limit_record RECORD;
BEGIN
    -- Only enforce limits for customers and owners (agents/builders usually have custom logic, but let's enforce on all for now unless overridden)
    
    -- Ensure the limit record exists
    INSERT INTO public.property_limits (user_id)
    VALUES (NEW.owner_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Fetch current limit
    SELECT * INTO limit_record FROM public.property_limits WHERE user_id = NEW.owner_id FOR UPDATE;

    -- If override is enabled, allow unlimited
    IF limit_record.override_enabled THEN
        RETURN NEW;
    END IF;

    -- Check if reset date has passed
    IF now() >= limit_record.reset_date THEN
        -- Reset quota
        UPDATE public.property_limits
        SET used_quota = 1,
            reset_date = now() + interval '1 month',
            updated_at = now()
        WHERE user_id = NEW.owner_id;
        RETURN NEW;
    END IF;

    -- Check if quota exceeded
    IF limit_record.used_quota >= limit_record.monthly_quota THEN
        RAISE EXCEPTION 'MONTHLY_PROPERTY_LIMIT_EXCEEDED: You have reached your monthly limit of % properties.', limit_record.monthly_quota;
    END IF;

    -- Increment quota
    UPDATE public.property_limits
    SET used_quota = used_quota + 1,
        updated_at = now()
    WHERE user_id = NEW.owner_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

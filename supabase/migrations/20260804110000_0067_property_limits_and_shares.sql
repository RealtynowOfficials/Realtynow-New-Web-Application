-- Phase 1: Property Limits & Share Analytics

CREATE TABLE IF NOT EXISTS public.property_limits (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    monthly_quota INT DEFAULT 2,
    used_quota INT DEFAULT 0,
    reset_date TIMESTAMPTZ DEFAULT (now() + interval '1 month'),
    override_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for property_limits
ALTER TABLE public.property_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own property limits"
    ON public.property_limits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage property limits"
    ON public.property_limits FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Trigger to auto-create property_limits when a user is created
CREATE OR REPLACE FUNCTION public.handle_new_user_limit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.property_limits (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: We assume auth.users triggers handle_new_user_limit. 
-- Since we can't easily hook auth.users here safely without breaking existing stuff,
-- we'll just upsert it when a user attempts to check their limit or insert a property.

-- Trigger function to enforce property limits before insert
CREATE OR REPLACE FUNCTION public.enforce_property_limit()
RETURNS TRIGGER AS $$
DECLARE
    limit_record RECORD;
BEGIN
    -- Only enforce limits for customers and owners (agents/builders usually have custom logic, but let's enforce on all for now unless overridden)
    
    -- Ensure the limit record exists
    INSERT INTO public.property_limits (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Fetch current limit
    SELECT * INTO limit_record FROM public.property_limits WHERE user_id = NEW.user_id FOR UPDATE;

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
        WHERE user_id = NEW.user_id;
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
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to properties table
DROP TRIGGER IF EXISTS trg_enforce_property_limit ON public.properties;
CREATE TRIGGER trg_enforce_property_limit
    BEFORE INSERT ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_property_limit();

-- Table for tracking property shares
CREATE TABLE IF NOT EXISTS public.property_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    platform TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for property_shares
ALTER TABLE public.property_shares ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a share log
CREATE POLICY "Anyone can log a share"
    ON public.property_shares FOR INSERT
    WITH CHECK (true);

-- Admins can view shares
CREATE POLICY "Admins can view shares"
    ON public.property_shares FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- RPC for logging shares safely
CREATE OR REPLACE FUNCTION public.log_property_share(p_property_id UUID, p_platform TEXT)
RETURNS void AS $$
BEGIN
    INSERT INTO public.property_shares (property_id, user_id, platform)
    VALUES (p_property_id, auth.uid(), p_platform);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to get current limit usage for the logged in user
CREATE OR REPLACE FUNCTION public.get_property_usage()
RETURNS json AS $$
DECLARE
    limit_record RECORD;
BEGIN
    -- Ensure record exists
    INSERT INTO public.property_limits (user_id)
    VALUES (auth.uid())
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO limit_record FROM public.property_limits WHERE user_id = auth.uid();

    -- Return JSON
    RETURN json_build_object(
        'monthly_quota', limit_record.monthly_quota,
        'used_quota', limit_record.used_quota,
        'reset_date', limit_record.reset_date,
        'override_enabled', limit_record.override_enabled,
        'can_publish', (limit_record.override_enabled OR limit_record.used_quota < limit_record.monthly_quota)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

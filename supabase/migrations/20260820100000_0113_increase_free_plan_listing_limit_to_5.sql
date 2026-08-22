-- Free-plan customer monthly listing limit raised from 2 to 5.
-- property_limits.monthly_quota is the DB-level source of truth enforced by
-- the trg_enforce_property_limit trigger (enforce_property_limit()); this
-- only changes the DEFAULT so brand-new customers (whose property_limits row
-- gets lazily created on first insert) start at 5. No existing row is
-- touched: all current rows already carry monthly_quota = 10000 (a prior
-- manual override), which already exceeds 5, so no free-tier customer is
-- currently capped below the new limit and no subscription/override state
-- is affected.
alter table public.property_limits
  alter column monthly_quota set default 5;

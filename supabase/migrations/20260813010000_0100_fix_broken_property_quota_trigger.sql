/*
  Critical fix: every INSERT into public.properties was failing with
  "record \"new\" has no field \"user_id\"".

  Root cause: the trg_enforce_property_quota trigger
  (check_free_user_property_quota()) references NEW.user_id in three
  places, but properties has no user_id column — the real ownership column
  is owner_id. Since this is a BEFORE INSERT trigger with no WHEN guard, it
  fired (and crashed) on every single insert into properties, regardless of
  caller (List Property wizard draft/submit, bulk import, admin-created
  rows, agent listings — all of it), rolling back the whole insert.

  This is also a pure duplicate: trg_enforce_property_limit
  (enforce_property_limit(), which correctly uses NEW.owner_id) already
  enforces the identical free-tier 2-property-per-month quota via the
  property_limits table, with more complete logic (monthly reset,
  override_enabled support). Postgres fires BEFORE triggers in
  trigger-name order, so trg_enforce_property_limit ('...limit') already
  ran and correctly bookkept the quota before trg_enforce_property_quota
  ('...quota') crashed and rolled the whole transaction back — so removing
  the broken/redundant trigger doesn't remove quota enforcement, it just
  removes the second, broken copy of it.
*/

drop trigger if exists trg_enforce_property_quota on public.properties;
drop function if exists public.check_free_user_property_quota();

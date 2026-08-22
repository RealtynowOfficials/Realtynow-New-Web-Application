/*
  Migration 0126 — Fix profiles_role_check regression blocking partner approval

  Migration 20260811000000_0089_partner_role_and_auth_fixes.sql was supposed to
  widen profiles_role_check to include 'partner' (and 'sales_executive',
  'verification_executive'). Live inspection of production shows the
  constraint currently in effect is instead the OLDER 20260726010000_0029
  version — missing 'partner' entirely (root-caused via approval_audit_logs:
  every partner approval attempt fails with "Failed to create auth user:
  Database error creating new user", because the auth.users AFTER INSERT
  trigger handle_new_user() inserts profiles.role='partner', which the live
  constraint rejects).

  This migration re-applies the intended 0089 definition. Purely additive
  (widens an existing CHECK, touches no data) and idempotent.
*/
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('customer','agent','admin','builder','partner','sales_executive','verification_executive','super_admin'));

/*
  Security fix: fn_confirm_payment was granted EXECUTE to `authenticated`,
  meaning any logged-in user could call it directly via supabase.rpc(...)
  with an arbitrary p_payment_id (including someone else's) and a fake
  p_gateway_payment_id, marking any pending payment 'paid' and activating
  the associated agent package — completely bypassing Razorpay signature
  verification, which only ever happened in the payment-gateway edge
  function's verify-payment action, never inside the RPC itself.

  Fix: the RPC becomes service-role-only. The payment-gateway edge function
  (which already calls it with the service-role key) is unaffected; only a
  browser client calling supabase.rpc('fn_confirm_payment', ...) directly
  with the anon/user JWT is now blocked. The edge function itself was
  separately hardened (payment ownership check, gateway_order_id binding,
  and making signature verification mandatory rather than conditional) in
  the same change that produced this migration.
*/

-- Postgres grants EXECUTE to the PUBLIC pseudo-role by default when a
-- function is created, and both `anon` and `authenticated` inherit through
-- PUBLIC regardless of any explicit per-role revoke — so PUBLIC must be
-- revoked too, not just `authenticated`, or the grant silently persists.
revoke execute on function public.fn_confirm_payment(uuid, text, text, text) from public;
revoke execute on function public.fn_confirm_payment(uuid, text, text, text) from anon;
revoke execute on function public.fn_confirm_payment(uuid, text, text, text) from authenticated;
grant execute on function public.fn_confirm_payment(uuid, text, text, text) to service_role;

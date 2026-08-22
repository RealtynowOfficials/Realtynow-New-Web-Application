/*
  Migration 0125 — Partner application submit RPC (fixes broken submission)

  Bug: partner-register.tsx does
    supabase.from('partner_applications').insert({...}).select('application_number').single()
  INSERT ... RETURNING requires the inserted row to also pass a SELECT policy
  (documented Postgres RLS behavior), but partner_applications has no SELECT
  policy for anon/authenticated — only partner_app_admin (admin-only). Every
  submission was failing with "new row violates row-level security policy
  for table partner_applications".

  Fix: a SECURITY DEFINER RPC that performs the insert server-side and
  returns only the generated application_number — no table-wide SELECT
  policy needed, so applicant PII (name/mobile/email/GST/PAN/address) stays
  inaccessible to anon/authenticated clients, unlike a blanket SELECT policy
  would allow.

  Also fixes the mobile-duplicate pre-check (checkMobileDuplicate on blur),
  which was silently broken for the same reason (a SELECT that RLS just
  filters to zero rows, never erroring, so the warning never showed).
*/

create or replace function public.check_partner_mobile_exists(p_mobile text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.partner_applications where mobile_number = p_mobile);
$$;

grant execute on function public.check_partner_mobile_exists(text) to anon, authenticated;

create or replace function public.submit_partner_application(p_application jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application_number text;
  v_mobile text;
begin
  v_mobile := p_application->>'mobile_number';
  if v_mobile is null or v_mobile = '' then
    raise exception 'Mobile number is required.';
  end if;

  if exists (select 1 from public.partner_applications where mobile_number = v_mobile) then
    raise exception 'A partner application already exists for this mobile number. Please contact support if this is an error.';
  end if;

  insert into public.partner_applications (
    status, partner_type, full_name, mobile_number, email, company_name,
    business_registration_number, gst_number, pan_number, years_of_experience, website,
    address_line_1, address_line_2, state, city, district, pincode,
    professional_experience, area_of_expertise, preferred_property_types, preferred_locations,
    expected_monthly_leads, current_business_volume, real_estate_experience, description,
    pan_doc_url, id_doc_url, gst_doc_url, business_reg_doc_url, address_proof_doc_url
  )
  values (
    'submitted',
    p_application->>'partner_type',
    p_application->>'full_name',
    v_mobile,
    nullif(p_application->>'email', ''),
    nullif(p_application->>'company_name', ''),
    nullif(p_application->>'business_registration_number', ''),
    nullif(p_application->>'gst_number', ''),
    nullif(p_application->>'pan_number', ''),
    nullif(p_application->>'years_of_experience', '')::int,
    nullif(p_application->>'website', ''),
    p_application->>'address_line_1',
    nullif(p_application->>'address_line_2', ''),
    p_application->>'state',
    p_application->>'city',
    nullif(p_application->>'district', ''),
    p_application->>'pincode',
    nullif(p_application->>'professional_experience', ''),
    nullif(p_application->>'area_of_expertise', ''),
    coalesce(p_application->'preferred_property_types', '[]'::jsonb),
    coalesce(p_application->'preferred_locations', '[]'::jsonb),
    nullif(p_application->>'expected_monthly_leads', '')::int,
    nullif(p_application->>'current_business_volume', ''),
    nullif(p_application->>'real_estate_experience', ''),
    nullif(p_application->>'description', ''),
    nullif(p_application->>'pan_doc_url', ''),
    nullif(p_application->>'id_doc_url', ''),
    nullif(p_application->>'gst_doc_url', ''),
    nullif(p_application->>'business_reg_doc_url', ''),
    nullif(p_application->>'address_proof_doc_url', '')
  )
  returning application_number into v_application_number;

  return v_application_number;
end;
$$;

grant execute on function public.submit_partner_application(jsonb) to anon, authenticated;

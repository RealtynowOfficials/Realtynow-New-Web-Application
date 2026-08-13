/*
  Open Plot listing flow — extends the existing properties table rather than
  creating a parallel table, mirroring the pg_details jsonb pattern already
  used for PG/CoLiving-specific fields. All plot-specific structured data
  (plot dimensions, layout/approval, features, development status, legal,
  survey, seller, pricing extras, verification checklist) lives in one new
  jsonb column so normal residential/commercial listings are untouched.

  Also adds the plot-specific property_types this flow needs (category
  'Plot') that don't already exist — 'Agricultural Land' already exists
  under category 'Commercial' and is left as-is; the wizard can still
  reference it by name.
*/

alter table public.properties add column if not exists plot_details jsonb;

insert into public.property_types (name, category)
select v.name, v.category
from (values
  ('Open Plot', 'Plot'),
  ('Residential Plot', 'Plot'),
  ('Commercial Plot', 'Plot'),
  ('Farm Land', 'Plot'),
  ('Gated Community Plot', 'Plot'),
  ('HMDA Layout Plot', 'Plot'),
  ('DTCP Layout Plot', 'Plot')
) as v(name, category)
where not exists (
  select 1 from public.property_types pt where pt.name = v.name
);

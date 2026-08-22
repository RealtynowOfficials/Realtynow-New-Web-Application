-- Customers/agents/builders were able to submit properties with price = 0
-- (or, for Rent listings, no rent_amount at all) all the way to admin approval —
-- confirmed live rows: 7 published/submitted/rejected properties with price = 0.
-- Frontend step validation existed for the customer/agent wizard's "Pricing" step
-- but the wizard's actual final Submit handler never re-checked it, so it could be
-- bypassed. This constraint is the authoritative backend enforcement: any property
-- being submitted/published/etc. (status != 'draft') must have a real price for a
-- Sale listing, or a real rent_amount for a Rent listing. Drafts are exempt (a
-- customer must be able to save an incomplete draft mid-wizard).
-- NOT VALID: skips validating the 7 existing legacy rows (already rejected/flagged),
-- enforced for every new insert/update going forward.
alter table public.properties
  add constraint chk_properties_price_positive
  check (
    status = 'draft'
    or (purpose = 'Sale' and price > 0)
    or (purpose = 'Rent' and coalesce(rent_amount, 0) > 0)
  ) not valid;

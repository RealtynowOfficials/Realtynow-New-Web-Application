-- Raises the platform-wide minimum price from "> 0" (migration 0114) to
-- ">= 1000" for any property leaving draft status, and closes a gap in the
-- original constraint: it only ever checked purpose IN ('Sale','Rent') —
-- Commercial/Lease/PG/CoLiving/Hostel/Short Stay/Vacation Rental listings
-- had NO price floor at all. Rewritten to cover every purpose: rent-like
-- purposes are checked against rent_amount, everything else (Sale,
-- Commercial, and any future purpose) against price. Mirrors the
-- RENT_LIKE_PURPOSES list in src/lib/utils.ts / src/lib/price-validation.ts
-- (the single JS-side source of truth for the same distinction).
--
-- Audited before writing this: zero existing non-draft rows currently
-- violate either the old or the new threshold (checked directly against
-- production data), so this is applied as a fully VALIDATED constraint,
-- not NOT VALID — there is nothing it would need to grandfather in.
ALTER TABLE public.properties DROP CONSTRAINT chk_properties_price_positive;

ALTER TABLE public.properties
  ADD CONSTRAINT chk_properties_price_positive
  CHECK (
    status = 'draft'
    OR (
      purpose IN ('Rent', 'Lease', 'PG', 'CoLiving', 'Hostel', 'Short Stay', 'Vacation Rental')
      AND COALESCE(rent_amount, 0) >= 1000
    )
    OR (
      purpose NOT IN ('Rent', 'Lease', 'PG', 'CoLiving', 'Hostel', 'Short Stay', 'Vacation Rental')
      AND price >= 1000
    )
  );

-- price_per_unit's own floor (0118) also needs to move from "> 0" to
-- ">= 1000", but must stay gated by draft status — the customer wizard
-- intentionally allows Save Draft with an incomplete/low price-per-unit
-- before the customer has finished the Pricing step (see list-property-
-- plot.tsx's handleSaveDraft, which has no price gate by design). Only
-- once a plot leaves draft status must its rate (if set at all) clear the
-- ₹1,000 floor.
ALTER TABLE public.properties DROP CONSTRAINT chk_properties_price_per_unit_positive;

ALTER TABLE public.properties
  ADD CONSTRAINT chk_properties_price_per_unit_positive
  CHECK (status = 'draft' OR price_per_unit IS NULL OR price_per_unit >= 1000);

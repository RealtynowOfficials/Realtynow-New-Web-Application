-- Dynamic unit-based pricing for the Open Plot listing wizard
-- (list-property-plot.tsx). Reuses the existing `plot_area` (total area)
-- and `price` (total property price) columns as the source of truth for
-- area/total-price — no duplicate columns for those. Only two genuinely
-- new facts need storing: which unit the plot is priced in, and the rate
-- per that unit. `price_unit` is deliberately NOT a separate column: it
-- would always have to equal `area_unit` (a plot's rate is always quoted
-- per the same unit its area is measured in), so a second column would
-- just be a duplicate value requiring its own drift-prevention logic —
-- `area_unit` already is the single source of truth for "which unit".
--
-- No `pricing_currency` column either: the entire platform (formatPrice/
-- formatCompactPrice, every price column, every currency symbol in the
-- UI) is INR-only today with no multi-currency support anywhere else in
-- the schema, so a per-row currency column would be dead weight that
-- forever reads 'INR'.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS area_unit text,
  ADD COLUMN IF NOT EXISTS price_per_unit numeric(14, 2);

COMMENT ON COLUMN public.properties.area_unit IS 'Unit the plot''s area/price are measured in: sqft, sqyd, acre, gunta. NULL for non-plot listings.';
COMMENT ON COLUMN public.properties.price_per_unit IS 'Rate per area_unit, in INR. properties.price (total) = plot_area * price_per_unit, enforced server-side by trg_recalculate_plot_total_price.';

ALTER TABLE public.properties
  ADD CONSTRAINT chk_properties_area_unit_valid
  CHECK (area_unit IS NULL OR area_unit IN ('sqft', 'sqyd', 'acre', 'gunta'));

ALTER TABLE public.properties
  ADD CONSTRAINT chk_properties_price_per_unit_positive
  CHECK (price_per_unit IS NULL OR price_per_unit > 0);

-- Server-side authority for the total price: whenever a Plot listing has
-- both plot_area and price_per_unit set, `price` is recomputed from them
-- on every insert/update, overriding whatever the client submitted. This
-- is the same trust boundary already used by enforce_property_limit() and
-- prevent_self_role_escalation() — a BEFORE trigger, since this flow saves
-- directly from the browser via RLS rather than through an edge function.
CREATE OR REPLACE FUNCTION public.recalculate_plot_total_price()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.listing_category = 'Plot' AND NEW.plot_area IS NOT NULL AND NEW.price_per_unit IS NOT NULL THEN
    NEW.price := round(NEW.plot_area * NEW.price_per_unit, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_recalculate_plot_total_price ON public.properties;
CREATE TRIGGER trg_recalculate_plot_total_price
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_plot_total_price();

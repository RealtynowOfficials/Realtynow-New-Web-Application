-- Migration 0123: Synchronize land/plot per-unit pricing across all land categories
-- and backfill existing listings from plot_details jsonb.

-- 1. Ensure trigger covers all land/plot categories and auto-normalizes unit codes
CREATE OR REPLACE FUNCTION public.recalculate_plot_total_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize area_unit if provided in display format
  IF NEW.area_unit IS NOT NULL THEN
    IF LOWER(NEW.area_unit) IN ('sq. ft', 'sq. ft.', 'sqft', 'sq feet', 'square feet', 'sft') THEN
      NEW.area_unit := 'sqft';
    ELSIF LOWER(NEW.area_unit) IN ('sq. yd', 'sq. yards', 'sq. yard', 'sqyd', 'square yards', 'syd') THEN
      NEW.area_unit := 'sqyd';
    ELSIF LOWER(NEW.area_unit) IN ('acre', 'acres', 'ac') THEN
      NEW.area_unit := 'acre';
    ELSIF LOWER(NEW.area_unit) IN ('gunta', 'guntas', 'guntha', 'gunthas', 'gts') THEN
      NEW.area_unit := 'gunta';
    END IF;
  END IF;

  -- If plot_area and price_per_unit are set on any land/plot property, compute total price
  IF NEW.plot_area IS NOT NULL AND NEW.price_per_unit IS NOT NULL AND NEW.price_per_unit > 0 THEN
    IF NEW.listing_category IN ('Plot', 'Land') 
       OR NEW.property_sub_type ILIKE '%plot%' 
       OR NEW.property_sub_type ILIKE '%land%'
       OR NEW.title ILIKE '%plot%' 
       OR NEW.title ILIKE '%land%' THEN
      NEW.price := round(NEW.plot_area * NEW.price_per_unit, 2);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Backfill existing records from plot_details jsonb where top-level fields are NULL
DO $$
DECLARE
  r RECORD;
  v_area_unit text;
  v_price_per_unit numeric;
  v_total_area numeric;
BEGIN
  FOR r IN 
    SELECT id, status, plot_details, plot_area, area_unit, price_per_unit, price 
    FROM public.properties 
    WHERE plot_details IS NOT NULL
  LOOP
    v_area_unit := r.area_unit;
    v_price_per_unit := r.price_per_unit;
    v_total_area := r.plot_area;

    -- Extract from plot_details if missing on row
    IF v_area_unit IS NULL AND (r.plot_details->>'areaUnit') IS NOT NULL THEN
      IF LOWER(r.plot_details->>'areaUnit') IN ('sq. ft', 'sq. ft.', 'sqft', 'sq feet', 'square feet', 'sft') THEN
        v_area_unit := 'sqft';
      ELSIF LOWER(r.plot_details->>'areaUnit') IN ('sq. yd', 'sq. yards', 'sq. yard', 'sqyd', 'square yards', 'syd') THEN
        v_area_unit := 'sqyd';
      ELSIF LOWER(r.plot_details->>'areaUnit') IN ('acre', 'acres', 'ac') THEN
        v_area_unit := 'acre';
      ELSIF LOWER(r.plot_details->>'areaUnit') IN ('gunta', 'guntas', 'guntha', 'gunthas', 'gts') THEN
        v_area_unit := 'gunta';
      END IF;
    END IF;

    IF v_price_per_unit IS NULL AND (r.plot_details->>'pricePerUnit') IS NOT NULL THEN
      BEGIN
        v_price_per_unit := (r.plot_details->>'pricePerUnit')::numeric;
      EXCEPTION WHEN OTHERS THEN
        v_price_per_unit := NULL;
      END;
    END IF;

    IF v_total_area IS NULL AND (r.plot_details->>'totalArea') IS NOT NULL THEN
      BEGIN
        v_total_area := (r.plot_details->>'totalArea')::numeric;
      EXCEPTION WHEN OTHERS THEN
        v_total_area := NULL;
      END;
    END IF;

    -- Validate area_unit against allowed units
    IF v_area_unit IS NOT NULL AND v_area_unit NOT IN ('sqft', 'sqyd', 'acre', 'gunta') THEN
      v_area_unit := NULL;
    END IF;

    -- Validate plot_area
    IF v_total_area IS NOT NULL AND v_total_area <= 0 THEN
      v_total_area := NULL;
    END IF;

    -- Validate price_per_unit against chk_properties_price_per_unit_positive constraint:
    -- Non-draft rows require price_per_unit >= 1000 or NULL. Draft rows require > 0 or NULL.
    IF v_price_per_unit IS NOT NULL THEN
      IF (r.status <> 'draft' AND v_price_per_unit < 1000) OR v_price_per_unit <= 0 THEN
        v_price_per_unit := NULL;
      END IF;
    END IF;

    -- Update row with validated values
    IF v_area_unit IS DISTINCT FROM r.area_unit 
       OR v_price_per_unit IS DISTINCT FROM r.price_per_unit 
       OR v_total_area IS DISTINCT FROM r.plot_area THEN
      UPDATE public.properties
      SET area_unit = v_area_unit,
          price_per_unit = v_price_per_unit,
          plot_area = v_total_area
      WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- ==============================================================================
-- Migration: 20260901120000_0141_property_categories_taxonomy.sql
-- Description: Unified Property Taxonomy & Real-Time Category Aggregation Engine
-- ==============================================================================

-- 1. Create property_categories table
CREATE TABLE IF NOT EXISTS public.property_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('residential', 'commercial')),
  description TEXT,
  icon TEXT,
  parent_category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_categories_public_read" ON public.property_categories;
CREATE POLICY "property_categories_public_read"
  ON public.property_categories
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR (auth.jwt() ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "property_categories_admin_write" ON public.property_categories;
CREATE POLICY "property_categories_admin_write"
  ON public.property_categories
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Seed 12 Residential & 5 Commercial Categories
INSERT INTO public.property_categories (name, slug, type, description, icon, sort_order, is_active)
VALUES
  -- Residential
  ('Independent Houses', 'independent-houses', 'residential', 'Standalone residential homes & independent villas', 'Home', 1, true),
  ('Apartment Flats', 'apartment-flats', 'residential', 'Modern apartments, high-rises & flats', 'Building', 2, true),
  ('Gated Community Homes', 'gated-community-homes', 'residential', 'Secure gated community residences & townships', 'ShieldCheck', 3, true),
  ('Open Plots & Land', 'open-plots-land', 'residential', 'HMDA/DTCP approved residential & commercial plots', 'LandPlot', 4, true),
  ('Luxury Villas', 'luxury-villas', 'residential', 'High-end luxury villas & bespoke estates', 'Sparkles', 5, true),
  ('Farm Houses', 'farm-houses', 'residential', 'Serene agricultural retreats & farm houses', 'Trees', 6, true),
  ('New Projects', 'new-projects', 'residential', 'Newly launched RERA-registered developer projects', 'Construction', 7, true),
  ('Duplex Houses', 'duplex-houses', 'residential', 'Spacious multi-level duplex living', 'Layers', 8, true),
  ('Pent Houses', 'pent-houses', 'residential', 'Exclusive skyline luxury penthouses', 'Building2', 9, true),
  ('Agriculture Land', 'agriculture-land', 'residential', 'Fertile agricultural land & farm acreage', 'Sprout', 10, true),
  ('Owner Properties', 'owner-properties', 'residential', 'Direct zero-brokerage owner listings', 'UserCheck', 11, true),
  ('Builder Share Properties', 'builder-share-properties', 'residential', 'Direct builder floor & investor share units', 'Handshake', 12, true),
  -- Commercial
  ('Commercial Spaces', 'commercial-spaces', 'commercial', 'Grade-A corporate office & IT park spaces', 'Briefcase', 1, true),
  ('Shops & Showrooms', 'shops-showrooms', 'commercial', 'Prime high-visibility retail & showroom spaces', 'Store', 2, true),
  ('Shopping Malls', 'shopping-malls', 'commercial', 'Retail multiplex & shopping complex units', 'ShoppingBag', 3, true),
  ('Godowns / Warehouses', 'godowns-warehouses', 'commercial', 'Industrial logistics hubs & storage godowns', 'Warehouse', 4, true),
  ('PG & Co-Living Spaces', 'pg-coliving-spaces', 'commercial', 'Hostels, co-living & shared accommodations', 'Users', 5, true)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- 3. Stored procedure for ultra-fast, location-aware & transaction-aware category count aggregation
CREATE OR REPLACE FUNCTION public.get_property_category_counts(
  p_city TEXT DEFAULT NULL,
  p_purpose TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_city_filter TEXT := NULLIF(TRIM(p_city), '');
  v_purpose_filter TEXT := NULLIF(TRIM(p_purpose), '');
BEGIN
  WITH live_props AS (
    SELECT
      p.id,
      p.title,
      p.description,
      p.purpose,
      p.price,
      p.is_luxury,
      p.listing_category,
      p.property_sub_type,
      p.verified_status,
      p.project_id,
      p.builder_id,
      p.owner_id,
      p.assigned_agent_id,
      p.plot_details,
      p.features,
      COALESCE(c.name, p.features->>'city_name') AS city_name,
      pt.name AS property_type_name,
      pt.category AS property_type_category
    FROM public.properties p
    LEFT JOIN public.cities c ON c.id = p.city_id
    LEFT JOIN public.property_types pt ON pt.id = p.property_type_id
    WHERE (p.status IN ('published', 'live') OR p.is_live = true)
      AND (p.is_draft IS NULL OR p.is_draft = false)
      AND (p.deleted_at IS NULL)
      AND (
        v_city_filter IS NULL
        OR c.name ILIKE '%' || v_city_filter || '%'
        OR (p.features->>'city_name') ILIKE '%' || v_city_filter || '%'
        OR p.address ILIKE '%' || v_city_filter || '%'
      )
      AND (
        v_purpose_filter IS NULL
        OR (v_purpose_filter ILIKE 'buy%' AND (p.purpose ILIKE '%buy%' OR p.purpose ILIKE '%sale%'))
        OR (v_purpose_filter ILIKE 'rent%' AND (p.purpose ILIKE '%rent%' OR p.purpose ILIKE '%lease%'))
        OR (v_purpose_filter ILIKE 'commercial%' AND (pt.category ILIKE '%commercial%' OR p.listing_category ILIKE '%commercial%'))
      )
  ),
  counts AS (
    SELECT
      -- Residential
      COUNT(*) FILTER (
        WHERE property_type_name ILIKE '%independent house%'
           OR property_sub_type ILIKE '%independent house%'
           OR title ILIKE '%independent house%'
           OR (title ILIKE '%house%' AND property_type_name NOT ILIKE '%farm%')
           OR property_type_name ILIKE '%house%'
      ) AS count_independent_houses,

      COUNT(*) FILTER (
        WHERE property_type_name ILIKE '%apartment%'
           OR property_type_name ILIKE '%flat%'
           OR property_sub_type ILIKE '%flat%'
           OR property_sub_type ILIKE '%apartment%'
           OR title ILIKE '%flat%'
           OR title ILIKE '%apartment%'
      ) AS count_apartment_flats,

      COUNT(*) FILTER (
        WHERE property_type_name ILIKE '%gated%'
           OR property_sub_type ILIKE '%gated%'
           OR title ILIKE '%gated%'
           OR features->>'gated_community' = 'true'
      ) AS count_gated_community_homes,

      COUNT(*) FILTER (
        WHERE property_type_category ILIKE '%plot%'
           OR listing_category ILIKE '%plot%'
           OR plot_details IS NOT NULL
           OR property_type_name ILIKE '%plot%'
           OR title ILIKE '%plot%'
      ) AS count_open_plots_land,

      COUNT(*) FILTER (
        WHERE is_luxury = true
           OR property_type_name ILIKE '%luxury villa%'
           OR property_type_name ILIKE '%villa%'
           OR property_sub_type ILIKE '%villa%'
           OR title ILIKE '%villa%'
      ) AS count_luxury_villas,

      COUNT(*) FILTER (
        WHERE property_type_name ILIKE '%farm%'
           OR property_sub_type ILIKE '%farm%'
           OR title ILIKE '%farm house%'
           OR title ILIKE '%farmhouse%'
      ) AS count_farm_houses,

      COUNT(*) FILTER (
        WHERE project_id IS NOT NULL
           OR property_type_name ILIKE '%project%'
           OR title ILIKE '%new project%'
      ) AS count_new_projects,

      COUNT(*) FILTER (
        WHERE property_type_name ILIKE '%duplex%'
           OR property_sub_type ILIKE '%duplex%'
           OR title ILIKE '%duplex%'
      ) AS count_duplex_houses,

      COUNT(*) FILTER (
        WHERE property_type_name ILIKE '%penthouse%'
           OR property_sub_type ILIKE '%penthouse%'
           OR title ILIKE '%penthouse%'
           OR title ILIKE '%pent house%'
      ) AS count_pent_houses,

      COUNT(*) FILTER (
        WHERE property_type_name ILIKE '%agricultural%'
           OR property_sub_type ILIKE '%agricultural%'
           OR title ILIKE '%agriculture%'
           OR title ILIKE '%agricultural%'
           OR title ILIKE '%farm land%'
      ) AS count_agriculture_land,

      COUNT(*) FILTER (
        WHERE verified_status = 'Owner Listed'
           OR (owner_id IS NOT NULL AND assigned_agent_id IS NULL AND builder_id IS NULL)
      ) AS count_owner_properties,

      COUNT(*) FILTER (
        WHERE builder_id IS NOT NULL
           OR verified_status = 'Builder Listed'
           OR property_type_name ILIKE '%builder floor%'
           OR property_sub_type ILIKE '%builder share%'
      ) AS count_builder_share_properties,

      -- Commercial
      COUNT(*) FILTER (
        WHERE property_type_category ILIKE '%commercial%'
           OR listing_category ILIKE '%commercial%'
           OR property_type_name ILIKE '%office%'
           OR property_type_name ILIKE '%commercial%'
           OR title ILIKE '%office%'
           OR title ILIKE '%commercial%'
      ) AS count_commercial_spaces,

      COUNT(*) FILTER (
        WHERE property_type_name ILIKE '%shop%'
           OR property_type_name ILIKE '%showroom%'
           OR property_sub_type ILIKE '%shop%'
           OR property_sub_type ILIKE '%showroom%'
           OR title ILIKE '%shop%'
           OR title ILIKE '%showroom%'
      ) AS count_shops_showrooms,

      COUNT(*) FILTER (
        WHERE property_type_name ILIKE '%mall%'
           OR property_type_name ILIKE '%complex%'
           OR title ILIKE '%shopping mall%'
           OR title ILIKE '%mall%'
      ) AS count_shopping_malls,

      COUNT(*) FILTER (
        WHERE property_type_name ILIKE '%warehouse%'
           OR property_type_name ILIKE '%godown%'
           OR property_sub_type ILIKE '%warehouse%'
           OR property_sub_type ILIKE '%godown%'
           OR title ILIKE '%warehouse%'
           OR title ILIKE '%godown%'
      ) AS count_godowns_warehouses,

      COUNT(*) FILTER (
        WHERE purpose = 'PG'
           OR property_type_name ILIKE '%co-living%'
           OR property_type_name ILIKE '%pg%'
           OR property_type_name ILIKE '%hostel%'
           OR property_sub_type ILIKE '%co-living%'
           OR title ILIKE '%co-living%'
           OR title ILIKE '%pg %'
      ) AS count_pg_coliving_spaces,

      COUNT(*) AS total_count
    FROM live_props
  )
  SELECT jsonb_build_object(
    'city', v_city_filter,
    'total_count', c.total_count,
    'counts', jsonb_build_object(
      'independent-houses', c.count_independent_houses,
      'apartment-flats', c.count_apartment_flats,
      'gated-community-homes', c.count_gated_community_homes,
      'open-plots-land', c.count_open_plots_land,
      'luxury-villas', c.count_luxury_villas,
      'farm-houses', c.count_farm_houses,
      'new-projects', c.count_new_projects,
      'duplex-houses', c.count_duplex_houses,
      'pent-houses', c.count_pent_houses,
      'agriculture-land', c.count_agriculture_land,
      'owner-properties', c.count_owner_properties,
      'builder-share-properties', c.count_builder_share_properties,
      'commercial-spaces', c.count_commercial_spaces,
      'shops-showrooms', c.count_shops_showrooms,
      'shopping-malls', c.count_shopping_malls,
      'godowns-warehouses', c.count_godowns_warehouses,
      'pg-coliving-spaces', c.count_pg_coliving_spaces
    )
  ) INTO v_result
  FROM counts c;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_property_category_counts(TEXT, TEXT) TO anon, authenticated;

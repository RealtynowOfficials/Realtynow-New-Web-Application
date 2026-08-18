-- Migration: 20260817093000_0107_seed_eight_hd_hero_campaigns.sql
-- Description: Seed 8 high-definition property campaigns and features for public homepage hero carousel.

DO $$
DECLARE
  v_hyd_city_id UUID;
  v_c1_id UUID;
  v_c2_id UUID;
  v_c3_id UUID;
  v_c4_id UUID;
  v_c5_id UUID;
  v_c6_id UUID;
  v_c7_id UUID;
  v_c8_id UUID;
BEGIN
  SELECT id INTO v_hyd_city_id FROM public.cities WHERE name = 'Hyderabad' LIMIT 1;

  -- 1. Signature Villas & Private Mansions
  INSERT INTO public.hero_campaigns (
    title, subtitle, description, banner_image, mobile_banner,
    cta_text, cta_url, city_id, campaign_type, priority, order_no,
    status, rera_number, overlay_position, overlay_opacity, content_alignment,
    package_tier, is_pinned
  ) VALUES (
    'SIGNATURE VILLAS & PRIVATE MANSIONS',
    'The Crown Enclave — Kokapet & Jubilee Hills Luxury Living',
    'Ultra-luxury independent villas with heated private pools, designer landscaping, and smart home automation.',
    '/hero-villa-luxury.jpg', '/hero-villa-luxury.jpg',
    'Explore Villas', '/search?type=Villa', v_hyd_city_id, 'Paid', 10, 1,
    'Active', 'RERA No.: P02400007205 | Ultra-Luxury Gated Community', 'left', 0.88, 'left',
    'Platinum', true
  ) RETURNING id INTO v_c1_id;

  INSERT INTO public.hero_campaign_features (hero_campaign_id, feature_text, display_order) VALUES
    (v_c1_id, 'Private Heated Swimming Pools & Landscaped Terraces', 1),
    (v_c1_id, '4, 5 & 6 BHK Independent Villas on 500-1200 Sq.Yards', 2),
    (v_c1_id, '10-Minute Drive to Financial District & HITEC City', 3),
    (v_c1_id, '100% Vastu Compliant with 4-Car Covered Parking', 4);

  -- 2. Premium Lake-Facing Residences
  INSERT INTO public.hero_campaigns (
    title, subtitle, description, banner_image, mobile_banner,
    cta_text, cta_url, city_id, campaign_type, priority, order_no,
    status, rera_number, overlay_position, overlay_opacity, content_alignment,
    package_tier, is_pinned
  ) VALUES (
    'PREMIUM LAKE-FACING RESIDENCES',
    'My Home Sayuk & Marina Heights — Tellapur, Financial District',
    'Modern high-rise residential towers overlooking pristine waters with panoramic skyline balconies.',
    '/hero-lake-apartments.jpg', '/hero-lake-apartments.jpg',
    'View Apartments', '/search?category=apartment', v_hyd_city_id, 'Paid', 9, 2,
    'Active', 'RERA No.: P02400003891 | HMDA Approved High-Rise', 'right', 0.88, 'left',
    'Platinum', false
  ) RETURNING id INTO v_c2_id;

  INSERT INTO public.hero_campaign_features (hero_campaign_id, feature_text, display_order) VALUES
    (v_c2_id, 'Zero Brokerage & AI-Assisted Site Visits', 1),
    (v_c2_id, '2, 2.5 & 3 BHK Starting from ₹ 1.25 Cr', 2),
    (v_c2_id, 'Over 50+ World-Class Resort Style Lifestyle Amenities', 3),
    (v_c2_id, 'Panoramic Lake Views with 80% Green Open Spaces', 4);

  -- 3. Premium HMDA & RERA Approved Plots
  INSERT INTO public.hero_campaigns (
    title, subtitle, description, banner_image, mobile_banner,
    cta_text, cta_url, city_id, campaign_type, priority, order_no,
    status, rera_number, overlay_position, overlay_opacity, content_alignment,
    package_tier, is_pinned
  ) VALUES (
    'PREMIUM HMDA & RERA APPROVED PLOTS',
    'Greenwood County — Mokila & Shankarpalli Growth Corridor',
    'Master-planned villa plots with wide black-top roads, underground utilities, and grand clubhouse.',
    '/hero-open-plots.jpg', '/hero-open-plots.jpg',
    'Explore Plots', '/plots', v_hyd_city_id, 'Paid', 8, 3,
    'Active', 'RERA No.: P02400005512 | 100% Clear Title Plots', 'left', 0.88, 'left',
    'Gold', false
  ) RETURNING id INTO v_c3_id;

  INSERT INTO public.hero_campaign_features (hero_campaign_id, feature_text, display_order) VALUES
    (v_c3_id, '200 to 1,000 Sq.Yards Villa Plots with Immediate Registration', 1),
    (v_c3_id, '60ft & 40ft Black-Top Roads with Underground Utilities', 2),
    (v_c3_id, '15 Minutes to Neopolis & Outer Ring Road (ORR Exit 1)', 3),
    (v_c3_id, 'Gated Community with 24/7 Security & Grand Clubhouse', 4);

  -- 4. Grade-A Commercial & IT Parks
  INSERT INTO public.hero_campaigns (
    title, subtitle, description, banner_image, mobile_banner,
    cta_text, cta_url, city_id, campaign_type, priority, order_no,
    status, rera_number, overlay_position, overlay_opacity, content_alignment,
    package_tier, is_pinned
  ) VALUES (
    'GRADE-A COMMERCIAL & IT PARKS',
    'Cyber Gateway Towers — HITEC City & Gachibowli',
    'State-of-the-art corporate office buildings, retail spaces, and pre-leased investment assets.',
    '/hero-commercial-it.jpg', '/hero-commercial-it.jpg',
    'Explore Commercial', '/commercial', v_hyd_city_id, 'Paid', 7, 4,
    'Active', 'RERA No.: P02400008890 | Ready-to-Occupy Commercial', 'right', 0.88, 'left',
    'Platinum', false
  ) RETURNING id INTO v_c4_id;

  INSERT INTO public.hero_campaign_features (hero_campaign_id, feature_text, display_order) VALUES
    (v_c4_id, '5,000 to 1,00,000 Sq.Ft Pre-Leased & Bare-Shell Offices', 1),
    (v_c4_id, 'High Rental Yields up to 9.2% with Fortune 500 Tenants', 2),
    (v_c4_id, 'IGBC Platinum Rated Green Building with 100% Power Backup', 3),
    (v_c4_id, 'Direct Metro Connectivity & Multi-Level Car Parking', 4);

  -- 5. Exclusive Sky Penthouses & Duplexes
  INSERT INTO public.hero_campaigns (
    title, subtitle, description, banner_image, mobile_banner,
    cta_text, cta_url, city_id, campaign_type, priority, order_no,
    status, rera_number, overlay_position, overlay_opacity, content_alignment,
    package_tier, is_pinned
  ) VALUES (
    'EXCLUSIVE SKY PENTHOUSES & DUPLEXES',
    'The Horizon Heights — Banjara Hills Road No. 12',
    'Unmatched luxury penthouses overlooking KBR National Park with private elevators and sky decks.',
    '/hero-penthouse-sky.jpg', '/hero-penthouse-sky.jpg',
    'View Penthouses', '/search?luxury=1', v_hyd_city_id, 'Paid', 6, 5,
    'Active', 'RERA No.: P02400009123 | Limited Edition Residences', 'left', 0.88, 'left',
    'Platinum', false
  ) RETURNING id INTO v_c5_id;

  INSERT INTO public.hero_campaign_features (hero_campaign_id, feature_text, display_order) VALUES
    (v_c5_id, '360° City Skyline & KBR National Park Panoramic Views', 1),
    (v_c5_id, 'Private High-Speed Elevators Opening Directly into Foyer', 2),
    (v_c5_id, 'Double-Height Living Ceilings with Italian Marble & Jacuzzi', 3),
    (v_c5_id, '24/7 Concierge Services, Private Helipad & Sky Lounge', 4);

  -- 6. Next-Gen Smart Homes Near IT Corridor
  INSERT INTO public.hero_campaigns (
    title, subtitle, description, banner_image, mobile_banner,
    cta_text, cta_url, city_id, campaign_type, priority, order_no,
    status, rera_number, overlay_position, overlay_opacity, content_alignment,
    package_tier, is_pinned
  ) VALUES (
    'NEXT-GEN SMART HOMES NEAR IT CORRIDOR',
    'Aparna CyberLife — Gachibowli Financial District',
    'Modern gated community residences equipped with IoT smart automation and resort lifestyle amenities.',
    '/hero-gated-community.jpg', '/hero-gated-community.jpg',
    'Explore Smart Homes', '/search?purpose=Buy', v_hyd_city_id, 'Paid', 5, 6,
    'Active', 'RERA No.: P01100004147 | Walk-to-Work Living', 'right', 0.88, 'left',
    'Gold', false
  ) RETURNING id INTO v_c6_id;

  INSERT INTO public.hero_campaign_features (hero_campaign_id, feature_text, display_order) VALUES
    (v_c6_id, 'Automated Lighting, Climate Control & Biometric Locks', 1),
    (v_c6_id, '2, 3 & 4 BHK Designer Apartments Starting ₹ 95 Lakhs', 2),
    (v_c6_id, 'Olympic Size Swimming Pool, Tennis Courts & Co-Working Cafe', 3),
    (v_c6_id, '5 Minutes to Microsoft, Google & Amazon Headquarters', 4);

  -- 7. Eco-Luxury Farmhouses & Resort Living
  INSERT INTO public.hero_campaigns (
    title, subtitle, description, banner_image, mobile_banner,
    cta_text, cta_url, city_id, campaign_type, priority, order_no,
    status, rera_number, overlay_position, overlay_opacity, content_alignment,
    package_tier, is_pinned
  ) VALUES (
    'ECO-LUXURY FARMHOUSES & RESORT LIVING',
    'Serene Meadows — Gandipet & Osman Sagar Enclave',
    'Sprawling countryside farmhouse estates with organic orchards, natural lakes, and private wellness club.',
    '/hero-luxury-farmhouse.jpg', '/hero-luxury-farmhouse.jpg',
    'View Farmhouses', '/search?q=Farmhouse', v_hyd_city_id, 'Paid', 4, 7,
    'Active', 'HMDA & DTCP Approved | Pollution-Free Green Sanctuary', 'left', 0.88, 'left',
    'Gold', false
  ) RETURNING id INTO v_c7_id;

  INSERT INTO public.hero_campaign_features (hero_campaign_id, feature_text, display_order) VALUES
    (v_c7_id, '0.5 to 2 Acre Gated Farmhouse Plots with Organic Orchard', 1),
    (v_c7_id, 'Private Clubhouse, Organic Farming Zone & Nature Trails', 2),
    (v_c7_id, '25 Minutes from Gachibowli via Outer Ring Road', 3),
    (v_c7_id, 'Solar Powered Sustainable Living with Rainwater Harvesting', 4);

  -- 8. New Launch: Neopolis Integrated Township
  INSERT INTO public.hero_campaigns (
    title, subtitle, description, banner_image, mobile_banner,
    cta_text, cta_url, city_id, campaign_type, priority, order_no,
    status, rera_number, overlay_position, overlay_opacity, content_alignment,
    package_tier, is_pinned
  ) VALUES (
    'NEW LAUNCH: NEOPOLIS INTEGRATED TOWNSHIP',
    'Prestige Clairemont — The Future of Urban Hyderabad',
    'Iconic 60-storey twin towers featuring skybridge connectivity and high-speed transit access.',
    '/hero-township-neopolis.jpg', '/hero-township-neopolis.jpg',
    'Explore New Launches', '/projects', v_hyd_city_id, 'Paid', 3, 8,
    'Active', 'RERA No.: P02400009944 | Phase 1 Early Booking Open', 'right', 0.88, 'left',
    'Platinum', false
  ) RETURNING id INTO v_c8_id;

  INSERT INTO public.hero_campaign_features (hero_campaign_id, feature_text, display_order) VALUES
    (v_c8_id, '60-Storey Iconic Twin Towers with Skybridge & Skywalk', 1),
    (v_c8_id, 'Special Pre-Launch Pricing & Flexible 10:90 Payment Plans', 2),
    (v_c8_id, '1 Lakh Sq.Ft Mega Clubhouse with 70+ Sporting Facilities', 3),
    (v_c8_id, 'Direct Access to Trumpet Interchange & Regional Ring Road', 4);

END $$;

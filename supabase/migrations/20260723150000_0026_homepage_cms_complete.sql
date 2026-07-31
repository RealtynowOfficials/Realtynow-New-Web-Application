-- ============================================================
-- 0026: Homepage CMS — Complete Enterprise Schema
-- ============================================================

-- ── 1. MASTER SECTIONS TABLE (controls visibility & order) ──
CREATE TABLE IF NOT EXISTS cms_sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key     TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  is_visible      BOOLEAN DEFAULT TRUE,
  sort_order      INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'published' CHECK (status IN ('draft','published','scheduled')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. HERO SECTION ──
CREATE TABLE IF NOT EXISTS cms_hero (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL DEFAULT 'Find Your Perfect Place to Call Home',
  subtitle            TEXT DEFAULT 'Search smarter, decide faster, and move ahead with AI insights.',
  badge_text          TEXT DEFAULT 'AI-Powered Real Estate Platform',
  bg_image_url        TEXT,
  bg_video_url        TEXT,
  desktop_banner_url  TEXT,
  tablet_banner_url   TEXT,
  mobile_banner_url   TEXT,
  ai_image_url        TEXT,
  primary_btn_text    TEXT DEFAULT 'Search Properties',
  primary_btn_link    TEXT DEFAULT '/search',
  secondary_btn_text  TEXT DEFAULT 'AI Advisor',
  secondary_btn_link  TEXT DEFAULT '/ai-advisor',
  stats               JSONB DEFAULT '[
    {"label":"Verified Properties","value":15000,"suffix":"+"},
    {"label":"Happy Customers","value":50000,"suffix":"+"},
    {"label":"Cities Covered","value":25,"suffix":"+"},
    {"label":"Expert Agents","value":2000,"suffix":"+"}
  ]'::jsonb,
  trust_badges        JSONB DEFAULT '["Verified Properties","RERA Approved","Verified Builders","Verified Agents","AI Verified Listings","100% Secure"]'::jsonb,
  is_visible          BOOLEAN DEFAULT TRUE,
  status              TEXT DEFAULT 'published',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. AI SEARCH CONFIG ──
CREATE TABLE IF NOT EXISTS cms_search_config (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  heading             TEXT DEFAULT 'AI-Powered Property Search',
  sub_heading         TEXT DEFAULT 'Find your perfect property with intelligent search',
  search_placeholder  TEXT DEFAULT 'Search by city, locality, project or builder...',
  enable_voice        BOOLEAN DEFAULT TRUE,
  enable_image_search BOOLEAN DEFAULT TRUE,
  popular_searches    JSONB DEFAULT '["3BHK under 80 Lakhs in Hyderabad","Luxury Villa in Hyderabad","Commercial Office Near Metro","Best Investment Property under 50L","Ready To Move","New Projects"]'::jsonb,
  trending_searches   JSONB DEFAULT '["Gachibowli Flats","Kondapur Villas","HITEC City Office"]'::jsonb,
  search_tabs         JSONB DEFAULT '["Buy","Rent","Commercial","Plots","Projects"]'::jsonb,
  is_visible          BOOLEAN DEFAULT TRUE,
  status              TEXT DEFAULT 'published',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. PROPERTY CATEGORIES ──
CREATE TABLE IF NOT EXISTS cms_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  icon        TEXT,
  image_url   TEXT,
  description TEXT,
  slug        TEXT UNIQUE NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  is_visible  BOOLEAN DEFAULT TRUE,
  status      TEXT DEFAULT 'published',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. FEATURED PROPERTIES CONFIG ──
CREATE TABLE IF NOT EXISTS cms_featured_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key     TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  subtitle        TEXT,
  display_type    TEXT DEFAULT 'auto' CHECK (display_type IN ('auto','manual')),
  max_records     INTEGER DEFAULT 6,
  sort_order_col  TEXT DEFAULT 'is_featured',
  view_all_link   TEXT DEFAULT '/search',
  view_all_text   TEXT DEFAULT 'View All',
  is_visible      BOOLEAN DEFAULT TRUE,
  status          TEXT DEFAULT 'published',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. TRENDING LOCATIONS ──
CREATE TABLE IF NOT EXISTS cms_trending_locations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  city              TEXT,
  image_url         TEXT,
  property_count    INTEGER DEFAULT 0,
  growth_pct        NUMERIC(5,2) DEFAULT 0,
  slug              TEXT,
  sort_order        INTEGER DEFAULT 0,
  is_visible        BOOLEAN DEFAULT TRUE,
  status            TEXT DEFAULT 'published',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. DISCOVERY FEATURES ──
CREATE TABLE IF NOT EXISTS cms_discovery_features (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  link        TEXT,
  color       TEXT DEFAULT 'from-red-500 to-rose-600',
  sort_order  INTEGER DEFAULT 0,
  is_visible  BOOLEAN DEFAULT TRUE,
  status      TEXT DEFAULT 'published',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. TOP CITIES ──
CREATE TABLE IF NOT EXISTS cms_top_cities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  state           TEXT,
  image_url       TEXT,
  description     TEXT,
  property_count  INTEGER DEFAULT 0,
  slug            TEXT,
  sort_order      INTEGER DEFAULT 0,
  is_visible      BOOLEAN DEFAULT TRUE,
  status          TEXT DEFAULT 'published',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. TOP AGENTS (CMS override) ──
CREATE TABLE IF NOT EXISTS cms_top_agents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  photo_url       TEXT,
  designation     TEXT DEFAULT 'Real Estate Consultant',
  experience_yrs  INTEGER DEFAULT 1,
  rating          NUMERIC(3,2) DEFAULT 4.5,
  deals_closed    INTEGER DEFAULT 0,
  phone           TEXT,
  whatsapp        TEXT,
  email           TEXT,
  sort_order      INTEGER DEFAULT 0,
  is_visible      BOOLEAN DEFAULT TRUE,
  status          TEXT DEFAULT 'published',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 10. EMI CALCULATOR CONFIG ──
CREATE TABLE IF NOT EXISTS cms_emi_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  heading         TEXT DEFAULT 'EMI Calculator',
  description     TEXT DEFAULT 'Plan your home loan easily',
  bg_image_url    TEXT,
  default_amount  NUMERIC DEFAULT 5000000,
  default_rate    NUMERIC DEFAULT 8.5,
  default_years   INTEGER DEFAULT 20,
  cta_text        TEXT DEFAULT 'Apply for Home Loan',
  cta_link        TEXT DEFAULT '/contact?service=Home+Loan+Assistance',
  is_visible      BOOLEAN DEFAULT TRUE,
  status          TEXT DEFAULT 'published',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 11. PROPERTY SERVICES (CMS) ──
CREATE TABLE IF NOT EXISTS cms_services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  icon        TEXT DEFAULT 'Wrench',
  description TEXT,
  brand       TEXT,
  btn_text    TEXT DEFAULT 'Book Now',
  btn_link    TEXT,
  color_class TEXT DEFAULT 'bg-primary-50 text-primary-600',
  sort_order  INTEGER DEFAULT 0,
  is_visible  BOOLEAN DEFAULT TRUE,
  status      TEXT DEFAULT 'published',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 12. INTERIOR DESIGN SERVICES ──
CREATE TABLE IF NOT EXISTS cms_interior_services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL,
  description TEXT,
  icon        TEXT DEFAULT 'PaintBucket',
  color       TEXT DEFAULT 'from-violet-500 to-purple-600',
  link        TEXT DEFAULT '/contact?service=Born+Interiors+Design',
  sort_order  INTEGER DEFAULT 0,
  is_visible  BOOLEAN DEFAULT TRUE,
  status      TEXT DEFAULT 'published',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 13. HOME SERVICES ──
CREATE TABLE IF NOT EXISTS cms_home_services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL,
  description TEXT,
  icon        TEXT DEFAULT 'Hammer',
  color       TEXT DEFAULT 'from-blue-500 to-blue-700',
  bg_class    TEXT DEFAULT 'bg-blue-50',
  link        TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_visible  BOOLEAN DEFAULT TRUE,
  status      TEXT DEFAULT 'published',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 14. BANNERS / ADVERTISEMENTS ──
CREATE TABLE IF NOT EXISTS cms_banners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  subtitle        TEXT,
  desktop_img     TEXT,
  mobile_img      TEXT,
  tablet_img      TEXT,
  btn_text        TEXT,
  btn_link        TEXT,
  position        TEXT DEFAULT 'home_middle' CHECK (position IN ('home_top','home_middle','home_bottom','search_top','search_sidebar','property_detail')),
  priority        INTEGER DEFAULT 0,
  start_date      DATE,
  end_date        DATE,
  is_visible      BOOLEAN DEFAULT TRUE,
  status          TEXT DEFAULT 'published',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 15. DOWNLOAD APP CONFIG ──
CREATE TABLE IF NOT EXISTS cms_download_app (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT DEFAULT 'Download RealtyNow App',
  subtitle        TEXT DEFAULT 'Trusted by 10,000+ users',
  description     TEXT,
  bg_image_url    TEXT,
  phone_mockup    TEXT,
  qr_code_url     TEXT,
  play_store_url  TEXT DEFAULT '#',
  app_store_url   TEXT DEFAULT '#',
  play_store_img  TEXT,
  app_store_img   TEXT,
  features        JSONB DEFAULT '["AI Property Search","Instant Alerts","Virtual Tours","EMI Calculator"]'::jsonb,
  stats           JSONB DEFAULT '[{"value":"10K+","label":"Downloads"},{"value":"4.8","label":"Rating"},{"value":"500+","label":"Cities"}]'::jsonb,
  is_visible      BOOLEAN DEFAULT TRUE,
  status          TEXT DEFAULT 'published',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 16. CTA SECTION ──
CREATE TABLE IF NOT EXISTS cms_cta (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT DEFAULT 'Ready to Find Your Dream Property?',
  subtitle        TEXT DEFAULT 'Join thousands of satisfied customers who found their perfect home.',
  primary_btn     TEXT DEFAULT 'Get Started Free',
  primary_link    TEXT DEFAULT '/signup',
  secondary_btn   TEXT DEFAULT 'Post a Property',
  secondary_link  TEXT DEFAULT '/portal/list-property',
  bg_class        TEXT DEFAULT 'bg-red-gradient',
  bg_image_url    TEXT,
  is_visible      BOOLEAN DEFAULT TRUE,
  status          TEXT DEFAULT 'published',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 17. FOOTER CONFIG ──
CREATE TABLE IF NOT EXISTS cms_footer (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    TEXT DEFAULT 'RealtyNow',
  tagline         TEXT DEFAULT 'India''s AI-Powered Real Estate Platform',
  logo_url        TEXT,
  phone           TEXT DEFAULT '+91 40 4567 8900',
  email           TEXT DEFAULT 'hello@realtynow.in',
  address         TEXT,
  quick_links     JSONB DEFAULT '[]'::jsonb,
  popular_searches JSONB DEFAULT '[]'::jsonb,
  cities          JSONB DEFAULT '[]'::jsonb,
  social_links    JSONB DEFAULT '{"facebook":"#","twitter":"#","instagram":"#","linkedin":"#","youtube":"#"}'::jsonb,
  newsletter_text TEXT DEFAULT 'Get the latest property listings & market insights',
  copyright       TEXT DEFAULT '© 2025 RealtyNow. All rights reserved.',
  is_visible      BOOLEAN DEFAULT TRUE,
  status          TEXT DEFAULT 'published',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 18. SEO CONFIG ──
CREATE TABLE IF NOT EXISTS cms_seo (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key            TEXT UNIQUE NOT NULL DEFAULT 'home',
  meta_title          TEXT DEFAULT 'RealtyNow — Find Your Perfect Property in India',
  meta_description    TEXT DEFAULT 'Search verified properties for sale and rent across India. AI-powered recommendations, virtual tours, and instant alerts.',
  meta_keywords       TEXT DEFAULT 'real estate india, buy property, rent property, hyderabad property, ai real estate',
  og_title            TEXT,
  og_description      TEXT,
  og_image            TEXT,
  twitter_title       TEXT,
  twitter_description TEXT,
  twitter_image       TEXT,
  canonical_url       TEXT DEFAULT 'https://realtynow.in',
  structured_data     JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 19. GLOBAL CMS SETTINGS ──
CREATE TABLE IF NOT EXISTS cms_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT UNIQUE NOT NULL,
  value           TEXT,
  value_json      JSONB,
  label           TEXT,
  description     TEXT,
  type            TEXT DEFAULT 'text' CHECK (type IN ('text','boolean','number','json','color','url','image')),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 20. CMS AUDIT LOG ──
CREATE TABLE IF NOT EXISTS cms_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  table_name  TEXT NOT NULL,
  record_id   UUID,
  action      TEXT NOT NULL CHECK (action IN ('create','update','delete','publish','unpublish','reorder','preview','restore')),
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cms_sections_sort ON cms_sections(sort_order);
CREATE INDEX IF NOT EXISTS idx_cms_categories_sort ON cms_categories(sort_order, is_visible);
CREATE INDEX IF NOT EXISTS idx_cms_services_sort ON cms_services(sort_order, is_visible);
CREATE INDEX IF NOT EXISTS idx_cms_banners_pos ON cms_banners(position, priority, is_visible);
CREATE INDEX IF NOT EXISTS idx_cms_top_cities_sort ON cms_top_cities(sort_order, is_visible);
CREATE INDEX IF NOT EXISTS idx_cms_trending_sort ON cms_trending_locations(sort_order, is_visible);
CREATE INDEX IF NOT EXISTS idx_cms_top_agents_sort ON cms_top_agents(sort_order, is_visible);
CREATE INDEX IF NOT EXISTS idx_cms_audit_table ON cms_audit_log(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cms_seo_key ON cms_seo(page_key);

-- ──────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGERS
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['cms_hero','cms_search_config','cms_categories','cms_featured_config',
    'cms_trending_locations','cms_discovery_features','cms_top_cities','cms_top_agents',
    'cms_emi_config','cms_services','cms_interior_services','cms_home_services',
    'cms_banners','cms_download_app','cms_cta','cms_footer','cms_sections']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %s; CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t, t, t, t);
  END LOOP;
END $$;

-- ──────────────────────────────────────────────────────────────
-- ENABLE REALTIME
-- ──────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE cms_hero;
ALTER PUBLICATION supabase_realtime ADD TABLE cms_search_config;
ALTER PUBLICATION supabase_realtime ADD TABLE cms_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE cms_services;
ALTER PUBLICATION supabase_realtime ADD TABLE cms_top_cities;
ALTER PUBLICATION supabase_realtime ADD TABLE cms_top_agents;
ALTER PUBLICATION supabase_realtime ADD TABLE cms_sections;
ALTER PUBLICATION supabase_realtime ADD TABLE cms_banners;
ALTER PUBLICATION supabase_realtime ADD TABLE cms_trending_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE cms_cta;
ALTER PUBLICATION supabase_realtime ADD TABLE cms_footer;

-- ──────────────────────────────────────────────────────────────
-- SEED: Master sections order
-- ──────────────────────────────────────────────────────────────
INSERT INTO cms_sections (section_key, title, sort_order, is_visible) VALUES
  ('hero',             'Hero Section',              1,  TRUE),
  ('ai_search',        'AI Search',                 2,  TRUE),
  ('trust',            'Trust Bar',                 3,  TRUE),
  ('ad_banner',        'Advertisement Banner',      4,  TRUE),
  ('categories',       'Property Categories',       5,  TRUE),
  ('featured',         'Featured Properties',       6,  TRUE),
  ('ai_features',      'AI Features',               7,  TRUE),
  ('luxury',           'Luxury Collection',         8,  TRUE),
  ('top_cities',       'Top Cities',                9,  TRUE),
  ('top_builders',     'Top Builders',              10, TRUE),
  ('top_agents',       'Top Agents',                11, TRUE),
  ('emi_calculator',   'EMI Calculator',            12, TRUE),
  ('testimonials',     'Testimonials',              13, TRUE),
  ('services',         'Property Services',         14, TRUE),
  ('interior_home',    'Interior & Home Services',  15, TRUE),
  ('blogs',            'Latest Blogs',              16, TRUE),
  ('download_app',     'Download App',              17, TRUE),
  ('partners',         'Banking Partners',          18, TRUE),
  ('final_cta',        'Final CTA',                 19, TRUE)
ON CONFLICT (section_key) DO NOTHING;

-- Seed hero
INSERT INTO cms_hero (title, subtitle, badge_text, primary_btn_text, primary_btn_link, secondary_btn_text, secondary_btn_link)
VALUES (
  'Find Your Perfect Place to Call Home',
  'Search smarter, decide faster, and move ahead with AI insights across thousands of verified properties.',
  '✨ AI-Powered Real Estate Platform',
  'Search Properties', '/search',
  'AI Advisor', '/ai-advisor'
) ON CONFLICT DO NOTHING;

-- Seed search config
INSERT INTO cms_search_config DEFAULT VALUES ON CONFLICT DO NOTHING;

-- Seed featured configs
INSERT INTO cms_featured_config (section_key, title, subtitle, display_type, max_records) VALUES
  ('featured',    'Featured Properties',    'Handpicked premium listings',    'auto', 6),
  ('recommended', 'Recommended For You',    'Based on your preferences',      'auto', 6),
  ('premium',     'Premium Properties',     'Exclusive high-end listings',    'auto', 6),
  ('luxury',      'Signature Collection',   'Ultra-luxury residences',        'auto', 6)
ON CONFLICT (section_key) DO NOTHING;

-- Seed discovery features
INSERT INTO cms_discovery_features (title, description, icon, link, color, sort_order) VALUES
  ('AI Property Search',    'Natural language search with AI', 'Sparkles', '/search',       'from-red-500 to-rose-600',    1),
  ('Property Comparison',   'Compare up to 4 properties',     'GitCompare','/compare',      'from-blue-500 to-blue-600',   2),
  ('Investment Score',      'AI-powered ROI analysis',        'TrendingUp','/ai-advisor',   'from-emerald-500 to-teal-600',3),
  ('Property Alerts',       'Instant new listing alerts',     'Bell',      '/portal',       'from-amber-500 to-orange-500',4),
  ('Nearby Search',         'Location-based discovery',       'MapPin',    '/search',       'from-violet-500 to-purple-600',5),
  ('Virtual Tour',          '360° immersive property tours',  'Camera',    '/search',       'from-cyan-500 to-blue-600',   6)
ON CONFLICT DO NOTHING;

-- Seed top cities
INSERT INTO cms_top_cities (name, state, property_count, sort_order) VALUES
  ('Hyderabad',   'Telangana',     4500, 1),
  ('Mumbai',      'Maharashtra',   6200, 2),
  ('Bangalore',   'Karnataka',     5100, 3),
  ('Chennai',     'Tamil Nadu',    3200, 4),
  ('Delhi NCR',   'Delhi',         7800, 5),
  ('Pune',        'Maharashtra',   2900, 6),
  ('Kolkata',     'West Bengal',   2100, 7),
  ('Ahmedabad',   'Gujarat',       1800, 8)
ON CONFLICT DO NOTHING;

-- Seed services
INSERT INTO cms_services (name, icon, brand, btn_link, sort_order) VALUES
  ('Home Loan Assistance',  'Wallet',     'Bank Partners',      '/contact?service=Home+Loan+Assistance',   1),
  ('Architecture & Design', 'Ruler',      'Certified Experts',  '/contact?service=Architecture',           2),
  ('Legal Services',        'Scale',      'Legal Desk',         '/contact?service=Legal+Services',         3),
  ('Property Registration', 'FileText',   'Govt Assistance',    '/contact?service=Property+Registration',  4),
  ('Solar Installation',    'Sun',        'Green Energy',       '/contact?service=Solar+Installation',     5),
  ('Home Insurance',        'Shield',     'Protection Plan',    '/contact?service=Home+Insurance',         6),
  ('Packers & Movers',      'Truck',      'Relocation Services','/contact?service=Packers+and+Movers',     7),
  ('Property Valuation',    'Building2',  'Verified Assessors', '/contact?service=Property+Valuation',     8)
ON CONFLICT DO NOTHING;

-- Seed interior services
INSERT INTO cms_interior_services (label, description, icon, color, sort_order) VALUES
  ('Living Room Design',    'Luxurious, bespoke interiors', 'PaintBucket', 'from-violet-500 to-purple-600', 1),
  ('Modular Kitchen',       'Smart, functional kitchens',   'Layers',      'from-amber-500 to-orange-500',  2),
  ('Bedroom Design',        'Serene personal retreats',     'Home',        'from-rose-500 to-pink-600',     3),
  ('Custom Furniture',      'Crafted to fit your space',    'Ruler',       'from-emerald-500 to-teal-600',  4),
  ('3D Visualization',      'See before you build',         'Sparkles',    'from-cyan-500 to-blue-600',     5),
  ('Award-Winning Designers','10+ years experience',        'Award',       'from-slate-600 to-slate-800',   6)
ON CONFLICT DO NOTHING;

-- Seed home services
INSERT INTO cms_home_services (label, description, icon, color, bg_class, sort_order) VALUES
  ('Plumbing',         'Certified plumbers, 2hr response',  'Hammer',      'from-blue-500 to-blue-700',      'bg-blue-50',    1),
  ('Electrical',       'Safe & licensed electricians',      'Zap',         'from-amber-500 to-yellow-600',   'bg-amber-50',   2),
  ('Deep Cleaning',    'Professional sanitization',         'Shield',      'from-emerald-500 to-green-600',  'bg-emerald-50', 3),
  ('Pest Control',     'Eco-friendly treatments',           'Sun',         'from-orange-500 to-red-500',     'bg-orange-50',  4),
  ('Appliance Repair', 'AC, fridge, washing machine',       'Truck',       'from-violet-500 to-purple-600',  'bg-violet-50',  5),
  ('Civil Works',      'Waterproofing, painting',           'Building2',   'from-slate-500 to-slate-700',    'bg-slate-50',   6),
  ('Home Inspection',  'Pre-buy property audit',            'CheckCircle2','from-teal-500 to-cyan-600',      'bg-teal-50',    7),
  ('Caretaker Services','Trusted staff placement',          'Users',       'from-rose-500 to-pink-600',      'bg-rose-50',    8)
ON CONFLICT DO NOTHING;

-- Seed CTA
INSERT INTO cms_cta (title, subtitle, primary_btn, primary_link, secondary_btn, secondary_link)
VALUES ('Ready to Find Your Dream Property?', 'Join thousands of satisfied customers who found their perfect home with RealtyNow''s AI-powered platform.', 'Get Started Free', '/signup', 'Post a Property', '/portal/list-property')
ON CONFLICT DO NOTHING;

-- Seed SEO
INSERT INTO cms_seo (page_key, meta_title, meta_description, meta_keywords)
VALUES ('home', 'RealtyNow — Find Your Perfect Property in India', 'Search verified properties for sale and rent across India. AI-powered recommendations, virtual tours, and instant alerts.', 'real estate india, buy property, rent property, hyderabad property, ai real estate')
ON CONFLICT (page_key) DO NOTHING;

-- Seed global settings
INSERT INTO cms_settings (key, label, value, type) VALUES
  ('site_name',             'Site Name',              'RealtyNow',         'text'),
  ('primary_color',         'Primary Color',          '#D8232A',           'color'),
  ('maintenance_mode',      'Maintenance Mode',       'false',             'boolean'),
  ('show_ai_assistant',     'Show AI Assistant',      'true',              'boolean'),
  ('homepage_cache_seconds','Homepage Cache (seconds)','300',              'number'),
  ('contact_phone',         'Contact Phone',          '+91 40 4567 8900',  'text'),
  ('contact_email',         'Contact Email',          'hello@realtynow.in','text')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE cms_hero IS 'Hero section CMS — controls the main homepage banner';
COMMENT ON TABLE cms_sections IS 'Master table for section visibility and ordering';
COMMENT ON TABLE cms_banners IS 'Advertisement banners for various positions on the site';

import { z } from 'zod';

export const UNIVERSAL_STEPS = [
  {
    step: 1,
    key: 'basics',
    label: 'Property Basics',
    sub: 'Purpose, category, ownership & location',
    icon: '📍',
  },
  {
    step: 2,
    key: 'details_media',
    label: 'Details & Media',
    sub: 'Pricing, specifications, amenities & photos',
    icon: '📸',
  },
  {
    step: 3,
    key: 'review_publish',
    label: 'Review & Publish',
    sub: 'Verify listing summary & submit',
    icon: '✨',
  },
] as const;

export const WIZARD_STEPS = [
  'Property Basics',
  'Details & Media',
  'Review & Publish',
] as const;

export const propertyWizardSchema = z.object({
  // STEP 1 — BASICS
  purpose: z.enum(['Sale', 'Rent', 'Lease', 'PG', 'CoLiving', 'Hostel', 'Short Stay', 'Vacation Rental']),
  property_type: z.enum(['Residential', 'Commercial', 'Plot', 'Project']).default('Residential'),
  category: z.string().optional(),
  category_slug: z.string().optional(),
  property_type_id: z.string().optional(),
  property_sub_type: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  ownership_role: z.string().optional(),
  ownership_type: z.string().optional(),

  // Location
  city_name: z.string().optional(),
  locality_name: z.string().optional(),
  state_name: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  address: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  place_id: z.string().optional(),
  nearby_places: z
    .object({
      metro: z.string().optional(),
      hospital: z.string().optional(),
      school: z.string().optional(),
      mall: z.string().optional(),
      airport: z.string().optional(),
    })
    .optional(),

  // STEP 2 — PRICING & FINANCIALS
  price: z.string().optional(),
  rent_amount: z.string().optional(),
  security_deposit: z.string().optional(),
  maintenance: z.string().optional(),
  brokerage: z.string().optional(),
  negotiable: z.boolean().default(true),
  rate_per_unit: z.string().optional(),
  rate_unit: z.enum(['Sq.Ft', 'Sq.Yd']).optional().default('Sq.Ft'),
  pricing_mode: z.enum(['rate', 'total']).optional().default('rate'),
  price_per_sqft: z.string().optional(),
  price_per_sqyd: z.string().optional(),

  // STEP 2 — SPECIFICATIONS (Category-aware)
  bedrooms: z.number().optional().default(2),
  bathrooms: z.number().optional().default(2),
  balconies: z.number().optional().default(1),
  carpet_area: z.string().optional(),
  built_up_area: z.string().optional(),
  super_area: z.string().optional(),
  plot_area: z.string().optional(),
  balcony_size: z.string().optional(),
  bedroom_size: z.string().optional(),
  floor_number: z.string().optional(),
  total_floors: z.string().optional(),
  facing: z.string().optional(),
  furnishing: z.string().optional(),
  construction_status: z.string().optional(),
  age_of_property: z.string().optional(),
  availability_date: z.string().optional(),
  parking_indoor: z.string().optional(),
  parking_outdoor: z.string().optional(),

  // Specific: Plot / Land & Agriculture
  plot_unit: z.string().optional(),
  length_ft: z.string().optional(),
  width_ft: z.string().optional(),
  road_width: z.string().optional(),
  corner_plot: z.string().optional(),
  approval_authority: z.string().optional(),
  boundary_wall: z.string().optional(),
  soil_type: z.string().optional(),
  water_source: z.string().optional(),
  electricity_supply: z.string().optional(),
  road_access: z.string().optional(),
  cultivation_type: z.string().optional(),

  // Specific: Commercial & Retail & Warehouse
  cabins: z.string().optional(),
  workstations: z.string().optional(),
  conference_rooms: z.string().optional(),
  washrooms_count: z.string().optional(),
  building_grade: z.string().optional(),
  power_backup_kva: z.string().optional(),
  frontage_ft: z.string().optional(),
  road_facing: z.string().optional(),
  commercial_zone: z.string().optional(),
  ceiling_height_ft: z.string().optional(),
  loading_docks: z.string().optional(),
  truck_access: z.string().optional(),
  storage_type: z.string().optional(),
  fire_noc: z.string().optional(),

  // Specific: PG & Co-Living
  total_rooms: z.string().optional(),
  total_beds: z.string().optional(),
  available_beds: z.string().optional(),
  occupancy_types: z.string().optional(),
  gender_preference: z.string().optional(),
  food_availability: z.string().optional(),
  ac_type: z.string().optional(),
  gate_closing_time: z.string().optional(),

  // Specific: Projects
  total_units: z.string().optional(),
  total_towers: z.string().optional(),
  project_configurations: z.string().optional(),
  launch_date: z.string().optional(),
  possession_year: z.string().optional(),

  // Flexible attribute map
  custom_attributes: z.record(z.string(), z.unknown()).optional(),

  // STEP 2 — AMENITIES
  amenities: z.array(z.string()).default([]),

  // STEP 2 — MEDIA
  images: z.array(z.string()).default([]),
  cover_image_url: z.string().optional().nullable().or(z.literal('')),
  media_urls: z
    .object({
      videos: z.array(z.string().optional().nullable().or(z.literal(''))).optional(),
      video_bucket: z.string().optional().nullable(),
      video_path: z.string().optional().nullable(),
      virtual_tour: z.string().optional().nullable().or(z.literal('')),
      virtual_tour_bucket: z.string().optional().nullable(),
      virtual_tour_path: z.string().optional().nullable(),
      floor_plan: z.string().optional().nullable().or(z.literal('')),
      brochure: z.string().optional().nullable().or(z.literal('')),
    })
    .optional(),

  // STEP 2 — ADVANCED DETAILS & DOCUMENTS
  rera_number: z.string().optional(),
  property_tax_id: z.string().optional(),
  visiting_hours: z.string().optional(),
  open_house_schedule: z.string().optional(),
  source_urls: z.string().optional(),

  // SEO Metadata
  seo_metadata: z
    .object({
      meta_title: z.string().optional(),
      meta_description: z.string().optional(),
      slug: z.string().optional(),
      keywords: z.string().optional(),
    })
    .optional(),
});

export type PropertyWizardForm = z.infer<typeof propertyWizardSchema>;

import {
  Building,
  Building2,
  Home,
  Store,
  Warehouse,
  LandPlot,
  Users,
  Briefcase,
  Layers,
  Sparkles,
  ShieldCheck,
  Trees,
  Construction,
  Sprout,
  UserCheck,
  Handshake,
  ShoppingBag,
  LucideIcon,
} from 'lucide-react';
import { supabase } from './supabase';

export type CanonicalCategorySlug =
  // Residential (12)
  | 'independent-houses'
  | 'apartment-flats'
  | 'gated-community-homes'
  | 'open-plots-land'
  | 'luxury-villas'
  | 'farm-houses'
  | 'new-projects'
  | 'duplex-houses'
  | 'pent-houses'
  | 'agriculture-land'
  | 'owner-properties'
  | 'builder-share-properties'
  // Commercial (5)
  | 'commercial-spaces'
  | 'shops-showrooms'
  | 'shopping-malls'
  | 'godowns-warehouses'
  | 'pg-coliving-spaces';

export type LegacyCategorySlug =
  | 'apartment'
  | 'villa'
  | 'independent-house'
  | 'commercial-office'
  | 'retail-shop'
  | 'warehouse'
  | 'plots'
  | 'co-working';

export type CategorySlug = CanonicalCategorySlug | LegacyCategorySlug;

export interface CategoryMeta {
  id: CategorySlug;
  slug: CanonicalCategorySlug;
  name: string;
  pluralName: string;
  type: 'residential' | 'commercial';
  icon: LucideIcon;
  color: string;
  description: string;
  matchingKeywords: string[];
  sortOrder: number;
  dbCategory?: 'Residential' | 'Commercial' | 'Plot' | 'Luxury';
  allowedFilters: (
    | 'bhk'
    | 'price'
    | 'built_up_area'
    | 'plot_area'
    | 'bathrooms'
    | 'furnishing'
    | 'floor'
    | 'total_floors'
    | 'parking'
    | 'facing'
    | 'possession'
    | 'amenities'
    | 'plot_size'
    | 'road_width'
    | 'corner_plot'
    | 'gated_layout'
    | 'approval'
    | 'washrooms'
    | 'conference_room'
    | 'power_backup'
    | 'lift'
    | 'frontage'
    | 'ceiling_height'
    | 'truck_access'
    | 'seat_type'
    | 'internet'
  )[];
}

export interface CategoryItemWithCount extends CategoryMeta {
  propertyCount: number;
  isActive: boolean;
}

export const CANONICAL_CATEGORIES: Record<CanonicalCategorySlug, CategoryMeta> = {
  // ─── Residential (12) ──────────────────────────────────────────────────────
  'independent-houses': {
    id: 'independent-houses',
    slug: 'independent-houses',
    name: 'Independent Houses',
    pluralName: 'Independent Houses',
    type: 'residential',
    icon: Home,
    color: 'bg-red-50 text-red-600 border border-red-100',
    description: 'Standalone residential homes & independent villas',
    matchingKeywords: ['Independent House', 'House', 'Row House', 'Individual House', 'Kothi', 'Haveli', 'Standalone House'],
    sortOrder: 1,
    dbCategory: 'Residential',
    allowedFilters: ['bhk', 'price', 'built_up_area', 'plot_area', 'bathrooms', 'parking', 'furnishing', 'facing', 'possession', 'amenities'],
  },
  'apartment-flats': {
    id: 'apartment-flats',
    slug: 'apartment-flats',
    name: 'Apartment Flats',
    pluralName: 'Apartment Flats',
    type: 'residential',
    icon: Building,
    color: 'bg-rose-50 text-rose-600 border border-rose-100',
    description: 'Modern apartments, high-rises & flats',
    matchingKeywords: ['Apartment', 'Flat', 'Builder Floor', 'Studio', 'Residential Apartment', 'Apartment Flat'],
    sortOrder: 2,
    dbCategory: 'Residential',
    allowedFilters: ['bhk', 'price', 'built_up_area', 'bathrooms', 'furnishing', 'floor', 'parking', 'facing', 'possession', 'amenities'],
  },
  'gated-community-homes': {
    id: 'gated-community-homes',
    slug: 'gated-community-homes',
    name: 'Gated Community Homes',
    pluralName: 'Gated Community Homes',
    type: 'residential',
    icon: ShieldCheck,
    color: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    description: 'Secure gated community residences & townships',
    matchingKeywords: ['Gated Community', 'Gated Villa', 'Gated Township', 'Gated Society', 'Clubhouse Community'],
    sortOrder: 3,
    dbCategory: 'Residential',
    allowedFilters: ['bhk', 'price', 'built_up_area', 'plot_area', 'bathrooms', 'parking', 'furnishing', 'facing', 'possession', 'amenities'],
  },
  'open-plots-land': {
    id: 'open-plots-land',
    slug: 'open-plots-land',
    name: 'Open Plots & Land',
    pluralName: 'Open Plots & Land',
    type: 'residential',
    icon: LandPlot,
    color: 'bg-amber-50 text-amber-600 border border-amber-100',
    description: 'HMDA/DTCP approved residential & commercial plots',
    matchingKeywords: ['Plot', 'Land', 'Open Plot', 'Residential Land', 'Commercial Land', 'HMDA Plot', 'DTCP Plot'],
    sortOrder: 4,
    dbCategory: 'Plot',
    allowedFilters: ['plot_size', 'price', 'facing', 'road_width', 'corner_plot', 'gated_layout', 'approval'],
  },
  'luxury-villas': {
    id: 'luxury-villas',
    slug: 'luxury-villas',
    name: 'Luxury Villas',
    pluralName: 'Luxury Villas',
    type: 'residential',
    icon: Sparkles,
    color: 'bg-purple-50 text-purple-600 border border-purple-100',
    description: 'High-end luxury villas & bespoke estates',
    matchingKeywords: ['Luxury Villa', 'Villa', 'Bungalow', 'Mansion', 'Ultra Luxury Villa', 'Luxury Estate'],
    sortOrder: 5,
    dbCategory: 'Luxury',
    allowedFilters: ['bhk', 'price', 'built_up_area', 'plot_area', 'bathrooms', 'parking', 'furnishing', 'facing', 'possession', 'amenities'],
  },
  'farm-houses': {
    id: 'farm-houses',
    slug: 'farm-houses',
    name: 'Farm Houses',
    pluralName: 'Farm Houses',
    type: 'residential',
    icon: Trees,
    color: 'bg-green-50 text-green-600 border border-green-100',
    description: 'Serene agricultural retreats & farm houses',
    matchingKeywords: ['Farm House', 'Farmhouse', 'Weekend Home', 'Resort Villa', 'Agri Farmhouse'],
    sortOrder: 6,
    dbCategory: 'Residential',
    allowedFilters: ['plot_size', 'price', 'built_up_area', 'facing', 'amenities'],
  },
  'new-projects': {
    id: 'new-projects',
    slug: 'new-projects',
    name: 'New Projects',
    pluralName: 'New Projects',
    type: 'residential',
    icon: Construction,
    color: 'bg-blue-50 text-blue-600 border border-blue-100',
    description: 'Newly launched RERA-registered developer projects',
    matchingKeywords: ['New Project', 'New Launch', 'Pre-Launch', 'Under Construction Project', 'RERA Project'],
    sortOrder: 7,
    dbCategory: 'Residential',
    allowedFilters: ['bhk', 'price', 'built_up_area', 'possession', 'amenities'],
  },
  'duplex-houses': {
    id: 'duplex-houses',
    slug: 'duplex-houses',
    name: 'Duplex Houses',
    pluralName: 'Duplex Houses',
    type: 'residential',
    icon: Layers,
    color: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
    description: 'Spacious multi-level duplex living',
    matchingKeywords: ['Duplex', 'Duplex House', 'Duplex Flat', 'Duplex Villa', 'Triplex'],
    sortOrder: 8,
    dbCategory: 'Residential',
    allowedFilters: ['bhk', 'price', 'built_up_area', 'bathrooms', 'parking', 'furnishing', 'facing', 'possession', 'amenities'],
  },
  'pent-houses': {
    id: 'pent-houses',
    slug: 'pent-houses',
    name: 'Pent Houses',
    pluralName: 'Pent Houses',
    type: 'residential',
    icon: Building2,
    color: 'bg-sky-50 text-sky-600 border border-sky-100',
    description: 'Exclusive skyline luxury penthouses',
    matchingKeywords: ['Penthouse', 'Pent House', 'Sky Villa', 'Sky Penthouse', 'Rooftop Suite'],
    sortOrder: 9,
    dbCategory: 'Luxury',
    allowedFilters: ['bhk', 'price', 'built_up_area', 'bathrooms', 'parking', 'furnishing', 'facing', 'possession', 'amenities'],
  },
  'agriculture-land': {
    id: 'agriculture-land',
    slug: 'agriculture-land',
    name: 'Agriculture Land',
    pluralName: 'Agriculture Land',
    type: 'residential',
    icon: Sprout,
    color: 'bg-lime-50 text-lime-700 border border-lime-200',
    description: 'Fertile agricultural land & farm acreage',
    matchingKeywords: ['Agricultural Land', 'Agriculture Land', 'Farm Land', 'Pattadar Land', 'Crop Land', 'Agri Acre'],
    sortOrder: 10,
    dbCategory: 'Plot',
    allowedFilters: ['plot_size', 'price', 'road_width', 'approval'],
  },
  'owner-properties': {
    id: 'owner-properties',
    slug: 'owner-properties',
    name: 'Owner Properties',
    pluralName: 'Owner Properties',
    type: 'residential',
    icon: UserCheck,
    color: 'bg-teal-50 text-teal-600 border border-teal-100',
    description: 'Direct zero-brokerage owner listings',
    matchingKeywords: ['Owner Listed', 'Direct Owner', 'Zero Brokerage', 'Owner Property', 'By Owner'],
    sortOrder: 11,
    dbCategory: 'Residential',
    allowedFilters: ['bhk', 'price', 'built_up_area', 'bathrooms', 'furnishing', 'possession'],
  },
  'builder-share-properties': {
    id: 'builder-share-properties',
    slug: 'builder-share-properties',
    name: 'Builder Share Properties',
    pluralName: 'Builder Share Properties',
    type: 'residential',
    icon: Handshake,
    color: 'bg-orange-50 text-orange-600 border border-orange-100',
    description: 'Direct builder floor & investor share units',
    matchingKeywords: ['Builder Share', 'Builder Floor', 'Investor Share', 'Landowner Share', 'Builder Unit'],
    sortOrder: 12,
    dbCategory: 'Residential',
    allowedFilters: ['bhk', 'price', 'built_up_area', 'bathrooms', 'furnishing', 'possession'],
  },

  // ─── Commercial (5) ────────────────────────────────────────────────────────
  'commercial-spaces': {
    id: 'commercial-spaces',
    slug: 'commercial-spaces',
    name: 'Commercial Spaces',
    pluralName: 'Commercial Spaces',
    type: 'commercial',
    icon: Briefcase,
    color: 'bg-red-50 text-red-600 border border-red-100',
    description: 'Grade-A corporate office & IT park spaces',
    matchingKeywords: ['Office Space', 'Office', 'Commercial Office', 'IT Park', 'Business Center', 'Commercial Space'],
    sortOrder: 1,
    dbCategory: 'Commercial',
    allowedFilters: ['price', 'built_up_area', 'floor', 'parking', 'furnishing', 'washrooms', 'conference_room', 'power_backup', 'lift', 'amenities'],
  },
  'shops-showrooms': {
    id: 'shops-showrooms',
    slug: 'shops-showrooms',
    name: 'Shops & Showrooms',
    pluralName: 'Shops & Showrooms',
    type: 'commercial',
    icon: Store,
    color: 'bg-amber-50 text-amber-600 border border-amber-100',
    description: 'Prime high-visibility retail & showroom spaces',
    matchingKeywords: ['Shop', 'Retail', 'Showroom', 'Commercial Shop', 'Commercial Showroom', 'Retail Store'],
    sortOrder: 2,
    dbCategory: 'Commercial',
    allowedFilters: ['price', 'built_up_area', 'floor', 'parking', 'frontage', 'washrooms', 'furnishing', 'amenities'],
  },
  'shopping-malls': {
    id: 'shopping-malls',
    slug: 'shopping-malls',
    name: 'Shopping Malls',
    pluralName: 'Shopping Malls',
    type: 'commercial',
    icon: ShoppingBag,
    color: 'bg-pink-50 text-pink-600 border border-pink-100',
    description: 'Retail multiplex & shopping complex units',
    matchingKeywords: ['Shopping Mall', 'Mall', 'Commercial Complex', 'Multiplex Retail', 'Food Court Unit'],
    sortOrder: 3,
    dbCategory: 'Commercial',
    allowedFilters: ['price', 'built_up_area', 'floor', 'parking', 'frontage', 'washrooms'],
  },
  'godowns-warehouses': {
    id: 'godowns-warehouses',
    slug: 'godowns-warehouses',
    name: 'Godowns / Warehouses',
    pluralName: 'Godowns & Warehouses',
    type: 'commercial',
    icon: Warehouse,
    color: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
    description: 'Industrial logistics hubs & storage godowns',
    matchingKeywords: ['Warehouse', 'Godown', 'Industrial Shed', 'Cold Storage', 'Logistics Park'],
    sortOrder: 4,
    dbCategory: 'Commercial',
    allowedFilters: ['price', 'built_up_area', 'plot_area', 'ceiling_height', 'truck_access', 'parking', 'power_backup'],
  },
  'pg-coliving-spaces': {
    id: 'pg-coliving-spaces',
    slug: 'pg-coliving-spaces',
    name: 'PG & Co-Living Spaces',
    pluralName: 'PG & Co-Living Spaces',
    type: 'commercial',
    icon: Users,
    color: 'bg-violet-50 text-violet-600 border border-violet-100',
    description: 'Hostels, co-living & shared accommodations',
    matchingKeywords: ['PG', 'Co-Living', 'Coliving', 'Hostel', 'Shared Accommodation', 'Paying Guest', 'Co-working'],
    sortOrder: 5,
    dbCategory: 'Commercial',
    allowedFilters: ['price', 'seat_type', 'internet', 'power_backup', 'parking', 'amenities'],
  },
};

export const CATEGORY_LIST: CategoryMeta[] = Object.values(CANONICAL_CATEGORIES);
export const RESIDENTIAL_CATEGORIES: CategoryMeta[] = CATEGORY_LIST.filter((c) => c.type === 'residential');
export const COMMERCIAL_CATEGORIES: CategoryMeta[] = CATEGORY_LIST.filter((c) => c.type === 'commercial');

/**
 * Maps any raw category string, slug, type name, or legacy alias to a canonical CategorySlug.
 */
export function normalizeCategorySlug(raw?: string | null): CanonicalCategorySlug | null {
  if (!raw) return null;
  const s = raw
    .toLowerCase()
    .trim()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/&/g, 'and');

  // 1. Independent Houses
  if (
    s === 'independent-houses' ||
    s === 'independent-house' ||
    s === 'independenthouse' ||
    s === 'independenthouses' ||
    s === 'house' ||
    s === 'houses' ||
    s === 'row-house' ||
    s === 'row-houses' ||
    s === 'individual-house' ||
    s === 'individual-houses' ||
    s === 'kothi' ||
    s === 'haveli'
  ) {
    return 'independent-houses';
  }

  // 2. Apartment Flats
  if (
    s === 'apartment-flats' ||
    s === 'apartment-flat' ||
    s === 'apartment' ||
    s === 'apartments' ||
    s === 'flat' ||
    s === 'flats' ||
    s === 'residential-apartment' ||
    s === 'residential-apartments' ||
    s === 'builder-floor' ||
    s === 'studio' ||
    s === 'studio-apartment'
  ) {
    return 'apartment-flats';
  }

  // 3. Gated Community Homes
  if (
    s === 'gated-community-homes' ||
    s === 'gated-community-home' ||
    s === 'gated-community' ||
    s === 'gated-communities' ||
    s === 'gated-township' ||
    s === 'gated-society'
  ) {
    return 'gated-community-homes';
  }

  // 4. Open Plots & Land
  if (
    s === 'open-plots-land' ||
    s === 'open-plots-and-land' ||
    s === 'open-plot' ||
    s === 'open-plots' ||
    s === 'plots' ||
    s === 'plot' ||
    s === 'residential-plot' ||
    s === 'residential-plots' ||
    s === 'commercial-plot' ||
    s === 'hmda-plot' ||
    s === 'dtcp-plot'
  ) {
    return 'open-plots-land';
  }

  // 5. Luxury Villas
  if (
    s === 'luxury-villas' ||
    s === 'luxury-villa' ||
    s === 'villa' ||
    s === 'villas' ||
    s === 'bungalow' ||
    s === 'bungalows' ||
    s === 'mansion' ||
    s === 'mansions'
  ) {
    return 'luxury-villas';
  }

  // 6. Farm Houses
  if (
    s === 'farm-houses' ||
    s === 'farm-house' ||
    s === 'farmhouse' ||
    s === 'farmhouses' ||
    s === 'weekend-home' ||
    s === 'resort-villa'
  ) {
    return 'farm-houses';
  }

  // 7. New Projects
  if (
    s === 'new-projects' ||
    s === 'new-project' ||
    s === 'projects' ||
    s === 'project' ||
    s === 'new-launch' ||
    s === 'pre-launch'
  ) {
    return 'new-projects';
  }

  // 8. Duplex Houses
  if (
    s === 'duplex-houses' ||
    s === 'duplex-house' ||
    s === 'duplex' ||
    s === 'duplexes' ||
    s === 'triplex'
  ) {
    return 'duplex-houses';
  }

  // 9. Pent Houses
  if (
    s === 'pent-houses' ||
    s === 'pent-house' ||
    s === 'penthouse' ||
    s === 'penthouses' ||
    s === 'sky-villa' ||
    s === 'sky-penthouse'
  ) {
    return 'pent-houses';
  }

  // 10. Agriculture Land
  if (
    s === 'agriculture-land' ||
    s === 'agricultural-land' ||
    s === 'agri-land' ||
    s === 'farm-land' ||
    s === 'pattadar-passbook'
  ) {
    return 'agriculture-land';
  }

  // 11. Owner Properties
  if (
    s === 'owner-properties' ||
    s === 'owner-property' ||
    s === 'owner-listed' ||
    s === 'direct-owner' ||
    s === 'zero-brokerage'
  ) {
    return 'owner-properties';
  }

  // 12. Builder Share Properties
  if (
    s === 'builder-share-properties' ||
    s === 'builder-share' ||
    s === 'builder-floor' ||
    s === 'builder-floors' ||
    s === 'investor-share' ||
    s === 'landowner-share'
  ) {
    return 'builder-share-properties';
  }

  // 13. Commercial Spaces
  if (
    s === 'commercial-spaces' ||
    s === 'commercial-space' ||
    s === 'commercial-offices' ||
    s === 'commercial-office' ||
    s === 'office' ||
    s === 'offices' ||
    s === 'office-space' ||
    s === 'it-park' ||
    s === 'business-center' ||
    s === 'commercial'
  ) {
    return 'commercial-spaces';
  }

  // 14. Shops & Showrooms
  if (
    s === 'shops-showrooms' ||
    s === 'shops-and-showrooms' ||
    s === 'shop' ||
    s === 'shops' ||
    s === 'showroom' ||
    s === 'showrooms' ||
    s === 'retail-shop' ||
    s === 'retail-shops' ||
    s === 'retail'
  ) {
    return 'shops-showrooms';
  }

  // 15. Shopping Malls
  if (
    s === 'shopping-malls' ||
    s === 'shopping-mall' ||
    s === 'mall' ||
    s === 'malls' ||
    s === 'commercial-complex'
  ) {
    return 'shopping-malls';
  }

  // 16. Godowns / Warehouses
  if (
    s === 'godowns-warehouses' ||
    s === 'godowns-and-warehouses' ||
    s === 'warehouse' ||
    s === 'warehouses' ||
    s === 'godown' ||
    s === 'godowns' ||
    s === 'industrial-shed' ||
    s === 'cold-storage'
  ) {
    return 'godowns-warehouses';
  }

  // 17. PG & Co-Living Spaces
  if (
    s === 'pg-coliving-spaces' ||
    s === 'pg-coliving' ||
    s === 'pg-and-coliving' ||
    s === 'pg' ||
    s === 'coliving' ||
    s === 'co-living' ||
    s === 'hostel' ||
    s === 'hostels' ||
    s === 'paying-guest' ||
    s === 'co-working' ||
    s === 'coworking'
  ) {
    return 'pg-coliving-spaces';
  }

  return null;
}

/**
 * Returns CategoryMeta for a given input or null.
 */
export function getCategoryMeta(raw?: string | null): CategoryMeta | null {
  const slug = normalizeCategorySlug(raw);
  return slug ? CANONICAL_CATEGORIES[slug] : null;
}

/**
 * Determines if a property record is classified as Commercial.
 */
export function isCommercialProperty(property: {
  property_type_name?: string | null;
  property_type_category?: string | null;
  listing_category?: string | null;
  property_sub_type?: string | null;
  title?: string | null;
  purpose?: string | null;
}): boolean {
  const cat = (property.property_type_category || property.listing_category || '').toLowerCase();
  const name = (property.property_type_name || '').toLowerCase();
  const subType = (property.property_sub_type || '').toLowerCase();
  const title = (property.title || '').toLowerCase();
  const purp = (property.purpose || '').toLowerCase();
  const signals = `${name} ${cat} ${subType} ${title} ${purp}`;

  if (cat === 'commercial' || name.includes('commercial') || purp === 'pg' || purp === 'coliving') {
    return true;
  }
  return /\b(office|shop|showroom|retail|warehouse|godown|co-?working|it\s*park|industrial|pg\b|hostel|mall)\b/i.test(signals);
}

/**
 * Checks if a property matches a selected city / location context.
 */
export function matchesPropertyCity(
  property: {
    city?: string | null;
    locality?: string | null;
    address?: string | null;
    state?: string | null;
    title?: string | null;
    city_name?: string | null;
    city_id?: string | null;
    plot_details?: any;
    draft_data?: any;
  },
  targetCity?: string | null
): boolean {
  if (!targetCity || targetCity.toLowerCase() === 'all' || targetCity.toLowerCase() === 'all cities') {
    return true;
  }
  const target = targetCity.toLowerCase().trim();
  const fullText = `${property.city || ''} ${property.city_name || ''} ${property.locality || ''} ${property.address || ''} ${property.state || ''} ${property.title || ''} ${property.plot_details?.city || ''} ${property.plot_details?.locality || ''} ${property.draft_data?.city_name || ''}`.toLowerCase();

  if (fullText.includes(target)) return true;

  if (target === 'hyderabad') {
    const hyderabadKeywords = [
      'hyderabad', 'telangana', 'serilingampalle', 'lingampally', 'yacharam',
      'shadnagar', 'munaganoor', 'munganoor', 'taramatipet', 'raviryal',
      'kuntloor', 'kamkole', 'bodishetpally', 'basaguda', 'hayath nagar',
      'gunded', 'balanagar', '501', '500', '502', '509'
    ];
    return hyderabadKeywords.some((kw) => fullText.includes(kw));
  }

  if (target === 'bengaluru' || target === 'bangalore') {
    const blrKeywords = ['bengaluru', 'bangalore', 'karnataka', 'whitefield', 'electronic city', 'koramangala', 'indiranagar', 'hsr layout', '560'];
    return blrKeywords.some((kw) => fullText.includes(kw));
  }

  if (target === 'mumbai') {
    const mumKeywords = ['mumbai', 'bombay', 'maharashtra', 'navi mumbai', 'thane', 'andheri', 'bandra', 'borivali', '400'];
    return mumKeywords.some((kw) => fullText.includes(kw));
  }

  return false;
}

/**
 * Categorizes a property record into one of the 17 canonical CategorySlugs.
 */
export function categorizeProperty(property: {
  property_type_name?: string | null;
  property_type_category?: string | null;
  listing_category?: string | null;
  property_sub_type?: string | null;
  title?: string | null;
  description?: string | null;
  purpose?: string | null;
  is_luxury?: boolean | null;
  project_id?: string | null;
  builder_id?: string | null;
  verified_status?: string | null;
  owner_id?: string | null;
  assigned_agent_id?: string | null;
  plot_details?: any;
  features?: any;
}): CanonicalCategorySlug | null {
  const name = (property.property_type_name || '').trim().toLowerCase();
  const cat = (property.property_type_category || property.listing_category || '').trim().toLowerCase();
  const subType = (property.property_sub_type || '').trim().toLowerCase();
  const title = (property.title || '').trim().toLowerCase();
  const desc = (property.description || '').trim().toLowerCase();
  const purp = (property.purpose || '').trim().toLowerCase();
  const feat = property.features || {};

  const signals = `${name} ${cat} ${subType} ${title} ${desc}`.trim();

  // 1. Direct Slug Normalization on explicit type fields
  const directSlug = normalizeCategorySlug(name) || normalizeCategorySlug(subType);
  if (directSlug) return directSlug;

  // 2. PG & Co-Living
  if (
    purp === 'pg' ||
    purp === 'coliving' ||
    purp === 'co-living' ||
    /\b(pg\b|co-?living|hostel|paying\s*guest)\b/i.test(signals)
  ) {
    return 'pg-coliving-spaces';
  }

  // 3. Shopping Malls
  if (/\b(shopping\s*mall|mall|commercial\s*complex)\b/i.test(signals)) {
    return 'shopping-malls';
  }

  // 4. Godowns & Warehouses
  if (/\b(warehouse|godown|industrial\s*shed|cold\s*storage)\b/i.test(signals)) {
    return 'godowns-warehouses';
  }

  // 5. Shops & Showrooms
  if (/\b(shop|retail|showroom|commercial\s*shop|commercial\s*showroom)\b/i.test(signals)) {
    return 'shops-showrooms';
  }

  // 6. Commercial Spaces / Office
  if (
    cat === 'commercial' ||
    /\b(office|commercial\s*space|it\s*park|business\s*center|corporate\s*floor)\b/i.test(signals)
  ) {
    return 'commercial-spaces';
  }

  // 7. Agriculture Land
  if (/\b(agricultural\s*land|agriculture\s*land|pattadar|agri\s*acre)\b/i.test(signals)) {
    return 'agriculture-land';
  }

  // 8. Farm Houses & Farm Land
  if (/\b(farm\s*house|farmhouse|farm\s*land|weekend\s*home|resort\s*villa)\b/i.test(signals)) {
    return 'farm-houses';
  }

  // 9. Open Plots & Land
  if (
    cat === 'plot' ||
    property.plot_details != null ||
    /\b(open\s*plot|residential\s*plot|commercial\s*plot|dtcp|hmda|layout\s*plot|plots?|lands?|guntas?|venture|future\s*city|county)\b/i.test(signals)
  ) {
    return 'open-plots-land';
  }

  // 10. Pent Houses
  if (/\b(penthouse|pent\s*house|sky\s*villa)\b/i.test(signals)) {
    return 'pent-houses';
  }

  // 11. Duplex Houses
  if (/\b(duplex|duplex\s*house|triplex)\b/i.test(signals)) {
    return 'duplex-houses';
  }

  // 12. Luxury Villas
  if (property.is_luxury || /\b(luxury\s*villa|villas?|bungalow|mansion)\b/i.test(signals)) {
    return 'luxury-villas';
  }

  // 13. Gated Community Homes
  if (feat.gated_community === true || /\b(gated\s*community|gated\s*society|township)\b/i.test(signals)) {
    return 'gated-community-homes';
  }

  // 14. New Projects
  if (property.project_id != null || /\b(new\s*project|new\s*launch|rera\s*project)\b/i.test(signals)) {
    return 'new-projects';
  }

  // 15. Builder Share Properties
  if (property.builder_id != null || property.verified_status === 'Builder Listed' || /\b(builder\s*share|builder\s*floor)\b/i.test(signals)) {
    return 'builder-share-properties';
  }

  // 16. Owner Properties
  if (property.verified_status === 'Owner Listed' || (property.owner_id && !property.assigned_agent_id && !property.builder_id)) {
    if (/\b(independent\s*house|house)\b/i.test(signals)) return 'independent-houses';
    return 'apartment-flats';
  }

  // 17. Independent Houses
  if (/\b(independent\s*house|house|row\s*house|individual\s*house|kothi)\b/i.test(signals)) {
    return 'independent-houses';
  }

  // 18. Default fallback for residential: Apartment Flats
  return 'apartment-flats';
}

/**
 * Result structure for the Unified Properties Taxonomy API
 */
export interface PropertyTaxonomyResult {
  purpose: 'buy' | 'rent' | 'commercial' | null;
  residential: CategoryItemWithCount[];
  commercial: CategoryItemWithCount[];
  totalCount: number;
  city: string | null;
}

/**
 * Fetches property categories merged with real-time database counts for a given location and transaction purpose.
 * Uses the live database properties table with resilient location and purpose filtering.
 */
export async function fetchPropertyCategoriesWithCounts(
  city?: string | null,
  purpose?: 'buy' | 'rent' | 'commercial' | null
): Promise<PropertyTaxonomyResult> {
  const normalizedCity = city?.trim() || null;
  const normalizedPurpose = purpose?.trim() ? (purpose.toLowerCase() as 'buy' | 'rent' | 'commercial') : null;

  const countMap: Record<CanonicalCategorySlug, number> = {
    'independent-houses': 0,
    'apartment-flats': 0,
    'gated-community-homes': 0,
    'open-plots-land': 0,
    'luxury-villas': 0,
    'farm-houses': 0,
    'new-projects': 0,
    'duplex-houses': 0,
    'pent-houses': 0,
    'agriculture-land': 0,
    'owner-properties': 0,
    'builder-share-properties': 0,
    'commercial-spaces': 0,
    'shops-showrooms': 0,
    'shopping-malls': 0,
    'godowns-warehouses': 0,
    'pg-coliving-spaces': 0,
  };

  let totalCount = 0;

  try {
    const { data: properties, error: dbErr } = await supabase
      .from('properties')
      .select('id, title, description, purpose, status, is_live, city, locality, address, state, city_id, listing_category, property_sub_type, is_luxury, price, project_id, builder_id, verified_status, plot_details, features')
      .or('status.eq.published,status.eq.live,is_live.eq.true');

    if (!dbErr && Array.isArray(properties)) {
      for (const prop of properties) {
        // Location matching
        if (normalizedCity && !matchesPropertyCity(prop, normalizedCity)) {
          continue;
        }

        // Transaction Purpose filtering
        const purp = (prop.purpose || '').trim().toLowerCase();
        const isCommercialProp = isCommercialProperty(prop);

        if (normalizedPurpose === 'buy') {
          // For Buy: only properties available for purchase/sale
          const isSale = !purp || purp.includes('sale') || purp.includes('buy');
          if (!isSale) continue;
        } else if (normalizedPurpose === 'rent') {
          // For Rent: only properties available for rent/lease
          const isRent = purp.includes('rent') || purp.includes('lease');
          if (!isRent) continue;
        } else if (normalizedPurpose === 'commercial') {
          // For Commercial Hub: must be commercial property
          if (!isCommercialProp) continue;
        }

        const slug = categorizeProperty(prop);
        if (slug && slug in countMap) {
          countMap[slug] += 1;
          totalCount += 1;
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch live property category counts:', err);
  }

  // Assemble Residential and Commercial items with canonical definitions
  const residential: CategoryItemWithCount[] = RESIDENTIAL_CATEGORIES.map((cat) => ({
    ...cat,
    propertyCount: countMap[cat.slug] || 0,
    isActive: true,
  })).sort((a, b) => a.sortOrder - b.sortOrder);

  const commercial: CategoryItemWithCount[] = COMMERCIAL_CATEGORIES.map((cat) => ({
    ...cat,
    propertyCount: countMap[cat.slug] || 0,
    isActive: true,
  })).sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    purpose: normalizedPurpose,
    residential,
    commercial,
    totalCount,
    city: normalizedCity,
  };
}

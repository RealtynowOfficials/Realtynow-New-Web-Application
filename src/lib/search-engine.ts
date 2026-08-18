/**
 * RealtyNow Intelligent Search & Location Discovery Engine
 *
 * Single shared module for:
 *   1. Parsing natural-language property queries into structured intent
 *   2. Fetching live cross-category property counts for a location
 *
 * Used by: HomePage, SearchPage, AI Hub, Autocomplete
 */

import { supabase } from './supabase';
import { normalizeCategorySlug, categorizeProperty, CATEGORY_LIST } from './categories';
import type { CategorySlug } from './categories';
import { buildPublishedQuery, type PropertyFilters } from './properties';

// ─── Types ────────────────────────────────────────────────────

export interface ParsedSearchIntent {
  /** Detected locality / neighbourhood / city (e.g. "Gachibowli", "Kokapet") */
  location: string;
  /** Canonical category slug if detected (e.g. "apartment", "plots", "villa") */
  propertyType: CategorySlug | null;
  /** Transaction intent if detected */
  purpose: 'Sale' | 'Rent' | null;
  /** Bedrooms if detected (e.g. 2 from "2 BHK") */
  bedrooms: number | null;
  /** Upper price bound in INR if detected */
  maxPrice: number | null;
  /** Lower price bound in INR */
  minPrice: number | null;
  /** The original raw query */
  originalQuery: string;
}

export interface LocationCategoryCount {
  /** Canonical category slug */
  type: CategorySlug;
  /** Display label e.g. "Apartments" */
  label: string;
  /** Icon emoji */
  emoji: string;
  /** Live count from DB */
  count: number;
}

export interface LocationDiscoveryResult {
  /** The matched locality/city name from query */
  location: string;
  /** City name if detected / resolved */
  city?: string;
  /** Categories with count > 0 only */
  categories: LocationCategoryCount[];
  /** Total properties in this location */
  totalCount: number;
}

// ─── Constants ────────────────────────────────────────────────

const CATEGORY_META: Record<CategorySlug, { label: string; pluralLabel: string; emoji: string; keywords: string[] }> = {
  apartment: {
    label: 'Apartment',
    pluralLabel: 'Apartments',
    emoji: '🏢',
    keywords: ['apartment', 'apartments', 'flat', 'flats', 'builder floor', 'studio', 'penthouse'],
  },
  villa: {
    label: 'Villa',
    pluralLabel: 'Villas',
    emoji: '🏡',
    keywords: ['villa', 'villas', 'bungalow', 'duplex', 'gated villa'],
  },
  'independent-house': {
    label: 'Independent House',
    pluralLabel: 'Independent Houses',
    emoji: '🏘️',
    keywords: ['house', 'houses', 'home', 'homes', 'independent house', 'independent houses', 'row house', 'individual house'],
  },
  plots: {
    label: 'Plot',
    pluralLabel: 'Plots',
    emoji: '🌳',
    keywords: ['plot', 'plots', 'land', 'open plot', 'open plots', 'plot land', 'land plot', 'hmda', 'dtcp', 'residential plot', 'residential plots', 'gated plot', 'farm land'],
  },
  'commercial-office': {
    label: 'Commercial Office',
    pluralLabel: 'Commercial Offices',
    emoji: '💼',
    keywords: ['office', 'offices', 'commercial', 'commercial property', 'commercial properties', 'it park', 'business center', 'commercial office'],
  },
  'retail-shop': {
    label: 'Retail Shop',
    pluralLabel: 'Retail Shops',
    emoji: '🏬',
    keywords: ['shop', 'shops', 'retail', 'showroom', 'commercial shop'],
  },
  warehouse: {
    label: 'Warehouse',
    pluralLabel: 'Warehouses',
    emoji: '🏭',
    keywords: ['warehouse', 'warehouses', 'godown', 'industrial shed', 'cold storage'],
  },
  'co-working': {
    label: 'Co-working',
    pluralLabel: 'Co-working Spaces',
    emoji: '🧑‍💻',
    keywords: ['co-working', 'coworking', 'pg', 'coliving', 'hostel', 'shared office'],
  },
};

// Words/phrases that mean "give me a list of properties" — stripped before
// location extraction so they don't pollute the location token.
const SEARCH_INTENT_WORDS_RE =
  /\b(show|find|search|looking\s+for|list|get|near|around|in|at|properties|property|for\s+sale|for\s+rent|for\s+buy|buy|sale|rent|rental|lease|to\s+let|under|below|above|over|less\s+than|more\s+than|up\s+to|within|available|listing|listings|real\s+estate|area|homes)\b/gi;

const RENT_RE   = /\b(rent|rental|lease|to\s+let|on\s+rent|for\s+rent)\b/i;
const BUY_RE    = /\b(buy|sale|purchase|for\s+sale|to\s+buy)\b/i;
const BHK_RE    = /(\d+)\s*bhk/i;

const LAKH  = 100_000;
const CRORE = 10_000_000;
const PRICE_UNIT_RE = /(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lac|k)/i;
const MAX_PRICE_RE  = new RegExp(`(?:under|below|less\\s*than|up\\s*to|within|max)\\s*${PRICE_UNIT_RE.source}`, 'i');
const MIN_PRICE_RE  = new RegExp(`(?:above|over|more\\s*than|min)\\s*${PRICE_UNIT_RE.source}`, 'i');

function parsePrice(amount: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith('cr')) return Math.round(amount * CRORE);
  if (u.startsWith('la')) return Math.round(amount * LAKH);
  if (u === 'k') return Math.round(amount * 1_000);
  return Math.round(amount);
}

// ─── Parse Query ─────────────────────────────────────────────

/**
 * Parse a natural language search query into structured intent.
 *
 * Examples:
 *   "Gachibowli apartments"  → { location: "Gachibowli", propertyType: "apartment" }
 *   "plots in Kokapet"       → { location: "Kokapet", propertyType: "plots" }
 *   "2 BHK rent Kondapur under 30k" → { location: "Kondapur", propertyType: "apartment", purpose: "Rent", bedrooms: 2 }
 */
export function parsePropertySearchQuery(rawQuery: string): ParsedSearchIntent {
  let rest = (rawQuery || '').trim();

  // 1. Extract price constraints (they'd pollute location extraction)
  let maxPrice: number | null = null;
  let minPrice: number | null = null;
  const maxM = rest.match(MAX_PRICE_RE);
  if (maxM) { maxPrice = parsePrice(parseFloat(maxM[1]), maxM[2]); rest = rest.replace(maxM[0], ' '); }
  const minM = rest.match(MIN_PRICE_RE);
  if (minM) { minPrice = parsePrice(parseFloat(minM[1]), minM[2]); rest = rest.replace(minM[0], ' '); }

  // 2. Detect purpose
  const purpose: ParsedSearchIntent['purpose'] = RENT_RE.test(rest) ? 'Rent' : BUY_RE.test(rest) ? 'Sale' : null;

  // 3. Detect BHK
  const bhkMatch = rest.match(BHK_RE);
  const bedrooms = bhkMatch ? parseInt(bhkMatch[1], 10) : null;
  if (bhkMatch) rest = rest.replace(bhkMatch[0], ' ');

  // 4. Detect property type from known keywords (longest match first)
  let detectedType: CategorySlug | null = null;
  const lowerRest = rest.toLowerCase();
  
  // Sort keywords by length descending to match multi-word phrases first (e.g. "open plot", "independent house")
  const allKeywords: { slug: CategorySlug; kw: string }[] = [];
  for (const [slug, meta] of Object.entries(CATEGORY_META)) {
    for (const kw of meta.keywords) {
      allKeywords.push({ slug: slug as CategorySlug, kw });
    }
  }
  allKeywords.sort((a, b) => b.kw.length - a.kw.length);

  for (const { slug, kw } of allKeywords) {
    const kwRegex = new RegExp(`\\b${kw.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (kwRegex.test(lowerRest)) {
      detectedType = slug;
      rest = rest.replace(kwRegex, ' ');
      break;
    }
  }

  // 5. Strip generic search-intent words to isolate location tokens
  const location = rest
    .replace(SEARCH_INTENT_WORDS_RE, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    location,
    propertyType: detectedType,
    purpose,
    bedrooms,
    maxPrice,
    minPrice,
    originalQuery: rawQuery,
  };
}

// ─── Canonical property_type_name → CategorySlug ────────────

/**
 * Maps a raw property_type_name or slug from the DB (e.g. "Open Plot", "Flat", "Office Space")
 * to the canonical category slug used in the UI.
 */
export function mapPropertyTypeToCategory(typeName: string): CategorySlug | null {
  if (!typeName) return null;
  const lower = typeName.toLowerCase().trim();

  if (/plot|land/.test(lower)) return 'plots';
  if (/apartment|flat|studio|penthouse|builder\s*floor/.test(lower)) return 'apartment';
  if (/villa|bungalow|duplex/.test(lower)) return 'villa';
  if (/independent|row\s*house|individual\s*house/.test(lower)) return 'independent-house';
  if (/office|it\s*park|business\s*center|commercial\s*space|commercial\s*office/.test(lower)) return 'commercial-office';
  if (/shop|retail|showroom/.test(lower)) return 'retail-shop';
  if (/warehouse|godown|industrial\s*shed|cold\s*storage/.test(lower)) return 'warehouse';
  if (/co.?working|pg|coliving|hostel|shared\s*office/.test(lower)) return 'co-working';

  // Try standard normalizer as fallback
  return normalizeCategorySlug(lower);
}

// ─── In-memory Cache for Location Discovery ──────────────────
interface CacheEntry {
  timestamp: number;
  data: LocationDiscoveryResult;
}
const discoveryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 1 minute

// ─── Location Category Discovery ─────────────────────────────

/**
 * Fetches live property category counts for a given location from Supabase.
 *
 * Uses ONE grouped query (not one per category) for maximum performance.
 * Only returns categories with count > 0 — never shows empty categories.
 *
 * @param location  Raw location string from the query (e.g. "Gachibowli", "Hyderabad")
 * @param purpose   Optional purpose filter ("Sale" | "Rent")
 */
export async function fetchLocationCategoryDiscovery(
  location: string,
  purpose?: 'Sale' | 'Rent' | null,
): Promise<LocationDiscoveryResult> {
  const cleanLoc = (location || '').trim();
  if (!cleanLoc || cleanLoc.length < 2) {
    return { location: cleanLoc, categories: [], totalCount: 0 };
  }

  const cacheKey = `${cleanLoc.toLowerCase()}__${purpose || 'all'}`;
  const cached = discoveryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Tokenize location (e.g. "Gachibowli Hyderabad" -> ["Gachibowli", "Hyderabad"])
  const tokens = cleanLoc.split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length === 0) {
    return { location: cleanLoc, categories: [], totalCount: 0 };
  }

  try {
    let q = supabase
      .from('v_properties_search')
      .select('property_type_name, property_type_category, locality_name, city_name, purpose')
      .or('status.eq.published,status.eq.live,is_live.eq.true');

    if (purpose) {
      q = q.eq('purpose', purpose);
    }

    // Match all tokens against search_text (which contains locality + city + project + title)
    for (const token of tokens) {
      q = q.ilike('search_text', `%${token}%`);
    }

    const { data, error } = await q.limit(1000);
    if (error) throw error;

    const rows = (data ?? []) as {
      property_type_name: string | null;
      property_type_category: string | null;
      locality_name: string | null;
      city_name: string | null;
      purpose: string;
    }[];

    if (rows.length === 0) {
      const emptyResult: LocationDiscoveryResult = { location: cleanLoc, categories: [], totalCount: 0 };
      discoveryCache.set(cacheKey, { timestamp: Date.now(), data: emptyResult });
      return emptyResult;
    }

    // Resolve representative city name if available
    const resolvedCity = rows.find((r) => r.city_name)?.city_name ?? undefined;

    // Group rows by mapped canonical CategorySlug using identical categorizer
    const counts: Partial<Record<CategorySlug, number>> = {};
    for (const row of rows) {
      const slug = categorizeProperty(row);
      if (slug) {
        counts[slug] = (counts[slug] ?? 0) + 1;
      }
    }

    // Build verified categories list (strictly count > 0)
    const categories: LocationCategoryCount[] = (Object.entries(counts) as [CategorySlug, number][])
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([slug, count]) => {
        const meta = CATEGORY_META[slug];
        return {
          type: slug,
          label: meta?.pluralLabel ?? slug,
          emoji: meta?.emoji ?? '🏠',
          count,
        };
      });

    const result: LocationDiscoveryResult = {
      location: cleanLoc,
      city: resolvedCity,
      categories,
      totalCount: rows.length,
    };

    discoveryCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  } catch (err) {
    console.error('fetchLocationCategoryDiscovery error:', err);
    return { location: cleanLoc, categories: [], totalCount: 0 };
  }
}

/**
 * Single source of truth for Category Filter Chips & Results Count Synchronization.
 *
 * Runs the identical buildPublishedQuery with active non-category filters
 * (location, city_id, locality_id, purpose, price, BHK, area, amenities, etc.)
 * and categorizes each row using the canonical categorizeProperty logic.
 *
 * Guarantees that:
 * 1. "All Types" count == total matching properties
 * 2. Every category chip count == matching properties for that category
 * 3. Clicking a category chip returns EXACTLY that number of properties
 */
export async function fetchSearchCategoryCounts(
  filters: PropertyFilters = {}
): Promise<LocationDiscoveryResult> {
  // Strip category & type filters so we calculate counts across all categories
  // while strictly preserving every other active filter (city, locality, price, BHK, purpose, etc.)
  const baseFilters: PropertyFilters = {
    ...filters,
    category: undefined,
    type: undefined,
    property_type_id: undefined,
    limit: 5000,
    offset: 0,
  };

  try {
    const q = buildPublishedQuery(baseFilters);
    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as {
      property_type_name: string | null;
      property_type_category: string | null;
      purpose: string;
      city_name?: string | null;
      locality_name?: string | null;
    }[];

    const totalCount = rows.length;

    // Tally counts across all canonical categories
    const counts: Record<CategorySlug, number> = {
      apartment: 0,
      'independent-house': 0,
      villa: 0,
      plots: 0,
      'commercial-office': 0,
      'retail-shop': 0,
      warehouse: 0,
      'co-working': 0,
    };

    for (const row of rows) {
      const slug = categorizeProperty(row);
      if (slug && counts[slug] !== undefined) {
        counts[slug] += 1;
      }
    }

    const categories: LocationCategoryCount[] = CATEGORY_LIST.map((catMeta) => {
      const meta = CATEGORY_META[catMeta.slug];
      return {
        type: catMeta.slug,
        label: catMeta.pluralName,
        emoji: meta?.emoji ?? '🏠',
        count: counts[catMeta.slug] || 0,
      };
    });

    const locationName = rows[0]?.locality_name || rows[0]?.city_name || filters.q || '';
    const resolvedCity = rows.find((r) => r.city_name)?.city_name ?? undefined;

    return {
      location: locationName,
      city: resolvedCity,
      categories,
      totalCount,
    };
  } catch (err) {
    console.error('fetchSearchCategoryCounts error:', err);
    return {
      location: '',
      categories: CATEGORY_LIST.map((catMeta) => ({
        type: catMeta.slug,
        label: catMeta.pluralName,
        emoji: CATEGORY_META[catMeta.slug]?.emoji ?? '🏠',
        count: 0,
      })),
      totalCount: 0,
    };
  }
}

export { CATEGORY_META };

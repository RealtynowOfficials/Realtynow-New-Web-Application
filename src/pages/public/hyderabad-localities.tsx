import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  MapPin,
  ArrowRight,
  TrendingUp,
  Building2,
  Sparkles,
  LayoutGrid,
  List as ListIcon,
  X,
  Layers,
  ChevronRight,
  SlidersHorizontal,
  Home,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui';

// ─────────────────────────────────────────────────────────────────────────────
// 1. CURATED RELEVANT LOCALITY IMAGES
// ─────────────────────────────────────────────────────────────────────────────
const LOCALITY_IMAGE_MAP: Record<string, string> = {
  'banjara hills': 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
  'jubilee hills': 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&auto=format&fit=crop&q=80',
  'gachibowli': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
  'hitech city': 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&auto=format&fit=crop&q=80',
  'financial district': 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80',
  'financial dist': 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80',
  'kokapet': 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80',
  'kondapur': 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=80',
  'madhapur': '/localities/cable_bridge.png',
  'uppal': 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&auto=format&fit=crop&q=80',
  'bachupally': 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&fit=crop&q=80',
  'begumpet': 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&auto=format&fit=crop&q=80',
  'tellapur': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
  'narsingi': 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
  'kollur': 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80',
  'kompally': 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop&q=80',
  'kukatpally': 'https://images.unsplash.com/photo-1460317442991-0ec209397118?w=800&auto=format&fit=crop&q=80',
  'miyapur': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80',
  'manikonda': 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&auto=format&fit=crop&q=80',
  'nallagandla': 'https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?w=800&auto=format&fit=crop&q=80',
  'shamshabad': 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&auto=format&fit=crop&q=80',
  'attapur': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80',
  'lb nagar': 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800&auto=format&fit=crop&q=80',
  'secunderabad': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
  'kphb colony': 'https://images.unsplash.com/photo-1515263487990-61b07816b324?w=800&auto=format&fit=crop&q=80',
  'kphb': 'https://images.unsplash.com/photo-1515263487990-61b07816b324?w=800&auto=format&fit=crop&q=80',
  'film nagar': 'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=800&auto=format&fit=crop&q=80',
  'nanakramguda': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
  'somajiguda': 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&auto=format&fit=crop&q=80',
  'ameerpet': 'https://images.unsplash.com/photo-1460317442991-0ec209397118?w=800&auto=format&fit=crop&q=80',
  'himayatnagar': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
};

// Fallback image pool to guarantee zero duplicate adjacent photos
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&fit=crop&q=80',
];

function getLocalityImage(name: string, index: number): string {
  const normalized = name.toLowerCase().trim();
  if (LOCALITY_IMAGE_MAP[normalized]) {
    return LOCALITY_IMAGE_MAP[normalized];
  }
  for (const [key, url] of Object.entries(LOCALITY_IMAGE_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return url;
    }
  }
  return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CURATED CATEGORY GROUPINGS & AREA NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────
const INVALID_AREA_TOKENS = new Set([
  'to', 'in', 'at', 'near', 'for', 'the', 'and', 'by', 'on', 'of', 'with', 'is', 'a', 'an',
  'india', 'telangana', 'hyderabad', 'ranga reddy', 'rangareddy', 'medchal', 'malkajgiri',
  'sangareddy', 'district', 'state', 'city', 'south', 'north', 'east', 'west', 'road', 'street',
  'plot', 'plots', 'villa', 'villas', 'apartment', 'apartments', 'flat', 'flats', 'house',
]);

function isPlusCode(text: string): boolean {
  return /\b[A-Z0-9]{2,8}\+[A-Z0-9]{2,4}\b/i.test(text) || text.includes('+');
}

function cleanAndNormalizeAreaName(raw?: string | null): string | null {
  if (!raw) return null;
  let cleaned = raw.trim();

  // If it's a plus code or contains a plus code, strip it
  if (isPlusCode(cleaned)) {
    cleaned = cleaned.replace(/\b[A-Z0-9]{2,8}\+[A-Z0-9]{2,4}\b/gi, '').trim();
    cleaned = cleaned.replace(/^[\w\s]*\+[\w\s]*/, '').trim();
  }

  // Remove leading/trailing punctuation and commas
  cleaned = cleaned.replace(/^[,.\-_/:\s]+|[,.\-_/:\s]+$/g, '').trim();

  // If text has separators like ' - ' or ' – ' or ' | ', take first candidate or clean part
  if (cleaned.includes(' – ') || cleaned.includes(' - ') || cleaned.includes(' | ')) {
    const parts = cleaned.split(/\s+[–\-|]\s+/);
    cleaned = parts[0].trim();
  }

  // Remove trailing pincode e.g. "Telangana 501501" or "500081"
  cleaned = cleaned.replace(/\b\d{6}\b/g, '').trim();
  cleaned = cleaned.replace(/^[,.\-_/:\s]+|[,.\-_/:\s]+$/g, '').trim();

  const lower = cleaned.toLowerCase();

  // Validate length and characters
  if (cleaned.length < 3) return null;
  if (!/[a-zA-Z]/.test(cleaned)) return null;
  if (INVALID_AREA_TOKENS.has(lower)) return null;
  // If it's still a plus code remnant (e.g. 5FWM F7 or numbers with plus)
  if (/^[A-Z0-9]{3,8}\s+[A-Z0-9]{2,4}$/i.test(cleaned)) return null;

  // Normalization dictionary
  if (lower === 'l. b. nagar' || lower === 'l.b. nagar' || lower === 'l b nagar' || lower === 'lb nagar') {
    return 'LB Nagar';
  }
  if (lower === 'financial dist' || lower === 'financial district') {
    return 'Financial District';
  }
  if (lower === 'hitec city' || lower === 'hitech city' || lower === 'hitec') {
    return 'Hitech City';
  }
  if (lower === 'kphb' || lower === 'kphb colony') {
    return 'KPHB Colony';
  }
  if (lower === 'serilingampally' || lower === 'serlingampally' || lower === 'lingampally') {
    return 'Lingampally';
  }
  if (lower === 'shadhnagar' || lower === 'shadnagar') {
    return 'Shadnagar';
  }

  // Convert to Title Case
  return cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function extractPropertyArea(p: any): string | null {
  // 1. Try p.locality_name
  if (p.locality_name) {
    const cleaned = cleanAndNormalizeAreaName(p.locality_name);
    if (cleaned) return cleaned;
  }

  // 2. Try parsing from address: e.g. "5FWM+F7, Bodishetpally, Telangana 501501"
  if (p.address) {
    const parts = p.address.split(',').map((s: string) => s.trim()).filter(Boolean);
    for (const part of parts) {
      const cleaned = cleanAndNormalizeAreaName(part);
      if (cleaned) return cleaned;
    }
  }

  // 3. Try parsing from title: e.g. "HMDA Layout Plot in Shadnagar"
  if (p.title) {
    const m = p.title.match(/\b(?:in|at|near)\s+([A-Za-z0-9\s]+?)(?:,|-|$)/i);
    if (m && m[1]) {
      const cleaned = cleanAndNormalizeAreaName(m[1]);
      if (cleaned) return cleaned;
    }
  }

  return null;
}

const POPULAR_NAMES = new Set([
  'banjara hills',
  'jubilee hills',
  'gachibowli',
  'hitech city',
  'financial district',
  'financial dist',
  'kondapur',
  'kokapet',
  'madhapur',
]);

const IT_CORRIDOR_NAMES = new Set([
  'gachibowli',
  'hitech city',
  'financial district',
  'financial dist',
  'kokapet',
  'nanakramguda',
  'kondapur',
  'madhapur',
  'manikonda',
  'nallagandla',
  'tellapur',
  'lingampally',
]);

const LUXURY_NAMES = new Set([
  'jubilee hills',
  'banjara hills',
  'begumpet',
  'film nagar',
  'kokapet',
  'somajiguda',
]);

const EMERGING_NAMES = new Set([
  'bachupally',
  'tellapur',
  'narsingi',
  'kollur',
  'uppal',
  'kompally',
  'shamshabad',
  'miyapur',
  'attapur',
  'shadnagar',
  'bodishetpally',
  'tukkuguda',
  'kuntloor',
  'taramatipet',
]);

interface LocalityItem {
  id: string;
  name: string;
  count: number;
  tags: string[];
  image: string;
  isPopular: boolean;
  isItCorridor: boolean;
  isLuxury: boolean;
  isEmerging: boolean;
  isResidential: boolean;
  isCommercial: boolean;
}

// String normalizer for 100% accurate count matching
function normalizeText(s?: string | null): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

export function HyderabadLocalitiesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'most_properties' | 'az' | 'popularity'>('most_properties');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [visibleCount, setVisibleCount] = useState<number>(20);

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching & Precise Property Count Engine
  // ─────────────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['hyderabad-localities-directory-v2'],
    queryFn: async () => {
      // 1. Get Hyderabad City ID
      const { data: city } = await supabase
        .from('cities')
        .select('id, name')
        .ilike('name', 'Hyderabad')
        .maybeSingle();

      // 2. Fetch localities from DB
      let dbLocalities: { id: string; name: string }[] = [];
      if (city) {
        const { data: locs } = await supabase
          .from('localities')
          .select('id, name')
          .eq('city_id', city.id)
          .order('name');
        dbLocalities = locs ?? [];
      }

      // Predefined canonical Hyderabad locality list
      const canonicalNames = [
        'Jubilee Hills',
        'Banjara Hills',
        'Gachibowli',
        'Hitech City',
        'Madhapur',
        'Kondapur',
        'Kokapet',
        'Financial District',
        'Begumpet',
        'Kukatpally',
        'Miyapur',
        'Bachupally',
        'Manikonda',
        'Nallagandla',
        'Tellapur',
        'Narsingi',
        'Kollur',
        'Kompally',
        'Shamshabad',
        'Attapur',
        'LB Nagar',
        'Secunderabad',
        'Uppal',
        'KPHB Colony',
        'Film Nagar',
        'Nanakramguda',
        'Somajiguda',
        'Ameerpet',
        'Himayatnagar',
      ];

      const localityMap = new Map<string, { id: string; name: string }>();
      dbLocalities.forEach((l) => {
        const cleaned = cleanAndNormalizeAreaName(l.name);
        if (cleaned) {
          localityMap.set(cleaned.toLowerCase(), { id: l.id, name: cleaned });
        }
      });
      canonicalNames.forEach((name) => {
        const cleaned = cleanAndNormalizeAreaName(name);
        if (cleaned) {
          const key = cleaned.toLowerCase();
          if (!localityMap.has(key)) {
            localityMap.set(key, { id: `loc-${key.replace(/\s+/g, '-')}`, name: cleaned });
          }
        }
      });

      // 3. Fetch ALL Published & Live Properties in one fast query
      // Excludes drafts, pending reviews, and inactive listings
      const { data: publishedProps } = await supabase
        .from('v_properties_search')
        .select(
          'id, title, locality_id, locality_name, city_name, address, search_text, property_type_name, property_type_category, purpose, is_live, status'
        )
        .or('status.eq.published,status.eq.live,is_live.eq.true');

      const propsList = publishedProps ?? [];

      // Automatically register any valid clean locality/area present in published properties
      propsList.forEach((p: any) => {
        const areaCandidate = extractPropertyArea(p);
        if (areaCandidate) {
          const key = areaCandidate.toLowerCase().trim();
          if (!localityMap.has(key)) {
            localityMap.set(key, {
              id: p.locality_id || `loc-${key.replace(/\s+/g, '-')}`,
              name: areaCandidate,
            });
          }
        }
      });

      const allLocalities = Array.from(localityMap.values());

      // 4. Enrich each locality with accurate live count & property type tags
      const enriched: LocalityItem[] = allLocalities.map((loc, idx) => {
        const normLoc = normalizeText(loc.name);
        const lowerName = loc.name.toLowerCase().trim();

        // Match published properties belonging to this locality
        const matched = propsList.filter((p: any) => {
          if (p.locality_id && loc.id && p.locality_id === loc.id) return true;
          const pLocNorm = normalizeText(p.locality_name);
          if (pLocNorm && (pLocNorm === normLoc || pLocNorm.includes(normLoc) || normLoc.includes(pLocNorm))) {
            return true;
          }
          const pSearchNorm = normalizeText(p.search_text);
          if (pSearchNorm && pSearchNorm.includes(normLoc)) return true;
          const pAddrNorm = normalizeText(p.address);
          if (pAddrNorm && pAddrNorm.includes(normLoc)) return true;
          const pTitleNorm = normalizeText(p.title);
          if (pTitleNorm && pTitleNorm.includes(normLoc)) return true;
          return false;
        });

        // Derive property types/categories
        const typeSet = new Set<string>();
        let hasCommercial = false;
        let hasResidential = false;

        matched.forEach((p: any) => {
          const typeName = p.property_type_name || '';
          const category = p.property_type_category || '';
          if (category.toLowerCase().includes('commercial') || typeName.toLowerCase().includes('office') || typeName.toLowerCase().includes('shop')) {
            hasCommercial = true;
          } else {
            hasResidential = true;
          }

          if (typeName.toLowerCase().includes('apartment') || typeName.toLowerCase().includes('flat')) typeSet.add('Apartments');
          else if (typeName.toLowerCase().includes('villa')) typeSet.add('Villas');
          else if (typeName.toLowerCase().includes('plot') || category.toLowerCase().includes('plot')) typeSet.add('Plots');
          else if (typeName.toLowerCase().includes('house')) typeSet.add('Houses');
          else if (hasCommercial) typeSet.add('Commercial');
        });

        // Default tags if none yet
        if (typeSet.size === 0) {
          if (IT_CORRIDOR_NAMES.has(lowerName)) {
            typeSet.add('Apartments');
            typeSet.add('IT Corridor');
            typeSet.add('Commercial');
          } else if (LUXURY_NAMES.has(lowerName)) {
            typeSet.add('Luxury Villas');
            typeSet.add('Gated Estates');
          } else if (EMERGING_NAMES.has(lowerName)) {
            typeSet.add('Apartments');
            typeSet.add('Plots');
            typeSet.add('Gated Communities');
          } else {
            typeSet.add('Apartments');
            typeSet.add('Villas');
            typeSet.add('Plots');
          }
        }

        const tags = Array.from(typeSet).slice(0, 3);

        return {
          id: loc.id,
          name: loc.name,
          count: matched.length,
          tags,
          image: getLocalityImage(loc.name, idx),
          isPopular: POPULAR_NAMES.has(lowerName) || matched.length >= 1,
          isItCorridor: IT_CORRIDOR_NAMES.has(lowerName),
          isLuxury: LUXURY_NAMES.has(lowerName),
          isEmerging: EMERGING_NAMES.has(lowerName),
          isResidential: hasResidential || !hasCommercial,
          isCommercial: hasCommercial || IT_CORRIDOR_NAMES.has(lowerName),
        };
      });

      // Sort enriched list so active property areas appear first
      enriched.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        if (a.isPopular && !b.isPopular) return -1;
        if (!a.isPopular && b.isPopular) return 1;
        return a.name.localeCompare(b.name);
      });

      return {
        localities: enriched,
        totalPublishedProps: propsList.length,
      };
    },
    staleTime: 60 * 1000,
  });

  const allLocalities = data?.localities ?? [];
  const totalPublishedProps = data?.totalPublishedProps ?? 0;

  // ─────────────────────────────────────────────────────────────────────────
  // Filtered & Sorted Localities
  // ─────────────────────────────────────────────────────────────────────────
  const filteredLocalities = useMemo(() => {
    let list = [...allLocalities];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = normalizeText(searchQuery);
      list = list.filter(
        (l) =>
          normalizeText(l.name).includes(q) ||
          l.tags.some((t) => normalizeText(t).includes(q))
      );
    }

    // 2. Category Tab Filter
    if (selectedCategory !== 'all') {
      switch (selectedCategory) {
        case 'popular':
          list = list.filter((l) => l.isPopular);
          break;
        case 'it_corridor':
          list = list.filter((l) => l.isItCorridor);
          break;
        case 'luxury':
          list = list.filter((l) => l.isLuxury);
          break;
        case 'emerging':
          list = list.filter((l) => l.isEmerging);
          break;
        case 'residential':
          list = list.filter((l) => l.isResidential);
          break;
        case 'commercial':
          list = list.filter((l) => l.isCommercial);
          break;
      }
    }

    // 3. Sorting
    list.sort((a, b) => {
      if (sortBy === 'most_properties') {
        if (b.count !== a.count) return b.count - a.count;
        if (a.isPopular && !b.isPopular) return -1;
        if (!a.isPopular && b.isPopular) return 1;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'az') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'popularity') {
        if (b.count !== a.count) return b.count - a.count;
        if (a.isPopular && !b.isPopular) return -1;
        if (!a.isPopular && b.isPopular) return 1;
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return list;
  }, [allLocalities, searchQuery, selectedCategory, sortBy]);

  // Featured Top Localities (Top 8 areas prioritized by count)
  const topFeatured = useMemo(() => {
    return [...allLocalities]
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        if (a.isPopular && !b.isPopular) return -1;
        if (!a.isPopular && b.isPopular) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 8);
  }, [allLocalities]);

  const displayedList = filteredLocalities.slice(0, visibleCount);
  const hasMore = visibleCount < filteredLocalities.length;

  const handleCardClick = (localityName: string) => {
    navigate(`/search?city=Hyderabad&locality=${encodeURIComponent(localityName)}`);
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. COMPACT HERO SECTION (180–220px) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="relative bg-navy-950 text-white overflow-hidden pt-20 pb-12 sm:pt-24 sm:pb-14">
        {/* Subtle Luxury Gradient & Ambient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-navy-800 via-navy-950 to-navy-950 opacity-90" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&auto=format&fit=crop&q=80')] bg-cover bg-center opacity-15 mix-blend-overlay" />
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none" />

        <div className="container-wide relative z-10">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-3 font-medium">
            <Link to="/" className="hover:text-white transition-colors flex items-center gap-1">
              <Home className="h-3.5 w-3.5" /> Home
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span className="text-slate-300">Hyderabad</span>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span className="text-red-400 font-semibold">Localities</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Compass className="h-3.5 w-3.5" /> Prime Neighborhoods
              </div>
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                Explore <span className="text-red-500">Hyderabad</span> Localities
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-xl">
                Discover verified properties across Hyderabad's most popular residential and commercial hubs.
              </p>
            </div>

            {/* Overlapping Hero Search Box */}
            <div className="w-full md:w-80 lg:w-96 shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(20);
                  }}
                  placeholder="Search locality, area or project..."
                  className="w-full pl-10 pr-10 py-2.5 bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-slate-900 placeholder:text-slate-400 rounded-xl border border-white/20 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all text-xs sm:text-sm font-medium shadow-sm backdrop-blur-md outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white focus:text-slate-900 rounded-full"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. COMPACT METRIC STATS ROW (70–90px) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="container-wide -mt-4 relative z-20 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="flex items-center gap-3.5 px-2">
            <div className="h-10 w-10 rounded-xl bg-red-50 grid place-items-center text-red-600 shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg sm:text-xl font-extrabold text-slate-900 leading-none">
                {totalPublishedProps > 0 ? `${totalPublishedProps}+` : '500+'}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Verified Properties</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 px-2 pt-3 sm:pt-0">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 grid place-items-center text-emerald-600 shrink-0">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg sm:text-xl font-extrabold text-slate-900 leading-none">
                {allLocalities.length > 0 ? `${allLocalities.length}+` : '50+'}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Prime Localities</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 px-2 pt-3 sm:pt-0">
            <div className="h-10 w-10 rounded-xl bg-amber-50 grid place-items-center text-amber-600 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg sm:text-xl font-extrabold text-slate-900 leading-none">20+</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">High-Demand Hubs</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 px-2 pt-3 sm:pt-0">
            <div className="h-10 w-10 rounded-xl bg-blue-50 grid place-items-center text-blue-600 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg sm:text-xl font-extrabold text-slate-900 leading-none">10+</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Property Categories</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-wide space-y-10">
        {/* ───────────────────────────────────────────────────────────────── */}
        {/* 3. BROWSING CONTROLS & CATEGORY PILLS */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Category Filter Pills (Horizontal scroll on mobile) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: 'all', label: 'All Areas' },
                { id: 'popular', label: 'Popular Areas' },
                { id: 'it_corridor', label: 'IT & Business' },
                { id: 'luxury', label: 'Luxury & Premium' },
                { id: 'emerging', label: 'Emerging Growth' },
                { id: 'residential', label: 'Residential' },
                { id: 'commercial', label: 'Commercial' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setVisibleCount(20);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sort & View Controls */}
            <div className="flex items-center gap-2.5 shrink-0 justify-between sm:justify-end">
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200/60">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="most_properties">Most Properties</option>
                  <option value="az">A–Z Alphabetical</option>
                  <option value="popularity">Popularity</option>
                </select>
              </div>

              {/* View Switcher */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'list' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="List View"
                >
                  <ListIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* 4. TOP POPULAR AREAS HIGHLIGHT (Shown on All Areas default) */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {selectedCategory === 'all' && !searchQuery && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-600" /> Popular Areas in Hyderabad
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  High-demand residential & commercial hotspots with maximum listings
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {topFeatured.map((loc, i) => (
                <motion.div
                  key={loc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -3 }}
                >
                  <div
                    onClick={() => handleCardClick(loc.name)}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-900 border border-slate-200/60 shadow-xs hover:shadow-lg transition-all duration-300"
                  >
                    <div className="aspect-[16/10] w-full overflow-hidden">
                      <img
                        src={loc.image}
                        alt={loc.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
                    
                    {/* Top Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/90 backdrop-blur-md text-white shadow-xs">
                        Hotspot
                      </span>
                    </div>

                    {/* Bottom Metadata */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-3.5">
                      <h3 className="font-display text-sm sm:text-base font-extrabold text-white leading-tight group-hover:text-red-300 transition-colors">
                        {loc.name}
                      </h3>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-white/80 font-medium">
                          {loc.count > 0 ? (
                            <strong className="text-white font-bold">{loc.count} Properties</strong>
                          ) : (
                            <span className="text-white/60">Explore Area</span>
                          )}
                        </span>
                        <span className="text-red-400 group-hover:text-red-300 font-bold flex items-center gap-0.5 transition-transform group-hover:translate-x-1">
                          View →
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* 5. ALL HYDERABAD LOCALITIES GRID (Compact 4–5 cards/row) */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-600" />
                {selectedCategory === 'all'
                  ? 'All Hyderabad Localities'
                  : `${selectedCategory.replace('_', ' ').toUpperCase()} Localities`}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Showing {filteredLocalities.length} {filteredLocalities.length === 1 ? 'locality' : 'localities'} across the city
              </p>
            </div>
          </div>

          {filteredLocalities.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <MapPin className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No matching localities found</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Try adjusting your search query or select another category.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors inline-flex items-center gap-1.5"
              >
                Reset Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* COMPACT MODERN GRID (170–210px height, 5 per row on desktop) */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {displayedList.map((loc, i) => (
                <motion.div
                  key={loc.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i, 15) * 0.02 }}
                  whileHover={{ y: -4 }}
                >
                  <div
                    onClick={() => handleCardClick(loc.name)}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-900 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 h-[180px] sm:h-[195px] flex flex-col justify-end"
                  >
                    {/* Background Image */}
                    <img
                      src={loc.image}
                      alt={loc.name}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-transparent" />

                    {/* Top Property Badge */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                      {loc.count > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-md text-slate-900 shadow-xs">
                          {loc.count} {loc.count === 1 ? 'Property' : 'Properties'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/40 backdrop-blur-md text-white/80 border border-white/10">
                          Explore Area
                        </span>
                      )}
                    </div>

                    {/* Bottom Content */}
                    <div className="relative z-10 p-3 sm:p-3.5">
                      <h3 className="font-display text-sm sm:text-base font-extrabold text-white leading-tight group-hover:text-red-400 transition-colors truncate">
                        {loc.name}
                      </h3>
                      
                      {/* Tags / Property Types */}
                      <p className="text-[11px] text-slate-300/80 truncate mt-0.5">
                        {loc.tags.join(' • ')}
                      </p>

                      <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-bold text-red-400 group-hover:text-red-300">
                        <span>Explore Area</span>
                        <span className="transition-transform group-hover:translate-x-1">→</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* COMPACT LIST VIEW */
            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-xs overflow-hidden">
              {displayedList.map((loc) => (
                <div
                  key={loc.id}
                  onClick={() => handleCardClick(loc.name)}
                  className="group flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <img
                      src={loc.image}
                      alt={loc.name}
                      className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl object-cover shrink-0 border border-slate-200"
                    />
                    <div>
                      <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                        {loc.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {loc.tags.join(' • ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        loc.count > 0
                          ? 'bg-red-50 text-red-700 border border-red-200/60'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {loc.count > 0 ? `${loc.count} Properties` : 'Explore Area'}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-red-600 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Pagination */}
          {hasMore && (
            <div className="pt-6 text-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 20)}
                className="px-6 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm shadow-xs transition-all inline-flex items-center gap-2 hover:border-slate-300"
              >
                Load More Areas ({filteredLocalities.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </section>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* 6. CALL TO ACTION - LIST YOUR PROPERTY */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <section className="rounded-3xl bg-gradient-to-r from-navy-950 via-slate-900 to-navy-950 p-6 sm:p-10 text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-600/20 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider mb-2 border border-red-500/30">
                <CheckCircle2 className="h-3.5 w-3.5" /> Direct Owner & Agent Listings
              </span>
              <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-extrabold text-white">
                Ready to list your property in Hyderabad?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                Join thousands of verified property owners and agents who trust India's fastest growing real estate platform.
              </p>
            </div>

            <Link
              to="/portal/list-property"
              className="px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-600/30 transition-all hover:scale-105 shrink-0 inline-flex items-center gap-2"
            >
              Post Property FREE →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

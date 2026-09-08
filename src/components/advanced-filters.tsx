import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  ChevronDown,
  Check,
  SlidersHorizontal,
  MapPin,
  Search,
  RotateCcw,
  Building,
  Building2,
  Home,
  LandPlot,
  Trees,
  Store,
  Briefcase,
  Layers,
  Sparkles,
  Maximize2,
  Sprout,
  FolderGit2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { PropertyFilters } from '../lib/properties';
import {
  normalizeCategorySlug,
  type CategorySlug,
} from '../lib/categories';
import { isSameAmenity } from '../lib/amenities';
import { supabase } from '../lib/supabase';

export interface AdvancedFiltersProps {
  filters: PropertyFilters;
  onFilterChange: (filters: Partial<PropertyFilters>) => void;
  onCloseMobile?: () => void;
  cities?: { id: string; name: string }[];
  localities?: { id: string; name: string; city_id?: string }[];
  categoryCounts?: Partial<Record<CategorySlug, number>>;
  totalCount?: number;
}

// Top Hyderabad investment & residential hubs matching user design
const POPULAR_LOCALITIES = [
  'Yacharam',
  'Shadnagar',
  'Kokapet',
  'Kondapur',
  'Gachibowli',
  'Tellapur',
  'Adibatla',
  'Shamshabad',
  'Madhapur',
  'Hitech City',
  'Financial District',
  'Manikonda',
  'Mokila',
  'Kollur',
  'Nallagandla',
  'Banjara Hills',
  'Jubilee Hills',
  'Puppalguda',
  'Narsingi',
  'Maheshwaram',
];

// Top Curated Amenities matching user design
const POPULAR_AMENITIES = [
  'Park',
  'Club House',
  'Swimming Pool',
  'Gym',
  'Gated Community',
  '24/7 Security',
  'Power Backup',
  'Children Play Area',
  'Lift',
  'Water Supply',
  'CCTV Surveillance',
  'Rain Water Harvesting',
  'Jogging Track',
  'Solar Lighting',
  'Community Hall',
  'Gas Pipeline',
];

const BHK_OPTIONS = [1, 2, 3, 4, 5];
const POSSESSION_STATUSES = ['Ready to Move', 'Under Construction', 'New Launch'];
const FURNISHING_OPTIONS = ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'];
const FACING_OPTIONS = ['East', 'North', 'West', 'South', 'North-East'];

export function AdvancedFilters({
  filters,
  onFilterChange,
  onCloseMobile,
  cities = [],
  totalCount,
}: AdvancedFiltersProps) {
  const activeSlug = normalizeCategorySlug(filters.category || filters.type);

  // Local state for expandable sections
  const [showMoreTypes, setShowMoreTypes] = useState(false);
  const [showMoreLocalities, setShowMoreLocalities] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [localitySearch, setLocalitySearch] = useState('');
  const [searchQuery, setSearchQuery] = useState(filters.q || '');
  const [isOtherFiltersOpen, setIsOtherFiltersOpen] = useState(false);

  // Project/Builder state
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectsList, setProjectsList] = useState<{ id: string; name: string; type: 'project' | 'builder' }[]>([]);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Sync internal search query if external filter changes
  useEffect(() => {
    setSearchQuery(filters.q || '');
  }, [filters.q]);

  // Fetch projects and builders for dropdown
  useEffect(() => {
    let isMounted = true;
    async function loadProjectsAndBuilders() {
      try {
        const [{ data: builders }, { data: projects }] = await Promise.all([
          supabase.from('builders').select('id, name').limit(15),
          supabase.from('projects').select('id, name').limit(15),
        ]);
        if (!isMounted) return;

        const combined: { id: string; name: string; type: 'project' | 'builder' }[] = [];
        if (projects) {
          combined.push(...projects.map((p) => ({ id: p.id, name: p.name, type: 'project' as const })));
        }
        if (builders) {
          combined.push(...builders.map((b) => ({ id: b.id, name: b.name, type: 'builder' as const })));
        }
        setProjectsList(combined);
      } catch (err) {
        console.warn('Could not load projects/builders:', err);
      }
    }
    loadProjectsAndBuilders();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close project dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine active purpose ('Sale' | 'Rent' | 'Commercial')
  const activePurpose = useMemo(() => {
    const raw = (filters.purpose || '').toLowerCase();
    if (raw === 'rent' || raw === 'lease') return 'Rent';
    if (raw === 'commercial' || (activeSlug && ['commercial-spaces', 'shops-showrooms', 'godowns-warehouses'].includes(activeSlug))) {
      return 'Commercial';
    }
    return 'Sale';
  }, [filters.purpose, activeSlug]);

  // Is Plot or Land selected?
  const isPlotCategory = useMemo(() => {
    return activeSlug === 'open-plots-land' || activeSlug === 'agriculture-land' || (activeSlug as string) === 'plots';
  }, [activeSlug]);

  // Property types grid configuration
  const propertyTypes = useMemo(() => {
    const primary = [
      { key: 'all', label: 'All', icon: Sparkles, slug: undefined },
      { key: 'plot', label: 'Plot', icon: LandPlot, slug: 'open-plots-land' },
      { key: 'house', label: 'Independent House', icon: Home, slug: 'independent-houses' },
      { key: 'apartment', label: 'Apartment', icon: Building2, slug: 'apartment-flats' },
      { key: 'villa', label: 'Villa', icon: Building, slug: 'luxury-villas' },
      { key: 'farm_house', label: 'Farm House', icon: Trees, slug: 'farm-houses' },
    ];

    const extended = [
      { key: 'commercial', label: 'Commercial', icon: Briefcase, slug: 'commercial-spaces' },
      { key: 'shop', label: 'Shop / Showroom', icon: Store, slug: 'shops-showrooms' },
      { key: 'penthouse', label: 'Penthouse', icon: Maximize2, slug: 'pent-houses' },
      { key: 'duplex', label: 'Duplex House', icon: Layers, slug: 'duplex-houses' },
      { key: 'agri', label: 'Agri Land', icon: Sprout, slug: 'agriculture-land' },
    ];

    return showMoreTypes ? [...primary, ...extended] : primary;
  }, [showMoreTypes]);

  // Price Range calculations (Rent vs Sale)
  const isRent = activePurpose === 'Rent';
  const priceMaxLimit = isRent ? 200000 : 50000000; // 2 Lakhs vs 5 Cr
  const currentMinPrice = filters.min_price ?? 0;
  const currentMaxPrice = filters.max_price ?? priceMaxLimit;

  // Format price helper
  const formatDisplayPrice = (val: number, isMax = false) => {
    if (val === 0 && !isMax) return '₹ 0';
    if (val >= priceMaxLimit && isMax) {
      return isRent ? '₹ 2 L+' : '₹ 5 Cr+';
    }
    if (val >= 10000000) {
      const cr = val / 10000000;
      return `₹ ${Number.isInteger(cr) ? cr : cr.toFixed(1)} Cr`;
    }
    if (val >= 100000) {
      const lac = val / 100000;
      return `₹ ${Number.isInteger(lac) ? lac : lac.toFixed(1)} Lac`;
    }
    if (val >= 1000) {
      return `₹ ${(val / 1000).toFixed(0)}k`;
    }
    return `₹ ${val}`;
  };

  // Area calculation (Sq. Yards vs Sq. Ft)
  const areaUnitLabel = isPlotCategory ? 'Sq. Yd' : 'Sq. Ft';
  const areaMaxLimit = isPlotCategory ? 10000 : 8000;
  const currentMinArea = filters.min_area ?? 0;
  const currentMaxArea = filters.max_area ?? areaMaxLimit;

  const formatDisplayArea = (val: number, isMax = false) => {
    if (val === 0 && !isMax) return `0 ${areaUnitLabel}`;
    if (val >= areaMaxLimit && isMax) return `${areaMaxLimit.toLocaleString()}+ ${areaUnitLabel}`;
    return `${val.toLocaleString()} ${areaUnitLabel}`;
  };

  // Selected city name
  const currentCityName = useMemo(() => {
    if (filters.city_id) {
      const found = cities.find((c) => c.id === filters.city_id || c.name.toLowerCase() === filters.city_id?.toLowerCase());
      if (found) return found.name;
      if (filters.city_id.length > 20) return 'Hyderabad';
      return filters.city_id;
    }
    return 'Hyderabad';
  }, [filters.city_id, cities]);

  // Filtered localities chips
  const displayedLocalities = useMemo(() => {
    const list = POPULAR_LOCALITIES.filter((loc) =>
      loc.toLowerCase().includes(localitySearch.trim().toLowerCase())
    );
    return showMoreLocalities ? list : list.slice(0, 8);
  }, [localitySearch, showMoreLocalities]);

  // Amenities list
  const displayedAmenities = useMemo(() => {
    return showAllAmenities ? POPULAR_AMENITIES : POPULAR_AMENITIES.slice(0, 5);
  }, [showAllAmenities]);

  // Handlers
  const handlePurposeChange = (purpose: 'Sale' | 'Rent' | 'Commercial') => {
    if (purpose === 'Commercial') {
      onFilterChange({ purpose: 'Commercial', category: 'commercial-spaces', min_price: undefined, max_price: undefined });
    } else {
      onFilterChange({
        purpose,
        category: activeSlug?.includes('commercial') ? undefined : filters.category,
        min_price: undefined,
        max_price: undefined,
      });
    }
  };

  const handlePropertyTypeClick = (slug?: string) => {
    if (!slug) {
      onFilterChange({ category: undefined, type: undefined, property_type_id: undefined });
    } else {
      onFilterChange({ category: slug, type: undefined, property_type_id: undefined });
    }
  };

  const handleLocalityToggle = (locName: string) => {
    const isSelected = (filters.locality_id || '').toLowerCase() === locName.toLowerCase();
    onFilterChange({ locality_id: isSelected ? undefined : locName });
  };

  const handleAmenityToggle = (amenity: string) => {
    const current = filters.amenities || [];
    const exists = current.some((a) => isSameAmenity(a, amenity));
    const next = exists ? current.filter((a) => !isSameAmenity(a, amenity)) : [...current, amenity];
    onFilterChange({ amenities: next });
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onFilterChange({ q: searchQuery.trim() || undefined });
  };

  const handleResetAll = () => {
    setSearchQuery('');
    setLocalitySearch('');
    onFilterChange({
      category: undefined,
      type: undefined,
      purpose: undefined,
      city_id: undefined,
      locality_id: undefined,
      property_type_id: undefined,
      min_price: undefined,
      max_price: undefined,
      bedrooms: undefined,
      bathrooms: undefined,
      amenities: [],
      min_area: undefined,
      max_area: undefined,
      possession_status: undefined,
      facing: undefined,
      furnishing: undefined,
      verified_status: undefined,
      q: undefined,
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 w-full flex flex-col max-h-[calc(100vh-100px)] overflow-hidden">
      {/* ── 1. HEADER: Title & Clear All ── */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="text-slate-800">
            <SlidersHorizontal className="h-4 w-4 stroke-[2.5]" />
          </div>
          <h3 className="font-display font-extrabold text-base text-slate-900">Filters</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetAll}
            className="text-xs font-bold text-red-600 hover:text-red-700 transition cursor-pointer"
          >
            Clear All
          </button>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── SCROLLABLE FILTER BODY ── */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-5 custom-scrollbar py-3.5">
        {/* ── 2. QUICK PURPOSE SWITCH: Buy / Rent / Commercial ── */}
        <div>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { label: 'Buy', value: 'Sale' },
                { label: 'Rent', value: 'Rent' },
                { label: 'Commercial', value: 'Commercial' },
              ] as const
            ).map((tab) => {
              const isSelected = activePurpose === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handlePurposeChange(tab.value)}
                  className={cn(
                    'py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer',
                    isSelected
                      ? 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-600/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 3. SEARCH INPUT: Locality, project... ── */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearchSubmit();
            }}
            placeholder="Search by locality, project..."
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
          />
          <button
            type="button"
            onClick={() => handleSearchSubmit()}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600 transition"
            title="Search"
          >
            <Search className="h-4 w-4" />
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                onFilterChange({ q: undefined });
              }}
              className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ── 4. PROPERTY TYPE WITH ICONS ── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 tracking-tight">Property Type</h4>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {propertyTypes.map((pt) => {
              const isSelected = pt.key === 'all' ? !activeSlug : activeSlug === pt.slug;
              const Icon = pt.icon;
              return (
                <button
                  key={pt.key}
                  type="button"
                  onClick={() => handlePropertyTypeClick(pt.slug)}
                  className={cn(
                    'rounded-xl border p-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer min-h-[68px]',
                    isSelected
                      ? 'border-red-500 bg-red-50/50 text-red-600 shadow-2xs ring-1 ring-red-500/25'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <Icon className={cn('h-5 w-5 shrink-0', isSelected ? 'text-red-600' : 'text-slate-500')} />
                  <span className="text-[11px] font-semibold leading-tight line-clamp-1">
                    {pt.label}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowMoreTypes(!showMoreTypes)}
            className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center justify-center gap-1 mx-auto pt-1 cursor-pointer transition"
          >
            <span>{showMoreTypes ? 'Show Less' : 'Show More'}</span>
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showMoreTypes && 'rotate-180')} />
          </button>
        </div>

        {/* ── 5. PRICE RANGE SLIDER ── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 tracking-tight">Price Range</h4>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Interactive Dual Slider */}
          <div className="space-y-2 pt-1 px-1">
            <div className="relative flex items-center h-4">
              <input
                type="range"
                min="0"
                max={priceMaxLimit}
                step={isRent ? 2000 : 500000}
                value={currentMaxPrice}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onFilterChange({ max_price: val >= priceMaxLimit ? undefined : val });
                }}
                className="w-full accent-red-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Min Price & Max Price Display Boxes */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-2.5 text-left">
                <div className="text-xs font-extrabold text-slate-900">
                  {formatDisplayPrice(currentMinPrice, false)}
                </div>
                <div className="text-[10px] font-medium text-slate-400">Min Price</div>
              </div>
              <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-2.5 text-left">
                <div className="text-xs font-extrabold text-slate-900">
                  {formatDisplayPrice(currentMaxPrice, true)}
                </div>
                <div className="text-[10px] font-medium text-slate-400">Max Price</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 6. AREA (SQ. YARDS / SQ. FT) SLIDER ── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 tracking-tight">
              Area ({isPlotCategory ? 'Sq. Yards' : 'Sq. Ft'})
            </h4>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Interactive Slider */}
          <div className="space-y-2 pt-1 px-1">
            <div className="relative flex items-center h-4">
              <input
                type="range"
                min="0"
                max={areaMaxLimit}
                step={isPlotCategory ? 50 : 100}
                value={currentMaxArea}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onFilterChange({ max_area: val >= areaMaxLimit ? undefined : val });
                }}
                className="w-full accent-red-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Min Area & Max Area Display Boxes */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-2.5 text-left">
                <div className="text-xs font-extrabold text-slate-900">
                  {formatDisplayArea(currentMinArea, false)}
                </div>
                <div className="text-[10px] font-medium text-slate-400">Min Area</div>
              </div>
              <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-2.5 text-left">
                <div className="text-xs font-extrabold text-slate-900">
                  {formatDisplayArea(currentMaxArea, true)}
                </div>
                <div className="text-[10px] font-medium text-slate-400">Max Area</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 7. LOCATION WITH POPULAR AREAS ── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 tracking-tight">Location</h4>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* City Row: [Pin] City Name ... Change */}
          <div className="flex items-center justify-between py-1 px-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <MapPin className="h-4 w-4 text-red-600 shrink-0 fill-red-50" />
              <span>{currentCityName}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowCityPicker(!showCityPicker)}
              className="text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
            >
              Change
            </button>
          </div>

          {/* Inline City Selector (when Change is clicked) */}
          {showCityPicker && (
            <div className="p-2 border border-slate-200 rounded-xl bg-slate-50 space-y-1 text-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Select Operational City</div>
              <div className="grid grid-cols-2 gap-1">
                {(cities.length > 0 ? cities : [{ id: 'Hyderabad', name: 'Hyderabad' }]).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onFilterChange({ city_id: c.name, locality_id: undefined });
                      setShowCityPicker(false);
                    }}
                    className={cn(
                      'px-2 py-1.5 rounded-lg font-semibold text-left transition',
                      currentCityName.toLowerCase() === c.name.toLowerCase()
                        ? 'bg-red-600 text-white font-bold'
                        : 'bg-white text-slate-700 hover:bg-slate-200'
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Localities Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search localities..."
              value={localitySearch}
              onChange={(e) => setLocalitySearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            {localitySearch && (
              <button
                type="button"
                onClick={() => setLocalitySearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Popular Area Chips */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {displayedLocalities.map((loc) => {
              const isSelected = (filters.locality_id || '').toLowerCase() === loc.toLowerCase();
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => handleLocalityToggle(loc)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer',
                    isSelected
                      ? 'bg-red-600 text-white border-red-600 shadow-2xs font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  {loc}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowMoreLocalities(!showMoreLocalities)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-600 border border-transparent hover:border-red-200 hover:bg-red-50/50 cursor-pointer transition"
            >
              {showMoreLocalities ? '- Less' : '+ More'}
            </button>
          </div>
        </div>

        {/* ── 8. PROJECT / BUILDER ── */}
        <div className="space-y-2.5" ref={projectDropdownRef}>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 tracking-tight">Project / Builder</h4>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              className="w-full flex items-center justify-between border border-slate-200 rounded-xl p-2.5 text-xs bg-white text-slate-700 hover:border-slate-300 text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <FolderGit2 className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate">
                  {filters.q && !filters.q.startsWith('type:') ? filters.q : 'Select Project or Builder'}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            </button>

            {showProjectDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl p-2.5 max-h-56 overflow-y-auto space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type builder or project..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="w-full text-xs p-2 pl-7 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500"
                    autoFocus
                  />
                  <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange({ q: undefined });
                      setShowProjectDropdown(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100"
                  >
                    Clear selection
                  </button>
                  {projectsList
                    .filter((p) => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                    .slice(0, 10)
                    .map((item) => (
                      <button
                        key={`${item.type}-${item.id}`}
                        type="button"
                        onClick={() => {
                          onFilterChange({ q: item.name });
                          setShowProjectDropdown(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 flex items-center justify-between"
                      >
                        <span className="truncate">{item.name}</span>
                        <span className="text-[9px] uppercase font-bold text-slate-400 ml-1 shrink-0">
                          {item.type}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 9. AMENITIES WITH CHECKBOXES ── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 tracking-tight">Amenities</h4>
            <button
              type="button"
              onClick={() => setShowAllAmenities(!showAllAmenities)}
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5 cursor-pointer"
            >
              <span>{showAllAmenities ? 'Show Less' : 'Show All'}</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showAllAmenities && 'rotate-180')} />
            </button>
          </div>

          <div className="space-y-2 pt-0.5">
            {displayedAmenities.map((amenity) => {
              const isChecked = (filters.amenities || []).some((a) => isSameAmenity(a, amenity));
              return (
                <label
                  key={amenity}
                  className="flex items-center gap-2.5 cursor-pointer group select-none"
                  onClick={() => handleAmenityToggle(amenity)}
                >
                  <div
                    className={cn(
                      'h-4 w-4 rounded border flex items-center justify-center transition-all shrink-0',
                      isChecked
                        ? 'bg-red-600 border-red-600'
                        : 'border-slate-300 bg-white group-hover:border-red-400'
                    )}
                  >
                    {isChecked && <Check className="h-3 w-3 text-white stroke-[3]" />}
                  </div>
                  <span className={cn('text-xs transition-colors', isChecked ? 'font-bold text-slate-900' : 'text-slate-600 group-hover:text-slate-900')}>
                    {amenity}
                  </span>
                </label>
              );
            })}

            {!showAllAmenities && (
              <button
                type="button"
                onClick={() => setShowAllAmenities(true)}
                className="text-xs font-bold text-red-600 hover:text-red-700 pt-1 block cursor-pointer"
              >
                + More Amenities
              </button>
            )}
          </div>
        </div>

        {/* ── 10. OTHER FILTERS (COLLAPSIBLE: BHK, POSSESSION, FURNISHING) ── */}
        <div className="space-y-2.5 pt-1 border-t border-slate-100">
          <div
            className="flex items-center justify-between cursor-pointer py-1"
            onClick={() => setIsOtherFiltersOpen(!isOtherFiltersOpen)}
          >
            <h4 className="text-xs font-bold text-slate-900 tracking-tight">Other Filters</h4>
            <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', isOtherFiltersOpen && 'rotate-180')} />
          </div>

          {isOtherFiltersOpen && (
            <div className="space-y-4 pt-1">
              {/* Bedrooms / BHK */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 block">Bedrooms / BHK</label>
                <div className="flex flex-wrap gap-1.5">
                  {BHK_OPTIONS.map((bhk) => (
                    <button
                      key={bhk}
                      type="button"
                      onClick={() => onFilterChange({ bedrooms: filters.bedrooms === bhk ? undefined : bhk })}
                      className={cn(
                        'h-8 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer',
                        filters.bedrooms === bhk
                          ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      {bhk} BHK
                    </button>
                  ))}
                </div>
              </div>

              {/* Possession Status */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 block">Possession Status</label>
                <div className="space-y-1.5">
                  {POSSESSION_STATUSES.map((status) => {
                    const isChecked = filters.possession_status === status;
                    return (
                      <label
                        key={status}
                        className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 group"
                        onClick={() =>
                          onFilterChange({
                            possession_status: isChecked ? undefined : status,
                          })
                        }
                      >
                        <div
                          className={cn(
                            'h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0',
                            isChecked ? 'bg-red-600 border-red-600' : 'border-slate-300 group-hover:border-red-400'
                          )}
                        >
                          {isChecked && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
                        </div>
                        <span>{status}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Furnishing */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 block">Furnishing</label>
                <div className="flex flex-wrap gap-1.5">
                  {FURNISHING_OPTIONS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => onFilterChange({ furnishing: filters.furnishing === f ? undefined : f })}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer',
                        filters.furnishing === f
                          ? 'bg-red-600 text-white border-red-600 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Facing */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 block">Facing</label>
                <div className="flex flex-wrap gap-1.5">
                  {FACING_OPTIONS.map((facing) => (
                    <button
                      key={facing}
                      type="button"
                      onClick={() => onFilterChange({ facing: filters.facing === facing ? undefined : facing })}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer',
                        filters.facing === facing
                          ? 'bg-red-600 text-white border-red-600 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      {facing}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 11. BOTTOM ACTION BUTTONS: Apply Filters & Reset Filters ── */}
      <div className="pt-3 border-t border-slate-100 space-y-2 shrink-0 bg-white">
        <button
          type="button"
          onClick={() => {
            if (onCloseMobile) onCloseMobile();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-red-600/25 transition flex items-center justify-center gap-2 cursor-pointer text-sm active:scale-[0.99]"
        >
          <span>Apply Filters {totalCount != null ? `(${totalCount})` : ''}</span>
        </button>

        <button
          type="button"
          onClick={handleResetAll}
          className="w-full border border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 bg-white hover:bg-slate-50 cursor-pointer text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
          <span>Reset Filters</span>
        </button>
      </div>
    </div>
  );
}

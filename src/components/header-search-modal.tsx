import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  MapPin,
  Building2,
  Clock,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { useLanguageContext } from '../lib/i18n/language-context';
import {
  fetchLiveSearchSuggestions,
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  type LiveSearchSuggestionsResult,
} from '../lib/search-service';
import { formatCompactPrice, generatePropertyUrl } from '../lib/utils';
import { DEFAULT_PROPERTY_IMAGE } from '../lib/property-images';
import { VoiceSearchButton } from './voice-search-button';

interface HeaderSearchModalProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
  cityId?: string;
}

const TRENDING_SEARCHES = [
  '3 BHK in Kokapet',
  'Luxury Villas in Jubilee Hills',
  'Apartments under 2 Crore',
  'Flats for Rent in Gachibowli',
  'Commercial Office in Hitech City',
  'Plots in Hyderabad',
];

const POPULAR_HOTSPOTS = [
  { name: 'Kokapet', type: 'High Growth Area' },
  { name: 'Jubilee Hills', type: 'Ultra Luxury' },
  { name: 'Gachibowli', type: 'IT Corridor' },
  { name: 'Hitech City', type: 'Commercial Hub' },
  { name: 'Madhapur', type: 'Central Hotspot' },
  { name: 'Tellapur', type: 'Gated Communities' },
  { name: 'Banjara Hills', type: 'Prime Residential' },
  { name: 'Financial District', type: 'Work & Living' },
];

export function HeaderSearchModal({
  open,
  onClose,
  initialQuery = '',
  cityId,
}: HeaderSearchModalProps) {
  const { t } = useLanguageContext();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<LiveSearchSuggestionsResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Load recent searches on open and listen to updates
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    const handleSync = () => setRecentSearches(getRecentSearches());
    window.addEventListener('realtynow-recent-searches-updated', handleSync);
    return () => window.removeEventListener('realtynow-recent-searches-updated', handleSync);
  }, []);

  // Listen for ESC key to close modal
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch live suggestions when debouncedQuery changes
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
      setSuggestions(null);
      setIsSearching(false);
      return;
    }

    let isMounted = true;
    setIsSearching(true);

    fetchLiveSearchSuggestions(debouncedQuery, cityId)
      .then((res) => {
        if (isMounted) {
          setSuggestions(res);
          setIsSearching(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsSearching(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, cityId]);

  const executeSearch = (targetQuery: string) => {
    const clean = (targetQuery || '').trim();
    if (!clean) return;

    addRecentSearch(clean);
    onClose();

    // If query matches a specific property in suggestions, navigate directly to its view
    const exactProp = suggestions?.properties.find(
      (p) => p.title && p.title.trim().toLowerCase() === clean.toLowerCase()
    );
    if (exactProp) {
      navigate(generatePropertyUrl(exactProp));
      setQuery('');
      return;
    }

    navigate(`/search?q=${encodeURIComponent(clean)}`);
    setQuery('');
  };

  const handleVoiceTranscript = (text: string) => {
    setQuery(text);
    executeSearch(text);
  };

  if (!open) return null;

  const hasSuggestions =
    suggestions &&
    (suggestions.properties.length > 0 ||
      suggestions.localities.length > 0 ||
      suggestions.smartQueries.length > 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal Dialog Container - relative z-10 to stay firmly above backdrop */}
        <div className="relative z-10 flex min-h-full items-start justify-center p-4 pt-16 sm:pt-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-2xl transform overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-2xl transition-all ring-1 ring-black/5"
            style={{ backgroundColor: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeSearch(query);
              }}
              className="relative z-10 flex items-center border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6"
              style={{ backgroundColor: '#ffffff' }}
            >
              <Search className="h-5 w-5 shrink-0 text-red-600" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('search.placeholder', 'City, locality, project or builder...')}
                className="w-full border-none bg-white pl-3 pr-20 text-sm sm:text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
              />

              <div className="flex items-center gap-1.5 shrink-0">
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-black transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                <VoiceSearchButton
                  onTranscript={handleVoiceTranscript}
                  className="h-8 w-8 text-slate-500 hover:text-red-600"
                />

                <button
                  type="submit"
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-red-700 transition-all active:scale-95 cursor-pointer"
                >
                  {t('common.search', 'Search')}
                </button>
              </div>
            </form>

            {/* Content Area - solid white background */}
            <div
              className="relative z-10 max-h-[65vh] overflow-y-auto bg-white p-4 sm:p-6 space-y-6"
              style={{ backgroundColor: '#ffffff' }}
            >
              {/* While Typing: Live Autocomplete Results */}
              {query.trim().length >= 2 ? (
                <div className="space-y-4">
                  {isSearching && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 animate-pulse py-1">
                      <Sparkles className="h-3.5 w-3.5 text-red-500" /> Finding live matching properties...
                    </div>
                  )}

                  {/* Smart Query Suggestions */}
                  {suggestions?.smartQueries && suggestions.smartQueries.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-red-600" /> Smart Suggestions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.smartQueries.map((sq, idx) => (
                          <button
                            key={idx}
                            onClick={() => executeSearch(sq.text)}
                            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 transition-all text-left"
                          >
                            <span>{sq.text}</span>
                            <ArrowRight className="h-3 w-3 text-red-500" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Localities */}
                  {suggestions?.localities && suggestions.localities.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-red-600" /> Localities & Neighborhoods
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {suggestions.localities.map((loc, idx) => (
                          <button
                            key={idx}
                            onClick={() => executeSearch(`${loc.name}, ${loc.city_name}`)}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 hover:border-red-300 hover:bg-red-50/40 transition-all text-left group shadow-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                                <MapPin className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-black truncate group-hover:text-red-600">
                                  {loc.name}
                                </p>
                                <p className="text-[10px] font-medium text-slate-500">{loc.city_name}</p>
                              </div>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-red-500" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Direct Property Results */}
                  {suggestions?.properties && suggestions.properties.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-red-600" /> Matching Properties ({suggestions.properties.length})
                        </p>
                        <button
                          onClick={() => executeSearch(query)}
                          className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                        >
                          View all results <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {suggestions.properties.map((p) => {
                          const priceVal = p.price || p.rent_amount || 0;
                          const formattedPrice = formatCompactPrice(priceVal);

                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                onClose();
                                navigate(generatePropertyUrl(p));
                              }}
                              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 hover:border-red-300 hover:shadow-sm transition-all cursor-pointer group"
                            >
                              <img
                                src={p.cover_image || DEFAULT_PROPERTY_IMAGE}
                                alt={p.title}
                                className="h-14 w-16 rounded-xl object-cover shrink-0 border border-slate-100"
                                onError={(e) => {
                                  (e.target as HTMLElement).setAttribute('src', DEFAULT_PROPERTY_IMAGE);
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <h6 className="text-xs font-bold text-black line-clamp-1 group-hover:text-red-600">
                                  {p.title}
                                </h6>
                                <p className="text-[11px] text-slate-600 truncate flex items-center gap-1 font-medium">
                                  <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                                  {p.locality_name ? `${p.locality_name}, ` : ''}{p.city_name || 'Hyderabad'}
                                </p>
                                <div className="mt-0.5 flex items-center gap-2">
                                  <span className="text-xs font-extrabold text-red-600">
                                    {formattedPrice} {p.purpose === 'Rent' ? '/mo' : ''}
                                  </span>
                                  {p.bedrooms && (
                                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                      {p.bedrooms} BHK
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!hasSuggestions && !isSearching && (
                    <div className="py-6 text-center">
                      <p className="text-xs font-semibold text-slate-600">
                        Press <span className="font-bold text-black">Enter</span> to search the full database for "{query}"
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* When Input is Empty: Recent Searches & Hotspots */
                <div className="space-y-6">
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-600" /> Recent Searches
                        </p>
                        <button
                          onClick={clearRecentSearches}
                          className="text-[11px] font-semibold text-slate-500 hover:text-red-600"
                        >
                          Clear All
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((item, idx) => (
                          <div
                            key={idx}
                            className="group flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-black hover:bg-slate-200 transition-colors"
                          >
                            <span
                              onClick={() => executeSearch(item)}
                              className="cursor-pointer hover:text-red-600 font-semibold"
                            >
                              {item}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRecentSearch(item);
                              }}
                              className="text-slate-400 hover:text-black rounded-full"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending Searches */}
                  <div className="space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-red-600" /> Trending Searches
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {TRENDING_SEARCHES.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => executeSearch(item)}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-black hover:border-red-300 hover:bg-white hover:text-red-600 hover:shadow-xs transition-all"
                        >
                          <Search className="h-3.5 w-3.5 text-slate-500" />
                          <span>{item}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Popular Localities & Hotspots */}
                  <div className="space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-red-600" /> Popular Hyderabad Hotspots
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {POPULAR_HOTSPOTS.map((spot, idx) => (
                        <button
                          key={idx}
                          onClick={() => executeSearch(spot.name)}
                          className="flex flex-col items-start rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-left hover:border-red-400 hover:bg-white hover:shadow-xs transition-all group"
                        >
                          <span className="text-xs font-bold text-black group-hover:text-red-600">
                            {spot.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">{spot.type}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="relative z-10 flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-600"
              style={{ backgroundColor: '#f8fafc' }}
            >
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Sparkles className="h-3.5 w-3.5 text-red-600" /> Real-time database discovery engine
              </span>
              <span>
                Press <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-800 border border-slate-200 shadow-2xs">ESC</kbd> to exit
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

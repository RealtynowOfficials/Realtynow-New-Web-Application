import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// No shared Google Maps JS SDK loader exists in this codebase yet (no Places
// Autocomplete usage either), so we call the Geocoding REST API directly via
// fetch rather than pulling in the full google.maps script just for a single
// reverse-geocode lookup. Requires VITE_GOOGLE_MAPS_API_KEY; falls back to the
// free Nominatim API below when that's unset or the request fails.
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

type Coordinates = { lat: number; lng: number };

type LocationState = {
  city: string | null;
  cityId: string | null;
  stateName: string | null;
  country: string | null;
  coordinates: Coordinates | null;
  isLocating: boolean;
  error: string | null;
  /** True when the browser explicitly denied the geolocation permission. */
  permissionDenied: boolean;
  /** Controls visibility of the helpful browser permission unblock guide modal. */
  showPermissionGuide: boolean;
};

type LocationContextType = LocationState & {
  setCity: (city: string) => void;
  /** Forces a fresh geolocation + reverse-geocode read, bypassing the 24h cache. */
  detectLocation: (showGuideOnDeny?: boolean) => Promise<boolean>;
  dismissLocationPrompt: () => void;
  openPermissionGuide: () => void;
  closePermissionGuide: () => void;
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const CACHE_KEY = 'realtynow_location_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_CITY = 'Hyderabad';

type CachedLocation = {
  city: string;
  cityId: string | null;
  stateName: string | null;
  country: string | null;
  coordinates: Coordinates | null;
  cachedAt: number;
};

function readCache(): CachedLocation | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLocation;
    if (!parsed?.city || typeof parsed.cachedAt !== 'number') return null;
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(entry: Omit<CachedLocation, 'cachedAt'>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...entry, cachedAt: Date.now() }));
  } catch {
    // Ignore storage errors (private browsing quota, etc.) — cache is a pure optimization.
  }
}

type GoogleAddressComponent = { long_name: string; short_name: string; types: string[] };

function extractComponent(components: GoogleAddressComponent[] | undefined, types: string[]): string {
  if (!components) return '';
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match) return match.long_name;
  }
  return '';
}

type GeocodedPlace = { city: string; stateName: string; country: string };

async function reverseGeocodeGoogle(lat: number, lng: number): Promise<GeocodedPlace> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps is not configured (VITE_GOOGLE_MAPS_API_KEY missing)');
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google reverse geocoding request failed (HTTP ${response.status})`);
  }
  const data = await response.json();
  if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
    throw new Error(`Google reverse geocoding failed (${data.status ?? 'no results'})`);
  }
  const components: GoogleAddressComponent[] = data.results[0]?.address_components ?? [];
  const city = extractComponent(components, ['locality', 'administrative_area_level_2']);
  if (!city) {
    throw new Error('Could not determine a city from the Google geocoding result');
  }
  return {
    city,
    stateName: extractComponent(components, ['administrative_area_level_1']),
    country: extractComponent(components, ['country']),
  };
}

// Fallback path — free, no API key required. Used when Google Maps isn't configured
// (VITE_GOOGLE_MAPS_API_KEY missing) or the Google call otherwise fails, so location
// detection degrades gracefully instead of hard-failing.
async function reverseGeocodeNominatim(lat: number, lng: number): Promise<GeocodedPlace> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
    {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        // User-Agent is required by Nominatim usage policy
        'User-Agent': 'RealtyNow/1.0 (contact@realtynow.in)',
      },
    },
  );
  const data = await response.json();
  const address = data?.address;
  const foundCity = address?.city || address?.town || address?.state_district || address?.county;
  if (!foundCity) {
    throw new Error('Could not determine city name from coordinates.');
  }
  return {
    city: String(foundCity).replace(/ (District|City|Mandal)$/i, ''),
    stateName: address?.state || '',
    country: address?.country || '',
  };
}

async function reverseGeocode(lat: number, lng: number): Promise<GeocodedPlace> {
  try {
    return await reverseGeocodeGoogle(lat, lng);
  } catch (err) {
    console.warn('Google reverse geocoding unavailable, falling back to Nominatim:', err);
    return reverseGeocodeNominatim(lat, lng);
  }
}

async function resolveCityId(cityName: string): Promise<string | null> {
  try {
    const { data } = await supabase.from('cities').select('id, name').ilike('name', cityName).maybeSingle();
    return data?.id ?? null;
  } catch (err) {
    console.warn('City lookup failed:', err);
    return null;
  }
}

function initialState(): LocationState {
  const cached = readCache();
  if (cached) {
    return {
      city: cached.city,
      cityId: cached.cityId,
      stateName: cached.stateName,
      country: cached.country,
      coordinates: cached.coordinates,
      isLocating: false,
      error: null,
      permissionDenied: false,
      showPermissionGuide: false,
    };
  }
  return {
    city: DEFAULT_CITY,
    cityId: null,
    stateName: 'Telangana',
    country: 'India',
    coordinates: null,
    isLocating: false,
    error: null,
    permissionDenied: false,
    showPermissionGuide: false,
  };
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LocationState>(initialState);

  const openPermissionGuide = useCallback(() => {
    setState((s) => ({ ...s, showPermissionGuide: true }));
  }, []);

  const closePermissionGuide = useCallback(() => {
    setState((s) => ({ ...s, showPermissionGuide: false }));
  }, []);

  const applyDetectedCity = useCallback(
    async (city: string, stateName: string, country: string, coordinates: Coordinates) => {
      const cityId = await resolveCityId(city);
      setState((s) => ({
        ...s,
        city,
        cityId,
        stateName: stateName || null,
        country: country || null,
        coordinates,
        isLocating: false,
        error: null,
        permissionDenied: false,
        showPermissionGuide: false,
      }));
      writeCache({ city, cityId, stateName: stateName || null, country: country || null, coordinates });
    },
    [],
  );

  // Denied-permission / error fallback chain: previously cached city -> currently
  // selected city -> hardcoded Hyderabad default. Never leaves the UI without a city.
  const fallbackToSavedOrDefault = useCallback(
    (errorMessage: string, permissionDenied: boolean) => {
      const cached = readCache();
      setState((s) => {
        const fallbackCity = cached?.city ?? s.city ?? DEFAULT_CITY;
        const reuseCurrent = !cached && fallbackCity === s.city;
        return {
          ...s,
          city: fallbackCity,
          cityId: cached?.cityId ?? (reuseCurrent ? s.cityId : null),
          stateName: cached?.stateName ?? (reuseCurrent ? s.stateName : null),
          country: cached?.country ?? (reuseCurrent ? s.country : 'India'),
          coordinates: cached?.coordinates ?? (reuseCurrent ? s.coordinates : null),
          isLocating: false,
          error: errorMessage,
          permissionDenied,
        };
      });

      // Best-effort: resolve a cityId for the fallback city if we don't already have one.
      if (!cached) {
        const fallbackCity = state.city ?? DEFAULT_CITY;
        if (!state.cityId) {
          resolveCityId(fallbackCity).then((cityId) => {
            if (cityId) setState((s) => (s.city === fallbackCity ? { ...s, cityId } : s));
          });
        }
      }
    },
    [state.city, state.cityId],
  );

  const detectLocation = useCallback(
    async (showGuideOnDeny = false): Promise<boolean> => {
      setState((s) => ({ ...s, isLocating: true, error: null }));

      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        fallbackToSavedOrDefault('Geolocation is not supported by your browser.', false);
        return false;
      }

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0,
          });
        });

        const { latitude, longitude } = position.coords;
        const coordinates: Coordinates = { lat: latitude, lng: longitude };

        try {
          const geo = await reverseGeocode(latitude, longitude);
          await applyDetectedCity(geo.city, geo.stateName, geo.country, coordinates);
          return true;
        } catch (geoErr) {
          console.warn('Reverse geocoding failed:', geoErr);
          setState((s) => ({ ...s, coordinates, isLocating: false }));
          fallbackToSavedOrDefault('Could not determine city name from coordinates.', false);
          return false;
        }
      } catch (err: any) {
        console.warn('Geolocation error:', err);
        const permissionDenied = err?.code === 1;
        fallbackToSavedOrDefault(
          permissionDenied ? 'Location permission denied in browser.' : 'Failed to fetch location.',
          permissionDenied,
        );
        if (permissionDenied && showGuideOnDeny) {
          setState((s) => ({ ...s, showPermissionGuide: true }));
        }
        return false;
      }
    },
    [applyDetectedCity, fallbackToSavedOrDefault],
  );

  const setCity = useCallback((city: string) => {
    setState((s) => ({ ...s, city, cityId: null, error: null, permissionDenied: false, showPermissionGuide: false }));
    resolveCityId(city).then((cityId) => {
      setState((s) => (s.city === city ? { ...s, cityId } : s));
      writeCache({ city, cityId, stateName: null, country: null, coordinates: null });
    });
  }, []);

  const dismissLocationPrompt = useCallback(() => {
    setState((s) => ({ ...s, permissionDenied: false, error: null }));
  }, []);

  // Auto-detect once on first page load if there's no valid (non-expired) cached city yet.
  useEffect(() => {
    if (readCache()) return;
    const timer = setTimeout(() => {
      detectLocation(false);
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LocationContext.Provider
      value={{
        ...state,
        setCity,
        detectLocation,
        dismissLocationPrompt,
        openPermissionGuide,
        closePermissionGuide,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
}

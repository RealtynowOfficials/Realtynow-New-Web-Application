import { useEffect, useRef, useState } from 'react';
import { MapPin, Search, AlertCircle, Loader2 } from 'lucide-react';
import { loadGoogleMaps } from '../lib/googleMaps';

export interface SelectedPlace {
  address: string;
  city: string;
  locality: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  placeId: string;
}

function extractComponent(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  types: string[],
): string {
  if (!components) return '';
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match) return match.long_name;
  }
  return '';
}

function componentsToSelectedPlace(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  formattedAddress: string,
  fallbackName: string | undefined,
  location: google.maps.LatLng,
  placeId: string,
): SelectedPlace {
  return {
    address: formattedAddress || fallbackName || '',
    city: extractComponent(components, ['locality', 'administrative_area_level_2']),
    locality: extractComponent(components, ['sublocality_level_1', 'sublocality', 'neighborhood']),
    state: extractComponent(components, ['administrative_area_level_1']),
    country: extractComponent(components, ['country']),
    postalCode: extractComponent(components, ['postal_code']),
    latitude: location.lat(),
    longitude: location.lng(),
    placeId,
  };
}

function placeToSelectedPlace(place: google.maps.places.PlaceResult): SelectedPlace | null {
  const location = place.geometry?.location;
  if (!location || !place.place_id) return null;
  return componentsToSelectedPlace(place.address_components, place.formatted_address || '', place.name, location, place.place_id);
}

/**
 * Google Places Autocomplete search box + embedded, drag-to-reposition map
 * marker for the property wizard's Location step. Renders above "Full
 * Address" — selecting a place (via search or by dragging the marker) hands
 * the caller back address/city/locality/state/country/postalCode/lat/lng/
 * placeId in one atomic update, so lat/lng can never drift out of sync with
 * the displayed address (src/pages/portal/list-property.tsx).
 */
export function LocationAutocomplete({
  onSelect,
  initialAddress,
  initialLat,
  initialLng,
}: {
  onSelect: (place: SelectedPlace) => void;
  initialAddress?: string;
  initialLat?: number;
  initialLng?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null,
  );

  // Reverse-geocodes a dragged marker position back into a full SelectedPlace
  // (address/city/state/country/postalCode) so every field — not just
  // lat/lng — stays in sync with wherever the pin ends up.
  const reverseGeocode = (position: google.maps.LatLng) => {
    if (!geocoderRef.current) return;
    setGeocoding(true);
    setGeocodeError(null);
    geocoderRef.current.geocode({ location: position }, (results, status) => {
      setGeocoding(false);
      if (status !== 'OK' || !results || !results[0]) {
        setGeocodeError('Could not determine an address for this map position. Try dropping the pin elsewhere.');
        return;
      }
      const top = results[0];
      const selected = componentsToSelectedPlace(
        top.address_components,
        top.formatted_address,
        undefined,
        position,
        top.place_id,
      );
      setPreview({ lat: selected.latitude, lng: selected.longitude });
      onSelect(selected);
    });
  };

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !inputRef.current) return;
        setReady(true);
        geocoderRef.current = new google.maps.Geocoder();

        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id'],
          componentRestrictions: { country: 'in' },
          types: ['geocode', 'establishment'],
        });

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current!.getPlace();
          const selected = placeToSelectedPlace(place);
          if (!selected) return;
          setGeocodeError(null);
          setPreview({ lat: selected.latitude, lng: selected.longitude });
          onSelect(selected);
        });
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load Google Maps');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render/update the embedded map + draggable marker whenever the selected point changes.
  useEffect(() => {
    if (!ready || !preview || !mapDivRef.current) return;
    const position = { lat: preview.lat, lng: preview.lng };
    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(mapDivRef.current, {
        center: position,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
      });
    } else {
      mapRef.current.setCenter(position);
    }
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        position,
        map: mapRef.current,
        draggable: true,
      });
      markerRef.current.addListener('dragend', () => {
        const pos = markerRef.current?.getPosition();
        if (pos) reverseGeocode(pos);
      });
    } else {
      markerRef.current.setPosition(position);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, preview]);

  return (
    <div>
      <label className="block text-xs font-semibold text-navy-500 uppercase tracking-widest mb-1.5">
        Search Location
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
        <input
          ref={inputRef}
          type="text"
          defaultValue={initialAddress}
          disabled={!ready && !loadError}
          placeholder={ready ? 'Search for the property address on Google Maps…' : 'Loading Google Maps…'}
          className="w-full bg-white border border-navy-150 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-navy-900 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all placeholder:text-navy-300 shadow-sm disabled:bg-navy-50 disabled:text-navy-400"
        />
      </div>

      {loadError && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {loadError}
        </p>
      )}
      {geocodeError && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {geocodeError}
        </p>
      )}

      {preview && (
        <div className="mt-3 rounded-2xl overflow-hidden border border-navy-100 shadow-sm">
          <div className="relative">
            <div ref={mapDivRef} className="h-48 w-full bg-navy-50" />
            {geocoding && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 shadow">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating address…
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 bg-navy-50 px-3 py-2 text-[11px] font-medium text-navy-500">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
              {preview.lat.toFixed(6)}, {preview.lng.toFixed(6)}
            </span>
            <span className="text-navy-400">Drag the pin to fine-tune</span>
          </div>
        </div>
      )}
    </div>
  );
}

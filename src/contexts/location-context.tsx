import React, { createContext, useContext, useState, useEffect } from 'react';

type LocationState = {
  city: string | null;
  coordinates: { lat: number; lng: number } | null;
  isLocating: boolean;
  error: string | null;
};

type LocationContextType = LocationState & {
  setCity: (city: string) => void;
  detectLocation: () => Promise<void>;
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LocationState>(() => {
    const savedCity = localStorage.getItem('user_city');
    return {
      city: savedCity || null,
      coordinates: null,
      isLocating: false,
      error: null,
    };
  });

  const detectLocation = async () => {
    setState((s) => ({ ...s, isLocating: true, error: null }));
    
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, isLocating: false, error: 'Geolocation is not supported by your browser.' }));
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;
      setState((s) => ({ ...s, coordinates: { lat: latitude, lng: longitude } }));

      // Reverse geocode using OpenStreetMap Nominatim API (Free, no key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
            // User-Agent is required by Nominatim usage policy
            'User-Agent': 'RealtyNow/1.0 (contact@realtynow.in)'
          }
        }
      );
      const data = await response.json();

      if (data && data.address) {
        // Nominatim returns city in various fields depending on the region
        const foundCity = data.address.city || data.address.town || data.address.state_district || data.address.county;
        
        if (foundCity) {
          // Clean up the city name (e.g., "Hyderabad District" -> "Hyderabad")
          const cleanCity = foundCity.replace(/ (District|City|Mandal)$/i, '');
          setState((s) => ({ ...s, city: cleanCity, isLocating: false }));
          localStorage.setItem('user_city', cleanCity);
          return;
        }
      }
      
      // Fallback if geocoding fails to find a city name
      setState((s) => ({ ...s, isLocating: false, error: 'Could not determine city name from coordinates.' }));
    } catch (err: any) {
      console.warn('Geolocation error:', err);
      setState((s) => ({ 
        ...s, 
        isLocating: false, 
        error: err.code === 1 ? 'Location permission denied.' : 'Failed to fetch location.'
      }));
    }
  };

  const setCity = (city: string) => {
    setState((s) => ({ ...s, city, error: null }));
    localStorage.setItem('user_city', city);
  };

  // Auto-detect on mount if no city is saved
  useEffect(() => {
    if (!state.city && !state.error && !state.isLocating) {
      // Small delay to allow initial render
      const timer = setTimeout(() => {
        detectLocation();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.city, state.error, state.isLocating]);

  return (
    <LocationContext.Provider value={{ ...state, setCity, detectLocation }}>
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

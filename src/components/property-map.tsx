import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { formatPrice , generatePropertyUrl} from '../lib/utils';
import { MapPin } from 'lucide-react';

// Fix for default marker icon in leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom pin icon for luxury/featured (optional)
const CustomIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface PropertyMapProps {
  properties: any[];
}

// Component to dynamically fit bounds to markers
function MapBoundsUpdater({ properties }: { properties: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (properties && properties.length > 0) {
      const validProps = properties.filter(p => p.latitude && p.longitude);
      if (validProps.length > 0) {
        const bounds = L.latLngBounds(validProps.map(p => [Number(p.latitude), Number(p.longitude)]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [map, properties]);

  return null;
}

export function PropertyMap({ properties }: PropertyMapProps) {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // Fetch map config from our Edge Function
    const fetchConfig = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const edgeUrl = supabaseUrl === 'http://localhost:54321' 
          ? 'http://127.0.0.1:54321/functions/v1/get-map-config'
          : `${supabaseUrl}/functions/v1/get-map-config`;
          
        const res = await fetch(edgeUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || supabaseKey}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        } else {
          // Fallback if edge function fails
          setConfig({
            provider: 'openstreetmap',
            default_lat: 28.6139,
            default_lng: 77.2090
          });
        }
      } catch (err) {
        console.error('Failed to fetch map config:', err);
        setConfig({
          provider: 'openstreetmap',
          default_lat: 28.6139,
          default_lng: 77.2090
        });
      }
    };
    
    fetchConfig();
  }, []);

  if (!config) {
    return (
      <div className="h-[500px] w-full rounded-2xl bg-slate-100 flex items-center justify-center animate-pulse">
        <div className="flex flex-col items-center text-slate-400">
          <MapPin className="h-8 w-8 mb-2 animate-bounce" />
          <span className="font-semibold text-sm">Loading map...</span>
        </div>
      </div>
    );
  }

  const defaultCenter: [number, number] = [Number(config.default_lat), Number(config.default_lng)];
  const tileUrl = config.provider === 'mapbox' && config.api_key
    ? `https://api.mapbox.com/styles/v1/mapbox/${config.map_style || 'streets-v11'}/tiles/256/{z}/{x}/{y}@2x?access_token=${config.api_key}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    
  const attribution = config.provider === 'mapbox'
    ? 'Map data &copy; <a href="https://www.mapbox.com/">Mapbox</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={12} 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution={attribution}
          url={tileUrl}
        />
        <MapBoundsUpdater properties={properties} />
        
        {properties?.map((p) => {
          if (!p.latitude || !p.longitude) return null;
          
          return (
            <Marker 
              key={p.id} 
              position={[Number(p.latitude), Number(p.longitude)]}
              icon={p.is_luxury || p.is_featured ? CustomIcon : new L.Icon.Default()}
            >
              <Popup className="property-popup rounded-xl overflow-hidden shadow-lg p-0 border-0">
                <div className="w-[200px] flex flex-col bg-white">
                  <div className="h-[100px] bg-slate-200 relative overflow-hidden">
                    <img 
                      src={p.images?.[0] || 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg'} 
                      className="w-full h-full object-cover" 
                      alt={p.title} 
                    />
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                      {formatPrice(p.price)}
                    </div>
                  </div>
                  <div className="p-2 space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{p.title}</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{[p.locality_name, p.city_name].filter(Boolean).join(', ')}</p>
                    <Link 
                      to={generatePropertyUrl(p)} 
                      className="mt-2 block w-full text-center bg-red-50 text-red-600 hover:bg-red-100 py-1 rounded text-[10px] font-bold transition"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Small custom CSS to fix leaflet popup padding overrides */}
      <style>{`
        .leaflet-popup-content-wrapper { padding: 0; overflow: hidden; border-radius: 0.5rem; }
        .leaflet-popup-content { margin: 0; width: 200px !important; }
        .leaflet-container { font-family: inherit; }
      `}</style>
    </div>
  );
}

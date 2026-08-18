/**
 * Real-world geographic coordinates directory and resolver for Indian cities and localities.
 * Provides genuine latitude/longitude values for Hyderabad and other Indian metros.
 */

// City reference centers [latitude, longitude]
export const CITY_COORDINATES: Record<string, [number, number]> = {
  hyderabad: [17.3850, 78.4867],
  bangalore: [12.9716, 77.5946],
  bengaluru: [12.9716, 77.5946],
  mumbai: [19.0760, 72.8777],
  delhi: [28.6139, 77.2090],
  'new delhi': [28.6139, 77.2090],
  gurugram: [28.4595, 77.0266],
  gurgaon: [28.4595, 77.0266],
  noida: [28.5355, 77.3910],
  pune: [18.5204, 73.8567],
  chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
  goa: [15.2993, 74.1240],
  kochi: [9.9312, 76.2673],
  ahmedabad: [23.0225, 72.5714],
};

// Hyderabad Locality accurate coordinates [latitude, longitude]
export const LOCALITY_COORDINATES: Record<string, [number, number]> = {
  // Prime IT & West Hyderabad
  'jubilee hills': [17.4319, 78.4073],
  'banjara hills': [17.4156, 78.4350],
  'gachibowli': [17.4401, 78.3489],
  'hitech city': [17.4435, 78.3772],
  'hitec city': [17.4435, 78.3772],
  'madhapur': [17.4483, 78.3915],
  'kondapur': [17.4699, 78.3578],
  'kokapet': [17.3976, 78.3328],
  'financial district': [17.4168, 78.3456],
  'nanakramguda': [17.4184, 78.3496],
  'puppalguda': [17.4048, 78.3694],
  'manikonda': [17.3984, 78.3846],
  'nallagandla': [17.4727, 78.3094],
  'tellapur': [17.4582, 78.2869],
  'gandipet': [17.3914, 78.3242],
  'shankarpalli': [17.4475, 78.1345],

  // North & North-West Hyderabad
  'kukatpally': [17.4849, 78.4138],
  'kphb': [17.4933, 78.3999],
  'kphb colony': [17.4933, 78.3999],
  'miyapur': [17.4969, 78.3547],
  'bachupally': [17.5342, 78.3664],
  'nizampet': [17.5186, 78.3842],
  'pragathi nagar': [17.5165, 78.3942],
  'patancheru': [17.5284, 78.2642],
  'chandanagar': [17.4925, 78.3274],
  'ameerpet': [17.4375, 78.4482],
  'begumpet': [17.4447, 78.4664],
  'somajiguda': [17.4267, 78.4589],
  'panjagutta': [17.4259, 78.4516],
  'punjagutta': [17.4259, 78.4516],
  'sanath nagar': [17.4568, 78.4442],
  'kompally': [17.5385, 78.4862],
  'medchal': [17.6297, 78.4814],
  'shamirpet': [17.6044, 78.5686],
  'bowenpally': [17.4746, 78.4789],
  'alwal': [17.5023, 78.5085],
  'sainikpuri': [17.4912, 78.5482],

  // Central & Old City Hyderabad
  'secunderabad': [17.4399, 78.4983],
  'himayatnagar': [17.3995, 78.4878],
  'himayat nagar': [17.3995, 78.4878],
  'abids': [17.3892, 78.4739],
  'koti': [17.3841, 78.4856],
  'basheerbagh': [17.3984, 78.4764],
  'charminar': [17.3616, 78.4747],
  'begum bazaar': [17.3768, 78.4721],
  'mehdipatnam': [17.3916, 78.4404],
  'tolichowki': [17.4042, 78.4138],
  'attapur': [17.3688, 78.4239],
  'rajendranagar': [17.3197, 78.4069],
  'shamshabad': [17.2403, 78.4294],
  'shadnagar': [17.0722, 78.2089],
  'maheshwaram': [17.1342, 78.4312],
  'adibatla': [17.2345, 78.5412],

  // East Hyderabad
  'uppal': [17.4018, 78.5602],
  'habsiguda': [17.4116, 78.5393],
  'nacharam': [17.4308, 78.5582],
  'mallapur': [17.4478, 78.5721],
  'tarnaka': [17.4284, 78.5312],
  'lb nagar': [17.3457, 78.5522],
  'l.b. nagar': [17.3457, 78.5522],
  'dilsukhnagar': [17.3688, 78.5247],
  'nagole': [17.3789, 78.5634],
  'vanasthalipuram': [17.3325, 78.5714],
  'hayathnagar': [17.3248, 78.6042],
  'ghatkesar': [17.4482, 78.6834],
  'pocharam': [17.4642, 78.6654],
  'boduppal': [17.4156, 78.5842],
  'peerzadiguda': [17.4068, 78.5742],

  // Other Major Cities Localities
  'worli': [18.9986, 72.8174],
  'bandra': [19.0596, 72.8295],
  'andheri': [19.1136, 72.8697],
  'koramangala': [12.9352, 77.6245],
  'indiranagar': [12.9784, 77.6408],
  'whitefield': [12.9698, 77.7500],
  'baner': [18.5590, 73.7868],
  'cyber city': [28.4950, 77.0895],
};

/**
 * Computes a deterministic pseudo-random offset based on a string ID.
 * Prevents multiple properties in the same neighborhood from stacking at the exact same pixel.
 */
function getDeterministicOffset(id: string | number, index = 0): [number, number] {
  const str = String(id || index || '0');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  
  const angle = ((Math.abs(hash) % 360) * Math.PI) / 180;
  // Radius roughly 60m to 280m in degrees (1 deg lat ~= 111km -> 0.001 deg ~= 111m)
  const radius = 0.0006 + ((Math.abs(hash >> 3) % 15) * 0.00014);
  
  const dLat = Math.sin(angle) * radius;
  const dLng = Math.cos(angle) * radius;
  return [dLat, dLng];
}

export interface ResolvedCoordinates {
  lat: number;
  lng: number;
  isEstimated: boolean;
  locality?: string;
  city?: string;
}

/**
 * Resolves accurate coordinates for a property using:
 * 1. Explicit property.latitude & property.longitude
 * 2. property.features.latitude & property.features.longitude
 * 3. Locality name lookup from property.locality_name or address
 * 4. City name lookup with deterministic neighborhood scatter
 */
export function resolvePropertyCoordinates(
  property: {
    id?: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
    locality_name?: string | null;
    city_name?: string | null;
    address?: string | null;
    title?: string | null;
    features?: Record<string, unknown> | null;
  },
  index = 0
): ResolvedCoordinates | null {
  if (!property) return null;

  // 1. Direct coordinates on property row
  const rawLat = property.latitude ?? (property.features?.latitude as any);
  const rawLng = property.longitude ?? (property.features?.longitude as any);

  const numLat = Number(rawLat);
  const numLng = Number(rawLng);

  // Check if valid non-zero finite numbers
  if (
    Number.isFinite(numLat) &&
    Number.isFinite(numLng) &&
    numLat !== 0 &&
    numLng !== 0 &&
    numLat >= -90 &&
    numLat <= 90 &&
    numLng >= -180 &&
    numLng <= 180
  ) {
    return {
      lat: numLat,
      lng: numLng,
      isEstimated: false,
      locality: property.locality_name ?? undefined,
      city: property.city_name ?? undefined,
    };
  }

  // 2. Locality or Address Matching
  const searchTexts = [
    property.locality_name,
    property.address,
    property.title,
    (property.features?.locality_name as string) ?? '',
    (property.features?.address as string) ?? '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const [localityKey, [baseLat, baseLng]] of Object.entries(LOCALITY_COORDINATES)) {
    if (searchTexts.includes(localityKey)) {
      const [dLat, dLng] = getDeterministicOffset(property.id || localityKey, index);
      return {
        lat: Number((baseLat + dLat).toFixed(6)),
        lng: Number((baseLng + dLng).toFixed(6)),
        isEstimated: true,
        locality: localityKey,
        city: property.city_name ?? 'Hyderabad',
      };
    }
  }

  // 3. City Center Fallback with scatter
  const cityName = (property.city_name || 'hyderabad').toLowerCase().trim();
  const cityCoords = CITY_COORDINATES[cityName] || CITY_COORDINATES.hyderabad;

  const [dLat, dLng] = getDeterministicOffset(property.id || cityName, index);
  return {
    lat: Number((cityCoords[0] + dLat * 2.5).toFixed(6)),
    lng: Number((cityCoords[1] + dLng * 2.5).toFixed(6)),
    isEstimated: true,
    city: property.city_name ?? 'Hyderabad',
  };
}

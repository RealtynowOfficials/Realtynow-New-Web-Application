/**
 * RealtyNow Master Amenities Registry & Smart Matching Engine
 *
 * Provides bidirectional normalization between database values (IDs, labels,
 * custom strings) and user-facing UI labels & filters.
 */

export interface AmenityDefinition {
  id: string;
  label: string;
  icon?: string;
  category?: 'general' | 'luxury' | 'commercial' | 'plot' | 'sports';
  aliases: string[];
}

export const AMENITY_REGISTRY: AmenityDefinition[] = [
  {
    id: 'pool',
    label: 'Swimming Pool',
    icon: '🏊',
    aliases: ['pool', 'swimming pool', 'swimming_pool', 'swimming', 'private pool', 'olympic pool', 'swim', 'infinity pool', 'kids pool'],
  },
  {
    id: 'gym',
    label: 'Gym',
    icon: '💪',
    aliases: ['gym', 'gymnasium', 'fitness', 'fitness center', 'health club', 'workout area', 'crossfit'],
  },
  {
    id: 'parking',
    label: 'Parking',
    icon: '🚗',
    aliases: ['parking', 'car parking', 'reserved parking', 'visitor parking', 'covered parking', 'indoor parking', 'stilt parking'],
  },
  {
    id: 'security',
    label: '24/7 Security',
    icon: '🛡️',
    aliases: ['security', '24/7 security', 'gated security', 'cctv security', 'guard', 'security guard', '24x7 security', 'gated'],
  },
  {
    id: 'lift',
    label: 'Lift',
    icon: '🛗',
    aliases: ['lift', 'elevator', 'lift / elevator', 'high speed lift', 'service lift', 'lifts', 'elevators'],
  },
  {
    id: 'power_backup',
    label: 'Power Backup',
    icon: '⚡',
    aliases: ['power_backup', 'power backup', '24/7 power', 'generator', 'full power backup', '100% power backup', 'power back up'],
  },
  {
    id: 'garden',
    label: 'Garden',
    icon: '🌿',
    aliases: ['garden', 'landscaped gardens', 'lawn', 'park', 'green area', 'landscaped garden', 'terrace garden', 'gardens', 'parks'],
  },
  {
    id: 'clubhouse',
    label: 'Club House',
    icon: '🏛️',
    aliases: ['clubhouse', 'club house', 'community hall', 'club', 'community center', 'club_house'],
  },
  {
    id: 'cctv',
    label: 'CCTV Security',
    icon: '📷',
    aliases: ['cctv', 'cctv camera', 'cctv surveillance', 'camera', 'cctv security'],
  },
  {
    id: 'gas',
    label: 'Piped Gas',
    icon: '🔥',
    aliases: ['gas', 'piped gas', 'gas pipeline', 'piped_gas'],
  },
  {
    id: 'intercom',
    label: 'Intercom',
    icon: '📞',
    aliases: ['intercom', 'intercom facility'],
  },
  {
    id: 'play_area',
    label: 'Children Play Area',
    icon: '🛝',
    aliases: ['play_area', 'children park', 'play area', 'children play area', 'kids play area', 'kids park', 'childrens play area'],
  },
  {
    id: 'rainwater',
    label: 'Rainwater Harvesting',
    icon: '🌧️',
    aliases: ['rainwater', 'rainwater harvesting', 'water harvesting', 'rain water harvesting', 'rain_water'],
  },
  {
    id: 'ev_charging',
    label: 'EV Charging',
    icon: '🔋',
    aliases: ['ev_charging', 'ev charging', 'electric vehicle charging', 'ev charger', 'ev_charge'],
  },
  {
    id: 'servant',
    label: 'Servant Room',
    icon: '🛏️',
    aliases: ['servant', 'servant room', 'maids room', 'staff room', 'servant_room', 'maid room'],
  },
  {
    id: 'wifi',
    label: 'High Speed WiFi',
    icon: '📶',
    aliases: ['wifi', 'wi-fi', 'high speed internet', 'internet', 'broadband', 'wi fi'],
  },
  {
    id: 'gated_community',
    label: 'Gated Community',
    icon: '🏘️',
    aliases: ['gated community', 'gated_community', 'gated society', 'gated layout'],
  },
  {
    id: 'central_ac',
    label: 'Central AC',
    icon: '❄️',
    aliases: ['central ac', 'central_ac', 'air conditioning', 'ac', 'central air conditioning'],
  },
  {
    id: 'conference_room',
    label: 'Conference Room',
    icon: '💼',
    aliases: ['conference room', 'conference_room', 'meeting room', 'boardroom'],
  },
  {
    id: 'fire_safety',
    label: 'Fire Safety',
    icon: '🧯',
    aliases: ['fire safety', 'fire_safety', 'fire fighting system', 'fire alarms'],
  },
  {
    id: 'loading_dock',
    label: 'Loading Dock',
    icon: '🚛',
    aliases: ['loading dock', 'loading_dock', 'truck access', 'goods lift'],
  },
  {
    id: 'water_supply',
    label: '24/7 Water Supply',
    icon: '🚰',
    aliases: ['water_storage', 'water storage', '24/7 water supply', 'water supply', 'borewell', 'water connection'],
  },
];

/**
 * Normalizes any amenity text or token to standard lowercase form.
 */
function cleanAmenityToken(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Formats any raw amenity string (ID like 'pool' or raw text) into its clean human-readable label.
 */
export function formatAmenityLabel(raw: string): string {
  if (!raw) return '';
  if (typeof raw !== 'string') {
    if (typeof raw === 'object' && raw !== null) {
      return (raw as any).name || (raw as any).label || (raw as any).title || '';
    }
    return String(raw);
  }
  const token = cleanAmenityToken(raw);
  
  const found = AMENITY_REGISTRY.find(
    (def) => def.id === raw || def.id === token || def.aliases.some((al) => cleanAmenityToken(al) === token)
  );

  if (found) return found.label;

  // Fallback: title-case the string nicely
  return raw
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Resolves an amenity token or raw string to a display-ready object with normalized label and emoji/icon.
 */
export function getAmenityDisplayItem(raw: any): { id: string; label: string; icon: string } {
  if (!raw) return { id: '', label: '', icon: '✨' };
  const rawStr = typeof raw === 'string' ? raw : (raw?.name || raw?.label || raw?.title || String(raw));
  if (!rawStr) return { id: '', label: '', icon: '✨' };

  const token = cleanAmenityToken(rawStr);
  
  const found = AMENITY_REGISTRY.find(
    (def) => def.id === rawStr || def.id === token || def.aliases.some((al) => cleanAmenityToken(al) === token)
  );

  if (found) {
    return {
      id: found.id,
      label: String(found.label),
      icon: found.icon || '✨',
    };
  }

  // Common keyword-based icon resolution for custom/extended amenities
  let icon = '✨';
  const l = token.toLowerCase();
  if (l.includes('road') || l.includes('street') || l.includes('light')) icon = '💡';
  else if (l.includes('water') || l.includes('drainage') || l.includes('borewell')) icon = '🚰';
  else if (l.includes('tree') || l.includes('plantation') || l.includes('green') || l.includes('park') || l.includes('garden')) icon = '🌿';
  else if (l.includes('wall') || l.includes('compound') || l.includes('arch') || l.includes('gate') || l.includes('entrance')) icon = '🚪';
  else if (l.includes('solar')) icon = '☀️';
  else if (l.includes('security') || l.includes('guard')) icon = '🛡️';
  else if (l.includes('camera') || l.includes('cctv')) icon = '📷';
  else if (l.includes('play') || l.includes('kid') || l.includes('child')) icon = '🛝';
  else if (l.includes('gym') || l.includes('fitness')) icon = '💪';
  else if (l.includes('pool') || l.includes('swim')) icon = '🏊';
  else if (l.includes('club')) icon = '🏛️';
  else if (l.includes('wifi') || l.includes('internet')) icon = '📶';
  else if (l.includes('car') || l.includes('parking')) icon = '🚗';
  else if (l.includes('power') || l.includes('backup') || l.includes('generator')) icon = '⚡';
  else if (l.includes('lift') || l.includes('elevator')) icon = '🛗';

  const labelResult = formatAmenityLabel(rawStr);
  const label = Array.isArray(labelResult) ? (labelResult as string[]).join(' ') : String(labelResult || '');

  return {
    id: rawStr,
    label,
    icon,
  };
}

/**
 * Checks whether two amenity strings refer to the same amenity.
 */
export function isSameAmenity(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a.toLowerCase().trim() === b.toLowerCase().trim()) return true;

  const tokenA = cleanAmenityToken(a);
  const tokenB = cleanAmenityToken(b);
  if (tokenA === tokenB) return true;

  const defA = AMENITY_REGISTRY.find(
    (def) => def.id === a || def.id === tokenA || def.aliases.some((al) => cleanAmenityToken(al) === tokenA)
  );
  const defB = AMENITY_REGISTRY.find(
    (def) => def.id === b || def.id === tokenB || def.aliases.some((al) => cleanAmenityToken(al) === tokenB)
  );

  if (defA && defB) {
    return defA.id === defB.id;
  }

  return tokenA.includes(tokenB) || tokenB.includes(tokenA);
}

/**
 * Returns all potential DB aliases/representations for a given filter amenity.
 */
export function getAmenityAliases(amenity: string): string[] {
  if (!amenity) return [];
  const token = cleanAmenityToken(amenity);

  const found = AMENITY_REGISTRY.find(
    (def) => def.id === amenity || def.id === token || def.aliases.some((al) => cleanAmenityToken(al) === token)
  );

  if (found) {
    return Array.from(new Set([found.id, found.label, ...found.aliases, amenity]));
  }

  return [amenity, token];
}

/**
 * Checks if a property's amenities array contains a specific target amenity.
 */
export function matchesAmenity(
  propertyAmenities: string[] | null | undefined,
  targetAmenity: string
): boolean {
  if (!propertyAmenities || !Array.isArray(propertyAmenities) || propertyAmenities.length === 0) {
    return false;
  }
  if (!targetAmenity) return true;

  return propertyAmenities.some((propAmenity) => isSameAmenity(propAmenity, targetAmenity));
}

/**
 * Checks if a property's amenities array satisfies ALL required filter amenities.
 */
export function matchesAllAmenities(
  propertyAmenities: string[] | null | undefined,
  requiredAmenities: string[] | null | undefined
): boolean {
  if (!requiredAmenities || !Array.isArray(requiredAmenities) || requiredAmenities.length === 0) {
    return true;
  }
  if (!propertyAmenities || !Array.isArray(propertyAmenities) || propertyAmenities.length === 0) {
    return false;
  }

  return requiredAmenities.every((req) => matchesAmenity(propertyAmenities, req));
}

/**
 * Category-tailored list of amenities for the search filter sidebar.
 */
export function getCategoryAmenities(categorySlug?: string | null): string[] {
  if (categorySlug === 'villa' || categorySlug === 'independent-house') {
    return [
      'Swimming Pool',
      'Garden',
      'Gated Community',
      'Club House',
      'Power Backup',
      '24/7 Security',
      'Parking',
      'Gym',
      'Children Play Area',
      'EV Charging',
    ];
  }
  if (categorySlug === 'commercial-office' || categorySlug === 'retail-shop') {
    return [
      'Power Backup',
      'Lift',
      'Central AC',
      '24/7 Security',
      'Parking',
      'Conference Room',
      'CCTV Security',
      'Fire Safety',
      'High Speed WiFi',
    ];
  }
  if (categorySlug === 'warehouse') {
    return [
      'Loading Dock',
      '24/7 Security',
      'Power Backup',
      'Fire Safety',
      '24/7 Water Supply',
      'CCTV Security',
      'Parking',
    ];
  }
  if (categorySlug === 'plots') {
    return [
      'Gated Community',
      '24/7 Security',
      'Garden',
      'Club House',
      'Children Play Area',
      '24/7 Water Supply',
      'CCTV Security',
    ];
  }

  // Default residential / apartments
  return [
    'Lift',
    'Gym',
    'Swimming Pool',
    '24/7 Security',
    'Power Backup',
    'Club House',
    'Children Play Area',
    'Parking',
    'Garden',
    'CCTV Security',
    'Piped Gas',
    'EV Charging',
    'Intercom',
    'Rainwater Harvesting',
  ];
}

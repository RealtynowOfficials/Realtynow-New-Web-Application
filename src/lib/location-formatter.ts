/**
 * Single source of truth for formatting property location hierarchy.
 * Priority: Locality -> City -> State -> Country
 * Example: "Bharat Future City, Hyderabad, Telangana, India"
 */

interface PropertyLocationData {
  locality_name?: string | null;
  locality?: string | null;
  location_name?: string | null;
  area?: string | null;
  city_name?: string | null;
  city?: string | null;
  district?: string | null;
  state_name?: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null;
  formatted_address?: string | null;
}

export function formatPropertyLocation(
  property: PropertyLocationData | any,
  options?: {
    includeCountry?: boolean;
    includeState?: boolean;
    fallback?: string;
    compact?: boolean;
  }
): string {
  if (!property) return options?.fallback || 'India';

  const rawLocality = (
    property.locality_name ||
    property.locality ||
    property.location_name ||
    property.area ||
    ''
  ).toString().trim();

  let rawCity = (
    property.city_name ||
    property.city ||
    property.district ||
    ''
  ).toString().trim();

  let rawState = (
    property.state_name ||
    property.state ||
    ''
  ).toString().trim();

  // If state is not explicitly set in the record, intelligently infer from known major cities
  if (!rawState && rawCity) {
    const lowerCity = rawCity.toLowerCase();
    if (
      [
        'hyderabad',
        'secunderabad',
        'rangareddy',
        'ranga reddy',
        'warangal',
        'nizamabad',
        'karimnagar',
        'khammam',
        'ramagundam',
        'mahbubnagar',
        'nalgonda',
        'siddipet',
        'medchal',
        'sangareddy',
        'yadadri',
        'bhongir',
        'shamshabad',
        'yacharam',
        'shadnagar',
        'maheswaram',
        'ibrahimpatnam',
      ].some((c) => lowerCity.includes(c))
    ) {
      rawState = 'Telangana';
    } else if (
      [
        'visakhapatnam',
        'vijayawada',
        'guntur',
        'tirupati',
        'nellore',
        'kurnool',
        'rajahmundry',
        'kakinada',
        'kadapa',
        'anantapur',
        'amaravati',
        'vizianagaram',
        'eluru',
        'ongole',
      ].some((c) => lowerCity.includes(c))
    ) {
      rawState = 'Andhra Pradesh';
    } else if (
      ['bengaluru', 'bangalore', 'mysuru', 'mysore', 'mangalore', 'mangaluru', 'hubli', 'belgaum'].some((c) =>
        lowerCity.includes(c)
      )
    ) {
      rawState = 'Karnataka';
    } else if (
      ['mumbai', 'pune', 'nagpur', 'thane', 'nashik', 'navi mumbai', 'aurangabad', 'solapur'].some((c) =>
        lowerCity.includes(c)
      )
    ) {
      rawState = 'Maharashtra';
    } else if (
      ['chennai', 'coimbatore', 'madurai', 'trichy', 'salem'].some((c) => lowerCity.includes(c))
    ) {
      rawState = 'Tamil Nadu';
    }
  }

  // Also check if locality has city/state clues (e.g., "Bharat Future City, Yacharam")
  if (!rawState && rawLocality) {
    const lowerLoc = rawLocality.toLowerCase();
    if (
      [
        'future city',
        'yacharam',
        'shamshabad',
        'gachibowli',
        'hitech city',
        'kokapet',
        'tellapur',
        'kollur',
        'mokila',
        'shankarpalli',
        'kondapur',
        'madhapur',
        'nanakramguda',
        'financial district',
        'puppalguda',
      ].some((l) => lowerLoc.includes(l))
    ) {
      rawState = 'Telangana';
      if (!rawCity) {
        rawCity = 'Hyderabad';
      }
    }
  }

  const rawCountry = (property.country || 'India').toString().trim();

  // Deduplicate and assemble parts
  const parts: string[] = [];

  // 1. Locality
  if (rawLocality && rawLocality.toLowerCase() !== rawCity.toLowerCase() && rawLocality.toLowerCase() !== rawState.toLowerCase()) {
    parts.push(rawLocality);
  }

  // 2. City
  if (rawCity && rawCity.toLowerCase() !== rawState.toLowerCase()) {
    // Avoid repeating if locality already ends with the city name
    if (!rawLocality.toLowerCase().endsWith(rawCity.toLowerCase())) {
      parts.push(rawCity);
    }
  }

  // 3. State
  if (options?.includeState !== false && rawState) {
    parts.push(rawState);
  }

  // 4. Country
  if (options?.includeCountry !== false && rawCountry) {
    parts.push(rawCountry);
  }

  if (parts.length === 0) {
    return options?.fallback || 'India';
  }

  return parts.join(', ');
}

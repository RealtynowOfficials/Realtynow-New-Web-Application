import React from 'react';
import type { Property } from './types';

// Fallback high-resolution property images hosted on reliable CDN
export const DEFAULT_PROPERTY_IMAGE =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80';

export const PROPERTY_FALLBACK_IMAGES: Record<string, string[]> = {
  apartment: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  ],
  villa: [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  ],
  house: [
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
  ],
  commercial: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80',
  ],
  office: [
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
  ],
  plot: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
  ],
  land: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
  ],
  luxury: [
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  ],
};

// Known dead 404 image URLs from legacy seed data that should be filtered out
const KNOWN_BROKEN_URLS = new Set([
  'https://images.pexels.com/photos/2451260/pexels-photo-2451260.jpeg',
  'https://images.pexels.com/photos/2061728/pexels-photo-2061728.jpeg',
  'https://images.unsplash.com/photo-1524813686514-a57563d77d66?auto=format&fit=crop&w=1200&q=80',
]);

// Resilient inline SVG data URI in case of full network / CDN outage
export const SVG_FALLBACK_IMAGE =
  'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20600%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%231e293b%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%230f172a%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22url(%23g)%22%2F%3E%3Cg%20transform%3D%22translate(350%2C240)%22%20fill%3D%22none%22%20stroke%3D%22%23e2e8f0%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M3%2050l47-38%2047%2038v45a5%205%200%200%201-5%205H8a5%205%200%200%201-5-5z%22%2F%3E%3Cpath%20d%3D%22M35%2095V55h30v40%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22390%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2218%22%20font-weight%3D%22600%22%20fill%3D%22%2394a3b8%22%20text-anchor%3D%22middle%22%3ERealtyNow%20Property%3C%2Ftext%3E%3C%2Fsvg%3E';

/**
 * Returns a category-specific fallback image list based on property title/type
 */
export function getCategoryFallbackImages(categoryOrType?: string, purpose?: string): string[] {
  const normalized = (categoryOrType || '').toLowerCase();
  if (normalized.includes('villa')) return PROPERTY_FALLBACK_IMAGES.villa;
  if (normalized.includes('luxury') || normalized.includes('penthouse')) return PROPERTY_FALLBACK_IMAGES.luxury;
  if (normalized.includes('house') || normalized.includes('independent')) return PROPERTY_FALLBACK_IMAGES.house;
  if (normalized.includes('commercial') || normalized.includes('shop') || normalized.includes('retail')) return PROPERTY_FALLBACK_IMAGES.commercial;
  if (normalized.includes('office') || normalized.includes('co-working')) return PROPERTY_FALLBACK_IMAGES.office;
  if (normalized.includes('plot') || normalized.includes('land')) return PROPERTY_FALLBACK_IMAGES.plot;
  if (normalized.includes('apartment') || normalized.includes('flat')) return PROPERTY_FALLBACK_IMAGES.apartment;
  return PROPERTY_FALLBACK_IMAGES.apartment;
}

/**
 * Safely parses and sanitizes property images.
 * Guarantees a non-empty array of valid image URLs.
 */
export function getSafePropertyImages(p?: Partial<Property> | null): string[] {
  if (!p) return [DEFAULT_PROPERTY_IMAGE];

  let raw = p.images;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [raw as unknown as string];
    }
  }

  let images: string[] = [];
  if (Array.isArray(raw)) {
    images = raw
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .filter((url) => !KNOWN_BROKEN_URLS.has(url.trim()));
  }

  // If cover_image_url is provided and not already in images, prepend it
  if (p.cover_image_url && typeof p.cover_image_url === 'string') {
    const cover = p.cover_image_url.trim();
    if (cover && !KNOWN_BROKEN_URLS.has(cover) && !images.includes(cover)) {
      images.unshift(cover);
    }
  }

  if (images.length === 0) {
    const typeOrCategory = (p as any).property_type_name || (p as any).category || (p as any).title || '';
    return getCategoryFallbackImages(typeOrCategory, p.purpose);
  }

  return images;
}

/**
 * Returns a guaranteed single cover image URL for a property.
 */
export function getPropertyCoverImage(p?: Partial<Property> | null): string {
  const list = getSafePropertyImages(p);
  return list[0] || DEFAULT_PROPERTY_IMAGE;
}

/**
 * Handles image loading errors gracefully on <img> elements.
 * Automatically switches to a reliable fallback image and prevents infinite error loops.
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallback = DEFAULT_PROPERTY_IMAGE,
) {
  const img = e.currentTarget;
  if (img.src !== fallback && img.src !== SVG_FALLBACK_IMAGE) {
    img.src = fallback;
  } else if (img.src !== SVG_FALLBACK_IMAGE) {
    img.src = SVG_FALLBACK_IMAGE;
  }
}

// src/lib/share-service.ts
// Centralized, cinematic social & WhatsApp property sharing service for RealtyNow.
// Generates beautifully formatted rich WhatsApp messages, canonical public URLs, and social links.

import { generatePropertyUrl, formatCompactPrice, formatNumber, getPropertyPrice } from './utils';
import type { Property } from './types';

export interface PropertyShareInput {
  id?: string | null;
  title: string;
  price?: number | string | null;
  purpose?: string | null;
  bedrooms?: number | string | null;
  bathrooms?: number | string | null;
  builtup_area?: number | string | null;
  built_up_area?: number | string | null;
  carpet_area?: number | string | null;
  area?: number | string | null;
  locality_name?: string | null;
  city_name?: string | null;
  locality?: string | null;
  city?: string | null;
  address?: string | null;
  images?: string[] | null;
  og_image?: string | null;
  slug?: string | null;
  property_type_name?: string | null;
  category?: string | null;
}

/**
 * Returns the public canonical base URL for RealtyNow.
 * In production, always returns the public domain (e.g. https://realtynow.in).
 */
export function getSitePublicBaseUrl(): string {
  // 1. Environment variable if explicitly provided
  const envUrl = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() && !envUrl.includes('localhost')) {
    return envUrl.trim().replace(/\/$/, '');
  }

  // 2. Browser origin if on a live custom domain (not localhost)
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    if (!origin.includes('localhost') && !origin.includes('127.0.0.1') && !origin.includes('0.0.0.0')) {
      return origin.replace(/\/$/, '');
    }
  }

  // 3. Official production domain fallback
  return 'https://realtynow.in';
}

/**
 * Generates the full, canonical, clickable HTTPS public URL for a property.
 */
export function getPropertyPublicUrl(property?: PropertyShareInput | null): string {
  if (!property) return getSitePublicBaseUrl();
  const path = generatePropertyUrl(property);
  if (path === '#' || !path) return getSitePublicBaseUrl();
  return `${getSitePublicBaseUrl()}${path}`;
}

/**
 * Resolves the highest quality public image URL for a property to use in Open Graph & preview cards.
 */
export function getPropertyCoverImage(property?: PropertyShareInput | null): string {
  if (!property) {
    return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';
  }
  if (property.og_image && property.og_image.startsWith('http')) {
    return property.og_image;
  }
  if (Array.isArray(property.images) && property.images.length > 0 && property.images[0]) {
    return property.images[0];
  }
  return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';
}

/**
 * Builds the formatted location string for a property (e.g. "Kondapur, Hyderabad").
 */
export function getPropertyLocationText(p: PropertyShareInput): string {
  const locality = p.locality_name || p.locality;
  const city = p.city_name || p.city;
  if (locality && city) {
    return locality.toLowerCase().includes(city.toLowerCase()) ? locality : `${locality}, ${city}`;
  }
  if (locality) return locality;
  if (city) return city;
  if (p.address) return p.address;
  return 'Hyderabad';
}

/**
 * Formats price text cleanly with compact Indian notation (e.g. "₹85.00 L", "₹4.50 Cr", "₹35,000/mo").
 */
export function getFormattedPriceText(p: PropertyShareInput): string {
  const numericPrice = getPropertyPrice(p as unknown as Property);
  if (numericPrice && numericPrice > 0) {
    return formatCompactPrice(numericPrice, p.purpose ?? undefined);
  }
  if (p.price) {
    if (typeof p.price === 'number') {
      return formatCompactPrice(p.price, p.purpose ?? undefined);
    }
    return String(p.price);
  }
  return 'Price on Request';
}

/**
 * Generates the premium, cinematic formatted WhatsApp share text with bold headings, emojis,
 * key specs, and the clickable HTTPS public property link.
 */
export function buildWhatsAppPropertyShareMessage(property: PropertyShareInput): string {
  const publicUrl = getPropertyPublicUrl(property);
  const locationText = getPropertyLocationText(property);
  const priceText = getFormattedPriceText(property);

  // Specs line: e.g. "2 BHK • 2 Bath"
  const specsArr: string[] = [];
  if (property.bedrooms) {
    const num = String(property.bedrooms).replace(/[^0-9.]/g, '');
    specsArr.push(`${num ? `${num} BHK` : property.bedrooms}`);
  }
  if (property.bathrooms) {
    const num = String(property.bathrooms).replace(/[^0-9.]/g, '');
    specsArr.push(`${num ? `${num} Bath` : `${property.bathrooms} Bath`}`);
  }
  const specsText = specsArr.join(' • ');

  // Area line: e.g. "1,150 Sq.Ft."
  const areaVal = property.builtup_area || property.carpet_area || property.area;
  let areaText = '';
  if (areaVal) {
    const numArea = typeof areaVal === 'number' ? areaVal : Number(String(areaVal).replace(/[^0-9.]/g, ''));
    areaText = numArea && !isNaN(numArea) ? `${formatNumber(numArea)} Sq.Ft.` : `${areaVal} Sq.Ft.`;
  }

  const lines: string[] = [
    '🏡 *Check out this property on RealtyNow*',
    '',
    `*${property.title.trim()}*`,
    '',
    `📍 ${locationText}`,
    `💰 ${priceText}`,
  ];

  if (specsText) {
    lines.push(`🛏️ ${specsText}`);
  }
  if (areaText) {
    lines.push(`📐 ${areaText}`);
  }

  lines.push('');
  lines.push('Explore this property:');
  lines.push(publicUrl);
  lines.push('');
  lines.push('_RealtyNow — All About Realty_');

  return lines.join('\n');
}

/**
 * Builds standard wa.me share URL for sharing to any WhatsApp chat or contact.
 */
export function getWhatsAppShareUrl(property: PropertyShareInput, phone?: string | null): string {
  const message = buildWhatsAppPropertyShareMessage(property);
  const encodedText = encodeURIComponent(message);
  
  if (phone) {
    const digitsOnly = phone.replace(/\D/g, '');
    const cleanPhone = digitsOnly.startsWith('91') || digitsOnly.length > 10 ? digitsOnly : `91${digitsOnly}`;
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Opens native device share sheet or copies property link with rich toast feedback.
 */
export async function sharePropertyNativeOrCopy(
  property: PropertyShareInput,
  onCopied?: () => void,
): Promise<{ success: boolean; method: 'native' | 'copy' | 'cancelled' }> {
  const publicUrl = getPropertyPublicUrl(property);
  const message = buildWhatsAppPropertyShareMessage(property);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: property.title,
        text: message,
        url: publicUrl,
      });
      return { success: true, method: 'native' };
    } catch {
      // User dismissed native share sheet — fallback to clipboard
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(publicUrl);
      onCopied?.();
      return { success: true, method: 'copy' };
    } catch {
      return { success: false, method: 'copy' };
    }
  }

  return { success: false, method: 'cancelled' };
}

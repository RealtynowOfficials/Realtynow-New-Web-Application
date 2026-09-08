/**
 * Google Ads & Google Analytics gtag.js helper module
 * Base Tag ID: AW-18358258883
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

export const GOOGLE_ADS_TAG_ID =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_ADS_ID) ||
  'AW-18358258883';

/**
 * Send custom event to gtag
 */
export function trackGtagEvent(
  action: string,
  params: Record<string, any> = {}
): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', action, params);
  }
}

/**
 * Track Google Ads Conversion
 * Example: trackAdsConversion('AbC-dEfGhIjK_123', { value: 1.0, currency: 'INR' })
 */
export function trackAdsConversion(
  conversionLabel: string,
  params: {
    value?: number;
    currency?: string;
    transaction_id?: string;
    [key: string]: any;
  } = {}
): void {
  if (!conversionLabel) return;
  const sendTo = `${GOOGLE_ADS_TAG_ID}/${conversionLabel}`;
  trackGtagEvent('conversion', {
    send_to: sendTo,
    ...params,
  });
}

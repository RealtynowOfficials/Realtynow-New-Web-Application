// Single source of truth for the platform-wide minimum property price rule.
// Every listing surface (customer wizard, plot wizard, edit modals, admin
// approve/publish, agent workflows) must call these same functions rather
// than re-implementing the ₹1,000 threshold — the actual unbypassable
// enforcement lives in Postgres (CHECK constraints + a BEFORE trigger, see
// migration 0120), this module exists so every UI surface fails the same
// way, with the same message, before the request ever reaches the server.
import { RENT_LIKE_PURPOSES } from './utils';
import { getPriceUnitLabel, isLandProperty } from './plot-pricing';

export const MIN_PROPERTY_PRICE = 1000;

const MIN_PRICE_LABEL = `₹${MIN_PROPERTY_PRICE.toLocaleString('en-IN')}`;

/** Parses a raw form value (string | number | null | undefined) into a finite number, or null if it isn't one. */
export function parsePriceInput(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const trimmed = String(value).trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function validate(value: unknown, subject: 'property' | 'unit', unitLabel?: string): string | null {
  const raw = value == null ? '' : String(value).trim();
  const unitSuffix = unitLabel ? ` per ${unitLabel}` : subject === 'unit' ? ' per unit' : '';
  
  if (raw === '') {
    return subject === 'unit'
      ? `Please enter the price${unitSuffix}.`
      : 'Please enter the property price.';
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return 'Please enter a valid numeric price.';
  if (n < 0) {
    return `Please enter a valid ${subject === 'unit' ? `price${unitSuffix}` : 'property price'} of ${MIN_PRICE_LABEL} or above.`;
  }
  if (n < MIN_PROPERTY_PRICE) {
    return subject === 'unit'
      ? `Minimum price${unitSuffix} must be ${MIN_PRICE_LABEL}.`
      : `Minimum property price must be ${MIN_PRICE_LABEL}.`;
  }
  return null;
}

/** Total/monthly property price (sale price or rent). Returns an error message, or null if valid. */
export function validatePropertyPrice(value: unknown): string | null {
  return validate(value, 'property');
}

/** Plot/land price-per-unit (₹/Sq. Ft, ₹/Sq. Yd, etc.). Returns an error message, or null if valid. */
export function validateUnitPrice(value: unknown, areaUnit?: string | null): string | null {
  const unitLabel = areaUnit ? getPriceUnitLabel(areaUnit) : undefined;
  return validate(value, 'unit', unitLabel);
}

export function isPriceValid(value: unknown): boolean {
  return validatePropertyPrice(value) === null;
}

/**
 * Whether a property record meets the minimum-price bar to be published/
 * approved/live — mirrors the DB's chk_properties_price_positive /
 * chk_properties_price_per_unit_positive constraints so admin/agent UI can
 * show the same "Invalid Price" state the server will ultimately enforce.
 */
export function isPropertyPublishable(p: {
  purpose?: string | null;
  price?: number | null;
  rent_amount?: number | null;
  listing_category?: string | null;
  price_per_unit?: number | null;
  [key: string]: any;
}): boolean {
  if (isLandProperty(p) && p.price_per_unit != null) {
    return p.price_per_unit >= MIN_PROPERTY_PRICE;
  }
  const isRent = RENT_LIKE_PURPOSES.includes(p.purpose || '');
  const amount = isRent ? p.rent_amount : p.price;
  return (amount ?? 0) >= MIN_PROPERTY_PRICE;
}

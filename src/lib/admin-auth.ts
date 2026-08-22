// src/lib/admin-auth.ts
// Centralized Admin Phone Authorization Helper for Client-Side code.
// Normalizes and verifies whether a given phone number is an authorized Administrator
// (Manager or Developer).

import { normalizeIndianMobile } from './phone';

/**
 * Default authorized administrator phone numbers (canonical 10-digit Indian numbers).
 * Includes the Developer phone number (9963509329) for application testing & development.
 */
const DEFAULT_ADMIN_PHONES = [
  '9959412687', // Sole authorized administrator
];

/**
 * Returns the set of all normalized authorized admin phone numbers (in "91XXXXXXXXXX" format).
 * Merges values from the import.meta.env.VITE_ADMIN_PHONE_NUMBERS environment variable
 * with the default list.
 */
export function getAuthorizedAdminPhones(): Set<string> {
  const envPhones: string = (import.meta.env.VITE_ADMIN_PHONE_NUMBERS as string) || '';

  const rawList = [
    ...DEFAULT_ADMIN_PHONES,
    ...envPhones.split(',').map((p) => p.trim()).filter(Boolean),
  ];

  const normalizedSet = new Set<string>();
  for (const raw of rawList) {
    const normalized = normalizeIndianMobile(raw);
    if (normalized) {
      normalizedSet.add(normalized);
    }
  }
  return normalizedSet;
}

/**
 * Checks whether the given phone number is authorized as an Admin.
 * Handles "9963509329", "+919963509329", and "919963509329" identically.
 */
export function isAuthorizedAdminPhone(rawPhone: string): boolean {
  const normalized = normalizeIndianMobile(rawPhone);
  if (!normalized) return false;
  const authorizedSet = getAuthorizedAdminPhones();
  return authorizedSet.has(normalized);
}

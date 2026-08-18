// supabase/functions/_shared/admin-auth.ts
// Centralized Admin Phone Authorization Helper for Edge Functions (Deno runtime).
// Normalizes and verifies whether a given phone number is an authorized Administrator
// (Manager or Developer).

import { normalizeIndianMobile } from "./phone.ts";

/**
 * Default authorized administrator phone numbers (canonical 10-digit Indian numbers).
 * Includes the Developer phone number (9963509329) for application testing & development.
 */
const DEFAULT_ADMIN_PHONES = [
  "9963509329", // Developer
];

/**
 * Returns the set of all normalized authorized admin phone numbers (in "91XXXXXXXXXX" format).
 * Merges values from the ADMIN_PHONE_NUMBERS / ADMIN_ALLOWED_PHONE_NUMBERS environment
 * variables with the default list.
 */
export function getAuthorizedAdminMobiles(): Set<string> {
  const envPhones =
    Deno.env.get("ADMIN_PHONE_NUMBERS") ||
    Deno.env.get("ADMIN_ALLOWED_PHONE_NUMBERS") ||
    "";

  const rawList = [
    ...DEFAULT_ADMIN_PHONES,
    ...envPhones.split(",").map((p) => p.trim()).filter(Boolean),
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
export function isAuthorizedAdminMobile(rawMobile: string): boolean {
  const normalized = normalizeIndianMobile(rawMobile);
  if (!normalized) return false;
  const authorizedSet = getAuthorizedAdminMobiles();
  return authorizedSet.has(normalized);
}

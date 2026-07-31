// Helper type for Supabase joined selects that return untyped objects.
export interface JoinedNames {
  cities?: { name: string } | null;
  localities?: { name: string } | null;
  property_types?: { name: string } | null;
  owner?: { first_name: string | null; last_name: string | null; email: string } | null;
  property?: { id: string; title: string } | null;
}

export function mapJoined<T extends Record<string, unknown>>(
  row: T,
): T & {
  city_name: string | null;
  locality_name: string | null;
  property_type_name: string | null;
} {
  const r = row as unknown as JoinedNames;
  return {
    ...row,
    city_name: r.cities?.name ?? null,
    locality_name: r.localities?.name ?? null,
    property_type_name: r.property_types?.name ?? null,
  };
}

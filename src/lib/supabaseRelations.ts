/**
 * Supabase can return an embedded relationship as either an object or a
 * one-item array, depending on the relationship cardinality it infers.
 * Normalize the value before it reaches UI code that expects one record.
 */
export function firstRelated<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

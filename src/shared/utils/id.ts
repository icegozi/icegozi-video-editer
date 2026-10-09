/**
 * Generates collision-resistant unique identifiers.
 * Uses native crypto.randomUUID when available.
 */
export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}

/**
 * Sanitizes an ID string to be safe for filenames and identifiers.
 */
export function sanitizeId(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

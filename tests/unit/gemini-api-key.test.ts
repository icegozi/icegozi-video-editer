import { describe, expect, it } from 'vitest';
import { geminiApiKeyInputError, normalizeGeminiApiKey } from '../../src/application/scene-generation/geminiApiKey';
import { GeminiApiKeyConfigSchema } from '../../src/infrastructure/scene-generation/googleOAuth';

const oldKey = 'AIza_fixture_only_not_a_real_key_000001';
const newKey = 'AQ.fixture_only_not_a_real_key_000001';

describe('Gemini API key input', () => {
  it.each([oldKey, newKey])('accepts supported Google key formats without modifying the token: %s', (key) => {
    expect(geminiApiKeyInputError(key)).toBeNull();
    expect(GeminiApiKeyConfigSchema.parse({ mode: 'api_key', apiKey: key }).apiKey).toBe(key);
  });
  it.each([
    `  ${newKey}  `,
    `"${newKey}"`,
    `‘${newKey}’`,
    `X-goog-api-key: ${newKey}`,
    `-H 'X-goog-api-key: ${newKey}'`,
    `--header "x-goog-api-key: ${newKey}"`,
  ])('extracts only the credential from a copied key or header', (input) => {
    expect(normalizeGeminiApiKey(input)).toBe(newKey);
    expect(GeminiApiKeyConfigSchema.parse({ mode: 'api_key', apiKey: input }).apiKey).toBe(newKey);
  });
  it.each([
    '', 'short', 'YOUR_GEMINI_API_KEY', 'YOUR_GEMINI_API_KEY_HERE',
    `${newKey}\r\nx-extra-header: value`, `${newKey}\u200b`,
    `curl https://example.invalid -H 'x-goog-api-key: ${newKey}'`, 'x'.repeat(513),
  ])('rejects incomplete tokens and extra command/header content without echoing secrets', (input) => {
    const message = geminiApiKeyInputError(input);
    expect(message).toBeTruthy();
    expect(message).not.toContain(newKey);
    expect(GeminiApiKeyConfigSchema.safeParse({ mode: 'api_key', apiKey: input }).success).toBe(false);
  });
});

export const GEMINI_API_KEY_PATTERN = /^[A-Za-z0-9_.-]+$/;

function unwrapQuotes(value: string): string {
  const pairs = [
    ['"', '"'],
    ["'", "'"],
    ['“', '”'],
    ['‘', '’'],
  ];
  return pairs.some(([left, right]) => value.startsWith(left) && value.endsWith(right))
    ? value.slice(1, -1).trim()
    : value;
}

// Accept a copied key/header, never execute or interpret a complete shell command.
export function normalizeGeminiApiKey(input: string): string {
  let value = unwrapQuotes(input.trim());
  value = unwrapQuotes(value.replace(/^(?:-H|--header)\s+/, '').trim());
  const header = /^x-goog-api-key\s*:\s*(.*)$/i.exec(value);
  if (header) value = unwrapQuotes(header[1].trim());
  return value;
}

export function geminiApiKeyInputError(input: unknown): string | null {
  if (typeof input !== 'string' || !input.trim()) return 'Nhập Gemini API key.';
  if (input.length > 2048)
    return 'Chỉ dán chuỗi key hoặc dòng X-goog-api-key, không dán cả lệnh curl.';
  const value = normalizeGeminiApiKey(input);
  if (/^YOUR_(?:GEMINI_)?API_KEY(?:_HERE)?$/i.test(value))
    return 'Hãy thay placeholder bằng key mới từ Google AI Studio.';
  if (value.length < 20) return 'API key quá ngắn. Hãy dán đầy đủ chuỗi key từ Google AI Studio.';
  if (value.length > 512) return 'Nội dung quá dài. Chỉ dán chuỗi key hoặc dòng X-goog-api-key.';
  if (!GEMINI_API_KEY_PATTERN.test(value))
    return 'API key chứa khoảng trắng, ký tự ẩn hoặc nội dung khác. Chỉ dán chuỗi key hoặc dòng X-goog-api-key; không dán cả lệnh curl.';
  return null;
}

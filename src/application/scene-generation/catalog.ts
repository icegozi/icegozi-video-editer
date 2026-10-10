import type { GenerationPreset } from './generation.contracts';

export const GENERATION_PRICING = {
  version: 'gemini-2026-10-10',
  source: 'https://ai.google.dev/gemini-api/docs/pricing',
  verifiedAt: '2026-10-10',
  expiresAt: Date.parse('2026-11-10T00:00:00Z'),
};
export const GENERATION_LIMITS = {
  maxActiveJobs: 2,
  maxConversationJobs: 20,
  maxOutputBytes: 256 * 1024 * 1024,
  maxReferenceBytes: 3 * 1024 * 1024,
};
const sizes = [
  { id: 'landscape', ratio: '16:9', width: 1344, height: 768 },
  { id: 'portrait', ratio: '9:16', width: 768, height: 1344 },
];
export const GENERATION_PRESETS: GenerationPreset[] = [
  ...sizes.map((size) => ({
    ...size,
    id: `gemini-image-${size.id}`,
    label: `Ảnh Gemini ${size.id === 'landscape' ? 'ngang' : 'dọc'} 1K`,
    kind: 'image' as const,
    providerId: 'gemini' as const,
    model: 'gemini-3.1-flash-lite-image',
    durations: [],
    maxPromptLength: 4000,
    supportsReference: true,
  })),
  ...sizes.flatMap((size) =>
    (['image', 'video'] as const).map((kind) => ({
      ...size,
      width: size.id === 'landscape' ? 1280 : 720,
      height: size.id === 'landscape' ? 720 : 1280,
      id: `core-${kind}-${size.id}`,
      label: `${kind === 'image' ? 'Ảnh' : 'Video'} core ${size.id === 'landscape' ? 'ngang' : 'dọc'}`,
      kind,
      providerId: 'core' as const,
      model: 'icegozi-core-v1',
      durations: kind === 'video' ? [2, 3, 4, 5, 6, 8, 10, 15, 20, 30] : [],
      maxPromptLength: 4000,
      supportsReference: false,
    })),
  ),
];

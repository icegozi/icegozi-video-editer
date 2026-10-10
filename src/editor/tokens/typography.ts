/**
 * Typography scale and font tokens for Luminous Creative Studio.
 * Section 4.2 Typographic Hierarchy.
 */
export const TYPOGRAPHY_TOKENS = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMono: '"JetBrains Mono", Menlo, Consolas, Monaco, monospace',

  sizes: {
    pageHeading: { fontSize: '20px', fontWeight: 600, lineHeight: '28px' },
    panelTitle: { fontSize: '16px', fontWeight: 600, lineHeight: '24px' },
    sectionTitle: { fontSize: '14px', fontWeight: 600, lineHeight: '20px' },
    body: { fontSize: '14px', fontWeight: 400, lineHeight: '21px' },
    bodyBold: { fontSize: '14px', fontWeight: 600, lineHeight: '21px' },
    formLabel: { fontSize: '13px', fontWeight: 500, lineHeight: '20px' },
    button: { fontSize: '13px', fontWeight: 500, lineHeight: '20px' },
    metadata: { fontSize: '12px', fontWeight: 400, lineHeight: '18px' },
    timecode: { fontSize: '12px', fontWeight: 500, lineHeight: '18px', fontVariantNumeric: 'tabular-nums' },

    // Legacy aliases
    appTitle: { fontSize: '14px', fontWeight: 600, lineHeight: '18px' },
    controlLabel: { fontSize: '13px', fontWeight: 500, lineHeight: '20px' },
    clipTitle: { fontSize: '12px', fontWeight: 500, lineHeight: '16px' },
    meta: { fontSize: '12px', fontWeight: 400, lineHeight: '18px' },
  },
} as const;

export type TypographyTokens = typeof TYPOGRAPHY_TOKENS;

/**
 * Typography scale and font tokens for high-density enterprise editing.
 */
export const TYPOGRAPHY_TOKENS = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontFamilyMono: 'JetBrains Mono, Menlo, Consolas, Monaco, "Courier New", monospace',

  sizes: {
    appTitle: { fontSize: '14px', fontWeight: 600, lineHeight: '18px' },
    panelTitle: { fontSize: '12px', fontWeight: 600, lineHeight: '16px', letterSpacing: '0.04em' },
    controlLabel: { fontSize: '11px', fontWeight: 500, lineHeight: '14px' },
    body: { fontSize: '12px', fontWeight: 400, lineHeight: '16px' },
    bodyBold: { fontSize: '12px', fontWeight: 600, lineHeight: '16px' },
    button: { fontSize: '12px', fontWeight: 500, lineHeight: '16px' },
    clipTitle: { fontSize: '11px', fontWeight: 500, lineHeight: '14px' },
    timecode: { fontSize: '12px', fontWeight: 500, lineHeight: '16px', fontVariantNumeric: 'tabular-nums' },
    meta: { fontSize: '10px', fontWeight: 400, lineHeight: '13px' },
  },
} as const;

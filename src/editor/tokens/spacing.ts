/**
 * Spacing, control sizing, panel constraints, and z-index tokens.
 * Sections 4.3 and 4.4 Responsive Desktop Constraints.
 */
export const SPACING_TOKENS = {
  // 4.3 Spacing scale: 4/8/12/16/20/24/32px
  space: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
  },

  // Common control heights
  heights: {
    header: 56,
    commandBar: 44,
    panelHeader: 38,
    canvasToolbar: 36,
    transportBar: 42,
    timelineToolbar: 36,
    timelineRuler: 28,
    videoTrack: 52,
    audioTrack: 52,
    clipHeight: 44,
    controlSm: 32,
    controlMd: 36,
    controlLg: 40,
    // Legacy
    inputMd: 36,
    buttonMd: 36,
    buttonSm: 32,
    buttonExport: 40,
  },

  // 4.4 Panel layout widths & constraints
  widths: {
    aiStudioDefault: 380,
    aiStudioMin: 280,
    aiStudioMax: 480,
    assetPanelDefault: 300,
    assetPanelMin: 240,
    assetPanelMax: 440,
    inspectorDefault: 320,
    inspectorMin: 260,
    inspectorMax: 480,
    navigationRail: 56,
    trackHeader: 200,
  },

  // Timeline height per mode
  timelineHeights: {
    aiFocus: 110,
    editFocus: 280,
    previewFocus: 40,
  },

  // 4.3 Border radii
  radius: {
    controlSm: '6px',
    control: '8px',
    button: '8px',
    input: '8px',
    card: '12px',
    panel: '14px',
    dialog: '16px',
    popover: '8px',
    clip: '6px',
    full: '9999px',
  },

  // Z-Index Token Hierarchy
  zIndex: {
    base: 0,
    clip: 10,
    clipSelected: 20,
    snapGuide: 30,
    playhead: 40,
    stickyHeaders: 50,
    popover: 100,
    modal: 200,
    toast: 250,
    tooltip: 300,
  },

  // Motion
  motion: {
    fast: '120ms',
    normal: '180ms',
    deliberate: '240ms',
    ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const;

export type SpacingTokens = typeof SPACING_TOKENS;

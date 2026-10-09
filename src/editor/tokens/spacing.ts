/**
 * Spacing, control heights, border radii, and z-index tokens.
 */
export const SPACING_TOKENS = {
  // 4px base grid
  space: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
  },

  // Control and panel heights
  heights: {
    commandBar: 52,
    panelHeader: 36,
    canvasToolbar: 36,
    transportBar: 40,
    timelineToolbar: 36,
    timelineRuler: 28,
    videoTrack: 52,
    audioTrack: 52,
    clipHeight: 44,
    inputMd: 32,
    buttonMd: 32,
    buttonSm: 28,
    buttonExport: 36,
  },

  // Panel widths
  widths: {
    assetPanelDefault: 280,
    assetPanelMin: 220,
    assetPanelMax: 420,
    inspectorDefault: 320,
    inspectorMin: 280,
    inspectorMax: 480,
    trackHeader: 200,
  },

  // Border radii
  radius: {
    controlSm: '4px',
    button: '6px',
    input: '6px',
    panel: '8px',
    popover: '8px',
    clip: '4px',
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
    tooltip: 300,
  },
} as const;

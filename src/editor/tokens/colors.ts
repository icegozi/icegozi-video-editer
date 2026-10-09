/**
 * Semantic dark-mode color tokens for the enterprise editor workspace.
 */
export const COLOR_TOKENS = {
  // Surface hierarchy
  bgApp: '#0B0D10',
  bgPanel: '#111419',
  bgPanelElevated: '#161A20',
  bgSurface: '#1B2027',
  bgHover: '#222832',
  bgActive: '#29313D',

  // Borders
  borderSubtle: '#252B34',
  borderDefault: '#303844',
  borderStrong: '#414B59',

  // Typography
  textPrimary: '#F2F4F7',
  textSecondary: '#AAB2BF',
  textMuted: '#737D8C',
  textDisabled: '#515A66',

  // Primary Accent
  accent: '#5B8CFF',
  accentHover: '#73A0FF',
  accentActive: '#4777E6',
  accentSoft: 'rgba(91, 140, 255, 0.14)',

  // Semantic Feedback
  success: '#35C78A',
  warning: '#F2B84B',
  danger: '#E66363',
  info: '#5B8CFF',

  // Timeline Specific
  playhead: '#FF5D73',
  snapGuide: '#5B8CFF',

  // Track Color Families (Muted enterprise tones)
  tracks: {
    video: {
      bg: '#1E293B',
      border: '#334155',
      selected: 'rgba(91, 140, 255, 0.9)',
      text: '#93C5FD',
    },
    audio: {
      bg: '#14382A',
      border: '#1F533E',
      selected: 'rgba(53, 199, 138, 0.9)',
      text: '#6EE7B7',
    },
    image: {
      bg: '#2D2244',
      border: '#433464',
      selected: 'rgba(167, 139, 250, 0.9)',
      text: '#C4B5FD',
    },
    text: {
      bg: '#3A2A18',
      border: '#573E23',
      selected: 'rgba(242, 184, 75, 0.9)',
      text: '#FCD34D',
    },
    formula: {
      bg: '#123845',
      border: '#1C5366',
      selected: 'rgba(56, 189, 248, 0.9)',
      text: '#7DD3FC',
    },
    composition: {
      bg: '#22244C',
      border: '#343872',
      selected: 'rgba(129, 140, 248, 0.9)',
      text: '#A5B4FC',
    },
  },
} as const;

export type ColorTokens = typeof COLOR_TOKENS;

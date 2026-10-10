/**
 * Semantic light-mode enterprise color tokens for the editor workspace.
 */
export const COLOR_TOKENS = {
  // Surface hierarchy
  bgApp: '#F7F9FC',
  bgPanel: '#FFFFFF',
  bgPanelElevated: '#F8FAFC',
  bgSurface: '#FFFFFF',
  bgHover: '#F1F5F9',
  bgActive: '#E2E8F0',

  // Borders
  borderSubtle: '#E2E8F0',
  borderDefault: '#CBD5E1',
  borderStrong: '#94A3B8',

  // Typography
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textDisabled: '#94A3B8',

  // Primary Accent
  accent: '#3568E8',
  accentHover: '#2455D4',
  accentActive: '#1D44B8',
  accentSoft: 'rgba(53, 104, 232, 0.1)',

  // Semantic Feedback
  success: '#167A4A',
  warning: '#B45309',
  danger: '#DC2626',
  info: '#3568E8',

  // Dedicated Video Canvas
  canvasBg: '#0F172A',

  // Timeline Specific
  playhead: '#E11D48',
  snapGuide: '#2563EB',

  // Track Color Families (Muted enterprise tones)
  tracks: {
    video: {
      bg: '#EEF2FF',
      border: '#C7D2FE',
      selected: 'rgba(53, 104, 232, 0.85)',
      text: '#3730A3',
    },
    audio: {
      bg: '#ECFDF5',
      border: '#A7F3D0',
      selected: 'rgba(22, 122, 74, 0.85)',
      text: '#065F46',
    },
    image: {
      bg: '#F5F3FF',
      border: '#DDD6FE',
      selected: 'rgba(124, 58, 237, 0.85)',
      text: '#5B21B6',
    },
    text: {
      bg: '#FFFBEB',
      border: '#FDE68A',
      selected: 'rgba(217, 119, 6, 0.85)',
      text: '#92400E',
    },
    formula: {
      bg: '#F0F9FF',
      border: '#BAE6FD',
      selected: 'rgba(2, 132, 199, 0.85)',
      text: '#075985',
    },
    composition: {
      bg: '#EEF2FF',
      border: '#C7D2FE',
      selected: 'rgba(79, 70, 229, 0.85)',
      text: '#3730A3',
    },
  },
} as const;

export type ColorTokens = typeof COLOR_TOKENS;


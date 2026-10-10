/**
 * Semantic light-mode enterprise color tokens for Luminous Creative Studio.
 */
export const COLOR_TOKENS = {
  // 4.1 Semantic Color Tokens
  appBg: '#F7F9FC',
  surface: '#FFFFFF',
  surfaceMuted: '#F2F5FA',
  surfaceHover: '#F1F5F9',
  surfaceActive: '#E2E8F0',

  primary: '#3568E8',
  primaryStrong: '#2452CB',
  primarySubtle: '#EEF3FF',
  primarySoft: 'rgba(53, 104, 232, 0.1)',

  textPrimary: '#17233B',
  textSecondary: '#52627A',
  textMuted: '#64748B',
  textDisabled: '#94A3B8',

  border: '#E3E8F1',
  borderSubtle: '#E2E8F0',
  borderDefault: '#CBD5E1',
  borderStrong: '#94A3B8',

  stage: '#0F172A',
  creativeAccent: '#F3A65A',
  creativeAccentSoft: 'rgba(243, 166, 90, 0.15)',

  // Semantic Feedback Roles
  success: '#167A4A',
  successSubtle: '#ECFDF5',
  warning: '#B45309',
  warningSubtle: '#FFFBEB',
  danger: '#DC2626',
  dangerSubtle: '#FEF2F2',
  info: '#3568E8',
  infoSubtle: '#EEF3FF',
  focusRing: '#3568E8',
  disabled: '#94A3B8',

  // Backward compatible legacy properties
  bgApp: '#F7F9FC',
  bgPanel: '#FFFFFF',
  bgPanelElevated: '#F2F5FA',
  bgSurface: '#FFFFFF',
  bgHover: '#F1F5F9',
  bgActive: '#E2E8F0',
  accent: '#3568E8',
  accentHover: '#2452CB',
  accentActive: '#1D44B8',
  accentSoft: 'rgba(53, 104, 232, 0.1)',
  canvasBg: '#0F172A',
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

/**
 * Theme, Font & Density Store
 * Manages CSS custom properties and persists to localStorage
 */

export type ThemePreset = 'obsidian' | 'slate' | 'ledger' | 'terminal';
export type FontPairing = 'precision' | 'editorial' | 'terminal';
export type DensityMode = 'compact' | 'standard' | 'spacious';

export interface ThemeState {
  theme: ThemePreset;
  fontPairing: FontPairing;
  density: DensityMode;
  showCrosshairs: boolean;
  customAccent: string | null;
}

export const THEME_PRESETS: Record<ThemePreset, Record<string, string>> = {
  obsidian: {
    '--bg-canvas': '#09090B',
    '--bg-surface': '#111113',
    '--bg-elevated': '#18181B',
    '--border-hairline': '#27272A',
    '--border-subtle': '#3F3F46',
    '--text-primary': '#FAFAFA',
    '--text-muted': '#A1A1AA',
    '--text-tertiary': '#71717A',
    '--accent-safe': '#10B981',
    '--accent-warn': '#F59E0B',
    '--accent-danger': '#EF4444',
    '--accent-info': '#38BDF8',
  },
  slate: {
    '--bg-canvas': '#F8FAFC',
    '--bg-surface': '#FFFFFF',
    '--bg-elevated': '#F1F5F9',
    '--border-hairline': '#E2E8F0',
    '--border-subtle': '#94A3B8',
    '--text-primary': '#0F172A',
    '--text-muted': '#64748B',
    '--text-tertiary': '#94A3B8',
    '--accent-safe': '#059669',
    '--accent-warn': '#D97706',
    '--accent-danger': '#DC2626',
    '--accent-info': '#0284C7',
  },
  ledger: {
    '--bg-canvas': '#F6F5F0',
    '--bg-surface': '#FDFDFB',
    '--bg-elevated': '#EFECE6',
    '--border-hairline': '#DCD8CE',
    '--border-subtle': '#A8A29E',
    '--text-primary': '#18181B',
    '--text-muted': '#57534E',
    '--text-tertiary': '#78716C',
    '--accent-safe': '#059669',
    '--accent-warn': '#EA580C',
    '--accent-danger': '#DC2626',
    '--accent-info': '#2563EB',
  },
  terminal: {
    '--bg-canvas': '#050505',
    '--bg-surface': '#0C0C0C',
    '--bg-elevated': '#141414',
    '--border-hairline': '#292929',
    '--border-subtle': '#525252',
    '--text-primary': '#EDEDED',
    '--text-muted': '#888888',
    '--text-tertiary': '#666666',
    '--accent-safe': '#10B981',
    '--accent-warn': '#F59E0B',
    '--accent-danger': '#EF4444',
    '--accent-info': '#38BDF8',
  },
};

export const ACCENT_PRESETS: Record<ThemePreset, string> = {
  obsidian: '#2563EB',
  slate: '#0D9488',
  ledger: '#D97706',
  terminal: '#EA580C',
};

export const FONT_PAIRINGS: Record<FontPairing, { display: string; ui: string; mono: string }> = {
  precision: {
    display: 'Geist, sans-serif',
    ui: '"Plus Jakarta Sans", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  editorial: {
    display: '"Instrument Serif", Georgia, serif',
    ui: '"DM Sans", system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, monospace',
  },
  terminal: {
    display: '"Space Grotesk", system-ui, sans-serif',
    ui: '"Syne", system-ui, sans-serif',
    mono: '"Fira Code", ui-monospace, monospace',
  },
};

export const DENSITY_PADDING: Record<DensityMode, number> = {
  compact: 16,
  standard: 20,
  spacious: 24,
};

const STORAGE_KEY = 'veritas-theme-state';

export function loadThemeState(): ThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    theme: 'obsidian',
    fontPairing: 'precision',
    density: 'standard',
    showCrosshairs: false,
    customAccent: null,
  };
}

export function saveThemeState(state: ThemeState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function getAccentColor(state: ThemeState): string {
  if (state.customAccent) return state.customAccent;
  return ACCENT_PRESETS[state.theme];
}

/**
 * Theme, Font & Accessibility Store
 * Manages CSS custom properties, WCAG AA compliance tokens, and persists to localStorage
 */

export type ThemePreset = 'obsidian' | 'slate' | 'ledger' | 'terminal';
export type FontPairing = 'editorial' | 'precision' | 'terminal';
export type FontFamilyId =
  | 'inter'
  | 'jakarta'
  | 'dmsans'
  | 'ibmplex'
  | 'spacegrotesk'
  | 'jetbrains';
export type DensityMode = 'compact' | 'standard' | 'spacious';
export type InterfaceScale = '90%' | '100%' | '110%';

export interface ThemeState {
  theme: ThemePreset;
  fontPairing: FontPairing;
  fontFamily?: FontFamilyId;
  density: DensityMode;
  showCrosshairs: boolean;
  customAccent: string | null;
  // WCAG AA Suite
  reducedMotion: boolean;
  highContrastBorders: boolean;
  interfaceScale: InterfaceScale;
  showTabularCharts: boolean;
}

export interface FontFamilyOption {
  id: FontFamilyId;
  name: string;
  subtitle: string;
  cssStack: string;
  sample: string;
}

export const FONT_FAMILY_OPTIONS: FontFamilyOption[] = [
  {
    id: 'inter',
    name: 'Inter',
    subtitle: 'Default Clean Sans',
    cssStack: '"Inter", system-ui, -apple-system, sans-serif',
    sample: 'Net-30 invoice risk & treasury cash flow clarity.',
  },
  {
    id: 'jakarta',
    name: 'Plus Jakarta Sans',
    subtitle: 'Modern Geometric',
    cssStack: '"Plus Jakarta Sans", system-ui, sans-serif',
    sample: 'Net-30 invoice risk & treasury cash flow clarity.',
  },
  {
    id: 'dmsans',
    name: 'DM Sans',
    subtitle: 'High-Legibility SaaS',
    cssStack: '"DM Sans", system-ui, sans-serif',
    sample: 'Net-30 invoice risk & treasury cash flow clarity.',
  },
  {
    id: 'ibmplex',
    name: 'IBM Plex Sans',
    subtitle: 'Institutional Banking',
    cssStack: '"IBM Plex Sans", system-ui, sans-serif',
    sample: 'Net-30 invoice risk & treasury cash flow clarity.',
  },
  {
    id: 'spacegrotesk',
    name: 'Space Grotesk',
    subtitle: 'Technical Editorial',
    cssStack: '"Space Grotesk", system-ui, sans-serif',
    sample: 'Net-30 invoice risk & treasury cash flow clarity.',
  },
  {
    id: 'jetbrains',
    name: 'JetBrains Mono',
    subtitle: 'Quant Terminal',
    cssStack: '"JetBrains Mono", ui-monospace, monospace',
    sample: 'Net-30 invoice risk & treasury cash flow clarity.',
  },
];

export const THEME_LABELS: Record<ThemePreset, string> = {
  obsidian: 'Obsidian Blueprint',
  slate: 'Institutional Slate',
  ledger: 'Ledger Paper',
  terminal: 'Swiss Terminal',
};

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
    '--accent-primary': '#2563EB',
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
    '--accent-primary': '#0D9488',
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
    '--accent-primary': '#D97706',
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
    '--accent-primary': '#EA580C',
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

export const FONT_PAIRING_LABELS: Record<FontPairing, string> = {
  editorial: 'Instrument Serif + Switzer + JetBrains Mono',
  precision: 'Geist + General Sans + Geist Mono',
  terminal: 'Space Grotesk + Clash Grotesk + IBM Plex Mono',
};

export const FONT_PAIRINGS: Record<FontPairing, { display: string; ui: string; mono: string }> = {
  editorial: {
    display: '"Instrument Serif", Georgia, serif',
    ui: 'Switzer, "DM Sans", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  precision: {
    display: 'Geist, system-ui, sans-serif',
    ui: '"General Sans", "Plus Jakarta Sans", system-ui, sans-serif',
    mono: '"Geist Mono", "JetBrains Mono", monospace',
  },
  terminal: {
    display: '"Space Grotesk", system-ui, sans-serif',
    ui: '"Clash Grotesk", Syne, system-ui, sans-serif',
    mono: '"IBM Plex Mono", monospace',
  },
};

export const DENSITY_PADDING: Record<DensityMode, number> = {
  compact: 16,
  standard: 20,
  spacious: 24,
};

const STORAGE_KEY = 'float-theme-state';

export function loadThemeState(): ThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        theme: parsed.theme || 'obsidian',
        fontPairing: parsed.fontPairing || 'precision',
        fontFamily: parsed.fontFamily || 'inter',
        density: parsed.density || 'standard',
        showCrosshairs: !!parsed.showCrosshairs,
        customAccent: parsed.customAccent || null,
        reducedMotion: !!parsed.reducedMotion,
        highContrastBorders: !!parsed.highContrastBorders,
        interfaceScale: parsed.interfaceScale || '100%',
        showTabularCharts: !!parsed.showTabularCharts,
      };
    }
  } catch { /* ignore */ }
  return {
    theme: 'obsidian',
    fontPairing: 'precision',
    fontFamily: 'inter',
    density: 'standard',
    showCrosshairs: false,
    customAccent: null,
    reducedMotion: false,
    highContrastBorders: false,
    interfaceScale: '100%',
    showTabularCharts: false,
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

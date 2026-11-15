import React from 'react';
import type { ScenarioPreset } from '../../data/scenarios';
import { type ThemeState } from '../../store/themeStore';

interface TopTelemetryBarProps {
  activeView: string;
  onLoadScenario: (s: ScenarioPreset) => void;
  scenarioPresets: ScenarioPreset[];
  themeState: ThemeState;
  onThemeUpdate: (p: Partial<ThemeState>) => void;
}

export const TopTelemetryBar: React.FC<TopTelemetryBarProps> = ({
  activeView, onLoadScenario, scenarioPresets, themeState, onThemeUpdate,
}) => {
  const viewNames: Record<string, string> = {
    '/deal': 'DEAL & ARRIVAL WORKBENCH',
    '/runway': '60-DAY RUNWAY COLLISION LAB',
    '/gst': 'GST & VENDOR ANOMALY SHIELD',
    '/ageing': 'AGEING MATRIX & BATCH LEDGER',
    '/benchmarks': 'BENCHMARKS & HONESTY AUDIT',
    '/settings': 'COLAB BRIDGE & STUDIO',
  };

  const themes: ThemeState['theme'][] = ['obsidian', 'slate', 'ledger', 'terminal'];
  const cycleTheme = () => {
    const idx = themes.indexOf(themeState.theme);
    const next = themes[(idx + 1) % themes.length];
    onThemeUpdate({ theme: next, customAccent: null });
  };

  return (
    <div className="h-12 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 flex items-center justify-between shrink-0">
      <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-tertiary)]">
        {viewNames[activeView] || 'WORKBENCH'}
      </span>
      <div className="flex items-center gap-2">
        {scenarioPresets.slice(0, 4).map((sc) => (
          <button key={sc.id} onClick={() => onLoadScenario(sc)} className="px-2.5 py-1 text-[10px] font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] transition-colors">{sc.name}</button>
        ))}
        <div className="w-px h-5 bg-[var(--border-hairline)] mx-1" />
        <span className="text-[10px] font-mono text-[var(--text-tertiary)]">BAA10Y: 1.95% | Delinq: 1.15%</span>
        <button onClick={cycleTheme} className="px-2 py-1 text-[10px] font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]">Theme</button>
      </div>
    </div>
  );
};

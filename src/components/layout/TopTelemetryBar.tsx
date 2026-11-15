import React, { useState, useEffect } from 'react';
import { type ThemeState } from '../../store/themeStore';

interface TopTelemetryBarProps {
  activeView: string;
  themeState: ThemeState;
  onThemeUpdate: (p: Partial<ThemeState>) => void;
}

export const TopTelemetryBar: React.FC<TopTelemetryBarProps> = ({
  activeView, themeState, onThemeUpdate,
}) => {
  const viewNames: Record<string, string> = {
    deal: 'DEAL & ARRIVAL WORKBENCH',
    runway: '60-DAY RUNWAY COLLISION LAB',
    gst: 'GST & VENDOR ANOMALY SHIELD',
    ageing: 'AGEING MATRIX & BATCH LEDGER',
    benchmarks: 'BENCHMARKS & HONESTY AUDIT',
    settings: 'COLAB BRIDGE & STUDIO',
  };

  const [macro, setMacro] = useState({ spread: 1.95, delinq: 1.15 });
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
      <div className="flex items-center gap-3">
        <div className="w-px h-4 bg-[var(--border-hairline)]" />
        <span className="text-[10px] font-mono tabular-nums text-[var(--text-tertiary)]">
          BAA10Y: <span className="text-[var(--accent-warn)]">{macro.spread.toFixed(2)}%</span>
          <span className="mx-1.5 text-[var(--border-hairline)]">|</span>
          Delinq: <span style={{ color: macro.delinq > 1.5 ? 'var(--accent-danger)' : 'var(--accent-safe)' }}>{macro.delinq.toFixed(2)}%</span>
        </span>
        <div className="w-px h-4 bg-[var(--border-hairline)]" />
        <button onClick={cycleTheme} className="px-2.5 py-1 text-[10px] font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] transition-colors">
          {themeState.theme.toUpperCase()}
        </button>
      </div>
    </div>
  );
};

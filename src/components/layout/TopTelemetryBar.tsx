import React, { useState } from 'react';
import { PanelLeft, Command, Cpu, Building2 } from 'lucide-react';
import { type ThemeState } from '../../store/themeStore';
import { useWorkspace } from '../../store/workspaceStore';

interface TopTelemetryBarProps {
  activeView: string;
  themeState: ThemeState;
  onThemeUpdate: (p: Partial<ThemeState>) => void;
  onToggleSidebar: () => void;
  onOpenCmd?: () => void;
}

export const TopTelemetryBar: React.FC<TopTelemetryBarProps> = ({
  activeView,
  themeState,
  onThemeUpdate,
  onToggleSidebar,
  onOpenCmd,
}) => {
  const { state } = useWorkspace();
  const viewNames: Record<string, string> = {
    deal: 'DEAL UNDERWRITING INTAKE',
    runway: 'CASH FLOW & RUNWAY LAB',
    ageing: 'AGEING MATRIX & RECEIVABLE LEDGER',
    gst: 'GST COMPLIANCE & SECTION 16(2) ITC',
    benchmarks: 'MODEL BENCHMARKS & HONESTY AUDIT',
    copilot: 'AI RISK COPILOT ADVISORY',
    'business-planner': 'BUSINESS DATA & EXPANSION PLANNER',
    settings: 'ENTERPRISE SETTINGS & BRIDGE',
  };

  const [macro] = useState({ spread: 1.95, delinq: 1.15 });
  const themes: ThemeState['theme'][] = ['obsidian', 'slate', 'ledger', 'terminal'];

  const cycleTheme = () => {
    const idx = themes.indexOf(themeState.theme);
    const next = themes[(idx + 1) % themes.length];
    onThemeUpdate({ theme: next, customAccent: null });
  };

  const isLiveColab = state.provenance === 'LIVE_COLAB';

  return (
    <div className="h-12 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="p-1 hover:bg-[var(--bg-elevated)] transition-colors"
          title="Toggle Sidebar (Ctrl+B)"
        >
          <PanelLeft className="w-4 h-4 text-[var(--text-tertiary)]" />
        </button>
        <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-tertiary)]">
          {viewNames[activeView] || 'WORKBENCH'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Custom Business Weights Active Indicator */}
        {state.customBusinessActive && (
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 border border-[var(--accent-safe)]/40 bg-[var(--accent-safe)]/10"
            title="Custom business historical weights active for deal underwriting"
          >
            <span className="w-1.5 h-1.5 bg-[var(--accent-safe)] animate-pulse" />
            <span className="text-[10px] font-mono text-[var(--accent-safe)] font-bold">
              CUSTOM BUSINESS WEIGHTS ACTIVE
            </span>
          </div>
        )}

        {/* Active Enterprise Identity Badge */}
        {state.enterpriseProfile && (
          <div
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 border border-[var(--border-hairline)] bg-[var(--bg-elevated)]"
            title={`Enterprise: ${state.enterpriseProfile.companyName} | Udyam: ${state.enterpriseProfile.udyamRegistrationNumber}`}
          >
            <Building2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span className="text-[10px] font-mono font-bold text-[var(--text-primary)] max-w-[150px] truncate">
              {state.enterpriseProfile.tradingBrandName || state.enterpriseProfile.companyName}
            </span>
            <span className="text-[9px] font-mono text-[var(--accent-safe)] border border-[var(--border-hairline)] px-1 bg-[var(--bg-surface)]">
              {state.enterpriseProfile.msmeCategory}
            </span>
          </div>
        )}

        {/* Model Provenance & Health Indicator (from plan.md) */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
          <span
            className={`w-1.5 h-1.5 rounded-[2px] ${
              isLiveColab ? 'bg-[var(--accent-warn)] animate-pulse' : 'bg-[var(--accent-safe)]'
            }`}
          />
          <span className="text-[10px] font-mono text-[var(--text-secondary)]">
            {isLiveColab ? 'LIVE COLAB' : 'LOCAL MIRROR'}
          </span>
          <span className="text-[9px] font-mono text-[var(--text-tertiary)] hidden xl:inline">
            • LightGBM v2.1 (360k recs)
          </span>
          {state.latencyMs !== null && (
            <span className="text-[9px] font-mono text-[var(--accent-primary)] tabular-nums">
              {state.latencyMs}ms
            </span>
          )}
        </div>

        {/* Live Macro FRED Spread */}
        <div className="hidden lg:flex items-center text-[10px] font-mono tabular-nums text-[var(--text-tertiary)]">
          <span>BAA10Y: <span className="text-[var(--accent-warn)]">{macro.spread.toFixed(2)}%</span></span>
          <span className="mx-1.5 text-[var(--border-hairline)]">|</span>
          <span>Delinq: <span style={{ color: macro.delinq > 1.5 ? 'var(--accent-danger)' : 'var(--accent-safe)' }}>{macro.delinq.toFixed(2)}%</span></span>
        </div>

        <div className="w-px h-4 bg-[var(--border-hairline)]" />

        {/* Theme Quick Switcher */}
        <button
          onClick={cycleTheme}
          className="px-2 py-1 text-[10px] font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] transition-colors"
          title="Click to cycle themes"
        >
          {themeState.theme.toUpperCase()}
        </button>

        {/* Command Palette Trigger */}
        <button
          onClick={() => onOpenCmd ? onOpenCmd() : onToggleSidebar()}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] transition-colors"
          title="Open Command Palette (Ctrl+K)"
        >
          <Command className="w-3 h-3" />
          <span>Cmd+K</span>
        </button>
      </div>
    </div>
  );
};

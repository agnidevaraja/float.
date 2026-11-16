import React from 'react';
import { PanelLeft, Command, Building2 } from 'lucide-react';
import { type ThemeState } from '../../store/themeStore';
import { useWorkspace } from '../../store/workspaceStore';
import { FLOAT_METRICS } from '../../utils/metrics';
import { loadApiConfig } from '../../engine/inferenceBridge';

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
    deal: 'Deal Underwriting',
    runway: 'Cash Flow & Runway Lab',
    ageing: 'Ageing Matrix & Receivable Ledger',
    gst: 'GST Compliance & Section 16(2) ITC',
    benchmarks: 'Model Benchmarks & Fairness Audit',
    copilot: 'Treasury Advisory Copilot',
    'business-planner': 'Business & Working-Capital Planner',
    settings: 'Settings & Model Bridge',
  };

  const themes: ThemeState['theme'][] = ['obsidian', 'slate', 'ledger', 'terminal'];

  const cycleTheme = () => {
    const idx = themes.indexOf(themeState.theme);
    const next = themes[(idx + 1) % themes.length];
    onThemeUpdate({ theme: next, customAccent: null });
  };

  const apiConfig = loadApiConfig();
  const isLiveColab =
    state.provenance === 'LIVE_COLAB' ||
    Boolean(apiConfig.endpointUrl && apiConfig.endpointUrl.trim().length > 0);

  return (
    <div className="h-12 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 flex items-center justify-between shrink-0 gap-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-all duration-150"
          title="Toggle Sidebar (Ctrl+B)"
        >
          <PanelLeft className="w-4 h-4 text-[var(--text-tertiary)]" />
        </button>
        <span className="text-xs font-display font-semibold tracking-tight text-[var(--text-primary)] truncate">
          {viewNames[activeView] || 'Treasury Workbench'}
        </span>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {/* Active Enterprise Identity */}
        {state.enterpriseProfile && (
          <div
            className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)]"
            title={
              state.enterpriseProfile.companyName
                ? `Company: ${state.enterpriseProfile.companyName}`
                : 'Enterprise Profile not configured - click Settings to configure or load demo'
            }
          >
            <Building2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span className="text-[11px] font-sans font-medium text-[var(--text-primary)] max-w-[150px] truncate">
              {state.enterpriseProfile.tradingBrandName || state.enterpriseProfile.companyName || 'Your Enterprise'}
            </span>
          </div>
        )}

        {/* Engine Status Pill */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)]"
          title={`${FLOAT_METRICS.dataSourcesCount} Data Sources • ${FLOAT_METRICS.totalRecordsFormatted} Records • ${FLOAT_METRICS.featuresCount} Features • ROC-AUC ${FLOAT_METRICS.rocAucFormatted} • PR-AUC ${FLOAT_METRICS.prAucFormatted} • F1-Score ${FLOAT_METRICS.f1ScoreFormatted}`}
        >
          <span
            className={`text-[11px] font-sans font-medium ${
              isLiveColab ? 'text-[var(--accent-safe)]' : 'text-[var(--text-primary)]'
            }`}
          >
            {isLiveColab
              ? '● LIVE COLAB GPU • LightGBM + Qwen-7B (374,284 recs)'
              : '● EMBEDDED ENGINE • Calibrated LightGBM (374,284 recs)'}
          </span>
        </div>

        <div className="w-px h-4 bg-[var(--border-hairline)] hidden sm:block" />

        {/* Theme Quick Switcher */}
        <button
          onClick={cycleTheme}
          className="px-2.5 py-1 rounded-lg text-[10px] font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] transition-all duration-150"
          title="Click to cycle themes (Obsidian / Slate / Ledger / Terminal)"
        >
          {themeState.theme.toUpperCase()}
        </button>

        {/* Command Palette Trigger */}
        <button
          onClick={() => (onOpenCmd ? onOpenCmd() : onToggleSidebar())}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] transition-all duration-150"
          title="Open Command Palette (Ctrl+K)"
        >
          <Command className="w-3 h-3" />
          <span>Cmd+K</span>
        </button>
      </div>
    </div>
  );
};

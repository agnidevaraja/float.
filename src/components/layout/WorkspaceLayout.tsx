import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { THEME_PRESETS, FONT_PAIRINGS, DENSITY_PADDING, loadThemeState, saveThemeState, type ThemeState } from '../../store/themeStore';
import { CollapsibleSidebar } from './CollapsibleSidebar';
import { TopTelemetryBar } from './TopTelemetryBar';
import { View01DealWorkbench } from '../views/View01DealWorkbench';
import { View02RunwayLab } from '../views/View02RunwayLab';
import { View03GstShield } from '../views/View03GstShield';
import { View04AgeingMatrix } from '../views/View04AgeingMatrix';
import { View05Benchmarks } from '../views/View05Benchmarks';
import { View06Settings } from '../views/View06Settings';
import { AiCopilotView } from '../views/AiCopilotView';
import { CommandPalette } from '../CommandPalette';

const VIEW_PATHS = ['/workspace/deal', '/workspace/copilot', '/workspace/runway', '/workspace/gst', '/workspace/ageing', '/workspace/benchmarks', '/workspace/settings'];

export const WorkspaceLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const viewId = location.pathname.replace('/workspace', '').replace('/', '') || 'deal';
  const [themeState, setThemeState] = React.useState<ThemeState>(() => loadThemeState());
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [cmdOpen, setCmdOpen] = React.useState(false);

  const handleThemeUpdate = React.useCallback((patch: Partial<ThemeState>) => {
    setThemeState((prev) => {
      const next = { ...prev, ...patch };
      saveThemeState(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const tokens = THEME_PRESETS[themeState.theme];
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    root.style.setProperty('--accent-primary', themeState.customAccent || tokens['--accent-primary']);
    const fonts = FONT_PAIRINGS[themeState.fontPairing];
    root.style.setProperty('--font-display', fonts.display);
    root.style.setProperty('--font-sans', fonts.ui);
    root.style.setProperty('--font-mono', fonts.mono);
    root.style.setProperty('--cell-padding', `${DENSITY_PADDING[themeState.density]}px`);
  }, [themeState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key >= '1' && e.key <= '7') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (VIEW_PATHS[idx]) navigate(VIEW_PATHS[idx]);
      }
      if (mod && e.key === 'k') { e.preventDefault(); setCmdOpen((prev) => !prev); }
      if (mod && e.key === 'b') { e.preventDefault(); setSidebarCollapsed((prev) => !prev); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const renderView = () => {
    switch (viewId) {
      case 'copilot': return <AiCopilotView />;
      case 'runway': return <View02RunwayLab />;
      case 'gst': return <View03GstShield />;
      case 'ageing': return <View04AgeingMatrix />;
      case 'benchmarks': return <View05Benchmarks />;
      case 'settings': return <View06Settings themeState={themeState} onThemeUpdate={handleThemeUpdate} />;
      default: return <View01DealWorkbench />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <CollapsibleSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((p) => !p)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopTelemetryBar activeView={viewId} themeState={themeState} onThemeUpdate={handleThemeUpdate} onToggleSidebar={() => setSidebarCollapsed((p) => !p)} />
        <main className="flex-1 overflow-y-auto" style={{ padding: 'var(--cell-padding, 20px)' }}>
          {renderView()}
        </main>
      </div>
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
};

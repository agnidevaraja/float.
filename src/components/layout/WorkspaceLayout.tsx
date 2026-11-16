import React, { useEffect, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { THEME_PRESETS, FONT_PAIRINGS, FONT_FAMILY_OPTIONS, DENSITY_PADDING, loadThemeState, saveThemeState, type ThemeState } from '../../store/themeStore';
import { CollapsibleSidebar } from './CollapsibleSidebar';
import { TopTelemetryBar } from './TopTelemetryBar';
import { CommandPalette } from './CommandPalette';
import { ErrorBoundary } from '../common/ErrorBoundary';

// Code-split route views for sub-100ms lazy loading and optimal bundle efficiency
const View01DealWorkbench = lazy(() => import('../../views/View01DealWorkbench').then((m) => ({ default: m.View01DealWorkbench })));
const View02RunwayLab = lazy(() => import('../../views/View02RunwayLab').then((m) => ({ default: m.View02RunwayLab })));
const View03GstShield = lazy(() => import('../../views/View03GstShield').then((m) => ({ default: m.View03GstShield })));
const View04AgeingMatrix = lazy(() => import('../../views/View04AgeingMatrix').then((m) => ({ default: m.View04AgeingMatrix })));
const View05Benchmarks = lazy(() => import('../../views/View05Benchmarks').then((m) => ({ default: m.View05Benchmarks })));
const View06Settings = lazy(() => import('../../views/View06Settings').then((m) => ({ default: m.View06Settings })));
const View07BusinessPlanner = lazy(() => import('../../views/View07BusinessPlanner').then((m) => ({ default: m.View07BusinessPlanner })));
const AiCopilotView = lazy(() => import('../../views/AiCopilotView').then((m) => ({ default: m.AiCopilotView })));

const VIEW_PATHS = [
  '/workspace/deal',
  '/workspace/runway',
  '/workspace/ageing',
  '/workspace/gst',
  '/workspace/copilot',
  '/workspace/business-planner',
  '/workspace/settings',
  '/workspace/benchmarks',
];

const ViewSkeletonLoader: React.FC = () => (
  <div className="w-full h-full flex flex-col gap-4 animate-pulse">
    <div className="h-10 w-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center px-4">
      <div className="h-3 w-48 bg-[var(--bg-elevated)]" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-24 border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3">
          <div className="h-2 w-20 bg-[var(--bg-elevated)] mb-3" />
          <div className="h-6 w-32 bg-[var(--bg-elevated)]" />
        </div>
      ))}
    </div>
    <div className="flex-1 min-h-[300px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
      <div className="h-3 w-36 bg-[var(--bg-elevated)] mb-4" />
      <div className="h-56 w-full bg-[var(--bg-elevated)]/40 border border-[var(--border-hairline)]" />
    </div>
  </div>
);

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
    root.setAttribute('data-theme', themeState.theme);
    const tokens = THEME_PRESETS[themeState.theme];
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    root.style.setProperty('--accent-primary', themeState.customAccent || tokens['--accent-primary']);
    const fonts = FONT_PAIRINGS[themeState.fontPairing];
    const selectedFontOption =
      FONT_FAMILY_OPTIONS.find((f) => f.id === (themeState.fontFamily || 'inter')) ||
      FONT_FAMILY_OPTIONS[0];
    root.style.setProperty('--font-display', selectedFontOption.cssStack);
    root.style.setProperty('--font-sans', selectedFontOption.cssStack);
    root.style.setProperty('--font-mono', fonts.mono);
    root.style.setProperty('--cell-padding', `${DENSITY_PADDING[themeState.density]}px`);

    // WCAG AA Suite bindings
    if (themeState.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    if (themeState.highContrastBorders) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    root.style.fontSize =
      themeState.interfaceScale === '90%'
        ? '14.4px'
        : themeState.interfaceScale === '110%'
          ? '17.6px'
          : '16px';

    if (themeState.showTabularCharts) {
      root.setAttribute('data-tabular-charts', 'true');
    } else {
      root.removeAttribute('data-tabular-charts');
    }
  }, [themeState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key >= '1' && e.key <= '8') {
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
      case 'copilot':
      case 'chat':
        return <AiCopilotView />;
      case 'business-planner':
      case 'planner':
        return <View07BusinessPlanner />;
      case 'runway':
        return <View02RunwayLab />;
      case 'ageing':
        return <View04AgeingMatrix />;
      case 'gst':
      case 'gst-shield':
        return <View03GstShield />;
      case 'benchmarks':
        return <View05Benchmarks />;
      case 'settings':
        return <View06Settings themeState={themeState} onThemeUpdate={handleThemeUpdate} />;
      default:
        return <View01DealWorkbench />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <CollapsibleSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((p) => !p)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopTelemetryBar
          activeView={viewId}
          themeState={themeState}
          onThemeUpdate={handleThemeUpdate}
          onToggleSidebar={() => setSidebarCollapsed((p) => !p)}
          onOpenCmd={() => setCmdOpen(true)}
        />
        <main className="flex-1 overflow-y-auto" style={{ padding: 'var(--cell-padding, 20px)' }}>
          <ErrorBoundary>
            <Suspense fallback={<ViewSkeletonLoader />}>
              {renderView()}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <CommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        themeState={themeState}
        onThemeUpdate={handleThemeUpdate}
      />
    </div>
  );
};

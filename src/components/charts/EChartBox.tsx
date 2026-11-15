import React, { useRef, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  Maximize2,
  Minimize2,
  Table,
  Download,
  Sliders,
  Hash,
} from 'lucide-react';

export interface ResolvedChartTheme {
  bgCanvas: string;
  bgSurface: string;
  bgElevated: string;
  borderHairline: string;
  borderSubtle: string;
  textPrimary: string;
  textMuted: string;
  textTertiary: string;
  accentPrimary: string;
  accentSafe: string;
  accentWarn: string;
  accentDanger: string;
  accentInfo: string;
}

const DEFAULT_DARK_TOKENS: Record<string, string> = {
  '--bg-canvas': '#09090B',
  '--bg-surface': '#111113',
  '--bg-elevated': '#18181B',
  '--border-hairline': '#27272A',
  '--border-subtle': '#3F3F46',
  '--text-primary': '#FAFAFA',
  '--text-secondary': '#E4E4E7',
  '--text-muted': '#A1A1AA',
  '--text-tertiary': '#71717A',
  '--accent-primary': '#2563EB',
  '--accent-safe': '#10B981',
  '--accent-warn': '#F59E0B',
  '--accent-danger': '#EF4444',
  '--accent-info': '#38BDF8',
};

function getCssVar(varName: string): string {
  if (typeof window !== 'undefined') {
    const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (computed) return computed;
  }
  return DEFAULT_DARK_TOKENS[varName] || '#FAFAFA';
}

export function getChartTheme(): ResolvedChartTheme {
  return {
    bgCanvas: getCssVar('--bg-canvas'),
    bgSurface: getCssVar('--bg-surface'),
    bgElevated: getCssVar('--bg-elevated'),
    borderHairline: getCssVar('--border-hairline'),
    borderSubtle: getCssVar('--border-subtle'),
    textPrimary: getCssVar('--text-primary'),
    textMuted: getCssVar('--text-muted'),
    textTertiary: getCssVar('--text-tertiary'),
    accentPrimary: getCssVar('--accent-primary'),
    accentSafe: getCssVar('--accent-safe'),
    accentWarn: getCssVar('--accent-warn'),
    accentDanger: getCssVar('--accent-danger'),
    accentInfo: getCssVar('--accent-info'),
  };
}

function resolveColorString(val: string, theme: ResolvedChartTheme): string {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (trimmed.startsWith('var(')) {
    const varName = trimmed.replace(/^var\(\s*|\s*\)$/g, '').split(',')[0].trim();
    return getCssVar(varName);
  }
  const upper = trimmed.toUpperCase();
  // Automatically map legacy hard-coded dark-mode tokens to active theme variables
  switch (upper) {
    case '#FAFAFA':
    case '#F1F5F9':
    case '#E4E4E7':
    case '#EDEDED':
      return theme.textPrimary;
    case '#D4D4D8':
    case '#A1A1AA':
    case '#94A3B8':
      return theme.textMuted;
    case '#71717A':
    case '#52525B':
    case '#64748B':
      return theme.textTertiary;
    case '#3F3F46':
      return theme.borderSubtle;
    case '#27272A':
    case '#1F1F23':
    case '#222936':
      return theme.borderHairline;
    case '#18181B':
      return theme.bgElevated;
    case '#111113':
    case '#0F1217':
      return theme.bgSurface;
    case '#09090B':
    case '#090B0E':
      return theme.bgCanvas;
    default:
      return val;
  }
}

export function deepResolveColors(obj: any, theme: ResolvedChartTheme = getChartTheme()): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return resolveColorString(obj, theme);
  if (Array.isArray(obj)) return obj.map((item) => deepResolveColors(item, theme));
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      res[key] = deepResolveColors(obj[key], theme);
    }
    return res;
  }
  return obj;
}

interface EChartBoxProps {
  option: EChartsOption;
  height?: number | string;
  className?: string;
  title?: string;
  allowScale?: boolean;
}

export const EChartBox: React.FC<EChartBoxProps> = ({
  option,
  height = 340,
  className = '',
  title,
  allowScale = true,
}) => {
  const chartRef = useRef<ReactECharts>(null);
  const [showTabular, setShowTabular] = useState(false);
  const [showSliderZoom, setShowSliderZoom] = useState(false);
  const [showDirectNumbers, setShowDirectNumbers] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [themeRevision, setThemeRevision] = useState(0);

  // Height state allowing user to dynamically scale the graph anytime
  const initialHeightNum = typeof height === 'number' ? height : parseInt(String(height)) || 340;
  const [currentHeight, setCurrentHeight] = useState<number>(initialHeightNum);

  // Synchronize initial height if prop changes
  useEffect(() => {
    setCurrentHeight(typeof height === 'number' ? height : parseInt(String(height)) || 340);
  }, [height]);

  // Observe document root style/theme mutations so charts adapt immediately when switching OBSIDIAN / SLATE / LEDGER
  useEffect(() => {
    if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(() => {
      setThemeRevision((r) => r + 1);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const resolvedOption = useMemo<EChartsOption>(() => {
    const theme = getChartTheme();
    // 1. Deep resolve any CSS variables & dark-mode hex colors to active theme values
    const clean = deepResolveColors(option, theme);

    // 2. Base defaults for institutional contrast & visibility across dark and light modes
    const base: EChartsOption = {
      animation: false,
      backgroundColor: 'transparent',
      textStyle: {
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        color: theme.textMuted,
        fontSize: 11,
      },
      grid: {
        left: 30,
        right: 30,
        top: 30,
        bottom: showSliderZoom ? 65 : 30,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: theme.bgSurface,
        borderColor: theme.borderHairline,
        borderWidth: 1,
        padding: [8, 12],
        textStyle: {
          color: theme.textPrimary,
          fontSize: 11,
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: theme.borderSubtle,
            width: 1.5,
            type: 'dashed',
          },
        },
      },
    };

    // 3. Enable interactive wheel/drag zoom
    const dataZoom: any[] = [
      {
        type: 'inside',
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
      },
    ];

    if (showSliderZoom) {
      dataZoom.push({
        type: 'slider',
        bottom: 5,
        height: 20,
        borderColor: theme.borderHairline,
        backgroundColor: theme.bgElevated,
        fillerColor: 'rgba(37, 99, 235, 0.16)',
        handleStyle: { color: theme.accentPrimary, borderColor: theme.borderHairline },
        textStyle: { color: theme.textTertiary, fontFamily: 'monospace', fontSize: 9 },
      });
    }

    // 4. Merge clean options with base settings
    const cleanTooltip = clean.tooltip || {};
    const cleanGrid = clean.grid || {};
    const merged: any = {
      ...base,
      ...clean,
      animation: false,
      backgroundColor: 'transparent',
      grid: {
        ...base.grid,
        containLabel: true,
        ...cleanGrid,
        top: Math.max(42, cleanGrid.top || 42),
        bottom: showSliderZoom ? Math.max(65, (cleanGrid.bottom || 35) + 30) : Math.max(35, cleanGrid.bottom || 35),
      },
      dataZoom: clean.dataZoom ? [...clean.dataZoom, ...dataZoom] : dataZoom,
      tooltip: {
        ...base.tooltip,
        ...cleanTooltip,
        backgroundColor: theme.bgSurface,
        borderColor: theme.borderHairline,
        textStyle: {
          color: theme.textPrimary,
          fontSize: 11,
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
          ...(cleanTooltip.textStyle || {}),
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: theme.accentInfo,
            width: 1.5,
            type: 'dashed',
          },
          shadowStyle: {
            color: 'rgba(56, 189, 248, 0.08)',
          },
          ...(cleanTooltip.axisPointer || {}),
        },
      },
    };

    if (merged.legend) {
      const legends = Array.isArray(merged.legend) ? merged.legend : [merged.legend];
      const patchedLegends = legends.map((leg: any) => ({
        ...leg,
        textStyle: {
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          fontSize: 11,
          ...(leg.textStyle || {}),
          color: theme.textMuted,
        },
      }));
      merged.legend = Array.isArray(merged.legend) ? patchedLegends : patchedLegends[0];
    }

    // If axisPointer is set to shadow, ensure shadow does not darken lines
    if (merged.tooltip?.axisPointer?.type === 'shadow') {
      merged.tooltip.axisPointer.shadowStyle = {
        color: 'rgba(56, 189, 248, 0.08)',
      };
    }

    // 5. Ensure axis labels and grid lines have high contrast institutional readability
    const patchAxis = (ax: any) => {
      if (!ax) return ax;
      const axes = Array.isArray(ax) ? ax : [ax];
      return axes.map((a: any) => {
        return {
          ...a,
          axisLine: {
            ...(a.axisLine || {}),
            lineStyle: {
              ...(a.axisLine?.lineStyle || {}),
              color: theme.borderSubtle,
            },
          },
          splitLine: {
            ...(a.splitLine || {}),
            lineStyle: {
              type: [3, 3],
              ...(a.splitLine?.lineStyle || {}),
              color: theme.borderHairline,
            },
          },
          axisLabel: {
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
            fontSize: 10,
            ...(a.axisLabel || {}),
            color: a.axisLabel?.color || theme.textMuted,
          },
          nameTextStyle: a.nameTextStyle
            ? {
                ...a.nameTextStyle,
                color: theme.textTertiary,
              }
            : undefined,
        };
      });
    };

    if (merged.xAxis) {
      const patched = patchAxis(merged.xAxis);
      merged.xAxis = Array.isArray(merged.xAxis) ? patched : patched[0];
    }
    if (merged.yAxis) {
      const patched = patchAxis(merged.yAxis);
      merged.yAxis = Array.isArray(merged.yAxis) ? patched : patched[0];
    }

    // 6. Ensure series do NOT fade out or disappear on hover
    if (merged.series) {
      const seriesArr = Array.isArray(merged.series) ? merged.series : [merged.series];
      merged.series = seriesArr.map((s: any) => {
        const updated = { ...s };

        updated.emphasis = {
          ...(s.emphasis || {}),
          focus: 'none',
          scale: true,
          lineStyle: {
            width: Math.max(3, (s.lineStyle?.width || 2) + 1),
            opacity: 1,
          },
          itemStyle: { opacity: 1 },
        };

        updated.blur = {
          lineStyle: { opacity: 0.95 },
          itemStyle: { opacity: 0.95 },
        };

        if (showDirectNumbers && updated.label && typeof updated.label === 'object') {
          updated.label.show = true;
        } else if (!showDirectNumbers && updated.label && typeof updated.label === 'object') {
          updated.label.show = false;
        }

        return updated;
      });
    }

    return merged;
  }, [option, showSliderZoom, showDirectNumbers, themeRevision]);

  // Extract tabular preview for accessibility table
  const tableData = useMemo(() => {
    if (!showTabular) return null;
    const seriesList = (Array.isArray(option.series) ? option.series : [option.series]).filter(Boolean) as any[];
    if (seriesList.length === 0) return null;

    const xAxis = (Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis) as any;
    const categories: string[] = xAxis?.data || [];

    const headers = ['Data Point / Category', ...seriesList.map((s, idx) => s.name || `Series ${idx + 1}`)];
    const rowCount = Math.max(categories.length, ...seriesList.map((s) => (s.data ? s.data.length : 0)));
    const rows: (string | number)[][] = [];

    for (let i = 0; i < Math.min(rowCount, 40); i++) {
      const row: (string | number)[] = [categories[i] !== undefined ? categories[i] : `Point ${i + 1}`];
      for (const s of seriesList) {
        const val = s.data ? s.data[i] : undefined;
        if (typeof val === 'object' && val !== null && 'value' in val) {
          row.push(val.value);
        } else if (Array.isArray(val)) {
          row.push(val[1] !== undefined ? val[1] : val[0]);
        } else {
          row.push(val !== undefined ? val : '--');
        }
      }
      rows.push(row);
    }

    return { headers, rows };
  }, [option, showTabular]);

  // PNG Export Handler
  const handleExportPng = () => {
    if (!chartRef.current) return;
    try {
      const theme = getChartTheme();
      const instance = chartRef.current.getEchartsInstance();
      const base64 = instance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: theme.bgSurface,
      });
      const a = document.createElement('a');
      a.href = base64;
      a.download = `${(title || 'float_chart').toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.warn('PNG export failed', err);
    }
  };

  const chartElement = (
    <div
      style={{
        height: isFullscreen ? 'calc(100vh - 120px)' : `${currentHeight}px`,
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <ReactECharts
        ref={chartRef}
        option={resolvedOption}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
      />
    </div>
  );

  return (
    <>
      <div
        className={`border border-[var(--border-hairline)] bg-[var(--bg-surface)] rounded-xl overflow-hidden flex flex-col ${className}`}
      >
        {/* Chart Toolbar */}
        <div className="px-3.5 py-2 border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-xs font-sans text-[var(--text-muted)] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-[var(--text-primary)]">{title || 'Chart'}</span>
          </div>

          {allowScale && (
            <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto py-0.5">
              {/* Dynamic Height Presets & Free Scaling */}
              <div className="flex items-center border border-[var(--border-hairline)] bg-[var(--bg-surface)] rounded-lg overflow-hidden h-6 shrink-0 font-mono">
                <button
                  type="button"
                  title="Shrink Graph Height (-50px)"
                  onClick={() => setCurrentHeight((h) => Math.max(200, h - 50))}
                  className="px-1.5 h-full flex items-center justify-center text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors whitespace-nowrap rounded-none"
                >
                  -
                </button>
                <button
                  type="button"
                  title="Compact View (260px)"
                  onClick={() => setCurrentHeight(260)}
                  className={`px-1.5 h-full flex items-center justify-center text-[9px] border-l border-[var(--border-hairline)] transition-colors whitespace-nowrap rounded-none ${
                    currentHeight === 260
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  260
                </button>
                <button
                  type="button"
                  title="Standard View (360px)"
                  onClick={() => setCurrentHeight(360)}
                  className={`px-1.5 h-full flex items-center justify-center text-[9px] border-l border-r border-[var(--border-hairline)] transition-colors whitespace-nowrap rounded-none ${
                    currentHeight === 360
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  360
                </button>
                <button
                  type="button"
                  title="Expanded View (480px)"
                  onClick={() => setCurrentHeight(480)}
                  className={`px-1.5 h-full flex items-center justify-center text-[9px] border-r border-[var(--border-hairline)] transition-colors whitespace-nowrap rounded-none ${
                    currentHeight === 480
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  480
                </button>
                <button
                  type="button"
                  title="Deep Inspection (640px)"
                  onClick={() => setCurrentHeight(640)}
                  className={`px-1.5 h-full flex items-center justify-center text-[9px] border-r border-[var(--border-hairline)] transition-colors whitespace-nowrap rounded-none ${
                    currentHeight === 640
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  640
                </button>
                <button
                  type="button"
                  title="Enlarge Graph Height (+50px)"
                  onClick={() => setCurrentHeight((h) => Math.min(900, h + 50))}
                  className="px-1.5 h-full flex items-center justify-center text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors whitespace-nowrap rounded-none"
                >
                  +
                </button>
              </div>

              {/* Toggle Direct Numbers */}
              <button
                type="button"
                onClick={() => setShowDirectNumbers(!showDirectNumbers)}
                title={showDirectNumbers ? 'Hide Direct Numbers' : 'Show Direct Numbers'}
                className={`h-6 px-2.5 rounded-lg border transition-all duration-150 flex items-center gap-1 shrink-0 whitespace-nowrap text-[10px] ${
                  showDirectNumbers
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-semibold'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Hash className="w-3 h-3 shrink-0" />
                <span className="whitespace-nowrap">{showDirectNumbers ? 'Values ON' : 'Values'}</span>
              </button>

              {/* Range Slider Toggle */}
              <button
                type="button"
                onClick={() => setShowSliderZoom(!showSliderZoom)}
                title="Toggle Range Zoom Slider"
                className={`h-6 px-2.5 rounded-lg border transition-all duration-150 flex items-center gap-1 shrink-0 whitespace-nowrap text-[10px] ${
                  showSliderZoom
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-semibold'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Sliders className="w-3 h-3 shrink-0" />
                <span className="whitespace-nowrap">Zoom</span>
              </button>

              {/* Accessible Tabular View Toggle */}
              <button
                type="button"
                onClick={() => setShowTabular(!showTabular)}
                title="Toggle Tabular Data"
                className={`h-6 px-2.5 rounded-lg border transition-all duration-150 flex items-center gap-1 shrink-0 whitespace-nowrap text-[10px] ${
                  showTabular
                    ? 'border-[var(--accent-safe)] bg-[var(--accent-safe)]/15 text-[var(--accent-safe)] font-semibold'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Table className="w-3 h-3 shrink-0" />
                <span className="whitespace-nowrap">Table</span>
              </button>

              {/* Export PNG */}
              <button
                type="button"
                onClick={handleExportPng}
                title="Export Chart Image (PNG)"
                className="h-6 px-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-150 shrink-0 flex items-center justify-center"
              >
                <Download className="w-3 h-3 shrink-0" />
              </button>

              {/* Fullscreen Expand */}
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                title="Expand Fullscreen"
                className="h-6 px-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-150 shrink-0 flex items-center justify-center"
              >
                <Maximize2 className="w-3 h-3 shrink-0" />
              </button>
            </div>
          )}
        </div>

        {/* Visual Chart Canvas */}
        {chartElement}

        {/* Accessible Table */}
        {showTabular && tableData && (
          <div className="border-t border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-3 max-h-56 overflow-y-auto">
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[var(--border-hairline)]">
              <span className="text-[9px] font-sans uppercase tracking-wider text-[var(--accent-primary)] font-semibold">
                Tabular Data Breakdown
              </span>
              <span className="text-[9px] font-mono text-[var(--text-tertiary)]">
                Showing {tableData.rows.length} rows
              </span>
            </div>
            <table
              className="w-full text-left border-collapse text-[10px] font-mono"
              tabIndex={0}
              aria-label="Visualized Chart Data Points"
            >
              <thead>
                <tr className="border-b border-[var(--border-hairline)] text-[var(--text-tertiary)] bg-[var(--bg-canvas)]">
                  {tableData.headers.map((h, i) => (
                    <th key={i} className="py-1 px-2.5 font-sans font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {tableData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[var(--bg-surface)]">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-1 px-2.5 tabular-nums text-[var(--text-primary)]">
                        {typeof cell === 'number' ? cell.toLocaleString('en-IN') : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fullscreen High-Resolution Inspection Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-[var(--bg-canvas)]/95 backdrop-blur-md flex flex-col p-6 overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hairline)] mb-4">
            <div>
              <div className="text-sm font-display font-bold text-[var(--text-primary)] uppercase">
                {title || 'Expanded Chart Inspection Mode'}
              </div>
              <div className="text-[10px] font-sans text-[var(--text-tertiary)] mt-0.5">
                Full-screen data visualization with mouse-wheel scaling and range navigation
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPng}
                className="px-3 py-1.5 rounded-lg text-xs font-sans font-medium border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export PNG
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-sans font-medium border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent-danger)] hover:text-[var(--accent-danger)] flex items-center gap-1.5"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Close Fullscreen
              </button>
            </div>
          </div>

          <div className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-4 flex items-center justify-center">
            {chartElement}
          </div>
        </div>
      )}
    </>
  );
};

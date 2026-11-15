import React, { useRef, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  Maximize2,
  Minimize2,
  Table,
  Download,
  ZoomIn,
  Sliders,
  Hash,
} from 'lucide-react';

const THEME_COLOR_MAP: Record<string, string> = {
  '--bg-canvas': '#09090B',
  '--bg-surface': '#111113',
  '--bg-elevated': '#18181B',
  '--border-hairline': '#27272A',
  '--border-subtle': '#3F3F46',
  '--text-primary': '#FAFAFA',
  '--text-secondary': '#E4E4E7',
  '--text-muted': '#A1A1AA',
  '--text-tertiary': '#71717A',
  '--accent-primary': '#3B82F6',
  '--accent-safe': '#10B981',
  '--accent-warn': '#F59E0B',
  '--accent-danger': '#EF4444',
  '--accent-info': '#06B6D4',
};

function resolveColorString(val: string): string {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (trimmed.startsWith('var(')) {
    const varName = trimmed.replace(/^var\(\s*|\s*\)$/g, '').split(',')[0].trim();
    if (typeof window !== 'undefined') {
      const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (computed && (computed.startsWith('#') || computed.startsWith('rgb'))) {
        return computed;
      }
    }
    return THEME_COLOR_MAP[varName] || '#FAFAFA';
  }
  return val;
}

export function deepResolveColors(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return resolveColorString(obj);
  if (Array.isArray(obj)) return obj.map(deepResolveColors);
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      res[key] = deepResolveColors(obj[key]);
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

  // Height state allowing user to dynamically scale the graph anytime
  const initialHeightNum = typeof height === 'number' ? height : parseInt(String(height)) || 340;
  const [currentHeight, setCurrentHeight] = useState<number>(initialHeightNum);

  // Synchronize initial height if prop changes
  useEffect(() => {
    setCurrentHeight(typeof height === 'number' ? height : parseInt(String(height)) || 340);
  }, [height]);

  const resolvedOption = useMemo<EChartsOption>(() => {
    // 1. Deep resolve any CSS variables to concrete HEX/RGB
    const clean = deepResolveColors(option);

    // 2. Base defaults for institutional contrast & visibility
    const base: EChartsOption = {
      animation: false,
      backgroundColor: 'transparent',
      textStyle: {
        fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
        color: '#A1A1AA',
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
        backgroundColor: '#111113',
        borderColor: '#27272A',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: {
          color: '#FAFAFA',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: '#52525B',
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
        borderColor: '#27272A',
        backgroundColor: '#111113',
        fillerColor: 'rgba(59, 130, 246, 0.2)',
        handleStyle: { color: '#3B82F6', borderColor: '#27272A' },
        textStyle: { color: '#71717A', fontFamily: 'monospace', fontSize: 9 },
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
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: '#38BDF8',
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
        const currentLabelColor = a.axisLabel?.color;
        const upgradedColor =
          !currentLabelColor ||
          currentLabelColor === '#71717A' ||
          currentLabelColor === '#52525B' ||
          currentLabelColor === '#3F3F46'
            ? '#D4D4D8'
            : currentLabelColor;

        return {
          ...a,
          axisLine: {
            lineStyle: { color: '#3F3F46' },
            ...(a.axisLine || {}),
          },
          splitLine: {
            ...(a.splitLine || {}),
            lineStyle: {
              color: '#27272A',
              type: [3, 3],
              ...(a.splitLine?.lineStyle || {}),
            },
          },
          axisLabel: {
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
            fontSize: 10,
            ...(a.axisLabel || {}),
            color: upgradedColor,
          },
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

        // Ensure lines stay fully visible when hovered
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

        // Explicitly set blur opacity to 0.95 so unhovered lines NEVER vanish
        updated.blur = {
          lineStyle: { opacity: 0.95 },
          itemStyle: { opacity: 0.95 },
        };

        // If direct numbers toggle is on, ensure labels are visible if configured
        if (showDirectNumbers && updated.label && typeof updated.label === 'object') {
          updated.label.show = true;
        } else if (!showDirectNumbers && updated.label && typeof updated.label === 'object') {
          updated.label.show = false;
        }

        return updated;
      });
    }

    return merged;
  }, [option, showSliderZoom, showDirectNumbers]);

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
      const instance = chartRef.current.getEchartsInstance();
      const base64 = instance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#09090B',
      });
      const a = document.createElement('a');
      a.href = base64;
      a.download = `${(title || 'veritas_chart').toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.png`;
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
        className={`border border-[#27272A] bg-[#111113] flex flex-col ${className}`}
        style={{ borderRadius: 0 }}
      >
        {/* Institutional Chart Toolbar */}
        <div className="px-3.5 py-2 border-b border-[#27272A] bg-[#18181B] text-[10px] font-mono uppercase tracking-wider text-[#A1A1AA] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#FAFAFA]">{title || 'Data Visualization'}</span>
            <span className="text-[9px] text-[#71717A] border border-[#27272A] px-1.5 py-0.2">
              Scale: {currentHeight}px
            </span>
          </div>

          {allowScale && (
            <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto py-0.5">
              {/* Dynamic Height Presets & Free Scaling */}
              <div className="flex items-center border border-[#27272A] bg-[#111113] h-6 shrink-0">
                <button
                  type="button"
                  title="Shrink Graph Height (-50px)"
                  onClick={() => setCurrentHeight((h) => Math.max(200, h - 50))}
                  className="px-1.5 h-full flex items-center justify-center text-[10px] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors whitespace-nowrap"
                >
                  -
                </button>
                <button
                  type="button"
                  title="Compact View (260px)"
                  onClick={() => setCurrentHeight(260)}
                  className={`px-1.5 h-full flex items-center justify-center text-[9px] border-l border-[#27272A] transition-colors whitespace-nowrap ${
                    currentHeight === 260
                      ? 'bg-[#27272A] text-[#FAFAFA] font-bold'
                      : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                  }`}
                >
                  260
                </button>
                <button
                  type="button"
                  title="Standard View (360px)"
                  onClick={() => setCurrentHeight(360)}
                  className={`px-1.5 h-full flex items-center justify-center text-[9px] border-l border-r border-[#27272A] transition-colors whitespace-nowrap ${
                    currentHeight === 360
                      ? 'bg-[#27272A] text-[#FAFAFA] font-bold'
                      : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                  }`}
                >
                  360
                </button>
                <button
                  type="button"
                  title="Expanded View (480px)"
                  onClick={() => setCurrentHeight(480)}
                  className={`px-1.5 h-full flex items-center justify-center text-[9px] border-r border-[#27272A] transition-colors whitespace-nowrap ${
                    currentHeight === 480
                      ? 'bg-[#27272A] text-[#FAFAFA] font-bold'
                      : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                  }`}
                >
                  480
                </button>
                <button
                  type="button"
                  title="Deep Inspection (640px)"
                  onClick={() => setCurrentHeight(640)}
                  className={`px-1.5 h-full flex items-center justify-center text-[9px] border-r border-[#27272A] transition-colors whitespace-nowrap ${
                    currentHeight === 640
                      ? 'bg-[#27272A] text-[#FAFAFA] font-bold'
                      : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                  }`}
                >
                  640
                </button>
                <button
                  type="button"
                  title="Enlarge Graph Height (+50px)"
                  onClick={() => setCurrentHeight((h) => Math.min(900, h + 50))}
                  className="px-1.5 h-full flex items-center justify-center text-[10px] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors whitespace-nowrap"
                >
                  +
                </button>
              </div>

              {/* Toggle Direct Numbers */}
              <button
                type="button"
                onClick={() => setShowDirectNumbers(!showDirectNumbers)}
                title={showDirectNumbers ? 'Hide Direct Numbers' : 'Show Direct Numbers'}
                className={`h-6 px-2 border transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap text-[10px] ${
                  showDirectNumbers
                    ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-[#3B82F6] font-bold'
                    : 'border-[#27272A] bg-[#111113] text-[#A1A1AA] hover:text-[#FAFAFA]'
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
                className={`h-6 px-2 border transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap text-[10px] ${
                  showSliderZoom
                    ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-[#3B82F6] font-bold'
                    : 'border-[#27272A] bg-[#111113] text-[#A1A1AA] hover:text-[#FAFAFA]'
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
                className={`h-6 px-2 border transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap text-[10px] ${
                  showTabular
                    ? 'border-[#10B981] bg-[#10B981]/15 text-[#10B981] font-bold'
                    : 'border-[#27272A] bg-[#111113] text-[#A1A1AA] hover:text-[#FAFAFA]'
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
                className="h-6 px-2 border border-[#27272A] bg-[#111113] text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors shrink-0 flex items-center justify-center"
              >
                <Download className="w-3 h-3 shrink-0" />
              </button>

              {/* Fullscreen Expand */}
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                title="Expand Fullscreen"
                className="h-6 px-2 border border-[#27272A] bg-[#111113] text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors shrink-0 flex items-center justify-center"
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
          <div className="border-t border-[#27272A] bg-[#18181B] p-3 max-h-56 overflow-y-auto">
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#27272A]">
              <span className="text-[9px] font-mono uppercase tracking-wider text-[#3B82F6] font-semibold">
                Tabular Data Breakdown
              </span>
              <span className="text-[9px] font-mono text-[#71717A]">
                Showing {tableData.rows.length} rows
              </span>
            </div>
            <table
              className="w-full text-left border-collapse text-[10px] font-mono"
              tabIndex={0}
              aria-label="Visualized Chart Data Points"
            >
              <thead>
                <tr className="border-b border-[#27272A] text-[#71717A] bg-[#09090B]">
                  {tableData.headers.map((h, i) => (
                    <th key={i} className="py-1 px-2.5 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {tableData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#111113]">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-1 px-2.5 tabular-nums text-[#FAFAFA]">
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
        <div className="fixed inset-0 z-50 bg-[#09090B]/95 backdrop-blur-md flex flex-col p-6 overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[#27272A] mb-4">
            <div>
              <div className="text-sm font-mono font-bold text-[#FAFAFA] uppercase">
                {title || 'Expanded Chart Inspection Mode'}
              </div>
              <div className="text-[10px] font-mono text-[#71717A] mt-0.5">
                Full-screen data visualization with mouse-wheel scaling and range navigation
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPng}
                className="px-3 py-1.5 text-xs font-mono border border-[#27272A] bg-[#18181B] text-[#FAFAFA] hover:border-[#3B82F6] flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export PNG
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1.5 text-xs font-mono border border-[#27272A] bg-[#18181B] text-[#FAFAFA] hover:border-[#EF4444] hover:text-[#EF4444] flex items-center gap-1.5"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Close Fullscreen
              </button>
            </div>
          </div>

          <div className="flex-1 bg-[#111113] border border-[#27272A] p-4 flex items-center justify-center">
            {chartElement}
          </div>
        </div>
      )}
    </>
  );
};

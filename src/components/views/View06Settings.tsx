import React, { useState } from 'react';
import { Plug, Palette, SlidersHorizontal, Save,  Server, Zap } from 'lucide-react';
import { THEME_PRESETS, ACCENT_PRESETS, FONT_PAIRINGS, DENSITY_PADDING, type ThemePreset, type FontPairing, type DensityMode } from '../../store/themeStore';

interface View06SettingsProps {
  input: any;
  onInputChange: (updated: Partial<any>) => void;
}

type TabId = 'api-bridge' | 'appearance' | 'defaults';

export const View06Settings: React.FC<View06SettingsProps> = ({ input, onInputChange }) => {
  const [activeTab, setActiveTab] = useState<TabId>('appearance');

  const applyTheme = (theme: ThemePreset) => {
    const root = document.documentElement;
    const preset = THEME_PRESETS[theme];
    Object.entries(preset).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    if (!document.querySelector('style[data-theme-accent]')) {
      const style = document.createElement('style');
      style.setAttribute('data-theme-accent', '');
      document.head.appendChild(style);
    }
    localStorage.setItem('veritas-theme', theme);
  };

  const applyAccent = (color: string) => {
    document.documentElement.style.setProperty('--accent-primary', color);
    localStorage.setItem('veritas-accent', color);
  };

  return (
    <div className="flex h-full">
      {/* Tab Rail */}
      <div className="w-48 border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] shrink-0">
        <div className="py-3 space-y-0.5">
          {[
            { id: 'api-bridge' as TabId, label: 'API Bridge', icon: Plug },
            { id: 'appearance' as TabId, label: 'Appearance', icon: Palette },
            { id: 'defaults' as TabId, label: 'Defaults', icon: SlidersHorizontal },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-2 px-4 py-2.5 text-left transition-colors border-l-2 ${
                  activeTab === tab.id
                    ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/60 text-[var(--accent-primary)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'api-bridge' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-4 block">
                API Bridge Configuration
              </span>
              <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 space-y-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
                    Engine Endpoint URL
                  </label>
                  <input
                    type="text"
                    defaultValue="http://localhost:8000/api/v2/evaluate"
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hairline)] py-2 px-3 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--border-subtle)] focus:outline-none"
                    placeholder="http://localhost:8000/api/v2/evaluate"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <button className="px-4 py-1.5 text-[10px] font-mono border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] transition-colors">
                    Ping
                  </button>
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                    Latency: <span className="text-[var(--accent-safe)]">--</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Code Snippets */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-2 block">
                Integration Snippets
              </span>
              <div className="space-y-3">
                <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                  <div className="flex items-center space-x-2 px-3 py-2 border-b border-[var(--border-hairline)]">
                    <Server className="w-3 h-3 text-[var(--text-tertiary)]" />
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">FastAPI (Python)</span>
                  </div>
                  <pre className="p-3 text-[10px] font-mono text-[var(--text-muted)] overflow-x-auto leading-relaxed">
{`@app.post("/api/v2/evaluate")
async def evaluate_risk(deal: DealInput):
    result = risk_engine.evaluate(deal.dict())
    return JSONResponse(result)`}
                  </pre>
                </div>
                <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                  <div className="flex items-center space-x-2 px-3 py-2 border-b border-[var(--border-hairline)]">
                    <Zap className="w-3 h-3 text-[var(--text-tertiary)]" />
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">Axum (Rust)</span>
                  </div>
                  <pre className="p-3 text-[10px] font-mono text-[var(--text-muted)] overflow-x-auto leading-relaxed">
{`async fn evaluate(
    Json(deal): Json<DealInput>,
) -> Json<RiskResult> {
    let result = risk_engine::evaluate(deal);
    Json(result)
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3 block">
                Theme Preset
              </span>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => applyTheme(theme)}
                    className="border border-[var(--border-hairline)] p-3 hover:border-[var(--border-subtle)] transition-colors"
                  >
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-primary)] block capitalize">
                      {theme}
                    </span>
                    <div className="flex mt-2 space-x-1">
                      {Object.values(THEME_PRESETS[theme]).slice(0, 4).map((c, i) => (
                        <span
                          key={i}
                          className="w-4 h-4 border border-[var(--border-hairline)]"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3 block">
                Accent Color
              </span>
              <div className="flex items-center space-x-2">
                {(Object.entries(ACCENT_PRESETS) as [ThemePreset, string][]).map(
                  ([theme, color]) => (
                    <button
                      key={theme}
                      onClick={() => applyAccent(color)}
                      className="w-8 h-8 border border-[var(--border-hairline)] hover:border-[var(--border-subtle)] transition-colors"
                      style={{ backgroundColor: color }}
                      title={theme}
                    />
                  )
                )}
                <input
                  type="color"
                  onChange={(e) => applyAccent(e.target.value)}
                  className="w-8 h-8 cursor-pointer bg-transparent border border-[var(--border-hairline)]"
                  title="Custom color"
                />
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3 block">
                Font Pairing
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(FONT_PAIRINGS) as FontPairing[]).map((fp) => (
                  <button
                    key={fp}
                    className="border border-[var(--border-hairline)] p-3 hover:border-[var(--border-subtle)] transition-colors text-left"
                    style={{ fontFamily: FONT_PAIRINGS[fp].ui }}
                  >
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block">
                      {fp}
                    </span>
                    <span className="text-[11px] text-[var(--text-primary)] mt-1 block">
                      {FONT_PAIRINGS[fp].display.split(',')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3 block">
                Density
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(DENSITY_PADDING) as DensityMode[]).map((d) => (
                  <button
                    key={d}
                    className="border border-[var(--border-hairline)] p-2.5 text-center hover:border-[var(--border-subtle)] transition-colors"
                  >
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                      {d}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)] block mt-0.5">
                      {DENSITY_PADDING[d]}px
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3 block">
                Display Options
              </span>
              <div className="space-y-2">
                <label className="flex items-center justify-between border border-[var(--border-hairline)] p-3">
                  <span className="text-[11px] text-[var(--text-muted)]">Show Crosshairs</span>
                  <input
                    type="checkbox"
                    className="accent-[var(--accent-primary)]"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'defaults' && (
          <div className="max-w-xl space-y-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-4 block">
              Default Values
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
                  Default Bank Balance
                </label>
                <input
                  type="number"
                  value={input.currentBankBalance ?? 250000}
                  onChange={(e) => onInputChange({ currentBankBalance: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hairline)] py-2 px-3 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--border-subtle)] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
                  Monthly Burn
                </label>
                <input
                  type="number"
                  value={input.monthlyFixedExpenses ?? 160000}
                  onChange={(e) => onInputChange({ monthlyFixedExpenses: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hairline)] py-2 px-3 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--border-subtle)] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
                  OD Limit
                </label>
                <input
                  type="number"
                  defaultValue={100000}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hairline)] py-2 px-3 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--border-subtle)] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
                  Default GST Slab
                </label>
                <div className="flex items-center space-x-1">
                  {[5, 12, 18, 28].map((s) => (
                    <button
                      key={s}
                      className={`flex-1 py-2 text-[10px] font-mono border transition-colors ${
                        s === 18
                          ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)]/40 text-[var(--accent-primary)]'
                          : 'border-[var(--border-hairline)] text-[var(--text-muted)]'
                      }`}
                    >
                      {s}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-hairline)]">
              <button className="flex items-center space-x-2 px-4 py-2 bg-[var(--accent-primary)] text-[var(--bg-surface)] text-[10px] font-mono uppercase tracking-wider">
                <Save className="w-3 h-3" />
                <span>Save Defaults</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

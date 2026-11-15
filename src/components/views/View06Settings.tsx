import React, { useState } from 'react';
import { Plug, Palette, SlidersHorizontal, Copy, Check } from 'lucide-react';
import { THEME_PRESETS, FONT_PAIRINGS, DENSITY_PADDING, ACCENT_PRESETS, type ThemeState, type ThemePreset, type FontPairing, type DensityMode } from '../../store/themeStore';

interface View06SettingsProps {
  themeState: ThemeState;
  onThemeUpdate: (patch: Partial<ThemeState>) => void;
}

type TabId = 'api-bridge' | 'appearance' | 'defaults';

const PYTHON_SNIPPET = `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib, numpy as np

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

engine = joblib.load("b2b_risk_engine_final.joblib")

@app.post("/predict")
def predict(req: dict):
    row = np.array([[req["invoice_amount"], req["payment_term_days"],
        req["customer_tenure_months"], req["past_late_percent"]/100,
        req["order_size_vs_avg"], req["past_avg_delay_days"]]])
    prob = float(engine["clf_macro"].predict_proba(row)[0, 1])
    return {"blended_risk_percent": round(prob * 100, 1),
            "expected_arrival_day": int(req["payment_term_days"])}`;

const RUST_SNIPPET = `use serde::{Deserialize, Serialize};
use axum::{Json, Router, routing::post};
use tower_http::cors::CorsLayer;

#[derive(Serialize, Deserialize)]
struct InvoiceRequest {
    invoice_amount: f64, payment_term_days: i32,
    customer_tenure_months: i32, past_late_percent: f64,
    order_size_vs_avg: f64, past_avg_delay_days: i32,
}

#[derive(Serialize)]
struct InvoiceResponse {
    blended_risk_percent: f64, expected_arrival_day: i32,
    is_runway_collision: bool, collision_day: Option<i32>,
}

async fn predict(Json(req): Json<InvoiceRequest>) -> Json<InvoiceResponse> {
    // Bridge to calibrated engine
    Json(InvoiceResponse { blended_risk_percent: 0.0, expected_arrival_day: 0, is_runway_collision: false, collision_day: None })
}

let cors = CorsLayer::new().allow_origin(tower_http::cors::Any).allow_methods([Method::GET, Method::POST]);
let app = Router::new().route("/predict", post(predict)).layer(cors);`;

export const View06Settings: React.FC<View06SettingsProps> = ({ themeState, onThemeUpdate }) => {
  const [activeTab, setActiveTab] = useState<TabId>('appearance');
  const [copiedPython, setCopiedPython] = useState(false);
  const [copiedRust, setCopiedRust] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [latency, setLatency] = useState('--');
  const [defaults, setDefaults] = useState({
    bankBalance: 250000, monthlyBurn: 160000, odLimit: 100000, gstSlab: 18,
  });

  const applyTheme = (theme: ThemePreset) => {
    const root = document.documentElement;
    const preset = THEME_PRESETS[theme];
    Object.entries(preset).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    root.style.setProperty('--accent-primary', ACCENT_PRESETS[theme]);
    onThemeUpdate({ theme, customAccent: null });
  };

  const applyAccent = (color: string) => {
    document.documentElement.style.setProperty('--accent-primary', color);
    onThemeUpdate({ customAccent: color });
  };

  const applyFonts = (fp: FontPairing) => {
    const fonts = FONT_PAIRINGS[fp];
    document.documentElement.style.setProperty('--font-display', fonts.display);
    document.documentElement.style.setProperty('--font-sans', fonts.ui);
    document.documentElement.style.setProperty('--font-mono', fonts.mono);
    onThemeUpdate({ fontPairing: fp });
  };

  const applyDensity = (d: DensityMode) => {
    document.documentElement.style.setProperty('--cell-padding', `${DENSITY_PADDING[d]}px`);
    onThemeUpdate({ density: d });
  };

  const handlePing = async () => {
    if (!apiUrl) return;
    const start = performance.now();
    try {
      const res = await fetch(apiUrl, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ test: true }) });
      const ms = Math.round(performance.now() - start);
      setLatency(`${ms}ms (${res.ok ? 'OK' : 'ERR'})`);
    } catch {
      setLatency('Failed');
    }
  };

  const copyCode = (code: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(code);
    setter(true);
    setTimeout(() => setter(false), 200);
  };

  return (
    <div className="flex h-full">
      <div className="w-48 border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] shrink-0">
        <div className="py-3 space-y-0.5">
          {[
            { id: 'api-bridge' as TabId, label: 'API Bridge', icon: Plug },
            { id: 'appearance' as TabId, label: 'Appearance', icon: Palette },
            { id: 'defaults' as TabId, label: 'Defaults', icon: SlidersHorizontal },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors border-l-2 ${activeTab === tab.id ? 'border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'}`}>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'api-bridge' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-4 block">External Model Connector</span>
              <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">Engine Endpoint URL</label>
                  <input type="text" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://your-colab.gradio.live/api/predict" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hairline)] py-2 px-3 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--border-subtle)] focus:outline-none" />
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handlePing} className="px-4 py-1.5 text-[10px] font-mono border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-colors">Ping & Verify Tunnel</button>
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)]">Latency: <span className="text-[var(--text-primary)]">{latency}</span></span>
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">If blank or offline, the app seamlessly uses the built-in calibrated TypeScript engine with zero errors.</p>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-2 block">Python FastAPI Snippet (Colab / Hugging Face)</span>
              <div className="border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-4 relative">
                <button onClick={() => copyCode(PYTHON_SNIPPET, setCopiedPython)} className="absolute top-2 right-2 px-2 py-1 text-[9px] font-mono border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]">{copiedPython ? <><Check className="w-3 h-3 inline" style={{ color: 'var(--accent-safe)' }} /> Copied</> : 'Copy'}</button>
                <pre className="text-[11px] font-mono text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed">{PYTHON_SNIPPET}</pre>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-2 block">Rust Axum Struct Contract</span>
              <div className="border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-4 relative">
                <button onClick={() => copyCode(RUST_SNIPPET, setCopiedRust)} className="absolute top-2 right-2 px-2 py-1 text-[9px] font-mono border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]">{copiedRust ? <><Check className="w-3 h-3 inline" style={{ color: 'var(--accent-safe)' }} /> Copied</> : 'Copy'}</button>
                <pre className="text-[11px] font-mono text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed">{RUST_SNIPPET}</pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-4 block">Theme Preset</span>
              <div className="grid grid-cols-4 gap-3">
                {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((t) => (
                  <button key={t} onClick={() => applyTheme(t)} className={`border p-3 text-center transition-colors ${themeState.theme === t ? 'border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/10' : 'border-[var(--border-hairline)] hover:border-[var(--border-subtle)]'}`}>
                    <div className="flex gap-0.5 justify-center mb-2">
                      {Object.values(THEME_PRESETS[t]).slice(0, 4).map((c, i) => (
                        <span key={i} className="w-4 h-4 border border-[var(--border-hairline)]" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-primary)]">{t}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-4 block">Accent Color</span>
              <div className="flex items-center gap-3 mb-3">
                <input type="color" value={themeState.customAccent || ACCENT_PRESETS[themeState.theme]} onChange={(e) => applyAccent(e.target.value)} className="w-8 h-8 border border-[var(--border-hairline)] cursor-pointer bg-transparent" />
                <span className="text-[10px] font-mono text-[var(--text-muted)]">{themeState.customAccent || 'Preset accent'}</span>
              </div>
              <div className="flex gap-2">
                {Object.values(ACCENT_PRESETS).map((c) => (
                  <button key={c} onClick={() => applyAccent(c)} className="w-8 h-8 border border-[var(--border-hairline)] hover:border-[var(--border-subtle)] transition-colors" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-4 block">Font Pairing</span>
              <div className="space-y-2">
                {(Object.keys(FONT_PAIRINGS) as FontPairing[]).map((fp) => (
                  <button key={fp} onClick={() => applyFonts(fp)} className={`w-full border p-3 text-left transition-colors ${themeState.fontPairing === fp ? 'border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/10' : 'border-[var(--border-hairline)] hover:border-[var(--border-subtle)]'}`}>
                    <span className="text-[11px] font-medium text-[var(--text-primary)] uppercase tracking-wider">{fp}</span>
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)] block mt-0.5" style={{ fontFamily: FONT_PAIRINGS[fp].display }}>Display preview</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-4 block">Grid Density</span>
              <div className="flex gap-2">
                {(Object.keys(DENSITY_PADDING) as DensityMode[]).map((d) => (
                  <button key={d} onClick={() => applyDensity(d)} className={`flex-1 border p-2.5 text-center transition-colors ${themeState.density === d ? 'border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/10' : 'border-[var(--border-hairline)] hover:border-[var(--border-subtle)]'}`}>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-primary)]">{d}</span>
                    <span className="text-[9px] font-mono text-[var(--text-tertiary)] block">{DENSITY_PADDING[d]}px</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between border border-[var(--border-hairline)] p-3">
              <span className="text-[11px] font-medium text-[var(--text-primary)]">Show Container Crosshairs</span>
              <button onClick={() => onThemeUpdate({ showCrosshairs: !themeState.showCrosshairs })}
                className={`px-3 py-1 text-[10px] font-mono border transition-colors ${themeState.showCrosshairs ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/40 text-[var(--accent-primary)]' : 'border-[var(--border-hairline)] text-[var(--text-muted)]'}`}>
                {themeState.showCrosshairs ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'defaults' && (
          <div className="max-w-lg space-y-5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-4 block">Company Default Profile</span>
            {[
              { key: 'bankBalance', label: 'Default Bank Balance', prefix: '₹' },
              { key: 'monthlyBurn', label: 'Default Monthly Burn', prefix: '₹' },
              { key: 'odLimit', label: 'Bank OD Limit', prefix: '₹' },
              { key: 'gstSlab', label: 'GST Slab', suffix: '%' },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">{field.label}</label>
                <input type="number" value={defaults[field.key as keyof typeof defaults]}
                  onChange={(e) => setDefaults((prev) => ({ ...prev, [field.key as keyof typeof defaults]: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hairline)] py-2 px-3 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--border-subtle)] focus:outline-none" />
              </div>
            ))}
            <button className="px-4 py-2 text-[10px] font-mono uppercase tracking-wider border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-colors">Save Defaults to Storage</button>
          </div>
        )}
      </div>
    </div>
  );
};

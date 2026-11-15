import React, { useState } from 'react';
import {
  Building2,
  Plug,
  SlidersHorizontal,
  Eye,
  Palette,
  Check,
  Copy,
  Activity,
  AlertTriangle,
  ShieldCheck,
  FileCode,
  Download,
  Terminal,
  ExternalLink,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import {
  THEME_PRESETS,
  THEME_LABELS,
  FONT_PAIRING_LABELS,
  ACCENT_PRESETS,
  type ThemeState,
  type ThemePreset,
  type FontPairing,
  type DensityMode,
  type InterfaceScale,
} from '../../store/themeStore';
import { useWorkspace, DEFAULT_ENTERPRISE_PROFILE } from '../../store/workspaceStore';
import {
  loadApiConfig,
  saveApiConfig,
  probeModelBridge,
  getBaseUrl,
  type ApiConfig,
  type BridgeProbeResult,
} from '../../services/inferenceBridge';
import type { TreasuryDefaults, EnterpriseProfile } from '../../types/engineContract';

interface View06SettingsProps {
  themeState: ThemeState;
  onThemeUpdate: (patch: Partial<ThemeState>) => void;
}

type SettingsSection = 'profile' | 'bridge' | 'treasury' | 'accessibility' | 'appearance';

const JSON_REQUEST_SCHEMA = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "InvoiceDecisionRequest",
  "type": "object",
  "properties": {
    "invoice_amount": { "type": "number", "minimum": 1 },
    "payment_term_days": { "type": "integer", "minimum": 1 },
    "customer_tenure_months": { "type": "integer", "minimum": 0 },
    "past_late_percent": { "type": "number", "minimum": 0, "maximum": 100 },
    "order_size_vs_avg": { "type": "number", "minimum": 0 },
    "past_avg_delay_days": { "type": "number", "minimum": 0 },
    "due_weekday": { "type": "string", "enum": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
    "macro_stress_multiplier": { "type": "number", "default": 1.0 },
    "gst_registered": { "type": "boolean", "default": true },
    "current_bank_balance": { "type": "number", "minimum": 0 },
    "monthly_fixed_expenses": { "type": "number", "minimum": 0 }
  },
  "required": ["invoice_amount", "payment_term_days", "current_bank_balance", "monthly_fixed_expenses"]
}`;

const JSON_RESPONSE_SCHEMA = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "EnsembleDecisionResponse",
  "type": "object",
  "properties": {
    "blended_risk_percent": { "type": "number", "minimum": 0, "maximum": 100 },
    "b2b_macro_risk_percent": { "type": "number" },
    "credit_default_risk_percent": { "type": "number" },
    "fraud_spike_risk_percent": { "type": "number" },
    "expected_arrival_day": { "type": "integer" },
    "arrival_window_low": { "type": "integer" },
    "arrival_window_high": { "type": "integer" },
    "is_runway_collision": { "type": "boolean" },
    "collision_day": { "type": ["integer", "null"] },
    "provenance": { "type": "string", "enum": ["LOCAL_ENGINE", "LIVE_COLAB", "LIVE_AXUM"] }
  },
  "required": ["blended_risk_percent", "expected_arrival_day", "arrival_window_low", "arrival_window_high"]
}`;

const COLAB_BOOTSTRAP_CODE = `# 1. Install dependencies
!pip install -q fastapi uvicorn pyngrok pydantic lightgbm shap networkx numpy scipy

# 2. Run the Veritas Super-Model Server
import urllib.request
url = "https://raw.githubusercontent.com/veritas-ai/core/main/veritas_colab_kernel.py"
# Alternatively copy-paste the full veritas_colab_kernel.py script into this cell and execute!`;

export const View06Settings: React.FC<View06SettingsProps> = ({ themeState, onThemeUpdate }) => {
  const { state, dispatch } = useWorkspace();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  // Section 01: Enterprise Profile State
  const [enterpriseProfile, setEnterpriseProfileState] = useState<EnterpriseProfile>(
    () => state.enterpriseProfile || DEFAULT_ENTERPRISE_PROFILE
  );
  const [profileSavedToast, setProfileSavedToast] = useState<boolean>(false);

  // Section 02: API Bridge State
  const [apiConfig, setApiConfigState] = useState<ApiConfig>(() => loadApiConfig());
  const [probeResult, setProbeResult] = useState<BridgeProbeResult | null>(null);
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [schemaTab, setSchemaTab] = useState<'request' | 'response' | 'colab'>('colab');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [bridgeSavedToast, setBridgeSavedToast] = useState<boolean>(false);

  // Section 03: Treasury Defaults State
  const [treasuryDefaults, setTreasuryDefaults] = useState<TreasuryDefaults>(
    () => state.treasuryDefaults
  );
  const [treasurySavedToast, setTreasurySavedToast] = useState<boolean>(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSaveEnterpriseProfile = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_ENTERPRISE_PROFILE', payload: enterpriseProfile });
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 2500);
  };

  const handleLoadBenchmarkPreset = () => {
    setEnterpriseProfileState(DEFAULT_ENTERPRISE_PROFILE);
    dispatch({ type: 'SET_ENTERPRISE_PROFILE', payload: DEFAULT_ENTERPRISE_PROFILE });
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 2500);
  };

  const handleDownloadProfileJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(enterpriseProfile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${enterpriseProfile.tradingBrandName || 'enterprise'}_profile.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleSaveBridgeConfig = () => {
    const cleaned = getBaseUrl(apiConfig.endpointUrl);
    const updated = { ...apiConfig, endpointUrl: cleaned || apiConfig.endpointUrl.trim() };
    setApiConfigState(updated);
    saveApiConfig(updated);
    setBridgeSavedToast(true);
    setTimeout(() => setBridgeSavedToast(false), 2500);
  };

  const handleTestProbe = async () => {
    setIsProbing(true);
    setProbeResult(null);
    try {
      const result = await probeModelBridge(apiConfig);
      setProbeResult(result);
    } catch (err: any) {
      setProbeResult({
        success: false,
        latencyMs: 0,
        schemaValid: false,
        message: err.message || 'Probe failed unexpectedly',
        fieldsValidated: [],
      });
    } finally {
      setIsProbing(false);
    }
  };

  const handleSaveTreasuryDefaults = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_DEFAULTS', payload: treasuryDefaults });
    setTreasurySavedToast(true);
    setTimeout(() => setTreasurySavedToast(false), 2500);
  };

  const handleResetTreasuryToBaseline = () => {
    const baseline: TreasuryDefaults = {
      currentBankBalance: 250000,
      monthlyFixedExpenses: 160000,
      bankOverdraftLimit: 100000,
      gstRegistered: true,
      gstSlab: 18,
      defaultSupplyType: 'INTRA_STATE',
    };
    setTreasuryDefaults(baseline);
    dispatch({ type: 'SET_DEFAULTS', payload: baseline });
    setTreasurySavedToast(true);
    setTimeout(() => setTreasurySavedToast(false), 2500);
  };

  const toggleReducedMotion = () => {
    onThemeUpdate({ reducedMotion: !themeState.reducedMotion });
  };

  const toggleHighContrast = () => {
    onThemeUpdate({ highContrastBorders: !themeState.highContrastBorders });
  };

  const setScale = (scale: InterfaceScale) => {
    onThemeUpdate({ interfaceScale: scale });
  };

  const toggleTabularCharts = () => {
    onThemeUpdate({ showTabularCharts: !themeState.showTabularCharts });
  };

  const handleSelectTheme = (theme: ThemePreset) => {
    onThemeUpdate({ theme, customAccent: null });
  };

  const handleSelectFontPairing = (fontPairing: FontPairing) => {
    onThemeUpdate({ fontPairing });
  };

  const handleSelectDensity = (density: DensityMode) => {
    onThemeUpdate({ density });
  };

  const handleCustomAccent = (hex: string) => {
    onThemeUpdate({ customAccent: hex });
  };

  const toggleCrosshairs = () => {
    onThemeUpdate({ showCrosshairs: !themeState.showCrosshairs });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Top Banner / Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
        <div>
          <h1 className="text-xl font-bold font-sans text-[var(--text-primary)]">
            Enterprise Settings &amp; Infrastructure Studio
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            Manage your Enterprise Identity profile, Google Colab Super-Model bridge, statutory limits, and accessibility.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono text-[var(--accent-safe)] border border-[var(--border-hairline)] px-2 py-1 bg-[var(--bg-elevated)]">
            WCAG 2.1 AA Compliant
          </span>
        </div>
      </div>

      {/* 5-Section Nav Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {[
          { id: 'profile' as SettingsSection, num: '01', title: 'Enterprise Profile', desc: 'Business Details & Identity', icon: Building2 },
          { id: 'bridge' as SettingsSection, num: '02', title: 'Live Model Bridge', desc: 'Google Colab / FastAPI Kernel', icon: Plug },
          { id: 'treasury' as SettingsSection, num: '03', title: 'Treasury & Tax', desc: 'Working Capital & GST Baseline', icon: SlidersHorizontal },
          { id: 'accessibility' as SettingsSection, num: '04', title: 'Accessibility Suite', desc: 'WCAG AA, Motion & Scale', icon: Eye },
          { id: 'appearance' as SettingsSection, num: '05', title: 'Appearance & Studio', desc: 'Themes & Typographic Systems', icon: Palette },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`p-3 text-left border transition-colors relative ${
                isActive
                  ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)]" />
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[var(--accent-primary)] font-semibold">
                  SECTION {tab.num}
                </span>
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'}`} />
              </div>
              <div className="text-xs font-bold text-[var(--text-primary)] mt-1">{tab.title}</div>
              <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5 truncate">{tab.desc}</div>
            </button>
          );
        })}
      </div>

      {/* SECTION 01: ENTERPRISE BUSINESS PROFILE & TREASURY IDENTITY */}
      {activeSection === 'profile' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Enterprise Details Form (7 cols) */}
            <form onSubmit={handleSaveEnterpriseProfile} className="lg:col-span-7 border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-mono flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    <span>Enterprise Identity &amp; Statutory Profile</span>
                  </h2>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                    Context injected directly into AI Copilot, Statutory Recovery Notices &amp; Bank Limit Models.
                  </p>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={handleLoadBenchmarkPreset}
                    className="px-2 py-1 text-[10px] font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                    title="Load benchmark industrial manufacturing profile"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Preset</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadProfileJson}
                    className="px-2 py-1 text-[10px] font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                    title="Export enterprise profile as JSON"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* Legal Entity & Trading Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Registered Legal Entity Name
                  </label>
                  <input
                    type="text"
                    required
                    value={enterpriseProfile.companyName}
                    onChange={(e) => setEnterpriseProfileState((p) => ({ ...p, companyName: e.target.value }))}
                    placeholder="Apex Precision Engineering Pvt Ltd"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Trading Brand / Short Name
                  </label>
                  <input
                    type="text"
                    required
                    value={enterpriseProfile.tradingBrandName}
                    onChange={(e) => setEnterpriseProfileState((p) => ({ ...p, tradingBrandName: e.target.value }))}
                    placeholder="Apex Precision"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              {/* Constitution & MSME Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Business Constitution
                  </label>
                  <select
                    value={enterpriseProfile.constitution}
                    onChange={(e) => setEnterpriseProfileState((p) => ({ ...p, constitution: e.target.value as any }))}
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  >
                    <option value="PRIVATE_LIMITED">Private Limited Company (Pvt Ltd)</option>
                    <option value="PROPRIETORSHIP">Sole Proprietorship</option>
                    <option value="PARTNERSHIP">Partnership Firm</option>
                    <option value="LLP">Limited Liability Partnership (LLP)</option>
                    <option value="PUBLIC_LIMITED">Public Limited Company</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    MSME Category (MSMED Act 2006)
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['MICRO', 'SMALL', 'MEDIUM'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setEnterpriseProfileState((p) => ({ ...p, msmeCategory: cat }))}
                        className={`py-1.5 text-[10px] font-mono uppercase border transition-colors ${
                          enterpriseProfile.msmeCategory === cat
                            ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)] text-[var(--accent-primary)] font-bold'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-tertiary)]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <span className="text-[9px] font-mono text-[var(--accent-safe)] mt-1 block">
                    {enterpriseProfile.msmeCategory === 'MEDIUM'
                      ? 'Note: Section 43B(h) mandates 45-day payment for Micro & Small only.'
                      : 'Qualifies for 45-day payment mandate under Sec 43B(h).'}
                  </span>
                </div>
              </div>

              {/* Statutory Registrations: Udyam, GSTIN, PAN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Udyam Reg. No.
                  </label>
                  <input
                    type="text"
                    value={enterpriseProfile.udyamRegistrationNumber}
                    onChange={(e) => setEnterpriseProfileState((p) => ({ ...p, udyamRegistrationNumber: e.target.value }))}
                    placeholder="UDYAM-MH-12-0049210"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Company GSTIN
                  </label>
                  <input
                    type="text"
                    value={enterpriseProfile.gstin}
                    onChange={(e) => setEnterpriseProfileState((p) => ({ ...p, gstin: e.target.value }))}
                    placeholder="27AAACE4812L1ZP"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Company PAN
                  </label>
                  <input
                    type="text"
                    value={enterpriseProfile.pan}
                    onChange={(e) => setEnterpriseProfileState((p) => ({ ...p, pan: e.target.value }))}
                    placeholder="AAACE4812L"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] uppercase"
                  />
                </div>
              </div>

              {/* Sector & Operating Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Industry Sector &amp; Subsector
                  </label>
                  <input
                    type="text"
                    value={enterpriseProfile.industrySector}
                    onChange={(e) => setEnterpriseProfileState((p) => ({ ...p, industrySector: e.target.value }))}
                    placeholder="Precision CNC Machining & Assemblies"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Operating Hub / Industrial Area
                  </label>
                  <input
                    type="text"
                    value={enterpriseProfile.operatingLocation}
                    onChange={(e) => setEnterpriseProfileState((p) => ({ ...p, operatingLocation: e.target.value }))}
                    placeholder="MIDC Bhosari, Pune, Maharashtra"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              {/* Financial Scale & Banking Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--border-hairline)]">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Annual Turnover (INR)
                  </label>
                  <input
                    type="number"
                    min="100000"
                    step="500000"
                    value={enterpriseProfile.annualTurnover}
                    onChange={(e) => setEnterpriseProfileState((p) => ({ ...p, annualTurnover: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] text-right"
                  />
                  <span className="text-[9px] font-mono text-[var(--text-tertiary)] mt-0.5 block text-right">
                    ₹{(enterpriseProfile.annualTurnover / 10000000).toFixed(2)} Cr
                  </span>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Sanctioned CC / OD Limit (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100000"
                    value={enterpriseProfile.sanctionedCcLimit}
                    onChange={(e) => setEnterpriseProfileState((p) => ({ ...p, sanctionedCcLimit: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] text-right"
                  />
                  <span className="text-[9px] font-mono text-[var(--text-tertiary)] mt-0.5 block text-right">
                    ₹{(enterpriseProfile.sanctionedCcLimit / 100000).toFixed(1)} Lakhs
                  </span>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Bank OD Interest Rate (% p.a.)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="30"
                    step="0.25"
                    value={enterpriseProfile.bankOdInterestRate}
                    onChange={(e) => setEnterpriseProfileState((p) => ({ ...p, bankOdInterestRate: parseFloat(e.target.value) || 11.5 }))}
                    className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] text-right"
                  />
                  <span className="text-[9px] font-mono text-[var(--text-tertiary)] mt-0.5 block text-right">
                    {(enterpriseProfile.bankOdInterestRate / 12).toFixed(3)}% / mo
                  </span>
                </div>
              </div>

              {/* Margins, Payroll, Rent */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Typical Gross Margin (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="80"
                    step="0.5"
                    value={enterpriseProfile.typicalGrossMarginPercent}
                    onChange={(e) => setEnterpriseProfileState((p) => ({ ...p, typicalGrossMarginPercent: parseFloat(e.target.value) || 18 }))}
                    className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] text-right"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Monthly Payroll Burn (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={enterpriseProfile.monthlyPayrollBurn}
                    onChange={(e) => setEnterpriseProfileState((p) => ({ ...p, monthlyPayrollBurn: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] text-right"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Monthly Rent &amp; Utilities (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={enterpriseProfile.monthlyRentAndUtilities}
                    onChange={(e) => setEnterpriseProfileState((p) => ({ ...p, monthlyRentAndUtilities: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] text-right"
                  />
                </div>
              </div>

              {/* Primary Bank & Products */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Primary Working Capital Bank
                  </label>
                  <input
                    type="text"
                    value={enterpriseProfile.primaryBank}
                    onChange={(e) => setEnterpriseProfileState((p) => ({ ...p, primaryBank: e.target.value }))}
                    placeholder="HDFC Bank Ltd, Industrial Finance Branch"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Primary Customer Market
                  </label>
                  <input
                    type="text"
                    value={enterpriseProfile.primaryCustomerSegment}
                    onChange={(e) => setEnterpriseProfileState((p) => ({ ...p, primaryCustomerSegment: e.target.value }))}
                    placeholder="Tier-1 Auto OEMs & Defense Contractors"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 border-t border-[var(--border-hairline)] flex items-center justify-between">
                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                  Persisted to browser storage &amp; injected into AI Copilot reasoning.
                </span>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-mono font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity flex items-center space-x-1.5"
                >
                  {profileSavedToast ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Enterprise Profile Saved</span>
                    </>
                  ) : (
                    <span>SAVE ENTERPRISE PROFILE</span>
                  )}
                </button>
              </div>
            </form>

            {/* Right: Live AI Ingest Preview Terminal Card (5 cols) */}
            <div className="lg:col-span-5 border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-mono flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[var(--accent-safe)]" />
                  <span>Context-Aware AI Ingest Preview</span>
                </div>
                <span className="text-[9px] font-mono text-[var(--accent-safe)] border border-[var(--border-hairline)] px-1.5 py-0.5 bg-[var(--bg-canvas)]">
                  LIVE INGESTION
                </span>
              </div>

              {/* Statutory Health Badges */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
                  <div className="text-[9px] uppercase text-[var(--text-tertiary)]">Sec 43B(h) Leverage</div>
                  <div className="font-bold text-[var(--accent-safe)] mt-0.5">
                    {enterpriseProfile.msmeCategory !== 'MEDIUM' ? 'FULL ENFORCEABILITY' : 'NOT APPLICABLE (MEDIUM)'}
                  </div>
                  <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                    {enterpriseProfile.msmeCategory !== 'MEDIUM' ? 'Delinquent buyers lose tax deduction' : 'Only Micro & Small qualify'}
                  </div>
                </div>

                <div className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
                  <div className="text-[9px] uppercase text-[var(--text-tertiary)]">MSMED Sec 16 Interest</div>
                  <div className="font-bold text-[var(--accent-warn)] mt-0.5">20.25% p.a.</div>
                  <div className="text-[9px] text-[var(--text-muted)] mt-0.5">3x RBI Bank Rate with monthly rests</div>
                </div>

                <div className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
                  <div className="text-[9px] uppercase text-[var(--text-tertiary)]">Nayak Committee 20%</div>
                  <div className="font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                    ₹{((enterpriseProfile.annualTurnover * 0.20) / 100000).toFixed(1)}L CC Entitlement
                  </div>
                  <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                    Sanctioned: ₹{(enterpriseProfile.sanctionedCcLimit / 100000).toFixed(1)}L
                  </div>
                </div>

                <div className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
                  <div className="text-[9px] uppercase text-[var(--text-tertiary)]">Daily OD Drag (₹10L)</div>
                  <div className="font-bold text-[var(--accent-danger)] tabular-nums mt-0.5">
                    -₹{Math.round((1000000 * (enterpriseProfile.bankOdInterestRate / 100)) / 365)}/day
                  </div>
                  <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                    Erodes {((enterpriseProfile.bankOdInterestRate / 12) / enterpriseProfile.typicalGrossMarginPercent * 100).toFixed(1)}% margin/mo
                  </div>
                </div>
              </div>

              {/* Formatted Prompt Payload Preview */}
              <div className="flex-1 flex flex-col border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-2.5">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[var(--border-hairline)] text-[9px] font-mono text-[var(--text-tertiary)]">
                  <span>PROMPT CONTEXT PAYLOAD (INJECTED ON EVERY QUERY)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(enterpriseProfile, null, 2), 'profile_json')}
                    className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                  >
                    {copiedCode === 'profile_json' ? <Check className="w-2.5 h-2.5 text-[var(--accent-safe)]" /> : <Copy className="w-2.5 h-2.5" />}
                    <span>{copiedCode === 'profile_json' ? 'COPIED' : 'COPY'}</span>
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-[var(--text-secondary)] overflow-x-auto max-h-[300px] leading-relaxed">
{`// Veritas AI System Prompt State:
{
  "enterprise": "${enterpriseProfile.companyName}",
  "brand": "${enterpriseProfile.tradingBrandName}",
  "udyam": "${enterpriseProfile.udyamRegistrationNumber}",
  "gstin": "${enterpriseProfile.gstin}",
  "pan": "${enterpriseProfile.pan}",
  "sector": "${enterpriseProfile.industrySector}",
  "annual_turnover": ₹${(enterpriseProfile.annualTurnover / 10000000).toFixed(2)} Cr,
  "sanctioned_cc_limit": ₹${(enterpriseProfile.sanctionedCcLimit / 100000).toFixed(1)} Lakhs,
  "bank_od_rate": "${enterpriseProfile.bankOdInterestRate}% p.a.",
  "statutory_status": {
    "is_msme_eligible_43bh": ${enterpriseProfile.msmeCategory !== 'MEDIUM'},
    "msmed_penal_rate": "20.25% (3x RBI Bank Rate 6.75%)",
    "disallowance_tax_penalty": "31.2% on delinquent buyer"
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 02: LIVE MODEL BRIDGE & GOOGLE COLAB KERNEL */}
      {activeSection === 'bridge' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Endpoint Configuration (6 cols) */}
            <div className="lg:col-span-6 border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 flex flex-col space-y-4">
              <div className="pb-2 border-b border-[var(--border-hairline)]">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-mono flex items-center gap-1.5">
                  <Plug className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  <span>External Model Bridge Configuration</span>
                </h2>
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                  Route risk calculations through your live Google Colab or local FastAPI server.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Inference Endpoint URL (POST)
                  </label>
                  <input
                    type="url"
                    value={apiConfig.endpointUrl}
                    onChange={(e) => setApiConfigState((prev) => ({ ...prev, endpointUrl: e.target.value }))}
                    placeholder="https://your-tunnel.ngrok-free.app/predict"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                  <span className="text-[9px] font-mono text-[var(--text-tertiary)] mt-1 block">
                    Leave blank to run on the calibrated local engine mirror.
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Authorization Header / Bearer Token (Optional)
                  </label>
                  <input
                    type="password"
                    value={apiConfig.apiKey || ''}
                    onChange={(e) => setApiConfigState((prev) => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Bearer vts_live_key_..."
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                      Request Timeout (ms)
                    </label>
                    <input
                      type="number"
                      min="1000"
                      step="500"
                      value={apiConfig.timeoutMs}
                      onChange={(e) => setApiConfigState((prev) => ({ ...prev, timeoutMs: parseInt(e.target.value, 10) || 8000 }))}
                      className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                      Fault-Tolerant Fallback
                    </label>
                    <button
                      type="button"
                      onClick={() => setApiConfigState((prev) => ({ ...prev, autoFallback: !prev.autoFallback }))}
                      className={`w-full py-1.5 px-2.5 text-xs font-mono border transition-colors flex items-center justify-between ${
                        apiConfig.autoFallback !== false
                          ? 'border-[var(--accent-safe)] bg-[var(--bg-elevated)] text-[var(--accent-safe)]'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-muted)]'
                      }`}
                    >
                      <span>Auto-Mirror</span>
                      <span>{apiConfig.autoFallback !== false ? 'ENABLED' : 'DISABLED'}</span>
                    </button>
                  </div>
                </div>

                {/* Save and Probe Buttons */}
                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveBridgeConfig}
                    className="flex-1 py-2 text-xs font-mono font-semibold border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors flex items-center justify-center space-x-1.5"
                  >
                    {bridgeSavedToast ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[var(--accent-safe)]" />
                        <span>Saved Config</span>
                      </>
                    ) : (
                      <span>Save Bridge Config</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestProbe}
                    disabled={isProbing}
                    className="flex-1 py-2 text-xs font-mono font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center space-x-1.5"
                  >
                    <Activity className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
                    <span>{isProbing ? 'Probing...' : 'PROBE ENDPOINT'}</span>
                  </button>
                </div>

                {/* Probe Output Status Banner */}
                {probeResult && (
                  <div
                    className={`p-3 border mt-3 space-y-1.5 text-xs font-mono ${
                      probeResult.success && probeResult.schemaValid
                        ? 'border-[var(--accent-safe)] bg-[var(--bg-canvas)] text-[var(--text-primary)]'
                        : 'border-[var(--accent-danger)] bg-[var(--bg-canvas)] text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        {probeResult.success && probeResult.schemaValid ? (
                          <ShieldCheck className="w-4 h-4 text-[var(--accent-safe)]" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-[var(--accent-danger)]" />
                        )}
                        <span className="font-bold">
                          {probeResult.success && probeResult.schemaValid ? 'BRIDGE ONLINE & COMPLIANT' : 'BRIDGE VALIDATION WARNING'}
                        </span>
                      </div>
                      <span className="tabular-nums font-bold">
                        {probeResult.latencyMs}ms latency
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)]">{probeResult.message}</div>
                    {probeResult.fieldsValidated.length > 0 && (
                      <div className="text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-hairline)]">
                        Validated fields: {probeResult.fieldsValidated.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Google Colab Super-Model Blueprint (6 cols) */}
            <div className="lg:col-span-6 border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-mono flex items-center space-x-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  <span>Google Colab Super-Model Blueprint</span>
                </div>
                <div className="flex items-center space-x-1">
                  {[
                    { id: 'colab', label: 'Colab Setup' },
                    { id: 'request', label: 'JSON Request' },
                    { id: 'response', label: 'JSON Response' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSchemaTab(tab.id as any)}
                      className={`px-2 py-0.5 text-[10px] font-mono border transition-colors ${
                        schemaTab === tab.id
                          ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)] text-[var(--accent-primary)] font-semibold'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {schemaTab === 'colab' && (
                <div className="space-y-3">
                  <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-2">
                    <div className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                      <span>4 Colab-Exclusive Superpowers (GPU/Python C++):</span>
                      <a
                        href="https://colab.research.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-mono text-[var(--accent-primary)] hover:underline flex items-center gap-1"
                      >
                        <span>Open Colab</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <ul className="text-[11px] font-mono text-[var(--text-muted)] space-y-1 list-disc list-inside">
                      <li><strong className="text-[var(--text-primary)]">Multimodal OCR (/ocr_invoice):</strong> Scans PDF invoices directly into structured deal underwriting.</li>
                      <li><strong className="text-[var(--text-primary)]">Contagion Graph (/graph_contagion):</strong> NetworkX PageRank cascading bankruptcy modeling.</li>
                      <li><strong className="text-[var(--text-primary)]">10k-Draw Monte Carlo (/monte_carlo_var):</strong> Empirical cash arrival distribution &amp; 99% VaR.</li>
                      <li><strong className="text-[var(--text-primary)]">Exact TreeSHAP (/predict):</strong> True non-linear feature interaction scoring.</li>
                    </ul>
                  </div>

                  <div className="relative border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[var(--border-hairline)] text-[10px] font-mono text-[var(--text-tertiary)]">
                      <span>RUN THIS CELL IN GOOGLE COLAB</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(COLAB_BOOTSTRAP_CODE, 'colab_bootstrap')}
                        className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                      >
                        {copiedCode === 'colab_bootstrap' ? (
                          <>
                            <Check className="w-3 h-3 text-[var(--accent-safe)]" />
                            <span>COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>COPY CELL</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-[var(--text-secondary)] overflow-x-auto max-h-[160px] leading-relaxed">
                      {COLAB_BOOTSTRAP_CODE}
                    </pre>
                  </div>

                  <div className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[10px] font-mono text-[var(--text-muted)]">
                    <span className="font-bold text-[var(--text-primary)]">Kernel Script Available:</span>{' '}
                    The complete standalone server script is located at <code className="text-[var(--accent-primary)]">veritas_colab_kernel.py</code> and Jupyter notebook at <code className="text-[var(--accent-primary)]">veritas_super_model.ipynb</code> in your project root.
                  </div>
                </div>
              )}

              {schemaTab !== 'colab' && (
                <div className="relative border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        schemaTab === 'request' ? JSON_REQUEST_SCHEMA : JSON_RESPONSE_SCHEMA,
                        schemaTab
                      )
                    }
                    className="absolute top-2 right-2 px-2 py-1 text-[10px] font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center space-x-1"
                  >
                    {copiedCode === schemaTab ? (
                      <>
                        <Check className="w-3 h-3 text-[var(--accent-safe)]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Schema</span>
                      </>
                    )}
                  </button>

                  <pre className="text-[11px] font-mono text-[var(--text-secondary)] overflow-x-auto max-h-[360px] leading-relaxed">
                    {schemaTab === 'request' ? JSON_REQUEST_SCHEMA : JSON_RESPONSE_SCHEMA}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 03: SMALL BUSINESS TREASURY & TAX DEFAULTS */}
      {activeSection === 'treasury' && (
        <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hairline)]">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-mono">
                Small Business Treasury &amp; Tax Defaults
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                Baseline financial parameters persisted in local storage. All new underwriting intakes inherit these baselines.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetTreasuryToBaseline}
              className="px-2.5 py-1 text-[10px] font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Reset to Defaults
            </button>
          </div>

          <form onSubmit={handleSaveTreasuryDefaults} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                  Current Bank Balance (INR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={treasuryDefaults.currentBankBalance}
                  onChange={(e) =>
                    setTreasuryDefaults((prev) => ({
                      ...prev,
                      currentBankBalance: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] text-right"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                  Monthly Fixed Operating Burn (INR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={treasuryDefaults.monthlyFixedExpenses}
                  onChange={(e) =>
                    setTreasuryDefaults((prev) => ({
                      ...prev,
                      monthlyFixedExpenses: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] text-right"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                  Bank Overdraft Limit (INR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={treasuryDefaults.bankOverdraftLimit}
                  onChange={(e) =>
                    setTreasuryDefaults((prev) => ({
                      ...prev,
                      bankOverdraftLimit: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[var(--border-hairline)]">
              <div>
                <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                  GST Registration Status
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setTreasuryDefaults((prev) => ({ ...prev, gstRegistered: true }))}
                    className={`py-1.5 px-2 text-[10px] font-mono border transition-colors ${
                      treasuryDefaults.gstRegistered
                        ? 'border-[var(--accent-safe)] bg-[var(--bg-elevated)] text-[var(--accent-safe)] font-semibold'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-tertiary)]'
                    }`}
                  >
                    Registered
                  </button>
                  <button
                    type="button"
                    onClick={() => setTreasuryDefaults((prev) => ({ ...prev, gstRegistered: false }))}
                    className={`py-1.5 px-2 text-[10px] font-mono border transition-colors ${
                      !treasuryDefaults.gstRegistered
                        ? 'border-[var(--accent-warn)] bg-[var(--bg-elevated)] text-[var(--accent-warn)] font-semibold'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-tertiary)]'
                    }`}
                  >
                    Exempt / Unreg
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                  Default GST Slab
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[5, 12, 18, 28].map((slab) => (
                    <button
                      key={slab}
                      type="button"
                      onClick={() => setTreasuryDefaults((prev) => ({ ...prev, gstSlab: slab }))}
                      className={`py-1.5 text-[10px] font-mono tabular-nums border transition-colors ${
                        treasuryDefaults.gstSlab === slab
                          ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)] text-[var(--accent-primary)] font-semibold'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-tertiary)]'
                      }`}
                    >
                      {slab}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                  Default Supply Type
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setTreasuryDefaults((prev) => ({ ...prev, defaultSupplyType: 'INTRA_STATE' }))}
                    className={`py-1.5 px-2 text-[10px] font-mono border transition-colors ${
                      treasuryDefaults.defaultSupplyType === 'INTRA_STATE'
                        ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)] text-[var(--accent-primary)] font-semibold'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-tertiary)]'
                    }`}
                  >
                    CGST + SGST
                  </button>
                  <button
                    type="button"
                    onClick={() => setTreasuryDefaults((prev) => ({ ...prev, defaultSupplyType: 'INTER_STATE' }))}
                    className={`py-1.5 px-2 text-[10px] font-mono border transition-colors ${
                      treasuryDefaults.defaultSupplyType === 'INTER_STATE'
                        ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)] text-[var(--accent-primary)] font-semibold'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-tertiary)]'
                    }`}
                  >
                    IGST
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between">
              <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                Pre-populates Deal Underwriting Intake and GST ITC calculations.
              </span>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-mono font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity flex items-center space-x-1.5"
              >
                {treasurySavedToast ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved to Workspace Baseline</span>
                  </>
                ) : (
                  <span>SAVE TREASURY BASELINE</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION 04: ACCESSIBILITY & READABILITY SUITE (WCAG AA) */}
      {activeSection === 'accessibility' && (
        <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hairline)]">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-mono">
                Accessibility &amp; Readability Suite (WCAG AA)
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                Strict compliance toggles ensuring low-vision, high-contrast, and motor accessibility.
              </p>
            </div>
            <span className="text-[10px] font-mono text-[var(--accent-safe)] border border-[var(--accent-safe)]/40 px-2 py-0.5">
              Verified 7.1:1 AAA Contrast
            </span>
          </div>

          <div className="space-y-4">
            {/* Reduced Motion Toggle */}
            <div className="flex items-center justify-between p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Reduced Motion Mode
                </div>
                <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                  Disables all chart transitions, stepper animations, and spring physics.
                </div>
              </div>
              <button
                type="button"
                onClick={toggleReducedMotion}
                className={`px-3 py-1 text-xs font-mono border transition-colors ${
                  themeState.reducedMotion
                    ? 'border-[var(--accent-safe)] bg-[var(--bg-canvas)] text-[var(--accent-safe)] font-semibold'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-tertiary)]'
                }`}
              >
                {themeState.reducedMotion ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* High Contrast Hairline Borders */}
            <div className="flex items-center justify-between p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  High-Contrast Hairline Borders
                </div>
                <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                  Elevates border and secondary text luminance to exceed 7:1 AAA contrast ratios across all panels.
                </div>
              </div>
              <button
                type="button"
                onClick={toggleHighContrast}
                className={`px-3 py-1 text-xs font-mono border transition-colors ${
                  themeState.highContrastBorders
                    ? 'border-[var(--accent-safe)] bg-[var(--bg-canvas)] text-[var(--accent-safe)] font-semibold'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-tertiary)]'
                }`}
              >
                {themeState.highContrastBorders ? 'ACTIVE (AAA)' : 'OFF (AA)'}
              </button>
            </div>

            {/* Interface Scale Selector */}
            <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    Interface Font &amp; Component Scale
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                    Adjusts root font size and element sizing for diverse display densities.
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[var(--accent-primary)]">
                  {themeState.interfaceScale}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(['90%', '100%', '110%'] as InterfaceScale[]).map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => setScale(scale)}
                    className={`py-2 text-xs font-mono border transition-colors ${
                      themeState.interfaceScale === scale
                        ? 'border-[var(--accent-primary)] bg-[var(--bg-canvas)] text-[var(--accent-primary)] font-semibold'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-muted)] hover:border-[var(--border-subtle)]'
                    }`}
                  >
                    {scale === '90%' ? '90% Compact' : scale === '100%' ? '100% Standard' : '110% Large'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabular Chart Data Table Toggle */}
            <div className="flex items-center justify-between p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Tabular Chart Data Table Mode
                </div>
                <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                  Renders an accessible, keyboard-navigable HTML data table beneath every Apache ECharts visualization.
                </div>
              </div>
              <button
                type="button"
                onClick={toggleTabularCharts}
                className={`px-3 py-1 text-xs font-mono border transition-colors ${
                  themeState.showTabularCharts
                    ? 'border-[var(--accent-safe)] bg-[var(--bg-canvas)] text-[var(--accent-safe)] font-semibold'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-tertiary)]'
                }`}
              >
                {themeState.showTabularCharts ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 05: APPEARANCE & TYPOGRAPHY STUDIO */}
      {activeSection === 'appearance' && (
        <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-5">
          <div className="pb-3 border-b border-[var(--border-hairline)]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-mono">
              Appearance &amp; Typography Studio
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
              Zero-gradient, flat solid surfaces with hairline borders and non-generic typography.
            </p>
          </div>

          {/* Theme Presets */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block">
              1. Solid Zero-Gradient Theme Presets
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((theme) => {
                const isSelected = themeState.theme === theme;
                const tokens = THEME_PRESETS[theme];
                return (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => handleSelectTheme(theme)}
                    className={`p-3 text-left border transition-colors relative ${
                      isSelected
                        ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)]'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--border-subtle)]'
                    }`}
                  >
                    <div className="flex space-x-1 mb-2">
                      <span className="w-4 h-4 border border-[var(--border-hairline)]" style={{ backgroundColor: tokens['--bg-canvas'] }} />
                      <span className="w-4 h-4 border border-[var(--border-hairline)]" style={{ backgroundColor: tokens['--bg-surface'] }} />
                      <span className="w-4 h-4 border border-[var(--border-hairline)]" style={{ backgroundColor: tokens['--accent-primary'] }} />
                    </div>
                    <div className="text-xs font-bold font-sans text-[var(--text-primary)]">
                      {THEME_LABELS[theme]}
                    </div>
                    <div className="text-[9px] font-mono text-[var(--text-tertiary)] mt-0.5">
                      {theme === 'obsidian' ? 'Dark Blueprint' : theme === 'slate' ? 'Light Institutional' : theme === 'ledger' ? 'Warm Paper' : 'Brutalist Amber'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Solid Accent Color Picker */}
          <div className="space-y-2 pt-2 border-t border-[var(--border-hairline)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
                2. Solid Accent Hex Color
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                {themeState.customAccent || ACCENT_PRESETS[themeState.theme]}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={themeState.customAccent || ACCENT_PRESETS[themeState.theme]}
                onChange={(e) => handleCustomAccent(e.target.value)}
                className="w-9 h-9 border border-[var(--border-hairline)] bg-transparent cursor-pointer"
              />
              <div className="flex flex-wrap gap-2">
                {['#2563EB', '#0D9488', '#D97706', '#EA580C', '#6366F1', '#10B981', '#E11D48'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleCustomAccent(color)}
                    className="w-7 h-7 border border-[var(--border-hairline)] hover:scale-105 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Non-Generic Font Systems */}
          <div className="space-y-2 pt-2 border-t border-[var(--border-hairline)]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block">
              3. Non-Generic Font Pairings
            </span>
            <div className="space-y-2">
              {(Object.keys(FONT_PAIRING_LABELS) as FontPairing[]).map((fp) => {
                const isSelected = themeState.fontPairing === fp;
                return (
                  <button
                    key={fp}
                    type="button"
                    onClick={() => handleSelectFontPairing(fp)}
                    className={`w-full p-3 text-left border transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)]'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--border-subtle)]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        {FONT_PAIRING_LABELS[fp]}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">
                        {fp === 'editorial'
                          ? 'Editorial Financial: Serif headings + Switzer UI + JetBrains code'
                          : fp === 'precision'
                            ? 'Modern Precision: Geist display + General Sans UI + Geist Mono'
                            : 'Brutalist Terminal: Space Grotesk display + Clash Grotesk UI + IBM Plex Mono'}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Density & Crosshairs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[var(--border-hairline)]">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">
                4. Grid Density
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['compact', 'standard', 'spacious'] as DensityMode[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleSelectDensity(d)}
                    className={`py-1.5 text-xs font-mono uppercase border transition-colors ${
                      themeState.density === d
                        ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)] text-[var(--accent-primary)] font-semibold'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-muted)]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">
                5. Structural Container Crosshairs
              </span>
              <button
                type="button"
                onClick={toggleCrosshairs}
                className={`w-full py-1.5 px-3 text-xs font-mono border transition-colors flex items-center justify-between ${
                  themeState.showCrosshairs
                    ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)] text-[var(--accent-primary)] font-semibold'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-muted)]'
                }`}
              >
                <span>Container-lines Crosshairs</span>
                <span>{themeState.showCrosshairs ? 'ENABLED' : 'DISABLED'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

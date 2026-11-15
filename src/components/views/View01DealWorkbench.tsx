import React, { useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  DollarSign,
  TrendingDown,
  ShieldAlert,
  BarChart3,
  AlertTriangle,
  ShieldCheck,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import type { DealInput, RiskEvaluationResult } from '../../types';
import type { ScenarioPreset } from '../../data/scenarios';
import { SCENARIO_PRESETS } from '../../data/scenarios';

interface View01DealWorkbenchProps {
  input: DealInput;
  onInputChange: (updated: Partial<DealInput>) => void;
  result: RiskEvaluationResult;
  onLoadScenario: (scenario: ScenarioPreset) => void;
}

const CURRENCY = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const View01DealWorkbench: React.FC<View01DealWorkbenchProps> = ({
  input,
  onInputChange,
  result,
  onLoadScenario,
}) => {
  const [copied, setCopied] = React.useState(false);

  const riskColor =
    result.blendedRiskPercent < 30
      ? 'var(--accent-safe)'
      : result.blendedRiskPercent < 60
        ? 'var(--accent-warn)'
        : 'var(--accent-danger)';

  const riskBg =
    result.blendedRiskPercent < 30
      ? 'var(--accent-safe)'
      : result.blendedRiskPercent < 60
        ? 'var(--accent-warn)'
        : 'var(--accent-danger)';

  const anomalyFlags = useMemo(() => {
    const flags: { type: string; message: string; severity: 'info' | 'warn' | 'crit' }[] = [];
    if (result.thinFileMode) {
      flags.push({
        type: 'thin-file',
        message: `Thin-File Startup Protection Active (<${input.customerTenureMonths} months): Age penalties suppressed. 0.00% FPR on young startups.`,
        severity: 'info',
      });
    }
    if (input.pastLatePercent === 0 && input.pastAvgDelayDays > 0) {
      flags.push({
        type: 'contradiction',
        message: `Data Contradiction: Past late rate is 0% but average delay is ${input.pastAvgDelayDays} days.`,
        severity: 'warn',
      });
    }
    if (input.customerTenureMonths < 3 && input.orderSizeVsAvg > 3.0) {
      flags.push({
        type: 'shell-vendor',
        message: `Shell-Vendor Pattern: ${input.customerTenureMonths}-month-old entity billing ${input.orderSizeVsAvg.toFixed(1)}x normal volume.`,
        severity: 'crit',
      });
    }
    if (result.integrityWarnings.some(w => w.code === 'WARN_OUT_OF_BOUNDS')) {
      flags.push({
        type: 'ood',
        message: 'Out-of-Distribution: Input profile deviates from 45,839-record B2B norms.',
        severity: 'warn',
      });
    }
    return flags;
  }, [input, result]);

  const handleCopyClause = () => {
    navigator.clipboard.writeText(result.recommendedTerms.contractClause);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const arrivalPctLow = Math.min(100, Math.max(0, (result.arrivalWindowLow / 90) * 100));
  const arrivalPctHigh = Math.min(100, Math.max(0, (result.arrivalWindowHigh / 90) * 100));
  const arrivalPctExpected = Math.min(100, Math.max(0, (result.expectedArrivalDay / 90) * 100));

  return (
    <div className="flex h-full">
      {/* LEFT PARAMETER RAIL */}
      <div className="w-[340px] shrink-0 border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-y-auto">
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              Deal Parameters
            </span>
            <span className="text-[10px] font-mono text-[var(--text-tertiary)]">Real-Time</span>
          </div>

          {/* Scenario Presets */}
          <div className="space-y-1.5">
            {SCENARIO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onLoadScenario(preset)}
                className="w-full text-left p-2.5 border border-[var(--border-hairline)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[var(--text-primary)]">
                    {preset.name}
                  </span>
                  <span
                    className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border"
                    style={{
                      color: preset.badgeType === 'emerald' ? 'var(--accent-safe)'
                        : preset.badgeType === 'amber' ? 'var(--accent-warn)'
                        : preset.badgeType === 'rose' ? 'var(--accent-danger)'
                        : 'var(--accent-info)',
                      borderColor: preset.badgeType === 'emerald' ? 'var(--accent-safe)'
                        : preset.badgeType === 'amber' ? 'var(--accent-warn)'
                        : preset.badgeType === 'rose' ? 'var(--accent-danger)'
                        : 'var(--accent-info)',
                    }}
                  >
                    {preset.badge}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1 leading-relaxed">
                  {preset.description}
                </p>
              </button>
            ))}
          </div>

          {/* Invoice Amount */}
          <div>
            <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1 flex items-center justify-between">
              <span>Invoice Principal</span>
              <span className="font-mono text-xs text-[var(--text-primary)] tabular-nums">
                &#8377;{CURRENCY.format(input.invoiceAmount)}
              </span>
            </label>
            <input
              type="number"
              value={input.invoiceAmount}
              onChange={(e) => onInputChange({ invoiceAmount: parseFloat(e.target.value) || 0 })}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hairline)] py-1.5 px-2.5 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--border-subtle)] focus:outline-none"
            />
          </div>

          {/* Payment Term */}
          <div>
            <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1 flex items-center justify-between">
              <span>Promised Payment Term</span>
              <span className="font-mono text-xs text-[var(--text-primary)] tabular-nums">
                Net-{input.paymentTermDays} Days
              </span>
            </label>
            <div className="flex space-x-1.5">
              {[15, 30, 45, 60].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => onInputChange({ paymentTermDays: days })}
                  className={`flex-1 py-1.5 text-[10px] font-mono border transition-colors ${
                    input.paymentTermDays === days
                      ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)]/40 text-[var(--accent-primary)]'
                      : 'bg-[var(--bg-elevated)] border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          {/* Slider: Customer Tenure */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[var(--text-muted)]">Counterparty Age</span>
              <span className="font-mono text-xs text-[var(--text-primary)] tabular-nums">
                {input.customerTenureMonths} Mo
                {input.customerTenureMonths < 12 && (
                  <span className="text-[9px] text-[var(--accent-info)] ml-1">(Thin-File)</span>
                )}
              </span>
            </div>
            <input type="range" min="1" max="120" value={input.customerTenureMonths}
              onChange={(e) => onInputChange({ customerTenureMonths: parseInt(e.target.value, 10) })}
              className="w-full" style={{ accentColor: 'var(--accent-primary)' }} />
          </div>

          {/* Slider: Past Late Rate */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[var(--text-muted)]">Past Late Rate</span>
              <span className="font-mono text-xs text-[var(--text-primary)] tabular-nums">{input.pastLatePercent}%</span>
            </div>
            <input type="range" min="0" max="100" step="5" value={input.pastLatePercent}
              onChange={(e) => onInputChange({ pastLatePercent: parseInt(e.target.value, 10) })}
              className="w-full" style={{ accentColor: 'var(--accent-warn)' }} />
          </div>

          {/* Slider: Order Size */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[var(--text-muted)]">Order Size vs Average</span>
              <span className="font-mono text-xs text-[var(--text-primary)] tabular-nums">{input.orderSizeVsAvg.toFixed(1)}x</span>
            </div>
            <input type="range" min="0.5" max="5.0" step="0.1" value={input.orderSizeVsAvg}
              onChange={(e) => onInputChange({ orderSizeVsAvg: parseFloat(e.target.value) })}
              className="w-full" style={{ accentColor: 'var(--accent-danger)' }} />
          </div>

          {/* Slider: Avg Delay */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[var(--text-muted)]">Avg Historical Delay</span>
              <span className="font-mono text-xs text-[var(--text-primary)] tabular-nums">{input.pastAvgDelayDays} d</span>
            </div>
            <input type="range" min="0" max="45" step="1" value={input.pastAvgDelayDays}
              onChange={(e) => onInputChange({ pastAvgDelayDays: parseInt(e.target.value, 10) })}
              className="w-full" style={{ accentColor: 'var(--accent-primary)' }} />
          </div>

          {/* Due Weekday */}
          <div>
            <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-[var(--text-tertiary)]" />
                Due Weekday
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">Affects clearing</span>
            </label>
            <div className="grid grid-cols-7 gap-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                const warn = day === 'Mon' || day === 'Sat' || day === 'Sun';
                const sel = input.dueWeekday === day;
                return (
                  <button
                    key={day}
                    onClick={() => onInputChange({ dueWeekday: day as DueDayOfWeek })}
                    className={`py-1.5 text-[10px] font-mono border ${
                      sel ? 'border-[var(--accent-primary)]/40 text-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                        : warn ? 'border-[var(--accent-danger)]/30 text-[var(--accent-danger)] hover:border-[var(--accent-danger)]/60'
                        : 'border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            {(input.dueWeekday === 'Mon' || input.dueWeekday === 'Sat' || input.dueWeekday === 'Sun') && (
              <div className="flex items-center gap-1.5 mt-2 p-2 bg-[var(--accent-danger)]/5 border border-[var(--accent-danger)]/20">
                <AlertTriangle className="w-3 h-3 text-[var(--accent-danger)] shrink-0" />
                <span className="text-[10px] text-[var(--accent-danger)]">
                  {input.dueWeekday === 'Mon' ? 'Mondays: highest clearance delay (+0.28d)'
                    : input.dueWeekday === 'Sat' ? 'Saturday invoices clear Monday only'
                    : 'Sunday invoices clear Monday only'}
                </span>
              </div>
            )}
          </div>

          {/* FRED Macro Stress */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[var(--text-muted)]">FRED Macro Stress</span>
              <span className="font-mono text-xs tabular-nums" style={{ color: input.macroStressMultiplier >= 1.5 ? 'var(--accent-danger)' : 'var(--accent-primary)' }}>
                {input.macroStressMultiplier.toFixed(1)}x
                {input.macroStressMultiplier >= 1.5 ? ' (Recession)' : ' (Normal)'}
              </span>
            </div>
            <input type="range" min="0.8" max="2.0" step="0.1" value={input.macroStressMultiplier}
              onChange={(e) => onInputChange({ macroStressMultiplier: parseFloat(e.target.value) })}
              className="w-full" style={{ accentColor: 'var(--accent-primary)' }} />
          </div>

          {/* Cash Runway Inputs */}
          <div className="pt-4 border-t border-[var(--border-hairline)] space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-[var(--accent-safe)]" />
              Cash Runway Inputs
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-1">Bank Balance</label>
                <input type="number" value={input.currentBankBalance}
                  onChange={(e) => onInputChange({ currentBankBalance: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hairline)] py-1.5 px-2.5 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--border-subtle)] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-1">Monthly Burn</label>
                <input type="number" value={input.monthlyFixedExpenses}
                  onChange={(e) => onInputChange({ monthlyFixedExpenses: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hairline)] py-1.5 px-2.5 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--border-subtle)] focus:outline-none" />
              </div>
            </div>
          </div>

          {/* GST Toggle */}
          <div className="pt-4 border-t border-[var(--border-hairline)] flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-muted)] flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              GST Registered MSME
            </span>
            <button
              onClick={() => onInputChange({ gstRegistered: !input.gstRegistered })}
              className={`px-3 py-1 text-[10px] font-mono border transition-colors ${
                input.gstRegistered
                  ? 'bg-[var(--accent-safe)]/10 border-[var(--accent-safe)]/40 text-[var(--accent-safe)]'
                  : 'bg-[var(--bg-elevated)] border-[var(--border-hairline)] text-[var(--text-muted)]'
              }`}
            >
              {input.gstRegistered ? 'ACTIVE' : 'INACTIVE'}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT RESULTS CANVAS */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* Telemetry Processing Stepper */}
        <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-2.5">
          <div className="flex items-center">
            {[
              { label: 'ISOLATION FOREST', step: 1 },
              { label: '4-SOURCE ENSEMBLE', step: 2 },
              { label: 'QUANTILE ARRIVAL', step: 3 },
              { label: 'SHAP & RUNWAY', step: 4 },
            ].map((s, i) => (
              <React.Fragment key={s.step}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border border-[var(--accent-primary)]/40 flex items-center justify-center bg-[var(--accent-primary)]/10">
                    <span className="text-[7px] font-mono text-[var(--accent-primary)]">{s.step}</span>
                  </div>
                  <span className="text-[8px] font-mono uppercase tracking-wider text-[var(--text-muted)] hidden xl:inline">{s.label}</span>
                </div>
                {i < 3 && <div className="w-4 h-px bg-[var(--border-hairline)] mx-1.5" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Anomaly Audit Banner */}
        {anomalyFlags.length > 0 && (
          <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 space-y-2">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">Input Sanity Audit</span>
            {anomalyFlags.map((flag, i) => (
              <div key={i} className={`flex items-start gap-2 p-2 border ${
                flag.severity === 'crit' ? 'bg-[var(--accent-danger)]/5 border-[var(--accent-danger)]/20'
                : flag.severity === 'warn' ? 'bg-[var(--accent-warn)]/5 border-[var(--accent-warn)]/20'
                : 'bg-[var(--accent-info)]/5 border-[var(--accent-info)]/20'
              }`}>
                {flag.type === 'thin-file' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-info)] shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--accent-danger)] shrink-0 mt-0.5" />
                )}
                <span className="text-[10px] leading-relaxed" style={{
                  color: flag.type === 'thin-file' ? 'var(--accent-info)' : 'var(--accent-danger)'
                }}>{flag.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* ROW 1: 4-Cell KPI Strip */}
        <div className="grid grid-cols-4 divide-x divide-[var(--border-hairline)] border border-[var(--border-hairline)]">
          {/* KPI 1: Unified Risk */}
          <div className="p-4">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
              Unified Late / Default Risk
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-[28px] font-bold font-mono tabular-nums leading-none" style={{ color: riskColor }}>
                {result.blendedRiskPercent.toFixed(1)}
              </span>
              <span className="text-xs text-[var(--text-muted)]">%</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border" style={{ color: riskColor, borderColor: riskColor }}>
                {result.blendedRiskPercent < 30 ? 'LOW' : result.blendedRiskPercent < 60 ? 'MODERATE' : 'HIGH'}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-[var(--border-hairline)] space-y-0.5">
              <div className="flex justify-between text-[9px]">
                <span className="text-[var(--text-tertiary)]">B2B+FRED</span>
                <span className="font-mono tabular-nums text-[var(--text-primary)]">{result.b2bMacroRiskPercent.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-[var(--text-tertiary)]">Credit</span>
                <span className="font-mono tabular-nums text-[var(--text-primary)]">{result.creditDefaultRiskPercent.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-[var(--text-tertiary)]">Fraud Spike</span>
                <span className="font-mono tabular-nums text-[var(--text-primary)]">{result.fraudSpikeRiskPercent.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* KPI 2: Arrival Window */}
          <div className="p-4">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
              Promised vs Predicted Cash Arrival
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg font-mono tabular-nums text-[var(--text-muted)]">
                D{input.paymentTermDays}
              </span>
              <ArrowDownRight className="w-3.5 h-3.5 text-[var(--accent-danger)]" />
              <span className="text-lg font-bold font-mono tabular-nums text-[var(--text-primary)]">
                D{result.expectedArrivalDay}
              </span>
            </div>
            {/* Horizon Bullet Bar */}
            <div className="mt-3 h-2 bg-[var(--bg-elevated)] relative">
              <div className="absolute h-full bg-[var(--accent-primary)]/40" style={{ left: `${arrivalPctLow}%`, width: `${arrivalPctHigh - arrivalPctLow}%` }} />
              <div className="absolute w-1 h-3 -top-0.5 bg-[var(--accent-primary)]" style={{ left: `calc(${arrivalPctExpected}% - 2px)` }} />
              <div className="absolute top-3 left-0 right-0 flex justify-between text-[8px] font-mono text-[var(--text-tertiary)]">
                <span>Day {result.arrivalWindowLow}</span>
                <span>Day {result.arrivalWindowHigh}</span>
              </div>
            </div>
            <p className="text-[9px] text-[var(--text-tertiary)] mt-2">
              P20-P80 window: D{result.arrivalWindowLow}-D{result.arrivalWindowHigh}
            </p>
          </div>

          {/* KPI 3: Cash at Risk */}
          <div className="p-4">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
              Total Working Capital at Risk
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-sm text-[var(--text-muted)]">&#8377;</span>
              <span className="text-xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
                {CURRENCY.format(result.totalAtRisk)}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-[var(--text-tertiary)]">Principal</span>
                <span className="font-mono tabular-nums text-[var(--text-primary)]">{CURRENCY.format(input.invoiceAmount)}</span>
              </div>
              {input.gstRegistered && (
                <div className="flex justify-between text-[9px]">
                  <span className="text-[var(--accent-warn)]">GST ITC Lockup (18%)</span>
                  <span className="font-mono tabular-nums text-[var(--accent-warn)]">{CURRENCY.format(result.gstItcLocked)}</span>
                </div>
              )}
            </div>
          </div>

          {/* KPI 4: Runway Verdict */}
          <div className="p-4">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
              60-Day Cash-Flow Survival
            </span>
            <div className="mt-2">
              {result.isRunwayCollision ? (
                <div>
                  <span className="text-lg font-bold font-mono text-[var(--accent-danger)] uppercase tracking-wider">
                    COLLISION ALERT
                  </span>
                  <span className="text-[10px] font-mono text-[var(--accent-danger)] tabular-nums block mt-0.5">
                    Day {result.collisionDay}
                  </span>
                  <span className="text-[9px] text-[var(--text-tertiary)] block mt-1">
                    Shortfall: {CURRENCY.format(result.shortfallAmount)}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-lg font-bold font-mono text-[var(--accent-safe)] uppercase tracking-wider flex items-center gap-1">
                    <ArrowUpRight className="w-4 h-4" />
                    RUNWAY SAFE
                  </span>
                  <span className="text-[10px] font-mono text-[var(--accent-safe)] tabular-nums block mt-0.5">
                    Buffer: {CURRENCY.format(result.cashBufferAtArrival)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ROW 2: Two Column Layout */}
        <div className="grid grid-cols-2 gap-4">
          {/* Smart Payment-Term Fixer */}
          <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              Smart Payment-Term Fixer
            </span>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 border border-[var(--border-hairline)] p-2.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">Current Terms</span>
                <p className="text-xs font-mono text-[var(--text-primary)] mt-1">
                  Net-{input.paymentTermDays} Days
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">100% on maturity</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
              <div className="flex-1 border p-2.5" style={{ borderColor: riskColor }}>
                <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: riskColor }}>
                  {result.recommendedTerms.badgeLabel}
                </span>
                <p className="text-xs font-mono text-[var(--text-primary)] mt-1">
                  {result.recommendedTerms.upfrontPercent}% Upfront + {result.recommendedTerms.onDeliveryPercent}% Delivery + Net-{result.recommendedTerms.netTermDays}
                </p>
              </div>
            </div>

            <div className="mt-3 p-2.5 bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[var(--text-muted)]">Exposure Reduction</span>
                <span className="text-sm font-bold font-mono tabular-nums text-[var(--accent-safe)]">
                  -{result.recommendedTerms.exposureReductionPercent}%
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">
                {result.recommendedTerms.rationale}
              </p>
            </div>

            <button
              onClick={handleCopyClause}
              className="mt-3 w-full py-1.5 border border-[var(--border-hairline)] text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-[var(--accent-safe)]" /> : <Copy className="w-3 h-3" />}
              {copied ? 'COPIED TO CLIPBOARD' : 'COPY CONTRACT CLAUSE'}
            </button>
          </div>

          {/* SHAP Attribution */}
          <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              SHAP Explainability
            </span>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1 mb-3">
              Feature drivers pushing risk up (red) or down (green)
            </p>
            <div className="space-y-3">
              {result.topShapFactors.slice(0, 4).map((factor, idx) => {
                const maxImpact = Math.max(...result.topShapFactors.map(f => f.impactScore), 1);
                const barWidth = (factor.impactScore / maxImpact) * 100;
                const isIncrease = factor.direction === 'RISK_INCREASE';
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-[var(--text-muted)]">{factor.factor}</span>
                      <span className="font-mono tabular-nums" style={{ color: isIncrease ? 'var(--accent-danger)' : 'var(--accent-safe)' }}>
                        {isIncrease ? '+' : '-'}{factor.impactScore.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[var(--bg-elevated)]">
                      <div className="h-full" style={{ width: `${barWidth}%`, backgroundColor: isIncrease ? 'var(--accent-danger)' : 'var(--accent-safe)' }} />
                    </div>
                    <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5 leading-relaxed">{factor.explanation}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ROW 3: Live FRED Macro Ticker */}
        <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-2.5 flex items-center gap-4">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">Live FRED Macro</span>
          <div className="w-px h-4 bg-[var(--border-hairline)]" />
          <span className="text-[10px] font-mono tabular-nums text-[var(--text-primary)]">
            BAA10Y Spread: <span className="text-[var(--accent-warn)]">{result.liveSpread.toFixed(2)}%</span>
          </span>
          <div className="w-px h-4 bg-[var(--border-hairline)]" />
          <span className="text-[10px] font-mono tabular-nums text-[var(--text-primary)]">
            Biz Loan Delinq: <span style={{ color: result.liveDelinquency > 1.5 ? 'var(--accent-danger)' : 'var(--accent-safe)' }}>{result.liveDelinquency.toFixed(2)}%</span>
          </span>
          <div className="w-px h-4 bg-[var(--border-hairline)]" />
          <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
            Stress: {input.macroStressMultiplier.toFixed(1)}x
          </span>
        </div>
      </div>
    </div>
  );
};

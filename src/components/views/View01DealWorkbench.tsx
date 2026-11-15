import React from 'react';
import {
  Calendar,
  DollarSign,
  TrendingDown,
  ShieldAlert,
  BarChart3,
  AlertTriangle,
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

export const View01DealWorkbench: React.FC<View01DealWorkbenchProps> = ({
  input,
  onInputChange,
  result,
  onLoadScenario,
}) => {
  const currencySymbol = '₹';

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN').format(Math.round(val));

  const riskColor =
    result.blendedRiskPercent < 30
      ? 'var(--accent-safe)'
      : result.blendedRiskPercent < 60
        ? 'var(--accent-warn)'
        : 'var(--accent-danger)';

  const handleScenarioClick = (id: string) => {
    const preset = SCENARIO_PRESETS.find((s) => s.id === id);
    if (preset) onLoadScenario(preset);
  };

  return (
    <div className="flex h-full">
      {/* LEFT PANEL: Deal Parameters (360px) */}
      <div className="w-[360px] border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-y-auto shrink-0">
        <div className="p-4 space-y-4">
          {/* Section Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hairline)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              Deal Parameters
            </span>
            <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
              Real-Time
            </span>
          </div>

          {/* Scenario Quick-Load */}
          <div className="space-y-1.5">
            {SCENARIO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleScenarioClick(preset.id)}
                className="w-full text-left p-2.5 border border-[var(--border-hairline)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[var(--text-primary)]">
                    {preset.name}
                  </span>
                  <span
                    className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border"
                    style={{
                      color:
                        preset.badgeType === 'emerald'
                          ? 'var(--accent-safe)'
                          : preset.badgeType === 'amber'
                            ? 'var(--accent-warn)'
                            : preset.badgeType === 'rose'
                              ? 'var(--accent-danger)'
                              : 'var(--accent-info)',
                      borderColor:
                        preset.badgeType === 'emerald'
                          ? 'var(--accent-safe)'
                          : preset.badgeType === 'amber'
                            ? 'var(--accent-warn)'
                            : preset.badgeType === 'rose'
                              ? 'var(--accent-danger)'
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
                {currencySymbol}{formatINR(input.invoiceAmount)}
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-[11px] text-[var(--text-tertiary)]">
                {currencySymbol}
              </span>
              <input
                type="number"
                value={input.invoiceAmount || ''}
                onChange={(e) =>
                  onInputChange({ invoiceAmount: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hairline)] py-1.5 pl-7 pr-2.5 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--border-subtle)] focus:outline-none"
                placeholder="e.g. 125000"
              />
            </div>
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
              <span className="text-[var(--text-muted)] flex items-center space-x-1">
                <span>Counterparty Age</span>
              </span>
              <span className="font-mono text-xs text-[var(--text-primary)] tabular-nums">
                {input.customerTenureMonths} Mo
                {input.customerTenureMonths < 12 && (
                  <span className="text-[9px] text-[var(--accent-info)] ml-1">
                    (Thin-File)
                  </span>
                )}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="120"
              value={input.customerTenureMonths}
              onChange={(e) =>
                onInputChange({ customerTenureMonths: parseInt(e.target.value, 10) })
              }
              className="w-full h-1.5 bg-[var(--bg-elevated)] rounded cursor-pointer appearance-none"
              style={{ accentColor: 'var(--accent-primary)' }}
            />
          </div>

          {/* Slider: Past Late Rate */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[var(--text-muted)]">Past Late Rate</span>
              <span className="font-mono text-xs text-[var(--text-primary)] tabular-nums">
                {input.pastLatePercent}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={input.pastLatePercent}
              onChange={(e) =>
                onInputChange({ pastLatePercent: parseInt(e.target.value, 10) })
              }
              className="w-full h-1.5 bg-[var(--bg-elevated)] rounded cursor-pointer appearance-none"
              style={{ accentColor: 'var(--accent-warn)' }}
            />
          </div>

          {/* Slider: Order Size */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[var(--text-muted)]">Order Size vs Average</span>
              <span className="font-mono text-xs text-[var(--text-primary)] tabular-nums">
                {input.orderSizeVsAvg.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={input.orderSizeVsAvg}
              onChange={(e) =>
                onInputChange({ orderSizeVsAvg: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-[var(--bg-elevated)] rounded cursor-pointer appearance-none"
              style={{ accentColor: 'var(--accent-danger)' }}
            />
          </div>

          {/* Slider: Avg Delay */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[var(--text-muted)]">Avg Historical Delay</span>
              <span className="font-mono text-xs text-[var(--text-primary)] tabular-nums">
                {input.pastAvgDelayDays} d
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="45"
              step="1"
              value={input.pastAvgDelayDays}
              onChange={(e) =>
                onInputChange({ pastAvgDelayDays: parseInt(e.target.value, 10) })
              }
              className="w-full h-1.5 bg-[var(--bg-elevated)] rounded cursor-pointer appearance-none"
              style={{ accentColor: 'var(--accent-primary)' }}
            />
          </div>

          {/* Due Weekday Selector */}
          <div>
            <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-[var(--text-tertiary)]" />
                <span>Due Weekday</span>
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">
                Affects banking clearance
              </span>
            </label>
            <div className="grid grid-cols-7 gap-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                const isWarningDay = day === 'Mon' || day === 'Sat' || day === 'Sun';
                const isSelected = input.dueWeekday === day;
                return (
                  <button
                    key={day}
                    onClick={() => onInputChange({ dueWeekday: day as any })}
                    className={`py-1.5 text-[10px] font-mono border transition-colors ${
                      isSelected
                        ? 'border-[var(--accent-primary)]/40 text-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                        : isWarningDay
                          ? 'border-[var(--accent-danger)]/30 text-[var(--accent-danger)] hover:border-[var(--accent-danger)]/60'
                          : 'border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            {(input.dueWeekday === 'Mon' ||
              input.dueWeekday === 'Sat' ||
              input.dueWeekday === 'Sun') && (
              <div className="flex items-center space-x-1.5 mt-2 p-2 bg-[var(--accent-danger)]/5 border border-[var(--accent-danger)]/20">
                <AlertTriangle className="w-3 h-3 text-[var(--accent-danger)] shrink-0" />
                <span className="text-[10px] text-[var(--accent-danger)]">
                  {input.dueWeekday === 'Mon'
                    ? 'Mondays have highest banking clearance delays (+0.28d)'
                    : input.dueWeekday === 'Sat'
                      ? 'Saturday invoices clear only on Monday'
                      : 'Sunday invoices clear only on Monday'}
                </span>
              </div>
            )}
          </div>

          {/* FRED Macro Stress */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[var(--text-muted)]">FRED Macro Stress</span>
              <span className="font-mono text-xs text-[var(--accent-primary)] tabular-nums">
                {input.macroStressMultiplier.toFixed(1)}x
                {input.macroStressMultiplier >= 1.5
                  ? ' (Recession)'
                  : ' (Normal)'}
              </span>
            </div>
            <input
              type="range"
              min="0.8"
              max="2.0"
              step="0.1"
              value={input.macroStressMultiplier}
              onChange={(e) =>
                onInputChange({
                  macroStressMultiplier: parseFloat(e.target.value),
                })
              }
              className="w-full h-1.5 bg-[var(--bg-elevated)] rounded cursor-pointer appearance-none"
              style={{ accentColor: 'var(--accent-primary)' }}
            />
          </div>

          {/* Financial Inputs */}
          <div className="pt-3 border-t border-[var(--border-hairline)] space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center space-x-1.5">
              <DollarSign className="w-3.5 h-3.5 text-[var(--accent-safe)]" />
              <span>Cash Runway Inputs</span>
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-1">
                  Bank Balance
                </label>
                <input
                  type="number"
                  value={input.currentBankBalance || ''}
                  onChange={(e) =>
                    onInputChange({ currentBankBalance: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hairline)] py-1.5 px-2.5 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--border-subtle)] focus:outline-none"
                  placeholder="250000"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-1">
                  Monthly Burn
                </label>
                <input
                  type="number"
                  value={input.monthlyFixedExpenses || ''}
                  onChange={(e) =>
                    onInputChange({
                      monthlyFixedExpenses: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hairline)] py-1.5 px-2.5 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--border-subtle)] focus:outline-none"
                  placeholder="160000"
                />
              </div>
            </div>
          </div>

          {/* GST Toggle */}
          <div className="pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-muted)] flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <span>GST Registered</span>
            </span>
            <button
              onClick={() => onInputChange({ gstRegistered: !input.gstRegistered })}
              className={`px-3 py-1 text-[10px] font-mono border transition-colors ${
                input.gstRegistered
                  ? 'bg-[var(--accent-safe)]/10 border-[var(--accent-safe)]/40 text-[var(--accent-safe)]'
                  : 'bg-[var(--bg-elevated)] border-[var(--border-hairline)] text-[var(--text-muted)]'
              }`}
            >
              {input.gstRegistered ? 'YES' : 'NO'}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ROW 1: KPI Strip */}
        <div className="grid grid-cols-4 divide-x divide-[var(--border-hairline)] border border-[var(--border-hairline)]">
          {/* KPI 1: Unified Risk */}
          <div className="p-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
              Blended Risk
            </span>
            <div className="mt-1 flex items-baseline space-x-2">
              <span
                className="text-3xl font-bold font-mono tabular-nums"
                style={{ color: riskColor }}
              >
                {result.blendedRiskPercent.toFixed(1)}
              </span>
              <span className="text-xs text-[var(--text-muted)]">%</span>
            </div>
            <span
              className="inline-block mt-1.5 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border"
              style={{
                color: riskColor,
                borderColor: riskColor,
              }}
            >
              {result.blendedRiskPercent < 30
                ? 'LOW'
                : result.blendedRiskPercent < 60
                  ? 'MODERATE'
                  : 'HIGH'}
            </span>
          </div>

          {/* KPI 2: Arrival Window */}
          <div className="p-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
              Arrival Window
            </span>
            <div className="mt-2">
              <div className="flex items-baseline space-x-1">
                <span className="text-lg font-bold font-mono tabular-nums text-[var(--text-primary)]">
                  D{result.arrivalWindowLow}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">to</span>
                <span className="text-lg font-bold font-mono tabular-nums text-[var(--text-primary)]">
                  D{result.arrivalWindowHigh}
                </span>
              </div>
              {/* Bullet bar for P20-P80 window */}
              <div className="mt-2 h-1.5 bg-[var(--bg-elevated)] relative">
                <div
                  className="absolute h-full bg-[var(--accent-primary)]/60"
                  style={{
                    left: `${(result.arrivalWindowLow / Math.max(result.arrivalWindowHigh, 1)) * 100}%`,
                    width: `${((result.arrivalWindowHigh - result.arrivalWindowLow) / Math.max(result.arrivalWindowHigh, 1)) * 100}%`,
                  }}
                />
                <div
                  className="absolute w-1.5 h-1.5 bg-[var(--accent-primary)] -top-[2px]"
                  style={{
                    left: `calc(${(result.expectedArrivalDay / Math.max(result.arrivalWindowHigh, 1)) * 100}% - 3px)`,
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-[var(--text-tertiary)] mt-1 block tabular-nums">
                Expected: D{result.expectedArrivalDay}
              </span>
            </div>
          </div>

          {/* KPI 3: Cash at Risk */}
          <div className="p-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
              Cash at Risk
            </span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-lg font-bold font-mono tabular-nums text-[var(--text-primary)]">
                {currencySymbol}
              </span>
              <span className="text-2xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
                {formatINR(result.totalAtRisk)}
              </span>
            </div>
            <div className="mt-2 space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-[var(--text-tertiary)]">GST Locked</span>
                <span className="font-mono tabular-nums text-[var(--text-primary)]">
                  {formatINR(result.gstItcLocked)}
                </span>
              </div>
              {result.shortfallAmount > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-[var(--accent-danger)]">Shortfall</span>
                  <span className="font-mono tabular-nums text-[var(--accent-danger)]">
                    {formatINR(result.shortfallAmount)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* KPI 4: Runway Verdict */}
          <div className="p-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
              Runway
            </span>
            <div className="mt-2">
              {result.isRunwayCollision ? (
                <div className="space-y-1">
                  <span className="text-lg font-bold font-mono text-[var(--accent-danger)] uppercase tracking-wider">
                    COLLISION
                  </span>
                  {result.collisionDay !== null && (
                    <span className="text-[10px] font-mono text-[var(--accent-danger)] tabular-nums block">
                      Day {result.collisionDay}
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-lg font-bold font-mono text-[var(--accent-safe)] uppercase tracking-wider">
                    SAFE
                  </span>
                  <span className="text-[10px] font-mono text-[var(--accent-safe)] tabular-nums block">
                    Buffer: {formatINR(result.cashBufferAtArrival)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ROW 2: Two Columns */}
        <div className="grid grid-cols-2 gap-4">
          {/* Smart Payment-Term Fixer */}
          <div className="border border-[var(--border-hairline)] p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center space-x-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Smart Term Fixer</span>
            </span>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 border"
                  style={{
                    color:
                      result.recommendedTerms.tier === 'APPROVED'
                        ? 'var(--accent-safe)'
                        : result.recommendedTerms.tier === 'MODERATE_RISK'
                          ? 'var(--accent-warn)'
                          : 'var(--accent-danger)',
                    borderColor:
                      result.recommendedTerms.tier === 'APPROVED'
                        ? 'var(--accent-safe)'
                        : result.recommendedTerms.tier === 'MODERATE_RISK'
                          ? 'var(--accent-warn)'
                          : 'var(--accent-danger)',
                  }}
                >
                  {result.recommendedTerms.tier}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  {result.recommendedTerms.badgeLabel}
                </span>
              </div>

              <div className="space-y-2 text-[11px] text-[var(--text-muted)]">
                <div className="flex justify-between">
                  <span>Upfront Payment</span>
                  <span className="font-mono tabular-nums text-[var(--text-primary)]">
                    {result.recommendedTerms.upfrontPercent}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>On Delivery</span>
                  <span className="font-mono tabular-nums text-[var(--text-primary)]">
                    {result.recommendedTerms.onDeliveryPercent}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Net Term</span>
                  <span className="font-mono tabular-nums text-[var(--text-primary)]">
                    Net-{result.recommendedTerms.netTermDays}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Exposure Reduction</span>
                  <span className="font-mono tabular-nums text-[var(--accent-safe)]">
                    -{result.recommendedTerms.exposureReductionPercent}%
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border-hairline)]">
                <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                  {result.recommendedTerms.rationale}
                </p>
              </div>
            </div>
          </div>

          {/* SHAP Attribution */}
          <div className="border border-[var(--border-hairline)] p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center space-x-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>SHAP Attribution</span>
            </span>
            <div className="mt-3 space-y-3">
              {result.topShapFactors.slice(0, 4).map((factor, idx) => {
                const maxImpact = Math.max(
                  ...result.topShapFactors.map((f) => f.impactScore)
                );
                const pct = maxImpact > 0 ? (factor.impactScore / maxImpact) * 100 : 0;
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-[var(--text-muted)]">{factor.factor}</span>
                      <span
                        className="font-mono tabular-nums"
                        style={{
                          color:
                            factor.direction === 'RISK_INCREASE'
                              ? 'var(--accent-danger)'
                              : 'var(--accent-safe)',
                        }}
                      >
                        {factor.direction === 'RISK_INCREASE' ? '+' : '-'}
                        {factor.impactScore.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-1 bg-[var(--bg-elevated)]">
                      <div
                        className="h-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor:
                            factor.direction === 'RISK_INCREASE'
                              ? 'var(--accent-danger)'
                              : 'var(--accent-safe)',
                        }}
                      />
                    </div>
                    <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
                      {factor.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

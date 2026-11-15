import React from 'react';
import type { DealInput, CurrencyMode, IntegrityWarning, DueDayOfWeek } from '../types';
import { AlertTriangle, AlertOctagon, Sliders, Calendar, DollarSign, Building2 } from 'lucide-react';

interface DealParametersFormProps {
  input: DealInput;
  currency: CurrencyMode;
  onChange: (updated: Partial<DealInput>) => void;
  warnings: IntegrityWarning[];
}

export const DealParametersForm: React.FC<DealParametersFormProps> = ({
  input,
  currency,
  onChange,
  warnings
}) => {
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US').format(val);
  };

  return (
    <div className="bg-canvas-panel border border-canvas-border rounded p-4 flex flex-col space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-status-sky" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
            Deal Parameters & Counterparty Profile
          </h2>
        </div>
        <span className="text-[10px] font-mono text-brand-tertiary">Real-Time Ingestion</span>
      </div>

      {/* Anomaly Warnings Block */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded border text-xs flex items-start space-x-2 ${
                w.severity === 'CRITICAL'
                  ? 'bg-status-rose/10 border-status-rose/30 text-status-rose'
                  : 'bg-status-amber/10 border-status-amber/30 text-status-amber'
              }`}
            >
              {w.severity === 'CRITICAL' ? (
                <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-semibold">{w.title}: </span>
                <span className="text-[11px] opacity-90">{w.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Primary Deal Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Invoice Amount */}
        <div>
          <label className="text-[11px] font-medium text-brand-muted mb-1 flex items-center justify-between">
            <span>Invoice Principal</span>
            <span className="font-mono text-brand-primary tabular-nums">
              {currencySymbol}{formatNumber(input.invoiceAmount)}
            </span>
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-2 text-xs text-brand-tertiary">{currencySymbol}</span>
            <input
              type="number"
              value={input.invoiceAmount || ''}
              onChange={(e) => onChange({ invoiceAmount: parseFloat(e.target.value) || 0 })}
              className="w-full bg-canvas-card border border-canvas-border rounded py-1.5 pl-7 pr-2.5 text-xs font-mono text-brand-primary focus:border-canvas-focused focus:outline-none"
              placeholder="e.g. 125000"
            />
          </div>
        </div>

        {/* Promised Payment Term */}
        <div>
          <label className="text-[11px] font-medium text-brand-muted mb-1 flex items-center justify-between">
            <span>Promised Terms</span>
            <span className="font-mono text-brand-primary tabular-nums">
              Net-{input.paymentTermDays} Days
            </span>
          </label>
          <div className="flex space-x-1.5">
            {[15, 30, 45, 60].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onChange({ paymentTermDays: days })}
                className={`flex-1 py-1.5 text-[10px] font-mono rounded border ${
                  input.paymentTermDays === days
                    ? 'bg-status-sky/15 border-status-sky/40 text-status-sky font-semibold'
                    : 'bg-canvas-card border-canvas-border text-brand-muted hover:text-brand-primary'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Slider: Customer Operating History */}
      <div>
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-brand-muted flex items-center space-x-1">
            <Building2 className="w-3 h-3 text-brand-tertiary" />
            <span>Counterparty Operating Age</span>
          </span>
          <span className="font-mono text-xs text-brand-primary tabular-nums">
            {input.customerTenureMonths} Months{' '}
            {input.customerTenureMonths < 12 ? (
              <span className="text-[10px] text-status-sky font-sans ml-1">(Thin-File)</span>
            ) : null}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="120"
          value={input.customerTenureMonths}
          onChange={(e) => onChange({ customerTenureMonths: parseInt(e.target.value, 10) })}
          className="w-full accent-status-sky h-1.5 bg-canvas-card rounded cursor-pointer"
        />
        <div className="flex justify-between text-[9px] font-mono text-brand-tertiary mt-0.5">
          <span>1 Month</span>
          <span>12 Mo (Startup Threshold)</span>
          <span>120 Months</span>
        </div>
      </div>

      {/* Slider: Historical Late Rate */}
      <div>
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-brand-muted">Past Late Payment Rate</span>
          <span className="font-mono text-xs text-brand-primary tabular-nums">
            {input.pastLatePercent}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={input.pastLatePercent}
          onChange={(e) => onChange({ pastLatePercent: parseInt(e.target.value, 10) })}
          className="w-full accent-status-amber h-1.5 bg-canvas-card rounded cursor-pointer"
        />
        <div className="flex justify-between text-[9px] font-mono text-brand-tertiary mt-0.5">
          <span>0% Clean</span>
          <span>50% Delinquent</span>
          <span>100% Chronic Late</span>
        </div>
      </div>

      {/* Slider: Order Size Spike Ratio */}
      <div>
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-brand-muted">Order Size vs Usual Average</span>
          <span className="font-mono text-xs text-brand-primary tabular-nums">
            {input.orderSizeVsAvg.toFixed(1)}x normal volume
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="5.0"
          step="0.1"
          value={input.orderSizeVsAvg}
          onChange={(e) => onChange({ orderSizeVsAvg: parseFloat(e.target.value) })}
          className="w-full accent-status-rose h-1.5 bg-canvas-card rounded cursor-pointer"
        />
        <div className="flex justify-between text-[9px] font-mono text-brand-tertiary mt-0.5">
          <span>0.5x Baseline</span>
          <span>2.0x Spike</span>
          <span>5.0x Surge (Anomaly Risk)</span>
        </div>
      </div>

      {/* Slider: Past Average Delay */}
      <div>
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-brand-muted">Past Average Delay Overdue</span>
          <span className="font-mono text-xs text-brand-primary tabular-nums">
            {input.pastAvgDelayDays} Days
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="45"
          step="1"
          value={input.pastAvgDelayDays}
          onChange={(e) => onChange({ pastAvgDelayDays: parseInt(e.target.value, 10) })}
          className="w-full accent-brand-muted h-1.5 bg-canvas-card rounded cursor-pointer"
        />
      </div>

      {/* Due Day of Week */}
      <div>
        <label className="text-[11px] font-medium text-brand-muted mb-1 flex items-center justify-between">
          <span className="flex items-center space-x-1">
            <Calendar className="w-3 h-3 text-brand-tertiary" />
            <span>Invoice Due Day of Week</span>
          </span>
          <span className="text-[10px] text-brand-tertiary">Affects banking clearance</span>
        </label>
        <select
          value={input.dueWeekday}
          onChange={(e) => onChange({ dueWeekday: e.target.value as DueDayOfWeek })}
          className="w-full bg-canvas-card border border-canvas-border rounded py-1.5 px-2.5 text-xs font-mono text-brand-primary focus:border-canvas-focused focus:outline-none"
        >
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <option key={day} value={day} className="bg-canvas-card text-brand-primary">
              {day} {day === 'Mon' || day === 'Sun' ? '(Higher Clearing Delay)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Financial Health Section */}
      <div className="pt-3 border-t border-canvas-border space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-primary flex items-center space-x-1.5">
          <DollarSign className="w-3.5 h-3.5 text-status-emerald" />
          <span>Your Startup Cash Runway Inputs</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-brand-muted mb-1">
              Current Bank Balance
            </label>
            <input
              type="number"
              value={input.currentBankBalance || ''}
              onChange={(e) => onChange({ currentBankBalance: parseFloat(e.target.value) || 0 })}
              className="w-full bg-canvas-card border border-canvas-border rounded py-1.5 px-2.5 text-xs font-mono text-brand-primary focus:border-canvas-focused focus:outline-none"
              placeholder="e.g. 250000"
            />
          </div>

          <div>
            <label className="block text-[10px] text-brand-muted mb-1">
              Monthly Fixed Expenses
            </label>
            <input
              type="number"
              value={input.monthlyFixedExpenses || ''}
              onChange={(e) => onChange({ monthlyFixedExpenses: parseFloat(e.target.value) || 0 })}
              className="w-full bg-canvas-card border border-canvas-border rounded py-1.5 px-2.5 text-xs font-mono text-brand-primary focus:border-canvas-focused focus:outline-none"
              placeholder="e.g. 180000"
            />
          </div>
        </div>
      </div>

      {/* Macroeconomic Stress Slider */}
      <div className="pt-3 border-t border-canvas-border">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-brand-muted">FRED Macro Stress Multiplier</span>
          <span className="font-mono text-xs text-status-sky tabular-nums">
            {input.macroStressMultiplier.toFixed(1)}x {input.macroStressMultiplier >= 1.5 ? '(Recession Crash)' : '(Normal)'}
          </span>
        </div>
        <input
          type="range"
          min="0.8"
          max="2.0"
          step="0.1"
          value={input.macroStressMultiplier}
          onChange={(e) => onChange({ macroStressMultiplier: parseFloat(e.target.value) })}
          className="w-full accent-status-sky h-1.5 bg-canvas-card rounded cursor-pointer"
        />
      </div>
    </div>
  );
};

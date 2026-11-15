import React, { useState } from 'react';
import type { RiskEvaluationResult, CurrencyMode } from '../types';
import { Flame, AlertTriangle, Shield, CheckCircle2, SlidersHorizontal, Calculator } from 'lucide-react';

interface RunwayCollisionRightProps {
  result: RiskEvaluationResult;
  currency: CurrencyMode;
  monthlyExpenses: number;
  bankBalance: number;
  gstRegistered: boolean;
}

export const RunwayCollisionRight: React.FC<RunwayCollisionRightProps> = ({
  result,
  currency,
  monthlyExpenses,
  bankBalance,
  gstRegistered
}) => {
  const [whatIfDelay, setWhatIfDelay] = useState(0);

  const currencySymbol = currency === 'INR' ? '₹' : '$';
  const formatNumber = (val: number) => {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US').format(Math.round(val));
  };

  const dailyBurn = monthlyExpenses / 30.0;
  const simulatedArrivalDay = result.expectedArrivalDay + whatIfDelay;
  const simulatedCashBeforeArrival = bankBalance - (dailyBurn * simulatedArrivalDay);
  const isSimulatedCollision = simulatedCashBeforeArrival < 0;
  const simulatedCollisionDay = isSimulatedCollision
    ? Math.max(1, Math.floor(bankBalance / Math.max(dailyBurn, 1)))
    : null;
  const simulatedShortfall = isSimulatedCollision ? Math.abs(simulatedCashBeforeArrival) : 0;
  const simulatedBuffer = isSimulatedCollision ? 0 : simulatedCashBeforeArrival;

  return (
    <div className="space-y-4">
      {/* 1. 60-Day Runway Collision Matrix */}
      <div className="bg-canvas-panel border border-canvas-border rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-status-rose" />
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
              60-Day Cash-Flow Runway Matrix
            </span>
          </div>
          <span className="text-[10px] font-mono text-brand-tertiary">
            Burn: {currencySymbol}{formatNumber(dailyBurn)}/day
          </span>
        </div>

        {/* Primary Collision Status Card */}
        <div
          className={`p-3.5 rounded border mb-3 ${
            isSimulatedCollision
              ? 'bg-status-rose/10 border-status-rose/40 text-status-rose'
              : 'bg-status-emerald/10 border-status-emerald/40 text-status-emerald'
          }`}
        >
          <div className="flex items-start space-x-2">
            {isSimulatedCollision ? (
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold text-xs mb-1">
                {isSimulatedCollision
                  ? `Cash Collision Warning on Day ${simulatedCollisionDay}`
                  : `Runway Safe Buffer Preserved`}
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed font-sans">
                {isSimulatedCollision
                  ? `Bank balance runs dry on Day ${simulatedCollisionDay} before cash arrives on Day ${simulatedArrivalDay}. Projected liquidity deficit: ${currencySymbol}${formatNumber(
                      simulatedShortfall
                    )}.`
                  : `Operating cash flow remains positive. Estimated liquidity buffer of ${currencySymbol}${formatNumber(
                      simulatedBuffer
                    )} remaining upon expected payment arrival.`}
              </p>
            </div>
          </div>
        </div>

        {/* Interactive "What-If Extra Delay" Slider */}
        <div className="p-3 rounded bg-canvas-card border border-canvas-border">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-brand-primary flex items-center space-x-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-brand-tertiary" />
              <span>What-If Extra Delay Slider</span>
            </span>
            <span className="font-mono text-status-sky tabular-nums font-semibold">
              +{whatIfDelay} Days Delay
            </span>
          </div>
          <p className="text-[10px] text-brand-muted mb-2">
            Simulate if client payment slips further past AI predictions.
          </p>
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={whatIfDelay}
            onChange={(e) => setWhatIfDelay(parseInt(e.target.value, 10))}
            className="w-full accent-status-sky h-1.5 bg-canvas-panel rounded cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-mono text-brand-tertiary mt-1">
            <span>+0 Days</span>
            <span>+15 Days</span>
            <span>+30 Days</span>
          </div>
        </div>
      </div>

      {/* 2. GST & Tax Lockup Shield Card */}
      <div className="bg-canvas-panel border border-canvas-border rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-status-sky" />
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
              GST & Tax Lockup Exposure
            </span>
          </div>
          <span className="text-[10px] font-mono text-brand-tertiary">Indian MSME Shield</span>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="p-2.5 rounded bg-canvas-card border border-canvas-border flex items-center justify-between">
            <span className="text-brand-muted">Input Tax Credit (ITC) at Risk (18%):</span>
            <span className="font-mono font-semibold text-brand-primary tabular-nums">
              {gstRegistered ? `${currencySymbol}${formatNumber(result.gstItcLocked)}` : 'OFF'}
            </span>
          </div>

          <div className="p-2.5 rounded bg-canvas-card border border-canvas-border flex items-center justify-between">
            <div>
              <span className="text-brand-primary font-medium block">Total Expected Capital at Risk:</span>
              <span className="text-[10px] text-brand-tertiary block">
                {gstRegistered ? 'Principal + Blocked Tax Credit' : 'Principal Exposure Only'}
              </span>
            </div>
            <span className="font-mono font-bold text-sm text-status-rose tabular-nums">
              {currencySymbol}{formatNumber(result.totalAtRisk)}
            </span>
          </div>

          <p className="text-[10px] text-brand-tertiary leading-relaxed pt-1">
            Under Section 16(2)(c) of CGST Act, buyers cannot claim ITC unless the supplier deposits tax. If unverified vendors default, 18% capital freezes permanently.
          </p>
        </div>
      </div>

      {/* 3. Underwriting Summary Card */}
      <div className="bg-canvas-panel border border-canvas-border rounded p-4">
        <div className="flex items-center space-x-2 mb-2 text-xs font-semibold uppercase tracking-wider text-brand-primary">
          <Calculator className="w-4 h-4 text-status-sky" />
          <span>Underwriting Summary</span>
        </div>
        <div className="space-y-1.5 text-xs font-mono text-brand-muted">
          <div className="flex justify-between py-1 border-b border-canvas-border/50">
            <span>Model Recommendation:</span>
            <span className="text-brand-primary font-semibold">
              {result.recommendedTerms.tier === 'APPROVED' ? 'Standard Terms' : 'Restructure Deal'}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-canvas-border/50">
            <span>Required Upfront Capital:</span>
            <span className="text-status-emerald font-semibold">
              {result.recommendedTerms.upfrontPercent}%
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span>Exposure Reduction Delta:</span>
            <span className="text-status-sky font-semibold">
              {result.recommendedTerms.exposureReductionPercent}% Less Exposure
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

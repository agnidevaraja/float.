import React, { useState } from 'react';
import type { RiskEvaluationResult } from '../types';
import { Activity, Clock, ShieldCheck, Check, Copy, ArrowRight, TrendingUp } from 'lucide-react';

interface RiskArrivalCenterProps {
  result: RiskEvaluationResult;
  promisedDays: number;
}

export const RiskArrivalCenter: React.FC<RiskArrivalCenterProps> = ({
  result,
  promisedDays
}) => {
  const [copiedClause, setCopiedClause] = useState(false);

  const handleCopyClause = () => {
    navigator.clipboard.writeText(result.recommendedTerms.contractClause);
    setCopiedClause(true);
    setTimeout(() => setCopiedClause(false), 2000);
  };

  // Determine color theme for risk index
  let riskColorClass = 'text-status-emerald border-status-emerald/30 bg-status-emerald/10';
  let riskBarBg = 'bg-status-emerald';
  if (result.blendedRiskPercent >= 60) {
    riskColorClass = 'text-status-rose border-status-rose/30 bg-status-rose/10';
    riskBarBg = 'bg-status-rose';
  } else if (result.blendedRiskPercent >= 30) {
    riskColorClass = 'text-status-amber border-status-amber/30 bg-status-amber/10';
    riskBarBg = 'bg-status-amber';
  }

  // Calculate arrival delay delta
  const delayDelta = result.expectedArrivalDay - promisedDays;

  return (
    <div className="space-y-4">
      {/* 1. Unified Risk Score Card */}
      <div className="bg-canvas-panel border border-canvas-border rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-status-sky" />
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
              Unified Default & Delay Risk Index
            </span>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${riskColorClass}`}>
            {result.recommendedTerms.badgeLabel}
          </span>
        </div>

        <div className="flex items-baseline space-x-3 mb-3">
          <span className="text-3xl font-mono font-bold text-brand-primary tabular-nums">
            {result.blendedRiskPercent.toFixed(1)}%
          </span>
          <span className="text-xs text-brand-muted">
            Probability of Severe Invoice Delay or Default
          </span>
        </div>

        {/* Multi-Dataset Model Breakdown */}
        <div className="pt-3 border-t border-canvas-border">
          <div className="text-[10px] font-mono uppercase text-brand-tertiary mb-2">
            6-Source Ensemble Contributions (374,284 Total Records • 59 Features)
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded bg-canvas-card border border-canvas-border">
              <span className="block text-[9px] text-brand-tertiary">B2B + Macro (60%)</span>
              <span className="font-mono font-semibold text-brand-primary tabular-nums">
                {result.b2bMacroRiskPercent.toFixed(1)}%
              </span>
            </div>
            <div className="p-2 rounded bg-canvas-card border border-canvas-border">
              <span className="block text-[9px] text-brand-tertiary">UCI Credit (25%)</span>
              <span className="font-mono font-semibold text-brand-primary tabular-nums">
                {result.creditDefaultRiskPercent.toFixed(1)}%
              </span>
            </div>
            <div className="p-2 rounded bg-canvas-card border border-canvas-border">
              <span className="block text-[9px] text-brand-tertiary">OpenML Fraud (15%)</span>
              <span className="font-mono font-semibold text-brand-primary tabular-nums">
                {result.fraudSpikeRiskPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quantile Cash Arrival Timeline Card */}
      <div className="bg-canvas-panel border border-canvas-border rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-status-sky" />
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
              Day-by-Day Cash Arrival Predictor
            </span>
          </div>
          <span className="text-[10px] font-mono text-brand-tertiary">Quantile Survival Model</span>
        </div>

        <div className="p-3 rounded bg-canvas-card border border-canvas-border mb-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <div>
              <span className="text-brand-tertiary block text-[10px]">Promised Terms</span>
              <span className="font-mono font-bold text-brand-primary">Day {promisedDays}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-brand-tertiary" />
            <div className="text-right">
              <span className="text-brand-tertiary block text-[10px]">Predicted Cash Arrival</span>
              <span className="font-mono font-bold text-status-sky">
                Day {result.expectedArrivalDay}
              </span>
              <span className="text-[10px] text-brand-muted block font-mono">
                (Window: Day {result.arrivalWindowLow}-{result.arrivalWindowHigh})
              </span>
            </div>
          </div>

          {/* Graphical Arrival Bar */}
          <div className="relative pt-4 pb-2">
            <div className="h-2 w-full bg-canvas-panel rounded-full relative overflow-hidden">
              <div
                className={`h-full ${riskBarBg} rounded-full`}
                style={{
                  width: `${Math.min(100, (result.expectedArrivalDay / 90) * 100)}%`
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-brand-tertiary mt-1">
              <span>Day 0 (Invoice)</span>
              <span>Day 30</span>
              <span>Day 60</span>
              <span>Day 90+</span>
            </div>
          </div>

          <div className="mt-2 text-[11px] text-brand-muted flex items-center justify-between">
            <span>Timing Verdict:</span>
            <span className="font-mono text-brand-primary">
              {delayDelta <= 0
                ? 'On-Time Payment Expected'
                : `${delayDelta} Days Past Promised Deadline`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Top SHAP Risk Drivers */}
      <div className="bg-canvas-panel border border-canvas-border rounded p-4">
        <div className="flex items-center space-x-2 mb-3">
          <TrendingUp className="w-4 h-4 text-status-sky" />
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
            Key Factors Driving This Score (SHAP Explainability)
          </span>
        </div>

        <div className="space-y-2">
          {result.topShapFactors.slice(0, 3).map((factor, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded bg-canvas-card border border-canvas-border flex items-start justify-between text-xs"
            >
              <div className="space-y-0.5 pr-2">
                <span className="font-medium text-brand-primary block">{factor.factor}</span>
                <span className="text-[11px] text-brand-muted block leading-snug">
                  {factor.explanation}
                </span>
              </div>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                  factor.direction === 'RISK_INCREASE'
                    ? 'text-status-rose border-status-rose/30 bg-status-rose/10'
                    : 'text-status-emerald border-status-emerald/30 bg-status-emerald/10'
                }`}
              >
                {factor.direction === 'RISK_INCREASE' ? '+Risk' : '-Risk'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Smart Payment-Term Restructurer */}
      <div className="bg-canvas-panel border border-canvas-border rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-status-emerald" />
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
              Smart Payment-Term Restructurer
            </span>
          </div>
          <span className="text-[10px] font-mono text-status-emerald">
            Cuts Exposure by {result.recommendedTerms.exposureReductionPercent}%
          </span>
        </div>

        <p className="text-xs text-brand-muted mb-3 leading-relaxed">
          {result.recommendedTerms.rationale}
        </p>

        {/* Milestone Split Badges */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="p-2 rounded bg-canvas-card border border-canvas-border">
            <span className="block text-[9px] text-brand-tertiary">Upfront Deposit</span>
            <span className="font-mono font-bold text-sm text-status-emerald">
              {result.recommendedTerms.upfrontPercent}%
            </span>
          </div>
          <div className="p-2 rounded bg-canvas-card border border-canvas-border">
            <span className="block text-[9px] text-brand-tertiary">On Delivery</span>
            <span className="font-mono font-bold text-sm text-brand-primary">
              {result.recommendedTerms.onDeliveryPercent}%
            </span>
          </div>
          <div className="p-2 rounded bg-canvas-card border border-canvas-border">
            <span className="block text-[9px] text-brand-tertiary">Balance Net Term</span>
            <span className="font-mono font-bold text-sm text-status-sky">
              Net-{result.recommendedTerms.netTermDays}d
            </span>
          </div>
        </div>

        {/* Contract Clause Recommendation */}
        <div className="p-3 rounded bg-canvas-card border border-canvas-border">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="font-semibold text-brand-primary">Recommended Legal SOW Clause:</span>
            <button
              onClick={handleCopyClause}
              className="text-[10px] font-mono px-2 py-0.5 rounded border border-canvas-focused hover:bg-canvas-hover text-brand-muted hover:text-brand-primary flex items-center space-x-1"
            >
              {copiedClause ? (
                <>
                  <Check className="w-3 h-3 text-status-emerald" />
                  <span className="text-status-emerald">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Clause</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs font-mono text-brand-muted bg-canvas-panel p-2 rounded border border-canvas-border leading-relaxed select-all">
            "{result.recommendedTerms.contractClause}"
          </p>
        </div>
      </div>
    </div>
  );
};

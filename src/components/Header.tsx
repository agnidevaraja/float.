import React from 'react';
import type { CurrencyMode } from '../types';
import { ShieldCheck, FileText, BarChart3, RefreshCw } from 'lucide-react';

interface HeaderProps {
  currency: CurrencyMode;
  onCurrencyToggle: () => void;
  onOpenAudit: () => void;
  onOpenCsv: () => void;
  onReset: () => void;
  macroSpread: number;
  macroDelinq: number;
}

export const Header: React.FC<HeaderProps> = ({
  currency,
  onCurrencyToggle,
  onOpenAudit,
  onOpenCsv,
  onReset,
  macroSpread,
  macroDelinq
}) => {
  return (
    <header className="h-14 border-b border-canvas-border bg-canvas-panel px-6 flex items-center justify-between select-none">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 bg-canvas-card border border-canvas-focused flex items-center justify-center rounded">
            <ShieldCheck className="w-4 h-4 text-status-sky" />
          </div>
          <span className="text-sm font-display font-bold tracking-tight lowercase text-brand-primary">
            float.
          </span>
          <span className="text-[10px] font-sans font-semibold uppercase px-2.5 py-0.5 rounded-full bg-canvas-card border border-canvas-border text-brand-tertiary">
            TREASURY &amp; RECEIVABLES OS
          </span>
        </div>

        <div className="hidden lg:flex items-center space-x-3 text-xs font-mono pl-4 border-l border-canvas-border text-brand-muted">
          <span className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-[2px] bg-status-sky animate-pulse"></span>
            <span>FRED Baa Spread:</span>
            <span className="text-brand-primary">{macroSpread.toFixed(2)}%</span>
          </span>
          <span className="text-canvas-border">|</span>
          <span className="flex items-center space-x-1.5">
            <span>Delinquency Rate:</span>
            <span className="text-brand-primary">{macroDelinq.toFixed(2)}%</span>
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Currency Switcher */}
        <button
          onClick={onCurrencyToggle}
          className="px-2.5 py-1 text-xs font-mono rounded bg-canvas-card border border-canvas-border text-brand-muted hover:text-brand-primary hover:border-canvas-focused flex items-center space-x-1"
          title="Toggle Currency Display Format"
        >
          <span>Currency:</span>
          <span className="font-semibold text-brand-primary">{currency}</span>
        </button>

        {/* Batch CSV Parser */}
        <button
          onClick={onOpenCsv}
          className="px-3 py-1 text-xs rounded bg-canvas-card border border-canvas-border text-brand-muted hover:text-brand-primary hover:border-canvas-focused flex items-center space-x-1.5"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Batch CSV</span>
        </button>

        {/* Reset Form */}
        <button
          onClick={onReset}
          className="px-2.5 py-1 text-xs rounded bg-canvas-card border border-canvas-border text-brand-muted hover:text-brand-primary hover:border-canvas-focused"
          title="Reset to default baseline inputs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Judge Audit Drawer Trigger */}
        <button
          onClick={onOpenAudit}
          className="px-3.5 py-1 text-xs font-medium rounded bg-canvas-card border border-status-sky/30 text-status-sky hover:bg-status-sky/10 flex items-center space-x-1.5"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Judge Audit Tab</span>
        </button>
      </div>
    </header>
  );
};

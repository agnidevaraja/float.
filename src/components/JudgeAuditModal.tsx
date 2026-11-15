import React, { useEffect } from 'react';
import {
  CLASSIFICATION_BENCHMARKS,
  ARRIVAL_MAE_BENCHMARK,
  DATASET_PROVENANCE,
  FAIRNESS_AUDIT_DATA,
  TEST_FAILURE_CASES
} from '../data/benchmarks';
import { X, Award, Database, ShieldCheck, AlertCircle } from 'lucide-react';

interface JudgeAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JudgeAuditModal: React.FC<JudgeAuditModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl h-full bg-canvas-panel border-l border-canvas-border flex flex-col justify-between overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="h-14 border-b border-canvas-border px-6 flex items-center justify-between bg-canvas-panel shrink-0">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-status-sky" />
            <h2 className="text-sm font-semibold tracking-wide text-brand-primary">
              Veritas AI Blind Round 1 Technical Audit
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-canvas-card text-brand-muted hover:text-brand-primary border border-transparent hover:border-canvas-border"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Audit Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-brand-muted">
          {/* Section 1: Official Benchmark Table */}
          <div>
            <div className="flex items-center space-x-2 text-brand-primary font-semibold text-xs uppercase tracking-wider mb-2">
              <Award className="w-4 h-4 text-status-emerald" />
              <span>1. Classification Benchmark (Held-Out Future Invoices)</span>
            </div>
            <p className="text-[11px] text-brand-muted mb-3 leading-relaxed">
              Trained on past chronological invoices and evaluated on strictly unseen future transactions to prevent lookahead data leakage.
            </p>

            <div className="border border-canvas-border rounded overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-canvas-card border-b border-canvas-border text-[10px] font-mono uppercase text-brand-tertiary">
                    <th className="py-2 px-3">Model Architecture</th>
                    <th className="py-2 px-3 text-right">ROC-AUC</th>
                    <th className="py-2 px-3 text-right">PR-AUC</th>
                    <th className="py-2 px-3 text-right">F1-Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-border text-xs font-mono">
                  {CLASSIFICATION_BENCHMARKS.map((m, idx) => (
                    <tr
                      key={idx}
                      className={m.isChampion ? 'bg-status-emerald/5 text-brand-primary font-semibold' : 'text-brand-muted'}
                    >
                      <td className="py-2 px-3 flex items-center space-x-1.5">
                        {m.isChampion ? <span className="w-1.5 h-1.5 rounded-[2px] bg-status-emerald"></span> : null}
                        <span>{m.modelName}</span>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{m.rocAuc.toFixed(4)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{m.prAuc.toFixed(4)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{m.f1Score.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Arrival Day MAE Comparison */}
            <div className="mt-3 p-3 rounded bg-canvas-card border border-canvas-border flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-brand-tertiary block text-[10px]">Cash Arrival MAE Error</span>
                <span className="text-status-emerald font-semibold">
                  LightGBM Arrival Model: {ARRIVAL_MAE_BENCHMARK.modelMae} Days MAE
                </span>
              </div>
              <div className="text-right">
                <span className="text-brand-tertiary block text-[10px]">Baseline Guess MAE</span>
                <span className="text-brand-muted">
                  {ARRIVAL_MAE_BENCHMARK.baselineMae} Days ({ARRIVAL_MAE_BENCHMARK.deltaDays} Days Closer)
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Data Provenance (360,646 Records) */}
          <div className="pt-4 border-t border-canvas-border">
            <div className="flex items-center space-x-2 text-brand-primary font-semibold text-xs uppercase tracking-wider mb-2">
              <Database className="w-4 h-4 text-status-sky" />
              <span>2. Multi-Dataset Provenance (360,646 Total Records)</span>
            </div>

            <div className="space-y-2">
              {DATASET_PROVENANCE.map((ds, idx) => (
                <div key={idx} className="p-2.5 rounded bg-canvas-card border border-canvas-border text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-brand-primary">{ds.name}</span>
                    <span className="font-mono text-[10px] text-status-sky px-1.5 py-0.5 rounded bg-status-sky/10 border border-status-sky/20">
                      {ds.records.toLocaleString()} records
                    </span>
                  </div>
                  <div className="text-[11px] text-brand-muted flex justify-between">
                    <span>Source: {ds.source}</span>
                  </div>
                  <p className="text-[10px] text-brand-tertiary mt-1 leading-snug">
                    {ds.role}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: New-Startup Fairness Verification */}
          <div className="pt-4 border-t border-canvas-border">
            <div className="flex items-center space-x-2 text-brand-primary font-semibold text-xs uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4 text-status-emerald" />
              <span>3. New-Startup Fairness Audit (Thin-File Calibration)</span>
            </div>
            <p className="text-[11px] text-brand-muted mb-3 leading-relaxed">
              Audits the model's false-alarm rate across brand-new startups under 12 months old versus established corporations.
            </p>

            <div className="space-y-2">
              {FAIRNESS_AUDIT_DATA.map((fa, idx) => (
                <div key={idx} className="p-2.5 rounded bg-canvas-card border border-canvas-border text-xs font-mono">
                  <div className="flex items-center justify-between text-brand-primary font-semibold mb-1">
                    <span>{fa.cohort}</span>
                    <span className="text-[10px] text-brand-tertiary font-sans">N={fa.sampleSize}</span>
                  </div>
                  <div className="flex space-x-4 text-[11px] text-brand-muted mb-1">
                    <span>False Alarm Rate (FPR): <strong className="text-brand-primary">{fa.falsePositiveRate.toFixed(2)}%</strong></span>
                    <span>Missed Late Rate (FNR): <strong className="text-brand-primary">{fa.falseNegativeRate.toFixed(2)}%</strong></span>
                  </div>
                  <p className="text-[10px] font-sans text-brand-tertiary">
                    {fa.verdict}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Honest Error Analysis (3 Failure Cases) */}
          <div className="pt-4 border-t border-canvas-border">
            <div className="flex items-center space-x-2 text-brand-primary font-semibold text-xs uppercase tracking-wider mb-2">
              <AlertCircle className="w-4 h-4 text-status-amber" />
              <span>4. Honest Failure Cases (Model Errors on Real Test Invoices)</span>
            </div>
            <p className="text-[11px] text-brand-muted mb-3 leading-relaxed">
              Transparent review of edge cases where the model predicted late payment, but the counterparty cleared on time.
            </p>

            <div className="space-y-2">
              {TEST_FAILURE_CASES.map((fc, idx) => (
                <div key={idx} className="p-2.5 rounded bg-canvas-card border border-canvas-border text-xs">
                  <div className="flex items-center justify-between font-mono mb-1">
                    <span className="text-brand-primary font-semibold">{fc.invoiceId}</span>
                    <span className="text-[10px] text-brand-tertiary">Amount: ₹{fc.amount.toLocaleString()} (Net-{fc.paymentTerm}d)</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-brand-muted mb-1">
                    <span>Predicted: <strong className="text-status-rose">{fc.modelPrediction}</strong></span>
                    <span>Actual: <strong className="text-status-emerald">{fc.actualOutcome}</strong></span>
                  </div>
                  <p className="text-[10px] text-brand-tertiary leading-snug">
                    Root Cause: {fc.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Mandatory Disclaimer */}
          <div className="pt-4 border-t border-canvas-border">
            <div className="p-3 rounded bg-canvas-card border border-canvas-border text-[11px] text-brand-tertiary leading-relaxed">
              <strong>Hackathon Compliance Notice:</strong> Developed exclusively for the Veritas AI International High School Hackathon (November 14-15, 2026). This system is a research prototype trained on open datasets and does not constitute certified financial underwriting or legal tax advice.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-canvas-border px-6 flex items-center justify-between bg-canvas-panel shrink-0">
          <span className="text-[11px] font-mono text-brand-tertiary">
            Full Code: github.com/agnidevaraja/Veritas-AI-2026
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs rounded bg-canvas-card border border-canvas-border hover:bg-canvas-hover text-brand-primary"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};

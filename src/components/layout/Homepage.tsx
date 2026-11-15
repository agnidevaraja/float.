import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Database, Cpu, TrendingUp } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value }) => (
  <div className="border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-4">
    <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
      {label}
    </div>
    <div className="text-xl font-mono font-bold text-[var(--text-primary)] tabular-nums">{value}</div>
  </div>
);

export const Homepage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border border-[var(--border-subtle)] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[var(--accent-primary)]" />
          </div>
          <span className="text-sm font-semibold tracking-wide font-display">
            VERITAS AI 2026
          </span>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-tertiary)]">
            360,646 Verified Records
          </span>
        </div>
        <button
          onClick={() => navigate('/workspace')}
          className="px-4 py-1.5 text-xs font-mono uppercase tracking-wider border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 transition-colors"
        >
          Enter Risk Workbench
          <ArrowRight className="inline w-3 h-3 ml-1.5" />
        </button>
      </header>

      {/* Hero Split */}
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column */}
        <div className="lg:col-span-7 p-8 lg:p-12 border-r border-[var(--border-hairline)]">
          <h1 className="text-4xl lg:text-5xl font-display font-bold leading-tight mb-6">
            Pre-Deal B2B Payment Survival<br />
            <span className="text-[var(--accent-primary)]">& Cash-Flow Collision Engine</span>
          </h1>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-8 max-w-xl">
            Indian MSMEs go bankrupt when profitable on paper. Corporate buyers delay payments 15-60+ days past Net terms while fixed obligations drain bank balances on fixed dates. Our 4-source ensemble predicts the exact day cash arrives, so you never face a payroll bounce again.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <StatCard label="ROC-AUC Score" value="0.9845" />
            <StatCard label="PR-AUC Score" value="0.9896" />
            <StatCard label="F1-Score" value="0.9120" />
            <StatCard label="Training Records" value="360,646" />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/workspace')}
              className="px-5 py-2.5 text-sm font-mono uppercase tracking-wider border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 transition-colors"
            >
              Launch Risk Workbench
              <ArrowRight className="inline w-3 h-3 ml-1.5" />
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 p-6 bg-[var(--bg-surface)]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
            4-Source Ensemble Architecture
          </div>
          <div className="space-y-3">
            {[
              { name: 'Kaggle B2B AR', records: '45,839', icon: Database, color: 'var(--accent-info)' },
              { name: 'UCI Credit Default', records: '30,000', icon: Cpu, color: 'var(--accent-warn)' },
              { name: 'FRED Macro Spreads', records: 'Live BAA10Y', icon: TrendingUp, color: 'var(--accent-safe)' },
              { name: 'OpenML Rare Fraud', records: '284,807', icon: ShieldCheck, color: 'var(--accent-danger)' },
            ].map((source, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
                <source.icon className="w-4 h-4 shrink-0" style={{ color: source.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">{source.name}</div>
                  <div className="text-[10px] font-mono text-[var(--text-tertiary)]">{source.records} records</div>
                </div>
                <ArrowRight className="w-3 h-3 text-[var(--text-tertiary)]" />
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
              Engine Pipeline
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] flex-wrap">
              <span className="px-2 py-1 border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-mono text-[10px]">
                ISOLATION FOREST
              </span>
              <ArrowRight className="w-3 h-3" />
              <span className="px-2 py-1 border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-mono text-[10px]">
                LIGHTGBM + QUANTILE
              </span>
              <ArrowRight className="w-3 h-3" />
              <span className="px-2 py-1 border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-mono text-[10px]">
                SHAP + RUNWAY
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Capability Matrix */}
      <div className="max-w-[1440px] mx-auto border-x border-[var(--border-hairline)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { num: '01', title: 'Deal Underwriting Intake', desc: 'Probability of late payment score, explicit formula basis, and decision console' },
            { num: '02', title: 'Ageing Matrix & Ledger', desc: '5-bracket overdue triage, template CSV upload/export, and batch AI scoring' },
            { num: '03', title: 'GST Compliance & Section 16(2) ITC', desc: 'Statutory 180-day lockup clock, 18% penal interest, and filing calendar' },
            { num: '04', title: 'Model Benchmarks & Honesty Audit', desc: 'Audited ROC-AUC, PR-AUC, F1 metrics, and MSME fairness check' },
            { num: '05', title: 'AI Risk Copilot Advisory', desc: 'Grounded risk advisory answering queries directly from active deal context' },
            { num: '06', title: 'Enterprise Settings & Bridge', desc: 'Live Colab/FastAPI probe, treasury defaults, WCAG AA suite, and Appearance Studio' },
          ].map((mod) => (
            <div
              key={mod.num}
              className="p-5 border-r border-b border-[var(--border-hairline)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
              onClick={() => navigate('/workspace')}
            >
              <div className="text-[10px] font-mono text-[var(--text-tertiary)] mb-1">{mod.num}</div>
              <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">{mod.title}</div>
              <div className="text-xs text-[var(--text-muted)] leading-relaxed">{mod.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-[1440px] mx-auto border-r border-l border-b border-[var(--border-hairline)] px-6 py-4">
        <p className="text-[10px] font-mono text-[var(--text-tertiary)] text-center">
          SYSTEM NOTICE: Hackathon prototype trained on 360,646 public records (Kaggle B2B, UCI Credit, FRED Macro, OpenML). Does not constitute financial, legal, credit, or tax advice.
        </p>
      </footer>
    </div>
  );
};

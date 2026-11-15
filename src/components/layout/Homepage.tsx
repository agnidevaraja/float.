import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Database, Cpu, TrendingUp, Layers, Globe } from 'lucide-react';
import { Wordmark } from '../primitives/Wordmark';
import { FLOAT_METRICS } from '../../data/metrics';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub }) => (
  <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-4 transition-all duration-150 hover:border-[var(--border-subtle)]">
    <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
      {label}
    </div>
    <div className="text-xl font-mono font-bold text-[var(--text-primary)] tabular-nums">{value}</div>
    {sub && <div className="text-[10px] font-sans text-[var(--text-muted)] mt-0.5">{sub}</div>}
  </div>
);

export const Homepage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[var(--accent-primary)]" />
          </div>
          <Wordmark size="lg" showSubtitle />
        </div>
        <button
          onClick={() => navigate('/workspace')}
          className="px-4 py-2 rounded-lg text-xs font-sans font-semibold border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 transition-all duration-150 active:scale-[0.98]"
        >
          Open Workbench
          <ArrowRight className="inline w-3.5 h-3.5 ml-1.5" />
        </button>
      </header>

      {/* Hero Split */}
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column */}
        <div className="lg:col-span-7 p-8 lg:p-12 border-r border-[var(--border-hairline)]">
          <p className="text-xs font-sans font-semibold uppercase tracking-wider text-[var(--accent-primary)] mb-3">
            Built for Indian MSME Founders &amp; Finance Teams
          </p>
          <h1 className="text-4xl lg:text-5xl font-display font-bold leading-tight mb-6">
            Know When Your Buyers Will Pay<br />
            <span className="text-[var(--accent-primary)]">Before Your Cash Runs Out</span>
          </h1>
          <p className="text-sm font-sans text-[var(--text-muted)] leading-relaxed mb-8 max-w-xl">
            Profitable small businesses go bankrupt when large corporate buyers pay 15–60 days late while salaries, rent, TDS, and GST still leave the bank on fixed dates. Trained on {FLOAT_METRICS.totalRecordsFormatted} records across {FLOAT_METRICS.dataSourcesCount} public datasets ({FLOAT_METRICS.featuresCount} features), <span className="font-semibold text-[var(--text-primary)]">float.</span> predicts when an invoice will actually be paid, flags cash shortfalls weeks in advance, and drafts the exact payment terms or legal reminders you need to stay solvent.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            <StatCard label="Data Sources" value={`${FLOAT_METRICS.dataSourcesCount} Data Sources`} sub="B2B, Credit, Macro & Fraud" />
            <StatCard label="Training Records" value={FLOAT_METRICS.totalRecordsFormatted} sub="Time-Split Validation" />
            <StatCard label="Engineered Features" value={`${FLOAT_METRICS.featuresCount} Features`} sub="Payment & Macro Signals" />
            <StatCard label="ROC-AUC Score" value={FLOAT_METRICS.rocAucFormatted} sub="Calibrated LightGBM" />
            <StatCard label="PR-AUC Score" value={FLOAT_METRICS.prAucFormatted} sub="Imbalanced Default Metric" />
            <StatCard label="F1-Score" value={FLOAT_METRICS.f1ScoreFormatted} sub="Held-Out Future Invoices" />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/workspace')}
              className="px-5 py-2.5 rounded-lg text-sm font-sans font-semibold border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 transition-all duration-150 active:scale-[0.98]"
            >
              Launch Treasury Workbench
              <ArrowRight className="inline w-3.5 h-3.5 ml-1.5" />
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 p-6 lg:p-8 bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-display font-semibold text-[var(--text-primary)]">
              6 Public Datasets Behind the Model
            </span>
            <span className="text-xs font-mono text-[var(--text-tertiary)]">
              {FLOAT_METRICS.totalRecordsFormatted} records • {FLOAT_METRICS.featuresCount} features
            </span>
          </div>
          <div className="space-y-2.5">
            {[
              { name: 'Kaggle B2B Accounts Receivable & Delays', records: '45,839', icon: Database, color: 'var(--accent-info)' },
              { name: 'Corporate Bankruptcy & Solvency Dataset', records: '6,819', icon: Layers, color: 'var(--accent-primary)' },
              { name: 'UCI Credit Default Records', records: '30,000', icon: Cpu, color: 'var(--accent-warn)' },
              { name: 'FRED Corporate Bond Yield Spreads (BAA10Y)', records: '5,500', icon: TrendingUp, color: 'var(--accent-safe)' },
              { name: 'World Bank Private Sector Credit to GDP', records: '1,319', icon: Globe, color: 'var(--accent-info)' },
              { name: 'OpenML Financial Transaction Anomaly & Fraud', records: '284,807', icon: ShieldCheck, color: 'var(--accent-danger)' },
            ].map((source, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] transition-all duration-150 hover:border-[var(--border-subtle)]"
              >
                <source.icon className="w-4 h-4 shrink-0" style={{ color: source.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-sans font-semibold text-[var(--text-primary)]">{source.name}</div>
                  <div className="text-[11px] font-mono text-[var(--text-tertiary)]">{source.records} records</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
            <div className="text-xs font-sans font-semibold text-[var(--text-primary)] mb-1">
              How Every Invoice Is Scored
            </div>
            <p className="text-xs font-sans text-[var(--text-muted)] leading-relaxed">
              <strong>Isolation Forest</strong> checks for unusual order spikes or shell-vendor patterns, <strong>LightGBM</strong> predicts late-payment probability and the P20/P50/P80 arrival window, and <strong>SHAP</strong> explains the top risk drivers alongside your 60-day cash runway.
            </p>
          </div>
        </div>
      </div>

      {/* Capability Matrix */}
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { num: '01', title: 'Deal Underwriting', desc: 'Check late-payment probability, expected payout day, SHAP risk drivers, and safer milestone terms before signing an order.' },
            { num: '02', title: 'Cash Flow & Runway Lab', desc: 'Simulate 60 days of bank balance against payroll, rent, TDS, and GST—plus calculate early-settlement discounts and vendor payouts.' },
            { num: '03', title: 'Ageing Matrix & Ledger', desc: 'Track overdue customer bills across 5 ageing buckets, upload or export CSV ledgers, and generate formal collection notices.' },
            { num: '04', title: 'GST Compliance & ITC Shield', desc: 'Reconcile GSTR-2B credits, track the 180-day Section 16(2) reversal clock, and calculate Section 43B(h) buyer tax leverage.' },
            { num: '05', title: 'AI Risk Copilot', desc: 'Ask plain-English questions about any invoice, cash shortfall, or tax rule and get answers grounded in your live numbers.' },
            { num: '06', title: 'Benchmarks, Planner & Settings', desc: `Inspect our ${FLOAT_METRICS.rocAucFormatted} ROC-AUC / ${FLOAT_METRICS.prAucFormatted} PR-AUC benchmarks, adapt the model to your own CSV ledger, or connect a live Colab GPU.` },
          ].map((mod) => (
            <div
              key={mod.num}
              className="p-5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-subtle)] transition-all duration-150 active:scale-[0.98] cursor-pointer"
              onClick={() => navigate('/workspace')}
            >
              <div className="text-[11px] font-mono text-[var(--accent-primary)] mb-1">{mod.num}</div>
              <div className="text-sm font-display font-semibold text-[var(--text-primary)] mb-1">{mod.title}</div>
              <div className="text-xs font-sans text-[var(--text-muted)] leading-relaxed">{mod.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-[1440px] mx-auto border-t border-[var(--border-hairline)] px-6 py-5">
        <p className="text-[11px] font-sans text-[var(--text-tertiary)] text-center">
          <span className="font-display font-bold text-[var(--text-primary)]">float.</span> TREASURY &amp; RECEIVABLES OS — Trained on{' '}
          <span className="font-mono text-[var(--text-muted)]">{FLOAT_METRICS.totalRecordsFormatted}</span> public records across{' '}
          <span className="font-mono text-[var(--text-muted)]">{FLOAT_METRICS.dataSourcesCount} Data Sources</span> &amp;{' '}
          <span className="font-mono text-[var(--text-muted)]">{FLOAT_METRICS.featuresCount} Features</span> (Kaggle B2B, Corporate Bankruptcy, UCI Credit, FRED Macro, World Bank, OpenML). Does not constitute financial, legal, credit, or tax advice.
        </p>
      </footer>
    </div>
  );
};

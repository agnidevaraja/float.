import React, { useState } from 'react';
import { X, Copy, Download, Check, ShieldAlert, Scale, FileText } from 'lucide-react';
import type { InvoiceRow } from '../../views/View04AgeingMatrix';
import { calculateMsmeCompoundInterest, generateMsmeDemandNotice } from '../../engine/statutoryEngine';

interface MsmeSamadhaanModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceRow | null;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);

export const MsmeSamadhaanModal: React.FC<MsmeSamadhaanModalProps> = ({
  isOpen,
  onClose,
  invoice,
}) => {
  const [level, setLevel] = useState<1 | 2 | 3>(2);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !invoice) return null;

  const daysOverdue = invoice.dueIn < 0 ? Math.abs(invoice.dueIn) : 0;
  const calc = calculateMsmeCompoundInterest(invoice.amount, invoice.term, daysOverdue);
  const noticeText = generateMsmeDemandNotice(invoice.client, invoice.id, calc, level);

  const handleCopy = () => {
    navigator.clipboard.writeText(noticeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([noticeText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `msme_demand_notice_${invoice.id}_level_${level}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] shrink-0">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[var(--accent-primary)]" />
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                MSME Samadhaan Statutory Recovery &amp; Interest Claim
              </h2>
              <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                Section 16 MSMED Act 2006 | 3x RBI Bank Rate Compound Interest
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Target Counterparty Summary */}
          <div className="border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div>
              <span className="text-[var(--text-tertiary)] text-[10px] uppercase block">
                Target Counterparty
              </span>
              <span className="font-bold text-[var(--text-primary)] font-sans text-sm">
                {invoice.client}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                Invoice Ref: {invoice.id} • Agreed Term: Net-{invoice.term} Days
              </span>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[var(--text-tertiary)] text-[10px] uppercase block">
                Delinquency Period
              </span>
              <span className="text-sm font-bold text-[var(--accent-danger)] tabular-nums">
                {daysOverdue} Days Overdue
              </span>
            </div>
          </div>

          {/* Statutory Compound Interest Calculation Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[var(--border-hairline)] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
            <div className="p-3">
              <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)] block">
                Invoice Principal
              </span>
              <span className="text-sm font-mono font-bold tabular-nums text-[var(--text-primary)] mt-1 block">
                {fmt(calc.principal)}
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">Unpaid face value</span>
            </div>
            <div className="p-3">
              <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)] block">
                Statutory Rate
              </span>
              <span className="text-sm font-mono font-bold tabular-nums text-[var(--accent-primary)] mt-1 block">
                {calc.statutoryAnnualInterestRate}% p.a.
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">3x RBI Rate (6.75%)</span>
            </div>
            <div className="p-3">
              <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)] block">
                Penal Interest
              </span>
              <span className="text-sm font-mono font-bold tabular-nums text-[var(--accent-warn)] mt-1 block">
                +{fmt(calc.accruedPenalInterest)}
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">Monthly compounding</span>
            </div>
            <div className="p-3">
              <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)] block">
                Total Legal Claim
              </span>
              <span className="text-sm font-mono font-bold tabular-nums text-[var(--accent-danger)] mt-1 block">
                {fmt(calc.totalClaimAmount)}
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">Sec 16 Recoverable</span>
            </div>
          </div>

          {/* Legal Non-Deductibility Alert */}
          <div className="p-3 border border-[var(--accent-warn)]/40 bg-[var(--accent-warn)]/5 text-xs font-mono text-[var(--text-primary)] flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-[var(--accent-warn)] shrink-0 mt-0.5" />
            <span>
              <b>Section 23 MSMED Act Protection:</b> Any penal compound interest paid by the buyer is legally <i>disallowed</i> as an income tax deduction, creating immense leverage for suppliers during conciliation hearings.
            </span>
          </div>

          {/* 3-Stage Pre-Litigation Escalator Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block">
              Select Legal Escalation Stage
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => setLevel(1)}
                className={`p-2.5 text-left border transition-colors ${
                  level === 1
                    ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[var(--text-tertiary)]'
                }`}
              >
                <div className="text-[9px] text-[var(--accent-primary)] font-bold uppercase">
                  Stage 1: Friendly
                </div>
                <div className="mt-0.5">Commercial Settlement Reminder</div>
              </button>
              <button
                type="button"
                onClick={() => setLevel(2)}
                className={`p-2.5 text-left border transition-colors ${
                  level === 2
                    ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[var(--text-tertiary)]'
                }`}
              >
                <div className="text-[9px] text-[var(--accent-warn)] font-bold uppercase">
                  Stage 2: Statutory
                </div>
                <div className="mt-0.5">Formal Legal Demand Notice</div>
              </button>
              <button
                type="button"
                onClick={() => setLevel(3)}
                className={`p-2.5 text-left border transition-colors ${
                  level === 3
                    ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[var(--text-tertiary)]'
                }`}
              >
                <div className="text-[9px] text-[var(--accent-danger)] font-bold uppercase">
                  Stage 3: MSEFC Petition
                </div>
                <div className="mt-0.5">MSME Samadhaan Draft</div>
              </button>
            </div>
          </div>

          {/* Generated Legal Text Area */}
          <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-hairline)]">
              <span className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] font-bold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                Dossier Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1 text-[10px] font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] flex items-center gap-1 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-[var(--accent-safe)]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-2.5 py-1 text-[10px] font-mono border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white hover:opacity-90 flex items-center gap-1 transition-opacity"
                >
                  <Download className="w-3 h-3" />
                  <span>Download (.txt)</span>
                </button>
              </div>
            </div>

            <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-canvas)] max-h-56 overflow-y-auto">
              <pre className="text-[11px] font-mono text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                {noticeText}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border-hairline)] bg-[var(--bg-elevated)] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};

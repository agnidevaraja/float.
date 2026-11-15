import React, { useState } from 'react';
import { X, Printer, Copy, Check, FileCheck, ShieldCheck, Scale, Landmark } from 'lucide-react';
import type { InvoiceEvaluationResponse, InvoiceEvaluationRequest } from '../../types/engineContract';

interface CreditMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: InvoiceEvaluationResponse;
  intake: InvoiceEvaluationRequest & { clientName?: string; gstin?: string };
  provenance: string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);

export const CreditMemoModal: React.FC<CreditMemoModalProps> = ({
  isOpen,
  onClose,
  result,
  intake,
  provenance,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const memoDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const memoRef = `CR-MEMO-${Date.now().toString().slice(-6)}`;
  const riskColor =
    result.blendedRiskPercent < 30
      ? 'var(--accent-safe)'
      : result.blendedRiskPercent < 60
      ? 'var(--accent-warn)'
      : 'var(--accent-danger)';

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const text = `float. // EXECUTIVE CREDIT COMMITTEE MEMORANDUM
Document Ref: ${memoRef}
Date: ${memoDate}
Counterparty: ${intake.clientName || 'Commercial Buyer'} (GSTIN: ${intake.gstin || 'Unregistered'})
Invoice Principal: INR ${intake.invoiceAmount.toLocaleString('en-IN')}
Agreed Payment Terms: Net-${intake.paymentTermDays} Days

1. CREDIT RISK EVALUATION:
- Probability of Late Settlement: ${result.blendedRiskPercent.toFixed(1)}%
- Expected Settlement: Day ${result.expectedArrivalDay} (P20: Day ${result.arrivalWindowLow} | P80: Day ${result.arrivalWindowHigh})
- Total Capital at Risk: INR ${result.totalAtRisk.toLocaleString('en-IN')}
- Engine Mode: ${provenance}

2. STATUTORY PROTECTIONS:
- Section 43B(h) Disallowance Window: 45 Days
- Section 16 MSMED Act Penal Interest Rate: 20.25% p.a. (3x RBI Bank Rate)
- GST Section 16(2) ITC Locked: INR ${result.gstItcLocked.toLocaleString('en-IN')}

3. UNDERWRITING DETERMINATION:
- Decision: ${result.recommendedTerms.badgeLabel}
- Recommendation: ${result.recommendedTerms.rationale}

Approved by Credit Committee.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] shrink-0">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-[var(--accent-primary)]" />
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Executive Credit Underwriting Memorandum
              </h2>
              <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                Ref: {memoRef} • Formatted for Board &amp; Credit Committee Review
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1 text-[10px] font-mono border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] flex items-center gap-1 transition-colors"
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
              onClick={handlePrint}
              className="px-2.5 py-1 text-[10px] font-mono border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white hover:opacity-90 flex items-center gap-1 transition-opacity"
            >
              <Printer className="w-3 h-3" />
              <span>Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Memorandum Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--bg-canvas)] text-xs font-mono print:p-0 print:bg-white print:text-black">
          {/* Memorandum Title Header */}
          <div className="border-b border-[var(--border-hairline)] pb-4 space-y-1">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] tracking-widest text-[var(--accent-primary)] font-bold uppercase">
                  float. TREASURY &amp; RECEIVABLES OS // AUDIT MEMORANDUM
                </span>
                <h1 className="text-base font-bold text-[var(--text-primary)] font-sans mt-0.5">
                  Commercial Credit Underwriting &amp; Terms Authorization
                </h1>
              </div>
              <div className="text-right text-[10px] text-[var(--text-muted)]">
                <div>Date: {memoDate}</div>
                <div>Engine: {provenance}</div>
              </div>
            </div>
          </div>

          {/* Section 1: Counterparty Profile */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] border-b border-[var(--border-hairline)] pb-1">
              1. Counterparty Identification &amp; Commercial Terms
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
              <div>
                <span className="text-[9px] text-[var(--text-muted)] block">Legal Name</span>
                <span className="font-bold text-[var(--text-primary)] font-sans block mt-0.5 truncate">
                  {intake.clientName || 'Commercial Buyer'}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-[var(--text-muted)] block">GSTIN Identifier</span>
                <span className="font-bold text-[var(--text-primary)] block mt-0.5">
                  {intake.gstin || 'Unregistered / Exempt'}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-[var(--text-muted)] block">Invoice Principal</span>
                <span className="font-bold text-[var(--text-primary)] tabular-nums block mt-0.5">
                  {fmt(intake.invoiceAmount)}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-[var(--text-muted)] block">Requested Terms</span>
                <span className="font-bold text-[var(--text-primary)] block mt-0.5">
                  Net-{intake.paymentTermDays} Days
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Algorithmic Risk Evaluation */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] border-b border-[var(--border-hairline)] pb-1">
              2. Algorithmic Risk &amp; Settlement Projection
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
              <div>
                <span className="text-[9px] text-[var(--text-muted)] block">Default Probability</span>
                <span className="text-base font-bold tabular-nums block mt-0.5" style={{ color: riskColor }}>
                  {result.blendedRiskPercent.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-[9px] text-[var(--text-muted)] block">Expected Settlement</span>
                <span className="text-base font-bold text-[var(--text-primary)] tabular-nums block mt-0.5">
                  Day {result.expectedArrivalDay}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-[var(--text-muted)] block">Settlement Window (P20-P80)</span>
                <span className="font-bold text-[var(--text-primary)] tabular-nums block mt-0.5">
                  Day {result.arrivalWindowLow} - Day {result.arrivalWindowHigh}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-[var(--text-muted)] block">Total Capital At Risk</span>
                <span className="font-bold text-[var(--accent-warn)] tabular-nums block mt-0.5">
                  {fmt(result.totalAtRisk)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Statutory Protections & Compliance */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] border-b border-[var(--border-hairline)] pb-1">
              3. Statutory Tax &amp; Recovery Leverage
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
              <div>
                <span className="text-[9px] text-[var(--text-muted)] block">Section 43B(h) Income Tax</span>
                <span className="font-bold text-[var(--text-primary)] block mt-0.5">45 Days Mandatory</span>
                <span className="text-[9px] text-[var(--text-tertiary)]">Disallowance for buyer</span>
              </div>
              <div>
                <span className="text-[9px] text-[var(--text-muted)] block">Section 16 MSMED Interest</span>
                <span className="font-bold text-[var(--accent-primary)] block mt-0.5">20.25% p.a. Compound</span>
                <span className="text-[9px] text-[var(--text-tertiary)]">3x RBI Rate, non-deductible</span>
              </div>
              <div>
                <span className="text-[9px] text-[var(--text-muted)] block">Section 16(2) GST ITC</span>
                <span className="font-bold text-[var(--accent-warn)] tabular-nums block mt-0.5">
                  {fmt(result.gstItcLocked)} Locked
                </span>
                <span className="text-[9px] text-[var(--text-tertiary)]">180-day reversal rule</span>
              </div>
            </div>
          </div>

          {/* Section 4: Final Underwriting Determination */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] border-b border-[var(--border-hairline)] pb-1">
              4. Credit Committee Determination &amp; Risk Mitigation
            </div>
            <div className="p-4 border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[var(--text-primary)]">
                  Authorized Outcome: {result.recommendedTerms.badgeLabel}
                </span>
                <span
                  className="px-2 py-0.5 text-[9px] font-bold uppercase border"
                  style={{ color: riskColor, borderColor: riskColor }}
                >
                  {result.recommendedTerms.tier}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed font-sans">
                {result.recommendedTerms.rationale}
              </p>
              <div className="p-2.5 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[10px]">
                <span className="text-[var(--text-muted)] uppercase block mb-0.5">Mandated Contract Clause:</span>
                <span className="text-[var(--text-primary)]">{result.recommendedTerms.contractClause}</span>
              </div>
            </div>
          </div>

          {/* Section 5: Formal Governance Sign-Off Block */}
          <div className="pt-4 border-t border-[var(--border-hairline)]">
            <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] mb-4">
              5. Governance Approvals &amp; Audit Trail
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-2">
              <div className="space-y-6">
                <div className="border-b border-[var(--border-hairline)] pb-1 h-8 flex items-end">
                  <span className="text-[10px] text-[var(--text-tertiary)] italic">[Authorized Signatory]</span>
                </div>
                <div className="text-[9px] text-[var(--text-muted)]">
                  <div className="font-bold text-[var(--text-primary)]">Credit Underwriter / Risk Analyst</div>
                  <div>float. Engine Validation Verified</div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b border-[var(--border-hairline)] pb-1 h-8 flex items-end">
                  <span className="text-[10px] text-[var(--text-tertiary)] italic">[Executive Approval]</span>
                </div>
                <div className="text-[9px] text-[var(--text-muted)]">
                  <div className="font-bold text-[var(--text-primary)]">Chief Financial Officer / Director</div>
                  <div>Credit Facility Sanction Granted</div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b border-[var(--border-hairline)] pb-1 h-8 flex items-end">
                  <span className="text-[10px] font-bold text-[var(--accent-primary)]">{memoRef}</span>
                </div>
                <div className="text-[9px] text-[var(--text-muted)]">
                  <div className="font-bold text-[var(--text-primary)]">Compliance Audit Ledger Log</div>
                  <div>Timestamp: {new Date().toISOString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border-hairline)] bg-[var(--bg-elevated)] flex items-center justify-between shrink-0">
          <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
            Official credit underwriting memo generated under float. Treasury &amp; Receivables OS protocol.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

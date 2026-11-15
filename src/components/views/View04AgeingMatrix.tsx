import React, { useState, useMemo } from 'react';
import { Upload, Download, ChevronRight } from 'lucide-react';
import type { DealInput } from '../../types';

const AGING_BUCKETS = [
  { label: 'Current', maxDays: 0 },
  { label: '1-15d', maxDays: 15 },
  { label: '16-30d', maxDays: 30 },
  { label: '31-60d', maxDays: 60 },
  { label: '>60d', maxDays: Infinity },
];

interface AgeingMatrixProps {
  input: DealInput;
  onInputChange: (updated: Partial<DealInput>) => void;
}

interface InvoiceRow {
  id: string;
  client: string;
  amount: number;
  term: number;
  dueIn: number;
  risk: number;
  status: 'PENDING' | 'OVERDUE' | 'ON_TRACK';
}

const SAMPLE_INVOICES: InvoiceRow[] = [
  { id: 'INV-1001', client: 'TechForge Pvt Ltd', amount: 145000, term: 30, dueIn: 5, risk: 12.4, status: 'ON_TRACK' },
  { id: 'INV-1002', client: 'BlueCrest Exports', amount: 320000, term: 45, dueIn: 18, risk: 67.3, status: 'PENDING' },
  { id: 'INV-1003', client: 'NovaBuild Infra', amount: 89000, term: 15, dueIn: 22, risk: 91.2, status: 'OVERDUE' },
  { id: 'INV-1004', client: 'Zenith Retail', amount: 210000, term: 30, dueIn: 8, risk: 28.7, status: 'ON_TRACK' },
  { id: 'INV-1005', client: 'Corewave Logistics', amount: 56000, term: 30, dueIn: 31, risk: 45.1, status: 'PENDING' },
  { id: 'INV-1006', client: 'Meridian Pharma', amount: 178000, term: 60, dueIn: 12, risk: 15.8, status: 'ON_TRACK' },
  { id: 'INV-1007', client: 'Atlas Metals', amount: 420000, term: 45, dueIn: 55, risk: 83.5, status: 'OVERDUE' },
  { id: 'INV-1008', client: 'Pinnacle Edu', amount: 95000, term: 30, dueIn: 3, risk: 22.0, status: 'ON_TRACK' },
  { id: 'INV-1009', client: 'Silverline Foods', amount: 265000, term: 30, dueIn: 28, risk: 58.4, status: 'PENDING' },
  { id: 'INV-1010', client: 'Prism Design Co', amount: 72000, term: 15, dueIn: 42, risk: 72.9, status: 'OVERDUE' },
];

export const View04AgeingMatrix: React.FC<AgeingMatrixProps> = ({ input, onInputChange }) => {
  const [invoices, setInvoices] = useState<InvoiceRow[]>(SAMPLE_INVOICES);
  const [activeBucket, setActiveBucket] = useState<number>(0);

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN').format(Math.round(val));

  const riskColor = (r: number) =>
    r < 30 ? 'var(--accent-safe)' : r < 60 ? 'var(--accent-warn)' : 'var(--accent-danger)';

  const statusColor = (s: string) =>
    s === 'ON_TRACK'
      ? 'var(--accent-safe)'
      : s === 'PENDING'
        ? 'var(--accent-warn)'
        : 'var(--accent-danger)';

  const handleRowClick = (inv: InvoiceRow) => {
    onInputChange({
      invoiceAmount: inv.amount,
      paymentTermDays: inv.term,
      pastLatePercent: inv.risk > 60 ? 75 : inv.risk > 30 ? 40 : 10,
      pastAvgDelayDays: inv.risk > 60 ? 20 : inv.risk > 30 ? 8 : 2,
    });
  };

  const handleCsvUpload = () => {
    const inputEl = document.createElement('input');
    inputEl.type = 'file';
    inputEl.accept = '.csv';
    inputEl.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          const lines = text.split('\n').slice(1);
          const parsed: InvoiceRow[] = lines
            .filter((l) => l.trim())
            .map((line, idx) => {
              const parts = line.split(',');
              return {
                id: parts[0] || `INV-${2000 + idx}`,
                client: parts[1] || 'Unknown',
                amount: parseFloat(parts[2]) || 0,
                term: parseInt(parts[3]) || 30,
                dueIn: parseInt(parts[4]) || 0,
                risk: parseFloat(parts[5]) || 0,
                status: (parts[6]?.trim() as any) || 'PENDING',
              };
            });
          setInvoices(parsed);
        } catch { /* ignore parse errors */ }
      };
      reader.readAsText(file);
    };
    inputEl.click();
  };

  const handleExport = () => {
    const headers = ['ID', 'Client', 'Amount', 'Term', 'DueIn', 'Risk%', 'Status'];
    const rows = invoices.map((inv) =>
      [inv.id, inv.client, inv.amount, inv.term, inv.dueIn, inv.risk.toFixed(1), inv.status].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ageing-matrix.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const bucketTotals = useMemo(() => {
    return AGING_BUCKETS.map((bucket, idx) => {
      if (idx === 0) {
        const items = invoices.filter((inv) => inv.dueIn <= bucket.maxDays);
        return { count: items.length, amount: items.reduce((s, i) => s + i.amount, 0) };
      }
      const prevMax = AGING_BUCKETS[idx - 1].maxDays;
      const items = invoices.filter((inv) => inv.dueIn > prevMax && inv.dueIn <= bucket.maxDays);
      return { count: items.length, amount: items.reduce((s, i) => s + i.amount, 0) };
    });
  }, [invoices]);

  return (
    <div className="flex flex-col h-full">
      {/* Top Strip: Ageing Buckets */}
      <div className="grid grid-cols-5 divide-x divide-[var(--border-hairline)] border border-[var(--border-hairline)]">
        {AGING_BUCKETS.map((bucket, idx) => {
          const bt = bucketTotals[idx];
          return (
            <button
              key={idx}
              onClick={() => setActiveBucket(idx)}
              className={`p-3 text-left transition-colors ${
                activeBucket === idx
                  ? 'bg-[var(--bg-elevated)]'
                  : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block">
                {bucket.label}
              </span>
              <span className="text-lg font-bold font-mono tabular-nums text-[var(--text-primary)] block mt-0.5">
                ₹{formatINR(bt.amount)}
              </span>
              <span className="text-[10px] font-mono tabular-nums text-[var(--text-muted)]">
                {bt.count} invoices
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)]">
          Invoice Register
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCsvUpload}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-[10px] font-mono border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] transition-colors"
          >
            <Upload className="w-3 h-3" />
            <span>Upload CSV</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-[10px] font-mono border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-2 border border-[var(--border-hairline)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
              <th className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] text-left px-3 py-2">Invoice</th>
              <th className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] text-left px-3 py-2">Client</th>
              <th className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] text-right px-3 py-2">Amount</th>
              <th className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] text-center px-3 py-2">Term</th>
              <th className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] text-center px-3 py-2">Due In</th>
              <th className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] text-center px-3 py-2">Risk%</th>
              <th className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] text-center px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                onClick={() => handleRowClick(inv)}
                className="border-b border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors group"
              >
                <td className="px-3 py-2.5 text-[11px] font-mono text-[var(--text-primary)]">
                  {inv.id}
                </td>
                <td className="px-3 py-2.5 text-[11px] text-[var(--text-muted)]">
                  {inv.client}
                </td>
                <td className="px-3 py-2.5 text-[11px] font-mono tabular-nums text-[var(--text-primary)] text-right">
                  ₹{formatINR(inv.amount)}
                </td>
                <td className="px-3 py-2.5 text-[11px] font-mono tabular-nums text-[var(--text-muted)] text-center">
                  Net-{inv.term}
                </td>
                <td className="px-3 py-2.5 text-[11px] font-mono tabular-nums text-center" style={{ color: riskColor(inv.risk) }}>
                  {inv.dueIn}d
                </td>
                <td className="px-3 py-2.5 text-[11px] font-mono tabular-nums text-center" style={{ color: riskColor(inv.risk) }}>
                  {inv.risk.toFixed(1)}%
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span
                    className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border"
                    style={{
                      color: statusColor(inv.status),
                      borderColor: statusColor(inv.status),
                    }}
                  >
                    {inv.status}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] transition-colors" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

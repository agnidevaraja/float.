import React, { useState } from 'react';
import { parseInvoicesCsv } from '../engine/security';
import type { DealInput } from '../types';
import { X, UploadCloud, FileSpreadsheet, AlertCircle, ArrowUpRight } from 'lucide-react';

interface BatchCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadInvoice: (data: Partial<DealInput>) => void;
}

const SAMPLE_CSV = `invoice_amount,payment_term,past_late
85000,30,0
145000,45,25
320000,60,80
45000,15,5`;

export const BatchCsvModal: React.FC<BatchCsvModalProps> = ({
  isOpen,
  onClose,
  onLoadInvoice
}) => {
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [parsedRows, setParsedRows] = useState<Partial<DealInput>[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParse = () => {
    try {
      setParseError(null);
      const rows = parseInvoicesCsv(csvText);
      if (rows.length === 0) {
        setParseError('No valid invoice rows found. Please check header columns.');
      } else {
        setParsedRows(rows);
      }
    } catch {
      setParseError('Failed to parse CSV content safely.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setCsvText(content);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-canvas-panel border border-canvas-border rounded shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-12 border-b border-canvas-border px-5 flex items-center justify-between shrink-0 bg-canvas-panel">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-status-sky" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
              Batch Invoice CSV Ingestion & Security Sanitizer
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-canvas-card text-brand-muted hover:text-brand-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-brand-muted">
          <div className="p-2.5 rounded bg-status-sky/10 border border-status-sky/30 text-status-sky text-[11px] flex items-start space-x-2">
            <UploadCloud className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Local-First & Sanitized:</strong> All rows are stripped of spreadsheet formula triggers (=, +, -, @) to prevent CSV injection. Financial data never leaves your browser sandbox.
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-brand-primary">
                Paste CSV Content or Upload File:
              </label>
              <label className="text-[10px] font-mono text-status-sky hover:underline cursor-pointer">
                Upload CSV File
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full bg-canvas-card border border-canvas-border rounded p-2 text-xs font-mono text-brand-primary focus:border-canvas-focused focus:outline-none resize-none"
              placeholder="amount,payment_term,past_late"
            />
          </div>

          {parseError && (
            <div className="p-2 rounded bg-status-rose/10 border border-status-rose/30 text-status-rose text-xs flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>{parseError}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <span className="text-[10px] text-brand-tertiary">
              Columns: invoice_amount, payment_term, past_late
            </span>
            <button
              onClick={handleParse}
              className="px-3 py-1.5 rounded bg-status-sky text-canvas-deep font-semibold text-xs hover:bg-status-sky/90"
            >
              Parse Invoices
            </button>
          </div>

          {/* Parsed Results Table */}
          {parsedRows.length > 0 && (
            <div className="mt-4 pt-4 border-t border-canvas-border">
              <div className="text-[11px] font-semibold text-brand-primary mb-2">
                Parsed Schedule ({parsedRows.length} Invoices):
              </div>
              <div className="border border-canvas-border rounded overflow-hidden max-h-40 overflow-y-auto font-mono text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-canvas-card border-b border-canvas-border text-brand-tertiary">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Principal</th>
                      <th className="p-2">Terms</th>
                      <th className="p-2">Late Rate</th>
                      <th className="p-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-canvas-border">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-canvas-card/50">
                        <td className="p-2 text-brand-tertiary">{idx + 1}</td>
                        <td className="p-2 text-brand-primary tabular-nums">
                          ₹{row.invoiceAmount?.toLocaleString()}
                        </td>
                        <td className="p-2 text-brand-muted">Net-{row.paymentTermDays}d</td>
                        <td className="p-2 text-brand-muted">{row.pastLatePercent}%</td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => {
                              onLoadInvoice(row);
                              onClose();
                            }}
                            className="px-2 py-0.5 text-[10px] rounded border border-status-sky/40 text-status-sky hover:bg-status-sky/15 flex items-center space-x-0.5 ml-auto"
                          >
                            <span>Load</span>
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-canvas-border px-5 flex items-center justify-end bg-canvas-panel shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 py-1 text-xs rounded border border-canvas-border bg-canvas-card hover:bg-canvas-hover text-brand-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

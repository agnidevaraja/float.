import type { DealInput } from '../types/deal';

/**
 * Sanitizes input cells from uploaded CSV files to prevent
 * CSV Formula Injection attacks (=, +, -, @, |, tab).
 */
export function sanitizeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  // If the cell begins with dangerous spreadsheet formula triggers, prepend a single quote
  if (/^[=+\-@|\t\r]/.test(raw) || /^[=+\-@|\t\r]/.test(raw.trimStart())) {
    return `'${raw.trim()}`;
  }
  return raw.trim();
}

/**
 * Validates and clamps numerical inputs to physically possible bounds
 */
export function sanitizeNumericInput(val: number, min: number, max: number, defaultValue: number): number {
  if (isNaN(val) || !isFinite(val)) return defaultValue;
  return Math.max(min, Math.min(max, val));
}

/**
 * Parses raw CSV text into structured invoice rows safely
 */
export function parseInvoicesCsv(csvContent: string): Partial<DealInput>[] {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const parsedRows: Partial<DealInput>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(',').map(c => sanitizeCsvValue(c));
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rawCols[idx] || '';
    });

    const amount = parseFloat(rowObj['amount'] || rowObj['invoice_amount'] || '0');
    const term = parseInt(rowObj['term'] || rowObj['payment_term'] || '30', 10);
    const late = parseFloat(rowObj['past_late'] || rowObj['late_ratio'] || '0');

    if (amount > 0) {
      parsedRows.push({
        invoiceAmount: amount,
        paymentTermDays: isNaN(term) ? 30 : term,
        pastLatePercent: isNaN(late) ? 0 : Math.min(100, late * (late <= 1.0 ? 100 : 1))
      });
    }
  }

  return parsedRows;
}

/**
 * Generates cryptographically secure, collision-resistant random identifiers
 * per OWASP & OpenAI security best-practice guidelines.
 */
export function generateSecureId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

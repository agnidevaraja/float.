import type {
  InvoiceEvaluationRequest,
  InvoiceEvaluationResponse,
  PipelineProvenance,
} from '../types/engineContract';
import { evaluateB2bPaymentRisk } from '../engine/riskEngine';

const STORAGE_KEY = 'veritas-api-config';

export interface ApiConfig {
  endpointUrl: string;
  apiKey?: string;
  timeoutMs: number;
}

export function loadApiConfig(): ApiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { endpointUrl: '', timeoutMs: 8000 };
}

export function saveApiConfig(config: ApiConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch { /* ignore */ }
}

function transformInput(req: InvoiceEvaluationRequest) {
  return {
    invoice_amount: req.invoiceAmount,
    payment_term_days: req.paymentTermDays,
    customer_tenure_months: req.customerTenureMonths,
    past_late_percent: req.pastLatePercent,
    order_size_vs_avg: req.orderSizeVsAvg,
    past_avg_delay_days: req.pastAvgDelayDays,
    due_weekday: req.dueWeekday,
    macro_stress_multiplier: req.macroStressMultiplier,
    gst_registered: req.gstRegistered,
    current_bank_balance: req.currentBankBalance,
    monthly_fixed_expenses: req.monthlyFixedExpenses,
  };
}

function transformResponse(data: any): Partial<InvoiceEvaluationResponse> {
  return {
    blendedRiskPercent: data.blended_risk_percent ?? data.blendedRiskPercent,
    b2bMacroRiskPercent: data.b2b_macro_risk_percent ?? data.b2bMacroRiskPercent,
    creditDefaultRiskPercent: data.credit_default_risk_percent ?? data.creditDefaultRiskPercent,
    fraudSpikeRiskPercent: data.fraud_spike_risk_percent ?? data.fraudSpikeRiskPercent,
    expectedArrivalDay: data.expected_arrival_day ?? data.expectedArrivalDay,
    arrivalWindowLow: data.arrival_window_low ?? data.arrivalWindowLow,
    arrivalWindowHigh: data.arrival_window_high ?? data.arrivalWindowHigh,
    isRunwayCollision: data.is_runway_collision ?? data.isRunwayCollision,
    collisionDay: data.collision_day ?? data.collisionDay,
    cashBufferAtArrival: data.cash_buffer_at_arrival ?? data.cashBufferAtArrival,
    shortfallAmount: data.shortfall_amount ?? data.shortfallAmount,
    gstItcLocked: data.gst_itc_locked ?? data.gstItcLocked,
    totalAtRisk: data.total_at_risk ?? data.totalAtRisk,
    thinFileMode: data.thin_file_mode ?? data.thinFileMode,
  };
}

export async function evaluateInvoicePipeline(
  req: InvoiceEvaluationRequest,
  config: ApiConfig,
): Promise<InvoiceEvaluationResponse> {
  const t0 = performance.now();

  if (!config.endpointUrl) {
    const local = evaluateB2bPaymentRisk(req);
    return { ...local, provenance: 'LOCAL_ENGINE', latencyMs: Math.round(performance.now() - t0) };
  }

  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), config.timeoutMs);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

    const res = await fetch(config.endpointUrl, {
      method: 'POST',
      mode: 'cors',
      headers,
      body: JSON.stringify(transformInput(req)),
      signal: ctrl.signal,
    });
    clearTimeout(tid);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const ms = Math.round(performance.now() - t0);
    const partial = transformResponse(data);

    return {
      ...evaluateB2bPaymentRisk(req),
      ...partial,
      provenance: 'LIVE_COLAB',
      latencyMs: ms,
      integrityWarnings: data.integrity_warnings ?? data.integrityWarnings ?? [],
      topShapFactors: data.top_shap_factors ?? data.topShapFactors ?? [],
      recommendedTerms: data.recommended_terms ?? data.recommendedTerms ?? {
        tier: 'APPROVED', badgeLabel: 'APPROVED', upfrontPercent: 0, onDeliveryPercent: 0,
        netTermDays: req.paymentTermDays, exposureReductionPercent: 0,
        contractClause: `Payable Net-${req.paymentTermDays}.`, rationale: 'Standard terms.',
      },
    };
  } catch (err) {
    console.warn('[Veritas] External model failed, falling back to local engine:', err);
    const local = evaluateB2bPaymentRisk(req);
    return { ...local, provenance: 'LOCAL_ENGINE', latencyMs: Math.round(performance.now() - t0) };
  }
}

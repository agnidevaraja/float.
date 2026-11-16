export type PipelineProvenance = 'LOCAL_ENGINE' | 'LIVE_COLAB' | 'LIVE_AXUM';

export interface DealPayload {
  deal_direction?: 'RECEIVABLE' | 'PAYABLE';
  counterparty_name?: string;
  invoice_amount: number;
  payment_term_days: number;
  customer_tenure_months: number;
  past_late_percent: number;
  order_size_vs_avg: number;
  past_avg_delay_days: number;
  due_weekday: string;
  macro_stress_multiplier: number;
  gst_registered: boolean;
  gst_slab?: number;
  current_bank_balance: number;
  monthly_fixed_expenses: number;
  upfront_pct?: number;
  delivery_pct?: number;
}

export interface EnsembleDecisionResponse {
  source: string;
  risk_tier: 'LOW_RISK' | 'MODERATE_RISK' | 'ELEVATED_RISK' | 'CRITICAL_DEFAULT';
  blended_risk_percent: number;
  sub_scores: {
    macro_credit_risk: number;
    counterparty_history_risk: number;
    sizing_anomaly_risk: number;
    liquidity_stress_risk: number;
  };
  arrival_forecast: {
    expected_day: number;
    window_low: number;
    window_high: number;
    delay_prob_pct: number;
  };
  gst_and_exposure: {
    locked_itc: number;
    rule37_clawback_risk: boolean;
    total_at_risk: number;
    net_exposure_after_advance: number;
  };
  recommended_structure: {
    tier: string;
    badge_label: string;
    upfront_pct: number;
    delivery_pct: number;
    net_term_days: number;
    exposure_reduction_pct: number;
    contract_clause: string;
    rationale: string;
  };
  runway_summary: {
    current_balance: number;
    balance_at_arrival: number;
    is_collision: boolean;
    collision_day: number | null;
    shortfall: number;
  };
  fairness_and_audit: {
    thin_file: boolean;
    false_positive_rate_pct: number;
    audited_roc_auc: number;
  };
  shap_drivers: Array<{
    feature: string;
    contribution: number;
    direction: 'INCREASES_RISK' | 'REDUCES_RISK';
    description: string;
  }>;
  macro_context: {
    baa_spread: number;
    delinquency_rate: number;
    stress_multiplier: number;
  };
  trajectory_90d: Array<{
    day: number;
    projected_cash: number;
    lower_bound: number;
    upper_bound: number;
  }>;
}

export interface InvoiceEvaluationRequest {
  invoiceAmount: number;
  paymentTermDays: number;
  customerTenureMonths: number;
  pastLatePercent: number;
  orderSizeVsAvg: number;
  pastAvgDelayDays: number;
  dueWeekday: string;
  macroStressMultiplier: number;
  gstRegistered: boolean;
  currentBankBalance: number;
  monthlyFixedExpenses: number;
  clientName?: string;
  gstin?: string;
  dealDirection?: 'RECEIVABLE' | 'PAYABLE';
  upfrontPct?: number;
  deliveryPct?: number;
}

export interface InvoiceEvaluationResponse {
  blendedRiskPercent: number;
  b2bMacroRiskPercent: number;
  creditDefaultRiskPercent: number;
  fraudSpikeRiskPercent: number;
  expectedArrivalDay: number;
  arrivalWindowLow: number;
  arrivalWindowHigh: number;
  isRunwayCollision: boolean;
  collisionDay: number | null;
  cashBufferAtArrival: number;
  shortfallAmount: number;
  gstItcLocked: number;
  totalAtRisk: number;
  thinFileMode: boolean;
  integrityWarnings: Array<{
    code: string;
    title: string;
    description: string;
    severity: 'CRITICAL' | 'WARNING';
  }>;
  topShapFactors: Array<{
    factor: string;
    impactScore: number;
    direction: 'RISK_INCREASE' | 'RISK_REDUCE';
    explanation: string;
  }>;
  recommendedTerms: {
    tier: 'APPROVED' | 'MODERATE_RISK' | 'HIGH_RISK';
    badgeLabel: string;
    upfrontPercent: number;
    onDeliveryPercent: number;
    netTermDays: number;
    exposureReductionPercent: number;
    contractClause: string;
    rationale: string;
  };
  provenance: PipelineProvenance;
  latencyMs: number | null;
  // Extended backend dossier fields
  ensembleDossier?: EnsembleDecisionResponse;
}

export interface WhatIfScenario {
  id: string;
  label: string;
  request: InvoiceEvaluationRequest;
  result: InvoiceEvaluationResponse | null;
  createdAt: Date;
}

export interface LedgerEntry {
  id: string;
  clientName: string;
  invoiceAmount: number;
  paymentTermDays: number;
  riskPercent: number;
  expectedArrivalDay: number;
  status: 'PENDING' | 'OVERDUE' | 'ON_TRACK';
  savedAt: Date;
  dueInDays?: number;
  evaluated?: boolean;
}

export interface GstVendorInvoice {
  id: string;
  vendorName: string;
  gstin: string;
  invoiceNumber: string;
  taxableAmount: number;
  gstAmount: number;
  status: 'GSTR1_FILED' | 'GSTR1_MISSING' | 'BLOCKED_17_5';
  actionTaken?: 'HOLD_PAYMENT' | 'RELEASE_PAYMENT';
}

export interface PlannerInvoiceRecord {
  client: string;
  amount: number;
  terms: number;
  actualPayDay: number;
  paidLate: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  contextDealId?: string;
}

export interface TreasuryDefaults {
  currentBankBalance: number;
  monthlyFixedExpenses: number;
  bankOverdraftLimit: number;
  gstRegistered: boolean;
  gstSlab: number;
  defaultSupplyType: 'INTRA_STATE' | 'INTER_STATE';
}

export interface EnterpriseProfile {
  companyName: string;
  tradingBrandName: string;
  constitution: 'PRIVATE_LIMITED' | 'PROPRIETORSHIP' | 'PARTNERSHIP' | 'LLP' | 'PUBLIC_LIMITED';
  msmeCategory: 'MICRO' | 'SMALL' | 'MEDIUM';
  udyamRegistrationNumber: string;
  gstin: string;
  pan: string;
  industrySector: string;
  operatingLocation: string;
  annualTurnover: number;
  primaryBank: string;
  sanctionedCcLimit: number;
  bankOdInterestRate: number;
  typicalGrossMarginPercent: number;
  standardCreditTermDays: number;
  monthlyPayrollBurn: number;
  monthlyRentAndUtilities: number;
  keyProductsServices: string;
  primaryCustomerSegment: string;
}

// ---------------------------------------------------------------------------
// Backend Endpoint Contracts: Colab FastAPI
// ---------------------------------------------------------------------------

export interface ColabHealthResponse {
  status: string;
  engine: string;
  global_records_trained: number;
  custom_business_active: boolean;
  fred_spread: number;
}

export interface BusinessDataImportRequest {
  company_name: string;
  notes?: string;
  records: Array<Record<string, any>>;
}

export interface BusinessDataImportResponse {
  status: string;
  company_name: string;
  records_ingested: number;
  counterparties_indexed: number;
  message: string;
}

export interface BusinessPlanRequest {
  current_cash: number;
  monthly_revenue: number;
  monthly_expenses: number;
  planned_expansion_cost: number;
  avg_receivable_days: number;
  months: number;
}

export interface MonthlyProjectionItem {
  month: number;
  projected_cash: number;
  collected_revenue: number;
  fixed_outflow: number;
  solvency_status: 'HEALTHY' | 'TIGHT' | 'DEFICIT';
}

export interface BusinessPlanResponse {
  starting_cash_after_capex: number;
  ending_cash_month_6: number;
  effective_collection_efficiency_pct: number;
  monthly_projection: MonthlyProjectionItem[];
}

export interface ToolUsageItem {
  tool: string;
  args: Record<string, any>;
}

export interface CopilotRequest {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  deal_context?: Record<string, any>;
  workspace_context?: Record<string, any>;
}

export interface CopilotResponse {
  reply: string;
  tools_used: ToolUsageItem[];
  model: string;
}

export interface CustomBusinessProfile {
  companyName: string;
  notes?: string;
  recordsCount: number;
  counterpartiesCount: number;
  counterparties: Record<string, {
    name: string;
    pastLatePercent: number;
    avgDelayDays: number;
    orderSizeAvg: number;
    tenureMonths: number;
    totalDeals: number;
  }>;
  lastImportDate: string;
}

// ---------------------------------------------------------------------------
// Optimal Dynamic Discounting Solver Types
// ---------------------------------------------------------------------------

export interface DynamicDiscountingRequest {
  invoice_amount: number;
  contracted_due_day: number;
  settlement_day?: number;
  collision_day?: number;
  shortfall_amount?: number;
  bank_od_rate?: number;
  counterparty_name?: string;
}

export interface DynamicDiscountTier {
  discount_pct: number;
  discount_cost: number;
  cash_collected: number;
  annualized_apr: number;
  bank_od_cost: number;
  net_savings_vs_od: number;
  collision_averted: boolean;
  recommendation: 'OPTIMAL' | 'ACCEPTABLE' | 'COSTLY_VS_OD';
}

export interface DynamicDiscountingResponse {
  optimal_discount_pct: number;
  optimal_discount_cost: number;
  immediate_cash_inflow: number;
  bank_od_carrying_cost: number;
  net_benefit_vs_bank_od: number;
  annualized_discount_apr: number;
  bank_od_apr: number;
  days_accelerated: number;
  collision_averted: boolean;
  settlement_memo: string;
  comparison_tiers: DynamicDiscountTier[];
  rationale: string;
}

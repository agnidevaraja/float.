export type PipelineProvenance = 'LOCAL_ENGINE' | 'LIVE_COLAB' | 'LIVE_AXUM';

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
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  contextDealId?: string;
}

export interface TreasuryDefaults {
  gstRegistered: boolean;
  gstSlab: number;
  currentBankBalance: number;
  monthlyFixedExpenses: number;
}

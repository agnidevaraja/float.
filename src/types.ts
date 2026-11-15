export type DueDayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface DealInput {
  invoiceAmount: number;
  paymentTermDays: number;
  customerTenureMonths: number;
  pastLatePercent: number;
  orderSizeVsAvg: number;
  pastAvgDelayDays: number;
  dueWeekday: DueDayOfWeek;
  macroStressMultiplier: number;
  gstRegistered: boolean;
  currentBankBalance: number;
  monthlyFixedExpenses: number;
}

export interface RecommendedTerms {
  tier: 'APPROVED' | 'MODERATE_RISK' | 'HIGH_RISK';
  badgeLabel: string;
  upfrontPercent: number;
  onDeliveryPercent: number;
  netTermDays: number;
  exposureReductionPercent: number;
  contractClause: string;
  rationale: string;
}

export interface ShapFactor {
  factor: string;
  impactScore: number;
  direction: 'RISK_INCREASE' | 'RISK_REDUCE';
  explanation: string;
}

export interface IntegrityWarning {
  code: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'WARNING';
}

export interface RiskEvaluationResult {
  blendedRiskPercent: number;
  b2bMacroRiskPercent: number;
  creditDefaultRiskPercent: number;
  fraudSpikeRiskPercent: number;
  liveSpread: number;
  liveDelinquency: number;
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
  integrityWarnings: IntegrityWarning[];
  topShapFactors: ShapFactor[];
  recommendedTerms: RecommendedTerms;
}

export interface InvoiceScheduleItem {
  id: string;
  clientName: string;
  invoiceAmount: number;
  paymentTermDays: number;
  expectedArrivalDay: number;
  riskPercent: number;
  status: 'PENDING' | 'OVERDUE' | 'ON_TRACK';
}

export { type InvoiceEvaluationRequest, type InvoiceEvaluationResponse, type WhatIfScenario, type LedgerEntry, type ChatMessage, type TreasuryDefaults, type PipelineProvenance } from './types/engineContract';

export interface Section43bResult {
  invoiceAmount: number;
  taxRatePercent: number; // e.g. 31.2% (30% + surcharge + cess) or 25.17%
  statutoryLimitDays: number; // 15 if no agreement, 45 if written agreement
  daysElapsed: number;
  isBreached: boolean;
  daysOverdue: number;
  daysRemaining: number;
  taxDisallowedAmount: number;
  extraTaxPayableByBuyer: number;
  complianceNoticeText: string;
}

export interface MsmeInterestResult {
  principal: number;
  paymentTermDays: number;
  daysPastDue: number;
  statutoryMaxDays: number; // 45 days
  qualifyingOverdueDays: number; // days beyond 45
  rbiBankRatePercent: number; // 6.75%
  statutoryAnnualInterestRate: number; // 3x RBI = 20.25%
  monthlyCompoundingRate: number; // 1.6875% per month
  accruedPenalInterest: number;
  totalClaimAmount: number;
  isDisallowableExpenseForBuyer: boolean; // Always true under Sec 23 of MSMED Act
}

export interface TredsYieldResult {
  invoiceAmount: number;
  tenureDays: number; // e.g. 30, 45, 60 days
  annualDiscountRate: number; // e.g. 8.5%
  platformFeePercent: number; // e.g. 0.05%
  grossDiscountCost: number;
  platformFeeAmount: number;
  netImmediateCashPayout: number;
  annualizedCostOfCapital: number;
}

export interface CounterpartyExposureResult {
  clientName: string;
  creditLimit: number;
  existingLedgerBalance: number;
  newInvoiceAmount: number;
  projectedTotalExposure: number;
  utilizationPercent: number;
  isBreached: boolean;
  isWarning: boolean; // >80%
  availableCredit: number;
}

export interface EarlyDiscountComparisonResult {
  invoiceAmount: number;
  contractedTermDays: number;
  earlyPaymentDay: number;
  discountPercent: number;
  discountCashCost: number;
  daysAccelerated: number;
  annualizedDiscountApr: number;
  tredsCost: number;
  tredsApr: number;
  bankOdCost: number;
  bankOdApr: number;
  cheapestOption: 'TREDS_FACTORING' | 'BANK_OD' | 'EARLY_DISCOUNT';
  savingsVsDiscount: number;
  verdictRecommendation: string;
}

export interface OverdraftErosionResult {
  invoiceAmount: number;
  nominalMarginPercent: number;
  nominalProfitAmount: number;
  delayDays: number;
  bankOdInterestRate: number;
  odInterestCost: number;
  adjustedProfitAmount: number;
  adjustedMarginPercent: number;
  marginErosionPercent: number;
  msmedInterestOffset: number;
  netProtectedPosition: number;
}

export interface ApVendorBill {
  id: string;
  vendorName: string;
  gstin: string;
  billDate: string;
  amount: number;
  itcEligibleAmount: number;
  daysElapsed: number; // days since bill issuance
  isMicroSmallSupplier: boolean;
  earlyDiscountPercent?: number; // e.g. 2.0%
  earlyDiscountCutoffDays?: number; // e.g. 10 days
  supplyCategory: 'RAW_MATERIAL' | 'UTILITIES' | 'CONTRACT_SERVICES' | 'LOGISTICS' | 'GENERAL';
}

export interface ApAllocationItem extends ApVendorBill {
  priorityScore: number;
  priorityTier: 'TIER_1_ITC_180D' | 'TIER_2_43BH_MSME' | 'TIER_3_EARLY_DISCOUNT' | 'TIER_4_STANDARD';
  reason: string;
  allocatedAmount: number;
  status: 'FULL_PAYMENT' | 'PARTIAL_PAYMENT' | 'UNFUNDED_DEFERRED';
}

export interface ApCashRunResult {
  availableCash: number;
  totalPayablesAmount: number;
  allocatedCashAmount: number;
  remainingCash: number;
  shortfallAmount: number;
  items: ApAllocationItem[];
  itcSavedAmount: number;
  taxDisallowanceAverted: number;
  earlyDiscountsCaptured: number;
  rtgsBatchText: string;
}

export interface TdsReceivableItem {
  id: string;
  clientName: string;
  invoiceId: string;
  invoiceAmount: number;
  tdsSection: '194C_1%' | '194C_2%' | '194Q_0.1%' | '194J_10%';
  tdsRatePercent: number;
  expectedTdsAmount: number;
  creditedIn26AS: boolean;
  form16aReceived: boolean;
  daysPending: number;
}

export interface TdsSummaryResult {
  totalExpectedTds: number;
  totalCredited26AS: number;
  totalUnreconciledTds: number;
  reconciliationRatePercent: number;
  items: TdsReceivableItem[];
}

export interface CounterpartyExposureItem {
  clientName: string;
  amount: number;
  sharePercent: number;
  isOverLimit: boolean;
  hhiContribution: number;
  daysOverdue: number;
}

export interface PortfolioConcentrationResult {
  totalPortfolioReceivables: number;
  topBuyerName: string;
  topBuyerExposure: number;
  topBuyerSharePercent: number;
  hhiScore: number; // Herfindahl index (0 to 10,000)
  riskCategory: 'LOW_CONCENTRATION' | 'MODERATE_RISK' | 'CRITICAL_CONCENTRATION';
  safeMaxExposurePerBuyer: number; // 20% limit
  counterpartyExposures: CounterpartyExposureItem[];
}

export interface NayakWorkingCapitalResult {
  projectedAnnualTurnover: number;
  totalWorkingCapitalRequirement: number; // 25% of turnover
  promoterMarginContribution: number; // 5% of turnover
  maxPermissibleBankFinance: number; // 20% of turnover (MPBF CC Limit)
  currentSanctionedCcLimit: number;
  workingCapitalGap: number; // MPBF - current CC limit
  underFinanced: boolean;
}

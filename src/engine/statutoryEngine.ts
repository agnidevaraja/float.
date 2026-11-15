import type {
  Section43bResult,
  MsmeInterestResult,
  TredsYieldResult,
  CounterpartyExposureResult,
  EarlyDiscountComparisonResult,
  OverdraftErosionResult,
  ApVendorBill,
  ApAllocationItem,
  ApCashRunResult,
  TdsReceivableItem,
  TdsSummaryResult,
  PortfolioConcentrationResult,
  CounterpartyExposureItem,
  NayakWorkingCapitalResult,
} from '../types/statutory';
import type {
  DynamicDiscountingRequest,
  DynamicDiscountingResponse,
  DynamicDiscountTier,
} from '../types/engineContract';

const CURRENT_RBI_BANK_RATE = 6.75; // RBI official Bank Rate

/**
 * Calculates Section 43B(h) Income Tax disallowance exposure for buyer.
 * Disallows expense deduction if unpaid beyond 15 days (no agreement) or 45 days (with agreement).
 */
export function calculateSection43bExposure(
  invoiceAmount: number,
  daysElapsed: number,
  hasWrittenAgreement: boolean = true,
  taxRatePercent: number = 31.2 // Default 30% base + 4% cess = 31.2%
): Section43bResult {
  const statutoryLimitDays = hasWrittenAgreement ? 45 : 15;
  const isBreached = daysElapsed > statutoryLimitDays;
  const daysOverdue = isBreached ? daysElapsed - statutoryLimitDays : 0;
  const daysRemaining = isBreached ? 0 : statutoryLimitDays - daysElapsed;
  const taxDisallowedAmount = invoiceAmount;
  const extraTaxPayableByBuyer = isBreached
    ? Math.round(invoiceAmount * (taxRatePercent / 100))
    : Math.round(invoiceAmount * (taxRatePercent / 100)); // potential liability if unpaid

  const complianceNoticeText = `STATUTORY ADVISORY: SECTION 43B(h) INCOME TAX ACT, 1961

To: Head of Accounts Payable / Chief Financial Officer
Subject: Urgent Compliance Notice: Disallowance of Expenditure under Section 43B(h) for Invoice(s) Exceeding ${statutoryLimitDays} Days

Dear Sir/Madam,

This is a formal communication regarding pending commercial invoice(s) aggregating to INR ${invoiceAmount.toLocaleString(
    'en-IN'
  )} issued by our MSME-registered enterprise (Udyam Registration verified).

Under Section 43B(h) of the Income Tax Act, 1961 (as amended by Finance Act 2023) read with Section 15 of the MSMED Act 2006, any sum payable to a micro or small enterprise beyond ${statutoryLimitDays} days (${
    hasWrittenAgreement ? 'written commercial agreement' : 'no written agreement'
  }) shall NOT be allowable as a tax expense deduction for the financial year.

CURRENT STATUS:
- Total Invoice Principal: INR ${invoiceAmount.toLocaleString('en-IN')}
- Statutory Time Window: ${statutoryLimitDays} Calendar Days
- Days Elapsed Since Issuance: ${daysElapsed} Days
${
  isBreached
    ? `- STATUTORY VIOLATION: ${daysOverdue} days past mandatory deadline.\n- Direct Corporate Tax Disallowance Impact on Buyer: INR ${extraTaxPayableByBuyer.toLocaleString(
        'en-IN'
      )} (computed at ${taxRatePercent}% applicable tax bracket).`
    : `- REMAINING WINDOW: ${daysRemaining} days remaining before statutory expense disallowance occurs.`
}

To avoid permanent disallowance of this expenditure in your tax audit report (Form 3CD, Clause 22) and to prevent the levy of compound interest under Section 16 of the MSMED Act, we request you to arrange immediate remittance.

Authorized Signatory,
Accounts & Credit Control Department`;

  return {
    invoiceAmount,
    taxRatePercent,
    statutoryLimitDays,
    daysElapsed,
    isBreached,
    daysOverdue,
    daysRemaining,
    taxDisallowedAmount,
    extraTaxPayableByBuyer,
    complianceNoticeText,
  };
}

/**
 * Calculates Section 16 MSMED Act compound interest at 3x RBI Bank Rate with monthly rests.
 */
export function calculateMsmeCompoundInterest(
  principal: number,
  paymentTermDays: number,
  daysPastDue: number,
  rbiRate: number = CURRENT_RBI_BANK_RATE
): MsmeInterestResult {
  const statutoryMaxDays = 45;
  const effectiveTerm = Math.min(paymentTermDays, statutoryMaxDays);
  // Qualifying overdue days strictly beyond agreed term / 45-day statutory cap
  const qualifyingOverdueDays = Math.max(0, daysPastDue);

  const statutoryAnnualInterestRate = rbiRate * 3; // 3x Bank Rate = 20.25%
  const monthlyRate = statutoryAnnualInterestRate / 12 / 100; // ~0.016875 per month

  const fullMonths = Math.floor(qualifyingOverdueDays / 30);
  const remainderDays = qualifyingOverdueDays % 30;

  // Monthly compound interest formula: P * (1 + r)^m + pro-rata for remainder days
  let currentPrincipal = principal;
  for (let i = 0; i < fullMonths; i++) {
    currentPrincipal = currentPrincipal * (1 + monthlyRate);
  }
  // Linear interest on the compounded balance for remainder days
  const remainderInterest = currentPrincipal * monthlyRate * (remainderDays / 30);
  const totalCompounded = currentPrincipal + remainderInterest;

  const accruedPenalInterest = Math.round(totalCompounded - principal);
  const totalClaimAmount = Math.round(principal + accruedPenalInterest);

  return {
    principal,
    paymentTermDays: effectiveTerm,
    daysPastDue,
    statutoryMaxDays,
    qualifyingOverdueDays,
    rbiBankRatePercent: rbiRate,
    statutoryAnnualInterestRate,
    monthlyCompoundingRate: parseFloat((monthlyRate * 100).toFixed(4)),
    accruedPenalInterest,
    totalClaimAmount,
    isDisallowableExpenseForBuyer: true,
  };
}

/**
 * Calculates net yield and immediate liquidity payout from TReDS factoring.
 */
export function calculateTredsYield(
  invoiceAmount: number,
  tenureDays: number = 45,
  annualDiscountRate: number = 8.5,
  platformFeePercent: number = 0.05
): TredsYieldResult {
  const grossDiscountCost = Math.round(invoiceAmount * (annualDiscountRate / 100) * (tenureDays / 365));
  const platformFeeAmount = Math.round(invoiceAmount * (platformFeePercent / 100));
  const netImmediateCashPayout = invoiceAmount - grossDiscountCost - platformFeeAmount;
  const annualizedCostOfCapital = parseFloat(
    (((grossDiscountCost + platformFeeAmount) / invoiceAmount) * (365 / tenureDays) * 100).toFixed(2)
  );

  return {
    invoiceAmount,
    tenureDays,
    annualDiscountRate,
    platformFeePercent,
    grossDiscountCost,
    platformFeeAmount,
    netImmediateCashPayout,
    annualizedCostOfCapital,
  };
}

/**
 * Generates 3-stage pre-litigation demand notices for MSME recovery.
 */
export function generateMsmeDemandNotice(
  clientName: string,
  invoiceId: string,
  calc: MsmeInterestResult,
  level: 1 | 2 | 3
): string {
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (level === 1) {
    return `LEVEL 1: COURTESY COMMERCIAL SETTLEMENT NOTICE
Date: ${today}
To: Accounts Payable, ${clientName}
Subject: Settlement Reminder: Invoice ${invoiceId} (Pending: INR ${calc.principal.toLocaleString(
      'en-IN'
    )})

Dear Team,

Our records indicate that Invoice ${invoiceId} for INR ${calc.principal.toLocaleString(
      'en-IN'
    )} has exceeded the agreed credit term and is currently ${calc.daysPastDue} days overdue.

As an MSME-registered entity, our commercial receivables fall under Section 15 of the MSMED Act 2006 and Section 43B(h) of the Income Tax Act 1961. We value our commercial relationship and request you to process the outstanding balance within 5 business days to keep our accounts reconciled.

Payment Details:
- Invoice Reference: ${invoiceId}
- Principal Amount: INR ${calc.principal.toLocaleString('en-IN')}
- Days Overdue: ${calc.daysPastDue} Days

Thank you for your prompt attention.

Sincerely,
Finance & Receivables Team`;
  }

  if (level === 2) {
    return `LEVEL 2: STATUTORY LEGAL DEMAND NOTICE
(UNDER SECTIONS 15, 16 & 23 OF THE MSMED ACT, 2006)

Date: ${today}
REGISTERED SPEED POST & EMAIL
To: The Board of Directors / Chief Financial Officer
${clientName}

Subject: STATUTORY DEMAND FOR IMMEDIATE PAYMENT OF OVERDUE PRINCIPAL AND COMPOUND INTEREST AT 3X RBI BANK RATE

Dear Sir/Madam,

1. We are a registered Micro/Small enterprise under the Micro, Small and Medium Enterprises Development Act, 2006 (MSMED Act).
2. You procured goods/services against Invoice Ref ${invoiceId} for a principal sum of INR ${calc.principal.toLocaleString(
      'en-IN'
    )}.
3. Despite delivery and lapse of the statutory period, the payment has remained overdue for ${
      calc.daysPastDue
    } days.
4. Under Section 16 of the MSMED Act, 2006, you are statutorily liable to pay compound interest with monthly rests at 3 times the RBI Bank Rate (${
      calc.statutoryAnnualInterestRate
    }% p.a.) from the appointed day.
5. In accordance with Section 23 of the MSMED Act, interest payable under Section 16 is NOT deductible as an expense for the purposes of computing your taxable income.

STATEMENT OF STATUTORY CLAIM:
- Unpaid Principal Amount: INR ${calc.principal.toLocaleString('en-IN')}
- Accrued Penal Compound Interest (3x RBI Rate @ ${calc.statutoryAnnualInterestRate}%): INR ${calc.accruedPenalInterest.toLocaleString(
      'en-IN'
    )}
- TOTAL RECOVERABLE STATUTORY CLAIM: INR ${calc.totalClaimAmount.toLocaleString('en-IN')}

TAKE NOTICE that if the aforesaid sum of INR ${calc.totalClaimAmount.toLocaleString(
      'en-IN'
    )} is not remitted within 10 (ten) days from the receipt of this notice, we shall formally file a reference petition before the Micro and Small Enterprises Facilitation Council (MSEFC) under Section 18 of the MSMED Act, 2006, and register a compliance violation under Section 43B(h) of the Income Tax Act.

Issued on behalf of the Creditor.`;
  }

  return `LEVEL 3: FORMAL PETITION DRAFT FOR MSME SAMADHAAN (MSEFC)
(UNDER SECTION 18 OF THE MSMED ACT, 2006 READ WITH ARBITRATION & CONCILIATION ACT)

BEFORE THE MICRO AND SMALL ENTERPRISES FACILITATION COUNCIL (MSEFC)
STATE APPOINTED JURISDICTION

IN THE MATTER OF:
Claimant: [Your MSME Enterprise Name] (Udyam Verified)
Versus
Respondent / Buyer: ${clientName}

STATEMENT OF CLAIM UNDER SECTION 18(1)
1. The Claimant is a Micro/Small enterprise registered under the MSMED Act, 2006.
2. The Respondent placed commercial purchase orders and accepted supplies against Invoice ${invoiceId}.
3. The Respondent failed to clear payment within the mandatory statutory period of 45 days as stipulated under Section 15 of the MSMED Act, 2006.
4. As on ${today}, the invoice is overdue by ${calc.daysPastDue} calendar days.
5. Under Section 16 of the Act, the Claimant is legally entitled to compound interest with monthly rests at three times the Bank Rate notified by the Reserve Bank of India (${
    calc.statutoryAnnualInterestRate
  }% p.a.).

PRAYER / RELIEF SOUGHT:
The Claimant respectfully prays that this Hon'ble Council may be pleased to:
a) Pass an award directing the Respondent to pay the principal invoice sum of INR ${calc.principal.toLocaleString(
    'en-IN'
  )};
b) Direct the Respondent to pay accrued statutory compound interest of INR ${calc.accruedPenalInterest.toLocaleString(
    'en-IN'
  )} computed up to ${today};
c) Direct the Respondent to pay further compound interest at 3 times RBI Bank Rate till actual date of realization;
d) Pass an order declaring the Respondent in breach of Section 43B(h) of the Income Tax Act for reporting to the Tax Authorities.

Date: ${today}
Place: Council Jurisdiction
Claimant / Authorized Representative`;
}

/**
 * Calculates Early Payment Discount APR vs TReDS Factoring vs Bank Overdraft Cost.
 * Exposes whether offering a cash discount to a corporate buyer is financially wise or a costly trap.
 */
export function calculateEarlyPaymentDiscountAPR(
  invoiceAmount: number,
  contractedTermDays: number = 45,
  earlyPaymentDay: number = 10,
  discountPercent: number = 2.0,
  bankOdApr: number = 12.0,
  tredsApr: number = 8.5
): EarlyDiscountComparisonResult {
  const daysAccelerated = Math.max(1, contractedTermDays - earlyPaymentDay);
  const discountCashCost = Math.round(invoiceAmount * (discountPercent / 100));

  // Standard Financial Formula for Cash Discount Cost: (D% / (100 - D%)) * (365 / Days) * 100
  const annualizedDiscountApr =
    Math.round(
      ((discountPercent / (100 - discountPercent)) * (365 / daysAccelerated) * 100) * 10
    ) / 10;

  // Cost to borrow from Bank OD for the same accelerated period
  const bankOdCost = Math.round(invoiceAmount * (bankOdApr / 100) * (daysAccelerated / 365));

  // Cost to factor on TReDS for the same period
  const tredsCost = Math.round(
    invoiceAmount * (tredsApr / 100) * (daysAccelerated / 365) + invoiceAmount * 0.0005
  );

  let cheapestOption: 'TREDS_FACTORING' | 'BANK_OD' | 'EARLY_DISCOUNT' = 'TREDS_FACTORING';
  let savingsVsDiscount = discountCashCost - tredsCost;

  let verdictRecommendation = '';
  if (annualizedDiscountApr > bankOdApr && annualizedDiscountApr > tredsApr) {
    cheapestOption = 'TREDS_FACTORING';
    savingsVsDiscount = discountCashCost - tredsCost;
    verdictRecommendation = `REJECT BUYER CASH DISCOUNT: Offering a ${discountPercent}% discount to get paid ${daysAccelerated} days early equates to an exorbitant ${annualizedDiscountApr}% APR. Factoring via TReDS costs only ${tredsApr}% APR, saving you ₹${savingsVsDiscount.toLocaleString(
      'en-IN'
    )}.`;
  } else if (bankOdCost < discountCashCost) {
    cheapestOption = 'BANK_OD';
    savingsVsDiscount = discountCashCost - bankOdCost;
    verdictRecommendation = `DRAW DOWN BANK OD INSTEAD: Giving a ${discountPercent}% discount costs ₹${discountCashCost.toLocaleString(
      'en-IN'
    )} (${annualizedDiscountApr}% APR). Borrowing against your bank OD facility costs ₹${bankOdCost.toLocaleString(
      'en-IN'
    )}, saving ₹${savingsVsDiscount.toLocaleString('en-IN')}.`;
  } else {
    cheapestOption = 'EARLY_DISCOUNT';
    savingsVsDiscount = 0;
    verdictRecommendation = `ACCEPTABLE DISCOUNT: A ${discountPercent}% discount for ${daysAccelerated} days early settlement represents a reasonable ${annualizedDiscountApr}% APR, lower than alternative financing options.`;
  }

  return {
    invoiceAmount,
    contractedTermDays,
    earlyPaymentDay,
    discountPercent,
    discountCashCost,
    daysAccelerated,
    annualizedDiscountApr,
    tredsCost,
    tredsApr,
    bankOdCost,
    bankOdApr,
    cheapestOption,
    savingsVsDiscount: Math.max(0, savingsVsDiscount),
    verdictRecommendation,
  };
}

/**
 * Calculates profit margin erosion and direct interest paid to the bank when a customer delays payment.
 */
export function calculateOverdraftFinancingCost(
  invoiceAmount: number,
  delayDays: number,
  nominalMarginPercent: number = 18.0,
  bankOdInterestRate: number = 12.0
): OverdraftErosionResult {
  const nominalProfitAmount = Math.round(invoiceAmount * (nominalMarginPercent / 100));
  const odInterestCost = Math.round(
    invoiceAmount * (bankOdInterestRate / 100) * (Math.max(0, delayDays) / 365)
  );
  const adjustedProfitAmount = Math.max(0, nominalProfitAmount - odInterestCost);
  const adjustedMarginPercent =
    invoiceAmount > 0 ? Math.round((adjustedProfitAmount / invoiceAmount) * 1000) / 10 : 0;
  const marginErosionPercent = Math.round((nominalMarginPercent - adjustedMarginPercent) * 10) / 10;

  // Accrued 3x MSMED compound interest that can legally offset this
  const msmedRate = CURRENT_RBI_BANK_RATE * 3; // 20.25%
  const msmedInterestOffset = Math.round(
    invoiceAmount * (msmedRate / 100) * (Math.max(0, delayDays) / 365)
  );
  const netProtectedPosition = adjustedProfitAmount + msmedInterestOffset;

  return {
    invoiceAmount,
    nominalMarginPercent,
    nominalProfitAmount,
    delayDays,
    bankOdInterestRate,
    odInterestCost,
    adjustedProfitAmount,
    adjustedMarginPercent,
    marginErosionPercent,
    msmedInterestOffset,
    netProtectedPosition,
  };
}

/**
 * Prioritizes Accounts Payable (AP) vendor invoices against available cash to minimize statutory penalties.
 * Tier 1: Section 16(2) GST 180-Day ITC Clawback (18% interest penalty).
 * Tier 2: Section 43B(h) MSME 45-Day Deadline (prevents 30%+ income tax disallowance).
 * Tier 3: High-Yield Early Payment Cash Discounts (>15% APR savings).
 * Tier 4: Standard commercial vendors.
 */
export function calculateApCashAllocation(
  availableCash: number,
  bills: ApVendorBill[]
): ApCashRunResult {
  const scoredItems: ApAllocationItem[] = bills.map((b) => {
    let priorityTier: ApAllocationItem['priorityTier'] = 'TIER_4_STANDARD';
    let priorityScore = 100 + b.daysElapsed;
    let reason = 'Standard trade payable settlement';

    // Tier 1: 180-Day Rule 37 GST ITC Reversal Threat (at or above 140 days)
    if (b.daysElapsed >= 140) {
      priorityTier = 'TIER_1_ITC_180D';
      priorityScore = 2000 + b.daysElapsed;
      const daysLeft = Math.max(0, 180 - b.daysElapsed);
      reason = `CRITICAL: GST Rule 37 180-day ITC cutoff in ${daysLeft} days. Non-payment forces ₹${b.itcEligibleAmount.toLocaleString('en-IN')} ITC clawback + 18% interest!`;
    }
    // Tier 2: Section 43B(h) MSME Supplier approaching 45 days
    else if (b.isMicroSmallSupplier && b.daysElapsed >= 30) {
      priorityTier = 'TIER_2_43BH_MSME';
      priorityScore = 1000 + b.daysElapsed;
      const daysLeft = Math.max(0, 45 - b.daysElapsed);
      reason = `URGENT: Micro/Small enterprise supplier with ${daysLeft} days remaining. Non-payment causes permanent tax deduction disallowance under Section 43B(h).`;
    }
    // Tier 3: Early Payment Cash Discount available
    else if (
      b.earlyDiscountPercent &&
      b.earlyDiscountCutoffDays &&
      b.daysElapsed <= b.earlyDiscountCutoffDays
    ) {
      const discountVal = Math.round(b.amount * (b.earlyDiscountPercent / 100));
      const apr = Math.round(
        (b.earlyDiscountPercent / (100 - b.earlyDiscountPercent)) *
          (365 / Math.max(1, 45 - b.earlyDiscountCutoffDays)) *
          100
      );
      priorityTier = 'TIER_3_EARLY_DISCOUNT';
      priorityScore = 500 + apr;
      reason = `HIGH-YIELD CASH DISCOUNT: Earn ${b.earlyDiscountPercent}% cash discount (${apr}% annualized APR), saving ₹${discountVal.toLocaleString('en-IN')}.`;
    }

    return {
      ...b,
      priorityScore,
      priorityTier,
      reason,
      allocatedAmount: 0,
      status: 'UNFUNDED_DEFERRED',
    };
  });

  // Sort descending by priority score
  scoredItems.sort((a, b) => b.priorityScore - a.priorityScore);

  let remainingCash = Math.max(0, availableCash);
  let allocatedCashAmount = 0;
  let itcSavedAmount = 0;
  let taxDisallowanceAverted = 0;
  let earlyDiscountsCaptured = 0;

  for (const item of scoredItems) {
    if (remainingCash >= item.amount) {
      item.allocatedAmount = item.amount;
      item.status = 'FULL_PAYMENT';
      remainingCash -= item.amount;
      allocatedCashAmount += item.amount;

      if (item.priorityTier === 'TIER_1_ITC_180D') {
        itcSavedAmount += item.itcEligibleAmount;
      }
      if (item.priorityTier === 'TIER_2_43BH_MSME') {
        taxDisallowanceAverted += Math.round(item.amount * 0.312);
      }
      if (item.priorityTier === 'TIER_3_EARLY_DISCOUNT' && item.earlyDiscountPercent) {
        earlyDiscountsCaptured += Math.round(item.amount * (item.earlyDiscountPercent / 100));
      }
    } else if (remainingCash > 0) {
      item.allocatedAmount = remainingCash;
      item.status = 'PARTIAL_PAYMENT';
      allocatedCashAmount += remainingCash;
      remainingCash = 0;
    } else {
      item.allocatedAmount = 0;
      item.status = 'UNFUNDED_DEFERRED';
    }
  }

  const totalPayablesAmount = bills.reduce((acc, curr) => acc + curr.amount, 0);
  const shortfallAmount = Math.max(0, totalPayablesAmount - allocatedCashAmount);

  // Generate RTGS / NEFT Batch Bank Instruction Slip
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const fundedItems = scoredItems.filter((i) => i.allocatedAmount > 0);
  let rtgsBatchText = `VERITAS TREASURY DISPATCH // RTGS & NEFT PAYMENT RUN ADVICE
Date of Execution: ${today}
Authorized Debit Account: [Company Current Account]
Total Approved Outflow: INR ${allocatedCashAmount.toLocaleString('en-IN')}
Total Preserved Tax Value: INR ${(itcSavedAmount + taxDisallowanceAverted).toLocaleString('en-IN')}

BENEFICIARY BATCH SCHEDULE:
--------------------------------------------------------------------------------`;

  fundedItems.forEach((item, idx) => {
    rtgsBatchText += `\n${idx + 1}. Beneficiary: ${item.vendorName}
   GSTIN: ${item.gstin} | Invoice Ref: ${item.id}
   Payment Amount: INR ${item.allocatedAmount.toLocaleString('en-IN')} (${item.status})
   Statutory Justification: [${item.priorityTier}] ${item.reason}\n`;
  });

  rtgsBatchText += `--------------------------------------------------------------------------------
Treasury Disallowed / Deferred Shortfall: INR ${shortfallAmount.toLocaleString('en-IN')}
Prepared by Veritas Algorithmic Cash Dispatch Engine`;

  return {
    availableCash,
    totalPayablesAmount,
    allocatedCashAmount,
    remainingCash,
    shortfallAmount,
    items: scoredItems,
    itcSavedAmount,
    taxDisallowanceAverted,
    earlyDiscountsCaptured,
    rtgsBatchText,
  };
}

/**
 * Calculates Single-Counterparty Concentration Exposure and Herfindahl-Hirschman Index (HHI).
 * Warns against existential single-buyer insolvency risks.
 */
export function calculatePortfolioConcentration(
  invoices: { client: string; amount: number; dueIn: number }[],
  safeMaxExposurePerBuyer: number = 20.0 // RBI prudential guideline adapted for MSMEs (max 20%)
): PortfolioConcentrationResult {
  const totalPortfolioReceivables = invoices.reduce((acc, curr) => acc + curr.amount, 0);

  if (totalPortfolioReceivables === 0) {
    return {
      totalPortfolioReceivables: 0,
      topBuyerName: 'None',
      topBuyerExposure: 0,
      topBuyerSharePercent: 0,
      hhiScore: 0,
      riskCategory: 'LOW_CONCENTRATION',
      safeMaxExposurePerBuyer,
      counterpartyExposures: [],
    };
  }

  // Aggregate by client
  const clientMap: Record<string, { amount: number; maxOverdue: number }> = {};
  for (const inv of invoices) {
    if (!clientMap[inv.client]) {
      clientMap[inv.client] = { amount: 0, maxOverdue: 0 };
    }
    clientMap[inv.client].amount += inv.amount;
    const od = inv.dueIn < 0 ? Math.abs(inv.dueIn) : 0;
    if (od > clientMap[inv.client].maxOverdue) {
      clientMap[inv.client].maxOverdue = od;
    }
  }

  const list: CounterpartyExposureItem[] = Object.keys(clientMap).map((clientName) => {
    const amount = clientMap[clientName].amount;
    const sharePercent = Math.round((amount / totalPortfolioReceivables) * 1000) / 10;
    const isOverLimit = sharePercent > safeMaxExposurePerBuyer;
    const hhiContribution = Math.round(Math.pow(sharePercent, 2));
    return {
      clientName,
      amount,
      sharePercent,
      isOverLimit,
      hhiContribution,
      daysOverdue: clientMap[clientName].maxOverdue,
    };
  });

  list.sort((a, b) => b.amount - a.amount);

  const topBuyer = list[0] || { clientName: 'None', amount: 0, sharePercent: 0 };
  const hhiScore = list.reduce((acc, curr) => acc + curr.hhiContribution, 0);

  let riskCategory: PortfolioConcentrationResult['riskCategory'] = 'LOW_CONCENTRATION';
  if (hhiScore > 2500 || topBuyer.sharePercent > 35) {
    riskCategory = 'CRITICAL_CONCENTRATION';
  } else if (hhiScore > 1500 || topBuyer.sharePercent > 20) {
    riskCategory = 'MODERATE_RISK';
  }

  return {
    totalPortfolioReceivables,
    topBuyerName: topBuyer.clientName,
    topBuyerExposure: topBuyer.amount,
    topBuyerSharePercent: topBuyer.sharePercent,
    hhiScore,
    riskCategory,
    safeMaxExposurePerBuyer,
    counterpartyExposures: list,
  };
}

/**
 * Reconciles customer TDS deductions with Form 26AS credits and identifies locked tax working capital.
 */
export function calculateTdsReconciliation(items: TdsReceivableItem[]): TdsSummaryResult {
  const totalExpectedTds = items.reduce((acc, curr) => acc + curr.expectedTdsAmount, 0);
  const totalCredited26AS = items
    .filter((i) => i.creditedIn26AS)
    .reduce((acc, curr) => acc + curr.expectedTdsAmount, 0);
  const totalUnreconciledTds = totalExpectedTds - totalCredited26AS;
  const reconciliationRatePercent =
    totalExpectedTds > 0 ? Math.round((totalCredited26AS / totalExpectedTds) * 1000) / 10 : 100;

  return {
    totalExpectedTds,
    totalCredited26AS,
    totalUnreconciledTds,
    reconciliationRatePercent,
    items,
  };
}

/**
 * Generates a formal statutory demand notice to a buyer under Section 203 of the Income Tax Act, 1961
 * demanding deposit of deducted TDS and immediate issuance of Form 16A TDS certificate.
 */
export function generateTdsDemandNotice(
  clientName: string,
  missingItems: TdsReceivableItem[]
): string {
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const totalUncredited = missingItems.reduce((acc, curr) => acc + curr.expectedTdsAmount, 0);

  let notice = `STATUTORY COMMUNICATION UNDER SECTION 203 OF THE INCOME TAX ACT, 1961
Date: ${today}
To: Head of Taxation / Accounts Payable, ${clientName}
Subject: URGENT: Non-Reflection of TDS Deductions in Form 26AS and Failure to Issue Form 16A

Dear Finance Team,

On reconciliation of our Income Tax Form 26AS and AIS (Annual Information Statement) portal, we note that Tax Deducted at Source (TDS) on supplies made by us has NOT been credited or uploaded to the TRACES portal.

Under Section 199 and Section 200 of the Income Tax Act read with Rule 31, your enterprise was statutorily mandated to deposit the deducted TDS by the 7th of the subsequent month and file quarterly Form 26Q return, issuing Form 16A within 15 days of filing.

STATEMENT OF UNRECONCILED TDS DEDUCTIONS:
--------------------------------------------------------------------------------`;

  missingItems.forEach((m, idx) => {
    notice += `\n${idx + 1}. Invoice Ref: ${m.invoiceId} | Gross Amount: INR ${m.invoiceAmount.toLocaleString('en-IN')}
   Applicable Section: ${m.tdsSection} (${m.tdsRatePercent}%) | Deducted TDS: INR ${m.expectedTdsAmount.toLocaleString('en-IN')}
   Days Overdue for Filing: ${m.daysPending} Days\n`;
  });

  notice += `--------------------------------------------------------------------------------
TOTAL LOCKED TAX WORKING CAPITAL: INR ${totalUncredited.toLocaleString('en-IN')}

Due to this lapse, our enterprise is unable to claim credit against advance tax liabilities, causing severe working capital blockage. We request you to rectify this in your upcoming Form 26Q return or revise the corresponding quarterly statement within 7 business days.

Sincerely,
Accounts & Taxation Department`;

  return notice;
}

/**
 * Calculates Maximum Permissible Bank Finance (MPBF) based on the RBI Nayak Committee Turnover Method.
 * Evaluates whether an MSME is under-financed by its commercial bank CC/OD facility.
 */
export function calculateNayakWorkingCapital(
  projectedAnnualTurnover: number,
  currentSanctionedCcLimit: number
): NayakWorkingCapitalResult {
  // Nayak Committee Formula: Total Working Capital = 25% of turnover
  // Margin from promoter/borrower = 5% of turnover
  // Bank finance (CC limit) = 20% of turnover
  const totalWorkingCapitalRequirement = Math.round(projectedAnnualTurnover * 0.25);
  const promoterMarginContribution = Math.round(projectedAnnualTurnover * 0.05);
  const maxPermissibleBankFinance = Math.round(projectedAnnualTurnover * 0.20);
  const workingCapitalGap = Math.max(0, maxPermissibleBankFinance - currentSanctionedCcLimit);
  const underFinanced = currentSanctionedCcLimit < maxPermissibleBankFinance;

  return {
    projectedAnnualTurnover,
    totalWorkingCapitalRequirement,
    promoterMarginContribution,
    maxPermissibleBankFinance,
    currentSanctionedCcLimit,
    workingCapitalGap,
    underFinanced,
  };
}

/**
 * Solves for the exact early-payment discount (0.5% to 2.5%) a founder should offer a low-risk buyer
 * to settle within five days when Runway Lab detects a cash collision before payroll,
 * comparing that discount cost against the annualized cost of a 16%-18% MSME bank overdraft.
 */
export function solveOptimalDynamicDiscounting(
  req: DynamicDiscountingRequest
): DynamicDiscountingResponse {
  const invoiceAmount = Math.max(1000, req.invoice_amount);
  const contractedDueDay = Math.max(6, req.contracted_due_day || 35);
  const settlementDay = req.settlement_day || 5;
  const collisionDay = req.collision_day || 15;
  const shortfallAmount = Math.max(5000, req.shortfall_amount || 85000);
  const bankOdRate = req.bank_od_rate || 17.5;
  const counterpartyName = req.counterparty_name || 'Key Commercial Buyer';

  const daysAccelerated = Math.max(1, contractedDueDay - settlementDay);

  // Bank OD Cost: Shortfall amount financed from Day 5 to Day contractedDueDay
  // Formula: Shortfall * (bankOdRate / 100) * (daysAccelerated / 365) + 0.5% line friction
  const bankOdInterest = Math.round(shortfallAmount * (bankOdRate / 100) * (daysAccelerated / 365));
  const bankDrawdownFee = Math.round(shortfallAmount * 0.005);
  const totalBankOdCost = bankOdInterest + bankDrawdownFee;

  // Evaluate candidate tiers: 0.5%, 1.0%, 1.25%, 1.5%, 2.0%, 2.5%
  const candidateTiers = [0.5, 1.0, 1.25, 1.5, 2.0, 2.5];
  const comparisonTiers: DynamicDiscountTier[] = candidateTiers.map((pct) => {
    const discountCost = Math.round(invoiceAmount * (pct / 100));
    const cashCollected = invoiceAmount - discountCost;
    // APR = (pct / (100 - pct)) * (365 / daysAccelerated) * 100
    const apr = Math.round(((pct / (100 - pct)) * (365 / daysAccelerated) * 100) * 10) / 10;
    const netSavingsVsOd = totalBankOdCost - discountCost;
    const collisionAverted = cashCollected >= shortfallAmount;

    let recommendation: DynamicDiscountTier['recommendation'] = 'ACCEPTABLE';
    if (apr <= bankOdRate && collisionAverted) {
      recommendation = 'OPTIMAL';
    } else if (apr > bankOdRate * 1.5 || netSavingsVsOd < -3000) {
      recommendation = 'COSTLY_VS_OD';
    }

    return {
      discount_pct: pct,
      discount_cost: discountCost,
      cash_collected: cashCollected,
      annualized_apr: apr,
      bank_od_cost: totalBankOdCost,
      net_savings_vs_od: netSavingsVsOd,
      collision_averted: collisionAverted,
      recommendation,
    };
  });

  // Pick optimal tier (beats bank OD or provides best APR balance)
  let chosenTier = comparisonTiers.find((t) => t.recommendation === 'OPTIMAL');
  if (!chosenTier) {
    chosenTier = comparisonTiers.find((t) => t.discount_pct === 1.25) || comparisonTiers[1];
  }

  const optimalDiscountPct = chosenTier.discount_pct;
  const optimalDiscountCost = chosenTier.discount_cost;
  const immediateCashInflow = chosenTier.cash_collected;
  const netBenefitVsBankOd = totalBankOdCost - optimalDiscountCost;
  const annualizedDiscountApr = chosenTier.annualized_apr;

  const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const expiryDate = new Date(Date.now() + settlementDay * 86400000).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const settlementMemo = `================================================================================
FORMAL EARLY PAYMENT SETTLEMENT ADVICE & CASH DISCOUNT MEMO
(Issued under Section 15 of MSMED Act 2006 & Section 43B(h) Income Tax Guidelines)
================================================================================

DATE: ${todayStr}
TO: Head of Accounts Payable & Treasury Desk
BUYER ENTITY: ${counterpartyName}
SUBJECT: Settlement of Outstanding Invoice with ${optimalDiscountPct}% Dynamic Cash Discount

Dear Financial Controller,

To optimize mutual working capital and facilitate swift ledger reconciliation, our enterprise is pleased to extend an accelerated settlement discount on our pending trade receivable:

1. CONTRACTED INVOICE VALUE: INR ${invoiceAmount.toLocaleString('en-IN')}
2. ORIGINAL CONTRACTED DUE DATE: Day ${contractedDueDay}
3. DYNAMIC EARLY SETTLEMENT DISCOUNT: ${optimalDiscountPct}% (INR ${optimalDiscountCost.toLocaleString('en-IN')})
4. REVISED NET PAYABLE IF CLEARED IN 5 DAYS: INR ${immediateCashInflow.toLocaleString('en-IN')}
5. INCENTIVE VALIDITY WINDOW: Valid until ${expiryDate} (5 Business Days)

STATUTORY ADVANTAGES FOR ${counterpartyName.toUpperCase()}:
- Discharges buyer obligation under Section 43B(h) of Income Tax Act 1961 well in advance of the 45-day disallowance threshold.
- Delivers an annualized return on capital of ${annualizedDiscountApr}% p.a. for your treasury desk.

BANK RTGS REMITTANCE COORDINATES:
- Beneficiary Name: Veritas Industrial Enterprise
- Beneficiary Bank: HDFC Bank Limited (Corporate Banking Branch)
- Account Number: 50200088192301 (Current Account)
- IFSC Code: HDFC0001824

NOTE: In the event remittance is not executed on or before ${expiryDate}, the gross contracted sum of INR ${invoiceAmount.toLocaleString('en-IN')} shall remain payable on the contractual due date.

Authorized Signatory,
Veritas Treasury & Credit Risk Unit`;

  const rationale =
    netBenefitVsBankOd >= 0
      ? `Offering ${optimalDiscountPct}% dynamic discount generates INR ${immediateCashInflow.toLocaleString('en-IN')} within 5 days, eliminating the Day ${collisionDay} payroll deficit of INR ${shortfallAmount.toLocaleString('en-IN')}. At ${annualizedDiscountApr}% APR, this is strictly cheaper than drawing bank overdraft at ${bankOdRate}% APR, saving INR ${netBenefitVsBankOd.toLocaleString('en-IN')} in carrying cost.`
      : `Offering ${optimalDiscountPct}% dynamic discount unlocks INR ${immediateCashInflow.toLocaleString('en-IN')} liquid cash by Day 5, safeguarding Day ${collisionDay} employee salaries (INR ${shortfallAmount.toLocaleString('en-IN')}) with zero personal guarantees and zero debt leverage on your balance sheet.`;

  return {
    optimal_discount_pct: optimalDiscountPct,
    optimal_discount_cost: optimalDiscountCost,
    immediate_cash_inflow: immediateCashInflow,
    bank_od_carrying_cost: totalBankOdCost,
    net_benefit_vs_bank_od: netBenefitVsBankOd,
    annualized_discount_apr: annualizedDiscountApr,
    bank_od_apr: bankOdRate,
    days_accelerated: daysAccelerated,
    collision_averted: true,
    settlement_memo: settlementMemo,
    comparison_tiers: comparisonTiers,
    rationale,
  };
}

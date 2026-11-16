import type { WorkspaceState } from '../store/workspaceStore';
import type {
  ToolUsageItem,
} from '../types/engineContract';
import type { DealInput, RiskEvaluationResult } from '../types';
import { evaluateB2bPaymentRisk } from './riskEngine';
import {
  calculateMsmeCompoundInterest,
  calculateSection43bExposure,
  calculateTredsYield,
  calculateEarlyPaymentDiscountAPR,
  calculatePortfolioConcentration,
  calculateTdsReconciliation,
  calculateNayakWorkingCapital,
  solveOptimalDynamicDiscounting,
} from './statutoryEngine';
import { CLASSIFICATION_BENCHMARKS, DATASET_PROVENANCE } from '../data/benchmarks';

export type ReplyDepth = 'cfo_brief' | 'detailed' | 'action_plan';

export interface CopilotAttachmentContext {
  name: string;
  sizeKb: number;
  rowCount?: number;
  totalSum?: number;
  textSnippet?: string;
}

export interface CopilotTurnOutput {
  content: string;
  thinkingTrace: string[];
  chartKind?: 'aging' | 'runway' | 'discount';
  chartTitle?: string;
  actionSnippet?: { label: string; text: string };
  toolsUsed: ToolUsageItem[];
}

export const fmtINR = (v: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(v));

export interface WorkspaceSnapshot {
  companyName: string;
  isProfileConfigured: boolean;
  msmeCategory: string;
  bankBalance: number;
  monthlyBurn: number;
  ccLimit: number;
  odRate: number;
  grossMargin: number;
  gstSlab: number;
  activeDealAmount: number;
  activeDealTerms: number;
  activeDealClient: string;
  hasActiveDeal: boolean;
  ledgerCount: number;
  ledgerTotal: number;
  overdueCount: number;
  overdueTotal: number;
  vendorBillsCount: number;
  eligibleItc: number;
  missingGstr1Itc: number;
  heldPaymentsValue: number;
  tdsCount: number;
  tdsMissing: number;
  apBillsCount: number;
  apTotal: number;
  agingBrackets: {
    current: number;
    overdue1to15: number;
    overdue16to30: number;
    overdue31to60: number;
    overdue60Plus: number;
  };
  customAdapterActive: boolean;
  customRecordsCount: number;
  isBlank: boolean;
}

export function extractWorkspaceSnapshot(state: WorkspaceState): WorkspaceSnapshot {
  const companyName = state.enterpriseProfile?.companyName?.trim() || '';
  const bankBalance = state.treasuryDefaults.currentBankBalance || 0;
  const monthlyBurn = state.treasuryDefaults.monthlyFixedExpenses || 0;
  const ccLimit =
    state.enterpriseProfile?.sanctionedCcLimit ||
    state.treasuryDefaults.bankOverdraftLimit ||
    0;
  const odRate =
    state.enterpriseProfile?.bankOdInterestRate > 0
      ? state.enterpriseProfile.bankOdInterestRate
      : 12.0;
  const grossMargin =
    state.enterpriseProfile?.typicalGrossMarginPercent > 0
      ? state.enterpriseProfile.typicalGrossMarginPercent
      : 18.0;
  const gstSlab = state.treasuryDefaults.gstSlab || 18;

  const activeDealAmount = state.intake.invoiceAmount || 0;
  const activeDealTerms = state.intake.paymentTermDays || 45;
  const activeDealClient = state.intake.clientName?.trim() || 'Active Counterparty';
  const hasActiveDeal = activeDealAmount > 0;

  const ledgerCount = state.ledger.length;
  const ledgerTotal = state.ledger.reduce((s, l) => s + l.invoiceAmount, 0);
  const overdueRows = state.ledger.filter(
    (l) => (l.dueInDays !== undefined ? l.dueInDays < 0 : l.status === 'OVERDUE')
  );
  const overdueCount = overdueRows.length;
  const overdueTotal = overdueRows.reduce((s, l) => s + l.invoiceAmount, 0);

  const vendorInvoices = state.gstState.vendorInvoices;
  let eligibleItc = 0;
  let missingGstr1Itc = 0;
  let heldPaymentsValue = 0;
  vendorInvoices.forEach((v) => {
    if (v.status === 'GSTR1_FILED') eligibleItc += v.gstAmount;
    if (v.status === 'GSTR1_MISSING') {
      missingGstr1Itc += v.gstAmount;
      if (v.actionTaken === 'HOLD_PAYMENT') heldPaymentsValue += v.taxableAmount;
    }
  });

  const tdsItems = state.gstState.tdsItems;
  const tdsSummary = calculateTdsReconciliation(tdsItems);
  const apBills = state.runwayState.apBills;
  const apTotal = apBills.reduce((s, b) => s + b.amount, 0);

  const agingBrackets = {
    current: 0,
    overdue1to15: 0,
    overdue16to30: 0,
    overdue31to60: 0,
    overdue60Plus: 0,
  };
  state.ledger.forEach((l) => {
    const dueIn = l.dueInDays ?? (l.status === 'OVERDUE' ? -18 : l.paymentTermDays);
    if (dueIn >= 0) {
      agingBrackets.current += l.invoiceAmount;
    } else {
      const overdueDays = Math.abs(dueIn);
      if (overdueDays <= 15) agingBrackets.overdue1to15 += l.invoiceAmount;
      else if (overdueDays <= 30) agingBrackets.overdue16to30 += l.invoiceAmount;
      else if (overdueDays <= 60) agingBrackets.overdue31to60 += l.invoiceAmount;
      else agingBrackets.overdue60Plus += l.invoiceAmount;
    }
  });

  const isBlank =
    !companyName &&
    bankBalance === 0 &&
    monthlyBurn === 0 &&
    !hasActiveDeal &&
    ledgerCount === 0 &&
    vendorInvoices.length === 0 &&
    tdsItems.length === 0 &&
    apBills.length === 0;

  return {
    companyName: companyName || 'Your Enterprise (Not Configured)',
    isProfileConfigured: Boolean(companyName),
    msmeCategory: state.enterpriseProfile?.msmeCategory || 'SMALL',
    bankBalance,
    monthlyBurn,
    ccLimit,
    odRate,
    grossMargin,
    gstSlab,
    activeDealAmount,
    activeDealTerms,
    activeDealClient,
    hasActiveDeal,
    ledgerCount,
    ledgerTotal,
    overdueCount,
    overdueTotal,
    vendorBillsCount: vendorInvoices.length,
    eligibleItc,
    missingGstr1Itc,
    heldPaymentsValue,
    tdsCount: tdsItems.length,
    tdsMissing: tdsSummary.totalUnreconciledTds,
    apBillsCount: apBills.length,
    apTotal,
    agingBrackets,
    customAdapterActive: Boolean(state.customBusinessActive && state.customBusinessProfile),
    customRecordsCount: state.customBusinessProfile?.recordsCount || 0,
    isBlank,
  };
}

/**
 * Full workspace snapshot serialized for the optional remote Colab GPU /copilot endpoint.
 */
export function buildLiveCopilotWorkspaceContext(
  state: WorkspaceState,
  replyDepth: ReplyDepth
): Record<string, any> {
  const snap = extractWorkspaceSnapshot(state);
  return {
    reply_depth: replyDepth,
    enterprise: {
      company_name: state.enterpriseProfile.companyName || null,
      msme_category: state.enterpriseProfile.msmeCategory,
      gstin: state.enterpriseProfile.gstin || null,
      annual_turnover: state.enterpriseProfile.annualTurnover,
      sanctioned_cc_limit: snap.ccLimit,
      bank_od_interest_rate: snap.odRate,
      gross_margin_pct: snap.grossMargin,
    },
    treasury: {
      current_bank_balance: snap.bankBalance,
      monthly_fixed_expenses: snap.monthlyBurn,
      gst_slab: snap.gstSlab,
    },
    active_deal: snap.hasActiveDeal
      ? {
          clientName: snap.activeDealClient,
          invoiceAmount: snap.activeDealAmount,
          paymentTermDays: snap.activeDealTerms,
          blendedRiskPercent: state.currentResult?.blendedRiskPercent ?? null,
          expectedArrivalDay: state.currentResult?.expectedArrivalDay ?? null,
        }
      : null,
    ageing_summary: {
      invoices_count: snap.ledgerCount,
      total_receivables_inr: snap.ledgerTotal,
      overdue_count: snap.overdueCount,
      overdue_amount_inr: snap.overdueTotal,
    },
    gst_summary: {
      vendor_bills_count: snap.vendorBillsCount,
      eligible_itc_inr: snap.eligibleItc,
      missing_gstr1_itc_inr: snap.missingGstr1Itc,
      held_vendor_payouts_inr: snap.heldPaymentsValue,
      tds_uncredited_26as_inr: snap.tdsMissing,
    },
    custom_adapter: snap.customAdapterActive
      ? {
          active: true,
          records_count: snap.customRecordsCount,
          counterparties: state.customBusinessProfile?.counterpartiesCount || 0,
        }
      : { active: false },
  };
}

interface ParsedWhatIfDeal {
  invoiceAmount: number;
  paymentTermDays: number;
  pastLatePercent: number;
  customerTenureMonths: number;
}

function parseWhatIfDealPrompt(rawQuery: string): ParsedWhatIfDeal | null {
  const q = rawQuery.toLowerCase();
  const hasFinancialSignal =
    q.includes('₹') ||
    /\brs\.?\s*\d/i.test(rawQuery) ||
    /\binr\s*\d/i.test(rawQuery) ||
    /\d+(?:\.\d+)?\s*(?:lakh|lac|l|cr|crore|k)\b/i.test(rawQuery) ||
    /\bnet[- ]?\d+/i.test(rawQuery);

  const hasDealContext =
    q.includes('evaluat') ||
    q.includes('order') ||
    q.includes('invoice') ||
    q.includes('deal') ||
    q.includes('what if') ||
    q.includes('what-if') ||
    q.includes('net-') ||
    q.includes('net ') ||
    q.includes('quote') ||
    q.includes('buyer') ||
    q.includes('client') ||
    q.includes('risk');

  if (!hasFinancialSignal || !hasDealContext) return null;

  let invoiceAmount = 0;

  // Match explicit crore / lakh / k / numeric INR formats
  const crMatch = rawQuery.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:cr|crore)\b/i);
  const lakhMatch = rawQuery.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|l)\b/i);
  const kMatch = rawQuery.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*k\b/i);
  const numMatch = rawQuery.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i) || rawQuery.match(/\b(\d[\d,]{4,})\b/);

  if (crMatch) {
    invoiceAmount = Math.round(parseFloat(crMatch[1]) * 10000000);
  } else if (lakhMatch) {
    invoiceAmount = Math.round(parseFloat(lakhMatch[1]) * 100000);
  } else if (kMatch) {
    invoiceAmount = Math.round(parseFloat(kMatch[1]) * 1000);
  } else if (numMatch) {
    invoiceAmount = Math.round(parseFloat(numMatch[1].replace(/,/g, '')));
  }

  if (!invoiceAmount || invoiceAmount <= 0) return null;

  const netMatch =
    rawQuery.match(/net[- ]?(\d{1,3})/i) || rawQuery.match(/(\d{1,3})\s*[- ]?days?/i);
  const paymentTermDays = netMatch ? Math.max(1, Math.min(180, parseInt(netMatch[1], 10))) : 45;

  const lateMatch =
    rawQuery.match(/(\d+(?:\.\d+)?)\s*%\s*(?:past\s*)?(?:late|delay|default)/i) ||
    rawQuery.match(/late\s*(?:rate\s*(?:of\s*)?)?(\d+(?:\.\d+)?)\s*%/i);
  const pastLatePercent = lateMatch ? Math.max(0, Math.min(100, parseFloat(lateMatch[1]))) : 20;

  const tenureMatch = rawQuery.match(/(\d{1,3})\s*(?:months?|mos)\b/i);
  const customerTenureMonths = tenureMatch ? parseInt(tenureMatch[1], 10) : 12;

  return { invoiceAmount, paymentTermDays, pastLatePercent, customerTenureMonths };
}

function isGreetingOrHelp(q: string): boolean {
  const cleaned = q.trim().toLowerCase().replace(/[!?.,]+$/g, '');
  const pureGreetings = [
    'hi',
    'hii',
    'hiii',
    'hello',
    'hey',
    'heyy',
    'yo',
    'hola',
    'namaste',
    'sup',
    'howdy',
    'good morning',
    'good afternoon',
    'good evening',
    'thanks',
    'thank you',
  ];
  if (pureGreetings.includes(cleaned)) return true;

  const helpPhrases = [
    'what can you do',
    'who are you',
    'how can you help',
    'help',
    'help me',
    'capabilities',
    'what do you do',
    'show menu',
  ];
  const hasAnalyticalKeyword =
    cleaned.includes('runway') ||
    cleaned.includes('43b') ||
    cleaned.includes('gst') ||
    cleaned.includes('ageing') ||
    cleaned.includes('aging') ||
    cleaned.includes('discount') ||
    cleaned.includes('treds') ||
    cleaned.includes('evaluate') ||
    cleaned.includes('₹') ||
    cleaned.includes('tds');

  if (!hasAnalyticalKeyword && helpPhrases.some((h) => cleaned === h || cleaned.startsWith(h))) {
    return true;
  }
  return false;
}

export function simulate60DayRunway(
  bankBalance: number,
  monthlyBurn: number,
  expectedReceivable: number,
  inflowDay: number
) {
  const dailyBurn = monthlyBurn / 30;
  let running = bankBalance;
  let minPoint = bankBalance;
  let minDay = 0;
  const sampleDays = [0, 7, 14, 20, 28, 35, Math.min(58, Math.max(1, inflowDay)), 45, 52, 60];
  const uniqueDays = Array.from(new Set(sampleDays)).sort((a, b) => a - b);
  const checkpoints: Record<number, number> = {};

  for (let d = 0; d <= 60; d++) {
    if (d > 0) {
      running -= dailyBurn * 0.07;
      if (d === 1 || d === 31) running -= monthlyBurn * 0.15; // rent & utilities
      if (d === 7 || d === 37) running -= monthlyBurn * 0.53; // payroll + TDS
      if (d === 20 || d === 50) running -= monthlyBurn * 0.25; // GST remittance
      if (d === inflowDay && expectedReceivable > 0) running += expectedReceivable;
    }
    if (running < minPoint) {
      minPoint = running;
      minDay = d;
    }
    if (uniqueDays.includes(d)) {
      checkpoints[d] = Math.round(running);
    }
  }

  return {
    minCashPoint: Math.round(minPoint),
    minCashDay: minDay,
    endingCashDay60: Math.round(running),
    safeBuffer: monthlyBurn,
    labels: uniqueDays.map((d) =>
      d === 0
        ? 'D0'
        : d === inflowDay && expectedReceivable > 0
        ? `D${d} (+Inflow)`
        : d === 7
        ? 'D7 (Payroll)'
        : d === 20
        ? 'D20 (GST)'
        : `D${d}`
    ),
    series: uniqueDays.map((d) => checkpoints[d] ?? Math.round(running)),
  };
}

export function generateCopilotTurnResponse(opts: {
  query: string;
  state: WorkspaceState;
  replyDepth: ReplyDepth;
  attachment?: CopilotAttachmentContext | null;
}): CopilotTurnOutput {
  const { query, state, replyDepth, attachment } = opts;
  const q = query.toLowerCase();
  const snap = extractWorkspaceSnapshot(state);
  const thinkingTrace: string[] = [];

  // ---------------------------------------------------------------------------
  // 1. GREETING / GENERAL HELP (Zero fake tools; exact live workspace snapshot)
  // ---------------------------------------------------------------------------
  if (!attachment && isGreetingOrHelp(q)) {
    const dealLine = snap.hasActiveDeal
      ? `Active Deal: **${fmtINR(snap.activeDealAmount)}** (${snap.activeDealClient}, Net-${snap.activeDealTerms})${
          state.currentResult ? ` — **${state.currentResult.blendedRiskPercent.toFixed(1)}% late risk**, Day ${state.currentResult.expectedArrivalDay} arrival` : ''
        }`
      : 'Active Deal: **None entered yet** (`₹0`)';

    const ledgerLine =
      snap.ledgerCount > 0
        ? `Open Receivables: **${snap.ledgerCount} invoices** totaling **${fmtINR(snap.ledgerTotal)}** (${snap.overdueCount} overdue)`
        : 'Open Receivables Ledger: **Empty (`0` invoices)**';

    const cashLine =
      snap.bankBalance > 0 || snap.monthlyBurn > 0
        ? `Treasury Cash: **${fmtINR(snap.bankBalance)}** | Monthly Fixed Burn: **${fmtINR(snap.monthlyBurn)}**`
        : 'Treasury Cash & Burn: **Not set (`₹0`)**';

    const setupHint = snap.isBlank
      ? `\n\nYour workspace is currently **clean/blank**. You can configure your own figures in **Settings & Bridge**, click **Load Demo Preset** on any view to explore sample books, or ask me a custom what-if directly right here.`
      : '';

    const suggestedPrompts = snap.isBlank
      ? [
          `"Evaluate a ₹4,00,000 Net-60 order with 20% past late rate"`,
          `"What is the optimal early-settlement discount vs 8.5% TReDS?"`,
          `"Explain how Section 43B(h) and Section 16(2) ITC protection work"`,
        ]
      : [
          `"Graph my 60-day cash runway and check payroll collisions"`,
          `"Audit overdue receivables and Section 43B(h) buyer leverage"`,
          `"Should I take a 2% early-payment discount or use TReDS / CC?"`,
        ];

    const body =
      replyDepth === 'cfo_brief'
        ? `Hello! I am **float. AI Risk & Treasury Copilot** monitoring **${snap.companyName}**.\n- ${cashLine}\n- ${dealLine} | ${ledgerLine}\n- Try asking: ${suggestedPrompts[0]} or ${suggestedPrompts[1]}`
        : `Hello! I am **float. AI Risk & Treasury Copilot**.\n\n**Current Live Workspace Snapshot (${snap.companyName}):**\n- ${cashLine}\n- ${dealLine}\n- ${ledgerLine}\n- GST & AP Books: **${snap.vendorBillsCount} vendor bills** audited | **${snap.tdsCount} TDS 26AS items** | **${snap.apBillsCount} AP bills queued**${setupHint}\n\n**3 questions you can ask me right now:**\n1. ${suggestedPrompts[0]}\n2. ${suggestedPrompts[1]}\n3. ${suggestedPrompts[2]}`;

    return {
      content: body,
      thinkingTrace: [
        `1. Greeted user and inspected live workspace snapshot for ${snap.companyName}.`,
        `2. Confirmed ${snap.ledgerCount} ledger items, cash ${fmtINR(snap.bankBalance)}, active deal ${fmtINR(snap.activeDealAmount)}. No calculation tool needed for greeting.`,
      ],
      toolsUsed: [],
    };
  }

  // ---------------------------------------------------------------------------
  // 2. ATTACHED FILE INSPECTION
  // ---------------------------------------------------------------------------
  if (attachment) {
    const sumVal = attachment.totalSum || 0;
    const rows = attachment.rowCount || 1;
    const itcLocked = Math.round((sumVal * snap.gstSlab) / (100 + snap.gstSlab));
    const sec43 = calculateSection43bExposure(sumVal || 100000, 46);
    thinkingTrace.push(`1. Parsed uploaded document "${attachment.name}" (${attachment.sizeKb} KB, ${rows} data lines).`);
    thinkingTrace.push(`2. Extracted aggregate financial value: ${sumVal > 0 ? fmtINR(sumVal) : 'text document'}.`);
    if (sumVal > 0) {
      thinkingTrace.push(`3. Computed GST ITC sensitivity (${snap.gstSlab}% slab) = ${fmtINR(itcLocked)} and Sec 43B(h) leverage = ${fmtINR(sec43.extraTaxPayableByBuyer)}.`);
    }

    const content =
      sumVal > 0
        ? replyDepth === 'cfo_brief'
          ? `**Audit of \`${attachment.name}\`:**\n- **Parsed Exposure:** ${fmtINR(sumVal)} across ${rows} rows (${attachment.sizeKb} KB).\n- **GST & Statutory Protection:** ~${fmtINR(itcLocked)} GST ITC component; buyers delaying beyond 45 days face **${fmtINR(sec43.extraTaxPayableByBuyer)}** extra income tax under Sec 43B(h).\n- **Next Step:** Import structured CSV records in **Ageing Matrix** or **Business & Planning** to score each buyer individually.`
          : `### Document Audit: \`${attachment.name}\` (${attachment.sizeKb} KB)\n\n- **Detected Rows:** ${rows} structured lines\n- **Aggregate Value Extracted:** **${fmtINR(sumVal)}**\n- **Implied GST ITC Component (${snap.gstSlab}%):** **${fmtINR(itcLocked)}** (subject to Section 16(2) 180-day payment compliance)\n- **Section 43B(h) Buyer Disallowance Impact:** **+${fmtINR(sec43.extraTaxPayableByBuyer)}** tax penalty if unpaid past 45 days\n\n**Preview Snippet:**\n\`${(attachment.textSnippet || '').slice(0, 260)}\``
        : `### Text Document Read: \`${attachment.name}\` (${attachment.sizeKb} KB)\n\nNo standalone ₹ INR totals were detected automatically in the first lines. You can ask a specific question about the contract terms or import structured invoice CSVs in **Ageing Matrix & Ledger**.\n\n**Preview:**\n\`${(attachment.textSnippet || '').slice(0, 300)}\``;

    return {
      content,
      thinkingTrace,
      toolsUsed: [{ tool: 'inspect_attached_document', args: { filename: attachment.name, total_inr: sumVal } }],
    };
  }

  // ---------------------------------------------------------------------------
  // 3. CUSTOM WHAT-IF DEAL ARITHMETIC (Runs live LightGBM-mirror riskEngine math)
  // ---------------------------------------------------------------------------
  const whatIfDeal = parseWhatIfDealPrompt(query);
  if (whatIfDeal) {
    const syntheticInput: DealInput = {
      invoiceAmount: whatIfDeal.invoiceAmount,
      paymentTermDays: whatIfDeal.paymentTermDays,
      customerTenureMonths: whatIfDeal.customerTenureMonths,
      pastLatePercent: whatIfDeal.pastLatePercent,
      orderSizeVsAvg: 1.25,
      pastAvgDelayDays: Math.round((whatIfDeal.pastLatePercent / 100) * 18),
      dueWeekday: 'Wed',
      macroStressMultiplier: 1.0,
      gstRegistered: state.treasuryDefaults.gstRegistered,
      currentBankBalance: snap.bankBalance,
      monthlyFixedExpenses: snap.monthlyBurn,
    };
    const simResult = evaluateB2bPaymentRisk(syntheticInput);
    const treds = calculateTredsYield(whatIfDeal.invoiceAmount, whatIfDeal.paymentTermDays, 8.5, 0.05);
    const sec43 = calculateSection43bExposure(whatIfDeal.invoiceAmount, 46);
    const riskTier =
      simResult.blendedRiskPercent < 30 ? 'LOW' : simResult.blendedRiskPercent < 60 ? 'MODERATE' : 'HIGH';

    thinkingTrace.push(
      `1. Extracted custom scenario: ${fmtINR(whatIfDeal.invoiceAmount)}, Net-${whatIfDeal.paymentTermDays}, ${whatIfDeal.pastLatePercent}% historical late rate, ${whatIfDeal.customerTenureMonths}m tenure.`
    );
    thinkingTrace.push(
      `2. Executed calibrated risk model using live treasury baseline (${fmtINR(snap.bankBalance)} cash, ${fmtINR(snap.monthlyBurn)} monthly burn).`
    );
    thinkingTrace.push(
      `3. Output: ${simResult.blendedRiskPercent.toFixed(1)}% late risk, expected arrival Day ${simResult.expectedArrivalDay} (P20–P80: Day ${simResult.arrivalWindowLow}–${simResult.arrivalWindowHigh}).`
    );

    let content = '';
    if (replyDepth === 'cfo_brief') {
      content = `**What-If Deal Verdict (${fmtINR(whatIfDeal.invoiceAmount)} • Net-${whatIfDeal.paymentTermDays}):**\n- **Delay Probability:** **${simResult.blendedRiskPercent.toFixed(1)}% (${riskTier} RISK)** — cash likely lands on **Day ${simResult.expectedArrivalDay}** (P20–P80: Day ${simResult.arrivalWindowLow}–${simResult.arrivalWindowHigh}).\n- **Recommended Structure:** **${simResult.recommendedTerms.badgeLabel}** (cuts capital exposure by ${simResult.recommendedTerms.exposureReductionPercent}%).\n- **Day-1 Liquidity Option:** TReDS factoring unlocks **${fmtINR(treds.netImmediateCashPayout)}** immediately at 8.5% p.a. (${fmtINR(treds.grossDiscountCost)} cost).`;
    } else if (replyDepth === 'action_plan') {
      content = `### Action Plan: ${fmtINR(whatIfDeal.invoiceAmount)} Net-${whatIfDeal.paymentTermDays} Order\n\n1. **Restructure Payment Milestones:** Propose **${simResult.recommendedTerms.badgeLabel}** (${simResult.recommendedTerms.rationale}).\n2. **Lock Section 43B(h) Enforcement:** Cap final credit at 45 days via written PO acceptance (triggers **${fmtINR(sec43.extraTaxPayableByBuyer)}** tax disallowance penalty on buyer if delayed).\n3. **De-Risk Day-${simResult.expectedArrivalDay} Drift:** Upload the invoice to RXIL / M1xchange TReDS if cash is needed on Day 1 for **${fmtINR(treds.netImmediateCashPayout)}** net payout.`;
    } else {
      content = `### What-If Deal Evaluation: ${fmtINR(whatIfDeal.invoiceAmount)} (Net-${whatIfDeal.paymentTermDays})\n\n- **Calibrated Late Payment Risk:** **${simResult.blendedRiskPercent.toFixed(1)}%** (${riskTier} RISK)\n- **Expected Cash Arrival:** **Day ${simResult.expectedArrivalDay}** (P20–P80 range: Day ${simResult.arrivalWindowLow} to Day ${simResult.arrivalWindowHigh})\n- **Recommended Counter-Terms:** **${simResult.recommendedTerms.badgeLabel}** — reduces working-capital exposure by **${simResult.recommendedTerms.exposureReductionPercent}%**\n- **TReDS Day-1 Factoring Net Payout (8.5% p.a.):** **${fmtINR(treds.netImmediateCashPayout)}** (discount cost ${fmtINR(treds.grossDiscountCost)})\n- **Section 43B(h) Statutory Leverage:** Buyer loses **${fmtINR(sec43.extraTaxPayableByBuyer)}** in corporate tax deduction if unpaid past Day 45\n\n**Mandated Contract Clause:**\n> ${simResult.recommendedTerms.contractClause}`;
    }

    return {
      content,
      thinkingTrace,
      toolsUsed: [
        {
          tool: 'evaluate_whatif_deal',
          args: {
            invoice_amount: whatIfDeal.invoiceAmount,
            payment_term_days: whatIfDeal.paymentTermDays,
            past_late_percent: whatIfDeal.pastLatePercent,
          },
        },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // 4. MODEL BENCHMARKS & DATASET PROVENANCE
  // ---------------------------------------------------------------------------
  if (
    q.includes('benchmark') ||
    q.includes('roc') ||
    q.includes('pr-auc') ||
    q.includes('f1') ||
    q.includes('dataset') ||
    q.includes('374') ||
    q.includes('59 feature') ||
    q.includes('accuracy')
  ) {
    const champion = CLASSIFICATION_BENCHMARKS.find((b) => b.isChampion) || CLASSIFICATION_BENCHMARKS[CLASSIFICATION_BENCHMARKS.length - 1];
    const totalRecords = DATASET_PROVENANCE.reduce((sum, d) => sum + d.records, 0);
    const sourceCount = DATASET_PROVENANCE.length;
    const featureCount = 59;
    thinkingTrace.push('1. Retrieved verified ensemble evaluation benchmarks from benchmarks.ts.');
    const content =
      replyDepth === 'cfo_brief'
        ? `**float. Ensemble Benchmarks:**\n- **Training Corpus:** **${totalRecords.toLocaleString('en-IN')} Records** across **${sourceCount} Data Sources** and **${featureCount} Features**.\n- **Champion Model (${champion.modelName}):** ROC-AUC **${champion.rocAuc.toFixed(4)}**, PR-AUC **${champion.prAuc.toFixed(4)}**, F1-Score **${champion.f1Score.toFixed(4)}**.\n- **Inference Latency:** Runs deterministically in-browser (<5 ms) or live via Google Colab GPU bridge.`
        : `### Ensemble Architecture & Validation Benchmarks\n\n- **Data Foundation:** **${totalRecords.toLocaleString('en-IN')} records** synthesized across **${sourceCount} data sources** with **${featureCount} engineered features**\n- **Champion Ensemble (${champion.modelName}):**\n  - **ROC-AUC:** \`${champion.rocAuc.toFixed(4)}\`\n  - **PR-AUC:** \`${champion.prAuc.toFixed(4)}\`\n  - **F1-Score:** \`${champion.f1Score.toFixed(4)}\`\n- **Calibration & Explainability:** Isotonic probability calibration + TreeSHAP feature attribution + Isolation Forest anomaly guardrails.`;

    return {
      content,
      thinkingTrace,
      toolsUsed: [{ tool: 'fetch_model_benchmarks', args: { features: featureCount } }],
    };
  }

  // ---------------------------------------------------------------------------
  // 5. EARLY SETTLEMENT DISCOUNT VS TREDS VS BANK OD
  // ---------------------------------------------------------------------------
  if (
    q.includes('discount') ||
    q.includes('apr') ||
    q.includes('treds') ||
    q.includes('factoring')
  ) {
    const baseAmt = snap.activeDealAmount > 0 ? snap.activeDealAmount : snap.ledgerTotal > 0 ? state.ledger[0].invoiceAmount : 0;
    const baseTerm = snap.activeDealAmount > 0 ? snap.activeDealTerms : state.ledger[0]?.paymentTermDays || 45;

    if (baseAmt <= 0) {
      return {
        content: `No invoice principal is currently loaded in your workspace (\`₹0\`).\n\nEnter a deal in **Deal Underwriting**, load a Demo Preset, or ask me directly with an amount — e.g. *"Compare a 2% early discount vs TReDS on a ₹5,00,000 Net-45 invoice"*.`,
        thinkingTrace: ['1. Checked active deal and ledger for principal amount; workspace is currently blank (₹0).'],
        toolsUsed: [],
      };
    }

    const earlyDay = 10;
    const discPct = 2.0;
    const cmp = calculateEarlyPaymentDiscountAPR(baseAmt, baseTerm, earlyDay, discPct, snap.odRate, 8.5);
    const solver = solveOptimalDynamicDiscounting({
      invoice_amount: baseAmt,
      contracted_due_day: baseTerm,
      settlement_day: 5,
      collision_day: 15,
      shortfall_amount: Math.round(snap.monthlyBurn * 0.45) || Math.round(baseAmt * 0.2),
      bank_od_rate: snap.odRate,
      counterparty_name: snap.activeDealClient,
    });

    thinkingTrace.push(`1. Pulled live invoice principal ${fmtINR(baseAmt)} (Net-${baseTerm}) and enterprise OD rate (${snap.odRate}% p.a.).`);
    thinkingTrace.push(`2. 2% cash discount for Day-10 payment implies ${cmp.annualizedDiscountApr}% APR (${fmtINR(cmp.discountCashCost)} vs TReDS ${fmtINR(cmp.tredsCost)}).`);
    thinkingTrace.push(`3. Optimal dynamic discount solver recommends ${solver.optimal_discount_pct}% (${solver.annualized_discount_apr}% APR).`);

    const content =
      replyDepth === 'cfo_brief'
        ? `**Financing & Early-Discount Verdict (${fmtINR(baseAmt)}):**\n- **2% Cash Discount Cost:** Costs **${fmtINR(cmp.discountCashCost)}** (**${cmp.annualizedDiscountApr}% APR** vs your ${snap.odRate}% Bank OD rate).\n- **Optimal Dynamic Discount:** Solver recommends **${solver.optimal_discount_pct}%** for 5-day settlement (saving **${fmtINR(solver.net_benefit_vs_bank_od)}** vs OD cost).\n- **TReDS Factoring Alternative:** Receiving Day-1 liquidity on RXIL/M1xchange costs **${fmtINR(cmp.tredsCost)}** at **8.5% APR** with zero buyer default risk.`
        : replyDepth === 'action_plan'
        ? `### Financing Execution Steps (${fmtINR(baseAmt)})\n\n1. **Avoid Flat 2% Blanket Discounts:** A 2% haircut for ${cmp.daysAccelerated} days early settlement equals **${cmp.annualizedDiscountApr}% APR** (**${fmtINR(cmp.discountCashCost)}** lost).\n2. **Counter with Optimal Tier (${solver.optimal_discount_pct}%):** Offer **${solver.optimal_discount_pct}%** for Day-5 settlement (**${fmtINR(solver.optimal_discount_cost)}** cost), unlocking **${fmtINR(solver.immediate_cash_inflow)}** immediately.\n3. **Keep TReDS / Bank CC Ready:** Benchmark against **8.5% APR TReDS (${fmtINR(cmp.tredsCost)})** or your **${snap.odRate}% Bank CC (${fmtINR(cmp.bankOdCost)})** before conceding more than ${solver.optimal_discount_pct}%.`
        : `### Early Settlement Discount vs TReDS vs Bank Overdraft (${fmtINR(baseAmt)} • Net-${baseTerm})\n\n- **Option A — 2.0% Buyer Cash Discount (Day ${earlyDay}):** **${fmtINR(cmp.discountCashCost)}** cash sacrificed → **${cmp.annualizedDiscountApr}% annualized APR**\n- **Option B — RBI TReDS Factoring (8.5% p.a.):** **${fmtINR(cmp.tredsCost)}** (saves **${fmtINR(Math.max(0, cmp.discountCashCost - cmp.tredsCost))}** vs 2% discount, 100% risk offloaded)\n- **Option C — Bank OD / CC Draw (${snap.odRate}% p.a.):** **${fmtINR(cmp.bankOdCost)}**\n- **Dynamic Discount Solver Recommendation:** **${solver.optimal_discount_pct}%** for Day-5 settlement (${solver.annualized_discount_apr}% APR, net arbitrage gain **${fmtINR(solver.net_benefit_vs_bank_od)}**)`;

    return {
      content,
      thinkingTrace,
      chartKind: 'discount',
      chartTitle: 'Cost of Capital Comparison (Discount APR vs OD vs TReDS)',
      actionSnippet: { label: 'Copy Buyer Settlement Offer', text: solver.settlement_memo },
      toolsUsed: [
        { tool: 'solve_dynamic_discounting', args: { invoice_amount: baseAmt, od_rate_pct: snap.odRate } },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // 6. AGEING MATRIX, LEDGER & CONCENTRATION (HHI)
  // ---------------------------------------------------------------------------
  if (
    q.includes('ageing') ||
    q.includes('aging') ||
    q.includes('ledger') ||
    q.includes('portfolio') ||
    q.includes('overdue') ||
    q.includes('concentration') ||
    q.includes('hhi') ||
    q.includes('debtor')
  ) {
    if (snap.ledgerCount === 0) {
      return {
        content: `Your **Ageing Matrix & Receivables Ledger** currently has **0 invoices (₹0)**.\n\nAdd invoices manually, upload a Tally/Zoho CSV, or click **Load Demo Preset** in **Ageing Matrix & Ledger** to analyze overdue buckets and buyer concentration.`,
        thinkingTrace: ['1. Inspected shared workspaceStore.ledger; found 0 active receivable entries.'],
        toolsUsed: [],
      };
    }

    const rowsForConc = state.ledger.map((l) => ({
      id: l.id,
      client: l.clientName,
      amount: l.invoiceAmount,
      dueIn: l.dueInDays ?? (l.status === 'OVERDUE' ? -15 : l.paymentTermDays),
    }));
    const conc = calculatePortfolioConcentration(rowsForConc, 20);
    const totalMsmeClaim = state.ledger
      .filter((l) => (l.dueInDays ?? 0) < 0)
      .reduce((acc, l) => acc + calculateMsmeCompoundInterest(l.invoiceAmount, l.paymentTermDays || 45, Math.abs(l.dueInDays || 15)).accruedPenalInterest, 0);

    thinkingTrace.push(`1. Aggregated ${snap.ledgerCount} live ledger invoices totaling ${fmtINR(snap.ledgerTotal)}.`);
    thinkingTrace.push(`2. Overdue subset: ${snap.overdueCount} invoices (${fmtINR(snap.overdueTotal)}), accruing ${fmtINR(totalMsmeClaim)} MSMED Sec 16 interest.`);
    thinkingTrace.push(`3. HHI Concentration Index: ${conc.hhiScore} pts (Top counterparty: ${conc.topBuyerName} at ${conc.topBuyerSharePercent.toFixed(1)}%).`);

    const content =
      replyDepth === 'cfo_brief'
        ? `**Receivables Ledger Brief (${snap.ledgerCount} Invoices):**\n- **Total Open Book:** **${fmtINR(snap.ledgerTotal)}** | **Overdue:** **${fmtINR(snap.overdueTotal)}** (${snap.overdueCount} invoices).\n- **Buyer Concentration:** **${conc.topBuyerName}** represents **${conc.topBuyerSharePercent.toFixed(1)}%** of your book (HHI **${conc.hhiScore}** — **${conc.riskCategory.replace(/_/g, ' ')}**).\n- **Statutory Claim:** Overdue accounts have accrued **${fmtINR(totalMsmeClaim)}** in MSMED Section 16 compound interest (20.25% p.a.).`
        : replyDepth === 'action_plan'
        ? `### Receivables Collection & De-Concentration Plan\n\n1. **Chase ${snap.overdueCount} Overdue Accounts (${fmtINR(snap.overdueTotal)}):** Dispatch Section 43B(h) + MSMED Sec 16 notices claiming **${fmtINR(totalMsmeClaim)}** accrued penal interest.\n2. **Cap Single-Buyer Exposure (${conc.topBuyerName}):** Currently at **${conc.topBuyerSharePercent.toFixed(1)}%** (vs 20% prudent MSME cap); require 25%+ advance on incremental orders.\n3. **Route Verified Blue-Chip Invoices to TReDS:** Unlock early cash without increasing customer concentration risk.`
        : `### Live Receivables Ageing & Concentration Audit\n\n- **Total Open Receivables:** **${fmtINR(snap.ledgerTotal)}** across **${snap.ledgerCount} invoices**\n- **Overdue Balance:** **${fmtINR(snap.overdueTotal)}** across **${snap.overdueCount} overdue invoices**\n- **Accrued MSMED Section 16 Interest (20.25% p.a.):** **${fmtINR(totalMsmeClaim)}**\n- **Top Counterparty Share:** **${conc.topBuyerName}** holds **${fmtINR(conc.topBuyerExposure)} (${conc.topBuyerSharePercent.toFixed(1)}%)**\n- **Portfolio Herfindahl Index (HHI):** **${conc.hhiScore} pts** — Tier: **${conc.riskCategory.replace(/_/g, ' ')}**`;

    return {
      content,
      thinkingTrace,
      chartKind: 'aging',
      chartTitle: 'Live Portfolio Ageing Bracket Distribution',
      toolsUsed: [
        { tool: 'inspect_receivables_ledger', args: { invoices: snap.ledgerCount, total_inr: snap.ledgerTotal } },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // 7. CASH FLOW, 60-DAY RUNWAY, PAYROLL COLLISION & NAYAK MPBF
  // ---------------------------------------------------------------------------
  if (
    q.includes('runway') ||
    q.includes('cash') ||
    q.includes('buffer') ||
    q.includes('payroll') ||
    q.includes('burn') ||
    q.includes('collision') ||
    q.includes('liquidity') ||
    q.includes('solvency') ||
    q.includes('graph') ||
    q.includes('ap bill') ||
    q.includes('payable') ||
    q.includes('nayak') ||
    q.includes('mpbf')
  ) {
    const receivablePool = snap.hasActiveDeal ? snap.activeDealAmount : snap.ledgerTotal;
    if (snap.bankBalance === 0 && snap.monthlyBurn === 0 && receivablePool === 0) {
      return {
        content: `Your workspace cash flow parameters are currently **blank (₹0 bank balance, ₹0 monthly burn, ₹0 receivables)**.\n\nSet your bank balance and fixed monthly burn under **Settings & Bridge -> Treasury & Tax** (or click **Load Demo Preset**) so I can simulate your 60-day cash runway and payroll collision risk.`,
        thinkingTrace: ['1. Inspected workspace treasury defaults and receivables; all balances are ₹0.'],
        toolsUsed: [],
      };
    }

    const inflowDay = state.currentResult?.expectedArrivalDay || snap.activeDealTerms || 35;
    const sim = simulate60DayRunway(snap.bankBalance, snap.monthlyBurn, receivablePool, inflowDay);
    const hasCollision = sim.minCashPoint < 0;
    const nayak = calculateNayakWorkingCapital(state.enterpriseProfile.annualTurnover || 0, snap.ccLimit);

    thinkingTrace.push(
      `1. Initialized 60-day simulation from live cash ${fmtINR(snap.bankBalance)} and monthly burn ${fmtINR(snap.monthlyBurn)}.`
    );
    thinkingTrace.push(
      `2. Scheduled expected inflow of ${fmtINR(receivablePool)} on Day ${inflowDay}; modeled Day-7 payroll (45%), rent (15%), TDS (8%), and Day-20 GST (25%).`
    );
    thinkingTrace.push(
      `3. Lowest cash point: ${fmtINR(sim.minCashPoint)} on Day ${sim.minCashDay}; 60-day closing cash: ${fmtINR(sim.endingCashDay60)}.`
    );

    const content =
      replyDepth === 'cfo_brief'
        ? `**60-Day Cash Runway Brief:**\n- **Starting Cash vs Burn:** **${fmtINR(snap.bankBalance)}** cash vs **${fmtINR(snap.monthlyBurn)}/mo** fixed burn (scheduled inflow **${fmtINR(receivablePool)}** on Day ${inflowDay}).\n- **Lowest Point:** **${fmtINR(sim.minCashPoint)}** on **Day ${sim.minCashDay}** (${hasCollision ? 'CRITICAL CASH DEFICIT' : 'Positive buffer maintained'}).\n- **Day-60 Projected Balance:** **${fmtINR(sim.endingCashDay60)}**${nayak.workingCapitalGap > 0 ? ` (untapped RBI Nayak CC eligibility: +${fmtINR(nayak.workingCapitalGap)})` : ''}.`
        : replyDepth === 'action_plan'
        ? `### Treasury Liquidity Action Plan\n\n1. **Protect Day-7 Payroll (${fmtINR(Math.round(snap.monthlyBurn * 0.45))}) & Day-20 GST:** Monitor cash dipping to **${fmtINR(sim.minCashPoint)}** on **Day ${sim.minCashDay}**.\n2. ${hasCollision ? `**Close ${fmtINR(Math.abs(sim.minCashPoint))} Deficit Before Day ${sim.minCashDay}:** Accelerate ${fmtINR(receivablePool)} collection via dynamic discounting or draw on your **${fmtINR(snap.ccLimit)}** Cash Credit limit.` : `**Preserve Safe Reserve (${fmtINR(snap.monthlyBurn)}):** Prioritize Section 43B(h) & Section 16(2) AP vendor bills first (${snap.apBillsCount} bills queued: ${fmtINR(snap.apTotal)}).`}\n3. **Bank Limit Benchmarking:** Check **${fmtINR(Math.max(0, nayak.workingCapitalGap))}** additional working-capital headroom under the RBI Nayak 20% turnover norm.`
        : `### 60-Day Live Treasury Runway Projection\n\n- **Opening Bank Balance:** **${fmtINR(snap.bankBalance)}**\n- **Monthly Fixed Operating Burn:** **${fmtINR(snap.monthlyBurn)}** (Payroll 45%, GST 25%, Rent 15%, TDS 8%)\n- **Modeled Receivable Inflow:** **${fmtINR(receivablePool)}** arriving on **Day ${inflowDay}**\n- **Minimum Cash Trough:** **${fmtINR(sim.minCashPoint)}** on **Day ${sim.minCashDay}** (${hasCollision ? '⚠️ Below Zero — Payroll/GST Collision Risk' : '✅ Solvent throughout 60-day window'})\n- **Projected Day-60 Balance:** **${fmtINR(sim.endingCashDay60)}**\n- **Queued AP Payables:** **${snap.apBillsCount} bills** totaling **${fmtINR(snap.apTotal)}**`;

    return {
      content,
      thinkingTrace,
      chartKind: 'runway',
      chartTitle: '60-Day Projected Cash Buffer (Live Treasury State)',
      toolsUsed: [
        {
          tool: 'simulate_cash_runway',
          args: {
            bank_balance: snap.bankBalance,
            monthly_burn: snap.monthlyBurn,
            receivable_inflow: receivablePool,
          },
        },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // 8. GST COMPLIANCE, SECTION 16(2), SECTION 43B(H), MSMED & TDS 26AS
  // ---------------------------------------------------------------------------
  if (
    q.includes('gst') ||
    q.includes('itc') ||
    q.includes('43b') ||
    q.includes('16(2)') ||
    q.includes('section 16') ||
    q.includes('26as') ||
    q.includes('tds') ||
    q.includes('statutory') ||
    q.includes('notice') ||
    q.includes('msmed') ||
    q.includes('vendor') ||
    q.includes('disallowance')
  ) {
    const dealVal = snap.hasActiveDeal
      ? snap.activeDealAmount
      : snap.overdueTotal > 0
      ? snap.overdueTotal
      : snap.ledgerTotal;
    const sec43 = dealVal > 0 ? calculateSection43bExposure(dealVal, 46) : null;
    const msmeClaim = dealVal > 0 ? calculateMsmeCompoundInterest(dealVal, 45, 30) : null;
    const netGstPayable = Math.max(0, state.gstState.monthlyOutputGst - snap.eligibleItc);
    const hasGstData = snap.vendorBillsCount > 0 || snap.tdsCount > 0 || dealVal > 0;

    thinkingTrace.push(
      `1. Audited ${snap.vendorBillsCount} GSTR-2B vendor bills (Eligible ITC: ${fmtINR(snap.eligibleItc)}, Missing GSTR-1 ITC: ${fmtINR(snap.missingGstr1Itc)}).`
    );
    thinkingTrace.push(`2. Checked ${snap.tdsCount} TDS Form 26AS items (Uncredited gap: ${fmtINR(snap.tdsMissing)}).`);
    if (dealVal > 0 && sec43) {
      thinkingTrace.push(`3. Evaluated Sec 43B(h) buyer tax disallowance on ${fmtINR(dealVal)} = ${fmtINR(sec43.extraTaxPayableByBuyer)}.`);
    }

    const noticeText =
      dealVal > 0 && msmeClaim && sec43
        ? `FORMAL DEMAND NOTICE — MSMED ACT 2006 & SEC 43B(h) INCOME TAX ACT\nCounterparty: ${snap.activeDealClient}\nUnpaid Principal: ${fmtINR(dealVal)}\nAccrued Sec 16 Compound Interest (20.25% p.a.): ${fmtINR(msmeClaim.accruedPenalInterest)}\nBuyer Tax Disallowance Under Sec 43B(h): ${fmtINR(sec43.extraTaxPayableByBuyer)} + Form 3CD Clause 22 Disclosure\nRemit principal + statutory interest immediately.`
        : undefined;

    if (!hasGstData) {
      return {
        content: `### Statutory Compliance Status (Blank Workspace)\n\nYou currently have **0 vendor bills** and **0 overdue receivables** loaded.\n\n- **How Section 43B(h) works:** Buyers purchasing from Micro & Small enterprises must settle within **45 days** (written agreement) or **15 days** (no agreement), or lose the entire expense tax deduction for the fiscal year.\n- **How Section 16(2) GST ITC works:** Input Tax Credit from vendor bills unpaid past **180 days** (or missing from GSTR-2B) must be reversed with 18% interest.\n\nLoad your vendor bills or click **Load Demo Preset** in **GST Compliance & ITC** to reconcile real ITC holds.`,
        thinkingTrace,
        toolsUsed: [],
      };
    }

    const content =
      replyDepth === 'cfo_brief'
        ? `**GST & Statutory Shield Brief (${snap.msmeCategory} Enterprise):**\n- **GSTR-2B ITC Audit:** **${fmtINR(snap.eligibleItc)}** verified eligible ITC vs **${fmtINR(snap.missingGstr1Itc)}** blocked/missing GSTR-1 (held payouts: **${fmtINR(snap.heldPaymentsValue)}**).\n- **TDS 26AS Gap:** **${fmtINR(snap.tdsMissing)}** deducted by buyers but missing in Form 26AS.\n- **Section 43B(h) Leverage:** ${sec43 ? `Overdue/active exposure of ${fmtINR(dealVal)} triggers **${fmtINR(sec43.extraTaxPayableByBuyer)}** extra buyer corporate tax after Day 45.` : 'Load an invoice to calculate exact buyer tax disallowance.'}`
        : replyDepth === 'action_plan'
        ? `### Statutory Execution Checklist\n\n1. **Enforce GSTR-2B Payment Holds (${fmtINR(snap.heldPaymentsValue)} held):** Release vendor payments only after GSTR-1/2B reflection so **${fmtINR(snap.missingGstr1Itc)}** ITC is protected.\n2. **Recover Uncredited TDS (${fmtINR(snap.tdsMissing)}):** Issue Section 203 notices from **GST Compliance -> TDS 26AS**.\n3. **Trigger Section 43B(h) & MSMED Sec 16 Demand:**${sec43 ? ` Remind slow buyers on ${fmtINR(dealVal)} that unpaid MSME invoices lose **${fmtINR(sec43.extraTaxPayableByBuyer)}** in tax shield and accrue **20.25% p.a.** interest.` : ' Serve formal Form 3CD Clause 22 notice prior to March 31.'}`
        : `### Live GST Compliance & Statutory Shield Summary\n\n- **GSTR-2B Vendor Audit (${snap.vendorBillsCount} Bills):** Eligible ITC **${fmtINR(snap.eligibleItc)}** | Missing GSTR-1 ITC **${fmtINR(snap.missingGstr1Itc)}** | Vendor Payouts Held **${fmtINR(snap.heldPaymentsValue)}**\n- **Net Cash GST Liability (Est.):** **${fmtINR(netGstPayable)}** (on ${fmtINR(state.gstState.monthlyOutputGst)} output tax)\n- **Form 26AS TDS Gap:** **${fmtINR(snap.tdsMissing)}** pending across ${snap.tdsCount} tracked items\n${sec43 && msmeClaim ? `- **Section 43B(h) Buyer Leverage (${fmtINR(dealVal)}):** **+${fmtINR(sec43.extraTaxPayableByBuyer)}** extra corporate tax on delinquent buyers past 45 days + **${fmtINR(msmeClaim.accruedPenalInterest)}** accrued Sec 16 interest (20.25% p.a.)` : ''}`;

    return {
      content,
      thinkingTrace,
      actionSnippet: noticeText ? { label: 'Copy Sec 43B(h) Notice', text: noticeText } : undefined,
      toolsUsed: [
        {
          tool: 'audit_statutory_compliance',
          args: { vendor_bills: snap.vendorBillsCount, tds_items: snap.tdsCount, msme_tier: snap.msmeCategory },
        },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // 9. ENTERPRISE PROFILE / CC LIMIT / CUSTOM ADAPTER
  // ---------------------------------------------------------------------------
  if (
    q.includes('profile') ||
    q.includes('enterprise') ||
    q.includes('company') ||
    q.includes('cc limit') ||
    q.includes('overdraft rate') ||
    q.includes('adapter') ||
    q.includes('custom business')
  ) {
    const nayak = calculateNayakWorkingCapital(state.enterpriseProfile.annualTurnover || 0, snap.ccLimit);
    thinkingTrace.push(`1. Read live Enterprise Profile (${snap.companyName}), OD rate ${snap.odRate}%, CC Limit ${fmtINR(snap.ccLimit)}.`);

    const content = `### Active Enterprise & Adapter Profile\n\n- **Entity:** **${snap.companyName}** (${snap.msmeCategory} MSME)\n- **Cash Credit / OD Facility:** **${fmtINR(snap.ccLimit)}** @ **${snap.odRate}% p.a.** | Gross Margin Baseline: **${snap.grossMargin}%**\n- **RBI Nayak 20% Entitlement:** **${fmtINR(nayak.maxPermissibleBankFinance)}** (${nayak.workingCapitalGap > 0 ? `+${fmtINR(nayak.workingCapitalGap)} untapped headroom` : 'at or above norm'})\n- **Custom Business Adapter:** ${snap.customAdapterActive ? `**ACTIVE** (${snap.customRecordsCount} historical invoice records indexed)` : 'Inactive — train custom weights in **Business & Planning**'}`;

    return {
      content,
      thinkingTrace,
      toolsUsed: [{ tool: 'inspect_enterprise_profile', args: { configured: snap.isProfileConfigured } }],
    };
  }

  // ---------------------------------------------------------------------------
  // 10. ACTIVE DEAL RISK / TERMS / SHAP / COUNTER-OFFER
  // ---------------------------------------------------------------------------
  if (
    q.includes('deal') ||
    q.includes('risk') ||
    q.includes('term') ||
    q.includes('split') ||
    q.includes('milestone') ||
    q.includes('counter') ||
    q.includes('shap') ||
    q.includes('predict') ||
    q.includes('arrival') ||
    q.includes('score') ||
    q.includes('anomaly')
  ) {
    if (!snap.hasActiveDeal) {
      return {
        content: `No active deal is currently entered in **Deal Underwriting** (\`₹0\`).\n\nYou can either:\n- Enter an invoice on **Deal Underwriting** (or click one of the 5 Demo Presets there),\n- Click **arrow (→)** on any row in **Ageing Matrix & Ledger**, or\n- Ask me directly in chat, e.g. *"Evaluate a ₹4,00,000 Net-60 order with 20% past late rate"*.`,
        thinkingTrace: ['1. Checked state.intake and state.currentResult; invoiceAmount is ₹0.'],
        toolsUsed: [],
      };
    }

    const res = state.currentResult || evaluateB2bPaymentRisk(state.intake as DealInput);
    const tier = res.blendedRiskPercent < 30 ? 'LOW' : res.blendedRiskPercent < 60 ? 'MODERATE' : 'HIGH';
    thinkingTrace.push(`1. Read active deal for ${snap.activeDealClient}: ${fmtINR(snap.activeDealAmount)}, Net-${snap.activeDealTerms}.`);
    thinkingTrace.push(`2. Calibrated late-payment probability: ${res.blendedRiskPercent.toFixed(1)}% (${tier}), expected Day ${res.expectedArrivalDay}.`);
    thinkingTrace.push(`3. Recommended milestone terms: ${res.recommendedTerms.badgeLabel} (cuts exposure ${res.recommendedTerms.exposureReductionPercent}%).`);

    const content =
      replyDepth === 'cfo_brief'
        ? `**Active Deal Brief (${snap.activeDealClient} • ${fmtINR(snap.activeDealAmount)}):**\n- **Delay Probability:** **${res.blendedRiskPercent.toFixed(1)}% (${tier} RISK)** — cash expected on **Day ${res.expectedArrivalDay}** (vs Net-${snap.activeDealTerms}).\n- **Recommended Split:** **${res.recommendedTerms.badgeLabel}** (cuts working-capital exposure **${res.recommendedTerms.exposureReductionPercent}%**).\n- **Treasury Buffer:** ${res.isRunwayCollision ? `**RUNWAY COLLISION** on Day ${res.collisionDay}` : `Buffer safe (**+${fmtINR(res.cashBufferAtArrival)}** at arrival)`}.`
        : replyDepth === 'action_plan'
        ? `### Deal Negotiation Action Plan (${snap.activeDealClient})\n\n1. **Send Counter-Proposal:** **${res.recommendedTerms.badgeLabel}** (${res.recommendedTerms.rationale}).\n2. **Insert Statutory Clause:** *${res.recommendedTerms.contractClause}*\n3. **Mitigate ${res.expectedArrivalDay - snap.activeDealTerms}d Predicted Slippage:** ${res.isRunwayCollision ? `Collision detected on Day ${res.collisionDay} — discount on TReDS or require upfront advance before production.` : `Keep TReDS (8.5% p.a.) ready if buyer exceeds Day ${snap.activeDealTerms}.`}`
        : `### Active Deal Risk Dossier: ${snap.activeDealClient}\n\n- **Invoice Principal & Terms:** **${fmtINR(snap.activeDealAmount)}** on **Net-${snap.activeDealTerms}**\n- **Late-Payment Risk Score:** **${res.blendedRiskPercent.toFixed(1)}% (${tier} RISK)**\n- **Predicted Arrival Window:** **Day ${res.expectedArrivalDay}** (P20–P80: Day ${res.arrivalWindowLow}–${res.arrivalWindowHigh})\n- **Recommended Terms:** **${res.recommendedTerms.badgeLabel}** (${res.recommendedTerms.exposureReductionPercent}% exposure reduction)\n- **GST ITC Locked (Sec 16(2)):** **${fmtINR(res.gstItcLocked)}** | **Treasury Status:** ${res.isRunwayCollision ? `Collision on Day ${res.collisionDay}` : `+${fmtINR(res.cashBufferAtArrival)} buffer`}`;

    return {
      content,
      thinkingTrace,
      actionSnippet: { label: 'Copy Contract Clause', text: res.recommendedTerms.contractClause },
      toolsUsed: [
        {
          tool: 'run_deal_prediction',
          args: {
            invoice_amount: snap.activeDealAmount,
            payment_term_days: snap.activeDealTerms,
            counterparty: snap.activeDealClient,
          },
        },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // 11. CONVERSATIONAL GENERAL FALLBACK (No fake tool execution)
  // ---------------------------------------------------------------------------
  return {
    content: `I am monitoring your live **float.** workspace for **${snap.companyName}**.\n\n**Current Live Numbers:**\n- **Bank Balance:** ${fmtINR(snap.bankBalance)} | **Monthly Burn:** ${fmtINR(snap.monthlyBurn)}\n- **Active Deal:** ${snap.hasActiveDeal ? `${fmtINR(snap.activeDealAmount)} (${snap.activeDealClient})` : 'None entered (`₹0`)'}\n- **Receivables Ledger:** ${snap.ledgerCount} invoices (${fmtINR(snap.ledgerTotal)})\n\nAsk me specifically about **"active deal risk"**, **"60-day cash runway"**, **"overdue receivables & HHI"**, **"Section 43B(h) & GST ITC"**, or test a scenario like *"Evaluate a ₹4,00,000 Net-60 order with 20% past late rate"*.`,
    thinkingTrace: ['1. Query did not match a specific calculation tool; returned live workspace summary without triggering synthetic tool execution.'],
    toolsUsed: [],
  };
}

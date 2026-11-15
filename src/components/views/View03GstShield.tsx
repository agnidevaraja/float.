import React, { useState, useMemo } from 'react';
import { useWorkspace } from '../../store/workspaceStore';
import {
  ShieldCheck,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Copy,
  Download,
  Check,
  Scale,
  FileText,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Info,
  DollarSign,
  FileSpreadsheet,
  Building2,
  Lock,
  Percent,
} from 'lucide-react';
import {
  calculateSection43bExposure,
  calculateTdsReconciliation,
  generateTdsDemandNotice,
} from '../../engine/statutoryEngine';
import type { TdsReceivableItem } from '../../types/statutory';
import { EChartBox } from '../charts/EChartBox';
import type { EChartsOption } from 'echarts';

const INITIAL_TDS_ITEMS: TdsReceivableItem[] = [
  {
    id: 'TDS-01',
    clientName: 'Tata Motors Fleet Division Ltd',
    invoiceId: 'INV-2026-001',
    invoiceAmount: 4850000,
    tdsSection: '194Q_0.1%',
    tdsRatePercent: 0.1,
    expectedTdsAmount: 4850,
    creditedIn26AS: true,
    form16aReceived: true,
    daysPending: 0,
  },
  {
    id: 'TDS-02',
    clientName: 'Larsen & Toubro Heavy Civil Infra',
    invoiceId: 'INV-2026-002',
    invoiceAmount: 2200000,
    tdsSection: '194C_2%',
    tdsRatePercent: 2.0,
    expectedTdsAmount: 44000,
    creditedIn26AS: false,
    form16aReceived: false,
    daysPending: 74,
  },
  {
    id: 'TDS-03',
    clientName: 'Adani Logistics & Warehousing Hub',
    invoiceId: 'INV-2026-004',
    invoiceAmount: 1450000,
    tdsSection: '194C_2%',
    tdsRatePercent: 2.0,
    expectedTdsAmount: 29000,
    creditedIn26AS: false,
    form16aReceived: false,
    daysPending: 42,
  },
  {
    id: 'TDS-04',
    clientName: 'Jindal Steel & Power Project Office',
    invoiceId: 'INV-2026-005',
    invoiceAmount: 3100000,
    tdsSection: '194Q_0.1%',
    tdsRatePercent: 0.1,
    expectedTdsAmount: 3100,
    creditedIn26AS: true,
    form16aReceived: true,
    daysPending: 0,
  },
  {
    id: 'TDS-05',
    clientName: 'Kalyani Tech & Engineering Services',
    invoiceId: 'INV-2026-008',
    invoiceAmount: 680000,
    tdsSection: '194J_10%',
    tdsRatePercent: 10.0,
    expectedTdsAmount: 68000,
    creditedIn26AS: false,
    form16aReceived: false,
    daysPending: 105,
  },
];

const SLABS = [5, 12, 18, 28];
const TAX_RATES = [
  { label: '31.2% (Standard Corporate 30% + Surcharge + Cess)', value: 31.2 },
  { label: '25.17% (MSME Corporate 25% + Cess)', value: 25.17 },
  { label: '22.88% (Concessional Section 115BAA)', value: 22.88 },
];

interface VendorInvoice {
  id: string;
  vendorName: string;
  gstin: string;
  invoiceNumber: string;
  taxableAmount: number;
  gstAmount: number;
  status: 'GSTR1_FILED' | 'GSTR1_MISSING' | 'BLOCKED_17_5';
  actionTaken?: 'HOLD_PAYMENT' | 'RELEASE_PAYMENT';
}

const INITIAL_VENDOR_INVOICES: VendorInvoice[] = [
  {
    id: 'V-01',
    vendorName: 'Kaveri Industrial Supplies Ltd',
    gstin: '27AABCK1298R1ZM',
    invoiceNumber: 'INV/25-26/0412',
    taxableAmount: 450000,
    gstAmount: 81000,
    status: 'GSTR1_FILED',
  },
  {
    id: 'V-02',
    vendorName: 'Apex Cloud Hosting & DevOps LLP',
    gstin: '07AACCA9912Q1ZL',
    invoiceNumber: 'ACH/MAR/881',
    taxableAmount: 180000,
    gstAmount: 32400,
    status: 'GSTR1_MISSING',
    actionTaken: 'HOLD_PAYMENT',
  },
  {
    id: 'V-03',
    vendorName: 'Royal Executive Travel & Hospitality',
    gstin: '29AABCR4419P1Z8',
    invoiceNumber: 'RETH-40192',
    taxableAmount: 85000,
    gstAmount: 15300,
    status: 'BLOCKED_17_5',
  },
  {
    id: 'V-04',
    vendorName: 'Tata Steel Processing Center',
    gstin: '24AAACT2727Q1ZW',
    invoiceNumber: 'TSPC/W/19024',
    taxableAmount: 920000,
    gstAmount: 165600,
    status: 'GSTR1_FILED',
  },
  {
    id: 'V-05',
    vendorName: 'Shree Logistics & Transport Hub',
    gstin: '27AAACS1818B1ZT',
    invoiceNumber: 'SLTH-8821',
    taxableAmount: 140000,
    gstAmount: 25200,
    status: 'GSTR1_MISSING',
    actionTaken: 'HOLD_PAYMENT',
  },
];

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);

export const View03GstShield: React.FC = () => {
  const { state } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'reconciliation' | 'gst16' | 'sec43b' | 'tds26as'>('reconciliation');

  // Tab 1: GSTR-2B Vendor Reconciliation State
  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>(INITIAL_VENDOR_INVOICES);
  const [monthlyOutputGst, setMonthlyOutputGst] = useState<number>(380000); // GST collected on our sales

  // Tab 2: GST Section 16(2) State
  const [customInvoiceAmount, setCustomInvoiceAmount] = useState<number | ''>(
    state.intake.invoiceAmount || 140000
  );
  const [slab, setSlab] = useState<number>(18);
  const [isInterstate, setIsInterstate] = useState<boolean>(false);
  const [daysElapsedGst, setDaysElapsedGst] = useState<number>(145);
  const [copiedWorkpaper, setCopiedWorkpaper] = useState<boolean>(false);

  // Tab 3: Section 43B(h) State
  const [hasWrittenAgreement, setHasWrittenAgreement] = useState<boolean>(true);
  const [buyerTaxRate, setBuyerTaxRate] = useState<number>(31.2);
  const [daysElapsed43b, setDaysElapsed43b] = useState<number>(48);
  const [letterCopied, setLetterCopied] = useState<boolean>(false);

  // Tab 4: TDS 26AS Reconciliation State
  const [tdsItems, setTdsItems] = useState<TdsReceivableItem[]>(INITIAL_TDS_ITEMS);
  const [selectedTdsClient, setSelectedTdsClient] = useState<string>('Larsen & Toubro Heavy Civil Infra');
  const [copiedTdsNotice, setCopiedTdsNotice] = useState<boolean>(false);
  const tdsSummary = useMemo(() => calculateTdsReconciliation(tdsItems), [tdsItems]);
  const activeTdsNotice = useMemo(() => {
    const missingForClient = tdsItems.filter(
      (i) => i.clientName === selectedTdsClient && !i.creditedIn26AS
    );
    return generateTdsDemandNotice(selectedTdsClient, missingForClient);
  }, [selectedTdsClient, tdsItems]);

  // -------------------------------------------------------------
  // CALCULATIONS: TAB 1 (GSTR-2B Reconciliation)
  // -------------------------------------------------------------
  const reconMetrics = useMemo(() => {
    let eligibleItc = 0;
    let missingGstr1Itc = 0;
    let blocked17_5Itc = 0;
    let heldPaymentTotal = 0;

    vendorInvoices.forEach((inv) => {
      if (inv.status === 'GSTR1_FILED') {
        eligibleItc += inv.gstAmount;
      } else if (inv.status === 'GSTR1_MISSING') {
        missingGstr1Itc += inv.gstAmount;
        if (inv.actionTaken === 'HOLD_PAYMENT') {
          heldPaymentTotal += inv.taxableAmount + inv.gstAmount;
        }
      } else if (inv.status === 'BLOCKED_17_5') {
        blocked17_5Itc += inv.gstAmount;
      }
    });

    const netCashGstPayable = Math.max(0, monthlyOutputGst - eligibleItc);

    return {
      eligibleItc,
      missingGstr1Itc,
      blocked17_5Itc,
      netCashGstPayable,
      heldPaymentTotal,
      totalVendorGst: eligibleItc + missingGstr1Itc + blocked17_5Itc,
    };
  }, [vendorInvoices, monthlyOutputGst]);

  const toggleHoldPayment = (id: string) => {
    setVendorInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv;
        const nextAction = inv.actionTaken === 'HOLD_PAYMENT' ? undefined : 'HOLD_PAYMENT';
        return { ...inv, actionTaken: nextAction };
      })
    );
  };

  // EChart for GSTR-2B Breakdown with Direct Numerical Labels & High Contrast
  const reconChartOption: EChartsOption = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: '{b}: <b style="color:#FAFAFA;">₹{c}</b> ({d}%)',
        backgroundColor: '#111113',
        borderColor: '#27272A',
        textStyle: { color: '#FAFAFA', fontSize: 11, fontFamily: 'monospace' },
      },
      legend: {
        bottom: 2,
        left: 'center',
        textStyle: { color: '#A1A1AA', fontSize: 9, fontFamily: 'monospace' },
        itemWidth: 10,
        itemHeight: 7,
        itemGap: 12,
      },
      series: [
        {
          name: 'ITC Composition',
          type: 'pie',
          radius: ['32%', '50%'],
          center: ['50%', '40%'],
          avoidLabelOverlap: true,
          label: {
            show: true,
            position: 'outside',
            formatter: (p: any) => {
              const shortName = p.name.includes('Eligible')
                ? 'Eligible ITC'
                : p.name.includes('Non-Filer')
                ? 'Non-Filer ITC'
                : 'Blocked ITC';
              return `${shortName}\n₹${(p.value / 100000).toFixed(2)}L (${p.percent.toFixed(0)}%)`;
            },
            color: '#FAFAFA',
            fontSize: 9,
            fontFamily: 'monospace',
            fontWeight: 'bold',
            overflow: 'none',
          },
          labelLine: {
            length: 8,
            length2: 10,
            lineStyle: { color: '#52525B' },
          },
          emphasis: {
            focus: 'none',
            itemStyle: { opacity: 1 },
          },
          data: [
            {
              value: reconMetrics.eligibleItc,
              name: 'Eligible ITC (Verified)',
              itemStyle: { color: '#10B981' },
            },
            {
              value: reconMetrics.missingGstr1Itc,
              name: 'At-Risk Non-Filer ITC',
              itemStyle: { color: '#EF4444' },
            },
            {
              value: reconMetrics.blocked17_5Itc,
              name: 'Blocked ITC (Sec 17(5))',
              itemStyle: { color: '#F59E0B' },
            },
          ],
        },
      ],
    };
  }, [reconMetrics]);

  // -------------------------------------------------------------
  // CALCULATIONS: TAB 2 (GST Section 16(2) 180-Day Rule)
  // -------------------------------------------------------------
  const principal = typeof customInvoiceAmount === 'number' ? customInvoiceAmount : 0;
  const rate = slab / 100;
  const totalGst = principal * rate;
  const cgst = isInterstate ? 0 : totalGst / 2;
  const sgst = isInterstate ? 0 : totalGst / 2;
  const igst = isInterstate ? totalGst : 0;
  const itcLocked = totalGst;

  const daysRemainingGst = Math.max(0, 180 - daysElapsedGst);
  const isGstBreached = daysElapsedGst > 180;
  const overdueDaysGst = isGstBreached ? daysElapsedGst - 180 : 0;
  const penaltyInterest = isGstBreached
    ? itcLocked * 0.18 * (daysElapsedGst / 365)
    : itcLocked * 0.18 * (180 / 365);

  const workpaperNoticeText = `GSTR-3B TABLE 4(B)(2) MANDATORY REVERSAL WORKPAPER
----------------------------------------------------------------------
Statutory Authority: Proviso to Section 16(2), CGST Act, 2017
Recipient Compliance Reference: GSTR-3B Filing Cycle (20th of Month)

INVOICE & TAX DETAILS:
- Invoice Principal: ${fmt(principal)}
- Applicable GST Rate: ${slab}% (${isInterstate ? 'IGST' : 'CGST + SGST'})
- Input Tax Credit Originally Claimed: ${fmt(itcLocked)}
- Days Elapsed Since Invoice Date: ${daysElapsedGst} Days
- Statutory Cutoff: 180 Days

AUDIT FINDING:
${
  isGstBreached
    ? `[MANDATORY REVERSAL TRIGGERED]
Payment has exceeded 180 days by ${overdueDaysGst} days.
Under Rule 37 of CGST Rules, 2017:
1. Recipient MUST reverse ITC in GSTR-3B Table 4(B)(2): ${fmt(itcLocked)}
2. Penal Interest payable under Section 50(1) @ 18% p.a.: ${fmt(penaltyInterest)}
3. Total Cash Liability due to Government: ${fmt(itcLocked + penaltyInterest)}

NOTE: Upon actual payment to supplier, ITC may be reclaimed under Table 4(A)(5). Interest paid is non-refundable.`
    : `[WITHIN COMPLIANCE WINDOW]
${daysRemainingGst} Days remaining until the 180-day statutory deadline.
Action: Remit payment before Day 180 to retain ITC without interest liability.`
}
Generated by float. Statutory Compliance Engine`;

  const handleCopyWorkpaper = () => {
    navigator.clipboard.writeText(workpaperNoticeText);
    setCopiedWorkpaper(true);
    setTimeout(() => setCopiedWorkpaper(false), 2000);
  };

  // -------------------------------------------------------------
  // CALCULATIONS: TAB 3 (Section 43B(h) Engine)
  // -------------------------------------------------------------
  const sec43bResult = calculateSection43bExposure(
    principal,
    daysElapsed43b,
    hasWrittenAgreement,
    buyerTaxRate
  );

  const handleCopyNotice = () => {
    navigator.clipboard.writeText(sec43bResult.complianceNoticeText);
    setLetterCopied(true);
    setTimeout(() => setLetterCopied(false), 2000);
  };

  const handleDownloadNotice = () => {
    const blob = new Blob([sec43bResult.complianceNoticeText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `section_43b_h_notice_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handlers for TDS Section 203 Demand Notice
  const handleCopyTdsNotice = () => {
    navigator.clipboard.writeText(activeTdsNotice);
    setCopiedTdsNotice(true);
    setTimeout(() => setCopiedTdsNotice(false), 2000);
  };

  const handleDownloadTdsNotice = () => {
    const blob = new Blob([activeTdsNotice], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sec203_tds_demand_notice_${selectedTdsClient.replace(/\s+/g, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-sans text-[var(--text-primary)]">
          GST Compliance &amp; Statutory Tax Shield
        </h1>
        <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
          GSTR-2B Input Tax Credit reconciliation, Section 16(2) 180-day reversal clock, and Section 43B(h) buyer disallowance leverage.
        </p>
      </div>

      {/* Institutional Explainer Banner */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[var(--accent-primary)] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-[var(--text-primary)] uppercase">
              How GST Rules Directly Protect &amp; Affect Your Cash:
            </span>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed font-sans">
              <b>1. Non-Filing Vendors:</b> If a vendor forgets to file GSTR-1, their invoice is missing from your GSTR-2B. Under Rule 36(4), you cannot claim that tax credit and must pay cash to the government on the 20th.<br />
              <b>2. 180-Day Reversal:</b> If you don't pay a supplier within 180 days, Section 16(2) forces you to repay that tax credit with 18% annual interest.<br />
              <b>3. Section 43B(h):</b> If your corporate buyers delay paying you past 45 days, the government disallows their expense deduction, slapping them with 31.2% extra income tax.
            </p>
          </div>
        </div>
      </div>

      {/* 4-Tab Operational Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
        <button
          type="button"
          onClick={() => setActiveTab('reconciliation')}
          className={`py-2 px-3 rounded-full text-xs font-sans transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-1.5 border ${
            activeTab === 'reconciliation'
              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white font-semibold shadow-sm'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <FileSpreadsheet className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'reconciliation' ? 'text-white' : 'text-[var(--accent-primary)]'}`} />
          <span className="truncate">GSTR-2B ITC Match</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gst16')}
          className={`py-2 px-3 rounded-full text-xs font-sans transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-1.5 border ${
            activeTab === 'gst16'
              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white font-semibold shadow-sm'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <ShieldAlert className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'gst16' ? 'text-white' : 'text-[var(--accent-warn)]'}`} />
          <span className="truncate">Sec 16(2) 180D Clock</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sec43b')}
          className={`py-2 px-3 rounded-full text-xs font-sans transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-1.5 border ${
            activeTab === 'sec43b'
              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white font-semibold shadow-sm'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <Scale className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'sec43b' ? 'text-white' : 'text-[var(--accent-primary)]'}`} />
          <span className="truncate">Sec 43B(h) Shield</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tds26as')}
          className={`py-2 px-3 rounded-full text-xs font-sans transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-1.5 border ${
            activeTab === 'tds26as'
              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white font-semibold shadow-sm'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <Percent className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'tds26as' ? 'text-white' : 'text-[var(--accent-safe)]'}`} />
          <span className="truncate">TDS 26AS Recovery</span>
        </button>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: GSTR-2B VENDOR ITC RECONCILIATION & CASH OUTFLOW        */}
      {/* ============================================================= */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          {/* Top Cash Outflow KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[var(--border-hairline)] border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            <div className="p-3.5">
              <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)] block">
                Output GST on Your Sales
              </span>
              <span className="text-base font-mono font-bold text-[var(--text-primary)] tabular-nums mt-0.5 block">
                {fmt(monthlyOutputGst)}
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">
                Collected from customers
              </span>
            </div>

            <div className="p-3.5">
              <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)] block">
                Eligible ITC (Matched in 2B)
              </span>
              <span className="text-base font-mono font-bold text-[var(--accent-safe)] tabular-nums mt-0.5 block">
                -{fmt(reconMetrics.eligibleItc)}
              </span>
              <span className="text-[9px] font-mono text-[var(--accent-safe)]">
                Ready to offset tax
              </span>
            </div>

            <div className="p-3.5">
              <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)] block">
                Net Cash GST Due on 20th
              </span>
              <span className="text-base font-mono font-bold text-[var(--accent-primary)] tabular-nums mt-0.5 block">
                {fmt(reconMetrics.netCashGstPayable)}
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">
                Cash required in bank
              </span>
            </div>

            <div className="p-3.5">
              <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)] block">
                At-Risk ITC (Non-Filing Vendors)
              </span>
              <span className="text-base font-mono font-bold text-[var(--accent-danger)] tabular-nums mt-0.5 block">
                {fmt(reconMetrics.missingGstr1Itc)}
              </span>
              <span className="text-[9px] font-mono text-[var(--accent-danger)]">
                {fmt(reconMetrics.heldPaymentTotal)} payments held
              </span>
            </div>
          </div>

          {/* Visualization & Cash Strategy */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  GSTR-2B ITC Composition
                </span>
                <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                  Breakdown of Input Tax Credits across compliance categories.
                </p>
              </div>
              <div className="my-2">
                <EChartBox option={reconChartOption} height={280} title="GSTR-2B Input Tax Credit (ITC) Composition" />
              </div>
              <div className="text-[9px] font-mono text-[var(--text-tertiary)] border-t border-[var(--border-hairline)] pt-2 text-center">
                Total Vendor GST: {fmt(reconMetrics.totalVendorGst)}
              </div>
            </div>

            <div className="lg:col-span-2 border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[var(--accent-warn)]" />
                  Automated Cash Protection Strategy: Vendor Payment Hold
                </span>
                <p className="text-xs font-mono text-[var(--text-muted)] mt-1 leading-relaxed">
                  When a vendor does not upload their invoice to the GST portal by the 11th of the month, their tax does not appear in your GSTR-2B. Under GST Rule 36(4), claiming this credit invites automatic tax department scrutiny (DRC-01B).
                </p>
              </div>

              <div className="border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-3 space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center text-[var(--text-primary)]">
                  <span>Currently Held Vendor Outflows:</span>
                  <span className="text-base font-bold text-[var(--accent-warn)] tabular-nums">
                    {fmt(reconMetrics.heldPaymentTotal)}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--text-tertiary)]">
                  By withholding invoice payout to non-filing vendors until they file GSTR-1, you preserve {fmt(reconMetrics.heldPaymentTotal)} in liquid treasury reserves and avoid losing {fmt(reconMetrics.missingGstr1Itc)} in uncredited GST!
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-[10px] font-mono text-[var(--text-muted)]">
                  Simulate Output GST:
                </div>
                <input
                  type="number"
                  value={monthlyOutputGst}
                  onChange={(e) => setMonthlyOutputGst(parseFloat(e.target.value) || 0)}
                  className="field-input font-mono text-right w-36 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Vendor Invoices Audit Table */}
          <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
              <div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                  Vendor Invoice Ingestion &amp; GSTR-2B Matching Ledger
                </span>
                <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                  Live verification of supplier GSTINs and filing status.
                </p>
              </div>
              <span className="text-[9px] font-mono text-[var(--text-tertiary)]">
                {vendorInvoices.length} Invoices Audited
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[10px] font-mono uppercase text-[var(--text-tertiary)]">
                    <th className="py-2.5 px-3 font-semibold">Vendor Legal Name</th>
                    <th className="py-2.5 px-3 font-semibold">GSTIN</th>
                    <th className="py-2.5 px-3 font-semibold">Invoice #</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Taxable Val</th>
                    <th className="py-2.5 px-3 font-semibold text-right">GST (18%)</th>
                    <th className="py-2.5 px-3 font-semibold text-center">GSTR-1 Status</th>
                    <th className="py-2.5 px-3 font-semibold text-center">ITC Eligibility</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Cash Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)] text-xs font-mono">
                  {vendorInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="py-3 px-3 text-[var(--text-primary)] font-medium">
                        {inv.vendorName}
                      </td>
                      <td className="py-3 px-3 text-[var(--text-muted)] font-mono text-[11px]">
                        {inv.gstin}
                      </td>
                      <td className="py-3 px-3 text-[var(--text-muted)] font-mono text-[11px]">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-right text-[var(--text-primary)]">
                        {fmt(inv.taxableAmount)}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-right text-[var(--text-primary)] font-semibold">
                        {fmt(inv.gstAmount)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block rounded-full whitespace-nowrap px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-wider border ${
                            inv.status === 'GSTR1_FILED'
                              ? 'border-[var(--accent-safe)]/40 text-[var(--accent-safe)] bg-[var(--accent-safe)]/5'
                              : inv.status === 'GSTR1_MISSING'
                              ? 'border-[var(--accent-danger)]/40 text-[var(--accent-danger)] bg-[var(--accent-danger)]/5 font-bold'
                              : 'border-[var(--accent-warn)]/40 text-[var(--accent-warn)] bg-[var(--accent-warn)]/5'
                          }`}
                        >
                          {inv.status === 'GSTR1_FILED'
                            ? 'FILED ON TIME'
                            : inv.status === 'GSTR1_MISSING'
                            ? 'NOT FILED / MISSING'
                            : 'BLOCKED 17(5)'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block whitespace-nowrap px-2 py-0.5 text-[9px] font-mono uppercase ${
                            inv.status === 'GSTR1_FILED'
                              ? 'text-[var(--accent-safe)]'
                              : inv.status === 'GSTR1_MISSING'
                              ? 'text-[var(--accent-danger)] font-bold'
                              : 'text-[var(--accent-warn)]'
                          }`}
                        >
                          {inv.status === 'GSTR1_FILED'
                            ? 'ELIGIBLE (2B MATCHED)'
                            : inv.status === 'GSTR1_MISSING'
                            ? 'INELIGIBLE (HOLD PAYMENT)'
                            : 'BLOCKED STATUTE'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {inv.status === 'GSTR1_MISSING' ? (
                          <button
                            type="button"
                            onClick={() => toggleHoldPayment(inv.id)}
                            className={`rounded-full whitespace-nowrap inline-flex items-center justify-center gap-1.5 px-3 py-1 text-[9px] font-mono uppercase tracking-wider border transition-all duration-150 active:scale-[0.98] shrink-0 ${
                              inv.actionTaken === 'HOLD_PAYMENT'
                                ? 'border-[var(--accent-warn)] bg-[var(--accent-warn)] text-black font-bold shadow-sm'
                                : 'border-[var(--border-hairline)] text-[var(--text-muted)] hover:border-[var(--accent-warn)] hover:text-[var(--accent-warn)]'
                            }`}
                          >
                            {inv.actionTaken === 'HOLD_PAYMENT' ? 'PAYMENT HELD' : 'HOLD PAYMENT'}
                          </button>
                        ) : (
                          <span className="inline-block rounded-full px-2.5 py-0.5 bg-[var(--bg-elevated)] text-[10px] text-[var(--text-tertiary)] font-mono whitespace-nowrap">
                            APPROVED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: GST SECTION 16(2) 180-DAY REVERSAL CLOCK              */}
      {/* ============================================================= */}
      {activeTab === 'gst16' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Tax Calculator */}
            <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-hairline)]">
                <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                  Statutory GST &amp; ITC Parameters
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">
                    Invoice Principal Amount (INR)
                  </label>
                  <input
                    type="number"
                    value={customInvoiceAmount}
                    onChange={(e) =>
                      setCustomInvoiceAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                    }
                    placeholder="e.g. 140000"
                    className="field-input font-mono text-right"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">
                    GST Tax Slab
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {SLABS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSlab(s)}
                        className={`py-2 text-xs font-mono border transition-colors ${
                          slab === s
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)] font-bold'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:border-[var(--text-tertiary)]'
                        }`}
                      >
                        {s}%
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">
                    Supply Jurisdiction
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsInterstate(false)}
                      className={`py-2 text-xs font-mono border transition-colors ${
                        !isInterstate
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)] font-bold'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                      }`}
                    >
                      Intra-State (CGST + SGST)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsInterstate(true)}
                      className={`py-2 text-xs font-mono border transition-colors ${
                        isInterstate
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)] font-bold'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                      }`}
                    >
                      Inter-State (IGST)
                    </button>
                  </div>
                </div>

                {/* Calculated Breakdown Card */}
                <div className="border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-3.5 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Taxable Principal:</span>
                    <span className="text-[var(--text-primary)] tabular-nums">{fmt(principal)}</span>
                  </div>
                  {!isInterstate ? (
                    <>
                      <div className="flex justify-between text-[var(--text-muted)]">
                        <span>CGST ({slab / 2}%):</span>
                        <span className="text-[var(--text-primary)] tabular-nums">{fmt(cgst)}</span>
                      </div>
                      <div className="flex justify-between text-[var(--text-muted)]">
                        <span>SGST ({slab / 2}%):</span>
                        <span className="text-[var(--text-primary)] tabular-nums">{fmt(sgst)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>IGST ({slab}%):</span>
                      <span className="text-[var(--text-primary)] tabular-nums">{fmt(igst)}</span>
                    </div>
                  )}
                  <div className="border-t border-[var(--border-hairline)] pt-2 flex justify-between font-bold">
                    <span className="text-[var(--text-primary)]">Gross Total Invoiced:</span>
                    <span className="text-[var(--text-primary)] tabular-nums">
                      {fmt(principal + totalGst)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-[var(--accent-warn)]">
                    <span>Input Tax Credit (ITC):</span>
                    <span className="tabular-nums">{fmt(itcLocked)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 16(2) Statutory 180-Day Rule */}
            <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-hairline)]">
                <ShieldAlert className="w-4 h-4 text-[var(--accent-warn)]" />
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                  CGST Act Section 16(2) Clock
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-[var(--text-tertiary)] mb-1">
                    <span>INVOICE AGE (DAYS SINCE ISSUANCE)</span>
                    <span className="font-bold text-[var(--text-primary)]">{daysElapsedGst} DAYS</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="240"
                    value={daysElapsedGst}
                    onChange={(e) => setDaysElapsedGst(parseInt(e.target.value) || 0)}
                    className="w-full accent-[var(--accent-primary)] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-[var(--text-tertiary)] mt-1">
                    <span>Day 0 (Issued)</span>
                    <span className="text-[var(--accent-warn)]">Day 120 (Warning)</span>
                    <span className="text-[var(--accent-danger)] font-bold">Day 180 (Reversal Mandate)</span>
                  </div>
                </div>

                {/* Status Box */}
                <div
                  className={`p-4 border space-y-2 ${
                    isGstBreached
                      ? 'border-[var(--accent-danger)] bg-[var(--accent-danger)]/5'
                      : daysElapsedGst > 120
                      ? 'border-[var(--accent-warn)] bg-[var(--accent-warn)]/5'
                      : 'border-[var(--accent-safe)] bg-[var(--accent-safe)]/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold uppercase tracking-wider ${
                        isGstBreached
                          ? 'text-[var(--accent-danger)]'
                          : daysElapsedGst > 120
                          ? 'text-[var(--accent-warn)]'
                          : 'text-[var(--accent-safe)]'
                      }`}
                    >
                      {isGstBreached
                        ? 'CRITICAL STATUTORY BREACH'
                        : daysElapsedGst > 120
                        ? 'URGENT REVERSAL WARNING'
                        : 'COMPLIANT (ITC PROTECTED)'}
                    </span>
                    <span className="text-xs font-mono font-bold tabular-nums text-[var(--text-primary)]">
                      {isGstBreached
                        ? `${overdueDaysGst}d Past 180-Day Cutoff`
                        : `${daysRemainingGst}d Remaining`}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-[var(--text-muted)] leading-relaxed">
                    {isGstBreached
                      ? `Mandatory reversal required in GSTR-3B Table 4(B)(2). You must repay ${fmt(
                          itcLocked
                        )} ITC plus 18% p.a. penal interest (${fmt(penaltyInterest)}) to the government.`
                      : daysElapsedGst > 120
                      ? `Approaching the 180-day cliff. Ensure vendor invoice payment is settled within ${daysRemainingGst} days to prevent statutory clawback.`
                      : `Within the 180-day grace period. Input Tax Credit is safe provided payment is released before Day 180.`}
                  </p>
                </div>

                {/* Statutory Output Workpaper */}
                <div className="border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-3.5 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Mandatory ITC Reversal:</span>
                    <span
                      className={`font-bold tabular-nums ${
                        isGstBreached ? 'text-[var(--accent-danger)]' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {isGstBreached ? fmt(itcLocked) : '₹0 (Not Yet Triggered)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Penal Interest under Sec 50(1) (18% p.a.):</span>
                    <span
                      className={`font-bold tabular-nums ${
                        isGstBreached ? 'text-[var(--accent-danger)]' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {isGstBreached ? fmt(penaltyInterest) : '₹0'}
                    </span>
                  </div>
                  <div className="border-t border-[var(--border-hairline)] pt-2 flex justify-between font-bold">
                    <span className="text-[var(--text-primary)]">GSTR-3B Table 4(B)(2) Liability:</span>
                    <span
                      className={`tabular-nums ${
                        isGstBreached ? 'text-[var(--accent-danger)]' : 'text-[var(--accent-safe)]'
                      }`}
                    >
                      {isGstBreached ? fmt(itcLocked + penaltyInterest) : '₹0'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyWorkpaper}
                  className="w-full py-2 text-xs font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedWorkpaper ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[var(--accent-safe)]" /> Copied Workpaper to Clipboard
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy GSTR-3B Table 4(B)(2) Workpaper
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 3: INCOME TAX SECTION 43B(h) DISALLOWANCE ENGINE         */}
      {/* ============================================================= */}
      {activeTab === 'sec43b' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Parameters */}
            <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-hairline)]">
                <Scale className="w-4 h-4 text-[var(--accent-primary)]" />
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                  Section 43B(h) Commercial Leverage Parameters
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">
                    Unpaid Invoice Principal (INR)
                  </label>
                  <input
                    type="number"
                    value={customInvoiceAmount}
                    onChange={(e) =>
                      setCustomInvoiceAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                    }
                    placeholder="e.g. 140000"
                    className="field-input font-mono text-right"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">
                    Written Supply Agreement Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setHasWrittenAgreement(true)}
                      className={`py-2 px-3 text-xs font-mono border transition-colors ${
                        hasWrittenAgreement
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)] font-bold'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                      }`}
                    >
                      Agreement in Place (45-Day Cap)
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasWrittenAgreement(false)}
                      className={`py-2 px-3 text-xs font-mono border transition-colors ${
                        !hasWrittenAgreement
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)] font-bold'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                      }`}
                    >
                      No Written Agreement (15-Day Cap)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">
                    Buyer Corporate Tax Bracket
                  </label>
                  <div className="space-y-1.5">
                    {TAX_RATES.map((tr) => (
                      <button
                        key={tr.value}
                        type="button"
                        onClick={() => setBuyerTaxRate(tr.value)}
                        className={`w-full py-2 px-3 text-xs font-mono border text-left flex items-center justify-between transition-colors ${
                          buyerTaxRate === tr.value
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)] font-bold'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                        }`}
                      >
                        <span>{tr.label}</span>
                        <span className="tabular-nums">{tr.value}%</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-mono text-[var(--text-tertiary)] mb-1">
                    <span>DAYS ELAPSED SINCE INVOICE DATE</span>
                    <span className="font-bold text-[var(--text-primary)]">{daysElapsed43b} DAYS</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    value={daysElapsed43b}
                    onChange={(e) => setDaysElapsed43b(parseInt(e.target.value) || 0)}
                    className="w-full accent-[var(--accent-primary)] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-[var(--text-tertiary)] mt-1">
                    <span>Day 0</span>
                    <span className="text-[var(--accent-warn)]">Day 15 (No Agreement)</span>
                    <span className="text-[var(--accent-danger)] font-bold">Day 45 (Statutory Max)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculations & Commercial Leverage */}
            <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-hairline)]">
                <FileText className="w-4 h-4 text-[var(--accent-primary)]" />
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                  Disallowance Financial Impact on Delinquent Buyer
                </span>
              </div>

              {/* Status Header Box */}
              <div
                className={`p-4 border space-y-2 ${
                  sec43bResult.isBreached
                    ? 'border-[var(--accent-danger)] bg-[var(--accent-danger)]/5'
                    : 'border-[var(--accent-safe)] bg-[var(--accent-safe)]/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-bold uppercase tracking-wider ${
                      sec43bResult.isBreached
                        ? 'text-[var(--accent-danger)]'
                        : 'text-[var(--accent-safe)]'
                    }`}
                  >
                    {sec43bResult.isBreached
                      ? 'TAX DISALLOWANCE TRIGGERED'
                      : 'WITHIN STATUTORY PAYMENT PERIOD'}
                  </span>
                  <span className="text-xs font-mono font-bold tabular-nums text-[var(--text-primary)]">
                    {sec43bResult.daysOverdue > 0
                      ? `${sec43bResult.daysOverdue} Days Past Cutoff`
                      : `${sec43bResult.daysRemaining} Days to Deadline`}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-[var(--text-muted)] leading-relaxed">
                  {sec43bResult.isBreached
                    ? `Because payment exceeds the ${sec43bResult.statutoryLimitDays}-day statutory limit, your buyer CANNOT deduct this ${fmt(
                        principal
                      )} purchase expense in FY 2025-26. Their statutory tax auditor must flag this in Form 3CD Clause 22.`
                    : `Buyer is still within the legal ${sec43bResult.statutoryLimitDays}-day window. Informing them now prevents their auditor from flagging this liability.`}
                </p>
              </div>

              {/* Numerical Breakdown */}
              <div className="border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-3.5 space-y-2.5 text-xs font-mono">
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Applicable Statutory Deadline:</span>
                  <span className="text-[var(--text-primary)] font-bold">
                    Net-{sec43bResult.statutoryLimitDays} Days
                  </span>
                </div>
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Total Expense Disallowance Amount:</span>
                  <span className="text-[var(--text-primary)] font-bold tabular-nums">
                    {fmt(sec43bResult.taxDisallowedAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-[var(--accent-danger)]">
                  <span>Buyer Extra Income Tax Penalty ({buyerTaxRate}%):</span>
                  <span className="font-bold tabular-nums">
                    +{fmt(sec43bResult.extraTaxPayableByBuyer)}
                  </span>
                </div>
                <div className="flex justify-between text-[var(--accent-warn)]">
                  <span>Accrued MSMED Interest (3x RBI Bank Rate):</span>
                  <span className="font-bold tabular-nums">
                    +{fmt(Math.round(sec43bResult.invoiceAmount * 0.2025 * (sec43bResult.daysOverdue / 365)))}
                  </span>
                </div>
                <div className="border-t border-[var(--border-hairline)] pt-2 flex justify-between font-bold">
                  <span className="text-[var(--text-primary)]">Total Direct Financial Cost to Buyer:</span>
                  <span className="text-[var(--accent-danger)] tabular-nums">
                    +{fmt(sec43bResult.extraTaxPayableByBuyer + Math.round(sec43bResult.invoiceAmount * 0.2025 * (sec43bResult.daysOverdue / 365)))}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyNotice}
                  className="flex-1 py-2 px-3 text-xs font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] flex items-center justify-center gap-1.5 transition-colors"
                >
                  {letterCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[var(--accent-safe)]" /> Copied Form 3CD Notice
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Clause 22 Letter
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadNotice}
                  className="py-2 px-3 text-xs font-mono border border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download (.TXT)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 4: TDS 26AS RECONCILIATION & SECTION 203 RECOVERY          */}
      {/* ============================================================= */}
      {activeTab === 'tds26as' && (
        <div className="space-y-4">
          {/* Hero Banner */}
          <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-hairline)] gap-2">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-[var(--accent-primary)]" />
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Customer TDS Receivable Reconciliation &amp; Form 26AS / AIS Recovery
                  </h3>
                  <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                    Corporate buyers cut TDS before paying, but frequently fail to deposit with the government or file Form 26Q. This locks your working capital and prevents advance tax credit.
                  </p>
                </div>
              </div>
              <div
                className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase border self-start sm:self-auto ${
                  tdsSummary.reconciliationRatePercent < 50
                    ? 'border-[var(--accent-danger)] bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]'
                    : 'border-[var(--accent-safe)] bg-[var(--accent-safe)]/10 text-[var(--accent-safe)]'
                }`}
              >
                {tdsSummary.reconciliationRatePercent < 50 ? 'CRITICAL TDS LOCKUP' : '26AS HEALTHY'}
              </div>
            </div>

            {/* 4-Stat Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
                <span className="text-[9px] uppercase text-[var(--text-tertiary)] block">
                  Total Withheld by Buyers
                </span>
                <span className="text-base font-bold text-[var(--text-primary)] tabular-nums block mt-0.5">
                  {fmt(tdsSummary.totalExpectedTds)}
                </span>
                <span className="text-[9px] text-[var(--text-muted)]">Across 5 audited commercial invoices</span>
              </div>

              <div className="p-3 border border-[var(--accent-safe)]/40 bg-[var(--accent-safe)]/5 space-y-1">
                <span className="text-[9px] uppercase text-[var(--accent-safe)] block">
                  Reflected in Form 26AS / AIS
                </span>
                <span className="text-base font-bold text-[var(--accent-safe)] tabular-nums block mt-0.5">
                  {fmt(tdsSummary.totalCredited26AS)}
                </span>
                <span className="text-[9px] text-[var(--text-muted)]">Available for advance tax credit</span>
              </div>

              <div className="p-3 border border-[var(--accent-danger)]/40 bg-[var(--accent-danger)]/5 space-y-1">
                <span className="text-[9px] uppercase text-[var(--accent-danger)] block">
                  Unreconciled Locked Working Capital
                </span>
                <span className="text-base font-bold text-[var(--accent-danger)] tabular-nums block mt-0.5">
                  {fmt(tdsSummary.totalUnreconciledTds)}
                </span>
                <span className="text-[9px] text-[var(--text-danger)]">
                  {tdsItems.filter((i) => !i.creditedIn26AS).length} buyers have not filed Form 26Q
                </span>
              </div>

              <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
                <span className="text-[9px] uppercase text-[var(--text-tertiary)] block">
                  26AS Matching Rate
                </span>
                <span
                  className="text-base font-bold tabular-nums block mt-0.5"
                  style={{
                    color:
                      tdsSummary.reconciliationRatePercent > 70
                        ? 'var(--accent-safe)'
                        : 'var(--accent-danger)',
                  }}
                >
                  {tdsSummary.reconciliationRatePercent}%
                </span>
                <span className="text-[9px] text-[var(--text-muted)]">
                  Target: 100% TRACES reconciliation
                </span>
              </div>
            </div>
          </div>

          {/* TDS Reconciliation Ledger */}
          <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
              <div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                  TDS Receivable Ledger &amp; Customer Filing Compliance
                </span>
                <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                  Select a delinquent buyer to generate a formal Section 203 demand notice to unblock tax credits.
                </p>
              </div>
            </div>

            <div className="border border-[var(--border-hairline)] bg-[var(--bg-canvas)] overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[10px] font-mono uppercase text-[var(--text-tertiary)]">
                    <th className="py-2.5 px-3 font-semibold">Customer Legal Name</th>
                    <th className="py-2.5 px-3 font-semibold">Invoice Ref</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Gross Amount</th>
                    <th className="py-2.5 px-3 font-semibold text-center">TDS Section</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Withheld TDS</th>
                    <th className="py-2.5 px-3 font-semibold text-center">26AS Portal Status</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Form 16A Certificate</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Enforcement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)] text-xs font-mono">
                  {tdsItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-[var(--bg-elevated)] transition-colors ${
                        selectedTdsClient === item.clientName ? 'bg-[var(--bg-elevated)]' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-sans font-medium text-[var(--text-primary)]">
                        {item.clientName}
                      </td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">{item.invoiceId}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-[var(--text-primary)]">
                        {fmt(item.invoiceAmount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-1.5 py-0.5 text-[9px] border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                          Sec {item.tdsSection.split('_')[0]} ({item.tdsRatePercent}%)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold text-[var(--text-primary)]">
                        {fmt(item.expectedTdsAmount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.creditedIn26AS ? (
                          <span className="px-2 py-0.5 text-[9px] border border-[var(--accent-safe)]/40 text-[var(--accent-safe)]">
                            REFLECTED IN 26AS
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-bold border border-[var(--accent-danger)] bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]">
                            MISSING ({item.daysPending}d Overdue)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.form16aReceived ? (
                          <span className="text-[10px] text-[var(--accent-safe)]">RECEIVED</span>
                        ) : (
                          <span className="text-[10px] text-[var(--accent-danger)] font-bold">
                            PENDING ISSUANCE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {!item.creditedIn26AS ? (
                          <button
                            type="button"
                            onClick={() => setSelectedTdsClient(item.clientName)}
                            className="px-2.5 py-1 text-[10px] font-mono border border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-colors"
                          >
                            SELECT BUYER
                          </button>
                        ) : (
                          <span className="text-[10px] text-[var(--text-tertiary)]">RECONCILED</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 203 Legal Notice Preview & Export */}
          <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[var(--border-hairline)] gap-2">
              <div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--accent-primary)]" />
                  Section 203 Income Tax Demand Notice for: {selectedTdsClient}
                </span>
                <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                  Statutory notice citing Sections 199, 200, 203 and penal consequences under Section 272A of the Income Tax Act, 1961.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyTdsNotice}
                  className="px-3 py-1 text-xs font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] flex items-center gap-1.5 transition-colors"
                >
                  {copiedTdsNotice ? <Check className="w-3.5 h-3.5 text-[var(--accent-safe)]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedTdsNotice ? 'Copied Notice' : 'Copy Notice'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTdsNotice}
                  className="px-3 py-1 text-xs font-mono border border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download (.TXT)
                </button>
              </div>
            </div>
            <pre className="p-3 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[11px] font-mono text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
              {activeTdsNotice}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

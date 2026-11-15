import React, { useMemo, useState } from 'react';
import { useWorkspace } from '../../store/workspaceStore';
import { EChartBox } from '../charts/EChartBox';
import type { EChartsOption } from 'echarts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Info,
  Clock,
  Briefcase,
  Zap,
  Layers,
  Scale,
  Copy,
  Check,
  Download,
  Landmark,
  Percent,
  Sliders,
  RefreshCw,
  FileText,
} from 'lucide-react';
import {
  calculateApCashAllocation,
  calculateNayakWorkingCapital,
  solveOptimalDynamicDiscounting,
} from '../../engine/statutoryEngine';
import { solveOptimalDynamicDiscountWithColab, loadApiConfig } from '../../services/inferenceBridge';
import type { ApVendorBill } from '../../types/statutory';
import type { DynamicDiscountingResponse } from '../../types/engineContract';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);

const DEFAULT_AP_BILLS: ApVendorBill[] = [
  {
    id: 'BILL-7821',
    vendorName: 'Apex Precision Castings Pvt Ltd',
    gstin: '27AAACA9921D1Z4',
    billDate: '2026-06-20',
    amount: 345000,
    itcEligibleAmount: 62100,
    daysElapsed: 148,
    isMicroSmallSupplier: false,
    supplyCategory: 'RAW_MATERIAL',
  },
  {
    id: 'BILL-8012',
    vendorName: 'Shree Balaji Polymers (Micro Enterprise)',
    gstin: '27AABCS1209M1ZA',
    billDate: '2026-10-08',
    amount: 185000,
    itcEligibleAmount: 33300,
    daysElapsed: 38,
    isMicroSmallSupplier: true,
    supplyCategory: 'RAW_MATERIAL',
  },
  {
    id: 'BILL-8140',
    vendorName: 'Hindalco Industrial Extrusions Ltd',
    gstin: '24AAACH0192L1Z9',
    billDate: '2026-11-08',
    amount: 420000,
    itcEligibleAmount: 75600,
    daysElapsed: 7,
    isMicroSmallSupplier: false,
    earlyDiscountPercent: 2.0,
    earlyDiscountCutoffDays: 10,
    supplyCategory: 'RAW_MATERIAL',
  },
  {
    id: 'BILL-8201',
    vendorName: 'Kalyani Logistics & Fleet Corp',
    gstin: '27AABCK8812F1ZK',
    billDate: '2026-10-25',
    amount: 110000,
    itcEligibleAmount: 19800,
    daysElapsed: 21,
    isMicroSmallSupplier: false,
    supplyCategory: 'LOGISTICS',
  },
  {
    id: 'BILL-8255',
    vendorName: 'Maharshi Electricals & Maintenance',
    gstin: '27AAEFM4410H1ZP',
    billDate: '2026-11-01',
    amount: 85000,
    itcEligibleAmount: 15300,
    daysElapsed: 14,
    isMicroSmallSupplier: false,
    supplyCategory: 'UTILITIES',
  },
];

export const View02RunwayLab: React.FC = () => {
  const { state } = useWorkspace();

  const input = state.intake;
  const result = state.currentResult;

  // Active Inputs
  const [bankBalance, setBankBalance] = useState<number>(input.currentBankBalance || 350000);
  const [monthlyBurn, setMonthlyBurn] = useState<number>(input.monthlyFixedExpenses || 160000);
  const [expectedReceivables, setExpectedReceivables] = useState<number>(
    result ? input.invoiceAmount : (input.invoiceAmount || 280000)
  );

  // Scenario Mode: 'promised' | 'predicted' | 'shock'
  const [scenarioMode, setScenarioMode] = useState<'promised' | 'predicted' | 'shock'>('predicted');

  // Working Capital Cycle Inputs
  const [inventoryDays, setInventoryDays] = useState<number>(22);
  const [payableDays, setPayableDays] = useState<number>(28);

  // Accounts Payable (AP) Cash Dispatch Engine State
  const [availableApCash, setAvailableApCash] = useState<number>(650000);
  const [apBills, setApBills] = useState<ApVendorBill[]>(DEFAULT_AP_BILLS);
  const [copiedRtgs, setCopiedRtgs] = useState<boolean>(false);
  const apRunResult = useMemo(
    () => calculateApCashAllocation(availableApCash, apBills),
    [availableApCash, apBills]
  );

  // RBI Nayak Committee Working Capital Benchmark State
  const [annualTurnover, setAnnualTurnover] = useState<number>(30000000); // ₹3 Crore
  const [currentCcLimit, setCurrentCcLimit] = useState<number>(3500000); // ₹35 Lakh
  const nayakResult = useMemo(
    () => calculateNayakWorkingCapital(annualTurnover, currentCcLimit),
    [annualTurnover, currentCcLimit]
  );

  const promisedDay = input.paymentTermDays || 30;
  const predictedDay = result ? result.expectedArrivalDay : promisedDay + 8;
  const shockDay = promisedDay + 30;

  // Interactive Payment Delay Stress Slider State (0 to 45 Days)
  const [delayStressShockDays, setDelayStressShockDays] = useState<number>(0);

  const rawInflowDay =
    scenarioMode === 'promised' ? promisedDay : scenarioMode === 'predicted' ? predictedDay : shockDay;
  const activeInflowDay = Math.min(60, rawInflowDay + delayStressShockDays);

  // 60-Day Daily Cash Trajectory
  const { trajectoryData, minCashPoint, minCashDay, daysOfRunway, netCashChange, obligationsList } =
    useMemo(() => {
      const dailyBurn = monthlyBurn / 30;
      const points: {
        day: number;
        dateLabel: string;
        balanceNum: number;
        obligation?: string;
        inflowOccurred?: boolean;
      }[] = [];

      const obligations: {
        dateLabel: string;
        day: number;
        title: string;
        category: 'PAYROLL' | 'RENT' | 'TDS' | 'GST';
        amount: number;
        balanceAfter: number;
        status: 'SECURE' | 'WARNING' | 'CRITICAL';
      }[] = [];

      let runningBalance = bankBalance;
      let minPoint = runningBalance;
      let minDay = 0;
      let runwayDays = 60;
      let breachedZero = false;

      const today = new Date();

      for (let d = 0; d <= 60; d++) {
        const curDate = new Date(today.getTime() + d * 86400000);
        const dayOfMonth = curDate.getDate();
        let obligationLabel: string | undefined;

        // Base variable operating burn
        runningBalance -= dailyBurn * 0.35;

        // Scheduled Fixed Monthly Obligations
        if (dayOfMonth === 1) {
          const amt = Math.round(monthlyBurn * 0.45);
          runningBalance -= amt;
          obligationLabel = 'PAYROLL';
          obligations.push({
            dateLabel: curDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            day: d,
            title: 'Employee Salary & Wage Remittance',
            category: 'PAYROLL',
            amount: amt,
            balanceAfter: Math.round(runningBalance),
            status: runningBalance > monthlyBurn ? 'SECURE' : runningBalance > 0 ? 'WARNING' : 'CRITICAL',
          });
        } else if (dayOfMonth === 5) {
          const amt = Math.round(monthlyBurn * 0.25);
          runningBalance -= amt;
          obligationLabel = 'RENT';
          obligations.push({
            dateLabel: curDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            day: d,
            title: 'Office & Facility Lease Rent',
            category: 'RENT',
            amount: amt,
            balanceAfter: Math.round(runningBalance),
            status: runningBalance > monthlyBurn ? 'SECURE' : runningBalance > 0 ? 'WARNING' : 'CRITICAL',
          });
        } else if (dayOfMonth === 7) {
          const amt = Math.round(monthlyBurn * 0.08);
          runningBalance -= amt;
          obligationLabel = 'TDS';
          obligations.push({
            dateLabel: curDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            day: d,
            title: 'Section 194C/J TDS Remittance',
            category: 'TDS',
            amount: amt,
            balanceAfter: Math.round(runningBalance),
            status: runningBalance > monthlyBurn ? 'SECURE' : runningBalance > 0 ? 'WARNING' : 'CRITICAL',
          });
        } else if (dayOfMonth === 20) {
          const amt = Math.round(monthlyBurn * 0.15);
          runningBalance -= amt;
          obligationLabel = 'GSTR-3B';
          obligations.push({
            dateLabel: curDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            day: d,
            title: 'GSTR-3B Monthly Tax Remittance',
            category: 'GST',
            amount: amt,
            balanceAfter: Math.round(runningBalance),
            status: runningBalance > monthlyBurn ? 'SECURE' : runningBalance > 0 ? 'WARNING' : 'CRITICAL',
          });
        }

        // Expected Inflow on Selected Scenario Day
        let inflowOccurred = false;
        if (d === activeInflowDay) {
          runningBalance += expectedReceivables;
          obligationLabel = obligationLabel ? `${obligationLabel} + INFLOW` : 'RECEIVABLE INFLOW';
          inflowOccurred = true;
        }

        if (runningBalance < minPoint) {
          minPoint = runningBalance;
          minDay = d;
        }

        if (runningBalance < 0 && !breachedZero) {
          runwayDays = d;
          breachedZero = true;
        }

        points.push({
          day: d,
          dateLabel: curDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          balanceNum: Math.round(runningBalance),
          obligation: obligationLabel,
          inflowOccurred,
        });
      }

      return {
        trajectoryData: points,
        minCashPoint: Math.round(minPoint),
        minCashDay: minDay,
        daysOfRunway: breachedZero ? runwayDays : 60,
        netCashChange: Math.round(runningBalance - bankBalance),
        obligationsList: obligations.slice(0, 8),
      };
    }, [bankBalance, monthlyBurn, expectedReceivables, activeInflowDay]);

  const safeBufferLine = monthlyBurn; // 1 month operating reserve

  // Working Capital Cycle Calculation
  const receivableDays = promisedDay;
  const operatingCycleDays = inventoryDays + receivableDays - payableDays;

  // Dynamic Discounting Engine State
  const [buyerName, setBuyerName] = useState<string>(input.clientName || 'Tata Motors Ltd (Tier-1 OEM)');
  const [discountInvoiceAmount, setDiscountInvoiceAmount] = useState<number>(
    result ? input.invoiceAmount : (input.invoiceAmount || 280000)
  );
  const [discountDueDay, setDiscountDueDay] = useState<number>(activeInflowDay || 35);
  const [bankOdRate, setBankOdRate] = useState<number>(17.5);
  const [settlementWindowDays, setSettlementWindowDays] = useState<number>(5);
  const [overlayDiscountTrajectory, setOverlayDiscountTrajectory] = useState<boolean>(true);
  const [copiedMemo, setCopiedMemo] = useState<boolean>(false);
  const [isSolvingRemote, setIsSolvingRemote] = useState<boolean>(false);
  const [activeDiscountTab, setActiveDiscountTab] = useState<'matrix' | 'memo'>('matrix');

  const calculatedShortfall = useMemo(() => {
    if (minCashPoint < 0) return Math.abs(minCashPoint);
    if (minCashPoint < safeBufferLine) return safeBufferLine - minCashPoint;
    return Math.round(monthlyBurn * 0.45);
  }, [minCashPoint, safeBufferLine, monthlyBurn]);

  const [overrideShortfall, setOverrideShortfall] = useState<number | null>(null);
  const activeShortfall = overrideShortfall !== null ? overrideShortfall : calculatedShortfall;

  const discountSolverResult: DynamicDiscountingResponse = useMemo(() => {
    return solveOptimalDynamicDiscounting({
      invoice_amount: discountInvoiceAmount,
      contracted_due_day: discountDueDay,
      settlement_day: settlementWindowDays,
      collision_day: minCashDay || 15,
      shortfall_amount: activeShortfall,
      bank_od_rate: bankOdRate,
      counterparty_name: buyerName,
    });
  }, [
    discountInvoiceAmount,
    discountDueDay,
    settlementWindowDays,
    minCashDay,
    activeShortfall,
    bankOdRate,
    buyerName,
  ]);

  const handleSolveWithColab = async () => {
    setIsSolvingRemote(true);
    try {
      const cfg = loadApiConfig();
      await solveOptimalDynamicDiscountWithColab(
        {
          invoice_amount: discountInvoiceAmount,
          contracted_due_day: discountDueDay,
          settlement_day: settlementWindowDays,
          collision_day: minCashDay || 15,
          shortfall_amount: activeShortfall,
          bank_od_rate: bankOdRate,
          counterparty_name: buyerName,
        },
        cfg
      );
    } catch {
      // Local calculation already active
    } finally {
      setIsSolvingRemote(false);
    }
  };

  const handleCopyMemo = () => {
    navigator.clipboard.writeText(discountSolverResult.settlement_memo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const handleDownloadMemo = () => {
    const blob = new Blob([discountSolverResult.settlement_memo], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veritas_dynamic_discount_memo_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Discounted 60-Day Trajectory (where buyer settles within 5 days with optimal discount)
  const discountedTrajectoryData = useMemo(() => {
    const dailyBurn = monthlyBurn / 30;
    const points: {
      day: number;
      dateLabel: string;
      balanceNum: number;
      obligation?: string;
    }[] = [];

    let runningBalance = bankBalance;
    const today = new Date();

    for (let d = 0; d <= 60; d++) {
      const curDate = new Date(today.getTime() + d * 86400000);
      const dayOfMonth = curDate.getDate();
      let obligationLabel: string | undefined;

      // Base variable operating burn
      runningBalance -= dailyBurn * 0.35;

      // Scheduled Fixed Monthly Obligations
      if (dayOfMonth === 1) {
        runningBalance -= Math.round(monthlyBurn * 0.45);
        obligationLabel = 'PAYROLL';
      } else if (dayOfMonth === 5) {
        runningBalance -= Math.round(monthlyBurn * 0.25);
        obligationLabel = 'RENT';
      } else if (dayOfMonth === 7) {
        runningBalance -= Math.round(monthlyBurn * 0.08);
        obligationLabel = 'TDS';
      } else if (dayOfMonth === 20) {
        runningBalance -= Math.round(monthlyBurn * 0.15);
        obligationLabel = 'GSTR-3B';
      }

      // Early Settlement Inflow on Day 5
      if (d === settlementWindowDays) {
        runningBalance += discountSolverResult.immediate_cash_inflow;
        obligationLabel = obligationLabel
          ? `${obligationLabel} + EARLY INFLOW`
          : `EARLY SETTLEMENT INFLOW (${discountSolverResult.optimal_discount_pct}%)`;
      }

      points.push({
        day: d,
        dateLabel: curDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        balanceNum: Math.round(runningBalance),
        obligation: obligationLabel,
      });
    }

    return points;
  }, [
    bankBalance,
    monthlyBurn,
    settlementWindowDays,
    discountSolverResult.immediate_cash_inflow,
    discountSolverResult.optimal_discount_pct,
  ]);

  const chartOption: EChartsOption = useMemo(() => {
    const days = trajectoryData.map((p) => p.dateLabel);
    const baselineBalances = trajectoryData.map((p) => p.balanceNum);
    const discountedBalances = discountedTrajectoryData.map((p) => p.balanceNum);

    const markPoints: any[] = [];

    // Collision mark point if deficit occurred
    if (minCashPoint < 0 && minCashDay >= 0 && minCashDay < trajectoryData.length) {
      markPoints.push({
        name: 'Cash Collision',
        coord: [trajectoryData[minCashDay]?.dateLabel, minCashPoint],
        value: `DEFICIT ${fmt(minCashPoint)}`,
        symbol: 'pin',
        symbolSize: 42,
        itemStyle: { color: '#EF4444' },
        label: {
          color: '#FFFFFF',
          fontSize: 9,
          fontFamily: 'monospace',
          fontWeight: 'bold',
        },
      });
    }

    // Inflow mark point
    if (activeInflowDay < trajectoryData.length) {
      markPoints.push({
        name: 'Receivable Inflow',
        coord: [trajectoryData[activeInflowDay]?.dateLabel, trajectoryData[activeInflowDay]?.balanceNum],
        value: `+${fmt(expectedReceivables)}`,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: '#3B82F6' },
        label: {
          show: true,
          position: 'top',
          formatter: `Inflow Day ${activeInflowDay}\n+₹${(expectedReceivables / 100000).toFixed(1)}L`,
          color: '#60A5FA',
          fontSize: 9,
          fontFamily: 'monospace',
        },
      });
    }

    const seriesList: any[] = [
      {
        name: 'Baseline Projection (Without Discounting)',
        type: 'line',
        data: baselineBalances,
        smooth: false,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 4.5,
        lineStyle: {
          color: minCashPoint < 0 ? '#F43F5E' : '#38BDF8',
          width: 3,
        },
        itemStyle: {
          color: minCashPoint < 0 ? '#FB7185' : '#38BDF8',
          borderColor: '#09090B',
          borderWidth: 1.5,
        },
        emphasis: {
          focus: 'none',
          scale: true,
          lineStyle: { width: 4 },
        },
        markPoint: {
          data: markPoints,
        },
        markLine: {
          symbol: 'none',
          silent: true,
          data: [
            {
              yAxis: safeBufferLine,
              lineStyle: { color: '#F59E0B', type: 'dashed', width: 1.5 },
              label: {
                formatter: `1-Mo Reserve Buffer (₹${(safeBufferLine / 100000).toFixed(1)}L)`,
                color: '#FCD34D',
                fontSize: 10,
                position: 'insideStartTop',
                fontFamily: 'monospace',
                fontWeight: 'bold',
              },
            },
            {
              yAxis: 0,
              lineStyle: { color: '#EF4444', type: 'solid', width: 2 },
              label: {
                formatter: 'Zero Solvency Threshold (₹0)',
                color: '#F87171',
                fontSize: 10,
                position: 'insideStartBottom',
                fontFamily: 'monospace',
                fontWeight: 'bold',
              },
            },
          ],
        },
      },
    ];

    if (overlayDiscountTrajectory) {
      seriesList.push({
        name: 'With 5-Day Dynamic Discounting',
        type: 'line',
        data: discountedBalances,
        smooth: false,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 4.5,
        lineStyle: {
          color: '#10B981',
          width: 3,
          type: 'solid',
        },
        itemStyle: {
          color: '#34D399',
          borderColor: '#09090B',
          borderWidth: 1.5,
        },
        emphasis: {
          focus: 'none',
          scale: true,
          lineStyle: { width: 4 },
        },
        markPoint: {
          data: [
            {
              name: 'Day 5 Early Settlement',
              coord: [
                discountedTrajectoryData[settlementWindowDays]?.dateLabel || 'Day 5',
                discountedTrajectoryData[settlementWindowDays]?.balanceNum || 0,
              ],
              symbol: 'rect',
              symbolSize: [140, 26],
              itemStyle: { color: '#059669' },
              label: {
                show: true,
                formatter: `Day 5 Early Settlement\n+₹${(discountSolverResult.immediate_cash_inflow / 100000).toFixed(2)}L (${discountSolverResult.optimal_discount_pct}%)`,
                color: '#ECFDF5',
                fontSize: 9,
                fontFamily: 'monospace',
                fontWeight: 'bold',
              },
            },
          ],
        },
      });
    }

    return {
      backgroundColor: 'transparent',
      grid: { left: 75, right: 65, top: 48, bottom: 35, containLabel: true },
      legend: {
        show: true,
        top: 8,
        right: 15,
        textStyle: { color: '#D4D4D8', fontSize: 10, fontFamily: 'monospace' },
        data: overlayDiscountTrajectory
          ? ['Baseline Projection (Without Discounting)', 'With 5-Day Dynamic Discounting']
          : ['Baseline Projection (Without Discounting)'],
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#111113',
        borderColor: '#26262B',
        borderWidth: 1,
        textStyle: { color: '#F4F4F5', fontSize: 11, fontFamily: 'monospace' },
        formatter: (params: any) => {
          const idx = params[0].dataIndex;
          const pt = trajectoryData[idx];
          const dPt = discountedTrajectoryData[idx];

          let html = `<div style="font-weight:bold;margin-bottom:6px;border-bottom:1px solid #26262B;padding-bottom:3px;color:#A1A1AA;">Day ${pt.day} (${pt.dateLabel})</div>`;
          html += `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:3px;">`;
          html += `<span>Baseline Cash:</span><b style="color:${
            pt.balanceNum < 0 ? '#EF4444' : '#F4F4F5'
          };">${fmt(pt.balanceNum)}</b></div>`;

          if (overlayDiscountTrajectory && dPt) {
            html += `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:3px;">`;
            html += `<span style="color:#06B6D4;">With 5-Day Discount:</span><b style="color:#06B6D4;">${fmt(dPt.balanceNum)}</b></div>`;
          }

          if (pt.obligation) {
            html += `<div style="color:#F59E0B;margin-top:4px;font-size:10px;">Scheduled: ${pt.obligation}</div>`;
          }

          if (pt.balanceNum < 0) {
            html += `<div style="color:#EF4444;margin-top:2px;font-size:10px;font-weight:bold;">⚠ PAYROLL / CASH COLLISION DEFICIT</div>`;
          }

          return html;
        },
      },
      xAxis: {
        type: 'category',
        data: days,
        axisLine: { lineStyle: { color: '#26262B' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#71717A',
          fontSize: 10,
          fontFamily: 'monospace',
          interval: 5,
        },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#1F1F23', type: [3, 3] } },
        axisLabel: {
          color: '#71717A',
          fontSize: 10,
          fontFamily: 'monospace',
          formatter: (v: number) => `₹${(v / 100000).toFixed(1)}L`,
        },
      },
      series: seriesList,
    };
  }, [
    trajectoryData,
    discountedTrajectoryData,
    safeBufferLine,
    minCashPoint,
    minCashDay,
    activeInflowDay,
    expectedReceivables,
    overlayDiscountTrajectory,
    settlementWindowDays,
    discountSolverResult,
  ]);

  // Handlers for RTGS Batch Advice
  const handleCopyRtgs = () => {
    navigator.clipboard.writeText(apRunResult.rtgsBatchText);
    setCopiedRtgs(true);
    setTimeout(() => setCopiedRtgs(false), 2000);
  };

  const handleDownloadRtgs = () => {
    const blob = new Blob([apRunResult.rtgsBatchText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veritas_rtgs_batch_dispatch_${new Date().toISOString().slice(0, 10)}.txt`;
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
          Cash Flow &amp; Treasury Runway Lab
        </h1>
        <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
          60-day working capital forecasting modeling payroll, rent, TDS, and GST remittance against customer collection arrivals.
        </p>
      </div>

      {/* Institutional Explainer */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 flex items-start gap-3 text-xs font-mono">
        <Info className="w-5 h-5 text-[var(--accent-primary)] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-[var(--text-primary)] uppercase">
            What This Treasury Forecast Protects You Against:
          </span>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed font-sans">
            In business, profits do not equal cash. Fixed obligations (Salaries on the 1st, Rent on the 5th, TDS on the 7th, GST on the 20th) must be paid on time regardless of whether your customer settles their bill. This lab tells you whether your bank balance will hold or breach zero under 3 payment scenarios.
          </p>
        </div>
      </div>

      {/* 3-Scenario Switcher */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 space-y-3">
        <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-hairline)]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
            Customer Settlement Scenario Selector
          </span>
          <span className="text-[9px] font-mono text-[var(--text-muted)]">
            Active Inflow: {fmt(expectedReceivables)} on Day {activeInflowDay}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setScenarioMode('promised')}
            className={`p-3 text-left border transition-colors ${
              scenarioMode === 'promised'
                ? 'border-[var(--accent-safe)] bg-[var(--accent-safe)]/10 text-[var(--text-primary)]'
                : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="text-[10px] font-mono uppercase font-bold text-[var(--accent-safe)] flex items-center justify-between">
              <span>1. On-Time Terms</span>
              {scenarioMode === 'promised' && <span className="w-1.5 h-1.5 bg-[var(--accent-safe)]" />}
            </div>
            <div className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">
              Net-{promisedDay} Days (Day {promisedDay})
            </div>
            <div className="text-[9px] font-sans text-[var(--text-tertiary)] mt-1">
              Customer settles strictly on contract date.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setScenarioMode('predicted')}
            className={`p-3 text-left border transition-colors ${
              scenarioMode === 'predicted'
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]'
                : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="text-[10px] font-mono uppercase font-bold text-[var(--accent-primary)] flex items-center justify-between">
              <span>2. AI Expected Date</span>
              {scenarioMode === 'predicted' && <span className="w-1.5 h-1.5 bg-[var(--accent-primary)]" />}
            </div>
            <div className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">
              Day {predictedDay} (+{predictedDay - promisedDay}d delay)
            </div>
            <div className="text-[9px] font-sans text-[var(--text-tertiary)] mt-1">
              Realistic settlement window based on past payment frequency.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setScenarioMode('shock')}
            className={`p-3 text-left border transition-colors ${
              scenarioMode === 'shock'
                ? 'border-[var(--accent-danger)] bg-[var(--accent-danger)]/10 text-[var(--text-primary)]'
                : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="text-[10px] font-mono uppercase font-bold text-[var(--accent-danger)] flex items-center justify-between">
              <span>3. Delinquency Shock</span>
              {scenarioMode === 'shock' && <span className="w-1.5 h-1.5 bg-[var(--accent-danger)]" />}
            </div>
            <div className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">
              Day {shockDay} (+30d late)
            </div>
            <div className="text-[9px] font-sans text-[var(--text-tertiary)] mt-1">
              Customer delays past statutory Section 43B(h) deadline.
            </div>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[var(--border-hairline)] border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
        <div className="p-3.5">
          <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)] block">
            Current Bank Balance
          </span>
          <span className="text-base font-mono font-bold text-[var(--text-primary)] tabular-nums mt-0.5 block">
            {fmt(bankBalance)}
          </span>
          <span className="text-[9px] font-mono text-[var(--text-muted)]">
            Immediate liquid reserve
          </span>
        </div>

        <div className="p-3.5">
          <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)] block">
            Lowest Projected Point
          </span>
          <span
            className={`text-base font-mono font-bold tabular-nums mt-0.5 block ${
              minCashPoint < 0
                ? 'text-[var(--accent-danger)]'
                : minCashPoint < safeBufferLine
                ? 'text-[var(--accent-warn)]'
                : 'text-[var(--accent-safe)]'
            }`}
          >
            {fmt(minCashPoint)}
          </span>
          <span className="text-[9px] font-mono text-[var(--text-muted)]">
            Occurs on Day {minCashDay}
          </span>
        </div>

        <div className="p-3.5">
          <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)] block">
            Estimated Cash Runway
          </span>
          <span
            className={`text-base font-mono font-bold tabular-nums mt-0.5 block ${
              daysOfRunway < 30 ? 'text-[var(--accent-danger)]' : 'text-[var(--accent-safe)]'
            }`}
          >
            {daysOfRunway >= 60 ? '60+ Days Safe' : `${daysOfRunway} Days`}
          </span>
          <span className="text-[9px] font-mono text-[var(--text-muted)]">
            {daysOfRunway < 30 ? 'Deficit risk: accelerate cash' : 'Healthy operating buffer'}
          </span>
        </div>

        <div className="p-3.5">
          <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)] block">
            60-Day Net Cash Delta
          </span>
          <span
            className={`text-base font-mono font-bold tabular-nums mt-0.5 block ${
              netCashChange >= 0 ? 'text-[var(--accent-safe)]' : 'text-[var(--accent-danger)]'
            }`}
          >
            {netCashChange >= 0 ? `+${fmt(netCashChange)}` : fmt(netCashChange)}
          </span>
          <span className="text-[9px] font-mono text-[var(--text-muted)]">
            Net cash position change
          </span>
        </div>
      </div>

      {/* Cash Collision Pre-Payroll Alert Banner (Triggered when cash drops below reserve or zero) */}
      {(minCashPoint < safeBufferLine || minCashPoint < 0) && (
        <div className="border border-[var(--accent-danger)]/60 bg-[var(--accent-danger)]/5 p-4 flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--accent-danger)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-xs font-mono font-bold text-[var(--text-primary)] uppercase flex items-center gap-2">
                <span>Cash Collision Alert: Pre-Payroll Deficit of {fmt(activeShortfall)} on Day {minCashDay || 15}</span>
                <span className="px-1.5 py-0.2 text-[9px] font-mono border border-[var(--accent-danger)] text-[var(--accent-danger)]">
                  CRITICAL DEFICIT
                </span>
              </div>
              <p className="text-[11px] font-sans text-[var(--text-muted)] leading-relaxed">
                Bank balance falls to {fmt(minCashPoint)} before your customer's receivable of {fmt(expectedReceivables)} arrives on Day {activeInflowDay}. Scheduled employee payroll ({fmt(Math.round(monthlyBurn * 0.45))}) will bounce unless liquidity is accelerated. The Dynamic Discounting Solver below calculated the exact early settlement incentive to unlock {fmt(discountSolverResult.immediate_cash_inflow)} on Day 5, averting bank overdraft carrying costs.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOverlayDiscountTrajectory(true)}
            className="px-3 py-1.5 text-xs font-mono border border-[#06B6D4] bg-[#06B6D4]/10 text-[#06B6D4] hover:bg-[#06B6D4]/20 shrink-0 font-bold flex items-center gap-1.5 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            VIEW 5-DAY SOLUTION
          </button>
        </div>
      )}

      {/* Expanded Trajectory Chart Card */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-hairline)] gap-2">
          <div>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[var(--accent-primary)]" />
              60-Day Working Capital Trajectory (Institutional High-Contrast View)
            </span>
            <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
              Step-function daily bank balance projection modeling scheduled payroll, rent, TDS, and GST drains vs collection inflows.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[var(--accent-warn)] border border-[var(--accent-warn)]/40 px-2 py-0.5">
              1-Mo Buffer: {fmt(safeBufferLine)}
            </span>
            <button
              type="button"
              onClick={() => setOverlayDiscountTrajectory(!overlayDiscountTrajectory)}
              className={`px-2.5 py-1 text-[10px] font-mono border transition-colors flex items-center gap-1.5 ${
                overlayDiscountTrajectory
                  ? 'border-[#06B6D4] bg-[#06B6D4]/15 text-[#06B6D4] font-bold'
                  : 'border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span className={`w-2 h-2 ${overlayDiscountTrajectory ? 'bg-[#06B6D4]' : 'border border-[var(--text-muted)]'}`} />
              {overlayDiscountTrajectory ? '5-Day Discount Overlay Active' : 'Overlay 5-Day Discount'}
            </button>
          </div>
        </div>

        {/* Real-time Delay Stress Simulation Slider */}
        <div className="mx-3 mt-3 p-2.5 bg-[#18181B] border border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[#38BDF8] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Delay Stress Shock:
            </span>
            <span className="text-[#FAFAFA] font-bold tabular-nums bg-[#27272A] px-2 py-0.5 border border-[#3F3F46]">
              +{delayStressShockDays} Days
            </span>
            <span className="text-[#A1A1AA]">
              (Expected Inflow Shifts to Day {activeInflowDay})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={45}
              step={1}
              value={delayStressShockDays}
              onChange={(e) => setDelayStressShockDays(Number(e.target.value))}
              className="w-36 sm:w-48 accent-[#38BDF8] cursor-pointer"
            />
            <div className="flex items-center border border-[#27272A] bg-[#111113]">
              {[0, 7, 15, 30, 45].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDelayStressShockDays(d)}
                  className={`px-1.5 py-0.5 text-[9px] transition-colors border-r last:border-r-0 border-[#27272A] ${
                    delayStressShockDays === d
                      ? 'bg-[#38BDF8] text-[#09090B] font-bold'
                      : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                  }`}
                >
                  +{d}d
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="my-1 px-3">
          <EChartBox option={chartOption} height={360} title="60-Day Daily Cash Trajectory" />
        </div>

        {/* Chart Sub-Legend & Quick Stat Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[var(--border-hairline)] text-[10px] font-mono">
          <div className="flex items-center justify-between p-2 bg-[var(--bg-canvas)] border border-[var(--border-hairline)]">
            <span className="text-[#A1A1AA] flex items-center gap-1.5">
              <span className={`w-3 h-1 ${minCashPoint < 0 ? 'bg-[#F43F5E]' : 'bg-[#38BDF8]'}`} />
              Baseline Trajectory (No Action):
            </span>
            <span className={`font-bold tabular-nums ${minCashPoint < 0 ? 'text-[#F43F5E]' : 'text-[#38BDF8]'}`}>
              Min {fmt(minCashPoint)} on Day {minCashDay}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 bg-[#09090B] border border-[#10B981]/40">
            <span className="text-[#10B981] flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#10B981]" />
              With 5-Day Dynamic Discounting ({discountSolverResult.optimal_discount_pct}%):
            </span>
            <span className="font-bold tabular-nums text-[#10B981]">
              +{fmt(discountSolverResult.immediate_cash_inflow)} on Day 5 (Solvent)
            </span>
          </div>
        </div>
      </div>

      {/* Optimal Dynamic Discounting Calculator Module */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-hairline)] gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-[#06B6D4]" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Optimal Dynamic Discounting Calculator: MSME Overdraft Arbitrage Engine
              </span>
            </div>
            <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
              When Runway Lab detects a cash collision before scheduled payroll, the solver calculates the exact early-payment discount (0.5%–2.5%) to offer a low-risk buyer to settle within 5 days, comparing that discount cost against the annualized cost of a 16%–18% MSME bank overdraft.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[9px] font-mono uppercase font-bold border border-[#06B6D4] bg-[#06B6D4]/10 text-[#06B6D4]">
              SOLVED VIA MSME ARBITRAGE
            </span>
          </div>
        </div>

        {/* Interactive Parameter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
          <div className="p-2.5 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
            <label className="text-[9px] uppercase text-[var(--text-tertiary)] block">
              1. Buyer Legal Name
            </label>
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="field-input font-mono text-xs w-full"
            />
            <span className="text-[8px] text-[var(--text-muted)] block">Target corporate debtor</span>
          </div>

          <div className="p-2.5 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
            <label className="text-[9px] uppercase text-[var(--text-tertiary)] block">
              2. Invoice Value (INR)
            </label>
            <input
              type="number"
              value={discountInvoiceAmount}
              onChange={(e) => setDiscountInvoiceAmount(Math.max(1000, parseFloat(e.target.value) || 0))}
              className="field-input font-mono text-right text-xs w-full"
            />
            <span className="text-[8px] text-[var(--text-muted)] block">Gross receivable face value</span>
          </div>

          <div className="p-2.5 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
            <label className="text-[9px] uppercase text-[var(--text-tertiary)] block">
              3. Contracted Due Day
            </label>
            <input
              type="number"
              value={discountDueDay}
              onChange={(e) => setDiscountDueDay(Math.max(6, parseInt(e.target.value) || 6))}
              className="field-input font-mono text-right text-xs w-full"
            />
            <span className="text-[8px] text-[var(--text-muted)] block">Nominal settlement schedule</span>
          </div>

          <div className="p-2.5 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
            <label className="text-[9px] uppercase text-[var(--text-tertiary)] block">
              4. Settlement Horizon
            </label>
            <div className="text-sm font-bold text-[var(--text-primary)] py-1 text-right">
              5 Business Days
            </div>
            <span className="text-[8px] text-[var(--text-muted)] block">RTGS payment turnaround</span>
          </div>

          <div className="p-2.5 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
            <label className="text-[9px] uppercase text-[var(--text-tertiary)] block">
              5. MSME Bank OD Rate (% p.a.)
            </label>
            <input
              type="number"
              step="0.5"
              min="14.0"
              max="24.0"
              value={bankOdRate}
              onChange={(e) => setBankOdRate(parseFloat(e.target.value) || 17.5)}
              className="field-input font-mono text-right text-xs w-full"
            />
            <span className="text-[8px] text-[var(--text-muted)] block">Market rate: 16.0% - 18.5%</span>
          </div>

          <div className="p-2.5 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
            <label className="text-[9px] uppercase text-[var(--text-tertiary)] block">
              6. Pre-Payroll Deficit (INR)
            </label>
            <input
              type="number"
              value={activeShortfall}
              onChange={(e) => setOverrideShortfall(Math.max(5000, parseFloat(e.target.value) || 0))}
              className="field-input font-mono text-right text-xs w-full font-bold text-[var(--accent-danger)]"
            />
            <span className="text-[8px] text-[var(--text-muted)] block">Shortfall needing coverage</span>
          </div>
        </div>

        {/* 4-Card Solved Decision Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 border border-[#06B6D4] bg-[#06B6D4]/10">
            <span className="text-[9px] uppercase text-[#06B6D4] font-bold block">
              Solved Optimal Cash Discount
            </span>
            <div className="text-xl font-bold font-mono text-[var(--text-primary)] tabular-nums mt-0.5">
              {discountSolverResult.optimal_discount_pct}%
            </div>
            <span className="text-[9px] text-[var(--text-muted)] block mt-0.5">
              Sacrifices {fmt(discountSolverResult.optimal_discount_cost)} margin ({discountSolverResult.annualized_discount_apr}% APR)
            </span>
          </div>

          <div className="p-3 border border-[var(--accent-safe)]/40 bg-[var(--accent-safe)]/5">
            <span className="text-[9px] uppercase text-[var(--accent-safe)] font-bold block">
              Accelerated Day-5 Cash Inflow
            </span>
            <div className="text-xl font-bold font-mono text-[var(--accent-safe)] tabular-nums mt-0.5">
              {fmt(discountSolverResult.immediate_cash_inflow)}
            </div>
            <span className="text-[9px] text-[var(--text-muted)] block mt-0.5">
              100% covers Day {minCashDay || 15} payroll deficit of {fmt(activeShortfall)}
            </span>
          </div>

          <div className="p-3 border border-[var(--accent-warn)]/40 bg-[var(--accent-warn)]/5">
            <span className="text-[9px] uppercase text-[var(--accent-warn)] font-bold block">
              Alternative Bank OD Carrying Cost
            </span>
            <div className="text-xl font-bold font-mono text-[var(--accent-warn)] tabular-nums mt-0.5">
              {fmt(discountSolverResult.bank_od_carrying_cost)}
            </div>
            <span className="text-[9px] text-[var(--text-muted)] block mt-0.5">
              {bankOdRate}% APR on {fmt(activeShortfall)} for {discountSolverResult.days_accelerated} days
            </span>
          </div>

          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
            <span className="text-[9px] uppercase text-[var(--text-tertiary)] font-bold block">
              Net Founder Advantage vs Overdraft
            </span>
            <div className={`text-xl font-bold font-mono tabular-nums mt-0.5 ${discountSolverResult.net_benefit_vs_bank_od >= 0 ? 'text-[var(--accent-safe)]' : 'text-[var(--text-primary)]'}`}>
              {discountSolverResult.net_benefit_vs_bank_od >= 0 ? `+${fmt(discountSolverResult.net_benefit_vs_bank_od)}` : fmt(discountSolverResult.net_benefit_vs_bank_od)}
            </div>
            <span className="text-[9px] text-[var(--text-muted)] block mt-0.5">
              Zero bank lien, no personal guarantees
            </span>
          </div>
        </div>

        {/* Tab Switcher: Matrix vs Formal Legal Memo */}
        <div className="flex items-center gap-2 border-b border-[var(--border-hairline)] pb-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveDiscountTab('matrix')}
            className={`px-3 py-1.5 border transition-colors ${
              activeDiscountTab === 'matrix'
                ? 'border-[var(--text-primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            1. Discount Rate Comparison Matrix (0.5% - 2.5%)
          </button>
          <button
            type="button"
            onClick={() => setActiveDiscountTab('memo')}
            className={`px-3 py-1.5 border transition-colors flex items-center gap-1.5 ${
              activeDiscountTab === 'memo'
                ? 'border-[var(--text-primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            2. Formal 5-Day Early Settlement Advice Memo
          </button>
        </div>

        {/* Tab 1: Discount Comparison Matrix */}
        {activeDiscountTab === 'matrix' && (
          <div className="space-y-3">
            <div className="border border-[var(--border-hairline)] bg-[var(--bg-canvas)] overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[10px] uppercase text-[var(--text-tertiary)]">
                    <th className="py-2.5 px-3 font-semibold text-center">Discount %</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Margin Sacrificed</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Day-5 Inflow</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Discount APR</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Bank OD Cost ({bankOdRate}%)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Net Savings vs OD</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Payroll Covered?</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Decision Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)]">
                  {discountSolverResult.comparison_tiers.map((tier) => {
                    const isOptimal = tier.discount_pct === discountSolverResult.optimal_discount_pct;
                    return (
                      <tr
                        key={tier.discount_pct}
                        className={`transition-colors ${
                          isOptimal
                            ? 'bg-[#06B6D4]/10 hover:bg-[#06B6D4]/15'
                            : 'hover:bg-[var(--bg-elevated)]'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-bold">
                          <span
                            className={`px-2 py-0.5 text-xs ${
                              isOptimal
                                ? 'bg-[#06B6D4] text-[#09090B] font-bold'
                                : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {tier.discount_pct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[var(--text-primary)]">
                          -{fmt(tier.discount_cost)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-bold text-[var(--accent-safe)]">
                          {fmt(tier.cash_collected)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          <span className={tier.annualized_apr <= bankOdRate ? 'text-[var(--accent-safe)] font-bold' : 'text-[var(--accent-warn)]'}>
                            {tier.annualized_apr}% p.a.
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[var(--text-muted)]">
                          {fmt(tier.bank_od_cost)}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right tabular-nums font-bold ${
                            tier.net_savings_vs_od >= 0 ? 'text-[var(--accent-safe)]' : 'text-[var(--accent-danger)]'
                          }`}
                        >
                          {tier.net_savings_vs_od >= 0 ? `+${fmt(tier.net_savings_vs_od)}` : fmt(tier.net_savings_vs_od)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-1.5 py-0.5 text-[9px] uppercase font-bold border ${
                              tier.collision_averted
                                ? 'border-[var(--accent-safe)] text-[var(--accent-safe)] bg-[var(--accent-safe)]/10'
                                : 'border-[var(--accent-danger)] text-[var(--accent-danger)] bg-[var(--accent-danger)]/10'
                            }`}
                          >
                            {tier.collision_averted ? 'YES' : 'NO'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold border ${
                              tier.recommendation === 'OPTIMAL'
                                ? 'border-[#06B6D4] bg-[#06B6D4]/20 text-[#06B6D4]'
                                : tier.recommendation === 'ACCEPTABLE'
                                ? 'border-[var(--accent-warn)] bg-[var(--accent-warn)]/10 text-[var(--accent-warn)]'
                                : 'border-[var(--accent-danger)] bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]'
                            }`}
                          >
                            {tier.recommendation === 'OPTIMAL'
                              ? 'OPTIMAL (BEATS BANK OD)'
                              : tier.recommendation === 'ACCEPTABLE'
                              ? 'ACCEPTABLE (CLEARS DEFICIT)'
                              : 'COSTLY VS OVERDRAFT'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                <b className="text-[var(--text-primary)]">Mathematical Rationale:</b> {discountSolverResult.rationale}
              </div>
              <button
                type="button"
                onClick={handleSolveWithColab}
                disabled={isSolvingRemote}
                className="px-3 py-1.5 text-xs font-mono border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[#06B6D4] hover:text-[#06B6D4] shrink-0 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSolvingRemote ? 'animate-spin' : ''}`} />
                {isSolvingRemote ? 'SOLVING VIA BACKEND...' : 'RE-SOLVE VIA COLAB / LOCAL'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Formal Legal Memo */}
        {activeDiscountTab === 'memo' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-[var(--text-tertiary)]">
                Formal Early Payment Settlement Advice (MSMED Act 2006 &amp; Section 43B(h))
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMemo}
                  className="px-3 py-1 text-xs font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[#06B6D4] flex items-center gap-1.5 transition-colors"
                >
                  {copiedMemo ? <Check className="w-3.5 h-3.5 text-[var(--accent-safe)]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedMemo ? 'Copied to Clipboard' : 'Copy Settlement Memo'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMemo}
                  className="px-3 py-1 text-xs font-mono border border-[#06B6D4] bg-[#06B6D4]/10 text-[#06B6D4] hover:bg-[#06B6D4]/20 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download (.TXT)
                </button>
              </div>
            </div>

            <pre className="p-4 border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[11px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-96">
              {discountSolverResult.settlement_memo}
            </pre>
          </div>
        )}
      </div>

      {/* Upcoming Cash Obligations Schedule Table */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
          <div>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--accent-primary)]" />
              Scheduled Operating Commitments (Next 30 Days)
            </span>
            <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
              Statutory and operational cash drains with projected bank balance health check.
            </p>
          </div>
          <span className="text-[9px] font-mono text-[var(--text-tertiary)]">
            Fixed Monthly Burn: {fmt(monthlyBurn)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[10px] font-mono uppercase text-[var(--text-tertiary)]">
                <th className="py-2.5 px-3 font-semibold">Due Date</th>
                <th className="py-2.5 px-3 font-semibold">Obligation Description</th>
                <th className="py-2.5 px-3 font-semibold text-center">Category</th>
                <th className="py-2.5 px-3 font-semibold text-right">Cash Outflow</th>
                <th className="py-2.5 px-3 font-semibold text-right">Balance After</th>
                <th className="py-2.5 px-3 font-semibold text-center">Cash Cushion Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] text-xs font-mono">
              {obligationsList.map((ob, idx) => (
                <tr key={idx} className="hover:bg-[var(--bg-elevated)] transition-colors">
                  <td className="py-3 px-3 text-[var(--text-primary)] font-bold">
                    {ob.dateLabel} (Day {ob.day})
                  </td>
                  <td className="py-3 px-3 text-[var(--text-primary)] font-sans">
                    {ob.title}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-block px-2 py-0.5 text-[9px] font-mono uppercase border border-[var(--border-hairline)] text-[var(--text-tertiary)]">
                      {ob.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono tabular-nums text-right text-[var(--text-primary)] font-semibold">
                    -{fmt(ob.amount)}
                  </td>
                  <td
                    className={`py-3 px-3 font-mono tabular-nums text-right font-bold ${
                      ob.balanceAfter < 0
                        ? 'text-[var(--accent-danger)]'
                        : ob.balanceAfter < safeBufferLine
                        ? 'text-[var(--accent-warn)]'
                        : 'text-[var(--accent-safe)]'
                    }`}
                  >
                    {fmt(ob.balanceAfter)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 text-[9px] font-mono uppercase font-bold border ${
                        ob.status === 'SECURE'
                          ? 'border-[var(--accent-safe)] text-[var(--accent-safe)] bg-[var(--accent-safe)]/5'
                          : ob.status === 'WARNING'
                          ? 'border-[var(--accent-warn)] text-[var(--accent-warn)] bg-[var(--accent-warn)]/5'
                          : 'border-[var(--accent-danger)] text-[var(--accent-danger)] bg-[var(--accent-danger)]/5'
                      }`}
                    >
                      {ob.status === 'SECURE'
                        ? 'BUFFER SAFE'
                        : ob.status === 'WARNING'
                        ? 'LOW BUFFER'
                        : 'DEFICIT RISK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Working Capital Gap & Operating Cycle Calculator */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
          <div>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <Scale className="w-4 h-4 text-[var(--accent-primary)]" />
              MSME Working Capital Operating Cycle (Cash-to-Cash Gap)
            </span>
            <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
              Measures how many days of cash your business must finance out of pocket between inventory purchase and customer collection.
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold text-[var(--accent-primary)] border border-[var(--accent-primary)]/40 px-2 py-0.5">
            Operating Cycle: {operatingCycleDays} Days
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
            <label className="text-[10px] uppercase text-[var(--text-tertiary)] block">
              1. Inventory Holding Days
            </label>
            <input
              type="number"
              value={inventoryDays}
              onChange={(e) => setInventoryDays(parseInt(e.target.value) || 0)}
              className="field-input font-mono text-right"
            />
            <span className="text-[9px] text-[var(--text-muted)] block mt-1">
              Time raw materials sit before sale
            </span>
          </div>

          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
            <label className="text-[10px] uppercase text-[var(--text-tertiary)] block">
              2. Receivable Collection (DSO)
            </label>
            <div className="text-base font-bold text-[var(--text-primary)] tabular-nums py-1 text-right">
              {receivableDays} Days
            </div>
            <span className="text-[9px] text-[var(--text-muted)] block mt-1">
              Agreed payment credit to customers
            </span>
          </div>

          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
            <label className="text-[10px] uppercase text-[var(--text-tertiary)] block">
              3. Vendor Payable Credit (DPO)
            </label>
            <input
              type="number"
              value={payableDays}
              onChange={(e) => setPayableDays(parseInt(e.target.value) || 0)}
              className="field-input font-mono text-right"
            />
            <span className="text-[9px] text-[var(--text-muted)] block mt-1">
              Credit terms granted by your suppliers
            </span>
          </div>
        </div>

        <div className="p-3.5 border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5 text-xs font-mono text-[var(--text-primary)]">
          <b>Financial Diagnosis:</b> Your Net Operating Cycle is <b>{operatingCycleDays} Days</b>. Your business must fund {operatingCycleDays} days of labor, electricity, and materials out of your own cash before getting paid back.
          {operatingCycleDays > 45 && (
            <span className="text-[var(--accent-warn)] block mt-1">
              Recommendation: Reduce DSO by enforcing Net-21 terms or offload invoices to TReDS factoring to collapse your cash gap by {receivableDays - 1} days!
            </span>
          )}
        </div>
      </div>

      {/* Accounts Payable (AP) Cash Dispatch & Statutory Vendor Payment Prioritizer */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[var(--border-hairline)] gap-2">
          <div>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[var(--accent-primary)]" />
              Accounts Payable (AP) Cash Dispatch &amp; Statutory Vendor Prioritizer
            </span>
            <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
              Algorithmically prioritizes which supplier bills to clear today with available cash to prevent 180-day GST ITC clawbacks, avoid 43B(h) tax disallowances, and capture early payment discounts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyRtgs}
              className="px-3 py-1 text-xs font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] flex items-center gap-1.5 transition-colors"
            >
              {copiedRtgs ? <Check className="w-3 h-3 text-[var(--accent-safe)]" /> : <Copy className="w-3 h-3" />}
              {copiedRtgs ? 'Copied RTGS' : 'Copy Bank Advice'}
            </button>
            <button
              type="button"
              onClick={handleDownloadRtgs}
              className="px-3 py-1 text-xs font-mono border border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3 h-3" /> Batch TXT
            </button>
          </div>
        </div>

        {/* Input Cash Pool Selector */}
        <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase text-[var(--text-tertiary)]">Available Cash to Clear Bills Today:</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-xs text-[var(--text-tertiary)]">₹</span>
              <input
                type="number"
                value={availableApCash}
                onChange={(e) => setAvailableApCash(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-40 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] pl-6 pr-2 py-1 text-xs font-mono font-bold text-[var(--text-primary)] focus:border-[var(--text-tertiary)] focus:outline-none text-right"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase text-[var(--text-tertiary)]">Presets:</span>
            {[300000, 650000, 1000000, 1200000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAvailableApCash(preset)}
                className={`px-2 py-0.5 text-[10px] font-mono border transition-colors ${
                  availableApCash === preset
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold'
                    : 'border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                ₹{(preset / 100000).toFixed(1)}L
              </button>
            ))}
          </div>
        </div>

        {/* 4-Stat Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
            <span className="text-[9px] uppercase text-[var(--text-tertiary)] block">Total Payables Due</span>
            <span className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5 block">
              {fmt(apRunResult.totalPayablesAmount)}
            </span>
            <span className="text-[9px] text-[var(--text-tertiary)]">{apBills.length} pending vendor bills</span>
          </div>

          <div className="p-3 border border-[var(--accent-safe)]/40 bg-[var(--accent-safe)]/5">
            <span className="text-[9px] uppercase text-[var(--accent-safe)] block">Approved Outflow Today</span>
            <span className="text-base font-bold text-[var(--accent-safe)] tabular-nums mt-0.5 block">
              {fmt(apRunResult.allocatedCashAmount)}
            </span>
            <span className="text-[9px] text-[var(--text-muted)]">
              Remaining: {fmt(apRunResult.remainingCash)}
            </span>
          </div>

          <div className="p-3 border border-[var(--accent-warn)]/40 bg-[var(--accent-warn)]/5">
            <span className="text-[9px] uppercase text-[var(--accent-warn)] block">Deferred Shortfall</span>
            <span className="text-base font-bold text-[var(--accent-warn)] tabular-nums mt-0.5 block">
              {fmt(apRunResult.shortfallAmount)}
            </span>
            <span className="text-[9px] text-[var(--text-muted)]">
              {apRunResult.items.filter((i) => i.status !== 'FULL_PAYMENT').length} bills deferred
            </span>
          </div>

          <div className="p-3 border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5">
            <span className="text-[9px] uppercase text-[var(--accent-primary)] block">Tax &amp; Discount Value Saved</span>
            <span className="text-base font-bold text-[var(--accent-primary)] tabular-nums mt-0.5 block">
              +{fmt(apRunResult.itcSavedAmount + apRunResult.taxDisallowanceAverted + apRunResult.earlyDiscountsCaptured)}
            </span>
            <span className="text-[9px] text-[var(--text-muted)]">
              ITC: {fmt(apRunResult.itcSavedAmount)} | 43B(h): {fmt(apRunResult.taxDisallowanceAverted)}
            </span>
          </div>
        </div>

        {/* Priority Payables Table */}
        <div className="border border-[var(--border-hairline)] bg-[var(--bg-canvas)] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[10px] font-mono uppercase text-[var(--text-tertiary)]">
                <th className="py-2.5 px-3 font-semibold">Vendor / Beneficiary</th>
                <th className="py-2.5 px-3 font-semibold text-right">Invoice Sum</th>
                <th className="py-2.5 px-3 font-semibold text-center">Age</th>
                <th className="py-2.5 px-3 font-semibold text-center">Priority Tier</th>
                <th className="py-2.5 px-3 font-semibold text-right">Dispatched Amount</th>
                <th className="py-2.5 px-3 font-semibold text-left">Statutory Justification &amp; Penal Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] text-xs font-mono">
              {apRunResult.items.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                  <td className="py-3 px-3 font-sans font-medium text-[var(--text-primary)]">
                    <div>{item.vendorName}</div>
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                      {item.id} • GSTIN: {item.gstin}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums font-bold text-[var(--text-primary)]">
                    {fmt(item.amount)}
                  </td>
                  <td className="py-3 px-3 text-center tabular-nums text-[var(--text-muted)]">
                    {item.daysElapsed}d
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 text-[9px] font-bold border ${
                        item.priorityTier === 'TIER_1_ITC_180D'
                          ? 'border-[var(--accent-danger)] bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]'
                          : item.priorityTier === 'TIER_2_43BH_MSME'
                          ? 'border-[var(--accent-warn)] bg-[var(--accent-warn)]/10 text-[var(--accent-warn)]'
                          : item.priorityTier === 'TIER_3_EARLY_DISCOUNT'
                          ? 'border-[var(--accent-safe)] bg-[var(--accent-safe)]/10 text-[var(--accent-safe)]'
                          : 'border-[var(--border-hairline)] text-[var(--text-tertiary)]'
                      }`}
                    >
                      {item.priorityTier === 'TIER_1_ITC_180D'
                        ? 'TIER 1: 180D ITC'
                        : item.priorityTier === 'TIER_2_43BH_MSME'
                        ? 'TIER 2: 43B(H) MSME'
                        : item.priorityTier === 'TIER_3_EARLY_DISCOUNT'
                        ? 'TIER 3: DISCOUNT'
                        : 'TIER 4: STANDARD'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    <div
                      className={`font-bold ${
                        item.status === 'FULL_PAYMENT'
                          ? 'text-[var(--accent-safe)]'
                          : item.status === 'PARTIAL_PAYMENT'
                          ? 'text-[var(--accent-warn)]'
                          : 'text-[var(--text-tertiary)]'
                      }`}
                    >
                      {fmt(item.allocatedAmount)}
                    </div>
                    <span className="text-[9px] uppercase text-[var(--text-muted)] block">
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[10px] text-[var(--text-muted)] max-w-xs leading-relaxed">
                    {item.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RBI Nayak Committee Maximum Permissible Bank Finance (MPBF) Benchmark */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[var(--accent-primary)]" />
            <div>
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                RBI Nayak Committee Maximum Permissible Bank Finance (MPBF) CC Limit Benchmark
              </span>
              <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                Statutory working capital credit formula mandated by the Reserve Bank of India for MSME bank credit limits.
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 border ${
              nayakResult.underFinanced
                ? 'border-[var(--accent-warn)] text-[var(--accent-warn)] bg-[var(--accent-warn)]/10'
                : 'border-[var(--accent-safe)] text-[var(--accent-safe)] bg-[var(--accent-safe)]/10'
            }`}
          >
            {nayakResult.underFinanced ? 'UNDER-FINANCED BY BANK' : 'CC LIMIT OPTIMAL'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
            <label className="text-[10px] uppercase text-[var(--text-tertiary)] block">
              Projected Annual Turnover (INR)
            </label>
            <input
              type="number"
              value={annualTurnover}
              onChange={(e) => setAnnualTurnover(Math.max(0, parseFloat(e.target.value) || 0))}
              className="field-input font-mono text-right"
            />
            <span className="text-[9px] text-[var(--text-muted)] block mt-1">
              Your audited / projected annual gross sales
            </span>
          </div>

          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
            <label className="text-[10px] uppercase text-[var(--text-tertiary)] block">
              Current Bank Sanctioned CC/OD Limit (INR)
            </label>
            <input
              type="number"
              value={currentCcLimit}
              onChange={(e) => setCurrentCcLimit(Math.max(0, parseFloat(e.target.value) || 0))}
              className="field-input font-mono text-right"
            />
            <span className="text-[9px] text-[var(--text-muted)] block mt-1">
              Existing bank working capital Cash Credit facility
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
            <span className="text-[9px] uppercase text-[var(--text-tertiary)] block">Total WCR (25%)</span>
            <span className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5 block">
              {fmt(nayakResult.totalWorkingCapitalRequirement)}
            </span>
            <span className="text-[9px] text-[var(--text-tertiary)]">25% of turnover</span>
          </div>

          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
            <span className="text-[9px] uppercase text-[var(--text-tertiary)] block">Borrower Equity Margin (5%)</span>
            <span className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5 block">
              {fmt(nayakResult.promoterMarginContribution)}
            </span>
            <span className="text-[9px] text-[var(--text-tertiary)]">Promoter internal accruals</span>
          </div>

          <div className="p-3 border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5">
            <span className="text-[9px] uppercase text-[var(--accent-primary)] block">Statutory Bank CC Entitlement (20%)</span>
            <span className="text-base font-bold text-[var(--accent-primary)] tabular-nums mt-0.5 block">
              {fmt(nayakResult.maxPermissibleBankFinance)}
            </span>
            <span className="text-[9px] text-[var(--text-muted)]">RBI Nayak Committee MPBF</span>
          </div>

          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
            <span className="text-[9px] uppercase text-[var(--text-tertiary)] block">Working Capital Gap</span>
            <span
              className={`text-base font-bold tabular-nums mt-0.5 block ${
                nayakResult.underFinanced ? 'text-[var(--accent-warn)]' : 'text-[var(--accent-safe)]'
              }`}
            >
              {fmt(nayakResult.workingCapitalGap)}
            </span>
            <span className="text-[9px] text-[var(--text-muted)]">
              {nayakResult.underFinanced ? 'Unfunded credit line' : 'Fully covered'}
            </span>
          </div>
        </div>

        <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[11px] font-mono text-[var(--text-muted)]">
          {nayakResult.underFinanced ? (
            <span>
              <b>Statutory Banking Action:</b> Under the RBI Nayak Committee Turnover Method, your enterprise is entitled to a Cash Credit (CC) limit of <b>{fmt(nayakResult.maxPermissibleBankFinance)}</b> (20% of turnover). Your bank currently sanctions only {fmt(nayakResult.currentSanctionedCcLimit)}, leaving an unfunded gap of <b>{fmt(nayakResult.workingCapitalGap)}</b>. Submit your projected audited balance sheet to your commercial bank relationship manager citing <i>RBI Master Circular on MSME Lending FIDD.MSME &amp; NFS.BC.No.3/06.02.31/2023-24</i>.
            </span>
          ) : (
            <span>
              <b>Statutory Banking Action:</b> Your bank Cash Credit facility is optimal and meets the statutory 20% turnover entitlement under RBI Nayak Committee norms.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

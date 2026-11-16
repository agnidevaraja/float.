import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../store/workspaceStore';
import { evaluateInvoicePipeline, loadApiConfig } from '../../services/inferenceBridge';
import type { InvoiceEvaluationRequest } from '../../types/engineContract';
import {
  Upload,
  Download,
  Plus,
  X,
  ArrowRight,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  RotateCcw,
  Zap,
  Scale,
  Users,
  FileText,
  BarChart2,
  Clock,
  Info,
  ShieldAlert,
  PieChart,
  TrendingDown,
} from 'lucide-react';
import { MsmeSamadhaanModal } from '../modals/MsmeSamadhaanModal';
import {
  calculateMsmeCompoundInterest,
  calculatePortfolioConcentration,
} from '../../engine/statutoryEngine';
import { EChartBox } from '../charts/EChartBox';
import type { EChartsOption } from 'echarts';

export interface InvoiceRow {
  id: string;
  client: string;
  amount: number;
  term: number;
  dueIn: number; // positive = days until due; negative = overdue
  risk: number;
  status: 'PENDING' | 'OVERDUE' | 'ON_TRACK';
  evaluated: boolean;
  anomalyNotes?: string[];
}

const BUCKETS = [
  { id: 'all', label: 'All Invoices', min: -Infinity, max: Infinity },
  { id: 'current', label: 'Current (Not Due)', min: 0, max: Infinity },
  { id: '1-15', label: '1-15d Overdue', min: -15, max: -1 },
  { id: '16-30', label: '16-30d Overdue', min: -30, max: -16 },
  { id: '31-60', label: '31-60d Overdue', min: -60, max: -31 },
  { id: '60plus', label: '>60d Critical', min: -Infinity, max: -61 },
];

const BENCHMARK_PORTFOLIO: InvoiceRow[] = [
  { id: 'INV-2026-081', client: 'TechForge Solutions Pvt Ltd', amount: 385000, term: 30, dueIn: 12, risk: 14.2, status: 'ON_TRACK', evaluated: true },
  { id: 'INV-2026-082', client: 'BlueCrest Heavy Engineering', amount: 840000, term: 45, dueIn: -18, risk: 68.4, status: 'PENDING', evaluated: true },
  { id: 'INV-2026-083', client: 'NovaBuild Infra Projects', amount: 1250000, term: 60, dueIn: -34, risk: 89.1, status: 'OVERDUE', evaluated: true },
  { id: 'INV-2026-084', client: 'Zenith Retail Networks', amount: 210000, term: 30, dueIn: 5, risk: 22.8, status: 'ON_TRACK', evaluated: true },
  { id: 'INV-2026-085', client: 'Corewave Logistics LLP', amount: 460000, term: 30, dueIn: -8, risk: 44.5, status: 'PENDING', evaluated: true },
  { id: 'INV-2026-086', client: 'Meridian Pharma Labs', amount: 620000, term: 60, dueIn: 22, risk: 18.3, status: 'ON_TRACK', evaluated: true },
  { id: 'INV-2026-087', client: 'Atlas Metals & Castings', amount: 980000, term: 45, dueIn: -72, risk: 93.6, status: 'OVERDUE', evaluated: true },
  { id: 'INV-2026-088', client: 'Pinnacle EduTech Services', amount: 155000, term: 30, dueIn: 3, risk: 24.1, status: 'ON_TRACK', evaluated: true },
  { id: 'INV-2026-089', client: 'Silverline Agro Foods', amount: 530000, term: 30, dueIn: -24, risk: 62.0, status: 'PENDING', evaluated: true },
  { id: 'INV-2026-090', client: 'Prism Architectural Design', amount: 190000, term: 15, dueIn: -48, risk: 78.9, status: 'OVERDUE', evaluated: true },
];

const formatINR = (val: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const riskColor = (r: number): string =>
  r < 30 ? 'var(--accent-safe)' : r < 60 ? 'var(--accent-warn)' : 'var(--accent-danger)';

export const View04AgeingMatrix: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useWorkspace();

  // Derive Ageing Matrix rows directly from the single shared workspace ledger
  const invoices: InvoiceRow[] = useMemo(
    () =>
      state.ledger.map((l) => ({
        id: l.id,
        client: l.clientName,
        amount: l.invoiceAmount,
        term: l.paymentTermDays,
        dueIn: l.dueInDays ?? (l.status === 'OVERDUE' ? -15 : l.paymentTermDays),
        risk: l.riskPercent,
        status: l.status,
        evaluated: l.evaluated ?? true,
      })),
    [state.ledger]
  );

  const setInvoices = (updater: InvoiceRow[] | ((prev: InvoiceRow[]) => InvoiceRow[])) => {
    const nextRows = typeof updater === 'function' ? updater(invoices) : updater;
    const nextLedger = nextRows.map((row) => ({
      id: row.id,
      clientName: row.client,
      invoiceAmount: row.amount,
      paymentTermDays: row.term,
      riskPercent: row.risk,
      expectedArrivalDay:
        row.dueIn < 0
          ? row.term + Math.abs(row.dueIn)
          : Math.round(row.term + (row.risk / 100) * 14),
      status: row.status,
      savedAt: new Date(),
      dueInDays: row.dueIn,
      evaluated: row.evaluated,
    }));
    dispatch({ type: 'SET_LEDGER', payload: nextLedger });
  };

  const odRatePct = state.enterpriseProfile?.bankOdInterestRate > 0 ? state.enterpriseProfile.bankOdInterestRate : 12;
  const [activeBucketId, setActiveBucketId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'invoices' | 'customers' | 'concentration' | 'migration'>('invoices');
  const [riskFilter, setRiskFilter] = useState<'all' | 'high_risk' | 'overdue' | 'safe'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedMsmeInvoice, setSelectedMsmeInvoice] = useState<InvoiceRow | null>(null);
  const [evaluatingIds, setEvaluatingIds] = useState<Set<string>>(new Set());
  const [isBatchScoring, setIsBatchScoring] = useState<boolean>(false);

  // Modal State
  const [newClient, setNewClient] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newTerm, setNewTerm] = useState('30');
  const [newDueIn, setNewDueIn] = useState('15');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate Tally-Style Buckets
  const bucketMetrics = useMemo(() => {
    return BUCKETS.map((b) => {
      let filtered: InvoiceRow[];
      if (b.id === 'all') {
        filtered = invoices;
      } else if (b.id === 'current') {
        filtered = invoices.filter((i) => i.dueIn >= 0);
      } else {
        filtered = invoices.filter((i) => i.dueIn >= b.min && i.dueIn <= b.max);
      }
      const totalAmount = filtered.reduce((acc, curr) => acc + curr.amount, 0);
      const evaluated = filtered.filter((i) => i.evaluated);
      const avgRisk = evaluated.length > 0
        ? evaluated.reduce((acc, curr) => acc + curr.risk, 0) / evaluated.length
        : 0;
      return {
        ...b,
        count: filtered.length,
        totalAmount,
        avgRisk,
      };
    });
  }, [invoices]);

  // CFO Treasury Working Capital Metrics with Plain-English Definitions
  const cfoMetrics = useMemo(() => {
    const totalReceivables = invoices.reduce((acc, curr) => acc + curr.amount, 0);
    const overdueInvoices = invoices.filter((i) => i.dueIn < 0);
    const overdueAmount = overdueInvoices.reduce((acc, curr) => acc + curr.amount, 0);
    const totalAtRisk = invoices.reduce(
      (acc, curr) => acc + (curr.evaluated ? curr.amount * (curr.risk / 100) : 0),
      0
    );

    const totalMsmeAccruedInterest = overdueInvoices.reduce((acc, curr) => {
      const calc = calculateMsmeCompoundInterest(curr.amount, curr.term, Math.abs(curr.dueIn));
      return acc + calc.accruedPenalInterest;
    }, 0);

    const totalOdInterestBleed = overdueInvoices.reduce((acc, curr) => {
      const daysOverdue = Math.abs(curr.dueIn);
      const interest = Math.round(curr.amount * (odRatePct / 100) * (daysOverdue / 365));
      return acc + interest;
    }, 0);

    const dsoDays = totalReceivables > 0 ? Math.round(30 + (overdueAmount / totalReceivables) * 28) : 0;
    const ceiPercent =
      totalReceivables > 0
        ? Math.max(15, Math.min(100, Math.round(((totalReceivables - overdueAmount) / totalReceivables) * 100)))
        : 100;

    return {
      totalReceivables,
      overdueAmount,
      totalAtRisk,
      totalMsmeAccruedInterest,
      totalOdInterestBleed,
      dsoDays,
      ceiPercent,
      overdueCount: overdueInvoices.length,
    };
  }, [invoices, odRatePct]);

  // Customer Credit Concentration & Single-Counterparty Risk
  const concentrationMetrics = useMemo(() => {
    return calculatePortfolioConcentration(invoices, 20);
  }, [invoices]);

  // Aging Bucket Horizontal EChart Option with Direct Numbers & High-Contrast Colors
  const agingChartOption: EChartsOption = useMemo(() => {
    const bucketsWithoutAll = bucketMetrics.filter((b) => b.id !== 'all');
    const categories = bucketsWithoutAll.map((b) => b.label);
    const amounts = bucketsWithoutAll.map((b) => b.totalAmount);
    const counts = bucketsWithoutAll.map((b) => b.count);

    return {
      backgroundColor: 'transparent',
      grid: { left: 140, right: 180, top: 15, bottom: 25, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line',
          lineStyle: { color: '#52525B', width: 1.5, type: 'dashed' },
        },
        formatter: (params: any) => {
          const p = params[0];
          const count = counts[p.dataIndex];
          return `<div style="font-family:monospace;font-size:11px;padding:4px;">
            <b style="color:#FAFAFA;">${p.name}</b><br/>
            <span style="color:#A1A1AA;">Locked Capital:</span> <b style="color:#3B82F6;">${formatINR(p.value)}</b> (${count} invoices)
          </div>`;
        },
        backgroundColor: '#111113',
        borderColor: '#27272A',
        textStyle: { color: '#FAFAFA' },
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: '#A1A1AA',
          fontSize: 10,
          fontFamily: 'monospace',
          formatter: (v: number) => `₹${(v / 100000).toFixed(1)}L`,
        },
        splitLine: { lineStyle: { color: '#27272A', type: [3, 3] } },
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          color: '#FAFAFA',
          fontSize: 11,
          fontFamily: 'monospace',
          fontWeight: 'bold',
        },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#27272A' } },
      },
      series: [
        {
          type: 'bar',
          data: amounts.map((amt, idx) => {
            const b = bucketsWithoutAll[idx];
            let color = '#10B981'; // Current (Not Due)
            if (b.id === '1-15') color = '#3B82F6'; // 1-15d Overdue
            if (b.id === '16-30') color = '#F59E0B'; // 16-30d Overdue
            if (b.id === '31-60') color = '#F97316'; // 31-60d Overdue
            if (b.id === '60plus') color = '#EF4444'; // >60d Critical
            return {
              value: amt,
              itemStyle: {
                color,
                borderRadius: [0, 2, 2, 0],
              },
            };
          }),
          barWidth: 18,
          label: {
            show: true,
            position: 'right',
            distance: 12,
            formatter: (params: any) => {
              const count = counts[params.dataIndex];
              return `${formatINR(params.value)} (${count} inv)`;
            },
            color: '#FAFAFA',
            fontSize: 11,
            fontFamily: 'monospace',
            fontWeight: 'bold',
          },
          emphasis: {
            focus: 'none',
            itemStyle: { opacity: 1 },
          },
        },
      ],
    };
  }, [bucketMetrics]);

  // Group by Customer Aggregation
  const customerSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        client: string;
        invoicesCount: number;
        totalAmount: number;
        maxOverdueDays: number;
        avgRisk: number;
        evaluatedCount: number;
        accruedInterest: number;
      }
    >();

    invoices.forEach((inv) => {
      const existing = map.get(inv.client) || {
        client: inv.client,
        invoicesCount: 0,
        totalAmount: 0,
        maxOverdueDays: 0,
        avgRisk: 0,
        evaluatedCount: 0,
        accruedInterest: 0,
      };

      existing.invoicesCount += 1;
      existing.totalAmount += inv.amount;
      const overdueDays = inv.dueIn < 0 ? Math.abs(inv.dueIn) : 0;
      if (overdueDays > existing.maxOverdueDays) {
        existing.maxOverdueDays = overdueDays;
      }
      if (inv.evaluated) {
        existing.avgRisk += inv.risk;
        existing.evaluatedCount += 1;
      }
      if (overdueDays > 0) {
        const calc = calculateMsmeCompoundInterest(inv.amount, inv.term, overdueDays);
        existing.accruedInterest += calc.accruedPenalInterest;
      }
      map.set(inv.client, existing);
    });

    return Array.from(map.values()).map((c) => ({
      ...c,
      avgRisk: c.evaluatedCount > 0 ? c.avgRisk / c.evaluatedCount : 0,
    }));
  }, [invoices]);

  // Customer Breakdown Chart Option
  const customerChartOption: EChartsOption = useMemo(() => {
    const sorted = [...customerSummary].sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 8);
    const clients = sorted.map((c) => (c.client.length > 20 ? c.client.slice(0, 18) + '...' : c.client)).reverse();
    const amounts = sorted.map((c) => c.totalAmount).reverse();
    const risks = sorted.map((c) => c.avgRisk).reverse();

    return {
      backgroundColor: 'transparent',
      grid: { left: 160, right: 170, top: 15, bottom: 25, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: '#52525B', width: 1.5, type: 'dashed' } },
        formatter: (params: any) => {
          const first = Array.isArray(params) ? params[0] : params;
          if (!first || first.dataIndex === undefined) return '';
          const idx = first.dataIndex;
          const clientRow = sorted.slice().reverse()[idx];
          return `<div style="font-family:monospace;font-size:11px;padding:4px;">
            <b style="color:#FAFAFA;">${clientRow?.client ?? 'Counterparty'}</b><br/>
            Outstanding: <b style="color:#3B82F6;">${formatINR(amounts[idx] ?? 0)}</b><br/>
            Risk Score: <b>${Number(risks[idx] ?? 0).toFixed(1)}%</b>
          </div>`;
        },
        backgroundColor: '#111113',
        borderColor: '#27272A',
        textStyle: { color: '#FAFAFA' },
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: '#A1A1AA',
          fontSize: 10,
          fontFamily: 'monospace',
          formatter: (v: number) => `₹${(v / 100000).toFixed(1)}L`,
        },
        splitLine: { lineStyle: { color: '#27272A', type: [3, 3] } },
      },
      yAxis: {
        type: 'category',
        data: clients,
        axisLabel: {
          color: '#FAFAFA',
          fontSize: 10,
          fontFamily: 'monospace',
          fontWeight: 'bold',
        },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#27272A' } },
      },
      series: [
        {
          type: 'bar',
          data: amounts.map((amt, idx) => {
            const r = risks[idx];
            const color = r < 30 ? '#10B981' : r < 60 ? '#F59E0B' : '#EF4444';
            return {
              value: amt,
              itemStyle: { color, borderRadius: [0, 2, 2, 0] },
            };
          }),
          barWidth: 16,
          label: {
            show: true,
            position: 'right',
            distance: 10,
            formatter: (p: any) => `${formatINR(p?.value ?? 0)} (${Number(risks[p?.dataIndex] ?? 0).toFixed(0)}% risk)`,
            color: '#FAFAFA',
            fontSize: 10,
            fontFamily: 'monospace',
            fontWeight: 'bold',
          },
          emphasis: { focus: 'none', itemStyle: { opacity: 1 } },
        },
      ],
    };
  }, [customerSummary]);

  // Concentration Breakdown Chart Option
  const concentrationChartOption: EChartsOption = useMemo(() => {
    const topDebtors = (concentrationMetrics.counterpartyExposures || []).slice(0, 5);
    const data: { value: number; name: string }[] = topDebtors.map((d) => ({
      value: d.amount,
      name: d.clientName.length > 18 ? d.clientName.slice(0, 16) + '...' : d.clientName,
    }));

    if (concentrationMetrics.totalPortfolioReceivables > 0) {
      const topSum = topDebtors.reduce((acc: number, curr) => acc + curr.amount, 0);
      const other = concentrationMetrics.totalPortfolioReceivables - topSum;
      if (other > 0) {
        data.push({ value: other, name: 'All Other Clients Combined' });
      }
    }

    const palette = ['#EF4444', '#F97316', '#F59E0B', '#3B82F6', '#06B6D4', '#10B981'];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: '{b}: <b>{c} INR</b> ({d}%)',
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
        itemGap: 10,
      },
      series: [
        {
          name: 'Credit Concentration',
          type: 'pie',
          radius: ['32%', '50%'],
          center: ['50%', '40%'],
          avoidLabelOverlap: true,
          label: {
            show: true,
            formatter: (p: any) => {
              const shortName = p.name.length > 14 ? p.name.slice(0, 12) + '...' : p.name;
              return `${shortName}\n₹${(p.value / 100000).toFixed(1)}L (${p.percent.toFixed(0)}%)`;
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
          data: data.map((d, i: number) => ({
            ...d,
            itemStyle: { color: palette[i % palette.length] },
          })),
        },
      ],
    };
  }, [concentrationMetrics]);

  // Roll-Rate Migration Matrix Chart Option
  const rollRateChartOption: EChartsOption = useMemo(() => {
    const bucketsWithoutAll = bucketMetrics.filter((b) => b.id !== 'all');
    const labels = bucketsWithoutAll.map((b) => b.label);
    const amountsInLakhs = bucketsWithoutAll.map((b) => +(b.totalAmount / 100000).toFixed(2));
    const rollRates = [14.2, 32.5, 54.8, 76.5, 92.0];

    return {
      backgroundColor: 'transparent',
      grid: { left: 55, right: 55, top: 48, bottom: 35, containLabel: true },
      legend: {
        top: 8,
        textStyle: { color: '#D4D4D8', fontSize: 10, fontFamily: 'monospace' },
        data: ['Locked Capital (₹ Lakhs)', 'Roll-Rate to Next Delinquency (%)'],
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          let html = `<div style="font-family:monospace;font-size:11px;padding:3px;">
            <b style="color:#FAFAFA;">${params[0].name}</b><br/>`;
          for (const p of params) {
            html += `<span style="color:${p.color};">${p.seriesName}:</span> <b>${p.value}${p.seriesIndex === 0 ? 'L' : '%'}</b><br/>`;
          }
          html += `</div>`;
          return html;
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: '#3F3F46' } },
        axisLabel: { color: '#FAFAFA', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' },
      },
      yAxis: [
        {
          type: 'value',
          axisLine: { show: false },
          splitLine: { lineStyle: { color: '#27272A', type: [3, 3] } },
          axisLabel: { color: '#D4D4D8', fontSize: 10, fontFamily: 'monospace', formatter: '₹{value}L' },
          name: 'Locked Capital',
          nameTextStyle: { color: '#A1A1AA', fontSize: 9, fontFamily: 'monospace' },
        },
        {
          type: 'value',
          min: 0,
          max: 100,
          axisLine: { show: false },
          splitLine: { show: false },
          axisLabel: { color: '#38BDF8', fontSize: 10, fontFamily: 'monospace', formatter: '{value}%' },
          name: 'Roll-Rate Migration',
          nameTextStyle: { color: '#38BDF8', fontSize: 9, fontFamily: 'monospace' },
        },
      ],
      series: [
        {
          name: 'Locked Capital (₹ Lakhs)',
          type: 'bar',
          data: amountsInLakhs.map((amt, idx) => {
            const colors = ['#10B981', '#3B82F6', '#F59E0B', '#F97316', '#EF4444'];
            return {
              value: amt,
              itemStyle: { color: colors[idx], borderRadius: [2, 2, 0, 0] },
            };
          }),
          barWidth: 26,
          label: {
            show: true,
            position: 'top',
            formatter: '₹{c}L',
            color: '#FAFAFA',
            fontSize: 10,
            fontFamily: 'monospace',
            fontWeight: 'bold',
          },
          emphasis: { focus: 'none', itemStyle: { opacity: 1 } },
        },
        {
          name: 'Roll-Rate to Next Delinquency (%)',
          type: 'line',
          yAxisIndex: 1,
          data: rollRates,
          smooth: true,
          showSymbol: true,
          symbol: 'diamond',
          symbolSize: 8,
          lineStyle: { color: '#38BDF8', width: 2.5 },
          itemStyle: { color: '#38BDF8', borderColor: '#09090B', borderWidth: 1.5 },
          emphasis: { focus: 'none', lineStyle: { width: 3.5 } },
        },
      ],
    };
  }, [bucketMetrics]);

  // Filtered Rows for Invoices View
  const displayedInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.id.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Risk Filter
      if (riskFilter === 'high_risk' && inv.risk < 60) return false;
      if (riskFilter === 'overdue' && inv.dueIn >= 0) return false;
      if (riskFilter === 'safe' && inv.risk >= 30) return false;

      // Bucket Filter
      if (activeBucketId === 'all') return true;
      if (activeBucketId === 'current') return inv.dueIn >= 0;
      const b = BUCKETS.find((x) => x.id === activeBucketId);
      if (!b) return true;
      return inv.dueIn >= b.min && inv.dueIn <= b.max;
    });
  }, [invoices, activeBucketId, searchQuery, riskFilter]);

  // Score Single Row
  const handleEval = async (row: InvoiceRow) => {
    setEvaluatingIds((prev) => new Set(prev).add(row.id));
    try {
      const config = loadApiConfig();
      const pastDelay = row.dueIn < 0 ? Math.abs(row.dueIn) : (state.intake.pastAvgDelayDays || 3);
      const pastLatePct = row.dueIn < 0 ? Math.min(95, 30 + Math.abs(row.dueIn) * 1.5) : (state.intake.pastLatePercent || 15);

      const req: InvoiceEvaluationRequest = {
        invoiceAmount: row.amount,
        paymentTermDays: row.term,
        customerTenureMonths: state.intake.customerTenureMonths || 18,
        pastLatePercent: pastLatePct,
        orderSizeVsAvg: state.intake.orderSizeVsAvg || 1.1,
        pastAvgDelayDays: pastDelay,
        dueWeekday: 'Mon',
        macroStressMultiplier: state.intake.macroStressMultiplier || 1.0,
        gstRegistered: true,
        currentBankBalance: state.intake.currentBankBalance || 250000,
        monthlyFixedExpenses: state.intake.monthlyFixedExpenses || 160000,
      };

      const res = await evaluateInvoicePipeline(req, config);
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === row.id
            ? {
                ...i,
                risk: res.blendedRiskPercent,
                status: i.dueIn < 0 ? 'OVERDUE' : res.blendedRiskPercent > 60 ? 'PENDING' : 'ON_TRACK',
                evaluated: true,
              }
            : i
        )
      );
    } catch (err) {
      console.error('Failed to evaluate invoice:', err);
    } finally {
      setEvaluatingIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  };

  // Batch Score All Invoices
  const handleBatchScoreAll = async () => {
    setIsBatchScoring(true);
    for (const inv of invoices) {
      await handleEval(inv);
    }
    setIsBatchScoring(false);
  };

  // Load into Deal Underwriting
  const handleLoadIntoDeal = (row: InvoiceRow) => {
    dispatch({
      type: 'SET_INTAKE',
      payload: {
        invoiceAmount: row.amount,
        paymentTermDays: row.term,
        pastLatePercent: row.dueIn < 0 ? 65 : 15,
        pastAvgDelayDays: row.dueIn < 0 ? Math.abs(row.dueIn) : 2,
        orderSizeVsAvg: 1.2,
        customerTenureMonths: 14,
        clientName: row.client,
        currentBankBalance: state.treasuryDefaults.currentBankBalance,
        monthlyFixedExpenses: state.treasuryDefaults.monthlyFixedExpenses,
        gstRegistered: state.treasuryDefaults.gstRegistered,
      },
    });
    dispatch({ type: 'SET_PHASE', payload: 'intake' });
    navigate('/workspace/deal');
  };

  // Download Blank CSV Template
  const handleDownloadTemplate = () => {
    const templateContent =
      'InvoiceID,CounterpartyName,AmountINR,PaymentTermDays,DueDays\n' +
      'INV-2026-001,Apex Industrial Solutions Ltd,450000,30,14\n' +
      'INV-2026-002,Zenith Retail Networks,185000,45,-12\n' +
      'INV-2026-003,Bharat Metal Forgings LLP,820000,60,-35\n';

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'float_ageing_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Scored CSV
  const handleExportScoredCsv = () => {
    if (invoices.length === 0) return;
    const headers = [
      'InvoiceID',
      'CounterpartyName',
      'AmountINR',
      'PaymentTermDays',
      'DueDays',
      'LatePaymentRiskPercent',
      'Status',
      'Section16_2_Status',
    ];
    const rows = invoices.map((inv) => {
      const daysOverdue = inv.dueIn < 0 ? Math.abs(inv.dueIn) : 0;
      const sec16Status =
        daysOverdue > 180
          ? 'BREACHED (ITC Reversal)'
          : daysOverdue > 120
          ? 'URGENT WARNING'
          : 'COMPLIANT';
      return [
        `"${inv.id}"`,
        `"${inv.client.replace(/"/g, '""')}"`,
        inv.amount,
        inv.term,
        inv.dueIn,
        inv.evaluated ? inv.risk.toFixed(1) : 'Unscored',
        inv.status,
        `"${sec16Status}"`,
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `float_ageing_scored_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Bulk Dunning / Recovery Action Pack Generator
  const handleExportBulkDunningPack = () => {
    const overdueInvoices = invoices.filter((i) => i.dueIn < 0);
    if (overdueInvoices.length === 0) {
      alert('No overdue invoices currently in portfolio.');
      return;
    }

    let pack = `========================================================================\nfloat. — STATUTORY OVERDUE DUNNING & RECOVERY PACK\nGenerated Date: ${new Date().toLocaleDateString('en-IN')}\nTotal Overdue Invoices: ${overdueInvoices.length}\nTotal Overdue Book: ${formatINR(cfoMetrics.overdueAmount)}\nTotal Accrued MSMED Interest (3x RBI Bank Rate): ${formatINR(cfoMetrics.totalMsmeAccruedInterest)}\n========================================================================\n\n`;

    overdueInvoices.forEach((inv, idx) => {
      const overdueDays = Math.abs(inv.dueIn);
      const interestCalc = calculateMsmeCompoundInterest(inv.amount, inv.term, overdueDays);
      pack += `[CLAIM ITEM #${idx + 1}]\n`;
      pack += `Counterparty Legal Name: ${inv.client}\n`;
      pack += `Invoice Reference: ${inv.id}\n`;
      pack += `Principal Amount: ${formatINR(inv.amount)}\n`;
      pack += `Agreed Payment Terms: Net-${inv.term} Days\n`;
      pack += `Days Delinquent: ${overdueDays} Days Past Due\n`;
      pack += `Accrued Compound Interest (Sec 16 MSMED Act @ 20.25% p.a.): ${formatINR(interestCalc.accruedPenalInterest)}\n`;
      pack += `Total Legal Claim: ${formatINR(interestCalc.totalClaimAmount)}\n`;
      pack += `Statutory Status:\n`;
      if (overdueDays > 45) {
        pack += `  - Section 43B(h) Disallowance: ACTIVE (Buyer loses tax expense deduction)\n`;
      }
      if (overdueDays > 180) {
        pack += `  - CGST Section 16(2) Reversal: BREACHED (18% interest clawback mandated)\n`;
      }
      pack += `Action Required: Remit ${formatINR(interestCalc.totalClaimAmount)} immediately to avoid formal MSEFC / MSME Samadhaan petition filing.\n`;
      pack += `------------------------------------------------------------------------\n\n`;
    });

    const blob = new Blob([pack], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `float_bulk_dunning_pack_${new Date().toISOString().slice(0, 10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Upload CSV File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) return;

      const parsed: InvoiceRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 3) {
          const id = parts[0] || `INV-IMP-${i}`;
          const client = parts[1] || 'Imported Counterparty';
          const amount = parseFloat(parts[2]) || 100000;
          const term = parseInt(parts[3]) || 30;
          const dueIn = parseInt(parts[4]) || 0;

          parsed.push({
            id,
            client,
            amount,
            term,
            dueIn,
            risk: 0,
            status: dueIn < 0 ? 'OVERDUE' : 'ON_TRACK',
            evaluated: false,
          });
        }
      }

      if (parsed.length > 0) {
        setInvoices(parsed);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Manual Add Form Submit
  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient || !newAmount) return;

    const newInv: InvoiceRow = {
      id: `INV-2026-${String(invoices.length + 101).padStart(3, '0')}`,
      client: newClient,
      amount: parseFloat(newAmount) || 0,
      term: parseInt(newTerm) || 30,
      dueIn: parseInt(newDueIn) || 0,
      risk: 0,
      status: parseInt(newDueIn) < 0 ? 'OVERDUE' : 'ON_TRACK',
      evaluated: false,
    };

    setInvoices((prev) => [newInv, ...prev]);
    setShowAddModal(false);
    setNewClient('');
    setNewAmount('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-sans text-[var(--text-primary)]">
            Receivable Ageing Matrix &amp; Ledger
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            Real-world receivables aging, statutory 3x RBI compound interest calculation, and batch payment risk scoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 text-xs font-mono border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--text-tertiary)] flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Template CSV
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-mono border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Upload CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 text-xs font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Invoice
          </button>
        </div>
      </div>

      {/* Hero Action Banner when Empty */}
      {invoices.length === 0 ? (
        <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-8 text-center space-y-4">
          <div className="max-w-md mx-auto space-y-2">
            <FileSpreadsheet className="w-10 h-10 text-[var(--accent-primary)] mx-auto" />
            <h2 className="text-base font-bold font-sans text-[var(--text-primary)]">
              No Receivables Loaded
            </h2>
            <p className="text-xs font-mono text-[var(--text-muted)]">
              Upload your company accounts receivable CSV, download a clean template, or load our verified 10-deal benchmark portfolio to test the triage engine.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setInvoices(BENCHMARK_PORTFOLIO)}
              className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white hover:opacity-90 flex items-center gap-1.5 transition-opacity"
            >
              <Zap className="w-3.5 h-3.5" /> Load Demo Preset (10 Invoices)
            </button>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-4 py-2 text-xs font-mono border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download Blank CSV Template
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Executive CFO Treasury Health Strip with Plain English Definitions */}
          <div className="grid grid-cols-2 sm:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-[var(--border-hairline)] border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            <div className="p-3.5">
              <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)] block">
                Total Receivables Book
              </span>
              <span className="text-base font-mono font-bold text-[var(--text-primary)] tabular-nums mt-0.5 block">
                {formatINR(cfoMetrics.totalReceivables)}
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">
                {invoices.length} active invoices
              </span>
            </div>

            <div className="p-3.5">
              <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)] block">
                Collection Cycle (DSO)
              </span>
              <span className="text-base font-mono font-bold text-[var(--accent-primary)] tabular-nums mt-0.5 block">
                {cfoMetrics.dsoDays} Days
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">
                Time from billing to bank
              </span>
            </div>

            <div className="p-3.5">
              <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)] block">
                Cash Recovery Rate (CEI)
              </span>
              <span
                className="text-base font-mono font-bold tabular-nums mt-0.5 block"
                style={{
                  color: cfoMetrics.ceiPercent > 75 ? 'var(--accent-safe)' : 'var(--accent-warn)',
                }}
              >
                {cfoMetrics.ceiPercent}%
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">
                % due cash collected
              </span>
            </div>

            <div className="p-3.5">
              <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)] block">
                Capital Likely Delayed
              </span>
              <span className="text-base font-mono font-bold text-[var(--accent-danger)] tabular-nums mt-0.5 block">
                {formatINR(cfoMetrics.totalAtRisk)}
              </span>
              <span className="text-[9px] font-mono text-[var(--text-danger)]">
                Invoices with high delay risk
              </span>
            </div>

            <div className="p-3.5">
              <span className="text-[9px] font-mono uppercase text-[var(--accent-danger)] block">
                Bank OD Interest Bleed
              </span>
              <span className="text-base font-mono font-bold text-[var(--accent-danger)] tabular-nums mt-0.5 block">
                -{formatINR(cfoMetrics.totalOdInterestBleed)}
              </span>
              <span className="text-[9px] font-mono text-[var(--text-tertiary)]">
                Cost of bank OD at {odRatePct}% p.a.
              </span>
            </div>

            <div className="p-3.5">
              <span className="text-[9px] font-mono uppercase text-[var(--accent-safe)] block">
                MSMED Accrued Claim
              </span>
              <span className="text-base font-mono font-bold text-[var(--accent-safe)] tabular-nums mt-0.5 block">
                +{formatINR(cfoMetrics.totalMsmeAccruedInterest)}
              </span>
              <span className="text-[9px] font-mono text-[var(--text-tertiary)]">
                3x RBI Rate (20.25% p.a.)
              </span>
            </div>
          </div>

          {/* Aging Distribution Chart & Fast Triage Bar */}
          <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  Receivable Aging Capital Distribution
                </span>
                <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                  Visual triage of outstanding capital across aging brackets.
                </p>
              </div>
              <div className="flex items-center gap-1 border border-[#27272A] bg-[#18181B] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('invoices')}
                  className={`px-3 py-1 text-[10px] font-mono transition-colors ${
                    viewMode === 'invoices'
                      ? 'border border-[#3B82F6] bg-[#3B82F6]/20 text-[#3B82F6] font-bold'
                      : 'border border-transparent text-[#A1A1AA] hover:text-[#FAFAFA]'
                  }`}
                >
                  By Aging Bracket
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('customers')}
                  className={`px-3 py-1 text-[10px] font-mono transition-colors ${
                    viewMode === 'customers'
                      ? 'border border-[#3B82F6] bg-[#3B82F6]/20 text-[#3B82F6] font-bold'
                      : 'border border-transparent text-[#A1A1AA] hover:text-[#FAFAFA]'
                  }`}
                >
                  Top Customers
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('concentration')}
                  className={`px-3 py-1 text-[10px] font-mono transition-colors ${
                    viewMode === 'concentration'
                      ? 'border border-[#3B82F6] bg-[#3B82F6]/20 text-[#3B82F6] font-bold'
                      : 'border border-transparent text-[#A1A1AA] hover:text-[#FAFAFA]'
                  }`}
                >
                  Concentration &amp; HHI
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('migration')}
                  className={`px-3 py-1 text-[10px] font-mono transition-colors ${
                    viewMode === 'migration'
                      ? 'border border-[#3B82F6] bg-[#3B82F6]/20 text-[#3B82F6] font-bold'
                      : 'border border-transparent text-[#A1A1AA] hover:text-[#FAFAFA]'
                  }`}
                >
                  Roll-Rate Migration
                </button>
              </div>
            </div>

            {/* Visual EChart with Direct Data Labels & Dynamic Scaling */}
            <div className="my-1">
              <EChartBox
                option={
                  viewMode === 'invoices'
                    ? agingChartOption
                    : viewMode === 'customers'
                    ? customerChartOption
                    : viewMode === 'concentration'
                    ? concentrationChartOption
                    : rollRateChartOption
                }
                height={320}
                title={
                  viewMode === 'invoices'
                    ? 'Receivable Aging Capital Distribution'
                    : viewMode === 'customers'
                    ? 'Top Customer Exposure & Delinquency Risk'
                    : viewMode === 'concentration'
                    ? 'Portfolio Credit Concentration & HHI Breakdown'
                    : 'Roll-Rate Migration Transition Matrix & Delinquency Escalation'
                }
              />
            </div>

            {/* Clickable 5-Bucket Triage Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-[var(--border-hairline)]">
              {bucketMetrics.map((b) => {
                const isActive = activeBucketId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setActiveBucketId(b.id)}
                    className={`p-2.5 text-left border transition-colors ${
                      isActive
                        ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)]'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[var(--text-tertiary)]'
                    }`}
                  >
                    <div className="text-[9px] font-mono uppercase text-[var(--text-tertiary)] truncate font-semibold">
                      {b.label}
                    </div>
                    <div className="text-xs font-mono font-bold tabular-nums text-[var(--text-primary)] mt-0.5">
                      {formatINR(b.totalAmount)}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[9px] font-mono text-[var(--text-muted)]">
                      <span>{b.count} inv</span>
                      {b.avgRisk > 0 && (
                        <span style={{ color: riskColor(b.avgRisk) }} className="font-bold">
                          {b.avgRisk.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table Controls & Filter Bar */}
          <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search invoice or customer..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-tertiary)]"
                />
              </div>

              {/* Risk Filter Buttons */}
              <div className="flex items-center gap-1 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-0.5 text-[10px] font-mono">
                {(['all', 'overdue', 'high_risk', 'safe'] as const).map((rf) => (
                  <button
                    key={rf}
                    type="button"
                    onClick={() => setRiskFilter(rf)}
                    className={`px-2 py-1 transition-colors ${
                      riskFilter === rf
                        ? 'bg-[var(--accent-primary)] text-white font-bold'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {rf === 'all'
                      ? 'All'
                      : rf === 'overdue'
                      ? 'Overdue'
                      : rf === 'high_risk'
                      ? 'High Risk'
                      : 'Safe'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={handleBatchScoreAll}
                disabled={isBatchScoring}
                className="px-3 py-1.5 text-xs font-mono border border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 disabled:opacity-40 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBatchScoring ? 'animate-spin' : ''}`} />
                <span>{isBatchScoring ? 'Scoring Ledger...' : 'Batch Score All'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportBulkDunningPack}
                className="px-3 py-1.5 text-xs font-mono border border-[var(--accent-warn)] bg-[var(--accent-warn)]/10 text-[var(--accent-warn)] hover:bg-[var(--accent-warn)]/20 flex items-center gap-1.5 transition-colors"
                title="Download combined statutory dunning pack for all overdue accounts"
              >
                <FileText className="w-3.5 h-3.5" /> Bulk Dunning Pack
              </button>

              <button
                type="button"
                onClick={handleExportScoredCsv}
                className="px-3 py-1.5 text-xs font-mono border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--text-tertiary)] flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>

              <button
                type="button"
                onClick={() => setInvoices([])}
                className="px-2 py-1.5 text-xs font-mono border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--accent-danger)] transition-colors"
                title="Clear Ledger"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: INDIVIDUAL INVOICE LIST */}
          {viewMode === 'invoices' && (
            <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[10px] font-mono uppercase text-[var(--text-tertiary)]">
                    <th className="py-2.5 px-3 font-semibold">Invoice ID</th>
                    <th className="py-2.5 px-3 font-semibold">Counterparty Name</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Principal (INR)</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Terms</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Ageing Status</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Section 16(2) GST</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Late Probability</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)] text-xs font-mono">
                  {displayedInvoices.map((inv) => {
                    const isOverdue = inv.dueIn < 0;
                    const overdueDays = isOverdue ? Math.abs(inv.dueIn) : 0;
                    const isEvaluatingThis = evaluatingIds.has(inv.id);

                    const isSection16Breached = overdueDays > 180;
                    const isSection16Warning = overdueDays > 120 && !isSection16Breached;

                    return (
                      <tr key={inv.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                        <td className="py-3 px-3 font-bold text-[var(--text-primary)]">
                          {inv.id}
                        </td>
                        <td className="py-3 px-3 text-[var(--text-primary)] font-sans">
                          {inv.client}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums font-bold text-[var(--text-primary)]">
                          {formatINR(inv.amount)}
                        </td>
                        <td className="py-3 px-3 text-center text-[var(--text-muted)]">
                          Net-{inv.term}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-mono border ${
                              isOverdue
                                ? 'border-[var(--accent-danger)]/50 text-[var(--accent-danger)]'
                                : 'border-[var(--border-hairline)] text-[var(--text-muted)]'
                            }`}
                          >
                            {isOverdue ? `${overdueDays}d overdue` : `Due in ${inv.dueIn}d`}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 text-[9px] font-mono border ${
                              isSection16Breached
                                ? 'border-[var(--accent-danger)] text-[var(--accent-danger)] font-bold'
                                : isSection16Warning
                                ? 'border-[var(--accent-warn)] text-[var(--accent-warn)]'
                                : 'border-[var(--border-hairline)] text-[var(--text-tertiary)]'
                            }`}
                          >
                            {isSection16Breached
                              ? '180D REVERSAL'
                              : isSection16Warning
                              ? `${180 - overdueDays}d left`
                              : 'COMPLIANT'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold tabular-nums">
                          {inv.evaluated ? (
                            <span style={{ color: riskColor(inv.risk) }}>
                              {inv.risk.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--text-tertiary)] font-normal italic">
                              Unscored
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isOverdue && (
                              <button
                                type="button"
                                onClick={() => setSelectedMsmeInvoice(inv)}
                                className="px-2 py-1 text-[10px] font-mono border border-[var(--accent-warn)]/60 bg-[var(--accent-warn)]/10 text-[var(--accent-warn)] hover:bg-[var(--accent-warn)]/20 transition-colors flex items-center gap-1"
                                title="Calculate statutory 3x RBI compound interest and generate demand notice"
                              >
                                <Scale className="w-3 h-3" />
                                <span>MSME CLAIM</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleEval(inv)}
                              disabled={isEvaluatingThis}
                              className="px-2.5 py-1 text-[10px] font-mono border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] disabled:opacity-40 transition-colors"
                            >
                              {isEvaluatingThis ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                'SCORE'
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLoadIntoDeal(inv)}
                              className="px-2 py-1 text-[10px] font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                              title="Load deal into Underwriting"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW MODE 2: GROUP BY CUSTOMER */}
          {viewMode === 'customers' && (
            <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[10px] font-mono uppercase text-[var(--text-tertiary)]">
                    <th className="py-2.5 px-3 font-semibold">Customer Legal Name</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Invoices</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Cumulative Balance</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Max Overdue</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Accrued Interest (Sec 16)</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Avg Risk Score</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Recovery Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)] text-xs font-mono">
                  {customerSummary.map((cust) => (
                    <tr key={cust.client} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="py-3 px-3 text-[var(--text-primary)] font-sans font-medium flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        {cust.client}
                      </td>
                      <td className="py-3 px-3 text-center text-[var(--text-muted)]">
                        {cust.invoicesCount} inv
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold text-[var(--text-primary)]">
                        {formatINR(cust.totalAmount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-mono border ${
                            cust.maxOverdueDays > 0
                              ? 'border-[var(--accent-danger)]/50 text-[var(--accent-danger)]'
                              : 'border-[var(--border-hairline)] text-[var(--text-muted)]'
                          }`}
                        >
                          {cust.maxOverdueDays > 0 ? `${cust.maxOverdueDays}d overdue` : 'On track'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-[var(--accent-warn)] font-bold">
                        {cust.accruedInterest > 0 ? `+${formatINR(cust.accruedInterest)}` : '₹0'}
                      </td>
                      <td className="py-3 px-3 text-center font-bold tabular-nums">
                        {cust.avgRisk > 0 ? (
                          <span style={{ color: riskColor(cust.avgRisk) }}>
                            {cust.avgRisk.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--text-tertiary)] italic">
                            Unscored
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {cust.maxOverdueDays > 0 ? (
                          <button
                            type="button"
                            onClick={handleExportBulkDunningPack}
                            className="px-2.5 py-1 text-[10px] font-mono border border-[var(--accent-warn)] bg-[var(--accent-warn)]/10 text-[var(--accent-warn)] hover:bg-[var(--accent-warn)]/20 transition-colors"
                          >
                            ISSUE STATEMENT
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-[var(--accent-safe)]">
                            HEALTHY
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Customer Credit Concentration & Contagion Matrix */}
          {viewMode === 'concentration' && (
            <div className="space-y-4">
              {/* Concentration Summary Banner */}
              <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-hairline)] gap-2">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-[var(--accent-primary)]" />
                    <div>
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        Portfolio Concentration &amp; Single-Counterparty Default Risk (HHI)
                      </h3>
                      <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                        Evaluates existential exposure to single buyers. High concentration means a single debtor default can trigger MSME bankruptcy.
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase border self-start sm:self-auto ${
                      concentrationMetrics.riskCategory === 'CRITICAL_CONCENTRATION'
                        ? 'border-[var(--accent-danger)] bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]'
                        : concentrationMetrics.riskCategory === 'MODERATE_RISK'
                        ? 'border-[var(--accent-warn)] bg-[var(--accent-warn)]/10 text-[var(--accent-warn)]'
                        : 'border-[var(--accent-safe)] bg-[var(--accent-safe)]/10 text-[var(--accent-safe)]'
                    }`}
                  >
                    {concentrationMetrics.riskCategory.replace('_', ' ')}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                  <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
                    <span className="text-[9px] uppercase text-[var(--text-tertiary)] block">
                      Top Debtor Exposure
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)] font-sans block truncate mt-0.5">
                      {concentrationMetrics.topBuyerName}
                    </span>
                    <span className="text-base font-bold text-[var(--accent-primary)] tabular-nums block">
                      {formatINR(concentrationMetrics.topBuyerExposure)} ({concentrationMetrics.topBuyerSharePercent}%)
                    </span>
                  </div>

                  <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
                    <span className="text-[9px] uppercase text-[var(--text-tertiary)] block">
                      Herfindahl Index (HHI)
                    </span>
                    <span
                      className="text-base font-bold tabular-nums block mt-0.5"
                      style={{
                        color:
                          concentrationMetrics.hhiScore > 2500
                            ? 'var(--accent-danger)'
                            : concentrationMetrics.hhiScore > 1500
                            ? 'var(--accent-warn)'
                            : 'var(--accent-safe)',
                      }}
                    >
                      {concentrationMetrics.hhiScore} / 10,000
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {concentrationMetrics.hhiScore > 2500
                        ? 'Highly Concentrated'
                        : concentrationMetrics.hhiScore > 1500
                        ? 'Moderately Concentrated'
                        : 'Diversified Book'}
                    </span>
                  </div>

                  <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
                    <span className="text-[9px] uppercase text-[var(--text-tertiary)] block">
                      MSME Safe Exposure Cap
                    </span>
                    <span className="text-base font-bold text-[var(--text-primary)] tabular-nums block mt-0.5">
                      20.0% Max Share
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)]">
                      RBI Prudential standard adapted for MSMEs
                    </span>
                  </div>

                  <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
                    <span className="text-[9px] uppercase text-[var(--text-tertiary)] block">
                      Over-Concentrated Buyers
                    </span>
                    <span className="text-base font-bold text-[var(--accent-danger)] tabular-nums block mt-0.5">
                      {concentrationMetrics.counterpartyExposures.filter((c) => c.isOverLimit).length} Accounts
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)]">
                      Exceeding 20% safe portfolio limit
                    </span>
                  </div>
                </div>

                {concentrationMetrics.topBuyerSharePercent > 20 && (
                  <div className="p-3 border border-[var(--accent-danger)]/50 bg-[var(--accent-danger)]/5 text-xs font-mono text-[var(--text-primary)] flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-[var(--accent-danger)] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[var(--accent-danger)]">
                        SINGLE-BUYER CONTAGION WARNING:
                      </span>{' '}
                      <b>{concentrationMetrics.topBuyerName}</b> represents <b>{concentrationMetrics.topBuyerSharePercent}%</b> of your entire trade credit portfolio. If this debtor faces insolvency or delays beyond 90 days, your working capital will freeze. <b>Mandatory Action:</b> Restrict further unsecured supply, demand a 30% advance on new orders, or require an irrevocable Letter of Credit (LC).
                    </div>
                  </div>
                )}
              </div>

              {/* Counterparty Concentration Ranking Table */}
              <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[10px] font-mono uppercase text-[var(--text-tertiary)]">
                      <th className="py-2.5 px-3 font-semibold">Counterparty Name</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Receivables Exposure</th>
                      <th className="py-2.5 px-3 font-semibold text-left">Portfolio Share vs 20% Cap</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right">HHI Contribution</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Prescribed Protective Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-hairline)] text-xs font-mono">
                    {concentrationMetrics.counterpartyExposures.map((item) => (
                      <tr key={item.clientName} className="hover:bg-[var(--bg-elevated)] transition-colors">
                        <td className="py-3 px-3 font-sans font-medium text-[var(--text-primary)]">
                          {item.clientName}
                        </td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums text-[var(--text-primary)]">
                          {formatINR(item.amount)}
                        </td>
                        <td className="py-3 px-3 w-48">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-[var(--bg-elevated)] border border-[var(--border-hairline)] relative">
                              <div
                                className="h-full"
                                style={{
                                  width: `${Math.min(100, item.sharePercent * 2)}%`,
                                  backgroundColor: item.isOverLimit
                                    ? 'var(--accent-danger)'
                                    : 'var(--accent-safe)',
                                }}
                              />
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-[var(--text-tertiary)]"
                                style={{ left: '40%' }} // 20% * 2 = 40%
                                title="Safe 20% Cap"
                              />
                            </div>
                            <span
                              className="text-[10px] tabular-nums font-bold"
                              style={{
                                color: item.isOverLimit ? 'var(--accent-danger)' : 'var(--text-muted)',
                              }}
                            >
                              {item.sharePercent}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.isOverLimit ? (
                            <span className="px-2 py-0.5 text-[9px] font-bold border border-[var(--accent-danger)] bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]">
                              CAP BREACHED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[9px] font-mono border border-[var(--accent-safe)]/40 text-[var(--accent-safe)]">
                              WITHIN LIMIT
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-[var(--text-tertiary)] tabular-nums">
                          +{item.hhiContribution} pts
                        </td>
                        <td className="py-3 px-3 text-right text-[10px]">
                          {item.isOverLimit ? (
                            <span className="text-[var(--accent-warn)] font-bold">
                              Halt Unsecured Credit / Demand LC
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)]">
                              Normal Commercial Terms
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE 4: ROLL-RATE MIGRATION MATRIX */}
          {viewMode === 'migration' && (
            <div className="space-y-4">
              <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-hairline)] gap-2">
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Empirical Roll-Rate Transition Matrix (Markov Credit Chain)
                    </h3>
                    <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                      Tracks the empirical probability of overdue capital cascading into subsequent delinquency stages.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono border border-[#38BDF8] text-[#38BDF8] px-2 py-0.5 font-bold">
                    IFRS 9 Stage Transition
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                  <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
                    <span className="text-[9px] uppercase text-[var(--text-tertiary)] block">Current → 1-15d Roll</span>
                    <span className="text-base font-bold text-[#10B981] tabular-nums block mt-0.5">14.2%</span>
                    <span className="text-[9px] text-[var(--text-muted)]">Stage 1 Performing</span>
                  </div>
                  <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
                    <span className="text-[9px] uppercase text-[var(--text-tertiary)] block">1-15d → 16-30d Roll</span>
                    <span className="text-base font-bold text-[#F59E0B] tabular-nums block mt-0.5">32.5%</span>
                    <span className="text-[9px] text-[var(--text-muted)]">Notice of Demand Issued</span>
                  </div>
                  <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
                    <span className="text-[9px] uppercase text-[var(--text-tertiary)] block">16-30d → 31-60d Roll</span>
                    <span className="text-base font-bold text-[#F97316] tabular-nums block mt-0.5">54.8%</span>
                    <span className="text-[9px] text-[var(--text-muted)]">MSMED Sec 16 Interest Auto-Accrual</span>
                  </div>
                  <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
                    <span className="text-[9px] uppercase text-[var(--text-tertiary)] block">&gt;60d Default Risk</span>
                    <span className="text-base font-bold text-[#EF4444] tabular-nums block mt-0.5">76.5%</span>
                    <span className="text-[9px] text-[var(--text-muted)]">MSEFC Legal Filing Mandate</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[10px] font-mono uppercase text-[var(--text-tertiary)]">
                        <th className="py-2.5 px-3 font-semibold">Origin Aging Bucket</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Locked Capital</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Invoice Count</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Roll-Rate into Next Stage</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Expected Recovery Rate</th>
                        <th className="py-2.5 px-3 font-semibold">Mandated Statutory Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-hairline)] text-xs font-mono">
                      {[
                        { origin: 'Current (Not Due)', amount: bucketMetrics[1]?.totalAmount || 0, count: bucketMetrics[1]?.count || 0, roll: '14.2%', rec: '98.5%', action: 'Standard invoice reconciliation', color: '#10B981' },
                        { origin: '1-15d Overdue', amount: bucketMetrics[2]?.totalAmount || 0, count: bucketMetrics[2]?.count || 0, roll: '32.5%', rec: '89.2%', action: 'Automated payment reminder & statement', color: '#3B82F6' },
                        { origin: '16-30d Overdue', amount: bucketMetrics[3]?.totalAmount || 0, count: bucketMetrics[3]?.count || 0, roll: '54.8%', rec: '74.6%', action: 'Section 43B(h) reminder notice', color: '#F59E0B' },
                        { origin: '31-60d Overdue', amount: bucketMetrics[4]?.totalAmount || 0, count: bucketMetrics[4]?.count || 0, roll: '76.5%', rec: '52.1%', action: 'MSMED Act Section 16 penal interest claim', color: '#F97316' },
                        { origin: '>60d Critical Default', amount: bucketMetrics[5]?.totalAmount || 0, count: bucketMetrics[5]?.count || 0, roll: '92.0%', rec: '28.4%', action: 'File formal case with MSEFC Council / Samadhaan', color: '#EF4444' },
                      ].map((row, idx) => (
                        <tr key={idx} className="hover:bg-[var(--bg-elevated)] transition-colors">
                          <td className="py-3 px-3 font-medium text-[var(--text-primary)] flex items-center gap-2">
                            <span className="w-2 h-2" style={{ backgroundColor: row.color }} />
                            {row.origin}
                          </td>
                          <td className="py-3 px-3 text-right font-bold tabular-nums text-[var(--text-primary)]">
                            {formatINR(row.amount)}
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums text-[var(--text-muted)]">
                            {row.count} inv
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums font-bold" style={{ color: row.color }}>
                            {row.roll}
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums text-[#38BDF8] font-bold">
                            {row.rec}
                          </td>
                          <td className="py-3 px-3 text-[10px] text-[var(--text-muted)] font-mono">
                            {row.action}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Manual Add Invoice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-primary)] font-bold">
                Add Invoice to Portfolio Ledger
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManual} className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                  Counterparty Legal Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Industrial Solutions Ltd"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="field-input font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Invoice Amount (INR)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="350000"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="field-input font-mono text-right"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                    Terms (Days)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="30"
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    className="field-input font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                  Due Days (e.g. 15 if not due, -20 if overdue)
                </label>
                <input
                  type="number"
                  required
                  placeholder="15"
                  value={newDueIn}
                  onChange={(e) => setNewDueIn(e.target.value)}
                  className="field-input font-mono text-right"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs font-mono border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white hover:opacity-90"
                >
                  Add Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MSME Samadhaan Recovery Claim Modal */}
      <MsmeSamadhaanModal
        isOpen={!!selectedMsmeInvoice}
        onClose={() => setSelectedMsmeInvoice(null)}
        invoice={selectedMsmeInvoice}
      />
    </div>
  );
};

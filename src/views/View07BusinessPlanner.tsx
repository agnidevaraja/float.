import React, { useState, useMemo, useEffect } from 'react';
import {
  Database,
  TrendingUp,
  Upload,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  FileSpreadsheet,
  Cpu,
  Activity,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import { useWorkspace } from '../store/workspaceStore';
import { EChartBox } from '../components/charts/EChartBox';
import { SegmentedTabs } from '../components/common/SegmentedTabs';
import type { EChartsOption } from 'echarts';
import {
  loadApiConfig,
  importBusinessDataToColab,
  simulateBusinessPlan,
} from '../engine/inferenceBridge';
import type {
  BusinessPlanRequest,
  BusinessPlanResponse,
  BusinessDataImportResponse,
} from '../types/engineContract';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);

interface InvoiceRow {
  id: string;
  counterparty_name: string;
  invoice_amount: number;
  payment_term_days: number;
  customer_tenure_months: number;
  past_late_percent: number;
  order_size_vs_avg: number;
  past_avg_delay_days: number;
  was_late: boolean;
}

const BENCHMARK_HISTORICAL_INVOICES: InvoiceRow[] = [
  { id: '1', counterparty_name: 'Tata Motors Commercial Vehicle Hub', invoice_amount: 4850000, payment_term_days: 45, customer_tenure_months: 36, past_late_percent: 28, order_size_vs_avg: 1.45, past_avg_delay_days: 14, was_late: true },
  { id: '2', counterparty_name: 'Larsen & Toubro Heavy Engineering Ltd', invoice_amount: 3250000, payment_term_days: 45, customer_tenure_months: 24, past_late_percent: 18, order_size_vs_avg: 1.10, past_avg_delay_days: 8, was_late: false },
  { id: '3', counterparty_name: 'Kalyani Forge Industrial Division', invoice_amount: 1420000, payment_term_days: 30, customer_tenure_months: 18, past_late_percent: 42, order_size_vs_avg: 1.85, past_avg_delay_days: 22, was_late: true },
  { id: '4', counterparty_name: 'Bharat Forge Precision Castings', invoice_amount: 2150000, payment_term_days: 30, customer_tenure_months: 40, past_late_percent: 8, order_size_vs_avg: 0.95, past_avg_delay_days: 3, was_late: false },
  { id: '5', counterparty_name: 'Mahindra & Mahindra Farm Equipment', invoice_amount: 1880000, payment_term_days: 45, customer_tenure_months: 14, past_late_percent: 34, order_size_vs_avg: 1.30, past_avg_delay_days: 18, was_late: true },
  { id: '6', counterparty_name: 'Godrej & Boyce Manufacturing', invoice_amount: 980000, payment_term_days: 30, customer_tenure_months: 28, past_late_percent: 12, order_size_vs_avg: 1.05, past_avg_delay_days: 4, was_late: false },
  { id: '7', counterparty_name: 'Thermax Energy Systems', invoice_amount: 1650000, payment_term_days: 60, customer_tenure_months: 16, past_late_percent: 25, order_size_vs_avg: 1.20, past_avg_delay_days: 11, was_late: false },
  { id: '8', counterparty_name: 'Cummins India Power Generation', invoice_amount: 2450000, payment_term_days: 30, customer_tenure_months: 32, past_late_percent: 10, order_size_vs_avg: 1.00, past_avg_delay_days: 2, was_late: false },
];

export const View07BusinessPlanner: React.FC = () => {
  const { state, dispatch } = useWorkspace();
  const apiConfig = useMemo(() => loadApiConfig(), []);
  const [activeSubTab, setActiveSubTab] = useState<'adapter' | 'planner'>('adapter');

  // ---------------------------------------------------------------------------
  // Panel A State: Custom Business Import (blank-first; synced with workspaceStore)
  // ---------------------------------------------------------------------------
  const [companyName, setCompanyName] = useState<string>(
    () => state.plannerState.companyName || state.enterpriseProfile?.companyName || ''
  );
  const [industryNotes, setIndustryNotes] = useState<string>(
    () => state.plannerState.industryNotes || state.enterpriseProfile?.keyProductsServices || ''
  );
  const [inputMode, setInputMode] = useState<'table' | 'csv'>('table');
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>(() =>
    state.plannerState.rows.length > 0
      ? state.plannerState.rows.map((r, idx) => ({
          id: `PL-${idx + 1}`,
          counterparty_name: r.client,
          invoice_amount: r.amount,
          payment_term_days: r.terms,
          customer_tenure_months: 18,
          past_late_percent: r.paidLate ? 40 : 12,
          order_size_vs_avg: 1.15,
          past_avg_delay_days: Math.max(0, r.actualPayDay - r.terms),
          was_late: r.paidLate,
        }))
      : []
  );
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<BusinessDataImportResponse | null>(null);

  // Sync Panel A with workspaceStore changes (Demo Preset / Settings / Reset)
  useEffect(() => {
    setCompanyName(state.plannerState.companyName || state.enterpriseProfile?.companyName || '');
  }, [state.plannerState.companyName, state.enterpriseProfile?.companyName]);

  useEffect(() => {
    if (state.plannerState.industryNotes || state.enterpriseProfile?.keyProductsServices) {
      setIndustryNotes(state.plannerState.industryNotes || state.enterpriseProfile?.keyProductsServices || '');
    } else if (!state.enterpriseProfile?.companyName && state.plannerState.rows.length === 0) {
      setIndustryNotes('');
    }
  }, [state.plannerState.industryNotes, state.enterpriseProfile?.keyProductsServices, state.enterpriseProfile?.companyName, state.plannerState.rows.length]);

  useEffect(() => {
    if (state.plannerState.rows.length === 0) {
      setInvoiceRows([]);
      setImportResult(null);
    } else {
      setInvoiceRows(
        state.plannerState.rows.map((r, idx) => ({
          id: `PL-${idx + 1}`,
          counterparty_name: r.client,
          invoice_amount: r.amount,
          payment_term_days: r.terms,
          customer_tenure_months: 18,
          past_late_percent: r.paidLate ? 40 : 12,
          order_size_vs_avg: 1.15,
          past_avg_delay_days: Math.max(0, r.actualPayDay - r.terms),
          was_late: r.paidLate,
        }))
      );
    }
  }, [state.plannerState.rows]);

  // ---------------------------------------------------------------------------
  // Panel B State: 6-Month Working Capital & Expansion Survival Planner
  // ---------------------------------------------------------------------------
  const [currentCash, setCurrentCashState] = useState<number>(state.treasuryDefaults.currentBankBalance);
  const [monthlyRevenue, setMonthlyRevenueState] = useState<number>(
    state.plannerState.monthlyRevenue ||
      (state.enterpriseProfile.annualTurnover > 0 ? Math.round(state.enterpriseProfile.annualTurnover / 12) : 0)
  );
  const [monthlyExpenses, setMonthlyExpensesState] = useState<number>(
    state.treasuryDefaults.monthlyFixedExpenses
  );
  const [expansionCapEx, setExpansionCapExState] = useState<number>(state.plannerState.expansionCapEx);
  const [avgReceivableDays, setAvgReceivableDaysState] = useState<number>(
    state.plannerState.avgReceivableDays || state.enterpriseProfile.standardCreditTermDays || 45
  );
  const [horizonMonths, setHorizonMonths] = useState<number>(state.plannerState.horizonMonths || 6);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [planResult, setPlanResult] = useState<BusinessPlanResponse | null>(null);

  useEffect(() => {
    setCurrentCashState(state.treasuryDefaults.currentBankBalance);
  }, [state.treasuryDefaults.currentBankBalance]);

  useEffect(() => {
    setMonthlyExpensesState(state.treasuryDefaults.monthlyFixedExpenses);
  }, [state.treasuryDefaults.monthlyFixedExpenses]);

  useEffect(() => {
    setMonthlyRevenueState(
      state.plannerState.monthlyRevenue ||
        (state.enterpriseProfile.annualTurnover > 0 ? Math.round(state.enterpriseProfile.annualTurnover / 12) : 0)
    );
  }, [state.plannerState.monthlyRevenue, state.enterpriseProfile.annualTurnover]);

  useEffect(() => {
    setExpansionCapExState(state.plannerState.expansionCapEx);
  }, [state.plannerState.expansionCapEx]);

  useEffect(() => {
    setAvgReceivableDaysState(
      state.plannerState.avgReceivableDays || state.enterpriseProfile.standardCreditTermDays || 45
    );
  }, [state.plannerState.avgReceivableDays, state.enterpriseProfile.standardCreditTermDays]);

  const setCurrentCash = (v: number) => {
    setCurrentCashState(v);
    dispatch({
      type: 'SET_DEFAULTS',
      payload: { ...state.treasuryDefaults, currentBankBalance: v },
    });
  };
  const setMonthlyExpenses = (v: number) => {
    setMonthlyExpensesState(v);
    dispatch({
      type: 'SET_DEFAULTS',
      payload: { ...state.treasuryDefaults, monthlyFixedExpenses: v },
    });
  };
  const setMonthlyRevenue = (v: number) => {
    setMonthlyRevenueState(v);
    dispatch({ type: 'SET_PLANNER_STATE', payload: { monthlyRevenue: v } });
  };
  const setExpansionCapEx = (v: number) => {
    setExpansionCapExState(v);
    dispatch({ type: 'SET_PLANNER_STATE', payload: { expansionCapEx: v } });
  };
  const setAvgReceivableDays = (v: number) => {
    setAvgReceivableDaysState(v);
    dispatch({ type: 'SET_PLANNER_STATE', payload: { avgReceivableDays: v } });
  };

  // Add Row
  const handleAddRow = () => {
    const newRow: InvoiceRow = {
      id: Date.now().toString(),
      counterparty_name: 'New Corporate Counterparty',
      invoice_amount: 500000,
      payment_term_days: 30,
      customer_tenure_months: 12,
      past_late_percent: 15,
      order_size_vs_avg: 1.0,
      past_avg_delay_days: 5,
      was_late: false,
    };
    setInvoiceRows((prev) => [...prev, newRow]);
  };

  // Remove Row
  const handleRemoveRow = (id: string) => {
    setInvoiceRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Update Row
  const handleUpdateRow = (id: string, patch: Partial<InvoiceRow>) => {
    setInvoiceRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  };

  // CSV Drag and drop parser
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || '';
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) return;

      const parsed: InvoiceRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 2) {
          parsed.push({
            id: `csv-${i}`,
            counterparty_name: parts[0] || `Buyer ${i}`,
            invoice_amount: parseFloat(parts[1]) || 250000,
            payment_term_days: parseInt(parts[2], 10) || 30,
            customer_tenure_months: parseInt(parts[3], 10) || 12,
            past_late_percent: parseFloat(parts[4]) || 15,
            order_size_vs_avg: parseFloat(parts[5]) || 1.0,
            past_avg_delay_days: parseFloat(parts[6]) || 5,
            was_late: parts[7] === 'true' || parts[7] === '1',
          });
        }
      }

      if (parsed.length > 0) {
        setInvoiceRows(parsed);
        setInputMode('table');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Import and Train Custom Adapter
  const handleImportAndTrain = async () => {
    setIsImporting(true);
    setImportResult(null);

    const payload = {
      company_name: companyName,
      notes: industryNotes,
      records: invoiceRows.map((r) => ({
        counterparty_name: r.counterparty_name,
        invoice_amount: r.invoice_amount,
        payment_term_days: r.payment_term_days,
        customer_tenure_months: r.customer_tenure_months,
        past_late_percent: r.past_late_percent,
        order_size_vs_avg: r.order_size_vs_avg,
        past_avg_delay_days: r.past_avg_delay_days,
        was_late: r.was_late,
      })),
    };

    try {
      const res = await importBusinessDataToColab(payload, apiConfig);
      setImportResult(res);

      // Build counterparty weights dictionary for workspace store
      const cMap: Record<string, any> = {};
      invoiceRows.forEach((r) => {
        const key = r.counterparty_name.trim();
        if (!cMap[key]) {
          cMap[key] = {
            name: key,
            pastLatePercent: r.past_late_percent,
            avgDelayDays: r.past_avg_delay_days,
            orderSizeAvg: r.order_size_vs_avg,
            tenureMonths: r.customer_tenure_months,
            totalDeals: 1,
          };
        } else {
          cMap[key].totalDeals += 1;
        }
      });

      dispatch({
        type: 'SET_CUSTOM_BUSINESS_DATA',
        payload: {
          companyName,
          notes: industryNotes,
          recordsCount: res.records_ingested,
          counterpartiesCount: res.counterparties_indexed,
          counterparties: cMap,
          lastImportDate: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error('Import failed', err);
    } finally {
      setIsImporting(false);
    }
  };

  // Run Expansion Planner
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    const req: BusinessPlanRequest = {
      current_cash: currentCash,
      monthly_revenue: monthlyRevenue,
      monthly_expenses: monthlyExpenses,
      planned_expansion_cost: expansionCapEx,
      avg_receivable_days: avgReceivableDays,
      months: horizonMonths,
    };

    try {
      const result = await simulateBusinessPlan(req, apiConfig);
      setPlanResult(result);
    } catch (err) {
      console.error('Plan simulation failed', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Initial simulation on load
  React.useEffect(() => {
    handleRunSimulation();
  }, []);

  // ECharts Option for Multi-Month Cash Balance & Flow
  const planChartOption = useMemo<EChartsOption>(() => {
    if (!planResult) return {};

    const months = planResult.monthly_projection.map((p) => `Month ${p.month}`);
    const cashValues = planResult.monthly_projection.map((p) => p.projected_cash);
    const inflows = planResult.monthly_projection.map((p) => p.collected_revenue);
    const outflows = planResult.monthly_projection.map((p) => p.fixed_outflow);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: '#52525B', width: 1.5, type: 'dashed' } },
        formatter: (params: any) => {
          let tip = `<div style="font-family:monospace;font-size:11px;padding:4px;"><strong style="color:#FAFAFA;">${params[0]?.axisValue}</strong><br/>`;
          params.forEach((p: any) => {
            tip += `<span style="color:${p.color}">●</span> ${p.seriesName}: <strong>₹${(p.value).toLocaleString('en-IN')}</strong><br/>`;
          });
          return tip + '</div>';
        },
        backgroundColor: '#111113',
        borderColor: '#27272A',
        textStyle: { color: '#FAFAFA' },
      },
      legend: {
        type: 'scroll',
        data: ['Projected Cash Balance', 'Collected Revenue (Lag-Adjusted)', 'Fixed Operating Outflows'],
        textStyle: { color: '#D4D4D8', fontSize: 11, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" },
        top: 6,
        left: 'center',
        itemGap: 28,
        padding: [4, 12],
      },
      grid: { left: 68, right: 48, top: 68, bottom: 38, containLabel: true },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: { color: '#FAFAFA', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' },
        axisLine: { lineStyle: { color: '#27272A' } },
      },
      yAxis: [
        {
          type: 'value',
          axisLabel: {
            color: '#D4D4D8',
            fontSize: 10,
            fontFamily: 'monospace',
            margin: 12,
            formatter: (v: number) => `₹${(v / 100000).toFixed(1)}L`,
          },
          splitLine: { lineStyle: { color: '#27272A', type: [3, 3] } },
        },
      ],
      series: [
        {
          name: 'Collected Revenue (Lag-Adjusted)',
          type: 'bar',
          barWidth: 24,
          barGap: '28%',
          data: inflows,
          itemStyle: { color: '#10B981', borderRadius: [4, 4, 0, 0] },
          label: {
            show: true,
            position: 'insideTop',
            distance: 6,
            formatter: (p: any) => `₹${(p.value / 100000).toFixed(1)}L`,
            color: '#FFFFFF',
            fontSize: 9,
            fontFamily: 'monospace',
            fontWeight: 'bold',
          },
          emphasis: { focus: 'none', itemStyle: { opacity: 1 } },
        },
        {
          name: 'Fixed Operating Outflows',
          type: 'bar',
          barWidth: 24,
          data: outflows,
          itemStyle: { color: '#F59E0B', borderRadius: [4, 4, 0, 0] },
          label: {
            show: true,
            position: 'insideTop',
            distance: 6,
            formatter: (p: any) => `₹${(p.value / 100000).toFixed(1)}L`,
            color: '#FFFFFF',
            fontSize: 9,
            fontFamily: 'monospace',
            fontWeight: 'bold',
          },
          emphasis: { focus: 'none', itemStyle: { opacity: 1 } },
        },
        {
          name: 'Projected Cash Balance',
          type: 'line',
          data: cashValues,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 3, color: '#06B6D4' },
          itemStyle: { color: '#06B6D4', borderColor: '#09090B', borderWidth: 1.5 },
          emphasis: { focus: 'none', lineStyle: { width: 4 } },
          markLine: {
            symbol: 'none',
            silent: true,
            data: [{ yAxis: 0, lineStyle: { color: '#EF4444', type: 'dashed', width: 2 } }],
            label: { formatter: 'ZERO CASH FLOOR', position: 'insideStartTop', distance: 6, color: '#EF4444', fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' },
          },
        },
      ],
    };
  }, [planResult]);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border-hairline)]">
        <div>
          <h1 className="text-xl font-bold font-display text-[var(--text-primary)]">
            Business &amp; Planning Workbench
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
            Fine-tune custom ensemble counterparty weights from historical invoices and simulate 6-month expansion runway across 6 Data Sources &amp; 59 Features.
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: 'LOAD_DEMO_PRESET', payload: 'planner' })}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/25 transition-colors"
          >
            Load Demo Preset
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'RESET_WORKSPACE_TO_BLANK', payload: 'planner' });
              setPlanResult(null);
              setImportResult(null);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-mono border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Clear to Blank
          </button>
          {state.customBusinessActive && (
            <span className="text-[10px] font-sans font-semibold text-[var(--accent-safe)] border border-[var(--accent-safe)]/40 rounded-full px-3 py-1 bg-[var(--bg-elevated)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-safe)]" />
              <span>CUSTOM BUSINESS WEIGHTS ACTIVE</span>
            </span>
          )}
        </div>
      </div>

      {/* Full-Width Segmented Pill Toggle */}
      <SegmentedTabs
        activeTab={activeSubTab}
        onChange={setActiveSubTab}
        tabs={[
          {
            id: 'adapter',
            label: '1. Custom Ledger & Model Adapter',
            badge: `${invoiceRows.length} Invoices`,
          },
          {
            id: 'planner',
            label: '2. 6M Working-Capital & Expansion Planner',
            badge: `${horizonMonths}M Horizon`,
          },
        ]}
      />

      {activeSubTab === 'adapter' && (
        /* =================================================================== */
        /* SUB-TAB 1: CUSTOM BUSINESS DATA IMPORT & ADAPTER (FULL WIDTH) */
        /* =================================================================== */
        <div className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-display flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>1. Custom Ledger &amp; Model Adapter</span>
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] font-sans mt-0.5">
                Feeds custom historical default rates into the 6-Source Global Ensemble (374,284 records, 59 features).
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setInputMode('table')}
                className={`px-3 py-1 rounded-full text-[10px] font-sans font-semibold border transition-all duration-150 ${
                  inputMode === 'table'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'
                    : 'border-[var(--border-hairline)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Table Mode
              </button>
              <button
                type="button"
                onClick={() => setInputMode('csv')}
                className={`px-3 py-1 rounded-full text-[10px] font-sans font-semibold border transition-all duration-150 ${
                  inputMode === 'csv'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'
                    : 'border-[var(--border-hairline)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                }`}
              >
                CSV Upload
              </button>
            </div>
          </div>

          {/* Business Context Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                Company Legal Entity Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                Operational Context &amp; Industry Notes
              </label>
              <input
                type="text"
                value={industryNotes}
                onChange={(e) => setIndustryNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
          </div>

          {/* Table Mode */}
          {inputMode === 'table' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-tertiary)]">
                <span>HISTORICAL INVOICES ({invoiceRows.length} RECORDS LOADED)</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInvoiceRows(BENCHMARK_HISTORICAL_INVOICES)}
                    className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Load Demo Sample</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1 font-bold"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Invoice Row</span>
                  </button>
                </div>
              </div>

              <div className="border border-[var(--border-hairline)] bg-[var(--bg-canvas)] overflow-x-auto max-h-[260px]">
                <table className="w-full text-left text-[10px] font-mono border-collapse">
                  <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-hairline)] sticky top-0 text-[var(--text-tertiary)]">
                    <tr>
                      <th className="p-1.5">Counterparty Name</th>
                      <th className="p-1.5 text-right">Amount (₹)</th>
                      <th className="p-1.5 text-center">Terms</th>
                      <th className="p-1.5 text-center">Past Late %</th>
                      <th className="p-1.5 text-center">Avg Delay</th>
                      <th className="p-1.5 text-center">Was Late</th>
                      <th className="p-1.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-hairline)]">
                    {invoiceRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 px-3 text-center text-xs font-sans text-[var(--text-muted)]">
                          No historical invoice records added yet. Click <span className="font-semibold text-[var(--accent-primary)]">Load Demo Preset</span> or <span className="font-semibold text-[var(--text-primary)]">+ Add Row</span> to train a custom counterparty adapter.
                        </td>
                      </tr>
                    ) : null}
                    {invoiceRows.map((r) => (
                      <tr key={r.id} className="hover:bg-[var(--bg-elevated)]/50">
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={r.counterparty_name}
                            onChange={(e) => handleUpdateRow(r.id, { counterparty_name: e.target.value })}
                            className="w-full bg-transparent border-none text-[var(--text-primary)] text-[10px] focus:outline-none"
                          />
                        </td>
                        <td className="p-1.5 text-right">
                          <input
                            type="number"
                            value={r.invoice_amount}
                            onChange={(e) => handleUpdateRow(r.id, { invoice_amount: parseFloat(e.target.value) || 0 })}
                            className="w-20 bg-transparent text-right border-none text-[var(--text-primary)] text-[10px] focus:outline-none tabular-nums"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <input
                            type="number"
                            value={r.payment_term_days}
                            onChange={(e) => handleUpdateRow(r.id, { payment_term_days: parseInt(e.target.value, 10) || 30 })}
                            className="w-10 bg-transparent text-center border-none text-[var(--text-primary)] text-[10px] focus:outline-none tabular-nums"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <input
                            type="number"
                            value={r.past_late_percent}
                            onChange={(e) => handleUpdateRow(r.id, { past_late_percent: parseFloat(e.target.value) || 0 })}
                            className="w-10 bg-transparent text-center border-none text-[var(--text-primary)] text-[10px] focus:outline-none tabular-nums"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <input
                            type="number"
                            value={r.past_avg_delay_days}
                            onChange={(e) => handleUpdateRow(r.id, { past_avg_delay_days: parseFloat(e.target.value) || 0 })}
                            className="w-10 bg-transparent text-center border-none text-[var(--text-primary)] text-[10px] focus:outline-none tabular-nums"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleUpdateRow(r.id, { was_late: !r.was_late })}
                            className={`px-1.5 py-0.5 text-[9px] border transition-colors ${
                              r.was_late
                                ? 'border-[var(--accent-danger)] text-[var(--accent-danger)] font-bold'
                                : 'border-[var(--accent-safe)] text-[var(--accent-safe)]'
                            }`}
                          >
                            {r.was_late ? 'LATE' : 'ON TIME'}
                          </button>
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(r.id)}
                            className="text-[var(--text-tertiary)] hover:text-[var(--accent-danger)]"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CSV Drag and Drop Zone */}
          {inputMode === 'csv' && (
            <div className="border border-dashed border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-6 text-center space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-[var(--accent-primary)] mx-auto opacity-70" />
              <div className="text-xs font-semibold text-[var(--text-primary)] font-mono">
                Drag &amp; Drop Historical Accounts Receivable CSV
              </div>
              <div className="text-[10px] font-mono text-[var(--text-muted)]">
                Required headers: counterparty_name, invoice_amount, payment_term_days, customer_tenure_months, past_late_percent, order_size_vs_avg, past_avg_delay_days, was_late
              </div>
              <label className="inline-block mt-2 px-3 py-1.5 text-xs font-mono border border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] cursor-pointer hover:bg-[var(--accent-primary)]/20 transition-colors">
                <span>Select .CSV File</span>
                <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
              </label>
            </div>
          )}

          {/* Import Button */}
          <button
            type="button"
            onClick={handleImportAndTrain}
            disabled={isImporting || invoiceRows.length === 0}
            className="w-full py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider bg-[var(--accent-primary)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
          >
            <Activity className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
            <span>{isImporting ? 'Ingesting & Training Adapter...' : 'IMPORT & TRAIN CUSTOM ADAPTER ->'}</span>
          </button>

          {/* Result Status Banner */}
          {importResult && (
            <div className="p-3 border border-[var(--accent-safe)] bg-[var(--bg-canvas)] text-xs font-mono space-y-1">
              <div className="flex items-center justify-between text-[var(--accent-safe)] font-bold">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>CUSTOM ADAPTER ACTIVE</span>
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">{importResult.status}</span>
              </div>
              <div className="text-[11px] text-[var(--text-primary)]">{importResult.message}</div>
              <div className="text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-hairline)] flex justify-between">
                <span>Records Ingested: <strong className="text-[var(--text-primary)]">{importResult.records_ingested}</strong></span>
                <span>Counterparties Indexed: <strong className="text-[var(--text-primary)]">{importResult.counterparties_indexed}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'planner' && (
        /* =================================================================== */
        /* SUB-TAB 2: 6-MONTH EXPANSION & SOLVENCY PLANNER (FULL WIDTH) */
        /* =================================================================== */
        <div className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 flex flex-col space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-display flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[var(--accent-safe)]" />
                <span>2. 6M Working-Capital &amp; Expansion Planner</span>
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] font-sans mt-0.5">
                Simulates monthly cash runway factoring in CapEx, collection cycle lag, and payroll burn.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              {[3, 6, 12].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setHorizonMonths(m)}
                  className={`px-3 py-1 rounded-full border transition-all duration-150 ${
                    horizonMonths === m
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold'
                      : 'border-[var(--border-hairline)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {m}M
                </button>
              ))}
            </div>
          </div>

          {/* Business Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                Current Cash (₹)
              </label>
              <input
                type="number"
                step="25000"
                value={currentCash}
                onChange={(e) => setCurrentCash(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1 text-xs font-mono tabular-nums bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] text-right focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                Monthly Revenue (₹)
              </label>
              <input
                type="number"
                step="25000"
                value={monthlyRevenue}
                onChange={(e) => setMonthlyRevenue(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1 text-xs font-mono tabular-nums bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] text-right focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                Monthly Burn (₹)
              </label>
              <input
                type="number"
                step="10000"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1 text-xs font-mono tabular-nums bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] text-right focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                Planned CapEx / Outlay (₹)
              </label>
              <input
                type="number"
                step="25000"
                value={expansionCapEx}
                onChange={(e) => setExpansionCapEx(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1 text-xs font-mono tabular-nums bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] text-right focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block mb-1">
                Collection Cycle (Days)
              </label>
              <input
                type="number"
                min="15"
                max="120"
                step="5"
                value={avgReceivableDays}
                onChange={(e) => setAvgReceivableDays(parseInt(e.target.value, 10) || 45)}
                className="w-full px-2.5 py-1 text-xs font-mono tabular-nums bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-primary)] text-right focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="w-full py-1 px-2 text-xs font-mono font-bold uppercase tracking-wider border border-[var(--accent-safe)] bg-[var(--accent-safe)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {isSimulating ? 'Simulating...' : 'SIMULATE ->'}
              </button>
            </div>
          </div>

          {/* Simulation Summary KPIs */}
          {planResult && (
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
                <div className="text-[9px] uppercase text-[var(--text-tertiary)]">Cash After CapEx</div>
                <div className="font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                  {fmt(planResult.starting_cash_after_capex)}
                </div>
              </div>
              <div className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
                <div className="text-[9px] uppercase text-[var(--text-tertiary)]">Ending Cash ({horizonMonths}M)</div>
                <div
                  className={`font-bold tabular-nums mt-0.5 ${
                    planResult.ending_cash_month_6 > 0 ? 'text-[var(--accent-safe)]' : 'text-[var(--accent-danger)]'
                  }`}
                >
                  {fmt(planResult.ending_cash_month_6)}
                </div>
              </div>
              <div className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
                <div className="text-[9px] uppercase text-[var(--text-tertiary)]">Collection Efficiency</div>
                <div className="font-bold text-[var(--accent-primary)] tabular-nums mt-0.5">
                  {planResult.effective_collection_efficiency_pct}%
                </div>
              </div>
            </div>
          )}

          {/* ECharts Visualization (Full Container Width) */}
          <div className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3">
            <EChartBox option={planChartOption} height={400} title="Monthly Cash-Flow & Solvency Projections" />
          </div>

          {/* Tabular Month Breakdown */}
          {planResult && (
            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-hairline)] sticky top-0 text-[var(--text-tertiary)] font-sans">
                  <tr>
                    <th className="p-2.5">Month</th>
                    <th className="p-2.5 text-right">Projected Cash</th>
                    <th className="p-2.5 text-right">Collected Revenue</th>
                    <th className="p-2.5 text-right">Fixed Outflow</th>
                    <th className="p-2.5 text-center">Solvency Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)]">
                  {planResult.monthly_projection.map((m) => (
                    <tr key={m.month} className="hover:bg-[var(--bg-elevated)]/50">
                      <td className="p-2.5 font-sans font-semibold">Month {m.month}</td>
                      <td className={`p-2.5 text-right tabular-nums ${m.projected_cash < 0 ? 'text-[var(--accent-danger)] font-bold' : ''}`}>
                        {fmt(m.projected_cash)}
                      </td>
                      <td className="p-2.5 text-right tabular-nums text-[var(--accent-safe)]">{fmt(m.collected_revenue)}</td>
                      <td className="p-2.5 text-right tabular-nums text-[var(--accent-warn)]">{fmt(m.fixed_outflow)}</td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full border text-[9px] font-sans font-semibold ${
                            m.solvency_status === 'HEALTHY'
                              ? 'border-[var(--accent-safe)] text-[var(--accent-safe)]'
                              : m.solvency_status === 'TIGHT'
                              ? 'border-[var(--accent-warn)] text-[var(--accent-warn)]'
                              : 'border-[var(--accent-danger)] text-[var(--accent-danger)] font-bold'
                          }`}
                        >
                          {m.solvency_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

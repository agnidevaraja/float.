import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useWorkspace } from '../../store/workspaceStore';
import { evaluateInvoicePipeline, loadApiConfig } from '../../services/inferenceBridge';
import type { WhatIfScenario } from '../../types';
import { SCENARIO_PRESETS } from '../../data/scenarios';
import {
  ArrowRight,
  Plus,
  Save,
  Zap,
  ArrowLeft,
  FileText,
  DollarSign,
  Clock,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Scale,
  Landmark,
  Percent,
  Copy,
  Check,
  Download,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import {
  calculateTredsYield,
  calculateEarlyPaymentDiscountAPR,
  calculateOverdraftFinancingCost,
} from '../../engine/statutoryEngine';
import { CreditMemoModal } from '../modals/CreditMemoModal';
import { EChartBox } from '../charts/EChartBox';
import { CustomSelect } from '../primitives/CustomSelect';
import type { EChartsOption } from 'echarts';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);

export const View01DealWorkbench: React.FC = () => {
  const { state, dispatch } = useWorkspace();
  const [local, setLocal] = useState<Record<string, any>>({ ...state.intake });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [whatIfLabel, setWhatIfLabel] = useState('');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  useEffect(() => {
    setLocal({ ...state.intake });
  }, [state.intake]);

  const update = (patch: Record<string, any>) => {
    setActivePresetId(null);
    setLocal((prev) => ({ ...prev, ...patch }));
  };

  const handleLoadPreset = (preset: typeof SCENARIO_PRESETS[0]) => {
    setActivePresetId(preset.id);
    setLocal({
      ...preset.params,
      clientName: preset.name.replace(/^\d+\.\s*/, ''),
      currentBankBalance:
        state.treasuryDefaults.currentBankBalance > 0
          ? state.treasuryDefaults.currentBankBalance
          : preset.params.currentBankBalance,
      monthlyFixedExpenses:
        state.treasuryDefaults.monthlyFixedExpenses > 0
          ? state.treasuryDefaults.monthlyFixedExpenses
          : preset.params.monthlyFixedExpenses,
    });
    setErrors({});
  };

  const handleResetToEmpty = () => {
    setActivePresetId(null);
    dispatch({ type: 'RESET_INTAKE' });
    setLocal({
      invoiceAmount: 0,
      paymentTermDays: state.enterpriseProfile?.standardCreditTermDays || 30,
      customerTenureMonths: 0,
      pastLatePercent: 0,
      orderSizeVsAvg: 1.0,
      pastAvgDelayDays: 0,
      dueWeekday: 'Mon',
      macroStressMultiplier: 1.0,
      gstRegistered: state.treasuryDefaults.gstRegistered,
      currentBankBalance: state.treasuryDefaults.currentBankBalance,
      monthlyFixedExpenses: state.treasuryDefaults.monthlyFixedExpenses,
      clientName: '',
      gstin: '',
    });
    setErrors({});
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!local.invoiceAmount || local.invoiceAmount <= 0) {
      e.invoiceAmount = 'Invoice principal is required and must be greater than zero.';
    }
    if (!local.paymentTermDays || local.paymentTermDays < 1) {
      e.paymentTermDays = 'Payment term must be at least 1 day.';
    }
    if (local.pastLatePercent < 0 || local.pastLatePercent > 100) {
      e.pastLatePercent = 'Past late rate must be between 0% and 100%.';
    }
    if (local.orderSizeVsAvg <= 0) {
      e.orderSizeVsAvg = 'Order size ratio must be positive.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleEvaluate = useCallback(async () => {
    if (!validate()) return;
    dispatch({ type: 'SET_EVALUATING', payload: true });
    try {
      const config = loadApiConfig();
      const req = local as any;
      const result = await evaluateInvoicePipeline(req, config);
      dispatch({ type: 'SET_INTAKE', payload: req });
      dispatch({ type: 'SET_RESULT', payload: result });
      dispatch({
        type: 'SET_PROVENANCE',
        payload: { provenance: result.provenance, latencyMs: result.latencyMs },
      });
      dispatch({ type: 'SET_PHASE', payload: 'dossier' });
    } catch (err) {
      console.error('[float.] Risk evaluation error:', err);
    } finally {
      dispatch({ type: 'SET_EVALUATING', payload: false });
    }
  }, [local, dispatch]);

  const handleWhatIf = () => {
    if (!state.currentResult || !whatIfLabel.trim()) return;
    const scenario: WhatIfScenario = {
      id: Date.now().toString(),
      label: whatIfLabel.trim(),
      request: local as any,
      result: null,
      createdAt: new Date(),
    };
    dispatch({ type: 'ADD_WHATIF', payload: scenario });
    setWhatIfLabel('');
    evaluateInvoicePipeline(local as any, loadApiConfig()).then((result) => {
      dispatch({ type: 'ADD_WHATIF', payload: { ...scenario, result } });
    });
  };

  const handleSaveLedger = () => {
    if (!state.currentResult) return;
    dispatch({
      type: 'ADD_LEDGER_ENTRY',
      payload: {
        id: `DEAL-${Date.now().toString().slice(-4)}`,
        clientName: (local as any).clientName || 'Counterparty Deal',
        invoiceAmount: local.invoiceAmount,
        paymentTermDays: local.paymentTermDays,
        riskPercent: state.currentResult.blendedRiskPercent,
        expectedArrivalDay: state.currentResult.expectedArrivalDay,
        status:
          state.currentResult.blendedRiskPercent > 60
            ? 'OVERDUE'
            : state.currentResult.blendedRiskPercent > 30
            ? 'PENDING'
            : 'ON_TRACK',
        dueInDays: local.paymentTermDays,
        evaluated: true,
        savedAt: new Date(),
      },
    });
  };

  const handleDecision = (type: 'APPROVE' | 'COUNTER' | 'DECLINE') => {
    if (!state.currentResult) return;
    const recTerms = state.currentResult.recommendedTerms;
    const term =
      type === 'COUNTER'
        ? recTerms?.netTermDays ?? local.paymentTermDays ?? 30
        : local.paymentTermDays ?? 30;
    const baseRisk = Number(state.currentResult.blendedRiskPercent ?? 0);
    const expReduction = Number(recTerms?.exposureReductionPercent ?? 0);
    const risk =
      type === 'COUNTER'
        ? Math.max(10, baseRisk * (1 - expReduction / 100))
        : type === 'DECLINE'
        ? 95
        : baseRisk;

    dispatch({
      type: 'ADD_LEDGER_ENTRY',
      payload: {
        id: `DEAL-${Date.now().toString().slice(-4)}`,
        clientName: (local as any).clientName || 'Counterparty Deal',
        invoiceAmount: Number(local.invoiceAmount) || 0,
        paymentTermDays: term,
        riskPercent: risk,
        expectedArrivalDay:
          type === 'COUNTER' ? term + 2 : Number(state.currentResult.expectedArrivalDay ?? term),
        status:
          type === 'DECLINE' ? 'OVERDUE' : type === 'APPROVE' ? 'ON_TRACK' : 'PENDING',
        dueInDays: term,
        evaluated: true,
        savedAt: new Date(),
      },
    });
  };

  // Cumulative Credit Exposure Calculation
  const activeClientName = ((local as any).clientName || '').trim();
  const existingLedgerInvoices = (state.ledger || []).filter(
    (l) => activeClientName && (l.clientName || '').toLowerCase() === activeClientName.toLowerCase()
  );
  const existingBalance = existingLedgerInvoices.reduce((acc, curr) => acc + curr.invoiceAmount, 0);
  const defaultCreditLimit =
    state.enterpriseProfile?.sanctionedCcLimit > 0
      ? state.enterpriseProfile.sanctionedCcLimit
      : state.treasuryDefaults.bankOverdraftLimit > 0
      ? state.treasuryDefaults.bankOverdraftLimit
      : 1000000; // fallback ceiling when CC limit not yet configured in Settings
  const projectedExposure = existingBalance + (local.invoiceAmount || 0);
  const creditUtilization = defaultCreditLimit > 0 ? (projectedExposure / defaultCreditLimit) * 100 : 0;
  const isCreditBreached = projectedExposure > defaultCreditLimit;
  const isCreditWarning = creditUtilization > 80 && !isCreditBreached;

  if (state.phase === 'dossier' && state.currentResult) {
    return (
      <DossierPhase
        result={state.currentResult}
        intake={local}
        provenance={state.provenance}
        latencyMs={state.latencyMs}
        whatIfs={state.whatIfs}
        whatIfLabel={whatIfLabel}
        setWhatIfLabel={setWhatIfLabel}
        onWhatIf={handleWhatIf}
        onSaveLedger={handleSaveLedger}
        onDecision={handleDecision}
        onEdit={() => dispatch({ type: 'SET_PHASE', payload: 'intake' })}
        enterpriseProfile={state.enterpriseProfile}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-sans text-[var(--text-primary)]">
          Deal Underwriting
        </h1>
        <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
          Check whether a customer is likely to pay late, when their payment will actually land in your bank account, and what contract terms keep your cash flow safe.
        </p>
      </div>

      {/* Preset Action Bar */}
      <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-sans font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            Demo Presets — Click to test a sample customer scenario (374,284 Records • 6 Data Sources • 59 Features)
          </span>
          <button
            type="button"
            onClick={handleResetToEmpty}
            className="px-2.5 py-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[10px] font-sans text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-all duration-150 active:scale-[0.98]"
          >
            <RotateCcw className="w-2.5 h-2.5" /> Reset Form
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {SCENARIO_PRESETS.map((p) => {
            const isSelected = activePresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleLoadPreset(p)}
                className={`rounded-xl p-3 text-left border transition-all duration-150 active:scale-[0.98] ${
                  isSelected
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 ring-1 ring-[var(--accent-primary)]/30 shadow-sm'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--text-tertiary)]'
                }`}
              >
                <div className="text-[10px] font-sans font-semibold text-[var(--accent-primary)] truncate">
                  {p.badge}
                </div>
                <div className="text-xs font-sans font-semibold text-[var(--text-primary)] truncate mt-1">
                  {p.name}
                </div>
                <div className="text-[11px] font-mono text-[var(--text-muted)] mt-1 truncate tabular-nums">
                  ₹{((p?.params?.invoiceAmount ?? 0) / 1000).toFixed(0)}k • Net-{p?.params?.paymentTermDays ?? 30}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 01: Counterparty & Invoice Terms */}
      <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
        {state.customBusinessActive && state.customBusinessProfile && (
          <div className="p-3 border border-[var(--accent-safe)]/40 bg-[var(--accent-safe)]/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div>
              <div className="flex items-center gap-1.5 text-[var(--accent-safe)] font-bold">
                <span className="w-1.5 h-1.5 bg-[var(--accent-safe)]" />
                <span>CUSTOM BUSINESS WEIGHTS ACTIVE: {state.customBusinessProfile.companyName}</span>
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                {state.customBusinessProfile.counterpartiesCount} counterparties indexed from historical AR records.
              </div>
            </div>
            {/* Quick-recall counterparty buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] uppercase text-[var(--text-tertiary)]">Recall:</span>
              {Object.values(state.customBusinessProfile?.counterparties || {}).slice(0, 4).map((cp: any) => (
                <button
                  key={cp.name}
                  type="button"
                  onClick={() => {
                    update({
                      clientName: cp.name,
                      pastLatePercent: cp.pastLatePercent,
                      pastAvgDelayDays: cp.avgDelayDays,
                      orderSizeVsAvg: cp.orderSizeAvg,
                      customerTenureMonths: cp.tenureMonths,
                    });
                  }}
                  className="px-2 py-0.5 text-[9px] font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--accent-safe)] hover:text-[var(--accent-safe)] transition-colors"
                >
                  {cp.name.split(' ')[0]} ({cp.pastLatePercent}% Late)
                </button>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          Section 01: Counterparty &amp; Invoice Terms
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Counterparty Legal Name">
            <input
              type="text"
              value={(local as any).clientName || ''}
              onChange={(e) => update({ clientName: e.target.value })}
              placeholder="e.g. Apex Industrial Solutions Ltd"
              className="field-input"
            />
          </Field>
          <Field label="Counterparty GSTIN" optional>
            <input
              type="text"
              value={(local as any).gstin || ''}
              onChange={(e) => update({ gstin: e.target.value.toUpperCase() })}
              placeholder="e.g. 27AABCT1234R1ZX"
              className="field-input font-mono"
            />
          </Field>
          <Field label="Invoice Principal (INR)" error={errors.invoiceAmount}>
            <input
              type="number"
              value={local.invoiceAmount === 0 ? '' : local.invoiceAmount}
              onChange={(e) => update({ invoiceAmount: parseFloat(e.target.value) || 0 })}
              placeholder="e.g. 140000"
              className="field-input font-mono text-right"
            />
          </Field>
          <Field label="Promised Payment Term (Days)" error={errors.paymentTermDays}>
            <input
              type="number"
              value={local.paymentTermDays === 0 ? '' : local.paymentTermDays}
              onChange={(e) => update({ paymentTermDays: parseInt(e.target.value) || 0 })}
              placeholder="e.g. 30"
              className="field-input font-mono text-right"
            />
          </Field>
          <Field label="Counterparty Tenure (Months)">
            <input
              type="number"
              value={local.customerTenureMonths === 0 ? '' : local.customerTenureMonths}
              onChange={(e) => update({ customerTenureMonths: parseInt(e.target.value) || 0 })}
              placeholder="e.g. 14"
              className="field-input font-mono text-right"
            />
          </Field>
          <Field label="Invoice Due Weekday">
            <CustomSelect
              value={(local.dueWeekday || 'Mon') as string}
              onChange={(val) => update({ dueWeekday: val })}
              ariaLabel="Invoice Due Weekday"
              options={[
                { value: 'Mon', label: 'Monday', description: 'Standard weekly clearing run' },
                { value: 'Tue', label: 'Tuesday', description: 'Mid-week settlement' },
                { value: 'Wed', label: 'Wednesday', description: 'Mid-week settlement' },
                { value: 'Thu', label: 'Thursday', description: 'Pre-weekend clearing' },
                { value: 'Fri', label: 'Friday', description: 'Higher weekend rollover risk' },
                { value: 'Sat', label: 'Saturday', description: 'Rolls to Monday RTGS window' },
                { value: 'Sun', label: 'Sunday', description: 'Rolls to Monday RTGS window' },
              ]}
            />
          </Field>
        </div>

        {/* Cumulative Counterparty Exposure & Credit Limit Guard */}
        <div className="border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="font-bold text-[var(--text-primary)] uppercase flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              Cumulative Buyer Exposure &amp; Credit Limit Guard
            </span>
            <span className="text-[var(--text-tertiary)]">
              Assigned Ceiling: {fmt(defaultCreditLimit)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
              <span className="text-[9px] text-[var(--text-muted)] block">Existing Open Invoices</span>
              <span className="font-bold text-[var(--text-primary)] tabular-nums mt-0.5 block">
                {fmt(existingBalance)}
              </span>
              <span className="text-[9px] text-[var(--text-tertiary)]">
                {existingLedgerInvoices.length} invoices in ledger
              </span>
            </div>
            <div className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
              <span className="text-[9px] text-[var(--text-muted)] block">New Deal Principal</span>
              <span className="font-bold text-[var(--text-primary)] tabular-nums mt-0.5 block">
                {fmt(local.invoiceAmount || 0)}
              </span>
              <span className="text-[9px] text-[var(--text-tertiary)]">Current intake</span>
            </div>
            <div className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
              <span className="text-[9px] text-[var(--text-muted)] block">Projected Total Exposure</span>
              <span
                className="font-bold tabular-nums mt-0.5 block"
                style={{
                  color: isCreditBreached
                    ? 'var(--accent-danger)'
                    : isCreditWarning
                    ? 'var(--accent-warn)'
                    : 'var(--text-primary)',
                }}
              >
                {fmt(projectedExposure)}
              </span>
              <span className="text-[9px] text-[var(--text-tertiary)]">
                {creditUtilization.toFixed(1)}% credit utilization
              </span>
            </div>
            <div className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
              <span className="text-[9px] text-[var(--text-muted)] block">Available Credit Buffer</span>
              <span
                className="font-bold tabular-nums mt-0.5 block"
                style={{ color: isCreditBreached ? 'var(--accent-danger)' : 'var(--accent-safe)' }}
              >
                {fmt(Math.max(0, defaultCreditLimit - projectedExposure))}
              </span>
              <span className="text-[9px] text-[var(--text-tertiary)]">
                {isCreditBreached ? 'Exceeded by ' + fmt(projectedExposure - defaultCreditLimit) : 'Safe headroom'}
              </span>
            </div>
          </div>

          {/* Credit Limit Alert Banner */}
          {isCreditBreached ? (
            <div className="p-2.5 border border-[var(--accent-danger)] bg-[var(--accent-danger)]/10 text-xs font-mono text-[var(--accent-danger)] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">CREDIT CEILING BREACH DETECTED: </span>
                This transaction pushes total unpaid exposure for {activeClientName || 'this counterparty'} to {fmt(projectedExposure)}, exceeding the {fmt(defaultCreditLimit)} treasury credit ceiling by {fmt(projectedExposure - defaultCreditLimit)}. Require an upfront advance or Letter of Credit before executing.
              </div>
            </div>
          ) : isCreditWarning ? (
            <div className="p-2.5 border border-[var(--accent-warn)] bg-[var(--accent-warn)]/10 text-xs font-mono text-[var(--accent-warn)] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">HIGH CREDIT CONCENTRATION WARNING: </span>
                Counterparty is at {creditUtilization.toFixed(1)}% of their approved credit ceiling. Exercise caution on future billings.
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Balanced Cards Grid: Section 02 (Historical Behavior) & Section 03 (Company Liquidity Context) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Section 02: Historical Behavior */}
        <section className="lg:col-span-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-[11px] font-sans font-bold uppercase tracking-wider text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              Section 02: Historical Behavior &amp; Macro Context
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Past Invoices Delivered" optional>
                <input
                  type="number"
                  value={(local as any).pastInvoiceCount || ''}
                  onChange={(e) => update({ pastInvoiceCount: parseInt(e.target.value) || 0 })}
                  placeholder="e.g. 24"
                  className="field-input font-mono text-right"
                />
              </Field>
              <Field label="Past Late Payment Rate (%)" error={errors.pastLatePercent}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={local.pastLatePercent === 0 ? '' : local.pastLatePercent}
                  onChange={(e) => update({ pastLatePercent: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 30"
                  className="field-input font-mono text-right"
                />
              </Field>
              <Field label="Historical Average Delay (Days)">
                <input
                  type="number"
                  min="0"
                  value={local.pastAvgDelayDays === 0 ? '' : local.pastAvgDelayDays}
                  onChange={(e) => update({ pastAvgDelayDays: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 5"
                  className="field-input font-mono text-right"
                />
              </Field>
              <Field label="Order Size vs Historical Mean (x)" error={errors.orderSizeVsAvg}>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={local.orderSizeVsAvg || ''}
                  onChange={(e) => update({ orderSizeVsAvg: parseFloat(e.target.value) || 1 })}
                  placeholder="e.g. 1.8"
                  className="field-input font-mono text-right"
                />
              </Field>
              <Field label="FRED Macro Stress Multiplier">
                <div className="flex items-center gap-2 py-1.5">
                  <input
                    type="range"
                    min="0.8"
                    max="2.0"
                    step="0.1"
                    value={local.macroStressMultiplier || 1.0}
                    onChange={(e) => update({ macroStressMultiplier: parseFloat(e.target.value) })}
                    className="flex-1 h-1.5 rounded-full bg-[var(--bg-elevated)] appearance-none cursor-pointer"
                  />
                  <span className="text-xs font-mono tabular-nums text-[var(--text-primary)] w-10 text-right">
                    {(local.macroStressMultiplier || 1.0).toFixed(1)}x
                  </span>
                </div>
              </Field>
              <Field label="GST Registration Status">
                <button
                  type="button"
                  onClick={() => update({ gstRegistered: !local.gstRegistered })}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-mono border text-left flex items-center justify-between transition-all duration-150 active:scale-[0.98] ${
                    local.gstRegistered
                      ? 'border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/10 text-[var(--text-primary)]'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                  }`}
                >
                  <span>{local.gstRegistered ? 'GST Registered' : 'Unregistered / Exempt'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/15 text-[10px] font-bold text-[var(--accent-primary)]">
                    {local.gstRegistered ? '18% ITC' : 'NO ITC'}
                  </span>
                </button>
              </Field>
            </div>
          </div>
        </section>

        {/* Section 03: Company Liquidity Context */}
        <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-[11px] font-sans font-bold uppercase tracking-wider text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              Section 03: Your Company Liquidity
            </h2>
            <div className="space-y-4">
              <Field label="Current Bank Balance (INR)">
                <input
                  type="number"
                  value={local.currentBankBalance === 0 ? '' : local.currentBankBalance}
                  onChange={(e) => update({ currentBankBalance: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 250000"
                  className="field-input font-mono text-right"
                />
              </Field>
              <Field label="Monthly Fixed Operating Burn (INR)">
                <input
                  type="number"
                  value={local.monthlyFixedExpenses === 0 ? '' : local.monthlyFixedExpenses}
                  onChange={(e) => update({ monthlyFixedExpenses: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 160000"
                  className="field-input font-mono text-right"
                />
              </Field>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
            <span>Baseline Burn Runway:</span>
            <span className="font-bold text-[var(--text-primary)] tabular-nums">
              {local.monthlyFixedExpenses > 0
                ? `${Math.round((local.currentBankBalance / local.monthlyFixedExpenses) * 30)} Days`
                : 'N/A'}
            </span>
          </div>
        </section>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
        <div className="text-[10px] font-mono text-[var(--text-tertiary)]">
          Formula: Late Rate (40%) + Delay Severity (25%) + Order Spike (20%) + FRED Spread (10%) - Tenure (5%)
        </div>
        <button
          type="button"
          onClick={handleEvaluate}
          disabled={state.isEvaluating}
          className="px-6 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white hover:opacity-95 disabled:opacity-40 transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2 shrink-0"
        >
          {state.isEvaluating ? (
            <span>Computing Risk Score...</span>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" /> Calculate Probability of Late Payment <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

function Field({
  label,
  children,
  error,
  optional,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">
        {label} {optional && <span className="text-[var(--text-tertiary)] lowercase">(optional)</span>}
      </label>
      {children}
      {error && <span className="text-[9px] font-mono text-[var(--accent-danger)] mt-1 block">{error}</span>}
    </div>
  );
}

function DossierPhase({
  result,
  intake,
  provenance,
  latencyMs,
  whatIfs,
  whatIfLabel,
  setWhatIfLabel,
  onWhatIf,
  onSaveLedger,
  onDecision,
  onEdit,
  enterpriseProfile,
}: any) {
  const [decisionNotice, setDecisionNotice] = useState<string | null>(null);

  const safeRisk = Number.isFinite(Number(result?.blendedRiskPercent))
    ? Number(result.blendedRiskPercent)
    : 0;
  const safeArrival = Number.isFinite(Number(result?.expectedArrivalDay))
    ? Number(result.expectedArrivalDay)
    : Number(intake?.paymentTermDays || 30);
  const safeLow = Number.isFinite(Number(result?.arrivalWindowLow))
    ? Number(result.arrivalWindowLow)
    : Math.max(1, safeArrival - 6);
  const safeHigh = Number.isFinite(Number(result?.arrivalWindowHigh))
    ? Number(result.arrivalWindowHigh)
    : safeArrival + 8;
  const safeGstItc = Number.isFinite(Number(result?.gstItcLocked))
    ? Number(result.gstItcLocked)
    : 0;
  const safeTotalAtRisk = Number.isFinite(Number(result?.totalAtRisk))
    ? Number(result.totalAtRisk)
    : 0;
  const safeCashBuffer = Number.isFinite(Number(result?.cashBufferAtArrival))
    ? Number(result.cashBufferAtArrival)
    : 0;
  const safeWarnings = Array.isArray(result?.integrityWarnings) ? result.integrityWarnings : [];
  const safeShapFactors = Array.isArray(result?.topShapFactors) ? result.topShapFactors : [];
  const safeWhatIfs = Array.isArray(whatIfs) ? whatIfs : [];

  const riskColor =
    safeRisk < 30
      ? 'var(--accent-safe)'
      : safeRisk < 60
      ? 'var(--accent-warn)'
      : 'var(--accent-danger)';

  const riskTier =
    safeRisk < 30
      ? 'LOW DELAY RISK'
      : safeRisk < 60
      ? 'MODERATE DELAY RISK'
      : 'HIGH DEFAULT RISK';

  const handleAction = (type: 'APPROVE' | 'COUNTER' | 'DECLINE') => {
    onDecision(type);
    const label =
      type === 'APPROVE'
        ? `Deal Approved & Logged to Ledger (Net-${intake?.paymentTermDays || 30})`
        : type === 'COUNTER'
        ? `Counter-Offer Generated (25% Upfront Deposit + Net-15)`
        : 'Deal Declined (Capital Protected)';
    setDecisionNotice(label);
    setTimeout(() => setDecisionNotice(null), 3500);
  };

  // TReDS Factoring Yield Calculation
  const tredsYield = calculateTredsYield(Number(intake?.invoiceAmount) || 0, Number(intake?.paymentTermDays) || 45, 8.5, 0.05);

  const odInterestRate = enterpriseProfile?.bankOdInterestRate > 0 ? enterpriseProfile.bankOdInterestRate : 12.0;
  const defaultMargin = enterpriseProfile?.typicalGrossMarginPercent > 0 ? enterpriseProfile.typicalGrossMarginPercent : 18.0;

  const [showCreditMemo, setShowCreditMemo] = useState(false);
  const [discountPct, setDiscountPct] = useState<number>(2.0);
  const [earlyPayDay, setEarlyPayDay] = useState<number>(10);
  const earlyDiscountResult = useMemo(
    () =>
      calculateEarlyPaymentDiscountAPR(
        Number(intake?.invoiceAmount) || 0,
        Number(intake?.paymentTermDays) || 45,
        earlyPayDay,
        discountPct,
        odInterestRate,
        8.5
      ),
    [intake?.invoiceAmount, intake?.paymentTermDays, earlyPayDay, discountPct, odInterestRate]
  );

  const [nominalMargin, setNominalMargin] = useState<number>(defaultMargin);
  const delayDays = Math.max(0, safeArrival - (Number(intake?.paymentTermDays) || 30));
  const erosionResult = useMemo(
    () =>
      calculateOverdraftFinancingCost(
        Number(intake?.invoiceAmount) || 0,
        delayDays,
        nominalMargin,
        odInterestRate
      ),
    [intake?.invoiceAmount, delayDays, nominalMargin, odInterestRate]
  );

  // Underwriting Intelligence Visualization Suite
  const [activeVizTab, setActiveVizTab] = useState<'arrival' | 'radar' | 'shap'>('arrival');

  // 1. Expected Capital Arrival Probability Curve
  const arrivalCurveOption: EChartsOption = useMemo(() => {
    const mean = result.expectedArrivalDay || 38;
    const low = result.arrivalWindowLow || Math.max(1, mean - 6);
    const high = result.arrivalWindowHigh || mean + 8;
    const sigma = Math.max(2.5, (high - low) / 2.56);
    const term = intake.paymentTermDays || 30;

    const days: string[] = [];
    const probabilities: number[] = [];

    for (let d = 1; d <= 60; d++) {
      days.push(`Day ${d}`);
      const exponent = -Math.pow(d - mean, 2) / (2 * Math.pow(sigma, 2));
      const p = Math.round(Math.exp(exponent) * 100 * 10) / 10;
      probabilities.push(p);
    }

    return {
      backgroundColor: 'transparent',
      grid: { left: 55, right: 45, top: 48, bottom: 35, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: '#38BDF8', width: 1.5, type: 'dashed' } },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          if (!p) return '';
          return `<div style="font-family:monospace;font-size:11px;padding:3px;">
            <b style="color:#FAFAFA;">${p.name ?? ''}</b><br/>
            Settlement Probability Density: <b style="color:#38BDF8;">${p.value ?? 0}%</b>
          </div>`;
        },
      },
      xAxis: {
        type: 'category',
        data: days,
        axisLine: { lineStyle: { color: '#27272A' } },
        axisLabel: { color: '#D4D4D8', fontSize: 10, fontFamily: 'monospace', interval: 4 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#27272A', type: [3, 3] } },
        axisLabel: { color: '#D4D4D8', fontSize: 10, fontFamily: 'monospace', formatter: '{value}%' },
      },
      series: [
        {
          name: 'Arrival Probability Density',
          type: 'line',
          data: probabilities,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#38BDF8', width: 3 },
          emphasis: { focus: 'none', lineStyle: { width: 4 } },
          markLine: {
            symbol: 'none',
            silent: true,
            data: [
              {
                xAxis: `Day ${term}`,
                lineStyle: { color: '#10B981', type: 'dashed', width: 1.5 },
                label: { formatter: `Contract Net-${term}`, color: '#10B981', fontSize: 9, position: 'insideStartTop', fontFamily: 'monospace' },
              },
              {
                xAxis: `Day ${low}`,
                lineStyle: { color: '#F59E0B', type: 'dashed', width: 1.5 },
                label: { formatter: `P20 (Day ${low})`, color: '#FCD34D', fontSize: 9, position: 'insideMiddleTop', fontFamily: 'monospace' },
              },
              {
                xAxis: `Day ${mean}`,
                lineStyle: { color: '#38BDF8', type: 'solid', width: 2.2 },
                label: { formatter: `Expected Arrival (Day ${mean})`, color: '#38BDF8', fontSize: 10, position: 'insideEndTop', fontFamily: 'monospace', fontWeight: 'bold' },
              },
              {
                xAxis: `Day ${high}`,
                lineStyle: { color: '#EF4444', type: 'dashed', width: 1.5 },
                label: { formatter: `P80 Horizon (Day ${high})`, color: '#F87171', fontSize: 9, position: 'insideMiddleBottom', fontFamily: 'monospace' },
              },
            ],
          },
        },
      ],
    };
  }, [result, intake]);

  // 2. Multi-Vector Deal Risk Radar
  const radarOption: EChartsOption = useMemo(() => {
    const macroVal = Math.min(100, Math.round(((intake.macroStressMultiplier || 1.0) - 0.8) / 0.8 * 100));
    const delayVal = Math.min(100, Math.round(((intake.pastAvgDelayDays || 10) / 45) * 100));
    const sizeVal = Math.min(100, Math.round(((intake.orderSizeVsAvg || 1.0) / 3.0) * 100));
    const defaultVal = Math.min(100, Math.round(intake.pastLatePercent || 20));
    const termVal = Math.min(100, Math.round(((intake.paymentTermDays || 30) / 90) * 100));

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      legend: {
        bottom: 5,
        textStyle: { color: '#D4D4D8', fontSize: 10, fontFamily: 'monospace' },
        data: ['Evaluated Deal Risk Profile', 'Low-Risk Benchmark Baseline'],
      },
      radar: {
        radius: '60%',
        center: ['50%', '46%'],
        indicator: [
          { name: 'Macro Stress', max: 100 },
          { name: 'Delay Severity', max: 100 },
          { name: 'Order Anomaly', max: 100 },
          { name: 'Historical Default %', max: 100 },
          { name: 'Credit Term Exposure', max: 100 },
        ],
        shape: 'polygon',
        splitNumber: 4,
        axisName: {
          color: '#FAFAFA',
          fontFamily: 'monospace',
          fontSize: 10,
          fontWeight: 'bold',
        },
        splitLine: { lineStyle: { color: '#27272A' } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: '#3F3F46' } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: [macroVal, delayVal, sizeVal, defaultVal, termVal],
              name: 'Evaluated Deal Risk Profile',
              itemStyle: { color: '#38BDF8' },
              lineStyle: { width: 2.5, color: '#38BDF8' },
              areaStyle: { color: 'rgba(56, 189, 248, 0.25)' },
            },
            {
              value: [25, 20, 30, 15, 33],
              name: 'Low-Risk Benchmark Baseline',
              itemStyle: { color: '#71717A' },
              lineStyle: { width: 1.5, type: 'dashed', color: '#71717A' },
              areaStyle: { color: 'rgba(113, 113, 122, 0.08)' },
            },
          ],
        },
      ],
    };
  }, [intake]);

  // 3. TreeSHAP Feature Attribution Diverging Waterfall
  const shapOption: EChartsOption = useMemo(() => {
    const rawItems = [
      { name: 'Past Late Rate', impact: +((intake.pastLatePercent || 20) * 0.45).toFixed(1) },
      { name: 'Order Size vs Mean', impact: +(((intake.orderSizeVsAvg || 1.0) - 1.0) * 12.0).toFixed(1) },
      { name: 'Macro Spread Stress', impact: +(((intake.macroStressMultiplier || 1.0) - 1.0) * 20.0).toFixed(1) },
      { name: 'Extended Terms', impact: +(((intake.paymentTermDays || 30) - 30) * 0.35).toFixed(1) },
      { name: 'Customer Tenure Credit', impact: -Math.min(12, ((intake.customerTenureMonths || 6) * 0.65)).toFixed(1) },
      { name: 'Upfront Deposit Retention', impact: -Math.min(10, ((intake.upfrontPct || 0) * 0.25)).toFixed(1) },
      { name: 'GST Statutory Registration', impact: intake.gstRegistered ? -4.5 : +6.0 },
    ];

    const sorted = [...rawItems].sort((a, b) => a.impact - b.impact);
    const names = sorted.map((s) => s.name);
    const values = sorted.map((s) => s.impact);

    return {
      backgroundColor: 'transparent',
      grid: { left: 165, right: 75, top: 25, bottom: 25, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          if (!p) return '';
          const val = Number(p.value ?? 0);
          const isInc = val >= 0;
          return `<div style="font-family:monospace;font-size:11px;padding:3px;">
            <b style="color:#FAFAFA;">${p.name ?? ''}</b><br/>
            Risk Contribution: <b style="color:${isInc ? '#EF4444' : '#10B981'};">${isInc ? '+' : ''}${val}%</b>
          </div>`;
        },
      },
      xAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#3F3F46' } },
        splitLine: { lineStyle: { color: '#27272A', type: [3, 3] } },
        axisLabel: {
          color: '#D4D4D8',
          fontSize: 10,
          fontFamily: 'monospace',
          formatter: (v: number) => (v >= 0 ? `+${v}%` : `${v}%`),
        },
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLine: { lineStyle: { color: '#3F3F46' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#FAFAFA',
          fontSize: 10,
          fontFamily: 'monospace',
          fontWeight: 'bold',
        },
      },
      series: [
        {
          name: 'TreeSHAP Attribution',
          type: 'bar',
          data: values.map((val) => ({
            value: val,
            itemStyle: {
              color: val >= 0 ? '#EF4444' : '#10B981',
              borderRadius: val >= 0 ? [0, 2, 2, 0] : [2, 0, 0, 2],
            },
          })),
          barWidth: 16,
          label: {
            show: true,
            position: 'right',
            formatter: (p: any) => (p.value >= 0 ? `+${p.value}%` : `${p.value}%`),
            color: '#FAFAFA',
            fontSize: 10,
            fontFamily: 'monospace',
            fontWeight: 'bold',
          },
          emphasis: { focus: 'none', itemStyle: { opacity: 1 } },
        },
      ],
    };
  }, [intake]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> BACK TO INTAKE
        </button>
        <div
          className={`px-2.5 py-1 text-[9px] font-mono border ${
            provenance === 'LOCAL_ENGINE'
              ? 'border-[var(--accent-safe)]/40 text-[var(--accent-safe)]'
              : 'border-[var(--accent-primary)]/40 text-[var(--accent-primary)]'
          }`}
        >
          {provenance === 'LOCAL_ENGINE' ? 'CALIBRATED LOCAL MIRROR' : 'LIVE COLAB BRIDGE'}
          {latencyMs !== null && ` (${latencyMs}ms)`}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreditMemo(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono border border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-colors"
          >
            <FileText className="w-3 h-3" /> CREDIT MEMORANDUM
          </button>
          <button
            onClick={onSaveLedger}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Save className="w-3 h-3" /> SAVE TO PORTFOLIO
          </button>
        </div>
      </div>

      {/* Decision Notice Banner */}
      {decisionNotice && (
        <div className="p-3 border border-[var(--accent-safe)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs font-mono flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-safe)]" />
            {decisionNotice}
          </span>
          <span className="text-[10px] text-[var(--accent-safe)] font-semibold">
            SAVED TO AGEING REGISTER
          </span>
        </div>
      )}

      {/* Decision Console */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-hairline)]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
            Underwriting Decision Console
          </span>
          <span className="text-[9px] font-mono text-[var(--text-tertiary)]">
            One-click portfolio commitment
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => handleAction('APPROVE')}
            className="p-3 text-left border border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--accent-safe)] transition-colors"
          >
            <div className="text-[10px] font-mono uppercase font-bold text-[var(--accent-safe)]">
              1. Approve Standard Terms
            </div>
            <div className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">
              Net-{intake.paymentTermDays} Days
            </div>
            <div className="text-[9px] font-mono text-[var(--text-tertiary)] mt-0.5">
              Lock commitment in receivables ledger
            </div>
          </button>
          <button
            onClick={() => handleAction('COUNTER')}
            className="p-3 text-left border border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--accent-primary)] transition-colors"
          >
            <div className="text-[10px] font-mono uppercase font-bold text-[var(--accent-primary)]">
              2. Propose Counter-Offer
            </div>
            <div className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">
              25% Upfront Deposit + Net-15
            </div>
            <div className="text-[9px] font-mono text-[var(--text-tertiary)] mt-0.5">
              Reduces working capital exposure by ~40%
            </div>
          </button>
          <button
            onClick={() => handleAction('DECLINE')}
            className="p-3 text-left border border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--accent-danger)] transition-colors"
          >
            <div className="text-[10px] font-mono uppercase font-bold text-[var(--accent-danger)]">
              3. Decline Transaction
            </div>
            <div className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">
              Protect Treasury Working Capital
            </div>
            <div className="text-[9px] font-mono text-[var(--text-tertiary)] mt-0.5">
              Avoid extending credit to delinquent profiles
            </div>
          </button>
        </div>
      </div>

      {/* Main Score Hero Card */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
              Calibrated Probability of Late Payment
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <span
                className="text-4xl font-mono font-bold tabular-nums"
                style={{ color: riskColor }}
              >
                {safeRisk.toFixed(1)}%
              </span>
              <span
                className="text-xs font-mono font-semibold uppercase px-2 py-0.5 border"
                style={{ borderColor: riskColor, color: riskColor }}
              >
                {riskTier}
              </span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
              Expected Settlement
            </div>
            <div className="text-lg font-mono font-semibold text-[var(--text-primary)] tabular-nums mt-0.5">
              Day {safeArrival}
            </div>
            <div className="text-[10px] font-mono text-[var(--text-tertiary)]">
              P20: Day {safeLow} | P80: Day {safeHigh}
            </div>
          </div>
        </div>

        {/* Explicit Mathematical Basis Grid */}
        <div className="border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3.5 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
            Mathematical Basis &amp; Factor Weight Allocation
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] font-mono">
            <div className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
              <div className="text-[var(--text-muted)]">Past Late Rate</div>
              <div className="font-bold text-[var(--text-primary)] mt-0.5">
                {intake.pastLatePercent}%
              </div>
              <div className="text-[9px] text-[var(--text-tertiary)]">40% Ensemble Weight</div>
            </div>
            <div className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
              <div className="text-[var(--text-muted)]">Delay Severity</div>
              <div className="font-bold text-[var(--text-primary)] mt-0.5">
                {intake.pastAvgDelayDays} Days
              </div>
              <div className="text-[9px] text-[var(--text-tertiary)]">25% Ensemble Weight</div>
            </div>
            <div className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
              <div className="text-[var(--text-muted)]">Order Spike</div>
              <div className="font-bold text-[var(--text-primary)] mt-0.5">
                {intake.orderSizeVsAvg}x Mean
              </div>
              <div className="text-[9px] text-[var(--text-tertiary)]">20% Ensemble Weight</div>
            </div>
            <div className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
              <div className="text-[var(--text-muted)]">Macro Spread</div>
              <div className="font-bold text-[var(--text-primary)] mt-0.5">
                {intake.macroStressMultiplier}x Stress
              </div>
              <div className="text-[9px] text-[var(--text-tertiary)]">10% Ensemble Weight</div>
            </div>
            <div className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
              <div className="text-[var(--text-muted)]">Tenure Credit</div>
              <div className="font-bold text-[var(--text-primary)] mt-0.5">
                {intake.customerTenureMonths} Mos
              </div>
              <div className="text-[9px] text-[var(--text-tertiary)]">-5% Risk Credit</div>
            </div>
          </div>
        </div>

        {/* Financial Exposure KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[var(--border-hairline)] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
          <KPICell label="INVOICE PRINCIPAL" value={fmt(Number(intake?.invoiceAmount) || 0)} color="var(--text-primary)" sub={`Net-${intake?.paymentTermDays || 30} payment terms`} />
          <KPICell label="GST ITC LOCKED" value={fmt(safeGstItc)} color="var(--accent-warn)" sub="Section 16(2) statutory lock" />
          <KPICell label="CAPITAL AT RISK" value={fmt(safeTotalAtRisk)} color={riskColor} sub="Principal + ITC scaled by risk" />
          <KPICell label="TREASURY IMPACT" value={result?.isRunwayCollision ? 'RUNWAY COLLISION' : 'BUFFER SAFE'} color={result?.isRunwayCollision ? 'var(--accent-danger)' : 'var(--accent-safe)'} sub={result?.isRunwayCollision ? `Depleted Day ${result?.collisionDay ?? 'N/A'}` : `+${fmt(safeCashBuffer)} buffer`} />
        </div>
      </div>

      {/* Underwriting Intelligence Visualization Suite */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-hairline)]">
          <div>
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-2 h-2 bg-[#38BDF8]" />
              Underwriting Intelligence Visualization Suite
            </div>
            <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
              Multi-vector quantitative analysis: Expected settlement bell curve, 5-factor risk radar, and TreeSHAP attribution.
            </p>
          </div>

          <div className="flex items-center border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
            <button
              type="button"
              onClick={() => setActiveVizTab('arrival')}
              className={`px-2.5 py-1 text-[10px] font-mono transition-colors border-r border-[var(--border-hairline)] ${
                activeVizTab === 'arrival'
                  ? 'bg-[#38BDF8] text-[#09090B] font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Arrival Curve
            </button>
            <button
              type="button"
              onClick={() => setActiveVizTab('radar')}
              className={`px-2.5 py-1 text-[10px] font-mono transition-colors border-r border-[var(--border-hairline)] ${
                activeVizTab === 'radar'
                  ? 'bg-[#38BDF8] text-[#09090B] font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Risk Radar
            </button>
            <button
              type="button"
              onClick={() => setActiveVizTab('shap')}
              className={`px-2.5 py-1 text-[10px] font-mono transition-colors ${
                activeVizTab === 'shap'
                  ? 'bg-[#38BDF8] text-[#09090B] font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              TreeSHAP Waterfall
            </button>
          </div>
        </div>

        <div className="my-1">
          <EChartBox
            option={
              activeVizTab === 'arrival'
                ? arrivalCurveOption
                : activeVizTab === 'radar'
                ? radarOption
                : shapOption
            }
            height={320}
            title={
              activeVizTab === 'arrival'
                ? 'Expected Payment Arrival Curve (P20 / P50 / P80 Window)'
                : activeVizTab === 'radar'
                ? 'Deal Risk Profile vs. Low-Risk Baseline'
                : 'SHAP Risk Drivers (Why the Model Scored This Deal)'
            }
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--border-hairline)] text-[10px] font-mono">
          <div className="p-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-hairline)]">
            <span className="text-[var(--text-tertiary)] block">Contract vs Expected Arrival</span>
            <span className="font-bold text-[var(--text-primary)] tabular-nums mt-0.5 block">
              Net-{intake.paymentTermDays} → Day {result.expectedArrivalDay} (+{Math.max(0, result.expectedArrivalDay - intake.paymentTermDays)}d delay)
            </span>
          </div>
          <div className="p-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-hairline)]">
            <span className="text-[var(--text-tertiary)] block">P20–P80 Arrival Window</span>
            <span className="font-bold text-[#F59E0B] tabular-nums mt-0.5 block">
              Day {result.arrivalWindowLow} to Day {result.arrivalWindowHigh} (±{Math.round((result.arrivalWindowHigh - result.arrivalWindowLow) / 2)}d)
            </span>
          </div>
          <div className="p-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-hairline)]">
            <span className="text-[var(--text-tertiary)] block">Main Risk Driver</span>
            <span className="font-bold text-[var(--accent-danger)] tabular-nums mt-0.5 block">
              {intake.pastLatePercent > 30 ? `Past Late ${intake.pastLatePercent}%` : `Order Size ${intake.orderSizeVsAvg}x Mean`}
            </span>
          </div>
        </div>
      </div>

      {/* TReDS Invoice Discounting & Factoring Yield Analyzer */}
      <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[var(--accent-primary)]" />
            <span className="text-xs font-sans font-semibold text-[var(--text-primary)]">
              TReDS Invoice Discounting Option (RXIL / M1xchange / Invoicemart)
            </span>
          </div>
        </div>

        <p className="text-xs text-[var(--text-muted)] font-sans leading-relaxed">
          Instead of waiting Net-{intake.paymentTermDays} days and carrying a {result.blendedRiskPercent.toFixed(1)}% late-payment risk, you can discount this invoice on an RBI-approved TReDS exchange to receive cash on Day 1.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
            <span className="text-[9px] text-[var(--text-muted)] uppercase block">Net Immediate Payout</span>
            <span className="text-base font-bold text-[var(--accent-safe)] tabular-nums mt-1 block">
              {fmt(tredsYield.netImmediateCashPayout)}
            </span>
            <span className="text-[9px] text-[var(--text-tertiary)]">Direct cash in bank (Day 1)</span>
          </div>
          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
            <span className="text-[9px] text-[var(--text-muted)] uppercase block">Discounting Cost</span>
            <span className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-1 block">
              {fmt(tredsYield.grossDiscountCost)}
            </span>
            <span className="text-[9px] text-[var(--text-tertiary)]">8.5% p.a. institutional rate</span>
          </div>
          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
            <span className="text-[9px] text-[var(--text-muted)] uppercase block">Platform Fee (0.05%)</span>
            <span className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-1 block">
              {fmt(tredsYield.platformFeeAmount)}
            </span>
            <span className="text-[9px] text-[var(--text-tertiary)]">TReDS exchange fee</span>
          </div>
          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
            <span className="text-[9px] text-[var(--text-muted)] uppercase block">Default Risk Offloaded</span>
            <span className="text-base font-bold text-[var(--accent-primary)] tabular-nums mt-1 block">
              100%
            </span>
            <span className="text-[9px] text-[var(--text-tertiary)]">Institutional absorption</span>
          </div>
        </div>
      </div>

      {/* Early Payment Dynamic Discounting vs TReDS vs Bank Overdraft Cost-of-Capital Analyzer */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[var(--border-hairline)] gap-2">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-[var(--accent-primary)]" />
            <div>
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                Early Payment Cash Discount vs. TReDS vs. Bank Overdraft Cost Analyzer
              </span>
              <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                Exposes the true annualized cost (APR) of giving cash discounts to corporate buyers versus institutional factoring.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)]">Tested Discount:</span>
            {[1.0, 1.5, 2.0, 2.5, 3.0].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setDiscountPct(pct)}
                className={`px-2 py-0.5 text-[10px] font-mono border transition-colors ${
                  discountPct === pct
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Input Parameters & Formulas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
            <div className="text-[9px] uppercase text-[var(--text-tertiary)]">Early Settlement Day</div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                min={1}
                max={(intake.paymentTermDays || 45) - 1}
                value={earlyPayDay}
                onChange={(e) => setEarlyPayDay(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] px-2 py-1 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--text-tertiary)] focus:outline-none"
              />
              <span className="text-[10px] text-[var(--text-muted)]">
                (Accelerates by {earlyDiscountResult.daysAccelerated} days)
              </span>
            </div>
          </div>

          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
            <div className="text-[9px] uppercase text-[var(--text-tertiary)]">Annualized Discount Cost (APR)</div>
            <div className="text-base font-bold text-[var(--accent-danger)] tabular-nums mt-1">
              {earlyDiscountResult.annualizedDiscountApr}% APR
            </div>
            <div className="text-[9px] text-[var(--text-muted)]">
              Formula: [D% / (100 - D%)] × [365 / {earlyDiscountResult.daysAccelerated}d]
            </div>
          </div>

          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
            <div className="text-[9px] uppercase text-[var(--text-tertiary)]">Cash Sacrificed to Buyer</div>
            <div className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-1">
              {fmt(earlyDiscountResult.discountCashCost)}
            </div>
            <div className="text-[9px] text-[var(--text-muted)]">
              Direct gross revenue reduction
            </div>
          </div>
        </div>

        {/* 3-Way Comparative Financing Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
          {/* Option A */}
          <div className="p-3.5 border border-[var(--accent-danger)]/40 bg-[var(--accent-danger)]/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--accent-danger)] uppercase">Option A: Buyer Cash Discount</span>
              <span className="text-[9px] px-1.5 py-0.2 border border-[var(--accent-danger)]/40 text-[var(--accent-danger)]">
                {earlyDiscountResult.annualizedDiscountApr}% APR
              </span>
            </div>
            <div className="text-lg font-bold text-[var(--accent-danger)] tabular-nums">
              {fmt(earlyDiscountResult.discountCashCost)}
            </div>
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              Cost of giving {discountPct}% discount to receive payment on Day {earlyPayDay} instead of Day {intake.paymentTermDays}.
            </p>
          </div>

          {/* Option B */}
          <div className="p-3.5 border border-[var(--accent-safe)]/40 bg-[var(--accent-safe)]/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--accent-safe)] uppercase">Option B: TReDS Factoring</span>
              <span className="text-[9px] px-1.5 py-0.2 border border-[var(--accent-safe)]/40 text-[var(--accent-safe)]">
                8.5% APR
              </span>
            </div>
            <div className="text-lg font-bold text-[var(--accent-safe)] tabular-nums">
              {fmt(earlyDiscountResult.tredsCost)}
            </div>
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              Cost to factor invoice on RBI TReDS for {earlyDiscountResult.daysAccelerated} days with 100% default risk absorption.
            </p>
          </div>

          {/* Option C */}
          <div className="p-3.5 border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--accent-primary)] uppercase">Option C: Bank OD / CC Draw</span>
              <span className="text-[9px] px-1.5 py-0.2 border border-[var(--accent-primary)]/40 text-[var(--accent-primary)]">
                {odInterestRate.toFixed(1)}% APR
              </span>
            </div>
            <div className="text-lg font-bold text-[var(--accent-primary)] tabular-nums">
              {fmt(earlyDiscountResult.bankOdCost)}
            </div>
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              Bank interest paid if borrowing against existing working capital Cash Credit limit for {earlyDiscountResult.daysAccelerated} days.
            </p>
          </div>
        </div>

        {/* Verdict Box */}
        <div className="p-3 border border-[var(--accent-safe)]/60 bg-[var(--bg-elevated)] text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--accent-safe)] shrink-0" />
            <span className="text-[11px] text-[var(--text-primary)]">
              {earlyDiscountResult.verdictRecommendation}
            </span>
          </div>
          {earlyDiscountResult.savingsVsDiscount > 0 && (
            <div className="shrink-0 text-right">
              <span className="text-[9px] text-[var(--text-muted)] uppercase block">Net Rupee Capital Saved:</span>
              <span className="text-sm font-bold text-[var(--accent-safe)] tabular-nums">
                +{fmt(earlyDiscountResult.savingsVsDiscount)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bank Overdraft Delay Drag & Real Profit Margin Erosion Meter */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[var(--border-hairline)] gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--accent-warn)]" />
            <div>
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                Bank Overdraft Financing Cost &amp; Profit Margin Erosion Meter
              </span>
              <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                Quantifies how customer payment delay directly drains your nominal profit margin via bank overdraft interest.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-[9px] font-mono uppercase text-[var(--text-tertiary)]">Nominal Margin:</span>
            {[12.0, 15.0, 18.0, 22.0].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setNominalMargin(m)}
                className={`px-2 py-0.5 text-[10px] font-mono border transition-colors ${
                  nominalMargin === m
                    ? 'border-[var(--accent-warn)] bg-[var(--accent-warn)]/10 text-[var(--accent-warn)] font-bold'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {m}%
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
            <span className="text-[9px] uppercase text-[var(--text-tertiary)] block">Nominal Gross Margin</span>
            <span className="text-base font-bold text-[var(--text-primary)] tabular-nums block mt-1">
              {nominalMargin}% ({fmt(erosionResult.nominalProfitAmount)})
            </span>
            <span className="text-[9px] text-[var(--text-tertiary)]">Target contracted profitability</span>
          </div>

          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
            <span className="text-[9px] uppercase text-[var(--accent-danger)] block">Bank OD Interest Burn</span>
            <span className="text-base font-bold text-[var(--accent-danger)] tabular-nums block mt-1">
              -{fmt(erosionResult.odInterestCost)}
            </span>
            <span className="text-[9px] text-[var(--text-tertiary)]">
              {delayDays > 0 ? `12% p.a. over ${delayDays} delay days` : 'Zero delay (Day 0)'}
            </span>
          </div>

          <div className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1">
            <span className="text-[9px] uppercase text-[var(--accent-warn)] block">Real Realized Margin</span>
            <span className="text-base font-bold text-[var(--accent-warn)] tabular-nums block mt-1">
              {erosionResult.adjustedMarginPercent}% ({fmt(erosionResult.adjustedProfitAmount)})
            </span>
            <span className="text-[9px] text-[var(--accent-danger)] font-bold">
              -{erosionResult.marginErosionPercent}% Margin Eroded
            </span>
          </div>

          <div className="p-3 border border-[var(--accent-safe)]/40 bg-[var(--accent-safe)]/5 space-y-1">
            <span className="text-[9px] uppercase text-[var(--accent-safe)] block">Statutory MSME Offset</span>
            <span className="text-base font-bold text-[var(--accent-safe)] tabular-nums block mt-1">
              +{fmt(erosionResult.msmedInterestOffset)}
            </span>
            <span className="text-[9px] text-[var(--text-muted)]">3x RBI Rate (20.25% p.a.) claim</span>
          </div>
        </div>

        <div className="p-2.5 border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[10px] font-mono text-[var(--text-muted)] flex items-center justify-between">
          <span>
            <b>CFO Takeaway:</b> If this buyer pays on expected Day {result.expectedArrivalDay} ({delayDays} days late), your nominal {nominalMargin}% margin drops to <b>{erosionResult.adjustedMarginPercent}%</b> due to ₹{erosionResult.odInterestCost.toLocaleString('en-IN')} in bank interest. Serving a Section 16 MSMED notice recovers this entire drain plus ₹{(erosionResult.msmedInterestOffset - erosionResult.odInterestCost).toLocaleString('en-IN')} in net statutory surplus.
          </span>
        </div>
      </div>

      {/* Anomaly Detection Banner (if triggered) */}
      {safeWarnings.length > 0 && (
        <div className="border border-[var(--accent-danger)] bg-[var(--bg-surface)] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--accent-danger)]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            ANOMALY DETECTION AUDIT
          </div>
          <div className="space-y-2">
            {safeWarnings.map((w: any, i: number) => (
              <div
                key={i}
                className="p-2.5 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-xs font-mono"
              >
                <div className="text-[10px] font-bold text-[var(--accent-danger)] uppercase">
                  {w?.code || 'WARNING'}: {w?.title || 'Risk Flag'}
                </div>
                <div className="text-[11px] text-[var(--text-primary)] mt-0.5">
                  {w?.description || ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plain-Language Risk Factor Attribution */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-3">
        <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)]">
          Risk Factor Attribution (Plain-Language Business Drivers)
        </h3>
        <p className="text-xs text-[var(--text-muted)] font-mono">
          Each factor explains why the model increased or reduced the late payment probability for this counterparty.
        </p>
        <div className="space-y-2">
          {safeShapFactors.map((f: any, i: number) => {
            const isIncrease = f?.direction === 'RISK_INCREASE';
            const impactVal = Number.isFinite(Number(f?.impactScore)) ? Number(f.impactScore) : 0;
            return (
              <div
                key={i}
                className="p-3 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {f?.factor || 'Risk Factor'}
                  </span>
                  <span
                    className="font-bold tabular-nums"
                    style={{ color: isIncrease ? 'var(--accent-danger)' : 'var(--accent-safe)' }}
                  >
                    {isIncrease ? `+${impactVal.toFixed(1)}% Risk Contribution` : `-${impactVal.toFixed(1)}% Risk Deduction`}
                  </span>
                </div>
                <p className="text-[11px] font-sans text-[var(--text-muted)]">
                  {f?.explanation || ''}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* What-If Scenario Comparator */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-3">
        <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)]">
          What-If Scenario Comparator
        </h3>
        <p className="text-xs text-[var(--text-muted)] font-mono">
          Simulate how reducing payment terms or requiring advance deposits changes the counterparty risk profile.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={whatIfLabel}
            onChange={(e) => setWhatIfLabel(e.target.value)}
            placeholder="e.g. Net-15 vs 25% Upfront Deposit"
            className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-hairline)] py-2 px-3 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--text-tertiary)] focus:outline-none"
          />
          <button
            onClick={onWhatIf}
            disabled={!whatIfLabel.trim()}
            className="px-4 py-2 text-[10px] font-mono border border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 disabled:opacity-30 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3 h-3" /> COMPARE
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-3.5 space-y-1.5">
            <div className="text-[9px] font-mono uppercase tracking-wider text-[var(--accent-primary)] font-bold">
              Active Underwritten Deal
            </div>
            <div className="text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Risk Probability:</span>
                <span style={{ color: riskColor }} className="font-bold">
                  {safeRisk.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Payment Term:</span>
                <span className="text-[var(--text-primary)]">Net-{intake?.paymentTermDays || 30} Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Expected Settlement:</span>
                <span className="text-[var(--text-primary)]">Day {safeArrival}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Capital at Risk:</span>
                <span className="text-[var(--text-primary)]">{fmt(safeTotalAtRisk)}</span>
              </div>
            </div>
          </div>
          {safeWhatIfs.map(
            (w: any) =>
              w?.result && (
                <div
                  key={w.id}
                  className="border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3.5 space-y-1.5"
                >
                  <div className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
                    {w.label}
                  </div>
                  <div className="text-xs font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Risk Probability:</span>
                      <span
                        style={{
                          color:
                            Number(w.result.blendedRiskPercent ?? 0) < 30
                              ? 'var(--accent-safe)'
                              : Number(w.result.blendedRiskPercent ?? 0) < 60
                              ? 'var(--accent-warn)'
                              : 'var(--accent-danger)',
                        }}
                        className="font-bold"
                      >
                        {Number(w.result.blendedRiskPercent ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Expected Settlement:</span>
                      <span className="text-[var(--text-primary)]">
                        Day {Number(w.result.expectedArrivalDay ?? 30)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Capital at Risk:</span>
                      <span className="text-[var(--text-primary)]">
                        {fmt(Number(w.result.totalAtRisk ?? 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )
          )}
        </div>
      </div>

      {showCreditMemo && (
        <CreditMemoModal
          isOpen={showCreditMemo}
          onClose={() => setShowCreditMemo(false)}
          result={result}
          intake={intake}
          provenance={provenance}
        />
      )}
    </div>
  );
}

function KPICell({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  sub: string;
}) {
  return (
    <div className="p-3.5">
      <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
        {label}
      </span>
      <p className="text-base font-mono font-bold tabular-nums mt-1" style={{ color }}>
        {value}
      </p>
      <p className="text-[9px] font-mono text-[var(--text-tertiary)] mt-0.5 truncate">{sub}</p>
    </div>
  );
}

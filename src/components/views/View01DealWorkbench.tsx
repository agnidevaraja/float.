import React, { useState, useCallback } from 'react';
import { useWorkspace } from '../../store/workspaceStore';
import { evaluateInvoicePipeline, loadApiConfig } from '../../services/inferenceBridge';
import type { WhatIfScenario } from '../../types';
import { ArrowRight, Plus, Save, Zap, ArrowLeft, Copy, Check, FileText, DollarSign, Clock, ShieldAlert } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export const View01DealWorkbench: React.FC = () => {
  const { state, dispatch } = useWorkspace();
  const [local, setLocal] = useState<Record<string, any>>({ ...state.intake });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [whatIfLabel, setWhatIfLabel] = useState('');

  const update = (patch: Record<string, any>) => setLocal(prev => ({ ...prev, ...patch }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!local.invoiceAmount || local.invoiceAmount <= 0) e.invoiceAmount = 'Required';
    if (!local.paymentTermDays || local.paymentTermDays < 1) e.paymentTermDays = 'Min 1 day';
    if (!local.currentBankBalance && local.currentBankBalance !== 0) e.currentBankBalance = 'Required';
    if (!local.monthlyFixedExpenses && local.monthlyFixedExpenses !== 0) e.monthlyFixedExpenses = 'Required';
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
      dispatch({ type: 'SET_PROVENANCE', payload: { provenance: result.provenance, latencyMs: result.latencyMs } });
      dispatch({ type: 'SET_PHASE', payload: 'dossier' });
    } catch (err) {
      console.error(err);
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
    evaluateInvoicePipeline(local as any, loadApiConfig()).then(result => {
      dispatch({ type: 'ADD_WHATIF', payload: { ...scenario, result } });
    });
  };

  const handleSaveLedger = () => {
    if (!state.currentResult) return;
    dispatch({
      type: 'ADD_LEDGER_ENTRY',
      payload: {
        id: Date.now().toString(),
        clientName: (local as any).clientName || 'Unknown',
        invoiceAmount: local.invoiceAmount,
        paymentTermDays: local.paymentTermDays,
        riskPercent: state.currentResult.blendedRiskPercent,
        expectedArrivalDay: state.currentResult.expectedArrivalDay,
        status: state.currentResult.blendedRiskPercent > 60 ? 'OVERDUE' : state.currentResult.blendedRiskPercent > 30 ? 'PENDING' : 'ON_TRACK',
        savedAt: new Date(),
      },
    });
  };

  if (state.phase === 'dossier' && state.currentResult) {
    return <DossierPhase result={state.currentResult} intake={local} provenance={state.provenance} latencyMs={state.latencyMs} whatIfs={state.whatIfs} whatIfLabel={whatIfLabel} setWhatIfLabel={setWhatIfLabel} onWhatIf={handleWhatIf} onSaveLedger={handleSaveLedger} onEdit={() => dispatch({ type: 'SET_PHASE', payload: 'intake' })} onCopy={setCopied} copied={copied} />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">Deal Underwriting</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">Enter counterparty and invoice details. Treasury defaults pre-filled from Settings.</p>
      </div>

      <section className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-[var(--accent-primary)]" /> Section 01: Counterparty & Invoice Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Counterparty Legal Name"><input type="text" value={(local as any).clientName || ''} onChange={e => update({ clientName: e.target.value })} placeholder="e.g., TechForge Pvt Ltd" className="field-input" /></Field>
          <Field label="Optional GSTIN" optional><input type="text" value={(local as any).gstin || ''} onChange={e => update({ gstin: e.target.value })} placeholder="e.g., 27AABCT1234R1ZX" className="field-input" /></Field>
          <Field label="Invoice Principal (INR)" error={errors.invoiceAmount}><input type="number" value={local.invoiceAmount || ''} onChange={e => update({ invoiceAmount: parseFloat(e.target.value) || 0 })} placeholder="e.g., 125000" className="field-input text-right" /></Field>
          <Field label="Promised Payment Term (days)" error={errors.paymentTermDays}><input type="number" value={local.paymentTermDays || ''} onChange={e => update({ paymentTermDays: parseInt(e.target.value) || 0 })} placeholder="e.g., 30" className="field-input text-right" /></Field>
          <Field label="Counterparty Tenure (months)" error={errors.customerTenureMonths}><input type="number" value={local.customerTenureMonths || ''} onChange={e => update({ customerTenureMonths: parseInt(e.target.value) || 0 })} placeholder="e.g., 14" className="field-input text-right" /></Field>
          <Field label="Invoice Due Weekday">
            <select value={local.dueWeekday} onChange={e => update({ dueWeekday: e.target.value })} className="field-input">
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {['Mon','Sat','Sun'].includes(local.dueWeekday) && <span className="text-[9px] font-mono text-[var(--accent-warn)] mt-1 block">AP batch lag: Corporate pay cycles clear Mon-Fri only</span>}
          </Field>
        </div>
      </section>

      <section className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[var(--accent-primary)]" /> Section 02: Historical Behavior & Macro Context
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Past Invoices Count" optional><input type="number" value={(local as any).pastInvoiceCount || ''} onChange={e => update({ pastInvoiceCount: parseInt(e.target.value) || 0 })} placeholder="e.g., 25" className="field-input text-right" /></Field>
          <Field label="Past Late Payment Rate (%)" error={errors.pastLatePercent}><input type="number" min="0" max="100" value={local.pastLatePercent || ''} onChange={e => update({ pastLatePercent: parseFloat(e.target.value) || 0 })} placeholder="e.g., 30" className="field-input text-right" /></Field>
          <Field label="Historical Average Delay (days)" error={errors.pastAvgDelayDays}><input type="number" min="0" value={local.pastAvgDelayDays || ''} onChange={e => update({ pastAvgDelayDays: parseFloat(e.target.value) || 0 })} placeholder="e.g., 8" className="field-input text-right" /></Field>
          <Field label="Order Size vs Historical Average (x)" error={errors.orderSizeVsAvg}><input type="number" min="0.1" step="0.1" value={local.orderSizeVsAvg || ''} onChange={e => update({ orderSizeVsAvg: parseFloat(e.target.value) || 1 })} placeholder="e.g., 1.8" className="field-input text-right" /></Field>
          <Field label="FRED Macro Stress Multiplier" optional>
            <div className="flex items-center gap-3">
              <input type="range" min="0.8" max="2.0" step="0.1" value={local.macroStressMultiplier} onChange={e => update({ macroStressMultiplier: parseFloat(e.target.value) })} className="flex-1 h-1 bg-[var(--bg-elevated)] appearance-none cursor-pointer" />
              <span className="text-xs font-mono tabular-nums text-[var(--text-primary)] w-12 text-right">{local.macroStressMultiplier.toFixed(1)}x</span>
            </div>
          </Field>
        </div>
      </section>

      <section className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5 text-[var(--accent-primary)]" /> Section 03: Your Business Liquidity & Tax Position
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="GST-Registered MSME">
            <div className="flex items-center gap-3">
              <button onClick={() => update({ gstRegistered: !local.gstRegistered })} className={'px-4 py-2 text-xs font-mono border transition-colors ' + (local.gstRegistered ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' : 'border-[var(--border-hairline)] text-[var(--text-muted)]')}>{local.gstRegistered ? 'YES' : 'NO'}</button>
              {local.gstRegistered && <select value={(local as any).gstSlab || 18} onChange={e => update({ gstSlab: parseInt(e.target.value) })} className="field-input"><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option><option value={28}>28%</option></select>}
            </div>
          </Field>
          <Field label="Current Bank Balance (INR)" error={errors.currentBankBalance}><input type="number" value={local.currentBankBalance || ''} onChange={e => update({ currentBankBalance: parseFloat(e.target.value) || 0 })} placeholder="e.g., 250000" className="field-input text-right" /></Field>
          <Field label="Monthly Fixed Operating Burn (INR)" error={errors.monthlyFixedExpenses}><input type="number" value={local.monthlyFixedExpenses || ''} onChange={e => update({ monthlyFixedExpenses: parseFloat(e.target.value) || 0 })} placeholder="e.g., 160000" className="field-input text-right" /></Field>
        </div>
      </section>

      <div className="flex items-center justify-between border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
        <div className="text-[10px] font-mono text-[var(--text-tertiary)]">Pipeline: Isolation Forest -&gt; 4-Source GBDT -&gt; Quantile Arrival -&gt; SHAP &amp; Runway</div>
        <button onClick={handleEvaluate} disabled={state.isEvaluating} className="px-6 py-2.5 text-xs font-mono uppercase tracking-wider border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 disabled:opacity-40 transition-colors flex items-center gap-2">
          {state.isEvaluating ? <span className="flex gap-1"><span className="w-1.5 h-1.5 bg-white animate-pulse" /><span className="w-1.5 h-1.5 bg-white animate-pulse" style={{ animationDelay: '0.2s' }} /><span className="w-1.5 h-1.5 bg-white animate-pulse" style={{ animationDelay: '0.4s' }} /></span> : <><Zap className="w-3.5 h-3.5" /> Run Risk Evaluation <ArrowRight className="w-3.5 h-3.5" /></>}
        </button>
      </div>
    </div>
  );
};

function Field({ label, children, error, optional }: { label: string; children: React.ReactNode; error?: string; optional?: boolean }) {
  return (
    <div>
      <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">{label} {optional && <span className="text-[var(--text-tertiary)]">(optional)</span>}</label>
      {children}
      {error && <span className="text-[9px] font-mono text-[var(--accent-danger)] mt-1 block">{error}</span>}
    </div>
  );
}

function DossierPhase({ result, intake, provenance, latencyMs, whatIfs, whatIfLabel, setWhatIfLabel, onWhatIf, onSaveLedger, onEdit, onCopy, copied }: any) {
  const riskColor = result.blendedRiskPercent < 30 ? 'var(--accent-safe)' : result.blendedRiskPercent < 60 ? 'var(--accent-warn)' : 'var(--accent-danger)';
  const clause = result.recommendedTerms.contractClause;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3">
        <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><ArrowLeft className="w-3 h-3" /> EDIT PARAMETERS</button>
        <div className={'px-2 py-1 text-[9px] font-mono border ' + (provenance === 'LOCAL_ENGINE' ? 'border-[var(--accent-safe)]/40 text-[var(--accent-safe)]' : 'border-[var(--accent-primary)]/40 text-[var(--accent-primary)]')}>{provenance === 'LOCAL_ENGINE' ? 'CALIBRATED LOCAL ENGINE' : 'LIVE COLAB MODEL'} {latencyMs !== null && '(' + latencyMs + 'ms)'}</div>
        <button onClick={onSaveLedger} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><Save className="w-3 h-3" /> SAVE TO PORTFOLIO</button>
      </div>
      <div className="grid grid-cols-4 divide-x divide-[var(--border-hairline)] border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
        <KPICell label="BLENDED RISK" value={result.blendedRiskPercent.toFixed(1) + '%'} color={riskColor} sub="B2B+FRED 60% | Credit 25% | Fraud 15%" />
        <KPICell label="ARRIVAL DAY" value={'Day ' + result.expectedArrivalDay} color="var(--accent-primary)" sub={'P20: D' + result.arrivalWindowLow + ' | P80: D' + result.arrivalWindowHigh} />
        <KPICell label="TOTAL AT RISK" value={fmt(result.totalAtRisk)} color="var(--accent-warn)" sub={'GST ITC: ' + fmt(result.gstItcLocked)} />
        <KPICell label="RUNWAY" value={result.isRunwayCollision ? 'COLLISION' : 'SAFE'} color={result.isRunwayCollision ? 'var(--accent-danger)' : 'var(--accent-safe)'} sub={result.isRunwayCollision ? 'Day ' + result.collisionDay : '+' + fmt(result.cashBufferAtArrival) + ' buffer'} />
      </div>
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3">What-If Scenario Comparator</h3>
        <div className="flex items-center gap-2 mb-4">
          <input type="text" value={whatIfLabel} onChange={e => setWhatIfLabel(e.target.value)} placeholder="e.g., Net-45 vs 30% Upfront + Net-15" className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-hairline)] py-2 px-3 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-subtle)] focus:outline-none" />
          <button onClick={onWhatIf} disabled={!whatIfLabel.trim()} className="px-4 py-2 text-[10px] font-mono border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 disabled:opacity-30 transition-colors flex items-center gap-1.5"><Plus className="w-3 h-3" /> RUN</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <div className="text-[9px] font-mono uppercase tracking-wider text-[var(--accent-primary)] mb-2">Current Deal</div>
            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between"><span className="text-[var(--text-muted)]">Risk</span><span style={{ color: riskColor }}>{result.blendedRiskPercent.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)]">Arrival</span><span className="text-[var(--text-primary)]">Day {result.expectedArrivalDay}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)]">At Risk</span><span className="text-[var(--text-primary)]">{fmt(result.totalAtRisk)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)]">Terms</span><span className="text-[var(--text-primary)]">Net-{intake.paymentTermDays}</span></div>
            </div>
          </div>
          {whatIfs.map((w: any) => w.result && (
            <div key={w.id} className="border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4">
              <div className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-2">{w.label}</div>
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Risk</span><span style={{ color: w.result.blendedRiskPercent < 30 ? 'var(--accent-safe)' : w.result.blendedRiskPercent < 60 ? 'var(--accent-warn)' : 'var(--accent-danger)' }}>{w.result.blendedRiskPercent.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Arrival</span><span className="text-[var(--text-primary)]">Day {w.result.expectedArrivalDay}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">At Risk</span><span className="text-[var(--text-primary)]">{fmt(w.result.totalAtRisk)}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3">Recommended Payment Terms</h3>
        <div className={'inline-block px-3 py-1.5 text-[10px] font-mono border mb-3 ' + (result.recommendedTerms.tier === 'APPROVED' ? 'border-[var(--accent-safe)]/40 text-[var(--accent-safe)]' : result.recommendedTerms.tier === 'MODERATE_RISK' ? 'border-[var(--accent-warn)]/40 text-[var(--accent-warn)]' : 'border-[var(--accent-danger)]/40 text-[var(--accent-danger)]')}>{result.recommendedTerms.badgeLabel}</div>
        <p className="text-xs text-[var(--text-muted)] mb-3">{result.recommendedTerms.rationale}</p>
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-hairline)] p-3 relative group">
          <button onClick={() => { navigator.clipboard.writeText(clause); onCopy(true); setTimeout(() => onCopy(false), 2000); }} className="absolute top-2 right-2 px-2 py-1 text-[9px] font-mono border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity">{copied ? 'Copied' : 'Copy'}</button>
          <p className="text-[11px] font-mono text-[var(--text-primary)] leading-relaxed pr-16">{clause}</p>
        </div>
      </div>
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3">SHAP Risk Attribution</h3>
        <div className="space-y-2">
          {result.topShapFactors.map((f: any, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-[var(--text-tertiary)] w-32 shrink-0 truncate">{f.factor}</span>
              <div className="flex-1 h-2 bg-[var(--bg-elevated)] border border-[var(--border-hairline)]"><div className="h-full" style={{ width: Math.min(100, Math.abs(f.impactScore) * 15) + '%', backgroundColor: f.direction === 'RISK_INCREASE' ? 'var(--accent-danger)' : 'var(--accent-safe)', opacity: 0.8 }} /></div>
              <span className="text-[10px] font-mono tabular-nums w-16 text-right" style={{ color: f.direction === 'RISK_INCREASE' ? 'var(--accent-danger)' : 'var(--accent-safe)' }}>{f.direction === 'RISK_INCREASE' ? '+' : '-'}{f.impactScore.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
      {result.integrityWarnings.length > 0 && (
        <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3 flex items-center gap-2"><ShieldAlert className="w-3.5 h-3.5 text-[var(--accent-warn)]" /> Input Data Audit</h3>
          <div className="space-y-2">{result.integrityWarnings.map((w: any, i: number) => (
            <div key={i} className={'p-3 border ' + (w.severity === 'CRITICAL' ? 'border-[var(--accent-danger)]/40 bg-[var(--accent-danger)]/5' : 'border-[var(--accent-warn)]/40 bg-[var(--accent-warn)]/5')}>
              <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: w.severity === 'CRITICAL' ? 'var(--accent-danger)' : 'var(--accent-warn)' }}>{w.code}</div>
              <p className="text-[11px] text-[var(--text-muted)]">{w.description}</p>
            </div>
          ))}</div>
        </div>
      )}
    </div>
  );
}

function KPICell({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <div className="p-4">
      <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">{label}</span>
      <p className="text-lg font-mono font-bold tabular-nums mt-1" style={{ color }}>{value}</p>
      <p className="text-[9px] font-mono text-[var(--text-tertiary)] mt-0.5">{sub}</p>
    </div>
  );
}
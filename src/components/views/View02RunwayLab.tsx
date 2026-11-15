import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts';
import type { DealInput, RiskEvaluationResult } from '../../types';
import { Wallet, Square, Receipt, FileText, Eye, EyeOff } from 'lucide-react';

interface View02RunwayLabProps {
  input: DealInput;
  result: RiskEvaluationResult;
}

interface TrajectoryPoint {
  day: number;
  promised: number;
  predicted: number;
  splitMilestone: number;
  p20: number;
  p80: number;
}

const COMMITMENTS = [
  { id: 'rent', label: 'Office / Factory Rent', icon: Square, defaultAmount: 20000, dayOfMonth: 5 },
  { id: 'gst', label: 'GST GSTR-3B Remittance', icon: Receipt, defaultAmount: 15000, dayOfMonth: 20 },
  { id: 'payroll', label: 'Monthly Payroll', icon: Wallet, defaultAmount: 40000, dayOfMonth: 25 },
  { id: 'section43b', label: 'Section 43B(h) Supplier Payouts', icon: FileText, defaultAmount: 10000, dayOfMonth: 28 },
];

const fmtINR = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

export const View02RunwayLab: React.FC<View02RunwayLabProps> = ({ input, result }) => {
  const [commitments, setCommitments] = useState<Record<string, { enabled: boolean; amount: number }>>(() =>
    COMMITMENTS.reduce((acc, c) => ({ ...acc, [c.id]: { enabled: true, amount: c.defaultAmount } }), {})
  );
  const [showCommitments, setShowCommitments] = useState(true);

  const chartData = useMemo<TrajectoryPoint[]>(() => {
    const dailyBurn = input.monthlyFixedExpenses / 30;
    const commitmentDaily = showCommitments
      ? Object.values(commitments).filter((c) => c.enabled).reduce((s, c) => s + c.amount, 0) / 30
      : 0;
    const totalDaily = dailyBurn + commitmentDaily;
    const invoice = input.invoiceAmount;
    const points: TrajectoryPoint[] = [];

    const arrivalLow = input.paymentTermDays + Math.max(0, (result.arrivalWindowLow - input.paymentTermDays) * 0.5);
    const arrivalHigh = input.paymentTermDays + Math.max(0, (result.arrivalWindowHigh - input.paymentTermDays) * 1.5);

    for (let d = 0; d <= 90; d++) {
      const base = input.currentBankBalance - totalDaily * d;
      let promised = base;
      let predicted = base;
      let split = base;
      let p20 = base;
      let p80 = base;

      if (d >= input.paymentTermDays) promised += invoice;
      if (d >= result.expectedArrivalDay) predicted += invoice;
      if (d >= 0) split += invoice * 0.40;
      if (d >= 15) split += invoice * 0.30;
      if (d >= 30) split += invoice * 0.30;
      if (d >= Math.min(arrivalLow, result.arrivalWindowLow)) p20 += invoice;
      if (d >= Math.max(arrivalHigh, result.arrivalWindowHigh)) p80 += invoice;

      points.push({
        day: d,
        promised: Math.max(0, promised),
        predicted: Math.max(0, predicted),
        splitMilestone: Math.max(0, split),
        p20: Math.max(0, p20),
        p80: Math.max(0, p80),
      });
    }
    return points;
  }, [input, result, commitments, showCommitments]);

  const collisionDay = useMemo(() => {
    for (const p of chartData) {
      if (p.predicted < 0) return p.day;
    }
    return null;
  }, [chartData]);

  const yMin = useMemo(() => {
    const all = chartData.map(p => Math.min(p.promised, p.predicted, p.splitMilestone));
    return Math.max(0, Math.floor((Math.min(...all) / 50000) - 1) * 50000);
  }, [chartData]);

  const yMax = useMemo(() => {
    const all = chartData.map(p => Math.max(p.promised, p.predicted, p.splitMilestone));
    return Math.ceil((Math.max(...all) / 50000) + 1) * 50000;
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-3 space-y-1">
        <p className="text-[10px] font-mono text-[var(--text-tertiary)]">Day {label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
            <div className="w-2 h-0.5" style={{ backgroundColor: entry.color }} />
            <span className="text-[var(--text-muted)]">{entry.name}:</span>
            <span className="tabular-nums text-[var(--text-primary)]">{fmtINR(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const collisionDayLabel = collisionDay !== null ? { value: 'COLLISION D' + String(collisionDay), position: 'top', fill: 'var(--accent-danger)', fontSize: 9, fontFamily: 'var(--font-mono)' } : undefined;

  const toggleCommitment = (id: string) => {
    setCommitments(prev => ({ ...prev, [id]: { ...prev[id], enabled: !prev[id].enabled } }));
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            60-Day Cash-Flow Collision Lab
          </h3>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
            Trajectory: Promised vs AI-Predicted vs Smart Split Milestone
          </p>
        </div>
        <button
          onClick={() => setShowCommitments(!showCommitments)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[var(--border-hairline)] text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          {showCommitments ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          Commitments
        </button>
      </div>

      {showCommitments && (
        <div className="grid grid-cols-4 gap-3">
          {COMMITMENTS.map(c => {
            const Icon = c.icon;
            const state = commitments[c.id];
            const cardBorder = state.enabled ? 'var(--border-subtle)' : 'var(--border-hairline)';
            const cardBg = state.enabled ? 'var(--bg-surface)' : 'var(--bg-elevated)';
            return (
              <div key={c.id} className='border p-3 transition-colors' style={{ borderColor: cardBorder, backgroundColor: cardBg, opacity: state.enabled ? 1 : 0.5 }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                    <span className="text-[10px] font-medium text-[var(--text-muted)]">{c.label}</span>
                  </div>
                  <button onClick={() => toggleCommitment(c.id)} className="text-[9px] font-mono border px-1.5 py-0.5" style={{
                    color: state.enabled ? 'var(--accent-safe)' : 'var(--text-tertiary)',
                    borderColor: state.enabled ? 'var(--accent-safe)' : 'var(--border-hairline)'
                  }}>
                    {state.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-tertiary)]">Day {c.dayOfMonth}</span>
                  <input type="number" value={state.amount}
                    onChange={(e) => setCommitments(prev => ({ ...prev, [c.id]: { ...prev[c.id], amount: parseFloat(e.target.value) || 0 } }))}
                    className="w-20 bg-[var(--bg-elevated)] border border-[var(--border-hairline)] py-0.5 px-1.5 text-[10px] font-mono text-right text-[var(--text-primary)] focus:outline-none" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex-1 border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">90-Day Cash Trajectory</span>
          <div className="flex items-center gap-4 text-[10px] font-mono text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-[var(--text-muted)]" /> Promised</span>
            <span className="flex items-center gap-1.5"><span className="w-3 border-t border-[var(--accent-primary)]" /> Predicted</span>
            <span className="flex items-center gap-1.5"><span className="w-3 border-t border-[var(--accent-safe)]" /> Split</span>
          </div>
        </div>

        <div style={{ height: 380 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#71717A" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#71717A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPred" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-safe)" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="var(--accent-safe)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.06} />
                  <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border-hairline)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-tertiary)' }} axisLine={{ stroke: 'var(--border-hairline)' }} tickLine={false} ticks={[0, 15, 30, 45, 60, 75, 90]} />
              <YAxis tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-tertiary)' }} axisLine={{ stroke: 'var(--border-hairline)' }} tickLine={false} tickFormatter={(v) => String(Math.round(v / 1000)) + "k"} domain={[yMin, yMax]} width={55} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} formatter={(v: string) => <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{v}</span>} />
              <Area type="monotone" dataKey="promised" name="Promised" stroke="#71717A" strokeDasharray="5 3" fill="url(#gP)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="p80" name="P80 Band" stroke="none" fill="url(#gBand)" strokeWidth={0} />
              <Area type="monotone" dataKey="p20" name="P20 Band" stroke="none" fill="url(#gBand)" strokeWidth={0} />
              <Area type="monotone" dataKey="predicted" name="AI Predicted" stroke="var(--accent-primary)" fill="url(#gPred)" strokeWidth={2} />
              <Area type="monotone" dataKey="splitMilestone" name="Split Milestone" stroke="var(--accent-safe)" fill="url(#gS)" strokeWidth={1.5} />
              {collisionDay !== null && (
                <ReferenceLine x={collisionDay} stroke="var(--accent-danger)" strokeDasharray="3 3" label={collisionDayLabel} />
              )}
              {result.arrivalWindowLow > 0 && (
                <ReferenceLine x={result.arrivalWindowLow} stroke="var(--accent-primary)" strokeDasharray="2 2" strokeOpacity={0.5} label={{ value: 'P20', position: 'top', fill: 'var(--accent-primary)', fontSize: 8, fontFamily: 'var(--font-mono)' }} />
              )}
              {result.arrivalWindowHigh < 90 && (
                <ReferenceLine x={result.arrivalWindowHigh} stroke="var(--accent-primary)" strokeDasharray="2 2" strokeOpacity={0.5} label={{ value: 'P80', position: 'top', fill: 'var(--accent-primary)', fontSize: 8, fontFamily: 'var(--font-mono)' }} />
              )}
              <ReferenceLine y={0} stroke="var(--accent-danger)" strokeWidth={1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-4 divide-x divide-[var(--border-hairline)] border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
        <div className="p-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">Promised Arrival</span>
          <p className="text-sm font-mono tabular-nums text-[var(--text-primary)] mt-1">Day {input.paymentTermDays}</p>
        </div>
        <div className="p-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">AI Predicted</span>
          <p className="text-sm font-mono tabular-nums text-[var(--accent-primary)] mt-1">Day {result.expectedArrivalDay}</p>
        </div>
        <div className="p-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">Arrival Window</span>
          <p className="text-sm font-mono tabular-nums text-[var(--text-primary)] mt-1">D{result.arrivalWindowLow} - D{result.arrivalWindowHigh}</p>
        </div>
        <div className="p-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">Collision Day</span>
          <p className="text-sm font-mono tabular-nums mt-1" style={{ color: collisionDay ? 'var(--accent-danger)' : 'var(--accent-safe)' }}>
            {collisionDay ? 'Day ' + String(collisionDay) : 'None'}
          </p>
        </div>
      </div>
    </div>
  );
};

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { RiskEvaluationResult, DealInput } from '../../types';
import { CheckSquare, Square, Wallet } from 'lucide-react';

interface View02RunwayLabProps {
  input: DealInput;
  result: RiskEvaluationResult;
}

interface TrajectoryPoint {
  day: number;
  promised: number;
  predicted: number;
  split: number;
}

const COMMITMENTS = [
  { id: 'payroll', label: 'Payroll', icon: Wallet, defaultAmount: 40000 },
  { id: 'rent', label: 'Rent', icon: Square, defaultAmount: 20000 },
  { id: 'gst', label: 'GST Dues', icon: Square, defaultAmount: 15000 },
  { id: 'section43b', label: 'Section 43B', icon: Square, defaultAmount: 10000 },
];

export const View02RunwayLab: React.FC<View02RunwayLabProps> = ({
  input,
  result,
}) => {
  const [commitments, setCommitments] = React.useState<
    Record<string, { enabled: boolean; amount: number }>
  >({
    payroll: { enabled: true, amount: 40000 },
    rent: { enabled: true, amount: 20000 },
    gst: { enabled: true, amount: 15000 },
    section43b: { enabled: true, amount: 10000 },
  });

  const chartData = useMemo<TrajectoryPoint[]>(() => {
        const commitmentDeduction = Object.values(commitments)
      .filter((c) => c.enabled)
      .reduce((sum, c) => sum + c.amount, 0);
    const totalMonthlyBurn = input.monthlyFixedExpenses + commitmentDeduction;
    const adjustedDailyBurn = totalMonthlyBurn / 30;

    const promisedArrivalDay = input.paymentTermDays;
    const predictedArrivalDay = result.expectedArrivalDay;

    const points: TrajectoryPoint[] = [];
    for (let day = 0; day <= 90; day++) {
      const promisedBalance =
        input.currentBankBalance - adjustedDailyBurn * day + (day >= promisedArrivalDay ? input.invoiceAmount : 0);
      const predictedBalance =
        input.currentBankBalance - adjustedDailyBurn * day + (day >= predictedArrivalDay ? input.invoiceAmount : 0);
      const splitBalance =
        input.currentBankBalance - adjustedDailyBurn * day + (day >= promisedArrivalDay ? input.invoiceAmount * 0.7 : 0) + (day >= predictedArrivalDay ? input.invoiceAmount * 0.3 : 0);
      points.push({
        day,
        promised: Math.max(0, promisedBalance),
        predicted: Math.max(0, predictedBalance),
        split: Math.max(0, splitBalance),
      });
    }
    return points;
  }, [input, result.expectedArrivalDay, commitments]);

  const toggleCommitment = (id: string) => {
    setCommitments((prev) => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled },
    }));
  };

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN').format(Math.round(val));

  const yMin = Math.min(...chartData.map((d) => d.promised)) * 0.9;

  return (
    <div className="flex flex-col h-full">
      {/* Chart */}
      <div className="flex-1 border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            90-Day Cash Trajectory
          </span>
          <div className="flex items-center space-x-4 text-[10px] font-mono text-[var(--text-muted)]">
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-[2px] bg-[var(--text-muted)]" style={{ borderTop: '1px dashed var(--text-muted)', height: 0 }} />
              <span>Promised</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-[2px] bg-[var(--accent-primary)]" />
              <span>Predicted</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-[2px] bg-[var(--accent-safe)]" />
              <span>Split</span>
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="promisedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748B" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#64748B" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="splitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-safe)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--accent-safe)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="var(--border-hairline)" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: 'var(--border-hairline)' }}
              tickLine={false}
              ticks={[0, 15, 30, 45, 60, 75, 90]}
              label={{ value: 'Days', position: 'insideBottom', offset: -5, fontSize: 9, fill: 'var(--text-tertiary)' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: 'var(--border-hairline)' }}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              domain={[Math.max(0, yMin), 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 0,
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
              }}
              labelFormatter={(label) => `Day ${label}`}
              formatter={(value: number, name: string) => [
                `₹${formatINR(value)}`,
                name === 'promised' ? 'Promised' : name === 'predicted' ? 'Predicted' : 'Split',
              ]}
            />
            {/* Collision line */}
            {result.collisionDay !== null && result.collisionDay <= 90 && (
              <ReferenceLine
                x={result.collisionDay}
                stroke="var(--accent-danger)"
                strokeDasharray="4 4"
                label={{
                  value: 'COLLISION',
                  position: 'top',
                  fontSize: 9,
                  fill: 'var(--accent-danger)',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="promised"
              stroke="#64748B"
              strokeDasharray="6 3"
              fill="url(#promisedGrad)"
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="predicted"
              stroke="var(--accent-primary)"
              fill="url(#predictedGrad)"
              strokeWidth={2}
            />
            <Area
              type="stepAfter"
              dataKey="split"
              stroke="var(--accent-safe)"
              fill="url(#splitGrad)"
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Commitment Toggles */}
      <div className="mt-4 border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3 block">
          Commitments
        </span>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {COMMITMENTS.map((c) => {
            const Icon = c.icon;
            const state = commitments[c.id];
            return (
              <div
                key={c.id}
                className={`border p-3 transition-colors ${
                  state.enabled
                    ? 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                    : 'border-[var(--border-hairline)] opacity-40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    {c.label}
                  </span>
                  <button
                    onClick={() => toggleCommitment(c.id)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {state.enabled ? (
                      <CheckSquare className="w-4 h-4 text-[var(--accent-primary)]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <span className="text-sm font-mono tabular-nums text-[var(--text-primary)] mt-1 block">
                  ₹{formatINR(state.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

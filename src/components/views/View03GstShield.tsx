import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell, BarChart, Bar, ResponsiveContainer } from 'recharts';
import type { DealInput, RiskEvaluationResult } from '../../types';
import { Shield } from 'lucide-react';

interface View03GstShieldProps {
  input: DealInput;
  result: RiskEvaluationResult;
}

interface DataPoint {
  x: number;
  y: number;
  type: 'current' | 'historical' | 'danger';
  label?: string;
}

export const View03GstShield: React.FC<View03GstShieldProps> = ({ input, result }) => {
  const [slab, setSlab] = React.useState<number>(18);
  const [isIgst, setIsIgst] = React.useState(false);

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN').format(Math.round(val));

  const principal = input.invoiceAmount;
  const gstAmount = principal * (slab / 100);
  const total = principal + gstAmount;

  // Quadrant scatter data
  const scatterData = useMemo<DataPoint[]>(() => {
    const points: DataPoint[] = [];
    // Historical norm zone (center area)
    for (let i = 0; i < 30; i++) {
      points.push({
        x: 15 + Math.random() * 40,
        y: 1.0 + Math.random() * 2.5,
        type: 'historical',
      });
    }
    // Shell vendor danger zone
    for (let i = 0; i < 10; i++) {
      points.push({
        x: 5 + Math.random() * 20,
        y: 3.0 + Math.random() * 2.0,
        type: 'danger',
      });
    }
    // Current deal
    points.push({
      x: input.customerTenureMonths <= 12 ? 10 : Math.min(input.customerTenureMonths, 60),
      y: input.orderSizeVsAvg,
      type: 'current',
      label: 'Current Deal',
    });
    return points;
  }, [input.customerTenureMonths, input.orderSizeVsAvg]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top: GST Controls + Principal/GST Split */}
      <div className="grid grid-cols-2 gap-4">
        {/* GST Slab Selector */}
        <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3 block">
            GST Configuration
          </span>
          <div className="flex items-center space-x-1 mb-3">
            {[5, 12, 18, 28].map((s) => (
              <button
                key={s}
                onClick={() => setSlab(s)}
                className={`px-3 py-1.5 text-[10px] font-mono border transition-colors ${
                  slab === s
                    ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)]/40 text-[var(--accent-primary)]'
                    : 'border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {s}%
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsIgst(false)}
              className={`flex-1 py-1.5 text-[10px] font-mono border transition-colors ${
                !isIgst
                  ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)]/40 text-[var(--accent-primary)]'
                  : 'border-[var(--border-hairline)] text-[var(--text-muted)]'
              }`}
            >
              CGST+SGST
            </button>
            <button
              onClick={() => setIsIgst(true)}
              className={`flex-1 py-1.5 text-[10px] font-mono border transition-colors ${
                isIgst
                  ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)]/40 text-[var(--accent-primary)]'
                  : 'border-[var(--border-hairline)] text-[var(--text-muted)]'
              }`}
            >
              IGST
            </button>
          </div>
        </div>

        {/* Principal vs GST Stacked Bar */}
        <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3 block">
            Invoice Split
          </span>
          <div className="flex h-8 mb-2">
            <div
              className="bg-[var(--text-muted)]/20 flex items-center justify-center transition-all"
              style={{ width: `${(principal / total) * 100}%` }}
            >
              <span className="text-[9px] font-mono text-[var(--text-primary)] truncate px-1">
                Principal
              </span>
            </div>
            <div
              className="bg-[var(--accent-primary)]/30 flex items-center justify-center transition-all border-l border-[var(--accent-primary)]/40"
              style={{ width: `${(gstAmount / total) * 100}%` }}
            >
              <span className="text-[9px] font-mono text-[var(--accent-primary)] truncate px-1">
                GST
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[9px] text-[var(--text-tertiary)] block">Principal</span>
              <span className="text-[11px] font-mono tabular-nums text-[var(--text-primary)]">
                ₹{formatINR(principal)}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-[var(--text-tertiary)] block">GST</span>
              <span className="text-[11px] font-mono tabular-nums text-[var(--accent-primary)]">
                ₹{formatINR(gstAmount)}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-[var(--text-tertiary)] block">Total</span>
              <span className="text-[11px] font-mono tabular-nums text-[var(--text-primary)]">
                ₹{formatINR(total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2D Scatter Quadrant Chart */}
      <div className="flex-1 border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center space-x-1.5 mb-3">
          <Shield className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>Deal Positioning Matrix</span>
        </span>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="var(--border-hairline)" />
            <XAxis
              type="number"
              dataKey="x"
              name="Tenure & Delay Score"
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: 'var(--border-hairline)' }}
              tickLine={false}
              domain={[0, 100]}
              label={{ value: 'Tenure & Delay Score (0-100)', position: 'insideBottom', offset: -5, fontSize: 9, fill: 'var(--text-tertiary)' }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Order Size Multiplier"
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: 'var(--border-hairline)' }}
              tickLine={false}
              domain={[0, 5]}
              label={{ value: 'Order Size (0-5x)', angle: -90, position: 'insideLeft', fontSize: 9, fill: 'var(--text-tertiary)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 0,
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
              }}
              formatter={(value: number, name: string) => [
                value.toFixed(1),
                name === 'x' ? 'Score' : 'Size x',
              ]}
            />
            {/* Historical norm dots */}
            <Scatter data={scatterData.filter((d) => d.type === 'historical')} fill="var(--text-muted)" fillOpacity={0.25} />
            {/* Danger zone dots */}
            <Scatter data={scatterData.filter((d) => d.type === 'danger')} fill="var(--accent-danger)" fillOpacity={0.5} />
            {/* Current deal dot */}
            <Scatter data={scatterData.filter((d) => d.type === 'current')} fill="var(--accent-primary)" />
          </ScatterChart>
        </ResponsiveContainer>
        {/* Quadrant Labels */}
        <div className="flex justify-between text-[9px] font-mono text-[var(--text-tertiary)] mt-1">
          <span>Low Risk Zone</span>
          <span>Shell-Vendor Danger Zone (red cluster)</span>
          <span>Established + Spike</span>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  Table,
  TrendingUp,
  AlertCircle,
  
  
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { RiskEvaluationResult } from '../../types';
import {
  CLASSIFICATION_BENCHMARKS,
  ARRIVAL_MAE_BENCHMARK,
  FAIRNESS_AUDIT_DATA,
  TEST_FAILURE_CASES,
  DATASET_PROVENANCE,
} from '../../data/benchmarks';

interface View05BenchmarksProps {
  result: RiskEvaluationResult;
}

export const View05Benchmarks: React.FC<View05BenchmarksProps> = ({ result }) => {
  const formatNum = (val: number, decimals = 4) => val.toFixed(decimals);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Benchmark Comparison Table */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center space-x-1.5 mb-4">
          <Table className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>Model Benchmark Comparison</span>
        </span>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-hairline)]">
              <th className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] text-left pb-2">
                Model
              </th>
              <th className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] text-right pb-2">
                ROC-AUC
              </th>
              <th className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] text-right pb-2">
                PR-AUC
              </th>
              <th className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] text-right pb-2">
                F1 Score
              </th>
            </tr>
          </thead>
          <tbody>
            {CLASSIFICATION_BENCHMARKS.map((bench, idx) => (
              <tr
                key={idx}
                className={`border-b border-[var(--border-hairline)] ${bench.isChampion ? 'bg-[var(--accent-primary)]/5' : ''}`}
              >
                <td className="py-2.5 text-[11px] text-[var(--text-primary)]">
                  {bench.isChampion && (
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--accent-primary)] mr-2 border border-[var(--accent-primary)]/40 px-1 py-0.5">
                      Champion
                    </span>
                  )}
                  {bench.modelName}
                </td>
                <td className="py-2.5 text-[11px] font-mono tabular-nums text-[var(--text-primary)] text-right">
                  {formatNum(bench.rocAuc)}
                </td>
                <td className="py-2.5 text-[11px] font-mono tabular-nums text-[var(--text-primary)] text-right">
                  {formatNum(bench.prAuc)}
                </td>
                <td className="py-2.5 text-[11px] font-mono tabular-nums text-[var(--text-primary)] text-right">
                  {formatNum(bench.f1Score)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Arrival MAE Comparison */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center space-x-1.5 mb-4">
          <TrendingUp className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>Payment Arrival MAE</span>
        </span>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: 'Business Rule', mae: ARRIVAL_MAE_BENCHMARK.baselineMae, type: 'baseline' },
                { name: 'LightGBM Engine', mae: ARRIVAL_MAE_BENCHMARK.modelMae, type: 'model' },
              ]}
              margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border-hairline)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
                axisLine={{ stroke: 'var(--border-hairline)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
                axisLine={{ stroke: 'var(--border-hairline)' }}
                tickLine={false}
                label={{ value: 'MAE (days)', angle: -90, position: 'insideLeft', fontSize: 9, fill: 'var(--text-tertiary)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 0,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                }}
                formatter={(value: number) => [`${value.toFixed(2)} days`, 'MAE']}
              />
              <Bar dataKey="mae" radius={0}>
                <Cell fill="var(--text-muted)" fillOpacity={0.4} />
                <Cell fill="var(--accent-primary)" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center mt-2 text-[10px] font-mono text-[var(--text-muted)]">
          <span>Improvement:</span>
          <span className="ml-2 text-[var(--accent-safe)] font-semibold tabular-nums">
            -{ARRIVAL_MAE_BENCHMARK.deltaDays.toFixed(2)} days ({(ARRIVAL_MAE_BENCHMARK.deltaDays / ARRIVAL_MAE_BENCHMARK.baselineMae * 100).toFixed(0)}% better)
          </span>
        </div>
      </div>

      {/* Fairness Audit */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3 block">
          Fairness Audit
        </span>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-hairline)]">
              <th className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] text-left pb-2">
                Cohort
              </th>
              <th className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] text-right pb-2">
                Samples
              </th>
              <th className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] text-right pb-2">
                FPR
              </th>
              <th className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] text-right pb-2">
                FNR
              </th>
            </tr>
          </thead>
          <tbody>
            {FAIRNESS_AUDIT_DATA.map((row, idx) => (
              <tr key={idx} className="border-b border-[var(--border-hairline)]">
                <td className="py-2.5 text-[11px] text-[var(--text-primary)]">
                  {row.cohort}
                </td>
                <td className="py-2.5 text-[11px] font-mono tabular-nums text-[var(--text-muted)] text-right">
                  {row.sampleSize}
                </td>
                <td className="py-2.5 text-[11px] font-mono tabular-nums text-[var(--text-primary)] text-right">
                  {row.falsePositiveRate.toFixed(2)}%
                </td>
                <td className="py-2.5 text-[11px] font-mono tabular-nums text-[var(--text-primary)] text-right">
                  {row.falseNegativeRate.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Failure Cases */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center space-x-1.5 mb-3">
          <AlertCircle className="w-3.5 h-3.5 text-[var(--accent-warn)]" />
          <span>Failure Case Analysis</span>
        </span>
        <div className="space-y-3">
          {TEST_FAILURE_CASES.map((fc, idx) => (
            <div key={idx} className="border border-[var(--border-hairline)] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-[var(--text-muted)]">{fc.invoiceId}</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">INR {new Intl.NumberFormat('en-IN').format(fc.amount)}</span>
              </div>
              <div className="flex items-center space-x-3 text-[10px]">
                <span className="text-[var(--accent-danger)]">Predicted: {fc.modelPrediction}</span>
                <span className="text-[var(--accent-safe)]">Actual: {fc.actualOutcome}</span>
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5 leading-relaxed">{fc.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Data Provenance */}
      <div className="border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3 block">Dataset Provenance</span>
        <div className="space-y-2">
          {DATASET_PROVENANCE.map((ds, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2.5 border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
              <span className="text-[10px] font-mono text-[var(--text-tertiary)] w-5">{String(idx + 1).padStart(2, '0')}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-[var(--text-primary)] truncate">{ds.name}</div>
                <div className="text-[9px] font-mono text-[var(--text-tertiary)]">{ds.source} | {ds.records.toLocaleString()} records</div>
              </div>
              <span className="text-[9px] font-mono text-[var(--text-muted)] shrink-0">{ds.role.split(' ').slice(0, 3).join(' ')}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-[var(--text-tertiary)]">
          <span>Total Records</span>
          <span className="text-[var(--text-primary)] tabular-nums">360,646</span>
        </div>
      </div>
    </div>
  );
};

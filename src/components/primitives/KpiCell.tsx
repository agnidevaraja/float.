import React from 'react';

interface KpiCellProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'safe' | 'warn' | 'danger' | 'info' | 'primary';
}

const ACCENT_COLORS: Record<string, string> = {
  safe: 'var(--accent-safe)',
  warn: 'var(--accent-warn)',
  danger: 'var(--accent-danger)',
  info: 'var(--accent-info)',
  primary: 'var(--accent-primary)',
};

export const KpiCell: React.FC<KpiCellProps> = ({ label, value, sub, accent = 'primary' }) => {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
        {label}
      </span>
      <span
        className="text-2xl font-mono font-bold tabular-nums leading-none"
        style={{ color: ACCENT_COLORS[accent] }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[11px] font-sans text-[var(--text-muted)] leading-snug">{sub}</span>
      )}
    </div>
  );
};

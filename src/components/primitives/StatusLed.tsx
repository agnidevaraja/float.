import React from 'react';

interface StatusLedProps {
  color: 'emerald' | 'amber' | 'rose' | 'sky';
  label: string;
  pulse?: boolean;
}

const COLOR_MAP: Record<string, string> = {
  emerald: 'var(--accent-safe)',
  amber: 'var(--accent-warn)',
  rose: 'var(--accent-danger)',
  sky: 'var(--accent-info)',
};

export const StatusLed: React.FC<StatusLedProps> = ({ color, label, pulse = false }) => {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
      <span
        className={`block w-[6px] h-[6px] rounded-full shrink-0 ${pulse ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: COLOR_MAP[color] || color }}
      />
      <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[var(--text-primary)] whitespace-nowrap">
        {label}
      </span>
    </span>
  );
};

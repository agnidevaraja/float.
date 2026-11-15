import React from 'react';

interface SectionHeaderProps {
  label: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ label, icon, right }) => {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-[var(--text-tertiary)]">{icon}</span>}
        <span className="text-[11px] font-display font-semibold uppercase tracking-wider text-[var(--text-primary)]">
          {label}
        </span>
      </div>
      {right && <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{right}</span>}
    </div>
  );
};

import React from 'react';

interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  collapsed?: boolean;
  className?: string;
}

export const Wordmark: React.FC<WordmarkProps> = ({
  size = 'md',
  showSubtitle = false,
  collapsed = false,
  className = '',
}) => {
  if (collapsed) {
    return (
      <span
        className={`inline-flex items-baseline font-display font-bold tracking-tight select-none text-base text-[var(--text-primary)] ${className}`}
      >
        f<span className="text-[var(--accent-primary)]">.</span>
      </span>
    );
  }

  const sizeMap = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  return (
    <div className={`inline-flex flex-col leading-none select-none ${className}`}>
      <span
        className={`font-display font-bold tracking-tight lowercase text-[var(--text-primary)] ${sizeMap[size]}`}
      >
        float<span className="text-[var(--accent-primary)]">.</span>
      </span>
      {showSubtitle && (
        <span className="text-[9px] font-sans font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)] mt-1">
          TREASURY &amp; RECEIVABLES OS
        </span>
      )}
    </div>
  );
};

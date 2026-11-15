import React from 'react';

interface ContainerLinesProps {
  children: React.ReactNode;
  className?: string;
  showCrosshair?: boolean;
}

export const ContainerLines: React.FC<ContainerLinesProps> = ({
  children,
  className = '',
  showCrosshair = false,
}) => {
  return (
    <div
      className={`
        border border-[var(--border-hairline)]
        ${showCrosshair ? 'relative' : ''}
        ${className}
      `}
    >
      {showCrosshair && (
        <>
          <span className="absolute -top-[5px] -left-[5px] text-[10px] text-[var(--border-subtle)] leading-none font-mono select-none pointer-events-none">+</span>
          <span className="absolute -top-[5px] -right-[5px] text-[10px] text-[var(--border-subtle)] leading-none font-mono select-none pointer-events-none">+</span>
          <span className="absolute -bottom-[5px] -left-[5px] text-[10px] text-[var(--border-subtle)] leading-none font-mono select-none pointer-events-none">+</span>
          <span className="absolute -bottom-[5px] -right-[5px] text-[10px] text-[var(--border-subtle)] leading-none font-mono select-none pointer-events-none">+</span>
        </>
      )}
      {children}
    </div>
  );
};

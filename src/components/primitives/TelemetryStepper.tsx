import React, { useEffect, useRef, useState } from 'react';

interface TelemetryStepperProps {
  activeStep: number; // 0-3
  
}

const STEPS = ['AUDIT', 'ENSEMBLE', 'ARRIVAL', 'RUNWAY'];

export const TelemetryStepper: React.FC<TelemetryStepperProps> = ({ activeStep }) => {
  const [animating, setAnimating] = useState(false);
  const prevStep = useRef(activeStep);

  useEffect(() => {
    if (activeStep !== prevStep.current) {
      prevStep.current = activeStep;
      setAnimating(true);
      const t = setTimeout(() => setAnimating(false), 180);
      return () => clearTimeout(t);
    }
  }, [activeStep]);

  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((step, i) => {
        const isActive = i === activeStep;
        const isPast = i < activeStep;
        return (
          <React.Fragment key={step}>
            {i > 0 && (
              <div className="flex-1 h-px bg-[var(--border-hairline)] mx-2" />
            )}
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`
                  text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border
                  transition-all duration-150
                  ${isActive
                    ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                    : isPast
                      ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/30'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)] border-[var(--border-hairline)]'
                  }
                  ${animating && isActive ? 'animate-pulse' : ''}
                `}
              >
                {String(i + 1).padStart(2, '0')} {step}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

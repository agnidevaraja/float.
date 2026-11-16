import React from 'react';

export interface SegmentedTabItem<T extends string> {
  id: T;
  label: string;
  badge?: string;
}

interface SegmentedTabsProps<T extends string> {
  tabs: SegmentedTabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  className?: string;
}

export function SegmentedTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  className = '',
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label="Section sub-navigation"
      className={`w-full p-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-wrap sm:flex-nowrap items-center gap-1.5 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex-1 min-w-fit px-4 py-2 rounded-full text-xs font-display font-semibold tracking-wide transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap ${
              isActive
                ? 'bg-[var(--accent-primary)] text-white shadow-sm border border-[var(--accent-primary)]'
                : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-transparent'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)] border border-[var(--border-hairline)]'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

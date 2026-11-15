import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  SlidersHorizontal,
  MessageSquare,
  TrendingUp,
  Shield,
  Table2,
  BarChart3,
  Settings,
  Palette,
  Download,
  Eye,
  RotateCcw,
  FileText,
  Check,
  Briefcase,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ThemeState, ThemePreset } from '../store/themeStore';
import { useWorkspace } from '../store/workspaceStore';

interface CommandItem {
  id: string;
  category: 'NAVIGATION' | 'THEME' | 'ACTION' | 'ACCESSIBILITY';
  label: string;
  detail?: string;
  shortcut?: string;
  icon: React.ElementType;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  themeState?: ThemeState;
  onThemeUpdate?: (patch: Partial<ThemeState>) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  themeState,
  onThemeUpdate,
}) => {
  const navigate = useNavigate();
  const { state, dispatch } = useWorkspace();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleExportPortfolio = () => {
    const headers = ['Client', 'Amount', 'Terms', 'RiskPercent', 'ExpectedArrivalDay', 'Status'];
    const rows = state.ledger.map((l) => [
      `"${l.clientName}"`,
      l.invoiceAmount,
      l.paymentTermDays,
      l.riskPercent.toFixed(1),
      l.expectedArrivalDay,
      l.status,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veritas-portfolio-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const commands: CommandItem[] = [
    // Views
    {
      id: 'deal',
      category: 'NAVIGATION',
      label: 'Deal Underwriting Intake',
      detail: 'Score B2B invoices with calibrated late payment probability',
      shortcut: '1',
      icon: SlidersHorizontal,
      action: () => { navigate('/workspace/deal'); onClose(); },
    },
    {
      id: 'runway',
      category: 'NAVIGATION',
      label: 'Cash Flow & Runway Lab',
      detail: 'Simulate 60-day treasury burn, AP payments, and bank limits',
      shortcut: '2',
      icon: TrendingUp,
      action: () => { navigate('/workspace/runway'); onClose(); },
    },
    {
      id: 'ageing',
      category: 'NAVIGATION',
      label: 'Ageing Matrix & Batch Ledger',
      detail: 'View overdue buckets, concentration risk, and debtor ledger',
      shortcut: '3',
      icon: Table2,
      action: () => { navigate('/workspace/ageing'); onClose(); },
    },
    {
      id: 'gst',
      category: 'NAVIGATION',
      label: 'GST Compliance & ITC Lockup',
      detail: 'Section 16(2) statutory 180-day clock and TDS 26AS recovery',
      shortcut: '4',
      icon: Shield,
      action: () => { navigate('/workspace/gst'); onClose(); },
    },
    {
      id: 'copilot',
      category: 'NAVIGATION',
      label: 'AI Risk Copilot Advisory',
      detail: 'Grounded Qwen-7B advisory on deal risk factors and statutory rules',
      shortcut: '5',
      icon: MessageSquare,
      action: () => { navigate('/workspace/copilot'); onClose(); },
    },
    {
      id: 'business-planner',
      category: 'NAVIGATION',
      label: 'Business Data & Expansion Planner',
      detail: 'Import historical invoices, fine-tune adapter, and plan expansion',
      shortcut: '6',
      icon: Briefcase,
      action: () => { navigate('/workspace/business-planner'); onClose(); },
    },
    {
      id: 'settings',
      category: 'NAVIGATION',
      label: 'Enterprise Settings & Bridge',
      detail: 'Configure model API bridge, treasury defaults, and WCAG settings',
      shortcut: '7',
      icon: Settings,
      action: () => { navigate('/workspace/settings'); onClose(); },
    },
    {
      id: 'benchmarks',
      category: 'NAVIGATION',
      label: 'Model Benchmarks & Honesty Audit',
      detail: 'Audited ROC-AUC, PR-AUC, F1 metrics and Startup Fairness Check',
      shortcut: '8',
      icon: BarChart3,
      action: () => { navigate('/workspace/benchmarks'); onClose(); },
    },
    {
      id: 'report',
      category: 'NAVIGATION',
      label: 'Executive Underwriting Report',
      detail: 'Printable executive summary and deal risk factor breakdown',
      shortcut: 'R',
      icon: FileText,
      action: () => { navigate('/workspace/deal'); onClose(); },
    },

    // Theme Switches
    {
      id: 'theme-obsidian',
      category: 'THEME',
      label: 'Theme: Obsidian Blueprint',
      detail: 'Dark technical canvas with cobalt accents',
      icon: Palette,
      action: () => {
        onThemeUpdate?.({ theme: 'obsidian', customAccent: null });
        onClose();
      },
    },
    {
      id: 'theme-slate',
      category: 'THEME',
      label: 'Theme: Institutional Slate',
      detail: 'High-clarity neutral daylight canvas with emerald accents',
      icon: Palette,
      action: () => {
        onThemeUpdate?.({ theme: 'slate', customAccent: null });
        onClose();
      },
    },
    {
      id: 'theme-ledger',
      category: 'THEME',
      label: 'Theme: Ledger Paper',
      detail: 'Warm financial tone with amber risk highlights',
      icon: Palette,
      action: () => {
        onThemeUpdate?.({ theme: 'ledger', customAccent: null });
        onClose();
      },
    },
    {
      id: 'theme-terminal',
      category: 'THEME',
      label: 'Theme: Swiss Terminal',
      detail: 'High-contrast monochromatic dark mode with orange safety cues',
      icon: Palette,
      action: () => {
        onThemeUpdate?.({ theme: 'terminal', customAccent: null });
        onClose();
      },
    },

    // Actions & Accessibility
    {
      id: 'action-export',
      category: 'ACTION',
      label: 'Export Portfolio Report (CSV)',
      detail: 'Download full ledger of saved deals with AI arrival projections',
      icon: Download,
      action: () => { handleExportPortfolio(); onClose(); },
    },
    {
      id: 'action-reset',
      category: 'ACTION',
      label: 'Reset Deal Intake to Treasury Defaults',
      detail: 'Clear current form and reload configured baseline',
      icon: RotateCcw,
      action: () => { dispatch({ type: 'RESET_INTAKE' }); onClose(); },
    },
    {
      id: 'a11y-tabular',
      category: 'ACCESSIBILITY',
      label: 'Toggle Tabular Chart Mode (WCAG AA)',
      detail: 'Render accessible HTML data tables under all ECharts charts',
      icon: Eye,
      action: () => {
        if (themeState && onThemeUpdate) {
          onThemeUpdate({ showTabularCharts: !themeState.showTabularCharts });
        }
        onClose();
      },
    },
    {
      id: 'a11y-contrast',
      category: 'ACCESSIBILITY',
      label: 'Toggle High-Contrast Hairline Borders',
      detail: 'Boost border luminance to 7:1 AAA contrast',
      icon: Eye,
      action: () => {
        if (themeState && onThemeUpdate) {
          onThemeUpdate({ highContrastBorders: !themeState.highContrastBorders });
        }
        onClose();
      },
    },
  ];

  const filtered = query
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.detail?.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }
    inputRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, filtered, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
          <Search className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, navigate views, or toggle theme..."
            className="flex-1 bg-transparent text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
          />
          <kbd className="text-[9px] font-mono text-[var(--text-tertiary)] border border-[var(--border-hairline)] px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* List of Commands */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-[var(--border-hairline)] p-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs font-mono text-[var(--text-tertiary)]">
              No matching commands or navigation routes for "{query}"
            </div>
          ) : (
            filtered.map((cmd, index) => {
              const Icon = cmd.icon;
              const isSelected = selectedIndex === index;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-[var(--bg-elevated)] border-l-2 border-l-[var(--accent-primary)]'
                      : 'hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium font-sans text-[var(--text-primary)]">
                        {cmd.label}
                      </span>
                      {cmd.shortcut && (
                        <kbd className="text-[9px] font-mono text-[var(--text-tertiary)] border border-[var(--border-hairline)] px-1 py-0.5 ml-2">
                          ⌘{cmd.shortcut}
                        </kbd>
                      )}
                    </div>
                    {cmd.detail && (
                      <div className="text-[10px] font-mono text-[var(--text-muted)] truncate mt-0.5">
                        {cmd.detail}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info strip */}
        <div className="flex items-center justify-between px-3.5 py-2 border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[10px] font-mono text-[var(--text-tertiary)]">
          <span>Use ↑↓ to navigate, Enter to select</span>
          <span>{filtered.length} commands available</span>
        </div>
      </div>
    </div>
  );
};

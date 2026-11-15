import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, SlidersHorizontal, MessageSquare, TrendingUp, Shield, Table2, BarChart3, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface CommandItem {
  id: string;
  label: string;
  shortcut: string;
  icon: React.ElementType;
  action: () => void;
}

export const CommandPalette: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const commands: CommandItem[] = [
    { id: 'deal', label: 'Deal Underwriting', shortcut: '1', icon: SlidersHorizontal, action: () => { navigate('/workspace/deal'); onClose(); } },
    { id: 'copilot', label: 'AI Risk Copilot', shortcut: '2', icon: MessageSquare, action: () => { navigate('/workspace/copilot'); onClose(); } },
    { id: 'runway', label: '60-Day Runway Collision Lab', shortcut: '3', icon: TrendingUp, action: () => { navigate('/workspace/runway'); onClose(); } },
    { id: 'gst', label: 'GST & Vendor Anomaly Shield', shortcut: '4', icon: Shield, action: () => { navigate('/workspace/gst'); onClose(); } },
    { id: 'ageing', label: 'Ageing Matrix & Batch Ledger', shortcut: '5', icon: Table2, action: () => { navigate('/workspace/ageing'); onClose(); } },
    { id: 'benchmarks', label: 'Benchmarks & Honesty Audit', shortcut: '6', icon: BarChart3, action: () => { navigate('/workspace/benchmarks'); onClose(); } },
    { id: 'settings', label: 'Settings & Bridge', shortcut: '7', icon: Settings, action: () => { navigate('/workspace/settings'); onClose(); } },
  ];

  const filtered = query ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase())) : commands;

  useEffect(() => {
    if (!isOpen) { setQuery(''); return; }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[560px] max-h-[400px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-hairline)]">
          <Search className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Navigate to..." className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none font-mono" />
          <kbd className="text-[9px] font-mono text-[var(--text-tertiary)] border border-[var(--border-hairline)] px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="overflow-y-auto p-2">
          {filtered.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <button key={cmd.id} onClick={cmd.action} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--bg-elevated)] transition-colors border-b border-[var(--border-hairline)] last:border-b-0">
                <Icon className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                <span className="text-xs text-[var(--text-primary)] flex-1">{cmd.label}</span>
                <kbd className="text-[9px] font-mono text-[var(--text-tertiary)] border border-[var(--border-hairline)] px-1.5 py-0.5">{cmd.shortcut}</kbd>
              </button>
            );
          })}
          {filtered.length === 0 && <div className="px-3 py-6 text-center text-[11px] text-[var(--text-tertiary)]">No results for "{query}"</div>}
        </div>
      </div>
    </div>
  );
};

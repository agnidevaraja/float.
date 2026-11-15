import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SlidersHorizontal, TrendingUp, Shield, Table2, BarChart3, Settings, MessageSquare, PanelLeft, Building2, Briefcase } from 'lucide-react';
import { useWorkspace } from '../../store/workspaceStore';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'deal', label: 'Deal Underwriting', icon: SlidersHorizontal, path: '/workspace/deal' },
  { id: 'runway', label: 'Cash Flow & Runway', icon: TrendingUp, path: '/workspace/runway' },
  { id: 'ageing', label: 'Ageing Matrix & Ledger', icon: Table2, path: '/workspace/ageing' },
  { id: 'gst', label: 'GST Compliance & ITC', icon: Shield, path: '/workspace/gst' },
  { id: 'copilot', label: 'AI Risk Copilot', icon: MessageSquare, path: '/workspace/copilot' },
  { id: 'business-planner', label: 'Business & Planning', icon: Briefcase, path: '/workspace/business-planner' },
  { id: 'settings', label: 'Settings & Bridge', icon: Settings, path: '/workspace/settings' },
  { id: 'benchmarks', label: 'Model Benchmarks', icon: BarChart3, path: '/workspace/benchmarks' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const CollapsibleSidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useWorkspace();

  if (collapsed) {
    return (
      <aside className="w-[60px] shrink-0 border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col items-center py-3 gap-1">
        <div className="w-7 h-7 border border-[var(--border-subtle)] flex items-center justify-center mb-3">
          <span className="text-[10px] font-bold text-[var(--accent-primary)]">V</span>
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button key={item.id} onClick={() => navigate(item.path)} className={`w-10 h-10 flex items-center justify-center border transition-colors ${isActive ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10' : 'border-transparent hover:border-[var(--border-hairline)]'}`} title={item.label}>
              <Icon className="w-[18px] h-[18px] text-[var(--text-muted)]" />
            </button>
          );
        })}
        <button onClick={onToggle} className="mt-auto w-10 h-10 flex items-center justify-center border border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)]">
          <PanelLeft className="w-4 h-4 text-[var(--text-tertiary)]" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-60 shrink-0 border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col select-none">
      <div className="h-12 border-b border-[var(--border-hairline)] px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-[var(--border-subtle)] flex items-center justify-center">
            <span className="text-[10px] font-bold text-[var(--accent-primary)]">V</span>
          </div>
          <span className="text-xs font-semibold tracking-wider uppercase">Veritas</span>
        </div>
        <button onClick={onToggle} className="p-1 hover:bg-[var(--bg-elevated)]">
          <PanelLeft className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button key={item.id} onClick={() => navigate(item.path)} className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors border ${isActive ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'}`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      {/* Active Enterprise Identity Badge */}
      {state.enterpriseProfile && (
        <div
          onClick={() => navigate('/workspace/settings')}
          className="mx-2 mb-2 p-2 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--accent-primary)] cursor-pointer transition-colors"
          title="Click to view & edit Enterprise Profile"
        >
          <div className="flex items-center justify-between text-[10px] font-mono mb-1">
            <span className="text-[var(--accent-primary)] font-semibold flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span>ENTERPRISE</span>
            </span>
            <span className="text-[9px] text-[var(--accent-safe)] border border-[var(--border-hairline)] px-1 bg-[var(--bg-surface)]">
              {state.enterpriseProfile.msmeCategory}
            </span>
          </div>
          <div className="text-xs font-bold text-[var(--text-primary)] truncate">
            {state.enterpriseProfile.tradingBrandName || state.enterpriseProfile.companyName}
          </div>
          <div className="text-[9px] font-mono text-[var(--text-tertiary)] truncate mt-0.5">
            CC: ₹{(state.enterpriseProfile.sanctionedCcLimit / 100000).toFixed(1)}L @ {state.enterpriseProfile.bankOdInterestRate}%
          </div>
        </div>
      )}
      <div className="p-3 border-t border-[var(--border-hairline)]">
        <div className="text-[9px] font-mono text-[var(--text-tertiary)] text-center leading-relaxed">
          Trained on 360,646 records.<br />Not financial advice.
        </div>
      </div>
    </aside>
  );
};

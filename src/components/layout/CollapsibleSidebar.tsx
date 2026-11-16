import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  SlidersHorizontal,
  TrendingUp,
  Shield,
  Table2,
  BarChart3,
  Settings,
  MessageSquare,
  PanelLeft,
  Building2,
  Briefcase,
} from 'lucide-react';
import { useWorkspace } from '../../store/workspaceStore';
import { Wordmark } from '../common/Wordmark';
import { FLOAT_METRICS } from '../../utils/metrics';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  section: 'core' | 'system';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'deal', label: 'Deal Underwriting', icon: SlidersHorizontal, path: '/workspace/deal', section: 'core' },
  { id: 'runway', label: 'Cash Flow & Runway', icon: TrendingUp, path: '/workspace/runway', section: 'core' },
  { id: 'ageing', label: 'Ageing Matrix & Ledger', icon: Table2, path: '/workspace/ageing', section: 'core' },
  { id: 'gst', label: 'GST Compliance & ITC', icon: Shield, path: '/workspace/gst', section: 'core' },
  { id: 'copilot', label: 'Treasury Advisory Copilot', icon: MessageSquare, path: '/workspace/copilot', section: 'core' },
  { id: 'business-planner', label: 'Business & Planning', icon: Briefcase, path: '/workspace/business-planner', section: 'core' },
  { id: 'benchmarks', label: 'Model Benchmarks', icon: BarChart3, path: '/workspace/benchmarks', section: 'system' },
  { id: 'settings', label: 'Settings & Bridge', icon: Settings, path: '/workspace/settings', section: 'system' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const CollapsibleSidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useWorkspace();

  const coreItems = NAV_ITEMS.filter((item) => item.section === 'core');
  const systemItems = NAV_ITEMS.filter((item) => item.section === 'system');

  const isItemActive = (path: string) =>
    location.pathname === path || (path === '/workspace/deal' && location.pathname === '/workspace');

  if (collapsed) {
    return (
      <aside className="w-[64px] shrink-0 border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col items-center py-3 gap-1.5">
        <div
          onClick={() => navigate('/')}
          className="w-9 h-9 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-center mb-2 cursor-pointer"
          title="float. - Treasury & Receivables Platform"
        >
          <Wordmark collapsed />
        </div>
        {coreItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-150 ${
                isActive
                  ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)]'
              }`}
              title={item.label}
            >
              <Icon className="w-[18px] h-[18px]" />
            </button>
          );
        })}
        <div className="w-6 h-px bg-[var(--border-hairline)] my-1.5" />
        {systemItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-150 ${
                isActive
                  ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)]'
              }`}
              title={item.label}
            >
              <Icon className="w-[18px] h-[18px]" />
            </button>
          );
        })}
        <button
          onClick={onToggle}
          className="mt-auto w-10 h-10 rounded-xl flex items-center justify-center border border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)]"
          title="Expand Sidebar"
        >
          <PanelLeft className="w-4 h-4 text-[var(--text-tertiary)]" />
        </button>
      </aside>
    );
  }

  const renderButton = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = isItemActive(item.path);
    return (
      <button
        key={item.id}
        onClick={() => navigate(item.path)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-full text-xs font-sans transition-all duration-150 active:scale-[0.98] border ${
          isActive
            ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-semibold shadow-xs'
            : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] font-medium'
        }`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--accent-primary)]' : ''}`} />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <aside className="w-64 shrink-0 border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col select-none">
      <div className="h-14 border-b border-[var(--border-hairline)] px-4 flex items-center justify-between">
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer"
          title="Return to Landing Page"
        >
          <Wordmark size="md" showSubtitle />
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)]"
          title="Collapse Sidebar (Ctrl+B)"
        >
          <PanelLeft className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        <div>
          <div className="px-3 mb-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            CORE WORKFLOW
          </div>
          <div className="space-y-1">{coreItems.map(renderButton)}</div>
        </div>

        <div className="pt-2 border-t border-[var(--border-hairline)]">
          <div className="px-3 mb-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            CALIBRATION &amp; SYSTEM
          </div>
          <div className="space-y-1">{systemItems.map(renderButton)}</div>
        </div>
      </nav>

      {/* Active Enterprise Identity Badge */}
      {state.enterpriseProfile && (
        <div
          onClick={() => navigate('/workspace/settings')}
          className="mx-3 mb-2.5 p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--accent-primary)] cursor-pointer transition-all duration-150"
          title="Click to view & edit Enterprise Profile"
        >
          <div className="flex items-center justify-between text-[10px] font-sans mb-1">
            <span className="text-[var(--accent-primary)] font-semibold flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span>ENTERPRISE</span>
            </span>
            <span className="text-[9px] font-mono text-[var(--accent-safe)] border border-[var(--border-hairline)] rounded-full px-2 py-0.5 bg-[var(--bg-surface)]">
              {state.enterpriseProfile.msmeCategory}
            </span>
          </div>
          <div className="text-xs font-sans font-bold text-[var(--text-primary)] truncate">
            {state.enterpriseProfile.tradingBrandName || state.enterpriseProfile.companyName || 'Your Enterprise'}
          </div>
          <div className="text-[10px] font-mono text-[var(--text-tertiary)] truncate mt-0.5 tabular-nums">
            {state.enterpriseProfile.sanctionedCcLimit > 0
              ? `CC: ₹${(state.enterpriseProfile.sanctionedCcLimit / 100000).toFixed(1)}L @ ${state.enterpriseProfile.bankOdInterestRate}%`
              : state.treasuryDefaults.currentBankBalance > 0
              ? `Cash: ₹${(state.treasuryDefaults.currentBankBalance / 100000).toFixed(1)}L`
              : 'Blank workspace • Click to configure'}
          </div>
        </div>
      )}

      <div className="p-3 border-t border-[var(--border-hairline)]">
        <div className="text-[10px] font-sans text-[var(--text-tertiary)] text-center leading-relaxed">
          <span className="font-mono text-[var(--text-muted)]">{FLOAT_METRICS.dataSourcesCount}</span> Sources •{' '}
          <span className="font-mono text-[var(--text-muted)]">{FLOAT_METRICS.totalRecordsFormatted}</span> Records •{' '}
          <span className="font-mono text-[var(--text-muted)]">{FLOAT_METRICS.featuresCount}</span> Features
          <br />
          ROC-AUC <span className="font-mono text-[var(--text-muted)]">{FLOAT_METRICS.rocAucFormatted}</span> • Not financial advice.
        </div>
      </div>
    </aside>
  );
};

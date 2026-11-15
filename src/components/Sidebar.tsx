import React from 'react';
import { SCENARIO_PRESETS } from '../data/scenarios';
import type { ScenarioPreset } from '../data/scenarios';
import { Layers, ShieldAlert, Cpu } from 'lucide-react';

interface SidebarProps {
  activeScenarioId: string | null;
  onSelectScenario: (scenario: ScenarioPreset) => void;
  gstRegistered: boolean;
  onToggleGst: () => void;
  isThinFile: boolean;
  onOpenAudit: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeScenarioId,
  onSelectScenario,
  gstRegistered,
  onToggleGst,
  isThinFile,
  onOpenAudit
}) => {
  return (
    <aside className="w-64 border-r border-canvas-border bg-canvas-panel flex flex-col justify-between p-4 select-none shrink-0">
      <div>
        {/* Section Title */}
        <div className="flex items-center space-x-2 text-[11px] font-mono uppercase text-brand-tertiary mb-3 tracking-wider">
          <Layers className="w-3.5 h-3.5" />
          <span>Judge Verification Scenarios</span>
        </div>

        {/* Preset Buttons */}
        <div className="space-y-2">
          {SCENARIO_PRESETS.map((sc) => {
            const isActive = activeScenarioId === sc.id;
            let badgeColorClass = 'text-status-emerald border-status-emerald/30 bg-status-emerald/10';
            if (sc.badgeType === 'amber') badgeColorClass = 'text-status-amber border-status-amber/30 bg-status-amber/10';
            if (sc.badgeType === 'rose') badgeColorClass = 'text-status-rose border-status-rose/30 bg-status-rose/10';
            if (sc.badgeType === 'sky') badgeColorClass = 'text-status-sky border-status-sky/30 bg-status-sky/10';

            return (
              <button
                key={sc.id}
                onClick={() => onSelectScenario(sc)}
                className={`w-full text-left p-2.5 rounded border transition-all ${
                  isActive
                    ? 'bg-canvas-card border-canvas-focused ring-1 ring-canvas-focused'
                    : 'bg-canvas-panel border-canvas-border hover:bg-canvas-card/70 hover:border-canvas-focused/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-brand-primary">{sc.name}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${badgeColorClass}`}>
                    {sc.badge}
                  </span>
                </div>
                <p className="text-[11px] text-brand-muted leading-tight line-clamp-2">
                  {sc.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* System Add-Ons */}
        <div className="mt-6 pt-5 border-t border-canvas-border space-y-4">
          <div className="text-[11px] font-mono uppercase text-brand-tertiary tracking-wider">
            Connected Add-Ons
          </div>

          {/* GST Toggle Switch */}
          <div className="p-3 rounded bg-canvas-card border border-canvas-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-brand-primary">GST / Tax Shield</span>
              <button
                onClick={onToggleGst}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-[2px] border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  gstRegistered ? 'bg-status-emerald' : 'bg-canvas-border'
                }`}
                role="switch"
                aria-checked={gstRegistered}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-[2px] bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    gstRegistered ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[10px] text-brand-muted leading-relaxed">
              {gstRegistered
                ? 'Active: Includes 18% Input Tax Credit freeze risk on vendor invoice.'
                : 'Inactive: Standard gross principal risk mode.'}
            </p>
          </div>

          {/* Thin-File Fairness Indicator */}
          <div className="p-3 rounded bg-canvas-card border border-canvas-border">
            <div className="flex items-center space-x-1.5 text-xs font-medium text-brand-primary mb-1">
              <Cpu className="w-3.5 h-3.5 text-status-sky" />
              <span>Startup Fairness Shield</span>
            </div>
            <p className="text-[10px] text-brand-muted leading-relaxed">
              {isThinFile
                ? 'Engaged: Counterparty is under 12 months. Age penalty suppressed; scoring uses behavioral ratios.'
                : 'Established Firm mode: Full corporate operating tenure calibrated.'}
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-canvas-border">
        <button
          onClick={onOpenAudit}
          className="w-full py-2 px-3 text-xs rounded border border-canvas-border bg-canvas-card hover:bg-canvas-hover text-brand-muted hover:text-brand-primary flex items-center justify-center space-x-1.5"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>float. Blind Audit</span>
        </button>
        <p className="text-[9px] text-brand-tertiary text-center mt-2">
          Trained on 374,284 public records across 6 Data Sources (59 Features). Not financial advice.
        </p>
      </div>
    </aside>
  );
};

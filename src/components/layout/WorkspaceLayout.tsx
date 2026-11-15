import React, { useState, useCallback, useEffect } from 'react';
import type { DealInput, RiskEvaluationResult, ScenarioPreset } from '../../types';
import { evaluateB2bPaymentRisk } from '../../engine/riskEngine';
import { SCENARIO_PRESETS } from '../../data/scenarios';
import { THEME_PRESETS, FONT_PAIRINGS, DENSITY_PADDING, loadThemeState, saveThemeState, type ThemeState } from '../../store/themeStore';
import { CollapsibleSidebar } from './CollapsibleSidebar';
import { TopTelemetryBar } from './TopTelemetryBar';
import { View01DealWorkbench } from '../views/View01DealWorkbench';
import { View02RunwayLab } from '../views/View02RunwayLab';
import { View03GstShield } from '../views/View03GstShield';
import { View04AgeingMatrix } from '../views/View04AgeingMatrix';
import { View05Benchmarks } from '../views/View05Benchmarks';
import { View06Settings } from '../views/View06Settings';

const DEFAULT_DEAL_INPUT: DealInput = {
  invoiceAmount: 125000, paymentTermDays: 30, customerTenureMonths: 14,
  pastLatePercent: 30, orderSizeVsAvg: 1.8, pastAvgDelayDays: 8,
  dueWeekday: 'Mon', macroStressMultiplier: 1.0, gstRegistered: true,
  currentBankBalance: 250000, monthlyFixedExpenses: 160000,
};

export const WorkspaceLayout: React.FC = () => {
  const location = window.location;
  const viewId = location.pathname.replace('/workspace', '').replace('/', '') || 'deal';
  const [dealInput, setDealInput] = useState<DealInput>(DEFAULT_DEAL_INPUT);
  const [themeState, setThemeState] = useState<ThemeState>(() => loadThemeState());

  const handleInputChange = useCallback((updated: Partial<DealInput>) => {
    setDealInput((prev) => ({ ...prev, ...updated }));
  }, []);

  const handleLoadScenario = useCallback((scenario: ScenarioPreset) => {
    setDealInput({ ...scenario.params });
  }, []);

  const handleThemeUpdate = useCallback((patch: Partial<ThemeState>) => {
    setThemeState((prev) => {
      const next = { ...prev, ...patch };
      saveThemeState(next);
      return next;
    });
  }, []);

  const result = evaluateB2bPaymentRisk(dealInput);

  // Apply theme CSS variables to document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    const tokens = THEME_PRESETS[themeState.theme];
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    root.style.setProperty('--accent-primary', themeState.customAccent || tokens['--accent-primary']);
    const fonts = FONT_PAIRINGS[themeState.fontPairing];
    root.style.setProperty('--font-display', fonts.display);
    root.style.setProperty('--font-sans', fonts.ui);
    root.style.setProperty('--font-mono', fonts.mono);
    root.style.setProperty('--cell-padding', `${DENSITY_PADDING[themeState.density]}px`);
  }, [themeState]);

  const renderView = () => {
    switch (viewId) {
      case 'runway':
        return <View02RunwayLab input={dealInput} onInputChange={handleInputChange} result={result} />;
      case 'gst':
        return <View03GstShield input={dealInput} result={result} />;
      case 'ageing':
        return <View04AgeingMatrix input={dealInput} result={result} onLoadInvoice={handleInputChange} scenarioPresets={SCENARIO_PRESETS} />;
      case 'benchmarks':
        return <View05Benchmarks result={result} />;
      case 'settings':
        return <View06Settings themeState={themeState} onThemeUpdate={handleThemeUpdate} />;
      default:
        return <View01DealWorkbench input={dealInput} onInputChange={handleInputChange} result={result} onLoadScenario={handleLoadScenario} scenarioPresets={SCENARIO_PRESETS} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <CollapsibleSidebar activeView={viewId} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopTelemetryBar activeView={viewId} onLoadScenario={handleLoadScenario} scenarioPresets={SCENARIO_PRESETS} themeState={themeState} onThemeUpdate={handleThemeUpdate} />
        <main className="flex-1 overflow-y-auto p-5">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

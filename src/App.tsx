import React, { useState, useMemo } from 'react';
import type { DealInput, CurrencyMode } from './types';
import type { ScenarioPreset } from './data/scenarios';
import { evaluateB2bPaymentRisk } from './engine/riskEngine';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DealParametersForm } from './components/DealParametersForm';
import { RiskArrivalCenter } from './components/RiskArrivalCenter';
import { RunwayCollisionRight } from './components/RunwayCollisionRight';
import { JudgeAuditModal } from './components/JudgeAuditModal';
import { BatchCsvModal } from './components/BatchCsvModal';

const DEFAULT_DEAL_INPUT: DealInput = {
  invoiceAmount: 125000,
  paymentTermDays: 30,
  customerTenureMonths: 14,
  pastLatePercent: 30,
  orderSizeVsAvg: 1.8,
  pastAvgDelayDays: 8,
  dueWeekday: 'Mon',
  macroStressMultiplier: 1.0,
  gstRegistered: true,
  currentBankBalance: 250000,
  monthlyFixedExpenses: 160000
};

export const App: React.FC = () => {
  const [dealInput, setDealInput] = useState<DealInput>(DEFAULT_DEAL_INPUT);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>('moderate_client');
  const [currency, setCurrency] = useState<CurrencyMode>('INR');
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isCsvOpen, setIsCsvOpen] = useState(false);

  // Dynamic evaluation using pure client-side mathematical engine
  const evaluationResult = useMemo(() => {
    return evaluateB2bPaymentRisk(dealInput);
  }, [dealInput]);

  const handleInputChange = (updated: Partial<DealInput>) => {
    setActiveScenarioId(null); // Clear preset highlight on custom tweak
    setDealInput((prev) => ({ ...prev, ...updated }));
  };

  const handleSelectScenario = (scenario: ScenarioPreset) => {
    setActiveScenarioId(scenario.id);
    setDealInput(scenario.params);
  };

  const handleToggleGst = () => {
    setDealInput((prev) => ({ ...prev, gstRegistered: !prev.gstRegistered }));
  };

  const handleReset = () => {
    setActiveScenarioId('moderate_client');
    setDealInput(DEFAULT_DEAL_INPUT);
  };

  const handleLoadCsvInvoice = (partialInput: Partial<DealInput>) => {
    setActiveScenarioId(null);
    setDealInput((prev) => ({ ...prev, ...partialInput }));
  };

  return (
    <div className="min-h-screen bg-canvas-deep text-brand-primary flex flex-col font-sans selection:bg-status-sky/30 selection:text-white">
      {/* Top Global Utility Header */}
      <Header
        currency={currency}
        onCurrencyToggle={() => setCurrency((prev) => (prev === 'INR' ? 'USD' : 'INR'))}
        onOpenAudit={() => setIsAuditOpen(true)}
        onOpenCsv={() => setIsCsvOpen(true)}
        onReset={handleReset}
        macroSpread={evaluationResult.liveSpread}
        macroDelinq={evaluationResult.liveDelinquency}
      />

      {/* Main Container: Sidebar + 3-Column Workstation */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Utility Rail */}
        <Sidebar
          activeScenarioId={activeScenarioId}
          onSelectScenario={handleSelectScenario}
          gstRegistered={dealInput.gstRegistered}
          onToggleGst={handleToggleGst}
          isThinFile={evaluationResult.thinFileMode}
          onOpenAudit={() => setIsAuditOpen(true)}
        />

        {/* Workstation Grid */}
        <main className="flex-1 overflow-y-auto p-5">
          <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Column 1: Deal Parameters & Inputs (4 cols on lg) */}
            <div className="lg:col-span-4">
              <DealParametersForm
                input={dealInput}
                currency={currency}
                onChange={handleInputChange}
                warnings={evaluationResult.integrityWarnings}
              />
            </div>

            {/* Column 2: Risk Scoring, Arrival Curve & Restructuring (4 cols on lg) */}
            <div className="lg:col-span-4">
              <RiskArrivalCenter
                result={evaluationResult}
                promisedDays={dealInput.paymentTermDays}
              />
            </div>

            {/* Column 3: 60-Day Runway Matrix & GST Shield (4 cols on lg) */}
            <div className="lg:col-span-4">
              <RunwayCollisionRight
                result={evaluationResult}
                currency={currency}
                monthlyExpenses={dealInput.monthlyFixedExpenses}
                bankBalance={dealInput.currentBankBalance}
                gstRegistered={dealInput.gstRegistered}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Slide-Over Technical Audit Drawer */}
      <JudgeAuditModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
      />

      {/* Batch CSV Parser Modal */}
      <BatchCsvModal
        isOpen={isCsvOpen}
        onClose={() => setIsCsvOpen(false)}
        onLoadInvoice={handleLoadCsvInvoice}
      />
    </div>
  );
};

export default App;

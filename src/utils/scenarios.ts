import type { DealInput } from '../types/deal';

export interface ScenarioPreset {
  id: string;
  name: string;
  badge: string;
  badgeType: 'emerald' | 'amber' | 'rose' | 'sky';
  description: string;
  params: DealInput;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'safe_client',
    name: '1. Safe Repeat Client',
    badge: 'LOW RISK',
    badgeType: 'emerald',
    description: '36-month verified client, 0% past delinquency, steady 1.0x order volume.',
    params: {
      invoiceAmount: 80000,
      paymentTermDays: 30,
      customerTenureMonths: 36,
      pastLatePercent: 0,
      orderSizeVsAvg: 1.0,
      pastAvgDelayDays: 0,
      dueWeekday: 'Thu',
      macroStressMultiplier: 1.0,
      gstRegistered: true,
      currentBankBalance: 500000,
      monthlyFixedExpenses: 150000
    }
  },
  {
    id: 'moderate_client',
    name: '2. Moderate Risk Client',
    badge: 'MEDIUM RISK',
    badgeType: 'amber',
    description: '14-month client, 30% late frequency, 1.8x order spike, 5-day average delay.',
    params: {
      invoiceAmount: 140000,
      paymentTermDays: 30,
      customerTenureMonths: 14,
      pastLatePercent: 30,
      orderSizeVsAvg: 1.8,
      pastAvgDelayDays: 5,
      dueWeekday: 'Fri',
      macroStressMultiplier: 1.0,
      gstRegistered: true,
      currentBankBalance: 250000,
      monthlyFixedExpenses: 160000
    }
  },
  {
    id: 'high_risk_client',
    name: '3. High-Risk Late Client',
    badge: 'HIGH RISK',
    badgeType: 'rose',
    description: '18-month tenure, 75% late history, 3.2x billing surge, 18-day average delay.',
    params: {
      invoiceAmount: 250000,
      paymentTermDays: 45,
      customerTenureMonths: 18,
      pastLatePercent: 75,
      orderSizeVsAvg: 3.2,
      pastAvgDelayDays: 18,
      dueWeekday: 'Mon',
      macroStressMultiplier: 1.0,
      gstRegistered: true,
      currentBankBalance: 200000,
      monthlyFixedExpenses: 180000
    }
  },
  {
    id: 'recession_shock',
    name: '4. Macro Recession Shock',
    badge: 'RECESSION 1.6X',
    badgeType: 'sky',
    description: 'Scenario 3 under 1.6x Federal Reserve corporate bond spread & delinquency stress.',
    params: {
      invoiceAmount: 250000,
      paymentTermDays: 45,
      customerTenureMonths: 18,
      pastLatePercent: 75,
      orderSizeVsAvg: 3.2,
      pastAvgDelayDays: 18,
      dueWeekday: 'Mon',
      macroStressMultiplier: 1.6,
      gstRegistered: true,
      currentBankBalance: 200000,
      monthlyFixedExpenses: 180000
    }
  },
  {
    id: 'shell_vendor',
    name: '5. Shell-Vendor Anomaly',
    badge: 'ANOMALY ALERT',
    badgeType: 'rose',
    description: '2-month unverified counterparty, 4.5x order surge, Sunday settlement drift, high ITC exposure.',
    params: {
      invoiceAmount: 650000,
      paymentTermDays: 15,
      customerTenureMonths: 2,
      pastLatePercent: 80,
      orderSizeVsAvg: 4.5,
      pastAvgDelayDays: 25,
      dueWeekday: 'Sun',
      macroStressMultiplier: 1.2,
      gstRegistered: false,
      currentBankBalance: 120000,
      monthlyFixedExpenses: 160000
    }
  }
];

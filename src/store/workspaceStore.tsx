import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type {
  InvoiceEvaluationRequest,
  InvoiceEvaluationResponse,
  WhatIfScenario,
  LedgerEntry,
  ChatMessage,
  TreasuryDefaults,
  PipelineProvenance,
  EnterpriseProfile,
  CustomBusinessProfile,
  GstVendorInvoice,
  PlannerInvoiceRecord,
} from '../types/engineContract';
import type { ApVendorBill, TdsReceivableItem } from '../types/statutory';
import {
  EMPTY_ENTERPRISE_PROFILE,
  DEMO_ENTERPRISE_PROFILE,
  EMPTY_TREASURY_DEFAULTS,
  DEMO_TREASURY_DEFAULTS,
  EMPTY_DEAL_REQUEST,
  DEMO_LEDGER_ENTRIES,
  DEMO_GST_VENDOR_INVOICES,
  DEMO_TDS_ITEMS,
  DEMO_AP_BILLS,
  DEMO_PLANNER_ROWS,
} from './demoPresets';

const DK_DEFAULTS = 'veritas-treasury-defaults';
const DK_LEDGER = 'veritas-portfolio-ledger';
const DK_PROFILE = 'veritas-enterprise-profile';
const DK_CUSTOM_BIZ = 'veritas-custom-business-index';
const DK_GST_STATE = 'float-gst-workspace-state';
const DK_RUNWAY_STATE = 'float-runway-workspace-state';
const DK_PLANNER_STATE = 'float-planner-workspace-state';

export const DEFAULT_ENTERPRISE_PROFILE: EnterpriseProfile = EMPTY_ENTERPRISE_PROFILE;

export interface GstWorkspaceState {
  vendorInvoices: GstVendorInvoice[];
  monthlyOutputGst: number;
  tdsItems: TdsReceivableItem[];
  customBillAmount: number;
  slab: number;
  isInterstate: boolean;
}

export interface RunwayWorkspaceState {
  apBills: ApVendorBill[];
  inventoryDays: number;
  payableDays: number;
  delayStressShockDays: number;
  scenarioMode: 'base' | 'stress' | 'custom';
}

export interface PlannerWorkspaceState {
  companyName: string;
  industryNotes: string;
  rows: PlannerInvoiceRecord[];
  monthlyRevenue: number;
  expansionCapEx: number;
  avgReceivableDays: number;
  horizonMonths: number;
}

const EMPTY_GST_STATE: GstWorkspaceState = {
  vendorInvoices: [],
  monthlyOutputGst: 0,
  tdsItems: [],
  customBillAmount: 0,
  slab: 18,
  isInterstate: false,
};

const EMPTY_RUNWAY_STATE: RunwayWorkspaceState = {
  apBills: [],
  inventoryDays: 0,
  payableDays: 0,
  delayStressShockDays: 0,
  scenarioMode: 'base',
};

const EMPTY_PLANNER_STATE: PlannerWorkspaceState = {
  companyName: '',
  industryNotes: '',
  rows: [],
  monthlyRevenue: 0,
  expansionCapEx: 0,
  avgReceivableDays: 0,
  horizonMonths: 6,
};

function loadEnterpriseProfile(): EnterpriseProfile {
  try {
    const raw = localStorage.getItem(DK_PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...EMPTY_ENTERPRISE_PROFILE, ...parsed };
      }
    }
  } catch {}
  return { ...EMPTY_ENTERPRISE_PROFILE };
}

function loadCustomBusinessProfile(): CustomBusinessProfile | null {
  try {
    const raw = localStorage.getItem(DK_CUSTOM_BIZ);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed.companyName === 'string') {
        return {
          ...parsed,
          recordsCount: Number(parsed.recordsCount) || 0,
          counterpartiesCount: Number(parsed.counterpartiesCount) || 0,
          counterparties:
            parsed.counterparties && typeof parsed.counterparties === 'object'
              ? parsed.counterparties
              : {},
        };
      }
    }
  } catch {}
  return null;
}

function loadDefaults(): TreasuryDefaults {
  try {
    const raw = localStorage.getItem(DK_DEFAULTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...EMPTY_TREASURY_DEFAULTS,
          ...parsed,
          currentBankBalance: Number(parsed.currentBankBalance) || 0,
          monthlyFixedExpenses: Number(parsed.monthlyFixedExpenses) || 0,
          bankOverdraftLimit: Number(parsed.bankOverdraftLimit) || 0,
          gstSlab: Number(parsed.gstSlab) || 18,
        };
      }
    }
  } catch {}
  return { ...EMPTY_TREASURY_DEFAULTS };
}

function loadLedger(): LedgerEntry[] {
  try {
    const raw = localStorage.getItem(DK_LEDGER);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any, idx: number) => ({
          id: String(item?.id || `INV-${idx + 1}`),
          clientName: String(item?.clientName || 'Counterparty'),
          invoiceAmount: Number(item?.invoiceAmount) || 0,
          paymentTermDays: Number(item?.paymentTermDays) || 30,
          riskPercent: Number(item?.riskPercent) || 0,
          expectedArrivalDay: Number(item?.expectedArrivalDay) || 30,
          status:
            item?.status === 'OVERDUE' || item?.status === 'ON_TRACK' ? item.status : 'PENDING',
          savedAt: item?.savedAt ? new Date(item.savedAt) : new Date(),
          dueInDays: item?.dueInDays !== undefined ? Number(item.dueInDays) : undefined,
          evaluated: typeof item?.evaluated === 'boolean' ? item.evaluated : undefined,
        }));
      }
    }
  } catch {}
  return [];
}

function loadGstState(defaults: TreasuryDefaults): GstWorkspaceState {
  try {
    const raw = localStorage.getItem(DK_GST_STATE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...EMPTY_GST_STATE,
          ...parsed,
          vendorInvoices: Array.isArray(parsed.vendorInvoices) ? parsed.vendorInvoices : [],
          tdsItems: Array.isArray(parsed.tdsItems) ? parsed.tdsItems : [],
          monthlyOutputGst: Number(parsed.monthlyOutputGst) || 0,
          customBillAmount: Number(parsed.customBillAmount) || 0,
          slab: Number(parsed.slab) || defaults.gstSlab || 18,
        };
      }
    }
  } catch {}
  return {
    ...EMPTY_GST_STATE,
    slab: defaults.gstSlab || 18,
    isInterstate: defaults.defaultSupplyType === 'INTER_STATE',
  };
}

function loadRunwayState(): RunwayWorkspaceState {
  try {
    const raw = localStorage.getItem(DK_RUNWAY_STATE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...EMPTY_RUNWAY_STATE,
          ...parsed,
          apBills: Array.isArray(parsed.apBills) ? parsed.apBills : [],
          inventoryDays: Number(parsed.inventoryDays) || 0,
          payableDays: Number(parsed.payableDays) || 0,
          delayStressShockDays: Number(parsed.delayStressShockDays) || 0,
        };
      }
    }
  } catch {}
  return { ...EMPTY_RUNWAY_STATE };
}

function loadPlannerState(profile: EnterpriseProfile): PlannerWorkspaceState {
  try {
    const raw = localStorage.getItem(DK_PLANNER_STATE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...EMPTY_PLANNER_STATE,
          ...parsed,
          rows: Array.isArray(parsed.rows) ? parsed.rows : [],
          monthlyRevenue: Number(parsed.monthlyRevenue) || 0,
          expansionCapEx: Number(parsed.expansionCapEx) || 0,
          avgReceivableDays: Number(parsed.avgReceivableDays) || 0,
          horizonMonths: Number(parsed.horizonMonths) || 6,
        };
      }
    }
  } catch {}
  return {
    ...EMPTY_PLANNER_STATE,
    companyName: profile.companyName,
    monthlyRevenue: profile.annualTurnover > 0 ? Math.round(profile.annualTurnover / 12) : 0,
  };
}

export interface WorkspaceState {
  intake: InvoiceEvaluationRequest;
  currentResult: InvoiceEvaluationResponse | null;
  isEvaluating: boolean;
  phase: 'intake' | 'dossier';
  whatIfs: WhatIfScenario[];
  ledger: LedgerEntry[];
  chatMessages: ChatMessage[];
  treasuryDefaults: TreasuryDefaults;
  enterpriseProfile: EnterpriseProfile;
  customBusinessProfile: CustomBusinessProfile | null;
  customBusinessActive: boolean;
  provenance: PipelineProvenance;
  latencyMs: number | null;
  gstState: GstWorkspaceState;
  runwayState: RunwayWorkspaceState;
  plannerState: PlannerWorkspaceState;
}

const EMPTY_REQUEST: InvoiceEvaluationRequest = { ...EMPTY_DEAL_REQUEST };

const loadedDefaults = loadDefaults();
const loadedProfile = loadEnterpriseProfile();
const loadedBiz = loadCustomBusinessProfile();

const DEFAULT_WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'I am **float. Treasury Advisory Copilot**. Ask me about an evaluated deal, your cash runway, open receivables ageing, Section 43B(h) / GST ITC compliance, or run a what-if scenario - or just say hello to see your live workspace snapshot.',
  timestamp: new Date(),
};

const initialState: WorkspaceState = {
  intake: {
    ...EMPTY_REQUEST,
    currentBankBalance: loadedDefaults.currentBankBalance,
    monthlyFixedExpenses: loadedDefaults.monthlyFixedExpenses,
    gstRegistered: loadedDefaults.gstRegistered,
  },
  currentResult: null,
  isEvaluating: false,
  phase: 'intake',
  whatIfs: [],
  ledger: loadLedger(),
  chatMessages: [DEFAULT_WELCOME_MSG],
  treasuryDefaults: loadedDefaults,
  enterpriseProfile: loadedProfile,
  customBusinessProfile: loadedBiz,
  customBusinessActive: !!loadedBiz,
  provenance: 'LOCAL_ENGINE',
  latencyMs: null,
  gstState: loadGstState(loadedDefaults),
  runwayState: loadRunwayState(),
  plannerState: loadPlannerState(loadedProfile),
};

export type DemoPresetScope = 'all' | 'enterprise' | 'ageing' | 'gst' | 'ap' | 'planner';

type Action =
  | { type: 'SET_INTAKE'; payload: Partial<InvoiceEvaluationRequest> }
  | { type: 'SET_RESULT'; payload: InvoiceEvaluationResponse }
  | { type: 'SET_EVALUATING'; payload: boolean }
  | { type: 'SET_PHASE'; payload: 'intake' | 'dossier' }
  | { type: 'ADD_WHATIF'; payload: WhatIfScenario }
  | { type: 'REMOVE_WHATIF'; payload: string }
  | { type: 'ADD_LEDGER_ENTRY'; payload: LedgerEntry }
  | { type: 'UPDATE_LEDGER_ENTRY'; payload: { id: string; patch: Partial<LedgerEntry> } }
  | { type: 'SET_LEDGER'; payload: LedgerEntry[] }
  | { type: 'REMOVE_LEDGER_ENTRY'; payload: string }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'CLEAR_CHAT' }
  | { type: 'SET_DEFAULTS'; payload: TreasuryDefaults }
  | { type: 'SET_ENTERPRISE_PROFILE'; payload: Partial<EnterpriseProfile> }
  | { type: 'SET_CUSTOM_BUSINESS_DATA'; payload: CustomBusinessProfile }
  | { type: 'CLEAR_CUSTOM_BUSINESS_DATA' }
  | { type: 'TOGGLE_CUSTOM_BUSINESS_ACTIVE'; payload?: boolean }
  | { type: 'SET_PROVENANCE'; payload: { provenance: PipelineProvenance; latencyMs: number | null } }
  | { type: 'SET_GST_STATE'; payload: Partial<GstWorkspaceState> }
  | { type: 'SET_RUNWAY_STATE'; payload: Partial<RunwayWorkspaceState> }
  | { type: 'SET_PLANNER_STATE'; payload: Partial<PlannerWorkspaceState> }
  | { type: 'LOAD_DEMO_PRESET'; payload: DemoPresetScope }
  | { type: 'RESET_WORKSPACE_TO_BLANK'; payload?: DemoPresetScope }
  | { type: 'RESET_INTAKE' };

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case 'SET_INTAKE':
      return { ...state, intake: { ...state.intake, ...action.payload } };

    case 'SET_RESULT':
      return { ...state, currentResult: action.payload, phase: 'dossier' };

    case 'SET_EVALUATING':
      return { ...state, isEvaluating: action.payload };

    case 'SET_PHASE':
      return { ...state, phase: action.payload };

    case 'ADD_WHATIF':
      return { ...state, whatIfs: [...state.whatIfs, action.payload] };

    case 'REMOVE_WHATIF':
      return { ...state, whatIfs: state.whatIfs.filter((w) => w.id !== action.payload) };

    case 'ADD_LEDGER_ENTRY': {
      const existingIdx = state.ledger.findIndex((e) => e.id === action.payload.id);
      if (existingIdx >= 0) {
        const updated = [...state.ledger];
        updated[existingIdx] = action.payload;
        return { ...state, ledger: updated };
      }
      return { ...state, ledger: [action.payload, ...state.ledger] };
    }

    case 'UPDATE_LEDGER_ENTRY':
      return {
        ...state,
        ledger: state.ledger.map((e) =>
          e.id === action.payload.id ? { ...e, ...action.payload.patch } : e
        ),
      };

    case 'SET_LEDGER':
      return { ...state, ledger: action.payload };

    case 'REMOVE_LEDGER_ENTRY':
      return { ...state, ledger: state.ledger.filter((e) => e.id !== action.payload) };

    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };

    case 'CLEAR_CHAT':
      return { ...state, chatMessages: [] };

    case 'SET_DEFAULTS': {
      const nextDefaults = action.payload;
      return {
        ...state,
        treasuryDefaults: nextDefaults,
        intake: {
          ...state.intake,
          currentBankBalance: nextDefaults.currentBankBalance,
          monthlyFixedExpenses: nextDefaults.monthlyFixedExpenses,
          gstRegistered: nextDefaults.gstRegistered,
        },
        enterpriseProfile: {
          ...state.enterpriseProfile,
          sanctionedCcLimit: nextDefaults.bankOverdraftLimit,
        },
        gstState: {
          ...state.gstState,
          slab: nextDefaults.gstSlab,
          isInterstate: nextDefaults.defaultSupplyType === 'INTER_STATE',
        },
      };
    }

    case 'SET_ENTERPRISE_PROFILE': {
      const nextProfile = { ...state.enterpriseProfile, ...action.payload };
      const hasBurnUpdate =
        'monthlyPayrollBurn' in action.payload || 'monthlyRentAndUtilities' in action.payload;
      const computedBurn =
        (nextProfile.monthlyPayrollBurn || 0) + (nextProfile.monthlyRentAndUtilities || 0);
      const nextBurn = hasBurnUpdate ? computedBurn : state.treasuryDefaults.monthlyFixedExpenses;
      const nextCcLimit =
        'sanctionedCcLimit' in action.payload
          ? nextProfile.sanctionedCcLimit
          : state.treasuryDefaults.bankOverdraftLimit;
      const nextMonthlyRev =
        'annualTurnover' in action.payload
          ? nextProfile.annualTurnover > 0
            ? Math.round(nextProfile.annualTurnover / 12)
            : 0
          : state.plannerState.monthlyRevenue;

      return {
        ...state,
        enterpriseProfile: nextProfile,
        treasuryDefaults: {
          ...state.treasuryDefaults,
          monthlyFixedExpenses: nextBurn,
          bankOverdraftLimit: nextCcLimit,
        },
        intake: {
          ...state.intake,
          monthlyFixedExpenses: nextBurn,
        },
        plannerState: {
          ...state.plannerState,
          companyName:
            'companyName' in action.payload ? nextProfile.companyName : state.plannerState.companyName,
          monthlyRevenue: nextMonthlyRev,
        },
      };
    }

    case 'SET_CUSTOM_BUSINESS_DATA':
      return { ...state, customBusinessProfile: action.payload, customBusinessActive: true };

    case 'CLEAR_CUSTOM_BUSINESS_DATA':
      return { ...state, customBusinessProfile: null, customBusinessActive: false };

    case 'TOGGLE_CUSTOM_BUSINESS_ACTIVE':
      return {
        ...state,
        customBusinessActive:
          action.payload !== undefined ? action.payload : !state.customBusinessActive,
      };

    case 'SET_PROVENANCE':
      return {
        ...state,
        provenance: action.payload.provenance,
        latencyMs: action.payload.latencyMs,
      };

    case 'SET_GST_STATE':
      return { ...state, gstState: { ...state.gstState, ...action.payload } };

    case 'SET_RUNWAY_STATE':
      return { ...state, runwayState: { ...state.runwayState, ...action.payload } };

    case 'SET_PLANNER_STATE':
      return { ...state, plannerState: { ...state.plannerState, ...action.payload } };

    case 'LOAD_DEMO_PRESET': {
      const scope = action.payload;
      if (scope === 'all') {
        return {
          ...state,
          enterpriseProfile: { ...DEMO_ENTERPRISE_PROFILE },
          treasuryDefaults: { ...DEMO_TREASURY_DEFAULTS },
          intake: {
            ...EMPTY_DEAL_REQUEST,
            ...state.intake,
            invoiceAmount: state.intake.invoiceAmount > 0 ? state.intake.invoiceAmount : 140000,
            paymentTermDays: state.intake.paymentTermDays > 0 ? state.intake.paymentTermDays : 30,
            customerTenureMonths: state.intake.customerTenureMonths > 0 ? state.intake.customerTenureMonths : 14,
            pastLatePercent: state.intake.clientName ? state.intake.pastLatePercent : 22,
            orderSizeVsAvg: state.intake.orderSizeVsAvg > 0 ? state.intake.orderSizeVsAvg : 1.2,
            pastAvgDelayDays: state.intake.clientName ? state.intake.pastAvgDelayDays : 8,
            clientName: state.intake.clientName || 'Apex Precision Components',
            gstin: state.intake.gstin || '27AABCA1234D1Z5',
            currentBankBalance: DEMO_TREASURY_DEFAULTS.currentBankBalance,
            monthlyFixedExpenses: DEMO_TREASURY_DEFAULTS.monthlyFixedExpenses,
            gstRegistered: DEMO_TREASURY_DEFAULTS.gstRegistered,
          },
          currentResult: null,
          phase: 'intake',
          ledger: [...DEMO_LEDGER_ENTRIES],
          gstState: {
            vendorInvoices: [...DEMO_GST_VENDOR_INVOICES],
            monthlyOutputGst: 380000,
            tdsItems: [...DEMO_TDS_ITEMS],
            customBillAmount: 140000,
            slab: 18,
            isInterstate: false,
          },
          runwayState: {
            apBills: [...DEMO_AP_BILLS],
            inventoryDays: 32,
            payableDays: 35,
            delayStressShockDays: 12,
            scenarioMode: 'base',
          },
          plannerState: {
            companyName: DEMO_ENTERPRISE_PROFILE.companyName,
            industryNotes: 'CNC auto components supplying Tier-1 OEMs on 30-60d credit',
            rows: [...DEMO_PLANNER_ROWS],
            monthlyRevenue: 650000,
            expansionCapEx: 1500000,
            avgReceivableDays: 45,
            horizonMonths: 6,
          },
        };
      }
      if (scope === 'enterprise') {
        return {
          ...state,
          enterpriseProfile: { ...DEMO_ENTERPRISE_PROFILE },
          treasuryDefaults: { ...DEMO_TREASURY_DEFAULTS },
          intake: {
            ...EMPTY_DEAL_REQUEST,
            ...state.intake,
            invoiceAmount: state.intake.invoiceAmount > 0 ? state.intake.invoiceAmount : 140000,
            paymentTermDays: state.intake.paymentTermDays > 0 ? state.intake.paymentTermDays : 30,
            customerTenureMonths: state.intake.customerTenureMonths > 0 ? state.intake.customerTenureMonths : 14,
            pastLatePercent: state.intake.clientName ? state.intake.pastLatePercent : 22,
            orderSizeVsAvg: state.intake.orderSizeVsAvg > 0 ? state.intake.orderSizeVsAvg : 1.2,
            pastAvgDelayDays: state.intake.clientName ? state.intake.pastAvgDelayDays : 8,
            clientName: state.intake.clientName || 'Apex Precision Components',
            gstin: state.intake.gstin || '27AABCA1234D1Z5',
            currentBankBalance: DEMO_TREASURY_DEFAULTS.currentBankBalance,
            monthlyFixedExpenses: DEMO_TREASURY_DEFAULTS.monthlyFixedExpenses,
            gstRegistered: DEMO_TREASURY_DEFAULTS.gstRegistered,
          },
          currentResult: null,
          phase: 'intake',
          plannerState: {
            ...state.plannerState,
            companyName: DEMO_ENTERPRISE_PROFILE.companyName,
            monthlyRevenue: Math.round(DEMO_ENTERPRISE_PROFILE.annualTurnover / 12),
          },
        };
      }
      if (scope === 'ageing') {
        return { ...state, ledger: [...DEMO_LEDGER_ENTRIES] };
      }
      if (scope === 'gst') {
        return {
          ...state,
          gstState: {
            ...state.gstState,
            vendorInvoices: [...DEMO_GST_VENDOR_INVOICES],
            monthlyOutputGst: 380000,
            tdsItems: [...DEMO_TDS_ITEMS],
            customBillAmount: 140000,
          },
        };
      }
      if (scope === 'ap') {
        return {
          ...state,
          runwayState: {
            ...state.runwayState,
            apBills: [...DEMO_AP_BILLS],
            inventoryDays: state.runwayState.inventoryDays || 32,
            payableDays: state.runwayState.payableDays || 35,
          },
        };
      }
      if (scope === 'planner') {
        const useDemoCash =
          state.treasuryDefaults.currentBankBalance === 0 &&
          state.treasuryDefaults.monthlyFixedExpenses === 0;
        const nextDefaults = useDemoCash
          ? { ...state.treasuryDefaults, currentBankBalance: 350000, monthlyFixedExpenses: 250000 }
          : state.treasuryDefaults;
        return {
          ...state,
          treasuryDefaults: nextDefaults,
          intake: {
            ...state.intake,
            currentBankBalance: nextDefaults.currentBankBalance,
            monthlyFixedExpenses: nextDefaults.monthlyFixedExpenses,
          },
          plannerState: {
            companyName: state.enterpriseProfile.companyName || DEMO_ENTERPRISE_PROFILE.companyName,
            industryNotes: 'CNC auto components supplying Tier-1 OEMs on 30-60d credit',
            rows: [...DEMO_PLANNER_ROWS],
            monthlyRevenue: 650000,
            expansionCapEx: 1500000,
            avgReceivableDays: 45,
            horizonMonths: 6,
          },
        };
      }
      return state;
    }

    case 'RESET_WORKSPACE_TO_BLANK': {
      const scope = action.payload || 'all';
      if (scope === 'ageing') return { ...state, ledger: [] };
      if (scope === 'gst') return { ...state, gstState: { ...EMPTY_GST_STATE } };
      if (scope === 'ap') return { ...state, runwayState: { ...EMPTY_RUNWAY_STATE } };
      if (scope === 'planner') {
        return {
          ...state,
          customBusinessProfile: null,
          customBusinessActive: false,
          plannerState: {
            ...EMPTY_PLANNER_STATE,
            companyName: state.enterpriseProfile.companyName,
          },
        };
      }
      return {
        ...state,
        intake: { ...EMPTY_REQUEST },
        currentResult: null,
        isEvaluating: false,
        phase: 'intake',
        whatIfs: [],
        ledger: [],
        chatMessages: [{ ...DEFAULT_WELCOME_MSG, timestamp: new Date() }],
        treasuryDefaults: { ...EMPTY_TREASURY_DEFAULTS },
        enterpriseProfile: { ...EMPTY_ENTERPRISE_PROFILE },
        customBusinessProfile: null,
        customBusinessActive: false,
        gstState: { ...EMPTY_GST_STATE },
        runwayState: { ...EMPTY_RUNWAY_STATE },
        plannerState: { ...EMPTY_PLANNER_STATE },
      };
    }

    case 'RESET_INTAKE':
      return {
        ...state,
        intake: {
          ...EMPTY_REQUEST,
          currentBankBalance: state.treasuryDefaults.currentBankBalance,
          monthlyFixedExpenses: state.treasuryDefaults.monthlyFixedExpenses,
          gstRegistered: state.treasuryDefaults.gstRegistered,
        },
        currentResult: null,
        phase: 'intake',
      };

    default:
      return state;
  }
}

const WorkspaceContext = createContext<{ state: WorkspaceState; dispatch: React.Dispatch<Action> } | null>(
  null
);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    localStorage.setItem(DK_DEFAULTS, JSON.stringify(state.treasuryDefaults));
  }, [state.treasuryDefaults]);

  useEffect(() => {
    localStorage.setItem(DK_LEDGER, JSON.stringify(state.ledger));
  }, [state.ledger]);

  useEffect(() => {
    localStorage.setItem(DK_PROFILE, JSON.stringify(state.enterpriseProfile));
  }, [state.enterpriseProfile]);

  useEffect(() => {
    if (state.customBusinessProfile) {
      localStorage.setItem(DK_CUSTOM_BIZ, JSON.stringify(state.customBusinessProfile));
    } else {
      localStorage.removeItem(DK_CUSTOM_BIZ);
    }
  }, [state.customBusinessProfile]);

  useEffect(() => {
    localStorage.setItem(DK_GST_STATE, JSON.stringify(state.gstState));
  }, [state.gstState]);

  useEffect(() => {
    localStorage.setItem(DK_RUNWAY_STATE, JSON.stringify(state.runwayState));
  }, [state.runwayState]);

  useEffect(() => {
    localStorage.setItem(DK_PLANNER_STATE, JSON.stringify(state.plannerState));
  }, [state.plannerState]);

  return React.createElement(WorkspaceContext.Provider, { value: { state, dispatch } }, children);
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}

export { EMPTY_REQUEST };

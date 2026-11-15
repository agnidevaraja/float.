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
} from '../types/engineContract';

const DK_DEFAULTS = 'veritas-treasury-defaults';
const DK_LEDGER = 'veritas-portfolio-ledger';
const DK_PROFILE = 'veritas-enterprise-profile';
const DK_CUSTOM_BIZ = 'veritas-custom-business-index';

export const DEFAULT_ENTERPRISE_PROFILE: EnterpriseProfile = {
  companyName: 'Apex Precision Engineering Pvt Ltd',
  tradingBrandName: 'Apex Precision',
  constitution: 'PRIVATE_LIMITED',
  msmeCategory: 'SMALL',
  udyamRegistrationNumber: 'UDYAM-MH-12-0049210',
  gstin: '27AAACE4812L1ZP',
  pan: 'AAACE4812L',
  industrySector: 'Precision CNC Machining & Automotive Assemblies',
  operatingLocation: 'Plot W-48, MIDC Bhosari Industrial Area, Pune 411026, Maharashtra',
  annualTurnover: 32000000,
  primaryBank: 'HDFC Bank Ltd, Industrial Finance Branch, Pune',
  sanctionedCcLimit: 3500000,
  bankOdInterestRate: 11.5,
  typicalGrossMarginPercent: 18.0,
  standardCreditTermDays: 30,
  monthlyPayrollBurn: 180000,
  monthlyRentAndUtilities: 70000,
  keyProductsServices: 'CNC precision turned shafts, hydraulic manifolds, defense couplings',
  primaryCustomerSegment: 'Tier-1 Auto OEMs, Infrastructure Contractors & Defense Subcontractors',
};

function loadEnterpriseProfile(): EnterpriseProfile {
  try {
    const raw = localStorage.getItem(DK_PROFILE);
    if (raw) return { ...DEFAULT_ENTERPRISE_PROFILE, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_ENTERPRISE_PROFILE;
}

function loadCustomBusinessProfile(): CustomBusinessProfile | null {
  try {
    const raw = localStorage.getItem(DK_CUSTOM_BIZ);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
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
}

const EMPTY_REQUEST: InvoiceEvaluationRequest = {
  invoiceAmount: 0, paymentTermDays: 30, customerTenureMonths: 0,
  pastLatePercent: 0, orderSizeVsAvg: 1.0, pastAvgDelayDays: 0,
  dueWeekday: 'Mon', macroStressMultiplier: 1.0, gstRegistered: true,
  currentBankBalance: 0, monthlyFixedExpenses: 0,
};

function loadDefaults(): TreasuryDefaults {
  try { const raw = localStorage.getItem(DK_DEFAULTS); if (raw) return JSON.parse(raw); } catch {}
  return {
    currentBankBalance: 250000,
    monthlyFixedExpenses: 160000,
    bankOverdraftLimit: 100000,
    gstRegistered: true,
    gstSlab: 18,
    defaultSupplyType: 'INTRA_STATE',
  };
}

function loadLedger(): LedgerEntry[] {
  try { const raw = localStorage.getItem(DK_LEDGER); if (raw) return JSON.parse(raw); } catch {}
  return [];
}

const loadedBiz = loadCustomBusinessProfile();

const initialState: WorkspaceState = {
  intake: { ...EMPTY_REQUEST },
  currentResult: null,
  isEvaluating: false,
  phase: 'intake',
  whatIfs: [],
  ledger: loadLedger(),
  chatMessages: [{ id: 'welcome', role: 'assistant', content: 'Welcome to the AI Risk Copilot. Attach a deal from your underwriting dossier or ledger, then ask me anything about risk scores, cash runway, payment terms, or anomaly flags.', timestamp: new Date() }],
  treasuryDefaults: loadDefaults(),
  enterpriseProfile: loadEnterpriseProfile(),
  customBusinessProfile: loadedBiz,
  customBusinessActive: !!loadedBiz,
  provenance: 'LOCAL_ENGINE',
  latencyMs: null,
};

type Action =
  | { type: 'SET_INTAKE'; payload: Partial<InvoiceEvaluationRequest> }
  | { type: 'SET_RESULT'; payload: InvoiceEvaluationResponse }
  | { type: 'SET_EVALUATING'; payload: boolean }
  | { type: 'SET_PHASE'; payload: 'intake' | 'dossier' }
  | { type: 'ADD_WHATIF'; payload: WhatIfScenario }
  | { type: 'REMOVE_WHATIF'; payload: string }
  | { type: 'ADD_LEDGER_ENTRY'; payload: LedgerEntry }
  | { type: 'REMOVE_LEDGER_ENTRY'; payload: string }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'CLEAR_CHAT' }
  | { type: 'SET_DEFAULTS'; payload: TreasuryDefaults }
  | { type: 'SET_ENTERPRISE_PROFILE'; payload: Partial<EnterpriseProfile> }
  | { type: 'SET_CUSTOM_BUSINESS_DATA'; payload: CustomBusinessProfile }
  | { type: 'CLEAR_CUSTOM_BUSINESS_DATA' }
  | { type: 'TOGGLE_CUSTOM_BUSINESS_ACTIVE'; payload?: boolean }
  | { type: 'SET_PROVENANCE'; payload: { provenance: PipelineProvenance; latencyMs: number | null } }
  | { type: 'RESET_INTAKE' };

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case 'SET_INTAKE': return { ...state, intake: { ...state.intake, ...action.payload } };
    case 'SET_RESULT': return { ...state, currentResult: action.payload, phase: 'dossier' };
    case 'SET_EVALUATING': return { ...state, isEvaluating: action.payload };
    case 'SET_PHASE': return { ...state, phase: action.payload };
    case 'ADD_WHATIF': return { ...state, whatIfs: [...state.whatIfs, action.payload] };
    case 'REMOVE_WHATIF': return { ...state, whatIfs: state.whatIfs.filter(w => w.id !== action.payload) };
    case 'ADD_LEDGER_ENTRY': return { ...state, ledger: [action.payload, ...state.ledger] };
    case 'REMOVE_LEDGER_ENTRY': return { ...state, ledger: state.ledger.filter(e => e.id !== action.payload) };
    case 'ADD_CHAT_MESSAGE': return { ...state, chatMessages: [...state.chatMessages, action.payload] };
    case 'CLEAR_CHAT': return { ...state, chatMessages: [] };
    case 'SET_DEFAULTS': return { ...state, treasuryDefaults: action.payload };
    case 'SET_ENTERPRISE_PROFILE': return { ...state, enterpriseProfile: { ...state.enterpriseProfile, ...action.payload } };
    case 'SET_CUSTOM_BUSINESS_DATA': return { ...state, customBusinessProfile: action.payload, customBusinessActive: true };
    case 'CLEAR_CUSTOM_BUSINESS_DATA': return { ...state, customBusinessProfile: null, customBusinessActive: false };
    case 'TOGGLE_CUSTOM_BUSINESS_ACTIVE': return { ...state, customBusinessActive: action.payload !== undefined ? action.payload : !state.customBusinessActive };
    case 'SET_PROVENANCE': return { ...state, provenance: action.payload.provenance, latencyMs: action.payload.latencyMs };
    case 'RESET_INTAKE': return { ...state, intake: { ...EMPTY_REQUEST, ...state.treasuryDefaults } };
    default: return state;
  }
}

const WorkspaceContext = createContext<{ state: WorkspaceState; dispatch: React.Dispatch<Action> } | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  useEffect(() => { localStorage.setItem(DK_DEFAULTS, JSON.stringify(state.treasuryDefaults)); }, [state.treasuryDefaults]);
  useEffect(() => { localStorage.setItem(DK_LEDGER, JSON.stringify(state.ledger)); }, [state.ledger]);
  useEffect(() => { localStorage.setItem(DK_PROFILE, JSON.stringify(state.enterpriseProfile)); }, [state.enterpriseProfile]);
  useEffect(() => {
    if (state.customBusinessProfile) {
      localStorage.setItem(DK_CUSTOM_BIZ, JSON.stringify(state.customBusinessProfile));
    } else {
      localStorage.removeItem(DK_CUSTOM_BIZ);
    }
  }, [state.customBusinessProfile]);

  return React.createElement(WorkspaceContext.Provider, { value: { state, dispatch } }, children);
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}

export { EMPTY_REQUEST };

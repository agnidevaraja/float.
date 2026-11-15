import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { InvoiceEvaluationRequest, InvoiceEvaluationResponse, WhatIfScenario, LedgerEntry, ChatMessage, TreasuryDefaults, PipelineProvenance } from '../types/engineContract';

const DK_DEFAULTS = 'veritas-treasury-defaults';
const DK_LEDGER = 'veritas-portfolio-ledger';

export interface WorkspaceState {
  intake: InvoiceEvaluationRequest;
  currentResult: InvoiceEvaluationResponse | null;
  isEvaluating: boolean;
  phase: 'intake' | 'dossier';
  whatIfs: WhatIfScenario[];
  ledger: LedgerEntry[];
  chatMessages: ChatMessage[];
  treasuryDefaults: TreasuryDefaults;
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
  return { gstRegistered: true, gstSlab: 18, currentBankBalance: 0, monthlyFixedExpenses: 0 };
}

function loadLedger(): LedgerEntry[] {
  try { const raw = localStorage.getItem(DK_LEDGER); if (raw) return JSON.parse(raw); } catch {}
  return [];
}

const initialState: WorkspaceState = {
  intake: { ...EMPTY_REQUEST },
  currentResult: null,
  isEvaluating: false,
  phase: 'intake',
  whatIfs: [],
  ledger: loadLedger(),
  chatMessages: [{ id: 'welcome', role: 'assistant', content: 'Welcome to the AI Risk Copilot. Attach a deal from your underwriting dossier or ledger, then ask me anything about risk scores, cash runway, payment terms, or anomaly flags.', timestamp: new Date() }],
  treasuryDefaults: loadDefaults(),
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
  return React.createElement(WorkspaceContext.Provider, { value: { state, dispatch } }, children);
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}

export { EMPTY_REQUEST };

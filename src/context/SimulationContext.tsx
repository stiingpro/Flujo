'use client';

import React, { createContext, useContext, useReducer, useMemo, ReactNode } from 'react';
import { Transaction } from '@/types';
import { useFinanceStore } from '@/stores/useFinanceStore';

// === TYPES ===
export interface DraftTransaction extends Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'user_id'> {
    id: string; // Temporary ID (e.g. "draft-1")
    isDraft: true;
}

interface SimulationState {
    drafts: DraftTransaction[];
    isActive: boolean;
}

type SimulationAction =
    | { type: 'ADD_DRAFT'; payload: DraftTransaction }
    | { type: 'REMOVE_DRAFT'; payload: string }
    | { type: 'RESET' }
    | { type: 'ACTIVATE' };

interface SimulationContextType {
    state: SimulationState;
    addDraft: (draft: Omit<DraftTransaction, 'id' | 'isDraft'>) => void;
    removeDraft: (id: string) => void;
    resetSimulation: () => void;
    commitSimulation: () => Promise<void>;
    simulatedTransactions: (Transaction | DraftTransaction)[];
    projectedBalance: number; // Simple KPI example
}

// === REDUCER ===
function simulationReducer(state: SimulationState, action: SimulationAction): SimulationState {
    switch (action.type) {
        case 'ACTIVATE':
            return { ...state, isActive: true };
        case 'ADD_DRAFT':
            return { ...state, isActive: true, drafts: [...state.drafts, action.payload] };
        case 'REMOVE_DRAFT':
            return { ...state, drafts: state.drafts.filter(d => d.id !== action.payload) };
        case 'RESET':
            return { drafts: [], isActive: false };
        default:
            return state;
    }
}

// === CONTEXT ===
const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export function SimulationProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(simulationReducer, { drafts: [], isActive: false });
    const { transactions, addTransaction } = useFinanceStore();

    // 1. Selector Memoizado Inteligente
    // Combina datos reales + drafts para gráficos y tablas
    const simulatedTransactions = useMemo(() => {
        if (!state.isActive || state.drafts.length === 0) {
            return transactions;
        }
        // Ordear cronológicamente
        return [...transactions, ...state.drafts].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    }, [transactions, state.drafts, state.isActive]);

    // 2. KPI Derivado Instantáneo: Balance Final Proyectado
    const projectedBalance = useMemo(() => {
        return simulatedTransactions.reduce((acc, t) => {
            const amt = t.type === 'income' ? t.amount : -t.amount;
            return acc + amt;
        }, 0);
    }, [simulatedTransactions]);

    // Actions
    const addDraft = (draft: Omit<DraftTransaction, 'id' | 'isDraft'>) => {
        const newDraft: DraftTransaction = {
            ...draft,
            id: `draft-${Date.now()}`,
            isDraft: true
        };
        dispatch({ type: 'ADD_DRAFT', payload: newDraft });
    };

    const removeDraft = (id: string) => {
        dispatch({ type: 'REMOVE_DRAFT', payload: id });
    };

    const resetSimulation = () => {
        dispatch({ type: 'RESET' });
    };

    const commitSimulation = async () => {
        // Commit all drafts to real DB
        // In a real app, we might want to do a bulk insert via Supabase
        // Here we iterate for simplicity with the store's addTransaction
        for (const draft of state.drafts) {
            // Remove draft flags before saving
            const { id, isDraft, ...realTxArgs } = draft;
            // Generate a proper ID is handled by the store or DB usually, 
            // but let's assume store handles it or we pass a new UUID.

            // We need to map DraftTransaction to the input expected by addTransaction 
            // which usually expects a partial object or full object without ID.
            // Assuming addTransaction handles ID generation if missing.
            await addTransaction({
                ...realTxArgs,
                id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                // Default required fields if missing in draft
                user_id: 'current-user', // Handled by RLS/Backend usually
            } as Transaction);
        }
        resetSimulation();
    };

    return (
        <SimulationContext.Provider value={{
            state,
            addDraft,
            removeDraft,
            resetSimulation,
            commitSimulation,
            simulatedTransactions,
            projectedBalance
        }}>
            {children}
        </SimulationContext.Provider>
    );
}

// === HOOK ===
export function useFinancialSimulation() {
    const context = useContext(SimulationContext);
    if (context === undefined) {
        throw new Error('useFinancialSimulation must be used within a SimulationProvider');
    }
    return context;
}

import { create } from 'zustand';
import { Transaction, Category, TransactionStatus } from '@/types';
import { useFinanceStore } from './useFinanceStore';
import { upsertTransaction } from '@/lib/database';
import { toast } from 'sonner';

export type SimulationVariableType = 'new_expense' | 'new_income' | 'modify_amount' | 'toggle_active';

export interface SimulationVariable {
    id: string;
    type: SimulationVariableType;
    name: string;
    amount?: number;
    description?: string;
    date: string; // YYYY-MM-DD
    targetTransactionId?: string; // If modifying existing
    category_id?: string;
    active: boolean;
}

interface SimulationState {
    isSimulationMode: boolean;
    baseSnapshot: {
        transactions: Transaction[];
        categories: Category[];
    } | null;
    variables: SimulationVariable[];
    simulatedTransactions: Transaction[];

    // Actions
    startSimulation: () => void;
    stopSimulation: () => void;
    addVariable: (variable: Omit<SimulationVariable, 'id' | 'active'>) => void;
    removeVariable: (id: string) => void;
    toggleVariable: (id: string) => void;
    applyToReality: () => Promise<void>;

    // Computed Helper
    recalculate: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
    isSimulationMode: false,
    baseSnapshot: null,
    variables: [],
    simulatedTransactions: [],

    startSimulation: () => {
        const financeStore = useFinanceStore.getState();
        const snapshot = {
            transactions: [...financeStore.transactions],
            categories: [...financeStore.categories],
        };

        set({
            isSimulationMode: true,
            baseSnapshot: snapshot,
            variables: [],
            simulatedTransactions: snapshot.transactions,
        });

        toast.info("Modo Simulación Activado", {
            description: "Los cambios que hagas aquí no afectan tu contabilidad real."
        });
    },

    stopSimulation: () => {
        set({
            isSimulationMode: false,
            baseSnapshot: null,
            variables: [],
            simulatedTransactions: [],
        });
        toast.info("Modo Simulación Finalizado");
    },

    addVariable: (varData) => {
        const newVariable: SimulationVariable = {
            ...varData,
            id: `sim-var-${Date.now()}`,
            active: true,
        };

        set((state) => {
            const newVariables = [...state.variables, newVariable];
            // Trigger recalculation immediately
            const newState = { ...state, variables: newVariables };
            return newState;
        });

        get().recalculate();
    },

    removeVariable: (id) => {
        set((state) => ({
            variables: state.variables.filter(v => v.id !== id)
        }));
        get().recalculate();
    },

    toggleVariable: (id) => {
        set((state) => ({
            variables: state.variables.map(v =>
                v.id === id ? { ...v, active: !v.active } : v
            )
        }));
        get().recalculate();
    },

    recalculate: () => {
        const { baseSnapshot, variables } = get();
        if (!baseSnapshot) return;

        let currentTransactions = [...baseSnapshot.transactions];

        // Apply variables sequentially
        variables.filter(v => v.active).forEach(variable => {
            if (variable.type === 'new_expense' || variable.type === 'new_income') {
                const isExpense = variable.type === 'new_expense';
                const newTx: Transaction = {
                    id: `sim-tx-${variable.id}`,
                    date: variable.date,
                    amount: variable.amount || 0,
                    description: variable.name,
                    category_id: variable.category_id || '',
                    type: isExpense ? 'expense' : 'income',
                    status: 'projected', // Simulations are always projected
                    origin: 'business', // Default
                    paymentStatus: 'pending',
                    user_id: 'simulation-user',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    currency_code: 'CLP',
                    exchange_rate: 1
                };
                currentTransactions.push(newTx);
            }
            // Future: Handle modifications
        });

        set({ simulatedTransactions: currentTransactions });
    },

    applyToReality: async () => {
        const { variables, baseSnapshot } = get();
        if (!baseSnapshot) return;

        const activeVariables = variables.filter(v => v.active);

        if (activeVariables.length === 0) {
            toast.warning("No hay cambios para aplicar.");
            return;
        }

        if (!window.confirm(`¿Aplicar ${activeVariables.length} cambios a tu contabilidad real? Se crearán como 'Proyectados'.`)) {
            return;
        }

        try {
            const financeStore = useFinanceStore.getState();
            const user = financeStore.profile?.id; // Assuming profile is loaded

            // Create real transactions from variables
            for (const variable of activeVariables) {
                if (variable.type === 'new_expense' || variable.type === 'new_income') {
                    const isExpense = variable.type === 'new_expense';
                    const newTx: Transaction = {
                        id: crypto.randomUUID(), // New Real ID
                        date: variable.date,
                        amount: variable.amount || 0,
                        description: variable.name,
                        category_id: variable.category_id || '',
                        type: isExpense ? 'expense' : 'income',
                        status: 'projected',
                        origin: 'business',
                        paymentStatus: 'pending',
                        user_id: user || '',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        currency_code: 'CLP',
                        exchange_rate: 1
                    };

                    // 1. Add to Local Store
                    financeStore.addTransaction(newTx);

                    // 2. Sync to Supabase (if user exists)
                    if (user) {
                        await upsertTransaction(newTx);
                    }
                }
            }

            toast.success("Cambios aplicados exitosamente");
            get().stopSimulation();

        } catch (error) {
            console.error("Error merging simulation", error);
            toast.error("Error al aplicar cambios");
        }
    }
}));

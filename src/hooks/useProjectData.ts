import { useFinanceStore } from '@/stores/useFinanceStore';
import { useSimulationStore } from '@/stores/useSimulationStore';
import { calculateMonthlyData, calculateCategoryMonthlyData } from '@/lib/financialCalculations';
import { TransactionType } from '@/types';

export function useProjectData() {
    const finance = useFinanceStore();
    const simulation = useSimulationStore();

    // Base data source
    const transactions = simulation.isSimulationMode
        ? simulation.simulatedTransactions
        : finance.transactions;

    // Simulation never modifies categories list (only usage), so we use finance categories
    const categories = finance.categories;
    const filters = finance.filters;

    // Computed Wrappers
    const getMonthlyData = () => {
        return calculateMonthlyData(transactions, filters, categories);
    };

    const getCategoryMonthlyData = (type: TransactionType) => {
        return calculateCategoryMonthlyData(transactions, categories, filters, type);
    };

    return {
        // Data
        transactions,
        categories,
        filters: finance.filters,
        profile: finance.profile,

        // Mode
        isSimulationMode: simulation.isSimulationMode,

        // Computed
        getMonthlyData,
        getCategoryMonthlyData,

        // Pass-through Actions (Use finance store actions, but warn if in simulation?)
        // Ideally, adding transactions in simulation mode should use simulation store...
        // But the current UI calls 'addTransactionAndSync' from useSupabaseSync.
        // We might need to intercept those calls in the components.
    };
}

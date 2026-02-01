import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    Transaction,
    Category,
    DashboardFilters,
    TransactionType,
    TransactionStatus,
    MonthlyData,
    CategoryLevel,
    ClientRevenueData,
    MONTH_NAMES,
} from '@/types';

interface FinanceState {
    // Data
    transactions: Transaction[];
    categories: Category[];
    isLoading: boolean;
    error: string | null;

    // Filters
    filters: DashboardFilters;

    // Demo mode (when Supabase is not configured)
    isDemoMode: boolean;

    // Actions
    setTransactions: (transactions: Transaction[]) => void;
    addTransaction: (transaction: Transaction) => void;
    updateTransaction: (id: string, updates: Partial<Transaction>) => void;
    deleteTransaction: (id: string) => void;

    setCategories: (categories: Category[]) => void;
    addCategory: (category: Category) => void;
    updateCategory: (id: string, updates: Partial<Category>) => void;
    deleteCategory: (id: string) => void;

    copyYearData: (fromYear: number, toYear: number) => void;

    setFilters: (filters: Partial<DashboardFilters>) => void;
    toggleProjectedMode: () => void;

    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setDemoMode: (isDemoMode: boolean) => void;

    // Computed
    getMonthlyData: () => MonthlyData[];
    getCategoryMonthlyData: (type: TransactionType, level?: CategoryLevel) => Map<string, Map<number, { amount: number; status: TransactionStatus; id?: string; level?: CategoryLevel; sublevel?: string; color?: string }>>;
    getClientRevenueData: () => ClientRevenueData[];
}

export const useFinanceStore = create<FinanceState>()(
    persist(
        (set, get) => ({
            // Initial state
            transactions: [],
            categories: [],
            isLoading: false,
            error: null,
            isDemoMode: true,
            filters: {
                year: new Date().getFullYear(),
                showProjected: true,
                origin: 'all',
            },

            // Actions
            setTransactions: (transactions) => set({ transactions }),

            addTransaction: (transaction) =>
                set((state) => ({
                    transactions: [...state.transactions, transaction],
                })),

            updateTransaction: (id, updates) =>
                set((state) => ({
                    transactions: state.transactions.map((t) =>
                        t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
                    ),
                })),

            deleteTransaction: (id) =>
                set((state) => ({
                    transactions: state.transactions.filter((t) => t.id !== id),
                })),

            setCategories: (categories) => set({ categories }),

            addCategory: (category) =>
                set((state) => ({
                    categories: [...state.categories, category],
                })),

            updateCategory: (id, updates) =>
                set((state) => ({
                    categories: state.categories.map((c) =>
                        c.id === id ? { ...c, ...updates } : c
                    ),
                })),

            copyYearData: (fromYear, toYear) =>
                set((state) => {
                    const sourceTransactions = state.transactions.filter((t) => {
                        const date = new Date(t.date);
                        return date.getFullYear() === fromYear;
                    });

                    if (sourceTransactions.length === 0) return {};

                    const newTransactions = sourceTransactions.map((t) => {
                        const oldDate = new Date(t.date);
                        const newDate = new Date(oldDate);
                        newDate.setFullYear(toYear);
                        // Adjust for leap years if needed? Keep simpler for now.
                        // Standardize to ISO string YYYY-MM-DD

                        return {
                            ...t,
                            id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                            date: newDate.toISOString().split('T')[0],
                            status: 'projected' as TransactionStatus,
                            paymentStatus: 'pending' as const,
                            installment: undefined,
                            updated_at: new Date().toISOString(),
                            created_at: new Date().toISOString(),
                        };
                    });

                    return {
                        transactions: [...state.transactions, ...newTransactions],
                    };
                }),

            deleteCategory: (id) =>
                set((state) => ({
                    categories: state.categories.filter((c) => c.id !== id),
                    // Also clear category_id from transactions using this category
                    transactions: state.transactions.map((t) =>
                        t.category_id === id ? { ...t, category_id: '' } : t
                    ),
                })),

            setFilters: (newFilters) =>
                set((state) => ({
                    filters: { ...state.filters, ...newFilters },
                })),

            toggleProjectedMode: () =>
                set((state) => ({
                    filters: { ...state.filters, showProjected: !state.filters.showProjected },
                })),

            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
            setDemoMode: (isDemoMode) => set({ isDemoMode }),

            // Computed: Get monthly aggregated data
            getMonthlyData: () => {
                const { transactions, filters } = get();
                const data: MonthlyData[] = [];

                for (let month = 1; month <= 12; month++) {
                    const monthTransactions = transactions.filter((t) => {
                        const tDate = new Date(t.date);
                        const matchYear = tDate.getFullYear() === filters.year;
                        const matchMonth = tDate.getMonth() + 1 === month;
                        const matchOrigin = filters.origin === 'all' || t.origin === filters.origin;
                        return matchYear && matchMonth && matchOrigin;
                    });

                    const incomeReal = monthTransactions
                        .filter((t) => t.type === 'income' && t.status === 'real')
                        .reduce((sum, t) => sum + t.amount, 0);

                    const incomeProjected = monthTransactions
                        .filter((t) => t.type === 'income' && t.status === 'projected')
                        .reduce((sum, t) => sum + t.amount, 0);

                    const expenseReal = monthTransactions
                        .filter((t) => t.type === 'expense' && t.status === 'real')
                        .reduce((sum, t) => sum + t.amount, 0);

                    const expenseProjected = monthTransactions
                        .filter((t) => t.type === 'expense' && t.status === 'projected')
                        .reduce((sum, t) => sum + t.amount, 0);

                    data.push({
                        month,
                        year: filters.year,
                        monthName: MONTH_NAMES[month - 1],
                        income: {
                            real: incomeReal,
                            projected: incomeProjected,
                            total: incomeReal + incomeProjected,
                        },
                        expense: {
                            real: expenseReal,
                            projected: expenseProjected,
                            total: expenseReal + expenseProjected,
                        },
                        utility: {
                            real: incomeReal - expenseReal,
                            projected: incomeProjected - expenseProjected,
                            total: incomeReal + incomeProjected - expenseReal - expenseProjected,
                        },
                    });
                }

                return data;
            },

            // Computed: Get category data organized by month
            getCategoryMonthlyData: (type: TransactionType) => {
                const { transactions, filters, categories } = get();
                const categoryMap = new Map<string, Map<number, { amount: number; status: TransactionStatus; id?: string; level?: CategoryLevel; sublevel?: string; color?: string }>>();

                const filteredTransactions = transactions.filter((t) => {
                    const tDate = new Date(t.date);
                    const matchYear = tDate.getFullYear() === filters.year;
                    const matchType = t.type === type;
                    const matchOrigin = filters.origin === 'all' || t.origin === filters.origin;
                    return matchYear && matchType && matchOrigin;
                });

                for (const t of filteredTransactions) {
                    const categoryName = t.category?.name || t.description || 'Sin categoría';
                    const month = new Date(t.date).getMonth() + 1;

                    // Look up category to get level, sublevel and color
                    const category = categories.find(c => c.id === t.category_id) || t.category;
                    const level = category?.level || 'empresa';
                    const sublevel = category?.sublevel;
                    const color = category?.color;

                    if (!categoryMap.has(categoryName)) {
                        categoryMap.set(categoryName, new Map());
                    }

                    const monthData = categoryMap.get(categoryName)!;
                    const existing = monthData.get(month);

                    if (existing) {
                        // Aggregate amounts for same category/month
                        monthData.set(month, {
                            amount: existing.amount + t.amount,
                            status: t.status === 'real' ? 'real' : existing.status, // real takes priority
                            id: t.id,
                            level,
                            sublevel,
                            color,
                        });
                    } else {
                        monthData.set(month, {
                            amount: t.amount,
                            status: t.status,
                            id: t.id,
                            level,
                            sublevel,
                            color,
                        });
                    }
                }

                return categoryMap;
            },

            // Computed: Get client revenue data for Empresa level income transactions
            getClientRevenueData: () => {
                const { transactions, filters, categories } = get();
                const clientMap = new Map<string, ClientRevenueData>();

                // Filter income transactions from Empresa level categories
                const incomeTransactions = transactions.filter((t) => {
                    const tDate = new Date(t.date);
                    const matchYear = tDate.getFullYear() === filters.year;
                    const matchType = t.type === 'income';
                    const matchOrigin = t.origin === 'business'; // Empresa = business
                    const category = categories.find((c) => c.id === t.category_id);
                    const matchLevel = !category || category.level === 'empresa';
                    // Respect showProjected filter - exclude projected when in "Solo Confirmado" mode
                    const matchStatus = filters.showProjected || t.status === 'real';
                    return matchYear && matchType && matchOrigin && matchLevel && matchStatus;
                });

                for (const t of incomeTransactions) {
                    const clientName = t.description || t.category?.name || 'Cliente sin nombre';
                    const month = new Date(t.date).getMonth() + 1;

                    if (!clientMap.has(clientName)) {
                        clientMap.set(clientName, {
                            clientName,
                            monthlyRevenue: {},
                            yearlyTotal: 0,
                        });
                    }

                    const clientData = clientMap.get(clientName)!;
                    clientData.monthlyRevenue[month] = (clientData.monthlyRevenue[month] || 0) + t.amount;
                    clientData.yearlyTotal += t.amount;
                }

                // Sort by yearly total descending and return as array
                return Array.from(clientMap.values()).sort((a, b) => b.yearlyTotal - a.yearlyTotal);
            },
        }),
        {
            name: 'flujoglobal-storage',
            partialize: (state) => ({
                filters: state.filters,
                isDemoMode: state.isDemoMode,
            }),
        }
    )
);

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
    Profile,
    MONTH_NAMES,
} from '@/types';
import { calculateMonthlyData, calculateCategoryMonthlyData } from '@/lib/financialCalculations'; // Import shared logic

interface FinanceState {
    // Data
    transactions: Transaction[];
    categories: Category[];
    profile: Profile | null;
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

    setProfile: (profile: Profile | null) => void;
    updateProfile: (updates: Partial<Profile>) => void;

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
            profile: null,
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

            setProfile: (profile) => set({ profile }),

            updateProfile: (updates) =>
                set((state) => ({
                    profile: state.profile ? { ...state.profile, ...updates } : null,
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
                            currency_code: 'CLP',
                            exchange_rate: 1,
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
                const { transactions, filters, categories } = get();
                return calculateMonthlyData(transactions, filters, categories);
            },

            // Computed: Get category data organized by month
            getCategoryMonthlyData: (type: TransactionType) => {
                const { transactions, filters, categories } = get();
                return calculateCategoryMonthlyData(transactions, categories, filters, type);
            },

            // Computed: Get client revenue data for Empresa level income transactions
            getClientRevenueData: () => {
                const { transactions, filters, categories } = get();
                const clientMap = new Map<string, ClientRevenueData>();

                // Filter income transactions from Empresa level categories
                const incomeTransactions = transactions.filter((t) => {
                    const [tYear] = t.date.split('-').map(Number);
                    const matchYear = tYear === filters.year;
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
                    const [, tMonth] = t.date.split('-').map(Number);
                    const month = tMonth;

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

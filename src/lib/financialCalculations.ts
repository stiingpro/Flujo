// src/lib/financialCalculations.ts
import { Transaction, Category, DashboardFilters, MonthlyData, CategoryLevel, TransactionType, TransactionStatus, MONTH_NAMES } from '@/types';

// Helper to determine the effective origin of a transaction based on its category
function resolveOrigin(t: Transaction, categories: Category[]): string {
    // If the transaction has a category object attached, use it
    if (t.category) {
        return t.category.level === 'personal' ? 'personal' : 'business';
    }

    // Otherwise try to find it in the list (if provided)
    if (t.category_id && categories.length > 0) {
        const cat = categories.find(c => c.id === t.category_id);
        if (cat) {
            return cat.level === 'personal' ? 'personal' : 'business';
        }
    }

    // Fallback to the transaction's stored origin
    return t.origin;
}

export function calculateMonthlyData(
    transactions: Transaction[],
    filters: DashboardFilters,
    categories: Category[] = [] // Optional for backward compatibility, but recommended
): MonthlyData[] {
    const data: MonthlyData[] = [];

    for (let month = 1; month <= 12; month++) {
        const monthTransactions = transactions.filter((t) => {
            const [tYear, tMonth] = t.date.split('-').map(Number);
            const matchYear = tYear === filters.year;
            const matchMonth = tMonth === month;

            const effectiveOrigin = resolveOrigin(t, categories);
            const matchOrigin = filters.origin === 'all' || effectiveOrigin === filters.origin;

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
}

export function calculateCategoryMonthlyData(
    transactions: Transaction[],
    categories: Category[],
    filters: DashboardFilters,
    type: TransactionType
) {
    const categoryMap = new Map<string, Map<number, { amount: number; status: TransactionStatus; id?: string; level?: CategoryLevel; sublevel?: string; color?: string }>>();

    const filteredTransactions = transactions.filter((t) => {
        const [tYear] = t.date.split('-').map(Number);
        const matchYear = tYear === filters.year;
        const matchType = t.type === type;

        const effectiveOrigin = resolveOrigin(t, categories);
        const matchOrigin = filters.origin === 'all' || effectiveOrigin === filters.origin;

        return matchYear && matchType && matchOrigin;
    });

    for (const t of filteredTransactions) {
        const categoryName = t.category?.name || t.description || 'Sin categoría';
        const [, tMonth] = t.date.split('-').map(Number);
        const month = tMonth; // 1-12

        // Look up category to get level, sublevel and color
        // Note: t.category might be populated, or we find it in categories list
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
}

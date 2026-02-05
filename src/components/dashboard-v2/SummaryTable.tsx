'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { useProjectData } from '@/hooks/useProjectData'; // Reuse centralized hook
import { calculateCategoryMonthlyData } from '@/lib/financialCalculations';
import { MONTH_NAMES } from '@/types';
import { cn } from '@/lib/utils';
import { FocusMode } from './FocusToggle';

interface SummaryTableProps {
    focusMode: FocusMode;
}

export function SummaryTable({ focusMode }: SummaryTableProps) {
    const { transactions, filters, categories } = useProjectData();
    const currentMonthIndex = new Date().getMonth();
    const currentMonthRef = useRef<HTMLTableCellElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll on mount
    useEffect(() => {
        if (scrollContainerRef.current && currentMonthRef.current) {
            setTimeout(() => {
                currentMonthRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }, 500);
        }
    }, []);

    // 1. Calculate Monthly Net Flow directly
    const monthlyData = useMemo(() => {
        // We calculate Income and Expense separately using the robust calculator
        const incomeMap = calculateCategoryMonthlyData(transactions, categories, filters, 'income');
        const expenseMap = calculateCategoryMonthlyData(transactions, categories, filters, 'expense');

        // We need to aggregate ALL categories into a single monthly total
        // But respecting the focusMode (Personal vs Company)

        // Helper to check if a category name belongs to the current Focus Mode
        // This mirrors the logic in SmartMonthTable but simplified since we just need totals
        const isVisible = (categoryName: string, type: 'income' | 'expense') => {
            const category = categories.find(c => c.name === categoryName && c.type === type);
            if (!category) return true; // Fallback

            const level = category.level || 'empresa'; // default

            if (focusMode === 'all') return true;
            if (focusMode === 'company' && level === 'empresa') return true;
            if (focusMode === 'personal' && level === 'personal') return true;

            return false;
        };

        const result = new Map<number, number>();

        // Initialize months
        for (let i = 1; i <= 12; i++) {
            result.set(i, 0);
        }

        // Sum Income
        incomeMap.forEach((months, catName) => {
            if (!isVisible(catName, 'income')) return;
            months.forEach((cell, month) => {
                if (filters.showProjected || cell.status === 'real') {
                    const current = result.get(month) || 0;
                    result.set(month, current + cell.amount);
                }
            });
        });

        // Subtract Expenses
        expenseMap.forEach((months, catName) => {
            if (!isVisible(catName, 'expense')) return;
            months.forEach((cell, month) => {
                if (filters.showProjected || cell.status === 'real') {
                    const current = result.get(month) || 0;
                    result.set(month, current - cell.amount);
                }
            });
        });

        return result;
    }, [transactions, categories, filters, focusMode]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(val);
    };

    // Calculate Grand Total (Year Balance)
    const yearTotal = Array.from(monthlyData.values()).reduce((a, b) => a + b, 0);

    return (
        <div className="relative rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col h-full ring-1 ring-border">
            <div ref={scrollContainerRef} className="overflow-x-auto relative flex-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                <table className="w-full border-collapse min-w-max text-left">
                    <thead className="bg-muted/80 text-muted-foreground sticky top-0 z-30 backdrop-blur-sm">
                        <tr>
                            <th className="sticky left-0 z-40 bg-muted/90 py-3 pl-4 font-semibold text-xs uppercase tracking-wider border-r border-border w-[180px]">
                                Concepto
                            </th>
                            {MONTH_NAMES.map((m, i) => (
                                <th key={m} className={cn(
                                    "py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right min-w-[130px]",
                                    i === currentMonthIndex && "text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/20"
                                )}>
                                    {m.substring(0, 3)}
                                    {i === currentMonthIndex && <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1 rounded">HOY</span>}
                                </th>
                            ))}
                            <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right min-w-[130px] bg-muted/50">
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        <tr className="group hover:bg-muted/50 transition-colors">
                            <td className="sticky left-0 z-20 bg-background/95 backdrop-blur group-hover:bg-muted/90 py-4 pl-4 font-bold text-sm text-foreground border-r border-border">
                                Balance Mensual
                            </td>
                            {MONTH_NAMES.map((_, index) => {
                                const month = index + 1;
                                const amount = monthlyData.get(month) || 0;
                                const isCurrent = index === currentMonthIndex;
                                const isPositive = amount >= 0;

                                return (
                                    <td
                                        key={month}
                                        ref={isCurrent ? currentMonthRef : undefined}
                                        className={cn(
                                            "px-4 py-4 text-right font-mono-numbers text-sm",
                                            isCurrent && "bg-blue-50/20 dark:bg-blue-900/10",
                                            isPositive ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-rose-600 dark:text-rose-400 font-medium"
                                        )}
                                    >
                                        {formatCurrency(amount)}
                                    </td>
                                );
                            })}
                            <td className={cn(
                                "px-4 py-4 text-right font-bold font-mono-numbers text-sm bg-muted/30",
                                yearTotal >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
                            )}>
                                {formatCurrency(yearTotal)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

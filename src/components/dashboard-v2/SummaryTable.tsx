'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { useProjectData } from '@/hooks/useProjectData'; // Reuse centralized hook
import { calculateCategoryMonthlyData } from '@/lib/financialCalculations';
import { useFinancialMetrics } from '@/hooks/useFinancialMetrics';
import { MONTH_NAMES } from '@/types';
import { cn } from '@/lib/utils';
import { FocusMode } from './FocusToggle';

interface SummaryTableProps {
    focusMode: FocusMode;
}

export function SummaryTable({ focusMode }: SummaryTableProps) {
    const { monthlyData } = useFinancialMetrics(focusMode);
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

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(val);
    };

    // Calculate Grand Total (Year Balance - Net)
    const yearTotalNet = monthlyData.reduce((acc, m) => acc + m.net, 0);
    // For Accumulated, the "Total" column usually shows the Final Ending Balance (Dec)? 
    // Or sum of accumulated? Sum of accumulated makes no sense.
    // The total of "Balance Acumulado" implies the position at end of year.
    const finalAccumulated = monthlyData[monthlyData.length - 1]?.accumulated || 0;

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
                        {/* Row 1: Net Flow (Balance Mensual) */}
                        <tr className="group hover:bg-muted/50 transition-colors">
                            <td className="sticky left-0 z-20 bg-background/95 backdrop-blur group-hover:bg-muted/90 py-4 pl-4 font-bold text-sm text-foreground border-r border-border">
                                Balance Mensual
                            </td>
                            {MONTH_NAMES.map((_, index) => {
                                const month = index + 1;
                                const data = monthlyData.find(d => d.month === month);
                                const amount = data?.net || 0;
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
                                yearTotalNet >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
                            )}>
                                {formatCurrency(yearTotalNet)}
                            </td>
                        </tr>

                        {/* Row 2: Accumulated Balance (Balance Acumulado) */}
                        <tr className="group hover:bg-muted/50 transition-colors bg-muted/10">
                            <td className="sticky left-0 z-20 bg-background/95 backdrop-blur group-hover:bg-muted/90 py-4 pl-4 font-bold text-sm text-foreground border-r border-border border-l-4 border-l-blue-500">
                                Balance Acumulado
                            </td>
                            {MONTH_NAMES.map((_, index) => {
                                const month = index + 1;
                                const data = monthlyData.find(d => d.month === month);
                                const amount = data?.accumulated || 0;
                                const isCurrent = index === currentMonthIndex;
                                const isPositive = amount >= 0;

                                return (
                                    <td
                                        key={month}
                                        className={cn(
                                            "px-4 py-4 text-right font-mono-numbers text-sm border-t border-border/50",
                                            isCurrent && "bg-blue-50/20 dark:bg-blue-900/10",
                                            isPositive ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-rose-600 dark:text-rose-400 font-bold"
                                        )}
                                    >
                                        {formatCurrency(amount)}
                                    </td>
                                );
                            })}
                            {/* For Accumulated, the Total Column could be skipped or show final. Let's show final. */}
                            <td className={cn(
                                "px-4 py-4 text-right font-bold font-mono-numbers text-sm bg-muted/30 border-t border-border/50",
                                finalAccumulated >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
                            )}>
                                {formatCurrency(finalAccumulated)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

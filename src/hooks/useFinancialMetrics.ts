'use client';

import { useMemo } from 'react';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { useProjectData } from '@/hooks/useProjectData';
import { calculateCategoryMonthlyData } from '@/lib/financialCalculations';
import { FocusMode } from '@/components/dashboard-v2/FocusToggle';

export interface MonthlyMetric {
    month: number;
    income: number;
    expense: number;
    net: number;
    accumulated: number;
}

export interface KPIMetrics {
    runway: number;
    burnRate: number;
    monthlyRevenue: number; // Current view month
    monthlyExpense: number; // Current view month
    lastMonthDelta: number;
    netMargin: number;
    cashOnHand: number; // Cash on hand (Accumulated up to TODAY)
    netCashFlow: number; // Current month net flow
}

export function useFinancialMetrics(focusMode: FocusMode) {
    const { transactions, categories, filters } = useProjectData();

    // Core Calculation Logic
    const metrics = useMemo(() => {
        // 1. Calculate Monthly Raw Data
        const incomeMap = calculateCategoryMonthlyData(transactions, categories, filters, 'income');
        const expenseMap = calculateCategoryMonthlyData(transactions, categories, filters, 'expense');

        // Helper to check visibility (Copied from SummaryTable to stay consistent)
        const isVisible = (categoryName: string, type: 'income' | 'expense') => {
            const category = categories.find(c => c.name === categoryName && c.type === type);
            if (!category) return true;
            const level = category.level || 'empresa';
            if (focusMode === 'all') return true;
            if (focusMode === 'company' && level === 'empresa') return true;
            if (focusMode === 'personal' && level === 'personal') return true;
            return false;
        };

        const monthlyTotals = new Map<number, { income: number; expense: number }>();
        for (let i = 1; i <= 12; i++) {
            monthlyTotals.set(i, { income: 0, expense: 0 });
        }

        // Aggregate Income
        incomeMap.forEach((months, catName) => {
            if (!isVisible(catName, 'income')) return;
            months.forEach((cell, month) => {
                if (filters.showProjected || cell.status === 'real') {
                    const current = monthlyTotals.get(month)!;
                    current.income += cell.amount;
                }
            });
        });

        // Aggregate Expense
        expenseMap.forEach((months, catName) => {
            if (!isVisible(catName, 'expense')) return;
            months.forEach((cell, month) => {
                if (filters.showProjected || cell.status === 'real') {
                    const current = monthlyTotals.get(month)!;
                    current.expense += cell.amount;
                }
            });
        });

        // 2. Build Sequential Data & Accumulated Balance
        const monthlyData: MonthlyMetric[] = [];
        let runningBalance = 0;

        for (let i = 1; i <= 12; i++) {
            const { income, expense } = monthlyTotals.get(i)!;
            const net = income - expense;
            runningBalance += net;

            monthlyData.push({
                month: i,
                income,
                expense,
                net,
                accumulated: runningBalance
            });
        }

        // 3. KPI Calculations
        const currentMonthIndex = new Date().getMonth(); // 0-11
        const currentData = monthlyData[currentMonthIndex] || { income: 0, expense: 0, net: 0, accumulated: 0 };
        const lastMonthData = monthlyData[currentMonthIndex - 1] || { income: 0, expense: 0, net: 0 };

        // Delta
        const currentNet = currentData.net;
        const lastNet = lastMonthData.net;
        const lastMonthDelta = lastNet !== 0 ? ((currentNet - lastNet) / Math.abs(lastNet)) * 100 : 0;

        // Burn Rate (Last 3 Months Average Expense)
        let totalBurn = 0;
        let burnCount = 0;
        // Check last 3 months relative to NOW
        for (let i = 1; i <= 3; i++) {
            const targetIndex = currentMonthIndex - i;
            if (targetIndex >= 0) {
                const mData = monthlyData[targetIndex];
                if (mData.expense > 0) {
                    totalBurn += mData.expense;
                    burnCount++;
                }
            }
        }
        const avgBurnRate = burnCount > 0 ? totalBurn / burnCount : 0;

        // OXYGEN (RUNWAY) CALCULATION - NEW LOGIC
        // "Months until accumulated balance < 0"
        // We start looking from the CURRENT month forward.
        // If current accumulated is already < 0, runway is 0.
        // If it never goes < 0 in the view (12 months), we say 12+.
        // To be more precise, we might want to check *fraction* of the month if we really wanted to, 
        // but checking whole months is robust enough for "3.5" (maybe interpolate?).
        // The user image shows "3.5 months".

        // Let's find the first month index (relative to now) where accumulated < 0.
        let runway = 12; // Default to max
        let foundCritical = false;

        // We only care about FUTURE from 'now'
        for (let i = currentMonthIndex; i < 12; i++) {
            if (monthlyData[i].accumulated < 0) {
                // This month it goes negative.
                // Distance = (i - currentMonthIndex).
                // Example: We are in Feb (idx 1). June (idx 5) is negative.
                // Runway = 5 - 1 = 4 months.

                // Let's try to verify if we can get decimal precision.
                // Previous month (i-1) was positive. This month (i) is negative.
                // We consumed the remaining cash.
                // Amount to consume = MonthlyData[i-1].accumulated (The surplus carried info this month).
                // Net Burn this month = Math.abs(MonthlyData[i].net).
                // Fraction = Surplus / Burn.

                const prevAccum = (i > 0) ? monthlyData[i - 1].accumulated : 0; // If Jan is negative, prev is 0?
                // If i == currentMonthIndex and it's already negative, runway is 0.

                if (i === currentMonthIndex && prevAccum <= 0) {
                    // Actually if Jan (idx 0) is negative, prev is 0. 
                    // YTD starts at 0? Or do we assume previous year carry over? 
                    // The task implies YTD reset at Jan.
                    runway = 0;
                } else {
                    const burnInCriticalMonth = Math.abs(monthlyData[i].net); // Net should be negative here
                    const fraction = burnInCriticalMonth > 0 ? (prevAccum / burnInCriticalMonth) : 0;
                    runway = (i - currentMonthIndex) - 1 + fraction;
                    // Example: Current=Feb(1). June(5) is neg.
                    // i=5. Dist = 5-1 = 4 months base?
                    // Wait. Feb(1)..Mar(2)..Apr(3)..May(4)..June(5).
                    // If June is neg, we survived May.
                    // Full months = May(4) - Feb(1) = 3 months full?
                    // Or Feb, Mar, Apr, May -> 4 months.

                    // Simple count:
                    // If Feb is OK, +1. Mar OK, +1. Apr OK, +1. May OK, +1.
                    // June fails.
                    // Count = 4.

                    // Logic:
                    // Loop j from current to i-1. Count 1 for each.
                    // For month i, add fraction.
                    let fullMonths = 0;
                    if (i > currentMonthIndex) {
                        fullMonths = i - currentMonthIndex; // If i=5, current=1. 4 full months (Feb,Mar,Apr,May)??
                        // Wait. If current is Feb(1). 
                        // We check Feb. Feb is OK. (0.x month passed? No runway is forward looking).
                        // If Feb is OK, we have *at least* until end of Feb?
                        // Usually Runway 3.5 means 3.5 months from *now*.
                        // If we use Month buckets, we are approximating.
                    }

                    // Let's approximate: 
                    // Runway = (Months with + Accum) + (Last Positive Accum / Net Loss of next month)

                    // Fix:
                    // If current month accumulated is positive, we exist in current month.
                    // Iterate forward.
                    let months = 0;
                    for (let j = currentMonthIndex; j < 12; j++) {
                        if (monthlyData[j].accumulated >= 0) {
                            months += 1;
                        } else {
                            // This is the failing month.
                            // Calculate fraction.
                            const prevBalance = (j > 0) ? monthlyData[j - 1].accumulated : 0;
                            const monthlyLoss = Math.abs(monthlyData[j].net);
                            const frac = monthlyLoss > 0 ? prevBalance / monthlyLoss : 0;
                            months += frac - 1; // Subtract 1 because loop added 1 for this month already?
                            // No, loop breaks.
                            // Actually, if loop structure is:
                            // Check Jan. Pos. Months=1.
                            // Check Feb. Neg. Months=1 + frac?
                            // But we want distance from *now*.
                            // If we are in Jan. 
                            // Jan Pos, Feb Pos, Mar Neg.
                            // Runway = Jan+Feb = 2 months + fraction of Mar.

                            // Correct logic:
                            // Start loop from current.
                            // If current is Neg, runway is 0.
                            // If current Pos, next Neg? Runway is fraction.
                        }
                    }
                }

                // Let's simplify.
                // Find Index of first negative month >= currentMonthIndex.
                const firstNegIndex = monthlyData.findIndex((m, idx) => idx >= currentMonthIndex && m.accumulated < 0);

                if (firstNegIndex === -1) {
                    runway = 12 - currentMonthIndex; // Survived until end of year
                } else {
                    // Logic:
                    // Months fully survived = (firstNegIndex - currentMonthIndex). 
                    // Example: Current=1 (Feb), Neg=5 (June). 5-1 = 4. (Feb, Mar, Apr, May).
                    // Add fraction of the failing month.
                    const prevAccum = monthlyData[firstNegIndex - 1].accumulated;
                    const loss = Math.abs(monthlyData[firstNegIndex].net);
                    const fraction = loss !== 0 ? prevAccum / loss : 0;

                    runway = (firstNegIndex - currentMonthIndex) + fraction;

                    // Edge case check: Current=1 (Feb). Feb is Neg.
                    // firstNegIndex = 1.
                    // 1-1 = 0 full months.
                    // prevAccum = Jan's accum.
                    // fraction = JanAccum / FebLoss.
                    // Runway = 0 + fraction. Correct.
                }

                foundCritical = true;
                break; // Stop at first negative
            }
        }

        if (!foundCritical) {
            runway = 12 - currentMonthIndex; // Cap at end of year view
        }

        // Net Margin
        const netMargin = currentData.income > 0
            ? (currentData.net / currentData.income) * 100
            : 0;

        return {
            monthlyData,
            kpi: {
                runway: Math.max(0, runway), // Floor at 0
                burnRate: avgBurnRate,
                monthlyRevenue: currentData.income,
                monthlyExpense: currentData.expense,
                lastMonthDelta,
                netMargin,
                cashOnHand: currentData.accumulated, // Current month accumulated
                netCashFlow: currentData.net
            }
        };

    }, [transactions, categories, filters, focusMode]);

    return metrics;
}

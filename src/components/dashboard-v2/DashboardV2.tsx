'use client';

import { useState, useEffect } from 'react';
import { SmartMonthTable } from './SmartMonthTable';
import { SummaryTable } from './SummaryTable';
import { FocusToggle, FocusMode } from './FocusToggle';
import { InvestorToggle } from '@/components/dashboard/InvestorToggle';
import { ImportWizardModal } from '@/components/import/ImportWizardModal';
import { KPIGrid } from './KPIGrid';
import { AdvancedExportManager } from '@/components/reports/AdvancedExportManager';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { useSimulationStore } from '@/stores/useSimulationStore';
import { SimulationSidebar } from '@/components/simulation/SimulationSidebar';
import { useFeatureMode } from '@/context/FeatureModeContext';
import { useMonthlyBalances } from '@/hooks/useMonthlyBalances';
import { MainTab, MonthlyBalance } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingDown, TrendingUp, Sparkles, Filter, Bot, Scale } from 'lucide-react';
import { Toaster } from 'sonner';

import { resolveOrigin } from '@/lib/financialCalculations'; // Import helper

export function DashboardV2() {
    const [focusMode, setFocusMode] = useState<FocusMode>('all');
    const [isInvestorMode, setIsInvestorMode] = useState(false);
    const [activeTab, setActiveTab] = useState<MainTab>('gastos');
    const { transactions, filters, setFilters, categories } = useFinanceStore(); // Get categories
    const { isPro } = useFeatureMode();

    // Unified Handler for Focus Mode
    const handleFocusChange = (mode: FocusMode) => {
        setFocusMode(mode);
        const originMap: Record<FocusMode, 'all' | 'business' | 'personal'> = {
            'all': 'all',
            'company': 'business',
            'personal': 'personal'
        };
        setFilters({ origin: originMap[mode] });
    };

    // Reset Investor Mode
    useEffect(() => {
        if (!isPro) setIsInvestorMode(false);
    }, [isPro]);

    // --- CLIENT-SIDE KPI CALCULATION (Dynamic Filtering) ---
    // This replaces useMonthlyBalances db view to ensure strict filtering by origin
    const calculateMetrics = () => {
        // 1. Filter Transactions based on View Mode
        const relevantTransactions = transactions.filter(t => {
            const effectiveOrigin = resolveOrigin(t, categories); // Use resolved origin

            if (focusMode === 'company' && effectiveOrigin !== 'business') return false;
            if (focusMode === 'personal' && effectiveOrigin !== 'personal') return false;

            // Respect Projected Mode
            if (!filters.showProjected && t.status !== 'real') return false;

            return true;
        });

        // 2. Calculate Monthly Totals for Current Year and Previous Year (for Delta/Runway)
        // We need previous year strictly for "Last Month Delta" if we are in Jan
        const getMonthTotal = (year: number, month: number) => {
            return relevantTransactions
                .filter(t => {
                    const d = new Date(t.date);
                    return d.getFullYear() === year && (d.getMonth() + 1) === month;
                })
                .reduce((acc, t) => {
                    const amount = t.amount;
                    return {
                        income: acc.income + (t.type === 'income' ? amount : 0),
                        expense: acc.expense + (t.type === 'expense' ? amount : 0),
                    };
                }, { income: 0, expense: 0 });
        };

        const currentDate = new Date();
        const currentYear = filters.year; // Use selected year for dashboard view
        const currentMonth = currentDate.getMonth() + 1; // Real current month

        // Use the selected year's data for the "Monthly Performance" card
        // If selected year is distinct from real time, we imply "Current View Month". 
        // But usually KPIs refer to "Now". Let's assume dashboard shows selected year context, 
        // but runway is always "Today's Cash" / "Average Burn".

        // For "Desempeño Mensual", assume we show the current calendar month if within selected year, 
        // otherwise show first month or average? 
        // Feedback image shows "FEB HOY", so we align to current real-time month if visible, or strict 'today'.

        // A. Current Month Performance (Real Time Context)
        const perfYear = currentDate.getFullYear();
        const perfMonth = currentMonth;
        const currentMonthStats = getMonthTotal(perfYear, perfMonth);

        // B. Last Month (for Delta)
        const lastMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const lastMonthStats = getMonthTotal(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1);

        // Delta (Net Flow)
        const currentNet = currentMonthStats.income - currentMonthStats.expense;
        const lastNet = lastMonthStats.income - lastMonthStats.expense;
        const lastMonthDelta = lastNet !== 0 ? ((currentNet - lastNet) / Math.abs(lastNet)) * 100 : 0;

        // C. Burn Rate (Last 3 Months Average Expense)
        // Iterate backwards 3 months from now
        let totalBurn = 0;
        let monthsCounted = 0;
        for (let i = 1; i <= 3; i++) {
            const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const stats = getMonthTotal(d.getFullYear(), d.getMonth() + 1);
            if (stats.expense > 0) {
                totalBurn += stats.expense;
                monthsCounted++;
            }
        }
        const avgBurnRate = monthsCounted > 0 ? totalBurn / monthsCounted : 0;

        // D. Runway (Total Cash / Burn Rate)
        // Total Cash is Cumulative Utility of ALL TIME (filtered)
        const totalIncomeAll = relevantTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const totalExpenseAll = relevantTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const currentCash = totalIncomeAll - totalExpenseAll;

        const runway = avgBurnRate > 0 ? (currentCash / avgBurnRate) : 0;

        // E. Net Margin
        const netMargin = currentMonthStats.income > 0
            ? ((currentMonthStats.income - currentMonthStats.expense) / currentMonthStats.income) * 100
            : 0;

        return {
            runway,
            burnRate: avgBurnRate,
            monthlyRevenue: currentMonthStats.income,
            monthlyExpense: currentMonthStats.expense,
            lastMonthDelta,
            netMargin,
            cashOnHand: currentCash,
            netCashFlow: currentNet
        };
    };

    const metrics = calculateMetrics();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Top Controls Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        Radar Financiero <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Visión financiera {filters.year}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-muted/30 p-1 rounded-lg border items-center gap-2">
                        <InvestorToggle isInvestorMode={isInvestorMode} onToggle={() => setIsInvestorMode(!isInvestorMode)} />
                        <div className="w-px h-6 bg-border mx-1" />
                        <FocusToggle value={focusMode} onChange={handleFocusChange} />
                    </div>
                </div>
            </div>

            {/* KPI Section */}
            <div className={`transition-all duration-500 ${isInvestorMode ? 'grayscale-[0.3]' : ''}`}>
                <KPIGrid metrics={metrics} />
            </div>

            {/* Main Tabs (Income/Expense Unified View) */}
            <div className={`relative transition-all duration-500 ${isInvestorMode ? 'blur-md opacity-40 pointer-events-none select-none' : ''}`}>
                {isInvestorMode && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center">
                        <div className="bg-background/80 backdrop-blur-sm p-6 rounded-xl border shadow-lg text-center">
                            <h3 className="text-lg font-semibold mb-1">Vista Detallada Oculta</h3>
                            <p className="text-sm text-muted-foreground">Modo Inversionista Activo</p>
                        </div>
                    </div>
                )}

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
                    <div className="flex items-center justify-between">
                        <TabsList className="h-10 bg-muted/60">
                            <TabsTrigger value="gastos" className="gap-2 px-6">
                                <TrendingDown className="w-4 h-4 text-rose-500" />
                                Gastos
                            </TabsTrigger>
                            <TabsTrigger value="ingresos" className="gap-2 px-6">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                Ingresos
                            </TabsTrigger>
                            <TabsTrigger value="resumen" className="gap-2 px-6 text-blue-600 data-[state=active]:text-blue-700">
                                <Scale className="w-4 h-4" />
                                Resumen
                            </TabsTrigger>
                        </TabsList>

                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Mostrando: <span className="font-medium text-foreground">{focusMode === 'all' ? 'Todo' : focusMode === 'company' ? 'Sólo Empresa' : 'Sólo Personal'}</span>
                        </div>
                    </div>

                    <TabsContent value="gastos" className="m-0 focus-visible:ring-0">
                        <SmartMonthTable filterType="expense" focusMode={focusMode} />
                    </TabsContent>

                    <TabsContent value="ingresos" className="m-0 focus-visible:ring-0">
                        <SmartMonthTable filterType="income" focusMode={focusMode} />
                    </TabsContent>

                    <TabsContent value="resumen" className="m-0 focus-visible:ring-0">
                        <SummaryTable focusMode={focusMode} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

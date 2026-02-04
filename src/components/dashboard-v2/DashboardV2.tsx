'use client';

import { useState } from 'react';
import { SmartMonthTable } from './SmartMonthTable';
import { FocusToggle, FocusMode } from './FocusToggle';
import { InvestorToggle } from '@/components/dashboard/InvestorToggle';
import { ImportWizardModal } from '@/components/import/ImportWizardModal';
import { KPIGrid } from './KPIGrid';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { useMonthlyBalances } from '@/hooks/useMonthlyBalances';
import { MainTab, MonthlyBalance } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingDown, TrendingUp, Sparkles, Filter } from 'lucide-react';

export function DashboardV2() {
    const [focusMode, setFocusMode] = useState<FocusMode>('all');
    const [isInvestorMode, setIsInvestorMode] = useState(false);
    const [activeTab, setActiveTab] = useState<'gastos' | 'ingresos'>('gastos');
    const { filters } = useFinanceStore();
    const { balances, isLoading: isLoadingBalances } = useMonthlyBalances();

    // Calculate Real Metrics
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear(); // e.g. 2026

    // 1. Current Month Data
    const currentMonthData = balances.find((b: MonthlyBalance) => b.year === filters.year && b.month === currentMonth) || {
        total_income: 0,
        total_expense: 0,
        net_flow: 0
    };

    // 2. Last Month Data (for Delta)
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? filters.year - 1 : filters.year;
    const lastMonthData = balances.find((b: MonthlyBalance) => b.year === lastMonthYear && b.month === lastMonth);

    // Delta percentage calculation
    const lastMonthNet = lastMonthData?.net_flow || 1; // Avoid division by zero
    const currentNet = currentMonthData.net_flow;
    const rawDelta = lastMonthData ? ((currentNet - lastMonthNet) / Math.abs(lastMonthNet)) * 100 : 0;
    const lastMonthDelta = isFinite(rawDelta) ? rawDelta : 0;

    // 3. Burn Rate (Average expense of last 3 months)
    // Filter relevant months
    const last3Months = balances
        .filter((b: MonthlyBalance) => {
            const bDate = new Date(b.year, b.month - 1);
            const now = new Date(currentYear, currentMonth - 1);
            const diffTime = Math.abs(now.getTime() - bDate.getTime());
            const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
            return diffMonths <= 3 && b.total_expense > 0;
        });

    const avgBurnRate = last3Months.length > 0
        ? last3Months.reduce((acc: number, curr: MonthlyBalance) => acc + Number(curr.total_expense), 0) / last3Months.length
        : 0;

    // 4. Runway (Current Cash / Burn Rate)
    // Find absolute latest balance (cumulative utility)
    const latestBalanceRecord = [...balances].sort((a: MonthlyBalance, b: MonthlyBalance) => (a.year * 100 + a.month) - (b.year * 100 + b.month)).pop();
    const currentCash = latestBalanceRecord?.cumulative_utility || 0;
    const runway = avgBurnRate > 0 ? (currentCash / avgBurnRate) : 0;


    const metrics = {
        runway: runway,
        burnRate: avgBurnRate,
        monthlyRevenue: Number(currentMonthData.total_income),
        monthlyExpense: Number(currentMonthData.total_expense),
        lastMonthDelta: lastMonthDelta,
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Top Controls Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        Clarity Dashboard <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Visión financiera {filters.year}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <ImportWizardModal />
                    <div className="flex bg-muted/30 p-1 rounded-lg border items-center gap-2">
                        <InvestorToggle isInvestorMode={isInvestorMode} onToggle={() => setIsInvestorMode(!isInvestorMode)} />
                        <div className="w-px h-6 bg-border mx-1" />
                        <FocusToggle value={focusMode} onChange={setFocusMode} />
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
                </Tabs>
            </div>

        </div>
    );
}

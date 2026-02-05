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
import { useFinancialMetrics } from '@/hooks/useFinancialMetrics';
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

    // --- CLIENT-SIDE KPI CALCULATION (Using Shared Hook) ---
    // This replaces local calculation to ensure consistency with SummaryTable
    const { kpi: metrics } = useFinancialMetrics(focusMode);

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

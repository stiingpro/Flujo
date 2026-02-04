'use client';

import { useState } from 'react';
import { SmartMonthTable } from './SmartMonthTable';
import { FocusToggle, FocusMode } from './FocusToggle';
import { KPIGrid } from './KPIGrid';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { MainTab } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingDown, TrendingUp, Sparkles, Filter } from 'lucide-react';

export function DashboardV2() {
    const [focusMode, setFocusMode] = useState<FocusMode>('all');
    const [activeTab, setActiveTab] = useState<'gastos' | 'ingresos'>('gastos');
    const { filters } = useFinanceStore();

    // Mock KPI Data (To be replaced with real calculations from store later)
    // For now, we pass simple calculated or static data
    const metrics = {
        runway: 4.5,
        burnRate: 2500000,
        monthlyRevenue: 3800000,
        monthlyExpense: 2100000,
        lastMonthDelta: 12.5,
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
                    <div className="flex bg-muted/30 p-1 rounded-lg border">
                        <FocusToggle value={focusMode} onChange={setFocusMode} />
                    </div>
                </div>
            </div>

            {/* KPI Section */}
            <KPIGrid metrics={metrics} />

            {/* Main Tabs (Income/Expense Unified View) */}
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
    );
}

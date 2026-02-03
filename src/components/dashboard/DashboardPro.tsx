'use client';

import { DashboardKPIs } from './charts/DashboardKPIs';
import { RevenueExpenseChart } from './charts/RevenueExpenseChart';
import { ExpenseBreakdown } from './charts/ExpenseBreakdown';
import { ClientRevenueCharts } from '@/components/analytics/ClientRevenueCharts';
import { useFinanceStore } from '@/stores/useFinanceStore';

export function DashboardPro() {
    const { filters } = useFinanceStore();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Top Level KPIs */}
            <DashboardKPIs />

            {/* Main Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Evolution Chart (Wide) */}
                <RevenueExpenseChart />

                {/* Breakdown Chart (Narrow) */}
                <ExpenseBreakdown />
            </div>

            {/* Detailed Analytics Section */}
            {filters.origin !== 'personal' && (
                <div className="pt-6 border-t mt-8">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Análisis Comercial</h3>
                    <ClientRevenueCharts />
                </div>
            )}
        </div>
    );
}

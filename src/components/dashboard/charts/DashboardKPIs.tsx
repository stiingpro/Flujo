'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export function DashboardKPIs() {
    const { getMonthlyData, filters } = useFinanceStore();
    const monthlyData = getMonthlyData();

    // Calculate totals
    const currentMonth = new Date().getMonth() + 1;
    const currentMonthData = useMemo(() =>
        monthlyData.find((m) => m.month === currentMonth),
        [monthlyData, currentMonth]
    );

    const cumulativeUtility = useMemo(() => monthlyData
        .filter((m) => m.month <= currentMonth)
        .reduce(
            (sum, m) => sum + (filters.showProjected ? m.utility.total : m.utility.real),
            0
        ), [monthlyData, filters.showProjected, currentMonth]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const kpis = [
        {
            title: 'Ingresos',
            value: currentMonthData
                ? filters.showProjected
                    ? currentMonthData.income.total
                    : currentMonthData.income.real
                : 0,
            icon: TrendingUp,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            border: 'border-emerald-100',
        },
        {
            title: 'Gastos',
            value: currentMonthData
                ? filters.showProjected
                    ? currentMonthData.expense.total
                    : currentMonthData.expense.real
                : 0,
            icon: TrendingDown,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            border: 'border-rose-100',
        },
        {
            title: 'Utilidad Neta',
            value: currentMonthData
                ? filters.showProjected
                    ? currentMonthData.utility.total
                    : currentMonthData.utility.real
                : 0,
            icon: DollarSign,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-100',
        },
        {
            title: 'Caja Acumulada',
            value: cumulativeUtility,
            icon: Wallet,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            border: 'border-indigo-100',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {kpis.map((kpi) => (
                <Card key={kpi.title} className={cn("border shadow-sm", kpi.border)}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-x-4">
                            <div className="flex items-center space-x-4">
                                <div className={cn("p-2 rounded-full", kpi.bg)}>
                                    <kpi.icon className={cn("h-6 w-6", kpi.color)} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                                    <h3 className="text-2xl font-bold tracking-tight font-mono-numbers">
                                        {formatCurrency(kpi.value)}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

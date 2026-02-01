'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { cn } from '@/lib/utils';

export function KPICards() {
    const { getMonthlyData, filters } = useFinanceStore();
    const monthlyData = getMonthlyData();

    // Calculate totals
    const currentMonth = new Date().getMonth() + 1;
    const currentMonthData = monthlyData.find((m) => m.month === currentMonth);

    const totalIncome = monthlyData.reduce(
        (sum, m) => sum + (filters.showProjected ? m.income.total : m.income.real),
        0
    );

    const totalExpense = monthlyData.reduce(
        (sum, m) => sum + (filters.showProjected ? m.expense.total : m.expense.real),
        0
    );

    const totalUtility = totalIncome - totalExpense;

    // Calculate cumulative utility up to current month
    const cumulativeUtility = monthlyData
        .filter((m) => m.month <= currentMonth)
        .reduce(
            (sum, m) => sum + (filters.showProjected ? m.utility.total : m.utility.real),
            0
        );

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
            title: 'Ingresos del Mes',
            value: currentMonthData
                ? filters.showProjected
                    ? currentMonthData.income.total
                    : currentMonthData.income.real
                : 0,
            subtitle: `Mes actual (${currentMonthData?.monthName || '-'})`,
            icon: TrendingUp,
            colorClass: 'kpi-income',
            valueClass: 'text-income',
        },
        {
            title: 'Gastos del Mes',
            value: currentMonthData
                ? filters.showProjected
                    ? currentMonthData.expense.total
                    : currentMonthData.expense.real
                : 0,
            subtitle: `Mes actual (${currentMonthData?.monthName || '-'})`,
            icon: TrendingDown,
            colorClass: 'kpi-expense',
            valueClass: 'text-expense',
        },
        {
            title: 'Utilidad del Mes',
            value: currentMonthData
                ? filters.showProjected
                    ? currentMonthData.utility.total
                    : currentMonthData.utility.real
                : 0,
            subtitle: `${filters.showProjected ? 'Incluyendo proyecciones' : 'Solo confirmados'}`,
            icon: DollarSign,
            colorClass: 'kpi-utility',
            valueClass: '',
        },
        {
            title: 'Ahorro Acumulado',
            value: cumulativeUtility,
            subtitle: `Ene - ${currentMonthData?.monthName || 'Actual'} ${filters.year}`,
            icon: Target,
            colorClass: 'kpi-utility',
            valueClass: '',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
                <Card key={kpi.title} className={cn('card-hover', kpi.colorClass)}>
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">{kpi.title}</p>
                                <p
                                    className={cn(
                                        'text-2xl font-bold font-mono-numbers',
                                        kpi.valueClass,
                                        kpi.value < 0 && !kpi.valueClass && 'text-expense',
                                        kpi.value >= 0 && !kpi.valueClass && 'text-income'
                                    )}
                                >
                                    {formatCurrency(kpi.value)}
                                </p>
                                <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-background/50">
                                <kpi.icon className={cn('h-5 w-5', kpi.valueClass || 'text-muted-foreground')} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

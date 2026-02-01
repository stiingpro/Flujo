'use client';

import { useMemo } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Scale } from 'lucide-react';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { MONTH_NAMES } from '@/types';
import { cn } from '@/lib/utils';

export function SummaryTable() {
    const { getCategoryMonthlyData, filters } = useFinanceStore();

    const expenseData = getCategoryMonthlyData('expense');
    const incomeData = getCategoryMonthlyData('income');

    // Calculate monthly totals
    const monthlyTotals = useMemo(() => {
        const totals: { expense: number; income: number; balance: number }[] = [];

        for (let month = 1; month <= 12; month++) {
            let expenseSum = 0;
            let incomeSum = 0;

            expenseData.forEach((months) => {
                const cellData = months.get(month);
                if (cellData && (filters.showProjected || cellData.status === 'real')) {
                    expenseSum += cellData.amount;
                }
            });

            incomeData.forEach((months) => {
                const cellData = months.get(month);
                if (cellData && (filters.showProjected || cellData.status === 'real')) {
                    incomeSum += cellData.amount;
                }
            });

            totals.push({
                expense: expenseSum,
                income: incomeSum,
                balance: incomeSum - expenseSum,
            });
        }

        return totals;
    }, [expenseData, incomeData, filters.showProjected]);

    // Calculate year totals
    const yearTotals = useMemo(() => {
        return monthlyTotals.reduce(
            (acc, curr) => ({
                expense: acc.expense + curr.expense,
                income: acc.income + curr.income,
                balance: acc.balance + curr.balance,
            }),
            { expense: 0, income: 0, balance: 0 }
        );
    }, [monthlyTotals]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CL', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Scale className="h-5 w-5" />
                        Resumen {filters.year}
                    </span>
                    <div className="flex items-center gap-3 text-sm font-normal">
                        <Badge variant="outline" className="gap-1">
                            <span className="w-2 h-2 rounded-full bg-expense" />
                            Gastos
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                            <span className="w-2 h-2 rounded-full bg-income" />
                            Ingresos
                        </Badge>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="table-container overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="sticky-header">
                                <TableHead className="sticky left-0 bg-background z-20 min-w-[140px]">
                                    Concepto
                                </TableHead>
                                {MONTH_NAMES.map((month, i) => (
                                    <TableHead key={i} className="text-center min-w-[90px]">
                                        {month.substring(0, 3)}
                                    </TableHead>
                                ))}
                                <TableHead className="text-center min-w-[100px] font-bold">
                                    Total
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Total Gastos Row */}
                            <TableRow className="bg-red-50/30 hover:bg-red-50/50">
                                <TableCell className="font-semibold sticky left-0 bg-red-50/30 z-10 flex items-center gap-2">
                                    <TrendingDown className="h-4 w-4 text-expense" />
                                    Total Gastos
                                </TableCell>
                                {monthlyTotals.map((data, i) => (
                                    <TableCell key={i} className="text-right font-mono-numbers text-expense">
                                        {data.expense > 0 ? formatCurrency(data.expense) : '-'}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right font-mono-numbers font-bold text-expense">
                                    {formatCurrency(yearTotals.expense)}
                                </TableCell>
                            </TableRow>

                            {/* Total Ingresos Row */}
                            <TableRow className="bg-green-50/30 hover:bg-green-50/50">
                                <TableCell className="font-semibold sticky left-0 bg-green-50/30 z-10 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-income" />
                                    Total Ingresos
                                </TableCell>
                                {monthlyTotals.map((data, i) => (
                                    <TableCell key={i} className="text-right font-mono-numbers text-income">
                                        {data.income > 0 ? formatCurrency(data.income) : '-'}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right font-mono-numbers font-bold text-income">
                                    {formatCurrency(yearTotals.income)}
                                </TableCell>
                            </TableRow>

                            {/* Balance Row */}
                            <TableRow className="bg-muted/50 font-bold border-t-2">
                                <TableCell className="font-bold sticky left-0 bg-muted/50 z-10 flex items-center gap-2">
                                    <Scale className="h-4 w-4" />
                                    Balance Mensual
                                </TableCell>
                                {monthlyTotals.map((data, i) => {
                                    const isPositive = data.balance >= 0;
                                    const hasData = data.income > 0 || data.expense > 0;
                                    return (
                                        <TableCell
                                            key={i}
                                            className={cn(
                                                'text-right font-mono-numbers font-bold',
                                                hasData && (isPositive ? 'text-income bg-green-50/50' : 'text-expense bg-red-50/50')
                                            )}
                                        >
                                            {hasData ? (
                                                <span className={cn(
                                                    'px-2 py-1 rounded',
                                                    isPositive ? 'bg-green-100' : 'bg-red-100'
                                                )}>
                                                    {isPositive ? '+' : ''}{formatCurrency(data.balance)}
                                                </span>
                                            ) : '-'}
                                        </TableCell>
                                    );
                                })}
                                <TableCell className={cn(
                                    'text-right font-mono-numbers font-bold',
                                    yearTotals.balance >= 0 ? 'text-income' : 'text-expense'
                                )}>
                                    <span className={cn(
                                        'px-3 py-1 rounded-lg text-lg',
                                        yearTotals.balance >= 0 ? 'bg-green-100' : 'bg-red-100'
                                    )}>
                                        {yearTotals.balance >= 0 ? '+' : ''}{formatCurrency(yearTotals.balance)}
                                    </span>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

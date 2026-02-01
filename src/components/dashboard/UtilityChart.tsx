'use client';

import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Line,
    ComposedChart,
    ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { ChartDataPoint } from '@/types';

export function UtilityChart() {
    const { getMonthlyData, filters } = useFinanceStore();
    const monthlyData = getMonthlyData();

    const chartData: ChartDataPoint[] = useMemo(() => {
        let cumulativeUtility = 0;

        return monthlyData.map((month) => {
            const income = filters.showProjected ? month.income.total : month.income.real;
            const expense = filters.showProjected ? month.expense.total : month.expense.real;
            const utility = income - expense;
            cumulativeUtility += utility;

            return {
                month: month.monthName.substring(0, 3),
                ingresos: income,
                gastos: expense,
                utilidad: utility,
                utilidadAcumulada: cumulativeUtility,
            };
        });
    }, [monthlyData, filters.showProjected]);

    const formatCurrency = (value: number) => {
        if (Math.abs(value) >= 1000000) {
            return `$${(value / 1000000).toFixed(1)}M`;
        }
        if (Math.abs(value) >= 1000) {
            return `$${(value / 1000).toFixed(0)}K`;
        }
        return `$${value}`;
    };

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
        if (!active || !payload) return null;

        return (
            <div className="bg-background border rounded-lg shadow-lg p-3">
                <p className="font-medium mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: {formatCurrency(entry.value)}
                    </p>
                ))}
            </div>
        );
    };

    // Check if there's data to display
    const hasData = chartData.some((d) => d.ingresos > 0 || d.gastos > 0);

    if (!hasData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Flujo de Caja Anual</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">
                        No hay datos para mostrar. Importa un archivo Excel para comenzar.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">
                    Flujo de Caja Anual {filters.year}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="month"
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            tickFormatter={formatCurrency}
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            width={60}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ paddingTop: '10px' }}
                            formatter={(value) => <span className="text-sm">{value}</span>}
                        />
                        <Bar
                            dataKey="ingresos"
                            name="Ingresos"
                            fill="#22c55e"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                        />
                        <Bar
                            dataKey="gastos"
                            name="Gastos"
                            fill="#ef4444"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                        />
                        <Line
                            type="monotone"
                            dataKey="utilidadAcumulada"
                            name="Ahorro Acumulado"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

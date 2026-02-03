'use client';

import { useFinanceStore } from '@/stores/useFinanceStore';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo } from 'react';

export function RevenueExpenseChart() {
    const { getMonthlyData, filters } = useFinanceStore();
    const monthlyData = getMonthlyData();

    const data = useMemo(() => {
        return monthlyData.map(m => ({
            name: m.monthName.slice(0, 3), // Short month name
            Ingresos: filters.showProjected ? m.income.total : m.income.real,
            Gastos: filters.showProjected ? m.expense.total : m.expense.real,
            Utilidad: filters.showProjected ? m.utility.total : m.utility.real,
        }));
    }, [monthlyData, filters.showProjected]);

    const formatCurrency = (value: number) => {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
        return `$${value}`;
    };

    return (
        <Card className="col-span-1 lg:col-span-2 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle>Evolución de Flujo</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorUtility" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6b7280', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6b7280', fontSize: 12 }}
                            tickFormatter={formatCurrency}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={(value: any) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(value || 0))}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />

                        <Bar dataKey="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} fillOpacity={0.8} />
                        <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} fillOpacity={0.8} />
                        <Line
                            type="monotone"
                            dataKey="Utilidad"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2 }}
                        />
                        <Area type="monotone" dataKey="Utilidad" fill="url(#colorUtility)" stroke="none" />
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

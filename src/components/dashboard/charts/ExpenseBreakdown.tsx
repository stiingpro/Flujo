'use client';

import { useFinanceStore } from '@/stores/useFinanceStore';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo } from 'react';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#6366f1', '#a855f7'];

export function ExpenseBreakdown() {
    const { categories, transactions, filters } = useFinanceStore();

    const data = useMemo(() => {
        // 1. Filter expense categories
        const expenseCategories = categories.filter(c => c.type === 'expense');

        // 2. Sum transactions per category (respecting filters)
        const categoryTotals = expenseCategories.map(cat => {
            const catTransactions = transactions.filter(t => {
                if (t.category_id !== cat.id) return false;

                // Filter by year
                const d = new Date(t.date);
                if (d.getFullYear() !== filters.year) return false;

                // If filtering by real/projected? 
                // The prompt for "Dashboard" usually implies viewing the Current Year's TOTAL summary.

                return true;
            });

            // Calculate total. If showProjected is false, filter out pending?
            // The table logic usually aggregates everything if "Projected" is on.
            // If "Real" (Projected off), we only verify completed status.
            const total = catTransactions.reduce((sum, t) => {
                const isReal = t.paymentStatus === 'confirmed';
                if (!filters.showProjected && !isReal) return sum;
                return sum + t.amount;
            }, 0);

            return {
                name: cat.name,
                value: total,
            };
        }).filter(item => item.value > 0);

        // 3. Sort Descending
        categoryTotals.sort((a, b) => b.value - a.value);

        // 4. Take top 5 and group others
        if (categoryTotals.length <= 5) return categoryTotals;

        const top5 = categoryTotals.slice(0, 5);
        const others = categoryTotals.slice(5).reduce((sum, item) => sum + item.value, 0);

        return [...top5, { name: 'Otros', value: others }];

    }, [categories, transactions, filters]);

    return (
        <Card className="col-span-1 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle>Desglose de Gastos</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: any) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(value || 0))}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

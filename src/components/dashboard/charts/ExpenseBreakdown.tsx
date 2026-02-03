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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMemo, useState } from 'react';
import { CategoryLevel } from '@/types';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#6366f1', '#a855f7'];

export function ExpenseBreakdown() {
    const { categories, transactions, filters } = useFinanceStore();
    const [activeTab, setActiveTab] = useState<CategoryLevel>('empresa');

    const getData = (level: CategoryLevel) => {
        // 1. Filter expense categories by level
        const expenseCategories = categories.filter(c => c.type === 'expense' && c.level === level);

        // 2. Sum transactions per category
        const categoryTotals = expenseCategories.map(cat => {
            const catTransactions = transactions.filter(t => {
                if (t.category_id !== cat.id) return false;

                // Filter by year
                const d = new Date(t.date);
                if (d.getFullYear() !== filters.year) return false;

                return true;
            });

            // Calculate total based on filters (Projected vs Real)
            const total = catTransactions.reduce((sum, t) => {
                const isReal = t.paymentStatus === 'confirmed'; // Correct status check
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

        // 4. Take top 4 and group others (to save space)
        if (categoryTotals.length <= 4) return categoryTotals;

        const top = categoryTotals.slice(0, 4);
        const others = categoryTotals.slice(4).reduce((sum, item) => sum + item.value, 0);

        return [...top, { name: 'Otros', value: others }];
    };

    const businessData = useMemo(() => getData('empresa'), [categories, transactions, filters, 'empresa']);
    const personalData = useMemo(() => getData('personal'), [categories, transactions, filters, 'personal']);

    const renderChart = (data: any[]) => {
        if (data.length === 0) {
            return (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No hay datos de gastos registrados.
                </div>
            );
        }

        return (
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="45%"
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
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(value || 0))}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        );
    };

    return (
        <Card className="col-span-1 shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Desglose de Gastos</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[350px]">
                <Tabs defaultValue="empresa" className="h-full flex flex-col" onValueChange={(v) => setActiveTab(v as CategoryLevel)}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="empresa">Empresa</TabsTrigger>
                        <TabsTrigger value="personal">Personal</TabsTrigger>
                    </TabsList>

                    <TabsContent value="empresa" className="flex-1 mt-0">
                        <div className="h-[300px]">
                            {renderChart(businessData)}
                        </div>
                    </TabsContent>

                    <TabsContent value="personal" className="flex-1 mt-0">
                        <div className="h-[300px]">
                            {renderChart(personalData)}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

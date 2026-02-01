'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import { Building2, TrendingUp, Users } from 'lucide-react';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { MONTH_NAMES } from '@/types';

const COLORS = [
    '#0088FE',
    '#00C49F',
    '#FFBB28',
    '#FF8042',
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#8dd1e1',
];

export function ClientRevenueCharts() {
    const { getClientRevenueData, filters } = useFinanceStore();
    const clientData = getClientRevenueData();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(value);
    };

    // Prepare data for monthly chart (top 5 clients)
    const topClients = clientData.slice(0, 5);

    const monthlyChartData = useMemo(() => {
        const data = MONTH_NAMES.map((monthName, index) => {
            const month = index + 1;
            const entry: Record<string, number | string> = { month: monthName.substring(0, 3) };

            topClients.forEach((client) => {
                entry[client.clientName] = client.monthlyRevenue[month] || 0;
            });

            return entry;
        });
        return data;
    }, [topClients]);

    // Prepare data for pie chart
    const pieData = useMemo(() => {
        return topClients.map((client) => ({
            name: client.clientName,
            value: client.yearlyTotal,
        }));
    }, [topClients]);

    // Calculate total revenue
    const totalRevenue = clientData.reduce((sum, c) => sum + c.yearlyTotal, 0);

    if (clientData.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Sin datos de clientes</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Importa transacciones de tipo &quot;Ingreso&quot; con origen &quot;Empresa&quot;
                        para ver análisis de ingresos por cliente.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Ingresos Empresa</p>
                                <p className="text-2xl font-bold font-mono-numbers text-income">
                                    ${totalRevenue.toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Total acumulado {filters.year}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Clientes Activos</p>
                                <p className="text-2xl font-bold font-mono-numbers">
                                    {clientData.length}
                                </p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full">
                                <Users className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Con ingresos en {filters.year}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Promedio por Cliente</p>
                                <p className="text-2xl font-bold font-mono-numbers">
                                    ${Math.round(totalRevenue / clientData.length).toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-full">
                                <Building2 className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart - Monthly Revenue by Client */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Ingresos Mensuales por Cliente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" fontSize={12} />
                                    <YAxis fontSize={12} tickFormatter={(value) => formatCurrency(value)} />
                                    <Tooltip
                                        formatter={(value) => ['$' + Number(value).toLocaleString(), '']}
                                    />
                                    <Legend />
                                    {topClients.map((client, index) => (
                                        <Bar
                                            key={client.clientName}
                                            dataKey={client.clientName}
                                            stackId="a"
                                            fill={COLORS[index % COLORS.length]}
                                            radius={index === topClients.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Pie Chart - Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Distribución Anual de Ingresos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percent }) => {
                                            const displayName = name || 'Sin nombre';
                                            const displayPercent = percent || 0;
                                            return `${displayName.substring(0, 10)}${displayName.length > 10 ? '...' : ''}: ${(displayPercent * 100).toFixed(0)}%`;
                                        }}
                                    >
                                        {pieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => ['$' + Number(value).toLocaleString(), 'Ingresos']} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Client Ranking Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Ranking de Clientes por Ingresos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {clientData.slice(0, 10).map((client, index) => {
                            const percentage = (client.yearlyTotal / totalRevenue) * 100;
                            return (
                                <div
                                    key={client.clientName}
                                    className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg"
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{client.clientName}</p>
                                        <div className="h-2 bg-muted rounded-full mt-1 overflow-hidden">
                                            <div
                                                className="h-full bg-income rounded-full transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold font-mono-numbers">
                                            ${client.yearlyTotal.toLocaleString()}
                                        </p>
                                        <Badge variant="outline" className="text-xs">
                                            {percentage.toFixed(1)}%
                                        </Badge>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

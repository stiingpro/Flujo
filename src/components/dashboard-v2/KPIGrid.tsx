'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownRight, ArrowUpRight, Wallet, Flame, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPIMetrics {
    runway: number; // Months
    burnRate: number; // Average monthly expense
    monthlyRevenue: number; // Current month revenue projected + real
    monthlyExpense: number; // Current month expense projected + real
    lastMonthDelta: number; // Percentage change vs last month net income
}

export function KPIGrid({ metrics }: { metrics: KPIMetrics }) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Runway Card */}
            <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Wallet className="w-24 h-24 text-indigo-600" />
                </div>
                <CardContent className="p-6">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-indigo-900/60">Runway Estimado</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-indigo-900">{metrics.runway.toFixed(1)}</span>
                            <span className="text-sm font-medium text-indigo-600">meses</span>
                        </div>
                        <p className="text-xs text-indigo-900/50 mt-2">
                            Basado en tu saldo actual y burn rate promedio.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Burn Rate Card */}
            <Card className="bg-white border-border shadow-sm group hover:border-orange-200 transition-colors">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-muted-foreground">Burn Rate Promedio</span>
                            <span className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.burnRate)}</span>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Flame className="w-3 h-3 text-orange-500" />
                                <span>Gasto mensual recurrente</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Month Performance Card */}
            <Card className="bg-white border-border shadow-sm">
                <CardContent className="p-6">
                    <div className="flex flex-col gap-3">
                        <span className="text-sm font-medium text-muted-foreground">Desempeño Mensual (Est.)</span>

                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Ingresos</span>
                                <span className="text-lg font-semibold text-emerald-600">{formatCurrency(metrics.monthlyRevenue)}</span>
                            </div>
                            <div className="h-8 w-px bg-border/60 mx-2"></div>
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Gastos</span>
                                <span className="text-lg font-semibold text-rose-600">{formatCurrency(metrics.monthlyExpense)}</span>
                            </div>
                        </div>

                        <div className={cn(
                            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded w-fit",
                            metrics.lastMonthDelta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        )}>
                            {metrics.lastMonthDelta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(metrics.lastMonthDelta).toFixed(1)}% vs mes anterior
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

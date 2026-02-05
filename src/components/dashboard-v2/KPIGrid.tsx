'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownRight, ArrowUpRight, Wallet, Flame, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useFeatureMode } from '@/context/FeatureModeContext';

interface KPIMetrics {
    runway: number; // Months
    burnRate: number; // Average monthly expense
    monthlyRevenue: number; // Current month revenue projected + real
    monthlyExpense: number; // Current month expense projected + real
    lastMonthDelta: number; // Percentage change vs last month net income
    netMargin: number; // New PRO metric
}

export function KPIGrid({ metrics }: { metrics: KPIMetrics }) {
    const { isPro } = useFeatureMode();
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);

    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${isPro ? '4' : '3'} gap-4 mb-6`}>
            {/* Runway Card (Oxígeno) */}
            <Card className={cn(
                "border-l-4 shadow-sm relative overflow-hidden group transition-all",
                metrics.runway >= 6 ? "bg-emerald-50 border-l-emerald-500" :
                    metrics.runway >= 3 ? "bg-yellow-50 border-l-yellow-500" :
                        "bg-red-50 border-l-red-500"
            )}>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Wallet className={cn(
                        "w-24 h-24",
                        metrics.runway >= 6 ? "text-emerald-600" :
                            metrics.runway >= 3 ? "text-yellow-600" :
                                "text-red-600"
                    )} />
                </div>
                <CardContent className="p-6">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-600">Oxígeno (Runway)</span>
                        <div className="flex items-baseline gap-2">
                            <span className={cn(
                                "text-4xl font-bold",
                                metrics.runway >= 6 ? "text-emerald-700" :
                                    metrics.runway >= 3 ? "text-yellow-700" :
                                        "text-red-700"
                            )}>{metrics.runway.toFixed(1)}</span>
                            <span className="text-sm font-medium text-gray-600">meses</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            {metrics.runway < 3 ? "¡Atención! Oxígeno crítico." : "Salud financiera estable."}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Burn Rate Card (Ritmo de Gasto) */}
            <Card className="bg-white border-border shadow-sm group hover:border-orange-200 transition-colors border-l-4 border-l-transparent">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-muted-foreground">Ritmo de Gasto</span>
                            <span className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.burnRate)}</span>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Flame className="w-3 h-3 text-orange-500" />
                                <span>Promedio mensual (últ. 3 meses)</span>
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

            {/* PRO Metric: Net Margin */}
            {isPro && (
                <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-24 h-24 text-emerald-600" />
                    </div>
                    <CardContent className="p-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-emerald-900/60">Margen Neto (PRO)</span>
                            <div className="flex items-baseline gap-2">
                                <span className={cn("text-3xl font-bold", metrics.netMargin >= 0 ? "text-emerald-700" : "text-rose-700")}>
                                    {metrics.netMargin.toFixed(1)}%
                                </span>
                            </div>
                            <p className="text-xs text-emerald-900/50 mt-2">
                                Eficiencia operativa del mes actual.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

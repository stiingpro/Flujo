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
    cashOnHand?: number;
    netCashFlow?: number;
}

import { useFinanceStore } from '@/stores/useFinanceStore';

export function KPIGrid({ metrics }: { metrics: KPIMetrics }) {
    const { isPro } = useFeatureMode();
    const { filters } = useFinanceStore();
    const showProjected = filters.showProjected;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);

    // --- MODE 1: SOLO CONFIRMADO (Real Cash View) ---
    if (!showProjected) {
        return (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6`}>
                {/* 1. Plata en Mano (Cash on Hand) */}
                <Card className="bg-card border-border shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-muted-foreground">Plata en Mano</span>
                            <span className="text-2xl font-bold text-foreground">{formatCurrency(metrics.cashOnHand || 0)}</span>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Wallet className="w-3 h-3 text-blue-500" />
                                <span>Disponibilidad inmediata</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Resultado del Mes (Net Cash Flow) */}
                <Card className="bg-card border-border shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-muted-foreground">Resultado del Mes</span>
                            <span className={cn(
                                "text-2xl font-bold",
                                (metrics.netCashFlow || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            )}>
                                {formatCurrency(metrics.netCashFlow || 0)}
                            </span>
                            <p className={cn(
                                "text-xs mt-1 font-medium",
                                (metrics.netCashFlow || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                            )}>
                                {(metrics.netCashFlow || 0) >= 0 ? "Superávit (Ganando terreno)" : "Déficit (Consumiendo caja)"}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Ingresos Reales */}
                <Card className="bg-card border-border shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-muted-foreground">Ingresos Reales</span>
                            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(metrics.monthlyRevenue)}</span>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                                <span>Recibido este mes</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Gastos Reales */}
                <Card className="bg-card border-border shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-muted-foreground">Gastos Reales</span>
                            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(metrics.monthlyExpense)}</span>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <ArrowDownRight className="w-3 h-3 text-rose-500" />
                                <span>Pagado este mes</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // --- MODE 2: CONFIRMADO + PROYECTADO (Strategic View) ---
    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${isPro ? '4' : '3'} gap-4 mb-6`}>
            {/* Runway Card (Oxígeno) with Velocimeter */}
            <Card className="relative overflow-hidden group transition-all bg-card border-border shadow-sm">
                <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex flex-col gap-1 z-10">
                        <span className="text-sm font-medium text-muted-foreground">Oxígeno (Runway)</span>
                        <div className="flex items-baseline gap-2">
                            <span className={cn(
                                "text-4xl font-bold",
                                metrics.runway >= 6 ? "text-emerald-600 dark:text-emerald-400" :
                                    metrics.runway >= 3 ? "text-yellow-600 dark:text-yellow-400" :
                                        "text-rose-600 dark:text-rose-400"
                            )}>{metrics.runway.toFixed(1)}</span>
                            <span className="text-sm font-medium text-muted-foreground">meses</span>
                        </div>
                        <p className={cn(
                            "text-xs mt-2 max-w-[120px] font-medium",
                            metrics.runway < 3 ? "text-rose-500 dark:text-rose-400" :
                                metrics.runway < 6 ? "text-yellow-600 dark:text-yellow-400" :
                                    "text-emerald-500 dark:text-emerald-400"
                        )}>
                            {metrics.runway < 3 ? "Nivel Crítico" :
                                metrics.runway < 6 ? "Nivel Precaución" :
                                    "Nivel Saludable"}
                        </p>
                    </div>

                    {/* Velocimeter Gauge */}
                    <div className="relative w-24 h-24 shrink-0">
                        {/* Gauge Background (Half Circle) */}
                        <svg viewBox="0 0 100 60" className="w-full h-full overflow-visible">
                            {/* Arc Background */}
                            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-800" strokeWidth="8" strokeLinecap="round" />

                            {/* Colorful Segments (Scale 0 to 12 months) */}
                            {/* Red (0-3 months) */}
                            <path d="M 10 50 A 40 40 0 0 1 21.7 21.7" fill="none" stroke="#f43f5e" strokeWidth="8" strokeLinecap="round" opacity="0.3" />

                            {/* Yellow (3-6 months) */}
                            <path d="M 21.7 21.7 A 40 40 0 0 1 50 10" fill="none" stroke="#eab308" strokeWidth="8" opacity="0.3" />

                            {/* Green (6-12+ months) */}
                            <path d="M 50 10 A 40 40 0 0 1 90 50" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round" opacity="0.3" />

                            {/* Needle (Range 0-12) */}
                            <g style={{
                                transformOrigin: '50px 50px',
                                // Map 0-12 months to 0-180 degrees
                                transform: `rotate(${(Math.min(12, Math.max(0, metrics.runway)) / 12) * 180}deg)`,
                                transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}>
                                <line x1="50" y1="50" x2="10" y2="50" stroke="currentColor" className="text-slate-800 dark:text-slate-200" strokeWidth="3" strokeLinecap="round" />
                                <circle cx="50" cy="50" r="4" fill="currentColor" className="text-slate-800 dark:text-slate-200" />
                            </g>
                        </svg>
                        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[8px] text-muted-foreground px-1 -mb-1">
                            <span>0m</span>
                            <span>3m</span>
                            <span className="pl-1">6m</span>
                            <span>12m+</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Burn Rate Card (Ritmo de Gasto) */}
            <Card className="bg-card border-border shadow-sm group hover:border-orange-200 dark:hover:border-orange-800 transition-colors border-l-4 border-l-transparent">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-muted-foreground">Ritmo de Gasto</span>
                            <span className="text-2xl font-bold text-foreground">{formatCurrency(metrics.burnRate)}</span>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Flame className="w-3 h-3 text-orange-500" />
                                <span>Promedio mensual (últ. 3 meses)</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Month Performance Card */}
            <Card className="bg-card border-border shadow-sm">
                <CardContent className="p-6">
                    <div className="flex flex-col gap-3">
                        <span className="text-sm font-medium text-muted-foreground">Desempeño Mensual</span>

                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Ingresos</span>
                                <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(metrics.monthlyRevenue)}</span>
                            </div>
                            <div className="h-8 w-px bg-border mx-2"></div>
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Gastos</span>
                                <span className="text-lg font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(metrics.monthlyExpense)}</span>
                            </div>
                        </div>

                        <div className={cn(
                            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded w-fit",
                            metrics.lastMonthDelta >= 0
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                        )}>
                            {metrics.lastMonthDelta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(metrics.lastMonthDelta).toFixed(1)}% vs mes anterior
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* PRO Metric: Net Margin */}
            {isPro && (
                <Card className="bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-900/20 dark:to-background border-emerald-100 dark:border-emerald-800/50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-24 h-24 text-emerald-600 dark:text-emerald-500" />
                    </div>
                    <CardContent className="p-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-emerald-900/60 dark:text-emerald-100/60">Margen Neto (PRO)</span>
                            <div className="flex items-baseline gap-2">
                                <span className={cn("text-3xl font-bold", metrics.netMargin >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
                                    {metrics.netMargin.toFixed(1)}%
                                </span>
                            </div>
                            <p className="text-xs text-emerald-900/50 dark:text-emerald-100/50 mt-2">
                                Eficiencia operativa del mes actual.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

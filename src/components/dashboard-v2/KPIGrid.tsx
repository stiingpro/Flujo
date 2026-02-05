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
            {/* Runway Card (Oxígeno) with Velocimeter */}
            <Card className="relative overflow-hidden group transition-all bg-white border shadow-sm">
                <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex flex-col gap-1 z-10">
                        <span className="text-sm font-medium text-gray-500">Oxígeno (Runway)</span>
                        <div className="flex items-baseline gap-2">
                            <span className={cn(
                                "text-4xl font-bold",
                                metrics.runway >= 6 ? "text-emerald-600" :
                                    metrics.runway >= 3 ? "text-yellow-600" :
                                        "text-rose-600"
                            )}>{metrics.runway.toFixed(1)}</span>
                            <span className="text-sm font-medium text-gray-500">meses</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 max-w-[120px]">
                            {metrics.runway < 3 ? "Nivel Crítico" : "Nivel Saludable"}
                        </p>
                    </div>

                    {/* Velocimeter Gauge */}
                    <div className="relative w-24 h-24 shrink-0">
                        {/* Gauge Background (Half Circle) */}
                        <svg viewBox="0 0 100 60" className="w-full h-full overflow-visible">
                            {/* Arc Background */}
                            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#f1f5f9" strokeWidth="8" strokeLinecap="round" />

                            {/* Colorful Segments */}
                            {/* Red (0-3) */}
                            <path d="M 10 50 A 40 40 0 0 1 30 15.3" fill="none" stroke="#f43f5e" strokeWidth="8" strokeLinecap="round" opacity="0.2" /> {/* ~0 to 30% */}
                            {/* Yellow (3-6) */}
                            <path d="M 30 15.3 A 40 40 0 0 1 70 15.3" fill="none" stroke="#eab308" strokeWidth="8" opacity="0.2" />
                            {/* Green (6+) */}
                            <path d="M 70 15.3 A 40 40 0 0 1 90 50" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round" opacity="0.2" />

                            {/* Needle */}
                            <g style={{
                                transformOrigin: '50px 50px',
                                transform: `rotate(${Math.max(0, Math.min(180, (Math.max(0, metrics.runway) / 6) * 180)) - 180}deg)`,
                                transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}>
                                <line x1="50" y1="50" x2="10" y2="50" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
                                <circle cx="50" cy="50" r="4" fill="#1e293b" />
                            </g>
                        </svg>
                        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[8px] text-gray-400 px-1 -mb-1">
                            <span>0m</span>
                            <span>3m</span>
                            <span>6m+</span>
                        </div>
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


'use client';

import { forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, Flame, TrendingUp } from 'lucide-react';

interface ReportHiddenRendererProps {
    data: {
        kpis: {
            income: number;
            expense: number;
            net: number;
        };
        trend: any[];
        expenses: any[];
    };
}

export const ReportHiddenRenderer = forwardRef<HTMLDivElement, ReportHiddenRendererProps>(({ data }, ref) => {
    const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8']; // Corporative Slate Palette

    return (
        <div
            ref={ref}
            className="fixed top-0 left-0 -z-50 w-[1200px] bg-white p-8 space-y-8"
            style={{ opacity: 0, pointerEvents: 'none' }} // Hidden but rendered
        >
            {/* 1. Header Area */}
            <div className="flex items-center justify-between mb-8 border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">FlujoExpert Executive Report</h1>
                    <p className="text-slate-500">Financial Performance Overview</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium text-slate-400">{new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* 2. KPI Cards Row */}
            <div id="report-kpis" className="grid grid-cols-3 gap-6">
                <Card className="bg-slate-50 border-none shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Ingresos Totales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-700">
                            ${(data.kpis.income / 1000000).toFixed(1)}M
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-none shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Gastos Totales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-rose-700">
                            ${(data.kpis.expense / 1000000).toFixed(1)}M
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-none shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Utilidad Neta</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-bold ${data.kpis.net >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                            ${(data.kpis.net / 1000000).toFixed(1)}M
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 3. Trend and Breakdown */}
            <div className="grid grid-cols-3 gap-8 h-[500px]"> {/* Increased container height */}
                {/* Trend Chart (Col 2/3) */}
                <div id="report-trend" className="col-span-2 bg-white rounded-lg p-6 border border-slate-100 flex flex-col justify-between">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Evolución de Flujo de Caja (12m)</h3>
                    <div style={{ width: '100%', height: '350px' }}> {/* Explicit fixed height for chart */}
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.trend} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="month" axisLine={false} tick={{ fill: '#64748b' }} tickMargin={10} />
                                <YAxis axisLine={false} tick={{ fill: '#64748b' }} />
                                <Area type="monotone" dataKey="net" stroke="#0f172a" strokeWidth={3} fillOpacity={1} fill="url(#colorNet)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expense Breakdown (Col 1/3) */}
                <div id="report-breakdown" className="col-span-1 bg-white rounded-lg p-6 border border-slate-100 flex flex-col justify-between">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Top Categorías</h3>
                    <div style={{ width: '100%', height: '350px' }}> {/* Explicit height to fit legend */}
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.expenses}
                                    innerRadius={70}
                                    outerRadius={100} // Increased radius
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.expenses.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Legend
                                    verticalAlign="bottom"
                                    height={80} // Give space for legend items 
                                    iconType="circle"
                                    layout="horizontal"
                                    wrapperStyle={{
                                        paddingTop: '20px',
                                        fontSize: '12px'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
});
ReportHiddenRenderer.displayName = 'ReportHiddenRenderer';

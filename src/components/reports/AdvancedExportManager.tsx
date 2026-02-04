
'use client';

import React, { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { ReportContextProvider } from '@/context/ReportContext';
import { ReportHiddenRenderer } from './ReportHiddenRenderer';
import { ExcelBuilder } from '@/services/report/ExcelBuilder';
import { Transaction, Category } from '@/types';
import { toast } from 'sonner';

export function AdvancedExportManager({ children }: { children: React.ReactNode }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const rendererRef = useRef<HTMLDivElement>(null);
    const [reportData, setReportData] = useState<{
        kpis: { income: number; expense: number; net: number };
        trend: any[];
        expenses: any[];
    } | null>(null);

    const processData = (transactions: Transaction[], year: number) => {
        // Calculate KPIs
        const totalIncome = transactions
            .filter(t => t.type === 'income' && new Date(t.date).getFullYear() === year)
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = transactions
            .filter(t => t.type === 'expense' && new Date(t.date).getFullYear() === year)
            .reduce((sum, t) => sum + t.amount, 0);

        // Trend Data (Monthly Net)
        const trend = Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            const inc = transactions
                .filter(t => t.type === 'income' && new Date(t.date).getMonth() === i && new Date(t.date).getFullYear() === year)
                .reduce((sum, t) => sum + t.amount, 0);
            const exp = transactions
                .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === i && new Date(t.date).getFullYear() === year)
                .reduce((sum, t) => sum + t.amount, 0);
            return { month: `Month ${month}`, net: inc - exp };
        });

        // Expense Breakdown
        const expensesByCategory = transactions
            .filter(t => t.type === 'expense' && new Date(t.date).getFullYear() === year)
            .reduce((acc, t) => {
                acc[t.category_id] = (acc[t.category_id] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>);

        const expenses = Object.entries(expensesByCategory)
            .map(([id, value]) => ({ name: id, value })) // Ideally map categories names
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        return {
            kpis: { income: totalIncome, expense: totalExpense, net: totalIncome - totalExpense },
            trend,
            expenses
        };
    };

    const generateExcelReport = useCallback(async (data: { transactions: Transaction[], categories: Category[], year: number }) => {
        setIsGenerating(true);
        try {
            // 1. Prepare Data for Renderer
            const processed = processData(data.transactions, data.year);
            // Enrich category names
            processed.expenses = processed.expenses.map(e => ({
                ...e,
                name: data.categories.find(c => c.id === e.name)?.name || 'Sin Categoría'
            }));

            setReportData(processed);

            // Wait for render cycle
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (!rendererRef.current) throw new Error('Renderer not initialized');

            // 2. Capture Images
            // Ensure fonts are loaded? html-to-image handles it mostly.

            // Capture KPIs Area
            // Capture Trend
            // Capture Breakdown.
            // For simplicity, let's capture the whole dashboard as one main image for now, 
            // OR distinct sections if we tagged them with IDs. 
            // The Plan said specific insertions.

            // We can query selector inside the ref
            const kpiNode = rendererRef.current.querySelector('#report-kpis') as HTMLElement;
            const trendNode = rendererRef.current.querySelector('#report-trend') as HTMLElement;
            const breakdownNode = rendererRef.current.querySelector('#report-breakdown') as HTMLElement;

            const kpiImg = await toPng(kpiNode, { pixelRatio: 2 });
            const trendImg = await toPng(trendNode, { pixelRatio: 2 });
            const breakdownImg = await toPng(breakdownNode, { pixelRatio: 2 });

            // 3. Build Excel
            const builder = new ExcelBuilder();
            builder.addTitle(`Reporte Ejecutivo ${data.year}`, 'Resumen Financiero Anual');

            // Insert Images
            // Row 5, Col 2 for KPIs
            await builder.addImage({
                base64: kpiImg,
                width: 800,
                height: 150,
                tl: { col: 1, row: 4 }
            });

            // Row 15, Col 2 for Trend
            await builder.addImage({
                base64: trendImg,
                width: 600,
                height: 300,
                tl: { col: 1, row: 14 }
            });

            // Row 15, Col 8 for Breakdown
            await builder.addImage({
                base64: breakdownImg,
                width: 300,
                height: 300,
                tl: { col: 7, row: 14 }
            });

            // 4. Add Legacy Details
            builder.addLegacyDataSheet(data.transactions, data.categories);

            await builder.download(`FlujoExpert_Dashboard_${data.year}.xlsx`);
            toast.success('Reporte Avanzado Generado');

        } catch (error) {
            console.error(error);
            toast.error('Error generando reporte visual');
        } finally {
            setIsGenerating(false);
            setReportData(null); // Clear to unmount/hide
        }
    }, []);

    const generatePdfReport = async () => {
        // reuse similar logic or implement later
        toast.info('PDF Avanzado (WIP)');
    };

    return (
        <ReportContextProvider value={{ isGenerating, generateExcelReport, generatePdfReport }}>
            {children}
            {reportData && <ReportHiddenRenderer ref={rendererRef} data={reportData} />}
        </ReportContextProvider>
    );
}

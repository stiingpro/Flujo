import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Loader2, Sparkles } from 'lucide-react';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { toast } from 'sonner';
// import { generateExcelReport } from '@/lib/export-utils'; // Legacy
import { useReport } from '@/context/ReportContext';

export function ExcelExport() {
    const { transactions, categories, filters } = useFinanceStore();
    const { generateExcelReport, isGenerating } = useReport();

    const handleExport = async () => {
        // 1. Base Filter (Year & Origin only, IGNORING projected switch for the full set)
        const baseTransactions = transactions.filter((t) => {
            const tDate = new Date(t.date);
            const matchYear = tDate.getFullYear() === filters.year;
            const matchOrigin = filters.origin === 'all' || t.origin === filters.origin;
            return matchYear && matchOrigin;
        });

        if (baseTransactions.length === 0) {
            toast.error('No hay datos para exportar en este año');
            return;
        }

        // 2. Calculate KPIs
        // Confirmed Only
        const txConfirmed = baseTransactions.filter(t => t.status === 'real');
        const kpisConfirmed = {
            income: txConfirmed.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
            expense: txConfirmed.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
            net: 0 // Will be calc below
        };
        kpisConfirmed.net = kpisConfirmed.income - kpisConfirmed.expense;

        // Projected (All capable)
        // Usually "Projected" view implies Real + Projected. 
        const kpisProjected = {
            income: baseTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
            expense: baseTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
            net: 0
        };
        kpisProjected.net = kpisProjected.income - kpisProjected.expense;

        // 3. Transactions to List (Respect the user's current view filter for the list part?)
        // The user said "Insert... header section... showing KPIs... before rendering the table".
        // It implies the table matches the view, but header shows both.
        // Let's filter the list as before.
        const listTransactions = baseTransactions.filter(t => filters.showProjected ? true : t.status === 'real');

        await generateExcelReport({
            transactions: listTransactions, // The list follows the view
            categories,
            year: filters.year,
            kpis: {
                confirmed: kpisConfirmed,
                projected: kpisProjected
            }
        });
    };

    return (
        <Button
            variant="outline"
            onClick={handleExport}
            className="gap-2 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
            disabled={isGenerating}
        >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Reporte XLS <span className="text-xs bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-medium ml-1">AI Powered</span>
        </Button>
    );
}

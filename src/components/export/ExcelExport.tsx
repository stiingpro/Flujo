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
        const filteredTransactions = transactions.filter((t) => {
            const tDate = new Date(t.date);
            const matchYear = tDate.getFullYear() === filters.year;
            const matchOrigin = filters.origin === 'all' || t.origin === filters.origin;
            const matchProjected = filters.showProjected ? true : t.status === 'real';
            return matchYear && matchOrigin && matchProjected;
        });

        if (filteredTransactions.length === 0) {
            toast.error('No hay datos visibles para exportar');
            return;
        }

        await generateExcelReport({
            transactions: filteredTransactions,
            categories,
            year: filters.year
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

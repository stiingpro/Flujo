'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { toast } from 'sonner';
import { generateExcelReport } from '@/lib/export-utils';

export function ExcelExport() {
    const { transactions, categories, filters } = useFinanceStore();
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        // Filter transactions for current year and filters
        const filteredTransactions = transactions.filter((t) => {
            const tDate = new Date(t.date);
            const matchYear = tDate.getFullYear() === filters.year;
            // Also partial match for year month if needed, but year is main filter

            const matchOrigin = filters.origin === 'all' || t.origin === filters.origin;
            // Allow exporting everything including projected if user wants data dump
            // But usually we respect visual filters.
            // Let's respect "showProjected" filter to align with what user sees on screen.
            const matchProjected = filters.showProjected ? true : t.status === 'real';

            return matchYear && matchOrigin && matchProjected;
        });

        if (filteredTransactions.length === 0) {
            toast.error('No hay datos visibles para exportar');
            return;
        }

        setIsExporting(true);
        try {
            await generateExcelReport({
                transactions: filteredTransactions,
                categories,
                filters
            });
            toast.success('Reporte Excel generado con éxito');
        } catch (error) {
            console.error('Export Error:', error);
            toast.error('Error al generar el reporte Excel');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button
            variant="outline"
            onClick={handleExport}
            className="gap-2"
            disabled={isExporting}
        >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Exportar Excel
        </Button>
    );
}

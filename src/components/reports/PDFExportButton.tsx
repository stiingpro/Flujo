'use client';

import { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { FinancialReportPDF } from './FinancialReportPDF';
import { useFinanceStore } from '@/stores/useFinanceStore';

export function PDFExportButton() {
    const { transactions, filters } = useFinanceStore();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return (
            <Button variant="outline" disabled className="gap-2">
                <FileText className="h-4 w-4" />
                Reporte PDF
            </Button>
        );
    }

    // Filter transactions logic (same as Excel)
    const filteredTransactions = transactions.filter((t) => {
        const tDate = new Date(t.date);
        const matchYear = tDate.getFullYear() === filters.year;
        const matchOrigin = filters.origin === 'all' || t.origin === filters.origin;
        const matchProjected = filters.showProjected ? true : t.status === 'real';

        return matchYear && matchOrigin && matchProjected;
    });

    const fileName = `RadarFinanciero_Reporte_${filters.year}.pdf`;

    return (
        <PDFDownloadLink
            document={<FinancialReportPDF transactions={filteredTransactions} filters={filters} />}
            fileName={fileName}
        >
            {({ blob, url, loading, error }) => (
                <Button variant="outline" disabled={loading} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Reporte PDF
                </Button>
            )}
        </PDFDownloadLink>
    );
}

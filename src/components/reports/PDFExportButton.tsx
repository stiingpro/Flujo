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

    // Base Filter for "All" (year + origin)
    const baseTransactions = transactions.filter((t) => {
        const tDate = new Date(t.date);
        const matchYear = tDate.getFullYear() === filters.year;
        const matchOrigin = filters.origin === 'all' || t.origin === filters.origin;
        return matchYear && matchOrigin;
    });

    // LIST Filter (What the user sees in the PDF list)
    const listTransactions = baseTransactions.filter(t => filters.showProjected ? true : t.status === 'real');

    // KPI Calculation (Comparison)
    const kpisConfirmed = {
        income: baseTransactions.filter(t => t.status === 'real' && t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: baseTransactions.filter(t => t.status === 'real' && t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        net: 0
    };
    kpisConfirmed.net = kpisConfirmed.income - kpisConfirmed.expense;

    const kpisProjected = {
        income: baseTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: baseTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        net: 0
    };
    kpisProjected.net = kpisProjected.income - kpisProjected.expense;

    const comparisonKpis = { confirmed: kpisConfirmed, projected: kpisProjected };

    const fileName = `RadarFinanciero_Reporte_${filters.year}.pdf`;

    return (
        <PDFDownloadLink
            document={<FinancialReportPDF transactions={listTransactions} filters={filters} comparisonKpis={comparisonKpis} />}
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

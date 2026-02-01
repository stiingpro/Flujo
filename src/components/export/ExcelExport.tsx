'use client';

import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { MONTH_NAMES, SUBLEVEL_LABELS } from '@/types';
import { toast } from 'sonner';

export function ExcelExport() {
    const { transactions, categories, filters } = useFinanceStore();

    const handleExport = () => {
        // Filter transactions for current year and filters
        const filteredTransactions = transactions.filter((t) => {
            const tDate = new Date(t.date);
            const matchYear = tDate.getFullYear() === filters.year;
            const matchOrigin = filters.origin === 'all' || t.origin === filters.origin;
            const matchProjected = filters.showProjected || t.status === 'real';
            return matchYear && matchOrigin && matchProjected;
        });

        if (filteredTransactions.length === 0) {
            toast.error('No hay datos para exportar');
            return;
        }

        // Group by type
        const expenses = filteredTransactions.filter(t => t.type === 'expense');
        const income = filteredTransactions.filter(t => t.type === 'income');

        // Build CSV content
        let csvContent = '\uFEFF'; // BOM for Excel UTF-8

        // Title
        csvContent += `FlujoGlobal - Exportación ${filters.year}\n`;
        csvContent += `Fecha de exportación: ${new Date().toLocaleDateString('es-CL')}\n`;
        csvContent += `Filtros: Origen=${filters.origin}, Proyectado=${filters.showProjected ? 'Sí' : 'No'}\n\n`;

        // GASTOS Section
        csvContent += `=== GASTOS ===\n`;
        csvContent += `Categoría,Nivel,Subnivel,${MONTH_NAMES.join(',')},Total Anual\n`;

        // Group expenses by category
        const expensesByCategory = new Map<string, number[]>();
        expenses.forEach(t => {
            const catName = t.category?.name || t.description || 'Sin categoría';
            const month = new Date(t.date).getMonth();
            if (!expensesByCategory.has(catName)) {
                expensesByCategory.set(catName, new Array(12).fill(0));
            }
            expensesByCategory.get(catName)![month] += t.amount;
        });

        expensesByCategory.forEach((amounts, catName) => {
            const category = categories.find(c => c.name === catName);
            const level = category?.level || 'empresa';
            const sublevel = category?.sublevel ? SUBLEVEL_LABELS[category.sublevel] : '-';
            const total = amounts.reduce((a, b) => a + b, 0);
            csvContent += `"${catName}",${level === 'empresa' ? 'Empresa' : 'Personal'},${sublevel},${amounts.join(',')},${total}\n`;
        });

        // Total row for expenses
        const expenseMonthlyTotals = new Array(12).fill(0);
        expenses.forEach(t => {
            const month = new Date(t.date).getMonth();
            expenseMonthlyTotals[month] += t.amount;
        });
        const totalExpenses = expenseMonthlyTotals.reduce((a, b) => a + b, 0);
        csvContent += `TOTAL GASTOS,,,${expenseMonthlyTotals.join(',')},${totalExpenses}\n\n`;

        // INGRESOS Section
        csvContent += `=== INGRESOS ===\n`;
        csvContent += `Categoría,Nivel,Estado Pago,${MONTH_NAMES.join(',')},Total Anual\n`;

        // Group income by category
        const incomeByCategory = new Map<string, number[]>();
        income.forEach(t => {
            const catName = t.category?.name || t.description || 'Sin categoría';
            const month = new Date(t.date).getMonth();
            if (!incomeByCategory.has(catName)) {
                incomeByCategory.set(catName, new Array(12).fill(0));
            }
            incomeByCategory.get(catName)![month] += t.amount;
        });

        incomeByCategory.forEach((amounts, catName) => {
            const category = categories.find(c => c.name === catName);
            const level = category?.level || 'empresa';
            const total = amounts.reduce((a, b) => a + b, 0);
            csvContent += `"${catName}",${level === 'empresa' ? 'Empresa' : 'Personal'},-,${amounts.join(',')},${total}\n`;
        });

        // Total row for income
        const incomeMonthlyTotals = new Array(12).fill(0);
        income.forEach(t => {
            const month = new Date(t.date).getMonth();
            incomeMonthlyTotals[month] += t.amount;
        });
        const totalIncome = incomeMonthlyTotals.reduce((a, b) => a + b, 0);
        csvContent += `TOTAL INGRESOS,,,${incomeMonthlyTotals.join(',')},${totalIncome}\n\n`;

        // BALANCE Section
        csvContent += `=== BALANCE ===\n`;
        csvContent += `Concepto,,,${MONTH_NAMES.join(',')},Total Anual\n`;

        const balanceMonthly = incomeMonthlyTotals.map((inc, i) => inc - expenseMonthlyTotals[i]);
        const totalBalance = totalIncome - totalExpenses;
        csvContent += `Balance Mensual,,,${balanceMonthly.join(',')},${totalBalance}\n`;

        // Accumulated balance
        let accumulated = 0;
        const accumulatedBalance = balanceMonthly.map(b => {
            accumulated += b;
            return accumulated;
        });
        csvContent += `Balance Acumulado,,,${accumulatedBalance.join(',')},${accumulated}\n`;

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `FlujoGlobal_${filters.year}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('Archivo exportado', {
            description: `${filteredTransactions.length} movimientos exportados a CSV.`,
        });
    };

    return (
        <Button variant="outline" onClick={handleExport} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar
        </Button>
    );
}

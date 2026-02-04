import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Transaction, Category, DashboardFilters, MONTH_NAMES } from '@/types';

interface ExportDataParams {
    transactions: Transaction[];
    categories: Category[];
    filters: DashboardFilters;
}

export const generateExcelReport = async ({ transactions, categories, filters }: ExportDataParams) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FlujoGlobal';
    workbook.created = new Date();

    // ==========================================
    // SHEET 1: RESUMEN EJECUTIVO
    // ==========================================
    const summarySheet = workbook.addWorksheet('Resumen Ejecutivo', {
        views: [{ showGridLines: false }]
    });

    // Styles
    const titleStyle = { font: { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } } };
    const headerStyle: Partial<ExcelJS.Style> = { font: { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } }, alignment: { horizontal: 'center' } };
    const subHeaderStyle: Partial<ExcelJS.Style> = { font: { name: 'Arial', size: 10, bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } } };

    // Add Title
    summarySheet.mergeCells('A1:E2');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = `Reporte Financiero ${filters.year}`;
    titleCell.style = {
        font: { name: 'Arial', size: 18, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }, // Emerald 500
        alignment: { vertical: 'middle', horizontal: 'center' }
    };

    summarySheet.mergeCells('A3:E3');
    const subTitleCell = summarySheet.getCell('A3');
    subTitleCell.value = `Generado el ${new Date().toLocaleDateString('es-CL')} | Información Confidencial`;
    subTitleCell.style = { font: { italic: true, size: 9 }, alignment: { horizontal: 'center' } };

    // Group Data
    // We reuse the logic from the CSV export but enhanced
    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income');

    // Helper to aggregate monthly
    const getMonthlyTotals = (txs: Transaction[]) => {
        const totals = new Array(12).fill(0);
        txs.forEach(t => {
            const m = new Date(t.date).getMonth();
            totals[m] += t.amount || 0;
        });
        return totals;
    };

    const expenseTotals = getMonthlyTotals(expenses);
    const incomeTotals = getMonthlyTotals(income);
    const balanceTotals = incomeTotals.map((inc, i) => inc - expenseTotals[i]);
    const accumulatedBalance = balanceTotals.reduce((acc, curr, i) => {
        const prev = i > 0 ? acc[i - 1] : 0;
        acc.push(prev + curr);
        return acc;
    }, [] as number[]);

    // Summary Table Headers
    summarySheet.getRow(5).values = ['Concepto', ...MONTH_NAMES, 'Total Anual'];
    summarySheet.getRow(5).eachCell((cell, colNumber) => {
        cell.style = headerStyle;
    });

    // Add Income Row
    summarySheet.addRow(['Ingresos', ...incomeTotals, incomeTotals.reduce((a, b) => a + b, 0)]);

    // Add Expense Row
    summarySheet.addRow(['Gastos', ...expenseTotals, expenseTotals.reduce((a, b) => a + b, 0)]);

    // Add Balance Row
    const balanceRow = summarySheet.addRow(['Flujo Neto', ...balanceTotals, balanceTotals.reduce((a, b) => a + b, 0)]);
    balanceRow.font = { bold: true };
    balanceRow.eachCell((cell, col) => {
        if (col > 1) {
            const val = cell.value as number;
            cell.font = {
                bold: true,
                color: { argb: val >= 0 ? 'FF059669' : 'FFEF4444' } // Green vs Red text
            };
        }
    });

    // Formatting Money
    summarySheet.getRows(6, 3)?.forEach(row => {
        row.eachCell((cell, col) => {
            if (col > 1 && typeof cell.value === 'number') {
                cell.numFmt = '"$"#,##0';
            }
        });
    });

    // Widths
    summarySheet.getColumn(1).width = 25;
    for (let i = 2; i <= 14; i++) summarySheet.getColumn(i).width = 15;


    // ==========================================
    // SHEET 2: DETALLE TRANSACCIONES
    // ==========================================
    const detailSheet = workbook.addWorksheet('Detalle Transacciones');

    detailSheet.columns = [
        { header: 'ID', key: 'id', width: 36 },
        { header: 'Fecha', key: 'date', width: 15 },
        { header: 'Categoría', key: 'category', width: 20 },
        { header: 'Descripción', key: 'description', width: 30 },
        { header: 'Tipo', key: 'type', width: 10 },
        { header: 'Monto Original', key: 'amount_raw', width: 15 },
        { header: 'Moneda', key: 'currency', width: 10 },
        { header: 'Monto (CLP)', key: 'amount', width: 15 },
        { header: 'Estado', key: 'status', width: 12 },
        { header: 'Pago', key: 'paymentStatus', width: 12 },
    ];

    // Style Header
    detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };

    // Add Data
    transactions.forEach(t => {
        // Find category name
        const cat = categories.find(c => c.id === t.category_id);

        detailSheet.addRow({
            id: t.id,
            date: t.date,
            category: cat?.name || 'Sin Categoría',
            description: t.description || '-',
            type: t.type === 'income' ? 'Ingreso' : 'Gasto',
            amount_raw: t.amount, // This might actually be stored in CLP if we converted before saving or if simple usage. 
            // In current schema, amount is the value. If we impl multi-currency display, valid.
            // For now, let's assume amount is in CLP always in DB logic or normalized.
            // But wait, user added multi-currency support. So t.amount is in t.currency_code?
            // Actually implementation plan says "amount" in transaction table.
            // If currency_code != CLP, then Amount is in Foreign and we calculate CLP using exchange_rate.

            // Let's allow raw amount + calculated CLP amount column
            currency: t.currency_code || 'CLP',
            amount: (t.amount || 0) * (t.exchange_rate || 1), // Normalized to Base (CLP)
            status: t.status === 'real' ? 'Real' : 'Proyectado',
            paymentStatus: t.paymentStatus === 'confirmed' ? 'Pagado' : 'Pendiente',
        });
    });

    // Formatting Details
    detailSheet.getColumn('amount').numFmt = '"$"#,##0';
    detailSheet.getColumn('amount_raw').numFmt = '#,##0.00';

    // File Write
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    saveAs(blob, `FlujoGlobal_Reporte_${filters.year}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

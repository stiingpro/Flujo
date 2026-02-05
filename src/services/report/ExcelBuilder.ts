
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface ExcelImage {
    base64: string;
    width: number;
    height: number;
    tl: { col: number; row: number }; // Top-Left position
    br?: { col: number; row: number }; // Optional Bottom-Right
}

export class ExcelBuilder {
    private workbook: ExcelJS.Workbook;
    private dashboardSheet: ExcelJS.Worksheet;
    private dataSheet: ExcelJS.Worksheet;

    constructor() {
        this.workbook = new ExcelJS.Workbook();
        this.workbook.creator = 'Radar Financiero';
        this.workbook.lastModifiedBy = 'Radar Financiero';
        this.workbook.created = new Date();
        this.workbook.modified = new Date();

        // 1. Dashboard Sheet (Visuals)
        this.dashboardSheet = this.workbook.addWorksheet('Reporte Ejecutivo', {
            views: [{ showGridLines: false, zoomScale: 85 }]
        });

        // 2. Data Sheet (Hidden Raw Data)
        this.dataSheet = this.workbook.addWorksheet('Data Source', {
            state: 'hidden'
        });
    }

    public async addSummarySheet(kpis: any, trend: any[], expenses: any[]) {
        const sheet = this.dashboardSheet;

        // --- TITLE ---
        sheet.mergeCells('B2:H2');
        sheet.getCell('B2').value = 'RADAR FINANCIERO - REPORTE EJECUTIVO';
        sheet.getCell('B2').font = { size: 20, bold: true, color: { argb: 'FF1E293B' } };
        sheet.getCell('B2').alignment = { horizontal: 'center' };

        // --- KPIs ---
        const kpiRow = 5;
        // Income
        sheet.getCell(`B${kpiRow}`).value = 'Ingresos Totales';
        sheet.getCell(`B${kpiRow}`).font = { bold: true, color: { argb: 'FF64748B' } };
        sheet.getCell(`C${kpiRow}`).value = kpis.income;
        sheet.getCell(`C${kpiRow}`).numFmt = '"$"#,##0';
        sheet.getCell(`C${kpiRow}`).font = { bold: true, color: { argb: 'FF047857' } }; // Green

        // Expense
        sheet.getCell(`E${kpiRow}`).value = 'Gastos Totales';
        sheet.getCell(`E${kpiRow}`).font = { bold: true, color: { argb: 'FF64748B' } };
        sheet.getCell(`F${kpiRow}`).value = kpis.expense;
        sheet.getCell(`F${kpiRow}`).numFmt = '"$"#,##0';
        sheet.getCell(`F${kpiRow}`).font = { bold: true, color: { argb: 'FFBE123C' } }; // Red

        // Net
        sheet.getCell(`H${kpiRow}`).value = 'Utilidad Neta';
        sheet.getCell(`H${kpiRow}`).font = { bold: true, color: { argb: 'FF64748B' } };
        sheet.getCell(`I${kpiRow}`).value = kpis.net;
        sheet.getCell(`I${kpiRow}`).numFmt = '"$"#,##0';
        sheet.getCell(`I${kpiRow}`).font = { bold: true, color: { argb: 'FF1E293B' } };

        // --- TREND TABLE ---
        const trendStartRow = 9;
        sheet.getCell(`B${trendStartRow}`).value = 'Evolución Mensual (Flujo Neto)';
        sheet.getCell(`B${trendStartRow}`).font = { size: 14, bold: true };

        sheet.getCell(`B${trendStartRow + 1}`).value = 'Mes';
        sheet.getCell(`C${trendStartRow + 1}`).value = 'Flujo Neto';

        // Header Style
        ['B', 'C'].forEach(col => {
            const cell = sheet.getCell(`${col}${trendStartRow + 1}`);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            cell.font = { bold: true };
            cell.border = { bottom: { style: 'thin' } };
        });

        trend.forEach((t, i) => {
            const r = trendStartRow + 2 + i;
            sheet.getCell(`B${r}`).value = t.month;
            sheet.getCell(`C${r}`).value = t.net;
            sheet.getCell(`C${r}`).numFmt = '"$"#,##0';
        });

        // --- TOP EXPENSES TABLE ---
        const expStartRow = 9;
        const expStartCol = 'E';
        sheet.getCell(`${expStartCol}${expStartRow}`).value = 'Top Categorías de Gasto';
        sheet.getCell(`${expStartCol}${expStartRow}`).font = { size: 14, bold: true };

        sheet.getCell(`${expStartCol}${expStartRow + 1}`).value = 'Categoría';
        sheet.getCell(`F${expStartRow + 1}`).value = 'Monto';

        // Header Style
        ['E', 'F'].forEach(col => {
            const cell = sheet.getCell(`${col}${expStartRow + 1}`);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            cell.font = { bold: true };
            cell.border = { bottom: { style: 'thin' } };
        });

        expenses.forEach((e, i) => {
            const r = expStartRow + 2 + i;
            sheet.getCell(`${expStartCol}${r}`).value = e.name;
            sheet.getCell(`F${r}`).value = e.value;
            sheet.getCell(`F${r}`).numFmt = '"$"#,##0';
        });

        // Widths
        sheet.getColumn('B').width = 20;
        sheet.getColumn('C').width = 20;
        sheet.getColumn('E').width = 30;
        sheet.getColumn('F').width = 20;
    }

    public addTitle(title: string, subtitle: string) {
        const titleRow = this.dashboardSheet.getRow(2);
        titleRow.getCell(2).value = title.toUpperCase();
        titleRow.getCell(2).font = {
            name: 'Arial',
            size: 24,
            bold: true,
            color: { argb: 'FF1E293B' } // Slate-800
        };

        const subRow = this.dashboardSheet.getRow(3);
        subRow.getCell(2).value = subtitle;
        subRow.getCell(2).font = {
            name: 'Arial',
            size: 14,
            color: { argb: 'FF64748B' } // Slate-500
        };
    }

    // 3. Add Legacy Detail Sheet
    public addLegacyDataSheet(transactions: any[], categories: any[]) {
        const detailSheet = this.workbook.addWorksheet('Detalle Transacciones');

        detailSheet.columns = [
            { header: 'ID', key: 'id', width: 36 },
            { header: 'Fecha', key: 'date', width: 15 },
            { header: 'Categoría', key: 'category', width: 25 },
            { header: 'Descripción', key: 'description', width: 40 },
            { header: 'Tipo', key: 'type', width: 12 },
            { header: 'Monto Original', key: 'amount_raw', width: 15 },
            { header: 'Moneda', key: 'currency', width: 10 },
            { header: 'Monto (CLP)', key: 'amount', width: 15 },
            { header: 'Estado', key: 'status', width: 12 },
            { header: 'Pago', key: 'paymentStatus', width: 12 },
        ];

        // Style Header
        const headerRow = detailSheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }; // Gray-800
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        // Add Data
        transactions.forEach(t => {
            const cat = categories.find(c => c.id === t.category_id);
            detailSheet.addRow({
                id: t.id,
                date: t.date,
                category: cat?.name || 'Sin Categoría',
                description: t.description || '-',
                type: t.type === 'income' ? 'Ingreso' : 'Gasto',
                amount_raw: t.amount,
                currency: t.currency_code || 'CLP',
                amount: (t.amount || 0) * (t.exchange_rate || 1),
                status: t.status === 'real' ? 'Real' : 'Proyectado',
                paymentStatus: t.paymentStatus === 'confirmed' ? 'Pagado' : 'Pendiente',
            });
        });

        // Formatting
        detailSheet.getColumn('amount').numFmt = '"$"#,##0';
        detailSheet.getColumn('amount_raw').numFmt = '#,##0.00';
    }

    public async download(filename: string) {
        const buffer = await this.workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, filename);
    }
}

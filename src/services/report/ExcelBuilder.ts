
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
        this.workbook.creator = 'FlujoExpert';
        this.workbook.lastModifiedBy = 'FlujoExpert';
        this.workbook.created = new Date();
        this.workbook.modified = new Date();

        // 1. Dashboard Sheet (Visuals)
        this.dashboardSheet = this.workbook.addWorksheet('Executive Dashboard', {
            views: [{ showGridLines: false, zoomScale: 85 }]
        });

        // 2. Data Sheet (Hidden Raw Data)
        this.dataSheet = this.workbook.addWorksheet('Data Source', {
            state: 'hidden'
        });
    }

    public async addImage(image: ExcelImage) {
        const imageId = this.workbook.addImage({
            base64: image.base64,
            extension: 'png',
        });

        this.dashboardSheet.addImage(imageId, {
            tl: image.tl,
            ext: { width: image.width, height: image.height },
            editAs: 'oneCell'
        });
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

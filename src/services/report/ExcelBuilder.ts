
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

    public addData(headers: string[], data: any[][]) {
        this.dataSheet.addRow(headers);
        data.forEach(row => this.dataSheet.addRow(row));
    }

    public async download(filename: string) {
        const buffer = await this.workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, filename);
    }
}

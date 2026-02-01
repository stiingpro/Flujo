import * as XLSX from 'xlsx';
import {
    ParsedExcelTransaction,
    ExcelParseResult,
    TransactionType,
    TransactionStatus,
    MONTH_NAMES_UPPER,
} from '@/types';

/**
 * Structure of your Excel file:
 * - Each month has 3 columns: [Category Name] [Amount] [Status ("OK" = real)]
 * - GASTOS section starts at row 2
 * - INGRESOS section starts after GASTOS (detected dynamically)
 * - Year extracted from filename or sheet name, or requested from user
 */

interface MonthColumn {
    month: number; // 1-12
    nameCol: number; // Column index for category name
    amountCol: number; // Column index for amount
    statusCol: number; // Column index for status (OK = real)
}

interface SectionBoundary {
    name: string;
    startRow: number;
    endRow: number;
    type: TransactionType;
}

/**
 * Parse an Excel file into transaction records
 */
export function parseExcelFile(
    file: File | ArrayBuffer,
    overrideYear?: number
): Promise<ExcelParseResult> {
    return new Promise((resolve) => {
        const result: ExcelParseResult = {
            success: false,
            transactions: [],
            categories: new Set<string>(),
            year: overrideYear || null,
            errors: [],
        };

        try {
            let workbook: XLSX.WorkBook;

            if (file instanceof File) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    workbook = XLSX.read(data, { type: 'array' });
                    processWorkbook(workbook, result, overrideYear);
                    resolve(result);
                };
                reader.onerror = () => {
                    result.errors.push('Error reading file');
                    resolve(result);
                };
                reader.readAsArrayBuffer(file);
            } else {
                workbook = XLSX.read(file, { type: 'array' });
                processWorkbook(workbook, result, overrideYear);
                resolve(result);
            }
        } catch (error) {
            result.errors.push(`Parse error: ${error}`);
            resolve(result);
        }
    });
}

function processWorkbook(
    workbook: XLSX.WorkBook,
    result: ExcelParseResult,
    overrideYear?: number
): void {
    // Find the most relevant sheet (prefer "FLUJO" sheets)
    const sheetName = findBestSheet(workbook.SheetNames);
    if (!sheetName) {
        result.errors.push('No valid sheet found');
        return;
    }

    const sheet = workbook.Sheets[sheetName];
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: null,
    });

    // Extract year from sheet name or filename
    if (!overrideYear) {
        result.year = extractYearFromSheetName(sheetName);
    } else {
        result.year = overrideYear;
    }

    // Find month columns
    const monthColumns = findMonthColumns(data);
    if (monthColumns.length === 0) {
        result.errors.push('Could not find month headers');
        return;
    }

    // Find sections (GASTOS, INGRESOS)
    const sections = findSections(data);
    if (sections.length === 0) {
        result.errors.push('Could not find GASTOS or INGRESOS sections');
        return;
    }

    // Parse transactions from each section
    for (const section of sections) {
        parseSection(data, section, monthColumns, result);
    }

    result.success = result.transactions.length > 0;
}

function findBestSheet(sheetNames: string[]): string | null {
    // Prefer sheets with "FLUJO" and a year
    const flujoSheet = sheetNames.find(
        (name) => name.toUpperCase().includes('FLUJO') && /\d{4}/.test(name)
    );
    if (flujoSheet) return flujoSheet;

    // Then any sheet with "FLUJO"
    const anyFlujo = sheetNames.find((name) =>
        name.toUpperCase().includes('FLUJO')
    );
    if (anyFlujo) return anyFlujo;

    // Then the first sheet
    return sheetNames[0] || null;
}

function extractYearFromSheetName(sheetName: string): number | null {
    const match = sheetName.match(/\d{4}/);
    if (match) {
        const year = parseInt(match[0], 10);
        if (year >= 2000 && year <= 2100) {
            return year;
        }
    }
    return null;
}

function findMonthColumns(data: (string | number | null)[][]): MonthColumn[] {
    const columns: MonthColumn[] = [];

    // Search in first 10 rows for month headers
    for (let rowIdx = 0; rowIdx < Math.min(10, data.length); rowIdx++) {
        const row = data[rowIdx];
        if (!row) continue;

        for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const cell = String(row[colIdx] || '').toUpperCase().trim();
            const monthIndex = MONTH_NAMES_UPPER.indexOf(cell);

            if (monthIndex !== -1) {
                // Check if this month is already added (avoid duplicates from INGRESOS section)
                const existing = columns.find((c) => c.month === monthIndex + 1);
                if (!existing) {
                    columns.push({
                        month: monthIndex + 1,
                        nameCol: colIdx,
                        amountCol: colIdx + 1,
                        statusCol: colIdx + 2,
                    });
                }
            }
        }

        // If we found at least 6 months, we're good
        if (columns.length >= 6) break;
    }

    return columns.sort((a, b) => a.month - b.month);
}

function findSections(data: (string | number | null)[][]): SectionBoundary[] {
    const sections: SectionBoundary[] = [];
    const sectionKeywords = {
        GASTOS: 'expense' as TransactionType,
        INGRESOS: 'income' as TransactionType,
        ENTRADAS: 'income' as TransactionType,
        SALIDAS: 'expense' as TransactionType,
    };

    // Find section start rows
    const sectionStarts: { name: string; row: number; type: TransactionType }[] =
        [];

    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
        const row = data[rowIdx];
        if (!row) continue;

        for (let colIdx = 0; colIdx < Math.min(5, row.length); colIdx++) {
            const cell = String(row[colIdx] || '').toUpperCase().trim();

            for (const [keyword, type] of Object.entries(sectionKeywords)) {
                if (cell === keyword) {
                    sectionStarts.push({ name: keyword, row: rowIdx, type });
                }
            }
        }
    }

    // Determine section boundaries
    for (let i = 0; i < sectionStarts.length; i++) {
        const current = sectionStarts[i];
        const next = sectionStarts[i + 1];

        sections.push({
            name: current.name,
            startRow: current.row + 1, // Skip header row
            endRow: next ? next.row - 1 : data.length - 1,
            type: current.type,
        });
    }

    return sections;
}

function parseSection(
    data: (string | number | null)[][],
    section: SectionBoundary,
    monthColumns: MonthColumn[],
    result: ExcelParseResult
): void {
    // Skip the header row (with months) - start 2 rows after section start
    const dataStartRow = section.startRow + 1;

    for (let rowIdx = dataStartRow; rowIdx <= section.endRow; rowIdx++) {
        const row = data[rowIdx];
        if (!row) continue;

        // Process each month column
        for (const monthCol of monthColumns) {
            const categoryName = String(row[monthCol.nameCol] || '').trim();
            const amount = row[monthCol.amountCol];
            const status = String(row[monthCol.statusCol] || '').toUpperCase().trim();

            // Skip empty rows, totals, or rows without amounts
            if (!categoryName || categoryName.toUpperCase() === 'TOTAL') continue;
            if (amount === null || amount === undefined || amount === '') continue;
            if (typeof amount !== 'number' || isNaN(amount) || amount === 0) continue;

            // Determine if this is a real or projected transaction
            const transactionStatus: TransactionStatus =
                status === 'OK' ? 'real' : 'projected';

            // Create date for the middle of the month
            const year = result.year || new Date().getFullYear();
            const date = new Date(year, monthCol.month - 1, 15);

            result.transactions.push({
                date,
                amount: Math.abs(amount), // Store as positive, type determines direction
                categoryName: normalizeCategoryName(categoryName),
                type: section.type,
                status: transactionStatus,
                origin: 'business', // Default to business
            });

            result.categories.add(normalizeCategoryName(categoryName));
        }
    }
}

function normalizeCategoryName(name: string): string {
    // Clean up category names
    return name
        .trim()
        .replace(/\s+/g, ' ') // Normalize spaces
        .split(' ')
        .slice(0, 3) // Take first 3 words
        .join(' ')
        .substring(0, 50); // Max 50 chars
}

/**
 * Extract year from filename
 */
export function extractYearFromFilename(filename: string): number | null {
    // Match patterns like "2024", "2025", etc.
    const match = filename.match(/\d{4}/);
    if (match) {
        const year = parseInt(match[0], 10);
        if (year >= 2000 && year <= 2100) {
            return year;
        }
    }
    return null;
}

/**
 * Convert parsed transactions to database format
 */
export function convertToDbFormat(
    transactions: ParsedExcelTransaction[],
    categoryMap: Map<string, string>, // categoryName -> categoryId
    userId: string
) {
    return transactions.map((t) => ({
        date: t.date.toISOString().split('T')[0],
        amount: t.amount,
        description: t.categoryName,
        category_id: categoryMap.get(t.categoryName) || null,
        type: t.type,
        status: t.status,
        origin: t.origin,
        user_id: userId,
    }));
}

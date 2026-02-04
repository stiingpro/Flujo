import * as XLSX from 'xlsx';
import { TransactionType, Transaction, TransactionStatus, TransactionOrigin } from '@/types';

// Standardize Month Names to detect columns
const MONTH_MAP: Record<string, number> = {
    'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12,
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
    'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
};

export interface ImportedRow {
    fingerprint: string;
    date: Date;
    amount: number;
    description: string;
    categoryName: string;
    type: TransactionType;
    status: TransactionStatus;
    origin: TransactionOrigin;
    isValid: boolean;
    errors: string[];
    isDuplicate?: boolean; // Set after DB check
    existingId?: string;
}

export interface ImportStats {
    totalRows: number;
    newCategories: string[];
    potentialDuplicates: number;
    estimatedTotalAmount: number;
}

// Generate a deterministic hash for deduplication
// Using Web Crypto API for performance and standard compliance
export async function generateFingerprint(date: Date, amount: number, category: string, type: string): Promise<string> {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    // Normalize string: lowercase, trimmed
    const categoryNorm = category.trim().toLowerCase();
    const data = `${dateStr}|${amount.toFixed(2)}|${categoryNorm}|${type}`;

    // Encoder
    const msgBuffer = new TextEncoder().encode(data);

    // Hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

    // Convert to hex
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function parseExcelBuffer(buffer: ArrayBuffer): Promise<{ rows: ImportedRow[]; stats: ImportStats }> {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON array of arrays (matrix)
    const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

    const rows: ImportedRow[] = [];
    const newCategories = new Set<string>();
    let currentYear = new Date().getFullYear(); // Default fallback

    // Heuristic: Find the header row (contains "ENERO" or "ENE")
    let headerRowIndex = -1;
    let monthColIndices: Record<number, number> = {}; // Month (1-12) -> Column Index

    for (let i = 0; i < Math.min(20, data.length); i++) {
        const row = data[i];
        let foundMonth = false;

        row.forEach((cell: any, colIdx: number) => {
            if (typeof cell === 'string') {
                const cleanCell = cell.toLowerCase().trim().substring(0, 3);
                if (MONTH_MAP[cleanCell]) {
                    monthColIndices[MONTH_MAP[cleanCell]] = colIdx;
                    foundMonth = true;
                }
                // Try to detect year in header row or nearby (e.g. "2024")
                if (cell.match(/20\d{2}/)) {
                    const match = cell.match(/20\d{2}/);
                    if (match) currentYear = parseInt(match[0]);
                }
            }
        });

        if (foundMonth) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        throw new Error("No se pudo detectar la fila de cabecera con los meses (Ene, Feb, Mar...).");
    }

    // Process rows below header
    // Heuristic for Type: Detect "INGRESOS" or "GASTOS" section headers
    let currentType: TransactionType = 'expense'; // Default
    let currentOrigin: TransactionOrigin = 'business'; // Default

    // Scan for section headers first to map ranges if needed, or do single pass state machine
    for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        const firstCell = row[0]?.toString().trim().toUpperCase() || '';

        // skip empty rows if no data in month columns
        const hasData = Object.values(monthColIndices).some(idx => {
            const val = row[idx];
            return typeof val === 'number' || (typeof val === 'string' && val.trim() !== '');
        });

        if (!hasData && !firstCell) continue;

        // Detect Logic Block Switches
        if (firstCell.includes('INGRESO')) {
            currentType = 'income';
            continue; // Skip the header row itself
        }
        if (firstCell.includes('GASTO') || firstCell.includes('EGRESO')) {
            currentType = 'expense';
            continue;
        }

        // It's a data row
        const categoryName = firstCell;
        if (!categoryName) continue; // Skip if no category name

        // Iterate Month Columns
        for (const [month, colIdx] of Object.entries(monthColIndices)) {
            const rawValue = row[colIdx];
            if (rawValue === undefined || rawValue === '' || rawValue === null) continue;

            let amount = 0;
            if (typeof rawValue === 'number') {
                amount = rawValue;
            } else if (typeof rawValue === 'string') {
                // remove $ . , etc
                // Assuming format like "1.000.000" or "$1,000"
                const cleanStr = rawValue.replace(/[^\d.-]/g, '');
                amount = parseFloat(cleanStr);
            }

            if (amount <= 0 && currentType === 'income') continue; // Skip zero/neg income usually
            if (amount === 0) continue;

            // Construct Date: First day of month
            const monthNum = parseInt(month);
            const date = new Date(currentYear, monthNum - 1, 1);

            // Fingerprint
            const fingerprint = await generateFingerprint(date, amount, categoryName, currentType);

            rows.push({
                fingerprint,
                date,
                amount,
                description: categoryName, // Description = Category Name initially
                categoryName,
                type: currentType,
                status: 'real', // Imported are usually real
                origin: currentOrigin,
                isValid: true,
                errors: []
            });

            newCategories.add(categoryName);
        }
    }

    return {
        rows,
        stats: {
            totalRows: rows.length,
            newCategories: Array.from(newCategories),
            potentialDuplicates: 0, // Calculated later against DB
            estimatedTotalAmount: rows.reduce((acc, r) => acc + r.amount, 0)
        }
    };
}

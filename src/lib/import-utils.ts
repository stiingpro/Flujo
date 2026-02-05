import * as XLSX from 'xlsx';
import { TransactionType, Transaction, TransactionStatus, TransactionOrigin } from '@/types';

// Standardize Month Names to detect columns
const MONTH_MAP: Record<string, number> = {
    // Spanish Short
    'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12,
    // Spanish Full
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
    'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
    // English Short
    'jan': 1, 'apr': 4, 'aug': 8, 'dec': 12,
    // English Full
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'june': 6,
    'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
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
    let categoryColIndex = 0; // Default to column 0

    // Scan first 20 rows for a header
    for (let i = 0; i < Math.min(20, data.length); i++) {
        const row = data[i];
        let monthsFoundCount = 0;
        let tempMonthIndices: Record<number, number> = {};
        let tempCategoryIndex = -1;

        row.forEach((cell: any, colIdx: number) => {
            if (typeof cell === 'string') {
                const cleanCell = cell.toLowerCase().trim();
                const shortCell = cleanCell.substring(0, 3);

                // Check if it is a month
                if (MONTH_MAP[cleanCell] || MONTH_MAP[shortCell]) {
                    const monthNum = MONTH_MAP[cleanCell] || MONTH_MAP[shortCell];
                    tempMonthIndices[monthNum] = colIdx;
                    monthsFoundCount++;
                }

                // Check if it is the Category Header
                if (['categoría', 'categoria', 'category', 'concepto', 'descripción', 'descripcion', 'item', 'nombre'].includes(cleanCell)) {
                    tempCategoryIndex = colIdx;
                }

                // Try to detect year in header row or nearby (e.g. "2024")
                if (cell.match(/20\d{2}/)) {
                    const match = cell.match(/20\d{2}/);
                    if (match) currentYear = parseInt(match[0]);
                }
            }
        });

        // Require at least 1 month to confirm this is the header row
        // Reverted to >= 1 as per user feedback (some files might only have "Enero")
        if (monthsFoundCount >= 1) {
            headerRowIndex = i;
            monthColIndices = tempMonthIndices;
            if (tempCategoryIndex !== -1) categoryColIndex = tempCategoryIndex;
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.warn("Smart detection failed. Falling back to standard layout (Row 0 header, Cols 1-12 months).");
        // Fallback: Assume Row 0 is header (or just data starts after it)
        // Assume Columns 1-12 are Jan-Dec
        headerRowIndex = 0;
        categoryColIndex = 0;
        monthColIndices = {
            1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6,
            7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12
        };
    }

    // Process rows below header
    // Heuristic for Type: Detect "INGRESOS" or "GASTOS" section headers
    let currentType: TransactionType = 'expense'; // Default
    let currentOrigin: TransactionOrigin = 'business'; // Default

    // Scan for section headers first to map ranges if needed, or do single pass state machine
    for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        // Use the detected category column
        const categoryCellRaw = row[categoryColIndex];
        const categoryCell = categoryCellRaw?.toString().trim().toUpperCase() || '';

        // Also check first column just in case "INGRESOS" / "GASTOS" headers are separate from the category column
        const firstColCell = row[0]?.toString().trim().toUpperCase() || '';

        // skip empty rows if no data in month columns
        const hasData = Object.values(monthColIndices).some(idx => {
            const val = row[idx];
            return typeof val === 'number' || (typeof val === 'string' && val.trim() !== '');
        });

        if (!hasData && !categoryCell && !firstColCell) continue;

        // Detect Logic Block Switches (These usually appear in the first column or category column)
        const checkHeader = (txt: string) => txt.includes('INGRESO') || txt.includes('GASTO') || txt.includes('EGRESO');

        if (checkHeader(firstColCell) || checkHeader(categoryCell)) {
            const txt = checkHeader(firstColCell) ? firstColCell : categoryCell;
            if (txt.includes('INGRESO')) {
                currentType = 'income';
                continue;
            }
            if (txt.includes('GASTO') || txt.includes('EGRESO')) {
                currentType = 'expense';
                continue;
            }
        }

        // It's a data row
        const categoryName = categoryCell;
        if (!categoryName) continue; // Skip if no category name
        if (checkHeader(categoryName)) continue; // Safety skip if it wasn't caught above

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

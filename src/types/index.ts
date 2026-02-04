// Database types for FlujoGlobal

export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'real' | 'projected';
export type TransactionOrigin = 'business' | 'personal';
export type CategoryLevel = 'personal' | 'empresa';
export type PaymentStatus = 'confirmed' | 'pending'; // Confirmado o Por confirmar
export type PersonalSublevel = 'casa' | 'viajes' | 'deporte' | 'pensiones' | 'otros';

export interface Category {
    id: string;
    name: string;
    type: TransactionType;
    level: CategoryLevel;
    sublevel?: PersonalSublevel; // Only for personal level
    color?: string; // Optional hex color for visual differentiation
    is_fixed: boolean;
    created_at: string;
    user_id: string;
}

// Sublevel colors for Personal categories
export const SUBLEVEL_COLORS: Record<PersonalSublevel, string> = {
    casa: '#8B5CF6',      // Purple
    viajes: '#F59E0B',    // Amber
    deporte: '#10B981',   // Emerald
    pensiones: '#EF4444', // Red
    otros: '#6B7280',     // Gray
};

export const SUBLEVEL_LABELS: Record<PersonalSublevel, string> = {
    casa: 'Casa',
    viajes: 'Viajes',
    deporte: 'Deporte',
    pensiones: 'Pensiones',
    otros: 'Otros',
};

// Color palettes for categories
export const CATEGORY_COLORS = {
    personal: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#7C3AED', '#6D28D9', '#5B21B6'],
    empresa: ['#0EA5E9', '#38BDF8', '#7DD3FC', '#0284C7', '#0369A1', '#075985'],
};

// Installment payment info
export interface InstallmentInfo {
    isInstallment: boolean;
    totalInstallments?: number;
    currentInstallment?: number;
    installmentAmount?: number;
    isEqualInstallments?: boolean;
    parentTransactionId?: string; // Links to the original transaction
}

export interface Transaction {
    id: string;
    date: string; // ISO date string (YYYY-MM-DD)
    amount: number;
    description: string | null;
    category_id: string;
    type: TransactionType;
    status: TransactionStatus;
    paymentStatus: PaymentStatus; // Confirmado or Por confirmar (independent of date)
    origin: TransactionOrigin;
    installment?: InstallmentInfo; // For installment payments
    created_at: string;
    updated_at: string;
    user_id: string;
    // Joined fields
    category?: Category;
}

// Form types
export interface TransactionFormData {
    date: string;
    amount: number;
    description?: string;
    category_id: string;
    type: TransactionType;
    status: TransactionStatus;
    paymentStatus: PaymentStatus;
    origin: TransactionOrigin;
    // Installment fields
    isInstallment: boolean;
    totalInstallments?: number;
    isEqualInstallments?: boolean;
}

// Dashboard types
export interface MonthlyData {
    month: number; // 1-12
    year: number;
    monthName: string;
    income: {
        real: number;
        projected: number;
        total: number;
    };
    expense: {
        real: number;
        projected: number;
        total: number;
    };
    utility: {
        real: number;
        projected: number;
        total: number;
    };
}

export interface MonthlyBalance {
    user_id: string;
    year: number;
    month: number;
    total_income: number;
    total_expense: number;
    net_flow: number;
    cumulative_utility: number;
}

export interface CategoryMonthlyData {
    categoryId: string;
    categoryName: string;
    type: TransactionType;
    isFixed: boolean;
    months: {
        [monthKey: string]: {
            amount: number;
            status: TransactionStatus;
            transactionId?: string;
        };
    };
}

// Excel Import types
export interface ParsedExcelTransaction {
    date: Date;
    amount: number;
    categoryName: string;
    type: TransactionType;
    status: TransactionStatus;
    origin: TransactionOrigin;
}

export interface ExcelParseResult {
    success: boolean;
    transactions: ParsedExcelTransaction[];
    categories: Set<string>;
    year: number | null;
    errors: string[];
}

// Chart types
export interface ChartDataPoint {
    month: string;
    ingresos: number;
    gastos: number;
    utilidad: number;
    utilidadAcumulada: number;
}

// Filter types
export interface DashboardFilters {
    year: number;
    showProjected: boolean;
    origin: TransactionOrigin | 'all';
}

// Month names in Spanish
export const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
] as const;

export const MONTH_NAMES_UPPER = MONTH_NAMES.map(m => m.toUpperCase());

// Client Revenue Analytics (for Empresa level)
export interface ClientRevenueData {
    clientName: string;
    monthlyRevenue: { [month: number]: number };
    yearlyTotal: number;
}

// Navigation tabs
export type MainTab = 'gastos' | 'ingresos' | 'resumen' | 'dashboard';

// User Profile
export interface Profile {
    id: string; // matches auth.users.id
    company_name?: string;
    logo_url?: string;
    full_name?: string;
    contact_email?: string;
    phone?: string;
    country?: string;
    updated_at?: string;
}

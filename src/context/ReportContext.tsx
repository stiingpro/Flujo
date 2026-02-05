
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Transaction, Category } from '@/types';

interface ExportData {
    transactions: Transaction[];
    categories: Category[];
    year: number;
    kpis?: {
        confirmed: { income: number; expense: number; net: number };
        projected: { income: number; expense: number; net: number };
    };
}

interface ReportContextType {
    isGenerating: boolean;
    generateExcelReport: (data: ExportData) => Promise<void>;
    generatePdfReport: (data: ExportData) => Promise<void>;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function useReport() {
    const context = useContext(ReportContext);
    if (!context) throw new Error('useReport must be used within ReportProvider');
    return context;
}

export const ReportContextProvider = ReportContext.Provider;

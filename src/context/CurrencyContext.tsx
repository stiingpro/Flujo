'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type CurrencyCode = 'CLP' | 'USD' | 'UF';

interface CurrencyContextType {
    displayCurrency: CurrencyCode;
    setDisplayCurrency: (currency: CurrencyCode) => void;
    convertAmount: (amount: number, fromCurrency: string, toCurrency: CurrencyCode, rate?: number) => number;
    formatCurrency: (amount: number, currency?: CurrencyCode) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>('CLP');

    // Simple storage persistence
    useEffect(() => {
        const saved = localStorage.getItem('flujo_display_currency');
        if (saved) setDisplayCurrency(saved as CurrencyCode);
    }, []);

    const handleSetCurrency = (c: CurrencyCode) => {
        setDisplayCurrency(c);
        localStorage.setItem('flujo_display_currency', c);
    };

    const convertAmount = (amount: number, fromCurrency: string, toCurrency: CurrencyCode, rate: number = 1) => {
        if (fromCurrency === toCurrency) return amount;

        // Simplified conversion logic assuming base is CLP 
        // rate is always "How many CLP is 1 Unit of fromCurrency"
        // If fromCurrency is CLP, then rate is 1.

        // Scenario 1: Source is Foreign (USD), Target is Base (CLP)
        if (toCurrency === 'CLP' && fromCurrency !== 'CLP') {
            return amount * rate;
        }

        // Scenario 2: Source is Base (CLP), Target is Foreign (USD)
        // We'd need the current exchange rate for this. For now, we mainly use this for aggregation to CLP.
        // If we need to view CLP expenses in USD, we need a global rate provider.
        // For MVP, we assume dashboard is viewed in CLP or we only convert "Foreign -> Base".

        return amount; // Fallback
    };

    const formatCurrency = (amount: number, currency: CurrencyCode = 'CLP') => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: currency === 'UF' ? 'CLF' : currency, // CLF is ISO for UF, though browsers support varies
            minimumFractionDigits: currency === 'CLP' ? 0 : 2,
            maximumFractionDigits: currency === 'CLP' ? 0 : 2,
        }).format(amount).replace('CLF', 'UF');
    };

    return (
        <CurrencyContext.Provider value={{
            displayCurrency,
            setDisplayCurrency: handleSetCurrency,
            convertAmount,
            formatCurrency
        }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
}

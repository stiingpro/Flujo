'use client';

import { useState, useEffect } from 'react';
import { CurrencyProvider } from '@/context/CurrencyContext';

export function ClientWrapper({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <CurrencyProvider>
            {children}
        </CurrencyProvider>
    );
}

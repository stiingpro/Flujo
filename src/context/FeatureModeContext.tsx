'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

export type AppMode = 'standard' | 'pro';

interface FeatureModeContextType {
    mode: AppMode;
    toggleMode: () => void;
    setMode: (mode: AppMode) => void;
    isPro: boolean;
}

const FeatureModeContext = createContext<FeatureModeContextType | undefined>(undefined);

export function FeatureModeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setModeState] = useState<AppMode>('standard');

    useEffect(() => {
        // Load persist mode
        const savedMode = localStorage.getItem('flujo_app_mode') as AppMode;
        if (savedMode === 'standard' || savedMode === 'pro') {
            setModeState(savedMode);
        }
    }, []);

    const setMode = (newMode: AppMode) => {
        setModeState(newMode);
        localStorage.setItem('flujo_app_mode', newMode);

        toast.info(`Modo ${newMode === 'pro' ? 'PRO' : 'STANDARD'} activado`, {
            description: newMode === 'pro'
                ? 'Funciones avanzadas habilitadas: Alertas, Cierre de Mes, Vista Inversionista.'
                : 'Versión simplificada.'
        });
    };

    const toggleMode = () => {
        setMode(mode === 'standard' ? 'pro' : 'standard');
    };

    return (
        <FeatureModeContext.Provider value={{ mode, toggleMode, setMode, isPro: mode === 'pro' }}>
            {children}
        </FeatureModeContext.Provider>
    );
}

export function useFeatureMode() {
    const context = useContext(FeatureModeContext);
    if (context === undefined) {
        throw new Error('useFeatureMode must be used within a FeatureModeProvider');
    }
    return context;
}

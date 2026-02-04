'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { FeatureModeProvider } from '@/context/FeatureModeContext';
import { AuthProvider } from '@/providers/AuthProvider';
import { BetaModeSwitch } from '@/components/common/BetaModeSwitch';

export function ClientWrapper({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                <CurrencyProvider>
                    <FeatureModeProvider>
                        {children}
                        <BetaModeSwitch />
                        <Toaster />
                    </FeatureModeProvider>
                </CurrencyProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}

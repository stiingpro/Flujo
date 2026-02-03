'use client';

import { useFinanceStore } from '@/stores/useFinanceStore';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ProfileSettingsDialog } from './ProfileSettingsDialog';
import Image from 'next/image';
import { PlusCircle, Building2 } from 'lucide-react';

export function CompanyBranding() {
    const { profile } = useFinanceStore();

    // Re-using ProfileSettingsDialog logic requires wrapping it or creating a custom trigger.
    // Since ProfileSettingsDialog has its own Trigger button, we'll need to modify it or create a wrapper.
    // For simplicity, I will modify ProfileSettingsDialog to accept a custom trigger child in the next step.
    // For now, I'll create the UI part here.

    if (profile?.logo_url) {
        return (
            <div className="flex items-center justify-center h-8 px-2 rounded-lg border border-transparent hover:border-gray-200 transition-all cursor-pointer group bg-white/50 hover:bg-white relative">
                <div className="relative h-full w-auto min-w-[80px] flex items-center justify-center">
                    <Image
                        src={profile.logo_url}
                        alt="Logo Empresa"
                        height={20}
                        width={80}
                        className="object-contain max-h-6 w-auto"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/80 transition-opacity rounded-lg">
                        <span className="text-[10px] font-medium text-gray-700">Editar</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer text-gray-400 hover:text-blue-600 gap-2">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Building2 className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium">Agregar Logo de Empresa (Opcional)</span>
        </div>
    );
}

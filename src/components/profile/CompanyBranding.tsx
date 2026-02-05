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

interface CompanyBrandingProps extends React.HTMLAttributes<HTMLDivElement> { }

export function CompanyBranding({ ...props }: CompanyBrandingProps) {
    const { profile } = useFinanceStore();

    if (profile?.logo_url) {
        return (
            <div
                {...props}
                className="flex items-center justify-center h-8 px-2 rounded-lg border border-transparent hover:border-gray-200 transition-all cursor-pointer group bg-white/50 hover:bg-white relative"
            >
                <div className="relative h-full w-auto min-w-[80px] flex items-center justify-center">
                    <Image
                        src={profile.logo_url}
                        alt={profile.company_name || "Logo Empresa"}
                        height={20}
                        width={80}
                        className="object-contain max-h-6 w-auto"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/80 transition-opacity rounded-lg backdrop-blur-[1px]">
                        <span className="text-[10px] font-medium text-gray-700">Editar</span>
                    </div>
                </div>
            </div>
        );
    }

    if (profile?.company_name) {
        return (
            <div
                {...props}
                className="flex items-center justify-center h-8 px-3 rounded-lg border border-transparent hover:border-gray-200 transition-all cursor-pointer group bg-white/50 hover:bg-white relative"
            >
                <span className="text-sm font-semibold text-gray-700 max-w-[150px] truncate">
                    {profile.company_name}
                </span>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/80 transition-opacity rounded-lg backdrop-blur-[1px]">
                    <span className="text-[10px] font-medium text-gray-700">Editar</span>
                </div>
            </div>
        );
    }

    return (
        <div
            {...props}
            className="flex flex-col items-center justify-center h-8 px-2 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer text-gray-400 hover:text-blue-600 gap-2"
            title="Agregar Logo o Nombre de Empresa"
        >
            <span className="text-xs font-medium px-2">+ Logo</span>
        </div>
    );
}

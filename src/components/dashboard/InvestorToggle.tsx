'use client';

import { Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFeatureMode } from '@/context/FeatureModeContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InvestorToggleProps {
    isInvestorMode: boolean;
    onToggle: () => void;
}

export function InvestorToggle({ isInvestorMode, onToggle }: InvestorToggleProps) {
    const { isPro } = useFeatureMode();

    if (!isPro) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground opacity-50 cursor-not-allowed">
                            <Eye className="h-4 w-4 mr-2" />
                            Vista Inversionista
                            <Lock className="h-3 w-3 ml-2" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Función disponible solo en Modo Pro</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <Button
            variant={isInvestorMode ? "secondary" : "ghost"}
            size="sm"
            onClick={onToggle}
            className={isInvestorMode ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : ""}
        >
            {isInvestorMode ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {isInvestorMode ? 'Modo Inversionista Activo' : 'Vista Inversionista'}
        </Button>
    );
}

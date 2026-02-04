'use client';

import { useFeatureMode } from '@/context/FeatureModeContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap } from 'lucide-react';

export function BetaModeSwitch() {
    const { isPro, toggleMode } = useFeatureMode();

    return (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border p-3 rounded-full shadow-lg transition-all hover:scale-105">
            <div className="flex flex-col items-end mr-1">
                <Label htmlFor="mode-toggle" className="font-bold cursor-pointer text-xs uppercase tracking-wider text-muted-foreground">
                    Modo Experiencia
                </Label>
                <div className="flex items-center gap-1.5">
                    {isPro ? (
                        <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 h-5 px-1.5 gap-0.5 pointer-events-none">
                            <Crown className="h-3 w-3 fill-current" />
                            PRO
                        </Badge>
                    ) : (
                        <Badge variant="secondary" className="h-5 px-1.5 pointer-events-none">
                            STD
                        </Badge>
                    )}
                </div>
            </div>

            <Switch
                id="mode-toggle"
                checked={isPro}
                onCheckedChange={toggleMode}
                className="data-[state=checked]:bg-amber-500"
            />
        </div>
    );
}

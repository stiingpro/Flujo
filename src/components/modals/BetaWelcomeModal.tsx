'use client';

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RocketIcon } from 'lucide-react';
import { logEvent } from '@/lib/analytics';

export function BetaWelcomeModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Check if the user has already seen the modal
        const hasSeenModal = localStorage.getItem('hasSeenBetaWelcome');

        if (!hasSeenModal) {
            // Small delay for better UX
            const timer = setTimeout(() => {
                setIsOpen(true);
                logEvent('beta_welcome_modal_shown');
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('hasSeenBetaWelcome', 'true');
        logEvent('beta_welcome_modal_accepted');
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                            <RocketIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <DialogTitle className="text-xl">¡Bienvenido, Pionero!</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2 text-base space-y-3 text-left">
                        <p className="font-medium text-foreground">
                            Estás usando la versión <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-1 py-0.5 rounded text-sm font-bold">BETA</span> de Radar Financiero.
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
                            <li>Tienes acceso total a todas las funciones <strong>PRO</strong> gratis.</li>
                            <li>Tu feedback define el futuro de la app.</li>
                            <li>Si encuentras un error, estamos puliéndolo para ti.</li>
                        </ul>
                        <p className="italic text-xs text-muted-foreground pt-2">
                            Gracias por ayudarnos a construir la mejor herramienta financiera.
                        </p>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-end">
                    <Button type="button" onClick={handleClose} className="w-full sm:w-auto">
                        Entendido, ¡A explorar!
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

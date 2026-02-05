'use client';

import { useState } from 'react';
import { Eraser, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';
import { toast } from 'sonner';

export function FormatDataButton() {
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const { resetAccount } = useSupabaseSync();

    const handleConfirm = async () => {
        if (confirmText !== 'ELIMINAR') return;

        try {
            setIsResetting(true);
            const success = await resetAccount();

            if (success) {
                toast.success('Cuenta formateada correctamente', {
                    description: 'Se han eliminado todos los datos.'
                });
                setOpen(false);
            } else {
                // Error handled in hook usually, but safety net here
                toast.error('Error al formatear cuenta');
            }
        } catch (error) {
            console.error('Reset error:', error);
            toast.error('Ocurrió un error inesperado');
        } finally {
            setIsResetting(false);
            setConfirmText('');
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2"
                >
                    <Eraser className="w-4 h-4" />
                    <span className="hidden sm:inline">Formatear</span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-destructive/20">
                <AlertDialogHeader>
                    <div className="flex items-center gap-2 text-destructive mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        <AlertDialogTitle>¿Formatear Cuenta?</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="space-y-3">
                        <p>
                            Esta acción es <strong>IRREVERSIBLE</strong>. Se eliminarán permanentemente todas tus:
                        </p>
                        <ul className="list-disc pl-5 text-sm">
                            <li>Categorías Personalizadas</li>
                            <li>Movimientos (Ingresos y Gastos)</li>
                            <li>Historial de cambios</li>
                        </ul>
                        <p>
                            Para confirmar, escribe <strong>ELIMINAR</strong> en el siguiente campo:
                        </p>
                    </AlertDialogDescription>
                    <div className="mt-4">
                        <Input
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="Escribe ELIMINAR"
                            className="border-destructive/50 focus-visible:ring-destructive/30"
                        />
                    </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-2">
                    <AlertDialogCancel onClick={() => setConfirmText('')}>Cancelar</AlertDialogCancel>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={confirmText !== 'ELIMINAR' || isResetting}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {isResetting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Formateando...
                            </>
                        ) : (
                            'FORMATEAR TODO'
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

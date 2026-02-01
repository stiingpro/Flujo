'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

export function YearCopyButton() {
    const { filters, copyYearData, transactions } = useFinanceStore();
    const [isOpen, setIsOpen] = useState(false);

    const currentYear = filters.year;
    const prevYear = currentYear - 1;

    const handleCopy = () => {
        const hasPrevData = transactions.some(t => new Date(t.date).getFullYear() === prevYear);
        if (!hasPrevData) {
            toast.error(`No hay datos en el año ${prevYear} para copiar.`);
            setIsOpen(false);
            return;
        }

        copyYearData(prevYear, currentYear);
        toast.success(`Datos del ${prevYear} copiados al ${currentYear}`, {
            description: "Se han generado proyecciones basadas en el año anterior.",
        });
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" title={`Copiar estructura del ${prevYear}`}>
                    <Copy className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Duplicar estructura del año {prevYear}</DialogTitle>
                    <DialogDescription className="space-y-4 pt-4">
                        <p>
                            ¿Deseas copiar todas las transacciones del año {prevYear} al año {currentYear}?
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Se crearán como <strong>Proyecciones (Pendientes)</strong>.</li>
                            <li>Se mantendrán categorías, montos y descripciones.</li>
                            <li>Las fechas se ajustarán al nuevo año.</li>
                        </ul>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCopy}>Sí, Copiar Estructura</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

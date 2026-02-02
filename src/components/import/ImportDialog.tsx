'use client';

import { useState, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { parseExcelFile, extractYearFromFilename } from '@/lib/excel-parser';
import { ExcelParseResult } from '@/types';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { useAuth } from '@/providers/AuthProvider';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';
import { toast } from 'sonner';

interface ImportDialogProps {
    onImportComplete?: () => void;
}

export function ImportDialog({ onImportComplete }: ImportDialogProps) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [yearOverride, setYearOverride] = useState<string>('');
    const [isDragOver, setIsDragOver] = useState(false);

    const { setTransactions, addCategory, transactions: existingTransactions, categories: existingCategories } = useFinanceStore();
    const { user } = useAuth();
    const { syncAllToSupabase } = useSupabaseSync();

    const handleFileSelect = useCallback(async (selectedFile: File) => {
        setFile(selectedFile);
        setIsProcessing(true);
        setParseResult(null);

        try {
            // Try to extract year from filename
            const filenameYear = extractYearFromFilename(selectedFile.name);
            if (filenameYear) {
                setYearOverride(filenameYear.toString());
            }

            const result = await parseExcelFile(selectedFile, filenameYear || undefined);
            setParseResult(result);

            if (!result.year) {
                toast.info('No se detectó el año en el archivo. Por favor, ingrésalo manualmente.');
            }
        } catch (error) {
            toast.error('Error al procesar el archivo');
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);

            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
                handleFileSelect(droppedFile);
            } else {
                toast.error('Por favor, selecciona un archivo Excel (.xlsx o .xls)');
            }
        },
        [handleFileSelect]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleImport = useCallback(async () => {
        if (!parseResult || !parseResult.success) return;

        setIsProcessing(true);

        try {
            // Always perform local import (Supabase sync can be added later)
            // Create category map and transactions
            const categoryMap = new Map<string, string>();
            const categories = Array.from(parseResult.categories);

            // Get existing category names to avoid duplicates
            const existingCategoryNames = new Set(existingCategories.map(c => c.name.toUpperCase()));

            // Generate IDs for categories (only add if not exists)
            categories.forEach((name, index) => {
                // Check if category already exists
                const existingCat = existingCategories.find(c => c.name.toUpperCase() === name.toUpperCase());
                if (existingCat) {
                    categoryMap.set(name, existingCat.id);
                } else {
                    const id = `cat-${index}-${Date.now()}`;
                    categoryMap.set(name, id);

                    // Determine type based on transaction data
                    const matchingTx = parseResult.transactions.find((t) => t.categoryName === name);
                    const type = matchingTx?.type || 'expense';

                    addCategory({
                        id,
                        name,
                        type,
                        level: 'empresa', // Default to empresa for imported categories
                        is_fixed: ['ARRIENDO', 'LUZ', 'AGUA', 'GAS', 'INTERNET', 'CELULAR'].includes(name.toUpperCase()),
                        created_at: new Date().toISOString(),
                        user_id: 'demo-user',
                    });
                }
            });

            // Convert transactions to store format
            const userId = user?.id || 'anonymous';
            const newTransactions = parseResult.transactions.map((t, index) => ({
                id: `tx-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                date: t.date.toISOString().split('T')[0],
                amount: t.amount,
                description: t.categoryName,
                category_id: categoryMap.get(t.categoryName) || '',
                type: t.type,
                status: t.status,
                paymentStatus: (t.status === 'real' ? 'confirmed' : 'pending') as 'confirmed' | 'pending',
                origin: t.origin,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                user_id: userId,
            }));

            // Append new transactions to existing ones instead of replacing
            setTransactions([...existingTransactions, ...newTransactions]);

            // Sync to Supabase for cross-device access
            await syncAllToSupabase();

            toast.success(`¡Importación exitosa! ${newTransactions.length} transacciones importadas.`);
            setOpen(false);
            onImportComplete?.();
        } catch (error) {
            toast.error('Error al importar los datos');
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    }, [parseResult, setTransactions, addCategory, onImportComplete, existingTransactions, existingCategories, user, syncAllToSupabase]);

    const handleReparse = useCallback(async () => {
        if (!file || !yearOverride) return;

        const year = parseInt(yearOverride, 10);
        if (isNaN(year) || year < 2000 || year > 2100) {
            toast.error('Por favor, ingresa un año válido (ej: 2024)');
            return;
        }

        setIsProcessing(true);
        try {
            const result = await parseExcelFile(file, year);
            setParseResult(result);
        } catch (error) {
            toast.error('Error al procesar el archivo');
        } finally {
            setIsProcessing(false);
        }
    }, [file, yearOverride]);

    const resetState = () => {
        setFile(null);
        setParseResult(null);
        setYearOverride('');
        setIsDragOver(false);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(newOpen) => {
                setOpen(newOpen);
                if (!newOpen) resetState();
            }}
        >
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Importar Histórico
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Importar desde Excel
                    </DialogTitle>
                    <DialogDescription>
                        Sube tu archivo de flujo de caja para migrar los datos automáticamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Drop Zone */}
                    {!file && (
                        <div
                            className={`drop-zone p-8 text-center ${isDragOver ? 'drag-over' : ''}`}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                        >
                            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mb-4">
                                Arrastra tu archivo Excel aquí o
                            </p>
                            <label htmlFor="file-upload">
                                <Button variant="secondary" className="cursor-pointer" asChild>
                                    <span>Seleccionar archivo</span>
                                </Button>
                                <input
                                    id="file-upload"
                                    type="file"
                                    accept=".xlsx,.xls"
                                    className="hidden"
                                    onChange={(e) => {
                                        const selectedFile = e.target.files?.[0];
                                        if (selectedFile) handleFileSelect(selectedFile);
                                    }}
                                />
                            </label>
                            <p className="text-xs text-muted-foreground mt-4">
                                Formatos soportados: .xlsx, .xls
                            </p>
                        </div>
                    )}

                    {/* File Selected */}
                    {file && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetState}
                                    disabled={isProcessing}
                                >
                                    Cambiar
                                </Button>
                            </div>

                            {/* Year Input */}
                            {parseResult && !parseResult.year && (
                                <div className="space-y-2">
                                    <Label htmlFor="year">Año de los datos</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="year"
                                            type="number"
                                            placeholder="2024"
                                            value={yearOverride}
                                            onChange={(e) => setYearOverride(e.target.value)}
                                            min={2000}
                                            max={2100}
                                        />
                                        <Button onClick={handleReparse} disabled={isProcessing || !yearOverride}>
                                            Aplicar
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Parse Results */}
                            {isProcessing && (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                </div>
                            )}

                            {parseResult && !isProcessing && (
                                <div className="space-y-3">
                                    {parseResult.success ? (
                                        <>
                                            <div className="flex items-center gap-2 text-green-600">
                                                <CheckCircle2 className="h-5 w-5" />
                                                <span className="font-medium">Archivo procesado correctamente</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="p-3 bg-muted rounded-lg">
                                                    <p className="text-muted-foreground">Transacciones</p>
                                                    <p className="text-2xl font-bold font-mono-numbers">
                                                        {parseResult.transactions.length}
                                                    </p>
                                                </div>
                                                <div className="p-3 bg-muted rounded-lg">
                                                    <p className="text-muted-foreground">Categorías</p>
                                                    <p className="text-2xl font-bold font-mono-numbers">
                                                        {parseResult.categories.size}
                                                    </p>
                                                </div>
                                            </div>

                                            {parseResult.year && (
                                                <Badge variant="outline" className="text-sm">
                                                    Año: {parseResult.year}
                                                </Badge>
                                            )}

                                            {/* Category preview */}
                                            <div className="max-h-32 overflow-y-auto">
                                                <p className="text-xs text-muted-foreground mb-2">Categorías detectadas:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.from(parseResult.categories).slice(0, 15).map((cat) => (
                                                        <Badge key={cat} variant="secondary" className="text-xs">
                                                            {cat}
                                                        </Badge>
                                                    ))}
                                                    {parseResult.categories.size > 15 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            +{parseResult.categories.size - 15} más
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-destructive">
                                                <AlertCircle className="h-5 w-5" />
                                                <span className="font-medium">Error al procesar</span>
                                            </div>
                                            {parseResult.errors.map((error, i) => (
                                                <p key={i} className="text-sm text-muted-foreground">
                                                    {error}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!parseResult?.success || isProcessing}
                    >
                        {isProcessing ? 'Importando...' : 'Importar datos'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

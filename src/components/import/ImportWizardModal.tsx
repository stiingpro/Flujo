'use client';

import { useState, useCallback } from 'react';
// import { useDropzone } from 'react-dropzone'; // Not used, using native input
import { parseExcelBuffer, ImportedRow, ImportStats, generateFingerprint } from '@/lib/import-utils';
import { ImportPreviewTable } from './ImportPreviewTable';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, ArrowRight, Save, Loader2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';
import { useAuth } from '@/providers/AuthProvider';

type WizardStep = 'upload' | 'preview' | 'syncing';

export function ImportWizardModal() {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<WizardStep>('upload');
    const [rows, setRows] = useState<ImportedRow[]>([]);
    const [stats, setStats] = useState<ImportStats | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useState<HTMLInputElement | null>(null);

    const { categories: existingCategories, addCategory } = useFinanceStore();
    const { addTransactionAndSync, syncCategory } = useSupabaseSync();
    const { user } = useAuth();

    // 1. Parse File
    const processFile = async (file: File) => {
        setIsProcessing(true);
        try {
            const buffer = await file.arrayBuffer();
            const { rows: parsedRows, stats } = await parseExcelBuffer(buffer);

            // 2. Deduplication Check (Idempotency)
            // Fetch validation data from DB
            // Optimization: Fetch transactions for the year(s) found in parsedRows
            const years = Array.from(new Set(parsedRows.map(r => r.date.getFullYear())));

            const existingHashes = new Set<string>();

            // Since we don't have a fingerprint column, we must generate fingerprints for existing DB rows
            // matching the same criteria (Date + Amount + Category + Type)
            // Ideally we query by range.
            for (const year of years) {
                const { data } = await supabase
                    .from('transactions')
                    .select(`
                        date,
                        amount,
                        type,
                        categories (name)
                    `)
                    .gte('date', `${year}-01-01`)
                    .lte('date', `${year}-12-31`);

                if (data) {
                    for (const tx of data) {
                        // Supabase returns an array or object depending on relation. Since tx -> category is N:1, it implies object, 
                        // but sometimes types inferred as array if not exact.
                        // Safe cast to any for this specific join property access to avoid complex generics right now.
                        const catRef: any = tx.categories;
                        const catName = catRef?.name || '';
                        // Generate hash for existing to compare
                        // Note: Dates from DB come as YYYY-MM-DD string, parseExcelBuffer uses Date objects.
                        // generateFingerprint expects Date object and handles ISO string internal conversion.
                        const fp = await generateFingerprint(new Date(tx.date), tx.amount, catName, tx.type);
                        existingHashes.add(fp);
                    }
                }
            }

            // Mark duplicates
            const verifiedRows = parsedRows.map(row => ({
                ...row,
                isDuplicate: existingHashes.has(row.fingerprint)
            }));

            setRows(verifiedRows);
            setStats({
                ...stats,
                potentialDuplicates: verifiedRows.filter(r => r.isDuplicate).length
            });
            setStep('preview');

        } catch (err: any) {
            console.error(err);
            toast.error('Error al leer el archivo: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
            processFile(file);
        } else if (file) {
            toast.error('Por favor, selecciona un archivo Excel válido (.xlsx)');
        }
    };

    // 3. Confirm & Import
    const handleConfirmImport = async () => {
        setIsProcessing(true);
        setStep('syncing');

        try {
            const rowsToImport = rows.filter(r => !r.isDuplicate);
            if (rowsToImport.length === 0) {
                toast.info('No hay registros nuevos para importar.');
                setOpen(false);
                return;
            }

            // A. Sync New Categories First
            const newCatNames = stats?.newCategories || [];
            const catMap = new Map<string, string>(); // Name -> ID

            // Pre-fill map with existing
            existingCategories.forEach(c => catMap.set(c.name.toUpperCase(), c.id));

            for (const catName of newCatNames) {
                const normName = catName.toUpperCase();
                if (!catMap.has(normName)) {
                    // Create new
                    const newId = crypto.randomUUID();
                    const newCat = {
                        id: newId,
                        name: catName, // Original casing
                        type: rowsToImport.find(r => r.categoryName === catName)?.type || 'expense',
                        level: 'empresa' as const, // Default, user can change later
                        is_fixed: false,
                        created_at: new Date().toISOString(),
                        user_id: user?.id || 'anonymous',
                    };

                    // We use syncCategory from hook which handles store + supabase
                    await syncCategory(newCat);
                    catMap.set(normName, newId);
                }
            }

            // B. Sync Transactions
            let successCount = 0;
            for (const row of rowsToImport) {
                const catId = catMap.get(row.categoryName.toUpperCase());
                if (!catId) continue; // Should not happen if logic above works

                const newTx = {
                    id: crypto.randomUUID(),
                    date: row.date.toISOString().split('T')[0],
                    amount: row.amount, // Positive number
                    description: row.description,
                    category_id: catId,
                    type: row.type,
                    status: 'real' as const,
                    origin: 'business' as const,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    user_id: user?.id || 'anonymous',
                    paymentStatus: 'confirmed' as const,
                    currency_code: 'CLP',
                    exchange_rate: 1,

                };

                // Use hook to ensure store + DB sync
                // Note: performing this in loop is slow for 1000s of rows but safe for 100s.
                // For bulk, we'd use a dedicated bulk insert RPC or endpoint, but reusing existing hook logic ensures consistency.
                await addTransactionAndSync(newTx);
                successCount++;
            }

            toast.success(`Importados ${successCount} registros exitosamente.`);
            setOpen(false);
            resetState();

        } catch (err: any) {
            console.error(err);
            toast.error('Error durante la importación: ' + err.message);
            setStep('preview'); // Go back to preview on error
        } finally {
            setIsProcessing(false);
        }
    };

    const resetState = () => {
        setStep('upload');
        setRows([]);
        setStats(null);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
            <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm">
                    <FileSpreadsheet className="w-4 h-4" />
                    Importar
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>Asistente de Importación Inteligente</DialogTitle>
                    <DialogDescription>
                        Importa tus datos históricos con validación automática de duplicados.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'upload' && (
                        <div
                            className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl transition-colors ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'
                                }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                                <Upload className={`w-8 h-8 ${isDragging ? 'text-emerald-600' : 'text-gray-400'}`} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                {isDragging ? 'Suelta el archivo aquí' : 'Sube tu archivo Excel'}
                            </h3>
                            <p className="text-sm text-gray-500 text-center max-w-sm mb-6">
                                Arrastra y suelta aquí tu archivo (.xlsx) o haz clic para seleccionar.
                                Detectaremos automáticamente la estructura de meses y categorías.
                            </p>

                            <div>
                                <Button
                                    variant="secondary"
                                    onClick={() => document.getElementById('wizard-file-input')?.click()}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Seleccionar Archivo
                                </Button>
                                <input
                                    id="wizard-file-input"
                                    type="file"
                                    accept=".xlsx, .xls"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                    disabled={isProcessing}
                                />
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-6">
                            {/* Analysis Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-lg border bg-white shadow-sm">
                                    <span className="text-xs font-medium text-gray-500 uppercase">Filas Detectadas</span>
                                    <div className="text-2xl font-bold text-gray-900 mt-1">{stats?.totalRows}</div>
                                </div>
                                <div className="p-4 rounded-lg border bg-white shadow-sm">
                                    <span className="text-xs font-medium text-gray-500 uppercase">Nuevos Registros</span>
                                    <div className="text-2xl font-bold text-emerald-600 mt-1">
                                        {(stats?.totalRows || 0) - (stats?.potentialDuplicates || 0)}
                                    </div>
                                </div>
                                <div className="p-4 rounded-lg border bg-white shadow-sm">
                                    <span className="text-xs font-medium text-gray-500 uppercase">Duplicados (Ignorados)</span>
                                    <div className="text-2xl font-bold text-gray-400 mt-1">{stats?.potentialDuplicates}</div>
                                </div>
                            </div>

                            {stats?.potentialDuplicates ? (
                                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                    <p>Hemos detectado <strong>{stats.potentialDuplicates}</strong> registros que ya existen en tu base de datos. Aparecen en gris y <strong>NO</strong> se duplicarán.</p>
                                </div>
                            ) : null}

                            <ImportPreviewTable data={rows} />
                        </div>
                    )}

                    {step === 'syncing' && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">Sincronizando datos...</h3>
                            <p className="text-gray-500 text-sm mt-2">Guardando transacciones en Supabase.</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-gray-50">
                    {step === 'preview' && (
                        <>
                            <Button variant="ghost" onClick={resetState} disabled={isProcessing}>
                                Cancelar
                            </Button>
                            <Button onClick={handleConfirmImport} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700">
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Procesando
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Confirmar Importación
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

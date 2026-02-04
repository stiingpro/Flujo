'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, X, Edit2, User, Building2, ChevronRight } from 'lucide-react';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { TransactionType, TransactionStatus, CategoryLevel, PersonalSublevel, MONTH_NAMES, SUBLEVEL_COLORS, SUBLEVEL_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';
import { motion, AnimatePresence } from 'framer-motion';
import { FocusMode } from './FocusToggle';

// --- ANIMATION VARIANTS ---
const rowVariants = {
    hidden: { opacity: 0, height: 0, transition: { duration: 0.2 } },
    visible: { opacity: 1, height: 'auto', transition: { duration: 0.3 } },
    exit: { opacity: 0, height: 0, transition: { duration: 0.2 } }
};

// --- TYPES ---
interface SmartMonthTableProps {
    filterType: TransactionType;
    focusMode: FocusMode;
}

interface EditingCell {
    categoryName: string;
    month: number;
    type: TransactionType;
}

// --- HELPER CONSTANTS ---
const LEVEL_COLORS = {
    personal: {
        bg: 'bg-purple-50/40',
        border: 'border-purple-100',
        text: 'text-purple-700',
        indicator: 'bg-purple-500'
    },
    empresa: {
        bg: 'bg-blue-50/40',
        border: 'border-blue-100',
        text: 'text-blue-700',
        indicator: 'bg-blue-500'
    },
};

export function SmartMonthTable({ filterType, focusMode }: SmartMonthTableProps) {
    const { getCategoryMonthlyData, transactions, filters, categories } = useFinanceStore();
    const { updateTransactionAndSync, addTransactionAndSync } = useSupabaseSync();
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    // Refs for auto-scroll
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const currentMonthRef = useRef<HTMLTableCellElement>(null);

    // Data processing
    const expenseData = getCategoryMonthlyData('expense');
    const incomeData = getCategoryMonthlyData('income');
    const data = filterType === 'expense' ? expenseData : incomeData;
    const currentMonthIndex = new Date().getMonth(); // 0-11

    // Auto-scroll on mount
    useEffect(() => {
        if (scrollContainerRef.current && currentMonthRef.current) {
            // Small timeout to ensure rendering is complete
            setTimeout(() => {
                currentMonthRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }, 500);
        }
    }, [filterType]); // Clean dependency

    // Grouping Logic (Reused & Optimized)
    const groupedData = useMemo(() => {
        const entries = Array.from(data.entries());

        // Group structures
        const personalBySubLevel: Record<PersonalSublevel, Array<{ name: string; months: any }>> = {
            casa: [], viajes: [], deporte: [], pensiones: [], otros: []
        };
        const empresa: Array<{ name: string; months: any }> = [];

        entries.forEach(([name, months]) => {
            const firstMonth = months.values().next().value;
            const level = firstMonth?.level || 'empresa';
            const sublevel = (firstMonth?.sublevel || 'otros') as PersonalSublevel;

            if (level === 'personal') {
                if (personalBySubLevel[sublevel]) {
                    personalBySubLevel[sublevel].push({ name, months });
                } else {
                    personalBySubLevel['otros'].push({ name, months });
                }
            } else {
                empresa.push({ name, months });
            }
        });

        // Sort
        (Object.keys(personalBySubLevel) as PersonalSublevel[]).forEach(key => {
            personalBySubLevel[key].sort((a, b) => a.name.localeCompare(b.name));
        });
        empresa.sort((a, b) => a.name.localeCompare(b.name));

        return { personalBySubLevel, empresa };
    }, [data]);

    // Formatters
    const formatCurrency = (val: number) => {
        if (val === 0) return '-';
        return new Intl.NumberFormat('es-CL', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(val);
    };
    const parseCurrency = (val: string) => parseFloat(val.replace(/[^0-9.-]/g, '')) || 0;

    // Handlers
    const handleCellClick = (categoryName: string, month: number, currentValue: number) => {
        setEditingCell({ categoryName, month, type: filterType });
        setEditValue(currentValue === 0 ? '' : currentValue.toString());
    };

    const handleSave = async () => {
        if (!editingCell) return;
        const { categoryName, month } = editingCell;
        const newAmount = parseCurrency(editValue);

        const transaction = transactions.find((t) => {
            const tDate = new Date(t.date);
            return (
                (t.description === categoryName || t.category?.name === categoryName) &&
                tDate.getFullYear() === filters.year &&
                tDate.getMonth() + 1 === month &&
                t.type === filterType
            );
        });

        if (transaction) {
            await updateTransactionAndSync(transaction.id, { amount: newAmount });
            toast.success('Monto actualizado', { duration: 1500 });
        } else if (newAmount > 0) {
            // Create new
            const category = categories.find(c => c.name === categoryName && c.type === filterType);
            const dateStr = `${filters.year}-${month.toString().padStart(2, '0')}-01`;
            const newTx = {
                id: crypto.randomUUID(),
                date: dateStr,
                amount: newAmount,
                description: categoryName,
                category_id: category?.id,
                type: filterType,
                status: 'projected', // Default to projected
                origin: 'business', // Default
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as any;
            await addTransactionAndSync(newTx);
            toast.success('Movimiento creado', { duration: 1500 });
        }

        setEditingCell(null);
    };

    const handleStatusToggle = async (transactionId: string, currentStatus: TransactionStatus) => {
        const newStatus = currentStatus === 'real' ? 'projected' : 'real';
        await updateTransactionAndSync(transactionId, { status: newStatus });
    };


    // --- RENDERERS ---

    const renderCell = (categoryName: string, month: number, cellData: any) => {
        const isEditing = editingCell?.categoryName === categoryName && editingCell?.month === month;
        const isCurrentMonth = (month - 1) === currentMonthIndex;
        const isReal = cellData?.status === 'real';
        const isProjected = cellData?.status === 'projected';
        const showValue = filters.showProjected || isReal;

        if (isEditing) {
            return (
                <div className="flex items-center gap-1 min-w-[80px]">
                    <Input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') setEditingCell(null);
                        }}
                        className="h-7 w-20 text-right text-xs p-1"
                    />
                </div>
            );
        }

        if (!cellData || (!showValue && isProjected)) {
            return (
                <div
                    onClick={() => handleCellClick(categoryName, month, 0)}
                    className="w-full h-8 flex items-center justify-end text-muted-foreground/30 hover:text-muted-foreground cursor-pointer group"
                >
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs">+</span>
                </div>
            );
        }

        return (
            <div className="group flex items-center justify-end gap-1.5 relative">
                <span
                    onClick={() => handleCellClick(categoryName, month, cellData.amount)}
                    className={cn(
                        "cursor-pointer font-mono-numbers tabular-nums text-sm transition-colors",
                        isReal ? "font-bold text-gray-900" : "font-normal text-gray-500 italic"
                    )}
                >
                    {formatCurrency(cellData.amount)}
                </span>

                {/* Optimistic Status Toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (cellData.id) handleStatusToggle(cellData.id, cellData.status);
                    }}
                    className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100",
                        isReal ? "bg-emerald-100 text-emerald-600 opacity-100" : "bg-gray-100 text-gray-400"
                    )}
                    title={isReal ? "Confirmado (Click para revertir)" : "Proyectado (Click para confirmar)"}
                >
                    <Check className="w-2.5 h-2.5" />
                </button>
            </div>
        );
    };

    const renderRow = (item: { name: string; months: any }, level: 'personal' | 'empresa', sublevel?: string) => {
        // Total Row Calc
        const rowTotal = Array.from({ length: 12 }, (_, i) => i + 1).reduce((acc, m) => {
            const cell = item.months.get(m);
            if (cell && (filters.showProjected || cell.status === 'real')) return acc + cell.amount;
            return acc;
        }, 0);

        return (
            <motion.tr
                key={item.name}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="group hover:bg-muted/30 transition-colors border-b border-gray-50"
            >
                <td className="sticky left-0 z-20 bg-background/95 backdrop-blur group-hover:bg-gray-50/90 py-2 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center gap-2 pl-4 pr-3">
                        <div className={cn("w-1 h-6 rounded-full", sublevel ? SUBLEVEL_COLORS[sublevel as PersonalSublevel] : (level === 'personal' ? 'bg-purple-300' : 'bg-blue-400'))} />
                        <span className="font-medium text-sm text-gray-700 truncate max-w-[140px]" title={item.name}>
                            {item.name}
                        </span>
                    </div>
                </td>
                {MONTH_NAMES.map((_, index) => {
                    const monthNum = index + 1;
                    const cellData = item.months.get(monthNum);
                    const isCurrentMonth = index === currentMonthIndex;

                    return (
                        <td
                            key={monthNum}
                            ref={isCurrentMonth ? currentMonthRef : undefined}
                            className={cn(
                                "px-4 py-2 text-right relative min-w-[110px]",
                                isCurrentMonth && "bg-blue-50/20"
                            )}
                        >
                            {renderCell(item.name, monthNum, cellData)}
                        </td>
                    );
                })}
                <td className="px-4 py-2 text-right font-bold text-sm bg-gray-50/50 min-w-[100px]">
                    {formatCurrency(rowTotal)}
                </td>
            </motion.tr>
        );
    };

    const showPersonal = focusMode === 'all' || focusMode === 'personal';
    const showCompany = focusMode === 'all' || focusMode === 'company';

    return (
        <div className="relative rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col h-full ring-1 ring-gray-200/50">

            {/* Table Container - Horizontal Scroll */}
            <div ref={scrollContainerRef} className="overflow-x-auto relative flex-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                <table className="w-full border-collapse min-w-max text-left">
                    <thead className="bg-gray-50/80 text-gray-500 sticky top-0 z-30 backdrop-blur-sm">
                        <tr>
                            <th className="sticky left-0 z-40 bg-gray-50 py-3 pl-4 font-semibold text-xs uppercase tracking-wider border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-[180px]">
                                Categoría
                            </th>
                            {MONTH_NAMES.map((m, i) => (
                                <th key={m} className={cn(
                                    "py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right min-w-[110px]",
                                    i === currentMonthIndex && "text-blue-600 bg-blue-50/30"
                                )}>
                                    {m.substring(0, 3)}
                                    {i === currentMonthIndex && <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 px-1 rounded">HOY</span>}
                                </th>
                            ))}
                            <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right min-w-[100px] bg-gray-100/50">
                                Total
                            </th>
                        </tr>
                    </thead>

                    {/* Animate Presence for Focus Mode Filtering */}
                    <tbody className="bg-white divide-y divide-gray-100">
                        <AnimatePresence mode='popLayout'>
                            {/* PERSONAL SECTION */}
                            {showPersonal && Object.keys(groupedData.personalBySubLevel).map((sublevel) => {
                                const items = groupedData.personalBySubLevel[sublevel as PersonalSublevel];
                                if (items.length === 0) return null;

                                return (
                                    <片 key={sublevel}>
                                        {/* Sublevel Header */}
                                        <motion.tr
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="bg-purple-50/30"
                                        >
                                            <td className="sticky left-0 bg-purple-50/30 z-20 py-1.5 pl-4 flex items-center gap-2 border-r font-semibold text-xs text-purple-800 uppercase tracking-widest">
                                                {SUBLEVEL_LABELS[sublevel as PersonalSublevel]}
                                            </td>
                                            <td colSpan={13} />
                                        </motion.tr>
                                        {items.map(item => renderRow(item, 'personal', sublevel))}
                                    </片>
                                );
                            })}

                            {/* COMPANY SECTION */}
                            {showCompany && groupedData.empresa.length > 0 && (
                                <>
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="bg-blue-50/30 border-t-2 border-blue-100/50"
                                    >
                                        <td className="sticky left-0 bg-blue-50/30 z-20 py-2 pl-4 flex items-center gap-2 border-r font-bold text-xs text-blue-800 uppercase tracking-widest">
                                            <Building2 className="w-3 h-3" />
                                            EMPRESA
                                        </td>
                                        <td colSpan={13} />
                                    </motion.tr>
                                    {groupedData.empresa.map(item => renderRow(item, 'empresa'))}
                                </>
                            )}

                            {!data.size && (
                                <TableRow>
                                    <TableCell colSpan={14} className="h-40 text-center text-muted-foreground">
                                        Sin movimientos para {filters.year}.
                                    </TableCell>
                                </TableRow>
                            )}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Helper wrapper for Fragments in map/AnimatePresence
function 片({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

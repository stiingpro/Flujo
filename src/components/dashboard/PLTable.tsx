'use client';

import { useState, useCallback, useMemo } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Edit2, Trash2, User, Building2 } from 'lucide-react';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { TransactionType, TransactionStatus, CategoryLevel, PersonalSublevel, MONTH_NAMES, SUBLEVEL_COLORS, SUBLEVEL_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';

interface PLTableProps {
    filterType?: TransactionType;
}

interface EditingCell {
    categoryName: string;
    month: number;
    type: TransactionType;
}

// Color themes for levels
const LEVEL_COLORS = {
    personal: {
        bg: 'bg-purple-50/50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        accent: 'bg-purple-100',
        row: 'hover:bg-purple-50/30',
    },
    empresa: {
        bg: 'bg-blue-50/50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        accent: 'bg-blue-100',
        row: 'hover:bg-blue-50/30',
    },
};

export function PLTable({ filterType }: PLTableProps) {
    const { getCategoryMonthlyData, updateTransaction, deleteTransaction, transactions, filters, deleteCategory, categories } = useFinanceStore();
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [animatingCells, setAnimatingCells] = useState<Set<string>>(new Set());

    const expenseData = getCategoryMonthlyData('expense');
    const incomeData = getCategoryMonthlyData('income');

    // Get the appropriate data based on filterType
    const data = filterType === 'expense' ? expenseData : filterType === 'income' ? incomeData : expenseData;
    const type = filterType || 'expense';

    // Group categories by level and sublevel, sorted alphabetically
    const groupedData = useMemo(() => {
        const entries = Array.from(data.entries());

        // For personal, we group by sublevel
        const personalBySubLevel: Record<PersonalSublevel, Array<[string, Map<number, { amount: number; status: TransactionStatus; id?: string; level?: CategoryLevel; sublevel?: string; color?: string }>]>> = {
            casa: [],
            viajes: [],
            deporte: [],
            pensiones: [],
            otros: [],
        };
        const empresa: Array<[string, Map<number, { amount: number; status: TransactionStatus; id?: string; level?: CategoryLevel; sublevel?: string; color?: string }>]> = [];

        entries.forEach(([name, months]) => {
            // Get level and sublevel from first month's data
            const firstMonth = months.values().next().value;
            const level = firstMonth?.level || 'empresa';
            const sublevel = (firstMonth?.sublevel || 'otros') as PersonalSublevel;

            if (level === 'personal') {
                if (personalBySubLevel[sublevel]) {
                    personalBySubLevel[sublevel].push([name, months]);
                } else {
                    // Fallback for unknown sublevels
                    personalBySubLevel['otros'].push([name, months]);
                }
            } else {
                empresa.push([name, months]);
            }
        });

        // Sort alphabetically within each group
        (Object.keys(personalBySubLevel) as PersonalSublevel[]).forEach(key => {
            personalBySubLevel[key].sort((a, b) => a[0].localeCompare(b[0]));
        });
        empresa.sort((a, b) => a[0].localeCompare(b[0]));

        return { personalBySubLevel, empresa };
    }, [data]);

    // Calculate monthly totals by level
    const monthlyTotals = useMemo(() => {
        const totals: Map<number, { personal: number; empresa: number; total: number }> = new Map();

        for (let month = 1; month <= 12; month++) {
            let personalSum = 0;
            let empresaSum = 0;

            // Iterate through all sublevels for personal totals
            Object.values(groupedData.personalBySubLevel).forEach((categories) => {
                categories.forEach(([, months]) => {
                    const cellData = months.get(month);
                    if (cellData && (filters.showProjected || cellData.status === 'real')) {
                        personalSum += cellData.amount;
                    }
                });
            });

            groupedData.empresa.forEach(([, months]) => {
                const cellData = months.get(month);
                if (cellData && (filters.showProjected || cellData.status === 'real')) {
                    empresaSum += cellData.amount;
                }
            });

            totals.set(month, {
                personal: personalSum,
                empresa: empresaSum,
                total: personalSum + empresaSum,
            });
        }

        return totals;
    }, [groupedData, filters.showProjected]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CL', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const parseCurrency = (value: string): number => {
        return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
    };

    const { removeCategoryByName, updateTransactionAndSync, deleteTransactionAndSync, addTransactionAndSync } = useSupabaseSync();

    const handleCellClick = useCallback(
        (categoryName: string, month: number, txType: TransactionType, currentValue: number) => {
            setEditingCell({ categoryName, month, type: txType });
            setEditValue(currentValue === 0 ? '' : currentValue.toString());
        },
        []
    );

    const handleSave = useCallback(async () => {
        if (!editingCell) return;

        const newAmount = parseCurrency(editValue);
        const { categoryName, month, type: txType } = editingCell;

        // Skip if empty or 0 (unless we want to allow 0 explicitly?)
        // If user enters nothing/0 for a NEW entry, we usually do nothing.
        // If user enters 0 for EXISTING entry, we might update it to 0.

        const transaction = transactions.find((t) => {
            const tDate = new Date(t.date);
            return (
                (t.description === categoryName || t.category?.name === categoryName) &&
                tDate.getFullYear() === filters.year &&
                tDate.getMonth() + 1 === month &&
                t.type === txType
            );
        });

        if (transaction) {
            // Update & Sync immediately
            await updateTransactionAndSync(transaction.id, { amount: newAmount });
            toast.success('Monto actualizado');
        } else {
            // CREATE NEW TRANSACTION
            if (newAmount > 0) {
                // Find Category ID
                const category = categories.find(c => c.name === categoryName && c.type === txType);

                // Construct Date (YYYY-MM-DD for the 1st of the month)
                const dateStr = `${filters.year}-${month.toString().padStart(2, '0')}-01`;

                const newTx = {
                    id: crypto.randomUUID(), // Modern random ID
                    date: dateStr,
                    amount: newAmount,
                    description: categoryName, // Fallback description
                    category_id: category?.id, // Link to category
                    type: txType,
                    status: 'projected', // Default to projected? Or real? Let's say projected per default.
                    origin: 'business', // Default origin?
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                } as any; // Type casting to bypass strict checks for now

                await addTransactionAndSync(newTx);
                toast.success('Nuevo movimiento creado');
            }
        }

        const cellKey = `${categoryName}-${month}`;
        setAnimatingCells((prev) => new Set(prev).add(cellKey));
        setTimeout(() => {
            setAnimatingCells((prev) => {
                const newSet = new Set(prev);
                newSet.delete(cellKey);
                return newSet;
            });
        }, 500);

        setEditingCell(null);
        setEditValue('');
    }, [editingCell, editValue, transactions, filters.year, updateTransactionAndSync, addTransactionAndSync, categories]);

    const handleCancel = useCallback(() => {
        setEditingCell(null);
        setEditValue('');
    }, []);

    const handleStatusToggle = useCallback(
        async (transactionId: string, currentStatus: TransactionStatus) => {
            const newStatus: TransactionStatus = currentStatus === 'real' ? 'projected' : 'real';

            // Update & Sync immediately
            await updateTransactionAndSync(transactionId, { status: newStatus });

            if (newStatus === 'real') {
                toast.success('Marcado como confirmado');
            } else {
                toast.info('Marcado como proyectado');
            }
        },
        [updateTransactionAndSync]
    );

    const handleDeleteCategory = useCallback(
        async (categoryName: string, txType: TransactionType) => {
            const category = categories.find((c) => c.name === categoryName && c.type === txType);

            const toDelete = transactions.filter((t) => {
                const tDate = new Date(t.date);
                return (
                    (t.description === categoryName || t.category?.name === categoryName) &&
                    tDate.getFullYear() === filters.year &&
                    t.type === txType
                );
            });

            // Delete transactions via Sync hook
            // Note: Parallel execution for speed
            await Promise.all(toDelete.map((t) => deleteTransactionAndSync(t.id)));

            if (category) {
                // Use RPC to delete category (and duplicates)
                await removeCategoryByName(categoryName);
            }

            // Silent success as requested
        },
        [categories, transactions, filters.year, deleteTransactionAndSync, removeCategoryByName]
    );

    const renderCategoryRow = (
        categoryName: string,
        months: Map<number, { amount: number; status: TransactionStatus; id?: string; level?: CategoryLevel; sublevel?: string; color?: string }>,
        txType: TransactionType,
        level: CategoryLevel,
        sublevel?: PersonalSublevel
    ) => {
        let rowTotal = 0;
        months.forEach((cellData) => {
            if (filters.showProjected || cellData.status === 'real') {
                rowTotal += cellData.amount;
            }
        });

        const colors = LEVEL_COLORS[level];
        const categoryColor = months.values().next().value?.color ||
            (level === 'personal' && sublevel ? SUBLEVEL_COLORS[sublevel] : (level === 'personal' ? '#8b5cf6' : '#3b82f6'));

        return (
            <TableRow key={categoryName} className={cn(colors.row, 'group/row')}>
                <TableCell className="font-medium sticky left-0 bg-white z-10 min-w-[180px]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: categoryColor }}
                            />
                            <span>{categoryName}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteCategory(categoryName, txType)}
                            title="Eliminar categoría"
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </TableCell>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const cellData = months.get(month);
                    const isEditing =
                        editingCell?.categoryName === categoryName &&
                        editingCell?.month === month &&
                        editingCell?.type === txType;
                    const cellKey = `${categoryName}-${month}`;
                    const isAnimating = animatingCells.has(cellKey);

                    const shouldShow = filters.showProjected || cellData?.status === 'real';

                    // Render Empty Cell (Enable Click)
                    if (!cellData) {
                        return (
                            <TableCell
                                key={month}
                                className="text-right text-muted-foreground font-mono-numbers hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => handleCellClick(categoryName, month, txType, 0)}
                            >
                                {isEditing ? (
                                    <div className="flex items-center gap-1">
                                        <Input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="h-7 w-24 text-right font-mono-numbers"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSave();
                                                if (e.key === 'Escape') handleCancel();
                                            }}
                                        />
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSave}>
                                            <Check className="h-3 w-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancel}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <span className="opacity-30 hover:opacity-100">-</span>
                                )}
                            </TableCell>
                        );
                    }

                    if (!shouldShow && cellData.status === 'projected') {
                        return (
                            <TableCell key={month} className="text-center text-muted-foreground font-mono-numbers">
                                -
                            </TableCell>
                        );
                    }

                    return (
                        <TableCell
                            key={month}
                            className={cn(
                                'text-right font-mono-numbers transition-all',
                                isAnimating && 'status-changed',
                                cellData.status === 'projected' && 'projected'
                            )}
                        >
                            {isEditing ? (
                                <div className="flex items-center gap-1">
                                    <Input
                                        type="text"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="h-7 w-24 text-right font-mono-numbers"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSave();
                                            if (e.key === 'Escape') handleCancel();
                                        }}
                                    />
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSave}>
                                        <Check className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancel}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-end gap-1 group">
                                    <button
                                        className="editable-cell text-right"
                                        onClick={() => handleCellClick(categoryName, month, txType, cellData.amount)}
                                    >
                                        {formatCurrency(cellData.amount)}
                                    </button>
                                    <button
                                        className={cn(
                                            'opacity-0 group-hover:opacity-100 transition-opacity',
                                            'h-5 w-5 rounded flex items-center justify-center',
                                            cellData.status === 'real'
                                                ? 'bg-green-100 text-green-600'
                                                : 'bg-muted text-muted-foreground'
                                        )}
                                        onClick={() => cellData.id && handleStatusToggle(cellData.id, cellData.status)}
                                        title={cellData.status === 'real' ? 'Confirmado' : 'Proyectado - Click para confirmar'}
                                    >
                                        {cellData.status === 'real' ? (
                                            <Check className="h-3 w-3" />
                                        ) : (
                                            <Edit2 className="h-3 w-3" />
                                        )}
                                    </button>
                                </div>
                            )}
                        </TableCell>
                    );
                })}
                <TableCell className={cn('text-right font-mono-numbers font-semibold', type === 'income' ? 'text-income' : 'text-expense')}>
                    {formatCurrency(rowTotal)}
                </TableCell>
            </TableRow>
        );
    };

    const renderSubtotalRow = (label: string, level: 'personal' | 'empresa', icon: React.ReactNode) => {
        const yearTotal = Array.from({ length: 12 }, (_, i) => i + 1)
            .reduce((sum, month) => sum + (monthlyTotals.get(month)?.[level] || 0), 0);
        const colors = LEVEL_COLORS[level];

        return (
            <TableRow className={cn(colors.bg, 'font-semibold border-t-2', colors.border)}>
                <TableCell className={cn('sticky left-0 z-10 flex items-center gap-2', colors.bg)}>
                    {icon}
                    {label}
                </TableCell>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const total = monthlyTotals.get(month)?.[level] || 0;
                    return (
                        <TableCell key={month} className={cn('text-right font-mono-numbers', colors.text)}>
                            {formatCurrency(total)}
                        </TableCell>
                    );
                })}
                <TableCell className={cn('text-right font-mono-numbers font-bold', colors.text)}>
                    {formatCurrency(yearTotal)}
                </TableCell>
            </TableRow>
        );
    };

    const renderTotalRow = () => {
        const yearTotal = Array.from({ length: 12 }, (_, i) => i + 1)
            .reduce((sum, month) => sum + (monthlyTotals.get(month)?.total || 0), 0);

        return (
            <TableRow className="bg-muted/50 font-bold border-t-2">
                <TableCell className="sticky left-0 bg-muted/50 z-10">
                    TOTAL {filterType === 'income' ? 'INGRESOS' : 'GASTOS'}
                </TableCell>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const total = monthlyTotals.get(month)?.total || 0;
                    return (
                        <TableCell key={month} className={cn('text-right font-mono-numbers', filterType === 'income' ? 'text-income' : 'text-expense')}>
                            {formatCurrency(total)}
                        </TableCell>
                    );
                })}
                <TableCell className={cn('text-right font-mono-numbers font-bold', filterType === 'income' ? 'text-income' : 'text-expense')}>
                    {formatCurrency(yearTotal)}
                </TableCell>
            </TableRow>
        );
    };

    const tableTitle = filterType === 'expense'
        ? 'Gastos por Categoría'
        : filterType === 'income'
            ? 'Ingresos por Categoría'
            : 'Estado de Resultados (P&L)';

    // Check if any personal sublevel has data
    const hasPersonalData = Object.values(groupedData.personalBySubLevel).some(arr => arr.length > 0);
    const hasData = hasPersonalData || groupedData.empresa.length > 0;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center justify-between">
                    {tableTitle}
                    <div className="flex items-center gap-3 text-sm font-normal">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500" />
                            <span className="text-muted-foreground">Personal</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-muted-foreground">Empresa</span>
                        </div>
                        <Badge variant="outline" className="gap-1 ml-2">
                            <span className="w-2 h-2 rounded-full bg-income" />
                            Confirmado
                        </Badge>
                        <Badge variant="outline" className="gap-1 opacity-60">
                            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                            Proyectado
                        </Badge>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="table-container overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="sticky-header">
                                <TableHead className="sticky left-0 bg-background z-20 min-w-[180px]">
                                    Categoría
                                </TableHead>
                                {MONTH_NAMES.map((month, i) => (
                                    <TableHead key={i} className="text-center min-w-[90px]">
                                        {month.substring(0, 3)}
                                    </TableHead>
                                ))}
                                <TableHead className="text-center min-w-[100px] font-bold">
                                    Total
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!hasData && (
                                <TableRow>
                                    <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                                        No hay datos. Importa un archivo Excel o agrega movimientos.
                                    </TableCell>
                                </TableRow>
                            )}

                            {/* Personal Section (Top) - Separated by Sublevels */}
                            {hasPersonalData && (
                                <>
                                    <TableRow className={cn(LEVEL_COLORS.personal.bg, 'border-t-2', LEVEL_COLORS.personal.border)}>
                                        <TableCell colSpan={14} className={cn('font-semibold sticky left-0 z-10 flex items-center gap-2', LEVEL_COLORS.personal.bg, LEVEL_COLORS.personal.text)}>
                                            <User className="h-4 w-4" />
                                            PERSONAL
                                        </TableCell>
                                    </TableRow>

                                    {/* Iterate through sublevels in order */}
                                    {(Object.keys(groupedData.personalBySubLevel) as PersonalSublevel[]).map((sublevel) => {
                                        const categories = groupedData.personalBySubLevel[sublevel];
                                        if (categories.length === 0) return null;

                                        return (
                                            <>
                                                {/* Sublevel Header */}
                                                <TableRow key={`header-${sublevel}`} className="bg-muted/30">
                                                    <TableCell colSpan={14} className="font-medium sticky left-0 z-10 text-xs text-muted-foreground pl-8 flex items-center gap-2">
                                                        <div
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ backgroundColor: SUBLEVEL_COLORS[sublevel] }}
                                                        />
                                                        {SUBLEVEL_LABELS[sublevel].toUpperCase()}
                                                    </TableCell>
                                                </TableRow>

                                                {/* Categories in this sublevel */}
                                                {categories.map(([name, months]) =>
                                                    renderCategoryRow(name, months, type, 'personal', sublevel)
                                                )}
                                            </>
                                        );
                                    })}

                                    {renderSubtotalRow('Subtotal Personal', 'personal', <User className="h-4 w-4" />)}
                                </>
                            )}

                            {/* Empresa Section (Bottom) */}
                            {groupedData.empresa.length > 0 && (
                                <>
                                    <TableRow className={cn(LEVEL_COLORS.empresa.bg, 'border-t-2', LEVEL_COLORS.empresa.border)}>
                                        <TableCell colSpan={14} className={cn('font-semibold sticky left-0 z-10 flex items-center gap-2', LEVEL_COLORS.empresa.bg, LEVEL_COLORS.empresa.text)}>
                                            <Building2 className="h-4 w-4" />
                                            EMPRESA
                                        </TableCell>
                                    </TableRow>
                                    {groupedData.empresa.map(([name, months]) =>
                                        renderCategoryRow(name, months, type, 'empresa')
                                    )}
                                    {renderSubtotalRow('Subtotal Empresa', 'empresa', <Building2 className="h-4 w-4" />)}
                                </>
                            )}

                            {/* Grand Total */}
                            {hasData && renderTotalRow()}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

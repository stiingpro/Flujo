'use client';

import { useState, useMemo } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, Building2, User, Tags, Search, X, CheckSquare, Square } from 'lucide-react';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { Category, CategoryLevel, TransactionType, PersonalSublevel, SUBLEVEL_LABELS, SUBLEVEL_COLORS } from '@/types';
import { toast } from 'sonner';

import { useSupabaseSync } from '@/hooks/useSupabaseSync';
import { useAuth } from '@/providers/AuthProvider';

export function CategoryManager() {
    const { categories, addCategory, updateCategory, deleteCategory } = useFinanceStore();
    const { syncCategory, removeCategory } = useSupabaseSync();
    const { user } = useAuth();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // New category form
    const [newCategory, setNewCategory] = useState({
        name: '',
        type: 'expense' as TransactionType,
        level: 'empresa' as CategoryLevel,
        sublevel: 'otros' as PersonalSublevel,
    });

    // ... (sorted and filtered categories logic can stay same)

    // Sorted and filtered categories
    const sortedCategories = useMemo(() => {
        return [...categories].sort((a, b) => a.name.localeCompare(b.name));
    }, [categories]);

    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return sortedCategories;
        return sortedCategories.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [sortedCategories, searchQuery]);

    const expenseCategories = filteredCategories.filter((c) => c.type === 'expense');
    const incomeCategories = filteredCategories.filter((c) => c.type === 'income');

    // Selection handlers
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleSelectAll = (type?: TransactionType) => {
        if (type) {
            // Select all visible of specific type
            const targetIds = type === 'expense' ? expenseCategories.map(c => c.id) : incomeCategories.map(c => c.id);
            const newSet = new Set(selectedIds);
            const allSelected = targetIds.every(id => newSet.has(id));

            if (allSelected) {
                targetIds.forEach(id => newSet.delete(id));
            } else {
                targetIds.forEach(id => newSet.add(id));
            }
            setSelectedIds(newSet);
        } else {
            // Select all visible
            const allIds = filteredCategories.map(c => c.id);
            if (selectedIds.size === allIds.length && allIds.length > 0) {
                setSelectedIds(new Set());
            } else {
                setSelectedIds(new Set(allIds));
            }
        }
    };

    const handleAddCategory = () => {
        if (!newCategory.name.trim()) {
            toast.error('Ingresa un nombre para la categoría');
            return;
        }

        const category: Category = {
            id: `cat-${Date.now()}`,
            name: newCategory.name.trim(),
            type: newCategory.type,
            level: newCategory.level,
            sublevel: newCategory.level === 'personal' ? newCategory.sublevel : undefined,
            color: newCategory.level === 'personal' ? SUBLEVEL_COLORS[newCategory.sublevel] : undefined,
            is_fixed: false,
            created_at: new Date().toISOString(),
            user_id: user?.id || 'demo-user',
        };

        addCategory(category);
        syncCategory(category); // Sync to Supabase

        setNewCategory({ name: '', type: 'expense', level: 'empresa', sublevel: 'otros' });
    };

    const handleUpdateCategory = async () => {
        if (!editingCategory) return;

        const updates = {
            name: editingCategory.name,
            level: editingCategory.level,
            sublevel: editingCategory.level === 'personal' ? editingCategory.sublevel : undefined,
            color: editingCategory.level === 'personal' && editingCategory.sublevel
                ? SUBLEVEL_COLORS[editingCategory.sublevel]
                : undefined,
        };

        updateCategory(editingCategory.id, updates);

        // Sync updated object to Supabase
        const updatedCategoryFull = { ...editingCategory, ...updates };
        await syncCategory(updatedCategoryFull);

        setIsEditOpen(false);
        setEditingCategory(null);
    };

    const handleDeleteCategory = async (category: Category) => {
        // PERFORANCE CHANGE: We act pessimistically here. We do NOT update UI until DB confirms delete.
        // This prevents the user from logging out before the delete is actually persisted.
        const success = await removeCategory(category.id);

        if (!success) {
            toast.error('Error: No se pudo eliminar. Intenta recargar.');
            return;
        }

        // Only remove visually if DB confirm success
        deleteCategory(category.id);

        if (selectedIds.has(category.id)) {
            const newSet = new Set(selectedIds);
            newSet.delete(category.id);
            setSelectedIds(newSet);
        }
    };

    // Bulk Actions
    const handleBulkUpdateLevel = async (level: CategoryLevel, sublevel?: PersonalSublevel) => {
        const promises: Promise<void>[] = [];

        selectedIds.forEach(id => {
            const category = categories.find(c => c.id === id);
            if (category) {
                const updates = {
                    level,
                    sublevel: level === 'personal' ? (sublevel || 'otros') : undefined,
                    color: level === 'personal' ? SUBLEVEL_COLORS[sublevel || 'otros'] : undefined
                };

                updateCategory(id, updates);
                // Queue sync to Supabase
                promises.push(syncCategory({ ...category, ...updates }));
            }
        });

        await Promise.all(promises);
        setSelectedIds(new Set());
    };

    const handleBulkDelete = async () => {
        if (confirm(`¿Estás seguro de eliminar ${selectedIds.size} categorías?`)) {
            const idsToDelete = Array.from(selectedIds);

            // Execute all remote deletes first
            const promises = idsToDelete.map(async (id) => {
                const success = await removeCategory(id);
                return { id, success };
            });

            // Wait for all to finish
            const outcomes = await Promise.all(promises);

            // Update local state only for successful ones
            let deletedCount = 0;
            const remainingSelection = new Set(selectedIds);

            outcomes.forEach(({ id, success }) => {
                if (success) {
                    deleteCategory(id); // Only verify delete locally if remote succeeded
                    remainingSelection.delete(id);
                    deletedCount++;
                }
            });

            setSelectedIds(remainingSelection);

            if (deletedCount < idsToDelete.length) {
                toast.error(`Error: ${idsToDelete.length - deletedCount} categorías no se pudieron borrar.`);
            }
        }
    };

    const openEditDialog = (category: Category) => {
        setEditingCategory({ ...category });
        setIsEditOpen(true);
    };

    const renderCategoryItem = (cat: Category) => (
        <div
            key={cat.id}
            className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-sm group"
        >
            <Checkbox
                checked={selectedIds.has(cat.id)}
                onCheckedChange={() => toggleSelection(cat.id)}
                className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
            />

            <div className="flex items-center justify-between flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer" onClick={() => toggleSelection(cat.id)}>
                    <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || (cat.level === 'empresa' ? '#0EA5E9' : SUBLEVEL_COLORS[cat.sublevel || 'otros']) }}
                    />
                    <span className="font-medium truncate">{cat.name}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                        {cat.level === 'empresa' ? 'E' : SUBLEVEL_LABELS[cat.sublevel || 'otros']}
                    </Badge>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(cat); }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );

    return (
        <>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <Tags className="h-4 w-4" />
                        Categorías
                    </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-xl h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Gestionar Categorías</DialogTitle>
                        <DialogDescription>
                            Organiza tus categorías de ingresos y gastos.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col gap-4 py-2">
                        {/* Search and General Actions */}
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar categorías..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-8 text-sm"
                                />
                            </div>

                            {/* Bulk Actions Panel (Visible when selected items > 0) */}
                            {selectedIds.size > 0 ? (
                                <Card className="bg-primary/5 border-primary/20">
                                    <CardContent className="p-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-primary">
                                                {selectedIds.size} seleccionadas
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 gap-1 text-muted-foreground hover:text-primary"
                                                onClick={() => setSelectedIds(new Set())}
                                            >
                                                <X className="h-3 w-3" />
                                                Cancelar
                                            </Button>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex-1 text-xs gap-1 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                                    onClick={() => handleBulkUpdateLevel('empresa')}
                                                >
                                                    <Building2 className="h-3 w-3" />
                                                    Mover a Empresa
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="flex-1 text-xs gap-1 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                                                        >
                                                            <User className="h-3 w-3" />
                                                            Mover a Personal
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        {(Object.keys(SUBLEVEL_LABELS) as PersonalSublevel[]).map((sublevel) => (
                                                            <DropdownMenuItem
                                                                key={sublevel}
                                                                onClick={() => handleBulkUpdateLevel('personal', sublevel)}
                                                                className="gap-2"
                                                            >
                                                                <div
                                                                    className="w-2 h-2 rounded-full"
                                                                    style={{ backgroundColor: SUBLEVEL_COLORS[sublevel] }}
                                                                />
                                                                {SUBLEVEL_LABELS[sublevel]}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="w-full text-xs h-7"
                                                onClick={handleBulkDelete}
                                            >
                                                <Trash2 className="h-3 w-3 mr-1" />
                                                Eliminar Seleccionadas
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                /* Add Category Form (Hidden when selecting) */
                                <Card>
                                    <CardHeader className="py-2 px-3">
                                        <CardTitle className="text-xs font-medium flex items-center gap-2">
                                            <Plus className="h-3 w-3" />
                                            Nueva Categoría
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 px-3 pb-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                placeholder="Nombre"
                                                value={newCategory.name}
                                                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                                className="h-8 text-sm"
                                            />
                                            <Select
                                                value={newCategory.type}
                                                onValueChange={(value: TransactionType) =>
                                                    setNewCategory({ ...newCategory, type: value })
                                                }
                                            >
                                                <SelectTrigger className="h-8 text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="expense">Gasto</SelectItem>
                                                    <SelectItem value="income">Ingreso</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant={newCategory.level === 'personal' ? 'default' : 'outline'}
                                                size="sm"
                                                className="flex-1 gap-1"
                                                onClick={() => setNewCategory({ ...newCategory, level: 'personal' })}
                                            >
                                                <User className="h-3 w-3" />
                                                Personal
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={newCategory.level === 'empresa' ? 'default' : 'outline'}
                                                size="sm"
                                                className="flex-1 gap-1"
                                                onClick={() => setNewCategory({ ...newCategory, level: 'empresa' })}
                                            >
                                                <Building2 className="h-3 w-3" />
                                                Empresa
                                            </Button>
                                        </div>

                                        {/* Sublevel selection for Personal */}
                                        {newCategory.level === 'personal' && (
                                            <div className="grid grid-cols-5 gap-1">
                                                {(Object.keys(SUBLEVEL_LABELS) as PersonalSublevel[]).map((sublevel) => (
                                                    <Button
                                                        key={sublevel}
                                                        type="button"
                                                        variant={newCategory.sublevel === sublevel ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="text-[10px] px-1 h-7"
                                                        style={{
                                                            backgroundColor: newCategory.sublevel === sublevel ? SUBLEVEL_COLORS[sublevel] : undefined,
                                                            borderColor: SUBLEVEL_COLORS[sublevel],
                                                            color: newCategory.sublevel === sublevel ? 'white' : SUBLEVEL_COLORS[sublevel],
                                                        }}
                                                        onClick={() => setNewCategory({ ...newCategory, sublevel })}
                                                    >
                                                        {SUBLEVEL_LABELS[sublevel]}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}

                                        <Button onClick={handleAddCategory} size="sm" className="w-full">
                                            <Plus className="h-3 w-3 mr-1" />
                                            Agregar Categoría
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Existing Categories with Scroll - Using native div for reliable scrolling */}
                        <div className="flex-1 overflow-y-auto min-h-0 pr-3">
                            <div className="space-y-4 pb-4">
                                <div>
                                    <div className="flex items-center justify-between mb-2 sticky top-0 bg-background py-1 z-10">
                                        <h4 className="text-xs font-semibold text-expense flex items-center gap-1">
                                            Gastos ({expenseCategories.length})
                                        </h4>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 text-[10px]"
                                            onClick={() => handleSelectAll('expense')}
                                        >
                                            {expenseCategories.every(c => selectedIds.has(c.id)) && expenseCategories.length > 0 ? 'Deseleccionar' : 'Seleccionar Todo'}
                                        </Button>
                                    </div>
                                    <div className="space-y-1">
                                        {expenseCategories.length === 0 ? (
                                            <p className="text-xs text-muted-foreground text-center py-2">
                                                No hay categorías de gastos
                                            </p>
                                        ) : (
                                            expenseCategories.map(renderCategoryItem)
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2 sticky top-0 bg-background py-1 z-10">
                                        <h4 className="text-xs font-semibold text-income flex items-center gap-1">
                                            Ingresos ({incomeCategories.length})
                                        </h4>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 text-[10px]"
                                            onClick={() => handleSelectAll('income')}
                                        >
                                            {incomeCategories.every(c => selectedIds.has(c.id)) && incomeCategories.length > 0 ? 'Deseleccionar' : 'Seleccionar Todo'}
                                        </Button>
                                    </div>
                                    <div className="space-y-1">
                                        {incomeCategories.length === 0 ? (
                                            <p className="text-xs text-muted-foreground text-center py-2">
                                                No hay categorías de ingresos
                                            </p>
                                        ) : (
                                            incomeCategories.map(renderCategoryItem)
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Category Dialog (Keep detailed edit for single items) */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar Categoría</DialogTitle>
                    </DialogHeader>

                    {editingCategory && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nombre</Label>
                                <Input
                                    value={editingCategory.name}
                                    onChange={(e) =>
                                        setEditingCategory({ ...editingCategory, name: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Nivel</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={editingCategory.level === 'personal' ? 'default' : 'outline'}
                                        size="sm"
                                        className="flex-1 gap-1"
                                        onClick={() => setEditingCategory({ ...editingCategory, level: 'personal' })}
                                    >
                                        <User className="h-3 w-3" />
                                        Personal
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={editingCategory.level === 'empresa' ? 'default' : 'outline'}
                                        size="sm"
                                        className="flex-1 gap-1"
                                        onClick={() => setEditingCategory({ ...editingCategory, level: 'empresa' })}
                                    >
                                        <Building2 className="h-3 w-3" />
                                        Empresa
                                    </Button>
                                </div>
                            </div>

                            {/* Sublevel for Personal */}
                            {editingCategory.level === 'personal' && (
                                <div className="space-y-2">
                                    <Label>Subnivel</Label>
                                    <div className="grid grid-cols-5 gap-1">
                                        {(Object.keys(SUBLEVEL_LABELS) as PersonalSublevel[]).map((sublevel) => (
                                            <Button
                                                key={sublevel}
                                                type="button"
                                                variant={editingCategory.sublevel === sublevel ? 'default' : 'outline'}
                                                size="sm"
                                                className="text-[10px] px-1 h-7"
                                                style={{
                                                    backgroundColor: editingCategory.sublevel === sublevel ? SUBLEVEL_COLORS[sublevel] : undefined,
                                                    borderColor: SUBLEVEL_COLORS[sublevel],
                                                    color: editingCategory.sublevel === sublevel ? 'white' : SUBLEVEL_COLORS[sublevel],
                                                }}
                                                onClick={() => setEditingCategory({ ...editingCategory, sublevel })}
                                            >
                                                {SUBLEVEL_LABELS[sublevel]}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleUpdateCategory}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, User, Building2, CreditCard, CheckCircle2, Clock } from 'lucide-react';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { useAuth } from '@/providers/AuthProvider';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';
import {
    TransactionType,
    TransactionStatus,
    TransactionOrigin,
    TransactionFormData,
    CategoryLevel,
    PersonalSublevel,
    PaymentStatus,
    Category,
    SUBLEVEL_LABELS,
    SUBLEVEL_COLORS,
} from '@/types';
import { toast } from 'sonner';

type CategoryMode = 'existing' | 'new';

export function TransactionForm() {
    const [open, setOpen] = useState(false);
    const { addTransaction, addCategory, categories } = useFinanceStore();
    const { user } = useAuth();
    const { syncTransaction, syncCategory } = useSupabaseSync();

    const [formData, setFormData] = useState<TransactionFormData>({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        description: '',
        category_id: '',
        type: 'expense',
        status: 'projected',
        paymentStatus: 'pending',
        origin: 'business',
        currency_code: 'CLP',
        exchange_rate: 1,
        isInstallment: false,
        totalInstallments: 1,
        isEqualInstallments: true,
    });

    const [categoryMode, setCategoryMode] = useState<CategoryMode>('existing');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryLevel, setNewCategoryLevel] = useState<CategoryLevel>('empresa');
    const [newCategorySublevel, setNewCategorySublevel] = useState<PersonalSublevel>('otros');

    // Filter and sort categories alphabetically
    const filteredCategories = useMemo(() => {
        return categories
            .filter((c) => c.type === formData.type)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [categories, formData.type]);

    // Group categories by level for display
    const groupedCategories = useMemo(() => {
        const personal = filteredCategories.filter(c => c.level === 'personal');
        const empresa = filteredCategories.filter(c => c.level === 'empresa');
        return { personal, empresa };
    }, [filteredCategories]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.amount || formData.amount <= 0) {
            toast.error('Por favor, ingresa un monto válido');
            return;
        }

        let categoryId = formData.category_id;
        let categoryRef: Category | undefined;

        // Handle new category creation
        if (categoryMode === 'new') {
            if (!newCategoryName.trim()) {
                toast.error('Por favor, ingresa un nombre para la categoría');
                return;
            }

            // Check if category already exists
            const existingCat = categories.find(
                c => c.name.toLowerCase() === newCategoryName.toLowerCase() && c.type === formData.type
            );

            if (existingCat) {
                toast.error('Ya existe una categoría con ese nombre');
                return;
            }

            // Create new category with sublevel if personal
            const userId = user?.id || 'anonymous';
            const newCat: Category = {
                id: `cat-${Date.now()}`,
                name: newCategoryName.trim(),
                type: formData.type,
                level: newCategoryLevel,
                sublevel: newCategoryLevel === 'personal' ? newCategorySublevel : undefined,
                color: newCategoryLevel === 'personal' ? SUBLEVEL_COLORS[newCategorySublevel] : undefined,
                is_fixed: false,
                created_at: new Date().toISOString(),
                user_id: userId,
            };

            addCategory(newCat);
            syncCategory(newCat); // Sync to Supabase
            categoryId = newCat.id;
            categoryRef = newCat;
        } else {
            categoryRef = categories.find(c => c.id === formData.category_id);
        }

        // If installment, create multiple transactions
        if (formData.isInstallment && formData.totalInstallments && formData.totalInstallments > 1) {
            const baseDate = new Date(formData.date);
            const parentId = `tx-${Date.now()}`;
            const installmentAmount = formData.isEqualInstallments
                ? formData.amount / formData.totalInstallments
                : formData.amount;
            const userId = user?.id || 'anonymous';

            for (let i = 0; i < formData.totalInstallments; i++) {
                const installmentDate = new Date(baseDate);
                installmentDate.setMonth(installmentDate.getMonth() + i);

                const transaction = {
                    id: i === 0 ? parentId : `tx-${Date.now()}-${i}`,
                    date: installmentDate.toISOString().split('T')[0],
                    amount: installmentAmount,
                    description: `${newCategoryName || categoryRef?.name || formData.description} (${i + 1}/${formData.totalInstallments})`,
                    category_id: categoryId,
                    type: formData.type,
                    status: formData.status,
                    paymentStatus: i === 0 ? formData.paymentStatus : 'pending' as PaymentStatus,
                    origin: formData.origin,
                    installment: {
                        isInstallment: true,
                        totalInstallments: formData.totalInstallments,
                        currentInstallment: i + 1,
                        installmentAmount,
                        isEqualInstallments: formData.isEqualInstallments,
                        parentTransactionId: parentId,
                    },
                    currency_code: formData.currency_code,
                    exchange_rate: formData.exchange_rate,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    user_id: userId,
                    category: categoryRef,
                };

                addTransaction(transaction);
                syncTransaction(transaction); // Sync to Supabase
            }
        } else {
            // Single transaction
            const userId = user?.id || 'anonymous';
            const newTransaction = {
                id: `tx-${Date.now()}`,
                date: formData.date,
                amount: formData.amount,
                description: categoryMode === 'new' ? newCategoryName.trim() : (formData.description || categoryRef?.name || null),
                category_id: categoryId,
                type: formData.type,
                status: formData.status,
                paymentStatus: formData.paymentStatus,
                origin: formData.origin,
                currency_code: formData.currency_code,
                exchange_rate: formData.exchange_rate,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                user_id: userId,
                category: categoryRef,
            };

            addTransaction(newTransaction);
            syncTransaction(newTransaction); // Sync to Supabase
        }

        // Reset form
        setFormData({
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            description: '',
            category_id: '',
            type: 'expense',
            status: 'projected',
            paymentStatus: 'pending',
            origin: 'business',
            currency_code: 'CLP',
            exchange_rate: 1,
            isInstallment: false,
            totalInstallments: 1,
            isEqualInstallments: true,
        });
        setCategoryMode('existing');
        setNewCategoryName('');
        setNewCategoryLevel('empresa');
        setNewCategorySublevel('otros');
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nuevo Movimiento
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Agregar Movimiento</DialogTitle>
                    <DialogDescription>
                        Registra un nuevo ingreso o gasto.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    {/* Type Toggle */}
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={formData.type === 'expense' ? 'default' : 'outline'}
                            className="flex-1"
                            onClick={() => {
                                setFormData({ ...formData, type: 'expense', category_id: '' });
                                setCategoryMode('existing');
                            }}
                        >
                            Gasto
                        </Button>
                        <Button
                            type="button"
                            variant={formData.type === 'income' ? 'default' : 'outline'}
                            className="flex-1"
                            onClick={() => {
                                setFormData({ ...formData, type: 'income', category_id: '' });
                                setCategoryMode('existing');
                            }}
                        >
                            Ingreso
                        </Button>
                    </div>

                    {/* Amount & Currency */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Monto</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                    {formData.currency_code === 'USD' ? 'US$' : '$'}
                                </span>
                                <Input
                                    id="amount"
                                    type="number"
                                    placeholder="0"
                                    className="pl-9 font-mono-numbers text-lg"
                                    value={formData.amount || ''}
                                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Moneda</Label>
                            <div className="flex gap-2">
                                <Select
                                    value={formData.currency_code}
                                    onValueChange={(val) => setFormData({
                                        ...formData,
                                        currency_code: val,
                                        exchange_rate: val === 'CLP' ? 1 : formData.exchange_rate
                                    })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CLP">CLP (Peso)</SelectItem>
                                        <SelectItem value="USD">USD (Dólar)</SelectItem>
                                        <SelectItem value="UF">UF (Unidad)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Exchange Rate (only if not CLP) */}
                    {formData.currency_code !== 'CLP' && (
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
                            <Label htmlFor="exchange_rate" className="text-xs text-blue-800">
                                Tasa de Cambio ({formData.currency_code} → CLP)
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="exchange_rate"
                                    type="number"
                                    placeholder="Ej. 950"
                                    value={formData.exchange_rate}
                                    onChange={(e) => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) || 1 })}
                                    className="h-8 bg-white"
                                />
                                <span className="text-xs text-blue-600 font-medium whitespace-nowrap">
                                    Total: ${(formData.amount * formData.exchange_rate).toLocaleString()} CLP
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Category Selection Mode */}
                    <div className="space-y-3">
                        <Label>Categoría</Label>
                        <RadioGroup
                            value={categoryMode}
                            onValueChange={(value: CategoryMode) => {
                                setCategoryMode(value);
                                if (value === 'new') {
                                    setFormData({ ...formData, category_id: '' });
                                }
                            }}
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="existing" id="existing" />
                                <Label htmlFor="existing" className="cursor-pointer text-sm">Existente</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="new" id="new" />
                                <Label htmlFor="new" className="cursor-pointer text-sm">Nueva</Label>
                            </div>
                        </RadioGroup>

                        {categoryMode === 'existing' ? (
                            filteredCategories.length > 0 ? (
                                <Select
                                    value={formData.category_id}
                                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Seleccionar categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {groupedCategories.personal.length > 0 && (
                                            <>
                                                <div className="px-2 py-1.5 text-xs font-semibold text-purple-600 flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    Personal
                                                </div>
                                                {groupedCategories.personal.map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.id}>
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="w-2 h-2 rounded-full"
                                                                style={{ backgroundColor: cat.color || SUBLEVEL_COLORS[cat.sublevel || 'otros'] }}
                                                            />
                                                            <span className="text-sm">{cat.name}</span>
                                                            {cat.sublevel && (
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    ({SUBLEVEL_LABELS[cat.sublevel]})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </>
                                        )}
                                        {groupedCategories.empresa.length > 0 && (
                                            <>
                                                <div className="px-2 py-1.5 text-xs font-semibold text-blue-600 flex items-center gap-1 mt-1">
                                                    <Building2 className="h-3 w-3" />
                                                    Empresa
                                                </div>
                                                {groupedCategories.empresa.map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.id}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                            <span className="text-sm">{cat.name}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-sm text-muted-foreground py-2">
                                    No hay categorías. Crea una nueva.
                                </p>
                            )
                        ) : (
                            <div className="space-y-3">
                                <Input
                                    placeholder="Nombre de la categoría"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="h-9"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={newCategoryLevel === 'personal' ? 'default' : 'outline'}
                                        size="sm"
                                        className="flex-1 gap-1"
                                        onClick={() => setNewCategoryLevel('personal')}
                                    >
                                        <User className="h-3 w-3" />
                                        Personal
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={newCategoryLevel === 'empresa' ? 'default' : 'outline'}
                                        size="sm"
                                        className="flex-1 gap-1"
                                        onClick={() => setNewCategoryLevel('empresa')}
                                    >
                                        <Building2 className="h-3 w-3" />
                                        Empresa
                                    </Button>
                                </div>

                                {/* Sublevel selection for Personal */}
                                {newCategoryLevel === 'personal' && (
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Subnivel Personal</Label>
                                        <div className="grid grid-cols-5 gap-1">
                                            {(Object.keys(SUBLEVEL_LABELS) as PersonalSublevel[]).map((sublevel) => (
                                                <Button
                                                    key={sublevel}
                                                    type="button"
                                                    variant={newCategorySublevel === sublevel ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="text-xs px-2"
                                                    style={{
                                                        backgroundColor: newCategorySublevel === sublevel ? SUBLEVEL_COLORS[sublevel] : undefined,
                                                        borderColor: SUBLEVEL_COLORS[sublevel],
                                                    }}
                                                    onClick={() => setNewCategorySublevel(sublevel)}
                                                >
                                                    {SUBLEVEL_LABELS[sublevel]}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <Label htmlFor="date">Fecha</Label>
                        <Input
                            id="date"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="h-9"
                        />
                    </div>

                    {/* Installments (only for expenses) */}
                    {formData.type === 'expense' && (
                        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="isInstallment"
                                    checked={formData.isInstallment}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, isInstallment: checked as boolean })
                                    }
                                />
                                <Label htmlFor="isInstallment" className="text-sm cursor-pointer flex items-center gap-1">
                                    <CreditCard className="h-3.5 w-3.5" />
                                    Pago en cuotas
                                </Label>
                            </div>

                            {formData.isInstallment && (
                                <div className="space-y-3 pl-6">
                                    <div className="flex items-center gap-3">
                                        <Label className="text-sm whitespace-nowrap">N° de cuotas:</Label>
                                        <Input
                                            type="number"
                                            min="2"
                                            max="48"
                                            value={formData.totalInstallments || 2}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                totalInstallments: parseInt(e.target.value) || 2
                                            })}
                                            className="w-20 h-8"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="equalInstallments"
                                            checked={formData.isEqualInstallments}
                                            onCheckedChange={(checked) =>
                                                setFormData({ ...formData, isEqualInstallments: checked as boolean })
                                            }
                                        />
                                        <Label htmlFor="equalInstallments" className="text-sm cursor-pointer">
                                            Cuotas iguales
                                        </Label>
                                    </div>
                                    {formData.isEqualInstallments && formData.totalInstallments && formData.totalInstallments > 1 && formData.amount > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            Cada cuota: ${(formData.amount / formData.totalInstallments).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Payment Status & Confirmation */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between space-x-2 bg-muted p-3 rounded-lg">
                            <Label htmlFor="paymentStatus" className="text-sm cursor-pointer flex items-center gap-1">
                                {formData.paymentStatus === 'confirmed' ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                                )}
                                {formData.paymentStatus === 'confirmed' ? 'Confirmado' : 'Por confirmar'}
                            </Label>
                            <Switch
                                id="paymentStatus"
                                checked={formData.paymentStatus === 'confirmed'}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, paymentStatus: checked ? 'confirmed' : 'pending' })
                                }
                            />
                        </div>

                        <div className="flex items-center gap-2 text-sm p-3 bg-muted rounded-lg justify-center">
                            <Badge variant={formData.paymentStatus === 'pending' ? 'secondary' : 'default'} className="gap-1">
                                {formData.paymentStatus === 'confirmed' ? (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                        Confirmado
                                    </>
                                ) : (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                        Pendiente
                                    </>
                                )}
                            </Badge>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit">Guardar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

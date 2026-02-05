import { useState } from 'react';
import { useSimulationStore } from '@/stores/useSimulationStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Play, Sparkles, X } from 'lucide-react';
import { SimulationCard } from './SimulationCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SimulationSidebar() {
    const {
        isSimulationMode,
        stopSimulation,
        addVariable,
        variables,
        applyToReality
    } = useSimulationStore();

    // Form State for new variable
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newType, setNewType] = useState<'new_expense' | 'new_income'>('new_expense');
    const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);

    if (!isSimulationMode) return null;

    const handleAdd = () => {
        if (!newName || !newAmount) return;

        addVariable({
            type: newType,
            name: newName,
            amount: Number(newAmount),
            date: newDate
            // active is auto-set by store
        });

        // Reset form
        setNewName('');
        setNewAmount('');
        setIsAdding(false);
    };

    return (
        <div className="fixed right-0 top-0 h-screen w-[350px] bg-background border-l shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        <h2 className="font-bold text-indigo-900">Modo Simulación</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={stopSimulation}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                <p className="text-xs text-indigo-700 leading-snug">
                    Estás en un entorno seguro. Nada de lo que hagas aquí afecta tu contabilidad real hasta que lo apliques.
                </p>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {variables.length === 0 && !isAdding && (
                    <div className="text-center py-10 text-muted-foreground">
                        <p className="mb-2">No hay variables activas.</p>
                        <p className="text-xs">Agrega un gasto o ingreso hipotético para ver cómo afecta tu futuro.</p>
                    </div>
                )}

                {variables.map(variable => (
                    <SimulationCard key={variable.id} variable={variable} />
                ))}

                {isAdding ? (
                    <div className="border rounded-lg p-3 bg-gray-50 space-y-3 animate-in fade-in zoom-in-95">
                        <h4 className="font-medium text-sm">Nueva Variable</h4>

                        <div className="space-y-1">
                            <Label className="text-xs">Tipo</Label>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={newType === 'new_expense' ? 'destructive' : 'outline'}
                                    className="flex-1 text-xs h-7"
                                    onClick={() => setNewType('new_expense')}
                                >
                                    Gasto
                                </Button>
                                <Button
                                    size="sm"
                                    variant={newType === 'new_income' ? 'default' : 'outline'}
                                    className={newType === 'new_income' ? 'bg-emerald-600 hover:bg-emerald-700 flex-1 text-xs h-7' : 'flex-1 text-xs h-7'}
                                    onClick={() => setNewType('new_income')}
                                >
                                    Ingreso
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">Nombre</Label>
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Ej. Contratar Senior"
                                className="h-8 text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">Monto Estimado</Label>
                            <Input
                                type="number"
                                value={newAmount}
                                onChange={(e) => setNewAmount(e.target.value)}
                                placeholder="0"
                                className="h-8 text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">Fecha Efectiva</Label>
                            <Input
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button size="sm" variant="ghost" className="flex-1 h-8" onClick={() => setIsAdding(false)}>
                                Cancelar
                            </Button>
                            <Button size="sm" className="flex-1 h-8" onClick={handleAdd}>
                                Agregar
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        className="w-full border-dashed border-2 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={() => setIsAdding(true)}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Escenario
                    </Button>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t bg-gray-50 space-y-2">
                <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => applyToReality()}
                    disabled={variables.length === 0}
                >
                    <Play className="w-4 h-4 mr-2" />
                    Aplicar a Realidad
                </Button>
                <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={stopSimulation}>
                    Solo estaba probando (Salir)
                </Button>
            </div>
        </div>
    );
}

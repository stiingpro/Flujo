import { SimulationVariable, useSimulationStore } from '@/stores/useSimulationStore';
import { Card, CardContent } from '@/components/ui/card'; // Check if this exists, likely shadcn
import { Button } from '@/components/ui/button';
import { Trash2, ToggleLeft, ToggleRight, DollarSign, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

interface SimulationCardProps {
    variable: SimulationVariable;
}

export function SimulationCard({ variable }: SimulationCardProps) {
    const { removeVariable, toggleVariable } = useSimulationStore();

    const isExpense = variable.type === 'new_expense';

    return (
        <div className={cn(
            "rounded-lg border p-3 shadow-sm transition-all",
            variable.active ? "bg-card opacity-100" : "bg-muted/50 opacity-70 grayscale"
        )}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "p-1.5 rounded-full",
                        isExpense ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                    )}>
                        <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="font-medium text-sm leading-tight">{variable.name}</h4>
                        <span className="text-xs text-muted-foreground capitalize">
                            {isExpense ? 'Gasto Nuevo' : 'Ingreso Nuevo'}
                        </span>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeVariable(variable.id)}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>

            <div className="flex justify-between items-end">
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{variable.date}</span>
                    </div>
                    <div className={cn(
                        "font-bold text-lg",
                        isExpense ? "text-red-600" : "text-emerald-600"
                    )}>
                        {isExpense ? '-' : '+'}{formatCurrency(variable.amount || 0)}
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => toggleVariable(variable.id)}
                >
                    {variable.active ? 'Activo' : 'Pausado'}
                </Button>
            </div>
        </div>
    );
}

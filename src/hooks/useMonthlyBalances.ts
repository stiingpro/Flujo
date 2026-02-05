import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MonthlyBalance } from '@/types';
import { useProjectData } from './useProjectData';
import { calculateMonthlyData } from '@/lib/financialCalculations';

export function useMonthlyBalances() {
    const [balances, setBalances] = useState<MonthlyBalance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Switch to useProjectData which handles real vs simulated tx sources
    const { transactions, isSimulationMode, filters } = useProjectData();

    useEffect(() => {
        const fetchOrCalculateBalances = async () => {
            setIsLoading(true);
            try {
                if (isSimulationMode) {
                    // CLIENT-SIDE CALCULATION FOR SIMULATION
                    // We reuse the central logic from financialCalculations
                    // and map it to the MonthlyBalance shape expected by Dashboard
                    const calculatedData = calculateMonthlyData(transactions, filters); // filters might be needed or passed globally

                    // We need ALL months, calculateMonthlyData return 12 months for current year normally.
                    // But MonthlyBalance usually implies "historical data".
                    // calculateMonthlyData as written restricts to ONE year based on filter.
                    // To do this right for "Burn Rate" (historical), we need data across years.

                    // QUICK FIX: For simulation, we only care about the ACTIVE year usually, 
                    // BUT Burn Rate looks at past 3 months (which might cross years).
                    // If calculateMonthlyData filters by year, we can't see prev year December in Jan.

                    // Let's create a specialized calculator or just map ALL transactions here if array is small.
                    // Assuming transactions has everything.

                    const balancesMap = new Map<string, MonthlyBalance>();

                    transactions.forEach(t => {
                        const date = new Date(t.date);
                        const year = date.getFullYear();
                        const month = date.getMonth() + 1; // 1-12
                        const key = `${year}-${month}`;

                        if (!balancesMap.has(key)) {
                            balancesMap.set(key, {
                                year,
                                month,
                                total_income: 0,
                                total_expense: 0,
                                net_flow: 0,
                                cumulative_utility: 0, // We'll calc this after
                                user_id: 'simulation-user'
                            });
                        }

                        const b = balancesMap.get(key)!;
                        if (t.type === 'income') b.total_income += t.amount;
                        if (t.type === 'expense') b.total_expense += t.amount;
                        b.net_flow = b.total_income - b.total_expense;
                    });

                    const sortedBalances = Array.from(balancesMap.values()).sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month));

                    // Calc Cumulative
                    let runningTotal = 0;
                    const finalBalances = sortedBalances.map(b => {
                        runningTotal += b.net_flow;
                        return { ...b, cumulative_utility: runningTotal };
                    });

                    // In simulation, instant result
                    setBalances(finalBalances);

                } else {
                    // STANDARD DB FETCH
                    const { data, error } = await supabase
                        .from('monthly_balances')
                        .select('*')
                        .order('year', { ascending: true })
                        .order('month', { ascending: true });

                    if (error) throw error;
                    setBalances(data || []);
                }
            } catch (err: any) {
                console.error('Error getting monthly balances:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrCalculateBalances();

    }, [transactions.length, isSimulationMode, filters.year]); // Re-run if tx count changes or mode flips

    return { balances, isLoading, error };
}


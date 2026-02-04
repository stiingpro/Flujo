import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MonthlyBalance } from '@/types';
import { useFinanceStore } from '@/stores/useFinanceStore';

export function useMonthlyBalances() {
    const [balances, setBalances] = useState<MonthlyBalance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { transactions } = useFinanceStore(); // Dependency to refetch on transaction changes

    useEffect(() => {
        const fetchBalances = async () => {
            try {
                setIsLoading(true);
                const { data, error } = await supabase
                    .from('monthly_balances')
                    .select('*')
                    .order('year', { ascending: true })
                    .order('month', { ascending: true });

                if (error) throw error;
                setBalances(data || []);
            } catch (err: any) {
                console.error('Error fetching monthly balances:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBalances();

        // Optional: Real-time subscription might not work on Views directly unless specified.
        // For now, relies on 'transactions' store changes to trigger re-fetch if we add it as dep,
        // but 'transactions' is large. Better to just fetch on mount or when specific actions happen.
        // Added 'transactions' length as a crude dependency if available from store to auto-refresh.
    }, [transactions.length]);

    return { balances, isLoading, error };
}

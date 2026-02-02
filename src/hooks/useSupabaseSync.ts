'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useFinanceStore } from '@/stores/useFinanceStore';
import {
    syncAllData,
    bulkUpsertTransactions,
    bulkUpsertCategories,
    upsertTransaction,
    upsertCategory,
    deleteTransaction as dbDeleteTransaction,
    deleteCategory as dbDeleteCategory,
} from '@/lib/database';
import { Transaction, Category } from '@/types';
import { toast } from 'sonner';

export function useSupabaseSync() {
    const { user } = useAuth();
    const {
        transactions,
        categories,
        setTransactions,
        setCategories,
        setLoading,
        setError,
    } = useFinanceStore();

    const isInitialLoadDone = useRef(false);
    const isSyncing = useRef(false);

    // Load data from Supabase on initial mount
    const loadFromSupabase = useCallback(async () => {
        if (!user || isInitialLoadDone.current || isSyncing.current) return;

        isSyncing.current = true;
        setLoading(true);

        try {
            const data = await syncAllData(user.id);
            setCategories(data.categories);
            setTransactions(data.transactions);
            isInitialLoadDone.current = true;
        } catch (error: any) {
            console.error('Error loading data from Supabase:', error);
            setError(error.message || 'Error al cargar datos');
            // Don't show error toast on initial load - might just be empty database
        } finally {
            setLoading(false);
            isSyncing.current = false;
        }
    }, [user, setTransactions, setCategories, setLoading, setError]);

    // Sync a single transaction to Supabase
    const syncTransaction = useCallback(async (transaction: Transaction) => {
        if (!user) return;

        try {
            await upsertTransaction({ ...transaction, user_id: user.id });
        } catch (error: any) {
            console.error('Error syncing transaction:', error);
            toast.error('Error al sincronizar transacción');
        }
    }, [user]);

    // Sync a single category to Supabase
    const syncCategory = useCallback(async (category: Category) => {
        if (!user) return;

        try {
            await upsertCategory({ ...category, user_id: user.id });
        } catch (error: any) {
            console.error('Error syncing category:', error);
            toast.error('Error al sincronizar categoría');
        }
    }, [user]);

    // Delete transaction from Supabase
    const removeTransaction = useCallback(async (transactionId: string) => {
        if (!user) return;

        try {
            await dbDeleteTransaction(transactionId);
        } catch (error: any) {
            console.error('Error deleting transaction:', error);
            toast.error('Error al eliminar transacción');
        }
    }, [user]);

    // Delete category from Supabase
    const removeCategory = useCallback(async (categoryId: string) => {
        if (!user) return;

        try {
            await dbDeleteCategory(categoryId);
        } catch (error: any) {
            console.error('Error deleting category:', error);
            toast.error('Error al eliminar categoría');
        }
    }, [user]);

    // Sync all current data to Supabase (useful after import)
    const syncAllToSupabase = useCallback(async () => {
        if (!user || isSyncing.current) return;

        isSyncing.current = true;

        try {
            // Add user_id to all categories and transactions
            const categoriesWithUserId = categories.map(c => ({ ...c, user_id: user.id }));
            const transactionsWithUserId = transactions.map(t => ({ ...t, user_id: user.id }));

            await Promise.all([
                bulkUpsertCategories(categoriesWithUserId),
                bulkUpsertTransactions(transactionsWithUserId),
            ]);

            toast.success('Datos sincronizados');
        } catch (error: any) {
            console.error('Error syncing all data:', error);
            toast.error('Error al sincronizar datos');
        } finally {
            isSyncing.current = false;
        }
    }, [user, transactions, categories]);

    // Effect to load data when user logs in
    useEffect(() => {
        if (user && !isInitialLoadDone.current) {
            loadFromSupabase();
        }

        // Reset when user logs out
        if (!user) {
            isInitialLoadDone.current = false;
        }
    }, [user, loadFromSupabase]);

    return {
        loadFromSupabase,
        syncTransaction,
        syncCategory,
        removeTransaction,
        removeCategory,
        syncAllToSupabase,
        isInitialLoadDone: isInitialLoadDone.current,
    };
}

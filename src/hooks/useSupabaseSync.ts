'use client';

import { useEffect, useCallback, useState } from 'react';
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

    // Track if we've loaded data for the current user
    const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Load data from Supabase on initial mount or when user changes
    const loadFromSupabase = useCallback(async () => {
        if (!user) {
            console.log('[Sync] No user, skipping load');
            return;
        }

        console.log('[Sync] Loading data for user:', user.id);
        setLoading(true);

        try {
            const data = await syncAllData(user.id);
            console.log('[Sync] Loaded from Supabase:', {
                categories: data.categories.length,
                transactions: data.transactions.length
            });

            setCategories(data.categories);
            setTransactions(data.transactions);
            setLoadedForUserId(user.id);

            if (data.transactions.length > 0 || data.categories.length > 0) {
                console.log('[Sync] Data loaded successfully');
            } else {
                console.log('[Sync] No existing data found in Supabase');
            }
        } catch (error: any) {
            console.error('[Sync] Error loading data from Supabase:', error);
            setError(error.message || 'Error al cargar datos');
            toast.error('Error al cargar datos: ' + (error.message || 'Error desconocido'));
        } finally {
            setLoading(false);
        }
    }, [user, setTransactions, setCategories, setLoading, setError]);

    // Sync a single transaction to Supabase
    const syncTransaction = useCallback(async (transaction: Transaction) => {
        if (!user) {
            console.log('[Sync] No user, skipping transaction sync');
            return;
        }

        try {
            console.log('[Sync] Syncing single transaction:', transaction.id);
            await upsertTransaction({ ...transaction, user_id: user.id });
            console.log('[Sync] Transaction synced successfully');
        } catch (error: any) {
            console.error('[Sync] Error syncing transaction:', error);
            toast.error('Error al sincronizar transacción');
        }
    }, [user]);

    // Sync a single category to Supabase
    const syncCategory = useCallback(async (category: Category) => {
        if (!user) {
            console.log('[Sync] No user, skipping category sync');
            return;
        }

        try {
            console.log('[Sync] Syncing single category:', category.id);
            await upsertCategory({ ...category, user_id: user.id });
            console.log('[Sync] Category synced successfully');
        } catch (error: any) {
            console.error('[Sync] Error syncing category:', error);
            toast.error('Error al sincronizar categoría');
        }
    }, [user]);

    // Delete transaction from Supabase
    const removeTransaction = useCallback(async (transactionId: string) => {
        if (!user) return;

        try {
            await dbDeleteTransaction(transactionId);
        } catch (error: any) {
            console.error('[Sync] Error deleting transaction:', error);
            toast.error('Error al eliminar transacción');
        }
    }, [user]);

    // Delete category from Supabase
    const removeCategory = useCallback(async (categoryId: string) => {
        if (!user) return;

        try {
            await dbDeleteCategory(categoryId);
        } catch (error: any) {
            console.error('[Sync] Error deleting category:', error);
            toast.error('Error al eliminar categoría');
        }
    }, [user]);

    // Sync all current data to Supabase (useful after import)
    // Pass newTransactions and newCategories directly to avoid stale closure data
    const syncAllToSupabase = useCallback(async (newTransactions?: Transaction[], newCategories?: Category[]) => {
        if (!user) {
            console.log('[Sync] No user, skipping sync all');
            return;
        }

        if (isSyncing) {
            console.log('[Sync] Already syncing, skipping');
            return;
        }

        setIsSyncing(true);

        try {
            // Use passed data or fall back to store data
            const transactionsToSync = newTransactions || transactions;
            const categoriesToSync = newCategories || categories;

            // Add user_id to all categories and transactions
            const categoriesWithUserId = categoriesToSync.map(c => ({ ...c, user_id: user.id }));
            const transactionsWithUserId = transactionsToSync.map(t => ({ ...t, user_id: user.id }));

            console.log('[Sync] Syncing to Supabase:', {
                categories: categoriesWithUserId.length,
                transactions: transactionsWithUserId.length,
                userId: user.id
            });

            // Sync categories first (transactions may depend on them)
            await bulkUpsertCategories(categoriesWithUserId);
            await bulkUpsertTransactions(transactionsWithUserId);

            console.log('[Sync] Datos sincronizados correctamente');
        } catch (error: any) {
            console.error('[Sync] Error syncing all data:', error);
            toast.error('Error al sincronizar datos: ' + (error.message || 'Error desconocido'));
        } finally {
            setIsSyncing(false);
        }
    }, [user, transactions, categories, isSyncing]);

    // Effect to load data when user logs in or changes
    useEffect(() => {
        // Only load if we have a user and haven't loaded for this user yet
        if (user && loadedForUserId !== user.id) {
            console.log('[Sync] User changed or new login, loading data...');
            loadFromSupabase();
        }

        // Reset loaded state when user logs out
        if (!user && loadedForUserId) {
            console.log('[Sync] User logged out, resetting state');
            setLoadedForUserId(null);
        }
    }, [user, loadedForUserId, loadFromSupabase]);

    return {
        loadFromSupabase,
        syncTransaction,
        syncCategory,
        removeTransaction,
        removeCategory,
        syncAllToSupabase,
        isLoaded: loadedForUserId === user?.id,
        isSyncing,
    };
}

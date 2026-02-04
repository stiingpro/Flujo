'use client';

import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFeatureMode } from '@/context/FeatureModeContext';
import { useAuth } from '@/providers/AuthProvider';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { useHistory } from '@/providers/HistoryProvider';
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
    const { isPro } = useFeatureMode();
    const {
        transactions,
        categories,
        setTransactions,
        setCategories,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        setProfile,
        setLoading,
        setError,
    } = useFinanceStore();
    // Track if we've loaded data for the current user

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

            // Load Profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileData) {
                setProfile(profileData);
            } else if (profileError && profileError.code !== 'PGRST116') {
                console.warn('[Sync] Error loading profile:', profileError);
            }

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

    // FEATURE TOGGLE: Month Lock (Pro Mode)
    const validateMonthLock = useCallback((dateStr: string) => {
        if (!isPro) return true; // Standard mode allows everything

        const txDate = new Date(dateStr);
        const now = new Date();

        // Simple logic: If transaction is from previous month or older, it's locked.
        // Current month: allowed.
        // E.g. Now is Feb 2026. Jan 2026 is locked.

        // Normalize to YYYY-MM for comparison
        const txMonth = txDate.getFullYear() * 12 + txDate.getMonth();
        const currentMonth = now.getFullYear() * 12 + now.getMonth();

        if (txMonth < currentMonth) {
            toast.error('🚫 Mes Cerrado (Modo PRO)', {
                description: 'No se pueden modificar registros de meses anteriores en versión Pro.'
            });
            return false;
        }
        return true;
    }, [isPro]);

    // Sync a single transaction to Supabase
    const syncTransaction = useCallback(async (transaction: Transaction) => {
        if (!user) {
            console.log('[Sync] No user, skipping transaction sync');
            return;
        }

        // Validate Lock
        if (!validateMonthLock(transaction.date)) return;

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
    const removeTransaction = useCallback(async (id: string) => {
        if (!user) return;

        // Look up transaction in store to check date for locking
        const { transactions } = useFinanceStore.getState();
        const tx = transactions.find(t => t.id === id);

        if (tx && !validateMonthLock(tx.date)) return;

        try {
            await dbDeleteTransaction(id);
        } catch (error: any) {
            console.error('[Sync] Error deleting transaction:', error);
            toast.error('Error al eliminar transacción');
        }
    }, [user]);

    // Delete category by NAME (Aggressive RPC)
    const removeCategoryByName = useCallback(async (name: string): Promise<boolean> => {
        if (!user) return false;

        try {
            console.log('[Sync] Removing category by NAME via RPC:', name);

            // RPC call to delete all with this name
            // Requires 'delete_category_by_name' function in DB
            const { data: deletedCount, error } = await supabase
                .rpc('delete_category_by_name', { category_name: name });

            if (error) {
                // If RPC missing, try regular delete (best effort, though likely fails if RLS issue)
                if (error.message?.includes('does not exist')) {
                    console.warn('[Sync] RPC missing. Fallback not possible for name delete without ID.');
                    toast.error('Error: Falta la función de base de datos. Ejecuta el script SQL.');
                    return false;
                }
                throw error;
            }

            console.log('[Sync] Deleted count:', deletedCount);

            if (deletedCount === 0) {
                toast.warning(`No se encontraron categorías llamadas "${name}" en la base de datos.`);
                // Check if it exists locally but not in DB?
                return true; // Assume success (already gone)
            } else {
                if (deletedCount > 1) {
                    // toast.success(`Se eliminaron ${deletedCount} copias de "${name}".`);
                    console.log(`[Sync] Se eliminaron ${deletedCount} copias de "${name}".`);
                }
                return true;
            }
        } catch (error: any) {
            console.error('[Sync] Error deleting by name:', error);
            toast.error('Error al borrar: ' + error.message);
            return false;
        } finally {
            // ALWAYS refresh source of truth
            await loadFromSupabase();
        }
    }, [user, loadFromSupabase]);

    // Delete category from Supabase (Legacy/ID based - kept for reference but UI likely uses Name now)
    const removeCategory = useCallback(async (categoryId: string): Promise<boolean> => {
        if (!user) {
            console.error('[Sync] Cannot delete category: No user logged in');
            return false;
        }

        try {
            console.log('[Sync] Removing category via RPC (The Sledgehammer):', categoryId);

            // 1. Perform Delete via RPC
            // This bypasses RLS issues by running as SECURITY DEFINER on the server
            const { data: deletedCount, error } = await supabase
                .rpc('delete_own_category', { target_category_id: categoryId });

            if (error) throw error;

            if (deletedCount === 0) {
                // Paranoid check: Did it exist in the first place?
                console.warn('[Sync] RPC returned 0 deleted rows. Item might be already gone or owned by another user.');

                // Optional: Verify if it exists for ANY user (debug only)
                // const { data: checkData } = await supabase.from('categories').select('id').eq('id', categoryId).single();
                // if (checkData) console.error('[Sync] Item exists but RPC failed to delete it. Authorization mismatch?');

                // We return true anyway to clear local state, assuming it's unrecoverable/gone for this user.
                return true;
            } else {
                console.log('[Sync] Category Sledgehammered successfully. Rows affected:', deletedCount);
                return true;
            }
        } catch (error: any) {
            console.error('[Sync] Error deleting category (RPC):', error);

            // Fallback to standard delete if RPC not exists (during migration)
            if (error.message?.includes('function') && error.message?.includes('does not exist')) {
                console.warn('[Sync] RPC missing, falling back to standard delete...');
                const { error: stdError } = await supabase.from('categories').delete().eq('id', categoryId);
                if (!stdError) return true;
            }

            toast.error('Error al sincronizar borrado: ' + (error.message || 'Desconocido'));
            return false;
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
            console.log('[Sync] User logged out, clearing local data & resetting state');
            setLoadedForUserId(null);

            // AGGRESSIVE CLEANUP: Clear store to prevent stale data
            setCategories([]);
            setTransactions([]);
            // Verify cleared
            setTimeout(() => {
                console.log('[Sync] Data cleared. ready for next login.');
            }, 100);
        }
    }, [user, loadedForUserId, loadFromSupabase, setCategories, setTransactions]);

    // ... (rest of load logic) ...

    const { addToHistory } = useHistory();

    // Helper: Add Transaction & Sync to DB
    const addTransactionAndSync = useCallback(async (transaction: Transaction) => {
        if (!user) return;

        // 1. Optimistic Add (Store)
        addTransaction(transaction);

        // History: Undo = Delete it (Use Store Action for safety)
        addToHistory('Crear movimiento', async () => {
            // Optimistic Remove via Store Action (handles state properly)
            deleteTransaction(transaction.id);
            // DB Remove
            await dbDeleteTransaction(transaction.id);
        });

        try {
            // 2. DB Insert
            console.log('[Sync] Adding transaction to DB:', transaction.id);
            await upsertTransaction({ ...transaction, user_id: user.id });
        } catch (error) {
            console.error('[Sync] Error adding transaction:', error);
            toast.error('Error al crear movimiento.');
            // Rollback
            deleteTransaction(transaction.id);
        }
    }, [user, transactions, addTransaction, deleteTransaction, addToHistory]);

    // Helper: Update Transaction & Sync to DB
    const updateTransactionAndSync = useCallback(async (id: string, updates: Partial<Transaction>) => {
        if (!user) return;

        // 1. Optimistic Update (Store)
        const currentTx = transactions.find(t => t.id === id);
        if (!currentTx) return;

        const updatedTx = { ...currentTx, ...updates };

        // History: Undo = Revert to old values
        addToHistory('Editar movimiento', async () => {
            // Optimistic Revert via Store Action
            // We need to revert specific fields, or just spread the old object
            updateTransaction(id, currentTx);
            // DB Revert
            await upsertTransaction({ ...currentTx, user_id: user.id });
        });

        // Apply update
        updateTransaction(id, updatedTx);

        try {
            // 2. DB Update
            console.log('[Sync] Updating transaction in DB:', id);
            await upsertTransaction({ ...updatedTx, user_id: user.id });
            // Silent success
        } catch (error) {
            console.error('[Sync] Error updating transaction:', error);
            toast.error('Error al guardar cambio. Recarga la página.');
        }
    }, [user, transactions, updateTransaction, addToHistory]);

    // Helper: Delete Transaction & Sync to DB
    const deleteTransactionAndSync = useCallback(async (id: string) => {
        if (!user) return;

        const txToDelete = transactions.find(t => t.id === id);
        if (!txToDelete) return;

        // 1. Optimistic Delete (Store)
        deleteTransaction(id);

        // History: Undo = Restore it
        addToHistory('Eliminar movimiento', async () => {
            // Optimistic Restore via Store Action
            addTransaction(txToDelete);
            // DB Restore
            await upsertTransaction({ ...txToDelete, user_id: user.id });
        });

        try {
            // 2. DB Delete
            console.log('[Sync] Deleting transaction from DB:', id);
            await dbDeleteTransaction(id);
        } catch (error) {
            console.error('[Sync] Error deleting transaction:', error);
            toast.error('Error al borrar movimiento.');
        }
    }, [user, transactions, addTransaction, deleteTransaction, addToHistory]);

    return {
        loadFromSupabase,
        syncTransaction,
        syncCategory,
        removeTransaction,
        removeCategory,
        removeCategoryByName,
        syncAllToSupabase,
        addTransactionAndSync, // Export new helper
        updateTransactionAndSync, // Export new helper
        deleteTransactionAndSync, // Export new helper
        isLoaded: loadedForUserId === user?.id,
        isSyncing,
    };
}

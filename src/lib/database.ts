'use client';

import { supabase } from './supabase';
import { Transaction, Category } from '@/types';

// ============ CATEGORIES ============

export async function fetchCategories(userId: string): Promise<Category[]> {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('name');

    if (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }

    return data || [];
}

export async function upsertCategory(category: Category): Promise<Category> {
    const { data, error } = await supabase
        .from('categories')
        .upsert(category, { onConflict: 'id' })
        .select()
        .single();

    if (error) {
        console.error('Error upserting category:', error);
        throw error;
    }

    return data;
}

export async function deleteCategory(categoryId: string): Promise<void> {
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

    if (error) {
        console.error('Error deleting category:', error);
        throw error;
    }
}

export async function bulkUpsertCategories(categories: Category[]): Promise<void> {
    if (categories.length === 0) {
        console.log('bulkUpsertCategories: No categories to sync');
        return;
    }

    console.log('bulkUpsertCategories: Syncing', categories.length, 'categories');
    console.log('Sample category:', JSON.stringify(categories[0], null, 2));

    const { data, error } = await supabase
        .from('categories')
        .upsert(categories, { onConflict: 'id' })
        .select();

    if (error) {
        console.error('Error bulk upserting categories:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
    }

    console.log('bulkUpsertCategories: Successfully synced', data?.length || 0, 'categories');
}

// ============ TRANSACTIONS ============

export async function fetchTransactions(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
    }

    return data || [];
}

export async function upsertTransaction(transaction: Transaction): Promise<Transaction> {
    // Remove the category field before saving (it's a joined field)
    const { category, ...transactionData } = transaction;

    const { data, error } = await supabase
        .from('transactions')
        .upsert(transactionData, { onConflict: 'id' })
        .select()
        .single();

    if (error) {
        console.error('Error upserting transaction:', error);
        throw error;
    }

    return data;
}

export async function deleteTransaction(transactionId: string): Promise<void> {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

    if (error) {
        console.error('Error deleting transaction:', error);
        throw error;
    }
}

export async function bulkUpsertTransactions(transactions: Transaction[]): Promise<void> {
    if (transactions.length === 0) {
        console.log('bulkUpsertTransactions: No transactions to sync');
        return;
    }

    // Remove the category field from all transactions before saving
    const transactionsData = transactions.map(({ category, ...rest }) => rest);

    console.log('bulkUpsertTransactions: Syncing', transactionsData.length, 'transactions');
    console.log('Sample transaction:', JSON.stringify(transactionsData[0], null, 2));

    const { data, error } = await supabase
        .from('transactions')
        .upsert(transactionsData, { onConflict: 'id' })
        .select();

    if (error) {
        console.error('Error bulk upserting transactions:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
    }

    console.log('bulkUpsertTransactions: Successfully synced', data?.length || 0, 'transactions');
}

// ============ SYNC FUNCTIONS ============

export async function syncAllData(userId: string) {
    const [categories, transactions] = await Promise.all([
        fetchCategories(userId),
        fetchTransactions(userId),
    ]);

    return { categories, transactions };
}

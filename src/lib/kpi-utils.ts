import { Transaction } from '@/types';

export interface KPISet {
    income: number;
    expense: number;
    net: number;
}

export const calculateKPIs = (transactions: Transaction[]): KPISet => {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
        income,
        expense,
        net: income - expense
    };
};

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { Transaction, DashboardFilters, MONTH_NAMES } from '@/types';

// Register fonts if needed, heavily recommended for consistency
// For now relying on standard fonts

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#10B981', // Emerald 500
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827', // Gray 900
    },
    subtitle: {
        fontSize: 10,
        color: '#6B7280', // Gray 500
    },
    section: {
        margin: 10,
        padding: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#374151',
        backgroundColor: '#F3F4F6',
        padding: 5,
    },
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderColor: '#E5E7EB',
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row',
    },
    tableCol: {
        width: '25%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#E5E7EB',
    },
    tableColHeader: {
        width: '25%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
    },
    tableCell: {
        margin: 5,
        fontSize: 10,
    },
    tableCellHeader: {
        margin: 5,
        fontSize: 10,
        fontWeight: 'bold',
    },
    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    kpiCard: {
        width: '30%',
        padding: 10,
        backgroundColor: '#F9FAFB',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    kpiTitle: {
        fontSize: 10,
        color: '#6B7280',
        marginBottom: 4,
    },
    kpiValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    highlightPositive: {
        color: '#10B981',
    },
    highlightNegative: {
        color: '#EF4444',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        color: 'grey',
        fontSize: 8,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 10
    }
});

interface FinancialReportProps {
    transactions: Transaction[];
    filters: DashboardFilters;
    comparisonKpis?: {
        confirmed: { income: number; expense: number; net: number };
        projected: { income: number; expense: number; net: number };
    };
}

export const FinancialReportPDF = ({ transactions, filters, comparisonKpis }: FinancialReportProps) => {
    // Calculate Summary Data (Fallback if no comparison provided)
    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income');

    const totalIncome = income.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
    const netResult = totalIncome - totalExpenses;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Reporte Ejecutivo</Text>
                        <Text style={styles.subtitle}>Año Fiscal: {filters.year}</Text>
                    </View>
                    <View>
                        <Text style={styles.subtitle}>{new Date().toLocaleDateString('es-CL')}</Text>
                        <Text style={styles.subtitle}>Radar Financiero</Text>
                    </View>
                </View>

                {/* KPI Summary (Comparison or Single) */}
                {comparisonKpis ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Resumen Comparativo</Text>
                        <View style={styles.table}>
                            <View style={styles.tableRow}>
                                <View style={[styles.tableColHeader, { width: '40%' }]}><Text style={styles.tableCellHeader}>Indicador</Text></View>
                                <View style={[styles.tableColHeader, { width: '30%', backgroundColor: '#ECFDF5' }]}><Text style={[styles.tableCellHeader, { color: '#047857' }]}>Solo Confirmado</Text></View>
                                <View style={[styles.tableColHeader, { width: '30%', backgroundColor: '#EFF6FF' }]}><Text style={[styles.tableCellHeader, { color: '#1D4ED8' }]}>Proyectado + Real</Text></View>
                            </View>

                            {/* Income */}
                            <View style={styles.tableRow}>
                                <View style={[styles.tableCol, { width: '40%' }]}><Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Ingresos Totales</Text></View>
                                <View style={[styles.tableCol, { width: '30%' }]}><Text style={styles.tableCell}>{formatCurrency(comparisonKpis.confirmed.income)}</Text></View>
                                <View style={[styles.tableCol, { width: '30%' }]}><Text style={styles.tableCell}>{formatCurrency(comparisonKpis.projected.income)}</Text></View>
                            </View>

                            {/* Expense */}
                            <View style={styles.tableRow}>
                                <View style={[styles.tableCol, { width: '40%' }]}><Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Gastos Totales</Text></View>
                                <View style={[styles.tableCol, { width: '30%' }]}><Text style={styles.tableCell}>{formatCurrency(comparisonKpis.confirmed.expense)}</Text></View>
                                <View style={[styles.tableCol, { width: '30%' }]}><Text style={styles.tableCell}>{formatCurrency(comparisonKpis.projected.expense)}</Text></View>
                            </View>

                            {/* Net */}
                            <View style={styles.tableRow}>
                                <View style={[styles.tableCol, { width: '40%' }]}><Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Utilidad Neta</Text></View>
                                <View style={[styles.tableCol, { width: '30%' }]}><Text style={[styles.tableCell, { fontWeight: 'bold', color: comparisonKpis.confirmed.net >= 0 ? '#059669' : '#DC2626' }]}>{formatCurrency(comparisonKpis.confirmed.net)}</Text></View>
                                <View style={[styles.tableCol, { width: '30%' }]}><Text style={[styles.tableCell, { fontWeight: 'bold', color: comparisonKpis.projected.net >= 0 ? '#059669' : '#DC2626' }]}>{formatCurrency(comparisonKpis.projected.net)}</Text></View>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.section, styles.summaryGrid]}>
                        <View style={styles.kpiCard}>
                            <Text style={styles.kpiTitle}>Ingresos Totales</Text>
                            <Text style={[styles.kpiValue, styles.highlightPositive]}>{formatCurrency(totalIncome)}</Text>
                        </View>
                        <View style={styles.kpiCard}>
                            <Text style={styles.kpiTitle}>Gastos Totales</Text>
                            <Text style={[styles.kpiValue, styles.highlightNegative]}>{formatCurrency(totalExpenses)}</Text>
                        </View>
                        <View style={styles.kpiCard}>
                            <Text style={styles.kpiTitle}>Resultado Neto</Text>
                            <Text style={[styles.kpiValue, netResult >= 0 ? styles.highlightPositive : styles.highlightNegative]}>
                                {formatCurrency(netResult)}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Monthly Breakdown Table */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Evolución Mensual</Text>
                    <View style={styles.table}>
                        <View style={styles.tableRow}>
                            <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Mes</Text></View>
                            <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Ingresos</Text></View>
                            <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Gastos</Text></View>
                            <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Flujo Neto</Text></View>
                        </View>
                        {MONTH_NAMES.map((month, index) => {
                            const monthIncome = income.filter(t => new Date(t.date).getMonth() === index).reduce((a, b) => a + b.amount, 0);
                            const monthExpense = expenses.filter(t => new Date(t.date).getMonth() === index).reduce((a, b) => a + b.amount, 0);
                            const monthNet = monthIncome - monthExpense;

                            return (
                                <View style={styles.tableRow} key={month}>
                                    <View style={styles.tableCol}><Text style={styles.tableCell}>{month}</Text></View>
                                    <View style={styles.tableCol}><Text style={styles.tableCell}>{formatCurrency(monthIncome)}</Text></View>
                                    <View style={styles.tableCol}><Text style={styles.tableCell}>{formatCurrency(monthExpense)}</Text></View>
                                    <View style={styles.tableCol}>
                                        <Text style={[styles.tableCell, monthNet < 0 ? { color: '#EF4444' } : { color: '#10B981' }]}>
                                            {formatCurrency(monthNet)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Top Expenses Table (New to match Excel) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Top Categorías de Gasto</Text>
                    <View style={styles.table}>
                        <View style={styles.tableRow}>
                            <View style={[styles.tableColHeader, { width: '70%' }]}><Text style={styles.tableCellHeader}>Categoría</Text></View>
                            <View style={[styles.tableColHeader, { width: '30%' }]}><Text style={styles.tableCellHeader}>Monto</Text></View>
                        </View>
                        {Object.entries(expenses.reduce((acc, t) => {
                            const catName = t.category?.name || 'Sin Categoría';
                            acc[catName] = (acc[catName] || 0) + t.amount;
                            return acc;
                        }, {} as Record<string, number>))
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 5)
                            .map(([name, value]) => (
                                <View style={styles.tableRow} key={name}>
                                    <View style={[styles.tableCol, { width: '70%' }]}><Text style={styles.tableCell}>{name}</Text></View>
                                    <View style={[styles.tableCol, { width: '30%' }]}><Text style={styles.tableCell}>{formatCurrency(value)}</Text></View>
                                </View>
                            ))}
                    </View>
                </View>

                <Text style={styles.footer}>
                    Reporte confidencial generado automáticamente por Radar Financiero.
                </Text>
            </Page>
        </Document>
    );
};

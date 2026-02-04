'use client';

import { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getFilteredRowModel,
    flexRender,
    ColumnDef,
} from '@tanstack/react-table';
import { ImportedRow } from '@/lib/import-utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ImportPreviewTableProps {
    data: ImportedRow[];
}

export function ImportPreviewTable({ data }: ImportPreviewTableProps) {
    const columns = useMemo<ColumnDef<ImportedRow>[]>(() => [
        {
            header: 'Estado',
            accessorKey: 'isDuplicate',
            cell: ({ row }) => {
                const isDup = row.original.isDuplicate;
                return (
                    <Badge variant={isDup ? "outline" : "default"} className={cn(
                        "text-xs gap-1",
                        isDup ? "text-gray-500 border-gray-200 bg-gray-50" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200"
                    )}>
                        {isDup ? (
                            <>
                                <AlertCircle className="w-3 h-3" />
                                Duplicado
                            </>
                        ) : (
                            <>
                                <Check className="w-3 h-3" />
                                Nuevo
                            </>
                        )}
                    </Badge>
                );
            }
        },
        {
            header: 'Fecha',
            accessorKey: 'date',
            cell: ({ getValue }) => format(getValue() as Date, 'dd MMM yyyy', { locale: es }),
        },
        {
            header: 'Categoría',
            accessorKey: 'categoryName',
            cell: ({ getValue }) => <span className="font-medium text-gray-700">{getValue() as string}</span>,
        },
        {
            header: 'Tipo',
            accessorKey: 'type',
            cell: ({ getValue }) => {
                const type = getValue() as string;
                return (
                    <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded",
                        type === 'income' ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700"
                    )}>
                        {type === 'income' ? 'Ingreso' : 'Gasto'}
                    </span>
                );
            }
        },
        {
            header: 'Monto',
            accessorKey: 'amount',
            cell: ({ getValue }) => {
                const amount = getValue() as number;
                return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
            },
        },
    ], []);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    });

    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className={cn(
                                        row.original.isDuplicate && "bg-gray-50/50 opacity-60 grayscale-[0.5]"
                                    )}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No hay datos para mostrar.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between space-x-2 py-4">
                <div className="text-sm text-muted-foreground">
                    Mostrando {table.getRowModel().rows.length} de {data.length} registros.
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm font-medium">
                        Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

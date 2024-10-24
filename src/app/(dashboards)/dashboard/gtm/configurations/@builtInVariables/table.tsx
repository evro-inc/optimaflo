'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  VisibilityState,
  getSortedRowModel,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { hardRevalidateFeatureCache } from '@/src/utils/server';
import { ButtonDelete, ButtonLoad } from '@/src/components/client/Button/Button';
import { useCreateHookForm, useDeleteHook } from '@/src/hooks/useCRUD';
import { setSelectedRows } from '@/src/redux/tableSlice';
import { useDispatch } from 'react-redux';
import { useTransition } from 'react';
import { LimitReached } from '@/src/components/client/modals/limitReached';

import { BuiltInVariable } from '@/src/types/types';
import { deleteBuiltInVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variablesBuiltIn';
import Loading from './loading';
import TableLoading, { RefreshLoading } from '@/src/components/client/Utils/TableLoad';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  const { user } = useUser();
  const userId = user?.id as string;
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const dispatch = useDispatch();
  const [isCreatePending, startCreateTransition] = useTransition();
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isRefreshPending, startRefreshTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,

    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const selectedRowData = table.getSelectedRowModel().rows.reduce((acc, row) => {
    acc[row.id] = row.original;
    return acc;
  }, {});

  const handleCreateClick = useCreateHookForm(
    userId,
    'GTMBuiltInVariables',
    '/dashboard/gtm/wizards/built-in-variables/create'
  );

  const onCreateButtonClick = () => {
    startCreateTransition(async () => {
      await handleCreateClick().catch((error) => {
        throw new Error(error);
      });
    });
  };

  const getDisplayNames = (items) => items.map((item: BuiltInVariable) => item.name);
  const handleDelete = useDeleteHook(
    deleteBuiltInVariables,
    selectedRowData,
    table,
    getDisplayNames,
    'built-in variable'
  );

  const onDeleteButtonClick = () => {
    startDeleteTransition(async () => {
      await handleDelete().catch((error) => {
        throw new Error(error);
      });
    });
  };

  const refreshAllCache = () => {
    startRefreshTransition(async () => {
      try {
        toast.info('Updating our systems. This may take a minute or two to update on screen.', {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        const keys = [`gtm:builtInVariables:userId:${userId}`];
        await hardRevalidateFeatureCache(keys, '/dashboard/gtm/configurations', userId);
      } catch (error) {
        toast.error('Cache update failed. Try again or reload the page.');
      }
    });
  };

  dispatch(setSelectedRows(selectedRowData)); // Update the selected rows in Redux

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Built-In Variables</h2>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-2 sm:space-y-0 sm:space-x-2">
        <Input
          placeholder="Filter built-in variable names..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
          className="w-full sm:w-64"
        />

        <div className="flex space-x-2">
          <ButtonLoad onClick={refreshAllCache} text="Refresh" loading={isRefreshPending} />

          <ButtonLoad onClick={onCreateButtonClick} text="Create" loading={isCreatePending} />

          <ButtonDelete
            disabled={Object.keys(table.getState().rowSelection).length === 0}
            onDelete={onDeleteButtonClick}
            action={'Delete'}
            loading={isDeletePending}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Columns</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isRefreshPending || isDeletePending ? (
        <RefreshLoading /> // Loading indicator when transition is pending
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
      <LimitReached />
    </div>
  );
}

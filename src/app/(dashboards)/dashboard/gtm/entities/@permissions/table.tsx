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
import { revalidate } from '@/src/utils/server';
import { useDispatch } from 'react-redux';
import { ButtonDelete } from '@/src/components/client/Button/Button';
import { useCreateHookForm, useUpdateHookForm, useDeleteHook } from '@/src/hooks/useCRUD';

import { useTransition } from 'react';
import { setSelectedRows } from '@/src/redux/tableSlice';
import { LimitReached } from '@/src/components/client/modals/limitReached';

import { UserPermission } from '@/src/types/types';
import { DeletePermissions } from '@/src/lib/fetch/dashboard/actions/gtm/permissions';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  accounts: any;
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  const dispatch = useDispatch();

  const { user } = useUser();

  const userId = user?.id as string;

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [isUpdatePending, startUpdateTransition] = useTransition();
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isCreatePending, startCreateTransition] = useTransition();

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

  const refreshAllCache = async () => {
    toast.info('Updating our systems. This may take a minute or two to update on screen.', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });
    const keys = [`gtm:permissions:userId:${userId}`];
    await revalidate(keys, '/dashboard/gtm/entities', userId);
  };

  const selectedRowData = table.getSelectedRowModel().rows.reduce((acc, row) => {
    acc[row.id] = row.original;
    return acc;
  }, {});
  const rowSelectedCount = Object.keys(selectedRowData).length;

  const handleUpdateClick = useUpdateHookForm(
    userId,
    'GTMVersions',
    '/dashboard/gtm/wizards/permissions/update',
    rowSelectedCount
  );

  const handleCreateClick = useCreateHookForm(
    userId,
    'GTMPermissions',
    '/dashboard/gtm/wizards/permissions/create'
  );

  const onCreateButtonClick = () => {
    startCreateTransition(() => {
      handleCreateClick().catch((error) => {
        throw new Error(error);
      });
    });
  };

  const onUpdateButtonClick = () => {
    startUpdateTransition(() => {
      handleUpdateClick().catch((error) => {
        throw new Error(error);
      });
    });
  };

  const getDisplayNames = (items) => items.map((item: UserPermission) => item.emailAddress);
  const handleDelete = useDeleteHook(
    DeletePermissions,
    selectedRowData,
    table,
    getDisplayNames,
    'permission'
  );

  dispatch(setSelectedRows(selectedRowData)); // Update the selected rows in Redux

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Permissions</h2>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-2 sm:space-y-0 sm:space-x-2">
        <Input
          placeholder="Filter emails..."
          value={(table.getColumn('emailAddress')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('emailAddress')?.setFilterValue(event.target.value)}
          className="w-full sm:w-64"
        />

        <div className="flex space-x-2">
          <Button onClick={refreshAllCache}>Refresh</Button>

          <Button disabled={isCreatePending} onClick={onCreateButtonClick}>
            {isCreatePending ? 'Loading...' : 'Create'}
          </Button>

          <Button disabled={isCreatePending} onClick={onUpdateButtonClick}>
            {isUpdatePending ? 'Loading...' : 'Update'}
          </Button>

          <ButtonDelete
            disabled={Object.keys(table.getState().rowSelection).length === 0}
            onDelete={handleDelete}
            action={''}
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

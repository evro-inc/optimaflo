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
import { revalidate, tierCreateLimit } from '@/src/utils/server';
import { ReloadIcon } from '@radix-ui/react-icons';
import { toggleCreate, toggleUpdate } from '@/src/redux/globalSlice';
import { useDispatch } from 'react-redux';
import { ButtonDelete } from '@/src/components/client/Button/Button';
import { useDeleteHook } from '../streams/delete';
import { notFound } from 'next/navigation';
import { setIsLimitReached } from '@/src/redux/tableSlice';
import StreamForms from './forms';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  properties: any;
  accounts: any;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  properties,
  accounts,
}: DataTableProps<TData, TValue>) {
  const dispatch = useDispatch();

  const { user } = useUser();
  const userId = user?.id;
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

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

  const selectedRowsData = table.getSelectedRowModel().rows.map((row) => row.original);

  const handleCreateClick = async () => {
    try {
      if (!userId) {
        return notFound();
      }
      const handleCreateLimit: any = await tierCreateLimit(userId, 'GA4Streams');

      if (handleCreateLimit && handleCreateLimit.limitReached) {
        // Directly show the limit reached modal
        dispatch(setIsLimitReached(true)); // Assuming you have an action to explicitly set this
      } else {
        // Otherwise, proceed with normal creation process
        dispatch(toggleCreate());
      }
    } catch (error: any) {
      throw new Error('Error in handleCreateClick:', error);
    }
  };

  const refreshAllCache = async () => {
    // Assuming you want to refresh cache for each workspace
    const keys = [
      `ga:accounts:userId:${userId}`,
      `ga:properties:userId:${userId}`,
      `ga:streams:userId:${userId}`,
    ];
    await revalidate(keys, '/dashboard/ga/accounts', userId);
    toast.info('Updating our systems. This may take a minute or two to update on screen.', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });
  };

  const handleDelete = useDeleteHook(selectedRowsData, table);

  return (
    <div>
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter property names..."
          value={(table.getColumn('displayName')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('displayName')?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />

        <div className="ml-auto space-x-4">
          <Button onClick={refreshAllCache}>Refresh</Button>

          <Button onClick={handleCreateClick}>Create</Button>

          <Button
            disabled={Object.keys(table.getState().rowSelection).length === 0}
            onClick={() => dispatch(toggleUpdate())}
          >
            Update
          </Button>

          <ButtonDelete
            disabled={Object.keys(table.getState().rowSelection).length === 0}
            onDelete={handleDelete}
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
      <div className="rounded-md border">
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
      <StreamForms
        selectedRows={selectedRowsData}
        table={table}
        properties={properties}
        accounts={accounts}
      />
    </div>
  );
}
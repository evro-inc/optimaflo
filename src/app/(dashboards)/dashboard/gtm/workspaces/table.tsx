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
import {
  revalidate,
  tierCreateLimit,
  tierUpdateLimit,
} from '@/src/lib/helpers/server';
import { ReloadIcon } from '@radix-ui/react-icons';
import { useDispatch } from 'react-redux';
import { setIsLimitReached } from '@/src/lib/redux/tableSlice';
import { notFound } from 'next/navigation';
import { toggleCreate, toggleUpdate } from '@/src/lib/redux/globalSlice';
import { useDeleteHook } from './delete';
import WorkspaceForms from '@/src/app/(dashboards)/dashboard/gtm/workspaces/WorkspaceForms';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/src/components/ui/alert-dialog';
import { ButtonDelete } from '@/src/components/client/Button/Button';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  accounts: any;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  accounts,
}: DataTableProps<TData, TValue>) {
  const dispatch = useDispatch();

  const { user } = useUser();

  const userId = user?.id;

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
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

  const refreshAllCache = async () => {
    // Assuming you want to refresh cache for each workspace
    const keys = [
      `gtm:accounts:userId:${userId}`,
      `gtm:containers:userId:${userId}`,
      `gtm:workspaces:userId:${userId}`,
    ];
    await revalidate(keys, '/dashboard/gtm/workspaces', userId);
    toast.info(
      'Updating our systems. This may take a minute or two to update on screen.',
      {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      }
    );
  };

  const handleCreateClick = async () => {
    try {
      if (!userId) {
        return notFound();
      }
      const handleCreateLimit: any = await tierCreateLimit(
        userId,
        'GTMWorkspaces'
      );

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

  const selectedRowsData = table
    .getSelectedRowModel()
    .rows.map((row) => row.original);

  const handleDelete = useDeleteHook(selectedRowsData, table);

  const handleUpdateClick = async () => {
    try {
      if (!userId) {
        return notFound();
      }
      const limitResponse: any = await tierUpdateLimit(userId, 'GTMWorkspaces');

      if (limitResponse && limitResponse.limitReached) {
        // Directly show the limit reached modal
        dispatch(setIsLimitReached(true)); // Assuming you have an action to explicitly set this
      } else {
        // Otherwise, proceed with normal creation process
        dispatch(toggleUpdate());
      }
    } catch (error: any) {
      throw new Error('Error in handleUpdateClick:', error);
    }
  };

  return (
    <>
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter workspace names..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />

        <div className="ml-auto space-x-4">
          <Button variant="outline" size="icon" onClick={refreshAllCache}>
            <ReloadIcon className="h-4 w-4" />
          </Button>

          <Button onClick={handleCreateClick}>Create</Button>

          <Button
            disabled={Object.keys(table.getState().rowSelection).length === 0}
            onClick={handleUpdateClick}
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
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="border bg-white border-gray-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-gray-700">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
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
      <WorkspaceForms
        selectedRows={selectedRowsData}
        table={table}
        accounts={accounts}
      />
    </>
  );
}

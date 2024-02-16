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
import { useDeleteHook } from './delete';
import { notFound } from 'next/navigation';
import { setIsLimitReached } from '@/src/redux/tableSlice';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/src/components/ui/dialog';
import { acknowledgeUserDataCollection } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import PropertyForms from './forms';
import { useCreateHookForm, useUpdateHookForm } from '@/src/hooks/useCRUD';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  parentData: any;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  parentData,
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
  const handleCreateClick = useCreateHookForm(userId, 'GA4Properties');
  const handleUpdateClick = useUpdateHookForm(userId, 'GA4Properties');
  const handleDelete = useDeleteHook(selectedRowsData, table);

  const refreshAllCache = async () => {
    // Assuming you want to refresh cache for each workspace
    const keys = [`ga:accounts:userId:${userId}`, `ga:properties:userId:${userId}`];
    await revalidate(keys, '/dashboard/ga/accounts', userId);
    toast.info('Updating our systems. This may take a minute or two to update on screen.', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });
  };

  const handleAcknowledgement = async () => {
    try {
      // If you're here, validation succeeded. Proceed with updateContainers.
      const res = await acknowledgeUserDataCollection(selectedRowsData);

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(`Property ${result.name} acknowledged.`, {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            });
          }
        });
      } else {
        if (res.notFoundError) {
          res.results.forEach((result) => {
            if (result.notFound) {
              toast.error(
                `Unable to acknowledged property ${result.name}. Please check your access permissions. Any other properties created were successful.`,
                {
                  action: {
                    label: 'Close',
                    onClick: () => toast.dismiss(),
                  },
                }
              );
            }
          });

          /*  dispatch(setErrorDetails(res.results)); // Assuming results contain the error details
          dispatch(setNotFoundError(true)); // Dispatch the not found error action */
        }

        if (res.limitReached) {
          res.results.forEach((result) => {
            if (result.limitReached) {
              toast.error(
                `Unable to create property ${result.name}. You have ${result.remaining} more property(s) you can create.`,
                {
                  action: {
                    label: 'Close',
                    onClick: () => toast.dismiss(),
                  },
                }
              );
            }
          });
          dispatch(setIsLimitReached(true));
        }
      }
    } catch (error: any) {
      throw new Error(error);
    } finally {
      table.resetRowSelection();
    }
  };


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
            onClick={handleUpdateClick}
          >
            Update
          </Button>

          <ButtonDelete
            disabled={Object.keys(table.getState().rowSelection).length === 0}
            onDelete={handleDelete}
          />

          <Dialog>
            <DialogTrigger asChild>
              <Button
                disabled={Object.keys(table.getState().rowSelection).length === 0}
                variant="outline"
              >
                Data Acknowledgement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>User Data Collection Acknowledgement</DialogTitle>
                <DialogDescription>
                  I acknowledge that I have the necessary privacy disclosures and rights from my end
                  users for the collection and processing of their data, including the association
                  of such data with the visitation information Google Analytics collects from my
                  site and/or app property. This acknowledgement is required and will be applied to
                  all selected properties.
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <Button type="submit" onClick={handleAcknowledgement}>
                  Acknowledge
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
      <PropertyForms selectedRows={selectedRowsData} table={table} accounts={parentData} />
    </div>
  );
}

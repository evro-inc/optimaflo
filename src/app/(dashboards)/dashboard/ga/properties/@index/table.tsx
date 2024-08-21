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

import { setIsLimitReached, setSelectedRows } from '@/src/redux/tableSlice';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/src/components/ui/dialog';
import { acknowledgeUserDataCollection, DeleteProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { useCreateHookForm, useUpdateHookForm, useDeleteHook } from '@/src/hooks/useCRUD';

import { useTransition } from 'react';
import { LimitReached } from '@/src/components/client/modals/limitReached';

import { GA4PropertyType } from '@/src/types/types';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  parentData: any;
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  const dispatch = useDispatch();
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isUpdatePending, startUpdateTransition] = useTransition();
  const { user } = useUser();
  const userId = user?.id as string;
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

  const selectedRowData = table.getSelectedRowModel().rows.reduce((acc, row) => {
    acc[row.id] = row.original;
    return acc;
  }, {});
  const rowSelectedCount = Object.keys(selectedRowData).length;

  const handleCreateClick = useCreateHookForm(
    userId,
    'GA4Properties',
    '/dashboard/ga/wizards/properties/create'
  );

  const onCreateButtonClick = () => {
    startCreateTransition(() => {
      handleCreateClick().catch((error) => {
        throw new Error(error);
      });
    });
  };

  const handleUpdateClick = useUpdateHookForm(
    userId,
    'GA4Properties',
    '/dashboard/ga/wizards/properties/update',
    rowSelectedCount
  );

  const onUpdateButtonClick = () => {
    startUpdateTransition(() => {
      handleUpdateClick().catch((error) => {
        throw new Error(error);
      });
    });
  };

  const getDisplayNames = (items) => items.map((item: GA4PropertyType) => item.name);
  const handleDelete = useDeleteHook(
    DeleteProperties,
    selectedRowData,
    table,
    getDisplayNames,
    'property'
  );

  const refreshAllCache = async () => {
    toast.info('Updating our systems. This may take a minute or two to update on screen.', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });
    const keys = [`ga:accounts:userId:${userId}`, `ga:properties:userId:${userId}`];
    await revalidate(keys, '/dashboard/ga/properties', userId);
  };

  const handleAcknowledgement = async () => {
    try {
      // If you're here, validation succeeded. Proceed with updateContainers.
      const res = await acknowledgeUserDataCollection(selectedRowData);

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

  dispatch(setSelectedRows(selectedRowData)); // Update the selected rows in Redux

  return (
    <div>
      <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        Property Details
      </h2>
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter property names..."
          value={(table.getColumn('displayName')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('displayName')?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />

        <div className="ml-auto space-x-4">
          <Button onClick={refreshAllCache}>Refresh</Button>

          <Button disabled={isCreatePending} onClick={onCreateButtonClick}>
            {isCreatePending ? 'Loading...' : 'Create'}
          </Button>

          <Button
            disabled={Object.keys(table.getState().rowSelection).length === 0 || isUpdatePending}
            onClick={onUpdateButtonClick}
          >
            {isUpdatePending ? 'Loading...' : 'Update'}
          </Button>

          <ButtonDelete
            disabled={Object.keys(table.getState().rowSelection).length === 0}
            onDelete={handleDelete}
            action={undefined}
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
      <LimitReached />
    </div>
  );
}

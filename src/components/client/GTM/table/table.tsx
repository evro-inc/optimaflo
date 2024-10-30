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
import { LimitReached } from '@/src/components/client/modals/limitReached';
import { revertVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variables';
import { useRevertHook } from '@/src/hooks/useCRUD';
import { ButtonDelete } from '../../Button/Button';
import { revertBuiltInVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variablesBuiltIn';
import { revertTags } from '@/src/lib/fetch/dashboard/actions/gtm/tags';
import { revertTrigger } from '@/src/lib/fetch/dashboard/actions/gtm/triggers';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[] | any; // added any, need to change to correct type
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isRevertPending, startRevertTransition] = React.useTransition();

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

  const selectedRowArray = Object.values(selectedRowData);

  const builtInVariables = selectedRowArray.filter((row: any) => row.builtInVariable);
  const variables = selectedRowArray.filter((row: any) => row.variable);
  const tags = selectedRowArray.filter((row: any) => row.tag);
  const triggers = selectedRowArray.filter((row: any) => row.trigger);

  const revertBuiltInVariablesHandler = useRevertHook(
    revertBuiltInVariables,
    selectedRowData,
    table,
    'built-in variable'
  );

  const revertVariablesHandler = useRevertHook(revertVariables, selectedRowData, table, 'version');

  const revertTagsHandler = useRevertHook(revertTags, selectedRowData, table, 'tag');
  const revertTriggerHandler = useRevertHook(revertTrigger, selectedRowData, table, 'trigger');

  // The click handler to revert changes
  // Create a map that links the type to its corresponding data and handler
  const revertHandlers = [
    { data: builtInVariables, handler: revertBuiltInVariablesHandler },
    { data: variables, handler: revertVariablesHandler },
    { data: tags, handler: revertTagsHandler },
    { data: triggers, handler: revertTriggerHandler },
  ];

  // The click handler to revert changes
  const handleRevert = () => {
    revertHandlers.forEach(({ data, handler }) => {
      if (data.length > 0) {
        handler().catch((error) => {
          console.error('Revert operation failed:', error);
        });
      }
    });
  };

  const onRevertButtonClick = () => {
    startRevertTransition(async () => {
      await handleRevert();
    });
  };

  return (
    <div>
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter by change name..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />

        <div className="ml-auto space-x-4">
          {/* Revert */}

          <ButtonDelete
            disabled={Object.keys(table.getState().rowSelection).length === 0}
            onDelete={onRevertButtonClick}
            action={'Revert'}
            type="GTMVariables"
            loading={isRevertPending}
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
      <LimitReached />
    </div>
  );
}

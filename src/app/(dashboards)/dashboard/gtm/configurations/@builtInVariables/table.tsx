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
import { ButtonDelete } from '@/src/components/client/Button/Button';
import { useDeleteHook, useRevertHook } from './delete';
import { useCreateHookForm, useUpdateHookForm } from '@/src/hooks/useCRUD';
import { setSelectedRows } from '@/src/redux/tableSlice';
import { useDispatch } from 'react-redux';
import { useTransition } from 'react';
import { LimitReached } from '@/src/components/client/modals/limitReached';
import { Drawer, DrawerContent, DrawerTrigger } from '@/src/components/ui/drawer';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/src/components/ui/card';
import { Label } from '@radix-ui/react-label';
import { Textarea } from '@/src/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';

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

  /*   const rowSelectedCount = Object.keys(selectedRowData).length;
   */
  const handleCreateClick = useCreateHookForm(
    userId,
    'GTMBuiltInVariables',
    '/dashboard/gtm/wizards/built-in-variables/create'
  );

  const onCreateButtonClick = () => {
    startCreateTransition(() => {
      handleCreateClick().catch((error) => {
        throw new Error(error);
      });
    });
  };

  /*   const handleUpdateClick = useUpdateHookForm(
      userId,
      'GTMBuiltInVariables',
      '/dashboard/ga/wizards/built-in-variables/create',
      rowSelectedCount
    );
  
    const onUpdateButtonClick = () => {
      startUpdateTransition(() => {
        handleUpdateClick().catch((error) => {
          throw new Error(error);
        });
      });
    }; */

  const handleDelete = useDeleteHook(selectedRowData, table);
  const handleRevert = useRevertHook(selectedRowData, table);

  const refreshAllCache = async () => {
    toast.info('Updating our systems. This may take a minute or two to update on screen.', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });
    const keys = [
      `gtm:accounts:userId:${userId}`,
      `gtm:containers:userId:${userId}`,
      `gtm:workspaces:userId:${userId}`,
      `gtm:builtInVariables:userId:${userId}`,
    ];
    await revalidate(keys, '/dashboard/gtm/configurations', userId);
  };

  dispatch(setSelectedRows(selectedRowData)); // Update the selected rows in Redux

  return (
    <div>
      <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        Built In Variables
      </h2>
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter conversion event names..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />

        <div className="ml-auto space-x-4">
          <Button onClick={refreshAllCache}>Refresh</Button>

          <Button disabled={isCreatePending} onClick={onCreateButtonClick}>
            {isCreatePending ? 'Loading...' : 'Create'}
          </Button>

          {/*  <Button
            disabled={Object.keys(table.getState().rowSelection).length === 0 || isUpdatePending}
            onClick={onUpdateButtonClick}
          >
            {isUpdatePending ? 'Loading...' : 'Update'}
          </Button> */}

          <ButtonDelete
            disabled={Object.keys(table.getState().rowSelection).length === 0}
            onDelete={handleDelete}
            action={'Delete'}
          />

          <ButtonDelete
            disabled={Object.keys(table.getState().rowSelection).length === 0}
            onDelete={handleRevert}
            action={'Revert'}
          />

          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline">Submit</Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="grid gap-6 p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Update Profile</CardTitle>
                    <CardDescription>Make changes to your profile information.</CardDescription>
                  </CardHeader>

                  <Tabs defaultValue="publish">
                    <TabsList>
                      <TabsTrigger value="publish">Pubish and Create Version</TabsTrigger>
                      <TabsTrigger value="version">Create Version</TabsTrigger>
                    </TabsList>
                    <TabsContent value="publish">
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" defaultValue="John Doe" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" defaultValue="john@example.com" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bio">Bio</Label>
                          <Textarea id="bio" rows={3} defaultValue="I'm a software engineer." />
                        </div>
                      </CardContent>
                    </TabsContent>
                    <TabsContent value="version">
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" defaultValue="John Doe" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" defaultValue="john@example.com" />
                          </div>
                        </div>
                      </CardContent>
                    </TabsContent>
                  </Tabs>

                  <CardFooter>
                    <Button>Save Changes</Button>
                  </CardFooter>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>View your recent orders and order history.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">#1234</TableCell>
                          <TableCell>2023-06-01</TableCell>
                          <TableCell>Delivered</TableCell>
                          <TableCell>$99.99</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">#1235</TableCell>
                          <TableCell>2023-05-25</TableCell>
                          <TableCell>Shipped</TableCell>
                          <TableCell>$49.99</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">#1236</TableCell>
                          <TableCell>2023-05-15</TableCell>
                          <TableCell>Pending</TableCell>
                          <TableCell>$79.99</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </DrawerContent>
          </Drawer>

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

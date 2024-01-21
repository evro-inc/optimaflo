import { ToggleRow } from '@/src/components/client/UI/InputToggleRow';
import TableRows from '@/src/components/server/UI/TableRow';
import { Table, TableBody, TableFooter } from '@/src/components/ui/table';
import TableHeaderRow from '@/src/components/server/UI/Tableheader';
import dynamic from 'next/dynamic';
import { auth } from '@clerk/nextjs';
import { WorkspaceType } from '@/src/lib/types/types'; //  change
import TableActions from '@/src/app/(dashboards)/dashboard/gtm/workspaces/TableActions';

import {
  fetchAllFilteredRows,
  fetchFilteredRows,
  fetchPages,
} from '@/src/lib/helpers/server';
import { notFound } from 'next/navigation';
import { Label } from '@/src/components/ui/label';
import WorkspaceForms from '@/src/components/client/UI/WorkspaceForms';

const TablePaginationNoSSR = dynamic(
  () => import('@/src/components/client/UI/TablePagination'),
  {
    ssr: false,
  }
);

export default async function WorkspaceTable({
  accounts,
  workspaces,
  query,
  currentPage,
}) {
  const { userId }: { userId: string | null } = auth();
  if (!userId) return notFound();

  const { data: rows } = await fetchFilteredRows(
    workspaces,
    query,
    currentPage
  );

  const allRows = await fetchAllFilteredRows(workspaces, query);

  const totalPages = await fetchPages(workspaces, query, 10);

  const renderRow = (workspace: WorkspaceType) => {
    return (
      <TableRows
        key={`${workspace.accountId}-${workspace.containerId}-${workspace.workspaceId}`}
        item={workspace}
        columns={[
          {
            render: (item) => (
              <ToggleRow
                item={item}
                uniqueIdentifier={['accountId', 'containerId', 'workspaceId']}
              />
            ),
          },
          {
            render: (item) => (
              <Label htmlFor={item.workspaceId}>{item.name}</Label>
            ),
          },
          {
            render: (item) => (
              <Label htmlFor={item.workspaceId}>{item.workspaceId}</Label>
            ),
          },
          {
            render: (item) => (
              <Label htmlFor={item.workspaceId}>{item.containerName}</Label>
            ),
          },
          {
            render: (item) => (
              <Label htmlFor={item.workspaceId}>{item.containerId}</Label>
            ),
          },
          {
            render: (item) => (
              <Label htmlFor={item.workspaceId}>{item.accountName}</Label>
            ),
          },
        ]}
      />
    );
  };

  return (
    <>
      <div className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto">
        <div className="flex flex-col">
          <div className="-m-1.5 overflow-x-auto">
            <div className="p-1.5 min-w-full inline-block align-middle">
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-gray-700">
                {/* Table Actions here, if applicable */}
                <div className="px-6 py-4 grid gap-3 md:flex md:justify-between md:items-center border-b border-gray-200 dark:border-gray-700">
                  {/* Header */}
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                    Workspaces
                  </h2>
                  <div className="inline-flex gap-x-2">
                    <TableActions userId={userId} allData={workspaces} />
                  </div>
                </div>
                <Table>
                  <TableHeaderRow
                    headers={[
                      'Workspace Name',
                      'Workspace ID',
                      'Container Name',
                      'Container ID',
                      'Account Name',
                    ]}
                    items={allRows}
                    uniqueKeys={['accountId', 'containerId', 'workspaceId']}
                  />
                  <TableBody>
                    {rows.map((workspace: any) => renderRow(workspace))}
                  </TableBody>
                  <TableFooter>{/* Footer content */}</TableFooter>
                </Table>
                <TablePaginationNoSSR totalPages={totalPages} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <WorkspaceForms workspaces={workspaces} accounts={accounts} />
    </>
  );
}
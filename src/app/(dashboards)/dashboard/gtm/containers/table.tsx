import {ToggleRow} from '@/src/components/client/UI/InputToggleRow';
import AccountForms from '@/src/components/client/UI/AccountForms';
import ButtonUpdate from '@/src/components/client/UI/ButtonUpdate';
import TableRows from '@/src/components/server/UI/TableRow';
import { Table, TableBody, TableFooter } from '@/src/components/ui/table';
import TableHeaderRow from '@/src/components/server/UI/Tableheader';
import dynamic from 'next/dynamic';
import { RefreshIcon } from '@/src/components/client/Button/Button';
import { auth } from '@clerk/nextjs';
import { ContainerType } from '@/src/lib/types/types';
import TableActions from '@/src/components/client/UI/TableActions';
import { handleRefreshCache } from '@/src/lib/helpers/client';
import { handleDelete } from './delete';
import ContainerForms from '@/src/components/client/UI/ContainerForms';
import {tierCreateLimit} from '@/src/lib/helpers/server';
import { notFound } from 'next/navigation';

const TablePaginationNoSSR = dynamic(
  () => import('@/src/components/client/UI/TablePagination'),
  {
    ssr: false,
  }
);

export default async function ContainerTable({ accounts, containers }) {
  const { userId }: { userId: string | null } = auth();
  if (!userId) return notFound();

  const createLimitResponse: any = await tierCreateLimit(userId, 'GTMContainer');

  const renderRow = (container: ContainerType) => {
    return (
      <TableRows
        key={`${container.accountId}-${container.containerId}`}
        item={container}
        columns={[
          {
            render: (item) => (
              <ToggleRow 
                item={item} 
              uniqueIdentifier={['accountId', 'containerId']}
              />
            ),
          },
          {
            render: (item) => <label>{item.name}</label>,
          },
          {
            render: (item) => <label>{item.containerId}</label>,
          },
          {
            render: (item) => <label>{item.publicId}</label>,
          },
          {
            render: (item) => <label>{item.accountId}</label>,
          },
          {
            render: (item) => <label>{item.usageContext}</label>,
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
                    Containers
                  </h2>
                  <div className="inline-flex gap-x-2">
                  <TableActions
                    userId={userId}
                    handleCreateLimit={createLimitResponse}
                  />
                  </div>
                </div>
                <Table>
                  <TableHeaderRow
                    headers={[
                      'Container Name',
                      'Container ID',
                      'GTM ID',
                      'Account ID',
                      'Usage Context',
                    ]}
                    items={containers}
                    uniqueKeys={['accountId', 'containerId']}
                  />
                  <TableBody>
                    {containers.map((container) => renderRow(container))}
                  </TableBody>
                  <TableFooter>{/* Footer content */}</TableFooter>
                </Table>
                <TablePaginationNoSSR
                  containers={containers}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <ContainerForms 
        accounts={accounts}
        containers={containers}
      />
    </>
  );
}

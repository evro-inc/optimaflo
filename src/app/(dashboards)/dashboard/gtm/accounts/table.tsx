import { ToggleRow } from '@/src/components/client/UI/InputToggleRow';
import AccountForms from '@/src/components/client/UI/AccountForms';
import ButtonUpdate from '@/src/components/client/UI/ButtonUpdate';
import TableRows from '@/src/components/server/UI/TableRow';
import { Table, TableBody, TableFooter } from '@/src/components/ui/table';
import TableHeaderRow from '@/src/components/server/UI/Tableheader';
import dynamic from 'next/dynamic';
import { RefreshIcon } from '@/src/components/client/Button/Button';
import { auth } from '@clerk/nextjs';
import { fetchFilteredRows, fetchPages } from '@/src/lib/helpers/server';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/gtm/actions/accounts';
import { Label } from '@/src/components/ui/label';

const TablePaginationNoSSR = dynamic(
  () => import('@/src/components/client/UI/TablePagination'),
  {
    ssr: false,
  }
);

export default async function AccountTable({ accounts, query, currentPage }) {
  const { userId }: { userId: string | null } = auth();

  const { data: rows } = await fetchFilteredRows(
    listGtmAccounts,
    query,
    currentPage
  );

  const totalPages = await fetchPages(listGtmAccounts, query, 10);

  const renderRow = (account) => (
    <TableRows
      key={account.accountId}
      item={account}
      columns={[
        {
          render: (item) => (
            <ToggleRow item={item} uniqueIdentifier={['accountId']} />
          ),
        },
        {
          render: (item) => <Label htmlFor={item.accountId}>{item.name}</Label>,
        },
        {
          render: (item) => (
            <Label htmlFor={item.accountId}>{item.accountId}</Label>
          ),
        },
      ]}
    />
  );

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
                    Accounts
                  </h2>
                  <div className="inline-flex gap-x-2">
                    <RefreshIcon
                      userId={userId}
                      feature="accounts"
                      variant="create"
                    />
                    <ButtonUpdate />
                  </div>
                </div>
                <Table>
                  <TableHeaderRow
                    headers={['Account Name', 'Account ID']}
                    items={rows}
                    uniqueKeys={['accountId']}
                  />
                  <TableBody>
                    {rows.map((account) => renderRow(account))}
                  </TableBody>
                  <TableFooter>{/* Footer content */}</TableFooter>
                </Table>
                <TablePaginationNoSSR totalPages={totalPages} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <AccountForms />
    </>
  );
}

import ToggleRow from '@/src/components/client/UI/InputToggleRow';
import AccountForms from '@/src/components/client/UI/AccountForms';
import ButtonUpdate from '@/src/components/client/UI/ButtonUpdate';
import TableRows from '@/src/components/server/UI/TableRow';
import { Table, TableBody, TableFooter } from '@/src/components/ui/table';
import TableHeaderRow from '@/src/components/server/UI/Tableheader';
import dynamic from 'next/dynamic';
import { RefreshIcon } from '@/src/components/client/Button/Button';
import { auth } from '@clerk/nextjs';

const TablePaginationNoSSR = dynamic(
  () => import('@/src/components/client/UI/TablePagination'),
  {
    ssr: false,
  }
);

export default function AccountTable({ accounts }) {
  const { userId } : { userId: string | null } = auth();
  const totalPages = Math.ceil(accounts.length / 10);
  const currentPage = Array.from({ length: totalPages }, (_, i) => i + 1);
  const renderRow = (account) => (
    <TableRows
      key={account.accountId}
      item={account}
      columns={[
        {
          render: (item) => <ToggleRow item={item} />,
        },
        {
          render: (item) => <label>{item.name}</label>,
        },
        {
          render: (item) => <label>{item.accountId}</label>,
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
                    <RefreshIcon userId={userId} feature="accounts" variant='create' />
                    <ButtonUpdate />
                  </div>
                </div>
                <Table>
                  <TableHeaderRow
                    headers={['Account Name', 'Account ID']}
                    items={accounts}
                    uniqueKeys={['accountId']}
                  />
                  <TableBody>
                    {accounts.map((account) => renderRow(account))}
                  </TableBody>
                  <TableFooter>{/* Footer content */}</TableFooter>
                </Table>
                <TablePaginationNoSSR
                  currentPage={currentPage}
                  totalPages={totalPages}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <AccountForms />
    </>
  );
}

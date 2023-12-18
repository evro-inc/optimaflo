'use client';
import dynamic from 'next/dynamic';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DeleteContainers } from '@/src/lib/fetch/dashboard/gtm/actions/containers';
import { ContainerType, DeleteContainersResponse } from '@/src/lib/types/types';
import {
  selectGlobal,
  toggleCreateContainer,
  toggleUpdateContainer,
  /* toggleCombineContainer, */
} from '@/src/app/redux/globalSlice';
import {
  clearSelectedRows,
  selectTable,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/app/redux/tableSlice';
/* import FormCombineContainer from '../../../../../components/client/GTM/containers/combineContainer'; */
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import TableRow from '@/src/components/server/UI/TableRow';
import {
  useError,
  useModal,
  useRowSelection,
  useToggleAll,
} from '@/src/lib/helpers/client';
import TableActions from '@/src/components/client/UI/TableActions';
import { handleRefreshCache } from '@/src/lib/helpers/client';
import TableHeader from '@/src/components/server/UI/Tableheader';
import TablePagination from '@/src/components/client/UI/TablePagination';
import { ErrorMessage } from '@/src/components/client/modals/Error';

//dynamic import for buttons
const LimitReachedModal = dynamic(
  () =>
    import('../../../../../components/client/modals/limitReached').then(
      (mod) => mod.LimitReached
    ),
  { ssr: false }
);

const NotFoundErrorModal = dynamic(
  () =>
    import('../../../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

const FormCreateContainer = dynamic(() => import('./create'), {
  ssr: false,
});

const FormUpdateContainer = dynamic(() => import('./update'), {
  ssr: false,
});

// In the component render method

export default function ContainerTable({ accounts, containers }) {
  const auth = useAuth();
  const router = useRouter();
  const userId = auth?.userId;
  const dispatch = useDispatch();
  const { showUpdateContainer, showCreateContainer } =
    useSelector(selectGlobal);
  const { itemsPerPage, currentPage, isLimitReached } =
    useSelector(selectTable);
  const { toggleRow, selectedRows, allSelected } = useRowSelection(
    (container) => container.containerId
  );
  const { isModalOpen, closeModal } = useModal();
  const { error, setErrorState, clearError } = useError();

  const currentItems = containers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(containers.length / itemsPerPage);

  const handleDelete = async () => {
    const uniqueAccountIds = Array.from(
      new Set(
        Object.values(selectedRows).map((rowData: any) => rowData.accountId)
      )
    );

    const deleteOperations = uniqueAccountIds.map(async (accountId) => {
      const containersToDelete = Object.entries(
        selectedRows as { [key: string]: ContainerType }
      )
        .filter(([, rowData]) => rowData.accountId === accountId)
        .map(([containerId]) => containerId);

      return DeleteContainers(accountId, new Set(containersToDelete));
    });

    const responses: DeleteContainersResponse[] = await Promise.all(
      deleteOperations
    );

    const limitReached = responses.some((response) => response.limitReached);

    const notFoundErrorOccurred = responses.some((response) =>
      response.results.some((result) => result.notFound)
    );

    dispatch(setIsLimitReached(limitReached));
    dispatch(setNotFoundError(notFoundErrorOccurred));
    dispatch(clearSelectedRows());
  };

  const renderRow = (container: ContainerType) => {
    return (
      <TableRow
        key={`${container.accountId}-${container.containerId}`}
        item={container}
        columns={[
          {
            render: (item) => (
              <input
                type="checkbox"
                checked={!!selectedRows[item.containerId]}
                onChange={() => toggleRow(item)}
              />
            ),
          },
          {
            render: (item) => <span>{item.name}</span>,
          },
          {
            render: (item) => <span>{item.containerId}</span>,
          },
          {
            render: (item) => <span>{item.publicId}</span>,
          },
          {
            render: (item) => <span>{item.accountId}</span>,
          },
          {
            render: (item) => <span>{item.usageContext}</span>,
          },
        ]}
      />
    );
  };

  const getIdFromContainer = (container) => container.containerId;

  // Use `useToggleAll` with the correct arguments
  const toggleAll = useToggleAll(
    containers,
    getIdFromContainer,
    dispatch,
    allSelected
  );

  return (
    <>
      <div className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto">
        <div className="flex flex-col">
          <div className="-m-1.5 overflow-x-auto">
            <div className="p-1.5 min-w-full inline-block align-middle">
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-gray-700">
                <div className="px-6 py-4 grid gap-3 md:flex md:justify-between md:items-center border-b border-gray-200 dark:border-gray-700">
                  {/* Header */}
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                    Containers
                  </h2>
                  <TableActions
                    userId={userId}
                    onDelete={handleDelete}
                    isUpdateDisabled={Object.keys(selectedRows).length === 0}
                    isDeleteDisabled={Object.keys(selectedRows).length === 0}
                    onRefresh={() =>
                      handleRefreshCache(
                        router,
                        `gtm:containers-userId:${userId}`,
                        '/dashboard/gtm/containers'
                      )
                    }
                  />
                </div>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <TableHeader
                    headers={[
                      'Container Name',
                      'Container ID',
                      'GTM ID',
                      'Account ID',
                      'Usage Context',
                    ]}
                    toggleAll={toggleAll}
                    allSelected={allSelected}
                  />
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {currentItems.map((container) => renderRow(container))}
                  </tbody>
                </table>
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isLimitReached && (
        <LimitReachedModal onClose={() => dispatch(setIsLimitReached(false))} />
      )}

      {isModalOpen && (
        <NotFoundErrorModal onClose={() => dispatch(setNotFoundError(false))} />
      )}
      {error && <ErrorMessage onClose={clearError} />}

      {/* Forms */}
      {showCreateContainer && (
        <FormCreateContainer
          showOptions={showCreateContainer}
          onClose={() => dispatch(toggleCreateContainer())}
          accounts={accounts}
        />
      )}
      {showUpdateContainer && (
        <FormUpdateContainer
          showOptions={showUpdateContainer}
          onClose={() => dispatch(toggleUpdateContainer())}
          accounts={accounts}
          selectedRows={selectedRows}
        />
      )}
    </>
  );
}

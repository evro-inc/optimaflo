'use client';
import dynamic from 'next/dynamic';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { deleteWorkspaces } from '@/src/lib/actions/workspaces';
import { WorkspaceType } from '@/types/types';
import {
  selectWorkspace,
  toggleCreateWorkspace,
  toggleUpdateWorkspace,
} from '@/src/app/redux/workspaceSlice';
import {
  selectTable,
  setCurrentPage,
  setIsLimitReached,
  setSelectedRows,
  toggleAllSelected,
} from '@/src/app/redux/tableSlice';
import logger from '@/src/lib/logger';

//dynamic import for buttons
const ButtonDelete = dynamic(
  () => import('../../Button/Button').then((mod) => mod.ButtonDelete),
  { ssr: false }
);
const ButtonWithIcon = dynamic(
  () => import('../../Button/Button').then((mod) => mod.ButtonWithIcon),
  { ssr: false }
);

const LimitReached = dynamic(
  () => import('../../modals/limitReached').then((mod) => mod.LimitReached),
  { ssr: false }
);
const FormCreateWorkspace = dynamic(() => import('./create'), {
  ssr: false,
});

const FormUpdateWorkspace = dynamic(() => import('./update'), {
  ssr: false,
});

export default function WorkspaceTable({ accounts, containers, workspaces }) {
  const dispatch = useDispatch();
  const getContainerName = (containerId) => {
    const container = containers.find((c) => c.containerId === containerId);
    return container ? container.name : 'N/A';
  };
  const { showUpdateWorkspace, showCreateWorkspace } =
    useSelector(selectWorkspace);

  const { itemsPerPage, selectedRows, currentPage, isLimitReached } =
    useSelector(selectTable);

  const { allSelected } = useSelector(selectTable);

  const workspacesPerPage = 10;
  const totalPages = Math.ceil(
    (workspaces ? workspaces.length : 0) / workspacesPerPage
  );

  const nextPage = () => {
    if (currentPage < totalPages) {
      dispatch(setCurrentPage(currentPage + 1));
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      dispatch(setCurrentPage(currentPage - 1));
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = workspaces
    ? workspaces.slice(indexOfFirstItem, indexOfLastItem)
    : [];

  const handlePageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setCurrentPage(Number(e.target.value)));
  };

  const pageOptions = Array.from({ length: totalPages }, (_, i) => i + 1);

  const toggleRow = (workspaceId, containerId, accountId) => {
    const uniqueKey = `${workspaceId}-${containerId}`;
    const newSelectedRows = { ...selectedRows };
    if (newSelectedRows[uniqueKey]) {
      delete newSelectedRows[uniqueKey];
    } else {
      const workspace = workspaces.find(
        (w) => w.workspaceId === workspaceId && w.containerId === containerId
      );
      if (workspace) {
        newSelectedRows[uniqueKey] = {
          accountId: accountId,
          name: workspace.name,
          containerId: workspace.containerId,
          workspaceId: workspaceId,
        };
      }
    }
    dispatch(setSelectedRows(newSelectedRows));
  };

  const toggleAll = () => {
    if (allSelected) {
      // If all rows are currently selected, deselect all
      dispatch(setSelectedRows({}));
      dispatch(toggleAllSelected());
    } else {
      // If not all rows are currently selected, select all
      const newSelectedRows = {};
      workspaces.forEach((workspace) => {
        const uniqueKey = `${workspace.workspaceId}-${workspace.containerId}`;
        newSelectedRows[uniqueKey] = {
          accountId: workspace.accountId,
          name: workspace.name,
          containerId: workspace.containerId,
          workspaceId: workspace.workspaceId,
        };
      });
      dispatch(setSelectedRows(newSelectedRows));
      dispatch(toggleAllSelected());
    }
  };

  const handleDelete = async () => {
    try {
      // Transform selectedRows object into an array of deletion operations
      const deleteOperations = Object.values(selectedRows).map(
        (rowData: any) => {
          const { accountId, containerId, workspaceId } = rowData;
          return deleteWorkspaces(accountId, [{ containerId, workspaceId }]);
        }
      );

      // Await the resolution of all deletion operations
      await Promise.all(deleteOperations);
    } catch (error: any) {
      if (error.message.includes('Feature limit reached')) {
        dispatch(setIsLimitReached(true));
      } else {
        logger.error(error);
      }
    }
  };

  return (
    <>
      {/* Table Section */}
      <div className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto">
        {/* Card */}
        <div className="flex flex-col">
          <div className="-m-1.5 overflow-x-auto">
            <div className="p-1.5 min-w-full inline-block align-middle">
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-gray-700">
                {/* Header */}
                <div className="px-6 py-4 grid gap-3 md:flex md:justify-between md:items-center border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                      Workspaces
                    </h2>
                  </div>

                  <div>
                    <div className="inline-flex gap-x-2">
                      <ButtonDelete
                        href="#"
                        text="Delete"
                        billingInterval={undefined}
                        variant="delete"
                        onClick={handleDelete}
                        disabled={Object.keys(selectedRows).length === 0}
                      />

                      <ButtonWithIcon
                        variant="create"
                        text="Create"
                        icon={
                          <svg
                            className="w-3 h-3"
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M2.63452 7.50001L13.6345 7.5M8.13452 13V2"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        }
                        billingInterval={undefined}
                        onClick={() => dispatch(toggleCreateWorkspace())}
                      />

                      <ButtonWithIcon
                        variant="create"
                        text="Update"
                        disabled={Object.keys(selectedRows).length === 0}
                        icon={
                          <svg
                            className="w-3 h-3"
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M2.63452 7.50001L13.6345 7.5M8.13452 13V2"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        }
                        billingInterval={undefined}
                        onClick={() => dispatch(toggleUpdateWorkspace())}
                      />
                    </div>
                  </div>
                </div>
                {/* End Header */}

                {/* Table */}
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-slate-900">
                    <tr>
                      <th scope="col" className="pl-6 py-3 text-left">
                        <label
                          htmlFor="hs-at-with-checkboxes-main"
                          className="flex"
                        >
                          <input
                            type="checkbox"
                            className="shrink-0 border-gray-200 rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                            id="hs-at-with-checkboxes-main"
                            checked={allSelected}
                            onChange={toggleAll}
                          />
                          <span className="sr-only">Checkbox</span>
                        </label>
                      </th>

                      <th scope="col" className="px-6 py-3 text-left">
                        <div className="flex items-center gap-x-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-800 dark:text-gray-200">
                            Container Name
                          </span>
                        </div>
                      </th>

                      <th scope="col" className="px-6 py-3 text-left">
                        <div className="flex items-center gap-x-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-800 dark:text-gray-200">
                            Workspace Name
                          </span>
                        </div>
                      </th>

                      <th scope="col" className="px-6 py-3 text-left">
                        <div className="flex items-center gap-x-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-800 dark:text-gray-200">
                            Workspace ID
                          </span>
                        </div>
                      </th>

                      <th scope="col" className="px-6 py-3 text-left">
                        <div className="flex items-center gap-x-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-800 dark:text-gray-200">
                            Container ID
                          </span>
                        </div>
                      </th>

                      <th scope="col" className="px-6 py-3 text-left">
                        <div className="flex items-center gap-x-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-800 dark:text-gray-200">
                            Account ID
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  {currentItems.map((workspace: WorkspaceType) => (
                    <tbody
                      className="divide-y divide-gray-200 dark:divide-gray-700"
                      key={`${workspace.workspaceId}-${workspace.containerId}`}
                    >
                      {/* ROW */}
                      <tr>
                        <td className="h-px w-px whitespace-nowrap">
                          <div className="pl-6 py-2">
                            <label
                              htmlFor="hs-at-with-checkboxes-1"
                              className="flex"
                            >
                              <input
                                type="checkbox"
                                className="shrink-0 border-gray-200 rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                                id={`checkbox-${workspace.containerId}`}
                                checked={
                                  !!selectedRows[
                                    `${workspace.workspaceId}-${workspace.containerId}`
                                  ]
                                }
                                onChange={() =>
                                  toggleRow(
                                    workspace.workspaceId,
                                    workspace.containerId,
                                    workspace.accountId
                                  )
                                }
                              />

                              <span className="sr-only">Checkbox</span>
                            </label>
                          </div>
                        </td>
                        <td className="h-px w-px whitespace-nowrap">
                          <div className="px-6 py-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {getContainerName(workspace.containerId)}
                            </span>
                          </div>
                        </td>

                        <td className="h-px w-px whitespace-nowrap">
                          <div className="px-6 py-2">
                            <div className="flex items-center gap-x-2">
                              <svg
                                className="inline-block h-5 w-5"
                                width="32"
                                height="32"
                                viewBox="0 0 32 32"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M16.0355 1.75926C10.6408 1.75926 5.30597 1.49951 0.0111241 1C-0.288584 7.23393 5.50578 13.1282 12.7987 14.5668L13.9975 14.7266C14.3372 12.4289 15.9956 3.7773 16.595 1.73928C16.4152 1.75926 16.2353 1.75926 16.0355 1.75926Z"
                                  fill="#A49DFF"
                                />
                                <path
                                  d="M16.615 1.75926C16.615 1.75926 25.2266 7.9932 28.5234 16.3451C30.0419 11.3499 31.1608 6.15498 32 1C26.8051 1.49951 21.71 1.75926 16.615 1.75926Z"
                                  fill="#28289A"
                                />
                                <path
                                  d="M13.9975 14.7466L13.8177 15.9455C13.8177 15.9455 12.2592 28.4133 23.1886 31.9699C25.2266 26.8748 27.0049 21.6599 28.5234 16.3251C21.9698 15.8456 13.9975 14.7466 13.9975 14.7466Z"
                                  fill="#5ADCEE"
                                />
                                <path
                                  d="M16.6149 1.75927C16.0155 3.79729 14.3571 12.4089 14.0175 14.7466C14.0175 14.7466 21.9897 15.8456 28.5233 16.3251C25.1866 7.9932 16.6149 1.75927 16.6149 1.75927Z"
                                  fill="#7878FF"
                                />
                              </svg>
                              <div className="grow">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {workspace.name}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="h-px w-px whitespace-nowrap">
                          <div className="px-6 py-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {workspace.workspaceId}
                            </span>
                          </div>
                        </td>

                        <td className="h-px w-px whitespace-nowrap">
                          <div className="px-6 py-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {workspace.containerId}
                            </span>
                          </div>
                        </td>

                        <td className="h-px w-px whitespace-nowrap">
                          <div className="px-6 py-2 flex gap-x-1">
                            {workspace.accountId}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  ))}
                </table>
                {/* End Table */}

                {/* Footer */}
                <div className="px-6 py-4 grid gap-3 md:flex md:justify-between md:items-center border-t border-gray-200 dark:border-gray-700">
                  <div className="inline-flex items-center gap-x-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Showing:
                    </p>
                    <div className="max-w-sm space-y-3">
                      <select
                        className="py-2 px-3 pr-9 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                        onChange={handlePageChange}
                        value={currentPage}
                      >
                        {pageOptions.map((option, index) => (
                          <option key={index} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      of {(workspaces && workspaces.length) || 0}
                    </p>
                  </div>

                  <div>
                    <div className="inline-flex gap-x-2">
                      <button
                        type="button"
                        className="py-2 px-3 inline-flex justify-center items-center gap-2 rounded-md border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800"
                        onClick={prevPage}
                      >
                        <svg
                          className="w-3 h-3"
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path
                            fillRule="evenodd"
                            d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"
                          />
                        </svg>
                        Prev
                      </button>

                      <button
                        type="button"
                        className="py-2 px-3 inline-flex justify-center items-center gap-2 rounded-md border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800"
                        onClick={nextPage}
                      >
                        Next
                        <svg
                          className="w-3 h-3"
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                {/* End Footer */}
              </div>
            </div>
          </div>
        </div>
        {/* End Card */}
      </div>
      {/* End Table Section */}
      {isLimitReached && (
        <LimitReached onClose={() => dispatch(setIsLimitReached(false))} />
      )}
      {useSelector(selectWorkspace).showCreateWorkspace && (
        <FormCreateWorkspace
          showOptions={showCreateWorkspace}
          onClose={() => dispatch(toggleCreateWorkspace())}
          accounts={accounts}
          containers={containers}
        />
      )}

      {useSelector(selectWorkspace).showUpdateWorkspace && (
        <FormUpdateWorkspace
          showOptions={showUpdateWorkspace}
          onClose={() => dispatch(toggleUpdateWorkspace())}
          accounts={accounts}
          selectedRows={selectedRows}
          containers={containers}
          workspaces={workspaces}
        />
      )}
    </>
  );
}
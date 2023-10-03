'use client';
import React, { useState } from 'react';
import { ButtonDelete, ButtonWithIcon } from '../../Button/Button';
import { deleteContainers } from '@/src/lib/actions';
import { LimitReached } from '../../modals/limitReached';
import FormCreateContainer from './createContainer';
import { showToast } from '../../Toast/Toast';
import FormUpdateContainer from './updateContainer';
import { ContainerType } from '@/types/types';

export default function ContainerTable({ accounts, containers }) {
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [showUpdateOptions, setShowUpdateOptions] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Map<string, ContainerType>>(
    new Map()
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isLimitReached, setIsLimitReached] = useState(false);

  const containersPerPage = 10;
  const totalPages = Math.ceil(containers.length / containersPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = containers.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentPage(Number(e.target.value));
  };

  const pageOptions = Array.from({ length: totalPages }, (_, i) => i + 1);

  const toggleRow = (containerId, accountId) => {
    const newSelectedRows = new Map(selectedRows);
    if (newSelectedRows.has(containerId)) {
      newSelectedRows.delete(containerId);
    } else {
      const container = containers.find((c) => c.containerId === containerId);
      if (container) {
        newSelectedRows.set(containerId, {
          accountId: accountId,
          containerName: container.name,
          containerId: containerId,
          publicId: container.publicId,
          usageContext: container.usageContext,
          domainName: container.domainName,
          notes: container.notes,
        });
      }
    }
    setSelectedRows(newSelectedRows);
  };

  const toggleAll = () => {
    if (selectedRows.size === containers.length) {
      setSelectedRows(new Map());
    } else {
      const newSelectedRows = new Map();
      containers.forEach((container) => {
        const { containerId, accountId, name, publicId, usageContext } =
          container;
        newSelectedRows.set(containerId, {
          accountId,
          containerName: name,
          containerId,
          publicId,
          usageContext,
        });
      });
      setSelectedRows(newSelectedRows);
    }
  };

  const handleDelete = async () => {
    // Show loading state toast
    showToast({ variant: 'info', message: 'Deleting containers...' });

    const uniqueAccountIds = Array.from(
      new Set(
        Array.from(selectedRows.values()).map((rowData) => rowData.accountId)
      )
    );

    try {
      for (const accountId of uniqueAccountIds) {
        const containersToDelete = Array.from(selectedRows.entries())
          .filter(([, rowData]) => rowData.accountId === accountId)
          .map(([containerId]) => containerId);

        await deleteContainers(accountId, new Set(containersToDelete));
      }

      // Show completion toast
      showToast({
        variant: 'success',
        message: 'Container(s) deleted successfully.',
      });
    } catch (error: any) {
      // Show error toast
      showToast({ variant: 'error', message: 'Failed to delete containers.' });
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
                      Containers
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
                        disabled={selectedRows.size === 0}
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
                        onClick={() => setShowCreateOptions(!showCreateOptions)}
                      />

                      <ButtonWithIcon
                        variant="create"
                        text="Update"
                        disabled={selectedRows.size === 0}
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
                        onClick={() => setShowUpdateOptions(!showUpdateOptions)}
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
                            Container ID
                          </span>
                        </div>
                      </th>

                      <th scope="col" className="px-6 py-3 text-left">
                        <div className="flex items-center gap-x-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-800 dark:text-gray-200">
                            GTM ID
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

                      <th scope="col" className="px-6 py-3 text-left">
                        <div className="flex items-center gap-x-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-800 dark:text-gray-200">
                            Usage Context
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  {currentItems.map((container: ContainerType) => (
                    <tbody
                      className="divide-y divide-gray-200 dark:divide-gray-700"
                      key={container.containerId}
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
                                id={`checkbox-${container.containerId}`}
                                checked={selectedRows.has(
                                  container.containerId
                                )}
                                onChange={() =>
                                  toggleRow(
                                    container.containerId,
                                    container.accountId
                                  )
                                }
                              />

                              <span className="sr-only">Checkbox</span>
                            </label>
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
                                  {container.name}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="h-px w-px whitespace-nowrap">
                          <div className="px-6 py-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {container.containerId}
                            </span>
                          </div>
                        </td>
                        <td className="h-px w-px whitespace-nowrap">
                          <div className="px-6 py-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {container.publicId}
                            </span>
                          </div>
                        </td>
                        <td className="h-px w-px whitespace-nowrap">
                          <div className="px-6 py-2 flex gap-x-1">
                            {container.accountId}
                          </div>
                        </td>
                        <td className="h-px w-px whitespace-nowrap">
                          <div className="px-6 py-2 flex gap-x-1">
                            {container.usageContext}
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
                      of {containers.length}
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
        <LimitReached onClose={() => setIsLimitReached(false)} />
      )}
      <FormCreateContainer
        showOptions={showCreateOptions}
        onClose={() => setShowCreateOptions(false)}
        accounts={accounts}
      />
      <FormUpdateContainer
        showOptions={showUpdateOptions}
        onClose={() => setShowUpdateOptions(false)}
        accounts={accounts}
        selectedRows={selectedRows}
      />
    </>
  );
}

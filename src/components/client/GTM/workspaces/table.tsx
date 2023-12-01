'use client';
import React from 'react';
import { WorkspaceType } from '@/src/lib/types/types';
import ButtonCreate from '@/src/components/client/UI/ButtonCreate';
import ButtonUpdate from '@/src/components/client/UI/ButtonUpdate';
import ButtonDel from '@/src/components/client/UI/ButtonDelete';
import ToggleRow from '@/src/components/client/UI/InputToggleRow';
import ToggleAll from '@/src/components/client/UI/InputToggleAll';
import Select from '@/src/components/client/UI/Select';
import ButtonPrev from '@/src/components/client/UI/ButtonPrevious';
import ButtonNext from '@/src/components/client/UI/ButtonNext';
import { usePaginate } from '@/src/lib/paginate';
import { selectTable } from '@/src/app/redux/tableSlice';
import { useSelector } from 'react-redux';
import WorkspaceForms from '../../UI/WorkspaceForms';

export default function WorkspaceTable(
  { workspaces }
) {
  const { itemsPerPage } = useSelector(selectTable);

  const mergedData = Array.isArray(workspaces) ? workspaces : [];

  const sortedData = [...mergedData].sort((a, b) => {
    if (a.containerName < b.containerName) return -1;
    if (a.containerName > b.containerName) return 1;
    return 0;
  });

  // Use usePaginate for pagination
  const currentData = usePaginate(sortedData);

  // Calculate total pages
  const totalPages = Math.ceil(
    (mergedData ? mergedData.length : 0) / itemsPerPage
  );

  const pageOptions = Array.from({ length: totalPages }, (_, i) => i + 1);

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
                      <ButtonDel />
                      <ButtonCreate />
                      <ButtonUpdate />
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
                          <ToggleAll
                            items={workspaces}
                            uniqueKeys={['workspaceId', 'containerId']}
                          />
                          <span className="sr-only">Checkbox</span>
                        </label>
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
                            Account ID
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  {currentData.map((workspace: WorkspaceType) => (
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
                              <ToggleRow
                                item={workspace}
                                items={workspaces}
                                uniqueKeys={['workspaceId', 'containerId']}
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
                              {workspace.containerName}
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
                      <Select workspaces={pageOptions} />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      of {totalPages}
                    </p>
                  </div>

                  <div>
                    <div className="inline-flex gap-x-2">
                      <ButtonPrev />
                      <ButtonNext workspaces={mergedData ? mergedData : []} />
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
      <WorkspaceForms accounts={workspaces} workspaces={workspaces} />
    </>
  );
}

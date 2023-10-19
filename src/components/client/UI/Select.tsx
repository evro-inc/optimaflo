'use client';
import { selectTable, setCurrentPage } from '@/src/app/redux/tableSlice';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

function Select({ workspaces }) {
  const dispatch = useDispatch();

  const { currentPage } = useSelector(selectTable);

  const handlePageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setCurrentPage(Number(e.target.value)));
  };

  const workspacesPerPage = 10;
  const totalPages = Math.ceil(
    (workspaces ? workspaces.length : 0) / workspacesPerPage
  );
  const pageOptions = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
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
  );
}

export default Select;

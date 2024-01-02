'use client';
import { setCurrentPage } from '@/src/app/redux/tableSlice';
import React from 'react';
import { useDispatch } from 'react-redux';
import { Button } from '@/src/components/ui/button';

const TablePagination = ({ currentPage, totalPages }) => {
  const dispatch = useDispatch();
  // Generate page options for the dropdown
  const pageOptions = Array.from({ length: totalPages }, (_, i) => i + 1);
  const handlePageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setCurrentPage(Number(e.target.value)));
  };
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

  return (
    <div className="px-6 py-4 grid gap-3 md:flex md:justify-between md:items-center border-t border-gray-200 dark:border-gray-700">
      {/* Page selection */}
      <div className="inline-flex items-center gap-x-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">Showing:</p>
        <div className="max-w-sm space-y-3">
          <select
            className="py-2 px-3 pr-9 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
            onChange={handlePageChange}
            value={currentPage}
          >
            {pageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          of {totalPages}
        </p>
      </div>

      {/* Pagination buttons */}
      <div className="inline-flex gap-x-2">
        <Button
          type="button"
          onClick={prevPage}
          disabled={currentPage <= 1}
          className="py-2 px-3 inline-flex justify-center items-center gap-2 rounded-md border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800"
        >
          {/* SVG for Previous */}
          {/* ... */}
          Prev
        </Button>
        <Button
          type="button"
          onClick={nextPage}
          disabled={currentPage >= totalPages}
          className="py-2 px-3 inline-flex justify-center items-center gap-2 rounded-md border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800"
        >
          Next
          {/* SVG for Next */}
          {/* ... */}
        </Button>
      </div>
    </div>
  );
};

export default TablePagination;

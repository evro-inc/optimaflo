'use client';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectTable, setCurrentPage } from '@/src/app/redux/tableSlice';

function ButtonNext({ workspaces }) {

  const dispatch = useDispatch();
  const { currentPage, itemsPerPage } = useSelector(selectTable);
  const totalPages = Math.ceil(
    (workspaces ? workspaces.length : 0) / itemsPerPage
  );

  const nextPage = () => {
    console.log('Current Page:', currentPage);
    console.log('Total Pages:', totalPages);
    if (currentPage < totalPages) {
      dispatch(setCurrentPage(currentPage + 1));
    }
  };
  return (
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
  );
}

export default ButtonNext;

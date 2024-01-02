'use client';
import React from 'react';
import { useDispatch } from 'react-redux';
import { setCurrentPage } from '@/src/app/redux/tableSlice';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/src/components/ui/pagination';

const TablePagination = ({ currentPage, totalPages }) => {
  const dispatch = useDispatch();

  const changePage = (newPage) => {
    dispatch(setCurrentPage(newPage));
  };

  const isPreviousDisabled = currentPage === 1;
  const isNextDisabled = currentPage === totalPages || totalPages === 1;

  return (
    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => !isPreviousDisabled && changePage(currentPage - 1)}
              aria-disabled={isPreviousDisabled}
              className={
                isPreviousDisabled ? 'opacity-50 cursor-not-allowed' : ''
              }
              href="#"
            />
          </PaginationItem>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
            <PaginationItem key={number}>
              <PaginationLink
                onClick={() => changePage(number)}
                isActive={number === currentPage}
                href="#"
              >
                {number}
              </PaginationLink>
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={() => !isNextDisabled && changePage(currentPage + 1)}
              aria-disabled={isNextDisabled}
              className={isNextDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              href="#"
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

export default TablePagination;

'use client';
import React from 'react';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/src/components/ui/pagination';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const TablePagination = ({ totalPages }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get('page')) || 1;
  const { push } = useRouter();

  const changePage = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNumber.toString());
    push(`${pathname}?${params.toString()}`);
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

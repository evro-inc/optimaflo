'use client';
 

import Link from 'next/link';
import { usePaginate } from '@/src/lib/paginate';
import { usePathname, useSearchParams } from 'next/navigation';
 
export default function Pagination({ totalPages }: { totalPages: number }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentPage = Number(searchParams.get('page')) || 1;
    const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', pageNumber.toString());
        return `${pathname}?${params.toString()}`;
    };
    const pageOptions = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
    <div className="pagination">
      {/* Previous Page */}
      {currentPage > 1 && (
        <Link href={createPageURL(currentPage - 1)}>
          Previous
        </Link>
      )}

      {/* Page Numbers */}
      {pageOptions.map((pageNumber) => (
        <Link key={pageNumber} href={createPageURL(pageNumber)} className={pageNumber === currentPage ? 'active' : ''}>
            {pageNumber}
        </Link>
      ))}

      {/* Next Page */}
      {currentPage < totalPages && (
        <Link href={createPageURL(currentPage + 1)}>
         Next
        </Link>
      )}
    </div>
  );
}
'use client';
import { selectTable } from '@/src/app/redux/tableSlice';
import React from 'react';
import { useSelector } from 'react-redux';

function TotalPages({ mergedData }: { mergedData: any[] }) {
  const { itemsPerPage } = useSelector(selectTable);
  const totalPages = Math.ceil(
    (mergedData ? mergedData.length : 0) / itemsPerPage
  );
  return (
    <p className="text-sm text-gray-600 dark:text-gray-400">of {totalPages}</p>
  );
}

export default TotalPages;

'use client';
import { useSelector } from 'react-redux';
import { selectTable } from '../redux/tableSlice';

export function usePaginate(param) {
  const { itemsPerPage, currentPage } = useSelector(selectTable);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = param ? param.slice(indexOfFirstItem, indexOfLastItem) : [];

  return currentItems;
}

// TableRow.jsx
import React from 'react';
import { TableCell, TableRow } from '@/src/components/ui/table';

const TableRows = ({ item, columns }) => {
  return (
    <TableRow>
      {columns.map((column, index) => (
        <TableCell key={index} className="px-6 py-2">
          {column.render(item)}
        </TableCell>
      ))}
    </TableRow>
  );
};

export default TableRows;

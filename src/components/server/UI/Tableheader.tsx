// TableHeader.jsx
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Checkbox } from '@/src/components/ui/checkbox';

interface TableHeaderProps {
  headers: string[];
  toggleAll: () => void;
  allSelected: boolean;
}

const TableHeaderRow: React.FC<TableHeaderProps> = ({
  headers,
  toggleAll,
  allSelected,
}) => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead scope="col">
          <Checkbox
            id="select-all"
            checked={allSelected}
            onCheckedChange={toggleAll}
          />
        </TableHead>

        {headers.map((header, index) => (
          <TableHead key={index} scope="col">
            {header}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
};

export default TableHeaderRow;

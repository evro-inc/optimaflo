// TableHeader.jsx
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import ToggleAll from '../../client/UI/InputToggleAll';

interface TableHeaderProps {
  headers: string[];
  items: any[];
  uniqueKeys: string[];
}

const TableHeaderRow: React.FC<TableHeaderProps> = ({ headers, items, uniqueKeys }) => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead scope="col">
          <ToggleAll items={items} uniqueKeys={uniqueKeys} />
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

// TableHeader.jsx
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Checkbox } from "@/src/components/ui/checkbox"

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
        <TableHead scope="col" className="pl-6 py-3 text-left">
          <Checkbox id="select-all" checked={allSelected} onCheckedChange={toggleAll} />
        </TableHead>

        {headers.map((header, index) => (
          <TableHead key={index} scope="col" className="px-6 py-3 text-left">
            <div className="flex items-center gap-x-2">
              <span className="text-xs font-semibold uppercase tracking-wide">
                {header}
              </span>
            </div>
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
};

export default TableHeaderRow;

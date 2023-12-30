// TableHeader.jsx
import React from 'react';

interface TableHeaderProps {
  headers: string[];
  toggleAll: () => void;
  allSelected: boolean;
}

const TableHeader: React.FC<TableHeaderProps> = ({
  headers,
  toggleAll,
  allSelected,
}) => {
  return (
    <thead className="bg-gray-50 dark:bg-slate-900">
      <tr>
        <th scope="col" className="pl-6 py-3 text-left">
          <input
            type="checkbox"
            onChange={toggleAll}
            checked={allSelected}
            // Other checkbox properties
          />
        </th>
        {headers.map((header, index) => (
          <th key={index} scope="col" className="px-6 py-3 text-left">
            <div className="flex items-center gap-x-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-800 dark:text-gray-200">
                {header}
              </span>
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
};

export default TableHeader;

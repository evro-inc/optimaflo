// TableRow.jsx
import React from 'react';

const TableRow = ({ item, columns }) => {
  return (
    <tr>
      {columns.map((column, index) => (
        <td key={index} className="px-6 py-2 whitespace-nowrap">
          {column.render(item)}
        </td>
      ))}
    </tr>
  );
};

export default TableRow;

'use client';
import {
  selectTable,
  setSelectedRows,
  toggleAllSelected,
} from '@/src/redux/tableSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Checkbox } from '../../ui/checkbox';

function ToggleAll({ items, uniqueKeys }) {
  const dispatch = useDispatch();
  const { allSelected } = useSelector(selectTable);

  const toggleAll = () => {
    if (allSelected) {
      dispatch(setSelectedRows({}));
      dispatch(toggleAllSelected(false));
    } else {
      const newSelectedRows = {};

      items.forEach((item) => {
        const uniqueKey = uniqueKeys.map((key) => item[key]).join('-');
        newSelectedRows[uniqueKey] = item;
      });

      dispatch(setSelectedRows(newSelectedRows));
      dispatch(toggleAllSelected(true));
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id="select-all"
        checked={allSelected}
        onCheckedChange={toggleAll}
      />
      <label
        htmlFor="select-all"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Select All
      </label>
    </div>
  );
}

export default ToggleAll;

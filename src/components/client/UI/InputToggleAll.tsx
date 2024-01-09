'use client';
import {
  selectTable,
  setSelectedRows,
  toggleAllSelected,
} from '@/src/app/redux/tableSlice';
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
      console.log('newSelectedRows', newSelectedRows);
      

      dispatch(setSelectedRows(newSelectedRows));
      dispatch(toggleAllSelected(true));
    }
  };

  return (
    <Checkbox
      id="select-all"
      checked={allSelected}
      onCheckedChange={toggleAll}
    />
  );
}

export default ToggleAll;

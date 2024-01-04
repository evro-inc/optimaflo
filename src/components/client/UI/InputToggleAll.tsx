"use client";
import { selectTable, setSelectedRows, toggleAllSelected } from "@/src/app/redux/tableSlice";
import { useDispatch, useSelector } from "react-redux";
import { Checkbox } from "../../ui/checkbox";

function ToggleAll({ items, uniqueKeys }) {
  const dispatch = useDispatch();
  const { allSelected } = useSelector(selectTable);
  console.log("uniqueKeys", uniqueKeys);
  console.log("allSelected", allSelected);
  
  

  const toggleAll = () => {
    if (allSelected) {
      dispatch(setSelectedRows({}));
      dispatch(toggleAllSelected());
    } else {
      const newSelectedRows = {};
      console.log("items", items);
      
      items.forEach((item) => {
        const uniqueKey = uniqueKeys.map((key) => item[key]).join('-');
        newSelectedRows[uniqueKey] = item;
      });
      console.log("newSelectedRows", newSelectedRows);
      
      dispatch(setSelectedRows(newSelectedRows));
      dispatch(toggleAllSelected());
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
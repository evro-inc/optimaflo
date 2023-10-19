import { useSelector } from "react-redux";
import { selectTable } from "../app/redux/tableSlice";

export function usePaginate(workspaces) {
  const { itemsPerPage, currentPage } = useSelector(selectTable);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = workspaces ? workspaces.slice(indexOfFirstItem, indexOfLastItem) : [];
  
  return currentItems;
}

import React from 'react';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Alert, AlertTitle, AlertDescription } from '@/src/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../../ui/button';
import { setNotFoundError } from '@/src/redux/tableSlice';

export function NotFoundError({ onClose }) {
  // Use a selector to get the error details from the store
  const errorDetails = useSelector((state: any) => state.table.errorDetails);

  // Check if errorDetails is an array and has at least one item
  const hasErrorDetails = Array.isArray(errorDetails) && errorDetails.length > 0;

  const dispatch = useDispatch();

  const handleClose = () => {
    // Clear the error details from the store
    dispatch(setNotFoundError(false));
    onClose(); // Call the onClose prop function
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      {/* Overlay */}
      <Alert className="relative top-20 mx-auto p-5 w-96 shadow-lg rounded-md bg-white">
        <div className="flex flex-col items-center space-y-4">
          {/* Modal Container */}
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription className="text-center">
            Check if you have access to this feature. If you do, please contact the team that
            manages access to your GTM and your GA4 data flows.
            {hasErrorDetails ? (
              <Table className="mt-5 mb-5">
                <TableHeader>
                  <TableRow>
                    {errorDetails.some((errorItem) => errorItem.name === 'Unknown') ? (
                      <TableHead className="text-left">Message</TableHead>
                    ) : (
                      <TableHead className="text-left">Name</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorDetails.map((errorItem) => (
                    <TableRow key={errorItem.id}>
                      <TableCell className="text-left">
                        {errorItem.name === 'Unknown' ? errorItem.message : errorItem.name}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p>No specific details available.</p>
            )}
          </AlertDescription>
          {/* Close button */}
          <Button className="mt-5" type="button" onClick={handleClose}>
            Close
          </Button>
        </div>
      </Alert>
    </div>
  );
}

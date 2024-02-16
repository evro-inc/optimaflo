import React from 'react';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Alert, AlertTitle, AlertDescription } from '@/src/components/ui/alert';
import { Button } from '../../ui/button';

export function ErrorMessage({ onClose }) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      {/* Overlay */}
      <Alert className="relative top-20 mx-auto p-5 w-96 shadow-lg rounded-md bg-white">
        <div className="flex flex-col items-center space-y-4">
          {/* Modal Container */}
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          <AlertTitle>OTHER ERROR</AlertTitle>
          <AlertDescription className="text-center">TEST ERROR</AlertDescription>
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </Alert>
    </div>
  );
}

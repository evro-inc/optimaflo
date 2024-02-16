import React from 'react';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Alert, AlertTitle, AlertDescription } from '@/src/components/ui/alert';
import { Button } from '../../ui/button';

export function LimitReached({ onClose }) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      {' '}
      {/* Overlay */}
      <Alert className="relative top-20 mx-auto p-5 w-96 shadow-lg rounded-md bg-white">
        <div className="flex flex-col items-center space-y-4">
          {' '}
          {/* Modal Container */}
          <ExclamationTriangleIcon className="h-6 w-6 text-yellow" />
          <AlertTitle>Feature Limit Reached</AlertTitle>
          <AlertDescription className="text-center">
            You have reached the limit for this feature. Upgrade now to continue enjoying all the
            features.
          </AlertDescription>
          <div className="flex space-x-4">
            <Button type="button" onClick={() => (window.location.href = '/pricing')}>
              Upgrade
            </Button>
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
}

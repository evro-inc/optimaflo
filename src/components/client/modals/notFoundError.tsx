import React from 'react';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Alert, AlertTitle, AlertDescription } from '@/src/components/ui/alert';
import { Button } from '../../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { RefreshModal } from '../Button/Button';
import { useAuth } from '@clerk/nextjs';

export function NotFoundError({ feature, accounts }) {
  // Check if accounts is an array and has at least one account
  const hasAccountDetails = Array.isArray(accounts) && accounts.length > 0;
  const { userId } = useAuth();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      {/* Overlay */}
      <Alert className="relative top-20 mx-auto p-5 w-96 shadow-lg rounded-md bg-white">
        <div className="flex flex-col items-center space-y-4">
          {/* Modal Container */}
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription className="text-center">
            Check if you have access to this {feature}. If you do, please
            contact the team that manages access to your GTM container(s).
            {hasAccountDetails ? (
              <Table className="mt-5 mb-5">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Account Name</TableHead>
                    <TableHead className="text-left">Account ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.accountId}>
                      <TableCell className="text-left">
                        {account.name}
                      </TableCell>
                      <TableCell className="text-left">
                        {account.accountId}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p>No specific {feature} details available.</p>
            )}
          </AlertDescription>

          <RefreshModal
            type="button"
            userId={userId}
            feature="accounts"
            variant="create"
          />
        </div>
      </Alert>
    </div>
  );
}

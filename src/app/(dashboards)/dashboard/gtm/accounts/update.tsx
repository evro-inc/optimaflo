'use client'; // Ensures that this file is only used in a client-side environment

// Importing necessary hooks and functions from Redux and other libraries
import { useDispatch, useSelector } from 'react-redux';
import {
  clearSelectedRows,
  selectTable,
  setIsLimitReached,
  setNotFoundError,
  toggleAllSelected,
} from '@/src/app/redux/tableSlice';
import { selectIsLoading, setLoading } from '@/src/app/redux/globalSlice';
import { useEffect, useRef, useState } from 'react';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateAccounts } from '@/src/lib/fetch/dashboard/gtm/actions/accounts';
import logger from '@/src/lib/logger';
import { z } from 'zod';
import { UpdateAccountSchema } from '@/src/lib/schemas/accounts';
import { AnimatePresence, motion } from 'framer-motion';
import { ButtonGroup } from '../../../../../components/client/ButtonGroup/ButtonGroup';
import { LimitReached } from '../../../../../components/client/modals/limitReached';
import { UpdateAccountResult } from '@/src/lib/types/types';
import { Icon } from '@/src/components/client/Button/Button';
import { Cross1Icon } from '@radix-ui/react-icons';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/src/components/ui/form';
import { Input } from '@/src/components/ui/input';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';


// Defining the type for form data using Zod
type Forms = z.infer<typeof UpdateAccountSchema>;

// Functional component for updating account forms
function AccountFormUpdate({ showOptions, onClose, selectedRows, setAccountInfo }) {
  // Using Redux hooks for dispatching actions and selecting state
  const dispatch = useDispatch();
  const { isLimitReached, notFoundError } = useSelector(selectTable);
  const isLoading = useSelector(selectIsLoading);



  // useRef to keep track of form elements
  const formRefs = useRef<(HTMLFormElement | null)[]>([]);

  // Setting up form handling using react-hook-form with Zod for validation
  const form = useForm<Forms>({
    defaultValues: {
      forms: [{ accountId: '', name: '' }],
    },
    resolver: zodResolver(UpdateAccountSchema),
  });

  // Managing dynamic form fields using react-hook-form
  const { fields } = useFieldArray({ control: form.control, name: 'forms' });

  // useEffect to reset form values based on selected rows
  useEffect(() => {
    const initialForms = Object.values(selectedRows).map((account: any) => ({
      accountId: account?.accountId || '',
      name: account?.name || '',
    }));
    form.reset({ forms: initialForms });
  }, [selectedRows, form]);

  // Function to process form submission
// Function to process form submission
const processForm: SubmitHandler<Forms> = async (data) => {
  const { forms } = data;

  // Dispatching loading state
  dispatch(setLoading(true));

  try {
    // Updating accounts with the API call
    const res = await updateAccounts({ forms }) as UpdateAccountResult;

    // Check for successful updates and show toasts
    if (res && res.updatedAccounts) {
      res.updatedAccounts.forEach(account => {
        toast.success(`Account ${account.name} (ID: ${account.accountId}) updated successfully.`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
      });
    }

    // Then check if there's a limit reached error
    if (res && res.limitReached) {
      dispatch(setIsLimitReached(true));
    }

    // Lastly, check for not found errors
    if (res && res.notFoundError && res.notFoundIds) {
      const notFoundAccounts = forms.filter(form => res?.notFoundIds?.includes(form.accountId));

      if (notFoundAccounts.length > 0) {
        setAccountInfo(notFoundAccounts);
        dispatch(setNotFoundError(true));
        toast.error(res.message || 'Some accounts were not found.', {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
      }
    }
  } catch (error) {
    logger.error('Error updating accounts:', error);
  } finally {
    // Always clear selected rows and close the form
    dispatch(clearSelectedRows());
    dispatch(toggleAllSelected(false));
    onClose();
    form.reset({ forms: [{ accountId: '', name: '' }] });
    dispatch(setLoading(false));
  }
};

  // Function to handle form close
  const handleClose = () => {
    dispatch(toggleAllSelected(false));
    form.reset({ forms: [{ accountId: '', name: '' }] });
    dispatch(clearSelectedRows());
    onClose();
  };

  return (
    <AnimatePresence>
      {showOptions && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 w-full h-full flex flex-col items-center justify-start z-50 bg-white overflow-y-auto"
        >
          {/* Close Button */}
          <Icon
            className="absolute top-5 right-5 font-bold py-2 px-4"
            text="Close"
            icon={<Cross1Icon />}
            variant="create"
            onClick={handleClose}
            billingInterval={undefined}
          />

          <ButtonGroup
            buttons={[
              {
                text: isLoading ? 'Submitting...' : 'Submit',
                type: 'submit',
                form: `updateAccount-${selectedRows[0]?.accountId}`,
              },
            ]}
          />

          <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-end">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
              >
                <div className="max-w-xl mx-auto">
                  <div className="mt-12"></div>
                  <Card
                    key={field.id}
                    className="w-full max-w-xl mx-auto bg-white shadow-md rounded-lg overflow-hidden"
                  >
                    <CardHeader className="bg-gray-100 p-4">
                      <CardTitle className="text-lg font-semibold">
                        Account {field.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Form {...form}>
                        <form
                          className="space-y-6"
                          ref={(el) => (formRefs.current[index] = el)}
                          onSubmit={form.handleSubmit(processForm)}
                          id={`updateAccount-${selectedRows[0]?.accountId}`}
                        >
                          <FormField
                            control={form.control}
                            name={`forms.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Container Name</FormLabel>
                                <FormDescription>
                                  Enter the new name of the account
                                </FormDescription>
                                <FormControl>
                                  <Input
                                    placeholder="Name of the account"
                                    {...form.register(`forms.${index}.name`)}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Add any additional fields following the same pattern */}
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>

                {/* Form and other UI elements */}
              </div>
            ))}
          </div>
        </motion.div>
      )}
      {isLimitReached && (
        <LimitReached onClose={() => dispatch(setIsLimitReached(false))} />
      )}

    </AnimatePresence>
  );
}

export default AccountFormUpdate;

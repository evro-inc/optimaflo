'use client';
import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import { LimitReached } from '../../../../../components/client/modals/limitReached';
import { ButtonGroup } from '../../../../../components/client/ButtonGroup/ButtonGroup';
import { FeatureResponse, FormCreateAccountProps } from '@/src/lib/types/types';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/lib/redux/tableSlice';
import { selectGlobal, setLoading } from '@/src/lib/redux/globalSlice';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { CreateAccountSchema } from '@/src/lib/schemas/ga/accounts';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

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
import { ButtonSubmitAlert, Icon } from '@/src/components/client/Button/Button';
import dynamic from 'next/dynamic';

const NotFoundErrorModal = dynamic(
  () =>
    import('../../../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

type Forms = z.infer<typeof CreateAccountSchema>;

const FormCreateAccount: React.FC<FormCreateAccountProps> = ({
  showOptions,
  onClose,
}) => {
  const formRefs = useRef<(HTMLFormElement | null)[]>([]);
  const dispatch = useDispatch();
  const { loading } = useSelector(selectGlobal);
  const isLimitReached = useSelector(selectTable).isLimitReached;
  const notFoundError = useSelector(selectTable).notFoundError;

  const form = useForm<Forms>({
    defaultValues: {
      forms: [
        {
          displayName: '',
        },
      ],
    },
    resolver: zodResolver(CreateAccountSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  const addForm = () => {
    append({
      displayName: '',
    });
  };

  const removeForm = () => {
    if (fields.length > 1) {
      remove(fields.length - 1);
    }
  };

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true)); // Set loading to true using Redux action
    toast('Creating accounts...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    // Check for duplicate account names for the same account
    const uniqueAccounts = new Set();

    for (const form of forms) {
      const identifier = form.displayName;
      if (uniqueAccounts.has(identifier)) {
        toast.error(`Duplicate account name found: ${form.displayName}.`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        dispatch(setLoading(false));
        return; // Stop the function if a duplicate is found
      }
      uniqueAccounts.add(identifier);
    }

    try {
      const response: any = (await createAccounts({
        forms,
      })) as FeatureResponse;

      if (response.success) {
        const accountTicketIds = response.results.map((result) => result.id);
        const newUrls = accountTicketIds.map(
          (accountTicketId) =>
            `https://analytics.google.com/analytics/web/?provisioningSignup=false#/termsofservice/${accountTicketId}`
        );
        const openUrlsInNewTab = (urls: string[]) => {
          urls.forEach((url) => {
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer'; // Security best practice
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
          });
        };

        openUrlsInNewTab(newUrls);
      } else {
        // If a notFoundError is present, override the message
        if (response.notFoundError) {
          response.results.forEach((result) => {
            if (result.notFound) {
              toast.error(
                `Unable to create account ${result.displayName}. Please check your access permissions. Any other accounts created were successful.`,
                {
                  action: {
                    label: 'Close',
                    onClick: () => toast.dismiss(),
                  },
                }
              );
            }
          });

          dispatch(setErrorDetails(response.results)); // Assuming results contain the error details
          dispatch(setNotFoundError(true)); // Dispatch the not found error action
          onClose();
        }

        if (response.limitReached) {
          response.results.forEach((result) => {
            if (result.limitReached) {
              toast.error(
                `Unable to create account ${result.name}. You have ${result.remaining} more account(s) you can create.`,
                {
                  action: {
                    label: 'Close',
                    onClick: () => toast.dismiss(),
                  },
                }
              );
            }
          });
          dispatch(setIsLimitReached(true));
          onClose();
        }

        onClose(); // Close the form
        form.reset({
          forms: [
            {
              displayName: '',
            },
          ],
        });
      }

      onClose();

      // Reset the forms here, regardless of success or limit reached
      form.reset({
        forms: [
          {
            displayName: '',
          },
        ],
      });
    } catch (error) {
      toast.error('An unexpected error occurred.', {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
      return { success: false };
    } finally {
      dispatch(setLoading(false)); // Set loading to false
    }
  };

  const handleClose = () => {
    // Reset the forms to their initial state
    form.reset({
      forms: [
        {
          displayName: '',
        },
      ],
    });

    // Close the modal
    onClose();
  };

  return (
    <>
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
            <div className="flex items-center justify-between py-3 px-4 mt-5 gap-4">
              <ButtonGroup
                buttons={[
                  { text: 'Add Form', onClick: addForm },
                  { text: 'Remove Form', onClick: removeForm },
                ]}
              />

              <ButtonSubmitAlert
                text={loading ? 'Submitting...' : 'Submit'}
                form="createAccount"
              />
            </div>

            <div className="account mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-end">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
                >
                  <div className="max-w-xl mx-auto">
                    <div className="mt-12">
                      {/* Form */}

                      <Card className="w-full max-w-xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
                        <CardHeader className="bg-gray-100 p-4">
                          <CardTitle className="text-lg font-semibold">
                            Account {index + 1}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <Form {...form}>
                            <form
                              ref={(el) => (formRefs.current[index] = el)}
                              onSubmit={form.handleSubmit(processForm)}
                              id="createAccount"
                              className="space-y-6"
                            >
                              <FormField
                                control={form.control}
                                name={`forms.${index}.displayName`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>New Account Name</FormLabel>
                                    <FormDescription>
                                      This is the account name you want to
                                      create.
                                    </FormDescription>
                                    <FormControl>
                                      <Input
                                        placeholder="Name of the account"
                                        {...form.register(
                                          `forms.${index}.displayName`
                                        )}
                                        {...field}
                                      />
                                    </FormControl>

                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </form>
                          </Form>
                        </CardContent>
                      </Card>
                      {/* End Form */}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* End Hire Us */}
          </motion.div>
        )}
      </AnimatePresence>

      {isLimitReached && (
        <LimitReached onClose={() => dispatch(setIsLimitReached(false))} />
      )}

      {notFoundError && <NotFoundErrorModal />}
    </>
  );
};

export default FormCreateAccount;

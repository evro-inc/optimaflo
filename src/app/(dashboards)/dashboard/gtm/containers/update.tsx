'use client';
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UpdateContainers } from '@/src/lib/fetch/dashboard/gtm/actions/containers';
import { LimitReached } from '../../../../../components/client/modals/limitReached';
import { ButtonGroup } from '../../../../../components/client/ButtonGroup/ButtonGroup';
import { z } from 'zod';
import { UpdateContainerSchema } from '@/src/lib/schemas/containers';
import {
  clearSelectedRows,
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/app/redux/tableSlice';
import { selectIsLoading, setLoading } from '@/src/app/redux/globalSlice';
import { useDispatch, useSelector } from 'react-redux';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ContainersResponse,
  FormUpdateContainerProps,
} from '@/src/lib/types/types';

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

import { Icon } from '@/src/components/client/Button/Button';
import { toast } from 'sonner';

// Type for the entire form data
type Forms = z.infer<typeof UpdateContainerSchema>;

// Component
const FormUpdateContainer: React.FC<FormUpdateContainerProps> = ({
  showOptions,
  onClose,
  selectedRows,
}) => {
  const dispatch = useDispatch();
  const { isLimitReached } = useSelector(selectTable);
  const isLoading = useSelector(selectIsLoading);
  const formRefs = useRef<(HTMLFormElement | null)[]>([]);

  const form = useForm<Forms>({
    defaultValues: {
      forms: [
        {
          accountId: '',
          usageContext: '',
          containerName: '',
          domainName: '',
          notes: '',
          containerId: '',
        },
      ],
    },
    resolver: zodResolver(UpdateContainerSchema),
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  useEffect(() => {
    const initialForms = Object.values(selectedRows).map((rowData: any) => {
      const accountId = rowData?.accountId || '';
      const containerName = rowData?.name || '';
      const domainName = Array.isArray(rowData?.domainName)
        ? rowData?.domainName.join(', ')
        : rowData?.domainName || '';
      const notes = rowData?.notes || '';
      const usageContext = rowData?.usageContext ? rowData.usageContext[0] : '';

      const containerId = rowData?.containerId || '';

      return {
        accountId,
        usageContext,
        containerName,
        domainName,
        notes,
        containerId,
      };
    });

    form.reset({ forms: initialForms });
  }, [selectedRows, form]);

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true)); // Set loading to true

    toast('Updating containers...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    try {
      // If you're here, validation succeeded. Proceed with UpdateContainers.
      const res = (await UpdateContainers({ forms })) as ContainersResponse;
      dispatch(clearSelectedRows()); // Clear selectedRows

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(`Successfully updated container: ${result.name}`, {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            });
          }
        });
      } else {
        // If a notFoundError is present, override the message
        if (res.notFoundError) {
          res.results.forEach((result) => {
            if (result.notFound) {
              toast.error(
                `Unable to update container ${result.name}. Please check your access permissions. Any other containers updated were successful.`,
                {
                  action: {
                    label: 'Close',
                    onClick: () => toast.dismiss(),
                  },
                }
              );
            }
          });

          dispatch(setErrorDetails(res.results)); // Assuming results contain the error details
          dispatch(setNotFoundError(true)); // Dispatch the not found error action
          onClose();
        }

        if (res.limitReached) {
          res.results.forEach((result) => {
            if (result.limitReached) {
              toast.error(
                `Unable to update container ${result.name}. You have ${result.remaining} more container(s) you can update.`,
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
              accountId: '',
              usageContext: '',
              containerName: '',
              domainName: '',
              notes: '',
              containerId: '',
            },
          ],
        });
      }

      // close the modal
      onClose();

      // Reset the forms here, regardless of success or limit reached
      form.reset({
        forms: [
          {
            accountId: '',
            usageContext: '',
            containerName: '',
            domainName: '',
            notes: '',
            containerId: '',
          },
        ],
      });
    } catch (error: any) {
      throw new Error(error);
    } finally {
      dispatch(setLoading(false)); // Set loading to false
    }
  };

  const handleClose = () => {
    // Reset the forms to their initial state
    form.reset({
      forms: [
        {
          accountId: '',
          usageContext: '',
          containerName: '',
          domainName: '',
          notes: '',
          containerId: '',
        },
      ],
    });

    dispatch(clearSelectedRows()); // Clear selectedRows

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
              variant="update"
              onClick={handleClose}
              billingInterval={undefined}
            />

            <ButtonGroup
              buttons={[
                {
                  text: isLoading ? 'Submitting...' : 'Submit',
                  type: 'submit',
                  form: `updateContainer-${selectedRows[0]?.containerId}`,
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
                    <Card
                      key={field.id}
                      className="w-full max-w-xl mx-auto bg-white shadow-md rounded-lg overflow-hidden"
                    >
                      <CardHeader className="bg-gray-100 p-4">
                        <CardTitle className="text-lg font-semibold">
                          Container {index + 1}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Form {...form}>
                          <form
                            ref={(el) => (formRefs.current[index] = el)}
                            onSubmit={form.handleSubmit(processForm)}
                            id={`updateContainer-${selectedRows[0]?.containerId}`}
                            className="space-y-6"
                          >
                            <FormField
                              control={form.control}
                              name={`forms.${index}.containerName`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>New Container Name</FormLabel>
                                  <FormDescription>
                                    Enter the new name of the container
                                  </FormDescription>
                                  <FormControl>
                                    <Input
                                      placeholder="Name of the container"
                                      {...form.register(
                                        `forms.${index}.containerName`
                                      )}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`forms.${index}.accountId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Account</FormLabel>
                                  <FormDescription>
                                    This is the account ID of the container
                                    (read only)
                                  </FormDescription>
                                  <FormControl>
                                    <Input
                                      readOnly
                                      {...form.register(
                                        `forms.${index}.accountId`
                                      )}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`forms.${index}.usageContext`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Usage Context</FormLabel>
                                  <FormDescription>
                                    This is the usage context of the container
                                    (read only)
                                  </FormDescription>
                                  <FormControl>
                                    <Input
                                      readOnly
                                      {...form.register(
                                        `forms.${index}.usageContext`
                                      )}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`forms.${index}.domainName`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    Domain Name: Optional (Must be comma
                                    separated)
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter domain names separated by commas"
                                      {...form.register(
                                        `forms.${index}.domainName`
                                      )}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`forms.${index}.notes`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Notes: Optional</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter any notes you want"
                                      {...form.register(`forms.${index}.notes`)}
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
    </>
  );
};

export default FormUpdateContainer;

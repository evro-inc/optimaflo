'use client';
import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreateContainers } from '@/src/lib/fetch/dashboard/gtm/actions/containers';
import { LimitReached } from '../../../../../components/client/modals/limitReached';
import { ButtonGroup } from '../../../../../components/client/ButtonGroup/ButtonGroup';
import {
  FeatureResponse,
  FormCreateContainerProps,
} from '@/src/lib/types/types';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/app/redux/tableSlice';
import { selectGlobal, setLoading } from '@/src/app/redux/globalSlice';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { CreateContainerSchema } from '@/src/lib/schemas/containers';
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Icon } from '@/src/components/client/Button/Button';
import dynamic from 'next/dynamic';

const NotFoundErrorModal = dynamic(
  () =>
    import('../../../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

type Forms = z.infer<typeof CreateContainerSchema>;

const FormCreateContainer: React.FC<FormCreateContainerProps> = ({
  showOptions,
  onClose,
  accounts = [],
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
          accountId: '',
          usageContext: '',
          containerName: '',
          domainName: '',
          notes: '',
          containerId: '',
        },
      ],
    },
    resolver: zodResolver(CreateContainerSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  const addForm = () => {
    append({
      accountId: '',
      usageContext: '',
      containerName: '',
      domainName: '',
      notes: '',
      containerId: '',
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
    toast('Creating containers...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    // Check for duplicate container names for the same account
    const uniqueContainers = new Set();
    for (const form of forms) {
      const identifier = `${form.accountId}-${form.containerName}`;
      if (uniqueContainers.has(identifier)) {
        toast.error(
          `Duplicate container name found: ${form.containerName} for account ${form.accountId}`,
          {
            action: {
              label: 'Close',
              onClick: () => toast.dismiss(),
            },
          }
        );
        dispatch(setLoading(false));
        return; // Stop the function if a duplicate is found
      }
      uniqueContainers.add(identifier);
    }

    try {
      const response: any = (await CreateContainers({
        forms,
      })) as FeatureResponse;

      if (response.success) {
        response.results.forEach((result) => {
          if (result.success) {
            toast.success(`Successfully created container: ${result.name}`, {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            });
          }
        });
      } else {
        // If a notFoundError is present, override the message
        if (response.notFoundError) {
          response.results.forEach((result) => {
            if (result.notFound) {
              toast.error(
                `Unable to create container ${result.name}. Please check your access permissions. Any other containers created were successful.`,
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
                `Unable to create container ${result.name}. You have ${result.remaining} more container(s) you can create.`,
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
          accountId: '',
          usageContext: '',
          containerName: '',
          domainName: '',
          notes: '',
          containerId: '',
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

            <ButtonGroup
              buttons={[
                { text: 'Add Form', onClick: addForm },
                { text: 'Remove Form', onClick: removeForm },
                {
                  text: loading ? 'Submitting...' : 'Submit',
                  type: 'submit',
                  form: 'createContainer',
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
                    <div className="mt-12">
                      {/* Form */}

                      <Card className="w-full max-w-xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
                        <CardHeader className="bg-gray-100 p-4">
                          <CardTitle className="text-lg font-semibold">
                            Container {index + 1}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <Form {...form}>
                            <form
                              ref={(el) => (formRefs.current[index] = el)}
                              onSubmit={form.handleSubmit(processForm)}
                              id="createContainer"
                              className="space-y-6"
                            >
                              <FormField
                                control={form.control}
                                name={`forms.${index}.containerName`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>New Container Name</FormLabel>
                                    <FormDescription>
                                      This is the container name you want to
                                      create.
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
                                      This is the account you want to create the
                                      container in.
                                    </FormDescription>
                                    <FormControl>
                                      <Select
                                        {...form.register(
                                          `forms.${index}.accountId`
                                        )}
                                        {...field}
                                        onValueChange={field.onChange}
                                      >
                                        <SelectTrigger className="w-[180px]">
                                          <SelectValue placeholder="Select an account." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectGroup>
                                            <SelectLabel>Account</SelectLabel>
                                            {Array.isArray(accounts) &&
                                              accounts.map((account: any) => (
                                                <SelectItem
                                                  key={account.accountId}
                                                  value={account.accountId}
                                                >
                                                  {account.name}
                                                </SelectItem>
                                              ))}
                                          </SelectGroup>
                                        </SelectContent>
                                      </Select>
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
                                      Add a usage context for the container.
                                    </FormDescription>
                                    <FormControl>
                                      <Select
                                        {...form.register(
                                          `forms.${index}.usageContext`
                                        )}
                                        {...field}
                                        onValueChange={field.onChange}
                                      >
                                        <SelectTrigger className="w-[180px]">
                                          <SelectValue placeholder="Select an account." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectGroup>
                                            <SelectLabel>Account</SelectLabel>
                                            <SelectItem value="web">
                                              Web
                                            </SelectItem>
                                            <SelectItem value="androidSdk5">
                                              Android
                                            </SelectItem>
                                            <SelectItem value="iosSdk5">
                                              IOS
                                            </SelectItem>
                                          </SelectGroup>
                                        </SelectContent>
                                      </Select>
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
                                    <FormDescription>
                                      This is the domain name you want to add.
                                    </FormDescription>
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
                                    <FormDescription>
                                      This is the domain name you want to add.
                                    </FormDescription>
                                    <FormControl>
                                      <Input
                                        placeholder="Enter any notes you want"
                                        {...form.register(
                                          `forms.${index}.notes`
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

export default FormCreateContainer;

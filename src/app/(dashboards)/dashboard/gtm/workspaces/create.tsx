'use client';
import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LimitReached } from '../../../../../components/client/modals/limitReached';
import { ButtonGroup } from '../../../../../components/client/ButtonGroup/ButtonGroup';
import {
  FeatureResponse,
  FormCreateWorkspaceProps,
} from '@/src/lib/types/types';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/lib/redux/tableSlice';
import { selectGlobal, setLoading } from '@/src/lib/redux/globalSlice';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { CreateWorkspaceSchema } from '@/src/lib/schemas/gtm/workspaces';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateWorkspaces } from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';
import dynamic from 'next/dynamic';
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
import { Button } from '@/src/components/ui/button';

const NotFoundErrorModal = dynamic(
  () =>
    import('../../../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

type Forms = z.infer<typeof CreateWorkspaceSchema>;

const FormCreateWorkspace: React.FC<FormCreateWorkspaceProps> = ({
  showOptions,
  onClose,
  accounts = [],
  table = [],
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
          accountId: table[0].accountId,
          name: '',
          description: '',
          containerId: '',
        },
      ],
    },
    resolver: zodResolver(CreateWorkspaceSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  const addForm = () => {
    append({
      accountId: table[0].accountId,
      name: '',
      description: '',
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

    toast('Creating workspaces...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueWorkspaces = new Set(forms.map((form) => form.containerId));
    for (const form of forms) {
      const identifier = `${form.accountId}-${form.containerId}-${form.name}`;
      if (uniqueWorkspaces.has(identifier)) {
        toast.error(
          `Duplicate workspace found for ${form.accountId} - ${form.containerId} - ${form.name}`,
          {
            action: {
              label: 'Close',
              onClick: () => toast.dismiss(),
            },
          }
        );
        dispatch(setLoading(false));
        return;
      }
      uniqueWorkspaces.add(identifier);
    }

    try {
      const res = (await CreateWorkspaces({ forms })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Workspace ${result.name} created successfully. The table will update shortly.`,
              {
                action: {
                  label: 'Close',
                  onClick: () => toast.dismiss(),
                },
              }
            );
          }
        });
      } else {
        if (res.notFoundError) {
          res.results.forEach((result) => {
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

          dispatch(setErrorDetails(res.results)); // Assuming results contain the error details
          dispatch(setNotFoundError(true)); // Dispatch the not found error action
          onClose();
        }

        if (res.limitReached) {
          res.results.forEach((result) => {
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
              name: '',
              description: '',
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
            name: '',
            description: '',
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
          name: '',
          description: '',
          containerId: '',
        },
      ],
    });

    // Close the modal
    onClose();
  };

  const accountIdsWithContainers = new Set(
    table.map((workspace) => workspace.accountId)
  );

  const accountsWithContainers = accounts.filter((account) =>
    accountIdsWithContainers.has(account.accountId)
  );

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

            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="absolute top-5 right-5 font-bold"
            >
              <Cross1Icon className="h-4 w-4" />{' '}
              <span className="sr-only">Close</span>
            </Button>

            <div className="flex items-center justify-between py-3 px-4 mt-5 gap-4">
              <ButtonGroup
                buttons={[
                  { text: 'Add Form', onClick: addForm },
                  { text: 'Remove Form', onClick: removeForm },
                  {
                    text: loading ? 'Submitting...' : 'Submit',
                    type: 'submit',
                    form: 'createWorkspace',
                  },
                ]}
              />
            </div>

            <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-end">
              {fields.map((field, index) => {
                const selectedAccountId = form.watch(
                  `forms.${index}.accountId`
                );

                // Filter workspaces to only include those that belong to the selected account
                const filteredWorkspaces = table.filter(
                  (workspace) => workspace.accountId === selectedAccountId
                );

                // Create a Set to store unique container IDs
                const uniqueContainerIds = new Set(
                  filteredWorkspaces.map((ws) => ws.containerId)
                );

                // Filter the workspaces again to only include unique containers
                const uniqueFilteredWorkspaces = filteredWorkspaces.filter(
                  (workspace, idx, self) =>
                    idx ===
                    self.findIndex(
                      (w) =>
                        w.containerId === workspace.containerId &&
                        uniqueContainerIds.has(w.containerId)
                    )
                );

                return (
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
                              Workspace {index + 1}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <Form {...form}>
                              <form
                                ref={(el) => (formRefs.current[index] = el)}
                                onSubmit={form.handleSubmit(processForm)}
                                id="createWorkspace"
                                className="space-y-6"
                              >
                                <FormField
                                  control={form.control}
                                  name={`forms.${index}.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>New Workspace Name</FormLabel>
                                      <FormDescription>
                                        This is the workspace name you want to
                                        create.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Name of the workspace"
                                          {...form.register(
                                            `forms.${index}.name`
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
                                        This is the account you want to create
                                        the container in.
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
                                              {accountsWithContainers.map(
                                                (account) => (
                                                  <SelectItem
                                                    key={account.accountId}
                                                    value={account.accountId}
                                                  >
                                                    {account.name}
                                                  </SelectItem>
                                                )
                                              )}
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
                                  name={`forms.${index}.containerId`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Container</FormLabel>
                                      <FormDescription>
                                        Which container do you want to create
                                        the workspace in?
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(
                                            `forms.${index}.containerId`
                                          )}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select a container." />
                                          </SelectTrigger>

                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>
                                                Containers
                                              </SelectLabel>
                                              {uniqueFilteredWorkspaces.length >
                                              0 ? (
                                                uniqueFilteredWorkspaces.map(
                                                  (workspace) => (
                                                    <SelectItem
                                                      key={
                                                        workspace.containerId
                                                      }
                                                      value={
                                                        workspace.containerId
                                                      }
                                                    >
                                                      {workspace.containerName}
                                                    </SelectItem>
                                                  )
                                                )
                                              ) : (
                                                <SelectItem value="" disabled>
                                                  No containers available
                                                </SelectItem>
                                              )}
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
                                  name={`forms.${index}.description`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description:</FormLabel>
                                      <FormDescription>
                                        This is a description of the workspace.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Enter your description"
                                          {...form.register(
                                            `forms.${index}.description`
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
                );
              })}
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

export default FormCreateWorkspace;

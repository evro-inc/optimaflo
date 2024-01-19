'use client';
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LimitReached } from '../../modals/limitReached';
import { ButtonGroup } from '../../ButtonGroup/ButtonGroup';
import { z } from 'zod';
import { UpdateWorkspaceSchema } from '@/src/lib/schemas/workspaces';
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
  FeatureResponse,
  FormUpdateWorkspaceProps,
} from '@/src/lib/types/types';

import { UpdateWorkspaces } from '@/src/lib/fetch/dashboard/gtm/actions/workspaces';
import { toast } from 'sonner';
import { Icon } from '../../Button/Button';
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

const NotFoundErrorModal = dynamic(
  () =>
    import('../../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

// Type for the entire form data
type Forms = z.infer<typeof UpdateWorkspaceSchema>;

// Component
const FormUpdateWorkspace: React.FC<FormUpdateWorkspaceProps> = ({
  showOptions,
  onClose,
  selectedRows,
}) => {
  const isLoading = useSelector(selectIsLoading);
  const formRefs = useRef<(HTMLFormElement | null)[]>([]);
  const dispatch = useDispatch();
  const isLimitReached = useSelector(selectTable).isLimitReached;
  const notFoundError = useSelector(selectTable).notFoundError;

  const form = useForm<Forms>({
    defaultValues: {
      forms: [
        {
          accountId: '',
          workspaceId: '',
          name: '',
          description: '',
          containerId: '',
        },
      ],
    },
    resolver: zodResolver(UpdateWorkspaceSchema),
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  useEffect(() => {
    const initialForms = Object.values(selectedRows).map((rowData: any) => {
      const accountId = rowData?.accountId || '';
      const containerId = rowData?.containerId || '';
      const workspaceId = rowData?.workspaceId || '';
      const name = rowData?.name || '';
      const description = rowData?.description || '';

      return {
        accountId,
        containerId,
        workspaceId,
        name,
        description,
      };
    });

    form.reset({ forms: initialForms });
  }, [selectedRows, form]);

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true)); // Set loading to true

    toast('Updating workspaces...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    try {
      // If you're here, validation succeeded. Proceed with updateContainers.
      const res = (await UpdateWorkspaces({ forms })) as FeatureResponse;

      dispatch(clearSelectedRows()); // Clear selectedRows

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
          workspaceId: '',
          name: '',
          description: '',
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
              variant="create"
              onClick={handleClose}
              billingInterval={undefined}
            />
            <ButtonGroup
              buttons={[
                {
                  text: isLoading ? 'Submitting...' : 'Submit',
                  type: 'submit',
                  form: 'updateContainer',
                },
              ]}
            />

            {/* Hire Us */}
            <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-end">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
                >
                  <div className="max-w-xl mx-auto">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-gray-800 sm:text-4xl dark:text-white">
                        {field.name || `Workspace ${index + 1}`}
                      </p>
                    </div>

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
                              id="updateContainer"
                              className="space-y-6"
                            >
                              <FormField
                                control={form.control}
                                name={`forms.${index}.name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Workspace Name To Update
                                    </FormLabel>
                                    <FormDescription>
                                      This is the workspace name you want to
                                      update.
                                    </FormDescription>
                                    <FormControl>
                                      <Input
                                        defaultValue={field.name}
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

export default FormUpdateWorkspace;

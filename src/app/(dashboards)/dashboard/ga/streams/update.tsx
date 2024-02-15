'use client';
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ButtonGroup } from '@/components/client/ButtonGroup/ButtonGroup';
import {
  FeatureResponse,
  FormUpdateProps,
  GA4StreamType,
} from '@/src/types/types';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { selectGlobal, setLoading } from '@/src/redux/globalSlice';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Button } from '@/src/components/ui/button';
import { FormsSchema } from '@/src/lib/schemas/ga/streams';
import { LimitReached } from '@/src/components/client/modals/limitReached';
import { z } from 'zod';
import { updateGAPropertyStreams } from '@/src/lib/fetch/dashboard/actions/ga/streams';

const NotFoundErrorModal = dynamic(
  () =>
    import('@/components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

type Forms = z.infer<typeof FormsSchema>;

const FormUpdateStream: React.FC<FormUpdateProps> = ({
  showOptions,
  onClose,
  selectedRows = [],
}) => {
  const dispatch = useDispatch();
  const { loading } = useSelector(selectGlobal);
  const isLimitReached = useSelector(selectTable).isLimitReached;
  const notFoundError = useSelector(selectTable).notFoundError;

  const formDataDefaults: GA4StreamType = {
    account: selectedRows[0].accountName,
    property: selectedRows[0].parent,
    displayName: selectedRows[0].displayName,
    parentURL: selectedRows[0].name,
    type: selectedRows[0].type,
    webStreamData: {
      defaultUri: selectedRows[0].webStreamData?.defaultUri || '',
    },
    androidAppStreamData: {
      packageName: selectedRows[0].androidAppStreamData?.packageName || '',
    },
    iosAppStreamData: {
      bundleId: selectedRows[0].iosAppStreamData?.bundleId || '',
    },
    name: '',
    accountId: '',
    parent: '',
  };

  const form = useForm<Forms>({
    defaultValues: {
      forms: [formDataDefaults],
    },
    resolver: zodResolver(FormsSchema),
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  useEffect(() => {
    const initialForms = Object.values(selectedRows).map((rowData: any) => {
      const { accountName, parent, displayName, name, type } = rowData;
      return {
        account: accountName,
        property: parent,
        displayName,
        parentURL: name,
        type,
        webStreamData: {
          defaultUri: '',
        },
        androidAppStreamData: {
          packageName: '',
        },
        iosAppStreamData: {
          bundleId: '',
        },
      };
    });
    form.reset({ forms: initialForms });
  }, [selectedRows, form]);

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true)); // Set loading to true using Redux action

    toast('Creating streams...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueStreams = new Set(forms.map((form) => form.property));
    for (const form of forms) {
      const identifier = `${form.property}-${form.displayName}`;
      if (uniqueStreams.has(identifier)) {
        toast.error(
          `Duplicate stream found for ${form.property} - ${form.displayName}`,
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
      uniqueStreams.add(identifier);
    }

    try {
      const res = (await updateGAPropertyStreams({ forms })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Stream ${result.name} created successfully. The table will update shortly.`,
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
                `Unable to create stream ${result.name}. Please check your access permissions. Any other streams created were successful.`,
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
                `Unable to create stream ${result.name}. You have ${result.remaining} more stream(s) you can create.`,
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
          forms: [formDataDefaults],
        });
      }

      onClose();

      // Reset the forms here, regardless of success or limit reached
      form.reset({
        forms: [formDataDefaults],
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
      forms: [formDataDefaults],
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
                  {
                    text: loading ? 'Submitting...' : 'Submit',
                    type: 'submit',
                    form: 'updateStream',
                  },
                ]}
              />
            </div>

            <div className="stream mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-end">
              {fields.map((field, index) => {
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
                              Stream {index + 1}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <Form {...form}>
                              <form
                                onSubmit={form.handleSubmit(processForm)}
                                id="updateStream"
                                className="space-y-6"
                              >
                                <FormField
                                  control={form.control}
                                  name={`forms.${index}.displayName`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>New Stream Name</FormLabel>
                                      <FormDescription>
                                        This is the stream name you want to
                                        create.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Name of the stream"
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

                                {selectedRows[index].type ===
                                  'WEB_DATA_STREAM' && (
                                  <FormField
                                    control={form.control}
                                    name={`forms.${index}.webStreamData.defaultUri`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Default URI</FormLabel>
                                        <FormDescription>
                                          This is the default URI for the web
                                          stream.
                                        </FormDescription>
                                        <FormControl>
                                          <Input
                                            placeholder="Enter default URI"
                                            {...form.register(
                                              `forms.${index}.webStreamData.defaultUri`
                                            )}
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                )}

                                {selectedRows[index].type ===
                                  'ANDROID_APP_DATA_STREAM' && (
                                  <FormField
                                    control={form.control}
                                    name={`forms.${index}.androidAppStreamData.packageName`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Package Name</FormLabel>
                                        <FormDescription>
                                          This is the package name for the
                                          Android app stream.
                                        </FormDescription>
                                        <FormControl>
                                          <Input
                                            placeholder="Enter package name"
                                            {...form.register(
                                              `forms.${index}.androidAppStreamData.packageName`
                                            )}
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                )}

                                {selectedRows[index].type ===
                                  'IOS_APP_DATA_STREAM' && (
                                  <FormField
                                    control={form.control}
                                    name={`forms.${index}.iosAppStreamData.bundleId`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Bundle ID</FormLabel>
                                        <FormDescription>
                                          This is the bundle ID for the iOS app
                                          stream.
                                        </FormDescription>
                                        <FormControl>
                                          <Input
                                            placeholder="Enter bundle ID"
                                            {...form.register(
                                              `forms.${index}.iosAppStreamData.bundleId`
                                            )}
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                )}
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

export default FormUpdateStream;

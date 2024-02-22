'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setError,
  setLoading,
  incrementStep,
  decrementStep,
  setStreamCount,
} from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormCreateAmountSchema, FormsSchema } from '@/src/lib/schemas/ga/streams';
import { Button } from '@/src/components/ui/button';
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
import { FeatureResponse, FormWizardUpdateProps, GA4StreamType } from '@/src/types/types';
import { toast } from 'sonner';
import { updateGAPropertyStreams } from '@/src/lib/fetch/dashboard/actions/ga/streams';
import {
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { RootState, store } from '@/src/redux/store';
import { useRouter } from 'next/navigation';

type Forms = z.infer<typeof FormsSchema>;
interface TierLimit {
  id: string;
  subscriptionId: string;
  createLimit: number;
  createUsage: number;
  updateLimit: number;
  updateUsage?: number; // Assuming updateUsage can be optional
  featureId?: string;
  name?: string;
  description?: string;
}

const FormUpdateStream: React.FC<FormWizardUpdateProps> = () => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const isLimitReached = useSelector(selectTable).isLimitReached;
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter(); 

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);
  const currentFormIndex = currentStep - 1; // Adjust for 0-based index
  const currentFormData = selectedRowData[currentFormIndex]; // Get data for the current step


  const formDataDefaults: GA4StreamType[] = Object.values(selectedRowData).map((rowData) => ({
    account: rowData.accountName,
    property: rowData.parent,
    displayName: rowData.displayName,
    parentURL: rowData.name,
    type: rowData.type,
    webStreamData: {
      defaultUri: '',
    },
    androidAppStreamData: {
      packageName: '',
    },
    iosAppStreamData: {
      bundleId: '',
    },
    name: rowData.name,
    accountId: rowData.accountId,
    parent: rowData.parent,
  }));

  const form = useForm<Forms>({
    defaultValues: {
      forms: formDataDefaults,
    },
    resolver: zodResolver(FormsSchema),
  });

  const { fields, append } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  const handleNext = async () => {
    // Determine the names of the fields in the current form to validate
    const currentFormFields = [`forms.${currentFormIndex}.displayName`];

    // Add additional fields based on the stream type of the current form
    const currentFormData = selectedRowData[currentFormIndex];
    if (currentFormData.type === 'WEB_DATA_STREAM') {
      currentFormFields.push(`forms.${currentFormIndex}.webStreamData.defaultUri`);
    } else if (currentFormData.type === 'ANDROID_APP_DATA_STREAM') {
      currentFormFields.push(`forms.${currentFormIndex}.androidAppStreamData.packageName`);
    } else if (currentFormData.type === 'IOS_APP_DATA_STREAM') {
      currentFormFields.push(`forms.${currentFormIndex}.iosAppStreamData.bundleId`);
    }

    // Trigger validation for only the current form's fields
    const isFormValid = await form.trigger(currentFormFields as any);

    if (isFormValid) {
      dispatch(incrementStep());
    } else {
      // Optionally handle the case where the form is not valid.
      // You could display a message or log the error.
    }
  };

  const handlePrevious = () => {
    dispatch(decrementStep());
  };

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
        toast.error(`Duplicate stream found for ${form.property} - ${form.displayName}`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
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

        router.push('/dashboard/ga/properties');
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
        }

        if (res.errors) {
          res.errors.forEach((error) => {
            toast.error(`Unable to create stream. ${error}`, {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            });
          });
        }

        form.reset({
          forms: formDataDefaults,
        });
      }

      // Reset the forms here, regardless of success or limit reached
      form.reset({
        forms: formDataDefaults,
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

  return (
    <div className="flex items-center justify-center h-screen">
      {/* Conditional rendering based on the currentStep */}

      {currentStep && (
        <div className="w-full">
          {/* Render only the form corresponding to the current step - 1 
              (since step 1 is for selecting the number of forms) */}
          {fields.length > 0 && fields.length >= currentStep && (
            <div
              key={fields[currentStep - 1].id}
              className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
            >
              <div className="max-w-xl mx-auto">
                <h1>{currentFormData.displayName}</h1>
                <div className="mt-12">
                  {/* Form */}

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(processForm)}
                      id={`createStream-${currentFormIndex}`}
                      className="space-y-6"
                    >
                      {fields.length > 0 &&
                        fields.map((field, index) => {
                          if (index === currentStep - 1) {
                            return (
                              <>
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.displayName`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>New Stream Name</FormLabel>
                                      <FormDescription>
                                        This is the stream name you want to create.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Name of the stream"
                                          {...form.register(
                                            `forms.${currentFormIndex}.displayName`
                                          )}
                                          {...field}
                                        />
                                      </FormControl>

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {currentFormData.type === 'WEB_DATA_STREAM' && (
                                  <FormField
                                    control={form.control}
                                    name={`forms.${currentFormIndex}.webStreamData.defaultUri`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Default URI</FormLabel>
                                        <FormDescription>
                                          This is the default URI for the web stream.
                                        </FormDescription>
                                        <FormControl>
                                          <Input
                                            placeholder="Enter default URI"
                                            {...form.register(
                                              `forms.${currentFormIndex}.webStreamData.defaultUri`
                                            )}
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                )}

                                {/*      {selectedRowData[currentFormIndex].type === 'ANDROID_APP_DATA_STREAM' && (
                        <FormField
                          control={form.control}
                          name={`forms.${currentFormIndex}.androidAppStreamData.packageName`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Package Name</FormLabel>
                              <FormDescription>
                                This is the package name for the Android app stream.
                              </FormDescription>
                              <FormControl>
                                <Input
                                  placeholder="Enter package name"
                                  {...form.register(
                                    `forms.${currentFormIndex}.androidAppStreamData.packageName`
                                  )}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {selectedRowData[currentFormIndex].type === 'IOS_APP_DATA_STREAM' && (
                        <FormField
                          control={form.control}
                          name={`forms.${currentFormIndex}.iosAppStreamData.bundleId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bundle ID</FormLabel>
                              <FormDescription>
                                This is the bundle ID for the iOS app stream.
                              </FormDescription>
                              <FormControl>
                                <Input
                                  placeholder="Enter bundle ID"
                                  {...form.register(`forms.${currentFormIndex}.iosAppStreamData.bundleId`)}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )} */}
                              </>
                            );
                          }
                          return null;
                        })}
                      <div className="flex justify-between">
                        <Button type="button" onClick={handlePrevious} disabled={currentStep === 1}>
                          Previous
                        </Button>

                        {currentStep < fields.length ? (
                          <Button type="button" onClick={handleNext}>
                            Next
                          </Button>
                        ) : (
                          <Button type="submit">{loading ? 'Submitting...' : 'Submit'}</Button>
                        )}
                      </div>
                    </form>
                  </Form>

                  {/* End Form */}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FormUpdateStream;

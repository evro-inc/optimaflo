'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormsSchema } from '@/src/lib/schemas/ga/dimensions';
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
import { FeatureResponse, CustomDimensionType, DimensionScope } from '@/src/types/types';
import { toast } from 'sonner';
import { updateGACustomDimensions } from '@/src/lib/fetch/dashboard/actions/ga/dimensions';
import {
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Switch } from '@/src/components/ui/switch';

const NotFoundErrorModal = dynamic(
  () =>
    import('../../../../../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

const ErrorModal = dynamic(
  () =>
    import('../../../../../../../components/client/modals/Error').then((mod) => mod.ErrorMessage),
  { ssr: false }
);

type Forms = z.infer<typeof FormsSchema>;

const FormUpdateCustomDimension = () => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);
  const currentFormIndex = currentStep - 1; // Adjust for 0-based index
  const currentFormData = selectedRowData[currentFormIndex]; // Get data for the current step

  const formDataDefaults: CustomDimensionType[] = Object.values(selectedRowData).map((rowData) => ({
    name: rowData.name,
    parameterName: rowData.parameterName,
    displayName: rowData.displayName,
    description: rowData.description,
    scope: rowData.scope as DimensionScope,
    disallowAdsPersonalization: rowData.disallowAdsPersonalization,
    account: rowData.account,
    property: rowData.property,
  }));

  const form = useForm<Forms>({
    defaultValues: {
      forms: formDataDefaults,
    },
    resolver: zodResolver(FormsSchema),
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  if (notFoundError) {
    return <NotFoundErrorModal onClose={undefined} />;
  }
  if (error) {
    return <ErrorModal />;
  }

  const handleNext = async () => {
    // Determine the names of the fields in the current form to validate
    const currentFormFields = [
      `forms.${currentFormIndex}.displayName`,
      `forms.${currentFormIndex}.parameterName`,
      `forms.${currentFormIndex}.scope`,
      `forms.${currentFormIndex}.disallowAdsPersonalization`,
      `forms.${currentFormIndex}.description`,
      `forms.${currentFormIndex}.account`,
      `forms.${currentFormIndex}.property`,
    ];

    // Trigger validation for only the current form's fields
    const isFormValid = await form.trigger(currentFormFields as any);

    if (isFormValid) {
      dispatch(incrementStep());
    } else {
      toast.error('A form is invalid. Check all fields in your forms.', {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
    }
  };

  const handlePrevious = () => {
    dispatch(decrementStep());
  };

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;

    dispatch(setLoading(true)); // Set loading to true using Redux action

    toast('Updating custom Dimension...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueCustomDimensions = new Set(forms.map((form) => form.property));
    for (const form of forms) {
      const identifier = `${form.property}-${form.displayName}`;
      if (uniqueCustomDimensions.has(identifier)) {
        toast.error(`Duplicate custom dimension found for ${form.property} - ${form.displayName}`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        dispatch(setLoading(false));
        return;
      }
      uniqueCustomDimensions.add(identifier);
    }

    try {
      const res = (await updateGACustomDimensions({ forms })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Custom dimension ${result.name} created successfully. The table will update shortly.`,
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
                `Unable to create custom dimension ${result.name}. Please check your access permissions. Any other custom dimensions created were successful.`,
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
                `Unable to create custom dimension ${result.name}. You have ${result.remaining} more custom dimension(s) you can create.`,
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
            toast.error(`Unable to create custom dimension. ${error}`, {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            });
          });
          router.push('/dashboard/ga/properties');
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
                <h1>{fields[currentFormIndex]?.displayName}</h1>
                <div className="mt-12">
                  {/* Form */}
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(processForm)}
                      id={`updateCustomDimension-${currentFormIndex}`}
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
                                      <FormLabel>New Custom Dimension Name</FormLabel>
                                      <FormDescription>
                                        This is the custom dimension name you want to create.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Name of the custom dismenion"
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

                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.description`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description Name</FormLabel>
                                      <FormDescription>
                                        Max length of 150 characters.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Name of the parameter name"
                                          {...form.register(
                                            `forms.${currentFormIndex}.description`
                                          )}
                                          {...field}
                                        />
                                      </FormControl>

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {currentFormData?.scope === 'USER' && (
                                  <div className="flex flex-row">
                                    <div className="basis-auto">
                                      <FormField
                                        control={form.control}
                                        name={`forms.${currentFormIndex}.disallowAdsPersonalization`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <div className="space-y-0.5">
                                              <FormLabel>Disallow Ads Personalization</FormLabel>
                                              <FormDescription>
                                                If set to true, sets this dimension as NPA and
                                                excludes it from ads personalization. This is
                                                currently only supported by user-scoped custom
                                                dimensions.
                                              </FormDescription>
                                            </div>
                                            <FormControl>
                                              <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                              />
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                  </div>
                                )}
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

export default FormUpdateCustomDimension;

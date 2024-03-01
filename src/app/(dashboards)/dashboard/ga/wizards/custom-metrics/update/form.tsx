'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormsSchema } from '@/src/lib/schemas/ga/metrics';
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
import { FeatureResponse, CustomMetric, MeasurementUnit } from '@/src/types/types';
import { toast } from 'sonner';
import { updateGACustomMetrics } from '@/src/lib/fetch/dashboard/actions/ga/metrics';
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { MeasurementUnitUpdateType, RestrictedMetric } from '../../../properties/@metrics/items';

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

const FormUpdateCustomMetric = () => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);
  const currentFormIndex = currentStep - 1;
  const currentFormData = selectedRowData[currentFormIndex]; // Get data for the current step

  const formDataDefaults: CustomMetric[] = Object.values(selectedRowData).map((rowData) => ({
    name: rowData.name,
    parameterName: rowData.parameterName,
    displayName: rowData.displayName,
    description: rowData.description,
    account: rowData.account,
    property: rowData.property,
    scope: rowData.scope,
    measurementUnit: rowData.measurementUnit,
  }));

  if (notFoundError) {
    return <NotFoundErrorModal />;
  }
  if (error) {
    return <ErrorModal />;
  }
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
  const measurementUnit = form.watch(`forms.${currentFormIndex}.measurementUnit`);

  const handleNext = async () => {
    // Determine the names of the fields in the current form to validate
    const currentFormFields = [
      `forms.${currentFormIndex}.displayName`,
      `forms.${currentFormIndex}.parameterName`,
      `forms.${currentFormIndex}.description`,
      `forms.${currentFormIndex}.account`,
      `forms.${currentFormIndex}.property`,
      `forms.${currentFormIndex}.measurementUnit`,
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

    toast('Updating custom metric...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueCustomMetrics = new Set(forms.map((form) => form.property));
    for (const form of forms) {
      const identifier = `${form.property}-${form.displayName}`;
      if (uniqueCustomMetrics.has(identifier)) {
        toast.error(`Duplicate custom metric found for ${form.property} - ${form.displayName}`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        dispatch(setLoading(false));
        return;
      }
      uniqueCustomMetrics.add(identifier);
    }

    try {
      const res = (await updateGACustomMetrics({ forms })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Custom metric ${result.name} created successfully. The table will update shortly.`,
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
                `Unable to create custom metric ${result.name}. Please check your access permissions. Any other custom metrics created were successful.`,
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
                `Unable to create custom metric ${result.name}. You have ${result.remaining} more custom metric(s) you can create.`,
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
            toast.error(`Unable to create custom metric. ${error}`, {
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
                      id={`updateCustomMetric-${currentFormIndex}`}
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
                                      <FormLabel>New Custom Metric Name</FormLabel>
                                      <FormDescription>
                                        This is the custom metric name you want to create.
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
                                  name={`forms.${currentFormIndex}.parameterName`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Parameter Name</FormLabel>
                                      <FormDescription>
                                        Tagging parameter name for this custom metric.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Name of the parameter name"
                                          {...form.register(
                                            `forms.${currentFormIndex}.parameterName`
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
                                  name={`forms.${currentFormIndex}.measurementUnit`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Measurement</FormLabel>
                                      <FormDescription>
                                        The measurement of this metric.
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(
                                            `forms.${currentFormIndex}.measurementUnit`
                                          )}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select a custom dimension type." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>Measurement Unit Type</SelectLabel>
                                              {Object.entries(MeasurementUnitUpdateType).map(
                                                ([label, value]) => (
                                                  <SelectItem key={value} value={value}>
                                                    {label}
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

                                {measurementUnit === MeasurementUnit.CURRENCY && (
                                  <FormField
                                    control={form.control}
                                    name={`forms.${currentFormIndex}.scope`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Restricted Metric Type</FormLabel>
                                        <FormDescription>
                                          Optional. Types of restricted data that this metric may
                                          contain. Required for metrics with CURRENCY measurement
                                          unit. Must be empty for metrics with a non-CURRENCY
                                          measurement unit.
                                        </FormDescription>
                                        <FormControl>
                                          <Select
                                            {...form.register(
                                              `forms.${currentFormIndex}.restrictedMetricType`
                                            )}
                                            {...field}
                                            onValueChange={field.onChange}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select a custom dimension type." />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectGroup>
                                                <SelectLabel>Restricted Metric Type</SelectLabel>
                                                {Object.entries(RestrictedMetric).map(
                                                  ([label, value]) => (
                                                    <SelectItem key={value} value={value}>
                                                      {label}
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

export default FormUpdateCustomMetric;

'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep, setCount } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormCreateAmountSchema, FormsSchema } from '@/src/lib/schemas/ga/metrics';
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';

import { Input } from '@/src/components/ui/input';
import {
  CustomMetric,
  FeatureResponse,
  FormCreateProps,
  MeasurementUnit,
  MetricScope,
  RestrictedMetricType,
} from '@/src/types/types';
import { toast } from 'sonner';
import {
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createGACustomMetrics } from '@/src/lib/fetch/dashboard/actions/ga/metrics';
import { MeasurementUnitType, RestrictedMetric } from '../../../properties/@metrics/items';

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

const FormCreateCustomMetric: React.FC<FormCreateProps> = ({
  tierLimits,
  properties = [],
  table = [],
  accounts = [],
}) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const count = useSelector((state: RootState) => state.form.count);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GA4CustomMetrics'
  );

  const createLimit = foundTierLimit?.createLimit;
  const createUsage = foundTierLimit?.createUsage;
  const remainingCreate = createLimit - createUsage;

  const accountsWithProperties = accounts
    .map((account) => {
      const accountProperties = properties.filter((property) => property.parent === account.name);

      return {
        ...account,
        properties: accountProperties,
      };
    })
    .filter((account) => account.properties.length > 0);

  const formDataDefaults: CustomMetric = {
    name: '',
    parameterName: '',
    displayName: '',
    description: '',
    measurementUnit: MeasurementUnit.MEASUREMENT_UNIT_UNSPECIFIED,
    scope: MetricScope.EVENT,
    account: accountsWithProperties[0].name,
    property: table[0].parent,
  };

  const formCreateAmount = useForm({
    resolver: zodResolver(FormCreateAmountSchema),
    defaultValues: {
      amount: 1,
    },
  });

  // Effect to update count when amount changes
  useEffect(() => {
    const amount = parseInt(formCreateAmount.getValues('amount').toString());
    dispatch(setCount(amount));
  }, [formCreateAmount.watch('amount'), dispatch]);

  if (notFoundError) {
    return <NotFoundErrorModal />;
  }
  if (error) {
    return <ErrorModal />;
  }

  const form = useForm<Forms>({
    defaultValues: {
      forms: [formDataDefaults],
    },
    resolver: zodResolver(FormsSchema),
  });

  const { fields, append } = useFieldArray({
    control: form.control,
    name: 'forms',
  });
  const addForm = () => {
    append(formDataDefaults);
  };
  const currentFormIndex = currentStep - 2;
  const measurementUnit = form.watch(`forms.${currentFormIndex}.measurementUnit`);

  // Adjust handleAmountSubmit or create a new function to handle selection change
  const handleAmountChange = (selectedAmount) => {
    // Convert the selected amount to a number
    const amount = parseInt(selectedAmount);

    // First, reset the current forms to start fresh
    // Note: This step might need adjustment based on your exact requirements
    // and the behavior you observe with your form state management
    form.reset({ forms: [] }); // Clear existing forms

    // Then, append new forms based on the selected amount
    for (let i = 0; i < amount; i++) {
      addForm(); // Use your existing addForm function that calls append
    }

    // Update the custom metric count in your state management (if necessary)
    dispatch(setCount(amount));
  };

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true)); // Set loading to true using Redux action

    toast('Creating custom metrics...', {
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
      const res = (await createGACustomMetrics({ forms })) as FeatureResponse;

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
          forms: [formDataDefaults],
        });
      }

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

  const handleNext = async () => {
    const currentFormPath = `forms.${currentFormIndex}`;

    // Start with the common fields that are always present
    const fieldsToValidate = [
      `${currentFormPath}.displayName`,
      `${currentFormPath}.name`,
      `${currentFormPath}.parameterName`,
      `${currentFormPath}.description`,
      `${currentFormPath}.scope`,
      `${currentFormPath}.account`,
      `${currentFormPath}.property`,
      `${currentFormPath}.restrictedMetricType`,
      `${currentFormPath}.measurementUnit`,
    ];

    // Now, trigger validation for these fields
    const isFormValid = await form.trigger(fieldsToValidate as any);

    if (isFormValid) {
      dispatch(incrementStep());
    }
  };

  const handlePrevious = () => {
    dispatch(decrementStep());
  };

  return (
    <div className="flex items-center justify-center h-screen overflow-auto">
      {/* Conditional rendering based on the currentStep */}
      {currentStep === 1 && (
        <Form {...formCreateAmount}>
          <form className="w-full md:w-2/3 space-y-6">
            {/* Amount selection logic */}
            <FormField
              control={formCreateAmount.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How many custom metrics do you want to create?</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      handleAmountChange(value); // Call the modified handler
                    }}
                    defaultValue={count.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the amount of custom metrics you want to create." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: remainingCreate }, (_, i) => (
                        <SelectItem key={i} value={`${i + 1}`}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <Button type="button" onClick={handleNext}>
              Next
            </Button>
          </form>
        </Form>
      )}

      {currentStep > 1 && (
        <div className="w-full">
          {/* Render only the form corresponding to the current step - 1 
              (since step 1 is for selecting the number of forms) */}
          {fields.length >= currentStep - 1 && (
            <div
              key={fields[currentStep - 2].id}
              className="max-w-full md:max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-1"
            >
              <div className="max-w-full md:max-w-xl mx-auto">
                <h1>Custom Metric {currentStep - 1}</h1>
                <div className="mt-2 md:mt-12">
                  {/* Form */}

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(processForm)}
                      id={`createMetric-${currentStep - 1}`}
                      className="space-y-6"
                    >
                      {(() => {
                        const currentIndex = currentStep - 2; // Adjust for zero-based index
                        const selectedAccountId = form.watch(`forms.${currentIndex}.account`);
                        const filteredProperties = properties.filter(
                          (property) => property.parent === selectedAccountId
                        );

                        return (
                          <>
                            <div className="flex flex-col md:flex-row md:space-x-4">
                              <div className="w-full md:basis-1/2">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentStep - 2}.account`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Account</FormLabel>
                                      <FormDescription>
                                        This is the account you want to create the property in.
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(`forms.${currentStep - 2}.account`)}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select an account." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>Account</SelectLabel>
                                              {accountsWithProperties.map((account) => (
                                                <SelectItem key={account.name} value={account.name}>
                                                  {account.displayName}
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
                              </div>
                              <div className="w-full md:basis-1/2">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentStep - 2}.property`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Property</FormLabel>
                                      <FormDescription>
                                        Which property do you want to create the custom metric in?
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(`forms.${currentStep - 2}.property`)}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select a property." />
                                          </SelectTrigger>

                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>Property</SelectLabel>
                                              {filteredProperties.length > 0 ? (
                                                filteredProperties.map((property) => (
                                                  <SelectItem
                                                    key={property.name}
                                                    value={property.name}
                                                  >
                                                    {property.displayName}
                                                  </SelectItem>
                                                ))
                                              ) : (
                                                <SelectItem value="" disabled>
                                                  No properties available
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
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row md:space-x-4">
                              <div className="w-full md:basis-1/2">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentStep - 2}.displayName`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>New Custom Metric Name</FormLabel>
                                      <FormDescription>
                                        This is the custom metric name you want to create.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Name of the custom dismenion"
                                          {...form.register(`forms.${currentStep - 2}.displayName`)}
                                          {...field}
                                        />
                                      </FormControl>

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="w-full md:basis-1/2">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentStep - 2}.parameterName`}
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
                                            `forms.${currentStep - 2}.parameterName`
                                          )}
                                          {...field}
                                        />
                                      </FormControl>

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row md:space-x-4">
                              <div className="w-full md:basis-1/2">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentStep - 2}.measurementUnit`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Measurement</FormLabel>
                                      <FormDescription>
                                        The measurement of this metric.
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(
                                            `forms.${currentStep - 2}.measurementUnit`
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
                                              {Object.entries(MeasurementUnitType).map(
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
                              </div>

                              <div className="w-full md:basis-1/2">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentStep - 2}.description`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description Name</FormLabel>
                                      <FormDescription>
                                        Max length of 150 characters.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Name of the parameter name"
                                          {...form.register(`forms.${currentStep - 2}.description`)}
                                          {...field}
                                        />
                                      </FormControl>

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row md:space-x-4">
                              <div className="w-full md:basis-1/2">
                                {measurementUnit === MeasurementUnit.CURRENCY && (
                                  <FormField
                                    control={form.control}
                                    name={`forms.${currentStep - 2}.scope`}
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
                                              `forms.${currentStep - 2}.restrictedMetricType`
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
                              </div>
                            </div>
                          </>
                        );
                      })()}
                      <div className="flex justify-between">
                        <Button type="button" onClick={handlePrevious}>
                          Previous
                        </Button>

                        {currentStep - 1 < count ? (
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

export default FormCreateCustomMetric;

'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormsSchema } from '@/src/lib/schemas/ga/conversion';
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
import { FeatureResponse, ConversionEvent, MeasurementUnit } from '@/src/types/types';
import { toast } from 'sonner';
import { updateGAConversionEvents } from '@/src/lib/fetch/dashboard/actions/ga/conversions';
import {
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { ConversionCountingItems, Currencies } from '../../../properties/@conversions/items';
import { Checkbox } from '@/src/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/src/components/ui/radio-group';

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

const FormUpdateConversionEvent = () => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);
  const currentFormIndex = currentStep - 1;

  const formDataDefaults: ConversionEvent[] = Object.values(selectedRowData).map((rowData) => ({
    account: rowData.account,
    property: rowData.property,
    eventName: rowData.eventName,
    countingMethod: rowData.countingMethod,
    defaultConversionValue: { type: 'none', value: '0', currencyCode: 'USD' },
    name: rowData.name,
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

  const handleNext = async () => {
    // Determine the names of the fields in the current form to validate
    const currentFormFields = [
      `forms.${currentFormIndex}.name`,
      `forms.${currentFormIndex}.account`,
      `forms.${currentFormIndex}.property`,
      `forms.${currentFormIndex}.eventName`,
      `forms.${currentFormIndex}.countingMethod`,
      `forms.${currentFormIndex}.defaultConversionValue`,
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

    toast('Updating conversion event...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueConversionEvents = new Set(forms.map((form) => form.property));
    for (const form of forms) {
      const identifier = `${form.property}-${form.eventName}`;
      if (uniqueConversionEvents.has(identifier)) {
        toast.error(`Duplicate conversion event found for ${form.property} - ${form.eventName}`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        dispatch(setLoading(false));
        return;
      }
      uniqueConversionEvents.add(identifier);
    }

    try {
      const res = (await updateGAConversionEvents({ forms })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Convention event ${result.name} created successfully. The table will update shortly.`,
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
                `Unable to create conversion event ${result.name}. Please check your access permissions. Any other conversion events created were successful.`,
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
                `Unable to create conversion event ${result.name}. You have ${result.remaining} more conversion event(s) you can create.`,
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
            toast.error(`Unable to create conversion event. ${error}`, {
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
                <h1>{fields[currentFormIndex]?.eventName}</h1>
                <div className="mt-12">
                  {/* Form */}

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(processForm)}
                      id={`updateConversionEvent-${currentFormIndex}`}
                      className="space-y-6"
                    >
                      {fields.length > 0 &&
                        fields.map((field, index) => {
                          if (index === currentStep - 1) {
                            return (
                              <>
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.countingMethod`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Counting method (conversion)</FormLabel>
                                      <FormDescription>
                                        Choose how to count this conversion. The counting method you
                                        choose will be used to count future conversion actions; it
                                        won't be used to count past data.
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(
                                            `forms.${currentFormIndex}.countingMethod`
                                          )}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select counting method." />
                                          </SelectTrigger>

                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>Counting Method</SelectLabel>
                                              {ConversionCountingItems.map((item) => (
                                                <SelectItem key={item.label} value={item.id}>
                                                  {item.label}
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
                                  name={`forms.${currentFormIndex}.defaultConversionValue`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-3">
                                      <FormLabel>Default Conversion Value</FormLabel>
                                      <FormControl>
                                        <RadioGroup
                                          onValueChange={(newValue) => {
                                            if (newValue === 'none') {
                                              form.setValue(
                                                `forms.${currentFormIndex}.defaultConversionValue`,
                                                { type: 'none', value: '0', currencyCode: 'USD' }
                                              );
                                            } else {
                                              // Maintain the existing values but indicate that a value should be set
                                              form.setValue(
                                                `forms.${currentFormIndex}.defaultConversionValue`,
                                                {
                                                  type: 'conversionValue',
                                                  value: '0',
                                                  currencyCode: 'USD',
                                                }
                                              ); // Set a default structure for 'conversionValue'
                                            }
                                          }}
                                          defaultValue={field.value?.type}
                                          className="flex flex-col space-y-1"
                                        >
                                          <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                              <RadioGroupItem value="none" />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                              Don't set a default conversion value
                                            </FormLabel>
                                          </FormItem>
                                          <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                              <RadioGroupItem value="conversionValue" />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                              Set a default conversion value
                                            </FormLabel>
                                            {field.value?.type === 'conversionValue' && (
                                              <div className="flex items-center space-x-3">
                                                <Input
                                                  placeholder="Enter default conversion value"
                                                  {...form.register(
                                                    `forms.${currentFormIndex}.defaultConversionValue.value`
                                                  )}
                                                />

                                                <Select
                                                  value={form.watch(
                                                    `forms.${currentFormIndex}.defaultConversionValue.currencyCode`
                                                  )}
                                                  onValueChange={(selectedCurrency) => {
                                                    form.setValue(
                                                      `forms.${currentFormIndex}.defaultConversionValue.currencyCode`,
                                                      selectedCurrency,
                                                      { shouldValidate: true }
                                                    );
                                                  }}
                                                >
                                                  <SelectTrigger>
                                                    <SelectValue placeholder="Select currency" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectGroup>
                                                      {Object.entries(Currencies).map(
                                                        ([code, name]) => (
                                                          <SelectItem key={code} value={code}>
                                                            {code} - {name}
                                                          </SelectItem>
                                                        )
                                                      )}
                                                    </SelectGroup>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                            )}
                                          </FormItem>
                                        </RadioGroup>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
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

export default FormUpdateConversionEvent;
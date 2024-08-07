'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormsSchema } from '@/src/lib/schemas/ga/keyEvents';
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
import { CountingMethod, FeatureResponse, KeyEventType } from '@/src/types/types';
import { toast } from 'sonner';
import { updateGAKeyEvents } from '@/src/lib/fetch/dashboard/actions/ga/keyEvents';
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
import { Switch } from '@/src/components/ui/switch';
import { Label } from '@/src/components/ui/label';
import { CountMethodData, Currencies } from '../../../properties/@keyEvents/items';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Separator } from '@/src/components/ui/separator';
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

const FormUpdateKeyEvents = () => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);
  const currentFormIndex = currentStep - 1; // Adjust for 0-based index
  const currentFormData = selectedRowData[currentFormIndex]; // Get data for the current step

  if (Object.keys(selectedRowData).length === 0) {
    router.push('/dashboard/ga/properties');
  }

  const formDataDefaults: KeyEventType[] = Object.values(selectedRowData).map((rowData) => ({
    accountProperty: Array.isArray(rowData.name) ? rowData.name : [rowData.name], // Ensure accountProperty is an array
    eventName: rowData.eventName ?? '',
    countingMethod: rowData.countingMethod ?? CountingMethod.UNSPECIFIED,
    defaultValue: rowData.defaultValue
      ? {
          numericValue: rowData.defaultValue.numericValue ?? undefined,
          currencyCode: rowData.defaultValue.currencyCode ?? undefined,
        }
      : undefined,
    includeDefaultValue:
      rowData.defaultValue?.numericValue !== undefined ||
      rowData.defaultValue?.currencyCode !== undefined,
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

  const includeDefaultValue = form.watch('forms');

  const handleValueChange = (newValue, index) => {
    if (newValue === 'false') {
      form.setValue(`forms.${index}.defaultValue`, undefined, { shouldValidate: true });
      form.setValue(`forms.${index}.includeDefaultValue`, false, { shouldValidate: true });
    } else {
      form.setValue(
        `forms.${index}.defaultValue`,
        {
          numericValue: 0,
          currencyCode: 'USD',
        },
        { shouldValidate: true }
      );
      form.setValue(`forms.${index}.includeDefaultValue`, true, { shouldValidate: true });
    }
  };

  const handleNumericValueChange = (value, index) => {
    form.setValue(`forms.${index}.defaultValue.numericValue`, parseFloat(value));
  };

  const handleNext = async () => {
    // Determine the names of the fields in the current form to validate
    const currentFormFields = [
      `forms.${currentFormIndex}.countingMethod`,
      `forms.${currentFormIndex}.defaultValue.numericValue`,
      `forms.${currentFormIndex}.defaultValue.currencyCode`,
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

  const handlePrevious = (index) => {
    dispatch(decrementStep());
  };

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;

    dispatch(setLoading(true)); // Set loading to true using Redux action

    toast('Updating key event...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueKeyEvents = new Set(forms.map((form) => form.name));
    for (const form of forms) {
      const identifier = `${form.accountProperty}-${form.eventName}`;

      if (uniqueKeyEvents.has(identifier)) {
        toast.error(`Duplicate key event found for ${form.accountProperty} - ${form.eventName}`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        dispatch(setLoading(false));
        return;
      }
      uniqueKeyEvents.add(identifier);
    }

    try {
      const formsToSubmit = forms.map((form) => {
        const { defaultValue, ...rest } = form;
        if (form.includeDefaultValue) {
          return { ...rest, defaultValue };
        }

        return rest;
      });
      const res = (await updateGAKeyEvents({ forms: formsToSubmit })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Key Event ${result.name} created successfully. The table will update shortly.`,
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
                `Unable to create key event ${result.name}. Please check your access permissions. Any other key events created were successful.`,
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
          toast.error(
            `Unable to create key event(s). You have hit your current limit for this feature.`,
            {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            }
          );

          dispatch(setIsLimitReached(true));
        }
        if (res.errors) {
          res.errors.forEach((error) => {
            toast.error(`Unable to create key event. ${error}`, {
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

      {fields.map(
        (field, index) =>
          currentStep === index + 1 && (
            <div className="w-full">
              {/* Render only the form corresponding to the current step - 1 
              (since step 1 is for selecting the number of forms) */}
              {fields.length > 0 && fields.length >= currentStep && (
                <div key={field.id} className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                  <div className="max-w-xl mx-auto">
                    <h1>{fields[currentFormIndex]?.eventName}</h1>
                    <div className="mt-12">
                      {/* Form */}
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(processForm)}
                          id={`createStream-${index}`}
                          className="space-y-6"
                        >
                          {(() => {
                            return (
                              <>
                                <div className="flex flex-col md:flex-row md:space-x-4">
                                  <div className="w-full md:basis-1/2">
                                    {/*  <FormField
                                  control={form.control}
                                  name={`forms.${index}.eventName`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>New Key Event Name</FormLabel>
                                      <FormDescription className="h-16">
                                        This is the key event name you want to create.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Name of the custom dismenion"
                                          {...form.register(`forms.${index}.eventName`)}
                                          {...field}
                                        />
                                      </FormControl>

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                /> */}
                                    <p>{form.getValues(`forms.${index}.eventName`)}</p>
                                  </div>

                                  <div className="w-full md:basis-1/2">
                                    <FormField
                                      control={form.control}
                                      name={`forms.${index}.countingMethod`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Counting Method</FormLabel>
                                          <FormDescription className="h-16">
                                            The method by which Key Events will be counted across
                                            multiple events within a session.
                                          </FormDescription>
                                          <FormControl>
                                            <Select
                                              {...form.register(`forms.${index}.countingMethod`)}
                                              {...field}
                                              onValueChange={field.onChange}
                                            >
                                              <SelectTrigger>
                                                <SelectValue placeholder="Select a key event type." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectGroup>
                                                  {Object.entries(CountMethodData).map(
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
                                </div>

                                <div className="flex flex-col md:flex-row md:space-x-4">
                                  <FormField
                                    control={form.control}
                                    name={`forms.${index}.defaultValue`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-3">
                                        <FormLabel>Default Conversion Value</FormLabel>
                                        <FormControl>
                                          <RadioGroup
                                            onValueChange={(newValue) =>
                                              handleValueChange(newValue, index)
                                            }
                                            value={
                                              form.watch(`forms.${index}.includeDefaultValue`)
                                                ? 'true'
                                                : 'false'
                                            }
                                            className="flex flex-col space-y-1"
                                          >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                              <FormControl>
                                                <RadioGroupItem value="false" />
                                              </FormControl>
                                              <FormLabel className="font-normal">
                                                Don't set a default conversion value
                                              </FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                              <FormControl>
                                                <RadioGroupItem value="true" />
                                              </FormControl>
                                              <FormLabel className="font-normal">
                                                Set a default conversion value
                                              </FormLabel>
                                              {form.watch(`forms.${index}.includeDefaultValue`) && (
                                                <div className="flex items-center space-x-3">
                                                  <Input
                                                    placeholder="Enter default conversion value"
                                                    {...form.register(
                                                      `forms.${index}.defaultValue.numericValue`,
                                                      {
                                                        valueAsNumber: true,
                                                        setValueAs: (value) =>
                                                          value === '' ? undefined : Number(value),
                                                      }
                                                    )}
                                                    type="number"
                                                    min={0}
                                                    onChange={(e) =>
                                                      handleNumericValueChange(
                                                        e.target.value,
                                                        index
                                                      )
                                                    }
                                                  />

                                                  <Select
                                                    value={form.watch(
                                                      `forms.${index}.defaultValue.currencyCode`
                                                    )}
                                                    onValueChange={(selectedCurrency) => {
                                                      form.setValue(
                                                        `forms.${index}.defaultValue.currencyCode`,
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
                                </div>
                              </>
                            );
                          })()}
                          <div className="flex justify-between">
                            {index >= 1 && (
                              <Button type="button" onClick={handlePrevious}>
                                Previous
                              </Button>
                            )}

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
          )
      )}
    </div>
  );
};

export default FormUpdateKeyEvents;

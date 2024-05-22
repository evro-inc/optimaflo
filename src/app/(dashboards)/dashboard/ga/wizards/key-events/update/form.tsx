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
import { FeatureResponse, KeyEventType } from '@/src/types/types';
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

  console.log("selectedRowData", selectedRowData);

  if (Object.keys(selectedRowData).length === 0) {
    router.push('/dashboard/ga/properties');
  }

  console.log("selectedRowData", selectedRowData);



  const formDataDefaults: KeyEventType[] = Object.values(selectedRowData).map((rowData) => ({
    accountProperty: rowData.name,
    eventName: rowData.eventName,
    countingMethod: rowData.countingMethod,
    defaultValue: {
      numericValue: rowData.defaultValue.numericValue,
      currencyCode: rowData.defaultValue.currencyCode,
    },
    includeDefaultValue: rowData.defaultValue?.numericValue !== undefined || rowData.defaultValue?.currencyCode !== undefined,
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
      console.log("form", form);


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
      const res = (await updateGAKeyEvents({ forms })) as FeatureResponse;

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
          forms: [formDataDefaults],
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

      {fields.map((field, index) => currentStep === index + 1 && (
        <div className="w-full">
          {/* Render only the form corresponding to the current step - 1 
              (since step 1 is for selecting the number of forms) */}
          {fields.length > 0 && fields.length >= currentStep && (
            <div
              key={field.id}
              className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
            >
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

                            <div className="flex items-center">
                              <Switch
                                id={`default-key-${index}`}
                                checked={
                                  includeDefaultValue[index]?.includeDefaultValue || false
                                }
                                onCheckedChange={(checked) =>
                                  form.setValue(`forms.${index}.includeDefaultValue`, checked)
                                }
                              />
                              <Label htmlFor={`default-key-${index}`} className="ml-2">
                                Set default key event value
                              </Label>
                            </div>

                            {includeDefaultValue[index]?.includeDefaultValue && (
                              <div className="flex flex-col md:flex-row md:space-x-4">
                                <div className="w-full md:basis-1/2">
                                  <FormField
                                    control={form.control}
                                    name={`forms.${index}.defaultValue.numericValue`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Numeric Value</FormLabel>
                                        <FormDescription className="h-20">
                                          This will be used to populate the "value" parameter
                                          for all occurrences of this Key Event (specified by
                                          eventName) where that parameter is unset.
                                        </FormDescription>
                                        <FormControl>
                                          <Input
                                            placeholder="Numeric value"
                                            {...form.register(
                                              `forms.${index}.defaultValue.numericValue`
                                            )}
                                            {...field}
                                            type="number"
                                            min={0}
                                            onChange={(e) =>
                                              field.onChange(Number(e.target.value))
                                            }
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
                                    name={`forms.${index}.defaultValue.currencyCode`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Currency Code</FormLabel>
                                        <FormDescription className="h-20">
                                          When an occurrence of this Key Event (specified by
                                          eventName) has no set currency this currency will be
                                          applied as the default.
                                        </FormDescription>
                                        <FormControl>
                                          <Select
                                            {...form.register(
                                              `forms.${index}.defaultValue.currencyCode`
                                            )}
                                            {...field}
                                            onValueChange={field.onChange}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select a currency." />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectGroup>
                                                {Object.entries(Currencies).map(
                                                  ([code, name]) => (
                                                    <SelectItem key={code} value={code}>
                                                      {name} ({code})
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
                            )}
                          </>
                        );
                      })()}
                      <div className="flex justify-between">
                        {index >= 1 && (
                          <Button type="button" onClick={handlePrevious}>
                            Previous
                          </Button>
                        )}


                        {currentStep - 1 < fields.length ? (
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
      )
      }
    </div>
  );
};

export default FormUpdateKeyEvents;

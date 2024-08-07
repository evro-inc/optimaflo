'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep, setCount } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormKeyEvents, FormsSchema } from '@/src/lib/schemas/ga/keyEvents';
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
  KeyEventType,
  DimensionScope,
  FeatureResponse,
  FormCreateProps,
  CountingMethod,
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
import { createGAKeyEvents } from '@/src/lib/fetch/dashboard/actions/ga/keyEvents';
import { DimensionScopeType } from '../../../properties/@dimensions/dimensionItems';
import { Switch } from '@/src/components/ui/switch';
import { CountMethodData, Currencies } from '../../../properties/@keyEvents/items';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Separator } from '@/src/components/ui/separator';
import { Label } from '@/src/components/ui/label';
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

const FormCreateKeyEvents: React.FC<FormCreateProps> = ({
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

  const accountPropertyPairs = properties.map((property) => {
    const account = accounts.find((acc) => acc.name === property.parent);
    return {
      account: account.name,
      accountName: account.displayName,
      property: property.name,
      propertyName: property.displayName,
    };
  });

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GA4KeyEvents'
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

  const formDataDefaults: KeyEventType = {
    accountProperty: accountsWithProperties[0].name,
    eventName: '',
    countingMethod: CountingMethod.ONCE_PER_EVENT,
    defaultValue: undefined,
    includeDefaultValue: false,
  };

  const formCreateAmount = useForm({
    resolver: zodResolver(FormKeyEvents),
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

  const includeDefaultValue = form.watch('forms');

  const addForm = () => {
    append(formDataDefaults);
  };

  /*   const scopeSelection = form.watch(`forms.${currentFormIndex}.scope`);
   */

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

    // Update the key event count in your state management (if necessary)
    dispatch(setCount(amount));
  };

  const handleValueChange = (newValue, index) => {
    if (newValue === 'false') {
      form.setValue(`forms.${index}.defaultValue`, undefined);
      form.setValue(`forms.${index}.includeDefaultValue`, false);
    } else {
      form.setValue(`forms.${index}.defaultValue`, {
        numericValue: 0,
        currencyCode: 'USD',
      });
      form.setValue(`forms.${index}.includeDefaultValue`, true);
    }
  };

  const handleNumericValueChange = (value, index) => {
    form.setValue(`forms.${index}.defaultValue.numericValue`, parseFloat(value));
  };

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true)); // Set loading to true using Redux action

    toast('Creating key events...', {
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

      const res = (await createGAKeyEvents({ forms: formsToSubmit })) as FeatureResponse;

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
    if (currentStep === 1) {
      dispatch(incrementStep());
    } else {
      const currentFormIndex = currentStep - 2;
      const currentFormPath = `forms.${currentFormIndex}`;

      const fieldsToValidate = [
        `${currentFormPath}.eventName`,
        `${currentFormPath}.countingMethod`,
      ];

      if (includeDefaultValue[currentFormIndex]?.includeDefaultValue) {
        fieldsToValidate.push(
          `${currentFormPath}.defaultValue.numericValue`,
          `${currentFormPath}.defaultValue.currencyCode`
        );
      }

      const isFormValid = await form.trigger(fieldsToValidate as any);

      if (isFormValid) {
        dispatch(incrementStep());
      }
    }
  };

  const handlePrevious = () => {
    dispatch(decrementStep());
  };

  return (
    <div className="flex items-center justify-center h-screen overflow-auto">
      {currentStep === 1 ? (
        <Form {...formCreateAmount}>
          <form className="w-full md:w-2/3 space-y-6">
            {/* Amount selection logic */}
            <FormField
              control={formCreateAmount.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How many key events do you want to create?</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      handleAmountChange(value); // Call the modified handler
                    }}
                    defaultValue={count.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the amount of key events you want to create." />
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
      ) : (
        fields.map(
          (field, index) =>
            currentStep === index + 2 && (
              <div className="w-full">
                {/* Render only the form corresponding to the current step - 1 
              (since step 1 is for selecting the number of forms) */}
                <div
                  key={field.id}
                  className="max-w-full md:max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-1"
                >
                  <div className="max-w-full md:max-w-xl mx-auto">
                    <h1>Key Event {index + 1}</h1>
                    <div className="mt-2 md:mt-12">
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
                                    <FormField
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
                                              placeholder="Name of the event name"
                                              {...form.register(`forms.${index}.eventName`)}
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
                                            value={field.value ? 'true' : 'false'}
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
                                              {field.value && (
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

                                <div className="flex flex-col md:flex-row md:space-x-4 py-10">
                                  <div className="w-full md:basis-auto">
                                    <FormField
                                      control={form.control}
                                      name={`forms.${index}.accountProperty`}
                                      render={() => (
                                        <FormItem>
                                          <div className="mb-4">
                                            <FormLabel className="text-base">
                                              Account and Property Selection
                                            </FormLabel>
                                            <FormDescription>
                                              Which account and property do you want to create the
                                              audience for?
                                            </FormDescription>
                                          </div>
                                          {accountPropertyPairs.map((item) => (
                                            <FormField
                                              key={item.id}
                                              control={form.control}
                                              name={`forms.${index}.accountProperty`}
                                              render={({ field }) => {
                                                return (
                                                  <FormItem
                                                    key={item.id}
                                                    className="flex flex-row items-start space-x-3 space-y-0"
                                                  >
                                                    <FormControl>
                                                      <Checkbox
                                                        checked={
                                                          Array.isArray(field.value) &&
                                                          field.value.includes(item.property)
                                                        }
                                                        onCheckedChange={(checked) => {
                                                          return checked
                                                            ? field.onChange([
                                                                ...(Array.isArray(field.value)
                                                                  ? field.value
                                                                  : []),
                                                                item.property,
                                                              ])
                                                            : field.onChange(
                                                                (Array.isArray(field.value)
                                                                  ? field.value
                                                                  : []
                                                                ).filter(
                                                                  (value) => value !== item.property
                                                                )
                                                              );
                                                        }}
                                                      />
                                                    </FormControl>
                                                    <FormLabel className="text-sm font-normal">
                                                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                        <div>
                                                          <span className="text-gray-600 font-semibold">
                                                            Account:
                                                          </span>
                                                          <span className="ml-2 text-gray-800 font-medium">
                                                            {item.accountName}
                                                          </span>
                                                        </div>
                                                        <Separator orientation="vertical" />
                                                        <div>
                                                          <span className="text-gray-600 font-semibold">
                                                            Property:
                                                          </span>
                                                          <span className="ml-2 text-gray-800 font-medium">
                                                            {item.propertyName}
                                                          </span>
                                                        </div>
                                                      </div>
                                                    </FormLabel>
                                                  </FormItem>
                                                );
                                              }}
                                            />
                                          ))}
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
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
              </div>
            )
        )
      )}
    </div>
  );
};

export default FormCreateKeyEvents;

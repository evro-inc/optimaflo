'use client';

import React, { useState, useEffect } from 'react';
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
import { streamType } from '../../../properties/@streams/streamItems';
import { FeatureResponse, FormCreateProps, GA4StreamType } from '@/src/types/types';
import { toast } from 'sonner';
import { createGAPropertyStreams } from '@/src/lib/fetch/dashboard/actions/ga/streams';
import {
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { selectGlobal } from '@/src/redux/globalSlice';
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

const FormCreateStream: React.FC<FormCreateProps> = ({
  tierLimits,
  properties = [],
  table = [],
  accounts = [],
}) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const streamCount = useSelector((state: RootState) => state.form.streamCount);
  const isLimitReached = useSelector(selectTable).isLimitReached;
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GA4Streams'
  );

  const createLimit = foundTierLimit?.createLimit;
  const createUsage = foundTierLimit?.createUsage;
  const remainingCreate = createLimit - createUsage;

  const formCreateAmount = useForm({
    resolver: zodResolver(FormCreateAmountSchema),
    defaultValues: {
      amount: 1,
    },
  });

  // Effect to update streamCount when amount changes
  useEffect(() => {
    const amount = parseInt(formCreateAmount.getValues('amount').toString());
    dispatch(setStreamCount(amount));
  }, [formCreateAmount.watch('amount'), dispatch]);

  const handleNext = () => {
    dispatch(incrementStep());
  };

  const handlePrevious = () => {
    dispatch(decrementStep());
  };

  const accountsWithProperties = accounts
    .map((account) => {
      const accountProperties = properties.filter((property) => property.parent === account.name);

      return {
        ...account,
        properties: accountProperties,
      };
    })
    .filter((account) => account.properties.length > 0);

  const formDataDefaults: GA4StreamType = {
    account: accountsWithProperties[0].name,
    property: table[0].parent,
    displayName: '',
    parentURL: '',
    type: table[0].type,
    webStreamData: {
      defaultUri: '',
    },
    androidAppStreamData: {
      packageName: '',
    },
    iosAppStreamData: {
      bundleId: '',
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

  const { fields, append } = useFieldArray({
    control: form.control,
    name: 'forms',
  });
  const addForm = () => {
    append(formDataDefaults);
  };

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

    // Update the stream count in your state management (if necessary)
    dispatch(setStreamCount(amount));
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
      const res = (await createGAPropertyStreams({ forms })) as FeatureResponse;

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

  return (
    <div className="flex items-center justify-center h-screen">
      {/* Conditional rendering based on the currentStep */}
      {currentStep === 1 && (
        <Form {...formCreateAmount}>
          <form className="w-2/3 space-y-6">
            {/* Amount selection logic */}
            <FormField
              control={formCreateAmount.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How many streams do you want to create?</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      handleAmountChange(value); // Call the modified handler
                    }}
                    defaultValue={streamCount.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the amount of streams you want to create." />
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
              className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
            >
              <div className="max-w-xl mx-auto">
                <h1>Stream {currentStep - 1}</h1>
                <div className="mt-12">
                  {/* Form */}

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(processForm)}
                      id={`createStream-${currentStep - 1}`}
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
                            <FormField
                              control={form.control}
                              name={`forms.${currentStep - 2}.displayName`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>New Stream Name</FormLabel>
                                  <FormDescription>
                                    This is the stream name you want to create.
                                  </FormDescription>
                                  <FormControl>
                                    <Input
                                      placeholder="Name of the stream"
                                      {...form.register(`forms.${currentStep - 2}.displayName`)}
                                      {...field}
                                    />
                                  </FormControl>

                                  <FormMessage />
                                </FormItem>
                              )}
                            />

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

                            <FormField
                              control={form.control}
                              name={`forms.${currentStep - 2}.property`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Property</FormLabel>
                                  <FormDescription>
                                    Which property do you want to create the stream in?
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
                                              <SelectItem key={property.name} value={property.name}>
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

                            <FormField
                              control={form.control}
                              name={`forms.${currentStep - 2}.type`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Stream Type</FormLabel>
                                  <FormDescription>Set the stream type.</FormDescription>
                                  <FormControl>
                                    <Select
                                      {...form.register(`forms.${currentStep - 2}.type`)}
                                      {...field}
                                      onValueChange={field.onChange}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a stream type." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectGroup>
                                          <SelectLabel>Retention Setting</SelectLabel>
                                          {Object.entries(streamType).map(([label, value]) => (
                                            <SelectItem key={value} value={value}>
                                              {label}
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

                            {Object.keys(streamType).map(
                              (type) =>
                                form.watch(`forms.${currentStep - 2}.type`) ===
                                  streamType[type] && (
                                  <FormField
                                    control={form.control}
                                    name={`forms.${currentStep - 2}.${
                                      type.toLowerCase() === 'web'
                                        ? 'webStreamData.defaultUri'
                                        : type.toLowerCase() === 'android'
                                        ? 'androidAppStreamData.packageName'
                                        : 'iosAppStreamData.bundleId'
                                    }`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>{type} Input</FormLabel>
                                        <FormDescription>
                                          This is the input for {type}.
                                        </FormDescription>
                                        <FormControl>
                                          <Input
                                            placeholder={`Enter ${type} input`}
                                            {...form.register(
                                              `forms.${currentStep - 2}.${
                                                type.toLowerCase() === 'web'
                                                  ? 'webStreamData.defaultUri'
                                                  : type.toLowerCase() === 'android'
                                                  ? 'androidAppStreamData.packageName'
                                                  : 'iosAppStreamData.bundleId'
                                              }`
                                            )}
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                )
                            )}
                          </>
                        );
                      })()}
                      <div className="flex justify-between">
                        <Button type="button" onClick={handlePrevious}>
                          Previous
                        </Button>

                        {currentStep - 1 < streamCount ? (
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

export default FormCreateStream;
